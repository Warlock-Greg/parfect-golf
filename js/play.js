// --- Helper DOM (sécurisé) ---
const $$ = (id) => document.getElementById(id);

// --- Variables globales de partie ---
let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = 0;

// --- Initialisation du choix de golf ---
function initGolfSelect() {
  const container = $$("golf-select");
  if (!container) {
    console.warn("⚠️ Élément #golf-select introuvable");
    return;
  }

  container.innerHTML = `
    <h3>Choisis ton golf</h3>
    <button class="btn" id="new-round-btn">Nouvelle partie</button>
  `;

  // Bouton "Nouvelle partie"
  const newRoundBtn = $$("new-round-btn");
  if (newRoundBtn) {
    newRoundBtn.addEventListener("click", () => {
      startNewRound();
    });
  }
}

// --- Démarre une nouvelle partie ---
function startNewRound() {
  console.log("🎯 Nouvelle partie démarrée");

  // Nettoie la carte actuelle si elle existe
  const holeCard = $$("hole-card");
  if (holeCard) holeCard.innerHTML = "";

  // Cache le sélecteur de golf si présent
  const golfSelect = $$("golf-select");
  if (golfSelect) golfSelect.style.display = "none";

  // Initialise les variables
  currentGolf = { name: "Golf Demo" };
  currentHole = 1;
  holes = Array.from({ length: 9 }, (_, i) => ({ number: i + 1, par: 4 }));
  currentDiff = 0;
  localStorage.setItem("roundInProgress", "true");

  renderHole(currentHole);
}

// --- Affiche un trou ---
function renderHole(number) {
  const holeCard = $$("hole-card");
  if (!holeCard) {
    console.warn("⚠️ Élément #hole-card introuvable pour afficher le trou");
    return;
  }

  const hole = holes[number - 1];
  if (!hole) {
    holeCard.innerHTML = `<p>Partie terminée 👏</p>`;
    localStorage.setItem("roundInProgress", "false");
    return;
  }

  holeCard.innerHTML = `
    <h3>Trou ${hole.number}</h3>
    <p>Par ${hole.par}</p>
    <button class="btn" id="next-hole-btn">Trou suivant</button>
  `;

  const nextBtn = $$("next-hole-btn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentHole++;
      renderHole(currentHole);
    });
  }
}

// --- Réinitialise la partie ---
function resetRound() {
  console.log("🔁 Réinitialisation de la partie");

  const holeCard = $$("hole-card");
  if (holeCard) holeCard.innerHTML = "";

  const golfSelect = $$("golf-select");
  if (golfSelect) golfSelect.style.display = "block";

  currentGolf = null;
  currentHole = 1;
  holes = [];
  currentDiff = 0;
  localStorage.setItem("roundInProgress", "false");

  // Recharge le sélecteur de golf
  window.initGolfSelect?.();
}

// --- Expose les fonctions globalement (si besoin ailleurs) ---
window.initGolfSelect = initGolfSelect;
window.resetRound = resetRound;
window.renderHole = renderHole;
