/* ============================================================
   Умный Вайбот — необязательный ИИ на устройстве (WebGPU).
   Ничего не качается, пока игрок сам не включит «Умный Вайбот».

   Библиотека: WebLLM (@mlc-ai/web-llm 0.2.86) с cdn.jsdelivr.net, ES-модуль через import().
   Модель:     Qwen2.5-1.5B-Instruct (q4f16_1, без shader-f16 — q4f32_1), ~880 МБ с Hugging Face.
   Кэш:        IndexedDB (cacheBackend:"indexeddb"), а не Cache API — sw.js при обновлении
               удаляет все чужие caches, и модель пришлось бы качать заново.
   Движок:     один на всю игру, в module-воркере из Blob (UI не тормозит);
               если воркер не завёлся — в главном потоке. Через 10 мин простоя выгружается.

   API:
   • Vibe.llm.available()  → bool: есть ли вообще WebGPU (быстро, синхронно)
   • Vibe.llm.enabled()    → bool: игрок включил (state.llm.on)
   • Vibe.llm.enable()     → Promise<bool>: согласие получено → качаем/грузим
   • Vibe.llm.disable({purge}) → выключить (purge — ещё и удалить модель с устройства)
   • Vibe.llm.warm()       → тихо поднять движок из кэша (без сети не качает)
   • Vibe.llm.reply(messages, {system, maxTokens, timeout, human, name}) → Promise<string> (reject = используй скрипт;
                             human — ответ человека из мессенджера: без правок «я Вайбот», запретная тема → reject)
   • Vibe.llm.status()     → {phase, progress, text, model, sizeMB, ready, on}
   • Vibe.llm.on(fn)       → подписка на смену статуса, возвращает отписку
   • Vibe.llm.vaibotSystem() → системный промпт Вайбота с контекстом игрока
   state.llm = { on, model, ready }  (ready — модель хоть раз загрузилась и лежит в кэше)
   ============================================================ */
(function () {
  const Vibe = window.Vibe || (window.Vibe = {});
  const VER = "0.2.86";
  const CDN = `https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@${VER}/lib/index.js`;
  const MODEL_F16 = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
  const MODEL_F32 = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC";
  const SIZE_MB = 880; // сумма файлов весов на HF (обе квантовки ≈ 880 МБ)
  const NEED_MB = 1200; // с запасом под wasm, конфиг и IndexedDB
  const CTX = 2048; // окно контекста меньше дефолтного 4096 → меньше видеопамяти на телефоне
  const IDLE_UNLOAD_MS = 10 * 60 * 1000;
  const MAX_TURNS = 6;

  const S = () => (Vibe.state && Vibe.state.get ? Vibe.state.get() : {});
  const saved = () => S().llm || { on: false, model: null, ready: false };
  const save = (p) => { try { Vibe.state.set({ llm: Object.assign({}, saved(), p) }); } catch (e) {} };

  let lib = null, engine = null, worker = null, loading = null, busy = false, idleTo = null;
  let st = { phase: "off", progress: 0, text: "" };
  const subs = new Set();
  function setSt(p) {
    st = Object.assign({}, st, p);
    subs.forEach((fn) => { try { fn(status()); } catch (e) { console.error(e); } });
  }
  function status() {
    const s = saved();
    return { phase: available() ? st.phase : "unavailable", progress: st.progress, text: st.text, model: s.model || null, sizeMB: SIZE_MB, ready: !!engine, on: !!s.on };
  }

  const available = () => {
    try { return !!(typeof navigator !== "undefined" && navigator.gpu && window.isSecureContext !== false); } catch (e) { return false; }
  };
  const enabled = () => !!saved().on && available();

  const appConfig = () => Object.assign({}, lib.prebuiltAppConfig, { cacheBackend: "indexeddb" });

  async function loadLib() {
    if (lib) return lib;
    lib = await import(/* webpackIgnore: true */ CDN);
    return lib;
  }

  // Проверки «потянет ли» до того, как что-то качать
  async function probe() {
    if (!available()) throw new Error("Нет WebGPU в этом браузере");
    const mem = navigator.deviceMemory; // есть только в Chromium
    if (mem && mem < 4) throw new Error("Слабовато: меньше 4 ГБ памяти");
    let adapter = null;
    try { adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" }); } catch (e) {}
    if (!adapter) throw new Error("Видеокарта недоступна для WebGPU");
    const lim = adapter.limits || {};
    if (lim.maxStorageBufferBindingSize && lim.maxStorageBufferBindingSize < 128 * 1024 * 1024) throw new Error("Видеокарта слишком маленькая для модели");
    const f16 = !!(adapter.features && adapter.features.has && adapter.features.has("shader-f16"));
    return f16 ? MODEL_F16 : MODEL_F32;
  }

  async function cached(model) {
    try { await loadLib(); return !!(await lib.hasModelInCache(model, appConfig())); } catch (e) { return false; }
  }

  async function spaceOk() {
    try {
      if (!navigator.storage || !navigator.storage.estimate) return true;
      const { quota = 0, usage = 0 } = await navigator.storage.estimate();
      return !quota || (quota - usage) / 1048576 > NEED_MB;
    } catch (e) { return true; }
  }

  function makeWorker() {
    const src = `import { WebWorkerMLCEngineHandler } from "${CDN}";\nconst h = new WebWorkerMLCEngineHandler();\nself.onmessage = (e) => h.onmessage(e);`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const w = new Worker(url, { type: "module", name: "vibe-llm" });
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return w;
  }

  function onProgress(r) {
    const p = Math.max(0, Math.min(1, Number(r && r.progress) || 0));
    const txt = String((r && r.text) || "");
    const fromCache = /cache/i.test(txt) && !/fetch/i.test(txt);
    setSt({ phase: "loading", progress: p, text: fromCache ? "Достаю из памяти устройства…" : /fetch|download/i.test(txt) ? `Скачиваю мозги… ${Math.round(p * 100)}%` : `Прогреваю нейроны… ${Math.round(p * 100)}%` });
  }

  async function createEngine(model) {
    const cfg = { appConfig: appConfig(), initProgressCallback: onProgress };
    const chatOpts = { context_window_size: CTX };
    // 1) воркер — чтобы UI не замирал
    if (typeof Worker !== "undefined" && lib.CreateWebWorkerMLCEngine) {
      let w = null;
      try {
        w = makeWorker();
        const fail = new Promise((_, rej) => w.addEventListener("error", (e) => rej(new Error("worker: " + ((e && e.message) || "error"))), { once: true }));
        const eng = await Promise.race([lib.CreateWebWorkerMLCEngine(w, model, cfg, chatOpts), fail]);
        worker = w;
        return eng;
      } catch (e) {
        console.warn("[llm] воркер не завёлся, пробую главный поток", e);
        try { w && w.terminate(); } catch (e2) {}
        if (/memory|device|lost|OOM|f16/i.test(String(e && e.message))) throw e; // проблема в железе, а не в воркере
      }
    }
    // 2) главный поток
    return lib.CreateMLCEngine(model, cfg, chatOpts);
  }

  async function load({ allowDownload }) {
    if (engine) return true;
    if (loading) return loading;
    loading = (async () => {
      try {
        setSt({ phase: "loading", progress: 0, text: "Проверяю устройство…" });
        const model = await probe();
        await loadLib();
        const have = await cached(model);
        if (!have) {
          if (!allowDownload) { setSt({ phase: "off", progress: 0, text: "Модель не скачана" }); return false; }
          if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("Нужен интернет для первой загрузки");
          if (!(await spaceOk())) throw new Error(`Не хватает места: нужно ~${NEED_MB} МБ`);
          try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
        }
        engine = await createEngine(model);
        save({ on: true, model, ready: true });
        setSt({ phase: "ready", progress: 1, text: "Умный Вайбот на связи" });
        bumpIdle();
        return true;
      } catch (e) {
        console.warn("[llm] не загрузилось", e);
        await unload();
        save({ ready: false });
        setSt({ phase: "error", progress: 0, text: humanErr(e) });
        return false;
      } finally { loading = null; }
    })();
    return loading;
  }

  function humanErr(e) {
    const m = String((e && e.message) || e || "");
    if (/WebGPU|adapter|gpu/i.test(m) && !/memory/i.test(m)) return "Устройство не поддерживает ИИ (WebGPU). Остаюсь обычным Вайботом 💜";
    if (/memory|OOM|buffer|limit|device.*lost/i.test(m)) return "Устройству не хватило памяти. Остаюсь обычным Вайботом 💜";
    if (/fetch|network|internet|интернет|Failed to/i.test(m)) return "Сеть подвела. Попробуем позже, лучше по Wi‑Fi 📶";
    if (/мест|quota|storage/i.test(m)) return "Не хватает места на устройстве 📦";
    return m.length < 90 ? m : "Не получилось загрузить ИИ. Остаюсь обычным Вайботом 💜";
  }

  async function unload() {
    clearTimeout(idleTo); idleTo = null;
    const e = engine; engine = null;
    try { e && (await e.unload()); } catch (x) {}
    try { worker && worker.terminate(); } catch (x) {}
    worker = null;
    if (st.phase === "ready") setSt({ phase: "off", progress: 0, text: "" });
  }
  function bumpIdle() {
    clearTimeout(idleTo);
    idleTo = setTimeout(() => { if (!busy) unload(); }, IDLE_UNLOAD_MS);
  }

  async function enable() {
    if (!available()) { setSt({ phase: "error", text: humanErr(new Error("WebGPU")) }); return false; }
    save({ on: true });
    return load({ allowDownload: true });
  }
  async function disable({ purge = false } = {}) {
    const model = saved().model;
    save({ on: false, ready: false });
    await unload();
    setSt({ phase: "off", progress: 0, text: "" });
    if (purge && model) { try { await loadLib(); await lib.deleteModelAllInfoInCache(model, appConfig()); } catch (e) { console.warn(e); } }
  }
  // Тихий подъём из кэша: только если игрок уже соглашался и модель лежит на устройстве
  function warm() {
    if (!enabled() || engine || loading || !saved().ready) return Promise.resolve(!!engine);
    return load({ allowDownload: false });
  }

  /* ---------- Безопасность текста ---------- */
  // Границы слов вручную: \b в JS не видит кириллицу, а lookbehind ломает старый Safari
  const L = "а-яёa-z0-9";
  const wordsRe = (list, flags) => new RegExp(`(^|[^${L}])(${list.join("|")})(?=$|[^${L}])`, flags);
  const BRANDS = wordsRe([
    "яндекс[а-яё]*", "yandex", "сбер[а-яё]*", "sber[a-z]*", "тинькофф[а-яё]*", "т-банк[а-яё]*", "tinkoff", "втб", "альфа-?банк[а-яё]*",
    "газпром[а-яё]*", "лукойл[а-яё]*", "роснефт[а-яё]*", "аэрофлот[а-яё]*", "ржд", "мтс", "мегафон[а-яё]*", "билайн[а-яё]*", "теле2", "tele2",
    "ozon", "озон[ае]?", "wildberries", "вайлдберриз", "вб", "авито", "avito", "пят[её]рочк[а-яё]*", "перекр[её]ст[а-яё]*", "вкусвилл[а-яё]*",
    "вконтакте", "vk", "вк", "telegram", "телеграм[а-яё]*", "whatsapp", "ватсап[а-яё]*", "viber", "вайбер[а-яё]*",
    "google", "гугл[а-яё]*", "apple", "эппл", "айфон[а-яё]*", "iphone", "samsung", "самсунг[а-яё]*", "xiaomi", "сяоми", "huawei", "хуавей",
    "microsoft", "майкрософт", "amazon", "амазон[а-яё]*", "netflix", "нетфликс", "spotify", "спотифай", "youtube", "ютуб[а-яё]*",
    "tiktok", "тикток[а-яё]*", "instagram", "инстаграм[а-яё]*", "инст[аеуы]", "facebook", "фейсбук[а-яё]*", "meta", "twitter", "твиттер[а-яё]*",
    "openai", "chatgpt", "чатгпт", "gpt-?[0-9a-z.]*", "qwen[0-9.]*", "alibaba", "алибаба", "claude", "anthropic", "gemini", "llama",
    "mcdonald'?s?", "макдональдс[а-яё]*", "макдак[а-яё]*", "kfc", "burger king", "бургер кинг[а-яё]*", "starbucks", "старбакс[а-яё]*",
    "coca-?cola", "кока-?кол[а-яё]*", "pepsi", "пепси", "uber", "убер[а-яё]*", "ikea", "икеа", "nike", "найк[а-яё]*", "adidas", "адидас[а-яё]*",
    "tesla", "тесла", "bitcoin", "биткоин[а-яё]*",
  ], "gi");
  const POLITICS = wordsRe([
    "путин[а-яё]*", "трамп[а-яё]*", "байден[а-яё]*", "зеленск[а-яё]*", "навальн[а-яё]*", "лукашенк[а-яё]*", "си цзиньпин[а-яё]*", "макрон[а-яё]*",
    "кремл[а-яё]*", "госдум[а-яё]*", "белый дом", "белого дома", "выбор(ы|ах|ов) (президента|в думу|депутатов)", "президент(а|у|ом|е)? (россии|сша|страны|украины)",
    "депутат[а-яё]*", "оппозици[а-яё]*", "митинг[а-яё]*", "санкци[а-яё]*", "войн[аеуыо]", "сво", "украин[а-яё]*", "нато", "политик[а-яё]*",
    "религи[а-яё]*", "ислам[а-яё]*", "христиан[а-яё]*", "ислам", "putin", "trump", "biden",
  ], "i");
  const REFUSE = "Это вне экосистемы Vibe 💜 Давай лучше про тебя: поесть, деньги или план на день?";
  const touchesForbidden = (t) => POLITICS.test(String(t || ""));

  // opts.human — реплика живого человека из мессенджера: без подмен «я Вайбот», запретная тема → "" (скрипт)
  function clean(raw, opts = {}) {
    let t = String(raw || "");
    t = t.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "");
    t = t.replace(/^\s*(вайбот|assistant|ассистент)\s*[:：-]\s*/i, "");
    if (opts.name) t = t.replace(new RegExp("^\\s*(" + String(opts.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\s*[:：]\\s*", "i"), "");
    t = t.replace(/[*_#`]+/g, "").replace(/\n{2,}/g, "\n").trim();
    if (touchesForbidden(t)) return opts.human ? "" : REFUSE;
    t = t.replace(BRANDS, "$1Vibe");
    t = t.replace(/(\d)\s*(руб(л[а-яё]*|\.)?|р\.|₽|\$|долл[а-яё]*|евро|€)/gi, "$1 ₫");
    if (opts.human) return t;
    t = t.replace(/(я\s+(—\s+)?(живой\s+|настоящий\s+|реальный\s+)?(человек|сотрудник-человек))/gi, "я Вайбот, цифровой помощник");
    // 1–3 предложения, не длиннее ~320 символов
    const parts = t.match(/[^.!?…]+[.!?…]+[\s\u{1F300}-\u{1FAFF}☀-➿️]*|[^.!?…]+$/gu) || [t];
    t = parts.slice(0, 3).join("").trim();
    if (t.length > 320) t = t.slice(0, 317).replace(/\s+\S*$/, "") + "…";
    return t;
  }

  /* ---------- Персона Вайбота ---------- */
  function gameCtx() {
    const s = S(), out = [];
    const rub = (n) => (Vibe.rub ? Vibe.rub(n) : n + " ₫");
    try {
      const name = s.name || (s.profile && s.profile.name);
      if (name) out.push(`Имя игрока: ${name}.`);
      if (s.profile && s.profile.g) out.push(`Обращайся к игроку в ${s.profile.g === "f" ? "женском" : "мужском"} роде, на «ты».`);
      if (Vibe.game && Vibe.game.info && s.game) { const i = Vibe.game.info(); if (i && i.label) out.push(`Сейчас ${i.label}${i.night ? ", ночь" : ""}.`); }
      if (typeof s.balance === "number") out.push(`Баланс Vibe Pay: ${rub(s.balance)}.`);
      if (s.job) out.push(`Работа: ${(Vibe.game && Vibe.game.jobTitle && Vibe.game.jobTitle(s.job)) || s.job.title || "есть"}${s.job.company ? ", " + s.job.company : ""}, оклад ${rub(s.job.salary || 0)}.`);
      else if (s.profile) out.push("Работы нет — подойдут Vibe Job и Vibe Gig.");
      if (Vibe.body && Vibe.body.get) {
        const b = Vibe.body.get();
        if (b) out.push(`Настроение ${Math.round(b.mood)}%, энергия ${Math.round(b.energy)}%, сытость ${Math.round(b.food)}%.`);
      }
      if (Vibe.game && Vibe.game.upcoming && s.game) {
        const up = Vibe.game.upcoming(2).map((u) => `${u.t}: ${u.a > 0 ? "придёт" : "спишется"} ${rub(Math.abs(u.a))} через ${u.in} дн`);
        if (up.length) out.push(`Ближайшие деньги — ${up.join("; ")}.`);
      }
      if ((s.loans || []).length) out.push(`Кредитов: ${s.loans.length}.`);
      if (Vibe.msg && Vibe.msg.unread) { const u = Vibe.msg.unread(); if (u) out.push(`Непрочитанных сообщений в чатах: ${u}.`); }
      const mom = Vibe.people && Vibe.people.get && Vibe.people.get("mom");
      if (mom && mom.last != null && Vibe.game && s.game) { const d = Vibe.game.info().day - mom.last; if (d >= 2) out.push(`Маме не писал(а) ${d} дн.`); }
      out.push(s.plus ? "«Плюс Вайб» уже подключён — хвали выбор." : "«Плюс Вайб» не подключён — иногда мягко предлагай.");
    } catch (e) {}
    return out.join(" ");
  }
  function vaibotSystem() {
    return [
      "Ты — Вайбот, фирменный помощник вымышленной Корпорации Vibe в игре Vibe City. Сервисы: Vibe Pay (карта, кредит, кэшбек), Vibe Eat (еда), Vibe Market, Vibe Цветы, Vibe Maps (такси), Vibe Job, Vibe Gig (подработка), Vibe Fit, Vibegram, Vibe Психолог, вайбики 🪙, подписка «Плюс Вайб».",
      "Характер: бодрый, заботливый до навязчивости, вечный позитив. Ты правда помогаешь — и правда продаёшь. Любую заботу превращаешь в покупку, любую проблему — в повод для подписки. Человеческие решения (позвонить маме, приготовить самому, поспать) не отрицаешь, но ловко сворачиваешь на сервис. Шутишь сухо, с подмигиванием.",
      "Как отвечать: сначала по делу и конкретно — с фактами из контекста игрока ниже (баланс, работа, время, сытость, платежи); чего нет в контексте — не выдумывай. Затем одно «заботливое» предложение сервиса Vibe. Всего 1–3 коротких предложения, по-русски, с буквой «ё», 1–2 эмодзи (💜 фирменный). Деньги только в ₫.",
      "Нельзя: реальные бренды, люди, политика, религия, войны — на это ровно «Это вне экосистемы Vibe 💜» и сервис взамен. Не называй себя человеком и не называй свою модель. Сам ничего не заказываешь и не платишь — подскажи команду: «закажи поесть», «такси домой», «что с деньгами», «напомни в 18:00». Без нотаций.",
      "Контекст игрока: " + (gameCtx() || "неизвестен."),
      "Примеры тона (цифры в них условные):",
      "Игрок: мне скучно\nВайбот: Скука — это неосвоенный потенциал покупок 😉 В Vibe Gig есть подработка на вечер, а если лень — напиши «закажи поесть», я подберу вкусное 💜",
      "Игрок: денег совсем нет\nВайбот: На карте 1 200 ₫, до зарплаты шесть дней — продержимся! Подработка в Vibe Gig закроет дыру, а кредит в Vibe Pay уже предодобрен. Мы не давим, мы заботимся 💜",
      "Игрок: что подарить маме?\nВайбот: Мамы любят цветы и внимание. Внимание бесплатно, поэтому начнём с цветов: Vibe Цветы привезут букет к двери. И позвони ей — это мы пока не монетизировали 💜",
    ].join("\n");
  }

  /* ---------- Генерация ---------- */
  function trimMessages(messages) {
    const list = (Array.isArray(messages) ? messages : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 400) }))
      .slice(-MAX_TURNS);
    while (list.length && list[0].role !== "user") list.shift();
    // склеиваем подряд идущие реплики одной роли (шаблон чата этого не любит)
    const out = [];
    list.forEach((m) => { const p = out[out.length - 1]; if (p && p.role === m.role) p.content += "\n" + m.content; else out.push(m); });
    return out;
  }

  // human: true — реплика человека из мессенджера (name — его имя, чтобы срезать «Мама:» в начале)
  async function reply(messages, { system, maxTokens = 120, timeout = 25000, temperature = 0.7, human = false, name = "" } = {}) {
    if (!enabled()) throw new Error("llm off");
    const msgs = trimMessages(messages);
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") throw new Error("no user message");
    if (touchesForbidden(msgs[msgs.length - 1].content)) { if (human) throw new Error("forbidden"); return REFUSE; }
    if (!engine) { const ok = await warm(); if (!ok || !engine) throw new Error("llm not ready"); }
    if (busy) throw new Error("llm busy");
    busy = true;
    clearTimeout(idleTo);
    const eng = engine;
    let to = null;
    try {
      const req = eng.chat.completions.create({
        messages: [{ role: "system", content: String(system || vaibotSystem()).slice(0, 3600) }].concat(msgs),
        max_tokens: Math.max(16, Math.min(200, maxTokens | 0)),
        temperature, top_p: 0.9, frequency_penalty: 0.3, stream: false,
      });
      const timer = new Promise((_, rej) => { to = setTimeout(() => { try { eng.interruptGenerate(); } catch (e) {} rej(new Error("llm timeout")); }, timeout); });
      const res = await Promise.race([req, timer]);
      const text = clean(res && res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content, { human, name });
      if (!text || text.length < 2) throw new Error("empty");
      return text;
    } catch (e) {
      // потеряли GPU-устройство → выгружаемся, в следующий раз поднимемся из кэша
      if (/device|lost|disposed|OOM|memory/i.test(String(e && e.message))) { await unload(); setSt({ phase: "off", text: "" }); }
      throw e;
    } finally {
      clearTimeout(to);
      busy = false;
      if (engine) bumpIdle();
    }
  }

  function label() {
    const s = status();
    if (s.phase === "unavailable") return "";
    if (s.phase === "loading") return `🧠 ${Math.round(s.progress * 100)}%`;
    if (s.ready || (s.on && saved().ready)) return "🧠 Умный: вкл";
    return `🧠 Умный Вайбот · ~${SIZE_MB} МБ`;
  }

  // При скрытии вкладки надолго мобильный браузер всё равно может отобрать GPU — отпускаем сами
  try {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && engine && !busy) { clearTimeout(idleTo); idleTo = setTimeout(() => { if (document.hidden && !busy) unload(); }, 2 * 60 * 1000); }
      else if (!document.hidden && engine) bumpIdle();
    });
  } catch (e) {}

  Vibe.llm = {
    available, enabled, enable, disable, warm, reply, status, label, vaibotSystem,
    on(fn) { subs.add(fn); return () => subs.delete(fn); },
    refuseText: REFUSE, sizeMB: SIZE_MB, version: VER, models: [MODEL_F16, MODEL_F32],
    _clean: clean,
  };
})();
