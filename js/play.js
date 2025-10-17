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
  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];
  const saved = holes[currentHole - 1];
  currentDiff = saved?.score ? saved.score - par : null;

  zone.innerHTML = `
    <div id="mini-recap" class="mini-recap"></div>
    <h3>Trou ${currentHole} — Par ${par}</h3>

    <div id="strategy-block" style="margin-bottom:10px;">
      <label>🎯 Stratégie :</label>
      <select id="strategy-choice">
        <option value="safe">Safe</option>
        <option value="aggressive">Aggressive</option>
        <option value="5050">50/50</option>
        <option value="fairway">Fairway First</option>
        <option value="mindset">Parfect Mindset</option>
      </select>
    </div>

    <div id="score-buttons" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;"></div>

    <div class="stats" style="margin-top:8px;">
      <label><input type="checkbox" id="fairway"> Fairway</label>
      <label><input type="checkbox" id="gir"> GIR</label>
      <label><input type="checkbox" id="routine"> Routine faite</label>

      <label style="margin-left:8px;">2e putt :
        <select id="second-putt">
          <option value="donne">🤝 Donné</option>
          <option value="oneputt">💚 One putt baby</option>
          <option value="2m">Moins de 2m</option>
          <option value="4m">Moins de 4m</option>
          <option value="6m">Moins de 6m</option>
          <option value="plus">Au-delà</option>
        </select>
      </label>
    </div>

    <div style="display:flex;justify-content:center;margin-top:12px;">
      <button id="next-hole" class="btn">➡️ Trou ${currentHole < totalHoles ? currentHole + 1 : "suivant"}</button>
    </div>
  `;

  const btnWrap = $("score-buttons");
  btnWrap.innerHTML = SCORE_CHOICES.map(
    (sc) => `
      <button class="btn score-btn ${sc.special ? "special-score" : ""}" data-diff="${sc.diff}">
        ${sc.label}
      </button>`
  ).join("");

  btnWrap.querySelectorAll(".score-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentDiff = parseInt(btn.dataset.diff, 10);
      btnWrap.querySelectorAll(".score-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (btn.classList.contains("special-score")) {
        $("next-hole").click();
      }
    })
  );

  $("next-hole").addEventListener("click", () => saveAndNext());
}

// === Enregistrement du trou ===
function saveAndNext() {
  const fairway = $("fairway").checked;
  const gir = $("gir").checked;
  const routine = $("routine").checked;
  const secondPutt = $("second-putt").value;
  const par = currentGolf.pars[currentHole - 1];
  const diff = currentDiff ?? 0;
  const score = par + diff;

  const entry = {
    hole: currentHole,
    par,
    score,
    fairway,
    gir,
    routine,
    secondPutt,
    diff,
    strategy: $("strategy-choice").value,
  };

  holes[currentHole - 1] = entry;

  // === Analyse et feedback du coach ===
  analyzeHole(entry);

  if (currentHole < totalHoles) {
    currentHole++;
    setTimeout(() => renderHole(), 2000);
  } else {
    endRound();
  }
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
