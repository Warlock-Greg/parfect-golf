// === Parfect.golfr - coach.js (MVP global) ===
window.$ = window.$ || ((id) => document.getElementById(id));

// UI toast coach (grand, lisible, dismiss auto)
function showCoachToast(message, color) {
  try { window.speechSynthesis?.cancel?.(); } catch(e){}

  document.querySelectorAll(".coach-toast").forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = "coach-toast";
  toast.style.cssText = `
    position: fixed; left: 50%; transform: translateX(-50%);
    top: 64px; z-index: 9999;
    max-width: 680px; width: calc(100% - 24px);
    background: rgba(17,17,17,0.95);
    border: 1px solid ${color || "#00ff99"};
    box-shadow: 0 12px 32px rgba(0,0,0,.5);
    border-radius: 16px; padding: 14px 16px;
    display: flex; gap: 10px; align-items: flex-start;
    color: #fff; backdrop-filter: blur(6px);
  `;
  toast.innerHTML = `
    <div style="font-size:1.6rem;line-height:1.2">😎</div>
    <div style="flex:1">
      <div style="font-weight:700;color:${color||"#00ff99"};opacity:.95;">Coach</div>
      <div style="font-size:1.05rem;line-height:1.4">${message}</div>
    </div>
    <button class="close-coach" style="background:none;border:none;color:${color||"#00ff99"};font-weight:700;cursor:pointer">✖</button>
  `;
  document.body.appendChild(toast);

  toast.querySelector(".close-coach").addEventListener("click", () => toast.remove());
  setTimeout(() => { toast.remove(); }, 7000);
}

window.showCoachToast = showCoachToast;
