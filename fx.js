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
    tap() { tone(rand(820, 980), 0.05, { to: 1400, vol: 0.035 }); },
    pop() { tone(360, 0.09, { type: "triangle", to: 980, vol: 0.07 }); },
    coin() { tone(988, 0.06, { type: "square", vol: 0.03 }); tone(1319, 0.14, { type: "square", vol: 0.03, delay: 0.06 }); },
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
  function haptic(p = 8) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

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
      el.className = "p"; el.textContent = emoji; el.style.fontSize = "26px";
      layer().appendChild(el);
      const mx = (a.x + b.x) / 2 + rand(-120, 120), my = Math.min(a.y, b.y) - rand(60, 180);
      const sx = a.x + rand(-30, 30), sy = a.y + rand(-20, 20);
      el.animate([
        { transform: `translate(${sx}px, ${sy}px) translate(-50%,-50%) scale(0)` },
        { transform: `translate(${sx + rand(-40, 40)}px, ${sy - rand(30, 70)}px) translate(-50%,-50%) scale(1.3)`, offset: 0.2 },
        { transform: `translate(${mx}px, ${my}px) translate(-50%,-50%) scale(1.1) rotate(180deg)`, offset: 0.6 },
        { transform: `translate(${b.x}px, ${b.y}px) translate(-50%,-50%) scale(.5) rotate(360deg)` },
      ], { duration: 900 + i * 70, easing: "cubic-bezier(.5,0,.4,1)", delay: i * 45, fill: "both" }).onfinish = () => {
        el.remove(); sound.coin(); haptic(6);
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
      if (t - lastTick > 70 && k < 1) { sound.tick(); lastTick = t; }
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- Тост ---------- */
  function toast(text, emoji = "✨", ms = 2400) {
    const root = document.getElementById("toast-root");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="emo wobble">${emoji}</span><span>${text}</span>`;
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, ms);
  }

  /* ---------- Глобальный отклик на касание ---------- */
  document.addEventListener("pointerdown", (e) => {
    const t = e.target.closest("button, [data-go], [data-act], .tap, .chip");
    if (!t) return;
    ripple(e.clientX, e.clientY);
    if (!t.hasAttribute("data-silent")) sound.tap();
    haptic(6);
  }, { passive: true });

  window.FX = { sound, haptic, burst, confetti, coins, bump, shake, countTo, toast, ripple, pt, rand, pick };
})();
