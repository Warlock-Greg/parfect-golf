// js/training.js
import { fetchExercises } from "./data.js";
import { tipAfterPractice } from "./coach.js";
import { showCoachIA, hideCoachIA, initCoachIA } from "./coachIA.js";
import { showTrainingCoachFeedback } from "./coachTraining.js";

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
    .map((t) => `<button class="btn training-type" data-type="${t}">${t.toUpperCase()}</button>`)
    .join("");


  initCoachIA(); // ✅ Coach prêt aussi sur la page entraînement
  


  document.querySelectorAll(".training-type").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedType = btn.dataset.type;
      setActiveTypeButton(selectedType);
      loadExercises(selectedType);
    })
  );

  exercises = await fetchExercises();
}

function setActiveTypeButton(type) {
  document.querySelectorAll(".training-type").forEach((b) => b.classList.remove("active-type"));
  document.querySelector(`.training-type[data-type="${type}"]`)?.classList.add("active-type");
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
  showCoachIA(); // 💬 Le coach s’affiche quand un exercice commence
  
  $("training-exercises").style.display = "none";

  const objectif = exo.objectif || 10;
  let currentCount = 0;

  const defaultMedia = {
    putting: "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/putting_default.jpg",
    chipping: "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/chipping_default.jpg",
    driving: "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/driving_default.jpg",
    irons: "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/irons_default.jpg",
    mental: "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/mental_default.jpg"
  };

  const mediaUrl = exo.media || defaultMedia[exo.type.toLowerCase()] || defaultMedia.putting;
  const mediaBlock = mediaUrl.endsWith(".mp4")
    ? `<video src="${mediaUrl}" controls class="exo-media"></video>`
    : `<img src="${mediaUrl}" alt="${exo.name}" class="exo-media" />`;

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

  showTrainingCoachFeedback({
    drillName: exo.name,
    series: 1,
    hits: 0,
    avgScore: 0,
    focus: exo.type,
  });

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
    if (!perf) return alert("Indique ta performance.");

    savePerformance({ ...exo, perf, note });

    showTrainingCoachFeedback({
      drillName: exo.name,
      series: 1,
      hits: currentCount,
      avgScore: objectif - currentCount,
      focus: exo.type,
    });

    setTimeout(() => {
      window.location.href = "training-history.html";
    }, 8500);
  });
}

function savePerformance(entry) {
  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  data.push({ date: new Date().toISOString(), ...entry });
  localStorage.setItem(TRAINING_KEY, JSON.stringify(data));
}
