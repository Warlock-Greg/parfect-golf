// === Parfect.golfr - main.js (MVP) ===
const $$ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 main.js chargé");

  if (typeof initLicence === "function") initLicence();
  if (typeof initCoachIA === "function") initCoachIA();
  initShortcuts();
});

function initShortcuts() {
  $$("play-btn")?.addEventListener("click", () => {
    showCoachIA("🎯 On part jouer un parcours ?");
    if (typeof showResumeOrNewModal === "function") setTimeout(showResumeOrNewModal, 400);
  });

  $$("training-btn")?.addEventListener("click", () => {
    showCoachIA("🏋️‍♂️ On s’entraîne ? Choisis ton challenge !");
    if (typeof initTraining === "function") setTimeout(initTraining, 400);
  });

  $$("history-btn")?.addEventListener("click", () => {
    showCoachIA("📜 Voici ton historique 💚");
    if (typeof renderHistory === "function") {
      setTimeout(() => {
        renderHistory();
        if (typeof injectSocialUI === "function") injectSocialUI();
      }, 400);
    }
  });
}

// --- Chat du coach IA sur la page d’accueil ---
(function initCoachCentral() {
  const input = $$("coach-input");
  const sendBtn = $$("coach-send");
  const log = $$("coach-log");

  if (!input || !sendBtn) return;

  sendBtn.addEventListener("click", sendCoachMessage);
  input.addEventListener("keypress", (e) => e.key === "Enter" && sendCoachMessage());

  async function sendCoachMessage() {
    const msg = input.value.trim();
    if (!msg) return;
    appendMsg("user", msg);
    input.value = "";

    try {
      const res = await fetch("https://parfect-coach-api.gregoiremm.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      appendMsg("coach", data.reply || "Smart golf. Easy mindset 💚");
    } catch {
      appendMsg("coach", "😅 Le coach ne répond pas, reste dans ton flow 💚");
    }
  }

  function appendMsg(role, text) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;";
    row.innerHTML = `
      <div style="font-size:1.2rem">${role === "user" ? "👤" : "😎"}</div>
      <div style="background:#111;border:1px solid #222;padding:8px 10px;border-radius:8px;max-width:85%;">
        ${text}
      </div>`;
    log.appendChild(row);
    requestAnimationFrame(() => (log.scrollTop = log.scrollHeight + 30));
  }
})();

