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

  // Траты по категориям — из реальных операций
  const CATS = [
    { t: "Жильё", e: "🔑", c: "var(--mint)", re: /Аренда|ЖКХ|Связь/ },
    { t: "Еда", e: "🍜", c: "var(--pink)", re: /Eat|Supermarket|Продукты|Кофе|Шаурма/i },
    { t: "Такси", e: "🚕", c: "var(--yellow)", re: /такси|Maps|Drive|Самокат/i },
    { t: "Шопинг", e: "🛍️", c: "var(--sky)", re: /Market|Pets|Health/ },
    { t: "Кредиты", e: "🏦", c: "var(--violet)", re: /кредит|Ипотек/i },
  ];
  function spend() {
    const out = CATS.map((c) => Object.assign({ a: 0 }, c));
    S().tx.forEach((t) => {
      if (t.a >= 0) return;
      const c = out.find((x) => x.re.test(t.t));
      if (c) c.a += -t.a;
    });
    return out;
  }
  const SPEND_TIPS = [
    "На доставку ушло столько, что можно было научиться готовить. Но зачем? 🍳",
    "Если не тратить, то и кэшбека не будет. Подумай об этом 🤔",
    "Аренда — это ипотека, только квартира не твоя. Загляни в Vibe Home 😉",
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
      const SPEND = spend();
      const max = Math.max(1, ...SPEND.map((x) => x.a));
      const loans = s.loans || [];
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
        <button class="pa c-sky" data-act="topup"><span class="emo">👩</span>У мамы</button>
        <button class="pa c-pink" data-act="credit"><span class="emo">🤑</span>Кредит</button>
        <button class="pa c-orange" data-act="jar"><span class="emo">🐷</span>Копилка</button>
      </div>

      ${loans.length ? `
      <h2 class="sec">Кредиты <small>${loans.length}</small></h2>
      <div class="stack">${loans.map((l) => `
        <div class="card tight c-pink" style="display:flex;gap:12px;align-items:center">
          <span class="emo" style="font-size:30px">🏦</span>
          <div style="flex:1"><b>«${Vibe.esc(l.name)}» · ${Vibe.rub(l.monthly)}/мес</b><div style="font-size:12px;font-weight:700">Осталось ${l.left} из ${l.months} платежей · списание ${l.dom}-го</div>
          <div class="progress" style="height:8px;margin-top:6px"><i style="--p:${Math.round(((l.months - l.left) / l.months) * 100)}%"></i></div></div>
        </div>`).join("")}</div>` : ""}

      <h2 class="sec">Траты <small>${Vibe.rub(SPEND.reduce((a, b) => a + b.a, 0))}</small></h2>
      <div class="card">
        <div class="bars">
          ${SPEND.map((x) => `
            <button class="bar-col" data-act="cat" data-t="${x.t}">
              <span class="bar-v" style="--h:${Math.round((x.a / max) * 100)}%;background:${x.c}"><span class="emo">${x.e}</span></span>
              <small>${x.t}</small>
            </button>`).join("")}
        </div>
        <div class="zab-tip">${Vibe.zabotik(40, "sly")}<span>${SPEND_TIPS[s.tx.length % SPEND_TIPS.length]}</span></div>
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
        if (act === "topup") askMom(a);
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

  /* ---------- Мама ---------- */
  const MOM = ["Опять? Ладно. Только не на ерунду.", "Держи. Шапку купи!", "Последний раз. Ты поел?", "Папе не говори.", "Это на еду, а не на рамен."];
  function askMom(btn) {
    const s = S();
    const week = Math.floor(Vibe.game.info().day / 7);
    if (s.momWeek === week) {
      FX.shake(btn);
      FX.toast("Мама: «Я же на этой неделе уже давала!» Следующий раз — через " + (7 - (Vibe.game.info().day % 7)) + " дн.", "👩", 3200);
      return;
    }
    const amount = s.job ? 1500 : 3000;
    Vibe.state.set({ momWeek: week });
    Vibe.addMoney(amount, { title: "Перевод от мамы · «" + MOM[week % MOM.length] + "»", emoji: "👩" });
    FX.burst(btn, { emojis: ["💜", "👩", "💸"], count: 12 });
    FX.toast(`+${Vibe.rub(amount)} от мамы. ${MOM[week % MOM.length]}`, "👩", 3000);
  }

  /* ---------- Кредит ---------- */
  function openCredit() {
    const s = S();
    const maxSum = s.job ? Math.round((s.job.salary * 8) / 10000) * 10000 : 30000;
    Vibe.ui.sheet(`
      <div class="badge" style="background:var(--lime)">⚡ Предодобрено до ${Vibe.rub(maxSum)}</div>
      <div class="display" style="font-size:30px;margin:10px 0 4px">Сколько хочешь?</div>
      <div class="big-num credit-sum" data-sum>${Vibe.rub(Math.round(maxSum / 2 / 1000) * 1000)}</div>
      <input type="range" min="10000" max="${maxSum}" step="5000" value="${Math.round(maxSum / 2 / 5000) * 5000}" data-range>
      <div class="chips" style="margin-top:12px" data-terms>${[6, 12, 24, 36].map((m) => `<button class="chip ${m === 12 ? "on" : ""}" data-m="${m}">${m} мес</button>`).join("")}</div>
      <div class="credit-grid">
        <div class="card tight c-yellow"><small>Платёж в месяц</small><b data-month></b></div>
        <div class="card tight c-pink"><small>Переплата</small><b data-over></b></div>
      </div>
      <div class="card tight c-lilac" style="margin-top:10px;display:flex;gap:10px;align-items:center">${Vibe.zabotik(44, "sly")}<span style="font-weight:700;font-size:13px" data-zab></span></div>
      <button class="btn grad xl block" style="margin-top:16px" data-take>Получить за 1 минуту <span class="arrow">→</span></button>
      <div class="fine">Ставка ${s.job ? "29,9" : "59,9"}% годовых${s.job ? "" : " (без работы — дороже)"}. Платёж списывается автоматически каждый месяц. Не хватит денег — уйдёшь в минус под 1% в день. Страховка вайба включена.</div>
    `, {
      onMount(sh, close) {
        const range = sh.querySelector("[data-range]");
        const zab = sh.querySelector("[data-zab]");
        const rate = s.job ? 0.299 : 0.599;
        let months = 12;
        const calc = () => {
          const v = +range.value;
          const r = rate / 12;
          const m = (v * r) / (1 - Math.pow(1 + r, -months));
          range.style.setProperty("--p", ((v - 10000) / Math.max(1, maxSum - 10000)) * 100 + "%");
          FX.countTo(sh.querySelector("[data-sum]"), v, { fmt: Vibe.rub, dur: 250 });
          sh.querySelector("[data-month]").textContent = Vibe.rub(m);
          sh.querySelector("[data-over]").textContent = Vibe.rub(m * months - v);
          const inc = s.job ? s.job.salary * 0.87 : 0;
          zab.textContent = !inc ? "Без работы? Не беда! Беда будет потом 😅" : m > inc * 0.5 ? "Платёж больше половины зарплаты. Смело! 😬" : `Это всего ${Math.round((m / inc) * 100)}% зарплаты. Бери, не думай!`;
        };
        calc();
        range.addEventListener("input", calc);
        sh.querySelector("[data-terms]").addEventListener("click", (e) => {
          const c = e.target.closest("[data-m]"); if (!c) return;
          months = +c.dataset.m;
          sh.querySelectorAll("[data-m]").forEach((x) => x.classList.toggle("on", x === c));
          calc();
        });
        sh.querySelector("[data-take]").addEventListener("click", (e) => {
          const v = +range.value;
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.innerHTML = "Проверяем тебя… 🔍";
          setTimeout(() => { btn.innerHTML = "Смотрим соцсети… 👀"; }, 600);
          setTimeout(() => { btn.innerHTML = "Одобрено! 🎉"; FX.sound.success(); }, 1300);
          setTimeout(() => {
            close();
            const loan = Vibe.game.addLoan({ name: "Мечта", amount: v, rate, months });
            Vibe.refreshCounters();
            FX.confetti();
            Vibe.achieve("credit");
            Vibe.modal(`<div class="m-emo float">🤑</div><div class="display">+${Vibe.rub(v)}</div><p>Деньги на счёте. Платёж ${Vibe.rub(loan.monthly)} будет списываться ${loan.dom}-го числа ${months} месяцев. Мы напомним. Точнее, просто спишем.</p><button class="btn black block" data-close>Понятно</button>`);
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
