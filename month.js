/* ============================================================
   Месячный цикл Vibe — главный ритм жизни в супер-аппе.
   • Учёт месяца: доходы, расходы по категориям, кэшбек (state.mon, архив state.monHist)
   • «Итоги месяца» — сторис в духе годовых итогов, только каждый месяц
   • Ритуал кэшбека — раз в месяц: рубашкой вверх, переворот, выбор, «зафиксировано»
   • День зарплаты (30-е) — зарплата приходит и тут же уходит каскадом автоплатежей
   API: Vibe.month.recap(ledger?), ritual(), payday(events), history()
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const G = () => Vibe.game;
  const esc = (s) => Vibe.esc(s == null ? "" : String(s));
  const rub = (n) => Vibe.rub(Math.round(n));
  const NOM = ["Ноябрь", "Декабрь", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь"];
  const GEN = ["ноября", "декабря", "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября"];
  const PREP = ["ноябре", "декабре", "январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре"];
  const curM = () => Math.floor(G().info().day / 30);
  const live = () => !!(S().profile && S().game && Vibe.game);

  /* ---------- Категории трат ---------- */
  const CATS = [
    ["Подписки", "📺", /Подписка|Плюс Вайб|Телеком|тариф/i],
    ["Кредиты", "🏦", /Кредит|Платёж по|Проценты за минус|Ипотек/i],
    ["Жильё", "🔑", /Аренда|ЖКХ|Rent|Vibe Home|Clean|уборк|залог|риелтор/i],
    ["Еда", "🍜", /Eat|Supermarket|Кофе|латте|Шаурма|перекус|еда ×|Вендинг|ресторан|Cola|продукт/i],
    ["Транспорт", "🚕", /такси|Maps|метро|самокат|Drive|Auto|бензин|парков|каршер|поездк/i],
    ["Здоровье", "💊", /Health|врач|аптек|Психолог|Фитнес|страхов|полис|клиник/i],
    ["Развлечения", "🎉", /Tickets|концерт|Games|кино|Music|Книг|Колесо|Лото|Travel|тур|билет/i],
    ["Шопинг", "🛍️", /Market|Style|Цвет|Flowers|Pets|подар/i],
  ];
  const CAT_E = Object.fromEntries([...CATS.map(([n, e]) => [n, e]), ["Прочее", "🧾"]]);
  const classify = (t) => (CATS.find(([, , re]) => re.test(t)) || ["Прочее"])[0];
  const CAT_JOKE = {
    Еда: "Твой холодильник — это курьер. Курьер об этом знает",
    Транспорт: "Ноги прекрасно работают. Просто им не платят кэшбек",
    Жильё: "Енот-арендодатель передаёт привет и чек",
    Кредиты: "Ты не тратишь деньги. Ты тратишь будущие деньги. Удобно",
    Подписки: "Ты платишь за то, что почти не открываешь. Как все",
    Развлечения: "Веселье — это инвестиция. Доходность — эмоции",
    Шопинг: "Вещи делают тебя счастливым. Ненадолго, но регулярно",
    Здоровье: "Здоровье не купишь. Но ты стараешься",
    Прочее: "Мы сами не поняли, что это было. Но было дорого",
  };

  /* ---------- Учёт месяца ---------- */
  const fresh = (m) => ({ m, inc: 0, out: 0, cats: {}, cb: 0, cbCats: {}, eat: 0, taxi: 0, n: 0, big: null, payAt: null });
  function ledger() {
    const m = curM();
    const L = S().mon;
    if (L && L.m === m) return L;
    // Новый месяц: старый уходит в архив и в очередь на «Итоги»
    const patch = { mon: fresh(m) };
    if (L && L.n > 0) { patch.monHist = [L, ...(S().monHist || [])].slice(0, 12); patch.monRecap = L.m; }
    set(patch);
    return S().mon;
  }
  // Учёт события, которое произошло в день `day` (догоняющий тик), а не «сейчас»
  function ledgerFor(day) {
    const md = Math.floor(day / 30);
    const L = S().mon;
    if (!L || L.m < md) {
      const patch = { mon: fresh(md) };
      if (L && L.n > 0) { patch.monHist = [L, ...(S().monHist || [])].slice(0, 12); patch.monRecap = L.m; }
      set(patch);
      return { L: S().mon, hist: false };
    }
    if (L.m === md) return { L, hist: false };
    // Событие прошлого месяца, который уже в архиве
    const H = S().monHist || [];
    const k = H.findIndex((x) => x.m === md);
    if (k >= 0) return { L: H[k], hist: true, k };
    return null;
  }
  function add(amount, title, vib, cbCat, day) {
    if (!live()) return;
    let target = null;
    if (day != null) { target = ledgerFor(day); if (!target) return; }
    const L0 = target ? target.L : ledger();
    const L = Object.assign({}, L0, { cats: Object.assign({}, L0.cats), cbCats: Object.assign({}, L0.cbCats) });
    if (amount > 0) L.inc += amount;
    else if (amount < 0) {
      const a = -amount, c = classify(title);
      L.out += a; L.cats[c] = (L.cats[c] || 0) + a;
      if (!L.big || a > L.big.a) L.big = { t: title, a };
      if (/Eat/.test(title)) L.eat++;
      if (/такси/i.test(title)) L.taxi++;
    }
    if (vib > 0) { L.cb += vib; const k = cbCat || "Базовая ставка"; L.cbCats[k] = (L.cbCats[k] || 0) + vib; }
    L.n++;
    if (target && target.hist) { const H = (S().monHist || []).slice(); H[target.k] = L; set({ monHist: H }); }
    else set({ mon: L });
  }
  Vibe.on("pay", (d) => add(-d.amount, d.title, d.vib, d.cbCat));
  Vibe.on("tx", (d) => { if (d.amount) add(d.amount, d.title, 0, null, d.day); });

  /* ---------- Оверлей (общий для итогов, ритуала и зарплаты) ---------- */
  let ov = null;
  function open(cls, html) {
    close(true);
    ov = document.createElement("div");
    ov.className = "mr-ov " + cls;
    ov.innerHTML = html;
    document.body.appendChild(ov);
    if (document.getElementById("tabbar")) document.getElementById("tabbar").classList.add("mr-hide");
    return ov;
  }
  function close(quick) {
    if (!ov) return;
    const el = ov; ov = null;
    if (el._kill) el._kill();
    const tb = document.getElementById("tabbar"); if (tb) tb.classList.remove("mr-hide");
    if (quick) return el.remove();
    el.classList.add("out");
    setTimeout(() => el.remove(), 260);
  }
  const busy = () => !!(ov || document.querySelector(".modal, .sheet, .st-viewer")) || /welcome|ending/.test(location.hash) || document.hidden;

  /* ---------- «Итоги месяца» ---------- */
  function recap(L) {
    L = L || (S().monHist || [])[0];
    if (!L) { FX.toast("Итоги появятся в конце первого месяца. Пока живи", "📊"); return; }
    const mi = L.m % 12, name = NOM[mi];
    const net = L.inc - L.out;
    const cats = Object.entries(L.cats).sort((a, b) => b[1] - a[1]);
    const top = cats[0];
    const max = top ? top[1] : 1;
    const cbChoice = S().cbChoice && S().cbChoice.m === L.m ? S().cbChoice.ids : [];
    const chosenNames = cbChoice.map((id) => (Vibe.cashback.CATS.find((c) => c.id === id) || {})).filter((c) => c.t);
    const zero = chosenNames.filter((c) => !L.cbCats[c.t]);
    const cbRows = Object.entries(L.cbCats).sort((a, b) => b[1] - a[1]);
    const sl = ((S().body && S().body.sleepLog) || []).filter((x) => Math.floor(x.day / 30) === L.m);
    const sleepAvg = sl.length ? sl.reduce((a, x) => a + x.hours, 0) / sl.length : 0;
    let h = (L.out * 31 + L.m * 7) >>> 0;
    const rank = 2 + (h % 23);
    const slides = [
      `<div class="mr-s mr-grad">
        <small class="mr-k">Vibe · итоги месяца</small>
        <div class="mr-huge">${name}</div>
        <p class="mr-p">Ты прожил ещё 30 дней в Vibe City. Корпорация посчитала всё. Даже то, что ты хотел бы забыть.</p>
        <div class="mr-emo float">📊</div>
      </div>`,
      `<div class="mr-s mr-lime">
        <small class="mr-k">Деньги</small>
        <div class="mr-row"><span>Пришло</span><b class="mr-num" data-cnt="${Math.round(L.inc)}" data-sign="+">0</b></div>
        <div class="mr-row"><span>Ушло</span><b class="mr-num" data-cnt="${Math.round(L.out)}" data-sign="−">0</b></div>
        <div class="mr-line"></div>
        <div class="mr-row big"><span>Итог</span><b class="mr-num" data-cnt="${Math.round(Math.abs(net))}" data-sign="${net >= 0 ? "+" : "−"}">0</b></div>
        <p class="mr-p">${net >= 0 ? `Ты сохранил ${rub(net)}. Мы уже придумали, на что их потратить` : "Ты потратил больше, чем заработал. В отчёте это называется «инвестиция в себя»"}</p>
      </div>`,
      `<div class="mr-s mr-pink">
        <small class="mr-k">Куда ушли деньги</small>
        ${cats.length ? `<div class="mr-bars">${cats.slice(0, 5).map(([c, a], i) => `<div class="mr-bar" style="--i:${i}"><span>${CAT_E[c] || "🧾"} ${c}</span><i style="--w:${Math.max(6, Math.round((a / max) * 100))}%"></i><b>${rub(a)}</b></div>`).join("")}</div>
        <p class="mr-p">${top ? `Больше всего — «${top[0]}». ${CAT_JOKE[top[0]] || ""}` : ""}</p>` : `<p class="mr-p">Ты почти ничего не потратил. Корпорация обеспокоена. Всё в порядке?</p>`}
      </div>`,
      `<div class="mr-s mr-yellow">
        <small class="mr-k">Кэшбек</small>
        <div class="mr-huge"><span data-cnt="${L.cb}" data-sign="+">0</span> 🪙</div>
        <p class="mr-p" style="margin-top:0">вайбиков за месяц</p>
        ${cbRows.length ? `<div class="mr-list">${cbRows.slice(0, 4).map(([c, v]) => `<div><span>${esc(c)}</span><b>+${Vibe.fmt(v)}</b></div>`).join("")}</div>` : ""}
        ${zero.length ? `<p class="mr-p">${zero.map((c) => `«${esc(c.t)}» — 0 вайбиков`).join(", ")}. Выбор был смелый.</p>` : chosenNames.length ? `<p class="mr-p">Все твои категории сработали. Подозрительно хорошо.</p>` : `<p class="mr-p">Категории не выбраны — весь месяц на базовой ставке 0,5%. Как в 2007-м.</p>`}
      </div>`,
      `<div class="mr-s mr-sky">
        <small class="mr-k">Жизнь в цифрах</small>
        <div class="mr-grid">
          <div><b data-cnt="${L.eat}">0</b><small>${G().plural(L.eat, "заказ", "заказа", "заказов")} в Vibe Eat</small></div>
          <div><b data-cnt="${L.taxi}">0</b><small>${G().plural(L.taxi, "поездка", "поездки", "поездок")} на такси</small></div>
          <div><b>${sleepAvg ? sleepAvg.toFixed(1).replace(".", ",") : "—"}</b><small>часов сна в среднем</small></div>
          <div><b data-cnt="${L.n}">0</b><small>${G().plural(L.n, "операция", "операции", "операций")} по карте</small></div>
        </div>
        ${L.big ? `<p class="mr-p">Самая большая трата — «${esc(L.big.t)}», ${rub(L.big.a)}. Ты помнишь, зачем? Мы — да.</p>` : ""}
      </div>`,
      `<div class="mr-s mr-black">
        <small class="mr-k" style="color:var(--lime)">Итог</small>
        <div class="mr-huge" style="color:var(--lime)">топ-${rank}%</div>
        <p class="mr-p" style="color:#fff">жителей Vibe City по тратам на «${top ? top[0].toLowerCase() : "ничего"}». Корпорация гордится. Банк — особенно.</p>
        <button class="btn lime xl block" data-mr-cb>🪙 Выбрать кэшбек на ${NOM[(mi + 1) % 12].toLowerCase()}</button>
        <button class="btn block" data-mr-x style="margin-top:10px">Закрыть</button>
      </div>`,
    ];
    const el = open("mr-recap", `
      <div class="mr-bars-top">${slides.map(() => `<i><b></b></i>`).join("")}</div>
      <button class="mr-x" data-mr-x aria-label="Закрыть">✕</button>
      <div class="mr-stage">${slides.map((s, i) => `<div class="mr-slide" data-i="${i}">${s}</div>`).join("")}</div>`);
    let i = -1, t = 0, start = 0, paused = false, raf = 0;
    const DUR = 5200;
    const segs = [...el.querySelectorAll(".mr-bars-top i b")];
    const go = (n) => {
      if (n < 0) n = 0;
      if (n >= slides.length) return finish(false);
      i = n; start = performance.now(); t = 0;
      el.querySelectorAll(".mr-slide").forEach((s, k) => s.classList.toggle("on", k === i));
      segs.forEach((b, k) => b.style.width = k < i ? "100%" : "0%");
      const cur = el.querySelector(`.mr-slide[data-i="${i}"]`);
      cur.querySelectorAll("[data-cnt]").forEach((x) => { const sign = x.dataset.sign || ""; FX.countTo(x, +x.dataset.cnt, { dur: 900, fmt: (v) => sign + Vibe.fmt(Math.round(v)) }); });
      cur.querySelectorAll(".mr-bar i").forEach((b) => requestAnimationFrame(() => b.classList.add("go")));
      FX.haptic(6);
    };
    const loop = (now) => {
      if (!ov || ov !== el) return;
      if (!paused) { t = now - start; segs[i] && (segs[i].style.width = Math.min(100, (t / DUR) * 100) + "%"); if (t >= DUR && i < slides.length - 1) go(i + 1); }
      raf = requestAnimationFrame(loop);
    };
    function finish(toCb) {
      set({ monRecap: null });
      close();
      if (toCb || !Vibe.cashback.chosen()) setTimeout(ritual, 420);
    }
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-mr-cb]")) return finish(true);
      if (e.target.closest("[data-mr-x]")) return finish(false);
      if (e.target.closest("button")) return;
      const x = e.clientX / window.innerWidth;
      go(x < 0.3 ? i - 1 : i + 1);
    });
    el.addEventListener("pointerdown", () => { paused = true; });
    el.addEventListener("pointerup", () => { if (paused) { paused = false; start = performance.now() - t; } });
    el._kill = () => cancelAnimationFrame(raf);
    FX.sound.levelup && FX.sound.levelup();
    go(0);
    raf = requestAnimationFrame(loop);
  }

  /* ---------- Ира, менеджер по кэшбеку ----------
     Раз в месяц среди категорий лежит её записка. Ответить можно только
     выбрав её карту (кэшбека она не даёт). Потом Иры не станет — без объяснений. */
  const IRA_GONE = 4;
  function iraLine(stage, picks) {
    if (stage === 0) return "Если вы это читаете — меня зовут Ира, я менеджер по кэшбеку";
    if (stage === 1) return picks ? `Спасибо тем ${12 + picks * 7}, кто меня выбрал. Я не одна` : "Это снова Ира. Кофемашина сломалась";
    if (stage === 2) return "Ира всё ещё здесь";
    return "Ира в отпуске (нет)";
  }
  // Вызывается при открытии ритуала: двигает историю на месяц вперёд (один раз за месяц)
  function iraCard(m) {
    if (m < 1) return null;
    let I = Object.assign({ stage: -1, m: -1, picks: 0 }, S().ira || {});
    if (I.m !== m) { I = Object.assign({}, I, { stage: I.stage + 1, m }); set({ ira: I }); }
    if (I.stage >= IRA_GONE) return { gone: I.stage === IRA_GONE };
    return { id: "ira", e: "✉️", r: 0.01, t: iraLine(I.stage, I.picks), ira: true };
  }

  /* ---------- Ритуал выбора кэшбека ---------- */
  function ritual() {
    if (!live() || !Vibe.cashback) return;
    const cb = Vibe.cashback;
    const m = curM(), mi = m % 12;
    const offer = cb.offer();
    const ira = iraCard(m);
    if (ira && ira.id) offer.splice(5, 1, ira);
    const cur = cb.chosen();
    const lim = cb.limit();
    const last = (S().monHist || [])[0];
    const lastBest = last ? Object.entries(last.cbCats || {}).sort((a, b) => b[1] - a[1])[0] : null;
    const pick = new Set(cur || []);
    const card = (c) => `
      <button class="mr-cc ${c.ira ? "ira" : ""} ${cur ? "turned" : ""} ${pick.has(c.id) ? "on stamped" : ""}" data-cc="${c.id}" ${cur ? "disabled" : ""}>
        <span class="mr-cc-in">
          <span class="mr-cc-back"><b>V</b><small>кэшбек</small></span>
          <span class="mr-cc-face"><span class="emo">${c.e}</span><b>${Math.round(c.r * 100)}%</b><small>${esc(c.t)}</small><i class="mr-stamp">ЗАФИКСИРОВАНО</i></span>
        </span>
      </button>`;
    const el = open("mr-rit", `
      <button class="mr-x" data-mr-x aria-label="Закрыть">✕</button>
      <div class="mr-rit-in">
        <small class="mr-k" style="color:var(--lime)">Раз в месяц · ${NOM[mi]}</small>
        <div class="mr-title">Кэшбек на ${PREP[mi]}</div>
        ${ira && ira.gone ? `<div class="mr-ai">Категории этого месяца подобраны ИИ. Мы ценим креативность наших сотрудников!</div>` : ""}
        <p class="mr-p" data-sub>${cur ? `Категории зафиксированы до 30 ${GEN[mi]}. Новые — 1 ${GEN[(mi + 1) % 12]}. Мы уважаем твой выбор. Почти.` : `8 категорий, ${lim} выбора, ${NOM[mi].toLowerCase()} целиком. Передумать нельзя — это и есть кэшбек.`}</p>
        <div class="mr-cgrid">${offer.map(card).join("")}</div>
        ${cur ? `<button class="btn lime xl block" data-mr-x style="margin-top:16px">Понятно</button>` : `<button class="btn lime xl block" data-flip style="margin-top:16px">🎴 Открыть категории</button>`}
        <div class="fine" style="color:#a9a6b8;text-align:center">${lastBest ? `В прошлом месяце лучше всего сработало «${esc(lastBest[0])}»: +${Vibe.fmt(lastBest[1])} вайбиков.` : "Кэшбек начисляется вайбиками. 1 вайбик = 1 ₫ при оплате до 30% покупки."}</div>
      </div>`);
    const btn = () => el.querySelector("[data-flip], [data-ok]");
    let flipped = !!cur;
    const timers = [];
    el._kill = () => timers.forEach(clearTimeout);
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-mr-x]")) { close(); if (!Vibe.cashback.chosen()) set({ cbAsk: m }); return; }
      if (e.target.closest("[data-flip]") && !flipped) {
        flipped = true;
        const b = btn(); b.disabled = true;
        FX.sound.pop();
        el.querySelectorAll(".mr-cc").forEach((c, k) => timers.push(setTimeout(() => { c.classList.add("turned"); FX.haptic(5); }, 140 * k)));
        timers.push(setTimeout(() => {
          b.disabled = true; b.removeAttribute("data-flip"); b.setAttribute("data-ok", ""); b.textContent = `Выбрано 0 из ${lim}`;
          el.querySelector("[data-sub]").textContent = `Выбери ${lim}. Смешные категории — тоже категории.`;
        }, 140 * offer.length + 300));
        return;
      }
      const c = e.target.closest("[data-cc]");
      if (c && flipped && !cur) {
        const id = c.dataset.cc;
        if (pick.has(id)) pick.delete(id); else if (pick.size < lim) pick.add(id); else { FX.shake(c); return; }
        c.classList.toggle("on", pick.has(id)); FX.bump(c);
        const def = cb.CATS.find((x) => x.id === id);
        if (pick.has(id) && def && def.joke) FX.toast(def.joke, def.e, 2200);
        const b = btn();
        if (b) { b.disabled = pick.size !== lim; b.textContent = pick.size === lim ? `Зафиксировать до 30 ${GEN[mi]}` : `Выбрано ${pick.size} из ${lim}`; }
        return;
      }
      if (e.target.closest("[data-ok]") && pick.size === lim) {
        cb.choose([...pick]);
        Vibe.emit("cashback", [...pick]);
        if (pick.has("ira")) {
          const I = Object.assign({ picks: 0 }, S().ira || {});
          set({ ira: Object.assign({}, I, { picks: I.picks + 1 }) });
          if (I.picks + 1 === 2 && Vibe.msg) Vibe.msg.send("zabotik", "Мы заметили, что вы выбираете нерабочие категории! Подобрать вам что-то полезное? 😊", { from: "zabotik", delay: 40 });
        }
        const b = btn(); b.disabled = true; b.textContent = "Фиксируем…";
        el.querySelectorAll(".mr-cc.on").forEach((x, k) => timers.push(setTimeout(() => { x.classList.add("stamped"); FX.haptic(12); }, 260 * k)));
        el.querySelectorAll(".mr-cc:not(.on)").forEach((x) => x.classList.add("dim"));
        timers.push(setTimeout(() => {
          FX.confetti({ count: 90 }); FX.sound.success();
          FX.toast(`Категории на ${NOM[mi].toLowerCase()} выбраны. Самое время за ними сходить`, "🪙", 2800);
          setTimeout(() => close(), 900);
        }, 260 * lim + 500));
      }
    });
  }

  /* ---------- День зарплаты: каскад автоплатежей ---------- */
  function payday(events) {
    const evs = events.filter((e) => e.a);
    if (!evs.length) return;
    // Не перебиваем открытый ритуал, итоги, модалку или экран концовки — ждём своей очереди
    if (ov || document.querySelector(".modal, .sheet") || /welcome|ending/.test(location.hash)) { setTimeout(() => payday(events), 2000); return; }
    const pos = evs.filter((e) => e.a > 0).sort((a, b) => b.a - a.a);
    const neg = evs.filter((e) => e.a < 0).sort((a, b) => a.a - b.a);
    const total = evs.reduce((s, e) => s + e.a, 0);
    const after = S().balance, before = after - total;
    // Месяц — по дню самой зарплаты, а не по «сейчас» (тик мог захватить и следующий день)
    const pd = (evs.find((e) => e.kind === "salary") || {}).day;
    const mi = pd != null ? Math.floor(pd / 30) % 12 : G().info().month;
    const rows = [...pos, ...neg];
    const el = open("mr-pay", `
      <div class="mr-pay-in">
        <small class="mr-k">30 ${GEN[mi]} · день зарплаты</small>
        <div class="mr-pay-bal"><span data-bal>${Vibe.fmt(Math.round(before))}</span> ₫</div>
        <div class="mr-pay-list">${rows.map((e, k) => `<div class="mr-pr ${e.a > 0 ? "plus" : ""}" data-k="${k}"><span class="emo">${e.e || "💳"}</span><span class="t">${esc(e.title)}</span><b>${e.a > 0 ? "+" : "−"}${rub(Math.abs(e.a))}</b></div>`).join("")}</div>
        <div class="mr-pay-end" data-end></div>
        <button class="btn black xl block" data-mr-x style="margin-top:14px;opacity:0;pointer-events:none" data-done>Жить дальше</button>
      </div>`);
    const balEl = el.querySelector("[data-bal]");
    let bal = before;
    const timers = [];
    el._kill = () => timers.forEach(clearTimeout);
    const t0 = Date.now();
    rows.forEach((e, k) => timers.push(setTimeout(() => {
      const r = el.querySelector(`[data-k="${k}"]`); r.classList.add("in");
      bal += e.a;
      FX.countTo(balEl, Math.round(bal), { dur: e.a > 0 ? 900 : 500, fmt: (v) => Vibe.fmt(Math.round(v)) });
      if (e.a > 0) { FX.confetti({ count: 50 }); FX.sound.success(); } else { FX.haptic(8); FX.bump(balEl); }
    }, 700 + k * (k < pos.length ? 900 : 650))));
    const endAt = 700 + pos.length * 900 + neg.length * 650 + 500;
    timers.push(setTimeout(() => {
      const secs = Math.max(1, Math.round((Date.now() - t0) / 1000) - 1);
      const kept = after;
      const salary = pos.reduce((s, e) => s + e.a, 0);
      const share = salary ? Math.max(0, Math.round((kept - before) / salary * 100)) : 0;
      el.querySelector("[data-end]").innerHTML = `
        <div class="mr-pay-k">Осталось</div>
        <div class="mr-pay-left">${rub(kept)}</div>
        <p class="mr-p">${neg.length ? `Зарплата пожила у тебя ${secs} ${G().plural(secs, "секунду", "секунды", "секунд")}. От неё осталось ${share}%. Автоплатежи — это забота: ты даже не успел расстроиться.` : "Ни одного автоплатежа. Корпорация проверяет, всё ли с тобой в порядке."} До аванса — 15 дней.</p>`;
      el.querySelector("[data-end]").classList.add("in");
      const d = el.querySelector("[data-done]"); d.style.opacity = 1; d.style.pointerEvents = "auto";
      if (neg.length) FX.sound.pop();
    }, endAt));
    el.addEventListener("click", (e) => { if (e.target.closest("[data-mr-x]")) close(); });
    set({ mon: Object.assign({}, ledger(), { payAt: Date.now() }) });
  }

  /* ---------- Архив итогов ---------- */
  function history() {
    const H = S().monHist || [];
    if (!H.length) { FX.toast("Первые итоги — в конце месяца. Живи, Корпорация считает", "📊", 2600); return; }
    Vibe.ui.sheet(`
      <div class="display" style="font-size:26px">Итоги месяцев</div>
      <p class="muted" style="font-weight:700;margin:6px 0 12px">Всё, что ты потратил, — навсегда с нами</p>
      <div class="stack">${H.map((L, k) => { const net = L.inc - L.out; return `<button class="card tight tap" data-h="${k}" style="display:flex;gap:12px;align-items:center;width:100%;text-align:left"><span style="font-size:30px">📊</span><div style="flex:1"><b>${NOM[L.m % 12]}</b><small class="muted" style="display:block;font-weight:700">+${rub(L.inc)} · −${rub(L.out)} · 🪙 ${Vibe.fmt(L.cb)}</small></div><b style="color:${net >= 0 ? "#12a150" : "#e0263e"}">${net >= 0 ? "+" : "−"}${rub(Math.abs(net))}</b></button>`; }).join("")}</div>`, {
      onMount(sh, closeSh) { sh.addEventListener("click", (e) => { const b = e.target.closest("[data-h]"); if (b) { closeSh(); setTimeout(() => recap(H[+b.dataset.h]), 320); } }); },
    });
  }

  /* ---------- Когда показывать ---------- */
  setInterval(() => {
    if (!live()) return;
    ledger();
    if (busy()) return;
    const s = S();
    if (s.monRecap != null) { const L = (s.monHist || []).find((x) => x.m === s.monRecap); if (L) return recap(L); set({ monRecap: null }); }
  }, 2500);

  // Старый лист кэшбека превращаем в ритуал
  if (Vibe.cashback) Vibe.cashback.sheet = ritual;

  Vibe.month = { recap, ritual, payday, history, ledger, classify };

  const css = `
  .mr-ov { position: fixed; inset: 0; z-index: 260; display: flex; flex-direction: column; animation: fade-in .25s ease both; }
  .mr-ov.out { animation: fade-out .25s ease both; }
  #tabbar.mr-hide { transform: translateY(140%); opacity: 0; }
  .mr-x { position: absolute; top: calc(var(--safe-top) + 18px); right: 14px; z-index: 5; width: 40px; height: 40px; border-radius: 50%; background: rgba(14,14,18,.55); color: #fff; font-weight: 900; font-size: 18px; border: 0; }
  .mr-k { display: block; font-weight: 900; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; opacity: .8; }
  .mr-p { font-weight: 700; font-size: 15px; line-height: 1.35; margin-top: 14px; }
  .mr-huge { font-family: var(--font-display); font-size: 58px; line-height: .95; margin-top: 10px; letter-spacing: -1px; }
  .mr-title { font-family: var(--font-display); font-size: 34px; line-height: 1; margin: 8px 0 4px; color: #fff; }

  /* Итоги */
  .mr-recap { background: #0e0e12; }
  .mr-bars-top { position: absolute; top: calc(var(--safe-top) + 8px); left: 10px; right: 10px; z-index: 6; display: flex; gap: 4px; }
  .mr-bars-top i { flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,.3); overflow: hidden; }
  .mr-bars-top b { display: block; height: 100%; width: 0; background: #fff; }
  .mr-stage { position: relative; flex: 1; }
  .mr-slide { position: absolute; inset: 0; opacity: 0; transform: scale(.96); transition: opacity .3s, transform .4s var(--spring); pointer-events: none; }
  .mr-slide.on { opacity: 1; transform: none; pointer-events: auto; }
  .mr-s { position: absolute; inset: 0; padding: calc(var(--safe-top) + 64px) 22px calc(var(--safe-bottom) + 28px); display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
  .mr-grad { background: var(--grad); color: #fff; } .mr-lime { background: var(--lime); } .mr-pink { background: var(--pink); }
  .mr-yellow { background: var(--yellow); } .mr-sky { background: var(--sky); } .mr-black { background: #0e0e12; color: #fff; }
  .mr-emo { position: absolute; right: -10px; bottom: 40px; font-size: 140px; opacity: .9; }
  .mr-row { display: flex; justify-content: space-between; align-items: baseline; font-weight: 800; font-size: 18px; margin-top: 14px; }
  .mr-row.big { font-size: 22px; }
  .mr-num { font-family: var(--font-display); font-weight: 400; font-size: 34px; }
  .mr-row.big .mr-num { font-size: 46px; }
  .mr-line { height: 3px; background: var(--ink); margin-top: 14px; border-radius: 2px; }
  .mr-bars { display: grid; gap: 12px; margin-top: 16px; }
  .mr-bar { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; font-weight: 800; font-size: 15px; }
  .mr-bar i { grid-column: 1 / -1; height: 18px; border-radius: 9px; background: var(--ink); width: 0; transition: width .9s var(--spring); transition-delay: calc(var(--i) * 120ms); }
  .mr-bar i.go { width: var(--w); }
  .mr-bar b { grid-row: 1; grid-column: 2; }
  .mr-list { display: grid; gap: 6px; margin-top: 14px; font-weight: 800; }
  .mr-list div { display: flex; justify-content: space-between; background: rgba(255,255,255,.55); border-radius: 12px; padding: 8px 12px; }
  .mr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
  .mr-grid div { background: rgba(255,255,255,.6); border-radius: 18px; padding: 14px; }
  .mr-grid b { display: block; font-family: var(--font-display); font-weight: 400; font-size: 34px; line-height: 1; }
  .mr-grid small { font-weight: 800; font-size: 12px; }

  /* Ритуал кэшбека */
  .mr-rit { background: radial-gradient(120% 80% at 50% 0%, #3b2a7a 0%, #0e0e12 70%); color: #fff; overflow-y: auto; }
  .mr-rit-in { padding: calc(var(--safe-top) + 24px) 16px calc(var(--safe-bottom) + 24px); max-width: 480px; margin: 0 auto; width: 100%; }
  .mr-rit .mr-p { color: #d6d3e3; }
  .mr-cgrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 18px; }
  .mr-cc { perspective: 600px; height: 112px; min-width: 0; width: 100%; padding: 0; border: 0; background: none; color: var(--ink); transition: transform .2s var(--spring), opacity .3s; }
  .mr-cc.dim { opacity: .35; transform: scale(.94); }
  .mr-cc-in { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .55s var(--spring); }
  .mr-cc.turned .mr-cc-in { transform: rotateY(180deg); }
  .mr-cc-back, .mr-cc-face { position: absolute; inset: 0; border-radius: 16px; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 6px; text-align: center; }
  .mr-cc-back { background: var(--grad); border: 2.5px solid #fff; color: #fff; }
  .mr-cc-back b { font-family: var(--font-display); font-weight: 400; font-size: 36px; line-height: 1; }
  .mr-cc-back small { font-size: 9px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; opacity: .85; }
  .mr-cc-face { background: #fff; border: 2.5px solid var(--ink); transform: rotateY(180deg); box-shadow: 0 4px 0 var(--ink); overflow: hidden; }
  .mr-cc-face .emo { font-size: 26px; line-height: 1; }
  .mr-cc-face b { font-family: var(--font-display); font-weight: 400; font-size: 20px; line-height: 1; }
  .mr-cc-face small { font-size: 10px; font-weight: 800; line-height: 1.1; }
  .mr-cc.on .mr-cc-face { background: var(--lime); }
  .mr-cc.ira .mr-cc-face { background: #fff7d6; justify-content: flex-start; padding-top: 8px; }
  .mr-cc.ira .mr-cc-face b { font-size: 14px; }
  .mr-cc.ira .mr-cc-face small { font-size: 8.5px; line-height: 1.15; font-weight: 700; font-style: italic; }
  .mr-cc.ira.on .mr-cc-face { background: #ffe9a8; }
  .mr-ai { margin-top: 10px; font-size: 12px; font-weight: 800; color: #a9a6b8; border: 1.5px dashed #5a566b; border-radius: 12px; padding: 8px 10px; }
  .mr-stamp { position: absolute; left: -10%; right: -10%; top: 74%; transform: rotate(-18deg) scale(2.2); opacity: 0; background: #e0263e; color: #fff; font-style: normal; font-weight: 900; font-size: 8px; letter-spacing: .5px; padding: 3px 0; transition: transform .35s cubic-bezier(.2,1.6,.4,1), opacity .2s; }
  .mr-cc.stamped .mr-stamp { opacity: 1; transform: rotate(-18deg) scale(1); }

  /* День зарплаты */
  .mr-pay { background: var(--lime); overflow-y: auto; }
  .mr-pay-in { padding: calc(var(--safe-top) + 30px) 18px calc(var(--safe-bottom) + 24px); max-width: 480px; margin: 0 auto; width: 100%; }
  .mr-pay-bal { font-family: var(--font-display); font-size: 54px; line-height: 1; margin: 10px 0 18px; letter-spacing: -1px; }
  .mr-pay-list { display: grid; gap: 8px; }
  .mr-pr { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 16px; padding: 10px 12px; font-weight: 800; opacity: 0; transform: translateY(14px) scale(.96); transition: opacity .25s, transform .4s var(--spring); }
  .mr-pr.in { opacity: 1; transform: none; }
  .mr-pr.plus { background: var(--ink); color: var(--lime); }
  .mr-pr .emo { font-size: 24px; }
  .mr-pr .t { flex: 1; min-width: 0; font-size: 14px; }
  .mr-pr b { white-space: nowrap; }
  .mr-pay-end { opacity: 0; transform: translateY(10px); transition: opacity .3s, transform .4s var(--spring); margin-top: 18px; }
  .mr-pay-end.in { opacity: 1; transform: none; }
  .mr-pay-k { font-weight: 900; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; }
  .mr-pay-left { font-family: var(--font-display); font-size: 44px; line-height: 1; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
