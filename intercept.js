/* ============================================================
   Перехваты — ось «удобство против людей».
   На каждый момент живой жизни у супер-аппа есть функция-перехват.
   Удобство проматывает время (счётчик перемотки), а цену сообщают
   люди — с задержкой, по лестнице охлаждения. Чинится только вручную.

   Здесь: реестр и счётчики, ужин (в т. ч. первый вечер), Новый год,
   свидание с Vibe Суфлёром, Бублик (выгул по подписке), бабушка
   Зинаида с вареньем (только пешком). Мама и Vibe Забота — care.js.

   API: Vibe.intercept.used(id, minutes), manual(id), stats(), savedMin(month),
        cook(fromEl), bublikHearts()
   Состояние: icpt { rw: {total, m:{}}, c:{id:{auto,manual,stage}}, ny, bub, baba }
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const G = () => Vibe.game;
  const live = () => !!(S().profile && S().game && G());
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => Vibe.esc(s == null ? "" : String(s));
  const I = () => Object.assign({ rw: { total: 0, m: {} }, c: {}, ny: {}, bub: { h: 3 }, baba: {} }, S().icpt || {});
  const setI = (p) => Vibe.state.set({ icpt: Object.assign(I(), p) });
  const rel = (id, d) => { if (Vibe.people && Vibe.people.rel) Vibe.people.rel(id, d); };
  const later = (id, text, mins) => { try { Vibe.msg.send(id, text, { from: id, delay: mins }); } catch (e) {} };
  const monthNow = () => Math.floor(G().info().day / 30);
  const busy = () => (Vibe.busy ? Vibe.busy() : !!document.querySelector(".modal, .sheet"));
  // Ручная жизнь тратит игровое время по-настоящему
  const spend = (mins) => {
    const g = S().game; if (!g) return;
    Vibe.state.set({ game: Object.assign({}, g, { start: g.start - (mins / 1440) * G().DAY_MS }) });
    G().tick();
  };

  /* ---------- Лестницы цены по перехватам ---------- */
  const LADDERS = {
    eat: [
      { need: 4, who: "mom", t: "Ты всё заказываешь? Я тебе рецепт борща скинула, ты так и не {открыл|открыла} 🙂" },
      { need: 9, who: "mom", t: "Ладно, рецепты больше не шлю. Ты всё равно заказываешь" },
    ],
    dog: [
      { need: 3, who: "valera", t: "Бублик теперь Тимура у двери ждёт. Выгульщика. Ну, он хоть приходит" },
    ],
    date: [
      { need: 1, who: null, t: "" }, // цену свидания сообщает сам человек (см. date)
    ],
  };

  /* ---------- Реестр ---------- */
  function used(id, minutes = 0) {
    if (!live()) return;
    const x = I();
    const m = monthNow();
    const rw = { total: (x.rw.total || 0) + minutes, m: Object.assign({}, x.rw.m, { [m]: ((x.rw.m || {})[m] || 0) + minutes }) };
    const c = Object.assign({}, x.c);
    const it = Object.assign({ auto: 0, manual: 0, stage: 0 }, c[id] || {});
    it.auto++;
    const step = (LADDERS[id] || [])[it.stage];
    if (step && step.who && it.auto >= step.need) {
      later(step.who, step.t, 700 + Math.floor(Math.random() * 600));
      rel(step.who, -4);
      it.stage++;
    }
    c[id] = it;
    setI({ rw, c });
  }
  function manual(id) {
    if (!live()) return;
    const c = Object.assign({}, I().c);
    const it = Object.assign({ auto: 0, manual: 0, stage: 0 }, c[id] || {});
    it.manual++; it.auto = 0; it.stage = Math.max(0, it.stage - 1);
    c[id] = it;
    setI({ c });
  }
  const savedMin = (m) => ((I().rw.m || {})[m] || 0);

  // Удобства, которые проматывают время: доставка вместо готовки
  Vibe.on("pay", (p) => { if (p && /^Vibe Eat|Eat ·|Vibe Eat/.test(p.title || "")) used("eat", 40); });

  /* ---------- Ужин руками ---------- */
  function cook(fromEl) {
    if (!live()) return;
    const b = Vibe.body ? Vibe.body.get() : null;
    if (!b || (b.fridge || 0) <= 0) {
      FX.toast("В холодильнике пусто. Можно купить продуктов — или заказать готовое", "🧊", 3200, { go: "supermarket", label: "Продукты" });
      return;
    }
    const first = (G().info().day === 0) && !(S().goalsDone || []).includes("dinner");
    const beats = first
      ? [
          { q: "В сумке мамины гречка, тушёнка и четыре картофелины. Плита газовая. Спичек нет.", a: [["Постучать к Валере", "valera"], ["Заказать доставку", "eat"]] },
          { q: "Валера протягивает коробок: «Держи. Гречку соли в конце, а то каша». Через двадцать минут пахнет домом.", a: [["Поесть", "eat_done"]] },
        ]
      : [
          { q: pick(["Что сегодня на ужин?", "Холодильник смотрит с надеждой.", "Плита свободна. Валера на смене."]), a: [["Гречка с тушёнкой", "cook"], ["Суп по маминому рецепту", "soup"], ["Нет сил — заказать", "eat"]] },
        ];
    let k = 0;
    const box = () => `<div class="ic-scene"><div class="ic-emo float">🍳</div><p class="ic-q">${esc(beats[k].q)}</p><div class="ic-ans">${beats[k].a.map((x, i) => `<button class="btn block" data-a="${i}">${esc(x[0])}</button>`).join("")}</div></div>`;
    Vibe.modal(box(), {
      sound: "pop",
      onMount(m, close) {
        m.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-a]"); if (!btn) return;
          const act = beats[k].a[+btn.dataset.a][1];
          if (act === "eat") { close(); Vibe.go("eat"); return; }
          if (act === "valera") { rel("valera", 2); k++; m.innerHTML = box(); FX.bump(m.querySelector(".ic-q")); return; }
          // Готовим: время идёт по-настоящему, награда — голосом людей
          close();
          if (Vibe.body) Vibe.body.effect("cook");
          spend(act === "soup" ? 60 : 40);
          manual("eat");
          if (fromEl) FX.burst(fromEl, { emojis: ["🍳", "🥘", "✨"], count: 12 });
          FX.toast(act === "soup" ? "Суп по маминому рецепту. Час жизни — и он того стоил" : "Ужин готов. Сорок минут, которые никто не сэкономил", "🍳", 3200);
          const x = I();
          const n = ((x.c.eat || {}).manual || 0);
          if (n === 1 || Math.random() < 0.3) later("mom", act === "soup" ? "{Сварил|Сварила} по моему рецепту?! Сфотографируй в следующий раз 🥹" : "{Сам|Сама} готовишь? Горжусь. Вот ещё рецепт, сырники 🍳", 300 + Math.floor(Math.random() * 300));
        });
      },
    });
  }

  /* ---------- Новый год у родителей ---------- */
  function newYearTick() {
    const x = I(); const inf = G().info();
    if (x.ny.year === Math.floor(inf.day / 360) || inf.day % 360 !== 59 || inf.hour < 15 || busy()) return;
    setI({ ny: { year: Math.floor(inf.day / 360) } });
    Vibe.modal(`<div class="ic-scene"><div class="ic-emo float">🎄</div>
      <p class="ic-q">Мама: «Приедешь на Новый год? Электричка сорок минут. Я холодец сделала».</p>
      <div class="ic-ans">
        <button class="btn black block" data-ny="go">Поехать к родителям</button>
        <button class="btn block" data-ny="gift">Vibe Подарки: подарок + видеопоздравление · 1 500 ₫</button>
        <button class="btn block" data-ny="skip">Не ответить сейчас</button>
      </div></div>`, {
      sound: "pop",
      onMount(m, close) {
        m.addEventListener("click", (e) => {
          const b = e.target.closest("[data-ny]"); if (!b) return;
          const v = b.dataset.ny;
          if (v === "go") {
            close();
            rel("mom", 10); rel("dad", 8);
            setTimeout(() => Vibe.modal(`<div class="ic-scene"><div class="ic-emo float">🏡</div><p class="ic-q">Мама открывает дверь раньше, чем ты звонишь. Папа делает вид, что не ждал, но стоит в куртке. Холодец, салют с балкона, ночь на старом диване.</p><button class="btn black block" data-close>Утро</button></div>`, { sound: "success", onClose: () => { if (Vibe.timeSkip) Vibe.timeSkip(16, true); later("dad", "{ДОЕХАЛ|ДОЕХАЛА}? НАПИШИ", 30); } }), 300);
            return;
          }
          close();
          if (v === "gift") {
            if (!Vibe.pay(1500, { title: "Vibe Подарки · набор «Новогодний» + видеопоздравление", emoji: "🎁", col: "c-pink" })) return;
            used("ny", 240);
            FX.toast("Видеопоздравление отправлено. Сэкономили вам 4 часа и электричку", "🎁", 3200);
            later("mom", "Спасибо за подарок, красивый. Мы тебе тарелку поставили. По привычке", 120);
            rel("mom", -2);
          } else {
            later("mom", "Мы тебе тарелку поставили. По привычке", 200);
            rel("mom", -6); rel("dad", -3);
          }
        });
      },
    });
  }

  /* ---------- Свидание: Vibe Суфлёр ---------- */
  if (Vibe.sched && Vibe.sched.on) Vibe.sched.on("date", (e) => {
    if (!e || !e.pid) return;
    const n = esc(e.pn || "Человек");
    setTimeout(() => {
      Vibe.modal(`<div class="ic-scene"><div class="ic-emo float">💘</div>
        <p class="ic-q">Свидание с ${n}. Vibe Суфлёр подскажет темы в наушник: паузы, комплименты, смех по команде.</p>
        <div class="ic-ans">
          <button class="btn block" data-d="auto">🎧 Включить Суфлёра · бесплатно 7 дней</button>
          <button class="btn black block" data-d="self">Разговаривать самому</button>
        </div></div>`, {
        sound: "pop",
        onMount(m, close) {
          m.addEventListener("click", (ev) => {
            const b = ev.target.closest("[data-d]"); if (!b) return;
            close();
            if (b.dataset.d === "auto") {
              used("date", 120);
              FX.toast("Пауза 3 секунды. Засмейся. Отлично — свидание идеальное", "🎧", 3000);
              later(e.pid, "Было мило. Но кажется, я {был|была} на свидании с твоим телефоном. Давай не будем", 600);
              rel(e.pid, -25);
            } else {
              manual("date");
              rel(e.pid, 8);
              FX.toast("Пару раз ты {сбился|сбилась}. Зато смеялись по-настоящему", "💬", 3000);
              later(e.pid, pick(["Слушай, а давай ещё раз? Только без телефона на столе 🙂", "Мне давно не было так легко. Повторим?"]), 500);
            }
          });
        },
      });
    }, 1200);
  });

  /* ---------- Бублик: выгул самому или по подписке ---------- */
  function bublikTick() {
    const x = I(); const inf = G().info();
    if (inf.hour < 19 || inf.hour > 21 || busy()) return;
    if (x.bub.ask === inf.day || inf.day % 3 !== 1) return;
    setI({ bub: Object.assign({}, x.bub, { ask: inf.day }) });
    FX.toast("Валера: «Выгуляешь Бублика? Я на смене»", "🐕", 5200, { onClick: bublikSheet, label: "Ответить" });
  }
  function bublikSheet() {
    Vibe.ui.sheet(`<div class="display" style="font-size:24px">🐕 Бублик</div>
      <p style="font-weight:700;margin:8px 0 12px">Рыжий, на коротких лапах. Не попрошайничает — присутствует.</p>
      <div class="stack">
        <button class="btn black block" data-b="walk">Погулять самому · 20 минут</button>
        <button class="btn block" data-b="pets">Vibe Pets: выгул по подписке · 290 ₫</button>
      </div>`, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          const b = e.target.closest("[data-b]"); if (!b) return;
          close();
          const x = I();
          if (b.dataset.b === "walk") {
            spend(20); manual("dog"); rel("valera", 1);
            if (Vibe.body) Vibe.body.effect("walk", { km: 1 });
            setI({ bub: Object.assign({}, x.bub, { h: Math.min(10, (x.bub.h || 3) + 1) }) });
            FX.toast("Бублик тащит к каждому столбу. Двадцать минут без экрана", "🐕", 3000);
          } else {
            if (!Vibe.pay(290, { title: "Vibe Pets · выгул по подписке", emoji: "🐕", col: "c-mint" })) return;
            used("dog", 20);
            setI({ bub: Object.assign({}, x.bub, { h: Math.max(0, (x.bub.h || 3) - 1) }) });
            FX.toast("Выгульщик Тимур уже в пути. Сэкономили вам 20 минут", "🐕", 2800);
          }
        });
      },
    });
  }
  const bublikHearts = () => (I().bub.h || 0);

  /* ---------- Бабушка Зинаида: только пешком ---------- */
  Vibe.on("arrive", (d) => {
    if (!d || d.mode !== "walk" || !live()) return;
    const x = I(); const inf = G().info();
    const dow = ((inf.day % 7) + 7) % 7;
    if (x.baba.gone || (dow !== 2 && dow !== 5) || x.baba.day === inf.day || Math.random() > 0.45) return;
    setI({ baba: Object.assign({}, x.baba, { day: inf.day, met: (x.baba.met || 0) + 1 }) });
    setTimeout(() => {
      if (busy()) return;
      const debt = x.baba.debt || 0;
      Vibe.modal(`<div class="ic-scene"><div class="ic-emo float">👵</div>
        <p class="ic-q">${debt ? "Бабушка с вареньем узнаёт тебя: «А, это ты. Как варенье?»" : "У станции бабушка продаёт варенье. Терминала нет. «Бери, потом занесёшь. Триста. За сколько лет — ни разу не обманули»."}</p>
        <div class="ic-ans">${debt ? `<button class="btn black block" data-z="pay">Отдать ${debt} ₫</button>` : `<button class="btn black block" data-z="take">Взять банку черничного</button>`}
        <button class="btn block" data-close>${debt ? "В другой раз" : "Спасибо, не надо"}</button></div></div>`, {
        sound: "pop",
        onMount(m, close) {
          m.addEventListener("click", (e) => {
            const b = e.target.closest("[data-z]"); if (!b) return;
            close();
            const y = I();
            if (b.dataset.z === "take") { setI({ baba: Object.assign({}, y.baba, { debt: 300 }) }); FX.toast("Банка черничного. Тёплая, как будто только сварили", "🫙", 2800); }
            else if (Vibe.pay(debt, { title: "Варенье у станции · долг", emoji: "🫙", col: "c-yellow", cashback: 0 })) { setI({ baba: Object.assign({}, y.baba, { debt: 0, trust: (y.baba.trust || 0) + 1 }) }); FX.toast("«Я ж говорила — ни разу не обманули»", "👵", 2800); }
          });
        },
      });
    }, 900);
  });
  // Кто ни разу не ходил пешком к станции — узнаёт о бабушке только от Валеры
  function babaTick() {
    const x = I(); const inf = G().info();
    if (x.baba.gone || inf.day < 240 || (x.baba.met || 0) > 0) return;
    setI({ baba: Object.assign({}, x.baba, { gone: true }) });
    later("valera", "Бабуля с вареньем у станции больше не стоит. Говорят, уехала к дочке", 60);
  }

  setInterval(() => {
    if (!live()) return;
    try { newYearTick(); bublikTick(); babaTick(); } catch (e) { console.error(e); }
  }, 4000);

  Vibe.intercept = { used, manual, cook, savedMin, bublikHearts, bublikSheet, stats: I };

  const css = `
  .ic-scene { text-align: center; }
  .ic-emo { font-size: 58px; line-height: 1; }
  .ic-q { font-weight: 700; margin: 12px 0 14px; text-align: left; }
  .ic-ans { display: grid; gap: 8px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
