// js/training.js
import { fetchExercises } from "./data.js";
import { tipAfterPractice } from "./coach.js";

const $ = (id) => document.getElementById(id);
const TRAINING_KEY = "trainingHistory";

let exercises = [];
let selectedType = null;
let currentExercise = null;

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

  // écoute des clics type
  document.querySelectorAll(".training-type").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedType = btn.dataset.type;
      setActiveTypeButton(selectedType);
      loadExercises(selectedType);
    })
  );

  exercises = await fetchExercises();
  renderHistory();
}

function setActiveTypeButton(type) {
  document.querySelectorAll(".training-type").forEach((b) =>
    b.classList.remove("active-type")
  );
  const active = document.querySelector(`.training-type[data-type="${type}"]`);
  if (active) active.classList.add("active-type");
}

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

function startExercise(exo) {
  currentExercise = exo;
  const zone = $("training-session");
  const coach = tipAfterPractice(exo.type, "fun");

  $("training-exercises").style.display = "none";

  const objectif = exo.objectif || 10;
  let currentCount = 0;

  const mediaBlock = exo.media
    ? exo.media.endsWith(".mp4")
      ? `<video src="${exo.media}" controls class="exo-media"></video>`
      : `<img src="${exo.media}" alt="${exo.name}" class="exo-media" />`
    : "";

  zone.innerHTML = `
    <div class="training-session-card">
      <div class="media-container">${mediaBlock}</div>

      <h4>${exo.name}</h4>
      <p class="goal">${exo.goal}</p>

      <div class="coach-panel">
        <div class="coach-avatar">😎</div>
        <div class="coach-text">${coach}</div>
      </div>

      <div class="progress-block">
        <div id="progress-label">Progression : 0 / ${objectif}</div>
        <div class="progress-bar"><div id="progress-fill"></div></div>
        <button class="btn" id="btn-add-success">+1 Réussi</button>
      </div>

      <div class="inputs">
        <label>Performance :</label>
        <input type="text" id="perf-input" placeholder="Ex: 8/10 réussis ou 70%" />

        <label>Commentaire :</label>
        <textarea id="note-input" placeholder="Tes sensations..."></textarea>
      </div>

      <div class="actions">
        <button class="btn" id="save-perf">Sauvegarder</button>
        <button class="btn secondary" id="change-exo">🔁 Changer d'exercice</button>
      </div>
    </div>
  `;

  // === CHANGEMENT EXO ===
  $("change-exo").addEventListener("click", () => {
    $("training-exercises").style.display = "block";
    zone.innerHTML = "";
  });

  // === INCREMENTATION SUCCÈS ===
  $("btn-add-success").addEventListener("click", () => {
    if (currentCount < objectif) {
      currentCount++;
      const percent = (currentCount / objectif) * 100;
      $("progress-fill").style.width = percent + "%";
      $("progress-label").textContent = `Progression : ${currentCount} / ${objectif}`;
    }
  });

  // === SAUVEGARDE ===
  $("save-perf").addEventListener("click", () => {
    const perf =
      $("perf-input").value.trim() ||
      `${currentCount}/${objectif} réussis (${Math.round(
        (currentCount / objectif) * 100
      )}%)`;
    const note = $("note-input").value.trim();
    if (!perf) return alert("Indique ta performance.");

    savePerformance({ ...exo, perf, note });
    showEndModal(exo);
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

// === MODAL FIN D'EXERCICE ===
function showEndModal(exo) {
  const modal = document.createElement("div");
  modal.className = "end-modal";
  modal.innerHTML = `
    <div class="end-content">
      <h3>✅ Bien joué Greg !</h3>
      <p>Tu veux recommencer l'exercice ou en changer ?</p>
      <div class="end-actions">
        <button class="btn" id="restart-exo">🔄 Recommencer</button>
        <button class="btn" id="new-exo">↩️ Changer d'exercice</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $("restart-exo").addEventListener("click", () => {
    modal.remove();
    startExercise(exo);
  });

  $("new-exo").addEventListener("click", () => {
    modal.remove();
    $("training-session").innerHTML = "";
    $("training-exercises").style.display = "block";
  });
}

// === HISTORIQUE ===
function renderHistory() {
  const histZone = $("training-history");
  if (!histZone) return;

  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  if (!data.length) {
    histZone.innerHTML = "<p style='opacity:.6'>Aucun entraînement enregistré pour le moment.</p>";
    return;
  }

  data.sort((a, b) => new Date(b.date) - new Date(a.date));

  histZone.innerHTML = `
    <h3>📜 Historique d'entraînement</h3>
    <div class="history-list">
      ${data
        .map((h) => {
          const d = new Date(h.date).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          });
          return `
            <div class="history-item">
              <div style="color:#00ff99;font-weight:600">${h.name}</div>
              <div style="font-size:.85rem;opacity:.8">${d} · ${h.type}</div>
              <div style="margin:4px 0;">Perf : <strong>${h.perf}</strong></div>
              ${h.note ? `<div style="font-size:.9rem;opacity:.9;">Note : ${h.note}</div>` : ""}
            </div>`;
        })
        .join("")}
    </div>
  `;
}
