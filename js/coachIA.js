// === Parfect.golfr - Coach IA Stable ===

let coachVisible = true;

// --- Initialisation du coach ---
function initCoachIA() {
  const coachLog = document.getElementById("coach-log");
  const coachInput = document.getElementById("coach-input");
  const coachSend = document.getElementById("coach-send");

  if (!coachLog || !coachInput || !coachSend) {
    console.warn("⚠️ Coach IA : éléments manquants dans le DOM");
    return;
  }

  // Message d’accueil unique
  if (!localStorage.getItem("coachIntroDone")) {
    appendCoachMessage("👋 Salut golfeur ! Je suis ton coach IA Parfect.golfr. Pose-moi une question ou lance ta session !");
    localStorage.setItem("coachIntroDone", "true");
  }

  // Envoi manuel par clic
  coachSend.addEventListener("click", () => handleCoachInput(coachInput, coachLog));

  // Envoi par touche Entrée
  coachInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleCoachInput(coachInput, coachLog);
    }
  });
}

// --- Traitement de la saisie utilisateur ---
function handleCoachInput(input, log) {
  const message = input.value.trim();
  if (!message) return;

  appendUserMessage(message);
  input.value = "";

  // Simule une réponse coach
  setTimeout(() => {
    respondAsCoach(message);
  }, 500);
}

// --- Réponses du coach ---
function respondAsCoach(message) {
  let reply = "⛳ Un coup après l’autre ! Reste concentré sur ton flow.";

  if (/routine/i.test(message)) reply = "💆 Respire, visualise et engage ta routine complète avant chaque coup.";
  if (/putt/i.test(message)) reply = "🎯 Vise un rythme fluide sur tes putts, pas la force.";
  if (/drive/i.test(message)) reply = "🏌️ Allonge sans forcer : priorité au contrôle du contact.";
  if (/bogey/i.test(message)) reply = "💙 Un Bogey’fect reste un bon coup. L’important c’est le mental !";
  if (/par/i.test(message)) reply = "💚 Par solide, ça se construit avec des choix intelligents.";
  if (/relax/i.test(message)) reply = "😌 Respire entre les coups. Le relâchement crée la performance.";

  appendCoachMessage(reply);
}

// --- Affichage d’un message du joueur ---
function appendUserMessage(text) {
  const log = document.getElementById("coach-log");
  const div = document.createElement("div");
  div.className = "msg user";
  div.textContent = text;
  log.appendChild(div);
  scrollCoachLog();
}

// --- Affichage d’un message du coach ---
function appendCoachMessage(text) {
  const log = document.getElementById("coach-log");
  const div = document.createElement("div");
  div.className = "msg coach";
  div.textContent = text;
  log.appendChild(div);
  scrollCoachLog();
}

// --- Scroll fluide sans forcer le focus ---
function scrollCoachLog() {
  const log = document.getElementById("coach-log");
  log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
}

// --- Interface pour les autres modules (play.js, training.js...) ---
function showCoachIA(message = "") {
  const coachLog = document.getElementById("coach-log");
  const coach = document.getElementById("coach-ia");
  if (!coach || !coachLog) return;

  coach.style.display = "flex";

  if (message) appendCoachMessage(message);
}

function hideCoachIA() {
  const coach = document.getElementById("coach-ia");
  if (coach) coach.style.display = "none";
}

function showCoachToast(msg, color = "#00ff99") {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.position = "fixed";
  toast.style.bottom = "80px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = color;
  toast.style.color = "#111";
  toast.style.padding = "8px 14px";
  toast.style.borderRadius = "8px";
  toast.style.fontWeight = "bold";
  toast.style.zIndex = 9999;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// --- Export global ---
window.initCoachIA = initCoachIA;
window.showCoachIA = showCoachIA;
window.hideCoachIA = hideCoachIA;
window.showCoachToast = showCoachToast;

console.log("✅ Coach IA chargé sans auto-focus ni redimensionnement");
