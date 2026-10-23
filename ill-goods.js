/* ============================================================
   Иллюстрации товаров: Vibe Market, Supermarket, зоотовары, аптека,
   блюда Vibe Eat. Стиль — см. шапку ill.js. Ключ = эмодзи товара.
   ============================================================ */
(function () {
  if (!window.Vibe || !Vibe.ill) return;
  const INK = "#1b1430";
  // Объединённый силуэт: сначала толстый контур всех фигур, потом заливка без контура
  const U = (sh, fill, w = 7) => `<g fill="${INK}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${sh}</g><g fill="${fill}">${sh}</g>`;
  // Толстая линия с контуром (ремешки, трубочки, кости)
  const L = (d, c, w = 5) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");

  Vibe.ill.add({
    /* ================= VIBE MARKET ================= */
    // Vibe Band — браслет, который знает, почему ты плохо спишь
    "📿": (P) => `
      <rect x="35" y="5" width="30" height="90" rx="12" fill="${P.lime}" ${P.S}/>
      <circle cx="50" cy="82" r="2.6" fill="${P.ink}"/><circle cx="50" cy="89" r="2.6" fill="${P.ink}"/><circle cx="50" cy="15" r="2.6" fill="${P.ink}"/>
      <rect x="18" y="27" width="64" height="46" rx="15" fill="${P.ink}" ${P.S}/>
      <rect x="24" y="33" width="52" height="34" rx="10" fill="${P.sky}"/>
      ${P.sleepy(50, 43, 20, 6)}
      <path d="M28 60 H38 L42 54 L47 65 L51 57 H72" fill="none" stroke="${P.red}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${P.spark(86, 16, 6, P.pink)}`,
    // Vibe Watch — знает всё и смотрит на тебя
    "⌚": (P) => `
      <path d="M34 4 H66 V30 H34 Z" fill="${P.violet}" ${P.S}/>
      <path d="M34 70 H66 V96 H34 Z" fill="${P.violet}" ${P.S}/>
      <path d="M40 80 H60 M40 87 H60" ${P.s}/>
      <rect x="80" y="40" width="8" height="14" rx="3" fill="${P.yellow}" ${P.s}/>
      <rect x="14" y="20" width="68" height="60" rx="18" fill="${P.pink}" ${P.S}/>
      <rect x="22" y="28" width="52" height="44" rx="11" fill="${P.ink}"/>
      ${P.eyes(48, 44, 20, 6.5)}
      <rect x="30" y="60" width="36" height="6" rx="3" fill="${P.lime}"/>
      <rect x="30" y="60" width="14" height="6" rx="3" fill="${P.mint}"/>
      ${P.spark(90, 14, 6, P.lime)}`,
    // Vibe Watch Ultra — часы-кубок с золотым безелем
    "🏆": (P) => `
      <rect x="38" y="2" width="24" height="16" fill="${P.violet}" ${P.S}/>
      ${L("M24 30 C6 28 6 56 26 56", P.yellow, 5)}
      ${L("M76 30 C94 28 94 56 74 56", P.yellow, 5)}
      <path d="M42 68 H58 L62 80 H38 Z" fill="${P.yellow}" ${P.S}/>
      <rect x="24" y="78" width="52" height="16" rx="4" fill="${P.ink}" ${P.S}/>
      <rect x="36" y="84" width="28" height="4" rx="2" fill="${P.yellow}"/>
      <circle cx="50" cy="42" r="29" fill="${P.yellow}" ${P.S}/>
      ${rep(12, (i) => `<path d="M50 15 V20" stroke="${P.ink}" stroke-width="2.5" stroke-linecap="round" transform="rotate(${i * 30} 50 42)"/>`)}
      <circle cx="50" cy="42" r="19" fill="${P.ink}" ${P.s}/>
      <path d="M50 42 V29 M50 42 L59 47" stroke="${P.lime}" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="50" cy="42" r="2.5" fill="${P.pink}"/>
      ${P.spark(14, 12, 7)}${P.spark(88, 76, 6, P.pink)}`,
    // Матрас «Облако сна» на ножках
    "🛏": (P) => `
      <path d="M26 78 V90 M74 78 V90" ${P.S}/>
      <ellipse cx="22" cy="91" rx="7" ry="3.5" fill="${P.pink}" ${P.s}/><ellipse cx="78" cy="91" rx="7" ry="3.5" fill="${P.pink}" ${P.s}/>
      ${P.stripes("g-mattress", "M12 64 H88 V74 C88 78 86 80 82 80 H18 C14 80 12 78 12 74 Z", P.sky, P.white, 7)}
      <path d="M18 66 C4 66 4 44 20 44 C18 28 38 22 46 34 C52 20 76 22 76 40 C92 38 96 66 82 66 Z" fill="${P.lilac}" ${P.S}/>
      ${P.sleepy(50, 50, 22, 7)}
      ${P.cheeks(50, 60, 40)}
      <path d="M74 8 H86 L74 20 H86 M62 18 H70 L62 26 H70" fill="none" ${P.S}/>`,
    // Блэкаут-шторы: луна спит до 11:00
    "🌚": (P) => `
      <rect x="16" y="14" width="68" height="78" fill="${P.ink}" ${P.S}/>
      <circle cx="50" cy="44" r="21" fill="${P.yellow}" ${P.S}/>
      <circle cx="58" cy="32" r="3" fill="${P.orange}"/><circle cx="40" cy="56" r="2.4" fill="${P.orange}"/>
      ${P.sleepy(50, 42, 18, 5.5)}
      <path d="M45 54 Q50 57 55 54" fill="none" stroke="${P.ink}" stroke-width="2.5" stroke-linecap="round"/>
      ${P.stripes("g-curtain-l", "M6 14 H30 C26 40 34 66 28 92 H6 Z", P.violet, P.lilac, 6)}
      ${P.stripes("g-curtain-r", "M94 14 H70 C74 40 66 66 72 92 H94 Z", P.violet, P.lilac, 6)}
      <path d="M78 22 l1.5 3 3 .5 -2.2 2 .6 3 -2.9 -1.5 -2.9 1.5 .6 -3 -2.2 -2 3 -.5 Z" fill="${P.white}"/>
      <rect x="6" y="60" width="20" height="7" rx="3" fill="${P.pink}" ${P.s}/><rect x="74" y="60" width="20" height="7" rx="3" fill="${P.pink}" ${P.s}/>
      <path d="M4 12 H96" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="5" cy="12" r="4.5" fill="${P.yellow}" ${P.s}/><circle cx="95" cy="12" r="4.5" fill="${P.yellow}" ${P.s}/>`,
    // Монстера «Не убивай меня» — горшок в ужасе
    "🪴": (P) => `
      <path d="M50 62 C38 44 38 18 52 6 C64 20 64 44 50 62 Z" fill="${P.green}" ${P.S}/>
      <path d="M48 62 C30 62 8 48 12 26 C30 20 46 36 48 62 Z" fill="${P.green}" ${P.S}/>
      <path d="M52 62 C56 36 74 14 90 22 C94 44 74 60 52 62 Z" fill="${P.green}" ${P.S}/>
      <path d="M50 58 V20 M47 60 L22 32 M53 60 L82 28 M20 44 L30 40 M28 30 L32 38 M80 42 L70 40 M74 24 L70 34" fill="none" stroke="${P.lime}" stroke-width="3" stroke-linecap="round"/>
      <path d="M28 66 H72 L66 93 H34 Z" fill="${P.pink}" ${P.S}/>
      ${P.checker("g-monstera", "M23 58 H77 V70 H23 Z", P.ink, P.white, 12)}
      ${P.eyes(50, 78, 16, 5)}
      <ellipse cx="50" cy="88" rx="3.5" ry="2.5" fill="${P.ink}"/>
      <path d="M80 62 C80 62 86 70 86 73 C86 76 84 78 81 78 C78 78 76 76 76 73 C76 70 80 62 80 62 Z" fill="${P.sky}" ${P.s}/>`,
    // Лампа-закат: закат даже в ноябре
    "🌅": (P) => `
      <path d="M50 74 V86" stroke="${P.ink}" stroke-width="9" stroke-linecap="round"/>
      <ellipse cx="50" cy="90" rx="24" ry="6" fill="${P.ink}"/>
      ${P.stripes("g-sunset", "M18 44 A32 32 0 1 0 82 44 A32 32 0 1 0 18 44 Z", P.pink, P.orange, 8, false)}
      <path d="M27 52 A23 23 0 0 1 73 52 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M50 18 V24 M30 26 L34 30 M70 26 L66 30" ${P.s}/>
      ${P.spark(88, 14, 7)}${P.spark(12, 80, 5, P.lilac)}`,
    // Худи «Главный вайб»
    "🧥": (P) => `
      <path d="M32 24 C32 6 68 6 68 24 Z" fill="${P.violet}" ${P.S}/>
      <path d="M30 24 L14 32 L6 70 L20 74 L27 52 L26 92 H74 L73 52 L80 74 L94 70 L86 32 L70 24 Z" fill="${P.pink}" ${P.S}/>
      <path d="M6 68 L20 72 L19 78 L5 74 Z M94 68 L80 72 L81 78 L95 74 Z" fill="${P.lime}" ${P.s}/>
      <path d="M26 84 H74 V92 H26 Z" fill="${P.lime}" ${P.s}/>
      <ellipse cx="50" cy="24" rx="15" ry="10" fill="${P.ink}"/>
      <path d="M43 32 L41 50 M57 32 L59 50" ${P.s}/>
      <circle cx="41" cy="52" r="3" fill="${P.yellow}" ${P.s}/><circle cx="59" cy="52" r="3" fill="${P.yellow}" ${P.s}/>
      <path d="M34 62 H66 L70 80 H30 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M42 66 L50 76 L58 66" fill="none" ${P.S}/>`,
    // Тапки-акулы: тапок, который кусается
    "🦈": (P) => `
      <path d="M40 42 L52 10 L64 42 Z" fill="${P.blue}" ${P.S}/>
      <path d="M6 74 C6 68 12 66 18 66 L84 66 C92 66 95 74 91 80 L14 82 C9 82 6 79 6 74 Z" fill="${P.white}" ${P.S}/>
      <path d="M8 68 C8 50 24 38 44 38 L62 38 C78 38 92 52 93 68 Z" fill="${P.blue}" ${P.S}/>
      <path d="M8 68 C12 56 26 52 44 60 L44 68 Z" fill="${P.ink}" ${P.s}/>
      <path d="M12 62 L16 66 L20 59 L24 66 L28 58 L32 66 L36 59 L40 66" fill="${P.white}" ${P.s}/>
      <ellipse cx="72" cy="46" rx="15" ry="5" fill="${P.ink}"/>
      <circle cx="30" cy="48" r="6" fill="${P.white}" ${P.s}/><circle cx="31.5" cy="49" r="3.2" fill="${P.ink}"/>
      <path d="M58 52 Q60 58 58 64 M64 52 Q66 58 64 64" fill="none" ${P.s}/>
      ${P.spark(88, 22, 6, P.yellow)}`,
    // Очки «Главный герой»
    "🕶": (P) => `
      <path d="M8 36 H46 L43 60 C41 70 34 74 26 74 C15 74 9 66 10 56 Z" fill="${P.ink}" ${P.S}/>
      <path d="M92 36 H54 L57 60 C59 70 66 74 74 74 C85 74 91 66 90 56 Z" fill="${P.ink}" ${P.S}/>
      <path d="M18 46 L28 40 M18 56 L36 44 M64 46 L74 40 M64 56 L82 44" stroke="${P.pink}" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="4" y="28" width="92" height="11" rx="5" fill="${P.yellow}" ${P.S}/>
      <path d="M44 44 Q50 39 56 44" fill="none" ${P.S}/>
      ${P.spark(84, 14, 8, P.lime)}${P.spark(16, 86, 6, P.pink)}${P.spark(70, 88, 4)}`,
    // Наушники «Тишина Про»
    "🎧": (P) => `
      ${L("M17 54 C17 10 83 10 83 54", P.yellow, 7)}
      ${P.dots("g-phones-l", "M18 46 h6 a10 10 0 0 1 10 10 v20 a10 10 0 0 1 -10 10 h-6 a10 10 0 0 1 -10 -10 v-20 a10 10 0 0 1 10 -10 z", P.white, P.pink, 9, 2.2)}
      ${P.dots("g-phones-r", "M76 46 h6 a10 10 0 0 1 10 10 v20 a10 10 0 0 1 -10 10 h-6 a10 10 0 0 1 -10 -10 v-20 a10 10 0 0 1 10 -10 z", P.white, P.pink, 9, 2.2)}
      <rect x="33" y="52" width="6" height="28" rx="3" fill="${P.ink}"/><rect x="61" y="52" width="6" height="28" rx="3" fill="${P.ink}"/>
      <path d="M44 62 H56 L46 74 H58" fill="none" ${P.S}/>
      ${P.spark(88, 16, 6, P.lime)}`,
    // Кольцевая лампа для сторис
    "💡": (P) => `
      <path d="M50 66 V84 M50 80 L30 95 M50 80 L70 95 M50 80 V95" fill="none" ${P.S}/>
      <circle cx="50" cy="38" r="28" fill="none" stroke="${P.ink}" stroke-width="20"/>
      <circle cx="50" cy="38" r="28" fill="none" stroke="${P.yellow}" stroke-width="12"/>
      ${P.spark(88, 12, 6, P.pink)}${P.spark(12, 14, 5)}
      <rect x="41" y="24" width="18" height="30" rx="4" fill="${P.sky}" ${P.S}/>
      <circle cx="50" cy="30" r="2.2" fill="${P.ink}"/>
      <path d="M45 46 Q50 50 55 46" fill="none" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/>`,
    // Скейт «Вайб-борд»
    "🛹": (P) => `
      <g transform="rotate(-22 50 50)">
        <rect x="20" y="52" width="14" height="7" fill="${P.ink}"/><rect x="66" y="52" width="14" height="7" fill="${P.ink}"/>
        <circle cx="27" cy="64" r="8" fill="${P.lime}" ${P.S}/><circle cx="73" cy="64" r="8" fill="${P.lime}" ${P.S}/>
        <circle cx="27" cy="64" r="2.5" fill="${P.ink}"/><circle cx="73" cy="64" r="2.5" fill="${P.ink}"/>
        ${P.checker("g-skate", "M6 44 C6 38 10 34 16 36 C24 38 76 38 84 36 C90 34 94 38 94 44 C94 50 90 54 84 52 C76 50 24 50 16 52 C10 54 6 50 6 44 Z", P.ink, P.pink, 10)}
      </g>
      <path d="M8 86 H30 M14 94 H40" ${P.S}/>
      ${P.spark(84, 14, 7)}`,
    // Колонка «Сосед, прости» — орёт и стесняется
    "🔊": (P) => `
      ${L("M78 36 Q86 50 78 64", P.pink, 4)}
      ${L("M86 26 Q100 50 86 74", P.lime, 4)}
      <rect x="12" y="8" width="58" height="86" rx="12" fill="${P.violet}" ${P.S}/>
      ${P.eyes(41, 30, 24, 8)}
      <circle cx="41" cy="66" r="20" fill="${P.lilac}" ${P.S}/>
      <circle cx="41" cy="66" r="13" fill="${P.ink}"/>
      <circle cx="41" cy="66" r="4" fill="${P.pink}"/>
      <path d="M4 40 L8 42 M3 52 H8 M4 64 L8 62" ${P.s}/>`,

    /* ================= SUPERMARKET ================= */
    // Бананы: «Жёлтые. Пока»
    "🍌": (P) => `
      <g transform="translate(16 -4)"><path d="M20 22 C14 52 32 84 76 88 C82 88 84 82 78 80 C48 74 36 52 34 24 Z" fill="${P.yellow}" ${P.S}/></g>
      <path d="M20 22 C14 52 30 84 74 88 C80 88 82 82 76 80 C46 74 34 52 32 24 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M20 24 L21 12 H32 L32 24" fill="${P.brown}" ${P.S}/>
      <circle cx="28" cy="52" r="2.6" fill="${P.brown}"/><circle cx="36" cy="66" r="3.2" fill="${P.brown}"/><circle cx="52" cy="76" r="2.4" fill="${P.brown}"/><circle cx="58" cy="54" r="2.6" fill="${P.brown}"/>
      <circle cx="78" cy="84" r="3" fill="${P.ink}"/>
      ${P.spark(80, 18, 7, P.pink)}`,
    // Клубника — пахнет летом и ценником
    "🍓": (P) => `
      ${P.dots("g-strawberry", "M50 92 C26 82 10 58 14 40 C18 26 36 24 50 30 C64 24 82 26 86 40 C90 58 74 82 50 92 Z", P.yellow, P.red, 12, 2.4)}
      <path d="M50 34 L32 26 L42 22 L36 10 L50 18 L64 10 L58 22 L68 26 Z" fill="${P.green}" ${P.S}/>
      <path d="M50 18 C50 12 52 8 56 5" fill="none" ${P.S}/>
      <ellipse cx="32" cy="46" rx="4" ry="6" fill="#fff" opacity=".6" transform="rotate(25 32 46)"/>
      ${P.spark(86, 14, 6, P.lime)}`,
    // Огурцы, хрустят на весь подъезд
    "🥒": (P) => `
      <g transform="rotate(-35 50 50)">
        ${P.dots("g-cucumber", "M8 50 C8 38 22 34 50 34 C78 34 92 38 92 50 C92 62 78 66 50 66 C22 66 8 62 8 50 Z", P.lime, P.green, 11, 2.2)}
        <ellipse cx="88" cy="50" rx="4" ry="9" fill="${P.lime}" ${P.s}/>
        ${P.eyes(48, 48, 18, 6)}
      </g>
      <path d="M12 18 L20 24 M8 30 L18 32 M24 8 L28 18" ${P.s}/>
      <path d="M78 76 L88 80 M74 86 L82 92" ${P.s}/>`,
    // Черри: маленькие, но амбициозные
    "🍅": (P) => `
      <circle cx="80" cy="68" r="13" fill="${P.red}" ${P.S}/>
      <circle cx="76" cy="32" r="12" fill="${P.red}" ${P.S}/>
      <path d="M80 56 L76 52 L84 52 Z M76 21 L72 17 L80 17 Z" fill="${P.green}" ${P.s}/>
      <circle cx="42" cy="58" r="30" fill="${P.red}" ${P.S}/>
      <path d="M42 30 L30 22 L38 22 L34 12 L42 20 L50 12 L46 22 L54 22 Z" fill="${P.green}" ${P.S}/>
      <path d="M42 20 C44 12 52 8 60 10 C68 12 72 16 74 20" fill="none" ${P.S}/>
      <ellipse cx="26" cy="48" rx="4" ry="7" fill="#fff" opacity=".55" transform="rotate(30 26 48)"/>
      ${P.eyes(44, 58, 16, 5)}
      <path d="M32 46 L40 49 M56 46 L48 49" ${P.S}/>
      <path d="M38 72 Q46 76 52 70" fill="none" ${P.s}/>`,
    // Брокколи — мини-деревья
    "🥦": (P) => `
      <path d="M38 92 L42 58 H58 L62 92 Z" fill="${P.lime}" ${P.S}/>
      <path d="M46 70 L40 60 M54 70 L60 60" ${P.s}/>
      ${U(`<circle cx="26" cy="46" r="16"/><circle cx="50" cy="30" r="21"/><circle cx="74" cy="46" r="16"/><circle cx="38" cy="58" r="12"/><circle cx="62" cy="58" r="12"/><circle cx="50" cy="50" r="14"/>`, P.green)}
      <circle cx="30" cy="40" r="3" fill="${P.lime}"/><circle cx="48" cy="22" r="3" fill="${P.lime}"/><circle cx="60" cy="34" r="2.6" fill="${P.lime}"/><circle cx="74" cy="44" r="3" fill="${P.lime}"/><circle cx="40" cy="54" r="2.6" fill="${P.lime}"/><circle cx="62" cy="56" r="2.6" fill="${P.lime}"/>
      ${P.spark(88, 14, 6, P.yellow)}`,
    // Молоко от коровы с личным брендом
    "🥛": (P) => `
      <rect x="38" y="5" width="24" height="10" fill="${P.sky}" ${P.S}/>
      <path d="M24 34 L38 14 H62 L76 34 Z" fill="${P.sky}" ${P.S}/>
      <rect x="24" y="34" width="52" height="58" rx="3" fill="${P.white}" ${P.S}/>
      <path d="M24 70 C30 64 36 66 38 72 C40 80 30 84 24 82 Z M76 40 C68 40 64 46 68 52 C72 56 76 54 76 54 Z M56 82 C52 76 60 72 66 76 C70 80 66 86 60 86 Z" fill="${P.ink}"/>
      ${P.eyes(50, 52, 18, 6)}
      ${P.cheeks(50, 62, 30)}
      ${P.spark(88, 14, 6, P.pink)}`,
    // Маасдам: дырки бесплатно
    "🧀": (P) => `
      <path d="M8 52 L92 42 V80 L8 88 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M8 52 L62 20 L92 42 Z" fill="${P.cream}" ${P.S}/>
      <ellipse cx="28" cy="68" rx="7" ry="8" fill="${P.orange}" ${P.s}/>
      <ellipse cx="56" cy="66" rx="9" ry="10" fill="${P.orange}" ${P.s}/>
      <ellipse cx="80" cy="58" rx="5" ry="6" fill="${P.orange}" ${P.s}/>
      <ellipse cx="78" cy="78" rx="4" ry="3" fill="${P.orange}" ${P.s}/>
      <ellipse cx="54" cy="34" rx="6" ry="3.5" fill="${P.orange}" ${P.s}/>
      <ellipse cx="36" cy="44" rx="4" ry="2.5" fill="${P.orange}" ${P.s}/>
      ${P.spark(88, 18, 7, P.pink)}`,
    // Яйца: курица была в ресурсе
    "🥚": (P) => `
      <ellipse cx="66" cy="46" rx="18" ry="24" fill="${P.cream}" ${P.S}/>
      <ellipse cx="40" cy="52" rx="24" ry="30" fill="${P.white}" ${P.S}/>
      ${P.sleepy(40, 50, 18, 6)}
      ${P.cheeks(40, 62, 30)}
      <path d="M8 72 H92 L86 94 H14 Z" fill="${P.lilac}" ${P.S}/>
      <path d="M8 72 C14 80 24 80 30 72 C36 80 46 80 52 72 C58 80 68 80 74 72 C80 80 88 80 92 72" fill="none" ${P.s}/>
      ${P.spark(88, 14, 6)}`,
    // Багет. Французский по духу — и в берете
    "🥖": (P) => `
      <g transform="rotate(-40 50 50)">
        <path d="M4 50 C4 40 16 37 50 37 C84 37 96 40 96 50 C96 60 84 63 50 63 C16 63 4 60 4 50 Z" fill="${P.orange}" ${P.S}/>
        <path d="M20 44 L28 56 M36 43 L44 57 M52 43 L60 57 M68 44 L76 56" stroke="${P.ink}" stroke-width="7" stroke-linecap="round"/>
        <path d="M20 44 L28 56 M36 43 L44 57 M52 43 L60 57 M68 44 L76 56" stroke="${P.cream}" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="86" cy="37" rx="14" ry="6" fill="${P.ink}"/>
        <path d="M86 31 V26" stroke="${P.ink}" stroke-width="3.5" stroke-linecap="round"/>
      </g>
      ${P.spark(18, 16, 6, P.pink)}`,
    // Круассан, сливочный, как голос в 8 утра
    "🥐": (P) => `
      <g transform="matrix(-1 0 0 1 100 0)">
        <path d="M20 50 L18 66 C14 74 8 84 4 80 C0 68 8 54 20 50 Z" fill="${P.orange}" ${P.S}/>
        <path d="M36 40 L38 72 C30 74 22 72 17 66 L20 48 C24 42 30 39 36 40 Z" fill="${P.yellow}" ${P.S}/>
      </g>
      <path d="M20 50 L18 66 C14 74 8 84 4 80 C0 68 8 54 20 50 Z" fill="${P.orange}" ${P.S}/>
      <path d="M36 40 L38 72 C30 74 22 72 17 66 L20 48 C24 42 30 39 36 40 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M34 40 C38 24 62 24 66 40 L63 72 C56 77 44 77 37 72 Z" fill="${P.orange}" ${P.S}/>
      ${P.sleepy(50, 50, 12, 4)}
      <path d="M46 62 Q50 65 54 62" fill="none" stroke="${P.ink}" stroke-width="2.5" stroke-linecap="round"/>
      ${P.spark(84, 18, 6, P.pink)}`,
    // Шоколад: 72% какао, 28% утешения
    "🍫": (P) => `
      <path d="M28 14 C28 10 30 8 34 8 H58 C58 14 64 20 72 18 V52 H28 Z" fill="${P.brown}" ${P.S}/>
      <path d="M50 10 V50 M28 30 H72" ${P.s}/>
      <path d="M22 52 L28 44 L34 52 L40 44 L46 52 L52 44 L58 52 L64 44 L70 52 L78 46 V92 H22 Z" fill="${P.red}" ${P.S}/>
      <rect x="22" y="62" width="56" height="16" fill="${P.yellow}" ${P.s}/>
      <path d="M50 76 C44 72 40 69 40 66 C40 63 44 62 46 64 L50 67 L54 64 C56 62 60 63 60 66 C60 69 56 72 50 76 Z" fill="${P.pink}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
      ${P.spark(86, 14, 6, P.lime)}`,
    // Попкорн для сериала, который ты уже видел
    "🍿": (P) => `
      ${U(`<circle cx="26" cy="36" r="11"/><circle cx="40" cy="26" r="12"/><circle cx="58" cy="24" r="12"/><circle cx="74" cy="34" r="11"/><circle cx="50" cy="38" r="12"/><circle cx="34" cy="42" r="9"/><circle cx="68" cy="42" r="9"/>`, P.cream)}
      <circle cx="40" cy="24" r="3" fill="${P.yellow}"/><circle cx="66" cy="30" r="3" fill="${P.yellow}"/><circle cx="26" cy="36" r="2.5" fill="${P.yellow}"/>
      ${P.stripes("g-popcorn", "M20 44 H80 L72 93 H28 Z", P.red, P.white, 9)}
      <rect x="34" y="58" width="32" height="18" rx="6" fill="${P.yellow}" ${P.s}/>
      ${P.sleepy(50, 64, 12, 4)}`,
    // Вайб-кола: газирует даже настроение
    "🥤": (P) => `
      ${L("M56 24 L64 4 H76", P.lime, 5)}
      <path d="M24 32 H76 L68 92 H32 Z" fill="${P.red}" ${P.S}/>
      <path d="M26 52 C40 46 56 60 74 52 L72 66 C56 74 42 60 28 68 Z" fill="${P.white}" ${P.s}/>
      <rect x="18" y="24" width="64" height="10" rx="5" fill="${P.white}" ${P.S}/>
      <circle cx="40" cy="80" r="3" fill="${P.white}" ${P.s}/><circle cx="56" cy="78" r="2.2" fill="${P.white}" ${P.s}/>
      <circle cx="86" cy="22" r="4" fill="${P.sky}" ${P.s}/><circle cx="90" cy="38" r="2.6" fill="${P.sky}" ${P.s}/>
      ${P.spark(12, 14, 6)}`,
    // Капля воды с глазами
    "💧": (P) => `
      <path d="M50 6 C50 6 82 44 82 63 C82 82 68 94 50 94 C32 94 18 82 18 63 C18 44 50 6 50 6 Z" fill="${P.sky}" ${P.S}/>
      <path d="M32 58 C32 48 38 40 42 36" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
      ${P.eyes(50, 62, 18, 6)}
      ${P.cheeks(50, 74, 32)}
      <path d="M45 78 Q50 82 55 78" fill="none" stroke="${P.ink}" stroke-width="2.5" stroke-linecap="round"/>
      ${P.spark(82, 18, 7)}`,
    // Туалетная бумага: трёхслойная, как наши условия
    "🧻": (P) => `
      <path d="M68 32 C78 32 84 34 84 40 V92 L80 88 L76 92 L72 88 L68 92 Z" fill="${P.white}" ${P.S}/>
      <path d="M68 58 H84 M68 76 H84" stroke="${P.ink}" stroke-width="2" stroke-dasharray="3 3"/>
      ${P.dots("g-paper", "M18 22 V80 A24 9 0 0 0 66 80 V22 Z", P.lilac, P.white, 12, 3)}
      <ellipse cx="42" cy="22" rx="24" ry="9" fill="${P.white}" ${P.S}/>
      <ellipse cx="42" cy="22" rx="8" ry="3.5" fill="${P.ink}"/>
      ${P.eyes(42, 50, 16, 5.5)}
      <path d="M36 64 Q42 68 48 64" fill="none" ${P.s}/>
      ${P.spark(86, 14, 6, P.pink)}`,
    // Губка: впитывает всё, кроме проблем
    "🧽": (P) => `
      <rect x="12" y="42" width="72" height="44" rx="10" fill="${P.yellow}" ${P.S}/>
      <rect x="12" y="28" width="72" height="20" rx="8" fill="${P.green}" ${P.S}/>
      <circle cx="22" cy="58" r="3.5" fill="${P.orange}"/><circle cx="74" cy="56" r="4" fill="${P.orange}"/><circle cx="70" cy="76" r="3" fill="${P.orange}"/><circle cx="24" cy="76" r="2.6" fill="${P.orange}"/>
      ${P.eyes(48, 60, 18, 6)}
      <path d="M40 74 Q48 80 56 74" fill="none" ${P.s}/>
      <circle cx="82" cy="18" r="7" fill="${P.sky}" ${P.s}/><circle cx="68" cy="12" r="4" fill="${P.sky}" ${P.s}/><circle cx="92" cy="32" r="3" fill="${P.sky}" ${P.s}/>`,

    /* ================= ЗООТОВАРЫ ================= */
    // Рыба (корм для котов / поке)
    "🐟": (P) => `
      <path d="M72 50 L94 28 L88 50 L94 72 Z" fill="${P.blue}" ${P.S}/>
      <path d="M40 30 L52 14 L60 30 Z" fill="${P.blue}" ${P.S}/>
      ${P.stripes("g-fish", "M8 50 C22 24 60 22 76 50 C60 78 22 76 8 50 Z", P.blue, P.sky, 10)}
      <circle cx="26" cy="46" r="7" fill="#fff" ${P.s}/><circle cx="27.5" cy="47" r="3.6" fill="${P.ink}"/>
      <path d="M10 54 Q16 56 18 52" fill="none" ${P.s}/>
      ${P.spark(84, 14, 6, P.yellow)}`,
    // Мясо на кости: «со вкусом ещё»
    "🍖": (P) => `
      ${L("M58 58 L82 82", P.cream, 10)}
      ${U(`<circle cx="88" cy="80" r="7.5"/><circle cx="80" cy="89" r="7.5"/>`, P.cream)}
      <path d="M64 64 C50 76 24 74 14 58 C4 42 12 18 34 12 C54 6 74 18 76 38 C78 50 72 58 64 64 Z" fill="${P.skin3}" ${P.S}/>
      <path d="M20 30 C30 18 48 14 62 22" fill="none" stroke="${P.cream}" stroke-width="4" stroke-linecap="round"/>
      <path d="M26 50 Q36 44 42 52 M50 36 Q58 40 60 50" fill="none" stroke="${P.orange}" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 40 L46 30 M28 54 L54 36 M40 62 L62 46" stroke="${P.ink}" stroke-width="3.5" stroke-linecap="round" opacity=".6"/>
      <ellipse cx="22" cy="40" rx="4" ry="7" fill="#fff" opacity=".35" transform="rotate(20 22 40)"/>
      ${P.spark(86, 14, 6)}`,
    // Подсолнух: половина уйдёт в щёки
    "🌻": (P) => `
      ${L("M50 60 C44 74 56 82 50 96", P.green, 5)}
      <path d="M52 80 C62 70 76 72 80 78 C72 86 60 86 52 80 Z" fill="${P.green}" ${P.s}/>
      ${rep(12, (i) => `<ellipse cx="50" cy="14" rx="7.5" ry="13" transform="rotate(${i * 30} 50 40)" fill="${i % 2 ? P.yellow : P.orange}" ${P.s}/>`)}
      ${P.dots("g-sunflower", "M32 40 A18 18 0 1 0 68 40 A18 18 0 1 0 32 40 Z", P.ink, P.brown, 7, 1.4)}
      ${P.eyes(50, 38, 13, 4.2)}
      ${P.cheeks(50, 47, 22, P.pink)}`,
    // Мышка заводная
    "🐭": (P) => `
      <path d="M16 70 C6 70 4 58 12 54" fill="none" ${P.S}/>
      <path d="M14 72 C14 50 36 38 58 42 C76 46 90 58 92 72 Z" fill="${P.lilac}" ${P.S}/>
      <circle cx="66" cy="40" r="11" fill="${P.lilac}" ${P.S}/><circle cx="66" cy="40" r="5.5" fill="${P.pink}"/>
      <circle cx="78" cy="58" r="3.2" fill="${P.ink}"/><circle cx="79" cy="57" r="1" fill="#fff"/>
      <circle cx="92" cy="70" r="4" fill="${P.pink}" ${P.s}/>
      <path d="M40 44 V32" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="33" cy="24" r="7" fill="${P.yellow}" ${P.S}/><circle cx="47" cy="24" r="7" fill="${P.yellow}" ${P.S}/>
      <circle cx="30" cy="78" r="6" fill="${P.ink}"/><circle cx="72" cy="78" r="6" fill="${P.ink}"/>
      <path d="M8 88 H92" ${P.S}/>`,
    // Мячик-пищалка: соседи в восторге
    "🎾": (P) => `
      <circle cx="48" cy="52" r="38" fill="${P.lime}" ${P.S}/>
      ${L("M14 36 C34 44 34 62 14 70", P.white, 4)}
      ${L("M82 36 C62 44 62 62 82 70", P.white, 4)}
      ${P.eyes(48, 46, 16, 5.5)}
      <ellipse cx="48" cy="64" rx="6" ry="7" fill="${P.ink}"/>
      <path d="M86 10 L82 20 M94 18 L86 24 M76 6 L76 16" ${P.S}/>`,
    // Когтеточка «Башня» — кот всё равно выберет диван
    "🏯": (P) => `
      ${P.stripes("g-tower-a", "M24 46 H36 V84 H24 Z", P.orange, P.cream, 5, false)}
      ${P.stripes("g-tower-b", "M64 30 H76 V84 H64 Z", P.orange, P.cream, 5, false)}
      <rect x="10" y="82" width="80" height="12" rx="4" fill="${P.pink}" ${P.S}/>
      <rect x="8" y="40" width="40" height="9" rx="4" fill="${P.pink}" ${P.S}/>
      <path d="M86 32 V52" ${P.s}/><circle cx="86" cy="57" r="6" fill="${P.yellow}" ${P.s}/>
      <path d="M54 24 C54 14 60 10 64 10 L66 3 L71 9 L76 3 L78 11 C82 13 84 18 84 24 Z" fill="${P.ink}" ${P.s}/>
      <circle cx="66" cy="18" r="2.4" fill="${P.lime}"/><circle cx="74" cy="18" r="2.4" fill="${P.lime}"/>
      <rect x="50" y="23" width="40" height="9" rx="4" fill="${P.pink}" ${P.S}/>`,
    // Косточка из жил
    "🦴": (P) => `
      <g transform="rotate(-35 50 50)">
        ${U(`<rect x="20" y="42" width="60" height="16" rx="4"/><circle cx="16" cy="41" r="10"/><circle cx="16" cy="59" r="10"/><circle cx="84" cy="41" r="10"/><circle cx="84" cy="59" r="10"/>`, P.cream)}
        <path d="M30 47 H58" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      </g>
      <path d="M12 12 L20 20 M22 6 L24 14 M6 24 L14 26" ${P.s}/>
      ${P.spark(84, 84, 6, P.mint)}`,
    // Кошачья мята — легально, кот на вайбе
    "🌿": (P) => `
      ${L("M50 94 C46 74 54 56 48 36", P.green, 4)}
      ${L("M48 70 C36 60 24 54 16 40", P.green, 3.5)}
      ${L("M52 64 C62 54 74 48 84 32", P.green, 3.5)}
      <path d="M48 38 C36 30 36 12 48 4 C60 12 60 30 48 38 Z" fill="${P.lime}" ${P.S}/>
      <path d="M16 42 C4 36 4 20 12 14 C24 18 26 34 16 42 Z" fill="${P.green}" ${P.S}/>
      <path d="M84 34 C94 26 96 12 88 6 C76 10 74 26 84 34 Z" fill="${P.green}" ${P.S}/>
      <path d="M46 76 C30 80 18 72 16 62 C28 56 42 62 46 76 Z" fill="${P.lime}" ${P.S}/>
      <path d="M54 72 C68 78 82 70 84 58 C72 54 58 60 54 72 Z" fill="${P.lime}" ${P.S}/>
      <path d="M48 34 V10 M16 38 L12 20 M84 30 L88 12" fill="none" stroke="${P.ink}" stroke-width="2" stroke-linecap="round" opacity=".5"/>
      ${P.spark(28, 88, 6, P.pink)}${P.spark(72, 88, 5)}${P.spark(70, 18, 4, P.pink)}`,
    // Таблетка (витамины / Плацебо Форте)
    "💊": (P) => `
      <g transform="rotate(-35 50 50)">
        <path d="M14 50 A18 18 0 0 1 32 32 H50 V68 H32 A18 18 0 0 1 14 50 Z" fill="${P.pink}" ${P.S}/>
        <path d="M50 32 H68 A18 18 0 0 1 68 68 H50 Z" fill="${P.white}" ${P.S}/>
        <path d="M24 42 Q28 38 34 38" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
        ${P.eyes(50, 48, 18, 5.5)}
      </g>
      ${P.spark(84, 16, 7)}${P.spark(14, 82, 5, P.lime)}`,
    // Шампунь без слёз (слёзы — твои)
    "🧴": (P) => `
      <path d="M36 10 H64 V18 H36 Z M64 12 H80 V17 H64 Z" fill="${P.white}" ${P.S}/>
      <rect x="42" y="18" width="16" height="10" fill="${P.pink}" ${P.S}/>
      <path d="M26 38 C26 31 31 28 38 28 H62 C69 28 74 31 74 38 V86 C74 90 71 93 67 93 H33 C29 93 26 90 26 86 Z" fill="${P.sky}" ${P.S}/>
      <rect x="32" y="44" width="36" height="36" rx="6" fill="${P.cream}" ${P.s}/>
      ${P.eyes(50, 56, 15, 5)}
      <path d="M43 64 C43 64 47 70 47 72 C47 74 45 75 43 75 C41 75 39 74 39 72 C39 70 43 64 43 64 Z" fill="${P.blue}" stroke="${P.ink}" stroke-width="2"/>
      <path d="M48 74 Q53 70 58 74" fill="none" ${P.s}/>
      ${P.spark(86, 30, 6, P.pink)}`,

    /* ================= АПТЕКА ================= */
    // Витамин D: солнце в баночке
    "☀": (P) => `
      ${rep(12, (i) => `<path d="M50 3 L57 20 H43 Z" transform="rotate(${i * 30} 50 50)" fill="${i % 2 ? P.orange : P.yellow}" ${P.s}/>`)}
      <circle cx="50" cy="50" r="27" fill="${P.yellow}" ${P.S}/>
      ${P.eyes(50, 46, 18, 6)}
      ${P.cheeks(50, 58, 32, P.orange)}
      <path d="M42 62 Q50 69 58 62" fill="none" ${P.S}/>`,
    // Пластырь с котиком
    "🩹": (P) => `
      <g transform="rotate(-35 50 50)">
        <rect x="4" y="32" width="92" height="36" rx="18" fill="${P.rose}" ${P.S}/>
        <circle cx="16" cy="44" r="2" fill="${P.ink}" opacity=".5"/><circle cx="16" cy="56" r="2" fill="${P.ink}" opacity=".5"/><circle cx="84" cy="44" r="2" fill="${P.ink}" opacity=".5"/><circle cx="84" cy="56" r="2" fill="${P.ink}" opacity=".5"/>
        <rect x="30" y="36" width="40" height="28" rx="5" fill="${P.cream}" ${P.s}/>
        <path d="M38 46 L40 38 L46 44 Z M62 46 L60 38 L54 44 Z" fill="${P.orange}" ${P.s}/>
        <ellipse cx="50" cy="52" rx="13" ry="9" fill="${P.orange}" ${P.s}/>
        <circle cx="45" cy="51" r="2" fill="${P.ink}"/><circle cx="55" cy="51" r="2" fill="${P.ink}"/>
        <path d="M48 55 L50 57 L52 55" fill="none" stroke="${P.ink}" stroke-width="1.8" stroke-linecap="round"/>
      </g>
      ${P.spark(84, 82, 6, P.pink)}`,
    // Термометр: температура и уровень драмы
    "🌡": (P) => `
      <rect x="38" y="6" width="24" height="70" rx="12" fill="${P.white}" ${P.S}/>
      <rect x="45" y="16" width="10" height="60" rx="5" fill="${P.red}"/>
      <path d="M62 24 H70 M62 36 H67 M62 48 H70 M62 60 H67" ${P.s}/>
      <circle cx="50" cy="78" r="16" fill="${P.red}" ${P.S}/>
      ${P.eyes(50, 76, 12, 4.2)}
      <ellipse cx="50" cy="86" rx="3" ry="2.4" fill="${P.ink}"/>
      <path d="M22 18 L28 26 M16 32 L26 34 M78 72 L86 68 M80 82 L90 84" ${P.s}/>
      ${P.spark(20, 66, 6, P.orange)}`,
    // Маски — чтобы не узнали
    "😷": (P) => `
      <path d="M18 44 C2 42 2 70 22 68 M82 44 C98 42 98 70 78 68" fill="none" ${P.S}/>
      <path d="M16 40 C34 30 66 30 84 40 L82 66 C68 82 32 82 18 66 Z" fill="${P.mint}" ${P.S}/>
      <path d="M22 50 C40 46 60 46 78 50 M22 60 C40 56 60 56 78 60" fill="none" stroke="${P.white}" stroke-width="3" stroke-linecap="round"/>
      <path d="M36 37 C44 35 56 35 64 37" fill="none" ${P.s}/>
      <ellipse cx="36" cy="18" rx="7" ry="8" fill="#fff" ${P.s}/><ellipse cx="64" cy="18" rx="7" ry="8" fill="#fff" ${P.s}/>
      <circle cx="32" cy="20" r="3.8" fill="${P.ink}"/><circle cx="60" cy="20" r="3.8" fill="${P.ink}"/>
      <path d="M28 8 L42 12 M58 12 L72 8" ${P.S}/>`,
    // Леденец: «малина и сожаление»
    "🍬": (P) => `
      <g transform="rotate(-20 50 50)">
        <path d="M30 50 L8 32 L14 50 L8 68 Z" fill="${P.pink}" ${P.S}/>
        <path d="M70 50 L92 32 L86 50 L92 68 Z" fill="${P.pink}" ${P.S}/>
        ${P.stripes("g-candy", "M26 50 C26 38 36 30 50 30 C64 30 74 38 74 50 C74 62 64 70 50 70 C36 70 26 62 26 50 Z", P.white, P.red, 8)}
        <path d="M36 42 Q40 37 46 36" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      </g>
      ${P.spark(84, 16, 6, P.yellow)}${P.spark(16, 86, 5, P.lilac)}`,

    /* ================= VIBE EAT ================= */
    // Двойной смэш
    "🍔": (P) => `
      <path d="M12 46 C12 18 88 18 88 46 Z" fill="${P.orange}" ${P.S}/>
      <path d="M30 28 l4 -2 M50 24 l4 1 M68 30 l3 2 M40 36 l3 -2 M60 37 l4 0" stroke="${P.cream}" stroke-width="3" stroke-linecap="round"/>
      ${P.eyes(50, 36, 16, 4.5)}
      <path d="M14 58 H86" stroke="${P.ink}" stroke-width="12" stroke-linecap="round"/><path d="M14 58 H86" stroke="${P.brown}" stroke-width="6" stroke-linecap="round"/>
      <path d="M10 46 H90 L86 54 L78 50 L72 60 L64 50 L42 52 L34 62 L28 52 L14 54 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M10 68 C16 62 22 74 30 66 C38 60 44 74 52 66 C60 60 66 74 74 66 C80 60 86 70 90 68 L90 70 H10 Z" fill="${P.lime}" ${P.s}/>
      <path d="M14 74 H86" stroke="${P.ink}" stroke-width="12" stroke-linecap="round"/><path d="M14 74 H86" stroke="${P.brown}" stroke-width="6" stroke-linecap="round"/>
      <path d="M12 80 H88 C88 88 84 92 76 92 H24 C16 92 12 88 12 80 Z" fill="${P.orange}" ${P.S}/>`,
    // Лист салата (бургер без булки / цезарь)
    "🥬": (P) => `
      <path d="M50 92 C24 92 8 76 10 56 C6 40 16 26 28 26 C30 12 46 8 54 16 C64 8 80 14 80 28 C92 34 94 52 88 62 C90 80 74 92 50 92 Z" fill="${P.green}" ${P.S}/>
      <path d="M50 88 C34 86 28 70 32 54 C34 40 42 34 50 38 C58 34 66 40 68 54 C72 70 66 86 50 88 Z" fill="${P.lime}" ${P.S}/>
      <path d="M50 86 V44 M50 72 L40 62 M50 64 L60 54 M50 80 L60 72" fill="none" ${P.s}/>
      <path d="M20 50 L28 58 M80 46 L74 56 M24 72 L32 74 M78 72 L70 74" ${P.s}/>
      ${P.spark(86, 12, 6, P.pink)}`,
    // Картошка фри, хрустит громче бывшего
    "🍟": (P) => `
      ${[[26, 18, -12], [36, 10, -4], [48, 6, 2], [60, 10, 8], [72, 16, 14], [42, 18, -2], [56, 20, 4]].map(([x, y, r]) => `<rect x="${x - 4.5}" y="${y}" width="9" height="46" rx="2" fill="${P.yellow}" ${P.s} transform="rotate(${r} ${x} ${y + 46})"/>`).join("")}
      <path d="M20 44 C34 56 66 56 80 44 L72 93 H28 Z" fill="${P.red}" ${P.S}/>
      ${P.eyes(50, 70, 16, 5)}
      <path d="M44 82 Q50 86 56 82" fill="none" ${P.s}/>
      <path d="M6 30 L14 34 M4 44 L12 44 M94 30 L86 34 M96 44 L88 44" ${P.s}/>`,
    // Лук: не плачь, это лук
    "🧅": (P) => `
      <path d="M50 20 C48 10 42 6 36 4 M50 20 C52 10 58 6 64 6" fill="none" stroke="${P.ink}" stroke-width="7" stroke-linecap="round"/>
      <path d="M50 20 C48 10 42 6 36 4 M50 20 C52 10 58 6 64 6" fill="none" stroke="${P.green}" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 18 C50 18 40 30 28 40 C12 52 14 80 34 88 C44 92 56 92 66 88 C86 80 88 52 72 40 C60 30 50 18 50 18 Z" fill="${P.violet}" ${P.S}/>
      <path d="M50 22 C40 36 32 54 36 86 M50 22 C60 36 68 54 64 86" fill="none" stroke="${P.lilac}" stroke-width="3" stroke-linecap="round"/>
      <path d="M42 90 L40 96 M50 91 V97 M58 90 L60 96" ${P.s}/>
      ${P.eyes(50, 58, 18, 6)}
      <path d="M38 68 C38 68 42 74 42 77 C42 79 40 81 38 81 C36 81 34 79 34 77 C34 74 38 68 38 68 Z M64 68 C64 68 68 74 68 77 C68 79 66 81 64 81 C62 81 60 79 60 77 C60 74 64 68 64 68 Z" fill="${P.sky}" stroke="${P.ink}" stroke-width="2"/>
      <path d="M46 78 Q50 74 54 78" fill="none" ${P.s}/>`,
    // Наггетсы и крылышки: летать не умеют. Уже
    "🍗": (P) => `
      ${L("M48 58 L22 84", P.cream, 9)}
      ${U(`<circle cx="16" cy="82" r="7"/><circle cx="24" cy="90" r="7"/>`, P.cream)}
      ${U(`<path d="M56 62 C38 66 24 52 24 36 C24 18 42 6 60 10 C80 14 92 34 86 52 C82 62 70 64 56 62 Z"/><circle cx="28" cy="26" r="6"/><circle cx="44" cy="11" r="6"/><circle cx="66" cy="10" r="6"/><circle cx="83" cy="24" r="6"/><circle cx="89" cy="44" r="6"/><circle cx="76" cy="60" r="6"/><circle cx="25" cy="46" r="6"/><circle cx="38" cy="60" r="6"/>`, P.orange)}
      <circle cx="40" cy="28" r="3" fill="${P.yellow}"/><circle cx="62" cy="22" r="3.5" fill="${P.yellow}"/><circle cx="76" cy="38" r="3" fill="${P.yellow}"/><circle cx="50" cy="48" r="3.5" fill="${P.yellow}"/><circle cx="34" cy="44" r="2.5" fill="${P.yellow}"/><circle cx="68" cy="54" r="2.5" fill="${P.yellow}"/>
      ${P.spark(86, 80, 7)}`,
    // Филадельфия: сыра больше, чем рыбы
    "🍣": (P) => `
      <path d="M12 62 C12 50 24 46 50 46 C76 46 88 50 88 62 C88 76 76 82 50 82 C24 82 12 76 12 62 Z" fill="${P.white}" ${P.S}/>
      <path d="M8 52 C8 36 26 28 50 30 C76 32 94 40 92 54 C90 62 80 62 68 58 C52 54 30 62 18 62 C12 62 8 58 8 52 Z" fill="${P.orange}" ${P.S}/>
      <path d="M24 34 L18 58 M40 31 L34 58 M56 31 L52 55 M72 34 L70 58" stroke="${P.cream}" stroke-width="3.5" stroke-linecap="round"/>
      ${P.sleepy(50, 66, 18, 5.5)}
      ${P.cheeks(50, 74, 34)}
      ${P.spark(88, 18, 6, P.pink)}`,
    // Калифорния: краб настоящий. Почти
    "🦀": (P) => `
      <path d="M22 66 L8 72 M22 72 L10 82 M26 78 L18 90 M78 66 L92 72 M78 72 L90 82 M74 78 L82 90" ${P.S}/>
      <path d="M30 56 L18 44 M70 56 L82 44" ${P.S}/>
      <path d="M18 46 C6 42 4 24 14 18 L22 28 L28 22 C32 34 28 44 18 46 Z" fill="${P.red}" ${P.S}/>
      <path d="M82 46 C94 42 96 24 86 18 L78 28 L72 22 C68 34 72 44 82 46 Z" fill="${P.red}" ${P.S}/>
      <path d="M42 46 L40 30 M58 46 L60 30" ${P.S}/>
      <ellipse cx="50" cy="64" rx="30" ry="20" fill="${P.red}" ${P.S}/>
      <circle cx="40" cy="28" r="6" fill="#fff" ${P.s}/><circle cx="60" cy="28" r="6" fill="#fff" ${P.s}/>
      <circle cx="41" cy="29" r="3" fill="${P.ink}"/><circle cx="61" cy="29" r="3" fill="${P.ink}"/>
      <path d="M42 68 Q50 74 58 68" fill="none" ${P.S}/>
      <circle cx="34" cy="62" r="2.6" fill="${P.white}"/><circle cx="66" cy="60" r="2.6" fill="${P.white}"/>`,
    // Мисо-суп: тёплый, как поддержка мамы
    "🥣": (P) => `
      <path d="M50 34 C44 30 40 27 40 23 C40 19 45 18 47 21 L50 24 L53 21 C55 18 60 19 60 23 C60 27 56 30 50 34 Z" fill="${P.pink}" ${P.s}/>
      <path d="M32 30 C28 24 36 20 32 12 M68 30 C64 24 72 20 68 12" fill="none" ${P.s}/>
      <path d="M38 86 H62 L60 94 H40 Z" fill="${P.blue}" ${P.S}/>
      ${P.dots("g-miso", "M8 50 H92 C92 72 74 88 50 88 C26 88 8 72 8 50 Z", P.white, P.blue, 12, 2.6)}
      <ellipse cx="50" cy="50" rx="42" ry="8" fill="${P.orange}" ${P.S}/>
      <rect x="30" y="46" width="8" height="6" fill="${P.cream}" ${P.s}/><rect x="58" y="47" width="8" height="6" fill="${P.cream}" ${P.s}/>
      <circle cx="46" cy="50" r="2.2" fill="${P.lime}"/><circle cx="72" cy="51" r="2" fill="${P.lime}"/><circle cx="24" cy="51" r="2" fill="${P.lime}"/>`,
    // Тонкоцу: бульон варили дольше, чем ты спишь
    "🍜": (P) => `
      ${L("M34 4 L64 46", P.brown, 4)}
      ${L("M48 2 L72 44", P.brown, 4)}
      ${L("M44 46 C38 36 52 30 46 18 M54 46 C48 36 62 30 56 18", P.cream, 4)}
      <path d="M8 48 H92 C92 72 74 90 50 90 C26 90 8 72 8 48 Z" fill="${P.red}" ${P.S}/>
      <path d="M12 62 C30 66 70 66 88 62" fill="none" stroke="${P.white}" stroke-width="4" stroke-linecap="round"/>
      <path d="M12 62 L18 70 L24 63 M76 63 L82 70 L88 62" fill="none" stroke="${P.white}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="50" cy="48" rx="42" ry="8" fill="${P.orange}" ${P.S}/>
      <ellipse cx="28" cy="46" rx="10" ry="6" fill="${P.white}" ${P.s}/><circle cx="28" cy="46" r="3.5" fill="${P.yellow}"/>
      <rect x="70" y="36" width="12" height="12" fill="${P.ink}" transform="rotate(10 76 42)"/>`,
    // Острый мисо / халапеньо: «позвоните маме»
    "🌶": (P) => `
      <path d="M30 24 C40 22 46 28 50 40 C56 58 70 74 90 84 C72 94 44 88 30 68 C20 52 20 32 30 24 Z" fill="${P.red}" ${P.S}/>
      <path d="M22 28 C26 18 40 18 42 28 C36 24 28 24 22 28 Z" fill="${P.green}" ${P.S}/>
      ${L("M32 22 C30 14 36 8 44 10", P.green, 4)}
      ${P.eyes(36, 46, 13, 4.5)}
      <path d="M27 37 L33 40 M45 40 L51 37" ${P.S}/>
      <ellipse cx="40" cy="60" rx="5" ry="4" fill="${P.ink}"/>
      <path d="M58 30 C58 30 66 20 64 12 C70 18 72 26 66 32 C72 30 74 24 74 24 C78 32 72 40 64 40 C58 40 56 34 58 30 Z" fill="${P.orange}" ${P.s}/>
      <path d="M14 46 C14 46 18 52 18 54 C18 56 16 58 14 58 C12 58 10 56 10 54 C10 52 14 46 14 46 Z" fill="${P.sky}" stroke="${P.ink}" stroke-width="2"/>`,
    // Гёдза: шесть маленьких поводов жить
    "🥟": (P) => `
      <path d="M14 70 C30 80 70 80 86 70 C88 78 84 82 78 82 H22 C16 82 12 78 14 70 Z" fill="${P.orange}" ${P.S}/>
      <path d="M10 68 C10 42 30 26 50 26 C70 26 90 42 90 68 C78 76 22 76 10 68 Z" fill="${P.cream}" ${P.S}/>
      <path d="M28 34 L32 42 M40 28 L42 38 M50 26 V36 M60 28 L58 38 M72 34 L68 42" ${P.s}/>
      ${P.eyes(50, 54, 18, 5.5)}
      ${P.cheeks(50, 64, 34)}
      ${P.spark(86, 16, 7)}${P.spark(12, 22, 4, P.pink)}`,
    // Онигири: треугольный. Смирись
    "🍙": (P) => `
      <path d="M50 10 C56 10 60 14 64 22 L88 70 C92 80 86 90 76 90 H24 C14 90 8 80 12 70 L36 22 C40 14 44 10 50 10 Z" fill="${P.white}" ${P.S}/>
      <path d="M32 64 H68 V90 H32 Z" fill="${P.ink}"/>
      <path d="M38 72 h3 M50 80 h3 M58 70 h3" stroke="${P.lime}" stroke-width="2.5" stroke-linecap="round"/>
      ${P.eyes(50, 46, 16, 5)}
      <path d="M40 42 H48 M52 42 H60" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M45 57 H55" ${P.s}/>
      ${P.cheeks(50, 54, 30)}`,
    // Пепперони
    "🍕": (P) => `
      <path d="M50 94 L14 24 C34 12 66 12 86 24 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M20 36 C22 46 30 46 30 54 M70 50 C70 44 78 42 78 36" fill="none" ${P.s}/>
      <path d="M12 20 C32 6 68 6 88 20 L84 30 C64 18 36 18 16 30 Z" fill="${P.orange}" ${P.S}/>
      <circle cx="40" cy="40" r="8" fill="${P.red}" ${P.s}/><circle cx="62" cy="42" r="7" fill="${P.red}" ${P.s}/><circle cx="50" cy="64" r="7" fill="${P.red}" ${P.s}/>
      <circle cx="38" cy="38" r="1.6" fill="${P.ink}"/><circle cx="64" cy="44" r="1.6" fill="${P.ink}"/><circle cx="48" cy="62" r="1.6" fill="${P.ink}"/>
      <path d="M58 56 l4 2 M36 54 l3 -3" stroke="${P.green}" stroke-width="3" stroke-linecap="round"/>`,
    // С ананасами: да, мы это сделали
    "🍍": (P) => `
      <path d="M50 38 L34 8 L46 22 L50 2 L54 22 L66 8 L50 38 Z" fill="${P.green}" ${P.S}/>
      <path d="M48 36 L22 22 L40 22 Z M52 36 L78 22 L60 22 Z" fill="${P.green}" ${P.S}/>
      <clipPath id="g-pineapple"><ellipse cx="50" cy="64" rx="28" ry="30"/></clipPath>
      <ellipse cx="50" cy="64" rx="28" ry="30" fill="${P.yellow}"/>
      <g clip-path="url(#g-pineapple)" stroke="${P.orange}" stroke-width="3">${rep(8, (i) => `<path d="M${i * 14 - 20} 30 L${i * 14 + 30} 100 M${i * 14 + 20} 30 L${i * 14 - 30} 100"/>`)}</g>
      <ellipse cx="50" cy="64" rx="28" ry="30" fill="none" ${P.S}/>
      <path d="M24 52 H76" stroke="${P.ink}" stroke-width="3.5"/>
      <path d="M26 52 H47 L45 62 C44 66 40 68 36 68 C30 68 26 64 26 58 Z M74 52 H53 L55 62 C56 66 60 68 64 68 C70 68 74 64 74 58 Z" fill="${P.ink}"/>
      <path d="M32 58 L38 54 M60 58 L66 54" stroke="${P.pink}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M42 78 Q50 82 58 76" fill="none" ${P.S}/>`,
    // Шаурма классическая — из твоих лучших 3 ночи
    "🌯": (P) => `
      <g transform="rotate(28 50 54)">
        ${U(`<circle cx="36" cy="22" r="7"/><circle cx="50" cy="18" r="8"/><circle cx="64" cy="22" r="7"/>`, P.green, 6)}
        <path d="M30 30 C30 22 70 22 70 30 V88 C70 94 30 94 30 88 Z" fill="${P.cream}" ${P.S}/>
        <ellipse cx="50" cy="28" rx="20" ry="7" fill="${P.brown}" ${P.S}/>
        <circle cx="42" cy="27" r="3" fill="${P.red}" ${P.s}/><circle cx="56" cy="28" r="3" fill="${P.lime}" ${P.s}/>
        <path d="M30 40 C42 46 58 44 70 36" fill="none" ${P.s}/>
        ${P.sleepy(50, 50, 14, 4.5)}
        ${P.stripes("g-shawarma", "M30 64 L70 60 V88 C70 94 30 94 30 88 Z", P.sky, P.white, 6)}
      </g>
      ${P.spark(14, 16, 6, P.pink)}${P.spark(86, 86, 5)}`,
    // Двойное мясо — для серьёзных намерений
    "🥩": (P) => `
      <path d="M14 50 C8 30 30 14 52 18 C78 22 94 40 88 62 C82 84 54 90 34 82 C20 76 18 62 14 50 Z" fill="${P.cream}" ${P.S}/>
      <path d="M22 50 C18 34 36 24 52 26 C72 28 84 42 80 58 C76 74 56 80 40 76 C28 72 26 60 22 50 Z" fill="${P.red}" ${P.s}/>
      <path d="M32 46 Q42 40 48 48 Q54 56 66 50 M38 62 Q48 58 56 66" fill="none" stroke="${P.rose}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="62" cy="40" rx="6" ry="5" fill="${P.cream}" ${P.s}/>
      <path d="M30 32 L48 74 M48 28 L66 72" stroke="${P.ink}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      ${P.spark(86, 14, 6)}`,
    // Картошка по-деревенски: деревни нет, картошка есть
    "🥔": (P) => `
      <path d="M18 60 C10 40 24 22 46 22 C70 20 92 32 90 54 C88 76 68 88 46 86 C30 84 22 72 18 60 Z" fill="${P.skin2}" ${P.S}/>
      <circle cx="26" cy="52" r="2.6" fill="${P.brown}"/><circle cx="72" cy="34" r="2.6" fill="${P.brown}"/><circle cx="78" cy="66" r="3.2" fill="${P.brown}"/><circle cx="36" cy="74" r="2.4" fill="${P.brown}"/>
      ${P.eyes(52, 50, 18, 6)}
      <path d="M44 66 Q52 72 60 66" fill="none" ${P.s}/>
      <path d="M50 22 C48 14 52 8 58 8 C58 14 54 18 50 22 Z" fill="${P.green}" ${P.s}/>
      ${P.spark(14, 22, 6, P.lime)}`,
    // Пончик «Глазурь»
    "🍩": (P) => `
      <circle cx="50" cy="52" r="38" fill="${P.orange}" ${P.S}/>
      <path d="M16 50 C12 30 30 14 50 14 C72 14 88 28 86 48 C88 58 80 62 76 56 C72 66 62 64 60 58 C54 68 42 68 40 60 C34 68 24 64 24 58 C16 62 14 56 16 50 Z" fill="${P.pink}" ${P.S}/>
      <circle cx="50" cy="44" r="11" fill="${P.cream}" ${P.S}/>
      ${[[28, 30, 30, P.yellow], [66, 24, -20, P.lime], [76, 42, 60, P.sky], [32, 48, -40, P.white], [58, 58, 20, P.yellow], [42, 22, 80, P.sky], [70, 52, -60, P.white]].map(([x, y, r, c]) => `<rect x="${x - 4}" y="${y - 1.6}" width="8" height="3.2" rx="1.6" fill="${c}" stroke="${P.ink}" stroke-width="1.2" transform="rotate(${r} ${x} ${y})"/>`).join("")}`,
    // Сан-Себастьян: сожжён специально. Так модно
    "🍰": (P) => `
      <path d="M8 54 L90 44 V82 L8 90 Z" fill="${P.cream}" ${P.S}/>
      <path d="M8 54 L54 26 L90 44 Z" fill="${P.brown}" ${P.S}/>
      <path d="M90 44 V82" ${P.S}/>
      <path d="M8 54 L90 44" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/>
      ${P.sleepy(46, 66, 18, 5.5)}
      ${P.cheeks(46, 76, 32)}
      <path d="M58 22 C52 16 62 12 56 4 M70 26 C64 20 74 16 68 8" fill="none" stroke="${P.ink}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
      ${P.spark(20, 22, 6, P.orange)}`,
    // Матча-латте
    "🍵": (P) => `
      <path d="M40 22 C36 16 44 12 40 4 M58 22 C54 16 62 12 58 4" fill="none" ${P.s}/>
      ${P.checker("g-matcha", "M18 40 H82 L76 82 C75 89 69 93 62 93 H38 C31 93 25 89 24 82 Z", P.green, P.white, 10)}
      <ellipse cx="50" cy="40" rx="32" ry="7" fill="${P.lime}" ${P.S}/>
      <path d="M50 46 C45 43 42 41 42 38.5 C42 36 45.5 35 47 37 L50 39.5 L53 37 C54.5 35 58 36 58 38.5 C58 41 55 43 50 46 Z" fill="${P.white}"/>
      ${P.spark(88, 20, 6, P.pink)}`,
    // Боул с киноа
    "🥗": (P) => `
      <path d="M8 56 C6 42 18 36 26 40 C28 28 42 26 48 34 C54 24 70 26 72 36 C82 32 94 42 92 56 Z" fill="${P.green}" ${P.S}/>
      <circle cx="30" cy="46" r="7" fill="${P.red}" ${P.s}/><circle cx="66" cy="44" r="6" fill="${P.red}" ${P.s}/>
      <circle cx="48" cy="44" r="7" fill="${P.lime}" ${P.s}/><circle cx="48" cy="44" r="2.5" fill="${P.green}"/>
      <ellipse cx="78" cy="50" rx="6" ry="4" fill="${P.yellow}" ${P.s}/>
      ${P.stripes("g-salad", "M6 54 H94 C92 76 74 92 50 92 C26 92 8 76 6 54 Z", P.yellow, P.pink, 8)}
      ${P.spark(86, 14, 6, P.lilac)}`,
    // Ягодный буст +12%
    "🫐": (P) => `
      <circle cx="30" cy="64" r="20" fill="${P.blue}" ${P.S}/>
      <circle cx="70" cy="64" r="20" fill="${P.violet}" ${P.S}/>
      <circle cx="50" cy="36" r="22" fill="${P.blue}" ${P.S}/>
      <path d="M50 18 L52 22 L56 21 L54 25 L56 28 L50 27 L44 28 L46 25 L44 21 L48 22 Z" fill="${P.ink}"/>
      <path d="M26 72 L28 76 M74 72 L72 76" ${P.s}/>
      <circle cx="22" cy="56" r="3" fill="#fff" opacity=".6"/><circle cx="62" cy="56" r="3" fill="#fff" opacity=".6"/>
      ${P.eyes(50, 38, 15, 5)}
      ${P.spark(86, 18, 7, P.pink)}`,
    // Креветки маленькие, но гордые
    "🍤": (P) => `
      <path d="M30 78 L4 94 L8 80 L2 68 L14 70 Z" fill="${P.red}" ${P.S}/><path d="M24 78 L8 88 M22 74 L6 74" stroke="${P.white}" stroke-width="2.5" stroke-linecap="round"/>
      ${U(`<path d="M26 80 C12 62 20 30 46 22 C64 16 82 24 88 38 C78 38 64 40 54 46 C40 54 38 68 44 80 C38 84 30 84 26 80 Z"/><circle cx="34" cy="64" r="5"/><circle cx="38" cy="40" r="5"/><circle cx="58" cy="24" r="5"/><circle cx="78" cy="28" r="5"/>`, P.orange)}
      <circle cx="30" cy="54" r="2.6" fill="${P.yellow}"/><circle cx="48" cy="32" r="2.6" fill="${P.yellow}"/><circle cx="66" cy="30" r="2.4" fill="${P.yellow}"/><circle cx="38" cy="72" r="2.2" fill="${P.yellow}"/>
      <path d="M60 33 Q64 29 68 33 M72 34 Q76 30 80 34" fill="none" ${P.s}/>
      ${P.spark(86, 76, 7)}${P.spark(70, 90, 4, P.pink)}`,
    // Лимонад «Вайб»
    "🍋": (P) => `
      <path d="M8 50 C14 46 16 44 18 40 C26 26 40 22 52 22 C66 22 80 28 84 40 C86 44 88 46 94 50 C88 54 86 56 84 60 C78 74 64 80 50 80 C36 80 24 74 18 60 C16 56 14 54 8 50 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M50 22 C52 12 64 6 72 10 C68 18 60 22 50 22 Z" fill="${P.green}" ${P.s}/>
      <path d="M30 38 Q36 32 44 31" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>
      ${P.eyes(50, 50, 18, 6)}
      <path d="M44 63 Q50 68 56 63" fill="none" ${P.s}/>
      <circle cx="80" cy="82" r="13" fill="${P.yellow}" ${P.S}/>
      <circle cx="80" cy="82" r="8.5" fill="${P.cream}" ${P.s}/>
      <path d="M80 74 V90 M72 82 H88 M74.5 76.5 L85.5 87.5 M85.5 76.5 L74.5 87.5" stroke="${P.yellow}" stroke-width="2.2"/>
      <circle cx="16" cy="78" r="4.5" fill="${P.sky}" ${P.s}/><circle cx="30" cy="90" r="3" fill="${P.sky}" ${P.s}/><circle cx="12" cy="92" r="2.4" fill="${P.sky}" ${P.s}/>
      ${P.spark(88, 16, 6, P.pink)}`,
    // Морс домашний
    "🧃": (P) => `
      ${L("M56 22 L60 4 H72", P.lime, 4)}
      <path d="M22 26 L36 18 H78 L64 26 Z" fill="${P.white}" ${P.S}/>
      <path d="M64 26 L78 18 V82 L64 92 Z" fill="${P.rose}" ${P.S}/>
      <rect x="22" y="26" width="42" height="66" fill="${P.pink}" ${P.S}/>
      ${P.eyes(43, 46, 16, 5.5)}
      <path d="M37 58 Q43 62 49 58" fill="none" ${P.s}/>
      <circle cx="34" cy="78" r="5.5" fill="${P.red}" ${P.s}/><circle cx="46" cy="80" r="5.5" fill="${P.red}" ${P.s}/><circle cx="40" cy="71" r="5.5" fill="${P.red}" ${P.s}/>
      <path d="M40 66 L44 60" ${P.s}/>`,
  });
})();
