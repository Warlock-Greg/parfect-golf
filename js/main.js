// === Parfect.golfr - main.js ===

// Petit helper global
window.$ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js chargé avec succès");

  document.addEventListener("DOMContentLoaded", async () => {
  // === Gestion du sélecteur Play V1/V2 ===
  if (document.getElementById("play-version-choice")) {
    const playChoice = document.getElementById("play-version-choice");
    const savedPlayVersion = localStorage.getItem("playVersion") || "v1";
    playChoice.value = savedPlayVersion;

    await loadPlayVersion(savedPlayVersion);

    playChoice.addEventListener("change", async () => {
      const version = playChoice.value;
      localStorage.setItem("playVersion", version);
      await loadPlayVersion(version);
      if (window.showCoachToast)
        showCoachToast(`Mode ${version.toUpperCase()} activé 💚`, "#00ff99");
    });
  }
});

async function loadPlayVersion(version) {
  const existingScript = document.getElementById("dynamic-play-script");
  if (existingScript) existingScript.remove();

  const script = document.createElement("script");
  script.id = "dynamic-play-script";
  script.type = "module";
  script.src = version === "v2" ? "./js/play_v2.js" : "./js/play.js";
  document.body.appendChild(script);
    
    
    
    // ... autres init ...

  const trainingChoice = document.getElementById("training-version-choice");
  const savedTrainingVersion = localStorage.getItem("trainingVersion") || "v1";
  trainingChoice.value = savedTrainingVersion;

  await loadTrainingVersion(savedTrainingVersion);

  trainingChoice.addEventListener("change", async () => {
    const version = trainingChoice.value;
    localStorage.setItem("trainingVersion", version);
    await loadTrainingVersion(version);
    showCoachToast(`Mode ${version.toUpperCase()} activé 💚`, "#00ff99");
  });
});

async function loadTrainingVersion(version) {
  const existingScript = document.getElementById("dynamic-training-script");
  if (existingScript) existingScript.remove();

  const script = document.createElement("script");
  script.id = "dynamic-training-script";
  script.type = "module";
  script.src = version === "v2" ? "./js/training_v2.js" : "./js/training.js";
  document.body.appendChild(script);
}


  // Sélecteurs principaux
  const sections = document.querySelectorAll("main section");
  const menuButtons = document.querySelectorAll("nav [data-target]");
  const burger = $("menu-toggle");
  const menu = $("menu");

  // === Fonction d’affichage d’une section ===
  function showPage(pageId) {
    sections.forEach((s) => (s.style.display = "none"));
    const target = $(pageId);
    if (target) {
      target.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
      console.log(`📄 Page affichée : ${pageId}`);
    } else {
      console.warn("⚠️ Section introuvable :", pageId);
    }
    if (pageId === "play") coachMotivationAuto();

  }

  // === Navigation via le menu principal ===
  menuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      showPage(target);

      // Fermer le menu mobile si ouvert
      burger?.classList.remove("open");
      menu?.classList.remove("visible");
    });
  });

  // === Boutons d’accueil ===
  $("new-round-btn")?.addEventListener("click", () => {
  showPage("play");
  showResumeOrNewModal();
});

  $("training-btn")?.addEventListener("click", () => showPage("training"));
  $("view-history")?.addEventListener("click", () => showPage("history"));

  // === Menu burger mobile ===
  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    menu.classList.toggle("visible");
  });

  // === Affiche la page d’accueil par défaut ===
  showPage("home");
});

