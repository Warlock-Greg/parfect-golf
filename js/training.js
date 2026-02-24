// === TRAINING.JS — Parfect.golfr Zen 2026 ===
console.log("🏋️ Training (Zen 2026) chargé");

if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

let EXERCISES_CACHE = null;

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
// Init Training
// -----------------------------
async function initTraining() {
  const root = document.getElementById("training-root");
  if (!root) return;

  root.innerHTML = `
    <div class="pg-training-header">
      <div>
        <h2>Entraînement</h2>
        <p>Une intention. Une répétition consciente.</p>
      </div>
      <button id="change-training-coach" class="pg-btn-secondary">
        Coach : ${localStorage.getItem("coach") || "Choisir"}
      </button>
    </div>
    <div class="pg-training-body" id="training-body"></div>
  `;

  document
    .getElementById("change-training-coach")
    ?.addEventListener("click", showTrainingCoachSelectModal);

  // 👉 Toujours proposer le coach si pas encore défini
  if (!localStorage.getItem("coach")) {
    showTrainingCoachSelectModal();
  } else {
    coachReact?.(
      `${localStorage.getItem("coach")} t’accompagne pour cette séance.`
    );
    showTrainingTypes();
  }
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
          .map(c => `<button class="coach-choice" data-coach="${c}">${c}</button>`)
          .join("")}
      </div>
      <button class="pg-btn-primary" id="validate-coach">Valider</button>
    </div>
  `;
  document.body.appendChild(modal);

  let selected = null;

  modal.querySelectorAll(".coach-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".coach-choice").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selected = btn.dataset.coach;
    });
  });

  modal.querySelector("#validate-coach").onclick = () => {
    if (!selected) return;
    localStorage.setItem("coach", selected);
    modal.remove();
    coachReact?.(`${selected} est avec toi.`);
    showTrainingTypes();
  };
}

// -----------------------------
// Step 1 : Types
// -----------------------------
async function showTrainingTypes() {
  const body = $$("training-body");
  const exercises = await loadExercises();
  const types = [...new Set(exercises.map(e => e.type))];

  body.innerHTML = `
    <div class="pg-training-types">
      ${types.map(t => `<button class="pg-chip" data-type="${t}">${t}</button>`).join("")}
    </div>
    <div id="training-list"></div>
  `;

  body.querySelectorAll(".pg-chip").forEach(btn => {
    btn.onclick = () => showTrainingList(btn.dataset.type);
  });
}

// -----------------------------
// Step 2 : Exercises
// -----------------------------
async function showTrainingList(type) {
  const list = $$("training-list");
  const exercises = await loadExercises();
  const filtered = exercises.filter(e => e.type === type);

  list.innerHTML = `
    <div class="pg-training-list">
      ${filtered.map(e => `
        <div class="pg-exercise-card">
          <h4>${e.name}</h4>
          <p>${e.goal}</p>
          <button class="pg-btn-secondary" data-id="${e.id}">Démarrer</button>
        </div>
      `).join("")}
    </div>
  `;

  list.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => startTrainingSession(btn.dataset.id);
  });
}

// -----------------------------
// Step 3 : Session
// -----------------------------
async function startTrainingSession(id) {
  const body = $$("training-body");
  const exercises = await loadExercises();
  const exo = exercises.find(e => e.id === id);
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
  body.querySelectorAll(".pg-quality button").forEach(b => {
    b.onclick = () => {
      body.querySelectorAll(".pg-quality button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      quality = b.dataset.q;
    };
  });

 $$("save").onclick = async () => {
  console.log("🔥 SAVE CLICKED");

  if (!quality) {
    console.log("❌ No quality");
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
    coach: localStorage.getItem("coach"),
    player_email: user?.email ?? null,
    licence_type: user?.licence ?? "free",
    created_at: new Date().toISOString()
  };

  // -----------------------------
  // 1️⃣ Local backup (toujours)
  // -----------------------------
  const history = JSON.parse(localStorage.getItem("trainingHistory") || "[]");
  history.push(entry);
  localStorage.setItem("trainingHistory", JSON.stringify(history));

  // -----------------------------
  // 2️⃣ Save NocoDB (safe)
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

  coachReact?.(`Séance "${exo.name}" enregistrée. Ressenti ${mentalScore}/5.`);
  showTrainingTypes();
}

// Export
window.initTraining = initTraining;
