// === Parfect.golfr - history.js (MVP sans import/export) ===
console.log("📜 Historique prêt");

window.$ = (id) => document.getElementById(id);
const STORAGE_KEY = "golfHistory";

// === Initialisation ===
document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
});

// === Rendu de l'historique ===
function renderHistory() {
  const zone = $("history-list");
  if (!zone) return;

  const rounds = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  if (!rounds.length) {
    zone.innerHTML = "<p style='opacity:.6'>Aucune partie enregistrée pour le moment.</p>";
    if ($("history-summary")) $("history-summary").innerHTML = "";
    return;
  }

  // --- Résumé global ---
  const totalRounds = rounds.length;
  const totalParfects = rounds.reduce((a, r) => a + (r.parfects || 0), 0);
  const totalBogeyfects = rounds.reduce((a, r) => a + (r.bogeyfects || 0), 0);
  const avgScore = Math.round(
    (rounds.reduce((a, r) => a + (r.totalVsPar || 0), 0) / totalRounds) * 10
  ) / 10;

  if ($("history-summary")) {
    $("history-summary").innerHTML = `
      <div class="summary-box">
        <div class="summary-item">📊 <strong>${totalRounds}</strong> parties</div>
        <div class="summary-item">Moyenne :
          <strong style="color:${avgScore < 0 ? "#44ffaa" : avgScore > 0 ? "#ff5555" : "#fff"}">
            ${avgScore > 0 ? "+" + avgScore : avgScore}
          </strong>
        </div>
        <div class="summary-item">💚 <strong>${totalParfects}</strong> Parfects</div>
        <div class="summary-item">💙 <strong>${totalBogeyfects}</strong> Bogey’fects</div>
      </div>
    `;
  }

  // --- Affichage des cartes ---
  rounds.sort((a, b) => new Date(b.date) - new Date(a.date));
  zone.innerHTML = rounds.map(r => {
    const d = new Date(r.date).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "2-digit"
    });

    const color = r.totalVsPar < 0 ? "#44ffaa" : r.totalVsPar > 0 ? "#ff5555" : "#fff";
    const coachMsg = getCoachSummary(r);

    return `
      <div class="history-card">
        <div class="history-header">
          <span class="history-date">${d}</span>
          <span class="history-golf">⛳ ${r.golf || "Parcours inconnu"}</span>
        </div>
        <div class="history-stats">
          <div>Total : <strong style="color:${color}">
            ${r.totalVsPar > 0 ? "+" + r.totalVsPar : r.totalVsPar}
          </strong></div>
          <div>💚 Parfects : <strong>${r.parfects || 0}</strong> · 💙 Bogey’fects : <strong>${r.bogeyfects || 0}</strong></div>
        </div>
        <div class="history-coach">"${coachMsg}"</div>
      </div>
    `;
  }).join("");

  // Bouton de reset s’il existe
  $("reset-rounds")?.addEventListener("click", resetHistory);
}

// === Génère un message de coach simple (offline) ===
function getCoachSummary(round) {
  if (!round || !round.holes || !round.holes.length) return "Chaque coup t’a appris quelque chose 💚";

  const last = round.holes[round.holes.length - 1];
  const diff = last.score - last.par;

  if (diff <= -1) return "🔥 Beau finish — t’as fini fort comme un pro !";
  if (diff === 0) return "💚 Solide sur la fin — routine maîtrisée.";
  if (diff === 1) return "💙 Petit bogey propre, c’est encore du progrès.";
  if (diff >= 2) return "😅 Allez, respire — le prochain départ t’attend.";
  return "Continue ton flow, trou après trou.";
}

// === Reset complet de l’historique ===
function resetHistory() {
  if (!confirm("🧹 Supprimer tout l’historique des parties ?")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}
