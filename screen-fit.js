/* ============================================================
   Vibe Fit — фитнес-браслет. Вкладка «fit».
   Показывает всё тело персонажа (body.js) и даёт на него влиять:
   сон, еда, шаги и тренировка, настроение, здоровье.
   Обновляется на месте: подписка Vibe.body.on + тик каждую секунду (= игровая минута).
   Стиль: финтех-референс — чёрный / кислотный лайм / электрик-фиолет,
   точечные (dot-matrix) графики, толстый донат с орбитой иконок.
   ============================================================ */
(function () {
  const V = Vibe;
  const S = () => V.state.get();
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const r0 = (v) => Math.round(v || 0);
  const comma = (n) => String(n).replace(".", ",");
  const dayNow = () => Math.floor(V.game.minutes() / 1440);
  const dom = (d) => (((d % 30) + 30) % 30) + 1;
  const hhmm = (m) => { const mm = Math.floor(((m % 1440) + 1440) % 1440); return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`; };
  const dur = (mins) => { mins = Math.max(0, Math.round(mins)); const h = Math.floor(mins / 60), m = mins % 60; return h ? `${h} ч ${m} мин` : `${m} мин`; };
  const meta = () => S().fitMeta || {};
  const setMeta = (p) => V.state.set({ fitMeta: Object.assign({}, meta(), p) });

  const WORKOUT_CD = 180;   // игровых минут между тренировками
  const MEDITATE_CD = 60;   // игровых минут между медитациями
  const goal = () => (V.body && V.body.STEP_GOAL) || 8000;
  const MX_ROWS = 10;                    // строк в точечных графиках
  const stepUnit = () => goal() / 8;     // одна строка точек = 1/8 цели (цель — 8-я строка)

  // Шрифт для больших цифр (кириллица есть). Грузим один раз.
  if (!document.querySelector("link[data-fit-font]")) {
    const lk = document.createElement("link");
    lk.rel = "stylesheet"; lk.dataset.fitFont = "1";
    lk.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap";
    document.head.appendChild(lk);
  }

  /* ---------- Часы: что видит Vibe Fit ----------
     0 — только телефон (примерные шаги и «ты вроде устал?»)
     1 — Vibe Band: шаги, пульс, сон
     2 — Vibe Watch: всё (продуктивность, питание, настроение, здоровье, стресс)
     3 — Vibe Watch Ultra: всё + прогноз выгорания и золотой безель */
  const hasI = (id) => !!(V.inv && V.inv.has(id));
  const tierNow = () => hasI("watch_ultra") ? 3 : hasI("watch_pro") ? 2 : (hasI("watch_band") || hasI("mk-watch")) ? 1 : 0;
  let T = 0; // фиксируется на рендере экрана
  const DEV = [
    { n: "Телефон", brand: "📱 Телефон в кармане · без часов", cls: "dev-phone" },
    { n: "Vibe Band", brand: "Vibe Band · live", cls: "dev-band" },
    { n: "Vibe Watch", brand: "Vibe Watch · live", cls: "dev-watch" },
    { n: "Vibe Watch Ultra", brand: "Vibe Watch Ultra · live", cls: "dev-ultra" },
  ];
  const BUY = {
    1: { id: "watch_band", n: "Vibe Band", price: 4990 },
    2: { id: "watch_pro", n: "Vibe Watch", price: 19990 },
  };
  const HOOK = {
    sleep: "Купи Vibe Band — и узнаешь, почему ты так плохо спишь",
    sleepwhy: "Почему такой сон? Телефон не знает. Он сам спал в беззвучном",
    steps: "Телефон думает, что ты {прошёл|прошла} 3 000. Или 4 000. Или это ты в метро трясся",
    prod: "Начальник уже видит твою продуктивность. А ты — нет. Часы покажут первым",
    food: "Ты точно ешь «сбалансированно»? Часы посчитают каждую шаурму",
    mood: "Как ты себя чувствуешь? Не отвечай. Часы ответят точнее",
    health: "Здоровье — это 35% сон, 30% еда и 100% часы, которых у тебя нет",
  };
  const approx = (n) => Math.max(0, Math.round((n || 0) / 1000) * 1000);
  const fuzzyTired = (b) => b.sleeping ? "Телефон лежит неподвижно. Спишь? Или просто понедельник"
    : b.energy < 25 ? "Ты вроде устал? 🥱" : b.energy < 50 ? "Ты вроде… норм? Или нет? 🤔"
    : b.energy < 75 ? "Кажется, бодрячком? Не точно 🤷" : "Вроде бодр. Наверное 🙃";
  const cdTxt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  // Пейволл поверх размытого блока. need: 1 — Band, 2 — Watch
  function paywall(key, need, big) {
    const up = need === 2 && T === 1;
    const P = BUY[need];
    return `<div class="fit-pw ${big ? "big" : ""}">
      <div class="fit-pw-top"><span class="emo wobble">${need === 1 ? "📿" : "⌚"}</span><span class="fit-pill lime sm">🔒 ${up ? "Апгрейд до Watch: +4 метрики" : "Нужен " + P.n}</span></div>
      <b>${HOOK[key]}</b>
      ${big ? `<small>👥 92% пользователей Vibe уже носят часы. Остальные 8% — ты</small>
      <div class="fit-pw-cd">⏳ скидка 15% сгорит через <b data-cd>02:00</b></div>` : ""}
      <button class="btn lime block fit-pw-btn" data-go="market" data-params='${JSON.stringify({ cat: "watch", open: P.id })}'>⌚ ${up ? "Апгрейд" : "Купить"} ${P.n} · ${V.rub(P.price)}</button>
    </div>`;
  }
  const lock = (key, need, inner, big) => T >= need ? inner
    : `<div class="fit-lock ${big ? "big" : ""}"><div class="fit-lock-body" aria-hidden="true" inert>${inner}</div>${paywall(key, need, big)}</div>`;
  // Стресс и выгорание — те же цифры, что в body.js (одна модель на всю игру)
  function burnout(b) {
    const si = V.body.stress();
    if (si.burnedOut) return "уже. Больничный, работа на паузе 🛌";
    const log = b.stressLog || [];
    const trend = log.length >= 2 ? (log[log.length - 1].v - log[0].v) / (log.length - 1) : 0;
    if (trend <= 0.5) return si.value >= 65 ? "стресс высокий, но не растёт. Пока 🫠" : "не скоро. Подозрительно 😎";
    const days = Math.max(1, Math.ceil((90 - si.value) / trend));
    return days <= 3 ? `через ${days} дн. Уже пора в отпуск 🔥` : `через ~${days} дн. Держись 🫠`;
  }

  /* ---------- Тонкие иконки ---------- */
  const svgI = (d) => `<svg class="fit-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = { ne: svgI("M7 17L17 7M9 7h8v8"), sw: svgI("M17 7L7 17M15 17H7V9"), chev: svgI("M9 5l7 7-7 7"), up: svgI("M12 19V5M6 11l6-6 6 6"), down: svgI("M12 5v14M6 13l6 6 6-6") };

  /* ---------- Подписи и оценки ---------- */
  const nutrLabel = (n) => n < 35 ? { t: "Фастфуд-марафон", e: "🍟" }
    : n < 55 ? { t: "Так себе", e: "🥪" }
    : n < 80 ? { t: "Сбалансированно", e: "🥗" }
    : { t: "Как у фитнес-блогера", e: "🥑" };
  const healthLabel = (h) => h < 35 ? "Хрупкий, как твой бюджет" : h < 60 ? "Живой. Пока" : h < 80 ? "Нормальный" : "Железный";
  const moodFace = (m) => m < 20 ? "😭" : m < 40 ? "😕" : m < 60 ? "😐" : m < 80 ? "🙂" : "🤩";
  const moodText = (m) => m < 20 ? "Дно. Но снизу постучали" : m < 40 ? "Так себе вайб" : m < 60 ? "Ровно. Как гречка" : m < 80 ? "Хороший вайб" : "Эйфория! Подозрительно";
  const bpmZone = (bpm) => bpm < 62 ? "дзен" : bpm < 75 ? "спокойствие" : bpm < 90 ? "лёгкий стресс" : bpm < 110 ? "кардио" : "паника";
  function verdict(p, b) {
    if (b.sleeping) return "Ты спишь. Продуктивность 0% — как у всех на планёрке 😴";
    if (b.sick) return "Болеешь: продуктивность ×0,5. Начальник «очень сочувствует» 🤒";
    if (p >= 85) return "Машина. Начальник плачет от счастья 🚀";
    if (p >= 65) return "Рабочий режим. Премия смотрит на тебя с интересом 💼";
    if (p >= 45) return "Работаешь на полшишечки. Премия — тоже 🫠";
    return "Ты сейчас как Wi-Fi в метро. Вроде есть, но толку ноль 📉";
  }

  /* ---------- Вайбот: хитрый совет по данным ---------- */
  function insight(b) {
    if (T === 0) {
      const L = ["Я вижу только, что телефон куда-то ходил. Купи Vibe Band — увижу тебя целиком 💜",
        "Без часов я как мама по телефону: «ты там вроде устал?» Хочешь точнее — Vibe Band",
        "92% пользователей Vibe уже знают свой пульс. Ты пока знаешь только баланс"];
      return L[Math.floor(V.game.minutes() / 30) % L.length];
    }
    if (T === 1 && (b.nutrition < 40 || b.mood < 35)) return "Что-то с питанием или настроением. Что именно — знает Vibe Watch. Я лишь чувствую";
    const last = (b.sleepLog || []).slice(-1)[0];
    const h = V.game.info().hour;
    const sq = V.body.sleepQuality(b);
    if (b.sick) return "Ты болеешь, а всё ещё читаешь браслет. Иди к врачу, герой. Vibe Health уже греет стетоскоп";
    if (b.sleeping) return "Ты спишь, а я считаю твои вдохи. Это забота, а не слежка. Наверное";
    if (b.energy < 20) return `Энергия ${r0(b.energy)}%. Даже твой телефон в такой ситуации ушёл бы на зарядку`;
    if (b.food < 20) return "Желудок урчит громче, чем твои амбиции. Поешь. Можно у нас 😉";
    if (b.nutrition < 40) return "Ты ешь как студент. Потому что ты и есть студент?";
    if (last && last.hours < 6) return `Спал ${comma(last.hours)} ч. Кофе — не замена сна, а кредит под 300% годовых`;
    if (sq.q < 0.62) return "Сосед Валера снова победил. Может, пора переехать? Vibe Rent как раз рядом";
    if (b.steps < 2000 && h >= 15) return `${V.fmt(b.steps)} шагов к ${h}:00. Робот-пылесос прошёл больше`;
    if (b.mood < 35) return "Настроение на нуле. Помогает медитация. Или шопинг. Мы, конечно, за шопинг";
    if (S().balance < 0) return "Минус на счёте поднимает пульс лучше любого кардио. Бесплатно!";
    if ((b.fridge || 0) === 0) return "Холодильник пуст, как обещания арендодателя. Загляни в Supermarket";
    return "Все показатели в норме. Подозрительно. Ты точно человек?";
  }

  /* ---------- Точечная матрица (dot-matrix) ----------
     Колонка = день, 2 точки в ширину, строка = единица значения.
     Половинка единицы — горит только левая точка. */
  const dotOn = (r, s, f) => r < Math.floor(f) || (r === Math.floor(f) && s === 0 && f - Math.floor(f) >= 0.5);
  function matrix(cols, rows, goalRow) {
    const n = cols.length;
    return `<div class="fit-mx" style="--rows:${rows};${goalRow ? `--goal:${goalRow}` : ""}">
      ${goalRow ? `<div class="fit-mx-goal"><b>цель</b></div>` : ""}
      ${cols.map((c, ci) => {
        let dots = "";
        for (let r = rows - 1; r >= 0; r--) {
          for (let s = 0; s < 2; s++) {
            const on = dotOn(r, s, c.fill || 0);
            dots += `<i class="${on ? "on" : ""}" style="--d:${ci * 70 + r * 45}ms"${c.live ? ` data-r="${r}" data-s="${s}"` : ""}></i>`;
          }
        }
        const side = ci < 2 ? " l" : ci > n - 3 ? " r" : "";
        return `<div class="fit-mx-col ${c.cls || ""}"${c.live ? " data-todaycol" : ""}${c.title ? ` title="${V.esc(c.title)}"` : ""}>
          ${c.peak ? `<b class="fit-mx-peak${side}">${c.peak}</b>` : ""}
          <div class="fit-mx-dots">${dots}</div>
          <small>${c.lbl}</small>${c.sub ? `<em>${c.sub}</em>` : ""}
        </div>`;
      }).join("")}
    </div>`;
  }

  function sleepChart(log) {
    const L = (log || []).slice(-7);
    if (!L.length) return `<div class="fit-empty dark">🌙 Пока ни одной ночи. Браслет ждёт, когда ты наконец ляжешь</div>`;
    let bi = 0; L.forEach((x, i) => { if (x.hours >= L[bi].hours) bi = i; });
    const pad = Array.from({ length: 7 - L.length }, () => ({ fill: 0, lbl: "—", cls: "ghost" }));
    const cols = L.map((x, i) => ({
      fill: Math.min(MX_ROWS, x.hours),
      lbl: (x.auto ? "🤖" : "") + dom(x.day),
      sub: r0(x.q * 100) + "%",
      cls: i === bi ? "best" : x.hours < 6 ? "low" : "",
      peak: i === bi ? `${comma(x.hours)} ч <span>лучший сон</span>` : "",
      title: x.why || "",
    }));
    return matrix(pad.concat(cols), MX_ROWS) +
      `<div class="fit-keys"><span><i class="k-on"></i>часы сна</span><span><i class="k-best"></i>лучшая ночь</span><span><i class="k-low"></i>недосып</span><span>1 точка = 1 ч</span></div>`;
  }
  function stepsChart(log, day) {
    const L = (log || []).filter((x) => x.day !== day).slice(-6);
    const G = goal(), U = stepUnit();
    let bi = -1; L.forEach((x, i) => { if (x.steps > 0 && (bi < 0 || x.steps >= L[bi].steps)) bi = i; });
    const pad = Array.from({ length: 6 - L.length }, () => ({ fill: 0, lbl: "—", cls: "ghost" }));
    const cols = pad.concat(L.map((x, i) => ({
      fill: Math.min(MX_ROWS, x.steps / U),
      lbl: dom(x.day),
      sub: comma((x.steps / 1000).toFixed(1)) + "k",
      cls: x.steps >= G ? "goal" : "",
      peak: i === bi ? `${comma((x.steps / 1000).toFixed(1))}k <span>рекорд</span>` : "",
    })));
    cols.push({ fill: 0, lbl: "сег", sub: `<span data-t="stoday">0,0</span>k`, cls: "today", live: true });
    return matrix(cols, MX_ROWS, 8) +
      `<div class="fit-keys dark"><span><i class="k-w"></i>шаги</span><span><i class="k-on"></i>цель взята</span><span><i class="k-vio"></i>сегодня</span><span>1 точка = ${V.fmt(U)}</span></div>`;
  }

  /* ---------- Куски, которые перерисовываются при изменении ---------- */
  function wakeHtml(b) {
    if (!b.sleeping) return "";
    const h = Math.floor(V.game.minutes() / 60) % 24;
    const night = h >= 18 || h < 6;
    return `${night ? `<button class="btn black xl block fit-wake" data-act="skipnight">⏩ Проспать до утра</button>` : ""}<button class="btn lime xl block fit-wake" data-act="wake">☀️ Проснуться</button>`;
  }
  // Сколько игровых часов спать до 07:00 (но проснуться за час до ближайшего события)
  function hoursToMorning() {
    const m = V.game.minutes();
    let target = Math.floor(m / 1440) * 1440 + 7 * 60;
    if (target <= m) target += 1440;
    const ev = V.sched && V.sched.upcoming ? V.sched.upcoming(5).map((e) => V.sched.startMin(e)).filter((x) => x > m) : [];
    if (ev.length) target = Math.min(target, Math.min(...ev) - 60);
    return Math.max(0, (target - m) / 60);
  }
  function lastSleepHtml(b) {
    const last = (b.sleepLog || []).slice(-1)[0];
    if (!last) return `<div class="fit-ls"><div class="fit-n fit-ls-n">—</div><div class="fit-ls-t"><b>Ты ещё не спал</b><small>Браслет не видел твой сон. Это тревожно</small></div></div>`;
    const [hi, lo] = comma(last.hours.toFixed(1)).split(",");
    return `<div class="fit-ls">
      <div class="fit-n fit-ls-n">${hi}<small>,${lo} ч</small></div>
      <div class="fit-ls-t"><b>Прошлый сон</b>
      <small>${last.hours >= 7 ? "Выспался. Редкое достижение" : last.hours >= 5 ? "Жить можно. Но не хочется" : "Это был не сон, а перезагрузка"}${last.auto ? " · автопилот 🤖" : ""}</small></div>
      <span class="fit-pill lime">${r0(last.q * 100)}%</span>
    </div>`;
  }
  function sleepNowHtml(b, now) {
    if (!b.sleeping) return "";
    const mins = now - b.sleeping.at;
    return `<div class="fit-sleepnow">
      <div class="fit-sn-top"><span class="fit-bubble vio"><span class="emo float">💤</span></span><div><b>Спишь ${dur(mins)}</b><small>${T ? `Качество ${r0(b.sleeping.q * 100)}%` : "Качество ? · без браслета не видно"} · энергия копится</small></div></div>
      <div class="fit-line dark"><i style="--p:${r0(b.energy)}%"></i></div>
      <small class="fit-sn-sub">⚡ ${r0(b.energy)}% · проснёшься сам на 100%, если уже утро</small>
    </div>`;
  }
  function sleepActHtml(b) {
    if (b.sleeping) return `<button class="btn lime block" data-act="wake">☀️ Проснуться</button>`;
    const home = V.body.atHome();
    return `<button class="btn black block fit-sleepbtn" data-act="sleep">🌙 Лечь спать${b.energy > 85 ? ` <span class="fit-pill lime sm">бодр</span>` : ""}</button>
      ${home ? "" : `<button class="btn block fit-mt" data-go="maps">🗺️ Ты не дома · доехать в Vibe Maps ${IC.chev}</button>`}`;
  }
  function upsellHtml(sq) {
    const h = S().home || {};
    if (h.own) return `<div class="fit-upsell lime"><span class="fit-bubble"><span class="emo float">🏡</span></span><div><b>Своя квартира — сон на максимуме</b><small>Валера остался в прошлой жизни. Иногда ты по нему даже скучаешь</small></div></div>`;
    const tgt = (!h.rent || h.rent <= 45000)
      ? { q: 0.86, t: "нормальной квартире", go: "rent", btn: "🔑 Смотреть квартиры" }
      : { q: 0.95, t: "своей квартире", go: "home-buy", btn: "🏠 Купить жильё" };
    if (sq.q >= tgt.q - 0.02) return `<div class="fit-upsell white"><span class="fit-bubble"><span class="emo float">${sq.e}</span></span><div><b>Сон и так на уровне</b><small>Качество ${r0(sq.q * 100)}%. Дальше только своя квартира и беруши из золота</small></div><button class="fit-round" data-go="home-buy" aria-label="Купить жильё">${IC.ne}</button></div>`;
    const n = Math.max(3, r0(((tgt.q - sq.q) / sq.q) * 100));
    return `<div class="fit-upsell big">
      <div class="fit-up-top"><span class="fit-pill lime">Жильё → сон</span><span class="emo wobble">${sq.e}</span></div>
      <div class="fit-up-num"><span class="fit-n">+${n}<small>%</small></span><b>сна в квартире получше</b></div>
      <div class="fit-up-bars">
        <div><small>Сейчас</small><div class="fit-line dark"><i style="--p:${r0(sq.q * 100)}%"></i></div><b>${r0(sq.q * 100)}%</b></div>
        <div><small>В ${tgt.t}</small><div class="fit-line dark"><i class="lime" style="--p:${r0(tgt.q * 100)}%"></i></div><b>${r0(tgt.q * 100)}%</b></div>
      </div>
      <small class="fit-up-sub">Жильё решает, а не мелатонин</small>
      <div class="fit-up-btns"><button class="btn lime" data-go="${tgt.go}">${tgt.btn} ${IC.ne}</button>${tgt.go === "rent" ? `<button class="btn" data-go="home-buy">🏠 Или своё</button>` : ""}</div>
    </div>`;
  }
  function mealsHtml(b, day) {
    const M = (b.meals || []).filter((m) => m.day === day);
    if (!M.length) return `<div class="fit-empty">🥺 Сегодня ты ещё ничего не ел. Вайбот волнуется и уже открыл Vibe Eat</div>`;
    return M.slice().reverse().map((m) => `
      <div class="fit-meal"><span class="fit-sq"><span class="emo">${m.e}</span></span><div><b>${V.esc(m.t)}</b><small>${hhmm(m.min)}</small></div>
      <span class="fit-pill ${m.q >= 70 ? "lime" : m.q >= 45 ? "" : "vio"}">${m.q >= 70 ? "полезно" : m.q >= 45 ? "сойдёт" : "грешно"}</span></div>`).join("");
  }
  function fridgeHtml(b) {
    const n = b.fridge || 0;
    const items = ["🥚", "🥦", "🍗", "🧀", "🥕", "🍅", "🥛", "🫑", "🍝", "🐟"];
    return `<div class="fit-fridge ${n ? "" : "empty"}">
      <div class="fit-fr-door"><small>порций</small><b class="fit-n">${n}</b></div>
      <div class="fit-fr-shelf">${n ? Array.from({ length: Math.min(n, 10) }, (_, i) => `<span class="emo">${items[i % items.length]}</span>`).join("") + (n > 10 ? `<small>+${n - 10}</small>` : "") : `<small>Пусто. Только лампочка и эхо</small>`}</div>
    </div>`;
  }
  function foodActHtml(b) {
    const n = b.fridge || 0;
    return `<div class="fit-acts">
      ${n ? `<button class="btn lime block" data-act="cook">🍳 Приготовить из холодильника</button>`
          : `<button class="btn lime block" disabled>🍳 Приготовить — холодильник пуст</button><button class="btn block" data-go="supermarket">🥑 В Supermarket за продуктами ${IC.chev}</button>`}
      <div class="grid2"><button class="btn vio" data-go="eat">🍜 Заказать еду</button><button class="btn black" data-act="vend">🍫 Автомат · 159 ₫</button></div>
    </div>`;
  }
  function workoutHtml(b, now) {
    const left = WORKOUT_CD - (now - (b.workoutAt ?? -9999));
    if (left > 0) return `<button class="btn block" disabled>🏋️ Мышцы отдыхают · ещё ${dur(left)}</button>`;
    if (!T) return `<button class="btn lime xl block fit-wo-btn" data-act="workout">🏋️ Тренировка вслепую · без оценки</button>
      <div class="fit-wo-lim">🔒 Без браслета точность не считается: максимум 40% и меньше вайбиков. <button data-go="market" data-params='${JSON.stringify({ cat: "watch", open: "watch_band" })}'>Vibe Band ${IC.chev}</button></div>`;
    return `<button class="btn lime xl block fit-wo-btn" data-act="workout">🏋️ Тренировка · 15 сек ${IC.ne}</button>`;
  }
  function moodActHtml(now, day) {
    const m = meta();
    const medLeft = MEDITATE_CD - (now - (m.medAt ?? -9999));
    const momDone = m.momDay === day;
    return `<div class="grid2">
      ${medLeft > 0 ? `<button class="btn" disabled>🧘 Дзен через ${dur(medLeft)}</button>` : `<button class="btn black" data-act="meditate">🧘 Медитация</button>`}
      ${momDone ? `<button class="btn" disabled>📞 Мама на сегодня ✓</button>` : `<button class="btn vio" data-act="mom">📞 Позвонить маме</button>`}
    </div>`;
  }
  function dropsHtml(b) {
    const s = S();
    const D = [
      { e: "🧾", t: "Счета", on: false },
      { e: "🍽️", t: "Голод", on: b.food < 20 },
      { e: "🥱", t: "Усталость", on: b.energy < 20 },
      { e: "📉", t: "Минус на счёте", on: s.balance < 0 },
    ];
    return D.map((d) => `<span class="fit-chip ${d.on ? "hot" : ""}">${d.e} ${d.t}${d.on ? " · сейчас" : ""}</span>`).join("");
  }
  function sickHtml(b) {
    if (!b.sick) return "";
    return `<div class="fit-sick">
      <span class="fit-pill lime fit-sick-st">×0,5</span>
      <span class="emo wobble" style="font-size:56px">🤒</span>
      <div class="fit-h2" style="margin:6px 0 4px">Ты заболел</div>
      <p>Продуктивность ×0,5. Сон и врач помогут. Чай с лимоном — нет, но попробовать стоит</p>
      <button class="btn lime block" data-go="health">💊 В Vibe Health ${IC.ne}</button>
    </div>`;
  }

  /* ---------- Экран ---------- */
  V.screen("fit", {
    render() {
      if (!V.body) return `<div class="head"><div class="title">Vibe Fit</div></div><div class="card">Браслет не подключён. Как и ты к реальности</div>`;
      V.body.tick();
      T = tierNow();
      const b = V.body.get();
      const g = V.game.info();
      const D = DEV[T];
      const ring = (k, c, r) => `
        <circle class="fit-rt" cx="120" cy="120" r="${r}" stroke="${c}"/>
        <circle class="fit-rf" data-ring="${k}" cx="120" cy="120" r="${r}" stroke="${c}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>`;
      // Донат: сегменты рисуются накопительно, сверху — первый (энергия)
      const SEG = [["⚡", "Энергия", 40, "#5b3cff"], ["🍔", "Сытость", 20, "#0d0d0f"], ["😊", "Настроение", 25, "#ffffff"], ["❤️", "Здоровье", 15, "#a897ff"]];
      const seg = (i) => `<circle class="fit-seg" data-seg="${i}" cx="130" cy="130" r="98" stroke="${SEG[i][3]}" pathLength="100" stroke-dasharray="0 100"/>`;
      const tile = (k, i) => `
        <div class="fit-pt"><div class="fit-pt-h"><span class="fit-dot" style="background:${SEG[i][3]}"></span><small>${SEG[i][1]} · ${SEG[i][2]}%</small></div>
        <b class="fit-n" data-t="pv-${k}">0</b><div class="fit-line"><i data-b="p-${k}" style="background:${i === 2 ? "#0d0d0f" : SEG[i][3]}"></i></div></div>`;
      return `
      <div class="head">
        <div class="title" style="font-size:26px">Vibe Fit<small>${T ? (T >= 2 ? "Часы, которые знают о тебе всё. Даже лишнее" : "Браслет знает многое. Часы — всё") : "Без часов я знаю о тебе мало. Это больно нам обоим"}</small></div>
        ${V.ui.vibikiPill()}
      </div>

      <div class="stagger">
        <!-- Браслет / часы / телефон -->
        ${T ? "" : `<div class="fit-hero ${D.cls}" data-face>
          <div class="fit-h-top"><span class="fit-h-brand"><i></i>${D.brand}</span><span class="fit-time" data-t="time">${g.time}</span></div>
          <div class="fit-h-mid" data-act="phone">
            <div class="fit-phone"><i class="fit-ph-notch"></i><div class="fit-ph-scr"><span class="emo">👟</span><b class="fit-n" data-t="pscr">≈0</b><small>шагов?</small></div></div>
            <div class="fit-h-bpm">
              <small>Шаги · примерно</small>
              <div class="fit-bpm"><b class="fit-n" data-t="papprox">≈0</b></div>
              <span class="fit-zone"><i></i>телефон в кармане — плюс-минус 1000</span>
              <div class="fit-fuzzy" data-t="fuzzy">${fuzzyTired(b)}</div>
            </div>
          </div>
          <div class="fit-legend">
            ${[["❤️", "Пульс"], ["😴", "Сон"], ["💼", "Работа"]].map(([e, t]) => `<button class="fit-lg locked" data-go="market" data-params='${JSON.stringify({ cat: "watch", open: "watch_band" })}'><i></i><small>${e} ${t}</small><b class="fit-n">🔒 ?</b></button>`).join("")}
          </div>
          <button class="btn lime block fit-ph-cta" data-go="market" data-params='${JSON.stringify({ cat: "watch", open: "watch_band" })}'>📿 Надень Vibe Band — и я увижу тебя целиком · ${V.rub(4990)}</button>
        </div>`}
        ${T ? `<div class="fit-hero ${D.cls}" data-face>
          <div class="fit-h-top"><span class="fit-h-brand"><i></i>${D.brand}</span><span class="fit-time" data-t="time">${g.time}</span></div>
          <div class="fit-h-mid" data-act="heart">
            <div class="fit-ringbox">
              <span class="fit-pod" aria-hidden="true"></span>${T === 3 ? `<span class="fit-ultra-tag">ULTRA</span>` : ""}
              <svg class="fit-rings" viewBox="0 0 240 240" aria-hidden="true">
                ${ring("e", "#d7ff2f", 104)}${ring("f", "#6b4dff", 82)}${ring("s", "#ffffff", 60)}
              </svg>
              <div class="fit-ring-c"><span class="fit-heart">❤️</span><span class="fit-zz">😴</span></div>
              <div class="fit-zzz"><span>z</span><span>z</span><span>Z</span></div>
            </div>
            <div class="fit-h-bpm">
              <small>Пульс сейчас</small>
              <div class="fit-bpm"><b class="fit-n" data-t="bpm">${V.body.heartRate(b)}</b><span>уд/мин</span></div>
              <span class="fit-zone"><i></i><span data-t="zone">—</span></span>
              <div class="fit-ecg">${Array.from({ length: 12 }, (_, i) => `<i style="--k:${i}"></i>`).join("")}</div>
            </div>
          </div>
          <div class="fit-legend">
            <button class="fit-lg" data-act="ring" data-e="⚡"><i style="background:#d7ff2f"></i><small>Энергия</small><b class="fit-n" data-t="le">0%</b></button>
            <button class="fit-lg" data-act="ring" data-e="🍔"><i style="background:#6b4dff"></i><small>Еда</small><b class="fit-n" data-t="lf">0%</b></button>
            <button class="fit-lg" data-act="ring" data-e="👟"><i style="background:#fff"></i><small>Движение</small><b class="fit-n" data-t="ls">0%</b></button>
          </div>
        </div>` : ""}
        <div data-c="wake"></div>
        <div class="fine" style="text-align:center">${T ? "Пульс измерен приблизительно. Как и всё в твоей жизни." : "Без часов Vibe Fit видит тебя через карман. Мутно, но с любовью."} <span data-t="date">${g.label}</span></div>

        <!-- Продуктивность -->
        <section class="fit-band lime">
          <div class="fit-bh"><h2 class="fit-h2">Продуктивность</h2><span class="fit-pill dark">💼 для работы</span></div>
          ${lock("prod", 2, `<div class="fit-donut">
            <svg viewBox="0 0 260 260" aria-hidden="true">
              <circle class="fit-seg-track" cx="130" cy="130" r="98"/>
              ${seg(3)}${seg(2)}${seg(1)}${seg(0)}
            </svg>
            ${SEG.map((s, i) => `<div class="fit-bub" data-bub="${i}"><button data-act="ring" data-e="${s[0]}" aria-label="${s[1]}" style="--bc:${s[3]}"><span class="emo">${s[0]}</span></button></div>`).join("")}
            <div class="fit-donut-c">
              <small>Итого</small>
              <div class="fit-n fit-prod-num"><span data-t="prod" data-val="0">0</span><small data-t="prodd">,0%</small></div>
              <span class="fit-donut-emo emo float" data-t="prodemo">🚀</span>
            </div>
          </div>
          <div class="fit-pts">${tile("e", 0)}${tile("f", 1)}${tile("m", 2)}${tile("h", 3)}</div>
          <div class="fit-verdict"><span data-t="verdict"></span></div>
          <div class="fit-xtra">
            <span>🧠 Стресс <b class="fit-n" data-t="stress">—</b></span>
            ${T === 3 ? `<span class="gold">🔥 Прогноз выгорания: <b data-t="burn">—</b></span>` : ""}
          </div>`, true)}
          <div class="fit-band-note">Влияет на премию за рабочие задачи</div>
        </section>

        <!-- Сон -->
        <section class="fit-band vio">
          <div class="fit-bh"><h2 class="fit-h2">Сон · 7 ночей</h2><span class="fit-pill glass" data-t="sq">${T ? "—" : "🔒 качество ?"}</span></div>
          ${lock("sleep", 1, `<div data-c="lastsleep"></div>
          <div data-c="sleepchart" class="fit-mt"></div>`, true)}
          <div class="fit-sheet">
            ${lock("sleepwhy", 1, `<div class="fit-why"><span class="fit-sq big"><span class="emo" data-t="sqe">🛏️</span></span><div><b>Почему такой сон</b><small data-t="why"></small></div></div>
            <div class="fit-why-note">Качество сна зависит от жилья. Переезд = буст сна ${IC.up}</div>`)}
            <div data-c="sleepnow"></div>
            <div data-c="sleepact" class="fit-mt"></div>
          </div>
          <div data-c="upsell" class="fit-mt"></div>
        </section>

        <!-- Еда -->
        <div class="fit-bh plain"><h2 class="fit-h2">Еда и питание</h2><span class="fit-pill" data-t="mealsn">0 приёмов</span></div>
        ${lock("food", 2, `<div class="fit-tiles">
          <div class="fit-tile ink">
            <div class="fit-tile-h"><span>Сытость</span>${IC.ne}</div>
            <div class="fit-n fit-tile-n"><span data-t="food" data-val="0">0</span><small>%</small></div>
            <div class="fit-line dark"><i class="lime" data-b="food"></i></div>
          </div>
          <div class="fit-tile vio" data-c="nutr"></div>
        </div>`)}
        <div class="fit-sheet solo">
          <div class="fit-sub">Сегодня ты съел</div>
          <div data-c="meals" class="fit-meals"></div>
          <div class="fit-sub">Холодильник</div>
          <div data-c="fridge"></div>
          <div data-c="foodact"></div>
        </div>

        <!-- Активность -->
        <section class="fit-band ink">
          <div class="fit-bh"><h2 class="fit-h2">Активность</h2><span class="fit-pill glass">цель ${V.fmt(goal())}</span></div>
          <div class="fit-steps">
            <div class="fit-sring">
              <svg viewBox="0 0 140 140" aria-hidden="true">
                <circle class="fit-rt" cx="70" cy="70" r="56" stroke="#d7ff2f"/>
                <circle class="fit-rf" data-ring="st" cx="70" cy="70" r="56" stroke="#d7ff2f" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
              </svg>
              <div class="fit-sring-c"><span class="emo">👟</span><b class="fit-n" data-t="stpct">0%</b></div>
            </div>
            <div style="flex:1;min-width:0">
              <div class="fit-n fit-steps-num" data-t="steps" data-val="0">0</div>
              <small class="fit-steps-sub">${T ? `шагов из ${V.fmt(goal())}` : "примерно · телефон в кармане — плюс-минус 1000"}</small>
            </div>
          </div>
          <div class="fit-steps-left" data-t="stleft"></div>
          ${lock("steps", 1, `<div data-c="stepschart" class="fit-mt"></div>`, true)}
          <div data-c="workout" class="fit-mt"></div>
          <button class="btn block fit-mt fit-ghost" data-go="maps">🚶 Прогуляться по карте ${IC.chev}</button>
          <div class="fine">Тренировка: тапай в ритм 15 секунд. Шаги, настроение и вайбики — за точность, не за усилия. Как в жизни.</div>
        </section>

        <!-- Настроение -->
        <div class="fit-bh plain"><h2 class="fit-h2">Настроение</h2><span class="fit-pill" data-t="moodt">—</span></div>
        <div class="fit-mood">
          ${lock("mood", 2, `<div class="fit-gauge">
            <svg viewBox="0 0 220 124" aria-hidden="true">
              <path d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke="rgba(13,13,15,.12)" stroke-width="22" stroke-linecap="round"/>
              <path data-moodarc d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke="#5b3cff" stroke-width="22" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
              <g class="fit-needle" data-needle><line x1="110" y1="112" x2="110" y2="46" stroke="#0d0d0f" stroke-width="3" stroke-linecap="round"/></g>
              <circle cx="110" cy="112" r="6" fill="#0d0d0f"/>
            </svg>
          </div>
          <div class="fit-mood-row">
            <span class="fit-bubble white"><span class="emo" data-t="moodface">😐</span></span>
            <div class="fit-n fit-mood-n"><span data-t="mood" data-val="0">0</span><small>/100</small></div>
          </div>
          <div class="fit-sub dk">Опускает ${IC.down}</div>
          <div class="fit-chips" data-c="drops"></div>`, true)}
          <div class="fit-sub dk">Поднимает ${IC.up}</div>
          <div class="fit-chips">
            <button class="fit-chip up" data-go="music">🎧 Музыка</button>
            <button class="fit-chip up" data-go="games">🎮 Игры</button>
            <button class="fit-chip up" data-go="tickets">🎤 Концерты</button>
            <button class="fit-chip up" data-go="job">💸 Зарплата</button>
          </div>
          <div data-c="moodact" class="fit-mt"></div>
        </div>

        <!-- Здоровье -->
        <div class="fit-bh plain"><h2 class="fit-h2">Здоровье</h2><span class="fit-pill" data-t="hlabel">—</span></div>
        <div data-c="sick"></div>
        ${lock("health", 2, `<div class="fit-sheet solo fit-health">
          <div class="fit-h-row">
            <div class="fit-n fit-health-n"><span data-t="health" data-val="0">0</span><small>%</small></div>
            <span class="fit-round dark">${IC.ne}</span>
          </div>
          <div class="fit-hdots" data-hdots>${Array.from({ length: 20 }, (_, i) => `<i style="--d:${i * 35}ms"></i>`).join("")}</div>
          <div class="fit-hmix">
            <span>😴 Сон <b>35%</b></span><span>🥗 Питание <b>30%</b></span><span>👟 Шаги <b>20%</b></span><span>😊 Вайб <b>15%</b></span>
          </div>
          <div class="fine">Здоровье пересчитывается в полночь по формуле выше. Формулу утвердил отдел маркетинга.</div>
        </div>`, true)}

        <div class="fit-zab">
          ${V.zabotik(58, "sly")}
          <div><b>${T ? "Вайбот анализирует" : "Вайбот гадает"}</b><span data-t="zab"></span></div>
        </div>
        <div class="fine">Vibe Fit не является медицинским изделием. Является изделием, которое продаёт тебе доставку, когда ты голоден.</div>
      </div>`;
    },

    mount(root) {
      if (!V.body) return null;
      const cache = {};
      const timers = [];
      let alive = true;
      let prevSteps = null;
      const born = Date.now();

      const $ = (sel) => root.querySelector(sel);
      const txt = (k, v) => { const el = $(`[data-t="${k}"]`); if (el && !V.sameText(el, v)) el.textContent = v; };
      const bar = (k, p) => { const el = $(`[data-b="${k}"]`); if (el) el.style.setProperty("--p", clamp(p).toFixed(1) + "%"); };
      const ring = (k, p) => { const el = $(`[data-ring="${k}"]`); if (el) el.setAttribute("stroke-dashoffset", (100 - clamp(p)).toFixed(2)); };
      const num = (k, v, fmt = V.fmt) => {
        const el = $(`[data-t="${k}"]`);
        if (!el) return;
        v = r0(v);
        if (el.dataset.done && +el.dataset.val === v) return;
        el.dataset.done = "1";
        FX.countTo(el, v, { fmt, dur: 800 });
      };
      const chunk = (k, html) => {
        if (cache[k] === html) return false;
        cache[k] = html;
        const el = $(`[data-c="${k}"]`);
        if (el) el.innerHTML = html;
        return true;
      };

      function donut(P, b) {
        const k = b.sleeping ? 0 : b.sick ? 0.55 : 1;
        const c = [P.parts.energy * 0.4, P.parts.food * 0.2, P.parts.mood * 0.25, P.parts.health * 0.15].map((x) => clamp(x) * k);
        let acc = 0;
        const ends = c.map((x) => (acc += x));
        ends.forEach((e, i) => {
          const el = $(`[data-seg="${i}"]`);
          if (!el) return;
          el.setAttribute("stroke-dasharray", `${Math.min(99.9, e).toFixed(2)} 100`);
          el.style.opacity = e < 0.5 ? 0 : 1;
        });
        // Пузырьки-иконки едут по дуге к середине своего сегмента, не налезая друг на друга
        let last = -99;
        c.forEach((x, i) => {
          const m = Math.max(ends[i] - x / 2, last + 9);
          last = m;
          const bub = $(`[data-bub="${i}"]`);
          if (bub) bub.style.setProperty("--a", (m * 3.6 - 90).toFixed(1) + "deg");
        });
        acc = clamp(acc);
        const hi = Math.floor(acc), dec = Math.floor((acc - hi) * 10);
        num("prod", hi);
        txt("prodd", `,${dec}%`);
      }

      function update() {
        if (!alive) return;
        const b = V.body.get();
        const g = V.game.info();
        const now = V.game.minutes();
        const day = Math.floor(now / 1440);
        const P = V.body.productivity(b);
        const sq = V.body.sleepQuality(b);
        const G = goal();
        const stPct = ((T ? b.steps : approx(b.steps)) / G) * 100;

        // Браслет
        const face = $("[data-face]");
        if (face) face.classList.toggle("night", !!b.sleeping);
        const shownSteps = T ? b.steps : approx(b.steps);
        if (!T) { txt("pscr", "≈" + V.fmt(shownSteps)); txt("papprox", "≈" + V.fmt(shownSteps)); txt("fuzzy", fuzzyTired(b)); }
        txt("time", g.time); txt("date", g.label);
        ring("e", b.energy); ring("f", b.food); ring("s", stPct);
        txt("le", r0(b.energy) + "%"); txt("lf", r0(b.food) + "%"); txt("ls", r0(Math.min(999, stPct)) + "%");
        chunk("wake", wakeHtml(b));

        // Продуктивность
        donut(P, b);
        txt("prodemo", P.value >= 80 ? "🚀" : P.value >= 60 ? "💼" : P.value >= 40 ? "🐢" : b.sleeping ? "😴" : "🪫");
        [["e", P.parts.energy], ["f", P.parts.food], ["m", P.parts.mood], ["h", P.parts.health]].forEach(([k, v]) => { bar("p-" + k, v); txt("pv-" + k, r0(v) + "%"); });
        txt("verdict", verdict(P.value, b));
        if (T >= 2) txt("stress", V.body.stress().value + "%");
        if (T === 3) txt("burn", burnout(b));

        // Сон
        if (T) txt("sq", `${sq.e} качество ${r0(sq.q * 100)}%`);
        txt("sqe", sq.e); txt("why", sq.why);
        chunk("lastsleep", lastSleepHtml(b));
        chunk("sleepchart", sleepChart(b.sleepLog));
        chunk("sleepnow", sleepNowHtml(b, now));
        chunk("sleepact", sleepActHtml(b));
        chunk("upsell", T ? upsellHtml(sq) : "");

        // Еда
        bar("food", b.food); num("food", b.food);
        const nl = nutrLabel(b.nutrition);
        chunk("nutr", `<div class="fit-tile-h"><span>Питание</span>${IC.sw}</div>
          <div class="fit-n fit-tile-n">${r0(b.nutrition)}<small>/100</small></div>
          <span class="fit-pill glass sm"><span class="emo wobble">${nl.e}</span> ${nl.t}</span>`);
        const todayMeals = (b.meals || []).filter((m) => m.day === day).length;
        txt("mealsn", `${todayMeals} ${todayMeals === 1 ? "приём" : todayMeals >= 2 && todayMeals <= 4 ? "приёма" : "приёмов"}`);
        chunk("meals", mealsHtml(b, day));
        chunk("fridge", fridgeHtml(b));
        chunk("foodact", foodActHtml(b));

        // Активность
        ring("st", stPct);
        txt("stpct", r0(stPct) + "%");
        num("steps", T ? b.steps : approx(b.steps), T ? V.fmt : (v) => "≈" + V.fmt(v));
        txt("stleft", !T ? `Ещё примерно ${V.fmt(Math.max(0, G - approx(b.steps)))} шагов. Точнее скажет Vibe Band` : b.steps >= G ? "🔥 Цель выполнена! Можно гордиться и лежать" : `Ещё ${V.fmt(G - b.steps)} шагов ≈ ${comma(((G - b.steps) / 1350).toFixed(1))} км до цели`);
        const freshSteps = chunk("stepschart", stepsChart(b.stepsLog, day));
        const tc = $("[data-todaycol]");
        if (tc) {
          const f = Math.min(MX_ROWS, b.steps / stepUnit());
          tc.classList.toggle("goal", b.steps >= G);
          tc.querySelectorAll("i[data-r]").forEach((d) => {
            const on = dotOn(+d.dataset.r, +d.dataset.s, f);
            if (d.classList.contains("on") !== on) {
              if (on && !freshSteps) d.style.setProperty("--d", "0ms");
              d.classList.toggle("on", on);
            }
          });
          txt("stoday", comma((b.steps / 1000).toFixed(1)));
        }
        chunk("workout", workoutHtml(b, now));
        if (prevSteps !== null && prevSteps < G && b.steps >= G && meta().goalDay !== day && Date.now() - born > 800) {
          setMeta({ goalDay: day });
          FX.confetti();
          FX.burst($(".fit-sring") || root, { emojis: ["👟", "🔥", "🏆", "✨"], count: 18 });
          FX.toast(`Цель ${V.fmt(G)} шагов выполнена! Ноги в шоке`, "🏆", 3000);
        } else if (b.steps >= G && meta().goalDay !== day) setMeta({ goalDay: day });
        prevSteps = b.steps;

        // Настроение
        const nd = $("[data-needle]");
        if (nd) nd.style.transform = `rotate(${-90 + clamp(b.mood) * 1.8}deg)`;
        const ma = $("[data-moodarc]");
        if (ma) ma.setAttribute("stroke-dashoffset", (100 - clamp(b.mood)).toFixed(2));
        txt("moodface", moodFace(b.mood));
        num("mood", b.mood);
        txt("moodt", T >= 2 ? moodText(b.mood) : "🔒 вроде норм?");
        chunk("drops", dropsHtml(b));
        chunk("moodact", moodActHtml(now, day));

        // Здоровье
        num("health", b.health);
        const hn = Math.round(clamp(b.health) / 5);
        root.querySelectorAll("[data-hdots] i").forEach((d, i) => d.classList.toggle("on", i < hn));
        const hd = $("[data-hdots]"); if (hd) hd.classList.toggle("low", b.health < 40);
        txt("hlabel", (b.sick ? "🤒 " : "") + (T >= 2 ? healthLabel(b.health) : "🔒 ?"));
        chunk("sick", sickHtml(b));

        txt("zab", insight(b));
      }

      // Пульс: живой, с дрожанием ±2, скорость сердца = BPM
      function pulse() {
        if (!alive) return;
        const bpm = V.body.heartRate() + Math.round(FX.rand(-2, 2));
        txt("bpm", bpm);
        txt("zone", bpmZone(bpm));
        root.style.setProperty("--fit-beat", (60 / bpm).toFixed(3) + "s");
      }

      let raf = 0;
      const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
      const offBody = V.body.on(schedule);
      const offState = V.state.on(schedule);

      update(); pulse();
      // Кольца, дуги и донат «заряжаются» после появления
      root.querySelectorAll("[data-ring], [data-moodarc]").forEach((c) => { const v = c.getAttribute("stroke-dashoffset"); c.setAttribute("stroke-dashoffset", "100"); timers.push(setTimeout(() => c.setAttribute("stroke-dashoffset", v), 250)); });
      root.querySelectorAll("[data-seg]").forEach((c) => { const v = c.getAttribute("stroke-dasharray"); c.setAttribute("stroke-dasharray", "0 100"); timers.push(setTimeout(() => c.setAttribute("stroke-dasharray", v), 300)); });
      root.querySelectorAll("[data-bub]").forEach((c) => { const v = c.style.getPropertyValue("--a"); c.style.setProperty("--a", "-90deg"); timers.push(setTimeout(() => c.style.setProperty("--a", v), 300)); });
      timers.push(setInterval(() => { V.body.tick(); update(); }, 1000));
      timers.push(setInterval(pulse, 2000));
      // Фейковая «скидка 15%», которая сгорает и тут же воскресает
      if (T < 2 && root.querySelector("[data-cd]")) {
        let cd = 120;
        const paint = () => root.querySelectorAll("[data-cd]").forEach((el) => { el.textContent = cdTxt(cd); });
        paint();
        timers.push(setInterval(() => {
          if (!alive) return;
          cd--;
          if (cd <= 0) {
            cd = 120;
            FX.toast("Скидка сгорела… и снова появилась. Только для тебя 💜", "⏳", 2600);
            root.querySelectorAll(".fit-pw-cd").forEach((el) => FX.bump(el));
          }
          paint();
        }, 1000));
      }

      /* ---------- Действия ---------- */
      const awake = (btn) => {
        if (!V.body.get().sleeping) return true;
        FX.shake(btn); FX.toast("Ты спишь. Лунатизм в Vibe Fit пока не поддерживается", "😴");
        return false;
      };

      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a || !root.contains(a)) return;
        const act = a.dataset.act;
        const b = V.body.get();

        if (act === "heart") {
          const bpm = $("[data-t='bpm']").textContent;
          FX.bump($(".fit-ringbox"));
          FX.burst(a, { emojis: b.sleeping ? ["💤", "🌙", "⭐"] : ["❤️", "💓", "💗"], count: 10 });
          FX.toast(b.sleeping ? `Пульс ${bpm}. Спишь как младенец. Младенец с ипотекой` : `Пульс ${bpm}. Сердце бьётся — уже неплохо`, "⌚");
        }
        if (act === "phone") {
          FX.bump($(".fit-phone"));
          FX.burst(a, { emojis: ["📱", "❓", "🤷"], count: 8 });
          FX.toast("Телефон не чувствует пульс. Только вибрацию от уведомлений. Vibe Band почувствует", "📱", 3000);
        }
        if (act === "ring") { FX.bump(a); FX.burst(a, { emojis: [a.dataset.e, "✨"], count: 8 }); }

        if (act === "sleep") {
          const r = V.body.sleep();
          if (!r.ok) { FX.shake(a); FX.toast(r.why, "🙅", 3000); update(); return; }
          FX.sound.pop();
          FX.burst(a, { emojis: ["🌙", "💤", "⭐", "✨"], count: 16 });
          FX.toast("Спокойной ночи. Браслет посторожит твой сон", "🌙");
          update();
          const hero = $(".fit-hero"); if (hero) hero.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (act === "skipnight") {
          const hrs = hoursToMorning();
          if (hrs < 0.5) { FX.toast("Скоро важное дело в календаре. Досыпать некогда", "📅", 3000); return; }
          FX.sound.pop();
          document.body.classList.add("fit-nightfade");
          setTimeout(() => {
            Vibe.timeSkip(Math.round(hrs * 10) / 10, true);
            const rec = V.body.wake();
            document.body.classList.remove("fit-nightfade");
            FX.toast(rec ? `Утро! ${T ? `Сон ${comma(rec.hours.toFixed(1))} ч, качество ${r0(rec.q * 100)}%` : `Проспал ${comma(rec.hours.toFixed(1))} ч`}. Утро вечера мудренее` : "Доброе утро!", "☀️", 3600);
            // Новое утро начинается с главной: там план дня, работа и деньги
            if (root.isConnected) Vibe.resetTo("home"); else update();
          }, 700);
          return;
        }
        if (act === "wake") {
          const rec = V.body.wake();
          FX.burst(a, { emojis: ["☀️", "🌤️", "✨"], count: 14 });
          if (rec && rec.hours >= 0.5) FX.toast(T ? `Доброе утро! Сон ${comma(rec.hours)} ч, качество ${r0(rec.q * 100)}%` : "Доброе утро! Как ты {спал|спала} — знает только Vibe Band", "☀️", 3000);
          else FX.toast("Это был не сон, а моргание. Меньше 30 минут не засчитали", "🥱", 3000);
          update();
        }

        if (act === "cook") {
          if (!awake(a)) return;
          if (!(b.fridge > 0)) { FX.shake(a); return; }
          V.body.effect("cook");
          FX.sound.success();
          FX.burst(a, { emojis: ["🍳", "🥦", "🧂", "🔥"], count: 14 });
          V.reward({ vibiki: 0, xp: 8 });
          update();
          FX.bump($(".fit-fridge"));
        }
        if (act === "vend") {
          if (!awake(a)) return;
          const ok = V.pay(159, { title: "Вендинг · шоколадка", emoji: "🍫", col: "c-orange", from: a });
          if (ok) { FX.burst(a, { emojis: ["🍫", "🍬", "⚡"], count: 10 }); setTimeout(update, 50); }
        }

        if (act === "workout") {
          if (!awake(a)) return;
          if (b.energy < 15) { FX.shake(a); FX.toast(`Энергия ${r0(b.energy)}%. Сначала поспи, чемпион`, "🪫"); return; }
          if (V.game.minutes() - (b.workoutAt ?? -9999) < WORKOUT_CD) { FX.shake(a); return; }
          openWorkout();
        }
        if (act === "meditate") {
          if (!awake(a)) return;
          if (V.game.minutes() - (meta().medAt ?? -9999) < MEDITATE_CD) { FX.shake(a); return; }
          openMeditate();
        }
        if (act === "mom") {
          if (!awake(a)) return;
          if (meta().momDay === dayNow()) { FX.shake(a); FX.toast("Ты уже звонил. Мама: «Что-то случилось?!»", "👩"); return; }
          if (V.care) { V.care.call(a, () => { setMeta({ momDay: dayNow() }); update(); }); return; }
          setMeta({ momDay: dayNow() });
          const L = ["«Ты {поел|поела}? А шапку надел?»", "«Тётя Галя спрашивает, когда свадьба»", "«Я тебе денег скинуть? Ладно, не скину»", "«Ты {похудел|похудела}. Или потолстел. Приезжай»", "«Папа передаёт привет. Молча»"];
          FX.burst(a, { emojis: ["💜", "📞", "👩", "🥰"], count: 14 });
          FX.toast("Мама: " + FX.pick(L), "👩", 3200);
          V.body.effect("mom");
          update();
        }
      });

      /* ---------- Мини-игра «Тренировка» ---------- */
      function openWorkout() {
        const PERIOD = 750, LEN = 15000, BEATS = Math.floor(LEN / PERIOD);
        let t0 = 0, anim = null, ringAnim = null, iv = 0, done = false, started = false;
        let sum = 0, hits = 0, combo = 0, best = 0;
        const hitBeats = new Set();
        V.ui.sheet(`
          <div class="display" style="font-size:28px">Тренировка 🏋️</div>
          <p class="muted" style="font-weight:700;margin:6px 0 10px;font-size:14px">Тапай по кругу, когда он самый большой. 15 секунд, 80 ударов в минуту. ${T ? "Не спеши — браслет считает точность" : "Без браслета точность не видна — засчитаем максимум 40%"}</p>
          <div class="fit-wo-hud"><span>⏱ <b data-wt>15,0</b></span><span>🎯 <b data-wh>0</b></span><span>🔥 x<b data-wc>0</b></span></div>
          <div class="progress" style="height:10px"><i data-wbar style="--p:100%;background:var(--pink);transition:none"></i></div>
          <div class="fit-wo-arena">
            <div class="fit-wo-guide" data-wguide></div>
            <button class="fit-wo-tgt" data-wtgt aria-label="Тап">💪</button>
            <div class="fit-wo-fb" data-wfb></div>
          </div>
          <button class="btn black xl block" data-wgo>Погнали <span class="arrow">→</span></button>
        `, {
          onMount(sh, close) {
            const tgt = sh.querySelector("[data-wtgt]"), guide = sh.querySelector("[data-wguide]"), fb = sh.querySelector("[data-wfb]"), go = sh.querySelector("[data-wgo]");
            const feedback = (t, c) => { fb.textContent = t; fb.style.color = c; fb.classList.remove("on"); void fb.offsetWidth; fb.classList.add("on"); };
            go.addEventListener("click", () => {
              if (started) return;
              started = true; go.style.display = "none";
              t0 = performance.now();
              anim = tgt.animate([{ transform: "scale(1.18)" }, { transform: "scale(.72)", offset: 0.5 }, { transform: "scale(1.18)" }], { duration: PERIOD, iterations: Infinity, easing: "ease-in-out" });
              ringAnim = guide.animate([{ transform: "scale(1)", opacity: 0.9 }, { transform: "scale(2.1)", opacity: 0, offset: 0.02 }, { transform: "scale(1.15)", opacity: 1 }], { duration: PERIOD, iterations: Infinity });
              iv = setInterval(() => {
                const el = performance.now() - t0;
                const left = Math.max(0, LEN - el);
                sh.querySelector("[data-wt]").textContent = comma((left / 1000).toFixed(1));
                sh.querySelector("[data-wbar]").style.setProperty("--p", (left / LEN) * 100 + "%");
                if (left <= 0) finish(sh, close);
              }, 100);
            });
            tgt.addEventListener("pointerdown", (e) => {
              e.preventDefault();
              if (!started || done) return;
              const el = performance.now() - t0;
              const beat = Math.round(el / PERIOD);
              const ph = (el % PERIOD) / PERIOD;
              const acc = 1 - Math.min(ph, 1 - ph) * 2;
              if (hitBeats.has(beat) || acc < 0.45) {
                combo = 0; feedback(hitBeats.has(beat) ? "Не спамь 🙅" : "Мимо 💨", "#e5333d");
              } else {
                hitBeats.add(beat); hits++; combo++; best = Math.max(best, combo);
                sum += acc;
                FX.burst(tgt, { emojis: acc > 0.85 ? ["💥", "🔥", "⭐"] : ["💦", "✨"], count: acc > 0.85 ? 8 : 4, spread: 90 });
                feedback(acc > 0.85 ? "Идеально!" : acc > 0.65 ? "Хорошо" : "Норм", acc > 0.85 ? "#12a150" : "#0e0e12");
              }
              sh.querySelector("[data-wh]").textContent = hits;
              sh.querySelector("[data-wc]").textContent = combo;
              FX.haptic(8);
            });
          },
          onClose() {
            clearInterval(iv); anim && anim.cancel(); ringAnim && ringAnim.cancel();
            if (started && !done) { done = true; FX.toast("Тренировка прервана. Диван победил", "🛋️"); }
          },
        });
        function finish(sh, close) {
          if (done) return;
          done = true;
          clearInterval(iv); anim && anim.cancel(); ringAnim && ringAnim.cancel();
          const raw = clamp(sum / BEATS, 0, 1);
          const score = T ? raw : Math.min(0.4, raw); // без браслета — «на глаз»
          const vib = Math.round(15 + score * 85), xp = Math.round(10 + score * 40);
          V.body.effect("workout", { score });
          const arena = sh.querySelector(".fit-wo-arena");
          arena.innerHTML = !T ? `<div class="fit-wo-res"><div class="big-num">??%</div><b>Без браслета засчитали «на глаз»: ${r0(score * 100)}% 📱</b><small>Попаданий ${hits} из ${BEATS}. А было ли это хорошо — знает только Vibe Band</small></div>` : `<div class="fit-wo-res"><div class="big-num">${r0(score * 100)}%</div><b>${score > 0.8 ? "Зверь! Тренер в слезах 🦍" : score > 0.5 ? "Достойно. Почти как в рилсах 💪" : "Ну, ты хотя бы встал с дивана 🛋️"}</b><small>Попаданий ${hits} из ${BEATS} · лучшее комбо ${best}</small></div>`;
          FX.sound.success();
          if (score > 0.8) FX.confetti();
          FX.burst(arena, { emojis: ["🏋️", "💪", "🔥", "✨"], count: 18 });
          V.reward({ vibiki: vib, xp, from: arena });
          const go = sh.querySelector("[data-wgo]");
          go.style.display = ""; go.innerHTML = `Красота · +${vib} ${Vibe.coin(18)}`;
          go.addEventListener("click", () => { close(); setTimeout(update, 60); }, { once: true });
          update();
        }
      }

      /* ---------- Медитация: держи 5 секунд ---------- */
      function openMeditate() {
        const NEED = 5000;
        let holdAt = 0, raf2 = 0, done = false;
        V.ui.sheet(`
          <div class="display" style="font-size:28px">Медитация 🧘</div>
          <p class="muted" style="font-weight:700;margin:6px 0 10px;font-size:14px">Зажми кнопку и дыши вместе с кругом 5 секунд. Отпустишь раньше — дзен сгорит</p>
          <div class="fit-med">
            <div class="fit-breath" data-breath><span data-btxt>Готов?</span></div>
            <svg class="fit-med-ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="none" stroke="rgba(14,14,18,.12)" stroke-width="8"/><circle data-mring cx="100" cy="100" r="92" fill="none" stroke="#8b5cff" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" transform="rotate(-90 100 100)"/></svg>
          </div>
          <button class="btn grad xl block fit-hold" data-hold>Держи и дыши 🫁</button>
          <div class="fine" style="text-align:center">Медитация бесплатна. Пока что. Скоро в Плюс Вайб.</div>
        `, {
          onMount(sh, close) {
            const btn = sh.querySelector("[data-hold]"), br = sh.querySelector("[data-breath]"), bt = sh.querySelector("[data-btxt]"), mr = sh.querySelector("[data-mring]");
            const stop = (fail) => {
              cancelAnimationFrame(raf2); raf2 = 0;
              if (done || !holdAt) return;
              const held = performance.now() - holdAt; holdAt = 0;
              br.classList.remove("on"); mr.setAttribute("stroke-dashoffset", "100"); bt.textContent = "Ещё раз?";
              if (fail) { FX.shake(btn); FX.toast(`Отпустил на ${comma((held / 1000).toFixed(1))} с. Дзен не терпит суеты`, "🙈"); }
            };
            const loop = () => {
              const el = performance.now() - holdAt;
              mr.setAttribute("stroke-dashoffset", (100 - Math.min(1, el / NEED) * 100).toFixed(2));
              bt.textContent = el % 2500 < 1250 ? "Вдох…" : "Выдох…";
              if (el >= NEED) {
                done = true; holdAt = 0; br.classList.remove("on");
                bt.textContent = "Ом 🕉️";
                setMeta({ medAt: V.game.minutes() });
                V.body.effect("meditate");
                FX.sound.success();
                FX.burst(br, { emojis: ["🧘", "🕊️", "✨", "🌸"], count: 18 });
                V.reward({ vibiki: 0, xp: 10 });
                setTimeout(() => { close(); update(); }, 1100);
                return;
              }
              raf2 = requestAnimationFrame(loop);
            };
            btn.addEventListener("pointerdown", (e) => {
              e.preventDefault();
              if (done || holdAt) return;
              try { btn.setPointerCapture(e.pointerId); } catch (err) {}
              holdAt = performance.now(); br.classList.add("on");
              raf2 = requestAnimationFrame(loop);
            });
            ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => btn.addEventListener(ev, () => stop(true)));
            btn.addEventListener("contextmenu", (e) => e.preventDefault());
          },
          onClose() { cancelAnimationFrame(raf2); done = true; },
        });
      }

      return () => {
        alive = false;
        timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
        if (raf) cancelAnimationFrame(raf);
        offBody(); offState();
      };
    },
  });

  /* ---------- Стили ---------- */
  const css = `
  [data-screen="fit"] { --fL: #d7ff2f; --fV: #5b3cff; --fK: #0d0d0f; --fG: #f1f1ec; --fnum: "Oswald", var(--font-display); background: #ecece6; }
  .fit-n { font-family: var(--fnum); font-weight: 600; letter-spacing: -.5px; line-height: .92; font-variant-numeric: tabular-nums; }
  .fit-n small { font-size: .42em; font-weight: 500; letter-spacing: 0; margin-left: 1px; }
  .fit-h2 { font-family: var(--font); font-weight: 800; font-size: 25px; letter-spacing: -.6px; line-height: 1.05; }
  .fit-ic { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
  .fit-mt { margin-top: 10px; }
  .fit-pill { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 11px; border-radius: 999px; background: #fff; color: var(--fK); font-size: 12px; font-weight: 800; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .fit-pill.sm { height: 22px; padding: 0 8px; font-size: 11px; }
  .fit-pill.lime { background: var(--fL); color: var(--fK); } .fit-pill.vio { background: var(--fV); color: #fff; }
  .fit-pill.dark { background: var(--fK); color: #fff; } .fit-pill.glass { background: rgba(255,255,255,.16); color: #fff; }
  .fit-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex: 0 0 auto; }
  .fit-line { height: 6px; border-radius: 999px; background: rgba(13,13,15,.1); overflow: hidden; }
  .fit-line.dark { background: rgba(255,255,255,.14); }
  .fit-line i { display: block; height: 100%; width: var(--p, 0%); border-radius: 999px; background: #fff; transition: width 1s var(--spring); }
  .fit-line i.lime { background: var(--fL); }
  .fit-bubble { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--fK); font-size: 24px; flex: 0 0 auto; }
  .fit-bubble.white { background: #fff; } .fit-bubble.vio { background: var(--fV); }
  .fit-sq { width: 44px; height: 44px; border-radius: 14px; background: var(--fG); display: grid; place-items: center; font-size: 22px; flex: 0 0 auto; }
  .fit-sq.big { width: 52px; height: 52px; border-radius: 16px; font-size: 28px; }
  .fit-round { width: 40px; height: 40px; border-radius: 50%; background: var(--fK); color: #fff; display: grid; place-items: center; flex: 0 0 auto; transition: transform .2s var(--spring); }
  .fit-round:active { transform: scale(.9); } .fit-round.dark { background: var(--fG); color: var(--fK); }

  /* Кнопки внутри экрана — плоские, без контура */
  [data-screen="fit"] .btn { border: 0; box-shadow: none; border-radius: 18px; background: var(--fG); color: var(--fK); white-space: normal; line-height: 1.1; text-align: center; font-weight: 800; transition: transform .16s var(--spring), filter .2s; }
  [data-screen="fit"] .btn:active { transform: scale(.96); box-shadow: none; }
  [data-screen="fit"] .btn.black { background: var(--fK); color: #fff; }
  [data-screen="fit"] .btn.lime { background: var(--fL); color: var(--fK); }
  [data-screen="fit"] .btn.vio { background: var(--fV); color: #fff; }
  [data-screen="fit"] .btn.xl { height: 60px; border-radius: 22px; font-size: 17px; }
  [data-screen="fit"] .btn .fit-ic { width: 16px; height: 16px; }
  [data-screen="fit"] .grid2 .btn { padding: 0 10px; font-size: 14px; }

  /* ---------- Браслет ---------- */
  .fit-hero { background: var(--fK); color: #fff; border-radius: 32px; padding: 16px 16px 14px; position: relative; overflow: hidden; transition: background .8s; }
  .fit-hero::before { content: ""; position: absolute; right: -60px; top: -60px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(91,60,255,.45), transparent 70%); pointer-events: none; }
  .fit-hero.night { background: radial-gradient(1.5px 1.5px at 12% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 82% 12%, #fff, transparent), radial-gradient(1px 1px at 60% 88%, #fff, transparent), radial-gradient(1px 1px at 40% 30%, #fff, transparent), linear-gradient(160deg, #2a1d8f, #0b0b2a 70%); }
  .fit-h-top { display: flex; justify-content: space-between; align-items: center; position: relative; }
  .fit-h-brand { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: #a9a9b2; }
  .fit-h-brand i { width: 7px; height: 7px; border-radius: 50%; background: var(--fL); animation: fit-blink var(--fit-beat, .9s) ease-in-out infinite; }
  @keyframes fit-blink { 50% { opacity: .2; } }
  .fit-time { font-family: var(--fnum); font-size: 17px; font-weight: 500; color: var(--fL); letter-spacing: 1px; font-variant-numeric: tabular-nums; }
  .fit-h-mid { display: flex; align-items: center; gap: 12px; margin-top: 6px; cursor: pointer; position: relative; }
  .fit-ringbox { width: 148px; height: 148px; flex: 0 0 auto; position: relative; }
  .fit-rings { width: 100%; height: 100%; transform: rotate(-90deg); display: block; }
  .fit-rt { fill: none; stroke-width: 17; opacity: .14; }
  .fit-rf { fill: none; stroke-width: 17; stroke-linecap: round; transition: stroke-dashoffset 1.4s var(--spring); }
  .fit-ring-c { position: absolute; inset: 0; display: grid; place-items: center; font-size: 26px; }
  .fit-heart { display: inline-block; animation: fit-beat var(--fit-beat, .9s) ease-in-out infinite; }
  .fit-zz { display: none; animation: float 3s ease-in-out infinite; }
  .fit-hero.night .fit-heart { display: none; } .fit-hero.night .fit-zz { display: inline-block; }
  .fit-hero.night .fit-time { color: #b9adff; }
  @keyframes fit-beat { 0%, 60%, 100% { transform: scale(1); } 12% { transform: scale(1.32); } 24% { transform: scale(.95); } 36% { transform: scale(1.18); } }
  .fit-zzz { position: absolute; right: 18px; top: 8px; display: none; color: #b9adff; font-family: var(--fnum); pointer-events: none; }
  .fit-hero.night .fit-zzz { display: block; }
  .fit-zzz span { position: absolute; font-size: 16px; opacity: 0; animation: fit-z 3s ease-in infinite; }
  .fit-zzz span:nth-child(2) { animation-delay: 1s; font-size: 20px; } .fit-zzz span:nth-child(3) { animation-delay: 2s; font-size: 26px; }
  @keyframes fit-z { 0% { transform: translate(0, 20px) rotate(-10deg); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(22px, -36px) rotate(14deg); opacity: 0; } }
  .fit-h-bpm { flex: 1; min-width: 0; }
  .fit-h-bpm > small { font-size: 12px; font-weight: 700; color: #a9a9b2; }
  .fit-bpm { display: flex; align-items: baseline; gap: 4px; margin: 2px 0 6px; }
  .fit-bpm b { font-size: 68px; font-weight: 600; }
  .fit-bpm span { font-size: 13px; font-weight: 800; color: #a9a9b2; }
  .fit-zone { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; background: var(--fV); font-size: 12px; font-weight: 800; }
  .fit-zone i { width: 6px; height: 6px; border-radius: 50%; background: var(--fL); }
  .fit-ecg { display: flex; gap: 4px; margin-top: 10px; }
  .fit-ecg i { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.16); animation: fit-ecg calc(var(--fit-beat, .9s) * 2) linear infinite; animation-delay: calc(var(--k) * var(--fit-beat, .9s) / 6); }
  @keyframes fit-ecg { 0%, 100% { background: rgba(255,255,255,.16); transform: none; } 6% { background: var(--fL); transform: scale(1.5); } 16% { background: rgba(215,255,47,.35); transform: none; } }
  .fit-hero.night .fit-ecg i { animation-duration: 4s; }
  .fit-legend { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; position: relative; }
  .fit-lg { background: #1d1d22; border-radius: 18px; padding: 9px 10px; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 2px 6px; text-align: left; min-width: 0; color: #fff; transition: transform .2s var(--spring); }
  .fit-lg:active { transform: scale(.94); }
  .fit-lg i { width: 9px; height: 9px; border-radius: 50%; }
  .fit-lg small { font-size: 11px; font-weight: 700; color: #a9a9b2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fit-lg b { grid-column: 1 / -1; font-size: 24px; font-weight: 500; }
  .fit-wake { margin-top: 12px; animation: pulse 1.4s ease-in-out infinite; }

  /* ---------- Полосы-секции (лайм / фиолет / чёрный) ---------- */
  .fit-band { margin: 22px -16px 0; padding: 22px 16px 18px; border-radius: 34px; position: relative; overflow: hidden; }
  .fit-band.lime { background: var(--fL); color: var(--fK); }
  .fit-band.vio { background: var(--fV); color: #fff; }
  .fit-band.ink { background: var(--fK); color: #fff; }
  .fit-band .fine { color: rgba(255,255,255,.55); }
  .fit-bh { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
  .fit-bh .fit-pill { flex: 0 1 auto; min-width: 0; }
  .fit-bh.plain { margin: 26px 0 12px; }
  .fit-sheet { background: #fff; color: var(--fK); border-radius: 28px; padding: 16px; margin-top: 16px; }
  .fit-sheet.solo { margin-top: 10px; }
  .fit-band-note { text-align: center; font-size: 12px; font-weight: 800; margin-top: 10px; opacity: .6; }

  /* ---------- Донат продуктивности ---------- */
  .fit-donut { position: relative; width: 260px; height: 260px; margin: 4px auto 6px; }
  .fit-donut svg { width: 100%; height: 100%; transform: rotate(-90deg); display: block; overflow: visible; }
  .fit-seg-track { fill: none; stroke: rgba(13,13,15,.08); stroke-width: 40; }
  .fit-seg { fill: none; stroke-width: 40; stroke-linecap: round; transition: stroke-dasharray 1.3s var(--spring), opacity .3s; }
  .fit-bub { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px; transform: rotate(var(--a, -90deg)) translateX(98px) rotate(calc(-1 * var(--a, -90deg))); transition: transform 1.3s var(--spring); z-index: 2; }
  .fit-bub button { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 19px; background: #fff; box-shadow: 0 0 0 3px var(--bc), 0 4px 10px rgba(13,13,15,.18); animation: float 3.2s ease-in-out infinite; }
  .fit-bub:nth-child(3) button { animation-delay: .4s; } .fit-bub:nth-child(4) button { animation-delay: .8s; } .fit-bub:nth-child(5) button { animation-delay: 1.2s; }
  .fit-donut-c { position: absolute; inset: 60px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
  .fit-donut-c > small { font-size: 13px; font-weight: 800; opacity: .6; }
  .fit-prod-num { font-size: 58px; }
  .fit-prod-num small { font-size: 24px; }
  .fit-donut-emo { font-size: 26px; margin-top: 2px; }
  .fit-pts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  .fit-pt { background: #fff; border-radius: 20px; padding: 10px 12px; min-width: 0; }
  .fit-pt-h { display: flex; align-items: center; gap: 6px; }
  .fit-pt-h small { font-size: 11px; font-weight: 800; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fit-pt b { display: block; font-size: 26px; font-weight: 500; margin: 6px 0 6px; }
  .fit-verdict { margin-top: 10px; background: var(--fK); color: #fff; border-radius: 20px; padding: 12px 14px; font-size: 13px; font-weight: 800; line-height: 1.3; }

  /* ---------- Точечная матрица ---------- */
  .fit-mx { --s: 20px; --pt: 34px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding-top: var(--pt); position: relative; }
  .fit-mx-col { display: flex; flex-direction: column; align-items: center; min-width: 0; position: relative; }
  .fit-mx-dots { display: grid; grid-template-columns: repeat(2, 15px); grid-auto-rows: 15px; gap: 5px; }
  .fit-mx-dots i { width: 15px; height: 15px; border-radius: 50%; background: rgba(255,255,255,.14); }
  .fit-mx-dots i.on { background: var(--fL); animation: fit-dot .45s var(--spring) both; animation-delay: var(--d, 0ms); }
  @keyframes fit-dot { from { transform: scale(0); background: #fff; } }
  .fit-mx-col.best i.on { background: #fff; }
  .fit-mx-col.low i.on { background: rgba(215,255,47,.5); }
  .fit-mx-col.ghost i { background: rgba(255,255,255,.07); }
  .fit-mx-col small { font-size: 11px; font-weight: 800; margin-top: 6px; opacity: .75; white-space: nowrap; }
  .fit-mx-col em { font-style: normal; font-size: 10px; font-weight: 700; opacity: .55; white-space: nowrap; }
  .fit-mx-peak { position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); font-family: var(--fnum); font-weight: 600; font-size: 20px; line-height: 1; white-space: nowrap; animation: pop-in .6s var(--spring) .5s both; }
  .fit-mx-peak span { font-family: var(--font); font-size: 11px; font-weight: 800; opacity: .8; }
  .fit-mx-peak.l { left: 0; transform: none; } .fit-mx-peak.r { left: auto; right: 0; transform: none; }
  .fit-mx-col:has(.fit-mx-peak)::before { content: ""; position: absolute; top: -4px; left: 50%; width: 2px; height: 4px; background: currentColor; opacity: .5; }
  /* Шаги на чёрном: белые точки, цель — лайм, сегодня — фиолет */
  .fit-band.ink .fit-mx-dots i { background: #2a2a30; }
  .fit-band.ink .fit-mx-dots i.on { background: #fff; }
  .fit-band.ink .fit-mx-col.goal i.on { background: var(--fL); }
  .fit-band.ink .fit-mx-col.today i.on { background: var(--fV); }
  .fit-band.ink .fit-mx-col.today.goal i.on { background: var(--fL); box-shadow: 0 0 0 2px var(--fV); }
  .fit-band.ink .fit-mx-col.today small { background: var(--fV); color: #fff; opacity: 1; border-radius: 999px; padding: 1px 7px; }
  .fit-band.ink .fit-mx-col.ghost i { background: #1b1b20; }
  .fit-mx-goal { position: absolute; left: 0; right: 0; top: calc(var(--pt) + (var(--rows) - var(--goal)) * var(--s) - 3px); border-top: 1.5px dashed var(--fL); z-index: 1; pointer-events: none; }
  .fit-mx-goal b { position: absolute; left: 0; top: -10px; font-size: 10px; font-weight: 800; background: var(--fL); color: var(--fK); border-radius: 999px; padding: 1px 7px; }
  .fit-keys { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 12px; font-size: 11px; font-weight: 700; opacity: .8; }
  .fit-keys i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: 0; }
  .fit-keys .k-on { background: var(--fL); } .fit-keys .k-best { background: #fff; } .fit-keys .k-low { background: rgba(215,255,47,.5); }
  .fit-keys .k-w { background: #fff; } .fit-keys .k-vio { background: var(--fV); }
  .fit-empty { margin-top: 4px; padding: 14px; border: 1.5px dashed rgba(13,13,15,.2); border-radius: 18px; font-size: 13px; font-weight: 700; color: var(--muted); text-align: center; }
  .fit-empty.dark { border-color: rgba(255,255,255,.3); color: rgba(255,255,255,.8); }

  /* ---------- Сон ---------- */
  .fit-ls { display: flex; align-items: center; gap: 12px; }
  .fit-ls-n { font-size: 64px; }
  .fit-ls-n small { font-size: 22px; }
  .fit-ls-t { flex: 1; min-width: 0; }
  .fit-ls-t b { display: block; font-size: 14px; font-weight: 800; } .fit-ls-t small { font-size: 12px; font-weight: 600; opacity: .75; }
  .fit-why { display: flex; gap: 12px; align-items: center; }
  .fit-why b { display: block; font-size: 15px; font-weight: 800; } .fit-why small { font-size: 13px; font-weight: 600; color: var(--muted); }
  .fit-why-note { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; background: var(--fG); border-radius: 14px; padding: 9px 12px; font-size: 12px; font-weight: 800; }
  .fit-sleepnow { margin-top: 12px; background: linear-gradient(150deg, #2a1d8f, #0b0b2a); color: #fff; border-radius: 22px; padding: 14px; }
  .fit-sn-top { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
  .fit-sn-top b { display: block; font-size: 15px; } .fit-sn-top small, .fit-sn-sub { font-size: 12px; font-weight: 700; color: #b5b1c4; }
  .fit-sn-sub { display: block; margin-top: 8px; }
  .fit-upsell { display: flex; gap: 12px; align-items: center; border-radius: 26px; padding: 14px; }
  .fit-upsell.lime { background: var(--fL); color: var(--fK); } .fit-upsell.white { background: #fff; color: var(--fK); }
  .fit-upsell > div { flex: 1; min-width: 0; }
  .fit-upsell b { font-size: 14px; font-weight: 800; } .fit-upsell small { display: block; font-size: 12px; font-weight: 600; margin-top: 3px; opacity: .75; }
  .fit-upsell.big { display: block; background: var(--fK); color: #fff; padding: 16px; }
  .fit-up-top { display: flex; justify-content: space-between; align-items: center; }
  .fit-up-top .emo { font-size: 34px; }
  .fit-up-num { display: flex; align-items: flex-end; gap: 10px; margin: 6px 0 12px; }
  .fit-up-num .fit-n { font-size: 72px; color: var(--fL); }
  .fit-up-num b { font-size: 15px; line-height: 1.15; padding-bottom: 8px; }
  .fit-up-bars { display: grid; gap: 8px; }
  .fit-up-bars > div { display: grid; grid-template-columns: 1fr 1.2fr auto; align-items: center; gap: 8px; }
  .fit-up-bars small { margin: 0; font-size: 11px; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fit-up-bars b { font-family: var(--fnum); font-weight: 500; font-size: 16px; }
  .fit-up-sub { display: block; margin-top: 10px; font-size: 12px; font-weight: 700; opacity: .6; }
  .fit-up-btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .fit-up-btns .btn { flex: 1 1 140px; height: 48px; font-size: 14px; padding: 0 12px; }

  /* ---------- Еда ---------- */
  .fit-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fit-tile { border-radius: 26px; padding: 14px; min-height: 150px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; min-width: 0; }
  .fit-tile.ink { background: var(--fK); color: #fff; } .fit-tile.vio { background: var(--fV); color: #fff; }
  .fit-tile-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; font-size: 13px; font-weight: 700; opacity: .9; }
  .fit-tile-n { font-size: 50px; }
  .fit-tile .fit-pill { align-self: flex-start; }
  .fit-sub { font-size: 12px; font-weight: 800; color: var(--muted); margin: 14px 0 8px; display: flex; align-items: center; gap: 4px; }
  .fit-sheet .fit-sub:first-child { margin-top: 0; }
  .fit-sub.dk { color: var(--fK); opacity: .7; }
  .fit-meals { display: grid; gap: 2px; }
  .fit-meal { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
  .fit-meal div { flex: 1; min-width: 0; } .fit-meal b { display: block; font-size: 15px; font-weight: 800; } .fit-meal small { font-size: 12px; font-weight: 600; color: var(--muted); }
  .fit-meal .fit-pill { background: var(--fG); }
  .fit-meal .fit-pill.lime { background: var(--fL); } .fit-meal .fit-pill.vio { background: var(--fV); }
  .fit-fridge { display: flex; gap: 10px; align-items: stretch; }
  .fit-fr-door { width: 76px; border-radius: 18px; background: var(--fK); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 0; flex: 0 0 auto; }
  .fit-fr-door b { font-size: 34px; font-weight: 600; color: var(--fL); } .fit-fr-door small { font-size: 10px; font-weight: 700; opacity: .7; }
  .fit-fridge.empty .fit-fr-door b { color: #555; }
  .fit-fr-shelf { flex: 1; min-width: 0; border-radius: 18px; background: var(--fG); display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 8px 10px; font-size: 22px; }
  .fit-fr-shelf small { font-size: 12px; font-weight: 700; color: var(--muted); }
  .fit-acts { display: grid; gap: 8px; margin-top: 14px; }

  /* ---------- Активность ---------- */
  .fit-steps { display: flex; align-items: center; gap: 14px; }
  .fit-sring { width: 104px; height: 104px; position: relative; flex: 0 0 auto; }
  .fit-sring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .fit-sring .fit-rt { stroke-width: 16; opacity: .15; }
  .fit-sring .fit-rf { stroke-width: 16; }
  .fit-sring-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .fit-sring-c .emo { font-size: 24px; animation: wobble 1.6s ease-in-out infinite; } .fit-sring-c b { font-size: 18px; font-weight: 500; }
  .fit-steps-num { font-size: 60px; }
  .fit-steps-sub { font-size: 12px; font-weight: 700; color: #a9a9b2; }
  .fit-steps-left { font-size: 12px; font-weight: 800; margin-top: 12px; background: #1d1d22; color: var(--fL); border-radius: 14px; padding: 9px 12px; }
  .fit-wo-btn { animation: pulse 1.8s ease-in-out infinite; }
  [data-screen="fit"] .btn.fit-ghost { background: #1d1d22; color: #fff; }

  /* ---------- Настроение ---------- */
  .fit-mood { background: var(--fL); border-radius: 30px; padding: 16px; }
  .fit-gauge { width: 230px; max-width: 100%; margin: 0 auto; }
  .fit-gauge svg { width: 100%; display: block; overflow: visible; }
  .fit-gauge [data-moodarc] { transition: stroke-dashoffset 1.2s var(--spring); }
  .fit-needle { transform-origin: 110px 112px; transform: rotate(-90deg); transition: transform 1.2s var(--spring); }
  .fit-mood-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 6px; }
  .fit-mood-row .fit-bubble { width: 52px; height: 52px; font-size: 30px; }
  .fit-mood-n { font-size: 56px; }
  .fit-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .fit-chip { display: inline-flex; align-items: center; gap: 4px; height: 34px; padding: 0 12px; border-radius: 999px; background: rgba(13,13,15,.08); color: var(--fK); font-size: 12px; font-weight: 800; transition: transform .2s var(--spring); }
  .fit-chip.up { background: var(--fK); color: #fff; }
  .fit-chip.up:active { transform: scale(.93); }
  .fit-chip.hot { background: var(--fV); color: #fff; animation: wobble 1.4s ease-in-out infinite; }

  /* ---------- Здоровье ---------- */
  .fit-sick { background: var(--fV); color: #fff; border-radius: 30px; padding: 18px 16px 16px; text-align: center; margin-bottom: 10px; position: relative; animation: pulse 2s ease-in-out infinite; }
  .fit-sick-st { position: absolute; top: 14px; right: 14px; }
  .fit-sick p { font-weight: 600; font-size: 13px; margin-bottom: 12px; opacity: .85; }
  .fit-h-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .fit-health-n { font-size: 64px; }
  .fit-hdots { display: grid; grid-template-columns: repeat(20, 1fr); gap: 3px; margin-top: 12px; }
  .fit-hdots i { aspect-ratio: 1; border-radius: 50%; background: var(--fG); transition: background .4s; }
  .fit-hdots i.on { background: var(--fV); animation: fit-dot .45s var(--spring) both; animation-delay: var(--d); }
  .fit-hdots.low i.on { background: var(--fK); }
  .fit-hmix { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 14px; }
  .fit-hmix span { background: var(--fG); border-radius: 14px; padding: 8px 10px; font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; gap: 4px; }
  .fit-hmix b { font-family: var(--fnum); font-weight: 500; font-size: 14px; }

  .fit-zab { display: flex; gap: 12px; align-items: center; margin-top: 18px; background: var(--fK); color: #fff; border-radius: 28px; padding: 14px 16px; }
  .fit-zab b { display: block; font-size: 12px; font-weight: 800; color: var(--fL); margin-bottom: 2px; }
  .fit-zab span { font-size: 14px; font-weight: 700; }

  /* ---------- Замки и пейволл (нет часов) ---------- */
  .fit-lock { display: grid; position: relative; }
  .fit-lock > * { grid-area: 1 / 1; min-width: 0; }
  .fit-lock-body { filter: blur(7px) saturate(.8); opacity: .75; pointer-events: none; user-select: none; }
  .fit-pw { align-self: center; justify-self: center; width: calc(100% - 16px); max-width: 320px; margin: 8px 0; z-index: 3; background: var(--fK); color: #fff; border-radius: 24px; padding: 12px 12px 10px; box-shadow: 0 0 0 2px var(--fL), 0 10px 30px rgba(13,13,15,.35); display: grid; gap: 8px; text-align: center; animation: pop-in .5s var(--spring) both; }
  .fit-pw.big { padding: 16px 14px 14px; gap: 9px; }
  .fit-pw-top { display: flex; align-items: center; justify-content: center; gap: 8px; }
  .fit-pw-top .emo { font-size: 26px; } .fit-pw.big .fit-pw-top .emo { font-size: 34px; }
  .fit-pw > b { font-size: 13px; font-weight: 800; line-height: 1.25; } .fit-pw.big > b { font-size: 15px; }
  .fit-pw > small { font-size: 11px; font-weight: 700; color: #a9a9b2; }
  .fit-pw-cd { justify-self: center; background: var(--fV); border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 800; }
  .fit-pw-cd b { font-family: var(--fnum); font-weight: 600; font-size: 15px; color: var(--fL); font-variant-numeric: tabular-nums; }
  [data-screen="fit"] .btn.fit-pw-btn { height: 44px; font-size: 13px; padding: 0 10px; animation: pulse 1.6s ease-in-out infinite; }
  .fit-wo-lim { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #1d1d22; border-radius: 14px; padding: 9px 12px; font-size: 12px; font-weight: 700; color: #cfcfd6; }
  .fit-wo-lim button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 2px; background: var(--fL); color: var(--fK); border-radius: 999px; padding: 5px 10px; font-size: 12px; font-weight: 800; }
  .fit-xtra { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .fit-xtra span { background: #fff; border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 800; }
  .fit-xtra b { font-size: 15px; } .fit-xtra .gold { background: linear-gradient(135deg, #ffe08a, #e9b949 55%, #b8841f); }

  /* ---------- Устройство на браслете ---------- */
  /* Нет часов: силуэт телефона */
  .fit-phone { width: 92px; height: 150px; margin: 0 20px 0 14px; flex: 0 0 auto; border-radius: 22px; background: #26262d; box-shadow: inset 0 0 0 3px #3a3a44; position: relative; padding: 18px 7px 12px; animation: float 3.4s ease-in-out infinite; }
  .fit-ph-notch { position: absolute; top: 7px; left: 50%; width: 28px; height: 6px; margin-left: -14px; border-radius: 999px; background: #0d0d0f; }
  .fit-ph-scr { height: 100%; border-radius: 14px; background: linear-gradient(170deg, #2a1d8f, #15151b); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; filter: blur(.4px); }
  .fit-ph-scr .emo { font-size: 22px; } .fit-ph-scr b { font-size: 18px; color: var(--fL); } .fit-ph-scr small { font-size: 10px; font-weight: 700; color: #a9a9b2; }
  .fit-hero.dev-phone .fit-bpm b { font-size: 46px; }
  .fit-hero.dev-phone .fit-zone { height: auto; padding: 5px 10px; white-space: normal; line-height: 1.2; }
  .fit-fuzzy { margin-top: 10px; font-size: 14px; font-weight: 800; color: var(--fL); animation: fit-fz 2.4s ease-in-out infinite; }
  @keyframes fit-fz { 50% { opacity: .55; transform: translateX(3px); } }
  .fit-lg.locked i { background: #3a3a44; }
  .fit-lg.locked b { font-size: 18px; color: #6c6c78; }
  .fit-ph-cta { margin-top: 10px; position: relative; font-size: 14px !important; min-height: 50px; animation: pulse 1.8s ease-in-out infinite; }
  /* Band: ремешок; Watch: квадратный корпус и коронка; Ultra: золотой безель */
  .fit-ringbox::before { content: ""; position: absolute; left: 50%; top: -8px; bottom: -8px; width: 62px; margin-left: -31px; border-radius: 18px; background: repeating-linear-gradient(0deg, #1e1e24 0 9px, #2a2a32 9px 11px); }
  .fit-pod { position: absolute; inset: 3px; border-radius: 50%; background: #131317; box-shadow: 0 0 0 3px #2e2e36; }
  .fit-rings, .fit-ring-c { position: relative; z-index: 1; } .fit-ring-c { position: absolute; }
  .fit-hero.dev-watch .fit-ringbox::before, .fit-hero.dev-ultra .fit-ringbox::before { width: 84px; margin-left: -42px; top: -12px; bottom: -12px; border-radius: 22px; }
  .fit-hero.dev-watch .fit-pod, .fit-hero.dev-ultra .fit-pod { inset: -4px; border-radius: 40px; box-shadow: 0 0 0 4px #3c3c46; }
  .fit-hero.dev-watch .fit-ringbox::after, .fit-hero.dev-ultra .fit-ringbox::after { content: ""; position: absolute; right: -11px; top: 50%; width: 7px; height: 26px; margin-top: -13px; border-radius: 4px; background: #4a4a55; }
  .fit-hero.dev-ultra .fit-pod { box-shadow: 0 0 0 4px #e9b949, 0 0 0 6px #8a6416, 0 0 22px rgba(233,185,73,.45); }
  .fit-hero.dev-ultra .fit-ringbox::after { background: linear-gradient(#ffe08a, #b8841f); }
  .fit-hero.dev-ultra .fit-ringbox::before { background: repeating-linear-gradient(0deg, #ff7a1a 0 9px, #e5650c 9px 11px); }
  .fit-hero.dev-ultra .fit-h-brand { color: #e9b949; }
  .fit-ultra-tag { position: absolute; z-index: 2; left: 50%; bottom: -2px; transform: translateX(-50%); font-family: var(--fnum); font-size: 10px; letter-spacing: 2px; color: var(--fK); background: linear-gradient(135deg, #ffe08a, #e9b949); border-radius: 999px; padding: 1px 8px; }

  /* ---------- Мини-игры (шиты) ---------- */
  .fit-wo-hud { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; margin-bottom: 6px; font-variant-numeric: tabular-nums; }
  .fit-wo-hud b { font-family: var(--font-display); font-weight: 400; font-size: 18px; }
  .fit-wo-arena { height: 250px; position: relative; display: grid; place-items: center; margin: 10px 0 14px; border: var(--line); border-radius: 26px; background: radial-gradient(circle, #fff 0, var(--lilac) 70%); overflow: hidden; touch-action: manipulation; }
  .fit-wo-tgt { width: 120px; height: 120px; border-radius: 50%; background: var(--pink); border: 4px solid var(--ink); box-shadow: 0 5px 0 var(--ink); font-size: 54px; display: grid; place-items: center; position: relative; z-index: 2; }
  .fit-wo-guide { position: absolute; width: 120px; height: 120px; border-radius: 50%; border: 4px dashed var(--ink); opacity: .5; pointer-events: none; }
  .fit-wo-fb { position: absolute; top: 16px; left: 0; right: 0; text-align: center; font-family: var(--font-display); font-size: 22px; opacity: 0; pointer-events: none; z-index: 3; }
  .fit-wo-fb.on { animation: fit-fb .6s var(--spring); }
  @keyframes fit-fb { 0% { opacity: 0; transform: scale(.5); } 30% { opacity: 1; transform: scale(1.15); } 100% { opacity: 0; transform: translateY(-14px); } }
  .fit-wo-res { text-align: center; padding: 10px; }
  .fit-wo-res .big-num { font-size: 64px; } .fit-wo-res b { display: block; font-size: 16px; margin-top: 6px; } .fit-wo-res small { font-size: 12px; font-weight: 700; color: var(--muted); }
  .fit-med { position: relative; width: 210px; height: 210px; margin: 6px auto 16px; display: grid; place-items: center; }
  .fit-med-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
  .fit-breath { width: 110px; height: 110px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, var(--mint) 45%, var(--violet)); border: 4px solid var(--ink); display: grid; place-items: center; font-family: var(--font-display); font-size: 16px; color: var(--ink); transition: transform .4s var(--spring); }
  .fit-breath.on { animation: fit-breathe 2.5s ease-in-out infinite; }
  @keyframes fit-breathe { 0%, 100% { transform: scale(.85); } 50% { transform: scale(1.45); } }
  .fit-hold { touch-action: none; -webkit-touch-callout: none; }
  @media (max-width: 360px) {
    .fit-ringbox { width: 124px; height: 124px; }
    .fit-bpm b { font-size: 54px; }
    .fit-donut { transform: scale(.9); margin: -10px auto -8px; }
    .fit-mx-dots { grid-template-columns: repeat(2, 13px); grid-auto-rows: 13px; gap: 4px; }
    .fit-mx { --s: 17px; }
    .fit-mx-dots i { width: 13px; height: 13px; }
    .fit-steps-num { font-size: 48px; }
    .fit-tile-n { font-size: 42px; }
  }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
