/* ============================================================
   Сцены Vibegram — фоны мест, где герой «фоткается».
   Стиль и палитра — см. ill.js (дофаминовый вектор): плоские заливки,
   контур #1b1430, узоры (горошек, полоски, шахматка), без градиентов.
   Сцена — это задник 100×100: центр (≈30–75 по x, 25–80 по y) оставлен
   спокойным, туда ставится главный объект поста.

   API:
   Vibe.scenes.svg(key)        → <svg …> во весь блок (preserveAspectRatio slice)
   Vibe.scenes.list            → [{ k, n, e }] — ключ, подпись, эмодзи для выбора
   Vibe.scenes.has(key)
   Ключи: home, office, cafe, park, river, metro, club, gym, beach, parents, night, shop
   ============================================================ */
(function () {
  if (!window.Vibe) return;
  const I = "#1b1430";
  const P = (Vibe.ill && Vibe.ill.P) || {
    pink: "#ff6bcb", rose: "#ffb3e0", red: "#ff4b3e", orange: "#ff8a1f", yellow: "#ffd23f", lime: "#c6ff4d", green: "#35c47a",
    mint: "#7cf5c8", sky: "#8fd8ff", blue: "#2f5bff", lilac: "#c9b6ff", violet: "#8b5cf6", cream: "#fff4e0", white: "#ffffff", brown: "#7a4a2b",
  };
  const L = `stroke="${I}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
  const l = `stroke="${I}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
  const r = (x, y, w, h, f, ex = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${ex}/>`;
  // Узоры без clipPath (рисуем прямо в прямоугольнике): так сцены не ломаются в скрытых блоках
  const stripesV = (x, y, w, h, c, step = 8) => { let o = ""; for (let i = x; i < x + w; i += step * 2) o += r(i, y, Math.min(step, x + w - i), h, c); return o; };
  const stripesH = (x, y, w, h, c, step = 6) => { let o = ""; for (let j = y; j < y + h; j += step * 2) o += r(x, j, w, Math.min(step, y + h - j), c); return o; };
  const checker = (x, y, w, h, c, s = 8) => { let o = ""; for (let i = 0; i * s < w; i++) for (let j = 0; j * s < h; j++) if ((i + j) % 2) o += r(x + i * s, y + j * s, Math.min(s, w - i * s), Math.min(s, h - j * s), c); return o; };
  const dots = (x, y, w, h, c, step = 8, rad = 1.3) => { let o = ""; for (let j = y + step / 2, k = 0; j < y + h; j += step, k++) for (let i = x + (k % 2 ? step : step / 2); i < x + w; i += step) o += `<circle cx="${i.toFixed(1)}" cy="${j.toFixed(1)}" r="${rad}" fill="${c}"/>`; return o; };
  const spark = (x, y, s = 3, c = P.yellow) => `<path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z" fill="${c}" ${l}/>`;
  const cloud = (x, y, k = 1, c = "#fff") => `<path d="M${x} ${y} c${-6 * k} 0 ${-6 * k} ${-7 * k} 0 ${-7 * k} c${1 * k} ${-5 * k} ${9 * k} ${-5 * k} ${10 * k} 0 c${5 * k} ${-1 * k} ${7 * k} ${6 * k} ${2 * k} ${7 * k} Z" fill="${c}" ${l}/>`;
  const plank = (y, h, c1, c2) => r(0, y, 100, h, c1, L) + [16, 41, 63, 88].map((x, i) => `<path d="M${x} ${y + (i % 2 ? h * 0.45 : 0)} v${h * 0.55}" ${l} fill="none"/>`).join("") + `<path d="M0 ${y + h * 0.45} H100" ${l} fill="none" stroke-opacity=".5"/>` + r(0, y, 100, 2.5, c2);

  const S = {
    // Коммуналка: обои в полоску, лампочка Ильича, ковёр на стене, окно во двор
    home: () => `
      ${r(0, 0, 100, 100, P.rose)}${stripesV(0, 0, 100, 74, "#ffc6e8", 6)}${dots(0, 0, 100, 74, "#ff9fd6", 12, 1.1)}
      ${r(6, 12, 24, 30, P.sky, L + ' rx="2"')}<path d="M18 12 V42 M6 27 H30" ${L} fill="none"/>${cloud(16, 22, 0.7)}
      <path d="M4 10 h28 v4 h-28 z" fill="${P.orange}" ${l}/>
      ${r(74, 18, 26, 40, P.red, L)}${checker(76, 20, 24, 36, "#c42f25", 6)}<path d="M74 18 h26 M74 58 h26" ${L}/>
      ${[22, 30, 38, 46, 54].map((y) => `<path d="M72 ${y} h3" ${l}/>`).join("")}
      <path d="M58 0 V12" ${L}/><path d="M55 12 h6 v4 h-6 z" fill="${P.ink || I}" ${l}/><circle cx="58" cy="21" r="5" fill="${P.yellow}" ${L}/><path d="M50 26 l-3 3 M66 26 l3 3 M58 30 v3" ${l}/>
      ${plank(74, 26, "#c98a5a", "#a5683f")}
      <ellipse cx="50" cy="90" rx="38" ry="7" fill="${P.lilac}" ${L}/>${dots(14, 85, 72, 10, "#fff", 7, 1)}`,

    // Офис Корпорации: панорамное окно, стикеры с KPI, стол, кулер
    office: () => `
      ${r(0, 0, 100, 100, "#e9e4ff")}
      ${r(0, 0, 100, 62, P.sky, L)}
      <path d="M6 62 V40 h10 V30 h8 v32 M30 62 V24 h12 v38 M48 62 V36 h9 v-8 h6 v34 M70 62 V20 h10 v42 M84 62 V34 h12 v28" fill="${P.lilac}" ${L}/>
      ${[[33, 28], [33, 36], [33, 44], [37, 28], [37, 36], [73, 24], [73, 32], [77, 40], [73, 48], [87, 40], [91, 48]].map(([x, y]) => r(x, y, 2.4, 3, P.yellow)).join("")}
      <path d="M25 0 V62 M50 0 V62 M75 0 V62" stroke="#fff" stroke-width="3"/><path d="M25 0 V62 M50 0 V62 M75 0 V62" ${l}/>
      ${r(4, 6, 9, 9, P.yellow, l + ' transform="rotate(-6 8 10)"')}${r(87, 8, 9, 9, P.lime, l + ' transform="rotate(5 91 12)"')}${r(88, 19, 8, 8, P.pink, l)}
      <path d="M6 13 l2 -3 2 2 3 -4" ${l} fill="none"/>
      ${r(0, 62, 100, 38, "#cfc6ee")}${stripesV(0, 62, 100, 38, "#c2b8e6", 5)}
      ${r(-2, 68, 104, 7, "#fff", L)}${r(4, 75, 4, 25, "#fff", L)}${r(92, 75, 4, 25, "#fff", L)}
      <path d="M6 68 c-2 -8 4 -12 2 -18 M10 68 c2 -6 8 -8 6 -14 M8 68 c0 -6 -6 -8 -6 -12" fill="none" stroke="${P.green}" stroke-width="3"/><path d="M3 60 h12 l-2 8 h-8 z" fill="${P.orange}" ${l}/>
      ${r(82, 52, 16, 12, I, l + ' rx="1.5"')}${r(84, 54, 12, 8, P.mint)}<path d="M85 60 l3 -3 2 2 4 -4" stroke="${I}" stroke-width="1.2" fill="none"/><path d="M88 64 h4 v4 h-4z" fill="${I}"/>`,

    // Кофейня: полосатая маркиза, лампы-конусы, полка с чашками, шахматный пол, столик
    cafe: () => `
      ${r(0, 0, 100, 100, P.mint)}${dots(0, 14, 100, 62, "#5fe0b0", 10, 1.4)}
      ${stripesV(0, 0, 100, 14, P.pink, 10)}${stripesV(10, 0, 100, 14, "#fff", 10)}
      <path d="M0 14 ${Array.from({ length: 10 }, (_, i) => `q5 6 10 0`).join(" ")}" fill="${P.pink}" ${L}/><path d="M0 0 H100" ${L}/>
      <path d="M22 14 V24 M78 14 V24" ${l}/><path d="M16 32 L22 22 L28 32 Z" fill="${P.yellow}" ${L}/><path d="M72 32 L78 22 L84 32 Z" fill="${P.yellow}" ${L}/>
      <circle cx="22" cy="33" r="2" fill="#fff" ${l}/><circle cx="78" cy="33" r="2" fill="#fff" ${l}/>
      ${r(2, 46, 22, 3, P.brown, l)}${[4, 11, 17].map((x, i) => `<path d="M${x} 46 v-6 h5 v6 z" fill="${[P.blue, P.red, P.yellow][i]}" ${l}/>`).join("")}
      ${r(78, 40, 18, 22, I, L + ' rx="2"')}<path d="M81 46 h12 M81 51 h9 M81 56 h11" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
      ${r(0, 76, 100, 24, "#fff", L)}${checker(0, 76, 100, 24, I, 8)}
      <ellipse cx="50" cy="80" rx="34" ry="6" fill="${P.orange}" ${L}/><path d="M50 86 V100" stroke="${I}" stroke-width="4"/>`,

    // Парк «Без вайфая»: деревья-леденцы, облака, дорожка, скамейка
    park: () => `
      ${r(0, 0, 100, 100, P.sky)}
      <circle cx="84" cy="16" r="9" fill="${P.yellow}" ${L}/>${cloud(20, 18, 1)}${cloud(62, 12, 0.7)}
      ${r(0, 60, 100, 40, P.lime, L)}${dots(0, 62, 100, 38, P.green, 9, 1.3)}
      <path d="M38 100 C42 84 46 72 50 60 C54 72 58 84 62 100 Z" fill="${P.cream}" ${L}/>
      <path d="M12 64 V44" stroke="${P.brown}" stroke-width="4"/><path d="M12 64 V44" ${l}/><circle cx="12" cy="34" r="12" fill="${P.green}" ${L}/><path d="M6 32 a6 6 0 0 1 8 -6" ${l} fill="none" stroke="#fff"/>
      <path d="M90 66 V46" stroke="${P.brown}" stroke-width="4"/><circle cx="90" cy="38" r="11" fill="${P.pink}" ${L}/><circle cx="86" cy="35" r="1.6" fill="#fff"/><circle cx="93" cy="41" r="1.6" fill="#fff"/>
      <path d="M28 62 V54" stroke="${P.brown}" stroke-width="3"/><circle cx="28" cy="49" r="7" fill="${P.mint}" ${L}/>
      ${r(66, 70, 24, 4, P.orange, l)}${r(66, 64, 24, 3, P.orange, l)}<path d="M68 74 v6 M88 74 v6" ${L}/>
      ${spark(46, 30, 3, "#fff")}`,

    // Набережная Кэшбека: закат полосами, вода, гранитный парапет, фонари
    river: () => `
      ${r(0, 0, 100, 60, P.yellow)}${r(0, 0, 100, 14, P.pink)}${r(0, 14, 100, 12, "#ff9a6b")}${r(0, 26, 100, 12, P.orange)}
      <path d="M26 56 a24 24 0 0 1 48 0 Z" fill="${P.red}" ${L}/>
      ${r(0, 54, 100, 26, P.blue, L)}${[60, 66, 72].map((y, i) => `<path d="M${6 + i * 8} ${y} q4 -2 8 0 M${46 + i * 6} ${y + 2} q4 -2 8 0 M${74 - i * 4} ${y - 2} q4 -2 8 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`).join("")}
      <path d="M30 58 h40 M36 62 h28" stroke="${P.yellow}" stroke-width="2" stroke-linecap="round"/>
      ${r(0, 80, 100, 20, "#b9b0d6", L)}${r(0, 80, 100, 4, "#d9d2f0", l)}${[12, 37, 62, 87].map((x) => `<path d="M${x} 84 v16" ${l}/>`).join("")}
      <path d="M8 80 V30" stroke="${I}" stroke-width="2.4"/><circle cx="8" cy="27" r="4" fill="${P.yellow}" ${L}/>
      <path d="M92 80 V30" stroke="${I}" stroke-width="2.4"/><circle cx="92" cy="27" r="4" fill="${P.yellow}" ${L}/>
      <path d="M58 8 l3 2 3 -2 M70 14 l2 1.5 2 -1.5" ${l} fill="none"/>`,

    // Метро «Кредитная»: плитка, табло, красная «М», жёлтая линия у края
    metro: () => `
      ${r(0, 0, 100, 100, P.cream)}${(() => { let o = ""; for (let y = 0; y < 70; y += 6) o += `<path d="M0 ${y} H100" stroke="#e5d7bd" stroke-width="1"/>`; for (let y = 0, k = 0; y < 70; y += 6, k++) for (let x = k % 2 ? 0 : 6; x < 100; x += 12) o += `<path d="M${x} ${y} v6" stroke="#e5d7bd" stroke-width="1"/>`; return o; })()}
      ${r(0, 34, 100, 6, P.violet, l)}
      <circle cx="14" cy="16" r="9" fill="${P.red}" ${L}/><path d="M9 21 V11 l5 6 5 -6 v10" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
      ${r(28, 9, 44, 14, P.blue, L + ' rx="2"')}<text x="50" y="19" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="7.5" fill="#fff">Кредитная</text>
      <circle cx="87" cy="16" r="8" fill="#fff" ${L}/><path d="M87 11 V16 l3 2" ${l} fill="none"/>
      ${r(0, 70, 100, 30, "#4b4560", L)}${r(0, 72, 100, 4, P.yellow)}${dots(0, 76, 100, 24, "#5d5675", 7, 1.2)}
      ${r(0, 46, 10, 24, P.sky, l)}${r(90, 46, 10, 24, P.sky, l)}<path d="M10 46 v24 M90 46 v24" ${L}/>`,

    // Клуб «Осталось 2 билета»: диско-шар, лучи, светящийся шахматный пол
    club: () => `
      ${r(0, 0, 100, 100, "#2a1650")}
      <path d="M50 14 L-10 90 L10 100 Z" fill="${P.pink}" opacity=".35"/><path d="M50 14 L110 90 L92 100 Z" fill="${P.lime}" opacity=".3"/><path d="M50 14 L36 100 L64 100 Z" fill="${P.sky}" opacity=".22"/>
      <path d="M50 0 V6" stroke="#fff" stroke-width="1.6"/><circle cx="50" cy="13" r="8" fill="#d6d2e8" ${L}/>
      <path d="M43 10 H57 M42 14 H58 M44 18 H56 M47 6 V20 M53 6 V20" stroke="#8d88a8" stroke-width="1"/><circle cx="47" cy="10" r="1.2" fill="#fff"/>
      ${spark(14, 18, 3.5, P.yellow)}${spark(86, 26, 3, P.pink)}${spark(80, 10, 2.4, P.lime)}${spark(20, 40, 2, P.sky)}
      ${dots(0, 0, 100, 70, "#5a3a9a", 11, 1)}
      ${r(0, 76, 100, 24, P.violet, L)}${checker(0, 76, 100, 24, P.pink, 10)}
      ${r(2, 52, 14, 24, I, l + ' rx="2"')}<circle cx="9" cy="60" r="4" fill="#3d3550" ${l}/><circle cx="9" cy="70" r="2.4" fill="#3d3550" ${l}/>
      ${r(84, 52, 14, 24, I, l + ' rx="2"')}<circle cx="91" cy="60" r="4" fill="#3d3550" ${l}/><circle cx="91" cy="70" r="2.4" fill="#3d3550" ${l}/>`,

    // Спортзал: зеркало во всю стену, гантели, плакат, резиновый пол
    gym: () => `
      ${r(0, 0, 100, 100, P.lime)}${stripesH(0, 0, 100, 70, "#b6f03a", 5)}
      ${r(6, 6, 50, 58, P.sky, L + ' rx="2"')}<path d="M14 40 L30 12 M22 52 L44 14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      ${r(64, 8, 30, 18, P.red, L)}<text x="79" y="20" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="7" fill="#fff">NO PAIN</text>
      ${r(66, 40, 30, 3, I)}${r(66, 54, 30, 3, I)}<path d="M68 43 V70 M94 43 V70" ${L}/>
      ${[70, 78, 86].map((x, i) => `<path d="M${x} 40 v-4 M${x + 4} 40 v-4" ${l}/><rect x="${x - 1}" y="33" width="7" height="3" fill="${[P.blue, P.orange, P.pink][i]}" ${l}/>`).join("")}
      ${[70, 80].map((x) => `<rect x="${x}" y="47" width="10" height="7" rx="2" fill="${P.violet}" ${l}/>`).join("")}
      ${r(0, 70, 100, 30, "#3a3548", L)}${dots(0, 70, 100, 30, "#55506a", 6, 1.1)}
      <path d="M8 86 a6 6 0 1 1 12 0 v6 h-12 z" fill="${I}" ${l}/><path d="M11 80 a3 3 0 0 1 6 0" stroke="#fff" stroke-width="1.4" fill="none"/>`,

    // Отпуск: солнце, море полосами, песок в горошек, пальма, зонтик
    beach: () => `
      ${r(0, 0, 100, 100, P.sky)}
      <circle cx="78" cy="18" r="11" fill="${P.yellow}" ${L}/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const rad = (a * Math.PI) / 180; return `<path d="M${(78 + Math.cos(rad) * 14).toFixed(1)} ${(18 + Math.sin(rad) * 14).toFixed(1)} L${(78 + Math.cos(rad) * 18).toFixed(1)} ${(18 + Math.sin(rad) * 18).toFixed(1)}" ${L}/>`; }).join("")}
      ${cloud(30, 16, 0.9)}
      ${r(0, 44, 100, 18, P.blue, L)}${stripesH(0, 47, 100, 14, "#5b82ff", 3)}
      <path d="M0 62 q12 -4 25 0 t25 0 t25 0 t25 0 V100 H0 Z" fill="${P.yellow}" ${L}/>${dots(0, 66, 100, 34, P.orange, 8, 1.1)}
      <path d="M12 100 C14 84 14 70 18 54" stroke="${P.brown}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M12 100 C14 84 14 70 18 54" ${l} fill="none"/>
      <path d="M18 54 C10 46 2 48 -2 54 C6 50 12 52 18 54 C14 44 18 38 26 36 C22 44 22 48 18 54 C28 46 34 50 38 56 C30 52 24 52 18 54 Z" fill="${P.green}" ${L}/>
      <path d="M86 92 V64" ${L}/><path d="M70 66 A16 12 0 0 1 102 66 Z" fill="#fff" ${L}/><path d="M74 66 Q78 56 86 54 M86 54 Q94 56 98 66" ${l} fill="none"/><path d="M78 66 A8 12 0 0 1 86 54 A8 12 0 0 1 94 66 Z" fill="${P.red}" ${l}/>`,

    // Родительская кухня: клеёнка в клетку, банки огурцов, ковёр… нет, занавески в горошек
    parents: () => `
      ${r(0, 0, 100, 100, P.cream)}
      ${r(0, 44, 100, 34, "#fff")}${checker(0, 44, 100, 34, P.sky, 6)}<path d="M0 44 H100" ${L}/>
      ${r(30, 6, 40, 30, P.sky, L)}<path d="M50 6 V36 M30 21 H70" ${L}/>${cloud(44, 18, 0.6)}
      <path d="M24 4 H76" stroke="${I}" stroke-width="2.4"/>
      <path d="M26 4 C30 16 30 28 24 40 L36 40 C34 28 34 16 32 4 Z" fill="${P.red}" ${L}/>${dots(24, 6, 12, 32, "#fff", 5, 0.9)}
      <path d="M74 4 C70 16 70 28 76 40 L64 40 C66 28 66 16 68 4 Z" fill="${P.red}" ${L}/>${dots(64, 6, 12, 32, "#fff", 5, 0.9)}
      ${r(28, 36, 44, 4, "#fff", l)}
      ${[36, 44].map((x) => `<rect x="${x}" y="28" width="6" height="8" rx="1.5" fill="${P.mint}" ${l}/><rect x="${x}" y="26" width="6" height="2.4" fill="${P.red}" ${l}/><path d="M${x + 2} 30 v4 M${x + 4} 31 v4" stroke="${P.green}" stroke-width="1.6"/>`).join("")}
      <path d="M58 36 c0 -4 4 -4 4 -8 c2 2 2 6 0 8 z" fill="${P.green}" ${l}/><path d="M56 36 h8 l-1 -4 h-6 z" fill="${P.orange}" ${l}/>
      ${r(82, 12, 18, 66, "#fff", L + ' rx="3"')}<path d="M82 36 H100" ${L}/><path d="M85 22 v8 M85 42 v10" stroke="${I}" stroke-width="2"/>
      <circle cx="93" cy="18" r="2.4" fill="${P.yellow}" ${l}/><rect x="90" y="46" width="5" height="4" fill="${P.pink}" ${l}/>
      ${r(0, 12, 14, 26, P.orange, L)}<path d="M7 12 v26" ${l}/><circle cx="5" cy="25" r="1" fill="${I}"/><circle cx="9" cy="25" r="1" fill="${I}"/>
      ${r(0, 78, 100, 22, "#fff", L)}${checker(0, 78, 100, 22, P.red, 6)}`,

    // Ночной город: луна, звёзды, окна-огоньки, такси на проспекте Предодобренном
    night: () => `
      ${r(0, 0, 100, 100, "#1e1a4a")}
      <circle cx="80" cy="16" r="8" fill="${P.yellow}" ${L}/><circle cx="84" cy="13" r="7" fill="#1e1a4a"/>
      ${spark(16, 12, 2.4, "#fff")}${spark(44, 8, 1.8, P.yellow)}${spark(62, 22, 2, "#fff")}${spark(28, 26, 1.5, P.pink)}
      <path d="M0 70 V40 h12 V30 h10 v40 M24 70 V48 h10 v22 M36 70 V22 h14 v48 M52 70 V38 h8 v-6 h6 v38 M68 70 V44 h12 v26 M82 70 V28 h18 v42" fill="#3b3478" ${L}/>
      ${[[3, 44], [7, 52], [14, 34], [14, 42], [18, 56], [39, 28], [44, 36], [39, 44], [44, 52], [39, 60], [55, 44], [63, 36], [71, 50], [75, 58], [86, 34], [92, 42], [86, 50], [92, 58]].map(([x, y]) => r(x, y, 3, 3.4, P.yellow)).join("")}
      ${r(0, 70, 100, 30, "#2c2a3c", L)}${[4, 26, 48, 70, 92].map((x) => r(x, 84, 10, 2, P.yellow)).join("")}
      <path d="M2 78 h20 l3 4 v6 h-26 v-6 z" fill="${P.yellow}" ${l}/><rect x="9" y="75" width="6" height="3" fill="${I}"/><circle cx="6" cy="88" r="2.4" fill="${I}"/><circle cx="20" cy="88" r="2.4" fill="${I}"/>`,

    // ТЦ / супермаркет: полки с коробками, ценники «−90%*», блестящий пол
    shop: () => `
      ${r(0, 0, 100, 100, "#fff1a8")}${stripesV(0, 0, 100, 70, "#ffe873", 7)}
      ${[14, 34, 54].map((y) => r(0, y, 100, 3, P.brown, l)).join("")}
      ${(() => { const c = [P.pink, P.blue, P.mint, P.orange, P.violet, P.red, P.sky, P.lime]; let o = ""; [[14, 0], [34, 3], [54, 5]].forEach(([y, s]) => { for (let i = 0, x = 2; x < 98; i++) { const w = 7 + ((i + s) % 3) * 2, h = 7 + ((i * 3 + s) % 4); if (x < 24 || x > 74 || y === 14) o += r(x, y - h, w, h, c[(i + s) % c.length], l); x += w + 1.5; } }); return o; })()}
      <path d="M40 22 h20 l-2 8 h-16 z" fill="${P.red}" ${L}/><text x="50" y="28.5" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="5.6" fill="#fff">−90%*</text>
      ${r(0, 70, 100, 30, "#f4efff", L)}${checker(0, 70, 100, 30, "#e2dbf7", 10)}
      <path d="M20 76 l6 10 M70 74 l8 12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  };

  const LIST = [
    { k: "home", n: "Дом", e: "🏠" }, { k: "office", n: "Офис", e: "💼" }, { k: "cafe", n: "Кофейня", e: "☕" },
    { k: "park", n: "Парк", e: "🌳" }, { k: "river", n: "Набережная", e: "🌅" }, { k: "metro", n: "Метро", e: "🚇" },
    { k: "club", n: "Клуб", e: "🪩" }, { k: "gym", n: "Спортзал", e: "🏋️" }, { k: "beach", n: "Отпуск", e: "🏝️" },
    { k: "parents", n: "У родителей", e: "🥒" }, { k: "night", n: "Ночной город", e: "🌃" }, { k: "shop", n: "ТЦ", e: "🛍️" },
  ];
  const cache = {};
  Vibe.scenes = {
    list: LIST,
    has: (k) => !!S[k],
    svg(k) {
      if (!S[k]) return "";
      if (!cache[k]) { try { cache[k] = `<svg class="vg-scene-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${S[k]()}</svg>`; } catch (e) { console.error("[scenes]", k, e); cache[k] = ""; } }
      return cache[k];
    },
  };
})();
