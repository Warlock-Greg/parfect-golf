// === TRAINING.JS – Parfect.golfr MVP+ (v2) ===
console.log("🏋️ Parfect.golfr Training.js chargé");

// Helper global (utilise celui de play.js si déjà défini)
if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

let EXERCISES_CACHE = null;

// --- Chargement des exercices (avec cache) ---
async function loadExercises() {
  if (EXERCISES_CACHE) return EXERCISES_CACHE;
  try {
    const res = await fetch("./data/exercises.json");
    const data = await res.json();
    EXERCISES_CACHE = data;
    return data;
  } catch (err) {
    console.error("❌ Erreur chargement exercises.json", err);
    return [];
  }
}

// --- Initialisation du mode Entraînement ---
async function initTraining() {
  console.log("🏋️ Mode Training lancé");

  const container = $$("coach-log");
  if (!container) {
    console.warn("⚠️ coach-log introuvable");
    return;
  }

  container.innerHTML = `
    <p style="color:#00ff99;">🧠 Préparation de ta zone d'entraînement...</p>
  `;

  // Si un coach est déjà choisi (play ou training), on l’utilise directement
  const existingCoach = localStorage.getItem("coach");
  if (existingCoach) {
    showCoachIA?.(`🏋️ ${existingCoach} t’accompagne pour cette session d’entraînement.`);
    showTrainingExerciseSelect();
  } else {
    showTrainingCoachSelectModal();
  }
}

// --- Modale de sélection du coach (version Training) ---
function showTrainingCoachSelectModal() {
  // Empêche d’ouvrir deux fois la même modale
  if (document.querySelector(".modal-backdrop.training-coach-modal")) return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop training-coach-modal";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:center;padding:20px;">
      <h2 style="color:#00ff99;">🎯 Choisis ton coach pour l'entraînement</h2>
      <p style="color:#ccc;margin-bottom:16px;">Chaque coach a sa vibe pour t’aider à forger ton mental.</p>

      <div class="coach-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button class="coach-choice btn" data-coach="Dorothee">💚 Dorothée<br><small>Bienveillance & Flow</small></button>
        <button class="coach-choice btn" data-coach="Gauthier">🔵 Gauthier<br><small>Technique mentale</small></button>
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
    Dorothee: "💚 Douce, bienveillante, elle t’accompagne sans pression. Focus sur le calme et la respiration.",
    Gauthier: "🔵 Posé et précis. Il t’aide à structurer ta pratique et à comprendre ton plan de progression.",
    Greg: "💥 Dynamique et méthodique. Il te pousse à performer avec des mini-défis et des données mentales.",
    Chill: "🌿 Relax et intuitif. Il t’aide à relâcher la tension pour retrouver ton flow."
  };

  modal.querySelectorAll(".coach-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".coach-choice").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCoach = btn.dataset.coach;
      desc.textContent = coachProfiles[selectedCoach] || "Coach sélectionné.";
      desc.style.color = "#aaa";
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

    showCoachIA?.(`🏋️ ${selectedCoach} t’accompagne pour cette session d’entraînement.`);
    showTrainingExerciseSelect();
  });
}

// --- Étape 2 : affichage des exercices depuis le JSON ---
async function showTrainingExerciseSelect() {
  const log = $$("coach-log");
  if (!log) return;

  log.innerHTML = `<p style="color:#00ff99;">📂 Chargement des exercices...</p>`;

  const exercises = await loadExercises();
  if (!exercises.length) {
    log.innerHTML = `<p style="color:#f55;">❌ Impossible de charger les exercices.</p>`;
    return;
  }

  const types = [...new Set(exercises.map((e) => e.type))];

  log.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h3 style="color:#00ff99;margin:0;">Choisis un domaine :</h3>
      <button id="change-coach-training" class="btn" style="font-size:0.75rem;padding:4px 8px;">Changer de coach</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:12px;">
      ${types
        .map(
          (t) =>
            `<button class="btn training-type" data-type="${t}">
              ${t.charAt(0).toUpperCase() + t.slice(1)}
            </button>`
        )
        .join("")}
    </div>
    <div id="training-list" style="margin-top:10px;text-align:left;"></div>
  `;

  // Changer de coach
  $$("change-coach-training")?.addEventListener("click", showTrainingCoachSelectModal);

  // Choix du type
  log.querySelectorAll(".training-type").forEach((btn) => {
    btn.addEventListener("click", () => {
      log.querySelectorAll(".training-type").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const selectedType = btn.dataset.type;
      const filtered = exercises.filter((e) => e.type === selectedType);
      const list = log.querySelector("#training-list");

      list.innerHTML = `
        <h4 style="color:#00ff99;margin:6px 0 8px;">Exercices ${selectedType} :</h4>
        ${filtered
          .map(
            (e) => `
          <div class="exercise-card" style="background:#111;border:1px solid #333;border-radius:8px;padding:10px;margin-top:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong>${e.name}</strong><br>
                <small style="color:#aaa;">🎯 ${e.goal}</small><br>
                <small style="color:#777;">Objectif : ${e.objectif}</small>
              </div>
              <button class="btn start-exo" data-id="${e.id}" style="margin-left:8px;">Démarrer</button>
            </div>
          </div>
        `
          )
          .join("")}
      `;

      list.querySelectorAll(".start-exo").forEach((b) => {
        b.addEventListener("click", () => startTrainingSession(b.dataset.id));
      });
    });
  });
}

// --- Étape 3 : Lancement de la session ---
async function startTrainingSession(exoId) {
  const log = $$("coach-log");
  if (!log) return;

  const exercises = await loadExercises();
  const exo = exercises.find((e) => e.id === exoId);
  if (!exo) {
    log.innerHTML = `<p style="color:#f55;">❌ Exercice introuvable.</p>`;
    return; 
  }

  const hasVideo = exo.media && exo.media.trim() !== "";

log.innerHTML = `
  <h3 style="color:#00ff99;">🏋️ ${exo.name}</h3>

  <div class="training-layout ${hasVideo ? "has-video" : "no-video"}">

    <div class="training-video">
      ${
        hasVideo
          ? `<video src="${exo.media}" controls playsinline></video>`
          : ``
      }
    </div>

    <div class="training-content">
      <p style="margin-top:8px;">🎯 Objectif : ${exo.goal}</p>
      <p style="margin-top:4px;font-size:0.9rem;color:#aaa;">
        Cible : <strong>${exo.objectif}</strong> répétitions / essais.
      </p>

      <div style="margin-top:14px;text-align:left;">
        <p style="margin-bottom:6px;">📝 Comment tu évalues ta séance ?</p>

        <div id="training-quality" style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn quality-btn" data-quality="success">✅ Réussi</button>
          <button class="btn quality-btn" data-quality="medium">😌 Moyen</button>
          <button class="btn quality-btn" data-quality="hard">😵 Difficile</button>
        </div>

        <div style="margin-top:14px;">
          <label for="mental-feeling" style="font-size:0.9rem;">🧠 Ressenti mental :</label><br>
          <input id="mental-feeling" type="range" min="1" max="5" value="3" style="width:100%;margin-top:6px;">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#aaa;">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
          <p id="mental-label" style="margin-top:4px;font-size:0.9rem;color:#ccc;">Niveau : 3/5</p>
        </div>

        <div style="margin-top:16px;display:flex;justify-content:space-between;gap:10px;">
          <button id="back-to-exercises" class="btn" style="flex:1;">↩️ Retour</button>
          <button id="validate-training" class="btn" style="flex:1;background:#00ff99;color:#111;">
            ✅ Valider la séance
          </button>
        </div>
      </div>
    </div>
  </div>
`;


  let selectedQuality = null;

  // Sélection qualité
  log.querySelectorAll(".quality-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      log.querySelectorAll(".quality-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedQuality = btn.dataset.quality;
    });
  });

  // Slider ressenti
  const feelingInput = $$("mental-feeling");
  const feelingLabel = $$("mental-label");
  feelingInput?.addEventListener("input", () => {
    feelingLabel.textContent = `Niveau : ${feelingInput.value}/5`;
  });

  // Retour aux exercices
  $$("back-to-exercises")?.addEventListener("click", showTrainingExerciseSelect);

  // Validation séance
  $$("validate-training")?.addEventListener("click", () => {
    if (!selectedQuality) {
      // petit feedback visuel
      const q = $$("training-quality");
      q.style.animation = "shake 0.2s";
      setTimeout(() => (q.style.animation = ""), 200);
      return;
    }
    const mentalScore = parseInt(feelingInput?.value || "3", 10);
    recordTrainingAndRecap(exo, selectedQuality, mentalScore);
  });
}

// --- Étape 4 : Enregistrement + Récapitulatif ---
function recordTrainingAndRecap(exo, quality, mentalScore) {
  const history = JSON.parse(localStorage.getItem("trainingHistory") || "[]");
  const coach = localStorage.getItem("coach") || "Inconnu";

  const entry = {
    id: exo.id,
    type: exo.type,
    name: exo.name,
    objectif: exo.objectif,
    quality,           // "success" | "medium" | "hard"
    mentalScore,       // 1..5
    coach,
    date: new Date().toISOString()
  };

  history.push(entry);
  localStorage.setItem("trainingHistory", JSON.stringify(history));

  const log = $$("coach-log");
  if (!log) return;

  const qualityText =
    quality === "success"
      ? "✅ Tu as validé l’objectif ou tu en es très proche. Séance solide."
      : quality === "medium"
      ? "😌 Séance correcte, tu as travaillé mais tu peux encore stabiliser."
      : "😵 Séance difficile, mais ultra utile pour progresser mentalement.";

  log.innerHTML = `
    <div style="text-align:center;margin-top:20px;">
      <h3 style="color:#00ff99;">✅ Entraînement enregistré</h3>
      <p style="margin:4px 0;">Coach : <strong>${coach}</strong></p>
      <p style="margin:4px 0;">Exercice : <strong>${exo.name}</strong></p>
      <p style="margin:4px 0;">Qualité ressentie : <strong>${
        quality === "success" ? "Réussi" : quality === "medium" ? "Moyen" : "Difficile"
      }</strong></p>
      <p style="margin:4px 0;">Ressenti mental : <strong>${mentalScore}/5</strong></p>
      <p style="margin-top:8px;color:#ccc;font-size:0.9rem;">${qualityText}</p>
      <button id="back-training" class="btn" style="margin-top:12px;">↩️ Revenir aux exercices</button>
    </div>
  `;

  showCoachIA?.(`🧠 ${coach} : belle séance "${exo.name}". Ce ressenti ${quality === "success" ? "positif" : "authentique"} est précieux.`);

  $$("back-training")?.addEventListener("click", showTrainingExerciseSelect);
}

// --- Export global ---
window.initTraining = initTraining;


