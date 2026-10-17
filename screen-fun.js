/* ============================================================
   Fun — развлекательная часть Vibe:
   maps (такси), music (лоу-фай на WebAudio), games (мини-игры),
   invest (брокер), wheel (колесо вайба) и Vibe.openStories().
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Утилиты ---------- */
  const S = () => Vibe.state.get();
  const rand = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const today = () => new Date().toDateString();
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const easeOut = (k) => 1 - Math.pow(1 - k, 4);
  const pct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2).replace(".", ",") + "%";

  // Набор таймеров/слушателей экрана — всё чистится одним вызовом
  function scope() {
    const t = new Set(), iv = new Set(), rafs = new Set(), offs = [];
    const sc = {
      dead: false,
      to(fn, ms) { const id = setTimeout(() => { t.delete(id); if (!sc.dead) fn(); }, ms); t.add(id); return id; },
      every(fn, ms) { const id = setInterval(() => { if (!sc.dead) fn(); }, ms); iv.add(id); return id; },
      stop(id) { clearInterval(id); clearTimeout(id); iv.delete(id); t.delete(id); },
      raf(fn) { const id = requestAnimationFrame((ts) => { rafs.delete(id); if (!sc.dead) fn(ts); }); rafs.add(id); return id; },
      on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); offs.push(() => el.removeEventListener(ev, fn, opt)); },
      clear() {
        sc.dead = true;
        t.forEach(clearTimeout); iv.forEach(clearInterval); rafs.forEach(cancelAnimationFrame);
        offs.forEach((f) => f()); t.clear(); iv.clear(); rafs.clear(); offs.length = 0;
      },
    };
    return sc;
  }

  // Собственные «блипы» с настраиваемой высотой (для комбо, скретча и т.п.)
  let bctx = null;
  function actx() {
    if (S().sound === false) return null;
    try { if (!bctx) bctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (bctx.state === "suspended") bctx.resume();
    return bctx;
  }
  function blip(freq, dur = 0.09, { type = "triangle", vol = 0.05, to = null, delay = 0 } = {}) {
    const c = actx(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function scratchNoise() {
    const c = actx(); if (!c) return;
    const t = c.currentTime, len = Math.floor(c.sampleRate * 0.05);
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2500 + Math.random() * 2500;
    const g = c.createGain(); g.gain.value = 0.035;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  }

  // Всплывающий текст «+5» в точке экрана
  function floatText(text, x, y, color = "var(--ink)", size = 26) {
    const el = document.createElement("span");
    el.className = "p fz-ftxt";
    el.textContent = text;
    el.style.cssText = `font-size:${size}px;color:${color}`;
    document.getElementById("fx-layer").appendChild(el);
    el.animate([
      { transform: `translate(${x}px,${y}px) translate(-50%,-50%) scale(.4)`, opacity: 0 },
      { transform: `translate(${x}px,${y - 30}px) translate(-50%,-50%) scale(1.25)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${x}px,${y - 80}px) translate(-50%,-50%) scale(1)`, opacity: 0 },
    ], { duration: 850, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => el.remove();
  }

  const retrigger = (el, cls, ms = 700) => {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  };

  /* ---------- Стили (только для этого файла, префикс fz-) ---------- */
  const CSS = `
  .p.fz-ftxt { font-family: var(--font-display); white-space: nowrap; text-shadow: 2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff; }
  .fz-row { display: flex; align-items: center; gap: 10px; }
  .fz-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .fz-up { color: #12a150; } .fz-down { color: #e5333d; }
  @keyframes fz-pop { 0% { transform: scale(.3); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
  .fz-popin { animation: fz-pop .5s var(--spring) both; }

  /* MAPS */
  .fz-map { position: relative; height: 50vh; min-height: 300px; max-height: 460px; border: var(--line); border-radius: 30px; overflow: hidden; box-shadow: var(--shadow); background: #f6efdb; }
  .fz-map svg { width: 100%; height: 100%; display: block; }
  .fz-map .fz-amb, .fz-map #fzCar { transition: none; }
  .fz-pinb { transform-box: fill-box; transform-origin: 50% 100%; animation: fz-pinb 1.3s var(--spring) infinite; }
  @keyframes fz-pinb { 0%, 100% { transform: translateY(0) scale(1); } 30% { transform: translateY(-12px) scale(1.05, .95); } 55% { transform: translateY(0) scale(1.12, .86); } 70% { transform: translateY(-3px); } }
  .fz-me-ring { transform-box: fill-box; transform-origin: center; animation: fz-ring 2s ease-out infinite; }
  @keyframes fz-ring { from { transform: scale(.6); opacity: .7; } to { transform: scale(2.6); opacity: 0; } }
  .fz-radar circle { transform-box: fill-box; transform-origin: center; animation: fz-radar 1.8s ease-out infinite; opacity: 0; }
  .fz-radar circle:nth-child(2) { animation-delay: .6s; } .fz-radar circle:nth-child(3) { animation-delay: 1.2s; }
  @keyframes fz-radar { from { transform: scale(.2); opacity: .85; } to { transform: scale(4.5); opacity: 0; } }
  .fz-route { fill: none; stroke: var(--violet); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; transition: stroke-dashoffset 1.1s cubic-bezier(.6,0,.2,1); }
  .fz-route-glow { fill: none; stroke: #fff; stroke-width: 13; stroke-linecap: round; stroke-linejoin: round; opacity: .9; transition: stroke-dashoffset 1.1s cubic-bezier(.6,0,.2,1); }
  .fz-map-tag { position: absolute; z-index: 2; }
  .fz-panel { position: relative; z-index: 4; margin-top: -40px; border-radius: 30px; padding: 18px 16px 16px; }
  .fz-dest { display: flex; align-items: center; gap: 10px; background: var(--bg); border: 2px solid var(--ink); border-radius: 18px; padding: 10px 12px; font-weight: 800; font-size: 14px; }
  .fz-dest .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--blue); border: 2.5px solid var(--ink); flex: 0 0 auto; }
  .fz-chip-dest.on { background: var(--violet); color: #fff; }
  .fz-tars { padding-top: 10px; }
  .fz-tar { width: 128px; padding: 12px; border: var(--line); border-radius: 22px; background: var(--paper); box-shadow: var(--shadow-sm); text-align: left; position: relative; transition: transform .3s var(--spring), background .2s, box-shadow .2s; }
  .fz-tar .e { font-size: 38px; display: block; margin-bottom: 6px; }
  .fz-tar b { display: block; font-size: 15px; font-weight: 800; }
  .fz-tar small { font-size: 11px; font-weight: 700; color: var(--muted); display: block; }
  .fz-tar .pr { font-family: var(--font-display); font-size: 19px; margin-top: 4px; display: inline-block; }
  .fz-tar.on { background: var(--yellow); transform: translateY(-5px) rotate(-2deg); box-shadow: var(--shadow); }
  .fz-tar.neon { background: #17112a; color: #fff; border-color: #000; box-shadow: 0 0 0 2px var(--pink), 0 0 18px var(--pink), var(--shadow-sm); animation: fz-neon 1.4s ease-in-out infinite alternate; }
  .fz-tar.neon small { color: #d9c8ff; }
  .fz-tar.neon.on { background: #2a1352; }
  @keyframes fz-neon { to { box-shadow: 0 0 0 2px var(--lime), 0 0 26px var(--violet), var(--shadow-sm); } }
  .fz-tar .surge { position: absolute; top: -10px; right: -6px; background: #ff3b3b; color: #fff; transform: rotate(8deg); opacity: 0; transition: opacity .2s; }
  .fz-tar.surging .surge { opacity: 1; animation: fz-pop .45s var(--spring); }
  .fz-tar.surging .pr { color: #ff3b3b; }
  .fz-surge-bar { display: flex; align-items: center; gap: 8px; background: #ff3b3b; color: #fff; border: 2px solid var(--ink); border-radius: 14px; padding: 8px 12px; font-weight: 800; font-size: 13px; margin-top: 4px; }
  .fz-surge-bar .emo { animation: wobble .6s ease-in-out infinite; }
  .fz-plate { display: inline-flex; align-items: center; gap: 6px; border: 2.5px solid var(--ink); border-radius: 8px; padding: 2px 8px; background: #fff; font-weight: 900; font-size: 14px; letter-spacing: 1px; font-variant-numeric: tabular-nums; color: var(--ink); }
  .fz-plate i { font-style: normal; font-size: 10px; border-left: 2px solid var(--ink); padding-left: 5px; }
  .fz-driver-ava { width: 66px; height: 66px; border-radius: 22px; border: var(--line); display: grid; place-items: center; font-size: 40px; flex: 0 0 auto; box-shadow: var(--shadow-sm); }
  .fz-stars { display: flex; justify-content: center; gap: 4px; margin: 12px 0 6px; }
  .fz-stars button { font-size: 40px; filter: grayscale(1); opacity: .35; transition: transform .3s var(--spring), filter .2s, opacity .2s; }
  .fz-stars button.on { filter: none; opacity: 1; transform: scale(1.18) rotate(-8deg); }
  .fz-search-txt { min-height: 20px; font-weight: 800; color: var(--muted); font-size: 14px; }
  .fz-dots span { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--violet); border: 2px solid var(--ink); margin: 0 3px; animation: typing 1s infinite; }
  .fz-dots span:nth-child(2) { animation-delay: .15s; } .fz-dots span:nth-child(3) { animation-delay: .3s; }

  /* MUSIC */
  .fz-player { text-align: center; padding: 18px 16px 20px; border-radius: 32px; color: #fff; background: radial-gradient(120% 80% at 50% 0%, #3a1d6e 0%, #0e0e12 70%); }
  .fz-player.beat .fz-vinyl-wrap { transform: scale(1.025); }
  .fz-vinyl-wrap { position: relative; width: 224px; height: 224px; margin: 8px auto 16px; transition: transform .12s ease-out; }
  .fz-vinyl { width: 100%; height: 100%; border-radius: 50%; background: repeating-radial-gradient(circle at 50% 50%, #1d1d25 0 1.5px, #0a0a0e 1.5px 4px); border: 3px solid #000; box-shadow: 0 0 0 3px var(--lime), 0 14px 34px rgba(0,0,0,.6); display: grid; place-items: center; position: relative; animation: spin 3.4s linear infinite; animation-play-state: paused; }
  .fz-vinyl::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 30deg, transparent 0 12%, rgba(255,255,255,.14) 16%, transparent 22% 62%, rgba(255,255,255,.1) 66%, transparent 72%); }
  .fz-player.playing .fz-vinyl { animation-play-state: running; }
  .fz-label { width: 44%; height: 44%; border-radius: 50%; border: 3px solid #000; display: grid; place-items: center; font-size: 46px; background: var(--art); position: relative; z-index: 1; }
  .fz-label::after { content: ""; position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #0e0e12; border: 2px solid #fff; }
  .fz-label .emo { transform: translateY(-14px) scale(.8); }
  .fz-arm { position: absolute; top: -8px; right: -2px; width: 14px; height: 128px; border-radius: 7px; background: linear-gradient(90deg, #ddd, #fff, #bbb); border: 2.5px solid #000; transform-origin: 50% 8px; transform: rotate(-14deg); transition: transform .7s var(--spring); z-index: 2; }
  .fz-arm::before { content: ""; position: absolute; top: -6px; left: 50%; width: 26px; height: 26px; margin-left: -13px; border-radius: 50%; background: var(--pink); border: 2.5px solid #000; }
  .fz-arm::after { content: ""; position: absolute; bottom: -10px; left: 50%; width: 20px; height: 22px; margin-left: -10px; border-radius: 5px; background: var(--yellow); border: 2.5px solid #000; }
  .fz-player.playing .fz-arm { transform: rotate(19deg); }
  .fz-np-title { font-family: var(--font-display); font-size: 21px; line-height: 1.1; min-height: 46px; display: flex; align-items: center; justify-content: center; }
  .fz-np-artist { color: #c9c3e0; font-weight: 800; font-size: 13px; margin-top: 4px; }
  .fz-eq { display: flex; gap: 4px; height: 54px; align-items: flex-end; justify-content: center; margin: 14px 0 10px; }
  .fz-eq i { width: 9px; height: 100%; border-radius: 5px; border: 2px solid #000; transform-origin: 50% 100%; transform: scaleY(.08); transition: transform .08s linear; }
  .fz-prog { height: 10px; border-radius: 999px; background: #2b2836; border: 2px solid #000; overflow: hidden; }
  .fz-prog i { display: block; height: 100%; width: 0; background: var(--holo); background-size: 300% 100%; animation: holo 4s linear infinite; }
  .fz-times { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #9c97b4; margin-top: 6px; font-variant-numeric: tabular-nums; }
  .fz-ctrls { display: flex; align-items: center; justify-content: center; gap: 22px; margin-top: 12px; }
  .fz-ctrls .icon-btn { background: #fff; color: var(--ink); }
  .fz-pp-btn { width: 82px; height: 82px; border-radius: 50%; background: var(--lime); border: 3px solid #000; box-shadow: 0 5px 0 #000, 0 0 0 4px rgba(198,255,77,.25); display: grid; place-items: center; transition: transform .18s var(--spring), box-shadow .18s; }
  .fz-pp-btn:active { transform: translateY(4px) scale(.94); box-shadow: 0 1px 0 #000; }
  .fz-player.playing .fz-pp-btn { animation: pulse 1.41s ease-in-out infinite; }
  .fz-pp { position: relative; width: 30px; height: 32px; }
  .fz-pp i { position: absolute; inset: 0; background: #0e0e12; transition: clip-path .32s cubic-bezier(.5,0,.2,1); }
  .fz-pp i:first-child { clip-path: polygon(8% 0, 54% 25%, 54% 75%, 8% 100%); }
  .fz-pp i:last-child { clip-path: polygon(54% 25%, 100% 50%, 100% 50%, 54% 75%); }
  .fz-player.playing .fz-pp i:first-child { clip-path: polygon(5% 0, 38% 0, 38% 100%, 5% 100%); }
  .fz-player.playing .fz-pp i:last-child { clip-path: polygon(62% 0, 95% 0, 95% 100%, 62% 100%); }
  .fz-trk { cursor: pointer; }
  .fz-trk .ic { background: var(--art); font-size: 24px; }
  .fz-trk.on .tx b { color: var(--violet); }
  .fz-mini-eq { display: none; gap: 2px; align-items: flex-end; height: 16px; margin-left: 6px; }
  .fz-trk.on .fz-mini-eq { display: inline-flex; }
  .fz-mini-eq i { width: 3px; background: var(--violet); border-radius: 2px; animation: fz-meq .7s ease-in-out infinite alternate; }
  .fz-mini-eq i:nth-child(2) { animation-delay: -.3s; } .fz-mini-eq i:nth-child(3) { animation-delay: -.5s; }
  .fz-mini-eq.paused i { animation-play-state: paused; }
  @keyframes fz-meq { from { height: 3px; } to { height: 16px; } }
  .fz-heart { font-size: 24px; width: 42px; height: 42px; display: grid; place-items: center; transition: transform .3s var(--spring); filter: grayscale(1); opacity: .45; }
  .fz-heart.on { filter: none; opacity: 1; transform: scale(1.15); }
  .fz-listeners { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; background: rgba(255,255,255,.1); border: 1.5px solid rgba(255,255,255,.25); padding: 5px 10px; border-radius: 999px; }
  .fz-listeners b { width: 8px; height: 8px; border-radius: 50%; background: #ff3b3b; animation: pulse 1s infinite; }

  /* GAMES */
  .fz-gcard { display: flex; align-items: center; gap: 14px; text-align: left; width: 100%; min-height: 128px; border-radius: 30px; }
  .fz-gcard .e { font-size: 70px; flex: 0 0 auto; }
  .fz-gcard .display { font-size: 25px; }
  .fz-gcard p { font-size: 13px; font-weight: 700; margin-top: 4px; }
  .fz-arena { position: relative; height: min(62vh, 470px); min-height: 360px; border: var(--line); border-radius: 30px; overflow: hidden; background: linear-gradient(180deg, #8fd8ff 0%, #d9c8ff 70%, #ffd6f0 100%); box-shadow: var(--shadow); touch-action: none; }
  .fz-arena::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.55) 2px, transparent 2.5px); background-size: 26px 26px; opacity: .6; }
  .fz-item { position: absolute; left: 0; top: 0; width: 60px; height: 60px; margin: -30px 0 0 -30px; display: grid; place-items: center; font-size: 42px; will-change: transform; cursor: pointer; }
  .fz-item.credit { font-size: 0; }
  .fz-item.credit span { font-size: 10px; font-weight: 900; background: #ff3b3b; color: #fff; border: 2.5px solid var(--ink); border-radius: 8px; padding: 8px 6px; transform: rotate(-10deg); box-shadow: 0 3px 0 var(--ink); letter-spacing: .5px; }
  .fz-hud { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: center; z-index: 5; pointer-events: none; gap: 6px; }
  .fz-hud .badge { font-size: 14px; padding: 6px 12px; background: #fff; box-shadow: 0 2px 0 var(--ink); }
  .fz-hud .fz-combo { background: var(--pink); transition: transform .2s var(--spring); }
  .fz-hud .fz-combo.hot { background: var(--orange); transform: scale(1.15) rotate(-4deg); }
  .fz-tbar { position: absolute; left: 10px; right: 10px; bottom: 10px; height: 12px; border: 2px solid var(--ink); border-radius: 999px; background: #fff; overflow: hidden; z-index: 5; }
  .fz-tbar i { display: block; height: 100%; width: 100%; background: var(--lime); transform-origin: 0 50%; }
  .fz-tbar.low i { background: #ff3b3b; }
  .fz-over { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; padding: 20px; background: rgba(255,251,239,.86); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 7; }
  .fz-count { font-family: var(--font-display); font-size: 130px; line-height: 1; animation: fz-cpop .9s var(--spring) both; -webkit-text-stroke: 3px var(--ink); color: var(--yellow); }
  @keyframes fz-cpop { 0% { transform: scale(2.4) rotate(-20deg); opacity: 0; } 40% { transform: scale(1) rotate(4deg); opacity: 1; } 100% { transform: scale(.9); opacity: .9; } }
  .fz-arena.flash { animation: fz-flash .35s ease; }
  @keyframes fz-flash { 0% { box-shadow: inset 0 0 0 0 #ff3b3b, var(--shadow); } 30% { box-shadow: inset 0 0 0 14px #ff3b3b, var(--shadow); } 100% { box-shadow: inset 0 0 0 0 #ff3b3b, var(--shadow); } }
  .fz-scratch { position: relative; height: 270px; border: var(--line); border-radius: 30px; overflow: hidden; box-shadow: var(--shadow); }
  .fz-prize { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; gap: 6px; }
  .fz-prize .e { font-size: 78px; }
  .fz-prize .display { font-size: 26px; }
  .fz-scratch canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; transition: opacity .7s ease, transform .7s var(--spring); cursor: grab; }
  .fz-scratch canvas.gone { opacity: 0; transform: scale(1.15) rotate(4deg); pointer-events: none; }
  .fz-scratch.won .fz-prize .e { animation: jelly .7s var(--spring), float 3s 0.7s ease-in-out infinite; }

  /* INVEST */
  .fz-inv-top { border-radius: 32px; padding: 18px 16px 8px; }
  .fz-inv-top .big-num { font-size: 44px; margin-top: 4px; transition: color .3s; }
  .fz-inv-top .big-num.flash-up { color: #12a150; } .fz-inv-top .big-num.flash-down { color: #e5333d; }
  .fz-chart { position: relative; height: 196px; margin: 8px -6px 0; touch-action: pan-y; }
  .fz-chart svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .fz-line { fill: none; stroke: var(--ink); stroke-width: 3.5; stroke-linejoin: round; stroke-linecap: round; }
  .fz-line.draw { transition: stroke-dashoffset 1.3s cubic-bezier(.6,0,.2,1); }
  .fz-area { transition: opacity .8s ease .5s; }
  .fz-enddot { transform-box: fill-box; transform-origin: center; animation: pulse 1.2s ease-in-out infinite; }
  .fz-scrub { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--ink); pointer-events: none; opacity: 0; }
  .fz-scrub b { position: absolute; top: -6px; left: 50%; transform: translateX(-50%); background: var(--ink); color: #fff; font-size: 12px; font-weight: 800; padding: 4px 8px; border-radius: 10px; white-space: nowrap; }
  .fz-asset .spark { width: 62px; height: 28px; flex: 0 0 auto; }
  .fz-asset .amt { text-align: right; min-width: 78px; }
  .fz-asset .amt small { display: block; font-size: 11px; font-weight: 800; }
  .fz-asset .amt.tick { animation: jelly .5s var(--spring); }
  .fz-amts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
  .fz-amts .chip { justify-content: center; padding: 0 6px; height: 46px; font-size: 13px; }
  .fz-amts .chip.on { background: var(--lime); color: var(--ink); box-shadow: var(--shadow-sm); }

  /* WHEEL */
  .fz-wheel-box { position: relative; padding: 30px 0 18px; border-radius: 34px; overflow: hidden; }
  .fz-wheel-wrap { position: relative; width: min(310px, 82vw); aspect-ratio: 1 / 1; margin: 0 auto; }
  .fz-wheel { position: absolute; inset: 14px; border-radius: 50%; will-change: transform; }
  .fz-wheel svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .fz-rim { position: absolute; inset: 0; border-radius: 50%; background: var(--ink); box-shadow: 0 7px 0 rgba(0,0,0,.35); }
  .fz-bulb { position: absolute; width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; border-radius: 50%; background: #fff6b0; box-shadow: 0 0 8px #ffe14d; animation: fz-bulb 1s steps(1) infinite; }
  .fz-bulb.alt { animation-delay: -.5s; }
  .fz-wheel-box.spinning .fz-bulb { animation-duration: .22s; }
  @keyframes fz-bulb { 50% { background: #5b4a1a; box-shadow: none; } }
  .fz-pointer { position: absolute; top: -18px; left: 50%; width: 46px; height: 58px; margin-left: -23px; z-index: 4; transform-origin: 50% 12px; filter: drop-shadow(0 3px 0 rgba(0,0,0,.4)); }
  .fz-hub { position: absolute; left: 50%; top: 50%; width: 78px; height: 78px; margin: -39px 0 0 -39px; border-radius: 50%; background: #fff; border: 3px solid var(--ink); display: grid; place-items: center; z-index: 3; box-shadow: 0 4px 0 var(--ink); }
  .fz-hub .zabotik { width: 56px; height: 56px; }
  .fz-spin-btn { position: relative; overflow: hidden; }
  .fz-spin-btn::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent); transform: skewX(-20deg); animation: fz-shine 2.2s ease-in-out infinite; }
  @keyframes fz-shine { 60%, 100% { left: 130%; } }
  .fz-log { display: flex; gap: 8px; flex-wrap: wrap; }

  /* STORIES */
  .fz-st { position: fixed; top: 0; bottom: 0; left: 50%; width: 100%; max-width: 480px; transform: translateX(-50%); z-index: 250; background: #0e0e12; overflow: hidden; perspective: 1100px; touch-action: none; animation: fz-st-in .45s var(--spring) both; }
  .fz-st.out { animation: fz-st-out .3s ease both; }
  @keyframes fz-st-in { from { transform: translateX(-50%) scale(.6); opacity: 0; border-radius: 40px; } }
  @keyframes fz-st-out { to { transform: translateX(-50%) translateY(30%) scale(.7); opacity: 0; } }
  .fz-st-card { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden; }
  .fz-st-slide { position: absolute; inset: 0; display: flex; flex-direction: column; padding: calc(var(--safe-top) + 84px) 22px calc(var(--safe-bottom) + 26px); transition: opacity .3s ease; }
  .fz-st-slide.enter > * { animation: pop-in .55s var(--spring) both; }
  .fz-st-slide.enter > *:nth-child(2) { animation-delay: .06s; } .fz-st-slide.enter > *:nth-child(3) { animation-delay: .12s; } .fz-st-slide.enter > *:nth-child(4) { animation-delay: .18s; }
  .fz-st-kicker { align-self: flex-start; transform: rotate(-4deg); font-size: 13px; padding: 6px 12px; box-shadow: var(--shadow-sm); }
  .fz-st-title { font-family: var(--font-display); font-size: clamp(36px, 11.5vw, 52px); line-height: .98; letter-spacing: -1px; margin-top: 16px; position: relative; z-index: 2; }
  .fz-st-text { font-size: 17px; font-weight: 800; margin-top: 14px; line-height: 1.3; max-width: 88%; position: relative; z-index: 2; }
  .fz-st-hero { position: absolute; right: -10px; bottom: 120px; font-size: 170px; z-index: 1; pointer-events: none; }
  .fz-st-sm { position: absolute; font-size: 42px; z-index: 1; pointer-events: none; }
  .fz-st-cta { margin-top: auto; position: relative; z-index: 3; }
  .fz-st-top { position: absolute; top: calc(var(--safe-top) + 10px); left: 10px; right: 10px; z-index: 6; transition: opacity .25s; }
  .fz-st.held .fz-st-top { opacity: 0; }
  .fz-st-bars { display: flex; gap: 4px; }
  .fz-st-bars i { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,.55); border: 1.5px solid var(--ink); overflow: hidden; }
  .fz-st-bars i b { display: block; height: 100%; width: 0; background: var(--ink); }
  .fz-st-head { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .fz-st-ava { width: 40px; height: 40px; border-radius: 50%; border: 2.5px solid var(--ink); background: #fff; display: grid; place-items: center; font-size: 22px; }
  .fz-st-name { flex: 1; font-weight: 900; font-size: 15px; line-height: 1.1; }
  .fz-st-name small { display: block; font-size: 11px; font-weight: 800; opacity: .7; }
  .fz-st-x { width: 40px; height: 40px; border-radius: 50%; border: 2.5px solid var(--ink); background: #fff; font-size: 18px; font-weight: 900; display: grid; place-items: center; box-shadow: 0 2px 0 var(--ink); }
  .fz-st-pause { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); font-size: 54px; z-index: 7; opacity: 0; transition: opacity .2s; pointer-events: none; }
  .fz-st.held .fz-st-pause { opacity: .85; }
  `;
  if (!document.getElementById("fz-style")) {
    const st = document.createElement("style");
    st.id = "fz-style"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ============================================================
     1. VIBE MAPS — такси с живым сёрджем
     ============================================================ */
  const ME = { x: 180, y: 250 };
  const DESTS = {
    home: { t: "Домой", e: "🏠", x: 300, y: 60, d: "M180 250 H300 V60", m: 1, addr: "ул. Ипотечная, 25, кв. 25 (ещё 25 лет)" },
    work: { t: "Работа", e: "💼", x: 40, y: 160, d: "M180 250 V160 H40", m: 1.35, addr: "БЦ «Синергия», опенспейс, место у принтера" },
    good: { t: "Туда, где хорошо", e: "🌴", x: 300, y: 382, d: "M180 250 H300 V382", m: 2.4, addr: "Где нас нет. Уточняется" },
  };
  const APPROACH = "M40 60 H120 V160 H180 V250";
  const TARIFFS = [
    { e: "🚗", n: "Эконом", eta: "3 мин", note: "Кондиционер — опция", base: 390 },
    { e: "🚙", n: "Комфорт", eta: "5 мин", note: "Молчание за 49 ₽", base: 590 },
    { e: "🪩", n: "Вайб", eta: "7 мин", note: "Неон, бас и пенка", base: 890, neon: true },
    { e: "🚘", n: "Бизнес", eta: "9 мин", note: "Вода и лёгкий снобизм", base: 1490 },
    { e: "🚶", n: "Сам дойду", eta: "47 мин", note: "Кардио бесплатно", base: 0 },
  ];
  const DRIVERS = [
    { n: "Рустам", ava: "🧔🏻", car: "Лада Вайбина · жёлтая", plate: "В 777 ИБ", reg: "77", r: "4,98", perks: ["Знает короткий путь (длинный)", "Шансон по запросу"] },
    { n: "Валерий", ava: "👨🏼‍🦳", car: "Кия Чилл · белая", plate: "А 404 НЕ", reg: "99", r: "4,97", perks: ["Молчит, если попросить", "Зарядка Type-C"] },
    { n: "Алина", ava: "👩🏻‍🦰", car: "Тесля, но не та · синяя", plate: "М 001 ВБ", reg: "777", r: "5,00", perks: ["Ароматизатор «Вайб»", "Подкаст про крипту"] },
    { n: "Гоша", ava: "🧑🏽", car: "Солярис Про Макс · серый", plate: "О 123 КК", reg: "197", r: "4,91", perks: ["Едет как в последний раз", "Водичка — 89 ₽"] },
  ];
  const SEARCH_LINES = ["Уговариваем водителя…", "Водитель доедает шаурму…", "Сравниваем ваш рейтинг с его…", "Повышаем спрос вручную…", "Ищем ближайшего (в 7 км)…", "Почти нашли. Честно."];
  const RIDE_LINES = ["Водитель включил шансон 🎶", "Объезжаем пробку через другую пробку 🚦", "Ароматизатор «Новая машина 2009» 🌲", "Водитель рассказывает про крипту 📈", "Едем по навигатору. Почти 🧭", "Окно не закрывается. Это фича 🌬️"];

  function mapSvg() {
    const xs = [[-30, 28], [52, 108], [132, 168], [192, 288], [312, 390]];
    const ys = [[-30, 48], [72, 148], [172, 238], [262, 290], [352, 430]];
    const cols = ["#ff6bcb", "#ffe14d", "#d9c8ff", "#7cf5c8", "#8fd8ff", "#ff8a8a", "#ffffff", "#ffb547"];
    let blocks = "", n = 0;
    xs.forEach(([x1, x2], i) => ys.forEach(([y1, y2], j) => {
      if (i === 3 && j === 2) return; // парк
      const c = cols[(i * 3 + j * 5 + n++) % cols.length];
      blocks += `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="11" fill="${c}" stroke="#0e0e12" stroke-width="2.2"/>`;
      if ((i + j) % 2 === 0 && x2 - x1 > 40 && y2 - y1 > 40) blocks += `<rect x="${x1 + 9}" y="${y1 + 9}" width="${(x2 - x1) / 3}" height="${(y2 - y1) / 3}" rx="5" fill="#fff" opacity=".55"/>`;
    }));
    const roads = "M-20 60 H380 M-20 160 H380 M-20 250 H380 M40 -20 V420 M120 -20 V420 M180 -20 V420 M300 -20 V420";
    return `
    <svg viewBox="0 0 360 400" preserveAspectRatio="xMidYMid slice" aria-label="Карта">
      <rect x="-40" y="-40" width="440" height="480" fill="#f6efdb"/>
      ${blocks}
      <rect x="192" y="172" width="96" height="66" rx="18" fill="#c6ff4d" stroke="#0e0e12" stroke-width="2.5"/>
      <text x="212" y="200" font-size="18">🌳</text><text x="246" y="194" font-size="15">🌳</text><text x="258" y="226" font-size="18">🌲</text><text x="222" y="230" font-size="13">🌼</text>
      <path d="M-20 296 C 50 276, 90 344, 160 330 S 280 292, 380 334" fill="none" stroke="#0e0e12" stroke-width="34" stroke-linecap="round"/>
      <path d="M-20 296 C 50 276, 90 344, 160 330 S 280 292, 380 334" fill="none" stroke="#8fd8ff" stroke-width="28" stroke-linecap="round"/>
      <path d="M10 292 C 50 282, 80 330, 150 322" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="10 14" opacity=".8"/>
      <text x="70" y="318" font-size="14">🦆</text><text x="232" y="312" font-size="13">⛵</text>
      <path d="${roads}" fill="none" stroke="#0e0e12" stroke-width="17"/>
      <path d="${roads}" fill="none" stroke="#ffffff" stroke-width="12"/>
      <path d="${roads}" fill="none" stroke="#ffe14d" stroke-width="1.6" stroke-dasharray="7 8"/>
      <g font-family="Manrope, sans-serif" font-weight="800" font-size="8.5" fill="#0e0e12">
        <text x="196" y="186">Парк Кэшбека</text>
        <text x="58" y="104">ТЦ «Вайб Молл»</text>
        <text x="200" y="285" transform="rotate(-6 200 285)">р. Вайбовка</text>
        <text x="314" y="120">Банк</text>
      </g>
      <text x="80" y="128" font-size="20">🛍️</text><text x="318" y="140" font-size="18">🏦</text><text x="140" y="208" font-size="18">☕</text><text x="60" y="210" font-size="18">🏢</text>
      <path id="fzAmb1" d="M40 60 H300 V250 H40 Z" fill="none"/>
      <path id="fzAmb2" d="M120 420 V-20" fill="none"/>
      <path id="fzAmb3" d="M380 160 H-20" fill="none"/>
      <g class="fz-amb" data-p="fzAmb1"><text font-size="20" text-anchor="middle" dominant-baseline="central">🚙</text></g>
      <g class="fz-amb" data-p="fzAmb2"><text font-size="18" text-anchor="middle" dominant-baseline="central">🛵</text></g>
      <g class="fz-amb" data-p="fzAmb3"><text font-size="20" text-anchor="middle" dominant-baseline="central">🚌</text></g>
      <path id="fzMeasure" d="${APPROACH}" fill="none" stroke="none"/>
      <path id="fzRouteG" class="fz-route-glow" d="" style="opacity:0"/>
      <path id="fzRoute" class="fz-route" d="" style="opacity:0"/>
      <g class="fz-radar" id="fzRadar" transform="translate(${ME.x} ${ME.y})" style="display:none">
        <circle r="18" fill="rgba(139,92,255,.3)" stroke="#8b5cff" stroke-width="2"/><circle r="18" fill="rgba(139,92,255,.3)" stroke="#8b5cff" stroke-width="2"/><circle r="18" fill="rgba(139,92,255,.3)" stroke="#8b5cff" stroke-width="2"/>
      </g>
      <g id="fzMe" transform="translate(${ME.x} ${ME.y})">
        <circle class="fz-me-ring" r="12" fill="#3d7bff"/>
        <circle r="15" fill="#fff" stroke="#0e0e12" stroke-width="2.5"/>
        <circle r="9" fill="#3d7bff"/>
        <g transform="translate(0 -26)"><rect x="-13" y="-10" width="26" height="17" rx="8" fill="#0e0e12"/><text y="2" font-size="9" fill="#fff" text-anchor="middle" font-family="Manrope" font-weight="800">Ты</text></g>
      </g>
      <g id="fzDest" transform="translate(300 60)">
        <g class="fz-pinb">
          <ellipse cx="0" cy="1" rx="9" ry="3" fill="rgba(0,0,0,.25)"/>
          <path d="M0 0 C -12 -16 -17 -21 -17 -31 A17 17 0 1 1 17 -31 C17 -21 12 -16 0 0Z" fill="#ff6bcb" stroke="#0e0e12" stroke-width="2.5"/>
          <circle cy="-31" r="11" fill="#fff" stroke="#0e0e12" stroke-width="2"/>
          <text id="fzDestE" y="-30" font-size="13" text-anchor="middle" dominant-baseline="central">🏠</text>
        </g>
      </g>
      <g id="fzCar" opacity="0"><text font-size="30" text-anchor="middle" dominant-baseline="central">🚕</text></g>
    </svg>`;
  }

  Vibe.screen("maps", {
    render() {
      return `
        ${Vibe.ui.head("Vibe Maps", "такси за 3 мин (обычно за 47)", Vibe.ui.vibikiPill())}
        <div class="fz-map" data-map>
          ${mapSvg()}
          <div class="fz-map-tag badge" style="top:12px;left:12px;background:#fff;font-size:12px;padding:6px 10px">☀️ +18° · вайбово</div>
          <button class="fz-map-tag icon-btn" data-act="locate" style="top:10px;right:10px;width:42px;height:42px;font-size:18px" aria-label="Где я">🧭</button>
          <div class="fz-map-tag sticker" style="left:12px;bottom:52px;background:#ff3b3b;color:#fff;font-size:12px">Пробки: 9 баллов 🔥</div>
        </div>
        <div class="card fz-panel" data-panel></div>
        <div class="fine" style="text-align:center">Стоимость поездки может измениться в любую сторону, но обычно вверх. Повышенный спрос создаётся вашим интересом.</div>`;
    },
    mount(root) {
      const sc = scope();
      const svg = root.querySelector("svg");
      const $ = (id) => svg.querySelector("#" + id);
      const panel = root.querySelector("[data-panel]");
      const measure = $("fzMeasure"), route = $("fzRoute"), routeG = $("fzRouteG"), car = $("fzCar"), carTxt = car.querySelector("text");
      const st = { phase: "pick", dest: "home", tar: 1, surge: TARIFFS.map(() => 1), driver: null, price: 0, rated: 0, tipped: false, run: 0, sgen: 0 };

      const price = (i) => {
        const t = TARIFFS[i]; if (!t.base) return 0;
        return Math.round((t.base * DESTS[st.dest].m * st.surge[i]) / 10) * 10 - 1;
      };
      const toScreen = (x, y) => {
        const m = svg.getScreenCTM(); if (!m) return { x: innerWidth / 2, y: 200 };
        const p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(m);
        return { x: q.x, y: q.y };
      };

      // Маршрут: рисуется «сам» через dashoffset
      function showRoute(d, color = "var(--violet)") {
        [routeG, route].forEach((p) => {
          p.setAttribute("d", d);
          const len = p.getTotalLength();
          p.style.transition = "none";
          p.style.strokeDasharray = `${len} ${len}`;
          p.style.strokeDashoffset = len;
          p.style.opacity = 1;
          void p.getBoundingClientRect();
          p.style.transition = "";
          p.style.strokeDashoffset = 0;
        });
        route.style.stroke = color;
      }
      const hideRoute = () => { route.style.opacity = 0; routeG.style.opacity = 0; };

      function setDest(key) {
        st.dest = key;
        const D = DESTS[key];
        const g = $("fzDest");
        g.setAttribute("transform", `translate(${D.x} ${D.y})`);
        $("fzDestE").textContent = D.e;
        const pin = g.querySelector(".fz-pinb");
        pin.style.animation = "none"; void pin.getBoundingClientRect(); pin.style.animation = "";
        showRoute(D.d);
        const p = toScreen(D.x, D.y - 30);
        FX.burst(p, { emojis: [D.e, "✨", "📍"], count: 8, spread: 70 });
      }

      // Проезд по маршруту
      function drive(d, dur, emoji, onStep, onDone) {
        measure.setAttribute("d", d);
        const len = measure.getTotalLength();
        carTxt.textContent = emoji;
        car.setAttribute("opacity", 1);
        route.style.transition = "none"; routeG.style.transition = "none";
        let lastX = null, sx = 1;
        const t0 = performance.now(), run = st.run;
        (function step(t) {
          if (run !== st.run) return;
          const k = Math.min(1, (t - t0) / dur);
          const e = easeInOut(k);
          const p = measure.getPointAtLength(e * len);
          if (lastX !== null && Math.abs(p.x - lastX) > 0.05) sx = p.x > lastX ? -1 : 1;
          lastX = p.x;
          car.setAttribute("transform", `translate(${p.x} ${p.y - 6}) scale(${sx} 1)`);
          route.style.strokeDashoffset = -e * len; routeG.style.strokeDashoffset = -e * len;
          onStep && onStep(k);
          if (k < 1) sc.raf(step); else { route.style.transition = ""; routeG.style.transition = ""; onDone && onDone(); }
        })(t0);
      }

      // Фоновые машинки
      const ambs = [...svg.querySelectorAll(".fz-amb")].map((g, i) => ({ g, p: $(g.dataset.p), off: i * 0.33, speed: [0.045, 0.07, 0.05][i], lastX: null, sx: 1 }));
      ambs.forEach((a) => (a.len = a.p.getTotalLength()));
      (function amb(t) {
        ambs.forEach((a) => {
          const k = ((t / 1000) * a.speed + a.off) % 1;
          const p = a.p.getPointAtLength(k * a.len);
          if (a.lastX !== null && Math.abs(p.x - a.lastX) > 0.05) a.sx = p.x > a.lastX ? -1 : 1;
          a.lastX = p.x;
          a.g.setAttribute("transform", `translate(${p.x} ${p.y - 4}) scale(${a.sx} 1)`);
        });
        sc.raf(amb);
      })(performance.now());

      /* ----- Панель по фазам ----- */
      function render() {
        const D = DESTS[st.dest];
        const T = TARIFFS[st.tar];
        $("fzRadar").style.display = st.phase === "search" ? "" : "none";
        $("fzMe").style.display = st.phase === "ride" || st.phase === "walk" ? "none" : "";
        if (st.phase === "pick") {
          panel.innerHTML = `
            <div class="fz-between"><div class="display" style="font-size:28px">Куда едем?</div><span class="emo wobble" style="font-size:34px">🚕</span></div>
            <div class="fz-dest" style="margin-top:12px"><span class="dot"></span><div style="min-width:0"><small class="muted" style="font-size:11px;display:block">Откуда</small>ул. Вайбовая, 7 (это ты)</div></div>
            <div class="fz-dest" style="margin-top:8px"><span class="dot" style="background:var(--pink);border-radius:5px"></span><div style="min-width:0;flex:1"><small class="muted" style="font-size:11px;display:block">Куда</small><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${D.addr}</span></div></div>
            <div class="chips" style="margin-top:10px">
              ${Object.entries(DESTS).map(([k, v]) => `<button class="chip fz-chip-dest ${k === st.dest ? "on" : ""}" data-dest="${k}">${v.e} ${v.t}</button>`).join("")}
            </div>
            <div class="hscroll fz-tars">
              ${TARIFFS.map((t, i) => `
                <button class="fz-tar ${t.neon ? "neon" : ""} ${i === st.tar ? "on" : ""}" data-tar="${i}">
                  <span class="badge surge">⚡ ×${st.surge[i].toFixed(1).replace(".", ",")}</span>
                  <span class="e emo ${i === st.tar ? "wobble" : ""}">${t.e}</span>
                  <b>${t.n}</b><small>${t.eta} · ${t.note}</small>
                  <span class="pr" data-pr="${i}">${Vibe.rub(price(i))}</span>
                </button>`).join("")}
            </div>
            <div class="fz-surge-bar" data-surgebar style="display:${st.surge.some((s) => s > 1.001) ? "flex" : "none"}"><span class="emo">⚡</span><span>Повышенный спрос. Цены растут, пока вы думаете</span></div>
            <button class="btn black xl block" data-act="order" style="margin-top:14px">${st.tar === 4 ? "Пойти пешком 🚶" : `Заказать ${T.n} · <span data-oprice>${Vibe.rub(price(st.tar))}</span>`}</button>`;
          panel.querySelectorAll(".fz-tar").forEach((el, i) => el.classList.toggle("surging", st.surge[i] > 1.001));
        } else if (st.phase === "search") {
          panel.innerHTML = `
            <div style="text-align:center;padding:6px 0">
              <div class="emo wobble" style="font-size:64px">📡</div>
              <div class="display" style="font-size:28px;margin-top:6px">Ищем водителя</div>
              <div class="fz-dots" style="margin:10px 0"><span></span><span></span><span></span></div>
              <div class="fz-search-txt" data-stxt>${SEARCH_LINES[0]}</div>
              <div class="badge" style="margin-top:10px;background:var(--yellow)">${T.e} ${T.n} · ${Vibe.rub(st.price)} · цена зафиксирована*</div>
              <button class="btn block" data-act="cancel" style="margin-top:14px">Отменить поиск</button>
              <div class="fine">*на 0,5 секунды</div>
            </div>`;
        } else if (st.phase === "found" || st.phase === "arrived") {
          const d = st.driver;
          const arrived = st.phase === "arrived";
          panel.innerHTML = `
            <div class="fz-between">
              <div class="display" style="font-size:24px">${arrived ? "Водитель на месте! 🚖" : "Водитель найден!"}</div>
              <span class="timer-pill" data-eta>${arrived ? "0:59" : "0:05"}</span>
            </div>
            <div class="fz-row" style="margin-top:14px">
              <div class="fz-driver-ava c-yellow emo">${d.ava}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:900;font-size:18px">${d.n} <span class="badge" style="background:var(--yellow);vertical-align:3px">⭐ ${d.r}</span></div>
                <div class="muted" style="font-weight:800;font-size:13px;margin:3px 0 6px">${d.car}</div>
                <span class="fz-plate">${d.plate}<i>${d.reg} RUS</i></span>
              </div>
              <span class="emo float" style="font-size:44px">🚕</span>
            </div>
            <div class="fz-row" style="flex-wrap:wrap;gap:6px;margin-top:12px">${d.perks.map((p, i) => `<span class="badge" style="background:${i ? "var(--sky)" : "var(--lilac)"}">${p}</span>`).join("")}</div>
            ${arrived ? `<div class="fz-surge-bar" style="background:var(--yellow);color:var(--ink)"><span class="emo">⏳</span><span>Бесплатное ожидание закончится через <b data-wait>59</b> сек</span></div>` : ""}
            <div class="grid2" style="margin-top:14px;grid-template-columns:auto auto 1fr">
              <button class="icon-btn" data-act="call" aria-label="Позвонить">📞</button>
              <button class="icon-btn" data-act="msg" aria-label="Написать">💬</button>
              ${arrived ? `<button class="btn lime block" data-act="go">Поехали! 🚀</button>` : `<button class="btn block" data-act="cancel">Отменить</button>`}
            </div>`;
        } else if (st.phase === "ride" || st.phase === "walk") {
          const walk = st.phase === "walk";
          panel.innerHTML = `
            <div class="fz-between"><div class="display" style="font-size:26px">${walk ? "Идём пешком" : "В пути"} ${walk ? "🚶" : "🛣️"}</div><span class="timer-pill" data-eta>${walk ? "47 мин" : "12 мин"}</span></div>
            <div class="muted" style="font-weight:800;font-size:13px;margin:4px 0 12px">${D.e} ${D.t} · ${D.addr}</div>
            <div class="progress" style="height:18px"><i data-rprog style="--p:0%;transition:none"></i></div>
            <div class="card flat tight c-lilac" style="margin-top:12px;display:flex;align-items:center;gap:10px"><span class="emo wobble" style="font-size:28px">${walk ? "👟" : "📻"}</span><b data-rline style="font-size:14px">${walk ? "Ускорили прогулку в 300 раз для демонстрации" : RIDE_LINES[0]}</b></div>
            ${walk ? "" : `<button class="btn block" data-go="music" style="margin-top:12px">🎧 Включить свой вайб в Vibe Music</button>`}`;
        } else if (st.phase === "done") {
          const walk = st.tar === 4;
          panel.innerHTML = `
            <div style="text-align:center">
              <div class="emo float" style="font-size:72px">${walk ? "🏅" : "🎉"}</div>
              <div class="display" style="font-size:32px">Приехали!</div>
              <div class="big-num" style="font-size:40px;margin-top:8px">${walk ? "0 ₽" : Vibe.rub(st.price)}</div>
              <div class="muted" style="font-weight:800;font-size:13px;margin-top:4px">${walk ? "4 812 шагов · страховка не подорожала" : `${TARIFFS[st.tar].n} · ${st.driver.n} · списано с Vibe Pay`}</div>
              ${walk ? "" : `
              <div style="font-weight:900;margin-top:16px">Как вам поездка?</div>
              <div class="fz-stars" data-stars>${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" aria-label="${n} звёзд">⭐</button>`).join("")}</div>
              <div class="fz-row" style="justify-content:center;gap:8px" data-tips>
                ${[50, 100, 200].map((a) => `<button class="chip" data-tip="${a}">💸 ${a} ₽</button>`).join("")}
              </div>`}
              <button class="btn black xl block" data-act="again" style="margin-top:16px">Ещё поездка 🚕</button>
              <div class="fine">Оценка влияет на рейтинг водителя, ваш рейтинг и рейтинг вашего рейтинга.</div>
            </div>`;
        }
        panel.classList.remove("fz-popin"); void panel.offsetWidth; panel.classList.add("fz-popin");
      }

      /* ----- Сёрдж: цены живут своей жизнью ----- */
      function surgeTick(gen) {
        if (st.phase !== "pick" || gen !== st.sgen) return;
        const i = ri(0, 3);
        st.surge[i] = Math.min(2.6, st.surge[i] + rand(0.06, 0.2));
        const card = panel.querySelector(`.fz-tar[data-tar="${i}"]`);
        const pr = panel.querySelector(`[data-pr="${i}"]`);
        if (card && pr) {
          card.classList.add("surging");
          card.querySelector(".surge").textContent = `⚡ ×${st.surge[i].toFixed(1).replace(".", ",")}`;
          FX.countTo(pr, price(i), { from: parseInt(pr.textContent.replace(/\D/g, ""), 10) || 0, dur: 500, fmt: Vibe.rub });
          FX.bump(pr);
        }
        const bar = panel.querySelector("[data-surgebar]");
        if (bar) { bar.style.display = "flex"; FX.bump(bar); }
        if (i === st.tar) {
          const op = panel.querySelector("[data-oprice]");
          if (op) { op.textContent = Vibe.rub(price(i)); FX.bump(op.closest(".btn")); }
        }
        sc.to(() => surgeTick(gen), rand(2600, 4200));
      }
      sc.to(() => surgeTick(st.sgen), 2200);

      /* ----- Сценарий поездки ----- */
      function startSearch() {
        st.phase = "search"; st.price = price(st.tar);
        hideRoute(); render();
        FX.sound.whoosh();
        let k = 0;
        const lines = sc.every(() => {
          const el = panel.querySelector("[data-stxt]");
          if (el) { el.textContent = SEARCH_LINES[++k % SEARCH_LINES.length]; FX.bump(el); }
          FX.sound.tick();
        }, 900);
        st.searchT = sc.to(() => { sc.stop(lines); found(); }, 3800);
        st.searchLines = lines;
      }
      function found() {
        st.phase = "found"; st.driver = pick(DRIVERS);
        render();
        FX.sound.success(); FX.haptic([10, 40, 10]);
        FX.burst(panel.querySelector(".fz-driver-ava"), { emojis: ["⭐", "🚕", "✨"], count: 12 });
        showRoute(APPROACH, "var(--orange)");
        const dur = 5600;
        car.setAttribute("transform", `translate(40 54)`);
        drive(APPROACH, dur, "🚕", (k) => {
          const eta = panel.querySelector("[data-eta]");
          if (eta) eta.textContent = "0:0" + Math.max(0, Math.ceil((1 - k) * 5));
        }, () => {
          st.phase = "arrived"; render();
          FX.sound.levelup(); FX.haptic([20, 40, 20]);
          FX.burst(toScreen(ME.x, ME.y), { emojis: ["🚕", "💛", "✨", "🎉"], count: 16 });
          let w = 59;
          st.waitIv = sc.every(() => {
            const el = panel.querySelector("[data-wait]");
            if (!el) return;
            w = Math.max(0, w - 1); el.textContent = w;
            if (w === 0) { el.parentElement.innerHTML = "Платное ожидание: 9 ₽/мин. Шутка. Пока что."; sc.stop(st.waitIv); }
          }, 1000);
        });
      }
      function ride() {
        if (st.waitIv) sc.stop(st.waitIv);
        st.phase = "ride"; render();
        FX.sound.whoosh();
        const D = DESTS[st.dest];
        showRoute(D.d);
        let li = 0;
        const lineIv = sc.every(() => {
          const el = panel.querySelector("[data-rline]");
          if (el) { el.textContent = RIDE_LINES[++li % RIDE_LINES.length]; FX.bump(el.parentElement); FX.sound.pop(); }
        }, 2100);
        sc.to(() => drive(D.d, 8200, "🚕", (k) => {
          const p = panel.querySelector("[data-rprog]");
          if (p) p.style.setProperty("--p", Math.round(k * 100) + "%");
          const eta = panel.querySelector("[data-eta]");
          if (eta) eta.textContent = Math.max(1, Math.ceil((1 - k) * 12)) + " мин";
        }, () => { sc.stop(lineIv); arrive(); }), 500);
      }
      function walk() {
        st.phase = "walk"; render();
        const D = DESTS[st.dest];
        showRoute(D.d, "var(--lime)");
        drive(D.d, 9000, "🚶", (k) => {
          const p = panel.querySelector("[data-rprog]");
          if (p) p.style.setProperty("--p", Math.round(k * 100) + "%");
          const eta = panel.querySelector("[data-eta]");
          if (eta) eta.textContent = Math.max(1, Math.ceil((1 - k) * 47)) + " мин";
        }, () => {
          st.phase = "done"; render();
          FX.confetti(); FX.sound.levelup();
          Vibe.reward({ vibiki: 15, xp: 25, from: panel.querySelector(".big-num") });
        });
      }
      function arrive() {
        const D = DESTS[st.dest];
        const from = toScreen(D.x, D.y);
        st.phase = "done"; st.rated = 0; st.tipped = false;
        render();
        Vibe.pay(st.price, { title: `Vibe Maps · Такси «${TARIFFS[st.tar].n}»`, emoji: "🚕", col: "c-yellow", from: panel.querySelector(".big-num") });
        FX.confetti(); FX.sound.success();
        FX.burst(from, { emojis: [D.e, "🎉", "✨", "🚕"], count: 18 });
      }
      function reset() {
        st.phase = "pick"; st.surge = TARIFFS.map(() => 1);
        st.run++; st.sgen++;
        if (st.waitIv) sc.stop(st.waitIv);
        car.setAttribute("opacity", 0);
        route.style.transition = ""; routeG.style.transition = "";
        render(); setDest(st.dest);
        const g = st.sgen;
        sc.to(() => surgeTick(g), 2500);
      }

      /* ----- Клики ----- */
      sc.on(root, "click", (e) => {
        const dest = e.target.closest("[data-dest]");
        if (dest && st.phase === "pick") {
          if (dest.dataset.dest === st.dest) { FX.bump(dest); return; }
          st.dest = dest.dataset.dest; render(); setDest(st.dest); FX.sound.pop();
          return;
        }
        const tar = e.target.closest("[data-tar]");
        if (tar && st.phase === "pick") {
          const i = +tar.dataset.tar;
          panel.querySelectorAll(".fz-tar").forEach((el) => { el.classList.toggle("on", el === tar); el.querySelector(".e").classList.toggle("wobble", el === tar); });
          st.tar = i;
          const btn = panel.querySelector('[data-act="order"]');
          btn.innerHTML = i === 4 ? "Пойти пешком 🚶" : `Заказать ${TARIFFS[i].n} · <span data-oprice>${Vibe.rub(price(i))}</span>`;
          FX.bump(btn); FX.sound.add();
          FX.burst(tar, { emojis: [TARIFFS[i].e, "✨"], count: 6, spread: 60 });
          if (i === 4) FX.toast("Смелый выбор. Колени скажут спасибо", "🦵");
          if (i === 2) FX.toast("Вайб-тариф: диско-шар включён", "🪩");
          return;
        }
        const star = e.target.closest("[data-star]");
        if (star) {
          if (st.rated) { FX.bump(star); return; }
          const n = +star.dataset.star; st.rated = n;
          panel.querySelectorAll("[data-star]").forEach((s, i) => {
            sc.to(() => { s.classList.toggle("on", i < n); if (i < n) { FX.burst(s, { emojis: ["⭐", "✨"], count: 5, spread: 50 }); blip(600 + i * 140, 0.12, { vol: 0.05 }); } }, i * 90);
          });
          sc.to(() => {
            if (n === 5) { FX.confetti({ count: 80, from: star }); FX.toast(`${st.driver.n} плачет от счастья`, "🥹"); Vibe.reward({ vibiki: 10, xp: 10, from: star }); }
            else FX.toast("Спасибо! Водитель уже поставил вам 3", "🫡");
          }, n * 90 + 150);
          return;
        }
        const tip = e.target.closest("[data-tip]");
        if (tip) {
          if (st.tipped) { FX.toast("Водитель тронут. Дважды не надо", "🙏"); return; }
          const a = +tip.dataset.tip;
          if (Vibe.pay(a, { title: `Чаевые · ${st.driver.n}`, emoji: "💸", col: "c-lime", from: tip, cashback: 0.1 })) {
            st.tipped = true; tip.classList.add("on");
            FX.burst(tip, { emojis: ["💸", "💚", "🙏"], count: 12 });
          }
          return;
        }
        const act = e.target.closest("[data-act]");
        if (!act) return;
        const a = act.dataset.act;
        if (a === "locate") {
          FX.toast("Вы здесь. Всегда были здесь", "📍");
          FX.burst(toScreen(ME.x, ME.y), { emojis: ["📍", "💙"], count: 8, spread: 60 });
          FX.bump(act);
        } else if (a === "order") {
          FX.bump(act);
          if (st.tar === 4) walk(); else startSearch();
        } else if (a === "cancel") {
          if (st.searchLines) sc.stop(st.searchLines);
          if (st.searchT) sc.stop(st.searchT);
          if (st.phase === "found") { FX.toast("Отменили. Водитель уже был за углом 😢", "🚕"); }
          // отмена во время подъезда: «телепортируем» машину и сбрасываем
          st.phase = "cancelling";
          sc.to(reset, 50);
          FX.sound.error();
        } else if (a === "go") {
          ride();
        } else if (a === "call") {
          FX.toast(`${st.driver.n} за рулём и не берёт трубку. Это правильно`, "📞"); FX.bump(act);
        } else if (a === "msg") {
          FX.toast(`${st.driver.n}: «выхожу», в смысле — «подъезжаю»`, "💬"); FX.bump(act);
        } else if (a === "again") {
          reset();
        }
      });

      render();
      sc.to(() => setDest(st.dest), 350);
      return () => sc.clear();
    },
  });

  /* ============================================================
     2. VIBE MUSIC — настоящий лоу-фай на WebAudio
     ============================================================ */
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const TRACKS = [
    { id: "trevoga", t: "Лоу-фай для тревоги", a: "Заботик & Тревожный Чилл", e: "🫠", art: "linear-gradient(135deg,#8b5cff,#ff6bcb)", len: 167, bpm: 85,
      chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], bass: [41, 40, 38, 36] },
    { id: "bank", t: "Биты, чтобы не открывать банковское приложение", a: "DJ Минус Баланс", e: "💸", art: "linear-gradient(135deg,#c6ff4d,#7cf5c8)", len: 154, bpm: 82,
      chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 56, 59, 62]], bass: [45, 41, 43, 40] },
    { id: "rain", t: "Дождь за окном ипотеки", a: "Ипотечный Кот", e: "🌧️", art: "linear-gradient(135deg,#3d7bff,#8fd8ff)", len: 181, bpm: 78,
      chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 60, 64, 67]], bass: [38, 43, 36, 45] },
    { id: "friday", t: "Пятница, 18:59", a: "Офисный Призрак", e: "🏢", art: "linear-gradient(135deg,#ffb547,#ff6b2c)", len: 139, bpm: 88,
      chords: [[52, 55, 59, 62], [57, 60, 64, 67], [50, 54, 57, 60], [55, 59, 62, 66]], bass: [40, 45, 38, 43] },
    { id: "call", t: "Медитация перед созвоном с камерой", a: "Мьют Микрофон", e: "🎧", art: "linear-gradient(135deg,#d9c8ff,#ff8a8a)", len: 172, bpm: 80,
      chords: [[48, 52, 55, 59], [45, 48, 52, 55], [53, 57, 60, 64], [55, 59, 62, 65]], bass: [36, 33, 41, 43] },
    { id: "cashback", t: "Кэшбек на чувства (slowed + вайб)", a: "Лил Процент", e: "💜", art: "linear-gradient(135deg,#ff6bcb,#ffe14d)", len: 148, bpm: 84,
      chords: [[54, 57, 61, 64], [52, 56, 59, 62], [49, 52, 56, 59], [50, 54, 57, 61]], bass: [42, 40, 37, 38] },
  ];
  const PENTA = [0, 3, 5, 7, 10, 12, 15];

  function createLofi(onBeat) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    let ctx;
    try { ctx = new AC(); } catch (e) { return null; }
    const master = ctx.createGain(); master.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; lp.Q.value = 0.4;
    const an = ctx.createAnalyser(); an.fftSize = 64; an.smoothingTimeConstant = 0.72;
    master.connect(lp); lp.connect(ctx.destination); lp.connect(an);
    // «Ленточное» эхо для мелодии
    const dl = ctx.createDelay(1); dl.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const dlg = ctx.createGain(); dlg.gain.value = 0.35;
    dl.connect(fb).connect(dl); dl.connect(dlg).connect(master);
    const nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = nbuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    let track = TRACKS[0], stepIdx = 0, nextT = 0, timer = null, playing = false;
    const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };

    function pad(notes, t, dur) {
      notes.forEach((m, i) => {
        [["triangle", 0], ["sine", 7]].forEach(([type, det]) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = type; o.frequency.value = mtof(m); o.detune.value = det + (i % 2 ? -4 : 4);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(type === "sine" ? 0.022 : 0.018, t + 0.35);
          g.gain.setValueAtTime(type === "sine" ? 0.022 : 0.018, t + dur - 0.4);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
        });
      });
    }
    function bass(m, t, dur) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = mtof(m);
      env(g, t, 0.02, 0.12, dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function kick(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      env(g, t, 0.004, 0.42, 0.32); o.connect(g).connect(master); o.start(t); o.stop(t + 0.35);
    }
    function noiseHit(t, { type = "highpass", f = 7000, vol = 0.03, d = 0.05, q = 0.7 } = {}) {
      const s = ctx.createBufferSource(); s.buffer = nbuf;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = ctx.createGain(); env(g, t, 0.002, vol, d);
      s.connect(fl).connect(g).connect(master);
      s.start(t, Math.random() * 0.8); s.stop(t + d + 0.02);
    }
    function pluck(m, t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = mtof(m);
      env(g, t, 0.006, 0.05, 0.5); o.connect(g); g.connect(master); g.connect(dl);
      o.start(t); o.stop(t + 0.55);
    }

    function schedule() {
      const s16 = 60 / track.bpm / 4;
      while (nextT < ctx.currentTime + 0.15) {
        const st = stepIdx % 16, bar = Math.floor(stepIdx / 16) % 4;
        const swing = st % 2 ? s16 * 0.16 : 0;
        const t = nextT + swing;
        if (st === 0) { pad(track.chords[bar], t, s16 * 16); onBeat("bar", t, bar); }
        if (st === 0 || st === 10) bass(track.bass[bar], t, s16 * (st ? 5 : 9));
        if (st === 0 || st === 7 || st === 10) { kick(t); onBeat("kick", t); }
        if (st === 4 || st === 12) { noiseHit(t, { type: "bandpass", f: 1900, vol: 0.06, d: 0.14, q: 0.9 }); onBeat("snare", t); }
        if (st % 2 === 0) noiseHit(t, { vol: st % 4 === 2 ? 0.028 : 0.014, d: 0.04 });
        if (Math.random() < 0.12) noiseHit(t, { type: "highpass", f: 3000, vol: 0.01, d: 0.012 }); // треск винила
        if (st % 2 === 0 && Math.random() < 0.28) pluck(track.chords[bar][0] + 12 + pick(PENTA), t);
        nextT += s16; stepIdx++;
      }
    }

    return {
      an,
      get playing() { return playing; },
      play() {
        if (ctx.state === "suspended") ctx.resume();
        if (playing) return;
        playing = true;
        nextT = ctx.currentTime + 0.06; stepIdx = 0;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 0.6);
        schedule(); timer = setInterval(schedule, 25);
      },
      pause() {
        if (!playing) return;
        playing = false; clearInterval(timer); timer = null;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      },
      setTrack(tr) { track = tr; stepIdx = 0; nextT = Math.max(nextT, ctx.currentTime + 0.05); },
      now: () => ctx.currentTime,
      destroy() {
        clearInterval(timer); playing = false;
        try { master.gain.setValueAtTime(0.0001, ctx.currentTime); } catch (e) {}
        setTimeout(() => { try { ctx.close(); } catch (e) {} }, 120);
      },
    };
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const EQ_COLS = ["#ff6bcb", "#ffe14d", "#c6ff4d", "#7cf5c8", "#8fd8ff", "#8b5cff"];

  Vibe.screen("music", {
    render() {
      const s = S(), liked = s.musLikes || {};
      const cur = TRACKS[s.musTrack || 0] || TRACKS[0];
      return `
        ${Vibe.ui.head("Vibe Music", "без рекламы*, без смысла, с вайбом", Vibe.ui.vibikiPill())}
        <div class="card fz-player" data-player>
          <div class="fz-between" style="margin-bottom:4px">
            <span class="fz-listeners"><b></b><span data-listeners>12 408</span> тревожных слушают</span>
            <span class="badge" style="background:var(--lime)">${cur.bpm} BPM</span>
          </div>
          <div class="fz-vinyl-wrap">
            <div class="fz-vinyl"><div class="fz-label" data-art style="--art:${cur.art}"><span class="emo" data-arte>${cur.e}</span></div></div>
            <div class="fz-arm"></div>
          </div>
          <div class="fz-np-title" data-title>${cur.t}</div>
          <div class="fz-np-artist" data-artist>${cur.a}</div>
          <div class="fz-eq" data-eq>${Array.from({ length: 18 }, (_, i) => `<i style="background:${EQ_COLS[i % EQ_COLS.length]}"></i>`).join("")}</div>
          <div class="fz-prog"><i data-prog></i></div>
          <div class="fz-times"><span data-tcur>0:00</span><span data-tlen>${mmss(cur.len)}</span></div>
          <div class="fz-ctrls">
            <button class="icon-btn" data-act="prev" aria-label="Предыдущий">⏮</button>
            <button class="fz-pp-btn" data-act="pp" aria-label="Играть/пауза"><span class="fz-pp"><i></i><i></i></span></button>
            <button class="icon-btn" data-act="next" aria-label="Следующий">⏭</button>
          </div>
        </div>
        ${Vibe.ui.marquee(["лоу-фай для учёбы", "лоу-фай для работы", "лоу-фай для лоу-фая", "биты для дедлайна", "чилл до зарплаты"])}
        <h2 class="sec">Твой вайб-микс <small>${TRACKS.length} треков</small></h2>
        <div class="card" style="padding:4px 14px">
          <div class="stagger">
            ${TRACKS.map((t, i) => `
              <div class="li fz-trk ${i === (s.musTrack || 0) ? "on" : ""}" data-trk="${i}">
                <div class="ic" style="--art:${t.art}">${t.e}</div>
                <div class="tx"><b>${t.t}</b><small>${t.a} · ${mmss(t.len)}<span class="fz-mini-eq paused"><i></i><i></i><i></i></span></small></div>
                <button class="fz-heart ${liked[t.id] ? "on" : ""}" data-like="${t.id}" aria-label="Лайк">💜</button>
              </div>`).join("")}
          </div>
        </div>
        <div class="card c-yellow tap" data-act="podcast" style="margin-top:14px;display:flex;align-items:center;gap:12px">
          <span class="emo wobble" style="font-size:44px">🎙️</span>
          <div><b style="font-size:16px;display:block">Подкаст «Финансовая грамотность»</b><span style="font-size:13px;font-weight:700">Выпуск 48: как перестать покупать подписки. Спонсор — подписка.</span></div>
        </div>
        <div class="fine">*реклама есть, но она тоже лоу-фай. Музыка сгенерирована вашим телефоном, поэтому авторские права принадлежат вашему телефону.</div>`;
    },
    mount(root) {
      const sc = scope();
      const player = root.querySelector("[data-player]");
      const bars = [...root.querySelectorAll("[data-eq] i")];
      const vinylWrap = root.querySelector(".fz-vinyl-wrap");
      let cur = S().musTrack || 0;
      let pos = 0, last = performance.now();
      const beats = [];
      let engine = null;

      const onBeat = (type, t, bar) => beats.push({ type, t, bar });

      function setUI() {
        const t = TRACKS[cur];
        root.querySelector("[data-art]").style.setProperty("--art", t.art);
        root.querySelector("[data-arte]").textContent = t.e;
        root.querySelector("[data-title]").textContent = t.t;
        root.querySelector("[data-artist]").textContent = t.a;
        root.querySelector("[data-tlen]").textContent = mmss(t.len);
        root.querySelectorAll(".fz-trk").forEach((el, i) => el.classList.toggle("on", i === cur));
        FX.bump(root.querySelector("[data-title]"));
      }
      function setPlaying(on) {
        player.classList.toggle("playing", on);
        root.querySelectorAll(".fz-mini-eq").forEach((m) => m.classList.toggle("paused", !on));
      }
      function play() {
        if (S().sound === false) {
          FX.toast("Звук выключен в профиле. Включи — и будет вайб", "🔇", 2600);
          FX.shake(root.querySelector(".fz-pp-btn"));
          return;
        }
        if (!engine) engine = createLofi(onBeat);
        if (!engine) { FX.toast("Браузер не умеет в вайб. Обидно", "😶"); return; }
        engine.setTrack(TRACKS[cur]);
        engine.play(); setPlaying(true);
        FX.burst(root.querySelector(".fz-pp-btn"), { emojis: ["🎵", "🎶", "✨", "💜"], count: 10, spread: 90 });
      }
      function pause() { if (engine) engine.pause(); setPlaying(false); }
      function go(i) {
        cur = (i + TRACKS.length) % TRACKS.length; pos = 0;
        Vibe.state.set({ musTrack: cur });
        setUI();
        if (engine && engine.playing) engine.setTrack(TRACKS[cur]);
        else play();
      }

      // Визуал: эквалайзер из анализатора, пульс на бочку, ноты на такт
      const data = new Uint8Array(32);
      const ambient = bars.map(() => 0.08);
      (function loop(t) {
        const dt = (t - last) / 1000; last = t;
        const on = engine && engine.playing;
        if (on) {
          engine.an.getByteFrequencyData(data);
          bars.forEach((b, i) => {
            const v = data[Math.min(31, 1 + Math.floor(i * 1.3))] / 255;
            ambient[i] += (Math.max(0.06, Math.pow(v, 1.4) * 1.15) - ambient[i]) * 0.5;
            b.style.transform = `scaleY(${clamp(ambient[i], 0.06, 1)})`;
          });
          const now = engine.now();
          while (beats.length && beats[0].t <= now) {
            const b = beats.shift();
            if (b.type === "kick") { player.classList.add("beat"); setTimeout(() => player.classList.remove("beat"), 110); }
            if (b.type === "bar") {
              const r = vinylWrap.getBoundingClientRect();
              FX.burst({ x: r.left + r.width * rand(0.2, 0.8), y: r.top + 20 }, { emojis: ["🎵", "🎶", "♪"], count: 2, spread: 60, size: [18, 26] });
            }
          }
          pos += dt;
          const L = TRACKS[cur].len;
          if (pos >= L) { go(cur + 1); }
          root.querySelector("[data-prog]").style.width = (pos / L) * 100 + "%";
          root.querySelector("[data-tcur]").textContent = mmss(pos);
        } else {
          bars.forEach((b, i) => { ambient[i] += (0.07 - ambient[i]) * 0.15; b.style.transform = `scaleY(${ambient[i]})`; });
          beats.length = 0;
        }
        sc.raf(loop);
      })(performance.now());

      // «Живой» счётчик слушателей
      let listeners = 12408;
      sc.every(() => {
        listeners += ri(-14, 31);
        const el = root.querySelector("[data-listeners]");
        if (el) el.textContent = Vibe.fmt(listeners);
      }, 1800);

      sc.on(root, "click", (e) => {
        const like = e.target.closest("[data-like]");
        if (like) {
          e.stopPropagation();
          const id = like.dataset.like;
          const l = Object.assign({}, S().musLikes || {});
          l[id] = !l[id];
          Vibe.state.set({ musLikes: l });
          like.classList.toggle("on", l[id]);
          FX.bump(like);
          if (l[id]) {
            FX.sound.like(); FX.burst(like, { emojis: ["💜", "💖", "✨"], count: 10, spread: 70 });
            const cnt = Object.values(l).filter(Boolean).length;
            if (cnt === 3) { FX.toast("Алгоритм понял тебя. Теперь только лоу-фай", "🤖"); Vibe.reward({ vibiki: 15, xp: 10, from: like }); }
          }
          return;
        }
        const trk = e.target.closest("[data-trk]");
        if (trk) { FX.bump(trk.querySelector(".ic")); go(+trk.dataset.trk); return; }
        const act = e.target.closest("[data-act]");
        if (!act) return;
        const a = act.dataset.act;
        if (a === "pp") { FX.bump(act); if (engine && engine.playing) pause(); else play(); }
        else if (a === "next") { FX.bump(act); go(cur + 1); }
        else if (a === "prev") { FX.bump(act); go(pos > 3 ? cur : cur - 1); }
        else if (a === "podcast") { FX.toast("Выпуск доступен с подпиской «Плюс». Иронично", "🎙️"); }
      });

      return () => { sc.clear(); if (engine) engine.destroy(); engine = null; };
    },
  });

  /* ============================================================
     3. VIBE GAMES — «Лови вайбики» и «Скретч-карта»
     ============================================================ */
  const GOODS = [
    { e: "🪙", v: 1, w: 50 }, { e: "⭐", v: 2, w: 18 }, { e: "💜", v: 3, w: 12 }, { e: "💎", v: 5, w: 6 },
  ];
  const BADS = [{ e: "💣", v: -5, w: 9, t: "Бум!" }, { e: "credit", v: -3, w: 9, t: "Кредит одобрен!" }];
  const ITEMS = [...GOODS, ...BADS];
  const ITEM_W = ITEMS.reduce((s, i) => s + i.w, 0);
  const pickItem = () => { let r = Math.random() * ITEM_W; for (const it of ITEMS) { r -= it.w; if (r <= 0) return it; } return ITEMS[0]; };
  const SCRATCH = [
    { e: "🏠", t: "Скидка 3% на ипотеку", d: "Действует при ставке от 34% и наличии второй квартиры", c: "c-sky" },
    { e: "🪙", t: "+25 вайбиков", d: "Настоящие! Ну, насколько вайбики вообще настоящие", c: "c-yellow", vib: 25 },
    { e: "💨", t: "Бесплатная доставка воздуха", d: "Доставим воздух в любую точку, где есть воздух", c: "c-mint" },
    { e: "😢", t: "Кэшбек 0,5% на грусть", d: "Начисляется за каждую минуту грусти после 23:00", c: "c-lilac" },
    { e: "🪙", t: "+10 вайбиков", d: "Маленькая радость — тоже радость", c: "c-lime", vib: 10 },
    { e: "🤑", t: "Предодобренный кредит. Опять", d: "Мы просто не могли не", c: "c-coral" },
    { e: "🤖", t: "Обнимашка от Заботика", d: "Обнимашка спишется автоматически в понедельник", c: "c-pink", zab: true },
    { e: "🎟️", t: "Билет на концерт «Ипотека в 25»", d: "Стоячий партер, стоя до 2049 года", c: "c-orange" },
    { e: "🪙", t: "+50 вайбиков", d: "Джекпот! Не рассказывай бухгалтерии", c: "c-holo", vib: 50 },
  ];

  Vibe.screen("games", {
    render() {
      return `
        ${Vibe.ui.head("Vibe Games", "игры, где деньги ненастоящие (почти)", Vibe.ui.vibikiPill())}
        <div data-view></div>`;
    },
    mount(root) {
      let sc = scope();
      const view = root.querySelector("[data-view]");
      let game = null; // активная игра: { stop() }

      function hub() {
        if (game) game.stop(); game = null;
        const best = S().gamesBest || 0;
        view.innerHTML = `
          <div class="stagger">
            ${Vibe.ui.hero({ title: "Играй и богатей*", text: `Рекорд: ${Vibe.fmt(best)} очков. Побьёшь?`, emo: "🕹️", color: "c-violet", sticker: "NEW 🔥" })}
            <button class="card tap c-yellow fz-gcard" data-act="catch" style="margin-top:14px">
              <span class="e emo float">🪙</span>
              <div><div class="display">Лови вайбики</div><p>20 секунд. Ловишь монетки, уворачиваешься от кредитов. Как в жизни, только быстрее.</p>
              <span class="badge" style="margin-top:8px;background:#fff">🏆 рекорд ${Vibe.fmt(best)}</span></div>
            </button>
            <button class="card tap c-pink fz-gcard" data-act="scratch" style="margin-top:14px">
              <span class="e emo wobble">🎟️</span>
              <div><div class="display">Скретч-карта</div><p>Сотри пальцем — узнай приз. Гарантированно что-то, наверное, полезное.</p>
              <span class="badge" style="margin-top:8px;background:#fff">🎁 бесплатно сегодня</span></div>
            </button>
            <button class="card tap c-lime fz-gcard" data-go="wheel" style="margin-top:14px;min-height:96px">
              <span class="e emo spin-slow" style="font-size:54px">🎡</span>
              <div><div class="display" style="font-size:22px">Колесо вайба</div><p>Ежедневный спин. Первый — бесплатно, как и всё в начале.</p></div>
            </button>
          </div>
          <div class="fine">*богатеть разрешается только вайбиками. Вайбики не являются деньгами, ценной бумагой, NFT, мемкоином и смыслом жизни.</div>`;
        view.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
      }

      /* ----- «Лови вайбики» ----- */
      function catchGame() {
        if (game) game.stop(); game = null;
        view.innerHTML = `
          <div class="fz-between" style="margin-bottom:10px">
            <button class="btn sm" data-act="hub">← Игры</button>
            <span class="badge" style="background:var(--yellow);font-size:12px">🏆 ${Vibe.fmt(S().gamesBest || 0)}</span>
          </div>
          <div class="fz-arena" data-arena>
            <div class="fz-hud">
              <span class="badge">🪙 <b data-score>0</b></span>
              <span class="badge fz-combo" data-combo>×1</span>
              <span class="badge">⏱ <b data-time>20</b></span>
            </div>
            <div class="fz-tbar"><i data-tbar></i></div>
            <div class="fz-over" data-over>
              <span class="emo float" style="font-size:80px">🪙</span>
              <div class="display" style="font-size:30px">Лови вайбики!</div>
              <p style="font-weight:700;max-width:260px">Тапай монетки 🪙⭐💜💎. Не трогай 💣 и <b>кредиты</b>. Серия ловли = множитель.</p>
              <button class="btn black xl" data-act="start" style="margin-top:8px">Погнали! 🚀</button>
            </div>
          </div>`;
        const arena = view.querySelector("[data-arena]");
        const over = view.querySelector("[data-over]");
        const gs = scope();
        let items = [], score = 0, combo = 0, lastCatch = 0, timeLeft = 20, running = false, spawnAcc = 0, last = 0;
        game = { stop: () => gs.clear() };

        const mult = () => Math.min(5, 1 + Math.floor(combo / 4));
        const hud = () => {
          view.querySelector("[data-score]").textContent = score;
          const c = view.querySelector("[data-combo]");
          c.textContent = `×${mult()}${combo >= 4 ? " 🔥" : ""}`;
          c.classList.toggle("hot", mult() > 1);
        };

        function spawn() {
          const it = pickItem();
          const el = document.createElement("div");
          el.className = "fz-item" + (it.e === "credit" ? " credit" : "");
          el.innerHTML = it.e === "credit" ? "<span>КРЕДИТ</span>" : it.e;
          const W = arena.clientWidth;
          const o = { it, el, x: rand(36, W - 36), y: -30, vy: rand(150, 230) + (20 - timeLeft) * 9, rot: rand(-30, 30), vr: rand(-120, 120), wob: rand(0, 6) };
          arena.appendChild(el);
          items.push(o);
        }

        function start() {
          over.style.display = "none";
          let n = 3;
          const cd = document.createElement("div");
          cd.className = "fz-over"; cd.style.background = "transparent"; cd.style.backdropFilter = "none";
          arena.appendChild(cd);
          const tickCd = () => {
            if (n === 0) { cd.innerHTML = `<div class="fz-count" style="font-size:80px">GO!</div>`; blip(1046, 0.25, { type: "square", vol: 0.04 }); gs.to(() => { cd.remove(); run(); }, 500); return; }
            cd.innerHTML = `<div class="fz-count">${n}</div>`;
            blip(523, 0.14, { type: "square", vol: 0.035 });
            n--; gs.to(tickCd, 700);
          };
          tickCd();
        }

        function run() {
          running = true; score = 0; combo = 0; timeLeft = 20; items = []; hud();
          last = performance.now();
          (function loop(t) {
            const dt = Math.min(0.05, (t - last) / 1000); last = t;
            timeLeft -= dt;
            const H = arena.clientHeight;
            spawnAcc += dt * (2.2 + (20 - timeLeft) * 0.16);
            while (spawnAcc > 1) { spawnAcc--; spawn(); }
            items = items.filter((o) => {
              o.y += o.vy * dt; o.rot += o.vr * dt; o.wob += dt * 4;
              o.el.style.transform = `translate(${o.x + Math.sin(o.wob) * 8}px,${o.y}px) rotate(${o.rot}deg)`;
              if (o.y > H + 40) { o.el.remove(); return false; }
              return true;
            });
            if (Date.now() - lastCatch > 1500 && combo) { combo = 0; hud(); }
            view.querySelector("[data-time]").textContent = Math.max(0, Math.ceil(timeLeft));
            view.querySelector("[data-tbar]").style.transform = `scaleX(${Math.max(0, timeLeft / 20)})`;
            view.querySelector(".fz-tbar").classList.toggle("low", timeLeft < 5);
            if (timeLeft <= 0) return end();
            gs.raf(loop);
          })(last);
        }

        gs.on(arena, "pointerdown", (e) => {
          if (!running) return;
          const el = e.target.closest(".fz-item");
          if (!el) return;
          const o = items.find((x) => x.el === el);
          if (!o) return;
          items = items.filter((x) => x !== o);
          const r = el.getBoundingClientRect(), p = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          el.remove();
          if (o.it.v > 0) {
            combo++; lastCatch = Date.now();
            const m = mult(), pts = o.it.v * m;
            score += pts;
            const semis = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
            blip(mtof(72 + semis[Math.min(semis.length - 1, combo % 12)]), 0.11, { type: "square", vol: 0.03 });
            FX.burst(p, { emojis: [o.it.e, "✨"], count: 6, spread: 60, size: [14, 24] });
            floatText(`+${pts}${m > 1 ? ` ×${m}` : ""}`, p.x, p.y, m > 2 ? "#ff6b2c" : "var(--ink)", 22 + m * 3);
            FX.haptic(6);
            if (combo % 8 === 0) { FX.toast(`Комбо ×${m}! Ты в потоке`, "🔥", 1200); FX.sound.levelup(); }
          } else {
            combo = 0; score = Math.max(0, score + o.it.v);
            FX.burst(p, { emojis: o.it.e === "credit" ? ["📄", "💸", "😱"] : ["💥", "💨", "🔥"], count: 12, spread: 90 });
            floatText(`${o.it.t} ${o.it.v}`, p.x, p.y, "#e5333d", 20);
            FX.shake(arena); retrigger(arena, "flash", 400);
          }
          hud();
        });

        function end() {
          running = false;
          items.forEach((o) => o.el.remove()); items = [];
          const best = S().gamesBest || 0;
          const isBest = score > best;
          if (isBest) Vibe.state.set({ gamesBest: score });
          const vib = Math.min(200, Math.round(score * 1.5));
          blip(880, 0.3, { type: "square", vol: 0.03 }); blip(660, 0.4, { type: "square", vol: 0.03, delay: 0.15 });
          const fin = document.createElement("div");
          fin.className = "fz-over";
          fin.innerHTML = `
            <div class="display" style="font-size:24px">Время вышло!</div>
            ${isBest ? `<span class="sticker" style="position:relative;transform:rotate(-6deg);background:var(--pink)">НОВЫЙ РЕКОРД 🏆</span>` : ""}
            <div class="big-num" style="font-size:84px" data-fscore>0</div>
            <div style="font-weight:800">очков · рекорд ${Vibe.fmt(Math.max(best, score))}</div>
            <div class="badge" style="background:var(--yellow);font-size:14px;padding:8px 14px;margin-top:4px">= 🪙 ${vib} вайбиков</div>
            <div class="fz-row" style="margin-top:10px">
              <button class="btn" data-act="again">Ещё раз 🔁</button>
              <button class="btn black" data-act="claim">Забрать 🪙</button>
            </div>`;
          arena.appendChild(fin);
          FX.countTo(fin.querySelector("[data-fscore]"), score, { from: 0, dur: 1100 });
          if (isBest) { FX.confetti(); FX.sound.levelup(); } else FX.sound.success();
          Vibe.achieve("gamer");
          let claimed = false;
          fin.addEventListener("click", (e) => {
            const a = e.target.closest("[data-act]");
            if (!a) return;
            e.stopPropagation();
            if (a.dataset.act === "claim") {
              if (!claimed && vib > 0) { claimed = true; Vibe.reward({ vibiki: vib, xp: 20 + Math.round(score / 5), from: a }); a.textContent = "Забрано ✓"; a.disabled = true; FX.burst(a, { emojis: ["🪙", "💰", "✨"], count: 16 }); }
              else if (!vib) FX.toast("0 очков = 0 вайбиков. Математика безжалостна", "🧮");
            } else if (a.dataset.act === "again") {
              if (!claimed && vib > 0) Vibe.reward({ vibiki: vib, xp: 20, from: a });
              claimed = true;
              fin.remove(); start();
            }
          });
        }

        gs.on(over, "click", (e) => { if (e.target.closest('[data-act="start"]')) { e.stopPropagation(); start(); } });
      }

      /* ----- Скретч-карта ----- */
      function scratch() {
        if (game) game.stop(); game = null;
        const prize = pick(SCRATCH);
        view.innerHTML = `
          <div class="fz-between" style="margin-bottom:10px">
            <button class="btn sm" data-act="hub">← Игры</button>
            <span class="badge" style="background:var(--lilac);font-size:12px">🎟️ Карт стёрто: <span data-scount>${S().scratchCount || 0}</span></span>
          </div>
          <div class="display" style="font-size:30px;margin:4px 0 12px">Сотри и выиграй <span class="emo wobble">👆</span></div>
          <div class="fz-scratch" data-sc>
            <div class="fz-prize ${prize.c}">
              ${prize.zab ? Vibe.zabotik(90, "smile") : `<span class="e emo">${prize.e}</span>`}
              <div class="display">${prize.t}</div>
              <div style="font-weight:700;font-size:13px;max-width:260px">${prize.d}</div>
            </div>
            <canvas data-cv></canvas>
          </div>
          <div class="progress" style="margin-top:14px"><i data-sprog style="--p:0%;transition:width .2s"></i></div>
          <div class="muted" style="font-weight:800;font-size:12px;margin-top:6px;text-align:center" data-shint>Стирай пальцем серебряный слой</div>
          <button class="btn black xl block" data-act="scratch" style="margin-top:14px;display:none" data-newcard>Новая карта 🎟️</button>
          <div class="fine">Приз выбирается честным алгоритмом, который мы написали сами и сами же проверили. Вероятность выигрыша — 100%, ценность выигрыша — вопрос философский.</div>`;
        const box = view.querySelector("[data-sc]");
        const cv = view.querySelector("[data-cv]");
        const g = cv.getContext("2d", { willReadFrequently: true });
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const W = box.clientWidth, H = box.clientHeight;
        cv.width = W * dpr; cv.height = H * dpr;
        g.scale(dpr, dpr);
        // Серебряный голо-слой
        const gr = g.createLinearGradient(0, 0, W, H);
        ["#d8d8e0", "#f5f5fa", "#b9b9c6", "#ececf3", "#c8c8d4"].forEach((c, i) => gr.addColorStop(i / 4, c));
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.globalAlpha = 0.18;
        for (let i = 0; i < 26; i++) { g.fillStyle = pick(["#ff6bcb", "#8fd8ff", "#c6ff4d", "#ffe14d"]); g.beginPath(); g.arc(rand(0, W), rand(0, H), rand(10, 40), 0, 7); g.fill(); }
        g.globalAlpha = 1;
        g.fillStyle = "#6b6878"; g.font = "800 13px Manrope, sans-serif"; g.textAlign = "center";
        for (let y = 24; y < H; y += 34) for (let x = (y / 34) % 2 ? 40 : 0; x < W + 60; x += 92) g.fillText("VIBE ✦", x, y);
        g.fillStyle = "#0e0e12"; g.font = "28px 'Dela Gothic One', sans-serif";
        g.fillText("СОТРИ МЕНЯ", W / 2, H / 2 + 4);
        g.font = "34px sans-serif"; g.fillText("🪙👆", W / 2, H / 2 + 46);
        g.globalCompositeOperation = "destination-out";
        g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 46;

        const ss = scope();
        game = { stop: () => ss.clear() };
        let down = false, lp = null, moves = 0, revealed = false, lastSnd = 0;
        const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
        const cleared = () => {
          const d = g.getImageData(0, 0, cv.width, cv.height).data;
          let c = 0, n = 0;
          for (let i = 3; i < d.length; i += 4 * 37) { n++; if (d[i] < 40) c++; }
          return c / n;
        };
        function reveal() {
          revealed = true;
          cv.classList.add("gone"); box.classList.add("won");
          FX.confetti(); FX.sound.levelup(); FX.haptic([10, 30, 10, 30]);
          FX.burst(box, { emojis: [prize.e, "✨", "🎉", "⭐"], count: 20, spread: 160 });
          view.querySelector("[data-sprog]").style.setProperty("--p", "100%");
          view.querySelector("[data-shint]").textContent = "Поздравляем! Приз уже ваш (в каком-то смысле)";
          const n = (S().scratchCount || 0) + 1;
          Vibe.state.set({ scratchCount: n });
          view.querySelector("[data-scount]").textContent = n;
          const nb = view.querySelector("[data-newcard]");
          nb.style.display = ""; nb.classList.add("fz-popin");
          ss.to(() => {
            if (prize.vib) Vibe.reward({ vibiki: prize.vib, xp: 10, from: box });
            else { Vibe.reward({ xp: 10, from: box }); FX.toast(`Приз: ${prize.t}`, prize.e); }
            Vibe.achieve("gamer");
          }, 500);
        }
        ss.on(cv, "pointerdown", (e) => { if (revealed) return; down = true; lp = local(e); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); g.beginPath(); g.arc(lp.x, lp.y, 23, 0, 7); g.fill(); });
        ss.on(cv, "pointermove", (e) => {
          if (!down || revealed) return;
          const p = local(e);
          g.beginPath(); g.moveTo(lp.x, lp.y); g.lineTo(p.x, p.y); g.stroke();
          lp = p;
          const now = performance.now();
          if (now - lastSnd > 60) { scratchNoise(); lastSnd = now; FX.haptic(3); }
          if (++moves % 8 === 0) {
            const k = cleared();
            view.querySelector("[data-sprog]").style.setProperty("--p", Math.min(100, Math.round((k / 0.55) * 100)) + "%");
            if (Math.random() < 0.25) { const r = cv.getBoundingClientRect(); FX.burst({ x: r.left + p.x, y: r.top + p.y }, { emojis: ["✨", "⭐"], count: 2, spread: 40, size: [12, 18] }); }
            if (k > 0.55) reveal();
          }
        });
        const up = () => { down = false; };
        ss.on(cv, "pointerup", up); ss.on(cv, "pointercancel", up);
      }

      sc.on(view, "click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        const act = a.dataset.act;
        if (act === "catch") catchGame();
        else if (act === "scratch") scratch();
        else if (act === "hub") hub();
        else return;
        FX.sound.whoosh();
        view.classList.remove("fz-popin"); void view.offsetWidth; view.classList.add("fz-popin");
      });

      hub();
      return () => { if (game) game.stop(); sc.clear(); };
    },
  });

  /* ============================================================
     4. VIBE INVEST — брокер, где всё растёт (на графике)
     ============================================================ */
  const ASSETS = [
    { tk: "VIBE", n: "Вайб Групп", e: "📱", c: "c-violet", p: 4120, vol: 0.012 },
    { tk: "ZABOT", n: "Заботик Роботикс", e: "🤖", c: "c-mint", p: 892, vol: 0.02 },
    { tk: "KRDT", n: "Кредит Навсегда", e: "🤑", c: "c-lime", p: 1337, vol: 0.008 },
    { tk: "VBC", n: "Вайбкоин", e: "🪙", c: "c-yellow", p: 69420, vol: 0.05 },
    { tk: "AIR", n: "Воздух Холдинг", e: "💨", c: "c-sky", p: 12, vol: 0.03 },
    { tk: "MEME", n: "Мем-фонд «Кот»", e: "🐸", c: "c-pink", p: 228, vol: 0.06 },
  ];
  const PERIODS = [
    { k: "1Д", n: 40, drift: 0.0004, vol: 0.006, label: "за сегодня" },
    { k: "1Н", n: 42, drift: 0.0012, vol: 0.01, label: "за неделю" },
    { k: "1М", n: 46, drift: 0.002, vol: 0.016, label: "за месяц" },
    { k: "1Г", n: 52, drift: 0.005, vol: 0.03, label: "за год" },
    { k: "Всё", n: 60, drift: 0.008, vol: 0.04, label: "за всё время" },
  ];
  function walkSeries(n, drift, vol, end) {
    const a = [1];
    for (let i = 1; i < n; i++) a.push(a[i - 1] * (1 + drift + (Math.random() - 0.5) * 2 * vol));
    const k = end / a[n - 1];
    return a.map((v) => v * k);
  }
  function sparkPath(vals, w, h, pad = 2) {
    const mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
    return vals.map((v, i) => `${i ? "L" : "M"}${((i / (vals.length - 1)) * (w - pad * 2) + pad).toFixed(1)} ${(h - pad - ((v - mn) / r) * (h - pad * 2)).toFixed(1)}`).join(" ");
  }

  Vibe.screen("invest", {
    render() {
      const s = S();
      const val = s.invValue || 48230;
      return `
        ${Vibe.ui.head("Vibe Invest", "инвестиции для тех, кто уже всё потратил", Vibe.ui.vibikiPill())}
        <div class="card c-lime fz-inv-top">
          <span class="sticker" style="top:14px;right:14px;background:var(--pink)">📈 только вверх*</span>
          <div style="font-weight:800;font-size:13px">Мой портфель</div>
          <div class="big-num" data-inv>${Vibe.rub(val)}</div>
          <div class="fz-row" style="margin-top:8px;gap:6px">
            <span class="badge" data-chg style="background:#fff">▲ +2,41%</span>
            <span style="font-weight:800;font-size:12px" data-chglbl>за сегодня</span>
          </div>
          <div class="fz-chart" data-chart>
            <svg viewBox="0 0 340 180" preserveAspectRatio="none">
              <defs><linearGradient id="fzArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0e12" stop-opacity=".22"/><stop offset="1" stop-color="#0e0e12" stop-opacity="0"/></linearGradient></defs>
              <g stroke="#0e0e12" stroke-opacity=".12" stroke-dasharray="3 5"><line x1="0" y1="45" x2="340" y2="45"/><line x1="0" y1="90" x2="340" y2="90"/><line x1="0" y1="135" x2="340" y2="135"/></g>
              <path class="fz-area" data-area fill="url(#fzArea)" d=""/>
              <path class="fz-line" data-line d=""/>
              <circle class="fz-enddot" data-dot r="6" fill="#ff6bcb" stroke="#0e0e12" stroke-width="2.5" cx="-20" cy="-20"/>
            </svg>
            <div class="fz-scrub" data-scrub><b></b></div>
          </div>
          <div class="chips" style="margin-top:6px">${PERIODS.map((p, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-per="${i}">${p.k}</button>`).join("")}</div>
        </div>
        <div class="grid2" style="margin-top:14px">
          <button class="card tap c-yellow" data-act="topup" style="text-align:left"><span class="emo wobble" style="font-size:30px">💰</span><b style="display:block;margin-top:6px">Пополнить</b><small style="font-weight:700;font-size:12px">комиссия 0%*</small></button>
          <button class="card tap c-pink" data-act="advice" style="text-align:left"><span class="emo float" style="font-size:30px">🔮</span><b style="display:block;margin-top:6px">Совет дня</b><small style="font-weight:700;font-size:12px">от Заботика</small></button>
        </div>
        ${Vibe.ui.marquee(["VIBE ▲ 4,2%", "ZABOT ▲ 13%", "KRDT ▲ ∞", "VBC ▲▼▲▼", "AIR ▲ 0,01 ₽", "MEME 🐸 🚀"])}
        <h2 class="sec">Активы <small>цены живые*</small></h2>
        <div class="card" style="padding:4px 14px">
          <div class="stagger" data-assets>
            ${ASSETS.map((a, i) => `
              <div class="li fz-asset tap" data-asset="${i}" style="cursor:pointer">
                <div class="ic ${a.c}">${a.e}</div>
                <div class="tx"><b>${a.tk}</b><small>${a.n}</small></div>
                <svg class="spark" viewBox="0 0 62 28"><path data-spark="${i}" d="" fill="none" stroke="#12a150" stroke-width="2.5" stroke-linejoin="round"/></svg>
                <div class="amt" data-aprice="${i}">${Vibe.rub(a.p)}<small class="fz-up">+0,00%</small></div>
              </div>`).join("")}
          </div>
        </div>
        <div class="fine">Доходность в прошлом не гарантирует доходность в прошлом. *Вверх — это направление, а не обещание. Vibe Invest не является брокером, банком, гадалкой и вашим другом, хотя очень старается.</div>`;
    },
    mount(root) {
      const sc = scope();
      const svg = root.querySelector("[data-chart] svg");
      const line = root.querySelector("[data-line]"), area = root.querySelector("[data-area]"), dot = root.querySelector("[data-dot]");
      const valEl = root.querySelector("[data-inv]");
      const chartBox = root.querySelector("[data-chart]");
      const scrub = root.querySelector("[data-scrub]");
      let value = S().invValue || 48230;
      valEl.dataset.val = value;
      let per = 0, series = [], animUntil = 0;
      const W = 340, H = 180, PAD = 14;
      const assetSeries = ASSETS.map((a) => walkSeries(16, 0.002, a.vol, a.p));
      const assetBase = ASSETS.map((a) => a.p);
      const assetNow = ASSETS.map((a) => a.p);

      const pts = () => {
        const mn = Math.min(...series), mx = Math.max(...series), r = mx - mn || 1;
        return series.map((v, i) => [(i / (series.length - 1)) * W, H - PAD - ((v - mn) / r) * (H - PAD * 2)]);
      };
      function smooth(p) {
        let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
        for (let i = 1; i < p.length; i++) {
          const [x0, y0] = p[i - 1], [x1, y1] = p[i], mx = (x0 + x1) / 2;
          d += ` C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
        }
        return d;
      }
      function draw(animate = true) {
        const p = pts();
        const d = smooth(p);
        line.setAttribute("d", d);
        area.setAttribute("d", d + ` L${W} ${H} L0 ${H} Z`);
        const [ex, ey] = p[p.length - 1];
        dot.setAttribute("cx", ex); dot.setAttribute("cy", ey);
        if (animate) {
          animUntil = performance.now() + 1450;
          const len = line.getTotalLength();
          line.classList.remove("draw");
          line.style.strokeDasharray = `${len} ${len}`;
          line.style.strokeDashoffset = len;
          area.style.opacity = 0; dot.style.opacity = 0;
          void line.getBoundingClientRect();
          line.classList.add("draw");
          line.style.strokeDashoffset = 0;
          area.style.opacity = 1;
          sc.to(() => { dot.style.opacity = 1; FX.bump(dot); }, 1200);
        } else {
          line.style.strokeDasharray = "none"; line.style.strokeDashoffset = 0;
        }
        const first = series[0], lastV = series[series.length - 1];
        const ch = ((lastV - first) / first) * 100;
        const chg = root.querySelector("[data-chg]");
        chg.textContent = `${ch >= 0 ? "▲" : "▼"} ${pct(ch)} · ${ch >= 0 ? "+" : "−"}${Vibe.rub(Math.abs(lastV - first))}`;
        chg.style.background = ch >= 0 ? "#fff" : "#ffd0d0";
      }
      function setPeriod(i) {
        per = i;
        const P = PERIODS[i];
        series = walkSeries(P.n, P.drift, P.vol, value);
        root.querySelector("[data-chglbl]").textContent = P.label;
        draw(true);
      }

      // Спарклайны активов
      ASSETS.forEach((a, i) => root.querySelector(`[data-spark="${i}"]`).setAttribute("d", sparkPath(assetSeries[i], 62, 28)));

      // Живые тики
      sc.every(() => {
        // портфель
        const nv = value * (1 + (Math.random() - 0.42) * 0.004);
        const up = nv >= value;
        value = Math.round(nv);
        Vibe.state.set({ invValue: value });
        FX.countTo(valEl, value, { dur: 500, fmt: Vibe.rub });
        valEl.classList.remove("flash-up", "flash-down"); valEl.classList.add(up ? "flash-up" : "flash-down");
        sc.to(() => valEl.classList.remove("flash-up", "flash-down"), 600);
        series[series.length - 1] = value;
        if (performance.now() > animUntil) draw(false);
        // случайный актив
        const i = ri(0, ASSETS.length - 1);
        assetNow[i] = Math.max(1, assetNow[i] * (1 + (Math.random() - 0.45) * ASSETS[i].vol));
        assetSeries[i].push(assetNow[i]); assetSeries[i].shift();
        const ch = ((assetNow[i] - assetBase[i]) / assetBase[i]) * 100;
        const el = root.querySelector(`[data-aprice="${i}"]`);
        el.innerHTML = `${Vibe.rub(assetNow[i])}<small class="${ch >= 0 ? "fz-up" : "fz-down"}">${pct(ch)}</small>`;
        retrigger(el, "tick", 500);
        const sp = root.querySelector(`[data-spark="${i}"]`);
        sp.setAttribute("d", sparkPath(assetSeries[i], 62, 28));
        sp.setAttribute("stroke", ch >= 0 ? "#12a150" : "#e5333d");
      }, 2000);

      // Скраббинг графика пальцем
      let lastIdx = -1;
      const scrubAt = (e) => {
        const r = chartBox.getBoundingClientRect();
        const x = clamp(e.clientX - r.left, 0, r.width);
        const idx = Math.round((x / r.width) * (series.length - 1));
        scrub.style.opacity = 1; scrub.style.left = x + "px";
        scrub.querySelector("b").textContent = Vibe.rub(series[idx]);
        if (idx !== lastIdx) { lastIdx = idx; FX.sound.tick(); FX.haptic(2); }
      };
      sc.on(chartBox, "pointerdown", (e) => { scrubAt(e); chartBox.setPointerCapture && chartBox.setPointerCapture(e.pointerId); });
      sc.on(chartBox, "pointermove", (e) => { if (e.buttons || e.pointerType === "touch") scrubAt(e); });
      const end = () => { scrub.style.opacity = 0; lastIdx = -1; };
      sc.on(chartBox, "pointerup", end); sc.on(chartBox, "pointercancel", end); sc.on(chartBox, "pointerleave", end);

      // Покупка
      function buy(i) {
        const a = ASSETS[i];
        const AM = [500, 1000, 5000, 10000, 25000, 96000];
        let amount = 1000;
        Vibe.ui.sheet(`
          <div class="fz-row" style="margin-bottom:12px">
            <div class="ic ${a.c}" style="width:62px;height:62px;border-radius:20px;border:var(--line);display:grid;place-items:center;font-size:34px"><span class="emo wobble">${a.e}</span></div>
            <div style="flex:1"><div class="display" style="font-size:26px">${a.tk}</div><div class="muted" style="font-weight:800;font-size:13px">${a.n} · ${Vibe.rub(assetNow[i])}</div></div>
            ${a.tk === "VBC" ? `<span class="badge" style="background:#ff3b3b;color:#fff;transform:rotate(6deg)">высокий риск, высокий вайб</span>` : ""}
          </div>
          <div class="card flat c-white" style="text-align:center;padding:14px">
            <div class="muted" style="font-weight:800;font-size:12px">Сумма покупки</div>
            <div class="big-num" style="font-size:44px;margin-top:4px" data-amt>${Vibe.rub(amount)}</div>
            <div style="font-weight:800;font-size:13px;margin-top:6px" data-qty></div>
          </div>
          <div class="fz-amts">${AM.map((v) => `<button class="chip ${v === amount ? "on" : ""}" data-am="${v}">${v === 96000 ? "Вся зарплата" : Vibe.rub(v)}</button>`).join("")}</div>
          <div class="badge" style="background:var(--yellow)">🔮 Прогноз Заботика: ${pick(["вверх", "в космос", "вбок, но красиво", "туда, куда надо"])}</div>
          <button class="btn black xl block" data-buy style="margin-top:14px">Купить 🚀</button>
          <div class="fine">Нажимая «Купить», вы подтверждаете, что прочитали проспект эмиссии, поняли его и простили.</div>`, {
          onMount(sh, close) {
            const upd = () => {
              sh.querySelector("[data-qty]").textContent = `≈ ${(amount / assetNow[i]).toFixed(amount / assetNow[i] < 1 ? 4 : 1).replace(".", ",")} шт. ${a.tk}`;
            };
            upd();
            sh.addEventListener("click", (e) => {
              const c = e.target.closest("[data-am]");
              if (c) {
                const prev = amount;
                amount = +c.dataset.am;
                sh.querySelectorAll("[data-am]").forEach((x) => x.classList.toggle("on", x === c));
                FX.countTo(sh.querySelector("[data-amt]"), amount, { from: prev, dur: 400, fmt: Vibe.rub });
                FX.bump(sh.querySelector("[data-amt]")); upd();
                if (amount === 96000) FX.toast("Смело. Очень смело", "😳");
                return;
              }
              const b = e.target.closest("[data-buy]");
              if (!b) return;
              const ok = Vibe.pay(amount, { title: `Vibe Invest · ${a.tk}`, emoji: a.e, col: a.c, from: b, cashback: 0.01 });
              if (!ok) return;
              const r = b.getBoundingClientRect();
              close();
              rocket({ x: r.left + r.width / 2, y: r.top });
              const hold = Object.assign({}, S().invHold || {});
              hold[a.tk] = (hold[a.tk] || 0) + amount;
              const boost = amount * (1 + rand(0.03, 0.12));
              const prevV = value;
              value = Math.round(value + boost);
              Vibe.state.set({ invHold: hold, invValue: value });
              sc.to(() => {
                FX.countTo(valEl, value, { from: prevV, dur: 1200, fmt: Vibe.rub });
                valEl.classList.add("flash-up"); sc.to(() => valEl.classList.remove("flash-up"), 1300);
                // линия «прыгает» вверх
                const n = series.length;
                series = series.slice(Math.max(0, n - (PERIODS[per].n - 3)));
                const lastV = series[series.length - 1];
                series.push(lastV + (value - lastV) * 0.4, lastV + (value - lastV) * 0.85, value);
                draw(true);
                FX.burst(dot, { emojis: ["🚀", "📈", "💚", "✨"], count: 18, spread: 130 });
                FX.toast(`${a.tk} в портфеле. Вы инвестор 🚀`, a.e);
              }, 700);
            });
          },
        });
      }
      function rocket(from) {
        FX.sound.levelup();
        FX.burst(from, { emojis: ["🚀", "🔥", "💨", "✨"], count: 16, spread: 120 });
        const el = document.createElement("span");
        el.className = "p"; el.textContent = "🚀"; el.style.fontSize = "64px";
        document.getElementById("fx-layer").appendChild(el);
        el.animate([
          { transform: `translate(${from.x}px,${from.y}px) translate(-50%,-50%) rotate(-45deg) scale(.5)` },
          { transform: `translate(${from.x + 30}px,${from.y - 120}px) translate(-50%,-50%) rotate(-45deg) scale(1.3)`, offset: 0.3 },
          { transform: `translate(${innerWidth + 80}px,${-120}px) translate(-50%,-50%) rotate(-45deg) scale(.8)` },
        ], { duration: 1300, easing: "cubic-bezier(.5,0,.6,1)" }).onfinish = () => el.remove();
        FX.confetti({ count: 90, from });
      }

      sc.on(root, "click", (e) => {
        const pc = e.target.closest("[data-per]");
        if (pc) {
          root.querySelectorAll("[data-per]").forEach((c) => c.classList.toggle("on", c === pc));
          setPeriod(+pc.dataset.per); FX.sound.whoosh();
          return;
        }
        const as = e.target.closest("[data-asset]");
        if (as) { buy(+as.dataset.asset); return; }
        const act = e.target.closest("[data-act]");
        if (!act) return;
        if (act.dataset.act === "topup") {
          FX.toast("Пополнение через кредит одобрено. Шутка. Или нет", "💰"); FX.bump(act);
        } else if (act.dataset.act === "advice") {
          FX.bump(act);
          Vibe.modal(`<div style="margin-bottom:6px">${Vibe.zabotik(96, "sly")}</div><div class="display">Совет дня</div><p>${pick([
            "Покупай на хаях, продавай на лоях. Или наоборот, я вечно путаю.",
            "Диверсифицируй: часть в VIBE, часть в ZABOT, часть в шаурму.",
            "Лучшая инвестиция — в себя. Но в себя нельзя купить на 1 000 ₽.",
            "Если график идёт вниз — переверни телефон.",
          ])}</p><button class="btn black block" data-close>Понял, принял 🫡</button>`, { sound: "pop" });
        }
      });

      setPeriod(0);
      return () => sc.clear();
    },
  });

  /* ============================================================
     5. КОЛЕСО ВАЙБА — ежедневный спин
     ============================================================ */
  const PRIZES = [
    { l: "+50", e: "🪙", c: "#ffe14d", t: "+50 вайбиков", d: "Честно накручено. Почти как зарплата, только быстрее.", vib: 50, w: 18 },
    { l: "Кэшбек 1%", e: "💨", c: "#8fd8ff", t: "Кэшбек 1% на воздух", d: "Дышите — получайте кэшбек. Выплата раз в 100 лет, без учёта выходных.", w: 13 },
    { l: "Кредит 0%*", e: "🤑", c: "#ff6bcb", t: "Кредит под 0%*", d: "*0% в первые 0 дней, затем 89% годовых. Уже одобрен, уже скучает по вам.", w: 13 },
    { l: "+100", e: "💰", c: "#c6ff4d", t: "+100 вайбиков", d: "Сотка! Можно купить 0,3 кофе в Vibe Eat.", vib: 100, w: 10 },
    { l: "Ничего", e: "✨", c: "#d9c8ff", t: "Ничего, но красиво", d: "Зато как крутилось! Мы старались, анимация стоила дороже приза.", w: 16 },
    { l: "x2 опыт", e: "⚡", c: "#ff6b2c", t: "x2 опыт", d: "+80 XP прямо сейчас. Уровень сам себя не поднимет.", xp: 80, w: 12 },
    { l: "+20", e: "🪙", c: "#7cf5c8", t: "+20 вайбиков", d: "Маленькая победа — тоже победа. Особенно в понедельник.", vib: 20, w: 14 },
    { l: "ДЖЕКПОТ", e: "💎", c: "#8b5cff", t: "ДЖЕКПОТ +300", d: "Вы сорвали банк! Банк, кстати, наш. Ничего страшного.", vib: 300, w: 4, dark: true },
  ];
  const SPIN_COST = 50;

  function wheelSvg() {
    const R = 140;
    const pt = (a, r = R) => [(Math.cos((a * Math.PI) / 180) * r).toFixed(2), (Math.sin((a * Math.PI) / 180) * r).toFixed(2)];
    const segs = PRIZES.map((p, i) => {
      const a0 = i * 45 - 90, a1 = a0 + 45, mid = a0 + 22.5;
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      return `
        <path d="M0 0 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z" fill="${p.c}" stroke="#0e0e12" stroke-width="2.5"/>
        <g transform="rotate(${mid})">
          <text x="44" y="4.5" font-family="Manrope, sans-serif" font-weight="800" font-size="${p.l.length > 7 ? 10.5 : 13}" fill="${p.dark ? "#fff" : "#0e0e12"}">${p.l}</text>
          <text x="118" y="0" font-size="20" text-anchor="middle" dominant-baseline="central" transform="rotate(90 118 0)">${p.e}</text>
        </g>`;
    }).join("");
    return `<svg viewBox="-150 -150 300 300">
      <circle r="146" fill="#fff" stroke="#0e0e12" stroke-width="3"/>
      ${segs}
      <circle r="${R}" fill="none" stroke="#0e0e12" stroke-width="3"/>
      ${PRIZES.map((_, i) => { const [x, y] = pt(i * 45 - 90, R - 2); return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#0e0e12" stroke-width="2"/>`; }).join("")}
    </svg>`;
  }

  Vibe.screen("wheel", {
    render() {
      const bulbs = Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return `<i class="fz-bulb ${i % 2 ? "alt" : ""}" style="left:${(50 + Math.cos(a) * 47.6).toFixed(2)}%;top:${(50 + Math.sin(a) * 47.6).toFixed(2)}%"></i>`;
      }).join("");
      return `
        ${Vibe.ui.head("Колесо вайба", "крути — и судьба улыбнётся (или нет)", Vibe.ui.vibikiPill())}
        <div class="card c-yellow fz-wheel-box" data-box>
          <div class="spin-slow" style="position:absolute;inset:-60%;background:repeating-conic-gradient(from 0deg, rgba(255,255,255,.45) 0 10deg, transparent 10deg 20deg);animation-duration:30s"></div>
          <div class="fz-wheel-wrap">
            <div class="fz-rim"></div>
            ${bulbs}
            <div class="fz-wheel" data-wheel>${wheelSvg()}</div>
            <div class="fz-hub">${Vibe.zabotik(56, "smile")}</div>
            <svg class="fz-pointer" data-pointer viewBox="0 0 46 58"><path d="M23 56 L4 16 A19 19 0 1 1 42 16 Z" fill="#ff3b3b" stroke="#0e0e12" stroke-width="3" stroke-linejoin="round"/><circle cx="23" cy="18" r="7" fill="#fff" stroke="#0e0e12" stroke-width="2.5"/></svg>
          </div>
          <div style="position:relative;text-align:center;margin-top:18px;padding:0 16px">
            <button class="btn black xl block fz-spin-btn" data-spin></button>
            <div style="font-weight:800;font-size:13px;margin-top:10px" data-note></div>
          </div>
        </div>
        <h2 class="sec">Призы <small>шансы честные*</small></h2>
        <div class="grid2 stagger">
          ${PRIZES.map((p) => `<div class="card tight" style="display:flex;align-items:center;gap:10px;background:${p.c};${p.dark ? "color:#fff" : ""}"><span class="emo" style="font-size:28px">${p.e}</span><b style="font-size:13px;line-height:1.15">${p.t}</b></div>`).join("")}
        </div>
        <h2 class="sec">Последние выигрыши</h2>
        <div class="fz-log" data-log></div>
        <div class="fine">*Шансы честные в том смысле, что они точно есть. Один бесплатный спин в сутки, далее ${SPIN_COST} вайбиков за спин. Колесо не является азартной игрой, потому что азарт у вас, а не у нас.</div>`;
    },
    mount(root) {
      const sc = scope();
      const wheel = root.querySelector("[data-wheel]");
      const pointer = root.querySelector("[data-pointer]");
      const box = root.querySelector("[data-box]");
      const btn = root.querySelector("[data-spin]");
      const note = root.querySelector("[data-note]");
      let rot = S().wheelRot || 0, spinning = false;
      wheel.style.transform = `rotate(${rot}deg)`;
      const isFree = () => S().spunDay !== today();

      function renderLog() {
        const log = S().wheelLog || [];
        root.querySelector("[data-log]").innerHTML = log.length
          ? log.map((l) => `<span class="badge fz-popin" style="background:#fff;font-size:12px;padding:6px 10px">${l.e} ${l.t}</span>`).join("")
          : `<span class="muted" style="font-weight:700;font-size:13px">Пока пусто. Колесо ждёт тебя 🥺</span>`;
      }
      function updBtn() {
        if (spinning) { btn.innerHTML = "Крутится… 🌀"; btn.disabled = true; return; }
        btn.disabled = false;
        if (isFree()) { btn.innerHTML = `Крутить бесплатно! 🎡`; btn.classList.remove("yellow"); btn.classList.add("black"); note.textContent = "Первый спин сегодня — за наш счёт"; }
        else {
          btn.innerHTML = `Крутить ещё · ${SPIN_COST} 🪙`;
          const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
          const s = Math.floor((mid - now) / 1000);
          note.innerHTML = `Бесплатный спин через <span class="timer-pill">${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}</span>`;
        }
      }
      sc.every(() => { if (!spinning && !isFree()) updBtn(); }, 1000);

      function choose() {
        const tot = PRIZES.reduce((s, p) => s + p.w, 0);
        let r = Math.random() * tot;
        for (let i = 0; i < PRIZES.length; i++) { r -= PRIZES[i].w; if (r <= 0) return i; }
        return 0;
      }

      function spin() {
        if (spinning) return;
        if (!isFree()) {
          if (S().vibiki < SPIN_COST) {
            FX.shake(btn); FX.toast(`Нужно ${SPIN_COST} вайбиков. Поиграй в Vibe Games!`, "🪙");
            return;
          }
          Vibe.state.set({ vibiki: S().vibiki - SPIN_COST });
          Vibe.refreshCounters();
          const pill = document.querySelector("[data-vibiki]");
          if (pill) { const r = pill.getBoundingClientRect(); floatText(`−${SPIN_COST} 🪙`, r.left + r.width / 2, r.top + 34, "#e5333d", 20); }
          FX.coins(pill || { x: innerWidth - 60, y: 50 }, wheel, 5);
        } else {
          Vibe.state.set({ spunDay: today() });
        }
        spinning = true; updBtn();
        box.classList.add("spinning");
        FX.sound.whoosh(); FX.haptic([10, 20, 10]);
        const idx = choose();
        const jitter = rand(-15, 15);
        const desired = ((360 - (idx * 45 + 22.5 + jitter)) % 360 + 360) % 360;
        const start = rot;
        const base = ((start % 360) + 360) % 360;
        const target = start + 360 * ri(6, 8) + ((desired - base + 360) % 360);
        const dur = rand(5200, 6200);
        const t0 = performance.now();
        let lastSeg = Math.floor(((((-start) % 360) + 360) % 360) / 45);
        (function step(t) {
          const k = Math.min(1, (t - t0) / dur);
          // разгон 8%, затем долгое «физичное» торможение
          const e = k < 0.08 ? 0.5 * Math.pow(k / 0.08, 2) * 0.08 * 1.6 : 0.064 + (1 - 0.064) * (1 - Math.pow(1 - (k - 0.08) / 0.92, 3.4));
          rot = start + (target - start) * Math.min(1, e);
          wheel.style.transform = `rotate(${rot}deg)`;
          const seg = Math.floor(((((-rot) % 360) + 360) % 360) / 45);
          if (seg !== lastSeg) {
            lastSeg = seg;
            FX.sound.tick();
            pointer.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(${-18 - (1 - k) * 10}deg)` }, { transform: "rotate(0deg)" }], { duration: 140, easing: "ease-out" });
            if (k > 0.75) FX.haptic(4);
          }
          if (k < 1) sc.raf(step);
          else done(idx);
        })(t0);
      }

      function done(idx) {
        spinning = false; box.classList.remove("spinning");
        rot = rot % 360;
        wheel.style.transform = `rotate(${rot}deg)`;
        Vibe.state.set({ wheelRot: rot });
        const p = PRIZES[idx];
        pointer.animate([{ transform: "rotate(0)" }, { transform: "rotate(-24deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(-4deg)" }, { transform: "rotate(0)" }], { duration: 700, easing: "ease-out" });
        FX.bump(wheel.parentElement);
        FX.confetti(); FX.sound.levelup(); FX.haptic([20, 40, 20, 40]);
        FX.burst(root.querySelector(".fz-hub"), { emojis: [p.e, "✨", "🎉", "⭐"], count: 20, spread: 170 });
        const log = [{ e: p.e, t: p.t }, ...(S().wheelLog || [])].slice(0, 6);
        Vibe.state.set({ wheelLog: log });
        renderLog(); updBtn();
        let claimed = false;
        const claim = (from) => {
          if (claimed) return; claimed = true;
          if (p.vib) Vibe.reward({ vibiki: p.vib, xp: 10, from });
          else if (p.xp) Vibe.reward({ xp: p.xp, from });
          else Vibe.reward({ xp: 5, from, silent: true });
          Vibe.achieve("spinner");
        };
        sc.to(() => {
          Vibe.modal(`
            <div class="m-emo float">${p.e}</div>
            <div class="display">${p.t}</div>
            <p>${p.d}</p>
            <button class="btn black block xl" data-claim>${p.vib ? `Забрать ${p.vib} 🪙` : p.xp ? "Забрать опыт ⚡" : "Ну ок 🙃"}</button>`, {
            sound: "success",
            onMount(m, close) {
              m.querySelector("[data-claim]").addEventListener("click", (e) => { claim(e.currentTarget); close(); });
            },
            onClose() { claim(null); },
          });
        }, 650);
      }

      sc.on(btn, "click", spin);
      sc.on(wheel, "click", () => { if (!spinning) { FX.bump(wheel); FX.toast("Жми на кнопку, колесо стесняется", "🎡"); } });
      renderLog(); updBtn();
      return () => sc.clear();
    },
  });

  /* ============================================================
     6. STORIES — Vibe.openStories(startIndex)
     ============================================================ */
  const STORIES = [
    { name: "Новое", e: "✨", go: "wheel", cta: "Крутить колесо 🎡", slides: [
      { bg: "c-grad", k: "Vibe · обновление", t: "Vibe теперь умеет всё", x: "Даже то, о чём вы не просили. Особенно это.", hero: "🚀", sm: ["✨", "⭐", "💜"] },
      { bg: "c-yellow", k: "Новинка", t: "Колесо вайба каждый день", x: "Первый спин бесплатно. Второй — тоже бесплатно, но за 50 вайбиков.", hero: "🎡", sm: ["🪙", "🎉", "💎"] },
      { bg: "c-mint", k: "А ещё", t: "Лоу-фай, игры и такси", x: "Всё в одном приложении, чтобы вам некуда было уйти.", hero: "🎧", sm: ["🚕", "🕹️", "📈"] },
    ] },
    { name: "Плюс", e: "💎", go: "plus", cta: "Подключить Плюс 💎", slides: [
      { bg: "c-violet", k: "Подписка", t: "Плюс Вайб", x: "Кэшбек ×2, музыка без рекламы и лёгкое чувство превосходства.", hero: "💎", sm: ["✨", "👑", "💜"] },
      { bg: "c-lilac", t: "Первый месяц — 0 ₽", x: "Следующие — по любви. И по 299 ₽. Отменить можно в любой момент*", hero: "🥰", sm: ["💸", "💖", "⭐"], fine: "*момент наступит в 2031 году" },
    ] },
    { name: "Концерты", e: "🎤", go: "tickets", cta: "Купить билет 🎟️", slides: [
      { bg: "c-pink", k: "Только один вечер", t: "«Ипотека в 25» снова в городе", x: "Хиты «Платёж», «Ставка ЦБ» и «Не звони мне, банк».", hero: "🎤", sm: ["🎸", "🔥", "🎶"] },
      { bg: "c-black", t: "Осталось 3 билета", x: "Их всегда остаётся 3. Это наш маркетинг, и он работает.", hero: "🎟️", sm: ["⏳", "😱", "💥"] },
    ] },
    { name: "Кэшбек", e: "🤑", go: "pay", cta: "Забрать кэшбек 🤑", slides: [
      { bg: "c-lime", k: "Акция", t: "Кэшбек 30%", x: "на шаги вправо, вдохи по чётным и покупки, которые вы не совершали.", hero: "🤑", sm: ["🪙", "💚", "✨"] },
      { bg: "c-orange", t: "Кэшбек приходит вайбиками", x: "А вайбики приходят прямо в сердце. Минуя кошелёк.", hero: "🪙", sm: ["💛", "⭐", "🎉"] },
    ] },
    { name: "Заботик", e: "🤖", go: "chats", cta: "Поболтать с Заботиком 💬", slides: [
      { bg: "c-mint", k: "Твой ИИ-друг", t: "Привет, я Заботик!", x: "Я забочусь о тебе 24/7. Даже когда ты спишь. Особенно когда ты спишь.", zab: true, sm: ["💚", "✨", "🫶"] },
      { bg: "c-sky", t: "Спроси меня о чём угодно", x: "Отвечу про кредит. Я всегда отвечаю про кредит. Это забота.", hero: "💬", sm: ["🤖", "❓", "💡"] },
    ] },
    { name: "Ипотека", e: "🏠", go: "home-buy", cta: "Выбрать квартиру 🏠", slides: [
      { bg: "c-sky", k: "Vibe Дом", t: "Ставка 0,1%*", x: "Своё жильё ближе, чем кажется.", hero: "🏠", sm: ["🔑", "✨", "🏡"], fine: "*звёздочка тоже является частью ставки" },
      { bg: "c-coral", t: "Квартира за 25 лет", x: "Ну или за 30. Мы никуда не торопимся. И вы — тоже.", hero: "🔑", sm: ["⏳", "🧓", "💸"] },
      { bg: "c-yellow", t: "14 м² мечты", x: "С видом на другие 14 м² мечты. И на парковку.", hero: "🛋️", sm: ["🪟", "🪴", "📐"] },
    ] },
    { name: "Вакансии", e: "💼", go: "job", cta: "Откликнуться 💼", slides: [
      { bg: "c-orange", k: "Мы нанимаем", t: "Ищем стажёра с опытом 10 лет", x: "Молодая дружная команда, печеньки и дедлайн вчера.", hero: "💼", sm: ["🍪", "☕", "🔥"] },
      { bg: "c-blue", t: "Зарплата: конкурентная", x: "Конкурирует с пособием. И иногда даже выигрывает.", hero: "💸", sm: ["📈", "🤝", "✨"] },
    ] },
  ];
  Vibe.STORIES = STORIES.map((s) => ({ name: s.name, e: s.e }));
  const DARK_BG = ["c-black", "c-blue", "c-violet", "c-grad"];
  const SM_POS = ["left:6%;top:36%", "right:8%;top:20%", "left:10%;bottom:24%"];
  const STORY_MS = 5000;

  Vibe.openStories = function (startIndex = 0) {
    if (document.querySelector(".fz-st")) return;
    let si = clamp(startIndex | 0, 0, STORIES.length - 1), sl = 0, elapsed = 0, paused = false, closed = false, raf = 0, last = performance.now();
    const ov = document.createElement("div");
    ov.className = "fz-st";
    ov.innerHTML = `
      <div class="fz-st-top">
        <div class="fz-st-bars" data-bars></div>
        <div class="fz-st-head">
          <div class="fz-st-ava" data-ava></div>
          <div class="fz-st-name" data-name></div>
          <button class="fz-st-x" data-x aria-label="Закрыть">✕</button>
        </div>
      </div>
      <div class="fz-st-pause">⏸️</div>`;
    document.body.appendChild(ov);
    ov.addEventListener("animationend", function once() { ov.style.animation = "none"; ov.removeEventListener("animationend", once); });
    FX.sound.whoosh(); FX.haptic(10);
    let card = null;

    const markSeen = (i) => {
      const seen = Object.assign({}, S().seenStories || {}, { [i]: true });
      Vibe.state.set({ seenStories: seen });
    };
    function slideHTML(story, s) {
      const dark = DARK_BG.includes(s.bg);
      return `
        <div class="fz-st-slide ${s.bg} enter" style="${dark ? "color:#fff" : ""}">
          ${s.k ? `<span class="badge fz-st-kicker" style="background:#fff;color:var(--ink)">${s.k}</span>` : ""}
          <div class="fz-st-title">${s.t}</div>
          <div class="fz-st-text">${s.x}</div>
          ${s.zab ? `<div class="fz-st-hero float" style="bottom:130px;right:10px">${Vibe.zabotik(170, "smile")}</div>` : `<div class="fz-st-hero emo float">${s.hero}</div>`}
          ${(s.sm || []).map((e, i) => `<span class="fz-st-sm emo float d${i + 1}" style="${SM_POS[i]}">${e}</span>`).join("")}
          <div class="fz-st-cta">
            <button class="btn xl block ${dark ? "lime" : "black"}" data-cta>${story.cta}</button>
            ${s.fine ? `<div class="fine" style="text-align:center;${dark ? "color:rgba(255,255,255,.75)" : ""}">${s.fine}</div>` : ""}
          </div>
        </div>`;
    }
    function bars() {
      const st = STORIES[si];
      ov.querySelector("[data-bars]").innerHTML = st.slides.map((_, i) => `<i><b style="width:${i < sl ? 100 : 0}%"></b></i>`).join("");
    }
    function renderSlide() {
      const st = STORIES[si], s = st.slides[sl];
      card.innerHTML = slideHTML(st, s);
      const slide = card.firstElementChild;
      setTimeout(() => slide.classList.remove("enter"), 750);
      const dark = DARK_BG.includes(s.bg);
      ov.querySelector("[data-name]").style.color = dark ? "#fff" : "var(--ink)";
      elapsed = 0; bars();
    }
    function showStory(i, dir = 1, slide = 0) {
      const W = ov.clientWidth || innerWidth, half = W / 2;
      const old = card;
      si = i; sl = slide;
      card = document.createElement("div");
      card.className = "fz-st-card";
      ov.insertBefore(card, ov.querySelector(".fz-st-top"));
      const st = STORIES[si];
      ov.querySelector("[data-ava]").textContent = st.e;
      ov.querySelector("[data-name]").innerHTML = `${st.name}<small>Vibe · только что</small>`;
      renderSlide();
      markSeen(si);
      if (old) {
        const cubeT = (deg) => `translateZ(${-half}px) rotateY(${deg}deg) translateZ(${half}px)`;
        const opts = { duration: 480, easing: "cubic-bezier(.3,.7,.25,1)" };
        old.animate([{ transform: cubeT(0), filter: "brightness(1)" }, { transform: cubeT(dir > 0 ? -90 : 90), filter: "brightness(.5)" }], opts).onfinish = () => old.remove();
        card.animate([{ transform: cubeT(dir > 0 ? 90 : -90), filter: "brightness(.5)" }, { transform: cubeT(0), filter: "brightness(1)" }], opts);
        FX.sound.swipe();
      }
    }
    function next() {
      const st = STORIES[si];
      if (sl < st.slides.length - 1) { sl++; renderSlide(); FX.sound.tap(); }
      else if (si < STORIES.length - 1) showStory(si + 1, 1);
      else close();
    }
    function prev() {
      if (sl > 0) { sl--; renderSlide(); FX.sound.tap(); }
      else if (si > 0) showStory(si - 1, -1, 0);
      else { elapsed = 0; FX.bump(card.firstElementChild); }
    }
    function loop(t) {
      if (closed) return;
      const dt = t - last; last = t;
      if (!paused && !document.hidden) elapsed += dt;
      const b = ov.querySelectorAll("[data-bars] i b")[sl];
      if (b) b.style.width = Math.min(100, (elapsed / STORY_MS) * 100) + "%";
      if (elapsed >= STORY_MS) next();
      raf = requestAnimationFrame(loop);
    }
    function close() {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      clearTimeout(holdT);
      document.removeEventListener("keydown", onKey);
      ov.style.animation = ""; ov.style.transform = ""; ov.style.transition = "";
      ov.classList.add("out");
      setTimeout(() => ov.remove(), 320);
      FX.sound.whoosh();
      window.dispatchEvent(new Event("vibe:stories-seen"));
    }

    // Жесты: тап — вперёд/назад, удержание — пауза, свайп вниз — закрыть
    let down = null, holdT = 0, held = false, dragY = 0;
    ov.addEventListener("pointerdown", (e) => {
      if (e.target.closest("[data-x],[data-cta]")) return;
      down = { x: e.clientX, y: e.clientY }; held = false; dragY = 0;
      holdT = setTimeout(() => { held = true; paused = true; ov.classList.add("held"); FX.haptic(8); }, 220);
    });
    ov.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dy = e.clientY - down.y;
      if (dy > 12 && Math.abs(dy) > Math.abs(e.clientX - down.x)) {
        clearTimeout(holdT); paused = true; dragY = dy;
        ov.style.transition = "none";
        ov.style.transform = `translateX(-50%) translateY(${dy}px) scale(${Math.max(0.8, 1 - dy / 1600)})`;
        ov.style.borderRadius = Math.min(40, dy / 4) + "px";
      }
    });
    const up = (e) => {
      if (!down) return;
      clearTimeout(holdT);
      const d = down; down = null;
      if (dragY) {
        if (dragY > 110) { close(); return; }
        ov.style.transition = "transform .35s var(--spring), border-radius .35s";
        ov.style.transform = "translateX(-50%)"; ov.style.borderRadius = "0";
        paused = false; dragY = 0; return;
      }
      if (held) { held = false; paused = false; ov.classList.remove("held"); return; }
      if (e.type === "pointercancel") return;
      const r = ov.getBoundingClientRect();
      if (d.x - r.left < r.width * 0.33) prev(); else next();
    };
    ov.addEventListener("pointerup", up);
    ov.addEventListener("pointercancel", up);
    ov.addEventListener("click", (e) => {
      if (e.target.closest("[data-x]")) { close(); return; }
      const cta = e.target.closest("[data-cta]");
      if (cta) {
        const go = STORIES[si].go;
        FX.burst(cta, { emojis: [STORIES[si].e, "✨", "💜"], count: 12 });
        FX.sound.success();
        close();
        setTimeout(() => { if (Vibe.screens[go]) Vibe.go(go); else FX.toast("Скоро в Vibe. Уже предодобрено", "🚧"); }, 180);
      }
    });
    function onKey(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    document.addEventListener("keydown", onKey);

    showStory(si, 1);
    raf = requestAnimationFrame(loop);
    return close;
  };
})();
