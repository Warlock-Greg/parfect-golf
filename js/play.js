// js/play.js
import { fetchGolfs } from "./data.js";
import { tipAfterHole } from "./coach.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "golfHistory";

let currentGolf = null;
let currentHole = 1;
let totalHoles = 18;
let holes = [];

// === INIT ===
(async function initGolfSelect() {
  const golfs = await fetchGolfs();
  const zone = $("golf-select");
  zone.innerHTML =
    "<h3>Choisis ton golf :</h3>" +
    golfs
      .map(
        (g) => `
      <button class="btn golf-btn" data-id="${g.id}">
        ⛳ ${g.name}
      </button>`
      )
      .join("");
  document.querySelectorAll(".golf-btn").forEach((btn) =>
    btn.addEventListener("click", () =>
      startRound(golfs.find((g) => g.id === btn.dataset.id))
    )
  );
})();

// === DÉMARRER UNE PARTIE ===
function startRound(golf) {
  currentGolf = golf;
  currentHole = 1;
  holes = [];
  $("golf-select").style.display = "none"; // cache la sélection
  $("score-summary").innerHTML = ""; // reset summary
  renderHole();
}

// === AFFICHER LE TROU COURANT ===
function renderHole() {
  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];
  const cumu = holes.reduce((acc, h) => acc + (h.score - h.par), 0);

  zone.innerHTML = `
    <h3>Trou ${currentHole} — Par ${par}</h3>
    <p>Score cumulé vs Par : <strong>${cumu > 0 ? "+" + cumu : cumu}</strong></p>

    <label>Score brut :</label>
    <input type="number" id="hole-score" min="1" max="12" />
    <span id="score-feedback" class="ml-2 text-sm font-semibold"></span>

    <div class="stats">
      <label><input type="checkbox" id="fairway"> Fairway</label>
      <label><input type="checkbox" id="gir"> GIR</label>
      <label><input type="number" id="putts" min="0" max="5" placeholder="Putts" /></label>
    </div>

    <div class="flex" style="display:flex;justify-content:center;gap:8px;margin-top:10px;">
      <button id="btn-parfect" class="btn">💚 Parfect</button>
      <button id="btn-bogeyfect" class="btn" style="background:#44ffaa;">💙 Bogey’fect</button>
    </div>

    <button id="next-hole" class="btn" style="margin-top:10px;">Trou suivant ➡️</button>

    <div id="coach-message" style="margin-top:15px;font-style:italic;opacity:.9;"></div>
  `;

  const scoreInput = $("hole-score");
  const feedback = $("score-feedback");
  const fairway = $("fairway");
  const gir = $("gir");
  const putts = $("putts");
  const parfect = $("btn-parfect");
  const bogeyfect = $("btn-bogeyfect");
  const coachBox = $("coach-message");

  // === FEEDBACK DYNAMIQUE ===
  scoreInput.addEventListener("input", () => {
    const score = parseInt(scoreInput.value, 10);
    if (!score) return (feedback.textContent = "");
    const diff = score - par;
    let label = "",
      color = "";
    switch (diff) {
      case -3:
        label = "🦅 Double Eagle";
        color = "text-blue-400";
        break;
      case -2:
        label = "🦅 Eagle";
        color = "text-blue-300";
        break;
      case -1:
        label = "💚 Birdie";
        color = "text-green-400";
        break;
      case 0:
        label = "⚪ Par";
        color = "text-gray-300";
        break;
      case 1:
        label = "💙 Bogey";
        color = "text-menthe";
        break;
      case 2:
        label = "🔴 Double Bogey";
        color = "text-red-500";
        break;
      default:
        label = diff < -3 ? "🤯 Ultra rare" : `+${diff} Over Par`;
        color = diff < -3 ? "text-blue-500" : "text-red-500";
    }
    feedback.textContent = label;
    feedback.className = `ml-2 text-sm font-semibold ${color}`;
  });

  // === BOUTON PARFECT ===
  parfect.addEventListener("click", () => {
    fairway.checked = true;
    gir.checked = true;
    putts.value = 2;
    parfect.textContent = "💚 Parfect enregistré !";
    setTimeout(() => (parfect.textContent = "💚 Parfect"), 2000);
  });

  // === BOUTON BOGEY’FECT ===
  bogeyfect.addEventListener("click", () => {
    fairway.checked = true;
    gir.checked = false;
    putts.value = 2;
    scoreInput.value = par + 1;
    feedback.textContent = "💙 Bogey’fect — fairway, 2 putts, stratégie smart!";
    feedback.style.color = "#44ffaa";
    bogeyfect.textContent = "💙 Bogey’fect enregistré !";
    bogeyfect.style.background = "#44ffaa";
    bogeyfect.style.color = "#000";
    setTimeout(() => {
      bogeyfect.textContent = "💙 Bogey’fect";
      bogeyfect.style.background = "";
      bogeyfect.style.color = "";
    }, 2000);
  });

  // === TROU SUIVANT ===
  $("next-hole").addEventListener("click", () => {
    const entry = {
      hole: currentHole,
      par,
      score: parseInt(scoreInput.value, 10),
      fairway: fairway.checked,
      gir: gir.checked,
      putts: parseInt(putts.value, 10),
      routine: true,
    };
    holes.push(entry);

    const message = tipAfterHole(entry, "fun");
    coachBox.textContent = message;

    setTimeout(() => {
      if (currentHole < totalHoles) {
        currentHole++;
        renderHole();
      } else {
        endRound();
      }
    }, 1800);
  });
}

// === FIN DE PARTIE ===
function endRound() {
  const totalVsPar = holes.reduce((acc, h) => acc + (h.score - h.par), 0);
  const parfects = holes.filter(
    (h) => h.fairway && h.gir && h.putts <= 2 && h.score - h.par === 0
  ).length;
  const bogeyfects = holes.filter(
    (h) => h.fairway && !h.gir && h.putts <= 2 && h.score - h.par === 1
  ).length;

  // Sauvegarde locale
  saveRound({
    date: new Date().toISOString(),
    golf: currentGolf.name,
    totalVsPar,
    parfects,
    bogeyfects,
    holes,
  });

  const summary = `
    <h3>Carte terminée 💚</h3>
    <p>Total vs Par : <strong>${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}</strong></p>
    <p>💚 Parfects : ${parfects} · 💙 Bogey’fects : ${bogeyfects}</p>

    <table style="margin:auto;border-collapse:collapse;">
      <tr><th>Trou</th><th>Par</th><th>Score</th><th>Vs Par</th></tr>
      ${holes
        .map((h) => {
          const diff = h.score - h.par;
          const label =
            diff === 0 ? "Par" : diff < 0 ? `${Math.abs(diff)}↓` : `+${diff}`;
          return `<tr><td>${h.hole}</td><td>${h.par}</td><td>${h.score}</td><td>${label}</td></tr>`;
        })
        .join("")}
    </table>

    <p style="margin-top:10px;">${tipAfterHole(
      holes[holes.length - 1],
      "zen"
    )}</p>
  `;

  $("hole-card").innerHTML = summary;
  $("golf-select").style.display = "block"; // réaffiche la sélection à la fin
}

// === SAUVEGARDE LOCALSTORAGE ===
function saveRound(round) {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history.push(round);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
