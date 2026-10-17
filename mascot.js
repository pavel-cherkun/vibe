/* ============================================================
   Заботик — маскот-ассистент. Глаза следят за пальцем,
   иногда моргает. Vibe.zabotik(size, mood) → SVG-строка.
   ============================================================ */
(function () {
  Vibe.zabotik = function (size = 64, mood = "smile") {
    const mouth = {
      smile: `<path d="M38 66 Q50 78 62 66" stroke="#0e0e12" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      wow: `<ellipse cx="50" cy="70" rx="7" ry="9" fill="#0e0e12"/>`,
      sly: `<path d="M38 68 Q52 74 64 62" stroke="#0e0e12" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    }[mood] || "";
    return `
    <svg class="zabotik" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <defs><linearGradient id="zg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c6ff4d"/><stop offset="1" stop-color="#7cf5c8"/></linearGradient></defs>
      <line x1="50" y1="14" x2="50" y2="4" stroke="#0e0e12" stroke-width="4"/>
      <circle cx="50" cy="5" r="5" fill="#ff6bcb" stroke="#0e0e12" stroke-width="3"/>
      <path d="M18 46 C18 22 32 14 50 14 C68 14 82 22 82 46 C82 74 70 88 50 88 C30 88 18 74 18 46 Z" fill="url(#zg)" stroke="#0e0e12" stroke-width="4"/>
      <ellipse cx="28" cy="62" rx="6" ry="4" fill="#ff6bcb" opacity=".6"/><ellipse cx="72" cy="62" rx="6" ry="4" fill="#ff6bcb" opacity=".6"/>
      <g><circle cx="37" cy="44" r="11" fill="#fff" stroke="#0e0e12" stroke-width="3.5"/><circle class="eye" cx="37" cy="44" r="5" fill="#0e0e12"/></g>
      <g><circle cx="63" cy="44" r="11" fill="#fff" stroke="#0e0e12" stroke-width="3.5"/><circle class="eye" cx="63" cy="44" r="5" fill="#0e0e12"/></g>
      ${mouth}
    </svg>`;
  };

  // Глаза следят за касанием
  let last = 0;
  document.addEventListener("pointermove", (e) => track(e.clientX, e.clientY), { passive: true });
  document.addEventListener("pointerdown", (e) => track(e.clientX, e.clientY), { passive: true });
  function track(x, y) {
    const now = performance.now();
    if (now - last < 30) return;
    last = now;
    document.querySelectorAll(".zabotik").forEach((svg) => {
      const r = svg.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.44;
      const a = Math.atan2(y - cy, x - cx), d = Math.min(4, Math.hypot(x - cx, y - cy) / 30);
      svg.querySelectorAll(".eye").forEach((eye) => (eye.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`));
    });
  }
  // Моргание
  setInterval(() => {
    document.querySelectorAll(".zabotik .eye").forEach((eye) => {
      eye.animate([{ r: 5 }, { r: 1 }, { r: 5 }], { duration: 220 });
    });
  }, 3800);
})();
