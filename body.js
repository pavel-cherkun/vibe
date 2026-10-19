/* ============================================================
   Тело персонажа — данные «браслета» Vibe Fit.
   Энергия (сон), сытость, питание, активность (шаги),
   настроение, здоровье, пульс, продуктивность.

   Симуляция идёт по игровому времени (1 игровая минута =
   2,5 реальных секунды). Если игрок долго отсутствовал, тело
   живёт само: спит ночью дома, ест простую еду, ходит на работу.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const AUTO_GAP = 90;              // игровых минут без игрока → автопилот
  const STEP_GOAL = 8000;
  const listeners = new Set();

  const DEFAULT = () => ({
    energy: 80, food: 70, mood: 60, health: 75, nutrition: 55,
    steps: 0, stepsDay: 0, stepsLog: [], sleepLog: [], meals: [],
    fridge: 0, sleeping: null, cur: null, lastMin: null, workoutAt: -9999, sick: false,
    effects: {}, cleanUntil: -1,
  });
  const B = () => Object.assign(DEFAULT(), S().body || {});
  const save = (b) => { Vibe.state.set({ body: b }); listeners.forEach((fn) => fn(b)); };
  const nowMin = () => Vibe.game.minutes();
  const dayOf = (m) => Math.floor(m / 1440);
  const hourOf = (m) => Math.floor((m % 1440) / 60);
  const isNight = (h) => h >= 23 || h < 7;

  /* ---------- Качество сна зависит от жилья ---------- */
  function sleepQuality(b = B()) {
    const s = S();
    const h = s.home || {};
    let q, why, e;
    if (h.own) { q = 0.95; why = "Своя квартира. Тишина, никто не стучит в стену"; e = "🏡"; }
    else if (!h.rent) { q = 0.5; why = "Диван у мамы. Мама встаёт в 6 утра"; e = "🛋️"; }
    else if (h.rent <= 20000) { q = 0.58; why = "Коммуналка: сосед Валера смотрел сериал до трёх ночи"; e = "🏚️"; }
    else if (h.rent <= 45000) { q = 0.74; why = "Студия: тонкие стены, но жить можно"; e = "🏠"; }
    else if (h.rent <= 90000) { q = 0.86; why = "Нормальная квартира: тихо, темно, хорошо"; e = "🏡"; }
    else { q = 0.97; why = "Шумоизоляция уровня бог. Кровать умнее тебя"; e = "🏰"; }
    if (b.cleanUntil > dayOf(nowMin())) { q += 0.05; why += ". Чистота после уборки помогает"; }
    if (b.mood < 30) { q -= 0.08; why += ". Тревожные мысли мешали уснуть"; }
    if (b.effects && b.effects.coffeeLate === dayOf(nowMin())) { q -= 0.1; why += ". Кофе вечером — плохая идея"; }
    return { q: clamp(q, 0.3, 1), why, e };
  }

  /* ---------- Продуктивность ---------- */
  function productivity(b = B()) {
    const parts = {
      energy: b.energy,
      food: clamp((b.food / 70) * 100),
      mood: b.mood,
      health: b.health,
    };
    let v = parts.energy * 0.4 + parts.food * 0.2 + parts.mood * 0.25 + parts.health * 0.15;
    if (b.sick) v *= 0.55;
    if (b.sleeping) v = 0;
    return { value: Math.round(clamp(v, 0, 100)), parts };
  }

  function heartRate(b = B()) {
    const sinceWorkout = nowMin() - (b.workoutAt || -9999);
    const workout = sinceWorkout < 60 ? (60 - sinceWorkout) * 0.8 : 0;
    const base = b.sleeping ? 54 : 64;
    return Math.round(base + (100 - b.energy) * 0.08 + (100 - b.mood) * 0.12 + workout + (b.sick ? 14 : 0));
  }

  /* ---------- Симуляция ---------- */
  function rollDay(b, newDay) {
    // закрыть прошлый день: шаги, здоровье
    if (b.stepsDay !== newDay) {
      b.stepsLog = [...(b.stepsLog || []), { day: b.stepsDay, steps: Math.round(b.steps) }].slice(-7);
      const lastSleep = (b.sleepLog || []).slice(-1)[0];
      const sleepScore = lastSleep ? clamp((lastSleep.hours / 8) * 100 * lastSleep.q) : 40;
      const act = clamp((b.steps / STEP_GOAL) * 100);
      const target = sleepScore * 0.35 + b.nutrition * 0.3 + act * 0.2 + b.mood * 0.15;
      b.health = clamp(b.health + (target - b.health) * 0.25);
      b.steps = 0; b.stepsDay = newDay;
      b.meals = (b.meals || []).filter((m) => m.day >= newDay - 6);
      if (b.health < 35 && !b.sick && Math.random() < 0.35) { b.sick = true; b.notes.push({ e: "🤒", t: "Ты заболел. Продуктивность ×0,5. Помогут врач (Vibe Health) и сон" }); }
      if (b.sick && b.health > 60) { b.sick = false; b.notes.push({ e: "💪", t: "Ты выздоровел!" }); }
    }
  }

  function startSleep(b, m, auto = false) {
    const { q } = sleepQuality(b);
    b.sleeping = { at: m, q, auto };
    b.cur = { at: m, mins: 0, q };
  }
  function endSleep(b, m) {
    if (!b.cur) { b.sleeping = null; return null; }
    const rec = { day: dayOf(m), hours: +(b.cur.mins / 60).toFixed(1), q: b.cur.q, why: sleepQuality(b).why, auto: !!(b.sleeping && b.sleeping.auto) };
    if (rec.hours >= 0.5) b.sleepLog = [...(b.sleepLog || []), rec].slice(-7);
    b.sleeping = null; b.cur = null;
    return rec;
  }

  function addMeal(b, kind) {
    const M = {
      basic: { food: 32, q: 55, e: "🥪", t: "Перекус на бегу" },
      cooked: { food: 40, q: 88, e: "🍳", t: "Домашняя еда" },
      eat_out: { food: 45, q: 38, e: "🍜", t: "Доставка Vibe Eat" },
      healthy: { food: 38, q: 92, e: "🥗", t: "Салат и вот это всё" },
      junk: { food: 20, q: 15, e: "🍫", t: "Шоколадка из автомата" },
    }[kind] || { food: 25, q: 50, e: "🍽️", t: "Еда" };
    b.food = clamp(b.food + M.food);
    b.nutrition = clamp(b.nutrition + (M.q - b.nutrition) * 0.25);
    b.meals = [...(b.meals || []), { day: dayOf(nowMin()), min: nowMin(), kind, e: M.e, t: M.t, q: M.q }].slice(-30);
    return M;
  }

  // Прокрутить тело до текущего момента
  function tick() {
    if (!S().profile || !S().game) return;
    const b = B();
    b.notes = [];
    const now = nowMin();
    if (b.lastMin == null) { b.lastMin = now; b.stepsDay = dayOf(now); save(b); return; }
    let m = b.lastMin;
    const gap = now - m;
    if (gap <= 0) return;
    const auto = gap > AUTO_GAP;
    const job = S().job;
    let autoNight = 0, autoMeals = 0;
    while (m < now) {
      const step = Math.min(60 - (m % 60) || 60, now - m);
      const h = hourOf(m);
      if (dayOf(m) !== b.stepsDay) rollDay(b, dayOf(m));
      // Автопилот: ночью спит дома, днём живёт обычной жизнью
      if (auto) {
        if (isNight(h) && !b.sleeping && b.energy < 95) { startSleep(b, m, true); autoNight++; }
        if (!isNight(h) && b.sleeping && b.sleeping.auto && (b.energy >= 95 || h >= 9 || (h >= 7 && b.energy >= 70))) endSleep(b, m);
        if (!b.sleeping && [8, 13, 19].includes(h) && m % 60 === 0) { addMeal(b, b.fridge > 0 ? "cooked" : "basic"); if (b.fridge > 0) b.fridge--; autoMeals++; }
        if (!b.sleeping && job && h >= 8 && h < 20 && dayOf(m) % 7 < 5) b.steps += (step / 60) * 450;
        else if (!b.sleeping) b.steps += (step / 60) * 220;
      } else if (!b.sleeping) b.steps += (step / 60) * 120;
      const k = step / 60;
      if (b.sleeping) {
        b.energy = clamp(b.energy + 15 * b.sleeping.q * k);
        b.food = clamp(b.food - 1.5 * k);
        if (b.cur) b.cur.mins += step;
        if (b.energy >= 100 && !isNight(h)) { const rec = endSleep(b, m); if (rec && !auto) b.notes.push({ e: "☀️", t: `Ты проснулся. Сон ${rec.hours} ч, качество ${Math.round(rec.q * 100)}%` }); }
      } else {
        b.energy = clamp(b.energy - (b.sick ? 6 : 4.5) * k);
        b.food = clamp(b.food - 5 * k);
      }
      // Настроение тянется к базе, голод и усталость его портят
      const base = 58 + (S().balance < 0 ? -15 : 0);
      b.mood = clamp(b.mood + (base - b.mood) * 0.04 * k - (b.food < 20 ? 3 * k : 0) - (b.energy < 20 ? 3 * k : 0));
      m += step;
    }
    if (dayOf(now) !== b.stepsDay) rollDay(b, dayOf(now));
    b.lastMin = now;
    // Предупреждения, пока игрок в приложении
    if (!auto) {
      const was = S().body || {};
      if (b.food < 25 && (was.food ?? 100) >= 25) b.notes.push({ e: "🍽️", t: "Ты проголодался. Сытость 25% — продуктивность падает" });
      if (b.energy < 20 && (was.energy ?? 100) >= 20) b.notes.push({ e: "🥱", t: "Глаза слипаются. Пора спать — дома" });
    } else if (autoNight || autoMeals) {
      const last = (b.sleepLog || []).slice(-1)[0];
      if (last && last.auto) b.notes.push({ e: "😴", t: `Пока тебя не было, ты поспал ${last.hours} ч. Качество ${Math.round(last.q * 100)}%` });
    }
    const notes = b.notes; delete b.notes;
    save(b);
    notes.forEach((n, i) => setTimeout(() => FX.toast(n.t, n.e, 3200), 600 + i * 1200));
  }

  /* ---------- Воздействия: всё, что делает игрок ---------- */
  const EFFECTS = {
    eat_out: (b) => { const M = addMeal(b, "eat_out"); return `${M.e} Сытость +${M.food}%`; },
    junk: (b) => { const M = addMeal(b, "junk"); b.mood = clamp(b.mood + 4); return `${M.e} Сытость +${M.food}%, питание хуже`; },
    cook: (b) => { if (b.fridge <= 0) return null; b.fridge--; const M = addMeal(b, "cooked"); b.mood = clamp(b.mood + 3); return `${M.e} Сытость +${M.food}%, питание лучше`; },
    healthy: (b) => { const M = addMeal(b, "healthy"); return `${M.e} Сытость +${M.food}%, питание +`; },
    groceries: (b, o) => { const n = clamp(Math.round((o.amount || 800) / 450), 1, 12); b.fridge = Math.min(20, (b.fridge || 0) + n); return `🧊 В холодильнике +${n} порц.`; },
    coffee: (b) => { b.energy = clamp(b.energy + 10); if (hourOf(nowMin()) >= 17) b.effects.coffeeLate = dayOf(nowMin()); return "☕ Энергия +10%"; },
    walk: (b, o) => { const st = Math.round((o.km || 1) * 1350); b.steps += st; b.energy = clamp(b.energy - 3); b.mood = clamp(b.mood + 4); b.health = clamp(b.health + 0.5); return `🚶 +${Vibe.fmt(st)} шагов`; },
    metro: (b, o) => { const st = Math.round(600 + (o.km || 1) * 200); b.steps += st; b.energy = clamp(b.energy - 2); return `🚇 +${Vibe.fmt(st)} шагов`; },
    taxi: (b) => { b.energy = clamp(b.energy + 2); return "🚕 Сберёг силы"; },
    workout: (b, o) => { const st = 2500 + Math.round((o.score || 0.7) * 2500); b.steps += st; b.energy = clamp(b.energy - 12); b.mood = clamp(b.mood + 10); b.health = clamp(b.health + 2); b.workoutAt = nowMin(); return `🏋️ +${Vibe.fmt(st)} шагов, настроение +10`; },
    meditate: (b) => { b.mood = clamp(b.mood + 9); return "🧘 Настроение +9"; },
    concert: (b) => { b.mood = clamp(b.mood + 25); b.energy = clamp(b.energy - 10); b.steps += 3000; return "🎤 Настроение +25"; },
    music: (b) => { if ((b.effects.music || 0) > nowMin() - 120) return null; b.effects.music = nowMin(); b.mood = clamp(b.mood + 4); return "🎧 Настроение +4"; },
    games: (b) => { if ((b.effects.games || 0) > nowMin() - 120) return null; b.effects.games = nowMin(); b.mood = clamp(b.mood + 4); b.energy = clamp(b.energy - 2); return "🎮 Настроение +4"; },
    date: (b) => { if ((b.effects.date || 0) > nowMin() - 180) return null; b.effects.date = nowMin(); b.mood = clamp(b.mood + 6); return "💘 Настроение +6"; },
    shopping: (b) => { b.mood = clamp(b.mood + 3); return "🛍️ Настроение +3 (ненадолго)"; },
    doctor: (b) => { b.health = clamp(b.health + 15); b.sick = false; return "🏥 Здоровье +15"; },
    pharmacy: (b) => { b.health = clamp(b.health + 5); return "💊 Здоровье +5"; },
    clean: (b) => { b.cleanUntil = dayOf(nowMin()) + 3; b.mood = clamp(b.mood + 8); return "🫧 Чисто! Сон лучше 3 дня"; },
    travel: (b) => { b.mood = 100; b.energy = 100; b.health = clamp(b.health + 10); return "🏝️ Отдохнул на 100%"; },
    study: (b) => { b.energy = clamp(b.energy - 5); b.mood = clamp(b.mood + 2); return "🎓 Энергия −5"; },
    work: (b) => { b.energy = clamp(b.energy - 6); b.mood = clamp(b.mood - 1); b.food = clamp(b.food - 3); return null; },
    salary: (b) => { b.mood = clamp(b.mood + 15); return null; },
    bill: (b) => { b.mood = clamp(b.mood - 4); return null; },
    mom: (b) => { b.mood = clamp(b.mood + 6); return "📞 Поговорил с мамой. Настроение +6"; },
  };
  function effect(kind, opts = {}) {
    if (!S().profile || !EFFECTS[kind]) return;
    tick();
    const b = B();
    const msg = EFFECTS[kind](b, opts);
    save(b);
    if (msg && !opts.quiet) setTimeout(() => FX.toast(msg, "⌚", 2200), 900);
  }

  /* ---------- Сон по кнопке ---------- */
  function atHome() {
    const p = S().fz_lastPos;
    return !p || p === "home";
  }
  function sleep() {
    tick();
    const b = B();
    if (b.sleeping) return { ok: false, why: "Ты уже спишь" };
    if (!atHome()) return { ok: false, why: "Спать можно только дома. Сначала доберись до дома в Vibe Maps" };
    if (b.energy > 85) return { ok: false, why: "Ты бодр как никогда. Энергия выше 85% — не уснёшь" };
    startSleep(b, nowMin(), false);
    save(b);
    return { ok: true };
  }
  function wake() {
    tick();
    const b = B();
    if (!b.sleeping) return null;
    const rec = endSleep(b, nowMin());
    save(b);
    return rec;
  }

  Vibe.body = {
    get: B, tick, effect, sleep, wake, atHome, sleepQuality, productivity, heartRate,
    on: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    STEP_GOAL, isNight,
  };
})();
