/* ============================================================
   Core — состояние, награды, роутер, UI-помощники, корзина.
   Глобальный объект: window.Vibe
   ============================================================ */
(function () {
  const Vibe = (window.Vibe = {});

  /* ---------- Форматирование ---------- */
  Vibe.fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  Vibe.rub = (n) => Vibe.fmt(n) + " ₽";
  Vibe.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Состояние (сохраняется в localStorage) ---------- */
  const KEY = "vibe-state-v2";
  const DEFAULT = {
    profile: null,
    name: "",
    balance: 15000,
    vibiki: 100,
    xp: 0,
    level: 1,
    streak: 0,
    sound: true,
    plus: false,
    carts: {},
    liked: {},
    orders: [],
    tx: [{ t: "Перевод от мамы · «Не трать всё сразу»", c: "👩", a: 15000, d: "1 ноября", col: "c-lime" }],
    achievements: [],
    spunDay: "",
    seenStories: {},
    home: null,
    job: null,
    loans: [],
    stats: {},
    goalsDone: [],
    quests: null,
    game: null,
  };
  let S;
  try { S = Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = Object.assign({}, DEFAULT); }
  const listeners = new Set();
  Vibe.state = {
    get: () => S,
    set(patch) {
      Object.assign(S, typeof patch === "function" ? patch(S) : patch);
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
      listeners.forEach((fn) => fn(S));
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); },
  };

  /* ---------- Уровни и награды ---------- */
  Vibe.need = (level) => 100 + level * 40;
  const ACH = {
    first: { e: "🐣", t: "Новичок", d: "Зарегистрировался в Vibe" },
    employed: { e: "💼", t: "Трудоустроен", d: "Нашёл работу" },
    buyer: { e: "🛍️", t: "Шопоголик", d: "Первая покупка" },
    credit: { e: "🤑", t: "Предодобренный", d: "Взял кредит" },
    spinner: { e: "🎡", t: "Крутила", d: "Покрутил колесо" },
    swiper: { e: "💘", t: "Мэтч!", d: "Первый мэтч" },
    gamer: { e: "🎮", t: "Геймер", d: "Сыграл в игру" },
    lvl10: { e: "👑", t: "Вайб-лорд", d: "10 уровень" },
    cancel: { e: "🏆", t: "Невозможное", d: "Отменил подписку" },
    rich: { e: "💸", t: "Транжира", d: "Потратил 50 000 ₽" },
  };
  Vibe.ACH = ACH;

  Vibe.achieve = function (id) {
    if (!ACH[id] || S.achievements.includes(id)) return;
    Vibe.state.set({ achievements: [...S.achievements, id] });
    setTimeout(() => {
      FX.sound.levelup();
      FX.toast(`Достижение: ${ACH[id].t}`, ACH[id].e, 2800);
      FX.burst({ x: innerWidth / 2, y: 60 }, { emojis: [ACH[id].e, "✨", "⭐"], count: 12 });
    }, 350);
  };

  // Начислить вайбики и опыт с анимацией монеток
  Vibe.reward = function ({ vibiki = 0, xp = 0, from = null, silent = false } = {}) {
    const target = document.querySelector("[data-vibiki]:not([hidden])");
    const apply = () => {
      let { level } = S;
      let nx = S.xp + xp;
      let leveled = false;
      while (nx >= Vibe.need(level)) { nx -= Vibe.need(level); level++; leveled = true; }
      Vibe.state.set({ vibiki: S.vibiki + vibiki, xp: nx, level });
      Vibe.refreshCounters();
      if (leveled) setTimeout(() => Vibe.levelUp(level), 400);
      if (level >= 10) Vibe.achieve("lvl10");
    };
    if (vibiki > 0 && !silent) {
      FX.coins(from || { x: innerWidth / 2, y: innerHeight * 0.6 }, target || { x: innerWidth - 60, y: 50 }, Math.min(10, 3 + Math.floor(vibiki / 40)), { onDone: apply });
      FX.toast(`+${Vibe.fmt(vibiki)} вайбиков${xp ? ` · +${xp} XP` : ""}`, "🪙", 1800);
    } else apply();
  };

  Vibe.levelUp = function (level) {
    FX.confetti();
    Vibe.modal(`
      <div class="m-emo float">🚀</div>
      <div class="display">Уровень ${level}!</div>
      <p>Теперь твой кэшбек ${(1 + level / 1000).toFixed(3)}%. Это на 0,001% больше. Ты заслужил.</p>
      <button class="btn black block" data-close>Вайбово 🔥</button>`, { sound: "levelup" });
  };

  // Списать деньги, записать операцию, начислить кэшбек
  Vibe.pay = function (amount, { title, emoji = "💳", col = "c-white", from = null, cashback = 0.03 } = {}) {
    if (amount > S.balance) {
      FX.shake(from && from.closest ? from.closest(".btn") || from : document.body);
      FX.toast("Недостаточно средств. Но кредит уже предодобрен 😉", "🫠");
      return false;
    }
    const tx = { t: title, c: emoji, a: -amount, d: "Только что", col };
    const spent = (S.spent || 0) + amount;
    Vibe.state.set({ balance: S.balance - amount, tx: [tx, ...S.tx].slice(0, 40), spent });
    Vibe.achieve("buyer");
    if (spent >= 50000) Vibe.achieve("rich");
    if (Vibe.game) {
      const t = String(title || "");
      Vibe.game.track("pay");
      if (/Eat/.test(t)) Vibe.game.track("eat");
      if (/такси|Maps/i.test(t)) Vibe.game.track("taxi");
      if (/Supermarket/.test(t)) Vibe.game.track("supermarket");
      else if (/Market/.test(t)) Vibe.game.track("market");
    }
    const vib = Math.max(5, Math.round(amount * cashback * (S.plus ? 2 : 1)));
    Vibe.reward({ vibiki: vib, xp: Math.min(60, 10 + Math.round(amount / 200)), from });
    return true;
  };

  Vibe.addMoney = function (amount, { title, emoji = "💸", col = "c-lime" } = {}) {
    Vibe.state.set({ balance: S.balance + amount, tx: [{ t: title, c: emoji, a: amount, d: "Только что", col }, ...S.tx].slice(0, 40) });
    Vibe.refreshCounters();
  };

  // Обновить все счётчики на экране
  Vibe.refreshCounters = function () {
    document.querySelectorAll("[data-vibiki]").forEach((el) => FX.countTo(el, S.vibiki));
    document.querySelectorAll("[data-balance]").forEach((el) => FX.countTo(el, S.balance, { fmt: Vibe.rub }));
    document.querySelectorAll("[data-level]").forEach((el) => (el.textContent = S.level));
    document.querySelectorAll("[data-xpbar]").forEach((el) => el.style.setProperty("--p", Math.round((S.xp / Vibe.need(S.level)) * 100) + "%"));
  };

  /* ---------- Реестр экранов ---------- */
  const screens = {};
  Vibe.screen = (name, def) => (screens[name] = def);
  Vibe.screens = screens;
  const TABS = ["home", "pay", "chats", "profile"];

  /* ---------- Роутер (hash) ---------- */
  let stack = [];
  let current = null;
  const scrollPos = {};
  function parse(hash) {
    const h = (hash || "").replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    const params = {};
    if (qs) qs.split("&").forEach((p) => { const [k, v] = p.split("="); params[k] = decodeURIComponent(v || ""); });
    return { name: path || "home", params, key: h || "home" };
  }
  Vibe.go = function (name, params = {}) {
    const qs = Object.keys(params).length ? "?" + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&") : "";
    location.hash = "/" + name + qs;
  };
  Vibe.back = function () {
    if (stack.length > 1) history.back();
    else Vibe.go("home");
  };
  Vibe.replace = function (name, params = {}) {
    const qs = Object.keys(params).length ? "?" + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&") : "";
    history.replaceState(null, "", "#/" + name + qs);
    render(parse(location.hash), "replace");
  };

  function render(route, mode) {
    const def = screens[route.name] || screens.notfound;
    const stackEl = document.getElementById("stack");
    const prev = current;
    if (prev) scrollPos[prev.route.key] = prev.el.scrollTop;
    const isTab = TABS.includes(route.name);

    const el = document.createElement("section");
    el.className = "screen" + (isTab ? "" : " no-tab");
    el.dataset.screen = route.name;
    el.innerHTML = def.render(route.params || {});
    stackEl.appendChild(el);

    // Каскад для .stagger
    el.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));

    const cleanup = def.mount ? def.mount(el, route.params || {}) : null;
    const tabSwitchRestore = prev && TABS.includes(prev.route.name) && isTab;
    if ((mode === "back" || tabSwitchRestore) && scrollPos[route.key]) el.scrollTop = scrollPos[route.key];
    if (mode === "forward" && !isTab) delete scrollPos[route.key];
    if (Vibe.game && route.name) Vibe.game.track("visit:" + route.name);
    const tabSwitch = prev && TABS.includes(prev.route.name) && isTab;
    if (!prev || mode === "replace") el.classList.add("fade-in");
    else if (tabSwitch) el.classList.add("fade-in");
    else el.classList.add(mode === "back" ? "enter-back" : "enter");
    if (prev) {
      prev.el.classList.add(mode === "back" && !tabSwitch ? "leave-back" : tabSwitch || mode === "replace" ? "leave-fade" : "leave");
      if (mode === "back") prev.el.style.zIndex = 2;
      const old = prev;
      setTimeout(() => { old.cleanup && old.cleanup(); old.el.remove(); }, mode === "replace" || tabSwitch ? 0 : 360);
      if (!tabSwitch && mode !== "replace") FX.sound.whoosh();
    }
    current = { el, route, cleanup };
    Vibe.current = current;

    // Нижняя навигация
    const tb = document.getElementById("tabbar");
    tb.classList.toggle("hidden", !isTab);
    if (isTab) {
      const idx = { home: 0, pay: 1, chats: 3, profile: 4 }[route.name];
      tb.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.go === route.name));
      tb.querySelector(".blob").style.transform = `translateX(calc(${idx} * (100% + 12px)))`;
    }
    Vibe.refreshCounters();
  }

  window.addEventListener("hashchange", () => {
    const route = parse(location.hash);
    let mode = "forward";
    const i = stack.lastIndexOf(route.key);
    if (i !== -1 && i === stack.length - 2) { mode = "back"; stack = stack.slice(0, i + 1); }
    else if (TABS.includes(route.name)) { stack = [route.key]; }
    else stack.push(route.key);
    render(route, mode);
  });

  // Сбросить навигацию и открыть экран как корневой (например, после регистрации)
  Vibe.resetTo = function (name) {
    history.replaceState(null, "", "#/" + name);
    stack = [name];
    render(parse("#/" + name), "replace");
  };

  Vibe.start = function () {
    if (!S.profile) {
      history.replaceState(null, "", "#/welcome");
      stack = ["welcome"];
      render(parse("#/welcome"), "first");
      return;
    }
    if (Vibe.game) Vibe.game.boot();
    const route = parse(location.hash);
    if (route.name === "welcome") { history.replaceState(null, "", "#/home"); return Vibe.start(); }
    stack = route.name === "home" ? ["home"] : ["home", route.key];
    if (route.name !== "home" && !location.hash) history.replaceState(null, "", "#/home");
    render(route, "first");
  };

  /* ---------- Глобальные клики ---------- */
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]");
    if (g) {
      e.preventDefault();
      const params = g.dataset.params ? JSON.parse(g.dataset.params) : {};
      if (screens[g.dataset.go]) Vibe.go(g.dataset.go, params);
      else FX.toast("Скоро в Vibe. Уже предодобрено", "🚧");
      return;
    }
    if (e.target.closest("[data-back]")) { e.preventDefault(); Vibe.back(); }
  });

  /* ---------- UI-помощники ---------- */
  const ui = (Vibe.ui = {});

  ui.head = (title, sub = "", right = "") => `
    <div class="head">
      <button class="icon-btn" data-back aria-label="Назад">←</button>
      <div class="title">${title}${sub ? `<small>${sub}</small>` : ""}</div>
      ${right}
    </div>`;

  ui.vibikiPill = () => `<button class="badge" data-go="profile" style="height:40px;padding:0 12px;font-size:13px;box-shadow:var(--shadow-sm)">🪙 <span data-vibiki>${Vibe.fmt(S.vibiki)}</span></button>`;

  ui.hero = ({ title, text = "", emo = "", color = "c-yellow", sticker = "" }) => `
    <div class="hero ${color}">
      ${sticker ? `<div class="sticker" style="top:14px;right:14px">${sticker}</div>` : ""}
      <div class="display">${title}</div>
      ${text ? `<p>${text}</p>` : ""}
      ${emo ? `<div class="hero-emo emo float">${emo}</div>` : ""}
    </div>`;

  ui.marquee = (items) => {
    const row = items.map((t) => `<span>${t}</span><span>✦</span>`).join("");
    return `<div class="marquee"><div>${row}${row}</div></div>`;
  };

  // Нижний лист
  ui.sheet = function (html, { onMount, onClose } = {}) {
    const bd = document.createElement("div"); bd.className = "backdrop";
    const sh = document.createElement("div"); sh.className = "sheet";
    sh.innerHTML = `<div class="grab"></div>${html}`;
    document.body.append(bd, sh);
    sh.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
    FX.sound.pop();
    const close = () => {
      bd.classList.add("out"); sh.classList.add("out");
      setTimeout(() => { bd.remove(); sh.remove(); }, 300);
      onClose && onClose();
    };
    bd.addEventListener("click", close);
    sh.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
    onMount && onMount(sh, close);
    return close;
  };

  // Модальное окно
  Vibe.modal = ui.modal = function (html, { onMount, sound = "success", onClose } = {}) {
    const bd = document.createElement("div"); bd.className = "backdrop";
    const m = document.createElement("div"); m.className = "modal";
    m.innerHTML = html;
    document.body.append(bd, m);
    FX.sound[sound] && FX.sound[sound]();
    FX.haptic([10, 30, 10]);
    const close = () => {
      bd.classList.add("out"); m.classList.add("out");
      setTimeout(() => { bd.remove(); m.remove(); }, 240);
      onClose && onClose();
    };
    bd.addEventListener("click", close);
    m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
    onMount && onMount(m, close);
    return close;
  };

  /* ---------- Корзины сервисов ---------- */
  const cart = (Vibe.cart = {});
  // items: { id: { id, name, price, emo, qty } }
  cart.items = (svc) => Object.values((S.carts[svc] || {}));
  cart.count = (svc) => cart.items(svc).reduce((s, i) => s + i.qty, 0);
  cart.total = (svc) => cart.items(svc).reduce((s, i) => s + i.qty * i.price, 0);
  cart.qty = (svc, id) => ((S.carts[svc] || {})[id] || {}).qty || 0;
  cart.add = function (svc, item, fromEl) {
    const c = Object.assign({}, S.carts[svc] || {});
    c[item.id] = Object.assign({}, item, { qty: (c[item.id] ? c[item.id].qty : 0) + 1 });
    Vibe.state.set({ carts: Object.assign({}, S.carts, { [svc]: c }) });
    FX.sound.add(); FX.haptic(10);
    const bar = document.querySelector(".cartbar .cnt");
    if (fromEl) {
      const el = document.createElement("span");
      el.className = "p"; el.textContent = item.emo; el.style.fontSize = "40px";
      document.getElementById("fx-layer").appendChild(el);
      const a = FX.pt(fromEl), b = bar ? FX.pt(bar) : { x: 60, y: innerHeight - 50 };
      el.animate([
        { transform: `translate(${a.x}px,${a.y}px) translate(-50%,-50%) scale(1)` },
        { transform: `translate(${(a.x + b.x) / 2}px,${Math.min(a.y, b.y) - 120}px) translate(-50%,-50%) scale(1.4) rotate(-20deg)`, offset: 0.45 },
        { transform: `translate(${b.x}px,${b.y}px) translate(-50%,-50%) scale(.3) rotate(20deg)` },
      ], { duration: 650, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => { el.remove(); cart.renderBar(svc); };
    }
    cart.renderBar(svc);
  };
  cart.remove = function (svc, id) {
    const c = Object.assign({}, S.carts[svc] || {});
    if (!c[id]) return;
    if (c[id].qty > 1) c[id] = Object.assign({}, c[id], { qty: c[id].qty - 1 });
    else delete c[id];
    Vibe.state.set({ carts: Object.assign({}, S.carts, { [svc]: c }) });
    cart.renderBar(svc);
  };
  cart.clear = (svc) => Vibe.state.set({ carts: Object.assign({}, S.carts, { [svc]: {} }) });

  // Плавающая плашка корзины. opts: { onCheckout, label }
  const barOpts = {};
  cart.bar = function (svc, opts = {}) { barOpts[svc] = opts; return `<div class="cartbar-slot" data-cart-slot="${svc}"></div>`; };
  cart.renderBar = function (svc) {
    const slot = document.querySelector(`[data-cart-slot="${svc}"]`);
    if (!slot) return;
    const n = cart.count(svc);
    const existing = slot.querySelector(".cartbar");
    if (!n) { slot.innerHTML = ""; return; }
    const free = (barOpts[svc] || {}).freeFrom;
    const total = cart.total(svc);
    const hint = free ? (total >= free ? "Доставка бесплатно 🎉" : `До бесплатной доставки ${Vibe.rub(free - total)}`) : `${n} в корзине`;
    const html = `<div class="cnt">${n}</div><div class="sum"><b>${Vibe.rub(total)}</b>${hint}</div><button class="btn lime" data-checkout="${svc}">${(barOpts[svc] || {}).label || "Оформить"}</button>`;
    if (existing) { existing.innerHTML = html; FX.bump(existing.querySelector(".cnt")); }
    else slot.innerHTML = `<div class="cartbar">${html}</div>`;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-checkout]");
    if (!b) return;
    const svc = b.dataset.checkout;
    (barOpts[svc] && barOpts[svc].onCheckout ? barOpts[svc].onCheckout : () => cart.checkout(svc))();
  });

  // Оформление заказа: лист с составом, сборами и оплатой
  cart.checkout = function (svc, { title = "Ваш заказ", fees = null, onPaid } = {}) {
    const opts = barOpts[svc] || {};
    const items = cart.items(svc);
    const sub = cart.total(svc);
    const feeList = fees || opts.fees || [
      { t: "Сервисный сбор", a: 99 },
      { t: "Сбор за сервисный сбор", a: 19 },
      { t: "Доставка", a: opts.freeFrom && sub >= opts.freeFrom ? 0 : 149 },
    ];
    const total = sub + feeList.reduce((s, f) => s + f.a, 0);
    ui.sheet(`
      <div class="display" style="font-size:28px;margin-bottom:12px">${title}</div>
      <div class="card flat stagger" style="padding:4px 14px">
        ${items.map((i) => `<div class="li"><div class="ic c-yellow">${i.emo}</div><div class="tx"><b>${Vibe.esc(i.name)}</b><small>${i.qty} × ${Vibe.rub(i.price)}</small></div><div class="amt">${Vibe.rub(i.qty * i.price)}</div></div>`).join("")}
      </div>
      <div style="margin:14px 4px;display:grid;gap:6px;font-weight:700">
        ${feeList.map((f) => `<div style="display:flex;justify-content:space-between"><span class="muted">${f.t}</span><span>${f.a ? Vibe.rub(f.a) : "0 ₽ 🎉"}</span></div>`).join("")}
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:6px"><span class="display" style="font-size:20px">Итого</span><span class="big-num" style="font-size:28px">${Vibe.rub(total)}</span></div>
        <div class="badge" style="justify-self:start;background:var(--yellow)">🪙 +${Vibe.fmt(Math.round(total * 0.03 * (S.plus ? 2 : 1)))} вайбиков кэшбеком</div>
      </div>
      <button class="btn black xl block" data-pay>Оплатить через Vibe Pay <span class="arrow">→</span></button>
      <div class="fine">Нажимая «Оплатить», вы соглашаетесь с офертой, политикой, политикой об оферте и подпиской «Плюс Вайб» за 299 ₽/мес после пробного периода.</div>
    `, {
      onMount(sh, close) {
        sh.querySelector("[data-pay]").addEventListener("click", (e) => {
          const ok = Vibe.pay(total, { title: `${opts.txTitle || "Vibe"} · заказ`, emoji: items[0] ? items[0].emo : "🛍️", col: opts.col || "c-yellow", from: e.currentTarget });
          if (!ok) return;
          close();
          cart.clear(svc);
          cart.renderBar(svc);
          FX.confetti();
          FX.sound.success();
          const order = { id: Date.now(), svc, total, items, at: Date.now() };
          Vibe.state.set({ orders: [order, ...S.orders].slice(0, 20) });
          (onPaid || opts.onPaid || (() => Vibe.modal(`<div class="m-emo float">🎉</div><div class="display">Заказ оформлен!</div><p>Скоро всё будет. А пока — вот вам ещё предложений.</p><button class="btn black block" data-close>Ура!</button>`)))(order);
        });
      },
    });
  };

  Vibe.ACH_LIST = () => Object.entries(ACH);
})();
