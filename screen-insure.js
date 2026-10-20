/* ============================================================
   Vibe Страхование — вкладка «insure».
   • Полисы = ежемесячные подписки Vibe.subs (id "ins_<type>").
     Первый месяц — сразу, полис вступает в силу на следующий игровой день.
   • Свои случайные события пушатся в Vibe.events.LIST, а Vibe.events.show
     оборачивается: выборы событий переписываются по активным полисам,
     страховые случаи записываются в историю.
   • Страховой случай требует бумаг: 3 шага (заявление, справка о справке,
     фото ущерба) за 3 игровых дня. Не донёс — страховая просит вернуть
     половину сэкономленного (если нет «Страховки от страховок»).
   • «Твоя защищённость» и сатирический тест на риски.
   ============================================================ */
(function () {
  const V = Vibe;
  const S = () => V.state.get();
  const set = (p) => V.state.set(p);
  const G = () => V.game;
  const rub = (n) => V.rub(n);
  const esc = (s) => (V.esc ? V.esc(s) : String(s));
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const today = () => (G() && G().info ? G().info().day : 0);
  const restagger = (el) => { if (el) [...el.children].forEach((c, i) => c.style.setProperty("--i", i)); };
  const zab = (text, mood = "smile") => `<div class="ins-zab">${V.zabotik ? V.zabotik(50, mood) : "🤖"}<div class="ins-bub">${text}</div></div>`;
  const hasCar = () => !!(V.inv && V.inv.list("car").length);
  const hasPet = () => !!(V.inv && V.inv.list("pet").length);

  /* ---------- Полисы ---------- */
  const POL = {
    gadget: { n: "Гаджеты", e: "📱", col: "c-sky", price: 690, fr: 1000, short: "Телефон, часы, наушники",
      cover: ["Падение экраном вниз (то есть всегда)", "Купание в луже, ванне, супе", "Укусы котов, своих и чужих"], no: "Не покрывает: «он сам», если «он сам» — это ты" },
    home: { n: "Квартира и соседи", e: "🏠", col: "c-yellow", price: 990, fr: 0, short: "Затопление, пожар, кража у подъезда",
      cover: ["Затопил соседей снизу — платим мы", "Соседи сверху затопили тебя", "Пожар, утюг, шторы, самокат у подъезда"], no: "Не покрывает: соседа Валеру с перфоратором. Это форс-мажор" },
    health: { n: "ДМС: здоровье и зубы", e: "🦷", col: "c-mint", price: 1490, fr: 2000, short: "Стоматология, врачи, очки",
      cover: ["Сломанные зубы (орехи в шоколаде — тоже)", "Срочный врач без очереди в 40 минут", "Очки, на которые ты сел"], no: "Не покрывает: выгорание. Это не болезнь, это корпоративная культура" },
    kasko: { n: "КАСКО", e: "🚗", col: "c-orange", price: 2900, fr: 3000, short: "Царапины, угон, сосулька", needCar: true,
      cover: ["Царапины во дворе от «неизвестного»", "Сосулька, ветка, голубь с амбициями", "Угон (если машина кому-то нужна)"], no: "ОСАГО — отдельно, в Vibe Auto. КАСКО — для души машины" },
    travel: { n: "Путешествия", e: "✈️", col: "c-lilac", price: 590, fr: 500, short: "Багаж, болезни в отпуске",
      cover: ["Порванный чемодан и сбежавший багаж", "Болезнь в отпуске (чаще всего на 1-й день)", "Задержка рейса — моральная поддержка"], no: "Не покрывает: разочарование от отеля «как на фото»" },
    pet: { n: "Питомец", e: "🐾", col: "c-pink", price: 790, fr: 500, short: "Ветеринар, съеденные вещи", needPet: true,
      cover: ["Ветеринар, если кот съел что-то не то", "Прививки и стресс от прививок", "Съеденные провода (частично, по весу)"], no: "Не покрывает: моральный ущерб от того, что кот тебя не любит" },
    all: { n: "От всего", e: "🌈", col: "c-holo", price: 7900, fr: -1, short: "Покрывает ВСЁ. Франшиза 100%",
      cover: ["Абсолютно все случаи жизни", "Даже те, которые ещё не придумали", "Франшиза 100% от ущерба"], no: "Франшиза 100% значит: всё оплачиваешь ты. Но с ощущением защищённости" },
    meta: { n: "Страховка от страховок", e: "🪆", col: "c-violet", price: 390, fr: 0, short: "Если страховая отказала",
      cover: ["Платит, если ты не донёс справки и страховая просит деньги назад", "Защищает от разочарования в страховании", "Сама себя не покрывает. Мы проверяли"], no: "Для покрытия этой страховки нужна страховка от страховки от страховок (скоро)" },
    mood: { n: "От плохого настроения", e: "🌧️", col: "c-coral", price: 290, fr: 0, short: "Грустишь — мы сочувствуем", noPay: true,
      cover: ["Рассмотрение заявления в течение 30 дней", "Искреннее «держись» от менеджера", "Выплата… а, нет, выплат нет"], no: "Настроение не является имуществом. Но мы рады, что вы с нами 💜" },
  };
  const ORDER = ["gadget", "home", "health", "kasko", "travel", "pet", "all", "meta", "mood"];
  const sid = (t) => "ins_" + t;

  /* ---------- Состояние ---------- */
  const st = () => Object.assign({ since: {}, claims: [], quiz: false, lost: 0, saved: 0 }, S().ins || {});
  const save = (p) => set({ ins: Object.assign(st(), p) });
  const owned = (t) => !!(V.subs && V.subs.has(sid(t)));
  const active = (t) => owned(t) && (st().since[t] == null || today() - st().since[t] >= 1);
  const pendingT = (t) => owned(t) && !active(t);
  const avail = (t) => (!POL[t].needCar || hasCar()) && (!POL[t].needPet || hasPet());
  const relevant = () => ["gadget", "home", "health", "travel"].concat(hasCar() ? ["kasko"] : [], hasPet() ? ["pet"] : []);
  const addClaim = (c) => { const s = st(); save({ claims: [Object.assign({ id: "c" + Date.now() + Math.floor(Math.random() * 99), day: today() }, c), ...s.claims].slice(0, 40) }); };
  const setClaim = (id, p) => save({ claims: st().claims.map((c) => (c.id === id ? Object.assign({}, c, p) : c)) });
  const docsDue = () => st().claims.filter((c) => c.status === "docs");

  // Просроченные справки: страховая просит половину сэкономленного назад
  function sweep() {
    const d = today();
    docsDue().forEach((c) => {
      if (d - c.day <= 3) return;
      const back = Math.round((c.saved || 0) / 2 / 100) * 100;
      if (active("meta")) {
        setClaim(c.id, { status: "meta" });
        setTimeout(() => FX.toast("Справки не донесены, но «Страховка от страховок» всё прикрыла 🪆", "🪆", 3600), 600);
      } else {
        setClaim(c.id, { status: "late", back });
        if (back > 0) G().tx(`Vibe Страхование · возврат по делу «${c.t}»`, -back, "📎", "c-coral");
        setTimeout(() => FX.toast(`Справки не донесены за 3 дня. Страховая вернула себе ${rub(back)} 📎`, "😬", 3800), 600);
        V.refreshCounters && V.refreshCounters();
      }
    });
  }

  function score() {
    const rel = relevant();
    let cov = rel.filter((t) => active(t)).length;
    if (active("all")) cov = rel.length;
    let sc = Math.round((cov / rel.length) * 100);
    if (active("meta")) sc += 3;
    sc -= docsDue().filter((c) => today() - c.day >= 2).length * 5;
    return clamp(sc);
  }
  const scoreLabel = (s) => s <= 20 ? { t: "Живёшь на авось", e: "🎲" } : s <= 50 ? { t: "Полузащищён", e: "🩹" } : s <= 80 ? { t: "Почти броня", e: "🛡️" } : { t: "Бронированный (кроме кошелька)", e: "🏰" };

  /* ---------- Покупка / отмена ---------- */
  function buy(t, from, quiet) {
    const p = POL[t];
    if (owned(t)) return true;
    if (!avail(t)) { FX.toast(p.needCar ? "КАСКО без машины — это страховка воздуха. Сначала Vibe Auto" : "Сначала заведи питомца в Vibe Pets", "🤔", 2600); return false; }
    if (!V.pay(p.price, { title: `Vibe Страхование · «${p.n}»`, emoji: p.e, col: "c-sky", from })) return false;
    V.subs.add({ id: sid(t), name: `Страховка · ${p.n}`, e: p.e, price: p.price });
    const s = st(); save({ since: Object.assign({}, s.since, { [t]: today() }) });
    if (!quiet) {
      from && FX.burst(from, { emojis: [p.e, "☂️", "✨"], count: 14 });
      FX.sound.success();
      FX.toast(t === "mood" ? "Полис оформлен. Настроение пока прежнее. Это нормально" : "Полис вступит в силу завтра. Беды, пожалуйста, не раньше ☂️", p.e, 3000);
    }
    V.emit && V.emit("insure", { kind: "buy", type: t });
    return true;
  }
  function cancel(t, done) {
    const p = POL[t];
    V.modal(`
      <div class="m-emo wobble">🥺</div>
      <div class="display" style="font-size:24px">Отменить «${esc(p.n)}»?</div>
      <p>87% отменивших потом пожалели. Остальные 13% не успели — с ними всё случилось раньше.</p>
      <div class="stack"><button class="btn black block" data-close>Остаться защищённым</button><button class="btn block" data-ok>Всё равно отменить</button></div>
      <div class="fine">Деньги за текущий месяц не возвращаются. Они уже защищают кого-то другого.</div>`, {
      sound: "pop",
      onMount(m, close) {
        $(m, "[data-ok]").addEventListener("click", () => {
          close(); V.subs.remove(sid(t));
          const s = st(); const since = Object.assign({}, s.since); delete since[t]; save({ since });
          FX.toast("Полис отменён. Будь осторожен. Очень осторожен", "😬", 2600);
          done && done();
        });
      },
    });
  }

  /* ---------- События, которые доказывают необходимость страховки ---------- */
  // spec: ins — тип полиса, cost — полная цена, fr — франшиза (если не как у полиса),
  // full — выбор «заплатить самому», alt — прочие выборы
  const SPEC = {
    ins_tooth: { ins: "health", cost: 18000, full: { t: "🦷 Стоматолог", health: 6 }, alt: [{ t: "Жевать другой стороной", health: -8, mood: -10 }] },
    ins_puddle: { ins: "gadget", cost: 14000, full: { t: "🔧 Ремонт в сервисе", mood: 2 }, alt: [{ t: "Положить в рис и верить", mood: -8 }] },
    ins_neighbors: { ins: "home", cost: 35000, full: { t: "💸 Оплатить соседям ремонт", mood: -6 }, alt: [{ t: "Притвориться, что тебя нет дома", mood: -14, health: -3 }] },
    ins_scooter: { ins: "home", cost: 12000, fr: 1500, full: { t: "🛴 Купить новый самокат", mood: 2 }, alt: [{ t: "Ходить пешком (+шаги)", mood: -6 }] },
    ins_suitcase: { ins: "travel", cost: 6000, full: { t: "🧳 Новый чемодан", mood: 1 }, alt: [{ t: "Перемотать скотчем", mood: -5 }] },
    ins_cat: { ins: "pet", cost: 9000, full: { t: "🩺 Ветеринар", mood: 2 }, alt: [{ t: "Ждать, пока выйдет само", mood: -10 }] },
    ins_cat2: { ins: "gadget", cost: 4000, full: { t: "🎧 Купить новые наушники", mood: 1 }, alt: [{ t: "Слушать музыку соседей", mood: -6 }] },
    ins_scratch: { ins: "kasko", cost: 25000, full: { t: "🎨 Покраска за свой счёт", mood: -2 }, alt: [{ t: "Сказать, что так и было", mood: -7 }] },
    ins_iron: { ins: "home", cost: 22000, full: { t: "🔥 Новые шторы и ремонт", mood: -2 }, alt: [{ t: "Повесить простыню вместо штор", mood: -9 }] },
    ins_tripflu: { ins: "travel", cost: 28000, fr: 1000, full: { t: "🏥 Местная клиника", health: 10 }, alt: [{ t: "Лечиться коктейлями", health: -12, mood: 4 }] },
    ins_glasses: { ins: "health", cost: 7000, fr: 1000, full: { t: "👓 Новые очки" }, alt: [{ t: "Щуриться до зарплаты", mood: -6, health: -2 }] },
    ins_sad: { ins: "mood", cost: 0, alt: [{ t: "🍦 Мороженое за 300 ₫", a: -300, mood: 8 }, { t: "Погрустить под дождём", mood: -3 }] },
    // встроенные события world.js
    phone: { ins: "gadget", cost: 2900, keep: true },
    flood: { ins: "home", cost: 3000, keep: true },
  };
  const NEW_EVENTS = [
    { id: "ins_tooth", e: "🦷", t: "Сломался зуб", d: "Орех в шоколадке оказался крепче эмали. Стоматолог уже точит прайс." },
    { id: "ins_puddle", e: "📱", t: "Уронил телефон в лужу", d: "Он сделал «буль» и показал тебе последний сторис в жизни." },
    { id: "ins_neighbors", e: "🌊", t: "Ты затопил соседей снизу", d: "Забыл кран. Соседка снизу уже пишет в чат дома капслоком." },
    { id: "ins_scooter", e: "🛴", t: "Украли самокат у подъезда", d: "Замок остался. Он грустный и очень одинокий." },
    { id: "ins_suitcase", e: "🧳", t: "Порвался чемодан в аэропорту", d: "По ленте приехали твои носки. По отдельности." },
    { id: "ins_cat", e: "🐈", t: "Кот съел наушники", d: "Один. Второй он «оставил на потом». Смотрит виновато, но не очень.", needPet: true, alt: "ins_cat2" },
    { id: "ins_cat2", e: "🐈", t: "Соседский кот съел твои наушники", d: "Зашёл через балкон, съел, ушёл. Как налоговая.", hidden: true },
    { id: "ins_scratch", e: "🚗", t: "Машину поцарапали во дворе", d: "Записка под дворником: «Извините». Без номера. Без совести.", needCar: true, alt: "ins_iron" },
    { id: "ins_iron", e: "🔥", t: "Утюг поджёг шторы", d: "Ты его выключил. Наверное. Шторы считают иначе." },
    { id: "ins_tripflu", e: "🤒", t: "Заболел в первый день отпуска", d: "Организм ждал отпуска, чтобы наконец расслабиться. Слишком." },
    { id: "ins_glasses", e: "👓", t: "Сел на очки", d: "Хруст был красивый. Мир теперь немного размыт." },
    { id: "ins_sad", e: "🌧️", t: "Просто плохое настроение", d: "Ничего не случилось. Именно это и грустно." },
  ];
  if (V.events && Array.isArray(V.events.LIST)) {
    // hidden-события не попадают в общий пул: показываются только как замена
    NEW_EVENTS.filter((e) => !e.hidden && !V.events.LIST.some((x) => x.id === e.id)).forEach((e) => V.events.LIST.push(Object.assign({ ch: [{ t: "Ок" }] }, e)));
  }

  // Какой полис закрывает случай: свой тип важнее «От всего»
  function coverOf(t) {
    if (active(t)) return t;
    if (t !== "mood" && active("all")) return "all";
    return null;
  }
  function withInsurance(ev) {
    if (!ev || !SPEC[ev.id]) return ev;
    let base = NEW_EVENTS.find((e) => e.id === ev.id) || ev;
    if ((base.needCar && !hasCar()) || (base.needPet && !hasPet())) base = NEW_EVENTS.find((e) => e.id === base.alt) || base;
    const sp = SPEC[base.id];
    const p = POL[sp.ins];
    const by = coverOf(sp.ins);
    const fr0 = sp.fr != null ? sp.fr : p.fr;
    const fr = by === "all" ? sp.cost : by ? fr0 : 0;
    const out = Object.assign({}, ev, base, { id: ev.id, _ins: { type: sp.ins, by, cost: sp.cost, fr, fr0, t: base.t } });
    let ch;
    if (sp.keep) {
      // встроенное событие: первый выбор — «заплатить самому»
      const orig = (ev.ch || []).map((c) => Object.assign({}, c));
      if (by) ch = [{ t: `☂️ По страховке «${POL[by].n}»: франшиза ${rub(fr)}`, a: -fr, mood: 3, _k: "claim" }, ...orig.slice(1)];
      else ch = orig.map((c, i) => Object.assign(c, { _k: i === 0 ? "full" : "alt" }));
    } else if (sp.ins === "mood") {
      ch = (by ? [{ t: "☂️ Заявить по «Страховке от плохого настроения»", _k: "mood" }] : []).concat(sp.alt.map((c) => Object.assign({ _k: "alt" }, c)));
    } else {
      const alt = sp.alt.map((c) => Object.assign({ _k: "alt" }, c));
      const ins = by === "all"
        ? { t: `🌈 По полису «От всего»: франшиза 100% (${rub(fr)})`, a: -fr, _k: "claim" }
        : by ? { t: `☂️ По полису «${p.n}»: франшиза ${rub(fr)}`, a: -fr, mood: 4, _k: "claim" } : null;
      const full = Object.assign({}, sp.full, { t: `${sp.full.t}: ${rub(sp.cost)}`, a: -sp.cost, _k: "full" });
      ch = ins ? [Object.assign({}, sp.full, ins), ...alt] : [full, ...alt];
      if (by === "all") ch.push(full); // для честности: можно и без полиса за те же деньги
    }
    out.ch = ch;
    return out;
  }

  function onChoice(ev, c, btn) {
    const I = ev._ins; if (!I || !c) return;
    const p = POL[I.type];
    const s = st();
    if (c._k === "claim") {
      const saved = Math.max(0, I.cost - I.fr);
      addClaim({ type: I.by, t: I.t, e: ev.e, cost: I.cost, paid: I.fr, saved, status: I.by === "all" ? "closed" : "docs" });
      save({ saved: (st().saved || 0) + saved });
      FX.sound.success();
      if (I.by === "all") {
        FX.confetti({ count: 40 });
        FX.toast(`Страховка сработала! Ты сэкономил ${rub(0)}. Франшиза 100% — тоже забота 🌈`, "🌈", 4000);
      } else {
        FX.confetti({ count: 180, from: btn });
        FX.toast(`Страховка сработала! Ты сэкономил ${rub(saved)}`, "☂️", 3400);
        setTimeout(() => FX.toast("Донеси справки в Vibe Страхование за 3 дня 📎", "📎", 3200), 3600);
      }
      V.emit && V.emit("insure", { kind: "claim", type: I.by, saved });
    } else if (c._k === "mood") {
      addClaim({ type: "mood", t: I.t, e: ev.e, cost: 0, paid: 0, saved: 0, status: "denied", why: "Настроение не является имуществом" });
      FX.sound.error();
      FX.toast("Заявление принято к рассмотрению. Срок — 30 дней. Отказ уже готов 💜", "🌧️", 3800);
    } else if (I.type !== "mood") {
      const lost = c._k === "full" ? I.cost : 0;
      if (lost) { addClaim({ type: I.type, t: I.t, e: ev.e, cost: I.cost, paid: I.cost, saved: 0, status: "self" }); save({ lost: (s.lost || 0) + lost }); }
      const could = I.fr0;
      setTimeout(() => FX.toast(lost ? `−${rub(lost)}. С полисом «${p.n}» было бы ${rub(could)}. Застрахуйся, пока не поздно ☂️` : `Застрахуйся, пока не поздно. Полис «${p.n}» — ${rub(p.price)}/мес ☂️`, p.e, 4200), 700);
    }
  }

  if (V.events && V.events.show) {
    const orig = V.events.show;
    V.events.show = function (ev) {
      try { sweep(); } catch (e) {}
      const ev2 = withInsurance(ev);
      const r = orig.call(this, ev2);
      if (ev2 && ev2._ins) {
        const ms = document.querySelectorAll(".modal");
        const m = ms[ms.length - 1];
        if (m) {
          const I = ev2._ins, p = POL[I.type];
          if (I.type !== "mood") {
            const note = document.createElement("div");
            note.className = "ins-note " + (I.by ? "ok" : "no");
            note.innerHTML = I.by === "all" ? "🌈 Ты застрахован «От всего». Франшиза — 100%. Наслаждайся защищённостью"
              : I.by ? `☂️ Полис «${esc(POL[I.by].n)}» активен. Мы рядом!`
              : pendingT(I.type) ? `⏳ Полис «${esc(p.n)}» вступит в силу завтра. Беда пришла сегодня. Классика`
              : `☂️ С полисом «${esc(p.n)}» это стоило бы ${rub(I.fr0)}, а не ${rub(I.cost)}`;
            const fine = $(m, ".fine");
            fine ? m.insertBefore(note, fine) : m.appendChild(note);
          }
          m.addEventListener("click", (e) => {
            const b = e.target.closest("[data-ch]"); if (!b) return;
            onChoice(ev2, ev2.ch[+b.dataset.ch], b);
          });
        }
      }
      return r;
    };
  }
  V.on && V.on("pay", () => { try { sweep(); } catch (e) {} });

  /* ---------- Бумаги: 3 шага ---------- */
  const DENY = [
    "Вы улыбнулись при подаче заявления. Значит, не так уж плохо",
    "Случай не найден. Сначала с тобой должно что-то случиться. Мы подождём 💜",
    "Подпись на заявлении слишком уверенная",
    "Справка о справке выдана в нерабочее время отдела справок",
    "Ущерб недостаточно ущербный",
  ];
  function paperwork(claim, type, from) {
    const p = POL[type];
    let step = 0, signs = 0, stamps = 0, photo = null;
    const no = "№" + String(Math.abs((claim ? claim.id : "x" + today()).split("").reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)) % 900000 + 100000);
    V.ui.sheet(`<div data-pw></div>`, {
      onMount(sh, close) {
        const box = $(sh, "[data-pw]");
        const head = (t) => `<div class="ins-steps">${[0, 1, 2].map((i) => `<i class="${i < step ? "done" : i === step ? "on" : ""}"></i>`).join("")}</div><div class="display" style="font-size:24px;margin:6px 0 4px">${t}</div><div class="muted" style="font-size:12px;font-weight:700">Дело ${no} · ${esc(p.n)}</div>`;
        function draw() {
          if (step === 0) {
            box.innerHTML = `${head("📝 Шаг 1. Заявление")}
              <div class="ins-doc">
                <p>Я, нижеподписавшийся(-аяся), сообщаю, что <b>${esc(claim ? claim.t.toLowerCase() : "со мной что-то случилось")}</b> ${claim ? `(ущерб ${rub(claim.cost)})` : ""} и это не я. Ну или не совсем я.</p>
                <div class="ins-sign">${signs ? ["", "〰️", "〰️✍️", "✍️〰️✍️"][signs] : "<span class='muted'>место для подписи</span>"}</div>
              </div>
              <button class="btn black block" data-sign>✍️ Подписать</button>
              <div class="fine">Подпись должна совпадать с паспортной, но не слишком.</div>`;
            $(box, "[data-sign]").addEventListener("click", (e) => {
              signs++; FX.bump && FX.bump(e.currentTarget);
              if (signs === 1) { FX.sound.error(); FX.toast("Подпись не похожа. Ещё раз", "🧐"); }
              else if (signs === 2) { FX.sound.error(); FX.toast("Теперь слишком похожа. Подозрительно", "🕵️"); }
              else { FX.sound.pop(); step = 1; }
              draw();
            });
          } else if (step === 1) {
            box.innerHTML = `${head("📎 Шаг 2. Справка о справке")}
              <div class="ins-doc">
                <p><b>СПРАВКА №1</b><br>о том, что у предъявителя имеется <b>СПРАВКА №2</b>, подтверждающая наличие настоящей справки.</p>
                <div class="ins-stamps">${Array.from({ length: 5 }, (_, i) => `<span class="${i < stamps ? "on" : ""}">${i < stamps ? "🔖" : "◌"}</span>`).join("")}</div>
                <div class="progress" style="margin-top:8px"><i style="--p:${stamps * 20}%;background:var(--violet)"></i></div>
              </div>
              <button class="btn black block" data-stamp>🔖 Поставить печать (${stamps}/5)</button>
              <div class="fine">Справку о справке выдаёт отдел справок о справках. Он работает с 13:00 до 13:15, кроме обеда.</div>`;
            $(box, "[data-stamp]").addEventListener("click", (e) => {
              stamps++; FX.burst(e.currentTarget, { emojis: ["🔖", "📄"], count: 6 }); FX.sound.tap && FX.sound.tap();
              if (stamps >= 5) { FX.sound.pop(); FX.toast(pick(["Печать №5: «Печати проверены»", "Справка заверена справкой", "Отдел справок ушёл на обед. Успел!"]), "🔖"); step = 2; }
              draw();
            });
          } else {
            const tiles = [["dmg", "📸", "Фото ущерба"], ["selfie", "🤳", "Селфи на фоне ущерба"], ["stock", "🖼️", "Похожий ущерб из интернета"]];
            box.innerHTML = `${head("📸 Шаг 3. Фото ущерба")}
              <div class="ins-tiles">${tiles.map(([k, e, t]) => `<button class="card tight tap ins-tile ${photo === k ? "on" : ""}" data-ph="${k}"><span class="emo">${e}</span><b>${t}</b></button>`).join("")}</div>
              <button class="btn black block" data-send ${photo ? "" : "disabled"}>📨 Отправить в страховую</button>
              <div class="fine">Нажимая «Отправить», ты соглашаешься, что фото могут быть использованы в рекламе Vibe Страхование: «Он не застраховался вовремя».</div>`;
            $$(box, "[data-ph]").forEach((b) => b.addEventListener("click", () => {
              if (b.dataset.ph === "stock") { FX.shake(b); FX.toast("Мы это видели. Это сток. Его уже страховали 14 раз", "🙅"); return; }
              photo = b.dataset.ph; FX.sound.pop(); draw();
            }));
            const sb = $(box, "[data-send]");
            sb && sb.addEventListener("click", () => {
              close();
              if (claim && claim.status === "docs") {
                setClaim(claim.id, { status: "closed", photo });
                FX.confetti({ count: 160 }); FX.sound.success();
                FX.toast(`Документы приняты! Дело ${no} закрыто 🗂️${photo === "selfie" ? " Селфи — огонь" : ""}`, "✅", 3400);
                V.reward({ vibiki: 25, xp: 20, from });
                V.emit && V.emit("insure", { kind: "docs", type });
              } else {
                addClaim({ type, t: "Заявление без случая", e: "🧾", cost: 0, paid: 0, saved: 0, status: "denied", why: type === "mood" ? DENY[0] : DENY[1 + Math.floor(Math.random() * 4)] });
                V.modal(`<div class="m-emo wobble">🙅</div><div class="display" style="font-size:24px">В выплате отказано</div>
                  <p>${esc(st().claims[0].why)}.</p><button class="btn black block" data-close>Понятно, спасибо 💜</button>
                  <div class="fine">Ваше заявление очень важно для нас. Поэтому мы его сохранили. Навсегда.</div>`, { sound: "pop" });
                FX.sound.error();
              }
              rerender && rerender();
            });
          }
          restagger(box);
        }
        draw();
      },
    });
  }
  let rerender = null;

  /* ---------- Тест на риски ---------- */
  const QUIZ = [
    ["Как часто ты роняешь телефон?", [["В чехле-броне. Не роняю", 1], ["Раз в неделю, по расписанию", 3], ["Он сам прыгает", 4]]],
    ["Твои отношения с краном в ванной?", [["Доверительные", 1], ["Он капает, я терплю", 3], ["У меня тазик. Много тазиков", 4]]],
    ["Ты ешь орехи?", [["Нет", 1], ["Только в шоколаде", 3], ["Грецкие колю зубами", 5]]],
    ["Что ты делаешь в аэропорту?", [["Не летаю", 1], ["Сдаю чемодан и молюсь", 3], ["Обматываю плёнкой в 3 слоя и всё равно молюсь", 4]]],
    ["Опиши свой вайб одним словом", [["Стабильный", 2], ["Хаос", 4], ["Понедельник", 5]]],
  ];
  function quiz(from) {
    let i = 0, sum = 0;
    V.ui.sheet(`<div data-qz></div>`, {
      onMount(sh, close) {
        const box = $(sh, "[data-qz]");
        function draw() {
          if (i < QUIZ.length) {
            const [q, as] = QUIZ[i];
            box.innerHTML = `<div class="ins-steps">${QUIZ.map((_, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("")}</div>
              <div class="display" style="font-size:24px;margin:8px 0 14px">${q}</div>
              <div class="stack stagger">${as.map(([t, v], k) => `<button class="btn block ins-ans" data-a="${k}">${t}</button>`).join("")}</div>
              <div class="fine">Вопрос ${i + 1} из ${QUIZ.length}. Правильных ответов нет. Неправильные — все.</div>`;
            restagger($(box, ".stagger"));
            $$(box, "[data-a]").forEach((b) => b.addEventListener("click", () => { sum += as[+b.dataset.a][1]; i++; FX.sound.pop(); draw(); }));
            return;
          }
          const risk = Math.min(99, Math.round(64 + sum * 1.5));
          const rec = relevant().filter((t) => !owned(t) && avail(t));
          const total = rec.reduce((s, t) => s + POL[t].price, 0);
          box.innerHTML = `<div class="m-emo wobble" style="text-align:center;font-size:64px">⚠️</div>
            <div class="display" style="font-size:26px;text-align:center">Твой риск: ${risk}%</div>
            <p style="text-align:center;font-weight:700">${risk > 90 ? "Ты ходячий страховой случай. Мы тебя любим" : risk > 80 ? "Очень высокий. Как у всех, кто прошёл тест" : "Высокий. Даже у тех, кто не выходит из дома, — 73%"}</p>
            ${rec.length ? `<div class="card tight" style="margin:12px 0"><b>Рекомендуем:</b><div class="ins-recs">${rec.map((t) => `<span class="badge ${POL[t].col}">${POL[t].e} ${POL[t].n}</span>`).join("")}</div></div>
            <button class="btn black block" data-all>☂️ Оформить всё за ${rub(total)}/мес</button>` : `<div class="card c-mint tight" style="margin:12px 0"><b>Ты уже застрахован от всего важного.</b> Осталось застраховаться от плохого настроения 🌧️</div>`}
            <button class="btn block" data-close style="margin-top:10px">Я рискну</button>
            <div class="fine">Тест разработан отделом продаж при участии отдела продаж. Результат не зависит от ответов.</div>`;
          if (!st().quiz) { save({ quiz: true }); V.reward({ vibiki: 30, xp: 20, from }); }
          const all = $(box, "[data-all]");
          all && all.addEventListener("click", (e) => {
            if (S().balance < total) { FX.sound.error(); FX.toast("Не хватает на все полисы сразу. Риск растёт 📈", "😬"); return; }
            rec.forEach((t) => buy(t, null, true));
            close(); FX.confetti({ count: 140 }); FX.sound.success();
            FX.toast("Пакет «Спокойный сон» оформлен! Вступит в силу завтра ☂️", "🛡️", 3200);
            rerender && rerender();
          });
        }
        draw();
      },
      onClose() { rerender && rerender(); },
    });
  }

  /* ---------- Детали полиса ---------- */
  const STATUS = { docs: ["📎 Ждём справки", "c-yellow"], closed: ["✅ Выплачено", "c-mint"], late: ["😬 Справки не донесены", "c-coral"], meta: ["🪆 Прикрыто страховкой", "c-violet"], denied: ["🙅 Отказ", "c-coral"], self: ["💸 Без полиса", "c-white"] };
  function details(t, from) {
    const p = POL[t];
    const hist = st().claims.filter((c) => c.type === t);
    const frTxt = p.fr < 0 ? "100% 🙃" : p.noPay ? "—" : p.fr ? rub(p.fr) : "0 ₫ 🎉";
    V.ui.sheet(`
      <div class="ins-dh ${p.col}"><span class="emo float">${p.e}</span><div><div class="display" style="font-size:24px">${esc(p.n)}</div><b>${rub(p.price)}/мес · франшиза ${frTxt}</b></div></div>
      <h2 class="sec" style="margin-top:16px">Покрывает</h2>
      <div class="stack">${p.cover.map((c) => `<div class="ins-cov">✅ ${c}</div>`).join("")}</div>
      <div class="fine" style="font-size:11px">${p.no}</div>
      <h2 class="sec">История случаев <small>${hist.length}</small></h2>
      ${hist.length ? `<div class="card tight">${hist.map((c) => `<div class="li"><div class="ic ${STATUS[c.status][1]}">${c.e || "🧾"}</div><div class="tx"><b>${esc(c.t)}</b><small>День ${c.day + 1} · ${STATUS[c.status][0]}${c.why ? " · " + esc(c.why) : ""}</small></div><div class="amt ${c.saved ? "plus" : ""}">${c.saved ? "+" + rub(c.saved) : c.paid ? "−" + rub(c.paid) : "0 ₫"}</div></div>`).join("")}</div>`
        : `<div class="card tight flat muted" style="font-weight:700">Пока ничего не случилось. Пока.</div>`}
      <div class="stack" style="margin-top:16px">
        ${owned(t) ? `<button class="btn black block" data-claim>📝 Заявить о случае</button><button class="btn block" data-cancel>Отменить полис</button>`
          : `<button class="btn black block" data-buy ${avail(t) ? "" : "disabled"}>☂️ Оформить за ${rub(p.price)}/мес</button>`}
      </div>
      <div class="fine">Полис вступает в силу на следующий день после оформления. Период ожидания нужен, чтобы беды успели нас найти.</div>`, {
      onMount(sh, close) {
        const b = $(sh, "[data-buy]"); b && b.addEventListener("click", (e) => { if (buy(t, e.currentTarget)) { close(); rerender && rerender(); } });
        const c = $(sh, "[data-cancel]"); c && c.addEventListener("click", () => { close(); cancel(t, () => rerender && rerender()); });
        const cl = $(sh, "[data-claim]"); cl && cl.addEventListener("click", (e) => {
          close();
          const open = docsDue().find((x) => x.type === t);
          if (!active(t)) { FX.toast("Полис ещё не вступил в силу. Пострадай, пожалуйста, завтра", "⏳", 2800); return; }
          setTimeout(() => paperwork(open || null, t, e.currentTarget), 320);
        });
      },
    });
  }

  /* ---------- Экран ---------- */
  V.screen("insure", {
    render() {
      return `${V.ui.head("Vibe Страхование", "Мы рядом, когда всё плохо", V.ui.vibikiPill())}<div data-body></div>`;
    },
    mount(root) {
      const body = $(root, "[data-body]");
      const tos = [];
      try { sweep(); } catch (e) {}
      function view() {
        const s = st(), sc = score(), L = scoreLabel(sc);
        const docs = docsDue();
        const rel = relevant();
        const naked = rel.filter((t) => !coverOf(t));
        const monthly = ORDER.filter(owned).reduce((a, t) => a + POL[t].price, 0);
        body.innerHTML = `
        <div class="stagger">
          <div class="card ins-score ${sc >= 81 ? "c-mint" : sc >= 51 ? "c-sky" : sc >= 21 ? "c-yellow" : "c-coral"}">
            <div class="sticker" style="top:12px;right:12px">${L.e} ${L.t}</div>
            <div class="ins-ring" style="--p:${sc}"><div><span class="big-num">${sc}</span><small>%</small></div></div>
            <div class="display" style="font-size:22px;margin-top:10px">Твоя защищённость</div>
            <div class="ins-chips">${naked.length ? naked.map((t) => `<span class="badge" style="background:#fff">${POL[t].e} ${POL[t].n} — без защиты</span>`).join("") : `<span class="badge" style="background:#fff">${active("all") ? "🌈 Формально — от всего" : "🛡️ Всё важное под защитой"}</span>`}${active("mood") ? `<span class="badge" style="background:#fff">🌧️ +∞ к спокойствию</span>` : ""}</div>
            <div class="ins-stats"><div><b>${rub(s.saved || 0)}</b><small>сэкономлено</small></div><div><b>${rub(s.lost || 0)}</b><small>потеряно без полиса</small></div><div><b>${rub(monthly)}</b><small>в месяц</small></div></div>
          </div>
          ${docs.map((c) => { const left = Math.max(0, 3 - (today() - c.day)); return `<div class="card c-coral tight ins-row tap" data-docs="${c.id}"><span class="emo wobble" style="font-size:32px">📎</span><div style="flex:1"><b>Донеси справки: «${esc(c.t)}»</b><small>Осталось ${left} ${G().plural ? G().plural(left, "день", "дня", "дней") : "дн."} · иначе вернём себе ${rub(Math.round((c.saved || 0) / 2 / 100) * 100)}</small></div><span class="badge">3 шага →</span></div>`; }).join("")}
          ${zab(docs.length ? "Справки — это просто. Три шага, одна печать… пять печатей. Вперёд! 📎" : s.lost > s.saved ? `Без страховки ты уже потерял ${rub(s.lost)}. Я не осуждаю. Я просто считаю 💜` : sc < 50 ? "Жизнь случается. Обычно в самый неудобный момент и на всю сумму ☂️" : "Ты защищён! Теперь можно жить рискованнее. Мы не против 😉", docs.length ? "smile" : "sly")}
          <div class="card c-black tight ins-row tap" data-quiz><span class="emo float" style="font-size:34px">🎲</span><div style="flex:1"><b style="color:var(--lime)">Тест: насколько ты в зоне риска?</b><small style="color:#ccc">5 вопросов · результат предсказуем${s.quiz ? "" : " · +30 🪙"}</small></div><span class="badge">→</span></div>
          <h2 class="sec">Полисы <small>${ORDER.filter(owned).length} из ${ORDER.length}</small></h2>
          ${ORDER.map((t) => { const p = POL[t], on = owned(t), pend = pendingT(t), ok = avail(t); return `
            <div class="card tight ins-pol tap ${on ? p.col : ""} ${ok ? "" : "ins-off"}" data-pol="${t}">
              <span class="ins-pe">${p.e}</span>
              <div style="flex:1;min-width:0"><b>${p.n}</b><small>${ok ? p.short : p.needCar ? "Нужна машина (Vibe Auto)" : "Нужен питомец (Vibe Pets)"}</small>
                <div class="ins-meta"><span>${rub(p.price)}/мес</span><span>франшиза ${p.fr < 0 ? "100%" : p.noPay ? "—" : rub(p.fr)}</span></div></div>
              ${on ? `<span class="badge" style="background:#fff">${pend ? "⏳ завтра" : "✅ активен"}</span>` : `<button class="btn sm black" data-buy="${t}" ${ok ? "" : "disabled"}>Оформить</button>`}
            </div>`; }).join("")}
          ${V.ui.marquee(["Жизнь случается", "Мы рядом", "Франшиза — это забота", "Справка о справке за 5 печатей", "Застрахуйся, пока не поздно"])}
          <div class="fine">Vibe Страхование не несёт ответственности за случаи, произошедшие до вступления полиса в силу, во время его действия и после. Франшиза — сумма, которую ты платишь сам, чтобы чувствовать себя застрахованным. ОСАГО — в Vibe Auto.</div>
        </div>`;
        restagger($(body, ".stagger"));
      }
      rerender = view;
      view();
      body.addEventListener("click", (e) => {
        const b = e.target.closest("[data-buy]");
        if (b && b.closest(".ins-pol")) { e.stopPropagation(); if (buy(b.dataset.buy, b)) tos.push(setTimeout(view, 300)); return; }
        const d = e.target.closest("[data-docs]");
        if (d) { const c = st().claims.find((x) => x.id === d.dataset.docs); if (c) paperwork(c, c.type, d); return; }
        if (e.target.closest("[data-quiz]")) { quiz(e.target.closest("[data-quiz]")); return; }
        const p = e.target.closest("[data-pol]");
        if (p) details(p.dataset.pol, p);
      });
      return () => { tos.forEach(clearTimeout); if (rerender === view) rerender = null; };
    },
  });

  /* ---------- Стили ---------- */
  if (!document.getElementById("ins-style")) {
    const css = document.createElement("style");
    css.id = "ins-style";
    css.textContent = `
      .ins-zab { display:flex; align-items:flex-end; gap:8px; }
      .ins-zab > svg, .ins-zab > *:first-child { flex:0 0 auto; }
      .ins-bub { flex:1; background:var(--paper); border:var(--line); border-radius:18px 18px 18px 4px; padding:10px 12px; font-size:13px; font-weight:700; box-shadow:var(--shadow-sm); }
      .ins-score { text-align:center; padding-top:22px; }
      .ins-ring { --p:0; width:132px; height:132px; margin:4px auto 0; border-radius:50%; border:var(--line); box-shadow:var(--shadow-sm);
        background:conic-gradient(var(--ink) calc(var(--p) * 1%), #fff 0); display:grid; place-items:center; }
      .ins-ring > div { width:96px; height:96px; border-radius:50%; background:var(--paper); border:var(--line); display:grid; place-items:center; grid-auto-flow:column; align-content:center; }
      .ins-ring .big-num { font-size:44px; } .ins-ring small { font-weight:900; font-size:16px; align-self:end; margin-bottom:10px; }
      .ins-chips, .ins-recs { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:10px; }
      .ins-recs { justify-content:flex-start; margin-top:8px; }
      .ins-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:14px; }
      .ins-stats div { background:var(--paper); border:2px solid var(--ink); border-radius:14px; padding:8px 4px; min-width:0; }
      .ins-stats b { display:block; font-size:13px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ins-stats small { font-size:10px; font-weight:700; color:var(--muted); }
      .ins-row { display:flex; align-items:center; gap:12px; }
      .ins-row b { display:block; font-size:14px; } .ins-row small { font-size:12px; font-weight:700; opacity:.8; }
      .ins-pol { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
      .ins-pol b { display:block; font-size:15px; font-weight:900; } .ins-pol small { display:block; font-size:12px; font-weight:700; opacity:.75; }
      .ins-pe { width:48px; height:48px; flex:0 0 auto; border-radius:15px; border:2px solid var(--ink); background:#fff; display:grid; place-items:center; font-size:26px; }
      .ins-meta { display:flex; flex-wrap:wrap; gap:4px 10px; margin-top:4px; font-size:11px; font-weight:900; }
      .ins-pol .btn.sm, .ins-pol .btn { height:38px; padding:0 14px; font-size:13px; flex:0 0 auto; }
      .ins-off { opacity:.6; }
      .ins-note { margin:10px 0 2px; padding:10px 12px; border:2px solid var(--ink); border-radius:14px; font-size:12px; font-weight:800; text-align:left; }
      .ins-note.ok { background:var(--mint); } .ins-note.no { background:var(--yellow); }
      .ins-steps { display:flex; gap:6px; } .ins-steps i { flex:1; height:8px; border-radius:99px; border:2px solid var(--ink); background:#fff; }
      .ins-steps i.done { background:var(--lime); } .ins-steps i.on { background:var(--violet); }
      .ins-doc { margin:14px 0; padding:14px; border:var(--line); border-radius:14px; background:#fffdf3; box-shadow:var(--shadow-sm); font-size:13px; font-weight:600; line-height:1.4; transform:rotate(-.6deg); }
      .ins-sign { margin-top:12px; height:44px; border-bottom:2px dashed var(--ink); display:flex; align-items:flex-end; font-size:26px; }
      .ins-sign .muted { font-size:11px; font-weight:700; }
      .ins-stamps { display:flex; gap:8px; justify-content:center; font-size:26px; margin-top:10px; }
      .ins-stamps span.on { animation:ins-stamp .35s var(--spring); }
      @keyframes ins-stamp { from { transform:scale(2.2) rotate(-30deg); opacity:0; } to { transform:none; opacity:1; } }
      .ins-tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:14px 0; }
      .ins-tile { display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; min-width:0; padding:10px 6px; }
      .ins-tile .emo { font-size:30px; } .ins-tile b { font-size:11px; font-weight:800; line-height:1.2; }
      .ins-tile.on { background:var(--lime); transform:scale(1.04); }
      .ins-ans { height:auto; min-height:52px; white-space:normal; padding:10px 18px; }
      .ins-dh { display:flex; align-items:center; gap:14px; padding:14px; border:var(--line); border-radius:var(--r); box-shadow:var(--shadow-sm); }
      .ins-dh .emo { font-size:44px; } .ins-dh b { font-size:13px; }
      .ins-cov { padding:10px 12px; border:2px solid var(--ink); border-radius:14px; background:var(--paper); font-size:13px; font-weight:700; }
    `;
    document.head.appendChild(css);
  }
})();
