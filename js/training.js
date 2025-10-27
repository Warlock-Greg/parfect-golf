// === TRAINING.JS ===
// Chargement de la liste d’exercices depuis exercices.json + filtre par type

let allExercises = [];

async function initTraining() {
  const container = document.getElementById("coach-log");
  if (!container) {
    console.warn("⚠️ Élément #coach-log introuvable");
    return;
  }

  try {
    const res = await fetch("./data/exercices.json");
    allExercises = await res.json();

    renderExerciseList("all");
  } catch (err) {
    console.error("❌ Erreur chargement exercices.json :", err);
    container.innerHTML = `<p style="color:#f55;">Erreur de chargement des exercices</p>`;
  }
}

// --- Rendu filtré ---
function renderExerciseList(filterType) {
  const container = document.getElementById("coach-log");
  if (!container) return;

  // Filtrage
  const filtered = filterType === "all"
    ? allExercises
    : allExercises.filter(ex => ex.type === filterType);

  // Rendu des boutons de filtre
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

  // Rendu des exercices
  const listHTML = filtered.map(ex => `
    <div class="training-card" style="background:#111;border:1px solid #222;border-radius:8px;padding:10px;">
      <h4 style="color:#00ff99;margin-bottom:4px;">${ex.name}</h4>
      <p style="color:#ccc;margin-top:0;">${ex.goal}</p>
      <video src="${ex.media}" controls style="width:100%;border-radius:8px;margin-top:8px;"></video>
    </div>
  `).join("");

  container.innerHTML = `
    <h3 style="color:#00ff99;">🧠 Entraînement mental & technique</h3>
    ${filterBar}
    <div style="display:flex;flex-direction:column;gap:12px;">${listHTML}</div>
  `;

  // Gestion du clic sur les boutons de filtre
  document.querySelectorAll("#filter-bar button").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");
      renderExerciseList(type);
    });
  });
}

// --- Expose globalement pour main.js ---
window.initTraining = initTraining;

