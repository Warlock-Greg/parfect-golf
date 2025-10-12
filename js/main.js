const menu = document.getElementById("menu");
const toggle = document.getElementById("menu-toggle");
const sections = document.querySelectorAll("main section");

toggle.addEventListener("click", () => {
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
});

menu.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    sections.forEach(s => s.classList.remove("active"));
    document.getElementById(target).classList.add("active");
    menu.style.display = "none";
  });
});

// Boutons accueil
document.getElementById("new-round-btn").addEventListener("click", () => {
  sections.forEach(s => s.classList.remove("active"));
  document.getElementById("play").classList.add("active");
});
document.getElementById("training-btn").addEventListener("click", () => {
  sections.forEach(s => s.classList.remove("active"));
  document.getElementById("training").classList.add("active");
});

// === Navigation entre les pages via menu burger ===
document.addEventListener("DOMContentLoaded", () => {
  const menuLinks = document.querySelectorAll("#menu a[data-page]");
  const sections = document.querySelectorAll("section");

  function showPage(pageId) {
    sections.forEach((s) => (s.style.display = "none"));
    const target = document.getElementById(pageId);
    if (target) target.style.display = "block";
  }

  // Gère le clic sur chaque lien du menu
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.page;
      showPage(target);

      // Ferme le menu burger s’il est ouvert
      const burger = document.getElementById("burger");
      if (burger && burger.classList.contains("open")) burger.classList.remove("open");
    });
  });

  // Page d’accueil par défaut
  showPage("home");
});


// === Animation d'accueil quotidienne ===
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toDateString();
  const lastAnim = localStorage.getItem("homeAnimationDate");

  const playBtn = document.getElementById("new-round-btn");
  const trainBtn = document.getElementById("training-btn");

  if (!playBtn || !trainBtn) return;

  if (lastAnim !== today) {
    // 💥 Lance l'animation une seule fois par jour
    playBtn.classList.add("animate-once");
    trainBtn.classList.add("animate-once");
    localStorage.setItem("homeAnimationDate", today);
  } else {
    // pas d'animation
    playBtn.style.opacity = 1;
    trainBtn.style.opacity = 1;
  }
});
