// === MAIN.JS — Router SplitScreen officiel (Play / Training / Swing / Friends) ===

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Boot Parfect.golfr SplitScreen");

  // --- Initialisation du coach IA ---
  if (typeof window.initCoachIA === "function") {
    window.initCoachIA();
  }

  // --- Sélecteurs principaux ---
  const playBtn     = document.getElementById("play-btn");
  const trainingBtn = document.getElementById("training-btn");
  const swingBtn    = document.getElementById("swing-btn");
  const friendsBtn  = document.getElementById("friends-btn");

  const gameArea     = document.getElementById("game-area");
  const trainingArea = document.getElementById("training-area");
  const swingArea    = document.getElementById("swing-analyzer");
  const friendsArea  = document.getElementById("friends-area");
  const coach        = document.getElementById("coach-ia");

  // --- Helper : activer un bouton de nav ---
  function setActive(btn) {
    document
      .querySelectorAll("nav button, footer button")
      .forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  // --- Helper global pour parler via le coach ---
  window.coachReact = function (message) {
    if (typeof window.appendCoachMessage === "function") {
      window.appendCoachMessage(message);
    } else {
      console.log("Coach:", message);
    }
  };

  // --- Affiche une section et ajuste la taille du coach ---
  function showSection(mode) {
    if (gameArea)     gameArea.style.display     = mode === "play"    ? "block" : "none";
    if (trainingArea) trainingArea.style.display = mode === "training"? "block" : "none";
    if (swingArea)    swingArea.style.display    = mode === "swing"   ? "block" : "none";
    if (friendsArea)  friendsArea.style.display  = mode === "friends"? "block" : "none";

    if (!coach) return;

    // Layout du coach selon le mode
    if (mode === "training") {
      coach.classList.remove("compact");
      coach.classList.remove("coach-mini");
      coach.style.flex = "0 0 45%";
    } else if (mode === "swing") {
      // Mini coach pour laisser un max de place à la vidéo
      coach.classList.remove("compact");
      coach.classList.add("coach-mini");
      coach.style.flex = "0 0 18%";
    } else {
      // Vue "standard" (Play / Friends / autres)
      coach.classList.remove("coach-mini");
      coach.classList.add("compact");
      coach.style.flex = "0 0 30%";
    }
  }

  // --- Flags pour éviter les doubles initialisations ---
  let trainingInitDone  = false;
  let swingInitDone     = false;

  // === 🎮 Mode Jouer ===
  playBtn?.addEventListener("click", () => {
    setActive(playBtn);
    //showSection("play");

    // Modale Reprendre / Nouvelle partie (sécurisée)
    if (typeof window.showResumeOrNewModal === "function") {
      // évite d'empiler plusieurs modales si on clique plusieurs fois
      if (!document.querySelector(".modal-backdrop")) {
        window.showResumeOrNewModal();
      }
    }

    coachReact("🎯 Mode Jouer activé — choisis ton golf !");
  });

  // === 🏋️ Mode Training ===
  trainingBtn?.addEventListener("click", () => {
    setActive(trainingBtn);
    showSection("training");

    if (!trainingInitDone && typeof window.initTraining === "function") {
      window.initTraining();
      trainingInitDone = true;
    }

    coachReact("💪 Mode Entraînement — choisis ton exercice mental !");
  });

  // === 🎥 Mode Swing Analyzer ===
  swingBtn?.addEventListener("click", () => {
    setActive(swingBtn);
    showSection("swing");

    if (!swingInitDone && typeof window.initSwingAnalyzerV2 === "function") {
      window.initSwingAnalyzerV2();
      swingInitDone = true;
      console.log("✅ Swing Analyzer V2 initialisé.");
    }

    coachReact("🎥 Mode Analyse activé — filme ton swing ou cale-toi sur Rory !");
  });

  // === 👥 Mode Friends ===
  friendsBtn?.addEventListener("click", () => {
    setActive(friendsBtn);
    showSection("friends");

    if (typeof window.injectSocialUI === "function") {
      window.injectSocialUI();
    }

    coachReact("👥 Mode Amis activé — partage tes stats !");
  });

  // --- Vue par défaut au chargement ---
  setActive(playBtn);
  showSection("play");
});
