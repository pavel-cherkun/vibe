/* ============================================================
   Иллюстрации Vibe — дофаминовый вектор вместо эмодзи.
   Рисунок привязан к эмодзи: Vibe.pic("🥑") вернёт SVG, если он
   нарисован, иначе — сам эмодзи. Размер = font-size контейнера (1em),
   поэтому подменять можно прямо там, где раньше стоял эмодзи.

   СТИЛЬ (для всех файлов ill-*.js):
   • viewBox="0 0 100 100", предмет занимает ~10–90, без фона.
   • Контур: stroke="#1b1430", stroke-width 3.5 (мелкие детали 2.5),
     stroke-linejoin/linecap="round". Заливки плоские, без градиентов и теней.
   • Палитра P ниже. 2–4 цвета на рисунок, один акцентный «неожиданный».
   • Характер: у предметов часто есть глаза (P.eyes / P.sleepy) —
     но не у всех, примерно у каждого третьего. Люди — округлые,
     нос-капля, щёки-кружки, без мелкой детализации.
   • Декор по желанию: 1–2 искры/кружочка (P.spark) вокруг.
   • СМЕЛОСТЬ (референсы: дофаминовый вектор, IAF-постеры): крупные формы
     во весь кадр, контрастные соседние цвета, узоры — шахматка (P.checker),
     полоски (P.stripes), горошек (P.dots); странные пропорции, ножки и ручки
     у предметов, волнистые стебли. Не «милый клипарт», а дерзкий плакат.
     Читаемость в 28 px обязательна: силуэт важнее деталей.
   ============================================================ */
(function () {
  const INK = "#1b1430";
  const P = {
    ink: INK, pink: "#ff6bcb", rose: "#ffb3e0", red: "#ff4b3e", orange: "#ff8a1f", yellow: "#ffd23f",
    lime: "#c6ff4d", green: "#35c47a", mint: "#7cf5c8", sky: "#8fd8ff", blue: "#2f5bff", lilac: "#c9b6ff",
    violet: "#8b5cf6", cream: "#fff4e0", white: "#ffffff", skin: "#f6c9a3", skin2: "#d99a6c", skin3: "#8d5a3b", brown: "#7a4a2b",
    S: `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`,
    s: `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`,
    // Глаза-«кругляши» с бликом: cx, cy, расстояние между глазами, радиус
    eyes(cx, cy, gap = 14, r = 6) {
      const e = (x) => `<ellipse cx="${x}" cy="${cy}" rx="${r}" ry="${r * 1.15}" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${x + r * 0.2}" cy="${cy + r * 0.15}" r="${r * 0.55}" fill="${INK}"/><circle cx="${x + r * 0.45}" cy="${cy - r * 0.15}" r="${r * 0.18}" fill="#fff"/>`;
      return e(cx - gap / 2) + e(cx + gap / 2);
    },
    // Сонные глаза-дуги с ресницами
    sleepy(cx, cy, gap = 14, w = 7) {
      const e = (x) => `<path d="M${x - w} ${cy} Q${x} ${cy + w * 0.8} ${x + w} ${cy}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><path d="M${x - w * 0.6} ${cy + 3} l-2 3 M${x} ${cy + 4.5} v3.5 M${x + w * 0.6} ${cy + 3} l2 3" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
      return e(cx - gap / 2) + e(cx + gap / 2);
    },
    // Искра-звёздочка
    spark(x, y, r = 5, c = "#ffd23f") {
      return `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    },
    // Узоры: шахматка, полоски, горошек — внутри clipPath фигуры. id — уникальный ключ рисунка
    checker(id, d, c1 = "#1b1430", c2 = "#fff", n = 6) {
      let r = ""; const w = 100 / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) r += `<rect x="${i * w}" y="${j * w}" width="${w}" height="${w}" fill="${c1}"/>`;
      return `<clipPath id="ck-${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${c2}"/><g clip-path="url(#ck-${id})">${r}</g><path d="${d}" fill="none" stroke="#1b1430" stroke-width="3.5" stroke-linejoin="round"/>`;
    },
    stripes(id, d, c1, c2, w = 9, vertical = true) {
      let r = ""; for (let i = 0; i < 100 / w; i += 2) r += vertical ? `<rect x="${i * w}" y="0" width="${w}" height="100" fill="${c1}"/>` : `<rect x="0" y="${i * w}" width="100" height="${w}" fill="${c1}"/>`;
      return `<clipPath id="st-${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${c2}"/><g clip-path="url(#st-${id})">${r}</g><path d="${d}" fill="none" stroke="#1b1430" stroke-width="3.5" stroke-linejoin="round"/>`;
    },
    dots(id, d, c1, c2, step = 14, r = 3.2) {
      let o = ""; for (let y = 0; y < 100; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < 100; x += step) o += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c1}"/>`;
      return `<clipPath id="dt-${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${c2}"/><g clip-path="url(#dt-${id})">${o}</g><path d="${d}" fill="none" stroke="#1b1430" stroke-width="3.5" stroke-linejoin="round"/>`;
    },
    // Щёки
    cheeks(cx, cy, gap = 26, c = "#ff6bcb") { return `<ellipse cx="${cx - gap / 2}" cy="${cy}" rx="5" ry="3.2" fill="${c}" opacity=".75"/><ellipse cx="${cx + gap / 2}" cy="${cy}" rx="5" ry="3.2" fill="${c}" opacity=".75"/>`; },
  };

  const REG = {};
  const svg = (body) => `<svg class="ill-svg" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
  const strip = (e) => String(e || "").replace(/️/g, "");

  Vibe.ill = {
    P,
    // add({"🥑": (P) => `...`, ...}) — тело SVG без обёртки
    add(map) { Object.entries(map).forEach(([k, fn]) => { REG[strip(k)] = fn; }); },
    has: (e) => !!REG[strip(e)],
    raw(e) { const fn = REG[strip(e)]; if (!fn) return ""; try { return svg(fn(P)); } catch (err) { console.error("[ill]", e, err); return ""; } },
    keys: () => Object.keys(REG),
  };
  const cache = {};
  // Главный вход: эмодзи → иллюстрация (или эмодзи как был)
  Vibe.pic = (e, cls = "") => {
    const k = strip(e);
    if (!REG[k] || (AVA_ONLY.has(k) && cls !== "ava")) return e == null ? "" : String(e);
    if (!cache[k]) cache[k] = Vibe.ill.raw(k);
    return cache[k] ? `<span class="ill ${cls}">${cache[k]}</span>` : String(e);
  };

  // Автоподмена: аватарки, картинки товаров и постов, крупные эмодзи модалок.
  // Если в контейнере стоит ровно один нарисованный эмодзи — ставим рисунок.
  // Аватарки людей. Портреты (ключи из ill-people.js) ставятся ТОЛЬКО сюда:
  // эмодзи вроде 👩 в игре значат много чего, а мамой должна быть только аватарка
  const AVA = ".vg-ava, .vg-rava, .vg-pava, .vg-bigava, .chat-ava, .chx-ava, .pp-ava, .lf-ava, .mx-ava";
  const SEL = AVA + ", .pic .emo, .pic > span:only-child, .vg-ph-main, .vg-an, .m-emo, .mx-empty .emo, .ill-auto";
  const AVA_ONLY = new Set();
  const okKey = (txt, el) => { const k = strip((txt || "").trim()); if (!k || !REG[k] || (AVA_ONLY.has(k) && !el.matches(AVA))) return null; if (!cache[k]) cache[k] = Vibe.ill.raw(k); return cache[k] ? k : null; };
  function swap(el) {
    if (el.dataset.ill || el.closest("[data-noill]")) return;
    // 1) весь контейнер — один эмодзи (или одна .emo внутри)
    let t = el;
    if (t.children.length === 1 && t.firstElementChild.classList.contains("emo")) t = t.firstElementChild;
    if (!t.children.length) {
      const k = okKey(t.textContent, el); if (!k) return;
      t.innerHTML = `<span class="ill">${cache[k]}</span>`; el.dataset.ill = "1"; return;
    }
    // 2) аватарка со значками рядом: ищем эмодзи среди прямых детей
    for (const n of [...t.childNodes]) {
      if (n.nodeType === 3) { const k = okKey(n.textContent, el); if (k) { const sp = document.createElement("span"); sp.className = "ill"; sp.innerHTML = cache[k]; n.replaceWith(sp); el.dataset.ill = "1"; return; } }
      else if (n.nodeType === 1 && n.classList.contains("emo") && !n.children.length) { const k = okKey(n.textContent, el); if (k) { n.innerHTML = `<span class="ill">${cache[k]}</span>`; el.dataset.ill = "1"; return; } }
    }
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches(SEL)) swap(root);
    root.querySelectorAll(SEL).forEach(swap);
  }
  let pend = null; const queue = new Set();
  new MutationObserver((ms) => {
    ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) queue.add(n); else if (n.parentElement) queue.add(n.parentElement); }));
    if (!pend) pend = setTimeout(() => { pend = null; const q = [...queue]; queue.clear(); q.forEach(scan); }, 20);
  }).observe(document.documentElement, { childList: true, subtree: true });
  Vibe.ill.scan = scan;
  Vibe.ill.avaOnly = (keys) => keys.forEach((k) => AVA_ONLY.add(strip(k)));

  const st = document.createElement("style");
  st.textContent = `
  .ill{display:inline-block;width:1em;height:1em;line-height:0;vertical-align:-0.12em}
  .ill .ill-svg{width:100%;height:100%;overflow:visible;display:block}
  .emo .ill{width:1.15em;height:1.15em}`;
  document.head.appendChild(st);

  /* ---------- Эталоны стиля ---------- */
  Vibe.ill.add({
    // Плюшевый авокадо с глазами
    "🥑": (P) => `
      <path d="M50 8 C66 8 72 26 78 44 C86 68 74 92 50 92 C26 92 14 68 22 44 C28 26 34 8 50 8 Z" fill="${P.green}" ${P.S}/>
      <path d="M50 22 C61 22 64 36 68 48 C73 66 65 82 50 82 C35 82 27 66 32 48 C36 36 39 22 50 22 Z" fill="${P.lime}" ${P.s}/>
      <circle cx="50" cy="62" r="13" fill="${P.brown}" ${P.S}/>
      <circle cx="45" cy="57" r="3" fill="#fff" opacity=".6"/>
      ${P.eyes(50, 40, 16, 5)}
      ${P.cheeks(50, 47, 30)}
      ${P.spark(84, 18, 6)}`,
    // Кроссовки-облака
    "👟": (P) => `
      <path d="M10 70 C10 58 18 50 30 48 L44 34 C48 30 54 31 56 36 L60 46 C72 48 86 54 90 66 L90 72 C90 76 87 78 83 78 L16 78 C12 78 10 75 10 70 Z" fill="${P.pink}" ${P.S}/>
      <path d="M10 70 L90 70 L90 74 C90 77 87 79 84 79 L16 79 C12 79 10 76 10 72 Z" fill="#fff" ${P.S}/>
      <path d="M40 40 L50 50 M46 36 L55 45 M34 46 L44 54" ${P.s} fill="none"/>
      <path d="M62 56 Q72 52 80 60" ${P.s} fill="none"/>
      <circle cx="24" cy="60" r="4.5" fill="${P.yellow}" ${P.s}/>
      ${P.spark(86, 30, 6, P.lime)}`,
    // Кофе с паром и сонными глазами
    "☕": (P) => `
      <path d="M40 20 C36 14 44 10 40 4 M54 22 C50 16 58 12 54 6" fill="none" ${P.s}/>
      <path d="M18 34 L76 34 L70 82 C69 88 64 92 58 92 L36 92 C30 92 25 88 24 82 Z" fill="${P.blue}" ${P.S}/>
      <path d="M74 44 C90 42 92 66 72 68" fill="none" ${P.S}/>
      <ellipse cx="47" cy="34" rx="29" ry="6" fill="${P.brown}" ${P.S}/>
      ${P.sleepy(47, 58, 18, 6)}
      <path d="M41 74 Q47 79 53 74" fill="none" stroke="${P.ink}" stroke-width="2.5" stroke-linecap="round"/>
      ${P.cheeks(47, 68, 30, P.pink)}`,
    // Валера с пятого этажа: лысина, усы, кепка таксиста в руке не влезла — оставили усы
    "👨‍🦲": (P) => `
      <path d="M22 98 C22 80 34 72 50 72 C66 72 78 80 78 98 Z" fill="${P.orange}" ${P.S}/>
      <path d="M44 72 L50 84 L56 72" fill="#fff" ${P.s}/>
      <ellipse cx="50" cy="46" rx="26" ry="30" fill="${P.skin}" ${P.S}/>
      <ellipse cx="23" cy="50" rx="5" ry="7" fill="${P.skin}" ${P.s}/><ellipse cx="77" cy="50" rx="5" ry="7" fill="${P.skin}" ${P.s}/>
      <path d="M38 22 Q50 16 60 22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <path d="M36 38 L44 36 M56 36 L64 38" ${P.S}/>
      <circle cx="41" cy="45" r="3.2" fill="${P.ink}"/><circle cx="59" cy="45" r="3.2" fill="${P.ink}"/>
      <path d="M50 46 C47 54 48 57 52 57" fill="none" ${P.s}/>
      <path d="M36 62 C42 58 48 60 50 63 C52 60 58 58 64 62 C60 68 54 66 50 65 C46 66 40 68 36 62 Z" fill="${P.brown}" ${P.s}/>
      ${P.cheeks(50, 55, 34, P.red)}`,
  });
})();
