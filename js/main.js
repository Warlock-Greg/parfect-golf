// === Helper global ===
window.$ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js chargé avec succès");

  const sections = document.querySelectorAll("section");
  const menuButtons = document.querySelectorAll("[data-target]");
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");

  // === Fonction d’affichage d’une page ===
  function showPage(pageId) {
    sections.forEach((s) => (s.style.display = "none"));
    const target = document.getElementById(pageId);
    if (target) {
      target.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      console.warn("⚠️ Section introuvable :", pageId);
    }
  }

  // === Gestion des boutons du menu burger ===
  menuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      showPage(target);

      // Ferme le menu burger si présent
      if (burger && burger.classList.contains("open")) {
        burger.classList.remove("open");
        menu?.classList.remove("visible");
      }
    });
  });

  // === Boutons d’accueil ===
  $("new-round-btn")?.addEventListener("click", () => showPage("play"));
  $("training-btn")?.addEventListener("click", () => showPage("training"));
  $("view-history")?.addEventListener("click", () => showPage("history"));

  // === Gestion du burger mobile ===
  if (burger) {
    burger.addEventListener("click", () => {
      burger.classList.toggle("open");
      menu?.classList.toggle("visible");
    });
  }

  // === Page d’accueil par défaut ===
  showPage("home");
});
