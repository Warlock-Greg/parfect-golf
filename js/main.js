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
