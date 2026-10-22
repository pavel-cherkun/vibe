/* ============================================================
   Gig / Auto / Gov — подработки, машина и госуслуги.
   • gig  — Vibe Gig: курьер Vibe Eat (мини-доставка на карте),
            водитель Vibe Maps (если есть машина), фриланс-тапалка
   • auto — Vibe Auto: автокредит, ОСАГО, бензин, мойка, продажа
   • gov  — Госвайб: штрафы и электронная очередь, налоговый вычет,
            паспорт за 3 шага, калькулятор возраста и пенсии
   Состояние: gg (подработки), ga (машина), gv (госуслуги).
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const G = () => Vibe.game;
  const rub = (n) => Vibe.rub(n);
  const fmt = (n) => Vibe.fmt(n);
  const esc = (s) => Vibe.esc(s);
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const dec = (n, d = 1) => n.toFixed(d).replace(".", ",");
  const today = () => G().info().day;
  const plural = (n, a, b, c) => G().plural(n, a, b, c);
  const restagger = (el) => { if (el) [...el.children].forEach((c, i) => c.style.setProperty("--i", i)); };
  const COMMISSION = 0.25;

  function bag() {
    const tos = [], ints = [], offs = [];
    return {
      to(fn, ms) { const id = setTimeout(fn, ms); tos.push(id); return id; },
      every(fn, ms) { const id = setInterval(fn, ms); ints.push(id); return id; },
      stop(id) { clearInterval(id); clearTimeout(id); },
      on(t, ev, fn, o) { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); },
      clear() { tos.forEach(clearTimeout); ints.forEach(clearInterval); offs.forEach((f) => f()); tos.length = ints.length = offs.length = 0; },
    };
  }
  const zab = (text, mood = "smile") => `<div class="gg-zab">${Vibe.zabotik(52, mood)}<div class="gg-bub">${text}</div></div>`;
  const row = (l, r, strong) => `<div class="gg-rc${strong ? " b" : ""}"><span>${l}</span><span>${r}</span></div>`;

  // Устать: энергия и сытость
  function tire(dE, dF = 0) {
    if (!Vibe.body) return;
    const b = Vibe.body.get();
    set({ body: Object.assign({}, b, { energy: clamp(b.energy - dE), food: clamp(b.food - dF) }) });
  }

  /* ================= Состояние подработок ================= */
  const GG0 = { day: -1, orders: 0, rides: 0, fl: [], earnedDay: 0, total: 0, rating: 4.82, n: 0, pend: [] };
  function gg() {
    const g = Object.assign({}, GG0, S().gg || {});
    const d = today();
    if (g.day !== d) Object.assign(g, { day: d, orders: 0, rides: 0, fl: [], earnedDay: 0 });
    return g;
  }
  const saveGG = (patch) => set({ gg: Object.assign(gg(), patch) });
  function earn(title, amount, e, col) {
    G().tx(title, amount, e, col);
    const g = gg();
    saveGG({ earnedDay: g.earnedDay + amount, total: g.total + amount });
    Vibe.refreshCounters();
  }
  function surge() {
    const i = G().info();
    const night = i.hour >= 22 || i.hour < 6, wknd = i.day % 7 >= 5;
    return { k: night ? 1.3 : wknd ? 1.2 : 1, label: night ? "Ночной тариф ×1,3" : wknd ? "Выходные: спрос ×1,2" : "" };
  }

  // Отложенные выплаты (фриланс, вычет) — приходят в свой игровой день
  function addPending(p) { const g = gg(); saveGG({ pend: [...g.pend, Object.assign({ id: "p" + Date.now() + rnd(0, 99) }, p)] }); }
  function settle() {
    if (!S().profile || !S().game) return;
    const g = gg(), d = today();
    const due = g.pend.filter((p) => p.due <= d);
    if (!due.length) return;
    saveGG({ pend: g.pend.filter((p) => p.due > d) });
    due.forEach((p, i) => setTimeout(() => {
      if (p.ghost) { FX.toast(`${p.client || "Клиент"} пропал. Обещал «завтра». Завтра не наступило`, "👻", 3400); return; }
      if (p.gov) G().tx(p.t, p.a, p.e || "🏛️", "c-lime"), Vibe.refreshCounters();
      else earn(p.t, p.a, p.e || "💸", "c-lime");
      FX.toast(`${p.t}: +${rub(p.a)}`, p.e || "💸", 3000);
      FX.sound.success();
    }, 700 + i * 1100));
  }

  /* ================= Машина ================= */
  const CARS = [
    { id: "lada", n: "Лада Вайб", e: "🚗", p: 900000, col: "c-yellow", tank: 3200, look: 8, mood: 4, osago: 900, d: "Заводится с третьего раза. Сигнализация — с первого." },
    { id: "sedan", n: "Немец с пробегом", e: "🚘", p: 1600000, col: "c-sky", tank: 4300, look: 12, mood: 5, d: "Пробег 300 тыс. км. Скручен честно — до 87 тыс." },
    { id: "cross", n: "Кроссовер «Статус»", e: "🚙", p: 2400000, col: "c-pink", tank: 5400, look: 16, mood: 6, d: "Высокая посадка: видно, как все стоят в пробке. Вместе с тобой." },
    { id: "tesla", n: "Тесла, но китайская", e: "🏎️", p: 4500000, col: "c-lime", tank: 900, electric: true, look: 22, mood: 8, osago: 2400, d: "Автопилот работает. Куда везёт — не говорит." },
  ];
  CARS.forEach((c) => { if (!c.osago) c.osago = Math.round(c.p / 1500 / 100) * 100; });
  const CAR_RATE = 0.219, CAR_MONTHS = 60, DOWN = 0.2;
  const myCar = () => { const it = Vibe.inv.list("car")[0]; if (!it) return null; return Object.assign({}, CARS.find((c) => c.id === it.model) || CARS[0], { item: it }); };
  const GA0 = { fuel: 60, clean: 80, km: 0, bought: 0, lastDay: 0 };
  const ga = () => Object.assign({}, GA0, S().ga || {});
  const saveGA = (p) => set({ ga: Object.assign(ga(), p) });
  const monthly = (L, rate = CAR_RATE, months = CAR_MONTHS) => { const r = rate / 12; return Math.round((L * r) / (1 - Math.pow(1 + r, -months))); };

  /* ================= Штрафы ================= */
  const FINES = [
    { t: "Превышение на 1 км/ч", e: "📸", a: 500 },
    { t: "Парковка на 3 см правее разметки", e: "🅿️", a: 1500 },
    { t: "Проезд под знаком, который поставили вчера", e: "🚧", a: 1000 },
    { t: "Слишком громко думал за рулём", e: "🧠", a: 500 },
    { t: "Стоянка у собственного дома", e: "🏠", a: 2500 },
    { t: "Грязные номера", e: "🫧", a: 500 },
  ];
  const GV0 = { fines: [], seeded: false, dedYear: -1, propClaimed: false, passport: null };
  const gv = () => Object.assign({}, GV0, S().gv || {});
  const saveGV = (p) => set({ gv: Object.assign(gv(), p) });
  function addFine(f, quiet) {
    const fine = Object.assign({ id: "f" + Date.now() + rnd(0, 999), day: today(), st: "new" }, f);
    saveGV({ fines: [fine, ...gv().fines].slice(0, 20) });
    if (!quiet) FX.toast(`Штраф: ${f.t} · ${rub(f.a)}. Оплати в Госвайбе со скидкой 50%`, "🚔", 3600);
    return fine;
  }
  const fineDisc = (f) => today() - f.day <= 20;
  const fineDue = (f) => (fineDisc(f) ? Math.round(f.a / 2) : f.a);
  const openFines = () => gv().fines.filter((f) => f.st === "new");

  /* ================= Ежедневные события ================= */
  function daily() {
    if (!S().profile || !S().game) return;
    settle();
    const a = ga(), d = today();
    if (!myCar()) { if (a.lastDay !== d && S().ga) saveGA({ lastDay: d }); return; }
    const from = Math.max(a.lastDay, d - 30);
    if (from >= d) return;
    let clean = a.clean;
    for (let x = from + 1; x <= d; x++) {
      clean = clamp(clean - 7);
      if (Math.random() < (Vibe.subs.has("osago") ? 0.1 : 0.16)) {
        const f = clean < 30 && Math.random() < 0.5 ? FINES[5] : pick(FINES.slice(0, 5));
        addFine(f, x !== d);
      }
    }
    saveGA({ clean, lastDay: d });
  }
  if (Vibe.game && Vibe.game.on) Vibe.game.on(() => setTimeout(daily, 1500));
  Vibe.sched.on("gov_passport", () => { saveGV({ passport: { st: "done", day: today() } }); setTimeout(() => FX.toast("Паспорт получен! Фото ужасное — значит, настоящий", "🛂", 3400), 1200); });
  Vibe.sched.on("gov_passport:missed", () => saveGV({ passport: { st: "missed" } }));

  /* ============================================================
     1. VIBE GIG
     ============================================================ */
  const RESTOS = [
    { n: "Шаурма «Предодобренная»", e: "🌯", dish: "Шаурма XL без лука (с луком)" },
    { n: "Суши «Кэшбек-сан»", e: "🍣", dish: "Сет «Филадельфия на троих» для одного" },
    { n: "Бургерная «Лайк»", e: "🍔", dish: "Двойной смэш и картошка, которая остынет" },
    { n: "Пицца «4 сыра, 3 подписки»", e: "🍕", dish: "Пепперони 40 см в коробке 30 см" },
    { n: "Поке «Осознанность»", e: "🥗", dish: "Боул «Я начал новую жизнь»" },
    { n: "Пельменная «Ипотека»", e: "🥟", dish: "Пельмени, 30 штук на 30 лет" },
    { n: "Кофейня «Дедлайн»", e: "☕", dish: "Раф на овсяном и круассан «на бегу»" },
    { n: "Вок «Рассрочка»", e: "🍜", dish: "Удон, оплаченный частями" },
  ];
  const NOTES = [
    "«Не звоните, я на созвоне. Но если не позвоните — поставлю 1 звезду»",
    "«Домофон не работает с 2019 года. Кричите»",
    "«Оставьте у двери. Но не у этой двери»",
    "«7 этаж, лифт на ремонте. Ремонт — это мы»",
    "«Позвоните за 5 минут, я спущусь» (не спустится)",
    "«Приборы не нужны. Нужны все приборы»",
  ];
  const REVIEWS = {
    5: ["«Быстро, тепло, с улыбкой. Улыбку не заказывал, но спасибо»", "«Курьер — легенда. Шаурма — тоже»"],
    4: ["«Нормально. Пакет был немного мокрый, как и мои глаза»", "«Хорошо, но я ждал на 4 минуты меньше»"],
    3: ["«Еда приехала. Это уже что-то»", "«Пакет пах лужей. Звезду снял за атмосферу»"],
    2: ["«Курьер плыл. Буквально»", "«Суп был в пакете. Отдельно от контейнера»"],
  };
  const PAX = [
    { e: "🧑‍💼", n: "Менеджер Олег", req: "«Едем молча. Но включите что-нибудь. Но молча»", opts: [
      { t: "Включить тишину 🤫", st: 1, say: "«Идеально. Вот это сервис»" }, { t: "Рассказать про свой стартап", st: -1, say: "«Я просил молча…»" } ] },
    { e: "👩‍🎤", n: "Блогер Кира", req: "«Я сниму вас в сторис. Сделайте лицо поинтереснее»", opts: [
      { t: "Сделать лицо 😎", st: 1, tip: 150, say: "«Вау, +3 подписчика!»" }, { t: "Отказаться от славы", st: 0, say: "«Скучно. Но ладно»" } ] },
    { e: "👴", n: "Дедушка Виктор", req: "«Можно я покажу, как ехать? Я тут с 1974 года езжу»", opts: [
      { t: "Слушаться дедушку", st: 1, tip: 100, say: "«Вот! Молодёжь, а понимаешь»" }, { t: "Ехать по навигатору", st: -1, say: "«Навигатор вас обманывает, я вам говорю»" } ] },
    { e: "🧔", n: "Пассажир Артём", req: "«Заедем в три магазина? Это по пути. По моему пути»", opts: [
      { t: "Заехать (бесплатно)", st: 1, tip: 200, say: "«Ты лучший, вот на чай»" }, { t: "«Это другой заказ»", st: 0, say: "«Справедливо…»" } ] },
    { e: "🧑‍🎓", n: "Студент Паша", req: "«Можно я поведу? У меня права почти есть»", opts: [
      { t: "Нет 🙅", st: 1, say: "«Ну ладно, просто спросил»" }, { t: "Дать порулить на парковке", st: -2, say: "«Кажется, я задел знак. Он сам»" } ] },
    { e: "👩‍💻", n: "Айтишница Лена", req: "«Остановите у кофейни. У меня деплой, мне нужен раф»", opts: [
      { t: "Остановить ☕", st: 1, tip: 100, say: "«Деплой прошёл! Ну, почти»" }, { t: "«Мы торопимся»", st: -1, say: "«Деплой упал. Из-за вас»" } ] },
  ];
  const FREELANCE = [
    { id: "logo", e: "🎨", t: "Логотип за 300 ₫", client: "ИП «Шаурма у Ашота»", pay: 300, taps: 24, sec: 7, edit: "А можно логотип побольше, но чтобы он был меньше?" },
    { id: "apple", e: "🍏", t: "Сделать как у «Яблока», но дешевле", client: "Стартап «Груша»", pay: 900, taps: 34, sec: 8, edit: "И чтобы было вау. Вы же понимаете, какое вау?" },
    { id: "land", e: "📝", t: "Текст для лендинга, 3000 знаков", client: "Курсы «Миллион за неделю»", pay: 550, taps: 28, sec: 8, edit: "Добавьте уникальности. И слово «синергия» раз двенадцать" },
    { id: "reels", e: "🎬", t: "Смонтировать рилс за 200 ₫", client: "Блогер-миллионник (3 тыс. подписчиков)", pay: 200, taps: 18, sec: 6, edit: "А можно сделать вирусным? Просто сделайте вирусным" },
    { id: "table", e: "🧾", t: "Таблица на 40 000 строк", client: "Бухгалтерия «Сдадим вчера»", pay: 400, taps: 26, sec: 7, edit: "Ой, мы прислали не тот файл. Вот правильный (тоже не тот)" },
    { id: "bot", e: "🤖", t: "Чат-бот, который «как живой»", client: "Застройщик «Вайб-Сити»", pay: 1500, taps: 40, sec: 9, edit: "А пусть бот ещё продаёт квартиры. Сам. И звонит маме" },
    { id: "cat", e: "🐈", t: "Аватарка для кота", client: "Кот Борис (через хозяйку)", pay: 250, taps: 20, sec: 6, edit: null },
    { id: "deck", e: "📊", t: "Презентация «к утру»", client: "Начальник знакомого", pay: 700, taps: 30, sec: 8, edit: "Шрифт какой-то не такой. Не знаю какой, но не такой" },
  ];
  const flOffers = () => { const d = today(); const out = []; let h = (d * 2654435761) >>> 0; const pool = FREELANCE.slice(); while (out.length < 3) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); } return out; };
  const MAX_ORDERS = 5, MAX_RIDES = 6;

  function gate(kind) {
    const b = Vibe.body ? Vibe.body.get() : null;
    if (b && b.sleeping) return "Ты спишь. Корпорация пока не научилась брать заказы во сне";
    if (b && b.energy < 15) return "Энергия ниже 15%. Поешь или поспи — Корпорации нужен живой партнёр";
    const g = gg();
    if (kind === "courier" && g.orders >= MAX_ORDERS) return "Смена закрыта: 5 заказов в день. Забота о тебе (и о страховке)";
    if (kind === "driver") {
      const c = myCar();
      if (!c) return "Нужна машина. Vibe Auto одобрит её быстрее, чем ты передумаешь";
      if (!Vibe.subs.has("osago")) return "Без ОСАГО Vibe Maps на линию не пустит. Оформи в Vibe Auto";
      if (ga().fuel < 12) return c.electric ? "Батарея почти на нуле. Заряди в Vibe Auto" : "Бак почти пуст. Заправься в Vibe Auto";
      if (g.rides >= MAX_RIDES) return "На сегодня 6 поездок. Дальше — только по любви";
    }
    if (kind === "freelance" && g.fl.length >= 3) return "Все задачи на сегодня разобраны. Новые — завтра";
    return null;
  }

  Vibe.screen("gig", {
    render() {
      return `${Vibe.ui.head("Vibe Gig", "Подработки от Корпорации", Vibe.ui.vibikiPill())}<div data-body></div>`;
    },
    mount(root) {
      const T = bag();
      let ST = bag(), map = null;
      const body = $(root, "[data-body]");
      settle();
      const endStage = () => { ST.clear(); ST = bag(); if (map) { map.destroy(); map = null; } };
      function draw(html) { body.innerHTML = html; $$(body, ".stagger").forEach(restagger); root.scrollTop = 0; }

      /* ---------- Главная Gig ---------- */
      function home() {
        endStage();
        const g = gg(), sg = surge(), car = myCar(), b = Vibe.body ? Vibe.body.get() : { energy: 80 };
        const offers = flOffers();
        const hist = (S().tx || []).filter((t) => /Vibe Gig/.test(t.t)).slice(0, 5);
        draw(`
        <div class="stagger">
          ${Vibe.ui.hero({ title: "Работай на нас. В нашем же приложении", text: "Курьер, водитель, фриланс. Деньги сразу*. Комиссия тоже сразу.", emo: "🚲", color: "c-lime", sticker: sg.label || "Без собеседований" })}
          <div class="card gg-stats">
            <div><b class="big-num">${g.orders}/${MAX_ORDERS}</b><small>заказов</small></div>
            <div><b class="big-num">${dec(g.rating, 2)}</b><small>⭐ рейтинг</small></div>
            <div><b class="big-num">+${fmt(g.earnedDay)}</b><small>₫ сегодня</small></div>
            <div class="gg-en"><span>⚡ Энергия ${Math.round(b.energy)}%</span><div class="progress"><i style="--p:${Math.round(b.energy)}%;background:${b.energy < 25 ? "var(--coral)" : "var(--lime)"}"></i></div></div>
          </div>
          ${Vibe.ui.marquee(["Комиссия Корпорации 25%", "Ты не сотрудник — ты партнёр", "Чаевые без комиссии (пока)", "Рейтинг ниже 4,3 — до свидания"])}
          <h2 class="sec">Подработки <small>${sg.label || "Будни · обычный спрос"}</small></h2>
          <div class="stack stagger">
            <div class="card c-yellow gg-gig">
              <div class="gg-gh"><span class="emo float">🚲</span><div><b>Курьер Vibe Eat</b><small>110–280 ₫ за заказ + чаевые</small></div></div>
              <p>Забери заказ, довези до клиента, объезжай лужи. Смена — до 5 заказов в игровой день.</p>
              <div class="gg-chips"><span class="badge" style="background:#fff">🏢 Комиссия Корпорации 25%</span><span class="badge" style="background:#fff">🚶 шаги в Vibe Fit</span></div>
              <button class="btn black block" data-courier>${g.orders >= MAX_ORDERS ? "Смена закрыта 😮‍💨" : g.orders ? `Следующий заказ · ${g.orders + 1}/${MAX_ORDERS}` : "Выйти на смену"} <span class="arrow">→</span></button>
            </div>
            <div class="card c-sky gg-gig">
              <div class="gg-gh"><span class="emo float d1">${car ? car.e : "🚕"}</span><div><b>Водитель Vibe Maps</b><small>${car ? `${esc(car.n)} · ${car.electric ? "🔋" : "⛽"} ${Math.round(ga().fuel)}%` : "нужна своя машина"}</small></div></div>
              <p>${car ? "Пассажиры с особыми просьбами. Заработок минус бензин минус комиссия минус нервы." : "Своей машины нет. Vibe Auto даст кредит быстрее, чем ты скажешь «а проценты?»"}</p>
              <div class="gg-chips"><span class="badge" style="background:#fff">🏢 Комиссия Корпорации 25%</span>${car ? `<span class="badge" style="background:#fff">🛡️ ОСАГО ${Vibe.subs.has("osago") ? "есть" : "нет"}</span><span class="badge" style="background:#fff">🚖 ${g.rides}/${MAX_RIDES}</span>` : ""}</div>
              ${car ? `<button class="btn black block" data-driver>На линию <span class="arrow">→</span></button>` : `<button class="btn block" data-go="auto">Выбрать машину в Vibe Auto 🚗</button>`}
            </div>
            <div class="card c-pink gg-gig">
              <div class="gg-gh"><span class="emo float d2">💻</span><div><b>Фриланс</b><small>оплата через 1–3 дня. Наверное</small></div></div>
              <div class="gg-fl">${offers.map((o) => { const done = g.fl.includes(o.id); return `
                <div class="gg-flr${done ? " done" : ""}"><span class="emo">${o.e}</span><div><b>${esc(o.t)}</b><small>${esc(o.client)} · ${rub(o.pay)}</small></div>${done ? `<span class="badge">✅ сдано</span>` : `<button class="btn sm black" data-fl="${o.id}">Взять</button>`}</div>`; }).join("")}</div>
              <div class="fine" style="color:var(--ink);opacity:.7">Комиссия Корпорации 25% удерживается до того, как клиент заплатит. Мы так верим в тебя.</div>
            </div>
          </div>
          ${g.pend.length ? `<h2 class="sec">Ждут оплаты <small>${rub(g.pend.reduce((s, p) => s + p.a, 0))}</small></h2>
          <div class="card stagger" style="padding:4px 14px">${g.pend.map((p) => `<div class="li"><div class="ic c-lilac">${p.e || "⏳"}</div><div class="tx"><b>${esc(p.t)}</b><small>${p.due - today() <= 0 ? "сегодня" : `через ${p.due - today()} ${plural(p.due - today(), "день", "дня", "дней")}`}${p.client ? " · " + esc(p.client) : ""}</small></div><div class="amt">+${rub(p.a)}</div></div>`).join("")}</div>` : ""}
          ${hist.length ? `<h2 class="sec">Последние выплаты <small>всего ${rub(g.total)}</small></h2>
          <div class="card stagger" style="padding:4px 14px">${hist.map((t) => `<div class="li"><div class="ic ${t.col || "c-lime"}">${t.c}</div><div class="tx"><b>${esc(t.t)}</b><small>${esc(t.d)}</small></div><div class="amt" style="color:#12a150">+${rub(t.a)}</div></div>`).join("")}</div>` : ""}
          <div style="margin-top:18px">${zab(g.n >= 10 ? `Ты {сделал|сделала} ${g.n} подработок. Корпорация гордится тобой на 25% 💜` : "Вечером работаешь у нас, днём — у нас же. Это и есть экосистема!")}</div>
          <div class="fine">Vibe Gig не является работодателем. Vibe Gig является платформой, площадкой, партнёром, другом и немного семьёй. Больничные, отпуск и пенсия в стоимость не входят. *Сразу — понятие растяжимое.</div>
        </div>`);
      }

      T.on(body, "click", (e) => {
        const t = e.target.closest("[data-courier],[data-driver],[data-fl],[data-home],[data-next]");
        if (!t) return;
        if (t.hasAttribute("data-home")) { home(); FX.sound.pop(); return; }
        if (t.hasAttribute("data-courier") || (t.dataset.next === "courier")) {
          const why = gate("courier"); if (why) { FX.shake(t); FX.toast(why, "🙅", 3000); return; }
          courierOffer(); return;
        }
        if (t.hasAttribute("data-driver") || t.dataset.next === "driver") {
          const why = gate("driver"); if (why) { FX.shake(t); FX.toast(why, "🙅", 3200); if (/Vibe Auto/.test(why)) T.to(() => Vibe.go("auto"), 900); return; }
          driverOffer(); return;
        }
        if (t.dataset.fl) {
          const why = gate("freelance"); if (why) { FX.shake(t); FX.toast(why, "🙅", 3000); return; }
          const o = FREELANCE.find((x) => x.id === t.dataset.fl);
          if (gg().fl.includes(o.id)) return;
          freelance(o);
        }
      });

      /* ---------- Курьер: оффер ---------- */
      function courierOffer() {
        endStage();
        const ri = rnd(1, RESTOS.length), R = RESTOS[ri - 1];
        const a = Vibe.map.place("restaurant:" + ri);
        let b = Vibe.map.place("flat:gig" + rnd(1, 9999));
        let pts = Vibe.map.path(a, b), km = Math.max(0.6, Vibe.map.km(pts));
        const sg = surge();
        const net = Math.round(Math.min(280, Math.max(110, 100 + km * 45 + rnd(0, 40))) * sg.k / 10) * 10;
        const gross = Math.round(net / (1 - COMMISSION) / 10) * 10;
        const fee = gross - net;
        const order = { R, a, b, pts, km, net, gross, fee, note: pick(NOTES), mins: Vibe.map.minutes(pts, "courier") };
        draw(`
        <div class="stagger">
          <div class="card c-yellow gg-offer">
            <div class="sticker" style="top:12px;right:12px">Новый заказ!</div>
            <div class="emo wobble" style="font-size:64px">${R.e}</div>
            <div class="display" style="font-size:22px;margin-top:6px">${esc(R.n)}</div>
            <div style="font-weight:800;font-size:13px;margin-top:4px">${esc(R.dish)}</div>
            <div class="gg-chips" style="margin-top:10px"><span class="badge" style="background:#fff">📍 ${dec(km)} км</span><span class="badge" style="background:#fff">⏱ ~${order.mins} мин</span><span class="badge" style="background:#fff">🚲 заказ ${gg().orders + 1}/${MAX_ORDERS}</span></div>
          </div>
          <div class="card">
            ${row("Стоимость доставки", rub(gross))}
            ${row("🏢 Комиссия Корпорации 25%", "−" + rub(fee))}
            ${sg.label ? row(sg.label, "уже внутри") : ""}
            ${row("Тебе", rub(net), true)}
            <div class="gg-note">📝 ${esc(order.note)}</div>
          </div>
          <div class="stack">
            <button class="btn black xl block" data-take>Взять заказ 🚲</button>
            <button class="btn block" data-skip>Пропустить</button>
            <button class="btn block" data-home>← К подработкам</button>
          </div>
          <div class="fine">Пропуск заказа не влияет на рейтинг. Влияет на приоритет, карму и настроение алгоритма.</div>
        </div>`);
        ST.on($(body, "[data-take]"), "click", (e) => { FX.burst(e.currentTarget, { emojis: ["🚲", R.e, "✨"], count: 12 }); FX.sound.success(); courierRide(order); });
        ST.on($(body, "[data-skip]"), "click", () => { saveGG({ rating: Math.max(3.5, +(gg().rating - 0.01).toFixed(2)) }); FX.toast("Алгоритм запомнил. Алгоритм всё запоминает", "🤖"); courierOffer(); });
      }

      /* ---------- Мини-доставка на карте ---------- */
      function rideStage({ title, sub, hint, emoji, color, pins, pts, dur, marks, onSpawn, onDone, extra = "" }) {
        draw(`
        <div class="gg-mapwrap">
          <div class="gg-map" data-map></div>
          <div class="gg-hud"><b>${title}</b><small data-sub>${sub}</small><div class="progress"><i data-prog style="--p:0%;transition:none"></i></div></div>
          <div class="gg-layer" data-layer></div>
        </div>
        <div class="card tight gg-score"><span data-sc>${hint}</span></div>
        ${extra}
        <button class="btn block" data-abort style="margin-top:12px">Отменить заказ 😬</button>
        <div class="fine">Отмена заказа во время доставки снижает рейтинг на 0,1. Еду съест Корпорация (в смысле утилизирует).</div>`);
        map = Vibe.map.create($(body, "[data-map]"), { interactive: false, height: 330, pins });
        map.route(pts, { color });
        map.fit(pts, 60, true);
        const prog = $(body, "[data-prog]");
        let next = 0, ctl = null;
        ST.to(() => {
          map.center(pts[0], 320);
          ST.to(() => {
            ctl = map.drive(pts, {
              emoji, color: "#fff", duration: dur, follow: true,
              onProgress(k) {
                prog.style.setProperty("--p", Math.round(k * 100) + "%");
                while (next < marks.length && k >= marks[next]) onSpawn(next++, ctl);
              },
              onDone() { ST.to(onDone, 350); },
            });
          }, 760);
        }, 900);
        ST.on($(body, "[data-abort]"), "click", () => {
          saveGG({ rating: Math.max(3.5, +(gg().rating - 0.1).toFixed(2)) });
          FX.toast("Заказ отменён. Рейтинг −0,1. Алгоритм грустит", "😬", 2600);
          home();
        });
      }
      // Помеха/бонус поверх карты: вокруг курьера (он в центре)
      function hazard({ e, label, good, life = 1500, onHit, onMiss }) {
        const layer = $(body, "[data-layer]"); if (!layer) return;
        const btn = document.createElement("button");
        btn.className = "gg-hz " + (good ? "good" : "bad");
        const ang = Math.random() * Math.PI * 2, r = rnd(56, 96);
        btn.style.left = `calc(50% + ${Math.round(Math.cos(ang) * r)}px)`;
        btn.style.top = `calc(50% + ${Math.round(Math.sin(ang) * r * 0.8)}px)`;
        btn.innerHTML = `<span class="emo">${e}</span><small>${label}</small>`;
        layer.appendChild(btn);
        let done = false;
        btn.addEventListener("pointerdown", (ev) => {
          if (done) return; done = true; ev.preventDefault();
          FX.burst(btn, { emojis: good ? ["💰", "✨", "⭐"] : ["💨", "✨", e], count: 10 });
          FX.haptic(12); FX.sound.pop();
          btn.classList.add("hit"); ST.to(() => btn.remove(), 300);
          onHit && onHit();
        });
        ST.to(() => { if (done) return; done = true; btn.classList.add("gone"); ST.to(() => btn.remove(), 300); onMiss && onMiss(); }, life);
      }

      function courierRide(o) {
        let dodged = 0, missed = 0, bonus = 0;
        const sc = () => { const el = $(body, "[data-sc]"); if (el) el.innerHTML = `🌊 Объехал: <b>${dodged}</b> · 💥 Влетел: <b>${missed}</b> · 💰 Бонус: <b>${rub(bonus)}</b>`; };
        const kinds = [
          { e: "🌊", label: "Лужа!", good: false }, { e: "🐕", label: "Собака!", good: false }, { e: "🛴", label: "Самокат!", good: false },
          { e: "💰", label: "Бонус", good: true }, { e: "⭐", label: "Буст", good: true },
        ];
        const n = rnd(4, 5);
        const marks = Array.from({ length: n }, (_, i) => 0.12 + (i * 0.76) / n + Math.random() * 0.06);
        const dur = Math.round(Math.min(15000, Math.max(9500, o.km * 3200)));
        rideStage({
          title: `${o.R.e} → 🏠 Клиент`, sub: `${dec(o.km)} км · ${esc(o.R.n)}`,
          hint: "Тапай лужи и собак, чтобы объехать. Бонусы — хватай!", emoji: "🚲", color: "#c6ff4d", pts: o.pts, dur, marks,
          pins: [Object.assign({ id: "r", color: "#ffe14d", label: "Забрать" }, o.a, { e: o.R.e }), Object.assign({ id: "c", color: "#ff6bcb", pulse: true, label: "Клиент" }, o.b)],
          onSpawn() {
            const k = Math.random() < 0.35 ? pick(kinds.filter((x) => x.good)) : pick(kinds.filter((x) => !x.good));
            hazard({
              e: k.e, label: k.label, good: k.good, life: k.good ? 1300 : 1600,
              onHit() { if (k.good) { const v = pick([20, 30, 40, 50]); bonus += v; FX.toast(`+${v} ₫ бонус за скорость`, "💰", 1400); } else dodged++; sc(); },
              onMiss() { if (!k.good) { missed++; FX.shake($(body, ".gg-mapwrap")); FX.toast(k.e === "🌊" ? "Плюх! Пакет промок" : k.e === "🐕" ? "Собака победила. Котлету отдал" : "Самокатчик подрезал. Суп в пакете", "💥", 1600); sc(); } },
            });
          },
          onDone() {
            const stars = Math.max(2, 5 - missed);
            const tip = stars === 5 ? pick([0, 50, 100, 150, 200]) : stars === 4 ? pick([0, 0, 50]) : 0;
            const g = gg();
            const rating = +((g.rating * 19 + stars) / 20).toFixed(2);
            saveGG({ orders: g.orders + 1, n: g.n + 1, rating });
            earn("Vibe Gig · доставка", o.net + bonus, "🚲", "c-lime");
          if (Vibe.body && Vibe.body.addStress) Vibe.body.addStress(2, "Подработка курьером", "🚲");
            if (tip) earn("Vibe Gig · чаевые", tip, "💜", "c-yellow");
            G().stat("gigs");
            if (Vibe.body) Vibe.body.effect("walk", { km: o.km });
            tire(5, 4);
            Vibe.reward({ vibiki: 8 + stars * 3, xp: 20, silent: true });
            result({
              e: o.R.e, title: "Доставлено!", stars, review: pick(REVIEWS[Math.min(5, stars)] || REVIEWS[2]),
              lines: [row("Оплата за заказ", rub(o.net)), bonus ? row("💰 Бонусы", "+" + rub(bonus)) : "", row("💜 Чаевые", tip ? "+" + rub(tip) : "0 ₫ (клиент «перевёл мысленно»)"), row("🏢 Комиссия Корпорации 25%", "уже удержана"), row("Итого", "+" + rub(o.net + bonus + tip), true)],
              sub: `🚶 +${fmt(Math.round(o.km * 1350))} шагов · ⚡ −8% энергии · ⭐ рейтинг ${dec(rating, 2)}`,
              next: gg().orders < MAX_ORDERS ? `<button class="btn black xl block" data-next="courier">Следующий заказ · ${gg().orders + 1}/${MAX_ORDERS} 🚲</button>` : `<div class="card c-lilac tight" style="text-align:center;font-weight:800">🏁 Смена закрыта. 5 из 5. Ты машина. Ну, велосипед</div>`,
            });
          },
        });
        sc();
      }

      function result({ e, title, stars, review, lines, sub, next }) {
        endStage();
        draw(`
        <div class="stagger">
          <div class="card c-lime" style="text-align:center">
            <div class="emo float" style="font-size:72px">${e}</div>
            <div class="display" style="font-size:30px">${title}</div>
            <div class="gg-stars">${"⭐".repeat(stars)}<span>${"☆".repeat(5 - stars)}</span></div>
            <div style="font-weight:700;font-size:14px;margin-top:6px">${esc(review)}</div>
          </div>
          <div class="card">${lines.join("")}<div class="fine" style="margin-top:8px">${sub}</div></div>
          <div class="stack">${next}<button class="btn block" data-home>← К подработкам</button></div>
        </div>`);
        FX.confetti({ count: stars >= 4 ? 120 : 50 });
        FX.sound.success();
        FX.burst({ x: innerWidth / 2, y: 180 }, { emojis: ["💸", "⭐", e], count: 16 });
      }

      /* ---------- Водитель ---------- */
      const DEST = ["hq", "club", "park", "supermarket", "clinic", "metro2", "wheel"];
      function driverOffer() {
        endStage();
        const car = myCar(), p = pick(PAX);
        const a = Vibe.map.place("flat:pax" + rnd(1, 9999));
        const dk = pick(DEST), b = Vibe.map.place(dk);
        const pts = Vibe.map.path(a, b), km = Math.max(1, Vibe.map.km(pts));
        const sg = surge();
        const fare = Math.round(((150 + km * 60) * sg.k) / 10) * 10;
        const fee = Math.round(fare * COMMISSION);
        const fuelPct = Math.round(km * 2.6);
        const fuelRub = Math.round((fuelPct / 100) * car.tank);
        const o = { car, p, a, b, pts, km, fare, fee, fuelPct, fuelRub, dest: b.label };
        draw(`
        <div class="stagger">
          <div class="card c-sky gg-offer">
            <div class="sticker" style="top:12px;right:12px">Пассажир рядом</div>
            <div class="emo wobble" style="font-size:64px">${p.e}</div>
            <div class="display" style="font-size:22px;margin-top:6px">${esc(p.n)}</div>
            <div style="font-weight:800;font-size:13px;margin-top:4px">→ ${esc(o.dest)}</div>
            <div class="gg-chips" style="margin-top:10px"><span class="badge" style="background:#fff">📍 ${dec(km)} км</span><span class="badge" style="background:#fff">⭐ 4,${rnd(1, 9)}${rnd(0, 9)}</span><span class="badge" style="background:#fff">${car.e} ${esc(car.n)}</span></div>
          </div>
          <div class="card">
            ${row("Тариф «Эконом+»", rub(fare))}
            ${row("🏢 Комиссия Корпорации 25%", "−" + rub(fee))}
            ${row(`${car.electric ? "🔋 Заряд" : "⛽ Бензин"} (из твоего бака, ${fuelPct}%)`, "−" + rub(fuelRub))}
            ${sg.label ? row(sg.label, "уже внутри") : ""}
            ${row("Чистыми на самом деле", rub(fare - fee - fuelRub), true)}
            <div class="fine">На карту придёт ${rub(fare - fee)}. Бензин ты уже оплатил на заправке, просто ещё не осознал.</div>
          </div>
          <div class="stack">
            <button class="btn black xl block" data-take>Принять поездку ${car.e}</button>
            <button class="btn block" data-home>← К подработкам</button>
          </div>
        </div>`);
        ST.on($(body, "[data-take]"), "click", (e) => { FX.burst(e.currentTarget, { emojis: [car.e, p.e, "✨"], count: 12 }); FX.sound.success(); driverRide(o); });
      }
      function driverRide(o) {
        let st = 5, tip = 0, cams = 0, fined = 0, asked = false;
        const sc = () => { const el = $(body, "[data-sc]"); if (el) el.innerHTML = `📸 Камер замечено: <b>${cams}</b> · 🚔 Штрафов: <b>${fined}</b> · ${o.p.e} настроение: <b>${"⭐".repeat(Math.max(1, Math.min(5, st)))}</b>`; };
        rideStage({
          title: `${o.p.e} ${esc(o.p.n)}`, sub: `→ ${esc(o.dest)} · ${dec(o.km)} км`,
          hint: "Камеры — тапай, чтобы сбросить скорость.", emoji: o.car.e, color: "#8fd8ff", pts: o.pts,
          dur: Math.round(Math.min(15000, Math.max(9500, o.km * 2600))), marks: [0.22, 0.38, 0.62, 0.84],
          pins: [Object.assign({ id: "a", color: "#ffe14d", label: "Посадка" }, o.a, { e: o.p.e }), Object.assign({ id: "b", color: "#ff6bcb", pulse: true, label: o.dest }, o.b)],
          extra: `<div data-ask></div>`,
          onSpawn(i, ctl) {
            if (i === 1 && !asked) {
              asked = true; ctl && ctl.pause();
              const box = $(body, "[data-ask]");
              box.innerHTML = `<div class="card c-yellow gg-ask"><div class="gg-gh"><span class="emo wobble">${o.p.e}</span><div><b>${esc(o.p.n)}</b><small>${esc(o.p.req)}</small></div></div><div class="stack" style="margin-top:10px">${o.p.opts.map((x, k) => `<button class="btn ${k ? "" : "black"} block" data-opt="${k}" style="white-space:normal;height:auto;min-height:48px;padding:8px 16px">${esc(x.t)}</button>`).join("")}</div></div>`;
              box.firstElementChild.style.animation = "pop-in .5s var(--spring) both";
              FX.sound.pop();
              box.scrollIntoView({ behavior: "smooth", block: "nearest" });
              const onOpt = (ev) => {
                const bt = ev.target.closest("[data-opt]"); if (!bt) return;
                box.removeEventListener("click", onOpt);
                const x = o.p.opts[+bt.dataset.opt];
                st += x.st; tip += x.tip || 0;
                FX.burst(bt, { emojis: x.st > 0 ? ["💜", "⭐", "✨"] : ["😐", "💢"], count: 10 });
                box.innerHTML = `<div class="card tight" style="font-weight:800">${o.p.e} ${esc(x.say)}</div>`;
                sc();
                ST.to(() => ctl && ctl.resume(), 500);
              };
              box.addEventListener("click", onOpt);
              return;
            }
            cams++; sc();
            hazard({
              e: "📸", label: "Камера!", good: false, life: 1500,
              onHit() { FX.toast("Притормозил. Камера разочарована", "📸", 1300); },
              onMiss() { fined++; sc(); addFine({ t: "Превышение на 1 км/ч (поездка Vibe Maps)", e: "📸", a: 500 }, true); FX.shake($(body, ".gg-mapwrap")); FX.toast("Вспышка! Штраф 500 ₫ уже в Госвайбе", "🚔", 2000); },
            });
          },
          onDone() {
            const stars = Math.max(1, Math.min(5, st));
            const g = gg();
            const rating = +((g.rating * 19 + stars) / 20).toFixed(2);
            saveGG({ rides: g.rides + 1, n: g.n + 1, rating });
            const net = o.fare - o.fee;
            earn("Vibe Gig · такси", net, o.car.e, "c-lime");
            if (tip && stars >= 4) earn("Vibe Gig · чаевые", tip, "💜", "c-yellow");
            saveGA({ fuel: clamp(ga().fuel - o.fuelPct), km: ga().km + o.km, clean: clamp(ga().clean - 3) });
            G().stat("gigs");
            tire(6, 3);
            Vibe.reward({ vibiki: 10 + stars * 3, xp: 25, silent: true });
            const tipShown = tip && stars >= 4 ? tip : 0;
            result({
              e: o.car.e, title: "Приехали!", stars, review: stars >= 4 ? `${o.p.n}: «Спасибо, водитель. Пять звёзд, но мысленно шесть»` : `${o.p.n}: «Доехали. Это главное. Наверное»`,
              lines: [row("Тариф", rub(o.fare)), row("🏢 Комиссия Корпорации 25%", "−" + rub(o.fee)), row("💜 Чаевые", tipShown ? "+" + rub(tipShown) : "0 ₫"), row(`${o.car.electric ? "🔋" : "⛽"} Бак`, `−${o.fuelPct}% (≈ ${rub(o.fuelRub)})`), fined ? row("🚔 Штрафы", `−${rub(fined * 500)} (в Госвайбе)`) : "", row("Чистыми", rub(net + tipShown - o.fuelRub - fined * 250), true)],
              sub: `${o.car.electric ? "🔋" : "⛽"} Осталось ${Math.round(ga().fuel)}% · ⭐ рейтинг ${dec(rating, 2)} · штраф со скидкой 50% — 250 ₫`,
              next: gate("driver") ? `<button class="btn block" data-go="auto">${ga().fuel < 12 ? "Заправиться в Vibe Auto ⛽" : "В Vibe Auto 🚗"}</button>` : `<button class="btn black xl block" data-next="driver">Следующий пассажир ${o.car.e}</button>`,
            });
          },
        });
        sc();
      }

      /* ---------- Фриланс: тапалка ---------- */
      function freelance(o) {
        endStage();
        let round = 0, taps = 0, need = o.taps, left = o.sec * 10, timer = null;
        draw(`
        <div class="stagger">
          <div class="card c-pink gg-offer">
            <div class="emo wobble" style="font-size:56px">${o.e}</div>
            <div class="display" style="font-size:22px;margin-top:6px">${esc(o.t)}</div>
            <div style="font-weight:800;font-size:13px;margin-top:4px">${esc(o.client)} · ${rub(o.pay)}</div>
          </div>
          <div class="card" style="text-align:center">
            <div data-msg style="font-weight:800;font-size:14px;min-height:38px">Жми как можно быстрее — так выглядит креативный процесс со стороны.</div>
            <div class="gg-tl"><span data-time>${dec(o.sec, 1)} с</span><span data-cnt>0/${need}</span></div>
            <div class="progress" style="height:18px"><i data-prog style="--p:0%;background:var(--pink);transition:width .12s"></i></div>
            <button class="gg-tap" data-tap><span class="emo">${o.e}</span><small>Старт</small></button>
          </div>
          <button class="btn block" data-home>← Отказаться</button>
          <div class="fine">Оплата приходит через 1–3 игровых дня после сдачи. Комиссия Корпорации 25% — сразу. Права на результат принадлежат клиенту, Корпорации и немного Вайботу.</div>
        </div>`);
        const tapBtn = $(body, "[data-tap]"), prog = $(body, "[data-prog]"), cnt = $(body, "[data-cnt]"), tm = $(body, "[data-time]"), msg = $(body, "[data-msg]");
        let phase = "idle";
        function start() {
          phase = "run"; taps = 0; left = (round ? Math.max(4, o.sec - 3) : o.sec) * 10;
          tapBtn.querySelector("small").textContent = round ? "Правки!" : "Твори!";
          timer = ST.every(() => {
            left--; tm.textContent = dec(Math.max(0, left) / 10, 1) + " с";
            if (left <= 0) { ST.stop(timer); fail(); }
          }, 100);
        }
        function fail() {
          phase = "done";
          tire(3, 2);
          saveGG({ fl: [...gg().fl, o.id] });
          tapBtn.disabled = true;
          msg.innerHTML = `😶 Не успел. ${esc(o.client)} ушёл к племяннику, который «тоже умеет в фотошоп».`;
          FX.shake(tapBtn);
          ST.to(() => { FX.toast("Задача сгорела. Новые будут завтра", "🕯️", 2400); home(); }, 2400);
        }
        function win() {
          phase = "done"; ST.stop(timer);
          if (!round && o.edit) {
            round = 1; phase = "idle"; need = Math.round(o.taps * 0.6);
            msg.innerHTML = `💬 Клиент: «${esc(o.edit)}»`;
            cnt.textContent = `0/${need}`; prog.style.setProperty("--p", "0%");
            tapBtn.querySelector("small").textContent = "Внести правки";
            FX.sound.pop(); FX.bump(msg);
            return;
          }
          const net = Math.round(o.pay * (1 - COMMISSION));
          const days = rnd(1, 3);
          const ghost = Math.random() < 0.1;
          addPending({ t: `Vibe Gig · фриланс «${o.t}»`, a: net, e: o.e, due: today() + days, client: o.client, ghost });
          saveGG({ fl: [...gg().fl, o.id], n: gg().n + 1 });
          G().stat("gigs");
          tire(4, 2);
          Vibe.reward({ vibiki: 15, xp: 25, silent: true });
          result({
            e: o.e, title: "Сдано!", stars: o.edit ? 4 : 5, review: o.edit ? `${o.client}: «Ну… в целом да. Но можно было лучше. Оплатим»` : `${o.client}: «Мурр» (5 звёзд)`,
            lines: [row("Гонорар", rub(o.pay)), row("🏢 Комиссия Корпорации 25%", "−" + rub(o.pay - net)), row("Придёт", `через ${days} ${plural(days, "день", "дня", "дней")}`), row("Итого", "+" + rub(net), true)],
            sub: "Деньги в разделе «Ждут оплаты». Клиент обещал. Клиенты всегда обещают.",
            next: gg().fl.length < 3 ? `<button class="btn black block" data-home>Взять ещё задачу 💻</button>` : `<div class="card c-lilac tight" style="text-align:center;font-weight:800">Все задачи на сегодня сданы 🎉</div>`,
          });
        }
        ST.on(tapBtn, "pointerdown", (e) => {
          e.preventDefault();
          if (phase === "done") return;
          if (phase === "idle") start();
          taps++;
          cnt.textContent = `${taps}/${need}`;
          prog.style.setProperty("--p", Math.min(100, Math.round((taps / need) * 100)) + "%");
          FX.bump(tapBtn); FX.haptic(5);
          if (taps % 6 === 0) FX.burst(tapBtn, { emojis: [o.e, "✨", "💡"], count: 5, spread: 90 });
          if (taps >= need) win();
        });
      }

      home();
      return () => { endStage(); T.clear(); };
    },
  });

  /* ============================================================
     2. VIBE AUTO
     ============================================================ */
  Vibe.screen("auto", {
    render() {
      return `${Vibe.ui.head("Vibe Auto", "Машина мечты в кредит мечты", Vibe.ui.vibikiPill())}<div data-body></div>`;
    },
    mount(root) {
      const T = bag();
      const body = $(root, "[data-body]");
      daily();
      function draw(html) { body.innerHTML = html; $$(body, ".stagger").forEach(restagger); }

      function view() {
        const car = myCar();
        if (!car) return shop();
        const a = ga(), fines = openFines(), osago = Vibe.subs.has("osago");
        const refuel = Math.max(100, Math.round(((100 - a.fuel) / 100) * car.tank));
        const ownDays = today() - (a.bought || today());
        const sale = Math.round((car.p * Math.max(0.5, 0.78 - Math.floor(ownDays / 30) * 0.01)) / 1000) * 1000;
        const loan = (S().loans || []).find((l) => l.name === "Автокредит");
        draw(`
        <div class="stagger">
          <div class="card ${car.col} gg-car">
            <div class="sticker" style="top:12px;right:12px">Твоя</div>
            <div class="emo float" style="font-size:96px">${car.e}</div>
            <div class="display" style="font-size:26px">${esc(car.n)}</div>
            <div class="gg-chips" style="justify-content:center;margin-top:8px"><span class="badge" style="background:#fff">🛣 ${fmt(Math.round(a.km))} км</span><span class="badge" style="background:#fff">✨ внешность +${car.look}</span><span class="badge" style="background:#fff">😊 настроение +${car.mood}</span></div>
          </div>
          <div class="card">
            <div class="gg-tl"><b>${car.electric ? "🔋 Заряд" : "⛽ Бак"}</b><span>${Math.round(a.fuel)}%</span></div>
            <div class="progress"><i style="--p:${Math.round(a.fuel)}%;background:${a.fuel < 20 ? "var(--coral)" : "var(--lime)"}"></i></div>
            <div class="gg-tl" style="margin-top:12px"><b>🫧 Чистота</b><span>${Math.round(a.clean)}%</span></div>
            <div class="progress"><i style="--p:${Math.round(a.clean)}%;background:${a.clean < 30 ? "var(--coral)" : "var(--sky)"}"></i></div>
            <div class="grid2" style="margin-top:14px">
              <button class="btn black" data-fuel ${a.fuel >= 99 ? "disabled" : ""}>${car.electric ? "🔌" : "⛽"} ${rub(refuel)}</button>
              <button class="btn" data-wash ${a.clean >= 99 ? "disabled" : ""}>🫧 Мойка 790 ₫</button>
            </div>
            ${a.clean < 30 ? `<div class="fine">Грязные номера — тоже штраф. Камеры любят чистоту.</div>` : ""}
          </div>
          <div class="card ${osago ? "c-mint" : "c-coral"} tight gg-row">
            <span class="emo wobble" style="font-size:34px">🛡️</span>
            <div style="flex:1"><b>ОСАГО ${osago ? "активно" : "не оформлено"}</b><small>${osago ? `${rub(car.osago)}/мес · списывается само` : "Без ОСАГО штрафы чаще, а в такси не пустят"}</small></div>
            <button class="btn sm ${osago ? "" : "black"}" data-osago>${osago ? "Отменить" : `${rub(car.osago)}/мес`}</button>
          </div>
          <div class="card tight gg-row" data-go="gov">
            <span class="emo" style="font-size:34px">🚔</span>
            <div style="flex:1"><b>Штрафы: ${fines.length}</b><small>${fines.length ? `к оплате ${rub(fines.reduce((s, f) => s + fineDue(f), 0))} со скидкой` : "Пока чисто. Камеры уже скучают"}</small></div>
            <span class="badge">Госвайб →</span>
          </div>
          <div class="card tight gg-row" data-go="gig">
            <span class="emo" style="font-size:34px">🚕</span>
            <div style="flex:1"><b>Таксовать в Vibe Gig</b><small>Машина должна отбивать кредит. Сама она не умеет</small></div>
            <span class="badge">→</span>
          </div>
          ${loan ? `<div class="card c-lilac tight gg-row"><span class="emo" style="font-size:30px">🏦</span><div style="flex:1"><b>Автокредит ${rub(loan.monthly)}/мес</b><small>Осталось ${loan.left} ${plural(loan.left, "платёж", "платежа", "платежей")}</small></div></div>` : ""}
          <button class="btn block" data-sell>🤝 Продать за ${rub(sale)}</button>
          ${zab(a.fuel < 20 ? "Бак почти пуст. Машина без бензина — это просто дорогой шкаф 🗄️" : "Машина +8 к внешности. Кредит −8 к сну. Баланс! ⚖️", "sly")}
          <div class="fine">Цена продажи падает на 1% каждый игровой месяц. Перекупщик Артур уверяет, что это рынок. Рынок уверяет, что это Артур.</div>
        </div>`);
        T.on($(body, "[data-fuel]"), "click", (e) => {
          if (!Vibe.pay(refuel, { title: car.electric ? "Vibe Auto · зарядка" : "Vibe Auto · заправка", emoji: car.electric ? "🔌" : "⛽", col: "c-orange", from: e.currentTarget })) return;
          saveGA({ fuel: 100 }); FX.burst(e.currentTarget, { emojis: car.electric ? ["⚡", "🔋"] : ["⛽", "💧"], count: 12 }); FX.sound.success(); view();
        });
        T.on($(body, "[data-wash]"), "click", (e) => {
          if (!Vibe.pay(790, { title: "Vibe Auto · мойка", emoji: "🫧", col: "c-sky", from: e.currentTarget })) return;
          saveGA({ clean: 100 }); FX.burst(e.currentTarget, { emojis: ["🫧", "💦", "✨"], count: 16 });
          if (Vibe.body) { const b = Vibe.body.get(); set({ body: Object.assign({}, b, { mood: clamp(b.mood + 3) }) }); }
          FX.toast("Блестит! Дождь обещали через час", "🌧️", 2400); view();
        });
        T.on($(body, "[data-osago]"), "click", (e) => {
          if (osago) { Vibe.subs.remove("osago"); FX.toast("ОСАГО отменено. Смело. Безрассудно, но смело", "😬"); }
          else { Vibe.subs.add({ id: "osago", name: "ОСАГО", e: "🛡️", price: car.osago, note: car.n }); FX.burst(e.currentTarget, { emojis: ["🛡️", "✅", "✨"], count: 12 }); FX.sound.success(); FX.toast("ОСАГО оформлено. Теперь ты защищён от всего, кроме счетов", "🛡️", 2800); }
          view();
        });
        T.on($(body, "[data-sell]"), "click", () => {
          Vibe.modal(`
            <div class="m-emo float">🤝</div>
            <div class="display" style="font-size:26px">Продать ${esc(car.n)}?</div>
            <p>Перекупщик Артур осмотрел машину за 40 секунд и сказал: «Ну… ${fmt(sale)}, и то по дружбе». Покупали за ${rub(car.p)}.</p>
            <div class="stack"><button class="btn black block" data-ok>Продать за ${rub(sale)}</button><button class="btn block" data-close>Оставить себе</button></div>
            <div class="fine">${loan ? "Автокредит при продаже машины не продаётся. Он остаётся с вами. Навсегда-ish." : "Сделка окончательная. Артур уже уехал."}</div>`, {
            sound: "pop",
            onMount(m, close) {
              m.querySelector("[data-ok]").addEventListener("click", () => {
                close();
                G().tx(`Продажа авто · ${car.n}`, sale, "🤝", "c-lime");
                Vibe.inv.remove("car"); Vibe.subs.remove("osago");
                set({ ga: null });
                Vibe.refreshCounters(); FX.sound.success(); FX.confetti({ count: 60 });
                FX.toast(`+${rub(sale)}. Минус ${rub(car.p - sale)} — цена опыта`, "🤝", 3200);
                view();
              });
            },
          });
        });
      }

      function shop() {
        const s = S();
        draw(`
        <div class="stagger">
          ${Vibe.ui.hero({ title: "Машина за 5 минут", text: "Одобрим быстрее, чем ты прочитаешь договор. Ты и не прочитаешь.", emo: "🚗", color: "c-sky", sticker: "Ставка от 21,9%" })}
          <h2 class="sec">Модели <small>взнос 20% · 5 лет</small></h2>
          <div class="stack stagger">${CARS.map((c) => {
            const down = Math.round(c.p * DOWN), L = c.p - down;
            return `<div class="card ${c.col} gg-model">
              <div class="gg-gh"><span class="emo float">${c.e}</span><div><b>${esc(c.n)}</b><small>${esc(c.d)}</small></div></div>
              <div class="gg-chips"><span class="badge" style="background:#fff">✨ внешность +${c.look}</span><span class="badge" style="background:#fff">😊 +${c.mood}</span><span class="badge" style="background:#fff">${c.electric ? "🔋 электро" : "⛽ бензин"}</span></div>
              <div class="gg-tl" style="margin-top:10px"><span class="big-num" style="font-size:24px">${rub(c.p)}</span><span style="font-weight:900">${rub(monthly(L))}/мес</span></div>
              <button class="btn black block" data-buy="${c.id}" style="margin-top:10px">В кредит · взнос ${rub(down)}</button>
            </div>`; }).join("")}</div>
          ${zab(s.job ? "Машина = +8 к внешности. Я посчитал. Ещё я посчитал проценты, но тебе не скажу 🤫" : "Без работы автокредит не дают. Но в Vibe Gig можно курьерить на велосипеде 🚲", s.job ? "sly" : "wow")}
          <div class="fine">Полная стоимость кредита указана в договоре мелким шрифтом, который мельче этого. КАСКО не навязываем. Навязываем ОСАГО — его требует закон, а не мы. Мы бы навязали КАСКО.</div>
        </div>`);
      }

      T.on(body, "click", (e) => {
        const b = e.target.closest("[data-buy]"); if (!b) return;
        const c = CARS.find((x) => x.id === b.dataset.buy);
        const s = S(), down = Math.round(c.p * DOWN), L = c.p - down, M = monthly(L);
        const fail = !s.job ? "Нет официального дохода. Подработки в Vibe Gig мы видим, но делаем вид, что не видим." : s.balance < down ? `Не хватает на первый взнос: нужно ${rub(down)}. Можно взять кредит на взнос. Шутка. Или нет.` : M > s.job.salary * 0.6 ? `Платёж ${rub(M)} больше 60% зарплаты. Даже мы считаем, что это слишком.` : null;
        Vibe.modal(`<div class="m-emo spin-slow">⏳</div><div class="display" style="font-size:24px">Проверяем кредитную историю…</div><p>И гороскоп. И лайки за 2016 год.</p>`, {
          sound: "pop",
          onMount(md, close) {
            setTimeout(() => {
              if (fail) {
                md.innerHTML = `<div class="m-emo float">🙅</div><div class="display">Отказ</div><p>${fail}</p><div class="stack">${!s.job ? `<button class="btn black block" data-close data-go="job">Искать работу 💼</button>` : ""}<button class="btn block" data-close>Понятно 🥲</button></div><div class="fine">Повторная заявка возможна через 0 дней. Мы не гордые.</div>`;
                FX.shake(md.querySelector(".m-emo"));
                return;
              }
              md.innerHTML = `
                <div class="m-emo float">${c.e}</div>
                <div class="display">Одобрено!</div>
                <div class="card flat" style="text-align:left;padding:8px 14px;margin:10px 0">
                  ${row("Цена", rub(c.p))}${row("Первый взнос 20%", rub(down))}${row("Кредит", rub(L))}${row(`Ставка ${dec(CAR_RATE * 100)}%, 5 лет`, rub(M) + "/мес", true)}
                </div>
                <div class="stack"><button class="btn grad xl block" data-take>Подписать и забрать ключи 🔑</button><button class="btn block" data-close>Подумаю</button></div>
                <div class="fine">Переплата ${rub(M * CAR_MONTHS - L)}. Это не переплата, это плата за мечту.</div>`;
              FX.sound.success(); FX.confetti({ count: 70 });
              md.querySelector("[data-take]").addEventListener("click", (ev) => {
                if (!Vibe.pay(down, { title: `Первый взнос · ${c.n}`, emoji: c.e, col: "c-sky", from: ev.currentTarget, cashback: 0 })) return;
                G().addLoan({ name: "Автокредит", amount: L, rate: CAR_RATE, months: CAR_MONTHS });
                G().tx(`Оплата автосалону · ${c.n}`, -L, c.e, "c-sky");
                Vibe.inv.add({ id: "car", cat: "car", name: c.n, e: c.e, model: c.id, price: c.p, bonus: { look: c.look, mood: c.mood } });
                set({ ga: Object.assign({}, GA0, { fuel: 60, clean: 90, bought: today(), lastDay: today() }) });
                G().stat("carsBought");
                Vibe.achieve("credit");
                Vibe.refreshCounters();
                close();
                FX.confetti(); FX.confetti({ count: 80 });
                setTimeout(() => Vibe.modal(`
                  <div class="m-emo float">🔑</div><div class="display">${esc(c.n)} — твоя!</div>
                  <p>Внешность +${c.look}, настроение +${c.mood}. Осталось оформить ОСАГО — без него в такси не пустят, а камеры полюбят.</p>
                  <div class="stack"><button class="btn black block" data-close data-osago-now>Оформить ОСАГО · ${rub(c.osago)}/мес 🛡️</button><button class="btn block" data-close>Потом</button></div>
                  <div class="fine">Первый штраф обычно приходит в течение недели. Это традиция.</div>`, {
                  sound: "levelup",
                  onMount(m2) { m2.querySelector("[data-osago-now]").addEventListener("click", () => { Vibe.subs.add({ id: "osago", name: "ОСАГО", e: "🛡️", price: c.osago, note: c.n }); FX.toast("ОСАГО оформлено", "🛡️"); if (root.isConnected) view(); }); },
                }), 500);
                if (root.isConnected) view();
              });
            }, 1300);
          },
        });
      });

      view();
      return () => T.clear();
    },
  });

  /* ============================================================
     3. ГОСВАЙБ
     ============================================================ */
  const PENSION_AGE = 65;
  const ageNow = () => 21 + Math.floor(today() / 360);
  function deduction() {
    const s = S(), gv0 = gv();
    const year = Math.floor(today() / 360);
    const ndfl = s.job ? Math.round(s.job.salary * 12 * 0.13) : 0;
    const learn = Math.min(150000, (s.tx || []).filter((t) => t.a < 0 && /Learn|курс/i.test(t.t)).reduce((x, t) => x - t.a, 0));
    const mort = (s.loans || []).filter((l) => /Ипотека/.test(l.name)).reduce((x, l) => x + Math.max(0, l.monthly * (l.months - l.left) - (l.amount / l.months) * (l.months - l.left)), 0);
    const prop = (s.stats || {}).homesBought && !gv0.propClaimed ? 2000000 : 0;
    const raw = Math.round(0.13 * (learn + Math.min(3000000, mort) + prop));
    return { year, ndfl, learn, mort: Math.round(mort), prop, raw, sum: Math.min(raw, ndfl), claimed: gv0.dedYear === year, nextIn: (year + 1) * 360 - today() };
  }

  Vibe.screen("gov", {
    render() {
      return `${Vibe.ui.head("Госвайб", "Госуслуги в формате сторис", Vibe.ui.vibikiPill())}<div data-body></div>`;
    },
    mount(root) {
      const T = bag();
      let Q = bag();
      const body = $(root, "[data-body]");
      daily();
      if (!gv().seeded) { saveGV({ seeded: true }); if (!gv().fines.length) addFine({ t: "Парковка в неположенном месте. Машины у тебя нет. Штраф есть", e: "🤷", a: 2500 }, true); }
      function draw(html) { body.innerHTML = html; $$(body, ".stagger").forEach(restagger); root.scrollTop = 0; }

      function view() {
        Q.clear(); Q = bag();
        const v = gv(), fines = v.fines.slice(0, 8), age = ageNow(), toP = Math.max(0, PENSION_AGE - age), D = deduction();
        const pass = v.passport;
        const s = S();
        const pension = Math.max(9800, Math.round(((s.job && s.job.salary) || 0) * 0.22 / 100) * 100);
        draw(`
        <div class="stagger">
          ${Vibe.ui.hero({ title: "Госвайб", text: "Все услуги онлайн. Кроме тех, за которыми нужно прийти лично.", emo: "🏛️", color: "c-lilac", sticker: "Без очередей*" })}
          <div class="card gg-stats">
            <div><b class="big-num">${age}</b><small>${plural(age, "год", "года", "лет")} тебе</small></div>
            <div><b class="big-num">${toP}</b><small>до пенсии, ${plural(toP, "год", "года", "лет")}</small></div>
            <div><b class="big-num">${openFines().length}</b><small>штрафов</small></div>
          </div>

          <h2 class="sec">Штрафы <small>−50% первые 20 дней</small></h2>
          <div class="stack stagger">${fines.length ? fines.map((f) => {
            const left = 20 - (today() - f.day);
            return `<div class="card tight gg-fine ${f.st !== "new" ? "done" : ""}">
              <div class="gg-row"><span class="emo" style="font-size:30px">${f.e}</span><div style="flex:1;min-width:0"><b>${esc(f.t)}</b><small>${f.st === "paid" ? "Оплачен ✅" : f.st === "annul" ? "Отменён по жалобе 🎉" : left > 0 ? `Скидка 50% ещё ${left} ${plural(left, "день", "дня", "дней")}` : "Скидка сгорела 🔥"}</small></div>
              <div style="text-align:right">${f.st === "new" && fineDisc(f) ? `<div class="old-price" style="font-size:12px">${rub(f.a)}</div>` : ""}<b>${rub(f.st === "new" ? fineDue(f) : f.a)}</b></div></div>
              ${f.st === "new" ? `<div class="grid2" style="margin-top:10px"><button class="btn sm black" data-payfine="${f.id}">Оплатить</button><button class="btn sm" data-contest="${f.id}" ${f.contested ? "disabled" : ""}>${f.contested ? "Обжалован 😤" : "Обжаловать"}</button></div>` : ""}
            </div>`; }).join("") : `<div class="card tight" style="font-weight:800">🕊️ Штрафов нет. Подозрительно.</div>`}</div>

          <h2 class="sec">Налоговый вычет <small>раз в игровой год</small></h2>
          <div class="card ${D.claimed ? "" : "c-mint"}">
            ${row("🎓 Обучение (Vibe Learn)", rub(D.learn))}
            ${row("🏠 Проценты по ипотеке", rub(D.mort))}
            ${row("🔑 Покупка жилья", D.prop ? rub(D.prop) : ((s.stats || {}).homesBought ? "уже получен" : "—"))}
            ${row("Лимит: твой НДФЛ за год", rub(D.ndfl))}
            ${row("К возврату 13%", rub(D.sum), true)}
            ${D.claimed ? `<div class="badge" style="margin-top:10px;background:var(--yellow)">✅ В этом году уже подано · следующий через ${D.nextIn} ${plural(D.nextIn, "день", "дня", "дней")}</div>`
              : `<button class="btn black block" data-deduct style="margin-top:12px" ${D.sum > 0 ? "" : "disabled"}>${D.sum > 0 ? `Подать заявление · ${rub(D.sum)}` : D.ndfl ? "Пока нечего вычитать" : "Нужен официальный доход"}</button>`}
            <div class="fine" style="color:var(--ink);opacity:.7">Вычет приходит через 5 игровых дней. Остаток имущественного вычета сгорает — так написано в пункте 14.3.7, который никто не читал.</div>
          </div>

          <h2 class="sec">Документы</h2>
          <div class="card tight gg-row">
            <span class="emo wobble" style="font-size:36px">🛂</span>
            <div style="flex:1"><b>Паспорт</b><small>${!pass ? `Фото вклеено в 20. Сейчас тебе ${age}. Пора менять` : pass.st === "booked" ? `Запись: ${pass.date} · Vibe HQ, окно №${pass.win}` : pass.st === "done" ? "Действителен. Фото ужасное — всё по правилам" : "Запись пропущена. Госпошлина сгорела"}</small></div>
            ${!pass || pass.st === "missed" ? `<button class="btn sm black" data-passport>Оформить</button>` : `<span class="badge">${pass.st === "done" ? "✅" : "⏳"}</span>`}
          </div>
          <div class="card tight gg-row" data-spravka style="margin-top:12px">
            <span class="emo" style="font-size:36px">📄</span>
            <div style="flex:1"><b>Справка о том, что ты — это ты</b><small>Выдаётся при предъявлении тебя</small></div>
            <span class="badge" style="background:var(--yellow)">0 ₫</span>
          </div>

          <h2 class="sec">Возраст и пенсия</h2>
          <div class="card c-yellow">
            <div class="gg-tl"><b>Тебе ${age} ${plural(age, "год", "года", "лет")}</b><span>пенсия в ${PENSION_AGE}*</span></div>
            <div class="progress" style="margin-top:8px"><i style="--p:${Math.round((age / PENSION_AGE) * 100)}%;background:var(--violet)"></i></div>
            <div style="font-weight:800;margin-top:10px;font-size:14px">До пенсии ${toP} ${plural(toP, "год", "года", "лет")} = ${fmt(toP * 360)} игровых дней = ${fmt(toP * 360)} реальных часов.</div>
            <div style="font-weight:700;margin-top:6px;font-size:13px">Прогноз пенсии: ≈ ${rub(pension)}/мес в ценах того года, когда это станет смешно.</div>
            <button class="btn block" data-pension style="margin-top:12px">Перенести пенсию на попозже</button>
            <div class="fine" style="color:var(--ink);opacity:.7">*Пенсионный возраст может быть изменён без уведомления. Возраст считается так: старт в 21 год, +1 год каждые 360 игровых дней. Стареть в приложении быстрее, но не обиднее.</div>
          </div>
          <div style="margin-top:18px">${zab("Госвайб знает о тебе всё. Ну, почти всё — остальное знаю я 💜", "sly")}</div>
          <div class="fine">Госвайб — вымышленный сервис вымышленного города. Любые совпадения с реальными очередями случайны и неизбежны.</div>
        </div>`);
      }

      T.on(body, "click", (e) => {
        const t = e.target.closest("[data-payfine],[data-contest],[data-deduct],[data-passport],[data-spravka],[data-pension],[data-qback]");
        if (!t) return;
        if (t.dataset.payfine) {
          const f = gv().fines.find((x) => x.id === t.dataset.payfine); if (!f || f.st !== "new") return;
          const amt = fineDue(f);
          if (!Vibe.pay(amt, { title: "Госвайб · штраф", emoji: "🚔", col: "c-coral", from: t })) return;
          saveGV({ fines: gv().fines.map((x) => (x.id === f.id ? Object.assign({}, x, { st: "paid" }) : x)) });
          FX.burst(t, { emojis: ["✅", "🏛️", "✨"], count: 12 }); FX.sound.success();
          FX.toast(fineDisc(f) ? `Оплачено со скидкой. Сэкономил ${rub(f.a - amt)}. И кэшбек на штраф!` : "Оплачено. Государство благодарит. Сухо", "✅", 2800);
          view(); return;
        }
        if (t.dataset.contest) { queue(t.dataset.contest); return; }
        if (t.hasAttribute("data-deduct")) { deduct(); return; }
        if (t.hasAttribute("data-passport")) { passport(); return; }
        if (t.hasAttribute("data-spravka")) { FX.bump(t); FX.toast("Для справки нужна справка. Справку о справке выдают в окне №0", "📄", 3000); return; }
        if (t.hasAttribute("data-pension")) { FX.shake(t); FX.toast("Уже перенесли. За тебя. Не благодари 🫡", "🏛️", 2600); return; }
        if (t.hasAttribute("data-qback")) { FX.toast("Вы покинули очередь. Ваше место занял «я только спросить»", "🚶", 2600); view(); }
      });

      /* ---------- Электронная очередь ---------- */
      function queue(fid) {
        Q.clear(); Q = bag();
        const f = gv().fines.find((x) => x.id === fid); if (!f) return;
        let pos = rnd(130, 170), alive = true, cooldown = false, prompt = null;
        const EVENTS = ["Окно №3 ушло на обед 🍲", "«Я только спросить» пролез вперёд 🙋", "Обновление системы. Не волнуйтесь 🔄", "Принтер зажевал чью-то судьбу 🖨️", "Оператор ищет печать 🔍"];
        draw(`
        <div class="stagger">
          <div class="card c-lilac" style="text-align:center">
            <div style="font-weight:800">Электронная очередь · жалоба на штраф</div>
            <div class="gg-q"><small>вы</small><b data-pos>${pos}</b><small>-й</small></div>
            <div data-ev style="font-weight:800;font-size:13px;min-height:36px">Не закрывайте страницу. Не обновляйте страницу. Обновляйте страницу.</div>
            <div class="gg-qlayer" data-ql></div>
          </div>
          <div class="card tight gg-row"><span class="emo" style="font-size:28px">${f.e}</span><div style="flex:1"><b>${esc(f.t)}</b><small>${rub(f.a)}</small></div></div>
          <button class="btn black xl block" data-refresh style="margin-top:12px">🔄 Обновить</button>
          <button class="btn block" data-qback style="margin-top:12px">Сдаться</button>
          <div class="fine">Если на «Вы ещё здесь?» не ответить за 2 секунды, сессия истекает и вы отправляетесь в конец очереди. Это для вашего удобства.</div>
        </div>`);
        const posEl = $(body, "[data-pos]"), evEl = $(body, "[data-ev]"), ql = $(body, "[data-ql]");
        const upd = (d) => { pos = Math.max(0, pos + d); posEl.textContent = pos; if (d < 0) FX.bump(posEl); if (pos <= 0 && alive) finish(); };
        Q.every(() => { if (!alive) return; upd(-rnd(0, 2)); if (Math.random() < 0.18) { const m = pick(EVENTS); evEl.textContent = m; if (/пролез/.test(m)) upd(2); } }, 1100);
        const ask = () => {
          if (!alive) return;
          prompt = document.createElement("button");
          prompt.className = "btn pink gg-still";
          prompt.textContent = "Вы ещё здесь? 👋";
          ql.appendChild(prompt);
          let ok = false;
          prompt.addEventListener("pointerdown", () => { ok = true; FX.burst(prompt, { emojis: ["👋", "✅"], count: 8 }); prompt.remove(); upd(-rnd(3, 6)); FX.sound.pop(); });
          Q.to(() => { if (ok || !alive) return; prompt.remove(); upd(25); evEl.textContent = "Сессия истекла ⌛ +25 к очереди"; FX.shake(posEl); }, 2000);
          Q.to(ask, rnd(3800, 6000));
        };
        Q.to(ask, rnd(2500, 4000));
        Q.on($(body, "[data-refresh]"), "click", (e) => {
          if (!alive) return;
          if (cooldown) { FX.shake(e.currentTarget); return; }
          if (Math.random() < 0.08) { cooldown = true; evEl.textContent = "Слишком частые обновления. Подождите ⏳"; Q.to(() => (cooldown = false), 1500); FX.shake(e.currentTarget); return; }
          upd(-rnd(1, 4)); FX.haptic(6);
        });
        function finish() {
          alive = false; Q.clear(); Q = bag();
          const win = Math.random() < 0.55;
          saveGV({ fines: gv().fines.map((x) => (x.id === fid ? Object.assign({}, x, win ? { st: "annul", contested: true } : { contested: true }) : x)) });
          Vibe.modal(win ? `
            <div class="m-emo float">🎉</div><div class="display">Штраф отменён!</div>
            <p>Оператор посмотрел на фото, потом на вас, потом снова на фото. «Ладно». Это победа.</p>
            <button class="btn black block" data-close>Справедливость существует 🏛️</button>` : `
            <div class="m-emo wobble">🧾</div><div class="display">Оставлено в силе</div>
            <p>«Камера не ошибается». Камера сфотографировала голубя, но голубь — это вы. ${fineDisc(f) ? "Скидка 50% сохранилась, мы же не звери." : "Скидка, увы, уже сгорела."}</p>
            <button class="btn black block" data-close>Понятно 🥲</button>`, { sound: win ? "levelup" : "pop" });
          if (win) { FX.confetti(); Vibe.reward({ vibiki: 40, xp: 40 }); } else Vibe.reward({ vibiki: 10, xp: 15, silent: true });
          view();
        }
      }

      /* ---------- Налоговый вычет ---------- */
      function deduct() {
        const D = deduction(); if (D.claimed || D.sum <= 0) return;
        const steps = ["Проверяем документы…", "Сверяем с базой…", "Ищем повод отказать…", "Повод не найден 😤"];
        Vibe.modal(`<div class="m-emo spin-slow">🏛️</div><div class="display" style="font-size:24px" data-st>${steps[0]}</div><p>Заявление №${rnd(100000, 999999)}</p>`, {
          sound: "pop",
          onMount(md, close) {
            steps.slice(1).forEach((st, i) => setTimeout(() => { const el = md.querySelector("[data-st]"); if (el) { el.textContent = st; FX.bump(el); } }, 700 * (i + 1)));
            T.to(() => {
              saveGV({ dedYear: D.year, propClaimed: gv().propClaimed || D.prop > 0 });
              addPending({ t: "Госвайб · налоговый вычет", a: D.sum, e: "🏛️", due: today() + 5, gov: true });
              md.innerHTML = `<div class="m-emo float">💸</div><div class="display">Одобрено!</div><p>${rub(D.sum)} придут через 5 игровых дней. Государство тоже умеет в кэшбек, просто медленно.</p><button class="btn black block" data-close>Жду 🫡</button>`;
              FX.confetti(); FX.sound.success();
              Vibe.reward({ vibiki: 30, xp: 40 });
              if (root.isConnected) view();
            }, 3000);
          },
        });
      }

      /* ---------- Паспорт за 3 шага ---------- */
      function passport() {
        let tries = 0;
        const dots = (n) => `<div class="gg-steps">${[1, 2, 3].map((i) => `<i class="${i < n ? "ok" : i === n ? "on" : ""}">${i < n ? "✓" : i}</i>`).join("")}</div>`;
        Vibe.modal("", {
          sound: "pop",
          onMount(md, close) {
            function step1() {
              md.innerHTML = `${dots(1)}<div class="m-emo float">📸</div><div class="display" style="font-size:24px">Шаг 1. Фото</div><p>Нейтральное выражение лица, белый фон, никаких эмоций. Как в понедельник.</p><button class="btn black block" data-ph>Сделать селфи</button>`;
              md.querySelector("[data-ph]").addEventListener("click", (e) => {
                tries++;
                if (tries < 2) { FX.shake(e.currentTarget); md.querySelector("p").textContent = "Отклонено: на фото вы улыбаетесь. Гражданам улыбаться не положено. Ещё раз."; return; }
                FX.burst(e.currentTarget, { emojis: ["📸", "✅"], count: 10 }); FX.sound.success();
                setTimeout(step2, 400);
              });
            }
            function step2() {
              md.innerHTML = `${dots(2)}<div class="m-emo wobble">🪪</div><div class="display" style="font-size:24px">Шаг 2. Подтвердите личность</div><p>Чем докажете, что вы — это вы?</p><div class="stack"><button class="btn block" data-id="p">Паспортом</button><button class="btn block" data-id="j">Справкой из ЖЭКа</button><button class="btn block" data-id="s">Кодом из СМС</button></div>`;
              md.addEventListener("click", function h(e) {
                const b = e.target.closest("[data-id]"); if (!b) return;
                if (b.dataset.id === "p") { FX.shake(b); b.textContent = "Чтобы получить паспорт, нужен паспорт 🙃"; return; }
                if (b.dataset.id === "j") { FX.shake(b); b.textContent = "ЖЭК на обеде с 2014 года 🍲"; return; }
                md.removeEventListener("click", h);
                FX.burst(b, { emojis: ["📲", "✅"], count: 10 }); FX.sound.success();
                setTimeout(step3, 400);
              });
            }
            function step3() {
              const d = today();
              const slots = [{ dd: 3, h: 9, m: 0 }, { dd: 5, h: 14, m: 40 }, { dd: 41, h: 11, m: 0 }];
              md.innerHTML = `${dots(3)}<div class="m-emo float">🗓️</div><div class="display" style="font-size:24px">Шаг 3. Госпошлина и запись</div><p>Госпошлина 1 500 ₫. Выдача — лично, в Vibe HQ. Свободные окна:</p><div class="stack">${slots.map((x, i) => `<button class="btn ${i ? "" : "black"} block" data-slot="${i}">Через ${x.dd} ${plural(x.dd, "день", "дня", "дней")} · ${String(x.h).padStart(2, "0")}:${String(x.m).padStart(2, "0")}</button>`).join("")}</div><div class="fine">Неявка = госпошлина сгорает. Явка = вы молодец.</div>`;
              md.querySelectorAll("[data-slot]").forEach((b) => b.addEventListener("click", (e) => {
                const x = slots[+b.dataset.slot];
                if (!Vibe.pay(1500, { title: "Госвайб · госпошлина за паспорт", emoji: "🛂", col: "c-lilac", from: e.currentTarget })) return;
                const day = d + x.dd, win = rnd(1, 12);
                Vibe.sched.add({ day, hour: x.h, min: x.m, dur: 120, title: "Получить паспорт", e: "🛂", place: "hq", kind: "gov_passport", go: "gov" });
                const info = (day % 30) + 1;
                saveGV({ passport: { st: "booked", day, win, date: `${info}-е число, ${String(x.h).padStart(2, "0")}:${String(x.m).padStart(2, "0")}` } });
                md.innerHTML = `<div class="m-emo float">🎉</div><div class="display">Записано!</div><p>Приходи в Vibe HQ к окну №${win}. Событие уже в календаре — доберись туда через Vibe Maps.</p><button class="btn black block" data-close>Приду 🫡</button>`;
                FX.confetti({ count: 80 });
                if (root.isConnected) view();
              }));
            }
            step1();
          },
        });
      }

      view();
      return () => { Q.clear(); T.clear(); };
    },
  });

  /* ---------- Стили ---------- */
  const css = `
  .gg-zab { display:flex; align-items:flex-end; gap:8px; }
  .gg-zab svg { flex:0 0 auto; }
  .gg-bub { flex:1; background:#fff; border:var(--line); border-radius:20px 20px 20px 6px; padding:10px 14px; font-weight:700; font-size:13px; box-shadow:var(--shadow-sm); }
  .gg-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; text-align:center; margin-top:14px; }
  .gg-stats > div { display:flex; flex-direction:column; align-items:center; min-width:0; }
  .gg-stats .big-num { font-size:24px; white-space:nowrap; }
  .gg-stats small { font-size:11px; font-weight:800; color:var(--muted); }
  .gg-stats .gg-en { grid-column:1/-1; align-items:stretch; text-align:left; font-size:12px; font-weight:800; gap:4px; margin-top:4px; }
  .gg-gig p { font-weight:700; font-size:13px; margin:10px 0; }
  .gg-gh { display:flex; align-items:center; gap:12px; }
  .gg-gh > .emo { font-size:40px; width:58px; height:58px; display:grid; place-items:center; background:#fff; border:var(--line); border-radius:18px; flex:0 0 auto; }
  .gg-gh b { display:block; font-size:17px; font-weight:900; }
  .gg-gh small { display:block; font-size:12px; font-weight:700; opacity:.75; }
  .gg-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
  .gg-fl { display:grid; gap:8px; margin:10px 0 4px; }
  .gg-flr { display:flex; align-items:center; gap:10px; background:#fff; border:2px solid var(--ink); border-radius:16px; padding:8px 10px; }
  .gg-flr > .emo { font-size:26px; }
  .gg-flr > div { flex:1; min-width:0; }
  .gg-flr b { display:block; font-size:13px; font-weight:900; line-height:1.15; }
  .gg-flr small { font-size:11px; font-weight:700; color:var(--muted); }
  .gg-flr.done { opacity:.55; }
  .gg-offer { text-align:center; padding-top:22px; }
  .gg-rc { display:flex; justify-content:space-between; gap:10px; font-weight:700; font-size:14px; padding:5px 0; }
  .gg-rc span:first-child { color:var(--muted); }
  .gg-rc.b { border-top:2px dashed rgba(14,14,18,.15); margin-top:4px; padding-top:9px; font-weight:900; font-size:17px; }
  .gg-rc.b span:first-child { color:var(--ink); }
  .gg-note { margin-top:10px; background:var(--yellow); border:2px solid var(--ink); border-radius:14px; padding:8px 12px; font-size:12px; font-weight:800; }
  .gg-mapwrap { position:relative; }
  .gg-map { height:330px; }
  .gg-hud { position:absolute; left:10px; right:10px; top:10px; background:#fff; border:var(--line); border-radius:16px; padding:8px 12px; box-shadow:var(--shadow-sm); z-index:3; pointer-events:none; }
  .gg-hud b { display:block; font-size:14px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .gg-hud small { display:block; font-size:11px; font-weight:800; color:var(--muted); margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .gg-hud .progress { height:10px; }
  .gg-layer { position:absolute; inset:0; z-index:4; pointer-events:none; }
  .gg-hz { position:absolute; transform:translate(-50%,-50%); width:68px; height:68px; border-radius:50%; border:3px solid var(--ink); box-shadow:0 4px 0 var(--ink); display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:auto; animation:gg-pop .35s var(--spring) both, gg-throb .5s ease-in-out .35s infinite alternate; touch-action:manipulation; }
  .gg-hz.bad { background:var(--sky); } .gg-hz.good { background:var(--yellow); }
  .gg-hz .emo { font-size:28px; }
  .gg-hz small { font-size:9px; font-weight:900; margin-top:-2px; }
  .gg-hz.hit { animation:gg-out .3s ease both; }
  .gg-hz.gone { animation:gg-fade .3s ease both; }
  @keyframes gg-pop { from { transform:translate(-50%,-50%) scale(0) rotate(-30deg); } }
  @keyframes gg-throb { to { transform:translate(-50%,-50%) scale(1.1); } }
  @keyframes gg-out { to { transform:translate(-50%,-50%) scale(1.8); opacity:0; } }
  @keyframes gg-fade { to { transform:translate(-50%,-50%) scale(.4); opacity:0; } }
  .gg-score { margin-top:12px; font-size:13px; font-weight:700; text-align:center; }
  .gg-ask { margin-top:12px; }
  .gg-stars { font-size:28px; margin-top:6px; letter-spacing:2px; }
  .gg-stars span { opacity:.35; }
  .gg-tl { display:flex; justify-content:space-between; align-items:center; gap:10px; font-weight:800; font-size:14px; margin-bottom:6px; }
  .gg-tap { width:150px; height:150px; border-radius:50%; border:4px solid var(--ink); background:var(--pink); box-shadow:0 6px 0 var(--ink); margin:18px auto 4px; display:flex; flex-direction:column; align-items:center; justify-content:center; touch-action:manipulation; user-select:none; -webkit-user-select:none; }
  .gg-tap .emo { font-size:58px; }
  .gg-tap small { font-weight:900; font-size:13px; }
  .gg-tap:active { transform:translateY(4px); box-shadow:0 2px 0 var(--ink); }
  .gg-tap[disabled] { opacity:.5; }
  .gg-car { text-align:center; padding-top:22px; }
  .gg-model .gg-gh > .emo { font-size:36px; }
  .gg-row { display:flex; align-items:center; gap:12px; }
  .gg-row b { display:block; font-size:15px; font-weight:900; }
  .gg-row small { display:block; font-size:12px; font-weight:700; color:var(--muted); }
  .c-coral.gg-row small, .c-mint.gg-row small, .c-lilac.gg-row small { color:var(--ink); opacity:.7; }
  .gg-row[data-go], .gg-row[data-spravka] { cursor:pointer; }
  .gg-fine.done { opacity:.55; box-shadow:none; }
  .gg-q { display:flex; align-items:baseline; justify-content:center; gap:4px; margin:6px 0; }
  .gg-q b { font-family:var(--font-display); font-weight:400; font-size:88px; line-height:1; display:inline-block; }
  .gg-q small { font-weight:900; font-size:16px; }
  .gg-qlayer { min-height:52px; display:grid; place-items:center; }
  .gg-still { animation:gg-pop2 .35s var(--spring) both; }
  @keyframes gg-pop2 { from { transform:scale(0) rotate(-10deg); } }
  .gg-steps { display:flex; justify-content:center; gap:8px; margin-bottom:10px; }
  .gg-steps i { font-style:normal; width:30px; height:30px; border-radius:50%; border:2.5px solid var(--ink); display:grid; place-items:center; font-weight:900; font-size:13px; background:#fff; }
  .gg-steps i.on { background:var(--yellow); transform:scale(1.15); }
  .gg-steps i.ok { background:var(--lime); }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
