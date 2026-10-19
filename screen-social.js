/* ============================================================
   Чаты, чат с Заботиком, профиль, QR-сканер, подписка
   «Плюс Вайб», все сервисы.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const css = (t) => { const s = document.createElement("style"); s.textContent = t; document.head.appendChild(s); };

  /* ================= Чаты ================= */
  const CHATS = {
    zabotik: { n: "Заботик", e: null, c: "c-lime", last: "Я подобрал тебе 37 предложений 💜", unread: 3, pin: true,
      hello: ["Привет! Я Заботик, твой персональный помощник 💜", "Я знаю о тебе всё. Ну, почти всё. Спроси меня о чём угодно!"] },
    courier: { n: "Курьер Тимур", e: "🛵", c: "c-pink", last: "Я у подъезда. Какой подъезд?", unread: 1,
      hello: ["Я у подъезда.", "Какой подъезд?", "А, это не тот дом."] },
    bank: { n: "Vibe Pay · поддержка", e: "🏦", c: "c-yellow", last: "Ваше обращение очень важно для нас", unread: 0,
      hello: ["Здравствуйте! Ваше обращение очень важно для нас.", "Вы 1 248-й в очереди. Пока ждёте — оформите кредит?"] },
    mom: { n: "Мама", e: "👩", c: "c-mint", last: "Ты поел?", unread: 2,
      hello: ["Ты поел?", "Купи шапку. Холодно."] },
    promo: { n: "Vibe · Акции", e: "📣", c: "c-orange", last: "−90% на всё! Ну, почти на всё", unread: 12,
      hello: ["🔥 −90% на всё!*", "*На товары, которых нет в наличии", "Успей, пока не успел!"] },
  };

  const ZAB_REPLIES = {
    "Как сэкономить?": ["Отличный вопрос! Подключи «Плюс Вайб» — и экономь кэшбеком 💎", "А ещё можно не покупать. Но это не наш метод 😅"],
    "Хочу кредит": ["Уже одобрено! Ещё до того, как ты спросил 🤑", "Перейди в Vibe Pay → Кредит. Или я сам всё сделаю?"],
    "Мне грустно": ["Понимаю. Вот 3 вещи, которые помогут: рамен 🍜, новые кроссовки 👟, ещё один рамен 🍜", "Шучу. Иногда помогает просто выйти на улицу. Но такси туда — в Vibe Maps 🚕"],
    "Кто ты?": ["Я Заботик. Я забочусь о тебе. И о показателях выручки 📈", "Но в первую очередь о тебе! Наверное."],
    "Подари вайбики": ["Ладно, ладно. Держи 🪙", "__reward__"],
  };

  Vibe.screen("chats", {
    render() {
      return `
      <div class="head"><button class="icon-btn" data-back aria-label="Назад">←</button><div class="title" style="font-size:26px">Чаты<small>Все тебя ждут</small></div><button class="icon-btn" data-act="new">✏️</button></div>
      <div class="field" style="margin-bottom:14px">🔍 <input placeholder="Поиск по чатам" data-act="none"></div>
      <div class="stack stagger">
        ${Object.entries(CHATS).map(([id, c]) => `
          <button class="card tight tap chat-row ${c.pin ? "c-lilac" : ""}" data-go="chat" data-params='{"id":"${id}"}'>
            <div class="chat-ava ${c.c}">${c.e ? `<span class="emo">${c.e}</span>` : Vibe.zabotik(46)}</div>
            <div class="tx"><b>${c.n}${c.pin ? " 📌" : ""}</b><small>${c.last}</small></div>
            ${c.unread ? `<span class="dot-count" style="position:static;animation-delay:${Math.random() * 2}s">${c.unread}</span>` : ""}
          </button>`).join("")}
      </div>`;
    },
    mount(root) {
      root.addEventListener("click", (e) => {
        if (e.target.closest('[data-act="new"]')) FX.toast("Новые чаты — в Плюс Вайб 💎", "🔒");
      });
    },
  });

  Vibe.screen("chat", {
    render(p) {
      const c = CHATS[p.id] || CHATS.zabotik;
      const isZ = (p.id || "zabotik") === "zabotik";
      return `
      ${Vibe.ui.head(c.n, isZ ? "онлайн · всегда" : "был(а) недавно", `<div class="chat-ava ${c.c}" style="width:46px;height:46px">${c.e ? `<span class="emo">${c.e}</span>` : Vibe.zabotik(40)}</div>`)}
      <div class="msgs" data-msgs></div>
      <div class="chat-input">
        ${isZ ? `<div class="chips" data-quick>${Object.keys(ZAB_REPLIES).map((q) => `<button class="chip">${q}</button>`).join("")}</div>` : ""}
        <div style="display:flex;gap:8px">
          <div class="field" style="flex:1;height:50px"><input data-input placeholder="Сообщение…"></div>
          <button class="icon-btn c-lime" data-send style="width:50px;height:50px;background:var(--lime)">➤</button>
        </div>
      </div>`;
    },
    mount(root, p) {
      const id = p.id || "zabotik";
      const c = CHATS[id] || CHATS.zabotik;
      const box = root.querySelector("[data-msgs]");
      const input = root.querySelector("[data-input]");
      const timers = [];
      const add = (text, side) => {
        const m = document.createElement("div");
        m.className = "msg " + side;
        m.textContent = text;
        box.appendChild(m);
        root.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
        if (side === "in") FX.sound.pop();
      };
      const typing = () => {
        const t = document.createElement("div");
        t.className = "msg in typing"; t.innerHTML = "<span></span><span></span><span></span>";
        box.appendChild(t);
        root.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
        return t;
      };
      const reply = (lines) => {
        let delay = 300;
        lines.forEach((line) => {
          timers.push(setTimeout(() => {
            const t = typing();
            timers.push(setTimeout(() => {
              t.remove();
              if (line === "__reward__") { Vibe.reward({ vibiki: 50, xp: 10, from: box.lastChild || box }); return; }
              add(line, "in");
            }, 700));
          }, delay));
          delay += 1100;
        });
      };
      reply(c.hello);
      const send = (text) => {
        if (!text.trim()) return;
        add(text, "out");
        FX.sound.like();
        Vibe.reward({ xp: 3, silent: true });
        if (id === "zabotik") reply(ZAB_REPLIES[text] || ["Интересно! Кстати, у нас скидка на это 😉", "Шучу. Или нет. Загляни в Vibe Market 🛍️"]);
        else if (id === "mom") reply(["Хорошо. А ты поел?"]);
        else reply(["Ваше сообщение очень важно для нас 🙏"]);
      };
      root.addEventListener("click", (e) => {
        const q = e.target.closest("[data-quick] .chip");
        if (q) { send(q.textContent); FX.burst(q, { emojis: ["💬", "✨"], count: 6 }); }
        if (e.target.closest("[data-send]")) { send(input.value); input.value = ""; }
      });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { send(input.value); input.value = ""; } });
      return () => timers.forEach(clearTimeout);
    },
  });

  css(`
  .chat-row { display:flex; align-items:center; gap:12px; width:100%; text-align:left; }
  .chat-row .tx { flex:1; min-width:0; } .chat-row .tx b { display:block; font-size:15px; font-weight:900; }
  .chat-row .tx small { display:block; color:var(--muted); font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chat-ava { width:54px; height:54px; border-radius:50%; border:2.5px solid var(--ink); display:grid; place-items:center; font-size:28px; flex:0 0 auto; overflow:hidden; }
  .msgs { display:flex; flex-direction:column; gap:8px; padding-bottom:140px; }
  .chat-input { position:fixed; left:50%; transform:translateX(-50%); width:100%; max-width:480px; bottom:0; padding:8px 16px calc(var(--safe-bottom) + 12px); background:linear-gradient(transparent, var(--bg) 22%); z-index:20; }
  `);

  /* ================= Профиль ================= */
  Vibe.screen("profile", {
    render() {
      const s = S();
      const need = Vibe.need(s.level);
      return `
      <div class="prof-hero c-grad">
        <div class="prof-ava"><span class="emo float">${(s.profile && s.profile.avatar) || "😎"}</span></div>
        <div class="display" style="font-size:30px;margin-top:10px">${Vibe.esc(s.name)}</div>
        <div style="font-weight:800;opacity:.9">${s.plus ? "💎 Плюс Вайб" : "Обычный смертный"} · уровень <span data-level>${s.level}</span></div>
        <div class="progress" style="margin:14px 0 4px;background:rgba(255,255,255,.35)"><i data-xpbar style="--p:${Math.round((s.xp / need) * 100)}%"></i></div>
        <div style="font-size:12px;font-weight:800">${s.xp} / ${need} XP до следующего уровня</div>
      </div>

      <div class="grid3 stagger" style="margin-top:14px">
        <div class="card tight c-yellow stat"><span class="emo">🪙</span><b data-vibiki>${Vibe.fmt(s.vibiki)}</b><small>вайбиков</small></div>
        <div class="card tight c-orange stat"><span class="emo">🔥</span><b>${s.streak}</b><small>дней подряд</small></div>
        <div class="card tight c-mint stat"><span class="emo">🏆</span><b>${s.achievements.length}</b><small>ачивок</small></div>
      </div>

      <h2 class="sec">Моя жизнь <small>${Vibe.game.info().label}</small></h2>
      <div class="card" style="padding:4px 16px">
        ${[
          ["⏳", "c-lilac", "Прожито в Vibe", `${Vibe.game.info().day} ${Vibe.game.plural(Vibe.game.info().day, "день", "дня", "дней")}`],
          ["💼", "c-sky", "Работа", s.job ? `${Vibe.game.jobTitle(s.job)} · ${s.job.company}` : "Пока нет"],
          ["🏠", "c-yellow", "Жильё", s.home ? `${s.home.title}${s.home.own ? " · своё!" : ` · ${Vibe.rub(s.home.rent)}/мес`}` : "—"],
          ["💸", "c-lime", "Зарплат получено", String((s.stats || {}).salaries || 0)],
          ["🏦", "c-pink", "Кредитов", String((s.loans || []).length)],
          ["🎯", "c-orange", "Целей выполнено", `${(s.goalsDone || []).length} из ${Vibe.game.GOALS.length}`],
        ].map(([e, c, t, d]) => `<div class="li"><div class="ic ${c}">${e}</div><div class="tx"><b>${t}</b><small>${Vibe.esc(d)}</small></div></div>`).join("")}
      </div>

      <h2 class="sec">Достижения <small>${s.achievements.length} из ${Vibe.ACH_LIST().length}</small></h2>
      <div class="grid3 stagger">
        ${Vibe.ACH_LIST().map(([id, a]) => {
          const got = s.achievements.includes(id);
          return `<button class="ach ${got ? "got" : ""}" data-ach="${id}"><span class="emo ${got ? "float" : ""}">${got ? a.e : "🔒"}</span><b>${a.t}</b></button>`;
        }).join("")}
      </div>

      <h2 class="sec">Настройки</h2>
      <div class="card" style="padding:4px 16px">
        <div class="li"><div class="ic c-yellow">🔊</div><div class="tx"><b>Звуки и вибрация</b><small>Дофамин на максимум</small></div><button class="switch ${s.sound ? "on" : ""}" data-act="sound"></button></div>
        <button class="li" data-go="plus" style="width:100%;text-align:left"><div class="ic c-lilac">💎</div><div class="tx"><b>Плюс Вайб</b><small>${s.plus ? "Активна · 299 ₽/мес" : "Не подключена"}</small></div><span>›</span></button>
        <button class="li" data-act="name" style="width:100%;text-align:left"><div class="ic c-mint">✏️</div><div class="tx"><b>Имя</b><small>${Vibe.esc(s.name)}</small></div><span>›</span></button>
        <button class="li" data-act="data" style="width:100%;text-align:left"><div class="ic c-sky">🕵️</div><div class="tx"><b>Мои данные</b><small>Что Vibe знает о тебе</small></div><span>›</span></button>
        <button class="li" data-act="reset" style="width:100%;text-align:left"><div class="ic c-coral">🧨</div><div class="tx"><b>Начать жизнь заново</b><small>Сбросить прогресс</small></div><span>›</span></button>
      </div>
      <div class="fine" style="text-align:center">Vibe 1.0 · сатирическая игра · все компании и совпадения вымышлены</div>`;
    },
    mount(root) {
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-ach]");
        if (a) {
          const ach = Vibe.ACH[a.dataset.ach];
          const got = S().achievements.includes(a.dataset.ach);
          FX.bump(a);
          if (got) FX.burst(a, { emojis: [ach.e, "✨"], count: 10 });
          else FX.shake(a);
          FX.toast(got ? `${ach.t}: ${ach.d}` : `Закрыто: ${ach.d}`, got ? ach.e : "🔒");
          return;
        }
        const act = (e.target.closest("[data-act]") || {}).dataset;
        if (!act) return;
        if (act.act === "sound") {
          const on = !S().sound;
          Vibe.state.set({ sound: on });
          e.target.closest(".switch").classList.toggle("on", on);
          if (on) { FX.sound.success(); FX.toast("Дофамин включён", "🔊"); } else FX.toast("Тишина. Подозрительно спокойно", "🔇");
        }
        if (act.act === "name") {
          Vibe.ui.sheet(`<div class="display" style="font-size:26px;margin-bottom:12px">Как тебя зовут?</div>
            <div class="field"><input data-name value="${Vibe.esc(S().name)}" maxlength="16"></div>
            <button class="btn black block" style="margin-top:14px" data-save>Сохранить</button>`, {
            onMount(sh, close) {
              sh.querySelector("[data-save]").addEventListener("click", () => {
                const v = sh.querySelector("[data-name]").value.trim();
                if (v) Vibe.state.set({ name: v });
                close(); Vibe.replace("profile"); FX.toast(`Приятно познакомиться, ${v}!`, "🤝");
              });
            },
          });
        }
        if (act.act === "data") {
          Vibe.ui.sheet(`<div class="display" style="font-size:26px;margin-bottom:12px">Что мы о тебе знаем</div>
            <div class="stack stagger">
              ${[["📍", "Где ты бываешь", "Всегда"], ["🍜", "Что ты ешь", "Рамен. Много рамена"], ["😴", "Когда ты спишь", "Мало"], ["💸", "Сколько тратишь", "Больше, чем думаешь"], ["💘", "Кто тебе нравится", "Мы никому не скажем*"], ["🧠", "О чём ты думаешь", "Скоро узнаем"]]
                .map(([e, t, d]) => `<div class="card tight" style="display:flex;gap:12px;align-items:center"><span class="emo" style="font-size:28px">${e}</span><div style="flex:1"><b>${t}</b><div class="muted" style="font-size:13px">${d}</div></div><span class="badge">✓</span></div>`).join("")}
            </div>
            <div class="fine">*Кроме партнёров. И партнёров партнёров.</div>
            <button class="btn black block" style="margin-top:14px" data-close>Это нормально</button>`);
        }
        if (act.act === "reset") {
          Vibe.modal(`<div class="m-emo">🧨</div><div class="display">Начать заново?</div><p>Баланс, вайбики, уровень и ачивки обнулятся. Новая жизнь — новые кредиты.</p>
            <div style="display:grid;gap:10px"><button class="btn pink block" data-yes>Да, перерождаюсь</button><button class="btn block" data-close>Нет, мне и тут норм</button></div>`, {
            sound: "pop",
            onMount(m) { m.querySelector("[data-yes]").addEventListener("click", () => Vibe.state.reset()); },
          });
        }
      });
    },
  });
  css(`
  .prof-hero { border:var(--line); border-radius:32px; box-shadow:var(--shadow); padding:22px 20px; text-align:center; color:#fff; position:relative; overflow:hidden; }
  .prof-ava { width:104px; height:104px; margin:0 auto; border-radius:50%; background:var(--yellow); border:3px solid var(--ink); display:grid; place-items:center; font-size:60px; box-shadow:0 0 0 6px rgba(255,255,255,.4); }
  .stat { text-align:center; display:flex; flex-direction:column; align-items:center; gap:2px; }
  .stat .emo { font-size:26px; } .stat b { font-family:var(--font-display); font-weight:400; font-size:20px; } .stat small { font-size:11px; font-weight:800; }
  .ach { border:2.5px dashed rgba(14,14,18,.35); border-radius:22px; padding:14px 6px 10px; display:flex; flex-direction:column; align-items:center; gap:6px; background:#f1eee6; }
  .ach .emo { font-size:34px; filter:grayscale(1); opacity:.6; } .ach b { font-size:11px; font-weight:900; }
  .ach.got { border:var(--line); border-style:solid; background:var(--paper); box-shadow:var(--shadow-sm); }
  .ach.got .emo { filter:none; opacity:1; }
  `);

  /* ================= QR-сканер ================= */
  const QR_ITEMS = [
    { t: "Кофе «Вайб» · латте на овсяном", a: 290, e: "☕" },
    { t: "Шаурма «У Ашота» · двойная", a: 390, e: "🌯" },
    { t: "Самокат · 14 минут", a: 168, e: "🛴" },
    { t: "Вендинг · энергетик", a: 159, e: "🥤" },
  ];
  Vibe.screen("qr", {
    render() {
      return `
      <div class="qr-screen">
        <div class="head" style="color:#fff"><button class="icon-btn" data-back>←</button><div class="title">Наведи на QR<small style="color:#aaa">Оплата за секунду</small></div></div>
        <div class="qr-frame"><span></span><span></span><span></span><span></span><div class="laser"></div><div class="qr-emo emo pulse">📷</div></div>
        <div class="qr-hint" data-hint>Ищем код…</div>
      </div>`;
    },
    mount(root) {
      const item = FX.pick(QR_ITEMS);
      const hint = root.querySelector("[data-hint]");
      const t1 = setTimeout(() => { hint.textContent = "Почти…"; FX.sound.tick(); }, 900);
      const t2 = setTimeout(() => {
        FX.sound.success(); FX.haptic([10, 40, 10]);
        FX.burst(root.querySelector(".qr-frame"), { emojis: ["✅", "✨", item.e], count: 14 });
        hint.textContent = "Найдено!";
        Vibe.ui.sheet(`
          <div style="text-align:center"><div class="emo float" style="font-size:80px">${item.e}</div>
          <div class="display" style="font-size:24px;margin:8px 0">${item.t}</div>
          <div class="big-num" style="font-size:46px;margin-bottom:6px">${Vibe.rub(item.a)}</div>
          <span class="badge" style="background:var(--yellow)">🪙 +${Math.round(item.a * 0.03)} вайбиков</span></div>
          <button class="btn black xl block" style="margin-top:18px" data-qrpay>Оплатить <span class="arrow">→</span></button>`, {
          onMount(sh, close) {
            sh.querySelector("[data-qrpay]").addEventListener("click", (e) => {
              if (!Vibe.pay(item.a, { title: item.t, emoji: item.e, col: "c-sky", from: e.currentTarget })) return;
              close(); FX.confetti();
              setTimeout(() => Vibe.back(), 900);
            });
          },
        });
      }, 1900);
      root.classList.add("dark-screen");
      return () => { clearTimeout(t1); clearTimeout(t2); };
    },
  });
  css(`
  .screen.dark-screen { background:#0e0e12; }
  .qr-screen { min-height:80dvh; display:flex; flex-direction:column; }
  .qr-frame { position:relative; width:250px; height:250px; margin:60px auto 26px; border-radius:30px; background:radial-gradient(circle at 30% 30%, #2b2440, #121018); overflow:hidden; }
  .qr-frame > span { position:absolute; width:56px; height:56px; border:6px solid var(--lime); }
  .qr-frame > span:nth-child(1) { top:0; left:0; border-right:0; border-bottom:0; border-radius:30px 0 0 0; }
  .qr-frame > span:nth-child(2) { top:0; right:0; border-left:0; border-bottom:0; border-radius:0 30px 0 0; }
  .qr-frame > span:nth-child(3) { bottom:0; left:0; border-right:0; border-top:0; border-radius:0 0 0 30px; }
  .qr-frame > span:nth-child(4) { bottom:0; right:0; border-left:0; border-top:0; border-radius:0 0 30px 0; }
  .laser { position:absolute; left:10px; right:10px; height:4px; background:var(--pink); box-shadow:0 0 18px 4px var(--pink); animation:laser 1.4s ease-in-out infinite alternate; }
  @keyframes laser { from { top:16px; } to { top:230px; } }
  .qr-emo { position:absolute; inset:0; display:grid; place-items:center; font-size:60px; opacity:.5; }
  .qr-hint { text-align:center; color:#fff; font-family:var(--font-display); font-size:24px; }
  `);

  /* ================= Плюс Вайб ================= */
  const MAZE = [
    { t: "Вы уверены?", p: "Без Плюса кэшбек станет обычным. Как у всех.", yes: "Да, уверен", no: "Остаться 💎", e: "🥺" },
    { t: "Точно-точно?", p: "Заботик будет скучать. Он уже немного грустит.", yes: "Точно", no: "Ладно, останусь", e: "😢" },
    { t: "Скидка 50%!", p: "Только для тебя: 149 ₽ в месяц. Навсегда*. *На 1 месяц", yes: "Нет, отменить", no: "Беру за 149 ₽", e: "🎁" },
    { t: "Опрос", p: "Почему уходите? Выберите причину, иначе мы не поймём.", yes: "Просто хочу уйти", no: "Передумал", e: "📋" },
    { t: "Последний шанс", p: "Подтвердите отмену, введя слово «ОТМЕНИТЬ» задом наперёд. Шутка. Просто нажмите.", yes: "ОТМЕНИТЬ", no: "Ой, нет", e: "🚪" },
  ];
  Vibe.screen("plus", {
    render() {
      const s = S();
      return `
      ${Vibe.ui.head("Плюс Вайб", s.plus ? "Ты в Плюсе 💎" : "Подписка на всё")}
      <div class="hero c-holo" style="min-height:220px">
        <div class="sticker" style="top:16px;right:16px;background:var(--lime)">${s.plus ? "АКТИВНА" : "1 ₽"}</div>
        <div class="display" style="font-size:40px">Плюс<br>Вайб</div>
        <p style="max-width:60%">Жизнь, но в два раза выгоднее*</p>
        <div class="hero-emo emo float" style="font-size:110px">💎</div>
      </div>
      <div class="stack stagger" style="margin-top:16px">
        ${[["🪙", "c-yellow", "Кэшбек ×2", "Все вайбики удваиваются"], ["🛵", "c-pink", "Доставка 0 ₽", "Из Eat и Supermarket*"], ["🎧", "c-violet", "Музыка без рекламы", "Только реклама Vibe"], ["💘", "c-coral", "Кто тебя лайкнул", "В Vibe Match"], ["🚕", "c-sky", "−5% на такси", "Кроме часов пик. Час пик — всегда"]]
          .map(([e, c, t, d]) => `<div class="card tight" style="display:flex;gap:12px;align-items:center"><div class="li-ic ${c}" style="width:50px;height:50px;border-radius:16px;border:2px solid var(--ink);display:grid;place-items:center;font-size:26px"><span class="emo">${e}</span></div><div style="flex:1"><b>${t}</b><div class="muted" style="font-size:13px">${d}</div></div><span class="badge">✓</span></div>`).join("")}
      </div>
      ${s.plus
        ? `<button class="btn block" style="margin-top:20px" data-act="cancel">Отменить подписку</button>`
        : `<button class="btn grad xl block" style="margin-top:20px" data-act="sub">Подключить за 1 ₽ <span class="arrow">→</span></button>`}
      <div class="fine">*Первый месяц 1 ₽, далее 299 ₽/мес. Автопродление. Отменить можно в любой момент: Профиль → Плюс Вайб → Отменить → и ещё пара шагов.</div>`;
    },
    mount(root) {
      root.addEventListener("click", (e) => {
        const a = e.target.closest("[data-act]");
        if (!a) return;
        if (a.dataset.act === "sub") {
          if (!Vibe.pay(1, { title: "Подписка «Плюс Вайб» · 1-й месяц", emoji: "💎", col: "c-lilac", from: a })) return;
          Vibe.state.set({ plus: true });
          FX.confetti();
          Vibe.modal(`<div class="m-emo float">💎</div><div class="display">Ты в Плюсе!</div><p>Кэшбек ×2 включён. Через месяц спишем 299 ₽ — ты даже не заметишь.</p><button class="btn black block" data-close>Я особенный</button>`, { onClose: () => Vibe.replace("plus") });
        }
        if (a.dataset.act === "cancel") maze(0);
      });
    },
  });
  function maze(i) {
    if (i >= MAZE.length) {
      Vibe.state.set({ plus: false });
      Vibe.achieve("cancel");
      FX.confetti();
      Vibe.modal(`<div class="m-emo float">🏆</div><div class="display">Получилось!</div><p>Ты отменил подписку. Это удаётся 3% пользователей. Заботик гордится тобой. И немного обижен.</p><button class="btn black block" data-close>Я свободен</button>`, { sound: "levelup", onClose: () => Vibe.replace("plus") });
      return;
    }
    const m = MAZE[i];
    // Кнопки меняются местами, чтобы было веселее
    const swap = i % 2 === 1;
    const yes = `<button class="btn block" data-yes>${m.yes}</button>`;
    const no = `<button class="btn grad block" data-no>${m.no}</button>`;
    Vibe.modal(`<div class="m-emo wobble">${m.e}</div><div class="display">${m.t}</div><p>${m.p}</p>
      <div style="display:grid;gap:10px">${swap ? yes + no : no + yes}</div>
      <div class="fine">Шаг ${i + 1} из ${MAZE.length}… или больше</div>`, {
      sound: "pop",
      onMount(el, close) {
        el.querySelector("[data-yes]").addEventListener("click", () => { close(); setTimeout(() => maze(i + 1), 260); });
        el.querySelector("[data-no]").addEventListener("click", () => { close(); FX.burst({ x: innerWidth / 2, y: innerHeight / 2 }, { emojis: ["💎", "💜"], count: 12 }); FX.toast("Правильный выбор! Заботик рад", "💜"); });
      },
    });
  }

  /* ================= Все сервисы ================= */
  const ALL = [
    ["Деньги", [["pay", "Pay", "💳", "c-yellow"], ["invest", "Invest", "🚀", "c-black"], ["credit", "Credit", "🤑", "c-lime"], ["insure", "Insure", "☂️", "c-sky"]]],
    ["Еда и покупки", [["eat", "Eat", "🍜", "c-pink"], ["supermarket", "Supermarket", "🥑", "c-lime"], ["market", "Market", "🛍️", "c-pink"], ["pets", "Pets", "🐶", "c-yellow"]]],
    ["Передвижение", [["maps", "Maps", "🚕", "c-sky"], ["drive", "Drive", "🚗", "c-coral"], ["travel", "Travel", "🏝️", "c-orange"], ["scooter", "Scoot", "🛴", "c-mint"]]],
    ["Жильё", [["rent", "Rent", "🔑", "c-mint"], ["home-buy", "Home", "🏠", "c-yellow"], ["clean", "Clean", "🫧", "c-sky"], ["fix", "Fix", "🛠️", "c-orange"]]],
    ["Жизнь", [["job", "Job", "💼", "c-blue"], ["match", "Match", "💘", "c-pink"], ["health", "Health", "💊", "c-white"], ["learn", "Learn", "🎓", "c-lilac"], ["therapy", "Therapy", "🛋️", "c-coral"], ["fitness", "Fitness", "🏋️", "c-lime"], ["kids", "Kids", "🧸", "c-yellow"], ["forever", "Forever", "👻", "c-black"]]],
    ["Развлечения", [["music", "Music", "🎧", "c-violet"], ["tickets", "Tickets", "🎤", "c-orange"], ["games", "Games", "🎮", "c-lime"], ["wheel", "Колесо", "🎡", "c-holo"]]],
  ];
  Vibe.screen("all", {
    render() {
      return `
      ${Vibe.ui.head("Все сервисы", "34 сервиса · одна жизнь", Vibe.ui.vibikiPill())}
      <div class="field" style="margin-bottom:6px">🔍 <input placeholder="Найти сервис" data-search></div>
      ${ALL.map(([g, items]) => `
        <h2 class="sec">${g}</h2>
        <div class="svc-grid stagger">
          ${items.map(([go, s, e, c]) => `<button class="svc" data-go="${go}" data-name="${s.toLowerCase()}"><span class="svc-ic ${c}"><span class="emo">${e}</span></span><b>${s}</b></button>`).join("")}
        </div>`).join("")}
      <div class="card c-black" style="margin-top:26px;text-align:center">
        <div class="emo float" style="font-size:54px">👻</div>
        <div class="display" style="font-size:22px;color:var(--lime);margin:6px 0">Vibe Forever</div>
        <div style="color:#bdbac8;font-size:13px;font-weight:700">Цифровое бессмертие по подписке. Твой аватар продолжит пользоваться Vibe после тебя. Скоро.</div>
      </div>`;
    },
    mount(root) {
      const inp = root.querySelector("[data-search]");
      inp.addEventListener("input", () => {
        const q = inp.value.trim().toLowerCase();
        root.querySelectorAll(".svc").forEach((el) => (el.style.display = !q || el.dataset.name.includes(q) ? "" : "none"));
      });
    },
  });

  /* ================= 404 ================= */
  Vibe.screen("notfound", {
    render() {
      return `${Vibe.ui.head("Упс")}<div class="hero c-coral" style="text-align:center"><div class="emo float" style="font-size:90px">🫠</div><div class="display" style="max-width:none">Такого пока нет</div><p style="max-width:none">Но кредит на это уже предодобрен</p></div><button class="btn black block" style="margin-top:16px" data-go="home">На главную</button>`;
    },
  });
})();
