import { SHEET_JSON_URL, LS_KEYS } from "./config.js";
import { fetchGolfs, fetchExercises } from "./data.js";
import { tipAfterHole } from "./coach.js";

export let currentUser = null;
export let coachTone = localStorage.getItem(LS_KEYS.COACH_TONE) || "fun";

function $(id) { return document.getElementById(id); }

export function showToast(msg) {
  const toast = $("toast");
  toast.textContent = msg;
  toast.style.opacity = "1";
  setTimeout(() => toast.style.opacity = "0", 2500);
}

export function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

export function showCoach(msg) {
  const b = $("coach-bubble");
  if (!b) return;
  b.textContent = msg;
  b.style.opacity = "1";
  setTimeout(() => b.style.opacity = "0", 3000);
}


/* === Animation d'accueil (1x par jour) === */
const introLines = [
  "Forge ton mental 🧠",
  "Pas ton swing 🏌️",
  "Become a Parfect Golfr ⛳"
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function runIntroAnimation() {
  const overlay = document.getElementById("intro-overlay");
  const lineEl = document.getElementById("intro-line");
  if (!overlay || !lineEl) return;

  const lastShown = localStorage.getItem("parfect_intro");
  const today = todayKey();

  // Si déjà vue aujourd’hui → skip l’animation
  if (lastShown === today) {
    overlay.style.display = "none";
    return;
  }

  // Sinon → jouer l’animation et sauvegarder la date
  for (const line of introLines) {
    lineEl.textContent = line;
    lineEl.classList.remove("opacity-0");
    lineEl.classList.add("opacity-100");
    await new Promise(r => setTimeout(r, 1200));
    lineEl.classList.remove("opacity-100");
    lineEl.classList.add("opacity-0");
    await new Promise(r => setTimeout(r, 300));
  }

  overlay.classList.add("opacity-0");
  setTimeout(() => overlay.style.display = "none", 500);
  localStorage.setItem("parfect_intro", today);
}

window.addEventListener("DOMContentLoaded", runIntroAnimation);


/* === Licence === */
async function checkLicense(email, code) {
  const res = await fetch(SHEET_JSON_URL);
  if (!res.ok) return false;
  const data = await res.json();
  return data.find(
    r => r.email?.toLowerCase() === email.toLowerCase() && String(r.code).trim() === code.trim()
  );
}

$("login-btn")?.addEventListener("click", async () => {
  const email = $("login-email").value.trim();
  const code = $("login-code").value.trim();
  const msg = $("login-msg");
  msg.textContent = "Vérification...";
  const lic = await checkLicense(email, code);
  if (lic) {
    localStorage.setItem(LS_KEYS.LICENSE, JSON.stringify(lic));
    currentUser = lic;
    $("user-name").textContent = lic.name || lic.email;
    showPage("home");
    showToast("Bienvenue " + (lic.name || ""));
  } else {
    msg.textContent = "Licence invalide 😅";
  }
});

$("logout-btn")?.addEventListener("click", () => {
  localStorage.removeItem(LS_KEYS.LICENSE);
  location.reload();
});

/* === Navigation === */
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

$("open-coach")?.addEventListener("click", () => {
  coachTone = prompt("Choisis le ton du coach (fun, taquin, focus)", coachTone) || coachTone;
  localStorage.setItem(LS_KEYS.COACH_TONE, coachTone);
  showToast(`Coach en mode ${coachTone}`);
});

/* === Intro === */
const introLines = [
  "Forge ton mental 🧠",
  "Pas ton swing 🏌️",
  "Become a Parfect Golfr ⛳"
];
(async function intro() {
  const line = $("intro-line");
  for (const l of introLines) {
    line.textContent = l;
    await new Promise(r => setTimeout(r, 1200));
  }
  $("intro-overlay").style.display = "none";
})();

/* === Initialisation === */
window.addEventListener("DOMContentLoaded", () => {
  const lic = localStorage.getItem(LS_KEYS.LICENSE);
  if (lic) {
    const l = JSON.parse(lic);
    currentUser = l;
    $("user-name").textContent = l.name || l.email;
    showPage("home");
  }
});
