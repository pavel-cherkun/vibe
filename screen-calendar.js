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
    if (dom === 14 && s.plus) ev.push({ e: "💎", t: "Плюс Вайб", a: -299, col: "c-lilac", quiet: true });
    if (s.job) {
      const net = Math.round(s.job.salary * (1 - TAX));
      if (dom === 15) ev.push({ e: "💸", t: "Аванс", sub: s.job.company, a: Math.round(net * 0.4), col: "c-lime" });
      if (dom === 30) ev.push({ e: "💰", t: "Зарплата", sub: s.job.company, a: Math.round(net * 0.6) + (s.job.bonus || 0), col: "c-lime" });
    }
    (s.loans || []).forEach((l) => { if (l.left > 0 && dom === l.dom) ev.push({ e: "🏦", t: `Кредит «${l.name}»`, sub: `осталось ${l.left} плат.`, a: -l.monthly, col: "c-pink" }); });
    concertsOn(day).forEach((t) => ev.push({ e: "🎤", t: t.t, sub: `${t.place || "концерт"} · 20:00`, col: "c-orange", concert: true }));
    return ev;
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
  function heroHtml(I) {
    const mod = Math.floor(G().minutes() % 1440);
    const o = orbPos(mod);
    const t = I.time;
    return `
      <div class="cal-hero p-${period(mod)}" data-hero>
        <span class="cal-star" style="left:12%;top:18px">✦</span><span class="cal-star" style="left:78%;top:30px">✦</span><span class="cal-star" style="left:52%;top:10px">✧</span><span class="cal-star" style="left:30%;top:44px">✧</span>
        <div class="cal-sky">
          <svg viewBox="0 0 100 64" preserveAspectRatio="none" aria-hidden="true"><polyline points="${skyPoints()}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5" vector-effect="non-scaling-stroke" opacity=".45"/></svg>
          <span class="cal-orb" data-orb style="left:${o.left}%;top:${o.top}px"><span class="emo float">${o.e}</span></span>
        </div>
        <div class="cal-clock" aria-label="Игровое время ${t}">
          <span class="cal-d" data-dg>${t[0]}</span><span class="cal-d" data-dg>${t[1]}</span><span class="cal-colon">:</span><span class="cal-d" data-dg>${t[3]}</span><span class="cal-d" data-dg>${t[4]}</span>
        </div>
        <div class="cal-date" data-date>${I.dom} ${MONTHS[I.month]} · ${WD[wd(I.day)]}</div>
        <div class="cal-quip" data-quip>${WD_QUIP[wd(I.day)]}</div>
        <div class="cal-barwrap">
          <div class="cal-bar">
            <i style="width:29.17%;background:var(--violet)"></i><i style="width:8.33%;background:var(--yellow)"></i><i style="width:41.67%;background:${S().job ? "var(--sky)" : "var(--mint)"}"></i><i style="width:16.67%;background:var(--pink)"></i><i style="width:4.16%;background:var(--violet);border:0"></i>
          </div>
          <div class="cal-pin" data-pin style="left:${(mod / 1440) * 100}%"><span>📍</span></div>
          <div class="cal-ticks"><span style="left:0">00</span><span style="left:25%">06</span><span style="left:50%">12</span><span style="left:75%">18</span><span style="left:100%">24</span></div>
        </div>
        <div class="cal-legend"><span>🌙 ночь</span><span>☀️ утро</span><span>${S().job ? "💼 работа" : "🧃 день"}</span><span>🌆 вечер</span></div>
        <div class="cal-note" data-note>${heroNote(I, mod)}</div>
        <div class="cal-chips">
          <span class="badge" style="background:#fff" data-lifeday>📆 День жизни №${I.day + 1}</span>
          <span class="badge" style="background:var(--yellow)">⏱️ 1 мин = 2,5 сек</span>
          <span class="badge" style="background:${isWorkday(I.day) ? "var(--sky)" : "var(--pink)"}" data-dtype>${isWorkday(I.day) ? "💼 Будний" : "🎉 Выходной"}</span>
        </div>
      </div>`;
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
    blocks.push({ f: 6, to: 7, e: "😴", t: b && b.sleeping ? "Спишь…" : sleptToday ? `Сон ${lastSleep.hours} ч` : "Сон до 07:00", sub: sleptToday ? `качество ${Math.round(lastSleep.q * 100)}%` : "будильник 07:00", c: "c-lilac", go: "fit" });
    // Работа
    if (s.job && isWorkday(day)) {
      const done = G().TASKS_PER_DAY - G().tasksLeft();
      blocks.push({ f: 9, to: 19, e: "💼", t: "Работа", sub: `${esc(s.job.company)} · задачи ${done}/${G().TASKS_PER_DAY}`, c: "c-sky", go: "job" });
    } else if (s.job) {
      blocks.push({ f: 11, to: 17, e: "🛋️", t: "Выходной", sub: "но рабочий чат открыт", c: "c-pink", go: "job" });
    } else {
      blocks.push({ f: 10, to: 13, e: "📨", t: "Поиск работы", sub: "откликайся в Vibe Job", c: "c-coral", go: "job", dash: true });
    }
    blocks.push({ f: 23, to: 24, e: "🌙", t: "Отбой", sub: "в 23:00. В теории", c: "c-lilac", go: "fit" });

    // Еда
    const meals = (b && b.meals) || [];
    [[8, "🍳", "Завтрак"], [13, "🥪", "Обед"], [19, "🍝", "Ужин"]].forEach(([h, e, t]) => {
      const eaten = meals.some((m) => m.day === day && Math.abs((m.min % 1440) - h * 60) <= 90);
      const missed = !eaten && mod > h * 60 + 90;
      pts.push({ h, e: eaten ? "✅" : e, t: `${t} ${pad(h)}:00`, c: eaten ? "c-lime" : missed ? "c-white missed" : "c-yellow", go: "eat" });
    });
    doctorsOn(day).forEach((d) => pts.push({ h: clamp(d.h, 6, 23.6), e: d.e, t: `${d.t} ${d.time}`, c: "c-mint", go: "health" }));
    concertsOn(day).forEach((t) => pts.push({ h: 20, e: "🎤", t: `${esc(t.t)} 20:00`, c: "c-orange", go: "tickets" }));
    const inv = invites();
    if (inv.length) pts.push({ h: clamp(Math.ceil(mod / 60 + 0.01), 7, 23), e: "🎤", t: `Собеседование${inv.length > 1 ? ` ×${inv.length}` : ""} ждёт`, c: "c-lime cal-glow", go: "job" });

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
    return `<div class="cal-strip"><b>Ночью в 00:00 случилось:</b>${ev.map((e) => `<span class="badge ${e.col}" style="border-color:var(--ink)">${e.e} ${esc(e.t)} ${e.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(e.a))}</span>`).join("")}</div>`;
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
    else if (x.claim) btn = `<button class="btn black sm" data-cal="claim" data-q="${x.claim}">${x.rw}</button>`;
    else if (x.act && x.act.inline) btn = `<button class="btn lime sm" data-cal="${x.act.inline}">${x.act.label}</button>`;
    else if (x.act && x.act.go) btn = `<button class="btn sm" data-go="${x.act.go}">${x.act.label}</button>`;
    else btn = `<span class="cal-rw">${x.rw}</span>`;
    return `
      <div class="cal-todo ${cls}" data-todo="${x.id}">
        <button class="cal-chk" data-cal="chk" data-id="${x.id}" aria-label="Отметить">${x.done ? "✓" : x.missed ? "✕" : ""}</button>
        <span class="cal-te emo">${x.e}</span>
        <div class="cal-tt">
          <b>${x.t}</b>
          <small>${x.sub}${!x.done && !x.missed && !x.claim && x.rw && (x.act && (x.act.go || x.act.inline)) ? ` · <span class="cal-rwi">${x.rw}</span>` : ""}</small>
          ${x.prog != null && !x.done ? `<div class="progress" style="height:8px;margin-top:5px"><i style="--p:${Math.round(x.prog * 100)}%"></i></div>` : ""}
        </div>
        ${btn}
      </div>`;
  }
  function todosHtml(list) {
    const life = list.filter((x) => !x.quest), q = list.filter((x) => x.quest);
    const total = list.length, n = list.filter((x) => x.done).length;
    return `
      <div class="cal-thead">
        <div class="cal-tcount"><span class="big-num">${n}</span><small>/${total}</small></div>
        <div style="flex:1;min-width:0"><div class="progress"><i style="--p:${total ? Math.round((n / total) * 100) : 0}%"></i></div>
        <small class="muted" style="font-weight:800;font-size:12px">${n === total ? "Всё сделано. Подозрительно продуктивно 🗿" : n === 0 ? "Ноль из скольких-то. Начни с маленького" : "Хороший темп. Не сбавляй"}</small></div>
      </div>
      <div class="cal-tlist">${life.map(todoRow).join("")}</div>
      <div class="cal-qhead">🎯 Задания дня <small>обновятся завтра (по-настоящему)</small></div>
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
    const col = d.score < 40 ? "var(--coral)" : d.score < 70 ? "var(--yellow)" : "var(--lime)";
    const grade = d.score < 25 ? "Овощ 🥔" : d.score < 50 ? "Разгоняюсь 🐢" : d.score < 70 ? "Норм 🙂" : d.score < 85 ? "Машина 🚀" : "Сигма 🗿";
    return `
      <div class="card cal-prod">
        <div class="cal-ring" style="--p:${d.score};--c:${col}"><div><b class="big-num">${d.score}</b><small>${grade}</small></div></div>
        <div class="cal-pstats">
          <div><span>⚡</span><b>Тело</b><i>${d.p}%</i></div>
          <div><span>✅</span><b>Дела</b><i>${d.n}/${d.total}</i></div>
          <div><span>👟</span><b>Шаги</b><i>${Vibe.fmt(d.steps)}</i></div>
          <div><span>😴</span><b>Сон</b><i>${d.last ? d.last.hours + " ч" : "—"}</i></div>
        </div>
      </div>
      <div class="cal-tips">${tips(d).map(([e, t, go]) => `<button class="card tight tap cal-tip" data-go="${go}"><span class="emo">${e}</span><span>${t}</span></button>`).join("")}</div>`;
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
      const mk = eventsOn(d).filter((e) => !e.quiet).map((e) => e.e);
      const cls = d === I.day ? "today" : d < I.day ? "past" : "";
      const we = wd(d) >= 5 ? "we" : "";
      const pay = eventsOn(d).some((e) => e.a > 0) ? "pay" : "";
      cells += `<button class="cal-day ${cls} ${we} ${pay}" data-cal="day" data-d="${d}"><b>${i + 1}</b><span class="mk">${mk.slice(0, 2).join("")}${mk.length > 2 ? "+" : ""}</span></button>`;
    }
    return `
      <div class="card cal-month">
        <div class="cal-mtitle"><span class="display">${MONTHS_NOM[I.month]}</span><span class="badge" style="background:var(--yellow)">30 дней = 30 часов</span></div>
        <div class="cal-mhead">${WD_S.map((w, i) => `<span style="${i >= 5 ? "color:#e5333d" : ""}">${w}</span>`).join("")}</div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-mlegend">${S().job ? "<span>💸 аванс</span><span>💰 зарплата</span>" : ""}<span>🔑 аренда</span><span>💡 ЖКХ</span><span>🏦 кредит</span><span>🎤 концерт</span></div>
      </div>`;
  }
  function daySheet(d) {
    const I = G().info();
    const dom = domOf(d), mon = monOf(d);
    const ev = eventsOn(d);
    const diff = d - I.day;
    const docs = d === I.day ? doctorsOn(d) : [];
    const when = diff === 0 ? "Сегодня. Прямо сейчас. Не откладывай"
      : diff > 0 ? `Через ${diff} ${plural(diff, "день", "дня", "дней")} (≈ ${fmtReal(G().realMinTo(d))} реального времени)`
      : `${-diff} ${plural(-diff, "день", "дня", "дней")} назад. Прошлого не вернуть, но выписку можно`;
    const rows = [];
    if (S().job && isWorkday(d)) rows.push({ e: "💼", t: "Работа 09:00–19:00", sub: S().job.company, col: "c-sky" });
    ev.forEach((e) => rows.push(e));
    docs.forEach((x) => rows.push({ e: x.e, t: `${x.t} в ${x.time}`, sub: "Vibe Health", col: "c-mint" }));
    rows.push({ e: "🧾", t: "Продукты, метро, кофе", sub: "каждый день, как налог на существование", a: -300, col: "c-white" });
    Vibe.ui.sheet(`
      <div class="cal-sh-head">
        <div class="cal-sh-date ${d === I.day ? "c-lime" : wd(d) >= 5 ? "c-pink" : "c-yellow"}"><b>${dom}</b><small>${MONTHS[mon].slice(0, 3)}</small></div>
        <div style="min-width:0"><div class="display" style="font-size:24px">${dom} ${MONTHS[mon]}</div><div style="font-weight:800;font-size:13px">${WD[wd(d)]} · ${isWorkday(d) ? "будний" : "выходной 🎉"}</div></div>
      </div>
      <div class="card tight c-black cal-sh-when"><span class="emo float">⏳</span><span>${when}</span></div>
      <div class="card flat stagger" style="padding:4px 14px;margin-top:12px">
        ${rows.map((r) => `<div class="li"><div class="ic ${r.col || "c-white"}">${r.e}</div><div class="tx"><b>${esc(r.t)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</div>${r.a ? `<div class="amt ${r.a > 0 ? "plus" : ""}">${r.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(r.a))}</div>` : ""}</div>`).join("")}
      </div>
      ${ev.length ? "" : `<div class="muted" style="text-align:center;font-weight:800;margin:12px 0 0">📭 Ничего особенного. Подозрительно спокойно</div>`}
      <button class="btn black block" style="margin-top:16px" data-close>Понятно</button>`);
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
    if (!list.length) return `<div class="card c-lilac" style="text-align:center"><div class="emo float" style="font-size:48px">🕳️</div><b>Пусто. Ни зарплаты, ни счетов</b><div style="font-size:13px;font-weight:700">Свобода — это когда нечего ждать. Или некуда</div></div>`;
    return `<div class="card" style="padding:4px 14px">${list.map((u, i) => `
      <div class="li cal-up">
        <div class="ic ${u.concert ? "c-orange" : u.a > 0 ? "c-lime" : "c-white"}"><span class="emo ${i === 0 ? "wobble" : ""}">${u.e}</span></div>
        <div class="tx"><b>${esc(u.t)}</b><small data-cd="${i}">${cdText(u)}</small></div>
        ${u.a ? `<div class="amt ${u.a > 0 ? "plus" : ""}">${u.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(u.a))}</div>` : `<span class="badge" style="background:var(--orange)">🎟️</span>`}
      </div>`).join("")}</div>`;
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
        <div style="min-width:0"><div class="display cal-title">Календарь <span class="emo wobble">📅</span></div><div class="muted" style="font-weight:800;font-size:13px">Время — единственное, что тут не продаётся. Пока</div></div>
        ${Vibe.ui.vibikiPill()}
      </div>
      <div class="stagger">
        <div data-hero-slot>${heroHtml(I)}</div>

        <h2 class="sec">Таймлайн дня <small data-tlsub>${I.dom} ${MONTHS[I.month]}</small></h2>
        <div data-strip>${moneyStripHtml(I)}</div>
        <div class="card cal-tlcard" data-tlslot>${timelineHtml(I)}</div>

        <h2 class="sec" style="flex-wrap:wrap;align-items:center">Дела на сегодня <span class="sticker cal-dl">Дедлайн ближе, чем кажется</span></h2>
        <div class="card cal-todos" data-todos>${todosHtml(list)}</div>

        <h2 class="sec">Продуктивность дня <small>считает Заботик</small></h2>
        <div data-prod>${prodHtml(list)}</div>

        ${Vibe.ui.marquee(["1 ДЕНЬ = 1 ЧАС", "ДЕДЛАЙН БЛИЖЕ, ЧЕМ КАЖЕТСЯ", "ПОНЕДЕЛЬНИК НЕИЗБЕЖЕН", "ПРОДУКТИВНОСТЬ — ЭТО ВАЙБ", "ЗАРПЛАТА СКОРО*"])}

        <h2 class="sec">Месяц <small>тапни по дню</small></h2>
        <div data-month>${monthHtml(I)}</div>

        <h2 class="sec">Ближайшее <small>в реальном времени</small></h2>
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
            setTimeout(() => FX.burst(chk || row, { emojis: ["✅", "✨", "🎉", "💚"], count: 12, spread: 110 }), 60);
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
          const dt = $("[data-dtype]"); if (dt) { dt.textContent = isWorkday(I.day) ? "💼 Будний" : "🎉 Выходной"; dt.style.background = isWorkday(I.day) ? "var(--sky)" : "var(--pink)"; }
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
      }
      function updateCountdowns() {
        root.querySelectorAll("[data-cd]").forEach((el) => { const u = upList[+el.dataset.cd]; if (u) el.textContent = cdText(u); });
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

  /* ---------- Стили ---------- */
  const css = `
  .cal-top { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:14px; position:relative; }
  .cal-title { font-size:30px; white-space:nowrap; }
  .cal-hero { border:var(--line); border-radius:32px; box-shadow:var(--shadow); padding:14px 16px 16px; position:relative; overflow:hidden; transition:background .8s, color .8s; }
  .cal-hero.p-night { background:#2a1d63; color:#fff; }
  .cal-hero.p-morning { background:var(--yellow); }
  .cal-hero.p-day { background:var(--sky); }
  .cal-hero.p-evening { background:linear-gradient(160deg, var(--orange), var(--pink)); }
  .cal-star { position:absolute; font-size:14px; opacity:0; transition:opacity .8s; color:var(--yellow); animation:pulse 2.2s ease-in-out infinite; }
  .cal-hero.p-night .cal-star { opacity:1; }
  .cal-sky { position:relative; height:64px; margin:0 14px 2px; }
  .cal-sky svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
  .cal-orb { position:absolute; font-size:32px; transform:translate(-50%,-50%); transition:left .5s linear, top .5s linear; filter:drop-shadow(0 3px 0 rgba(14,14,18,.35)); }
  .cal-clock { display:flex; justify-content:center; align-items:center; gap:5px; perspective:400px; margin-top:4px; }
  .cal-d { font-family:var(--font-display); font-size:60px; line-height:1; width:54px; height:76px; display:grid; place-items:center; background:#fff; color:var(--ink); border:var(--line); border-radius:16px; box-shadow:var(--shadow-sm); position:relative; font-variant-numeric:tabular-nums; }
  .cal-d::after { content:""; position:absolute; left:0; right:0; top:50%; border-top:2px solid rgba(14,14,18,.12); }
  .cal-d.flip { animation:cal-flip .55s var(--spring); }
  @keyframes cal-flip { 0% { transform:rotateX(90deg); background:var(--lime); } 60% { transform:rotateX(-18deg); } 100% { transform:none; } }
  .cal-colon { font-family:var(--font-display); font-size:52px; line-height:1; width:18px; text-align:center; animation:cal-blink 2.5s steps(2) infinite; }
  @keyframes cal-blink { 50% { opacity:.2; } }
  .cal-date { font-family:var(--font-display); font-size:21px; text-align:center; margin-top:12px; }
  .cal-quip { text-align:center; font-weight:800; font-size:12px; opacity:.8; margin-top:2px; }
  .cal-barwrap { position:relative; margin:18px 4px 0; padding-bottom:16px; }
  .cal-bar { display:flex; height:20px; border:var(--line); border-radius:999px; overflow:hidden; background:#fff; }
  .cal-bar i { display:block; height:100%; border-right:2px solid var(--ink); flex:0 0 auto; }
  .cal-pin { position:absolute; top:-8px; width:4px; height:36px; background:var(--ink); border-radius:3px; transform:translateX(-50%); transition:left .5s linear; }
  .cal-pin span { position:absolute; top:-22px; left:50%; transform:translateX(-50%); font-size:18px; }
  .cal-ticks { position:absolute; left:0; right:0; bottom:0; height:14px; }
  .cal-ticks span { position:absolute; transform:translateX(-50%); font-size:10px; font-weight:900; opacity:.75; }
  .cal-ticks span:first-child { transform:none; } .cal-ticks span:last-child { transform:translateX(-100%); }
  .cal-legend { display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px; font-size:11px; font-weight:800; margin:4px 4px 0; }
  .cal-note { font-weight:800; font-size:13px; margin-top:10px; text-align:center; line-height:1.3; }
  .cal-chips { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; margin-top:10px; }
  .cal-chips .badge { color:var(--ink); }

  .cal-strip { display:flex; flex-wrap:wrap; gap:6px; align-items:center; font-size:12px; font-weight:800; margin:-4px 0 10px; }
  .cal-strip b { width:100%; font-size:12px; }
  .cal-strip .badge { white-space:normal; }
  .cal-tlcard { padding:16px 12px 16px 10px; }
  .cal-tl { position:relative; height:${TL_H}px; }
  .cal-hr { position:absolute; left:0; right:0; height:0; border-top:2px dashed rgba(14,14,18,.1); }
  .cal-hr span { position:absolute; left:0; top:-8px; font-size:10px; font-weight:900; color:var(--muted); background:var(--paper); padding-right:4px; font-variant-numeric:tabular-nums; }
  .cal-past { position:absolute; left:40px; right:0; top:0; background:repeating-linear-gradient(-45deg, rgba(14,14,18,.045) 0 6px, transparent 6px 12px); border-radius:0 0 10px 10px; pointer-events:none; transition:height .5s linear; }
  .cal-blk { position:absolute; left:44px; width:calc(44% - 34px); border:2px solid var(--ink); border-radius:14px; padding:5px 8px; text-align:left; overflow:hidden; box-shadow:0 2px 0 var(--ink); display:flex; flex-direction:column; gap:2px; z-index:1; transition:transform .15s var(--spring); }
  .cal-blk:active { transform:scale(.97); }
  .cal-blk.dash { border-style:dashed; box-shadow:none; }
  .cal-blk b { font-size:12px; font-weight:900; line-height:1.15; }
  .cal-blk small { font-size:10px; font-weight:800; opacity:.8; line-height:1.2; }
  .cal-pt { position:absolute; left:calc(44% + 18px); right:0; height:28px; transform:translateY(-50%); border:2px solid var(--ink); border-radius:999px; display:flex; align-items:center; gap:5px; padding:0 9px; font-size:12px; font-weight:800; box-shadow:0 2px 0 var(--ink); z-index:2; min-width:0; transition:transform .15s var(--spring); }
  .cal-pt:active { transform:translateY(-50%) scale(.95); }
  .cal-pt .tx { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
  .cal-pt.missed { opacity:.5; text-decoration:line-through; box-shadow:none; }
  .cal-glow { animation:pulse 1.4s ease-in-out infinite; }
  .cal-glow:active { animation:none; }
  .cal-now { position:absolute; left:34px; right:-4px; height:0; border-top:3px solid #e5333d; z-index:4; transition:top .5s linear; pointer-events:none; }
  .cal-now::before { content:""; position:absolute; left:-6px; top:-8px; width:12px; height:12px; border-radius:50%; background:#e5333d; border:2px solid var(--ink); animation:pulse 1.2s ease-in-out infinite; }
  .cal-now b { position:absolute; right:0; top:-11px; background:#e5333d; color:#fff; border:2px solid var(--ink); border-radius:999px; font-size:10px; font-weight:900; padding:1px 7px; font-variant-numeric:tabular-nums; white-space:nowrap; }

  .cal-dl { position:static; font-family:var(--font); font-size:10px; padding:4px 8px; background:var(--pink); transform:rotate(3deg); white-space:nowrap; }
  .cal-todos { padding:14px; }
  .cal-thead { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
  .cal-tcount { display:flex; align-items:baseline; } .cal-tcount .big-num { font-size:34px; } .cal-tcount small { font-weight:900; color:var(--muted); }
  .cal-qhead { font-family:var(--font-display); font-size:16px; margin:14px 0 2px; display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
  .cal-qhead small { font-family:var(--font); font-size:11px; font-weight:800; color:var(--muted); }
  .cal-tlist { display:grid; }
  .cal-todo { display:flex; align-items:center; gap:9px; padding:10px 0; border-bottom:2px dashed rgba(14,14,18,.1); }
  .cal-todo:last-child { border-bottom:0; }
  .cal-chk { width:30px; height:30px; border-radius:10px; border:2.5px solid var(--ink); background:#fff; flex:0 0 auto; display:grid; place-items:center; font-weight:900; font-size:17px; box-shadow:0 2px 0 var(--ink); transition:transform .2s var(--spring), background .2s; }
  .cal-chk:active { transform:scale(.85); }
  .cal-te { font-size:24px; flex:0 0 auto; }
  .cal-tt { flex:1; min-width:0; }
  .cal-tt b { display:inline; font-size:14px; font-weight:800; line-height:1.2; position:relative; background:linear-gradient(var(--ink), var(--ink)) no-repeat 0 55% / 0 2.5px; transition:background-size .45s var(--out); }
  .cal-tt small { display:block; font-size:11px; font-weight:700; color:var(--muted); line-height:1.25; margin-top:1px; }
  .cal-rwi { color:#12a150; font-weight:900; }
  .cal-rw { font-size:11px; font-weight:900; padding:4px 8px; border-radius:999px; border:2px solid var(--ink); background:#fff; white-space:nowrap; flex:0 0 auto; }
  .cal-todo .btn.sm { height:34px; padding:0 11px; font-size:12px; flex:0 0 auto; }
  .cal-todo.done .cal-chk { background:var(--lime); }
  .cal-todo.done .cal-tt b { background-size:100% 2.5px; }
  .cal-todo.done .cal-te, .cal-todo.done .cal-tt { opacity:.6; }
  .cal-todo.done .cal-rw { background:var(--lime); }
  .cal-todo.missed .cal-chk { background:var(--coral); }
  .cal-todo.missed .cal-tt { opacity:.6; }
  .cal-todo.urgent .cal-chk { border-color:#e5333d; animation:pulse 1.2s ease-in-out infinite; }
  .cal-todo.ready .cal-chk { background:var(--yellow); animation:pulse 1.2s ease-in-out infinite; }
  .cal-todo.just .cal-chk { animation:cal-check .7s var(--spring); }
  .cal-todo.just .cal-te { animation:jelly .6s var(--spring); }
  .cal-todo.just .cal-tt b { transition-delay:.15s; }
  @keyframes cal-check { 0% { transform:scale(.4) rotate(-30deg); } 60% { transform:scale(1.35) rotate(8deg); } 100% { transform:none; } }

  .cal-prod { display:flex; align-items:center; gap:14px; }
  .cal-ring { width:118px; height:118px; border-radius:50%; border:var(--line); flex:0 0 auto; display:grid; place-items:center; background:conic-gradient(var(--c) calc(var(--p) * 1%), #f1eee6 0); box-shadow:var(--shadow-sm); }
  .cal-ring > div { width:80px; height:80px; border-radius:50%; background:#fff; border:var(--line); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
  .cal-ring b { font-size:30px; } .cal-ring small { font-size:10px; font-weight:900; line-height:1.1; }
  .cal-pstats { flex:1; min-width:0; display:grid; gap:6px; }
  .cal-pstats div { display:flex; align-items:center; gap:6px; font-size:13px; }
  .cal-pstats b { flex:1; font-weight:800; } .cal-pstats i { font-style:normal; font-weight:900; font-variant-numeric:tabular-nums; }
  .cal-tips { display:grid; gap:8px; margin-top:12px; }
  .cal-tip { display:flex; gap:10px; align-items:center; width:100%; text-align:left; font-size:13px; font-weight:800; line-height:1.25; box-shadow:var(--shadow-sm); }
  .cal-tip .emo { font-size:24px; flex:0 0 auto; }

  .cal-month { padding:14px 12px; }
  .cal-mtitle { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px; }
  .cal-mtitle .display { font-size:24px; }
  .cal-mhead, .cal-grid { display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:4px; }
  .cal-mhead { font-size:11px; font-weight:900; color:var(--muted); text-align:center; margin-bottom:4px; }
  .cal-day { aspect-ratio:1 / 1.12; border:2px solid var(--ink); border-radius:12px; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:3px 0 2px; min-width:0; position:relative; transition:transform .2s var(--spring); }
  .cal-day b { font-size:13px; font-weight:900; }
  .cal-day .mk { font-size:12px; line-height:1; letter-spacing:-3px; white-space:nowrap; min-height:12px; }
  .cal-day.empty { border:0; background:none; }
  .cal-day.we { background:#ffe8f6; }
  .cal-day.pay { background:#f0ffd1; }
  .cal-day.past { opacity:.38; }
  .cal-day.today { background:var(--lime); box-shadow:0 3px 0 var(--ink); transform:scale(1.1); z-index:1; animation:cal-today 2.4s var(--spring) infinite; }
  @keyframes cal-today { 0%, 80%, 100% { transform:scale(1.1); } 88% { transform:scale(1.22) rotate(-5deg); } }
  .cal-day:active { transform:scale(.9); }
  .cal-mlegend { display:flex; flex-wrap:wrap; gap:4px 10px; font-size:11px; font-weight:800; color:var(--muted); margin-top:10px; }

  .cal-sh-head { display:flex; gap:12px; align-items:center; }
  .cal-sh-date { width:64px; height:68px; border:var(--line); border-radius:18px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; align-items:center; justify-content:center; flex:0 0 auto; }
  .cal-sh-date b { font-family:var(--font-display); font-weight:400; font-size:28px; line-height:1; } .cal-sh-date small { font-weight:900; font-size:12px; }
  .cal-sh-when { display:flex; gap:10px; align-items:center; margin-top:14px; font-weight:800; font-size:14px; box-shadow:none; }
  .cal-sh-when .emo { font-size:28px; color:initial; }
  .cal-up .tx small { font-variant-numeric:tabular-nums; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
