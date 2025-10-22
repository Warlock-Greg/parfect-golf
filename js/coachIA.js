// === Parfect.golfr - coachIA.js (MVP propre et corrigé) ===

// --- Toast plein format (sous le header, feedback rapide) ---
window.showCoachToast = function showCoachToast(message, accent) {
  // Supprime les anciens toasts
  document.querySelectorAll(".coach-toast").forEach((n) => n.remove());

  const color = accent || "#00ff99";
  const wrap = document.createElement("div");
  wrap.className = "coach-toast";
  wrap.style.cssText = `
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    top: 72px;
    z-index: 9999;
    width: min(680px, 92vw);
    background: #0d0f10;
    border: 2px solid ${color};
    border-radius: 16px;
    padding: 14px 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,.45);
    display: flex;
    gap: 12px;
    align-items: flex-start;
    font-size: 1rem;
    line-height: 1.35;
  `;
  wrap.innerHTML = `
    <div style="font-size:1.6rem">😎</div>
    <div style="flex:1">
      <div style="font-weight:700;color:${color};margin-bottom:4px">Coach</div>
      <div>${message}</div>
    </div>
    <button id="coach-toast-close" class="btn" style="background:${color};color:#0d0f10">OK</button>
  `;
  document.body.appendChild(wrap);

  const closeBtn = document.getElementById("coach-toast-close");
  closeBtn.addEventListener("click", () => wrap.remove());

  // Auto-fermeture au bout de 8s
  setTimeout(() => {
    if (document.body.contains(wrap)) wrap.remove();
  }, 8000);
};

// --- Dock du coach IA (chat flottant) ---
window.initCoachIA = function initCoachIA() {
  if (document.querySelector(".coach-dock")) return;

  const dock = document.createElement("div");
  dock.className = "coach-dock";
  dock.style.cssText = `
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 9998;
    width: 320px;
    max-width: calc(100vw - 24px);
    background: #0d0f10;
    border: 1px solid #222;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,.4);
    display: none;
  `;
  dock.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid #222;">
      <div style="font-size:1.2rem">💬</div>
      <div style="font-weight:700">Coach IA</div>
      <button id="coach-dock-close" class="btn" style="margin-left:auto;background:#00ff99;color:#111">Fermer</button>
    </div>
    <div id="coach-log" style="max-height:280px;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px;"></div>
    <div style="display:flex;gap:8px;padding:10px;border-top:1px solid #222;">
      <input id="coach-input" type="text" placeholder="Pose ta question…" style="flex:1;padding:8px;border-radius:8px;border:1px solid #333;background:#111;color:#fff">
      <button id="coach-send" class="btn">Envoyer</button>
    </div>
  `;
  document.body.appendChild(dock);

  // --- Bouton flottant Coach (FAB) ---
  const fab = document.createElement("button");
  fab.id = "coach-fab";
  fab.className = "btn";
  fab.textContent = "😎 Coach";
  fab.style.cssText = `
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 9997;
    background: #00ff99;
    color: #111;
    border-radius: 30px;
    padding: .6rem .9rem;
  `;
  document.body.appendChild(fab);

  // === Événements ===
  fab.addEventListener("click", () => showCoachIA("💚 Ton coach est prêt à t’aider !"));
  document.getElementById("coach-dock-close").addEventListener("click", hideCoachIA);
  document.getElementById("coach-send").addEventListener("click", sendMsg);
  document.getElementById("coach-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMsg();
  });

  let coachTimer = null;

  // === Appel à ton backend Cloudflare ===
  async function askCoachAPI(message) {
    try {
      const res = await fetch("https://parfect-coach-api.gregoiremm.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      return data.reply || "Smart golf. Easy mindset 💚";
    } catch (err) {
      console.error("Erreur API Coach:", err);
      return "😅 Le coach n’a pas répondu, reste focus 💚";
    }
  }

  // === Envoi du message depuis la zone de chat ===
  function sendMsg() {
    const input = document.getElementById("coach-input");
    const msg = (input.value || "").trim();
    if (!msg) return;

    push("user", msg);
    input.value = "";

    // 🔥 Appel Cloudflare (avec fallback local si besoin)
    setTimeout(async () => {
      const reply = await askCoachAPI(msg);
      push("coach", reply);
    }, 300);
  }

  // --- Affiche un message dans le log ---
  function push(role, text) {
    const log = document.getElementById("coach-log");
    if (!log) return;

    const row = document.createElement("div");
    row.style.cssText = `display:flex;gap:8px;align-items:flex-start;`;
    row.innerHTML = `
      <div style="font-size:1.1rem">${role === "user" ? "👤" : "😎"}</div>
      <div style="background:#111;border:1px solid #222;padding:8px 10px;border-radius:8px;max-width:85%;">
        ${text}
      </div>
    `;
    log.appendChild(row);

    // ✅ Ajout du padding en bas (30px)
    log.style.paddingBottom = "30px";

    // ✅ Scroll automatique vers le bas après chaque ajout
    requestAnimationFrame(() => {
      log.scrollTop = log.scrollHeight + 30;
    });
  }

  // --- Contrôle global visible depuis play/training ---
  window.showCoachIA = (msg) => {
    const dock = document.querySelector(".coach-dock");
    if (!dock) return;

    dock.style.display = "block";
    if (msg) push("coach", msg);

    // ✅ Focus automatique sur l’input quand on ouvre le coach
    const input = document.getElementById("coach-input");
    if (input) {
      setTimeout(() => input.focus(), 300);
    }

    clearTimeout(coachTimer);
    coachTimer = setTimeout(() => hideCoachIA(), 180000); // auto-hide après 3 min
  };

  window.hideCoachIA = () => {
    const dock = document.querySelector(".coach-dock");
    if (dock) dock.style.display = "none";
  };

  // --- Événements globaux : réaction aux messages rapides ---
  document.addEventListener("coach-message", (e) => {
    const txt = e?.detail || "";
    if (txt) push("coach", txt);
    showCoachIA();
  });
};

// --- Initialisation automatique du coach ---
document.addEventListener("DOMContentLoaded", () => {
  initCoachIA();
  showCoachToast("💚 Ton coach est prêt !", "#00ff99");
});
