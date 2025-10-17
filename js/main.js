// === Parfect.golfr - main.js ===

// Petit helper global
window.$ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js chargé avec succès");



  // Sélecteurs principaux
  const sections = document.querySelectorAll("main section");
  const menuButtons = document.querySelectorAll("nav [data-target]");
  const burger = $("menu-toggle");
  const menu = $("menu");

  // === Fonction d’affichage d’une section ===
  function showPage(pageId) {
  console.log("📄 Page affichée :", pageId);

  // Masquer toutes les sections
  document.querySelectorAll("section").forEach((sec) => (sec.style.display = "none"));

  // Afficher la page demandée
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.style.display = "block";
  else console.warn("⚠️ Page non trouvée :", pageId);

  // === Gestion spéciale de la page "play_v2"
  if (pageId === "play_v2") {
    console.log("🟢 Chargement de play_v2.js");

    // Vérifie si déjà chargé
    if (!window.playV2Loaded) {
      const script = document.createElement("script");
      script.src = "js/play_v2.js";
      script.type = "module";
      script.onload = () => {
        console.log("✅ play_v2.js chargé avec succès");
        window.playV2Loaded = true;
      };
      script.onerror = () => {
        console.error("❌ Erreur de chargement de play_v2.js");
      };
      document.body.appendChild(script);
    }
  }

  // === Hooks spécifiques par page ===
  if (pageId === "play") {
    if (typeof showResumeOrNewModal === "function") {
      showResumeOrNewModal(); // ✅ ouvre le choix Reprendre / Nouvelle partie
    } else {
      console.warn("⚠️ showResumeOrNewModal non défini");
    }
  }
}


  // === Navigation via le menu principal ===
  menuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      (target);

      // Fermer le menu mobile si ouvert
      burger?.classList.remove("open");
      menu?.classList.remove("visible");
    });
  });

  // === Boutons d’accueil ===
  $("new-round-btn")?.addEventListener("click", () => {
  ("play");
  showResumeOrNewModal();
});

  $("training-btn")?.addEventListener("click", () => ("training"));
  $("view-history")?.addEventListener("click", () => ("history"));

  // === Menu burger mobile ===
  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    menu.classList.toggle("visible");
  });

// === Gestion du mode de carte (V1 / V2) ===
const modeSelect = document.getElementById("play-mode-select");
if (modeSelect) {
  const saved = localStorage.getItem("playVersion") || "v1";
  modeSelect.value = saved;

  modeSelect.addEventListener("change", () => {
    const version = modeSelect.value;
    localStorage.setItem("playVersion", version);
    if (window.showCoachToast)
      showCoachToast(`Mode ${version.toUpperCase()} sélectionné 💚`, "#00ff99");
  });
}

// === Lancement de la bonne version au clic sur "Partie" ===
const playBtn = document.querySelector('[data-target="play"]');
if (playBtn) {
  playBtn.addEventListener("click", () => {
    const version = localStorage.getItem("playVersion") || "v1";
    const script = document.createElement("script");
    script.type = "module";
    script.src = version === "v2" ? "./js/play_v2.js" : "./js/play.js";
    document.body.appendChild(script);
    ("play");
  });
}


  
  // === Affiche la page d’accueil par défaut ===
  ("home");
});

