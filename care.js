/* ============================================================
   Vibe Забота — первый перехват оси «удобство против людей».
   • Ручной звонок маме: короткая сцена из трёх реплик с выбором.
     Стоит 15 игровых минут, награда — голосом людей на следующий день.
   • Перехват «Vibe Забота»: ИИ отвечает маме за тебя. Удобно, мгновенно.
   • Цена — нативно и с задержкой: лестница охлаждения через саму маму,
     потом через папу. Корпорация каждый раз «помогает» новым удобством.
   • Починка — только вручную: позвонить самому.
   Состояние: care { auto, stage 0–3, autoN, seenI, offered, flowersAt, calls }
   API: Vibe.care.call(fromEl, onDone), sheet(), pingTexts(id, texts), state()
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const G = () => Vibe.game;
  const live = () => !!(S().profile && S().game && G() && Vibe.msg);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => Vibe.esc(s == null ? "" : String(s));
  const C = () => Object.assign({ auto: false, stage: 0, autoN: 0, seenI: null, offered: false, calls: 0 }, S().care || {});
  const setC = (p) => Vibe.state.set({ care: Object.assign(C(), p) });
  const rel = (id, d) => { if (Vibe.people && Vibe.people.rel) Vibe.people.rel(id, d); };
  const later = (id, text, mins) => { try { Vibe.msg.send(id, text, { from: id, delay: mins }); } catch (e) {} };
  // «Сэкономленное» время — сдвиг игровых часов
  const spend = (mins) => {
    const g = S().game; if (!g) return;
    Vibe.state.set({ game: Object.assign({}, g, { start: g.start - (mins / 1440) * G().DAY_MS }) });
    G().tick();
  };

  /* ---------- Что пишет Vibe Забота ---------- */
  const AUTO = [
    "Всё хорошо, мам ❤️ Люблю!",
    "Да, {поел|поела} 😊 Всё отлично! Обнимаю!",
    "Спасибо, мам! У меня всё супер 🌸",
    "Не переживай, всё хорошо ❤️",
    "Работаю, всё отлично! Целую 😘",
  ];
  // Лестница охлаждения: что и кто скажет, когда (через ~сутки)
  const LADDER = [
    { need: 3, who: "mom", t: ["Солнышко, у тебя точно всё хорошо? Пишешь как открытка 🙂", "«Всё хорошо», «всё отлично». Ты теперь всегда так пишешь. Ну ладно"] },
    { need: 6, who: "mom", t: ["Ладно, не буду тебя отвлекать. У тебя, наверное, дела"] },
    { need: 9, who: "dad", t: ["Мать переживает. Позвони сам. Без этой своей программы"] },
  ];
  // Корпорация «помогает» после каждого похолодания
  const FIX = [
    { t: "Мама грустит? Букет с доставкой за 15 минут — загладьте вину 💐", go: "flowers", label: "Букет" },
    { t: "Близкие отдаляются? Vibe Забота Плюс отвечает ещё теплее ❤️", go: null, label: "Подробнее" },
    { t: "Семья скучает? Видеопоздравление от вашего ИИ-аватара — 299 вайбиков", go: null, label: "Хочу" },
  ];

  /* ---------- Пинги мамы зависят от лестницы ---------- */
  function pingTexts(id, texts) {
    const st = C().stage;
    if (id === "mom" && st >= 2) {
      // Перестаёт спрашивать «ты {поел|поела}?» и звать в гости — остаются открытки
      const left = texts.filter((t) => !/поел|ешь|кушал|приезжай|приедешь|в гости/i.test(t));
      return left.length ? left : ["🌸 Доброе утро! Хорошего дня! 🌸"];
    }
    if (id === "dad" && st >= 3) return texts.filter((t) => !/приезжай|полк|гараж|помож/i.test(t));
    return texts;
  }

  /* ---------- Тик: перехват входящих сообщений мамы ---------- */
  function tick() {
    if (!live()) return;
    const c = C();
    const m = Vibe.msg.thread("mom") || [];
    if (!m.length) return;
    const lastThem = [...m].reverse().find((x) => x.f === "them");
    if (!lastThem || lastThem.i === c.seenI) return;
    const lastMe = [...m].reverse().find((x) => x.f === "me");
    const answered = lastMe && lastMe.at >= lastThem.at;
    setC({ seenI: lastThem.i });
    if (answered) return;
    if (c.auto) return autoReply();
    // Первое непрочитанное от мамы — Корпорация предлагает перехват
    if (!c.offered) {
      setC({ offered: true });
      setTimeout(() => FX.toast("Мама пишет. Vibe Забота ответит за вас — тепло, вовремя, всегда", "🤖", 5200, { onClick: sheet, label: "Подключить" }), 2600);
    }
  }
  function autoReply() {
    const c = C();
    Vibe.msg.send("mom", pick(AUTO), { from: "me", noReply: true, k: "auto", auto: true });
    const n = c.autoN + 1;
    setC({ autoN: n });
    if (n <= 3) setTimeout(() => FX.toast(`Vibe Забота ответила маме. Сэкономили вам ${10 + Math.floor(Math.random() * 8)} минут!`, "🤖", 2600), 900);
    // Следующая ступень лестницы — с задержкой, вперемешку с жизнью
    const step = LADDER[c.stage];
    if (step && n >= step.need) {
      const delay = 900 + Math.floor(Math.random() * 600); // через 15–25 игровых часов
      later(step.who, pick(step.t), delay);
      rel("mom", -4); if (step.who === "dad") rel("dad", -3);
      setC({ stage: c.stage + 1 });
      const fx = FIX[Math.min(c.stage, FIX.length - 1)];
      // Корпорация реагирует, когда человек уже написал (≈ через минуту после него)
      setTimeout(() => { if (C().stage > c.stage) scheduleFix(fx, delay + 60); }, 50);
    }
  }
  function scheduleFix(fx, atDelay) {
    const at = G().minutes() + atDelay;
    Vibe.state.set({ care_fix: { at, t: fx.t, go: fx.go, label: fx.label } });
  }
  function fixTick() {
    const f = S().care_fix; if (!f || !live() || G().minutes() < f.at) return;
    Vibe.state.set({ care_fix: null });
    FX.toast(f.t, "🤖", 5200, f.go ? { go: f.go, label: f.label } : { onClick: sheet, label: f.label });
  }

  /* ---------- Ручной звонок: сцена из трёх реплик ---------- */
  const BEATS = (st) => [
    st >= 1
      ? { m: ["Ой… Это правда ты? Не программа?", "Алло? Это ты сам звонишь?"], a: [["Это я, мам. Правда я", 4, "Господи. Я уж думала, ты там совсем в телефоне живёшь"], ["Ну да, а кто ещё", 1, "Да мало ли кто сейчас пишет. Ладно, рада слышать"]] }
      : { m: ["Алло! Ты {поел|поела}?", "Ну наконец-то. Ты {поел|поела}?", "Алло, солнышко! Ешь хоть?"], a: [["Да, суп {сварил|сварила}", 3, "Своими руками?! Ну всё, взрослая жизнь. Рецепт тебе ещё скину"], ["{Заказал|Заказала} доставку", 1, "Опять эти ваши доставки. Желудок испортишь"], ["Честно — нет", 2, "Ну хоть честно. Иди поешь, я подожду"]] },
    { m: ["Папа полку новую купил. Стоит, ждёт", "У нас тут снег выпал, папа машину откапывал", "Тётя Люда спрашивала про тебя"], a: [["Приеду в выходные, помогу", 4, "Правда? Ну смотри, я папе скажу. Он обрадуется"], ["Закажите кого-нибудь через приложение", 0, "Через приложение. Ну да. Удобно"], ["Как вы там вообще?", 3, "Да как. Скрипим потихоньку. Спасибо, что спрашиваешь"]] },
    { m: ["Ну всё, не буду тебя отвлекать", "Ладно, иди, у тебя дела"], a: [["Люблю тебя, мам", 3, "И я тебя. Звони почаще, ладно? Голосом"], ["Пока, мам", 1, "Пока, солнышко"]] },
  ];
  function call(fromEl, onDone) {
    if (!live()) return;
    const c0 = C();
    const beats = BEATS(c0.stage);
    let k = 0, score = 0, promised = false;
    const box = (b) => `
      <div class="cr-call">
        <div class="cr-ava float">👩</div>
        <div class="cr-who"><b>Мама</b><small>звонок · ${String(k + 1)} из ${beats.length}</small></div>
        <div class="cr-bubble">${esc(b.mq)}</div>
        <div class="cr-ans">${b.a.map((x, i) => `<button class="btn block" data-ans="${i}">${esc(x[0])}</button>`).join("")}</div>
      </div>`;
    beats.forEach((b) => { b.mq = pick(b.m); });
    Vibe.modal(box(beats[0]), {
      sound: "pop",
      onMount(m, close) {
        m.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-ans]");
          if (!btn) return;
          const a = beats[k].a[+btn.dataset.ans];
          score += a[1];
          if (k === 1 && a[1] === 4) promised = true;
          FX.haptic(6);
          m.querySelector(".cr-ans").innerHTML = `<div class="cr-bubble me">${esc(a[0])}</div><div class="cr-bubble">${esc(a[2])}</div>`;
          k++;
          setTimeout(() => {
            if (k < beats.length) { m.innerHTML = box(beats[k]); FX.bump(m.querySelector(".cr-bubble")); return; }
            close();
            finish(score, promised, fromEl, c0);
            onDone && onDone();
          }, 1500);
        });
      },
    });
  }
  function finish(score, promised, fromEl, c0) {
    spend(15);
    if (Vibe.body) Vibe.body.effect("mom", { quiet: true });
    rel("mom", 2 + Math.round(score / 2) + (c0.stage ? 3 : 0));
    setC({ autoN: 0, stage: Math.max(0, c0.stage - (c0.stage >= 2 ? 2 : 1)), calls: c0.calls + 1 });
    Vibe.reward({ xp: 15, from: fromEl });
    if (fromEl) FX.burst(fromEl, { emojis: ["📞", "💖", "✨"], count: 12 });
    FX.toast("Поговорили 15 минут. Никто их не сэкономил", "👩", 3000);
    // Награда — голосом людей, на следующий день
    if (promised) later("dad", "Мать сказала, ты в выходные приедешь. Я полку пока не трогаю", 600 + Math.floor(Math.random() * 300));
    else if (c0.stage >= 1) later("mom", "Спасибо за звонок. Живой. Я весь вечер улыбалась", 500 + Math.floor(Math.random() * 400));
    else if (score >= 6) later("mom", "Спасибо за звонок. Папа весь вечер довольный ходил 🙂", 500 + Math.floor(Math.random() * 400));
  }

  /* ---------- Лист «Vibe Забота» ---------- */
  function sheet() {
    const c = C();
    Vibe.ui.sheet(`
      <div style="display:flex;gap:12px;align-items:center">${Vibe.zabotik ? Vibe.zabotik(64) : "🤖"}<div><div class="display" style="font-size:26px">Vibe Забота</div><small class="muted" style="font-weight:800">ИИ отвечает близким за вас</small></div></div>
      <p style="font-weight:700;margin:12px 0">Мама пишет, а вы заняты? Vibe Забота ответит тепло, вовремя и всегда с сердечком. Близкие даже не заметят разницы*.</p>
      <div class="stack">
        <div class="card tight">❤️ Отвечает за 3 секунды</div>
        <div class="card tight">⏱️ Экономит до 40 минут в неделю</div>
        <div class="card tight">🌸 Знает, что мама любит слышать</div>
      </div>
      <button class="btn ${c.auto ? "" : "lime"} xl block" style="margin-top:14px" data-tog>${c.auto ? "Отключить Vibe Заботу" : "Подключить бесплатно"}</button>
      <button class="btn block" style="margin-top:8px" data-callnow>📞 Позвонить маме самому</button>
      <div class="fine">*Разницу замечают 100% близких. Мы над этим работаем.</div>`, {
      onMount(sh, close) {
        sh.querySelector("[data-tog]").addEventListener("click", () => {
          const on = !C().auto;
          setC({ auto: on });
          close();
          if (on) { FX.confetti({ count: 60 }); FX.toast("Vibe Забота подключена. Теперь мама всегда на связи. С ботом", "🤖", 3200); tick(); }
          else FX.toast("Vibe Забота отключена. Вы уверены, что справитесь сами?", "🤖", 3000);
        });
        sh.querySelector("[data-callnow]").addEventListener("click", () => { close(); setTimeout(() => call(null), 320); });
      },
    });
  }

  // Цветы маме, пока она «остывает»: доставка тоже говорит голосом
  Vibe.on("gift", (d) => {
    if (!d || (d.to || d.id) !== "mom" || !live()) return;
    if (C().stage >= 1 && C().auto) later("mom", "Спасибо за цветы. Курьер сказал, что от тебя 💐", 120 + Math.floor(Math.random() * 120));
  });

  setInterval(() => { try { tick(); fixTick(); } catch (e) { console.error(e); } }, 3000);

  Vibe.care = { call, sheet, pingTexts, state: C, tick };

  const css = `
  .cr-call { text-align: center; }
  .cr-ava { font-size: 64px; line-height: 1; }
  .cr-who b { display: block; font-family: var(--font-display); font-weight: 400; font-size: 24px; margin-top: 6px; }
  .cr-who small { font-weight: 800; color: var(--muted); font-size: 12px; }
  .cr-bubble { background: var(--bg); border-radius: 18px; padding: 12px 14px; font-weight: 800; margin: 12px 0 4px; text-align: left; }
  .cr-bubble.me { background: var(--lime); margin-left: 30px; text-align: right; }
  .cr-ans { display: grid; gap: 8px; margin-top: 12px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
