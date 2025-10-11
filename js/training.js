// js/training.js
import { fetchExercises } from "./data.js";
import { tipAfterPractice } from "./coach.js";

const $ = (id) => document.getElementById(id);
const TRAINING_KEY = "trainingHistory";

let exercises = [];
let selectedType = null;

document.addEventListener("DOMContentLoaded", () => initTraining());

async function initTraining() {
  const types = ["putting", "chipping", "driving", "irons", "mental"];
  const typeZone = $("training-type");
  typeZone.innerHTML = types
    .map(
      (t) =>
        `<button class="btn training-type" data-type="${t}">${t.toUpperCase()}</button>`
    )
    .join("");

  document.querySelectorAll(".training-type").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedType = btn.dataset.type;
      loadExercises(selectedType);
    })
  );

  exercises = await fetchExercises();

  // Historique + bouton reset
  renderHistory();
  $("reset-history")?.addEventListener("click", resetHistory);
}

// === CHARGEMENT DES EXERCICES ===
function loadExercises(type) {
  const exZone = $("training-exercises");
  const exos = exercises.filter((e) => e.type?.toLowerCase().includes(type));
  if (!exos.length) {
    exZone.innerHTML = `<p style="opacity:.7">Aucun exercice pour ${type}.</p>`;
    return;
  }

  exZone.innerHTML = `
    <h3>${type.toUpperCase()}</h3>
    <ul class="exo-list">
      ${exos
        .map(
          (ex) => `
        <li>
          <button class="btn exo-btn" data-id="${ex.id}">
            ${ex.name} — <small>${ex.goal}</small>
          </button>
        </li>`
        )
        .join("")}
    </ul>
  `;

  exZone.querySelectorAll(".exo-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const exo = exos.find((e) => e.id === btn.dataset.id);
      startExercise(exo);
    })
  );
}

// === DÉROULEMENT D’UN EXERCICE ===
function startExercise(exo) {
  const zone = $("training-session");
  const coach = tipAfterPractice(exo.type, "fun");

  zone.innerHTML = `
    <div class="exo-session">
      <h4>${exo.name}</h4>
      <p>${exo.goal}</p>
      <div class="coach-box" style="background:#111;padding:10px;border-radius:8px;color:#00ff99;margin:10px 0;">
        ${coach}
      </div>
      <label>Performance :</label>
      <input type="text" id="perf-input" placeholder="Ex: 8/10 réussis ou 70%" />
      <label>Commentaire :</label>
      <textarea id="note-input" placeholder="Tes sensations..."></textarea>
      <button class="btn" id="save-perf">Sauvegarder</button>
    </div>
  `;

  $("save-perf").addEventListener("click", () => {
    const perf = $("perf-input").value.trim();
    const note = $("note-input").value.trim();
    if (!perf) return alert("Indique ta performance.");
    savePerformance({ ...exo, perf, note });
    zone.innerHTML = `
      <p style="color:#00ff99;">✅ Performance enregistrée !</p>
      <p>${tipAfterPractice(exo.type, "zen")}</p>
    `;
    renderHistory();
  });
}

// === SAUVEGARDE LOCALE ===
function savePerformance(entry) {
  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  data.push({
    date: new Date().toISOString(),
    ...entry,
  });
  localStorage.setItem(TRAINING_KEY, JSON.stringify(data));
}

// === AFFICHAGE DE L’HISTORIQUE ===
function renderHistory() {
  const histZone = $("training-history");
  if (!histZone) return;

  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  if (!data.length) {
    histZone.innerHTML =
      "<p style='opacity:.6'>Aucun entraînement enregistré pour le moment.</p>";
    return;
  }

  data.sort((a, b) => new Date(b.date) - new Date(a.date));

  histZone.innerHTML = `
    <h3>📜 Historique d'entraînement</h3>
    <div class="history-list">
      ${data
        .map((h) => {
          const d = new Date(h.date);
          const date = d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          });
          const coach = tipAfterPractice(h.type, "fun");
          return `
            <div class="history-item" style="background:#111;padding:10px;margin:6px auto;border-radius:8px;max-width:520px;text-align:left">
              <div style="color:#00ff99;font-weight:600">${h.name}</div>
              <div style="font-size:.85rem;opacity:.8">${date} · ${h.type}</div>
              <div style="margin:4px 0;">Perf : <strong>${h.perf}</strong></div>
              ${h.note ? `<div style="font-size:.9rem;opacity:.9;">Note : ${h.note}</div>` : ""}
              <div style="color:#00ff99;margin-top:4px;font-size:.9rem;">${coach}</div>
            </div>`;
        })
        .join("")}
    </div>
  `;
}

// === RÉINITIALISATION ===
function resetHistory() {
  if (!confirm("🧹 Supprimer tout l’historique d’entraînement ?")) return;
  localStorage.removeItem(TRAINING_KEY);
  renderHistory();
}
