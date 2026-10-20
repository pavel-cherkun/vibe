/* ============================================================
   Главный экран Vibe
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();

  const STORIES = [
    { t: "Новое", e: "✨" }, { t: "Плюс", e: "💎" }, { t: "Концерты", e: "🎤" }, { t: "Кэшбек", e: "🤑" },
    { t: "Вайбот", e: "🤖" }, { t: "Ипотека", e: "🏠" }, { t: "Вакансии", e: "💼" },
  ];

  const BIG = [
    { go: "pay", s: "Pay", ru: "Банк", e: "💳", c: "c-yellow" },
    { go: "maps", s: "Maps", ru: "Карты и такси", e: "🚕", c: "c-sky" },
    { go: "eat", s: "Eat", ru: "Готовая еда", e: "🍜", c: "c-pink", badge: "−30%" },
    { go: "supermarket", s: "Supermarket", ru: "Продукты за 15 мин", e: "🥑", c: "c-lime" },
  ];

  const GRID = [
    { go: "market", s: "Market", ru: "Маркетплейс", e: "🛍️", c: "c-pink" },
    { go: "job", s: "Job", ru: "Работа", e: "💼", c: "c-blue" },
    { go: "gig", s: "Gig", ru: "Подработки", e: "🚲", c: "c-lime", badge: "₫" },
    { go: "gram", s: "Vibegram", ru: "Соцсеть", e: "📸", c: "c-grad", badge: "new" },
    { go: "flowers", s: "Цветы", ru: "Букеты", e: "💐", c: "c-pink" },
    { go: "match", s: "Match", ru: "Знакомства", e: "💘", c: "c-coral" },
    { go: "tickets", s: "Tickets", ru: "Концерты", e: "🎤", c: "c-orange" },
    { go: "rent", s: "Rent", ru: "Аренда", e: "🔑", c: "c-mint" },
    { go: "media", s: "Плюс", ru: "Музыка, кино, книги", e: "🍿", c: "c-violet" },
    { go: "skills", s: "Навыки", ru: "Прокачка", e: "⭐", c: "c-yellow" },
    { go: "psy", s: "Психолог", ru: "Выгорание", e: "🛋️", c: "c-lilac" },
    { go: "health", s: "Health", ru: "Врачи, аптека", e: "💊", c: "c-white" },
    { go: "invest", s: "Invest", ru: "Инвестиции", e: "🚀", c: "c-black" },
    { go: "mail", s: "Почта", ru: "Письма", e: "✉️", c: "c-sky" },
    { go: "telecom", s: "Телеком", ru: "Связь", e: "📶", c: "c-lime" },
    { go: "all", s: "Ещё", ru: "Все сервисы", e: "🪐", c: "c-holo" },
  ];

  const FEED = [
    { go: "tickets", k: "Vibe Tickets", t: "Концерт в пятницу. Осталось 2 билета", m: "от 3 900 ₫", e: "🎤", c: "c-orange" },
    { go: "job", k: "Vibe Job", t: "Тебе подходит 14 вакансий. Одна — мечты", m: "от 180 000 ₫", e: "💼", c: "c-blue" },
    { go: "music", k: "Vibe Music", t: "Твой вайб на вечер: лоу-фай для тревоги", m: "42 трека", e: "🎧", c: "c-violet" },
    { go: "rent", k: "Vibe Rent", t: "Студия у метро. Без залога*", m: "54 000 ₫/мес", e: "🔑", c: "c-mint" },
    { go: "match", k: "Vibe Match", t: "3 человека лайкнули тебя. Узнать кто — в Плюсе", m: "🔒 Плюс Вайб", e: "💘", c: "c-pink" },
  ];

  const ZAB_LINES = [
    "Я заметил, что ты грустишь. Может, закажешь что-нибудь? 🍩",
    "Твой кэшбек вырос на 0,01%. Отметим покупкой?",
    "Ты сегодня ещё ничего не купил. Всё хорошо?",
    "Говорят, деньги не главное. Но они у тебя есть 😉",
    "Я подобрал тебе 37 предложений. Каждое — персональное.",
  ];

  const open = (go) => !Vibe.unlock || Vibe.unlock.isOpen(go);
  const lockedCount = () => [...GRID, ...BIG].filter((g) => g.go !== "all" && !open(g.go)).length;
  const openCount = () => [...GRID, ...BIG].filter((g) => g.go !== "all" && open(g.go)).length;

  function greeting() {
    const h = new Date().getHours();
    return h < 6 ? "Не спится" : h < 12 ? "Доброе утро" : h < 18 ? "Йо" : "Добрый вечер";
  }

  // Блоки жизни: работа, ближайшие деньги, цель, задания дня
  // Главное сообщение дня: работа (или её отсутствие) — между сторис и Vibe Pay
  function mainMsg() {
    const s = S();
    const G = Vibe.game;
    const job = s.job;
    const left = job ? G.tasksLeft() : 0;
    return `
      ${job ? `
      <button class="card tap job-card c-sky" data-go="job">
        <div class="li-ic c-white"><span class="emo float">${job.emoji || "💼"}</span></div>
        <div style="flex:1;text-align:left;min-width:0"><b>${Vibe.esc(G.jobTitle(job))}</b><small>${Vibe.esc(job.company)} · ${Vibe.rub(job.salary)}/мес</small>
          <div class="progress" style="height:10px;margin-top:6px"><i style="--p:${job.perf || 0}%"></i></div><small>До повышения ${100 - (job.perf || 0)}%</small></div>
        <span class="sticker" style="position:static;transform:rotate(6deg);background:${left ? "var(--lime)" : "#fff"}">${left ? `${left} задачи` : "✓"}</span>
      </button>` : `
      <button class="card tap job-card c-coral" data-go="job">
        <div class="li-ic c-white"><span class="emo wobble">💼</span></div>
        <div style="flex:1;text-align:left"><b>Ты без работы</b><small>Денег хватит примерно на ${G.runway()} дн. Пора искать</small></div>
        <span class="sticker" style="position:static;transform:rotate(6deg)">ИСКАТЬ</span>
      </button>`}
  `;
  }

  function lifeBlocks() {
    const s = S();
    const G = Vibe.game;
    const up = G.upcoming(4);
    const goal = G.goal();
    const qs = G.quests();
    const job = s.job;
    const left = job ? G.tasksLeft() : 0;
    const b = Vibe.body ? (Vibe.body.tick(), Vibe.body.get()) : null;
    const prod = b ? Vibe.body.productivity().value : 0;
    const bars = b ? [
      ["⚡", "Энергия", b.energy, "var(--yellow)"],
      ["🍽️", "Сытость", b.food, "var(--pink)"],
      ["😊", "Настроение", b.mood, "var(--sky)"],
      ["👟", "Шаги", Math.min(100, (b.steps / Vibe.body.STEP_GOAL) * 100), "var(--lime)"],
    ] : [];
    const warn = !b ? "" : b.sleeping ? "😴 Ты спишь" : b.sick ? "🤒 Ты болеешь" : b.food < 25 ? "🍽️ Ты голоден" : b.energy < 20 ? "🥱 Пора спать" : b.mood < 30 ? "🌧️ Грустишь" : "";
    return `
      ${b ? `
      <button class="card tap fit-mini" data-go="fit">
        <div class="fm-head"><b>⌚ Vibe Fit</b>${warn ? `<span class="badge" style="background:var(--coral)">${warn}</span>` : `<span class="badge">Продуктивность ${prod}%</span>`}</div>
        <div class="fm-bars">${bars.map(([e, t, v, c]) => `<div class="fm-bar"><span>${e}</span><div class="progress" style="height:10px;flex:1"><i style="--p:${Math.round(v)}%;background:${c}"></i></div><small>${Math.round(v)}%</small></div>`).join("")}</div>
      </button>` : ""}

      ${up.length ? `<div class="hscroll up-row">${up.map((u) => `
        <div class="up ${u.a > 0 ? "c-lime" : "c-white"}">
          <span class="emo">${u.e}</span>
          <b>${u.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(u.a))}</b>
          <small>${u.t} · через ${u.in} дн.</small>
          <small class="muted">≈ ${u.real < 60 ? u.real + " мин" : Math.round(u.real / 60) + " ч"} реального времени</small>
        </div>`).join("")}</div>` : ""}

      ${goal ? `
      <div class="card goal-card ${goal.done ? "c-yellow" : ""}">
        <div style="display:flex;gap:12px;align-items:center">
          <span class="emo ${goal.done ? "wobble" : "float"}" style="font-size:42px">${goal.e}</span>
          <div style="flex:1"><small class="muted" style="font-weight:800">Цель ${goal.index} из ${goal.total}</small><div class="display" style="font-size:19px">${goal.t}</div></div>
        </div>
        <div class="progress" style="margin:10px 0 8px"><i style="--p:${Math.round(goal.progress * 100)}%"></i></div>
        ${goal.done ? `<button class="btn black block" data-act="goal">Забрать +${goal.r} 🪙</button>` : `<button class="btn sm" data-go="${goal.go}">Как это сделать →</button>`}
      </div>` : ""}

      ${Vibe.sched && Vibe.sched.upcoming(3).length ? `
      <h2 class="sec">В планах <small data-go="calendar">календарь →</small></h2>
      <div class="stack">${Vibe.sched.upcoming(3).map((e) => {
        const st = Vibe.sched.startMin(e), d = Math.floor(st / 1440), now = Vibe.game.info().day;
        const when = (d === now ? "сегодня" : d === now + 1 ? "завтра" : `через ${d - now} дн.`) + " в " + String(e.hour).padStart(2, "0") + ":" + String(e.min || 0).padStart(2, "0");
        const live = Vibe.sched.active().some((x) => x.id === e.id);
        return `<button class="card tight tap plan ${live ? "c-yellow" : ""}" data-go="maps"><span class="emo">${e.e}</span><div style="flex:1;text-align:left;min-width:0"><b>${Vibe.esc(e.title)}</b><small>${when}${live ? " · сейчас! Доберись на место" : ""}</small></div><span>🗺️</span></button>`;
      }).join("")}</div>` : ""}

      <h2 class="sec">Задания дня <small>обновятся завтра</small></h2>
      <div class="stack">${qs.map((q) => `
        <div class="card tight quest ${q.claimed ? "claimed" : q.done ? "c-lime" : ""}">
          <span class="emo">${q.e}</span>
          <div style="flex:1;min-width:0"><b>${q.t}</b><div class="progress" style="height:8px;margin-top:5px"><i style="--p:${Math.round((Math.min(q.n, q.need) / q.need) * 100)}%"></i></div></div>
          ${q.claimed ? `<span class="badge" style="background:#fff">✓</span>` : q.done ? `<button class="btn black sm" data-act="quest" data-q="${q.id}">+${q.r} 🪙</button>` : `<small class="muted" style="font-weight:900">${q.n}/${q.need}</small>`}
        </div>`).join("")}</div>`;
  }

  Vibe.screen("home", {
    render() {
      const s = S();
      const xpP = Math.round((s.xp / Vibe.need(s.level)) * 100);
      const grown = open("market"); // промо и реклама — когда жизнь уже наладилась
      const lastEat = s.orders.find((o) => o.svc === "eat" && Date.now() - o.at < 30 * 60 * 1000);
      return `
      <div class="home-top">
        <div class="logo home-logo">Vibe</div>
        <div style="display:flex;gap:10px;align-items:center">
          ${Vibe.ui.vibikiPill()}
          <button class="icon-btn" data-go="chats" aria-label="Чаты">💬${Vibe.msg && Vibe.msg.unread() ? `<span class="dot-count" style="background:var(--lime)">${Vibe.msg.unread()}</span>` : ""}</button>
          <button class="icon-btn" ${Vibe.screens.mail ? 'data-go="mail"' : 'data-act="bell"'} aria-label="Почта">${Vibe.screens.mail ? "✉️" : "🔔"}${Vibe.mail && Vibe.mail.unread() ? `<span class="dot-count">${Vibe.mail.unread() > 99 ? "99+" : Vibe.mail.unread()}</span>` : ""}</button>
        </div>
      </div>

      <div class="hello card c-white tap" data-go="profile">
        <div class="hello-ava c-lilac"><span class="emo">${(s.profile && s.profile.avatar) || "😎"}</span><span class="lvl" data-level>${s.level}</span></div>
        <div style="flex:1;min-width:0">
          <div class="display" style="font-size:22px">${greeting()}, ${Vibe.esc(s.name)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
            <div class="progress" style="flex:1"><i data-xpbar style="--p:${xpP}%"></i></div>
            <span class="badge" style="background:var(--orange)">🔥 ${s.streak}</span>
          </div>
          <div class="clock" data-clock>📅 ${Vibe.game.info().label}</div>
        </div>
      </div>

      <button class="field search tap" data-go="search" style="width:100%;margin:14px 0 16px;text-align:left">🔍 <span class="muted search-ph">Найди что угодно</span></button>

      <div class="stories">
        ${STORIES.map((st, i) => `
          <button class="story ${s.seenStories[i] ? "seen" : ""}" data-act="story" data-i="${i}">
            <span class="ring"><span class="in"><span class="emo">${st.e}</span></span></span>${st.t}
          </button>`).join("")}
      </div>

      <div data-main>${mainMsg()}</div>

      <div class="paycard c-yellow tap" data-go="pay">
        <div class="pc-blob"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;position:relative">
          <span class="badge c-black" style="color:#fff;border-color:#000">Vibe Pay</span>
          <span style="font-weight:800">•• 4521</span>
        </div>
        <div class="big-num pc-bal" data-balance>${Vibe.rub(s.balance)}</div>
        <div style="position:relative;font-weight:800;font-size:13px">Кэшбек: <span class="badge" style="background:#fff">🪙 <span data-vibiki>${Vibe.fmt(s.vibiki)}</span> вайбиков</span></div>
        <div class="pc-actions">
          <button data-act="transfer"><span>↗</span>Перевести</button>
          <button data-go="job"><span>💼</span>Работа</button>
          <button data-go="qr"><span>▦</span>QR</button>
          ${open("wheel") ? `<button data-go="wheel"><span>🎡</span>Колесо</button>` : `<button data-go="eat"><span>🍜</span>Еда</button>`}
        </div>
        <div class="emo pc-emo float">💳</div>
      </div>

      <div data-life>${lifeBlocks()}</div>

      <h2 class="sec">Карта <small>${s.job ? "дом · работа" : "твой район"}</small></h2>
      <div class="home-map" data-homemap data-go="maps"></div>

      ${lastEat ? `
      <button class="card tap live" data-go="eat-track" data-params='{"id":"${lastEat.id}"}'>
        <div class="li-ic c-pink"><span class="emo wobble">🛵</span></div>
        <div style="flex:1;text-align:left"><b>Vibe Eat · заказ в пути</b><small class="muted">Следи за курьером на карте</small></div>
        <span class="sticker" style="position:static;transform:rotate(6deg)">→</span>
      </button>` : ""}

      <h2 class="sec">Главное <small>${openCount()} из ${GRID.length + BIG.length - 1} открыто</small></h2>
      <div class="big-tiles stagger">
        ${BIG.map((b) => `
          <button class="bt ${b.c} tap" data-go="${b.go}">
            ${b.badge ? `<span class="sticker" style="top:10px;right:10px;background:var(--lime)">${b.badge}</span>` : ""}
            <span class="bt-name display" style="${b.s.length > 8 ? "font-size:18px" : ""}">${b.s}</span>
            <small>${b.ru}</small>
            <span class="emo bt-emo float d${Math.floor(Math.random() * 4)}">${b.e}</span>
          </button>`).join("")}
      </div>

      ${grown ? Vibe.ui.marquee(["КЭШБЕК ДО 30%*", "ПРЕДОДОБРЕНО", "−50% НА ВСЁ", "ДОСТАВКА 0 ₫*", "ТЫ ЗАСЛУЖИЛ"]) : ""}

      <div class="svc-grid stagger">
        ${GRID.filter((g) => g.go !== "all" && open(g.go)).map((g) => `
          <button class="svc" data-go="${g.go}">
            <span class="svc-ic ${g.c}">${g.badge ? `<span class="dot-count" style="background:var(--lime);animation-delay:${Math.random() * 2}s">${g.badge}</span>` : ""}<span class="emo">${g.e}</span></span>
            <b>${g.s}</b><small>${g.ru}</small>
          </button>`).join("")}
          <button class="svc" data-go="all">
            <span class="svc-ic c-holo">${lockedCount() ? `<span class="dot-count" style="background:#fff;animation:none">🔒${lockedCount()}</span>` : ""}<span class="emo">🪐</span></span>
            <b>Ещё</b><small>${lockedCount() ? "Откроются позже" : "Все сервисы"}</small>
          </button>
      </div>

      ${grown ? `<div class="card c-black promo">
        <div class="badge" style="background:var(--lime)">⚡ Персонально для тебя</div>
        <div class="display" style="font-size:30px;margin:12px 0 6px;color:var(--lime)">Предодобрено<br>500&nbsp;000&nbsp;₫</div>
        <p style="color:#bdbac8;font-size:14px">Кредит на всё, о чём ты мечтал. Даже на то, о чём не мечтал.</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
          <button class="btn lime" data-go="pay" data-params='{"credit":"1"}'>Забрать <span class="arrow">→</span></button>
          <span class="timer-pill" style="background:var(--pink);color:var(--ink)" data-timer>02:00</span>
        </div>
        <div class="fine" style="color:#77748a">*Ставка от 0% в первые 3 дня, далее от 39,9% годовых. Страхование жизни, здоровья, настроения и вайба включено. Отказ от страховки — в отделении, которое работает по четвергам с 9:00 до 9:15.</div>
        <div class="emo promo-emo float">🤑</div>
      </div>` : ""}

      ${open("plus") ? `<button class="card c-holo plus-card tap" data-go="plus">
        <div class="display" style="font-size:28px">Плюс Вайб</div>
        <div style="font-weight:800;margin:6px 0 12px">${s.plus ? "Ты в Плюсе. Кэшбек ×2 💎" : "Кэшбек ×2, доставка 0 ₫, музыка без рекламы"}</div>
        <span class="btn black sm">${s.plus ? "Управлять" : "Первый месяц за 1 ₫"}</span>
        <div class="emo plus-emo wobble">💎</div>
      </button>` : ""}

      <h2 class="sec">Для тебя <small>подобрано Вайботом</small></h2>
      <div class="hscroll">
        ${FEED.filter((f) => open(f.go)).map((f) => `
          <button class="card feed-card ${f.c} tap" data-go="${f.go}">
            <div class="badge" style="background:#fff">${f.k}</div>
            <b>${f.t}</b>
            <div class="feed-bottom"><span>${f.m}</span><span class="emo float">${f.e}</span></div>
          </button>`).join("")}
      </div>

      <button class="zab-bubble tap card" data-go="chat" data-params='{"id":"zabotik"}'>
        ${Vibe.zabotik(60)}
        <div class="zab-text"><b>Вайбот</b><span data-zab>${(Vibe.insight ? Vibe.insight() : ZAB_LINES)[0]}</span></div>
      </button>
      `;
    },

    mount(root) {
      let left = 120, zi = 0;
      const timerEl = root.querySelector("[data-timer]");
      const zabEl = root.querySelector("[data-zab]");
      const iv = setInterval(() => {
        left = left > 0 ? left - 1 : 120;
        if (timerEl) timerEl.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
        if (left === 120 && timerEl) { FX.bump(timerEl); }
      }, 1000);
      const zv = setInterval(() => {
        const lines = Vibe.insight ? Vibe.insight() : ZAB_LINES;
        zi = (zi + 1) % lines.length;
        if (zabEl) { zabEl.textContent = lines[zi]; FX.bump(zabEl.parentElement); }
      }, 6000);

      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        const act = a.dataset.act;
        e.stopPropagation();
        if (act === "story") {
          const i = +a.dataset.i;
          if (Vibe.openStories) Vibe.openStories(i);
          else FX.toast("Сторис скоро", "📸");
        }
        if (act === "bell") {
          FX.burst(a, { emojis: ["🔔", "💸", "📣", "🔥"], count: 10 });
          Vibe.ui.sheet(`
            <div class="display" style="font-size:28px;margin-bottom:12px">Уведомления <span class="badge" style="vertical-align:middle">99+</span></div>
            <div class="stack stagger">
              ${[
                ["🤑", "c-lime", "Кредит предодобрен", "500 000 ₫ ждут тебя. Уже 3 минуты ждут."],
                ["🍜", "c-pink", "Ты давно не заказывал рамен", "Целых 4 часа. Всё в порядке?"],
                ["💎", "c-lilac", "Плюс Вайб", "Ты мог бы сэкономить 12 ₫ в этом месяце"],
                ["🎡", "c-yellow", "Колесо вайба", "Спин сгорит через 02:00"],
                ["📉", "c-coral", "Вайбкоин упал на 30%", "Отличный момент докупить!"],
              ].map(([e, c, t, d]) => `<div class="card tight" style="display:flex;gap:12px;align-items:center"><div class="li-ic ${c}"><span class="emo">${e}</span></div><div><b>${t}</b><div class="muted" style="font-size:13px">${d}</div></div></div>`).join("")}
            </div>
            <button class="btn black block" style="margin-top:16px" data-close>Прочитать все (ещё 94)</button>`);
        }
        if (act === "transfer") Vibe.go("pay", { transfer: "1" });
      });

      // Мини-карта
      const mapEl = root.querySelector("[data-homemap]");
      const pins = Vibe.map.basePins();
      const mapCtl = Vibe.map.create(mapEl, { interactive: false, pins, fit: pins.filter(Boolean).filter((p) => p.id !== "hq") });
      const home = Vibe.map.place("home"), work = Vibe.map.place("work");
      if (work) mapCtl.route(Vibe.map.path(home, work), { color: "#8b5cff" });
      setTimeout(() => mapCtl.fit(work ? [home, work] : [home], work ? 110 : 220, true), 50);

      // Часы и живые блоки
      const clock = root.querySelector("[data-clock]");
      const life = root.querySelector("[data-life]");
      const mainEl = root.querySelector("[data-main]");
      const refreshLife = () => { if (life) life.innerHTML = lifeBlocks(); if (mainEl) mainEl.innerHTML = mainMsg(); };
      const cv = setInterval(() => { if (clock) clock.textContent = "📅 " + Vibe.game.info().label; }, 3000);
      const offGame = Vibe.game.on(() => { refreshLife(); Vibe.refreshCounters(); });
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        if (a.dataset.act === "goal") { e.stopPropagation(); Vibe.game.claimGoal(a); setTimeout(refreshLife, 400); }
        if (a.dataset.act === "quest") { e.stopPropagation(); Vibe.game.claimQuest(a.dataset.q, a); setTimeout(refreshLife, 300); }
      });
      const qv = setInterval(refreshLife, 15000);

      const onSeen = () => {
        const s = S();
        root.querySelectorAll(".story").forEach((el, i) => el.classList.toggle("seen", !!s.seenStories[i]));
      };
      window.addEventListener("vibe:stories-seen", onSeen);
      return () => { clearInterval(iv); clearInterval(zv); clearInterval(cv); clearInterval(qv); offGame(); mapCtl.destroy(); window.removeEventListener("vibe:stories-seen", onSeen); };
    },
  });

  // Стили главного экрана
  const css = `
  .home-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .home-logo { font-size:48px; color:var(--pink); -webkit-text-stroke:2px var(--ink); text-shadow:0 4px 0 var(--ink); transform:rotate(-4deg); animation: wobble 4s ease-in-out infinite; }
  .hello { display:flex; gap:12px; align-items:center; padding:12px 14px; }
  .hello-ava { width:58px; height:58px; border-radius:50%; border:var(--line); display:grid; place-items:center; font-size:32px; position:relative; flex:0 0 auto; }
  .hello-ava .lvl { position:absolute; bottom:-6px; right:-6px; background:var(--lime); border:2px solid var(--ink); border-radius:999px; font-size:12px; font-weight:900; padding:1px 7px; }
  .search { cursor:pointer; white-space:nowrap; overflow:hidden; }
  .search .search-ph { overflow:hidden; text-overflow:ellipsis; }
  [data-main] > .job-card { margin:0 0 14px; }
  .clock { font-size:12px; font-weight:800; color:var(--muted); margin-top:6px; }
  .fit-mini { display:block; width:100%; text-align:left; margin-top:14px; padding:12px 14px; }
  .fm-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .fm-head b { font-size:15px; font-weight:900; }
  .fm-bars { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; }
  .fm-bar { display:flex; align-items:center; gap:6px; font-size:14px; } .fm-bar small { font-size:11px; font-weight:900; width:30px; text-align:right; }
  .job-card { display:flex; gap:12px; align-items:center; width:100%; margin-top:14px; padding:12px 14px; }
  .job-card b { display:block; font-size:15px; } .job-card small { display:block; font-size:12px; font-weight:700; }
  .up-row { margin-top:4px; padding-top:12px; }
  .up { width:150px; border:var(--line); border-radius:22px; box-shadow:var(--shadow-sm); padding:12px; display:flex; flex-direction:column; gap:2px; }
  .up .emo { font-size:26px; } .up b { font-family:var(--font-display); font-weight:400; font-size:17px; } .up small { font-size:11px; font-weight:800; }
  .goal-card { margin-top:4px; }
  .quest { display:flex; gap:10px; align-items:center; }
  .quest .emo { font-size:28px; } .quest b { font-size:14px; font-weight:800; }
  .quest.claimed { opacity:.55; }
  .home-map { height:210px; cursor:pointer; }
  .plan { display:flex; gap:10px; align-items:center; width:100%; }
  .plan .emo { font-size:28px; } .plan b { display:block; font-size:14px; font-weight:900; } .plan small { font-size:12px; font-weight:700; color:var(--muted); }
  .stories { display:flex; gap:12px; overflow-x:auto; margin:0 -16px 18px; padding:2px 16px 4px; scrollbar-width:none; }
  .stories::-webkit-scrollbar { display:none; }
  .story { flex:0 0 auto; width:70px; display:flex; flex-direction:column; align-items:center; gap:6px; font-size:11px; font-weight:800; }
  .story .ring { width:70px; height:70px; border-radius:50%; padding:4px; background:conic-gradient(var(--pink), var(--yellow), var(--lime), var(--sky), var(--violet), var(--pink)); animation: spin 4s linear infinite; display:block; }
  .story .in { width:100%; height:100%; border-radius:50%; background:var(--paper); border:2.5px solid var(--ink); display:grid; place-items:center; font-size:28px; animation: spin 4s linear infinite reverse; }
  .story.seen .ring { background:#d8d5e0; animation:none; } .story.seen .in { animation:none; }
  .story:active .ring { transform:scale(.9); }
  .paycard { border:var(--line); border-radius:32px; box-shadow:var(--shadow); padding:18px; position:relative; overflow:hidden; display:block; }
  .pc-blob { position:absolute; width:220px; height:220px; right:-60px; top:-80px; border-radius:50%; background:var(--pink); border:var(--line); }
  .pc-bal { font-size:40px; margin:14px 0 6px; position:relative; }
  .pc-emo { position:absolute; right:18px; top:46px; font-size:64px; }
  .pc-actions { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:16px; position:relative; }
  .pc-actions button { background:var(--ink); color:#fff; border-radius:18px; padding:10px 0 8px; font-size:11px; font-weight:800; transition:transform .15s var(--spring); }
  .pc-actions button:active { transform:scale(.9); }
  .pc-actions span { display:block; font-size:20px; margin-bottom:2px; }
  .live { margin-top:14px; display:flex; align-items:center; gap:12px; width:100%; padding:12px 14px; }
  .live b { display:block; font-size:15px; } .live small { font-size:12px; font-weight:700; }
  .li-ic { width:48px; height:48px; border-radius:16px; border:2px solid var(--ink); display:grid; place-items:center; font-size:24px; flex:0 0 auto; }
  .big-tiles { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .bt { border:var(--line); border-radius:28px; box-shadow:var(--shadow); padding:16px 14px; min-height:132px; position:relative; overflow:hidden; text-align:left; display:flex; flex-direction:column; }
  .bt-name { font-size:24px; } .bt small { font-weight:800; font-size:12px; opacity:.75; }
  .bt-emo { position:absolute; right:6px; bottom:4px; font-size:58px; }
  .svc-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px 6px; }
  .svc { display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px; }
  .svc-ic { width:66px; height:66px; border-radius:22px; border:var(--line); box-shadow:var(--shadow-sm); display:grid; place-items:center; font-size:32px; position:relative; transition:transform .2s var(--spring), box-shadow .2s var(--spring); }
  .svc:active .svc-ic { transform:translateY(3px) scale(.92) rotate(-6deg); box-shadow:none; }
  .svc b { font-size:12px; font-weight:900; margin-top:4px; } .svc small { font-size:10px; font-weight:700; color:var(--muted); line-height:1.15; }
  .promo { margin-top:26px; padding:20px; }
  .promo-emo { position:absolute; right:12px; top:44px; font-size:60px; }
  .plus-card { display:block; width:100%; text-align:left; margin-top:14px; padding:20px; }
  .plus-emo { position:absolute; right:18px; top:18px; font-size:64px; }
  .feed-card { width:220px; min-height:168px; text-align:left; display:flex; flex-direction:column; gap:10px; }
  .feed-card b { font-size:17px; font-weight:900; line-height:1.2; flex:1; }
  .feed-bottom { display:flex; justify-content:space-between; align-items:center; font-weight:800; font-size:13px; }
  .feed-bottom .emo { font-size:36px; }
  .zab-bubble { display:flex; gap:12px; align-items:center; width:100%; text-align:left; margin-top:18px; padding:12px 14px; }
  .zab-text { flex:1; font-size:13px; font-weight:700; } .zab-text b { display:block; font-size:15px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
