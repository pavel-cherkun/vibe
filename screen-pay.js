/* ============================================================
   Vibe Pay — банк: карты, переводы, пополнение, кредит,
   копилка, траты и операции.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();

  const CARDS = [
    { name: "Vibe Black", c: "c-black", num: "4521", e: "🖤", sub: "Дебетовая" },
    { name: "Vibe Neon", c: "c-grad", num: "7730", e: "💜", sub: "Кэшбек до 30%*" },
    { name: "Vibe Credit", c: "c-holo", num: "0001", e: "🤑", sub: "Лимит 500 000 ₽" },
  ];

  const CONTACTS = [
    { n: "Мама", e: "👩" }, { n: "Лёха", e: "🧔" }, { n: "Катя", e: "👩‍🎤" }, { n: "Арендодатель", e: "🧛" }, { n: "Бро", e: "🤙" },
  ];

  const SPEND = [
    { t: "Доставка", e: "🍜", a: 18400, c: "var(--pink)" },
    { t: "Такси", e: "🚕", a: 9600, c: "var(--yellow)" },
    { t: "Шопинг", e: "🛍️", a: 14200, c: "var(--sky)" },
    { t: "Подписки", e: "💎", a: 4100, c: "var(--violet)" },
  ];

  function txList() {
    return S().tx.map((t) => `
      <div class="li">
        <div class="ic ${t.col || "c-white"}"><span class="emo">${t.c}</span></div>
        <div class="tx"><b>${Vibe.esc(t.t)}</b><small>${t.d}</small></div>
        <div class="amt ${t.a > 0 ? "plus" : ""}">${t.a > 0 ? "+" : "−"}${Vibe.rub(Math.abs(t.a))}</div>
      </div>`).join("");
  }

  Vibe.screen("pay", {
    render() {
      const s = S();
      const max = Math.max(...SPEND.map((x) => x.a));
      return `
      <div class="head">
        <div class="title" style="font-size:30px">Vibe Pay<small>Банк, который всегда рядом. Слишком рядом</small></div>
        ${Vibe.ui.vibikiPill()}
      </div>

      <div class="hscroll cards-row">
        ${CARDS.map((c, i) => `
          <div class="flip" data-act="flip">
            <div class="flip-in">
              <div class="bank-card ${c.c} front">
                <div style="display:flex;justify-content:space-between;align-items:start">
                  <span class="logo" style="font-size:30px">Vibe</span><span class="emo float" style="font-size:34px">${c.e}</span>
                </div>
                <div class="chip-gold"></div>
                <div style="display:flex;justify-content:space-between;align-items:end">
                  <div><b style="font-size:15px">${c.name}</b><div style="font-size:12px;opacity:.8;font-weight:700">${c.sub}</div></div>
                  <b style="font-size:16px">•• ${c.num}</b>
                </div>
              </div>
              <div class="bank-card ${c.c} back">
                <div class="mag"></div>
                <div style="font-weight:800;font-size:14px">5536 9138 •••• ${c.num}</div>
                <div style="display:flex;gap:16px;font-weight:800;font-size:13px"><span>12/29</span><span>CVV ***</span></div>
                <div style="font-size:10px;opacity:.8;font-weight:700">CVV не покажем. Мы и сами его не знаем</div>
              </div>
            </div>
          </div>`).join("")}
      </div>

      <div class="card c-yellow bal-card">
        <div style="font-weight:800;font-size:13px">Всего на счетах</div>
        <div class="big-num" style="font-size:42px;margin:6px 0 4px" data-balance>${Vibe.rub(s.balance)}</div>
        <span class="badge" style="background:#fff">🪙 <span data-vibiki>${Vibe.fmt(s.vibiki)}</span> вайбиков</span>
        <div class="emo float" style="position:absolute;right:16px;top:14px;font-size:54px">💰</div>
      </div>

      <div class="pay-actions stagger">
        <button class="pa c-lime" data-act="transfer"><span class="emo">↗️</span>Перевести</button>
        <button class="pa c-sky" data-act="topup"><span class="emo">💸</span>Пополнить</button>
        <button class="pa c-pink" data-act="credit"><span class="emo">🤑</span>Кредит</button>
        <button class="pa c-orange" data-act="jar"><span class="emo">🐷</span>Копилка</button>
      </div>

      <h2 class="sec">Траты за октябрь <small>${Vibe.rub(SPEND.reduce((a, b) => a + b.a, 0))}</small></h2>
      <div class="card">
        <div class="bars">
          ${SPEND.map((x) => `
            <button class="bar-col" data-act="cat" data-t="${x.t}">
              <span class="bar-v" style="--h:${Math.round((x.a / max) * 100)}%;background:${x.c}"><span class="emo">${x.e}</span></span>
              <small>${x.t}</small>
            </button>`).join("")}
        </div>
        <div class="zab-tip">${Vibe.zabotik(40, "sly")}<span>На доставку ушло столько, что можно было научиться готовить. Но зачем? 🍳</span></div>
      </div>

      <h2 class="sec">Операции <small>${s.tx.length}</small></h2>
      <div class="card" style="padding:4px 14px" data-txlist>${txList()}</div>
      <div class="fine">Vibe Pay — не банк, а состояние души. Вклады не застрахованы, зато очень красивые.</div>
      `;
    },

    mount(root, params) {
      // Анимация столбиков
      requestAnimationFrame(() => setTimeout(() => root.querySelectorAll(".bar-v").forEach((b) => b.classList.add("grown")), 120));
      const off = Vibe.state.on(() => { const l = root.querySelector("[data-txlist]"); if (l) l.innerHTML = txList(); });

      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        const act = a.dataset.act;
        if (act === "flip") { a.classList.toggle("flipped"); FX.sound.whoosh(); }
        if (act === "transfer") openTransfer();
        if (act === "topup") {
          Vibe.addMoney(5000, { title: "Пополнение с карты другого банка", emoji: "💸" });
          FX.burst(a, { emojis: ["💸", "💵", "🤑", "✨"], count: 16 });
          FX.sound.coin(); FX.toast("+5 000 ₽ на счёте", "💸");
        }
        if (act === "credit") openCredit();
        if (act === "jar") openJar();
        if (act === "cat") {
          FX.bump(a.querySelector(".bar-v"));
          FX.burst(a, { emojis: [a.querySelector(".emo").textContent], count: 8 });
          FX.toast(`${a.dataset.t}: Заботик советует тратить больше, чтобы получить больше кэшбека`, "🤖");
        }
      });

      if (params.credit) setTimeout(openCredit, 450);
      if (params.transfer) setTimeout(openTransfer, 450);
      return off;
    },
  });

  /* ---------- Перевод ---------- */
  function openTransfer() {
    let who = 0, amount = "";
    Vibe.ui.sheet(`
      <div class="display" style="font-size:28px">Перевод</div>
      <div class="hscroll" style="margin-top:12px">
        ${CONTACTS.map((c, i) => `<button class="contact ${i === 0 ? "on" : ""}" data-who="${i}"><span class="emo">${c.e}</span><small>${c.n}</small></button>`).join("")}
      </div>
      <div class="amount-display big-num" data-amount>0 ₽</div>
      <div class="chips" style="justify-content:center;margin:0">
        ${[500, 1000, 5000].map((v) => `<button class="chip" data-quick="${v}">+${Vibe.fmt(v)}</button>`).join("")}
      </div>
      <div class="keypad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k) => k === "" ? "<span></span>" : `<button data-key="${k}">${k}</button>`).join("")}
      </div>
      <button class="btn black xl block" data-send disabled>Отправить <span class="arrow">→</span></button>
      <div class="fine">Комиссия 0 ₽*. *Комиссия за отсутствие комиссии — 1%.</div>
    `, {
      onMount(sh, close) {
        const disp = sh.querySelector("[data-amount]");
        const send = sh.querySelector("[data-send]");
        const upd = () => {
          const v = +amount || 0;
          disp.textContent = Vibe.rub(v);
          FX.bump(disp);
          send.disabled = !v;
        };
        sh.addEventListener("click", (e) => {
          const c = e.target.closest("[data-who]");
          if (c) { who = +c.dataset.who; sh.querySelectorAll(".contact").forEach((x) => x.classList.toggle("on", x === c)); FX.burst(c, { emojis: ["💜", "✨"], count: 6 }); }
          const k = e.target.closest("[data-key]");
          if (k) {
            const key = k.dataset.key;
            if (key === "⌫") amount = amount.slice(0, -1);
            else if (amount.length < 7) amount = (amount + key).replace(/^0+/, "");
            upd();
          }
          const q = e.target.closest("[data-quick]");
          if (q) { amount = String((+amount || 0) + +q.dataset.quick); upd(); }
          if (e.target.closest("[data-send]")) {
            const v = +amount;
            const ok = Vibe.pay(v, { title: `Перевод · ${CONTACTS[who].n}`, emoji: CONTACTS[who].e, col: "c-lime", from: send, cashback: 0.005 });
            if (!ok) return;
            close();
            FX.confetti();
            Vibe.modal(`<div class="m-emo float">${CONTACTS[who].e}</div><div class="display">Отправлено!</div><p>${Vibe.rub(v)} уже у ${CONTACTS[who].n === "Мама" ? "мамы" : CONTACTS[who].n}. ${CONTACTS[who].n === "Арендодатель" ? "Он передаёт: «спасибо, с 1-го +10%»." : "Обнимашки прилагаются."}</p><button class="btn black block" data-close>Огонь</button>`);
          }
        });
      },
    });
  }

  /* ---------- Кредит ---------- */
  function openCredit() {
    Vibe.ui.sheet(`
      <div class="badge" style="background:var(--lime)">⚡ Предодобрено</div>
      <div class="display" style="font-size:30px;margin:10px 0 4px">Сколько хочешь?</div>
      <div class="big-num credit-sum" data-sum>250&nbsp;000&nbsp;₽</div>
      <input type="range" min="10000" max="500000" step="10000" value="250000" data-range style="--p:49%">
      <div class="credit-grid">
        <div class="card tight c-yellow"><small>В месяц</small><b data-month></b></div>
        <div class="card tight c-pink"><small>Переплата</small><b data-over></b></div>
      </div>
      <div class="card tight c-lilac" style="margin-top:10px;display:flex;gap:10px;align-items:center">${Vibe.zabotik(44, "sly")}<span style="font-weight:700;font-size:13px" data-zab>Отличный выбор! На эти деньги можно купить 83 рамена.</span></div>
      <button class="btn grad xl block" style="margin-top:16px" data-take>Получить за 1 минуту <span class="arrow">→</span></button>
      <div class="fine">Ставка 39,9% годовых, срок 5 лет. Страховка жизни, здоровья, питомца и вайба — включена. Досрочное погашение возможно после 4 лет 11 месяцев. Ставка может измениться, если изменится настроение банка.</div>
    `, {
      onMount(sh, close) {
        const range = sh.querySelector("[data-range]");
        const zab = sh.querySelector("[data-zab]");
        const calc = () => {
          const v = +range.value;
          const r = 0.399 / 12, n = 60;
          const m = (v * r) / (1 - Math.pow(1 + r, -n));
          range.style.setProperty("--p", ((v - 10000) / 490000) * 100 + "%");
          FX.countTo(sh.querySelector("[data-sum]"), v, { fmt: Vibe.rub, dur: 300 });
          sh.querySelector("[data-month]").textContent = Vibe.rub(m);
          sh.querySelector("[data-over]").textContent = Vibe.rub(m * n - v);
          zab.textContent = v > 400000 ? "Ого! Берёшь по-крупному. Уважаю 😎" : `На эти деньги можно купить ${Math.round(v / 3000)} раменов.`;
        };
        calc();
        range.addEventListener("input", calc);
        sh.querySelector("[data-take]").addEventListener("click", (e) => {
          const v = +range.value;
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.innerHTML = "Проверяем тебя… 🔍";
          setTimeout(() => { btn.innerHTML = "Смотрим соцсети… 👀"; FX.sound.tick(); }, 600);
          setTimeout(() => { btn.innerHTML = "Одобрено! 🎉"; FX.sound.success(); }, 1300);
          setTimeout(() => {
            close();
            Vibe.addMoney(v, { title: "Кредит «Мечта» 39,9%", emoji: "🤑", col: "c-pink" });
            FX.confetti();
            FX.coins({ x: innerWidth / 2, y: innerHeight - 100 }, "[data-balance]", 10, { emoji: "💸" });
            Vibe.achieve("credit");
            Vibe.modal(`<div class="m-emo float">🤑</div><div class="display">+${Vibe.rub(v)}</div><p>Деньги уже на счёте. Первый платёж — завтра. Шутка. Через месяц. Наверное.</p><button class="btn black block" data-close>Потратить всё</button>`);
          }, 1900);
        });
      },
    });
  }

  /* ---------- Копилка ---------- */
  function openJar() {
    const saved = S().jar || 2400;
    const goal = 30000;
    Vibe.ui.sheet(`
      <div class="display" style="font-size:28px">Копилка «На мечту»</div>
      <div class="jar">
        <div class="jar-fill" data-fill style="--p:${Math.min(100, (saved / goal) * 100)}%"></div>
        <div class="jar-emo emo float">🐷</div>
        <div class="jar-sum big-num" data-jar>${Vibe.rub(saved)}</div>
      </div>
      <div class="progress" style="margin:8px 0 4px"><i data-jarbar style="--p:${Math.min(100, (saved / goal) * 100)}%"></i></div>
      <div class="muted" style="font-weight:800;font-size:13px;text-align:center">Цель: ${Vibe.rub(goal)} · AirPods, которые ты всё равно потеряешь</div>
      <div class="grid3" style="margin-top:16px">
        ${[100, 500, 1000].map((v) => `<button class="btn yellow" data-put="${v}">+${Vibe.fmt(v)}</button>`).join("")}
      </div>
      <div class="card tight" style="margin-top:14px;display:flex;align-items:center;gap:12px"><div style="flex:1;font-weight:800">Округлять покупки<div class="muted" style="font-size:12px">Сдача летит в копилку</div></div><button class="switch ${S().roundUp ? "on" : ""}" data-round></button></div>
    `, {
      onMount(sh) {
        sh.addEventListener("click", (e) => {
          const p = e.target.closest("[data-put]");
          if (p) {
            const v = +p.dataset.put;
            if (v > S().balance) { FX.shake(p); return; }
            const nv = (S().jar || 2400) + v;
            Vibe.state.set({ jar: nv, balance: S().balance - v });
            FX.coins(p, sh.querySelector(".jar"), 5, { emoji: "🪙" });
            FX.countTo(sh.querySelector("[data-jar]"), nv, { fmt: Vibe.rub });
            const pct = Math.min(100, (nv / goal) * 100) + "%";
            sh.querySelector("[data-fill]").style.setProperty("--p", pct);
            sh.querySelector("[data-jarbar]").style.setProperty("--p", pct);
            Vibe.refreshCounters();
            if (nv >= goal && !S().jarDone) { Vibe.state.set({ jarDone: true }); FX.confetti(); FX.toast("Цель достигнута! Купишь или ещё подкопишь?", "🎉"); }
          }
          const r = e.target.closest("[data-round]");
          if (r) { r.classList.toggle("on"); Vibe.state.set({ roundUp: r.classList.contains("on") }); FX.sound.pop(); }
        });
      },
    });
  }

  const css = `
  .cards-row { padding-top: 8px; }
  .flip { width: 290px; height: 178px; perspective: 1000px; cursor: pointer; }
  .flip-in { position: relative; width: 100%; height: 100%; transition: transform .7s var(--spring); transform-style: preserve-3d; }
  .flip.flipped .flip-in { transform: rotateY(180deg); }
  .bank-card { position: absolute; inset: 0; border: var(--line); border-radius: 26px; box-shadow: var(--shadow); padding: 16px 18px; display: flex; flex-direction: column; justify-content: space-between; backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden; }
  .bank-card.back { transform: rotateY(180deg); justify-content: center; gap: 10px; }
  .bank-card .mag { position: absolute; left: 0; right: 0; top: 22px; height: 34px; background: var(--ink); }
  .bank-card.c-black .mag { background: #444; }
  .chip-gold { width: 42px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #ffe14d, #ffb547); border: 2px solid var(--ink); }
  .bal-card { margin-top: 6px; }
  .pay-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
  .pa { border: var(--line); border-radius: 22px; box-shadow: var(--shadow-sm); padding: 12px 0 10px; font-size: 12px; font-weight: 900; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform .15s var(--spring), box-shadow .15s; }
  .pa .emo { font-size: 28px; }
  .pa:active { transform: translateY(3px) scale(.95); box-shadow: none; }
  .bars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; height: 170px; align-items: end; }
  .bar-col { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px; }
  .bar-col small { font-size: 11px; font-weight: 800; }
  .bar-v { width: 100%; height: 0; border: 2.5px solid var(--ink); border-radius: 16px 16px 8px 8px; display: flex; justify-content: center; padding-top: 6px; transition: height 1s var(--spring); }
  .bar-v.grown { height: calc(var(--h) - 26px); min-height: 40px; }
  .bar-v .emo { font-size: 22px; }
  .zab-tip { display: flex; gap: 10px; align-items: center; margin-top: 14px; font-weight: 700; font-size: 13px; background: var(--bg); border-radius: 16px; padding: 8px 10px; }
  .contact { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 72px; }
  .contact .emo { width: 62px; height: 62px; border-radius: 50%; border: var(--line); background: var(--paper); display: grid; place-items: center; font-size: 30px; transition: transform .3s var(--spring), background .2s; }
  .contact small { font-size: 11px; font-weight: 800; }
  .contact.on .emo { background: var(--lime); transform: scale(1.1) rotate(-6deg); box-shadow: var(--shadow-sm); }
  .amount-display { text-align: center; font-size: 46px; margin: 14px 0 10px; }
  .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0 14px; }
  .keypad button { height: 56px; border-radius: 18px; border: 2px solid var(--ink); background: var(--paper); font-family: var(--font-display); font-size: 24px; transition: transform .12s var(--spring), background .15s; }
  .keypad button:active { transform: scale(.9); background: var(--yellow); }
  .credit-sum { font-size: 44px; margin: 4px 0 14px; }
  .credit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
  .credit-grid small { font-weight: 800; font-size: 12px; } .credit-grid b { display: block; font-family: var(--font-display); font-weight: 400; font-size: 20px; margin-top: 4px; }
  .jar { position: relative; height: 210px; margin: 14px auto 6px; width: 170px; border: var(--line); border-radius: 40px 40px 56px 56px; overflow: hidden; background: #fff; }
  .jar-fill { position: absolute; left: 0; right: 0; bottom: 0; height: var(--p); background: linear-gradient(var(--lime), var(--mint)); border-top: 2.5px solid var(--ink); transition: height 1s var(--spring); }
  .jar-emo { position: absolute; top: 26px; left: 50%; margin-left: -28px; font-size: 56px; }
  .jar-sum { position: absolute; bottom: 18px; left: 0; right: 0; text-align: center; font-size: 24px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
