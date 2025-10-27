// === Parfect.golfr - PLAY.JS (v2025 MVP + Coach IA intégré) ===

// --- Helper DOM (sécurisé) ---
const $$ = (id) => document.getElementById(id);

// --- Variables globales ---
let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = 0;

// === Initialisation du choix de golf ===
async function initGolfSelect() {
  const container = $$("golf-select");
  if (!container) {
    console.warn("⚠️ Élément #golf-select introuvable");
    return;
  }

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();

    container.innerHTML = `
      <h3 style="color:#00ff99;">Choisis ton golf</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${golfs.map(g => `
          <button class="btn" onclick="startNewRound('${g.id}')">
            ${g.name}<br><small style="color:#aaa;">${g.location}</small>
          </button>
        `).join("")}
      </div>
    `;
    container.style.display = "block";
  } catch (err) {
    console.error("❌ Erreur chargement golfs.json :", err);
    container.innerHTML = `<p style="color:#f55;">Erreur de chargement des golfs</p>`;
  }
}

// === Nouvelle partie ===
async function startNewRound(golfId) {
  console.log("🎯 Nouvelle partie démarrée :", golfId);

  const holeCard = $$("hole-card");
  if (holeCard) holeCard.innerHTML = "";

  const golfSelect = $$("golf-select");
  if (golfSelect) golfSelect.style.display = "none";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    const golf = golfs.find(g => g.id === golfId);

    if (!golf) {
      console.warn("⚠️ Golf introuvable :", golfId);
      if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">Golf introuvable</p>`;
      return;
    }

    currentGolf = golf;
    currentHole = 1;
    holes = golf.pars.map((par, i) => ({ number: i + 1, par }));
    currentDiff = 0;
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);

    showScorecardIntro();
    showMoodAndStrategyModal();
  } catch (err) {
    console.error("❌ Erreur chargement golf :", err);
    if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">Erreur de chargement du golf</p>`;
  }
}

// === Carte de score - Intro ===
function showScorecardIntro() {
  // Évite doublons
  if (document.querySelector(".modal-backdrop")) return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:left;">
      <h2>📋 Carte de Score</h2>
      <p>
        💚 <b>Parfect</b> = Par + Fairway + GIR + ≤ 2 putts<br>
        💙 <b>Bogey’fect</b> = Bogey + Fairway + ≤ 2 putts
      </p>
      <ul style="margin-left:18px;line-height:1.4;">
        <li>Choisis ton score (Par, Bogey, Birdie…)</li>
        <li>Coche Fairway / GIR / Routine</li>
        <li>Indique la distance du 2ᵉ putt</li>
      </ul>
      <div style="text-align:right;margin-top:16px;">
        <button id="close-intro" class="btn" style="background:#00c676;color:#000;">OK 💪</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  $$("close-intro").addEventListener("click", () => modal.remove());
}

// === Mood & Stratégie ===
function showMoodAndStrategyModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:400px;text-align:center;">
      <h3>😎 Ton mood du jour ?</h3>
      <div class="moods" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:10px;">
        <button class="btn mood" data-mood="focus">Focus</button>
        <button class="btn mood" data-mood="relax">Relax</button>
        <button class="btn mood" data-mood="fun">Fun</button>
        <button class="btn mood" data-mood="grind">Grind</button>
      </div>
      <h4 style="margin-top:12px;">🎯 Quelle stratégie veux-tu suivre ?</h4>
      <div class="coach-styles" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
        <button class="btn strategy" data-strat="safe">Safe</button>
        <button class="btn strategy" data-strat="aggressive">Aggressive</button>
        <button class="btn strategy" data-strat="5050">50/50</button>
        <button class="btn strategy" data-strat="fairway">Fairway First</button>
        <button class="btn strategy" data-strat="mindset">Parfect Mindset</button>
      </div>
      <button id="start-round" class="btn" style="margin-top:18px;background:#00c676;color:#000;font-weight:bold;">Démarrer</button>
    </div>
  `;
  document.body.appendChild(modal);

  let mood = "focus";
  let strat = "mindset";

  modal.querySelectorAll(".mood").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mood = btn.dataset.mood;
    });
  });

  modal.querySelectorAll(".strategy").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".strategy").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      strat = btn.dataset.strat;
    });
  });

  $$("start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    modal.remove();
    if (typeof showCoachIA === "function")
      showCoachIA(`🎯 Let's go — mood: ${mood}, stratégie: ${strat}`);

    setTimeout(() => {
      const holeCard = $$("hole-card");
      if (holeCard) holeCard.style.display = "block";
      if (typeof renderHole === "function") renderHole(1);
    }, 300);
  });
}

// === Afficher un trou ===
function renderHole(number) {
  const holeCard = $$("hole-card");
  if (!holeCard) {
    console.warn("⚠️ Élément #hole-card introuvable");
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

  $$("next-hole-btn").addEventListener("click", () => {
    currentHole++;
    renderHole(currentHole);
  });
}

// === Réinitialiser la partie ===
function resetRound() {
  const holeCard = $$("hole-card");
  if (holeCard) holeCard.innerHTML = "";

  const golfSelect = $$("golf-select");
  if (golfSelect) golfSelect.style.display = "block";

  currentGolf = null;
  currentHole = 1;
  holes = [];
  currentDiff = 0;
  localStorage.setItem("roundInProgress", "false");

  window.initGolfSelect?.();
}

// === Export global ===
window.initGolfSelect = initGolfSelect;
window.startNewRound = startNewRound;
window.renderHole = renderHole;
window.resetRound = resetRound;
window.showMoodAndStrategyModal = showMoodAndStrategyModal;

console.log("✅ play.js chargé sans erreur");
