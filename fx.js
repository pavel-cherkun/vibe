/* ============================================================
   FX — дофаминовый движок: звук, вибрация, частицы,
   конфетти, летящие монетки, счётчики, тосты.
   ============================================================ */
(function () {
  const layer = () => document.getElementById("fx-layer");
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- Звук (синтез через WebAudio, без файлов) ---------- */
  let ctx = null;
  function ac() {
    if (!Vibe.state.get().sound) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, dur, { type = "sine", vol = 0.06, to = null, delay = 0 } = {}) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, { vol = 0.05, from = 400, to = 4000, delay = 0 } = {}) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(c.destination);
    s.start(t);
  }
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
  const sound = {
    tap() { tone(rand(820, 980), 0.035, { to: 1300, vol: 0.012 }); },
    pop() { tone(360, 0.09, { type: "triangle", to: 980, vol: 0.07 }); },
    coin() { tone(988, 0.06, { type: "triangle", vol: 0.035 }); tone(1319, 0.12, { type: "triangle", vol: 0.03, delay: 0.06 }); },
    add() { tone(660, 0.07, { type: "triangle", vol: 0.06 }); tone(990, 0.1, { type: "triangle", vol: 0.06, delay: 0.06 }); },
    success() { [0, 2, 4, 5].forEach((n, i) => tone(NOTES[n], 0.18, { type: "triangle", vol: 0.07, delay: i * 0.08 })); },
    levelup() { [0, 2, 4, 5, 7].forEach((n, i) => tone(NOTES[n], 0.22, { type: "square", vol: 0.035, delay: i * 0.09 })); noise(0.6, { vol: 0.03, from: 2000, to: 9000, delay: 0.3 }); },
    whoosh() { noise(0.28, { vol: 0.05, from: 300, to: 3000 }); },
    error() { tone(180, 0.16, { type: "sawtooth", vol: 0.04, to: 120 }); },
    tick() { tone(1800, 0.02, { type: "square", vol: 0.02 }); },
    like() { tone(700, 0.08, { type: "sine", vol: 0.07, to: 1400 }); tone(1400, 0.12, { type: "sine", vol: 0.05, delay: 0.07 }); },
    swipe() { noise(0.18, { vol: 0.04, from: 800, to: 2400 }); },
  };

  /* ---------- Вибрация ---------- */
  function haptic(p = 8) {
    try {
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
      navigator.vibrate && navigator.vibrate(p);
    } catch (e) {}
  }

  /* ---------- Координаты ---------- */
  function pt(src) {
    if (!src) return { x: innerWidth / 2, y: innerHeight / 2 };
    if (src.x !== undefined && src.y !== undefined && !(src instanceof Element)) return src;
    const r = (src.getBoundingClientRect ? src : src.target || src).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ---------- Взрыв частиц ---------- */
  function burst(src, { emojis = ["✨", "💜", "⭐", "💥"], count = 14, spread = 140, size = [18, 30] } = {}) {
    const { x, y } = pt(src);
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "p";
      el.textContent = pick(emojis);
      el.style.fontSize = rand(size[0], size[1]) + "px";
      layer().appendChild(el);
      const a = rand(0, Math.PI * 2), d = rand(spread * 0.4, spread);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - rand(20, 60);
      el.animate([
        { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(.3) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy}px) translate(-50%, -50%) scale(1.1) rotate(${rand(-180, 180)}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${x + dx * 1.15}px, ${y + dy + 80}px) translate(-50%, -50%) scale(.6) rotate(${rand(-260, 260)}deg)`, opacity: 0 },
      ], { duration: rand(700, 1100), easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => el.remove();
    }
  }

  /* ---------- Кольцо от касания ---------- */
  function ripple(x, y) {
    const r = document.createElement("span");
    r.className = "ripple";
    r.style.left = x + "px"; r.style.top = y + "px";
    layer().appendChild(r);
    setTimeout(() => r.remove(), 520);
  }

  /* ---------- Конфетти ---------- */
  let confettiParts = [], confettiRaf = null;
  const COLORS = ["#ffe14d", "#ff6bcb", "#c6ff4d", "#3d7bff", "#ff6b2c", "#7cf5c8", "#8b5cff"];
  function confetti({ count = 160, from = null } = {}) {
    const cv = document.getElementById("confetti");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const o = from ? pt(from) : null;
    for (let i = 0; i < count; i++) {
      const fromSide = !o && i % 2;
      confettiParts.push({
        x: o ? o.x : fromSide ? innerWidth + 10 : -10,
        y: o ? o.y : innerHeight * rand(0.45, 0.75),
        vx: o ? rand(-9, 9) : fromSide ? rand(-14, -5) : rand(5, 14),
        vy: o ? rand(-16, -6) : rand(-20, -10),
        w: rand(7, 13), h: rand(10, 18), r: rand(0, 6), vr: rand(-0.3, 0.3),
        c: pick(COLORS), shape: Math.random() < 0.3 ? "circle" : "rect", life: 0,
      });
    }
    if (!confettiRaf) loop();
    function loop() {
      g.clearRect(0, 0, innerWidth, innerHeight);
      confettiParts.forEach((p) => {
        p.vy += 0.42; p.vx *= 0.985; p.vy *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r);
        g.fillStyle = p.c; g.strokeStyle = "#0e0e12"; g.lineWidth = 1.5;
        const sx = Math.cos(p.life * 0.18);
        if (p.shape === "circle") { g.beginPath(); g.arc(0, 0, p.w / 2, 0, 7); g.fill(); g.stroke(); }
        else { g.fillRect(-p.w / 2, -p.h / 2 * sx, p.w, p.h * sx); g.strokeRect(-p.w / 2, -p.h / 2 * sx, p.w, p.h * sx); }
        g.restore();
      });
      confettiParts = confettiParts.filter((p) => p.y < innerHeight + 40 && p.life < 400);
      if (confettiParts.length) confettiRaf = requestAnimationFrame(loop);
      else { g.clearRect(0, 0, innerWidth, innerHeight); confettiRaf = null; }
    }
  }

  /* ---------- Летящие монетки ---------- */
  function coins(from, to, n = 8, { emoji = "🪙", onEach, onDone } = {}) {
    const a = pt(from);
    const target = typeof to === "string" ? document.querySelector(to) : to;
    const b = target ? pt(target) : { x: innerWidth - 40, y: 40 };
    let done = 0;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("span");
      el.className = "p"; el.style.fontSize = "26px";
      if (emoji === "🪙" && window.Vibe && Vibe.coin) { el.innerHTML = Vibe.coin(26, { still: true }); el.style.lineHeight = "0"; }
      else el.textContent = emoji;
      layer().appendChild(el);
      const mx = (a.x + b.x) / 2 + rand(-120, 120), my = Math.min(a.y, b.y) - rand(60, 180);
      const sx = a.x + rand(-30, 30), sy = a.y + rand(-20, 20);
      el.animate([
        { transform: `translate(${sx}px, ${sy}px) translate(-50%,-50%) scale(0)` },
        { transform: `translate(${sx + rand(-40, 40)}px, ${sy - rand(30, 70)}px) translate(-50%,-50%) scale(1.3)`, offset: 0.2 },
        { transform: `translate(${mx}px, ${my}px) translate(-50%,-50%) scale(1.1) rotate(180deg)`, offset: 0.6 },
        { transform: `translate(${b.x}px, ${b.y}px) translate(-50%,-50%) scale(.5) rotate(360deg)` },
      ], { duration: 900 + i * 70, easing: "cubic-bezier(.5,0,.4,1)", delay: i * 45, fill: "both" }).onfinish = () => {
        el.remove(); if (i === 0) sound.coin(); haptic(6);
        if (target) bump(target);
        onEach && onEach(i);
        if (++done === n) onDone && onDone();
      };
    }
  }

  /* ---------- Микро-анимации элемента ---------- */
  function retrigger(el, cls) {
    if (!el || !el.classList) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  }
  const bump = (el) => retrigger(el, "jelly");
  const shake = (el) => { retrigger(el, "shake"); sound.error(); haptic([20, 40, 20]); };

  /* ---------- Счётчик ---------- */
  function countTo(el, to, { from = null, dur = 900, fmt = Vibe.fmt } = {}) {
    if (!el) return;
    const start = from !== null ? from : parseFloat((el.dataset.val || "0")) || 0;
    const t0 = performance.now();
    el.dataset.val = to;
    let lastTick = 0;
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(Math.round(start + (to - start) * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- Тост ---------- */
  // opts: { go, params, onClick, label, log } — уведомление можно нажать и сразу открыть источник.
  // Третьим аргументом можно передать сразу opts.
  // Источник угадывается по тексту/эмодзи, если go не передан (письмо → Почта, сообщение → Чаты, деньги → Pay…).
  // Входящие уведомления (не мгновенный отклик на нажатие) пишутся в историю — центр уведомлений Vibe.notifs.
  let lastTap = 0;
  document.addEventListener("pointerdown", () => { lastTap = Date.now(); }, { passive: true, capture: true });
  const strip = (h) => String(h == null ? "" : h).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  function guess(text, emoji) {
    const t = strip(text), e = String(emoji || "");
    const has = (n) => window.Vibe && Vibe.screens && Vibe.screens[n];
    if (/[✉📧📨📬📩]/u.test(e) || /письм|почт[аеуы]|входящ/i.test(t)) return has("mail") ? { go: "mail" } : null;
    if (e === "🤖" || /^Вайбот:/.test(t)) return { go: "chat", params: { id: "zabotik" } };
    if (/достижени/i.test(t)) return { go: "profile" };
    if (/напоминани|календар|задани[ея] дня|через \d+ мин|⏰/i.test(t) || /[⏰📅🗓]/u.test(e)) return { go: "calendar" };
    const money = /зарплат|перев[оё]д|списа|начисл|кредит|долг|штраф|баланс|аванс|преми|₫/i;
    if ((/^[А-ЯЁA-Z][^:\d]{0,26}: /.test(t) && !money.test(t.split(":")[0]) && !/^Vibe /.test(t)) || /сообщени|написал|написала|в чат/i.test(t) || e === "💬") return has("chats") ? { go: "chats" } : null;
    if (/зарплат|перев[оё]д|списа|начисл|кредит|долг|штраф|баланс|аванс|премия/i.test(t)) return { go: "pay" };
    if (/вайбик/i.test(t)) return { go: "profile" };
    return null;
  }
  const emoHtml = (e) => (e === "🪙" && window.Vibe && Vibe.coin ? Vibe.coin(24) : e);

  function toast(text, emoji = "✨", ms = 2400, opts) {
    if (ms && typeof ms === "object") { opts = ms; ms = 2400; }
    opts = opts || {};
    const root = document.getElementById("toast-root");
    if (!root) return;
    const src = opts.go || opts.onClick ? null : guess(text, emoji);
    const go = opts.go || (src && src.go), params = opts.params || (src && src.params) || {};
    const act = !!(go || opts.onClick);
    // В историю — всё, что пришло само (не в ответ на касание), и всё, у чего есть источник
    const fromTap = Date.now() - lastTap < 1200;
    if (opts.log !== false && (opts.log || go || !fromTap)) notifs.add({ t: text, e: emoji, go, p: params });

    const el = document.createElement("div");
    el.className = "toast" + (act ? " act" : "");
    el.innerHTML = `<span class="emo wobble">${emoHtml(emoji)}</span><span class="tx">${text}</span>${act ? `<span class="go">${opts.label || "→"}</span>` : ""}`;
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    let dead = false, timer = null, left = act ? Math.max(ms + 2600, 6000) : Math.max(ms + 1600, 4000), t0 = 0;
    const kill = (up) => {
      if (dead) return; dead = true; clearTimeout(timer);
      el.classList.add(up ? "out-up" : "out");
      setTimeout(() => el.remove(), 320);
    };
    const run = () => { t0 = Date.now(); clearTimeout(timer); timer = setTimeout(() => kill(), left); };
    const pause = () => { clearTimeout(timer); left = Math.max(1500, left - (Date.now() - t0)); };
    run();

    // Касание: держишь — тост не исчезает; смахнул вверх — скрыл; тапнул — открыл источник
    let y0 = null, dy = 0, moved = false;
    el.addEventListener("pointerdown", (e) => { y0 = e.clientY; dy = 0; moved = false; pause(); el.style.transition = "none"; try { el.setPointerCapture(e.pointerId); } catch (x) {} });
    el.addEventListener("pointermove", (e) => {
      if (y0 == null) return;
      dy = e.clientY - y0;
      if (Math.abs(dy) > 6) moved = true;
      if (moved) { el.style.transform = `translateY(${Math.min(0, dy)}px)`; el.style.opacity = String(Math.max(0.2, 1 + Math.min(0, dy) / 90)); }
    });
    const end = () => {
      if (y0 == null) return;
      y0 = null;
      el.style.transition = "transform .2s var(--out), opacity .2s";
      if (dy < -26) { el.style.transform = "translateY(-140%)"; el.style.opacity = "0"; haptic(6); dead = true; clearTimeout(timer); setTimeout(() => el.remove(), 220); return; }
      el.style.transform = ""; el.style.opacity = "";
      run();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", (e) => {
      if (moved) { moved = false; return; }
      if (!act) { kill(true); return; }
      e.stopPropagation();
      haptic(8);
      kill();
      if (opts.onClick) opts.onClick();
      if (go && window.Vibe) Vibe.go(go, params);
    });
  }

  /* ---------- Центр уведомлений: история последних 30 ---------- */
  const N_MAX = 30;
  const notifs = {
    list: () => ((window.Vibe && Vibe.state && Vibe.state.get().notifs) || []),
    unread: () => notifs.list().filter((n) => !n.read).length,
    add(n) {
      if (!window.Vibe || !Vibe.state || !Vibe.state.get().profile) return;
      const list = notifs.list();
      const t = String(n.t || "");
      // Тот же текст несколько секунд назад — не дублируем
      if (list[0] && list[0].t === t && Date.now() - list[0].at < 8000) return;
      let gt = "";
      try { gt = Vibe.game && Vibe.state.get().game ? Vibe.game.info().label : ""; } catch (e) {}
      const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, e: n.e || "🔔", go: n.go || "", p: n.p && Object.keys(n.p).length ? n.p : undefined, at: Date.now(), gt, read: false };
      Vibe.state.set({ notifs: [item, ...list].slice(0, N_MAX) });
      notifs.paint();
    },
    readAll(quiet) {
      const list = notifs.list();
      if (!list.some((n) => !n.read)) return;
      Vibe.state.set({ notifs: list.map((n) => (n.read ? n : Object.assign({}, n, { read: true }))) });
      if (!quiet) notifs.paint(); else setTimeout(notifs.paint, 0);
    },
    // Обновить все счётчики-колокольчики на экране: <span data-notif-count></span>
    paint() {
      const n = notifs.unread();
      document.querySelectorAll("[data-notif-count]").forEach((el) => {
        const txt = n > 99 ? "99+" : String(n);
        el.hidden = !n;
        if (el.textContent !== txt) { el.textContent = txt; if (n) bump(el); }
      });
    },
    ago(at) {
      const m = Math.round((Date.now() - at) / 60000);
      if (m < 1) return "только что";
      if (m < 60) return `${m} мин назад`;
      const h = Math.round(m / 60);
      if (h < 24) return `${h} ч назад`;
      return `${Math.round(h / 24)} дн. назад`;
    },
    open() {
      if (!window.Vibe || !Vibe.ui) return;
      const list = notifs.list();
      const unreadIds = new Set(list.filter((n) => !n.read).map((n) => n.id));
      const row = (n) => `
        <button class="nt-row ${unreadIds.has(n.id) ? "new" : ""} ${n.go ? "tap" : ""}" ${n.go ? `data-nt="${n.id}"` : "disabled"}>
          <span class="nt-ic">${emoHtml(n.e)}</span>
          <span class="nt-tx"><span class="nt-t">${n.t}</span><small>${notifs.ago(n.at)}${n.gt ? " · " + Vibe.esc(n.gt) : ""}</small></span>
          ${n.go ? `<span class="nt-go">›</span>` : ""}
        </button>`;
      Vibe.ui.sheet(`
        <div class="nt-head"><div class="display" style="font-size:26px">Уведомления</div>${list.length ? `<button class="chip" data-nt-clear>Очистить</button>` : ""}</div>
        <p class="nt-sub">Последние ${N_MAX}. Корпорация помнит остальные</p>
        ${list.length ? `<div class="nt-list">${list.map(row).join("")}</div>` : `<div class="nt-empty"><div class="emo float" style="font-size:54px">🔕</div><b>Пока тихо</b><small>Подозрительно тихо. Мы уже работаем над этим</small></div>`}
        <button class="btn black block" style="margin-top:14px" data-close>Понятно</button>`, {
        onMount(sh, close) {
          sh.addEventListener("click", (e) => {
            if (e.target.closest("[data-nt-clear]")) {
              Vibe.state.set({ notifs: [] }); notifs.paint();
              const l = sh.querySelector(".nt-list"); if (l) l.innerHTML = `<div class="nt-empty"><b>Пусто</b><small>История уведомлений очищена</small></div>`;
              e.target.closest("[data-nt-clear]").remove();
              return;
            }
            const b = e.target.closest("[data-nt]");
            if (!b) return;
            const n = notifs.list().find((x) => x.id === b.dataset.nt);
            if (!n || !n.go) return;
            close();
            setTimeout(() => Vibe.go(n.go, n.p || {}), 200);
          });
        },
      });
      notifs.readAll();
    },
  };
  if (window.Vibe) Vibe.notifs = notifs;
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-notifs]")) { e.preventDefault(); e.stopPropagation(); notifs.open(); }
  }, true);
  (function notifCss() {
    const st = document.createElement("style");
    st.textContent = `
    .dot-count[hidden]{display:none}
    .toast{pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none}
    .toast .emo .vcoin{vertical-align:middle}
    .toast.out-up{animation:toast-out .25s ease both}
    .toast .go{flex:0 0 auto;background:var(--lime);color:var(--ink);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:900}
    .nt-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
    .nt-sub{font-size:12px;font-weight:700;color:var(--muted);margin:2px 0 12px}
    .nt-list{display:grid;gap:8px;max-height:58vh;overflow-y:auto;padding:2px 2px 6px}
    .nt-row{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:var(--paper);border:2px solid var(--ink);border-radius:18px;padding:10px 12px;color:var(--ink)}
    .nt-row[disabled]{opacity:1;cursor:default}
    .nt-row.new{background:#f4ffd9;box-shadow:var(--shadow-sm)}
    .nt-row.new .nt-ic::after{content:"";position:absolute;top:-3px;right:-3px;width:11px;height:11px;border-radius:50%;background:var(--pink);border:2px solid var(--ink)}
    .nt-ic{position:relative;width:42px;height:42px;flex:0 0 42px;border-radius:14px;border:2px solid var(--ink);background:var(--yellow);display:grid;place-items:center;font-size:22px}
    .nt-tx{flex:1;min-width:0;display:grid;gap:2px}
    .nt-t{font-weight:800;font-size:14px;line-height:1.25;overflow-wrap:anywhere}
    .nt-tx small{font-size:11px;font-weight:700;color:var(--muted)}
    .nt-go{font-size:22px;font-weight:900}
    .nt-empty{display:grid;justify-items:center;text-align:center;gap:4px;padding:18px 0}
    .nt-empty small{color:var(--muted);font-weight:700}`;
    document.head.appendChild(st);
  })();

  /* ---------- Глобальный отклик на касание ---------- */
  document.addEventListener("pointerdown", (e) => {
    const t = e.target.closest("button, [data-go], [data-act], .tap, .chip");
    if (!t) return;
    ripple(e.clientX, e.clientY);
    if (!t.hasAttribute("data-silent")) sound.tap();
    haptic(6);
  }, { passive: true });

  window.FX = { sound, haptic, burst, confetti, coins, bump, shake, countTo, toast, ripple, pt, rand, pick, notifs };
})();
