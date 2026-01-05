// ==========================================================
//  ROUTER.JS — NAVIGATION CENTRALE PARFECT.GOLFR
//  Version clean 2025 — Swing Analyzer V2 désactivé
//  Just Swing = module swing unique
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Router chargé");

  // 🔐 Boot licence / compte (UNE FOIS)
  if (window.initLicence) {
   window.initLicence();
  }

  // ==========================================================
// 🔑 Licence activée à chaud → reprise du flow JustSwing
// ==========================================================
window.addEventListener("parfect:licence:activated", async () => {
  console.log("🔓 Licence activée → reprise JustSwing");

  // On vérifie qu’on est bien sur JustSwing
  setActive(justSwingBtn);
  showOnly("justswing");

  document.body.classList.add("mode-swing");

  // Laisse le DOM respirer
  await new Promise(r => requestAnimationFrame(r));

  // Init JustSwing si pas déjà fait
  if (!window._justSwingInitDone) {
    if (window.JustSwing?.initJustSwing) {
      JustSwing.initJustSwing();
      window._justSwingInitDone = true;
    }
  }

  // Caméra + session
  await window.startJustSwingCamera?.();
  JustSwing.startSession("swing");

  coachReact?.("🟢 Licence activée — Just Swing prêt !");
});

  
  const $ = (id) => document.getElementById(id);

  // Zones
  const gameArea     = $("game-area");
  const trainingArea = $("training-area");
  const swingArea    = $("swing-analyzer");
  const friendsArea  = $("friends-area");
  const justSwingArea = $("just-swing-area");

  // Boutons
  const playBtn     = $("play-btn");
  const trainingBtn = $("training-btn");
  const swingBtn    = $("swing-btn");
  const justSwingBtn = $("just-swing-btn");
  const historyBtn  = $("history-btn");
  const friendsBtn  = $("friends-btn");
  const homeBtn     = $("home-btn");

  // Helper showOnly
  function showOnly(id) {
    [gameArea, trainingArea, swingArea, friendsArea, justSwingArea].forEach(el => {
      if (el) el.style.display = "none";
    });
    const target = ({ 
      play: gameArea,
      training: trainingArea,
      swing: swingArea,
      friends: friendsArea,
      justswing: justSwingArea
    })[id];
    if (target) target.style.display = "block";
  }

  // Active visuel
  function setActive(btn) {
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    btn?.classList.add("active");
  }

  // ==========================
  // 🧹 Leave Swing (toujours utile)
  // ==========================
  function leaveSwingMode() {
    document.body.classList.remove("jsw-fullscreen");
    const video = document.querySelector("video");
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    window.initSwingAnalyzerV2 = () => console.log("⛔ Swing Analyzer désactivé");
  }

  // ==========================
  // 🎬 Onboarding
  // ==========================
  const startBtn = $("start-onboarding");
  const onboarding = $("onboarding");

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      onboarding.style.opacity = "0";
      onboarding.style.transition = "opacity .5s ease";
      setTimeout(() => onboarding.remove(), 500);

      // Licence
      if (typeof initLicence === "function") initLicence();

      // Play par défaut
      setActive(playBtn);
      showOnly("play");

      coachReact?.("👋 Bienvenue — Clique sur Jouer !");
    });
  }

  // ==========================
  // ROUTES
  // ==========================
  playBtn.addEventListener("click", () => {
    leaveSwingMode();
    setActive(playBtn);
    showOnly("play");
    window.showResumeOrNewModal?.();
    coachReact?.("🎯 Mode Jouer activé !");
  });

  trainingBtn.addEventListener("click", () => {
    leaveSwingMode();
    setActive(trainingBtn);
    showOnly("training");
    window.initTraining?.();
    coachReact?.("💪 Mode Entraînement activé !");
  });

  
  justSwingBtn.addEventListener("click", async () => {
    leaveSwingMode();
    setActive(justSwingBtn);
    showOnly("justswing");

    document.body.classList.add("mode-swing");

    console.log("▶️ JustSwing startSession()");

// 1) On s’assure que le DOM est prêt
  await new Promise(r => requestAnimationFrame(r));

// 2) Init quand le DOM est vraiment prêt
if (!window._justSwingInitDone) {
    if (window.JustSwing?.initJustSwing) {
      JustSwing.initJustSwing();
      window._justSwingInitDone = true;
    }
  }

    
    // 🔥 IMPORTANT : on démarre la caméra AVANT tout
    await window.startJustSwingCamera();

    JustSwing.startSession("swing");

    coachReact?.("🟢 Just Swing actif !");
});


  friendsBtn.addEventListener("click", () => {
    leaveSwingMode();
    setActive(friendsBtn);
    showOnly("friends");
    window.injectSocialUI?.();
    coachReact?.("👥 Mode Social !");
  });

// historyBtn.addEventListener("click", () => {
  //  leaveSwingMode();
  //  setActive(historyBtn);
  //    showOnly("play");
  //  window.injectHistoryUI?.();
  //  coachReact?.("📜 Historique");
 // });

  homeBtn.addEventListener("click", () => {
    leaveSwingMode();
    setActive(homeBtn);
    showOnly("play");
    coachReact?.("🏠 Accueil");
  });

});
