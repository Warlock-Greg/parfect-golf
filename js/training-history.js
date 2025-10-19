// === Parfect.golfr - training-history.js (MVP sans import/export) ===
(function () {
  const $ = window.$ || ((id) => document.getElementById(id));
  const TRAINING_KEY = "trainingHistory";

  // === Initialisation de la page historique ===
  window.initTrainingHistory = function initTrainingHistory() {
    console.log("📜 training-history.js initialisé");
    renderTrainingHistory();
  };

  // === Rendu principal ===
  function renderTrainingHistory() {
    const zone = $("training-history");
    if (!zone) return;

    const hist = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
    if (!hist.length) {
      zone.innerHTML = `
        <div style="text-align:center;margin-top:20px;">
          <p>Aucun entraînement enregistré pour le moment.</p>
          <button id="back-training" class="btn" style="margin-top:10px;">⬅️ Retour</button>
        </div>`;
      $("back-training").addEventListener("click", goBack);
      return;
    }

    const totalSessions = hist.length;
    const last10 = hist.slice(-10).reverse();
    const typeStats = getTypeStats(hist);

    zone.innerHTML = `
      <div class="training-summary">
        <h3>📊 Historique des entraînements</h3>
        <p>Total sessions : <strong>${totalSessions}</strong></p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;">
          ${Object.keys(typeStats)
            .map(
              (t) =>
                `<div class="mini-stat"><strong>${t}</strong> : ${typeStats[t]} sessions</div>`
            )
            .join("")}
        </div>
      </div>

      <div class="training-list" style="margin-top:10px;">
        <ul style="list-style:none;padding:0;">
          ${last10
            .map(
              (h) => `
            <li style="margin-bottom:8px;padding:6px;border-bottom:1px solid #333;">
              <strong>${new Date(h.date).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
              })}</strong> — 
              ${h.title} <em>(${h.type})</em> 
              <span style="opacity:.6;">· ${h.duration || "10 min"}</span>
            </li>`
            )
            .join("")}
        </ul>
      </div>

      <div style="margin-top:16px;text-align:center;">
        <button id="back-training" class="btn">⬅️ Retour</button>
        <button id="reset-training-history" class="btn secondary" style="margin-left:6px;">🧹 Vider l’historique</button>
      </div>
    `;

    $("back-training").addEventListener("click", goBack);
    $("reset-training-history").addEventListener("click", resetHistory);
  }

  // === Statistiques par type d'entraînement ===
  function getTypeStats(hist) {
    const stats = {};
    hist.forEach((h) => {
      stats[h.type] = (stats[h.type] || 0) + 1;
    });
    return stats;
  }

  // === Efface l’historique ===
  function resetHistory() {
    if (!confirm("🧹 Supprimer tout l’historique des entraînements ?")) return;
    localStorage.removeItem(TRAINING_KEY);
    renderTrainingHistory();
  }

  // === Retour à la page entraînement ===
  function goBack() {
    const zone = $("training-history");
    if (zone) zone.innerHTML = "";
    if ($("training-type")) $("training-type").style.display = "block";
    window.initTraining?.();
  }

  // Auto-init si la page est visible
  document.addEventListener("DOMContentLoaded", () => {
    if ($("training-history")) renderTrainingHistory();
  });
})();

