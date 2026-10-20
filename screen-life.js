/* ============================================================
   Life — «жизненные» сервисы Vibe:
   job, match, rent, home-buy, travel, learn, drive, clean, tickets.
   Свайп-колода, калькуляторы, таймеры и много дофамина.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const rub = (n) => Vibe.rub(n);
  const fmt = (n) => Vibe.fmt(n);
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const dec = (n, d = 1) => n.toFixed(d).replace(".", ",");
  const mmss = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : String(m).padStart(2, "0")) + ":" + String(x).padStart(2, "0"); };
  const restagger = (el) => { if (el) [...el.children].forEach((c, i) => c.style.setProperty("--i", i)); };
  const setRange = (inp) => inp.style.setProperty("--p", ((inp.value - inp.min) / (inp.max - inp.min)) * 100 + "%");
  const st = (k, d) => (S()[k] !== undefined ? S()[k] : d);

  // Сборщик таймеров и слушателей — всё чистится при уходе с экрана
  function bag() {
    const tos = [], ints = [], offs = [];
    return {
      to(fn, ms) { const id = setTimeout(fn, ms); tos.push(id); return id; },
      every(fn, ms) { const id = setInterval(fn, ms); ints.push(id); return id; },
      stop(id) { clearInterval(id); clearTimeout(id); },
      on(t, ev, fn, o) { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)); },
      clear() { tos.forEach(clearTimeout); ints.forEach(clearInterval); offs.forEach((f) => f()); },
    };
  }

  // Вайбот с репликой
  const zab = (text, mood = "sly") => `<div class="lf-zab">${Vibe.zabotik(58, mood)}<div class="lf-bubble" data-zab>${text}</div></div>`;
  function say(root, text) {
    const b = root.querySelector("[data-zab]");
    if (!b || b.textContent === text) return;
    b.textContent = text;
    FX.bump(b);
  }

  /* ---------- Стили (префикс lf-) ---------- */
  const css = `
  @property --lfp { syntax: '<percentage>'; inherits: false; initial-value: 0%; }
  .lf-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .lf-cardin{position:relative;z-index:1;display:flex;flex-direction:column;height:100%;gap:8px}
  .lf-cardin .grow{flex:1}
  .lf-bigemo{position:absolute;font-size:118px;right:-4px;top:-6px;filter:drop-shadow(0 6px 0 rgba(14,14,18,.22));pointer-events:none}
  .lf-ava{font-size:132px;text-align:center;margin-top:4px;filter:drop-shadow(0 8px 0 rgba(14,14,18,.2));pointer-events:none}
  .swipe-card .stamp{background:rgba(255,255,255,.94);z-index:4;pointer-events:none}
  .swipe-card .stamp.sup{left:50%;top:36%;color:#3d7bff;transform:translateX(-50%) rotate(-8deg);white-space:nowrap}
  .swipe-card *{user-select:none;-webkit-user-select:none}
  .lf-empty{position:absolute;inset:0;border:2.5px dashed var(--ink);border-radius:32px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;font-weight:800}
  .lf-empty[hidden]{display:none}
  .lf-zab{display:flex;align-items:flex-end;gap:10px;margin:14px 0}
  .lf-bubble{flex:1;background:var(--paper);border:var(--line);border-radius:20px 20px 20px 6px;padding:10px 14px;font-size:13px;font-weight:700;line-height:1.35;box-shadow:var(--shadow-sm)}
  .lf-mini{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
  .lf-pills{display:flex;flex-wrap:wrap;gap:6px}
  .lf-pills .badge{background:rgba(255,255,255,.92)}
  .lf-note{background:rgba(255,255,255,.88);border:2px solid var(--ink);border-radius:14px;padding:8px 10px;font-size:12px;font-weight:700;line-height:1.35;display:grid;gap:3px}
  .c-blue .lf-note,.c-violet .lf-note{color:var(--ink)}
  .lf-photo{height:170px;border-radius:22px;border:2.5px solid var(--ink);position:relative;overflow:hidden}
  .lf-photo .e{position:absolute;line-height:1;filter:drop-shadow(0 4px 0 rgba(14,14,18,.2))}
  .lf-photo .sticker{left:12px;top:12px}
  .lf-heart{position:absolute;top:10px;right:10px;width:46px;height:46px;border-radius:50%;background:#fff;border:var(--line);display:grid;place-items:center;z-index:3;box-shadow:var(--shadow-sm)}
  .lf-heart .like{font-size:21px}
  .lf-slots{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  .lf-slots .chip{justify-content:center;padding:0 6px;font-size:13px;width:100%}
  .lf-range{margin:16px 0 4px}
  .lf-range .lf-row{margin-bottom:10px}
  .lf-range .lf-row b{font-family:var(--font-display);font-weight:400;font-size:17px}
  .lf-houses{font-size:24px;line-height:1.25;letter-spacing:1px}
  .lf-houses span{display:inline-block;animation:pop-in .45s var(--spring) both}
  .lf-ring{--lfp:0%;width:84px;height:84px;border-radius:50%;border:var(--line);background:conic-gradient(var(--ink) var(--lfp),#fff 0);position:relative;margin:0 auto;transition:--lfp 1s var(--spring)}
  .lf-ring i{position:absolute;inset:9px;border-radius:50%;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:32px;font-style:normal}
  .lf-cring{width:118px;text-align:center;display:flex;flex-direction:column;gap:6px;padding:12px 8px;border:var(--line);border-radius:24px;background:var(--paper);box-shadow:var(--shadow-sm)}
  .lf-cring b{font-size:12px;font-weight:800;line-height:1.15;min-height:28px}
  .lf-cring small{font-family:var(--font-display);font-size:15px}
  .lf-cpic{width:64px;height:64px;border-radius:20px;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:34px;flex:0 0 auto}
  .lf-collide{position:relative;height:124px;display:flex;justify-content:center;align-items:center;margin-bottom:6px}
  .lf-av{width:100px;height:100px;border-radius:50%;border:3px solid var(--ink);display:grid;place-items:center;font-size:56px;box-shadow:var(--shadow-sm)}
  .lf-av.a{animation:lf-inL .75s var(--spring) both;margin-right:-16px;z-index:1}
  .lf-av.b{animation:lf-inR .75s var(--spring) both}
  @keyframes lf-inL{from{transform:translateX(-170px) rotate(-50deg)}}
  @keyframes lf-inR{from{transform:translateX(170px) rotate(50deg)}}
  .lf-collide .hrt{position:absolute;font-size:46px;z-index:2;animation:lf-pop .55s var(--spring) .6s both}
  @keyframes lf-pop{from{transform:scale(0) rotate(-30deg)}}
  .lf-mm{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:800;width:64px}
  .lf-mm i{width:58px;height:58px;border-radius:50%;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:30px;font-style:normal}
  .lf-map{height:178px;border-radius:26px;border:var(--line);box-shadow:var(--shadow);position:relative;overflow:hidden;background-color:#dff7ea;background-image:linear-gradient(rgba(14,14,18,.07) 2px,transparent 2px),linear-gradient(90deg,rgba(14,14,18,.07) 2px,transparent 2px);background-size:34px 34px}
  .lf-map .road{position:absolute;background:#fff;border:2px solid var(--ink)}
  .lf-map .pin{position:absolute;font-size:28px;width:36px;height:36px;margin:-18px 0 0 -18px;filter:drop-shadow(0 3px 0 rgba(14,14,18,.3))}
  .lf-map .me{position:absolute;left:46%;top:55%;width:20px;height:20px;border-radius:50%;background:var(--blue);border:3px solid #fff;box-shadow:0 0 0 2.5px var(--ink),0 0 0 12px rgba(61,123,255,.18)}
  .lf-lane{height:58px;border-radius:16px;background:#2a2a33;position:relative;overflow:hidden;border:2px solid var(--ink);margin:14px 0}
  .lf-lane::before{content:"";position:absolute;left:0;top:50%;height:4px;margin-top:-2px;width:200%;background:repeating-linear-gradient(90deg,#ffe14d 0 24px,transparent 24px 48px);animation:lf-lane .45s linear infinite}
  @keyframes lf-lane{to{transform:translateX(-48px)}}
  .lf-lane .car{position:absolute;left:38%;top:50%;font-size:36px;margin-top:-22px;transform:scaleX(-1);animation:lf-bob .35s ease-in-out infinite alternate}
  @keyframes lf-bob{from{transform:scaleX(-1)}to{transform:scaleX(-1) translateY(-3px) rotate(2deg)}}
  .lf-lock{font-size:112px;display:inline-block;line-height:1;cursor:pointer}
  .lf-date{width:58px;height:62px;border-radius:16px;border:2px solid var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto}
  .lf-date b{font-family:var(--font-display);font-weight:400;font-size:22px;line-height:1}
  .lf-date small{font-size:10px;font-weight:900;text-transform:uppercase}
  .lf-ticket{display:flex;width:100%;max-width:310px;margin:4px auto 16px;height:148px;filter:drop-shadow(0 5px 0 var(--ink))}
  .lf-ticket .h{border:var(--line);background:var(--holo);background-size:300% 300%;animation:holo 6s linear infinite;position:relative;padding:12px 14px;text-align:left;color:var(--ink)}
  .lf-ticket .h.l{flex:1;border-radius:20px 0 0 20px;border-right:2.5px dashed var(--ink);display:flex;flex-direction:column;justify-content:space-between}
  .lf-ticket .h.r{width:88px;border-radius:0 20px 20px 0;border-left:0;display:grid;place-items:center;text-align:center;font-size:11px;font-weight:900;transform-origin:0 100%}
  .lf-ticket.torn .h.r{animation:lf-tear 1.2s var(--out) forwards,holo 6s linear infinite}
  @keyframes lf-tear{0%{transform:none}22%{transform:rotate(-7deg) translate(5px,-6px)}100%{transform:translate(70px,240px) rotate(52deg);opacity:0}}
  .lf-mt{width:200px;display:flex;border-radius:18px;border:var(--line);overflow:hidden;box-shadow:var(--shadow-sm);background:var(--paper)}
  .lf-mt .a{flex:1;padding:10px 12px;border-right:2.5px dashed var(--ink)}
  .lf-mt .a b{display:block;font-size:13px;line-height:1.15}
  .lf-mt .a small{font-size:11px;color:var(--muted);font-weight:800}
  .lf-mt .q{width:52px;display:grid;place-items:center;font-size:24px}
  .lf-qr{display:grid;grid-template-columns:repeat(9,1fr);gap:2px;width:150px;height:150px;margin:6px auto 12px;padding:8px;border:var(--line);border-radius:14px;background:#fff}
  .lf-qr i{background:var(--ink);border-radius:2px}
  .lf-qr i.o{background:transparent}
  .lf-sector{display:grid;gap:8px}
  .lf-sector button{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border:var(--line);border-radius:18px;background:var(--paper);font-weight:800;text-align:left;transition:transform .2s var(--spring),background .2s}
  .lf-sector button small{display:block;font-size:11px;color:var(--muted);font-weight:700}
  .lf-sector button.on{background:var(--lime);transform:scale(1.02);box-shadow:var(--shadow-sm)}
  .lf-total{display:flex;justify-content:space-between;align-items:baseline;margin:14px 2px 12px}
  .lf-total .big-num{font-size:32px}
  .lf-fee{display:flex;justify-content:space-between;font-weight:700;font-size:13px;margin:4px 2px}
  .lf-fee span:first-child{color:var(--muted)}
  .lf-hot{width:252px;padding:0;overflow:hidden}
  .lf-hot .pic{height:132px;border-bottom:var(--line);position:relative;display:flex;align-items:center;justify-content:center;gap:4px;font-size:56px}
  .lf-hot .pic .timer-pill{position:absolute;left:10px;bottom:10px}
  .lf-hot .body{padding:12px 14px 14px}
  .lf-dest{padding:10px;display:flex;flex-direction:column;gap:4px}
  .lf-dest .pic{height:96px;border-radius:18px;border:2px solid var(--ink);display:grid;place-items:center;font-size:44px;position:relative}
  .lf-dest .pic .f{position:absolute;left:8px;top:6px;font-size:26px}
  .lf-build{width:230px;padding:0}
  .lf-build .pic{height:110px;border-bottom:var(--line);display:grid;place-items:center;font-size:60px;position:relative}
  .lf-build .body{padding:10px 12px 12px}
  .lf-car{display:flex;gap:12px;align-items:center}
  .lf-car .ce{width:82px;height:82px;border-radius:22px;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:48px;flex:0 0 auto}
  .lf-fuel{height:10px;margin-top:6px}
  .lf-fuel i{border-right:0}
  .lf-sparkle{position:fixed;pointer-events:none}
  .lf-scan .progress{height:18px;margin:14px 0 6px}
  .lf-scan .progress i{background:var(--grad);transition:width .6s var(--out)}
  .lf-chk{width:34px;height:34px;border-radius:50%;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:16px;flex:0 0 auto;background:#fff}
  .lf-chk.done{background:var(--lime)}
  .lf-glow{animation:lf-glow 1.6s ease-in-out infinite}
  @keyframes lf-glow{50%{box-shadow:0 0 0 6px rgba(198,255,77,.6),var(--shadow)}}
  .lf-tabs{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border:var(--line);border-radius:999px;background:var(--paper);box-shadow:var(--shadow-sm)}
  .lf-tabs button{height:40px;border-radius:999px;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;gap:4px;transition:background .2s,color .2s,transform .2s var(--spring);white-space:nowrap;min-width:0;padding:0 4px}
  .lf-tabs button.on{background:var(--ink);color:#fff}
  .lf-tabs.sm{box-shadow:none}
  .lf-tabs.sm button{height:34px;font-size:12px}
  .lf-dot-n{font-style:normal;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--pink);color:var(--ink);border:2px solid #fff;font-size:11px;font-weight:900;display:inline-grid;place-items:center;animation:badge-bounce 2.4s var(--spring) infinite}
  .lf-dot-n[hidden]{display:none}
  .lf-vt{display:block;font-size:15px;line-height:1.2}
  .lf-st{flex:0 0 auto;padding:5px 10px;border-radius:999px;border:2px solid var(--ink);font-size:11px;font-weight:900;white-space:nowrap}
  .lf-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:10px}
  .lf-steps span{height:8px;border-radius:4px;border:1.5px solid var(--ink);background:#fff;transition:background .4s}
  .lf-steps span.on{background:var(--lime)}
  .lf-steps.bad span.on{background:var(--coral)}
  .lf-eta{font-size:12px;font-weight:700;margin-top:8px;color:var(--muted)}
  .lf-eta b{color:var(--ink);font-variant-numeric:tabular-nums}
  .lf-new{animation:lf-glow 1.2s ease-in-out infinite}
  .lf-live{display:inline-block;width:8px;height:8px;border-radius:50%;background:#12a150;animation:pulse 1s ease-in-out infinite;vertical-align:middle}
  .lf-warn .display{line-height:1.05}
  .lf-cvb{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:12px}
  .lf-cvb span{background:rgba(255,255,255,.16);border:2px solid rgba(255,255,255,.55);border-radius:12px;padding:5px 1px;text-align:center;font-size:9.5px;font-weight:800;line-height:1.2;min-width:0;overflow:hidden}
  .lf-cvb b{display:block;font-size:14px}
  .lf-skills{display:flex;flex-wrap:wrap;gap:8px}
  .lf-skills .chip{height:auto;min-height:36px;padding:6px 12px;font-size:13px;white-space:normal;text-align:left}
  .lf-skills .chip small{font-size:10px;opacity:.7}
  .lf-hr{display:flex;align-items:flex-end;gap:8px;margin:12px 0;text-align:left}
  .lf-hr>.emo{font-size:46px}
  .lf-quiz{display:grid;gap:8px}
  .lf-quiz button{min-height:50px;padding:10px 14px;border:var(--line);border-radius:18px;background:var(--paper);font-weight:800;font-size:14px;box-shadow:var(--shadow-sm);text-align:left;transition:transform .15s var(--spring),background .2s}
  .lf-quiz button:active{transform:translateY(3px);box-shadow:none}
  .lf-quiz button.good{background:var(--lime)}
  .lf-quiz button.mid{background:var(--yellow)}
  .lf-quiz button.bad{background:var(--coral)}
  .lf-react{min-height:44px;margin-top:10px;font-weight:800;font-size:14px;line-height:1.3}
  .lf-ivdots{display:flex;gap:6px;justify-content:center;margin:12px 0 0}
  .lf-ivdots i{width:26px;height:8px;border-radius:4px;border:2px solid var(--ink);background:#fff}
  .lf-ivdots i.on{background:var(--lime)}
  .lf-ivdots i.now{background:var(--yellow)}
  .lf-gtop{display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left}
  .lf-tbar{height:10px;border-radius:5px;border:2px solid var(--ink);margin-top:10px;overflow:hidden;background:#fff}
  .lf-tbar i{display:block;height:100%;width:100%;background:var(--pink);transform-origin:left;transition:transform .1s linear}
  .lf-game{position:relative;height:280px;border:var(--line);border-radius:22px;overflow:hidden;margin-top:10px;touch-action:none}
  .lf-cd{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-display);font-size:60px}
  .lf-gi{position:absolute;border:2px solid var(--ink);border-radius:14px;background:#fff;font-weight:800;font-size:12px;padding:8px 10px;box-shadow:0 3px 0 var(--ink);animation:pop-in .35s var(--spring) both;transition:opacity .25s,transform .25s;max-width:48%;text-align:left;line-height:1.2}
  .lf-gi.out{opacity:0;transform:scale(.6)}
  .lf-mail span{margin-right:4px}
  .lf-mail.spam{background:var(--coral)}
  .lf-num{font-size:15px;padding:8px 12px;animation:none}
  .lf-num.up{background:var(--lime)}
  .lf-num.down{background:var(--coral)}
  .lf-call{display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:100%;padding:12px}
  .lf-faces{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:100%}
  .lf-faces span{height:60px;border-radius:14px;border:2px solid var(--ink);background:#2a2a33;display:grid;place-items:center;font-size:32px}
  .lf-says{font-weight:800;font-size:13px;min-height:36px;display:grid;place-items:center;text-align:center;line-height:1.25}
  .lf-mute{width:70px;height:70px;border-radius:50%;border:3px solid var(--ink);background:#fff;font-size:32px;box-shadow:0 4px 0 var(--ink);transition:background .2s}
  .lf-mute.hot{background:var(--lime);animation:pulse .5s ease-in-out infinite}
  .lf-appr{display:flex;flex-direction:column;gap:12px;justify-content:center;align-items:stretch;height:100%;padding:16px}
  .lf-mock{font-size:66px;line-height:1;align-self:center}
  .lf-tdone{opacity:.62}
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ============================================================
     Свайп-колода (переиспользуемая)
     o: { sel, bag, items() -> [], card(item) -> html, yes, no, sup,
          before(item, dir, el) -> false отменяет, onSwipe(item, dir, el) }
     ============================================================ */
  const deckHtml = (emptyHtml, h = 440) => `
    <div class="swipe-deck" data-deck style="height:${h}px">
      <div class="lf-empty" hidden>${emptyHtml}<button class="btn black" data-refill>Ещё карточек! 🔄</button></div>
    </div>`;
  const actionsHtml = (labels = {}) => `
    <div class="swipe-actions">
      <button class="icon-btn" data-sw="nope" aria-label="Нет" style="background:var(--coral)">${labels.no || "✕"}</button>
      <button class="icon-btn" data-sw="super" aria-label="Супер" style="background:var(--sky);width:56px;height:56px;margin-top:5px;font-size:24px">${labels.sup || "★"}</button>
      <button class="icon-btn" data-sw="like" aria-label="Да" style="background:var(--lime)">${labels.yes || "♥"}</button>
    </div>`;

  function swipeDeck(root, o) {
    const el = $(root, o.sel || "[data-deck]");
    const T = o.bag;
    let queue = [], busy = false, drag = null, autoRefill = null;
    const cards = () => $$(el, ".swipe-card:not(.gone)");
    const top = () => { const c = cards(); return c[c.length - 1] || null; };

    function mk(item) {
      const c = document.createElement("div");
      c.className = "swipe-card " + (item.col || "c-white");
      c.innerHTML = `<div class="stamp yes">${o.yes || "ДА!"}</div><div class="stamp no">${o.no || "НЕТ"}</div><div class="stamp sup">${o.sup || "СУПЕР ★"}</div>${o.card(item)}`;
      c._item = item;
      return c;
    }
    function stamp(c, y, n, s) {
      $(c, ".stamp.yes").style.opacity = y;
      $(c, ".stamp.no").style.opacity = n;
      $(c, ".stamp.sup").style.opacity = s;
    }
    function layout() {
      const cs = cards().reverse();
      cs.forEach((c, k) => {
        if (drag && drag.c === c) return;
        const kk = Math.min(k, 2);
        c.style.zIndex = 20 - k;
        c.style.transform = k ? `translateY(${kk * 14}px) scale(${1 - kk * 0.05})` : "translate(0px,0px) rotate(0deg)";
        c.style.pointerEvents = k ? "none" : "";
      });
      const empty = $(el, ".lf-empty");
      empty.hidden = cs.length > 0;
    }
    function fill() {
      while (cards().length < 3 && queue.length) {
        const c = mk(queue.shift());
        c.style.transform = "translateY(60px) scale(.8)";
        el.insertBefore(c, $(el, ".swipe-card"));
      }
      void el.offsetWidth;
      layout();
      if (!cards().length) {
        FX.sound.pop();
        o.onEmpty && o.onEmpty();
        clearTimeout(autoRefill);
        autoRefill = T.to(refill, 3200);
      }
    }
    function refill(fromEl) {
      clearTimeout(autoRefill);
      if (cards().length) return;
      const q = o.items();
      // Пустой источник — не крутим авто-перезаливку (иначе звуки по кругу)
      if (!q.length) { if (fromEl) { FX.shake(fromEl); FX.toast(o.emptyMsg || "Пока пусто. Загляни позже", "🫠"); } return; }
      queue = q;
      fill();
      FX.sound.success();
      FX.burst(fromEl || el, { emojis: ["✨", "🃏", "💥"], count: 12 });
    }
    function snap(c) {
      drag = null;
      stamp(c, 0, 0, 0);
      layout();
    }
    function fling(dir) {
      const c = top();
      if (!c || busy) return;
      const dx = drag && drag.c === c ? drag.dx : 0;
      const dy = drag && drag.c === c ? drag.dy : 0;
      if (o.before && o.before(c._item, dir, c) === false) { snap(c); return; }
      drag = null;
      busy = true;
      stamp(c, dir === "like" ? 1 : 0, dir === "nope" ? 1 : 0, dir === "super" ? 1 : 0);
      c.classList.remove("dragging");
      c.classList.add("gone");
      c.style.pointerEvents = "none";
      c.style.transition = "transform .55s cubic-bezier(.25,.8,.35,1), opacity .55s";
      const W = Math.max(innerWidth, 480) * 1.25;
      c.style.transform = dir === "super"
        ? `translate(${dx}px, ${-innerHeight - 100}px) rotate(${dx / 20 - 6}deg) scale(.9)`
        : `translate(${dir === "like" ? W : -W}px, ${dy + 70}px) rotate(${dir === "like" ? 40 : -40}deg)`;
      FX.sound.swipe();
      FX.haptic(14);
      layout();
      o.onSwipe && o.onSwipe(c._item, dir, c);
      T.to(() => { busy = false; }, 220);
      T.to(() => { c.remove(); fill(); }, 520);
    }

    el.addEventListener("pointerdown", (e) => {
      const c = e.target.closest(".swipe-card");
      if (!c || c !== top() || busy || e.target.closest("button")) return;
      drag = { c, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
      c.classList.add("dragging");
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const c = drag.c;
      drag.dx = e.clientX - drag.x;
      drag.dy = e.clientY - drag.y;
      c.style.transform = `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 14}deg)`;
      const up = drag.dy < -30 && Math.abs(drag.dx) < 80 ? clamp(-drag.dy / 140) : 0;
      stamp(c, clamp(drag.dx / 110), clamp(-drag.dx / 110), up);
      const over = Math.abs(drag.dx) > 110 || drag.dy < -140;
      if (over && !drag.hint) { drag.hint = true; FX.haptic(8); FX.sound.tick(); }
      if (!over) drag.hint = false;
    });
    const end = () => {
      if (!drag) return;
      const { c, dx, dy } = drag;
      c.classList.remove("dragging");
      if (dx > 110) fling("like");
      else if (dx < -110) fling("nope");
      else if (dy < -140 && Math.abs(dx) < 90) fling("super");
      else snap(c);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-refill]"); if (b) refill(b); });
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sw]");
      if (!b) return;
      FX.bump(b);
      fling(b.dataset.sw);
    });

    queue = o.items();
    fill();
    return { fling, refill };
  }

  /* ============================================================
     1. VIBE JOB — поиск работы, отклики, собеседования, работа
     ============================================================ */
  const TAX = 0.13;
  const netOf = (g) => Math.round(g * (1 - TAX));
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  const hm = (m) => { m = Math.max(1, Math.round(m)); return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч${m % 60 ? " " + (m % 60) + " мин" : ""}`; };
  const esc = (s) => Vibe.esc(s);

  /* --- Общие связки с world.js: время, расписание, вещи --- */
  const MON_G = ["ноября", "декабря", "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября"];
  const MON_S = ["нояб", "дек", "янв", "февр", "март", "апр", "май", "июнь", "июль", "авг", "сент", "окт"];
  const gToday = () => Vibe.game.info().day;
  const domOf = (day) => (day % 30) + 1;
  const monOf = (day) => Math.floor(day / 30) % 12;
  const hh = (h, m = 0) => `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  function whenStr(day, hour, min) {
    const d = day - gToday();
    const w = d === 0 ? "сегодня" : d === 1 ? "завтра" : d === 2 ? "послезавтра" : `${domOf(day)} ${MON_G[monOf(day)]}`;
    return hour == null ? w : `${w} в ${hh(hour, min)}`;
  }
  const evById = (id) => (Vibe.sched ? Vibe.sched.list().find((x) => x.id === id) : null);
  // Кнопка «Доехать» в Vibe Maps (params подхватит экран карты, если умеет)
  const mapsBtn = (place, label = "Доехать 🚇", cls = "btn sm") => `<button class="${cls}" data-close data-go="maps" data-params='${JSON.stringify({ to: place })}'>${label}</button>`;
  // Следующий рабочий слот: будни 10:00–17:00, не раньше чем через 2,5 игровых часа
  function nextWorkSlot() {
    let m = Math.ceil((Vibe.game.minutes() + 150) / 60) * 60;
    for (let k = 0; k < 24 * 9; k++, m += 60) {
      const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
      if (d % 7 < 5 && h >= 10 && h <= 17) return { day: d, hour: h };
    }
    return { day: gToday() + 1, hour: 11 };
  }
  // Вещи дома и их бонусы
  const BONUS_E = { sleep: "😴 сон", mood: "🙂 настроение", energy: "⚡ энергия", health: "❤️ здоровье", look: "✨ внешность", steps: "👟 шаги" };
  const bonusTxt = (b) => Object.entries(b || {}).filter(([, v]) => v).map(([k, v]) => `${BONUS_E[k] || k} +${v}`).join(" · ");
  const homeItems = () => (Vibe.inv ? Vibe.inv.list("home") : []);
  // Качество сна в жилье (та же шкала, что в body.js) + бонус вещей
  function sleepPct(h) {
    h = h || {};
    let q = h.own ? 0.95 : !h.rent ? 0.5 : h.rent <= 20000 ? 0.58 : h.rent <= 45000 ? 0.74 : h.rent <= 90000 ? 0.86 : 0.97;
    q += (Vibe.inv ? Vibe.inv.bonus("sleep") : 0) / 100;
    return Math.round(clamp(q, 0.3, 1) * 100);
  }
  const sleepBadge = (h) => { const p = sleepPct(h); return `<span class="badge" style="background:${p >= 85 ? "var(--lime)" : p >= 70 ? "var(--yellow)" : "var(--coral)"}">😴 сон ${p}%</span>`; };
  function thingsHtml(note) {
    const it = homeItems();
    if (!it.length) return `<div class="lf-note" style="margin-top:10px"><div>📦 Дома пусто: ни матраса, ни шторки. Вещи дают бонусы к сну и настроению.</div><button class="btn sm" data-close data-go="market" style="margin-top:6px;justify-self:start">Обставиться в Vibe Market 🛍️</button></div>`;
    return `<div class="lf-note" style="margin-top:10px"><div class="lf-mini" style="color:var(--ink)">🛋️ Вещи дома · ${it.length}</div>${it.map((i) => `<div>${i.e || "📦"} ${esc(i.name)}${bonusTxt(i.bonus) ? ` <span class="muted">· ${bonusTxt(i.bonus)}</span>` : ""}</div>`).join("")}${note ? `<div class="muted">${note}</div>` : ""}</div>`;
  }

  const VAC = [
    { id: "v01", co: "Сосисочная №1", e: "🌭", title: "Промоутер в костюме хот-дога", sal: 38000, req: 0, col: "c-orange", perks: ["🌭 Костюм выдаём", "☀️ Работа на воздухе"], reqs: ["Не бояться детей", "Танцевать под «Кукарачу» 8 часов"] },
    { id: "v02", co: "Алло-Банк", e: "🎧", title: "Оператор колл-центра", sal: 48000, req: 6, col: "c-sky", perks: ["🎧 Гарнитура (почти своя)", "📈 Бонус за каждое «нет»"], reqs: ["Говорить «ваш звонок очень важен» искренне", "Не плакать в эфире"] },
    { id: "v03", co: "Вайб Маркет у дома", e: "🛒", title: "Кассир", sal: 52000, req: 4, col: "c-lime", perks: ["🥖 Скидка 3% на батон", "🧑‍🤝‍🧑 Дружный коллектив"], reqs: ["Спрашивать «пакет нужен?» 900 раз в день", "Мелочи нет — это аксиома"] },
    { id: "v04", co: "Кофейня «Пенка»", e: "☕", title: "Бариста", sal: 55000, req: 10, col: "c-yellow", perks: ["☕ Кофе бесплатно (1 шт.)", "🎶 Свой плейлист (наш)"], reqs: ["Рисовать лебедя на капучино", "Улыбаться 12 часов подряд"] },
    { id: "v05", co: "Вайб Доставка", e: "🛵", title: "Курьер", sal: 60000, req: 5, col: "c-pink", perks: ["🎒 Термосумка в подарок", "🌧️ Много свежего воздуха"], reqs: ["Ноги (2 шт.)", "Любить домофоны"] },
    { id: "v06", co: "Агентство «Креатив и точка»", e: "📱", title: "SMM-специалист", sal: 72000, req: 28, needCourse: "blog", col: "c-lilac", perks: ["😂 Мемы в рабочее время", "🎨 Креативный офис"], reqs: ["Тестовое: три кампании бесплатно", "Рилсы, сайты, логотипы и сварка"] },
    { id: "v07", co: "ООО «Рога и Отчёты»", e: "🧾", title: "Бухгалтер", sal: 85000, req: 38, needCourse: "fin", col: "c-mint", perks: ["🗓️ Отпуск вне отчётного периода", "🍰 Торт в день 1С"], reqs: ["Знать 1С лучше, чем себя", "Не спрашивать про вторую кассу"] },
    { id: "v08", co: "Вайб-Логистик", e: "📦", title: "Менеджер по продажам", sal: 92000, req: 32, col: "c-coral", perks: ["💸 Процент с продаж*", "🤝 Нетворкинг"], reqs: ["Продать снег зимой", "*процент от оклада, оклад — минимальный"] },
    { id: "v09", co: "Стартап «Нейрочайник»", e: "🫖", title: "Head of Everything", sal: 98000, req: 45, col: "c-pink", perks: ["📈 Опцион 0,0001%", "🛋️ Пуфики"], reqs: ["Делать всё", "Остальное тоже делать"] },
    { id: "v10", co: "Студия «Пиксель-Перфект»", e: "🎨", title: "Дизайнер интерфейсов", sal: 115000, req: 50, col: "c-yellow", perks: ["🖥️ Два монитора", "🧃 Смузи по средам"], reqs: ["Сделать «как у Apple, но дешевле»", "Двигать кнопку на 1 px весь день"] },
    { id: "v11", co: "ООО «Синергия Плюс»", e: "💻", title: "Junior-разработчик", sal: 125000, req: 56, needCourse: "code", col: "c-sky", perks: ["🩺 ДМС*", "⏰ Гибкий график (до 23:00)"], reqs: ["Опыт 5 лет в технологии, которой 2 года", "Чинить принтер"] },
    { id: "v12", co: "Банк «Вайб Капитал»", e: "📊", title: "Аналитик данных", sal: 155000, req: 66, col: "c-mint", perks: ["🏠 Удалёнка (в офисе)", "🏋️ Спортзал на −2 этаже"], reqs: ["Высшее, лучше три", "Возраст до 25, опыт от 10 лет"] },
    { id: "v13", co: "Маркетплейс «Всё»", e: "🚀", title: "Продакт-менеджер", sal: 185000, req: 76, needCourse: "prod", col: "c-lime", perks: ["🎤 Митапы", "💈 Барбершоп"], reqs: ["Быть на созвонах 9 часов в день", "Любить таск-трекер как семью"] },
    { id: "v14", co: "Корпорация Vibe", e: "💜", title: "Директор по вайбу", sal: 220000, req: 90, col: "c-grad", perks: ["💎 «Плюс Вайб» бесплатно", "🚁 Вертолётная площадка (не для тебя)"], reqs: ["Вайб", "Ещё больше вайба"] },
  ];
  const vacById = (id) => VAC.find((v) => v.id === id) || VAC[0];
  // Курсы Vibe Learn → карьера: пройденный курс открывает вакансии и поднимает оклад сеньорам
  const courseDone = (id) => { const c = COURSES.find((x) => x.id === id); return !!c && (st("life_courses", { cats: 1, med: 2 })[id] || 0) >= c.les.length; };
  const doneCourses = () => COURSES.filter((c) => courseDone(c.id)).length;
  const isSenior = (v) => v.req >= 50;
  const salOf = (v) => (isSenior(v) ? Math.round((v.sal * (1 + 0.05 * Math.min(4, doneCourses()))) / 1000) * 1000 : v.sal);
  const locked = (v) => !!v.needCourse && !courseDone(v.needCourse);
  function courseBadge(v) {
    const parts = [];
    if (v.needCourse) {
      const c = COURSES.find((x) => x.id === v.needCourse);
      parts.push(locked(v)
        ? `<span class="badge" style="background:var(--coral)">🔒 Нужен курс «${c.short}»</span>`
        : `<span class="badge" style="background:var(--lime)">🎓 Открыто курсом «${c.short}»</span>`);
    }
    if (isSenior(v) && doneCourses()) parts.push(`<span class="badge" style="background:var(--yellow)">📈 +${Math.min(4, doneCourses()) * 5}% к окладу за курсы</span>`);
    return parts.join("");
  }
  function vinfo(v) {
    const o = Vibe.map.place("office:" + v.co), h = Vibe.map.place("home");
    const p = Vibe.map.path(h, o);
    return { o, district: o.district || "Сити", min: Vibe.map.minutes(p, "metro"), taxi: Vibe.map.minutes(p, "taxi"), km: Vibe.map.km(p) };
  }

  /* --- Резюме --- */
  const SKILLS = [
    { id: "prompt", t: "🤖 Промпт-инжиниринг", w: 7 },
    { id: "so", t: "💻 Копировать со Stack Overflow", w: 7 },
    { id: "excel", t: "📊 Делать вид в Excel", w: 6 },
    { id: "eng", t: "🇬🇧 English (Duolingo, 3 дня)", w: 6 },
    { id: "stress", t: "🧘 Стрессоустойчивость", w: 5 },
    { id: "fb", t: "🫡 Принимать фидбек", w: 5 },
    { id: "calls", t: "🎤 «Давайте созвонимся»", w: 4 },
    { id: "drive", t: "🚗 Права категории B", w: 4 },
    { id: "smile", t: "😁 Улыбаться 12 часов", w: 4 },
    { id: "tiktok", t: "📱 Вести тикток", w: 3 },
    { id: "memes", t: "🤡 Знание мемов", w: 1 },
  ];
  const MAX_SKILLS = 5;
  // Навык в резюме подтверждён, если за ним что-то стоит: пройденный курс или уровень в «Навыках».
  // Неподтверждённый — это враньё: HR верит в него наполовину.
  const SK_PROOF = {
    prompt: { c: ["code", "cats"], s: ["career", 3], how: "курс «Код без кода» или «Нейросети для котов»" },
    so: { c: ["code"], how: "курс «Код без кода»" },
    excel: { c: ["fin"], s: ["finance", 3], how: "курс «Финграмотность» или Финансы 3 ур." },
    eng: { s: ["career", 4], how: "Карьера 4 ур." },
    stress: { c: ["med"], s: ["health", 3], how: "курс «Медитация» или Здоровье 3 ур." },
    fb: { s: ["career", 2], jobs: 1, how: "любая работа в прошлом или Карьера 2 ур." },
    calls: { c: ["prod"], s: ["charisma", 3], how: "курс «Продакт за 3 дня» или Харизма 3 ур." },
    drive: { s: ["driving", 2], how: "Вождение 2 ур. (права в Vibe Drive)" },
    smile: { s: ["charisma", 2], how: "Харизма 2 ур." },
    tiktok: { c: ["blog"], s: ["social", 3], how: "курс «Блогер-миллионник» или Соцсети 3 ур." },
    memes: { free: true, how: "мемы не проверяют" },
  };
  function skillProven(id) {
    const P = SK_PROOF[id]; if (!P) return true;
    if (P.free) return true;
    const my = st("life_courses", { cats: 1, med: 2 });
    if ((P.c || []).some((c) => { const C = COURSES.find((x) => x.id === c); return C && my[c] >= C.les.length; })) return true;
    if (P.s && Vibe.skills && Vibe.skills.level && Vibe.skills.level(P.s[0]) >= P.s[1]) return true;
    if (P.jobs && ((S().stats || {}).jobs || 0) >= P.jobs) return true;
    return false;
  }
  const skillPts = (id) => { const k = SKILLS.find((x) => x.id === id); if (!k) return 0; return skillProven(id) ? k.w : Math.floor(k.w / 2); };
  const COURSE_PTS = { prod: 14, cats: 6, fin: 10, med: 4, code: 14, blog: 8 };
  const BOOST_COST = 150;
  function resume() {
    const s = S();
    const sk = st("life_skills", []).reduce((a, id) => a + skillPts(id), 0);
    const my = st("life_courses", { cats: 1, med: 2 });
    let cr = 0;
    Object.keys(my).forEach((id) => {
      const c = COURSES.find((x) => x.id === id);
      if (c) cr += my[id] >= c.les.length ? COURSE_PTS[id] || 8 : my[id] * 2;
    });
    const boost = st("life_boost", 0) * 6;
    const exp = Math.min(15, ((s.stats || {}).jobs || 0) * 4 + ((s.job && s.job.level) || 0));
    const base = 12;
    return { base, sk, cr, boost, exp, total: Math.min(100, base + sk + cr + boost + exp) };
  }
  const chance = (v, extra = 0) => clamp(0.5 + (resume().total - v.req) / 50 + extra, 0.05, 0.93);
  function fitBadge(v, r) {
    const d = r - v.req;
    const [t, c] = d >= 10 ? ["✅ Подходишь", "var(--lime)"] : d >= -10 ? ["🤞 Есть шанс", "var(--yellow)"] : ["🧗 Не дотягиваешь", "var(--coral)"];
    return `<span class="badge" style="background:${c}">${t}${v.req ? ` · нужно ${v.req}%` : ""}</span>`;
  }

  /* --- Отклики --- */
  const REJECT = [
    "К сожалению, мы выбрали кандидата, который уже работает у нас. Это племянник директора.",
    "Ваш опыт впечатляет, но у нас нет вакансии для таких впечатляющих.",
    "Спасибо за отклик! Мы сохраним резюме в базе и никогда его не откроем.",
    "Вы слишком квалифицированы. И недостаточно. Одновременно.",
    "Наш ИИ-рекрутер решил, что у вас грустный шрифт в резюме.",
    "Позиция закрыта. Её закрыли в 2022-м, но объявление очень старается.",
    "Нам нужен человек с горящими глазами. На фото глаза не горят.",
    "Мы ищем звезду. Вы — хорошая планета, но не звезда.",
  ];
  const ST_INFO = {
    sent: { t: "Отправлено", e: "📨", c: "c-white", k: 1 },
    seen: { t: "Просмотрено", e: "👀", c: "c-sky", k: 2 },
    invite: { t: "Приглашение!", e: "🎉", c: "c-lime", k: 3 },
    reject: { t: "Отказ", e: "🥀", c: "c-coral", k: 3, bad: true },
    failed: { t: "Не прошёл", e: "🫠", c: "c-coral", k: 4, bad: true },
    declined: { t: "Оффер отклонён", e: "🙅", c: "c-lilac", k: 4 },
    hired: { t: "Нанят", e: "💼", c: "c-yellow", k: 4 },
  };
  const apps = () => st("life_apps", []);
  function appStatus(a, now = Date.now()) {
    if (a.stage) return a.stage;
    if (now < a.seenAt) return "sent";
    if (now < a.doneAt) return "seen";
    return a.ok ? "invite" : "reject";
  }
  const activeStatus = (vid) => { const a = apps().find((x) => x.vid === vid); const s = a && appStatus(a); return s === "sent" || s === "seen" || s === "invite" ? s : null; };
  function setStage(id, stage) {
    Vibe.state.set({ life_apps: apps().map((x) => (x.id === id ? Object.assign({}, x, { stage, shown: stage }) : x)) });
  }
  /* --- Собеседование как событие календаря --- */
  const lookPct = () => (Vibe.inv ? Vibe.inv.look() : 30);
  const lookBonus = () => (lookPct() - 40) / 250; // 30% → −4%, 80% → +16%
  const lookLine = () => {
    const l = lookPct();
    return `<div class="lf-row" style="margin-top:8px;gap:8px"><span style="font-size:12px;font-weight:800;line-height:1.25">✨ Внешность ${l}%${l < 60 ? " — оденься в Vibe Style" : " — HR уже впечатлён"}</span><button class="btn sm" data-close data-go="style">🧥 Style</button></div>`;
  };
  function ivBlock(a, v) {
    const e = a.iv && evById(a.iv.ev);
    const online = `<button class="btn sm" data-ivon="${a.id}">💻 Пройти онлайн (−20% к шансу)</button>`;
    if (st("life_ivPending") === a.id || (e && e.status === "done")) return `<div class="lf-note" style="margin-top:10px;background:var(--lime)">🏢 Ты в офисе «${esc(v.co)}». HR машет из переговорки!</div><button class="btn lime block lf-glow" data-iv="${a.id}" data-mode="office" style="margin-top:8px">Зайти на собеседование 🎤</button>${lookLine()}`;
    if (e && e.status === "planned") return `<div class="lf-note" style="margin-top:10px"><div>📅 Собеседование <b>${whenStr(e.day, e.hour)}</b> · офис «${esc(v.co)}»</div><div class="muted">Приезжай в офис через Vibe Maps — за час до начала и до конца встречи. Не придёшь — HR обидится.</div></div>
      <div class="lf-row" style="margin-top:8px;justify-content:flex-start;gap:6px;flex-wrap:wrap">${mapsBtn("office:" + v.co, "Доехать в офис 🚇", "btn black sm")}${online}</div>${lookLine()}`;
    return `<button class="btn lime block lf-glow" data-ivbook="${a.id}" style="margin-top:10px">Записаться на собеседование 📅</button><div style="margin-top:8px">${online}</div>${lookLine()}`;
  }
  function bookInterview(a) {
    const v = vacById(a.vid), slot = nextWorkSlot();
    const e = Vibe.sched.add({ kind: "interview", place: "office:" + v.co, day: slot.day, hour: slot.hour, dur: 90, title: `Собеседование · ${v.co}`, e: "🎤", go: "job", app: a.id });
    Vibe.state.set({ life_apps: apps().map((x) => (x.id === a.id ? Object.assign({}, x, { iv: { ev: e.id } }) : x)) });
    return e;
  }
  if (Vibe.sched) {
    // Пришёл в офис → открываем собеседование в Vibe Job
    Vibe.sched.on("interview", (e) => {
      const a = apps().find((x) => x.id === e.app);
      if (!a || appStatus(a) !== "invite") return;
      const lateP = Vibe.sched.latePenalty ? Vibe.sched.latePenalty(e) : 0;
      Vibe.state.set({ life_ivPending: a.id, life_ivLate: lateP });
      if (lateP > 0) FX.toast(`Ты опоздал на ${e.late} мин. HR заметил: шанс −${Math.round(lateP * 100)}%`, "⏰", 3200);
      setTimeout(() => { if (!(Vibe.current && Vibe.current.route && Vibe.current.route.name === "job")) Vibe.go("job"); }, 1400);
    });
    Vibe.sched.on("interview:missed", (e) => {
      const a = apps().find((x) => x.id === e.app);
      if (!a || appStatus(a) !== "invite") return;
      Vibe.state.set({ life_apps: apps().map((x) => (x.id === a.id ? Object.assign({}, x, { stage: "reject", shown: "reject", iv: null, rej: "Ты не пришёл. HR обиделся и ушёл плакать в переговорку." }) : x)) });
      FX.toast(`${vacById(a.vid).co}: ты не пришёл. HR обиделся`, "🥀", 3200);
    });
  }
  function appExtra(a, s, v) {
    const now = Date.now();
    const re = `<button class="btn sm" data-reapply="${v.id}" style="margin-top:8px">Откликнуться ещё раз 🔁</button>`;
    if (s === "sent") return `<div class="lf-eta">📨 Резюме летит к HR · просмотр через ~<b data-to="${a.seenAt}">${mmss((a.seenAt - now) / 1000)}</b></div>`;
    if (s === "seen") return `<div class="lf-eta">👀 HR читает (уже 4-ю секунду) · ответ через ~<b data-to="${a.doneAt}">${mmss((a.doneAt - now) / 1000)}</b></div>`;
    if (s === "invite") return ivBlock(a, v);
    if (s === "reject") return `<div class="lf-note" style="margin-top:10px">🥀 ${esc(a.rej)}</div>${re}`;
    if (s === "failed") return `<div class="lf-note" style="margin-top:10px">🫠 «Мы вам перезвоним». Не перезвонят.</div>${re}`;
    if (s === "declined") return `<div class="lf-note" style="margin-top:10px">🙅 Ты отказался от оффера. HR до сих пор рассказывает об этом в курилке.</div>${re}`;
    return `<div class="lf-note" style="margin-top:10px">💼 Оффер принят. Это была хорошая история.</div>`;
  }
  function appRow(a) {
    const v = vacById(a.vid), s = appStatus(a), I = ST_INFO[s];
    return `
      <div class="card tight lf-app ${a.shown !== s ? "lf-new" : ""}" data-app="${a.id}">
        <div class="lf-row" style="justify-content:flex-start;gap:10px">
          <div class="lf-cpic ${v.col}" style="width:48px;height:48px;font-size:26px;border-radius:16px">${v.e}</div>
          <div style="flex:1;min-width:0"><b style="font-size:14px;display:block;line-height:1.2">${v.title}</b><div class="muted" style="font-size:12px;font-weight:700">${esc(v.co)} · ${rub(salOf(v))}</div></div>
          <span class="lf-st ${I.c}">${I.e} ${I.t}</span>
        </div>
        <div class="lf-steps ${I.bad ? "bad" : ""}">${[1, 2, 3, 4].map((k) => `<span class="${k <= I.k ? "on" : ""}"></span>`).join("")}</div>
        ${appExtra(a, s, v)}
      </div>`;
  }

  /* --- Собеседование --- */
  const QUIZ = [
    { q: "Где вы видите себя через 5 лет?", a: [["На вашем месте", 0.5, "😬", "HR нервно смеётся и двигает стул подальше"], ["В отпуске", 0, "🏖️", "HR записал: «не мотивирован»"], ["Здесь же, но с ипотекой", 1, "🏠", "Идеально. Ипотечники не увольняются"]] },
    { q: "Ваша главная слабость?", a: [["Перфекционизм", 0.5, "🙄", "Классика. Сегодня слышали 40 раз"], ["Слишком много работаю", 1, "🔥", "Мы это поддержим. Особенно в выходные"], ["Честность", 0, "😶", "…Спасибо, мы вам перезвоним"]] },
    { q: "Почему ушли с прошлого места?", a: [["Хочу развиваться", 1, "🌱", "Ответ из учебника. Плюс балл"], ["Там не платили", 0.5, "💸", "Понимаем. У нас тоже бывает"], ["Уволили за мемы в общем чате", 0, "🤡", "HR уже ищет этот мем"]] },
    { q: "Ваши зарплатные ожидания?", a: [["Сколько не жалко", 1, "🥹", "Нам не жалко немного"], ["Рыночные", 0.5, "📊", "Рынок у нас свой, внутренний"], ["Миллион и опцион", 0, "🤑", "HR поперхнулся кофе"]] },
    { q: "Готовы к переработкам?", a: [["Это моя страсть", 1, "❤️‍🔥", "Подпиши здесь, здесь и в 23:00"], ["Только за доплату", 0.5, "🧾", "Смелое заявление. Записали"], ["Нет", 0, "🚪", "Дверь вон там. Шутка. Или нет"]] },
    { q: "Расскажите о себе в трёх словах", a: [["Командный, гибкий, стрессоустойчивый", 1, "🤖", "Звучит как мы. Нравится"], ["Ленивый, но эффективный", 0.5, "🦥", "Хотя бы честно"], ["Я люблю пиццу", 0, "🍕", "Мы тоже. Но это собеседование"]] },
    { q: "Что вы знаете о нашей компании?", a: [["Всё, я читал отзывы", 0, "😰", "Отзывы писали конкуренты!"], ["Вы лидер рынка", 1, "🏆", "Да! Какого — неважно"], ["Тут есть печеньки", 0.5, "🍪", "По пятницам. Строго по одной"]] },
    { q: "Как справляетесь со стрессом?", a: [["Дышу и медитирую", 0.5, "🧘", "Медитация за 30 секунд — курс в Vibe Learn"], ["Работаю ещё больше", 1, "📈", "Идеальный кандидат"], ["Ухожу в отпуск", 0, "✈️", "Отпуск — это стресс для компании"]] },
    { q: "Почему именно мы?", a: [["Вы мне снитесь", 0.5, "😳", "Нам тоже кто-то снится. Начальник"], ["Близко к дому", 0, "🏡", "А как же миссия?!"], ["Верю в вашу миссию", 1, "✨", "Мы сами в неё не до конца верим. Принято"]] },
  ];

  /* --- Рабочие задачи (мини-игры) --- */
  const TASKS = [
    { id: "mail", e: "📬", t: "Разбери почту", d: "Тапай письма, не трогай «СРОЧНО!!!»", dur: 10, bg: "c-sky" },
    { id: "call", e: "📞", t: "Созвон", d: "Сними мьют, когда спросят тебя", dur: 10, bg: "c-lilac" },
    { id: "report", e: "📊", t: "Отчёт", d: "Лови растущие цифры, падающие не трогай", dur: 9, bg: "c-lime" },
    { id: "approve", e: "🎨", t: "Согласуй макет", d: "Жми быстрее, чем клиент передумает", dur: 8, bg: "c-pink" },
  ];
  const todayTasks = () => { const d = Vibe.game.info().day; return [0, 1, 2].map((i) => TASKS[(d + i * (1 + (d % 3))) % TASKS.length]); };

  const GAMES = {
    mail(area, G, ui) {
      let good = 0, bad = 0;
      const GOOD = ["Отчёт за квартал", "Созвон в 15:00", "Счёт на оплату", "Обед в пятницу?", "Новый тикет", "Доступ к VPN", "Отпуск согласован?"];
      const SPAM = ["СРОЧНО!!!", "Re: Fwd: СРОЧНО!!!", "ВСЕМ!!! ВАЖНО", "Срочно!!! (нет)"];
      const spawn = () => {
        const spam = Math.random() < 0.33;
        const b = document.createElement("button");
        b.className = "lf-gi lf-mail" + (spam ? " spam" : "");
        b.innerHTML = `<span>${spam ? "🔥" : "📧"}</span>${spam ? pick(SPAM) : pick(GOOD)}`;
        b.style.left = rnd(3, 50) + "%";
        b.style.top = rnd(3, 80) + "%";
        area.appendChild(b);
        const gone = () => { b.classList.add("out"); G.to(() => b.remove(), 260); };
        b.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          if (b.dataset.done) return;
          b.dataset.done = 1;
          if (spam) { bad++; FX.shake(b); FX.toast("Ты открыл «СРОЧНО!!!». Теперь ты в 14 чатах", "🔥", 1400); }
          else { good++; FX.burst(b, { emojis: ["✅", "📬"], count: 5, spread: 50 }); }
          gone();
          ui(good - bad);
        });
        G.to(() => { if (!b.dataset.done) { b.dataset.done = 1; gone(); } }, 1750);
      };
      spawn();
      G.every(spawn, 620);
      return () => clamp((good - bad * 1.5) / 9);
    },
    call(area, G, ui) {
      const me = S().name || (S().profile && S().profile.name) || "коллега";
      area.innerHTML = `<div class="lf-call"><div class="lf-faces">${["👨‍💼", "👩‍💻", "🧔", "🐈"].map((f) => `<span>${f}</span>`).join("")}</div><div class="lf-says" data-says>Начальник рассказывает про синергию…</div><button class="lf-mute" data-mute>🔇</button></div>`;
      const BLAH = ["…и поэтому синергия…", "…давайте возьмём в работу…", "…кто-нибудь пошарит экран?…", "…вас не слышно, вы на мьюте…", "…вернёмся к KPI…", "…это можно было письмом…"];
      const mute = $(area, "[data-mute]"), says = $(area, "[data-says]");
      let open = false, hits = 0, fails = 0, prompts = 0, winId = null;
      const blah = G.every(() => { if (!open) says.textContent = pick(BLAH); }, 1300);
      const schedule = () => G.to(ask, rnd(900, 1700));
      function ask() {
        prompts++; open = true;
        says.textContent = `…а что думает ${me}? 👀`;
        mute.classList.add("hot");
        FX.bump(says);
        winId = G.to(() => {
          if (!open) return;
          open = false; fails++;
          mute.classList.remove("hot");
          says.textContent = "…видимо, связь. Едем дальше 😐";
          schedule();
        }, 1350);
      }
      mute.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (open) {
          open = false; hits++;
          G.stop(winId);
          mute.classList.remove("hot");
          mute.textContent = "🎙️";
          says.textContent = pick(["«Полностью согласен с предыдущим оратором» 👏", "«Давайте синк после синка» 🔥", "«Я бы добавил ценности» ✨"]);
          FX.burst(mute, { emojis: ["🎙️", "✨", "👏"], count: 8, spread: 70 });
          G.to(() => { mute.textContent = "🔇"; }, 600);
          ui(hits);
          schedule();
        } else {
          fails++;
          FX.shake(mute);
          says.textContent = "Ты перебил начальника 😬";
        }
      });
      schedule();
      void blah;
      return () => clamp(hits / Math.max(3, prompts) - fails * 0.12);
    },
    report(area, G, ui) {
      let good = 0, bad = 0;
      G.every(() => {
        const up = Math.random() < 0.62;
        const b = document.createElement("button");
        b.className = "lf-gi lf-num " + (up ? "up" : "down");
        b.textContent = up ? `📈 +${rnd(3, 40)}%` : `📉 −${rnd(3, 30)}%`;
        b.style.left = rnd(3, 66) + "%";
        b.style.top = "100%";
        area.appendChild(b);
        const anim = b.animate([{ transform: "translateY(0)" }, { transform: `translateY(-${area.clientHeight + 70}px)` }], { duration: rnd(2300, 3300), easing: "linear" });
        anim.onfinish = () => b.remove();
        b.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          if (b.dataset.done) return;
          b.dataset.done = 1;
          if (up) { good++; FX.burst(b, { emojis: ["📈", "✨", "💹"], count: 6, spread: 55 }); }
          else { bad++; FX.burst(b, { emojis: ["📉", "💀"], count: 5, spread: 50 }); FX.sound.error(); }
          anim.cancel(); b.remove();
          ui(good - bad);
        });
      }, 500);
      return () => clamp((good - bad * 1.5) / 10);
    },
    approve(area, G, ui) {
      area.innerHTML = `<div class="lf-appr"><div class="lf-mock emo" data-mock>🖼️</div><div class="progress"><i data-ap style="--p:0%;transition:width .12s linear"></i></div><button class="btn black xl block" data-tapme>Согласовать! 👆</button><div class="lf-says" data-says>Клиент смотрит макет…</div></div>`;
      const CL = ["А можно логотип побольше?", "Сделайте, чтобы было «вау»", "Давайте синий, но красный", "Верните как в первой версии", "Шрифт какой-то грустный", "А если добавить котика?"];
      const bar = $(area, "[data-ap]"), says = $(area, "[data-says]"), mock = $(area, "[data-mock]");
      let v = 0, max = 0, taps = 0, done = false;
      const draw = () => { bar.style.setProperty("--p", v + "%"); max = Math.max(max, v); };
      $(area, "[data-tapme]").addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (done) return;
        taps++;
        v = Math.min(100, v + 5);
        if (taps % 4 === 0) FX.bump(mock);
        draw();
        ui(Math.round(v));
        if (v >= 100) {
          done = true;
          says.textContent = "СОГЛАСОВАНО ✅ (до завтра)";
          mock.textContent = "🏆";
          FX.burst(mock, { emojis: ["✅", "🎨", "✨", "🏆"], count: 18 });
          FX.sound.success();
        }
      });
      G.every(() => { if (!done) { v = Math.max(0, v - 1); draw(); } }, 100);
      G.every(() => { if (done) return; says.textContent = pick(CL); FX.bump(says); v = Math.max(0, v - 8); draw(); }, 2100);
      return () => (done ? 1 : clamp((max / 100) * 0.9));
    },
  };

  const JOB_QUIPS = [
    "Работай так, будто начальник смотрит. Он смотрит. Через камеру ноутбука.",
    "3 задачи в день — и повышение не за горами. Горы, правда, высокие.",
    "Премия начисляется с зарплатой 30-го. Если не уволишься до этого. Не увольняйся.",
    "Не делаешь задачи 3 дня — эффективность тает. Как мороженое. Как мечты.",
  ];

  Vibe.screen("job", {
    render() {
      return `${Vibe.ui.head("Vibe Job", S().job ? "Работа · карьера · премии" : "Поиск работы · в моменте", Vibe.ui.vibikiPill())}<div data-body></div>`;
    },
    mount(root, params = {}) {
      const T = bag();
      const body = $(root, "[data-body]");
      const maps = new Set(), sheetMaps = new Set();
      let searching = false, tab = "vac", vmode = "list", filter = "all", first = true;
      // Пришли из календаря или уведомления «ответить на приглашение» — сразу во вкладку откликов
      if (params.tab === "apps") { tab = "apps"; searching = !!S().job; }
      let lastDay = Vibe.game.info().day, lastWork = null;
      const killMaps = () => { maps.forEach((m) => m.destroy()); maps.clear(); };
      const restaggerAll = (el) => $$(el, ".stagger").forEach(restagger);
      function miniMap(el, set, pins, a, b, color) {
        const m = Vibe.map.create(el, { pins, interactive: false, fit: [a, b] });
        el.style.touchAction = "pan-y";
        if (a && b) m.route(Vibe.map.path(a, b), color ? { color } : undefined);
        set.add(m);
        return m;
      }

      /* ---------- Отрисовка ---------- */
      function paint() {
        killMaps();
        if (S().job && !searching) { body.innerHTML = dashHtml(); restaggerAll(body); mountDash(); }
        else { body.innerHTML = searchHtml(); restaggerAll(body); paintPanel(); }
      }
      function searchHtml() {
        const s = S();
        const rw = Vibe.game.runway();
        const top = s.job
          ? `<div class="card c-sky"><div class="lf-row" style="gap:10px"><div style="flex:1;font-weight:800;font-size:13px">Ты работаешь в «${esc(s.job.company)}». Новый оффер заменит текущую работу — тихо, без отработки.</div><button class="btn sm black" data-act="myjob">← Работа</button></div></div>`
          : `<div class="card lf-warn ${rw < 20 ? "c-coral" : "c-yellow"}">
              <div class="lf-row"><div><div class="lf-mini" style="color:var(--ink)">⚠️ Без работы</div><div class="display" style="font-size:22px;margin-top:4px">Денег хватит на ${rw} ${plural(rw, "день", "дня", "дней")}</div></div><span class="emo wobble" style="font-size:46px">${rw < 20 ? "🫠" : "⏳"}</span></div>
              <div class="fine" style="color:var(--ink);opacity:.75">Баланс ${rub(s.balance)}. Аренда, еда и ЖКХ списываются сами. 1 игровой день = 24 минуты реальной жизни.</div>
            </div>`;
        const inv = apps().filter((a) => appStatus(a) === "invite").length;
        return `<div class="stagger">${top}
          <div class="lf-tabs" style="margin-top:14px">${[["vac", "💼 Вакансии"], ["apps", "📨 Отклики"], ["cv", "📄 Резюме"]].map(([k, t]) => `<button class="${tab === k ? "on" : ""}" data-tab="${k}">${t}${k === "apps" ? ` <i class="lf-dot-n" data-invn ${inv ? "" : "hidden"}>${inv}</i>` : ""}</button>`).join("")}</div>
          <div data-panel style="margin-top:14px"></div></div>`;
      }
      function paintPanel() {
        const p = $(body, "[data-panel]");
        if (!p) return;
        p.innerHTML = tab === "vac" ? vacHtml() : tab === "apps" ? appsHtml() : cvHtml();
        restaggerAll(p);
        if (tab === "vac" && vmode === "quick") initDeck($(p, "[data-quick]"));
      }

      /* ---------- Вакансии ---------- */
      const FILTERS = [["all", "Все"], ["lt60", "До 60к"], ["mid", "60–120к"], ["hi", "120к+"], ["near", "🏠 Рядом с домом"]];
      function vacCard(v, inf, r) {
        const a = activeStatus(v.id), here = S().job && S().job.company === v.co;
        return `
          <div class="card tap" data-vac="${v.id}" style="padding:12px">
            <div class="lf-row" style="align-items:flex-start;justify-content:flex-start;gap:12px">
              <div class="lf-cpic ${v.col}"><span class="emo wobble">${v.e}</span></div>
              <div style="flex:1;min-width:0">
                <b class="lf-vt">${v.title}</b>
                <div class="muted" style="font-size:12px;font-weight:700">${esc(v.co)}</div>
                <div class="price" style="font-size:20px;margin-top:4px">${rub(salOf(v))}</div>
              </div>
            </div>
            <div class="lf-pills" style="margin-top:10px"><span class="badge" style="background:var(--lilac)">📍 ${inf.district}</span><span class="badge" style="background:#fff">🚇 ${inf.min} мин</span>${fitBadge(v, r)}${courseBadge(v)}${here ? `<span class="badge" style="background:var(--yellow)">💼 Ты здесь</span>` : a ? `<span class="badge" style="background:var(--sky)">${ST_INFO[a].e} ${ST_INFO[a].t}</span>` : ""}</div>
          </div>`;
      }
      function vacHtml() {
        const r = resume().total;
        let list = VAC.map((v) => ({ v, inf: vinfo(v) }));
        if (filter === "lt60") list = list.filter((x) => salOf(x.v) < 60000);
        if (filter === "mid") list = list.filter((x) => salOf(x.v) >= 60000 && salOf(x.v) <= 120000);
        if (filter === "hi") list = list.filter((x) => salOf(x.v) > 120000);
        if (filter === "near") list = list.slice().sort((a, b) => a.inf.min - b.inf.min).slice(0, 5);
        const sw = `<div class="lf-tabs sm">${[["list", "📋 Список"], ["quick", "⚡ Быстрый поиск"]].map(([k, t]) => `<button class="${vmode === k ? "on" : ""}" data-vmode="${k}">${t}</button>`).join("")}</div>`;
        if (vmode === "quick") return `${sw}
          <div data-quick>
            ${deckHtml(`<div style="font-size:64px" class="emo float">🫠</div><div class="display" style="font-size:22px">Вакансии кончились</div><div class="muted" style="font-size:13px">На всё, что было, ты уже откликнулся. Жди ответов во вкладке «Отклики».</div>`)}
            ${actionsHtml({ sup: "📨" })}
            <div class="fine" style="text-align:center">✕ — мимо · 📨 — с сопроводительным (+шанс) · ♥ — откликнуться</div>
            ${zab("Свайпай вправо всё подряд. Мы называем это «рынок кандидата».")}
          </div>`;
        return `${sw}
          <div class="chips" style="margin-top:10px">${FILTERS.map(([k, t]) => `<button class="chip ${filter === k ? "on" : ""}" data-filter="${k}">${t}</button>`).join("")}</div>
          <div class="stack stagger" data-vlist style="margin-top:4px">${list.map((x) => vacCard(x.v, x.inf, r)).join("")}</div>
          ${zab(r < 40 ? "Резюме слабовато. Добавь навыков во вкладке «Резюме» или пройди курс в Vibe Learn." : "С таким резюме можно целиться выше. Или хотя бы в бариста с амбициями.")}
          <div class="fine">*Vibe Job не гарантирует ответ, обратную связь, зарплату и смысл. Зарплаты указаны до вычета НДФЛ 13%.</div>`;
      }
      function refreshVacCard(v) {
        const el = $(body, `[data-vac="${v.id}"]`);
        if (!el) return;
        const tmp = document.createElement("div");
        tmp.innerHTML = vacCard(v, vinfo(v), resume().total);
        const n = tmp.firstElementChild;
        n.style.animation = "none";
        el.replaceWith(n);
        FX.bump(n);
      }
      function initDeck(c) {
        if (!c) return;
        swipeDeck(c, {
          bag: T,
          yes: "ОТКЛИК!",
          no: "МИМО",
          sup: "С СОПРОВОДОМ 📨",
          emptyMsg: "Новых вакансий нет. Дождись ответов",
          items: () => shuffle(VAC.filter((v) => !locked(v) && !activeStatus(v.id) && !(S().job && S().job.company === v.co))),
          card: (v) => {
            const inf = vinfo(v);
            return `
            <div class="lf-cardin">
              <div class="lf-bigemo emo float">${v.e}</div>
              <div><span class="badge" style="background:#fff">${esc(v.co)}</span></div>
              <div class="grow"></div>
              <div class="display" style="font-size:28px;max-width:88%">${v.title}</div>
              <div class="big-num" style="font-size:32px">${rub(salOf(v))}</div>
              <div class="lf-pills"><span class="badge">📍 ${inf.district}</span><span class="badge">🚇 ${inf.min} мин</span>${fitBadge(v, resume().total)}${courseBadge(v)}</div>
              <div class="lf-note">${v.reqs.map((x) => `<div>⚠️ ${x}</div>`).join("")}</div>
            </div>`;
          },
          before(v, dir, el) { return dir === "nope" ? true : canApply(v, el); },
          onSwipe(v, dir, el) {
            if (dir === "nope") { say(c, pick(["Скипнул. Они не узнают. Наверное.", "Правильно. Там «семья», а у тебя уже есть одна.", "Минус одна вакансия мечты. Их ещё 14 000."])); return; }
            apply(v, el, dir === "super");
            say(c, pick(["Отклик ушёл! HR уже открыл… вкладку с мемами.", "Ты в шорт-листе из 3 400 человек 🔥", "Резюме прочитают за 6 секунд. Это рекорд!"]));
          },
        });
      }
      function canApply(v, from) {
        if (S().job && S().job.company === v.co) { FX.shake(from); FX.toast("Ты уже здесь работаешь 🙃", "💼"); return false; }
        if (activeStatus(v.id)) { FX.shake(from); FX.toast("Отклик уже висит. HR и так нервничает", "⏳"); return false; }
        if (locked(v)) { FX.shake(from); FX.toast(`Без курса «${COURSES.find((c) => c.id === v.needCourse).short}» резюме даже не откроют. Vibe Learn ждёт`, "🎓", 3000); return false; }
        const active = apps().filter((a) => { const s = appStatus(a); return s === "sent" || s === "seen"; }).length;
        if (active >= 6) { FX.shake(from); FX.toast("6 откликов ждут ответа. HR не успевают игнорировать больше", "📨", 3000); return false; }
        return true;
      }
      function apply(v, from, sup) {
        if (!canApply(v, from)) return false;
        const now = Date.now();
        const seenAt = now + rnd(60, 180) * 1000;
        const doneAt = Math.max(seenAt + 45000, now + rnd(180, 480) * 1000);
        const a = { id: "a" + now + rnd(10, 99), vid: v.id, at: now, seenAt, doneAt, ok: Math.random() < chance(v, sup ? 0.06 : 0), shown: "sent", rej: pick(REJECT) };
        Vibe.state.set({ life_apps: [a, ...apps().filter((x) => x.vid !== v.id)].slice(0, 24), life_jobApplied: st("life_jobApplied", 0) + 1 });
        Vibe.game.track("apply");
        Vibe.reward({ xp: 4 });
        FX.sound.like();
        FX.burst(from, { emojis: ["📨", "💼", "✨"], count: 12 });
        FX.toast(`Отклик в «${v.co}» отправлен. Ответ — через несколько минут`, "📨", 2400);
        refreshVacCard(v);
        return true;
      }
      function openVac(v) {
        const inf = vinfo(v), r = resume().total, here = S().job && S().job.company === v.co, act = activeStatus(v.id);
        const ch = chance(v);
        const chW = ch > 0.75 ? "высокий 🔥" : ch > 0.45 ? "средний 🤞" : ch > 0.2 ? "так себе 😬" : "чудо 🙏";
        let mp = null;
        Vibe.ui.sheet(`
          <div class="lf-photo ${v.col}" style="height:120px;display:flex;align-items:center;justify-content:center;font-size:76px"><span class="emo float">${v.e}</span><div class="sticker">${rnd(120, 3400)} откликов</div></div>
          <div class="display" style="font-size:26px;margin-top:14px">${v.title}</div>
          <div class="muted" style="font-weight:700;font-size:13px">${esc(v.co)} · 📍 ${inf.district}</div>
          <div class="lf-row" style="margin-top:10px;align-items:flex-end">
            <div><div class="big-num" style="font-size:32px">${rub(salOf(v))}</div><div style="font-size:12px;font-weight:800">на руки ${rub(netOf(salOf(v)))} в месяц</div></div>
            ${fitBadge(v, r)}
          </div>
          <div class="lf-pills" style="margin-top:10px">${v.perks.map((p) => `<span class="badge" style="background:var(--yellow)">${p}</span>`).join("")}${courseBadge(v)}</div>
          <div class="lf-note" style="margin-top:10px">${v.reqs.map((x) => `<div>⚠️ ${x}</div>`).join("")}<div>📄 Резюме: нужно ${v.req}%, у тебя ${r}%</div></div>
          <div class="lf-mini" style="margin:16px 0 8px">Дорога от дома · ${dec(inf.km)} км</div>
          <div data-smap style="height:190px"></div>
          <div class="grid2" style="margin-top:10px">
            <div class="card tight flat c-sky"><div class="lf-mini" style="color:var(--ink)">🚇 Метро</div><div class="big-num" style="font-size:22px">${inf.min} мин</div></div>
            <div class="card tight flat c-yellow"><div class="lf-mini">🚕 Такси</div><div class="big-num" style="font-size:22px">${inf.taxi} мин</div></div>
          </div>
          <div class="lf-row" style="margin:14px 2px 8px"><span class="lf-mini">Шанс на приглашение</span><b style="font-size:13px">${chW}</b></div>
          <div class="progress" style="margin-bottom:14px"><i style="--p:${Math.round(ch * 100)}%"></i></div>
          ${here ? `<button class="btn xl block" disabled>Ты здесь уже работаешь 💼</button>` : locked(v) && !act ? `<button class="btn yellow xl block" data-close data-go="learn">🔒 Сначала курс «${COURSES.find((c) => c.id === v.needCourse).short}» →</button>` : act ? `<button class="btn xl block" data-gotab="apps">${ST_INFO[act].e} ${ST_INFO[act].t} · к откликам</button>` : `<button class="btn black xl block" data-applyv>Откликнуться 📨</button>`}
          <div class="fine">Зарплата до вычета НДФЛ 13%. Печеньки облагаются отдельно. Время в пути — в хорошую погоду и без пробок (не бывает).</div>`, {
          onMount(sh, close) {
            mp = miniMap($(sh, "[data-smap]"), sheetMaps, Vibe.map.basePins([Object.assign({}, inf.o, { id: "office", e: v.e, color: "#ff6bcb", pulse: true, label: "Офис" })]), Vibe.map.place("home"), inf.o);
            const b = $(sh, "[data-applyv]");
            if (b) b.addEventListener("click", () => { if (apply(v, b)) T.to(close, 350); });
            const g = $(sh, "[data-gotab]");
            if (g) g.addEventListener("click", () => { close(); tab = "apps"; paint(); });
          },
          onClose() { if (mp) { mp.destroy(); sheetMaps.delete(mp); } },
        });
      }

      /* ---------- Отклики ---------- */
      function appsHtml() {
        const list = apps();
        if (!list.length) return `<div class="card c-lilac" style="text-align:center"><div class="emo float" style="font-size:64px">📭</div><div class="display" style="font-size:22px;margin-top:6px">Откликов пока нет</div><div style="font-size:13px;font-weight:700;margin:6px 0 12px">HR сами не придут. Хотя иногда звонят с неизвестных номеров.</div><button class="btn black" data-tab="vac">Смотреть вакансии →</button></div>`;
        return `<div class="lf-row" style="margin-bottom:10px"><span class="lf-mini">Всего откликов: ${fmt(st("life_jobApplied", 0))}</span><span class="lf-mini"><span class="lf-live"></span> вживую</span></div>
          <div class="stack stagger" data-applist>${list.map(appRow).join("")}</div>
          ${zab("HR смотрит резюме 6 секунд. Твоё — 4. Это хороший знак. Наверное.")}`;
      }

      /* ---------- Резюме ---------- */
      const tierOf = (n) => (n >= 85 ? "Сын маминой подруги" : n >= 65 ? "Крепкий мидл" : n >= 40 ? "Подающий надежды" : n >= 20 ? "Стажёр с амбициями" : "Чистый лист");
      const cvb = (R) => [["База", R.base], ["Навыки", R.sk], ["Курсы", R.cr], ["Прокачка", R.boost], ["Опыт", R.exp]].map(([t, n]) => `<span>${t}<b>+${n}</b></span>`).join("");
      function cvHtml() {
        const R = resume(), skills = st("life_skills", []), boosts = st("life_boost", 0), my = st("life_courses", { cats: 1, med: 2 });
        return `<div class="stagger">
          <div class="card c-blue">
            <div class="lf-row"><div><div class="lf-mini" style="color:rgba(255,255,255,.8)">Сила резюме</div><div class="big-num" style="font-size:54px;margin-top:4px" data-cvn data-val="${R.total}">${R.total}%</div><b style="font-size:13px" data-tier>${tierOf(R.total)}</b></div><span class="emo float" style="font-size:70px">📄</span></div>
            <div class="progress" style="margin-top:12px"><i data-cvbar style="--p:${R.total}%"></i></div>
            <div class="lf-cvb" data-cvb>${cvb(R)}</div>
          </div>
          <h2 class="sec">Навыки <small data-skn>${skills.length}/${MAX_SKILLS} · HR дочитывает до пятого</small></h2>
          <div class="lf-skills">${SKILLS.map((k) => { const ok = skillProven(k.id); return `<button class="chip ${skills.includes(k.id) ? "on" : ""}" data-skill="${k.id}">${k.t} <small>${ok ? `✅ +${k.w}` : `🤥 +${Math.floor(k.w / 2)}`}</small></button>`; }).join("")}</div>
          <div class="fine" style="margin-top:8px">✅ — подтверждено курсом или уровнем в «Навыках», даёт полный балл. 🤥 — просто написал: HR верит наполовину. Как подтвердить — нажми на навык ещё раз, когда он выбран.</div>
          <h2 class="sec">Курсы <small>Vibe Learn · до +${Object.values(COURSE_PTS).reduce((a, b) => a + b, 0)}%</small></h2>
          <div class="card" style="padding:2px 14px">${COURSES.map((c) => {
            const d = my[c.id], own = d !== undefined, full = own && d >= c.les.length, pts = full ? COURSE_PTS[c.id] : own ? d * 2 : 0;
            return `<div class="li"><div class="ic ${c.col}">${c.e}</div><div class="tx"><b>${c.short}</b><small>${full ? "✅ пройден" : own ? `${d}/${c.les.length} уроков` : `не куплен · до +${COURSE_PTS[c.id]}%`}</small></div><div class="amt ${pts ? "plus" : ""}">+${pts}%</div></div>`;
          }).join("")}</div>
          <button class="btn block" data-go="learn" style="margin-top:12px">Учиться в Vibe Learn 🎓</button>
          <div class="card c-grad" style="margin-top:16px">
            <div class="lf-row"><div><div class="display" style="font-size:20px">Прокачать резюме</div><div style="font-size:12px;font-weight:700;margin-top:4px">+6% за раз · осталось ${3 - boosts} из 3</div></div><span class="emo wobble" style="font-size:40px">✨</span></div>
            <button class="btn yellow block" data-boost style="margin-top:12px" ${boosts >= 3 ? "disabled" : ""}>${boosts >= 3 ? "Резюме идеально. Почти" : `Прокачать · ${BOOST_COST} 🪙`}</button>
          </div>
          <div class="card c-lilac" style="margin-top:16px">
            <b>Как дорасти до 100%</b>
            <div style="font-size:13px;font-weight:700;margin-top:8px;display:grid;gap:4px">
              <span>📄 База — 12</span>
              <span>🧠 Навыки — до 31, если все пять подтверждены</span>
              <span>🎓 Курсы — до ${Object.values(COURSE_PTS).reduce((a, b) => a + b, 0)}: полный балл только за пройденный курс, начатый — по 2 за урок</span>
              <span>✨ Прокачка — до 18 (3 раза по 6)</span>
              <span>💼 Опыт — до 15: прошлые места работы и грейд</span>
            </div>
          </div>
          ${zab("Добавь «стрессоустойчивость». Её никто не проверяет — её проверяет жизнь.")}
        </div>`;
      }
      function updateCv() {
        const R = resume();
        const n = $(body, "[data-cvn]");
        if (!n) return;
        FX.countTo(n, R.total, { fmt: (x) => x + "%", dur: 600 });
        FX.bump(n);
        $(body, "[data-cvbar]").style.setProperty("--p", R.total + "%");
        $(body, "[data-tier]").textContent = tierOf(R.total);
        $(body, "[data-cvb]").innerHTML = cvb(R);
        $(body, "[data-skn]").textContent = `${st("life_skills", []).length}/${MAX_SKILLS} · HR дочитывает до пятого`;
      }
      function toggleSkill(ch) {
        const id = ch.dataset.skill;
        let skills = st("life_skills", []).slice();
        if (skills.includes(id)) {
          // Повторное нажатие снимает навык и подсказывает, как его подтвердить
          if (!skillProven(id) && SK_PROOF[id]) FX.toast(`Чтобы HR поверил: ${SK_PROOF[id].how}`, "🤥", 3400);
          skills = skills.filter((x) => x !== id); ch.classList.remove("on"); FX.sound.pop();
        }
        else {
          if (skills.length >= MAX_SKILLS) { FX.shake(ch); FX.toast("Пять навыков максимум. Дальше HR не читает", "🙈"); return; }
          skills.push(id);
          ch.classList.add("on");
          FX.burst(ch, { emojis: ["🧠", "✨", "📄"], count: 8, spread: 70 });
        }
        FX.bump(ch);
        Vibe.state.set({ life_skills: skills });
        updateCv();
      }
      function boost(btn) {
        const n = st("life_boost", 0);
        if (n >= 3) return;
        if (S().vibiki < BOOST_COST) { FX.shake(btn); FX.toast(`Нужно ${BOOST_COST} вайбиков. Красота требует жертв`, "🥲"); return; }
        Vibe.state.set({ vibiki: S().vibiki - BOOST_COST, life_boost: n + 1 });
        Vibe.refreshCounters();
        const lines = [["Добавляем слово «синергия»…", "Пишем «опыт в Google» (была экскурсия)…", "Фотошопим фото в костюме на фоне Альп…"], ["Меняем шрифт на «уверенный»…", "Добавляем «лидерские качества» (староста в 5 классе)…", "Убираем хобби «сон»…"], ["Ставим в резюме QR-код на тикток…", "Пишем «владею 1С» (видел логотип)…", "Пускаем по резюме блёстки ✨…"]][n];
        const BT = bag();
        Vibe.modal(`<div class="lf-scan"><div class="wobble" style="display:inline-block">${Vibe.zabotik(90, "wow")}</div><div class="display" style="font-size:24px;margin-top:6px">Прокачка…</div><p data-step style="min-height:20px;margin:8px 0 0">${lines[0]}</p><div class="progress"><i data-bar style="--p:0%"></i></div></div>`, {
          sound: "pop",
          onClose: () => { BT.clear(); if (tab === "cv") paintPanel(); },
          onMount(m, close) {
            let k = 0;
            BT.every(() => {
              k++;
              const bar = $(m, "[data-bar]");
              if (!bar) return;
              bar.style.setProperty("--p", Math.min(100, Math.round((k / lines.length) * 100)) + "%");
              if (k < lines.length) { const s = $(m, "[data-step]"); s.textContent = lines[k]; FX.bump(s); return; }
              if (k > lines.length) return;
              BT.to(() => {
                m.innerHTML = `<div class="m-emo float">📄</div><div class="display">+6% к резюме!</div><p>Теперь ты на 6% привлекательнее для HR. И на 0% — для себя.</p><button class="btn black block" data-close>Огонь 🔥</button>`;
                FX.burst($(m, ".m-emo"), { emojis: ["📄", "✨", "💼", "⭐"], count: 18 });
                FX.sound.success();
              }, 300);
            }, 650);
            void close;
          },
        });
      }

      /* ---------- Собеседование ---------- */
      function interview(a, mode = "office") {
        const v = vacById(a.vid);
        if (st("life_ivPending") === a.id) Vibe.state.set({ life_ivPending: null });
        const qs = shuffle(QUIZ).slice(0, 5);
        const IT = bag();
        let i = 0, score = 0, locked = false;
        Vibe.modal(`<div data-ivbox></div>`, {
          sound: "pop",
          onClose: () => IT.clear(),
          onMount(m, close) {
            const box = $(m, "[data-ivbox]");
            function q() {
              const Q = qs[i], ans = shuffle(Q.a);
              box.innerHTML = `
                <div class="lf-row"><span class="badge" style="background:var(--yellow)">${v.e} ${esc(v.co)}</span><span class="badge" style="background:#fff">Вопрос ${i + 1}/${qs.length}</span></div>
                <div class="lf-pills" style="margin-top:6px;justify-content:center"><span class="badge" style="background:${mode === "online" ? "var(--sky)" : "var(--lime)"}">${mode === "online" ? "💻 Онлайн · −20% к шансу" : "🏢 Очно · +5% к шансу"}</span><span class="badge" style="background:var(--pink)">✨ Внешность ${lookPct()}%</span></div>
                <div class="lf-ivdots">${qs.map((_, k) => `<i class="${k < i ? "on" : k === i ? "now" : ""}"></i>`).join("")}</div>
                <div class="lf-hr"><span class="emo float">🧑‍💼</span><div class="lf-bubble" style="font-size:15px">${Q.q}</div></div>
                <div class="lf-quiz stagger">${ans.map((x, k) => `<button data-ans="${k}">${x[0]}</button>`).join("")}</div>
                <div class="lf-react" data-react></div>`;
              restagger($(box, ".lf-quiz"));
              locked = false;
              $$(box, "[data-ans]").forEach((b) => b.addEventListener("click", () => {
                if (locked) return;
                locked = true;
                const x = ans[+b.dataset.ans];
                score += x[1];
                b.classList.add(x[1] >= 1 ? "good" : x[1] > 0 ? "mid" : "bad");
                FX.bump(b);
                FX.burst(b, { emojis: [x[2], "✨"], count: 10, spread: 90 });
                if (x[1] >= 1) FX.sound.like(); else if (x[1] === 0) FX.sound.error();
                const r = $(box, "[data-react]");
                r.innerHTML = `<span class="emo" style="font-size:24px">${x[2]}</span> ${x[3]}`;
                FX.bump(r);
                IT.to(() => { i++; if (i < qs.length) q(); else result(); }, 1300);
              }));
            }
            function result() {
              const p = clamp(0.2 + (score / qs.length) * 0.7 + (resume().total - v.req) / 150 + lookBonus() + (mode === "office" ? 0.05 : 0), 0.05, 0.95) * (mode === "online" ? 0.8 : 1) * (1 - (mode === "online" ? 0 : (Vibe.state.get().life_ivLate || 0)));
              box.innerHTML = `<div class="wobble" style="display:inline-block">${Vibe.zabotik(90, "wow")}</div><div class="display" style="font-size:24px;margin-top:8px">HR совещается…</div><p>Тебя обсуждают в курилке. Это хорошо. Наверное.</p><div class="typing" style="margin-bottom:6px"><span></span><span></span><span></span></div>`;
              IT.to(() => (Math.random() < p ? offer() : fail()), 2100);
            }
            function fail() {
              setStage(a.id, "failed");
              box.innerHTML = `<div class="m-emo float">📞</div><div class="display" style="font-size:26px">Мы вам перезвоним</div><p>${pick(["Вы нам очень понравились, но кандидат с опытом 40 лет понравился больше.", "Решение отложено до конца квартала. Какого — не уточнили.", "Ваши ответы прекрасны. Вакансию отдали стажёру из соседнего отдела."])}</p><button class="btn black block" data-close>Ну и ладно 🥲</button><div class="fine">Совет: прокачай резюме и попробуй снова. Или в другом месте.</div>`;
              FX.sound.error();
              if (tab === "apps") paintPanel();
            }
            function offer() {
              const low = Math.random() < 0.35;
              let sal = low ? Math.round((salOf(v) * 0.85) / 1000) * 1000 : salOf(v);
              let bargained = false;
              const draw = (msg) => {
                const cur = S().job;
                box.innerHTML = `<div class="m-emo float">📜</div><div class="display">Оффер!</div>
                  <p data-om>${msg || (low && !bargained ? "Мы готовы предложить на 15% меньше, зато у нас печеньки 🍪" : `«${esc(v.co)}» хочет тебя в команду. Печеньки тоже есть.`)}</p>
                  <div class="card flat c-lime tight" style="text-align:left;margin-bottom:14px">
                    <div class="lf-mini" style="color:var(--ink)">${esc(v.title)}</div>
                    <div class="big-num" style="font-size:34px" data-sal>${rub(sal)}</div>
                    <div style="font-size:12px;font-weight:800">на руки ${rub(netOf(sal))} · аванс 15-го, зарплата 30-го</div>
                  </div>
                  ${cur ? `<div class="fine" style="margin:-6px 0 10px">Работа в «${esc(cur.company)}» закончится. Накопленная премия ${rub(cur.bonus || 0)} сгорит.</div>` : ""}
                  <div class="stack">
                    <button class="btn black xl block" data-accept>Принять оффер 🤝</button>
                    ${low && !bargained ? `<button class="btn yellow block" data-bargain>Поторговаться 💪</button>` : ""}
                    <button class="btn block" data-decline>Отказаться</button>
                  </div>`;
                $(box, "[data-accept]").addEventListener("click", accept);
                $(box, "[data-decline]").addEventListener("click", () => { setStage(a.id, "declined"); close(); FX.toast("Ты отказал работодателю. Легенда", "😎"); if (tab === "apps") paintPanel(); });
                const bg = $(box, "[data-bargain]");
                if (bg) bg.addEventListener("click", () => {
                  bargained = true;
                  const r = Math.random();
                  if (r < 0.55) { sal = salOf(v); draw("HR сдался! «Ладно, полная сумма. Но печеньки — по одной»"); FX.burst($(box, "[data-sal]"), { emojis: ["💪", "💸", "✨"], count: 16 }); FX.sound.success(); }
                  else if (r < 0.8) { draw("«Печеньки — это тоже деньги». Сумма не изменилась."); FX.shake($(box, "[data-sal]")); }
                  else { setStage(a.id, "failed"); box.innerHTML = `<div class="m-emo float">🫢</div><div class="display" style="font-size:26px">Оффер отозван</div><p>HR обиделся и ушёл плакать в переговорку. Торговаться надо было мягче.</p><button class="btn black block" data-close>Урок усвоен</button>`; FX.sound.error(); if (tab === "apps") paintPanel(); }
                });
              };
              draw();
              FX.confetti({ count: 90, from: $(box, ".m-emo") });
              FX.sound.success();
            }
            function accept() {
              const sal = +$(box, "[data-sal]").textContent.replace(/\D/g, "");
              Vibe.game.setJob({ company: v.co, title: v.title, salary: sal, emoji: v.e, color: v.col });
              setStage(a.id, "hired");
              close();
              searching = false;
              tab = "vac";
              FX.confetti();
              T.to(() => FX.confetti({ count: 80 }), 300);
              paint();
              root.scrollTop = 0;
              const up = Vibe.game.upcoming(10).find((u) => u.t === "Аванс" || u.t === "Зарплата");
              T.to(() => Vibe.modal(`<div class="m-emo float">${v.e}</div><div class="display">Ты принят!</div><p>${esc(Vibe.game.jobTitle(S().job))} в «${esc(v.co)}». ${up ? `${up.t} — через ${up.in} ${plural(up.in, "день", "дня", "дней")} (≈ ${hm(up.real)})` : "Зарплата скоро"}. А пока — 3 рабочие задачи в день, за каждую премия.</p><button class="btn black block" data-close>За работу 💼</button>`, { sound: "success" }), 700);
            }
            q();
          },
        });
      }

      /* ---------- Моя работа ---------- */
      // Офис или удалёнка + почему сейчас нельзя работать
      function workStatusHtml(can, inOffice) {
        const loc = inOffice
          ? `<div class="card tight c-lime" style="margin-top:12px"><div class="lf-row"><div><b style="font-size:15px">📍 Ты в офисе ×1,15</b><div style="font-size:12px;font-weight:700">Начальник видит тебя. Продуктивность растёт от страха</div></div><span class="emo float" style="font-size:36px">🏢</span></div></div>`
          : `<div class="card tight c-sky" style="margin-top:12px"><div class="lf-row"><div style="min-width:0"><b style="font-size:15px">🏠 Удалёнка ×0,9</b><div style="font-size:12px;font-weight:700">Работаешь в пижаме. Задачи дают на 10% меньше</div></div>${mapsBtn("work", "В офис 🚇", "btn black sm")}</div></div>`;
        if (can.ok) return loc;
        const weekend = Vibe.game.info().day % 7 >= 5;
        return `${loc}<div class="card c-coral" style="margin-top:12px">
            <div class="lf-row"><div style="min-width:0"><div class="lf-mini" style="color:var(--ink)">${weekend ? "🛋️ Выходной" : "⏰ Не рабочее время"}</div><b style="display:block;font-size:15px;margin-top:4px;line-height:1.25">${esc(can.why || "Сейчас работать нельзя")}</b></div><span class="emo wobble" style="font-size:40px">${weekend ? "🏖️" : "🌙"}</span></div>
            <div style="font-size:12px;font-weight:700;margin-top:6px">Рабочие задачи — по будням с 9:00 до 19:00. А деньги нужны всегда.</div>
            <button class="btn black block" data-go="gig" style="margin-top:10px">🚲 Подработка в Vibe Gig</button>
          </div>`;
      }
      function dashHtml() {
        const j = S().job;
        const up = Vibe.game.upcoming(10).find((u) => u.t === "Аванс" || u.t === "Зарплата");
        const home = Vibe.map.place("home"), work = Vibe.map.place("work");
        const p = Vibe.map.path(home, work);
        const left = Vibe.game.tasksLeft(), N = Vibe.game.TASKS_PER_DAY, done = N - left, tt = todayTasks();
        const perf = Math.round(j.perf || 0);
        const can = Vibe.work ? Vibe.work.can() : { ok: true }, inOffice = !!(Vibe.work && Vibe.work.atOffice());
        return `<div class="stagger">
          <div class="card ${j.color || "c-yellow"}" style="min-height:190px">
            <div class="lf-bigemo emo float" style="font-size:100px">${j.emoji || "💼"}</div>
            <span class="badge" style="background:#fff;position:relative">🏢 ${esc(j.company)}</span>
            <div class="display" style="font-size:25px;margin-top:12px;max-width:72%;position:relative">${esc(Vibe.game.jobTitle(j))}</div>
            <div style="margin-top:14px;position:relative">
              <div class="lf-mini" style="color:inherit;opacity:.8">Оклад · уровень ${j.level || 2}</div>
              <div class="big-num" style="font-size:32px">${rub(j.salary)}</div>
              <div style="font-size:12px;font-weight:800">на руки ${rub(netOf(j.salary))} · 📍 ${esc(j.district || "")}</div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="card tight c-lime"><div class="lf-mini" style="color:var(--ink)">${up ? up.t : "Зарплата"} через</div><div class="big-num" style="font-size:24px;margin:4px 0">${up ? `${up.in} ${plural(up.in, "день", "дня", "дней")}` : "—"}</div><div style="font-size:11px;font-weight:800">${up ? `≈ ${hm(up.real)} · +${rub(up.a)}` : ""}</div></div>
            <div class="card tight c-yellow"><div class="lf-mini">Премия копится</div><div class="big-num" style="font-size:24px;margin:4px 0">${rub(j.bonus || 0)}</div><div style="font-size:11px;font-weight:800">придёт с зарплатой 30-го</div></div>
          </div>
          <div class="card" style="margin-top:12px">
            <div class="lf-row"><b>🚀 До повышения</b><span class="big-num" style="font-size:20px">${perf}%</span></div>
            <div class="progress" style="margin-top:10px;height:18px"><i data-perf="${perf}" style="--p:0%;background:var(--grad)"></i></div>
            <div class="fine">Каждая задача даёт +12–22%. На 100% — повышение и оклад ×1,25. Не работаешь 3 дня — эффективность тает.</div>
          </div>
          ${workStatusHtml(can, inOffice)}
          <h2 class="sec">Рабочие задачи <small>${done}/${N} сегодня</small></h2>
          <div class="stack">${tt.map((t, i) => {
            const isDone = i < done, next = i === done && can.ok;
            return `<div class="card tight ${isDone ? "lf-tdone" : ""} ${next ? "tap lf-glow" : ""}" ${next ? `data-task="${t.id}"` : ""}>
              <div class="lf-row" style="justify-content:flex-start;gap:12px">
                <div class="lf-cpic ${t.bg}" style="width:52px;height:52px;font-size:28px;border-radius:16px"><span class="emo ${next ? "wobble" : ""}">${isDone ? "✅" : t.e}</span></div>
                <div style="flex:1;min-width:0"><b style="font-size:15px">${t.t}</b><div class="muted" style="font-size:12px;font-weight:700">${isDone ? "Сделано. Начальник доволен (молча)" : t.d}</div></div>
                ${next ? `<span class="btn black sm">▶ ${t.dur} с</span>` : isDone ? "" : `<span class="badge" style="background:#fff">${i === done ? "🔒" : "⏳"}</span>`}
              </div></div>`;
          }).join("")}
          ${left ? "" : `<div class="card c-lilac" style="text-align:center"><div class="emo float" style="font-size:48px">🌙</div><b style="display:block;margin-top:4px">Задачи на сегодня закончились</b><div style="font-size:13px;font-weight:700;margin-top:4px">Новые — завтра (через ~<span data-nextday>${hm(Vibe.game.realMinTo(Vibe.game.info().day + 1))}</span>)</div></div>`}
          </div>
          <h2 class="sec">Дорога на работу <small>${dec(Vibe.map.km(p))} км</small></h2>
          <div style="position:relative"><div data-jmap data-go="maps" class="tap" style="height:200px;cursor:pointer"></div><span class="badge" style="position:absolute;right:12px;bottom:12px;z-index:3;pointer-events:none;background:#fff">🗺️ Открыть карту</span></div>
          <div class="chips" style="margin-top:12px">${[["work", "💼 В офис"], ["home", "🏠 Домой"], ["supermarket", "🛒 Супермаркет"], ["park", "🌳 Парк"], ["clinic", "🏥 Клиника"]].map(([to, t]) => `<button class="chip" data-go="maps" data-params='${JSON.stringify({ to })}'>${t}</button>`).join("")}</div>
          <div class="grid2" style="margin-top:12px">
            <div class="card tight c-sky"><div class="lf-mini" style="color:var(--ink)">🚇 Метро</div><div class="big-num" style="font-size:22px">${Vibe.map.minutes(p, "metro")} мин</div><div style="font-size:11px;font-weight:800">57 ₫ и немного локтей</div></div>
            <div class="card tight c-yellow"><div class="lf-mini">🚕 Такси</div><div class="big-num" style="font-size:22px">${Vibe.map.minutes(p, "taxi")} мин</div><div style="font-size:11px;font-weight:800">если без пробок (нет)</div></div>
          </div>
          ${zab(pick(JOB_QUIPS), "smile")}
          <div class="stack">
            <button class="btn block" data-act="seek">🔎 Искать другую работу</button>
            <button class="btn block" data-act="quit" style="background:var(--coral)">🚪 Уволиться</button>
          </div>
        </div>`;
      }
      function mountDash() {
        const el = $(body, "[data-jmap]");
        if (el) miniMap(el, maps, Vibe.map.basePins(), Vibe.map.place("home"), Vibe.map.place("work"));
        const pb = $(body, "[data-perf]");
        if (pb) T.to(() => pb.style.setProperty("--p", pb.dataset.perf + "%"), 350);
      }
      function runTask(type) {
        const G = bag();
        let finished = false, result = null;
        Vibe.modal(`
          <div class="lf-gtop"><b style="font-size:16px">${type.e} ${type.t}</b><span class="timer-pill">⏱ <span data-gt>${type.dur},0</span></span></div>
          <div class="lf-tbar"><i data-gbar></i></div>
          <div class="lf-game ${type.bg}" data-ga><div class="lf-cd" data-cd>3</div></div>
          <div class="lf-row" style="margin-top:10px"><span class="lf-mini" style="text-align:left">${type.d}</span><b class="big-num" style="font-size:22px" data-gs>0</b></div>`, {
          sound: "pop",
          onClose() {
            G.clear();
            if (!finished) FX.toast("Задача брошена. Начальник видел 👀", "😬");
          },
          onMount(m, close) {
            const area = $(m, "[data-ga]"), cd = $(m, "[data-cd]"), gs = $(m, "[data-gs]");
            const ui = (n) => { gs.textContent = n; FX.bump(gs); };
            let c = 3;
            FX.sound.tick();
            const cdi = G.every(() => {
              c--;
              if (c > 0) { cd.textContent = c; FX.bump(cd); FX.sound.tick(); return; }
              G.stop(cdi);
              cd.textContent = "Поехали!";
              FX.bump(cd);
              G.to(() => {
                cd.remove();
                result = GAMES[type.id](area, G, ui);
                const t0 = performance.now(), dur = type.dur * 1000;
                const tm = G.every(() => {
                  const k = clamp((performance.now() - t0) / dur);
                  $(m, "[data-gbar]").style.transform = `scaleX(${1 - k})`;
                  $(m, "[data-gt]").textContent = dec(Math.max(0, (dur - (performance.now() - t0)) / 1000));
                  if (k >= 1) {
                    G.stop(tm);
                    finished = true;
                    const sc = result ? result() : 0;
                    G.clear();
                    close();
                    finishTask(sc);
                  }
                }, 100);
              }, 450);
            }, 700);
          },
        });
      }
      function finishTask(score) {
        const prev = (S().job && S().job.perf) || 0;
        const res = Vibe.game.completeTask(score);
        if (!res) { FX.toast("Задачи на сегодня закончились", "🌙"); paint(); return; }
        paint();
        if (res.promoted) { FX.burst({ x: innerWidth / 2, y: innerHeight / 2 }, { emojis: ["🚀", "💼", "✨"], count: 20 }); return; }
        const where = Vibe.work && Vibe.work.atOffice() ? "📍 Офис ×1,15" : "🏠 Удалёнка ×0,9";
        const g = score >= 0.8 ? ["🔥", "Огонь!", "Начальник поставил 👍 в чате"] : score >= 0.5 ? ["👍", "Норм", "Начальник прочитал и не ответил"] : ["🫠", "Ну такое", "Начальник: «давай обсудим на 1:1»"];
        T.to(() => Vibe.modal(`
          <div class="m-emo float">${g[0]}</div><div class="display">${g[1]}</div>
          <div class="big-num" style="font-size:44px;margin:6px 0" data-sc>${Math.round(score * 100)}%</div>
          <p>${g[2]}. Премия <b style="color:var(--ink)">+${rub(res.bonus)}</b> придёт с зарплатой 30-го.</p>
          <div class="progress" style="margin:0 0 6px;height:16px"><i data-rp style="--p:${prev}%;background:var(--grad)"></i></div>
          <div class="lf-mini" style="margin-bottom:14px">До повышения: ${res.perf}% из 100 · ${where}</div>
          <button class="btn black block" data-close>Дальше 💼</button>`, {
          sound: "success",
          onMount(md) {
            T.to(() => {
              const i = $(md, "[data-rp]");
              if (i) i.style.setProperty("--p", res.perf + "%");
              FX.burst($(md, "[data-sc]"), { emojis: ["💵", "✨", "📈"], count: 14 });
            }, 350);
          },
        }), 150);
      }
      function quit(btn) {
        FX.bump(btn);
        const j = S().job;
        Vibe.modal(`<div class="m-emo float">🚪</div><div class="display" style="font-size:28px">Уволиться?</div><p>Из «${esc(j.company)}». Премия ${rub(j.bonus || 0)} сгорит, коллеги напишут «жаль 😢» и забудут через час. Без зарплаты денег хватит на ${Vibe.game.runway()} дн.</p>
          <div class="stack"><button class="btn pink block" data-quityes>Да, ухожу красиво 🔥</button><button class="btn black block" data-close>Остаюсь</button></div>`, {
          sound: "pop",
          onMount(m, close) {
            $(m, "[data-quityes]").addEventListener("click", () => {
              close();
              Vibe.game.quitJob();
              searching = false;
              tab = "vac";
              paint();
              root.scrollTop = 0;
              FX.toast("Ты свободен. Как ветер. Без зарплаты", "🕊️", 3000);
              FX.burst({ x: innerWidth / 2, y: innerHeight / 3 }, { emojis: ["🕊️", "📦", "💨"], count: 14 });
            });
          },
        });
      }

      /* ---------- Живое обновление ---------- */
      function tick() {
        const list = apps(), now = Date.now();
        let changed = false;
        const away = { invite: 0, reject: 0 };
        list.forEach((a) => {
          const s = appStatus(a, now);
          if (a.shown === s) return;
          a.shown = s;
          changed = true;
          const v = vacById(a.vid);
          if (first) { if (away[s] !== undefined) away[s]++; }
          else if (s === "seen") FX.toast(`${v.co}: резюме просмотрено`, "👀", 2000);
          else if (s === "invite") { FX.toast(`${v.co} зовёт на собеседование!`, "🎉", 3200); FX.sound.success(); }
          else if (s === "reject") FX.toast(`${v.co}: отказ. Ничего, вакансий ещё 14 000`, "🥀", 2600);
          const row = $(body, `[data-app="${a.id}"]`);
          if (row) {
            const tmp = document.createElement("div");
            tmp.innerHTML = appRow(a);
            const nr = tmp.firstElementChild;
            row.replaceWith(nr);
            const chip = $(nr, ".lf-st");
            FX.bump(chip);
            FX.burst(chip, { emojis: [ST_INFO[s].e, "✨"], count: s === "invite" ? 14 : 6, spread: 80 });
          }
        });
        if (first && (away.invite || away.reject)) {
          FX.toast(`Пока тебя не было: ${away.invite ? `🎉 приглашений — ${away.invite}` : ""}${away.invite && away.reject ? ", " : ""}${away.reject ? `🥀 отказов — ${away.reject}` : ""}`, "📨", 3200);
          if (away.invite) FX.sound.success();
        }
        first = false;
        if (changed) Vibe.state.set({ life_apps: list });
        $$(body, "[data-to]").forEach((el) => (el.textContent = mmss((+el.dataset.to - now) / 1000)));
        const inv = list.filter((a) => appStatus(a, now) === "invite").length;
        const nEl = $(body, "[data-invn]");
        if (nEl) { if (+nEl.textContent !== inv && inv) FX.bump(nEl); nEl.textContent = inv; nEl.hidden = !inv; }
        const d = Vibe.game.info().day;
        if (d !== lastDay) { lastDay = d; if (S().job && !searching) paint(); }
        const nx = $(body, "[data-nextday]");
        if (nx) nx.textContent = hm(Vibe.game.realMinTo(d + 1));
        // Пришёл в офис на собеседование (сработал Vibe.sched) → сразу в переговорку
        const pend = st("life_ivPending");
        if (pend && !document.querySelector(".modal, .sheet")) {
          const a = apps().find((x) => x.id === pend);
          if (!a || appStatus(a) !== "invite") { Vibe.state.set({ life_ivPending: null }); return; }
          if (S().job) searching = true;
          tab = "apps";
          paint();
          FX.toast(`Ты в офисе «${vacById(a.vid).co}». HR уже ждёт`, "🏢", 2400);
          interview(a, "office");
        }
        // Рабочие часы начались/кончились, переехал в офис — перерисуем дашборд
        const wk = S().job ? `${Vibe.work ? Vibe.work.can().ok : 1}|${Vibe.work ? Vibe.work.atOffice() : 0}` : "";
        if (wk !== lastWork) { const was = lastWork; lastWork = wk; if (was !== null && S().job && !searching && !document.querySelector(".modal")) paint(); }
      }
      const offGame = Vibe.game.on(() => { if (S().job && !searching && !document.querySelector(".modal")) paint(); });

      /* ---------- Клики ---------- */
      root.addEventListener("click", (e) => {
        const t = e.target;
        const tb = t.closest("[data-tab]");
        if (tb) {
          tab = tb.dataset.tab;
          $$(body, ".lf-tabs [data-tab]").forEach((x) => x.classList.toggle("on", x.dataset.tab === tab));
          FX.bump(tb);
          paintPanel();
          return;
        }
        const vm = t.closest("[data-vmode]");
        if (vm) { vmode = vm.dataset.vmode; FX.bump(vm); paintPanel(); return; }
        const fl = t.closest("[data-filter]");
        if (fl) { filter = fl.dataset.filter; FX.bump(fl); FX.sound.pop(); paintPanel(); return; }
        const vc = t.closest("[data-vac]");
        if (vc) { FX.bump(vc); openVac(vacById(vc.dataset.vac)); return; }
        const iv = t.closest("[data-iv]");
        if (iv) { const a = apps().find((x) => x.id === iv.dataset.iv); if (a && appStatus(a) === "invite") interview(a, iv.dataset.mode || "office"); return; }
        const ion = t.closest("[data-ivon]");
        if (ion) {
          const a = apps().find((x) => x.id === ion.dataset.ivon);
          if (!a || appStatus(a) !== "invite") return;
          if (a.iv && a.iv.ev) { const ev = evById(a.iv.ev); if (ev && ev.status === "planned") Vibe.sched.remove(ev.id); }
          FX.bump(ion);
          interview(a, "online");
          return;
        }
        const ibk = t.closest("[data-ivbook]");
        if (ibk) {
          const a = apps().find((x) => x.id === ibk.dataset.ivbook);
          if (!a || appStatus(a) !== "invite" || !Vibe.sched) return;
          const ev = bookInterview(a);
          FX.bump(ibk);
          FX.burst(ibk, { emojis: ["📅", "🎤", "✨"], count: 14 });
          FX.sound.success();
          Vibe.reward({ xp: 5 });
          FX.toast(`Записан: ${whenStr(ev.day, ev.hour)}. Офис «${vacById(a.vid).co}» — доберись через Vibe Maps`, "📅", 3400);
          paintPanel();
          return;
        }
        const ra = t.closest("[data-reapply]");
        if (ra) { if (apply(vacById(ra.dataset.reapply), ra)) paintPanel(); return; }
        const sk = t.closest("[data-skill]");
        if (sk) { toggleSkill(sk); return; }
        const bs = t.closest("[data-boost]");
        if (bs) { boost(bs); return; }
        const tk = t.closest("[data-task]");
        if (tk) {
          if (!Vibe.game.tasksLeft()) { FX.shake(tk); return; }
          const can = Vibe.work ? Vibe.work.can() : { ok: true };
          if (!can.ok) { FX.shake(tk); FX.toast(can.why, "⏰", 2800); paint(); return; }
          FX.bump(tk);
          runTask(TASKS.find((x) => x.id === tk.dataset.task));
          return;
        }
        const ac = t.closest("[data-act]");
        if (!ac) return;
        if (ac.dataset.act === "myjob") { searching = false; paint(); root.scrollTop = 0; }
        if (ac.dataset.act === "seek") { searching = true; tab = "vac"; paint(); root.scrollTop = 0; FX.toast("Тихий поиск включён. Начальник не узнает (узнает)", "🤫"); }
        if (ac.dataset.act === "quit") quit(ac);
      });

      paint();
      tick();
      T.every(tick, 1000);
      return () => { T.clear(); offGame(); killMaps(); sheetMaps.forEach((m) => m.destroy()); sheetMaps.clear(); };
    },
  });

  /* ============================================================
     2. VIBE MATCH
     ============================================================ */
  const PEOPLE = [
    { n: "Ника", a: 24, e: "👩‍🎤", km: "1,2 км", tags: ["🎧 техно", "🧘 йога", "🍷 вино"], bio: "ищу того, кто не пишет «привет, как дела»", col: "c-pink" },
    { n: "Артём", a: 27, e: "🧔", km: "800 м", tags: ["🏋️ зал", "📈 крипта", "🚴 вело"], bio: "инвестор (вложил 3000 ₫ в монету с собачкой)", col: "c-sky" },
    { n: "Соня", a: 22, e: "👩‍🎨", km: "3 км", tags: ["🎨 арт", "🐈 коты", "📚 классика"], bio: "рисую, грущу, ставлю лайки в 3 ночи", col: "c-lilac" },
    { n: "Макс", a: 29, e: "🧑‍💻", km: "5 км", tags: ["💻 айти", "🎮 игры", "🍕 пицца"], bio: "фронтендер. да, починю принтер. нет, не хочу", col: "c-lime" },
    { n: "Лиза", a: 25, e: "💁‍♀️", km: "2 км", tags: ["✈️ трэвел", "☕ кофе", "🌱 веган"], bio: "рост 170, а то спрашивают. знак зодиака — дедлайн", col: "c-yellow" },
    { n: "Гоша", a: 31, e: "🤠", km: "12 км", tags: ["🎣 рыбалка", "🥒 дача", "🎤 караоке"], bio: "есть машина, квартира и мама. мама в комплекте", col: "c-orange" },
    { n: "Вика", a: 23, e: "🧚", km: "400 м", tags: ["🔮 таро", "🌙 луна", "🛍️ шопинг"], bio: "ретроградный Меркурий — не повод не встретиться", col: "c-mint" },
    { n: "Даня", a: 26, e: "🎸", km: "7 км", tags: ["🎸 гитара", "🛹 скейт", "🍜 рамен"], bio: "знаю три аккорда, но играю их с душой", col: "c-coral" },
  ];
  const ONLINE = ["🟢 онлайн", "был(а) 3 мин назад", "🟢 печатает кому-то", "был(а) вчера в 4:20"];
  const MATCH_LINES = ["Совместимость 87%. Считали по цвету аватарки.", "Свайп вправо — это почти свидание. В 2026-м засчитывается.", "Вайбот одобряет. Вайбот одобряет всех.", "Ещё 3 свайпа — и алгоритм покажет тебе бывшую."];

  /* --- Мэтч → свидание → отношения (Vibe.sched + Vibe.people) --- */
  const pidOf = (m) => m.pid || "m_" + Math.max(0, PEOPLE.findIndex((p) => p.n === m.n));
  const DATE_PLACES = [
    { k: "park", e: "🌳", t: "Прогулка в парке", sub: "бесплатно и романтично (комары тоже)" },
    { k: "restaurant:2", e: "🍝", t: "Ужин в ресторане", sub: "счёт пополам — это тоже близость" },
    { k: "restaurant:5", e: "🍣", t: "Суши-бар", sub: "палочки выдают на входе" },
    { k: "club", e: "🎤", t: "Клуб", sub: "громко, зато можно не разговаривать" },
  ];
  const placeTitle = (k) => (DATE_PLACES.find((x) => x.k === k) || { t: "Встреча" }).t;
  function dateSlots() {
    const i = Vibe.game.info(), d0 = i.day, out = [];
    if (i.hour < 17) out.push({ day: d0, hour: 19 });
    out.push({ day: d0 + 1, hour: 19 }, { day: d0 + 2, hour: 20 });
    let w = d0 + 1;
    while (w % 7 < 5) w++;
    out.push({ day: w, hour: 15 });
    const seen = new Set();
    return out.filter((x) => { const k = x.day * 24 + x.hour; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 4);
  }
  const dateOf = (pid) => (Vibe.sched ? Vibe.sched.upcoming(30).find((e) => e.kind === "date" && e.pid === pid) : null);
  function askPartner(id) {
    const p = Vibe.people.get(id);
    if (!p || p.kind === "partner") return;
    const cur = Vibe.people.partner();
    Vibe.modal(`
      <div class="lf-collide"><div class="lf-av a c-lime">😎</div><div class="hrt">💍</div><div class="lf-av b c-pink">${p.e}</div></div>
      <div class="display" style="font-size:30px">Встречаться?</div>
      <p>${esc(p.n)}: ${p.dates || 3} свидания, отношения ${Math.round(p.rel || 0)}/100. Пора менять статус в профиле.${cur ? ` Правда, есть ещё ${esc(cur.n)}… Сложно.` : ""}</p>
      <div class="stack"><button class="btn grad xl block" data-yes>Да! Встречаемся 💘</button><button class="btn block" data-no>Давай останемся друзьями</button></div>
      <div class="fine">Vibe Match не несёт ответственности за знакомство с мамой. Мама — несёт.</div>`, {
      sound: "like",
      onMount(m, close) {
        m.querySelector("[data-yes]").addEventListener("click", () => {
          if (cur && cur.id !== id) { Vibe.people.set(cur.id, { kind: "friend" }); Vibe.people.rel(cur.id, -30); }
          Vibe.people.set(id, { kind: "partner" });
          Vibe.people.rel(id, 10);
          close();
          FX.confetti();
          setTimeout(() => FX.confetti({ count: 80 }), 300);
          Vibe.reward({ vibiki: 30, xp: 40 });
          Vibe.modal(`<div class="m-emo float">💑</div><div class="display">Вы пара!</div><p>${esc(p.n)} теперь в «Моих людях» с сердечком. Отношения надо поддерживать — свиданиями, звонками и не «ок» в ответ.</p><div class="stack"><button class="btn black block" data-close data-go="people">Мои люди 🫂</button><button class="btn block" data-close>Ура 🥰</button></div>`, { sound: "levelup" });
        });
        m.querySelector("[data-no]").addEventListener("click", () => { Vibe.people.rel(id, -5); close(); FX.toast(`${p.n} сказал(а) «ок». Просто «ок».`, "🫠", 2800); });
      },
    });
  }
  if (Vibe.sched && Vibe.people) {
    Vibe.sched.on("date", (e) => {
      if (!e.pid) return;
      Vibe.people.add(e.pid, { n: e.pn, e: e.pe, kind: "friend" });
      Vibe.people.rel(e.pid, 15);
      const p = Vibe.people.get(e.pid);
      const n = (p.dates || 0) + 1;
      Vibe.people.set(e.pid, { dates: n, lastDate: e.day });
      setTimeout(() => {
        if (n >= 3 && p.kind !== "partner") askPartner(e.pid);
        else FX.toast(`${p.n}: отношения ${Math.round(p.rel)}/100 · свиданий ${n}${n < 3 ? ` · до «встречаться?» ещё ${3 - n}` : ""}`, "💘", 3200);
      }, 2600);
    });
    Vibe.sched.on("date:missed", (e) => {
      if (!e.pid) return;
      Vibe.people.add(e.pid, { n: e.pn, e: e.pe, kind: "friend" });
      Vibe.people.rel(e.pid, -20);
      setTimeout(() => FX.toast(`${e.pn} ждал(а) тебя ${placeTitle(e.place).toLowerCase()}. Отношения −20. Тебя заблокировали в сердечке`, "💔", 3600), 1400);
    });
  }
  function datesHtml() {
    const list = Vibe.sched ? Vibe.sched.upcoming(30).filter((e) => e.kind === "date") : [];
    if (!list.length) return "";
    return `<h2 class="sec">Свидания <small>${list.length}</small></h2><div class="stack">${list.map((e) => `
      <div class="card tight c-pink">
        <div class="lf-row" style="justify-content:flex-start;gap:10px"><div class="lf-cpic c-white" style="width:48px;height:48px;font-size:28px;border-radius:16px">${e.pe || "💘"}</div>
          <div style="flex:1;min-width:0"><b style="display:block;font-size:14px">${esc(e.title)}</b><div style="font-size:12px;font-weight:800">${whenStr(e.day, e.hour)} · ${placeTitle(e.place)}</div></div>
          ${mapsBtn(e.place, "Доехать 🚇", "btn black sm")}</div>
      </div>`).join("")}</div>`;
  }

  Vibe.screen("match", {
    render() {
      const ms = st("life_matches", []);
      return `
      ${Vibe.ui.head("Vibe Match", "Любовь с кэшбеком", Vibe.ui.vibikiPill())}
      <div class="stagger">
        <div class="lf-row" style="flex-wrap:wrap;justify-content:flex-start;gap:6px">
          <span class="badge" style="background:var(--pink)">♥ лайков: ∞</span>
          <span class="badge" style="background:var(--sky)">★ супер-лайк = 50 🪙</span>
          <span class="badge" style="background:var(--yellow)">👀 тебя лайкнули: 99+</span>
        </div>
        ${deckHtml(`<div style="font-size:64px" class="emo float">💔</div><div class="display" style="font-size:22px">Все анкеты рядом кончились</div><div class="muted" style="font-size:13px">Расширяем радиус до соседнего города…</div>`, 450)}
        ${actionsHtml()}
        ${zab(pick(MATCH_LINES), "smile")}
        <h2 class="sec">Твои мэтчи <small data-mcount>${ms.length}</small></h2>
        <div class="hscroll" data-mlist>${matchList(ms)}</div>
        <div data-dates>${datesHtml()}</div>
        <div class="card c-lilac tap" data-go="people" style="margin-top:12px">
          <div class="lf-row"><div><div class="display" style="font-size:20px">Мои люди 🫂</div><div style="font-size:12px;font-weight:800;margin-top:4px">${(() => { const pr = Vibe.people && Vibe.people.partner(); return pr ? `${pr.e} ${esc(pr.n)} — твой человек 💘` : "Друзья, семья и те, с кем было 3 свидания"; })()}</div></div><span class="emo float" style="font-size:40px">💞</span></div>
        </div>
        <div class="card c-grad tap" data-act="plus" style="margin-top:10px">
          <div class="lf-row"><div><div class="display" style="font-size:22px">Узнай, кто тебя лайкнул</div><div style="font-size:13px;margin-top:4px;font-weight:700">Всего 990 ₫/нед · первые 3 дня 1 ₫</div></div><span class="emo pulse" style="font-size:46px">🔒</span></div>
        </div>
        <div class="fine">Vibe Match не несёт ответственности за ghosting, «давай останемся друзьями» и знакомство с родителями. Анкеты частично реальны.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const superBtn = $(root, "[data-sw=super]");
      swipeDeck(root, {
        bag: T,
        yes: "ЛАЙК",
        no: "НЕТ",
        sup: "СУПЕР ★",
        items: () => shuffle(PEOPLE),
        card: (p) => `
          <div class="lf-cardin">
            <div class="lf-row"><span class="badge" style="background:#fff">📍 ${p.km}</span><span class="badge" style="background:#fff">${pick(ONLINE)}</span></div>
            <div class="lf-ava emo float">${p.e}</div>
            <div class="grow"></div>
            <div class="display" style="font-size:34px">${p.n}, ${p.a}</div>
            <div class="lf-pills">${p.tags.map((t) => `<span class="badge">${t}</span>`).join("")}</div>
            <div class="lf-note">💬 ${p.bio}</div>
          </div>`,
        before(p, dir) {
          if (dir !== "super") return true;
          if (S().vibiki < 50) {
            FX.shake(superBtn);
            FX.toast("Не хватает вайбиков. Любовь — это инвестиция 💎", "🥲");
            return false;
          }
          Vibe.state.set({ vibiki: S().vibiki - 50 });
          Vibe.refreshCounters();
          FX.coins($(root, "[data-vibiki]") || { x: innerWidth - 60, y: 50 }, superBtn, 5);
          FX.toast("−50 вайбиков · супер-лайк улетел", "⭐");
          return true;
        },
        onSwipe(p, dir, el) {
          if (dir === "nope") { say(root, pick(["Не твоё. И слава богу.", "Скип! Алгоритм запомнил: не любишь гитаристов.", "Минус один. Плюс одна свободная пятница."])); return; }
          FX.sound.like();
          FX.burst(el, { emojis: dir === "super" ? ["⭐", "💙", "✨"] : ["❤️", "💖", "💘"], count: 14 });
          Vibe.reward({ xp: 3 });
          say(root, pick(MATCH_LINES));
          if (dir === "super" || Math.random() < 0.45) T.to(() => itsAMatch(p), 520);
        },
      });

      function itsAMatch(p) {
        const ms = [{ e: p.e, n: p.n, col: p.col, pid: "m_" + PEOPLE.indexOf(p) }, ...st("life_matches", []).filter((m) => m.n !== p.n)].slice(0, 12);
        Vibe.state.set({ life_matches: ms });
        const list = $(root, "[data-mlist]");
        list.innerHTML = matchList(ms);
        restagger(list);
        $(root, "[data-mcount]").textContent = ms.length;
        FX.confetti();
        Vibe.achieve("swiper");
        Vibe.modal(`
          <div class="lf-collide"><div class="lf-av a c-lime">😎</div><div class="hrt">💘</div><div class="lf-av b ${p.col}">${p.e}</div></div>
          <div class="display" style="font-size:34px">Это мэтч!</div>
          <p>Вы с ${p.n} лайкнули друг друга. Совместимость ${rnd(91, 99)}%*</p>
          <div class="stack">
            <button class="btn grad block xl" data-write>Написать 💬</button>
            <button class="btn pink block" data-dateask>Позвать на свидание 🌹</button>
            <button class="btn block" data-close>Свайпать дальше</button>
          </div>
          <div class="fine">*по знаку зодиака вашего банка</div>`, {
          sound: "like",
          onMount(m, close) {
            T.to(() => { FX.sound.success(); FX.burst($(m, ".hrt"), { emojis: ["❤️", "💖", "💘", "💕", "✨"], count: 24, spread: 170 }); }, 650);
            $(m, "[data-dateask]").addEventListener("click", () => { close(); T.to(() => openMatch(ms[0]), 260); });
            $(m, "[data-write]").addEventListener("click", () => {
              close();
              FX.toast(`Отправлено: «привет, как дела» 🙈`, "💬");
              T.to(() => FX.toast(`${p.n} печатает… (с прошлого вторника)`, "⌨️", 3000), 1600);
              Vibe.reward({ vibiki: 5, xp: 10 });
            });
          },
        });
      }
      function refreshDates() { const d = $(root, "[data-dates]"); if (d) d.innerHTML = datesHtml(); }
      // Карточка мэтча: отношения, свидания, «встречаться?»
      function openMatch(m) {
        const pid = pidOf(m), pp = Vibe.people ? Vibe.people.get(pid) : null, up = dateOf(pid);
        let place = DATE_PLACES[0].k, slot = 0;
        const slots = dateSlots();
        const rel = pp ? Math.round(pp.rel || 0) : null, dates = (pp && pp.dates) || 0;
        const status = pp && pp.kind === "partner" ? "💑 Вы пара" : dates ? `💘 Свиданий: ${dates}` : "✨ Новый мэтч";
        Vibe.ui.sheet(`
          <div class="lf-row" style="justify-content:flex-start;gap:14px">
            <div class="lf-av ${m.col}" style="width:84px;height:84px;font-size:46px">${m.e}</div>
            <div style="min-width:0"><div class="display" style="font-size:26px">${esc(m.n)}</div><span class="badge" style="background:var(--pink)">${status}</span></div>
          </div>
          ${rel != null ? `<div class="lf-row" style="margin-top:14px"><span class="lf-mini">Отношения</span><b>${rel}/100</b></div><div class="progress" style="margin-top:6px"><i style="--p:${rel}%;background:var(--grad)"></i></div>` : `<div class="lf-note" style="margin-top:14px">💬 Пока вы только лайкнули друг друга. Первое свидание добавит ${esc(m.n)} в «Моих людей».</div>`}
          ${up ? `<div class="card flat c-lime tight" style="margin-top:14px"><div class="lf-mini" style="color:var(--ink)">📅 Свидание назначено</div><b style="display:block;margin-top:2px">${whenStr(up.day, up.hour)} · ${placeTitle(up.place)}</b><div style="font-size:12px;font-weight:700;margin-top:2px">Приезжай вовремя: опоздание больше чем на 2 часа = отношения −20</div><div style="margin-top:10px">${mapsBtn(up.place, "Доехать 🚇", "btn black block")}</div></div>` : `
          <div class="lf-mini" style="margin:16px 0 8px">Куда позовём?</div>
          <div class="lf-sector" data-dplace>${DATE_PLACES.map((x, i) => `<button class="${i ? "" : "on"}" data-dp="${x.k}"><span>${x.e} ${x.t}<small>${x.sub}</small></span></button>`).join("")}</div>
          <div class="lf-mini" style="margin:14px 0 8px">Когда?</div>
          <div class="lf-slots">${slots.map((x, i) => `<button class="chip ${i ? "" : "on"}" data-ds="${i}">${whenStr(x.day, x.hour)}</button>`).join("")}</div>
          <button class="btn grad xl block" data-dgo style="margin-top:14px">Позвать на свидание 🌹</button>`}
          ${dates >= 3 && pp && pp.kind !== "partner" ? `<button class="btn pink block" data-dpartner style="margin-top:10px">Встречаться? 💍</button>` : ""}
          <button class="btn block" data-close data-go="people" style="margin-top:10px">Мои люди 🫂</button>
          <div class="fine">Свидание попадёт в календарь. Доберись до места через Vibe Maps — иначе ${esc(m.n)} обидится. Сильно.</div>`, {
          onMount(sh, close) {
            sh.addEventListener("click", (e) => {
              const dp = e.target.closest("[data-dp]");
              if (dp) { place = dp.dataset.dp; $$(sh, "[data-dp]").forEach((x) => x.classList.toggle("on", x === dp)); FX.sound.pop(); return; }
              const ds = e.target.closest("[data-ds]");
              if (ds) { slot = +ds.dataset.ds; $$(sh, "[data-ds]").forEach((x) => x.classList.toggle("on", x === ds)); FX.bump(ds); FX.sound.pop(); return; }
              if (e.target.closest("[data-dpartner]")) { close(); T.to(() => askPartner(pid), 260); return; }
              const go = e.target.closest("[data-dgo]");
              if (go && Vibe.sched) {
                const sl = slots[slot];
                Vibe.sched.add({ kind: "date", place, day: sl.day, hour: sl.hour, dur: 120, title: `Свидание с ${m.n}`, e: "💘", go: "match", pid, pn: m.n, pe: m.e });
                FX.burst(go, { emojis: ["🌹", "💘", "✨", m.e], count: 18 });
                FX.sound.like();
                Vibe.reward({ xp: 8 });
                close();
                refreshDates();
                restagger($(root, "[data-dates] .stack"));
                FX.toast(`${m.n}: «давай!» 🥰 ${whenStr(sl.day, sl.hour)}, ${placeTitle(place).toLowerCase()}. Уже в календаре`, "🌹", 3400);
              }
            });
          },
        });
      }
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        if (a.dataset.act === "plus") { FX.shake(a); FX.toast("Тебя лайкнули 99+ человек. Возможно. Узнай за 990 ₫", "🔒"); }
        if (a.dataset.act === "mm") { FX.bump(a); const m = st("life_matches", []).find((x) => x.n === a.dataset.n); if (m) openMatch(m); }
      });
      return () => T.clear();
    },
  });
  function matchList(ms) {
    if (!ms.length) return `<div class="card flat tight" style="width:100%;font-size:13px;font-weight:700">Пока пусто. Свайпни вправо — тут появятся твои люди 💘</div>`;
    return ms.map((m) => `<button class="lf-mm" data-act="mm" data-n="${Vibe.esc(m.n)}"><i class="${m.col}">${m.e}</i>${Vibe.esc(m.n)}</button>`).join("");
  }

  /* ============================================================
     3. VIBE RENT — аренда и переезд
     ============================================================ */
  const FLATS = [
    { id: "r0", key: "kommunalka", t: "Комната в коммуналке", sub: "12 м², соседи: 7 человек и попугай", p: 18000, emoji: "🚪", tags: ["Комната", "С котом"], col: "c-coral", e: ["🛏️", "🦜", "🧦", "🚪"], feat: ["Очередь в ванную — с 6:40", "Попугай знает пароль от Wi-Fi", "Холодильник общий, еда — тоже (неофициально)"] },
    { id: "r1", key: "studio18", t: "Студия 18 м²", sub: "«уютная», «компактная», «для одного (стоя)»", p: 32000, emoji: "🛏️", tags: ["Студия"], col: "c-pink", e: ["🛏️", "🪴", "🖼️", "🚽"], nodep: true, feat: ["Кухня, спальня и санузел — одно помещение", "Окна выходят на окна соседей", "Евроремонт 2007 года"] },
    { id: "r2", key: "studio22", t: "Студия 22 м²", sub: "апартаменты, «почти квартира»", p: 38000, emoji: "🛏️", tags: ["Студия", "С котом"], col: "c-lime", e: ["🛏️", "🐈‍⬛", "💡", "🧺"], feat: ["Прописки нет, зато лофт", "Вид на завод (очень атмосферно)", "Котам можно, людям — по согласованию"] },
    { id: "r3", key: "studio28", t: "Студия 28 м²", sub: "ЖК «Облака», 24 этаж", p: 44000, emoji: "🌇", tags: ["Студия"], col: "c-sky", e: ["🛋️", "🌇", "📺", "🪟"], fee: 0.5, feat: ["Вид на другой ЖК", "Лифт приезжает за 6 минут", "Консьерж (иногда)"] },
    { id: "r4", key: "one34", t: "1-к, 34 м²", sub: "хрущёвка с душой и ковром", p: 47000, emoji: "🚪", tags: ["1-к", "С котом"], col: "c-mint", e: ["🛋️", "🐈", "🕰️", "🪞"], feat: ["Кот хозяйки остаётся", "Ковёр на стене — исторический", "Газовая колонка с характером"] },
    { id: "r5", key: "one40", t: "1-к, 40 м²", sub: "новостройка, белый бокс", p: 56000, emoji: "📦", tags: ["1-к"], col: "c-lilac", e: ["📦", "💡", "🪑", "🧱"], nodep: true, feat: ["Мебель будет (в мечтах)", "Парк обещают в 2031", "Соседи делают ремонт до 2031"] },
    { id: "r6", key: "one45", t: "1-к, 45 м²", sub: "евроремонт, вид на парк (через ЖК)", p: 64000, emoji: "🛋️", tags: ["1-к", "С котом"], col: "c-yellow", e: ["🛋️", "🌳", "☕", "🖼️"], fee: 0.5, feat: ["Посудомойка! (сломана)", "Тёплый пол в коридоре", "Хозяин живёт в Дубае и пишет в 4 утра"] },
    { id: "r7", key: "two52", t: "2-к, 52 м²", sub: "сталинка, потолки 3,2 м", p: 79000, emoji: "🕰️", tags: ["2-к"], col: "c-orange", e: ["🛋️", "🕰️", "🪞", "📚"], nodep: true, feat: ["Хозяйка заходит полить цветы каждый день", "Шкаф-ценность (не открывать)", "Эхо бесплатно"] },
    { id: "r8", key: "two60", t: "2-к, 60 м²", sub: "с ремонтом от бабушки", p: 72000, emoji: "🧶", tags: ["2-к", "С котом"], col: "c-mint", e: ["🛋️", "🧶", "🐈", "🫖"], feat: ["Сервант с хрусталём включён", "Кот бабушки — тоже", "Бабушка — нет (но звонит)"] },
    { id: "r9", key: "two75", t: "2-к, 75 м², бизнес-класс", sub: "консьерж, шлагбаум, амбиции", p: 108000, emoji: "🏙️", tags: ["2-к"], col: "c-sky", e: ["🛋️", "🍸", "🏙️", "🪴"], fee: 1, feat: ["Подземный паркинг (за отдельные 25 000 ₫)", "Фитнес во дворе", "Соседи здороваются по-английски"] },
    { id: "r10", key: "penthouse", t: "Пентхаус 180 м²", sub: "панорама, терраса, сосед — депутат", p: 400000, emoji: "🏰", tags: ["Пентхаус"], col: "c-holo", e: ["🛋️", "🍾", "🌃", "🛁"], fee: 1, feat: ["Терраса с видом на твою прошлую жизнь", "Джакузи на крыше", "Лифт открывается прямо в гостиную"] },
  ].map((f) => Object.assign(f, { watch: rnd(9, 48) }));
  const POS = [[8, 30, 62], [56, 10, 46], [36, 56, 52], [72, 58, 40]];
  const isHere = (f) => { const h = S().home; return !!(h && !h.own && h.key === f.key); };
  function flatInfo(f) {
    const p = Vibe.map.place("flat:" + f.key), w = Vibe.map.place("work");
    return { p, district: p.district || "Спальный", work: w ? Vibe.map.minutes(Vibe.map.path(p, w), "metro") : null };
  }
  const moveCost = (f) => { const fee = Math.round(f.p * (f.fee || 0)); return { first: f.p, dep: f.p, fee, total: f.p * 2 + fee }; };
  function rentBlock(f) {
    const s = S();
    if (!s.job && f.p > 40000) return "Хозяйка просит справку о доходах. Без работы сдают только комнаты и студии до 40 000 ₫.";
    if (s.job && f.p > netOf(s.job.salary) * 0.6) return `Хозяйка посчитала: аренда больше 60% твоей зарплаты (${rub(netOf(s.job.salary))} на руки). Говорит, «не потянешь».`;
    return null;
  }
  const photo = (f, h = 170, heart = true) => `
    <div class="lf-photo ${f.col}" style="height:${h}px">
      ${f.nodep ? `<div class="sticker">Без залога*</div>` : ""}
      ${heart ? `<button class="lf-heart" data-act="like" data-id="${f.id}"><span class="like ${(st("life_rentLiked", {}))[f.id] ? "on" : ""}">❤️</span></button>` : ""}
      ${f.e.map((x, i) => `<span class="e emo float d${i}" style="left:${POS[i][0]}%;top:${POS[i][1]}%;font-size:${POS[i][2]}px">${x}</span>`).join("")}
    </div>`;
  function flatCard(f) {
    const inf = flatInfo(f), here = isHere(f);
    return `
    <div class="card tap" data-act="open" data-id="${f.id}" style="padding:10px${here ? ";background:var(--lime)" : ""}">
      ${photo(f)}
      <div style="padding:10px 4px 2px">
        <div class="lf-row"><div class="big-num" style="font-size:26px">${rub(f.p)}<span style="font-family:var(--font);font-size:13px;font-weight:800">/мес</span></div>${here ? `<span class="badge" style="background:#fff">🏠 Ты здесь</span>` : `<span class="badge" style="background:var(--yellow)">👀 ${f.watch} смотрят</span>`}</div>
        <b style="display:block;margin-top:6px;font-size:15px">${f.t}</b>
        <div class="muted" style="font-size:12px;font-weight:700">${f.sub}</div>
        <div class="lf-pills" style="margin-top:8px"><span class="badge" style="background:var(--lilac)">📍 ${inf.district}</span>${inf.work != null ? `<span class="badge" style="background:var(--sky)">💼 до работы ${inf.work} мин</span>` : ""}${f.fee ? `<span class="badge" style="background:var(--coral)">комиссия ${Math.round(f.fee * 100)}%</span>` : ""}${sleepBadge({ rent: f.p })}</div>
      </div>
    </div>`;
  }
  function homeNow() {
    const h = S().home;
    if (!h) return `<div class="card c-coral"><div class="lf-row" style="justify-content:flex-start;gap:12px"><span class="emo wobble" style="font-size:42px">🛋️</span><div style="flex:1;min-width:0"><div class="lf-mini" style="color:var(--ink)">Ты живёшь</div><b style="display:block">У мамы на диване · 0 ₫/мес</b><div style="font-size:12px;font-weight:700">Мама намекает. Каждый день. Громко.</div><div class="lf-pills" style="margin-top:6px">${sleepBadge(null)}</div></div></div>${thingsHtml()}</div>`;
    return `<div class="card c-lime"><div class="lf-row" style="justify-content:flex-start;gap:12px"><span class="emo float" style="font-size:42px">${h.emoji || "🏠"}</span><div style="flex:1;min-width:0"><div class="lf-mini" style="color:var(--ink)">Ты живёшь</div><b style="display:block">${esc(h.title)}</b><div style="font-size:12px;font-weight:800">${h.own ? "своя квартира 🔑 · аренда 0 ₫" : `аренда ${rub(h.rent || 0)}/мес · списание 1-го`}${h.district ? " · 📍 " + h.district : ""}</div><div class="lf-pills" style="margin-top:6px">${sleepBadge(h)}</div></div></div>${thingsHtml()}</div>`;
  }
  const RENT_CHIPS = [["lt40", "💸 До 40к"], ["Комната", "🚪 Комната"], ["Студия", "🛏️ Студия"], ["1-к", "🚪 1-к"], ["2-к", "🛋️ 2-к"], ["near", "💼 Рядом с работой"], ["С котом", "🐈 С котом"]];

  Vibe.screen("rent", {
    render() {
      return `
      ${Vibe.ui.head("Vibe Rent", "Квартиры без риелторов*", Vibe.ui.vibikiPill())}
      <div class="stagger">
        <div data-homenow>${homeNow()}</div>
        ${Vibe.ui.hero({ title: "Сними жильё мечты", text: "Свободно 3 квартиры из 12 000. Успей!", emo: "🔑", color: "c-mint", sticker: "0% комиссии*" })}
        <div class="chips" style="margin-top:14px">${RENT_CHIPS.map(([k, t]) => `<button class="chip" data-f="${k}">${t}</button>`).join("")}</div>
        <div class="stack stagger" data-list>${FLATS.map(flatCard).join("")}</div>
        ${zab("Совет от Вайбота: говори хозяйке, что ты непьющий программист без кота. Работает в 100% случаев.")}
        <div class="fine">*Без риелторов, но с «помощником хозяина». Комиссия 0%, кроме тех, где не 0%. Фото сделаны в лучшие дни квартир.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const on = new Set();
      const listEl = $(root, "[data-list]");
      const sheetMaps = new Set();
      const viewed = new Set();
      function renderList() {
        const arr = FLATS.filter((f) => [...on].every((t) => {
          if (t === "lt40") return f.p <= 40000;
          if (t === "near") { const i = flatInfo(f); return i.work != null && i.work <= 22; }
          return f.tags.includes(t);
        }));
        listEl.innerHTML = arr.length ? arr.map(flatCard).join("") : `<div class="card c-lilac" style="text-align:center"><div class="emo float" style="font-size:60px">🐈</div><div class="display" style="font-size:22px;margin-top:6px">Ничего не нашли</div><div style="font-size:13px;margin-top:6px;font-weight:700">С такими фильтрами не сдают. Но можно сдать кота.</div></div>`;
        restagger(listEl);
      }
      root.addEventListener("click", (e) => {
        const ch = e.target.closest("[data-f]");
        if (ch) {
          const t = ch.dataset.f;
          if (t === "near" && !S().job && !on.has(t)) { FX.shake(ch); FX.toast("Сначала найди работу — потом выбирай, где рядом", "💼", 3000, { go: "job", label: "Работа" }); return; }
          on.has(t) ? on.delete(t) : on.add(t);
          ch.classList.toggle("on", on.has(t));
          FX.bump(ch);
          FX.sound.pop();
          renderList();
          return;
        }
        const lk = e.target.closest("[data-act=like]");
        if (lk) {
          e.stopPropagation();
          const liked = Object.assign({}, st("life_rentLiked", {}));
          const id = lk.dataset.id;
          liked[id] = !liked[id];
          Vibe.state.set({ life_rentLiked: liked });
          $(lk, ".like").classList.toggle("on", liked[id]);
          FX.bump(lk);
          if (liked[id]) { FX.sound.like(); FX.burst(lk, { emojis: ["❤️", "💖", "🏠"], count: 10, spread: 90 }); Vibe.reward({ xp: 2 }); }
          else FX.sound.pop();
          return;
        }
        const op = e.target.closest("[data-act=open]");
        if (op) openFlat(FLATS.find((f) => f.id === op.dataset.id));
      });

      function openFlat(f) {
        const inf = flatInfo(f), c = moveCost(f), here = isHere(f), block = rentBlock(f), h = S().home;
        let mp = null;
        Vibe.ui.sheet(`
          ${photo(f, 180, false)}
          <div class="lf-row" style="margin-top:14px"><div class="big-num" style="font-size:32px">${rub(f.p)}<span style="font-family:var(--font);font-size:13px;font-weight:800">/мес</span></div><span class="badge" style="background:var(--pink)">🔥 осталось 2 просмотра</span></div>
          <div class="display" style="font-size:22px;margin-top:6px">${f.t}</div>
          <div class="muted" style="font-size:13px;font-weight:700">${f.sub}</div>
          <div class="lf-pills" style="margin-top:10px"><span class="badge" style="background:var(--lilac)">📍 ${inf.district}</span>${inf.work != null ? `<span class="badge" style="background:var(--sky)">💼 до работы ${inf.work} мин на метро</span>` : `<span class="badge" style="background:#fff">💼 работы пока нет</span>`}</div>
          <div class="lf-note" style="margin-top:10px"><div>😴 <b>Сон здесь ${sleepPct({ rent: f.p })}%</b> · сейчас ${sleepPct(S().home)}%${homeItems().length ? ` · вещи дают +${Vibe.inv.bonus("sleep")}%` : ""}</div><div class="muted">${sleepPct({ rent: f.p }) > sleepPct(S().home) ? "Тут высыпаешься лучше — продуктивность скажет спасибо" : sleepPct({ rent: f.p }) < sleepPct(S().home) ? "Спать будешь хуже. Сосед Валера уже настраивает колонку" : "Спать будешь так же. Стабильность"}</div></div>
          <div data-fmap style="height:190px;margin-top:12px"></div>
          <div class="card flat stagger" style="padding:2px 14px;margin-top:14px">
            ${f.feat.map((x) => `<div class="li"><div class="ic c-lime" style="width:36px;height:36px;font-size:16px">✅</div><div class="tx" style="font-size:13px;font-weight:700">${x}</div></div>`).join("")}
          </div>
          <div style="margin-top:14px">
            <div class="lf-fee"><span>Первый месяц</span><span>${rub(c.first)}</span></div>
            <div class="lf-fee"><span>${f.nodep ? "Залог 0 ₫ 🎉 · «Страховой платёж»*" : "Залог"}</span><span>${rub(c.dep)}</span></div>
            ${c.fee ? `<div class="lf-fee"><span>Комиссия «помощника хозяина»</span><span>${rub(c.fee)}</span></div>` : ""}
            <div class="lf-total"><span class="display" style="font-size:18px">На заезд</span><span class="big-num">${rub(c.total)}</span></div>
          </div>
          ${homeItems().length && !here ? thingsHtml("🚚 Всё переедет с тобой — грузчики аккуратные (почти)") + `<div style="height:10px"></div>` : ""}
          ${h && h.own && !here ? `<div class="lf-note" style="margin-bottom:10px">🏠 У тебя своя квартира. Переедешь — будешь платить аренду, а ипотека никуда не денется.</div>` : ""}
          ${block && !here ? `<div class="lf-note" style="margin-bottom:10px;background:var(--coral)">🙅‍♀️ ${block}</div>` : ""}
          ${here ? `<button class="btn xl block" disabled>Ты уже здесь живёшь 🏠</button>` : `<button class="btn black xl block" data-move>Переехать · ${rub(c.total)} 🚚</button>`}
          <button class="btn block" data-view style="margin-top:10px">Записаться на просмотр 👀</button>
          <div class="fine">Дальше аренда ${rub(f.p)} списывается 1-го числа каждого месяца. *«Страховой платёж» — это не залог. Залог — это другое. Чем — мы сами не до конца понимаем.</div>`, {
          onMount(sh, close) {
            const el = $(sh, "[data-fmap]");
            const home = Vibe.map.place("home"), work = Vibe.map.place("work");
            const pin = Object.assign({}, inf.p, { id: "flat", e: f.emoji, color: "#ff6bcb", pulse: true, label: here ? "Ты здесь" : "Новая" });
            mp = Vibe.map.create(el, { pins: Vibe.map.basePins([pin]), interactive: false, fit: [inf.p, home, work].filter(Boolean) });
            el.style.touchAction = "pan-y";
            if (work) mp.route(Vibe.map.path(inf.p, work), { color: "#3d7bff" });
            sheetMaps.add(mp);
            const mv = $(sh, "[data-move]");
            if (mv) mv.addEventListener("click", () => move(f, mv, close));
            $(sh, "[data-view]").addEventListener("click", (e) => {
              const b = e.currentTarget;
              if (viewed.has(f.id)) { FX.shake(b); FX.toast("Ты уже записан. Ты 14-й в очереди", "⏳"); return; }
              viewed.add(f.id);
              FX.bump(b);
              FX.burst(b, { emojis: ["👀", "🗝️", "✨"], count: 10 });
              b.textContent = `✓ ${pick(["Сегодня 19:15", "Завтра 10:00", "Сб 14:00"])} · ты 14-й`;
              Vibe.reward({ xp: 10 });
              FX.toast("Возьми паспорт, справку о доходах и рекомендацию от прошлой хозяйки", "🗝️", 3000);
            });
          },
          onClose() { if (mp) { mp.destroy(); sheetMaps.delete(mp); } },
        });
      }
      function move(f, btn, close) {
        if (isHere(f)) return;
        const block = rentBlock(f);
        if (block) { FX.shake(btn); FX.toast(block.split(". ")[0], "🙅‍♀️", 3200); return; }
        const c = moveCost(f), inf = flatInfo(f);
        const ok = Vibe.pay(c.total, { title: `Vibe Rent · заезд: ${f.t}`, emoji: "🔑", col: "c-mint", from: btn, cashback: 0.005 });
        if (!ok) return;
        Vibe.game.moveHome({ title: f.t, rent: f.p, emoji: f.emoji, key: f.key });
        close();
        $(root, "[data-homenow]").innerHTML = homeNow();
        FX.bump($(root, "[data-homenow]"));
        renderList();
        FX.confetti();
        T.to(() => FX.confetti({ count: 70 }), 350);
        Vibe.modal(`
          <div class="m-emo float">🚚</div>
          <div class="display">Новоселье!</div>
          <p>${f.t}, район «${inf.district}». Аренда ${rub(f.p)}/мес спишется 1-го числа${inf.work != null ? `. До работы ${inf.work} мин на метро` : ""}. Соседи уже стучат по батарее — приветствуют.${homeItems().length ? ` Вещи переехали: ${homeItems().map((i) => i.e || "📦").join(" ")}.` : ""} Сон здесь — ${sleepPct(S().home)}%.</p>
          <button class="btn black block" data-close>Распаковывать коробки 📦</button>
          <div class="fine">Коробки распаковываются примерно 2 года. Последняя — никогда.</div>`, { sound: "levelup" });
        T.to(() => FX.burst({ x: innerWidth / 2, y: innerHeight / 2 - 80 }, { emojis: ["📦", "🔑", "🏠", "✨"], count: 20 }), 300);
      }
      return () => { T.clear(); sheetMaps.forEach((m) => m.destroy()); sheetMaps.clear(); };
    },
  });

  /* ============================================================
     4. VIBE HOME — покупка и ипотека
     ============================================================ */
  const RATE = 0.189;
  const BUILDS = [
    { key: "buy-student", n: "ЖК «Студенческий»", s: "Студия 21 м²", e: "🏚️", p: 3200000, d: "IV кв. 2027", col: "c-coral" },
    { key: "buy-park", n: "ЖК «Парк у кольцевой»", s: "1-к, 38 м²", e: "🌳", p: 7300000, d: "сдан (почти)", col: "c-lime" },
    { key: "buy-ant", n: "ЖК «Уютный муравейник»", s: "2-к, 54 м²", e: "🏢", p: 8900000, d: "«скоро»", col: "c-yellow" },
    { key: "buy-city", n: "ЖК «Вайб Сити»", s: "3-к, 82 м²", e: "🏙️", p: 12400000, d: "II кв. 2029*", col: "c-sky" },
    { key: "buy-elite", n: "Клубный дом «Элита»", s: "Пентхаус 160 м²", e: "🏰", p: 29000000, d: "уже сдан (в аренду)", col: "c-lilac" },
  ];
  const mln = (n) => dec(n / 1e6, n % 1e6 ? 1 : 0) + " млн ₫";
  const ownsKey = (k) => { const h = S().home; return !!(h && h.own && h.key === k); };
  function mortgage(price, down, years) {
    const L = price * (1 - down / 100), r = RATE / 12, n = years * 12;
    const P = (L * r) / (1 - Math.pow(1 + r, -n));
    const over = P * n - L;
    return { L, P, over, ratio: over / price };
  }
  const rangeRow = (k, label, min, max, step, v) => `
    <div class="lf-range">
      <div class="lf-row"><span class="lf-mini">${label}</span><b data-lbl="${k}"></b></div>
      <input type="range" data-r="${k}" min="${min}" max="${max}" step="${step}" value="${v}" style="--p:${((v - min) / (max - min)) * 100}%">
    </div>`;
  function ownCard() {
    const h = S().home;
    if (!h || !h.own) return "";
    const mort = (S().loans || []).filter((l) => l.name === "Ипотека");
    const pay = mort.reduce((a, l) => a + l.monthly, 0);
    return `<div class="card c-lime" style="margin-bottom:14px">
      <div class="sticker" style="top:12px;right:12px">Твоя! 🔑</div>
      <div class="lf-row" style="justify-content:flex-start;gap:12px;margin-top:6px"><span class="emo float" style="font-size:56px">${h.emoji || "🏠"}</span>
      <div style="min-width:0;flex:1"><div class="lf-mini" style="color:var(--ink)">Своя квартира</div><b style="display:block;font-size:15px;line-height:1.2;margin-top:2px">${esc(h.title)}</b>
      <div style="font-size:12px;font-weight:800;margin-top:4px">📍 ${esc(h.district || "город")} · ${mort.length ? `ипотека ${rub(pay)}/мес · осталось ${Math.max(...mort.map((l) => l.left))} платежей` : "без ипотеки, как король 👑"}</div><div class="lf-pills" style="margin-top:6px">${sleepBadge(h)}</div></div></div>
      ${thingsHtml()}
    </div>`;
  }
  const buildCard = (b, i) => {
    const p = Vibe.map.place("flat:" + b.key), own = ownsKey(b.key);
    return `
    <div class="card tap" data-build="${i}" style="padding:12px${own ? ";background:var(--lime)" : ""}">
      <div class="lf-row" style="justify-content:flex-start;gap:12px">
        <div class="lf-cpic ${b.col}" style="width:78px;height:78px;font-size:44px"><span class="emo float d${i % 3}">${b.e}</span></div>
        <div style="flex:1;min-width:0">
          <b style="font-size:15px;display:block;line-height:1.2">${b.s}</b>
          <div class="muted" style="font-size:12px;font-weight:700">${b.n} · 📍 ${p.district}</div>
          <div class="price" style="margin-top:4px;font-size:20px">${mln(b.p)}</div>
          <div style="font-size:11px;font-weight:800">${own ? "🔑 Это твоя квартира" : `сдача: ${b.d}`}</div>
          <div class="lf-pills" style="margin-top:4px">${sleepBadge({ own: true })}</div>
        </div>
      </div>
    </div>`;
  };

  Vibe.screen("home-buy", {
    render() {
      const m = mortgage(10000000, 20, 30);
      return `
      ${Vibe.ui.head("Vibe Home", "Ипотека на 30 лет счастья", Vibe.ui.vibikiPill())}
      <div class="stagger">
        <div data-own>${ownCard()}</div>
        ${Vibe.ui.hero({ title: "Своя квартира. Почти", text: "Ипотека от 6%* — подпиши и мечтай", emo: "🏡", color: "c-yellow", sticker: "6%*" })}
        <div class="card" style="margin-top:14px" data-calc>
          <div class="lf-mini">Ежемесячный платёж</div>
          <div class="big-num" style="font-size:44px;margin-top:4px" data-pay data-val="${Math.round(m.P)}">${rub(m.P)}</div>
          <div class="badge" style="background:var(--pink);margin-top:8px">ставка 18,9%* · реальная</div>
          ${rangeRow("price", "Стоимость квартиры", 3000000, 30000000, 100000, 10000000)}
          ${rangeRow("down", "Первый взнос", 10, 90, 1, 20)}
          ${rangeRow("years", "Срок", 5, 30, 1, 30)}
          <div class="card flat c-lilac tight" style="margin-top:16px">
            <div class="lf-mini" style="color:var(--ink)">Переплата банку</div>
            <div class="big-num" style="font-size:26px;margin:4px 0" data-over data-val="${Math.round(m.over)}">${rub(m.over)}</div>
            <div style="font-weight:800;font-size:14px">Это <span data-ratio>${dec(m.ratio)}</span> такой же квартиры 🫠</div>
            <div class="lf-houses" data-houses style="margin-top:6px"></div>
          </div>
          <div class="lf-fee" style="margin-top:12px"><span>Нужна зарплата на руки от</span><b data-need></b></div>
          <button class="btn black xl block" data-approve style="margin-top:12px">Проверить одобрение ✨ <span class="arrow">→</span></button>
          <div class="fine">*6% — для тех, кто родился 29 февраля на Луне и работает в банке. Банк одобряет, если платёж не больше половины зарплаты. Ставка зависит от ключевой ставки, курса, погоды и настроения банка.</div>
        </div>
        ${zab("", "sly")}
        <h2 class="sec">Купить квартиру <small>тапни, чтобы купить</small></h2>
        <div class="stack" data-builds>${BUILDS.map(buildCard).join("")}</div>
        <div class="fine">*Сроки сдачи ориентировочные. Ориентир — горизонт. Цены растут быстрее, чем ты копишь, — это нормально.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const R = {}; $$(root, "[data-r]").forEach((i) => (R[i.dataset.r] = i));
      const payEl = $(root, "[data-pay]"), overEl = $(root, "[data-over]");
      const sheetMaps = new Set();
      let lastHouses = -1, debounce = null;
      const cur = () => ({ price: +R.price.value, down: +R.down.value, years: +R.years.value });
      function update(animate = true) {
        const { price, down, years } = cur();
        Object.values(R).forEach(setRange);
        $(root, "[data-lbl=price]").textContent = rub(price);
        $(root, "[data-lbl=down]").textContent = `${down}% · ${dec((price * down) / 100 / 1e6, 2)} млн`;
        $(root, "[data-lbl=years]").textContent = `${years} ${plural(years, "год", "года", "лет")}`;
        const m = mortgage(price, down, years);
        $(root, "[data-ratio]").textContent = dec(m.ratio);
        $(root, "[data-need]").textContent = rub(Math.ceil((m.P * 2) / 1000) * 1000);
        const nH = Math.max(1, Math.min(12, Math.round(m.ratio)));
        if (nH !== lastHouses) {
          $(root, "[data-houses]").innerHTML = Array.from({ length: nH }, (_, i) => `<span style="animation-delay:${i * 40}ms">🏠</span>`).join("") + (m.ratio > 12 ? " …" : "");
          lastHouses = nH;
        }
        const s = S();
        say(root, !s.job ? "Без работы банк даже калькулятор посчитает с осуждением. Сначала — Vibe Job." : years >= 25 ? `К концу ипотеки тебе будет ${25 + years}. Отличный возраст для новоселья! 🎂` : down >= 60 ? "Первый взнос 60%+? Ты точно не наш клиент. Уважаем." : `Всего ${years} ${plural(years, "год", "года", "лет")} — и квартира почти твоя. Почти — потому что ещё налог.`);
        if (!animate) return;
        clearTimeout(debounce);
        debounce = T.to(() => {
          FX.countTo(payEl, Math.round(m.P), { fmt: Vibe.rub, dur: 500 });
          FX.countTo(overEl, Math.round(m.over), { fmt: Vibe.rub, dur: 500 });
          FX.bump(payEl);
        }, 60);
      }
      update(false);
      root.addEventListener("input", (e) => { if (e.target.matches("[data-r]")) update(); });
      root.addEventListener("click", (e) => {
        const b = e.target.closest("[data-build]");
        if (b) {
          const bd = BUILDS[+b.dataset.build];
          R.price.value = Math.min(30000000, bd.p);
          update();
          FX.bump(b);
          FX.burst(b, { emojis: [bd.e, "✨", "🔑"], count: 10 });
          openBuild(bd);
          return;
        }
        const ap = e.target.closest("[data-approve]");
        if (ap) { FX.bump(ap); scoring(Object.assign(cur(), { b: null })); }
      });

      function refresh() {
        $(root, "[data-own]").innerHTML = ownCard();
        const bl = $(root, "[data-builds]");
        bl.innerHTML = BUILDS.map(buildCard).join("");
        restagger(bl);
      }

      function openBuild(b) {
        const { down, years } = cur();
        const m = mortgage(b.p, down, years), downAmt = Math.round((b.p * down) / 100), s = S();
        const fp = Vibe.map.place("flat:" + b.key), work = Vibe.map.place("work");
        const own = ownsKey(b.key);
        let mp = null;
        Vibe.ui.sheet(`
          <div class="lf-photo ${b.col}" style="height:130px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:70px"><span class="emo float">${b.e}</span><span class="emo float d2" style="font-size:40px">🔑</span><div class="sticker">${own ? "Твоя!" : "Осталось 2 кв."}</div></div>
          <div class="display" style="font-size:24px;margin-top:14px">${b.s}</div>
          <div class="muted" style="font-size:13px;font-weight:700">${b.n} · 📍 ${fp.district} · сдача ${b.d}</div>
          <div class="big-num" style="font-size:34px;margin-top:8px">${rub(b.p)}</div>
          <div class="lf-note" style="margin-top:10px"><div>😴 <b>Сон в своей квартире ${sleepPct({ own: true })}%</b> · сейчас ${sleepPct(S().home)}%</div><div class="muted">Никто не стучит в стену. Кроме банка — раз в месяц.</div></div>
          ${homeItems().length ? thingsHtml("🚚 Вещи переедут с тобой") : ""}
          <div data-bmap style="height:180px;margin-top:12px"></div>
          ${work ? `<div class="lf-pills" style="margin-top:10px"><span class="badge" style="background:var(--sky)">💼 до работы ${Vibe.map.minutes(Vibe.map.path(fp, work), "metro")} мин на метро</span></div>` : ""}
          <div style="margin-top:14px">
            <div class="lf-fee"><span>Первый взнос ${down}%</span><span>${rub(downAmt)}</span></div>
            <div class="lf-fee"><span>Кредит на ${years} ${plural(years, "год", "года", "лет")} под 18,9%</span><span>${rub(m.L)}</span></div>
            <div class="lf-fee"><span>Переплата банку</span><span>${rub(m.over)}</span></div>
            <div class="lf-fee"><span>Нужна зарплата на руки от</span><span>${rub(Math.ceil((m.P * 2) / 1000) * 1000)}</span></div>
            <div class="lf-total"><span class="display" style="font-size:18px">Платёж</span><span class="big-num">${rub(m.P)}/мес</span></div>
          </div>
          ${own ? `<button class="btn xl block" disabled>Это уже твоя квартира 🔑</button>` : `
          <button class="btn black xl block" data-mort>Купить в ипотеку 🏦</button>
          <button class="btn block" data-cash style="margin-top:10px" ${s.balance >= b.p ? "" : "disabled"}>${s.balance >= b.p ? `Купить сразу · ${mln(b.p)} 💰` : `Сразу не потянешь: не хватает ${rub(b.p - Math.max(0, s.balance))}`}</button>`}
          <div class="fine">Взнос и срок — из калькулятора выше. После покупки аренда больше не списывается, а вот ипотека — каждый месяц, ${years} ${plural(years, "год", "года", "лет")}.</div>`, {
          onMount(sh, close) {
            const el = $(sh, "[data-bmap]");
            const pin = Object.assign({}, fp, { id: "buy", e: b.e, color: "#ff6bcb", pulse: true, label: "Квартира" });
            mp = Vibe.map.create(el, { pins: Vibe.map.basePins([pin]), interactive: false, fit: [fp, Vibe.map.place("home"), work].filter(Boolean) });
            el.style.touchAction = "pan-y";
            if (work) mp.route(Vibe.map.path(fp, work), { color: "#3d7bff" });
            sheetMaps.add(mp);
            const mb = $(sh, "[data-mort]");
            if (mb) mb.addEventListener("click", () => {
              FX.bump(mb);
              if (S().balance < downAmt) { FX.shake(mb); FX.toast(`На первый взнос нужно ${rub(downAmt)}. Копи или уменьши взнос`, "🐷", 3000); return; }
              close();
              scoring({ price: b.p, down, years, b });
            });
            const cb = $(sh, "[data-cash]");
            if (cb) cb.addEventListener("click", () => {
              const ok = Vibe.pay(b.p, { title: `Покупка квартиры · ${b.n}`, emoji: "🏠", col: "c-yellow", from: cb, cashback: 0 });
              if (!ok) return;
              Vibe.game.buyHome({ title: `${b.s}, ${b.n}`, emoji: b.e, key: b.key });
              close();
              celebrate(b, null);
            });
          },
          onClose() { if (mp) { mp.destroy(); sheetMaps.delete(mp); } },
        });
      }

      function celebrate(b, m) {
        refresh();
        FX.confetti();
        T.to(() => FX.confetti({ count: 120 }), 400);
        Vibe.modal(`
          <div class="m-emo float">🔑</div>
          <div class="display">Ключи твои!</div>
          <p>${b.s}, ${b.n}. ${m ? `Платёж ${rub(m.P)}/мес, каждый месяц, долго. Квартира твоя (частично — остальное у банка).` : "Без ипотеки. Банк в слезах, ты — в своей квартире."} Аренды больше нет. Сон теперь ${sleepPct(S().home)}%${homeItems().length ? `, вещи уже на месте: ${homeItems().map((i) => i.e || "📦").join(" ")}` : ""}.</p>
          <button class="btn black block" data-close>Новоселье 🎉</button>
          <div class="fine">Ремонт, мебель и шторы в стоимость не входят. Шторы — это вообще отдельная ипотека.</div>`, { sound: "levelup" });
        T.to(() => FX.burst({ x: innerWidth / 2, y: innerHeight / 2 - 80 }, { emojis: ["🔑", "🏠", "🎉", "✨"], count: 24 }), 300);
      }

      // Скоринг банка: opt = { price, down, years, b } (b = null — только проверка)
      function scoring(opt) {
        const m = mortgage(opt.price, opt.down, opt.years);
        const downAmt = Math.round((opt.price * opt.down) / 100);
        const s = S();
        let fail = null;
        if (!s.job) fail = pick(["Банк не видит у тебя дохода. Даже нейросеть удивилась.", "Справка с места работы? А, места нет. Понятно.", "Скоринг показал: «безработный, но с амбициями». Амбиции в залог не берём."]);
        else if (m.P > netOf(s.job.salary) * 0.5) fail = `Платёж ${rub(m.P)} — больше половины твоей зарплаты (${rub(netOf(s.job.salary))} на руки). Банк волнуется. За себя.`;
        else if (s.balance < downAmt) fail = `На первый взнос нужно ${rub(downAmt)}, а на карте ${rub(Math.max(0, s.balance))}. Копилка плачет.`;
        const steps = ["Проверяем кредитную историю…", "Смотрим, что ты лайкал в 2019…", "Считаем, сколько ты тратишь на кофе ☕", "Звоним работодателю…", "Звоним маме…", "Сверяемся с гороскопом 🔮", "Почти готово…"];
        Vibe.modal(`
          <div class="lf-scan">
            <div class="wobble" style="display:inline-block">${Vibe.zabotik(96, "wow")}</div>
            <div class="display" style="font-size:26px;margin-top:6px">Скоринг…</div>
            <p data-step style="min-height:20px;margin:8px 0 0">${steps[0]}</p>
            <div class="progress"><i data-bar style="--p:0%"></i></div>
            <div class="big-num" style="font-size:20px" data-pct>0%</div>
          </div>`, {
          sound: "pop",
          onMount(md, close) {
            let k = 0;
            const id = T.every(() => {
              k++;
              const bar = $(md, "[data-bar]");
              if (!bar) { T.stop(id); return; }
              const pct = Math.min(fail ? 87 : 100, Math.round((k / steps.length) * 100));
              bar.style.setProperty("--p", pct + "%");
              $(md, "[data-pct]").textContent = pct + "%";
              if (k < steps.length) { const st0 = $(md, "[data-step]"); st0.textContent = steps[k]; FX.bump(st0); return; }
              T.stop(id);
              T.to(() => {
                if (fail) {
                  md.innerHTML = `
                    <div class="m-emo float">🙅</div>
                    <div class="display">Отказ</div>
                    <p>${fail}</p>
                    <div class="stack">${!s.job ? `<button class="btn black block" data-close data-go="job">Искать работу 💼</button>` : ""}<button class="btn block" data-close>Понятно 🥲</button></div>
                    <div class="fine">Причина отказа не сообщается. Но мы сообщили. Мы же Vibe.</div>`;
                  FX.shake($(md, ".m-emo"));
                  return;
                }
                md.innerHTML = `
                  <div class="m-emo float">🏆</div>
                  <div class="display">${opt.b ? "Одобрено!" : "Предодобрено!"}</div>
                  <div class="big-num" style="font-size:30px;margin-top:8px">${rub(m.L)}</div>
                  <p>Платёж ${rub(m.P)}/мес на ${opt.years} ${plural(opt.years, "год", "года", "лет")}. ${opt.b ? `Первый взнос ${rub(downAmt)} спишется сейчас.` : "Выбери квартиру ниже — и ключи твои."}</p>
                  <div class="stack">
                    ${opt.b ? `<button class="btn grad xl block" data-take>Подписать и забрать ключи 🔑</button>` : ""}
                    <button class="btn block" data-close>${opt.b ? "Подумаю (не надо)" : "Выбрать квартиру 🏠"}</button>
                  </div>
                  <div class="fine">Предодобрение не означает одобрение. Одобрение не означает, что квартира ваша. Но почти.</div>`;
                FX.confetti({ count: 90 });
                FX.sound.success();
                FX.burst($(md, ".m-emo"), { emojis: ["🔑", "🏠", "✨", "💸"], count: 20 });
                const tk = $(md, "[data-take]");
                if (tk) tk.addEventListener("click", (ev) => {
                  const b = opt.b, L = opt.price - downAmt;
                  const ok = Vibe.pay(downAmt, { title: `Первый взнос · ${b.n}`, emoji: "🏠", col: "c-yellow", from: ev.currentTarget, cashback: 0 });
                  if (!ok) return;
                  Vibe.game.addLoan({ name: "Ипотека", amount: L, rate: RATE, months: opt.years * 12 });
                  Vibe.game.tx("Оплата квартиры продавцу", -L, "🏠", "c-yellow");
                  Vibe.game.buyHome({ title: `${b.s}, ${b.n}`, emoji: b.e, key: b.key });
                  Vibe.achieve("credit");
                  Vibe.refreshCounters();
                  close();
                  celebrate(b, m);
                });
              }, 450);
            }, 620);
          },
        });
      }
      return () => { T.clear(); sheetMaps.forEach((m) => m.destroy()); sheetMaps.clear(); };
    },
  });

  /* ============================================================
     5. VIBE TRAVEL — настоящие поездки на 2–7 игровых дней.
     Бронь → событие в календаре (kind:"travel", payload trip) →
     пришёл на вокзал/аэроэкспресс → state.lf_vacation {fromDay, toDay}.
     В отпуске: работа заблокирована, тело восстанавливается,
     фото-моменты в Vibegram, сувенир домой в конце.
     Vibe.travel.onVacation() / current() / end() — для других модулей.
     ============================================================ */
  const TRIPS = [
    { id: "beach", to: "Море «Вайб-Бич»", e: "🏖️", f: "🌊", col: "c-sky", how: "✈️", dep: "metro2", depL: "аэроэкспресс от м. Сити", ticket: 8990, night: 4500, tag: "Хит сезона",
      sub: "Песок, солнце, вай-фай у шезлонга (платный)",
      souv: { id: "sv_beach", name: "Ракушка с Вайб-Бич", e: "🐚", bonus: { mood: 2 } },
      photos: ["Закат над Вайб-Бич. Без фильтров (с тремя фильтрами) 🌅", "Ноги на фоне моря. Классика жанра 🦶🌊", "Коктейль с зонтиком. Зонтик за отдельную плату 🍹", "Чайка украла мой круассан. Это был лучший день 🐦"] },
    { id: "mount", to: "Горы", e: "🏔️", f: "🥾", col: "c-mint", how: "✈️", dep: "metro2", depL: "аэроэкспресс от м. Сити", ticket: 7490, night: 3900, tag: "Перезагрузка",
      sub: "Связь только на вершине. Как и смысл жизни",
      souv: { id: "sv_mount", name: "Магнит «Я покорил»", e: "🧲", bonus: { mood: 2 } },
      photos: ["Я выше облаков. Начальник — нет ⛰️", "Чай из термоса на вершине. Вкуснее любого рафа 🫖", "Нашёл связь. Сразу закрыл 🏔️", "Козёл посмотрел на меня с уважением 🐐"] },
    { id: "north", to: "Северная столица", e: "🌉", f: "🎨", col: "c-lilac", how: "🚆", dep: "metro1", depL: "вокзал у м. Кредитная", ticket: 3490, night: 5200, tag: "Культурно",
      sub: "Мосты, музеи и дождь — включены бесплатно",
      souv: { id: "sv_north", name: "Кружка с мостами", e: "☕", bonus: { mood: 2 } },
      photos: ["Развели мосты. Я остался на правильном берегу 🌉", "Музей. Смотрел на картину 40 минут. Она на меня — тоже 🖼️", "Дождь, поребрик, пышка. Атмосфера ☔", "Белые ночи: не спал, но зато красиво 🌙"] },
    { id: "grandpa", to: "Деревня у деда", e: "🏡", f: "🌾", col: "c-lime", how: "🚃", dep: "metro1", depL: "электричка с вокзала у м. Кредитная", ticket: 990, night: 0, tag: "Дед зовёт", grandpa: true,
      sub: "Грядки, тишина и письмо, которое пока рано открывать",
      souv: { id: "sv_grandpa", name: "Семена пастернака от деда", e: "🌱", bonus: { mood: 3, sleep: 1 } },
      photos: ["Петух разбудил в 5:00. Никакого будильника не надо 🐓", "Сам вырастил редиску. Ну, дед вырастил. Я сорвал 🌱", "Тут нет сети. И мне… нормально? 📵", "Дед сказал: «Земля всегда ждёт». Что бы это значило 🌾"] },
  ];
  const HOT = [
    { id: "t1", to: "Турция", f: "🇹🇷", e: "🏖️", n: 7, p: 58990, old: 119990, col: "c-orange", cd: 14 },
    { id: "t2", to: "Египет", f: "🇪🇬", e: "🐫", n: 6, p: 64990, old: 99990, col: "c-yellow", cd: 1320 },
    { id: "t3", to: "Таиланд", f: "🇹🇭", e: "🐘", n: 7, p: 119990, old: 189990, col: "c-mint", cd: 2710 },
    { id: "t4", to: "ОАЭ", f: "🇦🇪", e: "🏙️", n: 5, p: 89990, old: 149990, col: "c-sky", cd: 488 },
  ].map((h) => Object.assign({ hot: true, how: "✈️", dep: "metro2", depL: "аэроэкспресс от м. Сити", sub: "Всё включено*", souv: { id: "sv_" + h.id, name: `Магнит «${h.to}»`, e: "🧲", bonus: { mood: 1 } },
    photos: [`${h.to}! Всё включено, кроме меня в рабочий чат ☀️`, "Бассейн, шезлонг, полотенце с утра занято не мной 🏊", "Шведский стол. Я победил шведов 🍽️"] }, h));
  const ALL_TRIPS = TRIPS.concat(HOT);
  const tripById = (id) => ALL_TRIPS.find((x) => x.id === id) || null;

  // Цена: билеты туда-обратно на каждого + отель за ночь на номер (2 чел/номер) + сбор
  function tripCost(tr, nights, people) {
    if (tr.hot) { const base = tr.p * people; return { tickets: base, hotel: 0, fee: 990, total: base + 990 }; }
    const tickets = tr.ticket * 2 * people;
    const hotel = tr.night * nights * Math.ceil(people / 2);
    const fee = tr.grandpa ? 0 : 990;
    return { tickets, hotel, fee, total: tickets + hotel + fee };
  }

  /* ---------- Отпуск: состояние и API ---------- */
  const vac = () => S().lf_vacation || null;
  const travel = (Vibe.travel = {
    TRIPS: ALL_TRIPS,
    current: vac,
    onVacation() { const v = vac(); if (!v || !Vibe.game || !S().game) return false; const d = gToday(); return d >= v.fromDay && d <= v.toDay; },
    booked: () => (Vibe.sched ? Vibe.sched.upcoming(20).find((e) => e.kind === "travel") || null : null),
    cost: tripCost,
    start(tripData) {
      const tr = tripById(tripData.id) || TRIPS[0];
      const nights = Math.max(1, tripData.nights || 3);
      const from = gToday();
      Vibe.state.set({ lf_vacation: { id: tr.id, to: tr.to, e: tr.e, people: tripData.people || 1, nights, fromDay: from, toDay: from + nights, lastMin: Vibe.game.minutes(), photoDay: from - 1 }, lf_trip: null });
      Vibe.emit && Vibe.emit("travel_start", { id: tr.id, to: tr.to, nights });
      return vac();
    },
    end(early = false) {
      const v = vac(); if (!v) return;
      const tr = tripById(v.id) || TRIPS[0];
      Vibe.state.set({ lf_vacation: null, life_tripsDone: st("life_tripsDone", 0) + 1, lf_places: Object.assign({}, st("lf_places", {}), { [tr.id]: (st("lf_places", {})[tr.id] || 0) + 1 }) });
      // Сувенир — домой, в инвентарь (настроение +). Повторный — уже не бонус, а воспоминание.
      let souvTxt = "";
      if (Vibe.inv && tr.souv) {
        if (Vibe.inv.add(Object.assign({ cat: "home" }, tr.souv))) souvTxt = ` Сувенир «${tr.souv.name}» ${tr.souv.e} теперь дома: настроение +${tr.souv.bonus.mood}.`;
        else souvTxt = ` Второй «${tr.souv.name}» повесили рядом с первым.`;
      }
      if (Vibe.body) { const b = Vibe.body.get(); Vibe.state.set({ body: Object.assign({}, b, { mood: Math.min(100, b.mood + (early ? 0 : 8)) }) }); }
      FX.toast(`${early ? "Вернулся раньше" : "Отпуск закончился"}: ${tr.to}.${souvTxt} Добро пожаловать обратно в семью Vibe 💜`, tr.e, 5200);
      FX.burst({ x: innerWidth / 2, y: innerHeight / 3 }, { emojis: [tr.e, tr.souv ? tr.souv.e : "🎁", "💜"], count: 16 });
      if (Vibe.mail) {
        if (tr.grandpa) {
          const n = st("lf_places", {}).grandpa || 1;
          Vibe.mail.send({ from: "Дед", subject: n > 1 ? "Опять уехал?" : "Внучок, доехал?", kind: "personal",
            body: n > 1 ? "Грядки помнят твои руки. Пастернак взошёл. Письмо в серванте всё ещё лежит — то самое, «когда устанешь». Ферма никуда не денется. Я — может быть. Дед." : "Доехал? Город тебя быстро обратно заберёт, я знаю. Письмо с ключами от фермы я пока придержу. Скажешь, когда устанешь от всего этого. Дед." });
        } else {
          Vibe.mail.send({ from: "Vibe Travel", subject: `Как прошла поездка: ${tr.to}?`, kind: "official",
            body: `Надеемся, ты отдохнул и готов к новым свершениям! Оцени поездку от 5 до 5 звёзд. Кстати, с «Плюс Вайб» следующий отпуск — на 0,5% дешевле. Мы скучали. Твой рабочий чат — тоже.` });
        }
      }
      Vibe.emit && Vibe.emit("travel_end", { id: tr.id, to: tr.to, early });
      Vibe.refreshCounters();
    },
    photo(manual = false) {
      const v = vac(); if (!v) return false;
      const tr = tripById(v.id) || TRIPS[0];
      const text = pick(tr.photos || ["Я в отпуске ✨"]);
      if (Vibe.gram && Vibe.gram.post) { try { Vibe.gram.post({ e: tr.e, text: `${text} · ${tr.to}`, kind: "travel", from: "me" }); } catch (err) { console.error(err); } }
      Vibe.emit && Vibe.emit("post", { e: tr.e, text, kind: "travel" });
      if (manual) Vibe.reward({ xp: 8, silent: true });
      return text;
    },
  });

  // Работа во время отпуска заблокирована (оборачиваем world.js/game.js, не правя их)
  const VAC_LINES = ["Ты в отпуске! Рабочий чат на паузе. Корпорация гордится твоим отдыхом (и ждёт)", "Отпуск — это тоже работа над собой. Задачи подождут", "Вайбот спрятал ноутбук. Найдёшь после отпуска 🏖️"];
  if (Vibe.work && !Vibe.work._lfWrapped) {
    const can0 = Vibe.work.can.bind(Vibe.work);
    Vibe.work.can = () => (travel.onVacation() ? { ok: false, why: pick(VAC_LINES), vacation: true } : can0());
    Vibe.work._lfWrapped = true;
  }
  if (Vibe.game && Vibe.game.completeTask && !Vibe.game._lfWrapped) {
    const ct0 = Vibe.game.completeTask;
    Vibe.game.completeTask = (score) => { if (travel.onVacation()) { FX.toast(pick(VAC_LINES), "🏖️", 3200); return null; } return ct0(score); };
    Vibe.game._lfWrapped = true;
  }

  // Тик отпуска: восстановление раз в игровой час, фото раз в игровой день, конец поездки
  function vacTick() {
    const v = vac();
    if (!v || !S().profile || !S().game || !Vibe.game) return;
    const m = Vibe.game.minutes(), d = gToday();
    if (m >= v.toDay * 1440 + 10 * 60) return travel.end(false);
    const hours = Math.floor((m - (v.lastMin || m)) / 60);
    const patch = {};
    if (hours > 0 && Vibe.body) {
      const b = Vibe.body.get(), k = Math.min(hours, 48);
      Vibe.state.set({ body: Object.assign({}, b, { energy: Math.min(100, b.energy + 4 * k), mood: Math.min(100, b.mood + 3 * k), health: Math.min(100, b.health + 1 * k) }) });
      if (Vibe.body.addStress) Vibe.body.addStress(-2 * k, `Отпуск: ${v.to}`, v.e || "🏝️");
      patch.lastMin = (v.lastMin || m) + hours * 60;
    }
    if ((v.photoDay == null || v.photoDay < d) && Vibe.game.info().hour >= 12) {
      const text = travel.photo();
      patch.photoDay = d;
      if (text && !document.hidden) FX.toast(`📸 ${text}`, v.e || "🏖️", 3600);
    }
    if (Object.keys(patch).length) Vibe.state.set({ lf_vacation: Object.assign({}, vac(), patch) });
  }
  if (!Vibe._lfVacTimer) Vibe._lfVacTimer = setInterval(() => { if (!document.hidden) { try { vacTick(); } catch (err) { console.error(err); } } }, 5000);

  if (Vibe.sched) {
    // Пришёл на вокзал/аэроэкспресс → поездка началась, отпуск идёт N игровых дней
    Vibe.sched.on("travel", (e) => {
      const t = e.trip || { id: (ALL_TRIPS.find((x) => e.title && e.title.includes(x.to)) || TRIPS[0]).id, nights: 3, people: 1 };
      const v = travel.start(t);
      const tr = tripById(v.id) || TRIPS[0];
      setTimeout(() => {
        FX.burst({ x: innerWidth / 2, y: innerHeight / 3 }, { emojis: [tr.how || "✈️", tr.e, "☀️", "🧳"], count: 20 });
        FX.toast(`Ты в отпуске до ${whenStr(v.toDay, 10)}: ${tr.to}. Работа заблокирована. Это забота 💜`, tr.e, 4600);
      }, 600);
    });
    Vibe.sched.on("travel:missed", (e) => {
      Vibe.state.set({ lf_trip: null });
      setTimeout(() => FX.toast(`${(e.trip && tripById(e.trip.id) || {}).how === "🚆" ? "Поезд ушёл" : "Самолёт улетел"} без тебя. ${e.title.replace(/^.*→\s*/, "")} передаёт привет`, "🛫", 3200), 1400);
    });
  }

  /* ---------- Вёрстка ---------- */
  const tcss = `
  .lft-vac{position:relative;overflow:hidden}
  .lft-vac .big{position:absolute;right:-6px;top:-10px;font-size:96px;opacity:.9;pointer-events:none}
  .lft-bar{height:14px;border:2.5px solid var(--ink);border-radius:99px;background:var(--paper);overflow:hidden;margin-top:10px}
  .lft-bar i{display:block;height:100%;background:var(--ink);border-radius:99px}
  .lft-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .lft-dest{padding:0;overflow:hidden;display:flex;flex-direction:column}
  .lft-dest .pic{height:96px;display:flex;align-items:center;justify-content:center;gap:4px;font-size:42px;border-bottom:2.5px solid var(--ink);position:relative}
  .lft-dest .pic .sticker{position:absolute;left:8px;top:8px;font-size:10px}
  .lft-dest .bd{padding:10px 12px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}
  .lft-dest .bd b{font-size:14px;line-height:1.15}
  .lft-dest .bd small{font-size:11px;font-weight:700;color:var(--muted);line-height:1.25}
  .lft-dest.grandpa .pic{background-image:repeating-linear-gradient(90deg,rgba(14,14,18,.06) 0 10px,transparent 10px 20px)}
  .lft-pins{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  `;
  if (!document.getElementById("lft-style")) { const s = document.createElement("style"); s.id = "lft-style"; s.textContent = tcss; document.head.appendChild(s); }

  function vacHtml() {
    const v = vac();
    if (!v) return "";
    const tr = tripById(v.id) || TRIPS[0];
    const total = Math.max(1, v.toDay * 1440 + 600 - v.fromDay * 1440);
    const pct = Math.round(clamp((Vibe.game.minutes() - v.fromDay * 1440) / total) * 100);
    return `<div class="card ${tr.col} lft-vac" style="margin-top:12px">
      <span class="big emo float">${tr.e}</span>
      <div class="lf-mini" style="color:var(--ink)">🌴 Ты в отпуске</div>
      <div class="display" style="font-size:22px;margin-top:2px;max-width:70%">${esc(tr.to)}</div>
      <div style="font-size:12px;font-weight:800;margin-top:4px">До ${whenStr(v.toDay, 10)} · ${v.nights} ${plural(v.nights, "ночь", "ночи", "ночей")}</div>
      <div class="lft-bar"><i style="width:${pct}%"></i></div>
      <div class="lft-pins"><span class="badge w">⚡ энергия ↑</span><span class="badge w">🙂 настроение ↑</span><span class="badge w">🧘 стресс ↓</span><span class="badge w">💼 работа на паузе</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        <button class="btn black" data-photo>Фото 📸</button>
        <button class="btn" data-endvac>Домой раньше</button>
      </div>
    </div>`;
  }
  function tripHtml() {
    if (vac()) return "";
    const up = travel.booked();
    if (!up) return "";
    const t = up.trip || {}, tr = tripById(t.id) || {};
    return `<div class="card c-lime" style="margin-top:12px">
      <div class="lf-row"><div style="min-width:0"><div class="lf-mini" style="color:var(--ink)">🧳 Твоя поездка</div><b style="display:block;font-size:15px;margin-top:2px">${esc(up.title)}</b><div style="font-size:12px;font-weight:800">${whenStr(up.day, up.hour)}${t.nights ? ` · ${t.nights} ${plural(t.nights, "ночь", "ночи", "ночей")}` : ""} · ${esc(tr.depL || "м. Сити")}</div></div><span class="emo float" style="font-size:40px">${tr.how || "✈️"}</span></div>
      <div style="margin-top:10px">${mapsBtn(up.place || "metro2", "Доехать до отправления 🚇", "btn black block")}</div>
      <div class="fine" style="margin-top:6px">Опоздаешь больше чем на 4 часа — поездка сгорит. Возврат только эмоциональный.</div>
    </div>`;
  }
  const destCard = (t) => {
    const c = tripCost(t, 3, 1);
    return `<div class="card tap lft-dest ${t.grandpa ? "grandpa" : ""}" data-trip="${t.id}">
      <div class="pic ${t.col}"><div class="sticker" style="background:var(--paper)">${t.tag}</div><span class="emo wobble">${t.f}</span><span class="emo float">${t.e}</span></div>
      <div class="bd"><b>${t.to}</b><small>${t.sub}</small>
        <div class="price" style="font-size:15px;margin-top:4px">${t.grandpa ? "дед денег не берёт" : `от ${rub(c.total)}`}</div>
        <small>${t.how} ${t.grandpa ? `${rub(t.ticket)} электричка` : `+ ${rub(t.night)}/ночь`}</small></div>
    </div>`;
  };

  Vibe.screen("travel", {
    render() {
      const done = st("life_tripsDone", 0);
      return `
      ${Vibe.ui.head("Vibe Travel", "Улетай от проблем (они догонят)", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: travel.onVacation() ? "Ты в отпуске!" : "Отпуск, который засчитается", text: `Смотрят сейчас: <b data-watch>48</b> человек${done ? ` · у тебя ${done} ${plural(done, "поездка", "поездки", "поездок")}` : ""}`, emo: travel.onVacation() ? "🌴" : "✈️", color: "c-sky", sticker: "−70%*" })}
        ${vacHtml()}
        ${tripHtml()}
        <h2 class="sec">Куда махнём? <small>2–7 дней</small></h2>
        <div class="lft-grid">${TRIPS.map(destCard).join("")}</div>
        <div class="fine">В отпуске: работа на паузе, энергия и настроение растут, фото сами летят в Vibegram, сувенир едет домой. Отель — за ночь, билеты — туда и обратно (да, обратно тоже, мы сами удивились).</div>
        <h2 class="sec">🔥 Горящие <small>таймеры честные*</small></h2>
        <div class="hscroll">${HOT.map((h) => `
          <div class="card tap lf-hot" data-trip="${h.id}">
            <div class="pic ${h.col}"><span class="emo wobble">${h.f}</span><span class="emo float">${h.e}</span>
              <div class="sticker" style="top:10px;right:10px;background:var(--pink)">🔥 Горит!</div>
              <span class="timer-pill">⏱ <span data-cd="${h.cd}">${mmss(h.cd)}</span></span></div>
            <div class="body">
              <div class="lf-row"><b style="font-size:16px">${h.to} · ${h.n} ночей</b></div>
              <div class="lf-row" style="margin-top:6px"><div><div class="price" style="font-size:20px">${rub(h.p)}</div><div class="old-price">${rub(h.old)}</div></div><span class="badge" style="background:var(--yellow)">осталось 2 места</span></div>
            </div>
          </div>`).join("")}</div>
        <div class="fine" style="margin-top:0">*Таймер честно обнуляется, когда заканчивается. Акция продлевается автоматически, как и ваша подписка.</div>
        ${Vibe.ui.marquee(["Всё включено*", "Перелёт в 04:20", "Отель 5★ (звёзды видно с балкона)", "Море в 15 минутах (на такси)"])}
        ${zab(travel.onVacation() ? "Отдыхай! Я присмотрю за рабочим чатом. Там всего 214 сообщений 💜" : (st("lf_places", {}).grandpa ? "Дед опять звонил. Спрашивал, не устал ли ты. Я сказал, что ты в порядке. Ты же в порядке?" : "Отпуск — лучшее время, чтобы проверить рабочий чат. Мы добавили роуминг для него бесплатно."))}
      </div>`;
    },
    mount(root) {
      const T = bag();
      let resetToast = false;
      T.every(() => {
        $$(root, "[data-cd]").forEach((el) => {
          let v = +el.dataset.cd - 1;
          if (v <= 0) {
            v = rnd(1800, 3600);
            const pill = el.closest(".timer-pill");
            FX.bump(pill);
            FX.burst(pill, { emojis: ["🔥", "⏱️"], count: 8, spread: 70 });
            if (!resetToast) { resetToast = true; FX.toast("Акция закончилась… и снова началась! 🔥", "⏱️"); }
          }
          el.dataset.cd = v;
          el.textContent = mmss(v);
        });
        const w = $(root, "[data-watch]");
        if (w && Math.random() < 0.4) { w.textContent = Math.max(12, +w.textContent + rnd(-3, 5)); }
      }, 1000);
      root.addEventListener("click", (e) => {
        if (e.target.closest("[data-photo]")) {
          const v = vac(); if (!v) return;
          if (v.lastShot && Vibe.game.minutes() - v.lastShot < 60) { FX.toast("Ещё одно фото — и отпуск превратится в работу контент-мейкера", "📸"); return; }
          Vibe.state.set({ lf_vacation: Object.assign({}, v, { lastShot: Vibe.game.minutes() }) });
          const text = travel.photo(true);
          FX.flash ? FX.flash() : null;
          FX.burst(e.target.closest("[data-photo]"), { emojis: ["📸", "✨", v.e || "🌴"], count: 12 });
          FX.sound.like && FX.sound.like();
          FX.toast(`${text}${Vibe.gram ? " — в Vibegram!" : ""}`, "📸", 3200);
          return;
        }
        if (e.target.closest("[data-endvac]")) {
          Vibe.modal(`<div class="m-emo float">🧳</div><div class="display">Домой раньше?</div><p>Деньги за оставшиеся ночи не вернутся. Зато вернёшься ты — к задачам, дедлайнам и семье Vibe.</p>
            <div class="stack"><button class="btn black block" data-close data-yes>Да, по работе соскучился</button><button class="btn block" data-close>Ещё отдохну 🌴</button></div>
            <div class="fine">Корпорация ценит твою преданность. Это записано.</div>`, {
            sound: "pop",
            onMount(m) { m.querySelector("[data-yes]").addEventListener("click", () => { travel.end(true); T.to(() => Vibe.replace("travel"), 300); }); },
          });
          return;
        }
        const t = e.target.closest("[data-trip]");
        if (t) book(tripById(t.dataset.trip), t);
      });

      function book(tr, card) {
        if (!tr) return;
        FX.bump(card);
        if (travel.onVacation()) { FX.toast("Ты уже в отпуске! Отпуск в отпуске — это уже выгорание наоборот", "🌴"); return; }
        if (travel.booked()) { FX.toast("Одна поездка за раз. Чемодан у тебя тоже один", "🧳"); return; }
        // Отправление по игровому календарю: [подпись, через сколько дней]
        const DATES = [1, 3, 7].map((off) => [whenStr(gToday() + off).replace(/^./, (x) => x.toUpperCase()), off]);
        let people = 1, dIdx = 0, nights = tr.hot ? tr.n : 3;
        const calc = () => tripCost(tr, nights, people);
        const c0 = calc();
        Vibe.ui.sheet(`
          <div class="lf-photo ${tr.col}" style="height:140px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:60px">
            <span class="emo wobble">${tr.f}</span><span class="emo float">${tr.e}</span><span class="emo float d2" style="font-size:40px">${tr.how}</span>
          </div>
          <div class="display" style="font-size:26px;margin-top:14px">${tr.to}</div>
          <div class="muted" style="font-weight:700;font-size:13px">${tr.sub}</div>
          <div class="lf-mini" style="margin-top:14px">Отправление · ${esc(tr.depL)}</div>
          <div class="chips">${DATES.map((d, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-date="${i}">${d[0]}</button>`).join("")}</div>
          <div class="lf-row" style="margin-top:8px">
            <div><div class="lf-mini">Ночей</div><div style="font-weight:800;font-size:13px;margin-top:2px">${tr.hot ? "пакетный тур, фиксировано" : "1 ночь = 1 игровой день"}</div></div>
            ${tr.hot ? `<b style="font-size:18px">${nights}</b>` : `<div class="stepper"><button data-nt="-1">−</button><span data-ntn>${nights}</span><button data-nt="1">+</button></div>`}
          </div>
          <div class="lf-row" style="margin-top:10px">
            <div><div class="lf-mini">Путешественники</div><div style="font-weight:800;font-size:13px;margin-top:2px">${tr.grandpa ? "дед рад всем" : "2 человека на номер"}</div></div>
            <div class="stepper"><button data-ppl="-1">−</button><span data-ppln>${people}</span><button data-ppl="1">+</button></div>
          </div>
          <div style="margin-top:12px">
            <div class="lf-fee"><span>${tr.hot ? "Тур «всё включено»" : `${tr.how} Билеты туда-обратно`}</span><span data-tk>${rub(c0.tickets)}</span></div>
            ${tr.hot ? "" : `<div class="lf-fee"><span>${tr.grandpa ? "🏡 Ночлег у деда" : "🏨 Отель за ночи"}</span><span data-ht>${tr.grandpa ? "0 ₫ (пирожки)" : rub(c0.hotel)}</span></div>`}
            ${c0.fee ? `<div class="lf-fee"><span>Сбор за то, что вы в отпуске</span><span>${rub(c0.fee)}</span></div>` : ""}
            <div class="lf-total"><span class="display" style="font-size:18px">Итого</span><span class="big-num" data-tot>${rub(c0.total)}</span></div>
          </div>
          <div class="card flat tight" style="font-size:12px;font-weight:700;display:grid;gap:3px;margin-bottom:12px">
            <div>🏖️ Пока ты там: работа на паузе, ⚡ и 🙂 растут, стресс тает каждый час</div><div>📸 Фото-моменты — в Vibegram</div><div>🎁 Сувенир «${tr.souv.name}» ${tr.souv.e} — домой</div>
          </div>
          <button class="btn black xl block" data-buy>${tr.grandpa ? "Еду к деду! 🚃" : "Бронирую! ✈️"} <span class="arrow">→</span></button>
          <div class="fine">${tr.grandpa ? "Дед просил не предупреждать заранее: «Всё равно напечёт». Связь в деревне — на крыше сарая." : "Отель 5★ (звёзды на потолке номера). Завтрак концептуальный. Вылет в 04:20 перенесён на 09:00 по многочисленным просьбам."}</div>`, {
          onMount(sh, close) {
            const upd = () => {
              const c = calc();
              $(sh, "[data-tk]").textContent = rub(c.tickets);
              const ht = $(sh, "[data-ht]"); if (ht && !tr.grandpa) ht.textContent = rub(c.hotel);
              FX.countTo($(sh, "[data-tot]"), c.total, { fmt: Vibe.rub, dur: 400 });
              FX.bump($(sh, "[data-tot]"));
            };
            sh.addEventListener("click", (e) => {
              const d = e.target.closest("[data-date]");
              if (d) { dIdx = +d.dataset.date; $$(sh, "[data-date]").forEach((x) => x.classList.toggle("on", x === d)); FX.bump(d); return; }
              const nt = e.target.closest("[data-nt]");
              if (nt) {
                const nn = nights + +nt.dataset.nt;
                if (nn < 2 || nn > 7) { FX.shake(nt.parentElement); FX.toast(nn < 2 ? "Меньше 2 ночей — это командировка" : "Больше 7 — HR не подпишет", "🗓️"); return; }
                nights = nn; const n = $(sh, "[data-ntn]"); n.textContent = nights; FX.bump(n); FX.sound.add(); upd(); return;
              }
              const p = e.target.closest("[data-ppl]");
              if (p) {
                const np = people + +p.dataset.ppl;
                if (np < 1 || np > 4) { FX.shake(p.parentElement); return; }
                people = np; const n = $(sh, "[data-ppln]"); n.textContent = people; FX.bump(n); FX.sound.add(); upd(); return;
              }
              const b = e.target.closest("[data-buy]");
              if (!b) return;
              const c = calc();
              const ok = Vibe.pay(c.total, { title: `Vibe Поездки · ${tr.to}`, emoji: tr.e, col: tr.col, from: b });
              if (!ok) return;
              close();
              FX.confetti();
              const day = gToday() + DATES[dIdx][1];
              const trip = { id: tr.id, nights, people, to: tr.to, fromDay: day, toDay: day + nights };
              const se = Vibe.sched ? Vibe.sched.add({ kind: "travel", place: tr.dep, day, hour: 9, dur: 240, title: `${tr.how} → ${tr.to}`, e: tr.how, go: "travel", price: c.total, trip }) : null;
              Vibe.state.set({ life_trips: (st("life_trips", 0) || 0) + 1, lf_trip: Object.assign({ ev: se && se.id }, trip) });
              Vibe.emit && Vibe.emit("travel_book", trip);
              Vibe.modal(`
                <div class="m-emo float">🧳</div>
                <div class="display">${tr.grandpa ? "Дед уже топит баню!" : "Чемоданы собраны!"}</div>
                <p>${tr.to}, ${nights} ${plural(nights, "ночь", "ночи", "ночей")}, ${people} чел. Отправление ${whenStr(day, 9)} — ${esc(tr.depL)}. Уже в календаре. Приедешь на место — отпуск начнётся.</p>
                <div class="stack">${se ? mapsBtn(tr.dep, "Маршрут до отправления 🚇", "btn black block") : ""}<button class="btn block" data-close>Скорее бы 🌴</button></div>
                <div class="fine">Возврат средств возможен только эмоциональный.</div>`);
              T.to(() => { FX.burst({ x: innerWidth / 2, y: innerHeight / 2 - 80 }, { emojis: [tr.how, tr.e, "☀️", "🧳"], count: 20 }); Vibe.replace("travel"); }, 300);
            });
          },
        });
      }
      return () => T.clear();
    },
  });

  /* ============================================================
     6. VIBE LEARN
     ============================================================ */
  const COURSES = [
    { id: "prod", e: "🚀", short: "Продакт за 3 дня", t: "Стань продактом за 3 дня", by: "эксперт с 3 подписчиками", p: 24990, old: 89990, dur: "3 дня", col: "c-pink", les: ["Что такое продукт", "Говорим «синергия» уверенно", "Рисуем дорожную карту", "Увольняемся красиво"], badge: "Гарантия трудоустройства*" },
    { id: "cats", e: "🐈", short: "Нейросети для котов", t: "Нейросети для котов", by: "кот Барсик, PhD", p: 4990, old: 14990, dur: "2 недели", col: "c-mint", les: ["Мяу-промптинг", "Как уронить чашку с помощью ИИ", "Дообучение лежанки"], badge: "Хит 🔥" },
    { id: "fin", e: "💰", short: "Финграмотность", t: "Финграмотность: как не брать кредиты", by: "спонсор — Vibe Credit", p: 9990, old: 19990, dur: "1 месяц", col: "c-yellow", les: ["Бюджет", "Подушка безопасности", "Почему кредит — это нормально (интеграция)", "Как оформить рассрочку на этот курс"], badge: "Можно в кредит" },
    { id: "med", e: "🧘", short: "Медитация 30 сек", t: "Медитация за 30 секунд", by: "гуру из рилсов", p: 1990, old: 9990, dur: "30 секунд", col: "c-lilac", les: ["Дышим", "Не дышим", "Ищем дзен в уведомлениях", "Отпускаем (не дедлайны)"], badge: "Для занятых" },
    { id: "code", e: "💻", short: "Код без кода", t: "Пишем код без кода и без смысла", by: "сеньор-помидор", p: 14990, old: 59990, dur: "6 недель", col: "c-sky", les: ["Ctrl+C", "Ctrl+V", "Спрашиваем нейросеть", "Спрашиваем другую нейросеть", "Деплой в пятницу"], badge: "−75%" },
    { id: "blog", e: "📱", short: "Блогер-миллионник", t: "Как стать блогером-миллионником", by: "блогер с 1 000 000 (дэнег долга)", p: 19990, old: 49990, dur: "∞", col: "c-coral", les: ["Свет из окна", "Хук в первую секунду", "Покупаем подписчиков (не покупайте)"], badge: "Осталось 2 места" },
  ];
  const cById = (id) => COURSES.find((c) => c.id === id);
  const myCourses = () => st("life_courses", { cats: 1, med: 2 });
  const ringHtml = (c, done) => {
    const pct = Math.round((done / c.les.length) * 100);
    return `<button class="lf-cring tap ${pct < 100 ? "" : "c-lime"}" data-open="${c.id}"><div class="lf-ring" data-p="${pct}"><i class="${c.col}"><span class="emo float">${c.e}</span></i></div><b>${c.short}</b><small>${pct}%</small></button>`;
  };

  Vibe.screen("learn", {
    render() {
      const my = myCourses();
      return `
      ${Vibe.ui.head("Vibe Learn", "Знания с кэшбеком", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Учись. Расти. Плати.", text: "Курсы, после которых точно что-то будет", emo: "🎓", color: "c-lilac", sticker: "−80%*" })}
        <h2 class="sec">Мои курсы <small>тапни, чтобы учиться</small></h2>
        <div class="hscroll stagger" data-rings>${Object.keys(my).map((id) => ringHtml(cById(id), my[id])).join("")}</div>
        ${Vibe.ui.marquee(["Новая профессия за выходные", "Без воды*", "Диплом в рамочке", "Учись лёжа"])}
        <h2 class="sec">Каталог <small>${COURSES.length} курсов</small></h2>
        <div class="stack" data-cat>${COURSES.map(courseCard).join("")}</div>
        ${zab("Учиться никогда не поздно. А вот вернуть деньги за курс — уже через 14 дней поздно.", "smile")}
        <div class="fine">*Вода — это метафора. Гарантия трудоустройства действует при трудоустройстве. Сертификат государственного образца нашего государства Vibe.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const trialDone = new Set();
      const animRings = () => requestAnimationFrame(() => requestAnimationFrame(() => $$(root, ".lf-ring[data-p]").forEach((r) => r.style.setProperty("--lfp", r.dataset.p + "%"))));
      animRings();
      function rerender() {
        const my = myCourses();
        const r = $(root, "[data-rings]");
        r.innerHTML = Object.keys(my).map((id) => ringHtml(cById(id), my[id])).join("");
        restagger(r);
        animRings();
        $(root, "[data-cat]").innerHTML = COURSES.map(courseCard).join("");
      }
      root.addEventListener("click", (e) => {
        const o = e.target.closest("[data-open]");
        if (o) { FX.bump(o); openCourse(o.dataset.open); return; }
        const b = e.target.closest("[data-buy]");
        if (b) {
          const c = cById(b.dataset.buy);
          const ok = Vibe.pay(c.p, { title: `Vibe Learn · ${c.short}`, emoji: c.e, col: c.col, from: b });
          if (!ok) return;
          Vibe.state.set({ life_courses: Object.assign({}, myCourses(), { [c.id]: 0 }) });
          FX.confetti();
          rerender();
          T.to(() => FX.burst($(root, `[data-open="${c.id}"]`), { emojis: [c.e, "🎓", "✨"], count: 16 }), 300);
          FX.toast(`«${c.short}» в твоих курсах. Ты уже почти эксперт`, "🎓");
          return;
        }
        const tr = e.target.closest("[data-trial]");
        if (tr) {
          const id = tr.dataset.trial;
          if (trialDone.has(id)) { FX.shake(tr); FX.toast("Бесплатный урок бывает один раз. Как молодость", "⏳"); return; }
          trialDone.add(id);
          tr.textContent = "✓ Пройден";
          FX.burst(tr, { emojis: ["📚", "🧠", "✨"], count: 12 });
          Vibe.reward({ vibiki: 5, xp: 10, from: tr });
        }
      });

      // Урок — раз в несколько реальных минут: знания должны «улечься»
      const LESSON_CD = 3 * 60 * 1000;
      const cdLeft = (id) => Math.max(0, (st("life_lessonAt", {})[id] || 0) + LESSON_CD - Date.now());
      let openSheet = null;
      T.every(() => {
        if (!openSheet || !document.body.contains(openSheet.sh)) { openSheet = null; return; }
        const el = $(openSheet.sh, "[data-lcd]");
        if (!el) return;
        const left = cdLeft(openSheet.id);
        if (left > 0) { el.textContent = mmss(left / 1000); return; }
        $(openSheet.sh, "[data-les]").innerHTML = openSheet.lessons();
        FX.bump($(openSheet.sh, "[data-les]"));
      }, 1000);

      function openCourse(id) {
        const c = cById(id);
        const pts = COURSE_PTS[id] || 8;
        const lessons = () => {
          const done = myCourses()[id] || 0, left = cdLeft(id);
          return c.les.map((l, i) => `
            <div class="li">
              <div class="lf-chk ${i < done ? "done" : ""}">${i < done ? "✓" : i + 1}</div>
              <div class="tx"><b style="white-space:normal">${l}</b><small>${i < done ? "пройдено" : i === done ? (left ? "знания укладываются в голове…" : "доступно сейчас") : "🔒 после предыдущего"}</small></div>
              ${i === done ? (left ? `<span class="timer-pill">⏳ <span data-lcd>${mmss(left / 1000)}</span></span>` : `<button class="btn lime sm lf-glow" data-lesson="${i}">+20 XP</button>`) : ""}
            </div>`).join("");
        };
        Vibe.ui.sheet(`
          <div class="lf-row" style="justify-content:flex-start;gap:14px">
            <div class="lf-cpic ${c.col}"><span class="emo float">${c.e}</span></div>
            <div><div class="display" style="font-size:22px">${c.t}</div><div class="muted" style="font-size:12px;font-weight:700">${c.by}</div></div>
          </div>
          <div class="progress" style="margin:16px 0 4px"><i data-cbar style="--p:${Math.round(((myCourses()[id] || 0) / c.les.length) * 100)}%"></i></div>
          <div class="badge" style="background:var(--sky);margin-top:8px">📄 Пройдёшь курс — резюме в Vibe Job +${pts}%</div>${opensHtml(c)}
          <div class="card flat" style="padding:2px 14px;margin-top:10px" data-les>${lessons()}</div>
          <div class="fine">Новый урок открывается через 3 минуты после предыдущего. Каждый урок длится 4 минуты, из них 3 — реклама других курсов. Урок съедает 5% энергии: знания тяжёлые.</div>`, {
          onMount(sh, close) {
            openSheet = { sh, id, lessons };
            sh.addEventListener("click", (e) => {
              const b = e.target.closest("[data-lesson]");
              if (!b || cdLeft(id)) return;
              const bd = Vibe.body ? Vibe.body.get() : null;
              if (bd && bd.sleeping) { FX.shake(b); FX.toast("Ты спишь. Учиться во сне — это другой курс (платный)", "😴", 2800); return; }
              if (bd && bd.energy < 8) { FX.shake(b); FX.toast(`Энергия ${Math.round(bd.energy)}%. Мозг в режиме энергосбережения — поешь или поспи`, "🪫", 3000); return; }
              if (Vibe.body) Vibe.body.effect("study");
              const done = (myCourses()[id] || 0) + 1;
              Vibe.state.set({ life_courses: Object.assign({}, myCourses(), { [id]: done }), life_lessonAt: Object.assign({}, st("life_lessonAt", {}), { [id]: Date.now() }) });
              FX.burst(b, { emojis: ["📚", "🧠", "✨", "⭐"], count: 16 });
              FX.sound.success();
              Vibe.reward({ vibiki: 5, xp: 20, from: b });
              $(sh, "[data-les]").innerHTML = lessons();
              $(sh, "[data-cbar]").style.setProperty("--p", Math.round((done / c.les.length) * 100) + "%");
              rerender();
              if (done >= c.les.length) {
                T.to(() => {
                  close();
                  FX.confetti();
                  Vibe.modal(`
                    <div class="m-emo float">📜</div>
                    <div class="display">Сертификат!</div>
                    <p>Курс «${c.t}» пройден. Резюме в Vibe Job стало сильнее на <b style="color:var(--ink)">+${pts}%</b>.${opensTxt(c)} Повесь сертификат в рамочку — HR любят рамочки.</p>
                    <div class="stack"><button class="btn black block" data-close data-go="job">В Vibe Job 💼</button><button class="btn block" data-close>Я эксперт 😎</button></div>
                    <div class="fine">Сертификат государственного образца (образца нашего государства Vibe).</div>`, { sound: "levelup" });
                  Vibe.reward({ vibiki: 50, xp: 50 });
                }, 600);
              }
            });
          },
          onClose() { openSheet = null; },
        });
      }
      return () => T.clear();
    },
  });
  // Курс → карьера: какие вакансии открывает и что даёт сеньорам
  function opensHtml(c) {
    const vs = VAC.filter((v) => v.needCourse === c.id);
    const done = courseDone(c.id);
    const rows = vs.map((v) => `<span class="badge" style="background:${done ? "var(--lime)" : "#fff"}">${done ? "🔓" : "🔒"} ${v.e} ${v.title} · ${rub(salOf(v))}</span>`);
    rows.push(`<span class="badge" style="background:var(--yellow)">📈 +5% к окладу сеньор-вакансий</span>`);
    return `<div class="lf-pills" style="margin-top:8px">${rows.join("")}</div>`;
  }
  function opensTxt(c) {
    const vs = VAC.filter((v) => v.needCourse === c.id);
    return `${vs.length ? ` Открыта вакансия: ${vs.map((v) => `«${v.title}»`).join(", ")}.` : ""} Оклады сеньор-вакансий выросли на 5%.`;
  }
  function courseCard(c) {
    const own = myCourses()[c.id] !== undefined;
    return `
      <div class="card">
        <div class="lf-row" style="justify-content:flex-start;gap:12px;align-items:flex-start">
          <div class="lf-cpic ${c.col}"><span class="emo wobble">${c.e}</span></div>
          <div style="flex:1;min-width:0"><b style="font-size:15px;line-height:1.2;display:block">${c.t}</b><div class="muted" style="font-size:12px;font-weight:700;margin-top:2px">${c.by}</div></div>
        </div>
        <div class="lf-pills" style="margin-top:10px"><span class="badge" style="background:var(--yellow)">⭐ 4,9 (отзывы мамы)</span><span class="badge" style="background:var(--sky)">⏱ ${c.dur}</span><span class="badge">${c.badge}</span></div>
        ${opensHtml(c)}
        <div class="lf-row" style="margin-top:12px">
          <div><div class="price" style="font-size:20px">${rub(c.p)}</div><div class="old-price">${rub(c.old)}</div></div>
          <div style="display:flex;gap:6px">
            ${own ? `<button class="btn lime sm" data-open="${c.id}">Продолжить →</button>` : `<button class="btn sm" data-trial="${c.id}">Урок 0 ₫</button><button class="btn black sm" data-buy="${c.id}">Купить</button>`}
          </div>
        </div>
      </div>`;
  }

  /* ============================================================
     7. VIBE DRIVE
     ============================================================ */
  const CARS = [
    { id: "c1", e: "🚗", m: "Вайбо Рио X", cls: "Эконом", fuel: 64, ppm: 8.9, dist: "3 мин", col: "c-yellow", x: 30, y: 30 },
    { id: "c2", e: "🚙", m: "Кроссовер «Амбиции»", cls: "Комфорт", fuel: 22, ppm: 12.5, dist: "6 мин", col: "c-sky", x: 70, y: 28 },
    { id: "c3", e: "🏎️", m: "Турбо Понт GT", cls: "Бизнес", fuel: 88, ppm: 24.9, dist: "11 мин", col: "c-pink", x: 82, y: 72 },
    { id: "c4", e: "🚐", m: "Минивэн «Семейный»", cls: "Для переезда", fuel: 41, ppm: 15.9, dist: "8 мин", col: "c-lime", x: 18, y: 76 },
    { id: "c5", e: "🛻", m: "Пикап «Дачник»", cls: "Грузовой", fuel: 9, ppm: 18.9, dist: "14 мин", col: "c-orange", x: 58, y: 84 },
  ];
  const START_FEE = 300;
  const myCarHtml = () => { const cars = Vibe.inv ? Vibe.inv.list("car") : []; return cars.length ? `${cars[0].e || "🚗"} Своя: ${esc(cars[0].name)}` : "Купить свою машину →"; };

  Vibe.screen("drive", {
    render() {
      return `
      ${Vibe.ui.head("Vibe Drive", "Каршеринг на вайбе", Vibe.ui.vibikiPill())}
      <div class="stagger">
        <div class="lf-map">
          <div class="road" style="left:-10px;right:-10px;top:44%;height:22px"></div>
          <div class="road" style="top:-10px;bottom:-10px;left:40%;width:22px"></div>
          <div class="road" style="top:-10px;bottom:-10px;left:76%;width:16px;transform:rotate(14deg)"></div>
          ${CARS.map((c, i) => `<button class="pin emo float d${i % 3}" data-pin="${c.id}" style="left:${c.x}%;top:${c.y}%">${c.e}</button>`).join("")}
          <div class="me"></div>
          <span class="badge" style="position:absolute;left:10px;top:10px;background:#fff">📍 ${CARS.length} машин рядом</span>
        </div>
        <div data-panel style="margin-top:14px"></div>
        <div data-list class="stack stagger" style="margin-top:14px">${CARS.map((c) => `
          <div class="card" data-car="${c.id}">
            <div class="lf-car">
              <div class="ce ${c.col}"><span class="emo wobble">${c.e}</span></div>
              <div style="flex:1;min-width:0">
                <div class="lf-row"><b style="font-size:15px">${c.m}</b></div>
                <div class="lf-pills" style="margin-top:4px"><span class="badge" style="background:var(--lilac)">${c.cls}</span><span class="badge" style="background:#fff">🚶 ${c.dist}</span></div>
                <div class="progress lf-fuel"><i style="--p:${c.fuel}%;background:${c.fuel < 25 ? "var(--coral)" : "var(--lime)"}"></i></div>
                <div style="font-size:11px;font-weight:800;margin-top:3px">⛽ ${c.fuel}%${c.fuel < 25 ? " · заправь — получи 50 🪙" : ""}</div>
              </div>
            </div>
            <div class="lf-row" style="margin-top:12px">
              <div><div class="price" style="font-size:22px">${dec(c.ppm)} ₫<span style="font-family:var(--font);font-size:12px;font-weight:800">/мин</span></div><div class="fine" style="margin-top:0">+${START_FEE} ₫ за старт, +2 ₫/мин за грусть</div></div>
              <button class="btn black sm" data-reserve="${c.id}">Забронировать</button>
            </div>
          </div>`).join("")}</div>
        <div class="card c-sky tap" data-go="auto" style="margin-top:14px">
          <div class="lf-row"><div style="min-width:0"><div class="display" style="font-size:20px">${myCarHtml()}</div><div style="font-size:12px;font-weight:800;margin-top:4px">Vibe Auto · кредит одобрен заранее (тобой — нет)</div></div><span class="emo wobble" style="font-size:44px">🚙</span></div>
        </div>
        ${zab("Перед поездкой сфотографируй машину со всех сторон. Царапины, которых нет на фото, — твои.")}
        <div class="fine">Тариф «Время летит»: в приложении 1 секунда = 1 минута поездки. Мойка, бензин и чувство вины оплачиваются отдельно.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const panel = $(root, "[data-panel]"), list = $(root, "[data-list]");
      let mode = "list", car = null, tick = null, left = 1200, mins = 0;
      const stopTick = () => { if (tick) T.stop(tick); tick = null; };
      function cost() { return Math.round(START_FEE + mins * car.ppm); }
      function show(html) {
        panel.innerHTML = html;
        const k = panel.firstElementChild;
        if (k) k.style.animation = "pop-in .55s var(--spring) both";
      }
      function toList() {
        stopTick(); mode = "list"; car = null;
        panel.innerHTML = "";
        list.style.display = "";
      }
      function reserve(c, btn) {
        car = c; mode = "reserved"; left = 1200;
        list.style.display = "none";
        FX.burst(btn, { emojis: [c.e, "✨", "🔑"], count: 12 });
        FX.sound.success();
        show(`
          <div class="card ${c.col}" style="text-align:center">
            <div class="sticker" style="top:12px;left:12px">Забронировано</div>
            <div class="emo float" style="font-size:86px;margin-top:18px">${c.e}</div>
            <div class="display" style="font-size:24px;margin-top:4px">${c.m}</div>
            <div style="font-weight:800;font-size:13px;margin-top:2px">ждёт тебя в ${c.dist} · бесплатно ещё</div>
            <div class="big-num" style="font-size:56px;margin:8px 0" data-left>20:00</div>
            <div class="stack">
              <button class="btn black xl block" data-unlockstage>Открыть машину 🔓</button>
              <button class="btn block" data-cancel>Отменить</button>
            </div>
            <div class="fine" style="color:var(--ink);opacity:.7">После 20 минут ожидание платное: 3 ₫/мин и немного осуждения.</div>
          </div>`);
        tick = T.every(() => {
          left--;
          const el = $(panel, "[data-left]");
          if (!el) return;
          if (left <= 0) { el.textContent = "Платно 💸"; stopTick(); FX.shake(el); return; }
          el.textContent = mmss(left);
          if (left % 60 === 0) FX.bump(el);
        }, 1000);
      }
      function unlockStage() {
        stopTick(); mode = "unlock";
        show(`
          <div class="card c-black" style="text-align:center;padding:26px 16px">
            <div class="lf-mini" style="color:var(--lime)">Шаг 1 из 1</div>
            <button class="lf-lock emo pulse" data-unlock style="margin:16px 0">🔒</button>
            <div class="display" style="font-size:22px">Тапни по замку</div>
            <div style="font-size:13px;font-weight:700;opacity:.7;margin-top:6px">Машина слышит тебя через Bluetooth и сердце</div>
          </div>`);
      }
      function unlock(lock) {
        if (mode !== "unlock") return;
        mode = "opening";
        lock.textContent = "🔓";
        lock.classList.remove("pulse");
        FX.bump(lock);
        FX.burst(lock, { emojis: ["🔑", "✨", "💥", car.e], count: 22, spread: 170 });
        FX.sound.success();
        FX.haptic([20, 40, 60]);
        T.to(startRide, 1000);
      }
      function startRide() {
        mode = "ride"; mins = 0;
        show(`
          <div class="card c-black">
            <div class="lf-row"><span class="badge" style="background:var(--lime)">● В пути</span><span class="timer-pill" style="background:#fff;color:var(--ink)">⏱ <span data-rt>00:00</span></span></div>
            <div class="lf-lane"><span class="car">${car.e}</span></div>
            <div class="lf-row" style="align-items:flex-end">
              <div><div class="lf-mini" style="color:#aaa">К оплате</div><div class="big-num" style="font-size:44px;color:var(--lime)" data-cost>${rub(START_FEE)}</div></div>
              <div style="text-align:right;font-weight:800;font-size:13px"><div data-km>0,0 км</div><div style="opacity:.6">${dec(car.ppm)} ₫/мин</div></div>
            </div>
            <button class="btn lime xl block" data-finish style="margin-top:14px">Завершить поездку 🏁</button>
            <div class="fine" style="color:#aaa">Тариф «Время летит»: 1 сек = 1 мин. Поездка застрахована от всего, кроме вас.</div>
          </div>`);
        tick = T.every(() => {
          mins++;
          const c = $(panel, "[data-cost]");
          if (!c) return;
          c.textContent = rub(cost());
          $(panel, "[data-rt]").textContent = mmss(mins * 60);
          $(panel, "[data-km]").textContent = dec(mins * 0.7) + " км";
          FX.sound.tick();
          if (mins % 10 === 0) { FX.bump(c); FX.burst(c, { emojis: ["💸", "🪙"], count: 5, spread: 60 }); }
        }, 1000);
      }
      function finish(btn) {
        const total = cost();
        const ok = Vibe.pay(total, { title: `Vibe Drive · ${car.m}`, emoji: car.e, col: car.col, from: btn });
        if (!ok) return;
        const c = car, m = mins;
        // Каршеринг вместо метро — ноги отдыхают, энергия бережётся
        if (Vibe.body) Vibe.body.effect("taxi");
        toList();
        FX.confetti();
        Vibe.modal(`
          <div class="m-emo float">🏁</div>
          <div class="display">Приехали!</div>
          <div class="big-num" style="font-size:32px;margin-top:8px">${rub(total)}</div>
          <p>${c.m} · ${m} мин · ${dec(m * 0.7)} км. Спасибо, что выбрали Vibe Drive и не выбрали метро. Энергия сбережена ⚡</p>
          <div class="stack"><button class="btn black block" data-close>Огонь 🔥</button><button class="btn block" data-close data-go="auto">🚙 Купить свою машину</button></div>
          <div class="fine">Мойка, бензин и царапина на бампере (не ваша, но кто докажет) будут списаны позже.</div>`);
      }
      root.addEventListener("click", (e) => {
        const r = e.target.closest("[data-reserve]");
        if (r && mode === "list") { reserve(CARS.find((c) => c.id === r.dataset.reserve), r); return; }
        const pin = e.target.closest("[data-pin]");
        if (pin) {
          if (mode !== "list") { FX.toast("Одна машина за раз. Ты не олигарх (пока)", "🚗"); return; }
          const cardEl = $(root, `[data-car="${pin.dataset.pin}"]`);
          cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
          FX.burst(pin, { emojis: ["📍", "✨"], count: 6, spread: 60 });
          T.to(() => FX.bump(cardEl), 400);
          return;
        }
        if (e.target.closest("[data-cancel]")) { toList(); FX.sound.pop(); FX.toast("Бронь отменена. Штраф 0 ₫ (в этот раз)", "🙅"); return; }
        if (e.target.closest("[data-unlockstage]")) { FX.bump(e.target.closest("[data-unlockstage]")); unlockStage(); return; }
        const lk = e.target.closest("[data-unlock]");
        if (lk) { unlock(lk); return; }
        const f = e.target.closest("[data-finish]");
        if (f) finish(f);
      });
      return () => T.clear();
    },
  });

  /* ============================================================
     8. VIBE CLEAN
     ============================================================ */
  const EXTRAS = [
    { id: "win", e: "🪟", t: "Окна", p: 1490 },
    { id: "fridge", e: "🧊", t: "Холодильник внутри", p: 890, sub: "включая то, что там живёт" },
    { id: "oven", e: "🔥", t: "Духовка", p: 990 },
    { id: "iron", e: "👕", t: "Глажка", p: 790 },
    { id: "talk", e: "🗣️", t: "Поговорить о жизни", p: 990, sub: "45 минут, без советов" },
    { id: "cat", e: "🐈", t: "Погладить кота", p: 290 },
    { id: "touch", e: "🙅", t: "Не трогать мои вещи", p: 1990, sub: "премиум-опция" },
  ];
  const CLEAN_DATES = ["Сегодня", "Завтра", "Сб, 19", "Вс, 20", "Пн, 21", "Когда-нибудь"];

  Vibe.screen("clean", {
    render() {
      return `
      ${Vibe.ui.head("Vibe Clean", "Чисто по-вайбовски", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Уберём всё, кроме долгов", text: "Клинер приедет в окно с 9:00 до 21:00", emo: "🧽", color: "c-mint", sticker: "✨ −20%" })}
        <div class="card" style="margin-top:14px">
          <div class="li"><div class="ic c-yellow">🛋️</div><div class="tx"><b>Комнаты</b><small>+900 ₫ за каждую</small></div>
            <div class="stepper"><button data-st="rooms" data-d="-1">−</button><span data-v="rooms">2</span><button data-st="rooms" data-d="1">+</button></div></div>
          <div class="li"><div class="ic c-sky">🛁</div><div class="tx"><b>Санузлы</b><small>+700 ₫ за каждый</small></div>
            <div class="stepper"><button data-st="baths" data-d="-1">−</button><span data-v="baths">1</span><button data-st="baths" data-d="1">+</button></div></div>
        </div>
        <h2 class="sec">Дополнительно</h2>
        <div class="card" style="padding:4px 16px">${EXTRAS.map((x) => `
          <div class="li"><div class="ic ${x.id === "talk" ? "c-pink" : "c-lilac"}">${x.e}</div><div class="tx"><b>${x.t}</b><small>+${rub(x.p)}${x.sub ? " · " + x.sub : ""}</small></div><button class="switch" data-x="${x.id}" aria-label="${x.t}"></button></div>`).join("")}</div>
        <h2 class="sec">Когда?</h2>
        <div class="chips">${CLEAN_DATES.map((d, i) => `<button class="chip ${i === 1 ? "on" : ""}" data-day="${d}">${d}</button>`).join("")}</div>
        <div class="card c-yellow" style="margin-top:12px">
          <div class="lf-row" style="justify-content:flex-start;gap:12px">
            <div class="lf-cpic c-white" style="width:54px;height:54px;font-size:30px"><span class="emo wobble">👩‍🦰</span></div>
            <div><b>Клинер Галина</b><div style="font-size:12px;font-weight:700">⭐ 4,98 (сама себе поставила) · 1 240 уборок</div></div>
          </div>
        </div>
        <div class="card c-black" style="margin-top:14px">
          <div class="lf-row"><div><div class="lf-mini" style="color:#aaa">Итого</div><div class="big-num" style="font-size:40px;color:var(--lime)" data-total data-val="${cleanBase(2, 1)}">${rub(cleanBase(2, 1))}</div></div><span class="emo float" style="font-size:52px">🫧</span></div>
          <div style="font-size:12px;font-weight:700;opacity:.7;margin-top:4px" data-dur>≈ 3 часа · 1 клинер</div>
          <button class="btn lime xl block" data-order style="margin-top:14px">Заказать уборку ✨</button>
        </div>
        ${zab("Перед приходом клинера все обычно убираются. Это нормально, мы тоже так делаем.", "smile")}
        <div class="fine">Стоимость окончательная*. *Может измениться на месте в зависимости от степени «ну там немного пыльно».</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const v = { rooms: 2, baths: 1 }, on = new Set();
      let day = "Завтра";
      const total = () => cleanBase(v.rooms, v.baths) + [...on].reduce((s, id) => s + EXTRAS.find((x) => x.id === id).p, 0);
      const totalEl = $(root, "[data-total]");
      function upd() {
        FX.countTo(totalEl, total(), { fmt: Vibe.rub, dur: 600 });
        FX.bump(totalEl);
        const h = 1 + v.rooms + v.baths * 0.5 + on.size * 0.5;
        $(root, "[data-dur]").textContent = `≈ ${dec(h, h % 1 ? 1 : 0)} ч · ${h > 5 ? "2 клинера" : "1 клинер"}`;
      }
      root.addEventListener("click", (e) => {
        const s = e.target.closest("[data-st]");
        if (s) {
          const k = s.dataset.st, max = k === "rooms" ? 6 : 4, nv = v[k] + +s.dataset.d;
          if (nv < 1 || nv > max) { FX.shake(s.parentElement); FX.toast(nv < 1 ? "Меньше нельзя. Ты же где-то живёшь" : "Больше не влезет в смену", "🧹"); return; }
          v[k] = nv;
          const n = $(root, `[data-v=${k}]`); n.textContent = nv; FX.bump(n);
          FX.sound.add();
          FX.burst(s, { emojis: ["🫧", "✨"], count: 5, spread: 50 });
          upd();
          return;
        }
        const sw = e.target.closest("[data-x]");
        if (sw) {
          const id = sw.dataset.x;
          on.has(id) ? on.delete(id) : on.add(id);
          sw.classList.toggle("on", on.has(id));
          if (on.has(id)) {
            FX.sound.add();
            FX.burst(sw, { emojis: ["✨", "🧽", "🫧"], count: 8, spread: 70 });
            if (id === "talk") FX.toast("Галина уже готовит истории про внуков", "👵");
            if (id === "touch") FX.toast("Это самая дорогая опция. И самая невыполнимая", "🙅");
          } else FX.sound.pop();
          upd();
          return;
        }
        const d = e.target.closest("[data-day]");
        if (d) {
          day = d.dataset.day;
          $$(root, "[data-day]").forEach((x) => x.classList.toggle("on", x === d));
          FX.bump(d);
          if (day === "Когда-нибудь") FX.toast("Отличный выбор. Мы тоже так убираемся", "🫠");
          return;
        }
        const o = e.target.closest("[data-order]");
        if (o) {
          const sum = total();
          const ok = Vibe.pay(sum, { title: "Vibe Clean · уборка", emoji: "🧽", col: "c-mint", from: o });
          if (!ok) return;
          // Искры по всему экрану
          for (let i = 0; i < 9; i++) {
            T.to(() => {
              FX.burst({ x: FX.rand(30, innerWidth - 30), y: FX.rand(80, innerHeight - 120) }, { emojis: ["✨", "🧽", "🫧", "🧼"], count: 10, spread: 110 });
              if (i % 3 === 0) FX.sound.pop();
            }, i * 110);
          }
          T.to(() => {
            FX.confetti();
            Vibe.modal(`
              <div class="m-emo float">🧹</div>
              <div class="display">Галина уже едет!</div>
              <p>${day}, ${v.rooms} комн. + ${v.baths} санузел${on.size ? ` + ${on.size} доп.` : ""}. Будет так чисто, что стыдно будет мусорить.</p>
              <button class="btn black block" data-close>Скорей бы ✨</button>
              <div class="fine">Ожидаемое время прибытия: с 9:00 до 21:00 любого дня. Галина может позвонить с неизвестного номера, ответь.</div>`);
          }, 1000);
        }
      });
      return () => T.clear();
    },
  });
  function cleanBase(rooms, baths) { return 1990 + rooms * 900 + baths * 700; }

  /* ============================================================
     9. VIBE TICKETS
     ============================================================ */
  const EVENTS = [
    { id: "e1", e: "🎪", t: "Вайб-Фест 2026", who: "40 артистов, 3 сцены, 1 туалет", d: "14", mo: "нояб", place: "Поле за городом", p: 6990, cat: "Фестивали", col: "c-holo", left: true },
    { id: "e2", e: "🎤", t: "Группа «Бетонные чувства»", who: "тур «Последний раз (снова)»", d: "21", mo: "окт", place: "Арена «Гигант»", p: 3490, cat: "Концерты", col: "c-pink", left: true },
    { id: "e3", e: "😂", t: "Стендап «Шутки про ипотеку»", who: "смеёмся, чтобы не плакать", d: "25", mo: "окт", place: "Бар «Подвал»", p: 1490, cat: "Стендап", col: "c-yellow" },
    { id: "e4", e: "🎭", t: "«Гамлет» в иммерсивном формате", who: "быть или не быть — решает зал", d: "2", mo: "нояб", place: "Театр на крыше", p: 2990, cat: "Театр", col: "c-lilac", left: true },
    { id: "e5", e: "🎧", t: "Рейв в бывшей бане", who: "техно до 6 утра, вход по фейсконтролю", d: "8", mo: "нояб", place: "Баня №3", p: 1990, cat: "Концерты", col: "c-lime" },
    { id: "e6", e: "⚽", t: "Дерби «Вайб» — «Кринж»", who: "битва за 7 место", d: "30", mo: "окт", place: "Стадион «Олимп»", p: 990, cat: "Спорт", col: "c-sky", left: true },
    { id: "e7", e: "🎻", t: "Оркестр играет мемы", who: "классика, которую вы узнаете", d: "12", mo: "дек", place: "Филармония", p: 2490, cat: "Концерты", col: "c-orange" },
  ];
  const SECTORS = [
    { n: "Танцпол", k: 1, sub: "видно спины" },
    { n: "Фан-зона", k: 1.6, sub: "видно спины поближе" },
    { n: "VIP", k: 4.3, sub: "бокал воды включён" },
    { n: "Место за колонной −10%", k: 0.9, sub: "зато слышно отлично" },
    { n: "Балкон", k: 0.7, sub: "видно только звук" },
  ];
  const CATS = ["Все", "Концерты", "Стендап", "Театр", "Спорт", "Фестивали"];
  // Афиша живёт по игровому календарю: даты считаются от «сегодня»
  const EV_OFF = { e1: 9, e2: 1, e3: 2, e4: 4, e5: 3, e6: 5, e7: 7 };
  EVENTS.forEach((ev) => Object.defineProperties(ev, {
    day: { get: () => gToday() + (EV_OFF[ev.id] || 3), configurable: true },
    d: { get: () => String(domOf(ev.day)), configurable: true },
    mo: { get: () => MON_S[monOf(ev.day)], configurable: true },
  }));
  // Статус билета по событию в расписании: planned / done / missed
  const tkState = (t) => { const e = t && t.sid ? evById(t.sid) : null; return e ? e.status : t && t.sid ? "missed" : "old"; };
  const TK_LBL = { planned: ["🚇 едем", "var(--lime)"], done: ["✅ был", "var(--sky)"], missed: ["🔥 сгорел", "var(--coral)"], old: ["🎟️ архив", "#fff"] };
  function nextConcertHtml(ts) {
    const up = ts.map((t) => ({ t, e: t.sid ? evById(t.sid) : null })).filter((x) => x.e && x.e.status === "planned").sort((a, b) => Vibe.sched.startMin(a.e) - Vibe.sched.startMin(b.e))[0];
    if (!up) return "";
    const live = Vibe.sched.active("club").some((x) => x.id === up.e.id);
    return `<div class="card ${live ? "c-lime lf-glow" : "c-yellow"}" style="margin-top:10px">
      <div class="lf-row"><div style="min-width:0"><div class="lf-mini" style="color:var(--ink)">${live ? "🔴 Уже пускают!" : "🎶 Ближайший концерт"}</div><b style="display:block;font-size:15px;margin-top:2px">${up.t.e} ${Vibe.esc(up.t.t)}</b><div style="font-size:12px;font-weight:800">${whenStr(up.e.day, up.e.hour)} · 🎤 Клуб · ×${up.t.qty}</div></div><span class="emo float" style="font-size:40px">🎟️</span></div>
      <div style="margin-top:10px">${mapsBtn("club", "Доехать на концерт 🚇", "btn black block")}</div>
      <div class="fine" style="color:var(--ink);opacity:.7;margin-top:6px">Не приедешь к 21:00 — билет сгорит вместе с сервисным сбором.</div>
    </div>`;
  }
  const myTicketsHtml = (ts) => ts.length ? `
    <h2 class="sec">Мои билеты <small>${ts.length}</small></h2>
    ${nextConcertHtml(ts)}
    <div class="hscroll stagger" style="margin-top:10px">${ts.map((t, i) => { const L = TK_LBL[tkState(t)]; return `
      <button class="lf-mt tap" data-myt="${i}" style="${tkState(t) === "missed" ? "opacity:.6" : ""}">
        <div class="a ${t.col === "c-holo" ? "c-holo" : t.col}"><b>${Vibe.esc(t.t)}</b><small style="color:inherit;opacity:.8">${t.d} ${t.mo} · ${Vibe.esc(t.sector)}</small><span class="badge" style="background:${L[1]};margin-top:4px;font-size:10px;padding:2px 6px">${L[0]}</span></div>
        <div class="q">🎟️</div>
      </button>`; }).join("")}</div>` : "";
  const evRow = (ev) => `
    <div class="card tap tight" data-ev="${ev.id}">
      <div class="lf-row" style="justify-content:flex-start;gap:12px">
        <div class="lf-date ${ev.col}"><b>${ev.d}</b><small>${ev.mo}</small></div>
        <div style="flex:1;min-width:0"><b style="font-size:14px;display:block;line-height:1.2">${ev.e} ${ev.t}</b><div class="muted" style="font-size:12px;font-weight:700;margin-top:2px">${ev.place}</div>
          <div class="lf-row" style="margin-top:6px;justify-content:flex-start;gap:8px"><span class="price" style="font-size:15px">от ${rub(ev.p)}</span>${ev.left ? `<span class="badge" style="background:var(--pink)">Осталось 2 билета</span>` : ""}</div></div>
      </div>
    </div>`;

  Vibe.screen("tickets", {
    render() {
      const f = EVENTS[0];
      return `
      ${Vibe.ui.head("Vibe Tickets", "Афиша · концерты и движ", Vibe.ui.vibikiPill())}
      <div class="stagger">
        <div data-my>${myTicketsHtml(st("life_tickets", []))}</div>
        <div class="card c-holo tap" data-ev="${f.id}" style="min-height:230px;border-radius:32px;margin-top:6px">
          <div class="sticker" style="top:16px;right:14px;background:var(--pink)">Осталось 2 билета</div>
          <div class="emo float" style="font-size:96px;margin-top:20px">${f.e}</div>
          <div class="display" style="font-size:34px;margin-top:8px">${f.t}</div>
          <div style="font-weight:800;font-size:13px;margin-top:4px">${f.d} ${f.mo} · ${f.place} · ${f.who}</div>
          <div class="lf-row" style="margin-top:12px"><span class="big-num" style="font-size:26px">от ${rub(f.p)}</span><span class="btn black sm">Купить →</span></div>
        </div>
        ${Vibe.ui.marquee(["Sold out почти везде", "Осталось 2 билета", "Танцпол без давки*", "Фан-зона для фанатов фан-зон"])}
        <div class="chips">${CATS.map((c, i) => `<button class="chip ${i ? "" : "on"}" data-cat="${c}">${c}</button>`).join("")}</div>
        <div class="stack stagger" data-evs style="margin-top:6px">${EVENTS.slice(1).map(evRow).join("")}</div>
        ${zab("«Осталось 2 билета» висит с прошлого года. Это не баг, это классика жанра.")}
        <div class="fine">*Без давки на танцполе гарантируется только до открытия дверей. Сервисный сбор не возвращается даже при отмене концерта, вселенной и вас.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      root.addEventListener("click", (e) => {
        const c = e.target.closest("[data-cat]");
        if (c) {
          $$(root, "[data-cat]").forEach((x) => x.classList.toggle("on", x === c));
          FX.bump(c);
          FX.sound.pop();
          const cat = c.dataset.cat;
          const arr = EVENTS.slice(1).filter((ev) => cat === "Все" || ev.cat === cat);
          const box = $(root, "[data-evs]");
          box.innerHTML = arr.length ? arr.map(evRow).join("") : `<div class="card c-lilac" style="text-align:center"><div class="emo float" style="font-size:52px">🎟️</div><b>Всё раскупили</b><div style="font-size:13px;font-weight:700">Перекупщики передают привет</div></div>`;
          restagger(box);
          return;
        }
        const ev = e.target.closest("[data-ev]");
        if (ev) { FX.bump(ev); buy(EVENTS.find((x) => x.id === ev.dataset.ev)); return; }
        const my = e.target.closest("[data-myt]");
        if (my) showTicket(st("life_tickets", [])[+my.dataset.myt]);
      });

      function buy(ev) {
        let sec = 0, qty = 1;
        const calc = () => { const sub = Math.round(ev.p * SECTORS[sec].k) * qty; const fee = Math.round(sub * 0.28); return { sub, fee, qr: 149, total: sub + fee + 149 }; };
        const c0 = calc();
        Vibe.ui.sheet(`
          <div class="lf-row" style="justify-content:flex-start;gap:12px">
            <div class="lf-date ${ev.col}"><b>${ev.d}</b><small>${ev.mo}</small></div>
            <div><div class="display" style="font-size:22px">${ev.e} ${ev.t}</div><div class="muted" style="font-size:12px;font-weight:700">${ev.place} · ${ev.who}</div></div>
          </div>
          <div class="lf-mini" style="margin:16px 0 8px">Сектор</div>
          <div class="lf-sector">${SECTORS.map((s, i) => `<button class="${i ? "" : "on"}" data-sec="${i}"><span>${s.n}<small>${s.sub}</small></span><span class="price" style="font-size:15px">${rub(Math.round(ev.p * s.k))}</span></button>`).join("")}</div>
          <div class="lf-row" style="margin-top:14px"><div><div class="lf-mini">Билетов</div><div style="font-size:12px;font-weight:700">максимум 4 в одни руки</div></div>
            <div class="stepper"><button data-q="-1">−</button><span data-qn>1</span><button data-q="1">+</button></div></div>
          <div style="margin-top:12px">
            <div class="lf-fee"><span>Билеты</span><span data-sub>${rub(c0.sub)}</span></div>
            <div class="lf-fee"><span>Сервисный сбор 28%</span><span data-fee>${rub(c0.fee)}</span></div>
            <div class="lf-fee"><span>Сбор за QR-код</span><span>${rub(149)}</span></div>
            <div class="lf-total"><span class="display" style="font-size:18px">Итого</span><span class="big-num" data-tot data-val="${c0.total}">${rub(c0.total)}</span></div>
          </div>
          <button class="btn grad xl block" data-pay>Купить билеты 🎟️</button>
          <div class="fine">Билеты именные. Имя можно любое, проверять всё равно будут охранники с фонариком.</div>`, {
          onMount(sh, close) {
            const upd = () => {
              const c = calc();
              $(sh, "[data-sub]").textContent = rub(c.sub);
              $(sh, "[data-fee]").textContent = rub(c.fee);
              FX.countTo($(sh, "[data-tot]"), c.total, { fmt: Vibe.rub, dur: 500 });
              FX.bump($(sh, "[data-tot]"));
            };
            sh.addEventListener("click", (e) => {
              const s = e.target.closest("[data-sec]");
              if (s) {
                sec = +s.dataset.sec;
                $$(sh, "[data-sec]").forEach((x) => x.classList.toggle("on", x === s));
                FX.sound.add();
                if (sec === 2) FX.burst(s, { emojis: ["💎", "🥂", "✨"], count: 10, spread: 80 });
                if (sec === 3) FX.toast("Экономия 10%! Колонна в подарок", "🏛️");
                if (sec === 4) FX.toast("Отличная акустика. Остальное — воображение", "🔭");
                upd();
                return;
              }
              const q = e.target.closest("[data-q]");
              if (q) {
                const nq = qty + +q.dataset.q;
                if (nq < 1 || nq > 4) { FX.shake(q.parentElement); return; }
                qty = nq;
                const n = $(sh, "[data-qn]"); n.textContent = qty; FX.bump(n);
                FX.sound.add();
                upd();
                return;
              }
              const p = e.target.closest("[data-pay]");
              if (p) {
                const c = calc();
                const ok = Vibe.pay(c.total, { title: `Vibe Tickets · ${ev.t}`, emoji: ev.e, col: ev.col === "c-holo" ? "c-pink" : ev.col, from: p });
                if (!ok) return;
                // Концерт — событие в календаре: доехать до клуба к 20:00, иначе билет сгорит
                const day = ev.day;
                const se = Vibe.sched ? Vibe.sched.add({ kind: "concert", place: "club", day, hour: 20, dur: 180, title: ev.t, e: ev.e, go: "tickets", price: c.total }) : null;
                const t = { e: ev.e, t: ev.t, d: ev.d, mo: ev.mo, day, sid: se ? se.id : null, place: ev.place, sector: SECTORS[sec].n, qty, col: ev.col, code: rnd(100000, 999999) };
                Vibe.state.set({ life_tickets: [t, ...st("life_tickets", [])].slice(0, 12) });
                const my = $(root, "[data-my]");
                my.innerHTML = myTicketsHtml(st("life_tickets", []));
                restagger($(my, ".hscroll"));
                close();
                T.to(() => tornTicket(t), 250);
              }
            });
          },
        });
      }

      function tornTicket(t) {
        Vibe.modal(`
          <div class="lf-ticket" data-tk>
            <div class="h l"><div style="font-size:40px;line-height:1">${t.e}</div><div><b style="font-size:15px;line-height:1.15;display:block">${Vibe.esc(t.t)}</b><span style="font-size:11px;font-weight:800">${t.d} ${t.mo} · ${Vibe.esc(t.sector)} · ×${t.qty}</span></div></div>
            <div class="h r"><div><div style="font-size:28px">🎟️</div>ВХОД<br>№${t.code}</div></div>
          </div>
          <div class="display">Билеты твои!</div>
          <p>Корешок оторван — назад дороги нет. Концерт ${t.day != null ? whenStr(t.day, 20) : ""} в клубе — уже в календаре. Не приедешь — билет сгорит.</p>
          <div class="stack">${t.sid ? mapsBtn("club", "Доехать на концерт 🚇", "btn black block") : ""}<button class="btn block" data-close>Иду тусить 🕺</button></div>`, {
          onMount(m) {
            T.to(() => {
              const tk = $(m, "[data-tk]");
              if (!tk) return;
              tk.classList.add("torn");
              FX.sound.swipe();
              FX.haptic([10, 20, 30]);
              FX.burst($(tk, ".h.r"), { emojis: ["🎉", "✨", "🎶", "🎟️"], count: 18 });
              FX.confetti();
            }, 700);
          },
        });
      }

      function showTicket(t) {
        if (!t) return;
        let seed = t.code;
        const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
        const cells = Array.from({ length: 81 }, (_, i) => {
          const x = i % 9, y = Math.floor(i / 9);
          const corner = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
          const on = r() > 0.5;
          return `<i class="${corner || on ? "" : "o"}"></i>`;
        }).join("");
        Vibe.modal(`
          <div class="display" style="font-size:24px">${t.e} ${Vibe.esc(t.t)}</div>
          <p style="margin:6px 0 4px">${t.d} ${t.mo} · ${Vibe.esc(t.place || "")} · ${Vibe.esc(t.sector)} · ×${t.qty}</p>
          <div class="lf-qr">${cells}</div>
          <div class="badge" style="background:${TK_LBL[tkState(t)][1]}">№${t.code} · ${TK_LBL[tkState(t)][0]}</div>
          ${tkState(t) === "planned" ? `<div style="margin-top:14px">${mapsBtn("club", "Доехать на концерт 🚇", "btn black block")}</div>` : tkState(t) === "missed" ? `<p style="margin:10px 0 0">Ты не доехал. Билет сгорел, сервисный сбор — тоже. Охранник грустит.</p>` : ""}
          <button class="btn ${tkState(t) === "planned" ? "" : "black "}block" data-close style="margin-top:10px">Готово</button>
          <div class="fine">Сделай яркость экрана на максимум. Охранник всё равно попросит распечатку.</div>`, { sound: "pop" });
      }
      return () => T.clear();
    },
  });
})();
