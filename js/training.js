// === TRAINING.JS – Parfect.golfr MVP+ (UX améliorée) ===

// Petit helper (on garde la même convention que play.js)
if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

let TRAINING_EXERCISES = [];

// --- Initialisation du mode Entraînement ---
async function initTraining() {
  console.log("🏋️ Mode Training lancé");

  const container = $$("coach-log");
  if (!container) {
    console.warn("⚠️ coach-log introuvable");
    return;
  }

  const currentCoach = localStorage.getItem("coach");

  // 🧑‍🏫 Si aucun coach choisi → on affiche la modale de choix
  if (!currentCoach) {
    showTrainingCoachSelectModal(() => {
      showCoachIA?.(`🏋️ ${localStorage.getItem("coach")} t’accompagne pour cette session d’entraînement.`);
      showTrainingExerciseSelect();
    });
  } else {
    // Coach déjà choisi ailleurs (Play) → on le réutilise
    showCoachIA?.(`🏋️ ${currentCoach} t’accompagne pour cette session d’entraînement.`);
    showTrainingExerciseSelect();
  }
}

// --- Modale de sélection du coach (version Training) ---
function showTrainingCoachSelectModal(onDone) {
  const existing = document.querySelector(".modal-backdrop.training-coach-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.className = "modal-backdrop training-coach-modal";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:center;padding:20px;">
      <h2 style="color:#00ff99;">🎯 Choisis ton coach pour l'entraînement</h2>
      <p style="color:#ccc;margin-bottom:16px;">Chaque coach a sa façon de booster ton mental.</p>

      <div class="coach-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button class="coach-choice btn" data-coach="Dorothee">💚 Dorothée<br><small>Bienveillance & Flow</small></button>
        <button class="coach-choice btn" data-coach="Gauthier">🔵 Gauthier<br><small>Technique mentale</small></button>
        <button class="coach-choice btn" data-coach="Greg">💥 Greg<br><small>Énergie & Data</small></button>
        <button class="coach-choice btn" data-coach="Chill">🌿 Chill<br><small>Zen & Flow</small></button>
      </div>

      <p id="coach-desc" style="margin-top:14px;font-style:italic;color:#aaa;">
        Clique sur un coach pour voir sa vibe.
      </p>
      <button id="validate-coach" class="btn" style="margin-top:18px;background:#00ff99;color:#111;">Valider</button>
    </div>
  `;
  document.body.appendChild(modal);

  let selectedCoach = null;
  const desc = modal.querySelector("#coach-desc");

  const coachProfiles = {
    Dorothee: "💚 Douce, bienveillante, elle t’accompagne sans pression. Focus sur le calme et la respiration.",
    Gauthier: "🔵 Posé et précis. Il t’aide à structurer ta pratique et à comprendre ton plan de progression.",
    Greg: "💥 Dynamique et méthodique. Il te pousse à performer avec des mini-défis et des datas mentales.",
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
    if (typeof onDone === "function") onDone();
  });
}

// --- Étape 2 : affichage des exercices depuis le JSON ---
async function showTrainingExerciseSelect() {
  const log = $$("coach-log");
  if (!log) return;

  log.innerHTML = `<p style="color:#00ff99;">📂 Chargement des exercices...</p>`;

  try {
    if (!TRAINING_EXERCISES.length) {
      const res = await fetch("./data/exercises.json");
      TRAINING_EXERCISES = await res.json();
    }

    const exercises = TRAINING_EXERCISES;

    // Regroupement par type
    const types = [...new Set(exercises.map((e) => e.type))];

    const typeLabels = {
      putting: "Putting",
      chipping: "Chipping",
      driving: "Driving",
      irons: "Fers",
      mental: "Mental"
    };

    log.innerHTML = `
      <h3 style="color:#00ff99;">Choisis un domaine :</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px;">
        ${types
          .map(
            (t) => `
          <button class="btn training-type" data-type="${t}">
            ${typeLabels[t] || t}
          </button>
        `
          )
          .join("")}
      </div>
      <div id="training-list" style="margin-top:10px;"></div>
    `;

    log.querySelectorAll(".training-type").forEach((btn) => {
      btn.addEventListener("click", () => {
        log.querySelectorAll(".training-type").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const selectedType = btn.dataset.type;
        const filtered = exercises.filter((e) => e.type === selectedType);
        const list = log.querySelector("#training-list");

        list.innerHTML = `
          <h4 style="color:#00ff99;margin-top:10px;">Exercices ${typeLabels[selectedType] || selectedType} :</h4>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
            ${filtered
              .map(
                (e) => `
              <div class="exercise-card" style="background:#111;border:1px solid #333;border-radius:8px;padding:8px;text-align:left;">
                <strong style="color:#fff;">${e.name}</strong><br>
                <small style="color:#ccc;">${e.goal}</small><br>
                <small style="color:#888;">🎯 Objectif : ${e.objectif || "—"}</small><br>
                <button class="btn start-exo" data-id="${e.id}" style="margin-top:6px;">Démarrer</button>
              </div>
            `
              )
              .join("")}
          </div>
        `;

        list.querySelectorAll(".start-exo").forEach((b) => {
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
  const log = $$("coach-log");
  if (!log) return;

  try {
    if (!TRAINING_EXERCISES.length) {
      const res = await fetch("./data/exercises.json");
      TRAINING_EXERCISES = await res.json();
    }
  } catch (e) {
    console.error(e);
    return;
  }

  const exo = TRAINING_EXERCISES.find((e) => e.id === exoId);
  if (!exo) {
    console.warn("Exercice introuvable :", exoId);
    return;
  }

  const objectif = exo.objectif || 10;
  const isMental = exo.type === "mental";

  // 🧠 UI différente selon le type
  if (!isMental) {
    // === Cas quantitatif : putting / chipping / driving / irons ===
    log.innerHTML = `
      <h3 style="color:#00ff99;">🏋️ ${exo.name}</h3>
      <video src="${exo.media}" controls style="width:100%;border-radius:8px;margin-top:8px;"></video>
      <p style="margin-top:8px;">🎯 Objectif : ${exo.goal}</p>

      <div style="margin-top:12px;text-align:left;">
        <p style="margin-bottom:6px;">Combien de réussites sur <strong>${objectif}</strong> ?</p>
        <input 
          id="training-slider"
          type="range"
          min="0"
          max="${objectif}"
          value="0"
          style="width:100%;"
        />
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <div>
            <span id="training-slider-display" style="font-weight:bold;color:#00ff99;">0</span>
            <span style="color:#ccc;"> / ${objectif}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn quick-set" data-val="0">0</button>
            <button class="btn quick-set" data-val="${Math.round(objectif / 2)}">${Math.round(objectif / 2)}</button>
            <button class="btn quick-set" data-val="${objectif}">${objectif}</button>
          </div>
        </div>
      </div>

      <div style="margin-top:14px;text-align:center;">
        <button id="validate-training" class="btn" style="background:#00ff99;color:#111;">✅ Enregistrer la séance</button>
        <button id="back-training-list" class="btn" style="margin-left:8px;">↩️ Retour aux exos</button>
      </div>
    `;

    const slider = $$("training-slider");
    const display = $$("training-slider-display");

    const updateDisplay = () => {
      display.textContent = slider.value;
    };
    slider.addEventListener("input", updateDisplay);
    updateDisplay();

    document.querySelectorAll(".quick-set").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = parseInt(btn.dataset.val, 10) || 0;
        slider.value = v;
        updateDisplay();
      });
    });

    $$("back-training-list").addEventListener("click", showTrainingExerciseSelect);

    $$("validate-training").addEventListener("click", () => {
      const raw = parseInt(slider.value || "0", 10);
      const payload = {
        mode: "quantitative",
        raw,
        objectif,
        percent: objectif ? Math.round((raw * 100) / objectif) : null
      };
      recordTrainingAndRecap(exo, payload);
    });
  } else {
    // === Cas mental : qualitatif simple ===
    log.innerHTML = `
      <h3 style="color:#00ff99;">🧠 ${exo.name}</h3>
      <video src="${exo.media}" controls style="width:100%;border-radius:8px;margin-top:8px;"></video>
      <p style="margin-top:8px;">🎯 Objectif : ${exo.goal}</p>

      <div style="margin-top:14px;text-align:center;">
        <p style="margin-bottom:6px;">Comment t’es-tu senti sur cet exercice ?</p>
        <div id="mental-buttons" style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
          <button class="btn mental-btn" data-val="Réussi">✅ Réussi</button>
          <button class="btn mental-btn" data-val="Moyen">😐 Moyen</button>
          <button class="btn mental-btn" data-val="Difficile">🧱 Difficile</button>
        </div>
      </div>

      <div style="margin-top:14px;text-align:center;">
        <button id="validate-training" class="btn" style="background:#00ff99;color:#111;">✅ Enregistrer la séance</button>
        <button id="back-training-list" class="btn" style="margin-left:8px;">↩️ Retour aux exos</button>
      </div>
    `;

    let selectedFeeling = null;

    document.querySelectorAll(".mental-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mental-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedFeeling = btn.dataset.val;
      });
    });

    $$("back-training-list").addEventListener("click", showTrainingExerciseSelect);

    $$("validate-training").addEventListener("click", () => {
      if (!selectedFeeling) {
        const block = $$("mental-buttons");
        block.style.animation = "shake 0.2s";
        setTimeout(() => (block.style.animation = ""), 200);
        return;
      }
      const payload = {
        mode: "qualitative",
        label: selectedFeeling
      };
      recordTrainingAndRecap(exo, payload);
    });
  }
}

// --- Étape 4 : Enregistrement + Récapitulatif ---
function recordTrainingAndRecap(exo, resultPayload) {
  const history = JSON.parse(localStorage.getItem("trainingHistory") || "[]");
  const coach = localStorage.getItem("coach") || "Inconnu";

  const entry = {
    exoId: exo.id,
    type: exo.type,
    name: exo.name,
    coach,
    result: resultPayload,
    date: new Date().toISOString()
  };
  history.push(entry);
  localStorage.setItem("trainingHistory", JSON.stringify(history));

  const log = $$("coach-log");
  if (!log) return;

  let resultHTML = "";

  if (resultPayload.mode === "quantitative") {
    const { raw, objectif, percent } = resultPayload;
    resultHTML = `
      <p>Résultat : <strong>${raw}${objectif ? " / " + objectif : ""}</strong></p>
      ${
        typeof percent === "number"
          ? `<p style="margin-top:4px;">Soit environ <strong>${percent}%</strong> de ton objectif.</p>`
          : ""
      }
    `;
  } else if (resultPayload.mode === "qualitative") {
    resultHTML = `
      <p>Ressenti : <strong>${resultPayload.label}</strong></p>
    `;
  }

  log.innerHTML = `
    <div style="text-align:center;margin-top:20px;">
      <h3 style="color:#00ff99;">✅ Entraînement enregistré</h3>
      <p>Exercice : <strong>${exo.name}</strong></p>
      <p>Coach : <strong>${coach}</strong></p>
      ${resultHTML}
      <div style="margin-top:14px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
        <button id="back-training" class="btn">↩️ Revenir aux exercices</button>
        <button id="change-training-coach" class="btn">🧑‍🏫 Changer de coach</button>
      </div>
    </div>
  `;

  const coachName = coach;
  showCoachIA?.(`💾 Séance enregistrée avec ${coachName}. Beau travail, tu nourris ton mental.`);

  $$("back-training").addEventListener("click", showTrainingExerciseSelect);
  $$("change-training-coach").addEventListener("click", () => {
    showTrainingCoachSelectModal(() => {
      showTrainingExerciseSelect();
    });
  });
}

// --- Export global ---
window.initTraining = initTraining;

