// === Parfect.golfr - training.js (MVP sans module) ===
console.log("🏋️ Training ready");

window.$ = (id) => document.getElementById(id);
const TRAINING_KEY = "trainingHistory";

let exercises = [];
let selectedType = null;

// === Init ===
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.fetchExercises) {
    console.warn("⚠️ fetchExercises non défini — charger data.js avant training.js");
    return;
  }
  exercises = await window.fetchExercises();
  renderTypeButtons();
  renderHistory();
});

function renderTypeButtons() {
  const types = ["putting", "chipping", "driving", "irons", "mental"];
  const zone = $("training-type");
  zone.innerHTML = types.map(t => `<button class="btn training-type" data-type="${t}">${t.toUpperCase()}</button>`).join("");
  document.querySelectorAll(".training-type").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedType = btn.dataset.type;
      renderExercises(selectedType);
    });
  });
}

function renderExercises(type) {
  const zone = $("training-exercises");
  const list = exercises.filter(e => e.type === type);
  zone.innerHTML = list.map(e => `
    <button class="btn exo-btn" data-id="${e.id}">${e.name} — <small>${e.goal}</small></button>
  `).join("");
  zone.querySelectorAll(".exo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const exo = list.find(e => e.id === btn.dataset.id);
      startExercise(exo);
    });
  });
}

function startExercise(exo) {
  const zone = $("training-session");
  zone.innerHTML = `
    <div class="training-card">
      <h3>${exo.name}</h3>
      <p>${exo.goal}</p>
      <button id="done-btn" class="btn">✅ Terminé</button>
      <button id="back-btn" class="btn secondary">↩️ Retour</button>
    </div>`;
  $("training-exercises").style.display = "none";

  $("done-btn").onclick = () => {
    saveTraining(exo);
    $("training-exercises").style.display = "block";
    zone.innerHTML = "";
    renderHistory();
  };

  $("back-btn").onclick = () => {
    $("training-exercises").style.display = "block";
    zone.innerHTML = "";
  };
}

function saveTraining(exo) {
  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  data.push({ date: new Date().toISOString(), ...exo });
  localStorage.setItem(TRAINING_KEY, JSON.stringify(data));
}

function renderHistory() {
  const zone = $("training-history");
  const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
  if (!data.length) {
    zone.innerHTML = "<p style='opacity:.6'>Aucun entraînement enregistré.</p>";
    return;
  }
  zone.innerHTML = data.map(d => {
    const date = new Date(d.date).toLocaleDateString("fr-FR");
    return `<div><strong>${d.name}</strong> (${d.type}) — ${date}</div>`;
  }).join("");
}
