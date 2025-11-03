// === TRAINING RECAP - Parfect.golfr MVP+ ===

// Helper DOM
const $$ = (id) => document.getElementById(id);

// --- Sauvegarde d'une session d'entraînement ---
function saveTrainingResult(exo, result, coach, success, comment) {
  const history = JSON.parse(localStorage.getItem("trainingHistory") || "[]");

  const entry = {
    id: exo.id,
    name: exo.name,
    goal: exo.goal,
    result,
    coach,
    success,
    comment,
    date: new Date().toISOString()
  };

  history.unshift(entry); // ajout en haut
  localStorage.setItem("trainingHistory", JSON.stringify(history.slice(0, 20))); // garde 20 max
  console.log("💾 Session enregistrée :", entry);
}

// --- Affiche le récapitulatif d'entraînement ---
function showTrainingRecap() {
  const container = $$("coach-log");
  if (!container) return console.warn("⚠️ coach-log introuvable");

  const history = JSON.parse(localStorage.getItem("trainingHistory") || "[]");

  if (history.length === 0) {
    container.innerHTML = `
      <p style="color:#aaa;text-align:center;">Aucune session enregistrée pour l’instant.<br>
      Lance un entraînement et je te ferai un retour 💚</p>`;
    return;
  }

  container.innerHTML = `
    <h3 style="color:#00ff99;text-align:center;">🎯 Tes derniers trainings</h3>
    <div id="recap-list" style="margin-top:10px;display:flex;flex-direction:column;gap:10px;"></div>
  `;

  const list = document.getElementById("recap-list");

  history.slice(0, 5).forEach(entry => {
    const date = new Date(entry.date).toLocaleDateString("fr-FR", {
      weekday: "short", day: "2-digit", month: "short"
    });
    const successColor = entry.success ? "#00ff99" : "#ff6666";

    const card = document.createElement("div");
    card.className = "recap-card";
    card.style.cssText = `
      background:#111;border:1px solid #333;padding:10px;border-radius:10px;
      display:flex;flex-direction:column;gap:6px;
    `;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;">
        <strong style="color:${successColor};">${entry.name}</strong>
        <small style="color:#888;">${date}</small>
      </div>
      <small style="color:#ccc;">🎯 ${entry.goal}</small>
      <small style="color:${successColor};">Résultat : ${entry.result}</small>
      <small style="color:#aaa;">Coach ${entry.coach} : “${entry.comment}”</small>
    `;
    list.appendChild(card);
  });

  // Petit message de coach aléatoire
  const activeCoach = localStorage.getItem("coach") || "Greg";
  const randMsg = [
    "Continue sur ce flow 💚",
    "Ton mental s’installe, trou après trou ☀️",
    "Chaque exo te rapproche de ton Parfect 🧘‍♂️"
  ];
  const message = randMsg[Math.floor(Math.random() * randMsg.length)];
  showCoachIA?.(`📈 ${activeCoach} : ${message}`);
}

// --- Liaison automatique après un entraînement ---
async function recordTrainingAndRecap(exoId, result) {
  const res = await fetch("./data/exercises.json");
  const exercises = await res.json();
  const exo = exercises.find(e => e.id === exoId);
  if (!exo) return;

  const coach = localStorage.getItem("coach") || "Greg";
  const context = result >= exo.objectif ? "training_focus" : "training_relax";
  const comment = await getCoachComment(coach, context);
  const success = result >= exo.objectif;

  saveTrainingResult(exo, result, coach, success, comment);
  showTrainingRecap();
  showCoachIA?.(`💬 ${comment}`);
  showCoachToast(success ? "💚 Objectif atteint !" : "😌 À retravailler demain !");
}

// --- Exports globaux ---
window.saveTrainingResult = saveTrainingResult;
window.showTrainingRecap = showTrainingRecap;
window.recordTrainingAndRecap = recordTrainingAndRecap;

console.log("✅ Training recap prêt");
