/* ============================================================
   Иллюстрации Vibegram — главные картинки постов, моментов, хайлайтов.
   Стиль и палитра — см. ill.js. Жизнь как витрина: всё смотрит в камеру.
   ============================================================ */
(function () {
  if (!window.Vibe || !Vibe.ill) return;
  const I = "#1b1430";
  // Звезда: n лучей
  const star = (cx, cy, R, r, n = 5, rot = -90) => {
    let d = "";
    for (let k = 0; k < n * 2; k++) {
      const a = ((rot + (k * 180) / n) * Math.PI) / 180, rr = k % 2 ? r : R;
      d += (k ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1) + " ";
    }
    return d + "Z";
  };
  // Сердце ~72×70 вокруг (0,0), масштаб k
  const HD = "M0 34 C-30 14 -40 -4 -36 -18 C-32 -32 -12 -36 0 -20 C12 -36 32 -32 36 -18 C40 -4 30 14 0 34 Z";
  const heart = (x, y, k, fill, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})"><path d="${HD}" fill="${fill}" stroke="${I}" stroke-width="${(3.5 / k).toFixed(2)}" stroke-linejoin="round"/></g>`;
  // Двойная линия: контур + цвет (стебли, трубки, палочки)
  const line = (d, c, w = 5) => `<path d="${d}" fill="none" stroke="${I}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // Ножка с ботинком
  const leg = (x1, y1, x2, y2, dir = 1, shoe = I) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${I}" stroke-width="3.5" stroke-linecap="round"/><path d="M${x2 - 3 * dir} ${y2 - 2} C${x2 + 6 * dir} ${y2 - 4} ${x2 + 10 * dir} ${y2 + 1} ${x2 + 9 * dir} ${y2 + 3} L${x2 - 3 * dir} ${y2 + 3} Z" fill="${shoe}" stroke="${I}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const mouth = (x, y, w = 6, c = I) => `<path d="M${x - w} ${y} Q${x} ${y + w * 0.9} ${x + w} ${y}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`;
  const drop = (x, y, s = 1, c = "#8fd8ff") => `<path d="M${x} ${y - 6 * s} C${x + 4 * s} ${y - 1 * s} ${x + 4 * s} ${y + 3 * s} ${x} ${y + 3 * s} C${x - 4 * s} ${y + 3 * s} ${x - 4 * s} ${y - 1 * s} ${x} ${y - 6 * s} Z" fill="${c}" stroke="${I}" stroke-width="2" stroke-linejoin="round"/>`;

  Vibe.ill.add({
    // Самолёт: отпуск 5 дней, из них 3 — в аэропорту
    "✈️": (P) => `
      ${line("M4 90 C14 82 22 92 32 84 C40 78 46 84 52 78", P.white, 4)}
      <g transform="rotate(-28 52 50)">
        <path d="M46 50 L34 18 C33 15 37 13 40 15 L66 48 Z" fill="${P.blue}" ${P.S}/>
        <path d="M18 46 L10 24 C9 21 13 19 16 21 L32 42 Z" fill="${P.red}" ${P.S}/>
        <path d="M10 50 C10 43 18 40 28 40 L74 40 C88 40 96 45 96 50 C96 55 88 60 74 60 L28 60 C18 60 10 57 10 50 Z" fill="#fff" ${P.S}/>
        <path d="M14 54 L90 54" stroke="${P.pink}" stroke-width="4"/>
        <circle cx="34" cy="47" r="3" fill="${P.sky}" ${P.s}/><circle cx="44" cy="47" r="3" fill="${P.sky}" ${P.s}/><circle cx="54" cy="47" r="3" fill="${P.sky}" ${P.s}/>
        ${P.eyes(80, 47, 10, 3.6)}
        <path d="M46 52 L30 86 C29 89 33 91 36 89 L68 54 Z" fill="${P.blue}" ${P.S}/>
      </g>
      ${P.spark(86, 80, 6, P.lime)}${P.spark(14, 18, 4)}`,

    // Воронка думскролла: засасывает лайки
    "🌀": (P) => `
      <circle cx="50" cy="50" r="40" fill="${P.lilac}" ${P.S}/>
      <path d="M50 50 A4 4 0 0 1 58 50 A8 8 0 0 1 42 50 A12 12 0 0 1 66 50 A16 16 0 0 1 34 50 A20 20 0 0 1 74 50 A24 24 0 0 1 26 50 A28 28 0 0 1 82 50" fill="none" stroke="${P.ink}" stroke-width="8" stroke-linecap="round"/>
      <path d="M50 50 A4 4 0 0 1 58 50 A8 8 0 0 1 42 50 A12 12 0 0 1 66 50 A16 16 0 0 1 34 50 A20 20 0 0 1 74 50 A24 24 0 0 1 26 50 A28 28 0 0 1 82 50" fill="none" stroke="${P.violet}" stroke-width="3.5" stroke-linecap="round"/>
      ${heart(86, 16, 0.2, P.pink, 30)}${heart(92, 34, 0.13, P.red, 60)}
      <g transform="rotate(-35 11 82)"><rect x="4" y="72" width="13" height="20" rx="3" fill="${P.ink}" ${P.s}/><rect x="6.5" y="75" width="8" height="12" rx="1" fill="${P.yellow}"/></g>
      ${P.spark(12, 14, 5, P.lime)}`,

    // Ночной город: в одном окне кто-то думает о зарплате
    "🌃": (P) => {
      const w = (x, y, c = P.yellow) => `<rect x="${x}" y="${y}" width="5" height="6" fill="${c}" stroke="${I}" stroke-width="2"/>`;
      return `
      <path d="M74 6 A16 16 0 1 0 94 30 A13 13 0 0 1 74 6 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M74 22 Q77 25 80 22" fill="none" ${P.s}/>
      <path d="M8 92 V46 H28 V92 Z" fill="${P.violet}" ${P.S}/>
      <path d="M26 92 V28 L36 18 L46 28 V92 Z" fill="${P.blue}" ${P.S}/>
      <path d="M36 18 V8" ${P.s}/><circle cx="36" cy="7" r="2.5" fill="${P.red}" ${P.s}/>
      <path d="M44 92 V54 H64 V92 Z" fill="${P.pink}" ${P.S}/>
      <path d="M62 92 V40 H82 V92 Z" fill="${P.violet}" ${P.S}/>
      <path d="M80 92 V62 H94 V92 Z" fill="${P.blue}" ${P.S}/>
      ${w(12, 52)}${w(20, 52, P.lilac)}${w(12, 64, P.lilac)}${w(20, 64)}${w(12, 76)}
      ${w(30, 34)}${w(38, 34, P.lilac)}${w(30, 46)}${w(30, 58, P.lilac)}${w(38, 70)}
      ${w(48, 60)}${w(56, 60, P.lilac)}${w(48, 72, P.lilac)}${w(56, 72)}
      <rect x="66" y="46" width="12" height="11" fill="${P.yellow}" stroke="${I}" stroke-width="2.5"/>
      <circle cx="70" cy="52" r="1.6" fill="${I}"/><circle cx="75" cy="52" r="1.6" fill="${I}"/>
      ${w(66, 64, P.lilac)}${w(73, 64)}${w(66, 76)}${w(84, 68)}
      <path d="M4 92 H96" ${P.S}/>
      ${P.spark(56, 14, 4, P.white)}${P.spark(14, 30, 3.5, P.white)}`;
    },

    // Звезда-инфлюенсер в очках
    "🌟": (P) => `
      <path d="M50 2 V10 M88 18 L82 24 M12 18 L18 24 M96 56 H88 M4 56 H12" ${P.S}/>
      <path d="${star(50, 54, 42, 19)}" fill="${P.yellow}" ${P.S}/>
      <path d="M30 46 H46 V49 C46 56 42 59 38 59 C34 59 30 56 30 49 Z" fill="${P.ink}" ${P.s}/>
      <path d="M54 46 H70 V49 C70 56 66 59 62 59 C58 59 54 56 54 49 Z" fill="${P.ink}" ${P.s}/>
      <path d="M46 48 H54 M30 47 L24 44 M70 47 L76 44" ${P.s}/>
      <path d="M34 50 L38 47 M58 50 L62 47" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <path d="M42 66 Q52 72 60 63" fill="none" ${P.s}/>
      ${P.cheeks(50, 63, 34, P.orange)}
      ${P.spark(86, 86, 6, P.pink)}${P.spark(14, 84, 4.5, P.lime)}`,

    // Росток в горшке: личностный рост
    "🌱": (P) => `
      ${line("M50 60 C40 50 60 42 50 32 C45 26 52 20 50 16", P.green, 4)}
      <path d="M50 36 C36 22 18 28 14 38 C26 46 42 46 50 36 Z" fill="${P.lime}" ${P.S}/>
      <path d="M48 26 C58 8 80 10 88 18 C80 30 62 34 48 26 Z" fill="${P.green}" ${P.S}/>
      <path d="M46 36 Q32 36 22 38 M52 25 Q66 20 80 18" fill="none" ${P.s}/>
      ${P.checker("v-sprout", "M28 64 L72 64 L66 94 L34 94 Z", P.ink, P.pink, 10)}
      <rect x="22" y="56" width="56" height="12" rx="4" fill="${P.orange}" ${P.S}/>
      <rect x="36" y="72" width="28" height="15" rx="7" fill="#fff" ${P.s}/>
      ${P.eyes(50, 79, 12, 4)}
      ${P.spark(84, 40, 5)}${P.spark(16, 14, 4, P.pink)}`,

    // Рамен из пакета, но с душой и яйцом
    "🍜": (P) => `
      <path d="M58 12 C54 6 60 4 58 -2 M72 14 C68 8 74 6 72 0" fill="none" ${P.s}/>
      ${line("M44 50 L74 6", P.brown, 4)}${line("M52 52 L88 12", P.brown, 4)}
      ${P.dots("v-ramen", "M8 50 L92 50 C92 74 74 90 50 90 C26 90 8 74 8 50 Z", P.yellow, P.red, 13, 3)}
      <ellipse cx="50" cy="50" rx="42" ry="10" fill="${P.orange}" ${P.S}/>
      <path d="M18 50 C22 44 26 56 30 48 C34 42 38 56 42 48 M54 52 C58 44 60 56 64 48" fill="none" stroke="${P.cream}" stroke-width="4" stroke-linecap="round"/>
      <path d="M62 30 C58 36 64 40 60 46 M68 22 C64 28 70 34 66 42" fill="none" stroke="${I}" stroke-width="6" stroke-linecap="round"/>
      <path d="M62 30 C58 36 64 40 60 46 M68 22 C64 28 70 34 66 42" fill="none" stroke="${P.cream}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="76" cy="47" rx="9" ry="6" fill="#fff" ${P.s}/><circle cx="76" cy="47" r="3.5" fill="${P.orange}" ${P.s}/>
      <path d="M20 38 L30 36 L32 50 L22 52 Z" fill="${P.green}" ${P.s}/>
      <rect x="30" y="64" width="40" height="16" rx="8" fill="#fff" ${P.s}/>
      ${P.eyes(50, 72, 14, 4.2)}
      <path d="M36 88 L64 88 L62 95 L38 95 Z" fill="${P.red}" ${P.s}/>`,

    // Ужин как в ресторане. Потому что из ресторана — чек торчит
    "🍝": (P) => `
      <g transform="rotate(-14 22 26)"><path d="M10 6 H34 V44 L30 41 L26 44 L22 41 L18 44 L14 41 L10 44 Z" fill="#fff" ${P.s}/>
      <path d="M15 14 H29 M15 21 H27 M15 28 H29" stroke="${I}" stroke-width="2" stroke-linecap="round"/><path d="M15 35 H24" stroke="${P.red}" stroke-width="3" stroke-linecap="round"/></g>
      <ellipse cx="50" cy="70" rx="45" ry="20" fill="#fff" ${P.S}/>
      <ellipse cx="50" cy="68" rx="33" ry="13" fill="${P.sky}" ${P.s}/>
      <path d="M20 66 C16 52 30 42 40 46 C44 34 62 34 66 44 C78 42 86 54 78 64 C70 74 28 74 20 66 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M26 62 C30 54 36 66 40 58 C44 50 48 64 52 58 M58 64 C62 56 66 66 70 58 C72 54 76 58 76 60 M30 52 C34 46 38 54 42 48 M28 66 C40 70 60 70 72 66" fill="none" stroke="${P.orange}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M38 52 C36 44 46 40 52 42 C60 38 70 44 66 52 C70 58 60 62 52 60 C44 62 36 58 38 52 Z" fill="${P.red}" ${P.s}/>
      <circle cx="52" cy="48" r="10" fill="${P.brown}" ${P.S}/>
      ${P.eyes(52, 47, 9, 3)}
      <path d="M38 40 C34 34 40 30 44 36 Z" fill="${P.green}" ${P.s}/>
      ${line("M68 52 L86 18", P.lilac, 3.5)}
      <path d="M80 18 L84 6 M86 20 L92 9 M83 19 L88 7" ${P.s}/>`,

    // Два бокала: чин-чин
    "🍻": (P) => `
      <g transform="rotate(-14 32 62)">
        <path d="M14 46 C6 46 4 54 4 62 C4 72 8 78 14 78" fill="none" stroke="${I}" stroke-width="7" stroke-linecap="round"/>
        <rect x="14" y="36" width="34" height="54" rx="5" fill="${P.yellow}" ${P.S}/>
        <path d="M24 46 V82 M38 46 V82" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
        <path d="M12 40 C8 30 18 24 24 28 C26 20 38 20 40 28 C46 24 54 30 50 40 Z" fill="#fff" ${P.S}/>
        ${P.eyes(31, 60, 12, 4.2)}${mouth(31, 70, 5)}
      </g>
      <g transform="rotate(14 68 62)">
        <path d="M86 46 C94 46 96 54 96 62 C96 72 92 78 86 78" fill="none" stroke="${I}" stroke-width="7" stroke-linecap="round"/>
        <rect x="52" y="36" width="34" height="54" rx="5" fill="${P.orange}" ${P.S}/>
        <path d="M62 46 V82 M76 46 V82" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
        <path d="M50 40 C46 30 54 24 60 28 C62 20 74 20 76 28 C82 24 92 30 88 40 Z" fill="#fff" ${P.S}/>
        ${P.eyes(69, 60, 12, 4.2)}${mouth(69, 70, 5)}
      </g>
      ${P.spark(50, 14, 7)}<circle cx="38" cy="10" r="3" fill="#fff" ${P.s}/><circle cx="64" cy="8" r="2.5" fill="#fff" ${P.s}/>`,

    // Подарок, который подглядывает
    "🎁": (P) => `
      ${P.dots("v-gift", "M18 52 H82 V92 H18 Z", P.pink, P.red, 12, 3)}
      <rect x="44" y="52" width="12" height="40" fill="${P.yellow}" ${P.S}/>
      <path d="M22 52 C30 46 70 46 78 52 Z" fill="${P.ink}"/>
      <ellipse cx="38" cy="50" rx="3" ry="2.5" fill="#fff"/><ellipse cx="60" cy="49" rx="3" ry="2.5" fill="#fff"/>
      <circle cx="38.6" cy="50.4" r="1.4" fill="${I}"/><circle cx="60.6" cy="49.4" r="1.4" fill="${I}"/>
      <g transform="rotate(-9 50 40)">
        <rect x="12" y="32" width="76" height="14" rx="3" fill="${P.red}" ${P.S}/>
        <rect x="44" y="32" width="12" height="14" fill="${P.yellow}" ${P.S}/>
        <path d="M50 32 C38 14 22 20 30 30 C34 34 44 33 50 32 Z" fill="${P.yellow}" ${P.S}/>
        <path d="M50 32 C62 14 78 20 70 30 C66 34 56 33 50 32 Z" fill="${P.yellow}" ${P.S}/>
      </g>
      <path d="M82 62 L92 70" ${P.s}/>${heart(91, 76, 0.16, P.lime, 20)}
      ${P.spark(12, 18, 5, P.lime)}`,

    // Хлопушка
    "🎉": (P) => `
      ${line("M48 46 C54 30 66 36 70 22 C72 14 80 14 82 8", P.pink, 3.5)}
      ${line("M54 52 C66 50 70 60 82 56 C88 54 92 58 96 54", P.lime, 3.5)}
      ${line("M44 42 C40 30 48 24 42 12", P.sky, 3.5)}
      ${P.stripes("v-popper", "M10 92 L34 40 L60 66 Z", P.yellow, P.violet, 8)}
      <ellipse cx="47" cy="53" rx="18" ry="7" transform="rotate(45 47 53)" fill="${P.pink}" ${P.S}/>
      ${P.eyes(32, 70, 10, 3.6)}
      <rect x="62" y="34" width="7" height="7" fill="${P.yellow}" transform="rotate(20 65 37)" ${P.s}/>
      <rect x="84" y="36" width="7" height="7" fill="${P.blue}" transform="rotate(-25 87 39)" ${P.s}/>
      <circle cx="74" cy="72" r="3.5" fill="${P.orange}" ${P.s}/><circle cx="58" cy="14" r="3" fill="${P.lime}" ${P.s}/>
      ${P.spark(90, 24, 6)}${P.spark(76, 86, 5, P.pink)}`,

    // Микрофон на ножках
    "🎤": (P) => `
      ${line("M50 86 C50 96 70 96 74 88 C78 80 90 82 94 90", P.violet, 2.5)}
      ${P.checker("v-mic", "M50 6 C64 6 72 16 72 28 C72 40 64 48 50 48 C36 48 28 40 28 28 C28 16 36 6 50 6 Z", P.ink, P.lilac, 9)}
      <rect x="30" y="44" width="40" height="9" rx="4" fill="${P.yellow}" ${P.S}/>
      <path d="M36 53 H64 L58 86 H42 Z" fill="${P.pink}" ${P.S}/>
      ${P.eyes(50, 64, 11, 3.8)}${mouth(50, 74, 4)}
      ${leg(44, 86, 38, 94, -1)}${leg(56, 86, 60, 94, 1)}
      <path d="M14 30 V14 L24 11 V27" fill="none" ${P.s}/><ellipse cx="11" cy="31" rx="4" ry="3" fill="${P.ink}"/><ellipse cx="21" cy="28" rx="4" ry="3" fill="${P.ink}"/>
      ${P.spark(86, 18, 6, P.lime)}`,

    // Остров: удалёнка, ноутбук в отеле
    "🏝️": (P) => `
      <circle cx="22" cy="24" r="12" fill="${P.orange}" ${P.S}/>
      <path d="M6 80 Q14 74 22 80 T38 80 T54 80 T70 80 T86 80 T96 80 V94 H6 Z" fill="${P.sky}" ${P.S}/>
      <path d="M20 82 C26 62 74 62 80 82 Z" fill="${P.yellow}" ${P.S}/>
      ${line("M48 70 C42 56 56 44 50 30", P.brown, 5)}
      <path d="M50 30 C42 18 24 18 18 30 C30 26 40 28 50 30 Z" fill="${P.green}" ${P.S}/>
      <path d="M50 30 C58 16 78 14 86 24 C74 24 62 26 50 30 Z" fill="${P.lime}" ${P.S}/>
      <path d="M50 30 C40 32 30 42 30 52 C38 42 44 36 50 30 Z" fill="${P.lime}" ${P.S}/>
      <path d="M50 30 C62 30 72 38 76 48 C66 42 58 36 50 30 Z" fill="${P.green}" ${P.S}/>
      <circle cx="46" cy="34" r="3.5" fill="${P.brown}" ${P.s}/><circle cx="54" cy="34" r="3.5" fill="${P.brown}" ${P.s}/>
      <path d="M58 72 L60 62 L74 62 L72 72 Z" fill="${P.ink}" ${P.s}/><path d="M56 72 H76" stroke="${I}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M62 64 L70 64" stroke="${P.mint}" stroke-width="2" stroke-linecap="round"/>
      ${P.spark(86, 44, 4.5, P.white)}`,

    // Дом с садом. Дым из трубы — процентами по ипотеке
    "🏡": (P) => `
      <rect x="58" y="18" width="10" height="20" fill="${P.brown}" ${P.S}/>
      <path d="M60 16 C54 12 58 4 64 6 C66 -2 80 -2 80 6 C86 6 88 14 82 16 Z" fill="#fff" ${P.s}/>
      <text x="70" y="14" text-anchor="middle" font-size="11" font-weight="900" font-family="system-ui,sans-serif" fill="${P.red}">%</text>
      <rect x="20" y="44" width="52" height="46" fill="${P.cream}" ${P.S}/>
      <path d="M12 48 L46 16 L80 48 Z" fill="${P.red}" ${P.S}/>
      <rect x="26" y="52" width="16" height="14" rx="2" fill="${P.sky}" ${P.s}/><rect x="50" y="52" width="16" height="14" rx="2" fill="${P.sky}" ${P.s}/>
      <circle cx="35" cy="60" r="3.2" fill="${I}"/><circle cx="59" cy="60" r="3.2" fill="${I}"/><circle cx="36" cy="58.5" r="1" fill="#fff"/><circle cx="60" cy="58.5" r="1" fill="#fff"/>
      <path d="M38 90 V76 C38 70 54 70 54 76 V90 Z" fill="${P.blue}" ${P.S}/>
      ${line("M86 92 C82 82 90 76 86 66", P.brown, 3)}
      <circle cx="86" cy="56" r="11" fill="${P.lime}" ${P.S}/>
      <path d="M6 80 L10 74 L14 80 V92 H6 Z M16 80 L20 74 L24 80 V92 H16 Z M70 82 L74 76 L78 82 V92 H70 Z" fill="${P.pink}" ${P.s}/>
      <path d="M4 92 H96" ${P.S}/>`,

    // Купил коту дом. Кот выбрал коробку
    "🐈": (P) => `
      <path d="M28 34 L26 12 L42 26 Z M72 34 L74 12 L58 26 Z" fill="${P.orange}" ${P.S}/>
      <path d="M30 24 L31 30 M70 24 L69 30" stroke="${P.pink}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="50" cy="42" rx="26" ry="20" fill="${P.orange}" ${P.S}/>
      <path d="M44 24 L46 30 M50 23 V30 M56 24 L54 30" ${P.s}/>
      ${P.eyes(50, 40, 18, 5)}
      <path d="M47 48 L53 48 L50 51 Z" fill="${P.pink}" ${P.s}/>
      <path d="M50 51 Q46 55 43 52 M50 51 Q54 55 57 52" fill="none" ${P.s}/>
      <path d="M20 46 L32 48 M20 52 L32 51 M80 46 L68 48 M80 52 L68 51" ${P.s}/>
      <path d="M8 46 L18 56 L82 56 L92 46 L84 60 L16 60 Z" fill="${P.skin2}" ${P.S}/>
      <path d="M16 56 H84 V92 H16 Z" fill="${P.skin2}" ${P.S}/>
      <ellipse cx="36" cy="57" rx="7" ry="4.5" fill="${P.orange}" ${P.s}/><ellipse cx="64" cy="57" rx="7" ry="4.5" fill="${P.orange}" ${P.s}/>
      <path d="M40 74 H60 M46 80 H54" stroke="${I}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M70 70 L76 76 M76 70 L70 76" ${P.s}/>
      ${P.spark(88, 20, 5, P.lime)}`,

    // Лягушка на созвоне: «Меня слышно?»
    "🐸": (P) => `
      <path d="M14 62 C14 42 30 36 50 38 C70 36 86 42 86 62 C86 80 70 92 50 92 C30 92 14 80 14 62 Z" fill="${P.green}" ${P.S}/>
      <path d="M12 56 C8 4 92 4 88 56" fill="none" stroke="${I}" stroke-width="5"/>
      <circle cx="32" cy="34" r="14" fill="${P.green}" ${P.S}/><circle cx="68" cy="34" r="14" fill="${P.green}" ${P.S}/>
      <circle cx="32" cy="33" r="9" fill="#fff" ${P.s}/><circle cx="68" cy="33" r="9" fill="#fff" ${P.s}/>
      <circle cx="33" cy="35" r="4.5" fill="${I}"/><circle cx="69" cy="35" r="4.5" fill="${I}"/>
      <path d="M30 66 Q50 74 70 66" fill="none" ${P.S}/>
      ${P.cheeks(50, 58, 46, P.pink)}
      <rect x="6" y="48" width="12" height="20" rx="5" fill="${P.violet}" ${P.S}/><rect x="82" y="48" width="12" height="20" rx="5" fill="${P.violet}" ${P.S}/>
      ${line("M14 66 C18 80 26 82 34 78", P.ink, 2)}<circle cx="36" cy="77" r="4" fill="${P.red}" ${P.s}/>
      ${drop(88, 30, 1)}
      <text x="50" y="16" text-anchor="middle" font-size="16" font-weight="900" font-family="system-ui,sans-serif" fill="${P.yellow}" stroke="${I}" stroke-width="2" paint-order="stroke">?</text>`,

    // Помада на ножках
    "💄": (P) => `
      <path d="M38 46 V24 C38 18 42 16 46 14 L62 8 V46 Z" fill="${P.red}" ${P.S}/>
      <path d="M43 22 V40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
      <rect x="34" y="44" width="32" height="12" rx="2" fill="${P.yellow}" ${P.S}/>
      ${P.stripes("v-lipstick", "M30 56 H70 V86 C70 88 68 90 66 90 H34 C32 90 30 88 30 86 Z", P.pink, P.ink, 7)}
      <rect x="36" y="62" width="28" height="15" rx="7" fill="#fff" ${P.s}/>
      ${P.eyes(50, 69, 11, 3.8)}
      ${leg(40, 90, 36, 96, -1, P.red)}${leg(60, 90, 64, 96, 1, P.red)}
      <path d="M78 30 C82 24 88 24 90 28 C92 24 98 26 96 32 C94 38 86 40 84 36 C80 38 76 34 78 30 Z" fill="${P.pink}" ${P.s}/>
      <path d="M80 32 Q87 34 94 30" fill="none" ${P.s}/>
      ${P.spark(16, 26, 5)}`,

    // Лак: стоит как холодильник
    "💅": (P) => `
      <rect x="40" y="6" width="20" height="34" rx="4" fill="${P.ink}" ${P.S}/>
      <path d="M45 12 V32" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>
      <rect x="44" y="38" width="12" height="6" fill="${P.lilac}" ${P.s}/>
      ${P.dots("v-polish", "M30 44 H70 C78 44 82 50 82 58 V82 C82 88 78 92 72 92 H28 C22 92 18 88 18 82 V58 C18 50 22 44 30 44 Z", P.rose, P.pink, 12, 3)}
      <rect x="30" y="58" width="40" height="22" rx="11" fill="#fff" ${P.s}/>
      ${P.eyes(50, 66, 14, 4.2)}${mouth(50, 73, 3.5)}
      <path d="M56 42 L74 34" ${P.s}/>
      <path d="M72 26 L88 26 L94 34 L88 42 L72 42 Z" fill="${P.yellow}" ${P.s}/>
      <path d="M78 30 L86 30 L88 33 L82 39 L76 33 Z" fill="${P.sky}" stroke="${I}" stroke-width="1.8" stroke-linejoin="round"/>
      ${P.spark(14, 30, 5, P.lime)}`,

    // Сердце со стрелой
    "💘": (P) => `
      ${line("M8 88 L30 70", P.yellow, 3)}
      <path d="M8 88 L4 78 L14 82 Z M14 92 L4 92 L10 84 Z" fill="${P.sky}" ${P.s}/>
      ${heart(50, 48, 1.05, P.pink)}
      ${line("M70 32 L86 18", P.yellow, 3)}
      <path d="M94 10 L80 14 L90 24 Z" fill="${P.red}" ${P.S}/>
      ${P.eyes(50, 40, 18, 5)}
      <path d="M42 56 Q50 62 58 56" fill="none" ${P.s}/>
      ${P.cheeks(50, 51, 36, P.red)}
      ${P.spark(86, 76, 5)}`,

    // Вайбот: кредит одобрен, даже если не просил
    "💜": (P) => `
      ${heart(46, 50, 1.05, P.violet)}
      <path d="M33 38 H43 M51 38 H61" ${P.S}/>
      <circle cx="38" cy="43" r="3.4" fill="${I}"/><circle cx="56" cy="43" r="3.4" fill="${I}"/>
      <path d="M36 56 C42 64 52 64 58 56 Z" fill="#fff" ${P.s}/>
      <path d="M76 52 C80 54 82 58 82 62" fill="none" ${P.S}/>
      <g transform="rotate(-16 80 70)">
        <rect x="64" y="58" width="32" height="22" rx="4" fill="${P.lime}" ${P.S}/>
        <path d="M64 64 H96" stroke="${I}" stroke-width="4"/>
        <path d="M70 72 L74 76 L82 68" fill="none" ${P.s}/>
      </g>
      <circle cx="78" cy="66" r="5" fill="${P.violet}" ${P.s}/>
      ${P.spark(14, 18, 5, P.lime)}${P.spark(88, 20, 4)}`,

    // Два сердца на орбите
    "💞": (P) => `
      <ellipse cx="50" cy="50" rx="44" ry="26" transform="rotate(-30 50 50)" fill="none" stroke="${I}" stroke-width="2.5" stroke-dasharray="5 6"/>
      ${heart(40, 58, 0.78, P.pink, -8)}
      ${P.eyes(39, 54, 13, 4)}${mouth(39, 63, 4)}
      ${heart(72, 28, 0.48, P.red, 14)}
      ${P.eyes(72, 26, 9, 2.8)}
      ${P.spark(86, 76, 5, P.lime)}${P.spark(16, 16, 4)}`,

    // Бицепс с напульсником
    "💪": (P) => `
      <path d="M14 60 C20 34 46 26 58 46 C60 49 61 52 62 55 L60 40 C56 34 50 30 52 22 C54 8 76 6 82 16 C86 24 84 30 82 34 L88 70 C90 84 78 92 64 92 H14 Z" fill="${P.skin}" ${P.S}/>
      <path d="M58 18 C62 21 68 21 72 18 M58 26 C62 29 68 29 74 26" fill="none" ${P.s}/>
      <path d="M58 40 L83 34 L85 47 L60 53 Z" fill="${P.pink}" ${P.S}/>
      <path d="M61 45 L84 40" stroke="${P.yellow}" stroke-width="3.5"/>
      <path d="M48 62 C54 66 58 66 62 64" fill="none" ${P.s}/>
      <path d="M24 46 C30 38 40 36 46 40" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>
      ${P.stripes("v-sleeve", "M4 54 C12 54 22 62 24 74 L26 94 H4 Z", P.yellow, P.blue, 7, false)}
      ${heart(42, 72, 0.2, P.red)}
      ${drop(18, 30, 1.1)}${P.spark(92, 18, 5)}${P.spark(12, 12, 4, P.lime)}`,

    // Кружится голова от успеха
    "💫": (P) => `
      ${line("M8 86 C30 96 64 84 58 62 C54 46 32 54 42 64", P.lilac, 6)}
      <path d="${star(68, 34, 28, 13, 5, -80)}" fill="${P.yellow}" ${P.S}/>
      <circle cx="61" cy="32" r="6" fill="#fff" ${P.s}/><circle cx="76" cy="32" r="6" fill="#fff" ${P.s}/>
      <path d="M61 32 A1.5 1.5 0 0 1 64 32 A3 3 0 0 1 58 32 M76 32 A1.5 1.5 0 0 1 79 32 A3 3 0 0 1 73 32" fill="none" stroke="${I}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M62 44 Q66 41 69 44 T76 44" fill="none" ${P.s}/>
      ${P.spark(20, 20, 6, P.pink)}${P.spark(90, 76, 5, P.lime)}${P.spark(36, 40, 3.5, P.white)}`,

    // Портфель в шахматку бежит на дедлайн
    "💼": (P) => `
      <path d="M34 34 V20 C34 14 66 14 66 20 V34 H58 V22 H42 V34 Z" fill="${P.brown}" ${P.S}/>
      ${P.checker("v-briefcase", "M18 30 H82 C86 30 90 34 90 38 V74 C90 78 86 82 82 82 H18 C14 82 10 78 10 74 V38 C10 34 14 30 18 30 Z", P.ink, P.lime, 10)}
      <rect x="30" y="42" width="40" height="22" rx="6" fill="#fff" ${P.S}/>
      ${P.eyes(50, 50, 14, 4.2)}
      <path d="M44 59 Q50 55 56 59" fill="none" ${P.s}/>
      ${leg(36, 82, 28, 94, -1, P.pink)}${leg(64, 82, 72, 94, 1, P.pink)}
      ${drop(92, 22, 1.1)}
      <path d="M2 50 H8 M0 60 H6" ${P.s}/>`,

    // Календарь, где всё зачёркнуто, кроме одного дня
    "📅": (P) => {
      let g = "";
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const x = 22 + c * 15, y = 50 + r * 12;
        if (r === 1 && c === 2) g += heart(x + 4, y + 3, 0.16, P.pink);
        else g += `<path d="M${x} ${y} l7 7 M${x + 7} ${y} l-7 7" stroke="${I}" stroke-width="2" stroke-linecap="round"/>`;
      }
      return `
      <rect x="12" y="20" width="76" height="72" rx="8" fill="#fff" ${P.S}/>
      <path d="M12 42 V28 C12 24 16 20 20 20 H80 C84 20 88 24 88 28 V42 Z" fill="${P.red}" ${P.S}/>
      <rect x="26" y="10" width="7" height="18" rx="3.5" fill="${P.lilac}" ${P.s}/><rect x="67" y="10" width="7" height="18" rx="3.5" fill="${P.lilac}" ${P.s}/>
      ${P.eyes(50, 31, 16, 4.2)}
      ${g}
      <circle cx="56" cy="65" r="9" fill="none" stroke="${P.pink}" stroke-width="3"/>
      ${P.spark(90, 12, 5, P.lime)}`;
    },

    // График-ракета на ножках
    "📈": (P) => `
      <rect x="8" y="36" width="64" height="46" rx="6" fill="${P.cream}" ${P.S}/>
      <rect x="16" y="62" width="10" height="14" fill="${P.pink}" ${P.s}/><rect x="31" y="54" width="10" height="22" fill="${P.yellow}" ${P.s}/><rect x="46" y="46" width="10" height="30" fill="${P.sky}" ${P.s}/>
      ${line("M14 72 L34 54 L48 62 L78 24", P.green, 6)}
      <path d="M88 10 L86 32 L68 20 Z" fill="${P.green}" ${P.S}/>
      ${P.eyes(24, 46, 10, 3.4)}
      ${leg(26, 82, 22, 92, -1, P.violet)}${leg(54, 82, 58, 92, 1, P.violet)}
      ${P.spark(92, 46, 5)}`,

    // Метка на карте: «я здесь (ради фото)»
    "📍": (P) => `
      <path d="M6 78 L28 70 L50 78 L72 70 L94 78 V94 L72 86 L50 94 L28 86 L6 94 Z" fill="${P.mint}" ${P.S}/>
      <path d="M28 70 V86 M50 78 V94 M72 70 V86" ${P.s}/>
      <path d="M28 70 L50 78 V94 L28 86 Z M72 70 L94 78 V94 L72 86 Z" fill="${P.sky}" ${P.s}/>
      <path d="M12 88 C24 84 30 92 42 86" fill="none" stroke="${I}" stroke-width="2.5" stroke-dasharray="3 4" stroke-linecap="round"/>
      <ellipse cx="50" cy="84" rx="10" ry="3" fill="${I}" opacity=".3"/>
      <path d="M50 6 C68 6 80 18 80 34 C80 52 60 64 50 82 C40 64 20 52 20 34 C20 18 32 6 50 6 Z" fill="${P.red}" ${P.S}/>
      <circle cx="50" cy="32" r="15" fill="#fff" ${P.s}/>
      <ellipse cx="44" cy="31" rx="4" ry="4.6" fill="${I}"/><ellipse cx="56" cy="31" rx="4" ry="4.6" fill="${I}"/>
      <circle cx="45.5" cy="29.5" r="1.4" fill="#fff"/><circle cx="57.5" cy="29.5" r="1.4" fill="#fff"/>
      <path d="M45 40 Q50 44 55 40" fill="none" ${P.s}/>
      ${P.spark(88, 14, 5)}${P.spark(12, 20, 4, P.pink)}`,

    // Мегафон-анонс
    "📣": (P) => `
      <path d="M22 66 L30 88 C31 91 36 91 37 88 L38 66 Z" fill="${P.blue}" ${P.S}/>
      <rect x="10" y="38" width="22" height="26" rx="5" fill="${P.blue}" ${P.S}/>
      ${P.stripes("v-megaphone", "M30 40 L76 16 V86 L30 62 Z", P.yellow, P.pink, 8)}
      <ellipse cx="76" cy="51" rx="7" ry="35" fill="${P.orange}" ${P.S}/>
      <rect x="40" y="40" width="26" height="18" rx="9" fill="#fff" ${P.s}/>
      ${P.eyes(53, 49, 11, 3.6)}
      <path d="M88 34 Q94 51 88 68 M94 24 Q102 51 94 78" fill="none" ${P.S}/>
      ${P.spark(90, 10, 5, P.lime)}`,

    // Камера: объектив — это глаз
    "📸": (P) => `
      <path d="M30 30 L36 20 H54 L60 30 Z" fill="${P.ink}" ${P.S}/>
      <rect x="8" y="28" width="84" height="56" rx="10" fill="${P.pink}" ${P.S}/>
      <path d="M8 70 H92 V74 C92 80 88 84 82 84 H18 C12 84 8 80 8 74 Z" fill="${P.violet}" ${P.S}/>
      <rect x="72" y="35" width="12" height="8" rx="2" fill="${P.yellow}" ${P.s}/>
      <circle cx="18" cy="38" r="3" fill="${P.red}" ${P.s}/>
      <circle cx="50" cy="57" r="22" fill="${P.ink}" ${P.S}/>
      <circle cx="50" cy="57" r="16" fill="#fff" ${P.s}/>
      <circle cx="52" cy="58" r="10" fill="${P.blue}" ${P.s}/>
      <circle cx="52" cy="58" r="5" fill="${I}"/><circle cx="55" cy="55" r="2.2" fill="#fff"/>
      <path d="M88 14 L96 8 M90 22 L98 22 M80 10 L82 2" ${P.S}/>
      ${P.spark(10, 14, 5, P.lime)}`,

    // Ракета на луну (вайбкоин)
    "🚀": (P) => `
      <circle cx="84" cy="14" r="10" fill="${P.yellow}" ${P.S}/><circle cx="80" cy="12" r="2.5" fill="${P.orange}"/><circle cx="87" cy="18" r="2" fill="${P.orange}"/>
      <g transform="rotate(42 50 54)">
        <path d="M38 78 C36 88 44 92 50 102 C56 92 64 88 62 78 Z" fill="${P.orange}" ${P.S}/>
        <path d="M44 78 C44 86 48 88 50 94 C52 88 56 86 56 78 Z" fill="${P.yellow}" ${P.s}/>
        <path d="M36 60 L22 78 L36 76 Z M64 60 L78 78 L64 76 Z" fill="${P.pink}" ${P.S}/>
        <path d="M50 8 C66 22 68 50 64 78 H36 C32 50 34 22 50 8 Z" fill="#fff" ${P.S}/>
        <path d="M50 8 C56 13 60 20 62 26 H38 C40 20 44 13 50 8 Z" fill="${P.red}" ${P.S}/>
        <path d="M36 66 H64" stroke="${P.violet}" stroke-width="5"/>
        <circle cx="50" cy="44" r="11" fill="${P.sky}" ${P.S}/>
      </g>
      ${P.eyes(48, 51, 8, 3)}
      ${P.spark(14, 14, 5, P.lime)}${P.spark(90, 52, 4)}`,

    // Пакеты с распродажи на ножках
    "🛍️": (P) => `
      <path d="M58 36 C58 18 78 18 78 36" fill="none" stroke="${I}" stroke-width="4" stroke-linecap="round"/>
      <rect x="48" y="34" width="40" height="52" rx="3" fill="${P.lime}" ${P.S}/>
      ${P.eyes(77, 74, 11, 3.8)}
      <path d="M24 44 C24 24 46 24 46 44" fill="none" stroke="${I}" stroke-width="4" stroke-linecap="round"/>
      ${P.checker("v-shopbag", "M12 42 H58 L62 90 H8 Z", P.ink, P.pink, 9)}
      <path d="M58 46 L68 52 L80 50 L80 62 L68 64 L58 58 Z" fill="${P.yellow}" ${P.s}/><circle cx="63" cy="52" r="1.8" fill="${I}"/>
      <text x="71" y="60" text-anchor="middle" font-size="9" font-weight="900" font-family="system-ui,sans-serif" fill="${I}">%</text>
      ${leg(24, 90, 20, 96, -1)}${leg(46, 90, 50, 96, 1)}
      ${P.spark(14, 18, 5)}${P.spark(92, 18, 4, P.pink)}`,

    // Рука с телефоном-селфи
    "🤳": (P) => `
      <path d="M28 100 C26 88 26 76 32 68 L68 64 C76 66 78 78 74 88 L72 100 Z" fill="${P.skin}" ${P.S}/>
      <path d="M26 92 H74" stroke="${P.violet}" stroke-width="7"/>
      <g transform="rotate(-10 50 46)">
        <rect x="28" y="8" width="44" height="76" rx="9" fill="${P.ink}" ${P.S}/>
        <rect x="32" y="16" width="36" height="60" rx="4" fill="${P.sky}"/>
        <circle cx="50" cy="44" r="13" fill="${P.skin}" ${P.s}/>
        <path d="M37 40 C37 28 63 28 63 40 C58 34 44 34 37 40 Z" fill="${P.brown}" ${P.s}/>
        <circle cx="45" cy="44" r="1.8" fill="${I}"/><circle cx="55" cy="44" r="1.8" fill="${I}"/>
        <path d="M45 49 Q50 54 55 49" fill="none" stroke="${I}" stroke-width="2" stroke-linecap="round"/>
        <path d="M40 76 C40 66 60 66 60 76 Z" fill="${P.pink}"/>
        <rect x="44" y="11" width="12" height="2.5" rx="1.2" fill="#fff" opacity=".5"/>
      </g>
      <ellipse cx="28" cy="62" rx="6" ry="10" transform="rotate(20 28 62)" fill="${P.skin}" ${P.S}/>
      <ellipse cx="76" cy="40" rx="7" ry="5" fill="${P.skin}" ${P.S}/><ellipse cx="77" cy="51" rx="7" ry="5" fill="${P.skin}" ${P.S}/><ellipse cx="76" cy="62" rx="7" ry="5" fill="${P.skin}" ${P.S}/>
      ${heart(86, 16, 0.2, P.red, 15)}${heart(12, 26, 0.14, P.pink, -15)}${heart(90, 30, 0.1, P.pink, 25)}`,

    // Стетоскоп слушает встревоженное сердце
    "🩺": (P) => `
      ${heart(64, 60, 0.75, P.red)}
      <path d="M54 52 Q58 49 61 52 M67 52 Q70 49 74 52" fill="none" ${P.s}/>
      <circle cx="58" cy="57" r="2.8" fill="${I}"/><circle cx="70" cy="57" r="2.8" fill="${I}"/>
      <path d="M58 70 Q64 66 70 70" fill="none" ${P.s}/>
      ${drop(84, 42, 1)}
      ${line("M16 10 C12 30 18 42 28 46 M40 10 C44 30 38 42 28 46", P.blue, 3)}
      ${line("M28 46 C26 70 30 90 42 86 C50 82 44 74 46 72", P.blue, 3)}
      <circle cx="16" cy="9" r="4" fill="${P.ink}"/><circle cx="40" cy="9" r="4" fill="${P.ink}"/>
      <circle cx="46" cy="68" r="9" fill="${P.yellow}" ${P.S}/><circle cx="46" cy="68" r="4" fill="${P.cream}" ${P.s}/>
      ${P.spark(88, 16, 5, P.lime)}`,

    // Зеркало «Образ дня. Оценивайте»
    "🪞": (P) => `
      ${leg(38, 82, 30, 94, -1, P.violet)}${leg(62, 82, 70, 94, 1, P.violet)}
      <path d="M40 12 C44 4 56 4 60 12 Z" fill="${P.pink}" ${P.S}/>
      <ellipse cx="50" cy="46" rx="32" ry="38" fill="${P.yellow}" ${P.S}/>
      <ellipse cx="50" cy="46" rx="23" ry="29" fill="${P.sky}" ${P.S}/>
      <path d="M34 34 L44 22 M34 44 L50 26" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".8"/>
      <path d="M36 44 L46 41 M56 40 L65 42" ${P.s}/>
      ${P.eyes(51, 50, 14, 4.2)}
      <path d="M46 62 H58" ${P.s}/>
      <path d="${star(36, 88, 5, 2.3)}" fill="${P.yellow}" stroke="${I}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="${star(50, 90, 5, 2.3)}" fill="${P.yellow}" stroke="${I}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="${star(64, 88, 5, 2.3)}" fill="#fff" stroke="${I}" stroke-width="1.8" stroke-linejoin="round"/>
      ${P.spark(88, 18, 5, P.lime)}`,

    // Растворяющееся лицо: был(а) недавно
    "🫥": (P) => `
      <path d="M50 12 A36 36 0 1 0 82 66" fill="${P.lilac}" opacity=".45"/>
      <path d="M50 12 A36 36 0 1 0 82 66" fill="none" stroke="${I}" stroke-width="3.5" stroke-dasharray="8 6" stroke-linecap="round"/>
      <path d="M50 12 A36 36 0 0 1 86 46" fill="none" stroke="${I}" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round" opacity=".6"/>
      <ellipse cx="38" cy="44" rx="4" ry="6" fill="${I}"/><ellipse cx="60" cy="44" rx="4" ry="6" fill="${I}" opacity=".7"/>
      <path d="M38 64 H48 M54 64 H58" stroke="${I}" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="78" y="70" width="8" height="8" fill="${P.lilac}" ${P.s}/>
      <rect x="88" y="60" width="6" height="6" fill="${P.lilac}" stroke="${I}" stroke-width="2" opacity=".6"/>
      <rect x="86" y="82" width="5" height="5" fill="${P.lilac}" stroke="${I}" stroke-width="2" opacity=".4"/>
      <rect x="94" y="74" width="3.5" height="3.5" fill="${I}" opacity=".25"/>
      <circle cx="20" cy="18" r="6" fill="#c9c4d6" ${P.s}/>`,

    // Лев в галстуке: «Лев не просит отпуск»
    "🦁": (P) => `
      <path d="${star(50, 44, 42, 30, 12)}" fill="${P.orange}" ${P.S}/>
      <circle cx="30" cy="22" r="7" fill="${P.yellow}" ${P.S}/><circle cx="70" cy="22" r="7" fill="${P.yellow}" ${P.S}/>
      <circle cx="50" cy="46" r="25" fill="${P.yellow}" ${P.S}/>
      <path d="M36 36 L46 40 M64 36 L54 40" ${P.S}/>
      <circle cx="42" cy="44" r="3.4" fill="${I}"/><circle cx="58" cy="44" r="3.4" fill="${I}"/>
      <path d="M44 52 H56 L50 58 Z" fill="${P.brown}" ${P.s}/>
      <path d="M50 58 V62 M42 62 Q50 68 58 62" fill="none" ${P.s}/>
      <path d="M34 74 L50 80 L66 74 L62 90 L50 84 L38 90 Z" fill="#fff" ${P.S}/>
      <path d="M46 80 H54 L56 86 L50 99 L44 86 Z" fill="${P.blue}" ${P.S}/>
      <path d="M46 88 L54 84 M46 93 L54 89" stroke="${P.yellow}" stroke-width="2"/>`,

    // Карьерная лестница в облака
    "🪜": (P) => {
      let r = "";
      for (let k = 1; k < 6; k++) { if (k === 4) continue; const t = k / 6, y = 96 - 90 * t; r += line(`M${24 + 30 * t} ${y} L${54 + 30 * t} ${y}`, P.pink, 3); }
      return `
      ${line("M22 96 L54 6", P.yellow, 5)}${line("M54 96 L86 6", P.yellow, 5)}
      ${r}
      <path d="M44 20 C36 20 34 10 42 8 C44 0 58 0 60 6 C66 2 76 4 76 10 C86 10 88 20 78 22 Z" fill="#fff" ${P.S}/>
      ${P.sleepy(60, 13, 10, 3.5)}
      <g transform="translate(42 54) rotate(-12)"><rect x="-8" y="-6" width="16" height="12" rx="2" fill="${P.brown}" ${P.s}/><path d="M-3 -6 V-9 H3 V-6" fill="none" ${P.s}/></g>
      ${P.spark(14, 30, 5, P.lime)}${P.spark(92, 36, 4)}`;
    },

    // График вниз: «это не просадка, это скидка»
    "📉": (P) => `
      <path d="M84 2 C80 6 88 10 84 14" fill="none" ${P.s}/>
      <path d="M92 22 C99 22 99 32 91 32" fill="none" ${P.S}/>
      <path d="M70 16 H94 L91 40 C90 43 88 44 86 44 H78 C76 44 74 43 73 40 Z" fill="${P.pink}" ${P.S}/>
      <ellipse cx="82" cy="16" rx="12" ry="3" fill="${P.brown}" ${P.s}/>
      <rect x="8" y="30" width="64" height="48" rx="6" fill="${P.cream}" ${P.S}/>
      <rect x="15" y="60" width="9" height="12" fill="${P.sky}" ${P.s}/><rect x="28" y="64" width="9" height="8" fill="${P.yellow}" ${P.s}/><rect x="41" y="68" width="9" height="4" fill="${P.pink}" ${P.s}/>
      ${P.sleepy(82, 26, 9, 3)}
      ${drop(64, 18, 0.8)}
      ${line("M14 40 L34 52 L46 44 L80 76", P.red, 6)}
      <path d="M90 86 L87 69 L73 83 Z" fill="${P.red}" ${P.S}/>
      ${leg(24, 78, 20, 90, -1)}${leg(52, 78, 56, 90, 1)}`,

    // Башня мечты: дождь мечты, цены мечты
    "🗼": (P) => `
      <path d="M50 4 V14" ${P.S}/><circle cx="50" cy="4" r="2.5" fill="${P.red}" ${P.s}/>
      <path d="M44 14 H56 L60 40 H40 Z" fill="${P.orange}" ${P.S}/>
      <path d="M36 40 H64 L74 66 H26 Z" fill="${P.orange}" ${P.S}/>
      <path d="M22 66 H78 L90 94 H66 C64 82 58 76 50 76 C42 76 36 82 34 94 H10 Z" fill="${P.orange}" ${P.S}/>
      <rect x="34" y="36" width="32" height="6" rx="2" fill="${P.pink}" ${P.s}/><rect x="22" y="62" width="56" height="7" rx="2" fill="${P.pink}" ${P.s}/>
      <path d="M45 20 L55 34 M55 20 L45 34" stroke="${I}" stroke-width="2" stroke-linecap="round"/>
      <rect x="37" y="45" width="26" height="15" rx="7" fill="#fff" ${P.s}/>
      ${P.eyes(50, 52, 11, 3.8)}
      <path d="M68 16 C68 8 92 6 94 16 C98 16 98 24 92 24 H70 C64 24 64 16 68 16 Z" fill="${P.sky}" ${P.s}/>
      <path d="M72 30 L70 36 M80 30 L78 36 M88 30 L86 36" stroke="${P.blue}" stroke-width="2.5" stroke-linecap="round"/>
      ${P.spark(14, 22, 5, P.lime)}`,

    // Гора: залезла ради одного кадра
    "🏔️": (P) => `
      <path d="M4 92 L36 30 L52 54 L66 34 L96 92 Z" fill="${P.violet}" ${P.S}/>
      <path d="M36 30 L46 48 L40 44 L34 50 L28 44 Z" fill="#fff" ${P.s}/>
      <path d="M66 34 L76 52 L70 48 L64 54 L58 48 Z" fill="#fff" ${P.s}/>
      <path d="M4 92 L36 30 L30 92 Z" fill="${P.blue}" ${P.s}/>
      ${P.eyes(66, 70, 12, 4)}${mouth(66, 80, 4)}
      <path d="M36 30 V10" ${P.S}/><path d="M36 10 L50 14 L36 19 Z" fill="${P.pink}" ${P.s}/>
      <rect x="78" y="10" width="16" height="12" rx="3" fill="${P.ink}" ${P.s}/><circle cx="86" cy="16" r="3.5" fill="${P.sky}" stroke="#fff" stroke-width="1.5"/>
      ${P.spark(14, 16, 5)}`,

    // Вода: выпила 4 литра, узнала весь офис по пути
    "💧": (P) => `
      <path d="M50 6 C62 26 80 44 80 62 C80 80 66 92 50 92 C34 92 20 80 20 62 C20 44 38 26 50 6 Z" fill="${P.sky}" ${P.S}/>
      <path d="M32 58 C32 48 38 40 42 36" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      ${P.eyes(52, 62, 16, 5)}
      <path d="M44 76 Q52 82 60 76" fill="none" ${P.s}/>
      ${P.cheeks(52, 72, 32, P.blue)}
      ${drop(86, 30, 1.2)}${drop(14, 82, 0.9)}${drop(88, 82, 0.7)}
      ${P.spark(16, 24, 5, P.lime)}`,

    // Бриллиант: алмазные руки, пустой холодильник
    "💎": (P) => `
      <path d="M22 36 L36 16 H64 L78 36 Z" fill="${P.sky}" ${P.S}/>
      <path d="M22 36 H78 L50 90 Z" fill="${P.blue}" ${P.S}/>
      <path d="M36 16 L42 36 L50 16 L58 36 L64 16 M42 36 L50 90 L58 36" fill="none" ${P.s}/>
      <path d="M28 34 L36 22" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
      ${P.eyes(50, 50, 13, 4)}
      <path d="M46 62 Q50 65 54 62" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      ${P.spark(14, 20, 6)}${P.spark(86, 14, 5, P.pink)}${P.spark(84, 66, 4.5, P.lime)}`,

    // Кит скупает — фонтан из монет
    "🐋": (P) => {
      const coin = (x, y, r = 5) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.9}" fill="${P.yellow}" ${P.s}/><path d="M${x} ${y - r * 0.45} V${y + r * 0.45}" stroke="${I}" stroke-width="1.8" stroke-linecap="round"/>`;
      return `
      ${coin(40, 26, 5)}${coin(30, 14, 4.5)}${coin(52, 12, 4.5)}${coin(42, 4, 3.8)}
      ${line("M40 38 C40 34 40 32 40 30", P.sky, 3)}
      <path d="M78 58 C84 50 86 40 92 34 C96 40 94 46 88 50 C96 50 98 58 94 62 C88 60 84 62 80 66 Z" fill="${P.blue}" ${P.S}/>
      <path d="M8 62 C8 46 22 36 44 36 C66 36 80 48 82 64 C84 80 66 90 44 90 C22 90 8 80 8 62 Z" fill="${P.blue}" ${P.S}/>
      <path d="M12 72 C24 84 54 88 74 78 C68 88 54 90 44 90 C28 90 16 84 12 72 Z" fill="${P.sky}" ${P.s}/>
      <path d="M22 78 L24 84 M32 81 L33 88 M44 82 V89 M56 81 L55 88" ${P.s}/>
      ${P.eyes(28, 58, 12, 4)}
      <path d="M14 70 Q22 74 30 70" fill="none" ${P.s}/>
      <path d="M58 52 Q62 48 66 52" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    },

    // Офис Корпорации: «мы не коллеги, мы семья»
    "🏢": (P) => {
      let w = "";
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) if (r !== 1) w += `<rect x="${33 + c * 12}" y="${30 + r * 12}" width="7" height="7" fill="${P.lilac}" stroke="${I}" stroke-width="2"/>`;
      return `
      <rect x="6" y="56" width="22" height="36" fill="${P.pink}" ${P.S}/><rect x="72" y="62" width="22" height="30" fill="${P.sky}" ${P.S}/>
      <path d="M11 64 H23 M11 74 H23 M77 70 H89 M77 80 H89" ${P.s}/>
      <rect x="26" y="20" width="48" height="72" fill="${P.violet}" ${P.S}/>
      ${w}
      <rect x="32" y="40" width="36" height="12" rx="6" fill="#fff" ${P.s}/>
      ${P.eyes(50, 46, 14, 3.6)}
      <path d="M42 92 V80 H58 V92" fill="${P.yellow}" ${P.S}/>
      <path d="M50 20 V14" ${P.S}/>
      ${heart(50, 8, 0.2, P.pink)}
      <path d="M2 92 H98" ${P.S}/>`;
    },

    // Утка идёт на работу, которая её не ценит
    "🦆": (P) => `
      <path d="M12 54 L22 50 C24 44 34 42 44 46 C42 30 50 18 62 18 C74 18 80 28 78 38 C80 46 86 56 84 66 C82 80 66 88 48 86 C30 84 18 76 16 66 Z" fill="${P.yellow}" ${P.S}/>
      <path d="M76 32 L94 34 C96 38 92 42 88 42 L76 42 Z" fill="${P.orange}" ${P.S}/>
      <path d="M78 37 H92" ${P.s}/>
      <circle cx="66" cy="30" r="4" fill="${I}"/><circle cx="67.4" cy="28.6" r="1.3" fill="#fff"/>
      <path d="M60 24 L70 22" ${P.s}/>
      <path d="M30 60 C36 54 52 54 58 62 C52 72 38 72 30 60 Z" fill="${P.orange}" opacity=".35" ${P.s}/>
      <path d="M42 86 V94 M58 84 V94" ${P.S}/>
      <path d="M36 95 L42 92 L48 95 Z M52 95 L58 92 L64 95 Z" fill="${P.orange}" ${P.s}/>
      <path d="M24 70 V64 H32 V70" fill="none" ${P.s}/>
      <rect x="16" y="70" width="24" height="16" rx="3" fill="${P.brown}" ${P.S}/>
      <path d="M16 77 H40" ${P.s}/>
      ${P.spark(90, 14, 4.5, P.lime)}`,
  });
})();
