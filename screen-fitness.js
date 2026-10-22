/* ============================================================
   Vibe Фитнес — абонементы-подписки, зал на карте, тренировки.
   Экран «fitness». Зал: Vibe Gym в парке «Без вайфая» (place "park").
   • Абонемент = Vibe.subs (id "gym"): «Утренний», «Безлимит», «Премиум с бассейном».
     Или год сразу (выгодно! если ходить).
   • Тренировка только в зале: запись на групповое занятие → Vibe.sched (kind "sport"),
     или «Я уже в зале» → ритм-игра → Vibe.body.effect("workout", {score}).
   • Форма: state.ft_form 0–100, тает без визитов, чуть поднимает внешность
     (обёртка Vibe.inv.look, без предметов). API: Vibe.fitness.form() и др.
   • Состояние: state.ft = { plan, annualUntil, visits[], lv, loss, streak, best,
     lastWorkMin, freeTrainerMonth, jar, freezeTries, mailWeek }
   ============================================================ */
(function () {
  const V = Vibe;
  const S = () => V.state.get();
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const G = () => V.game;
  const today = () => (G() && S().game ? G().info().day : 0);
  const nowMin = () => (G() && S().game ? G().minutes() : 0);
  const hourNow = () => (G() && S().game ? G().info().hour : 12);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const ft = () => S().ft || {};
  const setFt = (p) => V.state.set({ ft: Object.assign({}, ft(), p) });
  const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const hh = (h) => `${String(h).padStart(2, "0")}:00`;

  const GYM = "park";
  const OPEN = 6, CLOSE = 23;
  const SINGLE = 690;
  const TRAINER_PRICE = 2500;
  const WORK_CD = 90; // игровых минут между тренировками
  const gymLabel = () => { const p = V.map && V.map.place(GYM); return `Vibe Gym в парке${p && p.label ? ` «${p.label.replace(/^Парк\s*/, "").replace(/[«»]/g, "")}»` : ""}`; };

  const PLANS = {
    morning: { id: "morning", n: "Утренний", price: 1900, e: "🌅", c: "c-yellow", from: 6, to: 12, perks: ["Зал с 6:00 до 12:00", "Душ (тёплый по чётным)", "Мотивация на рассвете"] },
    unlim: { id: "unlim", n: "Безлимит", price: 3900, e: "♾️", c: "c-lime", from: OPEN, to: CLOSE, perks: ["Зал с 6:00 до 23:00", "Все групповые занятия", "Шкафчик с замком*"] },
    premium: { id: "premium", n: "Премиум с бассейном", price: 7900, e: "🏊", c: "c-sky", from: OPEN, to: CLOSE, pool: true, perks: ["Всё из «Безлимита»", "Бассейн (вода включена)", "1 тренировка с Эдуардом в месяц", "Полотенце. Своё. Навсегда"] },
  };
  const ANNUAL_K = 0.75; // год = 12 мес × 0,75

  const PROGS = {
    strength: { n: "Силовая", e: "🏋️", c: "c-orange", iv: 720, cnt: 16, form: 1.2, line: "Жми на такт. Штанга не ждёт" },
    cardio: { n: "Кардио", e: "🏃", c: "c-pink", iv: 440, cnt: 24, form: 1.0, line: "Быстро! Дорожка уже везёт тебя на работу" },
    yoga: { n: "Йога", e: "🧘", c: "c-mint", iv: 1050, cnt: 12, form: 0.8, line: "Медленно. Дыши. Не думай про дедлайн" },
    stretch: { n: "Растяжка", e: "🤸", c: "c-lilac", iv: 860, cnt: 14, form: 0.9, line: "Тянись к мечте. Она чуть дальше носка" },
    pool: { n: "Бассейн", e: "🏊", c: "c-sky", iv: 620, cnt: 18, form: 1.1, pool: true, line: "Греби. Хлорка — это тоже ароматерапия" },
  };

  // Групповые занятия по дням недели (day % 7: 0 = Пн)
  const CLASSES = [
    { d: 0, h: 7, t: "Зумба для выгоревших", e: "💃" },
    { d: 0, h: 19, t: "Кроссфит-тимбилдинг", e: "🤼" },
    { d: 1, h: 8, t: "Йога «Отпусти KPI»", e: "🧘" },
    { d: 1, h: 20, t: "Сайкл под корпоративный гимн", e: "🚴" },
    { d: 2, h: 7, t: "Пилатес до планёрки", e: "🤸" },
    { d: 2, h: 19, t: "Бокс с грушей «Начальник»", e: "🥊" },
    { d: 3, h: 9, t: "Растяжка сроков", e: "🧘‍♀️" },
    { d: 3, h: 20, t: "Функционалка «Многозадачность»", e: "🏋️" },
    { d: 4, h: 8, t: "Степ «Карьерная лестница»", e: "🪜" },
    { d: 4, h: 18, t: "Пятничный HIIT «Скорее бы выходные»", e: "🔥" },
    { d: 5, h: 11, t: "Аквааэробика «Держись на плаву»", e: "🏊", pool: true },
    { d: 5, h: 14, t: "Табата «Без телефона» (тяжело)", e: "📵" },
    { d: 6, h: 10, t: "Йога-нидра «Поспать за деньги»", e: "😴" },
    { d: 6, h: 16, t: "Воскресный бег «От понедельника»", e: "🏃" },
  ];

  const TRAINER = { n: "Эдуард «Ещё подход» Мышкин", e: "💪", short: "Эдуард" };
  const T_LINES = [
    "Боль — это просто слабость, которая покидает кошелёк. То есть тело!",
    "Ещё подход! Нет, это не последний. Последний был в прошлом году",
    "Ты не {устал|устала}. Ты просто ещё не купил мой марафон",
    "Дыши! Вдох — бесплатно, выдох — по абонементу",
    "Чувствуешь, как работает мышца? Это мышца ответственности",
    "Красавчик! Я так говорю всем, но тебе — искренне. Почти",
    "Не сдавайся! Сдаваться можно только в аренду — в нашем шкафчике",
  ];

  const SHOP = [
    { id: "shake", n: "Протеиновый шейк «Банан-кредит»", e: "🥤", price: 390, d: "30 г белка и 0 г смысла спорить", bar: true, fx: "healthy" },
    { id: "bar", n: "Батончик «Ни грамма сахара*»", e: "🍫", price: 190, d: "*кроме сахара", bar: true, fx: "junk" },
    { id: "iso", n: "Изотоник «Пот корпорации»", e: "🧃", price: 250, d: "Энергия +10. Вкус — офисный кулер", bar: true, fx: "coffee" },
    { id: "jar", n: "Сывороточный протеин, 2 кг", e: "🫙", price: 2900, d: "20 порций: +1 к форме после каждой тренировки", bar: false },
  ];

  /* ================= Логика ================= */
  const plan = () => {
    const f = ft();
    if (!f.plan || !PLANS[f.plan]) return null;
    if (f.annualUntil != null) return f.annualUntil >= today() ? PLANS[f.plan] : null;
    return V.subs && V.subs.has("gym") ? PLANS[f.plan] : null;
  };
  const monthlyCost = () => { const p = plan(); if (!p) return 0; return ft().annualUntil != null ? Math.round(p.price * ANNUAL_K) : p.price; };
  const atGym = () => S().fz_lastPos === GYM && !(V.trip && V.trip.current());
  const gymOpen = (h = hourNow()) => h >= OPEN && h < CLOSE;
  const access = (h = hourNow()) => { const p = plan(); return !!p && h >= p.from && h < p.to; };
  const visits = () => ft().visits || [];
  const monthOf = (d) => Math.floor(d / 30);
  const visitsMonth = () => visits().filter((v) => monthOf(v.d) === monthOf(today())).length;
  const costPerVisit = () => { const c = monthlyCost(); return c ? Math.round(c / Math.max(1, visitsMonth())) : 0; };
  const visitedToday = () => visits().some((v) => v.d === today());

  // Форма: тает на 2 в день начиная со второго дня без визита
  function pendingLoss() {
    const f = ft();
    if (f.lv == null) return 0;
    const since = today() - f.lv;
    return Math.max(0, 2 * Math.max(0, since - 1) - (f.loss || 0));
  }
  const storedForm = () => (S().ft_form == null ? 10 : S().ft_form);
  const form = () => clamp(Math.round(storedForm() - pendingLoss()));
  function commitDecay() {
    const l = pendingLoss();
    if (l <= 0) return;
    V.state.set({ ft_form: clamp(storedForm() - l) });
    setFt({ loss: (ft().loss || 0) + l });
  }
  const lookBonus = () => Math.round(form() / 12); // до +8 к внешности
  const formTitle = (f) => f >= 85 ? "Греческая статуя 🏛️" : f >= 65 ? "В форме 💪" : f >= 45 ? "Бодрый офисный 🙂" : f >= 25 ? "Мягкий стартап 🥐" : "Диванный режим 🛋️";

  // Внешность чуть выше от формы — без предметов в инвентаре
  if (V.inv && !V.inv.__ftLook) {
    const base = V.inv.look;
    V.inv.look = function () { return clamp(base.apply(this, arguments) + lookBonus()); };
    V.inv.__ftLook = true;
  }

  function recordVisit(kind, gain) {
    commitDecay();
    const f = ft();
    const d = today();
    let streak = f.streak || 0;
    if (f.lv == null || f.lv < d) streak = f.lv != null && d - f.lv <= 2 ? streak + 1 : 1;
    const jarUse = (f.jar || 0) > 0 ? 1 : 0;
    const nf = clamp(storedForm() + gain + jarUse);
    V.state.set({ ft_form: nf });
    setFt({ visits: [...visits(), { d, k: kind }].slice(-120), lv: d, loss: 0, streak, best: Math.max(f.best || 0, streak), lastWorkMin: nowMin(), jar: Math.max(0, (f.jar || 0) - jarUse) });
    if (jarUse) setTimeout(() => FX.toast("Порция протеина из банки: форма +1", "🫙", 2000), 1600);
    V.emit("fitness", { kind, form: nf, streak });
    if (V.game && V.game.track) V.game.track("workout");
    return { form: nf, streak };
  }

  // Посещение группового занятия / тренера по расписанию (мир сам даёт workout)
  if (V.sched && V.sched.on) {
    V.sched.on("sport", (e) => {
      if (!e || !e.fitness) return;
      const gain = e.trainer ? 9 : 6;
      const r = recordVisit(e.trainer ? "trainer" : "class", gain);
      if (V.skills && V.skills.xp) V.skills.xp("health", e.trainer ? 30 : 18, { quiet: true });
      setTimeout(() => FX.toast(`${e.e} ${e.title.replace("Vibe Gym · ", "")}: форма +${gain} (${r.form}/100) · серия ${r.streak} 🔥`, "🏋️", 3200), 1400);
      if (e.trainer) setTimeout(() => FX.toast(`${TRAINER.short}: «${pick(T_LINES)}»`, "💪", 3600), 4800);
    });
    V.sched.on("sport:missed", (e) => {
      if (!e || !e.fitness) return;
      const c = costPerVisit();
      setTimeout(() => FX.toast(`Пропустил «${e.title.replace("Vibe Gym · ", "")}». Стоимость одного визита: ${V.rub(c || PLANS.unlim.price)}`, "💸", 4200), 600);
    });
  }

  V.fitness = {
    form, lookBonus, plan, visits, visitsMonth, costPerVisit, atGym, place: GYM,
    streak: () => ft().streak || 0,
  };

  /* ================= Стили ================= */
  if (!document.getElementById("ftn-style")) {
    const st = document.createElement("style");
    st.id = "ftn-style";
    st.textContent = `
      .ftn-loc { display:flex; gap:12px; align-items:center; }
      .ftn-loc .ic { width:54px; height:54px; border-radius:18px; border:var(--line); display:grid; place-items:center; font-size:28px; flex:0 0 auto; }
      .ftn-loc b { display:block; font-size:15px; font-weight:900; }
      .ftn-loc small { font-size:12px; font-weight:700; color:var(--muted); }
      .ftn-row { display:flex; gap:8px; margin-top:12px; }
      .ftn-row .btn { flex:1; padding:0 10px; white-space:nowrap; }
      .ftn-stat { text-align:center; padding:12px 6px; }
      .ftn-stat .big-num { font-size:30px; }
      .ftn-stat small { display:block; font-size:11px; font-weight:800; color:var(--muted); margin-top:2px; }
      .ftn-bar { height:12px; border:2px solid var(--ink); border-radius:99px; background:#fff; overflow:hidden; margin-top:8px; }
      .ftn-bar i { display:block; height:100%; background:var(--lime); border-right:2px solid var(--ink); transition:width .6s var(--spring); }
      .ftn-cost { display:flex; align-items:center; gap:12px; }
      .ftn-cost .big-num { font-size:34px; }
      .ftn-plan { display:flex; flex-direction:column; gap:8px; }
      .ftn-plan-top { display:flex; align-items:center; gap:10px; }
      .ftn-plan-top .e { font-size:34px; }
      .ftn-plan-top b { font-family:var(--font-display); font-weight:400; font-size:22px; line-height:1; flex:1; }
      .ftn-plan ul { margin:0; padding-left:18px; font-size:13px; font-weight:700; }
      .ftn-plan .btns { display:flex; gap:8px; }
      .ftn-plan .btns .btn { flex:1; padding:0 8px; font-size:13px; height:44px; white-space:nowrap; }
      .ftn-progs { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .ftn-prog { text-align:left; padding:14px; display:flex; flex-direction:column; gap:4px; min-height:104px; }
      .ftn-prog .e { font-size:32px; }
      .ftn-prog b { font-size:16px; font-weight:900; }
      .ftn-prog small { font-size:11px; font-weight:700; opacity:.8; }
      .ftn-cls { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:2px dashed rgba(14,14,18,.12); }
      .ftn-cls:last-child { border-bottom:0; }
      .ftn-cls .when { width:52px; flex:0 0 auto; text-align:center; font-weight:900; font-size:12px; line-height:1.1; }
      .ftn-cls .when b { display:block; font-family:var(--font-display); font-weight:400; font-size:18px; }
      .ftn-cls .tx { flex:1; min-width:0; font-weight:800; font-size:13px; }
      .ftn-cls .tx small { display:block; color:var(--muted); font-size:11px; }
      .ftn-cls .btn { height:36px; padding:0 12px; font-size:12px; flex:0 0 auto; }
      .ftn-trainer { display:flex; gap:12px; align-items:flex-start; }
      .ftn-trainer .ava { width:64px; height:64px; border-radius:50%; border:var(--line); display:grid; place-items:center; font-size:36px; background:var(--orange); flex:0 0 auto; }
      .ftn-quote { font-weight:800; font-size:13px; font-style:italic; margin-top:6px; }
      .ftn-shop { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:2px dashed rgba(14,14,18,.12); }
      .ftn-shop:last-child { border-bottom:0; }
      .ftn-shop .e { font-size:30px; width:40px; text-align:center; flex:0 0 auto; }
      .ftn-shop .tx { flex:1; min-width:0; }
      .ftn-shop .tx b { display:block; font-size:13px; font-weight:900; }
      .ftn-shop .tx small { color:var(--muted); font-size:11px; font-weight:700; }
      .ftn-shop .btn { height:38px; padding:0 12px; font-size:13px; flex:0 0 auto; }
      .ftn-lane { position:relative; height:290px; border:var(--line); border-radius:22px; overflow:hidden; background:repeating-linear-gradient(0deg, #fff 0 28px, #f5f1e4 28px 30px); touch-action:manipulation; user-select:none; -webkit-user-select:none; }
      .ftn-hit { position:absolute; left:10px; right:10px; height:56px; bottom:22px; border:3px dashed var(--ink); border-radius:16px; background:rgba(198,255,77,.35); }
      .ftn-note { position:absolute; left:50%; top:0; width:58px; height:58px; margin-left:-29px; margin-top:-29px; border-radius:50%; border:var(--line); background:var(--yellow); display:grid; place-items:center; font-size:28px; box-shadow:0 3px 0 var(--ink); will-change:transform; }
      .ftn-note.hit { background:var(--lime); animation:ftn-pop .3s ease-out forwards; }
      .ftn-note.miss { background:var(--coral); opacity:.5; }
      @keyframes ftn-pop { to { transform:scale(1.8); opacity:0; } }
      .ftn-judge { position:absolute; left:0; right:0; top:38%; text-align:center; font-family:var(--font-display); font-size:34px; pointer-events:none; text-shadow:2px 2px 0 #fff; }
      .ftn-judge.go { animation:ftn-judge .5s ease-out both; }
      @keyframes ftn-judge { from { transform:scale(.6); opacity:0; } 40% { transform:scale(1.15); opacity:1; } to { transform:scale(1); opacity:0; } }
      .ftn-hud { display:flex; justify-content:space-between; align-items:center; font-weight:900; margin:10px 2px; font-size:14px; }
      .ftn-tap { height:74px; font-size:22px; margin-top:12px; touch-action:manipulation; }
      .ftn-cd { position:absolute; inset:0; display:grid; place-items:center; font-family:var(--font-display); font-size:90px; pointer-events:none; }
      .ftn-res { text-align:center; }
      .ftn-res .m-emo { font-size:70px; }
      .ftn-chk { display:flex; gap:10px; align-items:center; font-weight:800; font-size:13px; padding:8px 0; text-align:left; }
      .ftn-chk span { font-size:20px; }
    `;
    document.head.appendChild(st);
  }

  /* ================= Мини-игра: ритм-тренировка ================= */
  let activeClose = null;
  function playWorkout(progId, { trainer = false, onDone } = {}) {
    const P = PROGS[progId];
    const TRAVEL = 1500, PERFECT = 70, GOOD = 160;
    let raf = 0, t0 = 0, done = false, started = false;
    let perfect = 0, good = 0, miss = 0, combo = 0, maxCombo = 0;
    const timers = [];
    const notes = Array.from({ length: P.cnt }, (_, i) => ({ t: 400 + i * P.iv + (progId === "cardio" && i % 4 === 3 ? -P.iv * 0.5 : 0), el: null, st: 0 }));
    const endAt = notes[notes.length - 1].t + GOOD + 500;
    const close = V.ui.sheet(`
      <div class="display" style="font-size:26px">${P.e} ${P.n}${trainer ? ` · с ${TRAINER.short}` : ""}</div>
      <div class="muted" style="font-weight:700;font-size:13px;margin-top:4px">${P.line}. Жми, когда круг в зелёной зоне</div>
      <div class="ftn-hud"><span data-rep>Повтор 0/${P.cnt}</span><span data-combo>Комбо ×0</span></div>
      <div class="ftn-lane" data-lane><div class="ftn-hit"></div><div class="ftn-judge" data-judge></div><div class="ftn-cd" data-cd>3</div></div>
      <button class="btn black xl block ftn-tap" data-tap>${P.e} ЖМИ!</button>
      ${trainer ? `<div class="card tight c-orange" style="margin-top:12px;font-weight:800;font-size:13px" data-tq>${TRAINER.e} «${pick(T_LINES)}»</div>` : ""}
      <div class="fine">Пульс, пот и ваши персональные данные синхронизируются с Vibe Fit автоматически.</div>`, {
      onMount(sh) {
        const lane = sh.querySelector("[data-lane]");
        const judgeEl = sh.querySelector("[data-judge]");
        const repEl = sh.querySelector("[data-rep]");
        const comboEl = sh.querySelector("[data-combo]");
        const cdEl = sh.querySelector("[data-cd]");
        const tq = sh.querySelector("[data-tq]");
        const H = lane.clientHeight || 290;
        const hitY = H - 50;
        const judge = (txt, col) => { judgeEl.textContent = txt; judgeEl.style.color = col; judgeEl.classList.remove("go"); void judgeEl.offsetWidth; judgeEl.classList.add("go"); };
        const hud = () => { repEl.textContent = `Повтор ${perfect + good}/${P.cnt}`; comboEl.textContent = `Комбо ×${combo}`; };
        [2, 1].forEach((n, i) => timers.push(setTimeout(() => { cdEl.textContent = n; FX.bump && FX.bump(cdEl); }, 600 * (i + 1))));
        timers.push(setTimeout(() => { cdEl.textContent = ""; started = true; t0 = performance.now(); raf = requestAnimationFrame(loop); }, 1800));
        function loop(now) {
          if (done) return;
          const el = now - t0;
          for (const n of notes) {
            const dt = el - n.t;
            if (dt < -TRAVEL) continue;
            if (!n.el && n.st === 0) { n.el = document.createElement("div"); n.el.className = "ftn-note"; n.el.textContent = P.e; lane.appendChild(n.el); }
            if (n.st === 0 && dt > GOOD) {
              n.st = 2; miss++; combo = 0; hud(); judge("мимо", "var(--coral)");
              if (n.el) n.el.classList.add("miss");
            }
            if (n.el && n.st !== 1) {
              const y = hitY * (1 + dt / TRAVEL);
              n.el.style.transform = `translateY(${y}px)`;
              if (y > H + 40) { n.el.remove(); n.el = null; }
            }
          }
          if (el > endAt) return finish();
          raf = requestAnimationFrame(loop);
        }
        function tap(e) {
          e.preventDefault();
          if (!started || done) return;
          const el = performance.now() - t0;
          let best = null, bd = 1e9;
          for (const n of notes) { if (n.st !== 0) continue; const d = Math.abs(el - n.t); if (d < bd) { bd = d; best = n; } }
          if (!best || bd > GOOD) { combo = 0; hud(); judge("рано 🙃", "var(--muted)"); FX.haptic && FX.haptic(5); return; }
          best.st = 1;
          if (best.el) { best.el.style.transform = `translateY(${hitY}px)`; best.el.classList.add("hit"); const x = best.el; timers.push(setTimeout(() => x.remove(), 320)); best.el = null; }
          combo++; maxCombo = Math.max(maxCombo, combo);
          if (bd <= PERFECT) { perfect++; judge(combo >= 5 ? `ИДЕАЛЬНО ×${combo}` : "ИДЕАЛЬНО", "var(--violet)"); FX.burst(FX.pt(lane.querySelector(".ftn-hit")), { emojis: ["💪", "✨", "🔥", P.e], count: 8, spread: 90 }); }
          else { good++; judge("норм", "var(--blue)"); }
          FX.sound.tap && FX.sound.tap();
          FX.haptic && FX.haptic(10);
          hud();
          if (tq && combo > 0 && combo % 6 === 0) { tq.textContent = `${TRAINER.e} «${pick(T_LINES)}»`; FX.bump && FX.bump(tq); }
        }
        const btn = sh.querySelector("[data-tap]");
        btn.addEventListener("pointerdown", tap);
        lane.addEventListener("pointerdown", tap);
        function finish() {
          if (done) return;
          done = true;
          cancelAnimationFrame(raf);
          const score = Math.round(((perfect + good * 0.6) / P.cnt) * 100) / 100;
          const res = onDone ? onDone({ score, perfect, good, miss, maxCombo }) : null;
          const grade = score >= 0.9 ? ["🏆", "Легенда зала"] : score >= 0.7 ? ["💪", "Мощно!"] : score >= 0.45 ? ["🙂", "Засчитано"] : ["🫠", "Главное — пришёл"];
          sh.innerHTML = `<div class="grab"></div><div class="ftn-res stagger">
            <div class="m-emo float">${grade[0]}</div>
            <div class="display" style="font-size:30px">${grade[1]}</div>
            <div class="grid3" style="margin:14px 0">
              <div class="card tight c-lime ftn-stat"><div class="big-num">${perfect}</div><small>идеально</small></div>
              <div class="card tight c-sky ftn-stat"><div class="big-num">${good}</div><small>норм</small></div>
              <div class="card tight c-coral ftn-stat"><div class="big-num">${miss}</div><small>мимо</small></div>
            </div>
            <div class="card tight" style="font-weight:800;font-size:14px;text-align:left">
              Результат ${Math.round(score * 100)}% · макс. комбо ×${maxCombo}<br>
              ${res ? `Форма +${res.gain} → ${res.form}/100 · серия ${res.streak} 🔥` : ""}
            </div>
            ${res && score >= 0.7 && V.gram && V.gram.post ? `<button class="btn pink block" data-selfie style="margin-top:12px">📸 Селфи в зеркале зала</button>` : ""}
            <button class="btn black block" data-close style="margin-top:10px">Готово 💦</button>
            <div class="fine">${pick(["Сожжено калорий: примерно один капучино. Не благодари.", "Тренировка засчитана. Абонемент доволен. Ты — тоже, наверное.", "Мышцы растут во сне. Сон продаётся отдельно в Vibe Fit."])}</div>
          </div>`;
          sh.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
          if (score >= 0.7) FX.confetti({ count: 90 });
          FX.sound.success();
          const sf = sh.querySelector("[data-selfie]");
          if (sf) sf.addEventListener("click", (e) => {
            V.gram.post({ e: P.e, text: pick(["Без боли нет роста 💪 #vibegym", "Ещё подход — ещё лайк 🏋️", "Пришёл, увидел, сфоткался в зеркале 🤳", "Ноги, спина, контент ✨"]), kind: "gym", from: e.currentTarget });
            sf.disabled = true; sf.textContent = "✅ Выложено. Это 80% тренировки";
            FX.sound.like(); FX.burst(e.currentTarget, { emojis: ["❤️", "🔥", "💪"], count: 10 });
          });
        }
      },
      onClose() {
        const wasDone = done;
        done = true;
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        activeClose = null;
        if (!wasDone && started) setTimeout(() => FX.toast("Ушёл с тренировки. Абонемент визит засчитал. Тебе — нет", "🚪", 3000), 300);
      },
    });
    activeClose = close;
  }

  /* ================= Действия ================= */
  function canTrain(from) {
    if (V.body && V.body.get().sleeping) { FX.toast("Ты спишь. Тренировка во сне — это к «Йоге-нидре»", "😴"); return false; }
    if (!atGym()) {
      FX.shake(from); FX.toast(`Сначала доберись до зала: ${gymLabel()}`, "📍", 2800, { go: "maps", label: "Маршрут" });
      return false;
    }
    if (!gymOpen()) { FX.toast(`Зал открыт ${hh(OPEN)}–${hh(CLOSE)}. Охранник Гена не пускает`, "🔒", 2800); return false; }
    const last = ft().lastWorkMin;
    if (last != null && nowMin() - last < WORK_CD) { FX.toast(`Мышцам нужен отдых ещё ${Math.ceil(WORK_CD - (nowMin() - last))} мин. Сходи за шейком`, "🥤", 2800); return false; }
    if (V.body && V.body.get().energy < 15) { FX.toast("Энергии меньше 15%. Ты не тренируешься — ты выживаешь", "🪫", 2800); return false; }
    return true;
  }

  function finishWorkout(progId, r, { trainer = false } = {}) {
    const P = PROGS[progId];
    const gain = Math.max(1, Math.round((3 + 6 * r.score) * P.form * (trainer ? 1.5 : 1)));
    if (V.body) {
      V.body.effect("workout", { score: r.score });
      if (progId === "yoga") V.body.effect("meditate", { quiet: true });
    }
    if (V.skills && V.skills.xp) V.skills.xp("health", Math.round((8 + r.score * 17) * (trainer ? 1.5 : 1)), { quiet: true });
    const v = recordVisit(progId, gain);
    V.reward({ vibiki: Math.round(5 + r.score * 15), xp: Math.round(10 + r.score * 20) });
    return { gain, form: v.form, streak: v.streak };
  }

  function startWorkout(progId, from, refresh) {
    if (!canTrain(from)) return;
    const P = PROGS[progId];
    if (P.pool && !(plan() && plan().pool)) { FX.shake(from); FX.toast("Бассейн — только в «Премиуме». Вода тоже по подписке", "🏊", 2800); return; }
    const go = () => playWorkout(progId, { onDone: (r) => { const x = finishWorkout(progId, r); refresh(); return x; } });
    if (access()) return go();
    const p = plan();
    V.modal(`
      <div class="m-emo wobble">🎟️</div>
      <div class="display" style="font-size:24px">${p ? `«${p.n}» сейчас не действует` : "Нет абонемента"}</div>
      <p>${p ? `Твой тариф работает ${hh(p.from)}–${hh(p.to)}. Сейчас ${G() ? G().info().time : ""}.` : "Можно купить разовый визит. Или сразу год — так выгоднее (если ходить)."}</p>
      <button class="btn black block" data-one>Разовый визит · ${V.rub(SINGLE)}</button>
      <button class="btn block" data-close style="margin-top:10px">${p ? "Приду утром" : "Посмотреть абонементы"}</button>
      <div class="fine">Разовый визит не даёт права на шкафчик, душ и уважение администратора.</div>`, {
      sound: "pop",
      onMount(m, close) {
        m.querySelector("[data-one]").addEventListener("click", (e) => {
          if (!V.pay(SINGLE, { title: "Vibe Фитнес · разовый визит", emoji: "🎟️", col: "c-orange", from: e.currentTarget })) return;
          close(); setTimeout(go, 260);
        });
      },
    });
  }

  function buyPlan(id, annual, from, refresh) {
    const P = PLANS[id];
    const cur = plan();
    if (cur && ft().annualUntil != null && ft().annualUntil >= today()) { FX.toast("У тебя годовой. Он тебя ждёт. Каждый день. Молча", "🗓️", 2800); return; }
    const amount = annual ? Math.round(P.price * 12 * ANNUAL_K) : P.price;
    if (!V.pay(amount, { title: `Vibe Фитнес · «${P.n}»${annual ? " на год" : ""}`, emoji: P.e, col: P.c, from })) return;
    if (V.subs) V.subs.remove("gym");
    if (annual) setFt({ plan: id, annualUntil: today() + 360, since: today() });
    else {
      if (V.subs) V.subs.add({ id: "gym", name: `Vibe Фитнес «${P.n}»`, e: "🏋️", price: P.price, note: gymLabel() });
      setFt({ plan: id, annualUntil: null, since: today() });
    }
    FX.confetti();
    V.modal(`
      <div class="m-emo float">${P.e}</div>
      <div class="display">Добро пожаловать в семью Vibe Gym!</div>
      <p>${annual ? "Год здоровья оплачен! 92% наших клиентов ходят целых 2 раза. Ты будешь третьим?" : "Абонемент продлевается сам. Как и твоё желание начать с понедельника."}</p>
      <button class="btn black block" data-close>${pick(["Начну с понедельника 💪", "Иду прямо сейчас (завтра)", "Я уже чувствую пресс"])}</button>`);
    if (V.mail && V.mail.send) V.mail.send({ from: "Vibe Фитнес", subject: `Твой абонемент «${P.n}» активирован 🏋️`, body: `Привет, чемпион! Ты теперь часть семьи Vibe Gym. Зал ждёт тебя: ${gymLabel()}, ${hh(OPEN)}–${hh(CLOSE)}. Помни: стоимость одного визита зависит только от тебя 💜`, kind: "official" });
    refresh();
  }

  function cancelPlan(refresh) {
    if (ft().annualUntil != null) {
      V.modal(`<div class="m-emo wobble">🗓️</div><div class="display" style="font-size:24px">Годовой не отменяется</div>
        <p>Деньги за год уже усердно трудятся в нашем бассейне. Но ты всегда можешь прийти!</p>
        <button class="btn black block" data-close>Понял, приду</button>`, { sound: "pop" });
      return;
    }
    const steps = [
      { e: "🥺", t: "Ты точно уходишь?", p: "Эдуард узнает. Эдуард расстроится. Эдуард сделает ещё подход — от горя.", y: "Да, ухожу", n: "Остаться в семье" },
      { e: "🎁", t: "Подожди! Скидка 5%", p: "Только сегодня: 3 месяца со скидкой 5%. Потом — со скидкой 0%. Это почти подарок.", y: "Нет, правда ухожу", n: "Взять скидку (нет)" },
      { e: "📋", t: "Последний шаг", p: "Укажи причину: «я не хожу». Мы передадим её в отдел, который проверяет, ходишь ли ты.", y: "Отменить абонемент", n: "Ладно, похожу" },
    ];
    let i = 0;
    const next = () => {
      const s = steps[i];
      V.modal(`<div class="m-emo wobble">${s.e}</div><div class="display" style="font-size:24px">${s.t}</div><p>${s.p}</p>
        <button class="btn black block" data-close>${s.n}</button>
        <button class="btn block" data-yes style="margin-top:10px">${s.y}</button>
        <div class="fine">Шаг ${i + 1} из ${steps.length}. Мы ценим твоё упорство. Жаль, не в зале.</div>`, {
        sound: "pop",
        onMount(m, close) {
          m.querySelector("[data-yes]").addEventListener("click", () => {
            close();
            i++;
            if (i < steps.length) return setTimeout(next, 260);
            if (V.subs) V.subs.remove("gym");
            setFt({ plan: null, annualUntil: null });
            V.achieve && V.achieve("cancel");
            FX.toast("Абонемент отменён. Зал будет скучать (и звонить)", "👋", 3000);
            refresh();
          });
        },
      });
    };
    next();
  }

  function freezeModal() {
    const d = today();
    // Игровые месяцы: 0 — ноябрь, 3 — февраль. Високосный — каждый 4-й год, ближайший «через пару лет».
    let y = Math.floor(d / 360);
    while (((y + 2) % 4) !== 0 || y * 360 + 3 * 30 + 29 < d) y++;
    const until = Math.max(0, y * 360 + 3 * 30 - d);
    const tries = (ft().freezeTries || 0) + 1;
    V.modal(`
      <div class="m-emo float">🧊</div>
      <div class="display" style="font-size:24px">Заморозка абонемента</div>
      <p>Заморозить можно только в феврале високосного года. Ближайший — через <b>${V.fmt(until)} дн.</b></p>
      <div class="card tight" style="margin:6px 0 12px">
        <div class="ftn-chk"><span>☑️</span>Справка от врача, что ты не можешь ходить в зал</div>
        <div class="ftn-chk"><span>☑️</span>Справка от зала, что ты в него ходил</div>
        <div class="ftn-chk"><span>⬜</span>Личное присутствие в воскресенье в 6:00</div>
        <div class="ftn-chk"><span>⬜</span>Фото пресса до и после (нотариально)</div>
      </div>
      <button class="btn black block" data-close data-freeze>Подать заявление</button>
      <div class="fine">Попытка №${tries}. Заморозка длится 3 дня, абонемент при этом продолжает списываться — чтобы не размораживать его вручную.</div>`, {
      sound: "pop",
      onMount(m) {
        m.querySelector("[data-freeze]").addEventListener("click", () => {
          setFt({ freezeTries: tries });
          setTimeout(() => FX.toast(tries >= 3 ? "Заявление №3 принято. Рассмотрение — 13 месяцев. Удачи!" : "Заявление принято. Срок рассмотрения — до февраля високосного года", "📨", 3400), 300);
        });
      },
    });
  }

  function bookClass(c, from, refresh) {
    const p = plan();
    if (!p) { FX.shake(from); FX.toast("Групповые — только по абонементу. Начни с «Утреннего»", "🎟️", 2600); return; }
    if (c.h < p.from || c.h >= p.to) { FX.shake(from); FX.toast(`«${p.n}» не пускает в ${hh(c.h)}. Апгрейд? Апгрейд!`, "⏰", 2600); return; }
    if (c.pool && !p.pool) { FX.shake(from); FX.toast("Аквааэробика — только с бассейном. Сухую пока не придумали", "🏊", 2600); return; }
    V.sched.add({ id: c.id, day: c.day, hour: c.h, min: 0, dur: 60, title: `Vibe Gym · ${c.t}`, e: c.e, place: GYM, kind: "sport", go: "fitness", fitness: true });
    FX.burst(from, { emojis: [c.e, "📅", "✨"], count: 10 });
    FX.sound.pop();
    FX.toast(`Записан: ${c.t}, ${WD[c.day % 7]} ${hh(c.h)}. Место — ${gymLabel()}`, "📅", 3000);
    refresh();
  }

  function nextClasses(n = 7) {
    const d0 = today(), m = nowMin(), out = [];
    for (let d = d0; d < d0 + 7 && out.length < n; d++) {
      CLASSES.filter((c) => c.d === d % 7).forEach((c) => {
        if (d * 1440 + c.h * 60 > m && out.length < n) out.push(Object.assign({ day: d, id: `gym-${d}-${c.h}` }, c));
      });
    }
    return out;
  }

  function trainer(from, refresh) {
    const p = plan();
    const mo = monthOf(today());
    const free = p && p.pool && ft().freeTrainerMonth !== mo;
    const price = free ? 0 : TRAINER_PRICE;
    const pay = () => {
      if (!price) { setFt({ freeTrainerMonth: mo }); return true; }
      return V.pay(price, { title: "Vibe Фитнес · персональная тренировка", emoji: TRAINER.e, col: "c-orange", from });
    };
    if (atGym()) {
      if (!canTrain(from)) return;
      if (!pay()) return;
      FX.toast(`${TRAINER.short}: «${pick(T_LINES)}»`, TRAINER.e, 2600);
      playWorkout("strength", { trainer: true, onDone: (r) => { const x = finishWorkout("strength", r, { trainer: true }); refresh(); return x; } });
      return;
    }
    // Записаться на ближайший слот
    const m = nowMin(), d0 = today();
    let slot = null;
    for (let d = d0; d < d0 + 3 && !slot; d++) for (const h of [7, 12, 19]) if (d * 1440 + h * 60 > m + 60) { slot = { day: d, h }; break; }
    const id = `gym-tr-${slot.day}-${slot.h}`;
    if (V.sched.get(id)) { FX.toast("Ты уже записан. Эдуард уже разминается", "💪"); return; }
    if (!pay()) return;
    V.sched.add({ id, day: slot.day, hour: slot.h, min: 0, dur: 60, title: `Vibe Gym · Тренировка с ${TRAINER.short}ом`, e: TRAINER.e, place: GYM, kind: "sport", go: "fitness", fitness: true, trainer: true, price });
    FX.confetti({ count: 60 });
    FX.toast(`${TRAINER.short} ждёт тебя ${slot.day === d0 ? "сегодня" : WD[slot.day % 7]} в ${hh(slot.h)}. Опоздаешь — +10 бёрпи`, TRAINER.e, 3400);
    refresh();
  }

  function buyShop(id, from, refresh) {
    const it = SHOP.find((x) => x.id === id);
    if (!it) return;
    if (it.bar && !atGym()) { FX.shake(from); FX.toast("Фитнес-бар работает только в зале. Как и мотивация", "🥤", 2600); return; }
    if (!V.pay(it.price, { title: "Vibe Фитнес · протеин", emoji: it.e, col: "c-mint", from })) return;
    if (it.fx && V.body) V.body.effect(it.fx);
    if (it.id === "jar") setFt({ jar: (ft().jar || 0) + 20 });
    FX.burst(from, { emojis: [it.e, "💪", "✨"], count: 10 });
    FX.toast(`${it.n}: ${pick(["белок пошёл", "мышцы благодарят", "это уже почти тренировка"])}`, it.e, 2200);
    refresh();
  }

  // Письмо «Мы скучаем», если неделю не был
  function missMail() {
    const f = ft();
    if (!plan() || !V.mail || !V.mail.send) return;
    const d = today();
    const lastSeen = f.lv != null ? f.lv : f.since != null ? f.since : d;
    const wk = Math.floor(d / 7);
    if (d - lastSeen < 7 || f.mailWeek === wk) return;
    setFt({ mailWeek: wk });
    V.mail.send({ from: "Vibe Фитнес", subject: "Мы скучаем! 🥺 А твой абонемент — нет", body: `Ты не {был|была} в зале ${d - lastSeen} дн. Стоимость одного визита в этом месяце: ${V.rub(costPerVisit())}. Эдуард спрашивал о тебе. Дважды. Приходи: ${gymLabel()} 💜`, kind: "spam" });
  }

  /* ================= Экран ================= */
  function body() {
    const p = plan();
    const f = ft();
    const fm = form();
    const here = atGym();
    const open = gymOpen();
    const vm = visitsMonth();
    const cpv = costPerVisit();
    const mc = monthlyCost();
    const streak = f.lv != null && today() - f.lv > 2 ? 0 : f.streak || 0;
    const classes = nextClasses(7);
    const tq = T_LINES[today() % T_LINES.length];
    const freeTr = p && p.pool && f.freeTrainerMonth !== monthOf(today());
    return `
      ${V.ui.hero({ title: "Vibe Фитнес", text: "Тело — тоже подписка. Продлевается автоматически", emo: "🏋️", color: "c-orange", sticker: `Форма ${fm}` })}

      <div class="card" style="margin-top:14px">
        <div class="ftn-loc">
          <div class="ic ${here ? "c-lime" : "c-mint"}">${here ? "💪" : "🌳"}</div>
          <div style="flex:1;min-width:0"><b>${gymLabel()}</b><small>${hh(OPEN)}–${hh(CLOSE)} · ${open ? "открыто" : "закрыто, охранник Гена спит"} · ${here ? "ты в зале ✅" : "ты не в зале"}</small></div>
        </div>
        <div class="ftn-row">
          ${here ? `<button class="btn black tap" data-act="here">💪 Я уже в зале</button>` : `<button class="btn black tap" data-go="maps" data-params='${JSON.stringify({ to: GYM })}'>🗺️ Поехать в зал</button><button class="btn tap" data-act="here">Я уже в зале</button>`}
        </div>
      </div>

      <div class="grid3 stagger" style="margin-top:14px">
        <div class="card tight ftn-stat c-lime"><div class="big-num">${fm}</div><small>форма</small><div class="ftn-bar"><i style="width:${fm}%"></i></div></div>
        <div class="card tight ftn-stat c-yellow"><div class="big-num">${streak}🔥</div><small>серия · рекорд ${f.best || 0}</small></div>
        <div class="card tight ftn-stat c-sky"><div class="big-num">${vm}</div><small>визитов в месяце</small></div>
      </div>
      <div class="muted" style="font-weight:800;font-size:12px;margin:8px 4px 0">${formTitle(fm)} · внешность +${lookBonus()}${pendingLoss() || (f.lv != null && today() - f.lv >= 1) ? " · форма тает без визитов 🫠" : ""}</div>

      ${p ? `<div class="card ${cpv >= mc / 2 ? "c-coral" : "c-mint"}" style="margin-top:14px">
        <div class="ftn-cost">
          <div style="font-size:40px" class="${cpv >= mc / 2 ? "wobble" : ""}">${cpv >= mc / 2 ? "💸" : "📉"}</div>
          <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:13px">Стоимость одного визита:</div><div class="big-num">${V.rub(cpv)}</div></div>
        </div>
        <div style="font-weight:700;font-size:12px;margin-top:6px">${vm ? `Сходи ещё раз — станет ${V.rub(Math.round(mc / (vm + 1)))}` : "Ты ещё не был в этом месяце. Абонемент был. Каждый день"}${!visitedToday() ? " · сегодня ты пропускаешь" : " · сегодня ты молодец"}</div>
      </div>` : ""}

      <h2 class="sec">Абонемент <small>${p ? (f.annualUntil != null ? `год · до дня ${f.annualUntil}` : `${V.rub(p.price)}/мес`) : "выбери свой путь"}</small></h2>
      ${p ? `<div class="card ${p.c} ftn-plan">
          <div class="ftn-plan-top"><span class="e">${p.e}</span><b>«${p.n}»</b><span class="badge">активен</span></div>
          <ul>${p.perks.map((x) => `<li>${x}</li>`).join("")}</ul>
          <div class="btns"><button class="btn tap" data-act="freeze">🧊 Заморозить</button><button class="btn tap" data-act="cancel">Отменить</button></div>
          ${f.annualUntil == null ? `<div class="btns">${Object.values(PLANS).filter((x) => x.id !== p.id).map((x) => `<button class="btn tap" data-plan="${x.id}">${x.e} → ${x.n.split(" ")[0]}</button>`).join("")}</div>` : ""}
        </div>`
      : `<div class="stack stagger">${Object.values(PLANS).map((x) => `<div class="card ${x.c} ftn-plan">
          <div class="ftn-plan-top"><span class="e">${x.e}</span><b>«${x.n}»</b><span class="big-num" style="font-size:20px">${V.rub(x.price)}</span></div>
          <ul>${x.perks.map((y) => `<li>${y}</li>`).join("")}</ul>
          <div class="btns"><button class="btn black tap" data-plan="${x.id}">На месяц</button><button class="btn tap" data-plan="${x.id}" data-year="1">Год · −25% 🔥</button></div>
        </div>`).join("")}</div>
        <div class="fine">Годовой: ${V.rub(Math.round(PLANS.unlim.price * 12 * ANNUAL_K))} за «Безлимит». Окупается к 47-му визиту. Средний клиент делает 2. Мы верим в тебя больше, чем статистика.</div>`}

      <h2 class="sec">Тренировка <small>${here ? "ты в зале — погнали" : "только в зале"}</small></h2>
      <div class="ftn-progs stagger">
        ${Object.entries(PROGS).filter(([id, x]) => !x.pool || (p && p.pool)).map(([id, x]) => `<button class="card ${x.c} tap ftn-prog" data-prog="${id}"><span class="e">${x.e}</span><b>${x.n}</b><small>${x.cnt} повторов · ${x.iv < 600 ? "быстро" : x.iv > 950 ? "медленно" : "средне"}</small></button>`).join("")}
      </div>

      <h2 class="sec">Групповые занятия <small>${gymLabel().replace("Vibe Gym ", "")}</small></h2>
      <div class="card" style="padding:4px 14px">
        ${classes.map((c) => { const booked = V.sched && V.sched.get(c.id); return `<div class="ftn-cls">
          <div class="when"><b>${hh(c.h)}</b>${c.day === today() ? "сегодня" : WD[c.day % 7]}</div>
          <div class="tx">${c.e} ${c.t}<small>${c.pool ? "бассейн · " : ""}60 мин · ${p && c.h >= p.from && c.h < p.to && (!c.pool || p.pool) ? "входит в абонемент" : "нужен другой тариф"}</small></div>
          ${booked ? `<span class="badge">${booked.status === "done" ? "✅ был" : "📅 записан"}</span>` : `<button class="btn tap" data-cls="${c.id}">Записаться</button>`}
        </div>`; }).join("") || `<div class="muted" style="padding:12px 0;font-weight:700">Занятий нет. Тренеры на корпоративе</div>`}
      </div>

      <h2 class="sec">Персональный тренер</h2>
      <div class="card c-yellow">
        <div class="ftn-trainer">
          <div class="ava wobble">${TRAINER.e}</div>
          <div style="flex:1;min-width:0">
            <b style="font-size:15px;font-weight:900">${TRAINER.n}</b>
            <div style="font-size:12px;font-weight:700">Мастер спорта по мотивационным цитатам · 4,9 ⭐ (оценки ставит сам)</div>
            <div class="ftn-quote">«${tq}»</div>
          </div>
        </div>
        <button class="btn black block tap" data-act="trainer" style="margin-top:12px">${here ? "Тренироваться с Эдуардом" : "Записаться к Эдуарду"} · ${freeTr ? "бесплатно (Премиум)" : V.rub(TRAINER_PRICE)}</button>
        <div class="fine">С тренером форма растёт ×1,5. Как и его доход. Неявка — деньги сгорают, бёрпи остаются.</div>
      </div>

      <h2 class="sec">Фитнес-бар <small>${here ? "открыт" : "в зале"}${f.jar ? ` · 🫙 ${f.jar} порц.` : ""}</small></h2>
      <div class="card" style="padding:4px 14px">
        ${SHOP.map((it) => `<div class="ftn-shop"><span class="e">${it.e}</span><div class="tx"><b>${it.n}</b><small>${it.d}</small></div><button class="btn ${it.bar && !here ? "" : "lime"} tap" data-buy="${it.id}">${V.rub(it.price)}</button></div>`).join("")}
      </div>

      <div class="fine">Vibe Фитнес заботится о тебе 24/7, а списывает — раз в месяц. Абонемент не передаётся, не замораживается (см. февраль високосного года) и не возвращается. Результат не гарантирован, гарантирован только платёж. Тренер Эдуард — вымышленный персонаж, его бицепс — тоже.</div>`;
  }

  V.screen("fitness", {
    render() {
      commitDecay();
      return `${V.ui.head("Vibe Фитнес", "тело по подписке", V.ui.vibikiPill())}<div data-ftn>${body()}</div>`;
    },
    mount(root) {
      const box = root.querySelector("[data-ftn]");
      const sig = () => [S().fz_lastPos, hourNow(), JSON.stringify(ft()), S().ft_form, V.subs && V.subs.has("gym"), today(), V.sched ? V.sched.list().filter((e) => e.fitness).map((e) => e.id + e.status).join() : ""].join("|");
      let last = sig();
      const refresh = () => { commitDecay(); box.innerHTML = body(); box.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i))); last = sig(); V.refreshCounters(); };
      const iv = setInterval(() => { if (sig() !== last) refresh(); }, 3000);
      const t = setTimeout(missMail, 1500);
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (a) {
          const k = a.dataset.act;
          if (k === "here") {
            if (!atGym()) {
              FX.shake(a);
              FX.toast(`Геолокация не согласна. Ты не в зале — ${gymLabel()} в другой стороне`, "📍", 3000);
              return;
            }
            FX.bump(a); FX.sound.pop();
            V.ui.sheet(`<div class="display" style="font-size:26px">Выбери программу</div>
              <div class="muted" style="font-weight:700;font-size:13px;margin:4px 0 12px">Ритм-тренировка: жми в такт</div>
              <div class="ftn-progs stagger">${Object.entries(PROGS).filter(([, x]) => !x.pool || (plan() && plan().pool)).map(([id, x]) => `<button class="card ${x.c} tap ftn-prog" data-pick="${id}"><span class="e">${x.e}</span><b>${x.n}</b><small>${x.line}</small></button>`).join("")}</div>`, {
              onMount(sh, close) {
                sh.addEventListener("click", (ev) => {
                  const b = ev.target.closest("[data-pick]"); if (!b) return;
                  close(); setTimeout(() => startWorkout(b.dataset.pick, a, refresh), 320);
                });
              },
            });
          } else if (k === "freeze") freezeModal();
          else if (k === "cancel") cancelPlan(refresh);
          else if (k === "trainer") trainer(a, refresh);
          return;
        }
        const pl = e.target.closest("[data-plan]");
        if (pl) return buyPlan(pl.dataset.plan, !!pl.dataset.year, pl, refresh);
        const pr = e.target.closest("[data-prog]");
        if (pr) return startWorkout(pr.dataset.prog, pr, refresh);
        const cl = e.target.closest("[data-cls]");
        if (cl) { const c = nextClasses(14).find((x) => x.id === cl.dataset.cls); if (c) bookClass(c, cl, refresh); return; }
        const bu = e.target.closest("[data-buy]");
        if (bu) return buyShop(bu.dataset.buy, bu, refresh);
      });
      return () => { clearInterval(iv); clearTimeout(t); if (activeClose) activeClose(); };
    },
  });
})();
