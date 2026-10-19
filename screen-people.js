/* ============================================================
   Близкие, гардероб, хобби и добрые дела.
   Экраны: people · style · hobby · charity
   Состояние: people (через Vibe.people: last, lastCall, lastGift,
   lastRemind, owes), pp_hobbies, pp_rep, pp_charity, pp_goodDay,
   pp_bday, pp_decayDay.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const set = (p) => Vibe.state.set(p);
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const rub = (n) => Vibe.rub(n);
  const esc = (s) => Vibe.esc(s == null ? "" : s);
  const today = () => (Vibe.game ? Vibe.game.info().day : 0);
  const nowMin = () => (Vibe.game ? Vibe.game.minutes() : 0);
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => [...r.querySelectorAll(s)];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const hashN = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const zab = (text, mood = "sly") => `<div class="pp-zab">${Vibe.zabotik(54, mood)}<div class="pp-bubble">${text}</div></div>`;

  // Небольшой плюс к настроению напрямую (как в world.js)
  function moodUp(n, msg) {
    if (!Vibe.body) return;
    Vibe.body.tick();
    const b = Vibe.body.get();
    set({ body: Object.assign({}, b, { mood: clamp(b.mood + n) }) });
    if (msg) setTimeout(() => FX.toast(msg, "⌚", 2200), 700);
  }

  // «с Лёхой», «с мамой», «с Катей»
  function instr(name) {
    const n = String(name || "");
    const low = /^(Мама|Папа|Бабушка|Дедушка)$/.test(n) ? n.toLowerCase() : n;
    if (/[жшчщц]а$/.test(low)) return low.slice(0, -1) + "ей";
    if (/а$/.test(low)) return low.slice(0, -1) + "ой";
    if (/я$/.test(low)) return low.slice(0, -1) + "ей";
    if (/й$/.test(low)) return low.slice(0, -1) + "ем";
    if (/[бвгдзклмнпрстфхжшчщ]$/.test(low)) return low + "ом";
    return low;
  }

  /* ---------- CSS ---------- */
  const css = `
  .pp-zab { display:flex; align-items:flex-end; gap:10px; margin-top:16px; }
  .pp-bubble { flex:1; background:var(--paper); border:2px solid var(--ink); border-radius:18px 18px 18px 6px; padding:10px 12px; font-size:13px; font-weight:700; line-height:1.35; }
  .pp-person { padding:14px; }
  .pp-top { display:flex; gap:12px; align-items:center; }
  .pp-ava { width:58px; height:58px; border-radius:20px; border:2.5px solid var(--ink); display:grid; place-items:center; font-size:32px; flex:0 0 auto; box-shadow:var(--shadow-sm); }
  .pp-name { font-family:var(--font-display); font-size:19px; line-height:1.05; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .pp-status { font-size:12px; font-weight:700; color:var(--muted); margin-top:3px; line-height:1.3; }
  .pp-relrow { display:flex; align-items:center; gap:8px; margin-top:10px; }
  .pp-relrow .progress { flex:1; height:12px; }
  .pp-relrow b { font-size:12px; font-weight:900; min-width:96px; text-align:right; }
  .pp-acts { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:12px; }
  .pp-acts .btn { height:42px; padding:0 6px; font-size:12px; gap:4px; }
  .pp-acts .btn.wide { grid-column:1 / -1; }
  .pp-meet { margin-top:10px; padding:8px 10px; border:2px dashed var(--ink); border-radius:14px; font-size:12px; font-weight:800; background:var(--lilac); }
  .pp-ex { opacity:.55; filter:grayscale(.6); }
  .pp-sum { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:14px; }
  .pp-sum .card { padding:10px 8px; text-align:center; }
  .pp-sum b { font-family:var(--font-display); font-size:22px; display:block; font-weight:400; }
  .pp-sum small { font-size:11px; font-weight:800; color:var(--muted); }
  .pp-opt { display:flex; align-items:center; gap:12px; padding:12px; border:2.5px solid var(--ink); border-radius:18px; background:var(--paper); width:100%; text-align:left; transition:transform .18s var(--spring); }
  .pp-opt.on { background:var(--lime); transform:scale(1.02); box-shadow:var(--shadow-sm); }
  .pp-opt .e { font-size:28px; }
  .pp-opt .t { flex:1; font-weight:800; font-size:14px; line-height:1.2; }
  .pp-opt .t small { display:block; font-size:11px; color:var(--muted); font-weight:700; }
  .pp-opt .p { font-weight:900; font-size:13px; white-space:nowrap; }
  .pp-lbl { font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin:14px 2px 8px; }
  .pp-chips { display:flex; gap:8px; flex-wrap:wrap; }
  .pp-chips .chip[disabled] { opacity:.35; pointer-events:none; }

  /* Гардероб */
  .pp-mq { display:flex; gap:14px; align-items:center; }
  .pp-manq { width:118px; flex:0 0 auto; border:2.5px solid var(--ink); border-radius:24px; background:var(--paper); box-shadow:var(--shadow-sm); padding:8px 0 10px; display:flex; flex-direction:column; align-items:center; position:relative; }
  .pp-manq .l { font-size:34px; line-height:1.08; display:block; transition:transform .3s var(--spring); }
  .pp-manq .hat { font-size:28px; margin-bottom:-8px; position:relative; z-index:2; }
  .pp-manq .face { font-size:40px; }
  .pp-manq .acc { position:absolute; right:6px; top:58px; font-size:24px; }
  .pp-manq .l.empty { opacity:.25; filter:grayscale(1); }
  .pp-look { flex:1; min-width:0; }
  .pp-look .big-num { font-size:52px; }
  .pp-look .progress { margin-top:8px; }
  .pp-items { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .pp-item { padding:10px; display:flex; flex-direction:column; gap:6px; }
  .pp-item .pic { height:84px; border-radius:16px; border:2px solid var(--ink); display:grid; place-items:center; font-size:46px; position:relative; }
  .pp-item .nm { font-size:12px; font-weight:800; line-height:1.2; min-height:29px; }
  .pp-item .row { display:flex; align-items:center; justify-content:space-between; gap:4px; }
  .pp-item .btn { height:36px; padding:0 12px; font-size:12px; }
  .pp-item .tag { position:absolute; top:6px; left:6px; font-size:10px; padding:2px 6px; }
  .pp-old { position:absolute; bottom:4px; right:4px; font-size:9px; padding:2px 6px; background:var(--coral) !important; transform:rotate(-6deg); }

  /* Хобби */
  .pp-hob { padding:14px; }
  .pp-hob .pp-top .lv { margin-left:auto; text-align:right; }
  .pp-hob .lv b { font-family:var(--font-display); font-size:26px; font-weight:400; display:block; line-height:1; }
  .pp-hob .lv small { font-size:10px; font-weight:900; color:var(--muted); }
  .pp-hob .acts2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; }
  .pp-hob .acts2 .btn { height:44px; font-size:13px; padding:0 8px; white-space:normal; line-height:1.1; }
  .pp-game { position:relative; height:240px; border:2.5px solid var(--ink); border-radius:22px; background:var(--lilac); overflow:hidden; margin:10px 0 12px; touch-action:manipulation; }
  .pp-tgt { position:absolute; width:56px; height:56px; margin:-28px 0 0 -28px; font-size:38px; display:grid; place-items:center; animation:pp-pop .35s var(--spring) both; }
  .pp-tgt.hit { animation:pp-hit .3s ease forwards; pointer-events:none; }
  @keyframes pp-pop { from { transform:scale(0) rotate(-30deg); } }
  @keyframes pp-hit { to { transform:scale(1.8); opacity:0; } }
  .pp-hud { display:flex; justify-content:space-between; align-items:center; font-weight:900; }
  .pp-bar { position:relative; height:54px; border:2.5px solid var(--ink); border-radius:999px; background:var(--paper); overflow:hidden; margin:18px 0; }
  .pp-zone { position:absolute; top:0; bottom:0; background:var(--lime); border-inline:2.5px solid var(--ink); }
  .pp-mark { position:absolute; top:4px; bottom:4px; width:8px; margin-left:-4px; border-radius:4px; background:var(--ink); }
  .pp-big { font-size:64px; display:inline-block; }

  /* Добрые дела */
  .pp-cause { padding:14px; }
  .pp-cause .amts { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:12px; }
  .pp-cause .amts .btn { height:40px; font-size:13px; padding:0 4px; }
  .pp-rep { display:flex; align-items:center; gap:14px; }
  .pp-rep .big-num { font-size:56px; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ================= Близкие: логика ================= */
  const GRACE = { family: 4, friend: 3, partner: 2 };
  const DECAY = { family: 1, friend: 2, partner: 3 };
  const relWord = (r) => (r < 20 ? "Холодно 🥶" : r < 40 ? "Прохладно" : r < 60 ? "Норм" : r < 80 ? "Близко 💛" : "Не разлей вода 💞");
  const relCol = (r) => (r < 30 ? "var(--coral)" : r < 60 ? "var(--yellow)" : "var(--lime)");
  const listP = () => Object.entries(Vibe.people.all()).map(([id, p]) => Object.assign({ id }, p));
  const isPartner = (p) => p.kind === "partner";

  // Ежедневное охлаждение отношений без контакта
  function decay() {
    if (!S().game) return;
    const d = today();
    const lastRun = S().pp_decayDay;
    if (lastRun === d) return;
    set({ pp_decayDay: d });
    if (lastRun == null) {
      listP().forEach((p) => { if (p.last == null) Vibe.people.set(p.id, { last: d }); });
      return;
    }
    const dd = Math.max(1, d - lastRun);
    listP().forEach((p) => {
      if (p.kind === "ex") return;
      if (p.last == null) { Vibe.people.set(p.id, { last: d }); return; }
      const kind = GRACE[p.kind] ? p.kind : "friend";
      const idle = d - p.last - GRACE[kind];
      if (idle <= 0) return;
      Vibe.people.rel(p.id, -DECAY[kind] * Math.min(dd, idle));
      const np = Vibe.people.get(p.id);
      if (isPartner(p) && np.rel < 8) {
        Vibe.people.set(p.id, { kind: "ex", rel: 10 });
        setTimeout(() => FX.toast(`${esc(p.n)} собрал(а) вещи. Сообщение «нам надо поговорить» ты не прочитал`, "💔", 4000), 1500);
      }
    });
  }
  function touch(id) { Vibe.people.set(id, { last: today() }); }

  // ДР мамы — 14-го числа 2-го игрового месяца, ДР папы — 9-го числа 3-го. Ставятся в календарь сами.
  const BDAYS = { mom: { day: 30 + 13, e: "🎂", t: "ДР мамы", place: "restaurant:3" }, dad: { day: 60 + 8, e: "🎂", t: "ДР папы", place: "restaurant:6" } };
  function scheduleBdays() {
    if (!S().game || !Vibe.sched) return;
    const d = today();
    const cur = Object.assign({}, S().pp_bday || {});
    let changed = false;
    Object.entries(BDAYS).forEach(([pid, b]) => {
      if (cur[pid] != null && cur[pid] >= d) return;
      let day = b.day;
      while (day < d) day += 360;
      if (cur[pid] === day) return;
      cur[pid] = day; changed = true;
      Vibe.sched.add({ id: `pp_bday_${pid}_${day}`, day, hour: 18, min: 0, dur: 180, title: b.t, e: b.e, place: b.place, kind: "family", pid, go: "people" });
    });
    if (changed) set({ pp_bday: cur });
  }

  // Ленивый ежедневный «тик» через подписку на состояние
  let lastCheck = 0, busy = false;
  Vibe.state.on(() => {
    if (busy || Date.now() - lastCheck < 5000) return;
    lastCheck = Date.now();
    if (!S().profile || !S().game || !Vibe.game) return;
    busy = true;
    setTimeout(() => { try { decay(); scheduleBdays(); } finally { busy = false; } }, 0);
  });

  /* ---------- Реакции на события расписания ---------- */
  if (Vibe.sched) {
    Vibe.sched.on("friend", (e) => {
      const p = e.pid && Vibe.people.get(e.pid);
      if (!p) return;
      Vibe.people.rel(e.pid, isPartner(p) ? 15 : 12);
      touch(e.pid);
      if (isPartner(p) && Vibe.body) Vibe.body.effect("date", { quiet: true });
      setTimeout(() => FX.toast(`${esc(p.n)}: отношения +${isPartner(p) ? 15 : 12} ${p.e}`, "💞", 2600), 1200);
    });
    Vibe.sched.on("friend:missed", (e) => {
      const p = e.pid && Vibe.people.get(e.pid);
      if (!p) return;
      Vibe.people.rel(e.pid, -15);
      FX.toast(`${esc(p.n)} ждал(а) тебя час. Отношения −15`, "🥀", 3200);
    });
    Vibe.sched.on("family", (e) => {
      const p = e.pid && Vibe.people.get(e.pid);
      if (!p) return;
      Vibe.people.rel(e.pid, 18);
      touch(e.pid);
      if (Vibe.body) Vibe.body.effect("mom");
      setTimeout(() => FX.toast(`${esc(p.n)} счастлив(а)! Отношения +18`, "🎂", 3000), 1200);
    });
    Vibe.sched.on("family:missed", (e) => {
      const p = e.pid && Vibe.people.get(e.pid);
      if (!p) return;
      Vibe.people.rel(e.pid, -25);
      FX.toast(e.pid === "mom" ? "Мама не обиделась. Она просто «всё поняла». Отношения −25" : `${esc(p.n)} сказал «ну ты даёшь». Отношения −25`, "😶", 3600);
    });
  }

  /* ---------- Статусы ---------- */
  const LINES = {
    mom: { good: ["Прислала 14 открыток с котиками", "Спрашивает, тепло ли ты одет", "Гордится тобой перед соседкой"], idle: ["«Ты живой?» — 3 пропущенных", "Узнаёт новости о тебе из сторис", "Пишет: «Ну позвони, когда будет минутка»"] },
    dad: { good: ["Прислал видео про рыбалку", "Сказал «молодец». Дважды за год!", "Советует купить гараж"], idle: ["Лайкнул твоё фото 2019 года", "Пишет «ОК» в ответ на всё", "Спросил маму, как у тебя дела"] },
    friend: { good: ["Зовёт на шаверму", "Скинул 12 мемов за утро", "Говорит, ты лучший"], idle: ["Выложил(а) сторис без тебя", "Мемы скидывает уже не тебе", "Последнее сообщение: «ну давай как-нибудь»"] },
    partner: { good: ["Отправил(а) 14 сердечек", "Выбирает вам совместный плед", "Смотрит сериал и ждёт тебя"], idle: ["Пишет «ок.» с точкой", "Стал(а) задумчиво молчать", "Перечитывает вашу переписку"] },
  };
  function statusLine(p) {
    const idle = today() - (p.last == null ? today() : p.last);
    if (p.kind === "ex") return "Лайкает твои сторис в 3 часа ночи";
    const pool = LINES[p.id] || LINES[p.kind] || LINES.friend;
    const arr = p.rel >= 50 && idle < 3 ? pool.good : pool.idle;
    const line = arr[(hashN(p.id) + today()) % arr.length];
    return idle >= 2 ? `${line} · не общались ${idle} дн.` : line;
  }
  function meetingOf(pid) {
    return Vibe.sched ? Vibe.sched.upcoming(20).find((e) => (e.kind === "friend" || e.kind === "family") && e.pid === pid) : null;
  }
  function whenText(e) {
    const d = e.day - today();
    return `${d === 0 ? "сегодня" : d === 1 ? "завтра" : `через ${d} дн.`} в ${String(e.hour).padStart(2, "0")}:${String(e.min || 0).padStart(2, "0")}`;
  }

  function personCard(p) {
    const d = today();
    const ex = p.kind === "ex";
    const m = meetingOf(p.id);
    const called = p.lastCall === d;
    const col = { family: "c-yellow", friend: "c-sky", partner: "c-pink", ex: "c-white" }[p.kind] || "c-mint";
    const talk = isPartner(p) && p.rel < 30;
    return `
    <div class="card pp-person ${ex ? "pp-ex" : ""}" data-pid="${esc(p.id)}">
      <div class="pp-top">
        <div class="pp-ava ${col}"><span class="emo ${p.rel >= 80 ? "wobble" : ""}">${p.e || "🙂"}</span></div>
        <div style="flex:1;min-width:0">
          <div class="pp-name">${esc(p.n)}${isPartner(p) ? ` <span class="badge" style="background:var(--pink)">💘 пара</span>` : ""}${p.owes ? ` <span class="badge" style="background:var(--orange)">должен ${rub(p.owes)}</span>` : ""}</div>
          <div class="pp-status">${esc(statusLine(p))}</div>
        </div>
      </div>
      <div class="pp-relrow"><div class="progress"><i style="--p:${Math.round(p.rel)}%;background:${relCol(p.rel)}"></i></div><b>${Math.round(p.rel)} · ${relWord(p.rel)}</b></div>
      ${m ? `<div class="pp-meet">📅 ${esc(m.title)} — ${whenText(m)}${m.place ? ` · ${esc((Vibe.map.place(m.place) || {}).label || "")}` : ""}</div>` : ""}
      ${ex ? "" : `<div class="pp-acts">
        <button class="btn ${called ? "" : "lime"}" data-act="call" ${called ? "disabled" : ""}>📞 ${called ? "Звонил" : "Позвонить"}</button>
        <button class="btn yellow" data-act="meet" ${m ? "disabled" : ""}>☕ Встретиться</button>
        <button class="btn pink" data-act="gift">🎁 Подарить</button>
        ${p.owes ? `<button class="btn wide" data-act="debt" ${p.lastRemind === d ? "disabled" : ""}>💸 ${p.lastRemind === d ? "Уже напоминал сегодня" : `Напомнить про долг · ${rub(p.owes)}`}</button>` : ""}
        ${talk ? `<button class="btn black wide pulse" data-act="talk">💬 «Нам надо поговорить»</button>` : ""}
      </div>`}
    </div>`;
  }

  function groups() {
    const all = listP();
    const g = [
      { t: "Семья", k: (p) => p.kind === "family" },
      { t: "Вторая половинка", k: isPartner },
      { t: "Друзья", k: (p) => p.kind === "friend" },
      { t: "Свидания и знакомые", k: (p) => !["family", "friend", "partner", "ex"].includes(p.kind) },
      { t: "Бывшие", k: (p) => p.kind === "ex" },
    ];
    return g.map((x) => Object.assign(x, { list: all.filter(x.k) })).filter((x) => x.list.length);
  }

  function peopleBody() {
    const all = listP().filter((p) => p.kind !== "ex");
    const avg = all.length ? Math.round(all.reduce((s, p) => s + p.rel, 0) / all.length) : 0;
    const due = all.filter((p) => p.lastCall !== today()).length;
    const partner = Vibe.people.partner();
    const fam = Vibe.sched ? Vibe.sched.upcoming(30).filter((e) => e.kind === "family") : [];
    return `
      <div class="pp-sum">
        <div class="card c-lime"><b>${avg}</b><small>средняя близость</small></div>
        <div class="card c-yellow"><b>${due}</b><small>ждут звонка</small></div>
        <div class="card c-pink"><b>${all.length}</b><small>человек</small></div>
      </div>
      ${partner && partner.rel >= 70 ? `<div class="card c-pink tight" style="margin-top:12px;display:flex;gap:10px;align-items:center"><span class="emo float" style="font-size:34px">💞</span><div style="font-weight:800;font-size:13px">${esc(partner.n)} рядом — настроение растёт на встречах. Отношения ${Math.round(partner.rel)}/100</div></div>` : ""}
      ${fam.map((e) => `<div class="card c-orange tight" style="margin-top:12px;display:flex;gap:10px;align-items:center"><span class="emo wobble" style="font-size:34px">${e.e}</span><div style="font-weight:800;font-size:13px">${esc(e.title)} — ${whenText(e)}. Приди в ресторан, иначе запомнят навсегда</div></div>`).join("")}
      ${groups().map((g) => `<h2 class="sec">${g.t} <small>${g.list.length}</small></h2><div class="stack stagger">${g.list.map(personCard).join("")}</div>`).join("")}
      ${zab(Vibe.people.get("mom") && today() - (Vibe.people.get("mom").last ?? today()) >= 3 ? "Ты не звонил маме несколько дней. Я не давлю. Я просто напоминаю каждые 5 минут." : "Отношения остывают, если не общаться пару дней. Как кофе. И как мы с тобой, если ты не заходишь в Vibe.")}
      <div class="fine">Vibe Близкие не читает ваши переписки*. *Только анализирует.</div>`;
  }

  /* ---------- Действия ---------- */
  const CALL_LINES = {
    mom: ["Мама рассказала про давление соседки и спросила, ешь ли ты", "Мама: «Голос у тебя уставший». Ты: «Нормальный». Мама: «Уставший»"],
    dad: ["Папа сказал «ну давай» через 40 секунд. Это рекорд!", "Папа объяснил, как правильно менять колесо. У тебя нет машины"],
    lyoha: ["Лёха рассказал бизнес-идею: шаверма по подписке", "Лёха час рассказывал про крипту. Ты поддакивал"],
    katya: ["Катя прислала голосовое на 7 минут в ответ", "Катя рассказала все сплетни офиса. Даже твоего"],
  };
  function doCall(p, btn) {
    const d = today();
    if (p.lastCall === d) { FX.shake(btn); FX.toast("Сегодня уже звонил. Не надо быть навязчивым", "📵"); return; }
    Vibe.people.set(p.id, { lastCall: d, last: d });
    Vibe.people.rel(p.id, 5);
    FX.burst(btn, { emojis: ["📞", "💬", p.e || "💛"], count: 10 });
    FX.sound.like();
    if (p.id === "mom") { if (Vibe.body) Vibe.body.effect("mom"); }
    else moodUp(isPartner(p) ? 4 : 3, `📞 Поговорил. Настроение +${isPartner(p) ? 4 : 3}`);
    const line = pick(CALL_LINES[p.id] || [`${p.n} рад(а) тебя слышать`, `${p.n}: «О, привет! Сто лет!»`]);
    FX.toast(`${esc(line)} · близость +5`, p.e || "📞", 3200);
    Vibe.reward({ vibiki: 5, xp: 8, from: btn });
  }

  function doMeet(p, rerender) {
    const info = Vibe.game.info();
    const rN = 1 + Math.floor(Math.random() * 8);
    const PL = [
      { k: "park", e: "🌳", t: "Парк «Без вайфая»", sub: "Гулять и говорить о жизни", price: 0 },
      { k: "club", e: "🎤", t: "Клуб «Осталось 2 билета»", sub: "Громко, весело, ничего не слышно", price: 1800 },
      { k: `restaurant:${rN}`, e: "🍽️", t: "Ресторан на двоих", sub: "Счёт пополам. Или нет", price: 2600 },
    ];
    const HOURS = [12, 15, 18, 20, 22];
    let pl = 0, day = 0, hour = null;
    const okHour = (dd, h) => dd > 0 || h > info.hour + (info.minute > 30 ? 1 : 0);
    const draw = (sh) => {
      $$(sh, "[data-pl]").forEach((b) => b.classList.toggle("on", +b.dataset.pl === pl));
      $$(sh, "[data-day]").forEach((b) => b.classList.toggle("on", +b.dataset.day === day));
      if (hour != null && !okHour(day, hour)) hour = null;
      $$(sh, "[data-h]").forEach((b) => { const h = +b.dataset.h; b.disabled = !okHour(day, h); b.classList.toggle("on", h === hour); });
      const go = $(sh, "[data-ok]");
      go.disabled = hour == null;
      go.innerHTML = hour == null ? "Выбери время" : `Позвать ${PL[pl].price ? `· ${rub(PL[pl].price)}` : "· бесплатно"} <span class="arrow">→</span>`;
    };
    Vibe.ui.sheet(`
      <div class="display" style="font-size:26px">Встреча с ${esc(instr(p.n))} ${p.e || ""}</div>
      <div class="pp-lbl">Где</div>
      <div class="stack">${PL.map((x, i) => `<button class="pp-opt" data-pl="${i}"><span class="e">${x.e}</span><span class="t">${x.t}<small>${x.sub}</small></span><span class="p">${x.price ? rub(x.price) : "0 ₽"}</span></button>`).join("")}</div>
      <div class="pp-lbl">Когда</div>
      <div class="pp-chips"><button class="chip" data-day="0">Сегодня</button><button class="chip" data-day="1">Завтра</button></div>
      <div class="pp-chips" style="margin-top:8px">${HOURS.map((h) => `<button class="chip" data-h="${h}">${h}:00</button>`).join("")}</div>
      <button class="btn black xl block" data-ok style="margin-top:16px">Выбери время</button>
      <div class="fine">Встреча появится в календаре и на карте. Не придёшь — близость −15, а ${esc(p.n)} будет делать вид, что «всё нормально».</div>
    `, {
      onMount(sh, close) {
        draw(sh);
        sh.addEventListener("click", (e) => {
          const a = e.target.closest("[data-pl]"); if (a) { pl = +a.dataset.pl; FX.bump(a); draw(sh); return; }
          const d = e.target.closest("[data-day]"); if (d) { day = +d.dataset.day; FX.bump(d); draw(sh); return; }
          const h = e.target.closest("[data-h]"); if (h) { hour = +h.dataset.h; FX.bump(h); draw(sh); return; }
          const ok = e.target.closest("[data-ok]");
          if (!ok || hour == null) return;
          const x = PL[pl];
          if (x.price && !Vibe.pay(x.price, { title: `Встреча · ${x.t}`, emoji: x.e, col: "c-lilac", from: ok })) return;
          Vibe.sched.add({ day: info.day + day, hour, min: 0, dur: 150, title: `Встреча с ${instr(p.n)}`, e: p.e || "☕", place: x.k, kind: "friend", go: "maps", price: x.price, pid: p.id });
          close();
          FX.confetti({ count: 60 });
          FX.sound.success();
          FX.toast(`${esc(p.n)}: «Договорились!» Приходи в ${x.t}`, "📅", 3000);
          rerender();
        });
      },
    });
  }

  const QUICK_GIFTS = [
    { id: "flowers", e: "💐", t: "Букет «Извини, что пропал»", price: 1500, rel: 8 },
    { id: "cake", e: "🎂", t: "Торт «Ешь, а то худой»", price: 1200, rel: 6 },
    { id: "cert", e: "🎟️", t: "Сертификат на всё (кроме нужного)", price: 3000, rel: 12 },
    { id: "socks", e: "🧦", t: "Носки. Классика", price: 390, rel: 3 },
  ];
  function doGift(p, rerender) {
    const d = today();
    if (p.lastGift === d) { FX.toast("Сегодня уже дарил. Два подарка в день — это подозрительно", "🤨"); return; }
    const items = [...Vibe.inv.list("gadget"), ...Vibe.inv.list("home")];
    Vibe.ui.sheet(`
      <div class="display" style="font-size:26px">Подарок для ${esc(p.n)} ${p.e || ""}</div>
      ${items.length ? `<div class="pp-lbl">Из твоих вещей · передарить</div><div class="stack">${items.map((it) => `<button class="pp-opt" data-inv="${esc(it.id)}"><span class="e">${it.e || "🎁"}</span><span class="t">${esc(it.name)}<small>Бонус у тебя пропадёт</small></span><span class="p">+${giftRel(it)} 💛</span></button>`).join("")}</div>` : `<div class="card flat tight" style="margin-top:12px;font-size:13px;font-weight:700">Дома нечего передарить. Даже кружки «Лучшему сотруднику».</div>`}
      <div class="pp-lbl">Купить быстро</div>
      <div class="stack">${QUICK_GIFTS.map((g) => `<button class="pp-opt" data-q="${g.id}"><span class="e">${g.e}</span><span class="t">${g.t}<small>+${g.rel} к близости</small></span><span class="p">${rub(g.price)}</span></button>`).join("")}</div>
      <div class="fine">Упаковка бесплатно*. *Пакет-майка.</div>
    `, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          const iv = e.target.closest("[data-inv]");
          const q = e.target.closest("[data-q]");
          if (!iv && !q) return;
          let gain, emo;
          if (iv) {
            const it = Vibe.inv.list().find((x) => x.id === iv.dataset.inv);
            if (!it) return;
            Vibe.inv.remove(it.id);
            gain = giftRel(it); emo = it.e || "🎁";
          } else {
            const g = QUICK_GIFTS.find((x) => x.id === q.dataset.q);
            if (!Vibe.pay(g.price, { title: `Market · подарок: ${g.t}`, emoji: g.e, col: "c-pink", from: q })) return;
            gain = g.rel; emo = g.e;
          }
          if (isPartner(p)) gain += 3;
          Vibe.people.rel(p.id, gain);
          Vibe.people.set(p.id, { lastGift: d, last: d });
          close();
          FX.burst(iv || q, { emojis: [emo, "💛", "✨", p.e || "🎁"], count: 16 });
          FX.sound.like();
          FX.toast(`${esc(p.n)} в восторге! Близость +${gain}`, emo, 2800);
          moodUp(2);
          rerender();
        });
      },
    });
  }
  function giftRel(it) { const b = it.bonus || {}; return Math.min(20, 6 + Object.values(b).reduce((s, v) => s + (+v || 0), 0)); }

  function doDebt(p, btn) {
    const d = today();
    Vibe.people.set(p.id, { lastRemind: d });
    const chance = 0.25 + p.rel / 200;
    if (Math.random() < chance) {
      const part = Math.random() < 0.6 ? p.owes : Math.max(500, Math.round(p.owes / 2 / 100) * 100);
      const left = Math.max(0, p.owes - part);
      Vibe.people.set(p.id, { owes: left });
      Vibe.game.tx(`Возврат долга · ${p.n}`, part, p.e || "💸", "c-lime");
      Vibe.refreshCounters();
      FX.confetti({ count: 50, from: btn });
      FX.sound.success();
      FX.toast(left ? `${esc(p.n)} вернул(а) ${rub(part)}. Остальное «на следующей неделе»` : `${esc(p.n)} вернул(а) всё! ${rub(part)}. Чудеса`, "💸", 3400);
    } else {
      Vibe.people.rel(p.id, -4);
      FX.shake(btn);
      FX.toast(pick([`${esc(p.n)}: «Бро, в пятницу точно». Какую пятницу — не уточнил`, `${esc(p.n)} прочитал(а) и не ответил(а). Близость −4`, `${esc(p.n)}: «Я помню! Просто сейчас не время»`]), "🫠", 3400);
    }
  }

  function doTalk(p, rerender) {
    Vibe.modal(`
      <div class="m-emo wobble">💬</div>
      <div class="display" style="font-size:24px">«Нам надо поговорить»</div>
      <p>${esc(p.n)} пишет это уже второй раз. Близость ${Math.round(p.rel)}/100. Что делаешь?</p>
      <div style="display:grid;gap:10px">
        <button class="btn black block" data-t="honest" style="white-space:normal;height:auto;min-height:52px">Поговорить честно (50/50)</button>
        <button class="btn pink block" data-t="flowers" style="white-space:normal;height:auto;min-height:52px">Цветы и ужин · ${rub(4500)}</button>
        <button class="btn block" data-t="ignore">Сделать вид, что не видел</button>
      </div>
      <div class="fine">Vibe Близкие не несёт ответственности за ваши отношения. Но несёт рекламу.</div>`, {
      sound: "pop",
      onMount(m, close) {
        m.addEventListener("click", (e) => {
          const b = e.target.closest("[data-t]"); if (!b) return;
          const t = b.dataset.t;
          if (t === "flowers") {
            if (!Vibe.pay(4500, { title: "Цветы и ужин · «прости»", emoji: "💐", col: "c-pink", from: b })) return;
            Vibe.people.rel(p.id, 22); Vibe.people.set(p.id, { last: today() });
            close(); FX.confetti({ count: 60 }); FX.toast(`${esc(p.n)} оттаял(а). Близость +22`, "💐", 3000);
          } else if (t === "honest" && Math.random() < 0.5) {
            Vibe.people.rel(p.id, 25); Vibe.people.set(p.id, { last: today() });
            close(); FX.confetti({ count: 80 }); FX.toast("Честный разговор спас отношения. Близость +25", "💞", 3200); moodUp(6);
          } else {
            Vibe.people.set(p.id, { kind: "ex", rel: 10 });
            close(); FX.sound.error(); FX.toast(`${esc(p.n)} теперь в «Бывших». Заботик уже подобрал 37 анкет в Match`, "💔", 4000); moodUp(-12);
          }
          rerender();
        });
      },
    });
  }

  Vibe.screen("people", {
    render() {
      decay(); scheduleBdays();
      return `
      ${Vibe.ui.head("Vibe Близкие", "Люди, которые тебя терпят", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Позвони маме", text: "Близость тает, если не общаться. Как мороженое и обещания «созвонимся»", emo: "💞", color: "c-pink", sticker: "📞 бесплатно" })}
        <div data-body>${peopleBody()}</div>
      </div>`;
    },
    mount(root) {
      const body = $(root, "[data-body]");
      const rerender = () => {
        body.innerHTML = peopleBody();
        body.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
      };
      const onClick = (e) => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        const card = b.closest("[data-pid]");
        const p = Object.assign({ id: card.dataset.pid }, Vibe.people.get(card.dataset.pid));
        const a = b.dataset.act;
        if (a === "call") { doCall(p, b); setTimeout(rerender, 300); }
        else if (a === "meet") doMeet(p, rerender);
        else if (a === "gift") doGift(p, rerender);
        else if (a === "debt") { doDebt(p, b); setTimeout(rerender, 400); }
        else if (a === "talk") doTalk(p, rerender);
      };
      root.addEventListener("click", onClick);
      return () => root.removeEventListener("click", onClick);
    },
  });

  /* ================= Vibe Style ================= */
  const LOOKS = [
    { id: "casual", t: "Кэжуал", e: "👕", col: "c-sky" },
    { id: "office", t: "Офис", e: "👔", col: "c-lilac" },
    { id: "interview", t: "На собеседование", e: "🤝", col: "c-mint" },
    { id: "street", t: "Стритвир", e: "🛹", col: "c-orange" },
    { id: "blogger", t: "Как у блогера", e: "🤳", col: "c-pink" },
  ];
  const WEAR = [
    { id: "cas_tee", look: "casual", slot: "top", e: "👕", n: "Футболка «Базовая, но с принтом»", p: 1490, b: 3 },
    { id: "cas_jeans", look: "casual", slot: "bottom", e: "👖", n: "Джинсы «Как у всех»", p: 2990, b: 4 },
    { id: "cas_sneak", look: "casual", slot: "shoes", e: "👟", n: "Кеды «Белые до первой лужи»", p: 3490, b: 4 },
    { id: "cas_cap", look: "casual", slot: "hat", e: "🧢", n: "Кепка «Не мыл голову»", p: 990, b: 2 },
    { id: "off_shirt", look: "office", slot: "top", e: "👔", n: "Рубашка «Дедлайн вчера»", p: 3990, b: 5 },
    { id: "off_pants", look: "office", slot: "bottom", e: "👖", n: "Брюки со стрелками и тревогой", p: 3490, b: 4 },
    { id: "off_shoes", look: "office", slot: "shoes", e: "👞", n: "Туфли «Пятница, 18:59»", p: 5990, b: 6 },
    { id: "off_watch", look: "office", slot: "acc", e: "⌚", n: "Часы «Почти смарт»", p: 4990, b: 4 },
    { id: "int_jacket", look: "interview", slot: "top", e: "🧥", n: "Пиджак «Я командный игрок»", p: 8990, b: 9 },
    { id: "int_boots", look: "interview", slot: "shoes", e: "👞", n: "Ботинки «Стрессоустойчивость»", p: 6990, b: 6 },
    { id: "int_case", look: "interview", slot: "acc", e: "💼", n: "Портфель «Резюме внутри»", p: 4490, b: 5 },
    { id: "int_glass", look: "interview", slot: "hat", e: "🤓", n: "Очки «Умный вид» (без диоптрий)", p: 2990, b: 4 },
    { id: "st_puffer", look: "street", slot: "top", e: "🧥", n: "Пуховик oversize, внутри можно жить", p: 11990, b: 7 },
    { id: "st_shorts", look: "street", slot: "bottom", e: "🩳", n: "Шорты в ноябре. Смело", p: 2490, b: 3 },
    { id: "st_kicks", look: "street", slot: "shoes", e: "👟", n: "Кроссы «Коллаб с никем»", p: 14990, b: 9 },
    { id: "st_bag", look: "street", slot: "acc", e: "🎒", n: "Рюкзак на одной лямке", p: 3990, b: 3 },
    { id: "bl_shades", look: "blogger", slot: "hat", e: "🕶️", n: "Очки как у блогера (в помещении)", p: 6990, b: 6 },
    { id: "bl_top", look: "blogger", slot: "top", e: "👚", n: "Топ из капсульной коллекции", p: 7990, b: 6 },
    { id: "bl_heels", look: "blogger", slot: "shoes", e: "👠", n: "Обувь «для фото, не для ходьбы»", p: 9990, b: 7 },
    { id: "bl_bag", look: "blogger", slot: "acc", e: "👜", n: "Сумка «Это не реклама»", p: 19990, b: 10 },
  ];
  const SLOT_DEF = { hat: "🫥", top: "👕", bottom: "👖", shoes: "🩴", acc: "" };
  const week = () => Math.floor(today() / 7);
  const hitLook = () => LOOKS[week() % LOOKS.length].id;
  const priceOf = (w) => (w.look === hitLook() ? Math.round((w.p * 0.8) / 10) * 10 : w.p);
  const invId = (w) => "style_" + w.id;
  const owned = (w) => Vibe.inv.has(invId(w));

  function mannequin() {
    const mine = WEAR.filter(owned);
    const best = (slot) => mine.filter((w) => w.slot === slot).sort((a, b) => b.b - a.b)[0];
    const L = (slot, cls) => { const w = best(slot); return w ? `<span class="l ${cls}">${w.e}</span>` : SLOT_DEF[slot] ? `<span class="l ${cls} empty">${SLOT_DEF[slot]}</span>` : ""; };
    const ava = (S().profile && S().profile.avatar) || "😎";
    return `<div class="pp-manq" data-manq>${L("hat", "hat")}<span class="l face">${ava}</span>${L("top", "")}${L("bottom", "")}${L("shoes", "")}${L("acc", "acc")}</div>`;
  }
  function lookBlock() {
    const v = Vibe.inv.look();
    const word = v < 40 ? "Пижама-кор" : v < 55 ? "Прилично" : v < 70 ? "Стильно" : v < 85 ? "Икона района" : "Ходячий лукбук";
    return `<div class="card c-yellow pp-mq">${mannequin()}
      <div class="pp-look"><div class="muted" style="font-size:12px;font-weight:900">ВНЕШНОСТЬ</div><div class="big-num" data-lookv>${v}</div><div style="font-weight:900">${word}</div>
      <div class="progress"><i style="--p:${v}%;background:var(--pink)"></i></div>
      <div style="font-size:12px;font-weight:700;margin-top:8px">Внешность влияет на собеседования и свидания</div></div></div>`;
  }
  function itemCard(w) {
    const own = owned(w);
    const it = Vibe.inv.list("wear").find((x) => x.id === invId(w));
    const old = own && it && today() - (it.at || 0) >= 7;
    const pr = priceOf(w);
    return `<div class="card pp-item">
      <div class="pic ${LOOKS.find((l) => l.id === w.look).col}">${w.look === hitLook() && !own ? `<span class="badge tag" style="background:var(--yellow)">−20%</span>` : ""}<span class="emo">${w.e}</span>${old ? `<span class="badge pp-old">уже немодно</span>` : ""}</div>
      <div class="nm">${w.n}</div>
      <div class="row"><span class="price" style="font-size:14px">${own ? "✓ твоё" : rub(pr)}</span><span class="badge" style="background:var(--lilac)">+${w.b} 💅</span></div>
      <button class="btn ${own ? "" : "black"} block" data-buy="${w.id}" ${own ? "disabled" : ""}>${own ? "В гардеробе" : "Купить"}</button>
    </div>`;
  }

  Vibe.screen("style", {
    render(params) {
      const cur = params.look || hitLook();
      const hit = LOOKS.find((l) => l.id === hitLook());
      return `
      ${Vibe.ui.head("Vibe Style", "Гардероб и образы", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Новая ты-коллекция", text: "Новая коллекция каждую неделю. Старая сразу немодная", emo: "🛍️", color: "c-holo", sticker: `🔥 ${hit.t} −20%` })}
        <div style="margin-top:14px" data-lookblk>${lookBlock()}</div>
        <h2 class="sec">Образы <small>неделя №${week() + 1}</small></h2>
        <div class="chips">${LOOKS.map((l) => `<button class="chip ${l.id === cur ? "on" : ""}" data-look="${l.id}">${l.e} ${l.t}</button>`).join("")}</div>
        <div class="pp-items stagger" data-items style="margin-top:8px">${WEAR.filter((w) => w.look === cur).map(itemCard).join("")}</div>
        ${zab("Внешность влияет на собеседования и свидания. На зарплату — нет. Но ты держись.", "smile")}
        <div class="fine">Коллекция создана с заботой о планете*. *О какой — не уточняется. Возврат возможен в течение 0 дней.</div>
      </div>`;
    },
    mount(root, params) {
      let cur = params.look || hitLook();
      const items = $(root, "[data-items]");
      const draw = () => {
        items.innerHTML = WEAR.filter((w) => w.look === cur).map(itemCard).join("");
        [...items.children].forEach((c, i) => c.style.setProperty("--i", i));
      };
      const onClick = (e) => {
        const l = e.target.closest("[data-look]");
        if (l) { cur = l.dataset.look; $$(root, "[data-look]").forEach((x) => x.classList.toggle("on", x === l)); FX.bump(l); draw(); return; }
        const b = e.target.closest("[data-buy]"); if (!b) return;
        const w = WEAR.find((x) => x.id === b.dataset.buy);
        if (!w || owned(w)) return;
        const before = Vibe.inv.look();
        if (!Vibe.pay(priceOf(w), { title: `Market · Vibe Style · ${w.n}`, emoji: w.e, col: "c-pink", from: b })) return;
        Vibe.inv.add({ id: invId(w), name: w.n, e: w.e, cat: "wear", bonus: { look: w.b } });
        FX.burst(b, { emojis: [w.e, "✨", "💅", "🔥"], count: 14 });
        FX.sound.add();
        $(root, "[data-lookblk]").innerHTML = lookBlock();
        FX.bump($(root, "[data-manq]"));
        const lv = $(root, "[data-lookv]"); FX.countTo(lv, Vibe.inv.look(), { from: before });
        FX.toast(`Внешность ${before} → ${Vibe.inv.look()}. Зеркало в шоке`, "💅", 2400);
        const allLook = WEAR.filter((x) => x.look === w.look).every(owned);
        if (allLook) { FX.confetti(); FX.toast(`Полный образ «${LOOKS.find((x) => x.id === w.look).t}» собран!`, "👑", 3000); Vibe.reward({ vibiki: 50, xp: 40 }); }
        draw();
      };
      root.addEventListener("click", onClick);
      return () => root.removeEventListener("click", onClick);
    },
  });

  /* ================= Хобби ================= */
  const HOBBIES = [
    { id: "guitar", e: "🎸", t: "Гитара", sub: "Четыре аккорда — и ты звезда двора", col: "c-orange", game: "rhythm", btn: "Бряк!", eff: "Настроение", cls: { place: "club", price: 1200, t: "Урок гитары в клубе" } },
    { id: "run", e: "🏃", t: "Бег", sub: "Бежать от проблем — тоже кардио", col: "c-lime", game: "tap", good: ["🏁", "💧", "🍌"], bad: ["🚧", "🐕"], eff: "Шаги", cls: { place: "park", price: 0, t: "Забег клуба «Пробежка за кофе»" } },
    { id: "draw", e: "🎨", t: "Рисование", sub: "Абстракция — когда не получилось реализм", col: "c-pink", game: "tap", good: ["🔴", "🟡", "🔵", "🟢"], bad: ["💩", "🫗"], eff: "Настроение", cls: { place: "hq", price: 1500, t: "Арт-класс в Vibe HQ" } },
    { id: "yoga", e: "🧘", t: "Йога", sub: "Дыши. Счёт за коммуналку тоже подождёт", col: "c-mint", game: "rhythm", btn: "Вдох-выдох", slow: true, eff: "Медитация", cls: { place: "park", price: 900, t: "Йога в парке на рассвете" } },
    { id: "gaming", e: "🎮", t: "Гейминг", sub: "Это тоже спорт. Киберспорт", col: "c-violet", game: "tap", good: ["👾", "💎", "⭐"], bad: ["💣", "☠️"], eff: "Настроение", cls: { place: "club", price: 700, t: "Турнир в клубе" } },
    { id: "cook", e: "🍳", t: "Готовка", sub: "Как в ресторане, только посуду мыть тебе", col: "c-yellow", game: "tap", good: ["🥦", "🍅", "🥕", "🧄"], bad: ["🍬", "🌭"], eff: "Питание", cls: { place: "restaurant:4", price: 2200, t: "Мастер-класс шефа" } },
  ];
  const H = () => S().pp_hobbies || {};
  const hob = (id) => Object.assign({ on: false, lvl: 1, xp: 0, last: -9999, sessions: 0 }, H()[id] || {});
  const needXp = (lvl) => lvl * 60;
  const setHob = (id, patch) => set({ pp_hobbies: Object.assign({}, H(), { [id]: Object.assign(hob(id), patch) }) });
  const COOLDOWN = 120; // игровых минут между сессиями

  Vibe.ACH.kitchen = Vibe.ACH.kitchen || { e: "🎸", t: "Концерт на кухне", d: "5 уровень любого хобби" };

  function addHobXp(id, xp) {
    const h = hob(id);
    let { lvl } = h; let x = h.xp + xp; let up = false;
    while (x >= needXp(lvl)) { x -= needXp(lvl); lvl++; up = true; }
    setHob(id, { xp: x, lvl, sessions: h.sessions + 1 });
    const def = HOBBIES.find((q) => q.id === id);
    if (up) {
      setTimeout(() => { FX.confetti(); FX.sound.levelup(); FX.toast(`${def.t}: уровень ${lvl}!`, def.e, 2800); }, 500);
      if (lvl >= 5 && !S().achievements.includes("kitchen")) {
        Vibe.achieve("kitchen");
        setTimeout(() => Vibe.modal(`<div class="m-emo float">🎤</div><div class="display">Концерт на кухне</div><p>${def.t}, уровень 5. Соседи стучат по батарее — это аплодисменты.</p><button class="btn black block" data-close>Бис! 🔥</button>`), 1600);
      }
    }
    return { lvl, up };
  }
  function hobEffect(id, score) {
    if (!Vibe.body) return;
    if (id === "run") Vibe.body.effect("walk", { km: +(1.5 + score * 3).toFixed(1) });
    else if (id === "yoga") Vibe.body.effect("meditate");
    else if (id === "cook") Vibe.body.effect("healthy");
    else if (id === "gaming") Vibe.body.effect("games");
    else moodUp(Math.round(5 + score * 7), `${id === "guitar" ? "🎸" : "🎨"} Настроение +${Math.round(5 + score * 7)}`);
  }

  if (Vibe.sched) {
    Vibe.sched.on("hobby", (e) => {
      const id = e.hobby; if (!HOBBIES.find((q) => q.id === id)) return;
      setHob(id, { on: true });
      hobEffect(id, 0.9);
      addHobXp(id, 60);
      setTimeout(() => FX.toast(`Класс засчитан: +60 к прогрессу`, "📈", 2400), 1400);
    });
    Vibe.sched.on("hobby:missed", (e) => { if (e.hobby) FX.toast("Пропустил класс. Тренер сказал «ничего страшного» с интонацией «всё страшно»", "😬", 3200); });
  }

  // Мини-игры: tap — тапай хорошее, избегай плохого; rhythm — попади в зелёную зону
  let activeClose = null;
  function playSession(def, onDone) {
    const timers = new Set();
    let raf = 0, finished = false;
    const clear = () => { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers.clear(); cancelAnimationFrame(raf); };
    const finish = (m, score, close) => {
      if (finished) return; finished = true; clear();
      score = clamp(score, 0, 1);
      const pct = Math.round(score * 100);
      m.querySelector("[data-stage]").innerHTML = `
        <div class="pp-big ${pct >= 60 ? "wobble" : ""}">${pct >= 80 ? "🤩" : pct >= 50 ? "😎" : "🫠"}</div>
        <div class="display" style="font-size:26px">${pct}%</div>
        <p>${pct >= 80 ? "Вау. Можно уже на YouTube" : pct >= 50 ? "Неплохо! Ещё пара сессий" : "Главное — участие. И деньги, которые ты не потратил"}</p>
        <button class="btn black block" data-close>Готово</button>`;
      if (pct >= 60) FX.confetti({ count: 60 }); else FX.sound.pop();
      onDone(score);
    };
    activeClose = Vibe.modal(`
      <div class="display" style="font-size:24px">${def.e} ${def.t}</div>
      <div data-stage>
        ${def.game === "tap"
          ? `<div class="pp-hud"><span>⏱ <span data-time>8.0</span></span><span>Очки: <b data-score>0</b></span></div>
             <div class="pp-game" data-field></div>
             <div class="muted" style="font-size:12px;font-weight:700">Тапай ${def.good.join(" ")}, не трогай ${def.bad.join(" ")}</div>`
          : `<div class="pp-hud"><span>Раунд <b data-round>1</b>/5</span><span>Точность: <b data-acc>—</b></span></div>
             <div class="pp-bar" data-bar><div class="pp-zone" data-zone></div><div class="pp-mark" data-mark></div></div>
             <button class="btn ${def.slow ? "lime" : "pink"} xl block" data-hit>${def.btn}</button>
             <div class="muted" style="font-size:12px;font-weight:700;margin-top:8px">Жми, когда палочка в зелёной зоне</div>`}
      </div>`, {
      sound: "pop",
      onMount(m, close) {
        if (def.game === "tap") {
          const field = m.querySelector("[data-field]");
          let score = 0, hits = 0, left = 8;
          const timeEl = m.querySelector("[data-time]"), scEl = m.querySelector("[data-score]");
          const spawn = () => {
            const good = Math.random() < 0.72;
            const b = document.createElement("button");
            b.className = "pp-tgt"; b.textContent = pick(good ? def.good : def.bad);
            b.style.left = 12 + Math.random() * 76 + "%"; b.style.top = 14 + Math.random() * 72 + "%";
            b.onclick = (ev) => {
              ev.stopPropagation();
              b.classList.add("hit");
              if (good) { score++; hits++; FX.sound.tap(); FX.burst(b, { emojis: ["✨", b.textContent], count: 5, spread: 50 }); }
              else { score = Math.max(0, score - 2); FX.shake(field); }
              scEl.textContent = score; FX.bump(scEl);
              const t = setTimeout(() => b.remove(), 300); timers.add(t);
            };
            field.appendChild(b);
            const t = setTimeout(() => b.remove(), 1150); timers.add(t);
          };
          timers.add(setInterval(spawn, 480));
          spawn();
          timers.add(setInterval(() => {
            left = Math.max(0, left - 0.1);
            timeEl.textContent = left.toFixed(1);
            if (left <= 0) finish(m, score / 12, close);
          }, 100));
        } else {
          const bar = m.querySelector("[data-bar]"), zone = m.querySelector("[data-zone]"), mark = m.querySelector("[data-mark]");
          let round = 1, pos = 0, dir = 1, z = 0, accs = [], t0 = performance.now();
          const w = def.slow ? 0.24 : 0.16;
          const newZone = () => { z = 0.08 + Math.random() * (0.84 - w); zone.style.left = z * 100 + "%"; zone.style.width = w * 100 + "%"; };
          newZone();
          const speed = () => (def.slow ? 0.45 : 0.75) + round * 0.12;
          const loop = (t) => {
            const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
            pos += dir * speed() * dt;
            if (pos >= 1) { pos = 1; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; }
            mark.style.left = pos * 100 + "%";
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
          m.querySelector("[data-hit]").addEventListener("click", (ev) => {
            if (finished) return;
            const c = z + w / 2;
            const acc = clamp(1 - Math.abs(pos - c) / (w / 2 + 0.12), 0, 1);
            accs.push(acc);
            m.querySelector("[data-acc]").textContent = Math.round(acc * 100) + "%";
            if (acc > 0.45) { FX.burst(ev.currentTarget, { emojis: def.slow ? ["🌬️", "🕊️", "✨"] : ["🎵", "🎶", "✨"], count: 7, spread: 70 }); FX.sound.like(); }
            else FX.shake(bar);
            if (round >= 5) { finish(m, accs.reduce((s, a) => s + a, 0) / accs.length, close); return; }
            round++; m.querySelector("[data-round]").textContent = round; newZone();
          });
        }
      },
      onClose() { clear(); activeClose = null; },
    });
  }

  function hobCard(def) {
    const h = hob(def.id);
    const cd = Math.max(0, Math.ceil(h.last + COOLDOWN - nowMin()));
    const pend = Vibe.sched ? Vibe.sched.upcoming(20).find((e) => e.kind === "hobby" && e.hobby === def.id) : null;
    return `<div class="card pp-hob" data-hob="${def.id}">
      <div class="pp-top">
        <div class="pp-ava ${def.col}"><span class="emo ${h.on ? "float" : ""}">${def.e}</span></div>
        <div style="flex:1;min-width:0"><div class="pp-name">${def.t}</div><div class="pp-status">${def.sub}</div></div>
        ${h.on ? `<div class="lv"><small>УР.</small><b>${h.lvl}</b></div>` : ""}
      </div>
      ${h.on ? `
        <div class="pp-relrow"><div class="progress"><i style="--p:${Math.round((h.xp / needXp(h.lvl)) * 100)}%;background:var(--violet)"></i></div><b>${h.xp}/${needXp(h.lvl)} · ${def.eff}</b></div>
        ${pend ? `<div class="pp-meet">📅 ${esc(pend.title)} — ${whenText(pend)}</div>` : ""}
        <div class="acts2">
          <button class="btn lime" data-play ${cd ? "disabled" : ""}>${cd ? `Отдых ${String(Math.ceil((cd / 60) * 10) / 10).replace(".", ",")} ч` : "▶ Сессия"}</button>
          <button class="btn yellow" data-cls ${pend ? "disabled" : ""}>📅 Класс · ${def.cls.price ? rub(def.cls.price) : "бесплатно"}</button>
        </div>`
        : `<div class="acts2"><button class="btn black" data-pick style="grid-column:1/-1">Начать хобби ✨</button></div>`}
    </div>`;
  }
  function hobbyBody() {
    const mine = HOBBIES.filter((d) => hob(d.id).on);
    const top = mine.map((d) => hob(d.id).lvl).reduce((a, b) => Math.max(a, b), 0);
    return `
      <div class="pp-sum">
        <div class="card c-lime"><b>${mine.length}</b><small>хобби</small></div>
        <div class="card c-yellow"><b>${top || "—"}</b><small>лучший уровень</small></div>
        <div class="card c-pink"><b>${S().achievements.includes("kitchen") ? "🎤" : "5"}</b><small>${S().achievements.includes("kitchen") ? "концерт был!" : "ур. до концерта"}</small></div>
      </div>
      <div class="stack stagger" style="margin-top:14px">${HOBBIES.map(hobCard).join("")}</div>`;
  }
  function bookClass(def, rerender) {
    const info = Vibe.game.info();
    const HRS = [8, 11, 19];
    let day = null, hour = null;
    const ok = (d, h) => d > 0 || h > info.hour;
    Vibe.ui.sheet(`
      <div class="display" style="font-size:26px">${def.e} ${def.cls.t}</div>
      <div class="pp-status" style="margin-top:6px">Место: ${esc((Vibe.map.place(def.cls.place) || {}).label || "")} · 90 минут · прогресс +60</div>
      <div class="pp-lbl">Когда</div>
      <div class="pp-chips">${[0, 1].map((d) => HRS.map((h) => `<button class="chip" data-slot="${d},${h}" ${ok(d, h) ? "" : "disabled"}>${d ? "Завтра" : "Сегодня"} ${h}:00</button>`).join("")).join("")}</div>
      <button class="btn black xl block" data-book style="margin-top:16px" disabled>Записаться ${def.cls.price ? `· ${rub(def.cls.price)}` : ""}</button>
      <div class="fine">Отмена бесплатная за 48 часов. Записаться можно максимум за 24.</div>`, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          const s = e.target.closest("[data-slot]");
          if (s) { [day, hour] = s.dataset.slot.split(",").map(Number); $$(sh, "[data-slot]").forEach((x) => x.classList.toggle("on", x === s)); $(sh, "[data-book]").disabled = false; FX.bump(s); return; }
          const b = e.target.closest("[data-book]");
          if (!b || hour == null) return;
          if (def.cls.price && !Vibe.pay(def.cls.price, { title: `Learn · ${def.cls.t}`, emoji: def.e, col: "c-lilac", from: b })) return;
          Vibe.sched.add({ day: info.day + day, hour, min: 0, dur: 90, title: def.cls.t, e: def.e, place: def.cls.place, kind: "hobby", hobby: def.id, go: "maps", price: def.cls.price });
          close(); FX.sound.success(); FX.confetti({ count: 50 });
          FX.toast("Записан! Приходи вовремя — место на карте", "📅", 2800);
          rerender();
        });
      },
    });
  }

  Vibe.screen("hobby", {
    render() {
      return `
      ${Vibe.ui.head("Vibe Хобби", "Жизнь не только работа. Иногда", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Найди себя", text: "Или хотя бы занятие на вечер, кроме ленты", emo: "🎸", color: "c-orange", sticker: "🎤 ур. 5 = концерт" })}
        <div data-body>${hobbyBody()}</div>
        ${zab("Хобби, которое приносит деньги, называется работой. Не делай так.", "smile")}
        <div class="fine">Уровни хобби не подтверждаются сертификатом государственного образца. Только нашим.</div>
      </div>`;
    },
    mount(root) {
      const body = $(root, "[data-body]");
      const rerender = () => { body.innerHTML = hobbyBody(); body.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i))); };
      const onClick = (e) => {
        const card = e.target.closest("[data-hob]"); if (!card) return;
        const def = HOBBIES.find((q) => q.id === card.dataset.hob);
        if (e.target.closest("[data-pick]")) {
          setHob(def.id, { on: true });
          FX.burst(card, { emojis: [def.e, "✨", "⭐"], count: 14 }); FX.sound.success();
          FX.toast(`${def.t} — теперь твоё хобби!`, def.e);
          rerender(); return;
        }
        const pl = e.target.closest("[data-play]");
        if (pl) {
          if (Vibe.body && Vibe.body.get().sleeping) { FX.toast("Ты спишь. Хобби во сне не считается", "😴"); return; }
          if (Vibe.body && Vibe.body.get().energy < 12) { FX.shake(pl); FX.toast("Сил нет совсем. Сначала поспи", "🥱"); return; }
          playSession(def, (score) => {
            setHob(def.id, { last: nowMin() });
            hobEffect(def.id, score);
            const xp = 15 + Math.round(score * 30);
            addHobXp(def.id, xp);
            Vibe.reward({ vibiki: 5 + Math.round(score * 15), xp: 10, silent: true });
            setTimeout(() => FX.toast(`${def.t}: +${xp} к прогрессу`, def.e, 2200), 300);
            rerender();
          });
          return;
        }
        if (e.target.closest("[data-cls]")) bookClass(def, rerender);
      };
      root.addEventListener("click", onClick);
      return () => { root.removeEventListener("click", onClick); if (activeClose) activeClose(); };
    },
  });

  /* ================= Добрые дела ================= */
  const CAUSES = [
    { id: "cats", e: "🐈", t: "Приют «Мурчащие сердца»", sub: "Корм, лоток и немного любви", col: "c-yellow" },
    { id: "trees", e: "🌳", t: "Посадить деревья в Спальном", sub: "Через 20 лет будет тень", col: "c-lime" },
    { id: "elders", e: "👵", t: "Тёплые бабушки", sub: "Пледы и звонки одиноким пожилым", col: "c-pink" },
    { id: "books", e: "📚", t: "Библиотека на ул. Сторис", sub: "Последнее место без рекламы", col: "c-sky" },
    { id: "corp", e: "🏢", t: "Помочь Корпорации (она и так богата)", sub: "Ваш вклад ничего не изменит. Совсем", col: "c-lilac", corp: true },
  ];
  const AMTS = [100, 300, 1000];
  const REP = [[0, "Сочувствующий", "🙂"], [10, "Добряк", "😇"], [30, "Меценат района", "🌟"], [80, "Святой по версии Vibe", "👼"], [200, "Легенда добра", "🕊️"]];
  const repTitle = (r) => REP.filter((x) => r >= x[0]).pop();
  function charityBody() {
    const r = S().pp_rep || 0;
    const t = repTitle(r);
    const nxt = REP.find((x) => x[0] > r);
    const log = S().pp_charity || [];
    const total = log.reduce((s, x) => s + x.a, 0);
    const good = S().pp_goodDay === today();
    return `
      <div class="card c-mint pp-rep" style="margin-top:14px">
        <span class="emo float" style="font-size:56px">${t[2]}</span>
        <div style="flex:1"><div class="muted" style="font-size:12px;font-weight:900">РЕПУТАЦИЯ</div><div class="big-num" data-rep>${r}</div><div style="font-weight:900">${t[1]}</div>
        ${nxt ? `<div class="progress" style="margin-top:6px"><i style="--p:${Math.round(((r - t[0]) / (nxt[0] - t[0])) * 100)}%"></i></div><div style="font-size:11px;font-weight:800;margin-top:4px">До «${nxt[1]}»: ${nxt[0] - r}</div>` : ""}</div>
      </div>
      <div class="card tight" style="margin-top:12px;display:flex;gap:12px;align-items:center">
        <span style="font-size:32px">🛍️</span><div style="flex:1;font-weight:800;font-size:13px">Помочь бабушке донести сумки<div class="muted" style="font-size:11px">Бесплатно. Раз в день. Репутация +1</div></div>
        <button class="btn sm ${good ? "" : "lime"}" data-good ${good ? "disabled" : ""}>${good ? "Сделано ✓" : "Помочь"}</button>
      </div>
      <h2 class="sec">Куда помочь <small>всего ${rub(total)}</small></h2>
      <div class="stack stagger">${CAUSES.map((c) => `
        <div class="card pp-cause" data-cause="${c.id}">
          <div class="pp-top"><div class="pp-ava ${c.col}"><span class="emo">${c.e}</span></div>
          <div style="flex:1;min-width:0"><div class="pp-name" style="font-size:16px">${c.t}</div><div class="pp-status">${c.sub}</div></div></div>
          <div class="amts">${AMTS.map((a) => `<button class="btn ${c.corp ? "" : "yellow"}" data-amt="${a}">${rub(a)}</button>`).join("")}</div>
        </div>`).join("")}</div>
      ${log.length ? `<h2 class="sec">История добра</h2><div class="card" style="padding:4px 14px">${log.slice(0, 6).map((x) => `<div class="li"><div class="ic c-mint">${x.e}</div><div class="tx"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></div><div class="amt">${rub(x.a)}</div></div>`).join("")}</div>` : ""}`;
  }

  Vibe.screen("charity", {
    render() {
      return `
      ${Vibe.ui.head("Добрые дела", "Карма с кэшбеком", Vibe.ui.vibikiPill())}
      <div class="stagger">
        ${Vibe.ui.hero({ title: "Сделай добро", text: "Маленькие суммы, большая разница. И приятное чувство внутри", emo: "💚", color: "c-lime", sticker: "🪙 кэшбек на доброту" })}
        <div data-body>${charityBody()}</div>
        ${zab("Доброта бесценна. Поэтому мы берём комиссию 0%. Пока что.", "smile")}
        <div class="fine">Корпорация удваивает ваши пожертвования. В своём отчёте об устойчивом развитии.</div>
      </div>`;
    },
    mount(root) {
      const body = $(root, "[data-body]");
      const rerender = () => { body.innerHTML = charityBody(); body.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i))); };
      const onClick = (e) => {
        const g = e.target.closest("[data-good]");
        if (g) {
          if (S().pp_goodDay === today()) return;
          set({ pp_goodDay: today(), pp_rep: (S().pp_rep || 0) + 1 });
          moodUp(4, "🛍️ Бабушка сказала «дай бог здоровья». Настроение +4");
          FX.burst(g, { emojis: ["👵", "💚", "✨"], count: 12 }); FX.sound.like();
          rerender(); return;
        }
        const b = e.target.closest("[data-amt]"); if (!b) return;
        const c = CAUSES.find((x) => x.id === b.closest("[data-cause]").dataset.cause);
        const a = +b.dataset.amt;
        if (!Vibe.pay(a, { title: `Добрые дела · ${c.t}`, emoji: c.e, col: "c-mint", from: b, cashback: c.corp ? 0 : 0.03 })) return;
        const before = S().pp_rep || 0;
        const gain = c.corp ? 0 : Math.max(1, Math.round(a / 100));
        set({ pp_rep: before + gain, pp_charity: [{ t: c.t, e: c.e, a, d: Vibe.game.info().date }, ...(S().pp_charity || [])].slice(0, 20) });
        if (c.corp) {
          FX.toast(pick(["Акции Корпорации выросли на 0,0000001%. Спасибо!", "Корпорация купила на это полскрепки для совета директоров", "Ваш вклад учтён. В графе «прочие доходы»"]), "🏢", 3400);
          FX.burst(b, { emojis: ["💸", "🏢"], count: 6 });
        } else {
          moodUp(Math.min(12, 3 + Math.round(a / 150)), `💚 Ты сделал доброе дело. Настроение +${Math.min(12, 3 + Math.round(a / 150))}`);
          FX.burst(b, { emojis: [c.e, "💚", "✨"], count: 14 }); FX.sound.like();
          if (repTitle(before)[1] !== repTitle(before + gain)[1]) { FX.confetti(); FX.toast(`Новый статус: ${repTitle(before + gain)[1]}`, repTitle(before + gain)[2], 3000); }
        }
        rerender();
        const rep = $(root, "[data-rep]"); if (rep) { FX.countTo(rep, before + gain, { from: before }); FX.bump(rep); }
      };
      root.addEventListener("click", onClick);
      return () => root.removeEventListener("click", onClick);
    },
  });
})();
