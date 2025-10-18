// === Parfect.golfr - play.js (MVP sans module) ===
console.log("🏌️ Parfect Play ready");

// petit helper
window.$ = (id) => document.getElementById(id);

const STORAGE_KEY = "golfHistory";

let currentGolf = null;
let currentHole = 1;
let totalHoles = 18;
let holes = [];
let currentDiff = 0;

// --- Scores disponibles ---
const SCORE_CHOICES = [
  { key: "parfect", label: "💚 Parfect", diff: 0 },
  { key: "bogeyfect", label: "💙 Bogey’fect", diff: 1 },
  { key: "birdie", label: "Birdie", diff: -1 },
  { key: "par", label: "Par", diff: 0 },
  { key: "bogey", label: "Bogey", diff: 1 },
  { key: "double", label: "Double", diff: 2 },
  { key: "triple", label: "Triple", diff: 3 },
  { key: "eagle", label: "Eagle", diff: -2 },
];

// === Initialisation ===
document.addEventListener("DOMContentLoaded", async () => {
  if (window.fetchGolfs) {
    initGolfSelect();
  } else {
    console.warn("⚠️ fetchGolfs non défini — charger data.js avant play.js");
  }
});

// === Sélection du golf ===
async function initGolfSelect() {
  const zone = $("golf-select");
  const golfs = await window.fetchGolfs();
  zone.innerHTML =
    "<h3>Choisis ton golf :</h3>" +
    golfs.map((g) => `<button class='btn golf-btn' data-id='${g.id}'>⛳ ${g.name}</button>`).join("");

  zone.querySelectorAll(".golf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = golfs.find((x) => String(x.id) === btn.dataset.id);
      startRound(g);
    });
  });
}

// === Démarrer partie ===
function startRound(golf) {
  currentGolf = golf;
  totalHoles = Array.isArray(golf?.pars) ? golf.pars.length : 18;
  currentHole = 1;
  holes = new Array(totalHoles).fill(null);
  localStorage.setItem("roundInProgress", "true");
  showScorecardIntro();
  $("golf-select").style.display = "none";
  renderHole();
}

// === Onboarding ===
function showScorecardIntro() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:left;">
      <h2>📋 Carte de Score</h2>
      <p>
        💚 <b>Parfect</b> = Par + Fairway + GIR + ≤ 2 putts<br>
        💙 <b>Bogey’fect</b> = Bogey + Fairway + ≤ 2 putts
      </p>
      <button id="close-intro" class="btn" style="background:#00c676;">OK</button>
    </div>`;
  document.body.appendChild(modal);
  $("close-intro").addEventListener("click", () => modal.remove());
}

// === Affichage du trou ===
function renderHole() {
  if (!currentGolf) return;

  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];
  const saved = holes[currentHole - 1] || {};
  const totalVsPar = holes.filter(Boolean).reduce((a, h) => a + (h.score - h.par), 0);

  zone.innerHTML = `
    <div style="text-align:center;margin-bottom:10px;">
      <strong>Trou ${currentHole}/${totalHoles}</strong> — Par ${par} — 
      Score total : ${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
      ${SCORE_CHOICES.map(s => `
        <button class="btn score-btn ${s.diff===currentDiff?'active':''}" data-diff="${s.diff}">
          ${s.label}
        </button>`).join("")}
    </div>

    <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <label><input type="checkbox" id="fairway" ${saved.fairway?'checked':''}> Fairway</label>
      <label><input type="checkbox" id="gir" ${saved.gir?'checked':''}> GIR</label>
      <label><input type="checkbox" id="routine" ${saved.routine?'checked':''}> Routine</label>
    </div>

    <div style="text-align:center;margin-top:8px;">
      <label>Distance 2ᵉ putt :
        <select id="dist2">
          <option value="">Choisir</option>
          <option value="1">Donné</option>
          <option value="2">One putt baby</option>
          <option value="3">Moins de 2m</option>
          <option value="4">Moins de 4m</option>
          <option value="5">Moins de 6m</option>
          <option value="6">Au-delà</option>
        </select>
      </label>
    </div>

    <div id="trouble-zone" style="display:${currentDiff>=2?'block':'none'};margin-top:10px;text-align:center;">
      <label>Pourquoi double ou plus ?</label><br>
      <select id="trouble">
        <option value="none">R.A.S.</option>
        <option value="drive">Drive égaré</option>
        <option value="penalite">Pénalité</option>
        <option value="approche">Approche manquée</option>
      </select>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:14px;">
      <button id="prev-hole" class="btn" ${currentHole===1?'disabled':''}>⬅️ Trou ${currentHole-1}</button>
      <button id="next-hole" class="btn" style="background:#00ff99;">Trou ${currentHole+1} ➡️</button>
    </div>
  `;

  // bouton score
  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentDiff = parseInt(btn.dataset.diff);
      if (btn.textContent.includes("Parfect") || btn.textContent.includes("Bogey")) {
        $("fairway").checked = true;
        $("routine").checked = true;
      }
      saveCurrentHole();
      goNextHole();
    });
  });

  $("prev-hole").addEventListener("click", () => {
    saveCurrentHole();
    if (currentHole > 1) {
      currentHole--;
      renderHole();
    }
  });

  $("next-hole").addEventListener("click", () => {
    saveCurrentHole();
    goNextHole();
  });
}

function goNextHole() {
  if (currentHole < totalHoles) {
    currentHole++;
    renderHole();
  } else {
    endRound();
  }
}

// === Sauvegarde ===
function saveCurrentHole() {
  if (!currentGolf) return;
  const par = currentGolf.pars[currentHole - 1];
  holes[currentHole - 1] = {
    hole: currentHole,
    par,
    score: par + currentDiff,
    fairway: $("fairway").checked,
    gir: $("gir").checked,
    routine: $("routine").checked,
    dist2: $("dist2").value,
    trouble: $("trouble")?.value || "none",
  };
}

// === Fin de partie ===
function endRound() {
  const valid = holes.filter(Boolean);
  const total = valid.reduce((a, h) => a + (h.score - h.par), 0);
  const parfects = valid.filter(h => h.fairway && h.gir && (h.score - h.par)===0).length;
  const bogeyfects = valid.filter(h => h.fairway && !h.gir && (h.score - h.par)===1).length;

  $("hole-card").innerHTML = `
    <div style="text-align:center;">
      <h3>Carte terminée 💚</h3>
      <p>Total vs Par : <strong>${total>0?'+'+total:total}</strong></p>
      <p>💚 ${parfects} Parfects · 💙 ${bogeyfects} Bogey’fects</p>
      <button id="new-round" class="btn">🔁 Nouvelle partie</button>
    </div>
  `;
  $("new-round").addEventListener("click", resetRound);
}

// === Reset ===
function resetRound() {
  currentGolf = null;
  holes = [];
  $("golf-select").style.display = "block";
  $("hole-card").innerHTML = "";
  localStorage.setItem("roundInProgress", "false");
}

// === Modal reprendre/nouvelle ===
window.showResumeOrNewModal = function() {
  const hasActive = localStorage.getItem("roundInProgress") === "true";
  const m = document.createElement("div");
  m.className = "modal-backdrop";
  m.innerHTML = `
    <div class="modal-card" style="text-align:center;">
      <h3>🎯 Que veux-tu faire ?</h3>
      <p>${hasActive ? "Reprendre la partie ou recommencer ?" : "Nouvelle partie ?"}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        ${hasActive ? `<button id="resume-round" class="btn">Reprendre</button>` : ""}
        <button id="new-round-start" class="btn" style="background:#00c676;">Nouvelle partie</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  if (hasActive) $("resume-round").onclick = () => { m.remove(); renderHole(); };
  $("new-round-start").onclick = () => { m.remove(); resetRound(); };
};



