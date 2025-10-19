// === Parfect.golfr - main.js (MVP) ===

// Helper global unique
window.$ = window.$ || function (id) { return document.getElementById(id); };

// Affiche une section par id (hide les autres)
window.showPage = function showPage(pageId) {
  document.querySelectorAll("main section").forEach(sec => sec.style.display = "none");
  const target = document.getElementById(pageId);
  if (target) target.style.display = "block";

  // Hooks : au chargement de certaines pages
  if (pageId === "play") {
    // Ouvre la modale Reprendre / Nouvelle partie si dispo
    if (typeof window.showResumeOrNewModal === "function") {
      window.showResumeOrNewModal();
    }
  }
  if (pageId === "training") {
    if (typeof window.initTraining === "function") {
      window.initTraining();
    }
  }
  if (pageId === "history") {
    if (typeof window.renderHistory === "function") {
      window.renderHistory();
    }
  }
  if (pageId === "objectives") {
    if (typeof window.initObjectives === "function") {
      window.initObjectives();
    }
  }
};

// Menu / Burger / Accueil
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js chargé (MVP)");

  const burger = $("menu-toggle");
  const menu = $("menu");

  // Navigation
  document.querySelectorAll("nav [data-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      window.showPage(target);

      // Ferme burger mobile
      burger?.classList.remove("open");
      menu?.classList.remove("visible");
    });
  });

  // Boutons d’accueil
  $("new-round-btn")?.addEventListener("click", () => window.showPage("play"));
  $("training-btn")?.addEventListener("click", () => window.showPage("training"));
  $("view-history")?.addEventListener("click", () => window.showPage("history"));

  // Burger
  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    menu?.classList.toggle("visible");
  });

  // Coach IA dock (facultatif : apparaît à la 1ère ouverture)
  if (typeof window.initCoachIA === "function") {
    window.initCoachIA();
  }

  // Page par défaut
  window.showPage("home");
});
