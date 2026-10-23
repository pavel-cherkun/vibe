/* ============================================================
   Игровой движок жизни: календарь, зарплата, счета, кредиты,
   работа и повышения, жильё, ежедневные задания, цели жизни,
   ежедневный бонус и сводка «Пока тебя не было».

   Время: 1 игровая минута = 1 реальная секунда (день = 24 мин). Месяц = 30 дней.
   Всё считается по меткам времени, поэтому жизнь идёт и офлайн.
   ============================================================ */
(function () {
  const DAY_MS = 24 * 60 * 1000;     // 1 игровая минута = 1 реальная секунда, день = 24 минуты
  const START_MIN = 9 * 60;           // жизнь начинается в 09:00
  const MONTHS = ["ноября", "декабря", "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября"];
  const MONTHS_NOM = ["Ноябрь", "Декабрь", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь"];
  const DAILY_COST = 150;             // оценка бытовых трат в день — только для прогноза «денег хватит на N дн.»
  const OVERDRAFT = 0.01;             // проценты за минус на карте, в день
  const BONUS_DIV = 300;              // премия за задачу ≈ оклад / 300 (раньше /120 — премия была +50% к окладу)
  // День зарплаты: Корпорация «для удобства» списывает все автоплатежи в этот же день
  const PAYDAY = 30;
  // ЖКХ (в день зарплаты): зависит от жилья (комната дешевле, своя квартира — дороже)
  const utilities = (h) => (h && h.own ? 4500 : Math.round((1500 + ((h && h.rent) || 0) * 0.05) / 100) * 100);
  const PHONE = 590;                  // связь, 5-го
  const TAX = 0.13;
  const LEVEL_TITLES = ["", "Младший", "", "Старший", "Ведущий", "Руководитель направления:", "Директор по"];
  // Перки навыков (skills.js): множители и прибавки, мягко — если модуля нет
  const SK = { mult: (k) => (Vibe.skills ? Vibe.skills.mult(k) : 1), add: (k) => (Vibe.skills ? Vibe.skills.add(k) : 0) };
  const netOf = (j) => Math.round(j.salary * SK.mult("salary") * (1 - TAX + SK.add("taxCut")));

  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const g = () => S().game || {};
  const listeners = new Set();

  /* ---------- Время ---------- */
  // Миграция старых сохранений: раньше игровой день длился реальный час. Пересчитываем start так,
  // чтобы текущая игровая минута сохранилась, а не умножилась в 2,5 раза. Заодно — постоянный сид мира.
  (function migrate() {
    const gg = S().game;
    if (!gg || !gg.start) return;
    const patch = {};
    if (!gg.dayMs) { const now = Date.now(); patch.start = now - (now - gg.start) * (DAY_MS / (60 * 60 * 1000)); patch.dayMs = DAY_MS; }
    else if (gg.dayMs !== DAY_MS) { const now = Date.now(); patch.start = now - (now - gg.start) * (DAY_MS / gg.dayMs); patch.dayMs = DAY_MS; }
    if (gg.seed == null) patch.seed = Math.floor(gg.start / 60000) >>> 0;
    if (Object.keys(patch).length) set({ game: Object.assign({}, gg, patch) });
  })();
  function minutesNow(ts = Date.now()) {
    const start = g().start || ts;
    return START_MIN + ((ts - start) / DAY_MS) * 1440;
  }
  function info(ts) {
    const m = minutesNow(ts);
    const day = Math.floor(m / 1440);
    const mm = Math.floor(m % 1440);
    const dom = (day % 30) + 1;
    const month = Math.floor(day / 30) % 12;
    return {
      day, dom, month, hour: Math.floor(mm / 60), minute: mm % 60,
      time: `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`,
      date: `${dom} ${MONTHS[month]}`,
      monthName: MONTHS_NOM[month],
      label: `${dom} ${MONTHS[month]} · ${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`,
      night: mm < 7 * 60 || mm >= 23 * 60,
      workHours: mm >= 9 * 60 && mm < 19 * 60,
    };
  }
  // Сколько реальных минут до наступления игрового дня d
  const realMinTo = (day) => Math.max(0, ((day * 1440 - START_MIN) / 1440) * (DAY_MS / 60000) - (Date.now() - (g().start || Date.now())) / 60000);

  /* ---------- Транзакция ---------- */
  // day — игровой день события (для догоняющего тика: деньги попадают в свой месяц)
  function tx(title, amount, emoji, col, day) {
    const s = S();
    set({ balance: s.balance + amount, tx: [{ t: title, c: emoji, a: amount, d: info().date, col }, ...s.tx].slice(0, 60) });
    if (Vibe.emit) Vibe.emit("tx", { title: String(title || ""), amount, day });
  }
  const stat = (k, n = 1) => set({ stats: Object.assign({}, S().stats, { [k]: ((S().stats || {})[k] || 0) + n }) });

  /* ---------- События одного игрового дня ---------- */
  function dayEvents(day) {
    const s = S();
    const dom = (day % 30) + 1;
    const ev = [];
    // Бытовые траты
    // Бытовые траты больше не списываются абстрактно: платишь за то, что реально купил
    // (а на автопилоте — за перекусы и метро, см. body.js). Событие нужно для учёта простоя на работе.
    ev.push({ kind: "daily", title: "", a: 0, quiet: true });
    // Зарплата приходит первой — и тут же уходит каскадом автоплатежей
    if (s.job) {
      const net = netOf(s.job);
      if (dom === 15) ev.push({ kind: "salary", title: `Аванс · ${s.job.company}`, a: Math.round(net * 0.4), e: "💸", col: "c-lime" });
      if (dom === 30) {
        const bonus = s.job.bonus || 0;
        ev.push({ kind: "salary", title: `Зарплата · ${s.job.company}`, a: Math.round(net * 0.6), e: "💰", col: "c-lime" });
        if (bonus) ev.push({ kind: "bonus", title: "Премия за задачи", a: bonus, e: "🏆", col: "c-yellow" });
      }
    }
    // Аренда и ЖКХ — в день зарплаты
    if (dom === PAYDAY && s.home && s.home.rent) ev.push({ kind: "rent", title: `Аренда · ${s.home.title}`, a: -s.home.rent, e: "🔑", col: "c-mint" });
    if (dom === PAYDAY) ev.push({ kind: "bill", title: "ЖКХ (опять подорожало)", a: -utilities(s.home), e: "💡", col: "c-yellow" });
    if (Vibe.world) Vibe.world.dayEvents(dom).forEach((x) => ev.push(x));
    // Кредиты
    (s.loans || []).forEach((l) => { if (l.left > 0 && dom === PAYDAY) ev.push({ kind: "loan", title: `Платёж по кредиту «${l.name}»`, a: -l.monthly, e: "🏦", col: "c-pink", loan: l.id }); });
    // Проценты за минус
    if (s.balance < 0) ev.push({ kind: "overdraft", title: `Проценты за минус на карте (${String(OVERDRAFT * 100).replace(".", ",")}% в день)`, a: -Math.ceil(Math.abs(s.balance) * OVERDRAFT), e: "🫠", col: "c-coral", quiet: true });
    return ev;
  }

  function applyEvent(ev, day) {
    if (ev.kind === "jar") { set({ jar: (S().jar || 0) + ev.jar + Math.round(ev.jar * SK.add("jarRate") / 0.12) }); return; }
    if (ev.a) tx(ev.title, ev.a, ev.e, ev.col, day);
    const s = S();
    if (ev.kind === "salary") { stat("salaries"); if (Vibe.body) Vibe.body.effect("salary", { quiet: true }); }
    if ((ev.kind === "rent" || ev.kind === "bill" || ev.kind === "loan") && Vibe.body) Vibe.body.effect("bill", { quiet: true });
    if (ev.kind === "rent") stat(S().balance >= 0 ? "rentPaid" : "rentLate");
    if (ev.kind === "bonus") set({ job: Object.assign({}, s.job, { bonus: 0 }) });
    if (ev.kind === "loan") {
      set({ loans: s.loans.map((l) => (l.id === ev.loan ? Object.assign({}, l, { left: l.left - 1 }) : l)).filter((l) => l.left > 0) });
      if (!S().loans.length) stat("loansClosed");
    }
    // Производительность на работе медленно падает, если не работать
    if (s.job && ev.kind === "daily") {
      const idle = day - (s.job.lastTaskDay || s.job.sinceDay || 0);
      if (idle > 2) set({ job: Object.assign({}, S().job, { perf: Math.max(0, (S().job.perf || 0) - 4) }) });
    }
  }

  /* ---------- Тик: обработать все наступившие дни ---------- */
  function tick({ silent = false } = {}) {
    const s = S();
    if (!s.profile || !g().start) return [];
    const nowDay = info().day;
    let last = g().processedDay ?? 0;
    const events = [];
    let guard = 0;
    Vibe.state.batch(() => {
      while (last < nowDay && guard++ < 400) {
        last++;
        dayEvents(last).forEach((ev) => { applyEvent(ev, last); events.push(Object.assign({ day: last }, ev)); });
      }
      if (events.length) set({ game: Object.assign({}, g(), { processedDay: last }) });
    });
    if (events.length && !silent) announce(events);
    if (events.length) listeners.forEach((fn) => fn(events));
    return events;
  }

  // Показать события: онлайн — по одному, офлайн — сводкой
  function announce(events) {
    // День зарплаты (30-е): зарплата и каскад автоплатежей одним экраном
    const pay = events.find((e) => e.kind === "salary" && /^Зарплата/.test(e.title));
    if (pay && Vibe.month && new Set(events.map((e) => e.day)).size <= 2) { Vibe.refreshCounters(); return Vibe.month.payday(events); }
    const loud = events.filter((e) => !e.quiet);
    // Тихие служебные события (daily, a:0) не считаются: сводка — только про деньги
    const money = events.filter((e) => e.a);
    if (!money.length) return;
    if (money.length > 3) return summary(money, events);
    if (Vibe.busy && Vibe.busy() && loud.some((e) => e.kind === "salary")) return setTimeout(() => announce(events), 1500);
    loud.forEach((ev, i) => setTimeout(() => {
      if (ev.kind === "salary") {
        FX.confetti();
        Vibe.modal(`<div class="m-emo float">${ev.e}</div><div class="display">+${Vibe.rub(ev.a)}</div><p>${Vibe.esc(ev.title)}. НДФЛ 13% уже вычтен. Не трать всё сразу. Или трать.</p><button class="btn black block" data-close>Я богат 🤑</button>`, { sound: "success" });
      } else FX.toast(`${ev.title}: ${ev.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(ev.a))}`, ev.e, 3000);
    }, i * 900));
    Vibe.refreshCounters();
  }

  function summary(events, all = events) {
    if (Vibe.busy && Vibe.busy()) return setTimeout(() => summary(events, all), 1500);
    const plus = events.filter((e) => e.a > 0).reduce((s, e) => s + e.a, 0);
    const minus = events.filter((e) => e.a < 0).reduce((s, e) => s + e.a, 0);
    const days = new Set(all.map((e) => e.day)).size;
    const groups = {};
    events.forEach((e) => { const k = e.kind === "daily" ? "Бытовые траты" : e.title; groups[k] = groups[k] || { e: e.e, a: 0, n: 0 }; groups[k].a += e.a; groups[k].n++; });
    const rows = Object.entries(groups).filter(([, v]) => v.a).sort((a, b) => b[1].a - a[1].a);
    if (plus > 0) FX.confetti();
    Vibe.modal(`
      <div class="m-emo float">⏳</div>
      <div class="display" style="font-size:26px">Пока тебя не было</div>
      <p>Прошло ${days} ${plural(days, "день", "дня", "дней")}. Жизнь не стояла на месте.</p>
      <div style="text-align:left;display:grid;gap:6px;max-height:40vh;overflow:auto;margin-bottom:14px">
        ${rows.map(([t, v]) => `<div style="display:flex;gap:10px;align-items:center;font-weight:700;font-size:14px"><span style="font-size:22px">${v.e}</span><span style="flex:1">${Vibe.esc(t)}${v.n > 1 ? ` ×${v.n}` : ""}</span><b style="color:${v.a > 0 ? "#12a150" : "inherit"}">${v.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(v.a))}</b></div>`).join("")}
      </div>
      <div style="display:flex;justify-content:space-between;font-weight:900;margin-bottom:14px"><span>Итого</span><span style="color:${plus + minus >= 0 ? "#12a150" : "#e5333d"}">${plus + minus >= 0 ? "+" : "−"}${Vibe.rub(Math.abs(plus + minus))}</span></div>
      <button class="btn black block" data-close>Понятно</button>`, { sound: plus > 0 ? "success" : "pop" });
  }
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);

  /* ---------- Ближайшие события (для главной) ---------- */
  function upcoming(limit = 4) {
    const s = S();
    const now = info();
    const res = [];
    const nextDom = (dom) => { for (let d = now.day + 1; d <= now.day + 31; d++) if ((d % 30) + 1 === dom) return d; return null; };
    const add = (dom, t, a, e) => { const d = nextDom(dom); if (d != null) res.push({ in: d - now.day, day: d, t, a, e, real: Math.round(realMinTo(d)) }); };
    if (s.job) { const net = netOf(s.job); add(15, "Аванс", Math.round(net * 0.4), "💸"); add(30, "Зарплата", Math.round(net * 0.6) + (s.job.bonus || 0), "💰"); }
    if (s.home && s.home.rent) add(PAYDAY, "Аренда", -s.home.rent, "🔑");
    add(PAYDAY, "ЖКХ", -utilities(s.home), "💡");
    (s.loans || []).forEach((l) => add(PAYDAY, `Кредит «${l.name}»`, -l.monthly, "🏦"));
    return res.sort((a, b) => a.in - b.in).slice(0, limit);
  }
  // На сколько дней хватит денег без дохода
  function runway() {
    const s = S();
    const perDay = DAILY_COST + ((s.home && s.home.rent) || 0) / 30 + utilities(s.home) / 30 + (s.loans || []).reduce((a, l) => a + l.monthly / 30, 0);
    return Math.max(0, Math.floor(s.balance / perDay));
  }

  /* ---------- Работа ---------- */
  function jobTitle(j) {
    const pre = LEVEL_TITLES[Math.min(j.level || 1, LEVEL_TITLES.length - 1)] || "";
    return pre ? pre + " " + j.title.charAt(0).toLowerCase() + j.title.slice(1) : j.title;
  }
  function setJob(j) {
    const p = Vibe.map.place("office:" + j.company);
    const hh = SK.mult("offer");
    if (hh > 1 && j.salary) { j = Object.assign({}, j, { salary: Math.round(j.salary * hh / 1000) * 1000 }); setTimeout(() => FX.toast(`Хедхантер: выбил оклад ${Vibe.rub(j.salary)} (+${Math.round((hh - 1) * 100)}%)`, "🎯", 3000), 600); }
    set({ job: Object.assign({ level: 2, perf: 0, bonus: 0, tasksDay: -1, tasksDone: 0, sinceDay: info().day, x: p.x, y: p.y, district: p.district }, j) });
    stat("jobs");
    Vibe.achieve("employed");
  }
  function quitJob() { set({ job: null }); }
  const TASKS_PER_DAY = 3;
  function tasksLeft() {
    const j = S().job; if (!j) return 0;
    return j.tasksDay === info().day ? Math.max(0, TASKS_PER_DAY - j.tasksDone) : TASKS_PER_DAY;
  }
  // Засчитать рабочую задачу (score 0..1). Возвращает {bonus, promoted}
  function completeTask(score = 1) {
    const s = S(); const j = s.job; if (!j || !tasksLeft()) return null;
    const day = info().day;
    const prod = Vibe.body ? Vibe.body.productivity().value / 100 : 1;
    score = Math.min(1, Math.max(0, Math.min(1, score)) * Math.max(0.3, prod) * (Vibe.work ? Vibe.work.mult() : 1));
    if (Vibe.body) {
      Vibe.body.tick();
      const e0 = Vibe.body.get().energy;
      Vibe.body.effect("work", { quiet: true });
      const k = SK.mult("taskEnergy"), b1 = S().body;
      if (k < 1 && b1 && b1.energy < e0) set({ body: Object.assign({}, b1, { energy: Math.min(100, b1.energy + (e0 - b1.energy) * (1 - k)) }) });
    }
    const bonus = Math.round((j.salary / BONUS_DIV) * (0.5 + score / 2) / 10) * 10;
    let level = j.level || 2, salary = j.salary, promoted = false;
    // Прогресс к повышению: ~25 задач до первого, каждое следующее вдвое-втрое дольше
    let perf = (j.perf || 0) + Math.max(1, Math.round((2 + score * 3) / Math.max(1, level - 1)));
    if (perf >= 100) { perf = 0; level++; salary = Math.round(salary * (1.25 + SK.add("promoRaise")) / 1000) * 1000; promoted = true; }
    set({ job: Object.assign({}, j, { perf, level, salary, bonus: (j.bonus || 0) + bonus, tasksDay: day, tasksDone: (j.tasksDay === day ? j.tasksDone : 0) + 1, lastTaskDay: day }) });
    stat("tasks");
    track("work");
    Vibe.emit && Vibe.emit("work", { score, promoted });
    if (promoted) {
      stat("promotions");
      setTimeout(() => {
        FX.confetti(); FX.confetti({ count: 80 });
        Vibe.modal(`<div class="m-emo float">🚀</div><div class="display">Повышение!</div><p>Теперь ты ${Vibe.esc(jobTitle(S().job))}. Оклад ${Vibe.rub(salary)}. Ответственности ×3, зарплата ×${String(1.25 + SK.add("promoRaise")).replace(".", ",")}. Справедливо.</p><button class="btn black block" data-close>Я {заслужил|заслужила}</button>`, { sound: "levelup" });
      }, 500);
    }
    return { bonus, promoted, perf };
  }

  /* ---------- Жильё ---------- */
  // listing: { title, rent, emoji, key } — key используется для точки на карте
  function moveHome(listing) {
    const p = Vibe.map.place(listing.key ? "flat:" + listing.key : "flat:" + listing.title);
    const first = !S().home;
    set({ home: Object.assign({}, listing, { x: p.x, y: p.y, district: p.district, since: info().day, baseRent: listing.rent }) });
    if (!first) stat("moves");
  }
  function buyHome(listing) {
    moveHome(Object.assign({}, listing, { rent: 0, own: true }));
    stat("homesBought");
  }

  /* ---------- Кредиты ---------- */
  function addLoan({ name = "Мечта", amount, rate = 0.299, months = 24 }) {
    const r = rate / 12;
    const monthly = Math.round((amount * r) / (1 - Math.pow(1 + r, -months)));
    const loan = { id: Date.now(), name, amount, rate, months, monthly, left: months, dom: PAYDAY };
    set({ loans: [...(S().loans || []), loan] });
    tx(`Кредит «${name}»`, amount, "🤑", "c-pink");
    stat("loans");
    return loan;
  }

  /* ---------- Ежедневные задания (по реальным дням) ---------- */
  const QUESTS = [
    { id: "eat", t: "Закажи еду в Vibe Eat", e: "🍜", need: 1, r: 60 },
    { id: "taxi", t: "Прокатись на такси", e: "🚕", need: 1, r: 60 },
    { id: "work", t: "Сделай 2 рабочие задачи", e: "💼", need: 2, r: 90 },
    { id: "pay", t: "Соверши 3 покупки", e: "🛍️", need: 3, r: 70 },
    { id: "supermarket", t: "Закупись продуктами", e: "🥑", need: 1, r: 50 },
    { id: "visit:music", t: "Послушай Vibe Music", e: "🎧", need: 1, r: 30 },
    { id: "visit:invest", t: "Загляни в инвестиции", e: "📈", need: 1, r: 30 },
    { id: "visit:wheel", t: "Покрути колесо вайба", e: "🎡", need: 1, r: 40 },
    { id: "apply", t: "Откликнись на 3 вакансии", e: "📨", need: 3, r: 60 },
    { id: "market", t: "Купи что-нибудь в Market", e: "🛒", need: 1, r: 50 },
    { id: "visit:games", t: "Сыграй в Vibe Games", e: "🎮", need: 1, r: 40 },
    { id: "visit:chats", t: "Поболтай с Вайботом", e: "🤖", need: 1, r: 30 },
  ];
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  function quests() {
    const s = S();
    let q = s.quests;
    // Задание не должно вести в сервис, который ещё закрыт
    const qScreen = (id) => (id.startsWith("visit:") ? id.slice(6) : { taxi: "maps", work: "job", apply: "job", pay: "pay" }[id] || id);
    const qOpen = (id) => !Vibe.unlock || Vibe.unlock.isOpen(qScreen(id));
    if (!q || q.day !== todayKey() || q.items.some((it) => !qOpen(it.id) && !it.n)) {
      let h = 0; for (const c of todayKey()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const pool = QUESTS.filter((x) => s.job || x.id !== "work").filter((x) => !s.job || x.id !== "apply").filter((x) => qOpen(x.id));
      const pick = [];
      while (pick.length < 3) { const x = pool[h % pool.length]; if (!pick.includes(x.id)) pick.push(x.id); h = (h * 1103515245 + 12345) >>> 0; }
      q = { day: todayKey(), items: pick.map((id) => ({ id, n: 0 })), claimed: [] };
      set({ quests: q });
    }
    return q.items.map((it) => Object.assign({}, QUESTS.find((x) => x.id === it.id), { n: it.n, done: it.n >= QUESTS.find((x) => x.id === it.id).need, claimed: q.claimed.includes(it.id) }));
  }
  function track(ev) {
    Vibe.emit && Vibe.emit("track", ev);
    const s = S();
    if (!s.profile) return;
    const q = s.quests && s.quests.day === todayKey() ? s.quests : null;
    if (!q) { quests(); return track(ev); }
    let changed = false;
    const items = q.items.map((it) => {
      const def = QUESTS.find((x) => x.id === it.id);
      if (it.id === ev && it.n < def.need) {
        changed = true;
        const n = it.n + 1;
        if (n >= def.need) setTimeout(() => { FX.toast(`Задание выполнено: ${def.t}`, "✅", 2600); FX.sound.success(); }, 600);
        return { id: it.id, n };
      }
      return it;
    });
    if (changed) set({ quests: Object.assign({}, q, { items }) });
  }
  function claimQuest(id, from) {
    const q = quests().find((x) => x.id === id);
    if (!q || !q.done || q.claimed) return;
    set({ quests: Object.assign({}, S().quests, { claimed: [...S().quests.claimed, id] }) });
    Vibe.reward({ vibiki: q.r, xp: 25, from });
    FX.burst(from, { emojis: ["✅", "🪙", "✨"], count: 12 });
  }

  /* ---------- Цели жизни ---------- */
  const meals = (s) => ((s.body && s.body.meals) || []).length;
  const sleeps = (s) => ((s.body && s.body.sleepLog) || []).length;
  const GOALS = [
    { id: "dinner", t: "Поужинать на новом месте", e: "🍜", r: 50, p: (s) => (meals(s) ? 1 : 0), go: "eat", act: "cook", how: "Приготовить или заказать" },
    { id: "night", t: "Выспаться на новом месте", e: "🛏️", r: 50, p: (s) => (sleeps(s) ? 1 : 0), go: "fit", how: "Лечь спать — в Vibe Fit" },
    { id: "job", t: "Найти работу", e: "💼", r: 150, p: (s) => (s.job ? 1 : 0), go: "job" },
    { id: "salary", t: "Получить первую зарплату", e: "💸", r: 150, p: (s) => Math.min(1, (s.stats.salaries || 0)), go: "job" },
    { id: "tasks", t: "Сделать 10 рабочих задач", e: "📋", r: 150, p: (s) => Math.min(1, (s.stats.tasks || 0) / 10), go: "job" },
    { id: "rent", t: "Оплатить аренду без минуса", e: "🔑", r: 150, p: (s) => Math.min(1, s.stats.rentPaid || 0), go: "rent" },
    { id: "save100", t: "Накопить 100 000 ₫", e: "🐷", r: 200, p: (s) => Math.max(0, Math.min(1, s.balance / 100000)), go: "pay" },
    { id: "promo", t: "Получить повышение", e: "🚀", r: 250, p: (s) => Math.min(1, s.stats.promotions || 0), go: "job" },
    { id: "move", t: "Переехать в квартиру получше", e: "🏡", r: 250, p: (s) => Math.min(1, s.stats.moves || 0), go: "rent" },
    { id: "save500", t: "Накопить 500 000 ₫", e: "💰", r: 400, p: (s) => Math.max(0, Math.min(1, s.balance / 500000)), go: "invest" },
    { id: "boss", t: "Стать руководителем", e: "👔", r: 500, p: (s) => Math.min(1, ((s.job && s.job.level) || 0) / 5), go: "job" },
    { id: "own", t: "Купить свою квартиру", e: "🏠", r: 1000, p: (s) => Math.min(1, s.stats.homesBought || 0), go: "home-buy" },
    { id: "free", t: "Закрыть все кредиты", e: "🕊️", r: 800, p: (s) => ((s.stats.loans || 0) > 0 && !(s.loans || []).length ? 1 : 0), go: "pay" },
    { id: "million", t: "Стать миллионером", e: "👑", r: 2000, p: (s) => Math.max(0, Math.min(1, s.balance / 1000000)), go: "invest" },
  ];
  function goal() {
    const s = S();
    const claimed = s.goalsDone || [];
    const g0 = GOALS.find((x) => !claimed.includes(x.id));
    if (!g0) return null;
    const p = g0.p(Object.assign({ stats: {} }, s));
    return Object.assign({}, g0, { progress: p, done: p >= 1, index: GOALS.indexOf(g0) + 1, total: GOALS.length });
  }
  function claimGoal(from) {
    const g0 = goal(); if (!g0 || !g0.done) return;
    set({ goalsDone: [...(S().goalsDone || []), g0.id] });
    FX.confetti();
    Vibe.reward({ vibiki: g0.r, xp: 80, from });
    Vibe.modal(`<div class="m-emo float">${g0.e}</div><div class="display" style="font-size:26px">Цель выполнена!</div><p>«${g0.t}». +${g0.r} вайбиков. Следующая цель уже ждёт.</p><button class="btn black block" data-close>Дальше</button>`, { sound: "levelup" });
  }

  /* ---------- Ежедневный бонус (реальные дни) ---------- */
  function dailyBonus() {
    const s = S();
    if (!s.profile) return;
    const today = todayKey();
    if (s.lastLogin === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    const streak = s.lastLogin === yKey ? (s.streak || 0) + 1 : 1;
    const reward = Math.min(500, 40 + streak * 20);
    set({ lastLogin: today, streak });
    const show = () => {
      if (Vibe.busy && Vibe.busy()) return setTimeout(show, 1500);
      Vibe.modal(`
        <div class="display" style="font-size:26px">Ежедневный бонус</div>
        <p>Ты заходишь ${streak} ${plural(streak, "день", "дня", "дней")} подряд 🔥 Не прерывай серию!</p>
        <div class="chest-row">${Array.from({ length: 7 }, (_, i) => `<div class="chest-day ${i + 1 < ((streak - 1) % 7) + 1 ? "past" : i + 1 === ((streak - 1) % 7) + 1 ? "now" : ""}"><span>${i === 6 ? "💎" : "🪙"}</span><small>${i + 1}</small></div>`).join("")}</div>
        <button class="chest" data-chest><span class="emo wobble">🎁</span></button>
        <div class="muted" style="font-weight:800;margin:6px 0 14px" data-chest-hint>Тапни по подарку</div>
        <button class="btn black block" data-close style="display:none" data-chest-ok>Забрать</button>`, {
        sound: "pop",
        onMount(m) {
          const chest = m.querySelector("[data-chest]");
          let taps = 0;
          chest.addEventListener("click", () => {
            taps++;
            FX.bump(chest); FX.haptic(12); FX.sound.pop();
            if (taps < 3) { m.querySelector("[data-chest-hint]").textContent = taps === 1 ? "Ещё!" : "Ещё разок!"; return; }
            if (taps > 3) return;
            chest.innerHTML = `<span class="emo float">🪙</span>`;
            m.querySelector("[data-chest-hint]").innerHTML = `<b style="font-size:22px;color:var(--ink)">+${reward} вайбиков</b>`;
            m.querySelector("[data-chest-ok]").style.display = "";
            FX.confetti({ from: chest });
            Vibe.reward({ vibiki: reward, xp: 20, from: chest });
          });
        },
      });
    };
    setTimeout(show, 900);
  }

  /* ---------- Уведомления об откликах (на любом экране) ---------- */
  function checkApps() {
    const s = S();
    const apps = s.life_apps || [];
    const now = Date.now();
    const fresh = apps.filter((a) => !a.stage && now >= a.doneAt && !a.pinged);
    if (!fresh.length) return;
    set({ life_apps: apps.map((a) => (fresh.includes(a) ? Object.assign({}, a, { pinged: true }) : a)) });
    const inv = fresh.filter((a) => a.ok).length, rej = fresh.length - inv;
    if (Vibe.current && Vibe.current.route.name === "job") return;
    if (inv) {
      FX.sound.success();
      FX.toast(`Тебя пригласили на собеседование${inv > 1 ? ` (${inv})` : ""}! Загляни в Vibe Job → Отклики`, "📨", 4000, { go: "job", params: { tab: "apps" }, label: "Ответить" });
    } else if (rej) FX.toast(`Отказ по ${rej} ${plural(rej, "отклику", "откликам", "откликам")}. Бывает. Откликайся ещё`, "🥲", 3000, { go: "job", label: "Вакансии" });
  }

  /* ---------- Запуск ---------- */
  // Жизнь начинается вечером дня переезда: устал, голоден, утро вечера мудренее
  const BORN_MIN = 19 * 60;
  function begin() {
    const shift = ((BORN_MIN - START_MIN) / 1440) * DAY_MS;
    set({ game: { start: Date.now() - shift, processedDay: 0, bornMin: BORN_MIN, dayMs: DAY_MS, seed: (Math.random() * 4294967295) >>> 0 }, body: { energy: 42, food: 30, mood: 58, fridge: 3 } });
  }
  function boot() {
    if (!S().profile) return;
    const ev = tick({ silent: true });
    if (ev.length) setTimeout(() => announce(ev), 700);
    dailyBonus();
    if (Vibe.body) Vibe.body.tick();
    setInterval(() => { if (!document.hidden) { tick(); checkApps(); if (Vibe.body) Vibe.body.tick(); if (Vibe.world) Vibe.world.tick(); } }, 5000);
    if (Vibe.world) setTimeout(() => Vibe.world.tick(), 4000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { tick(); if (Vibe.body) Vibe.body.tick(); } });
  }

  Vibe.game = {
    DAY_MS, info, minutes: () => minutesNow(), tick, upcoming, runway, begin, boot, on: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    setJob, quitJob, jobTitle, tasksLeft, completeTask, TASKS_PER_DAY,
    moveHome, buyHome, addLoan, tx,
    quests, track, claimQuest, goal, claimGoal, GOALS,
    realMinTo, plural, stat,
  };

  const css = `
  .chest-row { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin:4px 0 12px; }
  .chest-day { border:2px solid var(--ink); border-radius:12px; padding:4px 0; display:flex; flex-direction:column; align-items:center; font-size:18px; background:#fff; }
  .chest-day small { font-size:10px; font-weight:900; }
  .chest-day.past { background:var(--lime); opacity:.6; }
  .chest-day.now { background:var(--yellow); transform:scale(1.12); box-shadow:0 3px 0 var(--ink); }
  .chest { font-size:96px; display:block; margin:0 auto; transition:transform .2s var(--spring); }
  .chest:active { transform:scale(.9) rotate(-6deg); }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
