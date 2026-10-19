/* ============================================================
   Vibe Fit — фитнес-браслет. Вкладка «fit».
   Показывает всё тело персонажа (body.js) и даёт на него влиять:
   сон, еда, шаги и тренировка, настроение, здоровье.
   Обновляется на месте: подписка Vibe.body.on + тик каждые 2,5 с.
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

  /* ---------- Подписи и оценки ---------- */
  const nutrLabel = (n) => n < 35 ? { t: "Фастфуд-марафон", e: "🍟", c: "c-coral" }
    : n < 55 ? { t: "Так себе", e: "🥪", c: "c-yellow" }
    : n < 80 ? { t: "Сбалансированно", e: "🥗", c: "c-lime" }
    : { t: "Как у фитнес-блогера", e: "🥑", c: "c-mint" };
  const healthLabel = (h) => h < 35 ? "Хрупкий, как твой бюджет" : h < 60 ? "Живой. Пока" : h < 80 ? "Нормальный" : "Железный";
  const moodFace = (m) => m < 20 ? "😭" : m < 40 ? "😕" : m < 60 ? "😐" : m < 80 ? "🙂" : "🤩";
  const moodText = (m) => m < 20 ? "Дно. Но снизу постучали" : m < 40 ? "Так себе вайб" : m < 60 ? "Ровно. Как гречка" : m < 80 ? "Хороший вайб" : "Эйфория! Подозрительно";
  const qColor = (q) => q >= 0.85 ? "var(--lime)" : q >= 0.7 ? "var(--mint)" : q >= 0.55 ? "var(--yellow)" : "var(--coral)";
  const bpmZone = (bpm) => bpm < 62 ? "дзен" : bpm < 75 ? "спокойствие" : bpm < 90 ? "лёгкий стресс" : bpm < 110 ? "кардио" : "паника";
  function verdict(p, b) {
    if (b.sleeping) return "Ты спишь. Продуктивность 0% — как у всех на планёрке 😴";
    if (b.sick) return "Болеешь: продуктивность ×0,5. Начальник «очень сочувствует» 🤒";
    if (p >= 85) return "Машина. Начальник плачет от счастья 🚀";
    if (p >= 65) return "Рабочий режим. Премия смотрит на тебя с интересом 💼";
    if (p >= 45) return "Работаешь на полшишечки. Премия — тоже 🫠";
    return "Ты сейчас как Wi-Fi в метро. Вроде есть, но толку ноль 📉";
  }

  /* ---------- Заботик: хитрый совет по данным ---------- */
  function insight(b) {
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

  /* ---------- Мини-графики ---------- */
  function sleepChart(log) {
    const L = (log || []).slice(-7);
    if (!L.length) return `<div class="fit-empty">🌙 Пока ни одной ночи. Браслет ждёт, когда ты наконец ляжешь</div>`;
    const max = Math.max(9, ...L.map((x) => x.hours));
    const pad = Array.from({ length: 7 - L.length }, () => `<div class="fit-col"><span class="fit-b ghost" style="--h:6"></span><small>—</small></div>`).join("");
    return `<div class="fit-chart">${pad}${L.map((x) => `
      <div class="fit-col" title="${x.why ? V.esc(x.why) : ""}">
        <em>${comma(x.hours)}</em>
        <span class="fit-b" style="--h:${Math.max(6, (x.hours / max) * 100).toFixed(1)};background:${qColor(x.q)}">${x.auto ? "🤖" : ""}</span>
        <small>${dom(x.day)}</small>
      </div>`).join("")}</div>
      <div class="fit-keys"><span><i style="background:var(--lime)"></i>отлично</span><span><i style="background:var(--mint)"></i>норм</span><span><i style="background:var(--yellow)"></i>так себе</span><span><i style="background:var(--coral)"></i>Валера</span></div>`;
  }
  function stepsChart(log, day) {
    const L = (log || []).filter((x) => x.day !== day).slice(-6);
    const G = goal();
    const max = Math.max(G * 1.25, ...L.map((x) => x.steps));
    const col = (st, d, today) => `
      <div class="fit-col">
        <em>${today ? `<span data-t="stoday">${(st / 1000).toFixed(1)}</span>` : (st / 1000).toFixed(1)}k</em>
        <span class="fit-b${today ? " today" : ""}" ${today ? "data-todaybar" : ""} style="--h:${Math.max(4, (st / max) * 100).toFixed(1)};background:${st >= G ? "var(--lime)" : today ? "var(--sky)" : "var(--lilac)"}">${st >= G ? "🔥" : ""}</span>
        <small>${today ? "сег" : dom(d)}</small>
      </div>`;
    return `<div class="fit-chart steps" style="--goal:${((G / max) * 100).toFixed(1)}" data-max="${max}">
      <div class="fit-goal-line"><b>цель ${G / 1000}k</b></div>
      ${L.map((x) => col(x.steps, x.day, false)).join("")}${col(0, day, true)}</div>`;
  }

  /* ---------- Куски, которые перерисовываются при изменении ---------- */
  function wakeHtml(b) {
    if (!b.sleeping) return "";
    return `<button class="btn yellow xl block fit-wake" data-act="wake">☀️ Проснуться</button>`;
  }
  function lastSleepHtml(b) {
    const last = (b.sleepLog || []).slice(-1)[0];
    if (!last) return `<div class="fit-ls"><div class="big-num">—</div><div><b>Ты ещё не спал</b><small>Браслет не видел твой сон. Это тревожно</small></div></div>`;
    return `<div class="fit-ls">
      <div class="big-num">${comma(last.hours)}<span>ч</span></div>
      <div style="flex:1;min-width:0"><b>Прошлый сон · качество ${r0(last.q * 100)}%</b>
      <small>${last.hours >= 7 ? "Выспался. Редкое достижение" : last.hours >= 5 ? "Жить можно. Но не хочется" : "Это был не сон, а перезагрузка"}${last.auto ? " · автопилот 🤖" : ""}</small></div>
      <span class="fit-qdot" style="background:${qColor(last.q)}"></span>
    </div>`;
  }
  function sleepNowHtml(b, now) {
    if (!b.sleeping) return "";
    const mins = now - b.sleeping.at;
    return `<div class="card tight c-black fit-sleepnow">
      <div class="fit-sn-top"><span class="emo float">💤</span><div><b>Спишь ${dur(mins)}</b><small>Качество ${r0(b.sleeping.q * 100)}% · энергия копится</small></div></div>
      <div class="progress fit-pg"><i style="--p:${r0(b.energy)}%;background:var(--sky)"></i></div>
      <small class="fit-sn-sub">⚡ ${r0(b.energy)}% · проснёшься сам на 100%, если уже утро</small>
    </div>`;
  }
  function sleepActHtml(b) {
    if (b.sleeping) return `<button class="btn yellow block" data-act="wake">☀️ Проснуться</button>`;
    const home = V.body.atHome();
    return `<button class="btn black block fit-sleepbtn" data-act="sleep">🌙 Лечь спать${b.energy > 85 ? ` <span class="badge" style="background:var(--yellow);color:var(--ink)">бодр</span>` : ""}</button>
      ${home ? "" : `<button class="btn sky block fit-mt" data-go="maps" style="background:var(--sky)">🗺️ Ты не дома · доехать в Vibe Maps</button>`}`;
  }
  function upsellHtml(sq) {
    const h = S().home || {};
    if (h.own) return `<div class="card tight c-mint fit-upsell"><span class="emo float" style="font-size:40px">🏡</span><div><b>Своя квартира — сон на максимуме</b><small>Валера остался в прошлой жизни. Иногда ты по нему даже скучаешь</small></div></div>`;
    const tgt = (!h.rent || h.rent <= 45000)
      ? { q: 0.86, t: "нормальной квартире", go: "rent", btn: "🔑 Смотреть квартиры" }
      : { q: 0.95, t: "своей квартире", go: "home-buy", btn: "🏠 Купить жильё" };
    if (sq.q >= tgt.q - 0.02) return `<div class="card tight c-mint fit-upsell"><span class="emo float" style="font-size:40px">${sq.e}</span><div><b>Сон и так на уровне</b><small>Качество ${r0(sq.q * 100)}%. Дальше только своя квартира и беруши из золота</small></div><button class="btn sm black" data-go="home-buy">🏠</button></div>`;
    const n = Math.max(3, r0(((tgt.q - sq.q) / sq.q) * 100));
    return `<div class="card c-yellow fit-upsell big">
      <div class="sticker" style="top:10px;right:10px;background:var(--pink)">+${n}% сна</div>
      <div class="fit-up-row"><span class="emo wobble" style="font-size:46px">${sq.e}</span>
      <div><b class="display" style="font-size:19px;display:block">В квартире получше ты бы высыпался на ${n}% лучше</b>
      <small>Сейчас качество сна ${r0(sq.q * 100)}%. В ${tgt.t} — около ${r0(tgt.q * 100)}%. Жильё решает, а не мелатонин</small></div></div>
      <div class="fit-up-btns"><button class="btn black sm" data-go="${tgt.go}">${tgt.btn} →</button>${tgt.go === "rent" ? `<button class="btn sm" data-go="home-buy">🏠 Или своё</button>` : ""}</div>
    </div>`;
  }
  function mealsHtml(b, day) {
    const M = (b.meals || []).filter((m) => m.day === day);
    if (!M.length) return `<div class="fit-empty">🥺 Сегодня ты ещё ничего не ел. Заботик волнуется и уже открыл Vibe Eat</div>`;
    return M.slice().reverse().map((m) => `
      <div class="fit-meal"><span class="emo">${m.e}</span><div><b>${V.esc(m.t)}</b><small>${hhmm(m.min)}</small></div>
      <span class="badge" style="background:${m.q >= 70 ? "var(--lime)" : m.q >= 45 ? "var(--yellow)" : "var(--coral)"}">${m.q >= 70 ? "полезно" : m.q >= 45 ? "сойдёт" : "грешно"}</span></div>`).join("");
  }
  function fridgeHtml(b) {
    const n = b.fridge || 0;
    const items = ["🥚", "🥦", "🍗", "🧀", "🥕", "🍅", "🥛", "🫑", "🍝", "🐟"];
    return `<div class="fit-fridge ${n ? "" : "empty"}">
      <div class="fit-fr-door"><span class="emo">🧊</span><b>${n}</b><small>порц.</small></div>
      <div class="fit-fr-shelf">${n ? Array.from({ length: Math.min(n, 10) }, (_, i) => `<span class="emo">${items[i % items.length]}</span>`).join("") + (n > 10 ? `<small>+${n - 10}</small>` : "") : `<small>Пусто. Только лампочка и эхо</small>`}</div>
    </div>`;
  }
  function foodActHtml(b) {
    const n = b.fridge || 0;
    return `<div class="fit-acts">
      ${n ? `<button class="btn lime block" data-act="cook">🍳 Приготовить из холодильника</button>`
          : `<button class="btn lime block" disabled>🍳 Приготовить — холодильник пуст</button><button class="btn block" data-go="supermarket">🥑 В Supermarket за продуктами</button>`}
      <div class="grid2"><button class="btn pink" data-go="eat">🍜 Заказать еду</button><button class="btn yellow" data-act="vend">🍫 Автомат · 159 ₽</button></div>
    </div>`;
  }
  function workoutHtml(b, now) {
    const left = WORKOUT_CD - (now - (b.workoutAt ?? -9999));
    if (left > 0) return `<button class="btn block" disabled>🏋️ Мышцы отдыхают · ещё ${dur(left)}</button>`;
    return `<button class="btn grad xl block fit-wo-btn" data-act="workout">🏋️ Тренировка · 15 сек</button>`;
  }
  function moodActHtml(now, day) {
    const m = meta();
    const medLeft = MEDITATE_CD - (now - (m.medAt ?? -9999));
    const momDone = m.momDay === day;
    return `<div class="grid2">
      ${medLeft > 0 ? `<button class="btn" disabled>🧘 Дзен через ${dur(medLeft)}</button>` : `<button class="btn lime" data-act="meditate">🧘 Медитация</button>`}
      ${momDone ? `<button class="btn" disabled>📞 Мама на сегодня ✓</button>` : `<button class="btn pink" data-act="mom">📞 Позвонить маме</button>`}
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
    return `<div class="card c-coral fit-sick">
      <div class="sticker" style="top:12px;right:12px;background:#fff">×0,5</div>
      <span class="emo wobble" style="font-size:60px">🤒</span>
      <div class="display" style="font-size:28px;margin:6px 0 4px">Ты заболел</div>
      <p>Продуктивность ×0,5. Сон и врач помогут. Чай с лимоном — нет, но попробовать стоит</p>
      <button class="btn black block" data-go="health">💊 В Vibe Health <span class="arrow">→</span></button>
    </div>`;
  }

  /* ---------- Экран ---------- */
  V.screen("fit", {
    render() {
      if (!V.body) return `<div class="head"><div class="title">Vibe Fit</div></div><div class="card">Браслет не подключён. Как и ты к реальности</div>`;
      V.body.tick();
      const b = V.body.get();
      const g = V.game.info();
      const ring = (k, c, r) => `
        <circle class="fit-rt" cx="120" cy="120" r="${r}" stroke="${c}"/>
        <circle class="fit-rf" data-ring="${k}" cx="120" cy="120" r="${r}" stroke="${c}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>`;
      const pbar = (k, e, t, c) => `
        <div class="fit-pb"><span class="emo">${e}</span><div class="fit-pb-m"><div class="fit-pb-t"><b>${t}</b><small data-t="pv-${k}">0%</small></div>
        <div class="progress fit-pg"><i data-b="p-${k}" style="background:${c}"></i></div></div></div>`;
      return `
      <div class="head">
        <div class="title" style="font-size:26px">Vibe Fit<small>Браслет, который знает о тебе всё. Даже лишнее</small></div>
        ${V.ui.vibikiPill()}
      </div>

      <div class="stagger">
        <div class="card c-lilac fit-hero">
          <span class="emo float fit-fl" style="left:14px;top:40px">⚡</span>
          <span class="emo float d1 fit-fl" style="right:16px;top:70px">🍔</span>
          <span class="emo float d2 fit-fl" style="left:20px;bottom:30px">👟</span>
          <span class="emo float d3 fit-fl" style="right:22px;bottom:26px">💜</span>
          <div class="fit-strap top"></div>
          <div class="fit-face" data-face>
            <span class="fit-crown"></span>
            <svg class="fit-rings" viewBox="0 0 240 240" aria-hidden="true">
              ${ring("e", "#8fd8ff", 104)}${ring("f", "#ff6bcb", 84)}${ring("s", "#c6ff4d", 64)}
            </svg>
            <div class="fit-center" data-act="heart">
              <div class="fit-time" data-t="time">${g.time}</div>
              <div class="fit-bpm"><span class="fit-heart">❤️</span><span class="fit-zz">😴</span><b data-t="bpm">${V.body.heartRate(b)}</b></div>
              <small class="fit-bpm-l">BPM · <span data-t="zone">—</span></small>
            </div>
            <div class="fit-zzz"><span>z</span><span>z</span><span>Z</span></div>
          </div>
          <div class="fit-strap bot"></div>
        </div>

        <div class="fit-legend">
          <button class="fit-lg" data-act="ring" data-e="⚡"><i style="background:#8fd8ff"></i><small>Энергия</small><b data-t="le">0%</b></button>
          <button class="fit-lg" data-act="ring" data-e="🍔"><i style="background:#ff6bcb"></i><small>Еда</small><b data-t="lf">0%</b></button>
          <button class="fit-lg" data-act="ring" data-e="👟"><i style="background:#c6ff4d"></i><small>Движение</small><b data-t="ls">0%</b></button>
        </div>
        <div data-c="wake"></div>
        <div class="fine" style="text-align:center">Пульс измерен приблизительно. Как и всё в твоей жизни. <span data-t="date">${g.label}</span></div>

        <!-- Продуктивность -->
        <h2 class="sec">Продуктивность <small>для работы</small></h2>
        <div class="card c-yellow fit-prod">
          <div class="fit-prod-top">
            <div><div class="big-num fit-prod-num"><span data-t="prod" data-val="0">0</span>%</div>
            <div class="fit-prod-sub">💼 Влияет на премию за рабочие задачи</div></div>
            <span class="emo float fit-prod-emo" data-t="prodemo">🚀</span>
          </div>
          <div class="fit-pbs">
            ${pbar("e", "⚡", "Энергия · 40%", "var(--sky)")}
            ${pbar("f", "🍔", "Сытость · 20%", "var(--pink)")}
            ${pbar("m", "😊", "Настроение · 25%", "var(--orange)")}
            ${pbar("h", "❤️", "Здоровье · 15%", "var(--lime)")}
          </div>
          <div class="fit-verdict" data-t="verdict"></div>
        </div>

        <!-- Сон -->
        <h2 class="sec">Сон <small data-t="sq">—</small></h2>
        <div class="card fit-sleep">
          <div data-c="lastsleep"></div>
          <div data-c="sleepchart"></div>
          <div class="fit-why"><span class="emo" data-t="sqe">🛏️</span><div><b>Почему такой сон</b><small data-t="why"></small></div></div>
          <div data-c="sleepnow"></div>
          <div data-c="sleepact" class="fit-mt"></div>
        </div>
        <div data-c="upsell" class="fit-mt"></div>

        <!-- Еда -->
        <h2 class="sec">Еда и питание <small data-t="mealsn">0 приёмов</small></h2>
        <div class="card fit-food">
          <div class="fit-pb"><span class="emo">🍔</span><div class="fit-pb-m"><div class="fit-pb-t"><b>Сытость</b><small data-t="food">0%</small></div>
            <div class="progress fit-pg big"><i data-b="food" style="background:var(--pink)"></i></div></div></div>
          <div data-c="nutr"></div>
          <div class="fit-sub">Сегодня ты съел</div>
          <div data-c="meals" class="fit-meals"></div>
          <div class="fit-sub">Холодильник</div>
          <div data-c="fridge"></div>
          <div data-c="foodact"></div>
        </div>

        <!-- Активность -->
        <h2 class="sec">Активность <small>цель ${V.fmt(goal())}</small></h2>
        <div class="card fit-act">
          <div class="fit-steps">
            <div class="fit-sring">
              <svg viewBox="0 0 140 140" aria-hidden="true">
                <circle class="fit-rt" cx="70" cy="70" r="56" stroke="#c6ff4d"/>
                <circle class="fit-rf" data-ring="st" cx="70" cy="70" r="56" stroke="#c6ff4d" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
              </svg>
              <div class="fit-sring-c"><span class="emo">👟</span><b data-t="stpct">0%</b></div>
            </div>
            <div style="flex:1;min-width:0">
              <div class="big-num fit-steps-num" data-t="steps" data-val="0">0</div>
              <small class="muted fit-steps-sub">шагов из ${V.fmt(goal())}</small>
              <div class="fit-steps-left" data-t="stleft"></div>
            </div>
          </div>
          <div data-c="stepschart"></div>
          <div data-c="workout" class="fit-mt"></div>
          <button class="btn block fit-mt" data-go="maps">🚶 Прогуляться по карте</button>
          <div class="fine">Тренировка: тапай в ритм 15 секунд. Шаги, настроение и вайбики — за точность, не за усилия. Как в жизни.</div>
        </div>

        <!-- Настроение -->
        <h2 class="sec">Настроение <small data-t="moodt">—</small></h2>
        <div class="card c-sky fit-mood">
          <div class="fit-gauge">
            <svg viewBox="0 0 220 128" aria-hidden="true">
              <defs><linearGradient id="fitg" x1="0" x2="1"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".5" stop-color="#ffe14d"/><stop offset="1" stop-color="#c6ff4d"/></linearGradient></defs>
              <path d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke="#0e0e12" stroke-width="26" stroke-linecap="round"/>
              <path d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke="url(#fitg)" stroke-width="19" stroke-linecap="round"/>
              <g class="fit-needle" data-needle><line x1="110" y1="112" x2="110" y2="38" stroke="#0e0e12" stroke-width="6" stroke-linecap="round"/></g>
              <circle cx="110" cy="112" r="11" fill="#0e0e12"/>
            </svg>
            <div class="fit-gauge-c"><span class="emo" data-t="moodface">😐</span><b class="big-num" data-t="mood" data-val="0">0</b></div>
          </div>
          <div class="fit-sub">Поднимает ⬆️</div>
          <div class="fit-chips">
            <button class="fit-chip up" data-go="music">🎧 Музыка</button>
            <button class="fit-chip up" data-go="games">🎮 Игры</button>
            <button class="fit-chip up" data-go="tickets">🎤 Концерты</button>
            <button class="fit-chip up" data-go="job">💸 Зарплата</button>
          </div>
          <div class="fit-sub">Опускает ⬇️</div>
          <div class="fit-chips" data-c="drops"></div>
          <div data-c="moodact" class="fit-mt"></div>
        </div>

        <!-- Здоровье -->
        <h2 class="sec">Здоровье <small data-t="hlabel">—</small></h2>
        <div data-c="sick"></div>
        <div class="card fit-health">
          <div class="fit-pb"><span class="emo">❤️‍🩹</span><div class="fit-pb-m"><div class="fit-pb-t"><b>Здоровье</b><small data-t="health">0%</small></div>
            <div class="progress fit-pg big"><i data-b="health" style="background:var(--lime)"></i></div></div></div>
          <div class="fit-hmix">
            <span>😴 Сон <b>35%</b></span><span>🥗 Питание <b>30%</b></span><span>👟 Шаги <b>20%</b></span><span>😊 Вайб <b>15%</b></span>
          </div>
          <div class="fine">Здоровье пересчитывается в полночь по формуле выше. Формулу утвердил отдел маркетинга.</div>
        </div>

        <div class="card c-lime fit-zab">
          ${V.zabotik(58, "sly")}
          <div><b>Заботик анализирует</b><span data-t="zab"></span></div>
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
      const txt = (k, v) => { const el = $(`[data-t="${k}"]`); if (el && el.textContent !== String(v)) el.textContent = v; };
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

      function update() {
        if (!alive) return;
        const b = V.body.get();
        const g = V.game.info();
        const now = V.game.minutes();
        const day = Math.floor(now / 1440);
        const P = V.body.productivity(b);
        const sq = V.body.sleepQuality(b);
        const G = goal();
        const stPct = (b.steps / G) * 100;

        // Браслет
        const face = $("[data-face]");
        if (face) face.classList.toggle("night", !!b.sleeping);
        txt("time", g.time); txt("date", g.label);
        ring("e", b.energy); ring("f", b.food); ring("s", stPct);
        txt("le", r0(b.energy) + "%"); txt("lf", r0(b.food) + "%"); txt("ls", r0(Math.min(999, stPct)) + "%");
        chunk("wake", wakeHtml(b));

        // Продуктивность
        num("prod", P.value);
        txt("prodemo", P.value >= 80 ? "🚀" : P.value >= 60 ? "💼" : P.value >= 40 ? "🐢" : b.sleeping ? "😴" : "🪫");
        [["e", P.parts.energy], ["f", P.parts.food], ["m", P.parts.mood], ["h", P.parts.health]].forEach(([k, v]) => { bar("p-" + k, v); txt("pv-" + k, r0(v) + "%"); });
        txt("verdict", verdict(P.value, b));

        // Сон
        txt("sq", `${sq.e} качество ${r0(sq.q * 100)}%`);
        txt("sqe", sq.e); txt("why", sq.why);
        chunk("lastsleep", lastSleepHtml(b));
        if (chunk("sleepchart", sleepChart(b.sleepLog))) grow("[data-c='sleepchart']");
        chunk("sleepnow", sleepNowHtml(b, now));
        chunk("sleepact", sleepActHtml(b));
        chunk("upsell", upsellHtml(sq));

        // Еда
        bar("food", b.food); txt("food", r0(b.food) + "%");
        const nl = nutrLabel(b.nutrition);
        chunk("nutr", `<div class="fit-nutr ${nl.c}"><span class="emo wobble">${nl.e}</span><div><small>Качество питания</small><b>${nl.t}</b></div><span class="big-num">${r0(b.nutrition)}<small>/100</small></span></div>`);
        const todayMeals = (b.meals || []).filter((m) => m.day === day).length;
        txt("mealsn", `${todayMeals} ${todayMeals === 1 ? "приём" : todayMeals >= 2 && todayMeals <= 4 ? "приёма" : "приёмов"}`);
        chunk("meals", mealsHtml(b, day));
        chunk("fridge", fridgeHtml(b));
        chunk("foodact", foodActHtml(b));

        // Активность
        ring("st", stPct);
        txt("stpct", r0(stPct) + "%");
        num("steps", b.steps);
        txt("stleft", b.steps >= G ? "🔥 Цель выполнена! Можно гордиться и лежать" : `Ещё ${V.fmt(G - b.steps)} шагов ≈ ${comma(((G - b.steps) / 1350).toFixed(1))} км до цели`);
        if (chunk("stepschart", stepsChart(b.stepsLog, day))) grow("[data-c='stepschart']");
        const tb = $("[data-todaybar]"), chart = $(".fit-chart.steps");
        if (tb && chart) {
          const max = +chart.dataset.max || G;
          tb.style.setProperty("--h", Math.max(4, Math.min(100, (b.steps / max) * 100)).toFixed(1));
          tb.style.background = b.steps >= G ? "var(--lime)" : "var(--sky)";
          txt("stoday", (b.steps / 1000).toFixed(1));
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
        txt("moodface", moodFace(b.mood));
        num("mood", b.mood);
        txt("moodt", moodText(b.mood));
        chunk("drops", dropsHtml(b));
        chunk("moodact", moodActHtml(now, day));

        // Здоровье
        bar("health", b.health); txt("health", r0(b.health) + "%");
        txt("hlabel", (b.sick ? "🤒 " : "") + healthLabel(b.health));
        chunk("sick", sickHtml(b));

        txt("zab", insight(b));
      }

      function grow(sel) {
        const el = $(sel);
        if (el) el.querySelectorAll(".fit-b").forEach((x, i) => { x.style.animationDelay = i * 50 + "ms"; x.classList.add("grow"); });
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
      // Кольца «заряжаются» после появления
      root.querySelectorAll("[data-ring]").forEach((c) => { const v = c.getAttribute("stroke-dashoffset"); c.setAttribute("stroke-dashoffset", "100"); timers.push(setTimeout(() => c.setAttribute("stroke-dashoffset", v), 250)); });
      timers.push(setInterval(() => { V.body.tick(); update(); }, 2500));
      timers.push(setInterval(pulse, 2000));

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
          FX.bump($(".fit-face"));
          FX.burst(a, { emojis: b.sleeping ? ["💤", "🌙", "⭐"] : ["❤️", "💓", "💗"], count: 10 });
          FX.toast(b.sleeping ? `Пульс ${bpm}. Спишь как младенец. Младенец с ипотекой` : `Пульс ${bpm}. Сердце бьётся — уже неплохо`, "⌚");
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
        if (act === "wake") {
          const rec = V.body.wake();
          FX.burst(a, { emojis: ["☀️", "🌤️", "✨"], count: 14 });
          if (rec && rec.hours >= 0.5) FX.toast(`Доброе утро! Сон ${comma(rec.hours)} ч, качество ${r0(rec.q * 100)}%`, "☀️", 3000);
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
          setMeta({ momDay: dayNow() });
          const L = ["«Ты поел? А шапку надел?»", "«Тётя Галя спрашивает, когда свадьба»", "«Я тебе денег скинуть? Ладно, не скину»", "«Ты похудел. Или потолстел. Приезжай»", "«Папа передаёт привет. Молча»"];
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
          <p class="muted" style="font-weight:700;margin:6px 0 10px;font-size:14px">Тапай по кругу, когда он самый большой. 15 секунд, 80 ударов в минуту. Не спеши — браслет считает точность</p>
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
          const score = clamp(sum / BEATS, 0, 1);
          const vib = Math.round(15 + score * 85), xp = Math.round(10 + score * 40);
          V.body.effect("workout", { score });
          const arena = sh.querySelector(".fit-wo-arena");
          arena.innerHTML = `<div class="fit-wo-res"><div class="big-num">${r0(score * 100)}%</div><b>${score > 0.8 ? "Зверь! Тренер в слезах 🦍" : score > 0.5 ? "Достойно. Почти как в рилсах 💪" : "Ну, ты хотя бы встал с дивана 🛋️"}</b><small>Попаданий ${hits} из ${BEATS} · лучшее комбо ${best}</small></div>`;
          FX.sound.success();
          if (score > 0.8) FX.confetti();
          FX.burst(arena, { emojis: ["🏋️", "💪", "🔥", "✨"], count: 18 });
          V.reward({ vibiki: vib, xp, from: arena });
          const go = sh.querySelector("[data-wgo]");
          go.style.display = ""; go.innerHTML = `Красота · +${vib} 🪙`;
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
  .fit-hero { padding: 0 16px 16px; display: flex; flex-direction: column; align-items: center; min-height: 0; }
  .fit-fl { position: absolute; font-size: 26px; z-index: 0; }
  .fit-strap { width: 128px; height: 46px; background: repeating-linear-gradient(90deg, #2a2733 0 10px, #0e0e12 10px 14px); border: var(--line); border-top: 0; border-radius: 0 0 14px 14px; position: relative; z-index: 1; }
  .fit-strap.top { border-top: 0; margin-top: -2px; }
  .fit-strap.bot { border-radius: 14px 14px 0 0; border-bottom: 0; border-top: var(--line); margin-bottom: -18px; height: 40px; }
  .fit-face { --fit-bg: #121218; width: 240px; max-width: 100%; aspect-ratio: 1; border-radius: 70px; background: radial-gradient(circle at 30% 20%, #2b2838, var(--fit-bg) 60%); border: 4px solid var(--ink); box-shadow: 0 7px 0 var(--ink), inset 0 0 0 5px #3a3646; position: relative; z-index: 2; margin: -4px 0; transition: background .8s; }
  .fit-face.night { background: radial-gradient(1.5px 1.5px at 22% 30%, #fff, transparent), radial-gradient(1.5px 1.5px at 72% 22%, #fff, transparent), radial-gradient(1px 1px at 60% 78%, #fff, transparent), radial-gradient(circle at 30% 20%, #2c2477, #0b0b2a 65%); }
  .fit-crown { position: absolute; right: -11px; top: 46%; width: 10px; height: 34px; border-radius: 4px; background: #3a3646; border: 3px solid var(--ink); }
  .fit-rings { position: absolute; inset: 6px; width: calc(100% - 12px); height: calc(100% - 12px); transform: rotate(-90deg); }
  .fit-rt { fill: none; stroke-width: 16; opacity: .18; }
  .fit-rf { fill: none; stroke-width: 16; stroke-linecap: round; transition: stroke-dashoffset 1.4s var(--spring); filter: drop-shadow(0 0 4px rgba(255,255,255,.25)); }
  .fit-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; cursor: pointer; }
  .fit-time { font-family: var(--font-display); font-size: 15px; color: #c6ff4d; letter-spacing: 1px; font-variant-numeric: tabular-nums; }
  .fit-bpm { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
  .fit-bpm b { font-family: var(--font-display); font-weight: 400; font-size: 30px; line-height: 1; font-variant-numeric: tabular-nums; }
  .fit-heart { font-size: 20px; display: inline-block; animation: fit-beat var(--fit-beat, .9s) ease-in-out infinite; }
  .fit-zz { display: none; font-size: 22px; animation: float 3s ease-in-out infinite; }
  .fit-bpm-l { font-size: 9px; font-weight: 800; color: #b5b1c4; text-transform: uppercase; letter-spacing: .5px; }
  .fit-face.night .fit-heart { display: none; } .fit-face.night .fit-zz { display: inline-block; }
  .fit-face.night .fit-time { color: #8fd8ff; }
  @keyframes fit-beat { 0%, 60%, 100% { transform: scale(1); } 12% { transform: scale(1.32); } 24% { transform: scale(.95); } 36% { transform: scale(1.18); } }
  .fit-zzz { position: absolute; right: 34px; top: 30px; display: none; color: #8fd8ff; font-family: var(--font-display); pointer-events: none; }
  .fit-face.night .fit-zzz { display: block; }
  .fit-zzz span { position: absolute; font-size: 18px; opacity: 0; animation: fit-z 3s ease-in infinite; }
  .fit-zzz span:nth-child(2) { animation-delay: 1s; font-size: 22px; } .fit-zzz span:nth-child(3) { animation-delay: 2s; font-size: 28px; }
  @keyframes fit-z { 0% { transform: translate(0, 20px) rotate(-10deg); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(22px, -36px) rotate(14deg); opacity: 0; } }
  .fit-legend { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .fit-lg { background: var(--paper); border: var(--line); border-radius: 18px; box-shadow: var(--shadow-sm); padding: 8px 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
  .fit-lg i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--ink); }
  .fit-lg small { font-size: 11px; font-weight: 800; color: var(--muted); }
  .fit-lg b { font-family: var(--font-display); font-weight: 400; font-size: 18px; }
  .fit-wake { margin-top: 12px; animation: pulse 1.4s ease-in-out infinite; }
  .fit-mt { margin-top: 10px; }
  .fit-prod-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .fit-prod-num { font-size: 56px; }
  .fit-prod-sub { font-size: 12px; font-weight: 800; margin-top: 4px; }
  .fit-prod-emo { font-size: 54px; }
  .fit-pbs { display: grid; gap: 8px; margin-top: 14px; }
  .fit-pb { display: flex; align-items: center; gap: 10px; }
  .fit-pb > .emo { font-size: 24px; width: 30px; text-align: center; }
  .fit-pb-m { flex: 1; min-width: 0; }
  .fit-pb-t { display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; margin-bottom: 3px; gap: 6px; }
  .fit-pb-t small { font-weight: 900; font-variant-numeric: tabular-nums; }
  .fit-pg { height: 12px; } .fit-pg.big { height: 18px; }
  .fit-verdict { margin-top: 12px; background: rgba(255,255,255,.65); border: 2px solid var(--ink); border-radius: 14px; padding: 8px 10px; font-size: 13px; font-weight: 800; }
  .fit-ls { display: flex; align-items: center; gap: 12px; }
  .fit-ls .big-num { font-size: 44px; } .fit-ls .big-num span { font-size: 18px; margin-left: 2px; }
  .fit-ls b { display: block; font-size: 14px; font-weight: 900; } .fit-ls small { font-size: 12px; font-weight: 700; color: var(--muted); }
  .fit-qdot { width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid var(--ink); flex: 0 0 auto; }
  .fit-chart { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; height: 150px; align-items: end; margin-top: 14px; position: relative; }
  .fit-col { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; min-width: 0; position: relative; z-index: 1; }
  .fit-col em { font-style: normal; font-size: 10px; font-weight: 900; white-space: nowrap; }
  .fit-col small { font-size: 10px; font-weight: 800; color: var(--muted); }
  .fit-b { width: 100%; height: calc((100% - 36px) * var(--h, 0) / 100); min-height: 10px; border: 2.5px solid var(--ink); border-radius: 10px 10px 5px 5px; display: flex; justify-content: center; padding-top: 2px; font-size: 12px; transform-origin: bottom; transition: height .9s var(--spring), background .4s; }
  .fit-b.ghost { background: repeating-linear-gradient(45deg, #eee 0 4px, #fff 4px 8px); border-style: dashed; opacity: .6; }
  .fit-b.today { box-shadow: 0 0 0 3px var(--paper), 0 0 0 5px var(--ink); }
  .fit-b.grow { animation: fit-grow .8s var(--spring) both; }
  @keyframes fit-grow { from { transform: scaleY(0); } }
  .fit-chart.steps .fit-goal-line { position: absolute; left: 0; right: 0; bottom: calc(16px + (100% - 36px) * var(--goal) / 100); border-top: 2.5px dashed var(--ink); z-index: 2; pointer-events: none; }
  .fit-goal-line b { position: absolute; right: 0; top: -18px; font-size: 10px; font-weight: 900; background: var(--yellow); border: 2px solid var(--ink); border-radius: 999px; padding: 0 6px; }
  .fit-keys { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 8px; font-size: 11px; font-weight: 800; color: var(--muted); }
  .fit-keys i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; border: 1.5px solid var(--ink); margin-right: 4px; vertical-align: -1px; }
  .fit-empty { margin-top: 12px; padding: 12px; border: 2px dashed rgba(14,14,18,.25); border-radius: 16px; font-size: 13px; font-weight: 700; color: var(--muted); text-align: center; }
  .fit-why { display: flex; gap: 10px; align-items: center; margin-top: 14px; background: var(--bg); border-radius: 16px; padding: 10px 12px; }
  .fit-why > .emo { font-size: 32px; }
  .fit-why b { display: block; font-size: 13px; font-weight: 900; } .fit-why small { font-size: 12px; font-weight: 700; color: var(--muted); }
  .fit-sleepnow { margin-top: 12px; background: linear-gradient(135deg, #2c2477, #0b0b2a); }
  .fit-sn-top { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
  .fit-sn-top .emo { font-size: 32px; } .fit-sn-top b { display: block; font-size: 15px; } .fit-sn-top small, .fit-sn-sub { font-size: 12px; font-weight: 700; color: #b5b1c4; }
  .fit-sn-sub { display: block; margin-top: 6px; }
  .fit-upsell { display: flex; gap: 12px; align-items: center; }
  .fit-upsell.big { display: block; }
  .fit-upsell b { font-size: 14px; } .fit-upsell small { display: block; font-size: 12px; font-weight: 700; margin-top: 4px; }
  .fit-up-row { display: flex; gap: 12px; align-items: center; padding-right: 70px; }
  .fit-up-btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .fit-sub { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); margin: 14px 0 6px; }
  .fit-nutr { display: flex; align-items: center; gap: 10px; margin-top: 12px; border: var(--line); border-radius: 18px; padding: 10px 12px; box-shadow: var(--shadow-sm); }
  .fit-nutr > .emo { font-size: 34px; }
  .fit-nutr div { flex: 1; min-width: 0; } .fit-nutr small { font-size: 11px; font-weight: 800; display: block; } .fit-nutr b { font-size: 15px; font-weight: 900; }
  .fit-nutr .big-num { font-size: 30px; } .fit-nutr .big-num small { display: inline; font-size: 12px; }
  .fit-meals { display: grid; gap: 6px; }
  .fit-meal { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 2px dashed rgba(14,14,18,.12); }
  .fit-meal:last-child { border-bottom: 0; }
  .fit-meal > .emo { font-size: 26px; width: 40px; height: 40px; border: 2px solid var(--ink); border-radius: 13px; display: grid; place-items: center; background: var(--bg); }
  .fit-meal div { flex: 1; min-width: 0; } .fit-meal b { display: block; font-size: 14px; font-weight: 800; } .fit-meal small { font-size: 11px; font-weight: 700; color: var(--muted); }
  .fit-meals .fit-empty { margin-top: 0; }
  .fit-fridge { display: flex; gap: 10px; align-items: stretch; }
  .fit-fr-door { width: 74px; border: var(--line); border-radius: 16px; background: var(--sky); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6px 0; flex: 0 0 auto; }
  .fit-fr-door .emo { font-size: 22px; } .fit-fr-door b { font-family: var(--font-display); font-weight: 400; font-size: 24px; line-height: 1; } .fit-fr-door small { font-size: 10px; font-weight: 800; }
  .fit-fridge.empty .fit-fr-door { background: #e9e6f0; }
  .fit-fr-shelf { flex: 1; min-width: 0; border: 2px solid var(--ink); border-radius: 16px; background: linear-gradient(#f4fbff, #dff3ff); display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 8px; font-size: 22px; }
  .fit-fr-shelf small { font-size: 12px; font-weight: 800; color: var(--muted); }
  .fit-acts { display: grid; gap: 10px; margin-top: 14px; }
  .fit-acts .grid2 .btn { padding: 0 10px; font-size: 14px; }
  .fit-steps { display: flex; align-items: center; gap: 14px; }
  .fit-sring { width: 128px; height: 128px; position: relative; flex: 0 0 auto; }
  .fit-sring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .fit-sring .fit-rt { stroke: #0e0e12; opacity: .08; stroke-width: 18; }
  .fit-sring .fit-rf { stroke-width: 18; filter: none; }
  .fit-sring::after { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 2.5px solid var(--ink); pointer-events: none; }
  .fit-sring-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .fit-sring-c .emo { font-size: 28px; animation: wobble 1.6s ease-in-out infinite; } .fit-sring-c b { font-family: var(--font-display); font-weight: 400; font-size: 20px; }
  .fit-steps-num { font-size: 40px; }
  .fit-steps-sub { font-size: 12px; font-weight: 800; }
  .fit-steps-left { font-size: 12px; font-weight: 800; margin-top: 6px; background: var(--bg); border-radius: 12px; padding: 6px 8px; }
  .fit-wo-btn { animation: pulse 1.8s ease-in-out infinite; }
  .fit-gauge { position: relative; width: 240px; max-width: 100%; margin: 0 auto; }
  .fit-gauge svg { width: 100%; display: block; overflow: visible; }
  .fit-needle { transform-origin: 110px 112px; transform: rotate(-90deg); transition: transform 1.2s var(--spring); }
  .fit-gauge-c { position: absolute; left: 0; right: 0; bottom: -6px; display: flex; justify-content: center; align-items: flex-end; gap: 6px; pointer-events: none; }
  .fit-gauge-c .emo { font-size: 40px; background: var(--paper); border: var(--line); border-radius: 50%; width: 58px; height: 58px; display: grid; place-items: center; box-shadow: var(--shadow-sm); }
  .fit-gauge-c b { font-size: 26px; background: var(--paper); border: var(--line); border-radius: 12px; padding: 2px 8px; }
  .fit-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .fit-chip { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 999px; border: 2px solid var(--ink); background: var(--paper); font-size: 12px; font-weight: 800; transition: transform .2s var(--spring); }
  .fit-chip.up { background: var(--lime); box-shadow: 0 2px 0 var(--ink); }
  .fit-chip.up:active { transform: translateY(2px); box-shadow: none; }
  .fit-chip.hot { background: var(--coral); animation: wobble 1.4s ease-in-out infinite; }
  .fit-mood .grid2 .btn, .fit-mood .btn { font-size: 14px; padding: 0 10px; }
  .fit-sick { text-align: center; margin-bottom: 12px; animation: pulse 2s ease-in-out infinite; }
  .fit-sick p { font-weight: 700; font-size: 13px; margin-bottom: 12px; }
  .fit-hmix { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 12px; }
  .fit-hmix span { background: var(--bg); border-radius: 12px; padding: 6px 8px; font-size: 12px; font-weight: 800; display: flex; justify-content: space-between; gap: 4px; }
  .fit-zab { display: flex; gap: 12px; align-items: center; margin-top: 18px; }
  .fit-zab b { display: block; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; }
  .fit-zab span { font-size: 14px; font-weight: 800; }
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
  [data-screen="fit"] .btn { white-space: normal; line-height: 1.1; text-align: center; }
  @media (max-width: 360px) {
    .fit-face { width: 210px; border-radius: 60px; }
    .fit-sring { width: 104px; height: 104px; }
    .fit-steps-num { font-size: 32px; }
    .fit-up-row { padding-right: 0; padding-top: 22px; }
  }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
