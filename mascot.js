/* ============================================================
   Вайбот — маскот-ассистент: лаймовый робот-капля с антенной.
   Глаза следят за пальцем, иногда моргает.
   Vibe.zabotik(size, mood) → SVG-строка. mood: smile | wow | sly.
   Рисунок вписан в квадрат 100×100 с центром масс в (50, 52),
   поэтому ровно садится в круглую аватарку.
   ============================================================ */
(function () {
  const INK = "#1b1430";
  const S = `stroke="${INK}" stroke-linejoin="round" stroke-linecap="round"`;

  Vibe.zabotik = function (size = 64, mood = "smile") {
    if (!/^(smile|wow|sly)$/.test(mood)) mood = "smile";
    const eyeR = mood === "wow" ? 7 : 6;
    const mouth = {
      smile: `<path d="M42 64 Q50 70.5 58 64" stroke="#c6ff4d" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
      wow: `<ellipse cx="50" cy="65.5" rx="3.6" ry="4.4" fill="#c6ff4d"/>`,
      sly: `<path d="M42 65.5 Q51 68.5 58.5 61.5" stroke="#c6ff4d" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
    }[mood];
    // Хитрый прищур: веко-полоска поверх правого глаза
    const lid = mood === "sly" ? `<path d="M51 42 H69 V50 Q60 46.5 51 51.5 Z" fill="${INK}"/><path d="M53 43.5 Q60 41 67 44" stroke="#7cf5c8" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : "";
    return `
    <svg class="zabotik zb-${mood}" viewBox="0 0 100 100" width="${size}" height="${size}" style="width:${size}px;height:${size}px" aria-hidden="true">
      <line x1="50" y1="22" x2="50" y2="12" ${S} stroke-width="3.5"/>
      <circle cx="50" cy="10" r="6" fill="#ff6bcb" ${S} stroke-width="3"/>
      <circle cx="48" cy="8.4" r="1.7" fill="#fff"/>
      <rect x="11" y="49" width="9" height="16" rx="4.5" fill="#8b5cff" ${S} stroke-width="3"/>
      <rect x="80" y="49" width="9" height="16" rx="4.5" fill="#8b5cff" ${S} stroke-width="3"/>
      <path d="M50 20 C67 20 82 36 82 57 C82 77 68 90 50 90 C32 90 18 77 18 57 C18 36 33 20 50 20 Z" fill="#c6ff4d" ${S} stroke-width="3.8"/>
      <path d="M29 40 Q34 30 44 26.5" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".95"/>
      <rect x="27" y="39" width="46" height="34" rx="16" fill="${INK}"/>
      <circle class="eye" cx="40" cy="52" r="${eyeR}" fill="#7cf5c8"/>
      <circle class="eye" cx="60" cy="52" r="${eyeR}" fill="#7cf5c8"/>
      <circle class="eye-g" cx="42" cy="50" r="1.8" fill="#fff"/>
      <circle class="eye-g" cx="62" cy="50" r="1.8" fill="#fff"/>
      ${lid}
      ${mouth}
      <ellipse cx="25.5" cy="77" rx="4.5" ry="3" fill="#ff6bcb" opacity=".75"/>
      <ellipse cx="74.5" cy="77" rx="4.5" ry="3" fill="#ff6bcb" opacity=".75"/>
      <circle cx="50" cy="82" r="3" fill="#ffd23f" ${S} stroke-width="2"/>
    </svg>`;
  };

  // Глаза (и блики в них) следят за касанием
  let last = 0;
  document.addEventListener("pointermove", (e) => track(e.clientX, e.clientY), { passive: true });
  document.addEventListener("pointerdown", (e) => track(e.clientX, e.clientY), { passive: true });
  function track(x, y) {
    const now = performance.now();
    if (now - last < 30) return;
    last = now;
    document.querySelectorAll(".zabotik").forEach((svg) => {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.52;
      // Смещение в единицах viewBox (до 3.5 из 100), переводим в пиксели рисунка
      const k = r.width / 100;
      const a = Math.atan2(y - cy, x - cx), d = Math.min(3.5, Math.hypot(x - cx, y - cy) / 30) * k;
      const tf = `translate(${(Math.cos(a) * d).toFixed(2)}px, ${(Math.sin(a) * d).toFixed(2)}px)`;
      svg.querySelectorAll(".eye, .eye-g").forEach((eye) => (eye.style.transform = tf));
    });
  }
  // Моргание: глаз сжимается по вертикали (через радиус — так работает и в Safari)
  setInterval(() => {
    if (document.hidden) return;
    document.querySelectorAll(".zabotik .eye").forEach((eye) => {
      const r = +eye.getAttribute("r") || 6;
      try { eye.animate([{ r: r + "px" }, { r: "1px" }, { r: r + "px" }], { duration: 220 }); } catch (e) {}
    });
  }, 3800);

  // Базовый стиль: размер берётся из inline-style, а не из общего правила .zabotik
  const st = document.createElement("style");
  st.textContent = `.zabotik{display:inline-block;vertical-align:middle;overflow:visible}.zabotik .eye,.zabotik .eye-g{transition:transform .15s}`;
  document.head.appendChild(st);
})();
