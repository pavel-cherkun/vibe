/* ============================================================
   World — связи между сервисами:
   • Vibe.inv      — вещи игрока (квартира, гардероб, гаджеты), их бонусы
   • Vibe.sched    — расписание: события в календаре с местом на карте
   • Vibe.subs     — подписки с ежемесячным списанием
   • Vibe.people   — близкие: мама, папа, друзья, партнёр (отношения 0–100)
   • Vibe.events   — случайные жизненные события с выбором
   • Vibe.work     — рабочие часы, офис или удалёнка
   • Vibe.insight  — реплики Заботика из реальных данных
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
  // ev: { id, day, hour, min, dur (игровые минуты), title, e, place (ключ карты), kind, go, params, price, status }
  const handlers = {};
  const sched = (Vibe.sched = {
    list: () => (S().sched || []),
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
    // Окно: за 60 игровых минут до начала и до конца события
    active(placeKey) {
      const m = nowMin();
      return sched.list().filter((e) => e.status === "planned" && (!placeKey || e.place === placeKey) && m >= sched.startMin(e) - 60 && m <= sched.startMin(e) + e.dur);
    },
    // Игрок пришёл в место → посетить события там
    arrive(placeKey) {
      const list = sched.active(placeKey);
      list.forEach((e) => sched.attend(e.id));
      return list;
    },
    attend(id) {
      const e = sched.list().find((x) => x.id === id);
      if (!e || e.status !== "planned") return null;
      set({ sched: sched.list().map((x) => (x.id === id ? Object.assign({}, x, { status: "done" }) : x)) });
      const BODY = { concert: "concert", date: "date", doctor: "doctor", friend: "social", family: "social", sport: "workout", hobby: "meditate", travel: "travel" };
      if (Vibe.body && BODY[e.kind]) Vibe.body.effect(BODY[e.kind], { score: 0.8 });
      (handlers[e.kind] || []).forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
      FX.confetti({ count: 70 });
      FX.toast(`${e.e} ${e.title} — ты пришёл!`, "✅", 2600);
      Vibe.reward({ vibiki: 20, xp: 25 });
      return e;
    },
    tick() {
      const m = nowMin();
      const missed = sched.list().filter((e) => e.status === "planned" && sched.startMin(e) + e.dur < m);
      if (!missed.length) return;
      set({ sched: sched.list().map((x) => (missed.includes(x) ? Object.assign({}, x, { status: "missed" }) : x)) });
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
      { t: "Починить за 6 900 ₽", a: -6900, mood: 2 }, { t: "Жить с трещиной", mood: -6 }, { t: "Новый в рассрочку", loan: 45000, mood: 8 } ] },
    { id: "flood", e: "🌊", t: "Соседи сверху затопили", d: "Потолок плачет. Соседи не открывают.", ch: [
      { t: "Ремонт за свой счёт: 12 000 ₽", a: -12000 }, { t: "Подать в суд (Госвайб)", mood: -8, go: "gov" }, { t: "Поставить тазик", mood: -10 } ] },
    { id: "fine", e: "🚔", t: "Пришёл штраф", d: "За парковку. Машины у тебя нет. Но штраф есть.", ch: [
      { t: "Оплатить со скидкой 50%: 1 250 ₽", a: -1250 }, { t: "Оспорить в Госвайбе", go: "gov", mood: -2 } ] },
    { id: "bonus", e: "🎁", t: "Кэшбек пришёл неожиданно", d: "Корпорация в хорошем настроении. Редкость.", ch: [
      { t: "Забрать 3 000 ₽", a: 3000, mood: 6 } ] },
    { id: "scam", e: "☎️", t: "Звонит «служба безопасности банка»", d: "«Ваши деньги в опасности. Продиктуйте код из СМС».", ch: [
      { t: "Продиктовать код", a: -15000, mood: -15, lesson: "Никогда не диктуй коды. Даже в игре." }, { t: "Положить трубку", mood: 3, vib: 50 } ] },
    { id: "rentup", e: "🧛", t: "Арендодатель поднимает цену", d: "«Рынок вырос. Я тоже вырос. Плюс 10%».", rent: true, ch: [
      { t: "Согласиться (+10% к аренде)", rentUp: 0.1 }, { t: "Поторговаться (+5%, нервы)", rentUp: 0.05, mood: -5 } ] },
    { id: "cold", e: "🤧", t: "Ты простыл", d: "Кондиционер в офисе победил.", ch: [
      { t: "К врачу (Vibe Health)", go: "health" }, { t: "Чай с мёдом и сериал", health: -6, mood: 4 } ] },
    { id: "found", e: "💵", t: "Нашёл 500 ₽ в старой куртке", d: "Лучший кэшбек в твоей жизни.", ch: [
      { t: "Ура!", a: 500, mood: 8 } ] },
    { id: "friend_loan", e: "🧔", t: "Лёха просит в долг до зарплаты", d: "«Бро, 5 000 до пятницы. Какой пятницы — не уточню».", ch: [
      { t: "Дать 5 000 ₽", a: -5000, rel: ["lyoha", 15], debt: ["lyoha", 5000] }, { t: "Отказать", rel: ["lyoha", -12] } ] },
    { id: "mom_visit", e: "👩", t: "Мама приехала с банками", d: "Огурцы, варенье и вопросы о личной жизни.", ch: [
      { t: "Обнять и поесть", fridge: 6, mood: 8, rel: ["mom", 10] }, { t: "Я занят", rel: ["mom", -10], mood: -4 } ] },
    { id: "promo_job", e: "📈", t: "Начальник заметил тебя", d: "«Есть проект. Срочный. Вечером и в выходные».", job: true, ch: [
      { t: "Взяться (+30% к повышению)", perf: 30, mood: -6, energy: -15 }, { t: "Вежливо отказаться", perf: -5 } ] },
    { id: "lottery", e: "🎰", t: "Vibe Лото: билет за 100 ₽", d: "Шанс выиграть 100 000 ₽ — 1%. Шанс на радость — 100%.", ch: [
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
      G().tx("Vibe Лото · билет", -100, "🎰", "c-yellow");
      if (Math.random() < 0.01) { G().tx("Vibe Лото · ВЫИГРЫШ", 100000, "🎰", "c-lime"); FX.confetti(); FX.toast("ТЫ ВЫИГРАЛ 100 000 ₽!!!", "🎰", 4000); }
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
      if (s.pendingEvent || Math.random() > 0.3) return;
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
  // Сколько вайбиков можно списать за покупку (до 30% суммы, 1 вайбик = 1 ₽)
  Vibe.vibikiPay = (amount) => Math.min(S().vibiki || 0, Math.floor(amount * 0.3));
  Vibe.spendVibiki = (n) => { if (n > 0) { set({ vibiki: Math.max(0, S().vibiki - n) }); Vibe.refreshCounters(); } };

  /* ================= Заботик знает всё ================= */
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

  /* ================= Тик ================= */
  Vibe.world = {
    tick() {
      if (!S().profile || !S().game) return;
      sched.tick();
      events.roll();
      if (!document.hidden) events.pending();
    },
  };

  // Списание подписок и проценты по копилке — через игровые события дня
  Vibe.world.dayEvents = function (dom) {
    const out = [];
    subs.list().forEach((x) => { if (x.dom === dom) out.push({ kind: "bill", title: `Подписка · ${x.name}`, a: -x.price, e: x.e, col: "c-lilac", quiet: true }); });
    const jar = S().jar || 0;
    if (dom === 1 && jar > 0) out.push({ kind: "jar", title: "Проценты по копилке (12% годовых)", a: 0, jar: Math.round(jar * 0.01), e: "🐷", col: "c-lime", quiet: true });
    return out;
  };
})();
