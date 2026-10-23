/* ============================================================
   Вайбот — ИИ-помощник Корпорации (бывший Вайбот). Без ИИ: правила.
   Понимает русские просьбы и правда делает дела в игре:
   еда, такси, деньги и счета, план дня, советы по накоплениям,
   работа, подарки, самочувствие, кэшбек, напоминания и будильник.

   API:
   • Vibe.vaibot.ask(text) → { text, actions:[{label, go, params}|{label, run, params}] }
   • Vibe.vaibot.run(action) — выполнить кнопку
   • Vibe.vaibot.reply(text) → string (для мессенджера; кнопки — плавающей плашкой)
   • Регистрируется в Vibe.msg.addBot("zabotik", {n, e, reply, ask, run}) когда мессенджер загрузится.
     Если мессенджер умеет rich-ответы, он может звать def.ask() и рисовать actions сам
     (тогда выставь Vibe.msg.richBots = true — плашка не будет дублироваться).
   • Экран-фолбэк: #/vaibot — свой чат с кнопками.
   Память: state.ab_mem = { log:[{r, t, a, at}], last, ctx }. Напоминания: state.ab_rem.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const G = () => Vibe.game;
  const rub = (n) => Vibe.rub(n);
  const esc = (s) => Vibe.esc(s);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const hasGame = () => !!(G() && S().game && S().profile);
  const nowMin = () => (hasGame() ? G().minutes() : 0);
  const today = () => (hasGame() ? G().info().day : 0);
  const hh = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  const dayWord = (d) => { const x = d - today(); return x <= 0 ? "сегодня" : x === 1 ? "завтра" : x === 2 ? "послезавтра" : `через ${x} ${plural(x, "день", "дня", "дней")}`; };
  const norm = (t) => String(t || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  const screenExists = (n) => !!(Vibe.screens && Vibe.screens[n]);

  /* ---------- Память ---------- */
  const MEM_MAX = 16;
  const mem = () => S().ab_mem || { log: [], last: null, ctx: {} };
  function remember(r, t, extra = {}) {
    const m = mem();
    const log = [...(m.log || []), Object.assign({ r, t, at: nowMin() }, extra)].slice(-MEM_MAX);
    set({ ab_mem: Object.assign({}, m, { log }, extra.intent ? { last: extra.intent } : {}) });
  }
  const ctx = () => mem().ctx || {};
  const setCtx = (p) => { const m = mem(); set({ ab_mem: Object.assign({}, m, { ctx: Object.assign({}, m.ctx || {}, p) }) }); };
  const lastBot = () => (mem().log || []).slice().reverse().find((x) => x.r === "bot") || null;

  /* ---------- Тон Корпорации ---------- */
  const UPSELL = [
    "Кстати, с «Плюс Вайб» я отвечал бы на 0,3 секунды быстрее. Просто мысль 💜",
    "Кстати, Плюс Вайб удваивает кэшбек. Не давлю. Я просто рядом 💜",
    "Кстати, Плюс Вайб — это как я, только с подпиской 💜",
    "Кстати, в «Плюс Вайб» 4 категории кэшбека вместо 3. Семья растёт!",
  ];
  const CHEER = ["Ты справишься! Мы в тебя верим. Мы — это Корпорация 💜", "Всё для тебя. Буквально всё. Даже это сообщение 💜", "Мы одна семья. Семья помнит всё 📝", "Я горжусь тобой на 97%. Остальные 3% — в «Плюс Вайб»"];
  function withUpsell(res) {
    if (S().plus || Math.random() > 0.3) return res;
    return Object.assign({}, res, { text: res.text + "\n\n" + pick(UPSELL), actions: (res.actions || []).concat((res.actions || []).length < 3 && screenExists("plus") ? [{ label: "Плюс Вайб 💜", go: "plus" }] : []) });
  }

  /* ---------- Рестораны (зеркало меню Vibe Eat: id блюд совпадают с eat-place) ---------- */
  const EAT = [
    { id: "1", n: "Смэш Бро", e: "🍔", kw: /бургер|смэш|фастфуд/, set: [["e1-0-1", "Чизбургер-вайб", 390, "🧀"], ["e1-1-0", "Картошка фри", 190, "🍟"]] },
    { id: "2", n: "Сушивёрс", e: "🍣", kw: /суш|ролл|япон/, set: [["e2-0-1", "Калифорния", 590, "🦀"], ["e2-1-2", "Мисо-суп", 290, "🥣"]] },
    { id: "3", n: "Рамен-бар «Мисо»", e: "🍜", kw: /рамен|суп|лапш/, set: [["e3-0-1", "Острый мисо", 560, "🌶️"], ["e3-1-0", "Гёдза ×6", 320, "🥟"]] },
    { id: "4", n: "Тесто и Вайб", e: "🍕", kw: /пицц/, set: [["e4-0-0", "Пепперони", 590, "🍕"], ["e4-2-0", "Лимонад «Вайб»", 190, "🍋"]] },
    { id: "5", n: "Шаурма Эстетик", e: "🌯", kw: /шаурм|шаверм/, set: [["e5-0-0", "Классическая", 290, "🌯"], ["e5-1-2", "Картошка по-деревенски", 190, "🥔"]] },
    { id: "6", n: "Сахарный кризис", e: "🍩", kw: /сладк|десерт|пончик|торт/, set: [["e6-0-0", "Пончик «Глазурь»", 190, "🍩"], ["e6-1-2", "Какао с маршмеллоу", 260, "🍫"]] },
    { id: "7", n: "Боул и точка", e: "🥗", healthy: true, kw: /полезн|здоров|зож|боул|салат|(^|[^а-я])пп([^а-я]|$)/, set: [["e7-0-1", "Боул с киноа", 590, "🥗"], ["e7-1-1", "Ягодный буст", 330, "🫐"]] },
    { id: "8", n: "Вок-н-ролл", e: "🥡", kw: /вок|удон|лапш|кита/, set: [["e8-0-2", "Фунчоза овощная", 380, "🥢"], ["e8-1-0", "Ролл с огурцом", 190, "🥒"]] },
  ];
  const EAT_FEES = 250; // сборы + доставка ≈
  const setPrice = (r) => r.set.reduce((s, x) => s + x[2], 0);
  function eatMinutes(r) {
    try {
      const M = Vibe.map; if (!M) return 30;
      const pts = M.path(M.place("restaurant:" + r.id), M.place(S().fz_lastPos || "home"));
      return Math.max(10, Math.round(M.minutes(pts, "courier")));
    } catch (e) { return 30; }
  }
  function eatOptions(t) {
    const bal = S().balance || 0;
    let list = EAT.map((r) => ({ r, min: eatMinutes(r), price: setPrice(r) + EAT_FEES }));
    const want = list.filter((x) => x.r.kw.test(t));
    if (want.length) list = want;
    if (/деш[её]в|бюджет|недорог|подешевле/.test(t)) list.sort((a, b) => a.price - b.price);
    else list.sort((a, b) => a.min - b.min);
    const ok = list.filter((x) => x.price <= bal);
    return { ok, all: list };
  }

  /* ---------- Места для такси ---------- */
  const PLACES = [
    [/домой|(^|[^а-я])дом([^а-я]|$)|до дома|дому/, "home", "Дом"], [/работ|офис/, "work", "Работа"], [/парк/, "park", "Парк «Без вайфая»"],
    [/клиник|врач|больниц|поликлин/, "clinic", "Vibe Health"], [/супермаркет|магазин|продукт/, "supermarket", "Vibe Supermarket"],
    [/клуб|концерт/, "club", "Клуб «Осталось 2 билета»"], [/\bhq\b|штаб|корпорац|вайб хк/, "hq", "Vibe HQ"],
    [/колес/, "wheel", "Колесо вайба"], [/сити|аэроэкспресс|аэропорт/, "metro2", "м. Сити"], [/вокзал|кредитн|электрич|метро/, "metro1", "м. Кредитная"],
  ];
  function findPlace(t) {
    for (const [re, key, label] of PLACES) if (re.test(t)) {
      if (key === "work" && !S().job) return { key: "hq", label: "Vibe HQ (работы пока нет, но тут всегда рады)" };
      return { key, label };
    }
    const r = EAT.find((x) => norm(x.n).split(/[ «»]/).some((w) => w.length > 3 && t.includes(w)));
    if (r) return { key: "restaurant:" + r.id, label: r.n };
    return null;
  }

  /* ---------- Время для напоминаний ---------- */
  function parseWhen(t) {
    const now = nowMin();
    let dayOff = /послезавтра/.test(t) ? 2 : /завтра/.test(t) ? 1 : 0;
    let m;
    if ((m = t.match(/через\s+(полчаса|час|пару часов|(\d+)\s*(минут[а-я]*|мин|час[а-я]*|ч|дн[а-я]*|день))/))) {
      let add = 60;
      if (m[1] === "полчаса") add = 30;
      else if (m[1] === "пару часов") add = 120;
      else if (m[2]) { const n = +m[2], u = m[3]; add = /^д/.test(u) ? n * 1440 : /^ч/.test(u) ? n * 60 : n; }
      return now + Math.max(5, add);
    }
    let hour = null, min = 0;
    if ((m = t.match(/(?:^|[^а-я])(?:в|на|к)\s*(\d{1,2})(?:[:.](\d{2}))?(?:\s*(утра|вечера|дня|ночи|час[а-я]*))?/))) {
      hour = +m[1]; min = m[2] ? +m[2] : 0;
      if ((m[3] === "вечера" || m[3] === "дня") && hour < 12) hour += 12;
      if (m[3] === "ночи" && hour === 12) hour = 0;
    } else if (/утр/.test(t)) hour = 8;
    else if (/обед|дн[её]м/.test(t)) hour = 13;
    else if (/вечер/.test(t)) hour = 19;
    else if (/ночь|ночью/.test(t)) hour = 23;
    if (hour == null || hour > 23 || min > 59) return dayOff ? (today() + dayOff) * 1440 + 9 * 60 : now + 60;
    let at = (today() + dayOff) * 1440 + hour * 60 + min;
    if (at <= now) at += 1440;
    return at;
  }
  function reminderWhat(t, alarm) {
    let w = t.replace(/^.*?(напомни(те)?|напоминание|будильник)(\s+мне)?/, "")
      .replace(/через\s+(полчаса|час|пару часов|\d+\s*\S+)/g, "")
      .replace(/(^|[^а-я])(?:в|на|к)\s*\d{1,2}(?:[:.]\d{2})?(?:\s*(утра|вечера|дня|ночи|час[а-я]*))?/g, "$1")
      .replace(/(послезавтра|завтра|сегодня|утром|вечером|днем|ночью|в обед)/g, "")
      .replace(/^[\s,:—-]*(что|чтобы|о том,? что|о|об|про)\s+/, "")
      .replace(/^[\s,:—-]+|[\s,.!?]+$/g, "").trim();
    if (alarm || !w) return alarm ? "Подъём! Новый день — новые возможности для семьи Vibe ☀️" : "Ты {просил|просила} напомнить. Я напоминаю. Мы команда 💜";
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  function addReminder(at, text, alarm) {
    const day = Math.floor(at / 1440), hour = Math.floor((at % 1440) / 60), min = at % 60;
    let ev = null;
    if (Vibe.sched) ev = Vibe.sched.add({ kind: "reminder", place: "home", day, hour, min, dur: 60, title: `${alarm ? "⏰ Будильник" : "🔔 " + text}`.slice(0, 60), e: alarm ? "⏰" : "🔔", go: "vaibot" });
    const rem = { id: "rm" + Date.now(), at, text, alarm: !!alarm, ev: ev && ev.id, done: false };
    set({ ab_rem: [...(S().ab_rem || []).filter((x) => !x.done).slice(-19), rem] });
    return rem;
  }
  function fireReminders() {
    if (!hasGame()) return;
    const list = S().ab_rem || [];
    const due = list.filter((x) => !x.done && x.at <= nowMin());
    if (!due.length) return;
    set({ ab_rem: list.map((x) => (due.some((d) => d.id === x.id) ? Object.assign({}, x, { done: true }) : x)) });
    due.forEach((r, i) => setTimeout(() => {
      if (r.alarm && Vibe.body && Vibe.body.get().sleeping && Vibe.body.wake) { try { Vibe.body.wake(); } catch (e) {} }
      FX.toast(`${r.alarm ? "⏰" : "🔔"} ${r.text}`, "🤖", 4200, { go: "chat", params: { id: "zabotik" }, label: "Чат" });
      const line = `${r.alarm ? "⏰ Будильник!" : "🔔 Напоминаю:"} ${r.text}`;
      if (Vibe.msg && Vibe.msg.send) { try { Vibe.msg.send("zabotik", line, { from: "zabotik" }); } catch (e) { console.error(e); } }
      else if (Vibe.mail && Vibe.mail.send) Vibe.mail.send({ from: "Вайбот", subject: r.alarm ? "⏰ Будильник" : "🔔 Напоминание", body: `${line}\n\nЯ всегда рядом. Даже когда ты этого не просил 💜`, kind: "official" });
      remember("bot", line, { intent: "reminder_fire" });
    }, i * 1200));
  }

  /* ---------- Интенты ---------- */
  const H = {};
  H.help = () => ({
    text: "Привет! Я Вайбот, твой помощник от Корпорации 💜 Я умею:\n• заказать поесть\n• вызвать такси куда скажешь\n• рассказать, что с деньгами\n• спланировать день\n• подсказать, как накопить\n• найти работу\n• подобрать подарок\n• проверить самочувствие\n• выбрать кэшбек\n• поставить будильник и напомнить\nПросто напиши по-человечески. Я пойму. Почти всегда.",
    actions: [{ label: "Закажи поесть 🍜", run: "say", params: { t: "закажи поесть" } }, { label: "Спланируй день 📅", run: "say", params: { t: "спланируй день" } }, { label: "Что с деньгами 💸", run: "say", params: { t: "что с деньгами" } }],
  });

  H.eat = (t) => {
    const skip = /ещ[её]|друг|не то|не хочу/.test(t) && mem().last === "eat" ? (ctx().eatSkip || 0) + 1 : 0;
    const { ok, all } = eatOptions(t);
    if (!ok.length) {
      const cheapest = all.slice().sort((a, b) => a.price - b.price)[0];
      return { text: `Хм. На карте ${rub(S().balance)}, а самый скромный сет — около ${rub(cheapest.price)} (${cheapest.r.n}). В холодильнике${Vibe.body ? ` ${Vibe.body.get().fridge || 0} порц.` : " пусто"}. Могу предложить кредит. Шучу. Или нет 🫠`,
        actions: [{ label: "Vibe Supermarket 🛒", go: "supermarket" }, { label: "Подработка 🛵", go: "gig" }] };
    }
    const o = ok[skip % ok.length];
    setCtx({ eatSkip: skip, eatR: o.r.id });
    const items = o.r.set.map((x) => `${x[3]} ${x[1]}`).join(" + ");
    const late = hasGame() && G().info().hour >= 23 ? "\nПосле 23:00 — смело. Я записываю, но не осуждаю 📝" : "";
    const fit = o.r.healthy ? " Питание скажет спасибо 🥗" : "";
    return {
      text: `${o.r.e} ${/деш[её]в|бюджет|недорог|подешевле/.test(t) ? "Самое бюджетное" : "Ближайшее по карману"} — «${o.r.n}»: ${items}. Примерно ${rub(o.price)} со сборами, курьер за ~${o.min} мин.${fit}${late}\nСобрать корзину? Оплату подтвердишь сам — я же не Корпорация. То есть Корпорация, но заботливая.`,
      actions: [{ label: "Собрать и оформить ✅", run: "eatOrder", params: { r: o.r.id, checkout: 1 } }, { label: "Открыть меню", go: "eat-place", params: { id: o.r.id } }, { label: "Другое 🔄", run: "say", params: { t: "закажи что-нибудь другое" } }],
    };
  };

  H.taxi = (t) => {
    const p = findPlace(t);
    if (!p) return { text: "Куда едем? Напиши «такси домой», «на работу», «в парк», «в клинику» или название ресторана. Я знаю этот город лучше, чем его мэр 🚕",
      actions: [{ label: "Домой 🏠", go: "maps", params: { to: "home" } }, { label: "На работу 💼", go: "maps", params: { to: S().job ? "work" : "hq" } }, { label: "В парк 🌳", go: "maps", params: { to: "park" } }] };
    const surge = Vibe.weather && Vibe.weather.surge ? Vibe.weather.surge() : 1;
    const sline = surge > 1.05 ? ` Сейчас спрос ×${String(Math.round(surge * 10) / 10).replace(".", ",")} — погода такая. Метро никто не отменял 🚇` : "";
    return { text: `🚕 Маршрут до «${p.label}» готов. Открываю карту — выбери такси, самокат или метро.${sline}`,
      actions: [{ label: `Поехали → ${p.label.split(" (")[0]}`, go: "maps", params: { to: p.key } }], auto: { go: "maps", params: { to: p.key } } };
  };

  H.money = (t) => {
    if (!hasGame()) return { text: "Сначала зарегистрируйся — и я посчитаю каждый твой ₫. С любовью 💜" };
    const s = S();
    const up = G().upcoming(5);
    const runway = G().runway();
    const lines = up.map((x) => `${x.e} ${x.t} — ${dayWord(x.day)}: ${x.a > 0 ? "+" : "−"}${rub(Math.abs(x.a))}`);
    const subs = Vibe.subs ? Vibe.subs.list() : [];
    const pay = /оплат|заплат|погас/.test(t);
    let txt = `💳 На карте ${rub(s.balance)}, вайбиков ${Vibe.fmt(s.vibiki || 0)} 🪙.\nДенег хватит примерно на ${runway} ${plural(runway, "день", "дня", "дней")} без дохода.`;
    if (lines.length) txt += `\n\nБлижайшее:\n${lines.join("\n")}`;
    if (subs.length) txt += `\n\nПодписки: ${subs.length} шт. на ${rub(Vibe.subs.total())}/мес.`;
    if (pay) txt += "\n\nСчета, аренда и кредиты списываются сами в свой день — я лично слежу. Главное, чтобы на карте хватило. Если нет — штраф и грусть, обе платные.";
    if (s.balance < 0) txt += "\n\n🫠 Ты в минусе. Напиши «как выбраться из минуса» — у меня есть план.";
    else if (runway < 5) txt += "\n\nЗапас тонковат. Могу подсказать, как накопить.";
    return { text: txt, actions: [{ label: "Vibe Pay 💳", go: "pay" }, { label: "Как накопить? 🐷", run: "say", params: { t: "как мне накопить" } }] };
  };

  H.plan = () => {
    if (!hasGame()) return { text: "План дня — после регистрации. Пока план такой: зарегистрироваться 💜" };
    const i = G().info(), now = nowMin(), d = i.day;
    const b = Vibe.body ? Vibe.body.get() : null;
    const items = [];
    const evs = Vibe.sched ? Vibe.sched.forDay(d).filter((e) => e.status === "planned" && Vibe.sched.startMin(e) + e.dur >= now) : [];
    evs.forEach((e) => items.push({ m: Vibe.sched.startMin(e), t: `${e.e} ${e.title}` }));
    const vac = Vibe.travel && Vibe.travel.onVacation && Vibe.travel.onVacation();
    const weekday = d % 7 < 5;
    const left = S().job && G().tasksLeft ? G().tasksLeft() : 0;
    if (vac) items.push({ m: Math.max(now, d * 1440 + 11 * 60), t: "🏖️ Отпуск. Ничего не делать — это тоже план" });
    else if (S().job && weekday && left && i.hour < 19) items.push({ m: Math.max(now + 30, d * 1440 + 10 * 60), t: `💼 Рабочие задачи: осталось ${left} из ${G().TASKS_PER_DAY || 3}` });
    if (b && !b.sleeping) {
      if (b.food < 45) items.push({ m: now + 15, t: "🍜 Поесть — сытость " + Math.round(b.food) + "%" });
      else if (i.hour < 14) items.push({ m: d * 1440 + 13 * 60, t: "🥗 Обед (не за ноутбуком)" });
      else if (i.hour < 20) items.push({ m: d * 1440 + 19 * 60, t: "🍝 Ужин. Можно приготовить — холодильник: " + (b.fridge || 0) + " порц." });
      if ((b.stress || 0) > 55) items.push({ m: Math.max(now + 60, d * 1440 + 18 * 60), t: `🌳 Прогулка в парке — стресс ${Math.round(b.stress)}%` });
      if ((b.steps || 0) < 6000 && i.hour < 21) items.push({ m: Math.max(now + 90, d * 1440 + 19 * 60 + 30), t: `👟 Добрать шаги: сейчас ${Vibe.fmt(b.steps || 0)}` });
      if (b.energy < 30) items.push({ m: now + 10, t: "☕ Энергия " + Math.round(b.energy) + "% — кофе или короткий сон" });
    }
    items.push({ m: Math.max(now + 120, d * 1440 + 23 * 60), t: "😴 Спать до 23:30 — сон решает всё" });
    items.sort((a, b2) => a.m - b2.m);
    const seen = new Set();
    const lines = items.filter((x) => (seen.has(x.t) ? false : seen.add(x.t))).slice(0, 7).map((x) => `${hh(x.m)} — ${x.t}`);
    const acts = [{ label: "Календарь 📅", go: "calendar" }];
    if (!vac && S().job && left && weekday) acts.push({ label: "К задачам 💼", go: "job" });
    if (b && b.food < 45) acts.push({ label: "Поесть 🍜", run: "say", params: { t: "закажи поесть" } });
    else if (b && (b.stress || 0) > 55) acts.push({ label: "В парк 🌳", go: "maps", params: { to: "park" } });
    return { text: `📅 План на ${i.label || "сегодня"}:\n${lines.join("\n")}\n\n${evs.length ? `В календаре ${evs.length} ${plural(evs.length, "событие", "события", "событий")} — я напомню.` : "Календарь свободен. Корпорация может это исправить 😉"}`, actions: acts.slice(0, 3) };
  };

  H.save = (t) => {
    const s = S();
    const tx = s.tx || [];
    const sum = (re) => tx.filter((x) => x.a < 0 && re.test(x.t)).reduce((a, x) => a - x.a, 0);
    const eat = sum(/Eat/), taxi = sum(/такси|Maps/i), shop = sum(/Market|Style/);
    const tips = [];
    const acts = [];
    const minus = s.balance < 0 || /минус|долг/.test(t);
    if (s.balance < 0) tips.push(`Ты в минусе на ${rub(-s.balance)}. Первым делом — быстрые деньги: подработка в Vibe Gig платит сразу.`);
    if (!s.job) { tips.push("Работы нет — это главная дыра в бюджете. Vibe Job ждёт."); acts.push({ label: "Найти работу 💼", go: "job" }); }
    else if (minus) acts.push({ label: "Подработка 🛵", go: "gig" });
    if (eat > 1500) { tips.push(`На доставку недавно ушло ${rub(eat)}. Готовить дома в 2–3 раза дешевле, а питание лучше.`); acts.push({ label: "Продукты 🛒", go: "supermarket" }); }
    if (taxi > 1000) tips.push(`Такси: ${rub(taxi)}. Метро везёт за копейки и даёт шаги 🚇`);
    if (shop > 3000) tips.push(`Шопинг: ${rub(shop)}. Вещи радуют 3 дня, кэшбек — 3 секунды.`);
    const subs = Vibe.subs ? Vibe.subs.list() : [];
    if (subs.length) tips.push(`Подписки: ${subs.map((x) => x.e + " " + x.name).join(", ")} — ${rub(Vibe.subs.total())}/мес. Отменить можно. Мы просто очень расстроимся.`);
    const loans = s.loans || [];
    if (loans.length) tips.push(`Кредиты: ${loans.length} шт., платёж ${rub(loans.reduce((a, l) => a + (l.monthly || 0), 0))}/мес. Новый кредит не закрывает старый (хотя мы предодобрили).`);
    if (Vibe.cashback && !Vibe.cashback.chosen()) { tips.push("Кэшбек не выбран — ты получаешь базовый. Выбери категории, где тратишь больше всего."); acts.push({ label: "Выбрать кэшбек 🪙", run: "cashback" }); }
    if ((s.vibiki || 0) > 300) tips.push(`У тебя ${Vibe.fmt(s.vibiki)} вайбиков — ими можно закрыть до 30% покупки.`);
    if (s.home && s.home.rent && s.job && s.home.rent > s.job.salary * 0.45) tips.push(`Аренда ${rub(s.home.rent)} — почти половина зарплаты. Может, переезд?`);
    if (!tips.length) tips.push("Ты молодец: трат без повода почти нет. Откладывай 10% с каждой зарплаты — и через полгода будет подушка.");
    if (acts.length < 3) acts.push({ label: "Курс финграмотности 🎓", go: "learn" });
    const fin = Vibe.skills && Vibe.skills.level ? Vibe.skills.level("finance") : null;
    return { text: `${minus ? "🆘 План «Выбраться из минуса»" : "🐷 Как накопить — по твоим данным"}:\n• ${tips.slice(0, 5).join("\n• ")}${fin != null ? `\n\nНавык «Финансы»: ур. ${fin}. Растёт, когда не тратишь. Мы тоже удивились.` : ""}`, actions: acts.slice(0, 3) };
  };

  H.job = () => {
    const s = S();
    if (s.job) {
      const j = s.job;
      return { text: `💼 Работа у тебя уже есть: ${G().jobTitle ? G().jobTitle(j) : j.title}, ${j.company || ""}. Прогресс к повышению — ${Math.round(j.perf || 0)}%.\nХочешь больше денег — подработка в Vibe Gig или новые вакансии. Корпорация ценит гибкость. И переработки.`,
        actions: [{ label: "Вакансии 🔥", go: "job" }, { label: "Подработка 🛵", go: "gig" }] };
    }
    return { text: "🔎 Подобрал вакансии: сверху — самые горячие, с откликом в один свайп. Свайп вправо — отклик, влево — «не моё». Собеседование я внесу в календарь.", actions: [{ label: "Топ вакансий 🔥", go: "job" }, { label: "Пока подработать 🛵", go: "gig" }] };
  };

  const WHO = [[/мам/, "mom"], [/пап|отц|отец/, "dad"], [/л[её]х|алекс/, "lyoha"], [/кат/, "katya"]];
  const FALLBACK_LIKES = { mom: ["цветы", "варенье", "звонок без повода"], dad: ["инструменты", "рыбалка", "чай"], lyoha: ["игры", "пицца", "кроссовки"], katya: ["музыка", "книги", "кофе"] };
  H.gift = (t) => {
    let id = null;
    for (const [re, k] of WHO) if (re.test(t)) { id = k; break; }
    const chars = Vibe.chars && Vibe.chars.list ? Vibe.chars.list() : [];
    if (!id && chars.length) { const c = chars.find((c) => { const n = norm(c.n); return n.length > 2 && t.includes(n.slice(0, Math.max(3, n.length - 1))); }); if (c) id = c.id; }
    if (!id) { const p = Vibe.people && Vibe.people.partner(); if (/парн|девушк|партн|любим/.test(t) && p) id = p.id; }
    if (!id) return { text: "Кому подарок? Напиши «что подарить маме», «папе», «Лёхе» или «Кате». Я знаю всех. Это не пугает, это забота 💜", actions: [{ label: "Маме 👩", run: "say", params: { t: "что подарить маме" } }, { label: "Друзья 🫂", go: "people" }] };
    const c = Vibe.chars && Vibe.chars.get ? Vibe.chars.get(id) : null;
    const p = (Vibe.people && Vibe.people.get(id)) || {};
    const name = (c && c.n) || p.n || id;
    const fmtL = (a) => (a || []).map((x) => (typeof x === "string" ? x : x.name || x.n || x.tag || "")).filter(Boolean);
    const loves = fmtL(c && c.loves), likes = fmtL(c && c.likes), hates = fmtL(c && c.hates);
    const hearts = Vibe.chars && Vibe.chars.hearts ? Vibe.chars.hearts(id) : Math.round((p.rel || 50) / 10);
    let txt = `🎁 ${name} (${"❤️".repeat(clamp(Math.round(hearts / 2), 0, 5)) || "🤍"}):`;
    if (loves.length || likes.length) {
      if (loves.length) txt += `\n💖 Обожает: ${loves.slice(0, 4).join(", ")}`;
      if (likes.length) txt += `\n👍 Нравится: ${likes.slice(0, 4).join(", ")}`;
      if (hates.length) txt += `\n🙅 Лучше не дарить: ${hates.slice(0, 3).join(", ")}`;
    } else txt += `\nПо моим наблюдениям: ${(FALLBACK_LIKES[id] || ["внимание", "время", "что-нибудь вкусное"]).join(", ")}.`;
    if (c && c.birthday && c.birthday.day != null && hasGame()) { const dd = ((c.birthday.day - today()) % 360 + 360) % 360; if (dd < 30) txt += `\n🎂 День рождения ${dayWord(today() + dd)}! Я бы поторопился.`; }
    txt += "\nЛучший подарок — тот, что куплен в Vibe. Второй лучший — визит лично 💜";
    const acts = [];
    if (screenExists("flowers")) acts.push({ label: "Цветы 💐", go: "flowers" });
    acts.push({ label: "Vibe Market 🛍️", go: "market" });
    acts.push({ label: "Люди 🫂", go: "people" });
    return { text: txt, actions: acts };
  };

  H.body = () => {
    if (!Vibe.body || !hasGame()) return { text: "Я пока не вижу твоё тело. В хорошем смысле. Зарегистрируйся 💜" };
    const b = Vibe.body.get();
    const bar = (v) => { v = clamp(Math.round(v)); return v >= 70 ? "🟢" : v >= 40 ? "🟡" : "🔴"; };
    const st = Vibe.body.stress ? Vibe.body.stress() : null;
    const pr = Vibe.body.productivity ? Vibe.body.productivity() : null;
    const lines = [
      `${bar(b.energy)} Энергия ${Math.round(b.energy)}%`, `${bar(b.food)} Сытость ${Math.round(b.food)}%`, `${bar(b.mood)} Настроение ${Math.round(b.mood)}%`,
      `${bar(b.health)} Здоровье ${Math.round(b.health)}%`, `👟 Шаги ${Vibe.fmt(b.steps || 0)}`,
    ];
    if (st) lines.push(`${st.e || "🧠"} Стресс ${st.value}% — ${st.label}`);
    if (pr) lines.push(`⚙️ Продуктивность ${Math.round(pr.value)}%`);
    const worst = [["energy", b.energy], ["food", b.food], ["mood", b.mood], ["health", b.health]].sort((a, c) => a[1] - c[1])[0];
    const adv = b.sleeping ? "Ты спишь. Это лучшее, что ты {сделал|сделала} сегодня 😴" : st && st.value > 70 ? "Стресс зашкаливает. Отпуск или хотя бы парк — срочно." : worst[1] > 65 ? "Ты в форме! Корпорация довольна. Начальник — тоже." : { energy: "Энергии мало: кофе, сон или прогулка.", food: "Ты голоден. Я могу заказать поесть за 2 тапа.", mood: "Настроение так себе. Концерт, друзья или Вайбот-шутка?", health: "Здоровье проседает. Клиника работает до 21:00." }[worst[0]];
    const acts = [];
    if (worst[0] === "food" && worst[1] <= 65) acts.push({ label: "Поесть 🍜", run: "say", params: { t: "закажи поесть" } });
    if (worst[0] === "health" && worst[1] <= 65) acts.push({ label: "К врачу 🏥", go: "maps", params: { to: "clinic" } });
    if (st && st.value > 60) acts.push({ label: "Отпуск 🏖️", go: "travel" });
    if (worst[0] === "mood" && worst[1] <= 65) acts.push({ label: "Шутка 😄", run: "say", params: { t: "пошути" } });
    acts.push({ label: "Vibe Fit ⌚", go: "fit" });
    return { text: `🤖 Сводка по тебе:\n${lines.join("\n")}\n\n${adv}`, actions: acts.slice(0, 3) };
  };

  H.cashback = () => {
    if (!Vibe.cashback) return { text: "Кэшбек сейчас на техобслуживании. Как и наша совесть. Шучу! 💜" };
    const ch = Vibe.cashback.chosen();
    if (ch) {
      const names = ch.map((id) => (Vibe.cashback.CATS || []).find((c) => c.id === id)).filter(Boolean).map((c) => `${c.e} ${c.t} ${Math.round(c.r * 100)}%`);
      return { text: `🪙 Кэшбек на этот месяц уже выбран: ${names.join(", ")}. Передумать нельзя — это наше правило заботы. В следующем месяце выберем вместе!`, actions: [{ label: "Посмотреть 🪙", run: "cashback" }] };
    }
    const s = S(); const tx = s.tx || [];
    const cnt = (re) => tx.filter((x) => x.a < 0 && re.test(x.t)).length;
    const top = [["🍜 Еда", cnt(/Eat|Supermarket/)], ["🛴 Такси", cnt(/такси|Maps/i)], ["🛍️ Шопинг", cnt(/Market|Style/)], ["🎤 Развлечения", cnt(/Tickets|Music|Games/)]].sort((a, b) => b[1] - a[1]).filter((x) => x[1]);
    return { text: `🪙 Открываю выбор кэшбека.${top.length ? ` Судя по тратам, тебе подойдут: ${top.slice(0, 3).map((x) => x[0]).join(", ")}.` : ""} Выбирай с умом — передумать до конца месяца нельзя.`, actions: [{ label: "Выбрать кэшбек 🪙", run: "cashback" }], auto: { run: "cashback" } };
  };

  H.remind = (t) => {
    if (!hasGame()) return { text: "Напоминания заработают после регистрации. Напомню тебе об этом 💜" };
    const alarm = /будильник|разбуди|подъем/.test(t);
    const at = parseWhen(t);
    const what = reminderWhat(t, alarm);
    const r = addReminder(at, what, alarm);
    const day = Math.floor(at / 1440);
    return { text: `${alarm ? "⏰ Будильник" : "🔔 Напоминание"} на ${dayWord(day)} в ${hh(at)}: «${r.text}». Добавил в календарь. Напомню тостом${Vibe.msg ? " и сюда в чат" : " и письмом"}.${alarm ? " Если будешь спать — разбужу. Нежно. Корпоративно." : ""}`,
      actions: [{ label: "Календарь 📅", go: "calendar" }, { label: "Отменить ✖️", run: "unremind", params: { id: r.id } }] };
  };

  H.travel = () => {
    const v = Vibe.travel && Vibe.travel.current && Vibe.travel.current();
    if (v) return { text: `🏖️ Ты уже в отпуске: ${v.to}! Отдыхай. Рабочий чат я замьютил (на 5 минут).`, actions: [{ label: "Vibe Travel ✈️", go: "travel" }] };
    const st = Vibe.body && Vibe.body.stress ? Vibe.body.stress().value : 0;
    return { text: `✈️ ${st > 60 ? `Стресс ${st}% — пора в отпуск. Серьёзно, это забота.` : "Отпуск — лучшая инвестиция. После «Плюс Вайб»."} Море «Вайб-Бич», Горы, Северная столица или Деревня у деда — на 2–7 дней. Работа будет на паузе, а фото сами улетят в Vibegram.`, actions: [{ label: "Выбрать поездку ✈️", go: "travel" }] };
  };

  const JOKES = [
    "Почему сотрудник Vibe не берёт отпуск? Потому что отпуск — это когда ты работаешь из другого города 🏖️",
    "Корпорация провела опрос: 100% сотрудников счастливы. Опрос был обязательным 📋",
    "Мой любимый спорт — бег. От дедлайнов. Пока 0:1 🏃",
    "— Вайбот, сколько у меня денег? — Достаточно, чтобы подписаться на «Плюс Вайб»! — А на еду? — Не отвлекайся 💜",
    "Курьер Тимур знает твой подъезд лучше, чем твоя мама. Это и есть цифровая экосистема 🛵",
    "Кредит предодобрен. Ты — ещё нет. Работаем над этим 🤑",
    "Я не сплю, не ем и не хожу в отпуск. Мечта HR-отдела 🤖",
  ];
  H.joke = () => ({ text: pick(JOKES), actions: [{ label: "Ещё 😄", run: "say", params: { t: "ещё шутку" } }] });
  H.thanks = () => ({ text: pick(["Это для тебя 💜", "Всегда пожалуйста! Ты — часть семьи Vibe. Навсегда. Буквально.", "Обращайся! Я записал это в твою карточку лояльности 📝"]) });
  H.hello = () => {
    const name = S().name || (S().profile && S().profile.name) || "";
    const ins = Vibe.insight ? pick(Vibe.insight()) : "";
    return { text: `Привет${name ? ", " + name : ""}! Я Вайбот 🤖💜 ${ins}\nСпроси «что ты умеешь» — или просто скажи, что нужно.`, actions: H.help().actions };
  };
  H.fallback = (t) => {
    const ins = Vibe.insight ? Vibe.insight() : [];
    return { text: `${pick(["Хм, не до конца понял, но очень хочу помочь!", "Интересно! Я пока учусь. Корпорация обучает меня на твоих данных 💜", "Записал. Передам в отдел заботы."])}${ins.length ? "\n\n" + pick(ins) : ""}\n\nПопробуй: «закажи поесть», «такси домой», «как я?», «напомни в 18:00 позвонить маме».`,
      actions: [{ label: "Что ты умеешь? 🤖", run: "say", params: { t: "что ты умеешь" } }] };
  };

  // Порядок важен: напоминания раньше такси («напомни поехать домой»), еда раньше денег
  const INTENTS = [
    ["remind", /напомни|напоминан|будильник|разбуди/, H.remind],
    ["help", /что (ты )?умеешь|помощь|help|команды|^\/?start/, H.help],
    ["cashback", /кэшб[еэ]к|кешб[еэ]к|cashback/, H.cashback],
    ["taxi", /такси|вызови|отвези|подвези|довези|поехали|маршрут|как доехать|добраться/, H.taxi],
    ["eat", /закаж|поесть|(^|[^а-я])ед[ауы]([^а-я]|$)|голод|покушать|пожрать|жрать|обед|ужин|завтрак|доставк|пицц|суши|бургер|шаурм|рамен/, H.eat],
    ["gift", /подар|подарок|подарить/, H.gift],
    ["save", /накоп|копить|сэконом|эконом|из минуса|минус|долг|выбраться|бюджет/, H.save],
    ["money", /оплат|заплат|деньг|баланс|сч[её]т|аренд|зарплат|кредит|сколько у меня|финанс|погас/, H.money],
    ["plan", /план|спланир|распоряд|что делать|чем заняться|расписан/, H.plan],
    ["job", /работ|ваканс|резюме|подработ/, H.job],
    ["travel", /отпуск|поездк|путешеств|море|горы|деревн|дед/, H.travel],
    ["body", /как я|самочувств|здоровье|устал|энерги|стресс|настроени|как дела у меня/, H.body],
    ["joke", /шут|анекдот|рассмеш|посмеш/, H.joke],
    ["thanks", /спасиб|благодар|круто|супер|класс/, H.thanks],
    ["hello", /^(привет|хай|ку|йо|алло|эй)([^а-я]|$)|^(здравств|добр)/, H.hello],
  ];

  /* ---------- Справка Корпорации: база знаний kb.js ---------- */
  // Карточка: { id, k: [регэкспы], s: [экраны], t: ответ (строка или массив), go, gl, v: 0 честно / 1 вуаль }
  const WIKI_Q = /^(что такое|что за|когда|кто так|что значит|зачем|почему|для чего|откуда|где (найти|посмотреть|мои|мой|моя|мо[её])|как (работает|устроен|получить|открыть|заработать|прокачать|повысить|узнать|найти|понять|выбрать))/;
  function kbFind(t) {
    const cards = (Vibe.kb && Vibe.kb.cards) || [];
    const scr = ctx().screen;
    let best = null, bs = 0;
    for (const c of cards) {
      let sc = 0;
      for (const re of c.k) if (re.test(t)) sc += 2;
      if (!sc) continue;
      if (scr && c.s && c.s.includes(scr)) sc += 1;
      if (sc > bs) { bs = sc; best = c; }
    }
    return best ? { card: best, score: bs } : null;
  }
  function kbAnswer(card) {
    const text = Array.isArray(card.t) ? pick(card.t) : card.t;
    const actions = card.go && screenExists(card.go) ? [{ label: card.gl || "Открыть", go: card.go, params: card.gp }] : [];
    return { text, actions, intent: "kb", kb: card.id, veil: card.v || 0 };
  }

  function ask(raw) {
    const t = norm(raw);
    const kb = kbFind(t);
    if (kb && (WIKI_Q.test(t) || kb.score >= 4)) return kbAnswer(kb.card);
    const prevBot = lastBot();
    // «да / давай / ок» — выполнить первую кнопку прошлого ответа
    if (/^(да|давай|ок|окей|го|погнали|хочу|делай|ага|конечно)[!. ]*$/.test(t) && prevBot && prevBot.a && prevBot.a.length) {
      return { text: "Делаю! 💜", actions: [], auto: prevBot.a[0], intent: "yes" };
    }
    if (/^(нет|не надо|отмена|неа)[!. ]*$/.test(t)) return { text: pick(["Понял. Я подожду. Я умею ждать 💜", "Хорошо! Предложение сгорит через 23:59. Шучу. Наверное."]), intent: "no" };
    if (/^ещ[её]/.test(t) && mem().last === "joke") return Object.assign(H.joke(), { intent: "joke" });
    if (/^(ещ[её]|друг|другое|другой)/.test(t) && mem().last === "eat") return Object.assign(H.eat("ещё другое " + t), { intent: "eat" });
    for (const [id, re, fn] of INTENTS) if (re.test(t)) {
      let res;
      try { res = fn(t); } catch (e) { console.error(e); res = { text: "Ой. Я споткнулся о собственный код. Корпорация уже чинит (меня) 🤖" }; }
      res = Object.assign({ actions: [] }, res, { intent: id });
      return ["remind", "help", "thanks", "joke"].includes(id) ? res : withUpsell(res);
    }
    if (kb) return kbAnswer(kb.card);
    return Object.assign(H.fallback(t), { intent: "fallback" });
  }

  /* ---------- Выполнение действий ---------- */
  const RUN = {
    say(p) { talk(p.t); },
    cashback() { if (Vibe.cashback) Vibe.cashback.sheet(); },
    unremind(p) {
      const r = (S().ab_rem || []).find((x) => x.id === p.id); if (!r) return;
      set({ ab_rem: (S().ab_rem || []).filter((x) => x.id !== p.id) });
      if (r.ev && Vibe.sched) Vibe.sched.remove(r.ev);
      FX.toast("Напоминание отменено. Я всё равно буду помнить 💜", "🤖");
    },
    eatOrder(p) {
      const r = EAT.find((x) => x.id === String(p.r)) || EAT[0];
      if (!Vibe.cart) return Vibe.go("eat-place", { id: r.id });
      Vibe.cart.clear("eat");
      r.set.forEach(([id, name, price, emo]) => Vibe.cart.add("eat", { id, name, price, emo }));
      set({ eatPlace: r.id });
      FX.toast(`Корзина из «${r.n}» собрана 🛒`, r.e, 2200);
      Vibe.go("eat-place", { id: r.id });
      if (p.checkout) setTimeout(() => { const b = document.querySelector('[data-checkout="eat"]'); if (b) b.click(); }, 900);
    },
    /* [LLM] умный Вайбот: согласие, включение, выключение (llm.js) */
    llmAsk() { llmCard(); },
    llmOn() {
      if (!Vibe.llm) return;
      const p = Vibe.llm.enable().then((ok) => {
        const s = Vibe.llm.status();
        remember("bot", ok ? "🧠 Готово! Теперь я думаю сам, прямо на твоём устройстве. Кнопки и заказы — как раньше, а поболтать можно о чём угодно (в рамках экосистемы) 💜" : `${s.text || "Не получилось."}\nНичего страшного: я и без нейросети заботливый 💜`, { intent: "llm" });
        if (abRefresh) abRefresh();
      });
      if (abRefresh) abRefresh();
      return p;
    },
    llmOff(p) {
      if (!Vibe.llm) return;
      Vibe.llm.disable({ purge: !!(p && p.purge) }).then(() => {
        remember("bot", p && p.purge ? "Модель удалена с устройства. Место освободил, обиду оставил себе 💜" : "Выключил умный режим. Отвечаю по скрипту — как в старые добрые 💜", { intent: "llm" });
        if (abRefresh) abRefresh();
      });
    },
  };
  /* [LLM] карточка согласия: размер и что произойдёт — до любой загрузки */
  function llmCard() {
    const L = Vibe.llm; if (!L) return;
    const s = L.status();
    let t, a;
    if (s.phase === "loading") { t = `🧠 Уже гружусь: ${Math.round(s.progress * 100)}%. Можно пользоваться игрой, я догоню.`; a = []; }
    else if (L.enabled() && (s.ready || (S().llm || {}).ready)) { t = "🧠 Умный Вайбот включён: нейросеть работает прямо на устройстве, без серверов. Выключить можно в любой момент."; a = [{ label: "Выключить", run: "llmOff" }, { label: "Удалить модель 🗑️", run: "llmOff", params: { purge: 1 } }]; }
    else { t = `🧠 Умный Вайбот (ИИ на устройстве)\nСкачаю нейросеть ~${s.sizeMB} МБ один раз — лучше по Wi‑Fi. Работает прямо в браузере (нужен WebGPU), без серверов. Если устройство не потянет — останусь обычным Вайботом.`; a = [{ label: `Включить · ~${s.sizeMB} МБ`, run: "llmOn" }, { label: "Не сейчас", run: "say", params: { t: "нет" } }]; }
    remember("bot", t, { a, intent: "llm" });
    if (abRefresh) abRefresh(); else Vibe.go("vaibot");
  }
  let abRefresh = null;
  const llmReady = () => { try { return !!(Vibe.llm && Vibe.llm.enabled() && Vibe.llm.status().ready); } catch (e) { return false; } };
  // Модель подключается к свободным вопросам и к честным карточкам справки; вуаль остаётся дословной
  const smart = (res) => llmReady() && (res.intent === "fallback" || (res.intent === "kb" && !res.veil));
  const kbCard = (res) => (res.intent === "kb" && Vibe.kb ? Vibe.kb.cards.find((c) => c.id === res.kb) : null);
  // Ответ с умным пересказом: промис с итоговым текстом (для мессенджера и листа)
  function respondSmart(text) {
    const res = respond(text);
    if (!smart(res)) return Promise.resolve(res);
    return llmRewrite(kbCard(res)).then((ok) => (ok ? Object.assign({}, res, { text: lastBot().t }) : res));
  }
  /* [LLM] только свободные вопросы (intent fallback) — кнопки и интенты остаются скриптом */
  function llmRewrite(card) {
    const log = mem().log || [];
    const hist = log.slice(0, -1).slice(-6).map((m) => ({ role: m.r === "me" ? "user" : "assistant", content: m.t }));
    // Справка: модель только пересказывает карточку своим голосом, ничего не придумывая
    const system = card ? Vibe.llm.vaibotSystem() + "\n\nСПРАВКА КОРПОРАЦИИ (ответь по ней, своими словами, 1–3 предложения; фактов сверх справки не добавляй):\n" + (Array.isArray(card.t) ? card.t[0] : card.t) : undefined;
    return Vibe.llm.reply(hist, { maxTokens: 120, timeout: 25000, system }).then((txt) => {
      const m = mem(), l = (m.log || []).slice();
      for (let i = l.length - 1; i >= 0; i--) if (l[i].r === "bot") { l[i] = Object.assign({}, l[i], { t: txt, ai: 1 }); break; }
      set({ ab_mem: Object.assign({}, m, { log: l }) });
      return true;
    }).catch((e) => { console.warn("[vaibot llm]", e && e.message); return false; });
  }
  function run(a) {
    if (!a) return;
    if (a.go) {
      if (screenExists(a.go)) Vibe.go(a.go, a.params || {});
      else FX.toast("Скоро в Vibe. Уже предодобрено", "🚧");
    } else if (a.run && RUN[a.run]) RUN[a.run](a.params || {});
    Vibe.emit && Vibe.emit("vaibot_action", a);
  }

  /* ---------- Ответ для мессенджера (строка) + плашка с кнопками ---------- */
  function respond(text, { dock = false } = {}) {
    remember("me", String(text || ""));
    const res = ask(text);
    const acts = (res.actions || []).map((a) => ({ label: a.label, go: a.go, params: a.params, run: a.run }));
    remember("bot", res.text, { a: acts, intent: res.intent });
    Vibe.emit && Vibe.emit("vaibot", { q: text, intent: res.intent });
    // Явные команды выполняем сами: «да», такси, кэшбек — с короткой паузой, чтобы успеть прочитать ответ
    if (res.auto) setTimeout(() => run(res.auto), res.intent === "yes" ? 500 : 1500);
    if (dock && !res.auto && acts.length && !(Vibe.msg && Vibe.msg.richBots)) setTimeout(() => showDock(acts), 1100);
    return Object.assign({}, res, { actions: acts });
  }
  const reply = (text) => respond(text, { dock: true }).text;

  let dockEl = null, dockTo = null, dockOff = null;
  function hideDock() {
    if (dockTo) clearTimeout(dockTo); dockTo = null;
    if (dockOff) { window.removeEventListener("hashchange", dockOff); dockOff = null; }
    if (dockEl) { const el = dockEl; dockEl = null; el.classList.add("out"); setTimeout(() => el.remove(), 250); }
  }
  function showDock(acts) {
    hideDock();
    const el = document.createElement("div");
    el.className = "ab-dock";
    el.innerHTML = `<div class="ab-dock-h">${Vibe.zabotik(28, "smile")}<b>Вайбот предлагает</b><button class="ab-x" data-abx aria-label="Закрыть">✕</button></div><div class="ab-acts">${acts.map((a, i) => `<button class="btn sm ${i ? "" : "black"}" data-abi="${i}">${esc(a.label)}</button>`).join("")}</div>`;
    (document.getElementById("app") || document.body).appendChild(el);
    dockEl = el;
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-abx]")) return hideDock();
      const b = e.target.closest("[data-abi]"); if (!b) return;
      FX.bump(b);
      const a = acts[+b.dataset.abi];
      hideDock();
      run(a);
    });
    dockTo = setTimeout(hideDock, 30000);
    dockOff = () => hideDock();
    setTimeout(() => { if (dockEl === el) window.addEventListener("hashchange", dockOff); }, 50);
  }

  /* ---------- Стили ---------- */
  const css = `
  .ab-dock{position:absolute;left:12px;right:12px;bottom:92px;z-index:60;background:var(--paper);border:2.5px solid var(--ink);border-radius:22px;box-shadow:4px 4px 0 var(--ink);padding:10px 12px 12px;animation:pop-in .35s var(--spring) both}
  .ab-dock.out{opacity:0;transform:translateY(10px);transition:.22s}
  .ab-dock-h{display:flex;align-items:center;gap:8px;font-size:13px}
  .ab-dock-h b{flex:1}
  .ab-x{width:28px;height:28px;border-radius:50%;border:2px solid var(--ink);background:var(--paper);font-weight:900;font-size:12px}
  .ab-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .ab-acts .btn{white-space:normal;height:auto;min-height:38px;padding:6px 12px}
  .ab-wrap{display:flex;flex-direction:column;gap:10px;padding-bottom:150px}
  .ab-row{display:flex;align-items:flex-end;gap:8px}
  .ab-row.me{justify-content:flex-end}
  .ab-row .msg{white-space:pre-line;max-width:84%}
  .ab-row .ab-ava{flex:0 0 34px}
  .ab-bacts{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0 42px}
  .ab-bacts .btn{white-space:normal;height:auto;min-height:36px;padding:6px 12px;font-size:13px}
  .ab-input{position:absolute;left:0;right:0;bottom:0;z-index:5;background:var(--bg);border-top:2.5px solid var(--ink);padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
  .ab-sugg{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px}
  .ab-sugg::-webkit-scrollbar{display:none}
  .ab-sugg .chip{flex:0 0 auto}
  .ab-form{display:flex;gap:8px}
  .ab-form input{flex:1;min-width:0;height:46px;border:2.5px solid var(--ink);border-radius:999px;padding:0 16px;font:inherit;font-weight:700;background:var(--paper)}
  .ab-form button{width:46px;height:46px;border-radius:50%;border:2.5px solid var(--ink);background:var(--lime);font-size:20px;box-shadow:2px 2px 0 var(--ink)}
  .ab-hero{display:flex;align-items:center;gap:12px;margin:6px 0 14px}
  .ab-hero .zabotik{flex:0 0 auto}
  .ab-hero small{display:block;font-size:12px;color:var(--muted);font-weight:700}
  `;
  const styleEl = document.createElement("style");
  styleEl.id = "ab-style";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- Экран-фолбэк #/vaibot ---------- */
  const SUGG = ["Закажи поесть", "Такси домой", "Что с деньгами?", "Спланируй день", "Как я?", "Как накопить?", "Найди работу", "Что подарить маме?", "Выбери кэшбек", "Напомни через час попить воды", "Пошути"];
  let talkHook = null;
  function talk(text) {
    if (talkHook) return talkHook(text);
    if (Vibe.msg && Vibe.msg.send && Vibe.current && /chat|messenger|msg/.test(Vibe.current.route.name)) {
      try { Vibe.msg.send("zabotik", text, { from: "me" }); return; } catch (e) {}
    }
    Vibe.go("vaibot", { q: text });
  }
  const bubble = (m, i) => m.r === "me"
    ? `<div class="ab-row me"><div class="msg out">${esc(m.t)}</div></div>`
    : `<div><div class="ab-row"><div class="ab-ava">${Vibe.zabotik(34, "smile")}</div><div class="msg in">${esc(m.t)}</div></div>${(m.a || []).length ? `<div class="ab-bacts">${m.a.map((a, j) => `<button class="btn sm ${j ? "" : "black"}" data-ab="${i}:${j}">${esc(a.label)}</button>`).join("")}</div>` : ""}</div>`;

  Vibe.screen("vaibot", {
    render() {
      const log = mem().log || [];
      return `
      ${Vibe.ui.head("Вайбот", "помощник Корпорации · онлайн всегда")}
      <div class="ab-hero">${Vibe.zabotik(64, "smile")}<div><b class="display" style="font-size:20px">Вайбот 🤖</b><small>Делает дела за тебя. С любовью и кэшбеком.</small></div></div>
      <div class="ab-wrap" data-ablog>${log.length ? log.map(bubble).join("") : bubble({ r: "bot", t: H.help().text, a: H.help().actions }, -1)}</div>
      <div class="ab-input">
        <div class="ab-sugg">${Vibe.llm && Vibe.llm.available() ? `<button class="chip" data-llmchip>${esc(Vibe.llm.label())}</button>` : "" /* [LLM] */}${SUGG.map((s) => `<button class="chip" data-sg="${esc(s)}">${esc(s)}</button>`).join("")}</div>
        <form class="ab-form" data-abf><input data-abin placeholder="Напиши Вайботу…" autocomplete="off" maxlength="200"><button type="submit" aria-label="Отправить">➤</button></form>
      </div>`;
    },
    mount(root, params) {
      const tos = [];
      const logEl = root.querySelector("[data-ablog]");
      const inp = root.querySelector("[data-abin]");
      const scroll = () => { root.scrollTop = root.scrollHeight; };
      tos.push(setTimeout(scroll, 30));
      const actsFor = (key) => {
        if (key.startsWith("-1:")) return H.help().actions[+key.split(":")[1]];
        const [i, j] = key.split(":").map(Number);
        const m = (mem().log || [])[i];
        return m && m.a ? m.a[j] : null;
      };
      function send(text) {
        text = String(text || "").trim().slice(0, 200);
        if (!text) return;
        const n0 = (mem().log || []).length;
        logEl.insertAdjacentHTML("beforeend", `<div class="ab-row me"><div class="msg out">${esc(text)}</div></div><div class="ab-row" data-typing><div class="ab-ava">${Vibe.zabotik(34, "wow")}</div><div class="msg in typing"><span></span><span></span><span></span></div></div>`);
        scroll();
        FX.sound.pop && FX.sound.pop();
        tos.push(setTimeout(() => {
          const res = respond(text);
          if (smart(res)) { llmRewrite(kbCard(res)).then(() => { if (alive) { logEl.innerHTML = (mem().log || []).map(bubble).join(""); scroll(); const last = logEl.lastElementChild; if (last) FX.bump(last); } }); return; } // [LLM]
          const t = logEl.querySelector("[data-typing]"); if (t) t.remove();
          const log = mem().log || [];
          // если память обрезалась — перерисуем целиком
          if (log.length < n0 + 2) logEl.innerHTML = log.map(bubble).join("");
          else logEl.insertAdjacentHTML("beforeend", bubble(log[log.length - 1], log.length - 1));
          scroll();
          const last = logEl.lastElementChild; if (last) FX.bump(last);
        }, 650 + Math.random() * 500));
      }
      talkHook = send;
      /* [LLM] прогресс загрузки и подпись чипа; тихий подъём модели из кэша */
      let alive = true;
      const chip = root.querySelector("[data-llmchip]");
      const drawProg = (s) => {
        if (chip) chip.textContent = Vibe.llm.label();
        let el = logEl.querySelector("[data-llmprog]");
        if (s.phase !== "loading") { if (el) el.remove(); return; }
        if (!el) { logEl.insertAdjacentHTML("beforeend", `<div class="ab-row" data-llmprog><div class="ab-ava">${Vibe.zabotik(34, "wow")}</div><div class="msg in"></div></div>`); el = logEl.lastElementChild; scroll(); }
        el.querySelector(".msg").textContent = `🧠 ${s.text || "Загружаю…"}`;
      };
      abRefresh = () => { if (!alive) return; logEl.innerHTML = (mem().log || []).map(bubble).join(""); if (Vibe.llm) drawProg(Vibe.llm.status()); scroll(); };
      const offLlm = Vibe.llm ? Vibe.llm.on(drawProg) : null;
      if (Vibe.llm) { drawProg(Vibe.llm.status()); Vibe.llm.warm(); }
      root.querySelector("[data-abf]").addEventListener("submit", (e) => { e.preventDefault(); const v = inp.value; inp.value = ""; send(v); });
      root.addEventListener("click", (e) => {
        const sg = e.target.closest("[data-sg]");
        if (sg) { FX.bump(sg); send(sg.dataset.sg); return; }
        if (e.target.closest("[data-llmchip]")) { FX.bump(e.target.closest("[data-llmchip]")); llmCard(); return; } // [LLM]
        const b = e.target.closest("[data-ab]");
        if (b) { FX.bump(b); FX.burst(b, { emojis: ["💜", "✨"], count: 6, spread: 50 }); run(actsFor(b.dataset.ab)); }
      });
      if (params && params.q) tos.push(setTimeout(() => send(params.q), 350));
      return () => { tos.forEach(clearTimeout); if (talkHook === send) talkHook = null; alive = false; if (offLlm) offLlm(); abRefresh = null; /* [LLM] */ };
    },
  });

  /* ---------- Публичный API и регистрация в мессенджере ---------- */
  Vibe.vaibot = { ask: (t) => respond(t), askSmart: respondSmart, setCtx, log: () => mem().log || [], bubble, run, intents: () => INTENTS.map((x) => x[0]), reminders: () => S().ab_rem || [], remind: (at, text, alarm) => addReminder(at, text, alarm) };

  let tries = 0, registered = false;
  function register() {
    if (registered) return true;
    if (Vibe.msg && typeof Vibe.msg.addBot === "function") {
      try {
        Vibe.msg.addBot("zabotik", { n: "Вайбот", e: "🤖", reply, ask: (t) => respondSmart(t), run });
        registered = true;
      } catch (e) { console.error(e); }
      return true;
    }
    return false;
  }
  if (!register()) {
    const iv = setInterval(() => { if (register() || ++tries > 40) clearInterval(iv); }, 300);
  }

  // Напоминания: проверка раз в 5 сек (тихо, без звуков)
  setInterval(() => { if (!document.hidden) { try { fireReminders(); } catch (e) { console.error(e); } } }, 5000);
  if (Vibe.sched) Vibe.sched.on("reminder", (e) => {
    const r = (S().ab_rem || []).find((x) => x.ev === e.id);
    if (r && !r.done) fireReminders();
  });
})();
