/* ============================================================
   Календарь — вкладка «calendar».
   Делает игровое время видимым: живые часы, таймлайн дня,
   дела на сегодня, продуктивность, месяц и ближайшие события.

   Время: 1 игровая минута = 1 секунда, день = 24 минуты.
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
  const realOf = (gameMin) => (gameMin * (G().DAY_MS / 60000)) / 1440;
  function dateLine(I) {
    return `${I.dom} ${MONTHS[I.month]} · ${WD[wd(I.day)]} · ${I.time}`;
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
    if (dom === 30 && s.home && s.home.rent) ev.push({ e: "🔑", t: "Аренда", sub: s.home.title || "жильё", a: -s.home.rent, col: "c-mint" });
    if (dom === 30) ev.push({ e: "💡", t: "ЖКХ", sub: "опять подорожало", a: -3200, col: "c-yellow" });
    if (Vibe.subs) Vibe.subs.list().forEach((x) => { if (dom === 30) ev.push({ e: x.e, t: x.name, sub: "подписка", a: -x.price, col: "c-lilac", quiet: true }); });
    if (s.job) {
      const net = Math.round(s.job.salary * (1 - TAX));
      if (dom === 15) ev.push({ e: "💸", t: "Аванс", sub: s.job.company, a: Math.round(net * 0.4), col: "c-lime" });
      if (dom === 30) ev.push({ e: "💰", t: "Зарплата", sub: s.job.company, a: Math.round(net * 0.6) + (s.job.bonus || 0), col: "c-lime" });
    }
    (s.loans || []).forEach((l) => { if (l.left > 0 && dom === 30) ev.push({ e: "🏦", t: `Кредит «${l.name}»`, sub: `осталось ${l.left} плат.`, a: -l.monthly, col: "c-pink" }); });
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
    blocks.push({ f: 6, to: 7, e: "😴", t: b && b.sleeping ? "Спишь…" : sleptToday ? `Сон ${lastSleep.hours} ч` : "Сон до 07:00", sub: sleptToday ? `качество ${Math.round(lastSleep.q * 100)}%` : "", c: "k-k", go: "fit" });
    // Работа
    if (s.job && isWorkday(day)) blocks.push({ f: 9, to: 19, e: "💼", t: "Работа", sub: esc(s.job.company), c: "k-v", go: "job" });
    else if (s.job) blocks.push({ f: 11, to: 17, e: "🛋️", t: "Выходной", sub: "рабочий чат всё равно открыт", c: "k-p", go: "job" });
    else blocks.push({ f: 10, to: 13, e: "📨", t: "Поиск работы", sub: "Vibe Job", c: "k-p", go: "job", dash: true });
    blocks.push({ f: 23, to: 24, e: "🌙", t: "Отбой", sub: "", c: "k-k", go: "fit" });

    // Еда
    const meals = (b && b.meals) || [];
    [[8, "🍳", "Завтрак"], [13, "🥪", "Обед"], [19, "🍝", "Ужин"]].forEach(([h, e, t]) => {
      const eaten = meals.some((m) => m.day === day && Math.abs((m.min % 1440) - h * 60) <= 90);
      const missed = !eaten && mod > h * 60 + 90;
      pts.push({ h, e: eaten ? "✅" : e, t: `${t} ${pad(h)}:00`, c: eaten ? "k-ok" : missed ? "k-w missed" : "k-y", go: "eat" });
    });
    doctorsOn(day).forEach((d) => pts.push({ h: clamp(d.h, 6, 23.6), e: d.e, t: `${d.t} ${d.time}`, c: "k-v", go: "health" }));
    const plan = Vibe.sched ? Vibe.sched.forDay(day) : [];
    plan.forEach((p) => pts.push({ h: clamp(p.hour + (p.min || 0) / 60, 6, 23.6), e: p.e, t: `${esc(p.title)} ${pad(p.hour)}:${pad(p.min || 0)}`, c: "k-v", go: p.mini ? "mini-" + p.mini : p.go || "maps" }));
    if (!plan.some((p) => p.kind === "concert")) concertsOn(day).forEach((t) => pts.push({ h: 20, e: "🎤", t: `${esc(t.t)} 20:00`, c: "k-v", go: "tickets" }));

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
            <b>${x.e} ${x.t}</b>${x.sub && yOf(x.to) - yOf(x.f) > 40 ? `<small>${x.sub}</small>` : ""}
          </button>`).join("")}
        ${pts.map((p) => `<button class="cal-pt ${p.c}" data-go="${p.go}" style="top:${p.y}px"><span>${p.e}</span><span class="tx">${p.t}</span></button>`).join("")}
        <div class="cal-now" data-now style="top:${nowY}px"><b data-nowlbl>${mod < 360 ? "ночь · " : "сейчас "}${I.time}</b></div>
      </div>`;
  }

  /* ============================================================
     3. Дела на сегодня — тап по делу выполняет его
     ============================================================ */

  function todos() {
    const s = S(), b = body(), I = G().info();
    const mod = G().minutes() % 1440;
    const done = calDone();
    const list = [];
    const day = I.day;

    // Приглашения на собеседование
    const inv = invites();
    if (inv.length) list.push({ id: "invite", e: "📨", t: `Ответить на приглашение${inv.length > 1 ? ` (${inv.length})` : ""}`, sub: "HR ждёт. Целых 4 секунды", rw: "+оффер?", act: { go: "job", params: { tab: "apps" }, label: "Ответить" }, urgent: true });

    // Деньги на аренду
    if (s.home && s.home.rent) {
      let inDays = null;
      for (let d = day + 1; d <= day + 31; d++) if (domOf(d) === 1) { inDays = d - day; break; }
      if (inDays != null && inDays <= 3 && s.balance < s.home.rent) {
        list.push({ id: "rent", e: "🔑", t: "Найти деньги на аренду", sub: `не хватает ${Vibe.rub(s.home.rent - s.balance)} · через ${inDays} ${plural(inDays, "день", "дня", "дней")}`, rw: "крыша над головой", act: { go: s.job ? "job" : "pay", label: s.job ? "Работать" : "В банк" }, urgent: true });
      }
    }

    // Поесть
    if (b) {
      const mealsToday = (b.meals || []).some((m) => m.day === day);
      const eatDone = !!done.eat || (b.food >= 40 && mealsToday);
      if (b.food < 40 || eatDone) {
        list.push({
          id: "eat", e: "🍽️", t: "Поесть", sub: `сытость ${Math.round(b.food)}%`, done: eatDone && b.food >= 40,
          rw: b.fridge > 0 ? "+10 XP" : "+сытость",
          act: b.fridge > 0 ? { inline: "cook", label: "Готовить" } : { go: "eat", label: "Заказать" },
          prog: clamp(b.food / 40, 0, 1),
        });
      }
    }

    // Рабочие задачи
    if (s.job) {
      const n = G().TASKS_PER_DAY - G().tasksLeft();
      list.push({ id: "work", e: "💼", t: "Сделать рабочие задачи", sub: `${n}/${G().TASKS_PER_DAY} · премия сама себя не заработает`, rw: "+премия", act: { go: "job", label: "В работу" }, prog: n / G().TASKS_PER_DAY, done: n >= G().TASKS_PER_DAY });
    }

    // Шаги
    if (b) {
      const steps = b.stepsDay === day ? Math.round(b.steps) : 0;
      const goal = Vibe.body.STEP_GOAL || 8000;
      list.push({ id: "steps", e: "👟", t: `Пройти ${Vibe.fmt(goal)} шагов`, sub: `${Vibe.fmt(steps)} / ${Vibe.fmt(goal)}`, rw: "+здоровье", act: { go: "maps", label: "Гулять" }, prog: clamp(steps / goal, 0, 1), done: steps >= goal });
    }

    // Позвонить маме
    list.push({ id: "mom", e: "📞", t: "Позвонить маме", sub: done.mom ? "мама довольна. Почти" : "она всё равно спросит про шапку", rw: "+15 XP", act: { inline: "mom", label: "Звонить" }, done: !!done.mom });

    // Сон до 23:00 (вечером и ночью)
    const h = Math.floor(mod / 60);
    if (b && (h >= 18 || h < 7)) {
      const at = b.sleeping ? b.sleeping.at % 1440 : null;
      const ok = at != null && at >= 12 * 60 && at < 23 * 60;
      const missed = !ok && (h >= 23 || h < 7);
      list.push({ id: "sleep", e: "😴", t: "Лечь спать до 23:00", sub: ok ? "легенда режима" : missed ? "уже поздно, но поспать всё ещё можно" : `осталось ~${fmtReal(realOf(1380 - mod))}`, rw: "+энергия", act: { go: "fit", label: "Спать" }, done: ok, missed: missed && !b.sleeping });
    }

    // Задания дня — живут здесь
    G().quests().forEach((q) => {
      list.push({ id: "q:" + q.id, quest: true, e: q.e, t: q.t, sub: q.claimed ? "награда получена" : `${Math.min(q.n, q.need)}/${q.need} · +${q.r} 🪙`, rw: `+${q.r} 🪙`, prog: Math.min(q.n, q.need) / q.need, done: q.claimed, claim: q.done && !q.claimed ? q.id : null, act: { go: questGo(q.id), label: "Открыть" } });
    });
    return list;
  }
  const QGO = { eat: "eat", taxi: "maps", work: "job", pay: "market", supermarket: "supermarket", apply: "job", market: "market" };
  const questGo = (id) => QGO[id] || (String(id).startsWith("visit:") ? String(id).slice(6) : "home");
  function todoRow(x) {
    const cls = x.done ? "done" : x.claim ? "ready" : x.urgent ? "urgent" : x.missed ? "missed" : "";
    let tail = "";
    if (x.done) tail = `<span class="cal-rw">${x.quest ? "✓" : x.rw}</span>`;
    else if (x.claim) tail = `<button class="cal-pill y" data-cal="claim" data-q="${x.claim}">${x.rw}</button>`;
    else if (x.act) tail = `<span class="cal-pill ${x.act.inline ? "v" : "o"}">${x.act.label}<i>→</i></span>`;
    return `
      <div class="cal-todo ${cls}" data-cal="todo" data-id="${x.id}" data-todo="${x.id}" role="button" tabindex="0">
        <span class="cal-chk ${!x.done && x.prog > 0 ? "wip" : ""}" aria-hidden="true">${x.done ? "✓" : !x.claim && x.prog > 0 ? "…" : ""}</span>
        <span class="cal-te emo">${x.e}</span>
        <div class="cal-tt">
          <b>${x.t}</b>
          <small>${x.sub}</small>
          ${x.prog != null && !x.done ? `<div class="cal-pbar"><i style="width:${Math.round(x.prog * 100)}%"></i></div>` : ""}
        </div>
        ${tail}
      </div>`;
  }
  function todosHtml(list) {
    const life = list.filter((x) => !x.quest), q = list.filter((x) => x.quest);
    const total = list.length, n = list.filter((x) => x.done).length;
    return `
      <div class="cal-thead"><b>${n}/${total}</b><span>${n === total ? "Всё сделано. Подозрительно продуктивно" : "Тапни по делу — и сразу к нему"}</span></div>
      <div class="cal-tlist">${life.map(todoRow).join("")}</div>
      ${q.length ? `<div class="cal-qhead"><span>Задания дня</span><small>обновятся завтра</small></div>
      <div class="cal-tlist">${q.map(todoRow).join("")}</div>` : ""}`;
  }

  /* ============================================================
     5. Месяц
     ============================================================ */
  // Пилюли дня: короткая подпись и цвет по смыслу (деньги / счета / планы)
  function pillsOf(d) {
    const ev = eventsOn(d).filter((e) => !e.quiet), out = [];
    ev.filter((e) => e.a > 0).forEach((e) => out.push({ t: e.t === "Аванс" ? "аванс" : "зп", k: "in" }));
    if (ev.some((e) => e.a < 0 && e.e !== "🏦")) out.push({ t: "счета", k: "bill" });
    if (ev.some((e) => e.e === "🏦")) out.push({ t: "кредит", k: "bill" });
    if (ev.some((e) => e.concert)) out.push({ t: "шоу", k: "vi" });
    if (doctorsOn(d).length) out.push({ t: "врач", k: "vi" });
    ev.filter((e) => !e.a && !e.concert).forEach(() => out.push({ t: "план", k: "vi" }));
    return out;
  }
  function monthHtml(I) {
    const start = I.day - (I.dom - 1);
    const off = wd(start);
    let cells = "";
    for (let i = 0; i < off; i++) cells += `<div class="cal-day empty"></div>`;
    for (let i = 0; i < 30; i++) {
      const d = start + i;
      const pl = pillsOf(d);
      const cls = d === I.day ? "today" : d < I.day ? "past" : "";
      const shown = pl.slice(0, 2);
      cells += `<button class="cal-day ${cls}" data-cal="day" data-d="${d}" aria-label="${i + 1}${pl.length ? ": " + pl.map((x) => x.t).join(", ") : ""}"><b>${pad(i + 1)}</b>${shown.map((x) => `<i class="cal-ev k-${x.k}">${x.t}</i>`).join("")}${pl.length > 2 ? `<i class="cal-ev more">+${pl.length - 2}</i>` : ""}</button>`;
    }
    const tail = (7 - ((off + 30) % 7)) % 7;
    for (let i = 0; i < tail; i++) cells += `<div class="cal-day empty"></div>`;
    return `
      <div class="cal-month">
        <div class="cal-mhead">${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => `<span>${w}</span>`).join("")}</div>
        <div class="cal-grid">${cells}</div>
      </div>
      <div class="cal-mlegend">
        <span class="cal-ev k-in">${S().job ? "зарплата" : "деньги"}</span>
        <span class="cal-ev k-bill">счета</span>
        <span class="cal-ev k-vi">планы</span>
        <span class="cal-lg-today">сегодня</span>
      </div>`;
  }
  function daySheet(d) {
    const I = G().info();
    const dom = domOf(d), mon = monOf(d);
    const ev = eventsOn(d);
    const diff = d - I.day;
    const docs = d === I.day ? doctorsOn(d) : [];
    const kinds = dayKinds(d);
    const when = diff === 0 ? "Сегодня. Прямо сейчас"
      : diff > 0 ? `Через ${diff} ${plural(diff, "день", "дня", "дней")} (≈ ${fmtReal(G().realMinTo(d))} реального времени)`
      : `${-diff} ${plural(-diff, "день", "дня", "дней")} назад. Прошлого не вернуть, но выписку можно`;
    const rows = [];
    if (S().job && isWorkday(d)) rows.push({ e: "💼", t: "Работа 09:00–19:00", sub: S().job.company, col: "c-violet" });
    ev.forEach((e) => rows.push(e));
    docs.forEach((x) => rows.push({ e: x.e, t: `${x.t} в ${x.time}`, sub: "Vibe Health", col: "c-mint" }));
    rows.push({ e: "🧾", t: "Продукты, метро, кофе", sub: "каждый день, как налог на существование", a: -300, col: "c-white" });
    Vibe.ui.sheet(`
      <div class="cal-sh-head">
        <div class="cal-sh-date ${d === I.day ? "today" : ""}"><b class="${kinds.length ? "k-" + kinds[0] : ""}">${dom}</b><small>${MONTHS[mon].slice(0, 3)}</small></div>
        <div style="min-width:0"><div class="cal-sh-t">${dom}&nbsp;${MONTHS[mon]}</div><div style="font-weight:800;font-size:13px">${WD[wd(d)]} · ${isWorkday(d) ? "будний" : "выходной 🎉"}</div></div>
      </div>
      <div class="cal-sh-when"><span class="emo float">⏳</span><span>${when}</span></div>
      <div class="card flat stagger" style="padding:4px 14px;margin-top:12px">
        ${rows.map((r) => `<div class="li"><div class="ic ${r.col || "c-white"}">${r.e}</div><div class="tx"><b>${esc(r.t)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</div>${r.a ? `<div class="amt ${r.a > 0 ? "plus" : ""}">${r.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(r.a))}</div>` : ""}</div>`).join("")}
      </div>
      ${ev.length ? "" : `<div class="muted" style="text-align:center;font-weight:800;margin:12px 0 0">📭 Ничего особенного. Подозрительно спокойно</div>`}
      ${d === I.day ? `<div class="cal-tlcard" style="margin-top:14px">${timelineHtml(I)}</div>` : ""}
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
    const ms = G().realMinTo(u.day) * 60000 + (u.concert ? (20 / 24) * G().DAY_MS : 0);
    return `${u.in === 0 ? "сегодня" : `через ${u.in} ${plural(u.in, "день", "дня", "дней")}`} · ⏳ ${fmtCountdown(ms)}`;
  }
  function upHtml() {
    const list = upcomingList();
    if (!list.length) return `<div class="cal-upempty"><div class="emo float" style="font-size:44px">🕳️</div><b>Пусто. Ни&nbsp;зарплаты, ни&nbsp;счетов</b></div>`;
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
        <div class="cal-ttl"><h1 class="cal-mt">${MONTHS_NOM[I.month]}</h1><i class="cal-live" aria-hidden="true"></i></div>
        ${Vibe.ui.vibikiPill()}
      </div>
      <div class="cal-date" data-date>${dateLine(I)}</div>

      <div class="stagger">
        <div data-month>${monthHtml(I)}</div>

        <h2 class="cal-h">Сегодня</h2>
        <div class="cal-todos" data-todos>${todosHtml(list)}</div>

        <h2 class="cal-h">Ближайшее</h2>
        <div data-up>${upHtml()}</div>

        <div class="fine">1&nbsp;игровой день длится 24&nbsp;реальные минуты, поэтому зарплата приходит быстрее, чем в&nbsp;жизни. Тап по&nbsp;дню — что в&nbsp;нём будет.</div>
      </div>`;
    },

    mount(root) {
      const $ = (sel) => root.querySelector(sel);
      let I0 = G().info();
      let lastDay = I0.day;
      let lastMin = Math.floor(G().minutes());
      let lastTodos = "";
      // Что из дел уже «видел» игрок: всё, что выполнилось вне календаря, отметится с анимацией при возврате
      const seen0 = S().cal_seen;
      let doneSet = seen0 && seen0.day === I0.day && Array.isArray(seen0.ids)
        ? new Set(seen0.ids)
        : new Set(todos().filter((x) => x.done).map((x) => x.id));
      let upList = upcomingList();
      let lastSec = -1;
      const disposers = [];
      const later = (fn, ms) => { const t = setTimeout(fn, ms); disposers.push(() => clearTimeout(t)); };

      // ---- Дата и время в шапке ----
      function updateHero(I) {
        const d = $("[data-date]"); if (d) { const t = dateLine(I); if (!Vibe.sameText(d, t)) d.textContent = t; }
      }
      function updateSmooth() {
        const mod = G().minutes() % 1440;
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
          let fresh = 0;
          nowDone.forEach((id) => {
            if (doneSet.has(id)) return;
            const row = box.querySelector(`[data-todo="${CSS.escape(id)}"]`);
            if (!row) return;
            fresh++;
            row.classList.add("just");
            const chk = row.querySelector(".cal-chk");
            later(() => FX.burst(chk || row, { emojis: ["✅", "✨", "🎉", "💜"], count: 12, spread: 110 }), 60 + fresh * 140);
          });
          if (fresh && user) FX.sound.success();
          doneSet = nowDone;
          const ids = [...nowDone].sort();
          const day = G().info().day;
          const prev = S().cal_seen;
          if (!prev || prev.day !== day || (prev.ids || []).join("|") !== ids.join("|")) Vibe.state.set({ cal_seen: { day, ids } });
        }
      }
      // первый проход: то, что игрок сделал в других приложениях, ставит галочку само
      later(() => refreshTodos(true), 380);

      // ---- Разделы, зависящие от дня ----
      function refreshDayParts() {
        const I = G().info();
        syncDocs();
        updateHero(I);
        refreshTimeline();
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

      // ---- Главный цикл: 500 мс, тяжёлое — раз в игровую минуту (1 с) ----
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
          FX.toast(`Новый день: ${I.dom}&nbsp;${MONTHS[I.month]}, ${WD[wd(I.day)]}`, "🌅", 2600);
          return;
        }
        const m = Math.floor(G().minutes());
        if (m !== lastMin) {
          lastMin = m;
          updateHero(I);
          refreshTodos(false);
          // таймлайн (статусы еды) — раз в 10 игровых минут
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
      const onVis = () => { if (!document.hidden) { refreshTodos(true); refreshTimeline(); updateCountdowns(); } };
      document.addEventListener("visibilitychange", onVis);
      disposers.push(() => document.removeEventListener("visibilitychange", onVis));

      // ---- Действия дел ----
      function claim(q, from) {
        G().claimQuest(q, from);
        FX.sound.pop();
        later(() => refreshTodos(true), 250);
      }
      function callMom(from) {
        // Ручной звонок — сцена из Vibe Заботы (care.js)
        if (Vibe.care) { Vibe.care.call(from, () => { markDone("mom"); refreshTodos(true); }); return; }
        if (Vibe.body) Vibe.body.effect("mom");
        markDone("mom");
        Vibe.reward({ xp: 15, from });
        const lines = S().job
          ? ["Мама спросила, когда ты уже женишься", "Мама спросила, платят ли тебе нормально. Ты соврал", "Мама передала привет и&nbsp;рецепт борща"]
          : ["Мама спросила, нашёл ли ты работу. Неловко", "Мама сказала, что у&nbsp;тёти Люды сын уже директор", "Мама перевела бы денег, но&nbsp;пенсия не&nbsp;резиновая"];
        FX.toast(`${FX.pick(lines)} · +15 XP`, "👩", 3200);
        FX.burst(from, { emojis: ["📞", "💖", "✨"], count: 12 });
        refreshTodos(true);
      }
      function cook(from) {
        if (Vibe.intercept) { Vibe.intercept.cook(from); later(() => refreshTodos(true), 900); return; }
        const b = body();
        if (!b || b.fridge <= 0) { Vibe.go("supermarket"); return; }
        Vibe.body.effect("cook");
        if (!calDone().eat) { markDone("eat"); Vibe.reward({ xp: 10, from }); FX.toast("Домашняя еда! Мама гордится · +10 XP", "🍳", 2400); }
        FX.burst(from, { emojis: ["🍳", "🥗", "✨"], count: 12 });
        refreshTodos(true);
        refreshTimeline();
      }
      function doTodo(id, row) {
        const x = todos().find((t) => t.id === id);
        if (!x) { refreshTodos(false); return; }
        if (x.done) { FX.bump(row); FX.burst(row.querySelector(".cal-chk") || row, { emojis: ["✅", "✨"], count: 6, spread: 60 }); return; }
        if (x.claim) { claim(x.claim, row); return; }
        const act = x.act || {};
        if (act.inline === "mom") { callMom(row); return; }
        if (act.inline === "cook") { cook(row); return; }
        if (act.go) { FX.bump(row); Vibe.go(act.go, act.params || {}); }
      }

      // ---- Клики ----
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-cal]");
        if (!a) return;
        e.stopPropagation();
        const act = a.dataset.cal;
        if (act === "day") { FX.bump(a); daySheet(+a.dataset.d); return; }
        if (act === "claim") { claim(a.dataset.q, a); return; }
        if (act === "todo") { doTodo(a.dataset.id, a); return; }
      });
      root.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const row = e.target.closest && e.target.closest('[data-cal="todo"]');
        if (!row || e.target !== row) return;
        e.preventDefault();
        doTodo(row.dataset.id, row);
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
  .cal-top { display:flex; justify-content:space-between; align-items:center; gap:10px; position:relative; }
  :root { --cal-in:#ff8ccf; --cal-bill:#ffa66b; --cal-vi:#c3a6ff; --cal-now:#ff6f61; --cal-ok:#6fdc6a; }

  /* Шапка: месяц плакатом и живая точка «сейчас» */
  .cal-ttl { display:flex; align-items:flex-start; gap:6px; min-width:0; }
  .cal-mt { margin:0; font-family:var(--calf); font-weight:700; font-size:clamp(44px, 14vw, 58px); line-height:.86; letter-spacing:-.02em; text-transform:uppercase; color:var(--calk); white-space:nowrap; }
  .cal-live { width:14px; height:14px; flex:0 0 14px; margin-top:4px; border-radius:50%; background:#ff2a2a; animation:cal-live 1.6s ease-in-out infinite; }
  @keyframes cal-live { 0%, 100% { transform:scale(1); } 50% { transform:scale(.7); opacity:.75; } }
  .cal-date { margin:8px 0 14px; font-weight:800; font-size:13px; color:var(--calk); font-variant-numeric:tabular-nums; }

  /* Месяц: сетка толстыми линиями */
  .cal-month { border-radius:20px; overflow:hidden; box-shadow:0 0 0 2.5px var(--calk), 0 5px 0 var(--calk); background:var(--calk); }
  .cal-mhead, .cal-grid { display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:2.5px; }
  .cal-mhead { background:var(--calk); margin-bottom:2.5px; }
  .cal-mhead span { background:#fff; text-align:center; padding:7px 0 6px; font-size:10px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--calk); }
  .cal-day { min-height:62px; min-width:0; background:#fff; color:var(--calk); display:flex; flex-direction:column; align-items:stretch; gap:3px; padding:5px 4px 6px; text-align:left; position:relative; transition:background .2s; }
  .cal-day b { font-size:11px; font-weight:900; font-variant-numeric:tabular-nums; padding-left:2px; }
  .cal-day.empty { background:#f4f1ec; }
  .cal-day.past b { color:#a9a4b4; }
  .cal-day.past .cal-ev { opacity:.45; }
  .cal-day.today { background:var(--cal-now); }
  .cal-day.today b { color:var(--calk); }
  .cal-day:active { background:#f1ebff; }
  .cal-day.today:active { background:#ff8a7f; }
  .cal-ev { display:block; font-style:normal; height:15px; line-height:12px; padding:0 4px; border-radius:999px; border:1.5px solid var(--calk); font-size:8.5px; font-weight:900; text-transform:uppercase; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:clip; color:var(--calk); background:#fff; }
  .cal-ev.k-in { background:var(--cal-in); } .cal-ev.k-bill { background:var(--cal-bill); } .cal-ev.k-vi { background:var(--cal-vi); }
  .cal-ev.more { background:none; border-style:dashed; }
  .cal-mlegend { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 0; }
  .cal-mlegend .cal-ev { height:24px; line-height:21px; padding:0 10px; font-size:10.5px; border-width:2px; }
  .cal-lg-today { height:24px; line-height:20px; padding:0 10px; border-radius:6px; border:2px solid var(--calk); background:var(--cal-now); font-size:10.5px; font-weight:900; text-transform:uppercase; }
  .cal-sh-date .k-in { background:var(--cal-in); color:var(--calk); } .cal-sh-date .k-bill { background:var(--cal-bill); color:var(--calk); } .cal-sh-date .k-vi { background:var(--cal-vi); color:var(--calk); }
  .cal-up-d .k-in { background:var(--cal-in); color:var(--calk); } .cal-up-d .k-bill { background:var(--cal-bill); color:var(--calk); } .cal-up-d .k-vi { background:var(--cal-vi); color:var(--calk); }

  /* Общие пилюли и теги */
  .cal-tag { display:inline-flex; align-items:center; gap:4px; height:26px; padding:0 11px; border-radius:999px; font-size:12px; font-weight:800; white-space:nowrap; background:#fff; color:var(--calk); }
  .cal-tag.k { background:var(--calk); color:#fff; } .cal-tag.y { background:var(--caly); color:var(--calk); }
  .cal-tag.p { background:var(--cal-in); color:var(--calk); } .cal-tag.v { background:var(--cal-vi); color:var(--calk); }
  .cal-tag.w { background:#fff; color:var(--calk); }
  .cal-pill { display:inline-flex; align-items:center; justify-content:center; gap:4px; height:36px; padding:0 14px; border-radius:999px; font-family:var(--calf); font-weight:600; font-size:14px; text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; flex:0 0 auto; border:2px solid transparent; transition:transform .18s var(--spring); }
  .cal-pill i { font-style:normal; }
  .cal-pill:active { transform:scale(.92); }
  .cal-pill.v { background:var(--calk); color:#fff; border-color:var(--calk); }
  .cal-pill.o { background:#fff; color:var(--calk); border-color:var(--calk); }
  .cal-pill.y { background:var(--caly); color:var(--calk); border-color:var(--caly); animation:pulse 1.2s ease-in-out infinite; }
  .cal-pill.lg { height:50px; font-size:17px; padding:0 18px; }
  .cal-pill.block { width:100%; }

  /* Заголовки секций */
  .cal-h { margin:28px 0 10px; font-family:var(--calf); font-weight:700; font-size:30px; line-height:.95; text-transform:uppercase; letter-spacing:-.01em; color:var(--calk); }


  /* Таймлайн */
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
  .cal-now { position:absolute; left:34px; right:-4px; height:0; border-top:3px solid var(--calp); z-index:4; transition:top .5s linear; pointer-events:none; }
  .cal-now::before { content:""; position:absolute; left:-7px; top:-9px; width:14px; height:14px; border-radius:50%; background:var(--calp); box-shadow:0 0 0 3px #fff, 0 0 0 5px var(--calp); animation:pulse 1.2s ease-in-out infinite; }
  .cal-now b { position:absolute; right:0; top:-12px; background:var(--calp); color:#fff; border-radius:999px; font-family:var(--calf); font-size:12px; font-weight:600; padding:2px 9px; font-variant-numeric:tabular-nums; white-space:nowrap; text-transform:uppercase; }

  /* Дела */
  .cal-todos { background:#fff; border-radius:24px; padding:12px; box-shadow:0 0 0 2.5px var(--calk), 0 5px 0 var(--calk); }
  .cal-thead { display:flex; align-items:baseline; gap:10px; margin:0 2px 10px; }
  .cal-thead b { font-family:var(--calf); font-weight:700; font-size:28px; line-height:1; color:var(--calk); font-variant-numeric:tabular-nums; }
  .cal-thead span { font-weight:800; font-size:12px; color:var(--muted); }


  .cal-pbar { height:6px; border-radius:999px; background:#efeae3; overflow:hidden; margin-top:5px; }
  .cal-pbar i { display:block; height:100%; border-radius:999px; background:var(--calk); transition:width .9s var(--spring); }


  .cal-qhead { margin:16px 0 6px; display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
  .cal-qhead span { font-family:var(--calf); font-weight:700; font-size:20px; text-transform:uppercase; color:var(--calk); line-height:1; white-space:nowrap; }
  .cal-qhead small { font-size:11px; font-weight:800; color:var(--muted); text-align:right; }
  .cal-tlist { display:grid; gap:6px; }
  .cal-todo { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:18px; background:#fff; box-shadow:inset 0 0 0 2px var(--calk); cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .18s var(--spring), background .2s; }
  .cal-todo:active { transform:scale(.97); background:#f6f1ea; }
  .cal-todo:focus-visible { outline:3px solid var(--calp); outline-offset:2px; }
  .cal-chk { width:28px; height:28px; border-radius:50%; border:2.5px solid var(--calk); background:#fff; flex:0 0 auto; display:grid; place-items:center; font-weight:900; font-size:15px; color:#fff; transition:transform .2s var(--spring), background .2s; }
  .cal-te { font-size:22px; flex:0 0 auto; }
  .cal-tt { flex:1; min-width:0; }
  .cal-tt b { display:inline; font-size:14px; font-weight:800; line-height:1.2; background:linear-gradient(var(--calp), var(--calp)) no-repeat 0 55% / 0 3px; transition:background-size .45s var(--out); }
  .cal-tt small { display:block; font-size:11px; font-weight:700; color:var(--muted); line-height:1.25; margin-top:1px; }
  .cal-rw { font-size:11px; font-weight:900; padding:4px 9px; border-radius:999px; background:#fff; color:var(--calk); white-space:nowrap; flex:0 0 auto; }
  .cal-todo .cal-pill { height:32px; padding:0 10px; font-size:12px; }
  .cal-todo.done { background:#f4f1ec; box-shadow:none; }
  .cal-todo.done .cal-chk { background:var(--cal-ok); border-color:var(--calk); color:var(--calk); }
  .cal-chk.wip { background:var(--caly); border-color:var(--calk); color:var(--calk); font-size:13px; line-height:0; }
  .cal-todo.done .cal-tt b { background-size:100% 3px; }
  .cal-todo.done .cal-te, .cal-todo.done .cal-tt { opacity:.6; }
  .cal-todo.done .cal-rw { background:var(--cal-ok); color:var(--calk); }
  .cal-todo.missed .cal-tt { opacity:.7; }
  .cal-todo.urgent { background:#fff; box-shadow:inset 0 0 0 2.5px var(--cal-now); }
  .cal-todo.urgent .cal-chk { animation:pulse 1.2s ease-in-out infinite; }
  .cal-todo.ready { background:var(--caly); }
  .cal-todo.ready .cal-chk { background:var(--caly); border-color:var(--calk); animation:pulse 1.2s ease-in-out infinite; }
  .cal-todo.just .cal-chk { animation:cal-check .7s var(--spring); }
  .cal-todo.just .cal-te { animation:jelly .6s var(--spring); }
  .cal-todo.just .cal-tt b { transition-delay:.15s; }
  @keyframes cal-check { 0% { transform:scale(.4) rotate(-30deg); } 60% { transform:scale(1.35) rotate(8deg); } 100% { transform:none; } }

  /* Ближайшее */
  .cal-uplist { display:grid; gap:8px; }
  .cal-up { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:9px 12px 9px 9px; background:#fff; border-radius:22px; box-shadow:0 0 0 2px var(--calk); transition:transform .18s var(--spring); }
  .cal-up:active { transform:scale(.97); }
  .cal-up:first-child { box-shadow:0 0 0 2.5px var(--calk), 0 5px 0 var(--calk); }
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
