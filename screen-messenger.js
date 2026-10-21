/* ============================================================
   Vibe Мессенджер — экраны "chats" и "chat" (перекрывают старые
   из screen-social.js). Переписка с людьми живёт по игровому
   времени: ответы приходят с задержкой по режиму дня персонажа,
   спящие отвечают утром, сообщения доставляются даже вне экрана.

   API: Vibe.msg = { send(chatId, text, {from, delay, k, ask}),
     thread(chatId), unread(chatId?), addBot(id, {n, e, reply, ask, run,
     hello, chips, pin, pings}), list(), open(id), gift(id, item),
     giftSheet(id), meetSheet(id), profile(id), onChange(fn), tick(),
     richBots }
   Состояние: msg_threads = { [id]: { m:[{i,f:"me"|"them"|"sys",t,at,k,g,ev,a}],
     u (непрочитано), p:[{at,t,k,ask,ev}] (в пути), q (тема с выбором) } },
     msg_plan (день, на который запланированы входящие), msg_meta {…}.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const G = () => Vibe.game;
  const C = () => Vibe.chars || null;
  const live = () => !!(G() && S().game && S().profile);
  const nowMin = () => (live() ? G().minutes() : 9 * 60);
  const today = () => (live() ? G().info().day : 0);
  const esc = (s) => Vibe.esc(s == null ? "" : s);
  const rub = (n) => Vibe.rub(n);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const MONTHS = ["ноя", "дек", "янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт"];
  const clock = (m) => { const mm = ((Math.floor(m) % 1440) + 1440) % 1440; return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`; };
  const dayLabel = (d) => { const t = today(); return d === t ? "Сегодня" : d === t - 1 ? "Вчера" : `${(d % 30) + 1} ${MONTHS[Math.floor(d / 30) % 12]}`; };
  const uid = () => "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  
  /* ================= Боты ================= */
  const bots = {};
  const ZAB = {
    "Как сэкономить?": ["Отличный вопрос! Подключи «Плюс Вайб» — и экономь кэшбеком 💎", "А ещё можно не покупать. Но это не наш метод 😅"],
    "Хочу кредит": ["Уже одобрено! Ещё до того, как ты спросил 🤑", "Перейди в Vibe Pay → Кредит. Или я сам всё сделаю?"],
    "Мне грустно": ["Понимаю. Вот 3 вещи, которые помогут: рамен 🍜, новые кроссовки 👟, ещё один рамен 🍜", "Шучу. Иногда помогает просто написать маме. Она в чатах, закреплена 📌"],
    "Кто ты?": ["Я Вайбот. Я забочусь о тебе. И о показателях выручки 📈", "Но в первую очередь о тебе! Наверное."],
    "Подари вайбики": ["__reward__"],
    "Что скажешь обо мне?": ["__insight__"],
  };
  function zabReply(text) {
    const lines = ZAB[text] || (/обо мне|совет|как я/i.test(text) ? ["__insight__"] : ["Интересно! Кстати, у нас скидка на это 😉", "Шучу. Или нет. Загляни в Vibe Market 🛍️"]);
    const out = [];
    lines.forEach((l) => {
      if (l === "__reward__") {
        const gd = today();
        if (S().zabGiftDay === gd) out.push("Сегодня уже дарил. Жадность — не вайб 😌");
        else { set({ zabGiftDay: gd }); setTimeout(() => Vibe.reward({ vibiki: 50, xp: 10 }), 1400); out.push("Ладно, ладно. Держи 🪙 +50"); }
      } else if (l === "__insight__") (Vibe.insight ? Vibe.insight() : ["Ты прекрасен"]).slice(0, 3).forEach((t) => out.push(t));
      else out.push(l);
    });
    return out;
  }
  bots.zabotik = { n: "Вайбот", e: "🤖", c: "c-lime", pin: true, builtin: true, sub: "помощник Корпорации · всегда онлайн",
    hello: ["Привет! Я Вайбот, твой персональный помощник 💜", "Я знаю о тебе всё. Ну, почти всё. Спроси меня о чём угодно!"],
    chips: Object.keys(ZAB), reply: zabReply };
  bots.courier = { n: "Курьер Тимур", e: "🛵", c: "c-pink", sub: "доставляет · где-то рядом",
    hello: ["Я у подъезда.", "Какой подъезд?"], chips: ["Ты где?", "Третий подъезд!", "Оставь у двери"],
    reply: () => [pick(["А, это не тот дом.", "Уже бегу! (стою)", "Домофон не работает. У меня тоже", "Еду. Навигатор говорит, что я уже приехал"])] };
  bots.bank = { n: "Vibe Pay · поддержка", e: "🏦", c: "c-yellow", sub: "бот · отвечает всегда, помогает иногда",
    hello: ["Здравствуйте! Ваше обращение очень важно для нас."], chips: ["Позовите человека", "Где мои деньги?", "Отменить подписку"],
    reply: (t) => /человек|оператор/i.test(t) ? ["Соединяю с оператором… Вы 1 248-й в очереди. Пока ждёте — оформите кредит?"] : /подписк/i.test(t) ? ["Отменить подписку можно в разделе «Подписки» → «Ещё подписки» → «Точно?» → «Может, всё-таки нет?» 💜"] : ["Ваше обращение очень важно для нас 🙏", "Ваши деньги в безопасности. Где именно — уточняем"] };
  bots.promo = { n: "Vibe · Акции", e: "📣", c: "c-orange", sub: "рассылка · 2,4 млн подписчиков",
    hello: ["🔥 −90% на всё!*", "*На товары, которых нет в наличии"], chips: ["Отписаться"],
    reply: () => ["Отписаться можно в разделе «Подписаться» 💜", "Вы отписались от 1 из 14 рассылок. Остальные — это для вас!"],
    pings: [{ h: 10, p: 0.8, t: ["🔥 Только сегодня: −70% на то, что вам не нужно", "⚡ Флеш-распродажа! Успейте за 15 минут (до вчера)", "🎁 Для вас персональная скидка 3%. Почти как у всех"] }, { h: 19, p: 0.5, t: ["🛍️ Вы смотрели наушники. Наушники смотрят на вас", "💜 Мы скучаем! Вернитесь в корзину"] }] };

  /* ================= Хранилище ================= */
  const listeners = new Set();
  const changed = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  const TH = () => S().msg_threads || {};
  const blank = () => ({ m: [], u: 0, p: [], q: null });
  const th = (id) => Object.assign(blank(), TH()[id] || {});
  function save(id, t) {
    t.m = t.m.slice(-90);
    set({ msg_threads: Object.assign({}, TH(), { [id]: t }) });
    changed();
  }
  let viewing = null;

  /* ---------- Кто есть кто ---------- */
  function who(id) {
    if (bots[id]) return Object.assign({ id, bot: true, c: "c-lime" }, bots[id]);
    const ch = C() && C().raw(id);
    const p = Vibe.people ? Vibe.people.get(id) : null;
    if (!ch && !p) return null;
    return { id, n: (ch && ch.n) || p.n, e: (p && p.e) || (ch && ch.e) || "🙂", c: (ch && ch.c) || "c-mint", ch, p, kind: (p && p.kind) || (ch && ch.kind) };
  }
  const ava = (w, size = 54) => (w.id === "zabotik" ? Vibe.zabotik(Math.round(size * 0.86)) : `<span class="emo">${w.e || "🙂"}</span>`);
  const hearts = (id) => (C() ? C().hearts(id) : Math.floor(((Vibe.people.get(id) || {}).rel || 0) / 10));
  const stat = (id) => (bots[id] ? { s: "free", online: true, t: bots[id].sub || "онлайн" } : C() ? C().status(id) : { s: "free", online: true, t: "в сети" });
  const delayFor = (id) => (bots[id] ? 0.4 : C() ? C().replyDelay(id) : rnd(1, 5));
  const line = (id, k) => (C() ? C().line(id, k) : pick(["Ага 🙂", "Понял(а)", "Интересно!"]));
  const relWord = (h) => (h < 2 ? "Знакомы" : h < 4 ? "Приятели" : h < 6 ? "Норм" : h < 8 ? "Близко 💛" : "Не разлей вода 💞");

  /* ---------- Доставка ---------- */
  function deliverItem(id, t, x) {
    const msg = { i: uid(), f: x.f || "them", t: x.t, at: Math.min(nowMin(), x.at || nowMin()) };
    if (x.k) msg.k = x.k;
    if (x.ev) msg.ev = x.ev;
    if (x.g) msg.g = x.g;
    if (x.a) msg.a = x.a;
    t.m.push(msg);
    if (x.ask) t.q = x.ask;
    if (viewing !== id && msg.f !== "me") t.u = (t.u || 0) + 1;
    return msg;
  }
  // Положить входящее в очередь (at — игровая минута) или сразу
  function queue(id, x) {
    const t = th(id);
    if (!x.at || x.at <= nowMin()) { const m = deliverItem(id, t, x); save(id, t); notify(id, [m]); return; }
    t.p = [...(t.p || []), x].sort((a, b) => a.at - b.at);
    save(id, t);
  }
  let lastToast = 0;
  function notify(id, msgs) {
    if (viewing === id || document.hidden || !msgs.length) return;
    const fresh = msgs.filter((m) => m.f !== "me" && nowMin() - m.at < 45);
    if (!fresh.length || Date.now() - lastToast < 2500) return;
    lastToast = Date.now();
    const w = who(id) || { n: "Vibe", e: "💬" };
    const m = fresh[fresh.length - 1];
    FX.toast(`${w.n}: ${m.k === "ev" ? "💗 новая сценка!" : String(m.t || "").slice(0, 70)}`, w.id === "zabotik" ? "🤖" : w.e || "💬", 3000);
  }
  function deliver() {
    if (!live()) return;
    const all = TH(), now = nowMin();
    const next = Object.assign({}, all);
    const got = [];
    Object.keys(all).forEach((id) => {
      const t0 = all[id];
      if (!t0 || !(t0.p || []).length || t0.p[0].at > now) return;
      const t = Object.assign(blank(), t0);
      const due = t.p.filter((x) => x.at <= now);
      t.p = t.p.filter((x) => x.at > now);
      const ms = due.map((x) => deliverItem(id, t, x));
      t.m = t.m.slice(-90);
      next[id] = t;
      got.push([id, ms]);
    });
    if (!got.length) return;
    set({ msg_threads: next });
    changed();
    if (got.length > 2 && !document.hidden) FX.toast(`💬 Новые сообщения в ${got.length} чатах`, "📨", 2600);
    else got.forEach(([id, ms]) => notify(id, ms));
  }

  /* ---------- Планировщик входящих (утро, «ты поел?», «ты пропал?») ---------- */
  function contacts() {
    const ids = new Set();
    if (C()) C().list().forEach((c) => { if (C().known(c.id)) ids.add(c.id); });
    if (Vibe.people) Object.keys(Vibe.people.all()).forEach((id) => ids.add(id));
    return [...ids].filter((id) => !bots[id]);
  }
  function planDay() {
    if (!live()) return;
    const d = today();
    if (S().msg_plan === d) return;
    const meta = Object.assign({}, S().msg_meta || {});
    const now = nowMin(), dom = (d % 30) + 1, dow = ((d % 7) + 7) % 7;
    const plans = [];
    const consider = (id, pings, isBot) => {
      (pings || []).forEach((pg, k) => {
        if (pg.days === "wd" && dow >= 5) return;
        if (pg.days === "we" && dow < 5) return;
        if (Array.isArray(pg.days) && !pg.days.includes(dow)) return;
        if (pg.dom && !pg.dom.includes(dom)) return;
        if (!isBot) {
          const p = Vibe.people.get(id) || {};
          if (p.kind === "ex") return;
          if (pg.minH && hearts(id) < pg.minH) return;
          if (pg.idle) { const idle = d - (p.last == null ? d : p.last); if (idle < pg.idle) return; }
        }
        const key = `${id}:${k}`;
        if (pg.every && meta[key] != null && d - meta[key] < pg.every) return;
        if (Math.random() > pg.p) return;
        const at = d * 1440 + pg.h * 60 + rnd(0, 25);
        if (at < now - 5) return;
        meta[key] = d;
        // Лестница охлаждения (care.js) меняет, о чём человек ещё пишет
        const texts = !isBot && Vibe.care ? Vibe.care.pingTexts(id, pg.t) : pg.t;
        if (!texts.length) return;
        plans.push([id, { at, t: pick(texts), ask: pg.ask || null }]);
      });
    };
    contacts().forEach((id) => { const ch = C() && C().raw(id); if (ch) consider(id, ch.pings, false); });
    Object.keys(bots).forEach((id) => consider(id, bots[id].pings, true));
    set({ msg_plan: d, msg_meta: meta });
    if (!plans.length) return;
    const next = Object.assign({}, TH());
    plans.forEach(([id, x]) => {
      const t = Object.assign(blank(), next[id] || {});
      // Не заваливать: максимум 2 в пути на чат
      if ((t.p || []).length >= 2) return;
      t.p = [...(t.p || []), x].sort((a, b) => a.at - b.at);
      next[id] = t;
    });
    set({ msg_threads: next });
    changed();
  }

  /* ---------- Сценки на сердечки → карточка в чате ---------- */
  function heartCheck() {
    if (!C() || !live()) return;
    contacts().forEach((id) => {
      const n = C().pendingEvent(id);
      if (!n) return;
      const p = Vibe.people.get(id) || {};
      if ((p.hevOff || []).includes(n)) return;
      Vibe.people.set(id, { hevOff: [...(p.hevOff || []), n] });
      const ev = C().raw(id).events[n];
      queue(id, { f: "sys", k: "ev", ev: n, t: `${ev.e} ${ev.t}` });
      if (viewing !== id) setTimeout(() => FX.toast(`💗 ${who(id).n}: ${n} сердечек! Новая сценка в чате`, ev.e, 3400), 400);
    });
  }

  let tickN = 0;
  function tick() {
    if (!live()) return;
    try {
      if (tickN++ % 5 === 0 && C()) C().ensure();
      planDay();
      deliver();
      if (tickN % 3 === 0) heartCheck();
    } catch (e) { console.error(e); }
  }
  setInterval(tick, 2000);

  /* ---------- Ответы людей ---------- */
  function composeReply(id, text) {
    const low = String(text).toLowerCase();
    const h = hearts(id);
    const out = [];
    const st = C() ? C().stateAt(id) : { s: "free" };
    if (st.s === "sleep") out.push({ t: line(id, "asleep") });
    const dlg = () => (C() ? C().nextDialog(id) : null);
    if (/как дела|как ты|что нового|как жизнь|как сам|как сама|как день/.test(low)) {
      const d = dlg();
      out.push(d ? { t: d.q, ask: d.id } : { t: line(id, "small") });
    } else if (/что делаешь|чем занят|ты где|чё делаешь|че делаешь/.test(low)) {
      out.push({ t: st.s === "work" ? `${st.label === "на смене" ? "На смене" : "Работаю"}. ${line(id, "small")}` : st.s === "busy" ? `Сейчас ${st.label} 🙂` : line(id, "small") });
    } else if (/люблю|скучаю|нравишься|обожаю|💗|❤️|💖/.test(low)) {
      out.push({ t: h >= 6 ? line(id, "warm") : h >= 3 ? pick(["😊 Приятно. Очень", "Ой. Ты чего 😳 Мне тоже приятно с тобой", "Хи. Сохраню это сообщение"]) : pick(["😳 Эм… это неожиданно", "Ой. Давай для начала узнаем друг друга получше 🙂", "Хм. Ладно 🙂"]) });
    } else if (/пока|спокойной|споки|до завтра|бай/.test(low)) {
      out.push({ t: line(id, "bye") });
    } else if (/встрет|увидимся|погуля|сходим/.test(low)) {
      out.push({ t: `${line(id, "meet")} Выбирай время — жми «📍 Позвать»` });
    } else if (/привет|хай|здрав|добр(ое|ый)|(^|\s)(ку|йо)([\s!.,]|$)|салют/.test(low)) {
      out.push({ t: line(id, "hi") });
      const d = Math.random() < 0.55 ? dlg() : null;
      if (d) out.push({ t: d.q, ask: d.id });
    } else {
      out.push({ t: line(id, "small") });
      const d = Math.random() < 0.3 ? dlg() : null;
      if (d) out.push({ t: d.q, ask: d.id });
    }
    return out;
  }

  function scheduleReplies(id, items, base) {
    const t = th(id);
    let at = base;
    items.forEach((x, k) => { at += k ? rnd(0.6, 1.8) : 0; t.p.push(Object.assign({ at }, x)); });
    t.p.sort((a, b) => a.at - b.at);
    save(id, t);
  }
  const replyPending = (id) => (th(id).p || []).some((x) => x.reply);

  // Сообщение от игрока
  function userSend(id, text, extra = {}) {
    text = String(text || "").trim();
    if (!text) return;
    const t = th(id);
    t.m.push(Object.assign({ i: uid(), f: "me", t: text, at: nowMin() }, extra.k ? { k: extra.k } : {}, extra.g ? { g: extra.g } : {}));
    t.u = 0;
    save(id, t);
    // Ответ от Vibe Заботы — не общение: ни близости, ни опыта
    if (extra.auto) return;
    if (Vibe.game) Vibe.game.track("chat");
    Vibe.reward({ xp: 2, silent: true });
    const b = bots[id];
    if (b) return botReply(id, text);
    const w = who(id);
    if (!w) return;
    if (C()) {
      const r = C().talk(id);
      if (r.first) setTimeout(() => FX.toast(`${w.n}: +2 близости за общение сегодня`, "💗", 1800), 300);
    } else if (Vibe.people) Vibe.people.set(id, { last: today() });
    if (extra.noReply) return;
    if (replyPending(id)) return;
    const items = composeReply(id, text).map((x) => Object.assign({ reply: true }, x));
    scheduleReplies(id, items, nowMin() + delayFor(id));
  }

  function botReply(id, text) {
    const b = bots[id];
    const base = nowMin() + 0.45;
    const put = (lines, actions) => {
      const arr = (Array.isArray(lines) ? lines : [lines]).filter((x) => x != null && x !== "");
      if (!arr.length) return;
      const t = th(id);
      arr.forEach((l, k) => t.p.push({ at: base + k * 0.5, t: String(l), a: k === arr.length - 1 && actions && actions.length ? actions : undefined }));
      t.p.sort((a, b2) => a.at - b2.at);
      save(id, t);
    };
    try {
      if (b.ask && msg.richBots) {
        Promise.resolve(b.ask(text)).then((res) => { if (res) put(res.text, (res.actions || []).slice(0, 4).map((a) => ({ label: a.label, go: a.go, params: a.params, run: a.run }))); }).catch((e) => console.error(e));
      } else Promise.resolve(b.reply ? b.reply(text) : null).then((res) => put(res)).catch((e) => console.error(e));
    } catch (e) { console.error(e); }
  }

  /* ---------- Подарки ---------- */
  const SHOP = [
    { id: "g_flowers", name: "Букет «Извини, что пропал(а)»", e: "💐", price: 1500, tags: ["flowers"] },
    { id: "g_choco", name: "Шоколадный набор «Ты заслужил(а)»", e: "🍫", price: 690, tags: ["sweets"] },
    { id: "g_cola", name: "Кола «Классика вайба», 6 банок", e: "🥤", price: 390, tags: ["cola"] },
    { id: "g_lemon", name: "Крафтовый лимонад без сахара*", e: "🧃", price: 290, tags: ["drinks"] },
    { id: "g_coffee", name: "Кофе в зёрнах «Дедлайн», 250 г", e: "☕", price: 890, tags: ["coffee"] },
    { id: "g_book", name: "Книга «Гори, но не сгорай»", e: "📚", price: 990, tags: ["books"] },
    { id: "g_plant", name: "Суккулент «Неубиваемый»", e: "🪴", price: 590, tags: ["plants"] },
    { id: "g_art", name: "Набор акварели «Свободный художник»", e: "🎨", price: 1290, tags: ["art"] },
    { id: "g_tech", name: "Наушники «Минус опенспейс»", e: "🎧", price: 3990, tags: ["tech"] },
    { id: "g_sport", name: "Фитнес-резинки «Ещё подход»", e: "🏋️", price: 790, tags: ["sport"] },
    { id: "g_pizza", name: "Пицца «Четыре дедлайна»", e: "🍕", price: 890, tags: ["food"] },
    { id: "g_game", name: "Ключ к инди-игре «Ферма мечты»", e: "🎮", price: 690, tags: ["games"] },
    { id: "g_strings", name: "Струны и медиатор «Три аккорда»", e: "🎸", price: 790, tags: ["music"] },
    { id: "g_candle", name: "Свеча «Пахнет отпуском»", e: "🕯️", price: 690, tags: ["cozy"] },
    { id: "g_cream", name: "Крем «Сияние после дедлайна»", e: "💄", price: 1190, tags: ["beauty"] },
    { id: "g_tools", name: "Набор отвёрток с трещоткой", e: "🔧", price: 1490, tags: ["tools"] },
    { id: "g_cert", name: "Сертификат «На всё (кроме нужного)»", e: "🎟️", price: 2000, tags: ["cert"] },
    { id: "g_socks", name: "Носки. Классика", e: "🧦", price: 390, tags: ["socks"] },
  ];
  const NO_GIFT = ["dad_keys", "katya_bracelet", "valera_quiet", "sonya_paint"];
  const REACT = { love: ["💖", "обожает"], like: ["🙂", "любит"], hate: ["🤢", "не любит"] };
  function hintFor(id, tags) {
    const ch = C() && C().raw(id);
    if (!ch) return "";
    const known = C().knownTags(id);
    for (const [k, arr] of [["love", ch.loves], ["hate", ch.hates], ["like", ch.likes]]) {
      const t = tags.find((x) => arr.includes(x) && known.includes(x));
      if (t) return `<span class="mx-hint-tag mx-${k}">${REACT[k][0]} ${REACT[k][1]}</span>`;
    }
    return tags.some((x) => known.includes(x)) ? `<span class="mx-hint-tag">😐 так себе</span>` : `<span class="mx-hint-tag">❓</span>`;
  }
  const flowersScreen = () => !!(Vibe.screens && Vibe.screens.flowers);

  function giftSheet(id, onDone) {
    const w = who(id);
    if (!w || w.bot) return;
    const can = C() ? C().canGift(id) : { ok: true };
    if (!can.ok) { FX.toast(can.why, "🎁", 2600); return; }
    const bday = C() && C().isBirthday(id);
    const invItems = Vibe.inv ? Vibe.inv.list().filter((i) => !["car", "pet"].includes(i.cat) && !NO_GIFT.includes(i.id)) : [];
    const tagsOf = (it) => (C() ? C().tagsOf(it) : it.tags || []);
    const shop = SHOP.filter((g) => !(g.id === "g_flowers" && flowersScreen()));
    Vibe.ui.sheet(`
      <div class="display" style="font-size:26px">Подарок для ${esc(w.n)} ${w.e || ""}</div>
      ${bday ? `<div class="card c-orange tight" style="margin-top:10px;display:flex;gap:10px;align-items:center"><span class="emo wobble" style="font-size:30px">🎂</span><b style="font-size:13px">Сегодня день рождения! Подарок сработает ×8 — и плохой тоже</b></div>` : ""}
      <div class="mx-lbl">Один подарок в день. Попади в любимое — и сердечки полетят</div>
      ${flowersScreen() ? `<button class="mx-opt c-pink" data-fl><span class="e">💐</span><span class="t">Vibe Цветы<small>Букет с курьером до двери${hintFor(id, ["flowers"])}</small></span><span class="p">→</span></button>` : ""}
      ${invItems.length ? `<div class="mx-lbl">Из твоих вещей · передарить</div><div class="stack">${invItems.map((it) => `<button class="mx-opt" data-inv="${esc(it.id)}"><span class="e">${it.e || "🎁"}</span><span class="t">${esc(it.name)}<small>Бонус вещи пропадёт ${hintFor(id, tagsOf(it))}</small></span><span class="p">0 ₫</span></button>`).join("")}</div>` : ""}
      <div class="mx-lbl">Купить и отправить</div>
      <div class="stack">${shop.map((g) => `<button class="mx-opt" data-q="${g.id}"><span class="e">${g.e}</span><span class="t">${esc(g.name)}<small>${g.tags.map((t) => (Vibe.chars ? Vibe.chars.TAGS[t].t : t)).join(", ")} ${hintFor(id, g.tags)}</small></span><span class="p">${rub(g.price)}</span></button>`).join("")}</div>
      <div class="fine">Доставка подарков бесплатно*. *Курьер Тимур уже в пути. Какой подъезд?</div>
    `, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          if (e.target.closest("[data-fl]")) { close(); Vibe.go("flowers", { to: id }); return; }
          const iv = e.target.closest("[data-inv]"), q = e.target.closest("[data-q]");
          if (!iv && !q) return;
          let item, from = iv || q;
          if (iv) {
            const it = Vibe.inv.list().find((x) => x.id === iv.dataset.inv);
            if (!it) return;
            item = { id: it.id, name: it.name, e: it.e || "🎁", tags: tagsOf(it), cat: it.cat };
            Vibe.inv.remove(it.id);
          } else {
            const g = SHOP.find((x) => x.id === q.dataset.q);
            if (!Vibe.pay(g.price, { title: `Market · подарок: ${g.name}`, emoji: g.e, col: "c-pink", from: q })) return;
            item = { id: g.id, name: g.name, e: g.e, tags: g.tags };
          }
          close();
          const res = sendGift(id, item, from);
          onDone && onDone(res);
        });
      },
    });
  }
  function sendGift(id, item, from) {
    const w = who(id);
    let res;
    if (C()) res = C().gift(id, item);
    else {
      Vibe.people.rel(id, 4); Vibe.people.set(id, { lastGift: today(), last: today() });
      res = { ok: true, reaction: "like", delta: 4, line: "Спасибо! 😊" };
      Vibe.emit("gift", Object.assign({ id, item }, res));
    }
    if (!res || !res.ok) { FX.toast((res && res.line) || "Не получилось", "🎁"); return res; }
    const em = { love: "💖", like: "😊", neutral: "😐", hate: "🤢" }[res.reaction];
    const txt = { love: "Попал(а) в самое сердце!", like: "Подарок понравился", neutral: "Вежливо приняли", hate: "Мимо. Совсем мимо" }[res.reaction];
    if (from) FX.burst(from, { emojis: res.delta > 0 ? [item.e, "💗", "✨", w.e] : [item.e, "💔", "🫠"], count: res.reaction === "love" ? 22 : 12 });
    if (res.reaction === "love") { FX.confetti({ count: res.bday ? 160 : 80 }); FX.sound.success(); }
    else if (res.reaction === "hate") FX.sound.error(); else FX.sound.like();
    FX.toast(`${em} ${txt} ${res.delta > 0 ? "+" : ""}${res.delta} 💗`, item.e, 2800);
    if (res.learned && res.tag && res.reaction !== "neutral") setTimeout(() => FX.toast(`📝 Теперь ты знаешь: ${w.n} ${REACT[res.reaction][1]} ${Vibe.chars.TAGS[res.tag] ? Vibe.chars.TAGS[res.tag].t : res.tag}`, "🔓", 3200), 1600);
    if (res.delta > 0) Vibe.reward({ vibiki: 5, xp: 10, from });
    return res;
  }
  // Любой подарок (в т.ч. из Vibe Цветы) → пузырь в чате и реакция с задержкой
  Vibe.on("gift", (d) => {
    if (!d || !d.id || !d.reaction || !d.item) return;
    if (bots[d.id]) return;
    const t = th(d.id);
    t.m.push({ i: uid(), f: "me", k: "gift", g: d.item.e || "🎁", t: d.item.name || "Подарок", at: nowMin() });
    t.u = 0;
    const em = { love: " 😍", like: " 😊", neutral: "", hate: "" }[d.reaction] || "";
    t.p.push({ at: nowMin() + delayFor(d.id), t: `${d.line}${em}`, reply: true });
    t.p.sort((a, b) => a.at - b.at);
    save(d.id, t);
  });
  Vibe.on("hearts", (d) => {
    if (!d || d.to <= d.from) return;
    const w = who(d.id);
    if (!w) return;
    setTimeout(() => { FX.toast(`${w.n}: ${d.to} ❤️ из 10!`, "💗", 2600); FX.confetti({ count: 50 }); }, 900);
  });

  /* ---------- Позвать встретиться ---------- */
  const PRICE = (k) => (k === "club" ? 1800 : /^restaurant:/.test(k) ? 2600 : k === "wheel" ? 300 : 0);
  const instr = (name) => {
    const n = String(name || "");
    const low = /^(Мама|Папа)$/.test(n) ? n.toLowerCase() : n;
    if (/[жшчщц]а$/.test(low)) return low.slice(0, -1) + "ей";
    if (/а$/.test(low)) return low.slice(0, -1) + "ой";
    if (/я$/.test(low)) return low.slice(0, -1) + "ей";
    if (/й$/.test(low)) return low.slice(0, -1) + "ем";
    if (/[бвгдзклмнпрстфхжшчщ]$/.test(low)) return low + "ом";
    return low;
  };
  function upcomingWith(id) { return Vibe.sched ? Vibe.sched.upcoming(30).find((e) => e.pid === id && ["friend", "date"].includes(e.kind)) : null; }
  function whenText(e) { const d = e.day - today(); return `${d === 0 ? "сегодня" : d === 1 ? "завтра" : `через ${d} дн.`} в ${String(e.hour).padStart(2, "0")}:${String(e.min || 0).padStart(2, "0")}`; }
  function meetSheet(id, onDone) {
    const w = who(id);
    if (!w || w.bot || !Vibe.sched || !live()) return;
    const up = upcomingWith(id);
    if (up) { FX.toast(`Уже договорились: ${whenText(up)}`, "📅", 2600); return; }
    const keys = ((w.ch && w.ch.places) || ["park", "club", "restaurant:3"]).filter((k) => !/^flat:/.test(k) && k !== "home" && Vibe.map && Vibe.map.place(k));
    if (!keys.includes("park")) keys.push("park");
    const PL = keys.map((k) => { const pl = Vibe.map.place(k); return { k, e: pl.e || "📍", t: /^restaurant:/.test(k) ? `Ресторан №${k.split(":")[1]}` : pl.label, price: PRICE(k) }; });
    const info = G().info();
    const HOURS = [8, 10, 12, 14, 16, 18, 20, 22];
    let pl = 0, day = 0, hour = null;
    const avail = (dd, h) => {
      const abs = (info.day + dd) * 1440 + h * 60 + 30;
      if (abs <= nowMin() + 30) return { ok: false, i: "⌛" };
      const s = C() ? C().stateAt(id, abs).s : "free";
      return s === "free" ? { ok: true, i: "" } : { ok: false, i: { sleep: "😴", work: "💼", busy: "⏳" }[s] };
    };
    const draw = (sh) => {
      $$(sh, "[data-pl]").forEach((b) => b.classList.toggle("on", +b.dataset.pl === pl));
      $$(sh, "[data-day]").forEach((b) => b.classList.toggle("on", +b.dataset.day === day));
      if (hour != null && !avail(day, hour).ok) hour = null;
      $$(sh, "[data-h]").forEach((b) => { const h = +b.dataset.h, a = avail(day, h); b.disabled = !a.ok; b.classList.toggle("on", h === hour); b.innerHTML = `${a.i ? a.i + " " : ""}${h}:00`; });
      const go = $(sh, "[data-ok]");
      go.disabled = hour == null;
      go.innerHTML = hour == null ? "Выбери свободное время" : `Позвать ${PL[pl].price ? `· ${rub(PL[pl].price)}` : "· бесплатно"} <span class="arrow">→</span>`;
    };
    Vibe.ui.sheet(`
      <div class="display" style="font-size:26px">Встреча с ${esc(instr(w.n))} ${w.e || ""}</div>
      <div class="mx-lbl">Любимые места ${esc(w.n)}</div>
      <div class="stack">${PL.map((x, i) => `<button class="mx-opt" data-pl="${i}"><span class="e">${x.e}</span><span class="t">${esc(x.t)}<small>${(w.ch && w.ch.places || []).includes(x.k) ? "💗 любимое место" : "просто место"}</small></span><span class="p">${x.price ? rub(x.price) : "0 ₫"}</span></button>`).join("")}</div>
      <div class="mx-lbl">Когда · 😴 спит · 💼 работает · ⏳ занят(а)</div>
      <div class="mx-chips"><button class="chip" data-day="0">Сегодня</button><button class="chip" data-day="1">Завтра</button><button class="chip" data-day="2">Послезавтра</button></div>
      <div class="mx-chips" style="margin-top:8px">${HOURS.map((h) => `<button class="chip" data-h="${h}">${h}:00</button>`).join("")}</div>
      <button class="btn black xl block" data-ok style="margin-top:16px">Выбери время</button>
      <div class="fine">Встреча появится в календаре и на карте. Не придёшь — близость упадёт, а ${esc(w.n)} будет делать вид, что «всё нормально».</div>
    `, {
      onMount(sh, close) {
        draw(sh);
        sh.addEventListener("click", (e) => {
          const a = e.target.closest("[data-pl]"); if (a) { pl = +a.dataset.pl; FX.bump(a); draw(sh); return; }
          const d = e.target.closest("[data-day]"); if (d) { day = +d.dataset.day; FX.bump(d); draw(sh); return; }
          const h = e.target.closest("[data-h]"); if (h) { hour = +h.dataset.h; FX.bump(h); draw(sh); return; }
          const ok = e.target.closest("[data-ok]");
          if (!ok || hour == null) return;
          const x = PL[pl];
          if (x.price && !Vibe.pay(x.price, { title: `Встреча · ${x.t}`, emoji: x.e, col: "c-lilac", from: ok })) return;
          const isDate = w.kind === "date";
          const ev = Vibe.sched.add({ day: info.day + day, hour, min: 0, dur: 150, title: isDate ? `Свидание с ${instr(w.n)}` : `Встреча с ${instr(w.n)}`, e: isDate ? "💘" : w.e || "☕", place: x.k, kind: isDate ? "date" : "friend", go: "maps", price: x.price, pid: id, pn: w.n, pe: w.e });
          close();
          FX.confetti({ count: 60 }); FX.sound.success();
          const when = whenText(ev);
          userSend(id, `Давай встретимся ${when}? ${x.e} ${x.t}`, { noReply: true });
          const t = th(id);
          t.p.push({ at: nowMin() + delayFor(id), t: line(id, "meet"), reply: true });
          t.p.push({ at: nowMin() + delayFor(id) + 0.5, f: "sys", t: `📅 ${ev.title} — ${when} · ${x.t}` });
          t.p.sort((a2, b2) => a2.at - b2.at);
          save(id, t);
          FX.toast(`Приглашение отправлено. ${w.n} ответит ${stat(id).online ? "скоро" : "как освободится"}`, "📍", 2800);
          onDone && onDone();
        });
      },
    });
  }

  /* ---------- Профиль человека ---------- */
  const SCOL = { sleep: "var(--lilac)", work: "var(--sky)", busy: "var(--orange)", free: "var(--lime)" };
  function planBar(id, we) {
    const pl = C().plan(id, we);
    return `<div class="mx-plan">${pl.map((x) => `<i style="background:${SCOL[x.s]}" title="${x.h}:00 ${esc(x.label)}"></i>`).join("")}</div>`;
  }
  function heartRow(h, size = 15) {
    return `<span class="mx-hrow" style="font-size:${size}px">${Array.from({ length: 10 }, (_, i) => (i < h ? "❤️" : "🤍")).join("")}</span>`;
  }
  function tagChips(id, arr, kind) {
    const known = C().knownTags(id);
    const T = C().TAGS;
    return arr.map((t) => known.includes(t) ? `<span class="chip mx-tag mx-${kind}">${T[t].e} ${T[t].t}</span>` : `<span class="chip mx-tag mx-unk">❓ ???</span>`).join("");
  }
  function profile(id) {
    const w = who(id);
    if (!w) return;
    if (w.bot) { FX.toast(`${w.n}: ${w.sub || "бот"}`, w.id === "zabotik" ? "🤖" : w.e); return; }
    const ch = w.ch;
    const h = hearts(id);
    const st = stat(id);
    const gramOk = Vibe.screens && Vibe.screens["gram-profile"];
    const evs = ch && C() ? C().events(id) : [];
    const pr = C() ? C().progress(id) : 0;
    const closeSh = Vibe.ui.sheet(`
      <div class="mx-prof">
        <div class="mx-prof-top">
          <div class="chat-ava ${w.c}" style="width:76px;height:76px;font-size:42px">${ava(w, 76)}</div>
          <div style="flex:1;min-width:0">
            <div class="display" style="font-size:24px;line-height:1.05">${esc(w.n)}</div>
            <div class="mx-sub">${ch ? `${esc(ch.full)} · ${ch.age} лет` : esc(relWord(h))}</div>
            ${ch ? `<button class="mx-handle" data-gram ${gramOk ? "" : "disabled"}>${esc(ch.handle)} · ${Vibe.fmt(ch.followers)} подп.</button>` : ""}
          </div>
        </div>
        <div class="card tight" style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:13px">${relWord(h)}</b><b style="font-size:13px">❤️ ${h}/10</b></div>
          <div style="margin-top:6px">${heartRow(h, 16)}</div>
          <div class="progress" style="height:8px;margin-top:6px"><i style="--p:${Math.round(pr * 100)}%;background:var(--pink)"></i></div>
          <div class="mx-sub" style="margin-top:6px">${st.online ? "🟢 в сети" : `⚪ ${esc(st.t)}`}${ch ? ` · 🎂 ${C().bdayText(id)}${C().isBirthday(id) ? " — СЕГОДНЯ!" : ""}` : ""}</div>
        </div>
        ${ch ? `
        <p class="mx-bio">${esc(ch.bio)}</p>
        <div class="mx-sub">💼 ${esc(ch.job)}</div>
        <div class="mx-lbl">Режим дня</div>
        <div class="mx-planrow"><small>Будни</small>${planBar(id, false)}</div>
        <div class="mx-planrow"><small>Выходные</small>${planBar(id, true)}</div>
        <div class="mx-legend"><span><i style="background:var(--lime)"></i>свободен(на)</span><span><i style="background:var(--sky)"></i>работа</span><span><i style="background:var(--orange)"></i>занят(а)</span><span><i style="background:var(--lilac)"></i>сон</span></div>
        <div class="mx-sub" style="margin-top:6px">⚡ Быстрее отвечает: ${esc(ch.schedule.fast || "когда свободен(на)")}</div>
        <div class="mx-lbl">Привычки</div>
        <div class="mx-habits">${ch.habits.map((x) => `<div>• ${esc(x)}</div>`).join("")}</div>
        <div class="mx-lbl">Подарки · узнавай в разговорах и дари</div>
        <div class="mx-giftrow"><b>💖 Обожает</b><div class="mx-chips">${tagChips(id, ch.loves, "love")}</div></div>
        <div class="mx-giftrow"><b>🙂 Любит</b><div class="mx-chips">${tagChips(id, ch.likes, "like")}</div></div>
        <div class="mx-giftrow"><b>🤢 Не любит</b><div class="mx-chips">${tagChips(id, ch.hates, "hate")}</div></div>
        <div class="mx-lbl">Любимые места</div>
        <div class="mx-chips">${ch.places.map((k) => { const p = Vibe.map && Vibe.map.place(k); return p ? `<span class="chip">${p.e || "📍"} ${esc(/^restaurant:/.test(k) ? `Ресторан №${k.split(":")[1]}` : p.label)}</span>` : ""; }).join("")}</div>
        <div class="mx-lbl">О чём поговорить</div>
        <div class="mx-chips">${ch.topics.map((x) => `<span class="chip">💬 ${esc(x)}</span>`).join("")}</div>
        <div class="mx-lbl">Сценки</div>
        <div class="stack">${evs.map((e) => `<button class="mx-opt ${e.open ? (e.seen ? "" : "c-pink") : "mx-lock"}" data-evp="${e.n}" ${e.open ? "" : "disabled"}><span class="e">${e.open ? e.e : "🔒"}</span><span class="t">${e.open ? esc(e.t) : "???"}<small>${e.n} ❤️ ${e.open ? (e.seen ? "· ▶ пересмотреть" : "· ✨ новая!") : "· откроется позже"}</small></span></button>`).join("")}</div>
        ` : ""}
        <div class="mx-acts3" style="margin-top:14px">
          <button class="btn lime" data-pa="chat">💬 Написать</button>
          <button class="btn pink" data-pa="gift">🎁 Подарок</button>
          <button class="btn yellow" data-pa="meet">📍 Позвать</button>
        </div>
        <div class="fine">Vibe не читает ваши переписки*. *Только анализирует, чтобы подобрать вам подарки.</div>
      </div>`, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          if (e.target.closest("[data-gram]") && gramOk) { close(); Vibe.go("gram-profile", { id }); return; }
          const ev = e.target.closest("[data-evp]");
          if (ev) { const n = +ev.dataset.evp; const seen = ((Vibe.people.get(id) || {}).hev || []).includes(n); close(); setTimeout(() => C().play(id, n, { replay: seen }), 320); return; }
          const a = e.target.closest("[data-pa]"); if (!a) return;
          close();
          const act = a.dataset.pa;
          setTimeout(() => {
            if (act === "chat") { if (!(Vibe.current && Vibe.current.route.name === "chat" && Vibe.current.route.params.id === id)) Vibe.go("chat", { id }); }
            else if (act === "gift") giftSheet(id);
            else meetSheet(id);
          }, 300);
        });
      },
    });
    return closeSh;
  }

  /* ================= Публичный API ================= */
  const msg = (Vibe.msg = {
    richBots: false,
    send(chatId, text, opts = {}) {
      const from = opts.from || "me";
      if (from === "me") return userSend(chatId, text, opts);
      const x = { f: from === "sys" ? "sys" : "them", t: String(text), k: opts.k, ask: opts.ask, a: opts.actions };
      if (opts.delay > 0) x.at = nowMin() + opts.delay;
      queue(chatId, x);
    },
    thread: (id) => th(id).m.slice(),
    unread(id) { const all = TH(); if (id) return (all[id] || {}).u || 0; return Object.values(all).reduce((s, t) => s + ((t && t.u) || 0), 0); },
    addBot(id, def) {
      const chips = def.chips || (id === "zabotik" && (def.reply || def.ask) ? ["Что с деньгами?", "Спланируй день", "Как я?", "Что подарить маме?", "Закажи поесть", "Пошути"] : null);
      bots[id] = Object.assign({}, bots[id] || {}, def, { builtin: false }, chips ? { chips } : {});
      if (def.ask && id === "zabotik") msg.richBots = true;
      changed();
      return bots[id];
    },
    bots: () => Object.assign({}, bots),
    list() { return chatList(); },
    open(id) { Vibe.go("chat", { id }); },
    gift(id, item) { return sendGift(id, item); },
    giftSheet, meetSheet, profile,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    tick,
    read(id) { const t = th(id); if (t.u) { t.u = 0; save(id, t); } },
  });

  /* ================= Список чатов ================= */
  function chatList() {
    const all = TH();
    const ids = new Set([...Object.keys(bots).filter((id) => bots[id].list !== false), ...contacts()]);
    Object.keys(all).forEach((id) => { if (who(id)) ids.add(id); });
    const partner = Vibe.people && Vibe.people.partner();
    return [...ids].map((id) => {
      const w = who(id);
      if (!w) return null;
      const t = Object.assign(blank(), all[id] || {});
      const last = t.m[t.m.length - 1];
      const pin = id === "zabotik" || w.kind === "family" || (partner && partner.id === id) || !!(bots[id] && bots[id].pin);
      return { id, w, t, last, pin, at: last ? last.at : -1, typing: !w.bot && (t.p || []).some((x) => x.at - nowMin() < 2 && x.at > nowMin() - 1) && stat(id).s !== "sleep" };
    }).filter(Boolean).sort((a, b) => (b.pin - a.pin) || (b.at - a.at) || (hearts(b.id) - hearts(a.id)));
  }
  function preview(r) {
    if (r.typing) return `<span class="mx-typing-t">печатает…</span>`;
    const m = r.last;
    if (!m) return esc(r.w.bot ? (r.w.sub || "") : r.w.ch ? r.w.ch.job : "Напиши первым(ой) 👋");
    if (m.k === "gift") return `${m.f === "me" ? "Вы: " : ""}🎁 ${esc(m.t)}`;
    if (m.k === "ev") return `💗 Новая сценка: ${esc(m.t)}`;
    return `${m.f === "me" ? "Вы: " : ""}${esc(m.t)}`;
  }
  function rowTime(m) { if (!m) return ""; const d = Math.floor(m.at / 1440); return d === today() ? clock(m.at) : dayLabel(d); }

  function chatsBody(q = "") {
    const list = chatList().filter((r) => !q || r.w.n.toLowerCase().includes(q.toLowerCase()));
    const online = chatList().filter((r) => !r.w.bot && stat(r.id).online);
    return `
      ${!q && online.length ? `<div class="mx-lbl" style="margin-top:4px">Сейчас в сети · ${online.length}</div>
      <div class="hscroll mx-online">${online.map((r) => `<button class="mx-on" data-go="chat" data-params='${JSON.stringify({ id: r.id })}'><span class="chat-ava ${r.w.c}">${ava(r.w)}<i class="mx-dot"></i></span><small>${esc(r.w.n)}</small></button>`).join("")}</div>` : ""}
      <div class="stack stagger" style="margin-top:8px">
        ${list.map((r) => {
          const st = stat(r.id);
          const h = r.w.bot ? null : hearts(r.id);
          return `
          <button class="card tight tap chat-row mx-row ${r.pin ? "c-lilac" : ""} ${r.w.kind === "ex" ? "mx-ex" : ""}" data-go="chat" data-params='${JSON.stringify({ id: r.id })}'>
            <div class="chat-ava ${r.w.c}" style="position:relative;overflow:visible">${ava(r.w)}${st.online ? `<i class="mx-dot"></i>` : ""}</div>
            <div class="tx"><b>${esc(r.w.n)}${r.pin ? " 📌" : ""}${h != null ? ` <span class="mx-h">❤️${h}</span>` : ""}</b><small>${preview(r)}</small></div>
            <div class="mx-side"><small>${rowTime(r.last)}</small>${r.t.u ? `<span class="dot-count" style="position:static">${r.t.u > 99 ? "99+" : r.t.u}</span>` : ""}</div>
          </button>`;
        }).join("") || `<div class="card flat tight" style="font-weight:800;font-size:13px">Никого не нашли. Даже Вайбот спрятался 🫣</div>`}
      </div>
      <div class="fine">Сообщения шифруются*. *Эмодзи. Остальное читает Вайбот, чтобы лучше заботиться.</div>`;
  }

  Vibe.screen("chats", {
    render() {
      tick();
      const u = msg.unread();
      return `
      <div class="head"><button class="icon-btn" data-back aria-label="Назад">←</button><div class="title" style="font-size:26px">Чаты<small>${u ? `${u} непрочитанных · ` : "Все тебя ждут · "}${Vibe.ui.clock()}</small></div><button class="icon-btn" data-act="new" aria-label="Новый чат">✏️</button></div>
      <div class="field" style="margin-bottom:6px">🔍 <input placeholder="Поиск по чатам" data-search></div>
      <div data-list>${chatsBody()}</div>`;
    },
    mount(root) {
      const list = $(root, "[data-list]");
      const inp = $(root, "[data-search]");
      let q = "";
      const redraw = () => {
        list.innerHTML = chatsBody(q);
        list.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c) => c.style.setProperty("--i", 0)));
        const sm = $(root, ".head .title small");
        const u = msg.unread();
        if (sm) sm.innerHTML = `${u ? `${u} непрочитанных · ` : "Все тебя ждут · "}${Vibe.ui.clock()}`;
      };
      inp.addEventListener("input", () => { q = inp.value.trim(); redraw(); });
      const off = msg.onChange(() => redraw());
      const iv = setInterval(() => { if (!document.hidden) redraw(); }, 15000);
      const onClick = (e) => {
        if (!e.target.closest('[data-act="new"]')) return;
        const ppl = contacts().map(who).filter(Boolean);
        Vibe.ui.sheet(`<div class="display" style="font-size:24px;margin-bottom:12px">Новый чат</div>
          <div class="stack">${ppl.map((w) => `<button class="mx-opt" data-nc="${esc(w.id)}"><span class="e">${w.e}</span><span class="t">${esc(w.n)}<small>${esc(stat(w.id).t)} · ❤️ ${hearts(w.id)}/10</small></span><span class="p">💬</span></button>`).join("")}</div>
          <div class="fine">Новые знакомства — в Vibe Match. Мэтч → свидание → переписка.</div>`, {
          onMount(sh, close) { sh.addEventListener("click", (ev) => { const b = ev.target.closest("[data-nc]"); if (b) { close(); Vibe.go("chat", { id: b.dataset.nc }); } }); },
        });
      };
      root.addEventListener("click", onClick);
      return () => { off(); clearInterval(iv); root.removeEventListener("click", onClick); };
    },
  });

  /* ================= Экран чата ================= */
  function bubbles(id, w) {
    const t = th(id);
    const ms = t.m.slice(-70);
    let lastDay = null, out = "";
    const lastThem = (() => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i].f === "them") return ms[i].at; return -1; })();
    const online = stat(id).online;
    ms.forEach((m) => {
      const d = Math.floor(m.at / 1440);
      if (d !== lastDay) { out += `<div class="mx-day"><span>${dayLabel(d)}</span></div>`; lastDay = d; }
      const time = clock(m.at);
      if (m.f === "sys") {
        if (m.k === "ev") {
          const seen = ((Vibe.people && Vibe.people.get(id)) || {}).hev || [];
          const done = seen.includes(m.ev);
          out += `<div class="mx-sys mx-evc" data-mi="${m.i}"><span class="emo ${done ? "" : "wobble"}">💗</span><div><b>${esc(m.t)}</b><small>Сценка на ${m.ev} сердечек</small></div><button class="btn sm ${done ? "" : "pink"}" data-ev="${m.ev}">${done ? "▶ Ещё раз" : "Смотреть ✨"}</button></div>`;
        } else out += `<div class="mx-sys" data-mi="${m.i}">${esc(m.t)}</div>`;
        return;
      }
      const me = m.f === "me";
      const ticks = me && !w.bot ? `<b class="mx-tick ${lastThem >= m.at || online ? "rd" : ""}">${lastThem >= m.at ? "✓✓" : "✓"}</b>` : "";
      if (m.k === "gift") {
        out += `<div class="msg ${me ? "out" : "in"} mx-gift" data-mi="${m.i}"><span class="mx-ge">${m.g || "🎁"}</span><div><small>Подарок</small><b>${esc(m.t)}</b></div><i class="mx-time">${time}${ticks}</i></div>`;
        return;
      }
      out += `<div class="msg ${me ? "out" : "in"} ${m.k === "choice" ? "mx-ch" : ""}" data-mi="${m.i}">${esc(m.t)}<i class="mx-time">${time}${ticks}</i></div>`;
      if (m.a && m.a.length) out += `<div class="mx-bacts" data-mi="${m.i}a">${m.a.map((a, j) => `<button class="btn sm ${j ? "" : "black"}" data-ba="${m.i}:${j}">${esc(a.label)}</button>`).join("")}</div>`;
    });
    if (!ms.length) out = `<div class="mx-empty"><div class="emo float" style="font-size:54px">${w.id === "zabotik" ? "🤖" : w.e}</div><b>Начни переписку</b><small>${w.bot ? "" : "Правильные слова и подарки прокачивают отношения 💗"}</small></div>`;
    return out;
  }
  function chipsHtml(id, w) {
    const t = th(id);
    if (w.bot) return (w.chips || []).map((c) => `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join("");
    if (t.q && C()) {
      const d = C().dialog(id, t.q);
      if (d) return d.a.map((o, i) => `<button class="chip mx-choice" data-choice="${i}">${esc(o[0])}</button>`).join("");
    }
    const h = hearts(id);
    const base = ["👋 Привет!", "Как дела?", "Что делаешь?"];
    if (h >= 3) base.push(w.kind === "family" ? "Люблю тебя ❤️" : "Скучаю 💗");
    base.push("Давай встретимся?", "Спокойной ночи 🌙");
    return base.map((c) => `<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join("");
  }
  function headStatus(id, w) {
    const st = stat(id);
    return `${st.online ? `<span class="mx-online-t">● в сети</span>` : esc(st.t)}`;
  }
  function heartsStrip(id, w) {
    if (w.bot) return "";
    const h = hearts(id), pr = C() ? C().progress(id) : 0;
    const bd = C() && C().isBirthday(id);
    return `<button class="mx-hbar" data-prof>
      ${heartRow(h, 13)}<span class="mx-hnum">${h}/10</span>
      <span class="mx-hprog"><i style="width:${Math.round(pr * 100)}%"></i></span>
      ${bd ? `<span class="badge" style="background:var(--orange)">🎂 ДР!</span>` : ""}
    </button>`;
  }

  Vibe.screen("chat", {
    render(p) {
      const id = p.id || "zabotik";
      const w = who(id) || who("zabotik");
      const gramOk = !w.bot && Vibe.screens && Vibe.screens["gram-profile"];
      return `
      <div class="mx-head">
        <button class="icon-btn" data-back aria-label="Назад">←</button>
        <button class="mx-who" data-prof>
          <span class="chat-ava ${w.c}" style="width:46px;height:46px;font-size:24px;position:relative;overflow:visible">${ava(w, 46)}<i class="mx-dot" data-dot ${stat(w.id).online ? "" : "hidden"}></i></span>
          <span class="mx-wt"><b>${esc(w.n)}</b><small data-status>${headStatus(w.id, w)}</small></span>
        </button>
        ${gramOk ? `<button class="icon-btn" data-gram aria-label="Vibegram">📸</button>` : ""}
      </div>
      ${heartsStrip(w.id, w)}
      <div class="mx-hint" data-hint ${stat(w.id).hint ? "" : "hidden"}>${esc(stat(w.id).hint || "")}</div>
      <div class="mx-msgs" data-msgs>${bubbles(w.id, w)}</div>
      <div class="mx-typing msg in typing" data-typing hidden><span></span><span></span><span></span></div>
      <div class="mx-bottom">
        <div class="mx-chips mx-qr" data-chips>${chipsHtml(w.id, w)}</div>
        ${w.bot ? "" : `<div class="mx-acts">
          ${w.id === "mom" && Vibe.care ? `<button class="btn lime" data-a="call">📞 Позвонить</button>
          <button class="btn" data-a="care">🤖 ${Vibe.care.state().auto ? "Забота: вкл" : "Vibe Забота"}</button>` : `<button class="btn pink" data-a="gift">🎁 Подарок</button>
          <button class="btn yellow" data-a="meet">📍 Позвать</button>`}
          <button class="btn" data-a="prof">👤 Профиль</button>
        </div>`}
        <form class="mx-form" data-form><input data-input placeholder="Сообщение…" autocomplete="off" maxlength="300"><button type="submit" aria-label="Отправить">➤</button></form>
      </div>`;
    },
    mount(root, p) {
      const id = who(p.id || "zabotik") ? p.id || "zabotik" : "zabotik";
      const w = who(id);
      viewing = id;
      const box = $(root, "[data-msgs]");
      const typing = $(root, "[data-typing]");
      const input = $(root, "[data-input]");
      let seen = new Set(th(id).m.map((m) => m.i));
      // Приветствие бота
      if (w.bot && !th(id).m.length && (w.hello || []).length) {
        const t = th(id);
        w.hello.forEach((l, k) => t.p.push({ at: nowMin() + 0.3 + k * 0.5, t: l }));
        save(id, t);
      }
      const toBottom = (smooth) => root.scrollTo({ top: root.scrollHeight, behavior: smooth ? "smooth" : "auto" });
      const markRead = () => { const t = th(id); if (t.u) { t.u = 0; set({ msg_threads: Object.assign({}, TH(), { [id]: t }) }); } };
      markRead();
      requestAnimationFrame(() => toBottom(false));
      let lastChips = "";
      const redraw = () => {
        const near = root.scrollHeight - root.scrollTop - root.clientHeight < 260;
        const ms = th(id).m;
        box.innerHTML = bubbles(id, w);
        let fresh = false, freshThem = false;
        ms.forEach((m) => {
          if (!seen.has(m.i)) { fresh = true; if (m.f !== "me") freshThem = true; const el = box.querySelector(`[data-mi="${m.i}"]`); if (el) el.classList.add("mx-new"); }
        });
        seen = new Set(ms.map((m) => m.i));
        const ch = chipsHtml(id, w);
        if (ch !== lastChips) { const cc = $(root, "[data-chips]"); cc.innerHTML = ch; lastChips = ch; if (th(id).q) cc.classList.add("mx-ask"); else cc.classList.remove("mx-ask"); }
        const hb = $(root, ".mx-hbar"); if (hb) hb.outerHTML = heartsStrip(id, w);
        if (freshThem) FX.sound.pop();
        if (fresh || near) toBottom(true);
        markRead();
      };
      lastChips = chipsHtml(id, w);
      if (th(id).q) $(root, "[data-chips]").classList.add("mx-ask");
      const off = msg.onChange(redraw);
      // Живой статус и «печатает…»
      const live1 = () => {
        msg.tick && deliver();
        const st = stat(id);
        const s = $(root, "[data-status]"); if (s) s.innerHTML = headStatus(id, w);
        const dot = $(root, "[data-dot]"); if (dot) dot.hidden = !st.online;
        const hint = $(root, "[data-hint]"); if (hint) { hint.hidden = !st.hint; hint.textContent = st.hint || ""; }
        const soon = (th(id).p || []).some((x) => x.at - nowMin() < 2.2) && (w.bot || st.s !== "sleep");
        if (soon !== !typing.hidden) {
          typing.hidden = !soon;
          if (soon) { if (s) s.innerHTML = `<span class="mx-online-t">печатает…</span>`; toBottom(true); }
        } else if (soon && s) s.innerHTML = `<span class="mx-online-t">печатает…</span>`;
      };
      const iv = setInterval(() => { if (!document.hidden) live1(); }, 1000);
      live1();

      const send = (text) => {
        text = String(text || "").trim();
        if (!text) return;
        FX.sound.like();
        userSend(id, text);
      };
      const onClick = (e) => {
        const c = e.target.closest("[data-choice]");
        if (c) {
          const t = th(id);
          const dl = C() && C().dialog(id, t.q);
          if (!dl) { t.q = null; save(id, t); return; }
          const i = +c.dataset.choice;
          const res = C().talk(id, { dlg: dl.id, i });
          if (!res.ok) { FX.shake(c); FX.toast(res.why || "Не получилось", "🫠"); return; }
          FX.burst(c, { emojis: res.delta > 0 ? ["💗", "✨", w.e] : res.delta < 0 ? ["💔", "🫠"] : ["💬"], count: res.delta > 3 ? 16 : 8 });
          if (res.delta) FX.toast(`${res.delta > 0 ? "+" : ""}${res.delta} близости ${res.delta > 0 ? "💗" : "💔"}`, w.e, 1800);
          if (res.delta > 0) FX.sound.like(); else if (res.delta < 0) FX.sound.error();
          const t2 = th(id);
          t2.q = null;
          t2.m.push({ i: uid(), f: "me", k: "choice", t: res.text || dl.a[i][0], at: nowMin() });
          t2.p.push({ at: nowMin() + Math.min(delayFor(id), 30), t: res.reply, reply: true });
          t2.p.sort((a, b) => a.at - b.at);
          save(id, t2);
          if (res.learned && res.learn) {
            const ch = C().raw(id), T = C().TAGS[res.learn];
            const kind = ch.loves.includes(res.learn) ? "love" : ch.hates.includes(res.learn) ? "hate" : ch.likes.includes(res.learn) ? "like" : null;
            if (kind && T) setTimeout(() => FX.toast(`📝 Теперь ты знаешь: ${w.n} ${REACT[kind][1]} ${T.t} ${T.e}`, "🔓", 3400), 1200);
          }
          if (Vibe.skills && Vibe.skills.xp && res.delta > 0) try { Vibe.skills.xp("charisma", 3); } catch (er) {}
          return;
        }
        const q = e.target.closest("[data-chip]");
        if (q) {
          FX.bump(q);
          const txt = q.dataset.chip;
          if (/^Давай встретимся/.test(txt) && !w.bot) { send(txt); setTimeout(() => meetSheet(id), 500); return; }
          send(txt.replace(/^👋 /, ""));
          return;
        }
        const ev = e.target.closest("[data-ev]");
        if (ev && C()) { const n = +ev.dataset.ev; const done = ((Vibe.people.get(id) || {}).hev || []).includes(n); C().play(id, n, { replay: done, onDone: () => setTimeout(redraw, 200) }); return; }
        const ba = e.target.closest("[data-ba]");
        if (ba) {
          const [mi, j] = ba.dataset.ba.split(":");
          const m = th(id).m.find((x) => x.i === mi);
          const a = m && m.a && m.a[+j];
          if (a) { FX.bump(ba); FX.burst(ba, { emojis: ["💜", "✨"], count: 6 }); const b = bots[id]; if (b && b.run) b.run(a); else if (a.go && Vibe.screens[a.go]) Vibe.go(a.go, a.params || {}); }
          return;
        }
        if (e.target.closest("[data-gram]")) { Vibe.go("gram-profile", { id }); return; }
        if (e.target.closest("[data-prof]") || e.target.closest('[data-a="prof"]')) { profile(id); return; }
        if (e.target.closest('[data-a="gift"]')) { giftSheet(id); return; }
        if (e.target.closest('[data-a="call"]') && Vibe.care) { Vibe.care.call(e.target.closest('[data-a="call"]')); return; }
        if (e.target.closest('[data-a="care"]') && Vibe.care) { Vibe.care.sheet(); return; }
        if (e.target.closest('[data-a="meet"]')) { meetSheet(id); return; }
      };
      root.addEventListener("click", onClick);
      const form = $(root, "[data-form]");
      const onSubmit = (e) => { e.preventDefault(); send(input.value); input.value = ""; };
      form.addEventListener("submit", onSubmit);
      return () => {
        off(); clearInterval(iv);
        root.removeEventListener("click", onClick);
        form.removeEventListener("submit", onSubmit);
        if (viewing === id) viewing = null;
      };
    },
  });

  /* ================= Стили ================= */
  const css = `
  .mx-row .tx b { display:flex; align-items:center; gap:6px; }
  .mx-h { font-size:11px; font-weight:900; padding:1px 6px; border:2px solid var(--ink); border-radius:999px; background:var(--paper); }
  .mx-side { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex:0 0 auto; }
  .mx-side small { font-size:11px; font-weight:800; color:var(--muted); }
  .mx-dot { position:absolute; right:-1px; bottom:1px; width:15px; height:15px; border-radius:50%; background:#2fd36b; border:2.5px solid var(--ink); }
  .mx-dot[hidden] { display:none; }
  .mx-ex { opacity:.55; filter:grayscale(.6); }
  .mx-typing-t, .mx-online-t { color:#14a650; font-weight:900; }
  .mx-online { gap:10px; padding-bottom:6px; }
  .mx-on { display:flex; flex-direction:column; align-items:center; gap:4px; width:64px; }
  .mx-on .chat-ava { position:relative; overflow:visible; width:56px; height:56px; }
  .mx-on small { font-size:11px; font-weight:800; max-width:64px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mx-lbl { font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin:14px 2px 8px; }
  .mx-chips { display:flex; gap:8px; flex-wrap:wrap; }
  .mx-chips .chip[disabled] { opacity:.35; pointer-events:none; }

  .mx-head { position:sticky; top:calc(-1 * (var(--safe-top) + 12px)); z-index:5; display:flex; align-items:center; gap:10px; margin:calc(-1 * (var(--safe-top) + 12px)) -16px 0; padding:calc(var(--safe-top) + 12px) 16px 10px; background:var(--bg); border-bottom:2px solid var(--ink); }
  .mx-who { flex:1; min-width:0; display:flex; align-items:center; gap:10px; text-align:left; }
  .mx-wt { min-width:0; display:flex; flex-direction:column; }
  .mx-wt b { font-family:var(--font-display); font-weight:400; font-size:19px; line-height:1.05; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mx-wt small { font-size:12px; font-weight:800; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mx-hbar { display:flex; align-items:center; gap:8px; width:100%; margin:10px 0 0; padding:7px 10px; border:2px solid var(--ink); border-radius:16px; background:var(--paper); box-shadow:var(--shadow-sm); flex-wrap:wrap; }
  .mx-hrow { letter-spacing:-2px; white-space:nowrap; }
  .mx-hnum { font-weight:900; font-size:12px; }
  .mx-hprog { flex:1; min-width:40px; height:8px; border:2px solid var(--ink); border-radius:999px; overflow:hidden; background:var(--bg); }
  .mx-hprog i { display:block; height:100%; background:var(--pink); transition:width .8s var(--spring); }
  .mx-hint { margin-top:8px; padding:7px 10px; font-size:12px; font-weight:800; border:2px dashed var(--ink); border-radius:14px; background:var(--lilac); }
  .mx-hint[hidden] { display:none; }
  .mx-msgs { display:flex; flex-direction:column; gap:7px; padding:12px 0 6px; }
  .mx-msgs .msg { animation:none; position:relative; padding-bottom:18px; min-width:72px; word-wrap:break-word; }
  .mx-msgs .msg.mx-new, .mx-msgs .mx-new { animation:pop-in .4s var(--spring) both; }
  .mx-time { position:absolute; right:10px; bottom:3px; font-style:normal; font-size:10px; font-weight:800; opacity:.55; display:flex; gap:3px; }
  .mx-tick { font-weight:900; } .mx-tick.rd { color:#1f7fff; opacity:1; }
  .mx-ch { background:var(--yellow) !important; }
  .mx-day { text-align:center; margin:6px 0; } .mx-day span { font-size:11px; font-weight:900; padding:3px 10px; border-radius:999px; background:var(--paper); border:2px solid var(--ink); }
  .mx-sys { align-self:center; text-align:center; font-size:12px; font-weight:800; padding:6px 12px; border-radius:14px; background:var(--mint); border:2px solid var(--ink); max-width:92%; }
  .mx-evc { display:flex; align-items:center; gap:10px; text-align:left; background:var(--pink); box-shadow:var(--shadow-sm); padding:10px 12px; width:100%; }
  .mx-evc .emo { font-size:28px; } .mx-evc div { flex:1; min-width:0; } .mx-evc b { display:block; font-size:14px; } .mx-evc small { font-size:11px; font-weight:800; }
  .mx-gift { display:flex; align-items:center; gap:10px; background:var(--pink) !important; }
  .mx-gift .mx-ge { font-size:34px; } .mx-gift small { display:block; font-size:10px; text-transform:uppercase; font-weight:900; opacity:.7; } .mx-gift b { font-size:13px; }
  .mx-bacts { display:flex; gap:6px; flex-wrap:wrap; margin:-2px 0 4px; }
  .mx-typing { margin:2px 0 0; width:max-content; }
  .mx-typing[hidden] { display:none; }
  .mx-empty { text-align:center; padding:40px 10px; display:grid; gap:6px; justify-items:center; } .mx-empty small { font-size:12px; font-weight:700; color:var(--muted); }
  .screen[data-screen="chat"] { padding-bottom:calc(var(--safe-bottom) + 220px); }
  .mx-bottom { position:fixed; left:50%; transform:translateX(-50%); width:100%; max-width:480px; bottom:0; padding:10px 16px calc(var(--safe-bottom) + 12px); background:var(--bg); border-top:2px solid var(--ink); z-index:20; display:grid; gap:8px; }
  .mx-qr { flex-wrap:nowrap; overflow-x:auto; margin:0 -16px; padding:2px 16px 4px; scrollbar-width:none; }
  .mx-qr::-webkit-scrollbar { display:none; }
  .mx-qr .chip { height:36px; font-size:13px; padding:0 14px; }
  .mx-ask { flex-wrap:wrap; overflow:visible; }
  .mx-ask .chip { height:auto; min-height:36px; padding:7px 12px; white-space:normal; text-align:left; line-height:1.2; background:var(--yellow); box-shadow:var(--shadow-sm); animation:mx-wig 2.4s ease-in-out infinite; }
  .mx-ask .chip:nth-child(2) { animation-delay:.3s; } .mx-ask .chip:nth-child(3) { animation-delay:.6s; }
  @keyframes mx-wig { 0%, 88%, 100% { transform:none; } 92% { transform:rotate(-2deg) scale(1.03); } 96% { transform:rotate(2deg); } }
  .mx-acts { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
  .mx-acts .btn { height:40px; padding:0 6px; font-size:12px; }
  .mx-form { display:flex; gap:8px; }
  .mx-form input { flex:1; min-width:0; height:48px; border:var(--line); border-radius:999px; padding:0 16px; font:inherit; font-weight:700; background:var(--paper); outline:none; }
  .mx-form button { width:48px; height:48px; border-radius:50%; border:var(--line); background:var(--lime); font-size:20px; box-shadow:var(--shadow-sm); flex:0 0 auto; }
  .mx-form button:active { transform:translateY(3px); box-shadow:none; }

  .mx-opt { display:flex; align-items:center; gap:12px; padding:11px 12px; border:2.5px solid var(--ink); border-radius:18px; background:var(--paper); width:100%; text-align:left; transition:transform .18s var(--spring); }
  .mx-opt.on { background:var(--lime); transform:scale(1.02); box-shadow:var(--shadow-sm); }
  .mx-opt .e { font-size:28px; flex:0 0 auto; }
  .mx-opt .t { flex:1; min-width:0; font-weight:800; font-size:14px; line-height:1.2; }
  .mx-opt .t small { display:block; font-size:11px; color:var(--muted); font-weight:700; margin-top:2px; }
  .mx-opt .p { font-weight:900; font-size:13px; white-space:nowrap; }
  .mx-opt.mx-lock { opacity:.5; }
  .mx-hint-tag { display:inline-block; margin-left:4px; padding:0 6px; border-radius:999px; border:1.5px solid var(--ink); background:var(--paper); color:var(--ink); font-weight:900; }
  .mx-hint-tag.mx-love { background:var(--pink); } .mx-hint-tag.mx-like { background:var(--lime); } .mx-hint-tag.mx-hate { background:var(--coral); }

  .mx-prof-top { display:flex; gap:14px; align-items:center; }
  .mx-sub { font-size:12px; font-weight:800; color:var(--muted); margin-top:3px; }
  .mx-handle { margin-top:6px; font-size:12px; font-weight:900; padding:3px 10px; border-radius:999px; border:2px solid var(--ink); background:var(--yellow); }
  .mx-handle[disabled] { background:var(--paper); }
  .mx-bio { font-size:14px; font-weight:700; line-height:1.4; margin:12px 2px 6px; }
  .mx-planrow { display:flex; align-items:center; gap:8px; margin-bottom:6px; } .mx-planrow small { width:62px; font-size:11px; font-weight:900; }
  .mx-plan { flex:1; display:grid; grid-template-columns:repeat(24,1fr); height:20px; border:2px solid var(--ink); border-radius:8px; overflow:hidden; }
  .mx-plan i { display:block; border-right:1px solid rgba(0,0,0,.12); }
  .mx-legend { display:flex; gap:10px; flex-wrap:wrap; font-size:11px; font-weight:800; } .mx-legend i { display:inline-block; width:10px; height:10px; border:1.5px solid var(--ink); border-radius:3px; margin-right:4px; vertical-align:-1px; }
  .mx-habits { display:grid; gap:4px; font-size:13px; font-weight:700; }
  .mx-giftrow { margin-bottom:8px; } .mx-giftrow b { display:block; font-size:12px; font-weight:900; margin-bottom:5px; }
  .mx-tag { height:32px; font-size:12px; padding:0 12px; }
  .mx-tag.mx-love { background:var(--pink); } .mx-tag.mx-like { background:var(--lime); } .mx-tag.mx-hate { background:var(--coral); } .mx-tag.mx-unk { opacity:.55; border-style:dashed; }
  .mx-acts3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; } .mx-acts3 .btn { height:44px; font-size:12px; padding:0 4px; }
  .chx-scene { max-height:78dvh; overflow-y:auto; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // Первичный тик после загрузки всех модулей
  setTimeout(tick, 600);
})();
