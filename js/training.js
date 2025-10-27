// === TRAINING.JS — Version interactive avec Coach IA ===

let allExercises = [];
let currentExercise = null;

// === Initialisation principale ===
async function initTraining() {
  const container = document.getElementById("coach-log");
  if (!container) {
    console.warn("⚠️ Élément #coach-log introuvable");
    return;
  }

  try {
    const res = await fetch("./data/exercises.json");
    allExercises = await res.json();
    renderExerciseList("all");
  } catch (err) {
    console.error("❌ Erreur chargement exercises.json :", err);
    container.innerHTML = `<p style="color:#f55;">Erreur de chargement des exercices</p>`;
  }
}

// === Rendu de la liste filtrée ===
function renderExerciseList(filterType) {
  const container = document.getElementById("coach-log");
  if (!container) return;

  const filtered = filterType === "all"
    ? allExercises
    : allExercises.filter(ex => ex.type === filterType);

  const filterBar = `
    <div id="filter-bar" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:12px;">
      ${["all","putting","chipping","driving","irons","mental"].map(type => `
        <button class="btn" data-type="${type}"
          style="background:${filterType===type ? '#fff' : '#00ff99'};color:${filterType===type ? '#111' : '#000'};">
          ${type === "all" ? "Tous" : type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      `).join("")}
    </div>
  `;

  const listHTML = filtered.map(ex => `
    <div class="training-card" data-id="${ex.id}"
         style="background:#111;border:1px solid #222;border-radius:8px;padding:10px;cursor:pointer;">
      <h4 style="color:#00ff99;margin-bottom:4px;">${ex.name}</h4>
      <p style="color:#ccc;margin-top:0;">${ex.goal}</p>
      <video src="${ex.media}" muted style="width:100%;border-radius:8px;margin-top:8px;"></video>
    </div>
  `).join("");

  container.innerHTML = `
    <h3 style="color:#00ff99;">🧠 Choisis ton exercice</h3>
    ${filterBar}
    <div style="display:flex;flex-direction:column;gap:12px;">${listHTML}</div>
  `;

  // Filtres
  document.querySelectorAll("#filter-bar button").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");
      renderExerciseList(type);
    });
  });

  // 🔹 Cliquer sur un exo => lancer la session
  document.querySelectorAll(".training-card").forEach(card => {
    card.addEventListener("click", () => {
      const exo = allExercises.find(e => e.id === card.dataset.id);
      if (exo) startExercise(exo);
    });
  });
}

// === Lancer un exercice ===
function startExercise(exo) {
  currentExercise = exo;

  const container = document.getElementById("coach-log");
  container.innerHTML = `
    <h3 style="color:#00ff99;">${exo.name}</h3>
    <p>${exo.goal}</p>
    <video src="${exo.media}" controls autoplay style="width:100%;border-radius:8px;margin:8px 0;"></video>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">
      <button id="success-btn" class="btn">✅ Réussi</button>
      <button id="fail-btn" class="btn">❌ Pas encore</button>
      <button id="talk-btn" class="btn">💬 Parler au coach</button>
    </div>
  `;

  // 🧠 Message du coach
  if (typeof showCoachIA === "function") {
    showCoachIA(`🎯 Allez, objectif : ${exo.goal}`);
  }

  // Gestion des actions
  document.getElementById("success-btn").addEventListener("click", () => finishExercise(true));
  document.getElementById("fail-btn").addEventListener("click", () => finishExercise(false));
  document.getElementById("talk-btn").addEventListener("click", () => {
    if (typeof showCoachIA === "function") showCoachIA("💬 Raconte-moi ton ressenti sur cet exercice.");
  });
}

// === Fin d’un exercice ===
function finishExercise(success) {
  const container = document.getElementById("coach-log");

  const msg = success
    ? `💚 Super travail sur "${currentExercise.name}" ! Routine validée 👏`
    : `😅 Ce n’est pas encore parfait sur "${currentExercise.name}" — continue à t’entraîner.`;

  // 🧠 Réaction du coach
  if (typeof showCoachIA === "function") {
    showCoachIA(msg);
  }

  // Sauvegarde locale
  const history = JSON.parse(localStorage.getItem("trainingHistory") || "[]");
  history.push({
    id: currentExercise.id,
    name: currentExercise.name,
    date: new Date().toISOString(),
    success
  });
  localStorage.setItem("trainingHistory", JSON.stringify(history));

  // Interface de fin
  container.innerHTML = `
    <h3>${msg}</h3>
    <button class="btn" id="back-training" style="margin-top:12px;">⬅️ Retour aux exercices</button>
  `;

  document.getElementById("back-training").addEventListener("click", () => renderExerciseList("all"));
}

// === Export global ===
window.initTraining = initTraining;
