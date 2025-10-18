// === Parfect.golfr - main.js ===

// Petit helper global
window.$ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js chargé avec succès");

  const burger = $("menu-toggle");
  const menu = $("menu");
  const menuButtons = document.querySelectorAll("nav [data-target]");
  const allSections = document.querySelectorAll("main section");

  // === Fonction d’affichage d’une page ===
  function showPage(pageId) {
    console.log("📄 Page affichée :", pageId);

    // Masquer toutes les sections
    allSections.forEach((sec) => (sec.style.display = "none"));

    // Afficher la bonne page
    const page = document.getElementById(pageId);
    if (page) {
      page.style.display = "block";
    } else {
      console.warn("⚠️ Page non trouvée :", pageId);
      return;
    }

    // === Actions spécifiques selon la page ===
    switch (pageId) {
      case "play": {
        const version = localStorage.getItem("playVersion") || "v1";
        console.log(`🎯 Lancement du mode PLAY ${version}`);

        // Charger le bon script (v1 ou v2)
        const script = document.createElement("script");
        script.src = version === "v2" ? "js/play_v2.js" : "js/play.js";
        script.onload = () => {
          console.log(`✅ ${script.src} chargé avec succès`);
          if (version === "v1" && typeof showResumeOrNewModal === "function") {
            showResumeOrNewModal();
          }
        };
        script.onerror = () =>
          console.error("❌ Erreur de chargement :", script.src);
        document.body.appendChild(script);
        break;
      }

      case "training":
        if (typeof initTraining === "function") {
          initTraining();
        } else {
          console.warn("⚠️ initTraining non défini");
        }
        break;

      default:
        break;
    }
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

  // === Menu burger mobile ===
  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    menu.classList.toggle("visible");
  });

  // === Sélecteur de version (play V1 / V2) ===
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

  // === Page d’accueil par défaut ===
  showPage("home");
});
