// === TRAINING.JS — Parfect.golfr Zen 2026 (refactor coach) ===
console.log("🏋️ Training (Zen 2026) chargé");

if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

let EXERCISES_CACHE = null;
let CURRENT_OBJECTIVE = localStorage.getItem("trainingObjective") || "SKIP";
let CURRENT_COACH = localStorage.getItem("coach") || null;

// -----------------------------
// Data
// -----------------------------
async function loadExercises() {
  if (EXERCISES_CACHE) return EXERCISES_CACHE;

  try {
    const res = await fetch("./data/exercises.json");
    EXERCISES_CACHE = await res.json();
    return EXERCISES_CACHE;
  } catch (e) {
    console.error("Erreur chargement exercises", e);
    return [];
  }
}

// -----------------------------
// Coach helpers
// -----------------------------
function getTrainingHistory() {
  try {
    return JSON.parse(localStorage.getItem("trainingHistory") || "[]");
  } catch {
    return [];
  }
}

function setTrainingObjective(objective) {
  CURRENT_OBJECTIVE = objective || "SKIP";
  localStorage.setItem("trainingObjective", CURRENT_OBJECTIVE);
}

function getTrainingObjectiveLabel(code) {
  switch (code) {
    case "REGULARITE":
      return "Régularité";
    case "ZONE":
      return "Rester dans la zone";
    case "ROUTINE":
      return "Routine solide";
    case "CALME":
      return "Calme & intention";
    case "SCORE":
      return "Simple et efficace";
    default:
      return "Libre";
  }
}

function buildTrainingRecentSwingsFromSession() {
  return window.TrainingSession?.swings || [];
}

function buildTrainingContext(extra = {}) {
  if (typeof window.buildTrainingCoachContext !== "function") {
    return {};
  }

  return window.buildTrainingCoachContext({
    objective: CURRENT_OBJECTIVE || "SKIP",
    trainingType: extra.trainingType || "swing",
    recentSwings: buildTrainingRecentSwingsFromSession(),
    selfReport: extra.selfReport || {}
  });
}

async function requestTrainingCoach(userMessage, extra = {}) {
  try {
    const context = buildTrainingContext(extra);

    window.CoachMemory?.setLastTraining?.(context);

    return await window.requestCoach?.({
      mode: "training_session",
      context,
      userMessage,
      uiTarget: "whisper"
    });
  } catch (err) {
    console.warn("❌ requestTrainingCoach failed", err);
    return null;
  }
}

function refreshTrainingHeader() {
  const btn = document.getElementById("change-training-coach");
  const objectiveEl = document.getElementById("training-objective-label");

  if (btn) {
    btn.textContent = `Coach : ${CURRENT_COACH || "Choisir"}`;
  }

  if (objectiveEl) {
    objectiveEl.textContent = `Objectif : ${getTrainingObjectiveLabel(CURRENT_OBJECTIVE)}`;
  }
}

// -----------------------------
// Init Training
// -----------------------------
async function initTraining() {
  const root = document.getElementById("training-root");
  if (!root) return;

  CURRENT_COACH = localStorage.getItem("coach") || null;
  CURRENT_OBJECTIVE = localStorage.getItem("trainingObjective") || "SKIP";

  root.innerHTML = `
    <div class="pg-training-header">
      <div>
        <h2>Entraînement</h2>
        <p>Une intention. Une répétition consciente.</p>
        <p id="training-objective-label" class="pg-muted">
          Objectif : ${getTrainingObjectiveLabel(CURRENT_OBJECTIVE)}
        </p>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="change-training-objective" class="pg-btn-secondary">
          Objectif
        </button>
        <button id="change-training-coach" class="pg-btn-secondary">
          Coach : ${CURRENT_COACH || "Choisir"}
        </button>
      </div>
    </div>

    <div class="pg-training-body" id="training-body"></div>
  `;

  document
    .getElementById("change-training-coach")
    ?.addEventListener("click", showTrainingCoachSelectModal);

  document
    .getElementById("change-training-objective")
    ?.addEventListener("click", showTrainingObjectiveModal);

  // Coach humain non défini
  if (!CURRENT_COACH) {
    showTrainingCoachSelectModal();
    return;
  }

  refreshTrainingHeader();

  // Si pas d’objectif encore choisi → on propose
  if (!localStorage.getItem("trainingObjective")) {
    showTrainingObjectiveModal();
    return;
  }

  window.coachReact?.(
    `${CURRENT_COACH} t’accompagne pour cette séance. Objectif : ${getTrainingObjectiveLabel(CURRENT_OBJECTIVE)}.`
  );

  await requestTrainingCoach("Je démarre ma séance d'entraînement");

  showTrainingTypes();
}

// -----------------------------
// Coach selection (modal)
// -----------------------------
function showTrainingCoachSelectModal() {
  if (document.querySelector(".training-coach-modal")) return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop training-coach-modal";
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Choisis ton coach</h3>
      <div class="coach-grid">
        ${["Dorothee", "Gauthier", "Greg", "Chill"]
          .map((c) => `<button class="coach-choice" data-coach="${c}">${c}</button>`)
          .join("")}
      </div>
      <button class="pg-btn-primary" id="validate-coach">Valider</button>
    </div>
  `;
  document.body.appendChild(modal);

  let selected = null;

  modal.querySelectorAll(".coach-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".coach-choice").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selected = btn.dataset.coach;
    });
  });

  modal.querySelector("#validate-coach").onclick = async () => {
    if (!selected) return;

    CURRENT_COACH = selected;
    localStorage.setItem("coach", selected);
    modal.remove();

    refreshTrainingHeader();
    window.coachReact?.(`${selected} est avec toi.`);

    if (!localStorage.getItem("trainingObjective")) {
      showTrainingObjectiveModal();
      return;
    }

    await requestTrainingCoach("Le coach est choisi, donne-moi le focus de la séance");
    showTrainingTypes();
  };
}

// -----------------------------
// Objective selection
// -----------------------------
function showTrainingObjectiveModal() {
  if (typeof window.createObjectiveModal === "function") {
    const modal = window.createObjectiveModal({
      onSelect: async (objective) => {
        setTrainingObjective(objective);
        refreshTrainingHeader();

        await requestTrainingCoach(
          objective === "SKIP"
            ? "Je veux un focus simple pour ma séance"
            : `Je choisis l'objectif ${objective} pour ma séance`
        );

        showTrainingTypes();
      }
    });

    modal.open();
    return;
  }

  // fallback minimal si la modale n'est pas chargée
  setTrainingObjective("REGULARITE");
  refreshTrainingHeader();
  requestTrainingCoach("Je démarre une séance avec objectif régularité");
  showTrainingTypes();
}

// -----------------------------
// Step 1 : Types
// -----------------------------
async function showTrainingTypes() {
  const body = $$("training-body");
  if (!body) return;

  const exercises = await loadExercises();
  const types = [...new Set(exercises.map((e) => e.type))];

  body.innerHTML = `
    <div class="pg-training-types">
      ${types
        .map((t) => `<button class="pg-chip" data-type="${t}">${t}</button>`)
        .join("")}
    </div>
    <div id="training-list"></div>
  `;

  body.querySelectorAll(".pg-chip").forEach((btn) => {
    btn.onclick = async () => {
      await requestTrainingCoach(`Je veux travailler le type ${btn.dataset.type}`);
      showTrainingList(btn.dataset.type);
    };
  });
}

// -----------------------------
// Step 2 : Exercises
// -----------------------------
async function showTrainingList(type) {
  const list = $$("training-list");
  if (!list) return;

  const exercises = await loadExercises();
  const filtered = exercises.filter((e) => e.type === type);

  list.innerHTML = `
    <div class="pg-training-list">
      ${filtered
        .map(
          (e) => `
        <div class="pg-exercise-card">
          <h4>${e.name}</h4>
          <p>${e.goal}</p>
          <button class="pg-btn-secondary" data-id="${e.id}">Démarrer</button>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  list.querySelectorAll("button").forEach((btn) => {
    btn.onclick = async () => {
      const exo = filtered.find((e) => e.id === btn.dataset.id);
      if (exo) {
        await requestTrainingCoach(`Je démarre l'exercice ${exo.name}`, {
          trainingType: exo.type || "swing"
        });
      }
      startTrainingSession(btn.dataset.id);
    };
  });
}

// -----------------------------
// Step 3 : Session
// -----------------------------
async function startTrainingSession(id) {
  const body = $$("training-body");
  if (!body) return;

  const exercises = await loadExercises();
  const exo = exercises.find((e) => e.id === id);
  if (!exo) return;

  body.innerHTML = `
    <div class="pg-training-session">
      <h3>${exo.name}</h3>
      <p>${exo.goal}</p>

      <div class="pg-quality">
        <button data-q="success">Réussi</button>
        <button data-q="medium">Moyen</button>
        <button data-q="hard">Difficile</button>
      </div>

      <label>Ressenti mental</label>
      <input id="mental" type="range" min="1" max="5" value="3">

      <div class="pg-actions">
        <button id="back">Retour</button>
        <button id="save" class="pg-btn-primary">Valider</button>
      </div>
    </div>
  `;

  let quality = null;

  body.querySelectorAll(".pg-quality button").forEach((b) => {
    b.onclick = () => {
      body.querySelectorAll(".pg-quality button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      quality = b.dataset.q;
    };
  });

  $$("back").onclick = () => {
    showTrainingList(exo.type);
  };

  $$("save").onclick = async () => {
    console.log("🔥 SAVE CLICKED");

    if (!quality) {
      console.log("❌ No quality");
      window.coachReact?.("Choisis d’abord si c’était réussi, moyen ou difficile.");
      return;
    }

    try {
      await recordTraining(exo, quality, +$$("mental").value);
      console.log("✅ recordTraining finished");
    } catch (e) {
      console.error("❌ recordTraining error", e);
    }
  };
}

// -----------------------------
// Step 4 : Save
// -----------------------------
async function recordTraining(exo, quality, mentalScore) {
  const user = window.userLicence;

  const entry = {
    exercise_id: exo.id,
    exercise_name: exo.name,
    type: exo.type,
    quality,
    mental_score: mentalScore,
    coach: CURRENT_COACH,
    objective: CURRENT_OBJECTIVE,
    player_email: user?.email ?? null,
    licence_type: user?.licence ?? "free",
    CreatedAt: new Date().toISOString()
  };

  // -----------------------------
  // 1️⃣ Local backup
  // -----------------------------
  const history = getTrainingHistory();
  history.push(entry);
  localStorage.setItem("trainingHistory", JSON.stringify(history));

  // -----------------------------
  // 2️⃣ Save NocoDB
  // -----------------------------
  if (window.NOCODB_TRAININGS_URL && window.NOCODB_TOKEN) {
    try {
      const res = await fetch(window.NOCODB_TRAININGS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xc-token": window.NOCODB_TOKEN
        },
        body: JSON.stringify({
          ...entry,
          summary_json: JSON.stringify(entry)
        })
      });

      if (!res.ok) {
        console.warn("⚠️ Training NocoDB save failed", await res.text());
      } else {
        console.log("✅ Training sauvegardé NocoDB");
      }
    } catch (e) {
      console.warn("⚠️ Training NocoDB error", e);
    }
  }

  // -----------------------------
  // 3️⃣ Coach feedback fin de bloc
  // -----------------------------
  await requestTrainingCoach(
    `Je viens de terminer l'exercice ${exo.name}. C'était ${quality} avec un ressenti mental de ${mentalScore}/5.`,
    {
      trainingType: exo.type || "swing",
      selfReport: {
        calm: mentalScore,
        confidence: quality === "success" ? 4 : quality === "medium" ? 3 : 2,
        energy: 3
      }
    }
  );

  window.coachReact?.(
    `Séance "${exo.name}" enregistrée. Ressenti ${mentalScore}/5.`
  );

  showTrainingTypes();
}

// -----------------------------
// Export
// -----------------------------
window.initTraining = initTraining;
window.showTrainingCoachSelectModal = showTrainingCoachSelectModal;
window.showTrainingObjectiveModal = showTrainingObjectiveModal;
