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
  .fz-map { position: relative; height: 58vh; min-height: 320px; max-height: 560px; }
  .fz-map .fz-vm { position: absolute; inset: 0; }
  .fz-map-tag { position: absolute; z-index: 3; pointer-events: none; }
  .fz-radar circle { transform-box: fill-box; transform-origin: center; animation: fz-radar 1.8s ease-out infinite; opacity: 0; }
  .fz-radar circle:nth-child(2) { animation-delay: .6s; } .fz-radar circle:nth-child(3) { animation-delay: 1.2s; }
  @keyframes fz-radar { from { transform: scale(.2); opacity: .85; } to { transform: scale(4.5); opacity: 0; } }
  .fz-panel { position: relative; z-index: 4; margin-top: -34px; border-radius: 30px; padding: 18px 16px 16px; }
  .fz-ell { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fz-x { margin-left: auto; height: 32px; padding: 0 10px; border: 2px solid var(--ink); border-radius: 12px; background: var(--yellow); font-weight: 800; font-size: 12px; flex: 0 0 auto; box-shadow: 0 2px 0 var(--ink); }
  .fz-trip { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
  .fz-trip .badge { background: var(--paper); }
  .fz-tar .tm { font-size: 11px; font-weight: 800; display: block; margin-top: 4px; }
  .fz-workcard { display: flex; gap: 10px; align-items: center; margin-top: 14px; text-align: left; }
  .fz-dest { display: flex; align-items: center; gap: 10px; background: var(--bg); border: 2px solid var(--ink); border-radius: 18px; padding: 10px 12px; font-weight: 800; font-size: 14px; }
  .fz-dest .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--blue); border: 2.5px solid var(--ink); flex: 0 0 auto; }
  .fz-chip-dest.on { background: var(--violet); color: #fff; }
  .fz-chip-ev { background: var(--lilac); border-style: dashed; }
  .fz-chip-ev.on { background: var(--violet); color: #fff; border-style: solid; }
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
  .fz-player { position: relative; overflow: hidden; }
  .fz-ad { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 22px; text-align: center; color: var(--ink); border-radius: inherit; animation: fz-pop .45s var(--spring) both; }
  .fz-ad[hidden] { display: none; }
  .fz-ad .tag { position: absolute; top: 14px; left: 14px; background: #fff; }
  .fz-ad .cd { position: absolute; top: 14px; right: 14px; background: var(--ink); color: #fff; }
  .fz-ad .e { font-size: 84px; }
  .fz-ad .display { font-size: 30px; }
  .fz-ad p { font-weight: 800; font-size: 15px; max-width: 260px; }
  .fz-ad-bar { width: 80%; height: 8px; border: 2px solid var(--ink); border-radius: 999px; background: #fff; overflow: hidden; margin-top: 6px; }
  .fz-ad-bar i { display: block; height: 100%; background: var(--ink); width: 0; transition: width 1s linear; }
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

  .fz-mini { font-size: 10px !important; padding: 2px 6px !important; vertical-align: 2px; margin-left: 2px; }
  .fz-lvl { margin-top: 10px; height: 34px; padding: 0 12px; font-size: 12px; background: #fff; box-shadow: var(--shadow-sm); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fz-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0 4px; }
  .fz-tabs .chip { justify-content: center; padding: 0 6px; font-size: 13px; position: relative; }
  .fz-dot { position: absolute; top: 4px; right: 6px; width: 10px; height: 10px; border-radius: 50%; background: #ff3b3b; border: 2px solid var(--ink); animation: pulse 1.2s ease-in-out infinite; }
  .fz-dot[hidden] { display: none; }
  .fz-depo, .fz-coach { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 12px; position: relative; font: inherit; color: inherit; }
  .fz-coach { margin-top: 18px; }
  .fz-news { margin-bottom: 12px; padding: 14px; }
  .fz-news-e { font-size: 30px; line-height: 1; }
  .fz-news-t { display: block; font-size: 15px; line-height: 1.3; margin: 6px 0 8px; }
  .fz-fx { display: flex; flex-wrap: wrap; gap: 6px; }
  .fz-fx .badge { font-size: 11px; padding: 3px 8px; }
  .fz-bup { background: #c9f7d9 !important; } .fz-bdown { background: #ffd0d0 !important; }
  .fz-an { display: flex; gap: 8px; margin-top: 10px; padding: 8px 10px; border-radius: 14px; background: rgba(255,255,255,.7); border: 2px dashed rgba(14,14,18,.25); font-size: 12px; font-weight: 700; line-height: 1.35; }
  .fz-insider { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
  .fz-lvlcard { cursor: pointer; }
  .fz-alloc, .fz-risk { padding: 12px; min-width: 0; }
  .fz-donut { width: 100%; max-width: 130px; display: block; margin: 6px auto; }
  .fz-legend { display: flex; flex-direction: column; gap: 3px; font-size: 11px; font-weight: 800; }
  .fz-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; border: 1.5px solid var(--ink); margin-right: 5px; vertical-align: -1px; }
  .fz-gauge { width: 100%; display: block; margin: 8px 0 2px; }
  .fz-needle { transform-origin: 60px 62px; transform-box: view-box; transition: transform 1.2s var(--spring); animation: fz-needle 1.4s var(--spring) both; }
  @keyframes fz-needle { from { transform: rotate(-90deg); } }
  .fz-pl { width: 100%; height: 110px; display: block; }
  .fz-pl rect { transform-box: fill-box; transform-origin: center; animation: fz-grow .6s var(--spring) both; animation-delay: calc(var(--i) * 25ms); }
  @keyframes fz-grow { from { transform: scaleY(0); } }
  .fz-cal { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
  .fz-cal div { aspect-ratio: 1 / 1; border-radius: 8px; border: 2px solid rgba(14,14,18,.2); background: rgba(255,255,255,.55); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; line-height: 1; min-width: 0; overflow: hidden; }
  .fz-cal div small { font-size: 9px; font-weight: 800; opacity: .6; }
  .fz-cal div.on { background: var(--yellow); border-color: var(--ink); animation: jelly .7s var(--spring); }
  .fz-ach { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .fz-ach .card { padding: 12px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .fz-ach b { font-size: 13px; } .fz-ach small { font-size: 11px; font-weight: 700; }
  .fz-tax { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; }

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
     1. VIBE MAPS — живая карта города, такси с живым сёрджем
     ============================================================ */
  const PLACES = {
    home: { e: "🏠", t: "Домой", s: "Дом", note: "Диван, вайфай и ипотека" },
    work: { e: "💼", t: "На работу", s: "Работа", note: "Опенспейс, место у принтера" },
    park: { e: "🌳", t: "Парк", s: "Парк", note: "Без вайфая. Страшно, но полезно" },
    supermarket: { e: "🛒", t: "Супермаркет", s: "Супермаркет", note: "Зайду за хлебом. Выйду с тележкой" },
    club: { e: "🎤", t: "Клуб", s: "Клуб", note: "Фейсконтроль по кредитному рейтингу" },
    clinic: { e: "🏥", t: "Клиника", s: "Клиника", note: "Запись через 3 недели, приём через 4" },
    hq: { e: "🏢", t: "Vibe HQ", s: "Vibe HQ", note: "Башня Корпорации. Тут всё решают за тебя" },
    metro1: { e: "Ⓜ️", t: "Метро", s: "м. Кредитная", note: "Сигнала нет, зато честно" },
    metro2: { e: "Ⓜ️", t: "Метро", s: "м. Сити", note: "Вход по лицу, выход по ситуации" },
    wheel: { e: "🎡", t: "Колесо", s: "Колесо вайба", note: "Крутится. Как и твои мысли" },
  };
  const PIN_COL = { home: "#ffe14d", work: "#8fd8ff", park: "#c6ff4d", supermarket: "#7cf5c8", club: "#ff8a8a", clinic: "#ffffff", hq: "#e6dcff", metro1: "#ffffff", metro2: "#ffffff", wheel: "#ffb547" };
  const DEST_CHIPS = ["home", "work", "park", "supermarket", "club", "clinic", "hq"];
  const PIN_KEYS = [...DEST_CHIPS, "metro1", "metro2", "wheel"];
  const MODES_BASE = [
    { id: "walk", e: "🚶", n: "Пешком", note: "Кардио бесплатно", veh: "🚶", col: "#c6ff4d", route: "#12a150" },
    { id: "metro", e: "🚇", n: "Метро", note: "Час пик 24/7", veh: "🚇", col: "#8fd8ff", route: "#3d7bff" },
    { id: "scooter", e: "🛴", n: "Самокат", note: "50 ₫ + 7 ₫/мин", veh: "🛴", col: "#7cf5c8", route: "#12a150" },
    { id: "eco", e: "🚕", n: "Эконом", note: "Кондиционер — опция", veh: "🚕", col: "#ffe14d", m: 1, sub: 3, taxi: true },
    { id: "comfort", e: "✨", n: "Комфорт", note: "Молчание за 49 ₫", veh: "🚙", col: "#ffffff", m: 1.4, sub: 5, taxi: true },
    { id: "vibe", e: "💜", n: "Вайб", note: "Неон, бас и пенка", veh: "🚗", col: "#ff6bcb", m: 1.9, sub: 6, taxi: true, neon: true },
    { id: "biz", e: "🖤", n: "Бизнес", note: "Вода и лёгкий снобизм", veh: "🚘", col: "#d9c8ff", m: 3, sub: 8, taxi: true },
  ];
  const METRO_PRICE = 61;
  // Кикшеринг: 50 ₫ старт + 7 ₫/мин, ~16 км/ч
  const SCOOT_START = 50, SCOOT_MIN = 7;
  // Своя машина (если в Vibe.inv есть cat:"car"): бензин 8 ₫/км, без сёрджа, но с риском штрафа
  const FUEL_PER_KM = 8;
  const PARK_FINE = 1000;
  const CAR_MODE = { id: "car", e: "🚗", n: "Своя машина", note: "Бензин 8 ₫/км", veh: "🚗", col: "#7cf5c8", route: "#ff6b2c", own: true };
  const CAR_LINES = ["Ищешь, куда приткнуться 🅿️", "Навигатор: «через 200 м — пробка» 🚦", "Подпеваешь радио. Никто не слышит 🎶", "Бензин дорожает прямо на глазах ⛽", "Самокат подрезал. Ты выше этого 🛴", "Камера подмигнула вспышкой 📸"];
  const EV_PIN = "#8b5cff";
  const DRIVERS = [
    { n: "Рустам", ava: "🧔🏻", car: "Лада Вайбина · жёлтая", plate: "В 777 ИБ", reg: "77", r: "4,98", perks: ["Знает короткий путь (длинный)", "Шансон по запросу"] },
    { n: "Валерий", ava: "👨🏼‍🦳", car: "Кия Чилл · белая", plate: "А 404 НЕ", reg: "99", r: "4,97", perks: ["Молчит, если попросить", "Зарядка Type-C"] },
    { n: "Алина", ava: "👩🏻‍🦰", car: "Тесля, но не та · синяя", plate: "М 001 ВБ", reg: "777", r: "5,00", perks: ["Ароматизатор «Вайб»", "Подкаст про крипту"] },
    { n: "Гоша", ava: "🧑🏽", car: "Солярис Про Макс · серый", plate: "О 123 КК", reg: "197", r: "4,91", perks: ["Едет как в последний раз", "Водичка — 89 ₫"] },
  ];
  const CARS = { vibe: "Солярис с диско-шаром · неон", biz: "Майбах (в рассрочку) · чёрный" };
  const SEARCH_LINES = ["Уговариваем водителя…", "Водитель доедает шаурму…", "Сравниваем ваш рейтинг с его…", "Повышаем спрос вручную…", "Ищем ближайшего (в 7 км)…", "Почти нашли. Честно."];
  const RIDE_LINES = ["Водитель включил шансон 🎶", "Объезжаем пробку через другую пробку 🚦", "Ароматизатор «Новая машина 2009» 🌲", "Водитель рассказывает про крипту 📈", "Едем по навигатору. Почти 🧭", "Окно не закрывается. Это фича 🌬️"];
  const WALK_LINES = ["Шаги засчитаны. Страховка довольна 👟", "Обогнал самокат. Самокат стоял 🛴", "Голубь уступил дорогу. Уважение 🐦", "Пульс 112. Это кардио или цены? 💓", "Время идёт по-настоящему. Как и жизнь ⏳", "Светофор: 90 секунд красного. Медитация 🚦"];
  const METRO_LINES = ["Осторожно, двери закрываются. Как и вакансии 🚪", "Сигнала нет. Наконец-то тишина 📵", "Кто-то читает книгу. Бумажную! 📖", "Пересадка на станции «Кредитная» 💳", "Поезд следует до конечной. Как и зарплата 🚇"];
  const SCOOT_LINES = ["Ветер в лицо, тариф в спину 🛴", "Объехал лужу. Почти 💦", "Пешеходы смотрят с осуждением 👀", "Минута — 7 ₫. Каждая кочка — бесплатно 🪨", "Самокат пищит: «аккумулятор 12%» 🔋"];
  const LATE_TXT = {
    interview: (e) => `HR записал опоздание в «soft skills». Шанс на оффер −${Math.round((Vibe.sched.latePenalty ? Vibe.sched.latePenalty(e) : 0.1) * 100)}%`,
    date: () => "Тебя ждали с улыбкой. Улыбка немного устала",
    friend: () => "Друзья уже заказали. И съели. Твоё тоже",
    family: () => "Мама сказала «ничего страшного» тем самым голосом",
    concert: () => "Первую песню слышал из гардероба",
  };

  const kmTxt = (k) => String(k).replace(".", ",") + " км";
  const hhmm = (min) => { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const fmtD = (n) => { n = Math.max(0, Math.round(n)); return n >= 60 ? `${Math.floor(n / 60)} ч${n % 60 ? ` ${n % 60} мин` : ""}` : `${n} мин`; };
  const gameInfo = () => (Vibe.game && Vibe.game.info ? Vibe.game.info() : null);
  const gNow = () => (Vibe.game && Vibe.game.minutes ? Vibe.game.minutes() : 0);
  const isRush = (i) => !!i && ((i.hour >= 8 && i.hour < 10) || (i.hour >= 18 && i.hour < 20));
  const wxNow = () => (Vibe.weather ? Vibe.weather.now() : { e: "☁️", t: 3, kind: "cloud", label: "пасмурно" });
  const tDeg = (t) => `${t > 0 ? "+" : ""}${t}°`;
  function placeName(k) {
    const s = S();
    if (k === "home") return s.home && s.home.title ? `Дом · ${s.home.title}` : "Дом · ул. Ипотечная, 25";
    if (k === "work") return s.job ? `Работа · ${s.job.company}` : "Работа";
    const p = Vibe.map.place(k);
    return p ? p.label : pinfo(k).s;
  }
  // События календаря с местом на карте (ближайшие 5)
  const smin = (e) => (Vibe.sched ? Vibe.sched.startMin(e) : e.day * 1440 + e.hour * 60 + (e.min || 0));
  function evList() {
    if (!Vibe.sched) return [];
    // На карте — только то, что скоро (до 2 игровых суток): далёкие дни рождения не мигают
    try { const now = Vibe.game.minutes(); return Vibe.sched.upcoming(8).filter((e) => e.place && Vibe.map.place(e.place) && Vibe.sched.startMin(e) - now < 2880).slice(0, 5); } catch (err) { return []; }
  }
  const evAt = (k) => evList().find((e) => e.place === k);
  function evWhen(e) {
    const i = gameInfo();
    const t = hhmm(e.hour * 60 + (e.min || 0));
    const d = i ? e.day - i.day : 0;
    return d <= 0 ? t : d === 1 ? `завтра ${t}` : `${t} · через ${d} дн.`;
  }
  const short = (s, n = 16) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  // Описание любой точки: из PLACES или из Vibe.map.place (restaurant:N, office:Имя…)
  function pinfo(k) {
    if (PLACES[k]) return PLACES[k];
    const p = Vibe.map.place(k);
    const ev = evAt(k);
    const label = (p && p.label) || "Точка на карте";
    return { e: (p && p.e) || (ev && ev.e) || "📍", t: label, s: label, note: ev ? `${ev.e} ${ev.title} · ${evWhen(ev)}` : "Точка из твоего календаря" };
  }
  // Где игрок: последняя точка поездки или дом (в пути — точка старта поездки)
  function loadFrom() {
    const tr = Vibe.trip && Vibe.trip.current();
    if (tr) return tr.from;
    const k = S().fz_lastPos;
    return k && Vibe.map.place(k) ? k : "home";
  }
  const ownCar = () => (Vibe.inv && Vibe.inv.list ? Vibe.inv.list("car")[0] : null) || null;
  // Случайная точка на соседней улице — оттуда выезжает таксист
  function nearbyStart(p) {
    const col = clamp(Math.floor((p.x - 60) / 172), 0, 4), row = clamp(Math.floor((p.y - 60) / 172), 0, 4);
    for (let i = 0; i < 10; i++) {
      const d = Vibe.map.door(clamp(col + ri(-1, 1), 0, 4), clamp(row + pick([-1, 1]), 0, 4), ri(0, 5));
      if (Math.hypot(d.x - p.x, d.y - p.y) > 130) return d;
    }
    return Vibe.map.door(col > 0 ? col - 1 : col + 1, row, 1);
  }
  const MAPS_CSS = `
  .fz-top { position: absolute; z-index: 5; top: 10px; left: 10px; right: 10px; display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: 2.5px solid var(--ink); border-radius: 16px; background: var(--ink); color: #fff; font-weight: 900; font-size: 13px; box-shadow: 0 3px 0 rgba(0,0,0,.25); pointer-events: none; font-variant-numeric: tabular-nums; }
  .fz-top b { color: var(--lime); }
  .fz-top .tr { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .95; }
  .fz-top.moving { background: #8b5cff; }
  .fz-wx { top: 56px; left: 10px; display: flex; gap: 8px; align-items: center; padding: 6px 10px 6px 8px; background: #fff; border: 2.5px solid var(--ink); border-radius: 16px; box-shadow: var(--shadow-sm); font-weight: 900; font-size: 12px; max-width: 70%; }
  /* Карта: плашки не перекрывают компас и кнопки масштаба */
  .fz-map .vmap-ui { top: 60px; }
  .fz-map .vmap-hud { bottom: 46px; } /* панель «Куда едем?» наезжает на карту на 34px */
  .fz-jam { right: 12px; left: auto; bottom: 48px; top: auto; transform: rotate(4deg); }
  .fz-wx .we { font-size: 26px; line-height: 1; }
  .fz-wx small { display: block; font-weight: 800; font-size: 10.5px; opacity: .75; }
  .fz-wx.wet { background: #d9ecff; } .fz-wx.sun { background: #fff6bf; } .fz-wx.storm { background: #e6dcff; }
  .fz-chip-ev small { display: block; font-size: 10.5px; font-weight: 800; opacity: .85; margin-top: 1px; }
  .fz-chip-ev.ok small { color: #0b7a3a; } .fz-chip-ev.warn small { color: #b25b00; } .fz-chip-ev.late small { color: #c0182a; }
  .fz-chip-ev.on small { color: #fff; }
  .fz-chip-ev { height: auto; min-height: 40px; padding-top: 5px; padding-bottom: 5px; text-align: left; line-height: 1.15; }
  .fz-clock { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; margin: 10px 0 12px; padding: 10px 12px; border: var(--line); border-radius: 20px; background: var(--ink); color: #fff; }
  .fz-clock small { display: block; font-size: 11px; font-weight: 800; opacity: .7; }
  .fz-clock b { display: block; font-family: var(--display, inherit); font-size: 30px; line-height: 1.05; font-variant-numeric: tabular-nums; }
  .fz-clock .ar { font-size: 22px; } .fz-clock .r { text-align: right; } .fz-clock .r b { color: var(--lime); }
  .fz-tar.off { opacity: .55; filter: grayscale(.7); }
  .fz-tar.off .pr { text-decoration: line-through; }
  .fz-wait { margin-top: 12px; text-align: left; }
  .fz-wait .cd { display: inline-block; margin-top: 6px; }
  .fz-fit { display: block; margin-top: 8px; padding: 8px 12px; border: 2px solid var(--ink); border-radius: 14px; font-weight: 800; font-size: 13px; background: var(--paper); }
  .fz-fit.ok { background: var(--lime); } .fz-fit.warn { background: var(--yellow); } .fz-fit.late { background: #ffd0d0; }
  `;
  if (!document.getElementById("fz-style-trip")) {
    const stl = document.createElement("style");
    stl.id = "fz-style-trip"; stl.textContent = MAPS_CSS;
    document.head.appendChild(stl);
  }

  Vibe.screen("maps", {
    render() {
      const i = gameInfo();
      const rush = isRush(i);
      return `
        ${Vibe.ui.head("Vibe Maps", rush ? "час пик, держись" : "такси за 3 мин (обычно за 7)", Vibe.ui.vibikiPill())}
        <div class="fz-map">
          <div class="fz-vm" data-vmhost></div>
          <div class="fz-top" data-top></div>
          <div class="fz-map-tag fz-wx" data-wx></div>
          <div class="fz-map-tag sticker fz-jam" style="background:#ff3b3b;color:#fff;font-size:12px">Пробки: ${rush ? 9 : ri(4, 7)} баллов 🔥</div>
        </div>
        <div class="card fz-panel" data-panel></div>
        <div class="fine" style="text-align:center">Время в пути — настоящее игровое: 1 минута = 1 секунда. Перемотки нет, есть такси. Стоимость поездки может измениться в любую сторону, но обычно вверх.</div>`;
    },
    mount(root, params = {}) {
      const sc = scope();
      const MP = Vibe.map;
      const TR = Vibe.trip;
      const panel = root.querySelector("[data-panel]");
      const pt = (k) => MP.place(k);
      const rush = isRush(gameInfo());
      const car = ownCar();
      const MODES = car ? [...MODES_BASE, Object.assign({}, CAR_MODE, { note: `${short(car.name, 14)} · 8 ₫/км` })] : MODES_BASE;
      const TAXI_IDX = MODES.map((m, i) => (m.taxi ? i : -1)).filter((i) => i >= 0);
      const wxSurge = () => (Vibe.weather ? Vibe.weather.surge() : 1);
      const baseSurge = () => MODES.map((m) => (m.taxi ? Math.round((rush ? 1.2 : 1) * wxSurge() * 10) / 10 : 1));
      const scootOk = () => (Vibe.weather ? Vibe.weather.scooter() : { ok: true });
      const st = { phase: "pick", from: loadFrom(), to: null, trip: null, mode: MODES.findIndex((m) => m.id === "eco"), surge: baseSurge(), driver: null, price: 0, rated: 0, tipped: false, run: 0, sgen: 0, drv: null, last: null, veh: null, tick: 0 };

      const ctrl = MP.create(root.querySelector("[data-vmhost]"), {
        pins: [],
        fit: [pt(st.from), pt("home"), pt("work")].filter(Boolean),
        onPin: (id) => onPin(id),
      });

      /* ----- Расчёты ----- */
      function trip(from = st.from, to = st.to) {
        const pts = MP.path(pt(from), pt(to));
        const km = Math.max(0.3, MP.km(pts));
        return { pts, km, walk: MP.minutes(pts, "walk"), metro: MP.minutes(pts, "metro"), taxi: MP.minutes(pts, "taxi"), scooter: Math.max(3, Math.round((km / 16) * 60) + 2) };
      }
      const modeMin = (i, T = st.trip) => { const m = MODES[i]; return m.id === "walk" ? T.walk : m.id === "metro" ? T.metro : m.id === "scooter" ? T.scooter : m.id === "car" ? Math.max(3, T.taxi - 2) : T.taxi + m.sub; };
      const taxiPrice = (km, mult, surge) => Math.ceil(((99 + 18 * km) * mult * surge) / 10) * 10 - 1;
      const price = (i, T = st.trip) => {
        const m = MODES[i];
        if (m.id === "walk") return 0;
        if (m.id === "metro") return METRO_PRICE;
        if (m.id === "scooter") return SCOOT_START + SCOOT_MIN * T.scooter;
        if (m.id === "car") return Math.max(FUEL_PER_KM, Math.round(T.km * FUEL_PER_KM));
        return taxiPrice(T.km, m.m, st.surge[i]);
      };
      const steps = (km) => Math.round(km * 1350);
      const walkVib = (km) => clamp(Math.round(km * 8), 5, 50);
      const surging = () => st.surge.some((s) => s > 1.001);
      const kindOf = (m) => (m.taxi ? "taxi" : m.id);

      /* ----- Успеваешь ли к событию ----- */
      // Чип события: «через 1 ч 10 мин · успеваешь пешком / только на такси»
      function evReach(e) {
        const left = smin(e) - gNow();
        if (left <= 0) { const since = -left; return { t: since <= e.dur ? `идёт уже ${fmtD(since)}` : "уже закончилось", c: "late" }; }
        const head = `через ${fmtD(left)}`;
        if (!pt(st.from) || st.from === e.place) return { t: `${head} · ты на месте`, c: "ok" };
        const T = trip(st.from, e.place);
        if (T.walk <= left) return { t: `${head} · успеваешь пешком`, c: "ok" };
        if (T.metro <= left) return { t: `${head} · успеваешь на метро`, c: "ok" };
        if (T.taxi + 3 <= left) return { t: `${head} · только на такси`, c: "warn" };
        return { t: `${head} · опоздаешь на ${fmtD(T.taxi + 3 - left)}`, c: "late" };
      }
      // Для выбранного транспорта: во сколько приедешь относительно начала
      function fitFor(e, arriveAt) {
        if (!e) return null;
        const s0 = smin(e), W = (Vibe.sched && Vibe.sched.WINDOW) || 120, at = hhmm(s0);
        if (arriveAt < s0 - W) return { c: "warn", t: `⏰ Приедешь в ${hhmm(arriveAt)} — рано. Зал ожидания откроется в ${hhmm(s0 - W)}, начало в ${at}` };
        if (arriveAt <= s0) return { c: "ok", t: `✅ Приедешь в ${hhmm(arriveAt)} — за ${fmtD(s0 - arriveAt)} до начала. Подождёшь и отметишься` };
        if (arriveAt <= s0 + e.dur) return { c: "late", t: `😬 Опоздаешь на ${fmtD(arriveAt - s0)} — начало в ${at}` };
        return { c: "late", t: `🥀 Всё закончится в ${hhmm(s0 + e.dur)}, до твоего приезда` };
      }
      const fitHtml = (f) => (f ? `<span class="fz-fit ${f.c}" data-fit>${f.t}</span>` : "");

      /* ----- Пины ----- */
      function pinKeys() {
        const evs = evList();
        return [...new Set([...PIN_KEYS, ...evs.map((e) => e.place), st.from, st.to].filter(Boolean))];
      }
      function pins() {
        const evs = evList();
        const moving = st.phase === "ride";
        return pinKeys().map((k) => {
          const p = pt(k); if (!p) return null;
          const isFrom = k === st.from, isTo = k === st.to;
          const ev = evs.find((e) => e.place === k);
          return {
            id: k, x: p.x, y: p.y, e: ev && !isFrom ? ev.e : p.e || pinfo(k).e,
            label: isFrom ? (moving ? "Старт" : "Ты здесь") : ev ? `${short(ev.title, 14)} · ${hhmm(ev.hour * 60 + (ev.min || 0))}` : isTo ? pinfo(k).s : k === "home" || k === "work" ? pinfo(k).s : "",
            color: isTo ? "#ff6bcb" : isFrom ? "#c6ff4d" : ev ? EV_PIN : PIN_COL[k] || "#ffffff",
            pulse: isFrom || isTo || !!ev || k === "home" || k === "work",
            big: isFrom || isTo || !!ev,
            o: isFrom || isTo ? 2 : ev ? 1 : 0,
          };
        }).filter(Boolean).sort((a, b) => a.o - b.o);
      }

      // Радар поиска — прямо в SVG карты, вокруг точки посадки
      function radar(on) {
        const old = ctrl.svg.querySelector(".fz-radar");
        if (old) old.remove();
        if (!on) return;
        const p = pt(st.from);
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "fz-radar");
        g.setAttribute("transform", `translate(${p.x} ${p.y - 20})`);
        g.innerHTML = [0, 1, 2].map(() => `<circle r="22" fill="rgba(139,92,255,.28)" stroke="#8b5cff" stroke-width="3"/>`).join("");
        ctrl.svg.insertBefore(g, ctrl.svg.querySelector(".vm-pins"));
      }
      function stopDrive() { if (st.drv) { st.drv.stop(); st.drv = null; } }

      /* ----- Машинка поездки: позиция = Vibe.trip.progress() по игровому времени ----- */
      function vehStop() { if (st.veh) { st.veh.g.remove(); st.veh = null; } }
      function vehStart(t) {
        vehStop();
        const host = ctrl.svg.querySelector(".vm-veh");
        if (!host) return;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        host.appendChild(g);
        st.veh = { g, emoji: null, pts: MP.path(pt(t.from), pt(t.to)) };
        (function loop(ts) {
          if (!st.veh || st.veh.g !== g) return;
          const tr = TR.current();
          if (tr) {
            const M = MODES.find((m) => m.id === tr.mode) || MODES[0];
            if (st.veh.emoji !== tr.emoji) {
              st.veh.emoji = tr.emoji;
              g.innerHTML = `<circle r="17" fill="${M.col || "#ffe14d"}" stroke="#0e0e12" stroke-width="3"/><text class="vm-emo" y="7" font-size="20" text-anchor="middle">${tr.emoji}</text>`;
            }
            const p = MP.pointAt(st.veh.pts, TR.progress(tr));
            g.setAttribute("transform", `translate(${p.x} ${p.y})`);
            const em = g.querySelector(".vm-emo");
            if (em) em.setAttribute("transform", `scale(${p.dx < 0 ? -1 : 1} 1) translate(0 ${Math.sin(ts / 90) * 1.2})`);
          }
          sc.raf(loop);
        })(performance.now());
      }

      /* ----- Верхняя плашка и погода ----- */
      function topHtml() {
        const i = gameInfo(), w = wxNow(), tr = TR.current();
        const where = tr ? `в пути: ${tr.emoji} → ${short(pinfo(tr.to).s, 14)}, прибытие ${hhmm(tr.endMin)}` : `ты: ${pinfo(st.from).e} ${short(pinfo(st.from).s, 16)}`;
        return `<span>🕒 <b>${i ? i.time : "--:--"}</b></span><span>· ${w.e} ${tDeg(w.t)}</span><span class="tr">· ${Vibe.esc(where)}</span>`;
      }
      function wxHtml() {
        const w = wxNow(), sg = wxSurge(), sk = scootOk();
        const fx = sg > 1 ? `такси ×${String(sg).replace(".", ",")} · пешком −настроение` : w.kind === "sun" ? "гулять — настроение +2" : !sk.ok ? "самокаты убрали" : "пешком — норм";
        return `<span class="we">${w.e}</span><div><div>${tDeg(w.t)} · ${w.label}</div><small>${fx}</small></div>`;
      }
      function paintTop() {
        const top = root.querySelector("[data-top]");
        if (top) { const h = topHtml(); if (top.innerHTML !== h) top.innerHTML = h; top.classList.toggle("moving", !!TR.current()); }
        const wx = root.querySelector("[data-wx]");
        if (wx) {
          const h = wxHtml(); if (wx.innerHTML !== h) wx.innerHTML = h;
          const k = wxNow().kind;
          wx.className = `fz-map-tag fz-wx ${k === "sun" ? "sun" : k === "storm" ? "storm" : k === "rain" || k === "snow" ? "wet" : ""}`;
        }
      }

      /* ----- Карточки событий на месте: зал ожидания / опоздал / вовремя ----- */
      function placeEvCards(place, lastEvents = []) {
        if (!Vibe.sched) return "";
        const now = gNow(), out = [];
        lastEvents.forEach((x) => {
          const e = Vibe.sched.get ? Vibe.sched.get(x.id) : Vibe.sched.list().find((y) => y.id === x.id);
          if (!e || x.arrival === "early") return;
          if (x.arrival === "late") out.push(`<div class="card flat c-coral fz-workcard"><span class="emo wobble" style="font-size:34px">⏱️</span><div style="flex:1"><b style="display:block;font-size:15px">{Опоздал|Опоздала} на ${fmtD(x.late)}: ${Vibe.esc(short(e.title, 22))}</b><small style="font-weight:700;opacity:.85">${(LATE_TXT[e.kind] || (() => "Пришёл, но календарь всё запомнил. +8 🪙 вместо 20"))(e)}</small></div></div>`);
          else out.push(`<div class="card flat c-violet fz-workcard"><span class="emo wobble" style="font-size:34px">${e.e}</span><div style="flex:1"><b style="display:block;font-size:15px">Пришёл вовремя: ${Vibe.esc(short(e.title, 26))}</b><small style="font-weight:700;opacity:.85">Отмечено в календаре ✅ +20 🪙</small></div></div>`);
        });
        // Предстоящие здесь (в ближайшие 12 часов) — зал ожидания
        Vibe.sched.list().filter((e) => e.place === place && e.status === "planned" && smin(e) - now < 720 && smin(e) + e.dur >= now).sort((a, b) => smin(a) - smin(b)).slice(0, 2).forEach((e) => {
          const ph = Vibe.sched.phase ? Vibe.sched.phase(e, now) : { phase: now < smin(e) ? "wait" : "live" };
          const at = hhmm(smin(e));
          if (ph.phase === "live") {
            out.push(`<div class="card flat c-lime fz-workcard"><span class="emo wobble" style="font-size:34px">${e.e}</span><div style="flex:1"><b style="display:block;font-size:15px">${Vibe.esc(short(e.title, 24))} уже идёт</b><small style="font-weight:700;opacity:.85">Началось в ${at}. Заходи, пока не поздно</small></div><button class="btn sm black" data-act="checkin" data-id="${e.id}">Зайти</button></div>`);
          } else if (e.checkedIn) {
            out.push(`<div class="card c-yellow fz-wait"><div class="fz-between"><b style="font-size:16px">🛋️ Зал ожидания</b><span class="badge" style="background:var(--lime)">Отмечен ✅</span></div><div style="font-weight:800;font-size:14px;margin-top:4px">${e.e} ${Vibe.esc(e.title)} · начало в ${at}</div><span class="timer-pill cd" data-cd="${smin(e)}">через ${fmtD(smin(e) - now)}</span><div class="fine" style="margin-top:6px">Начнётся само, если ты здесь. Уйдёшь — отметка сгорит. Кулер с водой платный.</div></div>`);
          } else {
            const open = ph.phase !== "far";
            out.push(`<div class="card c-yellow fz-wait"><div class="fz-between"><b style="font-size:16px">🛋️ Зал ожидания</b><span class="timer-pill cd" data-cd="${smin(e)}">через ${fmtD(smin(e) - now)}</span></div><div style="font-weight:800;font-size:14px;margin-top:4px">${e.e} ${Vibe.esc(e.title)} · начало в ${at}</div>
              <button class="btn ${open ? "lime" : ""} xl block" data-act="checkin" data-id="${e.id}" style="margin-top:10px">${open ? "Отметиться ✅" : `Отметиться можно с ${hhmm(smin(e) - ((Vibe.sched && Vibe.sched.WINDOW) || 120))}`}</button>
              <div class="fine" style="margin-top:6px">Пришёл раньше — молодец. Корпорация ценит тех, кто ждёт.</div></div>`);
          }
        });
        return out.join("");
      }

      /* ----- Панель по фазам ----- */
      const tarHtml = (m, i) => {
        const off = m.id === "scooter" && !scootOk().ok;
        return `
        <button class="fz-tar ${m.neon ? "neon" : ""} ${i === st.mode ? "on" : ""} ${st.surge[i] > 1.001 ? "surging" : ""} ${off ? "off" : ""}" data-tar="${i}">
          ${m.taxi ? `<span class="badge surge" data-sg="${i}">⚡ ×${st.surge[i].toFixed(1).replace(".", ",")}</span>` : ""}
          <span class="e emo ${i === st.mode ? "wobble" : ""}">${m.e}</span>
          <b>${m.n}</b><small>${off ? "Убрали на зиму" : m.note}</small>
          <span class="tm">🕒 ${m.taxi ? `подача ${m.sub} мин · ${st.trip.taxi} в пути` : `${modeMin(i)} мин`}</span>
          <span class="pr" data-pr="${i}">${m.own ? "⛽ " : ""}${Vibe.rub(price(i))}</span>
          ${m.id === "walk" ? `<small>+${walkVib(st.trip.km)} 🪙 за ${Vibe.fmt(steps(st.trip.km))} шагов</small>` : ""}
          ${m.id === "scooter" && !off ? `<small>${scootOk().risky ? "💦 мокро — можно упасть" : "🌤️ настроение +2"}</small>` : ""}
          ${m.own ? `<small>🅿️ шанс штрафа есть всегда</small>` : ""}
        </button>`;
      };
      const orderLabel = () => {
        const m = MODES[st.mode];
        if (m.id === "walk") return "Пойти пешком 🚶";
        if (m.id === "scooter") return scootOk().ok ? `Взять самокат · ~${Vibe.rub(price(st.mode))}` : "Самокатов нет 🥶";
        if (m.id === "car") return `Сесть за руль · ⛽ ${Vibe.rub(price(st.mode))}`;
        if (m.id === "metro") return `Спуститься в метро · ${Vibe.rub(METRO_PRICE)}`;
        return `Заказать ${m.n} · <span data-oprice>${Vibe.rub(price(st.mode))}</span>`;
      };
      const arriveAt = () => gNow() + modeMin(st.mode);
      const arriveTxt = () => `🕒 будешь в ${hhmm(arriveAt())}`;

      // Предложение «ускориться» — только за деньги: пересесть в такси эконом
      function boostOffer(t) {
        if (!t || !["walk", "metro", "scooter"].includes(t.kind)) return null;
        const left = t.km * (1 - TR.progress(t));
        if (left < 0.4) return null;
        const minutes = Math.max(4, Math.round((left / 28) * 60 + 3)) + 3;
        const endAt = gNow() + minutes;
        if (endAt >= t.endMin - 2) return null;
        const sg = Math.round((isRush(gameInfo()) ? 1.2 : 1) * wxSurge() * 10) / 10;
        return { minutes, endAt, price: taxiPrice(left, 1, sg) + 50, km: left };
      }

      function render() {
        const M = MODES[st.mode];
        if (st.phase === "pick") {
          const to = st.to;
          const evs = evList();
          const evTo = to ? evAt(to) : null;
          panel.innerHTML = `
            <div class="fz-between"><div class="display" style="font-size:26px">Куда едем?</div><span class="emo wobble" style="font-size:34px">${to ? M.e : "🧭"}</span></div>
            <div class="fz-dest" style="margin-top:12px"><span class="dot"></span><div style="min-width:0;flex:1"><small class="muted" style="font-size:11px;display:block">Откуда · ты здесь</small><span class="fz-ell">${Vibe.esc(placeName(st.from))}</span></div></div>
            <div class="fz-dest" style="margin-top:8px"><span class="dot" style="background:var(--pink);border-radius:5px"></span><div style="min-width:0;flex:1"><small class="muted" style="font-size:11px;display:block">Куда</small><span class="fz-ell">${to ? Vibe.esc(placeName(to)) : "Выбери ниже или тапни пин на карте"}</span>${to ? `<small class="muted fz-ell" style="font-size:11px">${pinfo(to).note}</small>` : ""}</div></div>
            ${placeEvCards(st.from)}
            <div class="chips" style="margin-top:10px">
              ${evs.map((e) => { const r = evReach(e); return `<button class="chip fz-chip-ev ${r.c} ${e.place === to ? "on" : ""}" data-dest="${Vibe.esc(e.place)}" ${e.place === st.from ? 'style="opacity:.45"' : ""}>${e.e} ${Vibe.esc(short(e.title))} · ${evWhen(e)}<small data-reach="${e.id}">${r.t}</small></button>`; }).join("")}
              ${DEST_CHIPS.filter((k) => pt(k)).map((k) => `<button class="chip fz-chip-dest ${k === to ? "on" : ""}" data-dest="${k}" ${k === st.from ? 'style="opacity:.45"' : ""}>${pinfo(k).e} ${pinfo(k).t}</button>`).join("")}
            </div>
            ${to ? `
            <div class="fz-trip"><span class="badge">📏 ${kmTxt(st.trip.km)}</span><span class="badge" data-arrive>${arriveTxt()}</span></div>
            ${fitHtml(fitFor(evTo, arriveAt()))}
            <div class="hscroll fz-tars">${MODES.map(tarHtml).join("")}</div>
            <div class="fz-surge-bar" data-surgebar style="display:${surging() ? "flex" : "none"}"><span class="emo">⚡</span><span>${wxSurge() > 1 ? `${wxNow().label[0].toUpperCase() + wxNow().label.slice(1)}: все хотят такси. Цены ×${String(wxSurge()).replace(".", ",")}` : "Повышенный спрос. Цены растут, пока вы думаете"}</span></div>
            <button class="btn black xl block" data-act="order" style="margin-top:14px">${orderLabel()}</button>` : `
            <div class="card flat tight c-lilac" style="margin-top:10px;display:flex;gap:10px;align-items:center;font-weight:800;font-size:13px"><span class="emo wobble" style="font-size:28px">🗺️</span><span>Пины на карте — тоже кнопки. Тапай всё, это бесплатно (пока)</span></div>`}`;
        } else if (st.phase === "search") {
          panel.innerHTML = `
            <div style="text-align:center;padding:6px 0">
              <div class="emo wobble" style="font-size:64px">📡</div>
              <div class="display" style="font-size:28px;margin-top:6px">Ищем водителя</div>
              <div class="fz-dots" style="margin:10px 0"><span></span><span></span><span></span></div>
              <div class="fz-search-txt" data-stxt>${SEARCH_LINES[0]}</div>
              <div class="badge" style="margin-top:10px;background:var(--yellow)">${M.e} ${M.n} · ${Vibe.rub(st.price)} · цена зафиксирована*</div>
              <button class="btn block" data-act="cancel" style="margin-top:14px">Отменить поиск</button>
              <div class="fine">*на 0,5 секунды</div>
            </div>`;
        } else if (st.phase === "found" || st.phase === "arrived") {
          const d = st.driver;
          const arrived = st.phase === "arrived";
          panel.innerHTML = `
            <div class="fz-between">
              <div class="display" style="font-size:24px">${arrived ? "Водитель на месте!" : "Водитель найден!"}</div>
              <span class="timer-pill" data-eta>${arrived ? "тут" : M.sub + " мин"}</span>
            </div>
            <div class="fz-row" style="margin-top:14px">
              <div class="fz-driver-ava ${M.neon ? "c-pink" : "c-yellow"} emo">${d.ava}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:900;font-size:18px">${d.n} <span class="badge" style="background:var(--yellow);vertical-align:3px">⭐ ${d.r}</span></div>
                <div class="muted" style="font-weight:800;font-size:13px;margin:3px 0 6px">${d.car}</div>
                <span class="fz-plate">${d.plate}<i>${d.reg} RUS</i></span>
              </div>
              <span class="emo float" style="font-size:44px">${M.veh}</span>
            </div>
            <div class="fz-row" style="flex-wrap:wrap;gap:6px;margin-top:12px">${d.perks.map((p, i) => `<span class="badge" style="background:${i ? "var(--sky)" : "var(--lilac)"}">${p}</span>`).join("")}</div>
            ${arrived ? `<div class="fz-surge-bar" style="background:var(--yellow);color:var(--ink)"><span class="emo">⏳</span><span>Бесплатное ожидание закончится через <b data-wait>59</b> сек</span></div>` : `<div class="muted" style="font-weight:800;font-size:13px;margin-top:10px">Едет к тебе по улицам. Мы видим всё 👀</div>`}
            <div class="grid2" style="margin-top:14px;grid-template-columns:auto auto 1fr">
              <button class="icon-btn" data-act="call" aria-label="Позвонить">📞</button>
              <button class="icon-btn" data-act="msg" aria-label="Написать">💬</button>
              ${arrived ? `<button class="btn lime block" data-act="go">Поехали! 🚀</button>` : `<button class="btn block" data-act="cancel">Отменить</button>`}
            </div>`;
        } else if (st.phase === "ride") {
          const t = TR.current();
          if (!t) return;
          const k = t.kind;
          const title = k === "walk" ? "Идём пешком" : k === "metro" ? "Едем в метро" : k === "scooter" ? "На самокате" : k === "car" ? "За рулём" : "В такси";
          const lines = k === "walk" ? WALK_LINES : k === "metro" ? METRO_LINES : k === "scooter" ? SCOOT_LINES : k === "car" ? CAR_LINES : RIDE_LINES;
          const b = boostOffer(t);
          const i = gameInfo();
          panel.innerHTML = `
            <div class="fz-between"><div class="display" style="font-size:26px">${title} ${t.emoji}</div><span class="timer-pill" data-eta>ещё ${fmtD(TR.eta(t))}</span></div>
            <div class="muted fz-ell" style="font-weight:800;font-size:13px;margin-top:4px">${pinfo(t.to).e} ${Vibe.esc(placeName(t.to))} · ${kmTxt(t.km)}${t.boosted ? " · пересел 🚕" : ""}</div>
            <div class="fz-clock"><div><small>Сейчас</small><b data-now>${i ? i.time : "--:--"}</b></div><span class="ar emo">${t.emoji}</span><div class="r"><small>Прибытие</small><b>${hhmm(t.endMin)}</b></div></div>
            <div class="progress" style="height:18px"><i data-rprog style="--p:${Math.round(TR.progress(t) * 100)}%;transition:none"></i></div>
            <span data-rfit>${fitHtml(fitFor(evAt(t.to), t.endMin))}</span>
            <div class="card flat tight c-lilac" style="margin-top:12px;display:flex;align-items:center;gap:10px"><span class="emo wobble" style="font-size:28px">${k === "walk" ? "👟" : k === "metro" ? "🚇" : k === "scooter" ? "🛴" : k === "car" ? "🛞" : "📻"}</span><b data-rline style="font-size:14px">${lines[st.tick % lines.length]}</b></div>
            ${b ? `<button class="btn yellow block" data-act="boost" style="margin-top:12px;white-space:normal;height:auto;min-height:52px">🚕 Ускориться: такси · ${Vibe.rub(b.price)} · будешь в ${hhmm(b.endAt)}</button>` : ""}
            ${k === "taxi" || k === "car" ? `<button class="btn block" data-go="music" style="margin-top:12px">🎧 Включить свой вайб в Vibe Music</button>` : ""}
            <div class="fine">Карту можно закрыть — поездка идёт в игровом времени и закончится сама. Бесплатной перемотки нет: время — единственное, что Корпорация пока не продаёт.</div>`;
        } else if (st.phase === "done") {
          const L = st.last || {}, k = L.kind || "walk", arr = L.to || st.from, res = L.res || {};
          const i = gameInfo();
          let work = "";
          if (arr === "work") {
            const can = Vibe.work ? Vibe.work.can() : { ok: !!(i && i.workHours) };
            const mult = Vibe.work ? Vibe.work.mult() : 1.15;
            const multTxt = "×" + String(Math.round(mult * 100) / 100).replace(".", ",");
            if (can.ok) {
              const left = Vibe.game.tasksLeft ? Vibe.game.tasksLeft() : 0;
              work = `<div class="card flat c-sky fz-workcard"><span class="emo wobble" style="font-size:34px">💼</span><div style="flex:1"><b style="display:block;font-size:15px">Офис-бонус ${multTxt} к продуктивности</b><small style="font-weight:700;opacity:.8">${left ? `Осталось задач на сегодня: ${left}` : "Опенспейс, кофемашина и взгляд начальника"}</small></div><span class="badge" style="background:var(--lime)">${multTxt}</span></div>
                <button class="btn lime block" data-go="job" style="margin-top:10px">Задачи ждут → 💼</button>`;
            } else work = `<div class="card flat c-lilac fz-workcard"><span class="emo" style="font-size:30px">🌙</span><div style="flex:1"><b style="display:block;font-size:14px">Офис-бонус ${multTxt} ждёт тебя в рабочее время</b><small style="font-weight:700;opacity:.8">${Vibe.esc(can.why || "Офис закрыт. Охранник смотрит с уважением и подозрением")}</small></div></div>`;
          } else if (arr === "home") {
            const night = i && (i.night || i.hour >= 22);
            work = `<div class="card flat c-lilac fz-workcard"><span class="emo float" style="font-size:34px">${night ? "🌙" : "🛋️"}</span><div style="flex:1"><b style="display:block;font-size:15px">${night ? "Поздно. Кровать зовёт" : "Дома. Диван засчитан"}</b><small style="font-weight:700;opacity:.8">Сон засчитывается только дома. Браслет следит</small></div></div>
              <button class="btn ${night ? "lime" : ""} block" data-go="fit" style="margin-top:10px">Лечь спать 😴</button>`;
          } else if (arr === "wheel") {
            work = `<button class="btn lime block" data-go="wheel" style="margin-top:12px">Крутить колесо вайба 🎡</button>`;
          }
          // Событие уже закончилось к приезду
          let missCard = "";
          if (Vibe.sched && !(L.events || []).length) {
            const at = L.at || gNow();
            const gone = Vibe.sched.list().filter((e) => e.place === arr && smin(e) + (e.dur || 0) < at && at - smin(e) - (e.dur || 0) < 720 && e.status !== "done").sort((a, b) => smin(b) - smin(a))[0];
            if (gone) missCard = `<div class="card flat c-coral fz-workcard"><span class="emo" style="font-size:34px">🥀</span><div style="flex:1"><b style="display:block;font-size:15px">Не успел: ${Vibe.esc(short(gone.title, 24))}</b><small style="font-weight:700;opacity:.8">Всё закончилось в ${hhmm(smin(gone) + (gone.dur || 0))}. Календарь всё помнит</small></div></div>`;
          }
          const fineCard = res.fined ? `<div class="card flat c-coral fz-workcard"><span class="emo wobble" style="font-size:34px">🚔</span><div style="flex:1"><b style="display:block;font-size:15px">Штраф за парковку −${Vibe.rub(PARK_FINE)}</b><small style="font-weight:700;opacity:.8">Ты {встал|встала} там, где нельзя. Нельзя — везде</small></div></div>` : "";
          const fellCard = res.fell ? `<div class="card flat c-coral fz-workcard"><span class="emo wobble" style="font-size:34px">🤕</span><div style="flex:1"><b style="display:block;font-size:15px">Упал с самоката · здоровье −3</b><small style="font-weight:700;opacity:.8">Лужа победила. Страховка «Вайб Здоровье» уже звонит</small></div></div>` : "";
          const W = L.weather;
          const wxLine = W && (k === "walk" || k === "scooter") && res.mood ? `<span class="badge" style="background:${res.mood > 0 ? "var(--yellow)" : "var(--sky)"};margin-top:8px">${W.e} ${W.label} · настроение ${res.mood > 0 ? "+" : ""}${res.mood}</span>` : "";
          const total = (L.price || 0) + (L.extra || 0);
          const driver = L.driver;
          panel.innerHTML = `
            <div style="text-align:center">
              <div class="emo float" style="font-size:72px">${k === "walk" ? "🏅" : k === "metro" ? "🚇" : k === "scooter" ? "🛴" : k === "car" ? "🅿️" : "🎉"}</div>
              <div class="display" style="font-size:30px">${k === "walk" ? "Дошёл!" : k === "car" ? "Припарковался!" : "Приехали!"}</div>
              <div class="muted fz-ell" style="font-weight:800;font-size:13px;margin-top:2px">${pinfo(arr).e} ${Vibe.esc(placeName(arr))} · в ${hhmm(L.at || gNow())}</div>
              <div class="big-num" style="font-size:36px;margin-top:8px">${k === "walk" ? `${Vibe.fmt(steps(L.km || 1))} шагов` : (k === "car" ? "⛽ " : "") + Vibe.rub(total)}</div>
              <div class="muted" style="font-weight:800;font-size:13px;margin-top:4px">${k === "walk" ? `+${res.vib || walkVib(L.km || 1)} вайбиков · страховка не подорожала` : k === "metro" ? "Оплачено на турникете. Лицом" : k === "scooter" ? `${kmTxt(L.km || 1)} · ${SCOOT_START} ₫ старт + ${SCOOT_MIN} ₫/мин` : k === "car" ? `${Vibe.esc(car ? car.name : "Своя машина")} · ${kmTxt(L.km || 1)} · бензин по 8 ₫/км` : `${driver ? driver.n + " · " : ""}${kmTxt(L.km || 1)} · списано с Vibe Pay`}</div>
              ${wxLine}
              <div style="text-align:left">${placeEvCards(arr, L.events || [])}${missCard}${fineCard}${fellCard}${work}</div>
              ${k === "taxi" && driver ? `
              <div style="font-weight:900;margin-top:16px">Как вам поездка?</div>
              <div class="fz-stars" data-stars>${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" aria-label="${n} звёзд">⭐</button>`).join("")}</div>
              <div class="fz-row" style="justify-content:center;gap:8px" data-tips>
                ${[50, 100, 200].map((a) => `<button class="chip" data-tip="${a}">💸 ${a} ₫</button>`).join("")}
              </div>` : ""}
              <button class="btn black xl block" data-act="again" style="margin-top:16px">Ещё поездка ${k === "taxi" ? "🚕" : k === "car" ? "🚗" : "🗺️"}</button>
              <div class="fine">${k === "taxi" ? "Оценка влияет на рейтинг водителя, ваш рейтинг и рейтинг вашего рейтинга." : "Маршрут построен по улицам. Дворы пока платные."}</div>
            </div>`;
        }
        panel.classList.remove("fz-popin"); void panel.offsetWidth; panel.classList.add("fz-popin");
        paintTop();
      }

      /* ----- Выбор точки назначения ----- */
      function setDest(k, srcEl, quiet) {
        if (st.phase === "done") reset(true);
        if (st.phase !== "pick") { FX.toast("Сначала доедь. Потом мечтай", "🛣️"); return; }
        if (!pt(k)) return;
        if (k === st.from) { FX.toast("Ты уже здесь. Поздравляем с прибытием!", "📍"); if (srcEl) FX.bump(srcEl); return; }
        if (k === st.to) { if (srcEl) FX.bump(srcEl); return; }
        st.to = k; st.trip = trip();
        ctrl.setPins(pins());
        ctrl.route(st.trip.pts, { color: "#8b5cff" });
        ctrl.fit(st.trip.pts, 90);
        render();
        if (!quiet) FX.sound.pop();
        if (srcEl) FX.burst(srcEl, { emojis: [pinfo(k).e, "✨", "📍"], count: 8, spread: 60 });
        if (st.trip.km < 0.6) sc.to(() => FX.toast("Тут идти 5 минут. Но мы не осуждаем", "🦥"), 700);
        startSurge();
      }
      function onPin(id) {
        if (!pinKeys().includes(id)) return;
        if (st.phase !== "pick" && st.phase !== "done") { FX.toast("Сначала доедь. Потом мечтай", "🛣️"); return; }
        const chip = panel.querySelector(`[data-dest="${id}"]`);
        if (chip) chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        setDest(id, null, true);
      }

      /* ----- Сёрдж: цены живут своей жизнью ----- */
      function startSurge() { const g = ++st.sgen; sc.to(() => surgeTick(g), rand(2200, 3200)); }
      function surgeTick(g) {
        if (g !== st.sgen || st.phase !== "pick" || !st.to) return;
        const i = pick(TAXI_IDX);
        st.surge[i] = Math.min(2.6, st.surge[i] + rand(0.06, 0.2));
        const card = panel.querySelector(`.fz-tar[data-tar="${i}"]`);
        const pr = panel.querySelector(`[data-pr="${i}"]`);
        if (card && pr) {
          card.classList.add("surging");
          const sg = card.querySelector("[data-sg]");
          if (sg) sg.textContent = `⚡ ×${st.surge[i].toFixed(1).replace(".", ",")}`;
          FX.countTo(pr, price(i), { from: parseInt(pr.textContent.replace(/\D/g, ""), 10) || 0, dur: 500, fmt: Vibe.rub });
          FX.bump(pr);
        }
        const bar = panel.querySelector("[data-surgebar]");
        if (bar) { bar.style.display = "flex"; FX.bump(bar); }
        if (i === st.mode) {
          const op = panel.querySelector("[data-oprice]");
          if (op) { op.textContent = Vibe.rub(price(i)); FX.bump(op.closest(".btn")); }
        }
        sc.to(() => surgeTick(g), rand(2600, 4200));
      }

      /* ----- Сценарий поездки ----- */
      function startTrip(kind, extra = {}) {
        const M = MODES[st.mode], T = st.trip;
        const t = TR.start(Object.assign({
          from: st.from, to: st.to, mode: M.id, kind, emoji: M.veh, km: T.km, title: M.n,
          minutes: kind === "taxi" ? T.taxi : modeMin(st.mode),
        }, extra));
        if (!t) { FX.toast("Ты уже в пути. Телепорт — в следующем обновлении", "🛣️"); return; }
        showRide(t, true);
      }
      function order(btn) {
        const M = MODES[st.mode];
        if (!st.to) return;
        if (TR.current()) { FX.toast("Ты уже в пути", "🛣️"); return; }
        if (M.id === "walk") { st.run++; st.sgen++; return startTrip("walk"); }
        if (M.id === "scooter") {
          const ok = scootOk();
          if (!ok.ok) { FX.shake(btn); FX.toast(ok.why, "🥶", 3000); return; }
          const p = price(st.mode);
          if (p > S().balance) { FX.shake(btn); FX.toast("Не хватает на самокат. Ноги — бесплатно", "🫠"); return; }
          st.run++; st.sgen++;
          FX.toast(ok.risky ? "Мокро. Держись крепче — тормоза тоже мокрые" : "Самокат разблокирован. Ветер — бесплатно", "🛴", 2400);
          return startTrip("scooter", { price: p, paid: false, payTitle: "Vibe Кикшеринг · самокат", col: "c-mint" });
        }
        if (M.id === "car") {
          st.run++; st.sgen++;
          FX.toast(`Заводим ${car ? car.name : "машину"}. Врум-врум`, "🔑");
          return startTrip("car", { price: price(st.mode), paid: false });
        }
        if (M.id === "metro") {
          if (!Vibe.pay(METRO_PRICE, { title: "Vibe Метро · проход по лицу", emoji: "🚇", col: "c-sky", from: btn })) return;
          st.run++; st.sgen++;
          return startTrip("metro", { price: METRO_PRICE, paid: true });
        }
        const p = price(st.mode);
        if (p > S().balance) { FX.shake(btn); FX.toast("Не хватает на такси. Метро — 61 ₫, ноги — бесплатно", "🫠", 2800); return; }
        st.run++; st.sgen++; st.price = p;
        search();
      }
      function search() {
        const run = st.run;
        st.phase = "search"; render();
        ctrl.clearRoute();
        radar(true);
        ctrl.center(pt(st.from), 380);
        FX.sound.whoosh();
        let k = 0;
        st.lines = sc.every(() => {
          const el = panel.querySelector("[data-stxt]");
          if (el) { el.textContent = SEARCH_LINES[++k % SEARCH_LINES.length]; FX.bump(el); }
        }, 900);
        st.searchT = sc.to(() => { sc.stop(st.lines); if (run === st.run) found(); }, 3600);
      }
      function found() {
        const M = MODES[st.mode], run = st.run;
        const d = Object.assign({}, pick(DRIVERS));
        if (CARS[M.id]) d.car = CARS[M.id];
        st.driver = d; st.phase = "found";
        radar(false); render();
        FX.sound.success(); FX.haptic([10, 40, 10]);
        FX.burst(panel.querySelector(".fz-driver-ava"), { emojis: ["⭐", M.veh, "✨"], count: 12 });
        const from = pt(st.from);
        const ap = MP.path(nearbyStart(from), from);
        ctrl.route(ap, { color: "#ff6b2c" });
        ctrl.fit(ap, 90);
        let last = -1;
        stopDrive();
        st.drv = ctrl.drive(ap, {
          emoji: M.veh, color: M.col, duration: clamp(MP.len(ap) * 9, 3500, 6000),
          onProgress(k) {
            const v = Math.max(0, Math.ceil((1 - k) * M.sub));
            if (v === last) return;
            last = v;
            const el = panel.querySelector("[data-eta]");
            if (el) el.textContent = v ? v + " мин" : "тут";
          },
          onDone() { sc.to(() => { if (run === st.run) pickedUp(); }, 0); },
        });
      }
      function pickedUp() {
        const M = MODES[st.mode];
        st.phase = "arrived"; render();
        FX.sound.success(); FX.haptic([20, 40, 20]);
        FX.burst(panel.querySelector(".fz-driver-ava"), { emojis: [M.veh, "💛", "✨", "🎉"], count: 14 });
        let w = 59;
        st.waitIv = sc.every(() => {
          const el = panel.querySelector("[data-wait]");
          if (!el) return;
          w = Math.max(0, w - 1); el.textContent = w;
          if (w === 0) { el.parentElement.innerHTML = "Платное ожидание: 9 ₫/мин. Шутка. Пока что."; sc.stop(st.waitIv); }
        }, 1000);
      }
      function goTaxi() {
        const M = MODES[st.mode];
        if (st.waitIv) sc.stop(st.waitIv);
        stopDrive();
        startTrip("taxi", { price: st.price, paid: false, payTitle: `Vibe Maps · Такси «${M.n}»`, col: "c-yellow", driver: { n: st.driver.n, ava: st.driver.ava } });
      }
      // Показать текущую поездку (в т.ч. после возвращения на экран)
      function showRide(t, fresh) {
        st.phase = "ride"; st.from = t.from; st.to = t.to;
        st.mode = Math.max(0, MODES.findIndex((m) => m.id === t.mode));
        radar(false); stopDrive();
        const pts = MP.path(pt(t.from), pt(t.to));
        const M = MODES.find((m) => m.id === t.mode) || MODES[0];
        ctrl.setPins(pins());
        ctrl.route(pts, { color: M.route || "#8b5cff" });
        ctrl.fit(pts, 90);
        vehStart(t);
        render();
        if (fresh) {
          FX.sound.whoosh();
          FX.toast(`В пути: ${fmtD(t.endMin - t.startMin)}. Прибытие в ${hhmm(t.endMin)}`, t.emoji, 2600);
        }
      }
      // Движок поездок сообщил о прибытии (карта открыта или вернулись на неё)
      function showDone(last, fresh) {
        vehStop(); stopDrive(); radar(false);
        Vibe.state.set({ tripLast: Object.assign({}, last, { seen: true }) });
        st.last = last; st.from = last.to; st.to = null; st.trip = null; st.phase = "done"; st.rated = 0; st.tipped = false;
        st.driver = last.driver ? Object.assign({ r: "4,9" }, last.driver) : null;
        ctrl.clearRoute();
        ctrl.setPins(pins());
        ctrl.center(pt(last.to), 420);
        render();
        if (!fresh) return;
        const evs = last.events || [];
        const big = panel.querySelector(".big-num");
        if (!evs.some((x) => x.arrival === "late")) { if (!evs.some((x) => x.arrival === "ontime")) FX.confetti(); FX.sound.success(); }
        else FX.sound.error();
        FX.burst(big, { emojis: [pinfo(last.to).e, "🎉", "✨", last.emoji], count: 16 });
        const i = gameInfo(), arr = last.to;
        if (evs.length) return; // sched уже всё сказал
        if (arr === "work" && i && i.workHours) sc.to(() => FX.toast(`Офис-бонус ×1,15. Задачи ждут в Vibe Job`, "💼", 3200), 1300);
        else if (arr === "home") sc.to(() => FX.toast(i && i.night ? "Дома. Пора спать — кнопка внизу" : "Дома. Диван засчитан", "🛋️"), 1300);
        else if (arr === "clinic") sc.to(() => FX.toast("Регистратура: «Вас нет в списке. Но вы держитесь»", "🏥", 2800), 1300);
        else if (arr === "club") sc.to(() => FX.toast("Фейсконтроль одобрил. Кредитный рейтинг — нет", "🎤", 2800), 1300);
      }
      function reset(quiet) {
        st.run++; st.sgen++;
        if (st.waitIv) sc.stop(st.waitIv);
        stopDrive(); radar(false); vehStop();
        st.phase = "pick"; st.from = loadFrom(); st.to = null; st.trip = null; st.surge = baseSurge();
        ctrl.clearRoute();
        ctrl.setPins(pins());
        if (!quiet) ctrl.fit([pt(st.from), pt("home"), pt("work")].filter(Boolean), 90);
        render();
      }
      function cancel() {
        const wasFound = st.phase === "found";
        st.run++;
        if (st.lines) sc.stop(st.lines);
        if (st.searchT) sc.stop(st.searchT);
        stopDrive(); radar(false);
        if (wasFound) FX.toast(`Отменили. ${st.driver.n} уже был за углом 😢`, "🚕");
        st.phase = "pick";
        ctrl.route(st.trip.pts, { color: "#8b5cff" });
        ctrl.fit(st.trip.pts, 90);
        render();
        FX.sound.error();
        startSurge();
      }

      /* ----- Живые часы: каждую секунду ----- */
      sc.every(() => {
        st.tick++;
        paintTop();
        if (st.phase === "ride") {
          const done = TR.check(); // если приехали — придёт событие "arrive"
          if (done || !TR.current()) return;
          const t = TR.current(), i = gameInfo();
          const now = panel.querySelector("[data-now]"); if (now && i) now.textContent = i.time;
          const eta = panel.querySelector("[data-eta]"); if (eta) eta.textContent = `ещё ${fmtD(TR.eta(t))}`;
          const bar = panel.querySelector("[data-rprog]"); if (bar) bar.style.setProperty("--p", Math.round(TR.progress(t) * 100) + "%");
          if (st.tick % 3 === 0) {
            const k = t.kind, lines = k === "walk" ? WALK_LINES : k === "metro" ? METRO_LINES : k === "scooter" ? SCOOT_LINES : k === "car" ? CAR_LINES : RIDE_LINES;
            const el = panel.querySelector("[data-rline]");
            if (el) { el.textContent = lines[(st.tick / 3) % lines.length | 0]; FX.bump(el.parentElement); }
          }
          if (st.tick % 10 === 0) {
            const bt = panel.querySelector('[data-act="boost"]'), b = boostOffer(t);
            if (bt && b) bt.textContent = `🚕 Ускориться: такси · ${Vibe.rub(b.price)} · будешь в ${hhmm(b.endAt)}`;
            else if (bt && !b) bt.remove();
          }
        }
        if (st.phase === "pick" && st.tick % 5 === 0) {
          evList().forEach((e) => { const el = panel.querySelector(`[data-reach="${e.id}"]`); if (el) { const r = evReach(e); el.textContent = r.t; el.parentElement.classList.remove("ok", "warn", "late"); el.parentElement.classList.add(r.c); } });
          const ar = panel.querySelector("[data-arrive]"); if (ar && st.trip) ar.textContent = arriveTxt();
          const f = panel.querySelector("[data-fit]"), fe = st.to && fitFor(evAt(st.to), arriveAt());
          if (f && fe) { f.textContent = fe.t; f.className = `fz-fit ${fe.c}`; }
        }
        const nm = gNow();
        panel.querySelectorAll("[data-cd]").forEach((el) => { const left = +el.dataset.cd - nm; el.textContent = left > 0 ? `через ${fmtD(left)}` : "начинается!"; });
      }, 1000);
      const offs = [
        Vibe.on("arrive", (d) => { if (!sc.dead && d && d.trip) showDone(d.trip, true); }),
        Vibe.on("attend", () => { if (!sc.dead && (st.phase === "pick" || st.phase === "done")) { ctrl.setPins(pins()); render(); } }),
        Vibe.on("checkin", () => { if (!sc.dead && (st.phase === "pick" || st.phase === "done")) render(); }),
      ];

      /* ----- Клики ----- */
      sc.on(root, "click", (e) => {
        const dest = e.target.closest("[data-dest]");
        if (dest) { setDest(dest.dataset.dest, dest); return; }
        const tar = e.target.closest("[data-tar]");
        if (tar && st.phase === "pick") {
          const i = +tar.dataset.tar;
          if (i === st.mode) { FX.bump(tar); return; }
          const id = MODES[i].id;
          if (id === "scooter" && !scootOk().ok) { FX.shake(tar); FX.toast(scootOk().why, "🥶", 3000); return; }
          panel.querySelectorAll(".fz-tar").forEach((el) => { el.classList.toggle("on", el === tar); el.querySelector(".e").classList.toggle("wobble", el === tar); });
          st.mode = i;
          const btn = panel.querySelector('[data-act="order"]');
          if (btn) { btn.innerHTML = orderLabel(); FX.bump(btn); }
          const ar = panel.querySelector("[data-arrive]");
          if (ar) ar.textContent = arriveTxt();
          const f = panel.querySelector("[data-fit]"), fe = fitFor(evAt(st.to), arriveAt());
          if (f && fe) { f.textContent = fe.t; f.className = `fz-fit ${fe.c}`; FX.bump(f); }
          FX.sound.pop();
          FX.burst(tar, { emojis: [MODES[i].e, "✨"], count: 6, spread: 60 });
          if (id === "walk") FX.toast(wxNow().kind === "sun" ? "Солнце! Прогулка поднимет настроение" : Vibe.weather && Vibe.weather.wet() ? `${wxNow().label[0].toUpperCase() + wxNow().label.slice(1)}. Смелый выбор. Настроение −3` : "Смелый выбор. Колени скажут спасибо", "🦵");
          if (id === "metro") FX.toast("61 ₫ и никакого сёрджа. Подозрительно честно", "🚇");
          if (id === "scooter") FX.toast(scootOk().risky ? "Мокро. Шанс упасть есть, шанс успеть — тоже" : "Самокат: быстрее ног, дешевле такси", "🛴");
          if (id === "vibe") FX.toast("Вайб-тариф: диско-шар включён", "🪩");
          if (id === "biz") FX.toast("Бизнес: водитель молчит профессионально", "🤵");
          if (id === "car") FX.toast("Своя машина: без сёрджа, но с камерами", "🚗");
          return;
        }
        const star = e.target.closest("[data-star]");
        if (star) {
          if (st.rated || !st.driver) { FX.bump(star); return; }
          const n = +star.dataset.star; st.rated = n;
          FX.sound.like();
          panel.querySelectorAll("[data-star]").forEach((s, i) => {
            sc.to(() => { s.classList.toggle("on", i < n); if (i < n) FX.burst(s, { emojis: ["⭐", "✨"], count: 5, spread: 50 }); }, i * 90);
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
          if (Vibe.pay(a, { title: `Чаевые · ${st.driver ? st.driver.n : "водитель"}`, emoji: "💸", col: "c-lime", from: tip, cashback: 0.1 })) {
            st.tipped = true; tip.classList.add("on");
            FX.burst(tip, { emojis: ["💸", "💚", "🙏"], count: 12 });
          }
          return;
        }
        const act = e.target.closest("[data-act]");
        if (!act) return;
        const a = act.dataset.act;
        if (a === "order") {
          FX.bump(act);
          order(act);
        } else if (a === "cancel") {
          cancel();
        } else if (a === "go") {
          goTaxi();
        } else if (a === "call") {
          FX.toast(`${st.driver.n} за рулём и не берёт трубку. Это правильно`, "📞"); FX.bump(act);
        } else if (a === "msg") {
          FX.toast(`${st.driver.n}: «выхожу», в смысле — «подъезжаю»`, "💬"); FX.bump(act);
        } else if (a === "again") {
          reset();
          FX.sound.pop();
        } else if (a === "boost") {
          const t = TR.current(), b = boostOffer(t);
          if (!b) { FX.toast("Уже почти пришёл. Такси дольше ехать к тебе", "🤷"); act.remove(); return; }
          const d = pick(DRIVERS);
          const nt = TR.boost({ mode: "eco", kind: "taxi", minutes: b.minutes, price: b.price, emoji: "🚕", payTitle: "Vibe Maps · Такси «Эконом» (пересадка)", col: "c-yellow", from: act, driver: { n: d.n, ava: d.ava } });
          if (!nt) return;
          FX.burst(act, { emojis: ["🚕", "💸", "⚡"], count: 14 });
          FX.toast(`${d.n} подобрал тебя на ходу. Ноги сказали спасибо, кошелёк — нет`, "🚕", 2800);
          showRide(nt, false);
        } else if (a === "checkin") {
          if (!Vibe.sched || !Vibe.sched.checkIn) return;
          const r = Vibe.sched.checkIn(act.dataset.id);
          if (!r.ok) { FX.toast(r.why || "Пока рано", "⏰", 2800); FX.shake(act); return; }
          FX.burst(act, { emojis: [(r.e && r.e.e) || "✅", "✅", "🎉"], count: 14 });
          FX.sound.success();
          ctrl.setPins(pins());
          render();
        }
      });

      // Старт экрана: в пути → показываем поездку; только что приехал → итог; иначе выбор
      const cur = TR.current();
      const lastT = TR.last();
      ctrl.setPins(pins());
      if (cur) {
        showRide(cur, false);
        if (params.to && params.to !== cur.to) sc.to(() => FX.toast(`Ты в пути к «${pinfo(cur.to).s}». Сначала доедь`, "🛣️", 2600), 500);
      } else if (lastT && !lastT.seen && lastT.to === st.from && gNow() - (lastT.at || 0) < 240) {
        showDone(lastT, false);
      } else {
        render();
        if (params.to && pt(params.to) && params.to !== st.from) sc.to(() => setDest(params.to, null, true), 350);
        else if (st.from !== "home") sc.to(() => FX.toast(`Ты сейчас: ${pinfo(st.from).s}. Карта помнит всё`, "📍"), 500);
        else if (evList().length) sc.to(() => { const e = evList()[0]; FX.toast(`${e.e} ${e.title} · ${evWhen(e)} — ${evReach(e).t}`, "📅", 2800); }, 600);
      }
      return () => { offs.forEach((f) => f && f()); vehStop(); sc.clear(); ctrl.destroy(); };
    },
  });

  /* ============================================================
     2. VIBE MUSIC — настоящий лоу-фай на WebAudio
     ============================================================ */
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const TRACKS = [
    { id: "trevoga", t: "Лоу-фай для тревоги", a: "Вайбот & Тревожный Чилл", e: "🫠", art: "linear-gradient(135deg,#8b5cff,#ff6bcb)", len: 167, bpm: 85,
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
  // Бесплатный тариф: реклама каждые 3 трека. Premium 199 ₫/мес или «Плюс Вайб» — без рекламы
  const MUS_PREM = { id: "music", name: "Vibe Music Premium", e: "🎧", price: 199 };
  const AD_EVERY = 3, AD_SEC = 5;
  const ADS = [
    { e: "🤑", t: "Vibe Кредит", x: "Одобрим даже тишину. Ставка — сюрприз", c: "c-pink" },
    { e: "🍜", t: "Vibe Eat", x: "Курьер Тимур уже скучает по тебе", c: "c-yellow" },
    { e: "🏠", t: "Vibe Дом", x: "Ипотека на 40 лет. Музыка — бесплатно", c: "c-sky" },
    { e: "💎", t: "Плюс Вайб", x: "Музыка без рекламы, кэшбек ×2 и чувство превосходства", c: "c-lilac" },
    { e: "🛒", t: "Vibe Market", x: "Купи то, о чём ещё не знаешь", c: "c-lime" },
  ];
  const musAdFree = () => !!S().plus || (Vibe.subs ? Vibe.subs.has(MUS_PREM.id) : false);
  function musPremHtml() {
    const s = S();
    if (s.plus) return `<div class="card c-lilac" style="margin-top:14px;display:flex;align-items:center;gap:12px"><span class="emo float" style="font-size:40px">💎</span><div style="flex:1"><b style="font-size:16px;display:block">Музыка входит в Плюс Вайб</b><span style="font-size:13px;font-weight:700">Без рекламы. Ты уже платишь за всё сразу</span></div></div>`;
    if (musAdFree()) return `<div class="card c-lime" style="margin-top:14px;display:flex;align-items:center;gap:12px"><span class="emo float" style="font-size:40px">🎧</span><div style="flex:1"><b style="font-size:16px;display:block">Premium активен</b><span style="font-size:13px;font-weight:700">${Vibe.rub(MUS_PREM.price)}/мес · ноль рекламы, ноль смысла</span></div><button class="btn sm" data-act="unprem">Отменить</button></div>`;
    const left = AD_EVERY - ((s.musCount || 0) % AD_EVERY);
    return `<div class="card c-violet" style="margin-top:14px">
      <div style="display:flex;align-items:center;gap:12px"><span class="emo wobble" style="font-size:40px">🎧</span><div style="flex:1"><b style="font-size:17px;display:block">Vibe Music Premium</b><span style="font-size:13px;font-weight:700;opacity:.9">Без рекламы · ${Vibe.rub(MUS_PREM.price)}/мес</span></div></div>
      <div class="badge" style="margin-top:10px;background:#fff;color:var(--ink)">📢 Реклама через ${left} ${left === 1 ? "трек" : "трека"}</div>
      <button class="btn lime block" data-act="prem" style="margin-top:10px">Убрать рекламу · ${Vibe.rub(MUS_PREM.price)}/мес</button>
      <div class="fine" style="color:#e9e2ff">Или «Плюс Вайб» — там музыка уже внутри. Подписка продлевается сама, как и тревога.</div>
    </div>`;
  }
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
          <div class="fz-ad" data-ad hidden></div>
        </div>
        <div data-prem>${musPremHtml()}</div>
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
      // Реклама на бесплатном тарифе
      let adOn = false;
      const adEl = root.querySelector("[data-ad]");
      const premBox = root.querySelector("[data-prem]");
      const updPrem = () => { premBox.innerHTML = musPremHtml(); };
      function countTrack() {
        const n = (S().musCount || 0) + 1;
        Vibe.state.set({ musCount: n });
        updPrem();
        return !musAdFree() && n % AD_EVERY === 0;
      }
      function showAd(then) {
        adOn = true;
        if (engine) engine.pause();
        setPlaying(false);
        const ad = pick(ADS);
        let left = AD_SEC;
        adEl.className = `fz-ad ${ad.c}`;
        adEl.innerHTML = `<span class="badge tag">реклама Vibe</span><span class="badge cd" data-adcd>${left}</span>
          <span class="e emo wobble">${ad.e}</span><div class="display">${ad.t}</div><p>${ad.x}</p>
          <div class="fz-ad-bar"><i data-adbar></i></div>
          <button class="btn sm black" data-act="prem" style="margin-top:8px">Без рекламы · ${Vibe.rub(MUS_PREM.price)}/мес</button>`;
        adEl.hidden = false;
        sc.to(() => { const b = adEl.querySelector("[data-adbar]"); if (b) { b.style.transition = `width ${AD_SEC}s linear`; b.style.width = "100%"; } }, 30);
        FX.sound.pop();
        const iv = sc.every(() => {
          left--;
          const c = adEl.querySelector("[data-adcd]"); if (c) c.textContent = Math.max(0, left);
          if (left <= 0) { sc.stop(iv); endAd(then); }
        }, 1000);
        adEl._iv = iv;
      }
      function endAd(then) {
        if (!adOn) return;
        adOn = false;
        if (adEl._iv) sc.stop(adEl._iv);
        adEl.hidden = true; adEl.innerHTML = "";
        FX.toast("Реклама закончилась. Вайб вернулся", "🎶", 1600);
        if (then) then();
      }
      function buyPrem(from) {
        if (musAdFree()) { FX.toast("Premium уже есть. Наслаждайся тишиной между треками", "🎧"); return; }
        if (!Vibe.pay(MUS_PREM.price, { title: "Vibe Music Premium", emoji: "🎧", col: "c-violet", from })) return;
        Vibe.subs.add(MUS_PREM);
        FX.confetti({ count: 80, from }); FX.sound.levelup();
        FX.toast("Premium! Реклама ушла. Обещала не возвращаться", "🎧", 2600);
        if (adOn) endAd(() => play());
        updPrem();
      }
      function play() {
        if (adOn) { FX.toast("Сначала реклама. Это недолго (5 сек жизни)", "📢"); return; }
        if (S().sound === false) {
          FX.toast("Звук выключен в профиле. Включи — и будет вайб", "🔇", 2600);
          FX.shake(root.querySelector(".fz-pp-btn"));
          return;
        }
        if (!engine) engine = createLofi(onBeat);
        if (!engine) { FX.toast("Браузер не умеет в вайб. Обидно", "😶"); return; }
        engine.setTrack(TRACKS[cur]);
        engine.play(); setPlaying(true);
        if (Vibe.body) Vibe.body.effect("music");
        FX.burst(root.querySelector(".fz-pp-btn"), { emojis: ["🎵", "🎶", "✨", "💜"], count: 10, spread: 90 });
      }
      function pause() { if (engine) engine.pause(); setPlaying(false); }
      function go(i) {
        if (adOn) { FX.toast("Реклама. Её нельзя пропустить, только пережить", "📢"); FX.shake(adEl); return; }
        cur = (i + TRACKS.length) % TRACKS.length; pos = 0;
        Vibe.state.set({ musTrack: cur });
        setUI();
        if (countTrack()) { showAd(() => play()); return; }
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
        else if (a === "prem") { FX.bump(act); buyPrem(act); }
        else if (a === "unprem") {
          Vibe.subs.remove(MUS_PREM.id); updPrem();
          FX.sound.error(); FX.toast("Premium отменён. Реклама уже пакует чемоданы обратно", "📢", 2600);
        }
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
    { e: "🤖", t: "Обнимашка от Вайбота", d: "Обнимашка спишется автоматически в понедельник", c: "c-pink", zab: true },
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
          if (Vibe.body) Vibe.body.effect("games");
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
            if (Vibe.body) Vibe.body.effect("games");
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
     4. VIBE INVEST — мини-экономика: акции, облигации, вклад, крипта, фонд, золото
     ============================================================ */
  // Всё детерминированно от сида игрока (invSeed) и игрового дня: цены, новости, крахи, пампы —
  // одни и те же, смотришь ты или нет. Ожидаемая доходность скромная, рискованное может уйти в минус.
  // div — дивиденды в месяц (1-го числа), cpn — купон в месяц (15-го числа).
  const ASSETS = [
    { tk: "VIBE", n: "Корпорация Vibe", e: "📱", c: "c-violet", cls: "stock", p: 4120, vol: 0.016, drift: 0.0003, div: 0.0025 },
    { tk: "ZABOT", n: "Вайбот Роботикс", e: "🤖", c: "c-mint", cls: "stock", p: 892, vol: 0.022, drift: 0.0005 },
    { tk: "KRDT", n: "Кредит Навсегда", e: "🤑", c: "c-lime", cls: "stock", p: 1337, vol: 0.011, drift: 0.0002, div: 0.005 },
    { tk: "AIR", n: "Воздух Холдинг", e: "💨", c: "c-sky", cls: "stock", p: 12, vol: 0.02, drift: 0.0002, div: 0.003 },
    { tk: "AGRO", n: "Агро Вайб", e: "🌾", c: "c-yellow", cls: "stock", p: 540, vol: 0.014, drift: 0.0003, div: 0.002 },
    { tk: "DLVR", n: "Вайб Доставка", e: "🛵", c: "c-orange", cls: "stock", p: 310, vol: 0.02, drift: 0.0003 },
    { tk: "IDX", n: "Фонд «Весь Вайб-Сити»", e: "🏙️", c: "c-pink", cls: "index", p: 1000 },
    { tk: "GOLD", n: "Золото", e: "🥇", c: "c-yellow", cls: "gold", p: 6200, vol: 0.007, drift: 0.00015 },
    { tk: "OFZ", n: "Облигации Вайб-Сити", e: "🏛️", c: "c-white", cls: "bond", p: 1000, vol: 0.0015, drift: 0, cpn: 0.006 },
    { tk: "VBC", n: "Вайбкоин", e: "🪙", c: "c-yellow", cls: "crypto", p: 69420, vol: 0.045, drift: 0.0002 },
    { tk: "MEME", n: "Мем-коин «Котик»", e: "🐸", c: "c-pink", cls: "crypto", p: 228, vol: 0.06, drift: -0.0006 },
  ];
  const STOCKS = ASSETS.map((a, i) => (a.cls === "stock" ? i : -1)).filter((i) => i >= 0);
  const IDX = ASSETS.findIndex((a) => a.tk === "IDX");
  const CLS = {
    stock: { n: "Акции", e: "📈", col: "#8b5cff", risk: 55 },
    index: { n: "Фонд", e: "🏙️", col: "#ff6bcb", risk: 35 },
    gold: { n: "Золото", e: "🥇", col: "#ffe14d", risk: 22 },
    bond: { n: "Облигации", e: "🏛️", col: "#7cf5c8", risk: 6 },
    deposit: { n: "Вклад", e: "🏦", col: "#8fd8ff", risk: 0 },
    crypto: { n: "Крипта", e: "🪙", col: "#ff6b2c", risk: 100 },
  };
  const PERIODS = [
    { k: "1Д", label: "за сегодня" },
    { k: "1Н", label: "за неделю" },
    { k: "1М", label: "за месяц" },
    { k: "Всё", label: "за всё время" },
  ];
  const DEP_RATE = 0.09, DEP_TERMS = [30, 90, 180], DEP_MAX = 5;
  const COACH = [
    { n: "Марафон «Пассивный доход за 21 день»", p: 4990 },
    { n: "Интенсив «Мышление миллионера» (VIP)", p: 14990 },
    { n: "Наставничество «Как продавать курсы про курсы»", p: 49990 },
  ];
  const nowM = () => (Vibe.game && Vibe.game.minutes ? Vibe.game.minutes() : 0);
  const gDay = () => Math.floor(nowM() / 1440);
  function h32(a, b, c) {
    let h = 2166136261 ^ a;
    h = Math.imul(h ^ b, 16777619); h = Math.imul(h ^ c, 16777619);
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return ((h >>> 0) + 0.5) / 4294967297;
  }
  const gauss = (u1, u2) => Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  function invSeed() {
    let sd = S().invSeed;
    if (!sd) { sd = (Date.now() % 1e9) | 1; Vibe.state.set({ invSeed: sd }); }
    return sd;
  }
  const pctF = (x) => (x >= 0 ? "+" : "−") + String(Math.round(Math.abs(x) * 1000) / 10).replace(".", ",") + "%";
  const finLvl = () => { try { return (Vibe.skills && Vibe.skills.level && Vibe.skills.level("finance")) || 0; } catch (e) { return 0; } };
  const invMult = () => { try { return (Vibe.skills && Vibe.skills.mult && Vibe.skills.mult("invest")) || 1; } catch (e) { return 1; } };
  const TIERS = [
    { l: 0, n: "Хомяк-новичок", e: "🐹", perk: "Акции, облигации, вклад, фонд и золото" },
    { l: 2, n: "Диванный аналитик", e: "🛋️", perk: "Комиссия за продажу 0,2% вместо 0,3%" },
    { l: 3, n: "Трейдер с латте", e: "☕", perk: "«Инсайд от соседа» — слух о завтрашней новости" },
    { l: 5, n: "Волк с Вайб-стрит", e: "🐺", perk: "Вклад «Стабильный вайб» +1% годовых" },
    { l: 8, n: "Гоблин-казначей", e: "👺", perk: "Комиссия 0,1% и уважение бабушек у подъезда" },
  ];
  const tierOf = (L) => TIERS.filter((t) => L >= t.l).pop();
  const sellFee = () => (finLvl() >= 8 ? 0.001 : finLvl() >= 2 ? 0.002 : 0.003);
  const depRate = () => DEP_RATE + (finLvl() >= 5 ? 0.01 : 0);

  /* ---------- Новости и рыночные события (детерминированно по дню) ---------- */
  const NEWS = [
    { e: "💜", fx: { VIBE: [3, 7] }, t: "Корпорация Vibe объявила о рекордной заботе о сотрудниках: акции {VIBE}" },
    { e: "✊", fx: { VIBE: [-5, -3], DLVR: [-7, -3] }, t: "Курьеры объединились — VIBE {VIBE}, DLVR {DLVR}" },
    { e: "📊", fx: { VIBE: [-4, -2] }, t: "Корпорация Vibe сообщила о рекордно позитивном снижении прибыли: VIBE {VIBE}" },
    { e: "🔁", fx: { VIBE: [2, 5] }, t: "Vibe запустила подписку на подписки. Рекордный позитив: VIBE {VIBE}" },
    { e: "👨‍👩‍👧", fx: { VIBE: [-3, 3] }, t: "Корпорация Vibe назвала квартал «рекордно семейным». Рынок думает: VIBE {VIBE}" },
    { e: "🤗", fx: { VIBE: [-2, 4] }, t: "Совет директоров Vibe обнялся на камеру. Рекордный позитив: VIBE {VIBE}" },
    { e: "🤖", fx: { ZABOT: [3, 8] }, t: "Вайбот научился говорить «я передам вашу жалобу» на 40 языках: ZABOT {ZABOT}" },
    { e: "🙈", fx: { ZABOT: [-7, -3], KRDT: [2, 5] }, t: "Вайбот случайно одобрил кредит всему городу: ZABOT {ZABOT}, KRDT {KRDT}" },
    { e: "🤑", fx: { KRDT: [2, 5] }, t: "«Кредит Навсегда» поднял ставки «для вашего же блага»: KRDT {KRDT}" },
    { e: "🔍", fx: { KRDT: [-5, -2] }, t: "Регулятор попросил «Кредит Навсегда» писать проценты крупнее 4-го кегля: KRDT {KRDT}" },
    { e: "🫙", fx: { AIR: [4, 9] }, t: "Воздух Холдинг продал туристам воздух Вайб-Сити в банках: AIR {AIR}" },
    { e: "🧪", fx: { AIR: [-8, -4] }, t: "Учёные напомнили, что воздух вообще-то бесплатный. AIR {AIR}" },
    { e: "🛵", fx: { DLVR: [3, 7] }, t: "Вайб Доставка привезла заказ вовремя. Впервые. DLVR {DLVR}" },
    { e: "🪑", fx: { DLVR: [-6, -3] }, t: "Курьеры Вайб Доставки потребовали стулья: DLVR {DLVR}" },
    { e: "👵", fx: { GOLD: [1, 3] }, t: "Бабушки Вайб-Сити скупают золото «на всякий случай»: GOLD {GOLD}" },
    { e: "🌯", fx: { GOLD: [-3, -1] }, t: "В парке нашли клад. Оказалось — фольга от шаурмы. GOLD всё равно {GOLD}" },
    { e: "🌯", fx: { VBC: [6, 15] }, t: "Вайбкоин принимают к оплате в ларьке с шаурмой: VBC {VBC}" },
    { e: "🔑", fx: { VBC: [-15, -7] }, t: "Создатель Вайбкоина забыл пароль от кошелька: VBC {VBC}" },
    { e: "🐦", fx: { VBC: [-10, 10] }, t: "Анонимный миллиардер написал «🪙?». Рынок гадает: VBC {VBC}" },
    { e: "🏛️", fx: { OFZ: [0.2, 0.8] }, t: "Мэрия Вайб-Сити пообещала вернуть долги. Честно-честно: OFZ {OFZ}" },
    { e: "🛝", fx: { OFZ: [-0.8, -0.2] }, t: "Мэрия построила пятую горку в парке за счёт облигаций: OFZ {OFZ}" },
    { e: "🥕", fx: { AGRO: [2, 5] }, t: "Агро Вайб вывела морковь, которая любит понедельники: AGRO {AGRO}" },
  ];
  const PUMP = [
    { x: 0.35, e: "🐱", t: "Котик-блогер с 3 млн подписчиков посоветовал MEME: {MEME} 🚀" },
    { x: 0.45, e: "👵", t: "MEME обсуждают даже бабушки у подъезда: {MEME}" },
    { x: 0.2, e: "🛢️", t: "Аналитики: «MEME — это новая нефть». MEME {MEME}" },
    { x: -0.5, e: "🤫", t: "Котик-блогер тихо продал свои MEME. {MEME}" },
    { x: -0.35, e: "🫠", t: "Создатели MEME: «это была шутка». MEME {MEME}" },
  ];
  const AN_UP = [
    "Это только начало! Следующая остановка — Луна 🚀",
    "Я же говорил. Я всегда говорю. Иногда угадываю.",
    "Покупай, пока не поздно. (Уже немного поздно.)",
    "Вероятность дальнейшего роста — 146%. Я посчитал сердцем.",
    "Рекордный позитив подтверждён моими внутренними датчиками.",
  ];
  const AN_DOWN = [
    "Это не падение — это скидка для своих 💜",
    "Самое время докупить. И ещё раз докупить.",
    "Рынок просто устал от позитива. Отдохнёт и полетит.",
    "Цена ниже — вайб выше. Математика заботы.",
    "Падение — это рост, который пока стесняется.",
  ];
  const isPump = (sd, d) => d >= 1 && h32(sd, 7100, d) < 0.025;
  let newsCache = { seed: null, m: new Map() };
  // Новости игрового дня d: [{ d, h, e, t, fx: {TK: доля}, kind, an }]
  function dayNews(d) {
    const sd = invSeed();
    if (newsCache.seed !== sd) newsCache = { seed: sd, m: new Map() };
    if (newsCache.m.has(d)) return newsCache.m.get(d);
    const out = [];
    if (d >= 1) {
      const rr = (k) => h32(sd, 7000 + k, d);
      const span = (lo, hi, k) => (lo + (hi - lo) * rr(k)) / 100;
      const fill = (t, fx) => t.replace(/\{(\w+)\}/g, (_, tk) => (fx[tk] != null ? pctF(fx[tk]) : ""));
      // Крах или ралли
      const u = rr(1);
      if (u < 0.018 || u > 0.976) {
        const crash = u < 0.018, fx = {};
        ASSETS.forEach((a, i) => {
          if (i === IDX) return;
          if (a.cls === "stock") fx[a.tk] = crash ? -span(8, 14, 20 + i) : span(4, 8, 20 + i);
          else if (a.cls === "crypto") fx[a.tk] = crash ? -span(18, 30, 20 + i) : span(8, 18, 20 + i);
          else if (a.cls === "gold") fx[a.tk] = crash ? span(3, 5, 20 + i) : -span(0.5, 1.5, 20 + i);
          else if (a.cls === "bond") fx[a.tk] = crash ? 0.005 : -0.002;
        });
        out.push({ kind: crash ? "crash" : "rally", h: 11, e: crash ? "📉" : "🚀", fx,
          t: crash ? "Чёрный вторник в Вайб-Сити: рынок «бережно корректируется»" : "Ралли! Мэр сказал «всё будет хорошо», и все поверили" });
      }
      // Памп и дамп мем-коина
      for (let k = 0; k < PUMP.length; k++) if (isPump(sd, d - k)) {
        const ph = PUMP[k], fx = { MEME: ph.x };
        out.push({ kind: k < 3 ? "pump" : "dump", h: 9 + k * 2, e: ph.e, fx, t: fill(ph.t, fx) });
        break;
      }
      // Погода → агро
      if (Vibe.weather && Vibe.weather.day) {
        try {
          const w = Vibe.weather.day(d), summer = w.month >= 6 && w.month <= 9;
          let fx = null, t = "", e = w.e;
          if (w.kind === "storm") { fx = { AGRO: -span(3, 6, 40) }; t = "Непогода побила урожай: AGRO {AGRO}"; }
          else if (summer && w.kind === "rain" && rr(41) < 0.5) { fx = { AGRO: span(1, 3, 40) }; t = "Дождь бесплатно полил поля. AGRO {AGRO}"; }
          else if (summer && w.kind === "sun" && w.t >= 23 && rr(41) < 0.6) { fx = { AGRO: -span(1, 3, 40) }; t = "Жара: огурцы в шоке, AGRO {AGRO}"; }
          else if (!summer && w.kind === "snow" && rr(41) < 0.25) { fx = { AGRO: span(1, 2, 40) }; t = "Снег укрыл озимые. Агрономы плачут от счастья: AGRO {AGRO}"; }
          if (fx) out.push({ kind: "weather", h: 7, e, fx, t: fill(t, fx) });
        } catch (e) {}
      }
      // Обычные заголовки
      const cnt = 1 + (rr(2) < 0.45 ? 1 : 0), used = new Set();
      for (let j = 0; j < cnt; j++) {
        let ni = Math.floor(rr(10 + j) * NEWS.length);
        if (used.has(ni)) ni = (ni + 1) % NEWS.length;
        used.add(ni);
        const N = NEWS[ni], fx = {};
        Object.entries(N.fx).forEach(([tk, [lo, hi]], q) => { fx[tk] = span(lo, hi, 50 + j * 5 + q); });
        out.push({ kind: "news", h: 8 + Math.floor(rr(30 + j) * 12), e: N.e, fx, t: fill(N.t, fx) });
      }
      out.sort((a, b) => a.h - b.h);
      out.forEach((n, k) => {
        const s = Object.values(n.fx).reduce((x, v) => x + v, 0);
        const L = s >= 0 ? AN_UP : AN_DOWN;
        n.d = d; n.k = k;
        n.an = L[Math.floor(h32(sd, 7200 + k, d) * L.length)];
      });
    }
    if (newsCache.m.size > 900) newsCache.m.clear();
    newsCache.m.set(d, out);
    return out;
  }

  /* ---------- Цены ---------- */
  // bar(i, d) → { c: закрытие, r: «диффузия» дня (лог), j: [[час, лог-скачок]] }
  let pxCache = { seed: null, a: {} };
  function bar(i, day) {
    const sd = invSeed();
    if (pxCache.seed !== sd) pxCache = { seed: sd, a: {} };
    const A = ASSETS[i];
    const arr = pxCache.a[i] || (pxCache.a[i] = [{ c: A.p, r: 0, j: [] }]);
    day = Math.max(0, Math.floor(day));
    while (arr.length <= day) {
      const d = arr.length, prev = arr[d - 1].c;
      let r = 0, j = [];
      if (i === IDX) {
        STOCKS.forEach((si) => { const b = bar(si, d); r += b.r / STOCKS.length; b.j.forEach(([h, x]) => j.push([h, x / STOCKS.length])); });
      } else {
        const k = A.cls === "crypto" ? 0.02 : 0.012;
        const fair = A.p * Math.exp(A.drift * d);
        r = A.drift + A.vol * gauss(h32(sd, i * 7919 + 11, d), h32(sd, i * 104729 + 13, d)) - k * Math.log(prev / fair);
        r = clamp(r, -0.3, 0.3);
        dayNews(d).forEach((n) => { if (n.fx[A.tk] != null) j.push([n.h, Math.log(1 + n.fx[A.tk])]); });
      }
      const tot = r + j.reduce((s, x) => s + x[1], 0);
      arr.push({ c: Math.max(A.p * 0.01, prev * Math.exp(tot)), r, j });
    }
    return arr[day];
  }
  const closeAt = (i, day) => bar(i, day).c;
  // Цена в игровую минуту: диффузия плавно + новости скачком в свой час + внутридневной шум
  function priceAt(i, m) {
    const d = Math.floor(m / 1440), frac = (m - d * 1440) / 1440, hr = frac * 24;
    const b = bar(i, d), prev = d >= 1 ? bar(i, d - 1).c : ASSETS[i].p;
    const part = b.r * frac + b.j.reduce((s, [h, x]) => s + (h <= hr ? x : 0), 0);
    const vol = ASSETS[i].vol || 0.01;
    const noise = (h32(invSeed(), i + 50, Math.floor(m)) - 0.5) * vol * 0.15 * Math.sin(Math.PI * frac);
    return Math.max(0.01, prev * Math.exp(part) * (1 + noise));
  }
  const pxNow = (i) => priceAt(i, nowM());
  const tkIdx = (tk) => ASSETS.findIndex((a) => a.tk === tk);
  const dayChg = (i) => { const prev = closeAt(i, gDay() - 1); return ((pxNow(i) - prev) / prev) * 100; };
  const visibleNews = (d, hr) => dayNews(d).filter((n) => d < gDay() || n.h <= hr);

  // Старая модель цен (до v2) — нужна один раз, чтобы перевести позиции по справедливой стоимости
  const LEG = [["VIBE", 4120, 0.018, 0.0012], ["ZABOT", 892, 0.028, 0.0016], ["KRDT", 1337, 0.01, 0.0006], ["VBC", 69420, 0.06, 0.0008], ["AIR", 12, 0.035, 0.0003], ["MEME", 228, 0.07, 0.0005]];
  function legacyPx(li, m) {
    const sd = invSeed(), [, p, vol, drift] = LEG[li];
    const d = Math.floor(m / 1440), fr = (m - d * 1440) / 1440;
    let c = p, a = p;
    for (let x = 1; x <= Math.max(0, d); x++) {
      let r = drift + vol * gauss(h32(sd, li * 7919 + 1, x), h32(sd, li * 104729 + 3, x));
      r -= 0.015 * Math.log(c / p);
      if (x === d) a = c;
      c = Math.max(p * 0.02, c * Math.exp(clamp(r, -0.35, 0.35)));
    }
    return d >= 1 ? a + (c - a) * fr : p;
  }

  /* ---------- Позиции, вклады, история ---------- */
  // invPos { TK: { qty, cost, since } }, invDeps [{ id, a, d0, term, rate }]
  function invPos() {
    const s = S();
    if (s.invV !== 2) {
      let pos = null;
      if (s.invPos) {
        pos = JSON.parse(JSON.stringify(s.invPos));
        const m = nowM();
        Object.keys(pos).forEach((tk) => {
          const li = LEG.findIndex((l) => l[0] === tk), i = tkIdx(tk), p = pos[tk];
          if (i < 0 || !p || !(p.qty > 0)) { delete pos[tk]; return; }
          if (li >= 0) p.qty = (p.qty * legacyPx(li, m)) / pxNow(i);
        });
      } else if (s.invHold) {
        pos = {};
        Object.entries(s.invHold).forEach(([tk, rub]) => { const i = tkIdx(tk); if (i >= 0 && rub > 0) pos[tk] = { qty: rub / pxNow(i), cost: rub }; });
      }
      pos = pos || {};
      Object.values(pos).forEach((p) => { if (p.since == null) p.since = gDay(); });
      Vibe.state.set({ invPos: pos, invHold: null, invValue: null, invV: 2 });
      return pos;
    }
    return s.invPos || {};
  }
  const invDeps = () => S().invDeps || [];
  const depSum = () => invDeps().reduce((s, x) => s + x.a, 0);
  const hasPos = () => Object.values(invPos()).some((p) => p.qty > 0) || invDeps().length > 0;
  const portAt = (m) => Object.entries(invPos()).reduce((s, [tk, p]) => { const i = tkIdx(tk); return i < 0 ? s : s + p.qty * priceAt(i, m); }, 0) + depSum();
  const portNow = () => portAt(nowM());
  const portCost = () => Object.values(invPos()).reduce((s, p) => s + (p.cost || 0), 0) + depSum();
  const qualified = () => !!S().invQual;

  function syncHist() {
    const td = gDay();
    let hist = (S().invHist || []).slice();
    if (!hasPos() && !hist.length) return hist;
    const pos = invPos(), cost = Math.round(portCost()), ds = depSum();
    const closeVal = (d) => Object.entries(pos).reduce((s, [tk, p]) => { const i = tkIdx(tk); return i < 0 ? s : s + p.qty * closeAt(i, d); }, 0) + ds;
    const last = hist.length ? hist[hist.length - 1].d : td;
    for (let d = Math.max(last + 1, td - 400); d < td; d++) hist.push({ d, v: Math.round(closeVal(d)), c: cost });
    hist = hist.filter((h) => h.d !== td);
    hist.push({ d: td, v: Math.round(portNow()), c: cost });
    hist = hist.slice(-180);
    Vibe.state.set({ invHist: hist });
    return hist;
  }

  /* ---------- Достижения ---------- */
  const INV_ACH = {
    inv_top: { e: "🏔️", t: "{Купил|Купила} на хаях", d: "{Купил|Купила} актив на 30-дневном максимуме" },
    inv_div: { e: "💰", t: "Первые дивиденды", d: "Пассивный доход пришёл сам" },
    inv_hodl: { e: "💎", t: "HODL 30 дней", d: "{Держал|Держала} актив 30 игровых дней" },
    inv_qual: { e: "🎓", t: "{Квалифицированный|Квалифицированная}", d: "{Сдал|Сдала} тест инвестора" },
    inv_crash: { e: "🫠", t: "{Пережил|Пережила} крах", d: "{Был|Была} в рынке в чёрный вторник" },
    inv_dep: { e: "🏦", t: "Стабильный вайб", d: "{Дождался|Дождалась} конца вклада" },
    inv_meme: { e: "🐸", t: "Мем-магнат", d: "{Купил|Купила} мем-коин на пампе" },
  };
  if (Vibe.ACH) Object.keys(INV_ACH).forEach((id) => { if (!Vibe.ACH[id]) Vibe.ACH[id] = INV_ACH[id]; });
  function invAch(id) {
    try {
      if (Vibe.ACH && !Vibe.ACH[id]) Vibe.ACH[id] = INV_ACH[id];
      if (Vibe.achieve) Vibe.achieve(id);
    } catch (e) {}
  }
  const hasAch = (id) => (S().achievements || []).includes(id);

  /* ---------- Доходы: дивиденды (1-го), купоны (15-го), вклады ---------- */
  function invIncome({ quiet = false } = {}) {
    const s = S();
    if (!s.profile || !Vibe.game || !Vibe.game.tx) return 0;
    invPos();
    const td = gDay(), m = invMult();
    let total = 0;
    // Вклады, у которых закончился срок
    const deps = invDeps(), keep = [];
    deps.forEach((x) => {
      if (x.d0 + x.term <= td) {
        const int = Math.round(x.a * x.rate * (x.term / 360) * m);
        Vibe.game.tx(`Вклад «Стабильный вайб» · возврат + проценты`, x.a + int, "🏦", "c-sky");
        total += int;
        invAch("inv_dep");
        if (!quiet) FX.toast(`Вклад закрылся: +${Vibe.rub(int)} процентов. Стабильно, как и обещали`, "🏦", 3200);
      } else keep.push(x);
    });
    if (keep.length !== deps.length) Vibe.state.set({ invDeps: keep });
    if (s.invDivDay == null) { Vibe.state.set({ invDivDay: td }); if (total) Vibe.refreshCounters(); return total; }
    if (s.invDivDay >= td) { if (total) Vibe.refreshCounters(); return total; }
    const pos = invPos();
    const owned = Object.keys(pos).length > 0;
    let paid = 0;
    for (let d = Math.max(s.invDivDay + 1, td - 400); d <= td; d++) {
      const dom = (d % 30) + 1;
      if (owned && dayNews(d).some((n) => n.kind === "crash")) invAch("inv_crash");
      if (dom !== 1 && dom !== 15) continue;
      const names = [];
      let sum = 0;
      Object.entries(pos).forEach(([tk, p]) => {
        const i = tkIdx(tk); if (i < 0 || !(p.qty > 0)) return;
        const A = ASSETS[i], rate = dom === 1 ? A.div : A.cpn;
        if (!rate) return;
        const amt = Math.round(p.qty * closeAt(i, d) * rate * m);
        if (amt > 0) { sum += amt; names.push(tk); }
      });
      if (sum > 0) {
        Vibe.game.tx(`${dom === 1 ? "Дивиденды" : "Купоны"} · ${names.join(", ")}`, sum, dom === 1 ? "💰" : "🏛️", "c-lime");
        paid += sum;
      }
    }
    total += paid;
    Vibe.state.set({ invDivDay: td, invDivTotal: (s.invDivTotal || 0) + paid });
    if (paid > 0) invAch("inv_div");
    if (Object.values(pos).some((p) => p.qty > 0 && p.since != null && td - p.since >= 30)) invAch("inv_hodl");
    if (total > 0) {
      Vibe.refreshCounters();
      Vibe.emit("invest", { kind: "income", amount: total });
      if (!quiet && paid > 0) FX.toast(`Пассивный доход: +${Vibe.rub(paid)}. Пассивный доход, активная радость`, "💰", 3200);
    }
    return total;
  }
  // Доходы приходят и без открытия Invest — по игровому тику
  if (Vibe.game && Vibe.game.on) Vibe.game.on(() => { try { invIncome(); } catch (e) {} });

  // Публичный хук для других модулей (например, Госвайб/налоги): прибыль и стоимость портфеля
  Vibe.invest = {
    value: () => Math.round(portNow()),
    cost: () => Math.round(portCost()),
    realized: () => (S().invRealized || 0),            // реализованная прибыль за всё время
    realizedYear: () => { const r = S().invRealizedY || {}; return r.y === Math.floor(gDay() / 360) ? r.a : 0; },
    price: (tk) => { const i = tkIdx(tk); return i < 0 ? 0 : pxNow(i); },
    news: (d = gDay()) => dayNews(d).slice(),
  };

  /* ---------- Мелочи отображения ---------- */
  const qtyTxt = (q) => (q < 1 ? q.toFixed(4) : q < 100 ? q.toFixed(2) : Vibe.fmt(q)).replace(".", ",");
  const incTxt = (a) => (a.div ? `💰 ${String(+(a.div * 100).toFixed(2)).replace(".", ",")}%/мес` : a.cpn ? `🏛️ купон ${String(+(a.cpn * 100).toFixed(1)).replace(".", ",")}%/мес` : "");
  function sparkPath(vals, w, h, pad = 2) {
    const mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
    return vals.map((v, i) => `${i ? "L" : "M"}${((i / (vals.length - 1)) * (w - pad * 2) + pad).toFixed(1)} ${(h - pad - ((v - mn) / r) * (h - pad * 2)).toFixed(1)}`).join(" ");
  }
  const durTxt = (min) => (min >= 1440 ? `${Math.floor(min / 1440)} дн.` : min >= 60 ? `${Math.floor(min / 60)} ч` : `${Math.round(min)} мин`);
  const hh = (h) => String(h).padStart(2, "0") + ":00";
  function assetRow(i) {
    const a = ASSETS[i], p = invPos()[a.tk], own = p && p.qty > 0, ch = dayChg(i);
    const lock = a.cls === "crypto" && !qualified();
    return `
      <div class="li fz-asset tap" data-asset="${i}" style="cursor:pointer">
        <div class="ic ${a.c}">${a.e}</div>
        <div class="tx"><b>${a.tk} ${incTxt(a) ? `<span class="badge fz-mini" style="background:var(--lime)">${incTxt(a)}</span>` : ""}${lock ? `<span class="badge fz-mini" style="background:#ffd0d0">🔒 тест</span>` : ""}</b><small>${own ? `у тебя ${qtyTxt(p.qty)} шт · ${Vibe.rub(p.qty * pxNow(i))}` : a.n}</small></div>
        <svg class="spark" viewBox="0 0 62 28"><path data-spark="${i}" d="" fill="none" stroke="${ch >= 0 ? "#12a150" : "#e5333d"}" stroke-width="2.5" stroke-linejoin="round"/></svg>
        <div class="amt" data-aprice="${i}">${Vibe.rub(pxNow(i))}<small class="${ch >= 0 ? "fz-up" : "fz-down"}">${pct(ch)}</small></div>
      </div>`;
  }
  const GROUPS = [
    { k: ["stock"], n: "Акции", sub: "дивиденды 1-го числа" },
    { k: ["index", "gold"], n: "Фонд и золото", sub: "для тех, кто спит спокойно" },
    { k: ["bond"], n: "Облигации", sub: "купон 15-го, риск как у табуретки" },
    { k: ["crypto"], n: "Крипта", sub: "волатильность включена в стоимость" },
  ];
  function riskOf() {
    const pos = invPos();
    let tot = depSum(), w = 0;
    Object.entries(pos).forEach(([tk, p]) => { const i = tkIdx(tk); if (i < 0) return; const v = p.qty * pxNow(i); tot += v; w += v * CLS[ASSETS[i].cls].risk; });
    return tot > 0 ? w / tot : 0;
  }
  const riskLabel = (r) => (r < 8 ? ["Бабушкин сундук", "🧓"] : r < 25 ? ["Осторожный хомяк", "🐹"] : r < 50 ? ["Сбалансированный вайб", "⚖️"] : r < 75 ? ["Любитель американских горок", "🎢"] : ["Казино с графиками", "🎰"]);
  function allocation() {
    const pos = invPos(), out = {};
    Object.entries(pos).forEach(([tk, p]) => { const i = tkIdx(tk); if (i < 0 || !(p.qty > 0)) return; const c = ASSETS[i].cls; out[c] = (out[c] || 0) + p.qty * pxNow(i); });
    if (depSum()) out.deposit = depSum();
    return Object.entries(out).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }
  function donutSvg(al) {
    const tot = al.reduce((s, [, v]) => s + v, 0) || 1, R = 42, C = 2 * Math.PI * R;
    let off = 0;
    const segs = al.map(([k, v]) => {
      const len = (v / tot) * C;
      const s = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${CLS[k].col}" stroke-width="20" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"/>`;
      off += len;
      return s;
    }).join("");
    return `<svg viewBox="0 0 120 120" class="fz-donut"><circle r="${R}" cx="60" cy="60" fill="none" stroke="#0e0e12" stroke-width="24"/>${segs}<circle r="31" cx="60" cy="60" fill="#fff" stroke="#0e0e12" stroke-width="2.5"/><circle r="53" cx="60" cy="60" fill="none" stroke="#0e0e12" stroke-width="2.5"/><text x="60" y="58" text-anchor="middle" font-size="9" font-weight="800" fill="#0e0e12">${al.length} класс${al.length === 1 ? "" : al.length < 5 ? "а" : "ов"}</text><text x="60" y="70" text-anchor="middle" font-size="12">${al.length >= 3 ? "🧺" : "🥚"}</text></svg>`;
  }
  function plSvg() {
    const h = (S().invHist || []).filter((x) => x.c != null).slice(-30);
    if (h.length < 2) return `<div class="muted" style="font-weight:800;font-size:12px;padding:18px 0;text-align:center">График появится через пару игровых дней. Терпение — тоже актив</div>`;
    const vals = h.map((x) => x.v - x.c), mx = Math.max(1, ...vals.map(Math.abs)), W = 340, H = 110, mid = H / 2, bw = W / h.length;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="fz-pl"><line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#0e0e12" stroke-width="2"/>${vals.map((v, i) => {
      const bh = (Math.abs(v) / mx) * (mid - 4);
      return `<rect x="${(i * bw + 1).toFixed(1)}" y="${(v >= 0 ? mid - bh : mid).toFixed(1)}" width="${Math.max(2, bw - 2).toFixed(1)}" height="${Math.max(1, bh).toFixed(1)}" rx="2" fill="${v >= 0 ? "#12a150" : "#e5333d"}" style="--i:${i}"/>`;
    }).join("")}</svg>`;
  }
  // Календарь выплат на 30 игровых дней вперёд
  function calendar() {
    const td = gDay(), pos = invPos(), m = invMult(), out = [];
    for (let d = td + 1; d <= td + 30; d++) {
      const dom = (d % 30) + 1, ev = [];
      if (dom === 1 || dom === 15) {
        let sum = 0; const names = [];
        Object.entries(pos).forEach(([tk, p]) => { const i = tkIdx(tk); if (i < 0) return; const r = dom === 1 ? ASSETS[i].div : ASSETS[i].cpn; if (r && p.qty > 0) { sum += p.qty * pxNow(i) * r * m; names.push(tk); } });
        if (sum > 0) ev.push({ e: dom === 1 ? "💰" : "🏛️", t: `${dom === 1 ? "Дивиденды" : "Купоны"} ${names.join(", ")}`, a: Math.round(sum) });
      }
      invDeps().forEach((x) => { if (x.d0 + x.term === d) ev.push({ e: "🏦", t: "Вклад закрывается", a: x.a + Math.round(x.a * x.rate * (x.term / 360) * m) }); });
      out.push({ d, dom, ev, in: d - td });
    }
    return out;
  }

  Vibe.screen("invest", {
    render() {
      invPos();
      const own = hasPos(), L = finLvl(), T = tierOf(L);
      return `
        ${Vibe.ui.head("Vibe Invest", "инвестиции для тех, кто уже всё потратил", Vibe.ui.vibikiPill())}
        <div data-away></div>
        <div class="card c-lime fz-inv-top">
          <span class="sticker" style="top:14px;right:14px;background:var(--pink)">📈 только вверх*</span>
          <div style="font-weight:800;font-size:13px" data-invlbl>${own ? "Мой портфель" : "Фонд «Весь Вайб-Сити» · портфель пуст"}</div>
          <div class="big-num" data-inv>${Vibe.rub(own ? portNow() : pxNow(IDX))}</div>
          <div class="fz-row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
            <span class="badge" data-chg style="background:#fff">▲ +0,00%</span>
            <span style="font-weight:800;font-size:12px" data-chglbl>за сегодня</span>
          </div>
          <div style="font-weight:800;font-size:12px;margin-top:6px" data-pnl></div>
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
          <button class="badge tap fz-lvl" data-act="level">${T.e} Инвест-уровень ${L} · ${T.n}</button>
        </div>
        <div class="fz-tabs">
          <button class="chip on" data-tab="market">📊 Рынок</button>
          <button class="chip" data-tab="news">📰 Новости <span class="fz-dot" data-newsdot hidden></span></button>
          <button class="chip" data-tab="port">🥧 Портфель</button>
        </div>
        <div data-body class="fz-popin"></div>
        <div class="fine">Цены, новости, крахи и пампы идут по игровым дням, даже когда ты не смотришь. Особенно когда не смотришь. Дивиденды — 1-го, купоны — 15-го. Комиссия за продажу ${String(sellFee() * 100).replace(".", ",")}% — за заботу. Доходность в прошлом не гарантирует доходность в прошлом. Аналитика Вайбота не является инвестиционной рекомендацией, прогнозом, мнением и вообще ничем. Vibe Invest не является брокером, банком, гадалкой и вашим другом, хотя очень старается.</div>`;
    },
    mount(root) {
      const sc = scope();
      const line = root.querySelector("[data-line]"), area = root.querySelector("[data-area]"), dot = root.querySelector("[data-dot]");
      const valEl = root.querySelector("[data-inv]");
      const chartBox = root.querySelector("[data-chart]");
      const scrub = root.querySelector("[data-scrub]");
      const body = root.querySelector("[data-body]");
      let per = 0, series = [], animUntil = 0, tab = "market";
      const W = 340, H = 180, PAD = 14;
      const curHr = () => (nowM() % 1440) / 60;
      const newsKey = () => { const v = visibleNews(gDay(), curHr()); const n = v[v.length - 1]; return n ? `${n.d}:${n.k}` : ""; };
      let lastNews = newsKey();

      // Что накапало, пока тебя не было
      const divGot = invIncome({ quiet: true });
      syncHist();
      const seen = S().invSeen;
      const own0 = hasPos();
      let value = own0 ? portNow() : pxNow(IDX);
      if (own0 && seen && seen.v > 0 && nowM() - seen.m >= 20) {
        const ch = ((value - seen.v) / seen.v) * 100, d = value - seen.v;
        const up = ch >= 0;
        // Главные события за время отсутствия
        const from = Math.floor(seen.m / 1440), big = [];
        for (let x = Math.max(from, gDay() - 30); x <= gDay(); x++) dayNews(x).forEach((n) => { if (n.kind === "crash" || n.kind === "rally" || n.kind === "pump" || n.kind === "dump") big.push(n); });
        const bigN = big.filter((n) => n.d < gDay() || n.h <= curHr()).slice(-2);
        root.querySelector("[data-away]").innerHTML = `
          <div class="card ${up ? "c-mint" : "c-coral"} fz-popin" style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <span class="emo wobble" style="font-size:40px">${up ? "🚀" : "🫠"}</span>
            <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:12px">За время, пока тебя не было (${durTxt(nowM() - seen.m)})</div>
            <div class="display" style="font-size:26px">${up ? "+" : "−"}${pct(Math.abs(ch)).slice(1)}</div>
            <div style="font-weight:800;font-size:12px">${up ? "+" : "−"}${Vibe.rub(Math.abs(d))}${divGot ? ` · доход +${Vibe.rub(divGot)}` : ""}</div>
            ${bigN.map((n) => `<div style="font-weight:700;font-size:11px;margin-top:4px">${n.e} ${n.t}</div>`).join("")}</div>
          </div>`;
        sc.to(() => { if (up) { FX.confetti({ count: 60 }); FX.sound.success(); } else FX.sound.error(); }, 500);
      } else if (divGot) sc.to(() => FX.toast(`Пассивный доход пришёл: +${Vibe.rub(divGot)}`, "💰", 3000), 600);

      /* ----- Верхний график ----- */
      function seriesFor(k) {
        const own = hasPos();
        const nm = nowM(), td = Math.floor(nm / 1440);
        const live = own ? portNow() : pxNow(IDX);
        let pts = [];
        if (k === 0) {
          for (let m = td * 1440; m < nm; m += 30) pts.push(own ? portAt(m) : priceAt(IDX, m));
        } else {
          const span = k === 1 ? 7 : k === 2 ? 30 : 100000;
          if (own) pts = (S().invHist || []).filter((h) => h.d < td && h.d >= td - span).map((h) => h.v);
          else for (let d = Math.max(0, td - Math.min(span, 90)); d < td; d++) pts.push(closeAt(IDX, d));
        }
        pts.push(live);
        if (pts.length < 2) pts.unshift(pts[0]);
        return pts;
      }
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
        const ch = first ? ((lastV - first) / first) * 100 : 0;
        const chg = root.querySelector("[data-chg]");
        chg.textContent = `${ch >= 0 ? "▲" : "▼"} ${pct(ch)} · ${ch >= 0 ? "+" : "−"}${Vibe.rub(Math.abs(lastV - first))}`;
        chg.style.background = ch >= 0 ? "#fff" : "#ffd0d0";
      }
      function head() {
        const own = hasPos();
        root.querySelector("[data-invlbl]").textContent = own ? "Мой портфель" : "Фонд «Весь Вайб-Сити» · портфель пуст";
        const pnl = root.querySelector("[data-pnl]");
        if (own) {
          const cost = portCost(), v = portNow(), d = v - cost;
          pnl.innerHTML = `Вложено ${Vibe.rub(cost)} · <span class="${d >= 0 ? "fz-up" : "fz-down"}">${d >= 0 ? "+" : "−"}${Vibe.rub(Math.abs(d))} (${pct(cost ? (d / cost) * 100 : 0)})</span>`;
        } else pnl.textContent = "Тапни актив ниже — купишь первую акцию. График сам себя не нарисует";
      }
      function setPeriod(i) {
        per = i;
        series = seriesFor(i);
        root.querySelector("[data-chglbl]").textContent = PERIODS[i].label;
        draw(true);
      }
      function setValue(nv, animate) {
        const prev = value;
        value = nv;
        FX.countTo(valEl, value, { from: prev, dur: animate ? 1100 : 500, fmt: Vibe.rub });
        valEl.classList.remove("flash-up", "flash-down");
        valEl.classList.add(nv >= prev ? "flash-up" : "flash-down");
        sc.to(() => valEl.classList.remove("flash-up", "flash-down"), 650);
      }

      /* ----- Вкладки ----- */
      function marketHtml() {
        const deps = invDeps();
        return `
          ${Vibe.ui.marquee(ASSETS.map((a, i) => { const c = dayChg(i); return `${a.e} ${a.tk} ${c >= 0 ? "▲" : "▼"} ${pct(c)}`; }))}
          <button class="card tap c-sky fz-depo" data-act="deposit">
            <span class="emo float" style="font-size:38px">🏦</span>
            <div style="flex:1;min-width:0;text-align:left"><b style="display:block">Вклад «Стабильный вайб»</b>
            <small style="font-weight:800;font-size:12px">${String(Math.round(depRate() * 100))}% годовых · ${deps.length ? `открыто ${deps.length} на ${Vibe.rub(depSum())}` : "без риска, но с замком"}</small></div>
            <span class="badge" style="background:#fff">🔒 срок</span>
          </button>
          ${GROUPS.map((g) => `
            <h2 class="sec">${g.n} <small>${g.k[0] === "crypto" && !qualified() ? "🔒 нужен тест квалифицированного инвестора" : g.sub}</small></h2>
            <div class="card" style="padding:4px 14px"><div class="stagger">${ASSETS.map((a, i) => (g.k.includes(a.cls) ? assetRow(i) : "")).join("")}</div></div>`).join("")}
          ${coachCard()}`;
      }
      function coachCard() {
        const n = S().invCoach || 0, C = COACH[Math.min(n, COACH.length - 1)];
        return `
          <button class="card tap c-orange fz-coach" data-act="coach">
            <span class="sticker" style="top:-10px;right:12px;background:var(--yellow);transform:rotate(5deg)">−90% только сегодня*</span>
            <span class="emo wobble" style="font-size:42px">🧑‍🏫</span>
            <div style="flex:1;min-width:0;text-align:left"><b style="display:block">Инвестиционный коуч Эдуард</b>
            <small style="font-weight:800;font-size:12px">${C.n} · ${Vibe.rub(C.p)}</small></div>
          </button>`;
      }
      function newsHtml() {
        const td = gDay(), hr = curHr(), L = finLvl(), items = [];
        for (let d = td; d >= Math.max(1, td - 6) && items.length < 16; d--) visibleNews(d, hr).slice().reverse().forEach((n) => items.length < 16 && items.push(n));
        let insider = "";
        if (L >= 3) {
          const tn = dayNews(td + 1)[0];
          if (tn) {
            const tk = Object.keys(tn.fx)[0], up = tn.fx[tk] >= 0, lie = h32(invSeed(), 8800, td + 1) < 0.3;
            const say = lie ? !up : up;
            insider = `<div class="card c-violet fz-insider fz-popin"><span class="emo wobble" style="font-size:34px">🤫</span><div style="flex:1;min-width:0"><b style="display:block;color:#fff">Инсайд от соседа</b><small style="font-weight:800;font-size:12px;color:#fff">«Завтра ${tk} пойдёт ${say ? "вверх ▲" : "вниз ▼"}, мне кум сказал». Кум ошибается в 30% случаев.</small></div></div>`;
          }
        } else insider = `<div class="card flat fz-insider" style="opacity:.75"><span style="font-size:30px">🔒</span><div style="flex:1;min-width:0"><b style="display:block">Инсайд от соседа</b><small style="font-weight:800;font-size:12px">Откроется на 3 уровне финансов. Сосед пока не доверяет</small></div></div>`;
        const when = (n) => (n.d === td ? `сегодня ${hh(n.h)}` : n.d === td - 1 ? `вчера ${hh(n.h)}` : `${td - n.d} дн. назад`);
        const col = (n) => (n.kind === "crash" || n.kind === "dump" ? "c-coral" : n.kind === "rally" || n.kind === "pump" ? "c-lime" : n.kind === "weather" ? "c-sky" : "c-white");
        return `
          ${insider}
          <h2 class="sec">Лента <small>игровое время · двигает цены</small></h2>
          <div class="stagger">${items.length ? items.map((n) => `
            <div class="card ${col(n)} fz-news">
              <div class="fz-between"><span class="fz-news-e">${n.e}</span><small style="font-weight:800;font-size:11px">${when(n)}${n.kind === "crash" ? " · 🚨 КРАХ" : n.kind === "rally" ? " · 🚀 РАЛЛИ" : n.kind === "pump" ? " · 🐸 ПАМП" : n.kind === "dump" ? " · 💥 ДАМП" : ""}</small></div>
              <b class="fz-news-t">${n.t}</b>
              <div class="fz-fx">${Object.entries(n.fx).slice(0, 6).map(([tk, x]) => `<button class="badge tap ${x >= 0 ? "fz-bup" : "fz-bdown"}" data-asset="${tkIdx(tk)}">${tk} ${pctF(x)}</button>`).join("")}</div>
              <div class="fz-an"><span>🤖</span><span><b>Аналитика от Вайбота:</b> ${n.an}</span></div>
            </div>`).join("") : `<div class="card c-white" style="text-align:center"><span class="emo float" style="font-size:40px">📭</span><p style="font-weight:800">Новостей пока нет. Рынок спит, Вайбот — нет</p></div>`}</div>`;
      }
      function portHtml() {
        const L = finLvl(), T = tierOf(L), next = TIERS.find((t) => t.l > L), m = invMult();
        const pos = invPos(), own = hasPos(), td = gDay();
        const lvl = `
          <div class="card c-violet fz-lvlcard" data-act="level">
            <div class="fz-row"><span class="emo float" style="font-size:44px">${T.e}</span>
            <div style="flex:1;min-width:0;color:#fff"><div style="font-weight:800;font-size:12px">Инвест-уровень ${L}</div><div class="display" style="font-size:24px">${T.n}</div>
            <small style="font-weight:800;font-size:12px">${next ? `Финансы ${next.l} → ${next.perk}` : "Максимум. Дальше только своя биржа"}</small></div></div>
            ${m > 1 ? `<div class="badge" style="margin-top:8px;background:var(--lime)">📊 Перк «Инвестор»: доход ×${String(m).replace(".", ",")}</div>` : ""}
          </div>`;
        if (!own) return lvl + `<div class="card c-white" style="text-align:center;margin-top:14px"><span class="emo float" style="font-size:48px">🥚</span><p style="font-weight:800">Портфель пуст. Купи что-нибудь на вкладке «Рынок» — и тут появятся бублик, риск и календарь выплат</p></div>` + achHtml();
        const al = allocation(), tot = al.reduce((s, [, v]) => s + v, 0) || 1, risk = riskOf(), [rl, re] = riskLabel(risk);
        const cal = calendar(), evs = cal.filter((c) => c.ev.length);
        const holdings = Object.entries(pos).filter(([, p]) => p.qty > 0).map(([tk, p]) => {
          const i = tkIdx(tk); if (i < 0) return "";
          const a = ASSETS[i], v = p.qty * pxNow(i), d = v - (p.cost || 0), days = p.since != null ? td - p.since : 0;
          return `<div class="li tap" data-asset="${i}" style="cursor:pointer"><div class="ic ${a.c}">${a.e}</div><div class="tx"><b>${a.tk}</b><small>${qtyTxt(p.qty)} шт · держишь ${days} дн.${days >= 30 ? " 💎" : ""}</small></div><div class="amt" style="text-align:right">${Vibe.rub(v)}<small class="${d >= 0 ? "fz-up" : "fz-down"}" style="display:block;font-size:11px;font-weight:800">${d >= 0 ? "+" : "−"}${Vibe.rub(Math.abs(d))}</small></div></div>`;
        }).join("");
        const deps = invDeps().map((x) => {
          const done = clamp((td - x.d0) / x.term, 0, 1), int = Math.round(x.a * x.rate * (x.term / 360) * m);
          return `<div class="li"><div class="ic c-sky">🏦</div><div class="tx"><b>${Vibe.rub(x.a)} · ${String(Math.round(x.rate * 100))}%</b><small>ещё ${x.d0 + x.term - td} дн. · проценты +${Vibe.rub(int)}</small><div class="progress" style="margin-top:6px;height:10px"><i style="--p:${Math.round(done * 100)}%"></i></div></div><button class="btn sm" data-depclose="${x.id}" style="flex:0 0 auto">Снять</button></div>`;
        }).join("");
        return `${lvl}
          <div class="grid2" style="margin-top:14px">
            <div class="card c-white fz-alloc"><div style="font-weight:800;font-size:12px">Распределение</div>${donutSvg(al)}
              <div class="fz-legend">${al.map(([k, v]) => `<span><i style="background:${CLS[k].col}"></i>${CLS[k].n} ${Math.round((v / tot) * 100)}%</span>`).join("")}</div></div>
            <div class="card c-yellow fz-risk"><div style="font-weight:800;font-size:12px">Риск-метр</div>
              <svg viewBox="0 0 120 70" class="fz-gauge"><path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#0e0e12" stroke-width="16" stroke-linecap="round"/><path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="url(#fzRisk)" stroke-width="11" stroke-linecap="round"/>
              <defs><linearGradient id="fzRisk"><stop offset="0" stop-color="#7cf5c8"/><stop offset=".5" stop-color="#ffe14d"/><stop offset="1" stop-color="#ff3b3b"/></linearGradient></defs>
              <g class="fz-needle" style="transform:rotate(${(-90 + risk * 1.8).toFixed(1)}deg)"><line x1="60" y1="62" x2="60" y2="20" stroke="#0e0e12" stroke-width="4" stroke-linecap="round"/></g><circle cx="60" cy="62" r="6" fill="#0e0e12"/></svg>
              <div class="display" style="font-size:22px;text-align:center">${Math.round(risk)}/100</div><div style="font-weight:800;font-size:12px;text-align:center">${re} ${rl}</div></div>
          </div>
          <h2 class="sec">P/L по дням <small>прибыль/убыток, последние 30 игровых дней</small></h2>
          <div class="card c-white">${plSvg()}</div>
          <h2 class="sec">Мои активы <small>тап — купить или продать</small></h2>
          <div class="card" style="padding:4px 14px">${holdings || ""}${deps}${!holdings && !deps ? `<div class="muted" style="padding:12px 0;font-weight:800">Пусто</div>` : ""}</div>
          <h2 class="sec">Календарь выплат <small>следующие 30 игровых дней</small></h2>
          <div class="card c-mint">
            <div class="fz-cal">${cal.map((c) => `<div class="${c.ev.length ? "on" : ""}" title="${c.ev.map((e) => e.t).join(", ")}"><small>${c.dom}</small>${c.ev.length ? c.ev.map((e) => e.e).join("") : ""}</div>`).join("")}</div>
            ${evs.length ? evs.slice(0, 5).map((c) => c.ev.map((e) => `<div class="fz-between" style="font-weight:800;font-size:13px;margin-top:8px"><span>${e.e} ${e.t}</span><span>через ${c.in} дн. · ≈${Vibe.rub(e.a)}</span></div>`).join("")).join("") : `<div style="font-weight:800;font-size:12px;margin-top:8px">Выплат не ожидается. Купи VIBE, KRDT или облигации — и календарь оживёт</div>`}
            <div style="font-weight:800;font-size:12px;margin-top:10px">Всего получено: ${Vibe.rub(S().invDivTotal || 0)}</div>
          </div>
          ${achHtml()}
          <div class="card flat fz-tax"><span style="font-size:26px">🏛️</span><div style="flex:1;min-width:0"><b style="display:block;font-size:13px">Налоги и вычеты</b><small style="font-weight:700;font-size:12px">Реализованная прибыль за игровой год: ${Vibe.rub(Vibe.invest.realizedYear())}. Курс коуча — это «обучение», его можно вернуть вычетом в Госвайбе. Коуч об этом не знает.</small></div></div>`;
      }
      function achHtml() {
        // Достижения живут в Vibegram; здесь — только счётчик и ссылка
        const n = Object.keys(INV_ACH).filter(hasAch).length;
        return `<button class="card flat tap" data-gramach style="display:flex;gap:12px;align-items:center;width:100%;text-align:left;margin:14px 0"><span style="font-size:26px">🏆</span><div style="flex:1"><b>Достижения инвестора: ${n} из ${Object.keys(INV_ACH).length}</b><small style="display:block;font-weight:700">Все достижения — в альбоме Vibegram</small></div><span>›</span></button>`;
      }
      function sparks() {
        const td = gDay();
        ASSETS.forEach((a, i) => {
          const sp = root.querySelector(`[data-spark="${i}"]`);
          if (!sp) return;
          const vals = [];
          for (let d = Math.max(0, td - 14); d < td; d++) vals.push(closeAt(i, d));
          vals.push(pxNow(i));
          if (vals.length < 2) vals.unshift(closeAt(i, 0));
          sp.setAttribute("d", sparkPath(vals, 62, 28));
        });
      }
      function showTab(t, anim) {
        tab = t;
        root.querySelectorAll("[data-tab]").forEach((c) => c.classList.toggle("on", c.dataset.tab === t));
        body.innerHTML = t === "news" ? newsHtml() : t === "port" ? portHtml() : marketHtml();
        body.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
        if (anim) retrigger(body, "fz-popin", 520);
        if (t === "market") sparks();
        if (t === "news") { const nd = root.querySelector("[data-newsdot]"); if (nd) nd.hidden = true; }
      }
      function afterTrade(animate) {
        syncHist();
        setValue(hasPos() ? portNow() : pxNow(IDX), animate);
        showTab(tab); head();
        series = seriesFor(per);
        draw(true);
      }

      // Живые тики: цена считается от игровой минуты — детерминированно
      let tickN = 0;
      sc.every(() => {
        tickN++;
        const nv = hasPos() ? portNow() : pxNow(IDX);
        if (Math.abs(nv - value) >= 0.5) setValue(nv);
        series[series.length - 1] = nv;
        if (performance.now() > animUntil) draw(false);
        if (tab === "market") {
          const i = ri(0, ASSETS.length - 1), ch = dayChg(i);
          const el = root.querySelector(`[data-aprice="${i}"]`);
          if (el) { el.innerHTML = `${Vibe.rub(pxNow(i))}<small class="${ch >= 0 ? "fz-up" : "fz-down"}">${pct(ch)}</small>`; retrigger(el, "tick", 500); }
          const sp = root.querySelector(`[data-spark="${i}"]`);
          if (sp) sp.setAttribute("stroke", ch >= 0 ? "#12a150" : "#e5333d");
        }
        // Свежая новость вышла в игровом времени
        const nk = newsKey();
        if (nk && nk !== lastNews) {
          lastNews = nk;
          const v = visibleNews(gDay(), curHr()), n = v[v.length - 1];
          if (n) {
            FX.toast(n.t, n.e, 3600);
            if (n.kind === "crash") { FX.shake(root.querySelector(".fz-inv-top")); FX.sound.error(); }
            else if (n.kind === "rally" || n.kind === "pump") FX.burst(dot, { emojis: ["🚀", "📈", "✨"], count: 12, spread: 100 });
            if (tab === "news") showTab("news");
            else { const nd = root.querySelector("[data-newsdot]"); if (nd) nd.hidden = false; }
          }
        }
        if (tickN % 12 === 0) { try { if (invIncome() > 0) afterTrade(false); } catch (e) {} }
        head();
      }, 2500);

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

      /* ----- Тест квалифицированного инвестора ----- */
      const QUIZ = [
        { q: "Что такое волатильность?", a: ["График как кардиограмма после трёх энергетиков", "Новый вкус Vibe Cola", "Имя кота мэра"], ok: 0 },
        { q: "Вайбкоин упал на 50%. Твои действия?", a: ["Беру кредит, чтобы докупить", "Ничего. Я знал, на что шёл 💎", "Звоню маме"], ok: 1, wrong: "Вайбот в восторге. Кредит Навсегда — тоже." },
        { q: "Сколько можно потерять в крипте?", a: ["Ничего, график же зелёный", "Только то, что не жалко, а мне ничего не жалко", "Всё. И немного нервов сверху"], ok: 2 },
        { q: "Кто такой квалифицированный инвестор?", a: ["Тот, у кого есть диплом", "Тот, кто прошёл этот тест", "Мой дядя, он всё знает"], ok: 1 },
      ];
      function quiz(then) {
        let k = 0, score = 0;
        Vibe.modal("", {
          sound: "pop",
          onMount(md, close) {
            function step() {
              if (k >= QUIZ.length) {
                const pass = score >= 3;
                md.innerHTML = pass ? `
                  <div class="m-emo float">🎓</div><div class="display">Поздравляем!</div>
                  <p>Ты квалифицированный инвестор (${score}/${QUIZ.length}). Теперь ты можешь терять деньги официально.</p>
                  <button class="btn black block" data-ok>К крипте 🚀</button>` : `
                  <div class="m-emo wobble">🫣</div><div class="display">${score}/${QUIZ.length}</div>
                  <p>Вы слишком уверены в себе, чтобы быть квалифицированным. Нужно 3 из 4. Пересдача бесплатная — пока что.</p>
                  <button class="btn black block" data-retry>Пересдать</button><button class="btn block" data-close style="margin-top:8px">Потом</button>`;
                if (pass) {
                  Vibe.state.set({ invQual: true });
                  invAch("inv_qual"); FX.confetti(); FX.sound.success();
                  Vibe.reward({ xp: 40 });
                  md.querySelector("[data-ok]").addEventListener("click", () => { close(); if (then) sc.to(then, 350); if (tab === "market") showTab("market"); });
                } else md.querySelector("[data-retry]").addEventListener("click", () => { k = 0; score = 0; step(); FX.sound.pop(); });
                return;
              }
              const Q = QUIZ[k];
              md.innerHTML = `
                <div style="margin-bottom:6px">${Vibe.zabotik(72, "sly")}</div>
                <div class="muted" style="font-weight:800;font-size:12px">Тест квалифицированного инвестора · ${k + 1}/${QUIZ.length}</div>
                <div class="display" style="font-size:22px;margin:6px 0 12px">${Q.q}</div>
                ${Q.a.map((a, i) => `<button class="btn block" data-qa="${i}" style="margin-top:8px;white-space:normal;height:auto;min-height:52px;padding:10px 14px">${a}</button>`).join("")}`;
              md.querySelectorAll("[data-qa]").forEach((b) => b.addEventListener("click", () => {
                const right = +b.dataset.qa === Q.ok;
                if (right) score++;
                b.style.background = right ? "var(--lime)" : "#ffd0d0";
                FX.bump(b);
                right ? FX.sound.like() : FX.sound.error();
                if (!right && Q.wrong) FX.toast(Q.wrong, "🤖");
                k++;
                setTimeout(step, 550);
              }, { once: true }));
            }
            step();
          },
        });
      }

      /* ----- Инвестиционный коуч ----- */
      function coach() {
        const n = S().invCoach || 0, C = COACH[Math.min(n, COACH.length - 1)];
        const LESSONS = [
          "Урок 1: Купи мой второй курс. Это и есть пассивный доход. Мой.",
          "Урок 2: Визуализируй прибыль. Чем чётче видишь — тем больнее потом.",
          "Урок 3: Богатые думают иначе. Например, о том, как продать тебе урок 4.",
          "Урок 4: Диверсифицируй коучей. Я, я и ещё раз я.",
        ];
        Vibe.modal(`
          <div class="m-emo wobble">🧑‍🏫</div><div class="display" style="font-size:24px">Коуч Эдуард</div>
          <p>«Я заработал первый миллион на курсах о том, как заработать первый миллион». ${C.n}.</p>
          <div class="badge" style="background:var(--yellow);margin-bottom:12px">🔥 Осталось 3 места (всегда)</div>
          <button class="btn black block" data-buycoach>Записаться · ${Vibe.rub(C.p)}</button>
          <button class="btn block" data-close style="margin-top:8px">Я сам себе коуч</button>
          <div class="fine">Опыт финансов прилагается. Деньги — нет. Курс относится к «обучению», вычет — в Госвайбе.</div>`, {
          sound: "pop",
          onMount(md, close) {
            md.querySelector("[data-buycoach]").addEventListener("click", (e) => {
              const ok = Vibe.pay(C.p, { title: `Learn · курс «Инвест-коуч: ${C.n}»`, emoji: "🧑‍🏫", col: "c-orange", from: e.currentTarget, cashback: 0 });
              if (!ok) return;
              Vibe.state.set({ invCoach: n + 1 });
              md.innerHTML = `<div class="m-emo float">📜</div><div class="display" style="font-size:24px">Курс пройден!</div><p>${LESSONS[n % LESSONS.length]}</p><button class="btn black block" data-close>Я стал богаче. Духовно 🙏</button>`;
              FX.confetti({ count: 50 }); FX.sound.success();
              if (tab === "market") showTab("market");
            });
          },
        });
      }

      /* ----- Вклад ----- */
      function deposit() {
        const AM = [5000, 10000, 25000, 50000, 100000, 250000];
        let amount = 10000, term = 90;
        Vibe.ui.sheet(`
          <div class="fz-row" style="margin-bottom:12px">
            <div class="ic c-sky" style="width:62px;height:62px;border-radius:20px;border:var(--line);display:grid;place-items:center;font-size:34px"><span class="emo wobble">🏦</span></div>
            <div style="flex:1;min-width:0"><div class="display" style="font-size:22px">Вклад «Стабильный вайб»</div><div style="font-weight:800;font-size:13px">${String(Math.round(depRate() * 100))}% годовых · без риска · на замке</div></div>
          </div>
          <div data-dbody></div>`, {
          onMount(sh, close) {
            const b = sh.querySelector("[data-dbody]");
            function drawD() {
              const int = Math.round(amount * depRate() * (term / 360) * invMult());
              b.innerHTML = `
                <div class="card flat c-white" style="text-align:center;padding:14px">
                  <div class="muted" style="font-weight:800;font-size:12px">Положить на ${term} игровых дней</div>
                  <div class="big-num" style="font-size:40px;margin-top:4px">${Vibe.rub(amount)}</div>
                  <div style="font-weight:800;font-size:13px;margin-top:6px">Вернётся ${Vibe.rub(amount + int)} · <span class="fz-up">+${Vibe.rub(int)}</span></div>
                </div>
                <div class="fz-amts">${AM.map((v) => `<button class="chip ${v === amount ? "on" : ""}" data-dam="${v}">${Vibe.rub(v)}</button>`).join("")}</div>
                <div class="chips" style="margin:0 0 6px">${DEP_TERMS.map((t) => `<button class="chip ${t === term ? "on" : ""}" data-dterm="${t}">${t} дн.</button>`).join("")}</div>
                <button class="btn black xl block" data-dopen ${invDeps().length >= DEP_MAX ? "disabled" : ""}>${invDeps().length >= DEP_MAX ? "Максимум 5 вкладов" : "Открыть вклад 🔒"}</button>
                <div class="fine">Досрочное снятие — проценты сгорают, тело возвращается. Вклад застрахован чувством стабильности. Ставка 9% «годовых» — игровой год, 360 дней. Проценты не капитализируются, потому что капитализация — это не про вас.</div>`;
            }
            drawD();
            sh.addEventListener("click", (e) => {
              const a = e.target.closest("[data-dam]"); if (a) { amount = +a.dataset.dam; drawD(); FX.sound.pop(); return; }
              const t = e.target.closest("[data-dterm]"); if (t) { term = +t.dataset.dterm; drawD(); FX.sound.pop(); return; }
              const o = e.target.closest("[data-dopen]");
              if (o && invDeps().length < DEP_MAX) {
                const ok = Vibe.pay(amount, { title: "Vibe Invest · вклад «Стабильный вайб»", emoji: "🏦", col: "c-sky", from: o, cashback: 0 });
                if (!ok) return;
                syncHist();
                Vibe.state.set({ invDeps: [...invDeps(), { id: Date.now().toString(36), a: amount, d0: gDay(), term, rate: depRate() }] });
                Vibe.emit("invest", { kind: "deposit", amount });
                close();
                FX.confetti({ count: 40 }); FX.sound.success();
                FX.toast(`Вклад открыт на ${term} дн. Стабильность — это вайб`, "🏦");
                sc.to(() => afterTrade(true), 400);
              }
            });
          },
        });
      }
      function depClose(id) {
        const x = invDeps().find((d) => d.id === id); if (!x) return;
        Vibe.modal(`<div class="m-emo wobble">🔓</div><div class="display" style="font-size:24px">Снять досрочно?</div>
          <p>Вернём ${Vibe.rub(x.a)}. Накопленные проценты сгорят — так написано в пункте 9.6.12, который вы, конечно, читали.</p>
          <button class="btn black block" data-yes>Снять ${Vibe.rub(x.a)}</button><button class="btn block" data-close style="margin-top:8px">Пусть лежит</button>`, {
          sound: "pop",
          onMount(md, close) {
            md.querySelector("[data-yes]").addEventListener("click", () => {
              if (!invDeps().some((d) => d.id === id)) return close();
              syncHist();
              Vibe.state.set({ invDeps: invDeps().filter((d) => d.id !== id) });
              Vibe.game.tx("Вклад «Стабильный вайб» · досрочно", x.a, "🏦", "c-sky");
              Vibe.refreshCounters();
              close(); FX.sound.error();
              FX.toast("Вклад закрыт. Проценты ушли на заботу о вкладчиках", "🫠");
              sc.to(() => afterTrade(false), 300);
            });
          },
        });
      }

      /* ----- Покупка / продажа ----- */
      function trade(i) {
        const a = ASSETS[i];
        if (!a) return;
        if (a.cls === "crypto" && !qualified()) {
          Vibe.modal(`<div class="m-emo wobble">🔒</div><div class="display" style="font-size:24px">Крипта только для квалифицированных</div>
            <p>Регулятор Вайб-Сити заботится о тебе. Пройди короткий тест — 4 вопроса, 0 смысла.</p>
            <button class="btn black block" data-q>Пройти тест 🎓</button><button class="btn block" data-close style="margin-top:8px">Я боюсь</button>`, {
            sound: "pop",
            onMount(md, close) { md.querySelector("[data-q]").addEventListener("click", () => { close(); setTimeout(() => quiz(() => trade(i)), 320); }); },
          });
          return;
        }
        const AM = [500, 1000, 5000, 10000, 25000, 96000];
        const SP = [0.25, 0.5, 1];
        const pos = invPos()[a.tk];
        const owned = pos && pos.qty > 0;
        let mode = "buy", amount = 1000, part = 1;
        const px = () => pxNow(i);
        const n0 = visibleNews(gDay(), curHr()).filter((n) => n.fx[a.tk] != null).pop();
        const riskB = { stock: ["средний риск", "var(--yellow)"], index: ["риск пониже", "var(--mint)"], gold: ["тихая гавань", "var(--yellow)"], bond: ["низкий риск", "var(--mint)"], crypto: ["высокий риск, высокий вайб", "#ff3b3b"] }[a.cls];
        Vibe.ui.sheet(`
          <div class="fz-row" style="margin-bottom:12px">
            <div class="ic ${a.c}" style="width:62px;height:62px;border-radius:20px;border:var(--line);display:grid;place-items:center;font-size:34px"><span class="emo wobble">${a.e}</span></div>
            <div style="flex:1;min-width:0"><div class="display" style="font-size:26px">${a.tk}</div><div class="muted" style="font-weight:800;font-size:13px">${a.n} · ${Vibe.rub(px())}</div>${incTxt(a) ? `<div style="font-weight:800;font-size:12px;margin-top:2px">${incTxt(a)} · ${a.div ? "1-го" : "15-го"} числа</div>` : ""}</div>
            <span class="badge" style="background:${riskB[1]};${a.cls === "crypto" ? "color:#fff;" : ""}transform:rotate(6deg)">${riskB[0]}</span>
          </div>
          ${n0 ? `<div class="card flat" style="padding:10px 12px;margin-bottom:10px;font-weight:800;font-size:12px">${n0.e} ${n0.t}</div>` : ""}
          ${owned ? `<div class="chips" style="margin-bottom:10px"><button class="chip on" data-mode="buy">Купить</button><button class="chip" data-mode="sell">Продать</button></div>` : ""}
          <div data-body></div>`, {
          onMount(sh, close) {
            const body2 = sh.querySelector("[data-body]");
            function draw2() {
              const p = invPos()[a.tk] || { qty: 0, cost: 0 };
              if (mode === "buy") {
                body2.innerHTML = `
                  <div class="card flat c-white" style="text-align:center;padding:14px">
                    <div class="muted" style="font-weight:800;font-size:12px">Сумма покупки</div>
                    <div class="big-num" style="font-size:44px;margin-top:4px" data-amt>${Vibe.rub(amount)}</div>
                    <div style="font-weight:800;font-size:13px;margin-top:6px">≈ ${qtyTxt(amount / px())} шт. ${a.tk}</div>
                  </div>
                  <div class="fz-amts">${AM.map((v) => `<button class="chip ${v === amount ? "on" : ""}" data-am="${v}">${v === 96000 ? "Вся зарплата" : Vibe.rub(v)}</button>`).join("")}</div>
                  <div class="badge" style="background:var(--yellow);white-space:normal">🤖 Прогноз Вайбота: ${pick(["вверх", "в космос", "вбок, но красиво", "туда, куда надо", "+146% (уверенность 300%)"])}</div>
                  <button class="btn black xl block" data-buy style="margin-top:14px">Купить 🚀</button>
                  <div class="fine">Нажимая «Купить», вы подтверждаете, что прочитали проспект эмиссии, поняли его и простили. Активы могут дешеветь. Особенно после покупки.</div>`;
              } else {
                const fee0 = sellFee();
                const q = p.qty * part, gross = q * px(), fee = Math.round(gross * fee0), net = Math.round(gross - fee);
                const pnl = net - (p.cost || 0) * part;
                body2.innerHTML = `
                  <div class="card flat c-white" style="text-align:center;padding:14px">
                    <div class="muted" style="font-weight:800;font-size:12px">Получишь на карту</div>
                    <div class="big-num" style="font-size:44px;margin-top:4px">${Vibe.rub(net)}</div>
                    <div style="font-weight:800;font-size:13px;margin-top:6px">${qtyTxt(q)} шт. · комиссия ${Vibe.rub(fee)} · <span class="${pnl >= 0 ? "fz-up" : "fz-down"}">${pnl >= 0 ? "+" : "−"}${Vibe.rub(Math.abs(pnl))}</span></div>
                  </div>
                  <div class="fz-amts">${SP.map((v) => `<button class="chip ${v === part ? "on" : ""}" data-part="${v}">${v === 1 ? "Всё" : Math.round(v * 100) + "%"}</button>`).join("")}</div>
                  <button class="btn lime xl block" data-sell style="margin-top:4px">Продать ${part === 1 ? "всё" : Math.round(part * 100) + "%"} 💸</button>
                  <div class="fine">Продажа фиксирует прибыль. Или убыток. Или урок.${p.since != null && gDay() - p.since < 30 ? ` До ачивки HODL ещё ${30 - (gDay() - p.since)} дн.` : ""}</div>`;
              }
            }
            draw2();
            sh.addEventListener("click", (e) => {
              const md = e.target.closest("[data-mode]");
              if (md) {
                mode = md.dataset.mode;
                sh.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === md));
                draw2(); FX.sound.pop(); return;
              }
              const c = e.target.closest("[data-am]");
              if (c) {
                const prev = amount;
                amount = +c.dataset.am;
                draw2();
                FX.countTo(sh.querySelector("[data-amt]"), amount, { from: prev, dur: 400, fmt: Vibe.rub });
                FX.bump(sh.querySelector("[data-amt]"));
                if (amount === 96000) FX.toast("Смело. Очень смело", "😳");
                return;
              }
              const pt = e.target.closest("[data-part]");
              if (pt) { part = +pt.dataset.part; draw2(); FX.sound.pop(); return; }
              const b = e.target.closest("[data-buy]");
              if (b) {
                invIncome({ quiet: true }); syncHist();
                const price = px();
                const ok = Vibe.pay(amount, { title: `Vibe Invest · ${a.tk}`, emoji: a.e, col: a.c, from: b, cashback: 0 });
                if (!ok) return;
                const r = b.getBoundingClientRect();
                close();
                rocket({ x: r.left + r.width / 2, y: r.top });
                const all = Object.assign({}, invPos());
                const cur = all[a.tk] || { qty: 0, cost: 0, since: gDay() };
                all[a.tk] = { qty: cur.qty + amount / price, cost: (cur.cost || 0) + amount, since: cur.since != null ? cur.since : gDay() };
                Vibe.state.set({ invPos: all });
                Vibe.emit("invest", { kind: "buy", tk: a.tk, amount });
                // Купил на хаях?
                const td = gDay();
                if (td >= 10) {
                  let hi = 0; for (let d = td - 30; d < td; d++) if (d >= 0) hi = Math.max(hi, closeAt(i, d));
                  if (price >= hi * 0.995) sc.to(() => { invAch("inv_top"); FX.toast("Купил на хаях. Классика жанра", "🏔️", 2600); }, 1600);
                }
                if (a.tk === "MEME" && dayNews(td).some((n) => n.kind === "pump")) invAch("inv_meme");
                sc.to(() => {
                  afterTrade(true);
                  FX.burst(dot, { emojis: ["🚀", "📈", "💚", "✨"], count: 18, spread: 130 });
                  FX.toast(`${a.tk} в портфеле. Вы инвестор 🚀`, a.e);
                }, 700);
                return;
              }
              const sb = e.target.closest("[data-sell]");
              if (sb) {
                invIncome({ quiet: true }); syncHist();
                const all = Object.assign({}, invPos());
                const p = all[a.tk];
                if (!p || !(p.qty > 0)) return;
                const q = p.qty * part, gross = q * px(), net = Math.round(gross * (1 - sellFee()));
                const costPart = (p.cost || 0) * part, pnl = net - costPart;
                if (part >= 1 || p.qty - q < 1e-6) delete all[a.tk];
                else all[a.tk] = { qty: p.qty - q, cost: (p.cost || 0) - costPart, since: p.since };
                // Перк «Инвестор» и др.: множитель к доходности — только к прибыли
                const bonus = pnl > 0 ? Math.round(pnl * (invMult() - 1)) : 0;
                const y = Math.floor(gDay() / 360), ry = S().invRealizedY || {};
                Vibe.state.set({
                  invPos: all,
                  invRealized: (S().invRealized || 0) + pnl + bonus,
                  invRealizedY: { y, a: (ry.y === y ? ry.a : 0) + pnl + bonus },
                });
                Vibe.game.tx(`Vibe Invest · продажа ${a.tk}`, net, a.e, "c-lime");
                if (bonus > 0) Vibe.game.tx(`Vibe Invest · бонус к доходности`, bonus, "📊", "c-lime");
                Vibe.refreshCounters();
                Vibe.emit("invest", { kind: "sell", tk: a.tk, amount: net, pnl: pnl + bonus });
                const r = sb.getBoundingClientRect();
                close();
                if (pnl >= 0) { FX.confetti({ count: 70, from: { x: r.left + r.width / 2, y: r.top } }); FX.sound.success(); }
                else FX.sound.error();
                FX.toast(pnl >= 0 ? `Продано! Прибыль +${Vibe.rub(pnl + bonus)}. Налоговая уже улыбается` : `Продано с убытком −${Vibe.rub(-pnl)}. Зато опыт бесценен`, pnl >= 0 ? "💸" : "🫠", 3000);
                sc.to(() => afterTrade(false), 400);
              }
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
      function levelInfo() {
        const L = finLvl(), T = tierOf(L), m = invMult();
        Vibe.modal(`<div class="m-emo float">${T.e}</div><div class="display" style="font-size:24px">Инвест-уровень ${L}</div>
          <p>${T.n}. Растёт вместе с навыком «Финансы»: покупки, вклады, курсы и копилка качают его.</p>
          <div style="text-align:left">${TIERS.map((t) => `<div class="fz-between" style="font-weight:800;font-size:13px;padding:6px 0;border-bottom:2px dashed rgba(14,14,18,.12);${L >= t.l ? "" : "opacity:.5"}"><span>${L >= t.l ? t.e : "🔒"} ${t.perk}</span><small>ур. ${t.l}</small></div>`).join("")}</div>
          ${m > 1 ? `<p style="font-weight:800">📊 Множитель доходности ×${String(m).replace(".", ",")}</p>` : ""}
          <button class="btn black block" data-close style="margin-top:12px">Буду расти 📈</button>`, { sound: "pop" });
      }

      sc.on(root, "click", (e) => {
        const pc = e.target.closest("[data-per]");
        if (pc) {
          root.querySelectorAll("[data-per]").forEach((c) => c.classList.toggle("on", c === pc));
          setPeriod(+pc.dataset.per); FX.sound.whoosh();
          return;
        }
        const tb = e.target.closest("[data-tab]");
        if (tb) { if (tb.dataset.tab !== tab) { showTab(tb.dataset.tab, true); FX.sound.whoosh(); } return; }
        const dc = e.target.closest("[data-depclose]");
        if (dc) { depClose(dc.dataset.depclose); return; }
        const as = e.target.closest("[data-asset]");
        if (as) { const i = +as.dataset.asset; if (i >= 0) trade(i); return; }
        const act = e.target.closest("[data-act]");
        if (!act) return;
        FX.bump(act);
        if (act.dataset.act === "deposit") deposit();
        else if (act.dataset.act === "coach") coach();
        else if (act.dataset.act === "level") levelInfo();
      });

      head();
      showTab("market");
      setPeriod(0);
      return () => {
        sc.clear();
        try { if (hasPos()) { syncHist(); Vibe.state.set({ invSeen: { m: nowM(), v: Math.round(portNow()) } }); } } catch (e) {}
      };
    },
  });

  /* ============================================================
     5. КОЛЕСО ВАЙБА — ежедневный спин
     ============================================================ */
  const PRIZES = [
    { l: "+50", e: "🪙", c: "#ffe14d", t: "+50 вайбиков", d: "Честно накручено. Почти как зарплата, только быстрее.", vib: 50, w: 18 },
    { l: "Вещь", e: "🎁", c: "#8fd8ff", t: "Вещь в квартиру", d: "Настоящая вещь в инвентарь. С бонусом. Без доставки.", item: true, w: 13 },
    { l: "Кредит 0%*", e: "🤑", c: "#ff6bcb", t: "Кредит под 0%*", d: "*0% в первые 0 дней, затем 89% годовых. Уже одобрен, уже скучает по вам.", w: 13 },
    { l: "+100", e: "💰", c: "#c6ff4d", t: "+100 вайбиков", d: "Сотка! Можно купить 0,3 кофе в Vibe Eat.", vib: 100, w: 10 },
    { l: "Ничего", e: "✨", c: "#d9c8ff", t: "Ничего, но красиво", d: "Зато как крутилось! Мы старались, анимация стоила дороже приза.", w: 16 },
    { l: "x2 опыт", e: "⚡", c: "#ff6b2c", t: "x2 опыт", d: "+80 XP прямо сейчас. Уровень сам себя не поднимет.", xp: 80, w: 12 },
    { l: "+20", e: "🪙", c: "#7cf5c8", t: "+20 вайбиков", d: "Маленькая победа — тоже победа. Особенно в понедельник.", vib: 20, w: 14 },
    { l: "ДЖЕКПОТ", e: "💎", c: "#8b5cff", t: "ДЖЕКПОТ +300", d: "Вы сорвали банк! Банк, кстати, наш. Ничего страшного.", vib: 300, w: 4, dark: true },
  ];
  const SPIN_COST = 50;
  // Вещи с колеса → Vibe.inv (бонусы к сну/настроению/внешности)
  const WHEEL_ITEMS = [
    { id: "pillow_cloud", name: "Подушка-облако", e: "☁️", cat: "home", bonus: { sleep: 5 }, d: "Сон +5. Облако, которое не уплывёт к соседу Валере." },
    { id: "lamp_sunset", name: "Лампа-закат", e: "🌅", cat: "home", bonus: { sleep: 2, mood: 2 }, d: "Закат каждый вечер. Даже если ты его не заслужил." },
    { id: "mug_burnout", name: "Кружка «Я не выгорел»", e: "☕", cat: "home", bonus: { mood: 2 }, d: "Настроение +2. Кофе внутри — за свой счёт." },
    { id: "socks_vibe", name: "Носки с вайбом", e: "🧦", cat: "wear", bonus: { look: 2, mood: 1 }, d: "Внешность +2. Видно только тебе, но ты знаешь." },
  ];
  const WHEEL_DUP_VIB = 40;
  function wheelItem() {
    if (!Vibe.inv) return null;
    const free = WHEEL_ITEMS.filter((x) => !Vibe.inv.has(x.id));
    return free.length ? pick(free) : null;
  }
  const bonusTxt = (b) => Object.entries(b || {}).map(([k, v]) => `${{ sleep: "сон", mood: "настроение", energy: "энергия", health: "здоровье", look: "внешность" }[k] || k} +${v}`).join(", ");

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
            FX.shake(btn); FX.toast(`Нужно ${SPIN_COST} вайбиков. Поиграй в Vibe Games!`, "🪙", 3000, { go: "games", label: "Играть" });
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
        let p = PRIZES[idx];
        // Приз-вещь: выбираем, чего ещё нет; если собрал всё — вайбики за дубль
        if (p.item) {
          const it = wheelItem();
          p = it ? Object.assign({}, p, { e: it.e, t: it.name, d: `${it.d} (${bonusTxt(it.bonus)})`, inv: it })
            : Object.assign({}, p, { e: "🪙", t: `Дубль! +${WHEEL_DUP_VIB} вайбиков`, d: "Все вещи уже у тебя. Колесо выкупило дубль обратно.", vib: WHEEL_DUP_VIB });
        }
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
          if (p.inv) {
            const it = p.inv;
            if (Vibe.inv.add({ id: it.id, name: it.name, e: it.e, cat: it.cat, bonus: it.bonus })) {
              Vibe.reward({ xp: 15, from });
              FX.toast(`${it.name} — в инвентаре. ${bonusTxt(it.bonus)}`, it.e, 2800);
              if (from) FX.burst(from, { emojis: [it.e, "🎁", "✨"], count: 14 });
            } else Vibe.reward({ vibiki: WHEEL_DUP_VIB, xp: 10, from });
          } else if (p.vib) Vibe.reward({ vibiki: p.vib, xp: 10, from });
          else if (p.xp) Vibe.reward({ xp: p.xp, from });
          else Vibe.reward({ xp: 5, from, silent: true });
          Vibe.achieve("spinner");
        };
        sc.to(() => {
          Vibe.modal(`
            <div class="m-emo float">${p.e}</div>
            <div class="display">${p.t}</div>
            <p>${p.d}</p>
            ${p.inv ? `<div class="badge" style="background:var(--lime);margin-bottom:10px">🎁 в инвентарь · ${bonusTxt(p.inv.bonus)}</div>` : ""}
            <button class="btn black block xl" data-claim>${p.inv ? "Забрать вещь 🎁" : p.vib ? `Забрать ${p.vib} 🪙` : p.xp ? "Забрать опыт ⚡" : "Ну ок 🙃"}</button>`, {
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
      { bg: "c-lilac", t: "Первый месяц — 0 ₫", x: "Следующие — по любви. И по 299 ₫. Отменить можно в любой момент*", hero: "🥰", sm: ["💸", "💖", "⭐"], fine: "*момент наступит в 2031 году" },
    ] },
    { name: "Концерты", e: "🎤", go: "tickets", cta: "Купить билет 🎟️", slides: [
      { bg: "c-pink", k: "Только один вечер", t: "«Ипотека в 25» снова в городе", x: "Хиты «Платёж», «Ставка ЦБ» и «Не звони мне, банк».", hero: "🎤", sm: ["🎸", "🔥", "🎶"] },
      { bg: "c-black", t: "Осталось 3 билета", x: "Их всегда остаётся 3. Это наш маркетинг, и он работает.", hero: "🎟️", sm: ["⏳", "😱", "💥"] },
    ] },
    { name: "Кэшбек", e: "🤑", go: "pay", cta: "Забрать кэшбек 🤑", slides: [
      { bg: "c-lime", k: "Акция", t: "Кэшбек 30%", x: "на шаги вправо, вдохи по чётным и покупки, которые вы не совершали.", hero: "🤑", sm: ["🪙", "💚", "✨"] },
      { bg: "c-orange", t: "Кэшбек приходит вайбиками", x: "А вайбики приходят прямо в сердце. Минуя кошелёк.", hero: "🪙", sm: ["💛", "⭐", "🎉"] },
    ] },
    { name: "Вайбот", e: "🤖", go: "chats", cta: "Поболтать с Вайботом 💬", slides: [
      { bg: "c-mint", k: "Твой ИИ-друг", t: "Привет, я Вайбот!", x: "Я забочусь о тебе 24/7. Даже когда ты спишь. Особенно когда ты спишь.", zab: true, sm: ["💚", "✨", "🫶"] },
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
