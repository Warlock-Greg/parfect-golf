// js/history.js
import { tipAfterHole } from "./coach.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "golfHistory";

document.addEventListener("DOMContentLoaded", () => renderHistory());

function renderHistory() {
  const zone = $("history-list");
  const rounds = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  if (!zone) return;
  if (!rounds.length) {
    zone.innerHTML = "<p style='opacity:.6'>Aucune partie enregistrée pour le moment.</p>";
    return;
  }

  // On trie du plus récent au plus ancien
  rounds.sort((a, b) => new Date(b.date) - new Date(a.date));

  zone.innerHTML = rounds
    .map((r) => {
      const d = new Date(r.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
      const coachMsg = tipAfterHole(r.holes?.slice(-1)[0] || {}, "fun");
      const color =
        r.totalVsPar < 0 ? "#44ffaa" : r.totalVsPar > 0 ? "#ff5555" : "#fff";

      return `
        <div class="history-card">
          <div class="history-header">
            <span class="history-date">${d}</span>
            <span class="history-golf">⛳ ${r.golf}</span>
          </div>
          <div class="history-stats">
            <div>Total : <strong style="color:${color}">${r.totalVsPar > 0 ? "+" + r.totalVsPar : r.totalVsPar}</strong></div>
            <div>💚 Parfects : <strong>${r.parfects}</strong> | 💙 Bogey’fects : <strong>${r.bogeyfects}</strong></div>
          </div>
          <div class="history-coach">"${coachMsg}"</div>
        </div>
      `;
    })
    .join("");

  $("reset-rounds")?.addEventListener("click", resetHistory);
}

function resetHistory() {
  if (!confirm("🧹 Supprimer tout l’historique des parties ?")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}
