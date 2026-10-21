/* ============================================================
   World — связи между сервисами:
   • Vibe.inv      — вещи игрока (квартира, гардероб, гаджеты), их бонусы
   • Vibe.sched    — расписание: события в календаре с местом на карте
   • Vibe.subs     — подписки с ежемесячным списанием
   • Vibe.people   — близкие: мама, папа, друзья, партнёр (отношения 0–100)
   • Vibe.events   — случайные жизненные события с выбором
   • Vibe.work     — рабочие часы, офис или удалёнка
   • Vibe.insight  — реплики Вайбота из реальных данных
   • Vibe.weather  — погода по игровому дню: now(), day(d), at(min), surge(), scooter()
   • Vibe.trip     — поездки в игровом времени: start(), current(), progress(), eta(), boost(), check()
   • Вайбики как валюта: Vibe.vibikiPay(amount) — сколько можно списать
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const G = () => Vibe.game;
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const nowMin = () => G().minutes();
  const today = () => G().info().day;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ================= Инвентарь ================= */
  // item: { id, name, e, cat: "home"|"wear"|"gadget"|"car"|"pet", bonus: { sleep, mood, energy, health, look, steps } }
  const inv = (Vibe.inv = {
    list: (cat) => (S().inv || []).filter((i) => !cat || i.cat === cat),
    has: (id) => (S().inv || []).some((i) => i.id === id),
    add(item) {
      if (inv.has(item.id) && !item.stack) return false;
      set({ inv: [...(S().inv || []), Object.assign({ at: today() }, item)] });
      return true;
    },
    remove(id) { set({ inv: (S().inv || []).filter((i) => i.id !== id) }); },
    bonus(key) { return (S().inv || []).reduce((s, i) => s + ((i.bonus && i.bonus[key]) || 0), 0); },
    look() { return clamp(30 + inv.bonus("look")); },
  });

  /* ================= Расписание ================= */
  // ev: { id, day, hour, min, dur (игровые минуты), title, e, place (ключ карты), kind, go, params, price, status,
  //       checkedIn, checkedAt, late (мин опоздания), attendedAt }
  // Пришёл раньше (до 120 мин до начала) → «зал ожидания»: checkedIn, в начале — автопосещение.
  // Пришёл после начала, но до конца → посещение с опозданием (e.late, emit "late").
  const WINDOW = 120;  // за сколько игровых минут до начала можно отметиться
  const GRACE = 5;     // опоздание до 5 минут — не опоздание
  const hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const dur = (n) => { n = Math.max(0, Math.round(n)); return n >= 60 ? `${Math.floor(n / 60)} ч${n % 60 ? ` ${n % 60} мин` : ""}` : `${n} мин`; };
  Vibe.fmtDur = Vibe.fmtDur || dur;
  const LATE_LINES = {
    interview: (e) => `HR посмотрел на часы. Потом на тебя. Шанс на оффер −${Math.round(sched.latePenalty(e) * 100)}%`,
    date: () => "Тебя ждали. Сказали «ничего страшного». Это было страшно",
    friend: () => "Все уже заказали. Без тебя. И за тебя тоже не заплатили",
    family: () => "Мама: «Мы уже остыли. В смысле, суп остыл»",
    concert: () => "Пропустил первую песню. Она была лучшей, говорят",
    doctor: () => "Врач принял следующего. Ты теперь следующий за следующим",
  };
  const patchEv = (id, p) => set({ sched: sched.list().map((x) => (x.id === id ? Object.assign({}, x, p) : x)) });
  const handlers = {};
  const sched = (Vibe.sched = {
    WINDOW, GRACE,
    list: () => (S().sched || []),
    get: (id) => sched.list().find((x) => x.id === id) || null,
    on(kind, fn) { (handlers[kind] = handlers[kind] || []).push(fn); },
    add(ev) {
      const e = Object.assign({ id: "ev" + Date.now() + Math.floor(Math.random() * 99), hour: 20, min: 0, dur: 120, e: "📌", status: "planned" }, ev);
      set({ sched: [...sched.list().filter((x) => x.id !== e.id), e].slice(-60) });
      return e;
    },
    remove(id) { set({ sched: sched.list().filter((x) => x.id !== id) }); },
    startMin: (e) => e.day * 1440 + e.hour * 60 + (e.min || 0),
    forDay: (day) => sched.list().filter((e) => e.day === day).sort((a, b) => sched.startMin(a) - sched.startMin(b)),
    upcoming: (n = 5) => sched.list().filter((e) => e.status === "planned" && sched.startMin(e) + e.dur >= nowMin()).sort((a, b) => sched.startMin(a) - sched.startMin(b)).slice(0, n),
    // Окно: за WINDOW игровых минут до начала и до конца события
    active(placeKey, at = nowMin()) {
      return sched.list().filter((e) => e.status === "planned" && (!placeKey || e.place === placeKey) && at >= sched.startMin(e) - WINDOW && at <= sched.startMin(e) + e.dur);
    },
    // Фаза события относительно момента m: far (рано даже для зала ожидания), wait (можно отметиться), live, over
    phase(e, m = nowMin()) {
      const s0 = sched.startMin(e);
      if (m < s0 - WINDOW) return { phase: "far", toStart: s0 - m, toWindow: s0 - WINDOW - m };
      if (m < s0) return { phase: "wait", toStart: s0 - m };
      if (m <= s0 + e.dur) return { phase: "live", since: m - s0 };
      return { phase: "over" };
    },
    // Штраф к шансу собеседования за опоздание (0..0.3): −1% за минуту
    latePenalty: (e) => (e && e.late ? Math.min(0.3, e.late * 0.01) : 0),
    // Игрок пришёл в место (at — игровая минута прибытия). Возвращает события с пометкой arrival: early|ontime|late
    arrive(placeKey, at = nowMin()) {
      const out = [];
      sched.active(placeKey, at).sort((a, b) => sched.startMin(a) - sched.startMin(b)).forEach((e) => {
        const s0 = sched.startMin(e);
        if (at < s0) {
          const r = sched.checkIn(e.id, { at, auto: true });
          if (r.ok && r.e) out.push(Object.assign({}, r.e, { arrival: "early", wait: Math.round(s0 - at) }));
        } else {
          const late = Math.round(at - s0);
          const r = sched.attend(e.id, { late });
          if (r) out.push(Object.assign({}, r, { arrival: r.late ? "late" : "ontime" }));
        }
      });
      return out;
    },
    // «Отметиться»: игрок уже на месте. opts.at — минута прибытия (для движка поездок)
    checkIn(id, { at, auto = false } = {}) {
      const e = sched.get(id);
      if (!e || e.status !== "planned") return { ok: false, why: "Событие уже неактуально" };
      const m = at == null ? nowMin() : at;
      if (!auto && e.place && S().fz_lastPos !== e.place) return { ok: false, why: "Сначала доберись до места — отметка по геолокации" };
      const s0 = sched.startMin(e);
      if (m < s0 - WINDOW) return { ok: false, why: `Отметиться можно за 2 часа — с ${hm(s0 - WINDOW)}`, wait: Math.round(s0 - WINDOW - m) };
      if (m >= s0) { const r = sched.attend(id, { late: Math.round(m - s0) }); return { ok: !!r, e: r, attended: true }; }
      if (e.checkedIn) return { ok: true, e, already: true };
      patchEv(id, { checkedIn: true, checkedAt: m });
      const ne = sched.get(id);
      FX.toast(`Ты пришёл раньше на ${dur(s0 - m)}. Отметился ✅ — начнётся в ${hm(s0)}`, "🛋️", 3400);
      Vibe.emit && Vibe.emit("checkin", ne);
      return { ok: true, e: ne };
    },
    attend(id, { late = 0 } = {}) {
      const e0 = sched.get(id);
      if (!e0 || e0.status !== "planned") return null;
      late = late > GRACE ? Math.round(late) : 0;
      patchEv(id, { status: "done", attendedAt: nowMin(), late, checkedIn: e0.checkedIn || false });
      const e = sched.get(id);
      const BODY = { concert: "concert", date: "date", doctor: "doctor", friend: "social", family: "social", sport: "workout", hobby: "meditate", travel: "travel" };
      if (Vibe.body && BODY[e.kind]) Vibe.body.effect(BODY[e.kind], { score: late ? 0.5 : 0.8 });
      (handlers[e.kind] || []).forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
      Vibe.emit && Vibe.emit("attend", e);
      if (late) {
        Vibe.emit && Vibe.emit("late", e);
        const line = (LATE_LINES[e.kind] || (() => "Календарь всё запомнил. И Вайбот тоже"))(e);
        FX.toast(`${e.e} Опоздал на ${dur(late)}: ${e.title}. ${line}`, "😬", 4200);
        Vibe.reward({ vibiki: 8, xp: 12 });
      } else {
        FX.confetti({ count: 70 });
        FX.toast(`${e.e} ${e.title} — ты на месте вовремя!`, "✅", 2600);
        Vibe.reward({ vibiki: 20, xp: 25 });
      }
      return e;
    },
    tick() {
      const m = nowMin();
      const here = S().fz_lastPos;
      // Зал ожидания: началось → кто на месте, тот посетил; ушёл — отметка снята
      sched.list().filter((e) => e.status === "planned" && e.place && sched.startMin(e) <= m && sched.startMin(e) + e.dur >= m).forEach((e) => {
        if (here === e.place) sched.attend(e.id, { late: 0 });
        else if (e.checkedIn) { patchEv(e.id, { checkedIn: false }); FX.toast(`Ты ушёл из зала ожидания: ${e.title}. Отметка снята`, "🚪", 3000); }
      });
      const missed = sched.list().filter((e) => e.status === "planned" && sched.startMin(e) + e.dur < m);
      if (!missed.length) return;
      set({ sched: sched.list().map((x) => (missed.some((y) => y.id === x.id) ? Object.assign({}, x, { status: "missed" }) : x)) });
      missed.forEach((e, i) => setTimeout(() => {
        FX.toast(`Пропущено: ${e.title}${e.price ? ` (${Vibe.rub(e.price)} сгорели)` : ""}`, "😬", 3200);
        if (Vibe.body) Vibe.body.effect("bill", { quiet: true });
        (handlers[e.kind + ":missed"] || []).forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
      }, i * 900));
    },
  });

  /* ================= Подписки ================= */
  const subs = (Vibe.subs = {
    list: () => S().subs || [],
    has: (id) => subs.list().some((x) => x.id === id),
    add({ id, name, e = "💳", price, note = "" }) {
      if (subs.has(id)) return;
      set({ subs: [...subs.list(), { id, name, e, price, note, dom: (G().info().dom % 28) + 1, since: today() }] });
    },
    remove(id) { set({ subs: subs.list().filter((x) => x.id !== id) }); },
    total: () => subs.list().reduce((s, x) => s + x.price, 0),
  });

  /* ================= Люди ================= */
  const PEOPLE0 = {
    mom: { n: "Мама", e: "👩", rel: 70, kind: "family" },
    dad: { n: "Папа", e: "👨", rel: 50, kind: "family" },
    lyoha: { n: "Лёха", e: "🧔", rel: 60, kind: "friend" },
    katya: { n: "Катя", e: "👩‍🎤", rel: 45, kind: "friend" },
  };
  const people = (Vibe.people = {
    all() { return Object.assign({}, PEOPLE0, S().people || {}); },
    get: (id) => people.all()[id],
    set(id, patch) { const all = people.all(); set({ people: Object.assign({}, S().people || {}, { [id]: Object.assign({}, all[id] || {}, patch) }) }); },
    rel(id, d) { const p = people.get(id); if (!p) return; people.set(id, { rel: clamp((p.rel || 50) + d) }); },
    add(id, p) { if (!people.get(id)) people.set(id, Object.assign({ rel: 40 }, p)); },
    partner() { const all = people.all(); return Object.entries(all).map(([id, p]) => Object.assign({ id }, p)).find((p) => p.kind === "partner"); },
  });

  /* ================= Случайные события ================= */
  const EVENTS = [
    { id: "phone", e: "📱", t: "Телефон упал экраном вниз", d: "Экран — паутина. Палец режется о сторис.", ch: [
      { t: "Починить за 2 900 ₫", a: -2900, mood: 2 }, { t: "Жить с трещиной", mood: -6 }, { t: "Новый в рассрочку", loan: 35000, mood: 8 } ] },
    { id: "flood", e: "🌊", t: "Соседи сверху затопили", d: "Потолок плачет. Соседи не открывают.", ch: [
      { t: "Ремонт за свой счёт: 3 000 ₫", a: -3000 }, { t: "Подать в суд (Госвайб)", mood: -8, go: "gov" }, { t: "Поставить тазик", mood: -10 } ] },
    { id: "fine", e: "🚔", t: "Пришёл штраф", d: "За парковку. Машины у тебя нет. Но штраф есть.", ch: [
      { t: "Оплатить со скидкой 50%: 1 250 ₫", a: -1250 }, { t: "Оспорить в Госвайбе", go: "gov", mood: -2 } ] },
    { id: "bonus", e: "🎁", t: "Кэшбек пришёл неожиданно", d: "Корпорация в хорошем настроении. Редкость.", ch: [
      { t: "Забрать 4 000 ₫", a: 4000, mood: 6 } ] },
    { id: "scam", e: "☎️", t: "Звонит «служба безопасности банка»", d: "«Ваши деньги в опасности. Продиктуйте код из СМС».", ch: [
      { t: "Продиктовать код", a: -5000, mood: -15, lesson: "Никогда не диктуй коды. Даже в игре." }, { t: "Положить трубку", mood: 3, vib: 50 } ] },
    { id: "rentup", e: "🧛", t: "Арендодатель поднимает цену", d: "«Рынок вырос. Я тоже вырос. Плюс 5%».", rent: true, ch: [
      { t: "Согласиться (+5% к аренде)", rentUp: 0.05 }, { t: "Поторговаться (+3%, нервы)", rentUp: 0.03, mood: -5 } ] },
    { id: "cold", e: "🤧", t: "Ты простыл", d: "Кондиционер в офисе победил.", ch: [
      { t: "К врачу (Vibe Health)", go: "health" }, { t: "Чай с мёдом и сериал", health: -6, mood: 4 } ] },
    { id: "sale", e: "📦", t: "Продал старый пуховик", d: "Покупатель торговался 40 минут и ушёл довольным. Ты тоже.", ch: [
      { t: "Забрать 2 500 ₫", a: 2500, mood: 5 } ] },
    { id: "found", e: "💵", t: "Нашёл 1 000 ₫ в старой куртке", d: "Лучший кэшбек в твоей жизни.", ch: [
      { t: "Ура!", a: 1000, mood: 8 } ] },
    { id: "friend_loan", e: "🧔", t: "Лёха просит в долг до зарплаты", d: "«Бро, 5 000 до пятницы. Какой пятницы — не уточню».", ch: [
      { t: "Дать 5 000 ₫", a: -5000, rel: ["lyoha", 15], debt: ["lyoha", 5000] }, { t: "Отказать", rel: ["lyoha", -12] } ] },
    { id: "mom_visit", e: "👩", t: "Мама приехала с банками", d: "Огурцы, варенье и вопросы о личной жизни.", ch: [
      { t: "Обнять и поесть", fridge: 6, mood: 8, rel: ["mom", 10] }, { t: "Я занят", rel: ["mom", -10], mood: -4 } ] },
    { id: "promo_job", e: "📈", t: "Начальник заметил тебя", d: "«Есть проект. Срочный. Вечером и в выходные».", job: true, ch: [
      { t: "Взяться (+30% к повышению)", perf: 30, mood: -6, energy: -15 }, { t: "Вежливо отказаться", perf: -5 } ] },
    { id: "lottery", e: "🎰", t: "Vibe Лото: билет за 200 ₫", d: "Шанс выиграть 100 000 ₫ — 0,1%. Шанс на радость — 100%.", ch: [
      { t: "Купить билет", lottery: true }, { t: "Не верю в удачу" } ] },
  ];
  function applyChoice(ev, c, from) {
    const s = S();
    if (c.a) { G().tx(`${ev.t}`, c.a, ev.e, c.a > 0 ? "c-lime" : "c-coral"); }
    if (c.loan) G().addLoan({ name: "Телефон", amount: c.loan, rate: 0.249, months: 12 }), G().tx("Новый телефон", -c.loan, "📱", "c-sky"), inv.add({ id: "phone_new", name: "Новый телефон", e: "📱", cat: "gadget", bonus: { mood: 3 } });
    if (c.vib) Vibe.reward({ vibiki: c.vib, xp: 20, from });
    if (c.rel) people.rel(c.rel[0], c.rel[1]);
    if (c.debt) people.set(c.debt[0], { owes: ((people.get(c.debt[0]) || {}).owes || 0) + c.debt[1] });
    if (c.rentUp && s.home && s.home.rent) set({ home: Object.assign({}, s.home, { rent: Math.round((s.home.rent * (1 + c.rentUp)) / 500) * 500 }) });
    if (c.perf && s.job) set({ job: Object.assign({}, s.job, { perf: clamp((s.job.perf || 0) + c.perf) }) });
    if (Vibe.body && (c.mood || c.health || c.energy || c.fridge)) {
      const b = Vibe.body.get();
      Vibe.state.set({ body: Object.assign({}, b, { mood: clamp(b.mood + (c.mood || 0)), health: clamp(b.health + (c.health || 0)), energy: clamp(b.energy + (c.energy || 0)), fridge: Math.min(20, (b.fridge || 0) + (c.fridge || 0)) }) });
    }
    if (c.lottery) {
      G().tx("Vibe Лото · билет", -200, "🎰", "c-yellow");
      if (Math.random() < 0.001) { G().tx("Vibe Лото · ВЫИГРЫШ", 100000, "🎰", "c-lime"); FX.confetti(); FX.toast("ТЫ ВЫИГРАЛ 100 000 ₫!!!", "🎰", 4000); }
      else FX.toast("Не повезло. Повезёт в следующий раз (нет)", "🎰");
    }
    if (c.lesson) setTimeout(() => FX.toast(c.lesson, "🛡️", 4000), 800);
    Vibe.refreshCounters();
    if (c.go) setTimeout(() => Vibe.go(c.go), 400);
  }
  const events = (Vibe.events = {
    LIST: EVENTS,
    show(ev) {
      Vibe.modal(`
        <div class="m-emo wobble">${ev.e}</div>
        <div class="display" style="font-size:24px">${ev.t}</div>
        <p>${ev.d}</p>
        <div style="display:grid;gap:10px">${ev.ch.map((c, i) => `<button class="btn ${i ? "" : "black"} block" data-ch="${i}" style="white-space:normal;height:auto;min-height:52px;padding:10px 16px">${c.t}</button>`).join("")}</div>
        <div class="fine">Жизнь случается. Даже в приложении.</div>`, {
        sound: "pop",
        onMount(m, close) {
          m.addEventListener("click", (e) => {
            const b = e.target.closest("[data-ch]"); if (!b) return;
            close();
            applyChoice(ev, ev.ch[+b.dataset.ch], b);
            set({ pendingEvent: null, eventsSeen: [...(S().eventsSeen || []), ev.id].slice(-20) });
          });
        },
      });
    },
    // Раз в игровой день — шанс события
    roll() {
      const s = S();
      const d = today();
      if (s.eventDay === d) return;
      set({ eventDay: d });
      if (s.pendingEvent || Math.random() > 0.25) return;
      const pool = EVENTS.filter((e) => (!e.job || s.job) && (!e.rent || (s.home && s.home.rent)) && !(s.eventsSeen || []).slice(-4).includes(e.id));
      if (pool.length) set({ pendingEvent: pick(pool).id });
    },
    pending() {
      const id = S().pendingEvent;
      if (!id) return;
      const ev = EVENTS.find((e) => e.id === id);
      if (!ev) return set({ pendingEvent: null });
      if (document.querySelector(".modal")) return;
      events.show(ev);
    },
  });

  /* ================= Работа: часы и офис ================= */
  const work = (Vibe.work = {
    // Рабочие часы: будни 9–19
    hours() { const i = G().info(); return i.day % 7 < 5 && i.hour >= 9 && i.hour < 19; },
    atOffice() { return S().fz_lastPos === "work"; },
    can() {
      const s = S();
      if (!s.job) return { ok: false, why: "Сначала найди работу" };
      if (Vibe.body && Vibe.body.get().sleeping) return { ok: false, why: "Ты спишь. Работать во сне — это к начальнику" };
      if (!work.hours()) return { ok: false, why: G().info().day % 7 >= 5 ? "Выходной! Отдыхай. Или подработай в Vibe Gig" : "Рабочий день 9:00–19:00. Сейчас не время" };
      return { ok: true };
    },
    // Множитель продуктивности: офис +15%, удалёнка −10%
    mult() { return work.atOffice() ? 1.15 : 0.9; },
  });

  /* ================= Вайбики как валюта ================= */
  // Сколько вайбиков можно списать за покупку (до 30% суммы, 1 вайбик = 1 ₫)
  Vibe.vibikiPay = (amount) => Math.min(S().vibiki || 0, Math.floor(amount * 0.3));
  Vibe.spendVibiki = (n) => { if (n > 0) { set({ vibiki: Math.max(0, S().vibiki - n) }); Vibe.refreshCounters(); } };

  /* ================= Вайбот знает всё ================= */
  Vibe.insight = function () {
    const s = S();
    const b = Vibe.body ? Vibe.body.get() : null;
    const tips = [];
    const eats = (s.tx || []).filter((t) => /Eat/.test(t.t)).length;
    if (b) {
      const late = (b.meals || []).filter((m) => m.kind === "eat_out" && (m.min % 1440) >= 23 * 60).length;
      if (late >= 2) tips.push(`Ты ${late} раза заказывал еду после 23:00. Я не осуждаю. Я записываю 📝`);
      if (b.nutrition < 40) tips.push("Твоё питание — 40 из 100. Даже твой холодильник грустит 🧊");
      const ls = (b.sleepLog || []).slice(-1)[0];
      if (ls && ls.q < 0.65) tips.push(`Сон ${Math.round(ls.q * 100)}%. Сосед Валера снова победил. Может, переедем? 🏠`);
      if (b.steps < 2000 && G().info().hour > 18) tips.push(`Сегодня ${Math.round(b.steps)} шагов. Твой фитнес-браслет просит прощения ⌚`);
      if (b.food < 25) tips.push("Ты голоден. У меня как раз 37 ресторанов рядом 🍜");
    }
    if (eats >= 5) tips.push(`${eats} заказов еды. Курьер Тимур уже здоровается с тобой по имени 🛵`);
    if (s.balance < 0) tips.push("Минус на карте. Хорошая новость: кредит всё ещё предодобрен 🤑");
    if (subs.list().length >= 2) tips.push(`У тебя ${subs.list().length} подписки на ${Vibe.rub(subs.total())}/мес. Ты точно ими пользуешься? 👀`);
    if (s.job && (s.job.perf || 0) > 70) tips.push("До повышения совсем чуть-чуть. Ещё пара задач! 🚀");
    if (!s.job) tips.push("Работы нет, а аренда есть. Vibe Job ждёт 💼");
    if (s.vibiki > 500) tips.push(`У тебя ${Vibe.fmt(s.vibiki)} вайбиков. Ими можно платить до 30% покупки 🪙`);
    tips.push("Я подобрал тебе 37 предложений. Каждое — персональное 💜");
    return tips;
  };

  /* ================= Погода ================= */
  // Детерминированно по игровому дню из сида (старт игры). Месяц 0 = ноябрь.
  // Vibe.weather.now() → { e, t, kind: "sun"|"cloud"|"rain"|"snow"|"storm", label }
  const MONTH_T = [1, -5, -8, -7, -1, 7, 14, 18, 20, 18, 12, 5];          // средняя t
  const MONTH_P = [0.55, 0.5, 0.45, 0.45, 0.4, 0.4, 0.4, 0.35, 0.35, 0.4, 0.45, 0.5]; // шанс осадков
  const SUMMER = (mo) => mo >= 6 && mo <= 9;
  function h01(n) {
    n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4;
    n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15;
    return (n >>> 0) / 4294967296;
  }
  const wSeed = () => { const g = S().game; return g && g.start ? Math.floor(g.start / 60000) % 1000003 : 4242; };
  const wr = (day, k) => h01((wSeed() * 31 + day * 977 + k * 7919) | 0);
  const wDayCache = new Map();
  const W_E = { sun: "☀️", cloud: "☁️", rain: "🌧️", snow: "🌨️", storm: "⛈️" };
  function wLabel(kind, t, night) {
    if (kind === "sun") return night ? "ясная ночь" : "солнечно";
    if (kind === "cloud") return "пасмурно";
    if (kind === "rain") return t <= 2 ? "мокрый снег с дождём" : "дождь";
    if (kind === "snow") return "снег";
    return t <= 0 ? "метель" : "гроза";
  }
  const weather = (Vibe.weather = {
    day(day = today()) {
      const key = wSeed() + ":" + day;
      if (wDayCache.has(key)) return wDayCache.get(key);
      const mo = ((Math.floor(day / 30) % 12) + 12) % 12, nx = (mo + 1) % 12, f = (((day % 30) + 30) % 30) / 30;
      const mean = MONTH_T[mo] * (1 - f) + MONTH_T[nx] * f;
      const anom = (wr(day, 1) - 0.5) * 8 + (wr(day - 1, 1) - 0.5) * 4; // соседние дни похожи
      const tm = Math.round(mean + anom);
      let kind;
      if (wr(day, 2) < MONTH_P[mo]) {
        kind = tm <= 0 || (tm <= 2 && wr(day, 3) < 0.5) ? "snow" : "rain";
        if (kind === "rain" && tm >= 15 && wr(day, 4) < 0.35) kind = "storm";
        if (kind === "snow" && wr(day, 4) < 0.12) kind = "storm";
      } else kind = wr(day, 5) < (SUMMER(mo) ? 0.65 : 0.35) ? "sun" : "cloud";
      if (day === 0 && kind === "sun") kind = "cloud"; // 1 ноября. Конечно, пасмурно
      const wet = kind === "rain" || kind === "snow" || kind === "storm";
      const amp = (SUMMER(mo) ? 5 : 3) * (wet ? 0.6 : 1);
      // Шесть блоков по 4 часа: осадки идут не весь день
      const blocks = [0, 1, 2, 3, 4, 5].map((b) => (wet ? (wr(day, 10 + b) < 0.7 ? kind : "cloud") : kind === "sun" && wr(day, 20 + b) < 0.2 ? "cloud" : kind));
      const d = { day, month: mo, kind, e: W_E[kind], t: tm, tMin: Math.round(tm - amp), tMax: Math.round(tm + amp), amp, blocks, label: wLabel(kind, tm, false) };
      if (wDayCache.size > 60) wDayCache.clear();
      wDayCache.set(key, d);
      return d;
    },
    // Погода в игровую минуту m
    at(m = nowMin()) {
      const day = Math.floor(m / 1440), mm = ((m % 1440) + 1440) % 1440, h = mm / 60;
      const d = weather.day(day);
      const kind = d.blocks[Math.min(5, Math.floor(h / 4))];
      const t = Math.round(d.t + d.amp * Math.cos((2 * Math.PI * (h - 15)) / 24));
      const night = h < 7 || h >= 21;
      return { e: kind === "sun" && night ? "🌙" : kind === "cloud" && night ? "☁️" : W_E[kind], t, kind, label: wLabel(kind, t, night), day };
    },
    now() { return weather.at(nowMin()); },
    wet: (w = weather.now()) => w.kind === "rain" || w.kind === "snow" || w.kind === "storm",
    // Множитель такси: дождь/снег ×1,3, гроза/метель ×1,5
    surge(w = weather.now()) { return w.kind === "storm" ? 1.5 : w.kind === "rain" || w.kind === "snow" ? 1.3 : 1; },
    // Самокаты: убирают в снег/метель и в мороз
    scooter(w = weather.now()) {
      if (w.kind === "snow" || w.kind === "storm") return { ok: false, why: "Самокаты убрали на зиму. Как и твою мотивацию" };
      if (w.t < -2) return { ok: false, why: "Самокаты убрали на зиму. Как и твою мотивацию" };
      return { ok: true, risky: w.kind === "rain" };
    },
    // Влияние на настроение при прогулке: дождь/снег −3, солнце +2
    walkMood(w = weather.now()) { return weather.wet(w) ? -3 : w.kind === "sun" ? 2 : 0; },
    text(w = weather.now()) { return `${w.e} ${w.t > 0 ? "+" : ""}${w.t}° · ${w.label}`; },
  });
  function moodDelta(d, health = 0) {
    if (!Vibe.body || (!d && !health)) return;
    const b = Vibe.body.get();
    set({ body: Object.assign({}, b, { mood: clamp(b.mood + d), health: clamp(b.health + health) }) });
    Vibe.emit && Vibe.emit("weather_mood", { delta: d, health });
  }

  /* ================= Поездки в игровом времени ================= */
  // state.trip = { id, from, to, mode, kind, emoji, km, startMin, endMin, p0, price, paid, payTitle, col, extra, driver, title }
  // 1 игровая минута = 2,5 реальной секунды. Пока едешь — fz_lastPos = "transit" (не дома, не в офисе).
  // Финиш — в Vibe.world.tick() (каждые 5 с) или Vibe.trip.check(), даже если карта закрыта.
  const FUEL_FINE = 1000;
  const placeLabel = (k) => { const p = Vibe.map && Vibe.map.place(k); return (p && p.label) || (k === "home" ? "Дом" : k === "work" ? "Работа" : k); };
  const tripApi = (Vibe.trip = {
    TRANSIT: "transit",
    current() { const t = S().trip; return t && t.to ? t : null; },
    last() { return S().tripLast || null; },
    where() { return tripApi.current() ? null : S().fz_lastPos || "home"; },
    // { from, to, mode, minutes, price, emoji, km, paid, payTitle, col, title, driver }
    start(o) {
      if (tripApi.current()) return null;
      const m = nowMin();
      const t = {
        id: "tr" + Date.now(), from: o.from || S().fz_lastPos || "home", to: o.to, mode: o.mode || "walk",
        kind: o.kind || o.mode || "walk", emoji: o.emoji || "🚶", km: o.km || 1, title: o.title || "",
        startMin: m, endMin: m + Math.max(1, o.minutes || 1), t0: m, p0: 0,
        price: o.price || 0, paid: !!o.paid, payTitle: o.payTitle || "Vibe Maps · поездка", col: o.col || "c-yellow",
        extra: 0, driver: o.driver || null, boosted: null,
      };
      if (t.from === "transit") t.from = "home";
      set({ trip: t, fz_lastPos: "transit" });
      Vibe.emit && Vibe.emit("trip", { phase: "start", trip: t });
      return t;
    },
    progress(t = tripApi.current(), m = nowMin()) {
      if (!t) return 0;
      const k = Math.max(0, Math.min(1, (m - t.startMin) / Math.max(0.001, t.endMin - t.startMin)));
      return Math.max(0, Math.min(1, (t.p0 || 0) + (1 - (t.p0 || 0)) * k));
    },
    // Сколько игровых минут осталось
    eta(t = tripApi.current()) { return t ? Math.max(0, t.endMin - nowMin()) : 0; },
    // «Ускорить» — только за деньги: пересесть на другой транспорт (оплата сразу)
    // o: { mode, kind, minutes (оставшиеся), price, emoji, payTitle, col, from }
    boost(o) {
      const t = tripApi.current();
      if (!t) return null;
      const m = nowMin();
      if (m + o.minutes >= t.endMin) { FX.toast("Так ты приедешь не быстрее. Корпорация ценит твою честность", "🤔"); return null; }
      if (o.price && !Vibe.pay(o.price, { title: o.payTitle || "Vibe Maps · пересадка на такси", emoji: o.emoji || "🚕", col: o.col || "c-yellow", from: o.from })) return null;
      const nt = Object.assign({}, t, {
        p0: tripApi.progress(t, m), startMin: m, endMin: m + Math.max(1, o.minutes),
        boosted: { from: t.mode, at: m }, driver: o.driver || t.driver, mode: o.mode, kind: o.kind || o.mode, emoji: o.emoji || t.emoji, extra: (t.extra || 0) + (o.price || 0),
      });
      set({ trip: nt });
      Vibe.emit && Vibe.emit("trip", { phase: "boost", trip: nt });
      return nt;
    },
    check() {
      if (S().fz_lastPos === "transit" && !S().trip) set({ fz_lastPos: (S().tripLast && S().tripLast.to) || "home" }); // самолечение
      const t = tripApi.current();
      if (t && nowMin() >= t.endMin) return finish(t);
      return null;
    },
  });
  function finish(t) {
    const at = t.endMin;
    set({ trip: null, fz_lastPos: t.to });
    const res = { fined: false, fell: false, paidOk: true, vib: 0, mood: 0 };
    // Оплата по прибытии
    if (t.price && !t.paid) {
      if (t.kind === "car") G().tx(`Бензин · ${String(t.km).replace(".", ",")} км`, -t.price, "⛽", "c-orange");
      else res.paidOk = Vibe.pay(t.price, { title: t.payTitle, emoji: t.emoji, col: t.col });
      if (!res.paidOk) setTimeout(() => FX.toast(`${t.driver ? t.driver.n : "Сервис"} записал тебя в должники. Рейтинг −0,3`, "📉", 2800), 1500);
    }
    if (t.kind === "car" && t.to !== "home" && Math.random() < 0.15) {
      res.fined = true;
      setTimeout(() => { G().tx("Штраф за парковку", -FUEL_FINE, "🚔", "c-coral"); Vibe.refreshCounters(); FX.toast(`Штраф за парковку −${Vibe.rub(FUEL_FINE)}. Камера была быстрее`, "🚔", 3200); }, 1800);
    }
    // Тело и погода
    const w = weather.at(Math.round((t.t0 + at) / 2));
    if (Vibe.body) {
      if (t.kind === "walk") Vibe.body.effect("walk", { km: t.km });
      else if (t.kind === "metro") Vibe.body.effect("metro", { km: t.km });
      else if (t.kind === "scooter") {
        const b = Vibe.body.get();
        set({ body: Object.assign({}, b, { steps: (b.steps || 0) + Math.round(t.km * 150) }) });
      } else Vibe.body.effect("taxi", { km: t.km, quiet: true });
    }
    if (t.kind === "walk") { res.mood = weather.walkMood(w); res.vib = Math.max(5, Math.min(50, Math.round(t.km * 8))); Vibe.reward({ vibiki: res.vib, xp: 20 }); }
    if (t.kind === "scooter") {
      res.mood = w.kind === "sun" || (w.kind === "cloud" && w.t >= 8) ? 2 : weather.wet(w) ? -1 : 0;
      if (w.kind === "rain" && Math.random() < 0.12) { res.fell = true; setTimeout(() => FX.toast("Самокат поскользнулся на луже. Ты тоже. Здоровье −3", "🤕", 3200), 2200); }
    }
    moodDelta(res.mood, res.fell ? -3 : 0);
    if (res.mood && t.kind === "walk") setTimeout(() => FX.toast(res.mood > 0 ? `Солнце! Настроение +${res.mood}` : `${w.label[0].toUpperCase() + w.label.slice(1)} всю дорогу. Настроение ${res.mood}`, w.e, 2600), 2600);
    // Календарь: зал ожидания / вовремя / опоздал
    const evs = sched.arrive(t.to, at) || [];
    const late = evs.reduce((s, e) => Math.max(s, e.arrival === "late" ? e.late || 0 : 0), 0);
    const last = Object.assign({}, t, { at, done: true, seen: false, weather: w, res, events: evs.map((e) => ({ id: e.id, arrival: e.arrival, late: e.late || 0, wait: e.wait || 0 })) });
    set({ tripLast: last });
    if (!evs.length) FX.toast(`Ты на месте: ${placeLabel(t.to)}`, "📍", 2600);
    Vibe.refreshCounters && Vibe.refreshCounters();
    Vibe.emit && Vibe.emit("arrive", { to: t.to, mode: t.mode, kind: t.kind, late, events: evs, trip: last });
    return last;
  }

  /* ================= Тик ================= */
  Vibe.world = {
    tick() {
      if (!S().profile || !S().game) return;
      tripApi.check();   // сначала финиш поездки (минута прибытия — из прошлого), потом расписание
      sched.tick();
      events.roll();
      if (!document.hidden) events.pending();
    },
  };

  // Списание подписок и проценты по копилке — через игровые события дня
  Vibe.world.dayEvents = function (dom) {
    const out = [];
    subs.list().forEach((x) => { if (dom === 30) out.push({ kind: "bill", title: `Подписка · ${x.name}`, a: -x.price, e: x.e, col: "c-lilac", quiet: true }); });
    const jar = S().jar || 0;
    if (dom === 1 && jar > 0) out.push({ kind: "jar", title: "Проценты по копилке (12% годовых)", a: 0, jar: Math.round(jar * 0.01), e: "🐷", col: "c-lime", quiet: true });
    return out;
  };
})();
