/* ============================================================
   Vibe Pay — банк: карты, переводы, пополнение, кредит,
   копилка, траты и операции.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();

  /* ---------- Кредитный лимит (общий для кредита и «Частями») ----------
     Реклама обещает 500 000 ₫. Реальный лимит стартует с 10–20 тыс., растёт с каждой
     зарплатой, арендой вовремя и закрытыми кредитами; долги и минус его съедают.
     Vibe.credit: limit(), debt(), available(), steps(), split(total), takeSplit(name, rest) */
  const AD_LIMIT = 500000;
  const consumer = (l) => !/Ипотек|Автокредит/i.test(l.name || "");
  const left$ = (l) => Math.round((l.amount || 0) * (l.left || 0) / Math.max(1, l.months || 1));
  const credit = (Vibe.credit = {
    AD: AD_LIMIT,
    MIN: 5000,
    limit() {
      const s = S(), st = s.stats || {};
      const raw = (s.job ? 20000 : 10000)
        + Math.min(24, st.salaries || 0) * 8000
        + Math.min(24, st.rentPaid || 0) * 1500
        + (st.loansClosed || 0) * 15000
        - (st.rentLate || 0) * 10000;
      const cap = s.job ? Math.max(40000, Math.round(s.job.salary * 0.87 * 6)) : 25000;
      return Math.max(5000, Math.round(Math.min(raw, cap) / 1000) * 1000);
    },
    // Что уже занято: остаток по потребкредитам и «Частями» + минус на карте
    debt() {
      const s = S();
      return (s.loans || []).filter(consumer).reduce((a, l) => a + left$(l), 0) + Math.max(0, -Math.round(s.balance));
    },
    available() { return Math.max(0, Math.floor((credit.limit() - credit.debt()) / 1000) * 1000); },
    // Как растёт лимит — для экрана кредита
    steps() {
      const s = S(), st = s.stats || {};
      return [
        { e: "💸", t: "Каждая зарплата", v: "+8 000 ₫", n: `получено: ${st.salaries || 0}`, ok: (st.salaries || 0) > 0 },
        { e: "🔑", t: "Аренда вовремя", v: "+1 500 ₫", n: `раз: ${st.rentPaid || 0}`, ok: (st.rentPaid || 0) > 0 },
        { e: "🕊️", t: "Закрыть все кредиты", v: "+15 000 ₫", n: `закрыто: ${st.loansClosed || 0}`, ok: (st.loansClosed || 0) > 0 },
        { e: "💼", t: "Официальная работа", v: s.job ? "есть" : "+10 000 ₫", n: s.job ? s.job.company || "" : "без работы потолок 25 000 ₫", ok: !!s.job },
        { e: "🫠", t: "Просрочка аренды", v: "−10 000 ₫", n: `раз: ${st.rentLate || 0}`, ok: !(st.rentLate || 0), bad: true },
      ];
    },
    // Оплата частями: 25% сейчас, остаток — 3 платежа 30-го числа (+6% «за удобство»)
    split(total) {
      const s = S();
      const first = Math.ceil(total * 0.25);
      const rest = total - first;
      const monthly = Math.ceil((rest * 1.06) / 3);
      const base = { first, rest, monthly, months: 3, fee: monthly * 3 - rest };
      if (!((s.stats || {}).salaries > 0)) return Object.assign(base, { ok: false, short: "🔒 Частями — после первой зарплаты", why: "Откроется после первой зарплаты: банку нужна история доходов. Аванс 15-го тоже считается" });
      if (s.balance < 0) return Object.assign(base, { ok: false, short: "🔒 Частями — сначала выйди из минуса", why: "Сначала выйди из минуса на карте: с просрочкой частями не дают" });
      const av = credit.available();
      if (av < rest) return Object.assign(base, { ok: false, short: `🔒 Частями — лимит занят (свободно ${Vibe.rub(av)})`, why: `Лимит занят долгами: свободно ${Vibe.rub(av)}, нужно ${Vibe.rub(rest)}. Закрой кредит или дождись зарплаты` });
      return Object.assign(base, { ok: true, short: `Частями: ${Vibe.rub(first)} сейчас + 3 × ${Vibe.rub(monthly)}`, why: "" });
    },
    // Оформить остаток как долг: списывается 30-го вместе с кредитами
    takeSplit(name, rest) {
      const monthly = Math.ceil((rest * 1.06) / 3);
      const loan = { id: Date.now(), name: `Частями · ${name}`.slice(0, 48), amount: rest, rate: 0.06, months: 3, monthly, left: 3, dom: 30, split: true };
      Vibe.state.set({ loans: [...(S().loans || []), loan] });
      return loan;
    },
  });

  const CONTACTS = [
    { n: "Мама", e: "👩" }, { n: "Лёха", e: "🧔" }, { n: "Катя", e: "👩‍🎤" }, { n: "Арендодатель", e: "🧛" }, { n: "Бро", e: "🤙" },
  ];

  /* ---------- Три карты — у каждой своя механика ---------- */
  function cards() {
    const s = S();
    const chosen = Vibe.cashback && Vibe.cashback.chosen ? Vibe.cashback.chosen() : null;
    const cbTxt = chosen && chosen.length
      ? chosen.map((id) => { const c = Vibe.cashback.CATS.find((x) => x.id === id); return c ? `${c.e} ${Math.round(c.r * 100)}%` : ""; }).join(" ")
      : "категории не выбраны · 0,5%";
    const lim = credit.limit(), av = credit.available();
    return [
      { id: "debit", name: "Vibe Black", c: "c-black", num: "4521", e: "🖤", kind: "Дебетовая · зарплатная",
        big: s.job ? `+${Vibe.rub(Math.round(s.job.salary * 0.87))}/мес` : "0 ₫/мес", line: s.job ? "Сюда: аванс 15-го и зарплата 30-го" : "Зарплаты нет. Пока только мама" },
      { id: "cash", name: "Vibe Neon", c: "c-grad", num: "7730", e: "💜", kind: "Кэшбек вайбиками",
        big: `🪙 ${Vibe.fmt(s.vibiki || 0)}`, line: `${cbTxt}${s.plus ? " · Плюс ×2" : ""}` },
      { id: "credit", name: "Vibe Credit", c: "c-holo", num: "0001", e: "🤑", kind: `Кредитная · «до ${Vibe.fmt(AD_LIMIT)} ₫»`,
        big: `${Vibe.rub(av)}`, line: `свободно из ${Vibe.rub(lim)}`, bar: Math.round((1 - av / Math.max(1, lim)) * 100) },
    ];
  }
  const CARD_INFO = {
    debit: { t: "Vibe Black — дебетовая", p: "Сюда приходят аванс (15-го) и зарплата (30-го), с неё же 30-го списываются аренда, ЖКХ и кредиты. Уйдёшь в минус — 1% в день.", go: "transfer", b: "Перевести ↗️" },
    cash: { t: "Vibe Neon — кэшбек", p: "Каждая покупка возвращает вайбики: 0,5% базово и до 30% в категориях месяца. С «Плюс Вайб» — вдвое больше. Вайбиками можно оплатить до 30% заказа.", go: "cashback", b: "Выбрать категории 🪙" },
    credit: { t: "Vibe Credit — кредитная", p: "Реклама обещает 500 000 ₫. Реальный лимит растёт с зарплатами и платежами вовремя, а каждый долг его съедает. Из этого же лимита — оплата частями в Маркете.", go: "credit", b: "Посмотреть лимит 🤑" },
  };

  // Траты по категориям — из учёта месяца (month.js), иначе из истории операций
  const CAT_META = {
    "Еда": ["🍜", "var(--pink)"], "Жильё": ["🔑", "var(--mint)"], "Транспорт": ["🚕", "var(--yellow)"],
    "Шопинг": ["🛍️", "var(--sky)"], "Кредиты": ["🏦", "var(--violet)"], "Подписки": ["📺", "var(--lilac)"],
    "Здоровье": ["💊", "var(--lime)"], "Развлечения": ["🎉", "var(--orange)"], "Прочее": ["🧾", "#e4e1ea"],
  };
  const classify = (t) => (Vibe.month && Vibe.month.classify ? Vibe.month.classify(String(t || "")) : "Прочее");
  function spend() {
    const s = S();
    let cur = null;
    if (Vibe.month && s.profile && s.game) { try { cur = Vibe.month.ledger(); } catch (e) { cur = null; } }
    const prev = cur ? (s.monHist || [])[0] || null : null;
    if (!cur) {
      const cats = {}; let out = 0, big = null;
      s.tx.forEach((t) => { if (t.a >= 0) return; const c = classify(t.t), a = -t.a; cats[c] = (cats[c] || 0) + a; out += a; if (!big || a > big.a) big = { t: t.t, a }; });
      cur = { cats, out, big, inc: 0 };
    }
    const rows = Object.entries(cur.cats || {}).filter(([, a]) => a > 0).sort((a, b) => b[1] - a[1])
      .map(([t, a]) => ({ t, a, e: (CAT_META[t] || CAT_META["Прочее"])[0], c: (CAT_META[t] || CAT_META["Прочее"])[1], p: a / Math.max(1, cur.out), was: prev ? (prev.cats || {})[t] || 0 : null }));
    return { cur, prev, rows, out: cur.out || 0 };
  }
  const SPEND_TIPS = {
    "Еда": "Доставка — самая вкусная статья расходов. Холодильник в Супермаркете обходится дешевле 🍳",
    "Жильё": "Аренда — это ипотека, только квартира не твоя. Загляни в Vibe Home 😉",
    "Кредиты": "Ты платишь за прошлое. Банк — за твоё будущее. Все при деле 🏦",
    "Транспорт": "Ноги бесплатные, но кэшбека за них нет. Подумай об этом 🚶",
    "Шопинг": "Вещи радуют ненадолго, но регулярно. Как и списания 🛍️",
    "Подписки": "Ты платишь за то, что почти не открываешь. Как все 📺",
  };
  const pct = (x) => (x >= 0.995 ? "100%" : x < 0.01 ? "<1%" : Math.round(x * 100) + "%");
  function spendHtml() {
    const D = spend();
    const s = S();
    if (!D.rows.length) return `<div class="card sp-empty"><span class="emo float" style="font-size:40px">🫙</span><div><b>В этом месяце ещё ни одной траты</b><small>Корпорация обеспокоена. Всё в порядке?</small></div></div>`;
    const prevOut = D.prev ? D.prev.out || 0 : 0;
    const diff = prevOut ? (D.out - prevOut) / prevOut : null;
    const top = D.rows[0];
    return `
      <div class="card sp-card">
        <div class="sp-top">
          <div><small>Потрачено за ${Vibe.game ? Vibe.game.info().monthName.toLowerCase() : "месяц"}</small><div class="big-num sp-sum">−${Vibe.rub(D.out)}</div></div>
          ${diff == null ? `<div class="sp-cmp">Сравним с прошлым месяцем, когда он будет</div>`
            : `<div class="sp-cmp" style="background:${diff > 0 ? "var(--coral)" : "var(--lime)"}"><b>${diff > 0 ? "▲" : "▼"} ${Math.abs(Math.round(diff * 100))}%</b> к прошлому<small>было ${Vibe.rub(prevOut)}</small></div>`}
        </div>
        <div class="sp-stack" role="img" aria-label="Доли трат">${D.rows.map((r) => `<i style="flex:${Math.max(0.02, r.p)};background:${r.c}" title="${r.t}"></i>`).join("")}</div>
        <div class="sp-rows">${D.rows.map((r, i) => {
          const d = r.was == null ? "" : r.was ? (r.a - r.was >= 0 ? `<em class="sp-up">▲ ${Vibe.rub(r.a - r.was)}</em>` : `<em class="sp-dn">▼ ${Vibe.rub(r.was - r.a)}</em>`) : `<em class="sp-nw">новое</em>`;
          return `<button class="sp-row" data-act="cat" data-t="${r.t}" style="--i:${i}">
            <span class="sp-ic" style="background:${r.c}">${r.e}</span>
            <span class="sp-mid"><span class="sp-name"><b>${r.t}</b><small>${pct(r.p)}</small></span><span class="sp-bar"><i style="--w:${Math.max(3, Math.round((r.a / top.a) * 100))}%;background:${r.c}"></i></span></span>
            <span class="sp-amt"><b>${Vibe.rub(r.a)}</b>${d}</span>
          </button><div class="sp-tx" data-cattx="${r.t}"></div>`;
        }).join("")}</div>
        ${D.cur.big ? `<div class="sp-big"><span class="emo">🏆</span><div><small>Самая крупная трата</small><b>${Vibe.esc(D.cur.big.t)}</b></div><b class="sp-big-a">${Vibe.rub(D.cur.big.a)}</b></div>` : ""}
        <div class="zab-tip">${Vibe.zabotik(40, "sly")}<span>Больше всего уходит на «${top.t}» — ${pct(top.p)}. ${SPEND_TIPS[top.t] || "Если не тратить, то и кэшбека не будет. Подумай об этом 🤔"}</span></div>
        ${Vibe.month && (s.monHist || []).length ? `<button class="btn sm block" data-act="months" style="margin-top:10px">📊 Итоги прошлых месяцев · ${(s.monHist || []).length}</button>` : ""}
      </div>`;
  }
  function catTx(cat) {
    const list = S().tx.filter((t) => t.a < 0 && classify(t.t) === cat).slice(0, 6);
    return list.length ? list.map((t) => `<div class="sp-txi"><span>${t.c}</span><span class="t">${Vibe.esc(t.t)}<small>${t.d}</small></span><b>−${Vibe.rub(-t.a)}</b></div>`).join("") : `<div class="sp-txi"><span class="t muted">Операции старше истории уже не видно</span></div>`;
  }

  function cardsHtml() {
    return cards().map((c) => `
      <button class="bank-card ${c.c} pc-card" data-act="card" data-id="${c.id}">
        <div class="pc-row"><span class="logo" style="font-size:26px">Vibe</span><span class="pc-kind">${c.kind}</span><span class="emo" style="font-size:28px">${c.e}</span></div>
        <div class="pc-big">${c.big}</div>
        <div class="pc-line">${c.line}</div>
        ${c.bar != null ? `<div class="pc-bar"><i style="width:${c.bar}%"></i></div>` : ""}
        <div class="pc-row pc-foot"><b>${c.name}</b><b>•• ${c.num}</b></div>
      </button>`).join("");
  }
  function cardSheet(id) {
    const I = CARD_INFO[id];
    const c = cards().find((x) => x.id === id);
    Vibe.ui.sheet(`
      <div class="bank-card ${c.c} pc-card pc-static">
        <div class="pc-row"><span class="logo" style="font-size:26px">Vibe</span><span class="pc-kind">${c.kind}</span><span class="emo" style="font-size:28px">${c.e}</span></div>
        <div class="pc-big">${c.big}</div><div class="pc-line">${c.line}</div>
        ${c.bar != null ? `<div class="pc-bar"><i style="width:${c.bar}%"></i></div>` : ""}
        <div class="pc-row pc-foot"><b>${c.name}</b><b>5536 •••• ${c.num}</b></div>
      </div>
      <div class="display" style="font-size:24px;margin-top:16px">${I.t}</div>
      <p style="font-weight:700;margin:8px 0 14px">${I.p}</p>
      <button class="btn black xl block" data-cgo>${I.b}</button>
      <div class="fine">CVV не покажем. Мы и сами его не знаем.</div>`, {
      onMount(sh, close) {
        sh.querySelector("[data-cgo]").addEventListener("click", () => {
          close();
          setTimeout(() => { if (I.go === "transfer") openTransfer(); else if (I.go === "credit") openCredit(); else if (Vibe.cashback) Vibe.cashback.sheet(); }, 260);
        });
      },
    });
  }

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
      const loans = s.loans || [];
      return `
      <div class="head">
        <button class="icon-btn" data-back aria-label="Назад">←</button>
        <div class="title" style="font-size:26px">Vibe Pay<small>Банк, который всегда рядом. Слишком рядом</small></div>
        ${Vibe.ui.vibikiPill()}
      </div>

      <div class="hscroll cards-row" data-cards>${cardsHtml()}</div>
      <div class="cards-hint">Нажми на карту — расскажем, зачем она</div>

      <div class="card c-yellow bal-card">
        <div style="font-weight:800;font-size:13px">Всего на счетах</div>
        <div class="big-num" style="font-size:42px;margin:6px 0 4px" data-balance>${Vibe.rub(s.balance)}</div>
        <span class="badge" style="background:#fff">🪙 <span data-vibiki>${Vibe.fmt(s.vibiki)}</span> вайбиков</span>
        <div class="emo float" style="position:absolute;right:16px;top:14px;font-size:54px">💰</div>
      </div>

      <button class="card tap cb-strip ${Vibe.cashback && !Vibe.cashback.chosen() ? "c-lime" : ""}" data-act="cashback">
        <span class="emo" style="font-size:28px">🪙</span>
        <div style="flex:1;text-align:left"><b>Кэшбек на ${Vibe.game.info().monthName.toLowerCase()}</b><small>${Vibe.cashback && Vibe.cashback.chosen() ? Vibe.cashback.chosen().map((id) => { const c = Vibe.cashback.CATS.find((x) => x.id === id); return c ? `${c.e} ${Math.round(c.r * 100)}%` : ""; }).join(" · ") : "Выбери категории — иначе всего 0,5%"}</small></div>
        <span>›</span>
      </button>
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
          <span class="emo" style="font-size:30px">${l.split ? "🧩" : "🏦"}</span>
          <div style="flex:1"><b>«${Vibe.esc(l.name)}» · ${Vibe.rub(l.monthly)}/мес</b><div style="font-size:12px;font-weight:700">Осталось ${l.left} из ${l.months} платежей · списание 30-го</div>
          <div class="progress" style="height:8px;margin-top:6px"><i style="--p:${Math.round(((l.months - l.left) / l.months) * 100)}%"></i></div></div>
        </div>`).join("")}</div>` : ""}

      ${Vibe.subs && Vibe.subs.list().length ? `
      <h2 class="sec">Подписки <small>${Vibe.rub(Vibe.subs.total())}/мес</small></h2>
      <button class="card tight c-lilac tap" data-go="profile" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left">
        <span style="font-size:24px;letter-spacing:-6px">${Vibe.subs.list().map((x) => x.e).join("")}</span>
        <div style="flex:1;padding-left:8px"><b>${Vibe.subs.list().length} ${Vibe.game.plural(Vibe.subs.list().length, "подписка", "подписки", "подписок")}</b><div style="font-size:12px;font-weight:700">Управлять — в профиле</div></div><span>›</span>
      </button>` : ""}
      ${(s.jar || 0) > 0 ? `<div class="card tight c-orange" style="margin-top:12px;display:flex;gap:10px;align-items:center"><span style="font-size:26px">🐷</span><div style="flex:1"><b>Копилка: ${Vibe.rub(s.jar)}</b><div style="font-size:12px;font-weight:700">12% годовых, проценты 1-го числа</div></div></div>` : ""}

      <h2 class="sec">Траты по категориям <small>${Vibe.game ? Vibe.game.info().monthName : ""}</small></h2>
      <div data-spend>${spendHtml()}</div>

      <h2 class="sec">Операции <small data-txn>${s.tx.length}</small></h2>
      <div class="card" style="padding:4px 14px" data-txlist>${txList()}</div>
      <div class="fine">Vibe Pay — не банк, а состояние души. Вклады не застрахованы, зато очень красивые.</div>
      `;
    },

    mount(root, params) {
      // Живое обновление: операции, карты и траты (раскрытая категория сохраняется)
      let openCat = null, last = "";
      const refresh = () => {
        const l = root.querySelector("[data-txlist]"); if (l) l.innerHTML = txList();
        const n = root.querySelector("[data-txn]"); if (n) n.textContent = S().tx.length;
        const c = root.querySelector("[data-cards]"); if (c) { const h = cardsHtml(); if (c.innerHTML !== h) c.innerHTML = h; }
        const sp = root.querySelector("[data-spend]");
        if (sp) { const h = spendHtml(); if (h !== last) { last = h; sp.innerHTML = h; if (openCat) showCat(openCat, false); } }
      };
      last = spendHtml();
      const off = Vibe.state.on(refresh);
      function showCat(t, toggle = true) {
        root.querySelectorAll("[data-cattx]").forEach((x) => {
          const on = x.dataset.cattx === t && (!toggle || !x.classList.contains("on"));
          x.classList.toggle("on", on);
          x.innerHTML = on ? catTx(t) : "";
          const row = x.previousElementSibling; if (row) row.classList.toggle("on", on);
        });
        openCat = root.querySelector(".sp-tx.on") ? t : null;
      }

      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        const act = a.dataset.act;
        if (act === "card") { FX.bump(a); FX.sound.pop(); cardSheet(a.dataset.id); }
        if (act === "transfer") openTransfer();
        if (act === "topup") askMom(a);
        if (act === "credit") openCredit();
        if (act === "jar") openJar();
        if (act === "cashback") Vibe.cashback.sheet();
        if (act === "months") Vibe.month.history();
        if (act === "cat") { FX.sound.pop(); showCat(a.dataset.t); }
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
      <div class="amount-display big-num" data-amount>0 ₫</div>
      <div class="chips" style="justify-content:center;margin:0">
        ${[500, 1000, 5000].map((v) => `<button class="chip" data-quick="${v}">+${Vibe.fmt(v)}</button>`).join("")}
      </div>
      <div class="keypad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k) => k === "" ? "<span></span>" : `<button data-key="${k}">${k}</button>`).join("")}
      </div>
      <button class="btn black xl block" data-send disabled>Отправить <span class="arrow">→</span></button>
      <div class="fine">Комиссия 0 ₫*. *Комиссия за отсутствие комиссии — 1%.</div>
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
  const MOM = ["Опять? Ладно. Только не на ерунду.", "Держи. Шапку купи!", "Последний раз. Ты {поел|поела}?", "Папе не говори.", "Это на еду, а не на рамен."];
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
    const lim = credit.limit(), debt = credit.debt(), av = credit.available();
    const ladder = `
      <div class="cr-lim card tight">
        <div class="cr-lim-h"><small>Твой реальный лимит</small><b>${Vibe.rub(lim)}</b></div>
        <div class="pc-bar cr-bar"><i style="width:${Math.min(100, Math.round((debt / Math.max(1, lim)) * 100))}%"></i></div>
        <div class="cr-lim-f"><span>Занято долгами: ${Vibe.rub(Math.min(debt, 9999999))}</span><span>Свободно: <b>${Vibe.rub(av)}</b></span></div>
      </div>
      <div class="cr-steps">${credit.steps().map((x) => `<div class="cr-step ${x.ok ? (x.bad ? "" : "ok") : x.bad ? "bad" : ""}"><span>${x.e}</span><div><b>${x.t}</b><small>${Vibe.esc(x.n)}</small></div><em>${x.v}</em></div>`).join("")}</div>`;
    const ad = `<div class="badge cr-ad" style="background:var(--lime)">⚡ Предодобрено до ${Vibe.rub(AD_LIMIT)}*</div>`;
    const adFine = `<div class="fine">*«Предодобрено» — маркетинговый термин. «Одобрено» — финансовый. Это разные отделы, и они не разговаривают.</div>`;
    if (av < credit.MIN) {
      Vibe.ui.sheet(`
        ${ad}
        <div class="display" style="font-size:28px;margin:10px 0 4px">Пока не одобрено 🙈</div>
        <p style="font-weight:700;margin-bottom:12px">${s.balance < 0 ? "Сначала выйди из минуса — с ним банк не даёт ни копейки." : debt > 0 ? "Лимит съели текущие долги. Плати 30-го без просрочек — и он освободится." : "Пока лимит слишком мал. Получи зарплату — каждая добавляет 8 000 ₫."}</p>
        ${ladder}
        <div class="card tight c-lilac" style="margin-top:12px;display:flex;gap:10px;align-items:center">${Vibe.zabotik(44, "sly")}<span style="font-weight:700;font-size:13px">Мы всё равно тебя любим. Просто в долг — меньше 💜</span></div>
        <button class="btn black block" style="margin-top:14px" data-close>Понятно</button>
        ${adFine}`);
      return;
    }
    const step = 1000;
    const maxSum = av;
    const minSum = Math.min(credit.MIN, maxSum);
    const start = Math.max(minSum, Math.round(maxSum / 2 / step) * step);
    Vibe.ui.sheet(`
      ${ad}
      <div class="display" style="font-size:30px;margin:10px 0 2px">Одобрено: ${Vibe.rub(maxSum)}</div>
      <div class="muted" style="font-weight:800;font-size:13px">Это меньше, чем в рекламе. Зато честнее, чем в рекламе</div>
      <div class="big-num credit-sum" data-sum>${Vibe.rub(start)}</div>
      <input type="range" min="${minSum}" max="${maxSum}" step="${step}" value="${start}" data-range>
      <div class="chips" style="margin-top:12px" data-terms>${[6, 12, 24, 36].map((m) => `<button class="chip ${m === 12 ? "on" : ""}" data-m="${m}">${m} мес</button>`).join("")}</div>
      <div class="credit-grid">
        <div class="card tight c-yellow"><small>Платёж в месяц</small><b data-month></b></div>
        <div class="card tight c-pink"><small>Переплата</small><b data-over></b></div>
      </div>
      <div class="card tight c-lilac" style="margin-top:10px;display:flex;gap:10px;align-items:center">${Vibe.zabotik(44, "sly")}<span style="font-weight:700;font-size:13px" data-zab></span></div>
      <button class="btn grad xl block" style="margin-top:16px" data-take>Получить за 1 минуту <span class="arrow">→</span></button>
      <h2 class="sec" style="margin-top:18px">Как растёт лимит</h2>
      ${ladder}
      <div class="fine">Ставка ${s.job ? "29,9" : "59,9"}% годовых${s.job ? "" : " (без работы — дороже)"}. Платёж списывается автоматически 30-го. Не хватит денег — уйдёшь в минус под 1% в день, и лимит сожмётся. Страховка вайба включена.</div>
      ${adFine}
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
          range.style.setProperty("--p", ((v - minSum) / Math.max(1, maxSum - minSum)) * 100 + "%");
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
          const v = Math.min(+range.value, credit.available());
          const btn = e.currentTarget;
          if (v < minSum) { FX.shake(btn); FX.toast("Лимит изменился, пока ты думал{|а}. Так бывает", "🫠"); return; }
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
            Vibe.modal(`<div class="m-emo float">🤑</div><div class="display">+${Vibe.rub(v)}</div><p>Деньги на счёте. Платёж ${Vibe.rub(loan.monthly)} будет списываться ${loan.dom}-го числа ${months} месяцев. Свободный лимит теперь ${Vibe.rub(credit.available())}. Мы напомним. Точнее, просто спишем.</p><button class="btn black block" data-close>Понятно</button>`);
          }, 1900);
        });
      },
    });
  }

  /* ---------- Копилка ---------- */
  function openJar() {
    const saved = S().jar || 0;
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
      <button class="btn block" style="margin-top:12px" data-jarout>Забрать всё на карту</button>
      <div class="card tight" style="margin-top:14px;display:flex;align-items:center;gap:12px"><div style="flex:1;font-weight:800">Округлять покупки<div class="muted" style="font-size:12px">Сдача летит в копилку</div></div><button class="switch ${S().roundUp ? "on" : ""}" data-round></button></div>
    `, {
      onMount(sh) {
        sh.addEventListener("click", (e) => {
          const p = e.target.closest("[data-put]");
          if (p) {
            const v = +p.dataset.put;
            if (v > S().balance) { FX.shake(p); return; }
            const nv = (S().jar || 0) + v;
            Vibe.state.set({ jar: nv, balance: S().balance - v });
            FX.coins(p, sh.querySelector(".jar"), 5, { emoji: "🪙" });
            FX.countTo(sh.querySelector("[data-jar]"), nv, { fmt: Vibe.rub });
            const pct = Math.min(100, (nv / goal) * 100) + "%";
            sh.querySelector("[data-fill]").style.setProperty("--p", pct);
            sh.querySelector("[data-jarbar]").style.setProperty("--p", pct);
            Vibe.refreshCounters();
            if (nv >= goal && !S().jarDone) { Vibe.state.set({ jarDone: true }); FX.confetti(); FX.toast("Цель достигнута! Купишь или ещё подкопишь?", "🎉"); }
          }
          if (e.target.closest("[data-jarout]")) {
            const j = S().jar || 0;
            if (!j) { FX.shake(e.target.closest("[data-jarout]")); return; }
            Vibe.state.set({ jar: 0 });
            Vibe.addMoney(j, { title: "Из копилки на карту", emoji: "🐷" });
            sh.querySelector("[data-jar]").textContent = Vibe.rub(0);
            sh.querySelector("[data-fill]").style.setProperty("--p", "0%");
            FX.toast(`+${Vibe.rub(j)} на карте. Мечта подождёт`, "🐷");
          }
          const r = e.target.closest("[data-round]");
          if (r) { r.classList.toggle("on"); Vibe.state.set({ roundUp: r.classList.contains("on") }); FX.sound.pop(); }
        });
      },
    });
  }

  const css = `
  .cards-row { padding-top: 8px; }
  .pc-card { position: relative; flex: 0 0 290px; width: 290px; height: 178px; padding: 16px 18px; border: var(--line); border-radius: 26px; box-shadow: var(--shadow); text-align: left; color: inherit; display: flex; flex-direction: column; justify-content: space-between; transition: transform .15s var(--spring); }
  .pc-card:active { transform: scale(.97); }
  .pc-card.c-black, .pc-card.c-grad { color: #fff; }
  .pc-static { width: 100%; flex: none; }
  .pc-row { display: flex; align-items: center; gap: 8px; }
  .pc-kind { flex: 1; font-size: 11px; font-weight: 900; opacity: .85; line-height: 1.15; }
  .pc-big { font-family: var(--font-display); font-size: 30px; line-height: 1; margin-top: 4px; }
  .pc-line { font-size: 12px; font-weight: 800; opacity: .9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pc-bar { height: 8px; border: 2px solid var(--ink); border-radius: 6px; background: rgba(255,255,255,.7); overflow: hidden; }
  .pc-bar i { display: block; height: 100%; background: var(--ink); border-radius: 4px; }
  .pc-foot { justify-content: space-between; font-size: 14px; }
  .cards-hint { font-size: 11px; font-weight: 800; color: var(--muted); margin: 2px 4px 0; }
  .bal-card { margin-top: 6px; }
  .cb-strip { display: flex; gap: 12px; align-items: center; width: 100%; margin-top: 12px; padding: 12px 14px; }
  .cb-strip b { display: block; font-size: 15px; } .cb-strip small { display: block; font-size: 12px; font-weight: 800; }
  .pay-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
  .pa { border: var(--line); border-radius: 22px; box-shadow: var(--shadow-sm); padding: 12px 0 10px; font-size: 12px; font-weight: 900; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform .15s var(--spring), box-shadow .15s; }
  .pa .emo { font-size: 28px; }
  .pa:active { transform: translateY(3px) scale(.95); box-shadow: none; }
  .sp-card { padding: 16px; }
  .sp-empty { display: flex; gap: 12px; align-items: center; } .sp-empty small { display: block; font-size: 12px; font-weight: 700; color: var(--muted); }
  .sp-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .sp-top small { font-size: 12px; font-weight: 800; color: var(--muted); }
  .sp-sum { font-size: 34px; margin-top: 2px; }
  .sp-cmp { font-size: 11px; font-weight: 800; text-align: right; line-height: 1.25; max-width: 132px; flex: none; padding: 6px 10px; border-radius: 12px; border: 2px solid var(--ink); background: var(--bg); } .sp-cmp b { font-size: 15px; display: block; } .sp-cmp small { display: block; font-weight: 700; opacity: .8; } .sp-cmp small { font-weight: 700; opacity: .8; }
  .sp-stack { display: flex; height: 18px; border: 2.5px solid var(--ink); border-radius: 10px; overflow: hidden; margin: 12px 0 6px; }
  .sp-stack i { min-width: 3px; } .sp-stack i + i { border-left: 2px solid var(--ink); }
  .sp-rows { display: grid; }
  .sp-row { display: flex; align-items: center; gap: 10px; padding: 9px 2px; text-align: left; width: 100%; border-bottom: 1.5px dashed rgba(14,14,18,.12); }
  .sp-row.on { background: var(--bg); border-radius: 12px; }
  .sp-ic { width: 36px; height: 36px; flex: none; border-radius: 12px; border: 2px solid var(--ink); display: grid; place-items: center; font-size: 18px; }
  .sp-mid { flex: 1; min-width: 0; display: grid; gap: 5px; }
  .sp-name { display: flex; justify-content: space-between; gap: 6px; font-size: 14px; } .sp-name small { font-weight: 900; font-size: 12px; color: var(--muted); }
  .sp-bar { height: 8px; border-radius: 5px; background: rgba(14,14,18,.07); overflow: hidden; }
  .sp-bar i { display: block; height: 100%; width: var(--w); border-radius: 5px; border-right: 2px solid var(--ink); animation: sp-grow .9s var(--out) both; animation-delay: calc(var(--i, 0) * 60ms); }
  @keyframes sp-grow { from { width: 0; } }
  .sp-amt { display: grid; justify-items: end; font-size: 14px; white-space: nowrap; min-width: 78px; }
  .sp-amt em { font-style: normal; font-size: 11px; font-weight: 900; } .sp-amt .sp-up { color: #e5333d; } .sp-amt .sp-dn { color: #138a52; } .sp-amt .sp-nw { color: var(--muted); }
  .sp-tx { display: none; padding: 2px 4px 8px 48px; } .sp-tx.on { display: grid; gap: 6px; }
  .sp-txi { display: flex; gap: 8px; align-items: center; font-size: 12px; font-weight: 700; }
  .sp-txi .t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .sp-txi small { display: block; color: var(--muted); font-size: 11px; }
  .sp-big { display: flex; gap: 10px; align-items: center; margin-top: 12px; padding: 10px 12px; border: 2px solid var(--ink); border-radius: 16px; background: var(--yellow); }
  .sp-big .emo { font-size: 26px; } .sp-big div { flex: 1; min-width: 0; } .sp-big small { display: block; font-size: 11px; font-weight: 800; }
  .sp-big div b { display: block; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .sp-big-a { font-size: 15px; white-space: nowrap; }
  .cr-ad { font-size: 12px; }
  .cr-lim { margin-top: 4px; } .cr-lim-h { display: flex; justify-content: space-between; align-items: baseline; } .cr-lim-h small { font-weight: 800; font-size: 12px; } .cr-lim-h b { font-family: var(--font-display); font-weight: 400; font-size: 22px; }
  .cr-bar { margin: 8px 0 6px; background: var(--lime); } .cr-bar i { background: var(--pink); border-right: 2px solid var(--ink); }
  .cr-lim-f { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; gap: 8px; }
  .cr-steps { display: grid; gap: 6px; margin-top: 10px; }
  .cr-step { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 14px; background: var(--bg); font-size: 13px; }
  .cr-step > span { font-size: 20px; } .cr-step div { flex: 1; min-width: 0; } .cr-step small { display: block; font-size: 11px; font-weight: 700; color: var(--muted); }
  .cr-step em { font-style: normal; font-weight: 900; white-space: nowrap; } .cr-step.ok em { color: #138a52; } .cr-step.bad em { color: #e5333d; }
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
