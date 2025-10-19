// === Parfect.golfr - main.js (MVP global) ===
window.$ = window.$ || ((id) => document.getElementById(id));

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ main.js chargé avec succès");

  const burger = $("menu-toggle");
  const menu = $("menu");
  const menuButtons = document.querySelectorAll('nav [data-target]');

  function showPage(pageId) {
    console.log("📄 Page affichée :", pageId);
    document.querySelectorAll("main section").forEach(sec => sec.style.display = "none");
    const target = document.getElementById(pageId);
    if (target) target.style.display = "block";
  }

  // Menu clicks
  menuButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      showPage(target);
      // Hook “play” → propose Reprendre / Nouvelle partie
      if (target === "play") {
        if (typeof window.showResumeOrNewModal === "function") {
          window.showResumeOrNewModal();
        } else {
          console.warn("⚠️ showResumeOrNewModal non défini");
        }
      }
      burger?.classList.remove("open");
      menu?.classList.remove("visible");
    });
  });

  // Accueil quick buttons
  $("new-round-btn")?.addEventListener("click", () => {
    showPage("play");
    if (typeof window.showResumeOrNewModal === "function") {
      window.showResumeOrNewModal();
    }
  });
  $("training-btn")?.addEventListener("click", () => showPage("training"));
  $("view-history")?.addEventListener("click", () => showPage("history"));

  // Burger
  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    menu.classList.toggle("visible");
  });

  // Page par défaut
  showPage("home");
});
