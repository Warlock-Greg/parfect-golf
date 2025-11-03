// === MAIN.JS — Version fusionnée et corrigée SplitScreen + Gestion sections ===

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Boot Parfect.golfr SplitScreen");

  // --- Initialisation du coach IA ---
  if (typeof window.initCoachIA === "function") {
    window.initCoachIA();
  }

  // --- Sélecteurs principaux ---
  const playBtn = document.getElementById("play-btn");
  const trainingBtn = document.getElementById("training-btn");
  const friendsBtn = document.getElementById("friends-btn");

  const gameArea = document.getElementById("game-area");
  const trainingArea = document.getElementById("training-area");
  const friendsArea = document.getElementById("friends-area");
  const coach = document.getElementById("coach-ia");

  // --- Helper : activer un bouton ---
  function setActive(btn) {
    document.querySelectorAll("footer button, nav button").forEach(b => b.classList.remove("active"));
    btn?.classList.add("active");
  }

  // --- Coach helper ---
  window.coachReact = function (message) {
    if (typeof appendCoachMessage === "function") appendCoachMessage(message);
  };

  // --- Gestion centralisée des vues ---
  function showSection(mode) {
    if (gameArea) gameArea.style.display = mode === "play" ? "block" : "none";
    if (trainingArea) trainingArea.style.display = mode === "training" ? "block" : "none";
    if (friendsArea) friendsArea.style.display = mode === "friends" ? "block" : "none";

    // Ajuste la taille du coach selon le mode
    if (coach) {
      if (mode === "training") {
        coach.classList.remove("compact");
        coach.style.flex = "0 0 45%";
      } else {
        coach.classList.add("compact");
        coach.style.flex = "0 0 30%";
      }
    }
  }

  // === 🎮 Mode Jouer ===
  //playBtn?.addEventListener("click", () => {
  //  setActive(playBtn);
  //  showSection("play");
  //  window.initGolfSelect?.();
  //  coachReact("🎯 Mode Jouer activé — choisis ton golf !");
  //});

  playBtn?.addEventListener("click", () => {
  setActive(playBtn);
  showSection("play");
  // ❌ à remplacer : window.initGolfSelect?.();
  showResumeOrNewModal(); // ✅ c’est elle qui gère “reprendre” ou “nouvelle partie”
  coachReact("🎯 Mode Jouer activé — choisis ton golf !");
});

  // === 🏋️ Mode Training ===
  trainingBtn?.addEventListener("click", () => {
    setActive(trainingBtn);
    showSection("training");
    window.initTraining?.();
    coachReact("💪 Mode Entraînement — choisis ton exercice mental !");
  });

  // Ajoute ceci dans le menu Historique :
if (typeof window.showTrainingRecap === "function") {
  window.showTrainingRecap();
}


  // === 👥 Mode Friends ===
  friendsBtn?.addEventListener("click", () => {
    setActive(friendsBtn);
    showSection("friends");
    window.injectSocialUI?.();
    coachReact("👋 Mode Amis activé — partage tes stats !");
  });

  // --- Démarrage par défaut ---
  showSection("play");
});
