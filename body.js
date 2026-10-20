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
  const DRAIN = 3.5;                // −энергии в час бодрствования (болезнь: +1,5)
  const SLEEP_GAIN = 16;            // +энергии в час сна × качество сна
  const STEP_GOAL = 8000;
  const listeners = new Set();

  const DEFAULT = () => ({
    energy: 80, food: 70, mood: 60, health: 75, nutrition: 55,
    steps: 0, stepsDay: 0, stepsLog: [], sleepLog: [], meals: [],
    fridge: 0, sleeping: null, cur: null, lastMin: null, workoutAt: -9999, sick: false,
    effects: {}, cleanUntil: -1,
    // Стресс и выгорание
    stress: 15, burn: 0, leave: null, burnModal: false, workStreak: 0, lastWorkDay: -1,
    stressLog: [], stressWhy: [],
  });
  const B = () => Object.assign(DEFAULT(), S().body || {});
  const nowMin = () => Vibe.game.minutes();
  const dayOf = (m) => Math.floor(m / 1440);
  const hourOf = (m) => Math.floor((m % 1440) / 60);
  const isNight = (h) => h >= 23 || h < 7;

  /* ---------- Стресс и выгорание ----------
     stress 0–100. Стадии: 0 «Ок» → 1 «Устал» (≥40, −10%) → 2 «На грани» (≥65, −25%)
     → 3 «Выгорание» (≥90): больничный 3 игровых дня, работа на паузе.
     Спуск по стадиям с гистерезисом 8 пунктов. Из выгорания — только через отдых. */
  const STAGES = [
    { id: 0, t: "Ок", e: "😌", mult: 1, col: "c-lime" },
    { id: 1, t: "Устал", e: "😮‍💨", mult: 0.9, col: "c-yellow" },
    { id: 2, t: "На грани", e: "😵‍💫", mult: 0.75, col: "c-orange" },
    { id: 3, t: "Выгорание", e: "🫠", mult: 0, col: "c-coral" },
  ];
  const UP = [40, 65, 90];
  const LEAVE_DAYS = 3;
  const post = [];                  // что сделать после save (события, тосты, модалка)
  const flush = () => post.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  const save = (b) => { Vibe.state.set({ body: b }); listeners.forEach((fn) => fn(b)); flush(); };
  const stageOf = (b) => (b.leave ? 3 : b.burn || 0);
  function addStress(b, d, why, e = "") {
    b.stress = clamp((b.stress == null ? 15 : b.stress) + d);
    if (why && Math.abs(d) >= 2) b.stressWhy = [...(b.stressWhy || []), { d: Math.round(d), t: why, e, min: nowMin() }].slice(-12);
  }
  const goodWeather = () => {
    const w = Vibe.weather && Vibe.weather.now ? Vibe.weather.now() : null;
    return !w || !/rain|storm|snow/.test(w.kind || "");
  };
  const MOM_LINES = [
    "Солнышко, ты как? Голос у тебя по телефону совсем уставший 😟",
    "Работа не волк. Приезжай на выходных, я пирожки сделаю 🥟",
    "Я тут прочитала, что выгорание — это серьёзно. Отдохни, пожалуйста. Мама волнуется",
    "Ты ешь хоть? И спишь? Не отвечай «нормально», я же чувствую 💛",
  ];
  function momSays() {
    const t = MOM_LINES[Math.floor(Math.random() * MOM_LINES.length)];
    let sent = false;
    if (Vibe.msg && Vibe.msg.send) { try { Vibe.msg.send("mom", t, { from: "mom" }); sent = true; } catch (e) {} }
    setTimeout(() => FX.toast(`${sent ? "Сообщение от мамы: " : "Мама: "}${t}`, "👩", 4200, sent ? { go: "chat", params: { id: "mom" }, label: "Ответить" } : null), 3000);
  }

  // Пересчитать стадию; события и тосты — в post (после save)
  function updateStage(b, notes, quiet) {
    const m = nowMin();
    const prev = b.burn || 0;
    // Больничный: выход, когда срок прошёл и стресс отпустил
    if (b.leave) {
      if (m >= b.leave.until) {
        if (b.stress < 50) {
          b.leave = null;
          b.burn = b.stress >= UP[0] ? 1 : 0;
          notes.push({ e: "🌱", t: "Больничный закончился. Ты вернулся — береги себя, это не спринт" });
          const st = b.burn;
          post.push(() => Vibe.emit && Vibe.emit("burnout", { stage: st, recovered: true, stress: Math.round(b.stress) }));
        } else {
          b.leave.until = m + 720;
          notes.push({ e: "🛌", t: `Стресс ещё ${Math.round(b.stress)}%. Больничный продлён на полдня: нужен отдых или психолог` });
        }
      }
      if (b.leave) { b.burn = 3; return; }
    }
    let st = prev >= 3 ? 2 : prev;
    while (st < 3 && b.stress >= UP[st]) st++;
    while (st > 0 && st < 3 && b.stress < UP[st - 1] - 8) st--;
    if (st === 3) {
      b.leave = { from: m, until: m + LEAVE_DAYS * 1440 };
      b.burnModal = true;
      b.burn = 3;
      b.mood = Math.min(b.mood, 45);
      const leave = Object.assign({}, b.leave);
      post.push(() => Vibe.emit && Vibe.emit("burnout", { stage: 3, until: leave.until, stress: Math.round(b.stress) }));
      post.push(() => Vibe.emit && Vibe.emit("stress", { stage: 3, prev }));
      return;
    }
    b.burn = st;
    if (st !== prev) {
      post.push(() => Vibe.emit && Vibe.emit("stress", { stage: st, prev }));
      if (!quiet) {
        if (st > prev && st === 1) notes.push({ e: "😮‍💨", t: "Браслет: ты устал. Продуктивность −10%. Отдых — это тоже работа" });
        if (st > prev && st === 2) notes.push({ e: "😵‍💫", t: "Браслет: ты на грани. Продуктивность −25%. Пульс выше, сон хуже. Пора тормозить" });
        if (st < prev) notes.push({ e: "🌤️", t: `Стресс отступает: «${STAGES[st].t}»` });
      }
    }
    // На грани — браслет и мама напоминают раз в игровой день
    if (st === 2 && b.effects.warnDay !== dayOf(m)) {
      b.effects.warnDay = dayOf(m);
      if (!quiet && st === prev) notes.push({ e: "⌚", t: `Браслет: стресс ${Math.round(b.stress)}%. Выходной, прогулка или психолог — выбери что-нибудь` });
      post.push(momSays);
    }
  }

  /* ---------- Модалка «Тамагочи улетает» ---------- */
  function injectBurnCss() {
    if (document.getElementById("bo-style")) return;
    const st = document.createElement("style");
    st.id = "bo-style";
    st.textContent = `
      .bo-sky { position: relative; height: 210px; margin: -6px -4px 12px; border: var(--line); border-radius: 22px; overflow: hidden;
        background: linear-gradient(180deg, #8fd8ff 0%, #d9c8ff 70%, #ffe14d 100%); }
      .bo-cloud { position: absolute; font-size: 38px; opacity: .9; animation: bo-drift 9s linear infinite; }
      .bo-fly { position: absolute; left: 50%; bottom: 14px; display: flex; flex-direction: column; align-items: center;
        animation: bo-up 4.2s cubic-bezier(.45,0,.7,1) .5s both; }
      .bo-fly .bo-bal { font-size: 44px; animation: bo-sway 1.4s ease-in-out infinite; transform-origin: 50% 100%; }
      .bo-fly .bo-str { width: 2px; height: 22px; background: var(--ink); }
      .bo-fly .bo-ava { font-size: 58px; animation: bo-sway 1.4s ease-in-out infinite reverse; }
      .bo-sign { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%) rotate(-3deg); background: #fff; border: var(--line);
        border-radius: 10px; padding: 4px 10px; font-weight: 800; font-size: 12px; box-shadow: var(--shadow-sm); opacity: 0;
        animation: bo-sign .5s var(--spring) 4.3s both; white-space: nowrap; }
      .bo-puff { position: absolute; left: 50%; top: 18px; transform: translateX(-50%); font-size: 30px; opacity: 0; animation: bo-puff 1s ease 4.4s both; }
      @keyframes bo-up { 0% { transform: translate(-50%, 0) rotate(0); } 20% { transform: translate(-46%, -20px) rotate(4deg); }
        100% { transform: translate(-30%, -300px) rotate(-10deg) scale(.45); opacity: .2; } }
      @keyframes bo-sway { 50% { transform: rotate(8deg); } }
      @keyframes bo-drift { from { transform: translateX(-60px); } to { transform: translateX(420px); } }
      @keyframes bo-sign { from { opacity: 0; transform: translateX(-50%) scale(.3); } to { opacity: 1; transform: translateX(-50%) rotate(-3deg); } }
      @keyframes bo-puff { 0% { opacity: 0; transform: translateX(-50%) scale(.4); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) scale(1.6); } }
    `;
    document.head.appendChild(st);
  }
  function showBurnModal() {
    if (!Vibe.modal) return;
    injectBurnCss();
    const ava = (S().profile && S().profile.avatar) || "😎";
    Vibe.modal(`
      <div class="bo-sky">
        <span class="bo-cloud" style="top:16px;animation-delay:-2s">☁️</span>
        <span class="bo-cloud" style="top:70px;animation-delay:-6s;font-size:28px">☁️</span>
        <div class="bo-fly"><span class="bo-bal">🎈</span><span class="bo-str"></span><span class="bo-ava">${ava}</span></div>
        <span class="bo-puff">💨</span>
        <div class="bo-sign">Ушёл в себя. Вернусь через ${LEAVE_DAYS} дня</div>
      </div>
      <div class="display" style="font-size:30px">Выгорание</div>
      <p>Твой тамагочи улетел. Больничный на ${LEAVE_DAYS} игровых дня: рабочие задачи на паузе, продуктивность 0%, настроение не выше 45.</p>
      <p style="font-weight:700">Вернуть его помогут сон, выходной без телефона, прогулки, близкие и психолог.</p>
      <div style="display:grid;gap:10px;margin-top:12px">
        <button class="btn black block" data-go="psy" data-close>🛋️ В Vibe Психолог</button>
        <button class="btn block" data-close>Просто полежать 😶</button>
      </div>
      <div class="fine">Корпорация желает скорейшего возвращения в строй. Твои задачи никуда не денутся 💜</div>`, { sound: "error" });
    FX.haptic && FX.haptic([40, 60, 40, 60, 120]);
  }
  function maybeBurnModal() {
    const b = B();
    if (!b.burnModal || document.hidden || document.querySelector(".modal")) return;
    b.burnModal = false;
    Vibe.state.set({ body: b });
    setTimeout(showBurnModal, 400);
  }

  /* ---------- Качество сна зависит от жилья ---------- */
  function sleepQuality(b = B()) {
    const s = S();
    const h = Object.assign({}, s.home || {});
    if (h.baseRent != null) h.rent = h.baseRent;
    let q, why, e;
    if (h.own) { q = 0.95; why = "Своя квартира. Тишина, никто не стучит в стену"; e = "🏡"; }
    else if (!h.rent) { q = 0.5; why = "Диван у мамы. Мама встаёт в 6 утра"; e = "🛋️"; }
    else if (h.rent <= 20000) { q = 0.58; why = "Коммуналка: сосед Валера смотрел сериал до трёх ночи"; e = "🏚️"; }
    else if (h.rent <= 45000) { q = 0.74; why = "Студия: тонкие стены, но жить можно"; e = "🏠"; }
    else if (h.rent <= 90000) { q = 0.86; why = "Нормальная квартира: тихо, темно, хорошо"; e = "🏡"; }
    else { q = 0.97; why = "Шумоизоляция уровня бог. Кровать умнее тебя"; e = "🏰"; }
    if (b.cleanUntil > dayOf(nowMin())) { q += 0.05; why += ". Чистота после уборки помогает"; }
    const invSleep = Vibe.inv ? Vibe.inv.bonus("sleep") : 0;
    if (invSleep) { q += invSleep / 100; why += `. Вещи дома: +${invSleep}% к сну`; }
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
    const stage = stageOf(b);
    v *= STAGES[stage].mult;
    if (b.sleeping) v = 0;
    parts.stress = Math.round(b.stress || 0);
    const note = stage === 3 ? "Больничный по выгоранию: работа на паузе"
      : stage ? `${STAGES[stage].e} ${STAGES[stage].t}: −${Math.round((1 - STAGES[stage].mult) * 100)}% к продуктивности` : "";
    return { value: Math.round(clamp(v, 0, 100)), parts, stage, note };
  }

  function heartRate(b = B()) {
    const sinceWorkout = nowMin() - (b.workoutAt || -9999);
    const workout = sinceWorkout < 60 ? (60 - sinceWorkout) * 0.8 : 0;
    const base = b.sleeping ? 54 : 64;
    return Math.round(base + (100 - b.energy) * 0.08 + (100 - b.mood) * 0.12 + (b.stress || 0) * 0.15 + workout + (b.sick ? 14 : 0));
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
      // Стресс за прошедший день: выходные, переработки, недосып
      const prevDay = b.stepsDay;
      if (b.lastWorkDay === prevDay) {
        b.workStreak = (b.workStreak || 0) + 1;
        if (b.workStreak > 5) addStress(b, 3 * (b.workStreak - 5), `${b.workStreak} дней без выходных`, "📆");
      } else {
        b.workStreak = 0;
        if (!b.leave) addStress(b, -6, "День без работы", "🛋️");
      }
      if (lastSleep && lastSleep.day < prevDay) addStress(b, 6, "Ночь без нормального сна", "🌚");
      else if (lastSleep && lastSleep.hours < 6) addStress(b, (6 - lastSleep.hours) * 2, `Недосып: ${lastSleep.hours} ч`, "🥱");
      b.stressLog = [...(b.stressLog || []), { day: prevDay, v: Math.round(b.stress || 0) }].slice(-7);
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
    let autoNight = 0, autoMeals = 0, autoFood = 0, autoWork = 0;
    const AUTO_SNACK = 120, AUTO_METRO = 122; // перекус у дома, метро туда-обратно
    while (m < now) {
      const step = Math.min(60 - (m % 60) || 60, now - m);
      const h = hourOf(m);
      if (dayOf(m) !== b.stepsDay) rollDay(b, dayOf(m));
      // Автопилот: ночью спит дома, днём живёт обычной жизнью
      if (auto) {
        if (isNight(h) && !b.sleeping && b.energy < 95) { startSleep(b, m, true); autoNight++; }
        if (!isNight(h) && b.sleeping && b.sleeping.auto && (b.energy >= 95 || h >= 9 || (h >= 7 && b.energy >= 70))) endSleep(b, m);
        // ест по расписанию, а если проспал завтрак и проголодался — перекусывает
        if (!b.sleeping && m % 60 === 0 && ([8, 13, 19].includes(h) || (b.food < 20 && h >= 7))) { addMeal(b, b.fridge > 0 ? "cooked" : "basic"); if (b.fridge > 0) b.fridge--; else autoFood += AUTO_SNACK; autoMeals++; }
        // По будням ходит на работу: работу не теряет, но и задачи за тебя никто не делает
        if (job && h === 9 && m % 60 === 0 && dayOf(m) % 7 < 5 && b.autoWorkDay !== dayOf(m) && !b.leave) { b.autoWorkDay = dayOf(m); autoWork++; }
        if (!b.sleeping && job && h >= 8 && h < 20 && dayOf(m) % 7 < 5) b.steps += (step / 60) * 450;
        else if (!b.sleeping) b.steps += (step / 60) * 220;
      } else if (!b.sleeping) b.steps += (step / 60) * 120;
      const k = step / 60;
      if (b.sleeping) {
        b.energy = clamp(b.energy + SLEEP_GAIN * b.sleeping.q * (Vibe.skills ? Vibe.skills.mult("sleep") : 1) * k);
        b.food = clamp(b.food - 1.5 * k);
        if (b.cur) b.cur.mins += step;
        if (b.energy >= 100 && !isNight(h)) { const rec = endSleep(b, m); if (rec && !auto) b.notes.push({ e: "☀️", t: `Ты проснулся. Сон ${rec.hours} ч, качество ${Math.round(rec.q * 100)}%` }); }
      } else {
        b.energy = clamp(b.energy - (b.sick ? DRAIN + 1.5 : DRAIN) * (Vibe.skills ? Vibe.skills.mult("energyDrain") : 1) * k);
        b.food = clamp(b.food - 5 * k);
      }
      // Настроение тянется к базе, голод и усталость его портят
      const stg = stageOf(b);
      const base = 58 + (S().balance < 0 ? -15 : 0) + (Vibe.inv ? Math.min(20, Vibe.inv.bonus("mood")) : 0) - [0, 3, 8, 12][stg];
      b.mood = clamp(b.mood + (base - b.mood) * 0.04 * k - (b.food < 20 ? 3 * k : 0) - (b.energy < 20 ? 3 * k : 0));
      if (b.leave) b.mood = Math.min(b.mood, 45);
      // Стресс: сон и хорошее настроение снимают, голод, усталость и минус на карте копят
      let ds = 0;
      if (b.sleeping) ds -= 1.4 * b.sleeping.q * k;
      else {
        ds -= 0.15 * k;
        if (b.mood > 65) ds -= 0.25 * k;
        if (b.food < 15) ds += 0.8 * k;
        if (b.energy < 15) ds += 0.5 * k;
        if (S().balance < 0) ds += 0.12 * k;
      }
      if (b.leave) ds -= 0.6 * k;
      b.stress = clamp((b.stress == null ? 15 : b.stress) + ds);
      m += step;
    }
    if (dayOf(now) !== b.stepsDay) rollDay(b, dayOf(now));
    b.lastMin = now;
    updateStage(b, b.notes, auto);
    // Предупреждения, пока игрок в приложении
    if (!auto) {
      const was = S().body || {};
      if (b.food < 25 && (was.food ?? 100) >= 25) b.notes.push({ e: "🍽️", t: "Ты проголодался. Сытость 25% — продуктивность падает", go: "eat", label: "Поесть" });
      if (b.energy < 20 && (was.energy ?? 100) >= 20) b.notes.push({ e: "🥱", t: "Глаза слипаются. Пора спать — дома", go: "fit", label: "Спать" });
    } else if (autoNight || autoMeals || autoWork) {
      const last = (b.sleepLog || []).slice(-1)[0];
      if (last && last.auto) b.notes.push({ e: "😴", t: `Пока тебя не было, ты поспал ${last.hours} ч. Качество ${Math.round(last.q * 100)}%` });
      const cost = autoFood + autoWork * AUTO_METRO;
      if (cost && Vibe.game && Vibe.game.tx) {
        const what = [autoFood ? `еда ×${autoFood / AUTO_SNACK}` : "", autoWork ? `метро на работу ×${autoWork}` : ""].filter(Boolean).join(", ");
        Vibe.game.tx(`Автопилот: ${what}`, -cost, "🤖", "c-white");
      }
      if (autoWork && job) {
        Vibe.state.set({ job: Object.assign({}, S().job, { lastTaskDay: Math.max(S().job.lastTaskDay || 0, b.autoWorkDay) }) });
        b.notes.push({ e: "💼", t: `Ты ${autoWork} ${Vibe.game.plural(autoWork, "раз", "раза", "раз")} сходил на работу на автопилоте. Работу сохранил, к повышению не приблизился`, go: "job", label: "Работа" });
      }
    }
    const notes = b.notes; delete b.notes;
    save(b);
    notes.forEach((n, i) => setTimeout(() => FX.toast(n.t, n.e, 3200, n.go ? { go: n.go, label: n.label } : null), 600 + i * 1200));
    maybeBurnModal();
  }

  /* ---------- Воздействия: всё, что делает игрок ---------- */
  const EFFECTS = {
    eat_out: (b) => { const M = addMeal(b, "eat_out"); return `${M.e} Сытость +${M.food}%`; },
    junk: (b) => { const M = addMeal(b, "junk"); b.mood = clamp(b.mood + 4); return `${M.e} Сытость +${M.food}%, питание хуже`; },
    cook: (b) => { if (b.fridge <= 0) return null; b.fridge--; const M = addMeal(b, "cooked"); b.mood = clamp(b.mood + 3); addStress(b, -1); return `${M.e} Сытость +${M.food}%, питание лучше`; },
    healthy: (b) => { const M = addMeal(b, "healthy"); return `${M.e} Сытость +${M.food}%, питание +`; },
    groceries: (b, o) => { const n = clamp(Math.round((o.amount || 800) / 220), 1, 12); /* ~220 ₫ за порцию */ b.fridge = Math.min(20, (b.fridge || 0) + n); return `🧊 В холодильнике +${n} порц.`; },
    coffee: (b) => { b.energy = clamp(b.energy + 10); if (hourOf(nowMin()) >= 17) b.effects.coffeeLate = dayOf(nowMin()); return "☕ Энергия +10%"; },
    walk: (b, o) => { const st = Math.round((o.km || 1) * 1350); b.steps += st; b.energy = clamp(b.energy - 3); b.mood = clamp(b.mood + 4); b.health = clamp(b.health + 0.5); const nice = goodWeather(); addStress(b, nice ? -5 : -2, nice ? "Прогулка в хорошую погоду" : "Прогулка", "🚶"); return `🚶 +${Vibe.fmt(st)} шагов${nice ? ", стресс −5" : ""}`; },
    metro: (b, o) => { const st = Math.round(600 + (o.km || 1) * 200); b.steps += st; b.energy = clamp(b.energy - 2); return `🚇 +${Vibe.fmt(st)} шагов`; },
    taxi: (b) => { b.energy = clamp(b.energy + 2); return "🚕 Сберёг силы"; },
    workout: (b, o) => { const st = 2500 + Math.round((o.score || 0.7) * 2500); b.steps += st; b.energy = clamp(b.energy - 12); b.mood = clamp(b.mood + 10); b.health = clamp(b.health + 2); b.workoutAt = nowMin(); addStress(b, -4, "Тренировка", "🏋️"); return `🏋️ +${Vibe.fmt(st)} шагов, настроение +10`; },
    meditate: (b) => { b.mood = clamp(b.mood + 9); addStress(b, -6, "Медитация / хобби", "🧘"); return "🧘 Настроение +9, стресс −6"; },
    concert: (b) => { b.mood = clamp(b.mood + 25); b.energy = clamp(b.energy - 10); b.steps += 3000; addStress(b, -8, "Концерт", "🎤"); return "🎤 Настроение +25"; },
    music: (b) => { if ((b.effects.music || 0) > nowMin() - 120) return null; b.effects.music = nowMin(); b.mood = clamp(b.mood + 4); addStress(b, -1); return "🎧 Настроение +4"; },
    games: (b) => { if ((b.effects.games || 0) > nowMin() - 120) return null; b.effects.games = nowMin(); b.mood = clamp(b.mood + 4); b.energy = clamp(b.energy - 2); addStress(b, -1); return "🎮 Настроение +4"; },
    date: (b) => { if ((b.effects.date || 0) > nowMin() - 180) return null; b.effects.date = nowMin(); b.mood = clamp(b.mood + 6); addStress(b, -5, "Свидание", "💘"); return "💘 Настроение +6"; },
    shopping: (b) => { b.mood = clamp(b.mood + 3); addStress(b, -1); return "🛍️ Настроение +3 (ненадолго)"; },
    doctor: (b) => { b.health = clamp(b.health + 15); b.sick = false; addStress(b, -2, "Сходил к врачу", "🏥"); return "🏥 Здоровье +15"; },
    pharmacy: (b) => { b.health = clamp(b.health + 5); return "💊 Здоровье +5"; },
    clean: (b) => { b.cleanUntil = dayOf(nowMin()) + 3; b.mood = clamp(b.mood + 8); addStress(b, -3, "Уборка дома", "🫧"); return "🫧 Чисто! Сон лучше 3 дня"; },
    travel: (b) => { b.mood = 100; b.energy = 100; b.health = clamp(b.health + 10); addStress(b, -35, "Путешествие", "🏝️"); return "🏝️ Отдохнул на 100%, стресс −35"; },
    study: (b) => { b.energy = clamp(b.energy - 5); b.mood = clamp(b.mood + 2); return "🎓 Энергия −5"; },
    work: (b) => {
      const m = nowMin(), h = hourOf(m);
      b.energy = clamp(b.energy - 4); b.mood = clamp(b.mood - 1); b.food = clamp(b.food - 3);
      b.lastWorkDay = dayOf(m);
      addStress(b, 2, "Рабочая задача", "💼");
      if (b.energy < 30) addStress(b, 1.5, "Работа на последнем издыхании", "🪫");
      if (h >= 19 || h < 8 || dayOf(m) % 7 >= 5) addStress(b, 2, "Переработка", "🌙");
      if (b.leave) addStress(b, 6, "Работа на больничном", "🚫");
      return null;
    },
    salary: (b) => { b.mood = clamp(b.mood + 15); addStress(b, -6, "Пришла зарплата", "💸"); return null; },
    bill: (b) => { b.mood = clamp(b.mood - 4); addStress(b, 3, "Счета и списания", "🧾"); return null; },
    social: (b) => { b.mood = clamp(b.mood + 10); b.energy = clamp(b.energy - 4); addStress(b, -6, "Встреча с близкими", "🫂"); return "🫂 Встреча с близкими: настроение +10"; },
    mom: (b) => { b.mood = clamp(b.mood + 6); addStress(b, -3, "Разговор с мамой", "📞"); return "📞 Поговорил с мамой. Настроение +6"; },
    // ---- Стресс и выгорание ----
    // Сессия с психологом. opts.power: 0.2 (коуч-позитивщик) … 1,3 (очно в клинике)
    therapy: (b, o) => {
      const p = o.power == null ? 1 : o.power;
      const recent = (b.effects.therapy || -9999) > nowMin() - 720;
      const d = -Math.round(18 * p * (recent ? 0.5 : 1)) - (b.leave ? 6 : 0);
      b.effects.therapy = nowMin();
      b.mood = clamp(b.mood + Math.round(6 * p));
      addStress(b, d, o.why || "Сессия с психологом", "🛋️");
      return `🛋️ Стресс ${d}, настроение +${Math.round(6 * p)}${recent ? " (вторая сессия за полдня работает слабее)" : ""}`;
    },
    // Настоящий выходной: без работы и без телефона
    rest_day: (b, o) => {
      const recent = (b.effects.rest || -9999) > nowMin() - 720;
      b.effects.rest = nowMin();
      const d = recent ? -4 : -(o.d || 15);
      b.mood = clamp(b.mood + (recent ? 2 : 8)); b.energy = clamp(b.energy + (recent ? 0 : 10));
      addStress(b, d, o.why || "Выходной без телефона", "📵");
      return `📵 Отдых: стресс ${d}${recent ? "" : ", энергия +10"}`;
    },
    breathe: (b, o) => {
      if ((b.effects.breathe || -9999) > nowMin() - 30) { addStress(b, -1); return "🌬️ Ещё подышал. Стресс −1"; }
      b.effects.breathe = nowMin();
      const d = -Math.round(5 * (o.power || 1));
      b.mood = clamp(b.mood + 2); addStress(b, d, "Дыхание 4-7-8", "🌬️");
      return `🌬️ Стресс ${d}`;
    },
    journal: (b) => {
      const recent = (b.effects.journal || -9999) > nowMin() - 360;
      b.effects.journal = nowMin();
      const d = recent ? -1 : -4;
      addStress(b, d, "Дневник", "📓");
      return `📓 Записал — стало легче. Стресс ${d}`;
    },
    // Универсальный: effect("stress", { d: +4, why: "Опоздал", e: "⏰" })
    stress: (b, o) => { addStress(b, o.d || 0, o.why, o.e); return null; },
  };
  function effect(kind, opts = {}) {
    if (!S().profile || !EFFECTS[kind]) return;
    Vibe.emit && Vibe.emit("body", { kind, opts });
    tick();
    const b = B();
    const msg = EFFECTS[kind](b, opts);
    const notes = [];
    updateStage(b, notes, false);
    save(b);
    if (msg && !opts.quiet) setTimeout(() => FX.toast(msg, "⌚", 2200), 900);
    notes.forEach((n, i) => setTimeout(() => FX.toast(n.t, n.e, 3200, n.go ? { go: n.go, label: n.label } : null), 1800 + i * 1200));
    maybeBurnModal();
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

  /* ---------- Стресс: публичное API ---------- */
  function stressInfo(b = B()) {
    const stage = stageOf(b);
    const left = b.leave ? Math.max(0, b.leave.until - nowMin()) : 0;
    return {
      value: Math.round(b.stress || 0), stage, label: STAGES[stage].t, e: STAGES[stage].e, col: STAGES[stage].col,
      mult: STAGES[stage].mult, leave: b.leave, leftMin: left, burnedOut: !!b.leave,
      next: stage < 3 ? UP[stage] : null, why: (b.stressWhy || []).slice().reverse(), log: b.stressLog || [], streak: b.workStreak || 0,
    };
  }
  // Изменить стресс извне: Vibe.body.addStress(+4, "Опоздал на работу", "⏰")
  function addStressPub(d, why, e) { effect("stress", { d, why, e, quiet: true }); }

  // Чужие события, которые бьют по нервам (если их кто-то эмитит)
  if (Vibe.on) {
    Vibe.on("late", (d) => addStressPub(4, (d && d.title) ? `Опоздание: ${d.title}` : "Опоздание", "⏰"));
    Vibe.on("conflict", (d) => addStressPub((d && d.d) || 5, (d && d.why) || "Конфликт", "⚡"));
  }

  Vibe.body = {
    get: B, tick, effect, sleep, wake, atHome, sleepQuality, productivity, heartRate,
    on: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    STEP_GOAL, isNight,
    // стресс и выгорание
    stress: stressInfo, addStress: addStressPub, burnedOut: () => !!B().leave, STAGES, showBurnout: showBurnModal,
  };
})();
