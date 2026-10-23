/* ============================================================
   Портреты людей Vibe City — дофаминовый вектор (стиль — в ill.js).
   Ключ = эмодзи персонажа в игре (поле e / ava). Ключ глобальный:
   рисунок заменяет этот эмодзи везде, где он выводится через Vibe.pic.
   Кадр: голова и плечи 0..100, силуэт читается в 32 px.
   ============================================================ */
(function () {
  if (!window.Vibe || !Vibe.ill) return;
  const I = "#1b1430";
  // Нос-капля
  const nose = (x, y, s = 1, f = "none") =>
    `<path d="M${x} ${y} C${x - 4 * s} ${y + 7 * s} ${x - 4.5 * s} ${y + 11 * s} ${x + 0.5 * s} ${y + 11 * s} C${x + 3 * s} ${y + 11 * s} ${x + 3.5 * s} ${y + 9 * s} ${x + 2.5 * s} ${y + 7.5 * s}" fill="${f}" stroke="${I}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  // Глаз-точка с бликом
  const dot = (x, y, r = 3.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${I}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.33}" fill="#fff"/>`;
  // Глаза-дуги «^^» (счастливо прищурен)
  const happy = (x, y, w = 5) => `<path d="M${x - w} ${y + 2} Q${x} ${y - 5} ${x + w} ${y + 2}" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/>`;
  const line = (d, w = 2.5, c = I) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // Плечи-трапеция
  const SH = "M14 100 C14 82 28 73 50 73 C72 73 86 82 86 100 Z";

  const PEOPLE = {
    /* ---------- Мама, Галина Петровна: химия цвета хны, очки на цепочке, брошь-цветок, пакет с пакетами ---------- */
    "👩": (P) => `
      ${P.dots("p-galina", SH, "#fff", P.mint, 11, 2.6)}
      <path d="M40 73 L50 86 L60 73" fill="#fff" ${P.s}/>
      <g>${[[27, 46], [26, 32], [34, 20], [46, 13], [59, 14], [70, 22], [75, 35], [74, 49]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${P.red}" ${P.S}/>`).join("")}</g>
      <ellipse cx="50" cy="50" rx="23" ry="26" fill="${P.skin}" ${P.S}/>
      <g>${[[36, 27], [47, 23], [58, 25], [67, 31]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${P.red}" ${P.s}/>`).join("")}</g>
      ${line("M33 41 Q39 37 45 40 M55 40 Q61 37 67 41", 3)}
      <circle cx="40" cy="49" r="8" fill="${P.sky}" fill-opacity=".35" ${P.s}/><circle cx="60" cy="49" r="8" fill="${P.sky}" fill-opacity=".35" ${P.s}/>
      ${line("M48 48 Q50 46 52 48")}
      ${dot(40, 50, 2.6)}${dot(60, 50, 2.6)}
      <path d="M32 50 C27 58 27 66 30 74" fill="none" stroke="${P.yellow}" stroke-width="2.2" stroke-dasharray="0.5 3.2" stroke-linecap="round"/>
      <path d="M68 50 C73 58 73 66 70 74" fill="none" stroke="${P.yellow}" stroke-width="2.2" stroke-dasharray="0.5 3.2" stroke-linecap="round"/>
      ${nose(50, 51, 0.9, P.skin)}
      <path d="M42 66 Q50 72 58 66" fill="${P.red}" ${P.s}/>
      ${P.cheeks(50, 61, 32)}
      <g>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="${30 + 5 * Math.cos(a * Math.PI / 180)}" cy="${86 + 5 * Math.sin(a * Math.PI / 180)}" rx="4" ry="4" fill="${P.pink}" ${P.s}/>`).join("")}<circle cx="30" cy="86" r="3" fill="${P.yellow}" ${P.s}/></g>
      <path d="M72 82 L94 82 L92 100 L74 100 Z" fill="#fff" ${P.s}/>
      <path d="M78 82 Q83 74 88 82" fill="none" ${P.s}/>
      <path d="M76 84 Q80 76 86 78 Q90 80 88 86" fill="${P.pink}" ${P.s}/>
      <path d="M80 80 Q84 75 87 81" fill="none" stroke="${I}" stroke-width="2"/>`,

    /* ---------- Папа, Виктор Палыч: кепка, клетчатая рубаха, очки, перемотанные синей изолентой ---------- */
    "👨": (P) => `
      ${P.checker("p-viktor", SH, P.red, "#fff", 9)}
      <path d="M40 73 L50 84 L60 73" fill="${P.red}" ${P.s}/>
      <path d="M27 40 C25 64 34 80 50 80 C66 80 75 64 73 40 Z" fill="${P.skin2}" ${P.S}/>
      <ellipse cx="25" cy="52" rx="5" ry="8" fill="${P.skin2}" ${P.s}/><ellipse cx="75" cy="52" rx="5" ry="8" fill="${P.skin2}" ${P.s}/>
      <path d="M26 44 C24 38 26 34 30 33 L30 48 Z M74 44 C76 38 74 34 70 33 L70 48 Z" fill="#fff" ${P.s}/>
      <path d="M22 34 C22 18 36 10 52 10 C68 10 80 18 78 34 Z" fill="${P.sky}" ${P.S}/>
      <path d="M50 10 L50 34 M36 13 L33 34 M64 13 L67 34" fill="none" stroke="${I}" stroke-width="2"/>
      <circle cx="50" cy="10" r="3.5" fill="${P.blue}" ${P.s}/>
      <path d="M20 34 C34 28 66 28 82 34 C84 38 82 40 78 40 C60 36 40 36 22 40 C18 40 17 37 20 34 Z" fill="${P.blue}" ${P.S}/>
      ${line("M33 44 L45 43 M55 43 L67 44", 4.5, "#fff")}${line("M33 44 L45 43 M55 43 L67 44", 1.5)}
      <rect x="31" y="46" width="15" height="12" rx="4" fill="#fff" fill-opacity=".5" ${P.s}/><rect x="54" y="46" width="15" height="12" rx="4" fill="#fff" fill-opacity=".5" ${P.s}/>
      <rect x="44.5" y="47.5" width="11" height="8" rx="1.5" fill="${P.blue}" ${P.s}/>
      ${line("M47 47.5 L46 55.5 M50 47.5 L49 55.5 M53 47.5 L52 55.5", 1.2, "#fff")}
      ${dot(38.5, 52, 2.6)}${dot(61.5, 52, 2.6)}
      ${nose(50, 56, 1, P.skin2)}
      ${line("M41 71 L57 70", 3)}
      <path d="M57 70 Q60 69 60 67" fill="none" ${P.s}/>
      ${P.cheeks(50, 64, 34, P.red)}
      <path d="M64 18 L86 6" stroke="${I}" stroke-width="7" stroke-linecap="round"/><path d="M64 18 L86 6" stroke="${P.yellow}" stroke-width="3.5" stroke-linecap="round"/>`,

    /* ---------- Лёха «Бизнес»: кепка козырьком назад, борода, лямки термосумки, голосовое на 4 минуты ---------- */
    "🧔": (P) => `
      <path d="M14 100 C14 82 28 73 50 73 C72 73 86 82 86 100 Z" fill="${P.lime}" ${P.S}/>
      <path d="M26 100 L32 76 M74 100 L68 76" stroke="${I}" stroke-width="9" stroke-linecap="round"/><path d="M26 100 L32 76 M74 100 L68 76" stroke="${P.green}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="48" cy="44" rx="24" ry="26" fill="${P.skin}" ${P.S}/>
      <ellipse cx="24" cy="46" rx="4.5" ry="7" fill="${P.skin}" ${P.s}/>
      <path d="M24 26 C26 12 40 8 50 9 C62 9 72 16 72 28 C60 24 36 24 24 26 Z" fill="${P.orange}" ${P.S}/>
      <path d="M24 26 C16 26 8 30 6 34 C14 36 22 33 27 30 Z" fill="${P.yellow}" ${P.S}/>
      <circle cx="49" cy="10" r="3" fill="${P.yellow}" ${P.s}/>
      <path d="M24 44 C22 60 26 76 40 82 C46 86 52 86 58 82 C70 76 74 62 72 44 C66 52 60 56 48 56 C36 56 30 52 24 44 Z" fill="${P.brown}" ${P.S}/>
      <path d="M38 64 Q48 72 58 64 Q48 66 38 64 Z" fill="#fff" ${P.s}/>
      ${line("M34 34 Q39 30 44 33 M52 33 Q57 30 62 34", 3.5)}
      ${P.eyes(48, 41, 14, 5)}
      ${nose(48, 44, 0.9, P.skin)}
      ${P.cheeks(48, 52, 34)}
      <path d="M64 6 L96 6 C98 6 99 7 99 9 L99 22 C99 24 98 25 96 25 L74 25 L67 31 L68 25 L64 25 C62 25 61 24 61 22 L61 9 C61 7 62 6 64 6 Z" fill="#fff" ${P.S}/>
      <path d="M68 12 L72 16 L68 20 Z" fill="${P.orange}" ${P.s}/>
      ${line("M77 13 V19 M81 10 V22 M85 12 V20 M89 9 V22 M93 13 V19", 2.6)}`,

    /* ---------- Катя Огонёк: розовое каре, подкаст-наушники с микрофоном, «честный» прищур ---------- */
    "👩‍🎤": (P) => `
      ${P.stripes("p-katya", SH, P.ink, P.yellow, 7, false)}
      <path d="M50 8 C28 8 16 22 16 44 C16 58 18 68 22 76 L40 76 L40 56 L60 56 L60 76 L78 76 C82 68 84 58 84 44 C84 22 72 8 50 8 Z" fill="${P.pink}" ${P.S}/>
      <ellipse cx="50" cy="48" rx="20" ry="23" fill="${P.skin3}" ${P.S}/>
      <path d="M29 42 C28 26 38 18 50 18 C62 18 72 26 71 42 C62 40 58 34 56 30 C50 38 38 40 29 42 Z" fill="${P.pink}" ${P.S}/>
      <path d="M17 42 C16 4 84 4 83 42" fill="none" stroke="${I}" stroke-width="7" stroke-linecap="round"/><path d="M17 42 C16 4 84 4 83 42" fill="none" stroke="${P.violet}" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="10" y="36" width="13" height="20" rx="6" fill="${P.violet}" ${P.S}/>
      <rect x="77" y="36" width="13" height="20" rx="6" fill="${P.violet}" ${P.S}/>
      <path d="M83.5 40 C88 45 86 49 83.5 52 C80.5 49 80.5 44 83.5 40 Z" fill="${P.orange}" stroke="${I}" stroke-width="1.6"/>
      <path d="M16 55 C16 68 26 70 36 66" fill="none" stroke="${I}" stroke-width="3"/>
      <circle cx="38" cy="65" r="4.5" fill="${P.lime}" ${P.s}/>
      <ellipse cx="41" cy="48" rx="5.5" ry="4.5" fill="#fff" ${P.s}/><ellipse cx="59" cy="48" rx="5.5" ry="4.5" fill="#fff" ${P.s}/>
      <circle cx="43" cy="49" r="2.6" fill="${I}"/><circle cx="61" cy="49" r="2.6" fill="${I}"/>
      <path d="M35 46.5 Q41 42 47 46.5" fill="none" stroke="${I}" stroke-width="3.2" stroke-linecap="round"/><path d="M53 46.5 Q59 42 65 46.5" fill="none" stroke="${I}" stroke-width="3.2" stroke-linecap="round"/>
      ${line("M36 40 L45 41", 3)}${line("M54 38 Q59 34 65 37", 3)}
      ${nose(50, 49, 0.8, P.skin3)}
      <path d="M45 62 Q53 65 59 59" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/>
      ${P.cheeks(50, 57, 30, P.rose)}
      ${P.spark(92, 14, 5, P.orange)}`,

    /* ---------- Стас KPI-енко: прилизанный пробор, улыбка-продажник, значок «график вверх», галстук в полоску ---------- */
    "🧑‍💼": (P) => `
      <path d="${SH}" fill="${P.lilac}" ${P.S}/>
      <path d="M38 73 L50 100 L62 73 Z" fill="#fff" ${P.s}/>
      <path d="M38 73 L44 92 L36 86 L33 76 Z M62 73 L56 92 L64 86 L67 76 Z" fill="${P.violet}" ${P.s}/>
      ${P.stripes("p-stas", "M46 76 L54 76 L52 82 L56 96 L50 100 L44 96 L48 82 Z", P.red, P.yellow, 4.5, false)}
      <path d="M26 44 C26 26 36 16 50 16 C64 16 74 26 74 44 C74 64 64 76 50 76 C36 76 26 64 26 44 Z" fill="${P.skin}" ${P.S}/>
      <ellipse cx="26" cy="47" rx="4.5" ry="7" fill="${P.skin}" ${P.s}/><ellipse cx="74" cy="47" rx="4.5" ry="7" fill="${P.skin}" ${P.s}/>
      <path d="M25 42 C22 22 34 10 52 10 C68 10 78 20 75 40 C72 30 66 26 58 26 C50 26 46 30 40 28 C38 34 32 34 25 42 Z" fill="${P.ink}" ${P.S}/>
      ${line("M44 17 Q58 13 68 22", 2.5, "#fff")}${line("M40 28 L44 14", 2)}
      ${line("M34 40 Q39 35 45 38 M55 36 L66 34", 3.5)}
      ${dot(40, 45, 3)}${dot(60, 44, 3)}
      ${nose(50, 46, 1, P.skin)}
      <path d="M35 59 C40 61 60 61 65 59 C63 70 56 74 50 74 C44 74 37 70 35 59 Z" fill="#fff" ${P.S}/>
      ${line("M37 64 Q50 66 63 64", 1.8)}
      ${P.cheeks(50, 56, 36)}
      <rect x="60" y="80" width="16" height="13" rx="3" fill="#fff" ${P.s}/>
      ${line("M63 90 L67 86 L70 88 L74 83", 2.2, P.green)}<path d="M71 83 L74.5 82.5 L74 86" fill="none" stroke="${P.green}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${P.spark(86, 22, 5)}`,

    /* ---------- Тимофей Нуков: енот в жилетке, бабочка, золотой зуб, ключи на брелоке ---------- */
    "🦝": (P) => `
      <path d="${SH}" fill="#fff" ${P.S}/>
      <path d="M14 100 C14 84 24 76 36 74 L48 100 Z M86 100 C86 84 76 76 64 74 L52 100 Z" fill="${P.yellow}" ${P.S}/>
      <circle cx="40" cy="88" r="2" fill="${I}"/><circle cx="42" cy="96" r="2" fill="${I}"/>
      <path d="M44 76 L50 81 L56 76 L56 86 L50 81 L44 86 Z" fill="${P.red}" ${P.s}/>
      <path d="M22 30 L18 6 L40 20 Z M78 30 L82 6 L60 20 Z" fill="#a9a4bd" ${P.S}/>
      <path d="M24 24 L22 13 L33 20 Z M76 24 L78 13 L67 20 Z" fill="${P.rose}"/>
      <path d="M14 52 C14 30 30 16 50 16 C70 16 86 30 86 52 L80 56 L84 62 C76 74 64 80 50 80 C36 80 24 74 16 62 L20 56 Z" fill="#a9a4bd" ${P.S}/>
      <path d="M20 46 C26 36 40 38 50 46 C60 38 74 36 80 46 C78 56 66 58 50 54 C34 58 22 56 20 46 Z" fill="${P.ink}"/>
      <path d="M34 26 L50 32 L66 26" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="37" cy="47" r="6.5" fill="#fff"/><circle cx="63" cy="47" r="6.5" fill="#fff"/>
      ${dot(38, 48, 3.2)}${dot(62, 48, 3.2)}
      <path d="M34 62 C34 54 42 52 50 52 C58 52 66 54 66 62 C66 72 58 76 50 76 C42 76 34 72 34 62 Z" fill="#fff" ${P.S}/>
      <path d="M44 56 C44 53 56 53 56 56 C56 59 52 61 50 61 C48 61 44 59 44 56 Z" fill="${P.ink}"/>
      <path d="M38 64 Q50 76 62 64 Z" fill="${P.ink}" ${P.s}/>
      <rect x="52" y="64" width="5" height="5" rx="1" fill="${P.yellow}" stroke="${I}" stroke-width="1.5"/>
      <rect x="44" y="64" width="5" height="4" rx="1" fill="#fff"/>
      <circle cx="66" cy="84" r="5.5" fill="${P.orange}" ${P.s}/><circle cx="66" cy="84" r="2" fill="${P.yellow}" ${P.s}/>
      <path d="M69 88 L77 98" stroke="${I}" stroke-width="6" stroke-linecap="round"/><path d="M69 88 L77 98" stroke="${P.orange}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M74 94 L78 91 M76.5 97 L80 94.5" stroke="${I}" stroke-width="2.5" stroke-linecap="round"/>
      ${P.spark(90, 30, 5)}${P.spark(10, 30, 4, P.lime)}`,

    /* ---------- Валера с пятого этажа: лысина-прожектор, усы-щётка, гарнитура диспетчера, шарф болельщика, чужая соль ---------- */
    "👨‍🦲": (P) => `
      <path d="M12 100 C12 82 28 74 50 74 C72 74 88 82 88 100 Z" fill="#fff" ${P.S}/>
      <path d="M34 75 C38 86 62 86 66 75" fill="${P.skin}" ${P.s}/>
      ${P.stripes("p-valera", "M14 92 C24 80 36 82 50 86 C64 82 76 80 86 92 L84 100 C72 92 62 92 50 96 C38 92 28 92 16 100 Z", P.red, "#fff", 6)}
      <path d="M22 44 C22 22 34 12 50 12 C66 12 78 22 78 44 C80 60 72 80 50 80 C28 80 20 60 22 44 Z" fill="${P.skin}" ${P.S}/>
      <ellipse cx="21" cy="50" rx="5" ry="8" fill="${P.skin}" ${P.s}/><ellipse cx="79" cy="50" rx="5" ry="8" fill="${P.skin}" ${P.s}/>
      <path d="M36 20 Q46 15 56 18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="62" cy="20" r="2.2" fill="#fff"/>
      <path d="M17 44 C16 20 84 20 83 44" fill="none" stroke="${I}" stroke-width="7"/><path d="M17 44 C16 20 84 20 83 44" fill="none" stroke="${P.blue}" stroke-width="3.5"/>
      <rect x="12" y="40" width="10" height="16" rx="4" fill="${P.blue}" ${P.S}/>
      <path d="M17 56 C18 68 26 72 34 70" fill="none" stroke="${I}" stroke-width="3"/><circle cx="35" cy="70" r="3.5" fill="${P.ink}"/>
      <path d="M32 38 L46 40 M54 40 L68 38" stroke="${I}" stroke-width="5" stroke-linecap="round"/>
      <path d="M35 47 L45 47" ${P.S}/><path d="M55 47 L65 47" ${P.S}/>
      ${dot(40, 49.5, 2.8)}${dot(60, 49.5, 2.8)}
      <path d="M50 48 C45 56 45 61 50 61 C55 61 55 56 50 48 Z" fill="${P.red}" ${P.s}/>
      <path d="M32 66 C36 60 44 60 50 63 C56 60 64 60 68 66 C64 72 56 69 50 68 C44 69 36 72 32 66 Z" fill="${P.brown}" ${P.S}/>
      <g fill="${I}" opacity=".55">${[[30, 72], [35, 75], [41, 76], [59, 76], [65, 75], [70, 72], [46, 75], [54, 75]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1"/>`).join("")}</g>
      ${P.cheeks(50, 58, 38, P.red)}
      <path d="M80 80 L92 80 L94 98 L78 98 Z" fill="#fff" ${P.s}/><path d="M80 80 C80 74 92 74 92 80 Z" fill="${P.sky}" ${P.s}/>
      <circle cx="84" cy="77" r="0.9" fill="${I}"/><circle cx="88" cy="77" r="0.9" fill="${I}"/><circle cx="86" cy="75.5" r="0.9" fill="${I}"/>
      <text x="86" y="93" font-family="system-ui" font-weight="900" font-size="8" text-anchor="middle" fill="${I}">С</text>`,

    /* ---------- Макс Грепов: капюшон, очки с отсветом монитора, синяки 23:00, пицца ---------- */
    "🧑‍💻": (P) => `
      <path d="M12 100 C12 80 26 72 50 72 C74 72 88 80 88 100 Z" fill="${P.lime}" ${P.S}/>
      <path d="M44 76 L42 92 M56 76 L58 92" ${P.s}/><circle cx="42" cy="93" r="2.2" fill="#fff" ${P.s}/><circle cx="58" cy="93" r="2.2" fill="#fff" ${P.s}/>
      <path d="M50 8 C24 8 16 30 16 50 C16 68 26 80 50 80 C74 80 84 68 84 50 C84 30 76 8 50 8 Z" fill="${P.lime}" ${P.S}/>
      <ellipse cx="50" cy="50" rx="22" ry="25" fill="${P.skin2}" ${P.S}/>
      <path d="M28 44 C26 28 38 22 50 22 C62 22 74 28 72 42 L66 34 L62 40 L56 32 L50 40 L44 32 L38 40 L33 34 Z" fill="${P.ink}" ${P.S}/>
      <rect x="30" y="44" width="18" height="13" rx="3" fill="${P.sky}" ${P.s}/><rect x="52" y="44" width="18" height="13" rx="3" fill="${P.sky}" ${P.s}/>
      ${line("M48 49 L52 49")}
      ${line("M34 54 L40 47 M38 55 L44 48 M56 54 L62 47 M60 55 L66 48", 1.8, "#fff")}
      ${line("M32 61 Q39 64 46 61 M54 61 Q61 64 68 61", 2.2, P.violet)}
      ${nose(50, 54, 0.8, P.skin2)}
      ${line("M44 70 L56 70", 3)}
      <path d="M72 100 L84 70 C90 72 96 76 98 80 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M84 70 C90 72 96 76 98 80" fill="none" stroke="${P.orange}" stroke-width="5" stroke-linecap="round"/>
      <path d="M84 70 C90 72 96 76 98 80" fill="none" ${P.S}/>
      <circle cx="86" cy="84" r="3" fill="${P.red}" ${P.s}/><circle cx="80" cy="93" r="2.6" fill="${P.red}" ${P.s}/>
      <path d="M12 16 C8 10 14 4 20 6 C14 8 13 13 18 17 C15 18 13 18 12 16 Z" fill="${P.yellow}" ${P.s}/>`,

    /* ---------- Лиза Позитивова: хвост-фонтан, жест «это для тебя», профессиональная улыбка, росток-заколка ---------- */
    "💁‍♀️": (P) => `
      ${P.dots("p-liza", SH, P.pink, P.rose, 10, 2.6)}
      <path d="M50 12 C48 4 58 0 66 4 C80 10 86 24 82 40 C78 30 72 22 62 18 Z" fill="${P.brown}" ${P.S}/>
      <ellipse cx="50" cy="48" rx="22" ry="25" fill="${P.skin3}" ${P.S}/>
      <path d="M27 46 C24 24 36 14 50 14 C64 14 76 24 73 44 C68 32 60 28 50 28 C42 28 34 32 27 46 Z" fill="${P.brown}" ${P.S}/>
      <ellipse cx="51" cy="13" rx="5" ry="3.5" fill="${P.yellow}" ${P.s}/>
      <path d="M32 28 C28 20 32 16 36 18 C38 22 36 26 32 28 Z M36 26 C40 18 46 20 44 24 C42 27 38 27 36 26 Z" fill="${P.green}" ${P.s}/>
      ${happy(40, 47)}${happy(60, 47)}
      ${line("M34 40 Q40 37 46 40 M54 40 Q60 37 66 40", 2.6)}
      ${nose(50, 48, 0.85, P.skin3)}
      <path d="M38 60 Q50 74 62 60 Z" fill="#fff" ${P.S}/>
      ${P.cheeks(50, 56, 34, P.pink)}
      <path d="M70 100 L72 86 C70 80 72 76 76 76 L94 72 C98 72 98 77 94 78 L84 80 L96 80 C99 81 99 85 96 85 L82 86 C80 92 80 96 82 100 Z" fill="${P.skin3}" ${P.S}/>
      ${P.spark(90, 58, 6)}${P.spark(14, 22, 4, P.lime)}`,

    /* ---------- Соня Акварель: берет, длинные волосы, грусть, мазки краски на щеке, кисть за ухом ---------- */
    "👩‍🎨": (P) => `
      ${P.stripes("p-sonya", SH, P.blue, "#fff", 6.5, false)}
      <path d="M22 44 C20 22 34 14 50 14 C66 14 80 22 78 44 L82 84 L64 84 L64 50 L36 50 L36 84 L18 84 Z" fill="${P.ink}" ${P.S}/>
      <ellipse cx="50" cy="50" rx="20" ry="24" fill="${P.skin}" ${P.S}/>
      <path d="M30 42 C32 30 42 26 50 30 C58 26 68 30 70 42 C64 36 56 34 50 36 C44 34 36 36 30 42 Z" fill="${P.ink}"/>
      <path d="M50 30 L50 36" stroke="${P.skin}" stroke-width="2"/>
      <path d="M78 64 L94 34" stroke="${I}" stroke-width="6" stroke-linecap="round"/><path d="M78 64 L94 34" stroke="${P.yellow}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M92 38 C92 30 98 28 98 26 C99 32 98 36 94 40 Z" fill="${P.pink}" ${P.s}/>
      <path d="M16 26 C18 12 42 6 60 10 C76 14 84 22 78 30 C66 34 30 34 16 26 Z" fill="${P.red}" ${P.S}/>
      <path d="M50 9 L52 3" ${P.S}/>
      <ellipse cx="41" cy="51" rx="5" ry="4.2" fill="#fff" ${P.s}/><ellipse cx="59" cy="51" rx="5" ry="4.2" fill="#fff" ${P.s}/>
      <circle cx="41" cy="53" r="2.4" fill="${I}"/><circle cx="59" cy="53" r="2.4" fill="${I}"/>
      <path d="M36 51 C36 46 46 46 46 51 Z M54 51 C54 46 64 46 64 51 Z" fill="${P.skin}" ${P.s}/>
      ${line("M37 43 Q41 41 45 44 M55 44 Q59 41 63 43", 2.5)}
      ${nose(50, 52, 0.8, P.skin)}
      <path d="M45 66 Q50 63 55 66" fill="none" stroke="${I}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M61 59 C62 55 68 55 68 58 C68 61 64 62 61 59 Z" fill="${P.sky}" stroke="${I}" stroke-width="1.6"/>
      <circle cx="36" cy="59" r="3" fill="${P.pink}" opacity=".8"/>`,

    /* ---------- Гоша (Vibe Match): ковбойская шляпа с блесной, веснушки, бандана — рыбалка, дача, караоке ---------- */
    "🤠": (P) => `
      <path d="${SH}" fill="${P.sky}" ${P.S}/>
      ${P.dots("p-gosha", "M32 76 C40 86 60 86 68 76 L58 94 L50 86 L42 94 Z", "#fff", P.red, 7, 1.8)}
      <ellipse cx="50" cy="50" rx="23" ry="25" fill="${P.skin2}" ${P.S}/>
      <ellipse cx="27" cy="54" rx="4.5" ry="7" fill="${P.skin2}" ${P.s}/><ellipse cx="73" cy="54" rx="4.5" ry="7" fill="${P.skin2}" ${P.s}/>
      <path d="M32 32 C30 12 40 6 50 10 C60 6 70 12 68 32 Z" fill="${P.orange}" ${P.S}/>
      <path d="M33 26 C44 29 56 29 67 26 L68 32 C56 35 44 35 32 32 Z" fill="${P.ink}"/>
      <path d="M6 30 C10 38 30 36 50 36 C70 36 90 38 94 30 C96 26 90 24 86 28 C76 32 64 32 50 32 C36 32 24 32 14 28 C10 24 4 26 6 30 Z" fill="${P.orange}" ${P.S}/>
      <path d="M70 22 L74 14" ${P.s}/><path d="M74 14 C80 12 82 18 78 20 C75 21 73 18 74 14 Z" fill="${P.lime}" ${P.s}/><path d="M78 20 C80 24 77 26 75 24" fill="none" stroke="${I}" stroke-width="2"/>
      ${dot(40, 47, 3.2)}${dot(60, 47, 3.2)}
      ${line("M35 41 L45 40 M55 40 L65 41", 3)}
      <g fill="${P.brown}" opacity=".7">${[[34, 55], [38, 57], [67, 55], [63, 57]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1"/>`).join("")}</g>
      ${P.cheeks(50, 58, 36, P.red)}
      ${nose(50, 48, 0.95, P.skin2)}
      <path d="M36 62 Q50 70 64 62 Q60 72 50 72 Q40 72 36 62 Z" fill="#fff" ${P.S}/>
      ${line("M39 64.5 Q50 67 61 64.5", 1.6)}`,

    /* ---------- Вика: крылья феи, лиловые пучки, луна-заколка, таро-звёзды ---------- */
    "🧚": (P) => `
      <path d="M30 72 C10 70 2 52 8 42 C16 36 28 50 34 66 Z M70 72 C90 70 98 52 92 42 C84 36 72 50 66 66 Z" fill="${P.mint}" ${P.S}/>
      <path d="M30 80 C14 86 6 98 12 100 L32 100 Z M70 80 C86 86 94 98 88 100 L68 100 Z" fill="${P.sky}" ${P.S}/>
      ${P.dots("p-vika", SH, P.yellow, P.violet, 11, 2.6)}
      <circle cx="28" cy="24" r="11" fill="${P.lilac}" ${P.S}/><circle cx="72" cy="24" r="11" fill="${P.lilac}" ${P.S}/>
      <ellipse cx="50" cy="48" rx="22" ry="25" fill="${P.skin}" ${P.S}/>
      <path d="M27 48 C24 28 36 20 50 20 C64 20 76 28 73 48 C70 40 64 34 58 32 C52 38 40 38 34 36 C30 40 28 44 27 48 Z" fill="${P.lilac}" ${P.S}/>
      <path d="M66 16 C60 18 58 26 62 30 C58 30 54 24 56 18 C58 14 62 13 66 16 Z" fill="${P.yellow}" ${P.s}/>
      ${P.eyes(50, 48, 18, 5.5)}
      ${line("M34 44 L36 41 M66 44 L64 41 M37 43 L38 40", 2)}
      ${nose(50, 51, 0.75, P.skin)}
      <path d="M44 62 Q50 67 56 62" fill="${P.pink}" ${P.s}/>
      ${P.cheeks(50, 58, 32)}
      ${P.spark(12, 14, 5, P.yellow)}${P.spark(90, 12, 4, P.pink)}`,

    /* ---------- Курьер Тимур: шлем с молнией, кудри наружу, очки на шлеме, светоотражайка ---------- */
    "🧑🏻‍🦱": (P) => `
      <path d="${SH}" fill="${P.green}" ${P.S}/>
      <path d="M18 88 C34 84 66 84 82 88 L84 94 C66 90 34 90 16 94 Z" fill="${P.lime}" ${P.s}/>
      <path d="M44 74 L50 80 L56 74" fill="none" ${P.s}/>
      <g>${[[24, 44], [22, 56], [26, 66], [76, 44], [78, 56], [74, 66]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${P.ink}" ${P.s}/>`).join("")}</g>
      <ellipse cx="50" cy="52" rx="22" ry="24" fill="#fde0cb" ${P.S}/>
      <path d="M22 44 C20 20 34 10 50 10 C66 10 80 20 78 44 C70 38 60 36 50 36 C40 36 30 38 22 44 Z" fill="${P.red}" ${P.S}/>
      <path d="M52 12 L44 26 L52 26 L46 38 L60 22 L52 22 L58 12 Z" fill="${P.yellow}" ${P.s}/>
      <rect x="28" y="28" width="18" height="9" rx="4.5" fill="${P.ink}" ${P.s}/><rect x="54" y="28" width="18" height="9" rx="4.5" fill="${P.ink}" ${P.s}/>
      ${line("M31 31 L35 31 M57 31 L61 31", 1.8, "#fff")}
      ${line("M35 45 Q40 42 45 45 M55 43 L65 44", 3)}
      ${dot(40, 51, 3)}<path d="M55 51 L65 51" ${P.S}/>
      ${nose(50, 52, 0.85, "#fde0cb")}
      <path d="M42 65 Q52 70 60 62" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/>
      ${P.cheeks(50, 60, 32, P.red)}
      ${P.spark(88, 22, 5)}`,

    /* ---------- Бублик: рыжий корги, язык набок, жетон-бублик на ошейнике. «Не попрошайничает — присутствует» ---------- */
    "🐕": (P) => `
      <path d="M16 100 C14 80 30 70 50 70 C70 70 86 80 84 100 Z" fill="${P.orange}" ${P.S}/>
      <path d="M38 72 C40 86 60 86 62 72 C58 92 54 100 50 100 C46 100 42 92 38 72 Z" fill="#fff" ${P.s}/>
      <path d="M22 40 L18 6 L44 24 Z M78 40 L82 6 L56 24 Z" fill="${P.orange}" ${P.S}/>
      <path d="M24 30 L23 14 L36 24 Z M76 30 L77 14 L64 24 Z" fill="${P.rose}"/>
      <path d="M18 50 C18 30 32 18 50 18 C68 18 82 30 82 50 C82 66 70 76 50 76 C30 76 18 66 18 50 Z" fill="${P.orange}" ${P.S}/>
      <path d="M50 24 C46 34 46 44 40 52 C34 60 34 72 50 74 C66 72 66 60 60 52 C54 44 54 34 50 24 Z" fill="#fff"/>
      <path d="M38 47 Q42 44 46 47" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/><path d="M54 47 Q58 44 62 47" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/>
      ${line("M36 40 L44 41 M56 41 L64 40", 2.5)}
      <path d="M44 55 C44 51 56 51 56 55 C56 58 52 60 50 60 C48 60 44 58 44 55 Z" fill="${P.ink}"/>
      ${line("M50 60 L50 64 M42 64 Q46 68 50 64 Q54 68 58 64", 2.6)}
      <path d="M53 66 C54 74 60 74 60 67" fill="${P.pink}" ${P.s}/>
      ${P.cheeks(50, 58, 36, P.pink)}
      <path d="M28 76 C40 82 60 82 72 76" fill="none" stroke="${I}" stroke-width="8" stroke-linecap="round"/><path d="M28 76 C40 82 60 82 72 76" fill="none" stroke="${P.blue}" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="50" cy="89" r="8" fill="#e8a255" ${P.S}/><circle cx="50" cy="89" r="3" fill="${P.orange}" ${P.s}/>
      <g fill="#fff">${[[45, 85], [55, 85], [56, 92], [44, 93], [50, 95]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9"/>`).join("")}</g>`,

    /* ---------- Бабушка Зинаида: платок в горошек, очки, черничное варенье (только за наличные) ---------- */
    "👵": (P) => `
      <path d="${SH}" fill="${P.violet}" ${P.S}/>
      <path d="M30 78 C40 84 60 84 70 78" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 4" stroke-linecap="round"/>
      ${P.dots("p-zina", "M50 8 C26 8 16 28 16 50 C16 66 22 78 30 82 L36 70 L64 70 L70 82 C78 78 84 66 84 50 C84 28 74 8 50 8 Z", "#fff", P.red, 11, 2.8)}
      <path d="M40 76 L50 72 L60 76 L56 86 L50 80 L44 86 Z" fill="${P.red}" ${P.s}/>
      <ellipse cx="50" cy="50" rx="21" ry="23" fill="${P.skin}" ${P.S}/>
      <path d="M30 40 C30 28 70 28 70 40 C62 34 38 34 30 40 Z" fill="#fff" ${P.s}/>
      <circle cx="41" cy="48" r="7" fill="#fff" fill-opacity=".45" ${P.s}/><circle cx="59" cy="48" r="7" fill="#fff" fill-opacity=".45" ${P.s}/>
      ${line("M48 47 Q50 45 52 47")}
      ${happy(41, 49, 3.5)}${happy(59, 49, 3.5)}
      ${line("M31 52 L34 53 M31 56 L34 56 M69 52 L66 53 M69 56 L66 56", 1.6)}
      ${nose(50, 50, 0.95, P.skin)}
      <path d="M42 64 Q50 70 58 64" fill="none" stroke="${I}" stroke-width="2.8" stroke-linecap="round"/>
      ${P.cheeks(50, 60, 30)}
      <rect x="72" y="80" width="20" height="19" rx="4" fill="${P.violet}" ${P.S}/>
      <rect x="70" y="74" width="24" height="7" rx="2" fill="${P.red}" ${P.s}/>
      ${P.dots("p-zina2", "M70 74 L94 74 L94 81 L70 81 Z", "#fff", P.red, 5, 1.2)}
      <rect x="75" y="85" width="14" height="8" rx="1.5" fill="#fff" ${P.s}/>
      <circle cx="80" cy="89" r="1.6" fill="${P.violet}"/><circle cx="84" cy="89" r="1.6" fill="${P.violet}"/>`,

    /* ---------- Виталий «Успешный успех»: пучок, гарнитура со сцены, блаженная улыбка, намасте ---------- */
    "🧘‍♂️": (P) => `
      <path d="${SH}" fill="${P.yellow}" ${P.S}/>
      <path d="M40 74 C44 80 56 80 60 74" fill="none" ${P.s}/>
      <circle cx="50" cy="12" r="8" fill="${P.ink}" ${P.S}/>
      <path d="M44 16 Q50 20 56 16" fill="none" stroke="${P.pink}" stroke-width="3"/>
      <ellipse cx="50" cy="46" rx="22" ry="25" fill="${P.skin2}" ${P.S}/>
      <path d="M28 40 C28 22 72 22 72 40 C66 30 34 30 28 40 Z" fill="${P.ink}" ${P.s}/>
      <path d="M30 52 C30 66 40 72 50 72 C60 72 70 66 70 52 C66 60 58 60 50 60 C42 60 34 60 30 52 Z" fill="${P.ink}" ${P.s}/>
      ${happy(41, 45, 5)}${happy(59, 45, 5)}
      <circle cx="50" cy="34" r="2.6" fill="${P.red}"/>
      ${nose(50, 46, 0.9, P.skin2)}
      <path d="M38 62 Q50 72 62 62 Z" fill="#fff" ${P.S}/>
      <path d="M28 48 C30 60 36 64 44 64" fill="none" stroke="${I}" stroke-width="2.4"/><circle cx="44" cy="64" r="2.6" fill="${P.ink}"/>
      <path d="M50 76 C44 80 38 90 38 100 L62 100 C62 90 56 80 50 76 Z" fill="${P.skin2}" ${P.S}/>
      ${line("M50 78 L50 100 M41 92 L46 90 M59 92 L54 90")}
      ${P.spark(14, 30, 6)}${P.spark(86, 30, 6)}${P.spark(88, 60, 4, P.lime)}`,

    /* ---------- Фитоняша Кира: пучок и повязка, гантель на плече, подмигивание, капля пота ---------- */
    "🏋️‍♀️": (P) => `
      <path d="${SH}" fill="${P.pink}" ${P.S}/>
      <path d="M36 73 C40 84 60 84 64 73" fill="${P.skin2}" ${P.s}/>
      <path d="M72 100 L74 84 C76 78 82 76 86 78 L90 84 L84 100 Z" fill="${P.skin2}" ${P.S}/>
      <path d="M64 70 L96 70" stroke="${I}" stroke-width="5" stroke-linecap="round"/>
      <rect x="60" y="60" width="9" height="20" rx="3" fill="${P.ink}"/><rect x="91" y="60" width="9" height="20" rx="3" fill="${P.ink}"/>
      <rect x="62" y="62" width="5" height="16" rx="2" fill="${P.lime}"/><rect x="93" y="62" width="5" height="16" rx="2" fill="${P.lime}"/>
      <circle cx="50" cy="14" r="10" fill="${P.brown}" ${P.S}/>
      <ellipse cx="50" cy="48" rx="21" ry="24" fill="${P.skin2}" ${P.S}/>
      <path d="M29 44 C26 26 38 20 50 20 C62 20 74 26 71 44 C66 36 58 32 50 32 C42 32 34 36 29 44 Z" fill="${P.brown}" ${P.S}/>
      <path d="M28 36 C40 30 60 30 72 36 L72 42 C60 36 40 36 28 42 Z" fill="${P.lime}" ${P.S}/>
      ${dot(41, 49, 3)}
      <path d="M54 50 Q59 46 64 50" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/>
      ${line("M36 44 L45 44 M55 44 L64 43", 2.6)}
      ${nose(50, 50, 0.8, P.skin2)}
      <path d="M41 61 Q51 69 59 60 Q52 63 41 61 Z" fill="#fff" ${P.s}/>
      ${P.cheeks(50, 58, 32)}
      <path d="M24 46 C20 52 20 56 24 56 C28 56 28 52 24 46 Z" fill="${P.sky}" ${P.s}/>`,

    /* ---------- Папа Стас (блогер): волосы дыбом, мешки под глазами, бутылочка, пятно на плече ---------- */
    "👨‍🍼": (P) => `
      <path d="${SH}" fill="${P.sky}" ${P.S}/>
      <path d="M22 80 C26 76 32 78 32 82 C34 86 28 90 24 87 C20 86 20 82 22 80 Z" fill="${P.cream}" ${P.s}/>
      <ellipse cx="50" cy="48" rx="22" ry="25" fill="${P.skin3}" ${P.S}/>
      <ellipse cx="28" cy="52" rx="4.5" ry="7" fill="${P.skin3}" ${P.s}/><ellipse cx="72" cy="52" rx="4.5" ry="7" fill="${P.skin3}" ${P.s}/>
      <path d="M28 40 L22 22 L34 30 L36 12 L44 26 L52 8 L56 26 L66 12 L66 30 L78 22 L72 40 C62 32 38 32 28 40 Z" fill="${P.ink}" ${P.S}/>
      <path d="M35 47 L45 47 M55 47 L65 47" ${P.S}/>
      ${dot(40, 50, 2.6)}${dot(60, 50, 2.6)}
      ${line("M34 55 Q40 59 46 55 M54 55 Q60 59 66 55 M35 59 Q40 62 45 59 M55 59 Q60 62 65 59", 2, P.violet)}
      ${nose(50, 50, 0.9, P.skin3)}
      <path d="M43 67 Q47 64 50 67 Q53 70 57 66" fill="none" stroke="${I}" stroke-width="2.6" stroke-linecap="round"/>
      <g fill="${I}" opacity=".5">${[[36, 68], [40, 72], [46, 74], [54, 74], [60, 72], [64, 68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1"/>`).join("")}</g>
      <rect x="74" y="66" width="16" height="30" rx="5" fill="#fff" ${P.S}/>
      <path d="M74 80 L90 80 L90 91 C90 94 88 96 85 96 L79 96 C76 96 74 94 74 91 Z" fill="${P.cream}"/>
      <rect x="74" y="66" width="16" height="30" rx="5" fill="none" ${P.S}/>
      <rect x="72" y="60" width="20" height="7" rx="2" fill="${P.pink}" ${P.s}/>
      <path d="M77 60 C77 50 87 50 87 60 Z" fill="${P.yellow}" ${P.s}/>
      ${line("M78 74 L82 74 M78 78 L82 78 M78 82 L82 82", 1.6)}
      ${P.spark(14, 18, 4, P.lilac)}`,

    /* ---------- Таксистка Алина (5,00): рыжие волны, очки на макушке, ароматизатор-сердце ---------- */
    "👩🏻‍🦰": (P) => `
      <path d="${SH}" fill="${P.violet}" ${P.S}/>
      <path d="M38 73 L50 86 L62 73" fill="${P.ink}" ${P.s}/>
      <path d="M24 44 C18 20 36 10 52 10 C70 10 84 22 76 46 C82 56 76 64 80 74 C72 80 66 76 64 70 L36 70 C34 76 28 80 20 74 C24 64 18 56 24 44 Z" fill="${P.orange}" ${P.S}/>
      <ellipse cx="50" cy="48" rx="20" ry="24" fill="#fde3d0" ${P.S}/>
      <path d="M30 42 C30 26 44 20 58 24 C66 26 70 32 70 42 C64 34 54 30 46 34 C40 36 34 38 30 42 Z" fill="${P.orange}" ${P.S}/>
      <rect x="31" y="22" width="16" height="9" rx="4" fill="${P.ink}" ${P.s}/><rect x="53" y="22" width="16" height="9" rx="4" fill="${P.ink}" ${P.s}/>
      ${line("M47 26 L53 26")}
      <path d="M36 48 Q41 44 46 48" fill="${P.ink}" ${P.s}/><path d="M54 48 Q59 44 64 48" fill="${P.ink}" ${P.s}/>
      ${dot(41, 50, 2.7)}${dot(59, 50, 2.7)}
      ${line("M35 46 L33 44 M65 46 L67 44", 2)}
      ${nose(50, 50, 0.8, "#fde3d0")}
      <path d="M43 62 Q50 67 57 62" fill="${P.red}" ${P.s}/>
      <g fill="${P.orange}">${[[37, 57], [40, 59], [63, 57], [60, 59]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`).join("")}</g>
      ${P.cheeks(50, 56, 30, P.pink)}
      ${line("M88 4 L88 18", 2)}
      <path d="M88 36 C78 30 78 18 84 18 C86 18 88 20 88 22 C88 20 90 18 92 18 C98 18 98 30 88 36 Z" fill="${P.lime}" ${P.s}/>
      ${P.spark(10, 50, 4, P.yellow)}`,

    /* ---------- Таксист Валерий: седой, кепка с шашечками, рот на молнии («молчит, если попросить») ---------- */
    "👨🏼‍🦳": (P) => `
      <path d="${SH}" fill="${P.blue}" ${P.S}/>
      <path d="M34 74 L50 90 L66 74 L60 72 L50 80 L40 72 Z" fill="${P.yellow}" ${P.s}/>
      <path d="M26 46 C26 30 36 22 50 22 C64 22 74 30 74 46 C74 66 64 78 50 78 C36 78 26 66 26 46 Z" fill="${P.skin}" ${P.S}/>
      <ellipse cx="26" cy="50" rx="4.5" ry="7" fill="${P.skin}" ${P.s}/><ellipse cx="74" cy="50" rx="4.5" ry="7" fill="${P.skin}" ${P.s}/>
      <path d="M24 46 C18 40 20 30 26 30 L30 44 Z M76 46 C82 40 80 30 74 30 L70 44 Z" fill="#fff" ${P.S}/>
      <path d="M26 30 C26 14 74 14 74 30 Z" fill="${P.ink}" ${P.S}/>
      ${P.checker("p-valeriy", "M24 24 L76 24 L76 32 L24 32 Z", P.ink, P.yellow, 25)}
      <path d="M24 32 C40 36 74 34 88 38 C88 42 84 42 78 42 C62 40 40 40 26 38 Z" fill="${P.ink}" ${P.S}/>
      <path d="M32 46 C36 42 42 42 46 45 M54 45 C58 42 64 42 68 46" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      <path d="M32 46 C36 42 42 42 46 45 M54 45 C58 42 64 42 68 46" fill="none" stroke="${I}" stroke-width="1.4" stroke-linecap="round"/>
      ${dot(40, 51, 2.8)}${dot(60, 51, 2.8)}
      ${nose(50, 51, 1, P.skin)}
      <path d="M38 67 L62 67" stroke="${I}" stroke-width="6" stroke-linecap="round"/>
      <path d="M38 67 L62 67" stroke="${P.yellow}" stroke-width="2.2" stroke-dasharray="1.5 2"/>
      <rect x="60" y="63" width="5" height="8" rx="1.5" fill="${P.yellow}" ${P.s}/>
      ${P.cheeks(50, 60, 34, P.red)}`,
  };
  Vibe.ill.add(PEOPLE);
  // Лица людей — только в аватарках (эмодзи вроде 👩 значат в игре много чего).
  // Енот-Нуков, корги, бабушка и блогеры уместны и в постах — им можно везде.
  const ANYWHERE = ["🦝", "🐕", "👵", "🧘‍♂️", "🏋️‍♀️", "👨‍🍼"];
  Vibe.ill.avaOnly(Object.keys(PEOPLE).concat("👨‍🦲").filter((k) => !ANYWHERE.includes(k)));
})();