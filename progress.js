/* ============================================================
   Прогресс игрока:
   • Vibe.unlock — сервисы открываются постепенно, по мере жизни
   • Vibe.save   — экспорт/импорт сохранения, автобэкап
   • Vibe.cheats — чит-коды из поп-культуры (Sims, GTA, Doom)
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const KEY = "vibe-state-v2";

  /* ================= Постепенное открытие ================= */
  // Ступени: что открывается и за что
  const TIERS = [
    { id: "t0", t: "Старт", e: "🐣", screens: ["home", "fit", "calendar", "profile", "pay", "chats", "chat", "qr", "all", "job", "eat", "eat-place", "eat-track", "supermarket", "maps", "wheel", "plus", "welcome", "notfound", "locked", "search", "mail", "skills", "ending", "telecom"], cond: () => true, hint: "" },
    { id: "t1", t: "Первый отклик", e: "📨", screens: ["gig", "learn", "people", "gram", "gram-profile", "reels", "flowers", "cola"], cond: (s) => (s.life_apps || []).length > 0 || !!s.job, hint: "Откликнись на любую вакансию в Vibe Job" },
    { id: "t2", t: "Нашёл работу", e: "💼", screens: ["market", "music", "games", "rent", "health", "clean", "drive", "gov", "psy", "insure", "fitness", "media", "books", "cinema"], cond: (s) => !!s.job || ((s.stats || {}).salaries || 0) > 0, hint: "Устройся на работу" },
    { id: "t3", t: "Первая зарплата", e: "💸", screens: ["tickets", "match", "style", "hobby", "invest", "pets", "charity", "travel"], cond: (s) => ((s.stats || {}).salaries || 0) > 0, hint: "Дождись первой зарплаты (аванс 15-го)" },
    { id: "t4", t: "Взрослая жизнь", e: "🏠", screens: ["home-buy", "auto"], cond: (s) => ((s.stats || {}).promotions || 0) > 0 || s.balance >= 100000, hint: "Получи повышение или накопи 100 000 ₫" },
  ];
  const NAMES = {
    gig: ["Vibe Gig", "🚲"], learn: ["Vibe Learn", "🎓"], people: ["Близкие", "🫂"], market: ["Vibe Market", "🛍️"], music: ["Vibe Music", "🎧"],
    games: ["Vibe Games", "🎮"], rent: ["Vibe Rent", "🔑"], health: ["Vibe Health", "💊"], clean: ["Vibe Clean", "🫧"], drive: ["Vibe Drive", "🚗"],
    gov: ["Госвайб", "🏛️"], tickets: ["Vibe Tickets", "🎤"], match: ["Vibe Match", "💘"], style: ["Vibe Style", "🧥"], hobby: ["Хобби", "🎸"],
    invest: ["Vibe Invest", "🚀"], gram: ["Vibegram", "📸"], flowers: ["Vibe Цветы", "💐"], cola: ["Vibe Cola", "🥤"], psy: ["Vibe Психолог", "🛋️"],
    insure: ["Vibe Страхование", "☂️"], fitness: ["Vibe Фитнес", "🏋️"], media: ["Плюс Вайб", "🍿"], books: ["Vibe Книги", "📚"], cinema: ["Vibe Кино", "🎬"], pets: ["Vibe Pets", "🐶"], charity: ["Добрые дела", "💝"], travel: ["Vibe Travel", "🏝️"], "home-buy": ["Vibe Home", "🏠"], auto: ["Vibe Auto", "🚙"],
  };
  const tierOf = (name) => TIERS.find((t) => t.screens.includes(name));

  const unlock = (Vibe.unlock = {
    TIERS, NAMES,
    isOpen(name) {
      const s = S();
      if (!s.profile || s.unlockAll) return true;
      const t = tierOf(name);
      if (!t) return true; // неизвестные экраны не блокируем
      return t.id === "t0" || (s.unlocked || []).includes(t.id) || t.cond(s);
    },
    tier: tierOf,
    // Проверить новые ступени и отпраздновать
    check({ silent = false } = {}) {
      const s = S();
      if (!s.profile) return;
      const have = s.unlocked || [];
      const fresh = TIERS.filter((t) => t.id !== "t0" && !have.includes(t.id) && (s.unlockAll || t.cond(s)));
      if (!fresh.length) return;
      set({ unlocked: [...have, ...fresh.map((t) => t.id)] });
      if (silent) return;
      fresh.forEach((t, i) => setTimeout(() => celebrate(t), 900 + i * 2500));
    },
  });

  function celebrate(t) {
    if (document.querySelector(".modal")) return setTimeout(() => celebrate(t), 2000);
    FX.confetti();
    Vibe.modal(`
      <div class="badge" style="background:var(--lime)">${t.e} ${t.t}</div>
      <div class="display" style="font-size:28px;margin:10px 0 4px">Открыто в Vibe!</div>
      <p>Новые сервисы уже на главной. Корпорация рада, что ты растёшь. И тратишь.</p>
      <div class="grid3" style="margin-bottom:16px">${t.screens.filter((n) => NAMES[n] && Vibe.screens[n]).map((n) => `<button class="card tight tap" data-go="${n}" data-close style="text-align:center"><div style="font-size:30px">${(NAMES[n] || ["", "✨"])[1]}</div><b style="font-size:11px">${(NAMES[n] || [n])[0]}</b></button>`).join("")}</div>
      <button class="btn black block" data-close>Ого 🔥</button>`, { sound: "levelup" });
  }

  // Экран-заглушка для закрытого сервиса
  Vibe.screen("locked", {
    render(p) {
      const name = p.s || "";
      const t = tierOf(name) || TIERS[1];
      const [title, e] = NAMES[name] || ["Сервис", "🔒"];
      const idx = TIERS.indexOf(t);
      return `
      ${Vibe.ui.head(title, "пока закрыто")}
      <div class="hero c-lilac" style="text-align:center;min-height:240px">
        <div class="emo float" style="font-size:90px">${e}</div>
        <div class="display" style="max-width:none;font-size:30px">🔒 ${title}</div>
        <p style="max-width:none;margin-top:10px">Откроется на ступени «${t.e} ${t.t}»</p>
      </div>
      <div class="card" style="margin-top:14px">
        <b style="font-size:16px">Как открыть</b>
        <p style="font-weight:700;margin-top:6px">${t.hint}</p>
        <div class="progress" style="margin-top:12px"><i style="--p:${Math.round((idx - 1) / (TIERS.length - 2) * 100)}%"></i></div>
        <div class="fine">Ступень ${idx} из ${TIERS.length - 1}. Vibe открывается постепенно — как жизнь. Или введи чит-код, мы никому не скажем.</div>
      </div>
      <button class="btn black block" style="margin-top:14px" data-go="${idx <= 2 ? "job" : "home"}">${idx <= 2 ? "В Vibe Job" : "На главную"}</button>`;
    },
  });

  /* ================= Сохранение ================= */
  const save = (Vibe.save = {
    // Код сохранения: base64 от JSON состояния
    exportCode() {
      const json = JSON.stringify(Object.assign({ _v: 2, _at: Date.now() }, S()));
      return btoa(unescape(encodeURIComponent(json)));
    },
    importCode(code) {
      try {
        const json = decodeURIComponent(escape(atob(String(code).trim())));
        const data = JSON.parse(json);
        if (!data || !data.profile) return { ok: false, why: "Это не сохранение Vibe" };
        save.backup("before-import");
        localStorage.setItem(KEY, JSON.stringify(data));
        return { ok: true };
      } catch (e) {
        return { ok: false, why: "Код повреждён. Скопируй его целиком" };
      }
    },
    download() {
      const blob = new Blob([JSON.stringify(S(), null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      const d = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = `vibe-save-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    // Автобэкапы: до 3 копий, не чаще раза в 30 минут
    backup(tag = "auto") {
      try {
        const list = JSON.parse(localStorage.getItem("vibe-backups") || "[]");
        if (tag === "auto" && list[0] && Date.now() - list[0].at < 30 * 60 * 1000) return;
        list.unshift({ at: Date.now(), tag, data: localStorage.getItem(KEY) });
        localStorage.setItem("vibe-backups", JSON.stringify(list.slice(0, 3)));
      } catch (e) {}
    },
    backups() { try { return JSON.parse(localStorage.getItem("vibe-backups") || "[]"); } catch (e) { return []; } },
    restore(i) {
      const b = save.backups()[i];
      if (!b || !b.data) return false;
      localStorage.setItem(KEY, b.data);
      location.reload();
      return true;
    },
    sheet() {
      const code = save.exportCode();
      const bks = save.backups();
      Vibe.ui.sheet(`
        <div class="display" style="font-size:28px">Сохранение</div>
        <p class="muted" style="font-weight:700;margin:6px 0 14px">Прогресс хранится только в этом браузере. Сохрани код — и продолжишь жизнь на другом телефоне.</p>
        <div class="grid2">
          <button class="btn black" data-copy>📋 Скопировать код</button>
          <button class="btn" data-file>💾 Скачать файл</button>
        </div>
        <div class="display" style="font-size:20px;margin:18px 0 8px">Загрузить</div>
        <div class="field" style="height:auto;padding:8px 12px"><textarea data-code rows="3" placeholder="Вставь код сохранения" style="border:0;outline:0;background:none;width:100%;font:inherit;font-size:12px;resize:none"></textarea></div>
        <div class="grid2" style="margin-top:10px">
          <button class="btn lime" data-load>Загрузить код</button>
          <label class="btn" style="cursor:pointer">📂 Из файла<input type="file" accept=".json,application/json" data-upfile hidden></label>
        </div>
        ${bks.length ? `<div class="display" style="font-size:20px;margin:18px 0 8px">Автобэкапы</div>${bks.map((b, i) => `<button class="card tight tap" data-restore="${i}" style="display:flex;justify-content:space-between;width:100%;margin-bottom:8px;text-align:left"><span>🕒 ${new Date(b.at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><b>${b.tag === "auto" ? "авто" : "до загрузки"}</b></button>`).join("")}` : ""}
        <div class="fine">Код — это вся твоя жизнь в Vibe одной строкой. Не показывай его «службе безопасности банка».</div>`, {
        onMount(sh, close) {
          sh.querySelector("[data-copy]").addEventListener("click", async (e) => {
            try { await navigator.clipboard.writeText(code); FX.toast("Код скопирован. Сохрани в заметки", "📋"); FX.burst(e.currentTarget, { emojis: ["📋", "✨"], count: 8 }); }
            catch (err) { const ta = sh.querySelector("[data-code]"); ta.value = code; ta.select(); FX.toast("Скопируй код из поля ниже", "📋"); }
          });
          sh.querySelector("[data-file]").addEventListener("click", () => { save.download(); FX.toast("Файл сохранения скачан", "💾"); });
          const load = (txt) => {
            let r;
            try { const obj = JSON.parse(txt); r = obj && obj.profile ? (save.backup("before-import"), localStorage.setItem(KEY, JSON.stringify(obj)), { ok: true }) : { ok: false, why: "Это не сохранение Vibe" }; }
            catch (e) { r = save.importCode(txt); }
            if (!r.ok) { FX.toast(r.why, "🫠"); FX.shake(sh); return; }
            FX.confetti(); FX.toast("Жизнь загружена. Перезапускаем…", "✅");
            setTimeout(() => location.reload(), 900);
          };
          sh.querySelector("[data-load]").addEventListener("click", () => load(sh.querySelector("[data-code]").value));
          sh.querySelector("[data-upfile]").addEventListener("change", (e) => {
            const f = e.target.files[0]; if (!f) return;
            const r = new FileReader(); r.onload = () => load(r.result); r.readAsText(f);
          });
          sh.addEventListener("click", (e) => {
            const b = e.target.closest("[data-restore]");
            if (b) { close(); save.restore(+b.dataset.restore); }
          });
        },
      });
    },
  });

  /* ================= Кэшбек-категории ================= */
  // Каждый игровой месяц игрок выбирает 3 категории (с «Плюс Вайб» — 4) из 8 предложенных
  const CATS = [
    { id: "food", t: "Еда и доставка", e: "🍜", r: 0.05, re: /Eat|Supermarket|Кофе|латте|Шаурма|Cola/i },
    { id: "move", t: "Такси и самокаты", e: "🛴", r: 0.07, re: /такси|Maps|Самокат|Метро|Drive|Бензин/i },
    { id: "shop", t: "Шопинг", e: "🛍️", r: 0.04, re: /Market|Style|Pets/i },
    { id: "fun", t: "Развлечения", e: "🎤", r: 0.10, re: /Tickets|концерт|Music|Кино|Книг|Games|Плюс/i },
    { id: "health", t: "Здоровье", e: "💊", r: 0.06, re: /Health|Клиника|аптек|Психолог|Фитнес/i },
    { id: "home", t: "Дом и уют", e: "🏠", r: 0.03, re: /Clean|Цветы|Rent|аренд/i },
    { id: "learn", t: "Саморазвитие", e: "🎓", r: 0.08, re: /Learn|курс|Хобби/i },
    { id: "cola", t: "Vibe Cola", e: "🥤", r: 0.20, re: /Cola/i },
    { id: "night", t: "Ночные заказы (23:00–05:00)", e: "🌙", r: 0.12, re: /Eat|Market|Supermarket/i, night: true },
    { id: "rain", t: "Самокаты в дождь", e: "🌧️", r: 0.15, re: /Самокат/i, rain: true },
    { id: "sigh", t: "Вздохи", e: "😮‍💨", r: 0.05, re: /^$/, joke: "Вздохи пока не тарифицируются. Но скоро" },
    { id: "anxiety", t: "Тревога", e: "🫨", r: 0.15, re: /^$/, joke: "Начисляется в конце жизни" },
    { id: "cb", t: "Кэшбек на кэшбек", e: "♾️", r: 0.01, re: /./ },
    { id: "monday", t: "Понедельники", e: "🗓️", r: 0.09, re: /./, monday: true },
  ];
  const BASE = 0.005;
  const month = () => Math.floor(Vibe.game.info().day / 30);
  const cashback = (Vibe.cashback = {
    CATS,
    offer() {
      const m = month();
      let h = (S().game && S().game.start) ? (S().game.start / 1000 + m * 7919) >>> 0 : m;
      const pool = CATS.slice(); const out = [];
      while (out.length < 8 && pool.length) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
      return out;
    },
    limit: () => (S().plus ? 4 : 3),
    chosen() { const c = S().cbChoice; return c && c.m === month() ? c.ids : null; },
    choose(ids) { set({ cbChoice: { m: month(), ids: ids.slice(0, cashback.limit()) } }); },
    rate(title, forced) {
      if (forced != null) return { rate: forced };
      const ids = cashback.chosen() || [];
      const i = Vibe.game.info();
      const w = Vibe.weather ? Vibe.weather.now() : null;
      let best = { rate: BASE, cat: null };
      ids.forEach((id) => {
        const c = CATS.find((x) => x.id === id); if (!c || !c.re.test(title)) return;
        if (c.night && !(i.hour >= 23 || i.hour < 5)) return;
        if (c.rain && !(w && (w.kind === "rain" || w.kind === "storm"))) return;
        if (c.monday && i.day % 7 !== 0) return;
        if (c.r > best.rate) best = { rate: c.r, cat: c.t, e: c.e };
      });
      return best;
    },
    sheet() {
      const offer = cashback.offer();
      const cur = cashback.chosen();
      const pick = new Set(cur || []);
      const lim = cashback.limit();
      Vibe.ui.sheet(`
        <div class="display" style="font-size:26px">Кэшбек на ${Vibe.game.info().monthName.toLowerCase()}</div>
        <p class="muted" style="font-weight:700;margin:6px 0 12px">${cur ? "Категории выбраны до конца месяца. Мы уважаем твой выбор. Почти." : `Выбери ${lim} категории. Без выбора — ${BASE * 100}% на всё. Подумай хорошо: передумать нельзя.`}</p>
        <div class="cb-grid">${offer.map((c) => `<button class="cb-card ${pick.has(c.id) ? "on" : ""}" data-cb="${c.id}" ${cur ? "disabled" : ""}><span class="emo">${c.e}</span><b>${Math.round(c.r * 100)}%</b><small>${c.t}</small></button>`).join("")}</div>
        ${cur ? "" : `<button class="btn black block" style="margin-top:14px" data-cbok disabled>Выбрать 0 из ${lim}</button>`}
        <div class="fine">Кэшбек начисляется вайбиками. 1 вайбик = 1 ₫ при оплате до 30% покупки. «Вздохи» и «Тревога» пока не тарифицируются. ${S().plus ? "С «Плюс Вайб» — 4 категории и кэшбек ×2." : "С «Плюс Вайб» — 4 категории и кэшбек ×2."}</div>`, {
        onMount(sh, close) {
          if (cur) return;
          const ok = sh.querySelector("[data-cbok]");
          sh.addEventListener("click", (e) => {
            const b = e.target.closest("[data-cb]");
            if (b) {
              const id = b.dataset.cb;
              if (pick.has(id)) pick.delete(id); else if (pick.size < lim) pick.add(id); else { FX.shake(b); return; }
              b.classList.toggle("on", pick.has(id)); FX.bump(b);
              const c = CATS.find((x) => x.id === id);
              if (pick.has(id) && c.joke) FX.toast(c.joke, c.e);
              ok.disabled = pick.size !== lim; ok.textContent = pick.size === lim ? "Подтвердить выбор" : `Выбрать ${pick.size} из ${lim}`;
            }
            if (e.target.closest("[data-cbok]")) {
              cashback.choose([...pick]); close(); FX.confetti({ count: 80 });
              FX.toast("Категории выбраны. Самое время за ними сходить", "🪙");
              Vibe.emit("cashback", [...pick]);
            }
          });
        },
      });
    },
  });
  // Напоминание выбрать категории в начале месяца
  setInterval(() => {
    const s = S();
    if (!s.profile || !s.game || document.querySelector(".modal,.sheet")) return;
    if (cashback.chosen() || s.cbNag === month()) return;
    set({ cbNag: month() });
    FX.toast("Новый месяц — новые категории кэшбека! Выбери в Vibe Pay", "🪙", 3500);
  }, 15000);

  /* ================= Чит-коды ================= */
  const money = (n, why) => { Vibe.game.tx(why, n, "🎮", "c-lime"); Vibe.refreshCounters(); };
  const body = (patch) => { if (!Vibe.body) return; const b = Vibe.body.get(); Vibe.state.set({ body: Object.assign({}, b, patch) }); };
  const CHEATS = {
    // The Sims
    rosebud: { src: "The Sims", run: () => { money(1000, "Чит rosebud · 1 000 симолеонов"); return "§1 000 по курсу Корпорации. Комиссия за курс — ваше чувство вины"; } },
    kaching: { src: "The Sims", run: () => { money(1000, "Чит kaching"); return "Ка-чинг! +1 000 ₫"; } },
    motherlode: { src: "The Sims", run: () => { money(50000, "Чит motherlode"); return "+50 000 ₫. Налоговая уже открыла Госвайб"; } },
    freerealestate: { src: "The Sims 4", run: () => {
      if (S().home && S().home.own) return "У тебя уже своя квартира. Жадность — не вайб";
      Vibe.game.buyHome({ title: "Квартира по читу", rent: 0, emoji: "🏡", key: "cheat-home" });
      return "Бесплатная недвижимость! Ипотека 0 ₫. Налог на имущество — всё остальное";
    } },
    "testingcheats true": { src: "The Sims", run: () => { set({ devMode: true }); return "Режим тестировщика включён. В профиле появилась перемотка времени"; } },
    "testingcheats false": { src: "The Sims", run: () => { set({ devMode: false }); return "Режим тестировщика выключен"; } },
    "bb.ignoregameplayunlocksentitlement": { src: "The Sims 4", run: () => { set({ unlockAll: true }); unlock.check(); return "Все сервисы открыты. Корпорация в шоке, но довольна"; } },
    "careers.promote": { src: "The Sims 4", run: () => {
      const j = S().job; if (!j) return "Сначала найди работу. Даже читеру";
      set({ job: Object.assign({}, j, { perf: 99 }) }); Vibe.game.completeTask && Vibe.game.tasksLeft() && Vibe.game.completeTask(1);
      return "Повышение почти в кармане. Сделай задачу — и ты начальник";
    } },
    fillmotive: { src: "The Sims 3", run: () => { body({ energy: 100, food: 100, mood: 100 }); return "Все потребности на максимум. Ты как после отпуска"; } },
    "sims.fill_all_commodities": { src: "The Sims 4", run: () => { body({ energy: 100, food: 100, mood: 100 }); return "Все потребности заполнены"; } },
    // GTA San Andreas
    hesoyam: { src: "GTA: San Andreas", run: () => { money(250000, "Чит HESOYAM"); body({ health: 100, energy: 100, food: 100, sick: false }); return "Здоровье, энергия и 250 000 ₫. Си-Джей бы одобрил"; } },
    baguvix: { src: "GTA: San Andreas", run: () => { body({ health: 100, sick: false }); return "Бессмертие (почти). Здоровье 100, болезни прошли"; } },
    aezakmi: { src: "GTA: San Andreas", run: () => {
      const gv = S().gv; if (gv && gv.fines) set({ gv: Object.assign({}, gv, { fines: gv.fines.map((f) => Object.assign({}, f, { st: "annul" })) }) });
      return "Розыск снят. Все штрафы аннулированы. Госвайб тебя больше не видит";
    } },
    rocketman: { src: "GTA: San Andreas", run: () => "Джетпак не входит в подписку «Плюс Вайб». Оформите «Плюс Вайб Ультра»" },
    // Doom
    iddqd: { src: "Doom", run: () => { body({ health: 100, mood: 100 }); return "Режим бога. Настроение 100. Аренду всё равно платить"; } },
    idkfa: { src: "Doom", run: () => { set({ vibiki: S().vibiki + 999 }); Vibe.refreshCounters(); return "Все ключи и +999 вайбиков"; } },
  };
  const cheats = (Vibe.cheats = {
    LIST: CHEATS,
    run(input) {
      const code = String(input || "").trim().toLowerCase().replace(/\s+/g, " ");
      const c = CHEATS[code];
      if (!c) {
        FX.shake(document.querySelector(".sheet") || document.body);
        return { ok: false, msg: ["Неверный код. Корпорация записала попытку", "Такого чита нет. Но кредит предодобрен", "Попробуй motherlode. Мы ничего не говорили"][Math.floor(Math.random() * 3)] };
      }
      const msg = c.run();
      set({ cheatsUsed: [...new Set([...(S().cheatsUsed || []), code])] });
      Vibe.achieve && Vibe.achieve("cheater");
      FX.confetti();
      FX.sound.levelup();
      unlock.check();
      return { ok: true, msg, src: c.src };
    },
    sheet() {
      Vibe.ui.sheet(`
        <div class="cheat-term">
          <div class="cheat-top"><span>●</span><span>●</span><span>●</span><b>vibe-console</b></div>
          <div class="cheat-log" data-log><div>&gt; Vibe OS v1.0. Введите чит-код.</div><div class="dim">&gt; Подсказка: в поп-культуре их много 😉</div></div>
          <div class="cheat-in"><span>&gt;</span><input data-cheat autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="motherlode"></div>
        </div>
        <button class="btn lime block" style="margin-top:12px" data-run>Ввести</button>
        <div class="fine">Читы делают жизнь проще, но Вайбот всё видит. Использовано: ${(S().cheatsUsed || []).length}.</div>`, {
        onMount(sh) {
          const inp = sh.querySelector("[data-cheat]");
          const log = sh.querySelector("[data-log]");
          setTimeout(() => inp.focus(), 300);
          const go = () => {
            const v = inp.value; if (!v.trim()) return;
            const r = cheats.run(v);
            log.insertAdjacentHTML("beforeend", `<div>&gt; ${Vibe.esc(v)}</div><div class="${r.ok ? "ok" : "bad"}">${r.ok ? `✔ [${r.src}] ` : "✖ "}${Vibe.esc(r.msg)}</div>`);
            log.scrollTop = log.scrollHeight;
            inp.value = "";
          };
          sh.querySelector("[data-run]").addEventListener("click", go);
          inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
        },
      });
    },
  });

  // Пасхалка: 5 тапов по логотипу Vibe — консоль; на компьютере Ctrl+Shift+C (как в The Sims)
  let taps = 0, tapT = 0;
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".home-logo, .ob-logo")) return;
    if (!S().profile) return;
    clearTimeout(tapT); taps++;
    tapT = setTimeout(() => (taps = 0), 1200);
    if (taps >= 5) { taps = 0; cheats.sheet(); }
    else if (taps >= 3) FX.toast(`Ещё ${5 - taps}…`, "🎮", 900);
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c" || e.code === "KeyC") && S().profile) { e.preventDefault(); cheats.sheet(); }
  });

  // Перемотка времени для тестировщика (testingcheats true)
  Vibe.timeSkip = function (hours) {
    const s = S();
    if (!s.game) return;
    Vibe.state.set({ game: Object.assign({}, s.game, { start: s.game.start - (hours / 24) * Vibe.game.DAY_MS }) });
    Vibe.game.tick();
    if (Vibe.body) Vibe.body.tick();
    if (Vibe.world) Vibe.world.tick();
    unlock.check();
    FX.toast(`⏩ +${hours >= 24 ? hours / 24 + " дн." : hours + " ч"} игрового времени`, "⏳");
  };

  // Периодические задачи
  setInterval(() => { if (S().profile) { unlock.check(); save.backup("auto"); } }, 6000);
  setTimeout(() => { if (S().profile) unlock.check({ silent: !!(S().unlocked || []).length }); }, 2500);
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

  const css = `
  .cheat-term { background: #0b0b10; border: var(--line); border-radius: 22px; overflow: hidden; font-family: ui-monospace, Menlo, monospace; color: #c6ff4d; box-shadow: var(--shadow); }
  .cheat-top { display: flex; gap: 6px; align-items: center; padding: 10px 12px; background: #1d1d26; color: #8b8b9a; font-size: 12px; }
  .cheat-top span:nth-child(1) { color: #ff5f57; } .cheat-top span:nth-child(2) { color: #febc2e; } .cheat-top span:nth-child(3) { color: #28c840; }
  .cheat-top b { margin-left: 8px; font-weight: 700; }
  .cheat-log { height: 180px; overflow-y: auto; padding: 12px; font-size: 13px; line-height: 1.5; }
  .cheat-log .dim { color: #6b6878; } .cheat-log .ok { color: #7cf5c8; } .cheat-log .bad { color: #ff8a8a; }
  .cheat-in { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-top: 1px solid #2a2a35; }
  .cheat-in input { flex: 1; background: none; border: 0; outline: 0; color: #fff; font: inherit; font-size: 16px; }
  .locked-tile { filter: grayscale(1); opacity: .55; }
  .cb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .cb-card { border: var(--line); border-radius: 20px; background: #fff; padding: 12px; text-align: left; display: flex; flex-direction: column; gap: 2px; box-shadow: var(--shadow-sm); transition: transform .2s var(--spring), background .2s; }
  .cb-card .emo { font-size: 28px; } .cb-card b { font-family: var(--font-display); font-weight: 400; font-size: 24px; } .cb-card small { font-size: 12px; font-weight: 800; line-height: 1.2; }
  .cb-card.on { background: var(--lime); transform: rotate(-2deg) scale(1.03); }
  .cb-card[disabled] { opacity: .85; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
