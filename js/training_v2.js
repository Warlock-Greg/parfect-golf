// js/training_v2.js
import { fetchExercises } from "./data.js";
import { tipAfterPractice } from "./coach.js";

const $ = (id) => document.getElementById(id);
const TRAINING_KEY = "trainingHistoryV2";

let exercises = [];
let selectedType = null;
let currentExercise = null;
let playerMood = null;
let trainingGoal = null;

// === INIT ===
document.addEventListener("DOMContentLoaded", () => initTrainingV2());

async function initTrainingV2() {
  console.log("🚀 Training V2 lancé");

  // Étape 1 : mood & objectif du jour
  await showTrainingIntroModal();

  // Étape 2 : liste des types d'exercices
  const types = ["putting", "chipping", "driving", "irons", "mental"];
  const typeZone = $("training-type");
  typeZone.innerHTML = types
    .map(
      (t) => `<button class="btn training-type" data-type="${t}">${t.toUpperCase()}</button>`
    )
    .join("");

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

// === Modale d’intro (mood + objectif) ===
function showTrainingIntroModal() {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal-card" style="max-width:420px;text-align:center;">
        <h2>👋 Salut !</h2>
        <p>Avant de commencer ta session, dis-moi :</p>

        <h4>Ton mood du jour ?</h4>
        <div id="mood-buttons" style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
          <button class="btn mood" data-mood="focus">🎯 Focus</button>
          <button class="btn mood" data-mood="chill">😌 Chill</button>
          <button class="btn mood" data-mood="determined">🔥 Déterminé</button>
          <button class="btn mood" data-mood="fatigue">💤 Fatigué</button>
        </div>

        <h4 style="margin-top:12px;">Objectif de la session :</h4>
        <div id="goal-buttons" style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
          <button class="btn goal" data-goal="routine">Routine</button>
          <button class="btn goal" data-goal="précision">Précision</button>
          <button class="btn goal" data-goal="distance">Distance</button>
          <button class="btn goal" data-goal="mental">Mental</button>
        </div>

        <div style="margin-top:16px;">
          <button id="start-training" class="btn" disabled>Démarrer 💪</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    let moodSelected = false;
    let goalSelected = false;

    backdrop.querySelectorAll(".mood").forEach((btn) =>
      btn.addEventListener("click", () => {
        playerMood = btn.dataset.mood;
        backdrop.querySelectorAll(".mood").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        moodSelected = true;
        enableStart();
      })
    );

    backdrop.querySelectorAll(".goal").forEach((btn) =>
      btn.addEventListener("click", () => {
        trainingGoal = btn.dataset.goal;
        backdrop.querySelectorAll(".goal").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        goalSelected = true;
        enableStart();
      })
    );

    function enableStart() {
      if (moodSelected && goalSelected) $("start-training").disabled = false;
    }

    $("start-training").addEventListener("click", () => {
      backdrop.remove();
      showCoachToast(`Let's go ! ${playerMood} mood et objectif ${trainingGoal} 💚`, "#00ff99");
      resolve();
    });
  });
}

// === AFFICHAGE EXERCICES ===
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

// === LANCEMENT EXERCICE ===
function startExercise(exo) {
  currentExercise = exo;
  const zone = $("training-session");
  $("training-exercises").style.display = "none";

  const objectif = exo.objectif || 10;
  let currentCount = 0;

  const coach = tipAfterPractice(exo.type, "fun");

  zone.innerHTML = `
    <div class="training-session-card">
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
        <button class="btn secondary" id="change-exo">🔁 Changer</button>
      </div>
    </div>
  `;

  $("change-exo").addEventListener("click", () => {
    $("training-exercises").style.display = "block";
    zone.innerHTML = "";
  });

  $("btn-add-success").addEventListener("click", () => {
    if (currentCount < objectif) {
      currentCount++;
      const percent = (currentCount / objectif) * 100;
      $("progress-fill").style.width = percent + "%";
      $("progress-label").textContent = `Progression : ${currentCount} / ${objectif}`;
    }
  });

  $("save-perf").addEventListener("click", () => {
    const perf =
      $("perf-input").value.trim() ||
      `${currentCount}/${objectif} réussis (${Math.round((currentCount / objectif) * 100)}%)`;
    const note = $("note-input").value.trim();

    const entry = {
      ...exo,
      date: new Date().toISOString(),
      perf,
      note,
      mood: playerMood,
      goal: trainingGoal,
    };

    savePerformance(entry);
    showCoachFeedback(entry);
    renderHistory();
  });
}

// === SAUVEGARDE ===
function savePerformance(entry) {
  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  data.push(entry);
  localStorage.setItem(TRAINING_KEY, JSON.stringify(data));
}

// === FEEDBACK COACH APRÈS ENTRAINEMENT ===
function showCoachFeedback(entry) {
  const perfScore = parseInt(entry.perf) || 0;
  let msg = "";

  if (perfScore >= 80) msg = "💚 Super session ! Ta régularité est en hausse.";
  else if (perfScore >= 50) msg = "👍 Bon travail, reste dans ta routine.";
  else msg = "😅 Pas grave, chaque session te rapproche du flow.";

  showCoachToast(`${msg} (${entry.mood} mood / objectif ${entry.goal})`, "#00ff99");
}

// === HISTORIQUE ===
function renderHistory() {
  const histZone = $("training-history");
  if (!histZone) return;

  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  if (!data.length) {
    histZone.innerHTML = "<p style='opacity:.6'>Aucun entraînement enregistré (V2).</p>";
    return;
  }

  data.sort((a, b) => new Date(b.date) - new Date(a.date));

  histZone.innerHTML = `
    <h3>📜 Historique V2</h3>
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
              <div><strong>${h.name}</strong> (${h.type})</div>
              <div style="font-size:.85rem;opacity:.8">${d} · Mood: ${h.mood} · Obj: ${h.goal}</div>
              <div>Perf : ${h.perf}</div>
              ${h.note ? `<div style="opacity:.8;">${h.note}</div>` : ""}
            </div>`;
        })
        .join("")}
    </div>
  `;
}

