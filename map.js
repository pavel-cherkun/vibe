/* ============================================================
   Карта города Vibe — общий компонент для такси, доставки,
   работы и жилья. Детерминированный город на сетке улиц,
   маршруты по улицам, перетаскивание, зум, анимация машинок.

   Vibe.map.create(el, { pins, ambient, interactive, height })
     → ctrl { setPins, route, clearRoute, drive, fit, center, destroy }
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
  };
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
      if (h && h.x != null) return { x: h.x, y: h.y, e: h.emoji || "🏠", label: "Дом", district: h.district };
      return Object.assign(door(1, 4, 1), { e: "🏠", label: "Дом" });
    }
    if (key === "work") {
      const j = S.job;
      if (j && j.x != null) return { x: j.x, y: j.y, e: j.emoji || "💼", label: "Работа" };
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
    if (mode === "walk") return Math.max(3, Math.round((d / 5) * 60));
    if (mode === "metro") return Math.max(8, Math.round((d / 25) * 60 + 10));
    if (mode === "courier") return Math.max(12, Math.round((d / 18) * 60 + 15));
    return Math.max(4, Math.round((d / 28) * 60 + 3));
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
  let cityCache = null;
  function cityMarkup() {
    if (cityCache) return cityCache;
    let s = "";
    // Земля = улицы
    s += `<rect x="-200" y="-200" width="${SIZE + 400}" height="${SIZE + 400}" fill="#4fc3ff"/>`;
    s += `<rect x="${ST[0] - SW}" y="${ST[0] - SW}" width="${ST[5] - ST[0] + SW * 2}" height="${ST[5] - ST[0] + SW * 2}" rx="40" fill="#fbf7ec" stroke="#0e0e12" stroke-width="4"/>`;
    // Волны вокруг острова
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % (SIZE + 200) - 100, y = (i * 53) % 40 - 30;
      s += `<path d="M${x} ${y} q12 -8 24 0 t24 0" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
      s += `<path d="M${x} ${SIZE + 10 - y} q12 -8 24 0 t24 0" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
    }
    // Разметка улиц
    ST.forEach((v, i) => {
      const main = i === 2 || i === 3;
      s += `<line x1="${ST[0]}" y1="${v}" x2="${ST[5]}" y2="${v}" stroke="${main ? "#ffd84d" : "#e3dccb"}" stroke-width="${main ? 4 : 3}" stroke-dasharray="${main ? "0" : "14 12"}"/>`;
      s += `<line x1="${v}" y1="${ST[0]}" x2="${v}" y2="${ST[5]}" stroke="${main ? "#ffd84d" : "#e3dccb"}" stroke-width="${main ? 4 : 3}" stroke-dasharray="${main ? "0" : "14 12"}"/>`;
    });
    // Кварталы
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const b = block(col, row), w = b.x2 - b.x1, h = b.y2 - b.y1;
        const sp = SPECIAL[col + "," + row];
        const pal = BLOCK_COL[b.district];
        if (sp === "lake") {
          s += `<rect x="${b.x1}" y="${b.y1}" width="${w}" height="${h}" rx="18" fill="#c8f7c0" stroke="#0e0e12" stroke-width="3"/>`;
          s += `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${w / 2 - 18}" ry="${h / 2 - 26}" fill="#6fd0ff" stroke="#0e0e12" stroke-width="3"/>`;
          s += `<text x="${b.cx - 30}" y="${b.cy + 8}" font-size="26">🦆</text><text x="${b.cx + 6}" y="${b.cy - 6}" font-size="20">🛶</text>`;
          continue;
        }
        if (sp === "park" || sp === "park2") {
          s += `<rect x="${b.x1}" y="${b.y1}" width="${w}" height="${h}" rx="18" fill="#9be58a" stroke="#0e0e12" stroke-width="3"/>`;
          s += `<path d="M${b.x1 + 14} ${b.cy + 20} Q ${b.cx} ${b.cy - 40} ${b.x2 - 14} ${b.cy + 10}" stroke="#f5e6b8" stroke-width="10" fill="none" stroke-linecap="round"/>`;
          [[0.2, 0.25], [0.7, 0.2], [0.35, 0.7], [0.8, 0.72], [0.55, 0.45]].forEach(([fx, fy], k) => {
            s += `<text x="${b.x1 + w * fx - 12}" y="${b.y1 + h * fy + 10}" font-size="${k % 2 ? 26 : 30}">${k === 4 ? "⛲" : "🌳"}</text>`;
          });
          continue;
        }
        const fill = pal[hash(col + ":" + row) % pal.length];
        s += `<rect x="${b.x1}" y="${b.y1}" width="${w}" height="${h}" rx="18" fill="${fill}" stroke="#0e0e12" stroke-width="3"/>`;
        if (sp === "hq") {
          // Башня Корпорации
          s += `<rect x="${b.cx - 34}" y="${b.y1 + 14}" width="68" height="${h - 50}" rx="10" fill="#0e0e12" transform="translate(5 5)"/>`;
          s += `<rect x="${b.cx - 34}" y="${b.y1 + 14}" width="68" height="${h - 50}" rx="10" fill="url(#vibe-grad)" stroke="#0e0e12" stroke-width="3"/>`;
          for (let wy = b.y1 + 26; wy < b.y2 - 50; wy += 16) for (let wx = b.cx - 24; wx < b.cx + 24; wx += 16) s += `<rect x="${wx}" y="${wy}" width="8" height="8" rx="2" fill="#fff" opacity=".85"/>`;
          s += `<text x="${b.cx}" y="${b.y1 + 10}" font-size="20" text-anchor="middle">💜</text>`;
          continue;
        }
        // Дома внутри квартала
        const n = 3 + (hash("n" + col + row) % 2);
        for (let k = 0; k < n; k++) {
          const hh = hash(col + "-" + row + "-" + k);
          const bw = 30 + (hh % 22), bh = (b.district === "Сити" ? 44 : 28) + ((hh >> 3) % 26);
          const bx = b.x1 + 14 + (k % 2) * (w / 2 - 6) + ((hh >> 5) % 10);
          const by = b.y1 + 14 + Math.floor(k / 2) * (h / 2 - 8) + ((hh >> 7) % 8);
          const roof = ["#ff6bcb", "#ffe14d", "#c6ff4d", "#8fd8ff", "#ff8a8a", "#b9a3ff"][(hh >> 9) % 6];
          s += `<rect x="${bx + 4}" y="${by + 4}" width="${bw}" height="${bh}" rx="6" fill="#0e0e12"/>`;
          s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="#fff" stroke="#0e0e12" stroke-width="2.5"/>`;
          s += `<rect x="${bx}" y="${by}" width="${bw}" height="9" rx="4" fill="${roof}" stroke="#0e0e12" stroke-width="2.5"/>`;
          for (let wy = by + 15; wy < by + bh - 6; wy += 11) for (let wx = bx + 6; wx < bx + bw - 6; wx += 10) s += `<rect x="${wx}" y="${wy}" width="5" height="5" rx="1" fill="#0e0e12" opacity=".18"/>`;
        }
      }
    }
    // Названия улиц
    ST.forEach((v, i) => {
      if (i === 0 || i === 5) return;
      s += `<text x="${ST[0] + 30 + i * 14}" y="${v + 4}" font-size="11" font-weight="800" fill="#0e0e12" opacity=".55" font-family="Manrope, sans-serif" paint-order="stroke" stroke="#fbf7ec" stroke-width="4">${H_NAMES[i]}</text>`;
      s += `<text transform="translate(${v + 4} ${ST[5] - 30 - i * 14}) rotate(-90)" font-size="11" font-weight="800" fill="#0e0e12" opacity=".55" font-family="Manrope, sans-serif" paint-order="stroke" stroke="#fbf7ec" stroke-width="4">${V_NAMES[i]}</text>`;
    });
    // Подписи районов
    [["СИТИ", ST[2] + 86, ST[0] + 38], ["ЦЕНТР", ST[0] + 86, ST[2] + 84], ["СПАЛЬНЫЙ", ST[2] + 86, ST[4] + 92]].forEach(([t, x, y]) => {
      s += `<text x="${x}" y="${y}" font-size="15" font-family="Dela Gothic One, sans-serif" fill="#0e0e12" opacity=".22" text-anchor="middle">${t}</text>`;
    });
    // Мосты
    s += `<rect x="${ST[2] - 16}" y="-60" width="32" height="${ST[0] + 40}" fill="#fbf7ec" stroke="#0e0e12" stroke-width="3"/>`;
    s += `<rect x="${ST[3] - 16}" y="${ST[5] + 20}" width="32" height="80" fill="#fbf7ec" stroke="#0e0e12" stroke-width="3"/>`;
    cityCache = s;
    return s;
  }

  /* ---------- Компонент ---------- */
  function create(el, opts = {}) {
    const interactive = opts.interactive !== false;
    el.classList.add("vmap");
    el.style.touchAction = interactive ? "none" : "pan-y";
    el.innerHTML = "";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "vmap-svg");
    svg.innerHTML = `
      <defs><linearGradient id="vibe-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cff"/><stop offset=".6" stop-color="#ff6bcb"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs>
      <g class="vm-city">${cityMarkup()}</g>
      <g class="vm-traffic"></g>
      <g class="vm-route"></g>
      <g class="vm-pins"></g>
      <g class="vm-veh"></g>`;
    el.appendChild(svg);
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

    let vb = { x: 0, y: 0, w: SIZE, h: SIZE };
    const apply = () => svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const aspect = () => (el.clientHeight || 300) / (el.clientWidth || 360);
    function clamp() {
      vb.w = Math.max(220, Math.min(SIZE + 200, vb.w));
      vb.h = vb.w * aspect();
      vb.x = Math.max(-60, Math.min(SIZE + 60 - vb.w, vb.x));
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
    requestAnimationFrame(() => { if (opts.fit) fit(opts.fit, 70, true); else { vb.h = vb.w * aspect(); apply(); } });
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
    function drive(points, { emoji = "🚕", duration = 6000, follow = false, onProgress, onDone, color = "#ffe14d" } = {}) {
      const g = document.createElementNS(NS, "g");
      g.innerHTML = `<circle r="17" fill="${color}" stroke="#0e0e12" stroke-width="3"/><text class="vm-emo" y="7" font-size="20" text-anchor="middle">${emoji}</text>`;
      gVeh.appendChild(g);
      const t0 = performance.now();
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

    /* --- Фоновый трафик --- */
    let trafficRaf = null;
    if (opts.ambient !== false) {
      const cars = Array.from({ length: 9 }, (_, i) => {
        const horiz = i % 2 === 0;
        const line = ST[1 + (i % 4)];
        const g = document.createElementNS(NS, "g");
        const col = ["#ff6bcb", "#ffe14d", "#8fd8ff", "#c6ff4d", "#ff8a8a"][i % 5];
        g.innerHTML = `<rect x="-11" y="-7" width="22" height="14" rx="5" fill="${col}" stroke="#0e0e12" stroke-width="2.5"/><rect x="-4" y="-5" width="7" height="10" rx="2" fill="#0e0e12" opacity=".35"/>`;
        gTraffic.appendChild(g);
        return { g, horiz, line: line + (i % 3 === 0 ? -7 : 7), pos: Math.random() * SIZE, speed: (0.35 + Math.random() * 0.5) * (i % 3 === 0 ? -1 : 1) };
      });
      (function loop() {
        cars.forEach((c) => {
          c.pos += c.speed;
          if (c.pos > ST[5]) c.pos = ST[0]; if (c.pos < ST[0]) c.pos = ST[5];
          c.g.setAttribute("transform", c.horiz ? `translate(${c.pos} ${c.line})` : `translate(${c.line} ${c.pos}) rotate(90)`);
        });
        trafficRaf = requestAnimationFrame(loop);
      })();
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
      destroy() { cancelAnimationFrame(trafficRaf); cancelAnimationFrame(anim); drives.forEach((d) => d.stop()); el.innerHTML = ""; },
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
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
