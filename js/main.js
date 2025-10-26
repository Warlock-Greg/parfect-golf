// === MAIN.JS — version stable et nettoyée ===

// --- Initialisation globale ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Boot Parfect.golfr");

  // Initialiser le coach IA si dispo
  if (typeof window.initCoachIA === "function") {
    window.initCoachIA();
  }

  // Raccourcis vers les boutons du footer
  const playBtn = document.getElementById("play-btn");
  const trainingBtn = document.getElementById("training-btn");
  const historyBtn = document.getElementById("history-btn");
  const friendsBtn = document.getElementById("friends-btn");

  // Helper pour activer le bouton courant
  function setActiveButton(btn) {
    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  // --- 🟢 Bouton "Jouer" ---
  playBtn?.addEventListener("click", () => {
    setActiveButton(playBtn);

    console.log("🎮 Menu: Jouer");

    // Afficher modale de reprise / nouvelle partie
    if (typeof window.showResumeOrNewModal === "function") {
      window.showResumeOrNewModal();
    } else if (typeof window.initGolfSelect === "function") {
      // Fallback : afficher la sélection des golfs
      window.initGolfSelect();
    }

    // Notifie le coach IA (facultatif)
    window.showCoachIA?.("⛳ Mode Jouer activé");
  });

  // --- 🏋️‍♂️ Bouton "S'entraîner" ---
  trainingBtn?.addEventListener("click", () => {
    setActiveButton(trainingBtn);

    console.log("💪 Menu: Entraînement");

    if (typeof window.initTraining === "function") {
      window.initTraining();
    }

    window.showCoachIA?.("🏋️ Mode Entraînement activé");
  });

  // --- 📜 Bouton "Historique" ---
  historyBtn?.addEventListener("click", () => {
    setActiveButton(historyBtn);

    console.log("📜 Menu: Historique");

    if (typeof window.renderHistory === "function") {
      window.renderHistory();
    }

    window.showCoachIA?.("📖 Historique ouvert");
  });

  // --- 👥 Bouton "Amis" ---
  friendsBtn?.addEventListener("click", () => {
    setActiveButton(friendsBtn);

    console.log("👥 Menu: Amis");

    if (typeof window.injectSocialUI === "function") {
      window.injectSocialUI();
    }

    window.showCoachIA?.("👋 Section Amis activée");
  });
});
