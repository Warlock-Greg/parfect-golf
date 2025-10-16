// === js/play_v2.js ===
import { fetchGolfs } from "./data.js";
import { tipAfterHole } from "./coach.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "golfHistory";

// ---- État global ----
let currentGolf = null;
let currentHole = 1;
let totalHoles = 18;
let holes = [];
let currentDiff = null;

// === COACH TOAST ===
function showCoachToast(message, color = "#00ff99") {
  document.querySelectorAll(".coach-toast").forEach((el) => el.remove());
  const toast = document.createElement("div");
  toast.className = "coach-toast";
  toast.innerHTML = `
    <div class="coach-avatar">😎</div>
    <div class="coach-message" style="color:${color}">${message}</div>
  `;
  document.body.appendChild(toast);

  toast.style.opacity = "0";
  requestAnimationFrame(() => {
    toast.style.transition = "opacity 0.3s ease";
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// === Initialisation du golf ===
(async function initGolfSelect() {
  const zone = $("golf-select");
  const golfs = await fetchGolfs();

  zone.innerHTML =
    "<h3>Choisis ton golf :</h3>" +
    golfs
      .map(
        (g) =>
          `<button class="btn golf-btn" data-id="${g.id}">⛳ ${g.name}</button>`
      )
      .join("");

  zone.querySelectorAll(".golf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = golfs.find((x) => String(x.id) === btn.dataset.id);
      startRound(g);
    });
  });
})();

// === Lancement de la partie ===
function startRound(golf) {
  currentGolf = golf;
  totalHoles = golf.pars.length;
  currentHole = 1;
  holes = new Array(totalHoles).fill(null);

  $("golf-select").style.display = "none";

  // 👇 Nouvelle modale Mood / Stratégie avant le trou 1
  showPreRoundModal();
}

// === Modale Mood + Stratégie ===
function showPreRoundModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:center;">
      <h2>💬 Ton mood du jour</h2>
      <div class="mood-options" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px;">
        <button class="btn mood-btn" data-mood="calme">🧘 Calme</button>
        <button class="btn mood-btn" data-mood="focus">🎯 Focus</button>
        <button class="btn mood-btn" data-mood="detente">😎 Détente</button>
        <button class="btn mood-btn" data-mood="compet">🔥 Compétiteur</button>
      </div>

      <h2 style="margin-top:18px;">🧭 Ta stratégie du jour</h2>
      <div class="strat-options" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px;">
        <button class="btn strat-btn" data-strategy="safe">🛟 Safe</button>
        <button class="btn strat-btn" data-strategy="parfect">💚 Parfect</button>
        <button class="btn strat-btn" data-strategy="aggressive">⚡️ Aggressive</button>
        <button class="btn strat-btn" data-strategy="gir50">🎯 GIR 50/50</button>
        <button class="btn strat-btn" data-strategy="playfree">🌈 Libre</button>
      </div>

      <div style="margin-top:24px;">
        <button id="start-round-btn" class="btn" style="background:#00c676;color:white;">🚀 Démarrer</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  setupPreRoundModal();
}

// === Gestion des choix Mood & Stratégie ===
function setupPreRoundModal() {
  const moodButtons = document.querySelectorAll(".mood-btn");
  const stratButtons = document.querySelectorAll(".strat-btn");
  const startBtn = document.getElementById("start-round-btn");

  let moodChoice = null;
  let stratChoice = null;

  moodButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      moodButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      moodChoice = btn.dataset.mood;
      localStorage.setItem("dailyMood", moodChoice);
    });
  });

  stratButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      stratButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      stratChoice = btn.dataset.strategy;
      localStorage.setItem("dailyStrategy", stratChoice);
    });
  });

  startBtn.addEventListener("click", () => {
    if (!moodChoice || !stratChoice) {
      showCoachToast("Choisis ton mood et ta stratégie avant de démarrer 💬", "#ff6666");
      return;
    }

    document.querySelector(".modal-backdrop")?.remove();

    const coachMsg = `Let's go ! Mood ${moodChoice.toUpperCase()}, stratégie ${stratChoice} 💚`;
    showCoachToast(coachMsg, "#00ff99");

    renderHole(1);
  });
}

// === Rendu du trou courant ===
function renderHole() {
  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];

  zone.innerHTML = `
    <h3>Trou ${currentHole} — Par ${par}</h3>

    <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0;">
      <button class="btn score-btn" data-diff="-1">Birdie</button>
      <button class="btn score-btn" data-diff="0">Par</button>
      <button class="btn score-btn" data-diff="1">Bogey</button>
      <button class="btn score-btn" data-diff="2">Double</button>
      <button class="btn score-btn" data-diff="3">Triple</button>
    </div>

    <div class="stats" style="margin-top:8px;">
      <label><input type="checkbox" id="fairway"> Fairway</label>
      <label><input type="checkbox" id="gir"> GIR</label>

      <label style="margin-left:8px;">2e putt :
        <select id="putt2" style="margin-left:4px;">
          <option value="1">One putt baby</option>
          <option value="2">Moins de 2m</option>
          <option value="4">Moins de 4m</option>
          <option value="6">Moins de 6m</option>
          <option value="7">Au-delà</option>
        </select>
      </label>

      <label style="margin-left:8px;">Routine :
        <input type="checkbox" id="routine" />
      </label>
    </div>

    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px;">
      <button id="prev-hole" class="btn" ${currentHole === 1 ? 'disabled style="opacity:.4;pointer-events:none;"' : ""}>⬅️ Trou ${currentHole - 1}</button>
      <button id="next-hole" class="btn">Trou ${currentHole + 1} ➡️</button>
    </div>
  `;

  $("next-hole").addEventListener("click", () => nextHole());
  $("prev-hole").addEventListener("click", () => prevHole());
}

// === Navigation trous ===
function nextHole() {
  saveCurrentHole();
  if (currentHole < totalHoles) {
    currentHole++;
    renderHole();
    showCoachToast(`Trou ${currentHole}, tu restes dans ton mood ${localStorage.getItem("dailyMood")} 💚`);
  } else {
    endRound();
  }
}

function prevHole() {
  if (currentHole > 1) {
    currentHole--;
    renderHole();
  }
}

// === Sauvegarde trou ===
function saveCurrentHole() {
  const fairway = $("fairway")?.checked ?? false;
  const gir = $("gir")?.checked ?? false;
  const putt2 = parseInt($("putt2")?.value ?? 2);
  const routine = $("routine")?.checked ?? false;

  const diffBtn = document.querySelector(".score-btn.active-score");
  const diff = diffBtn ? parseInt(diffBtn.dataset.diff, 10) : 0;

  const par = currentGolf.pars[currentHole - 1];
  const score = par + diff;

  holes[currentHole - 1] = { hole: currentHole, par, score, fairway, gir, putt2, routine };
  console.log("✅ Hole saved", holes[currentHole - 1]);
}

// === Fin de partie ===
function endRound() {
  showCoachToast("🏁 Partie terminée, bien joué !", "#00ff99");
  $("hole-card").innerHTML = "<h3>Fin de partie 🏁</h3><p>Résultats sauvegardés.</p>";
}
