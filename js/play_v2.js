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
// === COACH TOAST FIXE SOUS LE MENU ===
function showCoachToast(message, color = "#00ff99") {
  // Supprimer l’ancien container s’il existe
  let coachZone = document.getElementById("coach-zone");
  if (!coachZone) {
    coachZone = document.createElement("div");
    coachZone.id = "coach-zone";
    coachZone.style.cssText = `
      background: #111;
      color: white;
      padding: 10px 14px;
      border-top: 2px solid ${color};
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 0.95rem;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(-10px);
    `;
    // insérer juste sous le menu
    const menu = document.getElementById("menu");
    menu.insertAdjacentElement("afterend", coachZone);
  }

  // 🧠 Contenu
  coachZone.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="font-size:1.3rem;">😎</div>
      <div>${message}</div>
    </div>
    <button id="stop-voice-btn" style="
      background:none;
      border:none;
      color:${color};
      font-weight:bold;
      cursor:pointer;
      font-size:1rem;
    ">🛑 Stop</button>
  `;

  // Animation douce
  requestAnimationFrame(() => {
    coachZone.style.opacity = "1";
    coachZone.style.transform = "translateY(0)";
  });

  // === Son court (ping) ===
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

  // === Synthèse vocale ===
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = "fr-FR";
    utter.pitch = 1;
    utter.rate = 1.0;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  }

  // === Bouton Stop ===
  document.getElementById("stop-voice-btn").addEventListener("click", () => {
    window.speechSynthesis.cancel();
    coachZone.style.opacity = "0";
    coachZone.style.transform = "translateY(-10px)";
    setTimeout(() => coachZone.remove(), 300);
  });
}

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
// === Analyse du trou + message coach ===
function coachFeedbackForHole(entry) {
  const diff = entry.score - entry.par;
  const mood = localStorage.getItem("dailyMood") || "calme";
  const strategy = localStorage.getItem("dailyStrategy") || "safe";

  let msg = "";
  let color = "#00ff99";

  // 1️⃣ Feedback direct selon le score
  if (diff <= -1) {
    msg = "🔥 Birdie ! Momentum on fire, garde ton rythme.";
  } else if (diff === 0 && entry.fairway && entry.gir && entry.putt2 <= 2) {
    msg = "💚 Parfect ! Tout est fluide, routine et tempo au top.";
  } else if (diff === 1 && entry.fairway && entry.putt2 <= 2) {
    msg = "💙 Bogey’fect ! Smart golf, continue comme ça.";
  } else if (diff >= 2) {
    msg = "💪 Double ou plus, c’est pas grave. Respire et recentre-toi.";
    color = "#ffaa44";
  } else {
    msg = "🎯 Trou solide, tu avances bien.";
  }

  // 2️⃣ Ajustement selon la stratégie
  if (strategy === "safe" && diff <= 0) msg += " Stratégie safe payante 👌";
  if (strategy === "aggressive" && diff >= 2) msg += " Trop agressif ? Calme le jeu.";
  if (strategy === "parfect" && diff === 0) msg += " C’est du pur Parfect 💚";
  if (strategy === "playfree") msg += " Continue à jouer libre 🌈";

  // 3️⃣ Ajustement selon le mood
  if (mood === "calme") msg += " Keep zen 🧘";
  if (mood === "focus") msg += " Mental laser, focus 💥";
  if (mood === "detente") msg += " Smooth swing only 😎";
  if (mood === "compet") msg += " Hunger mode 🔥";

  // 4️⃣ Routine et putts
  if (!entry.routine) msg += " ⚠️ N’oublie pas ta routine au prochain trou.";
  if (entry.putt2 >= 6) msg += " Travaille ton dosage sur les longs putts 👀";

  showCoachToast(msg, color);
}

// === Fin de partie ===
function endRound() {
  showCoachToast("🏁 Partie terminée, bien joué !", "#00ff99");
  $("hole-card").innerHTML = "<h3>Fin de partie 🏁</h3><p>Résultats sauvegardés.</p>";
}
