// === MAIN.JS — Version unifiée Coach IA + Split Layout ===

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Boot Parfect.golfr SplitScreen + Coach Manager");

  // === DOM elements ===
  const playBtn = document.getElementById("play-btn");
  const trainingBtn = document.getElementById("training-btn");
  const friendsBtn = document.getElementById("friends-btn");
  const swingBtn = document.getElementById("swing-btn");
  const justSwingBtn = document.getElementById("just-swing-btn");


  const gameArea = document.getElementById("game-area");
  const trainingArea = document.getElementById("training-area");
  const friendsArea = document.getElementById("friends-area");
  const swingArea = document.getElementById("swing-analyzer");

  const coachSection = document.getElementById("coach-ia");

  // ============================================
  // 🧠 GESTION CENTRALISÉE DU COACH IA
  // ============================================

  function coachIASetMode(mode) {
    if (!coachSection) return;

    coachSection.classList.remove("coach-mini", "coach-medium", "coach-full", "coach-hidden");

    switch (mode) {
      case "play":
        coachSection.classList.add("coach-medium");   // 35–45% largeur
        break;
      case "training":
        coachSection.classList.add("coach-full");     // 50% / 100vh
        break;
      case "swing":
        coachSection.classList.add("coach-mini");     // version mini (comme Swing V2)
        break;
      case "friends":
        coachSection.classList.add("coach-hidden");   // invisible mais structure gardée
        break;
    }
  }

  window.coachIASetMode = coachIASetMode;

  // ============================================
  // 🧠 Initialisation du coach IA
  // ============================================
  if (typeof window.initCoachIA === "function") {
    window.initCoachIA();
  }

  // ============================================
  // Helper pour activer un bouton
  // ============================================
  function setActive(btn) {
    document.querySelectorAll("footer button, nav button")
      .forEach((b) => b.classList.remove("active"));
    btn?.classList.add("active");
  }

  // ============================================
  // Gestion des sections
  // ============================================
  function showSection(mode) {
    if (gameArea) gameArea.style.display = mode === "play" ? "block" : "none";
    if (trainingArea) trainingArea.style.display = mode === "training" ? "block" : "none";
    if (friendsArea) friendsArea.style.display = mode === "friends" ? "block" : "none";
    if (swingArea) swingArea.style.display = mode === "swing" ? "block" : "none";
  }

  // ============================================
  // 🎮 Bouton PLAY
  // ============================================
  playBtn?.addEventListener("click", () => {
    setActive(playBtn);
    showSection("play");
    coachIASetMode("play");
    showResumeOrNewModal();
    showCoachIA?.("🎯 Mode Jouer activé — choisis ton golf !");
  });

  // ============================================
  // 🏋️‍♂️ Bouton TRAINING
  // ============================================
  trainingBtn?.addEventListener("click", () => {
    setActive(trainingBtn);
    showSection("training");
    coachIASetMode("training");
    window.initTraining?.();
    showCoachIA?.("💪 Mode Entraînement activé — choisis ton exercice !");
  });

  // ============================================
  // 🎥 Bouton SWING ANALYZER
  // ============================================
  swingBtn?.addEventListener("click", () => {
    setActive(swingBtn);
    showSection("swing");
    coachIASetMode("swing");
    window.initSwingAnalyzerV2?.();
    showCoachIA?.("🎥 Mode Analyse activé — filme ton swing !");
  });

  // ============================================
  // 👥 Bouton FRIENDS
  // ============================================
  friendsBtn?.addEventListener("click", () => {
    setActive(friendsBtn);
    showSection("friends");
    coachIASetMode("friends");
    window.injectSocialUI?.();
  });



  
  // ============================================
  // Mode par défaut : PLAY
  // ============================================
  showSection("play");
  coachIASetMode("play");
});

