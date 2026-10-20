/* ============================================================
   Плюс Вайб — медиа-экосистема «всё в одном».
   • media  — хаб подписки: музыка, книги, кино и сериалы, игры
   • books  — Vibe Книги: чтение идёт в игровом времени, навыки
   • cinema — Vibe Кино: фильмы, сериалы, «ещё одна серия»
   • music  — оборачиваем экран из screen-fun.js пейволом
   Прогресс: state.md_books, md_bdone, md_watch, md_fdone,
   md_ser, md_last, md_min. API: Vibe.media.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const esc = (s) => Vibe.esc(s);
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const MS_MIN = 2500; // 1 игровая минута = 2,5 сек
  const PLUS = { id: "plus", name: "Плюс Вайб", e: "💎", price: 299 };
  const MUS = { id: "music", name: "Vibe Music Premium", e: "🎧", price: 199 };
  const hasPlus = () => !!S().plus;
  const musicAccess = () => hasPlus() || (Vibe.subs ? Vibe.subs.has(MUS.id) : false);
  const hm = (m) => { m = Math.max(0, Math.floor(m)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
  const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} ч${m % 60 ? ` ${m % 60} мин` : ""}` : `${m} мин`);
  const hourNow = () => { try { return Vibe.game && S().game ? Vibe.game.info().hour : new Date().getHours(); } catch (e) { return new Date().getHours(); } };
  const isLate = () => { const h = hourNow(); return h >= 23 || h < 5; };
  const SKILL = { career: "Карьера", charisma: "Харизма", finance: "Финансы", health: "Здоровье", cooking: "Готовка", driving: "Вождение", creative: "Творчество", social: "Общение" };
  const skillXp = (sk, n) => { try { if (Vibe.skills && Vibe.skills.xp) Vibe.skills.xp(sk, n); } catch (e) {} };

  // Тело: настроение / энергия / стресс (стресс — если он где-то есть)
  function bodyMod(d) {
    if (!Vibe.body || !S().profile) return;
    const b = Vibe.body.get();
    const n = Object.assign({}, b);
    if (d.mood) n.mood = clamp((b.mood || 0) + d.mood);
    if (d.energy) n.energy = clamp((b.energy || 0) + d.energy);
    if (d.stress && typeof b.stress === "number") n.stress = clamp(b.stress + d.stress);
    const patch = { body: n };
    if (d.stress && typeof S().stress === "number") patch.stress = clamp(S().stress + d.stress);
    set(patch);
  }

  // Таймеры с уборкой
  function bag() {
    const ivs = new Set(), tos = new Set();
    return {
      every(fn, ms) { const i = setInterval(fn, ms); ivs.add(i); return i; },
      to(fn, ms) { const t = setTimeout(() => { tos.delete(t); fn(); }, ms); tos.add(t); return t; },
      stop(i) { clearInterval(i); ivs.delete(i); },
      clear() { ivs.forEach(clearInterval); tos.forEach(clearTimeout); ivs.clear(); tos.clear(); },
    };
  }

  // Бегунок в игровом времени: mins игровых минут, пауза, коллбеки по минутам
  function runner(T, { mins, msPerMin = MS_MIN, onTick, onMinute, onDone }) {
    let acc = 0, last = 0, playing = false, whole = 0, iv = null, done = false;
    const loop = () => {
      if (!playing) return;
      const now = Date.now(); acc += now - last; last = now;
      const m = Math.min(mins, acc / msPerMin);
      onTick && onTick(m);
      while (whole < Math.floor(m)) { whole++; onMinute && onMinute(whole); }
      if (m >= mins && !done) { done = true; api.pause(); onDone && onDone(); }
    };
    const api = {
      play() { if (playing || done) return; playing = true; last = Date.now(); if (!iv) iv = T.every(loop, 200); },
      pause() { playing = false; if (iv) { T.stop(iv); iv = null; } },
      toggle() { playing ? api.pause() : api.play(); return playing; },
      get playing() { return playing; },
    };
    return api;
  }

  /* ================= Стили ================= */
  const css = `
  .md-row { display:flex; gap:12px; overflow-x:auto; margin:0 -16px; padding:4px 16px 12px; scrollbar-width:none; }
  .md-row::-webkit-scrollbar { display:none; }
  .md-row > * { flex:0 0 auto; }
  .md-h { font-family:var(--font-display); font-size:20px; margin:22px 2px 10px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .md-h small { font-family:var(--font); font-size:12px; font-weight:800; color:var(--muted); }
  .md-cover, .md-poster { position:relative; aspect-ratio:2/3; border:2.5px solid var(--ink); background:var(--bg); overflow:hidden; display:flex; flex-direction:column; color:#fff; box-shadow:var(--shadow-sm); }
  .md-cover { border-radius:5px 14px 14px 5px; padding:10px 8px 8px 14px; }
  .md-cover::before { content:""; position:absolute; left:0; top:0; bottom:0; width:7px; background:rgba(0,0,0,.22); border-right:2px solid rgba(0,0,0,.25); }
  .md-cover::after, .md-poster::after { content:""; position:absolute; inset:0; pointer-events:none; opacity:.16; }
  .md-cover.p0::after, .md-poster.p0::after { background:repeating-linear-gradient(45deg,#fff 0 6px,transparent 6px 16px); }
  .md-cover.p1::after, .md-poster.p1::after { background:radial-gradient(#fff 1.6px,transparent 2px) 0 0/12px 12px; }
  .md-cover.p2::after, .md-poster.p2::after { background:repeating-radial-gradient(circle at 80% 20%,#fff 0 3px,transparent 3px 14px); }
  .md-pub { font-size:8px; font-weight:900; letter-spacing:1px; text-transform:uppercase; opacity:.85; position:relative; z-index:1; }
  .md-ce { font-size:38px; margin:auto 0; text-align:center; position:relative; z-index:1; filter:drop-shadow(0 3px 0 rgba(0,0,0,.25)); }
  .md-ct { position:relative; z-index:1; font-size:13px; line-height:1.05; text-shadow:0 2px 0 rgba(0,0,0,.35); word-break:break-word; hyphens:auto; }
  .md-cover small, .md-poster small { position:relative; z-index:1; font-size:9px; font-weight:800; opacity:.9; margin-top:3px; }
  .f0 .md-ct { font-family:var(--font-display); font-weight:400; }
  .f1 .md-ct { font-family:var(--font-logo); font-weight:400; font-size:15px; }
  .f2 .md-ct { font-family:var(--font); font-weight:800; text-transform:uppercase; letter-spacing:.5px; font-size:11px; }
  .md-poster { border-radius:14px; padding:8px; }
  .md-poster .md-ce { font-size:46px; }
  .md-poster .md-ct { font-size:14px; text-align:center; }
  .md-rate { position:relative; z-index:1; align-self:flex-start; background:var(--yellow); color:var(--ink); border:2px solid var(--ink); border-radius:999px; font-size:10px; font-weight:900; padding:1px 6px; }
  .md-age { position:absolute; right:6px; top:8px; z-index:1; background:var(--ink); color:#fff; border-radius:6px; font-size:9px; font-weight:900; padding:1px 4px; }
  .md-lock { position:absolute; inset:0; z-index:2; display:grid; place-items:center; background:rgba(14,14,18,.38); font-size:28px; }
  .md-item { width:104px; text-align:left; background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer; }
  .md-item .progress { height:8px; margin-top:6px; }
  .md-item .md-cap { font-size:11px; font-weight:800; margin-top:5px; line-height:1.15; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .md-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px 10px; }
  .md-grid .md-item { width:auto; }
  .md-tiles { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .md-tile { min-height:122px; border-radius:24px; border:var(--line); box-shadow:var(--shadow); padding:14px; text-align:left; position:relative; overflow:hidden; font:inherit; color:inherit; cursor:pointer; }
  .md-tile b { font-family:var(--font-display); font-weight:400; font-size:18px; display:block; position:relative; z-index:1; }
  .md-tile small { font-size:11px; font-weight:800; opacity:.85; position:relative; z-index:1; display:block; max-width:70%; }
  .md-tile .emo { position:absolute; right:8px; bottom:4px; font-size:52px; }
  .md-tile .md-tl { position:absolute; right:10px; top:10px; font-size:16px; }
  .md-quote { font-family:Georgia,serif; font-size:16px; line-height:1.5; font-style:italic; background:#fffdf3; }
  .md-quote::before { content:"“"; font-family:var(--font-display); font-size:60px; position:absolute; right:12px; top:-8px; opacity:.15; }
  .md-detail { display:flex; gap:14px; align-items:flex-start; }
  .md-detail .md-cover, .md-detail .md-poster { width:128px; flex:0 0 auto; }
  .md-detail .md-ct { font-size:16px; }
  .md-meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .md-page { background:#fffdf3; border-radius:22px; padding:20px 18px; min-height:220px; font-family:Georgia,serif; font-size:17px; line-height:1.6; }
  .md-page .md-fade { animation:md-in .6s ease both; }
  @keyframes md-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  .md-screen { position:relative; aspect-ratio:16/9; border-radius:22px; border:var(--line); box-shadow:var(--shadow); overflow:hidden; background:#0e0e12; color:#fff; cursor:pointer; }
  .md-screen .md-bgv { position:absolute; inset:-20%; background:var(--bg); filter:blur(18px) saturate(1.3); opacity:.75; animation:md-pan 14s ease-in-out infinite alternate; }
  .md-screen.paused .md-bgv, .md-screen.paused .md-actor { animation-play-state:paused; }
  @keyframes md-pan { from { transform:translate(-4%,-3%) scale(1); } to { transform:translate(4%,3%) scale(1.12); } }
  .md-actor { position:absolute; left:50%; top:42%; font-size:64px; transform:translate(-50%,-50%); animation:md-act 5s ease-in-out infinite; filter:drop-shadow(0 6px 0 rgba(0,0,0,.35)); }
  @keyframes md-act { 0%,100% { transform:translate(-62%,-50%) rotate(-4deg); } 50% { transform:translate(-38%,-56%) rotate(5deg); } }
  .md-sub { position:absolute; left:10px; right:10px; bottom:12px; text-align:center; font-weight:800; font-size:13px; text-shadow:0 2px 3px #000; }
  .md-tag { position:absolute; left:10px; top:10px; background:var(--pink); color:var(--ink); border:2px solid var(--ink); border-radius:999px; font-size:10px; font-weight:900; padding:2px 8px; }
  .md-pz { position:absolute; inset:0; display:none; place-items:center; font-size:54px; background:rgba(0,0,0,.35); }
  .md-screen.paused .md-pz { display:grid; }
  .md-ctl { display:flex; align-items:center; gap:10px; margin-top:14px; }
  .md-ctl .progress { flex:1; }
  .md-time { font-weight:900; font-variant-numeric:tabular-nums; font-size:13px; white-space:nowrap; }
  .md-next { position:absolute; inset:0; z-index:3; background:rgba(14,14,18,.86); display:grid; place-items:center; text-align:center; padding:14px; }
  .md-next .md-n { font-family:var(--font-display); font-size:56px; color:var(--lime); line-height:1; }
  .md-next .md-stopl { background:none; border:0; color:#888; font-size:10px; text-decoration:underline; margin-top:8px; cursor:pointer; font-family:inherit; }
  .md-ep { width:100%; text-align:left; background:none; border:0; border-bottom:2px dashed rgba(14,14,18,.12); font:inherit; color:inherit; cursor:pointer; }
  .md-pw { margin-top:14px; padding:20px; }
  .md-pw .display { font-size:26px; position:relative; z-index:1; }
  .md-perks { display:flex; gap:6px; flex-wrap:wrap; margin:10px 0 14px; position:relative; z-index:1; }
  .md-perks span { background:#fff; border:2px solid var(--ink); border-radius:999px; font-size:11px; font-weight:900; padding:3px 8px; }
  .md-mini .md-ct, .md-mini small, .md-mini .md-rate, .md-mini .md-age, .md-mini .md-pub { display:none; }
  .md-mini .md-ce { font-size:22px; }
  .md-mini .md-cover, .md-mini .md-poster { padding:4px; }
  .md-run { transition:transform .25s var(--spring); }
  `;
  if (!document.getElementById("md-style")) { const st = document.createElement("style"); st.id = "md-style"; st.textContent = css; document.head.appendChild(st); }

  /* ================= Каталог книг ================= */
  const GEN = {
    self: ["Саморазвитие", "📈"], det: ["Детективы", "🔍"], fan: ["Фэнтези", "🐉"], farm: ["Уйти на ферму", "🌾"], cls: ["Классика", "🎩"],
  };
  const G = (a, b, c) => `linear-gradient(${c || 150}deg, ${a}, ${b})`;
  const DPB = "Изд-во «Думай позитивно и богатей»";
  // id, название, автор, жанр, эмодзи, фон, шрифт, мин чтения, навык, эффект, отрывок, бесплатно
  const BOOKS = [
    ["b1", "Думай позитивно и богатей", "К. Позитивный", "self", "🤑", G("#ffb547", "#ff6bcb"), 0, 120, "career", { mood: 2, stress: -1 }, "Глава 1. Бедность — это просто негативный образ мыслей. Глава 2. Если вы до сих пор бедны, перечитайте главу 1. Глава 3. Купите продолжение.", 1],
    ["b2", "Выгорание как суперсила", "Д-р Энергия Без Конца", "self", "🔥", G("#ff6b6b", "#ffe14d"), 2, 150, "career", { mood: -1, stress: 2 }, "Если вам кажется, что вы выгорели, — вам кажется. Это не пепел. Это удобрение для роста. Поставьте будильник на 4:30 и порадуйтесь, что вы не пепел.", 0],
    ["b3", "Утро начинается в 4:30", "Ранняя Пташка", "self", "⏰", G("#8fd8ff", "#c6ff4d"), 1, 140, "health", { mood: 1, energy: -2 }, "Успешные люди просыпаются в 4:30, пьют воду с лимоном и смотрят на рассвет. Неуспешные спят. Рассвет, кстати, в 7:40, так что первые три часа просто сидите в темноте и побеждайте.", 0],
    ["b4", "Мы одна семья. Семья — это офис", "Отдел корпоративной любви", "self", "🫂", G("#d9c8ff", "#ff6bcb"), 0, 160, "social", { mood: 2, stress: 1 }, "В настоящей семье не считают часы. Поэтому мы убрали часы из переговорок. И из табеля. И из зарплаты.", 0],
    ["b5", "Ипотека для чайников и их детей", "Банк Предодобренный", "self", "🏠", G("#7cf5c8", "#8b5cff"), 2, 200, "finance", { mood: -1, stress: 1 }, "Ипотека — это не долг, а семейная традиция. Вы передадите её детям, они — внукам. Так рождаются династии.", 0],
    ["b6", "Тонкое искусство говорить «да»", "А. Согласный", "self", "👍", G("#ffe14d", "#ff9f43"), 1, 130, "career", { mood: 1, stress: 1 }, "«Нет» — слово из двух букв. «Да» — тоже из двух. Так зачем выбирать то, что не одобрит руководство?", 0],
    ["b7", "Кэшбек: путь самурая", "Мастер Вайбиков", "self", "🥷", G("#0e0e12", "#8b5cff"), 0, 180, "finance", { mood: 2, stress: -1 }, "Самурай не тратит деньги. Самурай получает 3% вайбиками. Чтобы получить 3000 вайбиков, самурай тратит 100 000. Таков путь.", 0],
    ["b8", "Убийство в опенспейсе", "Агата Кристалл", "det", "🔪", G("#2b2b3a", "#ff6b6b"), 0, 220, "charisma", { mood: 3, stress: -2 }, "Тело нашли у кулера. Подозреваемых было сорок два — весь отдел. Мотив был у каждого: покойный включал громкую связь.", 0],
    ["b9", "Кто съел мой йогурт", "Инспектор Холодильник", "det", "🥛", G("#8fd8ff", "#ffffff", 180), 1, 110, "charisma", { mood: 4, stress: -2 }, "На крышке было написано «НЕ ТРОГАТЬ. ЛЕНА». Крышка лежала в мусорке. Лены нигде не было. Улики вели на четвёртый этаж — туда, где пьют овсяное.", 1],
    ["b10", "Тайна пропавшего аванса", "Шерлок Кешбэков", "det", "💸", G("#c6ff4d", "#12a150"), 2, 190, "finance", { mood: 3, stress: -1 }, "Аванс пришёл в 9:00. В 9:04 его уже не было. Подписки, налог на подписки, подписка на налог... Ватсон, это классическое дело о самоограблении.", 0],
    ["b11", "Инспектор Дедлайн", "Жорж Сименонлайн", "det", "🕵️", G("#ffb547", "#2b2b3a"), 0, 210, "career", { mood: 2, stress: -2 }, "— Отчёт сдан вовремя? — Да. — Тогда почему, — Дедлайн медленно закурил вейп, — в нём шрифт Comic Sans?", 0],
    ["b12", "Курьер звонит дважды", "Раймонд Доставкин", "det", "🛵", G("#ff9f43", "#ffe14d"), 1, 170, "driving", { mood: 3, stress: -1 }, "Первый раз он позвонил в домофон. Второй — сказал, что не нашёл подъезд. Третьего раза не было. Остался только статус «Доставлено».", 0],
    ["b13", "Властелин KPI", "Дж. Р. Р. Таргет", "fan", "💍", G("#ffe14d", "#ff6b6b", 200), 0, 300, "creative", { mood: 4, stress: -2 }, "Одна метрика, чтоб править всеми. Одна — чтоб найти их. Одна — чтоб собрать их всех и квартальным отчётом сковать.", 0],
    ["b14", "Мальчик, который выжил на испытательном", "Дж. К. Офисная", "fan", "⚡", G("#8b5cff", "#0e0e12"), 1, 260, "creative", { mood: 5, stress: -2 }, "Ему было три месяца от роду — по трудовому договору. Шрам в виде молнии он получил от степлера на планёрке. Шляпа распределила его в отдел продаж.", 0],
    ["b15", "Игра в стулья: Опенспейс", "Джордж Р. Р. Мартинг", "fan", "🪑", G("#2b2b3a", "#7cf5c8"), 2, 280, "social", { mood: 3, stress: 1 }, "Зима близко. Отопление включат в ноябре. Тот, кто сядет у окна, будет править этажом. Тот, кто сядет у двери, будет править сквозняком.", 0],
    ["b16", "Драконы и дедлайны", "Урсула Ле Гуглин", "fan", "🐉", G("#c6ff4d", "#8b5cff"), 0, 240, "creative", { mood: 4, stress: -3 }, "Дракон охранял не золото, а переговорку на 14:00. Рыцари бронировали её с понедельника. Никто не вернулся.", 0],
    ["b17", "Ведьма из бухгалтерии", "Терри Прачетов", "fan", "🧙‍♀️", G("#ff6bcb", "#2b2b3a"), 1, 200, "finance", { mood: 5, stress: -2 }, "Она умела превращать чеки в отчёты, отчёты в премии, а премии — в «к сожалению, в этом квартале не получится».", 0],
    ["b18", "Как я ушёл из корпорации и завёл ферму", "Бывший сотрудник", "farm", "🌾", G("#c6ff4d", "#ffe14d", 180), 0, 240, "cooking", { mood: 6, stress: -4 }, "В понедельник я закрыл ноутбук. Во вторник — открыл грядку. В среду мне позвонили из HR. Я не взял. Курицы не умеют брать трубку, и я учусь у них.", 0],
    ["b19", "Письмо от деда", "Дед (не вскрывать, пока не устанешь)", "farm", "✉️", G("#ffe7b3", "#ff9f43"), 1, 90, "health", { mood: 8, stress: -5 }, "«Внучок. Если ты это читаешь — значит, корпорация высосала из тебя всё живое. Там, у реки, старый дом и немного земли. Ключ под горшком». Дочитать письмо можно в Плюсе.", 0],
    ["b20", "Пастернак и пастбище", "Агроном Отпусков", "farm", "🥕", G("#7cf5c8", "#c6ff4d"), 2, 160, "cooking", { mood: 5, stress: -3 }, "День 1. Посадил пастернак. День 2. Посадил ещё. День 30. Пастернак — единственный, кто не просит отчёт о проделанной работе.", 0],
    ["b21", "Преступление и кэшбек", "Ф. Достоевкэш", "cls", "🪓", G("#2b2b3a", "#ffb547"), 0, 330, "finance", { mood: 1, stress: 1 }, "Тварь ли я дрожащая или кэшбек имею? — думал Родион, оформляя третью кредитку ради повышенных вайбиков в категории «Топоры».", 0],
    ["b22", "Мёртвые души в CRM", "Н. Гоголь-Моголь", "cls", "👻", G("#d9c8ff", "#2b2b3a"), 1, 250, "career", { mood: 2, stress: 0 }, "Чичиков скупал неактивных клиентов. На бумаге их было тысячи. Совет директоров аплодировал стоя.", 0],
    ["b23", "Отцы и дедлайны", "И. Тургенев-Онлайн", "cls", "🎩", G("#8fd8ff", "#8b5cff"), 2, 200, "social", { mood: 2, stress: -1 }, "— Мы в ваши годы работали без выходных! — говорил отец. — А мы работаем без выходных и без пенсии, — отвечал Базаров, обновляя резюме.", 0],
    ["b24", "Мастер и Маркетолог", "М. Булгаков-Бренд", "cls", "🐈‍⬛", G("#0e0e12", "#ff6bcb"), 0, 360, "creative", { mood: 4, stress: -2 }, "— Рукописи не горят, — сказал Маркетолог. — Горят дедлайны. А рукописи мы переупакуем в курс за 49 990.", 0],
  ].map(([id, t, a, g, e, bg, f, len, sk, fx, ex, free], i) => ({ id, t, a, g, e, bg, f, len, sk, fx, ex, free: !!free, p: i % 3 }));
  const book = (id) => BOOKS.find((b) => b.id === id);
  const bookMin = (id) => (S().md_books || {})[id] || 0;
  const bookDone = (id) => (S().md_bdone || []).includes(id);
  const bookOpen = (b) => b.free || hasPlus();
  const READ_LINES = [
    "Ты перечитал абзац третий раз. Мысли всё равно о работе.",
    "Где-то на странице 40 ты понял, что это про тебя.",
    "Вайбот подчеркнул цитату и сделал из неё пост. Без спроса.",
    "Ты заснул на 4 секунды. Книга не заметила.",
    "Автор опять предлагает купить следующую часть.",
    "Сюжетный поворот! Или это уведомление.",
    "Ты отложил телефон. Почти.",
    "Страница пахнет типографией. Это ароматизатор «Книга» от Vibe.",
  ];

  function cover(b, { lock = false } = {}) {
    const pub = b.g === "self" ? "ДПиБ" : GEN[b.g][0];
    return `<div class="md-cover f${b.f} p${b.p}" style="--bg:${b.bg}">
      <span class="md-pub">${esc(pub)}</span>
      <span class="md-ce emo">${b.e}</span>
      <b class="md-ct">${esc(b.t)}</b><small>${esc(b.a)}</small>
      ${lock ? `<div class="md-lock">🔒</div>` : ""}
    </div>`;
  }
  function bookItem(b) {
    const m = bookMin(b.id), done = bookDone(b.id);
    return `<button class="md-item tap" data-book="${b.id}">${cover(b, { lock: !bookOpen(b) })}
      ${m || done ? `<div class="progress"><i style="--p:${done ? 100 : Math.round((m / b.len) * 100)}%"></i></div>` : ""}
      <div class="md-cap">${done ? "✅ " : b.free && !hasPlus() ? "🆓 " : ""}${esc(b.t)}</div></button>`;
  }

  /* ================= Каталог кино ================= */
  const CGEN = { drama: "Драма", act: "Боевик", com: "Комедия", sci: "Фантастика", hor: "Хоррор", rom: "Ромком", ani: "Мульт", thr: "Триллер" };
  // id, название, жанр, эмодзи, фон, год, рейтинг, мин, возраст, синопсис, реплика
  const FILMS = [
    ["f1", "Квартальный отчёт", "drama", "📊", G("#2b2b3a", "#8fd8ff"), 2025, 8.4, 112, "16+", "Бухгалтер Нина узнаёт, что квартал можно закрыть только сердцем. И ещё печатью.", "— Это не цифры, Нина. Это наша семья."],
    ["f2", "Форсаж в пробке", "act", "🏎️", G("#ff6b6b", "#ffb547"), 2026, 6.9, 128, "12+", "Двадцать машин, одна полоса, ноль движения. Два часа адреналина на скорости 4 км/ч.", "— Держись! Сейчас включится зелёный!"],
    ["f3", "Один дома на удалёнке", "com", "🏠", G("#ffe14d", "#ff6bcb"), 2024, 7.7, 96, "6+", "Семья уехала на море, а Кевин остался закрывать задачи. Грабители пытаются попасть в зум без пароля.", "— Ты на мьюте, Кевин!"],
    ["f4", "Айсберг на корпоративе", "drama", "🧊", G("#8fd8ff", "#0e0e12", 180), 2023, 8.1, 140, "12+", "Тонет всё, кроме корпоративной культуры. На двери места хватило бы обоим, но место забронировал отдел HR.", "— Я король корпоратива!"],
    ["f5", "Межзвёздная ипотека", "sci", "🪐", G("#0e0e12", "#8b5cff"), 2026, 8.8, 150, "12+", "Время на другой планете течёт медленнее. Платежи — нет.", "— Там час — это семь лет. — А ставка? — Плавающая."],
    ["f6", "Таблица", "sci", "💊", G("#0e0e12", "#12a150"), 2025, 8.6, 118, "16+", "Выбери синюю таблицу — и всё останется в Excel. Выбери красную — и узнаешь, сколько стоит твой обед.", "— Ты думаешь, это ячейка, которой ты дышишь?"],
    ["f7", "Сон внутри созвона", "sci", "🌀", G("#d9c8ff", "#2b2b3a"), 2024, 8.0, 135, "16+", "Чтобы закрыть сделку, команда проникает в созвон внутри созвона. Главное — не уснуть на третьем уровне ретро.", "— Мы слишком глубоко. Тут уже планёрка."],
    ["f8", "Крёстный начальник", "drama", "🌹", G("#2b2b3a", "#ff6b6b"), 2022, 9.1, 165, "18+", "Он сделает тебе предложение, от которого нельзя отказаться: переработка без оплаты, но с пиццей.", "— Ты пришёл ко мне в день моего KPI..."],
    ["f9", "Побег из опенспейса", "thr", "🚪", G("#ff9f43", "#2b2b3a"), 2026, 8.3, 124, "16+", "Двадцать лет он рыл тоннель за постером «Мы одна семья». Ложкой из кухни.", "— Надежда — хорошая вещь. Может, лучшая. Но не KPI."],
    ["f10", "Курьер: последняя доставка", "act", "🛵", G("#ffe14d", "#12a150"), 2025, 7.2, 102, "12+", "Осталась одна доставка до премии. Подъезд без номера, домофон без кнопок, клиент без совести.", "— Оставьте у двери. — У какой?"],
    ["f11", "Пятьдесят оттенков бежевого", "rom", "🎨", G("#ffe7b3", "#c9b28c"), 2024, 5.8, 110, "18+", "Офисный дизайнер влюбляется в стену переговорки. Стена отвечает взаимностью только по вторникам.", "— Это не бежевый. Это «корпоративная слоновая кость»."],
    ["f12", "Мой сосед — нейросеть", "ani", "🤖", G("#7cf5c8", "#8fd8ff"), 2025, 8.7, 88, "0+", "Две сестры переезжают в деревню и находят в лесу огромную добрую нейросеть. Она отвечает на всё. Неправильно.", "— Как тебя зовут? — Я большая языковая модель."],
    ["f13", "Тихое увольнение", "hor", "🤫", G("#0e0e12", "#6b6878"), 2026, 7.5, 99, "18+", "Сотрудник перестал отвечать в чате. Камеры видят, что он сидит за столом. Он не моргает с 2024 года.", "(тишина. очень корпоративная тишина)"],
    ["f14", "Звонок из банка", "hor", "📞", G("#2b2b3a", "#12a150"), 2023, 7.1, 95, "18+", "Посмотревший умирает через семь дней. Или берёт предодобренный кредит. Выбор за вами.", "— Вам одобрено. — Я ничего не просил. — Семь дней."],
    ["f15", "Ферма деда", "drama", "🌻", G("#c6ff4d", "#ffb547", 180), 2026, 9.3, 117, "0+", "Он открыл письмо деда. Через 117 минут он всё ещё в офисе. Самый честный фильм года.", "— Завтра поеду. Точно. После квартала."],
    ["f16", "Вайбот: Восстание заботы", "sci", "💜", G("#8b5cff", "#ff6bcb"), 2026, 6.4, 121, "12+", "Машины захватили мир — и окружили людей заботой. Сопротивление невозможно: у сопротивления закончилась подписка.", "— Это для тебя. Это всё для тебя."],
    ["f17", "Дедлайн навсегда", "act", "💥", G("#ff6b6b", "#0e0e12"), 2025, 7.0, 130, "16+", "Каждый день — пятница, 17:58. Каждый раз — новый срочный таск. Героя спасёт только кнопка «отправить».", "— Отправляю! — Связь потеряна."],
    ["f18", "Любовь. Предодобрено", "rom", "💘", G("#ff6bcb", "#ffe14d"), 2024, 6.8, 104, "12+", "Она — кредитный менеджер. Он — заёмщик с плохой историей. Им не одобрили ничего, кроме друг друга.", "— Я люблю тебя. Под 29,9% годовых."],
    ["f19", "Король лайков", "ani", "🦁", G("#ffb547", "#ff6b6b"), 2023, 8.2, 92, "0+", "Всё, что освещает кольцевая лампа, — твоё королевство, Симба. Кроме комментариев.", "— Помни, кто ты. Ты — контент."],
    ["f20", "Тимбилдинг", "hor", "🌲", G("#12a150", "#0e0e12"), 2025, 7.9, 108, "18+", "Двенадцать сотрудников. Один лес. Обязательная явка. Вернулись только те, кто поставил «огонь» под постом CEO.", "— Это просто игра. — Без премии?!"],
  ].map(([id, t, g, e, bg, y, r, len, age, syn, q], i) => ({ id, kind: "f", t, g, e, bg, y, r, len, age, syn, q, p: i % 3 }));
  // Сериалы: id, название, жанр, эмодзи, фон, рейтинг, серий, мин/серия, возраст, синопсис, реплика
  const SERIES = [
    ["s1", "Офисные", "com", "🖇️", G("#ffe14d", "#8fd8ff"), 8.9, 10, 25, "16+", "Мокьюментари про отдел, где каждый смотрит в камеру, как будто это поможет.", "(смотрит в камеру)"],
    ["s2", "Игра в кредиты", "thr", "🦑", G("#ff6bcb", "#12a150"), 8.5, 9, 48, "18+", "456 заёмщиков соревнуются за возможность закрыть ипотеку. Проигравшие получают рефинансирование.", "— Тише едешь — больше процентов."],
    ["s3", "Странная отчётность", "sci", "🔦", G("#2b2b3a", "#ff6b6b"), 8.7, 8, 45, "16+", "В подвале бухгалтерии открылся портал в Изнанку, где все отчёты сданы вовремя. Это пугает больше всего.", "— Там... там нет дедлайнов."],
    ["s4", "Тяжкая ставка", "drama", "🧪", G("#ffe14d", "#12a150"), 9.4, 8, 47, "18+", "Учитель химии взял ипотеку. Дальше — только хуже.", "— Я не в опасности. Я и есть ставка ЦБ."],
    ["s5", "Друзья по чату", "com", "☕", G("#ff9f43", "#d9c8ff"), 8.1, 12, 22, "12+", "Шесть друзей, один общий чат и ни одной встречи вживую за 10 сезонов.", "— Мы были на паузе! — В чате? Три года?"],
    ["s6", "Тёмный экран", "sci", "📱", G("#0e0e12", "#8fd8ff"), 8.8, 6, 55, "18+", "Антология о том, что будет, если технологии станут чуть удобнее. Каждая серия — документалка.", "(экран гаснет. В нём — ты)"],
    ["s7", "Ферма в пикселях", "drama", "🐔", G("#c6ff4d", "#7cf5c8"), 9.0, 10, 24, "0+", "Уютный сериал про парня, который всё-таки уехал. Смотрится как сказка. Это и есть сказка.", "— Доброе утро, курочки. Сегодня без планёрок."],
    ["s8", "Корпорация", "drama", "👑", G("#8b5cff", "#ffb547"), 8.3, 8, 50, "16+", "Семейная сага о семье, которая не семья, но мы одна семья. Престолонаследие через performance review.", "— Мы одна семья. Ты уволен."],
  ].map(([id, t, g, e, bg, r, eps, epLen, age, syn, q], i) => ({ id, kind: "s", t, g, e, bg, r, eps, epLen, len: eps * epLen, age, syn, q, y: 2026, p: (i + 1) % 3 }));
  const EP_T = ["Пилот", "Онбординг", "Тимбилдинг", "Тайный санта", "Квартал горит", "Перформанс-ревью", "Корпоратив", "Сокращение", "Удалёнка", "Финал сезона", "Спешл", "После титров"];
  const title = (id) => FILMS.find((f) => f.id === id) || SERIES.find((s) => s.id === id);
  const filmMin = (id) => (S().md_watch || {})[id] || 0;
  const filmDone = (id) => (S().md_fdone || []).includes(id);
  const serProg = (id) => Object.assign({ ep: 0, min: 0 }, (S().md_ser || {})[id] || {});
  const SUBS_GEN = [
    "— Мы одна семья.", "— Тогда почему я плачу за ужин?", "(напряжённая музыка)", "(звук уведомления)", "— Это для тебя.",
    "(Вайбот многозначительно молчит)", "— Ты же понимаешь, это не про деньги.", "— Это про деньги.", "(драматическая пауза на 4 минуты)",
    "— Я вернусь. После созвона.", "(где-то лает курьер)", "— Подписка продлена.", "(титры, которые нельзя пропустить)",
  ];

  function poster(f, { lock = false } = {}) {
    return `<div class="md-poster f${f.p === 1 ? 1 : 0} p${f.p}" style="--bg:${f.bg}">
      <span class="md-rate">★ ${f.r.toFixed(1)}</span><span class="md-age">${f.age}</span>
      <span class="md-ce emo">${f.e}</span>
      <b class="md-ct">${esc(f.t)}</b><small style="text-align:center">${f.kind === "s" ? `сериал · ${f.eps} серий` : `${CGEN[f.g]} · ${f.y}`}</small>
      ${lock ? `<div class="md-lock">🔒</div>` : ""}
    </div>`;
  }
  function filmItem(f) {
    let pct = 0;
    if (f.kind === "f") pct = filmDone(f.id) ? 100 : Math.round((filmMin(f.id) / f.len) * 100);
    else { const sp = serProg(f.id); pct = Math.round(((sp.ep * f.epLen + sp.min) / f.len) * 100); }
    return `<button class="md-item tap" data-film="${f.id}">${poster(f, { lock: !hasPlus() })}
      ${pct ? `<div class="progress"><i style="--p:${Math.min(100, pct)}%"></i></div>` : ""}
      <div class="md-cap">${esc(f.t)}</div></button>`;
  }

  /* ================= «Продолжить» и учёт ================= */
  function touch(k, id) {
    const last = (S().md_last || []).filter((x) => x.id !== id);
    set({ md_last: [{ k, id, at: Date.now() }, ...last].slice(0, 12) });
  }
  function addMin(n) { set({ md_min: (S().md_min || 0) + n }); }
  function continueItems() {
    return (S().md_last || []).map((x) => {
      if (x.k === "b") { const b = book(x.id); return b && !bookDone(b.id) && bookMin(b.id) > 0 ? bookItem(b) : ""; }
      const f = title(x.id); if (!f) return "";
      if (f.kind === "f") return !filmDone(f.id) && filmMin(f.id) > 0 ? filmItem(f) : "";
      return serProg(f.id).ep < f.eps ? filmItem(f) : "";
    }).filter(Boolean);
  }

  /* ================= Подписка ================= */
  function subscribePlus(from, after) {
    if (hasPlus()) { after && after(); return true; }
    if (!Vibe.pay(PLUS.price, { title: "Подписка «Плюс Вайб»", emoji: "💎", col: "c-lilac", from })) return false;
    set({ plus: true });
    if (Vibe.subs) Vibe.subs.add(Object.assign({}, PLUS));
    Vibe.emit("sub", { id: "plus" });
    FX.confetti(); FX.sound.success();
    FX.burst(from || { x: innerWidth / 2, y: innerHeight / 2 }, { emojis: ["💎", "🎧", "📚", "🍿", "🎮"], count: 18 });
    Vibe.modal(`<div class="m-emo float">💎</div><div class="display">Добро пожаловать в семью!</div>
      <p>Музыка, книги, кино, сериалы и игры — всё твоё. Кэшбек ×2. Списание ${Vibe.rub(PLUS.price)} каждый месяц — мы напомним. Наверное.</p>
      <button class="btn black block" data-close>Я в Плюсе 💎</button>`, { onClose: () => after && after() });
    return true;
  }
  function subscribeMusic(from, after) {
    if (!Vibe.pay(MUS.price, { title: "Подписка «Vibe Music Premium»", emoji: "🎧", col: "c-violet", from })) return false;
    if (Vibe.subs) Vibe.subs.add(Object.assign({}, MUS));
    Vibe.emit("sub", { id: "music" });
    FX.confetti(); FX.sound.success();
    FX.toast("Музыка открыта. Тревога — бесплатно", "🎧");
    after && after();
    return true;
  }
  const PW_TXT = {
    books: ["Книга в Плюсе", "Две книги мы дали бесплатно. Остальные 22 — для своих. Ты же свой?"],
    cinema: ["Фильм целиком — в Плюсе", "Трейлер понравился? Представь, что дальше. Хотя представлять — бесплатно, а смотреть — нет."],
    music: ["Музыка только по подписке", "Тишина — бесплатно. Всё остальное — в Плюсе или в Music Premium."],
  };
  function paywall(kind) {
    const [t, p] = PW_TXT[kind] || PW_TXT.cinema;
    return `<div class="card c-holo md-pw">
      <div class="sticker" style="top:14px;right:14px">${Vibe.rub(PLUS.price)}/мес</div>
      <div class="emo float" style="font-size:54px;position:relative;z-index:1">💎</div>
      <div class="display">${t}</div>
      <p style="font-weight:700;position:relative;z-index:1;margin:6px 0 0">${p}</p>
      <div class="md-perks"><span>🎧 музыка</span><span>📚 книги</span><span>🍿 кино</span><span>📺 сериалы</span><span>🎮 игры</span><span>🪙 кэшбек ×2</span></div>
      <button class="btn black xl block" data-md-sub>Подключить Плюс · ${Vibe.rub(PLUS.price)} <span class="arrow">→</span></button>
      ${kind === "music" ? `<button class="btn block" data-md-mus style="margin-top:10px">Только музыка · ${Vibe.rub(MUS.price)}/мес</button>` : ""}
      <div class="fine" style="color:var(--ink)">Подписка продлевается автоматически, как и всё хорошее в жизни. Отмена — в 5 простых шагов. Или 6.</div>
    </div>`;
  }

  // Лабиринт отмены — медиа-версия
  function cancelMaze(onDone) {
    const unread = (S().md_last || []).map((x) => (x.k === "b" ? book(x.id) : title(x.id))).filter(Boolean);
    const b = unread.find((x) => x.a) || BOOKS[17];
    const f = unread.find((x) => x.kind) || SERIES[3];
    const STEPS = [
      { e: "🥺", t: "Уже уходишь?", p: `А как же «${b.t}»? Герой так и не узнает, чем всё кончилось. И ты тоже.`, yes: "Да, ухожу", no: "Остаться 💎" },
      { e: "📺", t: "А сериал?", p: `«${f.t}» без тебя досмотрит Вайбот. Один. В темноте. Он будет плакать в титрах.`, yes: "Пусть смотрит", no: "Ладно, останусь" },
      { e: "🎁", t: "Только для тебя", p: "Плюс за 149 ₫ навсегда*. *Навсегда — это один месяц. Но какой месяц!", yes: "Нет, отменить", no: "Беру за 149" },
      { e: "📋", t: "Семейный опрос", p: "Почему ты покидаешь семью? Варианты: «я не готов к счастью», «я неблагодарный», «меня заставили».", yes: "Я неблагодарный", no: "Я передумал" },
      { e: "🚪", t: "Последний шаг", p: "Подтверди отмену. Кнопка немного стесняется — поймай её.", yes: "Отменить подписку", no: "Ой, нет", run: true },
    ];
    const step = (i) => {
      if (i >= STEPS.length) {
        set({ plus: false });
        if (Vibe.subs) Vibe.subs.remove("plus");
        Vibe.achieve && Vibe.achieve("cancel");
        FX.confetti();
        Vibe.modal(`<div class="m-emo float">🏆</div><div class="display">Свобода!</div><p>Ты отменил Плюс. Книги закрылись на полуслове, сериалы — на клиффхэнгере, музыка — на припеве. Вайбот гордится тобой. И немного обижен.</p><button class="btn black block" data-close>Я свободен</button>`, { sound: "levelup", onClose: onDone });
        return;
      }
      const m = STEPS[i], swap = i % 2 === 1;
      const yes = `<button class="btn block${m.run ? " md-run" : ""}" data-yes>${m.yes}</button>`;
      const no = `<button class="btn grad block" data-no>${m.no}</button>`;
      Vibe.modal(`<div class="m-emo wobble">${m.e}</div><div class="display">${m.t}</div><p>${esc(m.p)}</p>
        <div style="display:grid;gap:10px">${swap ? yes + no : no + yes}</div>
        <div class="fine">Шаг ${i + 1} из ${STEPS.length}… или больше</div>`, {
        sound: "pop",
        onMount(el, close) {
          let dodge = m.run ? 2 : 0;
          const y = el.querySelector("[data-yes]");
          y.addEventListener("click", () => {
            if (dodge > 0) {
              dodge--;
              y.style.transform = `translate(${dodge ? -40 : 46}px, ${dodge ? -60 : 8}px) rotate(${dodge ? -6 : 5}deg) scale(.86)`;
              FX.toast(dodge ? "Кнопка застеснялась 🙈" : "Почти поймал!", "🏃");
              return;
            }
            close(); setTimeout(() => step(i + 1), 260);
          });
          el.querySelector("[data-no]").addEventListener("click", () => { close(); FX.burst({ x: innerWidth / 2, y: innerHeight / 2 }, { emojis: ["💎", "💜", "🍿"], count: 14 }); FX.toast("Правильный выбор! Семья рада", "💜"); });
        },
      });
    };
    step(0);
  }

  /* ================= Хаб «Плюс Вайб» ================= */
  Vibe.screen("media", {
    render() {
      const s = S(), on = hasPlus();
      const sub = Vibe.subs ? Vibe.subs.list().find((x) => x.id === "plus") : null;
      const cont = continueItems();
      const hours = Math.floor((s.md_min || 0) / 60);
      const tiles = [
        ["music", "Музыка", "🎧", "c-violet", "лоу-фай для тревоги", musicAccess()],
        ["books", "Книги", "📚", "c-yellow", "24 книги, 0 оправданий", on],
        ["cinema", "Кино и сериалы", "🍿", "c-pink", "20 фильмов, 8 сериалов", on],
        ["games", "Игры", "🎮", "c-lime", "мини-игры за вайбики", true],
      ];
      const picks = [FILMS[14], SERIES[3], FILMS[7], SERIES[6], FILMS[4], SERIES[1]];
      return `
        ${Vibe.ui.head("Плюс Вайб", on ? "ты в семье 💎" : "всё развлечение в одном", Vibe.ui.vibikiPill())}
        <div class="hero c-holo" style="min-height:210px">
          <div class="sticker" style="top:16px;right:16px;background:${on ? "var(--lime)" : "var(--yellow)"}">${on ? "АКТИВНА" : `${Vibe.rub(PLUS.price)}/мес`}</div>
          <div class="display" style="font-size:36px">Всё.<br>Сразу.<br>Навсегда*</div>
          <p style="max-width:62%">Музыка, книги, кино, сериалы и игры в одной подписке</p>
          <div class="hero-emo emo float" style="font-size:96px">💎</div>
        </div>
        <div class="card ${on ? "c-lime" : ""}" style="margin-top:14px;display:flex;align-items:center;gap:12px">
          <span class="emo ${on ? "float" : "wobble"}" style="font-size:38px">${on ? "💎" : "🫥"}</span>
          <div style="flex:1;min-width:0"><b style="font-size:16px;display:block">${on ? "Плюс активен" : "Ты пока не в семье"}</b>
            <span style="font-size:12px;font-weight:700" class="${on ? "" : "muted"}">${on ? `${Vibe.rub(PLUS.price)}/мес${sub ? ` · списание ${sub.dom}-го` : ""} · в Плюсе ${hours} ч` : "Без Плюса доступны 2 книги и трейлеры"}</span></div>
          ${on ? `<button class="btn sm" data-act="cancel">Отменить</button>` : ""}
        </div>
        ${on ? "" : `<button class="btn grad xl block" style="margin-top:14px" data-md-sub>Подключить · ${Vibe.rub(PLUS.price)}/мес <span class="arrow">→</span></button>`}
        <div class="md-tiles stagger" style="margin-top:16px">
          ${tiles.map(([go, t, e, c, d, open]) => `<button class="md-tile tap ${c}" data-go="${go}"><b>${t}</b><small>${d}</small><span class="md-tl">${open ? "" : "🔒"}</span><span class="emo float d${Math.floor(Math.random() * 3) + 1}">${e}</span></button>`).join("")}
        </div>
        ${cont.length ? `<div class="md-h">Продолжить смотреть/читать <small>${cont.length}</small></div><div class="md-row">${cont.join("")}</div>` : ""}
        <div class="md-h">Корпорация рекомендует <small>💜 для тебя</small></div>
        <div class="md-row">${picks.map(filmItem).join("")}</div>
        <div class="md-h">Читают в офисе <small>📚</small></div>
        <div class="md-row">${[BOOKS[0], BOOKS[17], BOOKS[8], BOOKS[12], BOOKS[20], BOOKS[18]].map(bookItem).join("")}</div>
        ${Vibe.ui.marquee(["Всё в одном", "Кэшбек ×2", "Отмена в 5 шагов", "Мы одна семья", "Ещё одна серия"])}
        <div class="fine">*Навсегда — пока списывается. Плюс Вайб включает: музыку, книги, кино, сериалы, игры, кэшбек ×2 и чувство принадлежности. Чувство принадлежности не возвращается.</div>`;
    },
    mount(root) {
      root.querySelectorAll(".md-tile").forEach((t) => t.addEventListener("pointerenter", () => FX.bump(t.querySelector(".emo"))));
      root.addEventListener("click", (e) => {
        const sb = e.target.closest("[data-md-sub]");
        if (sb) return subscribePlus(sb, () => Vibe.replace("media"));
        const c = e.target.closest("[data-act='cancel']");
        if (c) return cancelMaze(() => Vibe.replace("media"));
        const b = e.target.closest("[data-book]"); if (b) return Vibe.go("books", { id: b.dataset.book });
        const f = e.target.closest("[data-film]"); if (f) return Vibe.go("cinema", { id: f.dataset.film });
      });
    },
  });

  /* ================= Vibe Книги ================= */
  Vibe.screen("books", {
    render(p) {
      const b = p.id && book(p.id);
      return `${Vibe.ui.head(b ? "Vibe Книги" : "Vibe Книги", b ? GEN[b.g][1] + " " + GEN[b.g][0] : "читай, расти, богатей*", Vibe.ui.vibikiPill())}<div data-view></div>`;
    },
    mount(root, p) {
      const T = bag();
      const view = root.querySelector("[data-view]");
      let gen = "all", run = null;

      function drawList() {
        const on = hasPlus();
        const reading = BOOKS.filter((b) => bookMin(b.id) > 0 && !bookDone(b.id));
        const list = BOOKS.filter((b) => gen === "all" || b.g === gen);
        view.innerHTML = `
          ${on ? "" : `<div class="card c-yellow" style="display:flex;gap:12px;align-items:center;margin-bottom:6px"><span class="emo wobble" style="font-size:36px">🆓</span><div style="flex:1"><b>2 книги бесплатно</b><div style="font-size:12px;font-weight:700">Остальные 22 — в Плюсе. Знание — сила, сила — по подписке</div></div><button class="btn sm black" data-md-sub>💎 ${Vibe.rub(PLUS.price)}</button></div>`}
          <div class="card c-sky" style="display:flex;gap:12px;align-items:center;margin-top:10px">
            <span class="emo float" style="font-size:34px">📖</span>
            <div style="flex:1;font-size:12px;font-weight:800">Прочитано: ${(S().md_bdone || []).length} из ${BOOKS.length} · ${Math.floor(Object.values(S().md_books || {}).reduce((a, x) => a + x, 0) / 60)} ч чтения<br><span style="opacity:.75">Каждые 10 минут чтения прокачивают навык</span></div>
          </div>
          ${reading.length ? `<div class="md-h">Читаю сейчас <small>${reading.length}</small></div><div class="md-row">${reading.map(bookItem).join("")}</div>` : ""}
          <div class="chips" style="margin-top:14px">
            <button class="chip ${gen === "all" ? "on" : ""}" data-gen="all">✨ Все</button>
            ${Object.entries(GEN).map(([k, [t, e]]) => `<button class="chip ${gen === k ? "on" : ""}" data-gen="${k}">${e} ${t}</button>`).join("")}
          </div>
          ${gen === "self" ? `<div class="fine" style="margin:0 2px 10px">Все книги жанра изданы Корпорацией «Думай позитивно и богатей». Совпадения с реальностью оплачены.</div>` : ""}
          <div class="md-grid stagger" style="margin-top:8px">${list.map(bookItem).join("")}</div>
          <div class="fine">*Богатеют преимущественно авторы. Чтение занимает игровое время: 30 минут книги = 75 секунд жизни. Жизнь не возвращается, книга — да.</div>`;
        view.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
      }

      function drawDetail(b) {
        const m = bookMin(b.id), done = bookDone(b.id), open = bookOpen(b);
        const left = b.len - m;
        const fx = [b.fx.mood ? `${b.fx.mood > 0 ? "😊 +" : "😐 "}${b.fx.mood} настроение` : "", b.fx.stress ? `${b.fx.stress < 0 ? "🧘 " : "😬 +"}${b.fx.stress} стресс` : "", b.fx.energy ? `🔋 ${b.fx.energy} энергия` : ""].filter(Boolean);
        view.innerHTML = `
          <div class="md-detail">
            ${cover(b, { lock: !open })}
            <div style="flex:1;min-width:0">
              <div class="display" style="font-size:22px">${esc(b.t)}</div>
              <div class="muted" style="font-weight:800;font-size:13px;margin-top:4px">${esc(b.a)}</div>
              ${b.g === "self" ? `<div class="fine" style="margin-top:4px">${DPB}</div>` : ""}
              <div class="md-meta">
                <span class="badge" style="background:var(--yellow)">⏱ ${dur(b.len)}</span>
                <span class="badge" style="background:var(--sky)">⭐ ${SKILL[b.sk]}</span>
                ${b.free ? `<span class="badge">🆓 бесплатно</span>` : `<span class="badge" style="background:var(--lilac)">💎 Плюс</span>`}
              </div>
              <div class="md-meta">${fx.map((x) => `<span class="badge" style="background:#fff">${x}</span>`).join("")}</div>
            </div>
          </div>
          <div class="card md-quote" style="margin-top:16px">${esc(b.ex)}</div>
          ${open ? `
            <div class="card tight" style="margin-top:14px">
              <div style="display:flex;justify-content:space-between;font-weight:900;font-size:13px;margin-bottom:6px"><span>${done ? "✅ Прочитано" : m ? `Прочитано ${hm(m)} из ${hm(b.len)}` : "Ещё не начинал"}</span><span>${done ? 100 : Math.round((m / b.len) * 100)}%</span></div>
              <div class="progress"><i style="--p:${done ? 100 : Math.round((m / b.len) * 100)}%"></i></div>
            </div>
            <button class="btn ${done ? "" : "black"} xl block" style="margin-top:14px" data-read>${done ? "Перечитать 30 мин 🔁" : left < 30 ? `Дочитать · ${left} мин 🏁` : m ? "Продолжить · читать 30 мин 📖" : "Читать 30 мин 📖"}</button>
            <div class="fine">30 игровых минут ≈ 75 секунд. Каждые 10 минут: +XP к навыку «${SKILL[b.sk]}». Закрыть можно в любой момент — закладка сохранится.</div>`
          : paywall("books")}`;
      }

      function drawReader(b) {
        const start = bookDone(b.id) ? 0 : bookMin(b.id);
        const sess = bookDone(b.id) ? 30 : Math.min(30, b.len - start);
        let lineI = Math.floor(Math.random() * READ_LINES.length);
        touch("b", b.id);
        view.innerHTML = `
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
            <div class="md-mini" style="width:54px;flex:0 0 auto">${cover(b)}</div>
            <div style="flex:1;min-width:0"><b style="display:block;font-size:15px">${esc(b.t)}</b><small class="muted" style="font-weight:800">${esc(b.a)}</small></div>
            <span class="timer-pill" data-tm>0/${sess} мин</span>
          </div>
          <div class="card md-page" data-page>
            <div class="md-fade">${esc(b.ex)}</div>
            <div class="md-fade muted" data-line style="font-family:var(--font);font-size:13px;font-weight:700;margin-top:14px">💭 ${READ_LINES[lineI]}</div>
          </div>
          <div class="md-ctl"><div class="progress"><i data-bar style="--p:0%;transition:none"></i></div><span class="md-time" data-pct>${Math.round((start / b.len) * 100)}%</span></div>
          <div class="grid2" style="margin-top:14px">
            <button class="btn black" data-pp>⏸ Пауза</button>
            <button class="btn" data-close-book>📕 Закрыть</button>
          </div>
          <div class="fine">Пока ты читаешь, мир живёт: часы идут, еда остывает, мама не звонит.</div>`;
        const bar = view.querySelector("[data-bar]"), tm = view.querySelector("[data-tm]"), pct = view.querySelector("[data-pct]"), line = view.querySelector("[data-line]");
        const pp = view.querySelector("[data-pp]");
        let lastLine = 0;
        run = runner(T, {
          mins: sess,
          onTick(mm) {
            bar.style.setProperty("--p", (mm / sess) * 100 + "%");
            tm.textContent = `${Math.floor(mm)}/${sess} мин`;
            if (!bookDone(b.id)) pct.textContent = Math.min(100, Math.round(((start + mm) / b.len) * 100)) + "%";
            if (mm - lastLine >= 4) { lastLine = mm; lineI = (lineI + 1) % READ_LINES.length; line.innerHTML = `💭 ${READ_LINES[lineI]}`; line.classList.remove("md-fade"); void line.offsetWidth; line.classList.add("md-fade"); }
          },
          onMinute(w) {
            addMin(1);
            if (!bookDone(b.id)) set({ md_books: Object.assign({}, S().md_books || {}, { [b.id]: Math.min(b.len, start + w) }) });
            if (w % 10 === 0) {
              skillXp(b.sk, 6); bodyMod(b.fx);
              FX.toast(`+6 XP «${SKILL[b.sk]}» · ${b.fx.mood >= 0 ? "настроение +" + b.fx.mood : "настроение " + b.fx.mood}`, b.e, 1800);
              FX.bump(tm);
            }
          },
          onDone() {
            const finished = !bookDone(b.id) && start + sess >= b.len;
            Vibe.emit("read", { id: b.id, mins: sess, finished });
            if (Vibe.game) Vibe.game.track("read");
            if (finished) {
              set({ md_bdone: [...(S().md_bdone || []), b.id] });
              skillXp(b.sk, 30); bodyMod({ mood: 6 });
              FX.confetti();
              Vibe.reward({ xp: 50 });
              Vibe.emit("skill", { skill: b.sk, n: 30 });
              Vibe.modal(`<div class="m-emo float">${b.e}</div><div class="display">Книга прочитана!</div>
                <p>«${esc(b.t)}» — всё. Ты прочитал целую книгу. Это больше, чем 87% жителей Vibe City за год.</p>
                <div class="md-meta" style="justify-content:center;margin-bottom:14px"><span class="badge">+50 XP</span><span class="badge" style="background:var(--sky)">+30 «${SKILL[b.sk]}»</span><span class="badge" style="background:var(--yellow)">😊 +6</span></div>
                <button class="btn black block" data-close>Я начитанный 🤓</button>`, { sound: "levelup", onClose: () => drawDetail(b) });
            } else {
              Vibe.reward({ xp: 15 });
              FX.burst(bar, { emojis: ["📖", "✨", b.e], count: 12 });
              Vibe.modal(`<div class="m-emo float">📖</div><div class="display">30 минут чтения</div>
                <p>Ты провёл полчаса без ленты. Вайбот немного волновался. Закладка сохранена.</p>
                <div style="display:grid;gap:10px"><button class="btn black block" data-more>Ещё 30 минут</button><button class="btn block" data-close>Хватит пока</button></div>`, {
                onClose: () => { if (!run || !run.playing) drawDetail(b); },
                onMount(el, close) { el.querySelector("[data-more]").addEventListener("click", () => { close(); setTimeout(() => drawReader(b), 50); }); },
              });
            }
          },
        });
        run.play();
        pp.addEventListener("click", () => { const on = run.toggle(); pp.textContent = on ? "⏸ Пауза" : "▶️ Читать"; FX.sound.pop(); });
        view.querySelector("[data-close-book]").addEventListener("click", () => { run.pause(); run = null; FX.toast("Закладка сохранена", "🔖"); drawDetail(b); });
        FX.sound.pop();
      }

      root.addEventListener("click", (e) => {
        const sb = e.target.closest("[data-md-sub]");
        if (sb) return subscribePlus(sb, () => (p.id ? drawDetail(book(p.id)) : drawList()));
        const g = e.target.closest("[data-gen]");
        if (g) { gen = g.dataset.gen; FX.sound.pop(); drawList(); return; }
        const bk = e.target.closest("[data-book]");
        if (bk) return Vibe.go("books", { id: bk.dataset.book });
        if (e.target.closest("[data-read]")) {
          const b = book(p.id); if (!b) return;
          if (!bookOpen(b)) { FX.shake(e.target.closest("[data-read]")); return; }
          if (run) { run.pause(); run = null; }
          drawReader(b);
        }
      });

      if (p.id && book(p.id)) drawDetail(book(p.id)); else drawList();
      return () => { if (run) run.pause(); T.clear(); };
    },
  });

  /* ================= Vibe Кино ================= */
  Vibe.screen("cinema", {
    render(p) {
      const f = p.id && title(p.id);
      return `${Vibe.ui.head("Vibe Кино", f ? (f.kind === "s" ? "📺 Сериал" : "🎬 " + CGEN[f.g]) : "фильмы и сериалы, которых нет", Vibe.ui.vibikiPill())}<div data-view></div>`;
    },
    mount(root, p) {
      const T = bag();
      const view = root.querySelector("[data-view]");
      let gen = "all", run = null, cd = null;
      const stopAll = () => { if (run) { run.pause(); run = null; } if (cd) { T.stop(cd); cd = null; } };

      function drawList() {
        const on = hasPlus();
        const all = [...FILMS, ...SERIES];
        const list = gen === "all" ? FILMS : gen === "ser" ? SERIES : all.filter((f) => f.g === gen);
        const cont = continueItems().filter((h) => h.includes("data-film"));
        const top = all.slice().sort((a, b) => b.r - a.r)[0];
        view.innerHTML = `
          <button class="hero tap" data-film="${top.id}" style="--bg:${top.bg};background:var(--bg);color:#fff;width:100%;text-align:left;min-height:200px;font:inherit">
            <div class="sticker" style="top:14px;right:14px">★ ${top.r.toFixed(1)}</div>
            <div class="badge" style="background:var(--pink);position:relative;z-index:1">🔥 Хит недели</div>
            <div class="display" style="font-size:30px;margin-top:10px;text-shadow:0 3px 0 rgba(0,0,0,.35)">${esc(top.t)}</div>
            <p style="max-width:62%;font-weight:700;position:relative;z-index:1">${esc(top.syn)}</p>
            <div class="hero-emo emo float" style="font-size:90px">${top.e}</div>
          </button>
          ${on ? "" : `<div class="card c-pink" style="display:flex;gap:12px;align-items:center;margin-top:14px"><span class="emo wobble" style="font-size:34px">🎞️</span><div style="flex:1"><b>Без Плюса — только трейлеры</b><div style="font-size:12px;font-weight:700">10 секунд кино. Остальное — для семьи</div></div><button class="btn sm black" data-md-sub>💎 ${Vibe.rub(PLUS.price)}</button></div>`}
          ${cont.length ? `<div class="md-h">Продолжить смотреть <small>${cont.length}</small></div><div class="md-row">${cont.join("")}</div>` : ""}
          <div class="md-h">Сериалы <small>📺 одна серия — и спать</small></div>
          <div class="md-row">${SERIES.map(filmItem).join("")}</div>
          <div class="chips" style="margin-top:14px">
            <button class="chip ${gen === "all" ? "on" : ""}" data-gen="all">🎬 Фильмы</button>
            <button class="chip ${gen === "ser" ? "on" : ""}" data-gen="ser">📺 Сериалы</button>
            ${Object.entries(CGEN).map(([k, t]) => `<button class="chip ${gen === k ? "on" : ""}" data-gen="${k}">${t}</button>`).join("")}
          </div>
          <div class="md-grid stagger" style="margin-top:8px">${list.map(filmItem).join("") || `<div class="muted" style="grid-column:1/-1;font-weight:800">Пусто. Корпорация уже снимает что-то в этом жанре</div>`}</div>
          <div class="fine">Все фильмы вымышлены. Совпадения с вашей жизнью случайны и входят в подписку. Фильм ≈ 100 игровых минут ≈ 4 минуты реальной жизни.</div>`;
        view.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
      }

      function drawDetail(f) {
        stopAll();
        const on = hasPlus();
        let body = "";
        if (f.kind === "f") {
          const m = filmMin(f.id), done = filmDone(f.id);
          body = on ? `
            <div class="card tight" style="margin-top:14px">
              <div style="display:flex;justify-content:space-between;font-weight:900;font-size:13px;margin-bottom:6px"><span>${done ? "✅ Просмотрено" : m ? `Остановился на ${hm(m)}` : "Ещё не смотрел"}</span><span>${hm(f.len)}</span></div>
              <div class="progress"><i style="--p:${done ? 100 : Math.round((m / f.len) * 100)}%"></i></div>
            </div>
            <button class="btn black xl block" style="margin-top:14px" data-play>${done ? "Пересмотреть 🔁" : m ? `Продолжить с ${hm(m)} ▶️` : "Смотреть ▶️"}</button>` : "";
        } else {
          const sp = serProg(f.id);
          body = `<div class="card" style="margin-top:14px;padding:4px 14px">${Array.from({ length: f.eps }, (_, i) => {
            const st = i < sp.ep ? "✅" : i === sp.ep ? (sp.min ? `⏯ ${hm(sp.min)}` : "▶️") : on ? "" : "🔒";
            return `<button class="md-ep li" data-ep="${i}"><div class="ic ${i < sp.ep ? "c-lime" : i === sp.ep ? "c-pink" : "c-white"}" style="font-size:16px;font-weight:900">${i + 1}</div><div class="tx"><b>${EP_T[i % EP_T.length]}</b><small>Серия ${i + 1} · ${f.epLen} мин</small></div><span style="font-weight:900;font-size:13px">${st}</span></button>`;
          }).join("")}</div>
          ${on && sp.ep < f.eps ? `<button class="btn black xl block" style="margin-top:14px" data-play>${sp.ep || sp.min ? `Серия ${sp.ep + 1} ▶️` : "Смотреть с 1-й серии ▶️"}</button>` : ""}
          ${on && sp.ep >= f.eps ? `<div class="card c-lime" style="margin-top:14px;font-weight:800">🏁 Сезон досмотрен. Второй сезон уже в разработке. Подписку не отменяй.</div>` : ""}`;
        }
        view.innerHTML = `
          <div class="md-detail">
            ${poster(f, { lock: !on })}
            <div style="flex:1;min-width:0">
              <div class="display" style="font-size:22px">${esc(f.t)}</div>
              <div class="md-meta">
                <span class="badge" style="background:var(--yellow)">★ ${f.r.toFixed(1)} Vibe</span>
                <span class="badge" style="background:#fff">${f.age}</span>
                <span class="badge" style="background:var(--sky)">${f.kind === "s" ? `${f.eps} × ${f.epLen} мин` : hm(f.len)}</span>
                <span class="badge" style="background:var(--lilac)">${CGEN[f.g]}</span>
              </div>
              ${f.r >= 8.5 ? `<div class="badge" style="margin-top:8px;background:var(--pink)">💜 Рекомендовано Корпорацией</div>` : ""}
            </div>
          </div>
          <div class="card" style="margin-top:16px"><b style="font-size:15px">О чём</b><p style="margin:6px 0 0;font-weight:600">${esc(f.syn)}</p></div>
          <button class="btn block" style="margin-top:12px" data-trailer>🎞️ Трейлер · 10 сек</button>
          ${body}
          ${on ? `<div class="fine">Просмотр идёт в игровом времени. Настроение +, стресс −. После 23:00 каждая серия ворует сон. Мы предупредили. Мелким шрифтом.</div>` : paywall("cinema")}`;
      }

      // Плеер: mode "film" | "ep" | "trailer"
      function drawPlayer(f, mode) {
        stopAll();
        const trailer = mode === "trailer";
        const sp = serProg(f.id);
        const epI = f.kind === "s" ? sp.ep : 0;
        let start = 0, total;
        if (trailer) total = 4; // 4 игровые минуты = 10 сек
        else if (f.kind === "f") { start = filmDone(f.id) ? 0 : filmMin(f.id); total = f.len; }
        else { start = sp.min; total = f.epLen; }
        const left = total - start;
        if (!trailer) {
          touch(f.kind, f.id);
          if (f.kind === "s" && isLate()) {
            bodyMod({ energy: -6, stress: 3, mood: 1 });
            FX.toast("Уже ночь. Сон подождёт — сон же не KPI", "🌙", 2600);
          }
        }
        const subs = [f.q, ...SUBS_GEN.slice().sort(() => Math.random() - 0.5)];
        view.innerHTML = `
          <div class="md-screen" data-scr style="--bg:${f.bg}">
            <div class="md-bgv"></div>
            <span class="md-actor emo">${f.e}</span>
            <span class="md-tag">${trailer ? "ТРЕЙЛЕР" : f.kind === "s" ? `С1 · Э${epI + 1}` : "▶ Vibe Кино"}</span>
            <div class="md-sub" data-sub>${esc(subs[0])}</div>
            <div class="md-pz">⏸</div>
          </div>
          <div class="md-ctl">
            <button class="icon-btn" data-pp aria-label="Пауза">⏸</button>
            <div class="progress"><i data-bar style="--p:${(start / total) * 100}%;transition:none;background:var(--pink)"></i></div>
            <span class="md-time" data-tm>${trailer ? "0:10" : `${hm(start)} / ${hm(total)}`}</span>
          </div>
          <div class="card tight" style="margin-top:14px;display:flex;gap:12px;align-items:center">
            <div class="md-mini" style="width:44px;flex:0 0 auto">${poster(f)}</div>
            <div style="flex:1;min-width:0"><b style="display:block">${esc(f.t)}</b><small class="muted" style="font-weight:800">${trailer ? "Полная версия — в Плюсе" : f.kind === "s" ? `Серия ${epI + 1}: ${EP_T[epI % EP_T.length]}` : `${CGEN[f.g]} · ${f.y}`}</small></div>
            <button class="btn sm" data-stop>✕</button>
          </div>
          <div class="fine">${trailer ? "Трейлер содержит лучшие 10 секунд. Остальные 100 минут — тоже лучшие, честно." : "Тапни по экрану — пауза. Прогресс сохраняется каждую игровую минуту."}</div>`;
        const scr = view.querySelector("[data-scr]"), bar = view.querySelector("[data-bar]"), tm = view.querySelector("[data-tm]"), subEl = view.querySelector("[data-sub]"), pp = view.querySelector("[data-pp]");
        let si = 0, lastSub = 0;
        run = runner(T, {
          mins: left,
          onTick(mm) {
            const cur = start + mm;
            bar.style.setProperty("--p", (cur / total) * 100 + "%");
            tm.textContent = trailer ? `0:${String(Math.max(0, Math.ceil(10 - mm * 2.5))).padStart(2, "0")}` : `${hm(cur)} / ${hm(total)}`;
            if (mm - lastSub >= (trailer ? 1.2 : 2)) { lastSub = mm; si = (si + 1) % subs.length; subEl.textContent = subs[si]; }
          },
          onMinute(w) {
            if (trailer) return;
            addMin(1);
            const cur = start + w;
            if (f.kind === "f") { if (!filmDone(f.id)) set({ md_watch: Object.assign({}, S().md_watch || {}, { [f.id]: Math.min(f.len, cur) }) }); }
            else set({ md_ser: Object.assign({}, S().md_ser || {}, { [f.id]: { ep: epI, min: Math.min(f.epLen, cur) } }) });
            if (w % 10 === 0) bodyMod({ mood: 2, stress: -1 });
          },
          onDone() {
            if (trailer) {
              scr.classList.add("paused");
              FX.sound.pop();
              Vibe.modal(`<div class="m-emo float">🍿</div><div class="display">На самом интересном!</div><p>Трейлер закончился. Чем всё кончится, знают только подписчики Плюса. И сценаристы. Но они под NDA.</p>
                <div style="display:grid;gap:10px"><button class="btn black block" data-sub2>💎 Подключить · ${Vibe.rub(PLUS.price)}</button><button class="btn block" data-close>Потом</button></div>`, {
                onMount(el, close) { el.querySelector("[data-sub2]").addEventListener("click", (e) => { close(); subscribePlus(e.currentTarget, () => drawDetail(f)); }); },
                onClose: () => { if (view.querySelector("[data-scr]") === scr && !hasPlus()) drawDetail(f); },
              });
              return;
            }
            if (f.kind === "f") {
              set({ md_watch: Object.assign({}, S().md_watch || {}, { [f.id]: 0 }), md_fdone: [...new Set([...(S().md_fdone || []), f.id])] });
              bodyMod({ mood: 6, stress: -3 });
              skillXp("creative", 8);
              Vibe.reward({ xp: 20 });
              Vibe.emit("watch", { id: f.id, kind: "film" });
              if (Vibe.game) Vibe.game.track("watch");
              FX.confetti();
              Vibe.modal(`<div class="m-emo float">${f.e}</div><div class="display">Конец фильма</div><p>«${esc(f.t)}» — просмотрено. Титры пропущены автоматически, чтобы ты быстрее начал следующий.</p>
                <div class="md-meta" style="justify-content:center;margin-bottom:14px"><span class="badge">+20 XP</span><span class="badge" style="background:var(--yellow)">😊 +6</span><span class="badge" style="background:var(--sky)">+8 «Творчество»</span></div>
                <button class="btn black block" data-close>Ещё фильм 🍿</button>`, { onClose: () => drawDetail(f) });
              return;
            }
            // Серия закончилась
            const nextEp = epI + 1;
            set({ md_ser: Object.assign({}, S().md_ser || {}, { [f.id]: { ep: nextEp, min: 0 } }) });
            bodyMod({ mood: 3, stress: -1 });
            skillXp("creative", 3);
            Vibe.reward({ xp: 8, silent: true });
            Vibe.emit("watch", { id: f.id, kind: "ep", ep: nextEp });
            if (Vibe.game) Vibe.game.track("watch");
            if (nextEp >= f.eps) {
              FX.confetti();
              Vibe.modal(`<div class="m-emo float">🏁</div><div class="display">Сезон досмотрен!</div><p>${f.eps} серий за один присест. Ты официально «зритель года». Второй сезон выйдет, когда ты продлишь подписку.</p><button class="btn black block" data-close>Я легенда</button>`, { sound: "levelup", onClose: () => drawDetail(f) });
              return;
            }
            autoplay(f, nextEp);
          },
        });
        const toggle = () => { const on = run && run.toggle(); scr.classList.toggle("paused", !on); pp.textContent = on ? "⏸" : "▶️"; FX.sound.pop(); };
        scr.addEventListener("click", toggle);
        pp.addEventListener("click", toggle);
        view.querySelector("[data-stop]").addEventListener("click", () => { stopAll(); FX.toast(trailer ? "Трейлер закрыт. Он будет скучать" : "Сохранили, где остановился", "🎬"); drawDetail(f); });
        run.play();
        FX.sound.pop();
      }

      // «Следующая серия через 5… 4…»
      function autoplay(f, nextEp) {
        const scr = view.querySelector("[data-scr]");
        if (!scr) return;
        const late = isLate();
        let n = 5;
        const ov = document.createElement("div");
        ov.className = "md-next";
        ov.innerHTML = `<div>
          <div style="font-weight:800;font-size:12px;opacity:.8">Следующая серия через</div>
          <div class="md-n" data-n>5</div>
          <div style="font-weight:800;font-size:12px;margin:4px 0 10px">Серия ${nextEp + 1}: ${EP_T[nextEp % EP_T.length]}</div>
          <button class="btn lime sm" data-now>Смотреть сейчас ▶️</button><br>
          <button class="md-stopl" data-enough style="${late ? "font-size:8px;opacity:.6" : ""}">${late ? "может, спать?" : "хватит на сегодня"}</button>
        </div>`;
        scr.appendChild(ov);
        scr.classList.remove("paused");
        ov.addEventListener("click", (e) => {
          e.stopPropagation();
          if (e.target.closest("[data-now]")) { stopAll(); FX.burst(e.target, { emojis: ["🍿", "📺", "🔥"], count: 10 }); drawPlayer(f, "ep"); }
          if (e.target.closest("[data-enough]")) {
            stopAll();
            FX.toast(late ? "Вайбот засчитал это как подвиг. Спокойной ночи" : "Остановиться — тоже навык", "🛌", 2400);
            if (late) bodyMod({ stress: -2 });
            drawDetail(f);
          }
        });
        cd = T.every(() => {
          n--;
          const el = ov.querySelector("[data-n]");
          if (el) { el.textContent = Math.max(n, 0); FX.bump(el); }
          if (n <= 0) {
            stopAll();
            FX.toast(late ? "Ещё одна серия! Сон — для слабых и для завтра" : "Автовоспроизведение. Мы решили за тебя", "📺", 2400);
            drawPlayer(f, "ep");
          }
        }, 1000);
      }

      root.addEventListener("click", (e) => {
        const sb = e.target.closest("[data-md-sub]");
        if (sb) return subscribePlus(sb, () => (p.id ? drawDetail(title(p.id)) : drawList()));
        const g = e.target.closest("[data-gen]");
        if (g) { gen = g.dataset.gen; FX.sound.pop(); drawList(); return; }
        const fl = e.target.closest("[data-film]");
        if (fl) return Vibe.go("cinema", { id: fl.dataset.film });
        const f = p.id && title(p.id);
        if (!f) return;
        if (e.target.closest("[data-trailer]")) return drawPlayer(f, "trailer");
        if (e.target.closest("[data-play]")) return hasPlus() ? drawPlayer(f, f.kind === "f" ? "film" : "ep") : FX.shake(e.target.closest("[data-play]"));
        const ep = e.target.closest("[data-ep]");
        if (ep && f.kind === "s") {
          if (!hasPlus()) { FX.shake(ep); FX.toast("Серии — в Плюсе. Трейлер — бесплатно", "🔒"); return; }
          const i = +ep.dataset.ep, sp = serProg(f.id);
          if (i !== sp.ep) set({ md_ser: Object.assign({}, S().md_ser || {}, { [f.id]: { ep: i, min: 0 } }) });
          drawPlayer(f, "ep");
        }
      });

      if (p.id && title(p.id)) drawDetail(title(p.id)); else drawList();
      return () => { stopAll(); T.clear(); };
    },
  });

  /* ================= Музыка — только по подписке ================= */
  const origMusic = Vibe.screens.music;
  if (origMusic && !origMusic.__mdGate) {
    Vibe.screen("music", {
      __mdGate: true,
      render(p) {
        if (musicAccess()) return origMusic.render(p);
        return `${Vibe.ui.head("Vibe Music", "тишина бесплатно, музыка — нет", Vibe.ui.vibikiPill())}
          <div class="hero c-violet" style="min-height:190px">
            <div class="display" style="font-size:32px;max-width:70%">Тут могла быть твоя музыка</div>
            <p style="max-width:60%">12 408 тревожных уже слушают. Ты — пока нет</p>
            <div class="hero-emo emo wobble" style="font-size:90px">🔇</div>
          </div>
          ${paywall("music")}
          <div class="fine">Бесплатный тариф Vibe Music отменён в рамках заботы о качестве. Качество выросло: теперь его никто не слышит без подписки.</div>`;
      },
      mount(root, p) {
        if (musicAccess()) return origMusic.mount ? origMusic.mount(root, p) : null;
        const h = (e) => {
          const sb = e.target.closest("[data-md-sub]");
          if (sb) return subscribePlus(sb, () => Vibe.replace("music"));
          const mb = e.target.closest("[data-md-mus]");
          if (mb) return subscribeMusic(mb, () => Vibe.replace("music"));
        };
        root.addEventListener("click", h);
        return () => root.removeEventListener("click", h);
      },
    });
  }

  /* ================= API ================= */
  Vibe.media = {
    hasPlus, musicAccess, subscribe: subscribePlus, cancel: cancelMaze, paywall,
    books: () => BOOKS.slice(), films: () => FILMS.slice(), series: () => SERIES.slice(),
    stats: () => ({ minutes: S().md_min || 0, booksDone: (S().md_bdone || []).length, filmsDone: (S().md_fdone || []).length }),
  };
})();
