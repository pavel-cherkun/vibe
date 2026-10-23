/* ============================================================
   Экран «skills» — RPG-лист персонажа: аватар, уровень, 8 навыков,
   дерево перков (выбор), подсказки «как прокачать», статы.
   Данные — Vibe.skills (skills.js).
   ============================================================ */
(function () {
  const S = () => Vibe.state.get();
  const SK = () => Vibe.skills;
  const esc = (s) => Vibe.esc(s);
  const scr = (k) => (k === "gram" ? (Vibe.screens.gram ? "gram" : Vibe.screens.vibegram ? "vibegram" : "gram") : k);
  const pct = (p) => Math.round(Math.max(0, Math.min(1, p)) * 100) + "%";

  function stats() {
    const s = S();
    const out = [
      ["🧥", "Внешность", Vibe.inv ? Vibe.inv.look() + "%" : "—", "c-violet"],
      ["💝", "Репутация", String(s.pp_rep || 0), "c-pink"],
    ];
    if (Vibe.gram && Vibe.gram.fame) out.push(["⭐", "Слава", Math.round(Vibe.gram.fame()) + "/100", "c-yellow"]);
    if (Vibe.gram && Vibe.gram.followers) out.push(["👥", "Подписчики", Vibe.fmt(Vibe.gram.followers()), "c-mint"]);
    return out;
  }

  function perkChip(sk, tier, p, st) {
    const cls = st === "on" ? "on" : st === "open" ? "open" : st === "off" ? "off" : "lock";
    return `<button class="skt-perk ${cls}" data-perkinfo="${sk}" title="${esc(p.n)}"><span class="emo">${st === "lock" ? "🔒" : p.e}</span><small>${esc(p.n)}</small></button>`;
  }
  function perkState(sk, tier, p) {
    const chosen = (S().perks || {})[sk + tier];
    if (chosen) return chosen === p.id ? "on" : "off";
    return SK().level(sk) >= tier ? "open" : "lock";
  }

  function body() {
    const s = S();
    const all = SK().all();
    const top = SK().top();
    const total = SK().total();
    const need = Vibe.need(s.level);
    const av = SK().available();
    const ava = (s.profile && s.profile.avatar) || "😎";
    const cls = top && top.xp > 0 ? top.cls : "Безклассовый стажёр";
    return `
      <div class="skt-hero c-grad">
        <div class="skt-ava"><span class="emo float">${ava}</span><b data-level>${s.level}</b></div>
        <div style="flex:1;min-width:0">
          <div class="display" style="font-size:24px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.name || "Игрок")}</div>
          <div class="skt-class">${top && top.xp > 0 ? top.e : "🥚"} ${esc(cls)}</div>
          <div class="progress" style="margin:8px 0 3px;background:rgba(255,255,255,.4)"><i data-xpbar style="--p:${Math.round((s.xp / need) * 100)}%"></i></div>
          <div style="font-size:11px;font-weight:800;color:#fff">Ур. ${s.level} · ${s.xp}/${need} XP · сила навыков ${total}/80</div>
        </div>
      </div>

      <div class="skt-stats stagger">${stats().map(([e, t, v, c]) => `<div class="skt-stat ${c}"><span class="emo">${e}</span><b>${esc(v)}</b><small>${t}</small></div>`).join("")}</div>

      ${av.length ? `<button class="skt-avail tap" data-scrollperks><span class="emo wobble">🌟</span><div style="flex:1;text-align:left"><b>Доступно перков: ${av.length}</b><small>Выбери, пока корпорация не передумала</small></div><span class="arrow">→</span></button>` : ""}

      <h2 class="sec">Навыки <small>тапни — как прокачать</small></h2>
      <div class="skt-list stagger">
        ${all.map((k) => `
          <button class="skt-sk tap" data-sk="${k.id}">
            <div class="skt-ic ${k.col}"><span class="emo">${k.e}</span></div>
            <div class="skt-mid">
              <div class="skt-row"><b>${k.n}</b><span class="skt-lvl ${k.level >= 10 ? "max" : ""}">${k.level >= 10 ? "MAX" : "ур. " + k.level}</span></div>
              <div class="skt-bar"><i class="${k.col}" style="width:${pct(k.p)}"></i>${[5, 10].map((t) => `<em style="left:${t === 5 ? "44.4%" : "100%"}" class="${k.level >= t ? "got" : ""}">★</em>`).join("")}</div>
              <small>${k.max ? `${Vibe.fmt(k.xp)} XP · легенда` : `${Vibe.fmt(k.xp - k.from)} / ${Vibe.fmt(k.to - k.from)} XP · до ур. ${k.level + 1}`}</small>
            </div>
          </button>`).join("")}
      </div>

      <h2 class="sec" data-perks>Дерево перков <small>5 и 10 уровни · 1 из 2</small></h2>
      <div class="card skt-tree">
        <div class="skt-trow skt-thead"><span></span><b>Ур. 5</b><b>Ур. 10</b></div>
        ${SK().SKILLS.map((k) => `
          <div class="skt-trow">
            <span class="skt-tic ${k.col}">${k.e}</span>
            ${[5, 10].map((t) => `<div class="skt-tpair">${SK().PERKS[k.id][t].map((p) => perkChip(k.id, t, p, perkState(k.id, t, p))).join("")}</div>`).join("")}
          </div>`).join("")}
      </div>

      ${Vibe.zabotik ? `<div class="card flat tight" style="display:flex;gap:10px;align-items:center;margin-top:14px">${Vibe.zabotik(54, "smile")}<div style="font-weight:800;font-size:13px">Вайбот: «Прокачка — это забота о себе. А забота о себе — это ${av.length ? "выбрать перк прямо сейчас" : "ещё один курс в Vibe Learn"} 💜»</div></div>` : ""}
      <div class="fine">Уровни навыков не влияют на кредитный рейтинг. Пока. Опыт сверх дневной нормы (450 XP на навык) уходит в фонд развития корпорации.</div>
      <div style="height:30px"></div>`;
  }

  function sheet(id) {
    const k = SK().info(id);
    const tiers = [5, 10].map((t) => {
      const chosen = (S().perks || {})[id + t];
      const open = k.level >= t && !chosen;
      return `
        <div class="skt-tier ${open ? "open" : ""}">
          <div class="skt-tier-h"><b>Уровень ${t}</b>${chosen ? `<span class="badge" style="background:var(--lime)">✅ выбрано</span>` : open ? `<span class="badge" style="background:var(--yellow)">🌟 выбери!</span>` : `<span class="badge">🔒 ещё ${Vibe.fmt(Math.max(0, SK().CURVE[t - 1] - k.xp))} XP</span>`}</div>
          <div class="skx-perkpick">${SK().PERKS[id][t].map((p) => `<button class="skx-pp ${chosen && chosen !== p.id ? "skt-dim" : ""} ${chosen === p.id ? "skt-on" : ""}" ${open ? `data-choose="${t}:${p.id}"` : "disabled"}><span class="emo">${chosen === p.id ? p.e : k.level >= t ? p.e : "🔒"}</span><b>${esc(p.n)}</b><small>${esc(p.d)}</small></button>`).join("")}</div>
        </div>`;
    }).join("");
    Vibe.ui.sheet(`
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">
        <div class="skt-ic big ${k.col}"><span class="emo float">${k.e}</span></div>
        <div style="flex:1">
          <div class="display" style="font-size:26px">${k.n}</div>
          <div style="font-weight:800" class="muted">${k.max ? "Максимальный уровень 👑" : `Уровень ${k.level} · ещё ${Vibe.fmt(k.left)} XP`}</div>
          <div class="skt-bar" style="margin-top:6px"><i class="${k.col}" style="width:${pct(k.p)}"></i></div>
        </div>
      </div>
      <div class="card tight c-yellow" style="margin-bottom:12px"><b>🗺️ Как прокачать</b><div style="font-weight:700;font-size:13px;margin:4px 0 10px">${esc(k.hint)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${k.go.map(([g, t]) => `<button class="btn sm black" data-close data-go="${scr(g)}">${t} →</button>`).join("")}</div>
      </div>
      ${tiers}
      <div class="fine">Класс «${esc(k.cls)}» присваивается за самый прокачанный навык. Выбор перка окончательный — как подпись мелким шрифтом.</div>
    `, {
      onMount(sh, close) {
        sh.addEventListener("click", (e) => {
          const b = e.target.closest("[data-choose]");
          if (!b) return;
          const [t, pid] = b.dataset.choose.split(":");
          if (SK().choose(id, +t, pid, b)) close();
        });
      },
    });
  }

  Vibe.screen("skills", {
    render() {
      return `
      ${Vibe.ui.head("Vibe Skills", "Лист персонажа", Vibe.ui.vibikiPill())}
      <div data-skt-body>${SK() ? body() : `<div class="card">Навыки загружаются…</div>`}</div>`;
    },
    mount(el) {
      if (!SK()) return null;
      const box = el.querySelector("[data-skt-body]");
      const redraw = () => {
        box.innerHTML = body();
        box.querySelectorAll(".stagger").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
        Vibe.refreshCounters();
      };
      const onClick = (e) => {
        const sk = e.target.closest("[data-sk]");
        if (sk) { FX.bump(sk.querySelector(".skt-ic")); sheet(sk.dataset.sk); return; }
        const pi = e.target.closest("[data-perkinfo]");
        if (pi) { FX.bump(pi); sheet(pi.dataset.perkinfo); return; }
        if (e.target.closest("[data-scrollperks]")) {
          const h = box.querySelector("[data-perks]");
          if (h) h.scrollIntoView({ behavior: "smooth", block: "start" });
          FX.sound.pop && FX.sound.pop();
        }
      };
      box.addEventListener("click", onClick);
      const offs = [Vibe.on("skill", redraw), Vibe.on("perk", redraw)];
      return () => { box.removeEventListener("click", onClick); offs.forEach((f) => f()); };
    },
  });

  const css = `
  .skt-hero{display:flex;gap:14px;align-items:center;border:2.5px solid var(--ink);border-radius:var(--r);box-shadow:var(--shadow);padding:16px;background:var(--grad)}
  .skt-ava{position:relative;flex:0 0 auto;width:84px;height:84px;border-radius:28px;background:#fff;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:48px;box-shadow:0 4px 0 var(--ink)}
  .skt-ava b{position:absolute;right:-8px;bottom:-8px;min-width:34px;height:34px;border-radius:999px;background:var(--lime);border:2.5px solid var(--ink);font-family:var(--font-display);font-size:16px;display:grid;place-items:center;padding:0 6px}
  .skt-class{display:inline-block;margin-top:4px;background:var(--ink);color:var(--lime);border-radius:999px;padding:3px 10px;font-weight:900;font-size:12px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .skt-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
  .skt-stat{border:2px solid var(--ink);border-radius:16px;padding:8px 4px;text-align:center;box-shadow:0 3px 0 var(--ink);min-width:0}
  .skt-stat .emo{font-size:20px;display:block}
  .skt-stat b{display:block;font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .skt-stat small{display:block;font-size:10px;font-weight:800;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .skt-stat.c-violet{color:#fff}
  .skt-avail{display:flex;gap:12px;align-items:center;width:100%;margin-top:14px;padding:12px 14px;border:2.5px solid var(--ink);border-radius:20px;background:var(--yellow);box-shadow:var(--shadow);font:inherit;animation:skt-pulse 1.6s ease-in-out infinite}
  .skt-avail .emo{font-size:30px}
  .skt-avail b{display:block;font-weight:900}
  .skt-avail small{font-size:12px;font-weight:700;color:var(--muted)}
  .skt-avail .arrow{width:30px;height:30px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center}
  .skt-list{display:grid;gap:10px}
  .skt-sk{display:flex;gap:12px;align-items:center;width:100%;text-align:left;padding:10px 12px;border:2.5px solid var(--ink);border-radius:20px;background:#fff;box-shadow:var(--shadow-sm);font:inherit}
  .skt-ic{flex:0 0 auto;width:50px;height:50px;border-radius:16px;border:2.5px solid var(--ink);display:grid;place-items:center;font-size:26px}
  .skt-ic.big{width:72px;height:72px;border-radius:22px;font-size:40px;box-shadow:0 4px 0 var(--ink)}
  .skt-mid{flex:1;min-width:0}
  .skt-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
  .skt-row b{font-weight:900;font-size:15px}
  .skt-lvl{font-family:var(--font-display);font-size:13px;background:var(--ink);color:#fff;border-radius:999px;padding:2px 9px}
  .skt-lvl.max{background:var(--holo);color:var(--ink);border:2px solid var(--ink)}
  .skt-bar{position:relative;height:14px;border:2px solid var(--ink);border-radius:999px;background:#f3f0e6;margin:6px 0 3px;overflow:visible}
  .skt-bar i{display:block;height:100%;border-radius:999px;border-right:2px solid var(--ink);transition:width .6s var(--spring);min-width:6px}
  .skt-bar em{position:absolute;top:50%;transform:translate(-50%,-50%);font-style:normal;font-size:13px;color:#bbb;text-shadow:0 0 2px #fff}
  .skt-bar em.got{color:#ffb800;text-shadow:0 0 0 var(--ink),1px 1px 0 var(--ink)}
  .skt-mid small{font-size:11px;font-weight:800;color:var(--muted)}
  .skt-tree{padding:8px 10px}
  .skt-trow{display:grid;grid-template-columns:38px 1fr 1fr;gap:6px;align-items:center;padding:6px 0;border-bottom:2px dashed rgba(14,14,18,.12)}
  .skt-trow:last-child{border-bottom:0}
  .skt-thead b{font-size:11px;font-weight:900;text-align:center;color:var(--muted)}
  .skt-tic{width:34px;height:34px;border-radius:12px;border:2px solid var(--ink);display:grid;place-items:center;font-size:18px}
  .skt-tpair{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  .skt-perk{border:2px solid var(--ink);border-radius:12px;background:#fff;padding:4px 2px;display:flex;flex-direction:column;align-items:center;gap:1px;font:inherit;min-width:0}
  .skt-perk .emo{font-size:18px}
  .skt-perk small{font-size:8.5px;font-weight:800;line-height:1.1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .skt-perk.lock{opacity:.4;background:#eee}
  .skt-perk.off{opacity:.35;filter:grayscale(1)}
  .skt-perk.on{background:var(--lime);box-shadow:0 2px 0 var(--ink);transform:scale(1.04)}
  .skt-perk.open{background:var(--yellow);animation:skt-pulse 1.4s ease-in-out infinite}
  .skt-tier{border:2.5px solid var(--ink);border-radius:20px;padding:10px;margin-bottom:10px;background:#fff}
  .skt-tier.open{background:#fffbe0;box-shadow:var(--shadow-sm)}
  .skt-tier-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .skx-pp[disabled]{opacity:.55}
  .skx-pp.skt-dim{opacity:.3;filter:grayscale(1)}
  .skx-pp.skt-on{opacity:1;transform:scale(1.03)}
  @keyframes skt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
