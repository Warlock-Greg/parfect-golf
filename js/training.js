// === TRAINING.JS – Parfect.golfr MVP+ ===

// Helper
const $$ = (id) => document.getElementById(id);

// --- Initialisation du mode Entraînement ---
async function initTraining() {
  console.log("🏋️ Mode Training lancé");

  const container = $$("coach-log");
  if (!container) {
    console.warn("⚠️ coach-log introuvable");
    return;
  }

  // Étape 1 : choisir le coach
  showTrainingCoachSelectModal();
}

// --- Modale de sélection du coach (version Training) ---
function showTrainingCoachSelectModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:center;padding:20px;">
      <h2 style="color:#00ff99;">🎯 Choisis ton coach pour l'entraînement</h2>
      <p style="color:#ccc;margin-bottom:16px;">Chaque coach a sa méthode pour t’aider à progresser mentalement.</p>

      <div class="coach-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button class="coach-choice btn" data-coach="Dorothee">💚 Dorothée<br><small>Bienveillance & Flow</small></button>
        <button class="coach-choice btn" data-coach="Goathier">🔵 Goathier<br><small>Technique mentale</small></button>
        <button class="coach-choice btn" data-coach="Greg">💥 Greg<br><small>Énergie & Data</small></button>
        <button class="coach-choice btn" data-coach="Chill">🌿 Chill<br><small>Zen & Flow</small></button>
      </div>

      <p id="coach-desc" style="margin-top:14px;font-style:italic;color:#aaa;">Clique sur un coach pour voir sa vibe.</p>
      <button id="validate-coach" class="btn" style="margin-top:18px;background:#00ff99;color:#111;">Valider</button>
    </div>
  `;
  document.body.appendChild(modal);

  let selectedCoach = null;
  const desc = modal.querySelector("#coach-desc");

  const coachProfiles = {
    "Dorothee": "💚 Douce, bienveillante, elle t’accompagne sans pression. Focus sur le calme et la respiration.",
    "Goathier": "🔵 Posé et précis. Il t’aide à structurer ta pratique et à comprendre ton plan de progression.",
    "Greg": "💥 Dynamique et méthodique. Il te pousse à performer avec des mini-défis et des données mentales.",
    "Chill": "🌿 Relax et intuitif. Il t’aide à relâcher la tension pour retrouver ton flow."
  };

  modal.querySelectorAll(".coach-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".coach-choice").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCoach = btn.dataset.coach;
      desc.textContent = coachProfiles[selectedCoach];
    });
  });

  modal.querySelector("#validate-coach").addEventListener("click", () => {
    if (!selectedCoach) {
      desc.textContent = "👉 Choisis ton coach avant de valider.";
      desc.style.color = "#f66";
      return;
    }

    localStorage.setItem("coach", selectedCoach);
    modal.remove();

    showCoachIA(`🏋️ ${selectedCoach} t’accompagne pour cette session d’entraînement.`);
    showTrainingExerciseSelect(); // Étape suivante
  });
}

// --- Étape 2 : affichage des exercices depuis le JSON ---
async function showTrainingExerciseSelect() {
  const log = $$("coach-log");
  log.innerHTML = `<p style="color:#00ff99;">📂 Chargement des exercices...</p>`;

  try {
    const res = await fetch("./data/exercises.json");
    const exercises = await res.json();

    // Regroupement par type
    const types = [...new Set(exercises.map(e => e.type))];

    log.innerHTML = `
      <h3 style="color:#00ff99;">Choisis un domaine :</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        ${types.map(t => `<button class="btn training-type" data-type="${t}">${t}</button>`).join("")}
      </div>
      <div id="training-list" style="margin-top:20px;"></div>
    `;

    log.querySelectorAll(".training-type").forEach(btn => {
      btn.addEventListener("click", () => {
        const selectedType = btn.dataset.type;
        const filtered = exercises.filter(e => e.type === selectedType);
        const list = log.querySelector("#training-list");
        list.innerHTML = `
          <h4 style="color:#00ff99;margin-top:10px;">Exercices ${selectedType} :</h4>
          ${filtered.map(e => `
            <div class="exercise-card" style="background:#111;border:1px solid #333;border-radius:8px;padding:8px;margin-top:6px;text-align:left;">
              <strong>${e.name}</strong><br>
              <small>${e.goal}</small><br>
              <button class="btn start-exo" data-id="${e.id}" style="margin-top:6px;">Démarrer</button>
            </div>
          `).join("")}
        `;

        list.querySelectorAll(".start-exo").forEach(b => {
          b.addEventListener("click", () => startTrainingSession(b.dataset.id));
        });
      });
    });
  } catch (err) {
    log.innerHTML = `<p style="color:#f55;">Erreur de chargement des exercices.</p>`;
    console.error(err);
  }
}

// --- Étape 3 : Lancement de la session ---
async function startTrainingSession(exoId) {
  const res = await fetch("./data/exercises.json");
  const exercises = await res.json();
  const exo = exercises.find(e => e.id === exoId);
  if (!exo) return;

  const log = $$("coach-log");
  log.innerHTML = `
    <h3 style="color:#00ff99;">🏋️ ${exo.name}</h3>
    <video src="${exo.media}" controls style="width:100%;border-radius:8px;margin-top:8px;"></video>
    <p style="margin-top:8px;">🎯 Objectif : ${exo.goal}</p>
    <div style="margin-top:12px;">
      <input id="training-result" type="number" min="0" placeholder="Résultat..." style="padding:6px;border-radius:6px;width:60px;text-align:center;">
      <button id="validate-training" class="btn" style="margin-left:8px;">Valider</button>
    </div>
  `;

  const validateBtn = $$("validate-training");
  validateBtn.addEventListener("click", async () => {
    const result = parseInt($$("training-result").value || "0");
    const coach = localStorage.getItem("coach") || "Greg";
    const context = result >= exo.objectif ? "training_focus" : "training_relax";
    const comment = await getCoachComment(coach, context);

    showCoachIA(`💬 ${comment}`);
    showCoachToast("💚 Exercice enregistré !");
  });
}

// --- Export global ---
window.initTraining = initTraining;
