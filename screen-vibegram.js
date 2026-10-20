/* ============================================================
   Vibegram — соцсеть Vibe: лента, сторис, рилсы, профили
   персонажей и звёзд, блог игрока (альбом игры), слава.
   Экраны: "gram" (tab), "gram-profile" (id), "reels" (i)
   API: Vibe.gram.post({e, text, kind, from, tags, s}), followers(), fame(), tier(), canDM()
   Состояние: S.gram = { base, posts[], drafts[], follow{}, liked{}, saved{}, myCm{}, seenSt{},
     relDay{}, tierMax, decayDay, dealDay, reelsSeen, reelLiked{}, lastPostDay }
   Все люди и блогеры вымышленные.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const esc = (s) => Vibe.esc(s == null ? "" : s);
  const fmt = (n) => Vibe.fmt(n);
  const money = (n) => (Vibe.rub ? Vibe.rub(n) : fmt(n) + " ₫");

  /* ---------- Утилиты ---------- */
  const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pickR = (r, a) => a[Math.floor(r() * a.length)];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nowMin = () => (Vibe.game ? Vibe.game.minutes() : Date.now() / 2500);
  const today = () => Math.floor(nowMin() / 1440);
  const hourNow = () => Math.floor((nowMin() % 1440) / 60);
  const kfmt = (n) => {
    n = Math.round(n);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".", ",").replace(",0", "") + " млн";
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(".", ",").replace(",0", "") + " тыс";
    return fmt(n);
  };
  const ago = (m) => { m = Math.max(0, Math.round(m)); if (m < 2) return "только что"; if (m < 60) return m + " мин"; if (m < 1440) return Math.floor(m / 60) + " ч"; return Math.floor(m / 1440) + " д"; };
  const app = () => document.getElementById("app") || document.body;

  /* ---------- Состояние ---------- */
  const DEF = { base: 0, posts: [], drafts: [], follow: { coach: true, meme: true, vibe: true }, liked: {}, saved: {}, myCm: {}, seenSt: {}, relDay: {}, tierMax: 0, decayDay: -1, dealDay: -1, reelsSeen: 0, reelLiked: {}, lastPostDay: -1, placeDay: {} };
  const G = () => Object.assign({}, DEF, S().gram || {});
  const setG = (patch) => Vibe.state.set({ gram: Object.assign(G(), typeof patch === "function" ? patch(G()) : patch) });

  /* ---------- Достижения Vibegram ---------- */
  if (Vibe.ACH) Object.assign(Vibe.ACH, {
    gram_first: { e: "📸", t: "Первый пост", d: "Опубликовал момент в Vibegram" },
    gram_1k: { e: "🌱", t: "Микроблогер", d: "1 000 подписчиков в Vibegram" },
    gram_10k: { e: "📣", t: "Блогер", d: "10 000 подписчиков" },
    gram_100k: { e: "💫", t: "Инфлюенсер", d: "100 000 подписчиков" },
    gram_1m: { e: "🌟", t: "Селеба", d: "1 000 000 подписчиков. Ты смог" },
    gram_reels: { e: "🌀", t: "Залип", d: "Посмотрел 50 рилсов подряд-ish" },
  });

  /* ---------- Лестница славы ---------- */
  const TIERS = [
    { n: "Никто", e: "🫥", at: 0, c: "c-white" },
    { n: "Микроблогер", e: "🌱", at: 1000, c: "c-mint", ach: "gram_1k" },
    { n: "Блогер", e: "📣", at: 10000, c: "c-yellow", ach: "gram_10k" },
    { n: "Инфлюенсер", e: "💫", at: 100000, c: "c-pink", ach: "gram_100k" },
    { n: "Селеба", e: "🌟", at: 1000000, c: "c-holo", ach: "gram_1m" },
  ];

  /* ---------- Фоны «фото» ---------- */
  const BG = [
    "linear-gradient(135deg,#ffe14d,#ff6bcb)", "linear-gradient(135deg,#8fd8ff,#8b5cff)", "linear-gradient(135deg,#c6ff4d,#7cf5c8)",
    "linear-gradient(135deg,#ff6b2c,#ffe14d)", "linear-gradient(160deg,#1b1640,#8b5cff 70%,#ff6bcb)", "linear-gradient(135deg,#d9c8ff,#8fd8ff)",
    "linear-gradient(135deg,#ff8a8a,#ffb547)", "linear-gradient(180deg,#0e0e12,#3d7bff)", "linear-gradient(135deg,#7cf5c8,#3d7bff)",
    "linear-gradient(135deg,#ff6bcb,#8b5cff)",
  ];
  const COLS = ["c-yellow", "c-pink", "c-lime", "c-mint", "c-sky", "c-lilac", "c-orange", "c-coral", "c-violet"];

  /* ---------- Звёзды (вымышленные) ---------- */
  const STARS = [
    { id: "coach", n: "Виталий · Успешный успех", e: "🧘‍♂️", handle: "@uspeshny_uspeh", followers: 5500000, col: "c-yellow", niche: "Мотивационный коуч Корпорации",
      bio: "Официальный коуч Корпорации «Успешный успех» 🏆 Выгорание — это просто недогорание. Марафон «Благодарность начальнику» — ссылка в шапке",
      posts: [["🏆", "💸✨📈", "Встал в 4:30. Поблагодарил начальника. Поблагодарил себя за то, что поблагодарил", "успешныйуспех мотивация утро"], ["🦁", "👔🔥💼", "Лев не просит отпуск. Лев берёт задачи", "мотивация корпорация"], ["🧘‍♂️", "🌅☕📓", "Медитация на KPI. 15 минут — и ты снова семья", "успешныйуспех осознанность"], ["📈", "🚀💪💼", "Если тебе тяжело — значит, ты растёшь. Если легко — бери ещё задачу", "мотивация рост"], ["🪜", "🏢✨🧗", "Карьерная лестница — это лестница. Лифт для слабых", "успешныйуспех карьера"]],
      story: ["Доброе утро, семья! 4:30 — лучшее время", "Сегодня марафон «Не выгорай, а сияй»", "Всего 49 990 ₫. Это инвестиция в себя 💸"],
      dm: ["Семья, вижу тебя! Ты на верном пути 🏆", "Скинул тебе ссылку на марафон. Для своих — скидка 3%", "Ты уже благодарил начальника сегодня? Начни с этого 🙏", "Успех любит тех, кто пишет звёздам в личку. Уважаю 💪"] },
    { id: "foodie", n: "Шеф Пельмень", e: "🍜", handle: "@chef_pelmen", followers: 2400000, col: "c-orange", niche: "Фуд-блогер",
      bio: "Готовлю ресторанную еду из того, что осталось до зарплаты 🥟 Обзоры доставок. Рецепты без сложных слов",
      posts: [["🥟", "🔥🧈🥢", "Пельмени за 3 часа до зарплаты. Ресторанный уровень", "рецепт еда доставка"], ["🍳", "🥓🍞☕", "Завтрак, который стоит как обед. Потому что это и есть обед", "завтрак еда"], ["🌯", "🌙🔥🧄", "Шаурма в 2 ночи — это не еда. Это терапия", "еда ночь"], ["🍜", "🥢🌶️🥚", "Рамен из пакета, но с душой и яйцом", "рецепт бюджетно"], ["🥗", "🥑🍅🫒", "Салат «Я начну с понедельника»", "пп еда"]],
      story: ["Обзор новой доставки Vibe Eat 🛵", "Курьер приехал за 7 минут. Я в шоке", "Доставка 0 ₫*. *Сбор за ноль — 199 ₫"],
      dm: ["О, привет! Держи секретный рецепт: всё вкуснее в 2 ночи 🌯", "Спасибо за поддержку, бро! Ешь горячее 🍜", "Записал тебя в дегустаторы. Шучу. Или нет 🥟"] },
    { id: "fit", n: "Фитоняша Кира", e: "🏋️‍♀️", handle: "@kira_fitnyasha", followers: 1800000, col: "c-lime", niche: "Фитнес-блогер",
      bio: "Тренер ✨ Марафон «Попа как орех за 30 дней» 🍑 Пью воду. Много воды. Ещё больше воды",
      posts: [["🏋️‍♀️", "💦🔥✨", "День 1 из 30. Приседаний. Не дней", "фитнес спорт мотивация"], ["🥤", "🥬🍌💚", "Смузи цвета болота. Вкус тоже. Но я сияю", "пп смузи"], ["🧘‍♀️", "🌿🕯️✨", "Растяжка после растяжки перед растяжкой", "йога спорт"], ["👟", "🏃‍♀️💨🌅", "10 км до работы. Потом такси обратно", "бег спорт"], ["💧", "💧💧💧", "Выпила 4 литра воды. Узнала всех в офисе по пути в туалет", "вода зож"]],
      story: ["Тренировка дня: 300 бёрпи 🔥", "Кто не сделал — не обижаюсь. Но запомнила", "Промокод KIRA — минус 5% на протеин"],
      dm: ["Привет, котик! Пей воду 💧", "Видела твою форму. Ну… есть куда расти! Записывайся 🍑", "Отвечаю только сильным. Ты сильный 💪"] },
    { id: "crypto", n: "Аркадий To The Moon", e: "🚀", handle: "@arkadiy_to_the_moon", followers: 3100000, col: "c-violet", niche: "Крипто-гуру",
      bio: "Финансовая свобода с 2017 года (почти) 🚀 Не финсовет. Но и не не финсовет. Закрытый канал — 9 990 ₫/мес",
      posts: [["🚀", "🌕📈💎", "Вайбкоин готовится к луне. Я готовлюсь к вайбкоину", "крипта инвестиции"], ["🐋", "🪙🌊📉", "Киты скупают. Мои надежды", "крипта рынок"], ["💎", "🙌💎🙌", "Алмазные руки. Пустой холодильник", "холд крипта"], ["📉", "🔥☕🫠", "Это не просадка. Это скидка на будущее", "инвестиции"], ["🐶", "🚀🪙😎", "Вложился в собачий коин. Теперь у меня собака", "мемкоин"]],
      story: ["Рынок красный — душа зелёная 💚", "Сигнал в закрытом канале через 5 минут", "Повторяю: это не финсовет 🚀"],
      dm: ["Брат, ты в теме. Держи альфу: покупай, когда все продают 🐋", "Финсвобода близко. Как луна — видно, но не дотянешься 🌕", "Миллионеры пишут миллионерам. Уважение 💎"] },
    { id: "travel", n: "Даша Везде", e: "✈️", handle: "@dasha_vezde", followers: 1200000, col: "c-sky", niche: "Тревел-блогер",
      bio: "Работаю удалённо отовсюду 🌍 47 стран, 0 отпусков. Гайды по городам — в закрепе",
      posts: [["🏝️", "☀️🥥💻", "Работаю удалённо с острова. Ноутбук в отеле, я в номере", "путешествия удалёнка"], ["✈️", "☁️🧳🥨", "Отпуск 5 дней. Из них 3 — в аэропорту", "путешествия аэропорт"], ["🏔️", "❄️🧗‍♀️📸", "Залезла ради одного кадра. Кадр получился. Ноги нет", "горы тревел"], ["🗼", "🥐☕🌧️", "Город мечты. Дождь мечты. Цены мечты", "европа тревел"], ["🏕️", "🌲🔥🦟", "Отдых на природе: природа отдыхает на мне", "кемпинг природа"]],
      story: ["Угадай, где я? 🌍", "Подсказка: тут нет созвонов", "Шучу, созвон через 5 минут 💻"],
      dm: ["Привет! Где ты сейчас? Я — везде ✈️", "Скинула гайд. Бесплатно, потому что ты крутой 🌍", "Встретимся в лаунже? 🥂"] },
    { id: "meme", n: "Мемный Пабличек", e: "🐸", handle: "@memny_pablik", followers: 7700000, col: "c-mint", niche: "Мем-паблик",
      bio: "Мемы про работу, жизнь и понедельники 🐸 Предложка открыта. Реклама — дорого",
      posts: [["🐸", "☕💼😩", "Я в понедельник в 9:00 на созвоне: «Меня слышно?»", "мемы работа"], ["🦆", "💼🚶", "Иду на работу, которая меня не ценит. Но ценит мою пунктуальность", "мемы офис"], ["🧑‍💻", "🔥🔥⏰", "«Небольшая правка» в 18:59 пятницы", "мемы дедлайн"], ["🐈", "📦✨", "Купил коту дом за 4 000 ₫. Кот выбрал коробку", "мемы коты"], ["😵‍💫", "📈📉📈", "Мой вайб в течение дня", "мемы жиза"]],
      story: ["Мем дня 🐸", "Лайк, если узнал себя", "Админ ушёл в отпуск (нет)"],
      dm: ["Отправили в предложку 🐸", "Админ на связи. Ты легенда, кстати", "Если ты селеба — давай коллаб 🔥"] },
    { id: "beauty", n: "Лена Глоу", e: "💄", handle: "@lena_glow", followers: 2900000, col: "c-pink", niche: "Бьюти-блогер",
      bio: "Уход, макияж, сияние ✨ Утренняя рутина 47 шагов. Коды на скидки в актуальном",
      posts: [["💄", "✨🪞💋", "Макияж «я проснулась такой». Шаг 1 из 47", "бьюти макияж"], ["🧴", "🫧💧✨", "Уход из 12 шагов. Пропустила один — начинай заново", "уход кожа"], ["💅", "💎✨🌸", "Маникюр стоит как мой холодильник. Холодильник, кстати, пустой", "маникюр бьюти"], ["🌸", "🧖‍♀️🕯️🛁", "Селф-кэр вечер: маска, ванна, тревога", "селфкэр"], ["✨", "🪞💫💖", "Сияю. Это хайлайтер или выгорание — не важно", "глоу"]],
      story: ["GRWM на созвон 💄", "Камеру всё равно никто не включает", "Но я готова ✨"],
      dm: ["Зайка, привет! Ты сияешь ✨", "Держи промокод GLOW — минус 7%. Только для своих 💖", "Обожаю твой стиль 💄"] },
    { id: "papa", n: "Папа Стас", e: "👨‍🍼", handle: "@papa_stas", followers: 900000, col: "c-coral", niche: "Папа-блогер",
      bio: "Отец троих. Сплю по 4 часа. Рассказываю, как не сойти с ума (пока не знаю) 👶",
      posts: [["👨‍🍼", "🍼🧸😴", "Ребёнок уснул в 3:00. Я тоже. В 3:01", "папа дети"], ["👶", "🥣🥄💥", "Кормление: уровень сложности Dark Souls", "родители"], ["🚗", "🧒⏰🗺️", "«Мы уже приехали?» — прошло 4 минуты", "дети семья"], ["🧸", "🏠🌀🧦", "Убрался. Через 7 секунд не убрался", "папа быт"], ["🎂", "🎈🧁🥳", "Детский праздник: дети счастливы, родители выжили", "семья праздник"]],
      story: ["Подъём в 5:40 🫠", "Кофе №3", "Кто-то нарисовал на обоях. Маркером. Навсегда"],
      dm: ["О, привет! Пишу одной рукой, второй держу младшего 👶", "Спасибо, что пишешь! Береги сон, пока он есть 😴", "Ты норм. Мы все норм. Наверное 👨‍🍼"] },
    { id: "vibe", n: "Vibe Official", e: "💜", handle: "@vibe", followers: 33000000, col: "c-lilac", niche: "Официальный аккаунт Корпорации", official: true,
      bio: "Мы — одна семья 💜 Всё для тебя. Подписка оформлена автоматически, потому что мы заботимся",
      posts: [["💜", "🤖✨💸", "Вайбот напоминает: кредит уже одобрен. Даже если ты не просил", "vibe забота"], ["🛍️", "🔥💸🛒", "Распродажа −90%*. *На то, что ты не купишь", "vibe скидки"], ["🏢", "💜👨‍👩‍👧🎉", "В Корпорации мы не коллеги. Мы семья. А из семьи не увольняются", "корпорация семья"]],
      story: ["Ты сегодня молодец 💜", "Мы гордимся тобой", "Кстати, у тебя 3 неоплаченных счёта"],
      dm: [] },
  ];

  /* ---------- Персонажи ---------- */
  const FALLBACK = [
    { id: "mom", n: "Мама", e: "👩", kind: "family", bio: "Мама. Пеку пироги, сажаю огурцы, жду звонка" },
    { id: "lyoha", n: "Лёха", e: "🧔", kind: "friend", bio: "Лучший друг. Геймер. Знаю шаурмичную в каждом районе" },
    { id: "katya", n: "Катя", e: "👩‍🎤", kind: "friend", bio: "Пою, рисую, опаздываю ✨" },
  ];
  const CP = {
    mom: [["🥧", "🍎🍂🏡", "Пирог по бабушкиному рецепту. Приезжай, пока тёплый", "дача рецепт"], ["🌻", "🥒🍅🪣", "Урожай! Огурцы как в магазине, только наши", "дача огород"], ["🧣", "🧶❄️💐", "Связала шарф. Догадайтесь кому 😉", "вязание забота"], ["🌷", "🌸🌼🌹", "Доброе утро! Хорошего дня всем 🌷🌷🌷", "доброеутро"], ["🐈", "🧶☀️🪴", "Барсик опять спит на рассаде", "кот дача"]],
    dad: [["🎣", "🌊🐟🛶", "Рыбалка. Рыбы нет. Тишина есть", "рыбалка"], ["🚗", "🔧🛢️😤", "Масло поменял сам. Сэкономил 3 000 ₫. Потратил выходные", "гараж"], ["⚽", "📺🍺🛋️", "Наши опять проиграли. Как и в 1998", "футбол"]],
    lyoha: [["🎮", "🍕🥤🌙", "«Только одна катка» — 6 часов назад", "геймер ночь"], ["🌯", "🔥🧄😋", "Нашёл лучшую шаурму в городе. Опять", "шаурма еда"], ["🍻", "🎉🕺🎶", "Пятница! Кто со мной?", "пятница друзья"], ["😴", "💻☕🫠", "Понедельник. Без комментариев", "понедельник"]],
    katya: [["🎸", "🎶✨🎤", "Репетиция. Соседи уже аплодируют (в стену)", "музыка"], ["🎨", "🖌️🌈☕", "Новая картина. Называется «Дедлайн»", "арт творчество"], ["🌙", "🕯️📖✨", "Вечер, свечи, книжка, тревога", "вечер вайб"], ["🛼", "🌇💨😎", "Ролики, закат, свобода", "ролики лето"]],
    family: [["🏡", "🌳☀️🧺", "Выходные на даче. Связи нет, счастья много", "семья дача"], ["🍲", "🥟🫖🍰", "Ждём всех на обед в воскресенье", "семья"]],
    friend: [["☕", "🥐📱✨", "Кофе и немного жизни", "утро кофе"], ["🌆", "🚶✨🎧", "Прогулка с музыкой — лучшая терапия", "прогулка"], ["🍕", "🎬🛋️🍿", "Пицца + фильм = идеальный вечер", "вечер"], ["🎉", "🥳🎈✨", "Лучшие люди — рядом", "друзья"]],
    date: [["🌹", "✨🕯️🍷", "Иногда просто хорошо", "вечер"], ["📚", "☕🌧️🍂", "Дождь, книжка, кофе", "осень"], ["🧘", "🌿✨🕊️", "Ищу баланс. Нашла только скидку на йогу", "йога"]],
    partner: [["💞", "🌅🫶✨", "С тобой даже понедельник ничего", "любовь"], ["🍝", "🕯️🍷💕", "Ужин на двоих", "вечер любовь"]],
  };
  const CHAR_CM = { mom: ["А шапка где?", "Красиво! Ты поел?", "Горжусь 💐💐💐", "Позвони маме"], dad: ["👍", "Нормально.", "Масло в машине проверил?"], lyoha: ["Красавчик 🔥", "Без меня?!", "Скинь в чат", "Ахахах"], katya: ["Вайб 💜", "Ахаха это ты?", "Пойдём туда в выходные!", "Красота ✨"] };
  const RAND_USERS = [["@sonya_vibe", "👧"], ["@max.nevyspalsya", "😪"], ["@kotik_ipoteka", "🐱"], ["@tanya_v_moment", "🌸"], ["@pasha_dedlain", "⏰"], ["@vibe_fan_2026", "💜"], ["@igor_na_udalenke", "💻"], ["@ksyu_kofe", "☕"], ["@grisha_bez_vyhodnyh", "🫠"], ["@lera_vse_sama", "💅"], ["@bot_ne_bot", "🤖"], ["@denis_kredit", "💳"]];
  const CM_GEN = ["Это я 😭", "Отправил маме", "Корпорация, верните мой вайб", "Почему это так жизненно", "Где купить?", "Ссылка в описании не работает", "Ахахах я плачу", "Мой начальник это смотрит", "Сохранил на «потом» (никогда)", "А можно в рассрочку?", "Вайбот, это про меня?", "Лучшее, что я видел сегодня. Сегодня я видел 400 рилсов", "Первый!", "Не первый", "Это реклама?", "Подписался, отписался, подписался", "Мне это показали 7 раз. Спасибо, алгоритм", "А курс где?", "Ставлю 🔥 не глядя", "Лайкнул с рабочего аккаунта", "Кто от Корпорации — ставьте 💜", "Записал в цели на год", "Смешно, но больно", "У меня так же, только без денег", "Пересматриваю 5-й раз", "Где звук?"];
  const CM_ME = ["Огонь 🔥", "Вау!", "Красиво живёшь", "Это где?", "Завидую белой завистью", "Скинь геолокацию", "Ну ты даёшь", "Лайк не глядя", "Кто это такой красивый?", "Ты на работе вообще бываешь?", "Классика", "Можно с тобой?", "Вайб 💜", "Взаимная подписка?", "Продвигаю свой канал, загляни 👉"];
  const QUICK_CM = ["🔥🔥🔥", "Лайк не глядя", "Красота!", "Где это?", "Скучаю 💜", "Ахахах", "Это я"];

  const charList = () => { let l = null; try { l = Vibe.chars && Vibe.chars.list && Vibe.chars.list(); } catch (e) {} return l && l.length ? l : FALLBACK; };
  const BIO_KIND = { family: "Семья — это главное 🏡", friend: "Живу, как могу ✨", date: "Ищу вайб. Не пишите про кредиты", partner: "Счастлив(а) 💞", blogger: "Блогер. Коллаб — в директ" };

  function accFromChar(c) {
    const r = rng(hash("acc" + c.id));
    return {
      id: c.id, n: c.n || c.id, e: c.e || "🙂", handle: c.handle || "@" + c.id + "_" + (10 + Math.floor(r() * 89)),
      bio: c.bio || (c.job ? c.job + " · " : "") + (BIO_KIND[c.kind] || "✨"), followers: c.followers || 60 + Math.floor(r() * 900),
      star: c.kind === "blogger", col: COLS[hash(c.id) % COLS.length], kind: c.kind || "friend", likes: c.likes || [], char: true,
      posts: c.kind === "blogger" ? STARS[hash(c.id) % 8].posts : null,
      dm: c.kind === "blogger" ? ["Спасибо, что пишешь! 💫", "Коллаб? Обсудим 🔥"] : null,
    };
  }
  function starAcc(s) { return Object.assign({ star: true }, s); }
  function allStars() {
    const extra = charList().filter((c) => c.kind === "blogger" && !STARS.find((s) => s.id === c.id)).map(accFromChar);
    return STARS.map(starAcc).concat(extra);
  }
  function chars() { return charList().filter((c) => c.kind !== "blogger").map(accFromChar); }
  function me() {
    const s = S();
    const name = s.name || "Ты";
    return { id: "me", n: name, e: (s.profile && s.profile.avatar) || "😎", handle: "@" + String(name).toLowerCase().replace(/\s+/g, "_") + "_vibe", col: "c-lime", me: true };
  }
  function acc(id) {
    if (id === "me") return me();
    const st = STARS.find((s) => s.id === id);
    if (st) return starAcc(st);
    const c = charList().find((x) => x.id === id);
    if (c) return accFromChar(c);
    const p = Vibe.people && Vibe.people.get && Vibe.people.get(id);
    if (p) return accFromChar(Object.assign({ id }, p));
    return null;
  }

  /* ---------- Слава ---------- */
  function prog(p, k = 240) { return 1 - Math.exp(-Math.max(0, nowMin() - p.at) / k); }
  function followers() {
    const g = G();
    return Math.max(0, Math.round(g.base + g.posts.filter((p) => !p.settled).reduce((s, p) => s + p.F * prog(p), 0)));
  }
  function tierIdx(f = followers()) { let i = 0; TIERS.forEach((t, k) => { if (f >= t.at) i = k; }); return i; }
  function fame() { return Math.round(clamp((Math.log10(followers() + 1) / 6) * 100, 0, 100)); }
  function canDM() { return tierIdx() >= 3 || S().balance >= 1000000; }
  const myLikes = (p) => Math.round(p.L * prog(p));

  /* ---------- Тренды и качество ---------- */
  const TRENDS = ["вайбчеллендж", "успешныйуспех", "осеньвайб", "яжзаслужил", "корпорациясемья", "понедельникнеприговор", "вайбсити", "жизнькрасива"];
  const trend = () => TRENDS[today() % TRENDS.length];
  const GEN_TAGS = ["вайб", "vibecity", "жизнь", "мысли", "эстетика", "настроение", "мойдень"];
  const KIND_W = { promo: 2.2, ach: 1.6, travel: 1.8, concert: 1.5, date: 1.4, gift: 1.3, buy: 1.3, family: 1.15, friend: 1.15, sport: 1.15, place: 1.0, event: 1.1, cat: 1.15, ad: 0.6 };

  function quality({ kind, tags = [] }) {
    const g = G();
    const why = [];
    let q = KIND_W[kind] || 0.9;
    if (q >= 1.5) why.push(["✨", "редкий момент"]);
    const last = g.posts.slice(0, 3).map((p) => p.kind);
    const same = last.filter((k) => k === kind).length;
    if (!g.posts.some((p) => p.kind === kind)) { q *= 1.25; why.push(["🆕", "новое в блоге"]); }
    else if (same) { q *= 1 - 0.25 * same; why.push(["🔁", "повторяешься"]); }
    const h = hourNow();
    if (h >= 18 && h < 23) { q *= 1.3; why.push(["🌆", "прайм-тайм"]); }
    else if (h >= 7 && h < 10) { q *= 1.15; why.push(["☕", "утренний охват"]); }
    else if (h >= 12 && h < 14) q *= 1.1;
    else if (h < 7) { q *= 0.55; why.push(["🌙", "все спят"]); }
    const nt = tags.filter((t) => t !== "реклама").length;
    if (!nt) { q *= 0.85; why.push(["#️⃣", "без хештегов"]); }
    else if (nt <= 5) q *= 1 + 0.06 * nt;
    else if (nt <= 8) q *= 1.2;
    else { q *= 0.8; why.push(["🚫", "хештег-спам"]); }
    if (tags.includes(trend())) { q *= 1.35; why.push(["🔥", "в тренде"]); }
    if (tags.includes("реклама")) q *= 0.7;
    const b = Vibe.body && Vibe.body.get ? Vibe.body.get() : null;
    if (b) { q *= 0.7 + clamp(b.mood || 50, 0, 100) / 250; if ((b.mood || 50) < 35) why.push(["😔", "грусть видно"]); }
    const look = Vibe.inv && Vibe.inv.look ? Vibe.inv.look() : 40;
    q *= 0.6 + look / 125;
    if (look >= 70) why.push(["💅", "выглядишь дорого"]);
    else if (look < 35) why.push(["🧥", "лук так себе"]);
    const d = today();
    const n = g.posts.filter((p) => Math.floor(p.at / 1440) === d).length;
    if (n >= 3) { q *= Math.pow(0.45, n - 2); why.push(["🥱", "подписчики устали"]); }
    return { q: Math.max(0.15, q), why };
  }
  function forecast(q, f = followers()) {
    const friends = chars().length;
    return { L: Math.round(q * (6 + f * 0.045 + friends * 2)), F: Math.round(q * (5 + 4.5 * Math.sqrt(f))) };
  }

  /* ---------- Публикация ---------- */
  function genComments(L, kind) {
    const r = Math.random;
    const n = Math.min(14, 1 + Math.floor(Math.sqrt(L) * 0.8));
    const cl = chars();
    const out = [];
    for (let i = 0; i < n; i++) {
      if (cl.length && r() < 0.35) {
        const c = pick(cl);
        out.push({ a: c.handle, e: c.e, t: pick(CHAR_CM[c.id] || ["🔥", "Класс!", "❤️", "Вау"]), id: c.id });
      } else { const u = pick(RAND_USERS); out.push({ a: u[0], e: u[1], t: pick(CM_ME) }); }
    }
    if (tierIdx() >= 3 && r() < 0.6) { const s = pick(STARS.filter((x) => !x.official)); out.splice(1, 0, { a: s.handle, e: s.e, t: pick(["Вау, коллега 💫", "Коллаб? 🔥", "Подписалась ✨", "Это уровень!"]), star: true }); }
    if (kind === "ad") out.unshift({ a: "@lera_vse_sama", e: "💅", t: "Продался 😒" });
    return out;
  }

  function post({ e = "📸", text = "", kind = "moment", from = null, tags = [], s = null, bg = null, deal = null } = {}) {
    if (!S().profile) return null;
    tags = (tags || []).map((t) => String(t).replace(/^#/, "").trim()).filter(Boolean).slice(0, 12);
    const { q } = quality({ kind, tags });
    const fc = forecast(q);
    const r = 0.75 + Math.random() * 0.5;
    const p = {
      id: "p" + Date.now().toString(36) + Math.floor(Math.random() * 99), at: nowMin(), e, s: s || pick(SIDES), bg: bg == null ? Math.floor(Math.random() * BG.length) : bg,
      text: String(text).slice(0, 300), tags, kind, q: Math.round(q * 100) / 100, L: Math.max(1, Math.round(fc.L * r)), F: Math.max(0, Math.round(fc.F * r)),
    };
    p.cm = genComments(p.L, kind);
    if (deal) p.F = -Math.round(followers() * 0.003);
    setG((g) => ({ posts: [p, ...g.posts].slice(0, 120), lastPostDay: today() }));
    Vibe.achieve && Vibe.achieve("gram_first");
    Vibe.emit && Vibe.emit("post", p);
    FX.sound.success();
    FX.confetti({ count: 60, from: from || undefined });
    FX.toast(`Опубликовано! Прогноз: ~${kfmt(p.L)} ❤️`, "📸", 2400);
    Vibe.reward && Vibe.reward({ xp: 15, silent: true });
    if (Vibe.skills && Vibe.skills.xp) { try { Vibe.skills.xp("creative", 4); Vibe.skills.xp("social", 2); } catch (err) {} }
    return p;
  }

  /* ---------- «Фото» — эмодзи-композиция ---------- */
  const SIDES = ["✨💫⭐", "🎉🎈✨", "💜✨🔥", "🌸🌿✨", "⭐🌙✨", "🔥💥⚡", "💖✨🫧"];
  const SEG = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("ru", { granularity: "grapheme" }) : null;
  const emojis = (str) => (SEG ? [...SEG.segment(str || "")].map((x) => x.segment) : Array.from(str || "")).filter((c) => c.trim() && !/^[\u200d\ufe0f]$/.test(c));
  function photo(p, cls = "") {
    const sides = emojis(p.s || "✨✨✨").slice(0, 3);
    return `<div class="vg-ph ${cls}" style="background:${BG[(p.bg || 0) % BG.length]}">
      <span class="vg-ph-main">${p.e}</span>
      ${sides.map((x, i) => `<span class="vg-ph-s s${i}">${x}</span>`).join("")}
      ${p.st ? `<span class="vg-ph-st">${esc(p.st)}</span>` : ""}
    </div>`;
  }
  const splitTags = (t) => String(t || "").split(/\s+/).filter(Boolean);

  /* ---------- Посты персонажей и звёзд по расписанию ---------- */
  function accPostsDay(a, d) {
    const r = rng(hash(a.id + ":" + d));
    const pool = a.posts || CP[a.id] || [].concat(CP[a.kind] || CP.friend, (a.likes || []).filter((x) => typeof x === "string").slice(0, 2).map((l) => ["❤️", "✨💛🌟", `Лучшее в жизни — ${l}`, "любимое"]));
    const cnt = a.star ? (r() < 0.5 ? 2 : 1) : r() < (a.kind === "family" ? 0.4 : 0.55) ? 1 : 0;
    const out = [];
    for (let k = 0; k < cnt; k++) {
      const t = pickR(r, pool);
      const at = d * 1440 + (a.star ? 9 : 8) * 60 + Math.floor(r() * (a.star ? 12 : 14) * 60);
      const L = a.star ? Math.round(a.followers * (0.01 + r() * 0.03)) : Math.round(6 + r() * 40 + (a.followers || 100) * 0.05);
      out.push({ id: `${a.id}-${d}-${k}`, a: a.id, at, e: t[0], s: t[1], text: t[2], tags: splitTags(t[3]), L, bg: Math.floor(r() * BG.length), star: a.star });
    }
    return out;
  }
  const cache = new Map();
  function accPosts(a, days = 7) {
    const d = today(), now = nowMin(), out = [];
    for (let x = d; x > d - days; x--) accPostsDay(a, x).forEach((p) => { if (p.at <= now) out.push(p); });
    return out.sort((x, y) => y.at - x.at);
  }
  function myPosts() { return G().posts.map((p) => Object.assign({ a: "me", me: true }, p)); }
  function feedPosts() {
    const g = G(), d = today(), now = nowMin();
    let list = [];
    const cl = chars();
    const stars = allStars();
    const fol = stars.filter((s) => g.follow[s.id]);
    const rec = stars.filter((s) => !g.follow[s.id]);
    const recPick = rec.length ? [rec[d % rec.length]] : [];
    for (let x = d; x > d - 3; x--) {
      cl.forEach((a) => list.push(...accPostsDay(a, x)));
      fol.forEach((a) => list.push(...accPostsDay(a, x)));
      recPick.forEach((a) => accPostsDay(a, x).slice(0, 1).forEach((p) => list.push(Object.assign({ rec: true }, p))));
    }
    list = list.filter((p) => p.at <= now).concat(myPosts().filter((p) => now - p.at < 4320));
    return list.sort((x, y) => y.at - x.at).slice(0, 40);
  }
  const likesOf = (p) => (p.me ? myLikes(p) : Math.round(p.L * prog(p, 180))) + (G().liked[p.id] ? 1 : 0);

  function commentsOf(p) {
    const extra = (G().myCm[p.id] || []).map((t) => ({ a: me().handle, e: me().e, t, mine: true }));
    if (p.me) { const c = p.cm || []; return c.slice(0, Math.ceil(c.length * prog(p))).concat(extra); }
    const r = rng(hash("cm" + p.id));
    const n = p.star ? 5 + Math.floor(r() * 6) : 1 + Math.floor(r() * 4);
    const cl = chars().filter((c) => c.id !== p.a);
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!p.star && cl.length && r() < 0.6) { const c = pickR(r, cl); out.push({ a: c.handle, e: c.e, t: pickR(r, CHAR_CM[c.id] || ["🔥", "Класс!", "❤️"]) }); }
      else { const u = pickR(r, RAND_USERS); out.push({ a: u[0], e: u[1], t: pickR(r, p.star ? CM_GEN : CM_ME) }); }
    }
    return out.slice(0, Math.max(1, Math.ceil(n * prog(p, 180)))).concat(extra);
  }

  /* ---------- Разметка ---------- */
  const ava = (a, size = 40, ring = false, seen = false) => `<span class="vg-ava-w ${ring ? (seen ? "seen" : "ring") : ""}" style="--s:${size}px"><span class="vg-ava ${a.col || "c-white"}">${a.e}</span></span>`;
  const verified = (a) => (a.star ? `<span class="vg-ver" title="Подтверждено">✔</span>` : "");
  const capHtml = (p) => `${esc(p.text)} ${(p.tags || []).map((t) => `<span class="vg-tag">#${esc(t)}</span>`).join(" ")}`;

  function postHtml(p) {
    cache.set(p.id, p);
    const a = acc(p.a) || me();
    const g = G();
    const liked = !!g.liked[p.id];
    const cms = commentsOf(p);
    return `
    <article class="vg-post">
      <header class="vg-ph-head">
        <button class="vg-who" data-vg="open" data-id="${a.id}">${ava(a, 38, a.star && !a.me)}<span><b>${esc(a.n)}${verified(a)}</b><small>${esc(a.handle)} · ${ago(nowMin() - p.at)}${p.rec ? " · Рекомендуем" : ""}${p.kind === "ad" ? " · Реклама" : ""}</small></span></button>
        <button class="vg-more" data-vg="more" data-pid="${p.id}">⋯</button>
      </header>
      <div class="vg-photo" data-vg="photo" data-pid="${p.id}">${photo(p)}<span class="vg-bigheart">❤️</span></div>
      <div class="vg-acts">
        <button class="vg-act ${liked ? "on" : ""}" data-vg="like" data-pid="${p.id}">${liked ? "❤️" : "🤍"}</button>
        <button class="vg-act" data-vg="cm" data-pid="${p.id}">💬</button>
        <button class="vg-act" data-vg="share" data-pid="${p.id}">📤</button>
        <span style="flex:1"></span>
        <button class="vg-act ${g.saved[p.id] ? "on" : ""}" data-vg="save" data-pid="${p.id}">${g.saved[p.id] ? "🔖" : "📑"}</button>
      </div>
      <div class="vg-likes"><b data-likes="${p.id}">${fmt(likesOf(p))}</b> отметок «Нравится»</div>
      <div class="vg-cap"><b>${esc(a.handle)}</b> ${capHtml(p)}</div>
      ${cms.length ? `<button class="vg-cmlink" data-vg="cm" data-pid="${p.id}">Посмотреть все комментарии (${cms.length})</button>` : ""}
    </article>`;
  }

  function storiesRow() {
    const g = G(), d = today();
    const list = chars().concat(allStars().filter((s) => g.follow[s.id]));
    return `<div class="vg-stories hscroll">
      <button class="vg-st" data-vg="newpost">${ava(me(), 62)}<span class="vg-st-plus">+</span><small>Твоя</small></button>
      ${list.map((a) => `<button class="vg-st" data-vg="story" data-id="${a.id}">${ava(a, 62, true, g.seenSt[a.id] === d)}<small>${esc(a.n.split(" ")[0])}</small></button>`).join("")}
    </div>`;
  }

  /* ---------- Рилсы (30) ---------- */
  // [автор, фон, bpm, "эмодзи:анимация:x:y:размер|…", [субтитры], подпись, музыка]
  const RL = [
    ["coach", 3, 110, "🧘‍♂️:float:50:48:120|💸:fall:20:20:44|💸:fall:80:10:44", ["Ты не устал.", "Ты просто", "недостаточно", "успешен 💸"], "Утренняя практика: благодарность начальнику ×100", "Успешный успех — Гимн отдела"],
    ["foodie", 6, 120, "🍜:bounce:50:52:130|🥢:dance:72:34:64|🔥:pulse:28:68:54", ["Пельмени", "за 3 часа", "до зарплаты", "ресторанный уровень"], "Рецепт в комментах (нет)", "Шеф Пельмень — Варим"],
    ["crypto", 4, 128, "🚀:jump:50:58:110|📈:zoom:24:28:64|🌕:float:80:16:64", ["Купил на хаях", "продал на лоях", "это называется", "опыт 🧠"], "Не финсовет 🚀", "Lunar Beat — To The Moon"],
    ["meme", 2, 100, "🐸:shake:50:50:140|☕:bounce:76:72:54", ["Я в понедельник", "в 9:00", "на созвоне:", "«Меня слышно?»"], "Жиза", "Оригинальный звук — мемный пабличек"],
    ["fit", 2, 132, "🏋️‍♀️:jump:50:52:120|💦:fall:30:18:34|💦:fall:70:12:34", ["День 1 из 30", "приседаний", "День 2:", "отдых 🛋️"], "Марафон «Попа как орех»", "Pump It Vibe — Кира"],
    ["travel", 8, 96, "✈️:walkR:50:26:80|🏝️:float:50:64:120|☀️:spin:82:14:60", ["Работаю удалённо", "с острова", "ноутбук в отеле", "я в номере"], "Удалёнка мечты", "Island Lo-Fi — Даша Везде"],
    ["beauty", 9, 104, "💄:dance:34:52:94|🪞:float:66:50:110|✨:pulse:50:24:54", ["Макияж", "«я проснулась", "такой»", "шаг 1 из 47"], "GRWM на созвон", "Glow Up — Лена Глоу"],
    ["papa", 5, 90, "👨‍🍼:bounce:50:56:120|🍼:spin:76:30:54|🧸:walkL:30:76:54", ["Ребёнок уснул", "в 3:00", "я тоже", "в 3:01"], "Отцовство: лайт-версия не завезли", "Колыбельная (ремикс)"],
    ["lyoha", 7, 140, "🧔:dance:50:52:120|🎮:shake:72:72:54|🍕:float:26:24:54", ["Лёха", "в пятницу:", "«я только", "на одну катку»"], "Суббота, 06:00", "Boss Fight — 8 бит"],
    ["vibe", 9, 116, "🤖:bounce:50:50:120|💜:float:24:28:54|💜:float:76:28:54", ["Вайбот напоминает:", "кредит одобрен", "даже если", "ты не просил 💜"], "Мы заботимся 💜", "Vibe — Гимн семьи"],
    ["meme", 0, 108, "🐈:walkR:50:60:100|📦:bounce:50:74:84", ["Купил коту", "дом за 4 000 ₫", "кот выбрал", "коробку"], "Котики спасут интернет", "Мяу-бит — оригинал"],
    ["foodie", 2, 112, "🥑:spin:40:46:94|🍞:bounce:62:56:94", ["Авокадо-тост", "за 890 ₫", "вот почему", "нет ипотеки"], "Завтрак миллениала", "Brunch Beat"],
    ["coach", 7, 100, "🧗:jump:50:62:110|🏔️:float:50:30:120", ["Выйди", "из зоны комфорта", "в зону", "переработок 💼"], "Расти или расти", "Успешный успех — Вверх"],
    ["crypto", 7, 88, "🐋:float:50:50:130|🪙:orbit:50:50:44", ["Киты", "скупают", "мои", "надежды"], "Рынок сегодня", "Deep Water — Аркадий"],
    ["mom", 5, 96, "👩:bounce:50:52:120|🧣:dance:76:38:64|🥶:shake:24:66:54", ["Мама,", "когда на улице +15:", "«Надень", "шапку»"], "Мама всегда права", "Тёплый звук"],
    ["fit", 6, 120, "🥗:bounce:40:56:94|🍫:walkL:70:38:64", ["Правильное питание", "до 19:00", "19:01:", "🍫🍫🍫"], "Честность — новый фитнес", "Pump It Vibe — Кира"],
    ["travel", 1, 116, "🧳:walkR:50:62:94|🛫:fall:50:18:74", ["Отпуск", "5 дней", "из них 3", "в аэропорту"], "Транзит — тоже путешествие", "Gate 47 — Даша Везде"],
    ["beauty", 5, 100, "🧴:zoom:50:50:110|🫧:float:30:28:44|🫧:float:70:24:44", ["Уход", "из 12 шагов", "пропустила один —", "начинай заново"], "Кожа как у стекла (разбитого)", "Glow Up — Лена Глоу"],
    ["meme", 3, 124, "🦆:walkR:50:56:100|💼:bounce:50:72:44", ["Иду", "на работу,", "которая", "меня не ценит"], "Утка дня", "Кря-бит"],
    ["papa", 3, 130, "👶:jump:50:60:110|🥄:spin:72:38:54|🥣:shake:28:38:64", ["Кормление", "уровень", "сложности:", "Dark Souls"], "Каша везде. Кроме ребёнка", "Boss Fight (детский)"],
    ["katya", 4, 126, "👩‍🎤:dance:50:52:120|🎸:shake:74:62:64|🎶:float:26:24:54", ["Катя,", "репетиция,", "соседи", "уже аплодируют 🚪"], "Новый трек скоро", "Катя — Демо №14"],
    ["coach", 0, 104, "🦁:zoom:50:50:120|👔:bounce:50:80:54", ["Будь львом.", "Но в рамках", "регламента", "отдела."], "Лидерство 101", "Успешный успех — Рёв"],
    ["foodie", 4, 92, "🌯:dance:50:52:120|🌙:float:80:14:54", ["Шаурма", "в 2 ночи —", "это не еда", "это терапия"], "Ночной обзор", "Night Grill"],
    ["crypto", 2, 136, "🐶:bounce:50:52:110|🚀:walkR:50:24:64", ["Вложился", "в собачий коин", "теперь у меня", "собака. Денег нет."], "Диверсификация", "Lunar Beat — To The Moon"],
    ["meme", 6, 144, "🧑‍💻:shake:50:56:110|🔥:pulse:28:28:54|🔥:pulse:72:28:54", ["«Небольшая", "правка»", "в 18:59", "пятницы"], "Пятница отменяется", "Дедлайн-кор"],
    ["fit", 5, 80, "🧘‍♀️:float:50:56:120|📱:shake:76:28:54", ["Медитация", "5 минут", "из них 4", "в телефоне"], "Осознанность (почти)", "Ом-бит"],
    ["travel", 2, 100, "🏕️:float:50:62:110|🦟:orbit:50:46:34", ["Отдых", "на природе:", "природа", "отдыхает на мне"], "Кемпинг дня", "Forest Lo-Fi"],
    ["beauty", 0, 112, "💅:dance:50:56:110|💎:spin:50:24:54", ["Маникюр", "стоит как", "мой", "холодильник"], "Красота требует кредита", "Glow Up — Лена Глоу"],
    ["vibe", 3, 150, "🛍️:fall:30:20:64|🛍️:fall:70:10:64|😵‍💫:bounce:50:62:110", ["Распродажа", "−90%*", "*на то, что", "ты не купишь"], "Только сегодня. И завтра. И всегда", "Vibe — Скидочный бит"],
    ["papa", 8, 110, "🚗:walkL:50:62:100|🧒:jump:50:44:64", ["«Мы уже", "приехали?»", "Прошло", "4 минуты"], "Семейный роуд-трип", "Дорожная (бесконечная)"],
  ];
  const REELS = RL.map((r, i) => {
    const rr = rng(hash("reel" + i));
    return { i, a: r[0], bg: r[1], bpm: r[2], actors: r[3].split("|").map((x) => { const [e, an, px, py, sz] = x.split(":"); return { e, an, x: +px, y: +py, sz: +sz }; }), subs: r[4], cap: r[5], music: r[6], likes: Math.round(2000 + rr() * rr() * 900000), cms: Math.round(40 + rr() * 4000), views: Math.round(20000 + rr() * 4000000) };
  });
  const reelAcc = (r) => acc(r.a) || FALLBACK.map(accFromChar).find((x) => x.id === r.a) || starAcc(STARS[8]);

  function reelScene(r, mini = false) {
    return `<div class="vg-scene ${mini ? "mini" : ""}" style="background:${BG[r.bg % BG.length]};--beat:${(60 / r.bpm).toFixed(3)}s">
      ${mini ? "" : `<span class="vg-beatring"></span>`}
      ${r.actors.map((a, k) => `<span class="vg-actor" style="left:${a.x}%;top:${a.y}%;font-size:${mini ? Math.round(a.sz / 3.2) : a.sz}px"><span class="vg-an vg-an-${a.an}" style="animation-delay:${(k * 0.17).toFixed(2)}s">${a.e}</span></span>`).join("")}
    </div>`;
  }

  /* ---------- Моменты (предложения запостить) ---------- */
  const PLACE = { club: "клуб", park: "парк", clinic: "клиника", hq: "офис Корпорации", supermarket: "супермаркет", restaurant: "ресторан", office: "офис", home: "дом", work: "работа", metro: "метро", metro1: "метро", gym: "спортзал", cafe: "кофейня", mall: "торговый центр", cinema: "кино", beach: "пляж" };
  const MOM = {
    promo: { e: "📈", s: "💼🎉🏆", caps: ["Повысили! Теперь я веду себя соответственно", "Карьерный рост: задач больше, а зарплата… тоже чуть-чуть", "Спасибо Корпорации за доверие. И за переработки"], tags: ["карьера", "повышение", "успешныйуспех"] },
    buy: { e: "🛍️", s: "✨💸📦", caps: ["Купил(а) себе «{t}». Заслужил(а)", "Маленькая радость за {a}. Ну как маленькая…", "Инвестиция в себя: «{t}»"], tags: ["покупка", "яжзаслужил", "шопинг"] },
    gift: { e: "🎁", s: "💝🎀✨", caps: ["Подарок для {n}. Реакция бесценна", "Дарить приятнее, чем получать. Почти", "Сделал(а) кому-то день 💝"], tags: ["подарок", "близкие", "любовь"] },
    ach: { e: "🏆", s: "⭐✨🎖️", caps: ["Новое достижение: «{t}»!", "Разблокировал(а) «{t}». Мама гордится", "«{t}» — это про меня"], tags: ["достижение", "левелап"] },
    place: { e: "📍", s: "🌆✨🚶", caps: ["Я тут: {p}", "Просто {p}. Просто вайб", "Чекин: {p}. Кто рядом?"], tags: ["чекин", "город"] },
    concert: { e: "🎤", s: "🎶🔥🙌", caps: ["Голоса нет, но эмоции есть!", "Лучший концерт в жизни (до следующего)", "{t} — это было мощно"], tags: ["концерт", "музыка", "живойзвук"] },
    date: { e: "💘", s: "🕯️🍷✨", caps: ["Хороший вечер. Подробностей не будет 😉", "{t}. Кажется, это вайб", "Иногда везёт"], tags: ["свидание", "вечер"] },
    travel: { e: "🏝️", s: "✈️☀️🥥", caps: ["Наконец-то отпуск! Почту не проверяю (проверяю)", "{t}. Тут нет созвонов", "Жизнь — это путешествие. Особенно в кредит"], tags: ["путешествия", "отпуск"] },
    sport: { e: "💪", s: "🏋️💦🔥", caps: ["Тренировка: сделано. Фото: сделано", "Боль — это слабость, покидающая тело (и деньги — кошелёк)", "{t} ✅"], tags: ["спорт", "зож", "мотивация"] },
    family: { e: "🏡", s: "🥧🫖💞", caps: ["Семья — это главное", "{t}. Накормили на неделю вперёд", "Дома всегда тепло"], tags: ["семья", "дом"] },
    friend: { e: "🍻", s: "🎉🕺✨", caps: ["Лучшие люди — рядом", "{t}. Вспоминать будем долго", "Друзья — это семья, которую не выбирает Корпорация"], tags: ["друзья", "пятница"] },
    doctor: { e: "🩺", s: "💊🏥🙂", caps: ["Здоровье — главная инвестиция. Дорогая инвестиция", "Сходил(а) к врачу. Я взрослый(ая)"], tags: ["здоровье", "забота"] },
    event: { e: "📅", s: "✨🎉📸", caps: ["{t}. Галочка в календаре ✅", "Был(а) на «{t}». Рекомендую", "{t} — сделано!"], tags: ["жизнь", "мойдень"] },
  };
  const SHOTS = [
    { e: "🤳", s: "✨😎💫", t: "Селфи без фильтров (с тремя фильтрами)", k: "selfie", tags: ["селфи", "япросто"] },
    { e: "☕", s: "🥐📖🌧️", t: "Кофе и немного продуктивности", k: "coffee", tags: ["кофе", "утро"] },
    { e: "🌅", s: "🌇☁️🕊️", t: "Закат, который не продаётся. Пока", k: "sunset", tags: ["закат", "эстетика"] },
    { e: "🍝", s: "🍷🕯️🧀", t: "Ужин как в ресторане. Потому что из ресторана", k: "food", tags: ["еда", "ужин"] },
    { e: "🐈", s: "🧶💤🪴", t: "Кот. Просто кот. Лайков больше, чем у меня", k: "cat", tags: ["кот", "котики"] },
    { e: "💼", s: "💻☕📊", t: "Офисная эстетика. Дедлайн — тоже эстетика", k: "office", tags: ["офис", "работа"] },
    { e: "🌃", s: "🌙🚕✨", t: "Ночной город и мысли о вечном (о зарплате)", k: "night", tags: ["ночь", "мысли"] },
    { e: "🪞", s: "👟🧥✨", t: "Образ дня. Оценивайте", k: "look", tags: ["образ", "стиль"] },
  ];
  const ATT_KIND = { concert: "concert", date: "date", travel: "travel", sport: "sport", workout: "sport", family: "family", friend: "friend", doctor: "doctor" };

  function fill(t, d) { return t.replace(/\{(\w)\}/g, (_, k) => (d[k] != null ? d[k] : "")); }
  function makeMoment(kind, d = {}, e = null) {
    const m = MOM[kind] || MOM.event;
    return { id: "m" + Date.now().toString(36) + Math.floor(Math.random() * 99), kind, e: e || m.e, s: m.s, bg: Math.floor(Math.random() * BG.length), text: fill(pick(m.caps), d), tags: m.tags.slice(0, 2), sug: m.tags, at: nowMin() };
  }
  let lastPrompt = 0;
  function moment(m) {
    if (!S().profile) return;
    setG((g) => ({ drafts: [m, ...g.drafts].slice(0, 6) }));
    const busy = document.querySelector(".modal, .sheet, .vg-story") || (Vibe.current && ["welcome", "reels"].includes(Vibe.current.route.name));
    if (busy || Date.now() - lastPrompt < 40000) return;
    lastPrompt = Date.now();
    showPrompt(m);
  }
  let promptEl = null, promptT = null;
  function showPrompt(m) {
    if (promptEl) promptEl.remove();
    clearTimeout(promptT);
    const el = document.createElement("div");
    el.className = "vg-moment";
    el.innerHTML = `<div class="vg-mo-ph">${photo(m, "sm")}</div><div class="vg-mo-tx"><b>📸 Запостить этот момент?</b><small>${esc(m.text)}</small></div><div class="vg-mo-b"><button class="btn black sm" data-yes>Да!</button><button class="vg-mo-x" data-no>Позже</button></div>`;
    app().appendChild(el);
    promptEl = el;
    FX.sound.pop();
    const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 300); if (promptEl === el) promptEl = null; clearTimeout(promptT); };
    el.querySelector("[data-yes]").addEventListener("click", () => { close(); composer(m); });
    el.querySelector("[data-no]").addEventListener("click", () => { close(); FX.toast("Сохранили в черновики Vibegram", "📝", 1600); });
    promptT = setTimeout(close, 9000);
  }

  // Подписки на события игры
  Vibe.on("attend", (e) => { if (!e) return; const k = ATT_KIND[e.kind] || "event"; moment(makeMoment(k, { t: e.title || "Событие" }, e.e)); });
  Vibe.on("arrive", (d) => {
    const key = String((d && (d.place || d.key || d.id)) || d || "");
    if (!key) return;
    const base = key.split(":")[0];
    if (["home", "work"].includes(base)) return;
    const g = G(), day = today();
    if ((g.placeDay || {})[base] === day) return;
    setG({ placeDay: Object.assign({}, g.placeDay, { [base]: day }) });
    moment(makeMoment("place", { p: (d && d.name) || PLACE[base] || key.split(":")[1] || base }));
  });
  Vibe.on("work", (d) => { if (d && d.promoted) moment(makeMoment("promo")); });
  Vibe.on("pay", (d) => {
    if (!d || d.amount < 15000 || /Vibegram|аренд|Rent|кредит|налог|ЖКХ/i.test(d.title)) return;
    const t = String(d.title).split("·").pop().trim() || "обновка";
    moment(makeMoment(/Travel|тур/i.test(d.title) ? "travel" : "buy", { t, a: money(d.amount) }));
  });
  Vibe.on("gift", (d) => {
    const id = d && (d.id || d.to || d.char);
    const a = id ? acc(id) : null;
    moment(makeMoment("gift", { n: a ? a.n : "близкого" }, (d && d.item && d.item.e) || null));
  });
  let achSeen = (S().achievements || []).length;
  Vibe.state.on((s) => {
    const list = s.achievements || [];
    if (achSeen === null) { achSeen = list.length; return; }
    if (list.length > achSeen) {
      const id = list[list.length - 1];
      achSeen = list.length;
      const a = (Vibe.ACH || {})[id];
      if (a && id !== "first") setTimeout(() => moment(makeMoment("ach", { t: a.t }, a.e)), 1600);
    } else achSeen = list.length;
  });

  /* ---------- Композер поста ---------- */
  function composer(m, { deal = null } = {}) {
    let cur = Object.assign({}, m);
    let tags = new Set(cur.tags || []);
    if (deal) tags.add("реклама");
    const sug = [...new Set([].concat(deal ? ["реклама", "партнёрство"] : [], cur.sug || [], [trend()], GEN_TAGS))];
    Vibe.ui.sheet(`
      <div class="display" style="font-size:24px;margin-bottom:10px">${deal ? "🤝 Интеграция" : "📸 Новый пост"}</div>
      <div class="vg-cmp-ph" data-ph>${photo(cur)}</div>
      <div style="display:flex;gap:8px;margin:10px 0">
        <button class="btn sm" data-reshoot>🎲 Переснять</button>
        <button class="btn sm" data-filter>🌈 Фильтр</button>
      </div>
      <textarea class="vg-ta" data-cap maxlength="300" placeholder="Подпись…">${esc(cur.text)}</textarea>
      <div class="muted" style="font-size:12px;font-weight:800;margin:10px 0 4px">Хештеги · 🔥 тренд дня: #${trend()}</div>
      <div class="chips" data-tags>${sug.map((t) => `<button class="chip ${tags.has(t) ? "on" : ""}" data-tag="${esc(t)}">${t === trend() ? "🔥" : "#"}${esc(t)}</button>`).join("")}</div>
      <div class="card tight c-lilac vg-fc" data-fc></div>
      <button class="btn black xl block" data-pub style="margin-top:12px">Опубликовать <span class="arrow">→</span></button>
      <div class="fine">Публикуя, вы передаёте Корпорации права на фото, подпись, лицо и вайб. Навсегда. С любовью 💜</div>`, {
      onMount(sh, close) {
        const fc = sh.querySelector("[data-fc]");
        const upd = () => {
          const { q, why } = quality({ kind: deal ? "ad" : cur.kind, tags: [...tags] });
          const f = forecast(q);
          const stars = Math.max(1, Math.min(5, Math.round(q * 2.2)));
          fc.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b>Прогноз Вайбота</b><span>${"⭐".repeat(stars)}${"▫️".repeat(5 - stars)}</span></div>
            <div style="font-weight:900;font-size:18px;margin:4px 0">~${kfmt(f.L)} ❤️ · ${deal ? "−" + kfmt(followers() * 0.003) : "+" + kfmt(f.F)} 👥</div>
            <div class="vg-why">${why.map((w) => `<span>${w[0]} ${w[1]}</span>`).join("") || "<span>😐 обычный пост</span>"}</div>
            ${deal ? `<div style="font-weight:900;margin-top:6px">Гонорар: ${money(deal.fee)} 💸</div>` : ""}`;
        };
        upd();
        sh.querySelector("[data-tags]").addEventListener("click", (e) => {
          const b = e.target.closest("[data-tag]"); if (!b) return;
          const t = b.dataset.tag;
          if (deal && t === "реклама") { FX.toast("Без #реклама нельзя. Закон и Корпорация следят", "⚖️"); return; }
          tags.has(t) ? tags.delete(t) : tags.add(t);
          b.classList.toggle("on"); FX.bump(b); upd();
        });
        sh.querySelector("[data-reshoot]").addEventListener("click", (e) => {
          cur.s = pick(SIDES); cur.bg = Math.floor(Math.random() * BG.length);
          sh.querySelector("[data-ph]").innerHTML = photo(cur); FX.bump(sh.querySelector("[data-ph]")); FX.burst(e.currentTarget, { emojis: ["📸", "✨"], count: 6 });
        });
        sh.querySelector("[data-filter]").addEventListener("click", () => { cur.bg = (cur.bg + 1) % BG.length; sh.querySelector("[data-ph]").innerHTML = photo(cur); FX.bump(sh.querySelector("[data-ph]")); });
        sh.querySelector("[data-pub]").addEventListener("click", (e) => {
          const text = sh.querySelector("[data-cap]").value.trim() || cur.text;
          const p = post({ e: cur.e, s: cur.s, bg: cur.bg, text, kind: deal ? "ad" : cur.kind, tags: [...tags], from: e.currentTarget, deal });
          if (!p) return;
          if (m.id) setG((g) => ({ drafts: g.drafts.filter((x) => x.id !== m.id) }));
          if (deal) {
            if (Vibe.game && Vibe.game.tx) Vibe.game.tx(`Vibegram · интеграция «${deal.brand}»`, deal.fee, "🤝", "c-lime");
            else Vibe.addMoney && Vibe.addMoney(deal.fee, { title: `Vibegram · интеграция «${deal.brand}»`, emoji: "🤝" });
            setG({ dealDay: today() });
            Vibe.refreshCounters && Vibe.refreshCounters();
            setTimeout(() => FX.toast(`+${money(deal.fee)} от «${deal.brand}». Продался красиво`, "🤝", 2600), 900);
          }
          close();
          refresh();
        });
      },
    });
  }
  function newPost() {
    const g = G();
    Vibe.ui.sheet(`
      <div class="display" style="font-size:24px;margin-bottom:4px">Что постим?</div>
      <p class="muted" style="font-weight:700;margin:0 0 12px">Настоящие моменты из жизни заходят лучше постановки</p>
      ${g.drafts.length ? `<h2 class="sec" style="margin-top:0">Моменты <small>${g.drafts.length}</small></h2><div class="hscroll">${g.drafts.map((d) => `<button class="vg-draft tap" data-draft="${d.id}">${photo(d, "sm")}<small>${esc(d.text)}</small></button>`).join("")}</div>` : ""}
      <h2 class="sec">Постановка</h2>
      <div class="grid2 stagger">${SHOTS.map((s, i) => `<button class="card tight tap vg-shot" data-shot="${i}"><span style="font-size:34px">${s.e}</span><b>${s.t.split(".")[0]}</b></button>`).join("")}</div>`, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          const d = e.target.closest("[data-draft]");
          if (d) { const m = G().drafts.find((x) => x.id === d.dataset.draft); close(); if (m) setTimeout(() => composer(m), 320); return; }
          const s = e.target.closest("[data-shot]");
          if (s) {
            const sh0 = SHOTS[+s.dataset.shot];
            close();
            setTimeout(() => composer({ kind: sh0.k === "cat" ? "cat" : sh0.k, e: sh0.e, s: sh0.s, bg: Math.floor(Math.random() * BG.length), text: sh0.t, tags: sh0.tags.slice(0, 1), sug: sh0.tags }), 320);
          }
        });
      },
    });
  }

  /* ---------- Комментарии ---------- */
  function commentsSheet(list, { title = "Комментарии", onSend } = {}) {
    Vibe.ui.sheet(`
      <div class="display" style="font-size:22px;margin-bottom:8px">${title} <small class="muted" style="font-size:14px">${list.length}</small></div>
      <div class="vg-cms stagger" data-list>${list.map(cmRow).join("") || `<p class="muted" style="font-weight:700">Пока тихо. Будь первым!</p>`}</div>
      <div class="chips" data-q>${QUICK_CM.map((q) => `<button class="chip" data-qc>${q}</button>`).join("")}</div>
      <div style="display:flex;gap:8px"><div class="field" style="flex:1;height:50px"><input data-in maxlength="120" placeholder="Добавь комментарий…"></div><button class="icon-btn" data-send style="width:50px;height:50px;background:var(--lime)">➤</button></div>`, {
      onMount(sh) {
        const box = sh.querySelector("[data-list]");
        const inp = sh.querySelector("[data-in]");
        const send = (t) => {
          t = String(t || "").trim(); if (!t) return;
          const row = document.createElement("div"); row.innerHTML = cmRow({ a: me().handle, e: me().e, t, mine: true });
          const el = row.firstElementChild; box.appendChild(el); FX.bump(el);
          box.scrollTop = box.scrollHeight;
          inp.value = ""; FX.sound.pop();
          onSend && onSend(t);
        };
        sh.querySelector("[data-q]").addEventListener("click", (e) => { const b = e.target.closest("[data-qc]"); if (b) send(b.textContent); });
        sh.querySelector("[data-send]").addEventListener("click", () => send(inp.value));
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") send(inp.value); });
      },
    });
  }
  const cmRow = (c) => `<div class="vg-cm ${c.mine ? "mine" : ""}"><span class="vg-cm-a">${c.e}</span><div><b>${esc(c.a)}${c.star ? " ✔" : ""}</b> ${esc(c.t)}<small>${c.mine ? "только что" : "ответить · ❤️ " + (1 + (hash(c.t + c.a) % 40))}</small></div></div>`;

  /* ---------- Действия с постами ---------- */
  function relBump(id, d = 1) {
    if (!Vibe.people || !Vibe.people.get || !Vibe.people.get(id)) return;
    const g = G(), key = id + ":" + today();
    if ((g.relDay[key] || 0) >= 2) return;
    setG({ relDay: Object.assign({}, g.relDay, { [key]: (g.relDay[key] || 0) + 1 }) });
    Vibe.people.rel(id, d);
  }
  function toggleLike(pid, btn, force) {
    const g = G();
    const was = !!g.liked[pid];
    if (force && was) return;
    const liked = Object.assign({}, g.liked);
    if (was) delete liked[pid]; else liked[pid] = 1;
    setG({ liked });
    const p = cache.get(pid);
    const root = btn ? btn.closest(".screen") || document : document;
    root.querySelectorAll(`[data-vg="like"][data-pid="${pid}"]`).forEach((b) => { b.textContent = was ? "🤍" : "❤️"; b.classList.toggle("on", !was); FX.bump(b); });
    root.querySelectorAll(`[data-likes="${pid}"]`).forEach((el) => (el.textContent = fmt(p ? likesOf(p) : 0)));
    if (!was) { FX.sound.like(); if (btn) FX.burst(btn, { emojis: ["❤️", "💖", "✨"], count: 8, spread: 70 }); if (p && !p.me && !p.star) relBump(p.a, 1); }
  }
  function postSheet(p) {
    cache.set(p.id, p);
    Vibe.ui.sheet(`<div class="vg-sheetpost">${postHtml(p)}</div>`, { onMount(sh) { bindPostClicks(sh); } });
  }
  let lastTap = { t: 0, id: "" };
  function bindPostClicks(root) {
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-vg]");
      if (!b) return;
      const act = b.dataset.vg, pid = b.dataset.pid, p = pid ? cache.get(pid) : null;
      if (act === "like") toggleLike(pid, b);
      else if (act === "photo") {
        const t = Date.now();
        if (lastTap.id === pid && t - lastTap.t < 320) {
          const h = b.querySelector(".vg-bigheart");
          if (h) { h.classList.remove("go"); void h.offsetWidth; h.classList.add("go"); }
          FX.burst(e, { emojis: ["❤️", "💖", "💘"], count: 12, spread: 110 });
          toggleLike(pid, b.parentElement.querySelector('[data-vg="like"]'), true);
          lastTap = { t: 0, id: "" };
        } else lastTap = { t, id: pid };
      } else if (act === "cm" && p) {
        commentsSheet(commentsOf(p), {
          onSend(t) {
            const g = G();
            setG({ myCm: Object.assign({}, g.myCm, { [pid]: [...(g.myCm[pid] || []), t].slice(-10) }) });
            if (!p.me && !p.star) relBump(p.a, 1);
            Vibe.reward && Vibe.reward({ xp: 4, silent: true });
          },
        });
      } else if (act === "share") { FX.toast("Ссылка скопирована. Отправь маме — она поставит ❤️", "📤", 2000); FX.bump(b); }
      else if (act === "save") {
        const g = G(), saved = Object.assign({}, g.saved);
        if (saved[pid]) delete saved[pid]; else saved[pid] = 1;
        setG({ saved }); b.textContent = saved[pid] ? "🔖" : "📑"; FX.bump(b); FX.sound.pop();
        if (saved[pid]) FX.toast("Сохранено в «Посмотрю потом» (никогда)", "🔖", 1600);
      } else if (act === "more") {
        FX.toast(pick(["Пожаловаться нельзя: у нас все счастливы", "Скрыть нельзя. Это для тебя 💜", "Алгоритм запомнил, что тебе интересно"]), "⋯", 2000);
      } else if (act === "open") {
        const id = b.dataset.id;
        if (b.closest(".sheet")) { const bd = document.querySelector(".backdrop"); if (bd) bd.click(); }
        if (id === "me") Vibe.go("gram", { tab: "me" }); else Vibe.go("gram-profile", { id });
      }
    });
  }

  /* ---------- Сторис ---------- */
  let storyClose = null;
  function openStory(id) {
    const a = acc(id); if (!a) return;
    const d = today();
    let frames;
    if (a.story) frames = a.story.map((t, i) => ({ e: (a.posts[i % a.posts.length] || [a.e])[0], s: (a.posts[i % a.posts.length] || ["", "✨✨✨"])[1], bg: (hash(a.id) + i) % BG.length, st: t }));
    else {
      const ps = accPosts(a, 3).slice(0, 2);
      frames = ps.map((p) => ({ e: p.e, s: p.s, bg: p.bg, st: p.text }));
      if (!frames.length) frames = [{ e: a.e, s: "✨☕🌤️", bg: hash(a.id) % BG.length, st: "Доброе утро! ☀️" }];
    }
    const el = document.createElement("div");
    el.className = "vg-story";
    el.innerHTML = `<div class="vg-sbars">${frames.map(() => `<i><b></b></i>`).join("")}</div>
      <div class="vg-shead">${ava(a, 34)}<b>${esc(a.handle)}</b><small>${ago(nowMin() - (d * 1440 + 9 * 60))}</small><span style="flex:1"></span><button class="vg-sx" data-x>✕</button></div>
      <div class="vg-sbody" data-body></div>
      <div class="vg-sfoot"><button class="vg-sreact" data-r="🔥">🔥</button><button class="vg-sreact" data-r="😂">😂</button><button class="vg-sreact" data-r="😍">😍</button><button class="vg-sreact" data-r="💜">💜</button><button class="btn sm" data-prof>Профиль</button></div>`;
    app().appendChild(el);
    setG({ seenSt: Object.assign({}, G().seenSt, { [a.id]: d }) });
    let i = 0, t = null;
    const bars = el.querySelectorAll(".vg-sbars b");
    const show = () => {
      if (i >= frames.length) return close();
      if (i < 0) i = 0;
      const f = frames[i];
      el.querySelector("[data-body]").innerHTML = photo(Object.assign({}, f, { st: null }), "story") + `<div class="vg-stext">${esc(f.st)}</div>`;
      bars.forEach((b, k) => { b.style.transition = "none"; b.style.width = k < i ? "100%" : "0%"; });
      void el.offsetWidth;
      bars[i].style.transition = "width 3.8s linear"; bars[i].style.width = "100%";
      clearTimeout(t); t = setTimeout(() => { i++; show(); }, 3800);
    };
    const close = () => { clearTimeout(t); el.classList.add("out"); setTimeout(() => el.remove(), 260); storyClose = null; const st = document.querySelector(`.vg-st[data-id="${a.id}"] .vg-ava-w`); if (st) { st.classList.remove("ring"); st.classList.add("seen"); } };
    storyClose = close;
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-x]")) return close();
      const r = e.target.closest("[data-r]");
      if (r) { FX.burst(r, { emojis: [r.dataset.r], count: 10 }); FX.sound.like(); if (!a.star) relBump(a.id, 1); return; }
      if (e.target.closest("[data-prof]")) { close(); Vibe.go("gram-profile", { id: a.id }); return; }
      if (e.target.closest("[data-body]")) { i += e.clientX < el.getBoundingClientRect().left + el.clientWidth / 3 ? -1 : 1; show(); }
    });
    show();
  }

  /* ---------- Табы ленты ---------- */
  let curTab = "feed";
  let refreshFn = null;
  const refresh = () => refreshFn && refreshFn();

  function tabFeed() {
    const list = feedPosts();
    return `${storiesRow()}<div class="vg-feed">${list.map(postHtml).join("") || `<div class="card" style="text-align:center"><div style="font-size:48px">📭</div><b>Лента пуста. Подпишись на кого-нибудь!</b></div>`}</div>
      <div class="fine" style="text-align:center;margin:10px 0 30px">Ты посмотрел всё за 3 дня. Алгоритм подготовит ещё. Мы заботимся о твоём времени 💜</div>`;
  }
  function tabReels() {
    return `<button class="card c-black tap vg-reelhero" data-go="reels" data-params='{"i":"0"}'>
        <div><div class="display" style="font-size:24px;color:var(--lime)">Рилсы ▶</div><small style="color:#bdbac8;font-weight:700">30 рилсов. 30 минут жизни. Вернём? Нет</small></div><span class="emo float" style="font-size:52px">🌀</span></button>
      <div class="vg-rgrid stagger">${REELS.map((r) => `<button class="vg-rthumb tap" data-go="reels" data-params='{"i":"${r.i}"}'>${reelScene(r, true)}<span class="vg-rviews">▶ ${kfmt(r.views)}</span></button>`).join("")}</div>`;
  }
  function tabStars() {
    const g = G(), ok = canDM();
    return `${storiesRow()}
      <div class="card ${ok ? "c-lime" : "c-black"}" style="margin-bottom:14px">
        <b style="font-size:16px">${ok ? "✅ Звёзды читают тебя и отвечают" : "🔒 Звёзды отвечают не всем"}</b>
        <p style="margin:6px 0 0;font-size:13px;font-weight:700;${ok ? "" : "color:#bdbac8"}">Ответ в личке — только для Инфлюенсеров (100 тыс+), Селеб и тех, у кого на счету от ${money(1000000)}. Остальным — «прочитано» ✓✓</p>
      </div>
      <div class="stack stagger">${allStars().map((s) => `
        <div class="card tight vg-starrow">
          <button class="vg-who" data-vg="open" data-id="${s.id}">${ava(s, 54, true, g.seenSt[s.id] === today())}<span><b>${esc(s.n)}${verified(s)}</b><small>${esc(s.niche || "Блогер")} · ${kfmt(s.followers)}</small></span></button>
          <button class="btn sm ${g.follow[s.id] ? "" : "black"}" data-follow="${s.id}">${g.follow[s.id] ? "Вы подписаны" : "Подписаться"}</button>
        </div>`).join("")}</div>`;
  }
  function deal() {
    const ti = tierIdx();
    if (ti < 2 || G().dealDay === today()) return null;
    const BR = ["Йогурт «Позитив»", "Кроссовки «Скороход Вайб»", "Энергетик «ЗАРЯД»", "Матрас «Облако 9»", "Курсы «Успешный успех»", "Чай «Душевный»", "Наушники «Тишина Pro»", "Пельмени «Как у мамы»"];
    const r = rng(hash("deal" + today()));
    const brand = pickR(r, BR);
    const rate = [0, 0, 0.25, 0.35, 0.5][ti];
    return { brand, fee: Math.round((followers() * rate * (0.8 + r() * 0.4)) / 100) * 100 };
  }
  function tabMe() {
    const g = G(), f = followers(), ti = tierIdx(f), t = TIERS[ti], nx = TIERS[ti + 1];
    const m = me();
    const posts = myPosts();
    const pr = nx ? clamp(Math.log10(Math.max(1, f) / Math.max(1, t.at)) / Math.log10(nx.at / Math.max(1, t.at)), 0, 1) : 1;
    const dl = deal();
    const achs = Vibe.ACH_LIST ? Vibe.ACH_LIST() : [];
    const have = S().achievements || [];
    return `
      <div class="vg-meprof">
        <div class="vg-mehead">
          <span class="vg-bigava ${ti === 4 ? "celeb" : ""}">${ava(m, 86, true)}</span>
          <div class="vg-counts">
            <div><b>${posts.length}</b><small>постов</small></div>
            <div><b data-myf>${kfmt(f)}</b><small>подписчиков</small></div>
            <div><b>${Object.keys(g.follow).length + chars().length}</b><small>подписок</small></div>
          </div>
        </div>
        <b style="font-size:17px">${esc(m.n)}${ti >= 3 ? `<span class="vg-ver">✔</span>` : ""}</b>
        <div class="muted" style="font-weight:800;font-size:13px">${esc(m.handle)}</div>
        <div class="card tight ${t.c}" style="margin:12px 0">
          <div style="display:flex;justify-content:space-between;align-items:center"><b>${t.e} ${t.n}</b><small style="font-weight:800">${nx ? `до «${nx.n}»: ${kfmt(nx.at - f)}` : "Ты на вершине. Держись"}</small></div>
          <div class="progress" style="margin-top:8px"><i style="width:${Math.round(pr * 100)}%"></i></div>
          <div class="vg-ladder">${TIERS.map((x, k) => `<span class="${k <= ti ? "on" : ""}">${x.e}</span>`).join("")}</div>
          <div class="fine" style="margin-top:6px">Слава ${fame()}/100. Подписчики растут от качества: редкие моменты, прайм-тайм, тренды, настроение и внешность. Каждые новые 10× даются тяжелее.</div>
        </div>
        <h2 class="sec" style="margin-top:4px">Достижения <small>${have.length} из ${achs.length}</small></h2>
        <div class="vg-hl hscroll">${achs.map(([id, a]) => `<button class="vg-hlc ${have.includes(id) ? "on" : ""}" data-ach="${id}"><span>${have.includes(id) ? a.e : "🔒"}</span><small>${esc(a.t)}</small></button>`).join("")}</div>
        ${dl ? `<div class="card c-yellow vg-deal"><div class="sticker" style="top:10px;right:10px;background:var(--pink)">Бренд</div><b style="font-size:17px">🤝 ${esc(dl.brand)} хочет интеграцию</b><p style="margin:6px 0 10px;font-weight:700;font-size:13px">Гонорар ${money(dl.fee)}. Подписчики слегка расстроятся.</p><button class="btn black sm" data-deal>Взять интеграцию</button></div>` : ti < 2 ? `<div class="card tight c-white" style="margin-bottom:12px"><b>🔒 Рекламные интеграции</b><div class="muted" style="font-size:12px;font-weight:700">Бренды приходят с 10 тыс подписчиков. Платят в ₫, иногда</div></div>` : ""}
        <button class="btn grad block xl" data-vg="newpost" style="margin:6px 0 14px">📸 Новый пост${g.drafts.length ? ` · моментов: ${g.drafts.length}` : ""}</button>
        <div class="vg-grid">${posts.map((p) => { cache.set(p.id, p); return `<button class="vg-gtile" data-tile="${p.id}">${photo(p, "sm")}<span class="vg-gl">❤️ ${kfmt(myLikes(p))}</span></button>`; }).join("") || `<div class="card" style="grid-column:1/-1;text-align:center"><div style="font-size:44px">📷</div><b>Альбом пуст</b><div class="muted" style="font-weight:700;font-size:13px">Живи — и постим лучшие моменты. Vibe напомнит</div></div>`}</div>
      </div>`;
  }

  /* ---------- Экран "gram" ---------- */
  Vibe.screen("gram", {
    render(p) {
      if (p.tab) curTab = p.tab;
      const tabs = [["feed", "Лента"], ["reels", "Рилсы"], ["me", "Мой профиль"], ["stars", "Звёзды"]];
      return `
      <div class="head"><button class="icon-btn" data-back aria-label="Назад">←</button>
        <div class="title"><span class="vg-logo">Vibegram</span><small>${TIERS[tierIdx()].e} ${kfmt(followers())} подписчиков · ${Vibe.ui.clock()}</small></div>
        <button class="icon-btn" data-vg="activity">❤️</button>
      </div>
      <div class="chips vg-tabs" data-tabs>${tabs.map(([k, n]) => `<button class="chip ${curTab === k ? "on" : ""}" data-tab="${k}">${n}</button>`).join("")}</div>
      <div data-body></div>`;
    },
    mount(root) {
      injectCss();
      const body = root.querySelector("[data-body]");
      const draw = () => {
        body.innerHTML = { feed: tabFeed, reels: tabReels, me: tabMe, stars: tabStars }[curTab]();
        body.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 12))));
      };
      draw();
      refreshFn = draw;
      bindPostClicks(root);
      root.querySelector("[data-tabs]").addEventListener("click", (e) => {
        const b = e.target.closest("[data-tab]"); if (!b || b.dataset.tab === curTab) return;
        curTab = b.dataset.tab;
        root.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
        FX.bump(b); draw();
      });
      root.addEventListener("click", (e) => {
        const st = e.target.closest('[data-vg="story"]'); if (st) return openStory(st.dataset.id);
        if (e.target.closest('[data-vg="newpost"]')) return newPost();
        if (e.target.closest('[data-vg="activity"]')) return activity();
        const fo = e.target.closest("[data-follow]"); if (fo) return follow(fo.dataset.follow, fo);
        const tl = e.target.closest("[data-tile]"); if (tl) { const p = cache.get(tl.dataset.tile); if (p) postSheet(p); return; }
        const ac = e.target.closest("[data-ach]"); if (ac) return achSheet(ac.dataset.ach);
        if (e.target.closest("[data-deal]")) { const d = deal(); if (d) composer({ kind: "ad", e: pick(["🥤", "👟", "🛏️", "🍵", "🎧", "🥟"]), s: "💸✨🤝", bg: 3, text: `Обожаю ${d.brand}! Пользуюсь каждый день (с сегодняшнего)`, tags: ["реклама"], sug: [] }, { deal: d }); }
      });
      const iv = setInterval(() => {
        root.querySelectorAll("[data-likes]").forEach((el) => { const p = cache.get(el.dataset.likes); if (p) { const v = fmt(likesOf(p)); if (el.textContent !== v) { el.textContent = v; FX.bump(el); } } });
        const mf = root.querySelector("[data-myf]"); if (mf) mf.textContent = kfmt(followers());
      }, 3000);
      return () => { clearInterval(iv); refreshFn = null; if (storyClose) storyClose(); };
    },
  });

  function follow(id, btn) {
    const g = G(), fo = Object.assign({}, g.follow);
    if (fo[id]) { delete fo[id]; FX.toast("Отписка. Алгоритм всё равно будет показывать", "🙈", 1800); }
    else { fo[id] = true; FX.sound.pop(); FX.burst(btn, { emojis: ["💜", "✨", "➕"], count: 8 }); }
    setG({ follow: fo });
    if (btn) { btn.textContent = fo[id] ? "Вы подписаны" : "Подписаться"; btn.classList.toggle("black", !fo[id]); FX.bump(btn); }
  }
  function achSheet(id) {
    const a = (Vibe.ACH || {})[id]; if (!a) return;
    const have = (S().achievements || []).includes(id);
    Vibe.ui.sheet(`<div style="text-align:center"><div class="emo float" style="font-size:80px">${have ? a.e : "🔒"}</div><div class="display" style="font-size:26px">${esc(a.t)}</div><p class="muted" style="font-weight:700">${esc(a.d)}</p>
      ${have ? `<button class="btn black block" data-pa>📸 Запостить в блог</button>` : `<div class="card tight c-lilac"><b>Ещё не открыто.</b> Корпорация верит в тебя 💜</div>`}</div>`, {
      onMount(sh, close) { const b = sh.querySelector("[data-pa]"); if (b) b.addEventListener("click", () => { close(); setTimeout(() => composer(makeMoment("ach", { t: a.t }, a.e)), 320); }); },
    });
  }
  function activity() {
    const ps = myPosts().slice(0, 8);
    const rows = [];
    ps.forEach((p) => {
      const cs = commentsOf(p).filter((c) => !c.mine).slice(-2);
      cs.forEach((c) => rows.push(`<div class="li"><div class="ic c-pink">${c.e}</div><div class="tx"><b>${esc(c.a)}</b><small>прокомментировал(а): ${esc(c.t)}</small></div></div>`));
      if (myLikes(p)) rows.push(`<div class="li"><div class="ic c-yellow">❤️</div><div class="tx"><b>${fmt(myLikes(p))} отметок</b><small>«${esc(p.text.slice(0, 40))}»</small></div></div>`);
    });
    Vibe.ui.sheet(`<div class="display" style="font-size:22px;margin-bottom:8px">Активность</div><div class="card flat" style="padding:4px 14px;max-height:55vh;overflow:auto">${rows.join("") || `<p class="muted" style="font-weight:700">Пока никто тебя не заметил. Это нормально. Сначала все никто 🫥</p>`}</div>`);
  }

  /* ---------- Экран профиля ---------- */
  Vibe.screen("gram-profile", {
    render(p) {
      const a = acc(p.id);
      if (!a) return `${Vibe.ui.head("Vibegram")}<div class="card" style="text-align:center"><div style="font-size:48px">🫥</div><b>Аккаунт не найден</b><p class="muted">Возможно, его забанила Корпорация. Из заботы.</p></div>`;
      const g = G();
      const posts = accPosts(a, 10).slice(0, 15);
      const fol = a.char && !a.star ? true : !!g.follow[a.id];
      const ok = !a.star || canDM();
      return `
      ${Vibe.ui.head(esc(a.handle), a.star ? "Подтверждённый аккаунт" : a.kind === "family" ? "Семья" : "Близкий человек")}
      <div class="vg-mehead">
        <button class="vg-bigava" data-vg="story" data-id="${a.id}">${ava(a, 86, true, g.seenSt[a.id] === today())}</button>
        <div class="vg-counts">
          <div><b>${posts.length + (a.star ? 1200 + (hash(a.id) % 3000) : 20 + (hash(a.id) % 140))}</b><small>постов</small></div>
          <div><b>${kfmt(a.followers + (fol && a.star ? 1 : 0))}</b><small>подписчиков</small></div>
          <div><b>${a.star ? 7 + (hash(a.id) % 40) : 80 + (hash(a.id) % 300)}</b><small>подписок</small></div>
        </div>
      </div>
      <b style="font-size:17px">${esc(a.n)}${verified(a)}</b>
      ${a.niche ? `<div class="badge" style="background:var(--lilac);margin:4px 0">${esc(a.niche)}</div>` : ""}
      <p style="margin:4px 0 12px;font-weight:600;font-size:14px;line-height:1.35">${esc(a.bio)}</p>
      ${a.char && Vibe.chars && Vibe.chars.hearts ? `<div class="vg-hearts">${(() => { const h = Vibe.chars.hearts(a.id) || 0; return "❤️".repeat(Math.round(h / 2)) + "🤍".repeat(5 - Math.round(h / 2)); })()}</div>` : ""}
      <div style="display:flex;gap:8px;margin-bottom:14px">
        ${a.char && !a.star ? `<button class="btn sm" style="flex:1" disabled>Друзья 💞</button>` : `<button class="btn sm ${fol ? "" : "black"}" style="flex:1" data-follow="${a.id}">${fol ? "Вы подписаны" : "Подписаться"}</button>`}
        <button class="btn sm ${ok ? "lime" : ""}" style="flex:1" data-dm>${ok ? "Написать" : "Написать 🔒"}</button>
      </div>
      ${a.star && !ok ? `<div class="fine" style="margin:-6px 0 12px">Звезда читает личку. Отвечает — Инфлюенсерам, Селебам и владельцам ${money(1000000)}+</div>` : ""}
      ${posts.length ? `<div class="vg-grid">${posts.map((p) => { cache.set(p.id, p); return `<button class="vg-gtile" data-tile="${p.id}">${photo(p, "sm")}<span class="vg-gl">❤️ ${kfmt(likesOf(p))}</span></button>`; }).join("")}</div>` : `<div class="card" style="text-align:center"><div style="font-size:40px">📷</div><b>Пока без постов</b></div>`}
      ${a.star ? `<h2 class="sec">Рилсы автора</h2><div class="vg-rgrid">${REELS.filter((r) => r.a === a.id).map((r) => `<button class="vg-rthumb tap" data-go="reels" data-params='{"i":"${r.i}"}'>${reelScene(r, true)}<span class="vg-rviews">▶ ${kfmt(r.views)}</span></button>`).join("")}</div>` : ""}`;
    },
    mount(root, p) {
      injectCss();
      const a = acc(p.id);
      if (!a) return;
      bindPostClicks(root);
      root.addEventListener("click", (e) => {
        if (e.target.closest('[data-vg="story"]')) return openStory(a.id);
        const fo = e.target.closest("[data-follow]"); if (fo) return follow(a.id, fo);
        const tl = e.target.closest("[data-tile]"); if (tl) { const q = cache.get(tl.dataset.tile); if (q) postSheet(q); return; }
        if (e.target.closest("[data-dm]")) dm(a);
      });
      return () => { if (storyClose) storyClose(); };
    },
  });

  const botsReg = {};
  function dm(a) {
    if (a.official) { if (Vibe.screens.chat) Vibe.go("chat", { id: "zabotik" }); return; }
    if (Vibe.msg && Vibe.screens.chat) {
      if (a.star && Vibe.msg.addBot && !botsReg[a.id] && !(Vibe.chars && Vibe.chars.get && Vibe.chars.get(a.id))) {
        botsReg[a.id] = true;
        try { Vibe.msg.addBot(a.id, { n: a.n, e: a.e, reply: () => (canDM() ? pick(a.dm && a.dm.length ? a.dm : ["Спасибо 💫"]) : null) }); } catch (err) {}
      }
      Vibe.go("chat", { id: a.id });
      return;
    }
    // Запасной мини-директ, если мессенджера нет
    Vibe.ui.sheet(`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">${ava(a, 44)}<div><b>${esc(a.n)}</b><div class="muted" style="font-size:12px;font-weight:800">${esc(a.handle)}</div></div></div>
      <div class="vg-dm" data-box></div>
      <div style="display:flex;gap:8px;margin-top:10px"><div class="field" style="flex:1;height:50px"><input data-in maxlength="200" placeholder="Сообщение…"></div><button class="icon-btn" data-send style="width:50px;height:50px;background:var(--lime)">➤</button></div>`, {
      onMount(sh) {
        const box = sh.querySelector("[data-box]"), inp = sh.querySelector("[data-in]");
        const timers = [];
        const add = (t, side) => { const m = document.createElement("div"); m.className = "msg " + side; m.textContent = t; box.appendChild(m); box.scrollTop = box.scrollHeight; return m; };
        sh.querySelector("[data-send]").addEventListener("click", () => {
          const t = inp.value.trim(); if (!t) return; inp.value = "";
          add(t, "out"); FX.sound.pop();
          if (a.star && !canDM()) { timers.push(setTimeout(() => { const r = document.createElement("div"); r.className = "vg-read"; r.textContent = "Прочитано ✓✓"; box.appendChild(r); }, 1400)); return; }
          timers.push(setTimeout(() => { add(a.star ? pick(a.dm || ["💫"]) : pick(CHAR_CM[a.id] || ["😊", "Ага!", "Давай!"]), "in"); FX.sound.pop(); }, 1600));
          if (!a.star) relBump(a.id, 1);
        });
      },
    });
  }

  /* ---------- Экран "reels" ---------- */
  Vibe.screen("reels", {
    render() {
      const g = G();
      return `<div class="vg-reels" data-reels>
        ${REELS.map((r) => { const a = reelAcc(r); const lk = !!g.reelLiked[r.i]; return `
        <section class="vg-reel" data-ri="${r.i}">
          ${reelScene(r)}
          <div class="vg-sub" data-sub>${esc(r.subs[0])}</div>
          <span class="vg-rheart">❤️</span>
          <div class="vg-rail">
            <button class="vg-rbtn" data-ra="prof" data-id="${a.id}">${ava(a, 46)}</button>
            <button class="vg-rbtn" data-ra="like" data-i="${r.i}"><span>${lk ? "❤️" : "🤍"}</span><small data-rl>${kfmt(r.likes + (lk ? 1 : 0))}</small></button>
            <button class="vg-rbtn" data-ra="cm" data-i="${r.i}"><span>💬</span><small>${kfmt(r.cms)}</small></button>
            <button class="vg-rbtn" data-ra="share"><span>📤</span><small>Отпр.</small></button>
            <span class="vg-disc">🎵</span>
          </div>
          <div class="vg-rinfo">
            <b>${esc(a.handle)}${a.star ? " ✔" : ""}</b>
            <div>${esc(r.cap)}</div>
            <div class="vg-music"><span>♪ ${esc(r.music)} · ♪ ${esc(r.music)} ·</span></div>
          </div>
          <div class="vg-rprog"><i></i></div>
        </section>`; }).join("")}
      </div>
      <button class="vg-rback" data-back>←</button><div class="vg-rtitle">Рилсы</div>`;
    },
    mount(root, p) {
      injectCss();
      root.classList.add("vg-reels-screen");
      const box = root.querySelector("[data-reels]");
      const start = clamp(parseInt(p.i, 10) || 0, 0, REELS.length - 1);
      requestAnimationFrame(() => { box.scrollTop = start * box.clientHeight; });
      let active = null, subT = null, subI = 0, seen = 0;
      const timers = [];
      const activate = (sec) => {
        if (active === sec) return;
        if (active) active.classList.remove("on", "paused");
        active = sec; sec.classList.add("on");
        const r = REELS[+sec.dataset.ri];
        subI = 0;
        const sub = sec.querySelector("[data-sub]");
        clearInterval(subT);
        const step = Math.max(900, Math.round((60 / r.bpm) * 4 * 1000));
        sub.textContent = r.subs[0];
        subT = setInterval(() => { if (sec.classList.contains("paused")) return; subI = (subI + 1) % r.subs.length; sub.textContent = r.subs[subI]; sub.classList.remove("pop"); void sub.offsetWidth; sub.classList.add("pop"); }, step);
        seen++;
        const n = (G().reelsSeen || 0) + 1;
        setG({ reelsSeen: n });
        if (n >= 50) Vibe.achieve && Vibe.achieve("gram_reels");
        if (seen > 0 && seen % 12 === 0) FX.toast(pick(["Ты посмотрел ещё 12 рилсов. Вайбот гордится. Время — нет", "Перерыв? Шучу, вот ещё 💜", "Глаза устали? Купи капли в Vibe Health 👀"]), "🌀", 2600);
      };
      const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting && en.intersectionRatio > 0.6) activate(en.target); }), { root: box, threshold: [0.6] });
      box.querySelectorAll(".vg-reel").forEach((s) => io.observe(s));
      let tapT = null, lastT = 0;
      const likeReel = (i, force) => {
        const g = G(), lk = Object.assign({}, g.reelLiked);
        if (force && lk[i]) return;
        if (lk[i]) delete lk[i]; else lk[i] = 1;
        setG({ reelLiked: lk });
        const sec = box.querySelector(`[data-ri="${i}"]`);
        const b = sec.querySelector('[data-ra="like"]');
        b.querySelector("span").textContent = lk[i] ? "❤️" : "🤍";
        b.querySelector("[data-rl]").textContent = kfmt(REELS[i].likes + (lk[i] ? 1 : 0));
        FX.bump(b);
        if (lk[i]) FX.sound.like();
      };
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-ra]");
        if (b) {
          const a = b.dataset.ra;
          if (a === "like") { likeReel(+b.dataset.i); if (G().reelLiked[b.dataset.i]) FX.burst(b, { emojis: ["❤️", "💖"], count: 8, spread: 60 }); }
          else if (a === "prof") Vibe.go("gram-profile", { id: b.dataset.id });
          else if (a === "share") { FX.toast("Отправлено в чат «Семья». Мама не поймёт, но лайкнет", "📤", 2200); FX.bump(b); }
          else if (a === "cm") {
            const r = REELS[+b.dataset.i], rr = rng(hash("rcm" + r.i));
            const list = Array.from({ length: 8 + Math.floor(rr() * 6) }, () => { const u = pickR(rr, RAND_USERS); return { a: u[0], e: u[1], t: pickR(rr, CM_GEN) }; });
            const a0 = reelAcc(r);
            if (a0.char && !a0.star) list.unshift(...chars().filter((c) => c.id !== a0.id).slice(0, 2).map((c) => ({ a: c.handle, e: c.e, t: pick(CHAR_CM[c.id] || ["🔥"]) })));
            commentsSheet(list, { title: "Комментарии", onSend: () => Vibe.reward && Vibe.reward({ xp: 2, silent: true }) });
          }
          return;
        }
        const sec = e.target.closest(".vg-reel"); if (!sec) return;
        const t = Date.now();
        if (t - lastT < 300) {
          clearTimeout(tapT); lastT = 0;
          const h = sec.querySelector(".vg-rheart");
          const rc = sec.getBoundingClientRect();
          h.style.left = e.clientX - rc.left + "px"; h.style.top = e.clientY - rc.top + "px";
          h.classList.remove("go"); void h.offsetWidth; h.classList.add("go");
          FX.burst(e, { emojis: ["❤️", "💖", "💘", "✨"], count: 14, spread: 130 });
          likeReel(+sec.dataset.ri, true);
          FX.sound.like();
        } else {
          lastT = t;
          clearTimeout(tapT);
          tapT = setTimeout(() => { sec.classList.toggle("paused"); FX.sound.tap(); }, 300);
        }
      });
      return () => { io.disconnect(); clearInterval(subT); clearTimeout(tapT); timers.forEach(clearTimeout); };
    },
  });

  /* ---------- Фоновый цикл блога: созревание постов, уровни славы, уведомления ---------- */
  let lastToast = 0, lastLikeSum = null;
  function tick() {
    if (!S().profile || document.hidden) return;
    const g = G();
    let changed = false;
    let base = g.base;
    const posts = g.posts.map((p) => {
      if (!p.settled && prog(p) > 0.98) { base += p.F; changed = true; return Object.assign({}, p, { settled: true }); }
      return p;
    });
    const d = today();
    let decayDay = g.decayDay;
    if (decayDay !== d) {
      decayDay = d; changed = true;
      const lastAt = g.posts[0] ? Math.floor(g.posts[0].at / 1440) : d;
      if (g.posts.length && d - lastAt >= 2 && base > 50) { const lost = Math.round(base * 0.01 * Math.min(5, d - lastAt - 1)); base -= lost; if (lost > 0) FX.toast(`−${kfmt(lost)} подписчиков. Блог скучает без тебя`, "📉", 2400); }
    }
    if (changed) setG({ base: Math.max(0, base), posts, decayDay });
    // Уровень славы
    const ti = tierIdx();
    const tm = G().tierMax || 0;
    if (ti > tm) {
      setG({ tierMax: ti });
      const t = TIERS[ti];
      if (t.ach && Vibe.achieve) Vibe.achieve(t.ach);
      if (!document.querySelector(".modal")) {
        FX.confetti();
        Vibe.modal(`<div class="m-emo float">${t.e}</div><div class="display">Ты — ${t.n}!</div>
          <p>${kfmt(followers())} подписчиков в Vibegram. ${ti >= 4 ? "Звёзды отвечают, бренды платят, мама показывает соседям." : ti >= 3 ? "Теперь звёзды отвечают тебе в личку. Не зазнавайся." : ti >= 2 ? "Бренды уже выстраиваются в очередь (в очередь из одного бренда)." : "Корпорация заметила тебя. Это хорошо. Наверное."}</p>
          <button class="btn black block" data-close>Я звезда ✨</button>`, { sound: null });
      }
    }
    // Уведомления о лайках
    const sum = G().posts.reduce((s, p) => s + myLikes(p), 0);
    if (lastLikeSum === null) lastLikeSum = sum;
    else if (sum - lastLikeSum >= 5 && Date.now() - lastToast > 45000 && !(Vibe.current && Vibe.current.route.name === "reels")) {
      FX.toast(`+${kfmt(sum - lastLikeSum)} ❤️ в Vibegram. Тебя любят (алгоритмически)`, "📸", 2200);
      lastLikeSum = sum; lastToast = Date.now();
    }
  }
  setInterval(tick, 7000);

  /* ---------- Публичный API ---------- */
  Vibe.gram = {
    post, followers, fame, canDM, tier: () => Object.assign({ i: tierIdx() }, TIERS[tierIdx()]), TIERS,
    stars: allStars, account: acc, moment: (kind, d, e) => moment(makeMoment(kind, d || {}, e)),
    open: (id) => (id === "me" ? Vibe.go("gram", { tab: "me" }) : Vibe.go("gram-profile", { id })),
    drafts: () => G().drafts, posts: () => G().posts,
  };

  /* ---------- Стили ---------- */
  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement("style");
    st.textContent = `
    .vg-logo { font-family: var(--font-logo); font-size: 26px; background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .vg-tabs { margin-bottom: 6px; }
    .vg-ava-w { --s: 40px; width: var(--s); height: var(--s); border-radius: 50%; display: inline-grid; place-items: center; flex: 0 0 auto; position: relative; }
    .vg-ava-w.ring { background: var(--holo); background-size: 300% 300%; animation: holo 5s linear infinite; padding: 3px; }
    .vg-ava-w.seen { background: #c9c6d3; padding: 3px; }
    .vg-ava { width: 100%; height: 100%; border-radius: 50%; border: 2px solid var(--ink); display: grid; place-items: center; font-size: calc(var(--s) * .52); line-height: 1; }
    .vg-ver { display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; background: var(--blue); color: #fff; font-size: 10px; margin-left: 4px; vertical-align: 1px; border: 1.5px solid var(--ink); }
    .vg-stories { gap: 10px; padding-top: 6px; }
    .vg-st { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 70px; position: relative; }
    .vg-st small { font-size: 11px; font-weight: 800; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vg-st-plus { position: absolute; top: 44px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: var(--lime); border: 2px solid var(--ink); font-weight: 900; display: grid; place-items: center; font-size: 15px; }
    .vg-post { background: var(--paper); border: var(--line); border-radius: var(--r); box-shadow: var(--shadow); margin-bottom: 16px; overflow: hidden; }
    .vg-ph-head { display: flex; align-items: center; padding: 10px 12px; gap: 8px; }
    .vg-who { display: flex; align-items: center; gap: 10px; text-align: left; flex: 1; min-width: 0; }
    .vg-who > span:last-child { min-width: 0; }
    .vg-who b { display: block; font-size: 14px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vg-who small { display: block; font-size: 11px; font-weight: 700; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vg-more { font-size: 22px; font-weight: 900; width: 34px; }
    .vg-photo { position: relative; border-top: var(--line); border-bottom: var(--line); }
    .vg-ph { position: relative; aspect-ratio: 1; overflow: hidden; display: grid; place-items: center; }
    .vg-ph::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 30% 20%, rgba(255,255,255,.35), transparent 50%); pointer-events: none; }
    .vg-ph-main { font-size: 46cqw; font-size: min(46vw, 170px); line-height: 1; filter: drop-shadow(0 6px 0 rgba(14,14,18,.25)); animation: float 3.5s ease-in-out infinite; }
    .vg-ph-s { position: absolute; font-size: min(13vw, 50px); line-height: 1; animation: float 3s ease-in-out infinite; }
    .vg-ph-s.s0 { top: 9%; left: 9%; animation-delay: -.6s; } .vg-ph-s.s1 { top: 12%; right: 10%; animation-delay: -1.4s; } .vg-ph-s.s2 { bottom: 9%; left: 14%; animation-delay: -2.1s; }
    .vg-ph-st { position: absolute; bottom: 8%; right: 6%; background: var(--yellow); border: 2px solid var(--ink); border-radius: 10px; padding: 3px 8px; font-weight: 900; font-size: 12px; transform: rotate(-5deg); }
    .vg-ph.sm .vg-ph-main { font-size: 46px; animation: none; } .vg-ph.sm .vg-ph-s { font-size: 16px; animation: none; }
    .vg-ph.story { position: absolute; inset: 0; aspect-ratio: auto; }
    .vg-ph.story .vg-ph-main { font-size: 160px; }
    .vg-bigheart { position: absolute; left: 50%; top: 50%; font-size: 110px; transform: translate(-50%,-50%) scale(0); pointer-events: none; opacity: 0; filter: drop-shadow(0 4px 0 var(--ink)); }
    .vg-bigheart.go, .vg-rheart.go { animation: vg-heart .9s var(--spring) both; }
    @keyframes vg-heart { 0% { transform: translate(-50%,-50%) scale(0) rotate(-15deg); opacity: 1; } 35% { transform: translate(-50%,-50%) scale(1.25) rotate(8deg); opacity: 1; } 70% { transform: translate(-50%,-50%) scale(1) rotate(0); opacity: 1; } 100% { transform: translate(-50%,-110%) scale(.8); opacity: 0; } }
    .vg-acts { display: flex; gap: 4px; padding: 6px 8px 0; }
    .vg-act { font-size: 25px; width: 42px; height: 40px; transition: transform .2s var(--spring); }
    .vg-act:active { transform: scale(.8); }
    .vg-likes { padding: 0 14px; font-size: 14px; font-weight: 700; }
    .vg-likes b { font-weight: 900; }
    .vg-cap { padding: 4px 14px 2px; font-size: 14px; line-height: 1.35; font-weight: 600; overflow-wrap: anywhere; }
    .vg-cap b { font-weight: 900; margin-right: 4px; }
    .vg-tag { color: var(--blue); font-weight: 800; }
    .vg-cmlink { padding: 4px 14px 12px; font-size: 13px; color: var(--muted); font-weight: 700; text-align: left; }
    .vg-cms { max-height: 46vh; overflow-y: auto; margin-bottom: 8px; }
    .vg-cm { display: flex; gap: 10px; padding: 8px 0; font-size: 14px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
    .vg-cm.mine { background: var(--lime); border-radius: 14px; padding: 8px; }
    .vg-cm-a { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--ink); display: grid; place-items: center; flex: 0 0 auto; background: #fff; font-size: 18px; }
    .vg-cm b { font-weight: 900; }
    .vg-cm small { display: block; color: var(--muted); font-size: 11px; font-weight: 700; margin-top: 2px; }
    .vg-sheetpost .vg-post { box-shadow: none; margin: 0; }
    .vg-reelhero { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; margin-bottom: 14px; }
    .vg-rgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 20px; }
    .vg-rthumb { position: relative; border: 2px solid var(--ink); border-radius: 14px; overflow: hidden; aspect-ratio: 9/16; }
    .vg-rviews { position: absolute; left: 6px; bottom: 6px; color: #fff; font-weight: 900; font-size: 11px; text-shadow: 0 1px 2px #000; }
    .vg-scene { position: absolute; inset: 0; overflow: hidden; }
    .vg-actor { position: absolute; transform: translate(-50%, -50%); line-height: 1; }
    .vg-an { display: inline-block; animation-duration: calc(var(--beat) * 2); animation-iteration-count: infinite; animation-timing-function: ease-in-out; animation-play-state: paused; filter: drop-shadow(0 5px 0 rgba(14,14,18,.3)); }
    .vg-reel.on:not(.paused) .vg-an, .vg-reel.on:not(.paused) .vg-beatring { animation-play-state: running; }
    .vg-an-bounce { animation-name: vg-bounce; animation-duration: var(--beat); }
    .vg-an-dance { animation-name: vg-dance; }
    .vg-an-walkR { animation-name: vg-walk; animation-duration: calc(var(--beat) * 8); animation-direction: alternate; }
    .vg-an-walkL { animation-name: vg-walk; animation-duration: calc(var(--beat) * 8); animation-direction: alternate-reverse; }
    .vg-an-spin { animation-name: vg-spin; animation-timing-function: linear; animation-duration: calc(var(--beat) * 4); }
    .vg-an-shake { animation-name: vg-shake; animation-duration: calc(var(--beat) / 2); }
    .vg-an-float { animation-name: vg-float; animation-duration: calc(var(--beat) * 4); }
    .vg-an-fall { animation-name: vg-fall; animation-duration: calc(var(--beat) * 4); animation-timing-function: ease-in; }
    .vg-an-zoom { animation-name: vg-zoom; }
    .vg-an-jump { animation-name: vg-jump; animation-duration: calc(var(--beat) * 2); }
    .vg-an-orbit { animation-name: vg-orbit; animation-duration: calc(var(--beat) * 4); animation-timing-function: linear; }
    .vg-an-pulse { animation-name: vg-pulse; animation-duration: var(--beat); }
    @keyframes vg-bounce { 0%,100% { transform: translateY(0) scale(1,1); } 30% { transform: translateY(-26px) scale(.95,1.06); } 60% { transform: translateY(0) scale(1.08,.92); } }
    @keyframes vg-dance { 0%,100% { transform: rotate(-12deg) translateX(-8px); } 50% { transform: rotate(12deg) translateX(8px); } }
    @keyframes vg-walk { 0% { transform: translateX(-120px) rotate(-6deg); } 25% { transform: translateX(-60px) translateY(-8px) rotate(6deg); } 50% { transform: translateX(0) rotate(-6deg); } 75% { transform: translateX(60px) translateY(-8px) rotate(6deg); } 100% { transform: translateX(120px) rotate(-6deg); } }
    @keyframes vg-spin { to { transform: rotate(360deg); } }
    @keyframes vg-shake { 0%,100% { transform: translate(0,0) rotate(0); } 25% { transform: translate(-5px,2px) rotate(-4deg); } 75% { transform: translate(5px,-2px) rotate(4deg); } }
    @keyframes vg-float { 0%,100% { transform: translateY(-12px); } 50% { transform: translateY(12px); } }
    @keyframes vg-fall { 0% { transform: translateY(-200px) rotate(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(560px) rotate(200deg); opacity: 1; } }
    @keyframes vg-zoom { 0%,100% { transform: scale(.85); } 50% { transform: scale(1.25); } }
    @keyframes vg-jump { 0%,100% { transform: translateY(0) scale(1.1,.9); } 15% { transform: translateY(0) scale(.9,1.1); } 45% { transform: translateY(-90px) rotate(-8deg); } 75% { transform: translateY(0) scale(1.12,.88); } }
    @keyframes vg-orbit { from { transform: rotate(0) translateX(95px) rotate(0); } to { transform: rotate(360deg) translateX(95px) rotate(-360deg); } }
    @keyframes vg-pulse { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.45); opacity: 1; } }
    .vg-reels-screen { padding: 0 !important; background: #0e0e12 !important; overflow: hidden !important; }
    .vg-reels { position: absolute; inset: 0; overflow-y: auto; scroll-snap-type: y mandatory; scrollbar-width: none; overscroll-behavior: contain; }
    .vg-reels::-webkit-scrollbar { display: none; }
    .vg-reel { position: relative; height: 100%; scroll-snap-align: start; scroll-snap-stop: always; overflow: hidden; color: #fff; }
    .vg-beatring { position: absolute; left: 50%; top: 50%; width: 260px; height: 260px; margin: -130px 0 0 -130px; border-radius: 50%; border: 4px solid rgba(255,255,255,.5); animation: vg-ring var(--beat) ease-out infinite; animation-play-state: paused; }
    @keyframes vg-ring { 0% { transform: scale(.6); opacity: .9; } 100% { transform: scale(1.6); opacity: 0; } }
    .vg-sub { position: absolute; left: 16px; right: 76px; top: 68%; text-align: center; font-family: var(--font-display); font-size: 28px; line-height: 1.1; color: #fff; -webkit-text-stroke: 1.5px var(--ink); text-shadow: 0 4px 0 var(--ink); z-index: 3; }
    .vg-sub.pop { animation: pop-in .35s var(--spring); }
    .vg-rheart { position: absolute; left: 50%; top: 40%; font-size: 120px; pointer-events: none; opacity: 0; transform: translate(-50%,-50%) scale(0); z-index: 5; filter: drop-shadow(0 4px 0 var(--ink)); }
    .vg-rail { position: absolute; right: 10px; bottom: 120px; display: flex; flex-direction: column; align-items: center; gap: 14px; z-index: 4; }
    .vg-rbtn { display: flex; flex-direction: column; align-items: center; color: #fff; font-size: 30px; line-height: 1; transition: transform .2s var(--spring); }
    .vg-rbtn:active { transform: scale(.85); }
    .vg-rbtn small { font-size: 11px; font-weight: 900; margin-top: 3px; text-shadow: 0 1px 2px #000; }
    .vg-disc { width: 42px; height: 42px; border-radius: 50%; background: #1d1b26; border: 3px solid #fff; display: grid; place-items: center; font-size: 18px; animation: spin 3s linear infinite; }
    .vg-rinfo { position: absolute; left: 14px; right: 80px; bottom: 26px; z-index: 4; font-weight: 700; font-size: 14px; text-shadow: 0 1px 3px rgba(0,0,0,.7); }
    .vg-rinfo b { font-weight: 900; font-size: 15px; display: block; margin-bottom: 4px; }
    .vg-music { overflow: hidden; white-space: nowrap; margin-top: 6px; font-size: 12px; }
    .vg-music span { display: inline-block; animation: marquee 9s linear infinite; }
    .vg-rprog { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(255,255,255,.25); z-index: 4; }
    .vg-rprog i { display: block; height: 100%; width: 0; background: #fff; }
    .vg-reel.on:not(.paused) .vg-rprog i { animation: vg-prog 12s linear infinite; }
    @keyframes vg-prog { to { width: 100%; } }
    .vg-reel.paused::after { content: "▶"; position: absolute; left: 50%; top: 45%; transform: translate(-50%,-50%); font-size: 64px; color: rgba(255,255,255,.85); z-index: 5; pointer-events: none; }
    .vg-rback { position: absolute; top: calc(var(--safe-top) + 12px); left: 14px; width: 42px; height: 42px; border-radius: 50%; background: rgba(14,14,18,.5); color: #fff; font-size: 20px; z-index: 6; border: 2px solid rgba(255,255,255,.6); }
    .vg-rtitle { position: absolute; top: calc(var(--safe-top) + 20px); left: 0; right: 0; text-align: center; color: #fff; font-family: var(--font-display); font-size: 18px; z-index: 5; pointer-events: none; text-shadow: 0 2px 0 var(--ink); }
    .vg-mehead { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
    .vg-bigava.celeb .vg-ava-w { box-shadow: 0 0 0 4px var(--yellow), 0 0 24px var(--pink); }
    .vg-counts { flex: 1; display: grid; grid-template-columns: repeat(3,1fr); text-align: center; }
    .vg-counts b { display: block; font-family: var(--font-display); font-size: 18px; }
    .vg-counts small { font-size: 11px; font-weight: 800; color: var(--muted); }
    .vg-ladder { display: flex; justify-content: space-between; margin-top: 8px; font-size: 20px; }
    .vg-ladder span { filter: grayscale(1); opacity: .35; } .vg-ladder span.on { filter: none; opacity: 1; }
    .vg-hl { gap: 12px; }
    .vg-hlc { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 68px; }
    .vg-hlc span { width: 62px; height: 62px; border-radius: 50%; border: 2.5px solid var(--ink); display: grid; place-items: center; font-size: 28px; background: #ece9f3; filter: grayscale(1); opacity: .55; }
    .vg-hlc.on span { background: var(--yellow); filter: none; opacity: 1; box-shadow: 0 0 0 3px var(--bg), 0 0 0 5.5px var(--pink); }
    .vg-hlc small { font-size: 10px; font-weight: 800; max-width: 68px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vg-deal { margin-bottom: 12px; }
    .vg-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 4px; margin-bottom: 16px; }
    .vg-gtile { position: relative; border-radius: 10px; overflow: hidden; border: 2px solid var(--ink); }
    .vg-gl { position: absolute; left: 4px; bottom: 4px; font-size: 10px; font-weight: 900; color: #fff; text-shadow: 0 1px 2px #000; }
    .vg-starrow { display: flex; align-items: center; gap: 8px; }
    .vg-hearts { font-size: 16px; margin-bottom: 10px; letter-spacing: 2px; }
    .vg-cmp-ph { border: var(--line); border-radius: 20px; overflow: hidden; max-width: 260px; margin: 0 auto; }
    .vg-ta { width: 100%; min-height: 72px; border: var(--line); border-radius: 16px; padding: 10px 12px; font: inherit; font-weight: 700; font-size: 15px; resize: none; background: #fff; user-select: text; -webkit-user-select: text; }
    .vg-fc { margin-top: 6px; }
    .vg-why { display: flex; flex-wrap: wrap; gap: 4px; }
    .vg-why span { font-size: 11px; font-weight: 800; background: #fff; border: 1.5px solid var(--ink); border-radius: 999px; padding: 2px 8px; }
    .vg-shot { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left; font-size: 13px; }
    .vg-draft { width: 120px; border: 2px solid var(--ink); border-radius: 14px; overflow: hidden; background: #fff; text-align: left; }
    .vg-draft small { display: block; padding: 6px; font-size: 11px; font-weight: 700; height: 40px; overflow: hidden; }
    .vg-moment { position: absolute; left: 12px; right: 12px; bottom: calc(var(--safe-bottom) + 96px); z-index: 70; display: flex; align-items: center; gap: 10px; background: var(--paper); border: var(--line); border-radius: 20px; box-shadow: var(--shadow); padding: 10px; animation: pop-in .45s var(--spring) both; }
    .vg-moment.out { animation: fade-out .3s both; }
    .vg-mo-ph { width: 54px; flex: 0 0 auto; border-radius: 12px; overflow: hidden; border: 2px solid var(--ink); }
    .vg-mo-ph .vg-ph-main { font-size: 30px; } .vg-mo-ph .vg-ph-s { display: none; }
    .vg-mo-tx { flex: 1; min-width: 0; } .vg-mo-tx b { display: block; font-size: 14px; font-weight: 900; }
    .vg-mo-tx small { display: block; font-size: 12px; font-weight: 700; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vg-mo-b { display: flex; flex-direction: column; gap: 4px; align-items: center; }
    .vg-mo-x { font-size: 11px; font-weight: 800; color: var(--muted); }
    .vg-story { position: absolute; inset: 0; z-index: 80; background: #0e0e12; color: #fff; animation: fade-in .25s both; }
    .vg-story.out { animation: fade-out .25s both; }
    .vg-sbars { position: absolute; top: calc(var(--safe-top) + 10px); left: 10px; right: 10px; display: flex; gap: 4px; z-index: 3; }
    .vg-sbars i { flex: 1; height: 3px; border-radius: 2px; background: rgba(255,255,255,.35); overflow: hidden; }
    .vg-sbars b { display: block; height: 100%; width: 0; background: #fff; }
    .vg-shead { position: absolute; top: calc(var(--safe-top) + 22px); left: 12px; right: 12px; display: flex; align-items: center; gap: 8px; z-index: 3; text-shadow: 0 1px 3px #000; }
    .vg-shead small { opacity: .8; font-weight: 700; font-size: 12px; }
    .vg-sx { color: #fff; font-size: 24px; width: 40px; height: 40px; }
    .vg-sbody { position: absolute; inset: 0; }
    .vg-stext { position: absolute; left: 20px; right: 20px; top: 62%; text-align: center; font-family: var(--font-display); font-size: 24px; line-height: 1.15; background: rgba(14,14,18,.6); border-radius: 18px; padding: 12px; animation: pop-in .4s var(--spring) both; }
    .vg-sfoot { position: absolute; left: 12px; right: 12px; bottom: calc(var(--safe-bottom) + 18px); display: flex; gap: 8px; align-items: center; z-index: 3; }
    .vg-sreact { font-size: 28px; width: 46px; height: 46px; border-radius: 50%; background: rgba(255,255,255,.15); }
    .vg-sfoot .btn { margin-left: auto; }
    .vg-dm { max-height: 40vh; min-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .vg-read { align-self: flex-end; font-size: 11px; font-weight: 800; color: var(--muted); }
    `;
    document.head.appendChild(st);
  }
  injectCss();
})();
