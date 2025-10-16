// js/training_v2.js
import { fetchExercises } from "./data.js";
import { showCoachToast } from "./coach.js";

// === STATE GLOBAL ===
const $ = (id) => document.getElementById(id);
const TRAINING_KEY = "trainingHistoryV2";

let exercises = [];
let selectedType = null;
let currentExercise = null;
let currentCount = 0;

// === INITIALISATION ===
document.addEventListener("DOMContentLoaded", initTrainingV2);

async function initTrainingV2() {
  console.log("🏋️ Training V2 loaded");

  const zone = $("training-select");
  zone.innerHTML = `
    <h3>Choisis ton thème d'entraînement</h3>
    <div class="training-types">
      <button class="btn training-type" data-type="putting">⛳ Putting</button>
      <button class="btn training-type" data-type="chipping">🎯 Chipping</button>
      <button class="btn training-type" data-type="driving">💥 Driving</button>
      <button class="btn training-type" data-type="irons">🪄 Fers</button>
      <button class="btn training-type" data-type="mental">🧠 Mental</button>
    </div>
    <div id="training-exercises"></div>
  `;

  exercises = await fetchExercises();

  document.querySelectorAll(".training-type").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedType = btn.dataset.type;
      loadExercisesV2(selectedType);
    });
  });
}

// === CHARGEMENT DES EXERCICES ===
function loadExercisesV2(type) {
  const exZone = $("training-exercises");
  const exos = exercises.filter((e) => e.type?.toLowerCase().includes(type));

  if (!exos.length) {
    exZone.innerHTML = `<p style="opacity:.7;">Aucun exercice pour ${type}</p>`;
    return;
  }

  exZone.innerHTML = `
    <h3>🧩 Exercices ${type.toUpperCase()}</h3>
    <div class="exo-list">
      ${exos.map((ex) => `
        <button class="btn exo-btn" data-id="${ex.id}">
          ${ex.name} — <small>${ex.goal}</small>
        </button>
      `).join("")}
    </div>
  `;

  exZone.querySelectorAll(".exo-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const exo = exos.find((e) => e.id === btn.dataset.id);
      startExerciseV2(exo);
    })
  );
}

// === DÉMARRAGE DE L’EXERCICE ===
function startExerciseV2(exo) {
  currentExercise = exo;
  currentCount = 0;

  showCoachToast(`Let's go pour un ${exo.type} ! ${exo.goal}`, "#00ff99");

  const zone = $("training-session");
  $("training-exercises").style.display = "none";
  zone.style.display = "block";

  const objectif = exo.objectif || 10;

  zone.innerHTML = `
    <div class="training-session-card">
      <h3>${exo.name}</h3>
      <p>${exo.goal}</p>
      
      <div id="coach-training" class="coach-block">
        <div class="coach-avatar">😎</div>
        <div class="coach-text">Fais chauffer le swing !</div>
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
        <button class="btn secondary" id="change-exo">Changer d'exercice</button>
      </div>
    </div>
  `;

  // === ACTIONS ===
  $("btn-add-success").addEventListener("click", () => {
    if (currentCount < objectif) {
      currentCount++;
      const percent = (currentCount / objectif) * 100;
      $("progress-fill").style.width = percent + "%";
      $("progress-label").textContent = `Progression : ${currentCount} / ${objectif}`;
      showDynamicFeedback(currentCount, objectif);
    }
  });

  $("save-perf").addEventListener("click", () => savePerformanceV2(exo, objectif));
  $("change-exo").addEventListener("click", resetTrainingView);
}

// === FEEDBACK DYNAMIQUE DU COACH ===
function showDynamicFeedback(count, objectif) {
  const ratio = (count / objectif) * 100;

  if (ratio === 100) {
    showCoachToast("💚 Parfect ! Objectif atteint avec style !");
  } else if (ratio >= 80) {
    showCoachToast("💪 Presque Parfect ! Un peu plus de focus !");
  } else if (ratio >= 50) {
    showCoachToast("🧠 Reste patient, la régularité arrive.");
  } else {
    showCoachToast("🚀 Continue, chaque coup te rapproche du flow !");
  }
}

// === SAUVEGARDE ===
function savePerformanceV2(exo, objectif) {
  const perfInput = $("perf-input").value.trim();
  const note = $("note-input").value.trim();

  const perfText =
    perfInput ||
    `${currentCount}/${objectif} réussis (${Math.round(
      (currentCount / objectif) * 100
    )}%)`;

  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  const entry = {
    date: new Date().toISOString(),
    type: exo.type,
    name: exo.name,
    goal: exo.goal,
    perf: perfText,
    note,
  };
  data.push(entry);
  localStorage.setItem(TRAINING_KEY, JSON.stringify(data));

  showCoachToast("📊 Entraînement enregistré !", "#44ffaa");
  showEndModalV2(exo);
}

// === MODALE DE FIN ===
function showEndModalV2(exo) {
  const modal = document.createElement("div");
  modal.className = "end-modal";
  modal.innerHTML = `
    <div class="end-content">
      <h3>✅ Bien joué !</h3>
      <p>Tu veux recommencer cet exo ou en changer ?</p>
      <div class="end-actions">
        <button class="btn" id="restart-exo">🔁 Refaire</button>
        <button class="btn" id="new-exo">↩️ Nouveau</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $("restart-exo").addEventListener("click", () => {
    modal.remove();
    startExerciseV2(exo);
  });

  $("new-exo").addEventListener("click", () => {
    modal.remove();
    resetTrainingView();
  });
}

// === REINITIALISATION ===
function resetTrainingView() {
  $("training-session").innerHTML = "";
  $("training-session").style.display = "none";
  $("training-exercises").style.display = "block";
}

// === EXPORT GLOBAL ===
window.trainingV2Loaded = true;
console.log("✅ Training V2 ready!");
