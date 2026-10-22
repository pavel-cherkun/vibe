/* ============================================================
   Commerce — Vibe Eat (+ меню и трекинг), Supermarket, Market,
   Pets, Health. Дофамин на каждое касание.
   ============================================================ */
(function () {
  const V = Vibe;
  const ui = V.ui;
  const S = () => V.state.get();
  const rub = V.rub;

  /* ---------- Локальные стили (только классы cm-*) ---------- */
  (function injectCss() {
    if (document.getElementById("cm-css")) return;
    const st = document.createElement("style");
    st.id = "cm-css";
    st.textContent = `
.cm-dock{position:sticky;bottom:0;height:0;margin:0 -16px;z-index:60}
.cm-spacer{height:86px}
.cm-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cm-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}
.cm-meta .badge.w{background:var(--paper)}
.cm-rest{padding:0;display:flex;flex-direction:column}
.cm-rest-pic{height:122px;border-bottom:2.5px solid var(--ink);display:grid;place-items:center;font-size:72px;position:relative;overflow:hidden}
.cm-rest-pic .bg{position:absolute;font-size:160px;opacity:.16;right:-26px;bottom:-50px;transform:rotate(-16deg)}
.cm-rest-pic .sticker{top:12px;left:12px;font-size:12px}
.cm-rest-body{padding:12px 14px 14px}
.cm-rest-body b.nm{font-family:var(--font-display);font-weight:400;font-size:18px;line-height:1.1}
.cm-rest .like{position:absolute;top:10px;right:12px;z-index:3;font-size:26px}
.cm-hot{width:150px;padding:10px}
.cm-hot .pic{height:96px;border-radius:18px;border:2px solid var(--ink);display:grid;place-items:center;font-size:56px;margin-bottom:8px;position:relative}
.cm-hot b{display:block;font-size:13px;font-weight:800;line-height:1.2;min-height:31px}
.cm-dish{display:flex;gap:12px;align-items:center;padding:12px}
.cm-dish .pic{width:86px;height:86px;border-radius:20px;border:2px solid var(--ink);display:grid;place-items:center;font-size:50px;flex:0 0 auto;position:relative}
.cm-dish .tx{flex:1;min-width:0}
.cm-dish .tx b{font-weight:800;font-size:15px;display:block;line-height:1.2}
.cm-dish .tx small{color:var(--muted);font-size:12px;font-weight:700;display:block;margin:3px 0 8px;line-height:1.3}
.cm-ctl{display:inline-flex}
.prod .pic .sticker{font-size:11px;padding:3px 8px;top:7px;left:7px;border-width:2px}
.prod .pic .like{position:absolute;top:6px;right:8px;font-size:22px}
.prod .pic .badge{position:absolute;bottom:6px;left:6px;font-size:10px}
.cm-place-head{border:var(--line);border-radius:32px;box-shadow:var(--shadow);padding:18px;position:relative;overflow:hidden;min-height:180px}
.cm-place-head .display{font-size:30px;max-width:70%;position:relative;z-index:1}
.cm-place-head .big{position:absolute;right:6px;bottom:-4px;font-size:110px}
.cm-mapw{position:relative;height:300px}
.cm-vm{position:absolute;inset:0}
.cm-eta{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:3;white-space:nowrap;text-align:center;background:var(--ink);color:#fff;border-radius:18px;padding:8px 14px;border:2.5px solid var(--ink);box-shadow:var(--shadow-sm);pointer-events:none}
.cm-eta small{display:block;font-size:11px;font-weight:800;color:var(--lime)}
.cm-eta .big-num{font-size:28px;display:inline-block}
.cm-cam{position:absolute;left:10px;bottom:12px;z-index:3;height:38px;padding:0 12px;border:2.5px solid var(--ink);border-radius:14px;background:#fff;font-weight:800;font-size:13px;box-shadow:0 3px 0 var(--ink);transition:background .2s}
.cm-cam.on{background:var(--lime)}
.cm-cam:active{transform:translateY(3px);box-shadow:none}
.cm-km{position:absolute;right:10px;bottom:16px;z-index:3;background:var(--yellow);pointer-events:none}
.cm-event{max-height:0;overflow:hidden;transition:max-height .45s var(--spring),margin .3s;padding:0 2px}
.cm-event.on{max-height:110px;margin-top:12px;padding-bottom:6px}
.cm-steps .st{display:flex;align-items:center;gap:12px;padding:10px 0;opacity:.38;transition:opacity .3s}
.cm-steps .st.on{opacity:1}
.cm-steps .st .ic{width:46px;height:46px;border-radius:15px;border:2px solid var(--ink);display:grid;place-items:center;font-size:22px;background:var(--paper);transition:background .3s,transform .5s var(--spring);flex:0 0 auto}
.cm-steps .st.on .ic{background:var(--lime);transform:rotate(-6deg)}
.cm-steps .st.now .ic{background:var(--yellow);animation:pulse 1.1s ease-in-out infinite}
.cm-steps .st b{display:block;font-weight:800;font-size:15px}
.cm-steps .st small{color:var(--muted);font-size:12px;font-weight:700}
.cm-stars{display:flex;justify-content:center;gap:4px;margin:4px 0 14px}
.cm-stars button{font-size:40px;filter:grayscale(1);opacity:.35;transition:transform .3s var(--spring),filter .2s,opacity .2s}
.cm-stars button.on{filter:none;opacity:1;transform:scale(1.18) rotate(-8deg)}
.cm-bubble{position:relative;background:var(--paper);border:2.5px solid var(--ink);border-radius:20px;border-bottom-left-radius:6px;padding:12px 14px;font-weight:700;font-size:14px;line-height:1.35;min-height:48px}
.cm-zab{display:flex;gap:10px;align-items:flex-end}
.cm-slots{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.cm-slot{height:34px;padding:0 12px;font-size:13px}
.cm-slot.taken{opacity:.35;text-decoration:line-through;pointer-events:none}
.cm-swatch{width:40px;height:40px;border-radius:50%;border:2.5px solid var(--ink);flex:0 0 auto;transition:transform .25s var(--spring),box-shadow .2s}
.cm-swatch.on{box-shadow:0 0 0 3px var(--bg),0 0 0 5.5px var(--ink);transform:scale(1.08)}
.cm-bigpic{height:200px;border-radius:26px;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:118px;position:relative;overflow:hidden;box-shadow:var(--shadow-sm)}
.cm-bigpic .sticker{top:12px;left:12px}
.cm-flash{border:var(--line);border-radius:28px;box-shadow:var(--shadow);padding:16px 18px;position:relative;overflow:hidden}
.cm-flash .t{font-family:var(--font-display);font-size:34px;letter-spacing:1px;font-variant-numeric:tabular-nums}
.cm-flash .bolt{position:absolute;right:10px;top:8px;font-size:78px}
.cm-instal{display:grid;gap:6px;font-weight:700;font-size:13px;margin-top:12px;overflow:hidden;max-height:0;transition:max-height .5s var(--out)}
.cm-instal.on{max-height:420px}
.cm-instal .r{display:flex;justify-content:space-between;gap:10px}
.cm-progress-free{height:10px;margin-top:8px}
.cm-doc{display:flex;gap:12px;align-items:center}
.cm-doc .ava{width:62px;height:62px;border-radius:20px;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:36px;flex:0 0 auto}
.cm-doc b{display:block;font-weight:800;font-size:16px}
.cm-doc small{color:var(--muted);font-size:12px;font-weight:700}
.cm-promo{display:flex;align-items:center;gap:12px;border-style:dashed}
.cm-code{font-family:var(--font-display);font-size:22px;letter-spacing:1px}
.cm-bon{display:flex;gap:4px;flex-wrap:wrap;margin:-2px 0 6px}
.cm-bon span{font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;border:1.5px solid var(--ink);background:var(--lime);white-space:nowrap}
.cm-bon span.sl{background:var(--lilac,#c9b6ff)}.cm-bon span.lk{background:var(--pink)}.cm-bon span.en{background:var(--yellow)}
.cm-own{font-size:11px;font-weight:800;padding:6px 9px;border-radius:12px;border:2px solid var(--ink);background:var(--mint,#9ff0c8);white-space:nowrap}
.prod.cm-owned .pic{filter:saturate(.75)}
.cm-vibrow{display:flex;align-items:center;gap:12px;margin-top:12px}
.cm-nut{font-size:11px}
.cm-fridge{display:flex;align-items:center;gap:12px;margin-top:12px}
.cm-fridge .fz{font-size:40px}
.cm-fridge b{font-weight:800;display:block}
.cm-fridge small{font-size:12px;font-weight:700;opacity:.8;display:block;line-height:1.3}
.cm-visit{display:flex;align-items:center;gap:12px;padding:12px 14px}
.cm-visit .ic{width:50px;height:50px;border-radius:16px;border:2px solid var(--ink);display:grid;place-items:center;font-size:28px;flex:0 0 auto;background:#fff}
.cm-visit .tx{flex:1;min-width:0}
.cm-visit .tx b{display:block;font-weight:800;font-size:14px;line-height:1.2}
.cm-visit .tx small{font-size:12px;font-weight:700;opacity:.75}
.cm-pet{border:var(--line);border-radius:32px;box-shadow:var(--shadow);padding:16px;position:relative;overflow:hidden}
.cm-pet-top{display:flex;gap:12px;align-items:center}
.cm-pet-ava{width:128px;height:128px;flex:0 0 auto;border-radius:30px;border:2.5px solid var(--ink);background:#fff;display:grid;place-items:center;font-size:84px;position:relative;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
.cm-pet-ava .pe{display:inline-block;animation:cmPetIdle 2.4s ease-in-out infinite}
.cm-pet.sad .cm-pet-ava .pe{animation:cmPetSad 3s ease-in-out infinite;filter:saturate(.55)}
.cm-pet-ava .mood{position:absolute;top:-10px;right:-10px;font-size:30px;animation:cmPetBob 1.6s ease-in-out infinite}
.cm-pet-ava.hiss .pe{animation:cmHiss .5s linear 1}
.cm-pet-ava.whine .pe{animation:cmWhine 1s ease-in-out 1}
.cm-pet-ava.puff .pe{animation:cmPuff .9s var(--spring) 1}
.cm-pet-ava.joy .pe{animation:cmJoy .7s var(--spring) 1}
.cm-pet-say{position:absolute;left:50%;top:-6px;z-index:5;transform:translate(-50%,0) scale(.4);opacity:0;background:#fff;border:2.5px solid var(--ink);border-radius:16px;padding:6px 10px;font-weight:900;font-size:15px;white-space:nowrap;box-shadow:0 3px 0 var(--ink);pointer-events:none;animation:cmSay 1.6s var(--spring) forwards}
.cm-pet-say.bad{background:var(--coral,#ff8a7a)}
.cm-pet-name{font-family:var(--font-display);font-size:26px;line-height:1}
.cm-pet-st{flex:1;min-width:0}
.cm-pet-bar{margin-top:7px}
.cm-pet-bar .l{display:flex;justify-content:space-between;font-size:12px;font-weight:800}
.cm-pet-bar .progress{height:9px;margin-top:3px}
.cm-pet-acts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
.cm-pet-acts .btn{padding:0 4px;height:56px;flex-direction:column;gap:0;font-size:12px;line-height:1.1}
.cm-pet-acts .btn .e{font-size:20px}
.cm-pet-acts .btn[disabled]{opacity:.45}
.cm-pet-line{margin-top:12px;font-weight:700;font-size:13px;line-height:1.35}
.cm-adopt{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.cm-adopt button{border:2.5px solid var(--ink);border-radius:20px;background:#fff;padding:10px 4px;font-weight:800;font-size:12px;box-shadow:0 3px 0 var(--ink);transition:transform .25s var(--spring)}
.cm-adopt button .e{font-size:40px;display:block}
.cm-adopt button.on{background:var(--lime);transform:translateY(-3px) rotate(-3deg)}
.cm-name-in{width:100%;height:46px;border:2.5px solid var(--ink);border-radius:14px;padding:0 14px;font:inherit;font-weight:800;font-size:16px;margin-top:10px;background:#fff;box-sizing:border-box}
@keyframes cmPetIdle{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-6px) rotate(-4deg)}60%{transform:translateY(0) rotate(3deg)}}
@keyframes cmPetSad{0%,100%{transform:translateY(4px) rotate(-2deg)}50%{transform:translateY(7px) rotate(2deg)}}
@keyframes cmPetBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes cmHiss{0%,100%{transform:translateX(0) scale(1.08)}20%{transform:translateX(-7px) scale(1.15)}40%{transform:translateX(7px) scale(1.15)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
@keyframes cmWhine{0%,100%{transform:rotate(0) translateY(0)}30%{transform:rotate(-10deg) translateY(8px) scaleY(.9)}70%{transform:rotate(8deg) translateY(8px) scaleY(.9)}}
@keyframes cmPuff{0%,100%{transform:scale(1)}40%{transform:scale(1.35,1.1)}70%{transform:scale(1.25,1.05) rotate(180deg)}}
@keyframes cmJoy{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-18px) scale(1.12) rotate(-8deg)}}
@keyframes cmSay{0%{opacity:0;transform:translate(-50%,10px) scale(.4)}18%{opacity:1;transform:translate(-50%,-26px) scale(1.1)}30%{transform:translate(-50%,-22px) scale(1)}80%{opacity:1;transform:translate(-50%,-30px) scale(1)}100%{opacity:0;transform:translate(-50%,-44px) scale(.9)}}
`;
    document.head.appendChild(st);
  })();

  /* ---------- Общие помощники ---------- */
  const PAL = ["c-yellow", "c-pink", "c-lime", "c-sky", "c-orange", "c-mint", "c-lilac", "c-coral"];
  const P = (o) => `data-params='${JSON.stringify(o)}'`;
  const cart = V.cart;

  // Наполнить контейнер и перезапустить каскад
  function fill(el, html) {
    if (!el) return;
    el.innerHTML = html;
    [...el.children].forEach((c, i) => c.style.setProperty("--i", i));
  }
  // Кнопка «+» или степпер
  function ctlInner(svc, id) {
    const q = cart.qty(svc, id);
    return q
      ? `<div class="stepper"><button data-dec="${id}" aria-label="Минус">−</button><span>${q}</span><button data-inc="${id}" aria-label="Плюс">+</button></div>`
      : `<button class="add" data-add="${id}" aria-label="В корзину">+</button>`;
  }
  const ctl = (svc, id) => `<div class="cm-ctl" data-ctl="${id}" data-svc="${svc}">${ctlInner(svc, id)}</div>`;
  function refreshCtl(svc, id, bump) {
    document.querySelectorAll(`.cm-ctl[data-svc="${svc}"]${id ? `[data-ctl="${id}"]` : ""}`).forEach((el) => {
      el.innerHTML = ctlInner(svc, el.dataset.ctl);
      if (bump) FX.bump(el.firstElementChild);
    });
  }
  // Док корзины (липнет к низу экрана)
  const dock = (svc, opts) => `<div class="cm-spacer"></div><div class="cm-dock">${cart.bar(svc, opts)}</div>`;

  // Лайк
  function toggleLike(btn) {
    const key = btn.dataset.like;
    const liked = Object.assign({}, S().liked || {});
    const on = !liked[key];
    if (on) liked[key] = 1; else delete liked[key];
    V.state.set({ liked });
    btn.classList.toggle("on", on);
    FX.bump(btn);
    if (on) {
      FX.sound.like(); FX.haptic(12);
      FX.burst(btn, { emojis: ["❤️", "💖", "💕", "💗"], count: 12, spread: 90 });
    } else FX.sound.pop();
  }
  const likeBtn = (key, emo = "❤️") => `<button class="like ${(S().liked || {})[key] ? "on" : ""}" data-like="${key}" aria-label="Нравится">${emo}</button>`;

  // Универсальный обработчик +/−/лайк. Возвращает true, если клик обработан.
  function shopClick(e, svc, find, { before, after } = {}) {
    const lk = e.target.closest("[data-like]");
    if (lk) { e.stopPropagation(); e.preventDefault(); toggleLike(lk); return true; }
    const a = e.target.closest("[data-add],[data-inc],[data-dec]");
    if (!a) return false;
    e.stopPropagation(); e.preventDefault();
    const id = a.dataset.add || a.dataset.inc || a.dataset.dec;
    if (a.dataset.dec) {
      cart.remove(svc, id);
      FX.sound.pop();
      refreshCtl(svc, id, true);
      return true;
    }
    const p = find(id);
    if (!p) return true;
    if (before && before(p, a) === false) return true;
    const t0 = cart.total(svc);
    cart.add(svc, { id: p.id, name: p.name, price: p.price, emo: p.emo }, a);
    FX.burst(a, { emojis: [p.emo, "✨", "+1"], count: 7, spread: 70, size: [16, 26] });
    refreshCtl(svc, id, true);
    after && after(p, t0, a);
    return true;
  }

  // Карточка товара
  function prodCard(svc, p, { likeKey = null, open = false, owned = false } = {}) {
    return `<div class="card prod ${open ? "tap" : ""} ${owned ? "cm-owned" : ""}" ${open ? `data-open="${p.id}"` : ""}>
      <div class="pic ${p.col}">
        <span class="emo ${p.anim || "float"} d${p.d || 0}">${p.emo}</span>
        ${p.st ? `<div class="sticker" style="background:${p.stc || "var(--yellow)"}">${p.st}</div>` : ""}
        ${likeKey ? likeBtn(likeKey) : ""}
        ${p.left ? `<span class="badge" style="background:var(--pink)">🔥 Осталось ${p.left} шт.</span>` : ""}
      </div>
      <div class="name">${p.name}</div>
      ${p.sub ? `<div class="muted" style="font-size:11px;font-weight:700;margin-top:-4px">${p.sub}</div>` : ""}
      ${p.bonus ? bonusChips(p.bonus) : ""}
      <div class="row">
        <div><div class="price">${rub(p.price)}</div>${p.old ? `<div class="old-price">${rub(p.old)}</div>` : ""}</div>
        ${owned ? `<span class="cm-own">✅ Уже есть</span>` : ctl(svc, p.id)}
      </div>
    </div>`;
  }
  // Бонусы вещей из Vibe.inv → чипы «+12% к сну»
  const BONUS_TXT = {
    sleep: ["sl", (v) => `😴 +${v}% к сну`],
    mood: ["", (v) => `😊 +${v} к настроению`],
    energy: ["en", (v) => `⚡ +${v} к энергии`],
    health: ["", (v) => `💚 +${v} к здоровью`],
    look: ["lk", (v) => `💅 +${v} к внешности`],
    steps: ["", (v) => `👟 +${v}% к шагам`],
  };
  function bonusChips(bonus) {
    const list = Object.entries(bonus || {}).filter(([k, v]) => v && BONUS_TXT[k]);
    return list.length ? `<div class="cm-bon">${list.map(([k, v]) => `<span class="${BONUS_TXT[k][0]}">${BONUS_TXT[k][1](v)}</span>`).join("")}</div>` : "";
  }
  const owns = (id) => !!(V.inv && V.inv.has(id));
  const chipsHtml = (list, on = 0, attr = "data-cat") =>
    `<div class="chips">${list.map((c, i) => `<button class="chip ${i === on ? "on" : ""}" ${attr}="${i}">${c}</button>`).join("")}</div>`;
  function chipOn(btn) {
    btn.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === btn));
    FX.bump(btn);
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
  const zab = (mood, text, id = "") => `<div class="cm-zab"><div ${id ? `id="${id}-m"` : ""}>${V.zabotik(56, mood)}</div><div class="cm-bubble" ${id ? `id="${id}"` : ""}>${text}</div></div>`;
  const pad2 = (n) => String(n).padStart(2, "0");
  const hms = (s) => `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`;

  // После оплаты обычной корзины: обновить кнопки и порадоваться
  function paidModal(text, emo = "🎉") {
    return (order) => {
      setTimeout(() => refreshCtl(order.svc), 50);
      V.modal(`<div class="m-emo float">${emo}</div><div class="display">Оплачено!</div><p>${text}</p><button class="btn black block" data-close>Вайбово 🔥</button>`);
    };
  }

  /* ============================================================
     VIBE EAT — данные
     ============================================================ */
  const DRINKS = ["Напитки", [["Лимонад «Вайб»", 190, "🍋", "Газированный, как твои мысли"], ["Морс домашний", 160, "🧃", "Дом не наш, морс — наш"], ["Вода без газа", 90, "💧", "Просто вода. Без подвоха. Почти"]]];
  const RESTS = [
    { id: "1", name: "Смэш Бро", emo: "🍔", col: "c-yellow", cat: 0, rating: 4.9, rev: "3,2 тыс.", time: "25–35", lvl: "₫₫", promo: "−20%*", tag: "Хит района",
      menu: [["Хиты", [["Двойной смэш", 490, "🍔", "Две котлеты, одна мечта, ноль сожалений"], ["Чизбургер-вайб", 390, "🧀", "Сыр тянется до следующей зарплаты"], ["Бургер «Без булки»", 450, "🥬", "Для тех, кто «я только посмотреть»"]]], ["Закуски", [["Картошка фри", 190, "🍟", "Хрустит громче, чем твой бывший"], ["Луковые кольца", 220, "🧅", "Не плачь, это лук"], ["Наггетсы ×9", 290, "🍗", "Девять. Потому что десять — банально"]]]] },
    { id: "2", name: "Сушивёрс", emo: "🍣", col: "c-pink", cat: 1, rating: 4.8, rev: "5,1 тыс.", time: "35–45", lvl: "₫₫₫", promo: "Ролл в подарок*", tag: "Новинка",
      menu: [["Роллы", [["Филадельфия ×8", 690, "🍣", "Сыра больше, чем рыбы. Как ты любишь"], ["Калифорния", 590, "🦀", "Краб настоящий. Почти. Морально"], ["Запечённый «Вулкан»", 640, "🌋", "Горячий, как твой краш"]]], ["Сеты", [["Сет «На одного»", 1490, "🍱", "24 штуки. Никто не узнает"], ["Сет «Свидание»", 1990, "💘", "Палочки — 2 шт. Шансы — 50/50"], ["Мисо-суп", 290, "🥣", "Тёплый, как поддержка мамы"]]]] },
    { id: "3", name: "Рамен-бар «Мисо»", emo: "🍜", col: "c-orange", cat: 2, rating: 4.9, rev: "2,8 тыс.", time: "30–40", lvl: "₫₫", promo: "Бульон 12 ч", tag: "Топ-1",
      menu: [["Рамены", [["Тонкоцу", 590, "🍜", "Бульон варили дольше, чем ты спишь"], ["Острый мисо", 560, "🌶️", "Острота: «позвоните маме»"], ["Шою с уткой", 640, "🦆", "Утка не против. Мы спрашивали"]]], ["Гёдза и баны", [["Гёдза ×6", 320, "🥟", "Шесть маленьких поводов жить"], ["Бао со свининой", 280, "🫓", "Мягкий, как дедлайн по пятницам"], ["Онигири", 190, "🍙", "Треугольный. Смирись"]]]] },
    { id: "4", name: "Тесто и Вайб", emo: "🍕", col: "c-coral", cat: 3, rating: 4.7, rev: "6,4 тыс.", time: "25–35", lvl: "₫₫", promo: "2 = 3*", tag: "Ночью −0%",
      menu: [["Пиццы 30 см", [["Пепперони", 590, "🍕", "Классика. Как спор про ананасы"], ["Четыре сыра", 640, "🧀", "Четыре. Мы считали дважды"], ["С ананасами", 610, "🍍", "Да, мы это сделали. Нет, не стыдно"]]], ["К пицце", [["Сырные палочки", 290, "🥖", "Палочки-выручалочки"], ["Соус «Чесночный»", 60, "🧄", "Свидания после — на свой риск"], ["Крылышки BBQ", 390, "🍗", "Летать не умеют. Уже"]]]] },
    { id: "5", name: "Шаурма Эстетик", emo: "🌯", col: "c-lime", cat: 4, rating: 4.95, rev: "11 тыс.", time: "15–25", lvl: "₫", promo: "Сырный лаваш 0 ₫", tag: "Легенда",
      menu: [["Шаурма", [["Классическая", 290, "🌯", "Та самая. Из твоих лучших 3 ночи"], ["Сырная", 340, "🧀", "Сыр внутри, сыр снаружи, сыр в душе"], ["Веган-шаурма", 360, "🥙", "Без мяса. С чувством превосходства"]]], ["Добавки", [["Двойное мясо", 120, "🥩", "Для серьёзных намерений"], ["Халапеньо", 50, "🌶️", "Плюс 3 к смелости"], ["Картошка по-деревенски", 190, "🥔", "Деревни нет. Картошка есть"]]]] },
    { id: "6", name: "Сахарный кризис", emo: "🍩", col: "c-lilac", cat: 5, rating: 4.8, rev: "1,9 тыс.", time: "30–50", lvl: "₫₫", promo: "Сладко −15%", tag: "💅 Эстетика",
      menu: [["Десерты", [["Пончик «Глазурь»", 190, "🍩", "Круглый, как твой план на понедельник"], ["Чизкейк Сан-Себастьян", 390, "🍰", "Сожжён специально. Так модно"], ["Макаруны ×6", 450, "🌈", "Шесть цветов, ноль пользы, сто счастья"]]], ["Кофе", [["Раф «Лаванда»", 290, "☕", "Пахнет как бабушкин шкаф. В хорошем смысле"], ["Матча-латте", 320, "🍵", "Зелёный. Полезный. Наверное"], ["Какао с маршмеллоу", 260, "🍫", "Детство в стакане"]]]] },
    { id: "7", name: "Боул и точка", emo: "🥗", col: "c-mint", cat: 6, healthy: true, rating: 4.6, rev: "980", time: "20–30", lvl: "₫₫₫", promo: "ЗОЖ-кэшбек ×2", tag: "🌱 Полезно",
      menu: [["Боулы", [["Поке с лососем", 690, "🐟", "Рис, рыба и ощущение, что ты молодец"], ["Боул с киноа", 590, "🥗", "Киноа — это крупа, а не кино"], ["Цезарь (лайт)", 520, "🥬", "Лайт — это про цену. Шучу. Нет"]]], ["Смузи", [["Зелёный детокс", 350, "🥤", "Детоксит всё, кроме карты"], ["Ягодный буст", 330, "🫐", "Буст настроения +12%*"], ["Протеиновый", 390, "💪", "Мышцы не прилагаются"]]]] },
    { id: "8", name: "Вок-н-ролл", emo: "🥡", col: "c-sky", cat: 1, rating: 4.7, rev: "4,4 тыс.", time: "25–40", lvl: "₫", promo: "Палочки бесплатно", tag: "Дёшево",
      menu: [["Воки", [["Удон с курицей", 420, "🍝", "Длинный, как очередь в МФЦ"], ["Рис с креветками", 490, "🍤", "Креветки маленькие, но гордые"], ["Фунчоза овощная", 380, "🥢", "Прозрачная, как наши условия*"]]], ["Роллы", [["Ролл с огурцом", 190, "🥒", "Минимализм на тарелке"], ["Темпура-ролл", 450, "🍤", "Обжарен в кляре и в мечтах"], ["Спринг-роллы ×4", 290, "🌯", "Весна круглый год"]]]] },
  ];
  const EAT_CATS = ["🔥 Все", "🍔 Бургеры", "🍣 Суши", "🍜 Рамен", "🍕 Пицца", "🌯 Шаурма", "🍩 Десерты", "🥗 Здоровое"];
  // Плоский список блюд с id
  function menuOf(r) {
    return [...r.menu, DRINKS].map((sec, si) => ({
      title: sec[0],
      items: sec[1].map((it, ii) => ({ id: `e${r.id}-${si}-${ii}`, name: it[0], price: it[1], emo: it[2], desc: it[3], col: PAL[(si * 3 + ii + +r.id) % PAL.length] })),
    }));
  }
  const restById = (id) => RESTS.find((r) => r.id === String(id)) || RESTS[0];
  // Доставка до дома по улицам города (Vibe.map): км и минуты курьера
  const kmRu = (k) => String(k).replace(".", ",") + " км";
  function deliv(id) {
    const M = V.map;
    if (!M) return { km: 0, min: 30 };
    const pts = M.path(M.place("restaurant:" + id), M.place("home"));
    return { km: M.km(pts), min: M.minutes(pts, "courier") };
  }
  // Питание: «полезные» кухни тянут nutrition вверх, остальные — сытно, но вниз
  const nutBadge = (r) => r.healthy
    ? `<span class="badge cm-nut" style="background:var(--lime)">🥗 Питание ↑ · полезно</span>`
    : `<span class="badge w cm-nut">🍔 Сытно · питание ↓</span>`;
  const byDist = (list) => list.map((r) => [r, deliv(r.id).min]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);

  function restCard(r) {
    const d = deliv(r.id);
    return `<div class="card tap cm-rest" data-go="eat-place" ${P({ id: r.id })}>
      <div class="cm-rest-pic ${r.col}">
        <span class="bg">${r.emo}</span>
        <span class="emo float d${+r.id % 4}">${r.emo}</span>
        <div class="sticker" style="background:var(--paper)">${r.promo}</div>
        ${likeBtn("eat-" + r.id)}
      </div>
      <div class="cm-rest-body">
        <div class="cm-row"><b class="nm">${r.name}</b><span class="badge" style="background:var(--yellow)">${r.tag}</span></div>
        <div class="cm-meta">
          <span class="badge">⭐ ${String(r.rating).replace(".", ",")}</span>
          <span class="badge w">🛵 ${d.min} мин</span>
          <span class="badge w">📍 ${kmRu(d.km)}</span>
          <span class="badge w">${r.lvl}</span>
          ${nutBadge(r)}
          <span class="muted" style="font-size:12px;font-weight:700">${r.rev} отзывов</span>
        </div>
      </div>
    </div>`;
  }

  /* ---------- Экран: Vibe Eat ---------- */
  V.screen("eat", {
    render() {
      const hot = RESTS.map((r, i) => { const m = menuOf(r)[0].items[0]; return { r, m, i }; });
      const near = byDist(RESTS);
      const fast = deliv(near[0].id).min;
      return `
      ${ui.head("Vibe Eat", `📍 Дом · ближайшая кухня в ${fast} мин*`, ui.vibikiPill())}
      <div class="hero c-orange" style="min-height:190px">
        <div class="sticker" style="top:14px;right:14px;background:var(--lime)" id="eat-timer">−50% · 00:59</div>
        <div class="display">Голоден?<br>Мы тоже.</div>
        <p>Еда из 8 000 ресторанов. Привезём горячей. Или тёплой. Или как получится.</p>
        <div class="hero-emo emo float">🍔</div>
      </div>
      <div class="field tap" style="margin-top:16px" id="eat-search">🔎 <span class="muted">Найти шаурму своей мечты</span></div>
      <div style="margin-top:12px">${chipsHtml(EAT_CATS)}</div>

      <h2 class="sec">Жарко сейчас 🔥<small>заказывают каждые 3 сек</small></h2>
      <div class="hscroll stagger">
        ${hot.map(({ r, m, i }) => `<div class="card cm-hot tap" data-go="eat-place" ${P({ id: r.id })}>
          <div class="pic ${m.col}"><span class="emo wobble">${m.emo}</span></div>
          <b>${m.name}</b>
          <div class="muted" style="font-size:11px;font-weight:700;margin:2px 0 6px">${r.name}</div>
          <div class="cm-row"><span class="price">${rub(m.price)}</span><span class="badge" style="background:var(--pink)">🔥 ${(1.2 + i * 0.3).toFixed(1).replace(".", ",")}k</span></div>
        </div>`).join("")}
      </div>

      <div class="card cm-promo tap c-yellow" id="eat-promo" style="margin-top:6px">
        ${V.zabotik(54, "sly")}
        <div style="flex:1"><div class="muted" style="font-size:12px;font-weight:800">Вайбот дарит промокод</div><div class="cm-code">VIBE30</div><div style="font-size:12px;font-weight:700">Тапни, чтобы скопировать</div></div>
        <span class="emo pulse" style="font-size:34px">🎟️</span>
      </div>

      ${ui.marquee(["Бесплатная доставка*", "Кэшбек вайбиками", "Курьеры с рейтингом 4.98", "*от 9 999 ₫"])}

      <h2 class="sec">Рестораны рядом<small id="eat-count">${RESTS.length} мест · ближе к дому — выше</small></h2>
      <div class="stack stagger" id="eat-list">${near.map((r) => restCard(r)).join("")}</div>
      <div class="fine">*Доставка за 30 минут указана для курьеров, которые бегут. Не все курьеры бегут. Рейтинги ресторанов формируются на основе отзывов, оценок и настроения алгоритма. «Бесплатная доставка» бесплатна только для доставки.</div>`;
    },
    mount(root) {
      let left = 59;
      const timer = root.querySelector("#eat-timer");
      const iv = setInterval(() => {
        left--;
        if (left < 0) { left = 59; FX.bump(timer); }
        timer.textContent = `−50% · 00:${pad2(left)}`;
      }, 1000);
      root.addEventListener("click", (e) => {
        const lk = e.target.closest("[data-like]");
        if (lk) { e.stopPropagation(); e.preventDefault(); toggleLike(lk); return; }
        const c = e.target.closest("[data-cat]");
        if (c) {
          chipOn(c);
          const i = +c.dataset.cat;
          const list = byDist(i === 0 ? RESTS : RESTS.filter((r) => r.cat === i - 1));
          fill(root.querySelector("#eat-list"), list.map((r) => restCard(r)).join(""));
          root.querySelector("#eat-count").textContent = `${list.length} ${list.length === 1 ? "место" : list.length < 5 ? "места" : "мест"}`;
          return;
        }
        if (e.target.closest("#eat-promo")) {
          const el = root.querySelector("#eat-promo");
          FX.bump(el); FX.sound.success();
          FX.burst(el, { emojis: ["🎟️", "✨", "💸", "🎉"], count: 16 });
          try { navigator.clipboard && navigator.clipboard.writeText("VIBE30"); } catch (er) {}
          FX.toast("Скопировано! Действует на заказы от 9 999 ₫ по вторникам", "🎟️", 3000);
          return;
        }
        if (e.target.closest("#eat-search")) {
          FX.shake(root.querySelector("#eat-search"));
          FX.toast("Поиск временно ищет себя. Листай вниз 👇", "🔎");
        }
      });
      return () => clearInterval(iv);
    },
  });

  /* ---------- Экран: меню ресторана ---------- */
  V.screen("eat-place", {
    render(params) {
      const r = restById(params.id);
      const menu = menuOf(r);
      const other = cart.count("eat") && S().eatPlace && S().eatPlace !== r.id;
      const d = deliv(r.id);
      return `
      ${ui.head(r.name, `⭐ ${String(r.rating).replace(".", ",")} · ${r.rev} отзывов`, likeBtn("eat-" + r.id).replace('class="like', 'class="like icon-btn'))}
      <div class="cm-place-head ${r.col}">
        <div class="sticker" style="top:14px;right:14px">${r.promo}</div>
        <div class="display">${r.name}</div>
        <div class="cm-meta" style="position:relative;z-index:1;max-width:66%">
          <span class="badge w">🛵 ${d.min} мин</span><span class="badge w">📍 ${kmRu(d.km)} до дома</span><span class="badge w">${r.lvl}</span><span class="badge">${r.tag}</span>${nutBadge(r)}
        </div>
        <div class="big emo float">${r.emo}</div>
      </div>
      ${other ? `<div class="card flat c-yellow" style="margin-top:12px;font-weight:700;font-size:13px">⚠️ В корзине блюда из «${restById(S().eatPlace).name}». Добавишь отсюда — корзина обнулится. Одна кухня — один вайб.</div>` : ""}
      <div style="margin-top:14px">${chipsHtml(menu.map((s) => s.title), 0, "data-sec")}</div>
      ${menu.map((s, si) => `
        <h2 class="sec" id="sec-${si}">${s.title}<small>${s.items.length} позиции</small></h2>
        <div class="stack stagger">
          ${s.items.map((it) => `<div class="card cm-dish">
            <div class="pic ${it.col}"><span class="emo float d${(si + it.price) % 4}">${it.emo}</span></div>
            <div class="tx"><b>${it.name}</b><small>${it.desc}</small>
              <div class="cm-row"><span class="price">${rub(it.price)}</span>${ctl("eat", it.id)}</div>
            </div>
          </div>`).join("")}
        </div>`).join("")}
      <div class="fine">Фото блюд не соответствуют действительности, потому что их нет. Вес указан до приготовления, после — указан вам. Острота блюд субъективна, но претензии — объективно нет.</div>
      ${dock("eat", { label: "К оплате", txTitle: "Vibe Eat · " + r.name, col: r.col, onCheckout: () => eatCheckout(r) })}`;
    },
    mount(root, params) {
      const r = restById(params.id);
      const all = menuOf(r).flatMap((s) => s.items);
      let adds = 0;
      cart.renderBar("eat");
      root.addEventListener("click", (e) => {
        const sec = e.target.closest("[data-sec]");
        if (sec) {
          chipOn(sec);
          const h = root.querySelector("#sec-" + sec.dataset.sec);
          if (h) root.scrollTo({ top: h.offsetTop - 70, behavior: "smooth" });
          return;
        }
        shopClick(e, "eat", (id) => all.find((x) => x.id === id), {
          before() {
            if (cart.count("eat") && S().eatPlace && S().eatPlace !== r.id) {
              const old = restById(S().eatPlace).name;
              cart.clear("eat");
              cart.renderBar("eat");
              refreshCtl("eat");
              FX.toast(`Корзина из «${old}» очищена. Одна кухня — один вайб`, "🧹", 2800);
            }
            V.state.set({ eatPlace: r.id });
          },
          after(p) {
            adds++;
            if (adds === 3) setTimeout(() => FX.toast("Вайбот: возьми напиток. Без него еда грустит", "🥤"), 600);
            if (adds === 6) setTimeout(() => FX.toast("Ого, вечеринка? Кэшбек растёт 📈", "🥳"), 600);
          },
        });
      });
    },
  });

  function eatCheckout(r) {
    const sub = cart.total("eat");
    cart.checkout("eat", {
      title: `Заказ из «${r.name}»`,
      fees: [
        { t: "Сервисный сбор", a: 79 },
        { t: "Сбор за сервисный сбор", a: 19 },
        { t: "Доставка", a: sub >= 1500 ? 0 : 99 },
        { t: "Упаковка упаковки", a: 15 },
        { t: "Чаевые курьеру (заранее, на всякий)", a: 30 },
      ],
      onPaid(order) {
        V.state.set({ eatTrack: { id: order.id, place: r.id, total: order.total } });
        // Ядро уже применило body "eat_out" по заголовку «Vibe Eat · …» (сытость, низкое качество еды).
        // Для полезной кухни дополнительно зовём "healthy" тихо: он добавляет приём пищи с q=92,
        // и nutrition подтягивается вверх — иначе боул ничем не отличался бы от шаурмы.
        if (r.healthy && V.body) {
          V.body.effect("healthy", { quiet: true });
          setTimeout(() => FX.toast("Полезный заказ: питание в Vibe Fit подросло 🥗", "💚", 2400), 1200);
        }
        setTimeout(() => V.go("eat-track", { id: order.id }), 450);
      },
    });
  }

  /* ---------- Экран: трекинг заказа (на общей карте города) ---------- */
  // ?src=supermarket — те же дофамины для продуктов
  const COURIERS = {
    eat: {
      name: "Тимур", veh: "🛵", ava: "🧑🏻‍🦱", info: "⭐ 4.98 · 12 408 доставок · самокат «Молния-3»",
      steps: [
        ["👨‍🍳", "Готовят", "Повар смотрит на твой заказ с уважением"],
        ["🛵", "Курьер забрал", "Тимур надел шлем и уверенность"],
        ["📍", "Рядом", "Тимур в 300 метрах. Или в 3 км. GPS не уверен"],
        ["🚪", "У двери", "Выходи! Иначе оставит у соседа"],
      ],
    },
    supermarket: {
      name: "Арсений", veh: "🚲", ava: "🧔🏻", info: "⭐ 4.97 · 8 113 доставок · велосипед «Ветер-1»",
      steps: [
        ["🧺", "Собирают", "Сборщик выбирает самый мятый банан"],
        ["🚲", "Курьер забрал", "Арсений крутит педали и надежды"],
        ["📍", "Рядом", "Арсений в 300 метрах. Пакет держится"],
        ["🚪", "У двери", "Выходи! Яйца целы. Почти все"],
      ],
    },
  };
  function trackSrc(params) {
    const sm = params.src === "supermarket";
    const tr = S().eatTrack || {};
    const r = sm ? null : restById(tr.place || "1");
    const M = V.map;
    const from = M.place(sm ? "supermarket" : "restaurant:" + r.id);
    const home = M.place("home");
    const pts = M.path(from, home);
    return { sm, r, name: sm ? "Vibe Supermarket" : r.name, emo: sm ? "🛒" : r.emo, from, home, pts, km: M.km(pts), min: M.minutes(pts, "courier"), C: sm ? COURIERS.supermarket : COURIERS.eat };
  }

  V.screen("eat-track", {
    render(params) {
      const T = trackSrc(params);
      const tr = S().eatTrack || {};
      const C = T.C;
      return `
      ${ui.head(T.sm ? "Продукты в пути" : "Заказ в пути", `№ ${String(params.id || tr.id || "4242").slice(-6)} · ${T.name}`, ui.vibikiPill())}
      <div class="cm-mapw" id="trk-wrap">
        <div class="cm-vm" id="trk-map"></div>
        <div class="cm-eta"><small>ПРИЕДЕТ ЧЕРЕЗ</small><span class="big-num" id="trk-eta">${T.min}</span> <b>мин</b></div>
        <button class="cm-cam" id="trk-cam">🎥 Следить</button>
        <span class="badge cm-km">📏 ${kmRu(T.km)}</span>
      </div>
      <div class="cm-event" id="trk-event"><div class="card tight c-yellow" style="display:flex;gap:10px;align-items:center;font-weight:800;font-size:14px"><span class="emo wobble" style="font-size:30px">🤝</span><span id="trk-event-t">${C.name} встретил друга. +3 мин</span></div></div>
      <div class="progress" style="margin-top:14px"><i id="trk-bar" style="--p:2%"></i></div>

      <div class="card" style="margin-top:16px;padding:6px 16px">
        <div class="cm-steps" id="trk-steps">
          ${C.steps.map((s, i) => `<div class="st ${i === 0 ? "on now" : ""}" data-st="${i}"><div class="ic">${s[0]}</div><div><b>${s[1]}</b><small>${s[2]}</small></div></div>`).join("")}
        </div>
      </div>

      <h2 class="sec">Твой курьер</h2>
      <div class="card c-sky">
        <div class="cm-doc">
          <div class="ava c-yellow"><span class="emo float">${C.ava}</span></div>
          <div style="flex:1"><b>${C.name}</b><small style="color:inherit;opacity:.8">${C.info}</small></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn sm" data-msg style="flex:1">💬 Написать</button>
          <button class="btn sm yellow" data-tip style="flex:1">🪙 Чаевые 50 ₫</button>
          <button class="icon-btn" data-call style="width:38px;height:38px;font-size:16px">📞</button>
        </div>
      </div>
      <div style="margin-top:16px">${zab("sly", T.sm ? `Обещали 15 минут, навигатор говорит ${T.min}. Правы оба: 15 — это маркетинговые минуты 😏` : "Пока ждёшь — может, закажешь десерт? Курьер всё равно ещё не доехал 😏")}</div>
      <div class="fine">Время доставки — оценочное и зависит от пробок, погоды, ретроградного Меркурия и личной жизни курьера. Компенсация за опоздание выплачивается вайбиками по курсу 1 к 0.</div>`;
    },
    mount(root, params) {
      const T = trackSrc(params);
      const C = T.C;
      const tr = S().eatTrack || {};
      const orderId = String(params.id || tr.id || "4242");
      const M = V.map;
      const srcPin = { id: "src", x: T.from.x, y: T.from.y, e: T.emo, label: T.name, color: "#ffe14d", pulse: true };
      const ctrl = M.create(root.querySelector("#trk-map"), { pins: M.basePins([srcPin]), fit: T.pts });
      const wrap = root.querySelector("#trk-wrap");
      const etaEl = root.querySelector("#trk-eta");
      const bar = root.querySelector("#trk-bar");
      const ev = root.querySelector("#trk-event");
      const evT = root.querySelector("#trk-event-t");
      const cam = root.querySelector("#trk-cam");
      const stepsEl = [...root.querySelectorAll("[data-st]")];
      const timeouts = [];
      const later = (fn, ms) => timeouts.push(setTimeout(fn, ms));
      // Реальное время доставки: 25–40 сек, из них ~четверть — готовка
      const TOTAL = Math.max(25, Math.min(40, 25 + T.km * 3));
      const PREP = TOTAL * 0.24;
      let phase = "cook", cookT = 0, k = 0, last = performance.now(), raf = 0, alive = true, step = 0;
      let eventDone = false, extra = 0, lastEta = -1, lastBar = -1, follow = false, drv = null;
      // Доставка идёт в реальном времени и не начинается заново при повторном входе
      const starts = Object.assign({}, S().trackStarts || {});
      if (!starts[orderId]) { starts[orderId] = Date.now(); V.state.set({ trackStarts: Object.fromEntries(Object.entries(starts).slice(-20)) }); }
      const elapsed = (Date.now() - starts[orderId]) / 1000;
      const doneBefore = !!(S().trackDone || {})[orderId] || elapsed >= TOTAL;
      const markDone = () => V.state.set({ trackDone: Object.fromEntries(Object.entries(Object.assign({}, S().trackDone || {}, { [orderId]: true })).slice(-20)) });
      const vehEmo = () => ctrl.svg.querySelector(".vm-veh .vm-emo");
      later(() => alive && ctrl.route(T.pts, { color: "#ff6bcb" }), 300);

      function setStep(i) {
        if (!alive) return;
        stepsEl.forEach((el, n) => { el.classList.toggle("on", n <= i); el.classList.toggle("now", n === i && i < 3); });
        const ic = stepsEl[i].querySelector(".ic");
        FX.burst(ic, { emojis: [C.steps[i][0], "✨", "⭐", "💚"], count: 14, spread: 110 });
        FX.sound.success(); FX.haptic([10, 30, 10]);
        FX.toast(C.steps[i][1] + "!", C.steps[i][0], 1600);
      }

      function startDrive(from = 0) {
        phase = "drive"; step = 1;
        if (from) { eventDone = from >= 0.45; if (from >= 0.62) step = 2; stepsEl.forEach((el, n) => { el.classList.toggle("on", n <= step); el.classList.toggle("now", n === step); }); }
        else later(() => setStep(1), 0);
        drv = ctrl.drive(T.pts, {
          emoji: C.veh, color: "#ff6bcb", duration: (TOTAL - PREP) * 1000, start: from,
          onProgress(kk, p) {
            k = kk;
            if (follow && p) ctrl.fit([{ x: p.x - 150, y: p.y - 150 }, { x: p.x + 150, y: p.y + 150 }], 0, true);
          },
          onDone() { later(arrive, 0); },
        });
      }

      // Сатира: курьер встретил друга — машинка встаёт на паузу
      function friend() {
        if (!alive || !drv) return;
        drv.pause(); extra = 3;
        const emo = vehEmo();
        if (emo) emo.textContent = "🧍";
        ev.classList.add("on"); FX.shake(wrap); FX.toast(`${C.name} встретил друга. +3 мин`, "🤝");
        later(() => { evT.textContent = "Обсуждают сериал. Важное"; FX.bump(ev); }, 1800);
        later(() => {
          if (!alive) return;
          drv.resume(); extra = 0;
          if (emo) emo.textContent = C.veh;
          evT.textContent = `Друг ушёл. ${C.name} снова в пути! −3 мин`;
          FX.sound.pop(); FX.bump(ev);
          later(() => ev.classList.remove("on"), 1800);
        }, 3600);
      }

      function frame(now) {
        if (!alive) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (phase === "cook") { cookT += dt; if (cookT >= PREP) startDrive(); }
        const prog = phase === "cook" ? cookT / TOTAL : phase === "done" ? 1 : (PREP + k * (TOTAL - PREP)) / TOTAL;
        const eta = phase === "done" ? 0 : Math.max(0, Math.ceil(T.min * (1 - prog)) + extra);
        if (eta !== lastEta) { lastEta = eta; etaEl.textContent = eta; if (extra) FX.bump(etaEl); }
        const bp = Math.max(2, Math.round(prog * 100));
        if (bp !== lastBar) { lastBar = bp; bar.style.setProperty("--p", bp + "%"); }
        if (phase === "drive") {
          if (!eventDone && k >= 0.45) { eventDone = true; later(friend, 0); }
          if (step < 2 && k >= 0.62) { step = 2; later(() => setStep(2), 0); }
        }
        if (phase === "done") return;
        raf = requestAnimationFrame(frame);
      }
      if (doneBefore) {
        // Заказ уже доставлен: показываем итог без повторной поездки и модалки
        phase = "done"; step = 3;
        etaEl.textContent = "0";
        bar.style.setProperty("--p", "100%");
        stepsEl.forEach((el) => { el.classList.add("on"); el.classList.remove("now"); });
        later(() => alive && ctrl.center(T.home, 320), 350);
        if (!(S().trackDone || {})[orderId]) markDone();
      } else {
        if (elapsed >= PREP) { cookT = PREP; startDrive((elapsed - PREP) / (TOTAL - PREP)); }
        else cookT = elapsed;
        raf = requestAnimationFrame(frame);
      }

      function arrive() {
        if (!alive || phase === "done") return;
        markDone();
        phase = "done"; step = 3;
        etaEl.textContent = "0";
        bar.style.setProperty("--p", "100%");
        const emo = vehEmo();
        if (emo) emo.textContent = "🎉";
        setStep(3);
        FX.confetti();
        if (follow) { follow = false; cam.classList.remove("on"); cam.textContent = "🎥 Следить"; }
        ctrl.center(T.home, 320);
        later(() => {
          if (!alive) return;
          let rated = (S().eatRatings || {})[orderId] || 0;
          V.modal(`
            <div class="m-emo float">${C.veh}</div>
            <div class="display">${C.name} у двери!</div>
            <p id="rt-p">Оцени доставку — ${C.name} очень ждёт. Ну, алгоритм ждёт.</p>
            <div class="cm-stars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" class="${n <= rated ? "on" : ""}">⭐</button>`).join("")}</div>
            <button class="btn black block" data-close>${T.sm ? "Забрать пакеты 🛍️" : "Забрать еду 😋"}</button>
            <button class="btn block" data-again style="margin-top:10px">Заказать ещё</button>`, {
            sound: "levelup",
            onMount(m, close) {
              m.addEventListener("click", (e) => {
                if (e.target.closest("[data-again]")) { close(); V.go(T.sm ? "supermarket" : "eat"); return; }
                const s = e.target.closest("[data-star]");
                if (!s) return;
                const n = +s.dataset.star;
                m.querySelectorAll("[data-star]").forEach((b) => {
                  const on = +b.dataset.star <= n;
                  b.classList.toggle("on", on);
                  if (on) setTimeout(() => FX.bump(b), +b.dataset.star * 60);
                });
                FX.burst(s, { emojis: ["⭐", "🌟", "✨", n >= 4 ? "💖" : "😬"], count: 8 + n * 3 });
                FX.sound.like();
                const pEl = m.querySelector("#rt-p");
                pEl.textContent = n === 5 ? `${C.name} получил 5 звёзд и смысл жизни 🥹`
                  : n === 4 ? `Четыре звезды. ${C.name} делает вид, что не расстроен`
                  : n === 3 ? `Мы передали отзыв. ${C.name} уже плачет. Шучу, он не узнает`
                  : `Оценка учтена. ${C.name} отправят на курс «Вайб-доставка 2.0»`;
                FX.bump(pEl);
                const ratings = Object.assign({}, S().eatRatings || {});
                const first = !ratings[orderId];
                ratings[orderId] = n;
                V.state.set({ eatRatings: ratings });
                if (first) V.reward({ vibiki: 10 + n * 6, xp: 15, from: s });
              });
            },
          });
        }, 900);
      }

      root.addEventListener("click", (e) => {
        if (e.target.closest("#trk-cam")) {
          follow = !follow;
          cam.classList.toggle("on", follow);
          cam.textContent = follow ? "🎥 Слежу за курьером" : "🎥 Следить";
          FX.bump(cam); FX.sound.pop();
          if (!follow) ctrl.fit(T.pts, 70);
          else if (phase === "cook") { ctrl.center(T.from, 300); FX.toast("Курьер ещё ждёт заказ. Следим за поваром", "👨‍🍳"); }
          else if (phase === "done") ctrl.center(T.home, 300);
        } else if (e.target.closest("[data-msg]")) {
          FX.sound.pop();
          FX.toast(`${C.name} прочитал и поставил 👍. Это максимум`, "💬", 2600);
          later(() => FX.toast(`${C.name} печатает… передумал`, "⌨️"), 2200);
        } else if (e.target.closest("[data-tip]")) {
          const b = e.target.closest("[data-tip]");
          if (V.pay(50, { title: `Чаевые курьеру · ${C.name}`, emoji: C.veh, col: "c-sky", from: b })) {
            FX.burst(b, { emojis: ["💛", "🪙", C.veh, "✨"], count: 16 });
            FX.toast(`${C.name} почувствовал прилив сил. +0,5 км/ч`, "⚡");
            b.textContent = "💛 Спасибо!"; b.disabled = true;
          }
        } else if (e.target.closest("[data-call]")) {
          FX.shake(e.target.closest("[data-call]"));
          FX.toast("Звонки курьерам доступны в «Плюс Вайб»", "💎");
        }
      });

      return () => { alive = false; cancelAnimationFrame(raf); timeouts.forEach(clearTimeout); ctrl.destroy(); };
    },
  });

  /* ============================================================
     VIBE SUPERMARKET
     ============================================================ */
  const SM_CATS = ["Всё", "🍎 Фрукты", "🥦 Овощи", "🥛 Молочка", "🥖 Хлеб", "🍫 Снеки", "🥤 Напитки", "🧻 Бытовое"];
  const SM = [
    [1, "Бананы, 1 кг", 89, "🍌", "c-yellow", "Жёлтые. Пока"],
    [1, "Авокадо спелый", 129, "🥑", "c-lime", "Спелый через 3 дня. Всегда"],
    [1, "Клубника 250 г", 349, "🍓", "c-pink", "Пахнет летом и ценником"],
    [2, "Огурцы грунтовые", 159, "🥒", "c-mint", "Хрустят на весь подъезд"],
    [2, "Томаты черри", 199, "🍅", "c-coral", "Маленькие, но амбициозные"],
    [2, "Брокколи", 179, "🥦", "c-lime", "Мини-деревья для великанов"],
    [3, "Молоко 3,2%", 99, "🥛", "c-sky", "От коровы с личным брендом"],
    [3, "Сыр «Маасдам»", 389, "🧀", "c-yellow", "Дырки бесплатно"],
    [3, "Яйца С0, 10 шт.", 149, "🥚", "c-lilac", "Курица была в ресурсе"],
    [4, "Багет хрустящий", 79, "🥖", "c-orange", "Французский. По духу"],
    [4, "Круассан", 119, "🥐", "c-yellow", "Сливочный, как твой голос в 8 утра"],
    [5, "Шоколад горький", 159, "🍫", "c-coral", "72% какао, 28% утешения"],
    [5, "Попкорн солёный", 129, "🍿", "c-pink", "Для сериала, который ты уже видел"],
    [6, "Вайб-кола 0,5", 99, "🥤", "c-coral", "Газирует даже настроение"],
    [6, "Вода горная", 69, "💧", "c-sky", "С гор. Каких — секрет"],
    [6, "Кофе в зёрнах", 590, "☕", "c-orange", "Поднимает. Не цены"],
    [7, "Туалетная бумага ×8", 299, "🧻", "c-lilac", "Трёхслойная. Как наши условия"],
    [7, "Губки ×5", 89, "🧽", "c-yellow", "Впитывают всё, кроме проблем"],
  ].map((r, i) => {
    const sale = i % 3 === 1;
    return { id: "sm" + i, cat: r[0], name: r[1], price: r[2], emo: r[3], col: r[4], sub: r[5], old: sale ? Math.round(r[2] / 0.7) : 0, st: sale ? "−30%" : i % 5 === 0 ? "ХИТ" : "", stc: sale ? "var(--yellow)" : "var(--lime)", left: i % 7 === 2 ? 2 : 0, d: i % 4 };
  });

  // После оплаты продуктов — тот же трекинг, что у Vibe Eat, но из супермаркета
  function smPaid(order) {
    setTimeout(() => refreshCtl(order.svc), 50);
    FX.toast("Курьер уже крутит педали. Мороженое не растает. Наверное", "🚲", 2400);
    setTimeout(() => V.go("eat-track", { id: order.id, src: "supermarket" }), 500);
  }

  // Холодильник из Vibe.body: продукты → порции → домашняя еда в Vibe Fit
  function fridgeHtml() {
    const n = (V.body && V.body.get().fridge) || 0;
    const t = cart.total("supermarket");
    const pay = t ? t + 118 + (t >= 1500 ? 0 : 149) : 0;
    const add = t ? Math.max(1, Math.min(12, Math.round(pay / 450))) : 0;
    const word = (k) => (k % 10 === 1 && k % 100 !== 11 ? "порция" : k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 10 || k % 100 >= 20) ? "порции" : "порций");
    return `<span class="fz emo ${n ? "float" : "wobble"}">${n ? "🧊" : "🫙"}</span>
      <div style="flex:1"><b>В холодильнике ${n} ${word(n)}</b>
      <small>${n ? "Продукты превращаются в домашнюю еду в Vibe Fit: завтрак, обед и ужин сами, питание лучше, чем у доставки." : "Пусто. Без продуктов ты ешь перекусы на бегу — Vibe Fit грустит."}${add ? ` Этот заказ — примерно +${add} ${word(add)}.` : ""}</small></div>`;
  }

  V.screen("supermarket", {
    render() {
      const t = cart.total("supermarket");
      const M = V.map;
      const smMin = M ? M.minutes(M.path(M.place("supermarket"), M.place("home")), "courier") : 15;
      return `
      ${ui.head("Vibe Supermarket", `📍 Дом · 15 мин* (навигатор: ${smMin})`, ui.vibikiPill())}
      <div class="hero c-lime">
        <div class="sticker" style="top:14px;right:14px;background:var(--pink)">15 мин ⚡</div>
        <div class="display">Продукты за 15 минут</div>
        <p>Или за 16. Мы не считаем, и ты не считай.</p>
        <div class="hero-emo emo float">🛒</div>
      </div>
      <div class="card c-yellow" style="margin-top:14px" id="sm-free">
        <div class="cm-row"><b style="font-weight:800">🚚 Бесплатная доставка от 1 500 ₫</b><span class="emo wobble" style="font-size:26px">🎯</span></div>
        <div class="progress cm-progress-free"><i id="sm-free-bar" style="--p:${Math.min(100, (t / 1500) * 100)}%"></i></div>
        <div class="muted" style="font-size:12px;font-weight:800;margin-top:6px" id="sm-free-t">${t >= 1500 ? "Готово! Доставка 0 ₫ 🎉" : `Ещё ${rub(1500 - t)} — и курьер везёт бесплатно`}</div>
      </div>
      <div class="card c-sky cm-fridge tap" id="sm-fridge" data-go="fit">${fridgeHtml()}</div>
      <div style="margin-top:14px">${chipsHtml(SM_CATS)}</div>
      <div class="grid2 stagger" id="sm-grid" style="margin-top:6px">${SM.map((p) => prodCard("supermarket", p)).join("")}</div>
      <div class="fine">«−30%» рассчитано от цены, которую мы придумали утром. Курьер сам выбирает спелость авокадо, исходя из личного опыта. 15 минут отсчитываются с момента, когда курьер решил, что пора.</div>
      ${dock("supermarket", { freeFrom: 1500, txTitle: "Vibe Supermarket", col: "c-lime", onPaid: smPaid })}`;
    },
    mount(root) {
      cart.renderBar("supermarket");
      const upd = () => {
        const t = cart.total("supermarket");
        root.querySelector("#sm-free-bar").style.setProperty("--p", Math.min(100, (t / 1500) * 100) + "%");
        root.querySelector("#sm-free-t").textContent = t >= 1500 ? "Готово! Доставка 0 ₫ 🎉" : `Ещё ${rub(1500 - t)} — и курьер везёт бесплатно`;
        const fr = root.querySelector("#sm-fridge");
        if (fr) { const h = fridgeHtml(); if (fr.innerHTML !== h) fr.innerHTML = h; }
      };
      const off = V.state.on(upd);
      root.addEventListener("click", (e) => {
        const c = e.target.closest("[data-cat]");
        if (c) {
          chipOn(c);
          const i = +c.dataset.cat;
          fill(root.querySelector("#sm-grid"), SM.filter((p) => !i || p.cat === i).map((p) => prodCard("supermarket", p)).join(""));
          return;
        }
        shopClick(e, "supermarket", (id) => SM.find((p) => p.id === id), {
          after(p, t0) {
            const t1 = cart.total("supermarket");
            if (t0 < 1500 && t1 >= 1500) {
              setTimeout(() => {
                const barEl = document.querySelector(".cartbar") || root.querySelector("#sm-free");
                FX.burst(barEl, { emojis: ["🚚", "🎉", "💚", "✨", "🆓"], count: 26, spread: 180 });
                FX.burst(root.querySelector("#sm-free"), { emojis: ["🎯", "⭐"], count: 10 });
                FX.bump(root.querySelector("#sm-free"));
                FX.sound.success(); FX.haptic([10, 40, 10]);
                FX.toast("Доставка бесплатная! Мы в шоке не меньше тебя", "🚚", 2800);
              }, 650);
            }
          },
        });
      });
      return off;
    },
  });

  /* ============================================================
     VIBE MARKET
     ============================================================ */
  // kind → категория в Vibe.inv; bonus → эффекты вещи (сон, настроение, внешность…)
  // tab "watch" — отдельная витрина «Часы» (в инвентаре это всё равно cat:"gadget").
  // Часы открывают Vibe Fit: watch_band → шаги/пульс/сон, watch_pro/watch_ultra → всё.
  const MK_CATS = ["✨ Для тебя", "⌚ Часы", "🏠 Для квартиры", "👕 Одежда", "🎧 Гаджеты"];
  const MK_KIND = ["", "watch", "home", "wear", "gadget"];
  const mkInTab = (p, i) => !i || p.kind === MK_KIND[i] || p.tab === MK_KIND[i];
  const MK = [
    { key: "band", inv: "watch_band", tab: "watch", kind: "gadget", name: "Vibe Band", price: 4990, old: 38400, emo: "📿", col: "c-lime", left: 2, rating: "4.9", rev: "31 тыс.", bonus: { health: 2 }, sub: "Шаги, пульс и сон в Vibe Fit. Наконец узнаешь, почему ты так плохо спишь", fit: "👟 Шаги точно · ❤️ Пульс · 😴 Сон" },
    { key: "watchpro", inv: "watch_pro", tab: "watch", kind: "gadget", name: "Vibe Watch", price: 19990, old: 153800, emo: "⌚", col: "c-violet", rating: "4.9", rev: "18 тыс.", bonus: { health: 3, mood: 2 }, sub: "Знает всё: стресс, выгорание, прогноз продуктивности, питание", fit: "Всё из Band + 💼 Продуктивность · 🥗 Питание · 😊 Настроение · 💚 Здоровье" },
    { key: "watchultra", inv: "watch_ultra", tab: "watch", kind: "gadget", name: "Vibe Watch Ultra", price: 59990, old: 461400, emo: "🏆", col: "c-yellow", left: 2, rating: "5.0", rev: "4 тыс.", bonus: { health: 4, mood: 3, look: 6 }, sub: "Для тех, кто не бегает, но мог бы", fit: "Всё из Watch + 🔥 Прогноз выгорания · золотой безель" },
    { key: "mattress", kind: "home", name: "Матрас «Облако сна»", price: 8990, old: 69900, emo: "🛏️", col: "c-lilac", left: 2, rating: "4.9", rev: "7 тыс.", bonus: { sleep: 12 }, sub: "Спишь как в рекламе матрасов" },
    { key: "blackout", kind: "home", name: "Блэкаут-шторы", price: 2490, old: 19200, emo: "🌚", col: "c-violet", rating: "4.8", rev: "4 тыс.", bonus: { sleep: 8 }, sub: "Солнце, до свидания до 11:00" },
    { key: "plant", kind: "home", name: "Монстера «Не убивай меня»", price: 1190, old: 9100, emo: "🪴", col: "c-mint", rating: "4.7", rev: "3 тыс.", bonus: { mood: 3 }, sub: "Поливать раз в неделю. Или вспомнить" },
    { key: "sunset", kind: "home", name: "Лампа-закат", price: 1590, old: 12300, emo: "🌅", col: "c-orange", left: 2, rating: "4.9", rev: "21 тыс.", bonus: { mood: 4 }, sub: "Закат каждый вечер. Даже в ноябре" },
    { key: "coffee", kind: "home", name: "Кофемашина «Будильник»", price: 6990, old: 54000, emo: "☕", col: "c-yellow", rating: "4.8", rev: "9 тыс.", bonus: { energy: 6 }, sub: "Варит кофе и иллюзию продуктивности" },
    { key: "avocado", kind: "home", name: "Плюшевый авокадо XXL", price: 990, old: 7600, emo: "🥑", col: "c-lime", rating: "5.0", rev: "3 тыс.", sizes: ["S", "M", "XXL", "Обнимашка"], bonus: { mood: 2 } },
    { key: "sneakers", kind: "wear", name: "Кроссовки «Облако 3000»", price: 4990, old: 38390, emo: "👟", col: "c-pink", left: 2, sizes: ["39", "40", "41", "42", "43"], rating: "4.9", rev: "12 тыс.", bonus: { look: 8, steps: 5 } },
    { key: "hoodie", kind: "wear", name: "Худи «Главный вайб»", price: 3290, old: 25300, emo: "🧥", col: "c-coral", sizes: ["S", "M", "L", "XL"], rating: "4.8", rev: "6 тыс.", bonus: { look: 6 } },
    { key: "sharks", kind: "wear", name: "Тапки-акулы", price: 790, old: 6100, emo: "🦈", col: "c-blue", left: 2, sizes: ["36–38", "39–41", "42–44"], rating: "4.9", rev: "17 тыс.", bonus: { look: 2, mood: 1 } },
    { key: "glasses", kind: "wear", name: "Очки «Главный герой»", price: 1490, old: 11400, emo: "🕶️", col: "c-lilac", rating: "4.6", rev: "2 тыс.", bonus: { look: 5 } },
    { key: "headphones", kind: "gadget", name: "Наушники «Тишина Про»", price: 2990, old: 22990, emo: "🎧", col: "c-sky", left: 2, rating: "4.8", rev: "8 тыс.", bonus: { mood: 3 } },
    { key: "ringlight", kind: "gadget", name: "Кольцевая лампа для сторис", price: 1290, old: 9900, emo: "💡", col: "c-yellow", rating: "4.9", rev: "21 тыс.", bonus: { look: 3 } },
    { key: "skate", kind: "gadget", name: "Скейт «Вайб-борд»", price: 3990, old: 30700, emo: "🛹", col: "c-coral", rating: "4.7", rev: "1 тыс.", bonus: { mood: 3, steps: 5 } },
    { key: "speaker", kind: "gadget", name: "Колонка «Сосед, прости»", price: 2490, old: 19200, emo: "🔊", col: "c-violet", left: 2, rating: "4.8", rev: "6 тыс.", bonus: { mood: 3 } },
  ].map((p, i) => Object.assign(p, { id: "mk" + i, inv: p.inv || "mk-" + p.key, st: "−" + Math.round((1 - p.price / p.old) * 100) + "%", stc: i % 2 ? "var(--yellow)" : "var(--lime)", d: i % 4 }));
  const mkByInv = (invId) => MK.find((p) => p.inv === invId);
  // Покупка → вещь в инвентаре (Vibe.inv)
  function mkGive(p) {
    if (!V.inv || !p) return false;
    return V.inv.add({ id: p.inv, name: p.name, e: p.emo, cat: p.kind, bonus: Object.assign({}, p.bonus), src: "market" });
  }
  const mkCard = (p) => prodCard("market", p, { likeKey: "mk-" + p.id, open: true, owned: owns(p.inv) });
  const SWATCH = ["#ff6bcb", "#ffe14d", "#c6ff4d", "#8fd8ff", "#0e0e12"];

  function mkDetail(p, root) {
    const mon = Math.ceil((p.price * 3.12) / 36);
    const have = owns(p.inv);
    const vibMax = V.vibikiPay ? V.vibikiPay(p.price) : 0;
    ui.sheet(`
      <div class="cm-bigpic ${p.col}">
        <span class="emo float">${p.emo}</span>
        <div class="sticker" style="background:var(--yellow)">${p.st}</div>
        <div style="position:absolute;top:12px;right:14px">${likeBtn("mk-" + p.id)}</div>
        ${p.left ? `<span class="badge" style="position:absolute;left:12px;bottom:12px;background:var(--pink)">🔥 Осталось ${p.left} шт.</span>` : ""}
      </div>
      <div class="display" style="font-size:24px;margin-top:14px">${p.name}</div>
      <div class="cm-meta"><span class="badge">⭐ ${p.rating}</span><span class="muted" style="font-size:12px;font-weight:700">${p.rev} отзывов (из них ботов — пара тысяч)</span></div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-top:12px"><span class="big-num" style="font-size:34px">${rub(p.price)}</span><span class="old-price" style="font-size:15px">${rub(p.old)}</span></div>
      ${p.bonus ? `<div style="margin-top:10px">${bonusChips(p.bonus)}</div><div class="muted" style="font-size:12px;font-weight:700">${p.kind === "home" ? "Ставится в квартиру — работает каждую ночь и каждый день" : p.kind === "wear" ? "Идёт в гардероб — внешность растёт, лайки тоже" : "Гаджет в карман — бонус навсегда (пока не потеряешь)"}</div>` : ""}
      ${p.fit ? `<div class="card flat c-lime" style="margin-top:12px;font-weight:800;font-size:13px">⌚ Открывает в Vibe Fit: ${p.fit}</div>` : ""}
      ${have ? `<div class="card flat c-mint" style="margin-top:12px;font-weight:800;font-size:13px">✅ Уже есть у тебя. Второй такой бонус не даст — проверено отделом «Хочу ещё»</div>` : ""}
      <div style="font-weight:800;font-size:13px;margin-top:14px">Цвет</div>
      <div style="display:flex;gap:10px;margin-top:8px" data-group="col">${SWATCH.map((c, i) => `<button class="cm-swatch ${i === 0 ? "on" : ""}" data-pick="${i}" style="background:${c}" aria-label="Цвет"></button>`).join("")}</div>
      ${p.sizes ? `<div style="font-weight:800;font-size:13px;margin-top:14px">Размер</div><div class="chips" data-group="size" style="margin-top:4px">${p.sizes.map((s, i) => `<button class="chip ${i === 1 ? "on" : ""}" data-pick="${i}">${s}</button>`).join("")}</div>` : ""}
      ${!have && vibMax > 0 ? `<div class="card tight cm-vibrow"><span style="font-size:26px">🪙</span><div style="flex:1;font-weight:800;font-size:14px">Списать ${V.fmt(vibMax)} вайбиков<div class="muted" style="font-size:12px">1 вайбик = 1 ₫, до 30% цены</div></div><button class="switch" data-vibsw aria-label="Вайбики"></button></div>` : ""}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
        <button class="btn" data-tocart ${have ? "disabled" : ""}>🛒 В корзину</button>
        <button class="btn black" data-buy ${have ? "disabled" : ""}>${have ? "✅ Уже есть" : "Купить сейчас"}</button>
      </div>
      <button class="btn block grad" data-inst style="margin-top:10px" ${have ? "hidden" : ""}>💳 В рассрочку на 36 мес — ${rub(mon)}/мес</button>
      <div class="cm-instal card flat" style="padding:0 14px" data-instbox>
        <div style="padding:12px 0;display:grid;gap:6px">
          <div class="r"><span class="muted">Платёж</span><b>${rub(mon)} × 36</b></div>
          <div class="r"><span class="muted">Платёж за возможность платить</span><b>12 ₫/мес</b></div>
          <div class="r"><span class="muted">Страховка от рассрочки</span><b>9 ₫/мес</b></div>
          <div class="r"><span class="muted">Комиссия за отсутствие комиссии</span><b>0 ₫*</b></div>
          <div class="r"><span class="muted">Итого переплата</span><b style="color:#e5333d">312% 🙃</b></div>
          <div class="fine" style="margin-top:2px">Первый платёж — сегодня, последний — когда ты уже забудешь, что это было. *Кроме случаев, когда не 0 ₫.</div>
          <button class="btn sm pink block" data-instgo>Оформить · ${rub(mon + 21)} сегодня</button>
        </div>
      </div>
      <div class="fine">Цена до скидки установлена за 1 секунду до скидки. Товар «Осталось 2 шт.» — это мы так решили. Доставка 1–3 дня или 1–3 недели.</div>`, {
      onMount(sh, close) {
        let useVib = false;
        const buyBtn = sh.querySelector("[data-buy]");
        sh.addEventListener("click", (e) => {
          const vs = e.target.closest("[data-vibsw]");
          if (vs) {
            useVib = !useVib; vs.classList.toggle("on", useVib); FX.sound.pop();
            buyBtn.textContent = useVib ? `Купить · ${rub(p.price - vibMax)} + 🪙${V.fmt(vibMax)}` : "Купить сейчас";
            FX.bump(buyBtn);
            if (useVib) FX.burst(vs, { emojis: ["🪙", "✨"], count: 8, spread: 60 });
            return;
          }
          const lk = e.target.closest("[data-like]");
          if (lk) { toggleLike(lk); const card = root.querySelector(`[data-like="mk-${p.id}"]`); if (card) card.classList.toggle("on", lk.classList.contains("on")); return; }
          const pk = e.target.closest("[data-pick]");
          if (pk) {
            pk.parentElement.querySelectorAll("[data-pick]").forEach((b) => b.classList.toggle("on", b === pk));
            FX.bump(pk); FX.sound.pop();
            if (pk.classList.contains("cm-swatch")) FX.burst(pk, { emojis: ["✨", "💫"], count: 6, spread: 50 });
            return;
          }
          if (e.target.closest("[data-tocart]")) {
            const b = e.target.closest("[data-tocart]");
            if (have || cart.qty("market", p.id)) { FX.shake(b); FX.toast(have ? "Уже есть. Бонусы не складываются, только расходы" : "Уже в корзине. Одного хватит — честно", "🙅"); return; }
            cart.add("market", { id: p.id, name: p.name, price: p.price, emo: p.emo }, b);
            refreshCtl("market", p.id, true);
            FX.burst(b, { emojis: [p.emo, "✨"], count: 8 });
            FX.toast("В корзине! Ещё 2 человека смотрят этот товар", "👀");
            setTimeout(close, 250);
            return;
          }
          if (e.target.closest("[data-buy]")) {
            const b = e.target.closest("[data-buy]");
            if (have) return;
            const vib = useVib ? Math.min(vibMax, V.vibikiPay(p.price)) : 0;
            if (V.pay(p.price - vib, { title: "Vibe Market · " + p.name, emoji: p.emo, col: p.col, from: b })) {
              if (vib) V.spendVibiki(vib);
              mkGive(p);
              close(); FX.confetti(); FX.sound.success();
              refreshMarket(root);
              setTimeout(() => V.modal(`<div class="m-emo float">${p.emo}</div><div class="display">Твоё!</div><p>${vib ? `Списали ${V.fmt(vib)} вайбиков — копили не зря. ` : ""}Уже у тебя${p.kind === "home" ? " в квартире" : p.kind === "wear" ? " в гардеробе" : ""}. Отзыв можно писать уже сейчас.</p>${p.bonus ? `<div style="display:flex;justify-content:center;margin:-4px 0 14px">${bonusChips(p.bonus)}</div>` : ""}<button class="btn black block" data-close>Огонь 🔥</button>`), 300);
            }
            return;
          }
          if (e.target.closest("[data-inst]")) {
            const box = sh.querySelector("[data-instbox]");
            box.classList.toggle("on");
            FX.sound.pop(); FX.bump(e.target.closest("[data-inst]"));
            if (box.classList.contains("on")) setTimeout(() => box.scrollIntoView({ behavior: "smooth", block: "nearest" }), 120);
            return;
          }
          if (e.target.closest("[data-instgo]")) {
            const b = e.target.closest("[data-instgo]");
            if (V.pay(mon + 21, { title: `Рассрочка · ${p.name} (1/36)`, emoji: p.emo, col: "c-lilac", from: b })) {
              mkGive(p); refreshMarket(root);
              close(); FX.confetti();
              FX.toast("Осталось 35 платежей. Мы напомним. Много раз", "📅", 3000);
            }
          }
        });
      },
    });
  }

  const mkOwnedLine = () => {
    const n = MK.filter((p) => owns(p.inv)).length;
    return n ? `🏠 У тебя уже ${n} из ${MK.length} вещей — бонусы работают в Vibe Fit и сне` : "Вещи дают бонусы к сну, настроению и внешности. Навсегда*";
  };
  function refreshMarket(root) {
    const grid = root && root.querySelector("#mk-grid");
    if (!grid) return;
    const i = +(root.dataset.mkCat || 0);
    fill(grid, MK.filter((p) => mkInTab(p, i)).map(mkCard).join(""));
    const ol = root.querySelector("#mk-owned");
    if (ol) ol.textContent = mkOwnedLine();
  }
  // Корзина Market оплачена → всё купленное едет в инвентарь
  function mkPaid(order) {
    const got = [];
    (order.items || []).forEach((it) => { const p = MK.find((x) => x.id === it.id); if (p && mkGive(p)) got.push(p); });
    setTimeout(() => { refreshCtl(order.svc); refreshMarket(document.querySelector('[data-screen="market"]')); }, 50);
    V.modal(`<div class="m-emo float">📦</div><div class="display">Оплачено!</div>
      <p>${got.length ? "Уже у тебя: " + got.map((p) => p.emo + " " + p.name).join(", ") + "." : "Посылка в пути. Отслеживай её 40 раз в день, как все."}</p>
      ${got.length ? `<div style="display:flex;justify-content:center;flex-wrap:wrap;margin:-4px 0 14px">${got.map((p) => bonusChips(p.bonus)).join("")}</div>` : ""}
      <button class="btn black block" data-close>Вайбово 🔥</button>`);
  }

  // ?cat=watch — сразу открыть витрину; ?open=watch_band — и карточку товара
  const mkCatIdx = (params) => Math.max(0, MK_KIND.indexOf((params && params.cat) || ""));
  V.screen("market", {
    render(params) {
      const ci = mkCatIdx(params);
      return `
      ${ui.head("Vibe Market", "100 млн товаров · 2 нужных", ui.vibikiPill())}
      <div class="field tap" id="mk-search">🔎 <span class="muted">Кроссовки, которые изменят жизнь</span></div>
      <div class="cm-flash c-black" style="margin-top:14px">
        <span class="bolt emo wobble">⚡</span>
        <div class="badge" style="background:var(--pink)">FLASH-РАСПРОДАЖА</div>
        <div style="color:var(--lime);font-weight:800;font-size:13px;margin-top:10px">Всё по −87%. Заканчивается через</div>
        <div class="t" id="mk-timer" style="color:#fff">00:04:59</div>
        <div class="fine" style="color:#aaa;margin-top:4px">Распродажа заканчивается каждые 5 минут с 2019 года.</div>
      </div>
      <div style="margin-top:14px">${chipsHtml(MK_CATS, ci)}</div>
      <div class="muted" style="font-size:12px;font-weight:800;margin-top:2px" id="mk-owned">${mkOwnedLine()}</div>
      <div class="grid2 stagger" id="mk-grid" style="margin-top:6px">${MK.filter((p) => mkInTab(p, ci)).map(mkCard).join("")}</div>
      ${ui.marquee(["−87% на всё", "Осталось 2 шт.", "Рассрочка 0-0-36*", "Доставка завтра**"])}
      <div class="fine">*0 ₫ первоначальный взнос, 0 ₫ переплата, 36 месяцев раздумий. **Завтра — понятие относительное. Старые цены являются произведением искусства и охраняются законом.</div>
      ${dock("market", { txTitle: "Vibe Market", col: "c-pink", onPaid: mkPaid })}`;
    },
    mount(root, params) {
      cart.renderBar("market");
      root.dataset.mkCat = String(mkCatIdx(params));
      let openT = 0;
      const want = params && params.open && MK.find((p) => p.inv === params.open || p.id === params.open);
      if (want) openT = setTimeout(() => mkDetail(want, root), 450);
      let left = 299;
      const tEl = root.querySelector("#mk-timer");
      const iv = setInterval(() => {
        left--;
        if (left <= 0) {
          left = 299;
          FX.shake(tEl.parentElement);
          FX.toast("Распродажа продлена! Снова. Как обычно", "⚡", 2600);
        }
        tEl.textContent = hms(left);
        if (left <= 10) FX.bump(tEl);
      }, 1000);
      root.addEventListener("click", (e) => {
        const c = e.target.closest("[data-cat]");
        if (c) {
          chipOn(c);
          root.dataset.mkCat = c.dataset.cat;
          refreshMarket(root);
          return;
        }
        if (shopClick(e, "market", (id) => MK.find((p) => p.id === id), {
          before(p, a) {
            if (owns(p.inv)) { FX.shake(a); FX.toast("Уже есть. Второй матрас сну не поможет", "🙅"); return false; }
            if (cart.qty("market", p.id)) { FX.shake(a); FX.toast("Одного хватит. Бонусы не складываются", "🙅"); return false; }
          },
          after(p) { if (Math.random() < 0.35) setTimeout(() => FX.toast("С этим товаром часто покупают ещё 14 товаров", "🛍️"), 650); },
        })) return;
        const o = e.target.closest("[data-open]");
        if (o) { mkDetail(MK.find((p) => p.id === o.dataset.open), root); return; }
        if (e.target.closest("#mk-search")) {
          FX.bump(root.querySelector("#mk-search"));
          FX.toast("По запросу найдено 4 млн товаров. Все — то, что надо", "🔎");
        }
      });
      return () => { clearInterval(iv); clearTimeout(openT); };
    },
  });

  /* ============================================================
     VIBE PETS — свой питомец (тамагочи) + магазин
     state.cm_pet = { kind, name, hunger, joy, health, adoptedDay, t, walkAt, playAt, pokeAt }
       hunger 0 = сыт, 100 = голоден; joy/health 0–100; t — игровая минута последнего пересчёта
     state.cm_petFood — порции корма (покупаются в магазине ниже)
     Vibe.inv: { id:"pet", cat:"pet", bonus:{ mood } } — бонус падает, если питомец заброшен
     ============================================================ */
  const ADOPT = {
    cat: { e: "🐱", n: "Кот", price: 4990, col: "c-lilac", names: ["Пельмень", "Барсик", "Мурзик-Про", "Сыр"], happy: ["Мур-р-р 💜", "*трётся о ноги*", "Мяу. Продолжай"], sad: { cls: "hiss", say: "Ш-ш-ш! 😾", t: "Кот шипит. Он помнит, когда его кормили последний раз. Ты — нет" }, walk: "Кот прогулялся на шлейке с видом «я делаю тебе одолжение»" },
    dog: { e: "🐶", n: "Пёс", price: 6990, col: "c-yellow", names: ["Бублик", "Рекс", "Шарик 2.0", "Байт"], happy: ["Гав! 💛", "*виляет всем телом*", "Ты лучший! Гав!"], sad: { cls: "whine", say: "Ску-у-у… 🥺", t: "Пёс скулит и смотрит так, будто ты {пропустил|пропустила} его день рождения" }, walk: "Пёс обнюхал 40 столбов и счастлив до кончика хвоста" },
    hamster: { e: "🐹", n: "Хомяк", price: 1490, col: "c-orange", names: ["Пончик", "Щёчкин", "Крошка", "Сеня"], happy: ["Пи! 🧡", "*набил щёки*", "Пи-пи! Ещё!"], sad: { cls: "puff", say: "Пф! 😤", t: "Хомяк надул щёки и отвернулся. Обида хранится в защёчных мешках" }, walk: "Хомяк прокатился в шаре по парку. Голуби в шоке" },
  };
  const PCLAMP = (v) => Math.max(0, Math.min(100, Math.round(v)));
  const petFood = () => S().cm_petFood || 0;
  const petScore = (p) => ((100 - p.hunger) + p.joy + p.health) / 3;
  const petSad = (p) => petScore(p) < 40 || p.hunger > 75 || p.joy < 25 || p.health < 30;
  const petBonus = (p) => { const sc = petScore(p); return sc >= 60 ? 6 : sc >= 40 ? 3 : sc >= 20 ? 0 : -3; };
  function petSave(p) {
    V.state.set({ cm_pet: p });
    // Бонус настроения в инвентаре следует за состоянием питомца
    if (V.inv && V.inv.has("pet")) {
      const it = V.inv.list("pet").find((i) => i.id === "pet");
      const b = petBonus(p);
      if (it && (!it.bonus || it.bonus.mood !== b)) {
        V.inv.remove("pet");
        V.inv.add(Object.assign({}, it, { name: p.name, bonus: Object.assign({}, it.bonus, { mood: b }) }));
      }
    }
    return p;
  }
  // Пересчитать потребности по игровому времени (ленивый тик)
  function petSync() {
    const p0 = S().cm_pet;
    if (!p0 || !V.game || !S().profile) return p0 || null;
    const now = V.game.minutes();
    const hrs = Math.min(24 * 7, (now - (p0.t == null ? now : p0.t)) / 60);
    if (hrs < 0.05) return p0;
    const p = Object.assign({}, p0, { t: now });
    p.hunger = PCLAMP(p.hunger + 4 * hrs);
    p.joy = PCLAMP(p.joy - 3 * hrs);
    const neglect = p.hunger > 70 || p.joy < 25;
    p.health = PCLAMP(p.health + (neglect ? -1.5 : 0.3) * hrs);
    return petSave(p);
  }
  function petPatch(patch) {
    const p = petSync();
    if (!p) return null;
    const n = Object.assign({}, p, patch);
    ["hunger", "joy", "health"].forEach((k) => (n[k] = PCLAMP(n[k])));
    return petSave(n);
  }
  // Поход к ветеринару — своё событие календаря (kind "vet", не "doctor":
  // "doctor" при посещении лечит самого игрока, а лечить надо питомца)
  if (V.sched) {
    V.sched.on("vet", () => { if (S().cm_pet) { petPatch({ health: 100, joy: S().cm_pet.joy + 10 }); setTimeout(() => FX.toast(`${S().cm_pet.name} здоров и немного обижен на градусник`, "🩺", 2800), 600); } });
    V.sched.on("vet:missed", () => { if (S().cm_pet) FX.toast(`${S().cm_pet.name} так и не попал к ветеринару`, "😿", 2800); });
  }
  if (V.game && V.game.on) V.game.on(() => petSync());
  const vetVisit = () => (V.sched ? V.sched.list().find((e) => e.kind === "vet" && e.status === "planned") : null);

  const CD = (p, key, mins) => Math.max(0, (p[key] == null ? -1e9 : p[key]) + mins - V.game.minutes());
  const hmLeft = (m) => (m >= 60 ? `${Math.floor(m / 60)} ч ${pad2(Math.round(m % 60))} м` : `${Math.ceil(m)} м`);

  function petLine(p) {
    const K = ADOPT[p.kind];
    if (p.health < 30) return `🤒 ${p.name} приболел. Ветеринар — в кнопке «Вет»`;
    if (p.hunger > 75) return `🍽️ ${p.name} голоден и уже смотрит на твою тарелку. ${petFood() ? "Покорми!" : "Корм — в магазине ниже 👇"}`;
    if (p.joy < 25) return `😿 ${p.name} скучает. Поиграй или погуляй — бонус к настроению тает`;
    if (petScore(p) >= 75) return `${K.e} ${p.name} на максимальном вайбе. Ты — лучший человек в его жизни*`;
    return `${K.e} ${p.name} в норме. Норма — это когда ты не на работе`;
  }
  function petStatsHtml(p) {
    const bar = (l, v, c) => `<div class="cm-pet-bar"><div class="l"><span>${l}</span><span>${v}%</span></div><div class="progress"><i style="--p:${Math.max(3, v)}%;${v < 30 ? "background:var(--coral)" : c ? `background:${c}` : ""}"></i></div></div>`;
    const b = petBonus(p);
    return `<div class="cm-pet-name">${p.name}</div>
      <div style="font-size:12px;font-weight:800;opacity:.8">${ADOPT[p.kind].n} · с тобой ${V.game.info().day - (p.adoptedDay || 0)} дн.</div>
      ${bar("🍖 Сытость", 100 - p.hunger, "var(--lime)")}${bar("🎾 Радость", p.joy, "var(--yellow)")}${bar("💚 Здоровье", p.health, "var(--mint)")}
      <div class="cm-bon" style="margin:8px 0 0">${b > 0 ? `<span>😊 +${b} к настроению</span>` : `<span class="lk">${b < 0 ? `😿 ${b} к настроению` : "😿 бонус пропал"}</span>`}</div>`;
  }
  function petActsHtml(p) {
    const walk = CD(p, "walkAt", 240);
    const vv = vetVisit();
    return `<button class="btn" data-pet="feed"><span class="e">🍖</span>Корм · ${petFood()}</button>
      <button class="btn" data-pet="play"><span class="e">🎾</span>Играть</button>
      <button class="btn" data-pet="walk" ${walk ? "disabled" : ""}><span class="e">🦮</span>${walk ? hmLeft(walk) : "Гулять"}</button>
      <button class="btn ${vv ? "yellow" : ""}" data-pet="vet"><span class="e">🩺</span>${vv ? "Запись" : "Вет"}</button>`;
  }
  function petCardHtml() {
    const p = petSync();
    if (!p) {
      return `<div class="cm-pet c-orange">
        <div class="sticker" style="top:14px;right:14px;background:var(--lime)">Мур-кэшбек 5%</div>
        <div class="display" style="max-width:70%">Заведи питомца</div>
        <p style="font-weight:700;font-size:14px;margin:6px 0 0;max-width:70%">Корми, гуляй, играй — и он будет поднимать тебе настроение каждый день. Забудешь — обидится. По-настоящему.</p>
        <div class="cm-adopt">${Object.entries(ADOPT).map(([k, a]) => `<button data-adopt="${k}"><span class="e emo float d${a.price % 4}">${a.e}</span>${a.n}<br>${rub(a.price)}</button>`).join("")}</div>
        <div class="fine" style="color:var(--ink);opacity:.7">Разовый «приютский взнос». Любовь бесплатна, корм — нет.</div>
      </div>`;
    }
    const K = ADOPT[p.kind];
    const sad = petSad(p);
    return `<div class="cm-pet ${K.col} ${sad ? "sad" : ""}" id="pt-pet">
      <div class="cm-pet-top">
        <div class="cm-pet-ava" data-poke><span class="pe">${K.e}</span><span class="mood" id="pt-mood">${sad ? "💢" : petScore(p) >= 75 ? "💖" : "✨"}</span></div>
        <div class="cm-pet-st" id="pt-stats">${petStatsHtml(p)}</div>
      </div>
      <div class="cm-pet-acts" id="pt-acts">${petActsHtml(p)}</div>
      <div class="cm-pet-line" id="pt-line">${petLine(p)}</div>
    </div>`;
  }

  const PET_CATS = ["Всё", "🍖 Корм", "🎾 Игрушки", "🦴 Лакомства", "💊 Аптечка"];
  // food — сколько порций корма даёт товар; toy — радость питомцу при доставке
  const PETS = [
    [1, "Корм «Премиум» для котов", 890, "🐟", "c-sky", "Кот всё равно будет есть с твоей тарелки", 6],
    [1, "Корм для собак, 3 кг", 1290, "🍖", "c-orange", "Со вкусом «ещё»", 10],
    [1, "Зерносмесь для хомяков", 340, "🌻", "c-yellow", "Половина уйдёт в щёки про запас", 5],
    [2, "Мышка заводная", 190, "🐭", "c-lilac", "Проживёт 4 минуты под диваном", 0, 10],
    [2, "Мячик-пищалка", 250, "🎾", "c-lime", "Соседи будут в восторге", 0, 12],
    [2, "Когтеточка «Башня»", 2490, "🗼", "c-pink", "Кот выберет диван. Но попробовать стоит", 0, 30],
    [3, "Косточка из жил", 290, "🦴", "c-mint", "Хрум-хрум за 3 секунды", 1, 5],
    [3, "Кошачья мята", 190, "🌿", "c-lime", "Легально. Кот на вайбе", 0, 15],
    [4, "Витамины «Шерсть-блеск»", 590, "💊", "c-coral", "Блестит ярче тебя", 0, 0, 10],
    [4, "Шампунь без слёз", 420, "🧴", "c-sky", "Слёзы будут, но твои — от цены", 0, 0, 4],
  ].map((r, i) => ({ id: "pt" + i, cat: r[0], name: r[1], price: r[2], emo: r[3], col: r[4], sub: r[5] + (r[6] ? ` · +${r[6]} порц.` : ""), food: r[6] || 0, toy: r[7] || 0, heal: r[8] || 0, st: i % 4 === 0 ? "−25%" : i % 4 === 2 ? "ХИТ" : "", old: i % 4 === 0 ? Math.round(r[2] / 0.75) : 0, left: i === 5 ? 2 : 0, d: i % 4 }));
  const GROOM_SLOTS = ["Сегодня 15:00", "Сегодня 18:30", "Завтра 11:00", "Завтра 14:00"];

  // Корзина зоомагазина оплачена → корм в запас, игрушки и витамины — питомцу
  function petsPaid(order) {
    let food = 0, toy = 0, heal = 0;
    (order.items || []).forEach((it) => { const p = PETS.find((x) => x.id === it.id); if (p) { food += p.food * it.qty; toy += p.toy * it.qty; heal += p.heal * it.qty; } });
    if (food) V.state.set({ cm_petFood: petFood() + food });
    const pet = S().cm_pet;
    if (pet && (toy || heal)) petPatch({ joy: pet.joy + toy, health: pet.health + heal });
    setTimeout(() => { refreshCtl(order.svc); const r = document.querySelector('[data-screen="pets"]'); if (r) petRefresh(r); }, 50);
    V.modal(`<div class="m-emo float">🐾</div><div class="display">Оплачено!</div>
      <p>${food ? `🍖 +${food} порц. корма в запасе (всего ${petFood()}). ` : ""}${pet && toy ? `${pet.name}: радость +${toy}. ` : ""}${pet && heal ? `Здоровье +${heal}. ` : ""}${!pet ? "Питомца пока нет, но запасливость — уже черта характера." : "Пушистый уже чувствует, что что-то едет."}</p>
      <button class="btn black block" data-close>Мур 🐾</button>`);
  }

  function adoptSheet(kind0, root) {
    let kind = kind0 || "cat";
    ui.sheet(`
      <div class="display" style="font-size:26px">Новый член семьи</div>
      <div class="cm-adopt">${Object.entries(ADOPT).map(([k, a]) => `<button data-ak="${k}" class="${k === kind ? "on" : ""}"><span class="e">${a.e}</span>${a.n}<br>${rub(a.price)}</button>`).join("")}</div>
      <div style="font-weight:800;font-size:13px;margin-top:14px">Как назовём?</div>
      <input class="cm-name-in" id="ad-name" maxlength="16" value="${ADOPT[kind].names[0]}">
      <div class="card flat" style="margin-top:12px;font-size:13px;font-weight:700;line-height:1.4">😊 +6 к настроению каждый день, пока он счастлив.<br>🍖 Ест 3 раза в день. 🦮 Гулять раз в 4 часа. 🩺 Болеет, если забыть.<br>🎁 Приют даёт с собой 2 порции корма.</div>
      <button class="btn black xl block" data-adoptgo style="margin-top:12px">Забрать домой · <span id="ad-pr">${rub(ADOPT[kind].price)}</span></button>
      <div class="fine">Приютский взнос не возвращается. Питомец тоже. Мы проверяли.</div>`, {
      onMount(sh, close) {
        const inp = sh.querySelector("#ad-name");
        sh.addEventListener("click", (e) => {
          const k = e.target.closest("[data-ak]");
          if (k) {
            const prevNames = ADOPT[kind].names;
            kind = k.dataset.ak;
            sh.querySelectorAll("[data-ak]").forEach((b) => b.classList.toggle("on", b === k));
            if (!inp.value.trim() || prevNames.includes(inp.value.trim())) inp.value = ADOPT[kind].names[Math.floor(Math.random() * ADOPT[kind].names.length)];
            sh.querySelector("#ad-pr").textContent = rub(ADOPT[kind].price);
            FX.bump(k); FX.sound.like();
            FX.burst(k, { emojis: [ADOPT[kind].e, "🐾", "💛"], count: 10, spread: 70 });
            return;
          }
          const go = e.target.closest("[data-adoptgo]");
          if (!go) return;
          const A = ADOPT[kind];
          const name = (inp.value || "").replace(/[<>&"']/g, "").trim().slice(0, 16) || A.names[0];
          if (!V.pay(A.price, { title: `Vibe Pets · приют · ${A.n}`, emoji: A.e, col: A.col, from: go })) return;
          const now = V.game.minutes();
          V.state.set({ cm_pet: { kind, name, hunger: 20, joy: 85, health: 90, adoptedDay: V.game.info().day, t: now, walkAt: null, playAt: null }, cm_petFood: petFood() + 2 });
          if (V.inv) { V.inv.remove("pet"); V.inv.add({ id: "pet", cat: "pet", name, e: A.e, bonus: { mood: 6 }, kind }); }
          close();
          FX.confetti(); FX.sound.success(); FX.haptic([10, 40, 10]);
          if (root) petRefresh(root, true);
          setTimeout(() => V.modal(`<div class="m-emo float">${A.e}</div><div class="display">${name} дома!</div><p>Теперь у тебя +6 к настроению. И обязанности. Но в основном +6 к настроению.</p><button class="btn black block" data-close>Обнять 🫂</button>`, { sound: "levelup" }), 350);
        });
      },
    });
  }

  function vetSheet(root) {
    const p = petSync();
    if (!p) return;
    const vv = vetVisit();
    const I = V.game.info();
    const late = I.hour + 2 > 21;
    const hour = late ? 10 : Math.max(9, I.hour + 2);
    const day = late ? I.day + 1 : I.day;
    ui.sheet(`
      <div class="cm-doc"><div class="ava c-sky" style="width:72px;height:72px;font-size:42px"><span class="emo float">🩺</span></div>
        <div><div class="display" style="font-size:22px">Ветеринар</div><small>Здоровье ${p.name}: ${p.health}%</small></div></div>
      ${vv ? `<div class="card c-yellow cm-visit" style="margin-top:14px"><div class="ic">🏥</div><div class="tx"><b>Уже записаны</b><small>${dayWord(vv.day)}, ${pad2(vv.hour)}:00 · Vibe Клиника</small></div><button class="btn sm black" data-vroute>🚕 Доехать</button></div>` : `
      <div class="card" style="margin-top:14px">
        <b style="font-weight:800">📱 Вет онлайн · 990 ₫</b>
        <div style="font-size:12px;font-weight:700;margin:4px 0 10px">Сразу: здоровье +25. Посоветуют «наблюдать». Ты и так наблюдаешь</div>
        <button class="btn block" data-vonline>Позвонить сейчас</button>
      </div>
      <div class="card c-mint" style="margin-top:10px">
        <b style="font-weight:800">🏥 Приём в клинике · 1 490 ₫</b>
        <div style="font-size:12px;font-weight:700;margin:4px 0 10px">${dayWord(day)}, ${pad2(hour)}:00. Полное здоровье — когда доедешь с питомцем. Событие появится в календаре</div>
        <button class="btn black block" data-vbook>Записаться</button>
      </div>`}
      <div class="fine">Ветеринар не несёт ответственности за выражение морды после прививки.</div>`, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          if (e.target.closest("[data-vroute]")) { close(); V.go("maps", { to: "clinic" }); return; }
          const on = e.target.closest("[data-vonline]");
          if (on) {
            if (!V.pay(990, { title: `Vibe Pets · ветеринар онлайн · ${p.name}`, emoji: "🩺", col: "c-sky", from: on })) return;
            petPatch({ health: (S().cm_pet || p).health + 25 });
            close(); FX.sound.success();
            FX.toast("Ветеринар: «Попробуйте выключить и включить кота». Помогло. Здоровье +25", "🩺", 3000);
            if (root) petRefresh(root);
            return;
          }
          const bk = e.target.closest("[data-vbook]");
          if (bk) {
            if (!V.pay(1490, { title: `Vibe Pets · ветклиника · ${p.name}`, emoji: "🏥", col: "c-mint", from: bk })) return;
            V.sched.add({ kind: "vet", place: "clinic", day, hour, min: 0, dur: 60, title: `Ветеринар · ${p.name}`, e: ADOPT[p.kind].e, price: 1490, go: "pets" });
            close(); FX.confetti(); FX.sound.success();
            if (root) petRefresh(root);
            setTimeout(() => V.modal(`<div class="m-emo float">🏥</div><div class="display">Записаны!</div><p>${dayWord(day)} в ${pad2(hour)}:00. Приезжай в Vibe Клинику — ${p.name} уже прячется под диван.</p><button class="btn yellow block" data-close data-go="maps" style="margin-bottom:10px">🚕 Как доехать</button><button class="btn black block" data-close>Ок</button>`), 300);
          }
        });
      },
    });
  }

  // Точечно обновить карточку питомца (без перерисовки аватара и его анимаций)
  function petRefresh(root, full) {
    const host = root.querySelector("#pt-pethost");
    if (!host) return;
    const p = petSync();
    const card = root.querySelector("#pt-pet");
    if (full || !p || !card) { host.innerHTML = petCardHtml(); return; }
    const sad = petSad(p);
    card.classList.toggle("sad", sad);
    const set = (sel, html) => { const el = root.querySelector(sel); if (el && el.innerHTML !== html) el.innerHTML = html; };
    set("#pt-stats", petStatsHtml(p));
    set("#pt-acts", petActsHtml(p));
    set("#pt-line", petLine(p));
    set("#pt-mood", sad ? "💢" : petScore(p) >= 75 ? "💖" : "✨");
  }

  function petAction(act, btn, root) {
    const p = petSync();
    if (!p) return;
    const K = ADOPT[p.kind];
    const ava = root.querySelector("[data-poke]");
    if (act === "feed") {
      if (!petFood()) {
        FX.shake(btn); FX.toast("Корм закончился. Магазин ниже — там всё «для любимых»", "🍖", 2600);
        const chip = root.querySelector('[data-cat="1"]');
        if (chip) { chip.click(); setTimeout(() => chip.scrollIntoView({ behavior: "smooth", block: "center" }), 80); }
        return;
      }
      if (p.hunger < 10) { FX.bump(btn); FX.toast(`${p.name} сыт. Перекорм — тоже забота, но неправильная`, "🙅"); return; }
      V.state.set({ cm_petFood: petFood() - 1 });
      petPatch({ hunger: p.hunger - 45, joy: p.joy + 5 });
      FX.burst(ava, { emojis: ["🍖", "😋", "✨", K.e], count: 14 }); FX.sound.pop();
      reactJoy(ava, "Ням! 😋");
    } else if (act === "play") {
      const cool = CD(p, "playAt", 60);
      petPatch({ joy: p.joy + (cool ? 6 : 20), hunger: p.hunger + 3, playAt: cool ? p.playAt : V.game.minutes() });
      FX.burst(ava, { emojis: ["🎾", "💛", "✨", K.e], count: 16 }); FX.sound.like();
      reactJoy(ava, K.happy[Math.floor(Math.random() * K.happy.length)]);
      // Игра с питомцем поднимает настроение игроку (не чаще раза в игровой час)
      if (!cool && V.body) V.body.effect("meditate");
      else if (cool) FX.toast(`${p.name} ещё играет, но настроение тебе уже подняли в этот час`, "🎾", 2200);
    } else if (act === "walk") {
      if (CD(p, "walkAt", 240)) { FX.shake(btn); return; }
      petPatch({ joy: p.joy + 15, hunger: p.hunger + 8, health: p.health + 2, walkAt: V.game.minutes() });
      if (V.body) V.body.effect("walk", { km: 1 });
      FX.confetti({ count: 50 }); FX.sound.success();
      FX.toast(K.walk, "🦮", 3000);
      reactJoy(ava, "Гуляем! 🌳");
    } else if (act === "vet") {
      vetSheet(root);
      return;
    }
    petRefresh(root);
  }
  // Всплывающая реплика над питомцем
  function petSay(ava, text, bad) {
    if (!ava) return;
    ava.querySelectorAll(".cm-pet-say").forEach((x) => x.remove());
    const b = document.createElement("div");
    b.className = "cm-pet-say" + (bad ? " bad" : "");
    b.textContent = text;
    ava.appendChild(b);
    b.addEventListener("animationend", () => b.remove());
  }
  function reactJoy(ava, text) {
    if (!ava) return;
    ava.classList.remove("joy", "hiss", "whine", "puff");
    void ava.offsetWidth;
    ava.classList.add("joy");
    petSay(ava, text);
  }
  // Тык в питомца: счастливый радуется, грустный — реагирует по-своему
  function petPoke(ava) {
    const p = petSync();
    if (!p) return;
    const K = ADOPT[p.kind];
    if (petSad(p)) {
      ava.classList.remove("joy", "hiss", "whine", "puff");
      void ava.offsetWidth;
      ava.classList.add(K.sad.cls);
      petSay(ava, K.sad.say, true);
      FX.haptic([30, 30, 30]); FX.sound.pop();
      FX.toast(K.sad.t, K.e, 2800);
      return;
    }
    reactJoy(ava, K.happy[Math.floor(Math.random() * K.happy.length)]);
    FX.burst(ava, { emojis: ["💖", "💕", K.e, "✨"], count: 10, spread: 80 });
    FX.sound.like(); FX.haptic(12);
    if (!CD(p, "pokeAt", 30)) petPatch({ joy: p.joy + 3, pokeAt: V.game.minutes() });
  }

  V.screen("pets", {
    render() {
      return `
      ${ui.head("Vibe Pets", "Для тех, кто главный дома", ui.vibikiPill())}
      <div id="pt-pethost">${petCardHtml()}</div>

      <div class="card c-pink" style="margin-top:14px">
        <div class="cm-row"><div><div class="display" style="font-size:22px">Груминг 🛁</div><div style="font-weight:700;font-size:13px;margin-top:4px">Стрижка, ванна, укладка. Питомец будет красивее тебя</div></div><span class="emo wobble" style="font-size:54px">🐩</span></div>
        <div class="cm-slots" id="pt-slots">${GROOM_SLOTS.map((s, i) => `<button class="chip cm-slot ${i === 1 ? "on" : ""}" data-gslot="${i}">${s}</button>`).join("")}</div>
        <button class="btn black block" data-groom style="margin-top:12px">Записать · 1 990 ₫</button>
        <div class="fine" style="color:var(--ink);opacity:.7">Мастер не несёт ответственности за выражение морды после процедуры.</div>
      </div>
      <div class="card tap c-sky" data-vet style="margin-top:12px;display:flex;align-items:center;gap:12px">
        <span class="emo float" style="font-size:44px">🩺</span>
        <div style="flex:1"><b style="font-weight:800">Ветеринар онлайн 24/7</b><div style="font-size:12px;font-weight:700">Ответит быстрее, чем кот успеет уронить кружку</div></div>
        <span style="font-size:22px">→</span>
      </div>

      <h2 class="sec">Магазин<small>🍖 в запасе: <span id="pt-food">${petFood()}</span> порц.</small></h2>
      ${chipsHtml(PET_CATS)}
      <div class="grid2 stagger" id="pt-grid" style="margin-top:6px">${PETS.map((p) => prodCard("pets", p)).join("")}</div>
      <div class="fine">Питомцы не участвуют в программе лояльности, но очень хотели бы. Отзывы на товары оставлены владельцами от имени питомцев и могут быть предвзяты. *По мнению питомца, который не видел других людей.</div>
      ${dock("pets", { txTitle: "Vibe Pets", col: "c-orange", onPaid: petsPaid })}`;
    },
    mount(root) {
      cart.renderBar("pets");
      let slot = 1;
      // Потребности питомца тикают по игровому времени — обновляем без звуков
      const iv = setInterval(() => {
        if (document.hidden) return;
        petRefresh(root);
        const f = root.querySelector("#pt-food");
        if (f && !Vibe.sameText(f, petFood())) f.textContent = petFood();
      }, 5000);
      root.addEventListener("click", (e) => {
        const ad = e.target.closest("[data-adopt]");
        if (ad) { FX.bump(ad); FX.sound.like(); adoptSheet(ad.dataset.adopt, root); return; }
        const pk = e.target.closest("[data-poke]");
        if (pk) { petPoke(pk); return; }
        const pa = e.target.closest("[data-pet]");
        if (pa) { FX.bump(pa); petAction(pa.dataset.pet, pa, root); const f = root.querySelector("#pt-food"); if (f) f.textContent = petFood(); return; }
        const c = e.target.closest("[data-cat]");
        if (c) {
          chipOn(c);
          const i = +c.dataset.cat;
          fill(root.querySelector("#pt-grid"), PETS.filter((p) => !i || p.cat === i).map((p) => prodCard("pets", p)).join(""));
          return;
        }
        const gs = e.target.closest("[data-gslot]");
        if (gs) { slot = +gs.dataset.gslot; chipOn(gs); FX.sound.pop(); return; }
        const g = e.target.closest("[data-groom]");
        if (g) {
          if (V.pay(1990, { title: "Vibe Pets · Груминг", emoji: "🐩", col: "c-pink", from: g })) {
            FX.confetti(); FX.burst(g, { emojis: ["🛁", "🫧", "🐩", "✨"], count: 18 });
            V.state.set({ petsGroom: GROOM_SLOTS[slot] });
            const pet = S().cm_pet;
            if (pet) { petPatch({ joy: pet.joy + 10, health: pet.health + 5 }); petRefresh(root); }
            setTimeout(() => V.modal(`<div class="m-emo float">🐩</div><div class="display">Записали!</div><p>${GROOM_SLOTS[slot]}. ${pet ? pet.name : "Пушистик"} будет красивее тебя. Смирись заранее.</p><button class="btn black block" data-close>Мур 💅</button>`), 300);
            g.textContent = `✅ Записан · ${GROOM_SLOTS[slot]}`;
          }
          return;
        }
        if (e.target.closest("[data-vet]")) {
          FX.bump(e.target.closest("[data-vet]"));
          if (S().cm_pet) vetSheet(root);
          else FX.toast("Ветеринар уже печатает: «Попробуйте выключить и включить кота»", "🩺", 3000);
          return;
        }
        shopClick(e, "pets", (id) => PETS.find((p) => p.id === id));
      });
      return () => clearInterval(iv);
    },
  });

  /* ============================================================
     VIBE HEALTH
     ============================================================ */
  const DOCS = [
    { id: "d1", name: "Анна Котова", spec: "Терапевт", emo: "👩🏻‍⚕️", col: "c-mint", rating: "4.97", exp: "12 лет", price: 1900, slots: ["10:00", "11:30", "14:00", "16:30", "19:00"] },
    { id: "d2", name: "Игорь Сонин", spec: "Сомнолог", emo: "😴", col: "c-lilac", rating: "4.91", exp: "8 лет", price: 2400, slots: ["09:00", "13:00", "22:00", "03:00"] },
    { id: "d3", name: "Марина Зубова", spec: "Стоматолог", emo: "🦷", col: "c-sky", rating: "4.88", exp: "15 лет", price: 2900, slots: ["10:30", "12:00", "15:30", "18:00"] },
    { id: "d4", name: "Пётр Нервов", spec: "Психотерапевт", emo: "🧠", col: "c-pink", rating: "4.99", exp: "20 лет", price: 3500, slots: ["11:00", "17:00", "20:00"] },
  ];
  const SYMPTOMS = [
    ["🤕 Голова болит", "Возможно, это мигрень. Или 47 открытых вкладок. Подписка «Плюс Вайб» закрывает вкладки за тебя*"],
    ["😵‍💫 Не сплю", "Это бессонница. Или сериал. Сомнолог Игорь свободен в 03:00 — как удобно, ты ведь не спишь"],
    ["🥱 Устал", "Классика! Рекомендую отдых. Отдых доступен в Vibe Travel от 49 990 ₫. Усталость не входит в стоимость"],
    ["🤧 Чихаю", "Весна, пыль или кот. Если кот — у нас скидка на шампунь в Vibe Pets. Совпадение? Нет"],
    ["😔 Грустно", "Возможно, это тревожность. Подписка «Плюс Вайб» снижает её на 12%*. *По опросу из одного человека — меня"],
    ["🪑 Спина", "Ты сидишь как вопросительный знак. Коврик для йоги на Vibe Market −87%. Сидеть ровно — бесплатно"],
    ["💸 Нет денег", "Не болезнь, а состояние души. Лечится кредитом. Он уже предодобрен 😉"],
  ];
  const PHARM = [
    ["Витамин D, 60 капс.", 490, "☀️", "c-yellow", "Солнце в баночке. Петербург одобряет"],
    ["Пластыри с котиками", 190, "🩹", "c-pink", "Заживает в 2 раза милее"],
    ["Термометр бесконтактный", 1290, "🌡️", "c-sky", "Измеряет температуру и уровень драмы"],
    ["Маски ×50", 290, "😷", "c-mint", "На случай, если не хочешь, чтобы узнали"],
    ["Капли «Антистресс»", 390, "💧", "c-lilac", "Травяные. Стресс не травяной"],
    ["Леденцы от горла", 210, "🍬", "c-coral", "Вкус «малина и сожаление»"],
    ["Плацебо Форте", 990, "💊", "c-lime", "Действует, если веришь. Веришь?"],
    ["Гематоген ×3", 120, "🍫", "c-orange", "Вкус детства из поликлиники"],
  ].map((r, i) => ({ id: "hl" + i, name: r[0], price: r[1], emo: r[2], col: r[3], sub: r[4], st: i === 6 ? "НОВИНКА" : i % 3 === 0 ? "−30%" : "", stc: i === 6 ? "var(--pink)" : "var(--yellow)", old: i % 3 === 0 && i !== 6 ? Math.round(r[1] / 0.7) : 0, d: i % 4 }));

  /* ---- Запись к врачу → событие в календаре (Vibe.sched). Платишь при записи,
     эффект на тело — когда пришёл (sched.attend делает body "doctor").
     Заголовок оплаты без «Health/врач/приём», чтобы ядро не вылечило мгновенно. ---- */
  const MODES = [
    { t: "📱 Онлайн", place: "home", where: "онлайн из дома", fee: 0 },
    { t: "🏥 В клинике", place: "clinic", where: "в клинике", fee: 0 },
    { t: "🏠 На дом +990 ₫", place: "home", where: "врач приедет домой", fee: 990 },
  ];
  const slotHM = (s) => { const [h, m] = s.split(":").map(Number); return { h, m }; };
  // Ближайший день для слота: сегодня, если до него ≥ 30 игровых минут, иначе завтра
  function slotDay(s) {
    const I = V.game.info();
    const { h, m } = slotHM(s);
    return h * 60 + m >= I.hour * 60 + I.minute + 30 ? I.day : I.day + 1;
  }
  const dayWord = (day) => { const d = day - V.game.info().day; return d === 0 ? "Сегодня" : d === 1 ? "Завтра" : `Через ${d} дн.`; };
  const visits = () => (V.sched ? V.sched.list().filter((e) => e.kind === "doctor" && e.src === "health") : []);
  const visitOf = (d, s, day) => visits().find((e) => e.doc === d.id && e.day === day && e.slot === s && e.status === "planned");
  const docCard = (d) => `<div class="card" data-doc="${d.id}">
    <div class="cm-doc">
      <div class="ava ${d.col}"><span class="emo float d${d.id.slice(1) % 4}">${d.emo}</span></div>
      <div style="flex:1;min-width:0"><b>${d.name}</b><small>${d.spec} · стаж ${d.exp}</small>
        <div class="cm-meta" style="margin-top:6px"><span class="badge">⭐ ${d.rating}</span><span class="badge w">${rub(d.price)}</span></div>
      </div>
    </div>
    <div class="cm-slots">${d.slots.map((s, i) => { const day = slotDay(s); const tk = visitOf(d, s, day) || (i === 1 && d.id !== "d2"); return `<button class="chip cm-slot ${tk ? "taken" : ""}" data-slot="${s}">${day === V.game.info().day ? "" : "Завтра "}${s}</button>`; }).join("")}</div>
  </div>`;

  function visitCard(e) {
    const now = V.game.minutes();
    const st = V.sched.startMin(e);
    const open = now >= st - 60 && now <= st + e.dur;
    const home = e.place === "home";
    const atHome = V.body && V.body.atHome ? V.body.atHome() : true;
    const btn = e.place === "clinic"
      ? `<button class="btn sm yellow" data-route="${e.id}">🚕 Доехать</button>`
      : open && atHome ? `<button class="btn sm lime" data-attend="${e.id}">${e.mode === 0 ? "📱 Подключиться" : "🚪 Открыть"}</button>`
      : open ? `<button class="btn sm yellow" data-route="${e.id}">🏠 Домой</button>`
      : `<button class="btn sm" disabled>⏳ Скоро</button>`;
    return `<div class="card cm-visit ${open ? "c-yellow" : "c-mint"}">
      <div class="ic"><span class="emo ${open ? "wobble" : "float"}">${e.e}</span></div>
      <div class="tx"><b>${e.title}</b><small>${dayWord(e.day)}, ${pad2(e.hour)}:${pad2(e.min || 0)} · ${home ? (e.mode === 0 ? "онлайн, из дома" : "на дому") : "📍 Vibe Клиника"}${open ? " · уже пора!" : ""}</small></div>
      ${btn}
    </div>`;
  }
  function visitsHtml() {
    const list = visits().filter((e) => e.status === "planned").sort((a, b) => V.sched.startMin(a) - V.sched.startMin(b));
    if (!list.length) return "";
    return `<h2 class="sec">Мои записи<small>оплачено · эффект после визита</small></h2>
      <div class="stack stagger">${list.map(visitCard).join("")}</div>
      <div class="fine">Пропустишь — деньги сгорят, здоровье останется там же. Как в жизни, только с уведомлением.</div>`;
  }

  function bookSheet(d, s, chipEl, root) {
    let mode = 0;
    const day = slotDay(s);
    const { h, m } = slotHM(s);
    ui.sheet(`
      <div class="cm-doc">
        <div class="ava ${d.col}" style="width:72px;height:72px;font-size:42px"><span class="emo float">${d.emo}</span></div>
        <div><div class="display" style="font-size:22px">${d.name}</div><small>${d.spec} · ⭐ ${d.rating}</small></div>
      </div>
      <div class="card c-yellow" style="margin-top:14px;display:flex;align-items:center;justify-content:space-between">
        <div><div class="muted" style="font-size:12px;font-weight:800">${dayWord(day)}</div><div class="big-num" style="font-size:34px">${s}</div></div>
        <span class="emo wobble" style="font-size:44px">📅</span>
      </div>
      <div class="chips" style="margin-top:12px" data-group="mode">
        ${MODES.map((md, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-mode="${i}">${md.t}</button>`).join("")}
      </div>
      <div style="margin:10px 4px;display:grid;gap:6px;font-weight:700;font-size:14px">
        <div class="cm-row"><span class="muted">Приём</span><span>${rub(d.price)}</span></div>
        <div class="cm-row"><span class="muted">Сбор за запись на приём</span><span>49 ₫</span></div>
        <div class="cm-row"><span class="muted">Выезд врача</span><span id="bk-home">0 ₫</span></div>
        <div class="cm-row"><span class="muted">Где</span><span id="bk-where">${MODES[0].where}</span></div>
      </div>
      <div class="card flat" style="font-size:12px;font-weight:700;margin-bottom:12px">📅 Запись попадёт в календарь. Здоровье +15 — когда реально придёшь (в клинику — через Vibe Maps).</div>
      <button class="btn black xl block" data-book>Записаться · <span id="bk-total">${rub(d.price + 49)}</span></button>
      <div class="fine">Врач может опоздать на 15 минут, вы — нет. Отмена записи бесплатна, если вы отмените её до того, как записались.</div>`, {
      onMount(sh, close) {
        const tot = () => d.price + 49 + MODES[mode].fee;
        sh.addEventListener("click", (e) => {
          const mb = e.target.closest("[data-mode]");
          if (mb) {
            mode = +mb.dataset.mode;
            sh.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b === mb));
            FX.bump(mb); FX.sound.pop();
            sh.querySelector("#bk-home").textContent = MODES[mode].fee ? rub(MODES[mode].fee) : "0 ₫";
            sh.querySelector("#bk-where").textContent = MODES[mode].where;
            const te = sh.querySelector("#bk-total");
            te.textContent = rub(tot()); FX.bump(te);
            return;
          }
          const b = e.target.closest("[data-book]");
          if (!b) return;
          if (!V.sched) { FX.toast("Календарь ещё не проснулся", "😴"); return; }
          if (!V.pay(tot(), { title: `Vibe Клиника · запись · ${d.spec} ${s}`, emoji: d.emo, col: d.col, from: b })) return;
          const ev = V.sched.add({
            kind: "doctor", src: "health", doc: d.id, slot: s, mode,
            place: MODES[mode].place, day, hour: h, min: m, dur: 60,
            title: `${d.spec} · ${d.name}`, e: d.emo, price: tot(), go: "health",
          });
          close();
          FX.confetti(); FX.sound.success();
          if (chipEl) { chipEl.classList.add("taken"); FX.burst(chipEl, { emojis: ["✅", "💚", "📅"], count: 12 }); }
          if (root) refreshVisits(root);
          setTimeout(() => V.modal(`<div class="m-emo float">${d.emo}</div><div class="display">Записан!</div>
            <p>${d.name} ждёт тебя: ${dayWord(day).toLowerCase()} в ${s}, ${MODES[mode].where}. Деньги уже ушли, здоровье придёт после визита.</p>
            ${ev.place === "clinic" ? `<button class="btn yellow block" data-close data-go="maps" style="margin-bottom:10px">🚕 Как доехать</button>` : ""}
            <button class="btn black block" data-close>Ура, я взрослый 🧑‍💼</button>`), 300);
        });
      },
    });
  }
  function refreshVisits(root) {
    const box = root.querySelector("#hl-visits");
    if (box) { const h = visitsHtml(); if (box.innerHTML !== h) fill(box, h); }
    root.querySelectorAll("[data-doc]").forEach((el) => { const d = DOCS.find((x) => x.id === el.dataset.doc); const tmp = document.createElement("div"); tmp.innerHTML = docCard(d); const ns = tmp.querySelector(".cm-slots"), os = el.querySelector(".cm-slots"); if (ns.innerHTML !== os.innerHTML) os.innerHTML = ns.innerHTML; });
  }

  V.screen("health", {
    render() {
      return `
      ${ui.head("Vibe Health", "Здоровье по подписке", ui.vibikiPill())}
      <div class="hero c-mint">
        <div class="sticker" style="top:14px;right:14px;background:var(--pink)">Врач за 5 мин</div>
        <div class="display">Будь здоров. Буквально.</div>
        <p>Врачи, аптека и Вайбот, который точно не врач.</p>
        <div class="hero-emo emo float">💊</div>
      </div>
      <div id="hl-visits">${visitsHtml()}</div>

      <h2 class="sec">Что беспокоит?<small>диагноз от Вайбота</small></h2>
      <div class="card c-lilac">
        ${zab("smile", "Выбери симптом — я поставлю диагноз. У меня нет диплома, но есть уверенность ✨", "hl-bub")}
        <div class="chips" style="margin-top:12px;margin-bottom:-6px">${SYMPTOMS.map((s, i) => `<button class="chip" data-sym="${i}">${s[0]}</button>`).join("")}</div>
      </div>

      <h2 class="sec">Врачи<small>онлайн, в клинике или на дому</small></h2>
      <div class="stack stagger">${DOCS.map(docCard).join("")}</div>

      <h2 class="sec">Аптека<small>доставка 30 мин</small></h2>
      <div class="grid2 stagger">${PHARM.map((p) => prodCard("health", p)).join("")}</div>
      <div class="fine">Не является медицинской рекомендацией. Является рекламой. Вайбот не врач, но в его семье были калькуляторы. Перед применением проконсультируйтесь с кем-нибудь, кто не продаёт подписку.</div>
      ${dock("health", { txTitle: "Vibe Health · аптека", col: "c-mint", onPaid: paidModal("Курьер везёт аптечку. Выздоравливай со скоростью доставки.", "💊") })}`;
    },
    mount(root) {
      cart.renderBar("health");
      const timeouts = [];
      let token = 0;
      const iv = setInterval(() => { if (!document.hidden) refreshVisits(root); }, 5000);
      root.addEventListener("click", (e) => {
        const rt = e.target.closest("[data-route]");
        if (rt) { FX.bump(rt); FX.sound.pop(); V.go("maps", { to: (V.sched.list().find((x) => x.id === rt.dataset.route) || {}).place || "clinic" }); return; }
        const at = e.target.closest("[data-attend]");
        if (at) {
          const ev = V.sched.attend(at.dataset.attend);
          if (ev) FX.burst(at, { emojis: ["🩺", "💚", "✨"], count: 16 });
          else FX.shake(at);
          refreshVisits(root);
          return;
        }
        const sy = e.target.closest("[data-sym]");
        if (sy) {
          chipOn(sy);
          const my = ++token;
          const bub = root.querySelector("#hl-bub");
          const mEl = root.querySelector("#hl-bub-m");
          mEl.innerHTML = V.zabotik(56, "wow");
          FX.bump(mEl);
          bub.innerHTML = `<span class="typing"><span></span><span></span><span></span></span>`;
          timeouts.push(setTimeout(() => {
            if (my !== token) return;
            mEl.innerHTML = V.zabotik(56, "sly");
            bub.textContent = SYMPTOMS[+sy.dataset.sym][1];
            FX.bump(bub); FX.sound.pop();
            FX.burst(mEl, { emojis: ["💡", "✨", "🩺"], count: 8, spread: 70 });
          }, 900));
          return;
        }
        const sl = e.target.closest("[data-slot]");
        if (sl) {
          const d = DOCS.find((x) => x.id === sl.closest("[data-doc]").dataset.doc);
          FX.bump(sl);
          bookSheet(d, sl.dataset.slot, sl, root);
          return;
        }
        shopClick(e, "health", (id) => PHARM.find((p) => p.id === id), {
          after(p) { if (p.id === "hl6") setTimeout(() => FX.toast("Плацебо Форте уже начало действовать. Чувствуешь?", "💊"), 600); },
        });
      });
      return () => { clearInterval(iv); timeouts.forEach(clearTimeout); };
    },
  });
})();
