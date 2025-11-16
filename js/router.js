// ==========================================================
//  ROUTER.JS — NAVIGATION CENTRALE PARFECT.GOLFR
//  Version clean 2025 — Swing Analyzer V2 désactivé
//  Just Swing = module swing unique
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Router.js loaded — Clean navigation active");

  // ===== Helpers =====
  const $ = (id) => document.getElementById(id);

  // Zones
  const gameArea      = $("game-area");
  const trainingArea  = $("training-area");
  const swingArea     = $("swing-analyzer"); // désactivé mais gardé pour structure
  const friendsArea   = $("friends-area");
  const justSwingArea = $("just-swing-area");

  // Boutons
  const playBtn      = $("play-btn");
  const trainingBtn  = $("training-btn");
  const swingBtn     = $("swing-btn");  // obsolète mais on le garde
  const justSwingBtn = $("just-swing-btn");
  const historyBtn   = $("history-btn");
  const friendsBtn   = $("friends-btn");
  const homeBtn      = $("home-btn");

  // === Gestion visuelle bouton actif ===
  function setActive(btn) {
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    btn?.classList.add("active");
  }

  // === Coach mode ===
  const coach = $("coach-ia");

  function coachSetMode(mode) {
    coach.classList.remove("coach-mini", "coach-medium", "coach-full", "coach-hidden");

    if (mode === "play") coach.classList.add("coach-medium");
    if (mode === "training") coach.classList.add("coach-full");
    if (mode === "swing") coach.classList.add("coach-mini");
    if (mode === "friends") coach.classList.add("coach-hidden");
  }

  window.coachSetMode = coachSetMode;

  // === Stopper caméras et analyse ===
  function leaveSwingMode() {
    console.log("🛑 leaveSwingMode() — killing all cameras");

    // Stop Cam Swing Analyzer V2 (si existe)
    if (window.stopCam) {
      try { window.stopCam(); } catch(e){}
    }

    // Stop old video tracks
    ["user-video", "ref-video", "video-swing"].forEach(id => {
      const v = document.getElementById(id);
      if (v?.srcObject) {
        v.srcObject.getTracks().forEach(t => t.stop());
        v.srcObject = null;
      }
    });

    // Désactiver Swing Analyzer V2
    window.initSwingAnalyzerV2 = () => console.log("⛔ Swing Analyzer V2 désactivé");

    // Désactiver TensorFlow / MoveNet pour de bon
    window.tf = undefined;
  }

  window.leaveSwingMode = leaveSwingMode;

  // === Afficher une seule vue ===
  function showOnly(view) {
    const map = {
      play:      gameArea,
      training:  trainingArea,
      swing:     swingArea,
      friends:   friendsArea,
      justswing: justSwingArea,
    };

    [gameArea, trainingArea, swingArea, friendsArea, justSwingArea]
      .forEach(el => el.style.display = "none");

    map[view].style.display = "block";
  }

  window.showOnly = showOnly;

  // ==========================================================
  //                     LISTENERS NAVIGATION
  // ==========================================================

  // 🏠 HOME
  homeBtn?.addEventListener("click", () => {
    leaveSwingMode();
    setActive(homeBtn);
    showOnly("play");
    coachSetMode("play");

    const zone = $("interaction-zone");
    zone.innerHTML = `
      <div id="mini-onboarding" style="
        text-align:center;padding:40px 20px;color:#00ff99;
        max-width:420px;margin:40px auto;background:rgba(0,0,0,0.6);
        border-radius:12px;line-height:1.5;box-shadow:0 0 12px rgba(0,255,153,0.2);
      ">
        <h2>👋 Bienvenue sur Parfect.golfr</h2>
        <p>🧠 Baisse ton index en forgeant ton mental.<br>💪 Ton swing suivra.</p>
        <p>🎯 Clique sur <strong>⛳ Jouer</strong> pour commencer !</p>
      </div>`;
  });

  // 🎯 PLAY
  playBtn?.addEventListener("click", () => {
    leaveSwingMode();
    setActive(playBtn);
    showOnly("play");
    coachSetMode("play");

    window.showResumeOrNewModal?.();
    coachReact?.("🎯 Mode Jouer — choisis ton golf !");
  });

  // 🧠 TRAINING
  trainingBtn?.addEventListener("click", () => {
    leaveSwingMode();
    setActive(trainingBtn);
    showOnly("training");
    coachSetMode("training");

    window.initTraining?.();
    coachReact?.("💪 Mode Entraînement activé !");
  });

  // 🏌️ Swing Analyzer V2 (désactivé mais laissé)
  swingBtn?.addEventListener("click", () => {
    leaveSwingMode();
    setActive(swingBtn);
    showOnly("swing");
    coachSetMode("swing");

    coachReact?.("⛔ Swing Analyzer V2 est désactivé. Utilise Just Swing !");
  });

  // 🎥 JUST SWING (mode IA temps réel)
  justSwingBtn?.addEventListener("click", () => {
    console.log("▶️ Just Swing demandé");
    leaveSwingMode();

    setActive(justSwingBtn);
    showOnly("justswing");
    coachSetMode("swing");

    // 🌟 Lancer Just Swing
    if (window.JustSwing?.startSession) {
      JustSwing.startSession("swing");
    } else {
      console.error("❌ JustSwing.startSession introuvable");
    }

    coachReact?.("🟢 Just Swing activé — place-toi plein pied 👣 !");
  });

  // 📜 HISTORY
  historyBtn?.addEventListener("click", () => {
    leaveSwingMode();
    setActive(historyBtn);
    showOnly("play");
    coachSetMode("play");

    const zone = $("interaction-zone");
    zone.innerHTML = "";
    window.injectHistoryUI?.();

    coachReact?.("📜 Historique chargé !");
  });

  // 👥 FRIENDS
  friendsBtn?.addEventListener("click", () => {
    leaveSwingMode();
    setActive(friendsBtn);
    showOnly("friends");
    coachSetMode("friends");

    window.injectSocialUI?.();
  });

  // Mode par défaut
  setActive(playBtn);
  showOnly("play");
  coachSetMode("play");
});
