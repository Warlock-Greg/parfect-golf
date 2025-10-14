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

// === Coach Toast + motivation automatique ===
function showCoachToast(message, color) {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";
  const coaches = {
    greg: { name: "Greg", avatar: "😎", color: "#00ff99" },
    goathier: { name: "Goathier", avatar: "🧠", color: "#4db8ff" },
    dorothee: { name: "Dorothée", avatar: "💫", color: "#ff99cc" },
  };
  const coach = coaches[coachKey] || coaches.greg;
  const finalColor = color || coach.color;

  // Supprime les anciens toasts
  document.querySelectorAll(".coach-toast").forEach(t => t.remove());

  // --- Création du toast ---
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

  // --- Animation d’apparition ---
  requestAnimationFrame(() => toast.classList.add("visible"));

  // --- Effet sonore + vibration ---
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

  // --- Synthèse vocale personnalisée ---
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "fr-FR";
    utterance.pitch = 1;
    utterance.rate = 1.0;
    utterance.volume = 1;

    const setVoiceForCoach = (voices) => {
      const frVoices = voices.filter(v => v.lang.startsWith("fr"));
      let chosenVoice = null;

      if (coachKey === "dorothee") {
        chosenVoice = frVoices.find(v => v.name.toLowerCase().includes("female")) || frVoices[0];
        utterance.pitch = 1.2;
      } else if (coachKey === "goathier") {
        chosenVoice = frVoices.find(v => v.name.toLowerCase().includes("male")) || frVoices[0];
        utterance.pitch = 0.9;
      } else {
        chosenVoice = frVoices[0];
      }
      utterance.voice = chosenVoice;
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) setVoiceForCoach(voices);
    else window.speechSynthesis.onvoiceschanged = () => setVoiceForCoach(window.speechSynthesis.getVoices());
  }

  // --- Bouton stop ---
  toast.querySelector("#stop-voice-btn").addEventListener("click", () => {
    window.speechSynthesis.cancel();
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  });

  // --- Disparition automatique ---
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 400);
    }
  }, 8000);
}



// === Messages motivationnels aléatoires ===
/*function coachMotivationAuto() {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";

  const messages = {
    greg: [
      "Reste fluide, chaque coup compte 💚",
      "Smart golf, pas power golf 😎",
      "Un trou à la fois, mon ami !",
      "Focus stratégie, pas technique.",
      "Respire, aligne, swing naturel."
    ],
    goathier: [
      "Pense tempo et trajectoire 🧠",
      "Mesure ton swing, optimise ton angle.",
      "Analyse, ajuste, exécute propre.",
      "Données > émotions 😉",
      "Tu joues comme tu planifies, précision avant force."
    ],
    dorothee: [
      "Inspire, relâche, ressens 💫",
      "Ton calme crée ta précision.",
      "Chaque souffle prépare ton swing.",
      "Laisse le mouvement venir, sans forcer.",
      "Souris avant de frapper — ça change tout."
    ],
  };

  const coachMsgs = messages[coachKey] || messages.greg;
  const randomMsg = coachMsgs[Math.floor(Math.random() * coachMsgs.length)];
  showCoachToast(randomMsg);
}*/



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
  showScorecardIntro();

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

// === SAUVEGARDE DU TROU ACTUEL ===
function saveCurrentHole(showCoach = false) {
  const fairway = $("fairway")?.checked ?? false;
  const gir = $("gir")?.checked ?? false;
  const putts = parseInt($("putts")?.value ?? 2, 10);
  const dist1 = parseInt($("dist1")?.value ?? 0, 10);
  const par = currentGolf.pars[currentHole - 1];

  // Si l’utilisateur n’a pas choisi de score
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

// === MODALE SAISIE DISTANCE 1ER PUTT ===
function promptFirstPuttModal() {
  return new Promise((resolve) => {
    // Évite les doublons
    if (document.querySelector('.modal-backdrop')) {
      resolve({ value: null, skipped: true });
      return;
    }

    // Création du fond et de la carte
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

    // ✅ Bouton Valider
    backdrop.querySelector("#ok-putt").addEventListener("click", () => {
      const val = field.value.trim();
      cleanup();
      resolve({ value: val ? parseFloat(val) : null, skipped: !val });
    });

    // ✅ Bouton Passer
    backdrop.querySelector("#skip-putt").addEventListener("click", () => {
      cleanup();
      resolve({ value: null, skipped: true });
    });
  });
}


// === RENDER HOLE ===
function renderHole() {
  // 🧱 Sécurité : ne rien rendre si la partie est déjà terminée
  if (localStorage.getItem("roundInProgress") === "false") {
    console.log("⛔ Partie déjà terminée, render ignoré");
    return;
  }

  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];

  // Récupère valeurs si trou déjà saisi
  const saved = holes[currentHole - 1];
  const savedDiff = saved ? (saved.score - saved.par) : null;

  const defaultDiff = savedDiff != null
    ? savedDiff
    : (currentHole % 2 === 1 ? 1 : 0);

  currentDiff = defaultDiff;

  const prevHoles = holes.slice(0, currentHole - 1).filter(Boolean);
  const prevSum = sumVsPar(prevHoles);
  const liveCumu = prevSum + (currentDiff ?? 0);

  // HTML principal
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

  // === SCORE BUTTONS ===
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

  // === PUTTS SELECT
  const puttsSel = $("putts");
  for (let i = 0; i <= 4; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    puttsSel.appendChild(opt);
  }
  puttsSel.value = saved?.putts ?? 2;

  // === DISTANCE SELECT
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

  // === Parfect / Bogeyfect buttons
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

  // === Prev / Next hole navigation
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

    // ✅ Demande facultative distance 1er putt
    const result = await promptFirstPuttModal();
    if (result.value !== null) {
      entry.dist1 = result.value;
      holes[currentHole - 1] = entry;
    }

    const total = holes.filter(Boolean).reduce((acc, h) => acc + (h.score - h.par), 0);

    const isParfect = entry.fairway && entry.gir && entry.putts <= 2 && entry.score - entry.par === 0;
    const isBogeyfect = entry.fairway && !entry.gir && entry.putts <= 2 && entry.score - entry.par === 1;

    let msg = `Trou ${currentHole} enregistré — score ${total > 0 ? "+" + total : total}`;
    let color = "#00ff99";
    if (isParfect) {
      msg = `💚 Parfect enregistré !`;
      color = "#00ff99";
    } else if (isBogeyfect) {
      msg = `💙 Bogey’fect enregistré !`;
      color = "#44ffaa";
    }
    showCoachToast(msg, color);

    // === MODALES DE FIN PARTIELLE ===
    if (currentHole === 9 || currentHole === 12 || currentHole === totalHoles) {
      showMidRoundModal(currentHole, total);
      return; // 🔥 stop ici
    }

    setTimeout(() => {
      if (currentHole < totalHoles) {
        currentHole++;
        currentDiff = null;
        renderHole();
      } else {
        endRound();
      }
    }, 2500);
  });
}


// === MODALE DE MI-PARCOURS ===
function showMidRoundModal(hole, total) {
  const modal = document.createElement("div");
  modal.className = "midround-modal";
  modal.innerHTML = `
    <div class="midround-content">
      <h3>Mi-parcours ⛳</h3>
      <p>Tu viens de finir le trou ${hole}. Ton score actuel est ${total > 0 ? "+" + total : total}.</p>
      <p>Souhaites-tu continuer ou sauvegarder ta partie maintenant ?</p>
      <div class="midround-actions">
        <button id="continue-round" class="btn">Continuer</button>
        <button id="save-round" class="btn save">💾 Sauvegarder</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $("continue-round").addEventListener("click", () => {
    modal.remove();
    currentHole++;
    currentDiff = null;
    renderHole();
  });

  $("save-round").addEventListener("click", () => {
    modal.remove();

    // 🚀 Marque la partie comme terminée
    localStorage.setItem("roundInProgress", "false");

    // 🔥 Vide le contenu avant résumé
    $("hole-card").innerHTML = "";

    // ✅ Appel direct de la fin de partie (badge inclus)
    endRound(true);

    
  });
}

// === FIN DE PARTIE ===
function endRound(showBadge = false) {
  console.log("🏁 Fin de partie déclenchée");

  // === CALCULS SÉCURISÉS ===
const validHoles = holes.filter(h => h && typeof h.score === "number");
const totalVsPar = validHoles.reduce((acc, h) => acc + (h.score - h.par), 0);
const parfects = validHoles.filter(
  h => h.fairway && h.gir && h.putts <= 2 && (h.score - h.par) === 0
).length;
const bogeyfects = validHoles.filter(
  h => h.fairway && !h.gir && h.putts <= 2 && (h.score - h.par) === 1
).length;


  // === SAUVEGARDE DANS LE LOCALSTORAGE ===
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

  // === AFFICHAGE DU BADGE DIRECT (si demandé) ===
  if (showBadge) {
    showFinalBadge(roundData);
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

  $("hole-card").innerHTML = summary;

  // === BOUTON NOUVELLE PARTIE ===
  $("new-round").addEventListener("click", resetRound);


  // === BOUTON AFFICHER LE BADGE ===
  $("share-badge").addEventListener("click", () => {
    showFinalBadge(roundData);
  });
}


// === AFFICHAGE DU BADGE FINAL ===
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

  // === ACTIONS ===
  document.getElementById("share-instagram").addEventListener("click", captureBadgeAsImage);

  document.getElementById("close-badge").addEventListener("click", () => {
    modal.remove();
    $("golf-select").style.display = "block";
    $("hole-card").innerHTML = "";
    localStorage.setItem("roundInProgress", "false");
  });
}


// === CAPTURE DU BADGE EN IMAGE (HTML2CANVAS) ===
async function captureBadgeAsImage() {
  const badge = document.querySelector(".badge-content");
  if (!badge) return;

  try {
    const canvas = await html2canvas(badge, {
      backgroundColor: "#111",
      scale: 2,
      useCORS: true
    });

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




// === MINI RECAP ===
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

// === SAUVEGARDE HISTORIQUE ===
function saveRound(round) {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history.push(round);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}


// === EXPORT GLOBAL pour coachMotivationAuto ===
window.coachMotivationAuto = coachMotivationAuto;


// === MODALE NOUVELLE PARTIE / REPRENDRE ===
function showResumeOrNewModal() {
  const lastRound = localStorage.getItem("roundInProgress");
  const hasActiveRound = lastRound === "true" && holes.some(h => h);

  // Création modale
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

  // Gestion des clics
  backdrop.querySelector("#resume-round").addEventListener("click", () => {
    backdrop.remove();
    // Recharge l’état précédent (si tu veux plus tard le restaurer)
    showCoachToast("Partie précédente chargée 💚", "#00ff99");
    renderHole();
  });

  backdrop.querySelector("#new-round-start").addEventListener("click", () => {
    backdrop.remove();
    resetRound();
  });
}




// === 🔄 RESET COMPLET D'UNE PARTIE AVEC CONFIRMATION ===
async function resetRound() {
  // ⚠️ Évite d’avoir plusieurs modales empilées
  if (document.querySelector(".modal-backdrop")) return;

  // === Création de la modale de confirmation ===
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

    // 🔁 Réinitialisation complète
    console.log("♻️ Réinitialisation complète de la partie");
    currentGolf = null;
    currentHole = 1;
    totalHoles = 18;
    holes = [];
    currentDiff = null;
    localStorage.setItem("roundInProgress", "false");

    $("hole-card").innerHTML = "";
    $("score-summary").innerHTML = "";

    // ✅ Recharge la liste des golfs
    $("golf-select").style.display = "block";

    try {
      const golfs = await fetchGolfs();

      // 🔒 Stocker la liste globale pour d’autres appels (utile dans main.js)
      window.availableGolfs = golfs;

      $("golf-select").innerHTML =
        "<h3>Choisis ton golf :</h3>" +
        golfs.map(g => `<button class='btn golf-btn' data-id='${g.id}'>⛳ ${g.name}</button>`).join("");

      $("golf-select").querySelectorAll(".golf-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const g = golfs.find(x => String(x.id) === btn.dataset.id);
          startRound(g);

          // 🕒 petit délai pour laisser la carte se dessiner
          setTimeout(() => {
            showScorecardIntro(); // 👈 onboarding propre et visible
          }, 500);
        });
      });

      showCoachToast("Nouvelle partie prête à démarrer 💚", "#00ff99");

    } catch (err) {
      console.error("Erreur lors du rechargement des golfs :", err);
      showCoachToast("Erreur de chargement du golf 😅", "#ff6666");
    }
  });
}


// === MODALE D’EXPLICATION CARTE DE SCORE ===
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
        Chaque coût à un objectif simple, un coup après l'autre.
        Et rappelle toi que tu peux rater un shot, mais tu ne peux pas rater ta routine.
        Voici comment l’utiliser :
      </p>
      <ul style="margin-left:18px;line-height:1.4;">
        <li>💚 <strong>Parfect</strong> : Par + Fairway + GIR + ≤ 2 putts</li>
        <li>💙 <strong>Bogey’fect</strong> : Bogey + Fairway + ≤ 2 putts</li>
        <li>✍️ Indique ton score, tes putts, fairway et GIR</li>
        <li>🎯 Coach Greg t’encourage après chaque trou</li>
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

// Rendre certaines fonctions accessibles globalement
window.showResumeOrNewModal = showResumeOrNewModal;


