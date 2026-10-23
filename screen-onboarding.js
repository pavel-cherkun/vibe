/* ============================================================
   Регистрация: заставка → телефон → код → имя и аватар →
   соглашение → переезд в город (дом на карте) → старт жизни.
   ============================================================ */
(function () {
  const AVATARS = ["😎", "🦊", "🐸", "👽", "🤠", "🐼", "🦄", "🤖", "🐱", "🧚", "🦖", "👻"];
  const STEPS = 6;
  let step = 0;
  let data = { phone: "", name: "", avatar: "😎", g: "" };

  function dots() {
    return `<div class="ob-dots">${Array.from({ length: STEPS }, (_, i) => `<span class="${i <= step ? "on" : ""}"></span>`).join("")}</div>`;
  }

  const VIEWS = [
    // 0 — заставка
    () => `
      <div class="ob-splash">
        <div class="ob-stickers">
          <span class="emo float" style="left:6%;top:4%">💳</span><span class="emo float d1" style="right:8%;top:10%">🍜</span>
          <span class="emo float d2" style="left:8%;bottom:4%">🚕</span><span class="emo float d3" style="right:8%;bottom:8%">💼</span>
          <span class="emo float d1" style="left:40%;top:-2%">🏠</span>
        </div>
        <div class="logo ob-logo">Vibe</div>
        <div class="display" style="font-size:30px;text-align:center;margin-top:8px">Всё в одном приложении.<br>Включая тебя.</div>
        <p class="ob-p">Работа, деньги, жильё, еда, такси и любовь. Одна жизнь — одно приложение. Начнём?</p>
        <button class="btn black xl block" data-next>Начать жизнь <span class="arrow">→</span></button>
        <div class="fine" style="text-align:center">Сатирическая игра. Все компании вымышлены. Данные хранятся только на твоём телефоне.</div>
      </div>`,
    // 1 — телефон
    () => `
      ${dots()}
      <div class="display ob-h">Твой номер</div>
      <p class="ob-p">Мы пришлём код. А ещё 14 предложений в день. Шутка. Двадцать.</p>
      <div class="field ob-phone"><b>+7</b><input data-phone inputmode="numeric" maxlength="13" placeholder="900 000-00-00" autocomplete="off"></div>
      <div class="fine">Номер нигде не сохраняется и никуда не отправляется — это игра.</div>
      <button class="btn black xl block" style="margin-top:20px" data-next disabled>Получить код</button>`,
    // 2 — код
    () => `
      ${dots()}
      <div class="display ob-h">Код из СМС</div>
      <p class="ob-p">Отправили на +7 ${Vibe.esc(data.phone)}. Не утруждайся — мы его уже знаем.</p>
      <div class="ob-code">${[0, 1, 2, 3].map((i) => `<span data-c="${i}"></span>`).join("")}</div>
      <div class="ob-zab">${Vibe.zabotik(56, "sly")}<span data-zabtext>Секундочку, вставляю код за тебя…</span></div>`,
    // 3 — имя и аватар
    () => `
      ${dots()}
      <div class="display ob-h">Как тебя зовут?</div>
      <div class="ob-ava-big emo float" data-avabig>${data.avatar}</div>
      <div class="field"><input data-name maxlength="16" placeholder="Имя" value="${Vibe.esc(data.name)}" autocomplete="off"></div>
      <div class="ob-gender">${[["m", "Он"], ["f", "Она"]].map(([k, t]) => `<button class="chip ${data.g === k ? "on" : ""}" data-g="${k}">${t}</button>`).join("")}</div>
      <div class="ob-avas">${AVATARS.map((a) => `<button class="ob-ava ${a === data.avatar ? "on" : ""}" data-ava="${a}">${a}</button>`).join("")}</div>
      <button class="btn black xl block" style="margin-top:18px" data-next ${data.name && data.g ? "" : "disabled"}>Дальше</button>`,
    // 4 — соглашение
    () => `
      ${dots()}
      <div class="display ob-h">Пара формальностей</div>
      <div class="ob-terms" data-terms>
        <b>Пользовательское соглашение Vibe (страница 1 из 147)</b>
        <p>1.1. Пользователь соглашается со всем.</p>
        <p>1.2. Vibe вправе знать, где пользователь находится, что ест, с кем встречается и о чём думает перед сном.</p>
        <p>1.3. Кэшбек начисляется в вайбиках. Курс вайбика к дэньгам определяется настроением Корпорации.</p>
        <p>1.4. Отказ от подписки возможен. Теоретически.</p>
        <p>1.5. Пользователь обязуется быть счастливым. Несчастье является нарушением п. 1.1.</p>
        <p>2.1. Корпорация не несёт ответственности ни за что. Особенно за это.</p>
        <p>…и ещё 146 страниц мелким шрифтом.</p>
      </div>
      ${["Согласен со всем", "Согласен на всё", "Да, я прочитал (нет)"].map((t, i) => `<button class="ob-check" data-check="${i}"><span class="box"></span>${t}</button>`).join("")}
      <button class="btn black xl block" style="margin-top:14px" data-next disabled>Принять</button>`,
    // 5 — переезд
    () => `
      ${dots()}
      <div class="display ob-h">Добро пожаловать в город</div>
      <p class="ob-p">Ты {переехал|переехала} в большой город. В кармане ${Vibe.rub(15000)} от мамы, комната в коммуналке за ${Vibe.rub(18000)} в месяц (первый месяц мама оплатила). Работы пока нет.</p>
      <div class="ob-map" data-map></div>
      <div class="grid3 ob-stats stagger">
        <div class="card tight c-lime"><span class="emo">💸</span><b>${Vibe.fmt(15000)} ₫</b><small>на карте</small></div>
        <div class="card tight c-yellow"><span class="emo">🏚️</span><b>18к/мес</b><small>аренда</small></div>
        <div class="card tight c-coral"><span class="emo">💼</span><b>нет</b><small>работы</small></div>
      </div>
      <div class="card tight c-lilac" style="margin-top:12px;font-weight:700;font-size:13px">⏳ В Vibe время идёт всегда: 1 игровая минута = 1 секунда, день — 24 минуты. Зарплата, аренда и счета приходят сами — даже когда приложение закрыто.</div>
      <button class="btn grad xl block" style="margin-top:16px" data-finish>Начать жизнь 🚀</button>`,
  ];

  Vibe.screen("welcome", {
    render() {
      if (Vibe.state.get().profile) return "";
      step = 0; data = { phone: "", name: "", avatar: "😎", g: "" };
      return `<div class="ob" data-ob>${VIEWS[step]()}</div>`;
    },
    mount(root) {
      if (Vibe.state.get().profile) { setTimeout(() => Vibe.resetTo("home"), 0); return; }
      let timers = [], mapCtl = null;
      const box = root.querySelector("[data-ob]");
      const show = (n) => {
        step = n;
        if (mapCtl) { mapCtl.destroy(); mapCtl = null; }
        box.classList.remove("ob-in"); void box.offsetWidth;
        box.innerHTML = VIEWS[step]();
        box.classList.add("ob-in");
        box.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
        root.scrollTop = 0;
        FX.sound.whoosh();
        enter();
      };
      const enter = () => {
        if (step === 1) {
          const inp = box.querySelector("[data-phone]");
          setTimeout(() => inp.focus(), 300);
          inp.addEventListener("input", () => {
            const d = inp.value.replace(/\D/g, "").slice(0, 10);
            inp.value = d.replace(/^(\d{3})(\d{0,3})(\d{0,2})(\d{0,2}).*/, (m, a, b, c, e) => [a, b && " " + b, c && "-" + c, e && "-" + e].join(""));
            data.phone = inp.value;
            box.querySelector("[data-next]").disabled = d.length < 10;
            if (d.length === 10) FX.bump(box.querySelector("[data-next]"));
          });
        }
        if (step === 2) {
          const code = String(1000 + Math.floor(Math.random() * 9000));
          [...code].forEach((ch, i) => timers.push(setTimeout(() => {
            const c = box.querySelector(`[data-c="${i}"]`);
            if (!c) return;
            c.textContent = ch; c.classList.add("on"); FX.bump(c); FX.sound.tap();
          }, 700 + i * 350)));
          timers.push(setTimeout(() => {
            const t = box.querySelector("[data-zabtext]");
            if (t) t.textContent = "Готово! Мы всегда на шаг впереди 😉";
            FX.burst(box.querySelector(".ob-code"), { emojis: ["✅", "✨"], count: 10 });
            FX.sound.success();
          }, 2200));
          timers.push(setTimeout(() => show(3), 3300));
        }
        if (step === 3) {
          const inp = box.querySelector("[data-name]");
          inp.addEventListener("input", () => { data.name = inp.value.trim(); box.querySelector("[data-next]").disabled = !(data.name && data.g); });
        }
        if (step === 5) {
          const p = Vibe.map.place("flat:start");
          const el = box.querySelector("[data-map]");
          mapCtl = Vibe.map.create(el, { interactive: true, pins: [Object.assign({ id: "hq", color: "#e6dcff" }, Vibe.map.place("hq"))] });
          mapCtl.fit([{ x: 0, y: 0 }, { x: Vibe.map.SIZE, y: Vibe.map.SIZE }], 0, true);
          timers.push(setTimeout(() => {
            mapCtl.setPins([Object.assign({ id: "home", color: "#ffe14d", pulse: true, e: "🏚️", label: "Твой дом" }, p), Object.assign({ id: "hq", color: "#e6dcff" }, Vibe.map.place("hq"))]);
            mapCtl.center(p, 380);
            FX.sound.pop();
            FX.burst(el, { emojis: ["🏠", "✨", "📍"], count: 10 });
          }, 900));
        }
      };

      root.addEventListener("click", (e) => {
        if (e.target.closest("[data-next]")) {
          if (step === 3) Vibe.state.set({ name: data.name });
          show(step + 1);
        }
        const gb = e.target.closest("[data-g]");
        if (gb) {
          data.g = gb.dataset.g;
          box.querySelectorAll("[data-g]").forEach((x) => x.classList.toggle("on", x === gb));
          FX.bump(gb);
          const nx = box.querySelector("[data-next]"); if (nx) nx.disabled = !(data.name && data.g);
        }
        const a = e.target.closest("[data-ava]");
        if (a) {
          data.avatar = a.dataset.ava;
          box.querySelectorAll(".ob-ava").forEach((x) => x.classList.toggle("on", x === a));
          const big = box.querySelector("[data-avabig]"); big.textContent = data.avatar; FX.bump(big);
          FX.burst(a, { emojis: [data.avatar, "✨"], count: 8 });
        }
        const c = e.target.closest("[data-check]");
        if (c) {
          c.classList.toggle("on"); FX.bump(c.querySelector(".box"));
          const all = box.querySelectorAll(".ob-check.on").length === 3;
          box.querySelector("[data-next]").disabled = !all;
          if (all) FX.burst(c, { emojis: ["✅", "📜"], count: 8 });
        }
        if (e.target.closest("[data-finish]")) finish(e.target.closest("[data-finish]"));
      });

      function finish(btn) {
        const d = new Date();
        Vibe.state.set({ profile: { avatar: data.avatar, g: data.g || "m", createdAt: Date.now() }, name: data.name || "Новичок", achievements: ["first"], lastLogin: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, streak: 1 });
        Vibe.game.begin();
        Vibe.game.moveHome({ title: "Комната в коммуналке", rent: 18000, emoji: "🏚️", key: "start" });
        FX.confetti();
        FX.sound.levelup();
        btn.disabled = true;
        timers.push(setTimeout(() => {
          Vibe.resetTo("home");
          Vibe.game.boot();
          setTimeout(() => Vibe.modal(`
            <div class="m-emo float">📦</div><div class="display" style="font-size:26px">Ты {переехал|переехала}!</div>
            <p>Комната в коммуналке, 19:00, коробки. В сумке — мамины гречка, тушёнка и четыре картофелины. Сегодня — только две вещи: поесть с кайфом и выспаться. Утро вечера мудренее, работу поищем завтра.</p>
            <button class="btn black block" data-close data-cook>Приготовить ужин 🍳</button>
            <button class="btn block" data-close data-go="eat" style="margin-top:8px">Заказать в Vibe Eat</button>`, { sound: "pop", onMount: (m) => { const c = m.querySelector("[data-cook]"); if (c) c.addEventListener("click", () => setTimeout(() => Vibe.intercept && Vibe.intercept.cook(), 350)); } }), 600);
        }, 1200));
      }

      enter();
      return () => { timers.forEach(clearTimeout); if (mapCtl) mapCtl.destroy(); };
    },
  });

  const css = `
  .ob { min-height: calc(100dvh - 60px); display: flex; flex-direction: column; }
  .ob-in { animation: pop-in .5s var(--spring) both; }
  .ob-splash { flex: 1; display: flex; flex-direction: column; justify-content: center; position: relative; padding-top: 40px; }
  .ob-stickers { position: absolute; inset: 0; pointer-events: none; }
  .ob-stickers .emo { position: absolute; font-size: 52px; }
  .ob-logo { font-size: 110px; text-align: center; color: var(--pink); -webkit-text-stroke: 3px var(--ink); text-shadow: 0 7px 0 var(--ink); transform: rotate(-5deg); animation: wobble 4s ease-in-out infinite; position: relative; }
  .ob-p { font-weight: 700; color: var(--muted); margin: 10px 0 20px; line-height: 1.4; font-size: 15px; }
  .ob-splash .ob-p { text-align: center; }
  .ob-dots { display: flex; gap: 6px; margin: 8px 0 24px; }
  .ob-dots span { flex: 1; height: 8px; border-radius: 4px; background: #e3ddcc; border: 2px solid var(--ink); }
  .ob-dots span.on { background: var(--lime); }
  .ob-h { font-size: 34px; }
  .ob-phone b { font-size: 18px; }
  .ob-phone input { font-size: 20px; letter-spacing: 1px; }
  .ob-code { display: flex; gap: 12px; justify-content: center; margin: 24px 0; }
  .ob-code span { width: 62px; height: 76px; border: var(--line); border-radius: 20px; background: #fff; display: grid; place-items: center; font-family: var(--font-display); font-size: 34px; box-shadow: var(--shadow-sm); }
  .ob-code span.on { background: var(--lime); }
  .ob-zab { display: flex; gap: 12px; align-items: center; font-weight: 800; background: #fff; border: var(--line); border-radius: 22px; padding: 12px 14px; }
  .ob-ava-big { font-size: 96px; text-align: center; margin: 4px auto 14px; display: block; }
  .ob-gender { display: flex; gap: 8px; margin-top: 12px; }
  .ob-gender .chip { flex: 1; justify-content: center; }
  .ob-avas { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 14px; }
  .ob-ava { aspect-ratio: 1; border: 2.5px solid var(--ink); border-radius: 16px; background: #fff; font-size: 26px; transition: transform .2s var(--spring), background .2s; }
  .ob-ava.on { background: var(--yellow); transform: scale(1.12) rotate(-6deg); box-shadow: 0 3px 0 var(--ink); }
  .ob-terms { height: 190px; overflow-y: auto; border: var(--line); border-radius: 20px; background: #fff; padding: 14px; font-size: 12px; font-weight: 600; line-height: 1.5; margin: 14px 0; }
  .ob-terms p { margin-top: 8px; color: var(--muted); }
  .ob-check { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 4px; font-weight: 800; font-size: 15px; text-align: left; }
  .ob-check .box { width: 30px; height: 30px; border: var(--line); border-radius: 10px; background: #fff; flex: 0 0 auto; display: grid; place-items: center; }
  .ob-check.on .box { background: var(--lime); }
  .ob-check.on .box::after { content: "✓"; font-weight: 900; }
  .ob-map { height: 250px; margin: 6px 0 14px; }
  .ob-stats .card { text-align: center; display: flex; flex-direction: column; align-items: center; }
  .ob-stats .emo { font-size: 26px; } .ob-stats b { font-family: var(--font-display); font-weight: 400; font-size: 16px; } .ob-stats small { font-size: 11px; font-weight: 800; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
