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
// === Coach Toast + audio + vibration + voix personnalisée ===
function showCoachToast(message, color) {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";

  const coaches = {
    greg: { name: "Greg", avatar: "😎", color: "#00ff99" },
    goathier: { name: "Goathier", avatar: "🧠", color: "#4db8ff" },
    dorothee: { name: "Dorothée", avatar: "💫", color: "#ff99cc" },
  };

  const coach = coaches[coachKey] || coaches.greg;
  const finalColor = color || coach.color;

  // Supprime tout toast existant avant d’en créer un nouveau
  document.querySelectorAll(".coach-panel").forEach(p => p.remove());

  // --- Création du toast ---
  const panel = document.createElement("div");
  panel.className = "coach-panel";
  panel.innerHTML = `
    <div class="coach-avatar">${coach.avatar}</div>
    <strong style="font-size:1.1rem;">Coach ${coach.name}</strong> dit :
    <div class="coach-text" style="color:${finalColor};">${message}</div>
    <button id="stop-voice-btn" style="
      margin-left:auto;
      background:none;
      border:none;
      color:${finalColor};
      font-weight:bold;
      cursor:pointer;
    ">🛑 Stop</button>
  `;
  document.body.appendChild(panel);

  // --- Animation d’apparition ---
  panel.style.opacity = "0";
  panel.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  panel.style.transform = "translateY(10px)";
  requestAnimationFrame(() => {
    panel.style.opacity = "1";
    panel.style.transform = "translateY(0)";
  });

  // --- Petit son "ping" ---
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    console.warn("Audio non supporté :", err);
  }

  // --- Vibration courte ---
  if ("vibrate" in navigator) {
    navigator.vibrate(80);
  }

  // --- Synthèse vocale personnalisée ---
  if ("speechSynthesis" in window) {
    // Stoppe toute voix en cours
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "fr-FR";
    utterance.pitch = 1;
    utterance.rate = 1.0;
    utterance.volume = 1;

    // Fonction pour choisir une voix spécifique selon le coach
    const setVoiceForCoach = (voices) => {
      // On essaye de trouver une voix FR spécifique
      const frVoices = voices.filter(v => v.lang.startsWith("fr"));
      let chosenVoice = null;

      if (coachKey === "dorothee") {
        chosenVoice = frVoices.find(v => v.name.toLowerCase().includes("female"))
          || frVoices.find(v => v.name.toLowerCase().includes("femme"))
          || frVoices.find(v => v.name.toLowerCase().includes("google français"))
          || frVoices[0];
        utterance.pitch = 1.2;
        utterance.rate = 1.0;
      } else if (coachKey === "goathier") {
        chosenVoice = frVoices.find(v => v.name.toLowerCase().includes("google français"))
          || frVoices.find(v => v.name.toLowerCase().includes("male"))
          || frVoices[0];
        utterance.pitch = 0.9;
        utterance.rate = 0.9;
      } else if (coachKey === "greg") {
        chosenVoice = frVoices.find(v => v.name.toLowerCase().includes("google français"))
          || frVoices.find(v => v.name.toLowerCase().includes("male"))
          || frVoices[0];
        utterance.pitch = 1.0;
        utterance.rate = 1.05;
      }

      if (chosenVoice) utterance.voice = chosenVoice;
      window.speechSynthesis.speak(utterance);
    };

    // Certains navigateurs chargent les voix de façon asynchrone
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      setVoiceForCoach(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        setVoiceForCoach(window.speechSynthesis.getVoices());
      };
    }

    // --- Bouton "Stop" ---
    document.getElementById("stop-voice-btn")?.addEventListener("click", () => {
      window.speechSynthesis.cancel();
      panel.remove();
    });
  }

  // --- Disparition automatique du toast (sauf si on stoppe) ---
  setTimeout(() => {
    if (document.body.contains(panel)) {
      panel.style.opacity = "0";
      panel.style.transform = "translateY(-10px)";
      setTimeout(() => panel.remove(), 300);
    }
  }, 15000);
}


// === Messages motivationnels aléatoires ===
function coachMotivationAuto() {
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

  // 🔹 Récupère les valeurs du trou courant s'il existe
  const saved = holes[currentHole - 1];
  const savedDiff = saved ? (saved.score - saved.par) : null;
  const defaultDiff = savedDiff != null ? savedDiff : (currentHole % 2 === 1 ? 1 : 0);
  currentDiff = defaultDiff;

  // 🔹 Calcul du cumul
  const prevHoles = holes.slice(0, currentHole - 1).filter(Boolean);
  const prevSum = sumVsPar(prevHoles);
  const liveCumu = prevSum + (currentDiff ?? 0);

  // === CONTENU DU TROU ===
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

  // === BOUTONS SCORE ===
  const btnWrap = $("score-buttons");
  btnWrap.innerHTML = SCORE_CHOICES.map(sc => `
    <button class="btn score-btn" data-diff="${sc.diff}" style="padding:.2rem .4rem;">${sc.label}</button>
  `).join("");

  // Activation visuelle du bouton choisi
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

  // === PUTTS (0–4)
  const puttsSel = $("putts");
  for (let i = 0; i <= 4; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    puttsSel.appendChild(opt);
  }
  puttsSel.value = saved?.putts ?? 2;

  // === DISTANCE 1ER PUTT (0–30m)
  const distSel = $("dist1");
  for (let m = 0; m <= 30; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    distSel.appendChild(opt);
  }
  distSel.value = saved?.dist1 ?? 0;

  // === CHECKBOXES FW / GIR
  $("fairway").checked = saved?.fairway ?? false;
  $("gir").checked = saved?.gir ?? false;

  highlightSelection();

  // === BOUTONS RAPIDES PARFECT / BOGEY’FECT
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

  // === NAVIGATION ENTRE TROUS ===
  $("prev-hole").addEventListener("click", () => {
    saveCurrentHole(false);
    if (currentHole > 1) {
      currentHole--;
      currentDiff = null;
      renderHole();
    }
  });

  $("next-hole").addEventListener("click", () => {
    const currentData = saveCurrentHole(false);
    holes[currentHole - 1] = currentData;

    // 🧮 SCORE TOTAL
    const total = holes.filter(Boolean).reduce((acc, h) => acc + (h.score - h.par), 0);

    // 💚💙 VERIF PARFECT / BOGEY’FECT
    const isParfect = currentData.fairway && currentData.gir && currentData.putts <= 2 && (currentData.score - currentData.par === 0);
    const isBogeyfect = currentData.fairway && !currentData.gir && currentData.putts <= 2 && (currentData.score - currentData.par === 1);

    // 💬 MESSAGE COACH
    let msg = `Trou ${currentHole} enregistré — total ${total > 0 ? "+" + total : total}`;
    let color = "#00ff99";

    if (isParfect) {
      msg = `💚 Parfect ! Smart golf et calme mental 😎`;
      color = "#00ff99";
    } else if (isBogeyfect) {
      msg = `💙 Bogey’fect ! Gestion propre du trou 👏`;
      color = "#44ffaa";
    } else {
      color = total > 0 ? "#ff6666" : total < 0 ? "#00ff99" : "#fff";
    }

    showCoachToast(msg, color);

    // 🎯 Coach auto après 6s
    const coachMessage = tipAfterHole(currentData, "fun");
    setTimeout(() => showCoachToast(coachMessage), 6000);

    // 🏁 MI-PARCOURS (trou 9 ou 12)
    if (currentHole === 9 || currentHole === 12) {
      showCoachToast("🏁 Mi-parcours ! Fais le point avec ton coach 💚");
      showMidRoundModal(currentHole, total);
      return; // stoppe ici la progression automatique
    }

    // ▶️ Trou suivant ou fin
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

  // === SAUVEGARDE DU TROU ACTUEL ===
  function saveCurrentHole(showCoach) {
    const fairway = $("fairway").checked;
    const gir = $("gir").checked;
    const putts = parseInt(puttsSel.value, 10);
    const dist1 = parseInt(distSel.value, 10);
    const diff = currentDiff == null ? (currentHole % 2 === 1 ? 1 : 0) : currentDiff;
    const score = par + diff;

    const entry = { hole: currentHole, par, score, fairway, gir, putts, dist1, routine: true };
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

      <div class="end-actions">
        <button class="btn" id="new-round">🔁 Nouvelle partie</button>
        <button class="btn secondary" id="share-badge">🎖️ Voir le badge</button>
      </div>
    </div>
  `;

  $("hole-card").innerHTML = summary;

  $("new-round").addEventListener("click", () => {
    $("golf-select").style.display = "block";
    $("hole-card").innerHTML = "";
  });

  $("share-badge").addEventListener("click", () => {
    showFinalBadge(currentGolf.name, totalVsPar, parfects, bogeyfects);
  });
}



/**
 * Ouvre une modale de saisie (facultative) pour la distance du 1er putt.
 * @returns {Promise<{value: number|null, skipped: boolean}>}
 */
function promptFirstPuttModal() {
  return new Promise((resolve) => {
    // Évite les doublons
    if (document.querySelector('.modal-backdrop')) {
      resolve({ value: null, skipped: true });
      return;
    }

    // Backdrop + carte
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const card = document.createElement('div');
    card.className = 'modal-card';
    card.innerHTML = `
      <div class="modal-header">
        <div class="coach-avatar" style="font-size:1.3rem">😎</div>
        <div class="modal-title">Distance du 1er putt</div>
      </div>
      <div class="modal-body">
        <p>Si tu t’en souviens, indique la distance de ton premier putt (en mètres).<br>
        <em>Tu peux aussi passer si tu ne veux pas la saisir.</em></p>
        <input id="first-putt-field" class="modal-input" type="number" inputmode="decimal"
               min="0" step="0.1" placeholder="ex. 6.5" />
      </div>
      <div class="modal-actions">
        <button id="skip-putt" class="btn-ghost">Passer</button>
        <button id="ok-putt" class="btn-primary">Valider</button>
      </div>
    `;

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    document.body.classList.add('body-lock');

    const input = card.querySelector('#first-putt-field');
    const btnOk = card.querySelector('#ok-putt');
    const btnSkip = card.querySelector('#skip-putt');

    // Focus auto
    setTimeout(() => input?.focus(), 50);

    const cleanup = () => {
      document.body.classList.remove('body-lock');
      backdrop.remove();
    };

    // Valider (saisie facultative)
    btnOk.addEventListener('click', () => {
      const raw = (input.value || '').trim();
      if (raw === '') {
        cleanup();
        resolve({ value: null, skipped: false }); // pas de valeur mais pas une annulation
        return;
      }
      const num = Number(raw.replace(',', '.'));
      cleanup();
      resolve({ value: isNaN(num) ? null : num, skipped: false });
    });

    // Passer
    btnSkip.addEventListener('click', () => {
      cleanup();
      resolve({ value: null, skipped: true });
    });

    // Fermer via ESC → équivaut à "Passer"
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onEsc);
        cleanup();
        resolve({ value: null, skipped: true });
      }
    });

    // Clique hors carte → ne ferme pas (pour éviter miss-clicks)
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        // rien
      }
    });
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
    endRound(true); // ✅ Appelle fin directe avec badge
  });
}


// === MODALE SAISIE DISTANCE 1ER PUTT ===
function promptFirstPuttModal() {
  return new Promise((resolve) => {
    if (document.querySelector('.modal-backdrop')) {
      resolve({ value: null, skipped: true });
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-card">
        <h3 style="margin-bottom:6px;">Distance du 1er putt</h3>
        <p style="font-size:0.95rem;">Si tu t’en souviens, indique la distance de ton premier putt (en mètres).<br>
        <em>Tu peux aussi passer si tu ne veux pas la saisir.</em></p>
        <input id="first-putt-field" type="number" inputmode="decimal"
               placeholder="ex. 6.5" min="0" step="0.1"
               style="width:100%;padding:8px;margin-top:10px;border-radius:8px;border:1px solid #ccc;">
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
          <button id="skip-putt" class="btn" style="background:#ccc;">Passer</button>
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
      if (val === "") {
        cleanup();
        resolve({ value: null, skipped: false });
        return;
      }
      cleanup();
      resolve({ value: parseFloat(val), skipped: false });
    });

    backdrop.querySelector("#skip-putt").addEventListener("click", () => {
      cleanup();
      resolve({ value: null, skipped: true });
    });
  });
}

// === MODALE D’EXPLICATION CARTE DE SCORE ===
function showScorecardIntro() {
  // Vérifie si l'utilisateur a déjà choisi de ne plus la voir
  const skip = localStorage.getItem("skipScoreIntro");
  if (skip === "true") return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:left;">
      <h2 style="margin-bottom:6px;">📋 Carte de Score</h2>
      <p>
        Bienvenue sur ta carte de score interactive !  
        Voici comment l’utiliser :
      </p>
      <ul style="margin-left:18px;line-height:1.4;">
        <li>🟢 <strong>Parfect</strong> = Par + Fairway + GIR + ≤ 2 putts</li>
        <li>💙 <strong>Bogey’fect</strong> = Bogey + Fairway + ≤ 2 putts</li>
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

window.coachMotivationAuto = coachMotivationAuto;
