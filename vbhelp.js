/* ============================================================
   Вайбот везде: аватарка в шапке каждого экрана открывает лист-справку
   по этому экрану (база kb.js), а в моменты ручной жизни Вайбот
   сам предлагает «ускорить». История общая с чатом Вайбота.
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const esc = (s) => Vibe.esc(s == null ? "" : String(s));
  const SKIP = /^(welcome|onboarding|vaibot|locked|ending|chat|reels)$/;
  const live = () => !!(S().profile && S().game);

  /* ---------- Аватарка в шапке ---------- */
  const btnHtml = () => `<button class="vb-ava tap" data-vbask aria-label="Спросить Вайбота">${Vibe.zabotik(34, "smile")}</button>`;
  function decorate(sc) {
    if (!sc || !sc.dataset || SKIP.test(sc.dataset.screen || "") || sc.querySelector("[data-vbask]")) return;
    const head = sc.querySelector(".head");
    if (head) { head.insertAdjacentHTML("beforeend", btnHtml()); return; }
    // Экраны со своей шапкой: календарь, Vibegram, профиль
    const own = sc.querySelector(".cal-top, .vg-shell [data-top]");
    if (own) { own.insertAdjacentHTML("beforeend", btnHtml()); return; }
    // Главная и профиль: верхняя строка уже полная — аватарка садится в угол карточки
    const hero = sc.querySelector(".prof-hero, .hello");
    if (hero) { hero.insertAdjacentHTML("afterbegin", btnHtml().replace('class="vb-ava', 'class="vb-ava vb-abs')); }
  }
  let pend = 0;
  const scan = () => { pend = 0; if (!live()) return; document.querySelectorAll(".screen").forEach(decorate); };
  new MutationObserver(() => { if (!pend) pend = setTimeout(scan, 30); })
    .observe(document.getElementById("app") || document.body, { childList: true, subtree: true });

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-vbask]");
    if (!b) return;
    e.stopPropagation();
    FX.bump(b);
    const sc = b.closest(".screen");
    sheet(sc ? sc.dataset.screen : "home");
  }, true);

  /* ---------- Лист-справка ---------- */
  function sheet(screen) {
    if (!Vibe.vaibot) return;
    Vibe.vaibot.setCtx({ screen });
    const kb = Vibe.kb || { suggest: () => [], hello: () => "" };
    const qs = kb.suggest(screen);
    const hello = kb.hello(screen);
    Vibe.ui.sheet(`
      <div class="vb-sh-h">${Vibe.zabotik(44, "smile")}<div><b class="display" style="font-size:20px">Вайбот</b><small>Справка Корпорации · отвечаю за 0,3 секунды</small></div></div>
      <div class="vb-sh-log" data-vblog></div>
      ${qs.length ? `<div class="chips vb-sh-q">${qs.map((q) => `<button class="chip" data-vbq="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : ""}
      <form class="ab-form vb-sh-f" data-vbf><input data-vbin placeholder="Спроси что угодно об экосистеме…" autocomplete="off" maxlength="200"><button type="submit" aria-label="Отправить">➤</button></form>
      <button class="btn block ghost" data-vbfull style="margin-top:8px">Весь разговор с Вайботом →</button>`, {
      onMount(sh, close) {
        const logEl = sh.querySelector("[data-vblog]");
        let added = 0; // сколько реплик сказано в этом листе (история чата обрезается, поэтому считаем сами)
        const draw = () => {
          // В листе только то, что сказано сейчас: приветствие экрана и новые реплики
          const all = Vibe.vaibot.log();
          const fresh = added ? all.slice(-Math.min(added, 6)) : [];
          logEl.innerHTML = Vibe.vaibot.bubble({ r: "bot", t: hello }, -1)
            + fresh.map((m, k) => Vibe.vaibot.bubble(m, all.length - fresh.length + k)).join("");
          logEl.scrollTop = logEl.scrollHeight;
        };
        draw();
        let busy = false;
        const send = (text) => {
          text = String(text || "").trim().slice(0, 200);
          if (!text || busy) return;
          busy = true;
          Vibe.vaibot.setCtx({ screen });
          logEl.insertAdjacentHTML("beforeend", `<div class="ab-row me"><div class="msg out">${esc(text)}</div></div><div class="ab-row"><div class="ab-ava">${Vibe.zabotik(34, "wow")}</div><div class="msg in typing"><span></span><span></span><span></span></div></div>`);
          logEl.scrollTop = logEl.scrollHeight;
          setTimeout(() => {
            added += 2;
            Vibe.vaibot.askSmart(text).finally(() => { busy = false; if (sh.isConnected) draw(); });
          }, 650);
        };
        sh.querySelector("[data-vbf]").addEventListener("submit", (e) => { e.preventDefault(); const i = sh.querySelector("[data-vbin]"); const v = i.value; i.value = ""; send(v); });
        sh.addEventListener("click", (e) => {
          const q = e.target.closest("[data-vbq]");
          if (q) { FX.bump(q); send(q.dataset.vbq); return; }
          if (e.target.closest("[data-vbfull]")) { close(); setTimeout(() => Vibe.go("vaibot"), 250); return; }
          const a = e.target.closest("[data-ab]");
          if (a) {
            const [i, j] = a.dataset.ab.split(":").map(Number);
            const m = Vibe.vaibot.log()[i];
            if (m && m.a && m.a[j]) { close(); setTimeout(() => Vibe.vaibot.run(m.a[j]), 250); }
          }
        });
      },
    });
  }

  /* ---------- Вайбот приходит, когда ты живёшь вручную ---------- */
  const NUDGE_DAY_MAX = 3;
  let nudgeEl = null, nudgeTo = null;
  function hideNudge() { clearTimeout(nudgeTo); if (nudgeEl) { const el = nudgeEl; nudgeEl = null; el.classList.add("out"); setTimeout(() => el.remove(), 250); } }
  function nudge(kind, text, label, act) {
    if (!live() || (Vibe.busy && Vibe.busy()) || document.hidden) return;
    const day = Vibe.game.info().day;
    const st = Object.assign({ day: -1, n: 0, k: {} }, S().vbNudge || {});
    if (st.day !== day) { st.day = day; st.n = 0; st.k = {}; }
    if (st.n >= NUDGE_DAY_MAX || st.k[kind]) return;
    st.n++; st.k[kind] = 1;
    Vibe.state.set({ vbNudge: st });
    hideNudge();
    const el = document.createElement("div");
    el.className = "vb-nudge";
    el.innerHTML = `${Vibe.zabotik(30, "sly")}<div><p>${esc(text)}</p><div class="vb-n-a"><button class="btn sm black" data-vbn>${esc(label)}</button><button class="btn sm" data-vbx>Я сам${Vibe.g("", "а")}</button></div></div>`;
    (document.getElementById("app") || document.body).appendChild(el);
    nudgeEl = el;
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-vbn]")) { hideNudge(); act(); }
      else if (e.target.closest("[data-vbx]")) { hideNudge(); FX.toast("Понял. Я буду рядом. Всегда 💜", "🤖", 1800); }
    });
    nudgeTo = setTimeout(hideNudge, 8000);
  }

  // Пешая прогулка: Вайбот предлагает пересесть на такси
  Vibe.on && Vibe.on("trip", (e) => {
    const t = e && e.trip;
    if (!t || e.phase !== "start" || t.mode !== "walk" || !Vibe.trip) return;
    const eta = Math.round(Vibe.trip.eta(t));
    if (eta < 15) return;
    const min = Math.max(4, Math.round(eta / 4));
    const price = 120 + Math.round(eta * 6);
    setTimeout(() => nudge("walk", `Пешком ${eta} мин. На такси — ${min}. Сэкономлю тебе ${eta - min} минут жизни за ${Vibe.rub(price)}?`, "Ускорить 🚕", () => {
      const nt = Vibe.trip.boost({ mode: "taxi", kind: "taxi", minutes: min, price, emoji: "🚕", payTitle: "Vibe Taxi · пересадка по совету Вайбота" });
      if (nt && Vibe.intercept) Vibe.intercept.used("walk", eta - min);
    }), 1200);
  });
  // Готовка: Вайбот предлагает доставку
  Vibe.on && Vibe.on("manual", (e) => {
    if (!e || e.kind !== "cook") return;
    setTimeout(() => nudge("cook", "Готовить — 40 минут и посуда. Vibe Eat привезёт за 25, а посуду не придётся мыть никогда.", "Заказать 🍜", () => Vibe.go("eat")), 900);
  });

  /* ---------- Стили ---------- */
  const st = document.createElement("style");
  st.textContent = `
  .vb-ava{width:40px;height:40px;flex:0 0 40px;border-radius:50%;border:2px solid var(--ink,#0e0e12);background:#fff;display:grid;place-items:center;padding:0;margin-left:auto;box-shadow:var(--shadow-sm);overflow:hidden}
  .head .vb-ava,.cal-top .vb-ava{margin-left:0}
  .cal-top{gap:8px}
  .vg-shell [data-top] .vb-ava{width:34px;height:34px;flex-basis:34px;border-width:1.5px;box-shadow:none}
  .vg-shell [data-top] .vb-ava svg{width:28px;height:28px}
  .prof-hero,.hello{position:relative}
  .hello .display{padding-right:46px}
  .hello .vb-abs{top:10px;right:10px}
  .vb-ava.vb-abs{position:absolute;top:14px;right:14px;margin:0}
  .head .title{flex:1;min-width:0}
  .vb-ava svg{margin-top:4px}
  .vb-sh-h{display:flex;gap:12px;align-items:center;margin-bottom:10px}
  .vb-sh-h small{display:block;color:var(--muted,#6b6880);font-weight:700;font-size:12px}
  .vb-sh-log{max-height:42vh;overflow-y:auto;display:grid;gap:8px;padding:4px 0}
  .vb-sh-q{margin:10px 0 8px;flex-wrap:wrap}
  .vb-sh-f{margin-top:6px}
  .vb-nudge{position:fixed;top:calc(env(safe-area-inset-top,0px) + 64px);right:12px;left:12px;max-width:420px;margin-left:auto;z-index:60;display:flex;gap:10px;align-items:flex-start;background:#fff;border:2px solid var(--ink,#0e0e12);border-radius:20px;padding:12px;box-shadow:var(--shadow,0 6px 0 #0e0e12);animation:vbIn .3s cubic-bezier(.2,1.4,.4,1)}
  .vb-nudge p{margin:0 0 8px;font-weight:700;font-size:14px;line-height:1.3}
  .vb-n-a{display:flex;gap:8px}
  .vb-nudge.out{opacity:0;transform:translateY(-10px);transition:.25s}
  @keyframes vbIn{from{opacity:0;transform:translateY(-14px) scale(.96)}}`;
  document.head.appendChild(st);

  Vibe.vbhelp = { sheet, nudge, decorate };
})();
