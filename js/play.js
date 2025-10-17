// js/play.js
import { fetchGolfs } from "./data.js";
import { showCoachIA, initCoachIA } from "./coachIA.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "golfHistory";

let currentGolf = null;
let currentHole = 1;
let totalHoles = 18;
let holes = [];
let currentDiff = null;

// --- Helpers ---
const SCORE_CHOICES = [
  { key: "parfect", label: "💚 Parfect", diff: 0, special: true },
  { key: "bogeyfect", label: "💙 Bogey’fect", diff: 1, special: true },
  { key: "birdie", label: "Birdie", diff: -1 },
  { key: "par", label: "Par", diff: 0 },
  { key: "bogey", label: "Bogey", diff: 1 },
  { key: "double", label: "Double", diff: 2 },
  { key: "triple", label: "Triple", diff: 3 },
  { key: "eagle", label: "Eagle", diff: -2 },
];

// === Initialisation ===
document.addEventListener("DOMContentLoaded", async () => {
  await initCoachIA();
  initGolfSelect();
  console.log("🏌️ Parfect Play ready");
});

// === Sélection du golf ===
async function initGolfSelect() {
  const zone = $("golf-select");
  const golfs = await fetchGolfs();
  zone.innerHTML =
    "<h3>Choisis ton golf :</h3>" +
    golfs
      .map(
        (g) => `<button class="btn golf-btn" data-id="${g.id}">⛳ ${g.name}</button>`
      )
      .join("");

  zone.querySelectorAll(".golf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = golfs.find((x) => String(x.id) === btn.dataset.id);
      startRound(g);
    });
  });
}

// === Lancement d’une partie ===
function startRound(golf) {
  currentGolf = golf;
  totalHoles = Array.isArray(golf.pars) ? golf.pars.length : 18;
  currentHole = 1;
  holes = new Array(totalHoles).fill(null);
  showScorecardIntro(); // ✅ toujours affichée au début de la partie
  showMoodAndStrategyModal();
}

// === Mood du jour & stratégie ===
function showMoodAndStrategyModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:400px;">
      <h3>😎 Ton mood du jour ?</h3>
      <div class="moods" style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn mood" data-mood="focus">Focus</button>
        <button class="btn mood" data-mood="relax">Relax</button>
        <button class="btn mood" data-mood="fun">Fun</button>
        <button class="btn mood" data-mood="grind">Grind</button>
      </div>
      <h4 style="margin-top:12px;">🎯 Quelle stratégie veux-tu suivre ?</h4>
      <div class="coach-styles" style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn strategy" data-strat="safe">Safe</button>
        <button class="btn strategy" data-strat="aggressive">Aggressive</button>
        <button class="btn strategy" data-strat="5050">50/50</button>
        <button class="btn strategy" data-strat="fairway">Fairway First</button>
        <button class="btn strategy" data-strat="mindset">Parfect Mindset</button>
      </div>
      <button id="start-round" class="btn" style="margin-top:12px;background:#00c676;color:white;">Démarrer</button>
    </div>
  `;
  document.body.appendChild(modal);

  let mood = "focus";
  let strat = "mindset";

  modal.querySelectorAll(".mood").forEach((b) =>
    b.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      mood = b.dataset.mood;
    })
  );

  modal.querySelectorAll(".strategy").forEach((b) =>
    b.addEventListener("click", () => {
      modal.querySelectorAll(".strategy").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      strat = b.dataset.strat;
    })
  );

  modal.querySelector("#start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    modal.remove();
    showCoachIA();
    renderHole();
  });
}

// === Rendu du trou ===
function renderHole() {
  if (!currentGolf) return;

  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];
  const saved = holes[currentHole - 1] || {};
  const diff = saved.score ? saved.score - par : 0;

  // Calcul du score total actuel
  const totalVsPar = holes
    .filter(Boolean)
    .reduce((acc, h) => acc + (h.score - h.par), 0);

  // === UI principale ===
  zone.innerHTML = `
    <div id="mini-recap" class="mini-recap" style="
      background:#111;
      padding:8px 12px;
      border-radius:12px;
      margin-bottom:10px;
      text-align:center;
      box-shadow:0 0 8px #00ff9980;">
      <strong>Trou ${currentHole}/${totalHoles}</strong> — 
      Par ${par} · 
      Score total : <span style="color:${totalVsPar>0 ? '#ff6666' : totalVsPar<0 ? '#00ff99' : '#fff'}">
      ${totalVsPar>0 ? '+'+totalVsPar : totalVsPar}</span>
    </div>

    <div class="hole-inputs" style="display:flex;flex-direction:column;gap:10px;align-items:center;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
        ${SCORE_CHOICES.map(sc => `
          <button class="btn score-btn" data-diff="${sc.diff}" 
            style="padding:6px 10px;${diff===sc.diff ? 'background:#00ff99;color:#111;font-weight:bold;' : ''}">
            ${sc.label}
          </button>
        `).join("")}
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:10px;">
        <label><input type="checkbox" id="fairway" ${saved.fairway?'checked':''}> Fairway</label>
        <label><input type="checkbox" id="gir" ${saved.gir?'checked':''}> GIR</label>
        <label><input type="checkbox" id="routine" ${saved.routine?'checked':''}> Routine faite</label>
      </div>

      <div style="margin-top:8px;">
        <label>Distance 2e putt :</label>
        <select id="dist2" style="margin-left:6px;padding:4px 6px;border-radius:6px;">
          <option value="">Choisir</option>
          <option value="1">Donné</option>
          <option value="2">One putt baby</option>
          <option value="3">Moins de 2 m</option>
          <option value="4">Moins de 4 m</option>
          <option value="5">Moins de 6 m</option>
          <option value="6">Au-delà</option>
        </select>
      </div>

      <div id="trouble-zone" style="display:none;margin-top:8px;">
        <label>Pourquoi double ou plus ?</label><br>
        <select id="trouble" style="margin-top:4px;padding:4px 6px;border-radius:6px;">
          <option value="none">R.A.S.</option>
          <option value="drive">Drive égaré</option>
          <option value="penalite">Pénalité</option>
          <option value="approche">Approche manquée</option>
        </select>
      </div>

      <div style="margin-top:14px;display:flex;justify-content:space-between;width:100%;max-width:360px;">
        <button id="prev-hole" class="btn" ${currentHole===1?'disabled':''}>⬅️ Trou précédent</button>
        <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">Trou suivant ➡️</button>
      </div>
    </div>
  `;

  // === Sélection du score ===
  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      currentDiff = parseInt(btn.dataset.diff);
      renderHole(); // re-render pour activer visuellement
    });
  });

  // === Afficher ou cacher le champ “trouble” ===
  const updateTrouble = () => {
    const sel = document.querySelector(".score-btn.active-score");
    const val = currentDiff ?? 0;
    document.getElementById("trouble-zone").style.display = val >= 2 ? "block" : "none";
  };
  updateTrouble();

  // === Navigation ===
  $("prev-hole").addEventListener("click", () => {
    if (currentHole > 1) {
      currentHole--;
      renderHole();
    }
  });

  $("next-hole").addEventListener("click", () => {
    saveCurrentHole(false);
    if (currentHole < totalHoles) {
      currentHole++;
      renderHole();
    } else {
      endRound();
    }
  });
}


// === Analyse coach IA ===
function analyzeHole(entry) {
  const mood = localStorage.getItem("mood") || "focus";
  const strat = localStorage.getItem("strategy") || "mindset";

  let message = "";

  if (entry.diff <= -1) message = "💚 Super trou ! Birdie ou mieux, c’est du Parfect Golf !";
  else if (entry.diff === 0 && entry.gir) message = "💪 Par solide avec GIR, keep calm & continue !";
  else if (entry.diff === 1 && entry.fairway) message = "💙 Bogey propre, ça reste un Bogey’fect !";
  else if (entry.diff >= 2) message = "😅 Double ou plus ? Respire, pense routine et rebondis au prochain trou.";
  else message = "Un coup après l’autre, reste dans ton flow.";

  message += ` (${strat} · ${mood})`;
  document.dispatchEvent(new CustomEvent("coach-message", { detail: message }));
}

// === Fin de partie ===
function endRound() {
  const total = holes.filter(Boolean).reduce((a, h) => a + (h.score - h.par), 0);
  $("hole-card").innerHTML = `
    <div class="score-summary-card">
      <h3>Carte terminée 💚</h3>
      <p>Total : ${total > 0 ? "+" + total : total}</p>
      <button class="btn" onclick="location.reload()">🔁 Nouvelle partie</button>
    </div>
  `;
}
