/* ============================================================
   Мини-игры с семьёй — «живые занятия ценнее удобства».
   Vibe.mini = { fishing(params), tree(params), inviteDad(), inviteMom(), stats() }

   • Рыбалка с папой: папа зовёт в мессенджере ближе к выходным
     (или игрок сам предлагает на экране «mini-fishing»). Договорились →
     событие в Vibe.sched (kind "family", mini "fishing"), в 6:00 папа
     пишет «Я у подъезда» с кнопкой → игра: поплавок, клюёт — тап вовремя,
     между поклёвками папа разговаривает. Телефон рядом искушает.
     Награда: рыба в холодильник, фото в инвентарь, отношения с папой,
     4 часа «вручную».
   • Ёлка с мамой: в декабре мама зовёт наряжать ёлку (экран «mini-tree»).
     Перетаскивание игрушек, мама комментирует. Награда: отношения с мамой
     (и немного с папой), тёплое сообщение, 3 часа «вручную».

   Точки входа без правки чужих файлов: Vibe.msg.send(..., {actions:[{label, go}]})
   (кнопка в чате ведёт на экран), FX.toast с go, Vibe.sched-события.
   Состояние: mini = { fishWeek, fishAsk, fishPing:{evId}, treeYear, n:{fishing,tree}, manualMin, photo }
   ============================================================ */
(function () {
  if (!window.Vibe) return;
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const G = () => Vibe.game;
  const live = () => !!(S().profile && S().game && G());
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => Vibe.esc(s == null ? "" : String(s));
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const M = () => Object.assign({ n: {}, manualMin: 0 }, S().mini || {});
  const setM = (p) => set({ mini: Object.assign(M(), p) });
  const rel = (id, d) => { try { if (Vibe.people && Vibe.people.rel) Vibe.people.rel(id, d); if (Vibe.people && Vibe.people.set) Vibe.people.set(id, { last: G().info().day }); } catch (e) {} };
  const say = (id, text, opts = {}) => { try { Vibe.msg && Vibe.msg.send(id, gx(text), Object.assign({ from: id }, opts)); } catch (e) { console.error(e); } };
  // Род героя: {м|ж}, в т.ч. с пустой мужской формой ({|а}) — штатный разборщик такие не берёт
  const gx = (t) => String(t).replace(/\{([^{}|\n]{0,40})\|([^{}|\n]{0,40})\}/g, (x, m, f) => Vibe.g(m, f));
  const I = "#1b1430";
  const portrait = (e) => (Vibe.ill && Vibe.ill.raw && Vibe.ill.raw(e)) || `<span style="font-size:40px">${e}</span>`;
  // Сцена занимает реальное игровое время — «минуты вручную»
  function spendManual(kind, mins) {
    setM({ manualMin: (M().manualMin || 0) + mins, n: Object.assign({}, M().n, { [kind]: ((M().n || {})[kind] || 0) + 1 }) });
    try { if (Vibe.intercept && Vibe.intercept.manual) Vibe.intercept.manual(kind); } catch (e) {}
    if (Vibe.emit) Vibe.emit("manual", { kind, min: mins });
    if (Vibe.timeSkip) Vibe.timeSkip(mins / 60, true);
  }
  function bag() {
    const tos = new Set(), ivs = new Set(), rafs = new Set(), offs = [];
    let dead = false;
    return {
      to(fn, ms) { const id = setTimeout(() => { tos.delete(id); if (!dead) fn(); }, ms); tos.add(id); return id; },
      every(fn, ms) { const id = setInterval(() => { if (!dead) fn(); }, ms); ivs.add(id); return id; },
      stop(id) { clearTimeout(id); clearInterval(id); tos.delete(id); ivs.delete(id); },
      raf(fn) { const id = requestAnimationFrame((t) => { rafs.delete(id); if (!dead) fn(t); }); rafs.add(id); return id; },
      on(el, ev, fn, o) { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); },
      clear() { dead = true; tos.forEach(clearTimeout); ivs.forEach(clearInterval); rafs.forEach(cancelAnimationFrame); offs.forEach((f) => f()); },
    };
  }

  /* ---------- Стили (префикс mg-) ---------- */
  const st = document.createElement("style");
  st.textContent = `
  .mg-scene{position:relative;border:3px solid var(--ink);border-radius:26px;overflow:hidden;background:#8fd8ff;box-shadow:var(--shadow-sm);touch-action:manipulation;user-select:none;-webkit-user-select:none}
  .mg-scene svg.mg-bg{display:block;width:100%;height:auto}
  .mg-hud{position:absolute;left:10px;right:10px;top:10px;display:flex;justify-content:space-between;gap:6px;pointer-events:none;z-index:3}
  .mg-hud .badge{background:#fff;font-size:12px;padding:5px 10px;box-shadow:0 2px 0 var(--ink)}
  .mg-alert{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);font-family:var(--font-display);font-size:44px;color:#ff4b3e;-webkit-text-stroke:2px var(--ink);pointer-events:none;opacity:0;z-index:3}
  .mg-alert.on{animation:mg-alert .5s var(--spring) forwards}
  @keyframes mg-alert{0%{opacity:0;transform:translate(-50%,-30%) scale(.4)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
  .mg-tap{position:absolute;left:0;right:0;bottom:10px;text-align:center;font-weight:800;font-size:13px;color:#fff;text-shadow:0 2px 0 var(--ink);pointer-events:none;z-index:3}
  .mg-dad{display:flex;gap:10px;align-items:flex-end;margin-top:12px}
  .mg-ava{width:62px;height:62px;flex:0 0 62px;border-radius:50%;border:3px solid var(--ink);background:var(--sky);overflow:hidden;box-shadow:var(--shadow-sm)}
  .mg-ava svg{width:100%;height:100%;display:block}
  .mg-ava.mom{background:var(--mint)}
  .mg-bub{position:relative;flex:1;min-height:52px;background:#fff;border:2.5px solid var(--ink);border-radius:18px 18px 18px 4px;padding:9px 12px;font-weight:700;font-size:14px;line-height:1.3;box-shadow:var(--shadow-sm)}
  .mg-bub small{display:block;font-size:11px;font-weight:800;color:var(--muted);margin-bottom:2px}
  .mg-bub.pop{animation:pop-in .35s var(--spring) both}
  .mg-notif{position:absolute;left:10px;right:10px;top:46px;z-index:4;display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.96);border:2.5px solid var(--ink);border-radius:16px;padding:8px 10px;box-shadow:0 4px 0 var(--ink);animation:pop-in .3s var(--spring) both}
  .mg-notif b{display:block;font-size:12px}.mg-notif span{font-size:11px;font-weight:700;color:var(--muted)}
  .mg-notif .btn{margin-left:auto;flex:0 0 auto}
  .mg-phone{position:absolute;inset:0;z-index:5;background:#0e0e12;color:#fff;display:grid;place-items:center;text-align:center;padding:20px;font-weight:800}
  .mg-phone .e{font-size:48px;display:block;margin-bottom:8px}
  .mg-catch{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
  .mg-catch .badge{background:#fff;font-size:12px;padding:4px 8px;display:inline-flex;align-items:center;gap:4px}
  .mg-catch svg{width:28px;height:18px}
  .mg-start{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px;background:rgba(255,244,224,.88)}
  .mg-start .display{font-size:26px}
  .mg-start p{font-weight:700;font-size:13px;max-width:280px}
  .mg-plan{display:flex;gap:12px;align-items:center}
  .mg-tree{position:relative;border:3px solid var(--ink);border-radius:26px;overflow:hidden;background:#2a2340;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:var(--shadow-sm)}
  .mg-tree svg.mg-bg{display:block;width:100%;height:auto}
  .mg-orn{position:absolute;width:13%;aspect-ratio:1;margin:-6.5% 0 0 -6.5%;touch-action:none;cursor:grab;z-index:2;transition:transform .15s}
  .mg-orn svg{width:100%;height:100%;display:block;overflow:visible;pointer-events:none}
  .mg-orn.drag{z-index:5;transform:scale(1.25);cursor:grabbing;transition:none}
  .mg-orn.hung{transform:scale(.92)}
  .mg-orn.back{transition:left .35s var(--spring),top .35s var(--spring)}
  .mg-box{position:absolute;left:3%;right:3%;bottom:2%;height:23%;border:3px solid var(--ink);border-radius:16px;background:#ff8a1f;z-index:1;box-shadow:0 4px 0 var(--ink)}
  .mg-box::after{content:"ИГРУШКИ · НЕ КАНТОВАТЬ";position:absolute;left:0;right:0;bottom:4px;text-align:center;font-size:8px;font-weight:900;letter-spacing:1px;color:var(--ink);opacity:.7}
  .mg-lights circle{animation:mg-blink 1s steps(1) infinite}
  .mg-lights circle:nth-child(3n){animation-delay:-.33s}.mg-lights circle:nth-child(3n+1){animation-delay:-.66s}
  @keyframes mg-blink{50%{opacity:.25}}
  .mg-tree.lit .mg-lights{display:inline}
  .mg-lights{display:none}
  `;
  document.head.appendChild(st);

  /* ============================================================
     РЫБАЛКА С ПАПОЙ
     ============================================================ */
  const FISH = [
    { id: "plotva", n: "Плотва", c: "#c9b6ff", g: [120, 320], w: 34 },
    { id: "okun", n: "Окунь", c: "#c6ff4d", g: [150, 450], w: 30, stripes: true },
    { id: "karas", n: "Карась", c: "#ffd23f", g: [200, 600], w: 22 },
    { id: "shchuka", n: "Щука", c: "#35c47a", g: [900, 2600], w: 6, long: true },
    { id: "boot", n: "Ботинок", c: "#7a4a2b", g: [400, 400], w: 8, boot: true },
  ];
  function fishSvg(f, w = 90) {
    if (f.boot) return `<svg viewBox="0 0 100 64" width="${w}"><path d="M28 6 H54 V36 Q82 36 90 48 V58 H14 Q10 58 12 48 Z" fill="${f.c}" stroke="${I}" stroke-width="3.5" stroke-linejoin="round"/><path d="M28 16 H54 M28 26 H54" stroke="${I}" stroke-width="2.5"/><path d="M12 52 H90" stroke="${I}" stroke-width="3"/><path d="M62 40 l4 -6 M70 42 l4 -6" stroke="${I}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    const L = f.long;
    const body = L ? `<ellipse cx="46" cy="32" rx="38" ry="12" fill="${f.c}" stroke="${I}" stroke-width="3.5"/>` : `<ellipse cx="46" cy="32" rx="30" ry="19" fill="${f.c}" stroke="${I}" stroke-width="3.5"/>`;
    const stripes = f.stripes ? `<path d="M38 15 Q35 32 38 49 M50 14 Q47 32 50 50 M62 17 Q59 32 62 47" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/>` : "";
    return `<svg viewBox="0 0 100 64" width="${w}"><path d="M${L ? 82 : 74} 32 L96 14 L92 32 L96 50 Z" fill="${f.stripes ? "#ff4b3e" : f.c}" stroke="${I}" stroke-width="3.5" stroke-linejoin="round"/>${body}${stripes}<path d="M44 ${L ? 22 : 14} Q52 ${L ? 14 : 4} 60 ${L ? 22 : 14}" fill="${f.stripes ? "#ff4b3e" : "#fff"}" stroke="${I}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${L ? 18 : 26}" cy="28" r="5" fill="#fff" stroke="${I}" stroke-width="2.5"/><circle cx="${L ? 17 : 25}" cy="29" r="2.4" fill="${I}"/><path d="M${L ? 9 : 17} 37 Q${L ? 14 : 22} 40 ${L ? 19 : 27} 37" fill="none" stroke="${I}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  const pickFish = () => { let r = Math.random() * FISH.reduce((s, f) => s + f.w, 0); for (const f of FISH) { r -= f.w; if (r <= 0) return f; } return FISH[0]; };
  const DAD_TALK = [
    "Червей я с вечера накопал. Жирные. Не то что в магазине",
    "Мать говорит, ты похудел{|а}. Я говорю — повзрослел{|а}",
    "В твоём возрасте я уже… А, неважно. Клюёт?",
    "Тут главное не дёргаться. И в рыбалке, и вообще",
    "Я на этом месте ещё с дедом сидел. Он тоже молчал. Хорошо молчал",
    "Работа как? Только честно, без «нормально»",
    "Телефон убери. Рыба экран не любит",
    "Я тут понял: рыбалка — это когда можно молчать вдвоём, и это не странно",
    "Помнишь, ты маленьк{им|ой} упал{|а} с мостков? Мать до сих пор не знает",
    "Чай будешь? Из термоса. С лимоном, как ты любил{|а}",
    "Гараж, кстати, всё ещё стоит. Ключи у тебя есть",
    "Ты звони почаще. Не мне — матери. Ну и мне можно",
    "Говорят, сейчас есть приложение, которое рыбу ловит. Брехня",
    "Тише. Тише… Нет, показалось",
  ];
  const DAD_REACT = {
    early: ["Рано! Не дёргай, пусть заглотит", "Спугнул{|а}. Ничего, она вернётся. Наверное", "Терпение. Это не кнопка «купить»"],
    miss: ["Сорвалась… Бывает. У меня в восьмидесятом лещ ушёл — до сих пор снится", "Эх! Подсекать надо было. Ну, ещё будет", "Ушла. Зато красиво ушла"],
    small: ["Есть! Мелкая, но наша", "Ну вот. Коту на ужин", "Молодец. Руки помнят"],
    big: ["Ого! Вот это я понимаю! Мать не поверит — фоткай", "Вот это да… Дед бы гордился", "Хороша! Сейчас подсачек… Есть!"],
    boot: ["Ботинок! Сорок третий. Мой, кстати, потерял в прошлом году", "Ну, тоже улов. Левый. Правый поищем в следующий раз"],
    phone: ["Опять телефон… Ладно-ладно, я молчу", "Там что, важнее, чем тут?", "Поплавок тоже экран. Только живой"],
    ignore: ["Правильно. Подождут", "Вот. Вот так и надо"],
  };
  const NOTIFS = [
    ["Vibe Market", "Удочки −70%! Только сегодня (и всегда)"],
    ["Vibe Gram", "Тебя отметили в сторис. Ты не на ней"],
    ["Vibe Job", "Начальник: «Есть минутка? Нет? Ну ладно»"],
    ["Vibe Eat", "Уха с доставкой за 25 минут. Зачем ловить?"],
    ["Vibe Fish", "Рыбалка онлайн: поймай карася, не вставая"],
  ];

  function fishingScene() {
    // Флэт-пейзаж: небо, солнце, холмы, озеро, камыш. Поплавок и леска — отдельными группами
    const reeds = (x, h, c) => `<path d="M${x} 300 Q${x - 4} ${300 - h / 2} ${x + 2} ${300 - h}" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/><ellipse cx="${x + 2}" cy="${300 - h + 10}" rx="4.5" ry="11" fill="${c}" stroke="${I}" stroke-width="2.5"/>`;
    return `<svg class="mg-bg" viewBox="0 0 360 300" aria-hidden="true">
      <rect width="360" height="300" fill="#8fd8ff"/>
      <g><circle cx="292" cy="58" r="30" fill="#ffd23f" stroke="${I}" stroke-width="3.5"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r1 = 38, r2 = 48, c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); return `<path d="M${292 + c * r1} ${58 + s * r1} L${292 + c * r2} ${58 + s * r2}" stroke="${I}" stroke-width="3" stroke-linecap="round"/>`; }).join("")}
        <path d="M280 62 Q292 72 304 62" fill="none" stroke="${I}" stroke-width="2.5" stroke-linecap="round"/><circle cx="282" cy="52" r="2.6" fill="${I}"/><circle cx="302" cy="52" r="2.6" fill="${I}"/></g>
      <path d="M40 54 q6 -14 20 -8 q8 -10 20 0 q12 0 10 10 h-52 q-8 0 2 -2 z" fill="#fff" stroke="${I}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M150 34 q5 -10 15 -6 q7 -8 16 0 q9 0 8 8 h-41 z" fill="#fff" stroke="${I}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-10 150 Q60 96 130 128 Q190 92 250 124 Q310 100 370 130 V160 H-10 Z" fill="#35c47a" stroke="${I}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M200 120 l10 -26 l10 26 z M222 122 l8 -20 l8 20 z" fill="#1f8a52" stroke="${I}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="-5" y="146" width="370" height="160" fill="#2f5bff" stroke="${I}" stroke-width="3.5"/>
      <g fill="none" stroke="#8fd8ff" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M30 182 q10 -6 20 0 t20 0"/><path d="M250 172 q10 -6 20 0 t20 0"/><path d="M90 250 q10 -6 20 0 t20 0"/><path d="M270 262 q10 -6 20 0 t20 0"/></g>
      <path d="M-5 300 V240 Q30 226 70 236 L60 300 Z" fill="#7a4a2b" stroke="${I}" stroke-width="3.5" stroke-linejoin="round"/>
      ${reeds(300, 90, "#7a4a2b")}${reeds(314, 70, "#7a4a2b")}${reeds(328, 96, "#7a4a2b")}${reeds(80, 60, "#7a4a2b")}
      <path d="M-10 312 L120 90" stroke="${I}" stroke-width="7" stroke-linecap="round"/><path d="M-10 312 L120 90" stroke="#ff8a1f" stroke-width="3.5" stroke-linecap="round"/>
      <path data-line d="M120 90 Q170 140 210 196" fill="none" stroke="${I}" stroke-width="1.6"/>
      <g data-ripple opacity="0"><ellipse cx="210" cy="206" rx="22" ry="6" fill="none" stroke="#fff" stroke-width="2.5"/><ellipse cx="210" cy="206" rx="36" ry="10" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/></g>
      <g data-bob transform="translate(210 196)">
        <path d="M0 -26 V-10" stroke="${I}" stroke-width="2.5" stroke-linecap="round"/><circle cx="0" cy="-27" r="3" fill="#ffd23f" stroke="${I}" stroke-width="2"/>
        <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#ff4b3e" stroke="${I}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-9 0 A9 11 0 0 0 9 0 Z" fill="#fff" stroke="${I}" stroke-width="3" stroke-linejoin="round"/>
        <rect x="-11" y="4" width="22" height="20" fill="#2f5bff"/>
      </g>
      <path d="M180 206 H240" stroke="#2f5bff" stroke-width="0"/>
    </svg>`;
  }

  // План: событие в календаре и сообщения
  const SAT = () => { const d = G().info().day; let x = d + 1; while (x % 7 !== 5) x++; return x; };
  const fishEv = () => (Vibe.sched ? Vibe.sched.list().find((e) => e.mini === "fishing" && e.status === "planned") : null);
  function planFishing(fromMe) {
    if (!live() || !Vibe.sched) return null;
    if (fishEv()) return fishEv();
    const day = SAT();
    const ev = Vibe.sched.add({ day, hour: 6, min: 0, dur: 300, title: "Рыбалка с папой", e: "🎣", kind: "family", mini: "fishing", who: "dad" });
    setM({ fishWeek: Math.floor(day / 7), fishAsk: null });
    if (fromMe) {
      try { Vibe.msg.send("dad", "Пап, поехали в субботу на рыбалку?", { from: "me" }); } catch (e) {}
      say("dad", "ПОЕХАЛИ. В 6:00 У ПОДЪЕЗДА. ЧЕРВЕЙ ВОЗЬМУ", { delay: 25 });
    } else {
      try { Vibe.msg.send("dad", "Поеду! Ставлю будильник", { from: "me" }); } catch (e) {}
      say("dad", "ОК. 6:00. ТЁПЛОЕ ВОЗЬМИ", { delay: 15 });
    }
    return ev;
  }

  function fishing(root, params = {}) {
    const sc = bag();
    const ev = params.ev ? (Vibe.sched && Vibe.sched.get(params.ev)) : fishEv();
    const ready = params.play || (ev && Vibe.sched && ["wait", "live"].includes(Vibe.sched.phase(ev).phase));
    if (!ready) {
      const planned = ev;
      root.innerHTML = `
        ${Vibe.ui.head("Рыбалка с папой", "без приложения")}
        <div class="card c-sky mg-plan"><div class="mg-ava">${portrait("👨")}</div><div style="flex:1;min-width:0">
          <b style="display:block;font-size:16px">${planned ? "Договорились!" : "Папа давно зовёт"}</b>
          <span style="font-size:13px;font-weight:700">${planned ? `Суббота, 6:00 у подъезда. Удочки у папы, термос тоже. Приходи вовремя — он будет стоять в куртке с 5:40.` : "Озеро за гаражами, 6 утра, термос с чаем. Без вайфая. Рыба, кстати, тоже без вайфая."}</span></div></div>
        ${planned ? `<button class="btn black block xl" data-go="calendar" style="margin-top:14px">Посмотреть в календаре 📅</button>`
          : `<button class="btn black block xl" data-plan style="margin-top:14px">Позвать папу на рыбалку 🎣</button>
             <button class="btn block" data-vibefish style="margin-top:10px">Vibe Fish: рыбалка онлайн · 99 ₫</button>`}
        <div class="fine">Рыбалка занимает 4–5 часов игрового времени. Их никто не вернёт. Именно поэтому они того стоят.</div>`;
      sc.on(root, "click", (e) => {
        if (e.target.closest("[data-plan]")) { planFishing(true); fishing(root, params); }
        else if (e.target.closest("[data-vibefish]")) {
          if (!Vibe.pay || !Vibe.pay(99, { title: "Vibe Fish · онлайн-рыбалка", emoji: "🐟", col: "c-sky" })) return;
          if (Vibe.intercept) Vibe.intercept.used("fishing", 240);
          FX.toast(gx("Ты поймал{|а} 12 виртуальных карасей. Папа поймал настоящих. Один"), "🐟", 3400);
          say("dad", "Я ТУТ НА ОЗЕРЕ. ОДИН. КЛЮЁТ ХОРОШО", { delay: 90 });
          rel("dad", -2);
        }
      });
      return () => sc.clear();
    }

    root.innerHTML = `
      ${Vibe.ui.head("Рыбалка с папой", "озеро за гаражами")}
      <div class="mg-scene" data-scene>
        ${fishingScene()}
        <div class="mg-hud"><span class="badge">🎣 заброс <b data-cast>1</b>/6</span><span class="badge">🐟 <b data-kg>0</b> г</span></div>
        <div class="mg-alert" data-alert>!</div>
        <div class="mg-tap" data-tip>Жди поклёвку. Тапай, когда поплавок нырнёт</div>
        <div class="mg-start" data-start>
          <div class="display">6:04. Туман над водой</div>
          <p>Поплавок нырнул — тапай по воде. Дёрнешь раньше — спугнёшь. Опоздаешь — сорвётся. Папа будет рядом. Телефон тоже.</p>
          <button class="btn black xl" data-go-fish>Забросить 🎣</button>
        </div>
      </div>
      <div class="mg-dad"><div class="mg-ava">${portrait("👨")}</div><div class="mg-bub" data-bub><small>Папа</small>${Vibe.g("Ну что, сын… Садись. Тут хорошо.", "Ну что, дочка… Садись. Тут хорошо.")}</div></div>
      <div class="mg-catch" data-catch></div>`;
    const scene = $(root, "[data-scene]"), bob = $(root, "[data-bob]"), ripple = $(root, "[data-ripple]"), line = $(root, "[data-line]");
    const alertEl = $(root, "[data-alert]"), tip = $(root, "[data-tip]"), bub = $(root, "[data-bub]");
    let state = "idle", cast = 0, biteAt = 0, win = 0, phoneOpen = false, phoneLooks = 0, phoneIgnored = 0, early = 0, missed = 0;
    const catches = [];
    let talkI = Math.floor(Math.random() * DAD_TALK.length);
    const dad = (t) => { bub.innerHTML = `<small>Папа</small>${esc(gx(t))}`; bub.classList.remove("pop"); void bub.offsetWidth; bub.classList.add("pop"); };
    const talk = () => { dad(DAD_TALK[talkI++ % DAD_TALK.length]); };

    // Поплавок: базовое покачивание + поклёвки (атрибут transform — без CSS-искажений)
    let dip = 0, dipTarget = 0, t0 = performance.now();
    (function loop(t) {
      dip += (dipTarget - dip) * 0.25;
      const y = 196 + Math.sin((t - t0) / 520) * 2.2 + dip;
      bob.setAttribute("transform", `translate(210 ${y.toFixed(2)})`);
      line.setAttribute("d", `M120 90 Q170 ${140 + dip * 0.5} 210 ${(y - 26).toFixed(1)}`);
      sc.raf(loop);
    })(t0);
    const twitch = (d = 5) => { dipTarget = d; sc.to(() => { dipTarget = 0; }, 140); ripple.setAttribute("opacity", ".9"); sc.to(() => ripple.setAttribute("opacity", "0"), 400); };

    function nextCast() {
      if (cast >= 6) return finish();
      cast++;
      $(root, "[data-cast]").textContent = cast;
      state = "wait";
      tip.textContent = "Жди поклёвку. Тапай, когда поплавок нырнёт";
      const waitMs = rand(2600, 5200);
      if (cast > 1 && Math.random() < 0.75) sc.to(talk, 700);
      // Искушение: уведомление на телефоне во время ожидания
      if (cast > 1 && Math.random() < 0.45) sc.to(() => { if (state === "wait" || state === "nibble") notif(); }, rand(500, waitMs - 400));
      sc.to(nibble, waitMs);
    }
    function nibble() {
      if (state !== "wait") return;
      state = "nibble";
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) sc.to(() => { if (state === "nibble") twitch(4 + Math.random() * 3); }, i * rand(380, 620));
      sc.to(bite, n * 600 + rand(200, 700));
    }
    function bite() {
      if (state !== "nibble") return;
      state = "bite";
      win = Math.max(420, 950 - cast * 55);
      biteAt = performance.now();
      dipTarget = 16;
      ripple.setAttribute("opacity", "1");
      alertEl.classList.remove("on"); void alertEl.offsetWidth; alertEl.classList.add("on");
      FX.haptic && FX.haptic([20, 30, 20]);
      tip.textContent = "КЛЮЁТ! Тапай!";
      sc.to(() => {
        if (state !== "bite") return;
        state = "result"; missed++;
        dipTarget = 0; ripple.setAttribute("opacity", "0"); alertEl.classList.remove("on");
        dad(pick(DAD_REACT.miss));
        tip.textContent = phoneOpen ? gx("Пока ты смотрел{|а} в телефон, рыба ушла") : "Сорвалась…";
        sc.to(nextCast, 1800);
      }, win);
    }
    function hook() {
      if (state === "wait" || state === "nibble") {
        early++;
        state = "result";
        dad(pick(DAD_REACT.early));
        tip.textContent = "Рано. Рыба ушла";
        FX.shake(scene);
        sc.to(nextCast, 1600);
        return;
      }
      if (state !== "bite") return;
      state = "result";
      const rt = performance.now() - biteAt;
      const k = clamp(1 - rt / win, 0.15, 1);
      const f = pickFish();
      const g = f.boot ? 400 : Math.round((f.g[0] + (f.g[1] - f.g[0]) * (0.25 + 0.75 * k * Math.random() + 0.25 * k)) / 10) * 10;
      catches.push({ f, g });
      alertEl.classList.remove("on"); dipTarget = -6; sc.to(() => { dipTarget = 0; }, 300);
      const total = catches.filter((c) => !c.f.boot).reduce((s, c) => s + c.g, 0);
      $(root, "[data-kg]").textContent = Vibe.fmt ? Vibe.fmt(total) : total;
      const big = !f.boot && g >= (f.g[0] + f.g[1]) / 2;
      dad(pick(f.boot ? DAD_REACT.boot : big ? DAD_REACT.big : DAD_REACT.small));
      tip.textContent = f.boot ? "Ботинок. Тоже опыт" : `${f.n}, ${g} г! Реакция ${Math.round(rt)} мс`;
      // Показ улова
      const pop = document.createElement("div");
      pop.className = "mg-start";
      pop.style.background = "rgba(255,244,224,.7)";
      pop.innerHTML = `<div class="fz-popin" style="animation:pop-in .4s var(--spring) both">${fishSvg(f, 150)}</div><div class="display" style="font-size:24px">${f.n}${f.boot ? "" : ` · ${g} г`}</div>`;
      scene.appendChild(pop);
      FX.burst && FX.burst(pop, { emojis: f.boot ? ["👞", "💧"] : ["💧", "✨", "🐟"], count: 10, spread: 90 });
      sc.to(() => pop.remove(), 1500);
      $(root, "[data-catch]").insertAdjacentHTML("beforeend", `<span class="badge">${fishSvg(f, 28)}${f.n}${f.boot ? "" : ` ${g} г`}</span>`);
      sc.to(nextCast, 1900);
    }
    function notif() {
      if ($(scene, ".mg-notif") || phoneOpen) return;
      const [app, text] = pick(NOTIFS);
      const n = document.createElement("div");
      n.className = "mg-notif";
      n.innerHTML = `<span style="font-size:22px">📱</span><div style="min-width:0"><b>${esc(app)}</b><span>${esc(text)}</span></div><button class="btn sm black" data-look>Глянуть</button>`;
      scene.appendChild(n);
      const killId = sc.to(() => { if (n.isConnected) { n.remove(); phoneIgnored++; if (Math.random() < 0.6) dad(pick(DAD_REACT.ignore)); } }, 3200);
      n.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (!e.target.closest("[data-look]")) return;
        sc.stop(killId); n.remove();
        phoneLooks++; phoneOpen = true;
        const ph = document.createElement("div");
        ph.className = "mg-phone";
        ph.innerHTML = `<div><span class="e">📱</span>${esc(app)}<br><span style="font-weight:700;opacity:.75;font-size:13px">${esc(text)}</span><br><span style="font-size:11px;opacity:.5">листаем… ещё чуть-чуть…</span></div>`;
        scene.appendChild(ph);
        dad(pick(DAD_REACT.phone));
        sc.to(() => { ph.remove(); phoneOpen = false; }, 2600);
      });
    }
    sc.on(scene, "pointerdown", (e) => {
      if (e.target.closest(".mg-start") || e.target.closest(".mg-notif")) return;
      if (phoneOpen) return;
      e.preventDefault();
      if (state === "wait" || state === "nibble" || state === "bite") hook();
    });
    sc.on($(root, "[data-go-fish]"), "click", () => { $(root, "[data-start]").remove(); dad("Закидывай вон туда, к кувшинкам. Ага. Теперь ждём"); sc.to(nextCast, 900); });

    function finish() {
      state = "done";
      const fish = catches.filter((c) => !c.f.boot);
      const grams = fish.reduce((s, c) => s + c.g, 0);
      const portions = fish.length ? clamp(Math.round(grams / 400), 1, 6) : 0;
      const relD = clamp(3 + fish.length + (phoneLooks ? -phoneLooks * 2 : 2) + (catches.some((c) => c.f.boot) ? 1 : 0), 1, 12);
      const firstPhoto = !M().photo;
      const best = fish.slice().sort((a, b) => b.g - a.g)[0];
      const line = phoneLooks ? "Папа говорит, что было хорошо. Про телефон не говорит. Но запомнил." : "Ни разу не достал{|а} телефон. Папа это заметил. Он не скажет, но заметил.";
      Vibe.modal(`
        <div class="m-emo float">${best ? fishSvg(best.f, 110) : "🎣"}</div>
        <div class="display" style="font-size:26px">${fish.length ? `Улов: ${fish.length} шт · ${Vibe.fmt ? Vibe.fmt(grams) : grams} г` : "Сегодня не клевало"}</div>
        <p>${gx(line)}</p>
        <div class="stack" style="gap:6px;text-align:left;margin:4px 0 12px;font-weight:800;font-size:13px">
          ${portions ? `<div>🧊 В холодильник: +${portions} порц. (мама сварит уху)</div>` : `<div>🧊 Рыбы нет, но мама всё равно накормит</div>`}
          <div>❤️ Папа: +${relD}</div>
          <div>🕰 5 часов вручную — без перемотки</div>
          ${firstPhoto ? `<div>📸 «Фото с папой на озере» — в вещи (настроение +2)</div>` : ""}
        </div>
        <button class="btn black block xl" data-close>Домой</button>`, {
        sound: "success",
        onClose() {
          rel("dad", relD);
          if (portions && Vibe.body) Vibe.body.effect("groceries", { amount: portions * 220 });
          if (firstPhoto && Vibe.inv) { Vibe.inv.add({ id: "photo_dad_lake", name: "Фото с папой на озере", e: "📸", cat: "home", bonus: { mood: 2 } }); setM({ photo: true }); }
          if (ev && Vibe.sched && Vibe.sched.get(ev.id) && Vibe.sched.get(ev.id).status === "planned") Vibe.sched.attend(ev.id, { late: 0 });
          spendManual("fishing", 300);
          if (Vibe.skills && Vibe.skills.xp) try { Vibe.skills.xp("charisma", 2); } catch (e) {}
          say("dad", best ? `ДОЕХАЛ${Vibe.g("", "А")}? МАТЬ УХУ ВАРИТ. ${best.f.n.toUpperCase()} БЫЛ${best.f.id === "plotva" || best.f.id === "shchuka" ? "А" : ""} ХОРОШ${best.f.id === "plotva" || best.f.id === "shchuka" ? "А" : ""}. В СУББОТУ ЕЩЁ?` : "НИЧЕГО. В СЛЕДУЮЩИЙ РАЗ ВОЗЬМЁМ МОТЫЛЯ. ХОРОШО ПОСИДЕЛИ", { delay: 40 });
          FX.confetti && FX.confetti({ count: 60 });
          Vibe.back ? Vibe.back() : Vibe.go("home");
        },
      });
    }
    return () => sc.clear();
  }

  /* ============================================================
     ЁЛКА С МАМОЙ
     ============================================================ */
  // Игрушки: id, рисунок (viewBox -20..20), реплика мамы
  const ORN = [
    { id: "ball1", svg: () => `<path d="M-3 -16 h6 v4 h-6 z" fill="#ffd23f" stroke="${I}" stroke-width="2"/>${ball("#ff6bcb", "dots")}` },
    { id: "ball2", svg: () => `<path d="M-3 -16 h6 v4 h-6 z" fill="#ffd23f" stroke="${I}" stroke-width="2"/>${ball("#c6ff4d", "stripes")}` },
    { id: "ball3", svg: () => `<path d="M-3 -16 h6 v4 h-6 z" fill="#ffd23f" stroke="${I}" stroke-width="2"/>${ball("#8fd8ff", "plain")}` },
    { id: "ball4", svg: () => `<path d="M-3 -16 h6 v4 h-6 z" fill="#ffd23f" stroke="${I}" stroke-width="2"/>${ball("#ff4b3e", "star")}` },
    { id: "cone", say: "Это бабушкина шишка. Стеклянная, ей лет шестьдесят. Повыше её, от кота", svg: () => `<path d="M0 -17 V-12" stroke="${I}" stroke-width="2"/><path d="M0 -12 C10 -8 10 10 0 17 C-10 10 -10 -8 0 -12 Z" fill="#ffd23f" stroke="${I}" stroke-width="2.5"/><path d="M-6 -4 Q0 0 6 -4 M-7 4 Q0 8 7 4 M-4 11 Q0 13 4 11" fill="none" stroke="${I}" stroke-width="1.8"/><path d="M-3 -8 Q-5 -2 -4 2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` },
    { id: "icicle", say: "Сосульку папа в девяностых купил. Говорил — последняя в магазине. Врал, наверное", svg: () => `<path d="M-6 -15 H6 L1 17 Z" fill="#8fd8ff" stroke="${I}" stroke-width="2.5" stroke-linejoin="round"/><path d="M-2 -12 L0 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` },
    { id: "bird", say: "Птичку на прищепке — на край ветки, чтобы как будто сидит", svg: () => `<ellipse cx="0" cy="2" rx="12" ry="8" fill="#ffd23f" stroke="${I}" stroke-width="2.5"/><circle cx="8" cy="-5" r="6" fill="#ffd23f" stroke="${I}" stroke-width="2.5"/><path d="M13 -5 l5 1 l-5 2 z" fill="#ff8a1f" stroke="${I}" stroke-width="1.6"/><circle cx="9" cy="-6" r="1.6" fill="${I}"/><path d="M-12 0 L-19 -6 L-17 4 Z" fill="#ff6bcb" stroke="${I}" stroke-width="2"/><path d="M-4 0 Q0 6 5 1" fill="none" stroke="${I}" stroke-width="2"/>` },
    { id: "cosmo", say: () => `Космонавта ты в садике сам${Vibe.g("", "а")} клеил${Vibe.g("", "а")}. Я его каждый год достаю`, svg: () => `<rect x="-9" y="-2" width="18" height="16" rx="5" fill="#fff" stroke="${I}" stroke-width="2.5"/><circle cx="0" cy="-8" r="9" fill="#fff" stroke="${I}" stroke-width="2.5"/><rect x="-6" y="-12" width="12" height="8" rx="4" fill="#2f5bff" stroke="${I}" stroke-width="2"/><path d="M-3 -10 h3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M-5 4 h4" stroke="#ff4b3e" stroke-width="3" stroke-linecap="round"/>` },
    { id: "star", star: true, svg: () => `<path d="M0 -18 L5 -6 L18 -5 L8 3 L11 16 L0 9 L-11 16 L-8 3 L-18 -5 L-5 -6 Z" fill="#ffd23f" stroke="${I}" stroke-width="2.8" stroke-linejoin="round"/><circle cx="-3" cy="-2" r="1.8" fill="${I}"/><circle cx="4" cy="-2" r="1.8" fill="${I}"/><path d="M-3 3 Q0.5 6 4 3" fill="none" stroke="${I}" stroke-width="1.8" stroke-linecap="round"/>` },
  ];
  function ball(c, pat) {
    const base = `<circle cx="0" cy="0" r="13" fill="${c}" stroke="${I}" stroke-width="2.5"/>`;
    const p = pat === "dots" ? `<circle cx="-5" cy="-3" r="2" fill="#fff"/><circle cx="4" cy="-6" r="2" fill="#fff"/><circle cx="5" cy="4" r="2" fill="#fff"/><circle cx="-3" cy="6" r="2" fill="#fff"/>`
      : pat === "stripes" ? `<path d="M-12 -4 Q0 0 12 -4 M-12 4 Q0 8 12 4" fill="none" stroke="${I}" stroke-width="2.2"/>`
        : pat === "star" ? `<path d="M0 -6 L2 -2 L6 -2 L3 1 L4 6 L0 3 L-4 6 L-3 1 L-6 -2 L-2 -2 Z" fill="#ffd23f" stroke="${I}" stroke-width="1.6" stroke-linejoin="round"/>` : "";
    return base + p + `<path d="M-7 -6 Q-5 -9 -2 -10" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
  // Ёлка в координатах 0..300 × 0..360. Ярусы-треугольники (проверка попадания)
  const TIERS = [[150, 40, 92, 130], [150, 95, 120, 205], [150, 160, 140, 270]]; // [cx, top, halfBase, bottom]
  const inTree = (x, y) => TIERS.some(([cx, top, hb, bot]) => y >= top && y <= bot && Math.abs(x - cx) <= hb * ((y - top) / (bot - top)));
  const STAR_AT = [150, 34];
  function treeSvg() {
    const tier = ([cx, top, hb, bot], c) => `<path d="M${cx} ${top} L${cx + hb} ${bot} Q${cx} ${bot + 12} ${cx - hb} ${bot} Z" fill="${c}" stroke="${I}" stroke-width="3.5" stroke-linejoin="round"/>`;
    const lights = [];
    for (let i = 0; i < 26; i++) { const y = 70 + i * 7.6; const tt = TIERS.find(([cx, top, hb, bot]) => y >= top + 8 && y <= bot - 4) || TIERS[2]; const w = tt[2] * ((y - tt[1]) / (tt[3] - tt[1])) * 0.8; const x = 150 + Math.sin(i * 1.9) * w; lights.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="${["#ffd23f", "#ff6bcb", "#c6ff4d", "#8fd8ff"][i % 4]}" stroke="${I}" stroke-width="1.5"/>`); }
    return `<svg class="mg-bg" viewBox="0 0 300 360" aria-hidden="true">
      <rect width="300" height="360" fill="#2a2340"/>
      <rect x="196" y="22" width="84" height="96" rx="6" fill="#8b5cf6" stroke="${I}" stroke-width="3"/><path d="M238 22 V118 M196 70 H280" stroke="${I}" stroke-width="3"/>
      ${[[210, 40], [256, 52], [222, 92], [266, 100], [244, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/>`).join("")}
      <rect x="0" y="300" width="300" height="60" fill="#7a4a2b"/><path d="M0 300 H300" stroke="${I}" stroke-width="3"/>
      <rect x="136" y="268" width="28" height="30" fill="#7a4a2b" stroke="${I}" stroke-width="3"/>
      <path d="M118 290 H182 L176 318 H124 Z" fill="#ff4b3e" stroke="${I}" stroke-width="3" stroke-linejoin="round"/>
      ${tier(TIERS[2], "#1f8a52")}${tier(TIERS[1], "#35c47a")}${tier(TIERS[0], "#35c47a")}
      <g fill="none" stroke="#1f8a52" stroke-width="2.5" stroke-linecap="round" opacity=".9"><path d="M120 120 l10 -8 M180 118 l-10 -8 M106 190 l12 -10 M196 190 l-12 -10 M96 254 l12 -10 M206 254 l-12 -10"/></g>
      <circle cx="${STAR_AT[0]}" cy="${STAR_AT[1]}" r="13" fill="none" stroke="#ffd23f" stroke-width="2" stroke-dasharray="3 4" data-starslot/>
      <g class="mg-lights">${lights.join("")}</g>
    </svg>`;
  }
  const MOM = {
    hi: ["Ой, {пришёл|пришла}! Разувайся. Игрушки на антресолях были, папа достал, чихал полчаса", "Наконец-то. Без тебя ёлка третий год кривая"],
    first: ["Ну вот, уже красиво. Не торопись, у нас весь вечер"],
    low: ["Внизу кот достанет. Ну ладно, пусть играет", "Низковато. Хотя тебе в детстве так и нравилось"],
    cluster: ["Все в одну кучу — как отец вешает. Гены", "Тесно им там. Раздвинь немножко"],
    ok: ["Красиво", "Вот сюда хорошо", "Ага, так", "Помню её. Её ещё бабушка покупала", "Ой, эту ты в пять лет разбил{|а}. Это уже другая, но похожая"],
    star: ["Звезду всегда папа вешал. Теперь ты. Ну, вырос{|ла}…", "Звезда на месте. Теперь точно Новый год"],
    starNo: ["Звезду — на макушку, куда же ещё", "Звезда только наверх. Это традиция, с ней не спорят"],
    off: ["Мимо ёлки. Игрушка обратно в коробку, не бей только", "Это стена, а не ёлка"],
    phone: ["Положи телефон, я его не съем. Иди помогай"],
  };
  const fill = (t) => (typeof t === "function" ? t() : t);

  function tree(root) {
    const sc = bag();
    const year = G() ? Math.floor(G().info().day / 360) : 0;
    root.innerHTML = `
      ${Vibe.ui.head("Ёлка у родителей", "без доставки и фотозоны")}
      <div class="mg-tree" data-tree>
        ${treeSvg()}
        <div class="mg-box"></div>
        <div class="mg-hud"><span class="badge">🎄 <b data-cnt>0</b>/${ORN.length}</span><span class="badge" data-hint>Тащи игрушки на ёлку</span></div>
      </div>
      <div class="mg-dad"><div class="mg-ava mom">${portrait("👩")}</div><div class="mg-bub" data-bub><small>Мама</small>${esc(pick(MOM.hi))}</div></div>
      <button class="btn black block xl" data-done style="margin-top:14px" disabled>Включить гирлянду ✨</button>
      <div class="fine">В Vibe Market есть «Ёлка под ключ»: нарядят, сфотографируют, вывезут 2 января. Но там не будет бабушкиной шишки.</div>`;
    const box = $(root, "[data-tree]"), bub = $(root, "[data-bub]"), doneBtn = $(root, "[data-done]");
    const momSay = (t) => { bub.innerHTML = `<small>Мама</small>${esc(gx(fill(t)))}`; bub.classList.remove("pop"); void bub.offsetWidth; bub.classList.add("pop"); };
    const placed = {}; // id → [x,y] в координатах ёлки
    let starOk = false, coneHigh = false, lastSay = 0;
    // Раскладываем игрушки в коробке
    ORN.forEach((o, i) => {
      const el = document.createElement("div");
      el.className = "mg-orn";
      el.dataset.id = o.id;
      el.innerHTML = `<svg viewBox="-20 -20 40 40">${o.svg()}</svg>`;
      const hx = 10 + (i % 5) * 20, hy = 82 + Math.floor(i / 5) * 9;
      el.dataset.hx = hx; el.dataset.hy = hy;
      el.style.left = hx + "%"; el.style.top = hy + "%";
      box.appendChild(el);
      drag(el, o);
    });
    function toTree(clientX, clientY) {
      const r = box.getBoundingClientRect();
      return [((clientX - r.left) / r.width) * 300, ((clientY - r.top) / r.height) * 360, r];
    }
    function drag(el, o) {
      let on = false, pid = null;
      sc.on(el, "pointerdown", (e) => {
        e.preventDefault();
        on = true; pid = e.pointerId;
        try { el.setPointerCapture(pid); } catch (er) {}
        el.classList.add("drag"); el.classList.remove("back", "hung");
      });
      sc.on(el, "pointermove", (e) => {
        if (!on || e.pointerId !== pid) return;
        const r = box.getBoundingClientRect();
        el.style.left = clamp(((e.clientX - r.left) / r.width) * 100, 2, 98) + "%";
        el.style.top = clamp(((e.clientY - r.top) / r.height) * 100, 2, 98) + "%";
      });
      const up = (e) => {
        if (!on || e.pointerId !== pid) return;
        on = false;
        el.classList.remove("drag");
        const [x, y] = toTree(e.clientX, e.clientY);
        drop(el, o, x, y);
      };
      sc.on(el, "pointerup", up); sc.on(el, "pointercancel", up);
    }
    function home(el) { el.classList.add("back"); el.style.left = el.dataset.hx + "%"; el.style.top = el.dataset.hy + "%"; delete placed[el.dataset.id]; count(); }
    function drop(el, o, x, y) {
      const say = (t) => { lastSay = performance.now(); momSay(t); };
      if (o.star) {
        if (Math.hypot(x - STAR_AT[0], y - STAR_AT[1]) < 30) {
          el.style.left = (STAR_AT[0] / 300) * 100 + "%"; el.style.top = (STAR_AT[1] / 360) * 100 + "%";
          placed[o.id] = STAR_AT; el.classList.add("hung");
          if (!starOk) { starOk = true; say(pick(MOM.star)); FX.burst && FX.burst(el, { emojis: ["✨", "⭐"], count: 12, spread: 70 }); }
          $(box, "[data-starslot]").setAttribute("opacity", "0");
        } else { say(pick(MOM.starNo)); home(el); }
        return count();
      }
      if (!inTree(x, y)) { if (y < 300 || x < 40) say(pick(MOM.off)); home(el); return; }
      const near = Object.entries(placed).some(([id, [px, py]]) => id !== o.id && Math.hypot(px - x, py - y) < 24);
      placed[o.id] = [x, y];
      el.classList.add("hung");
      const n = Object.keys(placed).length;
      if (o.say && !el.dataset.told) { el.dataset.told = 1; say(o.say); }
      else if (n === 1) say(pick(MOM.first));
      else if (near) say(pick(MOM.cluster));
      else if (y > 245) say(pick(MOM.low));
      else if (performance.now() - lastSay > 2500 || Math.random() < 0.4) say(pick(MOM.ok));
      if (o.id === "cone") coneHigh = y < 150;
      count();
    }
    function count() {
      const n = Object.keys(placed).length;
      $(box, "[data-cnt]").textContent = n;
      doneBtn.disabled = n < 5;
      $(box, "[data-hint]").textContent = n < 5 ? `ещё ${5 - n}, и можно гирлянду` : n < ORN.length ? "можно включать (или ещё повесь)" : starOk ? "всё на месте!" : "осталась звезда";
    }
    sc.on(doneBtn, "click", () => {
      if (doneBtn.disabled) return;
      box.classList.add("lit");
      doneBtn.disabled = true;
      const n = Object.keys(placed).length, all = n === ORN.length;
      momSay(all && starOk ? "Ой… Включи-ка свет обратно. Нет, выключи. Пусть так постоит" : "Красиво. Остальное папа довесит, он любит, чтобы много");
      FX.confetti && FX.confetti({ count: 70 });
      const relM = clamp(4 + n + (starOk ? 2 : 0) + (coneHigh ? 1 : 0), 4, 14);
      sc.to(() => {
        Vibe.modal(`
          <div class="m-emo float">🎄</div>
          <div class="display" style="font-size:26px">Ёлка наряжена</div>
          <p>Мама сфотографировала её четыре раза и один раз — тебя рядом, пока ты не видел${Vibe.g("", "а")}. Папа сказал, что звезда кривая, и поправил. Она стала кривее.</p>
          <div class="stack" style="gap:6px;text-align:left;margin:4px 0 12px;font-weight:800;font-size:13px">
            <div>❤️ Мама: +${relM} · Папа: +3</div>
            <div>🕰 3 часа вручную — без доставки ёлки «под ключ»</div>
          </div>
          <button class="btn black block xl" data-close>Остаться на чай</button>`, {
          sound: "success",
          onClose() {
            rel("mom", relM); rel("dad", 3);
            setM({ treeYear: year });
            spendManual("tree", 180);
            say("mom", "Спасибо, что приехал{|а}. Ёлка в этом году самая красивая. Я тебе фото скинула, поставь на заставку 🎄", { delay: 50 });
            if (Vibe.body) Vibe.body.effect("social", { score: 0.9 });
            Vibe.back ? Vibe.back() : Vibe.go("home");
          },
        });
      }, 1600);
    });
    return () => sc.clear();
  }

  /* ---------- Экраны (точки входа для кнопок в чате/тостах: go: "mini-fishing" / "mini-tree") ---------- */
  Vibe.screen("mini-fishing", {
    render: () => `<div data-mg></div>`,
    mount(root, params = {}) { return fishing(root.querySelector("[data-mg]"), params); },
  });
  Vibe.screen("mini-tree", {
    render: () => `<div data-mg></div>`,
    mount(root) { return tree(root.querySelector("[data-mg]")); },
  });

  /* ---------- Триггеры событий ---------- */
  function inviteDad() {
    if (!live()) return;
    const week = Math.floor(G().info().day / 7);
    setM({ fishAsk: week });
    say("dad", "НА РЫБАЛКУ В СУББОТУ ПОЕДЕШЬ? В 6 УТРА. ЧЕРВЕЙ НАКОПАЮ", { actions: [{ label: "Поеду 🎣", go: "mini-fishing", params: { accept: 1 } }] });
  }
  function inviteMom() {
    if (!live()) return;
    say("mom", "Приезжай ёлку наряжать? Папа достал игрушки с антресолей. Те самые, с шишкой 🎄", { actions: [{ label: "Приеду 🎄", go: "mini-tree" }] });
  }
  function tick() {
    if (!live() || (Vibe.busy && Vibe.busy())) return;
    const i = G().info(), m = M();
    const week = Math.floor(i.day / 7), wd = i.day % 7;
    // Папа зовёт в четверг/пятницу вечером, раз в неделю, если не договорились
    if ((wd === 3 || wd === 4) && i.hour >= 17 && i.hour < 22 && m.fishAsk !== week && m.fishWeek !== week && !fishEv()) inviteDad();
    // В день рыбалки: «Я у подъезда»
    const ev = fishEv();
    if (ev && Vibe.sched) {
      const ph = Vibe.sched.phase(ev).phase;
      const toStart = Vibe.sched.phase(ev).toStart;
      if ((ph === "live" || (ph === "wait" && toStart <= 30)) && (m.fishPing || {}).ev !== ev.id) {
        setM({ fishPing: { ev: ev.id } });
        say("dad", "Я У ПОДЪЕЗДА. УДОЧКИ ВЗЯЛ, ТЕРМОС ТОЖЕ", { actions: [{ label: "Выйти к папе 🎣", go: "mini-fishing", params: { ev: ev.id } }] });
      }
    }
    // Декабрь (2-й игровой месяц), 20–29 число, днём — мама зовёт наряжать ёлку
    if (i.month === 1 && i.dom >= 20 && i.dom <= 29 && i.hour >= 11 && i.hour < 20) {
      const year = Math.floor(i.day / 360);
      if (m.treeYear !== year && m.treeAsk !== year) { setM({ treeAsk: year }); inviteMom(); }
    }
  }
  setInterval(() => { try { tick(); } catch (e) { console.error("[mini]", e); } }, 4000);
  // Пропустил рыбалку
  if (Vibe.sched && Vibe.sched.on) Vibe.sched.on("family:missed", (e) => {
    if (!e || e.mini !== "fishing") return;
    say("dad", "ЛАДНО. САМ ПОСИДЕЛ. КЛЕВАЛО, КСТАТИ", { delay: 20 });
    rel("dad", -5);
  });

  // Принять приглашение из чата: экран с params.accept сразу ставит событие
  const fsc = Vibe.screens && Vibe.screens["mini-fishing"];
  if (fsc) {
    const mount0 = fsc.mount;
    fsc.mount = function (root, params = {}) { if (params.accept && params.accept !== "0" && !fishEv() && M().fishWeek !== Math.floor(SAT() / 7)) planFishing(false); return mount0.call(this, root, Object.assign({}, params, { accept: 0 })); };
  }

  Vibe.mini = {
    fishing: (params = {}) => Vibe.go("mini-fishing", params),
    tree: () => Vibe.go("mini-tree"),
    inviteDad, inviteMom, planFishing, tick,
    stats: () => ({ manualMin: M().manualMin || 0, n: Object.assign({}, M().n) }),
  };
})();
