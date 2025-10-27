// === Parfect.golfr - coachIA.js (version intégrée dans la page) ===

// Petit helper global
const $ = (id) => document.getElementById(id);

// --- 1️⃣ Coach IA intégré (utilise la div du HTML) ---
window.initCoachIA = function initCoachIA() {
  const container = $("coach-ia");
  if (!container) {
    console.warn("⚠️ Coach IA introuvable dans le DOM");
    return;
  }

  // Récupère les sous-éléments existants
  const log = $("coach-log");
  const input = $("coach-input");
  const sendBtn = $("coach-send");

  // Si un de ces éléments est manquant, on stoppe
  if (!log || !input || !sendBtn) {
    console.warn("⚠️ Structure coach IA incomplète (log / input / bouton manquant)");
    return;
  }

  // --- Événements ---
  sendBtn.addEventListener("click", sendMsg);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMsg();
  });

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

  async function sendMsg() {
    const msg = input.value.trim();
    if (!msg) return;
    push("user", msg);
    input.value = "";
    const reply = await askCoachAPI(msg);
    push("coach", reply);
  }

  function push(role, text) {
    const row = document.createElement("div");
    row.style.cssText = `display:flex;gap:8px;align-items:flex-start;`;
    row.innerHTML = `
      <div style="font-size:1.1rem">${role === "user" ? "👤" : "😎"}</div>
      <div style="background:#111;border:1px solid #222;padding:8px 10px;border-radius:8px;max-width:85%;">
        ${text}
      </div>`;
    log.appendChild(row);
    log.style.paddingBottom = "30px";
    requestAnimationFrame(() => (log.scrollTop = log.scrollHeight + 30));
  }

  // --- Fonctions globales (compatibles avec main.js) ---
  window.showCoachIA = (msg) => {
    if (msg) push("coach", msg);
    input.focus();
  };

  window.hideCoachIA = () => {
    // Pour compatibilité, ne fait rien (le coach reste visible)
  };

  document.addEventListener("coach-message", (e) => {
    const txt = e?.detail || "";
    if (txt) push("coach", txt);
    showCoachIA();
  });
};
