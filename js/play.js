// js/play.js
import { fetchGolfs } from "./data.js";
// import { tipAfterHole } from "./coach.js"; // (plus utilisé ici)

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

/* =========================
   COACH: Toast (conserve ta version stylée)
   ========================= */
function showCoachToast(message, color) {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";
  const coaches = {
    greg: { name: "Greg", avatar: "😎", color: "#00ff99" },
    goathier: { name: "Goathier", avatar: "🧠", color: "#4db8ff" },
    dorothee: { name: "Dorothée", avatar: "💫", color: "#ff99cc" },
  };
  const coach = coaches[coachKey] || coaches.greg;
  const finalColor = color || coach.color;

  document.querySelectorAll(".coach-toast").forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = "coach-toast";
  toast.innerHTML = `
    <div class="coach-avatar-bubble" style="background:${finalColor}33;">${coach.avatar}</div>
    <div class="coach-text-zone">
      <div class="coach-name">${coach.name} dit :</div>
      <div class="coach-message">${message}</div>
    </div>
    <button id="stop-voice-btn" class="stop-voice-btn">🛑</button>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("visible"));

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 660;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (err) {
    console.warn("Audio non supporté :", err);
  }

  if ("vibrate" in navigator) navigator.vibrate(80);

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "fr-FR";
    utterance.pitch = 1;
    utterance.rate = 1.0;
    utterance.volume = 1;

    const setVoiceForCoach = (voices) => {
      const frVoices = voices.filter(v => v.lang?.toLowerCase().startsWith("fr"));
      let chosenVoice = null;
      const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";

      if (coachKey === "dorothee") {
        chosenVoice = frVoices.find(v => v.name?.toLowerCase().includes("female"))
          || frVoices[0];
        utterance.pitch = 1.2;
      } else if (coachKey === "goathier") {
        chosenVoice = frVoices.find(v => v.name?.toLowerCase().includes("male"))
          || frVoices[0];
        utterance.pitch = 0.9;
      } else {
        chosenVoice = frVoices[0];
      }
      if (chosenVoice) utterance.voice = chosenVoice;
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) setVoiceForCoach(voices);
    else window.speechSynthesis.onvoiceschanged = () => setVoiceForCoach(window.speechSynthesis.getVoices());
  }

  toast.querySelector("#stop-voice-btn").addEventListener("click", () => {
    window.speechSynthesis.cancel();
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  });

  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 400);
    }
  }, 8000);
}

/* =========================
   COACH: Cibles par objectif d’index
   (issu de tes objectives.js de mémoire)
   ========================= */
const GOAL_TARGETS = {
  0:  { fw:79, gir:67, putts:29 },
  5:  { fw:71, gir:56, putts:30 },
  7:  { fw:64, gir:50, putts:31 },
  9:  { fw:57, gir:44, putts:32 },
  12: { fw:50, gir:33, putts:33 },
  15: { fw:43, gir:22, putts:34 },
  18: { fw:36, gir:17, putts:35 },
  21: { fw:29, gir:11, putts:36 },
};

function getUserGoal() {
  const val = parseInt(localStorage.getItem("parfect_objective") || "9", 10);
  // fallback au + proche si la valeur n’existe pas exactement
  const keys = Object.keys(GOAL_TARGETS).map(Number).sort((a,b)=>a-b);
  if (GOAL_TARGETS[val]) return { level: val, ...GOAL_TARGETS[val] };
  // prend le niveau le plus proche
  let closest = keys[0];
  for (const k of keys) if (Math.abs(k - val) < Math.abs(closest - val)) closest = k;
  return { level: closest, ...GOAL_TARGETS[closest] };
}

/* =========================
   COACH: Message contextuel par trou (intelligent)
   ========================= */
function showContextualCoachMessage(entry, allHoles) {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";
  const goal = getUserGoal(); // {level, fw, gir, putts}
  const diff = entry.score - entry.par;
  const { putts, fairway, gir } = entry;

  // Séries (2 derniers trous joués avant celui-ci)
  const played = allHoles.filter(Boolean);
  const last2 = played.slice(-2);
  const streakPar = last2.length === 2 && last2.every(h => (h.score - h.par) === 0);
  const streakBogey = last2.length === 2 && last2.every(h => (h.score - h.par) === 1);

  let message = "";
  let color = "#00ff99";

  // 1) évènements marquants
  if (diff <= -2) {
    message = "🔥 Énorme ! Eagle/big bird — garde ce flow !";
  } else if (diff === -1) {
    message = "🦆 Birdie propre. Smart golf.";
  } else if (diff === 0 && gir && putts <= 2) {
    message = "💚 Parfect — c’est exactement dans le plan.";
  } else if (diff === 0 && !gir && putts <= 2) {
    message = "Par sauvé sans GIR — mental solide 👏";
  } else if (diff === 1 && fairway && putts <= 2 && !gir) {
    message = "💙 Bogey’fect — bon golf stratégique.";
  } else if (diff >= 3) {
    message = "Triple… respire, reset, un coup à la fois 🧘";
    color = "#ff6666";
  } else if (putts >= 3) {
    message = "⛳ 3 putts — vise plus simple: poids/rythme au prochain.";
    color = "#ffaa00";
  } else {
    message = "Un coup après l’autre. Garde le tempo 💚";
  }

  // 2) séries
  if (streakPar) message = "🔥 Back-to-back Par — bon rythme.";
  if (streakBogey) message = "Deux bogeys de suite — patience, c’est OK 💙";

  // 3) adaptation au niveau d’objectif
  //      si objectif <=9, on encourage le GIR/putts
  if (goal.level <= 9) {
    if (gir && putts <= 2) message += " (objectif 9: c’est la recette 👌)";
    if (!gir && diff >= 1) message += " (cherche GIR simple: centre de green)";
    if (putts >= 3) message += " (objectif putts ≤ 2 pour tendre vers " + goal.putts + ")";
  } else {
    // objectif 12+ : priorité mise en jeu et putting simple
    if (fairway && putts <= 2) message += " (priorité respectée: mise en jeu + 2 putts)";
    if (!fairway) message += " (priorité: départ sécurité > distance)";
  }

  // 4) tone coach
  if (coachKey === "greg") {
    message = "😎 " + message;
  } else if (coachKey === "goathier") {
    message = "🧠 " + message + " (data > émotion)";
  } else if (coachKey === "dorothee") {
    message = "💫 " + message + " Respire et relâche.";
  }

  showCoachToast(message, color);
}

/* =========================
   COACH: Feedback Premium (mi-parcours / fin)
   ========================= */
function showPremiumCoachFeedback(allHoles, context = "midround") {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";
  const goal = getUserGoal();
  const played = allHoles.filter(Boolean);
  if (played.length < 3) return;

  const totalDiff = played.reduce((a, h) => a + (h.score - h.par), 0);
  const avgPutts = (played.reduce((a, h) => a + h.putts, 0) / played.length).toFixed(1);
  const fairways = played.filter(h => h.fairway).length;
  const girs = played.filter(h => h.gir).length;
  const parfects = played.filter(h => h.fairway && h.gir && h.putts <= 2 && (h.score - h.par) === 0).length;
  const bogeyfects = played.filter(h => h.fairway && !h.gir && h.putts <= 2 && (h.score - h.par) === 1).length;

  const fwPct = Math.round((fairways / played.length) * 100);
  const girPct = Math.round((girs / played.length) * 100);

  // delta vs objectifs
  const fwDelta = fwPct - goal.fw;
  const girDelta = girPct - goal.gir;
  const puttsDelta = goal.putts - Number(avgPutts); // + = mieux que cible

  let msg = "";
  if (context === "midround") {
    msg = `Mi-parcours 💭 FW ${fwPct}% (${fwDelta >= 0 ? "👍" : "à +"+Math.abs(fwDelta)+"%"}) · GIR ${girPct}% (${girDelta >= 0 ? "👍" : "à +"+Math.abs(girDelta)+"%"}) · ${avgPutts} putts de moy.`;
    if (parfects >= Math.ceil(played.length * 0.25)) msg += " Beau taux de Parfects 💚";
    if (puttsDelta < 0) msg += " (mets le focus sur les putts < 2m)";
  } else {
    // roundend
    const sign = totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`;
    msg = `Fin de partie ${sign}. FW ${fwPct}% · GIR ${girPct}% · ${avgPutts} putts. `;
    if (girDelta >= 0 && puttsDelta >= 0) msg += "Objectifs atteints, solide 👏 ";
    else if (girDelta < 0 && fwDelta < 0) msg += "Priorité: départs sécurité & viser centre de green. ";
    else if (puttsDelta < 0) msg += "Travaille les putts courts et dosage. ";
    msg += `Parfects ${parfects}, Bogey’fects ${bogeyfects}.`;
  }

  if (coachKey === "greg") {
    msg = "😎 " + msg;
  } else if (coachKey === "goathier") {
    msg = "🧠 " + msg + " (les chiffres guident le progrès)";
  } else if (coachKey === "dorothee") {
    msg = "💫 " + msg + " Respiration calme = précision.";
  }

  showCoachToast(msg);
}

/* =========================
   INIT: liste de golfs
   ========================= */
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

/* =========================
   START / RENDER
   ========================= */
function startRound(golf) {
  // marquer comme en cours pour les flows “reprendre”
  localStorage.setItem("roundInProgress", "true");

  currentGolf = golf;
  totalHoles = Array.isArray(currentGolf?.pars) ? currentGolf.pars.length : 18;
  currentHole = 1;
  holes = new Array(totalHoles).fill(null);
  currentDiff = null;

  $("score-summary").textContent = "Score cumulé : 0";
  $("golf-select").style.display = "none";
  $("score-summary").innerHTML = "";

  renderHole();
  // onboarding juste après le 1er render
  setTimeout(() => showScorecardIntro(), 300);
}

// Sauvegarde du trou courant
function saveCurrentHole(showCoach = false) {
  const fairway = $("fairway")?.checked ?? false;
  const gir = $("gir")?.checked ?? false;
  const putts = parseInt($("putts")?.value ?? 2, 10);
  const dist1 = parseInt($("dist1")?.value ?? 0, 10);
  const par = currentGolf.pars[currentHole - 1];

  const diff = (currentDiff == null) ? (currentHole % 2 === 1 ? 1 : 0) : currentDiff;
  const score = par + diff;

  const entry = { hole: currentHole, par, score, fairway, gir, putts, dist1, routine: true };
  holes[currentHole - 1] = entry;

  // (ancien tipAfterHole retiré ici)
  updateMiniRecap();
  return entry;
}

// Modale distance 1er putt (facultatif)
function promptFirstPuttModal() {
  return new Promise((resolve) => {
    if (document.querySelector('.modal-backdrop')) { resolve({ value: null, skipped: true }); return; }
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-card" style="max-width:360px;text-align:center;">
        <h3>Distance du 1er putt</h3>
        <p style="font-size:0.9rem;line-height:1.4;">
          Si tu t’en souviens, indique la distance de ton premier putt (en mètres).<br>
          <em>Tu peux aussi passer si tu ne veux pas la saisir.</em>
        </p>
        <input id="first-putt-field" type="number" inputmode="decimal"
               placeholder="ex. 6.5" min="0" step="0.1"
               style="width:100%;padding:8px;margin-top:10px;border-radius:8px;border:1px solid #ccc;">
        <div style="display:flex;justify-content:center;gap:8px;margin-top:14px;">
          <button id="skip-putt" class="btn" style="background:#bbb;">Passer</button>
          <button id="ok-putt" class="btn" style="background:#00c676;color:white;">Valider</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    const field = backdrop.querySelector("#first-putt-field");
    field.focus();
    const cleanup = () => backdrop.remove();
    backdrop.querySelector("#ok-putt").addEventListener("click", () => {
      const val = field.value.trim();
      cleanup();
      resolve({ value: val ? Math.max(0, Math.min(30, parseFloat(val))) : null, skipped: !val });
    });
    backdrop.querySelector("#skip-putt").addEventListener("click", () => { cleanup(); resolve({ value: null, skipped: true }); });
  });
}

// Render d’un trou
function renderHole() {
  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];

  const saved = holes[currentHole - 1];
  const savedDiff = saved ? (saved.score - saved.par) : null;
  const defaultDiff = savedDiff != null ? savedDiff : (currentHole % 2 === 1 ? 1 : 0);
  currentDiff = defaultDiff;

  const prevHoles = holes.slice(0, currentHole - 1).filter(Boolean);
  const prevSum = sumVsPar(prevHoles);
  const liveCumu = prevSum + (currentDiff ?? 0);

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

  // Score buttons
  const btnWrap = $("score-buttons");
  btnWrap.innerHTML = SCORE_CHOICES.map(sc => `
    <button class="btn score-btn" data-diff="${sc.diff}" style="padding:.1rem .1rem;">${sc.label}</button>
  `).join("");

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

  // Putts select
  const puttsSel = $("putts");
  for (let i = 0; i <= 4; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    puttsSel.appendChild(opt);
  }
  puttsSel.value = saved?.putts ?? 2;

  // Distance select
  const distSel = $("dist1");
  for (let m = 0; m <= 30; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    distSel.appendChild(opt);
  }
  distSel.value = saved?.dist1 ?? 0;

  $("fairway").checked = saved?.fairway ?? false;
  $("gir").checked = saved?.gir ?? false;

  highlightSelection();

  // Parfect / Bogey’fect presets
  $("btn-parfect").addEventListener("click", () => {
    $("fairway").checked = true;
    $("gir").checked = true;
    puttsSel.value = 2;
    currentDiff = 0;
    highlightSelection();
  });
  $("btn-bogeyfect").addEventListener("click", () => {
    $("fairway").checked = true;
    $("gir").checked = false;
    puttsSel.value = 2;
    currentDiff = 1;
    highlightSelection();
  });

  // Prev / Next
  $("prev-hole").addEventListener("click", () => {
    saveCurrentHole(false);
    if (currentHole > 1) {
      currentHole--;
      currentDiff = null;
      renderHole();
    }
  });

  $("next-hole").addEventListener("click", async () => {
    const entry = saveCurrentHole(false);
    holes[currentHole - 1] = entry;

    // Demande (facultative) distance 1er putt
    const res = await Promise.resolve(promptFirstPuttModal()).catch(() => null);
    if (res && res.value !== null) {
      entry.dist1 = Number(res.value);
      holes[currentHole - 1] = entry;
    }

    // Coach contextuel (pas de narration, du sens)
    setTimeout(() => showContextualCoachMessage(entry, holes), 500);

    const total = holes.filter(Boolean).reduce((acc, h) => acc + (h.score - h.par), 0);

    // Modales 9 / 12 / 18
    if (currentHole === 9 || currentHole === 12 || currentHole === totalHoles) {
      // mini feedback mi-parcours (9/12), sinon roundend sera géré après endRound
      if (currentHole === 9 || currentHole === 12) {
        setTimeout(() => showPremiumCoachFeedback(holes, "midround"), 900);
      }
      showMidRoundModal(currentHole, total);
      return;
    }

    setTimeout(() => {
      if (currentHole < totalHoles) {
        currentHole++;
        currentDiff = null;
        renderHole();
      } else {
        endRound();
      }
    }, 900);
  });
}

/* =========================
   Modale mi-parcours & sauvegarde
   ========================= */
function showMidRoundModal(hole, total) {
  const modal = document.createElement("div");
  modal.className = "midround-modal";
  modal.innerHTML = `
    <div class="midround-content">
      <h3>${hole === totalHoles ? "Fin de partie" : "Mi-parcours"} ⛳</h3>
      <p>Score actuel : ${total > 0 ? "+" + total : total}.</p>
      <p>Tu veux continuer ou sauvegarder ta partie ?</p>
      <div class="midround-actions">
        ${hole === totalHoles ? "" : `<button id="continue-round" class="btn">Continuer</button>`}
        <button id="save-round" class="btn save">💾 Sauvegarder</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $("continue-round")?.addEventListener("click", () => {
    modal.remove();
    currentHole++;
    currentDiff = null;
    renderHole();
  });

  $("save-round").addEventListener("click", () => {
    modal.remove();
    localStorage.setItem("roundInProgress", "false");
    $("hole-card").innerHTML = "";
    // Fin de partie avec badge + feedback roundend
    showPremiumCoachFeedback(holes, "roundend");
    endRound(true);
  });
}

/* =========================
   Fin de partie / Résumé / Badge
   ========================= */
function endRound(showBadge = false) {
  const validHoles = holes.filter(h => h && typeof h.score === "number");
  const totalVsPar = validHoles.reduce((acc, h) => acc + (h.score - h.par), 0);
  const parfects = validHoles.filter(h => h.fairway && h.gir && h.putts <= 2 && (h.score - h.par) === 0).length;
  const bogeyfects = validHoles.filter(h => h.fairway && !h.gir && h.putts <= 2 && (h.score - h.par) === 1).length;

  const roundData = {
    date: new Date().toISOString(),
    golf: currentGolf?.name ?? "Parcours inconnu",
    totalVsPar,
    parfects,
    bogeyfects,
    holes,
  };

  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    history.push(roundData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error("❌ Erreur lors de la sauvegarde du round :", err);
  }

  if (showBadge) {
    showFinalBadge(roundData);
    return;
  }

  const summary = `
    <div class="score-summary-card">
      <h3>Carte terminée 💚</h3>
      <p>Total vs Par : <strong>${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}</strong></p>
      <p>💚 Parfects : ${parfects} · 💙 Bogey’fects : ${bogeyfects}</p>

      <table class="score-table">
        <thead>
          <tr>
            <th>Trou</th><th>Par</th><th>Score</th><th>Vs Par</th><th>FW</th><th>GIR</th><th>Putts</th><th>Dist1 (m)</th>
          </tr>
        </thead>
        <tbody>
          ${holes.map(h => {
              const diff = h.score - h.par;
              const vs = diff === 0 ? "Par" : diff < 0 ? `${Math.abs(diff)}↓` : `+${diff}`;
              return `
                <tr>
                  <td>${h.hole}</td>
                  <td>${h.par}</td>
                  <td>${h.score}</td>
                  <td>${vs}</td>
                  <td>${h.fairway ? "✔" : "—"}</td>
                  <td>${h.gir ? "✔" : "—"}</td>
                  <td>${h.putts}</td>
                  <td>${h.dist1 ?? "—"}</td>
                </tr>`;
            }).join("")}
        </tbody>
      </table>

      <div class="end-actions">
        <button class="btn" id="new-round">🔁 Nouvelle partie</button>
        <button class="btn secondary" id="share-badge">🎖️ Voir le badge</button>
      </div>
    </div>
  `;

  $("hole-card").innerHTML = summary;
  $("new-round").addEventListener("click", resetRound);
  $("share-badge").addEventListener("click", () => showFinalBadge(roundData));

  // Feedback global (si pas déjà fait) :
  setTimeout(() => showPremiumCoachFeedback(holes, "roundend"), 400);
}

function showFinalBadge(roundData) {
  const { golf, totalVsPar, parfects, bogeyfects } = roundData;

  const modal = document.createElement("div");
  modal.className = "badge-modal";
  modal.innerHTML = `
    <div class="badge-content" id="badge-to-share">
      <h2>🎖️ Parfect Badge</h2>
      <p>${golf}</p>
      <div class="badge-stats">
        <p>Score total : <strong>${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}</strong></p>
        <p>💚 Parfects : ${parfects}</p>
        <p>💙 Bogey’fects : ${bogeyfects}</p>
      </div>
      <p class="badge-quote">"Smart Golf. Cool Mindset."</p>
      <div class="badge-actions">
        <button id="share-instagram" class="btn">📸 Partager sur Instagram</button>
        <button id="close-badge" class="btn secondary">Fermer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("share-instagram").addEventListener("click", captureBadgeAsImage);
  document.getElementById("close-badge").addEventListener("click", () => {
    modal.remove();
    $("golf-select").style.display = "block";
    $("hole-card").innerHTML = "";
    localStorage.setItem("roundInProgress", "false");
  });
}

async function captureBadgeAsImage() {
  const badge = document.querySelector(".badge-content");
  if (!badge) return;

  try {
    const canvas = await html2canvas(badge, { backgroundColor: "#111", scale: 2, useCORS: true });
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "parfect-badge.png";
    link.click();
    showCoachToast("📸 Badge sauvegardé ! Partage-le sur Instagram 💚", "#00ff99");
  } catch (e) {
    console.error("Erreur capture badge :", e);
    showCoachToast("😅 Erreur lors de la capture du badge", "#ff6666");
  }
}

/* =========================
   Mini-récap / Historique / Modales d’entrée
   ========================= */
function updateMiniRecap() {
  const recap = document.getElementById("mini-recap");
  if (!recap) return;

  const played = holes.filter(Boolean);
  const totalVsPar = played.reduce((acc, h) => acc + (h.score - h.par), 0);
  const parfects = played.filter(h => h.fairway && h.gir && h.putts <= 2 && (h.score - h.par) === 0).length;
  const bogeyfects = played.filter(h => h.fairway && !h.gir && h.putts <= 2 && (h.score - h.par) === 1).length;

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

// Modale Reprendre / Nouvelle
function showResumeOrNewModal() {
  const lastRound = localStorage.getItem("roundInProgress");
  const hasActiveRound = lastRound === "true" && holes.some(h => h);

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-card" style="max-width:380px;text-align:center;">
      <h3>🎯 Que veux-tu faire ?</h3>
      <p style="font-size:0.95rem;line-height:1.5;margin-top:6px;">
        Tu as une partie précédente${hasActiveRound ? " en cours" : ""}.<br>
        Souhaites-tu la reprendre ou en démarrer une nouvelle ?
      </p>
      <div style="display:flex;justify-content:center;gap:10px;margin-top:18px;">
        <button id="resume-round" class="btn" style="background:#44ffaa;">Reprendre</button>
        <button id="new-round-start" class="btn" style="background:#00c676;color:white;">Nouvelle partie</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  backdrop.querySelector("#resume-round").addEventListener("click", () => {
    backdrop.remove();
    showCoachToast("Partie précédente chargée 💚", "#00ff99");
    renderHole();
  });

  backdrop.querySelector("#new-round-start").addEventListener("click", () => {
    backdrop.remove();
    resetRound();
  });
}

// Reset avec confirmation + recharge des golfs
async function resetRound() {
  if (document.querySelector(".modal-backdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-card" style="max-width:380px;text-align:center;">
      <h3>♻️ Recommencer une partie ?</h3>
      <p style="font-size:0.95rem;line-height:1.5;margin-top:6px;">
        Tu es sur le point de <strong>réinitialiser la carte en cours</strong>.<br>
        Toutes les données non sauvegardées seront perdues.
      </p>
      <div style="display:flex;justify-content:center;gap:10px;margin-top:18px;">
        <button id="cancel-reset" class="btn" style="background:#bbb;">Annuler</button>
        <button id="confirm-reset" class="btn" style="background:#00c676;color:white;">Oui, recommencer</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const cancelBtn = backdrop.querySelector("#cancel-reset");
  const confirmBtn = backdrop.querySelector("#confirm-reset");

  cancelBtn.addEventListener("click", () => backdrop.remove());

  confirmBtn.addEventListener("click", async () => {
    backdrop.remove();

    currentGolf = null;
    currentHole = 1;
    totalHoles = 18;
    holes = [];
    currentDiff = null;
    localStorage.setItem("roundInProgress", "false");

    $("hole-card").innerHTML = "";
    $("score-summary").innerHTML = "";
    $("golf-select").style.display = "block";

    try {
      const golfs = await fetchGolfs();
      window.availableGolfs = golfs;
      $("golf-select").innerHTML =
        "<h3>Choisis ton golf :</h3>" +
        golfs.map(g => `<button class='btn golf-btn' data-id='${g.id}'>⛳ ${g.name}</button>`).join("");

      $("golf-select").querySelectorAll(".golf-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const g = golfs.find(x => String(x.id) === btn.dataset.id);
          startRound(g);
          setTimeout(() => showScorecardIntro(), 500);
        });
      });

      showCoachToast("Nouvelle partie prête à démarrer 💚", "#00ff99");
    } catch (err) {
      console.error("Erreur lors du rechargement des golfs :", err);
      showCoachToast("Erreur de chargement du golf 😅", "#ff6666");
    }
  });
}

// Onboarding “Carte de score”
function showScorecardIntro() {
  const skip = localStorage.getItem("skipScoreIntro");
  if (skip === "true") return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:left;">
      <h2 style="margin-bottom:6px;">📋 Carte de Score</h2>
      <p>
        Bienvenue sur ta carte Parfect Golfr !  
        Ici on enregistre des Parfects et des Bogey'fects. 
        Un coup après l'autre, routine avant tout.
      </p>
      <ul style="margin-left:18px;line-height:1.4;">
        <li>💚 <strong>Parfect</strong> : Par + Fairway + GIR + ≤ 2 putts</li>
        <li>💙 <strong>Bogey’fect</strong> : Bogey + Fairway + ≤ 2 putts</li>
        <li>✍️ Indique ton score, tes putts, fairway et GIR</li>
        <li>🎯 Le coach adapte ses conseils à ton objectif d’index</li>
      </ul>

      <label style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <input type="checkbox" id="hide-intro"> Ne plus me la montrer
      </label>

      <div style="text-align:right;margin-top:16px;">
        <button id="close-intro" class="btn" style="background:#00c676;color:#fff;">OK, compris 💪</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("close-intro").addEventListener("click", () => {
    const dontShow = document.getElementById("hide-intro").checked;
    if (dontShow) localStorage.setItem("skipScoreIntro", "true");
    modal.remove();
  });
}

// (Optionnel) exposer la modale “reprendre/nouveau” globalement si appelée depuis main.js
window.showResumeOrNewModal = showResumeOrNewModal;

/* =========================
   Styles utilitaires (active score)
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = `
    .active-score { outline: 2px solid #00ff99; box-shadow: 0 0 0 2px rgba(0,255,153,0.25) inset; }
    table th { background:#00ff99; color:#000; padding:.4rem .5rem; }
    table td { padding:.35rem .5rem; border-bottom:1px solid #222; }
  `;
  document.head.appendChild(style);
});
