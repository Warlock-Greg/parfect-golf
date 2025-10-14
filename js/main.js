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

