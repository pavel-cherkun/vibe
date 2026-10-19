/* ============================================================
   Календарь — вкладка «calendar».
   Делает игровое время видимым: живые часы, таймлайн дня,
   дела на сегодня, продуктивность, месяц и ближайшие события.

   Время: 1 игровой день = 1 реальный час (1 мин = 2,5 сек).
   Неделя: игровой день 0 (1 ноября) — понедельник, как в body.js
   (day % 7 < 5 — будни).
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const G = () => Vibe.game;
  const esc = (s) => Vibe.esc(s == null ? "" : s);
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const WD = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
  const WD_S = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  const WD_QUIP = [
    "Понедельник. Держись, это ненадолго (на неделю)",
    "Вторник — понедельник, который не сдался",
    "Среда — маленькая пятница для оптимистов",
    "Четверг. Почти пятница. Почти",
    "Пятница! Вайб официально разрешён",
    "Суббота. Ты никому ничего не должен (кроме банка)",
    "Воскресенье. Завтра понедельник 🫠",
  ];
  const MONTHS = ["ноября", "декабря", "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября"];
  const MONTHS_NOM = ["Ноябрь", "Декабрь", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь"];
  const MO_SHORT = ["ноя", "дек", "янв", "фев", "мар", "апр", "ма", "июн", "июл", "авг", "сен", "окт"];
  const DOCS = { d1: ["Терапевт", "👩🏻‍⚕️"], d2: ["Сомнолог", "😴"], d3: ["Стоматолог", "🦷"], d4: ["Психотерапевт", "🧠"] };
  const TAX = 0.13;
  const PX = 34;                 // пикселей на час в таймлайне
  const TL_FROM = 6, TL_TO = 24;
  const TL_H = (TL_TO - TL_FROM) * PX;

  const wd = (day) => ((day % 7) + 7) % 7;
  const isWorkday = (day) => wd(day) < 5;
  const domOf = (day) => (day % 30) + 1;
  const monOf = (day) => Math.floor(day / 30) % 12;
  const body = () => (Vibe.body ? Vibe.body.get() : null);
  const plural = (n, a, b, c) => G().plural(n, a, b, c);

  // Реальное время: 1440 игровых минут = 60 реальных → 1 реальная мин = 24 игровых
  function fmtReal(min) {
    min = Math.max(0, Math.round(min));
    if (min < 1) return "меньше минуты";
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} ч ${m} мин` : `${h} ч`;
  }
  function fmtCountdown(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
  function period(minOfDay) {
    if (minOfDay < 360 || minOfDay >= 1320) return "night";
    if (minOfDay < 540) return "morning";
    if (minOfDay < 1080) return "day";
    return "evening";
  }

  /* ---------- Состояние календаря: отметки дел и записи к врачу ---------- */
  function calDone() {
    const d = S().cal_done;
    const day = G().info().day;
    return d && d.day === day ? d.ids || {} : {};
  }
  function markDone(id) {
    const day = G().info().day;
    Vibe.state.set({ cal_done: { day, ids: Object.assign({}, calDone(), { [id]: 1 }) } });
  }
  // healthBooked хранит только docId+время без даты → запоминаем день, когда увидели запись
  function syncDocs() {
    const booked = S().healthBooked || {};
    const seen = Object.assign({}, S().cal_docs || {});
    const day = G().info().day;
    let changed = false;
    Object.keys(booked).forEach((k) => { if (seen[k] == null) { seen[k] = day; changed = true; } });
    if (changed) Vibe.state.set({ cal_docs: seen });
    return seen;
  }
  function doctorsOn(day) {
    const seen = S().cal_docs || {};
    return Object.keys(S().healthBooked || {}).filter((k) => seen[k] === day).map((k) => {
      const m = k.match(/^(d\d+)(\d\d):(\d\d)$/);
      if (!m) return null;
      const d = DOCS[m[1]] || ["Врач", "🩺"];
      return { h: +m[2] + +m[3] / 60, time: `${m[2]}:${m[3]}`, e: d[1], t: d[0] };
    }).filter(Boolean);
  }
  function invites() {
    const now = Date.now();
    return (S().life_apps || []).filter((a) => !a.stage && now >= a.doneAt && a.ok);
  }
  // День концерта по билету (d + «нояб»/«окт») в номере игрового дня текущего игрового года
  function ticketDay(t) {
    const mo = String(t.mo || "").toLowerCase();
    const mi = MO_SHORT.findIndex((p) => mo.startsWith(p));
    const d = parseInt(t.d, 10);
    if (mi < 0 || !d || d > 30) return null;
    const now = G().info().day;
    const base = Math.floor(now / 360) * 360 + mi * 30 + d - 1;
    return base < now ? base + 360 : base;
  }
  function concertsOn(day) {
    return (S().life_tickets || []).filter((t) => ticketDay(t) === day);
  }

  /* ---------- События любого игрового дня ---------- */
  function eventsOn(day) {
    const s = S();
    const dom = domOf(day);
    const ev = [];
    if (dom === 1 && s.home && s.home.rent) ev.push({ e: "🔑", t: "Аренда", sub: s.home.title || "жильё", a: -s.home.rent, col: "c-mint" });
    if (dom === 5) ev.push({ e: "📶", t: "Связь и интернет", a: -590, col: "c-sky", quiet: true });
    if (dom === 10) ev.push({ e: "💡", t: "ЖКХ", sub: "опять подорожало", a: -3200, col: "c-yellow" });
    if (Vibe.subs) Vibe.subs.list().forEach((x) => { if (x.dom === dom) ev.push({ e: x.e, t: x.name, sub: "подписка", a: -x.price, col: "c-lilac", quiet: true }); });
    if (s.job) {
      const net = Math.round(s.job.salary * (1 - TAX));
      if (dom === 15) ev.push({ e: "💸", t: "Аванс", sub: s.job.company, a: Math.round(net * 0.4), col: "c-lime" });
      if (dom === 30) ev.push({ e: "💰", t: "Зарплата", sub: s.job.company, a: Math.round(net * 0.6) + (s.job.bonus || 0), col: "c-lime" });
    }
    (s.loans || []).forEach((l) => { if (l.left > 0 && dom === l.dom) ev.push({ e: "🏦", t: `Кредит «${l.name}»`, sub: `осталось ${l.left} плат.`, a: -l.monthly, col: "c-pink" }); });
    const planned = Vibe.sched ? Vibe.sched.forDay(day) : [];
    planned.forEach((p) => ev.push({ e: p.e, t: p.title, sub: `${String(p.hour).padStart(2, "0")}:${String(p.min || 0).padStart(2, "0")}${p.status === "done" ? " · ✅ был" : p.status === "missed" ? " · ❌ пропущено" : ""}`, col: "c-orange", concert: true, go: "maps" }));
    if (!planned.some((p) => p.kind === "concert")) concertsOn(day).forEach((t) => ev.push({ e: "🎤", t: t.t, sub: `${t.place || "концерт"} · 20:00`, col: "c-orange", concert: true }));
    return ev;
  }

  // Цвет дня в сетке: pink — деньги приходят, yellow — счета, violet — концерты/врач/кредит
  function dayKinds(day) {
    const ev = eventsOn(day).filter((e) => !e.quiet);
    const k = [];
    if (ev.some((e) => e.a > 0)) k.push("in");
    if (ev.some((e) => e.concert || e.e === "🏦") || doctorsOn(day).length) k.push("vi");
    if (ev.some((e) => e.a < 0 && e.e !== "🏦")) k.push("bill");
    return k;
  }

  /* ============================================================
     1. Часы-герой
     ============================================================ */
  function skyPoints() {
    const pts = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(`${(t * 100).toFixed(1)},${(4 + (1 - Math.sin(Math.PI * t)) * 56).toFixed(1)}`); }
    return pts.join(" ");
  }
  function orbPos(minOfDay) {
    // солнце 06:00 → 22:00, луна 22:00 → 06:00
    let t, e;
    if (minOfDay >= 360 && minOfDay < 1320) { t = (minOfDay - 360) / 960; e = "☀️"; }
    else { t = ((minOfDay - 1320 + 1440) % 1440) / 480; e = "🌙"; }
    return { left: t * 100, top: 4 + (1 - Math.sin(Math.PI * t)) * 56, e };
  }
  function heroNote(I, minOfDay) {
    const toMid = (1440 - minOfDay) / 24;
    let extra = "";
    if (S().job && isWorkday(I.day) && minOfDay >= 540 && minOfDay < 1140) extra = ` · До конца рабочего дня ~${fmtReal((1140 - minOfDay) / 24)}`;
    else if (minOfDay < 540 && S().job && isWorkday(I.day)) extra = ` · До работы ~${fmtReal((540 - minOfDay) / 24)}`;
    return `1 игровой день = 1 час жизни. До полуночи ~${fmtReal(toMid)}${extra}`;
  }
  const BADGE_TXT = "ВРЕМЯ ИДЁТ • ВРЕМЯ ИДЁТ • ";
  function heroHtml(I) {
    const mod = Math.floor(G().minutes() % 1440);
    const o = orbPos(mod);
    const t = I.time;
    const wk = isWorkday(I.day);
    return `
      <div class="cal-hero p-${period(mod)}" data-hero>
        <div class="cal-bleed cal-b1" aria-hidden="true">Календарь жизни</div>
        <div class="cal-badge" aria-hidden="true">
          <svg viewBox="0 0 100 100"><defs><path id="cal-circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs><text textLength="236" lengthAdjust="spacing"><textPath href="#cal-circ" textLength="236" lengthAdjust="spacing">${BADGE_TXT}</textPath></text></svg>
          <span class="emo">⏳</span>
        </div>
        <div class="cal-clock" aria-label="Игровое время ${t}">
          <span class="cal-d" data-dg>${t[0]}</span><span class="cal-d" data-dg>${t[1]}</span><span class="cal-colon">:</span><span class="cal-d" data-dg>${t[3]}</span><span class="cal-d" data-dg>${t[4]}</span>
        </div>
        <div class="cal-bleed cal-b2" data-date>${I.dom} ${MONTHS[I.month]} · ${WD[wd(I.day)]}</div>
        <div class="cal-quip" data-quip>${WD_QUIP[wd(I.day)]}</div>
        <div class="cal-sky">
          <svg viewBox="0 0 100 64" preserveAspectRatio="none" aria-hidden="true"><polyline points="${skyPoints()}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 6" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".7"/></svg>
          <span class="cal-orb" data-orb style="left:${o.left}%;top:${o.top}px"><span class="emo float">${o.e}</span></span>
        </div>
        <div class="cal-barwrap">
          <div class="cal-bar">
            <i style="width:29.17%;background:#2a0a55"></i><i style="width:8.33%;background:var(--caly)"></i><i style="width:41.67%;background:${S().job ? "#fff" : "var(--lime)"}"></i><i style="width:16.67%;background:var(--calv)"></i><i style="width:4.16%;background:#2a0a55;border:0"></i>
          </div>
          <div class="cal-pin" data-pin style="left:${(mod / 1440) * 100}%"><span>📍</span></div>
          <div class="cal-ticks"><span style="left:0">00</span><span style="left:25%">06</span><span style="left:50%">12</span><span style="left:75%">18</span><span style="left:100%">24</span></div>
        </div>
        <div class="cal-legend"><span>🌙 ночь</span><span>☀️ утро</span><span>${S().job ? "💼 работа" : "🧃 день"}</span><span>🌆 вечер</span></div>
        <div class="cal-note" data-note>${heroNote(I, mod)}</div>
        <div class="cal-chips">
          <span class="cal-tag w" data-lifeday>📆 День жизни №${I.day + 1}</span>
          <span class="cal-tag y">⏱️ 1 мин = 2,5 сек</span>
          <span class="cal-tag ${wk ? "k" : "v"}" data-dtype>${wk ? "💼 Будний" : "🎉 Выходной"}</span>
        </div>
      </div>`;
  }

  /* ============================================================
     1б. Обратный отсчёт до большого события
     ============================================================ */
  const BIG = ["Зарплата", "Аванс", "Аренда"];
  function bigEvent(list) {
    return list.find((u) => BIG.includes(u.t)) || list[0] || null;
  }
  function bigCd(u) {
    return fmtCountdown(G().realMinTo(u.day) * 60000 + (u.concert ? (20 / 24) * 3600000 : 0));
  }
  function bigHtml(u) {
    if (!u) return `
      <div class="cal-big empty">
        <div class="cal-big-tags"><span class="cal-tag k">📭 тишина</span><span class="cal-tag y">ни зарплаты, ни счетов</span></div>
        <div class="cal-big-row"><div class="cal-big-l">Ничего<br>не грядёт</div><div class="cal-big-r"><b>∞</b><span>дней свободы</span></div></div>
        <div class="cal-big-cd">Найди работу — и тут появится зарплата</div>
      </div>`;
    const plus = u.a > 0, rent = u.t === "Аренда";
    const head = u.concert ? "Уже<br>скоро!" : plus ? "Скоро<br>деньги!" : rent ? "Готовь<br>деньги!" : "Скоро<br>платить";
    return `
      <button class="cal-big" data-cal="day" data-d="${u.day}">
        <div class="cal-big-tags">
          <span class="cal-tag k">${u.e} ${esc(u.t)}</span>
          ${u.a ? `<span class="cal-tag ${plus ? "y" : "p"}">${plus ? "+" : "−"}${Vibe.rub(Math.abs(u.a))}</span>` : `<span class="cal-tag y">🎟️ билет есть</span>`}
          <b class="cal-big-corner">${domOf(u.day)}.${pad(((monOf(u.day) + 10) % 12) + 1)}</b>
        </div>
        <div class="cal-big-row">
          <div class="cal-big-l">${head}</div>
          <div class="cal-big-r"><b>${u.in}</b><span>${plural(u.in, "день", "дня", "дней")} осталось</span></div>
        </div>
        <div class="cal-big-cd"><span class="emo">⏳</span><span data-bigcd>${bigCd(u)}</span><small>реального времени</small></div>
      </button>`;
  }

  /* ============================================================
     2. Таймлайн дня
     ============================================================ */
  const yOf = (h) => Math.round((h - TL_FROM) * PX);
  function timelineHtml(I) {
    const s = S(), b = body(), day = I.day;
    const mod = G().minutes() % 1440;
    const blocks = [];
    const pts = [];
    // Сон
    const lastSleep = b && (b.sleepLog || []).slice(-1)[0];
    const sleptToday = lastSleep && lastSleep.day === day;
    blocks.push({ f: 6, to: 7, e: "😴", t: b && b.sleeping ? "Спишь…" : sleptToday ? `Сон ${lastSleep.hours} ч` : "Сон до 07:00", sub: sleptToday ? `качество ${Math.round(lastSleep.q * 100)}%` : "будильник 07:00", c: "k-k", go: "fit" });
    // Работа
    if (s.job && isWorkday(day)) {
      const done = G().TASKS_PER_DAY - G().tasksLeft();
      blocks.push({ f: 9, to: 19, e: "💼", t: "Работа", sub: `${esc(s.job.company)} · задачи ${done}/${G().TASKS_PER_DAY}`, c: "k-v", go: "job" });
    } else if (s.job) {
      blocks.push({ f: 11, to: 17, e: "🛋️", t: "Выходной", sub: "но рабочий чат открыт", c: "k-p", go: "job" });
    } else {
      blocks.push({ f: 10, to: 13, e: "📨", t: "Поиск работы", sub: "откликайся в Vibe Job", c: "k-p", go: "job", dash: true });
    }
    blocks.push({ f: 23, to: 24, e: "🌙", t: "Отбой", sub: "в 23:00. В теории", c: "k-k", go: "fit" });

    // Еда
    const meals = (b && b.meals) || [];
    [[8, "🍳", "Завтрак"], [13, "🥪", "Обед"], [19, "🍝", "Ужин"]].forEach(([h, e, t]) => {
      const eaten = meals.some((m) => m.day === day && Math.abs((m.min % 1440) - h * 60) <= 90);
      const missed = !eaten && mod > h * 60 + 90;
      pts.push({ h, e: eaten ? "✅" : e, t: `${t} ${pad(h)}:00`, c: eaten ? "k-ok" : missed ? "k-w missed" : "k-y", go: "eat" });
    });
    doctorsOn(day).forEach((d) => pts.push({ h: clamp(d.h, 6, 23.6), e: d.e, t: `${d.t} ${d.time}`, c: "k-v", go: "health" }));
    const plan = Vibe.sched ? Vibe.sched.forDay(day) : [];
    plan.forEach((p) => pts.push({ h: clamp(p.hour + (p.min || 0) / 60, 6, 23.6), e: p.e, t: `${esc(p.title)} ${String(p.hour).padStart(2, "0")}:${String(p.min || 0).padStart(2, "0")}`, c: "k-v", go: "maps" }));
    if (!plan.some((p) => p.kind === "concert")) concertsOn(day).forEach((t) => pts.push({ h: 20, e: "🎤", t: `${esc(t.t)} 20:00`, c: "k-v", go: "tickets" }));
    const inv = invites();
    if (inv.length) pts.push({ h: clamp(Math.ceil(mod / 60 + 0.01), 7, 23), e: "🎤", t: `Собеседование${inv.length > 1 ? ` ×${inv.length}` : ""} ждёт`, c: "k-p cal-glow", go: "job" });

    // Раскладка точек без наложений
    pts.sort((a, b2) => a.h - b2.h);
    let prev = -99;
    pts.forEach((p) => { p.y = Math.max(yOf(p.h), prev + 32); prev = p.y; });
    pts.forEach((p) => { p.y = Math.min(p.y, TL_H - 14); });

    let hrs = "";
    for (let h = TL_FROM; h <= TL_TO; h++) hrs += `<div class="cal-hr" style="top:${yOf(h)}px"><span>${pad(h % 24)}:00</span></div>`;
    const nowY = clamp(yOf(mod / 60), 0, TL_H);

    return `
      <div class="cal-tl" data-tl>
        ${hrs}
        <div class="cal-past" data-past style="height:${nowY}px"></div>
        ${blocks.map((x) => `
          <button class="cal-blk ${x.c} ${x.dash ? "dash" : ""}" data-go="${x.go}" style="top:${yOf(x.f)}px;height:${Math.max(28, yOf(x.to) - yOf(x.f) - 2)}px">
            <b>${x.e} ${x.t}</b>${yOf(x.to) - yOf(x.f) > 40 ? `<small>${x.sub}</small>` : ""}
          </button>`).join("")}
        ${pts.map((p) => `<button class="cal-pt ${p.c}" data-go="${p.go}" style="top:${p.y}px"><span>${p.e}</span><span class="tx">${p.t}</span></button>`).join("")}
        <div class="cal-now" data-now style="top:${nowY}px"><b data-nowlbl>${mod < 360 ? "ночь · " : "сейчас "}${I.time}</b></div>
      </div>`;
  }
  function moneyStripHtml(I) {
    const ev = eventsOn(I.day).filter((e) => !e.concert);
    if (!ev.length) return `<div class="cal-strip muted">🧾 Сегодня без больших платежей. Только кофе, метро и −300 ₽ на «просто жизнь».</div>`;
    return `<div class="cal-strip"><b>Ночью в 00:00 случилось:</b>${ev.map((e) => `<span class="cal-tag ${e.a > 0 ? "p" : "y"}">${e.e} ${esc(e.t)} ${e.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(e.a))}</span>`).join("")}</div>`;
  }

  /* ============================================================
     3. Дела на сегодня
     ============================================================ */
  function todos() {
    const s = S(), b = body(), I = G().info();
    const mod = G().minutes() % 1440;
    const done = calDone();
    const list = [];
    const day = I.day;

    // Приглашения на собеседование
    const inv = invites();
    if (inv.length) list.push({ id: "invite", e: "📨", t: `Ответить на приглашение${inv.length > 1 ? ` (${inv.length})` : ""}`, sub: "HR ждёт. Целых 4 секунды", rw: "+оффер?", act: { go: "job", label: "Пройти 🎤" } });

    // Деньги на аренду
    if (s.home && s.home.rent) {
      let inDays = null;
      for (let d = day + 1; d <= day + 31; d++) if (domOf(d) === 1) { inDays = d - day; break; }
      if (inDays != null && inDays <= 3 && s.balance < s.home.rent) {
        list.push({ id: "rent", e: "🔑", t: "Найти деньги на аренду", sub: `не хватает ${Vibe.rub(s.home.rent - s.balance)} · через ${inDays} ${plural(inDays, "день", "дня", "дней")}`, rw: "крыша над головой", act: { go: s.job ? "job" : "pay", label: s.job ? "Работать" : "В банк" }, urgent: true });
      }
    }

    // Поесть
    if (b) {
      const mealsToday = (b.meals || []).some((m) => m.day === day);
      const eatDone = !!done.eat || (b.food >= 40 && mealsToday);
      if (b.food < 40 || eatDone) {
        list.push({
          id: "eat", e: "🍽️", t: "Поесть", sub: eatDone ? `сытость ${Math.round(b.food)}%` : `сытость ${Math.round(b.food)}% — мозг работает на голодном пайке`, done: eatDone && b.food >= 40,
          rw: b.fridge > 0 ? "+10 XP" : "+сытость",
          act: b.fridge > 0 ? { inline: "cook", label: `Приготовить 🍳` } : { go: "eat", label: "Заказать" },
          prog: clamp(b.food / 40, 0, 1),
        });
      }
    }

    // Рабочие задачи
    if (s.job) {
      const n = G().TASKS_PER_DAY - G().tasksLeft();
      list.push({ id: "work", e: "💼", t: `Сделать рабочие задачи ${n}/${G().TASKS_PER_DAY}`, sub: isWorkday(day) ? "премия сама себя не заработает" : "выходной, но кто считает", rw: "+премия", act: { go: "job", label: "В работу" }, prog: n / G().TASKS_PER_DAY, done: n >= G().TASKS_PER_DAY });
    }

    // Шаги
    if (b) {
      const steps = b.stepsDay === day ? Math.round(b.steps) : 0;
      const goal = Vibe.body.STEP_GOAL || 8000;
      list.push({ id: "steps", e: "👟", t: `Пройти ${Vibe.fmt(goal)} шагов`, sub: `${Vibe.fmt(steps)} / ${Vibe.fmt(goal)}`, rw: "+здоровье", act: { go: "maps", label: "Гулять" }, prog: clamp(steps / goal, 0, 1), done: steps >= goal });
    }

    // Позвонить маме
    list.push({ id: "mom", e: "📞", t: "Позвонить маме", sub: done.mom ? "мама довольна. Почти" : "раз в день. Она всё равно спросит про шапку", rw: "+15 XP", act: { inline: "mom", label: "Позвонить" }, done: !!done.mom });

    // Сон до 23:00 (вечером и ночью)
    const h = Math.floor(mod / 60);
    if (b && (h >= 18 || h < 7)) {
      const at = b.sleeping ? b.sleeping.at % 1440 : null;
      const ok = at != null && at >= 12 * 60 && at < 23 * 60;
      const missed = !ok && (h >= 23 || h < 7);
      list.push({ id: "sleep", e: "😴", t: "Лечь спать до 23:00", sub: ok ? "легенда режима" : missed ? "не успел. Дедлайн был ближе, чем казалось" : `осталось ~${fmtReal((1380 - mod) / 24)} реального времени`, rw: "+энергия", act: { go: "fit", label: "Спать" }, done: ok, missed });
    }

    // Задания дня
    G().quests().forEach((q) => {
      list.push({ id: "q:" + q.id, quest: true, e: q.e, t: q.t, sub: q.claimed ? "награда получена" : `${Math.min(q.n, q.need)}/${q.need}`, rw: `+${q.r} 🪙`, prog: Math.min(q.n, q.need) / q.need, done: q.claimed, claim: q.done && !q.claimed ? q.id : null });
    });
    return list;
  }
  function todoRow(x) {
    const cls = x.done ? "done" : x.missed ? "missed" : x.claim ? "ready" : x.urgent ? "urgent" : "";
    let btn = "";
    if (x.done) btn = `<span class="cal-rw">${x.quest ? "✓" : x.rw}</span>`;
    else if (x.missed) btn = `<span class="cal-rw">🫠</span>`;
    else if (x.claim) btn = `<button class="cal-pill y" data-cal="claim" data-q="${x.claim}">${x.rw}</button>`;
    else if (x.act && x.act.inline) btn = `<button class="cal-pill v" data-cal="${x.act.inline}">${x.act.label}</button>`;
    else if (x.act && x.act.go) btn = `<button class="cal-pill o" data-go="${x.act.go}">${x.act.label}</button>`;
    else btn = `<span class="cal-rw">${x.rw}</span>`;
    return `
      <div class="cal-todo ${cls}" data-todo="${x.id}">
        <button class="cal-chk" data-cal="chk" data-id="${x.id}" aria-label="Отметить">${x.done ? "✓" : x.missed ? "✕" : ""}</button>
        <span class="cal-te emo">${x.e}</span>
        <div class="cal-tt">
          <b>${x.t}</b>
          <small>${x.sub}${!x.done && !x.missed && !x.claim && x.rw && (x.act && (x.act.go || x.act.inline)) ? ` · <span class="cal-rwi">${x.rw}</span>` : ""}</small>
          ${x.prog != null && !x.done ? `<div class="cal-pbar"><i style="width:${Math.round(x.prog * 100)}%"></i></div>` : ""}
        </div>
        ${btn}
      </div>`;
  }
  function todosHtml(list) {
    const life = list.filter((x) => !x.quest), q = list.filter((x) => x.quest);
    const total = list.length, n = list.filter((x) => x.done).length;
    return `
      <div class="cal-thead">
        <div class="cal-tcount"><b>${n}</b><small>/${total}</small></div>
        <div style="flex:1;min-width:0">
          <div class="cal-tlbl">${n === total ? "Всё сделано. Подозрительно продуктивно 🗿" : n === 0 ? "Ноль из скольких-то. Начни с маленького" : "Хороший темп. Не сбавляй"}</div>
          <div class="cal-pbar big"><i style="width:${total ? Math.round((n / total) * 100) : 0}%"></i></div>
        </div>
      </div>
      <div class="cal-tlist">${life.map(todoRow).join("")}</div>
      <div class="cal-qhead"><span>🎯 Задания дня</span><small>обновятся завтра (по-настоящему)</small></div>
      <div class="cal-tlist">${q.map(todoRow).join("")}</div>`;
  }

  /* ============================================================
     4. Продуктивность
     ============================================================ */
  function prodData(list) {
    const b = body();
    const I = G().info();
    const p = b ? Vibe.body.productivity().value : 50;
    const total = list.length, n = list.filter((x) => x.done).length;
    const steps = b && b.stepsDay === I.day ? b.steps : 0;
    const last = b && (b.sleepLog || []).slice(-1)[0];
    const sl = last ? clamp((last.hours / 8) * last.q, 0, 1) : 0.5;
    const score = Math.round(p * 0.45 + (total ? n / total : 0) * 25 + clamp(steps / 8000, 0, 1) * 15 + sl * 15);
    return { b, p, n, total, steps, last, score };
  }
  function tips(d) {
    const s = S(), b = d.b, I = G().info();
    const mod = G().minutes() % 1440;
    const out = [];
    if (b) {
      if (b.sleeping) out.push(["😴", "Ты спишь. Самое продуктивное, что ты сделал за день", "fit"]);
      if (b.sick) out.push(["🤒", "Заболел — продуктивность ×0,5. Запишись к врачу в Vibe Health", "health"]);
      if (b.energy < 35 && !b.sleeping) out.push(["⚡", `Энергия ${Math.round(b.energy)}%. Поспи: кофе — это кредит под 40% годовых`, "fit"]);
      if (b.food < 40) out.push(["🍽️", `Сытость ${Math.round(b.food)}%. Голодный мозг работает на 60%`, "eat"]);
      if (b.mood < 45) out.push(["🌧️", `Настроение ${Math.round(b.mood)}%. Позвони маме или включи музыку`, "music"]);
      if (d.steps < 4000 && mod > 720) out.push(["👟", `Всего ${Vibe.fmt(d.steps)} шагов. Прогуляйся — карта знает дорогу`, "maps"]);
    }
    if (s.job && G().tasksLeft() > 0 && isWorkday(I.day)) out.push(["💼", `Осталось ${G().tasksLeft()} ${plural(G().tasksLeft(), "задача", "задачи", "задач")}. Дедлайн ближе, чем кажется`, "job"]);
    if (!s.job) out.push(["📨", "Без работы продуктивность — понятие философское. Загляни в Vibe Job", "job"]);
    out.push(["📅", "Планируй день с вечера. Или хотя бы с обеда", "calendar"]);
    out.push(["🧘", "Отдых — тоже задача. Отметь её мысленно", "fit"]);
    out.push(["📵", "Меньше скролла — больше жизни. Но из Vibe не уходи 🥺", "home"]);
    return out.slice(0, 3);
  }
  function prodHtml(list) {
    const d = prodData(list);
    const col = d.score < 40 ? "var(--calp)" : d.score < 70 ? "var(--caly)" : "var(--lime)";
    const grade = d.score < 25 ? "Овощ 🥔" : d.score < 50 ? "Разгоняюсь 🐢" : d.score < 70 ? "Норм 🙂" : d.score < 85 ? "Машина 🚀" : "Сигма 🗿";
    return `
      <div class="cal-prod">
        <div class="cal-big-tags"><span class="cal-tag y">${grade}</span><span class="cal-tag k">считает Заботик</span><b class="cal-big-corner">/100</b></div>
        <div class="cal-prod-row">
          <b class="cal-prod-n" style="color:${col}">${d.score}</b>
          <div class="cal-prod-u">вайб-<br>индекс<br>дня</div>
        </div>
        <div class="cal-pmeter"><i style="width:${clamp(d.score, 0, 100)}%;background:${col}"></i></div>
        <div class="cal-pstats">
          <div class="s1"><span>⚡ Тело</span><b>${d.p}%</b></div>
          <div class="s2"><span>✅ Дела</span><b>${d.n}/${d.total}</b></div>
          <div class="s3"><span>👟 Шаги</span><b>${Vibe.fmt(d.steps)}</b></div>
          <div class="s4"><span>😴 Сон</span><b>${d.last ? d.last.hours + " ч" : "—"}</b></div>
        </div>
      </div>
      <div class="cal-tips">${tips(d).map(([e, t, go], i) => `<button class="cal-tip t${i}" data-go="${go}"><span class="emo">${e}</span><span>${t}</span><i>→</i></button>`).join("")}</div>`;
  }

  /* ============================================================
     5. Месяц
     ============================================================ */
  function monthHtml(I) {
    const start = I.day - (I.dom - 1);
    const off = wd(start);
    let cells = "";
    for (let i = 0; i < off; i++) cells += `<div class="cal-day empty"></div>`;
    for (let i = 0; i < 30; i++) {
      const d = start + i;
      const k = dayKinds(d);
      const mk = eventsOn(d).filter((e) => !e.quiet).map((e) => e.t);
      const cls = d === I.day ? "today" : d < I.day ? "past" : "";
      const we = wd(d) >= 5 ? "we" : "";
      cells += `<button class="cal-day ${cls} ${we} ${k.length ? "ev k-" + k[0] : ""}" data-cal="day" data-d="${d}" aria-label="${i + 1}${mk.length ? ": " + esc(mk.join(", ")) : ""}"><b>${i + 1}</b>${k.length > 1 ? `<i class="more k-${k[1]}"></i>` : ""}</button>`;
    }
    return `
      <div class="cal-month">
        <div class="cal-handle"></div>
        <div class="cal-mtitle"><span class="cal-mt">Дни жизни</span><button class="cal-msel" data-cal="mon">${MONTHS_NOM[I.month]} <i>▾</i></button></div>
        <div class="cal-mhead">${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w, i) => `<span class="${i >= 5 ? "we" : ""}">${w}</span>`).join("")}</div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-mlegend">
          <span><i class="k-in"></i>${S().job ? "аванс · зарплата" : "деньги приходят"}</span>
          <span><i class="k-bill"></i>аренда · ЖКХ</span>
          <span><i class="k-vi"></i>концерт · врач · кредит</span>
          <span><i class="k-today"></i>сегодня</span>
        </div>
        <div class="cal-mbtns">
          <button class="cal-pill v lg" data-cal="day" data-d="${I.day}">Сегодня</button>
          <button class="cal-pill o lg" data-cal="toup">Ближайшее</button>
        </div>
        <div class="cal-mnote">30 дней = 30 часов. Тапни по дню</div>
      </div>`;
  }
  function daySheet(d) {
    const I = G().info();
    const dom = domOf(d), mon = monOf(d);
    const ev = eventsOn(d);
    const diff = d - I.day;
    const docs = d === I.day ? doctorsOn(d) : [];
    const kinds = dayKinds(d);
    const when = diff === 0 ? "Сегодня. Прямо сейчас. Не откладывай"
      : diff > 0 ? `Через ${diff} ${plural(diff, "день", "дня", "дней")} (≈ ${fmtReal(G().realMinTo(d))} реального времени)`
      : `${-diff} ${plural(-diff, "день", "дня", "дней")} назад. Прошлого не вернуть, но выписку можно`;
    const rows = [];
    if (S().job && isWorkday(d)) rows.push({ e: "💼", t: "Работа 09:00–19:00", sub: S().job.company, col: "c-violet" });
    ev.forEach((e) => rows.push(e));
    docs.forEach((x) => rows.push({ e: x.e, t: `${x.t} в ${x.time}`, sub: "Vibe Health", col: "c-mint" }));
    rows.push({ e: "🧾", t: "Продукты, метро, кофе", sub: "каждый день, как налог на существование", a: -300, col: "c-white" });
    Vibe.ui.sheet(`
      <div class="cal-sh-head">
        <div class="cal-sh-date ${d === I.day ? "today" : ""}"><b class="${kinds.length ? "k-" + kinds[0] : ""}">${dom}</b><small>${MONTHS[mon].slice(0, 3)}</small></div>
        <div style="min-width:0"><div class="cal-sh-t">${dom} ${MONTHS[mon]}</div><div style="font-weight:800;font-size:13px">${WD[wd(d)]} · ${isWorkday(d) ? "будний" : "выходной 🎉"}</div></div>
      </div>
      <div class="cal-sh-when"><span class="emo float">⏳</span><span>${when}</span></div>
      <div class="card flat stagger" style="padding:4px 14px;margin-top:12px">
        ${rows.map((r) => `<div class="li"><div class="ic ${r.col || "c-white"}">${r.e}</div><div class="tx"><b>${esc(r.t)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</div>${r.a ? `<div class="amt ${r.a > 0 ? "plus" : ""}">${r.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(r.a))}</div>` : ""}</div>`).join("")}
      </div>
      ${ev.length ? "" : `<div class="muted" style="text-align:center;font-weight:800;margin:12px 0 0">📭 Ничего особенного. Подозрительно спокойно</div>`}
      <button class="cal-pill v lg block" style="margin-top:16px" data-close>Понятно</button>`);
  }

  /* ============================================================
     6. Ближайшее
     ============================================================ */
  function upcomingList() {
    const I = G().info();
    const res = G().upcoming(6).map((u) => ({ e: u.e, t: u.t, a: u.a, day: u.day, in: u.in }));
    (S().life_tickets || []).forEach((t) => {
      const d = ticketDay(t);
      if (d != null && d >= I.day && d - I.day <= 31) res.push({ e: "🎤", t: t.t, day: d, in: d - I.day, concert: true });
    });
    return res.sort((a, b) => a.in - b.in).slice(0, 7);
  }
  function cdText(u) {
    const ms = G().realMinTo(u.day) * 60000 + (u.concert ? (20 / 24) * 3600000 : 0);
    return `${u.in === 0 ? "сегодня" : `через ${u.in} ${plural(u.in, "день", "дня", "дней")}`} · ⏳ ${fmtCountdown(ms)}`;
  }
  function upHtml() {
    const list = upcomingList();
    if (!list.length) return `<div class="cal-upempty"><div class="emo float" style="font-size:48px">🕳️</div><b>Пусто. Ни зарплаты, ни счетов</b><div style="font-size:13px;font-weight:700">Свобода — это когда нечего ждать. Или некуда</div></div>`;
    return `<div class="cal-uplist">${list.map((u, i) => {
      const k = u.concert || u.e === "🏦" ? "vi" : u.a > 0 ? "in" : "bill";
      return `
      <button class="cal-up" data-cal="day" data-d="${u.day}">
        <span class="cal-up-d"><b class="k-${k}">${domOf(u.day)}</b></span>
        <span class="tx"><b><span class="emo ${i === 0 ? "wobble" : ""}">${u.e}</span> ${esc(u.t)}</b><small data-cd="${i}">${cdText(u)}</small></span>
        ${u.a ? `<span class="cal-tag ${u.a > 0 ? "p" : "w"}">${u.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(u.a))}</span>` : `<span class="cal-tag v">🎟️</span>`}
      </button>`;
    }).join("")}</div>`;
  }

  /* ============================================================
     Экран
     ============================================================ */
  Vibe.screen("calendar", {
    render() {
      syncDocs();
      const I = G().info();
      const list = todos();
      return `
      <div class="cal-top">
        <div class="cal-kicker">Vibe <i>/</i> время — единственное, что тут не продаётся. Пока</div>
        ${Vibe.ui.vibikiPill()}
      </div>
      <div class="stagger">
        <div data-hero-slot>${heroHtml(I)}</div>

        <div data-big>${bigHtml(bigEvent(upcomingList()))}</div>

        <h2 class="cal-h p">Таймлайн дня</h2>
        <div class="cal-hsub"><span data-tlsub>${I.dom} ${MONTHS[I.month]}</span> · тапни по блоку</div>
        <div data-strip>${moneyStripHtml(I)}</div>
        <div class="cal-tlcard" data-tlslot>${timelineHtml(I)}</div>

        <h2 class="cal-h">Дела на сегодня</h2>
        <div class="cal-hsub"><span class="cal-dl">Дедлайн ближе, чем кажется</span></div>
        <div class="cal-todos" data-todos>${todosHtml(list)}</div>

        <h2 class="cal-h v">Продуктивность</h2>
        <div class="cal-hsub">считает Заботик · честно</div>
        <div data-prod>${prodHtml(list)}</div>

        <div class="cal-mq">${Vibe.ui.marquee(["1 ДЕНЬ = 1 ЧАС", "ДЕДЛАЙН БЛИЖЕ, ЧЕМ КАЖЕТСЯ", "ПОНЕДЕЛЬНИК НЕИЗБЕЖЕН", "ПРОДУКТИВНОСТЬ — ЭТО ВАЙБ", "ЗАРПЛАТА СКОРО*"])}</div>

        <h2 class="cal-h">Месяц</h2>
        <div data-month>${monthHtml(I)}</div>

        <h2 class="cal-h p" data-uph>Ближайшее</h2>
        <div class="cal-hsub">в реальном времени · тикает</div>
        <div data-up>${upHtml()}</div>

        <div class="fine">*«Скоро» — понятие относительное. 1 игровой день длится 1 реальный час, поэтому зарплата приходит быстрее, чем в жизни. Это единственное место, где так бывает.</div>
      </div>`;
    },

    mount(root) {
      const $ = (sel) => root.querySelector(sel);
      let I0 = G().info();
      let lastDay = I0.day;
      let lastMin = Math.floor(G().minutes());
      let lastTodos = "";
      let doneSet = new Set(todos().filter((x) => x.done).map((x) => x.id));
      let upList = upcomingList();
      let big = bigEvent(upList);
      let lastSec = -1;
      const disposers = [];

      // ---- Часы ----
      function updateHero(I, flip = true) {
        const mod = G().minutes() % 1440;
        const t = I.time;
        const ds = [t[0], t[1], t[3], t[4]];
        root.querySelectorAll("[data-dg]").forEach((el, i) => {
          if (el.textContent === ds[i]) return;
          el.textContent = ds[i];
          if (flip) { el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); }
        });
        const hero = $("[data-hero]");
        if (hero) {
          const p = "p-" + period(mod);
          if (!hero.classList.contains(p)) { hero.classList.remove("p-night", "p-morning", "p-day", "p-evening"); hero.classList.add(p); }
        }
        const note = $("[data-note]"); if (note) note.textContent = heroNote(I, mod);
      }
      function updateSmooth() {
        const mod = G().minutes() % 1440;
        const o = orbPos(mod);
        const orb = $("[data-orb]");
        if (orb) {
          orb.style.left = o.left + "%"; orb.style.top = o.top + "px";
          const em = orb.firstElementChild; if (em && em.textContent !== o.e) em.textContent = o.e;
        }
        const pin = $("[data-pin]"); if (pin) pin.style.left = (mod / 1440) * 100 + "%";
        const nowY = clamp(yOf(mod / 60), 0, TL_H);
        const nl = $("[data-now]"); if (nl) nl.style.top = nowY + "px";
        const past = $("[data-past]"); if (past) past.style.height = nowY + "px";
        const lbl = $("[data-nowlbl]"); if (lbl) lbl.textContent = (mod < 360 ? "ночь · " : "сейчас ") + G().info().time;
      }

      // ---- Дела ----
      function refreshTodos(user = false) {
        const list = todos();
        const html = todosHtml(list);
        const box = $("[data-todos]");
        if (box && html !== lastTodos) {
          lastTodos = html;
          box.innerHTML = html;
          const nowDone = new Set(list.filter((x) => x.done).map((x) => x.id));
          nowDone.forEach((id) => {
            if (doneSet.has(id)) return;
            const row = box.querySelector(`[data-todo="${CSS.escape(id)}"]`);
            if (!row) return;
            row.classList.add("just");
            const chk = row.querySelector(".cal-chk");
            setTimeout(() => FX.burst(chk || row, { emojis: ["✅", "✨", "🎉", "💜"], count: 12, spread: 110 }), 60);
            if (user) FX.sound.success();
          });
          doneSet = nowDone;
        }
        const pr = $("[data-prod]");
        if (pr) { const ph = prodHtml(list); if (pr.dataset.h !== ph) { pr.dataset.h = ph; pr.innerHTML = ph; } }
      }
      lastTodos = todosHtml(todos());
      const pr0 = $("[data-prod]"); if (pr0) pr0.dataset.h = pr0.innerHTML;

      // ---- Разделы, зависящие от дня ----
      function refreshDayParts() {
        const I = G().info();
        syncDocs();
        const slot = $("[data-hero-slot]");
        if (slot) {
          const d = $("[data-date]"); if (d) d.textContent = `${I.dom} ${MONTHS[I.month]} · ${WD[wd(I.day)]}`;
          const q = $("[data-quip]"); if (q) q.textContent = WD_QUIP[wd(I.day)];
          const ld = $("[data-lifeday]"); if (ld) ld.textContent = `📆 День жизни №${I.day + 1}`;
          const dt = $("[data-dtype]");
          if (dt) { const wk = isWorkday(I.day); dt.textContent = wk ? "💼 Будний" : "🎉 Выходной"; dt.classList.toggle("k", wk); dt.classList.toggle("v", !wk); }
        }
        const sub = $("[data-tlsub]"); if (sub) sub.textContent = `${I.dom} ${MONTHS[I.month]}`;
        refreshTimeline();
        const st = $("[data-strip]"); if (st) st.innerHTML = moneyStripHtml(I);
        const m = $("[data-month]"); if (m) m.innerHTML = monthHtml(I);
        refreshUp();
      }
      function refreshTimeline() {
        const tl = $("[data-tlslot]"); if (tl) tl.innerHTML = timelineHtml(G().info());
      }
      function refreshUp() {
        upList = upcomingList();
        const u = $("[data-up]"); if (u) u.innerHTML = upHtml();
        big = bigEvent(upList);
        const b = $("[data-big]"); if (b) b.innerHTML = bigHtml(big);
      }
      function updateCountdowns() {
        root.querySelectorAll("[data-cd]").forEach((el) => { const u = upList[+el.dataset.cd]; if (u) el.textContent = cdText(u); });
        const bc = $("[data-bigcd]"); if (bc && big) bc.textContent = bigCd(big);
      }

      // ---- Главный цикл: 500 мс, тяжёлое — раз в игровую минуту (2,5 с) ----
      let timelineEvery = 0;
      const loop = setInterval(() => {
        if (document.hidden || !root.isConnected) return;
        updateSmooth();
        const sec = Math.floor(Date.now() / 1000);
        if (sec !== lastSec) { lastSec = sec; updateCountdowns(); }
        const I = G().info();
        if (I.day !== lastDay) {
          lastDay = I.day;
          updateHero(I);
          refreshDayParts();
          refreshTodos(false);
          FX.toast(`Новый день: ${I.dom} ${MONTHS[I.month]}, ${WD[wd(I.day)]}`, "🌅", 2600);
          return;
        }
        const m = Math.floor(G().minutes());
        if (m !== lastMin) {
          lastMin = m;
          updateHero(I);
          refreshTodos(false);
          // таймлайн (статусы еды, собеседования) — раз в 10 игровых минут
          if (++timelineEvery % 10 === 0) refreshTimeline();
        }
      }, 500);
      disposers.push(() => clearInterval(loop));

      // ---- Игровые события: зарплата, счета, новый день ----
      disposers.push(G().on(() => {
        lastDay = G().info().day;
        refreshDayParts();
        refreshTodos(false);
      }));
      const onVis = () => { if (!document.hidden) { refreshTodos(false); refreshTimeline(); updateCountdowns(); } };
      document.addEventListener("visibilitychange", onVis);
      disposers.push(() => document.removeEventListener("visibilitychange", onVis));

      // ---- Клики ----
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-cal]");
        if (!a) return;
        e.stopPropagation();
        const act = a.dataset.cal;
        if (act === "day") {
          FX.bump(a);
          daySheet(+a.dataset.d);
          return;
        }
        if (act === "mon") {
          FX.bump(a);
          FX.toast("Другие месяцы — в Плюс Вайб. Шутка: просто живи этот", "📅", 2400);
          return;
        }
        if (act === "toup") {
          const h = $("[data-uph]");
          if (h) h.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (act === "claim") {
          G().claimQuest(a.dataset.q, a);
          FX.sound.pop();
          setTimeout(() => refreshTodos(true), 250);
          return;
        }
        if (act === "mom") {
          if (calDone().mom) { FX.toast("Ты уже звонил. Второй звонок — это тревожность", "📵"); return; }
          if (Vibe.body) Vibe.body.effect("mom");
          markDone("mom");
          Vibe.reward({ xp: 15, from: a });
          const lines = S().job
            ? ["Мама спросила, когда ты уже женишься", "Мама спросила, платят ли тебе нормально. Ты соврал", "Мама передала привет и рецепт борща"]
            : ["Мама спросила, нашёл ли ты работу. Неловко", "Мама сказала, что у тёти Люды сын уже директор", "Мама перевела бы денег, но пенсия не резиновая"];
          FX.toast(`${FX.pick(lines)} · +15 XP`, "👩", 3200);
          FX.burst(a, { emojis: ["📞", "💖", "✨"], count: 12 });
          refreshTodos(true);
          return;
        }
        if (act === "cook") {
          const b = body();
          if (!b || b.fridge <= 0) { FX.toast("Холодильник пуст. Там только свет и надежда", "🧊"); Vibe.go("supermarket"); return; }
          Vibe.body.effect("cook");
          if (!calDone().eat) { markDone("eat"); Vibe.reward({ xp: 10, from: a }); FX.toast("Домашняя еда! Мама гордится · +10 XP", "🍳", 2400); }
          FX.burst(a, { emojis: ["🍳", "🥗", "✨"], count: 12 });
          refreshTodos(true);
          refreshTimeline();
          return;
        }
        if (act === "chk") {
          const row = a.closest(".cal-todo");
          if (row && row.classList.contains("done")) { FX.bump(a); FX.burst(a, { emojis: ["✅", "✨"], count: 6, spread: 60 }); return; }
          if (row && row.classList.contains("missed")) { FX.shake(row); FX.toast("Это уже история. Завтра получится", "🫠"); return; }
          const id = a.dataset.id;
          const inl = row && row.querySelector('[data-cal="mom"], [data-cal="cook"]');
          if (inl && (id === "mom" || id === "eat")) { inl.click(); return; }
          if (row && row.classList.contains("ready")) { const btn = row.querySelector('[data-cal="claim"]'); if (btn) btn.click(); return; }
          FX.shake(row || a);
          FX.toast("Сначала сделай, потом отмечай. Мы всё видим 👀", "🧐", 2400);
        }
      });

      return () => disposers.forEach((fn) => { try { fn(); } catch (err) {} });
    },
  });

  /* ---------- Шрифт: узкий жирный гротеск с кириллицей ---------- */
  if (!document.getElementById("cal-font-oswald")) {
    const ln = document.createElement("link");
    ln.id = "cal-font-oswald"; ln.rel = "stylesheet";
    ln.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap";
    document.head.appendChild(ln);
  }

  /* ---------- Стили ---------- */
  const css = `
  :root { --calp:#ff2fb9; --calv:#8a17e8; --caly:#ffe600; --calk:#1b1a21; --calf:"Oswald", "Dela Gothic One", system-ui, sans-serif; }
  .cal-top { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px; position:relative; }
  .cal-kicker { font-family:var(--calf); font-weight:600; font-size:13px; text-transform:uppercase; letter-spacing:.3px; line-height:1.15; min-width:0; }
  .cal-kicker i { font-style:normal; color:var(--calp); }

  /* Общие пилюли и теги */
  .cal-tag { display:inline-flex; align-items:center; gap:4px; height:26px; padding:0 11px; border-radius:999px; font-size:12px; font-weight:800; white-space:nowrap; background:#fff; color:var(--calk); }
  .cal-tag.k { background:var(--calk); color:#fff; } .cal-tag.y { background:var(--caly); color:var(--calk); }
  .cal-tag.p { background:var(--calp); color:#fff; } .cal-tag.v { background:var(--calv); color:#fff; }
  .cal-tag.w { background:#fff; color:var(--calk); }
  .cal-pill { display:inline-flex; align-items:center; justify-content:center; height:36px; padding:0 14px; border-radius:999px; font-family:var(--calf); font-weight:600; font-size:14px; text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; flex:0 0 auto; border:2px solid transparent; transition:transform .18s var(--spring); }
  .cal-pill:active { transform:scale(.92); }
  .cal-pill.v { background:var(--calv); color:#fff; border-color:var(--calv); }
  .cal-pill.o { background:#fff; color:var(--calv); border-color:var(--calp); }
  .cal-pill.y { background:var(--caly); color:var(--calk); border-color:var(--caly); animation:pulse 1.2s ease-in-out infinite; }
  .cal-pill.lg { height:50px; font-size:17px; padding:0 18px; }
  .cal-pill.block { width:100%; }

  /* Заголовки секций, вылезающие за край */
  .cal-h { margin:30px -16px 0; padding:0 0 0 16px; overflow:hidden; white-space:nowrap; font-family:var(--calf); font-weight:700; font-size:52px; line-height:.9; text-transform:uppercase; letter-spacing:-.5px; color:var(--calk); }
  .cal-h.p { color:var(--calp); } .cal-h.v { color:var(--calv); }
  .cal-hsub { font-size:12px; font-weight:800; color:var(--muted); margin:6px 0 12px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }

  /* Герой */
  .cal-hero { margin:0 -16px; padding:6px 0 20px; position:relative; overflow:hidden; color:#fff; background:var(--calp); border-radius:0 0 36px 36px; transition:background .8s; }
  .cal-hero.p-night { background:#3b0a7a; }
  .cal-hero.p-evening { background:linear-gradient(170deg, var(--calp) 30%, var(--calv)); }
  .cal-bleed { white-space:nowrap; font-family:var(--calf); font-weight:700; text-transform:uppercase; line-height:.84; letter-spacing:-1px; }
  .cal-b1 { font-size:96px; margin-left:-10px; color:#fff; }
  .cal-b2 { font-size:58px; margin:6px 0 0 -6px; color:var(--calv); }
  .cal-hero.p-morning .cal-b2, .cal-hero.p-evening .cal-b2 { color:var(--caly); }
  .cal-hero.p-night .cal-b2 { color:var(--calp); }
  .cal-badge { position:absolute; right:12px; top:14px; width:96px; height:96px; border-radius:50%; background:var(--calv); display:grid; place-items:center; z-index:3; box-shadow:0 0 0 3px #fff; transform:rotate(-8deg); }
  .cal-hero.p-night .cal-badge { background:var(--calp); }
  .cal-badge svg { position:absolute; inset:0; width:100%; height:100%; animation:cal-spin 12s linear infinite; }
  .cal-badge text { font-family:var(--calf); font-weight:600; font-size:12px; letter-spacing:2px; fill:#fff; }
  .cal-badge .emo { font-size:30px; }
  @keyframes cal-spin { to { transform:rotate(360deg); } }
  .cal-clock { display:flex; align-items:center; perspective:500px; margin:4px 0 0 4px; }
  .cal-d { font-family:var(--calf); font-weight:700; font-size:148px; line-height:.86; width:.52em; text-align:center; display:inline-block; color:#fff; text-shadow:6px 6px 0 var(--calv); font-variant-numeric:tabular-nums; }
  .cal-hero.p-night .cal-d { text-shadow:6px 6px 0 var(--calp); }
  .cal-d.flip { animation:cal-flip .55s var(--spring); }
  @keyframes cal-flip { 0% { transform:rotateX(90deg); color:var(--caly); } 60% { transform:rotateX(-18deg); color:var(--caly); } 100% { transform:none; } }
  .cal-colon { font-family:var(--calf); font-weight:700; font-size:110px; line-height:.86; width:30px; text-align:center; color:var(--caly); animation:cal-blink 2.5s steps(2) infinite; }
  @keyframes cal-blink { 50% { opacity:.25; } }
  .cal-quip { font-weight:800; font-size:13px; margin:10px 16px 0; }
  .cal-sky { position:relative; height:64px; margin:8px 30px 2px; color:#fff; }
  .cal-sky svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
  .cal-orb { position:absolute; font-size:32px; transform:translate(-50%,-50%); transition:left .5s linear, top .5s linear; filter:drop-shadow(0 3px 0 rgba(42,10,85,.45)); }
  .cal-barwrap { position:relative; margin:18px 16px 0; padding-bottom:16px; }
  .cal-bar { display:flex; height:18px; border-radius:999px; overflow:hidden; background:#fff; box-shadow:0 0 0 2.5px var(--calk); }
  .cal-bar i { display:block; height:100%; border-right:2px solid var(--calk); flex:0 0 auto; }
  .cal-pin { position:absolute; top:-8px; width:4px; height:34px; background:var(--calk); border-radius:3px; transform:translateX(-50%); transition:left .5s linear; }
  .cal-pin span { position:absolute; top:-22px; left:50%; transform:translateX(-50%); font-size:18px; }
  .cal-ticks { position:absolute; left:0; right:0; bottom:0; height:14px; }
  .cal-ticks span { position:absolute; transform:translateX(-50%); font-family:var(--calf); font-size:11px; font-weight:600; }
  .cal-ticks span:first-child { transform:none; } .cal-ticks span:last-child { transform:translateX(-100%); }
  .cal-legend { display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px; font-size:11px; font-weight:800; margin:4px 16px 0; }
  .cal-note { font-weight:700; font-size:12px; margin:10px 16px 0; line-height:1.3; opacity:.92; }
  .cal-chips { display:flex; flex-wrap:wrap; gap:6px; margin:12px 16px 0; }

  /* Обратный отсчёт */
  .cal-big { display:block; width:100%; text-align:left; margin-top:18px; padding:30px 18px 18px; background:var(--calv); color:#fff; border-radius:26px; clip-path:polygon(0 7%, 100% 0, 100% 100%, 3% 97%); transform:rotate(-1.2deg); transition:transform .2s var(--spring); position:relative; }
  .cal-big:active { transform:rotate(-1.2deg) scale(.97); }
  .cal-big.empty { background:var(--calk); }
  .cal-big-tags { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .cal-big-corner { margin-left:auto; font-family:var(--calf); font-weight:700; font-style:italic; font-size:30px; line-height:1; color:#fff; transform:rotate(-6deg); }
  .cal-big-row { display:flex; justify-content:space-between; align-items:flex-end; gap:10px; margin-top:22px; }
  .cal-big-l { font-family:var(--calf); font-weight:700; font-size:40px; line-height:.92; text-transform:uppercase; letter-spacing:-.3px; }
  .cal-big-r { text-align:right; display:flex; flex-direction:column; align-items:flex-end; }
  .cal-big-r b { font-family:var(--calf); font-weight:700; font-size:104px; line-height:.8; color:var(--caly); letter-spacing:-2px; }
  .cal-big-r span { font-family:var(--calf); font-weight:700; font-size:20px; line-height:1; text-transform:uppercase; margin-top:6px; }
  .cal-big-cd { display:flex; align-items:center; gap:8px; margin-top:16px; padding:8px 14px; border-radius:999px; background:rgba(255,255,255,.14); font-weight:800; font-size:12px; }
  .cal-big-cd [data-bigcd] { font-family:var(--calf); font-weight:700; font-size:22px; line-height:1; font-variant-numeric:tabular-nums; color:var(--caly); }
  .cal-big-cd small { font-size:11px; font-weight:800; opacity:.8; margin-left:auto; }

  /* Таймлайн */
  .cal-strip { display:flex; flex-wrap:wrap; gap:6px; align-items:center; font-size:12px; font-weight:800; margin:0 0 10px; }
  .cal-strip b { width:100%; font-size:12px; }
  .cal-strip .cal-tag { white-space:normal; height:auto; min-height:26px; padding:4px 11px; }
  .cal-tlcard { background:#fff; border-radius:28px; padding:18px 12px 18px 10px; box-shadow:0 0 0 2.5px var(--calk), 0 6px 0 var(--calp); }
  .cal-tl { position:relative; height:${TL_H}px; }
  .cal-hr { position:absolute; left:0; right:0; height:0; border-top:2px dotted rgba(138,23,232,.18); }
  .cal-hr span { position:absolute; left:0; top:-8px; font-family:var(--calf); font-size:11px; font-weight:600; color:var(--muted); background:#fff; padding-right:4px; font-variant-numeric:tabular-nums; }
  .cal-past { position:absolute; left:40px; right:0; top:0; background:repeating-linear-gradient(-45deg, rgba(138,23,232,.06) 0 6px, transparent 6px 12px); border-radius:0 0 10px 10px; pointer-events:none; transition:height .5s linear; }
  .cal-blk { position:absolute; left:44px; width:calc(44% - 34px); border-radius:14px; padding:5px 9px; text-align:left; overflow:hidden; display:flex; flex-direction:column; gap:2px; z-index:1; transition:transform .15s var(--spring); }
  .cal-blk:active { transform:scale(.97); }
  .cal-blk b { font-family:var(--calf); font-size:14px; font-weight:600; text-transform:uppercase; line-height:1.05; letter-spacing:.2px; }
  .cal-blk small { font-size:10px; font-weight:800; opacity:.85; line-height:1.2; }
  .cal-blk.k-k { background:var(--calk); color:#fff; }
  .cal-blk.k-v { background:var(--calv); color:#fff; clip-path:polygon(0 0, 100% 3%, 100% 100%, 0 97%); }
  .cal-blk.k-p { background:var(--calp); color:#fff; }
  .cal-blk.dash { background:#fff; color:var(--calp); border:2.5px dashed var(--calp); }
  .cal-pt { position:absolute; left:calc(44% + 18px); right:0; height:28px; transform:translateY(-50%); border-radius:999px; display:flex; align-items:center; gap:5px; padding:0 10px; font-size:12px; font-weight:800; z-index:2; min-width:0; border:2px solid transparent; transition:transform .15s var(--spring); }
  .cal-pt:active { transform:translateY(-50%) scale(.95); }
  .cal-pt .tx { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
  .cal-pt.k-y { background:var(--caly); color:var(--calk); }
  .cal-pt.k-v { background:var(--calv); color:#fff; }
  .cal-pt.k-p { background:var(--calp); color:#fff; }
  .cal-pt.k-ok { background:#fff; color:var(--calv); border-color:var(--calv); }
  .cal-pt.k-w { background:#fff; border-color:#ddd; }
  .cal-pt.missed { opacity:.5; text-decoration:line-through; }
  .cal-glow { animation:pulse 1.4s ease-in-out infinite; }
  .cal-glow:active { animation:none; }
  .cal-now { position:absolute; left:34px; right:-4px; height:0; border-top:3px solid var(--calp); z-index:4; transition:top .5s linear; pointer-events:none; }
  .cal-now::before { content:""; position:absolute; left:-7px; top:-9px; width:14px; height:14px; border-radius:50%; background:var(--calp); box-shadow:0 0 0 3px #fff, 0 0 0 5px var(--calp); animation:pulse 1.2s ease-in-out infinite; }
  .cal-now b { position:absolute; right:0; top:-12px; background:var(--calp); color:#fff; border-radius:999px; font-family:var(--calf); font-size:12px; font-weight:600; padding:2px 9px; font-variant-numeric:tabular-nums; white-space:nowrap; text-transform:uppercase; }

  /* Дела */
  .cal-dl { font-size:11px; font-weight:800; padding:4px 10px; background:var(--caly); color:var(--calk); border-radius:999px; transform:rotate(-2deg); display:inline-block; white-space:nowrap; }
  .cal-todos { background:#fff; border-radius:28px; padding:14px; box-shadow:0 0 0 2.5px var(--calk), 0 6px 0 var(--calv); }
  .cal-thead { display:flex; align-items:center; gap:12px; margin:-2px 0 10px; padding:12px 14px; border-radius:20px; background:var(--calp); color:#fff; }
  .cal-tcount { display:flex; align-items:baseline; font-family:var(--calf); font-weight:700; line-height:.85; }
  .cal-tcount b { font-size:54px; } .cal-tcount small { font-size:24px; opacity:.85; }
  .cal-tlbl { font-weight:800; font-size:12px; line-height:1.25; margin-bottom:6px; }
  .cal-pbar { height:8px; border-radius:999px; background:#f1e8ff; overflow:hidden; margin-top:6px; }
  .cal-pbar i { display:block; height:100%; border-radius:999px; background:linear-gradient(90deg, var(--calv), var(--calp)); transition:width .9s var(--spring); }
  .cal-pbar.big { height:12px; background:rgba(255,255,255,.3); margin:0; }
  .cal-pbar.big i { background:var(--caly); }
  .cal-qhead { margin:16px 0 4px; display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
  .cal-qhead span { font-family:var(--calf); font-weight:700; font-size:24px; text-transform:uppercase; color:var(--calv); line-height:1; white-space:nowrap; }
  .cal-qhead small { font-size:11px; font-weight:800; color:var(--muted); text-align:right; }
  .cal-tlist { display:grid; gap:6px; }
  .cal-todo { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:18px; background:#faf5ff; }
  .cal-chk { width:30px; height:30px; border-radius:50%; border:2.5px solid var(--calp); background:#fff; flex:0 0 auto; display:grid; place-items:center; font-weight:900; font-size:16px; color:#fff; transition:transform .2s var(--spring), background .2s; }
  .cal-chk:active { transform:scale(.85); }
  .cal-te { font-size:22px; flex:0 0 auto; }
  .cal-tt { flex:1; min-width:0; }
  .cal-tt b { display:inline; font-size:14px; font-weight:800; line-height:1.2; background:linear-gradient(var(--calp), var(--calp)) no-repeat 0 55% / 0 3px; transition:background-size .45s var(--out); }
  .cal-tt small { display:block; font-size:11px; font-weight:700; color:var(--muted); line-height:1.25; margin-top:1px; }
  .cal-rwi { color:var(--calv); font-weight:900; }
  .cal-rw { font-size:11px; font-weight:900; padding:4px 9px; border-radius:999px; background:#fff; color:var(--calv); white-space:nowrap; flex:0 0 auto; }
  .cal-todo .cal-pill { height:34px; padding:0 11px; font-size:13px; }
  .cal-todo.done { background:#f4f4f6; }
  .cal-todo.done .cal-chk { background:var(--calv); border-color:var(--calv); }
  .cal-todo.done .cal-tt b { background-size:100% 3px; }
  .cal-todo.done .cal-te, .cal-todo.done .cal-tt { opacity:.6; }
  .cal-todo.done .cal-rw { background:var(--calv); color:#fff; }
  .cal-todo.missed .cal-chk { background:var(--calk); border-color:var(--calk); }
  .cal-todo.missed .cal-tt { opacity:.55; }
  .cal-todo.urgent { background:#fff0fa; box-shadow:inset 0 0 0 2px var(--calp); }
  .cal-todo.urgent .cal-chk { animation:pulse 1.2s ease-in-out infinite; }
  .cal-todo.ready { background:#fffbd1; }
  .cal-todo.ready .cal-chk { background:var(--caly); border-color:var(--calk); animation:pulse 1.2s ease-in-out infinite; }
  .cal-todo.just .cal-chk { animation:cal-check .7s var(--spring); }
  .cal-todo.just .cal-te { animation:jelly .6s var(--spring); }
  .cal-todo.just .cal-tt b { transition-delay:.15s; }
  @keyframes cal-check { 0% { transform:scale(.4) rotate(-30deg); } 60% { transform:scale(1.35) rotate(8deg); } 100% { transform:none; } }

  /* Продуктивность */
  .cal-prod { padding:28px 18px 26px; background:var(--calv); color:#fff; border-radius:26px; clip-path:polygon(0 0, 100% 5%, 97% 100%, 0 96%); transform:rotate(1deg); }
  .cal-prod-row { display:flex; align-items:flex-end; gap:12px; margin-top:6px; }
  .cal-prod-n { font-family:var(--calf); font-weight:700; font-size:150px; line-height:.8; letter-spacing:-4px; }
  .cal-prod-u { font-family:var(--calf); font-weight:700; font-size:24px; line-height:.95; text-transform:uppercase; padding-bottom:4px; }
  .cal-pmeter { height:14px; border-radius:999px; background:rgba(255,255,255,.2); overflow:hidden; margin-top:14px; }
  .cal-pmeter i { display:block; height:100%; border-radius:999px; transition:width .9s var(--spring); }
  .cal-pstats { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:12px; }
  .cal-pstats div { display:flex; justify-content:space-between; align-items:center; gap:6px; padding:8px 12px; border-radius:16px; font-size:12px; font-weight:800; }
  .cal-pstats b { font-family:var(--calf); font-weight:700; font-size:20px; line-height:1; font-variant-numeric:tabular-nums; }
  .cal-pstats .s1 { background:var(--calp); } .cal-pstats .s2 { background:var(--caly); color:var(--calk); }
  .cal-pstats .s3 { background:#fff; color:var(--calk); } .cal-pstats .s4 { background:var(--calk); }
  .cal-tips { display:grid; gap:8px; margin-top:16px; }
  .cal-tip { display:flex; gap:10px; align-items:center; width:100%; text-align:left; font-size:13px; font-weight:800; line-height:1.25; padding:11px 14px; border-radius:999px; background:#fff; border:2px solid var(--calp); transition:transform .18s var(--spring); }
  .cal-tip:active { transform:scale(.97); }
  .cal-tip.t1 { border-color:var(--calv); } .cal-tip.t2 { border-color:var(--calk); }
  .cal-tip .emo { font-size:22px; flex:0 0 auto; }
  .cal-tip i { margin-left:auto; font-style:normal; font-family:var(--calf); font-weight:700; color:var(--calp); }

  .cal-mq .marquee { background:var(--calp); color:#fff; border-color:var(--calk); }
  .cal-mq .marquee > div { font-family:var(--calf); font-weight:700; font-size:22px; text-transform:uppercase; }

  /* Месяц */
  .cal-month { margin-top:14px; background:#fff; border-radius:30px; padding:10px 14px 16px; box-shadow:0 0 0 2.5px var(--calk), 0 6px 0 var(--calk); }
  .cal-handle { width:44px; height:5px; border-radius:9px; background:var(--calk); margin:0 auto 12px; }
  .cal-mtitle { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:8px; }
  .cal-mt { font-family:var(--calf); font-weight:700; font-size:34px; line-height:.9; text-transform:uppercase; letter-spacing:-.3px; white-space:nowrap; }
  .cal-msel { font-weight:800; font-size:15px; display:flex; align-items:center; gap:5px; }
  .cal-msel i { font-style:normal; font-size:11px; }
  .cal-mhead, .cal-grid { display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:5px; }
  .cal-mhead { font-size:12px; font-weight:700; color:var(--calk); text-align:center; margin-bottom:8px; }
  .cal-mhead .we { color:var(--calp); }
  .cal-day { aspect-ratio:1; border-radius:11px; background:var(--calk); color:#fff; display:grid; place-items:center; min-width:0; position:relative; transition:transform .2s var(--spring); }
  .cal-day b { font-family:var(--calf); font-size:15px; font-weight:500; }
  .cal-day.empty { background:none; }
  .cal-day.we { background:#36303f; }
  .cal-day.ev { border-radius:50%; }
  .cal-day.k-in, .cal-day .more.k-in, .cal-mlegend .k-in, .cal-up-d .k-in, .cal-sh-date .k-in { background:var(--calp); color:#fff; }
  .cal-day.k-bill, .cal-day .more.k-bill, .cal-mlegend .k-bill, .cal-up-d .k-bill, .cal-sh-date .k-bill { background:var(--caly); color:var(--calk); }
  .cal-day.k-vi, .cal-day .more.k-vi, .cal-mlegend .k-vi, .cal-up-d .k-vi, .cal-sh-date .k-vi { background:var(--calv); color:#fff; }
  .cal-day .more { position:absolute; right:1px; top:1px; width:11px; height:11px; border-radius:50%; box-shadow:0 0 0 2px #fff; }
  .cal-day.past { opacity:.32; }
  .cal-day.today { box-shadow:0 0 0 2.5px #fff, 0 0 0 5px var(--calp); z-index:1; animation:cal-today 2.4s var(--spring) infinite; }
  @keyframes cal-today { 0%, 80%, 100% { transform:scale(1.04); } 88% { transform:scale(1.18) rotate(-6deg); } }
  .cal-day:active { transform:scale(.88); }
  .cal-mlegend { display:flex; flex-wrap:wrap; gap:6px; margin-top:14px; }
  .cal-mlegend span { display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px 0 6px; border-radius:999px; background:#f4f1f8; font-size:11px; font-weight:800; }
  .cal-mlegend i { width:16px; height:16px; border-radius:50%; display:block; }
  .cal-mlegend i.k-today { background:var(--calk); box-shadow:0 0 0 2px #fff, 0 0 0 3.5px var(--calp); border-radius:5px; }
  .cal-mbtns { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px; }
  .cal-mnote { text-align:center; font-size:11px; font-weight:800; color:var(--muted); margin-top:10px; }

  /* Ближайшее */
  .cal-uplist { display:grid; gap:8px; }
  .cal-up { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:9px 12px 9px 9px; background:#fff; border-radius:22px; box-shadow:0 0 0 2px var(--calk); transition:transform .18s var(--spring); }
  .cal-up:active { transform:scale(.97); }
  .cal-up:first-child { box-shadow:0 0 0 2.5px var(--calk), 0 5px 0 var(--calp); }
  .cal-up-d { width:48px; height:48px; border-radius:14px; background:var(--calk); display:grid; place-items:center; flex:0 0 auto; }
  .cal-up-d b { width:36px; height:36px; border-radius:50%; display:grid; place-items:center; font-family:var(--calf); font-weight:700; font-size:17px; }
  .cal-up .tx { flex:1; min-width:0; display:flex; flex-direction:column; }
  .cal-up .tx b { font-family:var(--calf); font-weight:600; font-size:17px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.1; }
  .cal-up .tx small { font-size:11px; font-weight:800; color:var(--muted); font-variant-numeric:tabular-nums; margin-top:2px; }
  .cal-up .cal-tag.w { box-shadow:inset 0 0 0 2px var(--calk); }
  .cal-upempty { text-align:center; padding:20px; border-radius:26px; background:var(--calv); color:#fff; }

  /* Шторка дня */
  .cal-sh-head { display:flex; gap:12px; align-items:center; }
  .cal-sh-date { width:66px; height:72px; border-radius:18px; background:var(--calk); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; flex:0 0 auto; }
  .cal-sh-date.today { box-shadow:0 0 0 3px #fff, 0 0 0 6px var(--calp); }
  .cal-sh-date b { width:44px; height:44px; border-radius:50%; display:grid; place-items:center; font-family:var(--calf); font-weight:700; font-size:24px; line-height:1; }
  .cal-sh-date small { font-family:var(--calf); font-weight:600; font-size:12px; text-transform:uppercase; }
  .cal-sh-t { font-family:var(--calf); font-weight:700; font-size:32px; line-height:.95; text-transform:uppercase; }
  .cal-sh-when { display:flex; gap:10px; align-items:center; margin-top:14px; font-weight:800; font-size:14px; padding:12px 16px; border-radius:22px; background:var(--calv); color:#fff; clip-path:polygon(0 4%, 100% 0, 100% 100%, 0 100%); }
  .cal-sh-when .emo { font-size:28px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
