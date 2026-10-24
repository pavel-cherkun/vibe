/* ============================================================
   Карта города Vibe — общий компонент для такси, доставки,
   работы и жилья. Детерминированный город на сетке улиц,
   маршруты по улицам, перетаскивание, зум, анимация машинок.

   Vibe.map.create(el, { pins, ambient, interactive, height, theme, weather, hud })
     → ctrl { setPins, route, clearRoute, drive, fit, center, destroy,
              setTheme("day"|"evening"|"night"), setWeather("rain"|"snow"|null) }
     Тема по умолчанию — по Vibe.game.info().hour, погода — по Vibe.weather.now().
   Vibe.map.place(key) → { x, y, label, e }      — точки города
   Vibe.map.path(a, b) → [{x,y}, ...]            — маршрут по улицам
   Vibe.map.km(points), Vibe.map.minutes(points, mode)
   ============================================================ */
(function () {
  const SIZE = 920;
  const ST = [60, 232, 404, 576, 748, 920 - 60]; // координаты улиц (и по x, и по y)
  const SW = 30;                                  // ширина улицы
  const NS = "http://www.w3.org/2000/svg";
  const KM_PER_UNIT = 0.006;                      // 920 единиц ≈ 5,5 км

  const H_NAMES = ["Набережная Кэшбека", "ул. Подписочная", "пр. Предодобренный", "ул. Сторис", "Бульвар Вайба", "ул. Рассрочки"];
  const V_NAMES = ["ул. Лайков", "пер. Комиссий", "пр. Корпорации", "ул. Дедлайнов", "ул. Доставки", "ш. Овердрафта"];

  // Районы: строка 0–1 — Сити, 2 — Центр, 3–4 — Спальный
  const DISTRICT = (row) => (row <= 1 ? "Сити" : row === 2 ? "Центр" : "Спальный");
  const BLOCK_COL = {
    "Сити": ["#cfe3ff", "#e6dcff", "#fff1a8", "#d6f5ff"],
    "Центр": ["#ffd9ec", "#dfffd0", "#fff1a8", "#ffe0cc"],
    "Спальный": ["#ffe6b8", "#f6d7ff", "#d9f7ec", "#ffd6d6"],
  };

  // Особые кварталы
  const SPECIAL = { "1,1": "lake", "3,1": "park", "2,2": "hq", "4,3": "park2" };

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // Квартал (col,row) → прямоугольник
  function block(col, row) {
    const x1 = ST[col] + SW / 2, x2 = ST[col + 1] - SW / 2, y1 = ST[row] + SW / 2, y2 = ST[row + 1] - SW / 2;
    return { x1, x2, y1, y2, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, col, row, district: DISTRICT(row) };
  }

  // Точка у края квартала, «вход с улицы» (снизу или сверху), смещение по x
  function door(col, row, slot = 0) {
    const b = block(col, row);
    const xs = [b.x1 + 34, b.cx, b.x2 - 34];
    return { x: xs[((slot % 3) + 3) % 3], y: slot >= 3 ? b.y1 + 16 : b.y2 - 16, col, row, district: b.district };
  }

  /* ---------- Постоянные места города ---------- */
  const FIXED = {
    hq: Object.assign(door(2, 2, 1), { e: "🏢", label: "Vibe HQ" }),
    supermarket: Object.assign(door(1, 3, 2), { e: "🛒", label: "Vibe Supermarket" }),
    park: Object.assign(door(3, 1, 1), { e: "🌳", label: "Парк «Без вайфая»" }),
    wheel: Object.assign(door(4, 3, 4), { e: "🎡", label: "Колесо вайба" }),
    metro1: { x: ST[1], y: ST[3], e: "Ⓜ️", label: "м. Кредитная" },
    metro2: { x: ST[4], y: ST[2], e: "Ⓜ️", label: "м. Сити" },
    clinic: Object.assign(door(0, 2, 2), { e: "🏥", label: "Vibe Health" }),
    club: Object.assign(door(3, 2, 0), { e: "🎤", label: "Клуб «Осталось 2 билета»" }),
    // Новые точки города (только добавлены; старые ключи не менялись)
    metro3: { x: ST[2], y: ST[2], e: "Ⓜ️", label: "м. Центральная" },
    metro4: { x: ST[3], y: ST[4], e: "Ⓜ️", label: "м. Стадион" },
    gym: Object.assign(door(2, 3, 0), { e: "🏋️", label: "Фитнес «Минус вайб»" }),
    pvz: Object.assign(door(1, 4, 4), { e: "📦", label: "ПВЗ Vibe Box" }),
    cafe: Object.assign(door(1, 2, 3), { e: "☕", label: "Кофейня «Овсяный раф»" }),
    school: Object.assign(door(0, 4, 1), { e: "🏫", label: "Школа №42" }),
    cinema: Object.assign(door(4, 2, 3), { e: "🎬", label: "Кинотеатр «Спойлер»" }),
    police: Object.assign(door(0, 0, 0), { e: "🚓", label: "Полиция" }),
    post: Object.assign(door(2, 4, 2), { e: "📮", label: "Vibe Почта" }),
    gas: Object.assign(door(4, 4, 2), { e: "⛽", label: "АЗС «Литр мечты»" }),
    bcenter: Object.assign(door(3, 0, 1), { e: "🏢", label: "БЦ «Опен-спейс»" }),
    beach: { x: 740, y: 902, e: "🏖️", label: "Пляж «Шезлонг 990 ₫»" },
    pier: { x: 938, y: ST[3], e: "⛴️", label: "Причал · паром" },
    station: { x: 30, y: 800, e: "🚉", label: "Вокзал · электричка" },
  };
  // Заречье — соседний город за рекой Вайбой; туда ведёт Мост Рассрочки (по ул. Подписочной)
  const PARENTS = { x: -226, y: 262, e: "🏡", label: "Родители · другой берег" };
  const MIN_X = -390;    // карту можно сдвинуть на запад до Заречья
  const FAR_X = -60;     // точки западнее — на другом берегу
  const BRIDGE_MIN = 22; // мост: пробка/разводка, ≈40 мин на такси от дома
  // Рестораны Vibe Eat: id 1..8
  const RESTAURANTS = [[0, 1, 0], [1, 2, 0], [2, 1, 2], [3, 3, 0], [4, 2, 2], [0, 3, 1], [2, 3, 2], [4, 1, 0]];
  // Кварталы под жильё (спальный и центр)
  const HOME_BLOCKS = [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [0, 3], [2, 3], [3, 3], [4, 2], [0, 2]];
  // Кварталы под офисы
  const OFFICE_BLOCKS = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [2, 1], [4, 1], [1, 2], [3, 2]];

  function place(key) {
    const S = Vibe.state.get();
    if (key === "home") {
      const h = S.home;
      if (h && h.x != null) return { x: h.x, y: h.y, e: "🏠", label: "Дом", district: h.district }; // на карте дом всегда домик
      return Object.assign(door(1, 4, 1), { e: "🏠", label: "Дом" });
    }
    if (key === "work") {
      const j = S.job;
      if (j && j.x != null) return { x: j.x, y: j.y, e: "💼", label: "Работа" }; // а работа — всегда портфель
      return null;
    }
    if (FIXED[key]) return Object.assign({}, FIXED[key]);
    const m = /^restaurant:(\d+)$/.exec(key);
    if (m) {
      const r = RESTAURANTS[(+m[1] - 1) % RESTAURANTS.length];
      return Object.assign(door(r[0], r[1], r[2]), { e: "🍽️", label: "Ресторан" });
    }
    if (key.startsWith("office:")) {
      const h = hash(key);
      const b = OFFICE_BLOCKS[h % OFFICE_BLOCKS.length];
      return Object.assign(door(b[0], b[1], (h >> 4) % 6), { e: "💼", label: key.slice(7) });
    }
    if (key.startsWith("flat:")) {
      const h = hash(key);
      const b = HOME_BLOCKS[h % HOME_BLOCKS.length];
      // Родители живут в соседнем городе на другом берегу
      if (key === "flat:Мама") return Object.assign({ col: -1, row: 1, district: "Заречье" }, PARENTS);
      return Object.assign(door(b[0], b[1], (h >> 4) % 6), { e: "🏠", label: "Квартира" });
    }
    return null;
  }

  /* ---------- Маршрут по улицам ---------- */
  const nearest = (v) => ST.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), ST[0]);
  function path(a, b) {
    if (!a || !b) return [];
    const ya = nearest(a.y), yb = nearest(b.y);
    const pts = [{ x: a.x, y: a.y }, { x: a.x, y: ya }];
    if (ya !== yb) {
      // поворот на вертикальной улице между точками
      const mid = (a.x + b.x) / 2;
      const X = nearest(mid);
      pts.push({ x: X, y: ya }, { x: X, y: yb });
    }
    pts.push({ x: b.x, y: yb }, { x: b.x, y: b.y });
    // убрать дубли
    return pts.filter((p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y);
  }
  function len(points) { let s = 0; for (let i = 1; i < points.length; i++) s += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y); return s; }
  const km = (points) => +(len(points) * KM_PER_UNIT).toFixed(1);
  // Минуты в пути: такси ~30 км/ч в пробках, пешком 5, метро ~25 + 8 мин на вход/ожидание
  function minutes(points, mode = "taxi") {
    const d = km(points);
    // Через реку в Заречье: мост (пробка) или электричка — плюс ~22 мин в любом режиме
    const far = points.some((p) => p.x < FAR_X) ? BRIDGE_MIN : 0;
    if (mode === "walk") return Math.max(3, Math.round((d / 5) * 60)) + far;
    if (mode === "metro") return Math.max(8, Math.round((d / 25) * 60 + 10)) + far;
    if (mode === "courier") return Math.max(12, Math.round((d / 18) * 60 + 15)) + far;
    return Math.max(4, Math.round((d / 28) * 60 + 3)) + far;
  }
  function pointAt(points, k) {
    const total = len(points);
    let target = total * Math.max(0, Math.min(1, k));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (target <= seg || i === points.length - 1) {
        const t = seg ? Math.min(1, target / seg) : 1;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: b.x - a.x, dy: b.y - a.y };
      }
      target -= seg;
    }
    return points[points.length - 1];
  }

  /* ---------- Отрисовка города (один раз, строкой) ---------- */
  const INK = "#0e0e12", ROAD = "#f2eee6", AVE = "#ffe9a3", WALK = "#fffdf7", WATER = "#4fc3ff", GRASS = "#b8ef9f";
  const isAve = (i) => i === 2 || i === 3;
  const RW = (i) => (isAve(i) ? 38 : i === 0 || i === 5 ? 30 : 26); // видимая ширина улицы
  const r1 = (n) => Math.round(n * 10) / 10;
  // Видимый прямоугольник квартала (проспекты шире, переулки уже; логика маршрутов не меняется)
  function vblock(col, row) {
    const x1 = ST[col] + RW(col) / 2, x2 = ST[col + 1] - RW(col + 1) / 2, y1 = ST[row] + RW(row) / 2, y2 = ST[row + 1] - RW(row + 1) / 2;
    return { x1, x2, y1, y2, w: x2 - x1, h: y2 - y1, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Палитры зданий: [крыша, южный фасад, восточный фасад/тень]
  const PAL = {
    "Сити": [["#8fd8ff", "#5bb4ea", "#3a86bf"], ["#c9b8ff", "#9a83f0", "#6e55c8"], ["#94f2df", "#4fcbb0", "#2f9a83"], ["#eef2ff", "#b4bfdf", "#8792b6"]],
    "Центр": [["#ff8a8a", "#ffd6c4", "#e6ab92"], ["#ffb547", "#fff0c4", "#dcc08a"], ["#ff6bcb", "#ffdcee", "#e0a9c6"], ["#7ee0ff", "#fff3df", "#d6c39c"]],
    "Спальный": [["#ffe14d", "#f6f3ec", "#c8c1b2"], ["#8fd8ff", "#eef5fa", "#b3c3cf"], ["#ff9b9b", "#fbf0ea", "#d3bbb1"], ["#c6ff4d", "#f3f7ea", "#bcc6a8"]],
  };
  const GROUND = { "Сити": "#e2e7ff", "Центр": "#ffe8da", "Спальный": "#e4f6da" };
  const DIAG = 808; // декоративная «Аллея Позитива»: x + y = 808 (не маршрут)
  const RIVER_D = "M4 306L92 306C140 306 150 336 175 336C195 336 200 318 214 318L284 318";

  let cityCache = null;
  function cityMarkup() {
    if (cityCache) return cityCache;
    const R = rng(20240917);
    const pick = (a) => a[Math.floor(R() * a.length)];
    const A = ST[0], Z = ST[5];
    let sea = "", base = "", grounds = "", water = "", feat = "", top = "";
    let T1 = "", T2 = "", LIT = "", LAMP = "", BIG = "", NEON = "";
    const B = [];
    const tree = (x, y, big) => { const p = `M${r1(x)} ${r1(y)}h0`; if (big) T2 += p; else T1 += p; };
    const add = (x, y, w, d, h, p, o = {}) => B.push({ x, y, w, d, h, p, o });
    const boxOf = (x, y, w, d, h) => ({ x1: x - Math.round(h * 0.28), y1: y - h, x2: x + w, y2: y + d });
    const hit = (ex, b) => ex.some((f) => f(b));
    const exDiag = (b) => b.x1 + b.y1 < DIAG + 30 && b.x2 + b.y2 > DIAG - 30;
    const chip = (x, y, e) => { top += `<g transform="translate(${r1(x)} ${r1(y)})"><rect x="-10" y="-10" width="24" height="24" rx="8" fill="${INK}"/><rect x="-12" y="-12" width="24" height="24" rx="8" fill="#fff" stroke="${INK}" stroke-width="2"/><text y="5" font-size="14" text-anchor="middle">${e}</text></g>`; };

    /* --- Море, остров, дамбы --- */
    sea += `<rect x="-520" y="-200" width="${SIZE + 720}" height="${SIZE + 400}" fill="${WATER}"/>`;
    let waves = "";
    for (let i = 0; i < 90 && waves.length < 4000; i++) {
      const x = Math.round(-190 + R() * (SIZE + 380)), y = Math.round(-190 + R() * (SIZE + 380));
      if (x > -14 && x < SIZE + 4 && y > -10 && y < SIZE + 4) continue;
      waves += `M${x} ${y}q6-5 12 0t12 0`;
    }
    sea += `<path d="${waves}" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".65"/>`;
    sea += `<text x="-40" y="620" font-size="22">⛵</text><text x="935" y="300" font-size="20">🛥️</text><text x="700" y="-22" font-size="18">⛵</text>`;
    // Пляж-коса на юге (под островом, чтобы берег лёг поверх)
    sea += `<ellipse cx="744" cy="${SIZE + 6}" rx="128" ry="44" fill="${INK}" transform="translate(0 4)"/><ellipse cx="744" cy="${SIZE + 6}" rx="128" ry="44" fill="#ffe7a6" stroke="${INK}" stroke-width="3"/>`;
    sea += `<ellipse cx="744" cy="${SIZE + 6}" rx="140" ry="54" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="14 10" opacity=".75"/>`;
    // Песчаный берег и зелёный пояс
    sea += `<rect x="6" y="6" width="${SIZE - 12}" height="${SIZE - 12}" rx="56" fill="#ffe7a6" stroke="${INK}" stroke-width="3"/>`;
    sea += `<rect x="16" y="16" width="${SIZE - 32}" height="${SIZE - 32}" rx="46" fill="${GRASS}" stroke="#d8c98f" stroke-width="2"/>`;
    // Дамбы на материк (по проспектам)
    [[ST[2], -200, 222], [ST[3], SIZE - 22, 222]].forEach(([x, y, h]) => {
      sea += `<rect x="${x - 19 + 5}" y="${y}" width="38" height="${h}" fill="${INK}" opacity=".25" transform="translate(0 5)"/>`;
      sea += `<rect x="${x - 19}" y="${y}" width="38" height="${h}" fill="${AVE}" stroke="${INK}" stroke-width="3"/>`;
      sea += `<path d="M${x - 1.8} ${y}v${h}M${x + 1.8} ${y}v${h}" stroke="#ff9f1c" stroke-width="1.6"/>`;
    });

    /* --- Дороги --- */
    base += `<rect x="${A - 15}" y="${A - 15}" width="${Z - A + 30}" height="${Z - A + 30}" rx="20" fill="${ROAD}" stroke="${INK}" stroke-width="3"/>`;
    [2, 3].forEach((i) => {
      base += `<rect x="${A - 15}" y="${ST[i] - 19}" width="${Z - A + 30}" height="38" fill="${AVE}"/><rect x="${ST[i] - 19}" y="${A - 15}" width="38" height="${Z - A + 30}" fill="${AVE}"/>`;
    });
    let mC = "", mL = "", mS = "";
    ST.forEach((v, i) => {
      if (isAve(i)) {
        mC += `M${A} ${v - 1.8}H${Z}M${A} ${v + 1.8}H${Z}M${v - 1.8} ${A}V${Z}M${v + 1.8} ${A}V${Z}`;
        mL += `M${A} ${v - 9.5}H${Z}M${A} ${v + 9.5}H${Z}M${v - 9.5} ${A}V${Z}M${v + 9.5} ${A}V${Z}`;
      } else mS += `M${A} ${v}H${Z}M${v} ${A}V${Z}`;
    });
    base += `<path d="${mS}" stroke="#d6cdb8" stroke-width="2" stroke-dasharray="10 9"/>`;
    base += `<path d="${mL}" stroke="#fff" stroke-width="1.8" stroke-dasharray="9 8"/>`;
    base += `<path d="${mC}" stroke="#ff9f1c" stroke-width="1.6"/>`;
    // Перекрёстки (чистим разметку) и зебры
    let bxA = "", bxR = "", zeb = "";
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const x = ST[i], y = ST[j], wi = RW(i), hj = RW(j);
      if ((i === 0 || i === 5) && (j === 0 || j === 5)) continue;
      const box = `M${x - wi / 2} ${y - hj / 2}h${wi}v${hj}h${-wi}Z`;
      if (isAve(i) || isAve(j)) bxA += box; else bxR += box;
      // Зебра через горизонтальную улицу (слева/справа от перекрёстка) и через вертикальную (сверху/снизу)
      const zH = (zx) => { for (let k = y - hj / 2 + 3; k <= y + hj / 2 - 3; k += 4.5) zeb += `M${r1(zx - 3.5)} ${r1(k)}h7`; };
      const zV = (zy) => { for (let k = x - wi / 2 + 3; k <= x + wi / 2 - 3; k += 4.5) zeb += `M${r1(k)} ${r1(zy - 3.5)}v7`; };
      if (i < 5) zH(x + wi / 2 + 5);
      if (i > 0) zH(x - wi / 2 - 5);
      if (j < 5) zV(y + hj / 2 + 5);
      if (j > 0) zV(y - hj / 2 - 5);
    }
    base += `<path d="${bxR}" fill="${ROAD}"/><path d="${bxA}" fill="${AVE}"/>`;
    base += `<path d="${zeb}" stroke="#fff" stroke-width="2.4"/>`;

    /* --- Фонари вдоль улиц (ночной слой) --- */
    const nearX = (p) => ST.some((s, k) => Math.abs(s - p) < RW(k) / 2 + 8);
    ST.forEach((v, i) => {
      const off = RW(i) / 2 + 3;
      for (let p = A + 24; p < Z - 10; p += 46) {
        if (nearX(p)) continue;
        LAMP += `M${p} ${v - off}h0M${p} ${v + off}h0M${v - off} ${p}h0M${v + off} ${p}h0`;
      }
    });

    /* --- Генераторы застройки --- */
    function towers(I, ex) {
      const nx = I.w > 100 ? 2 : 1, ny = I.h > 100 ? 2 : 1, cw = I.w / nx, ch = I.h / ny;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const cx0 = I.x + i * cw, cy0 = I.y + j * ch;
        if (nx * ny > 1 && R() < 0.18) { tree(cx0 + cw * 0.35, cy0 + ch * 0.55, 1); tree(cx0 + cw * 0.7, cy0 + ch * 0.4); feat += `<circle cx="${r1(cx0 + cw * 0.6)}" cy="${r1(cy0 + ch * 0.7)}" r="7" fill="${WATER}" stroke="${INK}" stroke-width="2"/>`; continue; }
        const h = 15 + Math.floor(R() * 14), ox = Math.round(h * 0.28), m = 5;
        const x = cx0 + m + ox, w = cw - 2 * m - ox - Math.floor(R() * 8);
        const y = cy0 + m + h, d = cy0 + ch - m - y - Math.floor(R() * 5);
        if (d < 12 || hit(ex, boxOf(x, y, w, d, h))) continue;
        add(x, y, w, d, h, pick(PAL["Сити"]), { win: "glass", detail: R() < 0.14 ? "heli" : "ac" });
      }
    }
    function houses(I, district, hmin, hmax, ex, cell = 44) {
      const nx = Math.max(1, Math.round(I.w / cell)), ny = Math.max(1, Math.round(I.h / cell)), cw = I.w / nx, ch = I.h / ny;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const cx0 = I.x + i * cw, cy0 = I.y + j * ch, tx = cx0 + cw / 2, ty = cy0 + ch / 2;
        const treeHere = () => { if (!hit(ex, { x1: tx - 6, y1: ty - 6, x2: tx + 6, y2: ty + 6 })) tree(tx, ty, R() < 0.5); };
        if (R() < 0.1) { treeHere(); continue; }
        const h = Math.round(hmin + R() * (hmax - hmin)), ox = Math.round(h * 0.28), m = 4;
        const x = cx0 + m + ox, w = cw - 2 * m - ox - Math.floor(R() * 6);
        const y = cy0 + m + h, d = cy0 + ch - m - y - Math.floor(R() * 4);
        if (d < 8 || w < 10 || hit(ex, boxOf(x, y, w, d, h))) { treeHere(); continue; }
        add(x, y, w, d, h, pick(PAL[district]), { win: "rows", detail: R() < 0.25 ? "ac" : null });
      }
    }
    function court(r, kind) {
      if (r.w < 20 || r.h < 18) return;
      if (kind === "parking") {
        feat += `<rect x="${r1(r.x)}" y="${r1(r.y)}" width="${r1(r.w)}" height="${r1(r.h)}" rx="4" fill="#dcd8cf" stroke="${INK}" stroke-width="1.5"/>`;
        let st = "", c1 = "", c2 = "";
        for (let x = r.x + 5; x <= r.x + r.w - 5; x += 10) {
          st += `M${r1(x)} ${r1(r.y)}v10M${r1(x)} ${r1(r.y + r.h)}v-10`;
          if (x + 10 <= r.x + r.w - 2) {
            const cx = r1(x + 5);
            if (R() < 0.6) (R() < 0.5 ? (c1 += `M${cx} ${r1(r.y + 3)}v4`) : (c2 += `M${cx} ${r1(r.y + 3)}v4`));
            if (r.h > 24 && R() < 0.5) (R() < 0.5 ? (c1 += `M${cx} ${r1(r.y + r.h - 7)}v4`) : (c2 += `M${cx} ${r1(r.y + r.h - 7)}v4`));
          }
        }
        feat += `<path d="${st}" stroke="#fff" stroke-width="1.5"/>`;
        if (c1) feat += `<path d="${c1}" stroke="${INK}" stroke-width="8.5" stroke-linecap="round"/><path d="${c1}" stroke="#ff6bcb" stroke-width="5.5" stroke-linecap="round"/>`;
        if (c2) feat += `<path d="${c2}" stroke="${INK}" stroke-width="8.5" stroke-linecap="round"/><path d="${c2}" stroke="#8fd8ff" stroke-width="5.5" stroke-linecap="round"/>`;
        if (r.h > 40) tree(r.x + r.w / 2, r.y + r.h / 2, 1);
      } else {
        const pw = Math.min(r.w - 4, 56), ph = Math.min(r.h - 4, 34), px = r.x + 2, py = r.y + 2;
        feat += `<rect x="${r1(px)}" y="${r1(py)}" width="${r1(pw)}" height="${r1(ph)}" rx="7" fill="#fff1b8" stroke="${INK}" stroke-width="1.5"/>`;
        feat += `<circle cx="${r1(px + pw * 0.3)}" cy="${r1(py + ph / 2)}" r="5.5" fill="#ff6bcb" stroke="${INK}" stroke-width="1.5"/>`;
        feat += `<rect x="${r1(px + pw * 0.62)}" y="${r1(py + 4)}" width="7" height="${r1(Math.max(8, ph - 8))}" rx="2" fill="#8fd8ff" stroke="${INK}" stroke-width="1.5"/>`;
        if (r.w - pw > 20) tree(px + pw + (r.w - pw) / 2, r.y + r.h * 0.35, 1);
        if (r.h - ph > 16) tree(r.x + r.w * 0.3, py + ph + (r.h - ph) / 2);
        if (r.h - ph > 16 && r.w > 50) tree(r.x + r.w * 0.7, py + ph + (r.h - ph) / 2, 1);
      }
    }
    function slabs(I, kindIdx) {
      const h = 12 + Math.floor(R() * 3), ox = Math.round(h * 0.28), p = pick(PAL["Спальный"]);
      const ax = I.x + 5 + ox, ay = I.y + 4 + h, aw = I.w - 10 - ox;
      const kind = kindIdx % 2 ? "parking" : "play";
      if (I.h > 100) {
        add(ax, ay, aw, 17, h, p, { win: "rows", detail: "stripe" });
        const by = ay + 17 + h + 10, bd = I.y + I.h - 5 - by;
        add(ax, by, 18, bd, h, pick(PAL["Спальный"]), { win: "rows", detail: "stripe" });
        court({ x: ax + 28, y: ay + 27, w: I.x + I.w - 5 - (ax + 28), h: I.y + I.h - 5 - (ay + 27) }, kind);
      } else {
        add(ax, ay, aw, 15, h, p, { win: "rows", detail: "stripe" });
        court({ x: I.x + 5, y: ay + 22, w: I.w - 10, h: I.y + I.h - 4 - (ay + 22) }, kind);
      }
    }

    /* --- Кварталы --- */
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const b = vblock(col, row), dist = DISTRICT(row), sp = SPECIAL[col + "," + row], key = col + "," + row;
        const I = { x: b.x1 + 7, y: b.y1 + 7, w: b.w - 14, h: b.h - 14 };
        const green = sp === "lake" || sp === "park" || sp === "park2";
        const gfill = green ? "#a8ec8c" : sp === "hq" ? "#efe4ff" : key === "3,2" ? "#ffe9b8" : GROUND[dist];
        grounds += `<rect x="${b.x1}" y="${b.y1}" width="${b.w}" height="${b.h}" rx="12" fill="${WALK}" stroke="${INK}" stroke-width="2.5"/>`;
        grounds += `<rect x="${I.x}" y="${I.y}" width="${I.w}" height="${I.h}" rx="7" fill="${gfill}"/>`;

        if (sp === "lake") {
          feat += `<ellipse cx="${b.cx}" cy="${b.cy + 3}" rx="${I.w / 2 - 6}" ry="${I.h / 2 - 12}" fill="${WATER}" stroke="${INK}" stroke-width="3"/>`;
          feat += `<ellipse cx="${b.cx}" cy="${b.cy + 3}" rx="${I.w / 2 - 16}" ry="${I.h / 2 - 22}" fill="none" stroke="#bfeaff" stroke-width="2" stroke-dasharray="10 12"/>`;
          feat += `<path d="M${b.cx + 14} ${b.y2 - 6}v-26" stroke="${INK}" stroke-width="9"/><path d="M${b.cx + 14} ${b.y2 - 6}v-26" stroke="#e8c690" stroke-width="5"/>`;
          top += `<text x="${b.cx - 34}" y="${b.cy + 12}" font-size="20">🦆</text><text x="${b.cx + 8}" y="${b.cy - 8}" font-size="18">🛶</text>`;
          [[I.x + 8, I.y + 8], [I.x + I.w - 8, I.y + 8], [I.x + 8, I.y + I.h - 8], [I.x + I.w - 8, I.y + I.h - 8]].forEach(([x, y]) => tree(x, y, 1));
          continue;
        }
        if (sp === "park") {
          const pd = `M${I.x} ${r1(I.y + I.h * 0.72)}Q${b.cx} ${b.cy - 34} ${I.x + I.w} ${r1(I.y + I.h * 0.32)}M${b.cx} ${I.y + I.h}Q${b.cx + 18} ${b.cy} ${b.cx - 12} ${I.y}`;
          feat += `<path d="${pd}" stroke="${INK}" stroke-width="11" fill="none"/><path d="${pd}" stroke="#f7e7b4" stroke-width="7" fill="none"/>`;
          feat += `<circle cx="${b.cx + 2}" cy="${b.cy - 2}" r="13" fill="${WATER}" stroke="${INK}" stroke-width="2.5"/><circle cx="${b.cx + 2}" cy="${b.cy - 2}" r="4" fill="#fff"/>`;
          [[0.15, 0.15], [0.42, 0.12], [0.85, 0.12], [0.12, 0.45], [0.72, 0.55], [0.9, 0.82], [0.62, 0.86], [0.25, 0.9], [0.32, 0.35], [0.88, 0.45]].forEach(([fx, fy], k) => tree(I.x + I.w * fx, I.y + I.h * fy, k % 3 !== 2));
          BIG += `M${b.cx + 2} ${b.cy - 2}h0`;
          continue;
        }
        if (sp === "park2") {
          // Колесо обозрения
          const wx = b.cx, wy = b.cy - 4, wr = Math.min(I.w / 2 - 6, 28);
          let sp8 = "", cab = "";
          for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI) / 4, ex = r1(wx + Math.cos(a) * wr), ey = r1(wy + Math.sin(a) * wr);
            sp8 += `M${wx} ${wy}L${ex} ${ey}`; cab += `M${ex} ${ey}h0`;
            LIT += `M${ex} ${ey}h0`;
          }
          feat += `<path d="M${wx} ${wy}L${wx - 15} ${wy + wr + 10}M${wx} ${wy}L${wx + 15} ${wy + wr + 10}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
          feat += `<circle cx="${wx}" cy="${wy}" r="${wr}" fill="none" stroke="${INK}" stroke-width="3"/><path d="${sp8}" stroke="${INK}" stroke-width="1.5"/>`;
          feat += `<path d="${cab}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="${cab}" stroke="#ffe14d" stroke-width="7" stroke-linecap="round"/>`;
          feat += `<circle cx="${wx}" cy="${wy}" r="5" fill="#ff6bcb" stroke="${INK}" stroke-width="2"/>`;
          BIG += `M${wx} ${wy}h0`;
          [[I.x + 10, I.y + 10], [I.x + I.w - 10, I.y + 12], [I.x + 12, I.y + I.h - 12], [I.x + I.w - 10, I.y + I.h - 10], [b.cx, I.y + I.h - 8]].forEach(([x, y], k) => tree(x, y, k % 2 === 0));
          continue;
        }
        if (sp === "hq") {
          const h = 54, w = 70, d = 40, x = b.cx - 27, y = I.y + I.h - 12 - d;
          add(x, y, w, d, h, ["url(#vibe-grad)", "#7a5af0", "#4b2fb8"], { win: "glass", detail: "logo" });
          [[I.x + 9, I.y + I.h - 10], [I.x + I.w - 9, I.y + I.h - 10], [I.x + 9, I.y + 40], [I.x + I.w - 9, I.y + 40]].forEach(([x, y]) => tree(x, y, 1));
          continue;
        }
        if (key === "1,3") {
          // Vibe Supermarket + парковка
          const h = 9, x = I.x + 8, y = I.y + 14, w = I.w - 13, d = 50;
          add(x, y, w, d, h, ["#c6ff4d", "#f7f7f0", "#cfcfc4"], { win: "none", detail: "sign", text: "VIBE MARKET" });
          court({ x: I.x + 3, y: I.y + 76, w: I.w - 6, h: I.h - 79 }, "parking");
          chip(I.x + I.w - 18, I.y + 30, "🛒");
          continue;
        }
        if (key === "3,4") {
          // Стадион
          const cx = b.cx, cy = b.cy, rx = Math.min(I.w / 2 - 2, 60), ry = I.h / 2 - 2;
          feat += `<ellipse cx="${cx}" cy="${cy + 4}" rx="${rx}" ry="${ry}" fill="${INK}"/>`;
          feat += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ff6bcb" stroke="${INK}" stroke-width="3"/>`;
          feat += `<ellipse cx="${cx}" cy="${cy}" rx="${rx - 9}" ry="${ry - 7}" fill="#ffd0ec" stroke="${INK}" stroke-width="1.5"/>`;
          feat += `<rect x="${cx - 38}" y="${cy - 15}" width="76" height="30" rx="9" fill="#5fd35f" stroke="${INK}" stroke-width="2"/>`;
          feat += `<path d="M${cx} ${cy - 15}v30M${cx - 38} ${cy - 7}h9v14h-9M${cx + 38} ${cy - 7}h-9v14h9M${cx + 6} ${cy}a6 6 0 1 1 -12 0a6 6 0 1 1 12 0" stroke="#fff" stroke-width="1.4" fill="none"/>`;
          BIG += `M${cx - rx + 8} ${cy - ry + 6}h0M${cx + rx - 8} ${cy - ry + 6}h0M${cx - rx + 8} ${cy + ry - 6}h0M${cx + rx - 8} ${cy + ry - 6}h0`;
          chip(cx + rx - 6, cy - ry + 4, "🏟️");
          continue;
        }
        if (key === "3,2") {
          // Рыночная площадь + клуб
          const cols = ["#ff6bcb", "#ffe14d", "#8fd8ff", "#c6ff4d", "#ff8a8a", "#b9a3ff"];
          let aw = "";
          for (let k = 0; k < 8; k++) {
            const sx = I.x + 14 + (k % 4) * 26, sy = I.y + 16 + Math.floor(k / 4) * 28;
            feat += `<rect x="${sx}" y="${sy}" width="20" height="14" rx="3" fill="${cols[k % cols.length]}" stroke="${INK}" stroke-width="1.5"/>`;
            aw += `M${sx + 2} ${sy + 5}h16`;
          }
          feat += `<path d="${aw}" stroke="#fff" stroke-width="4" stroke-dasharray="3 3"/>`;
          tree(I.x + I.w - 14, I.y + I.h - 20, 1); tree(I.x + I.w - 36, I.y + I.h - 12);
          add(I.x + 10, I.y + I.h - 6 - 28, 56, 28, 12, ["#2b1c4a", "#8b5cff", "#5a2fd0"], { win: "none", detail: "neon" });
          chip(I.x + 90, I.y + I.h - 30, "🎤"); chip(I.x + I.w - 14, I.y + 10, "🛍️");
          continue;
        }
        if (key === "0,2") {
          // Vibe Health + жилые дома
          const cw = 56, cd = 34, cx = I.x + I.w - cw - 2, cy = I.y + I.h - 4 - cd;
          add(cx, cy, cw, cd, 14, ["#ffffff", "#e9f6ff", "#b9cfe0"], { win: "rows", detail: "cross" });
          houses(I, "Центр", 9, 13, [(bx) => bx.x2 > cx - 10 && bx.y2 > cy - 20]);
          continue;
        }
        if (key === "0,1") {
          // Набережная: низкие дома над рекой, променад снизу
          for (let k = 0; k < 3; k++) { const cw = I.w / 3; add(I.x + k * cw + 6, I.y + 12, cw - 10, 14, 8, pick(PAL["Центр"]), { win: "rows" }); }
          for (let x = I.x + 8; x < I.x + I.w; x += 20) tree(x, I.y + I.h - 7);
          chip(I.x + I.w - 22, I.y + 8, "☕");
          continue;
        }
        if (key === "0,3" || key === "1,2") {
          houses(I, key === "0,3" ? "Спальный" : "Центр", key === "0,3" ? 11 : 9, key === "0,3" ? 14 : 13, [exDiag]);
          if (key === "1,2") chip(I.x + 22, I.y + 18, "☕");
          continue;
        }
        if (dist === "Сити") { towers(I, []); continue; }
        if (dist === "Центр") { houses(I, "Центр", 9, 13, []); continue; }
        slabs(I, hash(key));
      }
    }
    chip(vblock(1, 0).x1 + 20, vblock(1, 0).y2 - 22, "🏦");
    chip(vblock(4, 1).cx, vblock(4, 1).y2 - 20, "🏦");
    chip(vblock(2, 3).x2 - 22, vblock(2, 3).y2 - 22, "💊");
    chip(vblock(4, 2).cx, vblock(4, 2).y2 - 22, "☕");
    chip(vblock(0, 2).x2 - 20, vblock(0, 2).y1 + 20, "💊");

    /* --- Река с набережными и два моста --- */
    water += `<path d="${RIVER_D}" stroke="${INK}" stroke-width="52" fill="none"/>`;
    water += `<path d="${RIVER_D}" stroke="#d9cfb6" stroke-width="47" fill="none"/>`;
    water += `<path d="${RIVER_D}" stroke="${WATER}" stroke-width="33" fill="none"/>`;
    water += `<path d="${RIVER_D}" stroke="#bfeaff" stroke-width="2" fill="none" stroke-dasharray="10 14"/>`;
    // Озеро поверх устья
    const lk = vblock(1, 1);
    water += `<ellipse cx="${lk.cx}" cy="${lk.cy + 3}" rx="${lk.w / 2 - 13}" ry="${lk.h / 2 - 19}" fill="${WATER}"/>`;
    [[ST[0], 306, RW(0)], [ST[1], 318, RW(1)]].forEach(([x, y, w]) => {
      water += `<rect x="${x - w / 2 + 4}" y="${y - 29 + 4}" width="${w}" height="58" fill="${INK}" opacity=".3"/>`;
      water += `<rect x="${x - w / 2}" y="${y - 29}" width="${w}" height="58" fill="${ROAD}"/>`;
      water += `<path d="M${x} ${y - 29}v58" stroke="#d6cdb8" stroke-width="2" stroke-dasharray="10 9"/>`;
      water += `<path d="M${x - w / 2} ${y - 29}v58M${x + w / 2} ${y - 29}v58" stroke="${INK}" stroke-width="3.5"/>`;
      water += `<path d="M${x - w / 2 + 3} ${y - 29}v58M${x + w / 2 - 3} ${y - 29}v58" stroke="#ff6bcb" stroke-width="1.5" stroke-dasharray="2 4"/>`;
    });

    /* --- Аллея Позитива (диагональ, только декор) --- */
    let alley = "";
    [[83, 205], [259, 377]].forEach(([xa, xb]) => {
      alley += `M${xa} ${DIAG - xa}L${xb} ${DIAG - xb}`;
      for (let x = xa + 8; x < xb - 4; x += 13) { tree(x - 9, DIAG - x - 9); tree(x + 9, DIAG - x + 9); }
    });
    water += `<path d="${alley}" stroke="${INK}" stroke-width="25" fill="none"/><path d="${alley}" stroke="#9be58a" stroke-width="21" fill="none"/><path d="${alley}" stroke="#f7e7b4" stroke-width="5" fill="none" stroke-linecap="round"/>`;

    /* --- Заречье: соседний город на другом берегу реки Вайбы --- */
    const R2 = rng(4242);
    const coastX = (y) => -150 + Math.sin(y / 70) * 7 + Math.sin(y / 23) * 3;
    let cpS = "", cpG = "";
    for (let y = -480; y <= 1400; y += 20) { cpS += `L${r1(coastX(y))} ${y}`; cpG += `L${r1(coastX(y) - 11)} ${y}`; }
    sea += `<path d="M-540 -480${cpS}L-540 1400Z" fill="#ffe7a6" stroke="${INK}" stroke-width="3"/>`;
    sea += `<path d="M-540 -480${cpG}L-540 1400Z" fill="${GRASS}" stroke="#d8c98f" stroke-width="2"/>`;
    // Волны в реке
    let rw = "";
    for (let i = 0; i < 40; i++) {
      const x = Math.round(-128 + R2() * 110), y = Math.round(-180 + R2() * 1280);
      if (Math.abs(y - ST[1]) < 34 || Math.abs(y - 800) < 30) continue;
      rw += `M${x} ${y}q5-4 10 0t10 0`;
    }
    sea += `<path d="${rw}" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/>`;
    // Дороги Заречья: ул. Заречная (продолжение моста), ул. Садовая, пер. Дачный
    const ZR = [[-540, ST[1], -150, ST[1]], [-300, -480, -300, 1400], [-300, 600, -158, 600]];
    const zrect = ([x1, y1, x2, y2], w) => (y1 === y2 ? `x="${x1}" y="${y1 - w / 2}" width="${x2 - x1}" height="${w}"` : `x="${x1 - w / 2}" y="${y1}" width="${w}" height="${y2 - y1}"`);
    ZR.forEach((r) => (sea += `<rect ${zrect(r, 26)} fill="${ROAD}" stroke="${INK}" stroke-width="2.5"/>`));
    ZR.forEach((r) => (sea += `<rect ${zrect(r, 21)} fill="${ROAD}"/>`));
    sea += `<path d="M-540 ${ST[1]}H-150M-300 -480V1400M-300 600H-158" stroke="#d6cdb8" stroke-width="2" stroke-dasharray="10 9"/>`;
    // Кварталы Заречья
    const ZB = { nw: [-470, -60, -317, 214], n: [-283, -60, -170, 214], w: [-470, 250, -317, 582], par: [-283, 250, -170, 582], sw: [-470, 618, -317, 782], dacha: [-283, 618, -170, 782] };
    const zI = {};
    Object.entries(ZB).forEach(([k, [x1, y1, x2, y2]]) => {
      sea += `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="12" fill="${WALK}" stroke="${INK}" stroke-width="2.5"/>`;
      sea += `<rect x="${x1 + 7}" y="${y1 + 7}" width="${x2 - x1 - 14}" height="${y2 - y1 - 14}" rx="7" fill="${k === "dacha" ? "#d9f2b8" : GROUND["Спальный"]}"/>`;
      zI[k] = { x: x1 + 7, y: y1 + 7, w: x2 - x1 - 14, h: y2 - y1 - 14 };
    });
    houses(zI.nw, "Спальный", 7, 11, []);
    houses(zI.w, "Спальный", 7, 11, []);
    houses(zI.sw, "Спальный", 7, 10, []);
    // ДК «Ностальгия» + домики
    add(zI.n.x + 16, zI.n.y + zI.n.h - 40, 72, 30, 13, ["#ffb547", "#fff0c4", "#dcc08a"], { win: "none", detail: "sign", text: "ДК" });
    houses({ x: zI.n.x, y: zI.n.y, w: zI.n.w, h: zI.n.h - 64 }, "Спальный", 7, 10, []);
    // Дом родителей: домик с крышей, забор, грядки, яблоня
    {
      const hx = PARENTS.x, hy = PARENTS.y + 8;
      feat += `<rect x="${hx - 46}" y="${hy}" width="92" height="74" rx="8" fill="#e6f8cf" stroke="#7a4a2b" stroke-width="2.2" stroke-dasharray="4 2.5"/>`;
      feat += `<rect x="${hx - 34}" y="${hy + 30}" width="40" height="28" rx="2" fill="${INK}" transform="translate(3 3)"/>`;
      feat += `<rect x="${hx - 34}" y="${hy + 30}" width="40" height="28" rx="2" fill="#fff1a8" stroke="${INK}" stroke-width="2.2"/>`;
      feat += `<path d="M${hx - 39} ${hy + 32}L${hx - 14} ${hy + 12}L${hx + 11} ${hy + 32}Z" fill="#ff6b5b" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
      feat += `<rect x="${hx - 2}" y="${hy + 12}" width="6" height="10" fill="#c9b8ff" stroke="${INK}" stroke-width="1.6"/>`;
      feat += `<rect x="${hx - 29}" y="${hy + 37}" width="10" height="9" fill="#8fd8ff" stroke="${INK}" stroke-width="1.5"/><rect x="${hx - 13}" y="${hy + 42}" width="9" height="16" fill="#ff6bcb" stroke="${INK}" stroke-width="1.5"/>`;
      feat += `<path d="M${hx + 14} ${hy + 40}h22M${hx + 14} ${hy + 50}h22M${hx + 14} ${hy + 60}h22" stroke="#7a4a2b" stroke-width="6" stroke-linecap="round"/><path d="M${hx + 15} ${hy + 40}h20M${hx + 15} ${hy + 50}h20M${hx + 15} ${hy + 60}h20" stroke="#5fd35f" stroke-width="2.5" stroke-dasharray="3 3" stroke-linecap="round"/>`;
      tree(hx + 28, hy + 16, 1); tree(hx - 38, hy + 66);
      LIT += `M${hx - 24} ${hy + 41}h0`;
      houses({ x: zI.par.x, y: zI.par.y + 98, w: zI.par.w, h: zI.par.h - 98 }, "Спальный", 7, 10, []);
      top += `<text x="${hx}" y="${hy + 88}" font-size="9" font-weight="900" fill="#7a2e1d" text-anchor="middle" font-family="Manrope, sans-serif" paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round">Родители 💛</text>`;
    }
    // Дачи и огороды
    {
      const I = zI.dacha, cw = I.w / 3, ch = I.h / 3, soil = ["#c9a26b", "#b98d57", "#d6b27c"];
      let rows = "";
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        const x = I.x + i * cw + 3, y = I.y + j * ch + 3, w = cw - 6, h = ch - 6;
        feat += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="4" fill="${soil[(i + j) % 3]}" stroke="${INK}" stroke-width="1.5"/>`;
        for (let k = y + 7; k < y + h - 4; k += 7) rows += `M${r1(x + 5)} ${r1(k)}h${r1(w * 0.55)}`;
        if ((i + j) % 2 === 0) add(x + w * 0.62 + 3, y + h - 12, w * 0.3, 8, 5, ["#ff8a8a", "#fbf0ea", "#d3bbb1"], { win: "none" });
        else tree(x + w * 0.8, y + h * 0.5);
      }
      feat += `<path d="${rows}" stroke="#36b856" stroke-width="2.5" stroke-dasharray="3 2.5" stroke-linecap="round"/>`;
      chip(I.x + I.w - 12, I.y + 8, "🥒");
    }
    // Лес за станцией
    for (let i = 0; i < 70; i++) {
      const x = -470 + R2() * 300, y = 840 + R2() * 520;
      if (Math.abs(x + 300) < 20 || (y < 880 && x > -330 && x < -180)) continue;
      tree(x, y, R2() < 0.5);
    }
    for (let i = 0; i < 26; i++) { const y = -470 + R2() * 400; tree(-470 + R2() * 150, y, R2() < 0.5); tree(-283 + R2() * 110, y, R2() < 0.5); }
    // Станция Заречье
    add(-292, 860, 64, 18, 10, ["#8fd8ff", "#eef5fa", "#b3c3cf"], { win: "rows" });
    feat += `<rect x="-330" y="809" width="150" height="12" rx="3" fill="#dcd8cf" stroke="${INK}" stroke-width="1.8"/>`;
    chip(-196, 846, "🚉");

    /* --- Электричка в Заречье: рельсы по мосту --- */
    const RY = 800;
    water += `<rect x="-160" y="${RY - 9}" width="176" height="18" fill="${INK}" opacity=".28" transform="translate(4 5)"/>`;
    for (let x = -130; x < 10; x += 38) water += `<rect x="${x}" y="${RY - 4}" width="8" height="18" fill="${INK}" opacity=".35"/>`;
    water += `<path d="M-540 ${RY}H45" stroke="${INK}" stroke-width="15"/><path d="M-540 ${RY}H45" stroke="#cdbb98" stroke-width="11"/>`;
    water += `<path d="M-540 ${RY}H45" stroke="#7a4a2b" stroke-width="9" stroke-dasharray="2 4.5"/>`;
    water += `<path d="M-540 ${RY - 3}H45M-540 ${RY + 3}H45" stroke="#5b5566" stroke-width="1.6"/>`;
    water += `<rect x="17" y="${RY + 9}" width="27" height="12" rx="3" fill="#dcd8cf" stroke="${INK}" stroke-width="1.8"/>`;
    // Поезд ездит туда-обратно (SMIL — работает и в innerHTML)
    const car = (x, c) => `<rect x="${x}" y="-6" width="22" height="12" rx="4" fill="${c}" stroke="${INK}" stroke-width="2"/><path d="M${x + 4} -2h14" stroke="#fff" stroke-width="2.5" stroke-dasharray="3 2"/>`;
    water += `<g transform="translate(-400 ${RY})"><animateTransform attributeName="transform" type="translate" values="-420 ${RY};-84 ${RY};-84 ${RY};-420 ${RY};-420 ${RY}" keyTimes="0;.42;.55;.93;1" dur="26s" repeatCount="indefinite"/>${car(0, "#c6ff4d")}${car(24, "#c6ff4d")}${car(48, "#ff6bcb")}</g>`;

    /* --- Мост Рассрочки: ул. Подписочная → Заречье --- */
    {
      const y = ST[1], w = RW(1), xa = -158, xb = 47, py = [-112, -36];
      water += `<rect x="${xa}" y="${y - w / 2}" width="${xb - xa}" height="${w}" fill="${INK}" opacity=".3" transform="translate(4 6)"/>`;
      py.forEach((x) => (water += `<rect x="${x - 9}" y="${y - w / 2 - 12}" width="18" height="${w + 24}" rx="4" fill="${INK}" opacity=".3" transform="translate(4 6)"/>`));
      water += `<rect x="${xa}" y="${y - w / 2}" width="${xb - xa}" height="${w}" fill="${ROAD}"/>`;
      water += `<path d="M${xa} ${y}H${xb}" stroke="#d6cdb8" stroke-width="2" stroke-dasharray="10 9"/>`;
      water += `<path d="M${xa} ${y - w / 2}H${xb}M${xa} ${y + w / 2}H${xb}" stroke="${INK}" stroke-width="3.5"/>`;
      water += `<path d="M${xa} ${y - w / 2 + 3}H${xb}M${xa} ${y + w / 2 - 3}H${xb}" stroke="#ff6bcb" stroke-width="1.5" stroke-dasharray="2 4"/>`;
      // Пилоны и ванты
      const cab = (yy) => `M${xa + 6} ${yy}Q${(xa + py[0]) / 2} ${yy + (yy < y ? 6 : -6)} ${py[0]} ${yy}Q${(py[0] + py[1]) / 2} ${yy + (yy < y ? 9 : -9)} ${py[1]} ${yy}Q${(py[1] + 8) / 2} ${yy + (yy < y ? 6 : -6)} 8 ${yy}`;
      water += `<path d="${cab(y - w / 2 - 6)}${cab(y + w / 2 + 6)}" stroke="#8b5cff" stroke-width="2.2" fill="none"/>`;
      py.forEach((x) => {
        water += `<rect x="${x - 9}" y="${y - w / 2 - 12}" width="18" height="${w + 24}" rx="4" fill="#ffe14d" stroke="${INK}" stroke-width="2.5"/>`;
        water += `<rect x="${x - 4}" y="${y - w / 2 - 7}" width="8" height="8" rx="2" fill="#ff6bcb" stroke="${INK}" stroke-width="1.5"/><rect x="${x - 4}" y="${y + w / 2 - 1}" width="8" height="8" rx="2" fill="#ff6bcb" stroke="${INK}" stroke-width="1.5"/>`;
        BIG += `M${x} ${y - w / 2 - 8}h0`;
      });
    }

    /* --- Метро: пунктир линий под землёй --- */
    {
      const mp = (m) => [m.x + 24, m.y + 28];
      const [a, b, c, d] = [mp(FIXED.metro1), mp(FIXED.metro3), mp(FIXED.metro2), mp(FIXED.metro4)];
      const md = `M${a[0]} ${a[1]}H${b[0]}V${b[1]}H${c[0]}M${b[0]} ${a[1]}H${d[0]}V${d[1]}`;
      water += `<path d="${md}" stroke="#ff3b5c" stroke-width="6" stroke-dasharray="1 10" stroke-linecap="round" fill="none" opacity=".7"/>`;
    }

    /* --- Побережье: причал, пляж, маяк --- */
    {
      const y = ST[3];
      water += `<rect x="878" y="${y - 7}" width="${FIXED.pier.x + 30 - 878}" height="14" fill="${INK}" opacity=".3" transform="translate(3 5)"/>`;
      water += `<rect x="878" y="${y - 7}" width="${FIXED.pier.x + 30 - 878}" height="14" fill="#e8c690" stroke="${INK}" stroke-width="2.5"/>`;
      let pl = ""; for (let x = 884; x < FIXED.pier.x + 28; x += 6) pl += `M${x} ${y - 6}v12`;
      water += `<path d="${pl}" stroke="#b98d57" stroke-width="1.4"/>`;
      top += `<text x="${FIXED.pier.x + 6}" y="${y + 34}" font-size="24" text-anchor="middle">⛴️</text>`;
      // Пляж: зонтики и шезлонги
      [[668, 934, "#ff6bcb"], [712, 950, "#ffe14d"], [760, 936, "#8fd8ff"], [806, 950, "#c6ff4d"], [842, 928, "#ff8a8a"]].forEach(([x, yy, c]) => {
        feat += `<rect x="${x + 6}" y="${yy + 2}" width="12" height="6" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.3"/>`;
        feat += `<circle cx="${x}" cy="${yy}" r="8" fill="${c}" stroke="${INK}" stroke-width="2"/><path d="M${x - 8} ${yy}h16M${x} ${yy - 8}v16" stroke="#fff" stroke-width="1.5"/>`;
      });
      chip(744, 966, "🏖️");
      // Маяк на камне (северо-восток)
      const lx = 958, ly = -26;
      feat += `<ellipse cx="${lx}" cy="${ly + 8}" rx="24" ry="13" fill="#b9b2a6" stroke="${INK}" stroke-width="2.5"/>`;
      feat += `<rect x="${lx - 6}" y="${ly - 22}" width="12" height="30" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M${lx - 6} ${ly - 12}h12M${lx - 6} ${ly - 2}h12" stroke="#ff3b5c" stroke-width="5"/>`;
      feat += `<circle cx="${lx}" cy="${ly - 25}" r="5" fill="#ffe14d" stroke="${INK}" stroke-width="2"/>`;
      BIG += `M${lx} ${ly - 25}h0`;
    }

    /* --- Новые точки города: значки --- */
    ["gym", "pvz", "cafe", "school", "cinema", "police", "post", "gas", "bcenter"].forEach((k) => chip(FIXED[k].x, FIXED[k].y - 4, FIXED[k].e));
    chip(30, RY + 30, "🚉");

    /* --- Подписи ориентиров --- */
    const tag = (t, x, y, o = {}) => {
      const tr = o.rot ? ` transform="rotate(${o.rot} ${r1(x)} ${r1(y)})"` : "";
      top += `<text x="${r1(x)}" y="${r1(y)}"${tr} font-size="${o.size || 8.5}" font-weight="900" fill="${o.fill || "#3b3550"}" text-anchor="middle" font-family="Manrope, sans-serif" letter-spacing=".2" paint-order="stroke" stroke="${o.stroke || "#fff"}" stroke-width="3.5" stroke-linejoin="round"${o.italic ? ` font-style="italic"` : ""}>${t}</text>`;
    };
    const vb_ = (c, r) => vblock(c, r);
    tag("Озеро Лайков", vb_(1, 1).cx, vb_(1, 1).y1 + 16);
    tag("Парк «Без вайфая»", vb_(3, 1).cx, vb_(3, 1).y1 + 14);
    tag("Vibe HQ", vb_(2, 2).cx + 8, vb_(2, 2).y2 - 6, { fill: "#4b2fb8" });
    tag("Рынок", vb_(3, 2).x1 + 66, vb_(3, 2).y1 + 14);
    tag("Кэшбек-Арена", vb_(3, 4).cx, vb_(3, 4).y2 - 4);
    tag("Колесо вайба", vb_(4, 3).cx, vb_(4, 3).y2 - 4);
    tag("Vibe Health", vb_(0, 2).x2 - 36, vb_(0, 2).y2 - 2, { fill: "#c8102e" });
    tag("Набережная", vb_(0, 1).cx, vb_(0, 1).y2 - 2);
    tag("Аллея Позитива", 168, DIAG - 168 + 2, { rot: -45 });
    tag("Мост Рассрочки", -74, ST[1] - 30, { size: 10 });
    tag("платный 💳", -74, ST[1] + 36, { size: 8 });
    tag("р. Вайба", -78, 560, { size: 12, fill: "#fff", stroke: "#2a8fd0", rot: -90, italic: true });
    tag("р. Вайба", -78, 80, { size: 12, fill: "#fff", stroke: "#2a8fd0", rot: -90, italic: true });
    tag("протока", 20, 290, { size: 7.5, fill: "#fff", stroke: "#2a8fd0", italic: true });
    tag("Вокзал", 30, RY + 50);
    tag("ст. Заречье · 40 мин до центра", -250, 900);
    tag("ДК «Ностальгия»", zI.n.x + 52, zI.n.y + zI.n.h - 2);
    tag("Дачи", zI.dacha.x + 20, zI.dacha.y - 1);
    tag("Причал", FIXED.pier.x - 20, ST[3] - 14);
    tag("Пляж «Шезлонг 990 ₫»", 744, 990);
    top += `<text x="-226" y="470" font-size="15" letter-spacing="4" font-family="Dela Gothic One, sans-serif" fill="${INK}" opacity=".6" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round">ЗАРЕЧЬЕ</text>`;
    tag("соседний город", -226, 486, { size: 8.5, fill: "#5b5566" });

    /* --- Деревья: Бульвар Вайба и зелёный пояс --- */
    [ST[4] - RW(4) / 2 - 5, ST[4] + RW(4) / 2 + 5].forEach((y) => {
      for (let x = A + 22; x < Z - 10; x += 21) if (!nearX(x)) tree(x, y);
    });
    for (let p = 70; p < SIZE - 60; p += 27) {
      if (Math.abs(p - ST[2]) > 34) tree(p, 31);
      if (Math.abs(p - ST[3]) > 34) tree(p, SIZE - 31);
      if ((p < 270 || p > 372) && Math.abs(p - ST[1]) > 24 && Math.abs(p - 800) > 22) tree(31, p); // не на мосту и не на рельсах
      if (Math.abs(p - ST[3]) > 16) tree(SIZE - 31, p); // не на причале
    }
    const trees = (d, r) => d ? `<path d="${d}" stroke="${INK}" stroke-width="${r * 2 + 3}" stroke-linecap="round"/><path d="${d}" stroke="#36b856" stroke-width="${r * 2}" stroke-linecap="round"/><path d="${d}" stroke="#86e86e" stroke-width="${r}" stroke-linecap="round" transform="translate(-1.5 -1.5)"/>` : "";

    /* --- Здания: псевдо-3D (крыша смещена вверх-влево, видны южный и восточный фасады) --- */
    B.sort((a, b) => a.y + a.d - (b.y + b.d) || a.x - b.x);
    let bs = "";
    B.forEach(({ x, y, w, d, h, p, o }) => {
      x = r1(x); y = r1(y); w = r1(w); d = r1(d);
      const ox = Math.round(h * 0.28), rx = r1(x - ox), ry = y - h;
      bs += `<path d="M${rx} ${ry}h${w}L${r1(x + w)} ${y}v${d}h${-w}L${rx} ${r1(ry + d)}Z" fill="${p[2]}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
      bs += `<path d="M${rx} ${r1(ry + d)}h${w}L${r1(x + w)} ${r1(y + d)}h${-w}Z" fill="${p[1]}"/>`;
      if (o.win === "rows") {
        const nf = Math.max(1, Math.floor(h / 5));
        let wp = "";
        for (let f = 0; f < nf; f++) {
          const t = (f + 0.5) / nf, yy = r1(ry + d + t * h), xs = rx + t * ox;
          wp += `M${r1(xs + 3)} ${yy}h${r1(w - 6)}`;
          for (let k = xs + 4.5; k < xs + w - 4; k += 6) if (R() < 0.33) LIT += `M${r1(k)} ${yy}h0`;
        }
        bs += `<path d="${wp}" stroke="${p[2]}" stroke-width="2" stroke-dasharray="3 3"/>`;
      } else if (o.win === "glass") {
        let wp = "";
        for (let k = 5; k < w - 2; k += 6) wp += `M${r1(rx + k)} ${r1(ry + d)}L${r1(x + k)} ${r1(y + d)}`;
        bs += `<path d="${wp}" stroke="#fff" stroke-width="1.2" opacity=".5"/>`;
        const nf = Math.floor(h / 6);
        for (let f = 0; f < nf; f++) {
          const t = (f + 0.5) / nf, yy = r1(ry + d + t * h);
          for (let k = 8; k < w - 2; k += 6) if (R() < 0.28) LIT += `M${r1(rx + t * ox + k)} ${yy}h0`;
        }
      }
      bs += `<rect x="${rx}" y="${ry}" width="${w}" height="${d}" fill="${p[0]}" stroke="${INK}" stroke-width="2"/>`;
      const cx = r1(rx + w / 2), cy = r1(ry + d / 2);
      if (o.win === "glass") bs += `<path d="M${r1(rx + 3)} ${r1(ry + 3)}h${r1(w * 0.4)}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
      if (o.detail === "heli" && Math.min(w, d) > 18) bs += `<circle cx="${cx}" cy="${cy}" r="${r1(Math.min(w, d) / 2 - 4)}" fill="none" stroke="#fff" stroke-width="1.6"/><text x="${cx}" y="${r1(cy + 3)}" font-size="8" font-weight="900" fill="#fff" text-anchor="middle" font-family="Manrope, sans-serif">H</text>`;
      else if (o.detail === "ac" && w > 20 && d > 12) bs += `<rect x="${r1(rx + w - 11)}" y="${r1(ry + 3)}" width="7" height="5" rx="1" fill="${p[1]}" stroke="${INK}" stroke-width="1"/>`;
      else if (o.detail === "stripe") bs += `<path d="M${r1(rx + 4)} ${cy}h${r1(w - 8)}" stroke="${INK}" stroke-width="1" opacity=".25" stroke-dasharray="6 4"/>`;
      else if (o.detail === "logo") bs += `<text x="${cx}" y="${r1(cy + 2)}" font-size="16" text-anchor="middle">💜</text><text x="${cx}" y="${r1(cy + 14)}" font-size="8" font-weight="900" fill="#fff" text-anchor="middle" font-family="Manrope, sans-serif" letter-spacing="1.5">VIBE</text>`;
      else if (o.detail === "cross") bs += `<path d="M${cx - 6} ${cy}h12M${cx} ${cy - 6}v12" stroke="#ff3b5c" stroke-width="4"/>`;
      else if (o.detail === "sign") bs += `<text x="${cx}" y="${r1(cy + 3)}" font-size="9" font-weight="900" fill="${INK}" text-anchor="middle" font-family="Manrope, sans-serif" letter-spacing="1">${o.text}</text>`;
      else if (o.detail === "neon") {
        const nd = `M${r1(rx + 3)} ${r1(ry + 3)}h${r1(w - 6)}v${r1(d - 6)}h${r1(6 - w)}Z`;
        bs += `<path d="${nd}" stroke="#ff6bcb" stroke-width="2" fill="none"/>`; NEON += nd;
      }
    });

    /* --- Подписи улиц, метро, районы --- */
    const lab = (txt, x, y, rot, ave) => {
      const tr = rot ? ` transform="rotate(-90 ${x} ${y})"` : "";
      return `<text x="${x}" y="${y}"${tr} dy="3.6" font-size="${ave ? 10.5 : 9.5}" font-weight="800" letter-spacing=".3" fill="${ave ? "#7a4b00" : "#5b5566"}" text-anchor="middle" font-family="Manrope, sans-serif" paint-order="stroke" stroke="${ave ? AVE : ROAD}" stroke-width="4" stroke-linejoin="round">${txt}</text>`;
    };
    const HS = [1, 0, 0, 1, 2, 1], VS = [2, 0, 3, 2, 1, 3];
    ST.forEach((v, i) => {
      top += lab(H_NAMES[i], (ST[HS[i]] + ST[HS[i] + 1]) / 2, v, false, isAve(i));
      top += lab(V_NAMES[i], v, (ST[VS[i]] + ST[VS[i] + 1]) / 2, true, isAve(i));
      if (isAve(i)) { top += lab(H_NAMES[i], (ST[3] + ST[4]) / 2, v, false, true); top += lab(V_NAMES[i], v, (ST[0] + ST[1]) / 2, true, true); }
    });
    [[FIXED.metro1], [FIXED.metro2], [FIXED.metro3], [FIXED.metro4]].forEach(([m]) => {
      const x = m.x + 24, y = m.y + 28;
      top += `<circle cx="${x}" cy="${y}" r="9" fill="#ff3b5c" stroke="${INK}" stroke-width="2"/><text x="${x}" y="${y + 4}" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="Manrope, sans-serif">M</text>`;
    });
    [["СИТИ", vblock(3, 0).cx, vblock(3, 0).cy], ["ЦЕНТР", vblock(1, 2).cx - 30, vblock(1, 2).y1 + 30], ["СПАЛЬНЫЙ", vblock(1, 4).cx + 30, vblock(1, 4).cy + 8]].forEach(([t, x, y]) => {
      top += `<text x="${r1(x)}" y="${r1(y)}" font-size="15" letter-spacing="4" font-family="Dela Gothic One, sans-serif" fill="${INK}" opacity=".55" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round">${t}</text>`;
    });

    const city = sea + base + grounds + water + feat + trees(T1, 5.5) + trees(T2, 8) + bs + top;
    const lights =
      `<path d="${LAMP}" stroke="#ffcf5a" stroke-width="14" stroke-linecap="round" opacity=".16"/>` +
      `<path d="${LAMP}" stroke="#fff3b0" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="${BIG}" stroke="#fff3b0" stroke-width="46" stroke-linecap="round" opacity=".22"/>` +
      `<path d="${LIT}" stroke="#ffe27a" stroke-width="2.6" stroke-linecap="round"/>` +
      (NEON ? `<path d="${NEON}" stroke="#ff6bcb" stroke-width="9" fill="none" opacity=".35"/><path d="${NEON}" stroke="#ffc2ec" stroke-width="2" fill="none"/>` : "");
    cityCache = { city, lights };
    return cityCache;
  }

  /* ---------- Время суток и погода ---------- */
  function autoTheme() {
    let h = 12;
    try { h = Vibe.game && Vibe.game.info ? Vibe.game.info().hour : new Date().getHours(); } catch (e) { /* по умолчанию день */ }
    if (h >= 7 && h < 18) return "day";
    if ((h >= 18 && h < 21) || (h >= 5 && h < 7)) return "evening";
    return "night";
  }
  function autoWeather() {
    try {
      const w = Vibe.weather && Vibe.weather.now();
      if (!w) return null;
      if (w.kind === "snow" || (w.kind === "storm" && w.t <= 0)) return "snow";
      if (w.kind === "rain" || w.kind === "storm") return "rain";
    } catch (e) { /* без погоды */ }
    return null;
  }

  /* ---------- Компонент ---------- */
  function create(el, opts = {}) {
    const interactive = opts.interactive !== false;
    el.classList.add("vmap");
    el.style.touchAction = interactive ? "none" : "pan-y";
    el.innerHTML = "";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "vmap-svg");
    const cm = cityMarkup();
    svg.innerHTML = `
      <defs><linearGradient id="vibe-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cff"/><stop offset=".6" stop-color="#ff6bcb"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs>
      <g class="vm-city">${cm.city}</g>
      <rect class="vm-shade" x="-560" y="-200" width="${SIZE + 760}" height="${SIZE + 400}"/>
      <g class="vm-lights">${cm.lights}</g>
      <g class="vm-traffic"></g>
      <g class="vm-route"></g>
      <g class="vm-pins"></g>
      <g class="vm-veh"></g>`;
    el.appendChild(svg);
    const wx = document.createElement("div");
    wx.className = "vmap-wx";
    el.appendChild(wx);
    let scaleBar = null;
    if (interactive || opts.hud) {
      const hud = document.createElement("div");
      hud.className = "vmap-hud";
      hud.innerHTML = `<div class="vm-compass" aria-label="Север сверху"><svg viewBox="-12 -12 24 24" width="24" height="24"><path d="M0 -10L4.5 0H-4.5Z" fill="#ff3b5c" stroke="#0e0e12" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 10L4.5 0H-4.5Z" fill="#fff" stroke="#0e0e12" stroke-width="1.6" stroke-linejoin="round"/></svg><b>С</b></div><div class="vm-scale"><i></i><span>500 м</span></div>`;
      el.appendChild(hud);
      scaleBar = hud.querySelector(".vm-scale i");
    }
    if (interactive) {
      const ui = document.createElement("div");
      ui.className = "vmap-ui";
      ui.innerHTML = `<button data-vm="in" aria-label="Приблизить">+</button><button data-vm="out" aria-label="Отдалить">−</button><button data-vm="me" aria-label="Мой дом">🏠</button>`;
      el.appendChild(ui);
    }

    const gTraffic = svg.querySelector(".vm-traffic");
    const gRoute = svg.querySelector(".vm-route");
    const gPins = svg.querySelector(".vm-pins");
    const gVeh = svg.querySelector(".vm-veh");

    /* --- Тема и погода --- */
    let theme = null, weather = null, themeManual = !!opts.theme, weatherManual = opts.weather !== undefined;
    function setTheme(t, auto) {
      if (!auto) themeManual = true;
      theme = t === "evening" || t === "night" ? t : "day";
      el.classList.remove("vm-day", "vm-evening", "vm-night");
      el.classList.add("vm-" + theme);
    }
    function setWeather(w, auto) {
      if (!auto) weatherManual = true;
      weather = w === "rain" || w === "snow" ? w : null;
      wx.className = "vmap-wx" + (weather ? " vm-" + weather : "");
      el.classList.toggle("vm-wx-snow", weather === "snow");
    }
    setTheme(opts.theme || autoTheme(), true);
    setWeather(weatherManual ? opts.weather : autoWeather(), true);
    const envTimer = setInterval(() => {
      if (!themeManual) { const t = autoTheme(); if (t !== theme) setTheme(t, true); }
      if (!weatherManual) { const w = autoWeather(); if (w !== weather) setWeather(w, true); }
    }, 20000);

    let vb = { x: 0, y: 0, w: SIZE, h: SIZE };
    const SCALE_UNITS = 0.5 / KM_PER_UNIT; // 500 м в единицах карты
    const apply = () => {
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      if (scaleBar && el.clientWidth) scaleBar.style.width = Math.round((SCALE_UNITS * el.clientWidth) / vb.w) + "px";
    };
    const aspect = () => (el.clientHeight || 300) / (el.clientWidth || 360);
    function clamp() {
      vb.w = Math.max(220, Math.min(SIZE + 200, vb.w));
      vb.h = vb.w * aspect();
      vb.x = Math.max(MIN_X, Math.min(SIZE + 60 - vb.w, vb.x)); // западнее — Заречье
      vb.y = Math.max(-60, Math.min(SIZE + 60 - vb.h, vb.y));
    }
    let anim = null;
    function animateTo(target, dur = 700) {
      cancelAnimationFrame(anim);
      const from = Object.assign({}, vb), t0 = performance.now();
      (function step(t) {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        vb = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e };
        apply();
        if (k < 1) anim = requestAnimationFrame(step);
      })(t0);
    }
    function fit(points, pad = 70, instant = false) {
      const pts = points.filter(Boolean);
      if (!pts.length) return;
      let x1 = Math.min(...pts.map((p) => p.x)) - pad, x2 = Math.max(...pts.map((p) => p.x)) + pad;
      let y1 = Math.min(...pts.map((p) => p.y)) - pad, y2 = Math.max(...pts.map((p) => p.y)) + pad;
      let w = Math.max(260, x2 - x1), h = Math.max(260 * aspect(), y2 - y1);
      if (h / w > aspect()) w = h / aspect(); else h = w * aspect();
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      const target = { x: cx - w / 2, y: cy - h / 2, w, h };
      const save = vb; vb = target; clamp(); const t = Object.assign({}, vb); vb = save;
      if (instant) { vb = t; apply(); } else animateTo(t);
    }
    const center = (p, w = 360) => p && fit([{ x: p.x - w / 2, y: p.y - w / 2 }, { x: p.x + w / 2, y: p.y + w / 2 }], 0);

    // Начальный вид
    const initRaf = requestAnimationFrame(() => { if (opts.fit) fit(opts.fit, 70, true); else { vb.h = vb.w * aspect(); apply(); } });
    vb.h = vb.w * ((opts.height || 300) / 360); apply();

    /* --- Пины --- */
    function setPins(list) {
      gPins.innerHTML = list.filter(Boolean).map((p) => {
        const big = p.big || p.pulse;
        const r = big ? 24 : 18;
        return `<g class="vm-pin ${p.pulse ? "vm-pulse" : ""}" transform="translate(${p.x} ${p.y})" data-pin="${p.id || ""}">
          ${p.pulse ? `<circle r="${r}" class="vm-ring" fill="none" stroke="${p.color || "#ff6bcb"}" stroke-width="5"/>` : ""}
          <path d="M0 6 L-9 -${r - 2} L9 -${r - 2} Z" fill="#0e0e12" transform="translate(0 ${r - 2})"/>
          <circle cy="-${r}" r="${r}" fill="${p.color || "#fff"}" stroke="#0e0e12" stroke-width="3.5"/>
          <text y="-${r - (big ? 8 : 6)}" font-size="${big ? 24 : 18}" text-anchor="middle">${p.e || "📍"}</text>
          ${p.label ? `<g transform="translate(0 ${-r * 2 - 14})"><rect x="${-(p.label.length * 3.6 + 10)}" y="-13" width="${p.label.length * 7.2 + 20}" height="22" rx="11" fill="#0e0e12"/><text y="3" font-size="12" font-weight="800" fill="#fff" text-anchor="middle" font-family="Manrope, sans-serif">${Vibe.esc(p.label)}</text></g>` : ""}
        </g>`;
      }).join("");
    }
    if (opts.pins) setPins(opts.pins);

    /* --- Маршрут --- */
    function route(points, { color = "#8b5cff" } = {}) {
      const d = points.map((p, i) => (i ? "L" : "M") + p.x + " " + p.y).join(" ");
      const L = len(points);
      gRoute.innerHTML = `
        <path d="${d}" stroke="#0e0e12" stroke-width="15" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="${d}" stroke="${color}" stroke-width="9" fill="none" stroke-linejoin="round" stroke-linecap="round" class="vm-line" style="stroke-dasharray:${L};stroke-dashoffset:${L}"/>
        <path d="${d}" stroke="#fff" stroke-width="2.5" fill="none" stroke-dasharray="2 14" stroke-linecap="round" class="vm-flow"/>`;
      requestAnimationFrame(() => { const ln = gRoute.querySelector(".vm-line"); if (ln) { ln.style.transition = "stroke-dashoffset 1s cubic-bezier(.2,.9,.3,1)"; ln.style.strokeDashoffset = 0; } });
      return points;
    }
    const clearRoute = () => (gRoute.innerHTML = "");

    /* --- Машинка по маршруту --- */
    const drives = new Set();
    function drive(points, { emoji = "🚕", duration = 6000, follow = false, onProgress, onDone, color = "#ffe14d", start = 0 } = {}) {
      const g = document.createElementNS(NS, "g");
      g.innerHTML = `<circle r="17" fill="${color}" stroke="#0e0e12" stroke-width="3"/><text class="vm-emo" y="7" font-size="20" text-anchor="middle">${emoji}</text>`;
      gVeh.appendChild(g);
      const t0 = performance.now() - Math.max(0, Math.min(1, start)) * duration; // start — доля уже пройденного пути
      let raf, paused = 0, pausedAt = 0, stopped = false;
      const ctl = {
        stop() { stopped = true; cancelAnimationFrame(raf); g.remove(); drives.delete(ctl); },
        pause() { if (!pausedAt) pausedAt = performance.now(); },
        resume() { if (pausedAt) { paused += performance.now() - pausedAt; pausedAt = 0; } },
      };
      drives.add(ctl);
      (function step(t) {
        if (stopped) return;
        const k = pausedAt ? (pausedAt - t0 - paused) / duration : Math.min(1, (t - t0 - paused) / duration);
        const p = pointAt(points, k);
        const flip = p.dx < 0 ? -1 : 1;
        g.setAttribute("transform", `translate(${p.x} ${p.y})`);
        g.querySelector(".vm-emo").setAttribute("transform", `scale(${flip} 1) translate(0 ${Math.sin(t / 90) * 1.2})`);
        if (follow && !pausedAt) { vb.x = p.x - vb.w / 2; vb.y = p.y - vb.h / 2; clamp(); apply(); }
        onProgress && onProgress(k, p);
        if (k >= 1) { onDone && onDone(); drives.delete(ctl); return; }
        raf = requestAnimationFrame(step);
      })(t0);
      return ctl;
    }

    /* --- Фоновый трафик: правостороннее движение, повороты на перекрёстках --- */
    let trafficRaf = null;
    if (opts.ambient !== false) {
      const HL = (x, w) => `<path class="vm-hl" d="M${x} -4L${x + 26} -11V11L${x} 4Z" fill="#fff3a0" fill-opacity=".5"/>`;
      const KINDS = [
        ...Array(11).fill("car"), "bus", "bus", "scooter", "scooter", "scooter",
      ];
      const CAR_COL = ["#ff6bcb", "#ffe14d", "#8fd8ff", "#c6ff4d", "#ff8a8a", "#ffffff", "#b9a3ff"];
      const laneOf = (v) => {
        const ave = isAve(v.li), per = v.li === 0 || v.li === 5;
        if (v.kind === "scooter") return ave ? 16.5 : per ? 12 : 10.5;
        if (v.kind === "bus") return ave ? 13.5 : per ? 8 : 6.5;
        return ave ? v.fast ? 5.5 : 13.5 : per ? 7.5 : 6.5;
      };
      const nextIdx = (pos, dir) => { if (dir > 0) { for (let k = 0; k < 6; k++) if (ST[k] > pos) return k; return 5; } for (let k = 5; k >= 0; k--) if (ST[k] < pos) return k; return 0; };
      const vehs = KINDS.map((kind, i) => {
        const g = document.createElementNS(NS, "g");
        if (kind === "bus") {
          g.innerHTML = `${HL(19)}<rect x="-19" y="-7" width="38" height="14" rx="4" fill="${i % 2 ? "#ff5a5a" : "#8b5cff"}" stroke="${INK}" stroke-width="2"/><path d="M-14 -4.2h26M-14 4.2h26" stroke="#fff" stroke-width="2.2" stroke-dasharray="4 2"/><rect x="13" y="-5" width="4" height="10" rx="1" fill="${INK}" opacity=".5"/>`;
        } else if (kind === "scooter") {
          g.setAttribute("class", "vm-scoot");
          g.innerHTML = `${HL(5)}<path d="M-6 0h11" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle r="4" fill="${CAR_COL[(i + 3) % 4]}" stroke="${INK}" stroke-width="1.6"/>`;
        } else {
          g.innerHTML = `${HL(10)}<rect x="-10" y="-6" width="20" height="12" rx="4" fill="${CAR_COL[i % CAR_COL.length]}" stroke="${INK}" stroke-width="2"/><rect x="1" y="-4.5" width="5" height="9" rx="1.5" fill="${INK}" opacity=".45"/><rect x="-8" y="-4" width="3" height="8" rx="1" fill="${INK}" opacity=".25"/>`;
        }
        gTraffic.appendChild(g);
        const li = kind === "bus" ? 2 + (i % 2) : Math.floor(Math.random() * 6);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const pos = ST[0] + 10 + Math.random() * (ST[5] - ST[0] - 20);
        const v = {
          g, kind, li, dir, pos, axis: i % 2 ? "v" : "h", fast: Math.random() < 0.5,
          speed: kind === "bus" ? 24 : kind === "scooter" ? 17 + Math.random() * 6 : 32 + Math.random() * 22,
          cont: kind === "bus" ? 0.8 : kind === "scooter" ? 0.55 : 0.65,
          next: nextIdx(pos, dir), rx: null, ry: null,
        };
        v.lane = laneOf(v);
        return v;
      });
      let last = performance.now();
      (function loop(t) {
        const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
        const f = Math.min(1, dt * 12);
        vehs.forEach((v) => {
          v.pos += v.dir * v.speed * dt;
          const K = v.next;
          if ((v.dir > 0 && v.pos >= ST[K]) || (v.dir < 0 && v.pos <= ST[K])) {
            const can = v.dir > 0 ? K < 5 : K > 0;
            if (!can || Math.random() > v.cont) {
              const dirs = []; if (v.li < 5) dirs.push(1); if (v.li > 0) dirs.push(-1);
              const nd = dirs[Math.floor(Math.random() * dirs.length)], old = v.li;
              v.axis = v.axis === "h" ? "v" : "h"; v.li = K; v.pos = ST[old]; v.dir = nd; v.next = old + nd;
              v.lane = laneOf(v);
            } else v.next = K + v.dir;
          }
          const L = ST[v.li];
          const tx = v.axis === "h" ? v.pos : L - v.dir * v.lane;
          const ty = v.axis === "h" ? L + v.dir * v.lane : v.pos;
          if (v.rx == null) { v.rx = tx; v.ry = ty; } else { v.rx += (tx - v.rx) * f; v.ry += (ty - v.ry) * f; }
          const rot = v.axis === "h" ? (v.dir > 0 ? 0 : 180) : v.dir > 0 ? 90 : -90;
          v.g.setAttribute("transform", `translate(${v.rx.toFixed(1)} ${v.ry.toFixed(1)}) rotate(${rot})`);
        });
        trafficRaf = requestAnimationFrame(loop);
      })(last);
    }

    /* --- Жесты: перетаскивание, щипок, колесо --- */
    const ptrs = new Map();
    let lastDist = 0, moved = false;
    function onDown(e) { if (!interactive) return; svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; cancelAnimationFrame(anim); }
    function onMove(e) {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId);
      const scale = vb.w / el.clientWidth;
      if (ptrs.size === 1) {
        vb.x -= (e.clientX - prev.x) * scale; vb.y -= (e.clientY - prev.y) * scale;
        if (Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y) > 2) moved = true;
      }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastDist) zoom(lastDist / d, (a.x + b.x) / 2, (a.y + b.y) / 2);
        lastDist = d;
      }
      clamp(); apply();
    }
    function onUp(e) { ptrs.delete(e.pointerId); if (ptrs.size < 2) lastDist = 0; }
    function zoom(f, cx, cy) {
      const r = el.getBoundingClientRect();
      const px = cx != null ? (cx - r.left) / r.width : 0.5, py = cy != null ? (cy - r.top) / r.height : 0.5;
      const nw = Math.max(220, Math.min(SIZE + 200, vb.w * f));
      vb.x += (vb.w - nw) * px; vb.y += (vb.h - nw * aspect()) * py;
      vb.w = nw; clamp(); apply();
    }
    function onWheel(e) { if (!interactive) return; e.preventDefault(); zoom(e.deltaY > 0 ? 1.12 : 0.89, e.clientX, e.clientY); }
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("click", (e) => {
      if (moved) return;
      const pin = e.target.closest(".vm-pin");
      if (pin) { FX.burst(e, { emojis: ["📍", "✨"], count: 6 }); FX.sound.pop(); opts.onPin && opts.onPin(pin.dataset.pin); }
    });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-vm]");
      if (!b) return;
      e.stopPropagation();
      const k = b.dataset.vm;
      if (k === "in") { const c = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }; const t = { w: vb.w * 0.7 }; t.h = t.w * aspect(); animateTo({ x: c.x - t.w / 2, y: c.y - t.h / 2, w: t.w, h: t.h }, 300); }
      if (k === "out") { const c = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }; const w = Math.min(SIZE + 200, vb.w * 1.4); const h = w * aspect(); animateTo({ x: c.x - w / 2, y: c.y - h / 2, w, h }, 300); }
      if (k === "me") center(place("home"), 320);
    });

    return {
      el, svg, setPins, route, clearRoute, drive, fit, center,
      setTheme: (t) => setTheme(t),
      setWeather: (w) => setWeather(w),
      get theme() { return theme; },
      get weather() { return weather; },
      destroy() { clearInterval(envTimer); cancelAnimationFrame(initRaf); cancelAnimationFrame(trafficRaf); cancelAnimationFrame(anim); drives.forEach((d) => d.stop()); el.innerHTML = ""; el.classList.remove("vm-day", "vm-evening", "vm-night", "vm-wx-snow"); },
    };
  }

  // Стандартный набор пинов: дом, работа + дополнительные
  function basePins(extra = []) {
    const home = place("home"), work = place("work");
    return [
      home && Object.assign({ id: "home", color: "#ffe14d", pulse: true }, home),
      work && Object.assign({ id: "work", color: "#8fd8ff", pulse: true }, work),
      Object.assign({ id: "hq", color: "#e6dcff" }, FIXED.hq),
      ...extra,
    ];
  }

  Vibe.map = { create, place, path, km, minutes, len, pointAt, basePins, door, SIZE, OFFICE_BLOCKS, HOME_BLOCKS };

  const RAIN1 = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='80'%3E%3Cpath d='M10 2l-3 12M32 30l-3 12M21 56l-3 12' stroke='rgba(235,245,255,.8)' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E")`;
  const RAIN2 = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='120'%3E%3Cpath d='M14 6l-4.5 18M44 64l-4.5 18' stroke='rgba(220,235,255,.55)' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
  const SNOW1 = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cg fill='%23fff'%3E%3Ccircle cx='8' cy='12' r='1.8'/%3E%3Ccircle cx='38' cy='6' r='1.4'/%3E%3Ccircle cx='26' cy='34' r='2'/%3E%3Ccircle cx='52' cy='44' r='1.5'/%3E%3Ccircle cx='12' cy='52' r='1.3'/%3E%3C/g%3E%3C/svg%3E")`;
  const SNOW2 = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cg fill='%23fff' stroke='rgba(14,14,18,.25)' stroke-width='.8'%3E%3Ccircle cx='20' cy='24' r='3.4'/%3E%3Ccircle cx='66' cy='60' r='3'/%3E%3C/g%3E%3C/svg%3E")`;

  const css = `
  .vmap { position: relative; border: var(--line); border-radius: 28px; overflow: hidden; background: #4fc3ff; box-shadow: var(--shadow); touch-action: none; }
  .vmap-svg { display: block; width: 100%; height: 100%; cursor: grab; }
  .vmap-svg:active { cursor: grabbing; }
  .vmap-ui { position: absolute; right: 10px; top: 10px; display: grid; gap: 8px; z-index: 2; }
  .vmap-ui button { width: 40px; height: 40px; border-radius: 14px; border: 2.5px solid var(--ink); background: #fff; font-weight: 900; font-size: 20px; box-shadow: 0 3px 0 var(--ink); }
  .vmap-ui button:active { transform: translateY(3px); box-shadow: none; }
  .vm-pin { cursor: pointer; }
  .vm-pin.vm-pulse .vm-ring { transform-origin: 0 -24px; animation: vm-pulse 1.8s ease-out infinite; transform-box: fill-box; }
  @keyframes vm-pulse { 0% { opacity: .9; transform: translateY(-24px) scale(1); } 100% { opacity: 0; transform: translateY(-24px) scale(2.6); } }
  .vm-flow { animation: vm-flow 1s linear infinite; }
  @keyframes vm-flow { to { stroke-dashoffset: -32; } }

  /* Время суток */
  .vm-shade { fill: #26306e; opacity: 0; mix-blend-mode: multiply; pointer-events: none; transition: opacity .9s, fill .9s; }
  .vmap.vm-evening .vm-shade { fill: #ff8f6b; opacity: .42; }
  .vmap.vm-night .vm-shade { fill: #2f3b80; opacity: .72; }
  .vm-lights { opacity: 0; pointer-events: none; transition: opacity .9s; }
  .vmap.vm-evening .vm-lights { opacity: .75; }
  .vmap.vm-night .vm-lights { opacity: 1; }
  .vm-traffic { pointer-events: none; }
  .vm-hl { opacity: 0; transition: opacity .9s; }
  .vmap.vm-evening .vm-hl, .vmap.vm-night .vm-hl { opacity: 1; }
  .vmap.vm-wx-snow .vm-scoot { display: none; }

  /* Погода */
  .vmap-wx { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; opacity: 0; transition: opacity .8s, background-color .8s; }
  .vmap-wx.vm-rain, .vmap-wx.vm-snow { opacity: 1; }
  .vmap-wx::before, .vmap-wx::after { content: ""; position: absolute; top: -400px; left: -100px; right: -100px; bottom: 0; will-change: transform; }
  .vmap-wx.vm-rain { background-color: rgba(50, 70, 110, .16); }
  .vmap-wx.vm-rain::before { background-image: ${RAIN1}; animation: vm-rain1 .5s linear infinite; }
  .vmap-wx.vm-rain::after { background-image: ${RAIN2}; animation: vm-rain2 .8s linear infinite; }
  .vmap-wx.vm-snow { background-color: rgba(255, 255, 255, .14); }
  .vmap-wx.vm-snow::before { background-image: ${SNOW1}; animation: vm-snow1 6s linear infinite; }
  .vmap-wx.vm-snow::after { background-image: ${SNOW2}; animation: vm-snow2 9s linear infinite; }
  @keyframes vm-rain1 { to { transform: translate(-40px, 160px); } }
  @keyframes vm-rain2 { to { transform: translate(-60px, 240px); } }
  @keyframes vm-snow1 { to { transform: translate(-60px, 240px); } }
  @keyframes vm-snow2 { to { transform: translate(90px, 360px); } }
  @media (prefers-reduced-motion: reduce) { .vmap-wx::before, .vmap-wx::after { animation-duration: 0s; } }

  /* Компас и масштаб */
  .vmap-hud { position: absolute; left: 10px; bottom: 10px; z-index: 2; display: flex; align-items: flex-end; gap: 8px; pointer-events: none; }
  .vm-compass { position: relative; width: 38px; height: 38px; border-radius: 50%; border: 2.5px solid var(--ink); background: #fff; box-shadow: 0 3px 0 var(--ink); display: grid; place-items: center; }
  .vm-compass svg { margin-top: 5px; }
  .vm-compass b { position: absolute; top: 0; left: 0; right: 0; text-align: center; font-size: 9px; font-weight: 900; line-height: 10px; color: #ff3b5c; }
  .vm-scale { background: rgba(255,255,255,.92); border: 2px solid var(--ink); border-radius: 10px; padding: 3px 7px 4px; font: 800 10px/1 Manrope, sans-serif; color: var(--ink); }
  .vm-scale i { display: block; height: 5px; border: 2px solid var(--ink); border-top: 0; margin-bottom: 2px; min-width: 16px; max-width: 160px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
