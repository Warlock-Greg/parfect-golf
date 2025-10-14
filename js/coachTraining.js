// js/coachTraining.js
// Coach intelligent appliqué aux entraînements

function showCoachToast(message, color = "#00ff99") {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";
  const coaches = {
    greg: { name: "Greg", avatar: "😎", color: "#00ff99" },
    goathier: { name: "Goathier", avatar: "🧠", color: "#4db8ff" },
    dorothee: { name: "Dorothée", avatar: "💫", color: "#ff99cc" },
  };
  const coach = coaches[coachKey] || coaches.greg;
  const finalColor = color || coach.color;

  document.querySelectorAll(".coach-toast").forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = "coach-toast";
  toast.innerHTML = `
    <div class="coach-avatar-bubble" style="background:${finalColor}33;">${coach.avatar}</div>
    <div class="coach-text-zone">
      <div class="coach-name">${coach.name} dit :</div>
      <div class="coach-message">${message}</div>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => toast.remove(), 8000);
}

// 🎯 Récupère l’objectif utilisateur pour adapter le ton
function getUserGoal() {
  const val = parseInt(localStorage.getItem("parfect_objective") || "9", 10);
  return val;
}

/**
 * 💬 Feedback intelligent pendant l’entraînement
 * @param {object} stats - { series, hits, avgScore, focus, drillName }
 */
export function showTrainingCoachFeedback(stats = {}) {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";
  const goal = getUserGoal();

  const { series = 1, hits = 0, avgScore = 0, focus = "", drillName = "" } = stats;

  let msg = "";
  let color = "#00ff99";

  // --- Logique principale : analyse du drill ---
  if (drillName.toLowerCase().includes("putt")) {
    if (avgScore <= 2) msg = "💚 Putting sous contrôle !";
    else if (avgScore <= 3) msg = "🎯 Bon dosage, encore un peu de régularité.";
    else msg = "🌀 Mets le focus sur rythme et tempo du stroke.";
  } else if (drillName.toLowerCase().includes("approche")) {
    if (avgScore <= 2) msg = "🧠 Approches précises, bien joué !";
    else msg = "🎯 Cherche un point de chute plus clair.";
  } else if (drillName.toLowerCase().includes("drive")) {
    if (hits >= series * 0.7) msg = "💥 Mise en jeu stable, tempo fluide.";
    else msg = "🚧 Trop de dispersion : focus rythme > puissance.";
  } else {
    msg = "Un coup après l'autre. Smart training 🧘";
  }

  // --- Adaptation à l’objectif d’index ---
  if (goal <= 9) msg += " (objectif <10 : contrôle et rythme).";
  else if (goal <= 15) msg += " (objectif 15 : équilibre et routine).";
  else msg += " (objectif loisir : fun & cohérence).";

  // --- Ajustement au coach ---
  if (coachKey === "goathier") msg = "🧠 " + msg + " Data > ego.";
  if (coachKey === "dorothee") msg = "💫 " + msg + " Respire, relâche, ressens.";
  if (coachKey === "greg") msg = "😎 " + msg;

  showCoachToast(msg, color);
}
