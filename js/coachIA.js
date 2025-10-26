// === Parfect.golfr - coachIA.js (MVP complet) ===

// Petit helper global
const $ = (id) => document.getElementById(id);

// --- 1️⃣ Coach Dock (chat flottant) ---
window.initCoachIA = function initCoachIA() {
  if (document.querySelector(".coach-dock")) return;

  const dock = document.createElement("div");
  dock.className = "coach-dock";
  dock.style.cssText = `
    position: fixed; right: 12px; bottom: 12px;
    z-index: 9998; width: 320px; max-width: calc(100vw - 24px);
    background: #0d0f10; border: 1px solid #222; border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,.4); display: none;
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

  // --- Bouton flottant ---
  const fab = document.createElement("button");
  fab.id = "coach-fab";
  fab.className = "btn";
  fab.textContent = "😎 Coach";
  fab.style.cssText = `
    position: fixed; right: 12px; bottom: 12px;
    z-index: 9997; background:#00ff99; color:#111;
    border-radius: 30px; padding: .6rem .9rem;
  `;
  document.body.appendChild(fab);

  // --- Événements ---
  fab.addEventListener("click", () => showCoachIA("💚 Ton coach est prêt à t’aider !"));
  $("coach-dock-close").addEventListener("click", hideCoachIA);
  $("coach-send").addEventListener("click", sendMsg);
  $("coach-input").addEventListener("keypress", (e) => { if (e.key === "Enter") sendMsg(); });

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
    const input = $("coach-input");
    const msg = input.value.trim();
    if (!msg) return;
    push("user", msg);
    input.value = "";
    const reply = await askCoachAPI(msg);
    push("coach", reply);
  }

  function push(role, text) {
    const log = $("coach-log");
    const row = document.createElement("div");
    row.style.cssText = `display:flex;gap:8px;align-items:flex-start;`;
    row.innerHTML = `
      <div style="font-size:1.1rem">${role === "user" ? "👤" : "😎"}</div>
      <div style="background:#111;border:1px solid #222;padding:8px 10px;border-radius:8px;max-width:85%;">${text}</div>`;
    log.appendChild(row);
    log.style.paddingBottom = "30px";
    requestAnimationFrame(() => (log.scrollTop = log.scrollHeight + 30));
  }

  // --- Globaux accessibles ---
  window.showCoachIA = (msg) => {
    dock.style.display = "block";
    if (msg) push("coach", msg);
    setTimeout(() => $("coach-input")?.focus(), 300);
  };

  window.hideCoachIA = () => {
    dock.style.display = "none";
  };

  document.addEventListener("coach-message", (e) => {
    const txt = e?.detail || "";
    if (txt) push("coach", txt);
    showCoachIA();
  });
};


