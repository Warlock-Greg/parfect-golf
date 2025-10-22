// === Parfect.golfr - coachIA.js (MVP FINAL) ===

// --- Toast plein format ---
window.showCoachToast = function (message, accent) {
  document.querySelectorAll(".coach-toast").forEach((n) => n.remove());
  const color = accent || "#00ff99";

  const wrap = document.createElement("div");
  wrap.className = "coach-toast";
  wrap.style.cssText = `
    position: fixed; left: 50%; transform: translateX(-50%);
    top: 72px; z-index: 9999; width: min(680px, 92vw);
    background: #0d0f10; border: 2px solid ${color};
    border-radius: 16px; padding: 14px 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,.45);
    display: flex; gap: 12px; align-items: flex-start;
    font-size: 1rem; line-height: 1.35;
  `;
  wrap.innerHTML = `
    <div style="font-size:1.6rem">😎</div>
    <div style="flex:1">
      <div style="font-weight:700;color:${color};margin-bottom:4px">Coach</div>
      <div>${message}</div>
    </div>
    <button class="btn" id="coach-toast-close" style="background:${color};color:#0d0f10">OK</button>
  `;
  document.body.appendChild(wrap);

  document.getElementById("coach-toast-close").addEventListener("click", () => wrap.remove());
  setTimeout(() => wrap.remove(), 8000);
};

// --- Initialisation principale ---
window.initCoachIA = function () {
  if (document.querySelector(".coach-dock")) return;

  // === Dock principal ===
  const dock = document.createElement("div");
  dock.className = "coach-dock";
  dock.style.cssText = `
    position: fixed; right: 12px; bottom: 12px; z-index: 9998;
    width: 320px; max-width: calc(100vw - 24px);
    background: #0d0f10; border: 1px solid #222;
    border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,.4);
    display: none; flex-direction: column;
    animation: fadeIn 0.3s ease;
  `;
  dock.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid #222;">
      <div style="font-size:1.2rem">💬</div>
      <div style="font-weight:700">Coach IA</div>
      <button class="btn" id="coach-dock-close" style="margin-left:auto;background:#00ff99;color:#111">Fermer</button>
    </div>
    <div id="coach-log" style="flex:1;max-height:280px;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;"></div>
    <div style="display:flex;gap:8px;padding:10px;border-top:1px solid #222;">
      <input id="coach-input" type="text" placeholder="Pose ta question…" style="flex:1;padding:8px;border-radius:8px;border:1px solid #333;background:#111;color:#fff">
      <button class="btn" id="coach-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(dock);

  // === Bouton flottant (FAB) ===
  const fab = document.createElement("button");
  fab.id = "coach-fab";
  fab.className = "btn";
  fab.textContent = "😎 Coach";
  fab.style.cssText = `
    position: fixed; right: 12px; bottom: 12px; z-index: 9997;
    background:#00ff99; color:#111;
    border-radius: 30px; padding:.6rem .9rem;
    font-weight:700; cursor:pointer;
  `;
  document.body.appendChild(fab);

  // === Fonctions internes ===
  function hideCoachIA() {
    dock.style.opacity = "0";
    setTimeout(() => { dock.style.display = "none"; }, 250);
  }

  async function askCoachAPI(message) {
    try {
      const res = await fetch("https://parfect-coach-api.gregoiremm.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      return data.reply || "Smart golf. Easy mindset 💚";
    } catch {
      return "😅 Le coach n’a pas répondu, reste focus 💚";
    }
  }

  function push(role, text) {
    const log = document.getElementById("coach-log");
    const row = document.createElement("div");
    row.style.cssText = `display:flex;gap:8px;align-items:flex-start;`;
    row.innerHTML = `
      <div style="font-size:1.1rem">${role === "user" ? "👤" : "😎"}</div>
      <div style="background:#111;border:1px solid #222;padding:8px 10px;border-radius:8px;max-width:85%;">${text}</div>
    `;
    log.appendChild(row);
    log.style.paddingBottom = "30px";
    log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
  }

  async function sendMsg() {
    const input = document.getElementById("coach-input");
    const msg = input.value.trim();
    if (!msg) return;

    push("user", msg);
    input.value = "";
    const reply = await askCoachAPI(msg);
    push("coach", reply);
  }

  // === Exposition globale ===
  window.showCoachIA = (msg) => {
    dock.style.display = "flex";
    dock.style.opacity = "1";
    if (msg) push("coach", msg);

    const input = document.getElementById("coach-input");
    if (input) setTimeout(() => input.focus(), 300);

    clearTimeout(window._coachTimer);
    window._coachTimer = setTimeout(() => hideCoachIA(), 180000);
  };

  window.hideCoachIA = hideCoachIA;

  // === Événements ===
  fab.addEventListener("click", () => showCoachIA("💚 Ton coach est prêt à t’aider !"));
  document.getElementById("coach-dock-close").addEventListener("click", hideCoachIA);
  document.getElementById("coach-send").addEventListener("click", sendMsg);
  document.getElementById("coach-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMsg();
  });

  // === Réagit aux messages rapides du jeu ===
  document.addEventListener("coach-message", (e) => {
    const msg = e?.detail || "";
    if (msg) push("coach", msg);
    showCoachIA();
  });
};

// === Initialisation auto ===
document.addEventListener("DOMContentLoaded", () => {
  initCoachIA();

  // Vérifie si on est sur la page d’accueil
  const isHome =
    location.pathname.endsWith("index.html") ||
    location.pathname === "/" ||
    document.getElementById("home");

  if (isHome) {
    // 💚 Message d’accueil simple
    showCoachToast("👋 Bienvenue sur Parfect.golfr ! Prêt à jouer ou t’entraîner aujourd’hui ? 💚", "#00ff99");
  } else {
    // 💚 Message normal du coach IA actif
    showCoachToast("💚 Ton coach est prêt !", "#00ff99");
  }
});
