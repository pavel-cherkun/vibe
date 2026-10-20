/* ============================================================
   Vibe Цветы и Vibe Cola.
   Экраны: flowers (param to — id получателя) · cola
   Компонент: Vibe.colaAd() → HTML рекламной карточки Vibe Cola.
   Состояние: fl_water {plantId: day}, fl_sent [{to, n, e, item, ie, r, day}],
   fl_caps {red, violet, holo, gold, farm, total, tees},
   fl_river (день последней «банки из реки»), fl_ded (нашёл строчку на банке).
   Событие: Vibe.emit("gift", {to, item}).
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const esc = (s) => Vibe.esc(s == null ? "" : s);
  const rub = (n) => Vibe.rub(n);
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const today = () => (Vibe.game && S().game ? Vibe.game.info().day : 0);
  const stag = (root) => root.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
  const zab = (text, mood = "sly") => `<div class="fl-zab">${Vibe.zabotik ? Vibe.zabotik(54, mood) : "🤖"}<div class="fl-bubble">${text}</div></div>`;

  /* ---------- CSS ---------- */
  const css = `
  .fl-zab { display:flex; align-items:flex-end; gap:10px; margin-top:16px; }
  .fl-bubble { flex:1; background:var(--paper); border:2px solid var(--ink); border-radius:18px 18px 18px 6px; padding:10px 12px; font-size:13px; font-weight:700; line-height:1.35; }
  .fl-lbl { font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin:18px 2px 8px; }
  .fl-to { display:flex; align-items:center; gap:10px; padding:10px 12px; margin-top:12px; }
  .fl-to .e { font-size:30px; }
  .fl-to b { font-size:14px; display:block; }
  .fl-to small { font-size:11px; color:var(--muted); font-weight:700; }
  .fl-hol { margin-top:12px; padding:10px 14px; border:2.5px solid var(--ink); border-radius:18px; background:var(--coral); font-weight:900; font-size:14px; display:flex; gap:8px; align-items:center; transform:rotate(-1deg); box-shadow:var(--shadow-sm); }
  .fl-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .fl-item { padding:10px; display:flex; flex-direction:column; gap:6px; }
  .fl-item .pic { height:88px; border-radius:16px; border:2px solid var(--ink); display:grid; place-items:center; font-size:44px; position:relative; letter-spacing:-6px; }
  .fl-item .pic .tag { position:absolute; top:6px; left:6px; font-size:10px; padding:2px 6px; letter-spacing:0; }
  .fl-item .nm { font-size:13px; font-weight:800; line-height:1.15; min-height:30px; }
  .fl-item .mean { font-size:11px; font-weight:700; color:var(--muted); line-height:1.25; min-height:28px; }
  .fl-item .row { display:flex; align-items:center; justify-content:space-between; gap:4px; }
  .fl-item .pr { font-weight:900; font-size:14px; }
  .fl-item .pr s { font-size:10px; color:var(--muted); font-weight:700; display:block; }
  .fl-item .btn { height:36px; padding:0 12px; font-size:12px; }
  .fl-item .two { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .fl-item .two .btn { padding:0 4px; }
  .fl-own { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:2px dashed rgba(14,14,18,.12); }
  .fl-own:last-child { border-bottom:0; }
  .fl-own .e { font-size:30px; }
  .fl-own .t { flex:1; font-weight:800; font-size:14px; line-height:1.2; }
  .fl-own .t small { display:block; font-size:11px; color:var(--muted); font-weight:700; }
  .fl-own .btn { height:38px; padding:0 12px; font-size:12px; }
  .fl-pal { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
  .fl-stem { position:relative; height:62px; border:2.5px solid var(--ink); border-radius:16px; background:var(--paper); display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:26px; line-height:1; box-shadow:0 3px 0 var(--ink); transition:transform .15s var(--spring); }
  .fl-stem:active { transform:translateY(3px); box-shadow:none; }
  .fl-stem small { font-size:9px; font-weight:900; margin-top:4px; }
  .fl-stem .n { position:absolute; top:-8px; right:-6px; min-width:20px; height:20px; border-radius:10px; background:var(--pink); border:2px solid var(--ink); font-size:11px; font-weight:900; display:grid; place-items:center; padding:0 4px; }
  .fl-prev { position:relative; height:200px; border:2.5px solid var(--ink); border-radius:24px; background:repeating-linear-gradient(45deg,#fff6fb 0 12px,#ffeaf6 12px 24px); overflow:hidden; margin-bottom:10px; }
  .fl-prev .cone { position:absolute; left:50%; bottom:-6px; width:120px; height:110px; transform:translateX(-50%); clip-path:polygon(0 0,100% 0,58% 100%,42% 100%); transition:background .3s; }
  .fl-prev .bow { position:absolute; left:50%; bottom:46px; transform:translateX(-50%); font-size:30px; z-index:3; }
  .fl-prev .st { position:absolute; left:50%; bottom:96px; width:0; height:0; z-index:2; }
  .fl-prev .st span { position:absolute; left:-17px; top:-17px; font-size:34px; display:block; animation:fl-pop .4s var(--spring) both; }
  .fl-prev .empty { position:absolute; inset:0; display:grid; place-items:center; font-weight:800; color:var(--muted); font-size:13px; text-align:center; padding:0 40px 60px; }
  .fl-prev .card-note { position:absolute; right:10px; top:10px; max-width:46%; background:#fff; border:2px solid var(--ink); border-radius:10px; padding:6px 8px; font-size:11px; font-weight:800; transform:rotate(4deg); z-index:4; line-height:1.2; word-break:break-word; }
  @keyframes fl-pop { from { transform:scale(0) rotate(-40deg); } }
  .fl-sum { margin:12px 2px; display:grid; gap:5px; font-weight:700; font-size:14px; }
  .fl-sum div { display:flex; justify-content:space-between; gap:8px; }
  .fl-sum .tot { margin-top:4px; align-items:baseline; }
  .fl-sum .tot .big-num { font-size:28px; }
  .fl-input { width:100%; border:var(--line); border-radius:16px; padding:12px 14px; font:inherit; font-weight:700; font-size:15px; background:var(--paper); outline:0; }
  .fl-pick { display:flex; align-items:center; gap:12px; padding:12px; border:2.5px solid var(--ink); border-radius:18px; background:var(--paper); width:100%; text-align:left; box-shadow:0 3px 0 var(--ink); }
  .fl-pick:active { transform:translateY(3px); box-shadow:none; }
  .fl-pick .e { font-size:30px; }
  .fl-pick .t { flex:1; font-weight:800; font-size:15px; line-height:1.2; }
  .fl-pick .t small { display:block; font-size:11px; color:var(--muted); font-weight:700; }
  .fl-pick .h { font-size:12px; font-weight:900; white-space:nowrap; }
  .fl-map { height:250px; margin:6px 0 12px; }
  .fl-status { font-weight:800; font-size:14px; min-height:40px; display:flex; align-items:center; gap:8px; }
  .fl-react { text-align:center; padding:6px 0 4px; }
  .fl-react .who { font-size:84px; display:inline-block; }
  .fl-react .line { font-weight:800; font-size:16px; line-height:1.35; margin:10px 6px; background:var(--paper); border:2.5px solid var(--ink); border-radius:20px; padding:12px 14px; }
  .fl-react .delta { font-family:var(--font-display); font-size:30px; margin:8px 0 12px; }
  .fl-sent { display:flex; gap:8px; flex-wrap:wrap; }
  .fl-sent .chip { height:34px; font-size:12px; padding:0 12px; }

  /* Vibe Cola */
  .fl-cola-hero { background:#e8262d; color:#fff; border:var(--line); border-radius:32px; box-shadow:var(--shadow); padding:20px; position:relative; overflow:hidden; min-height:230px; }
  .fl-cola-hero::before { content:""; position:absolute; inset:0; background:repeating-linear-gradient(-30deg,transparent 0 26px,rgba(255,255,255,.08) 26px 52px); }
  .fl-cola-hero .logo { font-family:"Rubik Wet Paint", var(--font-display); font-size:44px; line-height:.95; position:relative; text-shadow:3px 3px 0 var(--ink); }
  .fl-cola-hero .sl { position:relative; font-weight:900; font-size:16px; margin-top:8px; max-width:58%; }
  .fl-cola-hero .cl { position:relative; font-weight:700; font-size:12px; margin-top:6px; max-width:56%; opacity:.9; }
  .fl-can-wrap { position:absolute; right:14px; bottom:14px; perspective:600px; }
  .fl-can { width:96px; height:160px; position:relative; transform-style:preserve-3d; transition:transform .7s var(--spring); cursor:pointer; }
  .fl-can.flip { transform:rotateY(180deg); }
  .fl-can .f { position:absolute; inset:0; border:2.5px solid var(--ink); border-radius:18px 18px 22px 22px; backface-visibility:hidden; overflow:hidden; box-shadow:4px 4px 0 var(--ink); }
  .fl-can .front { background:linear-gradient(90deg,#b5121b 0%,#ff4a4f 35%,#e8262d 60%,#a50f17 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; }
  .fl-can .front::before, .fl-can .back::before { content:""; position:absolute; top:0; left:0; right:0; height:14px; background:linear-gradient(90deg,#999,#eee,#aaa); border-bottom:2px solid var(--ink); }
  .fl-can .front b { font-family:"Rubik Wet Paint", var(--font-display); font-size:22px; transform:rotate(-10deg); text-shadow:2px 2px 0 var(--ink); line-height:.9; text-align:center; }
  .fl-can .front i { font-style:normal; font-size:9px; font-weight:900; margin-top:10px; background:#fff; color:#e8262d; border-radius:6px; padding:2px 5px; border:1.5px solid var(--ink); }
  .fl-can .back { transform:rotateY(180deg); background:#f3f0e8; color:var(--ink); padding:18px 7px 6px; font-size:7.5px; font-weight:700; line-height:1.25; }
  .fl-can .back b { font-size:8px; display:block; margin-bottom:2px; }
  .fl-can .back .ded { display:block; font-size:5.5px; opacity:.5; margin-top:5px; font-style:italic; cursor:pointer; }
  .fl-flav { display:flex; gap:12px; align-items:center; padding:12px; }
  .fl-flav .mini { width:46px; height:76px; border:2.5px solid var(--ink); border-radius:10px 10px 12px 12px; flex:0 0 auto; display:grid; place-items:center; font-size:22px; box-shadow:3px 3px 0 var(--ink); position:relative; overflow:hidden; }
  .fl-flav .mini::before { content:""; position:absolute; top:0; left:0; right:0; height:8px; background:linear-gradient(90deg,#999,#eee,#aaa); border-bottom:2px solid var(--ink); }
  .fl-flav .t { flex:1; min-width:0; }
  .fl-flav .t b { display:block; font-family:var(--font-display); font-weight:400; font-size:16px; line-height:1.05; }
  .fl-flav .t small { display:block; font-size:11px; font-weight:700; color:var(--muted); margin-top:4px; line-height:1.25; }
  .fl-flav .t .fx { display:inline-block; margin-top:6px; font-size:10px; font-weight:900; padding:2px 7px; border:2px solid var(--ink); border-radius:999px; background:var(--yellow); }
  .fl-flav .b { display:grid; gap:6px; }
  .fl-flav .b .btn { height:36px; padding:0 10px; font-size:12px; }
  .fl-caps { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
  .fl-cap { text-align:center; border:2.5px solid var(--ink); border-radius:16px; background:var(--paper); padding:8px 2px 6px; }
  .fl-cap .c { width:38px; height:38px; margin:0 auto; border-radius:50%; border:2.5px dashed var(--ink); display:grid; place-items:center; font-size:20px; }
  .fl-cap.lock { opacity:.4; filter:grayscale(1); }
  .fl-cap b { display:block; font-size:14px; font-weight:900; margin-top:4px; }
  .fl-cap small { display:block; font-size:9px; font-weight:800; color:var(--muted); line-height:1.1; }
  .fl-promo { display:flex; gap:12px; align-items:center; }
  .fl-promo .tee { font-size:54px; }
  .fl-promo .progress { margin-top:8px; }
  .fl-capfly { position:fixed; z-index:400; left:50%; top:45%; font-size:80px; transform:translate(-50%,-50%); pointer-events:none; animation:fl-capfly 1.4s var(--spring) forwards; }
  @keyframes fl-capfly { 0% { transform:translate(-50%,-50%) scale(0) rotate(-180deg); } 40% { transform:translate(-50%,-50%) scale(1.3) rotate(10deg); } 75% { opacity:1; transform:translate(-50%,-50%) scale(1) rotate(0); } 100% { opacity:0; transform:translate(-50%,-120%) scale(.6); } }

  /* Рекламная карточка */
  .fl-ad { display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:#e8262d; color:#fff; padding:14px; }
  .fl-ad .ad-can { font-size:40px; transform:rotate(-12deg); flex:0 0 auto; }
  .fl-ad .ad-t { flex:1; min-width:0; }
  .fl-ad .ad-t b { display:block; font-family:"Rubik Wet Paint", var(--font-display); font-size:22px; line-height:1; text-shadow:2px 2px 0 var(--ink); }
  .fl-ad .ad-t span { display:block; font-weight:800; font-size:12px; margin-top:4px; }
  .fl-ad .ad-tag { position:absolute; top:6px; right:8px; font-size:9px; font-weight:900; opacity:.75; letter-spacing:.5px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ================= Данные: Vibe Цветы ================= */
  const STEMS = [
    { id: "rose", e: "🌹", n: "Роза", p: 190, tags: ["romantic"], m: "Любовь. Или «прости, я забыл»" },
    { id: "tulip", e: "🌷", n: "Тюльпан", p: 120, tags: ["mom"], m: "Весна, мама и 8 марта" },
    { id: "sun", e: "🌻", n: "Подсолнух", p: 150, tags: ["friend"], m: "Дружба. И немного семечек" },
    { id: "daisy", e: "🌼", n: "Ромашка", p: 70, tags: ["friend"], m: "Любит — не любит — отписался" },
    { id: "hib", e: "🌺", n: "Гибискус", p: 210, tags: ["romantic"], m: "Отпуск, которого не было" },
    { id: "sakura", e: "🌸", n: "Сакура", p: 260, tags: ["aesthetic"], m: "Эстетика для сторис" },
    { id: "hyac", e: "🪻", n: "Гиацинт", p: 180, tags: ["apology"], m: "Прости. Официально" },
    { id: "chrys", e: "💮", n: "Хризантема", p: 140, tags: ["mom"], m: "Уважение и «как ты там»" },
    { id: "lotus", e: "🪷", n: "Лотос", p: 340, tags: ["calm"], m: "Дзен со скидкой" },
    { id: "wilt", e: "🥀", n: "Увядшая роза", p: 40, tags: ["apology"], m: "Для тех, кто опоздал" },
  ];
  const STEM = Object.fromEntries(STEMS.map((s) => [s.id, s]));

  const BOUQUETS = [
    { id: "fl_sorry", e: "🪻🥀", n: "«Прости, я был занят»", p: 1490, tags: ["apology"], m: "Занят ты был собой. Но гиацинты этого не скажут", c: "c-lilac", tag: "Хит" },
    { id: "fl_mom", e: "🌷💮", n: "«Мамин»", p: 1990, tags: ["mom"], m: "Тюльпаны и хризантемы. Позвонить всё равно придётся", c: "c-pink" },
    { id: "fl_101", e: "🌹🌹", n: "101 роза", p: 19190, tags: ["romantic"], m: "99 из них — в рассрочку", c: "c-coral", tag: "🔥 Любовь" },
    { id: "fl_friend", e: "🌻", n: "«Дружеский подсолнух»", p: 690, tags: ["friend"], m: "Один, большой, без намёков", c: "c-yellow" },
    { id: "fl_story", e: "🌸💐", n: "«Повод для сторис»", p: 2490, tags: ["aesthetic", "romantic"], m: "Фотографируется лучше, чем пахнет", c: "c-lilac" },
    { id: "fl_bday", e: "💐🎂", n: "«Я помню про твой ДР»", p: 1790, tags: ["birthday"], m: "Ты не помнил. Напомнил Вайбот", c: "c-mint" },
  ];

  const PLANTS = [
    { id: "pl_cactus", e: "🌵", n: "Кактус «Дедлайн»", p: 590, mood: 2, water: false, m: "Не требует полива. Как твоя личная жизнь — внимания" },
    { id: "pl_monstera", e: "🪴", n: "Монстера «Опенспейс»", p: 1890, mood: 4, water: true, m: "Занимает всё место. Как работа" },
    { id: "pl_ficus", e: "🌿", n: "Фикус «Корпоративный»", p: 1290, mood: 3, water: true, m: "Стоит в каждом офисе. Теперь и у тебя дома" },
    { id: "pl_bonsai", e: "🌳", n: "Бонсай «Карьерный рост»", p: 3490, mood: 5, water: true, m: "Растёт на 1 мм в год. Как зарплата" },
    { id: "pl_sprout", e: "🌱", n: "Росток «Новая жизнь с понедельника»", p: 390, mood: 1, water: true, m: "Каждый понедельник начинает заново" },
    { id: "pl_shroom", e: "🍄", n: "Грибница «Вайб-ферма»", p: 990, mood: 2, water: true, m: "Почти своё хозяйство. Почти" },
  ];
  const PLANT = Object.fromEntries(PLANTS.map((p) => [p.id, p]));

  const WRAPS = [
    { id: "kraft", n: "Крафт", e: "📜", p: 0, bg: "#d9b38c" },
    { id: "holo", n: "Голограмма", e: "🪩", p: 290, bg: "linear-gradient(120deg,#ff6bcb,#ffe14d,#c6ff4d,#8fd8ff,#8b5cff)" },
    { id: "box", n: "Шляпная коробка", e: "🎩", p: 690, bg: "#ff6bcb" },
    { id: "news", n: "Газета «Вестник Корпорации»", e: "📰", p: 0, bg: "repeating-linear-gradient(0deg,#f4f1e8 0 6px,#bbb 6px 7px)", ad: true },
  ];
  const WRAP = Object.fromEntries(WRAPS.map((w) => [w.id, w]));

  const ASSEMBLY = 149, CARD = 99, DELIVERY = 249, SMILE = 49;

  // Праздничный коэффициент
  function holiday() {
    if (!Vibe.game || !S().game) return { m: 1 };
    const i = Vibe.game.info();
    if (i.month === 4 && i.dom <= 8) return { m: 3, t: "8 марта: цены ×3", why: "Спрос, любовь и рыночек. Ничего личного 💐" };
    if (i.month === 3 && i.dom >= 10 && i.dom <= 14) return { m: 2, t: "14 февраля: цены ×2", why: "Любовь бесценна. Поэтому так дорого 💘" };
    if (i.month === 3 && i.dom >= 28) return { m: 1.5, t: "Скоро 8 марта: цены ×1,5", why: "Мы просто заранее. Как ты никогда 😉" };
    return { m: 1 };
  }
  const hp = (p) => Math.round((p * holiday().m) / 10) * 10;

  /* ---------- Люди ---------- */
  function person(id) {
    const c = Vibe.chars && Vibe.chars.get ? Vibe.chars.get(id) : null;
    const p = Vibe.people ? Vibe.people.get(id) : null;
    if (!c && !p) return null;
    return Object.assign({ id }, p || {}, c || {});
  }
  function recipients() {
    let list = [];
    if (Vibe.chars && Vibe.chars.list) { try { list = Vibe.chars.list().map((c) => Object.assign({}, c)); } catch (e) { list = []; } }
    if (!list.length && Vibe.people) list = Object.entries(Vibe.people.all()).map(([id, p]) => Object.assign({ id }, p));
    const kindRank = { partner: 0, family: 1, date: 2, friend: 3, blogger: 4 };
    return list.filter((p) => p && p.id && !p.ex).sort((a, b) => (kindRank[a.kind] ?? 5) - (kindRank[b.kind] ?? 5));
  }
  function hearts(id) {
    if (Vibe.chars && Vibe.chars.hearts) { try { return Vibe.chars.hearts(id); } catch (e) {} }
    const p = Vibe.people && Vibe.people.get(id);
    return p ? Math.round((p.rel || 0) / 10) : 0;
  }
  const heartRow = (n) => "❤️".repeat(Math.max(0, Math.min(10, n))) + "🤍".repeat(Math.max(0, 10 - Math.min(10, n)));
  function homeOf(id) {
    const c = person(id) || {};
    let h = c.home;
    if (h && typeof h === "object" && h.x != null) return Object.assign({ e: "🏠", label: c.n || "Дом" }, h);
    if (typeof h === "string") { const pl = Vibe.map.place(h); if (pl) return pl; }
    return Vibe.map.place("flat:" + id) || Vibe.map.place("home");
  }
  const SHOP_KEY = "restaurant:3";
  const shop = () => Object.assign({}, Vibe.map.place(SHOP_KEY) || Vibe.map.place("supermarket"), { e: "💐", label: "Vibe Цветы" });

  // Реакция, если Vibe.chars ещё не загружен
  function fallbackGift(id, item) {
    const p = person(id) || {};
    const t = item.tags || [];
    let reaction = "like", delta = 10;
    if ((p.kind === "family" && t.includes("mom")) || ((p.kind === "partner" || p.kind === "date") && t.includes("romantic"))) { reaction = "love"; delta = 15; }
    else if (p.kind === "friend" && t.includes("romantic")) { reaction = "neutral"; delta = 3; }
    if (Vibe.people) Vibe.people.rel(id, delta);
    const lines = {
      love: [`«Ну зачем ты тратился!» (очень рада, уже в вазе и в сторис)`, "«Это самое милое, что со мной случалось на этой неделе» 💞"],
      like: ["«Ого, спасибо! Неожиданно и приятно»", "«Курьер был мил. Цветы тоже. Ты — посмотрим» 😏"],
      neutral: ["«Эм… спасибо? Это что-то значит?»", "«Цветы. Мне. Ладно…» 🤨"],
    };
    return { reaction, delta, line: pick(lines[reaction]) };
  }

  /* ---------- Растения ---------- */
  const waterMap = () => S().fl_water || {};
  function witherCheck() {
    if (!Vibe.inv || !S().game) return;
    const w = Object.assign({}, waterMap());
    let changed = false;
    PLANTS.forEach((p) => {
      if (!p.water || !Vibe.inv.has(p.id)) return;
      if (w[p.id] == null) { w[p.id] = today(); changed = true; return; }
      if (today() - w[p.id] >= 7) {
        Vibe.inv.remove(p.id); delete w[p.id]; changed = true;
        setTimeout(() => FX.toast(`${p.n} засох 🥀 Мотивация — следующая`, "💀", 3200), 600);
      }
    });
    if (changed) set({ fl_water: w });
  }

  /* ---------- Оплата и доставка ---------- */
  let screenParams = {};

  function order(item, price, from) {
    const to = screenParams.to && person(screenParams.to) ? screenParams.to : null;
    if (to) confirmOrder(to, item, price);
    else pickRecipient((id) => confirmOrder(id, item, price));
  }

  function pickRecipient(cb) {
    const list = recipients();
    if (!list.length) { FX.toast("Некому дарить. Вайбот предлагает подарить себе 🤖", "🥲", 2600); return; }
    Vibe.ui.sheet(`
      <div class="display" style="font-size:26px;margin-bottom:4px">Кому доставить?</div>
      <div class="muted" style="font-weight:700;font-size:13px;margin-bottom:12px">Курьер найдёт любого. Это немного пугает</div>
      <div class="stagger" style="display:grid;gap:8px">
        ${list.map((p) => `<button class="fl-pick" data-who="${esc(p.id)}"><span class="e">${p.e || "🙂"}</span><span class="t">${esc(p.n || p.id)}<small>${esc(p.job || ({ family: "Семья", friend: "Друг", partner: "Партнёр", date: "Свидания", blogger: "Блогер" }[p.kind] || ""))}</small></span><span class="h">${"❤️".repeat(Math.max(0, Math.min(5, Math.round(hearts(p.id) / 2)))) || "🤍"}</span></button>`).join("")}
      </div>`, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          const b = e.target.closest("[data-who]"); if (!b) return;
          FX.burst(b, { emojis: ["💐", "✨"], count: 8 });
          close();
          setTimeout(() => cb(b.dataset.who), 320);
        });
      },
    });
  }

  function confirmOrder(id, item, price) {
    const p = person(id) || { n: id, e: "🙂" };
    const total = price + DELIVERY + SMILE;
    Vibe.ui.sheet(`
      <div class="display" style="font-size:26px;margin-bottom:12px">Доставка цветов</div>
      <div class="card flat" style="padding:4px 14px">
        <div class="li"><div class="ic c-pink">${item.e.slice(0, 2)}</div><div class="tx"><b>${esc(item.name)}</b><small>${item.note ? "✉️ «" + esc(item.note) + "»" : "Без открытки. Загадочно"}</small></div><div class="amt">${rub(price)}</div></div>
        <div class="li"><div class="ic c-yellow">${p.e || "🙂"}</div><div class="tx"><b>${esc(p.n || id)}</b><small>Получатель · ${heartRow(hearts(id))}</small></div></div>
      </div>
      <div class="fl-sum">
        <div><span class="muted">Курьер на самокате</span><span>${rub(DELIVERY)}</span></div>
        <div><span class="muted">Сбор за улыбку курьера</span><span>${rub(SMILE)}</span></div>
        <div class="tot"><span class="display" style="font-size:20px">Итого</span><span class="big-num">${rub(total)}</span></div>
      </div>
      <button class="btn black xl block" data-pay>Оплатить и отправить <span class="arrow">→</span></button>
      <div class="fine">Курьер не отвечает за реакцию получателя. Vibe Цветы не гарантируют прощение, взаимность и то, что цветы проживут дольше суток. Фото букета при получении может отличаться от фото букета на сайте на 100%.</div>`, {
      onMount(sh, close) {
        $(sh, "[data-pay]").addEventListener("click", (e) => {
          const ok = Vibe.pay(total, { title: `Vibe Цветы · ${item.name}`, emoji: "💐", col: "c-pink", from: e.currentTarget });
          if (!ok) return;
          FX.sound.success();
          close();
          setTimeout(() => courier(id, item), 330);
        });
      },
    });
  }

  function courier(id, item) {
    const p = person(id) || { n: id, e: "🙂" };
    const a = shop(), b = homeOf(id);
    const pts = Vibe.map.path(a, b);
    const mins = Vibe.map.minutes(pts, "courier");
    let map = null, drv = null, done = false, sheetEl = null;
    const timers = [];
    const LINES = [
      [0.12, "🛵 Курьер забрал букет и сфоткал его для отчёта"],
      [0.35, "🌹 Курьер понюхал розы. Это входит в сервис"],
      [0.6, "🚦 Стоит на светофоре, поправляет бантик"],
      [0.85, "🔔 Звонит в домофон. Дважды. Как в кино"],
    ];
    const finish = (silent) => {
      if (done) return; done = true;
      if (drv) drv.stop();
      const gi = { id: item.id, name: item.name, e: item.e, tags: item.tags };
      let res = null;
      if (Vibe.chars && Vibe.chars.gift) { try { res = Vibe.chars.gift(id, gi); } catch (e) { console.error(e); } }
      if (!res) res = fallbackGift(id, gi);
      Vibe.emit("gift", { to: id, item: gi });
      const log = [{ to: id, n: p.n, e: p.e, item: item.name, ie: item.e, r: res.reaction, day: today() }, ...(S().fl_sent || [])].slice(0, 12);
      set({ fl_sent: log });
      if (Vibe.skills && Vibe.skills.xp) { try { Vibe.skills.xp("social", 8); } catch (e) {} }
      const em = { love: "😍", like: "😊", neutral: "😐", hate: "😤" }[res.reaction] || "🙂";
      if (silent || !sheetEl) { FX.toast(`${p.n}: ${res.line || "спасибо!"}`, em, 3600); return; }
      const stage = $(sheetEl, "[data-stage]");
      stage.innerHTML = `
        <div class="fl-react">
          <div class="who float">${p.e || "🙂"}</div>
          <div class="display" style="font-size:24px">${esc(p.n)} ${em}</div>
          <div class="line">${esc(res.line || "Спасибо!")}</div>
          <div class="delta">${res.delta > 0 ? "+" : ""}${res.delta || 0} 💗</div>
          <div style="font-size:14px;letter-spacing:-2px;margin-bottom:14px">${heartRow(hearts(id))}</div>
          <button class="btn black block" data-close>${res.reaction === "hate" ? "Ой. Понял 🫠" : "Вайбово 💐"}</button>
          <div class="fine">${res.reaction === "hate" ? "Vibe Цветы рекомендуют в следующий раз изучить вкусы получателя. В Vibe Близкие. За 299 в месяц." : "Отзыв о курьере можно оставить в течение 15 минут. Курьер уже видит, что ты медлишь."}</div>
        </div>`;
      if (res.reaction === "love") { FX.confetti(); FX.sound.levelup(); }
      else if (res.reaction === "hate") FX.sound.error();
      else FX.sound.like();
      FX.burst($(stage, ".who"), { emojis: res.reaction === "hate" ? ["💢", "🥀"] : ["💗", "💐", "✨", "💖"], count: 16 });
    };
    Vibe.ui.sheet(`
      <div data-stage>
        <div class="display" style="font-size:24px">Курьер в пути 🛵</div>
        <div class="muted" style="font-weight:700;font-size:13px;margin-top:2px">${esc(item.name)} → ${p.e || ""} ${esc(p.n)} · ~${mins} мин</div>
        <div class="fl-map" data-map></div>
        <div class="progress"><i data-prog></i></div>
        <div class="fl-status" data-status>📦 Флорист заворачивает букет. Вздыхает</div>
        <button class="btn block" data-skip style="margin-top:8px">Пропустить ожидание ⏩</button>
      </div>`, {
      onMount(sh) {
        sheetEl = sh;
        const el = $(sh, "[data-map]");
        map = Vibe.map.create(el, {
          interactive: false, ambient: true, height: 250, fit: [a, b],
          pins: [Object.assign({ id: "shop", color: "#ff6bcb" }, a), Object.assign({ id: "to", color: "#ffe14d", pulse: true }, b, { e: p.e || "🏠", label: p.n })],
        });
        map.route(pts, { color: "#ff6bcb" });
        const prog = $(sh, "[data-prog]"), status = $(sh, "[data-status]");
        let li = 0;
        timers.push(setTimeout(() => {
          if (done) return;
          drv = map.drive(pts, {
            emoji: "🛵", color: "#fff", duration: 7000,
            onProgress(k) {
              prog.style.setProperty("--p", Math.round(k * 100) + "%");
              while (li < LINES.length && k >= LINES[li][0]) { status.textContent = LINES[li][1]; FX.bump(status); li++; }
            },
            onDone() { drv = null; timers.push(setTimeout(() => finish(false), 400)); },
          });
        }, 900));
        $(sh, "[data-skip]").addEventListener("click", () => finish(false));
      },
      onClose() {
        timers.forEach(clearTimeout);
        if (!done) finish(true);
        if (map) { map.destroy(); map = null; }
        sheetEl = null;
      },
    });
  }

  /* ---------- Рендер Vibe Цветы ---------- */
  function itemCard(it, kind) {
    const pr = kind === "plant" ? it.p : hp(it.p);
    const old = pr !== it.p ? `<s>${rub(it.p)}</s>` : "";
    if (kind === "plant") {
      const own = Vibe.inv && Vibe.inv.has(it.id);
      return `<div class="card fl-item" data-plant="${it.id}">
        <div class="pic c-mint">${it.e}<span class="badge tag">+${it.mood} 😊</span></div>
        <div class="nm">${esc(it.n)}</div>
        <div class="mean">${esc(it.m)}</div>
        <div class="row"><span class="pr">${rub(pr)}</span></div>
        <div class="two"><button class="btn sm ${own ? "" : "lime"}" data-act="plant-self" ${own ? "disabled" : ""}>${own ? "Уже дома" : "Себе 🏠"}</button><button class="btn sm" data-act="plant-gift">Подарить</button></div>
      </div>`;
    }
    return `<div class="card fl-item" data-bq="${it.id}">
      <div class="pic ${it.c || "c-pink"}">${it.e}${it.tag ? `<span class="badge tag">${it.tag}</span>` : ""}</div>
      <div class="nm">${esc(it.n)}</div>
      <div class="mean">${esc(it.m)}</div>
      <div class="row"><span class="pr">${old}${rub(pr)}</span><button class="btn sm pink" data-act="bq">Доставить</button></div>
    </div>`;
  }

  function ownedPlants() {
    const mine = PLANTS.filter((p) => Vibe.inv && Vibe.inv.has(p.id));
    if (!mine.length) return "";
    const w = waterMap();
    return `<div class="fl-lbl">🪴 Твои растения</div>
      <div class="card tight">${mine.map((p) => {
        const d = w[p.id] == null ? 0 : today() - w[p.id];
        const sub = !p.water ? "Поливать не нужно. Он справится. Ты — нет" : d === 0 ? "Полит сегодня 💧" : d >= 5 ? `Не поливали ${d} дн. — вянет! 🥀` : `Не поливали ${d} дн.`;
        return `<div class="fl-own" data-plant="${p.id}"><span class="e">${p.e}</span><span class="t">${esc(p.n)}<small>${sub}</small></span>${p.water ? `<button class="btn ${d >= 5 ? "pink" : ""}" data-act="water" ${d === 0 ? "disabled" : ""}>Полить 💧</button>` : ""}</div>`;
      }).join("")}</div>`;
  }

  function sentBlock() {
    const log = S().fl_sent || [];
    if (!log.length) return "";
    const em = { love: "😍", like: "😊", neutral: "😐", hate: "😤" };
    return `<div class="fl-lbl">📬 Ты дарил</div><div class="fl-sent">${log.slice(0, 8).map((l) => `<span class="chip">${l.ie ? l.ie.slice(0, 2) : "💐"} → ${l.e || ""} ${esc(l.n || l.to)} ${em[l.r] || ""}</span>`).join("")}</div>`;
  }

  function flowersBody() {
    const h = holiday();
    const to = screenParams.to ? person(screenParams.to) : null;
    const sub = Vibe.subs && Vibe.subs.has && Vibe.subs.has("fl_monday");
    return `
      ${to ? `<div class="card fl-to c-lime"><span class="e">${to.e || "🙂"}</span><span style="flex:1"><b>Получатель: ${esc(to.n || to.id)}</b><small>Всё, что ты выберешь, курьер повезёт сюда</small></span><button class="btn sm" data-act="clear-to">✕</button></div>` : ""}
      ${h.m > 1 ? `<div class="fl-hol">📈 ${h.t}<span class="muted" style="font-size:11px;font-weight:700;color:var(--ink);opacity:.7">${h.why}</span></div>` : ""}

      <div class="fl-lbl">💐 Готовые букеты</div>
      <div class="fl-grid stagger">${BOUQUETS.map((b) => itemCard(b, "bq")).join("")}</div>

      <div class="fl-lbl">🎨 Собери свой букет</div>
      <div class="card" data-builder>
        <div class="fl-prev" data-prev></div>
        <div class="muted" style="font-size:12px;font-weight:800;margin:0 2px 8px">Тапни цветок, чтобы добавить (3–7 штук). Тапни на превью — убрать последний</div>
        <div class="fl-pal">${STEMS.map((s) => `<button class="fl-stem" data-stem="${s.id}" title="${esc(s.n + " — " + s.m)}">${s.e}<small>${rub(hp(s.p)).replace(/\s/g, "")}</small><span class="n" hidden></span></button>`).join("")}</div>
        <div class="muted" data-meaning style="font-size:12px;font-weight:700;margin:10px 2px 0;min-height:16px">Каждый цветок что-то значит. Чаще всего — «я забыл»</div>
        <div class="fl-lbl" style="margin-top:12px">Упаковка</div>
        <div class="chips" data-wraps>${WRAPS.map((w, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-wrap="${w.id}">${w.e} ${esc(w.n)}${w.p ? ` · ${rub(w.p)}` : w.ad ? " · бесплатно*" : ""}</button>`).join("")}</div>
        <div class="fl-lbl" style="margin-top:8px">Открытка</div>
        <input class="fl-input" data-note maxlength="60" placeholder="«Ты лучше, чем мой KPI»">
        <div class="fl-sum" data-sum></div>
        <button class="btn grad xl block" data-act="custom" disabled>Доставить букет 🛵</button>
        <div class="fine">* Упаковка «Вестник Корпорации» бесплатна, потому что получатель прочтёт три рекламных статьи. Флорист вправе заменить любой цветок на «аналогичный по вайбу».</div>
      </div>

      <div class="fl-lbl">🪴 Растения в горшках · бонус к настроению</div>
      <div class="fl-grid stagger">${PLANTS.map((p) => itemCard(p, "plant")).join("")}</div>
      <div data-owned>${ownedPlants()}</div>

      <div class="fl-lbl">🔁 Подписка</div>
      <div class="card ${sub ? "c-lime" : "c-yellow"}" style="display:flex;gap:12px;align-items:center">
        <span style="font-size:44px">💐</span>
        <div style="flex:1"><b style="font-size:15px;display:block">Цветы каждый понедельник</b><span style="font-size:12px;font-weight:700">Свежий букет себе. Потому что понедельник. ${rub(3990)}/мес</span></div>
        <button class="btn sm ${sub ? "" : "black"}" data-act="sub">${sub ? "Отменить" : "Хочу"}</button>
      </div>

      <div data-sent>${sentBlock()}</div>

      ${Vibe.colaAd ? `<div style="margin-top:18px">${Vibe.colaAd()}</div>` : ""}

      ${zab(pick([
        "Цветы — универсальный язык. На нём можно сказать «прости», «люблю» и «я забыл, что сегодня» 💐",
        "Маме давно ничего не дарил. Это не упрёк, это аналитика 📊",
        "Гиацинты — официальный цветок извинений. Мы проверили по продажам после корпоративов",
        "Кактус — идеальное растение для тебя. Он тоже живёт без воды и внимания 🌵",
      ]))}
      <div class="fine">Vibe Цветы — часть экосистемы Vibe. Цветы срезаны с любовью и строго по KPI. Срок жизни букета — до 3 дней, срок жизни подписки — до отмены, срок жизни отмены — до следующего понедельника. Фото носят иллюстративный характер. Курьер не обязан изображать радость.</div>`;
  }

  Vibe.screen("flowers", {
    render(params) {
      screenParams = params || {};
      witherCheck();
      return `
      ${Vibe.ui.head("Vibe Цветы", "Доставка эмоций", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Цветы, которые завянут быстрее твоей мотивации", text: "Доставим за 40 минут. Чувства — на твоей стороне", emo: "💐", color: "c-pink", sticker: "🛵 от 40 мин" })}
        <div data-body>${flowersBody()}</div>
      </div>`;
    },
    mount(root, params) {
      screenParams = params || {};
      const body = $(root, "[data-body]");
      const draft = { stems: [], wrap: "kraft" };

      function rerender() {
        const note = $(body, "[data-note]") ? $(body, "[data-note]").value : "";
        body.innerHTML = flowersBody();
        stag(body);
        if ($(body, "[data-note]")) $(body, "[data-note]").value = note;
        $$(body, "[data-wrap]").forEach((c) => c.classList.toggle("on", c.dataset.wrap === draft.wrap));
        renderBuilder();
      }
      const bqPrice = () => draft.stems.reduce((s, id) => s + hp(STEM[id].p), 0);
      function bqTotal() {
        const note = ($(body, "[data-note]") || {}).value || "";
        return bqPrice() + (draft.stems.length ? ASSEMBLY : 0) + WRAP[draft.wrap].p + (note.trim() ? CARD : 0);
      }
      function renderBuilder() {
        const prev = $(body, "[data-prev]"); if (!prev) return;
        const n = draft.stems.length;
        const w = WRAP[draft.wrap];
        const note = (($(body, "[data-note]") || {}).value || "").trim();
        const spread = Math.min(70, 16 + n * 9);
        prev.innerHTML = `
          ${note ? `<div class="card-note">✉️ ${esc(note)}</div>` : ""}
          ${n ? draft.stems.map((id, i) => {
            const ang = n === 1 ? 0 : -spread + (2 * spread * i) / (n - 1);
            const r = 50 + ((i % 2) ? 14 : 0);
            return `<div class="st" style="transform:rotate(${ang}deg) translateY(-${r}px)"><span style="transform:rotate(${-ang}deg)">${STEM[id].e}</span></div>`;
          }).join("") : `<div class="empty">Тут будет твой букет. Пока тут только упаковка и надежда</div>`}
          <div class="cone" style="background:${w.bg};"></div>
          <div class="bow">🎀</div>`;
        $$(body, "[data-stem]").forEach((b) => {
          const c = draft.stems.filter((x) => x === b.dataset.stem).length;
          const badge = $(b, ".n"); badge.hidden = !c; badge.textContent = c;
        });
        const sum = $(body, "[data-sum]");
        const tot = bqTotal();
        sum.innerHTML = `
          <div><span class="muted">Цветы · ${n} шт.</span><span>${rub(bqPrice())}</span></div>
          ${n ? `<div><span class="muted">Сборка флористом</span><span>${rub(ASSEMBLY)}</span></div>` : ""}
          <div><span class="muted">Упаковка «${esc(w.n)}»</span><span>${w.p ? rub(w.p) : "бесплатно"}</span></div>
          ${note ? `<div><span class="muted">Открытка (почерк — нейросеть)</span><span>${rub(CARD)}</span></div>` : ""}
          <div class="tot"><span class="display" style="font-size:20px">Букет</span><span class="big-num">${rub(tot)}</span></div>`;
        const btn = $(body, "[data-act=custom]");
        btn.disabled = n < 3;
        btn.textContent = n < 3 ? `Ещё ${3 - n} ${3 - n === 1 ? "цветок" : "цветка"} минимум` : "Доставить букет 🛵";
      }
      renderBuilder();

      function customItem() {
        const note = (($(body, "[data-note]") || {}).value || "").trim();
        const tags = new Set(["flowers"]);
        draft.stems.forEach((id) => STEM[id].tags.forEach((t) => tags.add(t)));
        const uniq = [...new Set(draft.stems)];
        const top = uniq.map((id) => STEM[id].e).slice(0, 3).join("");
        return { id: "fl_custom", name: `Букет из ${draft.stems.length} цветов`, e: top || "💐", tags: [...tags], note };
      }

      const onClick = (e) => {
        const stem = e.target.closest("[data-stem]");
        if (stem) {
          if (draft.stems.length >= 7) { FX.shake(stem); FX.toast("Больше 7 — это уже клумба. И ипотека", "🌷"); return; }
          draft.stems.push(stem.dataset.stem);
          const s = STEM[stem.dataset.stem];
          FX.bump(stem); FX.sound.add(); FX.burst(stem, { emojis: [s.e, "✨"], count: 6, spread: 70 });
          const m = $(body, "[data-meaning]"); if (m) m.textContent = `${s.e} ${s.n}: ${s.m}`;
          renderBuilder();
          return;
        }
        if (e.target.closest("[data-prev]")) {
          if (draft.stems.length) { draft.stems.pop(); FX.sound.pop(); renderBuilder(); }
          return;
        }
        const wr = e.target.closest("[data-wrap]");
        if (wr) {
          draft.wrap = wr.dataset.wrap;
          $$(body, "[data-wrap]").forEach((c) => c.classList.toggle("on", c === wr));
          FX.sound.tap(); FX.bump(wr);
          if (WRAP[draft.wrap].ad) FX.toast("Отличный выбор. Корпорация ценит твою лояльность 📰", "🗞️");
          renderBuilder();
          return;
        }
        const b = e.target.closest("[data-act]"); if (!b) return;
        const act = b.dataset.act;
        if (act === "bq") {
          const it = BOUQUETS.find((x) => x.id === b.closest("[data-bq]").dataset.bq);
          FX.burst(b, { emojis: ["💐", "🌸", "✨"], count: 10 });
          order({ id: it.id, name: `Букет ${it.n}`, e: it.e, tags: ["flowers", ...it.tags] }, hp(it.p), b);
        } else if (act === "custom") {
          if (draft.stems.length < 3) return;
          FX.burst(b, { emojis: draft.stems.map((id) => STEM[id].e), count: 12 });
          order(customItem(), bqTotal(), b);
        } else if (act === "plant-self") {
          const p = PLANT[b.closest("[data-plant]").dataset.plant];
          if (Vibe.inv.has(p.id)) return;
          const ok = Vibe.pay(p.p, { title: `Vibe Цветы · ${p.n}`, emoji: p.e, col: "c-mint", from: b });
          if (!ok) return;
          Vibe.inv.add({ id: p.id, name: p.n, e: p.e, cat: "home", bonus: { mood: p.mood } });
          set({ fl_water: Object.assign({}, waterMap(), { [p.id]: today() }) });
          FX.burst(b, { emojis: [p.e, "🌱", "💚"], count: 14 }); FX.sound.success();
          FX.toast(`${p.e} Теперь дома. Настроение +${p.mood} каждый день`, "🏠", 2600);
          if (p.water) setTimeout(() => FX.toast("Поливай раз в неделю. Вайбот напомнит. Наверное", "💧", 2600), 2800);
          setTimeout(rerender, 400);
        } else if (act === "plant-gift") {
          const p = PLANT[b.closest("[data-plant]").dataset.plant];
          FX.burst(b, { emojis: [p.e, "🎁"], count: 8 });
          order({ id: p.id, name: p.n, e: p.e, tags: ["flowers", "plants"] }, p.p, b);
        } else if (act === "water") {
          const id = b.closest("[data-plant]").dataset.plant;
          set({ fl_water: Object.assign({}, waterMap(), { [id]: today() }) });
          FX.burst(b, { emojis: ["💧", "💦", "🌱"], count: 12 }); FX.sound.like();
          FX.toast(pick(["Растение благодарно. Хоть кто-то 🌱", "Полито. Ты заботливый. Записали в профиль 💧", "+1 к ощущению, что жизнь под контролем"]), "💧");
          setTimeout(() => { const o = $(body, "[data-owned]"); if (o) o.innerHTML = ownedPlants(); }, 300);
        } else if (act === "sub") {
          if (Vibe.subs.has("fl_monday")) {
            Vibe.modal(`<div class="m-emo float">🥀</div><div class="display">Точно отменить?</div><p>Понедельники станут серыми. Мы не давим. Мы просто показываем увядшую розу.</p><button class="btn black block" data-yes>Отменить подписку</button><button class="btn block" data-close style="margin-top:8px">Оставить цветы 💐</button>`, {
              sound: "pop",
              onMount(m, close) {
                $(m, "[data-yes]").addEventListener("click", () => { Vibe.subs.remove("fl_monday"); if (Vibe.achieve) Vibe.achieve("cancel"); close(); FX.toast("Отменено. Понедельник уже грустит", "🥀"); rerender(); });
              },
            });
          } else {
            Vibe.subs.add({ id: "fl_monday", name: "Цветы каждый понедельник", e: "💐", price: 3990, note: "Букет себе. Потому что больше некому" });
            FX.confetti({ count: 70 }); FX.sound.success();
            FX.toast("Подписка оформлена. Понедельник стал на 3% терпимее", "💐", 2600);
            rerender();
          }
        } else if (act === "clear-to") {
          screenParams = {};
          Vibe.replace("flowers");
        }
      };
      const onInput = (e) => { if (e.target.matches("[data-note]")) renderBuilder(); };
      root.addEventListener("click", onClick);
      root.addEventListener("input", onInput);
      return () => { root.removeEventListener("click", onClick); root.removeEventListener("input", onInput); };
    },
  });

  /* ================= Vibe Cola ================= */
  const FLAVS = [
    { id: "classic", n: "Классика", e: "🥤", p: 89, col: "#e8262d", d: "Тот самый вкус. Какой — не уточняем", fx: ["junk", "coffee"], fxt: "+сытость · +энергия" },
    { id: "zero", n: "Без сахара, но с вайбом", e: "🫧", p: 99, col: "#cfd3d9", d: "0 калорий, 0 сахара, 0 угрызений. Вайб — 100%", fx: ["coffee"], fxt: "+энергия" },
    { id: "night", n: "Ночная смена", e: "🌙", p: 129, col: "#3b2a7a", d: "Кофеин ×2. Сон — для тех, у кого нет KPI", fx: ["coffee", "coffee"], fxt: "+энергия ×2" },
    { id: "corp", n: "Корпоративный дух", e: "🏢", p: 149, col: "#8b5cff", d: "Вкус тимбилдинга. Бесплатно для сотрудников (вычитается из премии)", fx: ["coffee", "junk"], fxt: "+энергия · +сытость · +лояльность" },
  ];
  const FLAV = Object.fromEntries(FLAVS.map((f) => [f.id, f]));
  const CAPS = [
    { id: "red", e: "🔴", n: "Обычная", w: 72 },
    { id: "violet", e: "🟣", n: "Ночная", w: 16 },
    { id: "holo", e: "✨", n: "Голо", w: 8 },
    { id: "gold", e: "🟡", n: "Золотая", w: 3.5 },
    { id: "farm", e: "🌾", n: "???", w: 0.5 },
  ];
  const caps = () => Object.assign({ red: 0, violet: 0, holo: 0, gold: 0, farm: 0, total: 0, tees: 0 }, S().fl_caps || {});
  const capsCount = (c) => CAPS.reduce((s, k) => s + (c[k.id] || 0), 0);
  function rollCap() {
    const r = Math.random() * 100;
    let acc = 0;
    for (const k of CAPS) { acc += k.w; if (r < acc) return k; }
    return CAPS[0];
  }
  function addCaps(list) {
    const c = caps();
    list.forEach((k) => { c[k.id] = (c[k.id] || 0) + 1; c.total = (c.total || 0) + 1; });
    set({ fl_caps: c });
  }
  function capFly(e) {
    const d = document.createElement("div"); d.className = "fl-capfly"; d.textContent = e;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1500);
  }

  const COLA_SLOGANS = ["В ней есть вайб", "В ней электролиты… и вайб", "Пей. Работай. Повторяй", "Освежает, как увольнение. Только без увольнения", "Это то, что нужно телу. Тело так сказало"];
  Vibe.colaAd = function (opts = {}) {
    const s = opts.slogan || pick(COLA_SLOGANS);
    return `<button class="card tap fl-ad" data-go="cola"><span class="ad-tag">РЕКЛАМА</span><span class="ad-can">🥤</span><span class="ad-t"><b>Vibe Cola</b><span>${esc(s)}</span></span><span class="btn sm" style="background:#fff;color:var(--ink)">Хочу</span></button>`;
  };

  function capsBlock() {
    const c = caps();
    const n = capsCount(c);
    const prog = Math.min(100, Math.round((n / 10) * 100));
    return `
      <div class="fl-lbl">🧢 Коллекция крышек · всего ${c.total || 0}</div>
      <div class="fl-caps">${CAPS.map((k) => {
        const have = c[k.id] || 0;
        const hidden = k.id === "farm" && !have;
        return `<div class="fl-cap ${have ? "" : "lock"}"><div class="c">${hidden ? "❓" : k.e}</div><b>${have}</b><small>${hidden ? "Легенда" : k.n}</small></div>`;
      }).join("")}</div>
      <div class="card c-yellow" style="margin-top:12px">
        <div class="fl-promo">
          <span class="tee float">👕</span>
          <div style="flex:1">
            <b style="font-size:15px;display:block">Собери 10 крышек — получи футболку Vibe</b>
            <span style="font-size:12px;font-weight:700">Размер «Корпоративный». Один на всех, как и мы</span>
            <div class="progress"><i style="--p:${prog}%"></i></div>
            <div style="font-size:12px;font-weight:900;margin-top:4px">${Math.min(n, 10)} / 10 ${c.tees ? `· футболок: ${c.tees}` : ""}</div>
          </div>
        </div>
        <button class="btn black block" data-act="tee" style="margin-top:12px" ${n >= 10 ? "" : "disabled"}>${n >= 10 ? "Обменять 10 крышек на футболку 👕" : `Ещё ${10 - n} ${10 - n === 1 ? "крышка" : 10 - n < 5 ? "крышки" : "крышек"}`}</button>
        <div class="fine">Сначала списываются обычные крышки. Редкие — твои навсегда (пока не потеряешь). Футболка не стирается: стирается только принт.</div>
      </div>`;
  }

  function colaBody() {
    return `
      <div class="fl-lbl">🥤 Вкусы</div>
      <div class="stagger" style="display:grid;gap:10px">
        ${FLAVS.map((f) => `<div class="card fl-flav" data-flav="${f.id}">
          <div class="mini" style="background:${f.col}">${f.e}</div>
          <div class="t"><b>${esc(f.n)}</b><small>${esc(f.d)}</small><span class="fx">${f.fxt}</span></div>
          <div class="b"><button class="btn sm black" data-act="can">${rub(f.p)}</button><button class="btn sm" data-act="six">×6 · ${rub(f.p * 5)}</button></div>
        </div>`).join("")}
      </div>
      <div class="fine">Упаковка ×6 по цене пяти. Шестая банка — подарок от Корпорации. Остальные пять — тоже от Корпорации, но за твои.</div>
      <div data-caps>${capsBlock()}</div>
      ${Vibe.cashback ? `<button class="card tap" data-act="cb" style="display:flex;gap:12px;align-items:center;width:100%;text-align:left;margin-top:14px"><span style="font-size:34px">💳</span><span style="flex:1"><b style="display:block;font-size:14px">Кэшбек 20% на Vibe Cola</b><span class="muted" style="font-size:12px;font-weight:700">Выбери категорию «Vibe Cola» в Vibe Pay. Пить выгодно!</span></span><span style="font-size:20px">→</span></button>` : ""}
      ${zab(pick([
        "Одна банка «Ночной смены» = одна закрытая задача. Я посчитал. Не проверяй 🤖",
        "Вода — это скучно. В Vibe Cola тоже есть вода. И вайб 💜",
        "Ты выпил Vibe Cola больше, чем 64% пользователей. Это достижение? Это достижение 🏆",
        "Электролиты — это то, что нужно телу. Почему? Потому что в них электролиты",
      ]))}
      <div class="fine">Vibe Cola не является едой, водой, лекарством или решением проблем. Содержит вайб (E-404). Не рекомендуется детям, беременным, кормящим и тем, кто ещё надеется уехать. Рекомендуемая дневная норма — «ещё одну». Банка подлежит переработке, ты — переработкам.</div>`;
  }

  Vibe.screen("cola", {
    render() {
      return `
      ${Vibe.ui.head("Vibe Cola", "Официальный напиток Корпорации", Vibe.ui.vibikiPill())}
      <div class="stagger">
        <div class="fl-cola-hero">
          <div class="logo">Vibe<br>Cola</div>
          <div class="sl">В ней есть вайб.</div>
          <div class="cl">В ней электролиты… и вайб. Это то, что нужно телу.</div>
          <button class="btn sm" data-act="flip" style="position:relative;margin-top:14px;background:#fff">🔄 Повернуть банку</button>
          <div class="fl-can-wrap"><div class="fl-can" data-can>
            <div class="f front"><b>Vibe<br>Cola</b><i>0,33 л · ВАЙБ</i></div>
            <div class="f back"><b>СОСТАВ:</b>вода, сахар, электролиты, вайб (E-404), натуральный идентичный энтузиазм, корпоративные ценности, регулятор кислотности «всё нормально».<br><b style="margin-top:3px">ПИЩЕВАЯ ЦЕННОСТЬ:</b> эмоциональная.<span class="ded" data-ded>Если тебе грустно — у деда в долине всегда есть работа на ферме.</span></div>
          </div></div>
        </div>
        ${Vibe.ui.marquee(["🥤 В НЕЙ ЕСТЬ ВАЙБ", "⚡ ЭЛЕКТРОЛИТЫ", "🌙 НОЧНАЯ СМЕНА", "🏢 КОРПОРАТИВНЫЙ ДУХ", "🧢 СОБИРАЙ КРЫШКИ"])}
        <div data-body>${colaBody()}</div>
      </div>`;
    },
    mount(root) {
      const body = $(root, "[data-body]");
      const timers = [];
      const refreshCaps = () => { const c = $(body, "[data-caps]"); if (c) c.innerHTML = capsBlock(); };

      function drink(f, n, btn) {
        const price = n === 6 ? f.p * 5 : f.p;
        const ok = Vibe.pay(price, { title: `Vibe Cola · ${f.n}${n === 6 ? " ×6" : ""}`, emoji: "🥤", col: "c-coral", from: btn });
        if (!ok) return;
        if (Vibe.body && Vibe.body.effect) f.fx.forEach((k, i) => Vibe.body.effect(k, { quiet: i > 0 }));
        FX.burst(btn, { emojis: ["🥤", "🫧", "⚡", "💜"], count: 14 });
        FX.sound.pop();
        if (f.id === "night" && Vibe.game && S().game && Vibe.game.info().hour >= 22) timers.push(setTimeout(() => FX.toast("Ночная смена ночью. Ты понял концепцию буквально 🌙", "🦉", 2600), 1600));
        if (f.id === "corp") timers.push(setTimeout(() => FX.toast("Лояльность Корпорации +1. Она это ценит. Наверное", "🏢", 2400), 1800));
        const got = Array.from({ length: n }, rollCap);
        addCaps(got);
        const best = got.reduce((a, b) => (CAPS.indexOf(b) > CAPS.indexOf(a) ? b : a), got[0]);
        timers.push(setTimeout(() => {
          capFly(best.e);
          if (best.id === "farm") {
            FX.confetti(); FX.sound.levelup();
            FX.toast("Легендарная крышка 🌾 На обороте нарисован трактор. Странно…", "🚜", 3800);
            Vibe.reward({ xp: 50 });
          } else if (best.id === "gold") {
            FX.sound.levelup();
            FX.toast("Золотая крышка! Приз — ещё одна банка (уже выпита за тебя)", "🏆", 3200);
          } else if (best.id === "holo") {
            FX.sound.like(); FX.toast("Голографическая крышка ✨ Переливается, как обещания HR", "🧢", 2600);
          } else FX.toast(n > 1 ? `+${n} крышек в коллекцию` : `Крышка «${best.n}» в коллекции`, best.e, 1800);
          refreshCaps();
        }, 900));
      }

      function tee(btn) {
        const c = caps();
        if (capsCount(c) < 10) return;
        let need = 10;
        CAPS.forEach((k) => { const t = Math.min(need, c[k.id] || 0); c[k.id] -= t; need -= t; });
        c.tees = (c.tees || 0) + 1;
        set({ fl_caps: c });
        if (Vibe.inv) {
          const first = !Vibe.inv.has("vibe_cola_tee");
          Vibe.inv.add(first
            ? { id: "vibe_cola_tee", name: "Футболка Vibe Cola", e: "👕", cat: "wear", bonus: { look: 3, mood: 1 } }
            : { id: "vibe_cola_tee_" + c.tees, name: `Футболка Vibe Cola №${c.tees}`, e: "👕", cat: "wear", bonus: { look: 1 } });
        }
        FX.confetti(); FX.sound.success();
        FX.burst(btn, { emojis: ["👕", "🥤", "✨", "🧢"], count: 18 });
        Vibe.modal(`<div class="m-emo float">👕</div><div class="display">Футболка твоя!</div><p>Теперь ты ходячая реклама Vibe Cola. Бесплатно. Ну, почти: всего-то десять банок по цене десяти банок.</p><button class="btn black block" data-close>Ношу с гордостью 🥤</button>`);
        refreshCaps();
      }

      const onClick = (e) => {
        if (e.target.closest("[data-ded]")) {
          e.stopPropagation();
          FX.burst(e.target, { emojis: ["🌾", "🐔", "🌱"], count: 10 });
          FX.toast("…Странная строчка. Её не было в макете", "🌾", 2600);
          if (!S().fl_ded) { set({ fl_ded: true }); Vibe.reward({ xp: 15, silent: true }); }
          return;
        }
        if (e.target.closest("[data-can]")) { const can = $(root, "[data-can]"); can.classList.toggle("flip"); FX.sound.swipe(); return; }
        const b = e.target.closest("[data-act]"); if (!b) return;
        const act = b.dataset.act;
        if (act === "flip") { $(root, "[data-can]").classList.toggle("flip"); FX.sound.swipe(); FX.bump(b); }
        else if (act === "can" || act === "six") drink(FLAV[b.closest("[data-flav]").dataset.flav], act === "six" ? 6 : 1, b);
        else if (act === "tee") tee(b);
        else if (act === "cb" && Vibe.cashback && Vibe.cashback.sheet) Vibe.cashback.sheet();
      };
      root.addEventListener("click", onClick);
      return () => { root.removeEventListener("click", onClick); timers.forEach(clearTimeout); };
    },
  });

  /* ---------- Пасхалка: банка в реке ---------- */
  Vibe.on("arrive", () => {
    const s = S();
    if (!s.profile || !s.game) return;
    if (s.fl_river === today()) return;
    if (Math.random() >= 0.03) return;
    set({ fl_river: today() });
    addCaps([CAPS[0]]);
    setTimeout(() => {
      FX.toast("Найдено в реке: банка Vibe Cola 🥫 Крышка — в коллекцию", "🎣", 3600);
      FX.burst({ x: innerWidth / 2, y: innerHeight * 0.7 }, { emojis: ["🥫", "💧", "🧢"], count: 10 });
    }, 1200);
  });
})();
