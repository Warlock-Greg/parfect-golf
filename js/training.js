// === Parfect.golfr - training.js (MVP propre, sans import/export, avec coach IA intégré) ===
(function () {
  const $ = window.$ || ((id) => document.getElementById(id));
  const TRAINING_KEY = "trainingHistory";

  let exercises = [];
  let selectedType = null;
  let currentExercise = null;

  // === Récupération des exercices (depuis data.js ou URL) ===
  async function fetchExercises() {
    try {
      const res = await fetch("https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/data/exercises.json", {
        cache: "no-store",
      });
      return await res.json();
    } catch (err) {
      console.error("❌ Erreur chargement exercices :", err);
      return [];
    }
  }

  // === Initialisation principale ===
  window.initTraining = async function initTraining() {
    console.log("🏋️ Training.js initialisé");
    exercises = await fetchExercises();
    renderTrainingTypes();
  };

  // === Affiche les types d’entraînement ===
  function renderTrainingTypes() {
    const zone = $("training-type");
    if (!zone) return;

    const types = ["putting", "chipping", "driving", "irons", "mental"];
    zone.innerHTML = `
      <h3>Choisis ton domaine :</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px;">
        ${types.map((t) => `<button class="btn training-type" data-type="${t}">${t.toUpperCase()}</button>`).join("")}
      </div>
    `;

    document.querySelectorAll(".training-type").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedType = btn.dataset.type;
        showExercise(selectedType);
      })
    );
  }

  // === Affiche un exercice ===
  function showExercise(type) {
    const zone = $("training-exercises");
    if (!zone) return;

    const filtered = exercises.filter((e) => e.type === type);
    if (!filtered.length) {
      zone.innerHTML = `<p>Aucun exercice trouvé pour ${type}.</p>`;
      return;
    }

    currentExercise = filtered[Math.floor(Math.random() * filtered.length)];
    renderExerciseCard(currentExercise);
  }

  // === Rendu de la carte d’exercice ===
  function renderExerciseCard(exo) {
    const zone = $("training-exercises");
    if (!zone) return;

    zone.classList.add("fade-out");
    setTimeout(() => {
      zone.classList.remove("fade-out");
      zone.classList.add("fade-in");

      zone.innerHTML = `
        <div class="exercise-card">
          <h3>${exo.title}</h3>
          <p>${exo.desc}</p>
          <p><em>Durée : ${exo.duration || "10 min"}</em></p>
          <div style="margin-top:10px;">
            <button id="done-exo" class="btn" style="background:#00ff99;color:#111;">✅ Terminé</button>
            <button id="skip-exo" class="btn secondary">⏭️ Autre exercice</button>
          </div>
        </div>
      `;

      $("done-exo").addEventListener("click", () => finishExercise(exo));
      $("skip-exo").addEventListener("click", () => showExercise(selectedType));

      if (typeof window.showCoachIA === "function") {
        window.showCoachIA();
        setTimeout(() => window.hideCoachIA?.(), 180000);
      }
    }, 250);
  }

  // === Fin d’un exercice ===
  function finishExercise(exo) {
    saveTrainingSession(exo);

    const zone = $("training-exercises");
    zone.innerHTML = `
      <div class="exercise-done">
        <h3>💪 Bien joué !</h3>
        <p>Tu viens de compléter : <strong>${exo.title}</strong></p>
        <button id="next-exo" class="btn" style="background:#00ff99;color:#111;">Suivant</button>
        <button id="view-history" class="btn secondary">📜 Voir historique</button>
      </div>
    `;

    $("next-exo").addEventListener("click", () => showExercise(selectedType));
    $("view-history").addEventListener("click", () => showTrainingHistory());
  }

  // === Sauvegarde de la session ===
  function saveTrainingSession(exo) {
    const hist = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
    hist.push({
      date: new Date().toISOString(),
      type: selectedType,
      title: exo.title,
      duration: exo.duration || "10 min",
    });
    localStorage.setItem(TRAINING_KEY, JSON.stringify(hist));
    console.log("💾 Entraînement sauvegardé :", exo.title);
  }

  // === Affiche l’historique local ===
  function showTrainingHistory() {
    const hist = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
    const zone = $("training-history");
    if (!zone) return;

    if (!hist.length) {
      zone.innerHTML = "<p>Aucun entraînement enregistré.</p>";
      return;
    }

    zone.innerHTML = `
      <h3>📜 Historique des entraînements</h3>
      <ul style="list-style:none;padding:0;">
        ${hist
          .slice(-10)
          .reverse()
          .map(
            (h) =>
              `<li style="margin-bottom:6px;">${new Date(h.date).toLocaleDateString()} — <strong>${h.title}</strong> (${h.type})</li>`
          )
          .join("")}
      </ul>
      <button id="back-to-training" class="btn">⬅️ Retour</button>
    `;

    $("back-to-training").addEventListener("click", () => {
      $("training-history").innerHTML = "";
      renderTrainingTypes();
    });
  }

  // Auto-init au chargement
  document.addEventListener("DOMContentLoaded", () => window.initTraining());
})();
