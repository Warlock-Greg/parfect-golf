// js/play.js
import { fetchGolfs } from "./data.js";
import { tipAfterHole } from "./coach.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "golfHistory";

// ---- State ----
let currentGolf = null;
let currentHole = 1;        // 1..18
let totalHoles = 18;
let holes = [];             // [{hole, par, score, fairway, gir, putts, dist1, routine}, ...]
let currentDiff = null;     // score vs par du trou courant (ex: 0, +1, -1, ...)

// ---- Helpers ----
const SCORE_CHOICES = [
  { key: "deagle", label: "Double Eagle", diff: -3 },
  { key: "eagle",  label: "Eagle",        diff: -2 },
  { key: "birdie", label: "Birdie",       diff: -1 },
  { key: "par",    label: "Par",          diff:  0 },
  { key: "bogey",  label: "Bogey",        diff:  1 },
  { key: "double", label: "Double",       diff:  2 },
  { key: "triple", label: "Triple",       diff:  3 },
];

function sumVsPar(arr) {
  return arr.reduce((acc, h) => acc + ((h?.score ?? h?.par ?? 0) - (h?.par ?? 0)), 0);
}

function showCoachToast(message) {
  const panel = document.createElement("div");
  panel.className = "coach-panel";
  panel.innerHTML = `
    <div class="coach-avatar">😎</div>
    <div class="coach-text">${message}</div>
  `;
  document.body.appendChild(panel);
  setTimeout(() => panel.remove(), 2800);
}

// ---- Init golf list ----
(async function initGolfSelect() {
  const zone = $("golf-select");
  const golfs = await fetchGolfs();
  zone.innerHTML =
    "<h3>Choisis ton golf :</h3>" +
    golfs.map(g => `<button class="btn golf-btn" data-id="${g.id}">⛳ ${g.name}</button>`).join("");
  zone.querySelectorAll(".golf-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const g = golfs.find(x => String(x.id) === btn.dataset.id);
      startRound(g);
    });
  });
})();

// ---- Start / Render Round ----
function startRound(golf) {
  currentGolf = golf;
  totalHoles = Array.isArray(currentGolf?.pars) ? currentGolf.pars.length : 18;
  currentHole = 1;
  holes = new Array(totalHoles).fill(null); // placeholders
  currentDiff = null;
  $("golf-select").style.display = "none";
  $("score-summary").innerHTML = "";
  renderHole();
}

function renderHole() {
  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];

  // Récupère valeurs si trou déjà saisi
  const saved = holes[currentHole - 1];
  const savedDiff = saved ? (saved.score - saved.par) : null;

  // Par défaut: trou impair => Bogey / trou pair => Par
  const defaultDiff = savedDiff != null
    ? savedDiff
    : (currentHole % 2 === 1 ? 1 : 0);

  currentDiff = defaultDiff;

  // Cumul actuel (trous précédents) + diff courant s'il est défini
  const prevHoles = holes.slice(0, currentHole - 1).filter(Boolean);
  const prevSum = sumVsPar(prevHoles);
  const liveCumu = prevSum + (currentDiff ?? 0);

  // HTML
  zone.innerHTML = `
    <h3>Trou ${currentHole} — Par ${par}</h3>
    <p>Score cumulé vs Par : <strong id="live-cumu">${liveCumu > 0 ? "+" + liveCumu : liveCumu}</strong></p>

    <div id="score-buttons" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0;"></div>

    <div class="stats" style="margin-top:8px;">
      <label><input type="checkbox" id="fairway"> Fairway</label>
      <label><input type="checkbox" id="gir"> GIR</label>

      <label style="margin-left:8px;">Putts :
        <select id="putts" style="margin-left:4px;"></select>
      </label>

      <label style="margin-left:8px;">Distance 1er putt :
        <select id="dist1" style="margin-left:4px;"></select> m
      </label>
    </div>

    <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;">
      <button id="btn-parfect" class="btn">💚 Parfect</button>
      <button id="btn-bogeyfect" class="btn" style="background:#44ffaa;">💙 Bogey’fect</button>
    </div>

    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px;">
      <button id="prev-hole" class="btn" ${currentHole === 1 ? 'disabled style="opacity:.4;pointer-events:none;"' : ""}>⬅️ Trou précédent</button>
      <button id="next-hole" class="btn">Trou suivant ➡️</button>
    </div>
  `;

  // ---- Score buttons
  const btnWrap = $("score-buttons");
  btnWrap.innerHTML = SCORE_CHOICES.map(sc => `
    <button class="btn score-btn" data-diff="${sc.diff}" style="padding:.6rem .8rem;">${sc.label}</button>
  `).join("");

  // Active selection
  function highlightSelection() {
    btnWrap.querySelectorAll(".score-btn").forEach(b => b.classList.remove("active-score"));
    const active = btnWrap.querySelector(`.score-btn[data-diff="${currentDiff}"]`);
    if (active) active.classList.add("active-score");
  }

  btnWrap.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentDiff = parseInt(btn.dataset.diff, 10);
      highlightSelection();
      updateLiveCumu();
    });
  });

  // ---- Putts (0..4) avec défaut 2
  const puttsSel = $("putts");
  for (let i = 0; i <= 4; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    puttsSel.appendChild(opt);
  }
  puttsSel.value = saved?.putts ?? 2;

  // ---- Distance 1er putt (0..30m)
  const distSel = $("dist1");
  for (let m = 0; m <= 30; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    distSel.appendChild(opt);
  }
  distSel.value = saved?.dist1 ?? 0;

  // ---- Checkboxes FW/GIR
  $("fairway").checked = saved?.fairway ?? false;
  $("gir").checked = saved?.gir ?? false;

  // ---- Defaults Par/Bogey (si pas déjà saisi)
  highlightSelection();

  // ---- Parfect button
  $("btn-parfect").addEventListener("click", () => {
    $("fairway").checked = true;
    $("gir").checked = true;
    puttsSel.value = 2;
    currentDiff = 0; // Par
    highlightSelection();
    updateLiveCumu();
  });

  // ---- Bogey’fect button
  $("btn-bogeyfect").addEventListener("click", () => {
    $("fairway").checked = true;
    $("gir").checked = false;
    puttsSel.value = 2;
    currentDiff = 1; // Bogey
    highlightSelection();
    updateLiveCumu();
  });

  // ---- Prev / Next
  $("prev-hole").addEventListener("click", () => {
    saveCurrentHole(false); // sauvegarde sans coach toast
    if (currentHole > 1) {
      currentHole--;
      currentDiff = null;
      renderHole();
    }
  });

  $("next-hole").addEventListener("click", () => {
    const savedEntry = saveCurrentHole(true); // sauvegarde + coach
    if (currentHole < totalHoles) {
      currentHole++;
      currentDiff = null;
      renderHole();
    } else {
      endRound();
    }
  });

  // ---- Live cumu updater
  function updateLiveCumu() {
    const prev = sumVsPar(holes.slice(0, currentHole - 1).filter(Boolean));
    const tmp = prev + (currentDiff ?? 0);
    const live = $("live-cumu");
    if (live) live.textContent = tmp > 0 ? `+${tmp}` : `${tmp}`;
  }

  // ---- Save current hole
  function saveCurrentHole(showCoach) {
    const fairway = $("fairway").checked;
    const gir = $("gir").checked;
    const putts = parseInt(puttsSel.value, 10);
    const dist1 = parseInt(distSel.value, 10);

    // si l'utilisateur n'a pas cliqué de score, prendre défaut actuel
    const diff = (currentDiff == null) ? (currentHole % 2 === 1 ? 1 : 0) : currentDiff;
    const score = par + diff;
    const entry = {
      hole: currentHole,
      par,
      score,
      fairway,
      gir,
      putts,
      dist1,
      routine: true,
    };
    holes[currentHole - 1] = entry;

    if (showCoach) {
      const msg = tipAfterHole(entry, "fun");
      showCoachToast(msg);
    }
    return entry;
  }
}

// ---- End Round & Save ----
function endRound() {
  const totalVsPar = sumVsPar(holes.filter(Boolean));
  const parfects = holes.filter(
    (h) => h && h.fairway && h.gir && h.putts <= 2 && (h.score - h.par) === 0
  ).length;
  const bogeyfects = holes.filter(
    (h) => h && h.fairway && !h.gir && h.putts <= 2 && (h.score - h.par) === 1
  ).length;

  // Save to localStorage
  saveRound({
    date: new Date().toISOString(),
    golf: currentGolf.name,
    totalVsPar,
    parfects,
    bogeyfects,
    holes,
  });

  // Summary UI
  $("hole-card").innerHTML = `
    <h3>Carte terminée 💚</h3>
    <p>Total vs Par : <strong>${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}</strong></p>
    <p>💚 Parfects : ${parfects} · 💙 Bogey’fects : ${bogeyfects}</p>

    <table style="margin:auto;border-collapse:collapse;">
      <tr><th>Trou</th><th>Par</th><th>Score</th><th>Vs Par</th><th>FW</th><th>GIR</th><th>Putts</th><th>Dist1 (m)</th></tr>
      ${holes
        .map((h) => {
          const diff = h.score - h.par;
          const vs = diff === 0 ? "Par" : diff < 0 ? `${Math.abs(diff)}↓` : `+${diff}`;
          return `<tr>
            <td>${h.hole}</td><td>${h.par}</td><td>${h.score}</td><td>${vs}</td>
            <td>${h.fairway ? "✔" : "—"}</td><td>${h.gir ? "✔" : "—"}</td>
            <td>${h.putts}</td><td>${h.dist1}</td>
          </tr>`;
        })
        .join("")}
    </table>

    <div style="margin-top:12px;">
      <button class="btn" id="new-round">🔁 Nouvelle partie</button>
    </div>
  `;

  $("new-round").addEventListener("click", () => {
    $("golf-select").style.display = "block";
    $("score-summary").innerHTML = "";
    $("hole-card").innerHTML = "";
  });
}

function saveRound(round) {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history.push(round);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// ---- Small style for active score button (optional) ----
document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = `
    .active-score { outline: 2px solid #00ff99; box-shadow: 0 0 0 2px rgba(0,255,153,0.25) inset; }
    table th { background:#00ff99; color:#000; padding:.4rem .5rem; }
    table td { padding:.35rem .5rem; border-bottom:1px solid #222; }
  `;
  document.head.appendChild(style);
});
