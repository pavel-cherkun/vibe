/* ============================================================
   Навыки (RPG-ветка): Vibe.skills
   8 навыков, уровни 1–10 (кривая как в Stardew), опыт — из шины
   событий. Перки на 5 и 10 уровнях: 1 из 2.

   API:
     Vibe.skills.xp(skill, n, {from, quiet})  — начислить опыт
     Vibe.skills.level(skill) / info(skill) / all() / total()
     Vibe.skills.has(perkId)                   — выбран ли перк
     Vibe.skills.mult(key) → множитель (по умолчанию 1)
     Vibe.skills.add(key)  → прибавка (по умолчанию 0)
     Vibe.skills.available() → [{skill, tier, perks}] — можно выбрать
     Vibe.skills.choose(skill, tier, perkId)
     Vibe.skills.SKILLS, Vibe.skills.PERKS, Vibe.skills.CURVE
   Состояние: S.skills {career: xp, …}, S.perks {"career5": perkId, …},
              S.skillDay {day, got:{skill: xp}} — дневной лимит.
   События: emit("skill", {skill, level, name, e}), emit("perk", {skill, tier, id}).
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);

  const SKILLS = [
    { id: "career", n: "Карьера", e: "💼", col: "c-sky", cls: "Офисный паладин", hint: "Задачи в Vibe Job, курсы в Vibe Learn, повышения", go: [["job", "💼 Vibe Job"], ["learn", "🎓 Learn"]] },
    { id: "charisma", n: "Харизма", e: "💬", col: "c-pink", cls: "Бард-нетворкер", hint: "Встречи, свидания, подарки и разговоры с близкими", go: [["people", "🫂 Люди"], ["match", "💘 Match"]] },
    { id: "finance", n: "Финансы", e: "💰", col: "c-lime", cls: "Гоблин-казначей", hint: "Копилка, инвестиции, курс финграмотности", go: [["invest", "📈 Invest"], ["pay", "🐷 Копилка"]] },
    { id: "health", n: "Здоровье", e: "❤️‍🔥", col: "c-coral", cls: "Монах-зожник", hint: "Тренировки, прогулки, пешком вместо такси", go: [["fit", "⌚ Fit"], ["maps", "🚶 Пешком"]] },
    { id: "cooking", n: "Кулинария", e: "🍳", col: "c-yellow", cls: "Алхимик-кулинар", hint: "Готовить дома, полезная еда, закупка продуктов", go: [["fit", "🍳 Готовить"], ["hobby", "🥗 Кружок"]] },
    { id: "driving", n: "Вождение", e: "🚗", col: "c-orange", cls: "Рыцарь пробок", hint: "Права в Vibe Drive, своя машина, поездки за рулём", go: [["drive", "🚗 Drive"], ["auto", "🔧 Авто"]] },
    { id: "creative", n: "Творчество", e: "🎨", col: "c-lilac", cls: "Маг вдохновения", hint: "Хобби: гитара, рисование, концерты", go: [["hobby", "🎸 Хобби"], ["tickets", "🎤 Концерты"]] },
    { id: "social", n: "Соцсети", e: "📸", col: "c-mint", cls: "Некромант лайков", hint: "Посты в Vibegram, курс блогера", go: [["gram", "📸 Vibegram"], ["learn", "📱 Курс"]] },
  ];
  const byId = (id) => SKILLS.find((s) => s.id === id);

  // Накопленный опыт для уровней 1..10 (Stardew: 100, 380, 770…, тут в 2 раза быстрее)
  const CURVE = [0, 50, 190, 385, 650, 1075, 1650, 2400, 3450, 5000]; // CURVE[L-1] — опыт для уровня L
  const MAX = 10;
  const DAY_CAP = 450; // опыта на навык в игровой день — чтобы не фармили

  // fx: множители (mult) и прибавки (add)
  const PERKS = {
    career: {
      5: [
        { id: "workaholic", n: "Трудоголик", e: "🦾", d: "Задачи тратят на 30% меньше энергии", mult: { taskEnergy: 0.7 } },
        { id: "careerist", n: "Карьерист", e: "📈", d: "+10% к прибавке при повышении", add: { promoRaise: 0.1 } },
      ],
      10: [
        { id: "irreplaceable", n: "Незаменимый", e: "🗿", d: "+15% к окладу на любой работе", mult: { salary: 1.15 } },
        { id: "headhunter", n: "Хедхантер", e: "🎯", d: "Офферы на 20% выше", mult: { offer: 1.2 } },
      ],
    },
    charisma: {
      5: [
        { id: "smalltalk", n: "Душа компании", e: "🗣️", d: "Разговоры дают +25% к отношениям", mult: { talk: 1.25 } },
        { id: "giftguru", n: "Чуйка на подарки", e: "🎁", d: "Подарки дают +25% к отношениям", mult: { gift: 1.25 } },
      ],
      10: [
        { id: "heartthrob", n: "Сердцеед", e: "💘", d: "Свидания дают +50% к отношениям", mult: { date: 1.5 } },
        { id: "opinionleader", n: "Лидер мнений", e: "📣", d: "Репутация растёт на 25% быстрее", mult: { rep: 1.25 } },
      ],
    },
    finance: {
      5: [
        { id: "cashbackguru", n: "Кэшбек-гуру", e: "🪙", d: "+1 категория кэшбека каждый месяц", add: { cashbackSlots: 1 } },
        { id: "piggy", n: "Копилка", e: "🐷", d: "+1% годовых к копилке", add: { jarRate: 0.01 } },
      ],
      10: [
        { id: "investor", n: "Инвестор", e: "📊", d: "Доходность инвестиций +10%", mult: { invest: 1.1 } },
        { id: "taxninja", n: "Налоговый ниндзя", e: "🥷", d: "НДФЛ 10% вместо 13% (законно. наверное)", add: { taxCut: 0.03 } },
      ],
    },
    health: {
      5: [
        { id: "stamina", n: "Выносливый", e: "🔋", d: "Энергия тратится на 15% медленнее", mult: { energyDrain: 0.85 } },
        { id: "athlete", n: "Спортсмен", e: "🏅", d: "Тренировки дают на 30% больше", mult: { workout: 1.3 } },
      ],
      10: [
        { id: "ironman", n: "Железный", e: "🛡️", d: "Болеешь вдвое реже", mult: { sick: 0.5 } },
        { id: "sleeper", n: "Соня-профи", e: "😴", d: "Сон восстанавливает на 20% больше", mult: { sleep: 1.2 } },
      ],
    },
    cooking: {
      5: [
        { id: "homecook", n: "Домашний повар", e: "🍲", d: "Домашняя еда даёт на 30% больше", mult: { homeFood: 1.3 } },
        { id: "thrifty", n: "Хозяйственный", e: "🧺", d: "Продукты дешевле на 15%", mult: { groceries: 0.85 } },
      ],
      10: [
        { id: "chef", n: "Шеф", e: "👨‍🍳", d: "Домашняя еда даёт +50% и настроение", mult: { homeFood: 1.5, cookMood: 1.5 } },
        { id: "mealprep", n: "Мил-преп", e: "🥡", d: "Холодильника хватает на 50% дольше", mult: { fridge: 1.5 } },
      ],
    },
    driving: {
      5: [
        { id: "eco", n: "Эко-драйв", e: "⛽", d: "−20% на бензин", mult: { fuel: 0.8 } },
        { id: "careful", n: "Аккуратный", e: "🦺", d: "Штрафы прилетают вдвое реже", mult: { fines: 0.5 } },
      ],
      10: [
        { id: "racer", n: "Гонщик", e: "🏎️", d: "За рулём на 20% быстрее", mult: { driveTime: 0.8 } },
        { id: "cabbie", n: "Бомбила", e: "🚕", d: "Подработка водителем +25%", mult: { driveGig: 1.25 } },
      ],
    },
    creative: {
      5: [
        { id: "muse", n: "Муза", e: "🎶", d: "Хобби дают на 25% больше настроения", mult: { hobbyMood: 1.25 } },
        { id: "talent", n: "Талант", e: "✨", d: "Творчество качается на 30% быстрее", mult: { creativeXp: 1.3 } },
      ],
      10: [
        { id: "artist", n: "Художник", e: "🖼️", d: "Хобби дают на 50% больше настроения", mult: { hobbyMood: 1.5 } },
        { id: "stage", n: "Звезда сцены", e: "🎤", d: "Хобби и концерты +50% к славе", mult: { fame: 1.5 } },
      ],
    },
    social: {
      5: [
        { id: "viral", n: "Вирусный", e: "🦠", d: "Посты набирают на 25% больше подписчиков", mult: { followers: 1.25 } },
        { id: "hashtag", n: "Хэштег-маг", e: "#️⃣", d: "Посты получают на 30% больше лайков", mult: { likes: 1.3 } },
      ],
      10: [
        { id: "influencer", n: "Инфлюенсер", e: "🌟", d: "Посты набирают на 50% больше подписчиков", mult: { followers: 1.5 } },
        { id: "collabs", n: "Коллабы", e: "🤝", d: "Рекламные интеграции платят на 20% больше", mult: { adIncome: 1.2 } },
      ],
    },
  };
  const allPerks = () => Object.entries(PERKS).flatMap(([sk, t]) => Object.entries(t).flatMap(([tier, list]) => list.map((p) => Object.assign({ skill: sk, tier: +tier }, p))));
  const perkById = (id) => allPerks().find((p) => p.id === id);

  /* ---------- Чтение ---------- */
  const xpMap = () => S().skills || {};
  const perkMap = () => S().perks || {};
  const xpOf = (id) => xpMap()[id] || 0;
  // Уровень 1 — стартовый; уровень L достигается при xp >= CURVE[L-1]
  function lvl(x) { let l = 1; for (let i = 1; i < MAX; i++) if (x >= CURVE[i]) l = i + 1; return l; }
  function info(id) {
    const x = xpOf(id), l = lvl(x);
    const from = CURVE[l - 1], to = l >= MAX ? CURVE[MAX - 1] : CURVE[l];
    return Object.assign({}, byId(id), { xp: x, level: l, from, to, max: l >= MAX, p: l >= MAX ? 1 : (x - from) / (to - from), left: l >= MAX ? 0 : to - x });
  }
  const chosen = () => Object.values(perkMap());
  const has = (perkId) => chosen().includes(perkId);
  function mult(key) { return chosen().reduce((m, id) => { const p = perkById(id); return m * ((p && p.mult && p.mult[key]) || 1); }, 1); }
  function add(key) { return chosen().reduce((s, id) => { const p = perkById(id); return s + ((p && p.add && p.add[key]) || 0); }, 0); }
  function available() {
    const out = [];
    SKILLS.forEach((s) => [5, 10].forEach((tier) => { if (info(s.id).level >= tier && !perkMap()[s.id + tier]) out.push({ skill: s.id, tier, perks: PERKS[s.id][tier] }); }));
    return out;
  }

  /* ---------- Начисление опыта ---------- */
  const gameDay = () => (Vibe.game && S().game ? Vibe.game.info().day : 0);
  function xp(id, n, { from = null, quiet = false } = {}) {
    if (!byId(id) || !S().profile || !(n > 0)) return 0;
    if (id === "creative") n *= mult("creativeXp");
    n = Math.round(n);
    const day = gameDay();
    let sd = S().skillDay;
    if (!sd || sd.day !== day) sd = { day, got: {} };
    const room = Math.max(0, DAY_CAP - (sd.got[id] || 0));
    n = Math.min(n, room);
    if (!n) return 0;
    const before = info(id);
    if (before.max) return 0;
    set({ skills: Object.assign({}, xpMap(), { [id]: before.xp + n }), skillDay: { day, got: Object.assign({}, sd.got, { [id]: (sd.got[id] || 0) + n }) } });
    const after = info(id);
    if (!quiet) floatXp(id, n, from);
    if (after.level > before.level) for (let l = before.level + 1; l <= after.level; l++) queueLevelUp(id, l);
    return n;
  }

  /* ---------- Маленький «+XP» над экраном ---------- */
  let floats = 0;
  function floatXp(id, n, from) {
    const s = byId(id);
    const el = document.createElement("div");
    el.className = "skx-float " + s.col;
    el.innerHTML = `<span>${s.e}</span> +${n} ${s.n}`;
    const layer = document.getElementById("fx-layer") || document.body;
    layer.appendChild(el);
    const y = 92 + (floats++ % 3) * 40;
    el.style.top = y + "px";
    el.animate([
      { transform: "translate(-50%, 16px) scale(.6)", opacity: 0 },
      { transform: "translate(-50%, 0) scale(1.08)", opacity: 1, offset: 0.18 },
      { transform: "translate(-50%, 0) scale(1)", opacity: 1, offset: 0.75 },
      { transform: "translate(-50%, -24px) scale(.95)", opacity: 0 },
    ], { duration: 1700, easing: "cubic-bezier(.2,.9,.3,1)" }).onfinish = () => { el.remove(); floats = Math.max(0, floats - 1); };
  }

  /* ---------- Левел-ап: большой модал ---------- */
  const queue = [];
  let showing = false;
  function queueLevelUp(id, level) {
    queue.push({ id, level });
    Vibe.emit && Vibe.emit("skill", { skill: id, level, name: byId(id).n, e: byId(id).e });
    if (!showing) setTimeout(nextLevelUp, 450);
  }
  const LINES = {
    career: ["Начальник заметил. Почти.", "Твоё резюме стало на строчку длиннее.", "Корпорация гордится тобой. Это бесплатно."],
    charisma: ["Люди тянутся. Иногда за деньгами.", "Ты научился говорить «давай как-нибудь» убедительно.", "Сердечки сами себя не нарисуют."],
    finance: ["Ты знаешь, где твои деньги. Это уже много.", "Сложный процент улыбнулся тебе.", "Кредит одобрен. Шутка. Или нет."],
    health: ["Пульс ровный, лифт — в прошлом.", "Браслет тобой доволен. Страховая — нет.", "+1 к лестницам."],
    cooking: ["Яичница стала заметно ровнее.", "Доставка грустит. Холодильник гордится.", "Соль по вкусу. Ты знаешь вкус."],
    driving: ["Парковка задом — больше не страшно.", "Камеры тебя запомнили. С уважением.", "Поворотник — твой друг."],
    creative: ["Муза оставила номер телефона.", "Сосед больше не стучит. Он слушает.", "Вдохновение подключено. Без подписки."],
    social: ["Алгоритм тебя заметил.", "Лайки капают, дофамин тоже.", "Охваты растут. Смысл догоняет."],
  };
  function nextLevelUp() {
    const it = queue.shift();
    if (!it) { showing = false; return; }
    showing = true;
    const s = byId(it.id);
    const tier = it.level === 5 || it.level === 10 ? it.level : 0;
    const perks = tier && !perkMap()[it.id + tier] ? PERKS[it.id][tier] : null;
    const line = LINES[it.id][it.level % LINES[it.id].length];
    FX.confetti(); setTimeout(() => FX.confetti({ count: 90 }), 250);
    Vibe.modal(`
      <div class="skx-lv">
        <div class="skx-rays"></div>
        <div class="skx-lv-badge ${s.col}"><span class="emo float">${s.e}</span><b>${it.level}</b></div>
      </div>
      <div class="badge" style="background:var(--yellow);margin-bottom:6px">⬆️ НАВЫК ПРОКАЧАН</div>
      <div class="display" style="font-size:30px">${s.n} · ${it.level}</div>
      <p>${line}${it.level >= MAX ? " Максимум! Дальше только легенды." : ""}</p>
      ${perks ? `
        <div style="font-weight:900;margin:2px 0 8px">🌟 Открыт перк — выбери один</div>
        <div class="skx-perkpick">${perks.map((p) => `<button class="skx-pp tap" data-pick="${p.id}"><span class="emo">${p.e}</span><b>${p.n}</b><small>${p.d}</small></button>`).join("")}</div>
        <button class="btn block" data-close style="margin-top:10px">Выберу потом</button>
        <div class="fine">Выбор навсегда. Как ипотека, только приятнее.</div>`
      : `<button class="btn black block" data-close>Я легенда 🔥</button>`}
    `, {
      sound: "levelup",
      onMount(m, close) {
        FX.burst(m.querySelector(".skx-lv-badge"), { emojis: [s.e, "⭐", "✨", "🔥"], count: 18 });
        m.addEventListener("click", (e) => {
          const b = e.target.closest("[data-pick]");
          if (!b) return;
          if (choose(it.id, tier, b.dataset.pick, b)) close();
        });
      },
      onClose() { setTimeout(nextLevelUp, 350); },
    });
  }

  /* ---------- Выбор перка ---------- */
  function choose(skill, tier, perkId, from) {
    const list = (PERKS[skill] || {})[tier];
    const p = list && list.find((x) => x.id === perkId);
    if (!p || perkMap()[skill + tier] || info(skill).level < tier) return false;
    set({ perks: Object.assign({}, perkMap(), { [skill + tier]: perkId }) });
    FX.sound.success && FX.sound.success();
    FX.confetti({ count: 120 });
    if (from) FX.burst(from, { emojis: [p.e, "🌟", "✨"], count: 16 });
    FX.toast(`Перк «${p.n}» активен: ${p.d}`, p.e, 3000);
    Vibe.emit && Vibe.emit("perk", { skill, tier, id: perkId });
    return true;
  }

  Vibe.skills = { SKILLS, PERKS, CURVE, MAX, xp, level: (id) => info(id).level, info, all: () => SKILLS.map((s) => info(s.id)), total: () => SKILLS.reduce((a, s) => a + info(s.id).level, 0), has, mult, add, available, choose, perk: perkById, top() { return SKILLS.map((s) => info(s.id)).sort((a, b) => b.xp - a.xp)[0]; } };

  /* ---------- Источники опыта (шина событий) ---------- */
  const courseSkill = (t) =>
    /фин|деньг|инвест|бюджет/i.test(t) ? "finance"
    : /блог|рилс|смм|soc|подписч/i.test(t) ? "social"
    : /медитац|йог|фитнес|бег|спорт|зож/i.test(t) ? "health"
    : /кулинар|готов|кухн|повар|выпеч/i.test(t) ? "cooking"
    : /вожд|автошк|права/i.test(t) ? "driving"
    : /гитар|рисов|живопис|танц|вокал|музык|гончар|фото|акварел|творч|котов/i.test(t) ? "creative"
    : /хобби|кружок|мастер-класс/i.test(t) ? "creative"
    : "career";

  Vibe.on("work", (d) => { xp("career", 20 + Math.round(((d && d.score) || 0.5) * 15)); if (d && d.promoted) setTimeout(() => xp("career", 120), 600); });
  Vibe.on("pay", (d) => {
    const t = (d && d.title) || "", a = (d && d.amount) || 0;
    if (/Learn|курс/i.test(t)) xp(courseSkill(t), Math.min(250, 60 + Math.round(a / 200)));
    else if (/Vibe Drive/.test(t)) xp("driving", 80);
    else if (/Бензин/i.test(t)) xp("driving", 20);
    else if (/Invest/i.test(t)) xp("finance", Math.min(80, 15 + Math.round(a / 1000)));
    else if (/подарок|Цветы/i.test(t)) xp("charisma", 15);
    else if (/Supermarket/.test(t)) xp("cooking", 5, { quiet: true });
  });
  Vibe.on("body", (d) => {
    const k = d && d.kind, o = (d && d.opts) || {};
    if (k === "cook") xp("cooking", 25);
    else if (k === "healthy") xp("cooking", 15);
    else if (k === "workout") xp("health", 20 + Math.round((o.score || 0.7) * 20));
    else if (k === "walk") xp("health", Math.min(40, 6 + Math.round((o.km || 1) * 6)));
    else if (k === "meditate") xp("health", 6, { quiet: true });
  });
  Vibe.on("arrive", (d) => { if (d && (d.mode === "car" || d.kind === "car")) xp("driving", 20); });
  Vibe.on("attend", (e) => {
    if (!e) return;
    const k = e.kind;
    if (k === "date") xp("charisma", 40);
    else if (k === "friend" || k === "family") xp("charisma", 30);
    else if (k === "hobby") xp(/кулинар|готов/i.test(e.title || "") ? "cooking" : /йог|бег|спорт|фитнес/i.test(e.title || "") ? "health" : "creative", 40);
    else if (k === "sport") xp("health", 30);
    else if (k === "concert") xp("creative", 12);
  });
  Vibe.on("gift", () => xp("charisma", 30));
  Vibe.on("talk", () => xp("charisma", 10));
  Vibe.on("post", (d) => xp("social", 20 + (d && d.kind === "story" ? 0 : 5)));
  Vibe.on("skillxp", (d) => d && xp(d.skill, d.n, d)); // для модулей без прямой зависимости

  /* ---------- Наблюдатель: копилка и операции без Vibe.pay (бензин, штрафы) ---------- */
  let lastJar = S().jar || 0, lastTx = (S().tx || [])[0] || null, guard = false;
  Vibe.state.on((st) => {
    if (guard || !st.profile) return;
    const jar = st.jar || 0;
    if (jar > lastJar) xp("finance", Math.min(60, 10 + Math.round((jar - lastJar) / 1000)));
    lastJar = jar;
    const top = st.tx && st.tx[0];
    if (lastTx && top && top !== lastTx) {
      const fresh = [];
      for (const t of st.tx) { if (t === lastTx || fresh.length > 5) break; fresh.push(t); }
      lastTx = top;
      guard = true;
      try {
        fresh.forEach((t) => {
          const title = String(t.t || "");
          if (/^Бензин/.test(title) && t.a < 0) {
            xp("driving", 20);
            const f = mult("fuel");
            if (f < 1 && Vibe.game) { const back = Math.round(-t.a * (1 - f)); if (back > 0) { Vibe.game.tx("Эко-драйв · экономия бензина", back, "⛽", "c-lime"); FX.toast(`Эко-драйв сэкономил ${Vibe.rub(back)}`, "⛽", 2200); } }
          } else if (/^Штраф/.test(title) && t.a < 0 && mult("fines") < 1 && Math.random() < 1 - mult("fines") && Vibe.game) {
            Vibe.game.tx("Штраф отменён · «Аккуратный»", -t.a, "🦺", "c-lime");
            FX.toast("Инспектор узнал аккуратного водителя. Штраф отменён", "🦺", 2800);
          }
        });
      } finally { guard = false; lastTx = S().tx && S().tx[0]; }
      Vibe.refreshCounters && Vibe.refreshCounters();
    } else lastTx = top || lastTx;
  });

  // Кэшбек-гуру: +1 категория (оборачиваем лимит из progress.js, если он есть)
  if (Vibe.cashback && typeof Vibe.cashback.limit === "function" && !Vibe.cashback.__skx) {
    const base = Vibe.cashback.limit;
    Vibe.cashback.limit = () => base() + add("cashbackSlots");
    Vibe.cashback.__skx = true;
  }

  /* ---------- Стили (общие для модала и экрана) ---------- */
  const css = `
  .skx-float{position:fixed;left:50%;z-index:9999;pointer-events:none;border:2.5px solid var(--ink);border-radius:999px;padding:6px 14px;font-weight:900;font-size:14px;box-shadow:0 3px 0 var(--ink);white-space:nowrap;display:flex;gap:6px;align-items:center}
  .skx-lv{position:relative;height:150px;display:grid;place-items:center;margin-bottom:6px}
  .skx-rays{position:absolute;width:220px;height:220px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,225,77,.85) 0 12deg,transparent 12deg 24deg);animation:skx-spin 9s linear infinite;-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}
  .skx-lv-badge{position:relative;width:118px;height:118px;border-radius:34px;border:3px solid var(--ink);box-shadow:0 6px 0 var(--ink);display:grid;place-items:center;transform:rotate(-6deg);animation:skx-pop .7s var(--spring) both}
  .skx-lv-badge .emo{font-size:58px}
  .skx-lv-badge b{position:absolute;right:-12px;bottom:-12px;width:46px;height:46px;border-radius:50%;background:var(--ink);color:var(--lime);font-family:var(--font-display);font-size:24px;display:grid;place-items:center;border:3px solid #fff}
  .skx-perkpick{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .skx-pp{border:2.5px solid var(--ink);border-radius:18px;background:#fff;box-shadow:0 4px 0 var(--ink);padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;font:inherit}
  .skx-pp .emo{font-size:34px}
  .skx-pp b{font-size:14px;font-weight:900}
  .skx-pp small{font-size:11px;font-weight:700;color:var(--muted);line-height:1.25}
  .skx-pp:nth-child(1){background:var(--lime)} .skx-pp:nth-child(2){background:var(--sky)}
  @keyframes skx-spin{to{transform:rotate(360deg)}}
  @keyframes skx-pop{0%{transform:scale(.2) rotate(-40deg)}100%{transform:scale(1) rotate(-6deg)}}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
