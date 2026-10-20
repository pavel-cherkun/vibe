/* ============================================================
   Vibe Психолог — экран «psy».
   • Шкала выгорания (stress из body.js) — крупно, вживую
   • Психологи (вымышленные): онлайн сейчас или очно в клинике
     (Vibe.sched kind:"therapy", place:"clinic") → мини-диалог → effect("therapy")
   • Чек-ин стресса (шуточный тест, не диагноз)
   • Самопомощь: дыхание 4-7-8, дневник, «выходной без телефона» (30 реальных минут)
   • Подписка «Психолог в кармане» (Vibe.subs)
   Пока идёт больничный по выгоранию, рабочие задачи блокируются
   обёрткой над Vibe.work.can / Vibe.game.completeTask (world.js не трогаем).
   ============================================================ */
(function () {
  const V = Vibe;
  const S = () => V.state.get();
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const meta = () => S().psy || {};
  const setMeta = (p) => V.state.set({ psy: Object.assign({}, meta(), p) });
  const money = (n) => V.rub(n);
  const esc = (s) => V.esc(s);
  const gDay = () => (V.game && S().game ? V.game.info().day : 0);
  const hasBody = () => !!(V.body && V.body.stress);
  const OFFLINE_MS = 30 * 60 * 1000;

  const SUB = { id: "psy_pocket", name: "Психолог в кармане", e: "🫶", price: 1490, note: "−50% на онлайн-сессии, дыхание ×1,4, чек-ин от Вайбота" };
  const hasSub = () => !!(V.subs && V.subs.has && V.subs.has(SUB.id));

  /* ================= Психологи ================= */
  const DOCS = [
    { id: "cbt", n: "Ирина Тишина", e: "🧠", col: "c-sky", role: "КПТ-практик", tag: "«Мысли — не факты»", price: 2900, power: 1, clinic: 1.3, rating: "4,9",
      about: "Структура, дневник мыслей и домашка. На «нормально» спрашивает: «А по шкале от 0 до 10?»" },
    { id: "tea", n: "Борис Самоваров", e: "🫖", col: "c-mint", role: "Гештальт и чай", tag: "«Что ты чувствуешь прямо сейчас?»", price: 2200, power: 0.9, clinic: 1.25, rating: "4,8",
      about: "Пустой стул, плед и чайник, который никогда не пустеет. Паузы по 40 секунд — это метод" },
    { id: "coach", n: "Максим Позитрон", e: "🌈", col: "c-yellow", role: "Корпоративный коуч", tag: "«Просто думай позитивно!»", price: 990, power: 0.2, clinic: 0.25, rating: "5,0", corp: true,
      about: "Сертифицирован Корпорацией за одни выходные. Сессия засчитывается как тимбилдинг" },
  ];
  const POS = "Просто думай позитивно! 🌈";
  const DIALOG = {
    cbt: {
      hi: "Здравствуй. Садись как удобно. Начнём с того, что сейчас важнее всего.",
      steps: [
        { q: "Что сейчас крутится в голове громче всего?", a: [
          { t: "Работа. Всегда работа", r: "Понимаю. Работа умеет занимать всё место, если ей позволить.", w: 0.05 },
          { t: "Деньги, которых нет", r: "Финансовая тревога — одна из самых громких. Хорошо, что ты её называешь.", w: 0.05 },
          { t: "Всё сразу и ничего конкретного", r: "Так бывает, когда устаёшь. Давай разложим по полочкам.", w: 0.08 } ] },
        { q: "Какая мысль приходит первой, когда ты об этом думаешь?", a: [
          { t: "«Я не справлюсь»", r: "Заметь: это мысль, а не факт. Сколько раз ты уже справлялся?", w: 0.08 },
          { t: "«Все справляются, а я нет»", r: "Ты видишь чужие витрины и свою кухню. Сравнение нечестное.", w: 0.08 },
          { t: "«Если не я, то кто»", r: "Звучит героически. И очень устало. Герои тоже берут выходной.", w: 0.06 } ] },
        { q: "Что бы ты сказал другу с такой же мыслью?", a: [
          { t: "«Ты не обязан тащить всё один»", r: "Вот. Попробуй сказать это себе. Тем же тоном.", w: 0.1 },
          { t: "«Иди поспи, гений»", r: "Отличный совет. Записываю тебе его в домашку.", w: 0.08 },
          { t: "Не знаю… обнял бы", r: "Иногда это и есть лучший ответ. Себя тоже можно.", w: 0.1 } ] },
        { q: "Домашка: одно маленькое дело на завтра. Что выберешь?", a: [
          { t: "Лечь до полуночи", r: "Сон — это фундамент. Договорились.", w: 0.05, hw: "Лечь до полуночи 🌙" },
          { t: "Прогулка без наушников", r: "Мир звучит интереснее подкастов. Иногда.", w: 0.05, hw: "Прогулка без наушников 🚶" },
          { t: "Написать маме просто так", r: "Маленькие связи держат нас лучше больших планов.", w: 0.05, hw: "Написать маме 💬", mom: true } ] },
      ],
      bye: "На сегодня всё. Ты молодец, что пришёл. Правда.",
    },
    tea: {
      hi: "Проходи. Чай? Я всё равно налью. Как ты?",
      steps: [
        { q: "Чай чёрный, зелёный или «как обычно, ничего не хочу»?", a: [
          { t: "Чёрный, покрепче", r: "Покрепче. Интересно. Тебе сейчас нужно что-то крепкое?", w: 0.05 },
          { t: "Зелёный, я же слежу за собой", r: "А кто следит за тем, чтобы ты не уставал следить?", w: 0.06 },
          { t: "Как обычно. Ничего не хочу", r: "Вот с этого «ничего не хочу» и начнём. Это важно.", w: 0.1 } ] },
        { q: "Ты сказал «нормально». Где в теле живёт это «нормально»?", a: [
          { t: "В плечах. Они у ушей", r: "Опусти их. Да, вот так. Заметил, как они вернулись?", w: 0.08 },
          { t: "В животе, комком", r: "Комок — это чувство без слов. Подержим его вместе.", w: 0.08 },
          { t: "В телефоне", r: "(долгая пауза) …Это очень честный ответ.", w: 0.06 } ] },
        { q: "Вот пустой стул. На нём сидит твоя работа. Что ты ей скажешь?", a: [
          { t: "«Тебя слишком много»", r: "Скажи ещё раз. Громче. Как ощущения?", w: 0.1 },
          { t: "«Спасибо, но я устал»", r: "Благодарность и границы могут жить вместе.", w: 0.1 },
          { t: "…молча допить чай", r: "Молчание тоже ответ. Работа, кажется, обиделась. Это нормально.", w: 0.06 } ] },
        { q: "Что ты заберёшь с собой из этой встречи?", a: [
          { t: "Разрешение отдыхать", r: "Забирай. Оно бессрочное.", w: 0.08 },
          { t: "Чувство, что я живой", r: "Это главное, что тут бывает.", w: 0.08 },
          { t: "Чайный пакетик", r: "Бери. Будет напоминанием. И заваркой.", w: 0.05 } ] },
      ],
      bye: "Наше время подошло к концу. Чай допей. Не спеши.",
    },
    coach: {
      hi: "Привет, чемпион! 🔥 Сегодня мы прокачаем твой майндсет на 300%!",
      steps: [
        { q: "Как дела? Только честно!", a: [
          { t: "Честно — плохо", r: POS, w: 0 }, { t: "Устал", r: POS, w: 0 }, { t: "Нормально", r: "Нормально — это почти отлично! " + POS, w: 0 } ] },
        { q: "Что тебя беспокоит?", a: [
          { t: "Выгорание", r: "Выгорание — это когда горишь недостаточно ярко! " + POS, w: 0 },
          { t: "Деньги", r: "Деньги любят позитивных. " + POS, w: 0 },
          { t: "Начальник", r: "Начальник — это твой ментор, просто без бюджета на менторство. " + POS, w: 0 } ] },
        { q: "Какие шаги ты готов предпринять?", a: [
          { t: "Отдохнуть", r: "Отдых — для тех, кто сдался. " + POS, w: 0 },
          { t: "Попросить помощи", r: "Помощь — это ты сам! " + POS, w: 0 },
          { t: "Сменить работу", r: "Ой. Это я, пожалуй, не передам. " + POS, w: 0 } ] },
        { q: "Оцени нашу сессию!", a: [
          { t: "⭐⭐⭐⭐⭐", r: "Спасибо! Отзыв уже у твоего начальника 💜", w: 0 },
          { t: "⭐⭐⭐⭐⭐ (других нет)", r: "Именно! Других и не бывает 💜", w: 0 },
          { t: "Можно я пойду?", r: "Конечно! Только думай позитивно по дороге 🌈", w: 0 } ] },
      ],
      bye: "Ты огонь! 🔥 Помни: плохого настроения не существует, есть недостаточно позитивное.",
    },
  };

  /* ================= Блокировка работы на больничном ================= */
  if (V.work && !V.work.__psyWrapped) {
    const can0 = V.work.can;
    V.work.can = function () {
      if (V.body && V.body.burnedOut && V.body.burnedOut()) return { ok: false, why: "Больничный по выгоранию. Работа подождёт — ты нет 🛌" };
      return can0.apply(this, arguments);
    };
    V.work.__psyWrapped = true;
  }
  if (V.game && V.game.completeTask && !V.game.__psyWrapped) {
    const ct0 = V.game.completeTask;
    V.game.completeTask = function () {
      if (V.body && V.body.burnedOut && V.body.burnedOut()) { FX.toast("Ты на больничном по выгоранию. Задачи на паузе 🛌", "🫠", 2600); return null; }
      return ct0.apply(this, arguments);
    };
    V.game.__psyWrapped = true;
  }

  /* ================= Сессия: мини-диалог ================= */
  function runSession(doc, mode) {
    const D = DIALOG[doc.id];
    const N = D.steps.length;
    const base = mode === "clinic" ? doc.clinic : doc.power;
    let step = -1, bonus = 0, done = false, hw = null;
    const where = mode === "clinic" ? "Кабинет в Vibe Health" : "Онлайн · камеру можно не включать";
    const apply = (k) => {
      if (!V.body) return;
      V.body.effect("therapy", { power: +(base * k + bonus).toFixed(2), why: `Сессия: ${doc.n}` });
      if (doc.corp) setTimeout(() => V.body.addStress && V.body.addStress(1, "Чувство вины за плохое настроение", "🌈"), 3200);
      try { if (V.skills && V.skills.xp) V.skills.xp("health", 10); } catch (e) {}
      V.emit && V.emit("therapy", { doc: doc.id, mode, full: k >= 1 });
      setMeta({ sessions: (meta().sessions || 0) + 1, lastDoc: doc.id, hw: hw || meta().hw || null });
    };
    V.modal(`<div class="psy-sess" data-sess></div>`, {
      sound: "pop",
      onMount(m, close) {
        const box = m.querySelector("[data-sess]");
        const head = `<div class="psy-sess-head"><span class="psy-ava ${doc.col}">${doc.e}</span><div><b>${esc(doc.n)}</b><small>${where}</small></div></div>`;
        const draw = (reply) => {
          if (step >= N) {
            box.innerHTML = `${head}
              <div class="psy-bubble">${reply ? `<i>${esc(reply)}</i><br><br>` : ""}${esc(D.bye)}</div>
              ${hw ? `<div class="psy-hw">📝 Домашка: <b>${esc(hw)}</b></div>` : ""}
              <div class="psy-care">🤍 Это игра, а не терапия. В реальной жизни просить о помощи — нормально и смело.</div>
              <button class="btn black block" data-close>Спасибо 💜</button>`;
            return;
          }
          const s = step < 0 ? { q: D.hi, a: [{ t: "Начнём", r: "", w: 0 }] } : D.steps[step];
          box.innerHTML = `${head}
            <div class="psy-bubble">${reply ? `<i>${esc(reply)}</i><br><br>` : ""}${esc(s.q)}</div>
            <div class="psy-choices stagger">${s.a.map((a, i) => `<button class="btn block psy-ch" data-ch="${i}">${esc(a.t)}</button>`).join("")}</div>
            <div class="psy-dots">${Array.from({ length: N }, (_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>`;
          box.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
        };
        m.addEventListener("click", (e) => {
          const c = e.target.closest("[data-ch]"); if (!c) return;
          const s = step < 0 ? null : D.steps[step];
          const a = s ? s.a[+c.dataset.ch] : null;
          if (a) {
            bonus += a.w || 0;
            if (a.hw) hw = a.hw;
            if (a.mom && V.people && V.people.rel) V.people.rel("mom", 3);
          }
          FX.bump(c);
          step++;
          if (step >= N && !done) {
            done = true; apply(1);
            FX.confetti({ count: doc.corp ? 40 : 90 });
            V.reward({ xp: 30, from: c });
          }
          draw(a ? a.r : "");
        });
        draw("");
      },
      onClose() {
        if (done) return;
        done = true;
        apply(0.3 + 0.5 * Math.max(0, step) / N);
        FX.toast(`${doc.n} записал(а) в заметках: «ушёл раньше». Ничего, бывает`, "📝", 2600);
      },
    });
  }

  function bookOnline(doc, from) {
    if (!S().profile) return;
    const b = V.body ? V.body.get() : null;
    if (b && b.sleeping) { FX.toast("Ты спишь. Психолог тоже. Утром!", "😴"); return; }
    const price = hasSub() && !doc.corp ? Math.round(doc.price / 2) : doc.price;
    if (!V.pay(price, { title: `Vibe Психолог · ${doc.n}`, emoji: doc.e, col: doc.col, from })) return;
    FX.burst(from, { emojis: [doc.e, "💬", "🤍"], count: 10 });
    setTimeout(() => runSession(doc, "online"), 450);
  }

  function slots() {
    const i = V.game.info();
    const out = [];
    for (let d = i.day; d <= i.day + 2; d++) {
      [10, 14, 18].forEach((h) => { if (d > i.day || h > i.hour + 1) out.push({ day: d, hour: h }); });
    }
    return out.slice(0, 6);
  }
  const dayLabel = (d) => { const t = gDay(); return d === t ? "Сегодня" : d === t + 1 ? "Завтра" : "Послезавтра"; };

  function bookClinic(doc, rerender) {
    if (!V.sched) { FX.toast("Расписание пока недоступно", "🚧"); return; }
    V.ui.sheet(`
      <div class="display" style="font-size:24px">${doc.e} ${esc(doc.n)} · очно</div>
      <p class="muted" style="font-weight:700;margin:6px 0 12px">Кабинет в Vibe Health. Живая встреча работает сильнее: ×${String(doc.clinic).replace(".", ",")}. Оплата сейчас, неявка — деньги сгорят (как и у всех).</p>
      <div class="grid2 stagger">${slots().map((s) => `<button class="card tight tap psy-slot" data-slot="${s.day}:${s.hour}"><b>${dayLabel(s.day)}</b><span>${s.hour}:00</span></button>`).join("")}</div>
      <div class="fine">Цена ${money(doc.price)}. Добраться до клиники — через Vibe Maps.</div>`, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          const b = e.target.closest("[data-slot]"); if (!b) return;
          const [day, hour] = b.dataset.slot.split(":").map(Number);
          if (!V.pay(doc.price, { title: `Vibe Психолог · запись к ${doc.n}`, emoji: doc.e, col: doc.col, from: b })) return;
          V.sched.add({ day, hour, min: 0, dur: 60, title: `Психолог · ${doc.n}`, e: doc.e, place: "clinic", kind: "therapy", price: doc.price, go: "psy", params: { doc: doc.id } });
          close();
          FX.confetti({ count: 60 });
          FX.toast(`Записал: ${dayLabel(day).toLowerCase()} в ${hour}:00, клиника. Приходи вовремя 🏥`, "📅", 3000);
          rerender && setTimeout(rerender, 300);
        });
      },
    });
  }

  // Пришёл в клинику → сессия
  if (V.sched && V.sched.on) {
    V.sched.on("therapy", (ev) => {
      const doc = DOCS.find((d) => d.id === ((ev.params && ev.params.doc) || "cbt")) || DOCS[0];
      if (!document.hidden) setTimeout(() => {
        if (document.querySelector(".modal")) setTimeout(() => runSession(doc, "clinic"), 2600);
        else runSession(doc, "clinic");
      }, 1400);
      else if (V.body) V.body.effect("therapy", { power: doc.clinic, why: `Сессия: ${doc.n}`, quiet: true });
    });
    V.sched.on("therapy:missed", (ev) => {
      setTimeout(() => FX.toast("Психолог ждал 15 минут и записал: «сопротивление». Перезапишись, без стыда", "🛋️", 3600), 1800);
    });
  }

  /* ================= Чек-ин стресса ================= */
  const CHECK = [
    "просыпался уже уставшим",
    "открывал рабочий чат в выходной",
    "ел над клавиатурой",
    "чувствовал, что всё бессмысленно (кроме кэшбека)",
    "отвечал «нормально», когда было не нормально",
  ];
  const SCALE = ["Ни разу", "Пару раз", "Через день", "Каждый день"];
  function checkBand(score) {
    if (score <= 3) return { e: "✨", t: "Ты в ресурсе", d: "Береги это состояние. Оно не бесконечное, но твоё", col: "c-lime" };
    if (score <= 7) return { e: "🔋", t: "Подустал", d: "Ничего страшного. Пара нормальных ночей и прогулка — и ты снова ты", col: "c-yellow" };
    if (score <= 11) return { e: "🧯", t: "Пора беречь себя", d: "Выходной, близкие, психолог. Можно всё сразу", col: "c-orange" };
    return { e: "🆘", t: "Красная зона", d: "Сбавь обороты. И поговори с кем-нибудь — это работает лучше, чем терпеть", col: "c-coral" };
  }
  function runCheck(rerender) {
    let i = 0, score = 0;
    V.ui.sheet(`<div data-ck></div>`, {
      onMount(sh, close) {
        const box = sh.querySelector("[data-ck]");
        const draw = () => {
          if (i >= CHECK.length) {
            const band = checkBand(score);
            const st = hasBody() ? V.body.stress() : null;
            const fresh = meta().checkDay !== gDay();
            box.innerHTML = `
              <div class="psy-res ${band.col}"><div class="psy-res-e">${band.e}</div><div class="display" style="font-size:26px">${band.t}</div><p>${band.d}</p><b>${score} из 15</b></div>
              ${st ? `<p class="psy-cmp">⌚ А браслет считает: стресс <b>${st.value}%</b> — «${st.label}». ${Math.abs(st.value / 100 * 15 - score) > 5 ? (st.value / 100 * 15 > score ? "Тело устало сильнее, чем кажется." : "Кажется, голове тяжелее, чем телу. Это тоже важно.") : "Вы с браслетом сходитесь во мнениях."}</p>` : ""}
              <div class="fine">Это игровой тест по мотивам опросников, а не диагноз. Если в жизни тяжело долго — сходи к специалисту, это нормально.</div>
              <button class="btn black block" data-close style="margin-top:12px">Понял 💜</button>`;
            setMeta({ checkDay: gDay(), checks: [...(meta().checks || []), { day: gDay(), score }].slice(-7) });
            if (fresh) {
              V.reward({ vibiki: 20, xp: 15 });
              if (V.body && V.body.addStress) V.body.addStress(-2, "Чек-ин: заметил себя", "📋");
            }
            FX.sound.success();
            rerender && setTimeout(rerender, 300);
            return;
          }
          box.innerHTML = `
            <div class="badge">📋 Чек-ин · ${i + 1}/${CHECK.length}</div>
            <div class="display" style="font-size:22px;margin:10px 0 14px">Как часто за неделю ты ${esc(CHECK[i])}?</div>
            <div class="stack stagger">${SCALE.map((t, k) => `<button class="btn block psy-ch" data-sc="${k}">${t}</button>`).join("")}</div>`;
          box.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, n) => c.style.setProperty("--i", n)));
        };
        sh.addEventListener("click", (e) => {
          const b = e.target.closest("[data-sc]"); if (!b) return;
          score += +b.dataset.sc; i++; FX.bump(b); draw();
        });
        draw();
      },
    });
  }

  /* ================= Дыхание 4-7-8 ================= */
  function runBreath() {
    const timers = [];
    let cycles = 0, closed = false;
    const PH = [["Вдох носом", 4, 1.0], ["Задержи дыхание", 7, 1.0], ["Медленный выдох ртом", 8, 0.45]];
    V.modal(`
      <div class="badge">🌬️ Дыхание 4-7-8</div>
      <div class="psy-breath"><div class="psy-orb" data-orb></div><div class="psy-orb-t"><b data-ph>Готовься</b><span data-cnt></span></div></div>
      <p data-cyc style="font-weight:800">Цикл 0 из 3</p>
      <button class="btn block" data-close>Хватит</button>
      <div class="fine">Если закружится голова — просто дыши как обычно. Это упражнение, а не экзамен.</div>`, {
      sound: "pop",
      onMount(m) {
        const orb = m.querySelector("[data-orb]"), ph = m.querySelector("[data-ph]"), cnt = m.querySelector("[data-cnt]"), cyc = m.querySelector("[data-cyc]");
        const later = (fn, ms) => timers.push(setTimeout(() => { if (!closed) fn(); }, ms));
        const runPhase = (p) => {
          const [t, sec, scale] = PH[p];
          ph.textContent = t;
          orb.style.transition = p === 1 ? "none" : `transform ${sec}s ease-in-out`;
          orb.style.transform = `scale(${scale})`;
          orb.dataset.p = p;
          for (let s = 0; s < sec; s++) later(() => (cnt.textContent = sec - s), s * 1000);
          later(() => {
            if (p < 2) return runPhase(p + 1);
            cycles++;
            cyc.textContent = `Цикл ${cycles} из 3`;
            if (cycles >= 3) {
              ph.textContent = "Готово 🤍"; cnt.textContent = "";
              FX.confetti({ count: 50 });
              return;
            }
            runPhase(0);
          }, sec * 1000);
        };
        orb.style.transform = "scale(.45)";
        later(() => runPhase(0), 900);
      },
      onClose() {
        closed = true;
        timers.forEach(clearTimeout);
        if (cycles >= 1 && V.body) V.body.effect("breathe", { power: (hasSub() ? 1.4 : 1) * (cycles >= 3 ? 1 : 0.6) });
        else FX.toast("Даже одна попытка — уже забота о себе", "🌬️");
      },
    });
  }

  /* ================= Дневник ================= */
  const PROMPTS = [
    "Что сегодня отняло больше всего сил? А что дало хоть немного?",
    "Три вещи, которые сегодня были нормальными. Можно совсем маленькие",
    "Что бы ты сказал себе месяц назад?",
    "Чего ты сейчас хочешь — не «надо», а именно хочешь?",
    "О чём ты переживаешь? Запиши, и пусть это полежит тут, а не в голове",
    "Кому ты благодарен на этой неделе и за что?",
    "Какое «нет» ты давно хочешь сказать?",
    "Как выглядел бы идеальный выходной? Без телефона, без чувства вины",
  ];
  function runJournal(rerender) {
    const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    V.ui.sheet(`
      <div class="badge">📓 Дневник</div>
      <div class="display" style="font-size:22px;margin:10px 0">${esc(p)}</div>
      <textarea class="psy-ta" data-ta rows="5" maxlength="600" placeholder="Пиши как есть. Никто не оценивает. Даже Корпорация (почти)"></textarea>
      <button class="btn black block" data-save style="margin-top:10px">Записать</button>
      <div class="fine">Записи хранятся только в твоём сохранении. Записей: ${(meta().journal || []).length}</div>`, {
      onMount(sh, close) {
        const ta = sh.querySelector("[data-ta]");
        setTimeout(() => ta && ta.focus(), 350);
        sh.addEventListener("click", (e) => {
          const b = e.target.closest("[data-save]"); if (!b) return;
          const text = (ta.value || "").trim();
          if (text.length < 5) { FX.shake(b); FX.toast("Хотя бы пару слов. Можно «устал»", "✍️"); return; }
          setMeta({ journal: [...(meta().journal || []), { day: gDay(), p, text }].slice(-20) });
          if (V.body) V.body.effect("journal");
          V.reward({ xp: 10, silent: true });
          FX.burst(b, { emojis: ["📓", "🤍", "✨"], count: 10 });
          close();
          rerender && setTimeout(rerender, 300);
        });
      },
    });
  }

  /* ================= Выходной без телефона ================= */
  function offlineState() {
    const o = meta().offline;
    if (!o) return null;
    const el = Date.now() - o.start;
    return { el, left: Math.max(0, OFFLINE_MS - el), done: el >= OFFLINE_MS };
  }
  const offlineCooldown = () => meta().offlineDay != null && meta().offlineDay >= gDay();
  function startOffline(rerender) {
    setMeta({ offline: { start: Date.now() } });
    V.modal(`
      <div class="m-emo float">📵</div>
      <div class="display" style="font-size:26px">Закрой Vibe на 30 минут</div>
      <p>Серьёзно. Реальных минут. Сходи за водой, посмотри в окно, позвони кому-нибудь живому. Когда вернёшься — тут будет награда.</p>
      <button class="btn black block" data-close>Ухожу 👋</button>
      <div class="fine">Корпорация впервые просит тебя не пользоваться приложением. Цени момент.</div>`, { sound: "pop" });
    rerender && setTimeout(rerender, 300);
  }
  function checkOffline(fromReturn) {
    if (!S().profile || !S().game) return;
    const o = offlineState();
    if (!o) return;
    if (o.done) {
      if (document.querySelector(".modal")) return setTimeout(() => checkOffline(fromReturn), 2500);
      setMeta({ offline: null, offlineDay: gDay(), offlineCount: (meta().offlineCount || 0) + 1 });
      if (V.body) V.body.effect("rest_day", { quiet: true });
      FX.confetti();
      V.modal(`
        <div class="m-emo float">🌿</div>
        <div class="display" style="font-size:28px">С возвращением!</div>
        <p>Ты продержался 30 минут без Vibe. Стресс −15, энергия +10. Браслет говорит, что пульс выровнялся.</p>
        <button class="btn black block" data-close data-psyrew>Забрать 150 вайбиков</button>
        <div class="fine">Корпорация засекла твоё отсутствие и немного заволновалась. Возвращайся. Но не слишком часто 💜</div>`, {
        sound: "levelup",
        onMount(m) { m.addEventListener("click", (e) => { const b = e.target.closest("[data-psyrew]"); if (b) V.reward({ vibiki: 150, xp: 80, from: b }); }); },
      });
      if (V.current && V.current.route.name === "psy") setTimeout(() => V.replace("psy"), 600);
    } else if (fromReturn) {
      FX.toast(`Прошло ${Math.floor(o.el / 60000)} мин из 30. Телефон подождёт 📵`, "🌿", 3000);
    }
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(() => checkOffline(true), 800); });
  setTimeout(() => checkOffline(true), 3000);

  /* ================= Подписка ================= */
  function subscribe(from, rerender) {
    if (hasSub()) return;
    if (!V.pay(SUB.price, { title: `Vibe Психолог · ${SUB.name}`, emoji: SUB.e, col: "c-pink", from })) return;
    V.subs.add({ id: SUB.id, name: SUB.name, e: SUB.e, price: SUB.price, note: SUB.note });
    FX.confetti({ count: 80 });
    FX.toast("Психолог теперь в кармане. Карман — наш 💜", SUB.e, 2600);
    rerender && setTimeout(rerender, 300);
  }
  function unsubscribe(rerender) {
    V.modal(`
      <div class="m-emo wobble">🥺</div>
      <div class="display" style="font-size:24px">Отменить заботу?</div>
      <p>Мы будем скучать. Профессионально. С пониманием. И с напоминаниями.</p>
      <div style="display:grid;gap:10px">
        <button class="btn black block" data-close>Остаться в кармане</button>
        <button class="btn block" data-unsub data-close>Да, отменить</button>
      </div>
      <div class="fine">Отписаться — это тоже граница. Психолог бы одобрил. Корпорация — нет.</div>`, {
      sound: "pop",
      onMount(m) { m.addEventListener("click", (e) => { if (e.target.closest("[data-unsub]")) { V.subs.remove(SUB.id); FX.toast("Подписка отменена. Ты справишься. Мы верим (и ждём)", "🫶"); rerender && setTimeout(rerender, 300); } }); },
    });
  }

  // Вайбот присылает чек-ин подписчикам, когда стадия растёт
  if (V.on) {
    V.on("stress", (d) => {
      if (!hasSub() || !d || d.stage <= d.prev) return;
      const t = d.stage >= 3 ? "Ты выгорел. Я рядом. Давай без задач — просто подышим вместе 🌬️ (Vibe Психолог)"
        : d.stage === 2 ? "Браслет говорит, ты на грани. Может, сессия со скидкой 50%? Или просто полежать?"
        : "Заметил, что ты устал. Пять минут дыхания — и мир чуть добрее 🫶";
      try { if (V.msg && V.msg.send) V.msg.send("zabotik", t, { from: "zabotik" }); else setTimeout(() => FX.toast(`Вайбот: ${t}`, "🤖", 3600), 4000); } catch (e) {}
    });
  }

  /* ================= Рендер ================= */
  const dur = (min) => { min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60); return h ? `${h} ч ${min % 60} мин` : `${min} мин`; };
  const FACES = ["😌", "😮‍💨", "😵‍💫", "🫠"];
  const LINES = [
    "Ты в ресурсе. Корпорация уже думает, чем его занять",
    "Устал. Продуктивность −10%. Самое время для выходного",
    "На грани. Продуктивность −25%, мама волнуется, браслет пищит",
    "Выгорание. Тамагочи улетел на больничный",
  ];

  function meterHtml() {
    if (!hasBody()) return `<div class="card">⌚ Браслет не отвечает</div>`;
    const st = V.body.stress();
    const ava = (S().profile && S().profile.avatar) || "😎";
    const log = st.log.slice(-6);
    const bars = [...log.map((x) => ({ v: x.v, l: ((x.day % 30) + 1) })), { v: st.value, l: "сег", today: true }];
    const prod = V.body.productivity();
    return `
      <div class="psy-meter card ${st.burnedOut ? "out" : ""}">
        <div class="psy-m-top">
          <div class="psy-m-ava ${st.col}">
            ${st.burnedOut ? `<span class="psy-gone"><span class="emo">🎈</span><span class="emo">${ava}</span></span>` : `<span class="emo ${st.stage >= 2 ? "wobble" : "float"}">${ava}</span><span class="psy-m-face">${FACES[st.stage]}</span>`}
          </div>
          <div class="psy-m-num">
            <small>Стресс</small>
            <div class="big-num">${st.value}<span>%</span></div>
            <span class="badge ${st.col}">${st.e} ${st.label}</span>
          </div>
        </div>
        <div class="psy-scale">
          <div class="psy-scale-bar"><i style="left:40%"></i><i style="left:65%"></i><i style="left:90%"></i></div>
          <div class="psy-scale-mk" style="left:${clamp(st.value)}%"><span>${FACES[st.stage]}</span></div>
          <div class="psy-scale-lb"><span>Ок</span><span style="left:40%">Устал</span><span style="left:65%">На грани</span><span style="left:90%">🔥</span></div>
        </div>
        <p class="psy-m-line">${LINES[st.stage]}</p>
        ${st.burnedOut ? `<div class="psy-leave">🛌 Больничный: ещё <b>${dur(st.leftMin)}</b> игрового времени (≈ ${Math.max(1, Math.round(st.leftMin / 60))} мин реальных). Рабочие задачи на паузе. Выйти можно, когда стресс ниже 50%.</div>` : ""}
        <div class="psy-m-row">
          <span>💼 Продуктивность <b>${prod.value}%</b>${prod.note ? ` · ${esc(prod.note)}` : ""}</span>
          <span>❤️ Пульс <b>${V.body.heartRate()}</b></span>
          ${st.streak ? `<span>📆 Дней работы подряд <b>${st.streak}</b></span>` : ""}
        </div>
        <div class="psy-week">${bars.map((b) => `<div class="${b.today ? "today" : ""}"><i style="height:${Math.max(4, b.v)}%;--c:${b.v >= 90 ? "var(--coral)" : b.v >= 65 ? "var(--orange)" : b.v >= 40 ? "var(--yellow)" : "var(--lime)"}"></i><small>${b.l}</small></div>`).join("")}</div>
        ${st.why.length ? `<div class="psy-why">${st.why.slice(0, 5).map((w) => `<span class="${w.d > 0 ? "up" : "down"}">${w.e || ""} ${esc(w.t)} <b>${w.d > 0 ? "+" : ""}${w.d}</b></span>`).join("")}</div>` : ""}
      </div>`;
  }

  function docCard(d) {
    const price = hasSub() && !d.corp ? Math.round(d.price / 2) : d.price;
    return `
      <div class="card psy-doc" data-doc="${d.id}">
        <div class="psy-doc-top">
          <span class="psy-ava big ${d.col}">${d.e}</span>
          <div style="flex:1;min-width:0"><b>${esc(d.n)}</b><small>${esc(d.role)} · ⭐ ${d.rating}</small><em>${esc(d.tag)}</em></div>
          ${d.corp ? `<span class="sticker psy-corp">партнёр Корпорации</span>` : ""}
        </div>
        <p>${esc(d.about)}</p>
        <div class="psy-doc-btns">
          <button class="btn sm black" data-act="online">💻 Онлайн сейчас · ${price !== d.price ? `<s>${money(d.price)}</s> ` : ""}${money(price)}</button>
          <button class="btn sm" data-act="clinic">🏥 В клинике</button>
        </div>
      </div>`;
  }

  function toolsHtml() {
    const o = offlineState();
    const cd = offlineCooldown();
    const checked = meta().checkDay === gDay();
    const last = (meta().checks || []).slice(-1)[0];
    return `
      <div class="grid2 stagger">
        <button class="card tap psy-tool c-sky" data-act="breath"><span class="emo float">🌬️</span><b>Дыхание 4-7-8</b><small>3 цикла · минута</small></button>
        <button class="card tap psy-tool c-lilac" data-act="journal"><span class="emo float d1">📓</span><b>Дневник</b><small>${(meta().journal || []).length} записей</small></button>
        <button class="card tap psy-tool c-mint" data-act="check"><span class="emo float d2">📋</span><b>Чек-ин стресса</b><small>${checked && last ? `сегодня: ${last.score}/15` : "5 вопросов · +20 🪙"}</small></button>
        <button class="card tap psy-tool c-yellow" data-act="offline"><span class="emo float d3">📵</span><b>Выходной без телефона</b><small>${o ? (o.done ? "готово! забери награду" : `идёт · осталось ${Math.ceil(o.left / 60000)} мин`) : cd ? "уже было сегодня ✅" : "30 реальных минут · +150 🪙"}</small></button>
      </div>
      ${o && !o.done ? `<div class="card psy-off"><b>📵 Челлендж идёт.</b> Ты всё ещё здесь 👀 Закрой Vibe — время считается, даже когда приложение закрыто. <button class="btn sm" data-act="giveup" style="margin-top:8px">Сдаться (без стыда)</button></div>` : ""}`;
  }

  function subHtml() {
    const on = hasSub();
    return `
      <div class="card psy-sub ${on ? "c-pink" : "c-white"}">
        <div class="psy-doc-top"><span class="psy-ava big c-pink">${SUB.e}</span><div style="flex:1"><b>${SUB.name}</b><small>${money(SUB.price)} / мес · списывается сама</small></div>${on ? `<span class="badge c-lime">активна</span>` : ""}</div>
        <ul class="psy-list"><li>−50% на онлайн-сессии (кроме коуча, он и так бесценен)</li><li>Дыхание помогает сильнее: ×1,4</li><li>Вайбот пишет, когда ты на грани</li></ul>
        ${on ? `<p class="psy-daily">🤖 Чек-ин дня: «${esc(dailyLine())}»</p><button class="btn sm block" data-act="unsub">Отменить подписку</button>`
          : `<button class="btn black block" data-act="sub">Подписаться · ${money(SUB.price)}</button>`}
        <div class="fine">Психолог в кармане не заменяет живого специалиста. Зато всегда онлайн. Как и твой начальник.</div>
      </div>`;
  }
  function dailyLine() {
    const L = ["Ты не обязан быть продуктивным, чтобы быть ценным", "Вода, сон, прогулка. Скучно, но работает", "Сегодня можно сделать на 20% меньше. Мир не рухнет",
      "Напиши кому-нибудь, кого давно не слышал", "Ты делаешь достаточно. Даже когда кажется, что нет", "Отдых — это не награда за работу. Это часть жизни"];
    return L[gDay() % L.length];
  }

  function bodyHtml() {
    const booked = V.sched ? V.sched.list().filter((e) => e.kind === "therapy" && e.status === "planned") : [];
    const hw = meta().hw;
    return `
      <div data-psy-meter>${meterHtml()}</div>
      ${hw ? `<div class="card tight psy-hw-card">📝 Домашка от психолога: <b>${esc(hw)}</b></div>` : ""}
      <h2 class="sec">Психологи <small>${(meta().sessions || 0)} сессий</small></h2>
      ${booked.length ? `<div class="stack" style="margin-bottom:12px">${booked.map((e) => `<div class="card tight psy-booked">${e.e} <b>${esc(e.title)}</b> · ${dayLabel(e.day)} ${e.hour}:00 · 🏥 клиника <button class="btn sm" data-go="maps">Как добраться</button></div>`).join("")}</div>` : ""}
      <div class="stack stagger">${DOCS.map(docCard).join("")}</div>
      <h2 class="sec">Самопомощь <small>бесплатно</small></h2>
      ${toolsHtml()}
      <h2 class="sec">Подписка</h2>
      ${subHtml()}
      <h2 class="sec">Что снимает стресс</h2>
      <div class="psy-help stagger">
        <span>😴 Сон дома</span><button data-go="people">🫂 Близкие</button><button data-go="maps">🚶 Прогулка</button>
        <button data-go="hobby">🎸 Хобби</button><button data-go="travel">🏝️ Путешествие</button><span>🛋️ Выходные без работы</span>
      </div>
      <div class="card psy-care-card">
        <div class="emo" style="font-size:34px">🤍</div>
        <p><b>Это игра.</b> А в реальной жизни просить о помощи — нормально. Если тебе тяжело, поговори с близкими или обратись к специалисту. Это смелость, а не слабость.</p>
      </div>
      <div class="fine">Vibe Психолог не ставит диагнозов и не заменяет специалиста. Все психологи вымышлены. Совпадения с вашим коучем случайны.</div>`;
  }

  V.screen("psy", {
    render() {
      injectCss();
      if (V.body) V.body.tick();
      return `
        ${V.ui.head("Vibe Психолог", "Забота по подписке", V.ui.vibikiPill())}
        <div class="stagger">
          ${V.ui.hero({ title: "Как ты на самом деле?", text: "Не «нормально». По-настоящему", emo: "🛋️", color: "c-lilac", sticker: hasSub() ? "🫶 в кармане" : "−50% с подпиской" })}
          <div data-psy-body>${bodyHtml()}</div>
        </div>`;
    },
    mount(root) {
      const body = root.querySelector("[data-psy-body]");
      const rerender = () => {
        if (!body.isConnected) return;
        body.innerHTML = bodyHtml();
        body.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
      };
      let raf = 0;
      const refreshMeter = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const m = root.querySelector("[data-psy-meter]");
          if (m) m.innerHTML = meterHtml();
        });
      };
      const unsub = V.body && V.body.on ? V.body.on(refreshMeter) : null;
      const iv = setInterval(refreshMeter, 2500);
      const onClick = (e) => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        const a = b.dataset.act;
        const card = b.closest("[data-doc]");
        const doc = card ? DOCS.find((d) => d.id === card.dataset.doc) : null;
        if (a === "online" && doc) bookOnline(doc, b);
        else if (a === "clinic" && doc) bookClinic(doc, rerender);
        else if (a === "breath") runBreath();
        else if (a === "journal") runJournal(rerender);
        else if (a === "check") runCheck(rerender);
        else if (a === "offline") {
          const o = offlineState();
          if (o && o.done) checkOffline(false);
          else if (o) FX.toast(`Осталось ${Math.ceil(o.left / 60000)} мин. Закрой приложение — это и есть челлендж`, "📵", 2600);
          else if (offlineCooldown()) FX.toast("Сегодня ты уже отдыхал без телефона. Завтра можно снова", "✅");
          else startOffline(rerender);
        }
        else if (a === "giveup") { setMeta({ offline: null }); FX.toast("Ничего страшного. Попробуешь вечером", "🌿"); rerender(); }
        else if (a === "sub") subscribe(b, rerender);
        else if (a === "unsub") unsubscribe(rerender);
      };
      root.addEventListener("click", onClick);
      return () => {
        root.removeEventListener("click", onClick);
        clearInterval(iv);
        if (raf) cancelAnimationFrame(raf);
        unsub && unsub();
      };
    },
  });

  /* ================= Стили ================= */
  function injectCss() {
    if (document.getElementById("psy-style")) return;
    const st = document.createElement("style");
    st.id = "psy-style";
    st.textContent = `
      .psy-meter { padding: 16px; margin-top: 14px; }
      .psy-meter.out { background: linear-gradient(180deg, #d9c8ff, #fff 60%); }
      .psy-m-top { display: flex; gap: 14px; align-items: center; }
      .psy-m-ava { position: relative; width: 92px; height: 92px; flex: 0 0 92px; border: var(--line); border-radius: 50%; display: grid; place-items: center; font-size: 52px; box-shadow: var(--shadow-sm); overflow: visible; }
      .psy-m-face { position: absolute; right: -6px; bottom: -4px; font-size: 30px; background: #fff; border: var(--line); border-radius: 50%; width: 40px; height: 40px; display: grid; place-items: center; }
      .psy-gone { display: flex; flex-direction: column; align-items: center; font-size: 30px; line-height: 1; animation: psy-gone 3.4s ease-in-out infinite; }
      .psy-gone .emo:last-child { font-size: 34px; opacity: .55; }
      @keyframes psy-gone { 0%, 100% { transform: translateY(6px) rotate(-6deg); } 50% { transform: translateY(-14px) rotate(6deg); } }
      .psy-m-num { flex: 1; min-width: 0; }
      .psy-m-num small { font-weight: 800; color: var(--muted); font-size: 12px; }
      .psy-m-num .big-num { font-size: 56px; }
      .psy-m-num .big-num span { font-size: 26px; }
      .psy-scale { position: relative; margin: 18px 0 4px; padding-bottom: 18px; }
      .psy-scale-bar { position: relative; height: 18px; border: var(--line); border-radius: 99px; background: linear-gradient(90deg, var(--lime) 0 40%, var(--yellow) 40% 65%, var(--orange) 65% 90%, var(--coral) 90%); }
      .psy-scale-bar i { position: absolute; top: -3px; bottom: -3px; width: 2.5px; background: var(--ink); }
      .psy-scale-mk { position: absolute; top: -12px; transform: translateX(-50%); transition: left .6s var(--spring); }
      .psy-scale-mk span { display: grid; place-items: center; width: 34px; height: 34px; background: #fff; border: var(--line); border-radius: 50%; font-size: 20px; box-shadow: var(--shadow-sm); }
      .psy-scale-lb { position: relative; height: 14px; margin-top: 4px; font-size: 10px; font-weight: 800; color: var(--muted); }
      .psy-scale-lb span { position: absolute; left: 0; transform: translateX(-50%); white-space: nowrap; }
      .psy-scale-lb span:first-child { transform: none; }
      .psy-m-line { font-weight: 800; font-size: 14px; margin: 4px 0 8px; }
      .psy-leave { background: var(--lilac); border: var(--line); border-radius: 16px; padding: 10px 12px; font-size: 13px; font-weight: 700; margin-bottom: 10px; }
      .psy-m-row { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 12px; font-weight: 700; color: var(--muted); }
      .psy-m-row b { color: var(--ink); }
      .psy-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; height: 74px; margin-top: 12px; align-items: end; }
      .psy-week div { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 3px; }
      .psy-week i { width: 100%; max-width: 26px; border: 2px solid var(--ink); border-radius: 8px 8px 4px 4px; background: var(--c); }
      .psy-week small { font-size: 10px; font-weight: 800; color: var(--muted); }
      .psy-week .today small { color: var(--ink); }
      .psy-why { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
      .psy-why span { font-size: 11px; font-weight: 800; border: 2px solid var(--ink); border-radius: 99px; padding: 3px 8px; }
      .psy-why .up { background: #ffe0e0; } .psy-why .down { background: #e9ffd0; }
      .psy-ava { display: inline-grid; place-items: center; width: 44px; height: 44px; flex: 0 0 44px; border: var(--line); border-radius: 50%; font-size: 24px; }
      .psy-ava.big { width: 52px; height: 52px; flex-basis: 52px; font-size: 28px; }
      .psy-doc { padding: 14px; position: relative; }
      .psy-doc-top { display: flex; gap: 12px; align-items: center; }
      .psy-doc-top b { display: block; font-size: 16px; }
      .psy-doc-top small { display: block; font-weight: 800; color: var(--muted); font-size: 12px; }
      .psy-doc-top em { display: block; font-style: normal; font-weight: 800; font-size: 13px; margin-top: 2px; }
      .psy-doc p { font-size: 13px; font-weight: 600; margin: 10px 0; }
      .psy-doc-btns { display: flex; gap: 8px; flex-wrap: wrap; }
      .psy-doc-btns .btn { flex: 1 1 auto; white-space: nowrap; }
      .psy-doc-btns s { opacity: .6; font-weight: 600; }
      .psy-corp { position: absolute; top: -10px; right: 10px; font-size: 10px; transform: rotate(4deg); background: var(--yellow); }
      .psy-tool { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 14px; min-height: 118px; font: inherit; color: inherit; }
      .psy-tool .emo { font-size: 34px; }
      .psy-tool b { font-size: 14px; line-height: 1.15; }
      .psy-tool small { font-size: 11px; font-weight: 800; opacity: .75; }
      .psy-off { margin-top: 12px; font-size: 13px; font-weight: 600; }
      .psy-sub { padding: 16px; }
      .psy-list { margin: 10px 0 12px 18px; font-size: 13px; font-weight: 700; display: grid; gap: 4px; }
      .psy-daily { font-size: 13px; font-weight: 800; background: #fff; border: var(--line); border-radius: 14px; padding: 8px 10px; margin-bottom: 10px; }
      .psy-help { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
      .psy-help > * { font: inherit; font-size: 13px; font-weight: 800; border: var(--line); border-radius: 99px; padding: 7px 12px; background: #fff; box-shadow: var(--shadow-sm); color: var(--ink); }
      .psy-help button { background: var(--mint); cursor: pointer; }
      .psy-care-card { display: flex; gap: 12px; align-items: center; background: #fff7fb; }
      .psy-care-card p { font-size: 13px; font-weight: 600; margin: 0; }
      .psy-hw-card, .psy-booked { margin-top: 12px; font-size: 13px; font-weight: 600; }
      .psy-booked { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 0; }
      .psy-booked .btn { margin-left: auto; }
      .psy-slot { display: flex; flex-direction: column; align-items: center; gap: 2px; font: inherit; color: inherit; background: #fff; }
      .psy-slot span { font-family: var(--font-display); font-size: 22px; }
      .psy-sess { text-align: left; }
      .psy-sess-head { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
      .psy-sess-head b { display: block; } .psy-sess-head small { font-size: 11px; font-weight: 800; color: var(--muted); }
      .psy-bubble { background: var(--lilac); border: var(--line); border-radius: 6px 20px 20px 20px; padding: 12px 14px; font-weight: 700; font-size: 14px; margin-bottom: 12px; animation: pop-in .45s var(--spring) both; }
      .psy-bubble i { font-weight: 600; }
      .psy-choices { display: grid; gap: 8px; }
      .psy-ch { white-space: normal; height: auto; min-height: 46px; padding: 8px 14px; font-size: 14px; }
      .psy-dots { display: flex; justify-content: center; gap: 6px; margin-top: 12px; }
      .psy-dots i { width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--ink); }
      .psy-dots i.on { background: var(--ink); }
      .psy-hw { font-size: 13px; font-weight: 600; margin-bottom: 10px; }
      .psy-care { font-size: 12px; font-weight: 700; background: #fff7fb; border: 2px dashed var(--ink); border-radius: 14px; padding: 8px 10px; margin-bottom: 12px; }
      .psy-res { border: var(--line); border-radius: 22px; padding: 16px; text-align: center; box-shadow: var(--shadow-sm); }
      .psy-res-e { font-size: 54px; }
      .psy-res p { font-weight: 700; font-size: 13px; margin: 6px 0; }
      .psy-cmp { font-size: 13px; font-weight: 600; margin-top: 12px; }
      .psy-breath { position: relative; width: 220px; height: 220px; margin: 14px auto 6px; display: grid; place-items: center; }
      .psy-orb { position: absolute; inset: 0; border-radius: 50%; border: var(--line); background: radial-gradient(circle at 35% 30%, #fff, var(--sky) 45%, var(--violet)); box-shadow: 0 0 0 10px rgba(139,92,255,.12); transform: scale(.45); }
      .psy-orb[data-p="1"] { animation: psy-hold 1.2s ease-in-out infinite; }
      @keyframes psy-hold { 50% { box-shadow: 0 0 0 18px rgba(139,92,255,.22); } }
      .psy-orb-t { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--ink); }
      .psy-orb-t b { font-size: 16px; background: #fff; border: 2px solid var(--ink); border-radius: 99px; padding: 2px 10px; }
      .psy-orb-t span { font-family: var(--font-display); font-size: 40px; text-shadow: 0 2px 0 #fff; }
      .psy-ta { width: 100%; box-sizing: border-box; border: var(--line); border-radius: 16px; padding: 12px; font: inherit; font-size: 15px; font-weight: 600; resize: vertical; background: #fff; }
    `;
    document.head.appendChild(st);
  }
})();
