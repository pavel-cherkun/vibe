/* ============================================================
   Vibe Поиск — ищет сервисы, людей и действия.
   Первые результаты, разумеется, реклама.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();

  // Сервисы: ключевые слова → экран
  const SERVICES = [
    ["pay", "Vibe Pay", "💳", "банк деньги карта перевод кредит копилка кэшбек счёт оплата"],
    ["maps", "Vibe Maps", "🗺️", "карта такси метро пешком самокат маршрут доехать поехать"],
    ["eat", "Vibe Eat", "🍜", "еда доставка ресторан рамен бургер суши поесть голоден"],
    ["supermarket", "Vibe Supermarket", "🥑", "продукты магазин холодильник готовить еда"],
    ["market", "Vibe Market", "🛍️", "маркетплейс купить вещи матрас часы одежда гаджет"],
    ["job", "Vibe Job", "💼", "работа вакансии резюме собеседование зарплата задачи уволиться"],
    ["gig", "Vibe Gig", "🚲", "подработка курьер фриланс водитель деньги"],
    ["fit", "Vibe Fit", "⌚", "здоровье сон шаги пульс энергия тренировка браслет часы"],
    ["calendar", "Календарь", "📅", "время дата события расписание дела"],
    ["rent", "Vibe Rent", "🔑", "аренда квартира переезд жильё снять"],
    ["home-buy", "Vibe Home", "🏠", "ипотека купить квартиру жильё"],
    ["health", "Vibe Health", "💊", "врач клиника аптека болею лекарства"],
    ["psy", "Vibe Психолог", "🛋️", "психолог выгорание стресс тревога терапия"],
    ["people", "Близкие", "🫂", "друзья семья мама папа отношения"],
    ["chats", "Мессенджер", "💬", "чат написать переписка сообщения"],
    ["gram", "Vibegram", "📸", "соцсеть пост рилсы блог подписчики лайки"],
    ["mail", "Vibe Почта", "✉️", "почта письма спам уведомления"],
    ["flowers", "Vibe Цветы", "💐", "цветы букет подарок свидание"],
    ["cola", "Vibe Cola", "🥤", "кола газировка напиток вайб"],
    ["match", "Vibe Match", "💘", "знакомства свидание любовь пара"],
    ["tickets", "Vibe Tickets", "🎤", "концерт билеты афиша"],
    ["music", "Vibe Music", "🎧", "музыка песни плейлист"],
    ["books", "Vibe Книги", "📚", "книги читать"],
    ["cinema", "Vibe Кино", "🍿", "кино фильм сериал смотреть"],
    ["games", "Vibe Games", "🎮", "игры поиграть"],
    ["invest", "Vibe Invest", "🚀", "инвестиции акции дивиденды биржа"],
    ["learn", "Vibe Learn", "🎓", "курсы учёба навыки обучение"],
    ["skills", "Навыки", "⭐", "навыки прокачка перки уровень rpg"],
    ["style", "Vibe Style", "🧥", "одежда стиль внешность гардероб"],
    ["hobby", "Хобби", "🎸", "хобби гитара бег рисование йога"],
    ["auto", "Vibe Auto", "🚙", "машина автомобиль автокредит осаго"],
    ["drive", "Vibe Drive", "🚗", "каршеринг аренда машины"],
    ["travel", "Vibe Travel", "🏝️", "путешествие отпуск тур море"],
    ["clean", "Vibe Clean", "🫧", "уборка клининг"],
    ["pets", "Vibe Pets", "🐶", "питомец кот собака хомяк корм"],
    ["gov", "Госвайб", "🏛️", "госуслуги штраф налог паспорт вычет пенсия"],
    ["charity", "Добрые дела", "💝", "благотворительность помочь репутация"],
    ["telecom", "Vibe Телеком", "📶", "связь интернет гигабайты минуты тариф сим"],
    ["insure", "Vibe Страхование", "☂️", "страховка страхование полис"],
    ["fitness", "Vibe Фитнес", "🏋️", "фитнес спортзал абонемент тренировка"],
    ["plus", "Плюс Вайб", "💎", "подписка плюс"],
    ["wheel", "Колесо вайба", "🎡", "колесо приз спин"],
    ["profile", "Профиль", "😎", "профиль сохранение настройки консоль читы"],
  ];
  // Действия: фраза → экран
  const ACTIONS = [
    ["Заказать поесть", "🍜", "eat", "заказать поесть голоден еда"],
    ["Вызвать такси", "🚕", "maps", "такси вызвать поехать"],
    ["Лечь спать", "😴", "fit", "спать сон устал"],
    ["Найти работу", "💼", "job", "работа найти вакансия"],
    ["Подработать", "🚲", "gig", "подработать заработать деньги нужны"],
    ["Подарить цветы", "💐", "flowers", "подарить цветы букет"],
    ["Написать маме", "👩", "chat", "мама написать позвонить", { id: "mom" }],
    ["Выбрать кэшбек", "🪙", "pay", "кэшбек категории"],
    ["Сохранить игру", "💾", "profile", "сохранить сохранение перенести"],
    ["Взять кредит", "🤑", "pay", "кредит займ деньги", { credit: "1" }],
  ];
  const ADS = [
    { e: "🥤", t: "Vibe Cola — в ней есть вайб", d: "Реклама · освежает, как первая зарплата", go: "cola" },
    { e: "🤑", t: "Кредит предодобрен: 500 000 ₫", d: "Реклама · ставка от 0%*", go: "pay", params: { credit: "1" } },
    { e: "💎", t: "Плюс Вайб — жизнь, но выгоднее", d: "Реклама · первый месяц за 1 ₫", go: "plus" },
  ];
  const TRENDING = ["как пережить понедельник", "дешёвая квартира без соседа Валеры", "что подарить маме", "почему нет денег", "как стать блогером", "уехать в деревню"];

  function norm(s) { return String(s).toLowerCase().replace(/ё/g, "е"); }
  function search(q) {
    const n = norm(q).trim();
    if (!n) return { services: [], people: [], actions: [] };
    const words = n.split(/\s+/);
    const hit = (txt) => words.every((w) => norm(txt).includes(w));
    const services = SERVICES.filter(([go, t, , kw]) => hit(t + " " + kw)).filter(([go]) => Vibe.screens[go]);
    const actions = ACTIONS.filter(([t, , go, kw]) => hit(t + " " + kw)).filter(([, , go]) => Vibe.screens[go]);
    const ppl = Vibe.chars ? Vibe.chars.list() : Object.entries(Vibe.people ? Vibe.people.all() : {}).map(([id, p]) => Object.assign({ id }, p));
    const people = ppl.filter((p) => hit(`${p.n} ${p.job || ""} ${p.handle || ""} ${p.bio || ""}`));
    return { services, people, actions };
  }

  Vibe.screen("search", {
    render(p) {
      const recent = S().searchRecent || [];
      return `
      ${Vibe.ui.head("Vibe Поиск", "найдётся всё. даже то, что не искал")}
      <div class="field" style="margin-bottom:12px">🔍 <input data-q placeholder="Сервисы, люди, действия…" value="${Vibe.esc(p.q || "")}" autocomplete="off"></div>
      <div data-res></div>
      <div data-idle>
        ${recent.length ? `<h2 class="sec">Недавнее</h2><div class="chips">${recent.map((r) => `<button class="chip" data-try="${Vibe.esc(r)}">🕒 ${Vibe.esc(r)}</button>`).join("")}</div>` : ""}
        <h2 class="sec">Сейчас ищут <small>в Vibe City</small></h2>
        <div class="stack">${TRENDING.map((t, i) => `<button class="card tight tap" data-try="${t}" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left"><b style="font-family:var(--font-display);font-weight:400;font-size:20px;width:26px">${i + 1}</b><span style="flex:1;font-weight:800">${t}</span><span>↗</span></button>`).join("")}</div>
      </div>`;
    },
    mount(root, p) {
      const inp = root.querySelector("[data-q]");
      const res = root.querySelector("[data-res]");
      const idle = root.querySelector("[data-idle]");
      let t = 0;
      const draw = () => {
        const q = inp.value;
        if (!q.trim()) { res.innerHTML = ""; idle.style.display = ""; return; }
        idle.style.display = "none";
        const r = search(q);
        const ads = ADS.slice(0, 1 + (q.length % 3));
        const none = !r.services.length && !r.people.length && !r.actions.length;
        res.innerHTML = `
          <div class="stack stagger">
            ${ads.map((a) => `<button class="card tight tap c-yellow" data-go="${a.go}" ${a.params ? `data-params='${JSON.stringify(a.params)}'` : ""} style="display:flex;gap:10px;align-items:center;width:100%;text-align:left"><span style="font-size:28px">${a.e}</span><div style="flex:1"><b>${a.t}</b><div style="font-size:11px;font-weight:800">${a.d}</div></div><span class="badge" style="background:#fff">Реклама</span></button>`).join("")}
          </div>
          ${r.actions.length ? `<h2 class="sec">Действия</h2><div class="stack">${r.actions.map(([t, e, go, , params]) => `<button class="card tight tap" data-go="${go}" ${params ? `data-params='${JSON.stringify(params)}'` : ""} style="display:flex;gap:10px;align-items:center;width:100%;text-align:left"><span style="font-size:26px">${e}</span><b style="flex:1">${t}</b><span>→</span></button>`).join("")}</div>` : ""}
          ${r.services.length ? `<h2 class="sec">Сервисы</h2><div class="grid3">${r.services.map(([go, t, e]) => `<button class="card tight tap" data-go="${go}" style="text-align:center"><div style="font-size:30px">${e}</div><b style="font-size:12px">${t}</b></button>`).join("")}</div>` : ""}
          ${r.people.length ? `<h2 class="sec">Люди</h2><div class="stack">${r.people.map((pp) => `<button class="card tight tap" data-go="${Vibe.screens["gram-profile"] ? "gram-profile" : "people"}" data-params='${JSON.stringify({ id: pp.id })}' style="display:flex;gap:10px;align-items:center;width:100%;text-align:left"><span style="font-size:30px">${pp.e}</span><div style="flex:1"><b>${Vibe.esc(pp.n)}</b><div class="muted" style="font-size:12px;font-weight:700">${Vibe.esc(pp.handle || pp.job || "")}</div></div></button>`).join("")}</div>` : ""}
          ${none ? `<div class="card" style="text-align:center;margin-top:12px"><div style="font-size:50px">🤷</div><b>Ничего не нашлось</b><p class="muted" style="font-weight:700;font-size:13px;margin-top:6px">Но кредит на это уже предодобрен</p></div>` : ""}`;
        res.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
      };
      inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(draw, 120); });
      inp.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || !inp.value.trim()) return;
        Vibe.state.set({ searchRecent: [inp.value.trim(), ...(S().searchRecent || []).filter((x) => x !== inp.value.trim())].slice(0, 6) });
        FX.sound.pop();
      });
      root.addEventListener("click", (e) => {
        const tr = e.target.closest("[data-try]");
        if (tr) { inp.value = tr.dataset.try; draw(); FX.bump(inp.parentElement); }
        if (e.target.closest("[data-go]") && inp.value.trim()) Vibe.state.set({ searchRecent: [inp.value.trim(), ...(S().searchRecent || []).filter((x) => x !== inp.value.trim())].slice(0, 6) });
      });
      setTimeout(() => inp.focus(), 350);
      if (p.q) draw();
      return () => clearTimeout(t);
    },
  });
})();
