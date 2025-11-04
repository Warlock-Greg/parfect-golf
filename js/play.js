// === Parfect.golfr – play.js (MVP 2025 corrigé propre) ===
console.log("🏌️ Parfect.golfr Play.js chargé");

if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = null;
let totalParfects = parseInt(localStorage.getItem("totalParfects") || "0");

// === Modale Reprendre ou Nouvelle Partie ===
function showResumeOrNewModal() {
  const roundInProgress = localStorage.getItem("roundInProgress") === "true";
  const lastGolf = localStorage.getItem("currentGolf");

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style.zIndex = "12000";
  modal.innerHTML = `
    <div class="modal-card" style="text-align:center;padding:20px;">
      <h3>🎮 Partie en cours ?</h3>
      ${
        roundInProgress
          ? `<p>Souhaites-tu reprendre ta partie ou recommencer ?</p>
             <div style="display:flex;gap:10px;justify-content:center;">
               <button class="btn" id="resume-round">Reprendre</button>
               <button class="btn" id="new-round">Nouvelle</button>
             </div>`
          : `<p>Prêt à démarrer ?</p>
             <button class="btn" id="new-round">🚀 Démarrer</button>`
      }
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#resume-round")?.addEventListener("click", () => {
    modal.remove();
    if (lastGolf) {
      const saved = JSON.parse(localStorage.getItem("holesData") || "[]");
      if (saved.length) holes = saved;
      currentGolf = { id: lastGolf };
      renderHole(currentHole);
    }
  });

  modal.querySelector("#new-round")?.addEventListener("click", () => {
    modal.remove();
    initGolfSelect();
  });
}

window.showResumeOrNewModal = showResumeOrNewModal;

// === Sélecteur de golf (MVP) ===
async function initGolfSelect() {
  const gameArea = document.getElementById("game-area");
  const golfSelect = document.getElementById("golf-select");
  const holeCard = document.getElementById("hole-card");

  if (!golfSelect) {
    console.warn("⚠️ #golf-select introuvable dans le DOM");
    return;
  }

  if (gameArea) gameArea.style.display = "block";
  if (holeCard) holeCard.style.display = "none";
  golfSelect.style.display = "block";
  golfSelect.innerHTML = `<p style="color:#aaa;">Chargement des golfs…</p>`;

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();

    golfSelect.innerHTML = `
      <h3 style="color:#00ff99;margin:8px 0;">Choisis ton golf</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${golfs.map(g => `
          <button class="btn" data-id="${g.id}">
            ⛳ ${g.name}<br>
            <small style="color:#aaa;">${g.location}</small>
          </button>
        `).join("")}
      </div>
    `;

    golfSelect.querySelectorAll("button[data-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        startNewRound(id);
      });
    });
  } catch (err) {
    console.error("❌ Erreur chargement golfs.json :", err);
    golfSelect.innerHTML = `<p style="color:#f55;">Erreur de chargement des golfs</p>`;
  }
}

window.initGolfSelect = initGolfSelect;

// === Démarre une nouvelle partie ===
async function startNewRound(golfId) {
  const holeCard = $$("hole-card");
  const golfSelect = $$("golf-select");
  holeCard.innerHTML = "";
  golfSelect.style.display = "none";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    const golf = golfs.find((g) => g.id === golfId);
    if (!golf) {
      holeCard.innerHTML = `<p style="color:#f55;">⚠️ Golf introuvable</p>`;
      return;
    }

    currentGolf = golf;
    currentHole = 1;
    holes = golf.pars.map((par, i) => ({ number: i + 1, par }));
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);

    // ✅ Affiche la modale avant de commencer
    showMoodAndStrategyModal(() => {
      console.log("✅ Mood & stratégie confirmés → affichage de la carte de score");
      renderHole(currentHole);
    });
  } catch (err) {
    console.error("❌ Erreur chargement golfs.json :", err);
    if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">Erreur de chargement du golf</p>`;
  }
}

// === Mood & Stratégie avant la partie ===
function showMoodAndStrategyModal(onConfirm) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style.zIndex = "12000";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:400px;text-align:center;padding:20px;">
      <h3>😎 Mood du jour</h3>
      <div id="mood-buttons" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px;">
        <button class="btn mood" data-mood="focus">Focus</button>
        <button class="btn mood" data-mood="relax">Relax</button>
        <button class="btn mood" data-mood="fun">Fun</button>
        <button class="btn mood" data-mood="grind">Grind</button>
      </div>

      <h4 style="margin-top:18px;">🎯 Stratégie</h4>
      <div id="strategy-buttons" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px;">
        <button class="btn strat" data-strat="safe">Safe</button>
        <button class="btn strat" data-strat="aggressive">Aggressive</button>
        <button class="btn strat" data-strat="5050">50/50</button>
        <button class="btn strat" data-strat="mindset">Mindset</button>
      </div>

      <h4 style="margin-top:18px;">🧑‍🏫 Choisis ton coach</h4>
      <div id="coach-buttons" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px;">
        <button class="btn coach" data-coach="dorothee">Dorothée</button>
        <button class="btn coach" data-coach="greg">Greg</button>
        <button class="btn coach" data-coach="gauthier">Gauthier</button>
      </div>

      <button id="start-round" class="btn" style="margin-top:20px;background:#00ff99;color:#111;">🚀 Démarrer</button>
    </div>
  `;
  document.body.appendChild(modal);

  let mood = "focus";
  let strat = "mindset";
  let coach = "dorothee";

  modal.querySelectorAll(".mood").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mood = btn.dataset.mood;
    });
  });

  modal.querySelectorAll(".strat").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".strat").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      strat = btn.dataset.strat;
    });
  });

  modal.querySelectorAll(".coach").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".coach").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      coach = btn.dataset.coach;
    });
  });

  modal.querySelector("#start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    localStorage.setItem("coach", coach);
    modal.remove();

    showCoachIA?.(`🧠 Mood: ${mood} · 🎯 Stratégie: ${strat} · 🗣️ Coach: ${coach}`);
    if (typeof onConfirm === "function") onConfirm();
  });
}

window.showMoodAndStrategyModal = showMoodAndStrategyModal;

// === (reste du code identique : renderHole, analyzeHole, updateParfectCounter, showConfetti, summarizeRound, saveCurrentHole) ===

// === Exports ===
window.startNewRound = startNewRound;
window.renderHole = renderHole;
window.analyzeHole = analyzeHole;
