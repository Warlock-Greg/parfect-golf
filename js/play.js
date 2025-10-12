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
  
  { key: "bogey",  label: "Bogey",        diff:  1 },
  { key: "par",    label: "Par",          diff:  0 },
  { key: "birdie", label: "Birdie",       diff: -1 },
  { key: "double", label: "Double",       diff:  2 },
  { key: "triple", label: "Triple",       diff:  3 },
  { key: "eagle",  label: "Eagle",        diff: -2 },
  { key: "deagle", label: "Double Eagle", diff: -3 },
];

function sumVsPar(arr) {
  return arr.reduce((acc, h) => acc + ((h?.score ?? h?.par ?? 0) - (h?.par ?? 0)), 0);
}

function showCoachToast(message, color = "#00ff99") {
  const panel = document.createElement("div");
  panel.className = "coach-panel";
  panel.innerHTML = `
    <div class="coach-avatar">😎</div>
    <strong style="font-size:1.1rem;">Coach Greg</strong> says:
    <div class="coach-text" style="color:${color}>${message}</div>
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

  // ✅ Remise du score total à 0
  $("score-summary").textContent = "Score cumulé : 0";
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
    <div id="mini-recap" class="mini-recap"></div>
    <h3>Trou ${currentHole} — Par ${par}</h3>

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
  updateMiniRecap();


  // ---- Score buttons
  const btnWrap = $("score-buttons");
  btnWrap.innerHTML = SCORE_CHOICES.map(sc => `
    <button class="btn score-btn" data-diff="${sc.diff}" style="padding:.1rem .1rem;">${sc.label}</button>
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
  });

  // ---- Bogey’fect button
  $("btn-bogeyfect").addEventListener("click", () => {
    $("fairway").checked = true;
    $("gir").checked = false;
    puttsSel.value = 2;
    currentDiff = 1; // Bogey
    highlightSelection();
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
  const entry = saveCurrentHole(false);
  holes[currentHole - 1] = entry;

  // === CALCUL DU SCORE TOTAL ===
  const total = holes
    .filter(Boolean)
    .reduce((acc, h) => acc + (h.score - h.par), 0);

  // === CHECK PARFECT / BOGEY'FECT ===
  const isParfect = entry.fairway && entry.gir && entry.putts <= 2 && entry.score - entry.par === 0;
  const isBogeyfect = entry.fairway && !entry.gir && entry.putts <= 2 && entry.score - entry.par === 1;

  // === MESSAGES ALEATOIRES ===
  const coolMessages = [
    "Cool tempo bro, next hole easy.",
    "Smart golf, calm swing.",
    "Zen swing, big smile.",
    "Stay chill, enjoy the walk.",
    "Easy focus, great energy."
  ];

  const foodEmojis = ["🥤", "🍪", "🥪", "🍩", "🍺", "☕"];
  const emoji = (currentHole % 3 === 0) ? " " + foodEmojis[Math.floor(Math.random() * foodEmojis.length)] : "";

  let msg = `Trou ${currentHole} enregistré — ton score est ${total > 0 ? "+" + total : total}`;
  let color = "#00ff99";

  if (isParfect) {
    msg = `💚 Parfect enregistré — ${coolMessages[Math.floor(Math.random() * coolMessages.length)]}${emoji}`;
    color = "#00ff99";
  } else if (isBogeyfect) {
    msg = `💙 Bogey’fect enregistré — ${coolMessages[Math.floor(Math.random() * coolMessages.length)]}${emoji}`;
    color = "#44ffaa";
  } else {
    msg += emoji;
    color = total > 0 ? "#ff6666" : total < 0 ? "#00ff99" : "#fff";
  }

  // === TOAST MESSAGE ===
  showCoachToast(msg, color);

  // === MESSAGE COACH GREG APRÈS 1.5s ===
  const coachMessage = tipAfterHole(entry, "fun");
  setTimeout(() => showCoachToast(coachMessage), 1600);


// === MODAL DEMI-PARTIE ===
if (currentHole === 9 || currentHole === 12) {
  showMidRoundModal(currentHole, total);
  return; // stop ici, la suite sera gérée dans la modal
}

    
  // === PASSAGE AU TROU SUIVANT ===
  setTimeout(() => {
    if (currentHole < totalHoles) {
      currentHole++;
      currentDiff = null;
      renderHole();
    } else {
      endRound();
    }
  }, 2600);
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
    updateMiniRecap();

    return entry;
  }
}

// ---- End Round & Save ----
function endRound(showBadge = false) {
  // === CALCULS ===
  const totalVsPar = holes.reduce((acc, h) => acc + (h.score - h.par), 0);
  const parfects = holes.filter(
    (h) => h && h.fairway && h.gir && h.putts <= 2 && (h.score - h.par) === 0
  ).length;
  const bogeyfects = holes.filter(
    (h) => h && h.fairway && !h.gir && h.putts <= 2 && (h.score - h.par) === 1
  ).length;

  // === SAUVEGARDE DANS LE LOCALSTORAGE ===
  saveRound({
    date: new Date().toISOString(),
    golf: currentGolf.name,
    totalVsPar,
    parfects,
    bogeyfects,
    holes,
  });

  // === SI BADGE FINAL DEMANDÉ (mode partage Instagram) ===
  if (showBadge) {
    showFinalBadge(currentGolf.name, totalVsPar, parfects, bogeyfects);
    return;
  }

  // === AFFICHAGE DU RÉSUMÉ STANDARD ===
  const summary = `
    <div class="score-summary-card">
      <h3>Carte terminée 💚</h3>
      <p>Total vs Par : <strong>${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}</strong></p>
      <p>💚 Parfects : ${parfects} · 💙 Bogey’fects : ${bogeyfects}</p>

      <table class="score-table">
        <thead>
          <tr>
            <th>Trou</th>
            <th>Par</th>
            <th>Score</th>
            <th>Vs Par</th>
            <th>FW</th>
            <th>GIR</th>
            <th>Putts</th>
            <th>Dist1 (m)</th>
          </tr>
        </thead>
        <tbody>
          ${holes
            .map((h) => {
              const diff = h.score - h.par;
              const vs =
                diff === 0 ? "Par" : diff < 0 ? `${Math.abs(diff)}↓` : `+${diff}`;
              return `
                <tr>
                  <td>${h.hole}</td>
                  <td>${h.par}</td>
                  <td>${h.score}</td>
                  <td>${vs}</td>
                  <td>${h.fairway ? "✔" : "—"}</td>
                  <td>${h.gir ? "✔" : "—"}</td>
                  <td>${h.putts}</td>
                  <td>${h.dist1}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>

      <div class="end-actions">
        <button class="btn" id="new-round">🔁 Nouvelle partie</button>
        <button class="btn secondary" id="share-badge">🎖️ Voir le badge</button>
      </div>
    </div>
  `;

  // Injection dans le DOM
  $("hole-card").innerHTML = summary;

  // === BOUTON NOUVELLE PARTIE ===
  $("new-round").addEventListener("click", () => {
    $("golf-select").style.display = "block";
    $("hole-card").innerHTML = "";
  });

  // === BOUTON AFFICHER LE BADGE ===
  $("share-badge").addEventListener("click", () => {
    showFinalBadge(currentGolf.name, totalVsPar, parfects, bogeyfects);
  });
}

function showFinalBadge(golfName, totalVsPar, parfects, bogeyfects) {
  const modal = document.createElement("div");
  modal.className = "badge-modal";
  modal.innerHTML = `
    <div class="badge-content" id="badge-to-share">
      <h2>🎖️ Parfect Badge</h2>
      <p>${golfName}</p>
      <div class="badge-stats">
        <p>Score total : <strong>${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}</strong></p>
        <p>💚 Parfects : ${parfects}</p>
        <p>💙 Bogey’fects : ${bogeyfects}</p>
      </div>
      <p class="badge-quote">"Smart Golf. Cool Mindset."</p>
      <button id="share-instagram" class="btn">📸 Partager sur Instagram</button>
      <button id="close-badge" class="btn secondary">Fermer</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("share-instagram").addEventListener("click", captureBadgeAsImage);

  document.getElementById("close-badge").addEventListener("click", () => {
    modal.remove();
    $("golf-select").style.display = "block";
    $("hole-card").innerHTML = "";
  });
}

// === GÉNÉRATION D'IMAGE DU BADGE ===
async function captureBadgeAsImage() {
  const badge = document.querySelector(".badge-content");
  if (!badge) return;

  try {
    const canvas = await html2canvas(badge, {
      backgroundColor: "#111", // fond noir élégant
      scale: 2,                // qualité retina
      useCORS: true            // support des images distantes
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "parfect-badge.png";
    link.click();

    showCoachToast("📸 Badge sauvegardé ! Partage-le sur Instagram 💚", "#00ff99");
  } catch (e) {
    console.error("Erreur capture badge :", e);
    alert("Erreur lors de la capture du badge 😅");
  }
}


function updateMiniRecap() {
  const recap = document.getElementById("mini-recap");
  if (!recap) return;

  const played = holes.filter(Boolean);
  const totalPlayed = played.length;
  const totalVsPar = played.reduce((acc, h) => acc + (h.score - h.par), 0);
  const parfects = played.filter(
    (h) => h.fairway && h.gir && h.putts <= 2 && (h.score - h.par) === 0
  ).length;
  const bogeyfects = played.filter(
    (h) => h.fairway && !h.gir && h.putts <= 2 && (h.score - h.par) === 1
  ).length;

  recap.innerHTML = `
    <span>Trou ${currentHole}/${totalHoles}</span>
    <span>Score : <strong style="color:${totalVsPar > 0 ? '#ff6666' : totalVsPar < 0 ? '#00ff99' : '#fff'}">${totalVsPar > 0 ? '+' + totalVsPar : totalVsPar}</strong></span>
    <span>💚 ${parfects}</span>
    <span>💙 ${bogeyfects}</span>
  `;
}


function saveRound(round) {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history.push(round);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function showMidRoundModal(hole, total) {
  const modal = document.createElement("div");
  modal.className = "midround-modal";
  modal.innerHTML = `
    <div class="midround-content">
      <h3>Mi-parcours ⛳</h3>
      <p>Tu viens de finir le trou ${hole}. Ton score actuel est ${
        total > 0 ? "+" + total : total
      }.</p>
      <p>Tu veux continuer ou sauvegarder ta partie maintenant ?</p>
      <div class="midround-actions">
        <button id="continue-round" class="btn">Continuer</button>
        <button id="save-round" class="btn save">💾 Sauvegarder</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("continue-round").addEventListener("click", () => {
    modal.remove();
    currentHole++;
    currentDiff = null;
    renderHole();
  });

  document.getElementById("save-round").addEventListener("click", () => {
    modal.remove();
    endRound(true); // true = badge final
  });
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
