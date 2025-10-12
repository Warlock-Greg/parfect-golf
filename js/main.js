// === Helper global pour récupérer les éléments ===
window.$ = (id) => document.getElementById(id);

// === Animation de transition douce ===
function fadeIn(el, duration = 300) {
  el.style.opacity = 0;
  el.style.display = "block";
  let last = +new Date();
  const tick = function () {
    el.style.opacity = +el.style.opacity + (new Date() - last) / duration;
    last = +new Date();
    if (+el.style.opacity < 1) {
      (window.requestAnimationFrame && requestAnimationFrame(tick)) ||
        setTimeout(tick, 16);
    }
  };
  tick();
}

// === Navigation entre les pages via menu burger ===
document.addEventListener("DOMContentLoaded", () => {
  const menuLinks = document.querySelectorAll("#menu a[data-page]");
  const sections = document.querySelectorAll("section");
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");

  // Fonction principale d’affichage
  function showPage(pageId) {
    sections.forEach((s) => (s.style.display = "none"));
    const target = document.getElementById(pageId);
    if (target) {
      fadeIn(target, 250);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Gestion des liens du menu
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.page;
      showPage(target);

      // Ferme le menu burger s’il est ouvert
      if (burger && burger.classList.contains("open")) {
        burger.classList.remove("open");
        menu.classList.remove("visible");
      }
    });
  });

  // === Gestion du bouton burger (mobile) ===
  if (burger) {
    burger.addEventListener("click", () => {
      burger.classList.toggle("open");
      menu.classList.toggle("visible");
    });
  }

  // === Gestion des boutons d'accueil ===
  const playBtn = $("new-round-btn");
  const trainBtn = $("training-btn");
  const historyBtn = $("view-history");

  if (playBtn) {
    playBtn.addEventListener("click", () => showPage("play"));
  }
  if (trainBtn) {
    trainBtn.addEventListener("click", () => showPage("training"));
  }
  if (historyBtn) {
    historyBtn.addEventListener("click", () => showPage("history"));
  }

  // === Page d’accueil par défaut ===
  showPage("home");
});
