/* ============================================================
   Vibe Почта + финалы жизни.
   • Vibe.mail    — письма: банк, Госвайб, HR, арендодатель-енот,
                    рассылки Корпорации, подписки, мама, спам.
                    send({from, fe, subject, body, kind, action}), unread()
   • Письмо деда  — запечатано с первого дня. Тайный финал «Уехать в долину».
   • Vibe.endings — Легенда Vibe City (4 пути), Банкротство, Долина.
                    Экран "ending" (param kind). Наследство — localStorage['vibe-legacy'].
   Состояние: mail {list, seq}, endings {doomSince, warned2, forced}, endingsSeen [], legacyApplied
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const esc = (s) => Vibe.esc(s == null ? "" : s);
  const rub = (n) => Vibe.rub(n);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const live = () => !!(Vibe.game && S().profile && S().game);
  const nowDay = () => (live() ? Vibe.game.info().day : 0);
  const MONTHS = ["ноября", "декабря", "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября"];
  const dateOf = (day) => `${(day % 30) + 1} ${MONTHS[Math.floor(day / 30) % 12]}`;
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  let resetting = false;

  /* ================= Наследство прошлой жизни (читается один раз при загрузке) ================= */
  const LKEY = "vibe-legacy";
  let L = null;
  try { L = JSON.parse(localStorage.getItem(LKEY) || "null"); } catch (e) { L = null; }

  /* ================= Почта: данные ================= */
  const KINDS = {
    personal: { t: "Личное", c: "c-pink", e: "💌" },
    official: { t: "Официальное", c: "c-sky", e: "🏛️" },
    promo: { t: "Акции", c: "c-yellow", e: "🎁" },
    spam: { t: "Спам", c: "c-coral", e: "🗑️" },
  };
  const TABS = [
    { id: "inbox", t: "Входящие", e: "📥", f: (l) => l.kind !== "spam" },
    { id: "official", t: "Официальные", e: "🏛️", f: (l) => l.kind === "official" },
    { id: "promo", t: "Акции", e: "🎁", f: (l) => l.kind === "promo" },
    { id: "spam", t: "Спам", e: "🗑️", f: (l) => l.kind === "spam" },
  ];
  const M = () => Object.assign({ list: [], seq: 0 }, S().mail || {});
  const saveM = (patch) => set({ mail: Object.assign({}, M(), patch) });
  const fns = {}; // действия-функции живут только в памяти

  function send(l = {}) {
    if (resetting || !S().profile) return null;
    const m = M();
    if (l.id && m.list.some((x) => x.id === l.id)) return null;
    const kind = KINDS[l.kind] ? l.kind : "personal";
    const day = l.day != null ? l.day : nowDay();
    const acts = (Array.isArray(l.action) ? l.action : l.action ? [l.action] : []).map((a, i) => {
      if (typeof a.fn === "function") { const k = "f" + Date.now() + i + Math.random(); fns[k] = a.fn; return Object.assign({}, a, { fn: k }); }
      return a;
    });
    const letter = {
      id: l.id || `m${m.seq + 1}_${Date.now() % 1e6}`,
      from: String(l.from || "Vibe"), fe: l.fe || l.e || KINDS[kind].e,
      subject: String(l.subject || "Без темы"), body: String(l.body || ""), kind,
      action: acts, day, time: l.time || (live() && day === nowDay() ? Vibe.game.info().time : ""),
      read: !!l.read, pinned: !!l.pinned, sealed: !!l.sealed, due: l.due, meta: l.meta || null, done: false, ts: Date.now(),
    };
    const pinned = m.list.filter((x) => x.pinned);
    const rest = [letter, ...m.list.filter((x) => !x.pinned)].slice(0, 120);
    saveM({ list: letter.pinned ? [letter, ...pinned, ...rest.slice(1)] : [...pinned, ...rest], seq: m.seq + 1 });
    Vibe.emit("mail", letter);
    if (!l.quiet) notify(letter);
    return letter;
  }
  const get = (id) => M().list.find((x) => x.id === id);
  function patch(id, p) { saveM({ list: M().list.map((x) => (x.id === id ? Object.assign({}, x, p) : x)) }); Vibe.emit("mail", { id }); }
  function remove(id) { saveM({ list: M().list.filter((x) => x.id !== id || x.pinned) }); Vibe.emit("mail", { id }); }
  const list = (tab = "inbox") => { const t = TABS.find((x) => x.id === tab) || TABS[0]; return M().list.filter(t.f); };
  const unread = (tab) => (tab ? list(tab) : M().list.filter((l) => l.kind !== "spam")).filter((l) => !l.read).length;

  // Тосты о новых письмах: пачкой, без звука (письма приходят из таймеров)
  let nq = [], nt = null;
  function notify(letter) {
    if (letter.kind === "spam") return;
    nq.push(letter);
    clearTimeout(nt);
    nt = setTimeout(() => {
      const q = nq; nq = [];
      if (!q.length || (Vibe.current && Vibe.current.route.name === "mail")) return;
      if (q.length === 1) FX.toast(`${esc(q[0].from)}: ${esc(q[0].subject)}`, "📬", 3200);
      else FX.toast(`${q.length} ${plural(q.length, "новое письмо", "новых письма", "новых писем")} в Vibe Почте`, "📬", 3200);
    }, 1200);
  }

  /* ================= Тексты ================= */
  const CORP = [
    { s: "Дорогая семья Vibe! 💜 Новости недели", b: "Дорогая семья Vibe!\n\nНа этой неделе мы стали ещё ближе к вам. Буквально: теперь приложение знает, где вы, даже когда оно закрыто. Это забота.\n\nВ знак благодарности — подарок. Он уже ждёт. Как и мы.", a: [{ label: "🎁 Забрать подарок семьи", reward: { vibiki: 25, xp: 10 } }] },
    { s: "Дорогая семья Vibe! Мы обновили оферту 📜", b: "Дорогая семья Vibe!\n\nМы обновили пользовательское соглашение. Ничего не изменилось, кроме всего. Продолжая дышать, вы соглашаетесь с новой редакцией.\n\nМы вас любим. Это пункт 14.3.", a: [{ label: "🎁 Принять подарок за согласие", reward: { vibiki: 20, xp: 10 } }] },
    { s: "Дорогая семья Vibe! Вы — наш герой 🦸", b: "Дорогая семья Vibe!\n\nЗа месяц вы потратили больше, чем 87% пользователей вашего района. Мы гордимся вами. Ваш кэшбек тоже гордится — на 0,001%.\n\nПродолжайте в том же духе. Буквально.", a: [{ label: "🛍️ Продолжить в том же духе", go: "market" }, { label: "🎁 Медаль героя", reward: { vibiki: 30, xp: 10 } }] },
    { s: "Дорогая семья Vibe! Отдых — это тоже работа 🏝️", b: "Дорогая семья Vibe!\n\nМы заметили, что вы устали. Мы не можем дать вам выходной, но можем дать скидку 3% на путешествие, которое вы не успеете совершить.\n\nОтдыхайте продуктивно!", a: [{ label: "🏝️ Отдохнуть в Vibe Travel", go: "travel" }, { label: "🎁 Забрать 3% счастья", reward: { vibiki: 20, xp: 10 } }] },
    { s: "Дорогая семья Vibe! Плюс — это просто плюс ✨", b: "Дорогая семья Vibe!\n\nВсего 299 ₫ в месяц — и ваш кэшбек удваивается. Удвоенный ноль — тоже результат.\n\nМы не навязываем. Мы просто будем писать каждую неделю.", a: [{ label: "✨ Узнать про Плюс", go: "plus" }, { label: "🎁 Подарок без подписки (пока)", reward: { vibiki: 15, xp: 10 } }] },
    { s: "Дорогая семья Vibe! Покрути колесо 🎡", b: "Дорогая семья Vibe!\n\nУдача любит тех, кто крутит колесо каждый день. Мы тоже.\n\nВаша персональная удача уже предодобрена.", a: [{ label: "🎡 К колесу вайба", go: "wheel" }, { label: "🎁 Забрать бонус", reward: { vibiki: 25, xp: 10 } }] },
  ];
  const GOV = [
    { s: "Уведомление о получении уведомления", b: "Настоящим уведомляем, что вы получили настоящее уведомление.\n\nОтветное уведомление о получении направлять не требуется. Но можно.", a: [{ label: "🏛️ В Госвайб", go: "gov" }] },
    { s: "Ваше обращение рассмотрено ✅", b: "Ваше обращение №000000 рассмотрено.\n\nОтвет: да.\n\nОбращений вы не подавали, но мы работаем на опережение.", a: [{ label: "🏛️ В Госвайб", go: "gov" }] },
    { s: "Перепись настроения населения 📊", b: "Уважаемый житель Vibe City!\n\nПроводится перепись настроения. Ваше настроение записано как «нормальное». Если не согласны — подайте заявление в бумажном виде в электронной форме.", a: [{ label: "🏛️ Оспорить в Госвайбе", go: "gov" }] },
    { s: "Плановое отключение горячей воды 🚿", b: "С 1 по 31 число горячей воды не будет в связи с плановыми работами по планированию работ.\n\nСпасибо за понимание. Понимание обязательно." },
  ];
  const FINES = [
    { t: "превышение скорости на самокате", a: 500, b: "Камера зафиксировала превышение скорости на самокате 4 км/ч. Самоката у вас нет. Штраф есть." },
    { t: "громкий смех в метро", a: 300, b: "Зафиксирован смех свыше 60 дБ в общественном транспорте. Радоваться разрешено в специально отведённых местах." },
    { t: "благоустройство благоустройства", a: 700, b: "Начислен сбор на благоустройство благоустройства вашего района. Плитка сама себя не переложит. Трижды." },
    { t: "досрочную оплату", a: 150, b: "Вы оплатили прошлый штраф раньше срока, чем нарушили график поступлений. Пени — 150 ₫." },
  ];
  const HR = [
    { s: "Опрос вовлечённости (анонимный, с ФИО)", b: "Коллеги!\n\nПросим пройти анонимный опрос. Укажите ФИО, отдел и табельный номер — чтобы мы знали, кто анонимно недоволен.\n\nС заботой, HR 💜" },
    { s: "Корпоратив: явка добровольно-обязательная 🎉", b: "Друзья!\n\nВ пятницу корпоратив. Явка добровольная. Отсутствие будет учтено в оценке эффективности.\n\nДресс-код: улыбка." },
    { s: "Вы — сотрудник месяца! 🏆", b: "Поздравляем! Вы — сотрудник месяца.\n\nВ копии этого письма ещё 340 сотрудников месяца. Вместе мы — сила!\n\nПремия выражается в признании." },
    { s: "Новое правило рабочего чата", b: "Напоминаем: в рабочем чате разрешены только позитивные эмодзи. 💜👍🔥\n\nЭмодзи 🫠 признан деструктивным и будет обсуждён на one-to-one." },
    { s: "Ретро: что мы можем улучшить? (кроме зарплат)", b: "Коллеги!\n\nДелимся идеями, как стать лучше. Вопросы о зарплатах, отпуске и переработках просим не поднимать: они уже идеальны." },
  ];
  const MOM = [
    { s: "Солнышко, ты кушаешь?", b: "Солнышко, привет!\n\nТы кушаешь? Я видела по телевизору, что молодёжь сейчас ест одну доставку. Приезжай, я котлет нажарила. Много.\n\nЦелую, мама 💐\n\nP.S. Как переслать это письмо всем? Нажала что-то, вроде получилось." },
    { s: "Шапку надел?", b: "Сыночек-доченька, на улице ветер!\n\nНадень шапку. Я знаю, что ты не носишь. Но надень.\n\nПапа передаёт привет и спрашивает, когда отдашь отвёртку." },
    { s: "Папа починил кран", b: "Привет, родной!\n\nПапа починил кран. Теперь не работает свет. Он говорит, что так и задумано.\n\nЗвони чаще. Или хотя бы ставь лайки." },
    { s: "Нашла тебе невесту/жениха", b: "Золотце, у тёти Гали есть знакомые, у которых есть дети. Очень хорошие. С квартирой.\n\nЯ дала твой номер. Не благодари. Ну, можешь поблагодарить." },
  ];
  const SPAM = [
    { from: "Мега-Розыгрыш", fe: "📱", s: "ВЫ ВЫИГРАЛИ ЯЙФОН 17 PRO MAX!!! 🎉🎉🎉", b: "Поздравляем!!! Вы — наш случайный победитель (снова)!\n\nОсталось оплатить только доставку приза. Курьер уже выехал. Почти.", scam: { amount: 990, t: "доставка приза" } },
    { from: "Кэшбек-Центр", fe: "⏳", s: "Ваш кэшбек сгорает через 2 часа!!!", b: "СРОЧНО! На вашем счёте 14 873 бонуса, которые СГОРЯТ через 2 часа.\n\nЧтобы спасти их, активируйте карту лояльности за символические 299 ₫.", scam: { amount: 299, t: "активация кэшбека" } },
    { from: "Принц Абу-Вайб III", fe: "🤴", s: "Нигерийский принц предлагает ипотеку 0%", b: "Дорогой друг!\n\nЯ — наследный принц с большим сердцем и большим состоянием. Предлагаю вам ипотеку под 0% на дворец.\n\nНужно лишь оплатить оформление — 5 000 ₫. Деньги вернутся с процентами. С королевскими.", scam: { amount: 5000, t: "оформление королевской ипотеки" } },
    { from: "Мам это я новый номер", fe: "📵", s: "Мам, это я. Скинь 3 000, потом объясню", b: "Привет, это я. Телефон утонул, пишу с чужого. Срочно нужно 3 000 ₫. Потом объясню. Маме не говори.\n\nВ смысле, тебе не говори. Короче, скинь.", scam: { amount: 3000, t: "перевод «мне»" } },
    { from: "Дядя Ваня Инвест", fe: "📈", s: "+900% за неделю. Гарантия честного слова", b: "Брат, есть тема. Вкладываешь 10 000 ₫ — через неделю 100 000 ₫.\n\nГарантия — моё честное слово. Его ещё никто не проверял.", scam: { amount: 10000, t: "инвестиции в тему" } },
    { from: "Служба безопасности банка", fe: "🕵️", s: "Подозрительная операция! Подтвердите личность", b: "С вашей карты пытаются списать деньги!\n\nЧтобы мы их защитили, переведите их на безопасный счёт. Самый безопасный — наш.", scam: { amount: 4000, t: "перевод на «безопасный счёт»" } },
    { from: "Гадалка Вайолетта", fe: "🔮", s: "Ваша карма в минусе. Почистим за 990 ₫", b: "Вижу на вас венец безбрачия, сглаз и долг по ЖКХ.\n\nПервое и второе сниму за 990 ₫. С третьим — сами.", scam: { amount: 990, t: "чистка кармы" } },
    { from: "Таможня-Экспресс", fe: "📦", s: "Ваша посылка задержана на таможне", b: "Ваша посылка (вы ничего не заказывали) задержана.\n\nОплатите таможенный сбор 149 ₫, иначе она будет уничтожена. Нам будет очень жаль.", scam: { amount: 149, t: "таможенный сбор" } },
    { from: "Вебинар «Миллион за 3 дня»", fe: "🎓", s: "Стань миллионером за 3 вебинара 💸", b: "Наш спикер заработал миллион, продавая курсы о том, как заработать миллион.\n\nПервый урок бесплатно. Остальные 40 — со скидкой." },
    { from: "Похудение-Онлайн", fe: "🥒", s: "Минус 15 кг за 0 дней без усилий!", b: "Учёные ненавидят этот трюк! Достаточно просто… дочитайте письмо до конца, чтобы узнать.\n\nВы дочитали. Минус 0 кг. Зато минус 10 секунд." },
    { from: "Re: Re: Fwd: Fwd:", fe: "⛓️", s: "Перешли 10 друзьям, или кэшбек отвернётся", b: "Это письмо обошло весь мир 7 раз. Перешли его 10 друзьям в течение часа.\n\nТот, кто не переслал, получил кэшбек 0%. Совпадение? Нет. Это просто кэшбек." },
    { from: "Победитель Конкурсов", fe: "🏅", s: "Вы — наш 1 000 000-й посетитель!", b: "Невероятно! Вы — миллионный посетитель. Как и предыдущие 999 999." },
    { from: "Тайная распродажа", fe: "🏷️", s: "ВСЁ по 1 ₫!!! (кроме всего)", b: "Только сегодня! Все товары по 1 ₫*.\n\n* Кроме всех товаров." },
  ];

  /* ================= Действия писем ================= */
  function runAction(letter, i, btn, close) {
    const a = (letter.action || [])[i];
    if (!a) return;
    if (a.valley) { close && close(); setTimeout(confirmValley, 280); return; }
    if (a.ending) { close && close(); Vibe.go("ending", { kind: a.ending }); return; }
    if (a.go) { close && close(); FX.sound.pop(); Vibe.go(a.go, a.params || {}); return; }
    if (letter.done) return FX.toast("Уже сделано ✓", "📬");
    if (a.fn && fns[a.fn]) { try { fns[a.fn](letter, btn); } catch (e) { console.error(e); } patch(letter.id, { done: true }); close && close(); return; }
    if (a.pay) {
      const ok = Vibe.pay(a.pay.amount, { title: a.pay.title || letter.subject, emoji: a.pay.emoji || letter.fe, col: "c-sky", from: btn });
      if (!ok) return;
      patch(letter.id, { done: true });
      FX.burst(btn, { emojis: ["✅", "🧾", "✨"], count: 12 });
      FX.toast("Оплачено. Госвайб доволен. Это редкость", "🏛️", 2600);
      close && close();
      return;
    }
    if (a.reward) {
      patch(letter.id, { done: true });
      Vibe.reward(Object.assign({ from: btn }, a.reward));
      FX.burst(btn, { emojis: ["🎁", "💜", "✨"], count: 14 });
      FX.sound.success();
      close && close();
      return;
    }
    if (a.unsub) {
      close && close();
      Vibe.modal(`<div class="m-emo wobble">🥺</div><div class="display" style="font-size:24px">Ты точно уходишь?</div>
        <p>Подписка «${esc(a.name || "")}» будет скучать. Мы все будем скучать. Особенно отдел удержания.</p>
        <div style="display:grid;gap:10px"><button class="btn block" data-close>Остаться 💜</button><button class="btn black block" data-yes>Отменить подписку</button></div>
        <div class="fine">Отмена вступит в силу. Когда-нибудь.</div>`, {
        sound: "pop",
        onMount(m, cl) {
          m.querySelector("[data-yes]").addEventListener("click", (e) => {
            if (Vibe.subs) Vibe.subs.remove(a.unsub);
            patch(letter.id, { done: true });
            cl(); Vibe.achieve("cancel");
            FX.burst(e.currentTarget, { emojis: ["✂️", "🎉"], count: 12 });
            FX.toast("Подписка отменена. Свобода!", "✂️", 2600);
          });
        },
      });
      return;
    }
    if (a.scam) {
      close && close();
      Vibe.modal(`<div class="m-emo wobble">${esc(letter.fe)}</div><div class="display" style="font-size:24px">Последний шаг!</div>
        <p>Осталось оплатить ${rub(a.scam.amount)} — «${esc(a.scam.t)}». И всё будет. Честно-честно.</p>
        <div style="display:grid;gap:10px"><button class="btn black block" data-pay>Оплатить ${rub(a.scam.amount)}</button><button class="btn lime block" data-no>🛡️ Это развод!</button></div>
        <div class="fine">Vibe не несёт ответственности за письма, которые Vibe доставил.</div>`, {
        sound: "pop",
        onMount(m, cl) {
          m.querySelector("[data-pay]").addEventListener("click", (e) => {
            const ok = Vibe.pay(a.scam.amount, { title: `Перевод незнакомцу · ${a.scam.t}`, emoji: "🫠", col: "c-coral", cashback: 0, from: e.currentTarget });
            if (!ok) return;
            patch(letter.id, { done: true });
            cl();
            setTimeout(() => FX.toast("Деньги ушли. Приз — нет. Зато опыт бесценен 🫠", "🎣", 3600), 500);
            if (Vibe.body) { const b = Vibe.body.get(); set({ body: Object.assign({}, b, { mood: clamp((b.mood || 50) - 8, 0, 100) }) }); }
          });
          m.querySelector("[data-no]").addEventListener("click", (e) => {
            patch(letter.id, { done: true });
            cl();
            Vibe.reward({ vibiki: 15, xp: 15, from: e.currentTarget });
            FX.burst(e.currentTarget, { emojis: ["🛡️", "🧠", "✨"], count: 12 });
            FX.toast("Бдительность +1. Вайбот тобой гордится", "🛡️", 2600);
          });
        },
      });
    }
  }

  /* ================= Письмо деда ================= */
  const lives = () => (L && L.lives) || 0;
  function grandpaBody() {
    return "Здравствуй, родной мой.\n\nЕсли ты открыл это письмо — значит, стало невыносимо. Я знаю, как это бывает. Я сам сорок лет проработал в большой конторе, где все были «одной семьёй». Семьёй, которая платит два раза в месяц.\n\nУ меня для тебя подарок. Маленькая ферма в долине: старый дом, сарай, грядки и пара упрямых куриц. Там нет кэшбека, зато есть тишина.\n\nНикаких уведомлений. Никаких предодобренных кредитов. Только утро, земля и то, что ты вырастишь сам.\n\nКлюч под горшком с геранью. Решать тебе. Я в тебя верю.\n\nТвой дедушка 👴" +
      (lives() ? `\n\nP.S. Это уже ${lives() + 1}-я твоя жизнь. Ничего. Не у всех получается с первой. Грядки ждут.` : "");
  }
  function openGrandpa() {
    const l = get("grandpa");
    if (!l) return;
    const paper = () => `<div class="vm-paper">${fmtBody(l.body)}</div>
      <div style="display:grid;gap:10px;margin-top:14px">
        <button class="btn block vm-valley-btn" data-valley>🌾 Уехать в долину</button>
        <button class="btn block" data-close>Ещё не время</button>
      </div>`;
    if (!l.sealed) {
      Vibe.modal(paper(), { sound: "pop", onMount: (m, cl) => m.querySelector("[data-valley]").addEventListener("click", () => { cl(); setTimeout(confirmValley, 280); }) });
      return;
    }
    Vibe.modal(`<div data-gp>
        <div class="vm-env" data-env><div class="vm-env-flap"></div><div class="vm-seal">Д</div><div class="vm-env-txt">Открыть, когда<br>станет невыносимо</div></div>
        <p>Конверт пожелтел. Почерк деда. Печать целая.</p>
        <button class="btn black block" data-break>Сломать печать ✉️</button>
        <button class="btn block" data-close style="margin-top:10px">Пока терпимо</button>
      </div>`, {
      sound: "pop",
      onMount(m, cl) {
        m.querySelector("[data-break]").addEventListener("click", (e) => {
          const env = m.querySelector("[data-env]");
          env.classList.add("open");
          FX.burst(env, { emojis: ["🍂", "🌾", "✨", "🐔"], count: 14 });
          FX.sound.success();
          e.currentTarget.disabled = true;
          patch("grandpa", { sealed: false, read: true });
          setTimeout(() => {
            const box = m.querySelector("[data-gp]");
            if (!box) return;
            box.innerHTML = paper();
            box.querySelector("[data-valley]").addEventListener("click", () => { cl(); setTimeout(confirmValley, 280); });
          }, 900);
        });
      },
    });
  }
  function confirmValley() {
    Vibe.modal(`<div class="m-emo float">🌾</div><div class="display" style="font-size:26px">Уехать в долину?</div>
      <p>Работа, квартира, кредиты, подписки и 37 персональных предложений останутся здесь. Навсегда. Корпорация будет скучать. Наверное.</p>
      <div style="display:grid;gap:10px"><button class="btn block vm-valley-btn" data-go-valley>🚜 Уехать навсегда</button><button class="btn block" data-close>Ещё потерплю</button></div>
      <div class="fine">Эта жизнь закончится. Начнётся новая — с наследством.</div>`, {
      sound: "pop",
      onMount(m, cl) { m.querySelector("[data-go-valley]").addEventListener("click", () => { cl(); endings.valley(); }); },
    });
  }

  /* ================= Генерация писем по игровому времени ================= */
  function byEvent(ev) {
    const s = S();
    const d = ev.day;
    if (ev.kind === "salary") {
      const j = s.job;
      const gross = j ? j.salary : 0;
      const isAdv = /Аванс/.test(ev.title);
      send({ id: `slip${d}`, day: d, kind: "official", from: `HR · ${j ? j.company : "работодатель"}`, fe: "🧾", subject: `Расчётный листок: ${isAdv ? "аванс" : "зарплата"} ${rub(ev.a)}`,
        body: `Добрый день!\n\nНачислено: ${isAdv ? "40%" : "60%"} от оклада ${rub(gross)}\nНДФЛ 13%: удержан с любовью\nВзнос в фонд пиццы на пятницу: 0 ₫ (пиццы не будет)\nК выплате: ${rub(ev.a)}\n\nСпасибо, что вы с нами. Мы — тоже с вами. До следующего листка.`, action: { label: "💼 В Vibe Job", go: "job" }, quiet: true });
    } else if (ev.kind === "bonus") {
      send({ id: `bonus${d}`, day: d, kind: "official", from: "HR · отдел мотивации", fe: "🏆", subject: `Премия ${rub(ev.a)} начислена!`, body: "Поздравляем! Ваши задачи замечены, оценены и монетизированы.\n\nПродолжайте закрывать задачи — премия растёт. Ответственность тоже, но об этом в следующем письме.", quiet: true });
    } else if (ev.kind === "loan") {
      const l = (s.loans || []).find((x) => x.id === ev.loan);
      send({ id: `loan${d}_${ev.loan}`, day: d, kind: "official", from: "Vibe Банк", fe: "🏦", subject: l ? `Платёж по «${l.name}» списан` : "Кредит закрыт! 🕊️",
        body: l ? `Списано ${rub(Math.abs(ev.a))}. Осталось платежей: ${l.left}.\n\nСпасибо за своевременность. Кстати, вам предодобрен ещё один кредит. Просто чтобы вы знали.` : "Поздравляем! Вы закрыли кредит.\n\nМы очень рады. И немного грустим. Возвращайтесь — ставка для вас уже персональная.", action: { label: "💳 В Vibe Pay", go: "pay" }, quiet: !!l });
    } else if (ev.kind === "rent") {
      send({ id: `rentok${d}`, day: d, kind: "personal", from: "Тимофей Нуков", fe: "🦝", subject: "Аренда получена, спасибо!",
        body: `Дорогой жилец!\n\nПолучил ${rub(Math.abs(ev.a))}. ${S().balance < 0 ? "Вижу, ушли в минус ради меня. Это трогательно. Я записал в тетрадку." : "Вовремя! Записал в тетрадку."}\n\nНапоминаю: у меня есть домики в ипотеку. Всего 360 платежей — и вы почти свободны!\n\nВаш Тимофей Нуков 🦝\n«Нуков и племянники»`, quiet: true });
    } else if (ev.kind === "bill" && /^Подписка · /.test(ev.title)) {
      const name = ev.title.replace(/^Подписка · /, "");
      const sub = Vibe.subs ? Vibe.subs.list().find((x) => x.name === name) : null;
      send({ id: `sub${d}_${name}`, day: d, kind: "promo", from: name, fe: ev.e || "💳", subject: `Ваша подписка продлена! 🎉`,
        body: `Отличные новости! Подписка «${name}» продлена ещё на месяц. Списано ${rub(Math.abs(ev.a))}.\n\nВы ведь пользуетесь ей? Мы уверены, что да. Мы видим.`, action: sub ? { label: "✂️ Отменить подписку", unsub: sub.id, name } : null, quiet: true });
    } else if (ev.kind === "bill" && /ЖКХ/.test(ev.title)) {
      send({ id: `zhkh${d}`, day: d, kind: "official", from: "Госвайб · ЖКХ", fe: "💡", subject: `Квитанция ЖКХ: ${rub(Math.abs(ev.a))}`,
        body: "Оплата прошла автоматически.\n\nТариф вырос на 9%, потому что вырос. Отопление включат, когда станет тепло.", quiet: true });
    }
  }

  function daily(d, recent) {
    const s = S();
    const dom = (d % 30) + 1;
    if (dom === 30) {
      const loans = s.loans || [];
      const subsN = Vibe.subs ? Vibe.subs.list().length : 0;
      send({ id: `stmt${d}`, day: d, kind: "official", from: "Vibe Банк", fe: "🏦", subject: `Выписка за месяц · баланс ${rub(s.balance)}`,
        body: `Ваша выписка готова!\n\nБаланс: ${rub(s.balance)}\nВайбики: ${Vibe.fmt(s.vibiki || 0)}\nКредитов: ${loans.length}${loans.length ? ` (платёж ${rub(loans.reduce((a, l) => a + l.monthly, 0))}/мес)` : ""}\nПодписок: ${subsN}${subsN && Vibe.subs ? ` на ${rub(Vibe.subs.total())}/мес` : ""}\nПотрачено за всё время: ${rub(s.spent || 0)}\n\n${s.balance < 0 ? "Мы заметили минус. Не переживайте: мы переживаем за вас. За процент." : "Вы молодец! Деньги не должны лежать без дела. Потратьте их."}`,
        action: { label: "💳 Открыть Vibe Pay", go: "pay" } });
    }
    if (dom === 28) nukov(d);
    if (d % 7 === 1) { const c = CORP[Math.floor(d / 7) % CORP.length]; send({ id: `news${d}`, day: d, kind: "promo", from: "Корпорация Vibe", fe: "💜", subject: c.s, body: c.b, action: c.a }); }
    if (d % 5 === 3) {
      if (d % 10 === 3) {
        const f = FINES[Math.floor(d / 10) % FINES.length];
        send({ id: `fine${d}`, day: d, kind: "official", from: "Госвайб", fe: "🚔", subject: `Штраф ${rub(f.a)} за ${f.t}`, due: d + 5, meta: { fine: f.a },
          body: `${f.b}\n\nОплатите в течение 5 дней. Иначе спишем сами — с пенями 50%. Мы не злые, мы автоматические.`,
          action: { label: `🧾 Оплатить ${rub(f.a)}`, pay: { amount: f.a, title: `Госвайб · штраф за ${f.t}`, emoji: "🏛️" } } });
      } else { const g = GOV[Math.floor(d / 10) % GOV.length]; send({ id: `gov${d}`, day: d, kind: "official", from: "Госвайб", fe: "🏛️", subject: g.s, body: g.b, action: g.a }); }
    }
    if (s.job && d % 7 === 4) { const h = HR[Math.floor(d / 7) % HR.length]; send({ id: `hr${d}`, day: d, kind: "official", from: `HR · ${s.job.company}`, fe: "👩‍💼", subject: h.s, body: h.b, action: { label: "💼 На работу", go: "job" } }); }
    if (d % 6 === 2) { const mm = MOM[Math.floor(d / 6) % MOM.length]; send({ id: `mom${d}`, day: d, kind: "personal", from: "Мама", fe: "👩", subject: mm.s, body: mm.b, meta: { mom: 1 }, action: { label: "🫂 К близким", go: "people" } }); }
    if (s.balance < 0 && d % 4 === 0) send({ id: `minus${d}`, day: d, kind: "official", from: "Vibe Банк", fe: "🫠", subject: "Ваш минус — наш плюс", body: `На карте ${rub(s.balance)}. Каждый день начисляем 1%.\n\nМы не давим. Мы просто напоминаем, что кредит предодобрен. Всегда. Для вас.`, action: { label: "💳 В Vibe Pay", go: "pay" } });
    if (recent) {
      const n = 1 + (Math.random() < 0.45 ? 1 : 0);
      for (let i = 0; i < n; i++) spam(d, i);
    }
  }
  function spam(d, i) {
    const sp = pick(SPAM);
    send({ id: `spam${d}_${i}`, day: d, kind: "spam", from: sp.from, fe: sp.fe, subject: sp.s, body: sp.b, action: sp.scam ? { label: sp.scam.amount >= 3000 ? "💸 Хочу!" : "🎁 Забрать!", scam: sp.scam } : null });
  }
  function nukov(d) {
    const s = S();
    const mort = (s.loans || []).find((l) => /ипотек/i.test(l.name));
    let subject, body;
    if (mort) {
      subject = `Ипотека: ${rub(mort.monthly)} — 30-го, в день зарплаты 🦝`;
      body = `Здравствуйте, дорогой почти-владелец!\n\nНапоминаю про платёж по ипотеке: ${rub(mort.monthly)}, 30-го числа — прямо в день зарплаты, чтобы вы не успели потратить. Осталось всего ${mort.left} ${plural(mort.left, "платёж", "платежа", "платежей")}! Ну, «всего».\n\nНе переживайте, если задержите. Я подожду. С процентами.\n\nВаш Тимофей Нуков 🦝`;
    } else if (s.home && s.home.rent) {
      subject = `Аренда ${rub(s.home.rent)} через 3 дня 🦝`;
      body = `Здравствуйте, дорогой жилец!\n\nНапоминаю: 30-го, в день зарплаты, аренда — ${rub(s.home.rent)}. Спишется сама, до того как вы успеете обрадоваться.\n\nКстати! Зачем платить мне аренду, если можно платить мне ипотеку? Домики под 29,9%, всего 360 платежей. Почти как аренда, только навсегда.\n\nВаш Тимофей Нуков 🦝\n«Нуков и племянники»`;
    } else if (s.home && s.home.own) {
      subject = "Вы мне ничего не должны. Непривычно? 🦝";
      body = "Здравствуйте!\n\nСмотрю в тетрадку — вы мне ничего не должны. Непривычно, да? Мне тоже.\n\nНе хотите пристройку? Второй этаж? Домик побольше? Ипотека для вас уже предодобрена.\n\nВаш Тимофей Нуков 🦝";
    } else return;
    send({ id: `nuk${d}`, day: d, kind: "personal", from: "Тимофей Нуков", fe: "🦝", subject, body, action: [{ label: "🏠 Посмотреть домики", go: "home-buy" }, { label: "🔑 Vibe Rent", go: "rent" }] });
  }
  function checkDue() {
    const day = nowDay();
    M().list.filter((l) => l.due != null && !l.done && day > l.due && l.meta && l.meta.fine).forEach((l) => {
      const pen = Math.round(l.meta.fine * 1.5);
      Vibe.game.tx(`Госвайб · принудительное списание`, -pen, "🚔", "c-coral");
      patch(l.id, { done: true });
      send({ id: `forced_${l.id}`, kind: "official", from: "Госвайб · взыскания", fe: "⚖️", subject: `Списано принудительно: ${rub(pen)}`, body: `Штраф «${l.subject}» не был оплачен вовремя. Списали сами, с пенями 50%.\n\nСпасибо, что выбираете Госвайб. Выбора, впрочем, нет.` });
      Vibe.refreshCounters();
    });
  }

  if (Vibe.game && Vibe.game.on) Vibe.game.on((events) => {
    if (resetting || !S().profile) return;
    const days = [...new Set(events.map((e) => e.day))].sort((a, b) => a - b).slice(-30);
    const recent = new Set(days.slice(-2));
    events.forEach((ev) => { if (days.includes(ev.day)) { try { byEvent(ev); } catch (e) { console.error(e); } } });
    days.forEach((d) => { try { daily(d, recent.has(d)); } catch (e) { console.error(e); } });
    try { checkDue(); } catch (e) { console.error(e); }
    setTimeout(() => endings.check(), 1500);
  });
  Vibe.on("work", (w) => {
    if (!w || !w.promoted || !S().job) return;
    const j = S().job;
    send({ id: `promo${j.level}_${j.company}`, kind: "official", from: `HR · ${j.company}`, fe: "🚀", subject: `Поздравляем с повышением!`, body: `Дорогой ${Vibe.game.jobTitle(j)}!\n\nВы выросли. Мы гордимся. Оклад теперь ${rub(j.salary)}, ответственность — бесценна.\n\nНовые KPI придут отдельным письмом. Их будет много.`, action: { label: "💼 В Vibe Job", go: "job" } });
    setTimeout(() => endings.check(), 2000);
  });
  Vibe.on("pay", (p) => {
    if (!p || p.amount < 15000 || /незнакомцу|Госвайб/.test(p.title)) return;
    const d = nowDay();
    send({ id: `thx${d}`, kind: "promo", from: "Vibe Market", fe: "🛍️", subject: "Спасибо за покупку! Вам может понравиться…", body: `Вы купили «${p.title}» за ${rub(p.amount)}. Отличный выбор!\n\nВам может понравиться: то же самое, но дороже. И ещё раз то же самое — на случай, если первое сломается.`, action: { label: "🛍️ Смотреть похожее", go: "market" } });
  });

  /* ================= Первое письмо, наследство ================= */
  function ensure() {
    const s = S();
    if (resetting || !s.profile) return;
    if (!get("grandpa")) {
      send({ id: "welcome", kind: "promo", from: "Корпорация Vibe", fe: "💜", subject: "Дорогая семья Vibe! Добро пожаловать домой 🏠",
        body: `Дорогая семья Vibe!\n\nМы рады, что ты с нами, ${s.name || "друг"}. Теперь у тебя есть всё: работа, еда, такси, любовь и кредит — в одном приложении.\n\nТебе больше никогда не придётся выходить из Vibe. Мы позаботились.`,
        action: { label: "🎁 Подарок новичку", reward: { vibiki: 30, xp: 10 } }, quiet: true });
      const sp = SPAM[0];
      send({ id: "spam_first", kind: "spam", from: sp.from, fe: sp.fe, subject: sp.s, body: sp.b, action: { label: "🎁 Забрать!", scam: sp.scam }, quiet: true });
      send({ id: "grandpa", kind: "personal", from: "Дедушка", fe: "👴", subject: "От дедушки. Открыть, когда станет невыносимо", body: grandpaBody(), pinned: true, sealed: true, quiet: true, action: { label: "🌾 Уехать в долину", valley: true } });
    }
    if (L && L.pending && !s.legacyApplied && s.game) {
      const bonus = Math.max(0, Math.round(L.bonus || 0));
      set({ legacyApplied: true });
      if (bonus) Vibe.game.tx("Наследство прошлой жизни", bonus, "📜", "c-lime");
      const vib = Math.min(300, 50 * (L.lives || 1));
      setTimeout(() => { Vibe.reward({ vibiki: vib, xp: 30 }); FX.toast(`Наследство прошлой жизни: +${rub(bonus)}`, "📜", 3600); Vibe.refreshCounters(); }, 2600);
      const last = L.last || {};
      send({ id: "legacy", kind: "personal", from: "Ты из прошлой жизни", fe: "📜", subject: `Привет из жизни №${L.lives || 1}`,
        body: `Привет. Это ты. Ну, тот, кто был до тебя.\n\nЯ прожил ${last.days || "сколько-то"} ${plural(last.days || 5, "день", "дня", "дней")}${last.kind ? ` и закончил так: «${(ENDINGS[last.kind] || ENDINGS.legend).t}»` : ""}. Оставил тебе ${rub(bonus)} и ${vib} вайбиков. Немного, но честно.\n\nСовет: ${last.kind === "bankrupt" ? "не бери кредит на кредит. Я брал. Не надо." : last.kind === "valley" ? "дед был прав. Но попробуй и здесь пожить." : "не забывай про людей. Деньги — это ещё не всё (но многое)."}`, quiet: true });
      try { localStorage.setItem(LKEY, JSON.stringify(Object.assign({}, L, { pending: false }))); L.pending = false; } catch (e) {}
    }
  }
  let ensureQ = false;
  const needEnsure = (s) => s.profile && (!(s.mail && s.mail.list && s.mail.list.some((x) => x.id === "grandpa")) || (L && L.pending && !s.legacyApplied && s.game));
  Vibe.state.on((s) => { if (!ensureQ && !resetting && needEnsure(s)) { ensureQ = true; setTimeout(() => { ensureQ = false; ensure(); }, 1500); } });
  setTimeout(() => { if (needEnsure(S())) ensure(); }, 1200);

  /* ================= Финалы ================= */
  const ENDINGS = {
    top: { t: "Топ-менеджер", e: "👔", legend: true, d: "Дорос до директора. Корпорация гордится. Совет директоров — тоже немного.", hint: "Дорасти до 6-го уровня должности" },
    celeb: { t: "Селеба", e: "🌟", legend: true, d: "Тебя узнают на улицах Vibe City. Даже курьер Тимур просит селфи.", hint: "Максимальная слава в Vibegram" },
    rich: { t: "Миллионер", e: "💎", legend: true, d: "10 000 000 ₫ на карте. Кэшбек наконец-то заметен.", hint: "Накопить 10 000 000 ₫" },
    soul: { t: "Душа компании", e: "🫶", legend: true, d: "Пятеро людей любят тебя на все десять сердечек. Это дороже любого кэшбека.", hint: "10 сердечек с пятью людьми" },
    bankrupt: { t: "Банкротство", e: "💀", d: "Коллекторы передают привет. Корпорация — тоже: «Мы всегда рядом».", hint: "Уйти в глубокий минус надолго" },
    valley: { t: "Долина", e: "🌾", d: "Там нет кэшбека, зато есть тишина.", hint: "Есть письмо, которое стоит открыть. Когда-нибудь" },
    legend: { t: "Легенда Vibe City", e: "👑", d: "" },
  };
  const LEGENDS = ["top", "celeb", "rich", "soul"];
  const COND = {
    top: (s) => !!s.job && (s.job.level || 0) >= 6,
    celeb: () => !!(Vibe.gram && Vibe.gram.fame && Vibe.gram.fame() >= 100),
    rich: (s) => s.balance >= 10000000,
    soul: () => !!(Vibe.chars && Vibe.chars.list && Vibe.chars.hearts && Vibe.chars.list().filter((c) => Vibe.chars.hearts(c.id) >= 10).length >= 5),
  };
  const E = () => S().endings || {};
  const setE = (p) => set({ endings: Object.assign({}, E(), p) });
  const seenList = () => S().endingsSeen || [];
  const markSeen = (id) => { if (!seenList().includes(id)) set({ endingsSeen: [...seenList(), id] }); };
  const onEnding = (k) => !!(Vibe.current && Vibe.current.route.name === "ending" && (!k || (Vibe.current.route.params || {}).kind === k));
  function debtImpossible(s) {
    const loans = s.loans || [];
    if (!loans.length || s.balance >= -100000) return false;
    const monthly = loans.reduce((a, l) => a + (l.monthly || 0), 0);
    const net = s.job ? s.job.salary * 0.87 : 0;
    return monthly > net;
  }

  function summarize(kind) {
    const s = S();
    const info = live() ? Vibe.game.info() : { day: 0 };
    let rel = [];
    try {
      if (Vibe.chars && Vibe.chars.list && Vibe.chars.hearts) rel = Vibe.chars.list().map((c) => ({ n: c.n, e: c.e, h: Vibe.chars.hearts(c.id) }));
      else if (Vibe.people) rel = Object.values(Vibe.people.all()).map((p) => ({ n: p.n, e: p.e, h: Math.round((p.rel || 0) / 10) }));
    } catch (e) {}
    rel = rel.filter((r) => r.h > 0).sort((a, b) => b.h - a.h).slice(0, 6);
    const st = s.stats || {};
    const ach = s.achievements || [];
    return {
      kind, name: s.name || "Житель", avatar: (s.profile && s.profile.avatar) || "🙂", days: info.day + 1, balance: Math.round(s.balance), vibiki: s.vibiki || 0, level: s.level || 1,
      job: s.job ? `${Vibe.game.jobTitle(s.job)} · ${s.job.company}` : null, home: s.home ? s.home.title : null, rel,
      ach: ach.length, achE: ach.map((id) => (Vibe.ACH[id] || {}).e).filter(Boolean).slice(0, 10).join(""),
      tasks: st.tasks || 0, salaries: st.salaries || 0, promotions: st.promotions || 0, loans: (s.loans || []).length, spent: s.spent || 0,
      subs: Vibe.subs ? Vibe.subs.list().length : 0, endings: seenList().slice(), at: Date.now(),
    };
  }
  function legacyBonus(kind, s = S()) {
    const pos = Math.max(0, s.balance);
    const b = kind === "bankrupt" ? 3000 : kind === "valley" ? 10000 + clamp(pos * 0.05, 0, 40000) : 20000 + clamp(pos * 0.01, 0, 80000);
    return Math.round(b / 100) * 100;
  }
  function newLife(kind) {
    if (resetting) return;
    const sum = summarize(kind);
    const bonus = legacyBonus(kind);
    const prev = L || {};
    const rec = { lives: (prev.lives || 0) + 1, last: sum, bonus, pending: true, history: [sum, ...(prev.history || [])].slice(0, 8) };
    try { localStorage.setItem(LKEY, JSON.stringify(rec)); } catch (e) {}
    resetting = true;
    document.body.classList.add("ve-fadeout");
    setTimeout(() => Vibe.state.reset(), 650);
  }

  function legendModal(id) {
    const en = ENDINGS[id];
    FX.confetti(); setTimeout(() => FX.confetti({ count: 90 }), 500);
    Vibe.modal(`<div class="badge" style="background:var(--yellow)">👑 Финал открыт</div>
      <div class="m-emo float" style="margin-top:8px">${en.e}</div>
      <div class="display" style="font-size:28px">Легенда Vibe City!</div>
      <p>Путь «${en.t}». ${en.d}</p>
      <div style="display:grid;gap:10px"><button class="btn grad block" data-see>🎬 Смотреть финал</button><button class="btn block" data-close>Продолжить жизнь</button></div>
      <div class="fine">Финалы можно пересмотреть в Vibe Почте. Жизнь при этом не заканчивается. Корпорация бы не позволила.</div>`, {
      sound: "none",
      onMount(m, cl) { m.querySelector("[data-see]").addEventListener("click", () => { cl(); FX.sound.levelup(); Vibe.go("ending", { kind: id }); }); },
    });
  }

  const endings = (Vibe.endings = {
    LIST: ENDINGS, LEGENDS,
    seen: seenList,
    legacy: () => L,
    summary: summarize,
    newLife,
    check() {
      const s = S();
      if (resetting || !live() || document.hidden) return;
      const en = E();
      if (en.forced) { if (!onEnding(en.forced)) Vibe.go("ending", { kind: en.forced }); return; }
      // Легенда: по одному пути за раз, когда нет открытых окон
      if (!document.querySelector(".modal, .sheet")) {
        for (const id of LEGENDS) {
          let ok = false;
          try { ok = COND[id](s); } catch (e) { ok = false; }
          if (ok && !seenList().includes(id)) {
            markSeen(id);
            send({ id: `legend_${id}`, kind: "official", from: "Корпорация Vibe", fe: "👑", subject: `Дорогая семья Vibe! У нас новая Легенда: ${ENDINGS[id].t}`, body: `Дорогая семья Vibe!\n\n${s.name || "Наш житель"} стал Легендой Vibe City. Путь: «${ENDINGS[id].t}».\n\nМы всегда в тебя верили. Особенно после того, как ты начал приносить нам прибыль.`, action: { label: "🎬 Смотреть финал", ending: id }, quiet: true });
            legendModal(id);
            break;
          }
        }
      }
      // Банкротство: глубокий минус или неподъёмные долги 7 игровых дней подряд
      const day = nowDay();
      const doom = s.balance <= -300000 || debtImpossible(s);
      if (doom) {
        if (en.doomSince == null) {
          setE({ doomSince: day, warned2: false });
          send({ id: `doom${day}`, kind: "official", from: "Агентство «Добрые люди»", fe: "🦈", subject: "Уведомление о начале процедуры банкротства", body: `Здравствуйте!\n\nВаш баланс ${rub(s.balance)}${debtImpossible(s) ? ", а платежи по кредитам больше дохода" : ""}. Если за 7 дней ничего не изменится — начнём процедуру банкротства.\n\nМы очень добрые люди. Пока.`, action: [{ label: "💼 Срочно работать", go: "job" }, { label: "🚲 Подработка", go: "gig" }] });
        } else if (day - en.doomSince >= 7) {
          endings.bankrupt();
        } else if (day - en.doomSince >= 4 && !en.warned2) {
          setE({ warned2: true });
          send({ id: `doom2_${day}`, kind: "official", from: "Агентство «Добрые люди»", fe: "🦈", subject: `Осталось ${7 - (day - en.doomSince)} ${plural(7 - (day - en.doomSince), "день", "дня", "дней")} до банкротства`, body: "Мы уже выехали. Не к вам — просто покататься. Но рядом.\n\nВыход из минуса до −300 000 ₫ остановит процедуру." });
          FX.toast("До банкротства осталось совсем чуть-чуть. Загляни в почту", "🦈", 4000);
        }
      } else if (en.doomSince != null) {
        setE({ doomSince: null, warned2: false });
        send({ id: `undoom${day}`, kind: "official", from: "Агентство «Добрые люди»", fe: "🦈", subject: "Процедура банкротства остановлена", body: "Вы выбрались. Мы рады. Нет, правда. Немного жаль, но рады.\n\nУвидимся!" });
      }
    },
    bankrupt() {
      setE({ forced: "bankrupt" });
      markSeen("bankrupt");
      Vibe.go("ending", { kind: "bankrupt" });
    },
    valley() {
      setE({ forced: "valley" });
      markSeen("valley");
      FX.sound.success();
      Vibe.go("ending", { kind: "valley" });
    },
  });
  setInterval(() => { try { endings.check(); } catch (e) { console.error(e); } }, 10000);

  /* ================= Экран: Vibe Почта ================= */
  let curTab = "inbox";
  const fmtBody = (t) => esc(t).split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  const preview = (t) => esc(String(t).replace(/\s+/g, " ").slice(0, 70)) + (String(t).length > 70 ? "…" : "");
  const when = (l) => (l.day === nowDay() && l.time ? l.time : dateOf(l.day || 0));

  function itemHTML(l) {
    const k = KINDS[l.kind] || KINDS.personal;
    return `<button class="vm-item tap ${l.read ? "" : "unread"}" data-open="${esc(l.id)}">
      <div class="vm-ic ${k.c}">${esc(l.fe)}</div>
      <div class="vm-tx">
        <div class="vm-row"><b>${esc(l.from)}</b><small>${when(l)}</small></div>
        <div class="vm-subj">${esc(l.subject)}</div>
        <div class="vm-prev">${preview(l.body)}</div>
      </div>
      ${l.read ? "" : `<i class="vm-dot"></i>`}${l.done && (l.action || []).some((a) => !a.go) ? `<span class="vm-done">✓</span>` : ""}
    </button>`;
  }
  function grandpaHTML(l) {
    return `<button class="vm-gp tap ${l.sealed ? "sealed" : ""}" data-gp>
      <div class="vm-gp-env">${l.sealed ? "✉️" : "📜"}${l.sealed ? `<span class="vm-gp-seal">Д</span>` : ""}</div>
      <div class="vm-tx"><div class="vm-row"><b>📌 Дедушка</b><small>${l.sealed ? "запечатано" : "прочитано"}</small></div>
      <div class="vm-subj">${esc(l.subject)}</div><div class="vm-prev">${l.sealed ? "Почерк деда. Конверт пахнет сеном." : "Там нет кэшбека, зато есть тишина."}</div></div>
    </button>`;
  }
  function bodyHTML() {
    const items = list(curTab);
    const gp = curTab === "inbox" ? get("grandpa") : null;
    const rest = items.filter((x) => x.id !== "grandpa");
    const seenN = seenList().length;
    return `
      <div class="chips vm-tabs">${TABS.map((t) => { const n = unread(t.id); return `<button class="chip ${t.id === curTab ? "on" : ""}" data-tab="${t.id}">${t.e} ${t.t}${n ? `<span class="vm-cnt">${n}</span>` : ""}</button>`; }).join("")}</div>
      ${curTab === "spam" && rest.length ? `<div class="vm-note c-coral">🛡️ Не плати незнакомцам. Даже если они принцы.</div>` : ""}
      <div class="vm-list stagger">
        ${gp ? grandpaHTML(gp) : ""}
        ${rest.length ? rest.map(itemHTML).join("") : `<div class="card vm-empty"><div class="emo float" style="font-size:64px">${curTab === "spam" ? "🧹" : "📭"}</div><b>${curTab === "spam" ? "Спама нет. Подозрительно." : "Пусто. Письма придут с ходом жизни."}</b><div class="muted">Банк, Госвайб, HR и мама уже пишут.</div></div>`}
      </div>
      <button class="card tap vm-end" data-go="ending"><span style="font-size:32px">🏁</span><div style="flex:1;text-align:left"><b>Финалы жизни</b><div class="muted" style="font-size:12px;font-weight:700">Открыто в этой жизни: ${seenN} из 6${lives() ? ` · прожито жизней: ${lives()}` : ""}</div></div><span style="font-size:20px">→</span></button>
      <div class="fine">Vibe Почта читает ваши письма, чтобы подбирать персональные предложения. Вы ведь не против? Вы согласились в пункте 3.14.</div>`;
  }

  function openLetter(id) {
    const l = get(id);
    if (!l) return;
    if (id === "grandpa") return openGrandpa();
    if (!l.read) {
      patch(id, { read: true });
      if (l.meta && l.meta.mom && Vibe.people) Vibe.people.rel("mom", 1);
    }
    const k = KINDS[l.kind] || KINDS.personal;
    const acts = l.action || [];
    Vibe.ui.sheet(`
      <div class="vm-sh-head"><div class="vm-ic ${k.c}" style="width:52px;height:52px;font-size:26px">${esc(l.fe)}</div>
        <div style="flex:1;min-width:0"><b style="font-size:16px">${esc(l.from)}</b><div class="muted" style="font-size:12px;font-weight:700">${k.t} · ${when(l)}</div></div></div>
      <div class="display" style="font-size:22px;margin:12px 0 8px">${esc(l.subject)}</div>
      <div class="vm-body ${l.kind === "spam" ? "spam" : ""}">${fmtBody(l.body)}</div>
      ${acts.length ? `<div class="vm-acts">${acts.map((a, i) => `<button class="btn ${i ? "" : l.kind === "spam" ? "pink" : "black"} block" data-act-i="${i}" ${l.done && !a.go && !a.ending ? "disabled" : ""}>${l.done && !a.go && !a.ending ? "✓ Готово" : esc(a.label || "Открыть")}</button>`).join("")}</div>` : ""}
      <div class="vm-foot">
        ${l.kind === "spam" ? `<button class="btn sm" data-unsub-spam>🚫 Отписаться</button>` : ""}
        <button class="btn sm" data-del>🗑 Удалить</button>
        <button class="btn sm" data-close>Закрыть</button>
      </div>`, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          const b = e.target.closest("[data-act-i]");
          if (b) { runAction(get(id) || l, +b.dataset.actI, b, close); return; }
          if (e.target.closest("[data-del]")) { remove(id); close(); FX.toast("Письмо удалено. Копия сохранена. Навсегда", "🗑️"); return; }
          if (e.target.closest("[data-unsub-spam]")) { remove(id); close(); FX.toast("Вы отписались. И подписались на 3 новые рассылки", "📨", 3000); }
        });
      },
    });
  }

  Vibe.screen("mail", {
    render(p) {
      if (p.tab && TABS.some((t) => t.id === p.tab)) curTab = p.tab;
      const n = unread();
      return `<div class="vm">
        ${Vibe.ui.head("Vibe Почта", n ? `📬 ${n} ${plural(n, "новое", "новых", "новых")}` : "всё прочитано", `<button class="icon-btn" data-readall aria-label="Прочитать всё">✓</button>`)}
        <div class="hero c-sky vm-hero"><div class="display" style="font-size:30px">Почта</div><p>Банк, Госвайб, работа, мама и один очень щедрый принц.</p><div class="hero-emo emo float">📬</div></div>
        <div data-vm-body>${bodyHTML()}</div>
      </div>`;
    },
    mount(el, p) {
      const box = el.querySelector("[data-vm-body]");
      let t = null;
      const redraw = () => {
        clearTimeout(t);
        t = setTimeout(() => {
          box.innerHTML = bodyHTML();
          box.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 8))));
          const n = unread();
          const sm = el.querySelector(".head .title small");
          if (sm) { const first = sm.firstChild; if (first && first.nodeType === 3) first.textContent = (n ? `📬 ${n} ${plural(n, "новое", "новых", "новых")}` : "всё прочитано") + " · "; }
        }, 60);
      };
      const off = Vibe.on("mail", redraw);
      // Конверт деда замечен — больше не горит как непрочитанный
      const gp = get("grandpa");
      if (gp && !gp.read) setTimeout(() => patch("grandpa", { read: true }), 1500);
      el.addEventListener("click", (e) => {
        const tb = e.target.closest("[data-tab]");
        if (tb) { curTab = tb.dataset.tab; FX.bump && FX.bump(tb); redraw(); return; }
        if (e.target.closest("[data-gp]")) { openGrandpa(); return; }
        const o = e.target.closest("[data-open]");
        if (o) { openLetter(o.dataset.open); return; }
        const ra = e.target.closest("[data-readall]");
        if (ra) {
          const n = unread(curTab);
          if (!n) return FX.toast("Тут всё прочитано", "📭");
          saveM({ list: M().list.map((x) => (TABS.find((t2) => t2.id === curTab).f(x) && x.id !== "grandpa" ? Object.assign({}, x, { read: true }) : x)) });
          Vibe.emit("mail", {});
          FX.burst(ra, { emojis: ["✅", "📭", "✨"], count: 10 });
          FX.sound.pop();
        }
      });
      return () => { off(); clearTimeout(t); };
    },
  });

  /* ================= Экран: финал ================= */
  function relHTML(rel) {
    if (!rel || !rel.length) return `<div class="muted" style="font-weight:700">Близких не нажил. Зато подписок — много.</div>`;
    return rel.map((r) => `<div class="ve-rel"><span>${esc(r.e || "🙂")}</span><b>${esc(r.n || "")}</b><i>${"❤️".repeat(Math.min(10, Math.round(r.h)))}${"🤍".repeat(Math.max(0, 10 - Math.round(r.h)))}</i></div>`).join("");
  }
  function statsHTML(sm) {
    const cells = [
      ["📅", sm.days, plural(sm.days, "день прожит", "дня прожито", "дней прожито")],
      ["💰", rub(sm.balance), "на карте"],
      ["🪙", Vibe.fmt(sm.vibiki), "вайбиков"],
      ["⭐", sm.level, "уровень"],
      ["📋", sm.tasks, "задач закрыто"],
      ["🏆", sm.ach, "достижений"],
    ];
    return `<div class="ve-grid stagger">${cells.map((c) => `<div class="card tight ve-cell"><span>${c[0]}</span><b>${c[1]}</b><small>${c[2]}</small></div>`).join("")}</div>`;
  }
  function creditsHTML(sm, kind) {
    const lines = [
      ["В главной роли", `${sm.avatar} ${sm.name}`],
      ["Прожито", `${sm.days} ${plural(sm.days, "день", "дня", "дней")}`],
      ["Работа", sm.job || "в поиске себя"],
      ["Жильё", sm.home || "где придётся"],
      ["Зарплат получено", sm.salaries],
      ["Повышений", sm.promotions],
      ["Потрачено", rub(sm.spent)],
      ["Подписок", sm.subs],
      ["Достижения", sm.achE || "—"],
      ...sm.rel.slice(0, 4).map((r) => [r.n, `${"❤️".repeat(Math.max(1, Math.min(5, Math.round(r.h / 2))))}`]),
      ["Кэшбек", "0,001%, как и обещали"],
      ["Вайбот", "всё записал 📝"],
      [kind === "valley" ? "Куры" : kind === "bankrupt" ? "Коллекторы" : "Корпорация Vibe", kind === "valley" ? "в главных ролях 🐔" : kind === "bankrupt" ? "добрые люди 🦈" : "благодарит за лояльность 💜"],
    ];
    return `<div class="ve-roll"><div class="ve-roll-in">${lines.map((l) => `<div class="ve-cr"><small>${esc(l[0])}</small><b>${esc(String(l[1]))}</b></div>`).join("")}<div class="ve-cr"><b class="display" style="font-size:28px">${kind === "valley" ? "Конец?" : kind === "bankrupt" ? "Ну вот, опять" : "Продолжение следует"}</b></div></div></div>`;
  }
  function galleryHTML() {
    const seen = seenList();
    const past = ((L && L.history) || []).map((h) => h.kind);
    return `${Vibe.ui.head("Финалы жизни", `${seen.length} из 6`)}
      <div class="hero c-holo"><div class="display" style="font-size:30px">Чем закончится<br>эта жизнь?</div><p>Стань легендой. Или обанкроться. Или… есть третий путь.</p><div class="hero-emo emo float">🏁</div></div>
      <div class="ve-gal stagger">${["top", "celeb", "rich", "soul", "bankrupt", "valley"].map((id) => {
        const en = ENDINGS[id];
        const ok = seen.includes(id);
        const was = past.includes(id) || (id !== "valley" && id !== "bankrupt" && past.includes("legend"));
        return `<button class="card tight tap ve-gi ${ok ? "on" : ""}" ${ok && en.legend ? `data-go="ending" data-params='{"kind":"${id}"}'` : ""}>
          <span class="ve-gi-e">${ok ? en.e : "❔"}</span><div style="flex:1;text-align:left"><b>${en.legend ? "Легенда · " : ""}${ok || id !== "valley" ? en.t : "???"}</b>
          <div class="muted" style="font-size:12px;font-weight:700">${ok ? en.d : en.hint}${was && !ok ? " · было в прошлой жизни" : ""}</div></div>${ok ? "✅" : "🔒"}</button>`;
      }).join("")}</div>
      ${lives() ? `<div class="card" style="margin-top:14px"><b>Прошлые жизни: ${lives()}</b><div class="muted" style="font-weight:700;font-size:13px;margin-top:6px">${((L && L.history) || []).slice(0, 5).map((h, i) => `${i + 1}. ${esc(h.avatar || "")} ${esc(h.name || "")} — ${h.days} дн., «${esc((ENDINGS[h.kind] || ENDINGS.legend).t)}»`).join("<br>")}</div></div>` : ""}
      <div class="fine">Финалы не заканчивают жизнь, кроме двух. Каких — догадайся сам.</div>`;
  }

  Vibe.screen("ending", {
    render(p) {
      const kind = p.kind || "";
      const en = ENDINGS[kind];
      const forced = E().forced;
      const valid = en && (forced === kind || (en.legend && seenList().includes(kind)));
      if (!valid) return galleryHTML();
      const sm = summarize(kind === "valley" || kind === "bankrupt" ? kind : "legend");
      const bonus = legacyBonus(kind === "valley" || kind === "bankrupt" ? kind : "legend");
      if (kind === "valley") {
        return `<div class="ve ve-valley">
          <div class="ve-farm">
            <span class="ve-sun">🌞</span><span class="ve-cloud c1">☁️</span><span class="ve-cloud c2">☁️</span>
            <span class="ve-hill"></span>
            <span class="ve-house">🏡</span><span class="ve-tree t1">🌳</span><span class="ve-tree t2">🌲</span><span class="ve-cow">🐄</span><span class="ve-hen">🐔</span>
            <div class="ve-crops">🌾🌻🌾🥕🌾🌽🌾🌻🌾</div>
          </div>
          <div class="display ve-title">Долина</div>
          <p class="ve-sub">${esc(sm.name)} уехал. Без уведомлений. Без кэшбека. Курицы не ставят дедлайнов.</p>
          ${creditsHTML(sm, "valley")}
          ${statsHTML(sm)}
          <div class="card" style="margin-top:12px"><b>Кого ты оставил в городе</b><div style="margin-top:8px">${relHTML(sm.rel)}</div></div>
          <div class="card c-lime" style="margin-top:12px;text-align:center"><b>📜 Наследство для новой жизни: ${rub(bonus)}</b><div style="font-size:12px;font-weight:700;margin-top:4px">+ вайбики и письмо от тебя самого</div></div>
          <button class="btn black xl block" style="margin-top:16px" data-newlife="valley">🌱 Начать новую жизнь</button>
          <div class="fine">«Там нет кэшбека, зато есть тишина». — Дедушка</div>
        </div>`;
      }
      if (kind === "bankrupt") {
        return `<div class="ve ve-bank">
          <div class="ve-wasted">ТЫ ОБАНКРОТИЛСЯ</div>
          <div class="ve-bank-emo"><span>💸</span><span>📉</span><span>🦈</span><span>🏦</span></div>
          <p class="ve-sub">Баланс ${rub(sm.balance)}. Коллекторы передают привет. Корпорация — тоже: «Мы всегда рядом. Особенно сейчас».</p>
          ${creditsHTML(sm, "bankrupt")}
          ${statsHTML(sm)}
          <div class="card" style="margin-top:12px"><b>Кто остался рядом</b><div style="margin-top:8px">${relHTML(sm.rel)}</div></div>
          <div class="card c-yellow" style="margin-top:12px;text-align:center"><b>📜 Наследство: ${rub(bonus)}</b><div style="font-size:12px;font-weight:700;margin-top:4px">Мама опять перевела. «Не трать всё сразу»</div></div>
          <button class="btn lime xl block" style="margin-top:16px" data-newlife="bankrupt">🔁 Ну вот, опять</button>
          <div class="fine" style="color:#aaa">Банкротство — это не конец. Это новая жизнь с тем же кредитным рейтингом (шутка, с чистым).</div>
        </div>`;
      }
      return `<div class="ve ve-legend">
        ${Vibe.ui.head("Финал", "Легенда Vibe City")}
        <div class="hero c-holo ve-lhero"><div class="badge" style="background:#fff">${en.e} Путь: ${en.t}</div><div class="display" style="font-size:34px;margin-top:10px">Легенда<br>Vibe City</div><p>${en.d}</p><div class="hero-emo emo float">👑</div></div>
        <div class="ve-city"><span>🏙️</span><span class="ve-fw f1">🎆</span><span class="ve-fw f2">🎇</span><span>🌃</span><span class="ve-fw f3">✨</span><span>🏢</span></div>
        ${creditsHTML(sm, "legend")}
        ${statsHTML(sm)}
        <div class="card" style="margin-top:12px"><b>Твои люди</b><div style="margin-top:8px">${relHTML(sm.rel)}</div></div>
        <div style="display:grid;gap:10px;margin-top:16px">
          <button class="btn black xl block" data-continue>💜 Продолжить жизнь</button>
          <button class="btn block" data-newlife="legend">🌱 Начать новую жизнь (наследство ${rub(bonus)})</button>
        </div>
        <div class="fine">Легенды не уходят на пенсию. Пенсию отменили в пункте 7.2 оферты.</div>
      </div>`;
    },
    mount(el, p) {
      const kind = p.kind || "";
      const timers = [];
      const forced = E().forced;
      if (kind === "valley" && forced === "valley") { el.classList.add("ve-scr-valley"); }
      if (kind === "bankrupt" && forced === "bankrupt") { el.classList.add("ve-scr-bank"); FX.haptic([40, 60, 40]); }
      if (ENDINGS[kind] && ENDINGS[kind].legend && seenList().includes(kind)) {
        timers.push(setTimeout(() => FX.confetti(), 300), setTimeout(() => FX.confetti({ count: 90 }), 1400));
      }
      if (kind === "valley" && forced === "valley") timers.push(setTimeout(() => FX.burst({ x: innerWidth / 2, y: 160 }, { emojis: ["🌾", "🍃", "🌻", "🐔"], count: 16 }), 700));
      el.addEventListener("click", (e) => {
        const nl = e.target.closest("[data-newlife]");
        if (nl) {
          const k = nl.dataset.newlife;
          if (k === "legend") {
            Vibe.modal(`<div class="m-emo float">🌱</div><div class="display" style="font-size:26px">Начать заново?</div><p>Эта жизнь закончится. В новую перейдёт наследство ${rub(legacyBonus("legend"))} и письмо от тебя самого.</p>
              <div style="display:grid;gap:10px"><button class="btn black block" data-yes>Новая жизнь</button><button class="btn block" data-close>Остаться легендой</button></div>`, {
              sound: "pop", onMount(m, cl) { m.querySelector("[data-yes]").addEventListener("click", () => { cl(); FX.sound.levelup(); newLife("legend"); }); },
            });
          } else { FX.sound.levelup(); FX.confetti(); newLife(k); }
          return;
        }
        if (e.target.closest("[data-continue]")) { FX.sound.success(); Vibe.resetTo("home"); }
      });
      return () => timers.forEach(clearTimeout);
    },
  });

  /* ================= API почты ================= */
  Vibe.mail = { send, unread, list, get, read: (id) => patch(id, { read: true }), remove, open: openLetter, openGrandpa, KINDS, TABS };

  /* ================= Стили ================= */
  const css = `
  .vm-hero { min-height: 150px; }
  .vm-tabs .chip { position: relative; }
  .vm-cnt { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: var(--pink); color: var(--ink); border: 2px solid var(--ink); font-size: 11px; font-weight: 900; display: inline-grid; place-items: center; margin-left: 2px; }
  .chip.on .vm-cnt { border-color: #fff; }
  .vm-list { display: grid; gap: 10px; margin-top: 8px; }
  .vm-item, .vm-gp { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: var(--paper); border: var(--line); border-radius: 22px; padding: 12px; box-shadow: var(--shadow-sm); position: relative; min-width: 0; }
  .vm-item.unread { background: #fff9d9; }
  .vm-item.unread .vm-subj { font-weight: 900; }
  .vm-ic { width: 46px; height: 46px; border-radius: 15px; border: 2px solid var(--ink); display: grid; place-items: center; font-size: 22px; flex: 0 0 auto; }
  .vm-tx { flex: 1; min-width: 0; }
  .vm-row { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
  .vm-row b { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vm-row small { font-size: 11px; font-weight: 800; color: var(--muted); white-space: nowrap; }
  .vm-subj { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .vm-prev { font-size: 12px; color: var(--muted); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .vm-dot { position: absolute; top: -5px; right: -5px; width: 16px; height: 16px; border-radius: 50%; background: var(--pink); border: 2px solid var(--ink); animation: badge-bounce 2.4s var(--spring) infinite; }
  .vm-done { position: absolute; bottom: 8px; right: 10px; font-weight: 900; color: #12a150; font-size: 13px; }
  .vm-gp { background: #fdf1d6; border-style: dashed; }
  .vm-gp.sealed { background: linear-gradient(135deg, #fdf1d6, #f5deb0); border-style: solid; animation: vm-glow 2.6s ease-in-out infinite; }
  @keyframes vm-glow { 50% { box-shadow: 0 3px 0 var(--ink), 0 0 0 5px rgba(255,181,71,.45); } }
  .vm-gp-env { width: 50px; height: 50px; font-size: 34px; display: grid; place-items: center; position: relative; flex: 0 0 auto; }
  .vm-gp-seal { position: absolute; right: -2px; bottom: 0; width: 22px; height: 22px; border-radius: 50%; background: #c62828; color: #fff; border: 2px solid var(--ink); font: 900 11px/18px var(--font); text-align: center; }
  .vm-note { border: var(--line); border-radius: 16px; padding: 10px 12px; font-weight: 800; font-size: 13px; margin-top: 6px; }
  .vm-empty { text-align: center; display: grid; gap: 6px; justify-items: center; padding: 22px 16px; }
  .vm-end { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 16px; }
  .vm-sh-head { display: flex; gap: 12px; align-items: center; }
  .vm-body { background: var(--paper); border: var(--line); border-radius: 20px; padding: 14px; font-weight: 600; font-size: 14px; line-height: 1.5; }
  .vm-body p + p { margin-top: 10px; }
  .vm-body.spam { background: repeating-linear-gradient(45deg, #fff, #fff 12px, #fff3f3 12px, #fff3f3 24px); }
  .vm-acts { display: grid; gap: 10px; margin-top: 14px; }
  .vm-acts .btn { white-space: normal; height: auto; min-height: 52px; padding: 10px 16px; }
  .vm-foot { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
  .vm-paper { text-align: left; background: #fdf6e3; border: 2px solid var(--ink); border-radius: 14px; padding: 16px 16px 18px; font-family: Georgia, "Times New Roman", serif; font-style: italic; font-size: 15px; line-height: 1.5; color: #3b2f1e; max-height: 52dvh; overflow-y: auto; background-image: repeating-linear-gradient(transparent, transparent 23px, rgba(120,90,40,.12) 24px); animation: pop-in .6s var(--spring) both; }
  .vm-paper p + p { margin-top: 10px; }
  .vm-valley-btn { background: linear-gradient(135deg, #c6ff4d, #7cf5c8); }
  .vm-env { position: relative; width: 210px; height: 140px; margin: 4px auto 6px; background: #f5deb0; border: var(--line); border-radius: 10px; box-shadow: var(--shadow-sm); overflow: hidden; }
  .vm-env-flap { position: absolute; left: 0; right: 0; top: 0; height: 80px; background: #ecd09a; border-bottom: 2.5px solid var(--ink); clip-path: polygon(0 0, 100% 0, 50% 100%); transform-origin: top; transition: transform .7s var(--spring); }
  .vm-seal { position: absolute; left: 50%; top: 58px; width: 40px; height: 40px; margin-left: -20px; border-radius: 50%; background: #c62828; color: #fff; border: 2.5px solid var(--ink); display: grid; place-items: center; font-weight: 900; z-index: 2; transition: transform .5s var(--spring), opacity .4s; }
  .vm-env-txt { position: absolute; left: 0; right: 0; bottom: 10px; text-align: center; font: italic 12px/1.3 Georgia, serif; color: #5a4526; }
  .vm-env.open .vm-env-flap { transform: rotateX(180deg) translateY(-2px); }
  .vm-env.open .vm-seal { transform: scale(1.6) rotate(40deg); opacity: 0; }

  body.ve-fadeout #app { animation: ve-fade .6s ease forwards; }
  @keyframes ve-fade { to { opacity: 0; filter: blur(6px); } }
  .screen.ve-scr-bank { background: #0e0e12; color: #fff; }
  .screen.ve-scr-valley { background: linear-gradient(#ffe9b8, #fffbef 340px); }
  .ve-title { font-size: 44px; text-align: center; margin-top: 14px; }
  .ve-sub { text-align: center; font-weight: 700; margin: 8px 6px 14px; line-height: 1.45; }
  .ve-farm { position: relative; height: 230px; border: var(--line); border-radius: 26px; overflow: hidden; background: linear-gradient(#8fd8ff, #d9f4ff 60%); box-shadow: var(--shadow); }
  .ve-farm span { position: absolute; line-height: 1; }
  .ve-sun { font-size: 54px; left: 18px; top: 70px; animation: ve-rise 4s var(--out) forwards; }
  @keyframes ve-rise { to { top: 14px; } }
  .ve-cloud { font-size: 34px; top: 22px; animation: ve-drift 18s linear infinite; }
  .ve-cloud.c1 { left: -50px; } .ve-cloud.c2 { left: -50px; top: 56px; animation-delay: -9s; font-size: 26px; }
  @keyframes ve-drift { to { transform: translateX(460px); } }
  .ve-hill { left: -20%; right: -20%; bottom: -60px; height: 150px; border-radius: 50%; background: #9be36a; border-top: 2.5px solid var(--ink); }
  .ve-house { font-size: 64px; left: 50%; bottom: 60px; transform: translateX(-50%); }
  .ve-tree.t1 { font-size: 46px; left: 14px; bottom: 58px; } .ve-tree.t2 { font-size: 40px; right: 16px; bottom: 62px; }
  .ve-cow { font-size: 34px; right: 64px; bottom: 44px; animation: wobble 3s ease-in-out infinite; }
  .ve-hen { font-size: 26px; left: 30px; bottom: 34px; animation: ve-hen 7s ease-in-out infinite alternate; }
  @keyframes ve-hen { to { transform: translateX(110px) scaleX(-1); } }
  .ve-crops { position: absolute; left: 0; right: 0; bottom: 6px; text-align: center; font-size: 24px; letter-spacing: 2px; white-space: nowrap; overflow: hidden; }
  .ve-roll { height: 210px; overflow: hidden; border: var(--line); border-radius: 22px; background: var(--ink); color: #fff; position: relative; -webkit-mask-image: linear-gradient(transparent, #000 18%, #000 82%, transparent); mask-image: linear-gradient(transparent, #000 18%, #000 82%, transparent); }
  .ve-roll-in { animation: ve-roll 26s linear infinite; padding: 0 16px; }
  @keyframes ve-roll { from { transform: translateY(210px); } to { transform: translateY(-100%); } }
  .ve-cr { text-align: center; padding: 8px 0; }
  .ve-cr small { display: block; font-size: 11px; font-weight: 800; color: #b9b5c9; text-transform: uppercase; letter-spacing: 1px; }
  .ve-cr b { font-size: 16px; font-weight: 800; word-break: break-word; }
  .ve-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .ve-cell { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--ink); min-width: 0; }
  .ve-cell span { font-size: 22px; } .ve-cell b { font-family: var(--font-display); font-weight: 400; font-size: 14px; word-break: break-all; } .ve-cell small { font-size: 10px; font-weight: 800; color: var(--muted); }
  .ve-rel { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 14px; min-width: 0; color: var(--ink); }
  .ve-rel span { font-size: 22px; } .ve-rel b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .ve-rel i { font-style: normal; font-size: 9px; letter-spacing: -1px; white-space: nowrap; }
  .ve-bank .card { color: var(--ink); }
  .ve-wasted { font-family: var(--font-display); font-size: 40px; line-height: 1; text-align: center; color: #ff3b3b; margin: 50px 0 10px; text-shadow: 0 4px 0 #000, 0 0 30px rgba(255,59,59,.5); animation: ve-wasted 1.4s var(--spring) both; letter-spacing: -1px; }
  @keyframes ve-wasted { from { transform: scale(2.6); opacity: 0; filter: blur(8px); } }
  .ve-bank-emo { display: flex; justify-content: center; gap: 14px; font-size: 40px; filter: grayscale(1); margin: 10px 0; }
  .ve-bank-emo span { animation: float 3s ease-in-out infinite; } .ve-bank-emo span:nth-child(2n) { animation-delay: -1.5s; }
  .ve-bank .ve-sub { color: #ddd; }
  .ve-bank .ve-roll { border-color: #444; }
  .ve-lhero { min-height: 220px; }
  .ve-city { display: flex; justify-content: space-around; align-items: flex-end; font-size: 40px; margin: 14px 0; position: relative; }
  .ve-fw { animation: ve-fw 1.8s ease-out infinite; } .ve-fw.f2 { animation-delay: .6s; } .ve-fw.f3 { animation-delay: 1.2s; }
  @keyframes ve-fw { 0% { transform: scale(.2) translateY(30px); opacity: 0; } 40% { opacity: 1; } 100% { transform: scale(1.3) translateY(-20px); opacity: 0; } }
  .ve-gal { display: grid; gap: 10px; margin-top: 14px; }
  .ve-gi { display: flex; align-items: center; gap: 12px; width: 100%; }
  .ve-gi:not(.on) { opacity: .75; }
  .ve-gi.on { background: #fff9d9; }
  .ve-gi-e { font-size: 32px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
