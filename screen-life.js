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

  // Заботик с репликой
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
      queue = o.items();
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
     1. VIBE JOB
     ============================================================ */
  const JOBS = [
    { co: "ООО «Синергия Плюс»", e: "🚀", title: "Junior-разработчик", sal: "от 250 000 ₽", perks: ["🍪 Печеньки", "🩺 ДМС*", "⏰ Гибкий график"], req: ["Опыт 5 лет в технологии, которой 2 года", "Готовность к вызовам (в 23:00)"], col: "c-yellow" },
    { co: "Вайб-Логистик", e: "📦", title: "Менеджер по всему", sal: "до 180 000 ₽", perks: ["🤝 Дружный коллектив", "🍎 Фрукты по пятницам"], req: ["Дружный коллектив = переработки", "Стрессоустойчивость уровня «бог»"], col: "c-lime" },
    { co: "Стартап «Нейрочайник»", e: "🫖", title: "Head of Everything", sal: "0,0001% доли", perks: ["📈 Опцион", "🛋️ Пуфики", "✨ Миссия"], req: ["Работа за идею (идея наша)", "Знание 12 языков программирования"], col: "c-pink" },
    { co: "Банк «Вайб Капитал»", e: "🏦", title: "Аналитик данных", sal: "от 320 000 ₽*", perks: ["🏠 Удалёнка (в офисе)", "🏋️ Спортзал"], req: ["Высшее образование, лучше три", "Возраст до 25, опыт от 10 лет"], col: "c-sky" },
    { co: "Кофейня «Пенка»", e: "☕", title: "Бариста-сторителлер", sal: "45 000 ₽ + чай", perks: ["☕ Кофе бесплатно (1 шт.)", "🧑‍🤝‍🧑 Молодая команда"], req: ["Рисовать лебедя на капучино", "Улыбаться 12 часов подряд"], col: "c-orange" },
    { co: "Агентство «Креатив»", e: "🎨", title: "SMM-специалист", sal: "от 90 000 ₽", perks: ["🎨 Креативный офис", "😂 Мемы"], req: ["Тестовое: 3 рекламные кампании бесплатно", "Рилсы, сайты, логотипы и сварка"], col: "c-lilac" },
    { co: "Маркетплейс «Всё»", e: "🛒", title: "Продакт-менеджер", sal: "от 400 000 ₽", perks: ["🎤 Митапы", "💈 Барбершоп", "📊 KPI"], req: ["Быть на созвонах 9 часов в день", "Любить таск-трекер как семью"], col: "c-mint" },
    { co: "ИП Гвоздев", e: "🔨", title: "Директор (единственный сотрудник)", sal: "по договорённости", perks: ["🪜 Карьерный рост", "🕊️ Свобода"], req: ["Свой ноутбук, своя машина, своя зарплата", "Нацеленность на результат"], col: "c-coral" },
  ];
  const JOB_LIKE = ["Отклик ушёл! HR уже открыл… вкладку с мемами.", "Резюме прочитано за 4 секунды. Это рекорд!", "Ты в шорт-листе из 3 400 человек 🔥", "Мы отправили твоё резюме. И твой номер. И твои лайки."];
  const JOB_NOPE = ["Правильно. Там «семья», а у тебя уже есть одна.", "Скипнул. Они не узнают. Наверное.", "Заботик тоже не любит слово «многозадачность».", "Минус одна вакансия мечты. Их ещё 14 000."];

  Vibe.screen("job", {
    render() {
      const applied = st("life_jobApplied", 0), res = st("life_jobResume", 64);
      return `
      ${Vibe.ui.head("Vibe Job", "Работа мечты · в моменте", Vibe.ui.vibikiPill())}
      <div class="stagger">
        <div class="card c-blue tap" style="padding:14px 16px">
          <div class="lf-row"><b style="font-size:14px">Резюме прокачано на <span data-res>${res}</span>%</b><span class="emo wobble" style="font-size:26px">📄</span></div>
          <div class="progress" style="margin-top:10px"><i data-resbar style="--p:${res}%"></i></div>
          <div class="fine" style="color:rgba(255,255,255,.75)">Свайпай вакансии, чтобы прокачать. 100% недоступно никому, кроме сына директора.</div>
        </div>
        <div class="lf-row" style="margin-top:12px;gap:10px">
          <div class="card tight c-yellow" style="flex:1"><div class="lf-mini">Мои отклики</div><div class="big-num" style="font-size:32px" data-applied data-val="${applied}">${fmt(applied)}</div></div>
          <div class="card tight c-pink" style="flex:1"><div class="lf-mini">Ответили</div><div class="big-num" style="font-size:32px">0</div><div class="fine" style="margin-top:2px">Но смотрели! (бот)</div></div>
        </div>
        ${deckHtml(`<div style="font-size:64px" class="emo float">🫠</div><div class="display" style="font-size:22px">Вакансии кончились</div><div class="muted" style="font-size:13px">HR-ы пошли на обед. До пятницы.</div>`)}
        ${actionsHtml({ sup: "📨" })}
        <div class="fine" style="text-align:center">✕ — мимо · 📨 — супер-отклик с сопроводительным · ♥ — откликнуться</div>
        ${zab("Свайпай вправо всё подряд. Так делают все, и мы называем это «рынок кандидата».")}
        ${Vibe.ui.marquee(["Работа мечты", "Без опыта*", "Удалёнка (в офисе)", "Белая зарплата (частично)", "Молодой коллектив (как ты)"])}
        <h2 class="sec">Навыки в тренде <small>by Vibe Learn</small></h2>
        <div class="chips">${["🤖 Промпт-инжиниринг", "🧘 Не выгорать", "📊 Делать вид в Excel", "🎤 Говорить «давайте созвонимся»", "🫡 Принимать фидбек"].map((t) => `<button class="chip" data-act="skill">${t}</button>`).join("")}</div>
        <div class="fine">*Vibe Job не гарантирует трудоустройство, ответ, обратную связь, зарплату и смысл. Вакансии собраны автоматически из лучших побуждений.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const appliedEl = $(root, "[data-applied]");
      swipeDeck(root, {
        bag: T,
        yes: "ОТКЛИК!",
        no: "МИМО",
        sup: "С СОПРОВОДОМ 📨",
        items: () => shuffle(JOBS),
        card: (j) => `
          <div class="lf-cardin">
            <div class="lf-bigemo emo float">${j.e}</div>
            <div><span class="badge" style="background:#fff">${j.co}</span></div>
            <div class="grow"></div>
            <div class="display" style="font-size:28px;max-width:88%">${j.title}</div>
            <div class="big-num" style="font-size:32px">${j.sal}</div>
            <div class="lf-pills">${j.perks.map((p) => `<span class="badge">${p}</span>`).join("")}</div>
            <div class="lf-note">${j.req.map((r) => `<div>⚠️ ${r}</div>`).join("")}</div>
          </div>`,
        onSwipe(j, dir, el) {
          if (dir === "nope") { say(root, pick(JOB_NOPE)); return; }
          const n = st("life_jobApplied", 0) + 1;
          let res = st("life_jobResume", 64);
          const wasMax = res >= 99;
          res = Math.min(99, res + (dir === "super" ? 5 : rnd(1, 3)));
          Vibe.state.set({ life_jobApplied: n, life_jobResume: res });
          FX.countTo(appliedEl, n);
          FX.bump(appliedEl.parentElement);
          $(root, "[data-res]").textContent = res;
          $(root, "[data-resbar]").style.setProperty("--p", res + "%");
          if (res >= 99 && !wasMax) FX.toast("99%! Остался 1%: фото в костюме на фоне Альп", "📸");
          FX.sound.like();
          FX.burst(el, { emojis: ["✅", "💼", "📄", "✨"], count: 12 });
          Vibe.reward({ xp: 4 });
          if (n % 5 === 0) Vibe.reward({ vibiki: 15, xp: 10, from: appliedEl });
          say(root, pick(JOB_LIKE));
          if (dir === "super" || Math.random() < 0.35) T.to(() => jobMatch(j), 480);
        },
      });
      function jobMatch(j) {
        FX.confetti();
        Vibe.modal(`
          <div class="lf-collide"><div class="lf-av a c-lime">😎</div><div class="hrt">🤝</div><div class="lf-av b ${j.col}">${j.e}</div></div>
          <div class="display">Мэтч!</div>
          <p>${j.co} посмотрели твоё резюме и поставили ему лайк. Работодатель ответит в течение 0–∞ рабочих дней.</p>
          <div class="stack">
            <button class="btn black block xl" data-wait>Ждать ответа ⏳</button>
            <button class="btn block" data-close>Свайпать дальше</button>
          </div>
          <div class="fine">Лайк от работодателя не является офертой, обещанием, надеждой и поводом рассказать маме.</div>`, {
          onMount(m, close) {
            T.to(() => FX.burst($(m, ".hrt"), { emojis: ["💼", "🤝", "✨", "💸"], count: 16 }), 650);
            $(m, "[data-wait]").addEventListener("click", (e) => {
              Vibe.reward({ vibiki: 10, xp: 15, from: e.currentTarget });
              close();
              FX.toast("Ожидание засчитано в стаж. Шутка. Не засчитано.", "⏳");
            });
          },
        });
      }
      root.addEventListener("click", (e) => {
        const s = e.target.closest("[data-act=skill]");
        if (s) { s.classList.toggle("on"); FX.bump(s); FX.burst(s, { emojis: ["🧠", "✨"], count: 6, spread: 70 }); if (s.classList.contains("on")) FX.toast("Навык добавлен в резюме. Проверять никто не будет", "🧠"); }
      });
      return () => T.clear();
    },
  });

  /* ============================================================
     2. VIBE MATCH
     ============================================================ */
  const PEOPLE = [
    { n: "Ника", a: 24, e: "👩‍🎤", km: "1,2 км", tags: ["🎧 техно", "🧘 йога", "🍷 вино"], bio: "ищу того, кто не пишет «привет, как дела»", col: "c-pink" },
    { n: "Артём", a: 27, e: "🧔", km: "800 м", tags: ["🏋️ зал", "📈 крипта", "🚴 вело"], bio: "инвестор (вложил 3000 ₽ в монету с собачкой)", col: "c-sky" },
    { n: "Соня", a: 22, e: "👩‍🎨", km: "3 км", tags: ["🎨 арт", "🐈 коты", "📚 классика"], bio: "рисую, грущу, ставлю лайки в 3 ночи", col: "c-lilac" },
    { n: "Макс", a: 29, e: "🧑‍💻", km: "5 км", tags: ["💻 айти", "🎮 игры", "🍕 пицца"], bio: "фронтендер. да, починю принтер. нет, не хочу", col: "c-lime" },
    { n: "Лиза", a: 25, e: "💁‍♀️", km: "2 км", tags: ["✈️ трэвел", "☕ кофе", "🌱 веган"], bio: "рост 170, а то спрашивают. знак зодиака — дедлайн", col: "c-yellow" },
    { n: "Гоша", a: 31, e: "🤠", km: "12 км", tags: ["🎣 рыбалка", "🥒 дача", "🎤 караоке"], bio: "есть машина, квартира и мама. мама в комплекте", col: "c-orange" },
    { n: "Вика", a: 23, e: "🧚", km: "400 м", tags: ["🔮 таро", "🌙 луна", "🛍️ шопинг"], bio: "ретроградный Меркурий — не повод не встретиться", col: "c-mint" },
    { n: "Даня", a: 26, e: "🎸", km: "7 км", tags: ["🎸 гитара", "🛹 скейт", "🍜 рамен"], bio: "знаю три аккорда, но играю их с душой", col: "c-coral" },
  ];
  const ONLINE = ["🟢 онлайн", "был(а) 3 мин назад", "🟢 печатает кому-то", "был(а) вчера в 4:20"];
  const MATCH_LINES = ["Совместимость 87%. Считали по цвету аватарки.", "Свайп вправо — это почти свидание. В 2026-м засчитывается.", "Заботик одобряет. Заботик одобряет всех.", "Ещё 3 свайпа — и алгоритм покажет тебе бывшую."];

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
        <div class="card c-grad tap" data-act="plus" style="margin-top:10px">
          <div class="lf-row"><div><div class="display" style="font-size:22px">Узнай, кто тебя лайкнул</div><div style="font-size:13px;margin-top:4px;font-weight:700">Всего 990 ₽/нед · первые 3 дня 1 ₽</div></div><span class="emo pulse" style="font-size:46px">🔒</span></div>
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
        const ms = [{ e: p.e, n: p.n, col: p.col }, ...st("life_matches", []).filter((m) => m.n !== p.n)].slice(0, 12);
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
            <button class="btn block" data-close>Свайпать дальше</button>
          </div>
          <div class="fine">*по знаку зодиака вашего банка</div>`, {
          sound: "like",
          onMount(m, close) {
            T.to(() => { FX.sound.success(); FX.burst($(m, ".hrt"), { emojis: ["❤️", "💖", "💘", "💕", "✨"], count: 24, spread: 170 }); }, 650);
            $(m, "[data-write]").addEventListener("click", () => {
              close();
              FX.toast(`Отправлено: «привет, как дела» 🙈`, "💬");
              T.to(() => FX.toast(`${p.n} печатает… (с прошлого вторника)`, "⌨️", 3000), 1600);
              Vibe.reward({ vibiki: 5, xp: 10 });
            });
          },
        });
      }
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        if (a.dataset.act === "plus") { FX.shake(a); FX.toast("Тебя лайкнули 99+ человек. Возможно. Узнай за 990 ₽", "🔒"); }
        if (a.dataset.act === "mm") { FX.bump(a); FX.toast(`${a.dataset.n} в сети. Но не для тебя (шутка)`, "💌"); }
      });
      return () => T.clear();
    },
  });
  function matchList(ms) {
    if (!ms.length) return `<div class="card flat tight" style="width:100%;font-size:13px;font-weight:700">Пока пусто. Свайпни вправо — тут появятся твои люди 💘</div>`;
    return ms.map((m) => `<button class="lf-mm" data-act="mm" data-n="${Vibe.esc(m.n)}"><i class="${m.col}">${m.e}</i>${Vibe.esc(m.n)}</button>`).join("");
  }

  /* ============================================================
     3. VIBE RENT
     ============================================================ */
  const FLATS = [
    { id: "r1", t: "Студия 18 м²", sub: "«уютная», «компактная», «для одного (стоя)»", p: 42000, m: "Вайбовская · 7 мин*", tags: ["Студия", "У метро"], col: "c-pink", e: ["🛏️", "🪴", "🖼️", "🚽"], nodep: true, feat: ["Кухня, спальня и санузел — одно помещение", "Окна выходят на окна соседей", "Евроремонт 2007 года"] },
    { id: "r2", t: "1-к, 34 м²", sub: "ЖК «Облака», 24 этаж", p: 58000, m: "Облачная · 12 мин", tags: ["1-к", "С котом"], col: "c-sky", e: ["🛋️", "🐈", "📺", "🌇"], feat: ["Можно с котом (кот хозяйки остаётся)", "Вид на другой ЖК", "Консьерж (иногда)"] },
    { id: "r3", t: "2-к, 52 м²", sub: "сталинка, потолки 3,2 м", p: 79000, m: "Центральная · 3 мин", tags: ["2-к", "У метро"], col: "c-yellow", e: ["🛋️", "🕰️", "🪞", "📚"], nodep: true, feat: ["Хозяйка заходит полить цветы каждый день", "Ковёр на стене — исторический", "Шкаф-ценность (не открывать)"] },
    { id: "r4", t: "Студия 22 м²", sub: "апартаменты, «почти квартира»", p: 47000, m: "Промзона · 25 мин", tags: ["Студия", "С котом"], col: "c-lime", e: ["🛏️", "🐈‍⬛", "💡", "🧺"], feat: ["Прописки нет, зато лофт", "Вид на завод (очень атмосферно)", "Котам можно, людям — по согласованию"] },
    { id: "r5", t: "1-к, 40 м²", sub: "новостройка, белый бокс", p: 63000, m: "Вайбовская · 5 мин", tags: ["1-к", "У метро"], col: "c-lilac", e: ["📦", "💡", "🪑", "🧱"], nodep: true, feat: ["Мебель будет (в мечтах)", "Парк обещают в 2031", "Соседи делают ремонт до 2031"] },
    { id: "r6", t: "2-к, 60 м²", sub: "с ремонтом от бабушки", p: 72000, m: "Садовая · 9 мин", tags: ["2-к", "С котом"], col: "c-orange", e: ["🛋️", "🧶", "🐈", "🫖"], feat: ["Сервант с хрусталём включён в аренду", "Кот бабушки — тоже", "Бабушка — нет (но звонит)"] },
  ];
  const POS = [[8, 30, 62], [56, 10, 46], [36, 56, 52], [72, 58, 40]];
  const photo = (f, h = 170, heart = true) => `
    <div class="lf-photo ${f.col}" style="height:${h}px">
      ${f.nodep ? `<div class="sticker">Без залога*</div>` : ""}
      ${heart ? `<button class="lf-heart" data-act="like" data-id="${f.id}"><span class="like ${(st("life_rentLiked", {}))[f.id] ? "on" : ""}">❤️</span></button>` : ""}
      ${f.e.map((x, i) => `<span class="e emo float d${i}" style="left:${POS[i][0]}%;top:${POS[i][1]}%;font-size:${POS[i][2]}px">${x}</span>`).join("")}
    </div>`;
  const flatCard = (f) => `
    <div class="card tap" data-act="open" data-id="${f.id}" style="padding:10px">
      ${photo(f)}
      <div style="padding:10px 4px 2px">
        <div class="lf-row"><div class="big-num" style="font-size:26px">${rub(f.p)}<span style="font-family:var(--font);font-size:13px;font-weight:800">/мес</span></div><span class="badge" style="background:var(--yellow)">👀 ${rnd(12, 48)} смотрят</span></div>
        <b style="display:block;margin-top:6px;font-size:15px">${f.t}</b>
        <div class="muted" style="font-size:12px;font-weight:700">${f.sub}</div>
        <div style="margin-top:6px;font-size:13px;font-weight:800">Ⓜ️ ${f.m}</div>
        ${f.nodep ? `<div class="fine" style="margin-top:4px">*залог переименован в «страховой платёж»</div>` : ""}
      </div>
    </div>`;

  Vibe.screen("rent", {
    render() {
      return `
      ${Vibe.ui.head("Vibe Rent", "Квартиры без риелторов*", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Сними жильё мечты", text: "Свободно 3 квартиры из 12 000. Успей!", emo: "🔑", color: "c-mint", sticker: "0% комиссии*" })}
        <div class="chips" style="margin-top:14px">${["Студия", "1-к", "2-к", "У метро", "С котом"].map((t) => `<button class="chip" data-f="${t}">${{ "Студия": "🛏️", "1-к": "🚪", "2-к": "🛋️", "У метро": "Ⓜ️", "С котом": "🐈" }[t]} ${t}</button>`).join("")}</div>
        <div class="stack stagger" data-list>${FLATS.map(flatCard).join("")}</div>
        ${zab("Совет от Заботика: говори хозяйке, что ты непьющий программист без кота. Работает в 100% случаев.")}
        <div class="fine">*Без риелторов, но с «помощником хозяина». Комиссия 0%, сбор за ключи 100%. Фото квартир сделаны в лучшие дни квартир.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const on = new Set();
      const listEl = $(root, "[data-list]");
      function renderList() {
        const arr = FLATS.filter((f) => [...on].every((t) => f.tags.includes(t)));
        listEl.innerHTML = arr.length ? arr.map(flatCard).join("") : `<div class="card c-lilac" style="text-align:center"><div class="emo float" style="font-size:60px">🐈</div><div class="display" style="font-size:22px;margin-top:6px">Ничего не нашли</div><div style="font-size:13px;margin-top:6px;font-weight:700">С такими фильтрами не сдают. Но можно сдать кота.</div></div>`;
        restagger(listEl);
      }
      root.addEventListener("click", (e) => {
        const ch = e.target.closest("[data-f]");
        if (ch) {
          const t = ch.dataset.f;
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
          const h = $(lk, ".like");
          h.classList.toggle("on", liked[id]);
          FX.bump(lk);
          if (liked[id]) { FX.sound.like(); FX.burst(lk, { emojis: ["❤️", "💖", "🏠"], count: 10, spread: 90 }); Vibe.reward({ xp: 2 }); }
          else FX.sound.pop();
          return;
        }
        const op = e.target.closest("[data-act=open]");
        if (op) openFlat(FLATS.find((f) => f.id === op.dataset.id));
      });

      function openFlat(f) {
        const total = f.p * 3;
        Vibe.ui.sheet(`
          ${photo(f, 190, false)}
          <div class="lf-row" style="margin-top:14px"><div class="big-num" style="font-size:32px">${rub(f.p)}</div><span class="badge" style="background:var(--pink)">🔥 осталось 2 просмотра</span></div>
          <div class="display" style="font-size:22px;margin-top:6px">${f.t}</div>
          <div class="muted" style="font-size:13px;font-weight:700">${f.sub} · Ⓜ️ ${f.m}</div>
          <div class="card flat stagger" style="padding:2px 14px;margin-top:14px">
            ${f.feat.map((x) => `<div class="li"><div class="ic c-lime" style="width:36px;height:36px;font-size:16px">✅</div><div class="tx" style="font-size:13px;font-weight:700">${x}</div></div>`).join("")}
          </div>
          <div style="margin-top:14px">
            <div class="lf-fee"><span>Аренда за месяц</span><span>${rub(f.p)}</span></div>
            <div class="lf-fee"><span>Залог</span><span>0 ₽ 🎉</span></div>
            <div class="lf-fee"><span>«Страховой платёж»*</span><span>${rub(f.p)}</span></div>
            <div class="lf-fee"><span>Комиссия «за ключи»</span><span>${rub(f.p)}</span></div>
            <div class="lf-total"><span class="display" style="font-size:18px">На заезд</span><span class="big-num">${rub(total)}</span></div>
          </div>
          <div data-step1><button class="btn black xl block" data-book>Записаться на просмотр 👀</button></div>
          <div data-step2 hidden>
            <div class="display" style="font-size:20px;margin:6px 0 10px">Выбери время</div>
            <div class="lf-slots">${["Сегодня 19:00", "Сегодня 19:15", "Завтра 10:00", "Завтра 12:30", "Сб 14:00", "Прямо сейчас 🏃"].map((s) => `<button class="chip" data-slot="${s}">${s}</button>`).join("")}</div>
            <div class="fine">В это же время квартиру смотрят ещё 14 человек. Это нормально, это рынок.</div>
            <button class="btn lime xl block" data-confirm disabled style="margin-top:12px">Подтвердить ✓</button>
          </div>
          <div class="fine">*«Страховой платёж» — это не залог. Залог — это другое. Чем — мы сами не до конца понимаем.</div>`, {
          onMount(sh, close) {
            let slot = null;
            $(sh, "[data-book]").addEventListener("click", (e) => {
              FX.bump(e.currentTarget);
              $(sh, "[data-step1]").hidden = true;
              const s2 = $(sh, "[data-step2]");
              s2.hidden = false;
              s2.querySelectorAll(".chip").forEach((c, i) => { c.style.animation = `pop-in .45s var(--spring) ${i * 50}ms both`; });
              FX.sound.pop();
              T.to(() => s2.scrollIntoView({ behavior: "smooth", block: "end" }), 60);
            });
            sh.addEventListener("click", (e) => {
              const c = e.target.closest("[data-slot]");
              if (!c) return;
              slot = c.dataset.slot;
              $$(sh, "[data-slot]").forEach((x) => x.classList.toggle("on", x === c));
              FX.bump(c);
              FX.sound.add();
              $(sh, "[data-confirm]").disabled = false;
            });
            $(sh, "[data-confirm]").addEventListener("click", (e) => {
              const from = e.currentTarget;
              close();
              FX.confetti();
              Vibe.reward({ vibiki: 10, xp: 15, from });
              Vibe.modal(`
                <div class="m-emo float">🗝️</div>
                <div class="display">Ты записан!</div>
                <p>${slot}, ${f.t}. Ты 14-й в очереди. Возьми паспорт, справку о доходах и рекомендацию от прошлой хозяйки.</p>
                <button class="btn black block" data-close>Иду смотреть 🏃</button>
                <div class="fine">Хозяин может передумать, поднять цену или сдать квартиру своему племяннику. Это часть опыта.</div>`);
            });
          },
        });
      }
      return () => T.clear();
    },
  });

  /* ============================================================
     4. VIBE HOME — покупка и ипотека
     ============================================================ */
  const RATE = 0.189;
  const BUILDS = [
    { n: "ЖК «Вайб Сити»", e: "🏙️", p: 12400000, d: "II кв. 2029*", col: "c-sky" },
    { n: "ЖК «Уютный муравейник»", e: "🏢", p: 8900000, d: "«скоро»", col: "c-yellow" },
    { n: "ЖК «Парк у кольцевой»", e: "🌳", p: 7300000, d: "когда-нибудь", col: "c-lime" },
    { n: "Клубный дом «Элита»", e: "🏰", p: 29000000, d: "уже сдан (в аренду)", col: "c-lilac" },
    { n: "ЖК «Студенческий»", e: "🏚️", p: 4100000, d: "IV кв. 2027", col: "c-coral" },
  ];
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

  Vibe.screen("home-buy", {
    render() {
      const m = mortgage(10000000, 20, 30);
      return `
      ${Vibe.ui.head("Vibe Home", "Ипотека на 30 лет счастья", Vibe.ui.vibikiPill())}
      <div class="stagger">
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
          <button class="btn black xl block" data-approve style="margin-top:16px">Одобрить ✨ <span class="arrow">→</span></button>
          <div class="fine">*6% — для тех, кто родился 29 февраля на Луне и работает в банке. Расчёт по ставке 18,9%. Ставка может измениться в зависимости от ключевой ставки, курса, погоды и настроения банка.</div>
        </div>
        ${zab("", "sly")}
        <h2 class="sec">Новостройки <small>тапни → в калькулятор</small></h2>
        <div class="hscroll">${BUILDS.map((b, i) => `
          <div class="card tap lf-build" data-build="${i}">
            <div class="pic ${b.col}"><span class="emo float d${i % 3}">${b.e}</span>${i % 2 ? "" : `<div class="sticker" style="top:8px;right:8px;font-size:11px">Осталось 2 кв.</div>`}</div>
            <div class="body"><b style="font-size:14px">${b.n}</b><div class="muted" style="font-size:12px;font-weight:700">Сдача: ${b.d}</div><div class="price" style="margin-top:6px">от ${dec(b.p / 1e6)} млн ₽</div></div>
          </div>`).join("")}</div>
        <div class="fine">*Сроки сдачи ориентировочные. Ориентир — горизонт.</div>
      </div>`;
    },
    mount(root) {
      const T = bag();
      const R = {}; $$(root, "[data-r]").forEach((i) => (R[i.dataset.r] = i));
      const payEl = $(root, "[data-pay]"), overEl = $(root, "[data-over]");
      let lastHouses = -1, debounce = null;
      function update(animate = true) {
        const price = +R.price.value, down = +R.down.value, years = +R.years.value;
        Object.values(R).forEach(setRange);
        $(root, "[data-lbl=price]").textContent = rub(price);
        $(root, "[data-lbl=down]").textContent = `${down}% · ${dec((price * down) / 100 / 1e6, 2)} млн`;
        $(root, "[data-lbl=years]").textContent = `${years} ${years % 10 === 1 && years !== 11 ? "год" : years % 10 >= 2 && years % 10 <= 4 && (years < 12 || years > 14) ? "года" : "лет"}`;
        const m = mortgage(price, down, years);
        $(root, "[data-ratio]").textContent = dec(m.ratio);
        const nH = Math.max(1, Math.min(12, Math.round(m.ratio)));
        if (nH !== lastHouses) {
          const hs = $(root, "[data-houses]");
          hs.innerHTML = Array.from({ length: nH }, (_, i) => `<span style="animation-delay:${i * 40}ms">🏠</span>`).join("") + (m.ratio > 12 ? " …" : "");
          lastHouses = nH;
        }
        const age = 25 + years;
        say(root, years >= 25 ? `К концу ипотеки тебе будет ${age}. Отличный возраст для новоселья! 🎂` : down >= 60 ? "Первый взнос 60%+? Ты точно не наш клиент. Уважаем." : `Всего ${years} лет — и квартира почти твоя. Почти — потому что ещё налог.`);
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
          FX.burst(b, { emojis: [bd.e, "✨", "🔑"], count: 10 });
          FX.toast(`${bd.n} — в калькуляторе`, bd.e);
          $(root, "[data-calc]").scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (e.target.closest("[data-approve]")) approve(e.target.closest("[data-approve]"));
      });

      function approve(btn) {
        FX.bump(btn);
        const m = mortgage(+R.price.value, +R.down.value, +R.years.value);
        const steps = ["Проверяем кредитную историю…", "Смотрим, что ты лайкал в 2019…", "Считаем, сколько ты тратишь на кофе ☕", "Звоним маме…", "Сверяемся с гороскопом 🔮", "Советуемся с нейросетью…", "Почти готово…"];
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
              const pct = Math.min(100, Math.round((k / steps.length) * 100));
              const bar = $(md, "[data-bar]");
              if (!bar) { T.stop(id); return; }
              bar.style.setProperty("--p", pct + "%");
              $(md, "[data-pct]").textContent = pct + "%";
              FX.sound.tick();
              if (k < steps.length) { const s = $(md, "[data-step]"); s.textContent = steps[k]; FX.bump(s); return; }
              T.stop(id);
              T.to(() => {
                md.innerHTML = `
                  <div class="m-emo float">🏆</div>
                  <div class="display">Предодобрено!</div>
                  <div class="big-num" style="font-size:30px;margin-top:8px">${rub(m.L)}</div>
                  <p>Платёж ${rub(m.P)}/мес. Банк уже любит тебя. Особенно на ${+R.years.value} лет вперёд.</p>
                  <div class="stack">
                    <button class="btn grad xl block" data-take>Забрать ключи 🔑</button>
                    <button class="btn block" data-close>Подумаю (не надо)</button>
                  </div>
                  <div class="fine">Предодобрение не означает одобрение. Одобрение не означает выдачу. Выдача не означает, что квартира ваша.</div>`;
                FX.confetti();
                FX.sound.success();
                FX.burst($(md, ".m-emo"), { emojis: ["🔑", "🏠", "✨", "💸"], count: 20 });
                $(md, "[data-take]").addEventListener("click", (ev) => {
                  Vibe.achieve("credit");
                  Vibe.reward({ vibiki: 50, xp: 40, from: ev.currentTarget });
                  close();
                  T.to(() => FX.toast("Подпиши 48 документов в приложении. Первый — согласие читать остальные", "📝", 3200), 700);
                });
              }, 450);
            }, 620);
          },
        });
      }
      return () => T.clear();
    },
  });

  /* ============================================================
     5. VIBE TRAVEL
     ============================================================ */
  const HOT = [
    { id: "t1", to: "Турция", f: "🇹🇷", e: "🏖️", n: 7, p: 58990, old: 119990, col: "c-orange", cd: 14 },
    { id: "t2", to: "Египет", f: "🇪🇬", e: "🐫", n: 10, p: 64990, old: 99990, col: "c-yellow", cd: 1320 },
    { id: "t3", to: "Таиланд", f: "🇹🇭", e: "🐘", n: 12, p: 119990, old: 189990, col: "c-mint", cd: 2710 },
    { id: "t4", to: "ОАЭ", f: "🇦🇪", e: "🏙️", n: 5, p: 89990, old: 149990, col: "c-sky", cd: 488 },
  ];
  const DEST = [
    { id: "d1", to: "Мальдивы", f: "🇲🇻", e: "🏝️", n: 9, p: 289990, col: "c-sky" },
    { id: "d2", to: "Грузия", f: "🇬🇪", e: "🍷", n: 6, p: 42990, col: "c-coral" },
    { id: "d3", to: "Бали", f: "🇮🇩", e: "🌴", n: 14, p: 159990, col: "c-lime" },
    { id: "d4", to: "Сочи", f: "🇷🇺", e: "🌊", n: 7, p: 299990, col: "c-lilac", note: "дороже Мальдив" },
    { id: "d5", to: "Вьетнам", f: "🇻🇳", e: "🍜", n: 11, p: 99990, col: "c-yellow" },
    { id: "d6", to: "Дача", f: "🏡", e: "🥒", n: 30, p: 4990, col: "c-mint", note: "электричка + рассада" },
  ];
  const ALL_TRIPS = HOT.concat(DEST);

  Vibe.screen("travel", {
    render() {
      return `
      ${Vibe.ui.head("Vibe Travel", "Улетай от проблем (они догонят)", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Туры, которые горят", text: `Смотрят сейчас: <b data-watch>48</b> человек`, emo: "✈️", color: "c-sky", sticker: "−70%*" })}
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
        <h2 class="sec">Куда махнём?</h2>
        <div class="grid2">${DEST.map((d, i) => `
          <div class="card tap lf-dest" data-trip="${d.id}">
            <div class="pic ${d.col}"><span class="f">${d.f}</span><span class="emo float d${i % 3}">${d.e}</span>${i % 3 === 0 ? `<span class="emo float d2" style="position:absolute;right:8px;bottom:4px;font-size:26px">🌴</span>` : ""}</div>
            <b style="font-size:14px;margin-top:4px">${d.to}</b>
            <div class="muted" style="font-size:11px;font-weight:700">${d.n} ночей${d.note ? " · " + d.note : ""}</div>
            <div class="price" style="font-size:16px">от ${rub(d.p)}</div>
          </div>`).join("")}</div>
        ${zab("Отпуск — лучшее время, чтобы проверить рабочий чат. Мы добавили роуминг для него бесплатно.")}
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
        const t = e.target.closest("[data-trip]");
        if (t) book(ALL_TRIPS.find((x) => x.id === t.dataset.trip), t);
      });

      function book(tr, card) {
        FX.bump(card);
        const DATES = [["24–31 окт", 1], ["1–8 нояб", 1], ["15–22 нояб", 0.9], ["Новый год", 3]];
        let mult = 1, people = 2, dIdx = 0;
        const calc = () => {
          const base = Math.round(tr.p * people * mult);
          const fuel = 4990 * people, fee = 990;
          return { base, fuel, fee, total: base + fuel + fee };
        };
        const c0 = calc();
        Vibe.ui.sheet(`
          <div class="lf-photo ${tr.col}" style="height:150px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:64px">
            <span class="emo wobble">${tr.f}</span><span class="emo float">${tr.e}</span><span class="emo float d2" style="font-size:40px">🌴</span>
          </div>
          <div class="display" style="font-size:28px;margin-top:14px">${tr.to}</div>
          <div class="muted" style="font-weight:700;font-size:13px">${tr.n} ночей · отель «Вайб Резорт 5★»</div>
          <div class="lf-mini" style="margin-top:16px">Даты</div>
          <div class="chips">${DATES.map((d, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-date="${i}">${d[0]}${d[1] > 1 ? " ×3" : ""}</button>`).join("")}</div>
          <div class="lf-row" style="margin-top:10px">
            <div><div class="lf-mini">Путешественники</div><div style="font-weight:800;font-size:13px;margin-top:2px">взрослые (дети — тоже взрослые)</div></div>
            <div class="stepper"><button data-ppl="-1">−</button><span data-ppln>${people}</span><button data-ppl="1">+</button></div>
          </div>
          <div class="card flat tight" style="margin-top:14px;font-size:13px;font-weight:700;display:grid;gap:4px">
            <div>✅ Перелёт (туда)</div><div>✅ Отель 5★ (звёзды на потолке номера)</div><div>✅ Завтрак (концептуальный)</div><div>❌ Обратный билет*</div>
          </div>
          <div style="margin-top:12px">
            <div class="lf-fee"><span>Тур</span><span data-base>${rub(c0.base)}</span></div>
            <div class="lf-fee"><span>Топливный сбор</span><span data-fuel>${rub(c0.fuel)}</span></div>
            <div class="lf-fee"><span>Сбор за то, что вы в отпуске</span><span>${rub(c0.fee)}</span></div>
            <div class="lf-total"><span class="display" style="font-size:18px">Итого</span><span class="big-num" data-tot data-val="${c0.total}">${rub(c0.total)}</span></div>
          </div>
          <button class="btn black xl block" data-buy>Улетаю! ✈️ <span class="arrow">→</span></button>
          <div class="fine">*Обратный билет продаётся отдельно, когда вы поймёте, что хотите вернуться. Вылет в 04:20 из аэропорта в 80 км.</div>`, {
          onMount(sh, close) {
            const upd = () => {
              const c = calc();
              $(sh, "[data-base]").textContent = rub(c.base);
              $(sh, "[data-fuel]").textContent = rub(c.fuel);
              FX.countTo($(sh, "[data-tot]"), c.total, { fmt: Vibe.rub, dur: 500 });
              FX.bump($(sh, "[data-tot]"));
            };
            sh.addEventListener("click", (e) => {
              const d = e.target.closest("[data-date]");
              if (d) {
                dIdx = +d.dataset.date; mult = DATES[dIdx][1];
                $$(sh, "[data-date]").forEach((x) => x.classList.toggle("on", x === d));
                FX.bump(d);
                if (mult > 1) FX.toast("Новый год — это ×3. Праздник же!", "🎄");
                upd();
                return;
              }
              const p = e.target.closest("[data-ppl]");
              if (p) {
                const np = people + +p.dataset.ppl;
                if (np < 1 || np > 6) { FX.shake(p.parentElement); return; }
                people = np;
                const n = $(sh, "[data-ppln]"); n.textContent = people; FX.bump(n);
                FX.sound.add();
                upd();
                return;
              }
              const b = e.target.closest("[data-buy]");
              if (b) {
                const c = calc();
                const ok = Vibe.pay(c.total, { title: `Vibe Travel · ${tr.to}`, emoji: tr.e, col: tr.col, from: b });
                if (!ok) return;
                close();
                FX.confetti();
                Vibe.state.set({ life_trips: (st("life_trips", 0) || 0) + 1 });
                Vibe.modal(`
                  <div class="m-emo float">🧳</div>
                  <div class="display">Чемоданы собраны!</div>
                  <p>${tr.to}, ${DATES[dIdx][0]}, ${people} чел. Билеты придут в чат за 3 часа до вылета. Или за 3 минуты.</p>
                  <button class="btn black block" data-close>Скорее бы 🌴</button>
                  <div class="fine">Возврат средств возможен только эмоциональный.</div>`);
                T.to(() => FX.burst({ x: innerWidth / 2, y: innerHeight / 2 - 80 }, { emojis: ["✈️", "🌴", "☀️", "🏖️"], count: 20 }), 300);
              }
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
    { id: "blog", e: "📱", short: "Блогер-миллионник", t: "Как стать блогером-миллионником", by: "блогер с 1 000 000 (рублей долга)", p: 19990, old: 49990, dur: "∞", col: "c-coral", les: ["Свет из окна", "Хук в первую секунду", "Покупаем подписчиков (не покупайте)"], badge: "Осталось 2 места" },
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

      function openCourse(id) {
        const c = cById(id);
        const lessons = () => {
          const done = myCourses()[id] || 0;
          return c.les.map((l, i) => `
            <div class="li">
              <div class="lf-chk ${i < done ? "done" : ""}">${i < done ? "✓" : i + 1}</div>
              <div class="tx"><b style="white-space:normal">${l}</b><small>${i < done ? "пройдено" : i === done ? "доступно сейчас" : "🔒 после предыдущего"}</small></div>
              ${i === done ? `<button class="btn lime sm lf-glow" data-lesson="${i}">+20 XP</button>` : ""}
            </div>`).join("");
        };
        Vibe.ui.sheet(`
          <div class="lf-row" style="justify-content:flex-start;gap:14px">
            <div class="lf-cpic ${c.col}"><span class="emo float">${c.e}</span></div>
            <div><div class="display" style="font-size:22px">${c.t}</div><div class="muted" style="font-size:12px;font-weight:700">${c.by}</div></div>
          </div>
          <div class="progress" style="margin:16px 0 4px"><i data-cbar style="--p:${Math.round(((myCourses()[id] || 0) / c.les.length) * 100)}%"></i></div>
          <div class="card flat" style="padding:2px 14px;margin-top:10px" data-les>${lessons()}</div>
          <div class="fine">Каждый урок длится 4 минуты, из них 3 — реклама других курсов.</div>`, {
          onMount(sh, close) {
            sh.addEventListener("click", (e) => {
              const b = e.target.closest("[data-lesson]");
              if (!b) return;
              const done = (myCourses()[id] || 0) + 1;
              Vibe.state.set({ life_courses: Object.assign({}, myCourses(), { [id]: done }) });
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
                    <p>Курс «${c.t}» пройден. Повесь сертификат в рамочку и добавь в резюме в Vibe Job.</p>
                    <button class="btn black block" data-close>Я эксперт 😎</button>
                    <div class="fine">Сертификат государственного образца (образца нашего государства Vibe).</div>`);
                  Vibe.reward({ vibiki: 50, xp: 50 });
                }, 600);
              }
            });
          },
        });
      }
      return () => T.clear();
    },
  });
  function courseCard(c) {
    const own = myCourses()[c.id] !== undefined;
    return `
      <div class="card">
        <div class="lf-row" style="justify-content:flex-start;gap:12px;align-items:flex-start">
          <div class="lf-cpic ${c.col}"><span class="emo wobble">${c.e}</span></div>
          <div style="flex:1;min-width:0"><b style="font-size:15px;line-height:1.2;display:block">${c.t}</b><div class="muted" style="font-size:12px;font-weight:700;margin-top:2px">${c.by}</div></div>
        </div>
        <div class="lf-pills" style="margin-top:10px"><span class="badge" style="background:var(--yellow)">⭐ 4,9 (отзывы мамы)</span><span class="badge" style="background:var(--sky)">⏱ ${c.dur}</span><span class="badge">${c.badge}</span></div>
        <div class="lf-row" style="margin-top:12px">
          <div><div class="price" style="font-size:20px">${rub(c.p)}</div><div class="old-price">${rub(c.old)}</div></div>
          <div style="display:flex;gap:6px">
            ${own ? `<button class="btn lime sm" data-open="${c.id}">Продолжить →</button>` : `<button class="btn sm" data-trial="${c.id}">Урок 0 ₽</button><button class="btn black sm" data-buy="${c.id}">Купить</button>`}
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
              <div><div class="price" style="font-size:22px">${dec(c.ppm)} ₽<span style="font-family:var(--font);font-size:12px;font-weight:800">/мин</span></div><div class="fine" style="margin-top:0">+${START_FEE} ₽ за старт, +2 ₽/мин за грусть</div></div>
              <button class="btn black sm" data-reserve="${c.id}">Забронировать</button>
            </div>
          </div>`).join("")}</div>
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
            <div class="fine" style="color:var(--ink);opacity:.7">После 20 минут ожидание платное: 3 ₽/мин и немного осуждения.</div>
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
              <div style="text-align:right;font-weight:800;font-size:13px"><div data-km>0,0 км</div><div style="opacity:.6">${dec(car.ppm)} ₽/мин</div></div>
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
        toList();
        FX.confetti();
        Vibe.modal(`
          <div class="m-emo float">🏁</div>
          <div class="display">Приехали!</div>
          <div class="big-num" style="font-size:32px;margin-top:8px">${rub(total)}</div>
          <p>${c.m} · ${m} мин · ${dec(m * 0.7)} км. Спасибо, что выбрали Vibe Drive и не выбрали метро.</p>
          <button class="btn black block" data-close>Огонь 🔥</button>
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
        if (e.target.closest("[data-cancel]")) { toList(); FX.sound.pop(); FX.toast("Бронь отменена. Штраф 0 ₽ (в этот раз)", "🙅"); return; }
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
          <div class="li"><div class="ic c-yellow">🛋️</div><div class="tx"><b>Комнаты</b><small>+900 ₽ за каждую</small></div>
            <div class="stepper"><button data-st="rooms" data-d="-1">−</button><span data-v="rooms">2</span><button data-st="rooms" data-d="1">+</button></div></div>
          <div class="li"><div class="ic c-sky">🛁</div><div class="tx"><b>Санузлы</b><small>+700 ₽ за каждый</small></div>
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
  const myTicketsHtml = (ts) => ts.length ? `
    <h2 class="sec">Мои билеты <small>${ts.length}</small></h2>
    <div class="hscroll stagger">${ts.map((t, i) => `
      <button class="lf-mt tap" data-myt="${i}">
        <div class="a ${t.col === "c-holo" ? "c-holo" : t.col}"><b>${Vibe.esc(t.t)}</b><small style="color:inherit;opacity:.8">${t.d} ${t.mo} · ${Vibe.esc(t.sector)}</small></div>
        <div class="q">🎟️</div>
      </button>`).join("")}</div>` : "";
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
                const t = { e: ev.e, t: ev.t, d: ev.d, mo: ev.mo, place: ev.place, sector: SECTORS[sec].n, qty, col: ev.col, code: rnd(100000, 999999) };
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
          <p>Корешок оторван — назад дороги нет. Билеты уже в «Моих билетах» и в чате.</p>
          <button class="btn black block" data-close>Иду тусить 🕺</button>`, {
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
          <div class="badge" style="background:var(--lime)">№${t.code}</div>
          <button class="btn black block" data-close style="margin-top:14px">Готово</button>
          <div class="fine">Сделай яркость экрана на максимум. Охранник всё равно попросит распечатку.</div>`, { sound: "pop" });
      }
      return () => T.clear();
    },
  });
})();
