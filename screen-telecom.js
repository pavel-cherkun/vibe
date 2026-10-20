/* ============================================================
   Vibe Телеком — тарифы, гигабайты, минуты, SMS.
   Живой расход трафика: каждый экран ест мегабайты, видео — больше.
   Кончился интернет — на тяжёлых экранах оверлей «Нет интернета».
   API: Vibe.telecom = { dataLeft(), use(mb, why), hasData(), plan(), state() }
   Состояние: S().tel
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const GB = 1024;
  const PFX = "tlc";

  /* ---------- Тарифы ---------- */
  const PLANS = {
    starter: { id: "starter", n: "Стартовая SIM", e: "🐣", price: 0, mb: 2 * GB, min: 100, sms: 20, col: "c-white", once: true,
      d: "Выдаётся при рождении в Vibe. Не продлевается. Как молодость.", fine: "Пакет разовый. Остатки сгорают вместе с иллюзиями." },
    base: { id: "base", n: "Базовый вайб", e: "😎", price: 390, mb: 10 * GB, min: 300, sms: 100, col: "c-sky",
      d: "10 ГБ на рилсы, 300 минут на «я перезвоню».", fine: "Скорость до 1 Гбит/с* · *в теории, в вакууме, ночью" },
    unlim: { id: "unlim", n: "Безлимит на мемы", e: "♾️", price: 690, unlim: true, min: 600, sms: 300, col: "c-pink",
      d: "Безлимитный интернет. Никаких оверлеев. Никаких оправданий.", fine: "Безлимит действует в пределах честного использования. Честность определяет Корпорация." },
    corp: { id: "corp", n: "Корпоративный", e: "💼", price: 0, mb: 25 * GB, min: 1000, sms: 500, col: "c-lilac", plus: true,
      d: "Входит в «Плюс Вайб». 25 ГБ, 1000 минут — чтобы ты всегда был на связи. Всегда.", fine: "Звонки после 19:00 считаются рабочими. Отключение звука расценивается как увольнение по собственному." },
    granny: { id: "granny", n: "Бабушкин", e: "👵", price: 150, mb: 0, min: Infinity, sms: 50, col: "c-mint",
      d: "Только звонки, зато безлимитные. Интернет — это когда соседка рассказала.", fine: "В подарок: гороскоп по SMS и прогноз погоды «одевайся теплее»." },
  };
  const ORDER = ["base", "unlim", "corp", "granny"];

  // Сколько стоит заход на экран (МБ) и сколько течёт каждые 5 секунд, пока ты на нём
  const HEAVY = { reels: [90, 18], cinema: [150, 26], music: [40, 6], gram: [60, 12], games: [35, 4], match: [30, 5], tickets: [12, 1] };
  const HEAVY_NAMES = { reels: "Рилсы", cinema: "Vibe Кино", music: "Vibe Music", gram: "Vibegram", games: "Vibe Games", match: "Vibe Match", tickets: "Vibe Tickets" };
  const BLOCK = ["reels", "cinema", "gram", "music", "match"]; // без интернета не грузятся

  /* ---------- Состояние ---------- */
  const G = () => (Vibe.game && S().game ? Vibe.game.info() : { day: 0, dom: 1 });
  const ready = () => !!(S().profile && S().game && Vibe.game);
  function tel() {
    let t = S().tel;
    if (!t) {
      const r = () => String(Math.floor(Math.random() * 90) + 10);
      t = { plan: "starter", mb: PLANS.starter.mb, min: PLANS.starter.min, sms: PLANS.starter.sms, cycle: G().day,
        used: {}, by: {}, num: `+7 (900) VIBE-${r()}-${r()}`, esim: false, roam: -1, y2007: 0, warned: 0, giftDay: -1, momDay: -1 };
      Vibe.state.set({ tel: t });
    }
    return t;
  }
  const save = (patch) => Vibe.state.set({ tel: Object.assign({}, tel(), patch) });
  const plan = () => PLANS[tel().plan] || PLANS.starter;
  const isUnlim = () => !!plan().unlim;
  const dataLeft = () => (isUnlim() ? Infinity : Math.max(0, tel().mb));
  const hasData = () => dataLeft() > 0;
  const roaming = () => ready() && tel().roam >= G().day;
  const atHome = () => Vibe.trip && Vibe.trip.where && Vibe.trip.where() === "home";
  const fmtMB = (mb) => (mb === Infinity ? "∞" : mb >= GB ? (mb / GB).toFixed(mb >= 10 * GB ? 0 : 1).replace(".", ",") + " ГБ" : Math.round(mb) + " МБ");
  const fmtMin = (m) => (m === Infinity ? "∞" : Vibe.fmt(m));

  /* ---------- Расход ---------- */
  function use(mb, why = "Прочее") {
    if (!ready() || !(mb > 0)) return dataLeft();
    const t = tel();
    let k = 1;
    if (atHome() && !roaming()) k *= 0.3;        // домашний Wi-Fi (соседа)
    if (roaming() && !t.esimTravel) k *= 2;     // роуминговые мегабайты тяжелее
    mb = Math.round(mb * k * 10) / 10;
    if (!isUnlim() && t.mb <= 0) return 0;
    const before = t.mb;
    const d = String(G().day);
    const used = Object.assign({}, t.used, { [d]: Math.round((((t.used || {})[d] || 0) + (isUnlim() ? mb : Math.min(mb, t.mb))) * 10) / 10 });
    // храним только 14 дней
    Object.keys(used).forEach((x) => { if (+x < +d - 14) delete used[x]; });
    const by = Object.assign({}, t.by, { [why]: Math.round((((t.by || {})[why] || 0) + mb) * 10) / 10 });
    const mbLeft = isUnlim() ? t.mb : Math.max(0, t.mb - mb);
    save({ mb: mbLeft, used, by });
    if (!isUnlim()) {
      const full = plan().mb || GB;
      if (before > full * 0.15 && mbLeft <= full * 0.15 && mbLeft > 0) FX.toast(`Осталось ${fmtMB(mbLeft)}. Рилсы смотрят на тебя с тревогой`, "📶", 2600);
      if (before > 0 && mbLeft <= 0) {
        FX.toast("Интернет закончился. Добро пожаловать в 2007", "📵", 3000);
        Vibe.emit("telecom", { kind: "empty" });
        if (Vibe.mail && Vibe.mail.send) Vibe.mail.send({ from: "Vibe Телеком", subject: "Мы заметили, что тебе одиноко 📵", body: "Твои гигабайты закончились. Но наша забота — нет. Докупи 1 ГБ за 149 ₫ или подключи «Безлимит на мемы». Мы одна семья (семья с тарифами).", kind: "official" });
        const cur = Vibe.current && Vibe.current.route && Vibe.current.route.name;
        if (BLOCK.includes(cur)) setTimeout(() => showOverlay(cur), 300);
      }
    }
    refreshScreen();
    return dataLeft();
  }

  /* ---------- Обновления пакета ---------- */
  function activate(id, { paid = false } = {}) {
    const p = PLANS[id];
    if (Vibe.subs) {
      Vibe.subs.remove("telecom");
      if (p.price > 0) {
        Vibe.subs.add({ id: "telecom", name: `Связь · ${p.n}`, e: "📶", price: p.price, note: "Vibe Телеком" });
        // уже оплатили сегодня → следующее списание через месяц
        if (paid) { const dom = G().dom; Vibe.state.set({ subs: Vibe.subs.list().map((x) => (x.id === "telecom" ? Object.assign({}, x, { dom }) : x)) }); }
      }
    }
    save({ plan: id, mb: p.unlim ? 0 : p.mb, min: p.min === Infinity ? 0 : p.min, sms: p.sms, cycle: G().day, by: {} });
    Vibe.emit("telecom", { kind: "plan", plan: id });
  }

  function tick() {
    if (!ready()) return;
    const t = tel();
    const p = plan();
    const day = G().day;
    // Корпоративный без Плюса не живёт
    if (p.plus && !S().plus) {
      save({ plan: "starter", mb: 0, min: 0, sms: 0, cycle: day });
      FX.toast("«Плюс Вайб» отключён — корпоративная связь тоже. Семья помнит", "💼", 3200);
      return;
    }
    // Подписку отменили где-то ещё
    if (p.price > 0 && Vibe.subs && !Vibe.subs.has("telecom")) {
      save({ plan: "starter", mb: 0, min: 0, sms: 0, cycle: day });
      FX.toast("Тариф отключён. Ты снова на стартовой SIM (пустой)", "📵", 3200);
      return;
    }
    // Ежемесячное обновление пакета
    if (!p.once && day >= t.cycle + 30) {
      save({ mb: p.unlim ? 0 : p.mb, min: p.min === Infinity ? 0 : p.min, sms: p.sms, cycle: day, by: {} });
      FX.toast(`Пакет «${p.n}» обновлён: ${p.unlim ? "∞" : fmtMB(p.mb)} снова твои`, "📶", 2600);
    }
    // Фоновый расход, пока сидишь на тяжёлом экране
    if (document.hidden) return;
    const cur = Vibe.current && Vibe.current.route && Vibe.current.route.name;
    if (!cur) return;
    if (BLOCK.includes(cur) && !hasData()) return;
    const h = HEAVY[cur];
    use(h ? h[1] : 0.5, h ? HEAVY_NAMES[cur] : "Сам Vibe");
  }

  /* ---------- Оверлей «Нет интернета» ---------- */
  let overlay = null;
  const ovT = [];
  function hideOverlay() { if (overlay) { overlay.remove(); overlay = null; } ovT.splice(0).forEach(clearTimeout); }
  function showOverlay(name) {
    hideOverlay();
    const stack = document.getElementById("stack");
    if (!stack) return;
    overlay = document.createElement("div");
    overlay.className = `${PFX}-ov`;
    const draw2007 = () => `
      <div class="${PFX}-ovbox ${PFX}-retro">
        <div style="font-size:54px">📟</div>
        <div class="display" style="font-size:24px">Добро пожаловать в 2007</div>
        <p>Ты сидишь без интернета. Можно смотреть в окно, перечитывать SMS и ставить полифонический рингтон. ${Vibe.esc(HEAVY_NAMES[name] || "Этот экран")} подождёт.</p>
        <div class="${PFX}-snake">▓▓▓▓▓▒ · 🍎</div>
        <button class="btn block" data-ovback>← Вернуться в 2026</button>
        <div class="fine">Статус в аське: «нет в сети». Аськи тоже нет.</div>
      </div>`;
    overlay.innerHTML = `
      <div class="${PFX}-ovbox">
        <div class="${PFX}-dino">🦖</div>
        <div class="display" style="font-size:30px">Нет интернета</div>
        <p><b>${Vibe.esc(HEAVY_NAMES[name] || "Экран")}</b> не загрузился. Гигабайты закончились, а тревога — нет.</p>
        <div class="stack">
          <button class="btn lime block" data-ovbuy>⚡ Докупить 1 ГБ за ${Vibe.rub(149)}</button>
          <button class="btn pink block" data-ovunlim>♾️ Подключить безлимит</button>
          <button class="btn block" data-ov2007>📟 Сидеть без интернета (как в 2007)</button>
          <button class="btn black block" data-ovback>← Назад</button>
        </div>
        <div class="fine">Связь — это забота. Забота — от ${Vibe.rub(149)}.</div>
      </div>`;
    stack.appendChild(overlay);
    FX.sound.pop();
    overlay.addEventListener("click", (e) => {
      if (e.target.closest("[data-ovback]")) { FX.sound.pop(); Vibe.back(); return; }
      const b = e.target.closest("[data-ovbuy]");
      if (b) {
        if (!Vibe.pay(149, { title: "Vibe Телеком · +1 ГБ", emoji: "📶", col: "c-sky", from: b })) return;
        save({ mb: tel().mb + GB });
        FX.burst(FX.pt ? FX.pt(b) : { x: innerWidth / 2, y: innerHeight / 2 }, { emojis: ["📶", "⚡", "🌐"], count: 14 });
        FX.toast("+1 ГБ! Рилсы снова любят тебя", "📶", 2200);
        FX.sound.success();
        hideOverlay();
        refreshScreen();
        return;
      }
      if (e.target.closest("[data-ovunlim]")) { hideOverlay(); Vibe.go("telecom", { pick: "unlim" }); return; }
      if (e.target.closest("[data-ov2007]")) {
        save({ y2007: (tel().y2007 || 0) + 1 });
        overlay.innerHTML = draw2007();
        FX.bump(overlay.firstElementChild);
        if ((tel().y2007 || 0) === 1) Vibe.reward({ xp: 15, silent: true });
        FX.toast("Режим 2007: настроение «эмо», рингтон «полифония»", "📟", 2400);
      }
    });
  }

  /* ---------- Роутинг: каждый экран ест трафик ---------- */
  window.addEventListener("hashchange", () => {
    hideOverlay();
    if (!ready()) return;
    const name = (location.hash.replace(/^#\/?/, "").split("?")[0]) || "home";
    if (name === "telecom") return;
    ovT.push(setTimeout(() => {
      if (BLOCK.includes(name) && !hasData()) { showOverlay(name); return; }
      const h = HEAVY[name];
      use(h ? h[0] : 3 + Math.random() * 5, h ? HEAVY_NAMES[name] : "Сам Vibe");
      if (h && roaming() && !tel().esimTravel && Math.random() < 0.5) {
        const J = ["Роуминг: этот рилс стоил как обед в аэропорту", "В роуминге мегабайты весят ×2. Гравитация другая", "Ты за границей, а Vibegram — нет. Он всегда с тобой"];
        FX.toast(J[Math.floor(Math.random() * J.length)], "🌍", 2600);
      }
    }, 80));
  });

  // Звонки, сообщения, посты (если другие модули их эмитят)
  if (Vibe.on) {
    const msg = () => { if (!ready()) return; if (hasData()) use(0.4, "Мессенджер"); else if (tel().sms > 0) { save({ sms: tel().sms - 1 }); } };
    Vibe.on("msg", msg); Vibe.on("message", msg);
    Vibe.on("post", () => ready() && use(15, "Vibegram"));
    Vibe.on("call", (d) => { if (!ready()) return; const m = (d && d.min) || 5; if (plan().min !== Infinity) save({ min: Math.max(0, tel().min - m) }); });
    // Поездка за границу → роуминг
    Vibe.on("attend", (e) => {
      if (!ready() || !e || e.kind !== "travel") return;
      save({ roam: G().day + 6, esimTravel: false });
      setTimeout(() => FX.toast("Добро пожаловать в роуминг! Твои гигабайты тоже в отпуске — но платят по двойному тарифу", "🌍", 3600), 1500);
    });
  }
  const iv = setInterval(tick, 5000);
  window.addEventListener("pagehide", () => clearInterval(iv));

  /* ---------- API ---------- */
  Vibe.telecom = { dataLeft, use, hasData, plan: () => plan().id, state: () => tel(), roaming };

  /* ---------- Стили ---------- */
  const css = document.createElement("style");
  css.textContent = `
  .${PFX}-ov { position:absolute; inset:0; z-index:45; background:rgba(255,251,239,.86); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:grid; place-items:center; padding:20px 16px; animation:fade-in .25s ease both; }
  .${PFX}-ovbox { width:100%; max-width:380px; background:var(--paper); border:var(--line); border-radius:28px; box-shadow:var(--shadow); padding:22px 18px; text-align:center; animation:${PFX}-pop .45s var(--spring) both; }
  .${PFX}-ovbox p { font-weight:700; font-size:14px; margin:8px 0 14px; }
  .${PFX}-dino { font-size:64px; display:inline-block; animation:${PFX}-jump 1.1s var(--spring) infinite; }
  .${PFX}-retro { background:#c7d9a3; font-family:monospace; }
  .${PFX}-snake { font-family:monospace; font-size:20px; letter-spacing:2px; margin:0 0 14px; border:2px solid var(--ink); border-radius:10px; padding:8px; background:#9fb87a; }
  @keyframes ${PFX}-jump { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-18px) rotate(-6deg) } }
  @keyframes ${PFX}-pop { from { transform:scale(.8) translateY(20px); opacity:0 } }
  .${PFX}-sim { border:var(--line); border-radius:30px; box-shadow:var(--shadow); padding:18px; position:relative; overflow:hidden; background:var(--grad); color:#fff; }
  .${PFX}-sim .chip0 { width:48px; height:36px; border-radius:9px; border:2px solid var(--ink); background:linear-gradient(135deg,#ffe14d,#ffb547); box-shadow:var(--shadow-sm); }
  .${PFX}-sim .num { font-family:var(--font-display); font-size:20px; margin-top:12px; letter-spacing:.5px; }
  .${PFX}-sim .big { font-family:var(--font-display); font-size:46px; line-height:1; margin-top:10px; }
  .${PFX}-sim .row { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
  .${PFX}-sim .badge { background:#fff; color:var(--ink); }
  .${PFX}-sim .progress { margin-top:10px; }
  .${PFX}-sim .ant { position:absolute; right:14px; top:12px; font-size:44px; }
  .${PFX}-chart { display:flex; align-items:flex-end; gap:6px; height:130px; padding-top:18px; }
  .${PFX}-bar { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:4px; min-width:0; }
  .${PFX}-bar i { display:block; width:100%; border:2px solid var(--ink); border-radius:8px 8px 4px 4px; background:var(--sky); height:var(--h); min-height:4px; transform-origin:bottom; animation:${PFX}-grow .7s var(--spring) both; animation-delay:calc(var(--i,0) * 60ms); }
  .${PFX}-bar.today i { background:var(--pink); }
  .${PFX}-bar small { font-size:10px; font-weight:800; color:var(--muted); white-space:nowrap; }
  .${PFX}-bar b { font-size:10px; font-weight:900; white-space:nowrap; }
  @keyframes ${PFX}-grow { from { transform:scaleY(0) } }
  .${PFX}-plan { display:flex; gap:12px; align-items:center; width:100%; text-align:left; }
  .${PFX}-plan .pe { font-size:34px; width:44px; text-align:center; }
  .${PFX}-plan .pt { flex:1; min-width:0; }
  .${PFX}-plan .pt b { display:block; font-weight:900; font-size:16px; }
  .${PFX}-plan .pt small { display:block; font-weight:700; font-size:12px; }
  .${PFX}-plan .pp { font-family:var(--font-display); font-size:18px; white-space:nowrap; }
  .${PFX}-cur { outline:3px dashed var(--ink); outline-offset:3px; }
  .${PFX}-qr { width:150px; height:150px; margin:8px auto 12px; display:grid; grid-template-columns:repeat(10,1fr); border:var(--line); border-radius:14px; overflow:hidden; background:#fff; }
  .${PFX}-qr span { transition:background .2s; }
  .${PFX}-acts { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
  .${PFX}-acts button { padding:12px 6px; text-align:center; font-weight:800; font-size:12px; }
  .${PFX}-acts button div { font-size:28px; }
  `;
  document.head.appendChild(css);

  /* ---------- Экран ---------- */
  let liveRoot = null;
  function simHtml() {
    const t = tel(), p = plan();
    const left = dataLeft();
    const pct = p.unlim ? 100 : Math.round((Math.min(left, p.mb || GB) / (p.mb || PLANS.starter.mb)) * 100);
    const wifi = atHome() && !roaming();
    return `
      <div class="${PFX}-sim" data-sim>
        <div class="ant ${left > 0 ? "float" : "wobble"}">${left > 0 ? "📶" : "📵"}</div>
        <div class="chip0"></div>
        <div class="num">${t.num}</div>
        <div style="font-weight:800;font-size:13px;opacity:.95">${p.e} ${p.n}${t.esim ? " · eSIM" : " · пластик"}</div>
        <div class="big" data-left>${fmtMB(left)}</div>
        <div style="font-weight:800;font-size:12px">${p.unlim ? "безлимит на мемы (и не только)" : left > 0 ? "осталось интернета" : "интернет закончился 🫠"}</div>
        <div class="progress"><i style="--p:${pct}%;background:${pct < 15 ? "var(--coral)" : "var(--lime)"}"></i></div>
        <div class="row">
          <span class="badge">📞 ${fmtMin(p.min === Infinity ? Infinity : t.min)} мин</span>
          <span class="badge">✉️ ${t.sms} SMS</span>
          ${wifi ? `<span class="badge">🏠 Wi-Fi соседа ×0,3</span>` : ""}
          ${roaming() ? `<span class="badge" style="background:var(--yellow)">🌍 Роуминг${t.esimTravel ? " · eSIM" : " ×2"}</span>` : ""}
        </div>
      </div>`;
  }
  function chartHtml() {
    const t = tel();
    const day = G().day;
    const days = [];
    for (let d = day - 6; d <= day; d++) days.push({ d, mb: (t.used || {})[d] || 0 });
    const max = Math.max(50, ...days.map((x) => x.mb));
    const total = days.reduce((s, x) => s + x.mb, 0);
    const by = Object.entries(t.by || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const byMax = by.length ? by[0][1] : 1;
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><b>За 7 дней</b><span class="badge c-yellow">${fmtMB(total)}</span></div>
        <div class="${PFX}-chart">${days.map((x, i) => `<div class="${PFX}-bar${x.d === day ? " today" : ""}" style="--i:${i}"><b>${x.mb ? fmtMB(x.mb).replace(" ", "") : ""}</b><i style="--h:${Math.round((x.mb / max) * 80)}%"></i><small>${x.d === day ? "сегодня" : "д." + (x.d + 1)}</small></div>`).join("")}</div>
        ${by.length ? `<h2 class="sec" style="font-size:16px;margin-top:14px">Куда утекли гигабайты</h2>
          <div class="stack" style="gap:8px">${by.map(([k, v]) => `<div><div style="display:flex;justify-content:space-between;font-weight:800;font-size:13px"><span>${Vibe.esc(k)}</span><span>${fmtMB(v)}</span></div><div class="progress" style="height:10px"><i style="--p:${Math.round((v / byMax) * 100)}%;background:var(--pink)"></i></div></div>`).join("")}</div>` : `<p class="muted" style="font-weight:700;font-size:13px;margin-top:8px">Пока ничего не потрачено. Подозрительно.</p>`}
      </div>`;
  }
  function plansHtml(pick) {
    const cur = tel().plan;
    return ORDER.map((id) => {
      const p = PLANS[id];
      const price = p.plus ? (S().plus ? "в Плюсе" : "только с Плюсом") : `${Vibe.rub(p.price)}/мес`;
      const feats = p.unlim ? "∞ ГБ" : p.mb ? fmtMB(p.mb) : "0 ГБ";
      return `<button class="card tap ${p.col} ${PFX}-plan${id === cur ? ` ${PFX}-cur` : ""}${id === pick ? " jelly" : ""}" data-plan="${id}">
        <span class="pe">${p.e}</span>
        <span class="pt"><b>${p.n}${id === cur ? " ✓" : ""}</b><small>${feats} · ${fmtMin(p.min)} мин · ${p.sms} SMS</small><small style="opacity:.75">${p.d}</small></span>
        <span class="pp">${price}</span>
      </button>`;
    }).join("");
  }
  function refreshScreen() {
    if (!liveRoot || !liveRoot.isConnected) return;
    const sim = liveRoot.querySelector("[data-simwrap]");
    const ch = liveRoot.querySelector("[data-chart]");
    if (sim) sim.innerHTML = simHtml();
    if (ch) ch.innerHTML = chartHtml();
  }

  Vibe.screen("telecom", {
    render(params) {
      if (!ready()) return `${Vibe.ui.head("Vibe Телеком")}<div class="card">Сначала зарегистрируйся. Связь — это для своих.</div>`;
      tel();
      const t = tel();
      return `
        ${Vibe.ui.head("Vibe Телеком", "связь, которая держит", Vibe.ui.vibikiPill())}
        <div data-simwrap>${simHtml()}</div>
        <div class="${PFX}-acts stagger" style="margin-top:14px">
          <button class="card tap c-lime" data-buy><div>⚡</div>+1 ГБ<br>${Vibe.rub(149)}</button>
          <button class="card tap c-yellow" data-callmom><div>📞</div>Позвонить<br>маме</button>
          <button class="card tap c-coral" data-gift><div>🎁</div>Передать 1 ГБ<br>маме</button>
        </div>
        ${Vibe.ui.marquee(["ГИГАБАЙТЫ — ЭТО ЗАБОТА", "СВЯЗЬ БЕЗ ГРАНИЦ*", "МЫ ВСЕГДА НА СВЯЗИ", "*ГРАНИЦЫ ЕСТЬ"])}
        <h2 class="sec">Расход по дням <small>МБ</small></h2>
        <div data-chart>${chartHtml()}</div>
        <h2 class="sec">Тарифы <small>выбирай с любовью</small></h2>
        <div class="stack stagger" data-plans>${plansHtml(params.pick)}</div>
        <h2 class="sec">eSIM <small>SIM-карта, которой нет</small></h2>
        <div class="card ${t.esim ? "c-mint" : "c-white"}" style="display:flex;gap:12px;align-items:center">
          <span style="font-size:40px" class="${t.esim ? "float" : ""}">${t.esim ? "✨" : "💳"}</span>
          <div style="flex:1;font-weight:800;font-size:14px">${t.esim ? "Ты на eSIM. Пластик ушёл на переработку, а связь — в облако." : "Перейди на eSIM: та же связь, но теперь её нельзя потрогать."}
            ${roaming() && !t.esimTravel ? `<div class="muted" style="font-size:12px">Ты в роуминге: Travel eSIM уберёт ×2</div>` : ""}</div>
          ${t.esim ? (roaming() && !t.esimTravel ? `<button class="btn sm yellow" data-travel>3 ГБ · ${Vibe.rub(290)}</button>` : "") : `<button class="btn sm black" data-esim>Перейти</button>`}
        </div>
        <div class="card tight" style="margin-top:12px;display:flex;gap:10px;align-items:center">
          ${Vibe.zabotik ? Vibe.zabotik(44, "happy") : "🤖"}
          <div style="flex:1;font-weight:700;font-size:13px">Вайбот: «${Vibe.esc(hasData() ? (atHome() ? "Дома Wi-Fi соседа. Он не знает, но он делится. Это и есть семья 🫶" : "Видео ест в 10 раз больше чатов. Просто факт. Без осуждения. Почти.") : "Без интернета ты свободен. Тревожно свободен.")}»</div>
        </div>
        <div class="fine">Номер ${t.num} закреплён за тобой пожизненно и ещё 5 лет после. Строка «Связь и интернет» (${Vibe.rub(590)} 5-го числа) — отдельная плата за доступ к праву оплачивать тариф. Тариф Vibe Телеком списывается как подписка «Связь · …». Мы одна семья, а в семье не считают.</div>`;
    },
    mount(root, params) {
      if (!ready()) return null;
      liveRoot = root;
      const timers = [];
      if (params.pick) timers.push(setTimeout(() => { const el = root.querySelector(`[data-plan="${params.pick}"]`); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); FX.bump(el); } }, 450));

      const openPlan = (id) => {
        const p = PLANS[id];
        const cur = tel().plan === id;
        Vibe.ui.sheet(`
          <div style="text-align:center"><div style="font-size:60px" class="float">${p.e}</div><div class="display" style="font-size:28px">${p.n}</div></div>
          <div class="card ${p.col}" style="margin:14px 0">
            <div class="li"><div class="ic c-white">🌐</div><div class="tx"><b>${p.unlim ? "Безлимит" : fmtMB(p.mb || 0)}</b><small>интернет в месяц</small></div></div>
            <div class="li"><div class="ic c-white">📞</div><div class="tx"><b>${fmtMin(p.min)} минут</b><small>на «удобно говорить?»</small></div></div>
            <div class="li"><div class="ic c-white">✉️</div><div class="tx"><b>${p.sms} SMS</b><small>для кодов подтверждения</small></div></div>
          </div>
          <p style="font-weight:700;font-size:14px;margin-bottom:12px">${p.d}</p>
          ${cur ? `<button class="btn block" data-close>Это уже твой тариф 💜</button>` :
            p.plus && !S().plus ? `<button class="btn grad xl block" data-toplus>Оформить «Плюс Вайб» 💎</button>` :
            `<button class="btn black xl block" data-switch>${p.price ? `Подключить за ${Vibe.rub(p.price)}` : "Подключить"} <span class="arrow">→</span></button>`}
          <div class="fine">${p.fine} Остатки текущего пакета сгорают при смене тарифа — их бережно забирает семья.</div>`, {
          onMount(sh, close) {
            const tp = sh.querySelector("[data-toplus]");
            if (tp) tp.addEventListener("click", () => { close(); Vibe.go("plus"); });
            const sw = sh.querySelector("[data-switch]");
            if (sw) sw.addEventListener("click", (e) => {
              if (p.price && !Vibe.pay(p.price, { title: `Vibe Телеком · ${p.n}`, emoji: "📶", col: "c-sky", from: e.currentTarget })) return;
              activate(id, { paid: !!p.price });
              close();
              FX.confetti();
              FX.sound.success();
              FX.toast(`«${p.n}» подключён! Ты снова на связи`, p.e, 2600);
              const pl = root.querySelector("[data-plans]");
              if (pl) { pl.innerHTML = plansHtml(id); [...pl.children].forEach((c, i) => c.style.setProperty("--i", i)); }
              refreshScreen();
              const sim = root.querySelector("[data-sim]"); if (sim) FX.bump(sim);
            });
          },
        });
      };

      const onClick = (e) => {
        const pl = e.target.closest("[data-plan]");
        if (pl) { FX.bump(pl); openPlan(pl.dataset.plan); return; }
        const buy = e.target.closest("[data-buy]");
        if (buy) {
          if (isUnlim()) { FX.toast("У тебя безлимит. Купить больше бесконечности нельзя. Пока", "♾️"); FX.shake(buy); return; }
          if (!Vibe.pay(149, { title: "Vibe Телеком · +1 ГБ", emoji: "📶", col: "c-sky", from: buy })) return;
          save({ mb: tel().mb + GB });
          FX.burst(FX.pt(buy), { emojis: ["📶", "⚡", "🌐"], count: 14 });
          FX.toast("+1 ГБ прилетел", "📶");
          FX.sound.success();
          refreshScreen();
          return;
        }
        const cm = e.target.closest("[data-callmom]");
        if (cm) {
          const t = tel(), p = plan(), cost = 12;
          if (p.min !== Infinity && t.min < cost) { FX.shake(cm); FX.toast("Минуты кончились. Мама перезвонит сама (за свой счёт)", "📵", 2600); return; }
          if (p.min !== Infinity) save({ min: t.min - cost });
          FX.bump(cm);
          FX.sound.pop();
          const first = t.momDay !== G().day;
          if (first) {
            save({ momDay: G().day });
            if (Vibe.people && Vibe.people.rel) Vibe.people.rel("mom", +1);
            if (Vibe.body && Vibe.body.effect) Vibe.body.effect("mom");
            Vibe.reward({ xp: 10, silent: true });
          }
          Vibe.emit("call", { to: "mom", min: 0 });
          const L = ["«Ты поел?» — 12 минут про суп", "«Шапку надел?» — обсуждали 12 минут", "Мама рассказала про соседку. 12 минут ты молчал, и это было хорошо", "«Когда приедешь?» — ответа не нашлось"];
          FX.toast(L[Math.floor(Math.random() * L.length)], "👩", 3000);
          FX.burst(FX.pt(cm), { emojis: ["❤️", "📞", "👩"], count: 10 });
          refreshScreen();
          return;
        }
        const gift = e.target.closest("[data-gift]");
        if (gift) {
          const t = tel();
          if (t.giftDay === G().day) { FX.shake(gift); FX.toast("Сегодня мама уже получила гигабайт. Она пока не поняла, что это", "👩"); return; }
          if (!isUnlim() && t.mb < GB) { FX.shake(gift); FX.toast("Тебе самому не хватает. Мама бы поняла (и прислала бы денег)", "🫠", 2600); return; }
          save({ mb: isUnlim() ? t.mb : t.mb - GB, giftDay: G().day });
          if (Vibe.people && Vibe.people.rel) Vibe.people.rel("mom", +3);
          if (Vibe.msg && Vibe.msg.send) { try { Vibe.msg.send("mom", "Сынок, пришло SMS «вам подарили 1 ГБ». Это опасно? Я на всякий случай не трогаю ❤️", { from: "mom" }); } catch (err) {} }
          Vibe.emit("gift", { to: "mom", item: "1 ГБ" });
          FX.confetti();
          FX.sound.success();
          FX.burst(FX.pt(gift), { emojis: ["🎁", "👩", "❤️", "📶"], count: 16 });
          FX.toast("Мама получила 1 ГБ. Отношения +3 ❤️", "🎁", 2600);
          refreshScreen();
          return;
        }
        const es = e.target.closest("[data-esim]");
        if (es) {
          Vibe.ui.modal(`
            <div class="display" style="font-size:24px">Сканируй QR</div>
            <div class="${PFX}-qr" data-qr>${Array.from({ length: 100 }, () => `<span style="background:${Math.random() < 0.5 ? "var(--ink)" : "#fff"}"></span>`).join("")}</div>
            <p data-qrtxt>Переносим твою личность в облако…</p>
            <div class="fine">Старая SIM будет утилизирована с почестями.</div>`, {
            sound: "pop",
            onMount(m, close) {
              const cells = [...m.querySelectorAll("[data-qr] span")];
              let n = 0;
              const iv = setInterval(() => { cells.forEach((c) => (c.style.background = Math.random() < 0.5 ? "var(--ink)" : "#fff")); if (++n > 6) { clearInterval(iv); m.querySelector("[data-qrtxt]").textContent = "Готово! Ты теперь eSIM-человек ✨"; } }, 300);
              timers.push(setTimeout(() => { clearInterval(iv); close(); }, 2900));
              const cl = new MutationObserver(() => { if (!m.isConnected) { clearInterval(iv); cl.disconnect(); } });
              cl.observe(document.body, { childList: true });
            },
          });
          timers.push(setTimeout(() => {
            if (!tel().esim) { save({ esim: true }); Vibe.reward({ vibiki: 0, xp: 15, silent: true }); }
            FX.confetti();
            FX.toast("eSIM активирована. Пластик плачет в ящике", "✨", 2600);
            if (root.isConnected) Vibe.replace("telecom");
          }, 3000));
          return;
        }
        const tr = e.target.closest("[data-travel]");
        if (tr) {
          if (!Vibe.pay(290, { title: "Vibe Телеком · Travel eSIM", emoji: "🌍", col: "c-sky", from: tr })) return;
          save({ esimTravel: true, mb: isUnlim() ? tel().mb : tel().mb + 3 * GB });
          FX.confetti();
          FX.toast("Travel eSIM: +3 ГБ и никакого ×2. Мир снова маленький", "🌍", 2600);
          Vibe.replace("telecom");
        }
      };
      root.addEventListener("click", onClick);
      return () => { timers.forEach(clearTimeout); root.removeEventListener("click", onClick); if (liveRoot === root) liveRoot = null; };
    },
  });
})();
