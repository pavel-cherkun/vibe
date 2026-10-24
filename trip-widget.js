/* ============================================================
   Плавающий виджет «в пути»: поездка (Vibe.trip) или доставка
   (Vibe Eat / Vibe Market) — когда игрок ушёл с их экрана.
   • Поездка важнее доставки; вторая показывается значком-бейджем.
   • Тап — открыть карту поездки или трекинг заказа.
   • Смахнуть вправо — компактный кружок с кольцом прогресса,
     смахнуть влево (или тап по «‹») — снова пилюля. Выбор запоминается.
   • Встаёт над таббаром, корзиной и прочими нижними панелями,
     прячется под модалками и шторками. По прибытии — ✓ и уходит.
   Источники: Vibe.trip.current()/progress()/eta(), Vibe.on("trip"|"arrive"),
   state.trackStarts / trackDone / eatTrack (экран eat-track).
   ============================================================ */
(function () {
  if (window.Vibe && Vibe.tripWidget) return;
  const V = window.Vibe;
  const S = () => V.state.get();
  const LS = "vibe_tw_compact";
  const lsGet = () => { try { return localStorage.getItem(LS) === "1"; } catch (e) { return false; } };
  const lsSet = (v) => { try { localStorage.setItem(LS, v ? "1" : "0"); } catch (e) { /* без памяти */ } };

  const MODE = { walk: "пешком", scooter: "самокат", taxi: "такси", metro: "метро", car: "своя машина", bike: "велосипед", bus: "автобус" };
  const TINT = { walk: "#c6ff4d", scooter: "#8fd8ff", taxi: "#ffe14d", metro: "#ff8a8a", car: "#d9c8ff", courier: "#ff6bcb" };
  const kmRu = (k) => String(Math.round((k || 0) * 10) / 10).replace(".", ",") + " км";
  const esc = (s) => (V.esc ? V.esc(String(s)) : String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]));
  const route = () => ((location.hash || "").replace(/^#\/?/, "").split("?")[0] || "home");

  /* ---------- Данные: поездка ---------- */
  function tripLabel(t) {
    if (t.to === "home") return "Домой";
    if (t.to === "work") return "На работу";
    const p = V.map && V.map.place(t.to);
    return ((p && p.label) || t.title || "В путь").split(" · ")[0]; // «Родители · другой берег» → «Родители»
  }
  function tripItem() {
    const T = V.trip;
    const t = T && T.current();
    if (!t) return null;
    const eta = Math.ceil(T.eta(t));
    const kind = t.kind || t.mode;
    const who = t.driver && t.driver.n ? ` · ${t.driver.n}` : "";
    return {
      type: "trip", id: t.id, emoji: t.emoji || "🚶", tint: TINT[kind] || TINT[t.mode] || "#ffe14d",
      title: tripLabel(t), sub: `${MODE[kind] || MODE[t.mode] || "в пути"}${who} · ${kmRu(t.km)}`,
      p: T.progress(t), eta, near: eta <= 0,
      open: () => V.go("maps"), screen: "maps",
    };
  }

  /* ---------- Данные: доставка (тот же расчёт, что на экране eat-track) ---------- */
  const COURIER = {
    eat: { n: "Тимур", veh: "🛵", prep: "👨‍🍳", prepT: "Готовят заказ", go: "везёт заказ", svc: "Vibe Eat", door: "у двери! Забирай, пока горячее" },
    supermarket: { n: "Арсений", veh: "🚲", prep: "🧺", prepT: "Собирают продукты", go: "везёт продукты", svc: "Vibe Market", door: "у двери с пакетами" },
  };
  const geoCache = {};
  function geo(src, place) {
    const key = src + ":" + place + ":" + JSON.stringify(V.map.place("home"));
    if (geoCache[key]) return geoCache[key];
    const M = V.map;
    const from = M.place(src === "supermarket" ? "supermarket" : "restaurant:" + (place || "1"));
    const pts = M.path(from, M.place("home"));
    const km = M.km(pts), min = M.minutes(pts, "courier");
    const total = Math.max(25, Math.min(40, 25 + km * 3)); // реальные секунды, как в screen-commerce
    return (geoCache[key] = { km, min, total, prep: total * 0.24 });
  }
  function deliveries() {
    const s = S(), starts = s.trackStarts || {}, done = s.trackDone || {}, tr = s.eatTrack || {};
    const now = Date.now(), out = [];
    Object.entries(starts).forEach(([id, t0]) => {
      if (done[id] || !t0 || !V.map) return;
      const src = String(tr.id) === id ? "eat" : "supermarket";
      const g = geo(src, tr.place);
      const el = (now - t0) / 1000;
      if (el < 0 || el > g.total + 600) return; // старьё не трогаем
      out.push({ id, src, g, el, left: g.total - el });
    });
    return out.sort((a, b) => a.left - b.left);
  }
  function delItem(d) {
    const C = COURIER[d.src];
    const prog = Math.max(0, Math.min(1, d.el / d.g.total));
    const cooking = d.el < d.g.prep;
    const eta = Math.max(0, Math.ceil(d.g.min * (1 - prog)));
    return {
      type: "del", id: d.id, emoji: cooking ? C.prep : C.veh, tint: TINT.courier,
      title: cooking ? C.prepT : `${C.n} ${C.go}`, sub: `${C.svc} · ${kmRu(d.g.km)}`,
      p: prog, eta, near: d.left <= 0, C, src: d.src,
      open: () => V.go("eat-track", d.src === "supermarket" ? { id: d.id, src: "supermarket" } : { id: d.id }), screen: "eat-track",
    };
  }

  /* ---------- DOM ---------- */
  let root, pill, ico, ttl, sub, etaEl, bar, also, built = false;
  function build() {
    const app = document.getElementById("app");
    if (!app || built) return !!root;
    built = true;
    root = document.createElement("div");
    root.className = "tw";
    root.setAttribute("aria-live", "polite");
    root.innerHTML = `
      <div class="tw-pill" role="button" tabindex="0">
        <span class="tw-ico"><span class="tw-emo"></span></span>
        <span class="tw-tx"><b class="tw-ttl"></b><small class="tw-sub"></small></span>
        <span class="tw-eta"></span>
        <span class="tw-also" hidden></span>
        <button class="tw-fold" aria-label="Свернуть в кружок">›</button>
        <i class="tw-bar"><i></i></i>
      </div>`;
    app.appendChild(root);
    pill = root.querySelector(".tw-pill");
    ico = root.querySelector(".tw-ico");
    ttl = root.querySelector(".tw-ttl");
    sub = root.querySelector(".tw-sub");
    etaEl = root.querySelector(".tw-eta");
    bar = root.querySelector(".tw-bar > i");
    also = root.querySelector(".tw-also");
    root.classList.toggle("mini", lsGet());
    gestures();
    return true;
  }

  /* ---------- Жесты: тап — открыть, смахнуть — свернуть/развернуть ---------- */
  function setMini(v) {
    root.classList.toggle("mini", v);
    lsSet(v);
    // Один раз подсказываем, как вернуть пилюлю
    try { if (v && !localStorage.getItem(LS + "_hint")) { localStorage.setItem(LS + "_hint", "1"); FX.toast("Свернул в кружок. Смахни его влево — развернётся", "👈", 2600); } } catch (e) { /* ок */ }
    FX.haptic && FX.haptic(8);
    place(true);
  }
  function gestures() {
    let sx = 0, sy = 0, dx = 0, id = null, drag = false;
    pill.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".tw-fold")) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; dx = 0; drag = false;
      try { pill.setPointerCapture(id); } catch (err) { /* ок */ }
    });
    pill.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!drag && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) drag = true;
      if (drag) pill.style.transform = `translateX(${Math.max(-40, Math.min(90, dx)) * 0.6}px)`;
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      pill.style.transform = "";
      const mini = root.classList.contains("mini");
      if (drag) {
        if (!mini && dx > 44) setMini(true);
        else if (mini && dx < -24) setMini(false);
        pill.dataset.swiped = "1";
        setTimeout(() => delete pill.dataset.swiped, 60);
      }
    };
    pill.addEventListener("pointerup", end);
    pill.addEventListener("pointercancel", end);
    pill.addEventListener("click", (e) => {
      if (pill.dataset.swiped) return;
      if (e.target.closest(".tw-fold")) { e.stopPropagation(); setMini(!root.classList.contains("mini")); return; }
      if (cur && cur.open) { FX.haptic && FX.haptic(8); cur.open(); }
    });
    pill.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && cur) { e.preventDefault(); cur.open(); } });
  }

  /* ---------- Позиция: над таббаром / корзиной / нижними панелями ---------- */
  let lastBottom = -1;
  function obstacleTop(app, ar) {
    let topY = ar.bottom;
    const tb = document.getElementById("tabbar");
    if (tb && !tb.classList.contains("hidden")) {
      const r = tb.getBoundingClientRect();
      topY = Math.min(topY, r.top);
      const qr = tb.querySelector(".qr");
      if (qr) topY = Math.min(topY, qr.getBoundingClientRect().top);
    }
    // Прочие прилипшие к низу панели (корзина, поле ввода чата, кнопки экрана)
    const xs = [ar.left + 24, ar.left + ar.width / 2, ar.right - 30];
    const seen = new Set();
    for (let y = ar.bottom - 6; y > ar.bottom - 170; y -= 14) {
      for (const x of xs) {
        const list = document.elementsFromPoint(x, y);
        const el = list.find((n) => !root.contains(n));
        if (!el || seen.has(el)) continue;
        seen.add(el);
        for (let n = el; n && n !== app && n !== document.body; n = n.parentElement) {
          if (n.classList && n.classList.contains("screen")) break;
          const pos = getComputedStyle(n).position;
          const anchored = pos === "fixed" || pos === "sticky" || (pos === "absolute" && n.offsetParent && (n.offsetParent === app || n.offsetParent.classList.contains("screen") || n.offsetParent.id === "stack"));
          if (!anchored) continue;
          // Якорь может быть нулевой высоты (sticky-док корзины) — меряем всю цепочку до точки касания
          let top = Infinity, bot = -Infinity, wid = 0;
          for (let k = el; k; k = k.parentElement) {
            const r = k.getBoundingClientRect();
            if (r.height > 0) { top = Math.min(top, r.top); bot = Math.max(bot, r.bottom); wid = Math.max(wid, r.width); }
            if (k === n) break;
          }
          if (bot > ar.bottom - 110 && bot - top < 280 && wid > 90 && top > ar.top + ar.height * 0.45) topY = Math.min(topY, top);
          break;
        }
      }
    }
    return topY;
  }
  function place(force) {
    if (!root || !root.classList.contains("on")) return;
    const app = document.getElementById("app");
    const ar = app.getBoundingClientRect();
    const t = obstacleTop(app, ar);
    const b = Math.round(t >= ar.bottom - 1 ? 12 : ar.bottom - t + 10);
    if (force || Math.abs(b - lastBottom) > 4) { lastBottom = b; root.style.setProperty("--tw-b", b + "px"); }
  }

  /* ---------- Место под виджет в конце экрана ---------- */
  // Отступ снизу добавляем только экранам без прилипших к низу панелей:
  // иначе sticky-док (корзина) уехал бы вверх вместе с отступом
  const padInfo = new WeakMap();
  function padScreen() {
    const sc = V.current && V.current.el;
    if (!sc || !sc.isConnected) return;
    if (!padInfo.has(sc)) {
      const docked = [...sc.querySelectorAll("*")].some((n) => { const cs = getComputedStyle(n); return (cs.position === "sticky" || cs.position === "fixed") && cs.bottom !== "auto"; });
      padInfo.set(sc, !docked);
    }
    if (padInfo.get(sc)) sc.classList.add("tw-pad");
  }
  const unpad = () => document.querySelectorAll(".screen.tw-pad").forEach((n) => n.classList.remove("tw-pad"));

  /* ---------- Состояние и отрисовка ---------- */
  let cur = null, doneTimer = 0, doneUntil = 0, lastNav = 0, revealT = 0;
  const seenDel = new Set(), toasted = new Set();
  function pick() {
    const r = route();
    if (!S().profile || !S().game || /^(welcome|ending|onboarding)/.test(r)) return { show: null };
    const t = tripItem();
    const dels = deliveries();
    const live = dels.filter((d) => d.left > 0);
    live.forEach((d) => seenDel.add(d.id));
    // Курьер доехал, пока игрок был на другом экране — короткий тост с переходом
    dels.filter((d) => d.left <= 0 && seenDel.has(d.id) && !toasted.has(d.id)).forEach((d) => {
      toasted.add(d.id);
      if (r === "eat-track") return; // экран заказа сам празднует
      const C = COURIER[d.src];
      FX.toast(`${C.n} ${C.door}`, C.veh, 3600, { go: "eat-track", params: d.src === "supermarket" ? { id: d.id, src: "supermarket" } : { id: d.id }, label: "Открыть" });
      if (cur && cur.type === "del" && cur.id === d.id) finishFx("🎉", `${C.n} у двери!`, d.src === "supermarket" ? "Продукты приехали" : "Заказ приехал");
    });
    const d = live[0] ? delItem(live[0]) : null;
    // Поездка важнее; на экране карты поездки виджет показывает доставку, на экране заказа — поездку
    if (t && r !== "maps") return { show: t, other: d };
    if (d && r !== "eat-track") return { show: d, other: null };
    return { show: null };
  }
  function render() {
    if (!build()) return;
    if (Date.now() < doneUntil) return; // доигрываем «приехали»
    const busy = V.busy ? V.busy() : !!document.querySelector(".modal, .sheet");
    const { show, other } = pick();
    if (Date.now() < doneUntil) return; // pick() мог только что запустить «у двери»
    if (!show || busy) { hide(); return; }
    // Появляемся только когда экран доехал: во время анимации входа нижние панели ещё не на месте
    if (!root.classList.contains("on")) {
      const wait = 520 - (Date.now() - lastNav);
      if (wait > 0) { clearTimeout(revealT); revealT = setTimeout(render, wait); return; }
    }
    cur = show;
    root.dataset.type = show.type;
    const emo = root.querySelector(".tw-emo");
    if (emo.textContent !== show.emoji) emo.textContent = show.emoji;
    ico.style.setProperty("--tint", show.tint);
    if (ttl.textContent !== show.title) ttl.textContent = show.title;
    if (sub.textContent !== show.sub) sub.textContent = show.sub;
    const etaHtml = show.near ? `<span class="tw-pin">📍</span>` : `${show.eta}<small>мин</small>`;
    if (etaEl.innerHTML !== etaHtml) etaEl.innerHTML = etaHtml;
    const p = Math.max(3, Math.round(show.p * 100));
    bar.style.width = p + "%";
    root.style.setProperty("--p", p);
    also.hidden = !other;
    if (other && also.textContent !== other.emoji) also.textContent = other.emoji;
    pill.setAttribute("aria-label", `${show.title}. ${show.near ? "Почти на месте" : `Ещё ${show.eta} мин`}. Открыть`);
    if (!root.classList.contains("on")) {
      root.classList.remove("done");
      lastBottom = -1;
      root.classList.add("on");
      place(true);
      root.classList.add("no-move"); // первая позиция — без анимации «съезда»
      setTimeout(() => root.classList.remove("no-move"), 60);
    }
    padScreen();
    place();
  }
  function hide() {
    if (!root || !root.classList.contains("on")) return;
    root.classList.remove("on");
    unpad();
    cur = null;
  }
  // «Приехали»: ✓ в пилюле, полная полоска, через пару секунд — уезжает
  function finishFx(emoji, title, note = "Ты на месте") {
    if (!root || !root.classList.contains("on")) return;
    clearTimeout(doneTimer);
    root.classList.add("done");
    root.querySelector(".tw-emo").textContent = emoji;
    ttl.textContent = title;
    sub.textContent = note;
    etaEl.innerHTML = `<span class="tw-pin">✓</span>`;
    bar.style.width = "100%";
    root.style.setProperty("--p", 100);
    doneUntil = Date.now() + 1900;
    doneTimer = setTimeout(() => { doneUntil = 0; hide(); setTimeout(() => { root.classList.remove("done"); render(); }, 420); }, 1900);
  }

  /* ---------- Подписки ---------- */
  function boot() {
    if (!build()) return;
    render();
    setInterval(render, 1000);
    window.addEventListener("hashchange", () => { lastNav = Date.now(); setTimeout(render, 60); setTimeout(() => place(true), 500); });
    V.on("trip", () => setTimeout(render, 30));
    V.on("arrive", (d) => {
      if (cur && cur.type === "trip" && root.classList.contains("on")) {
        const p = d && d.to && V.map && V.map.place(d.to);
        finishFx("✅", d && d.to === "home" ? "Ты дома" : `Приехали${p && p.label ? ": " + p.label : ""}`);
      } else setTimeout(render, 30);
    });
    window.addEventListener("resize", () => place(true));
    // Экран доехал (анимация входа закончилась) — нижние панели встали на место
    document.addEventListener("animationend", (e) => { if (e.target && e.target.classList && (e.target.classList.contains("screen") || e.target.classList.contains("cartbar"))) place(); });
  }

  const css = `
  .tw { position: absolute; right: 12px; bottom: calc(var(--tw-b, 12px) + var(--safe-bottom)); z-index: 58; width: min(318px, calc(100% - 24px));
    display: flex; justify-content: flex-end; pointer-events: none; opacity: 0; transform: translateY(18px) scale(.96);
    transition: opacity .25s ease, transform .4s var(--spring), bottom .35s var(--out), right .3s var(--out); }
  .tw.on { opacity: 1; transform: none; }
  .tw.no-move { transition: opacity .25s ease, transform .4s var(--spring); }
  .tw.on .tw-pill { pointer-events: auto; }
  .tw-pill { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; height: 58px; padding: 0 10px 0 7px; box-sizing: border-box;
    background: var(--ink); color: #fff; border: 2.5px solid var(--ink); border-radius: 999px; overflow: hidden; cursor: pointer;
    box-shadow: 0 4px 0 rgba(14,14,18,.35), 0 10px 26px rgba(14,14,18,.28); touch-action: pan-y; user-select: none; -webkit-user-select: none;
    transition: width .38s var(--spring), padding .3s var(--out), transform .2s var(--out); }
  .tw-pill:active { transform: scale(.98); }
  .tw-ico { flex: 0 0 auto; position: relative; width: 42px; height: 42px; border-radius: 50%; background: var(--tint, #ffe14d); border: 2.5px solid #fff;
    display: grid; place-items: center; font-size: 22px; line-height: 1; }
  .tw-emo { display: block; animation: tw-bob 1.4s ease-in-out infinite; }
  @keyframes tw-bob { 50% { transform: translateY(-2px) rotate(-4deg); } }
  .tw-tx { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .tw-ttl { font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tw-sub { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tw-eta { flex: 0 0 auto; font-family: var(--font-display); font-size: 20px; line-height: 1; color: var(--lime); text-align: right; min-width: 34px; }
  .tw-eta small { display: block; font-family: var(--font); font-size: 10px; font-weight: 800; color: rgba(255,255,255,.62); margin-top: 1px; }
  .tw-pin { font-size: 20px; }
  .tw-fold { flex: 0 0 auto; width: 26px; height: 40px; margin-right: -4px; border: 0; background: none; color: rgba(255,255,255,.55); font-size: 22px; font-weight: 900; line-height: 1; }
  .tw-also { position: absolute; left: 34px; top: 4px; width: 20px; height: 20px; border-radius: 50%; background: var(--pink); border: 2px solid var(--ink); font-size: 11px; display: grid; place-items: center; }
  .tw-also[hidden] { display: none; }
  .tw-bar { position: absolute; left: 56px; right: 18px; bottom: 6px; height: 3px; border-radius: 3px; background: rgba(255,255,255,.16); overflow: hidden; }
  .tw-bar > i { display: block; height: 100%; width: 3%; border-radius: 3px; background: var(--lime); transition: width 1s linear; }
  .tw.done .tw-ico { --tint: var(--lime) !important; animation: tw-pop .5s var(--spring); }
  .tw.done .tw-emo { animation: none; }
  @keyframes tw-pop { 40% { transform: scale(1.25); } }

  /* Компактный кружок: кольцо прогресса вокруг иконки */
  .tw.mini { right: 6px; }
  .tw.mini .tw-pill { width: 58px; padding: 0 7.5px 0 0; justify-content: flex-end; }
  .tw.mini .tw-pill::before { content: ""; position: absolute; top: 2px; right: 2px; width: 49px; height: 49px; border-radius: 50%;
    background: conic-gradient(var(--lime) calc(var(--p, 0) * 1%), rgba(255,255,255,.2) 0);
    -webkit-mask: radial-gradient(circle, transparent 20.5px, #000 21px); mask: radial-gradient(circle, transparent 20.5px, #000 21px); }
  .tw.mini .tw-tx, .tw.mini .tw-eta, .tw.mini .tw-fold, .tw.mini .tw-bar { display: none; }
  .tw.mini .tw-ico { width: 38px; height: 38px; border-width: 2px; border-color: var(--ink); font-size: 20px; }
  .tw.mini .tw-also { left: auto; right: -2px; top: -2px; }

  /* Пока виджет на экране — даём контенту место снизу */
  .screen.tw-pad.no-tab { padding-bottom: calc(var(--safe-bottom) + 110px); }
  .screen.tw-pad:not(.no-tab) { padding-bottom: calc(var(--safe-bottom) + 186px); }
  @media (prefers-reduced-motion: reduce) { .tw, .tw-pill, .tw-bar > i { transition: none; } .tw-emo { animation: none; } }
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  V.tripWidget = { render, hide, place };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
