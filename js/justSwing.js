// =========================================================
//   JUST SWING — Orchestrateur PRO (Parfect 2025)
//   Flow : START → COUNTDOWN → ROUTINE → SWING → SCORE
//   Dépend : window.SwingEngine, window.JustSwing.onPoseFrame()
// =========================================================

const $$ = (id) => document.getElementById(id);


const JSW_STATE = {
  IDLE: "IDLE",
  WAITING_START: "WAITING_START", // bouton start affiché
  COUNTDOWN: "COUNTDOWN",         // 3-2-1-Go
  ROUTINE: "ROUTINE",             // messages guidés
  POSITIONING: "POSITIONING",
  ADDRESS_READY: "ADDRESS_READY", // prêt à swinguer
  SWING_CAPTURE: "SWING_CAPTURE", // swing en cours
  REVIEW: "REVIEW",               // affichage score
};




const JSW_MODE = {
  SWING: "swing",
  PUTT: "putt",
  APPROCHE: "approche",
};

const DEFAULT_ROUTINES = {
  swing: [
    "Respiration",
    "Visualisation",
    "Alignement",
    "Swing d’essai",
    "Adresse",
    "Swing",
  ],
  putt: [
    "Lecture du green",
    "Visualisation",
    "Alignement",
    "Adresse",
    "Putt",
  ],
  approche: [
    "Choix de trajectoire",
    "Visualisation",
    "Alignement",
    "Adresse",
    "Swing d’approche",
  ],
};

// ================================
// 🧠 SESSION D’ENTRAÎNEMENT ACTIVE
// ================================
window.TrainingSession = {
  startedAt: Date.now(),
  swings: [] // max 5
};

window.jswReferenceMode = "system"; 
// "system" | "user"


// --- ADDRESS DETECTION ---
let addressBuffer = [];
let pendingAddress = false;
let addressLocked = false;

const ADDRESS_FRAMES_REQUIRED = 5;
const ADDRESS_EPSILON = 0.015; // tolérance stabilité


let routineConfig = {
  swing: { default: DEFAULT_ROUTINES.swing, user: null },
  putt: { default: DEFAULT_ROUTINES.putt, user: null },
  approche: { default: DEFAULT_ROUTINES.approche, user: null },
};

const JustSwing = (() => {
  // ---------------------------------------------------------
  //   DOM + ÉTAT
  // ---------------------------------------------------------
  let screenEl, videoEl, overlayEl, ctx;
  let bigMsgEl, statusTextEl, routineStepsEl, timerEl;

// === FLAGS SESSION ===
let isRecordingActive = false;
let captureArmed = false;
  
  let frameIndex = 0;

  let resultPanelEl, scoreGlobalEl, scoreDetailsEl, coachCommentEl, swingEl;

  let state = JSW_STATE.IDLE;
  let mode = JSW_MODE.SWING;
  let currentClubType = "fer7";

  let lastPose = null;
  let lastFullBodyOk = false;
 

  let loopId = null;
  let countdownInterval = null;
  let routineTimer = null;
  let routineIndex = 0;
  let routineInterval = null;  // ← nécessaire pour la routine guidée

  let swingIndex = 0;
  let activeSwing = null;

    // --- Swing capture guards ---
  let swingTimeout = null;
  let swingCompleted = false;

  let engine = null;

    // ----- REPLAY SWING -----
  let lastSwing = null;
  let replayFrameIndex = 0;
  let replayPlaying = false;
  let replayTimer = null;
  let replayCanvas = null;
  let replayCtx = null;
  let replayPlayBtn = null;
  let replaySpeedSel = null;
  let replayTimeline = null;

  
  function fmt(v, d = 2) {
  return typeof v === "number" && Number.isFinite(v)
    ? v.toFixed(d)
    : "—";
}

  async function loadActiveReference() {

  const club =
    window.currentClubType ||
    document.getElementById("jsw-club-select")?.value ||
    "fer7";

  const view =
    window.jswViewType ||
    document.getElementById("jsw-camera-select")?.value ||
    "faceOn";

  const refSystem = await window.getSystemReference?.(club, view);
  const refUser = await window.getUserReference?.(club, view);

  const fallback =
    window.ParfectReference?.[club] ||
    window.ParfectReference?.default ||
    null;

  window.parfectReference = refSystem || null;
  window.userReference = refUser || null;

  window.REF =
    refUser?.data ||
    refSystem?.data ||
    fallback ||
    null;

  console.log("🎯 Active reference", {
    club,
    view,
   system: refSystem?.id,
    user: refUser?.id,
    fallback: !!fallback
  });
}

  // ---------------------------------------------------------
  //   INIT DOM
  // ---------------------------------------------------------
  function initJustSwing() {
    screenEl = $$("just-swing-screen");
    videoEl = $$("jsw-video");
    overlayEl = $$("jsw-overlay");
    bigMsgEl = $$("jsw-big-msg");

    statusTextEl = $$("jsw-status-text");
    routineStepsEl = $$("jsw-routine-steps");
    timerEl = $$("jsw-timer");

    resultPanelEl = $$("jsw-result-panel");
    scoreGlobalEl = $$("jsw-score-global");
    scoreDetailsEl = $$("jsw-score-details");
    coachCommentEl = $$("jsw-coach-comment");
    swingEl = $$("jsw-swing-label");

    if (!screenEl || !videoEl || !overlayEl || !bigMsgEl) {
      console.warn("❌ JustSwing: DOM incomplet");
      return;
    }

    ctx = overlayEl.getContext("2d", { willReadFrequently: true });

    window.addEventListener("resize", resizeOverlay);
    resizeOverlay();

    console.log("✅ JustSwing initialisé");
  }

   const clubSelect = document.getElementById("jsw-club-select");

  if (clubSelect) {
    clubSelect.addEventListener("change", e => {
      currentClubType = e.target.value;
      console.log("🏌️ Club changé :", currentClubType);
      loadActiveReference(); // 🔥 IMPORTANT
    });

    // 🔥 important : sync au chargement
    currentClubType = clubSelect.value;
  }
  window.REF ??= null;

fetch("/data/parfect_reference.json")
  .then(r => r.json())
  .then(json => {
    window.ParfectReference = json;

    // ✅ SOURCE UNIQUE UTILISÉE PAR LE MOTEUR
    window.REF = json.default;
    console.log("📌 Parfect Reference loaded", json);
  })
  .catch(err => {
    console.warn("⚠️ Parfect reference not loaded", json);
    loadActiveReference();
  });
  

  // =========================================================
// ⏭️ JUST SWING — NEXT SWING (SOURCE UNIQUE)
// =========================================================
function nextSwing() {
  console.log("➡️ JustSwing.nextSwing()");

  // -----------------------------------------------------
  // 1️⃣ UI — fermer la review
  // -----------------------------------------------------
  const review = document.getElementById("swing-review");
  if (review) {
    review.classList.remove("active");
    review.style.display = "none";
  }

  // 🔥 réafficher la zone swing
  const swingArea = document.getElementById("just-swing-area");
  if (swingArea) {
    swingArea.style.display = "block";
  }

  const breakdown = document.getElementById("swing-score-breakdown");
  if (breakdown) breakdown.innerHTML = "";

  // -----------------------------------------------------
  // 2️⃣ RESET FLAGS SWING
  // -----------------------------------------------------
  captureArmed = false;
  isRecordingActive = false;
  addressLocked = false;
  pendingAddress = false;
  swingCompleted = false;
  addressCaptured = false;

  addressStabilityBuffer = [];

  // -----------------------------------------------------
  // 3️⃣ RESET TIMEOUT
  // -----------------------------------------------------
  if (swingTimeout) {
    clearTimeout(swingTimeout);
    swingTimeout = null;
  } 
  if (engine) engine.reset();

  // -----------------------------------------------------
  // 4️⃣ RESET MACHINE ÉTAT
  // -----------------------------------------------------
  state = JSW_STATE.ROUTINE;
  updateUI();

  // -----------------------------------------------------
  // 5️⃣ RELANCE ROUTINE DIRECTEMENT
  // -----------------------------------------------------
  setTimeout(() => {
    console.log("🏌️ Nouvelle routine");
    startRoutineSequence();
  }, 200);
}


  
function getUserLicence() {
  return window.userLicence || null;
}
  
function exportSwingForTraining(swing, scores) {
  const data = {
    metadata: {
      club: swing.club,
      view: swing.viewType,
      timestamp: Date.now(),
      userId: window.userId
    },
    keyframes: swing.keyFrames,
    scores: scores.metrics,
    rawFrames: swing.frames // compressé
  };
  
  // POST vers ton backend pour entraîner un modèle custom
  fetch("/api/swings/training", {
    method: "POST",
    body: JSON.stringify(data)
  });
}
  function resizeOverlay() {
    if (!overlayEl || !videoEl) return;
    overlayEl.width = videoEl.clientWidth || window.innerWidth;
    overlayEl.height = videoEl.clientHeight || window.innerHeight;
  }

function registerKeyframe(type, index, pose) {
  if (!window.currentSwing) return;

  if (!window.currentSwing.keyframeLandmarks) {
    window.currentSwing.keyframeLandmarks = {};
  }

  // snapshot profond (anti-mutation)
  window.currentSwing.keyframeLandmarks[type] = {
    index,
    pose: pose.map(p => ({
      x: p.x,
      y: p.y,
      z: p.z ?? null,
      v: p.visibility ?? null
    }))
  };
}

  
  // ---------------------------------------------------------
  //   UI MESSAGES
  // ---------------------------------------------------------
  function showBigMessage(msg) {
    if (!bigMsgEl) return;

    if (typeof msg === "string") {
      bigMsgEl.textContent = msg;
    } else {
      bigMsgEl.innerHTML = msg;
    }

    bigMsgEl.style.opacity = 0;
    bigMsgEl.style.transform = "translate(-50%, -50%) scale(0.9)";

    setTimeout(() => {
      bigMsgEl.style.opacity = 1;
      bigMsgEl.style.transform = "translate(-50%, -50%) scale(1)";
    }, 20);
  }

// =====================================================
// ❌ FERMER LE SWING REVIEW → RETOUR HOME
// =====================================================
window.jswGoHome = function () {
  console.log("⬅️ JSW → HOME");

  // 1️⃣ Stop logique JustSwing
  window.JustSwing?.stopSession?.();

  // 2️⃣ Reset moteur si présent
  window.SwingEngine?.reset?.();

  // 3️⃣ Nettoyage UI review
  document.getElementById("swing-review")?.remove();
  document.getElementById("swing-review-panel")?.remove();
  document.getElementById("swing-score-breakdown")?.remove();

  // 4️⃣ Sortie fullscreen
  document.body.classList.remove("jsw-fullscreen");

  // 5️⃣ Navigation Home (router = source de vérité)
  const homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.click();
  } else {
    console.warn("⚠️ home-btn introuvable → reload sécurité");
    location.reload();
  }
};



  
  function hideBigMessage() {
    if (!bigMsgEl) return;
    bigMsgEl.style.opacity = 0;
  }

  function showRoutineStepsText() {
    if (!routineStepsEl) return;

    const cfg =
      mode === JSW_MODE.SWING ? routineConfig.swing :
      mode === JSW_MODE.PUTT ? routineConfig.putt :
      routineConfig.approche;

    const steps = cfg.user?.length ? cfg.user : cfg.default;
    routineStepsEl.textContent = `Routine : ${steps.join(" · ")}`;
  }

async function canStartSwing() {
  // ---------------------------------
  // MODE ACCÈS LIBRE
  // ---------------------------------
  if (window.PARFECT_FLAGS?.OPEN_ACCESS) {
    return true;
  }

  const user = window.userLicence;

  // Sécurité : pas de user → on autorise (évite blocage dur)
  if (!user) return true;

  // ---------------------------------
  // PRO → toujours OK
  // ---------------------------------
  if (user.licence === "pro") {
    return true;
  }

  // ---------------------------------
  // FREE → quota total 15 swings
  // ---------------------------------
  const used = Number(user.swing_quota_used || 0);
  const limit = 15;

  if (used >= limit) {
    showBigMessage(`
      🚫 Analyse bloquée<br>
      <span style="opacity:.85;">
        Tu as analysé ${limit} swings.<br>
        Passe PRO pour continuer avec l’analyse IA.
      </span>
    `);
    return false;
  }

  return true;
}

function initSwingHeaderControls() {

  // 🔒 évite double initialisation
  if (window._jswHeaderInit) return;
  window._jswHeaderInit = true;

  const cameraSelect = document.getElementById("jsw-camera-select");

  if (cameraSelect) {

    // valeur par défaut
    window.jswViewType = cameraSelect.value;

    cameraSelect.addEventListener("change", (e) => {
      window.jswViewType = e.target.value;
      console.log("📐 Vue changée :", window.jswViewType);
    });
  }

  document.getElementById("jsw-quit-btn")?.addEventListener("click", () => {
    exitJustSwing(); // 👈 on utilise ta fonction propre
  });
}
  
// ---------------------------------------------------------
//   BOUTON START + CHOIX VUE (Face-On / Mobile FO / DTL)
// ---------------------------------------------------------
function showStartButton() {
  if (!bigMsgEl) return;

  state = JSW_STATE.WAITING_START;
  updateUI();

  bigMsgEl.innerHTML = `
    <div class="jsw-start-card">
      <button id="jsw-start-btn" class="jsw-btn-primary">
        Démarrer le swing 🏌️
      </button>
    </div>
  `;

  bigMsgEl.style.opacity = 1;

  document.getElementById("jsw-start-btn")?.addEventListener("click", () => {

    // ✅ Vérification quota
    if (!canStartSwing()) return;

    console.log("🚀 Lancement routine");
    startRoutineSequence(); // on lance direct la routine
  });
}




  function startCountdown() {
    if (!bigMsgEl) return;

    state = JSW_STATE.COUNTDOWN;
    updateUI();

    let n = 5;
    bigMsgEl.innerHTML = `<div style="font-size:4rem;font-weight:800;color:var(--jsw-text);">${n}</div>`;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      n--;
      if (n > 0) {
        bigMsgEl.innerHTML = `<div class="jsw-big-msg-inner">${n}</div>`;
      } else {
        bigMsgEl.innerHTML = `<div class="jsw-go">GO ! 🏌️</div>`;
        clearInterval(countdownInterval);
        countdownInterval = null;

        setTimeout(() => {
          //Si on ne voit pas le corps entier → on prévient
          if (!lastFullBodyOk) {
            showBigMessage("Je ne te vois pas entièrement 👀 Reviens bien dans le cadre.");
            state = JSW_STATE.POSITIONING;
            updateUI();
           // On laisse le joueur se replacer, puis il pourra relancer Start
            setTimeout(() => startRoutineSequence(), 2500);
            return;
          }

          // Sinon on lance la routine guidée
          startRoutineSequence();
        }, 500);
      }
    }, 1000);
  }

function jswGetViewMessage() {
  const view = window.jswViewType || "faceOn";

  if (view === "faceOn") {
    return `
      <div style="text-align:center;">
        <div style="font-size:2.5rem;">📸</div>
        <b>Face-On</b><br>
        Caméra face à toi, corps entier visible 👣
      </div>
    `;
  }

  if (view === "dtl") {
    return `
      <div style="text-align:center;">
        <div style="font-size:2.5rem;">📸➡️🏌️</div>
        <b>Down-The-Line</b><br>
        Caméra derrière toi, dans l’axe du swing 🎯
      </div>
    `;
  }

  // fallback ultra safe
  return `
    <div style="text-align:center;">
      <div style="font-size:2.5rem;">📸</div>
      Place-toi entièrement dans le cadre 👣
    </div>
  `;
}


function computeGlobalMovement(poseA, poseB) {
  if (!poseA || !poseB) return 0;

  const IDS = [11, 12, 23, 24]; // épaules + hanches
  let sum = 0;
  let count = 0;

  for (const id of IDS) {
    const a = poseA[id];
    const b = poseB[id];
    if (!a || !b) continue;

    sum += Math.hypot(b.x - a.x, b.y - a.y);
    count++;
  }

  return count ? sum / count : 0;
}

  
function hasRealMotion(swing) {
   const frames = swing.frames || [];
   let total = 0;

   for (let i = 1; i < frames.length; i++) {
     const p0 = frames[i - 1]?.[15]; // poignet lead
     const p1 = frames[i]?.[15];
     if (!p0 || !p1) continue;
     total += Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y);
   }

   return total > 0.08; // seuil mobile validé
 }

function isValidSwing(swing) {
  const kf = swing.keyFrames || {};

  // impact indispensable
  if (!kf.impact) return false;

  // top OU backswing acceptable
  if (!kf.top && !kf.backswing) return false;

  // durée minimale
  if (!swing.frames || swing.frames.length < 25) return false;

  // mouvement réel
  if (!hasRealMotion(swing)) return false;

  return true;
}



  function showSwingRetryButton(messageHtml) {
  if (!bigMsgEl) return;

  bigMsgEl.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:1.1rem; margin-bottom:14px;">
        ${messageHtml}
      </div>

      <button id="jsw-retry-btn" style="
        background:var(--jsw-green);
        color:#111;
        border:none;
        border-radius:14px;
        padding:14px 28px;
        font-size:1.2rem;
        font-weight:700;
        cursor:pointer;
      ">
        🔁 Recommencer le swing
      </button>
    </div>
  `;

  bigMsgEl.style.opacity = 1;

  const btn = document.getElementById("jsw-retry-btn");
  if (btn) {
    btn.onclick = () => {
      bigMsgEl.style.opacity = 0;
      bigMsgEl.innerHTML = "";
      startRoutineSequence(); // 🔥 relance directe
    };
  }
}

  
  // ---------------------------------------------------------
  //   ROUTINE GUIDÉE
  // ---------------------------------------------------------
  const routineStepsAuto = [
    "Vérifie (3sec) \ngrip ✋ \nposture 🧍‍♂️ \nalignement 🎯",
    //"Fais un swing d’essai 🌀",
    "Maintien l'Adresse… (3sec) \nRespire \n😮‍💨",
  ];


  function showSwingMessage() {
  if (!bigMsgEl) return;

  bigMsgEl.innerHTML = "*SWING ! \n🏌️";
  bigMsgEl.style.opacity = 1;
  bigMsgEl.classList.add("swing-active");
}

function startRoutineSequence() {
  if (!bigMsgEl) return;

  // Reset UX
  frameIndex = 0;
  captureArmed = false;
  isRecordingActive = false;
  addressStabilityBuffer = [];


  state = JSW_STATE.ROUTINE;
  console.log("▶️ Routine démarrée");
  updateUI();

  showRoutineStepsText();

  routineIndex = 0;
  showBigMessage(routineStepsAuto[0]);

  if (routineInterval) clearInterval(routineInterval);

  routineInterval = setInterval(() => {
    routineIndex++;

    if (routineIndex < routineStepsAuto.length) {
      showBigMessage(routineStepsAuto[routineIndex]);
    } else {
      clearInterval(routineInterval);
      routineInterval = null;

     // 👉 Fin de routine → armement swing
setTimeout(() => {
  console.log("⏳ Routine terminée → passage en capture directe");

  // 1️⃣ Armement moteur (NE DOIT PAS reset activeSwing après)
  engine.armForSwing();

  // 2️⃣ État capture
  captureArmed = true;
  isRecordingActive = true;
  state = JSW_STATE.SWING_CAPTURE;
  frameIndex = 0;

  // 3️⃣ CRÉATION UNIQUE DU SWING ACTIF (SOURCE DE VÉRITÉ)
  activeSwing = {
    frames: [],
    timestamps: [],
    keyFrames: {},
    keyframeLandmarks: {},
    club: currentClubType || "?",
    view: window.jswViewType || null,
    fps: engine?.fps || null
  };

  // 4️⃣ Prépare le lock adresse (UNE SEULE FOIS)
  pendingAddress = true;
  addressLocked = false;
  addressStabilityBuffer = [];

  console.log("🎯 Swing ARMÉ → prêt pour ADDRESS");
  console.log("🏌️ Capture ACTIVE (state=SWING_CAPTURE, rec=true)");

  showSwingMessage();
  updateUI();

  // 5️⃣ Timeout de sécurité swing (ZEN)
// 👉 Ne bloque JAMAIS la review
const SWING_TIMEOUT_MS = 6000;

swingTimeout = setTimeout(() => {
  if (!activeSwing) return;
//chgt 10 mars
//const impactSeen =!!activeSwing?.keyFrames?.impact || !!engine?.keyFrames?.impact;
//const finishSeen = !!activeSwing?.keyFrames?.finish || !!engine?.keyFrames?.finish;
const impactSeen =
  !!activeSwing?.keyFrames?.impact ||
  !!engine?.keyFrames?.impact;

const finishSeen =
  !!activeSwing?.keyFrames?.finish ||
  !!engine?.keyFrames?.finish;

  if (!impactSeen || !finishSeen) {
    console.warn("⏱️ Swing encore en cours au timeout", {
      impactSeen,
      finishSeen
    });

    // ⚠️ Marque le swing comme partiel
    activeSwing.flags = {
      ...(activeSwing.flags || {}),
      partial: true,
      impactSeen,
      finishSeen,
      reason: "timeout"
    };

    // 🔕 PAS de stopRecording ici
    // 🔕 PAS de retry forcé
    // 👉 Le moteur continuera jusqu’au finish ou fallback
  }
}, SWING_TIMEOUT_MS);


}, 1500);

    }
  }, 3500);
}




function showGoButtonAfterRoutine() {
  bigMsgEl.innerHTML = `
      <button id="jsw-go-btn" style="
        background:var(--jsw-green); padding:20px 40px;
        font-size:2rem; border-radius:14px;
        font-weight:bold; cursor:pointer; border:none;
      ">GO ! 🏌️</button>
  `;
  bigMsgEl.style.opacity = 1;

  document.getElementById("jsw-go-btn").onclick = () => {
    console.log("🟢 GO pressed — starting capture");
    bigMsgEl.style.opacity = 0;
    bigMsgEl.innerHTML = "";

  // ⭐ ESSENTIEL : l'état doit passer en ADDRESS_READY
  state = JSW_STATE.ADDRESS_READY;

  // ⭐ Armer la capture : SwingEngine peut déclencher KEYFRAME
  captureArmed = true;

  // ⭐ Reset index frames
  frameIndex = 0;

  updateUI();

  // ⭐ Démarre réellement l’enregistrement
    activateRecording();   // 👉 ACTIVATION SEULEMENT ICI
  };
}

  let engineRetryCount = 0;
const MAX_ENGINE_RETRY = 50;

  
function initEngine() {
  if (!window.SwingEngine || !window.SwingEngine.create) {
    console.error("❌ SwingEngine introuvable");
    return;
  }

  engine = window.SwingEngine.create({
    fps: 30,

    onKeyFrame: (evt) => {
      console.log("🎯 KEYFRAME", evt);
        const { type, index, pose } = evt;

  if (type && typeof index === "number" && Array.isArray(pose)) {
    registerKeyframe(type, index, pose);
  }

    },

    onSwingComplete: (evt) => {
    
      console.log("🏁 SWING COMPLETE", evt);
      activeSwing = null;


      if (swingTimeout) {
          clearTimeout(swingTimeout);
          swingTimeout = null;
        }
      handleSwingComplete(evt.data || evt);
      if (bigMsgEl) {
        bigMsgEl.style.opacity = 0;
        bigMsgEl.innerHTML = "Swing Complete";
        bigMsgEl.classList.remove("swing-active");
        }

        

    }
  });

  console.log("🔧 SwingEngine READY", engine);
}


async function getTodaySwingCount(email) {
  if (!email) return 0;

  const url =
    `${window.NOCODB_SWINGS_URL}?` +
    `where=(` +
      `cy88wsoi5b8bq9s,eq,${encodeURIComponent(email)}` +
    `)`;

  console.log("📊 NocoDB FETCH URL =", url);

  const res = await fetch(url, {
    headers: { "xc-token": window.NOCODB_TOKEN }
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("❌ NocoDB error:", txt);
    throw new Error("Impossible de récupérer les swings");
  }

  const data = await res.json();

  // ⏱️ Filtrage côté JS (aujourd’hui uniquement)
  const today = new Date().toISOString().slice(0, 10);

  return (data.list || []).filter(r =>
    r.createdAt?.startsWith(today)
  ).length;
}


  window.getTodaySwingCount = getTodaySwingCount;
 // ---------------------------------------------------------
  //   swing finish hanche
  // ---------------------------------------------------------

function detectFinishByStability(frames, lastIndex) {

  if (lastIndex < 6) return false;

  const poseA = frames[lastIndex - 3];
  const poseB = frames[lastIndex];

  if (!poseA || !poseB) return false;

  const LH1 = poseA[23];
  const RH1 = poseA[24];

  const LH2 = poseB[23];
  const RH2 = poseB[24];

  if (!LH1 || !RH1 || !LH2 || !RH2) return false;

  const hips1 = {
    x: (LH1.x + RH1.x) / 2,
    y: (LH1.y + RH1.y) / 2
  };

  const hips2 = {
    x: (LH2.x + RH2.x) / 2,
    y: (LH2.y + RH2.y) / 2
  };

  const move = Math.hypot(
    hips2.x - hips1.x,
    hips2.y - hips1.y
  );

  return move < 0.015;
}
  
  
  // ---------------------------------------------------------
  //   SESSION START / STOP
  // ---------------------------------------------------------
  function startSession(selectedMode = JSW_MODE.SWING) {
// 🔒 Garde licence — POINT D’ENTRÉE UNIQUE
    console.log("🔐 USER LICENCE RAW =", window.userLicence);

  if (!window.PARFECT_LICENCE_OK) {
    console.warn("⛔ JustSwing bloqué : licence requise");
   // 👉 OUVRIR LA MODAL DE CRÉATION DE COMPTE
  if (window.showEmailModal) {
    window.showEmailModal();
  } else {
    alert("Crée ton compte pour accéder à JustSwing");
  }

  return;
}
    
    if (!screenEl) initJustSwing();

    mode = selectedMode;
    state = JSW_STATE.WAITING_START;
    captureArmed = false;
    swingIndex = 0;
    lastPose = null;
    lastFullBodyOk = false;

    // Init moteur SwingEngine
    initEngine();


    // Affichage écran plein JustSwing
    screenEl.classList.remove("hidden");
    document.body.classList.add("jsw-fullscreen");

    updateUI();
    showStartButton();
    window.isSwingSessionActive = true;


    if (loopId) cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(mainLoop);
  }

  function stopSession() {
    state = JSW_STATE.IDLE;
    captureArmed = false;

    hideBigMessage();

    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = null;

    if (routineTimer) clearInterval(routineTimer);
    routineTimer = null;

    if (screenEl) screenEl.classList.add("hidden");
    window.isSwingSessionActive = false;
    document.body.classList.remove("jsw-fullscreen");
    
  }

  // ---------------------------------------------------------
  //   MAIN LOOP
  // ---------------------------------------------------------
  function mainLoop() {
    if (state !== JSW_STATE.IDLE) {
      drawOverlay();
      // Pas de logique lourde ici, tout se fait dans onPoseFrame + callbacks
    }
    loopId = requestAnimationFrame(mainLoop);
  }

  // ---------------------------------------------------------
  //   DRAW OVERLAY (squelette)
  // ---------------------------------------------------------
  function drawOverlay() {
    if (!ctx || !overlayEl) return;

    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);
    if (!lastPose) return;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;

    const w = overlayEl.width;
    const h = overlayEl.height;

    const p = (i) =>
      lastPose[i] ? { x: lastPose[i].x * w, y: lastPose[i].y * h } : null;

    const links = [
      [11, 12], [11, 23], [12, 24], [23, 24], // torse
      [11, 13], [13, 15],                     // bras gauche
      [12, 14], [14, 16],                     // bras droit
      [23, 25], [25, 27],                     // jambe gauche
      [24, 26], [26, 28],                     // jambe droite
    ];

    links.forEach(([a, b]) => {
      const pa = p(a);
      const pb = p(b);
      if (!pa || !pb) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });

    // Jointures
    ctx.fillStyle = "rgba(0,255,153,0.9)";
    [11,12,13,14,15,16,23,24,25,26,27,28].forEach((i) => {
      const pt = p(i);
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // ---------------------------------------------------------
  //   DRAW OVERLAY (reference)
  // ---------------------------------------------------------
    function drawPoseOnCanvas(pose, canvas, ctx) {
    if (!canvas || !ctx || !pose) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;

    const w = canvas.width;
    const h = canvas.height;

    const p = (i) =>
      pose[i] ? { x: pose[i].x * w, y: pose[i].y * h } : null;

    const links = [
      [11, 12], [11, 23], [12, 24], [23, 24], // torse
      [11, 13], [13, 15],                     // bras gauche
      [12, 14], [14, 16],                     // bras droit
      [23, 25], [25, 27],                     // jambe gauche
      [24, 26], [26, 28],                     // jambe droite
    ];

    links.forEach(([a, b]) => {
      const pa = p(a);
      const pb = p(b);
      if (!pa || !pb) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });

    ctx.fillStyle = "rgba(0,255,153,0.9)";
    [11,12,13,14,15,16,23,24,25,26,27,28].forEach((i) => {
      const pt = p(i);
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

// =====================================================
// ADRESSE STABLE — détection simple et robuste
// =====================================================

const ADDRESS_STABILITY_FRAMES = 6;

let addressCaptured = false;
let addressStabilityBuffer = [];

function isStableAddress(pose, frameIndex) {
  if (!pose || !Array.isArray(pose)) return false;

  addressStabilityBuffer.push(pose);

  if (addressStabilityBuffer.length > ADDRESS_STABILITY_FRAMES) {
    addressStabilityBuffer.shift();
  }

  if (addressStabilityBuffer.length < ADDRESS_STABILITY_FRAMES) {
    return false;
  }

  const first = addressStabilityBuffer[0];
  const last  = addressStabilityBuffer[addressStabilityBuffer.length - 1];

  let total = 0;
  let count = 0;

  for (let i = 0; i < first.length; i++) {
    if (!first[i] || !last[i]) continue;

    const dx = first[i].x - last[i].x;
    const dy = first[i].y - last[i].y;

    total += Math.hypot(dx, dy);
    count++;
  }

  if (!count) return false;

  const avgDist = total / count;
  const isStable = avgDist < ADDRESS_EPSILON;

  if (isStable && !addressCaptured && typeof frameIndex === "number") {
    addressCaptured = true;

    registerKeyframe("address", frameIndex, pose);

    addressStabilityBuffer = [];

    console.log("📍 ADDRESS CAPTURED @ frame", frameIndex);
  }

  return isStable;
}

  

  // ---------------------------------------------------------
  //   MEDIAPIPE CALLBACK
  // ---------------------------------------------------------
function onPoseFrame(landmarks) {

  lastPose = landmarks || null;
  lastFullBodyOk = detectFullBody(landmarks);

  if (!engine || !landmarks) return;
  if (state !== JSW_STATE.SWING_CAPTURE) return;

// =====================================================
// 🔒 LOCK ADRESSE — posture statique AVANT swing
// (source de vérité: activeSwing.keyFrames)
// =====================================================
if (pendingAddress && !addressLocked && isStableAddress(landmarks)) {

  // Sécurité
  if (!activeSwing) {
    console.warn("🔒 ADDRESS LOCK skipped: no activeSwing");
    return;
  }
  if (!activeSwing.keyFrames) activeSwing.keyFrames = {};
  if (!activeSwing.keyframeLandmarks) activeSwing.keyframeLandmarks = {};

  // index = frame courant (si tu pushes frames ailleurs, sinon 0)
  const addrIndex = Array.isArray(activeSwing.frames) ? activeSwing.frames.length : 0;

  // snapshot profond (évite mutation mediapipe)
  const poseSnap = Array.isArray(landmarks)
    ? landmarks.map(p => ({
        x: p.x, y: p.y,
        z: p.z ?? null,
        visibility: p.visibility ?? null
      }))
    : null;

  if (!poseSnap) {
    console.warn("🔒 ADDRESS LOCK failed: no landmarks");
    return;
  }

  // ✅ SOURCE DE VÉRITÉ POUR LE SCORING
  activeSwing.keyFrames.address = { index: addrIndex, pose: poseSnap };

  // ✅ Optionnel (debug / export)
  activeSwing.keyframeLandmarks.address = { index: addrIndex, pose: poseSnap };

  pendingAddress = false;
  addressLocked = true;

  console.log("🔒 ADDRESS LOCKED (SWING)", addrIndex, {
    hasActiveSwing: true,
    frames: addrIndex,
    hasKeyFrames: !!activeSwing.keyFrames
  });
}




  
  // ----------------------------
  // 1 Toujours pousser la frame au moteur
  // ----------------------------
  const now = performance.now();
  const evt = engine.processPose(landmarks, now, currentClubType);

  if (!engine.keyFrames) return;

 

  // ----------------------------
  // 2 FIN DE SWING
  // ----------------------------
  if (evt && evt.type === "swingComplete") {
    isRecordingActive = false;
    captureArmed = false;

    handleSwingComplete(evt.data || evt);
  }
}

function closeSwingReview() {
  console.log("❌ FERMER → retour Home");

  // 1) Stop session JustSwing proprement
  if (window.JustSwing?.stopSession) {
    window.JustSwing.stopSession();
  }

  // 2) Nettoyage UI fullscreen
  document.body.classList.remove("jsw-fullscreen");

  const reviewPanel = document.getElementById("swing-review-panel");
  if (reviewPanel) {
    reviewPanel.style.display = "none";
  }

  // 3) Retour HOME via router (source de vérité)
  const homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.click();
  } else {
    console.warn("⚠️ home-btn introuvable → reload sécurité");
    window.location.reload();
  }
}


  // ---------------------------------------------------------
  //   FULL BODY DETECTION
  // ---------------------------------------------------------
 function detectFullBody(lm) {
  if (!lm || lm.length < 31) return false;

 const head = lm[0];         // Nose
  const lhip = lm[23];        // left_hip
  const rhip = lm[24];        // right_hip

  // Tous doivent exister
  if (!head || !lhip || !rhip) return false;

  // Actuellement certaines valeurs peuvent être null ou 0 = hors cadre
  const inside = (p) =>
    p.visibility > 0.15 &&       // 👈 très important
    p.x > 0.02 && p.x < 0.98 &&
    p.y > 0.02 && p.y < 0.98;

if (!inside(head)) return false;
  if (!inside(lhip)) return false;
  if (!inside(rhip)) return false;

  // Vérifier que la tête est au-dessus des hanches (évite les faux positifs)
  const h = Math.abs(head.y - Math.min(lhip.y, rhip.y));

  return h > 0.15 && h < 0.95;
}

  // 👇 Ajoute ceci !
window.detectFullBody = detectFullBody;


  // ---------------------------------------------------------
//   HELPERS SCORING
// ---------------------------------------------------------
function jswClamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function jswDist(a, b) {
  if (!a || !b) return null;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function jswPoseDistance(a, b) {
  if (!a || !b) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (!a[i] || !b[i]) continue;
    d += Math.abs(a[i].x - b[i].x) + Math.abs(a[i].y - b[i].y);
  }
  return d;
}


function jswLineAngleDeg(a, b) {
  if (!a || !b) return null;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  return ang * 180 / Math.PI; // -180..180
}

function jswDegDiff(a, b) {
  if (a == null || b == null) return null;
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

function safePose(pose) {
  return Array.isArray(pose) ? pose : null;
}

function poseFromKeyframe(type, kf, swing) {
  if (swing?.keyframeLandmarks?.[type]?.pose) {
    return swing.keyframeLandmarks[type].pose;
  }
  return jswSafePoseFromKF(kf[type]) || null;
}

  
function jswSafePoseFromKF(kf) {
  // keyFrame type { index, pose } ou { pose } selon le moteur
  if (!kf) return null;
  if (kf.pose) return kf.pose;
  if (Array.isArray(kf)) return kf;
  return null;
}

function getRef(ref, path, fallback = null) {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), ref) ?? fallback;
}


  function getActiveReference({ club, view }) {
  const systemRef = window.ParfectReference;
  const playerRef = window.PlayerReference || null;

  const key = `${club}_${view}`;

  // 1️⃣ Référence joueur spécifique
  if (playerRef?.[key]) return playerRef[key];

  // 2️⃣ Référence joueur générique
  if (playerRef?.default) return playerRef.default;

  // 3️⃣ Référence Parfect spécifique
  if (systemRef?.[key]) return systemRef[key];

  // 4️⃣ Référence Parfect générique
  if (systemRef?.default) return systemRef.default;

  // 5️⃣ Sécurité absolue
  console.warn("⚠️ No reference found, using empty reference");
  return {};
}


function selectBestReference(swing, playerHistory) {
  const { club, view } = swing;
  
  // 1️⃣ Référence personnelle (5+ swings similaires)
  if (playerHistory[club]?.count >= 5) {
    return computePersonalAverage(playerHistory[club].swings);
  }
  
  // 2️⃣ Référence Parfect adaptée au niveau
  const level = detectPlayerLevel(playerHistory); // "beginner" | "intermediate" | "advanced"
  return window.ParfectReference[`${club}_${view}_${level}`];
}
  


  function safePoseFromKF(frames, kfEntry) {
  if (!kfEntry) return null;
  const idx = (typeof kfEntry === "number") ? kfEntry :
              (typeof kfEntry.index === "number") ? kfEntry.index : null;
  if (idx == null) return null;
  const pose = frames[idx];
  return Array.isArray(pose) ? pose : null;
}


function computeTriangleStable(pose) {
  if (!pose) return null;
  const Ls = pose[11], Rs = pose[12];
  const Lh = pose[15], Rh = pose[16];
  if (!Ls || !Rs || !Lh || !Rh) return null;

  const mid = { x: (Ls.x + Rs.x)/2, y:(Ls.y + Rs.y)/2 };
  const left  = jswDist(Lh, mid);
  const right = jswDist(Rh, mid);

  return (left + right) / 2;
}

function scoreTriangleStable(addr, top, imp) {
  const base = computeTriangleStable(addr);
  const vTop = computeTriangleStable(top);
  const vImp = computeTriangleStable(imp);

  if (!base || !vTop || !vImp) return 0.4; // socle

  const dTop = Math.abs(vTop - base) / base;
  const dImp = Math.abs(vImp - base) / base;

  const sTop = Math.max(0.3, 1 - dTop / 0.30);
  const sImp = Math.max(0.3, 1 - dImp / 0.25);

  return (sTop + sImp) / 2; // 0.3 → 1
}


function computeWeightShift(addr, top, imp) {
  if (!addr || !top || !imp) return { back: 0, forward: 0 };

  const hipMid = p => ({ x:(p[23].x+p[24].x)/2, y:(p[23].y+p[24].y)/2 });
  const footMid = p => ({ x:(p[27].x+p[28].x)/2, y:(p[27].y+p[28].y)/2 });

  const h0 = hipMid(addr);
  const h1 = hipMid(top);
  const h2 = hipMid(imp);

  const scale = Math.abs(addr[27].x - addr[28].x);  
  if (scale < 0.02) return { back: 0, forward: 0 };

  const backShift = (h1.x - h0.x) / scale;
  const fwdShift  = (h0.x - h2.x) / scale;

  return {
    back: jswClamp(backShift, -1, 1),
    forward: jswClamp(fwdShift, -1, 1)
  };
}

function scoreWeightShift(addr, top, imp) {
  const w = computeWeightShift(addr, top, imp);

  const back = Math.abs(w.back);
  const fwd  = Math.abs(w.forward);

  const sBack = Math.max(0.3, back / 0.25);
  const sFwd  = Math.max(0.3, fwd  / 0.30);

  return (sBack * 0.4 + sFwd * 0.6);
}


function scoreTempoRobust(timestamps, kf) {
  if (!timestamps || !kf.address || !kf.top || !kf.impact) return 0.4;

  const a = kf.address.index;
  const t = kf.top.index;
  const i = kf.impact.index;

  const tA = timestamps[a];
  const tT = timestamps[t];
  const tI = timestamps[i];

  if (!tA || !tT || !tI) return 0.4;

  const backswing = (tT - tA) / 1000;
  const downswing = (tI - tT) / 1000;

  if (backswing <= 0 || downswing <= 0) return 0.4;

  const ratio = backswing / downswing;
  const diff = Math.abs(ratio - 3);

  return Math.max(0.3, 1 - diff / 3);
}


  function jswComputeTempoFromSpeed(frames, timestamps, kf) {
  if (!frames || frames.length < 10) return { bs: null, ds: null, ratio: null };

  // 33 = right wrist index (MediaPipe) → prends ton landmark réel
  const WR = 16; 

  const speeds = [];
  for (let i = 1; i < frames.length; i++) {
    const p0 = frames[i-1][WR];
    const p1 = frames[i][WR];
    if (!p0 || !p1) continue;

    const dt = (timestamps[i] - timestamps[i-1]) / 1000;
    if (dt <= 0) continue;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const v = Math.hypot(dx, dy) / dt;

    speeds.push({ i, v });
  }

  if (speeds.length < 10) return { bs: null, ds: null, ratio: null };

  // 1️⃣ Trouver le TOP = vitesse minimale du backswing
  const minSpeed = speeds.reduce((a, b) => (b.v < a.v ? b : a));
  const topIndex = minSpeed.i;

  // 2️⃣ Impact = vitesse maximale dans la zone descendante
  const impactSpeed = speeds.reduce((a,b)=> (b.v > a.v ? b : a));
  const impactIndex = impactSpeed.i;

  const addrIndex = kf.address?.index ?? 0;

  // Durée backswing
  const bs = (timestamps[topIndex] - timestamps[addrIndex]) / 1000;

  // Durée downswing
  const ds = (timestamps[impactIndex] - timestamps[topIndex]) / 1000;

  const ratio = (bs > 0 && ds > 0) ? bs / ds : null;

  return { bs, ds, ratio };
}


function segmentAngle(A, B) {
  return Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI;
}

// =====================================================
// ROTATION SIGNATURE — Face-On & DTL
// Face-On = ratios projetés (comparés à la référence)
// =====================================================
function computeRotationSignature(basePose, topPose, viewType = "faceOn") {
  if (!basePose || !topPose) return null;

  // -----------------------------
  // DTL → angles réels (inchangé)
  // -----------------------------
  if (viewType === "dtl") {
    const LS0 = basePose[11], RS0 = basePose[12];
    const LH0 = basePose[23], RH0 = basePose[24];
    const LS1 = topPose[11],  RS1 = topPose[12];
    const LH1 = topPose[23],  RH1 = topPose[24];
    if (!LS0||!RS0||!LH0||!RH0||!LS1||!RS1||!LH1||!RH1) return null;

    const sh0 = jswLineAngleDeg(LS0, RS0);
    const sh1 = jswLineAngleDeg(LS1, RS1);
    const hip0 = jswLineAngleDeg(LH0, RH0);
    const hip1 = jswLineAngleDeg(LH1, RH1);

    return {
      shoulder: jswDegDiff(sh1, sh0),
      hip: jswDegDiff(hip1, hip0),
     // xFactor: jswDegDiff(sh1, sh0) - jswDegDiff(hip1, hip0)
    };
  }

  // -----------------------------
  // FACE-ON → ratios projetés
  // -----------------------------
  return computeRotationFaceOnRatio(basePose, topPose);
}


// =====================================================
// Rotation Face-On — ratios largeur projetée
// =====================================================
function computeRotationFaceOnRatio(basePose, topPose) {
  const LS0 = basePose[11], RS0 = basePose[12];
  const LH0 = basePose[23], RH0 = basePose[24];
  const LS1 = topPose[11],  RS1 = topPose[12];
  const LH1 = topPose[23],  RH1 = topPose[24];

  if (!LS0 || !RS0 || !LH0 || !RH0 || !LS1 || !RS1 || !LH1 || !RH1) {
    return null;
  }

  // Largeurs projetées
  const shBase = Math.abs(LS0.x - RS0.x);
  const shTop  = Math.abs(LS1.x - RS1.x);
  const hipBase = Math.abs(LH0.x - RH0.x);
  const hipTop  = Math.abs(LH1.x - RH1.x);

  // 🛡️ Sécurité numérique (évite divisions foireuses)
  if (shBase < 0.02 || hipBase < 0.02) {
    return null;
  }

  // 🔑 Rotation = variation RELATIVE (pas absolue)
  const shoulderRotation = 1 - shTop / shBase;
  const hipRotation      = 1 - hipTop / hipBase;

  return {
    shoulder: shoulderRotation,
    hip: hipRotation
  };
}




function scoreRotationFromReference(measure, ref) {
  if (!measure || !ref) return { score: 0 };

  const s = jswClamp(1 - Math.abs(measure.shoulder - ref.shoulder.target) / ref.shoulder.tol, 0, 1);
  const h = jswClamp(1 - Math.abs(measure.hip      - ref.hip.target)      / ref.hip.tol,      0, 1);

  return {
    score: Math.round((s * 0.4 + h * 0.4 + x * 0.2) * 20),
    details: { s, h}
  };
}




  function LM(pose, idx) {
  if (!pose || !Array.isArray(pose)) return null;
  return pose[idx] ?? null;
}

  function computeExtensionParfects(ext) {
  if (!ext) return 0;

  let stars = 0;

  // ⭐ 1 — extension réelle après impact
  if (
    typeof ext.extImpact === "number" &&
    typeof ext.extFinish === "number" &&
    ext.extFinish > ext.extImpact
  ) {
    stars++;
  }

  // ⭐ 2 — finish stable
  if (
    typeof ext.headMove === "number" &&
    typeof ext.headOverHips === "number" &&
    ext.headMove <= 0.15 &&
    ext.headOverHips <= 0.20
  ) {
    stars++;
  }

  return stars; // 0, 1 ou 2
}



function computeDTLPlanScore(swing) {
  const kf = swing.keyFrames;
  const refPose = kf?.top?.pose || kf?.backswing?.pose;

  if (!refPose) {
    return {
      score: null,
      deviation: null,
      status: "incomplete",
      details: "Plan non mesuré"
    };
  }

  const shoulderL = refPose[11];
  const shoulderR = refPose[12];
  const wrist = refPose[15]; // poignet lead

  if (!shoulderL || !shoulderR || !wrist) {
    return {
      score: null,
      deviation: null,
      status: "incomplete",
      details: "Plan non mesuré"
    };
  }

  // Ligne médiane des épaules
  const shoulderMidX = (shoulderL.x + shoulderR.x) / 2;

  // Écart poignet / ligne épaules
  const deviation = Math.abs(wrist.x - shoulderMidX);

  let score;
  if (deviation < 0.03) score = 18;
  else if (deviation < 0.05) score = 14;
  else if (deviation < 0.08) score = 9;
  else score = 4;

  return {
    score,
    deviation: Number(deviation.toFixed(3)),
    status: "ok"
  };
}



  
// =====================================================
// 🔧 KEYFRAME POSE RESOLVER (SOURCE DE VÉRITÉ)
// =====================================================
function getKeyframePose(type, metrics, activeSwing) {
  return (
    metrics?.keyframes?.[type]?.pose ||
    activeSwing?.keyFrames?.[type]?.pose ||
    activeSwing?.keyframeLandmarks?.[type]?.pose ||
    null
  );
}


// ---------------------------------------------------------
//   PREMIUM SCORING – utilise les keyFrames du SwingEngine
//   Gère les vues : faceOn / mobileFaceOn / dtl
// ---------------------------------------------------------

  
 async function computeSwingScorePremium(swing) {
// =====================================================
// 🔑 RÉFÉRENCES ACTIVES — DOUBLE MODE
// =====================================================

const club =
  swing?.club ||
  window.currentClubType ||
  document.getElementById("jsw-club-select")?.value ||
  "fer7";
   
const view =
  window.jswViewType ||
  document.getElementById("jsw-camera-select")?.value ||
  "faceOn";

// 🔵 Référence Parfect
const refSystem = await window.getSystemReference(club, view);

// 🟢 Référence User
const refUser = await window.getUserReference(club, view);

// référence active de calcul détaillé = Parfect par défaut
window.systemReference = refSystem || null;
window.userReference = refUser || null;
window.REF = refSystem || refUser || null;

console.log("🎯 Références chargées", {
  club,
  view,
  system: !!refSystem,
  user: !!refUser
});
    
    
  //const PARFECT_REF = window.parfectReference?.rotation;
  let postureScore = 0;   // valeur neutre, informative
  let addressScore = null; // ⚠️ null = “non scoré”

    
  const fps    = swing.fps || 30;
  const frames = swing.frames || [];
  const kf = swing.keyFrames || swing.keyframes || {};
  const T = swing.timestamps || [];

  
const REF_SAFE = {
  rotation: window.REF?.rotation ?? null,
  triangle: window.REF?.triangle ?? null,
  weightShift: window.REF?.weightShift ?? null,
  extension: window.REF?.extension ?? null,
  tempo: window.REF?.tempo ?? null,
};

const REF = window.REF;

if (!REF) {
  console.warn("⚠️ No Parfect reference available → fallback scoring");
}
 // -------------------------------------
  // Récup des poses clés
  // -------------------------------------
const addressPose = safePose(jswSafePoseFromKF(kf.address));
const backswingPose = safePose(jswSafePoseFromKF(kf.backswing)); 
const topPose     = safePose(jswSafePoseFromKF(kf.top));
const impactPose  = safePose(jswSafePoseFromKF(kf.impact));
const finishPose  = safePose(jswSafePoseFromKF(kf.finish));
    
  // -------------------------------------
  // Helpers locaux
  // -------------------------------------
  function jswClamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getKF(type, metrics, activeSwing) {
  return (
    metrics?.keyframes?.[type]?.pose ||
    activeSwing?.keyFrames?.[type]?.pose ||        // ✅ SOURCE DE VÉRITÉ
    activeSwing?.keyframeLandmarks?.[type]?.pose || // fallback
    null
  );
}



  function jswDist(a, b) {
    if (!a || !b) return null;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function jswLineAngleDeg(a, b) {
    if (!a || !b) return null;
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }

  function jswDegDiff(a, b) {
    if (a == null || b == null) return null;
    let d = Math.abs(a - b);
    if (d > 180) d = 360 - d;
    return d;
  }

  function jswSafePoseFromKF(kfEntry) {
    if (kfEntry == null) return null;
    let idx = null;
    if (typeof kfEntry === "number") {
      idx = kfEntry;
    } else if (typeof kfEntry.index === "number") {
      idx = kfEntry.index;
    }
    if (idx == null || !frames[idx]) return null;
    return frames[idx];
  }

function scoreVsReference(value, target, tol) {
  if (value == null || target == null || tol == null) return 0;
  const diff = Math.abs(value - target);
  return jswClamp(1 - diff / tol, 0, 1);
}


  // -------------------------------------
  // Vue caméra (driver par l UI)
  // -------------------------------------
  const rawView =
    (window.jswViewType || window.jswViewOverride || "faceOn")
      .toLowerCase();

  let viewType;
  if (rawView.includes("mobile")) {
    viewType = "mobileFaceOn";
  } else if (rawView.includes("dtl") || rawView.includes("line")) {
    viewType = "dtl";
  } else {
    viewType = "faceOn";
  }

  const metrics = {
    posture: {},
    rotation:  {},
    triangle:  {},
    weightShift: {},
    extension: {},
    tempo:     {},
    balance:   {},
    viewType
  };

metrics.posture = {};
metrics.rotation = {};
metrics.triangle = {};
metrics.weightShift = {};
metrics.extension = {};
metrics.tempo = {};
metrics.balance = {};
   
  console.log("👁️ ViewType utilisé pour le scoring :", viewType);

  // =====================================================
  // 1) POSTURE (Address)
  // =====================================================
  metrics.posture = metrics.posture || {};
   
   if (addressPose) {
    const LS = addressPose[11];
    const RS = addressPose[12];
    const LH = addressPose[23];
    const RH = addressPose[24];
    const LA = addressPose[27];
    const RA = addressPose[28];

    const hipsMid = (LH && RH) ? { x: (LH.x + RH.x)/2, y:(LH.y + RH.y)/2 } : null;
    const shMid   = (LS && RS) ? { x: (LS.x + RS.x)/2, y:(LS.y + RS.y)/2 } : null;

    let flexionDeg = 30; // fallback "athlétique
    


    if (hipsMid && shMid) {
      const vx = hipsMid.x - shMid.x;
      const vy = hipsMid.y - shMid.y;
      const norm = Math.hypot(vx, vy) || 1;
      const vyNorm = vy / norm;

      // vyNorm ≈ 1 → colonne verticale, vyNorm < 1 → penchée
      const theta = Math.acos(jswClamp(vyNorm, -1, 1)) * 180 / Math.PI;
      // 0° = vertical, 30-45° = flexion correcte
      flexionDeg = theta;
    }

    const feetWidth     = (LA && RA) ? jswDist(LA, RA) : null;
    const shoulderWidth = (LS && RS) ? jswDist(LS, RS) : null;
    let feetShoulderRatio = 1.0;
    if (feetWidth && shoulderWidth) {
      feetShoulderRatio = feetWidth / shoulderWidth;
    }

    const shoulderAngle = jswLineAngleDeg(LS, RS);
    const hipAngle      = jswLineAngleDeg(LH, RH);
    const alignDiff     = jswDegDiff(shoulderAngle, hipAngle) ?? 0;

    //metrics.posture.flexionDeg        = flexionDeg;
    //metrics.posture.feetShoulderRatio = feetShoulderRatio;
    //metrics.posture.alignDiff         = alignDiff;

    const flexScore  = jswClamp(1 - Math.abs(flexionDeg - 35)/25, 0, 1);
    const ratioScore = jswClamp(1 - Math.abs(feetShoulderRatio - 1.2)/0.7, 0, 1);
    const alignScore = jswClamp(1 - alignDiff/20, 0, 1);

    metrics.posture.score = Math.round((flexScore + ratioScore + alignScore)/3 * 10);
  } else {
    metrics.posture.score = 10;
  }
postureScore = metrics.posture.score;


const rotBasePose = backswingPose || topPose; // ✅ fallback

// =====================================================
// ROTATION FACE-ON — scoring par seuils (ROBUSTE)
// =====================================================
function scoreFaceOnRotationRatio(ratio) {
  if (ratio == null || isNaN(ratio)) return 0;

  if (ratio < 0.20) return 10;   // rotation excellente
  if (ratio < 0.35) return 8;
  if (ratio < 0.50) return 5;
  if (ratio < 0.65) return 2;
  return 0;
}

// =====================================================
// ROTATION — robuste (Face-On & DTL)
// source unique : addressPose / backswingPose / topPose
// =====================================================

// init SAFE (ne redéclare rien ailleurs)
metrics.rotation = metrics.rotation || {};
metrics.rotation.stages = metrics.rotation.stages || {};
metrics.rotation.score = 0;
metrics.rotation.status = "incomplete";

// poses déjà extraites PLUS HAUT
const basePoseRot = addressPose || backswingPose || null;
const topPoseRot  = topPose || null;

if (!basePoseRot || !topPoseRot) {
  console.warn("🌀 ROT ENGINE: missing base/top", {
    base: !!basePoseRot,
    top:  !!topPoseRot
  });
} else {

  const m = computeRotationSignature(
    basePoseRot,
    topPoseRot,
    window.jswViewType
  );

  if (!m || typeof m.shoulder !== "number" || typeof m.hip !== "number") {
    metrics.rotation.status = "invalid-measure";
    console.warn("🌀 ROT ENGINE: invalid rotation measure", m);
  } else {

    const shoulder = m.shoulder;
    const hip      = m.hip;

    // 🔑 TOUJOURS exposer les mesures (sinon UI = vide)
    metrics.rotation.measure = { shoulder, hip };

    // =================================================
    // 🎯 SCORING — dépend de la vue
    // =================================================
    let score = 0;

    if (window.jswViewType === "dtl") {

      // ---------- DTL : angles réels ----------
      // seuils réalistes (degrés)
      const SHOULDER_OK = 45;
      const HIP_OK      = 25;
      const SEP_OK      = 10;

      const sep = shoulder - hip;

      // épaules (10 pts)
      if (shoulder >= SHOULDER_OK) score += 10;
      else if (shoulder >= 30) score += 6;
      else if (shoulder >= 20) score += 3;

      // hanches (6 pts)
      if (hip >= HIP_OK) score += 6;
      else if (hip >= 15) score += 4;
      else if (hip >= 10) score += 2;

      // dissociation (4 pts)
      if (sep >= SEP_OK) score += 4;

      metrics.rotation.ref = {
        shoulder: { ok: SHOULDER_OK },
        hip: { ok: HIP_OK },
        separation: { ok: SEP_OK }
      };

      metrics.rotation.stages.baseToTop = {
        actual: { shoulder, hip, separation: sep },
        score
      };

    } else {

      // ---------- FACE-ON : ratios projetés ----------
      const ref = window.REF?.rotation || null;

      let s10 = 0;
      let h10 = 0;

      if (ref?.shoulder?.target != null && ref?.shoulder?.tol != null) {
        s10 = jswClamp(
          1 - Math.abs(shoulder - ref.shoulder.target) / ref.shoulder.tol,
          0,
          1
        ) * 10;
      }

      if (ref?.hip?.target != null && ref?.hip?.tol != null) {
        h10 = jswClamp(
          1 - Math.abs(hip - ref.hip.target) / ref.hip.tol,
          0,
          1
        ) * 10;
      }

      score = Math.round(s10 + h10);

      metrics.rotation.ref = ref;

      metrics.rotation.stages.baseToTop = {
        actual: { shoulder, hip },
        target: {
          shoulder: ref?.shoulder?.target ?? null,
          hip: ref?.hip?.target ?? null
        },
        tol: {
          shoulder: ref?.shoulder?.tol ?? null,
          hip: ref?.hip?.tol ?? null
        },
        score
      };
    }

    metrics.rotation.score = Math.max(0, Math.min(20, Math.round(score)));
    metrics.rotation.status = "ok";

    console.log("🌀 ROT ENGINE OK", metrics.rotation);
  }
}




// =====================================================
// 3) TRIANGLE — stabilité bras / buste (robuste mobile)
// =====================================================
let triangleScore = 10;
    
if (topPose && impactPose) {

  // 👉 base fiable : address → backswing → top
  const basePose = addressPose || backswingPose || topPose;

  if (!basePose) {
    triangleScore = 10;
  } else {
    const LS0 = LM(basePose, 11);
    const RS0 = LM(basePose, 12);
    const LW0 = LM(basePose, 15); // poignet lead

    const LS1 = LM(topPose, 11);
    const RS1 = LM(topPose, 12);
    const LW1 = LM(topPose, 15);

    const LS2 = LM(impactPose, 11);
    const RS2 = LM(impactPose, 12);
    const LW2 = LM(impactPose, 15);

    if (!LS0 || !RS0 || !LW0 || !LS1 || !RS1 || !LW1 || !LS2 || !RS2 || !LW2) {
      triangleScore = 10;
    } else {
      const shoulderW0 = jswDist(LS0, RS0);

      if (!shoulderW0 || shoulderW0 <= 0) {
        triangleScore = 10;
      } else {
        const ref   = jswDist(LS0, LW0) / shoulderW0;
        const topV  = jswDist(LS1, LW1) / shoulderW0;
        const impV  = jswDist(LS2, LW2) / shoulderW0;

        const varTop = Math.abs(topV - ref) / ref * 100;
        const varImp = Math.abs(impV - ref) / ref * 100;

        const scoreTop = jswClamp(1 - varTop / 18, 0, 1);
        const scoreImp = jswClamp(1 - varImp / 12, 0, 1);

        triangleScore = Math.round((scoreTop * 0.5 + scoreImp * 0.5) * 20);

        metrics.triangle = {
          refRatio: ref,
          topRatio: topV,
          impactRatio: impV,
          varTopPct: varTop,
          varImpactPct: varImp,
          score: triangleScore
        };
      }
    }
  }
} else {
  triangleScore = 10;
}

metrics.triangle.score = triangleScore;


// =====================================================
// 4) WEIGHT SHIFT — transfert latéral hanches (robuste)
// =====================================================
let weightShiftScore = 10;

if (topPose && impactPose) {
  // base fiable: address → backswing → top
  const basePose = addressPose || backswingPose || topPose;

  const LH0 = LM(basePose, 23), RH0 = LM(basePose, 24);
  const LH1 = LM(topPose, 23),  RH1 = LM(topPose, 24);
  const LH2 = LM(impactPose, 23),RH2 = LM(impactPose, 24);

  const LS0 = LM(basePose, 11), RS0 = LM(basePose, 12);

  if (LH0 && RH0 && LH1 && RH1 && LH2 && RH2 && LS0 && RS0) {
    const hips0 = { x:(LH0.x + RH0.x)/2, y:(LH0.y + RH0.y)/2 };
    const hips1 = { x:(LH1.x + RH1.x)/2, y:(LH1.y + RH1.y)/2 };
    const hips2 = { x:(LH2.x + RH2.x)/2, y:(LH2.y + RH2.y)/2 };

    const shoulderWidth = jswDist(LS0, RS0);

    if (shoulderWidth && shoulderWidth > 0) {
      const shiftBack = (hips1.x - hips0.x) / shoulderWidth;
      const shiftFwd  = (hips2.x - hips0.x) / shoulderWidth;

      metrics.weightShift.shiftBack = shiftBack;
      metrics.weightShift.shiftFwd  = shiftFwd;

      // ✅ référence active (club+vue) si tu l’as dans window.REF
      const REF = window.REF?.weightShift || null;

      let backScore = 0.5;
      let fwdScore  = 0.5;

      if (REF?.back && REF?.fwd) {
        backScore = jswClamp(
          1 - Math.abs(Math.abs(shiftBack) - REF.back.target) / REF.back.tol,
          0, 1
        );
        fwdScore = jswClamp(
          1 - Math.abs(Math.abs(shiftFwd) - REF.fwd.target) / REF.fwd.tol,
          0, 1
        );
      } else {
        backScore = jswClamp((Math.abs(shiftBack) - 0.03) / 0.12, 0, 1);
        fwdScore  = jswClamp((Math.abs(shiftFwd)  - 0.03) / 0.12, 0, 1);
      }

      weightShiftScore = Math.round((backScore * 0.4 + fwdScore * 0.6) * 10);
    }
  }
}

metrics.weightShift.score = weightShiftScore;


// =====================================================
// EXTENSION — robuste (impact prioritaire)
// =====================================================

// ⚠️ NE PAS redéclarer impactPose / finishPose / metrics
    let extensionScore = 0;

metrics.extension = metrics.extension || {
  extImpact: null,
  extFinish: null,
  progress: null,
  value: null,
  status: "incomplete",
  score: 0
};

let extensionStatus = "incomplete";

// -----------------------------------------------------
// 🔑 Landmarks depuis poses EXISTANTES
// -----------------------------------------------------
const LS = impactPose?.[11];
const RS = impactPose?.[12];
const LW = impactPose?.[15];
const RW = impactPose?.[16];

if (!LS || !RS || (!LW && !RW)) {
  extensionStatus = "no-hands";
} else {
  const shoulderWidth = Math.max(jswDist(LS, RS), 0.001);

  // 👉 extension réelle à l’impact (PRIORITÉ)
  const extImpact = Math.max(
    LW ? jswDist(LS, LW) : 0,
    RW ? jswDist(RS, RW) : 0
  ) / shoulderWidth;

  // 👉 extension post-impact (si dispo)
  let extFinish = null;

  if (
    finishPose &&
    finishPose[11] &&
    finishPose[12] &&
    (finishPose[15] || finishPose[16])
  ) {
    const swf = Math.max(
      jswDist(finishPose[11], finishPose[12]),
      0.001
    );

    extFinish = Math.max(
      finishPose[15] ? jswDist(finishPose[11], finishPose[15]) : 0,
      finishPose[16] ? jswDist(finishPose[12], finishPose[16]) : 0
    ) / swf;
  }

  const extensionValue = Math.max(extImpact, extFinish ?? 0);

  metrics.extension.extImpact = extImpact;
  metrics.extension.extFinish = extFinish;
  metrics.extension.progress =
    extFinish != null ? extFinish - extImpact : null;

  metrics.extension.value = extensionValue;

  extensionStatus = "ok";

 
  // ---------------------------------------------------
  // 🎯 Scoring (tolérance humaine)
  // ---------------------------------------------------
  const ref = window.REF?.extension;

  if (ref?.target != null && ref?.tol != null) {
    extensionScore = Math.round(
      jswClamp(
        1 - Math.abs(extensionValue - ref.target) / ref.tol,
        0,
        1
      ) * 10
    );
  } else {
    // fallback intelligent
    extensionScore = extensionValue > 0.55 ? 7 : 4;
  }

  metrics.extension.score = extensionScore;
}

metrics.extension.status = extensionStatus;


// =====================================================
// TEMPO — keyframes (address → top → impact)
// =====================================================

let tempoScore = null;
metrics.tempo = {};

const kfIdx = {
  address: kf.address?.index,
  top:     kf.top?.index,
  impact:  kf.impact?.index
};

if (
  typeof kfIdx.top === "number" &&
  typeof kfIdx.impact === "number" &&
  typeof kfIdx.address === "number" &&
  T.length > Math.max(kfIdx.address, kfIdx.top, kfIdx.impact)
) {

  const tAddr   = T[kfIdx.address];
  const tTop    = T[kfIdx.top];
  const tImpact = T[kfIdx.impact];

  if (tTop > tAddr && tImpact > tTop) {
    const backswingT = (tTop - tAddr) / 1000;
const rawDownswingT = (tImpact - tTop) / 1000;

// 🛡️ Sécurité MediaPipe (downswing trop court = bruit)
const MIN_DOWNSWING = 0.12; // 120 ms plancher réaliste
const downswingT = Math.max(rawDownswingT, MIN_DOWNSWING);

const ratio = backswingT / downswingT;

// exposé metrics
metrics.tempo.backswingT = backswingT;
metrics.tempo.downswingT = downswingT;
metrics.tempo.rawDownswingT = rawDownswingT;
metrics.tempo.ratio = ratio;

  
  const ref = window.REF?.tempo;
  
    metrics.tempo = {
      backswingT,
      downswingT,
      ratio,
       targetRatio: ref?.ratio?.target ?? null,
      tolRatio: ref?.ratio?.tol ?? null
    };

 
    if (ref?.ratio?.target != null && ref?.ratio?.tol != null && ratio != null) {
      tempoScore = Math.round(
        jswClamp(
          1 - Math.abs(ratio - ref.ratio.target) / ref.ratio.tol,
          0,
          1
        ) * 20
      );
    }
  }
}

metrics.tempo.score = tempoScore;


// =====================================================
// TEMPO ↔ EXTENSION SYNCHRO
// =====================================================

if (
  metrics.extension?.score != null &&
  metrics.tempo?.ratio != null
) {
  const ratio = metrics.tempo.ratio;

  // downswing très rapide → tolérance extension
  if (ratio < 2.2 && extensionScore != null) {
    extensionScore = Math.min(20, extensionScore + 2);
    metrics.extension.score = extensionScore;
    metrics.extension.syncedWithTempo = true;
  }
}

    
// =====================================================
// 7) BALANCE — finish + base (address/backswing/top)
// =====================================================
let balanceScore = 7;

if (finishPose) {
  const basePose = addressPose || backswingPose || topPose;

  const LHb = LM(basePose, 23), RHb = LM(basePose, 24);
  const LHf2 = LM(finishPose, 23), RHf2 = LM(finishPose, 24);
  const headFin = LM(finishPose, 0);

  if (LHb && RHb && LHf2 && RHf2 && headFin) {
    const hipsBase = { x:(LHb.x + RHb.x)/2, y:(LHb.y + RHb.y)/2 };
    const hipsFin  = { x:(LHf2.x + RHf2.x)/2, y:(LHf2.y + RHf2.y)/2 };

    const headOverHips = Math.abs(headFin.x - hipsFin.x) < 0.08;
    const finishMove = jswDist(hipsBase, hipsFin) || 0;

    metrics.balance.headOverHips = headOverHips;
    metrics.balance.finishMove   = finishMove;

    const headScore = headOverHips ? 1 : 0.4;
    const moveScore = jswClamp(1 - finishMove/0.25, 0, 1);

    balanceScore = Math.round((headScore*0.5 + moveScore*0.5) * 10);
  }
}

metrics.balance.score = balanceScore;

// =====================================================
// PLAN
// =====================================================
    if (window.jswViewType === "dtl") {
  const plan = computeDTLPlanScore(swing);

  metrics.swingPlane = {
    score: plan.score,
    deviation: plan.deviation,
    status: plan.status
  };
}


// =====================================================
// 8) TOTAL — Pondération Parfect V1
// - 3 axes majeurs à 20 pts
// - 4 axes secondaires à 10 pts
// - Les métrics non évaluées ne pénalisent PAS
// =====================================================

// 🎯 Pondérations officielles
const METRIC_WEIGHTS = {
  rotation:    20,
  tempo:       20,
  triangle:    20,
  weightShift: 10,
  extension:   10,
  balance:     10
};

// =====================================================
// JUST SWING — PILIERS PAR VUE
// =====================================================

const JSW_PILLARS = {
  faceOn: [
    "rotation",
    "tempo",
    "triangle",
    "weightShift",
    "extension",
    "balance"
  ],

  dtl: [
    "tempo",
    "plan",
    "rotation",   // secondaire (plafonnée à 15)
    "triangle",
    "extension",
    "balance"
  ]
};

    
// -----------------------------------------------------
// 🔢 Scores sources (UNE SEULE SOURCE DE VÉRITÉ)
// -----------------------------------------------------
const metricScores = {
  rotation:    metrics.rotation?.score     ?? null,
  triangle:    metrics.triangle?.score     ?? null,
  weightShift: metrics.weightShift?.score  ?? null,
  extension:   metrics.extension?.score    ?? null,
  tempo:       metrics.tempo?.score        ?? null,
  balance:     metrics.balance?.score      ?? null
};

let weightedSum = 0;
let maxPossible = 0;

// -----------------------------------------------------
// 🧮 Calcul pondéré robuste
// -----------------------------------------------------
for (const key in METRIC_WEIGHTS) {
  const score  = metricScores[key];
  const weight = METRIC_WEIGHTS[key];

  // ✅ on ignore les métrics non évaluées
  if (typeof score === "number" && !isNaN(score)) {
    const normalized = score / 20; // score ∈ [0..1]
    weightedSum += normalized * weight;
    maxPossible += weight;
  }
}

    function getPillarBadge(score) {
  if (typeof score !== "number") return null;

  if (score >= 18) {
    return { label: "✔︎ Solide", tone: "good" };
  }

  if (score >= 15) {
    return { label: "✓ Validé", tone: "mid" };
  }

  return null;
}


// -----------------------------------------------------
// 🎯 Score final normalisé sur 100
// -----------------------------------------------------
const total =
  maxPossible > 0
    ? Math.round((weightedSum / maxPossible) * 100)
    : 0;

// =====================================================
// 🎯 DOUBLE SCORE (Parfect + Moi)
// =====================================================

function computeTotalWithReference(ref) {

  if (!ref) return null;

  window.REF = ref;

  const metricScores = {
    posture:     metrics.posture?.score ?? null,
    rotation:    metrics.rotation?.score ?? null,
    triangle:    metrics.triangle?.score ?? null,
    weightShift: metrics.weightShift?.score ?? null,
    extension:   metrics.extension?.score ?? null,
    tempo:       metrics.tempo?.score ?? null,
    balance:     metrics.balance?.score ?? null
  };

  let weightedSum = 0;
  let maxPossible = 0;

  for (const key in METRIC_WEIGHTS) {
    const score  = metricScores[key];
    const weight = METRIC_WEIGHTS[key];

    if (typeof score === "number") {
      const normalized = score / 20;
      weightedSum += normalized * weight;
      maxPossible += weight;
    }
  }

  return maxPossible > 0
    ? Math.round((weightedSum / maxPossible) * 100)
    : 0;
}

// 🔵 vs Parfect
const totalSystem = computeTotalWithReference(refSystem);

// 🟢 vs Ma référence
const totalUser = computeTotalWithReference(refUser);
    
// =====================================================
// RETURN FINAL — API STABLE
// =====================================================
return {
 total: totalSystem ?? totalUser ?? total,
  totalDynamic: totalSystem ?? totalUser ?? total,

  totals: {
    system: totalSystem,
    user: totalUser
  },

  // ✅ Scores lisibles directement depuis metrics
  scores: {
    posture:     metrics.posture?.score      ?? 0,
    rotation:    metrics.rotation?.score     ?? 0,
    triangle:    metrics.triangle?.score     ?? 0,
    weightShift: metrics.weightShift?.score  ?? 0,
    extension:   metrics.extension?.score    ?? 0,
    tempo:       metrics.tempo?.score        ?? 0,
    balance:     metrics.balance?.score      ?? 0
  },

  // ✅ Breakdown propre pour UI / Coach
  breakdown: {
    posture:     { score: metrics.posture?.score      ?? 0, metrics: metrics.posture     || null },
    rotation:    { score: metrics.rotation?.score     ?? 0, metrics: metrics.rotation    || null },
    triangle:    { score: metrics.triangle?.score     ?? 0, metrics: metrics.triangle    || null },
    weightShift: { score: metrics.weightShift?.score  ?? 0, metrics: metrics.weightShift || null },
    extension:   { score: metrics.extension?.score    ?? 0, metrics: metrics.extension   || null },
    tempo:       { score: metrics.tempo?.score        ?? 0, metrics: metrics.tempo       || null },
    balance:     { score: metrics.balance?.score      ?? 0, metrics: metrics.balance     || null }
  },

  // 🔍 debug / export complet
  metrics
};

};


 function jswBuildLandmarksJSON(swing) {
  const frames = swing.frames || [];
  const ts = swing.timestamps || [];
  const KF = swing.keyFrames || {};

  const dump = {
    meta: {
      totalFrames: frames.length,
      keyframes: {
        address: KF.address?.index ?? null,
        backswing: KF.backswing?.index ?? null,
        top: KF.top?.index ?? null,
        downswing: KF.downswing?.index ?? null,
        impact: KF.impact?.index ?? null,
        release: KF.release?.index ?? null,
        finish: KF.finish?.index ?? null,
      }
    },
    frames: []
  };

  for (let i = 0; i < frames.length; i++) {
    const frameObj = {
      index: i,
      timestamp: ts[i] ?? null,
      landmarks: []
    };

    const lm = frames[i];
    if (!lm) {
      dump.frames.push(frameObj);
      continue;
    }

    for (let j = 0; j < lm.length; j++) {
      const p = lm[j];
      frameObj.landmarks.push({
        id: j,
        x: p.x,
        y: p.y,
        z: p.z ?? null,
        visibility: p.visibility ?? null
      });
    }

    dump.frames.push(frameObj);
  }

  return dump;
}


// =====================================================
// 💾 SAUVEGARDE SWING — NOCODB (VERSION STABLE)
// =====================================================
window.saveSwingToNocoDB = async function saveSwingToNocoDB(record) {
  try {
    if (!window.NOCODB_SWINGS_URL || !window.NOCODB_TOKEN) {
      throw new Error("Variables NocoDB manquantes");
    }

    const email = record?.email ?? window.userLicence?.email;
    if (!email) {
      throw new Error("Email utilisateur manquant");
    }

    // 🔥 Sécurise les objets
    const scores =
      typeof record.scores === "object" && record.scores !== null
        ? record.scores
        : {};

    const metrics =
      typeof record.metrics === "object" && record.metrics !== null
        ? record.metrics
        : {};

    const swingDump = jswBuildLandmarksJSON(record);

    const payload = {
      email,
      club: document.getElementById("jsw-club-select")?.value ?? "unknown",
      view: record.view ?? window.ViewType ?? "unknown",
      fps: record.fps ?? null,
      frames_count: record.frames?.length ?? 0,

      swing_json: swingDump,
      scores,
      metrics
    };

    console.log("📤 SAVING SWING:");
    console.log("scores →", scores);
    console.log("metrics →", metrics);

    const res = await fetch(window.NOCODB_SWINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xc-token": window.NOCODB_TOKEN
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`NocoDB ${res.status} — ${txt}`);
    }

    const data = await res.json();
    console.log("✅ Swing sauvegardé", data);

    return data;

  } catch (err) {
    console.error("❌ saveSwingToNocoDB error:", err);
    throw err;
  }
};

  
// ========================================
// ✅ APPELÉ QUAND UN SWING EST VALIDÉ
// ========================================
function onSwingValidated({ scores, currentClub, swing }) {
  if (!scores || !scores.breakdown) {
    console.warn("⚠️ onSwingValidated appelé sans breakdown", scores);
    return;
  }

  const breakdown = scores.breakdown;

  // =================================================
  // 1️⃣ SESSION LOCALE (5 derniers swings)
  // =================================================
  if (window.TrainingSession) {
    TrainingSession.swings.unshift({
      created_at: Date.now(),
      club: currentClub || "?",
      breakdown
    });

    TrainingSession.swings = TrainingSession.swings.slice(0, 5);

    if (typeof renderSessionHistoryInline === "function") {
      renderSessionHistoryInline();
    }
  }

  // =================================================
  // 2️⃣ LICENCE & USER (SOURCE DE VÉRITÉ)
  // =================================================
  const user = window.userLicence;
  const email = user?.email;

  if (!email) {
    console.warn("⚠️ Email utilisateur introuvable, swing non persisté");
    return;
  }

  // =================================================
  // 3️⃣ QUOTA SWING (1 swing analysé = 1 quota)
  // =================================================
  if (!window.PARFECT_FLAGS?.OPEN_ACCESS && user.licence === "free") {
    user.swing_quota_used = Number(user.swing_quota_used || 0) + 1;

    // Persist local
    localStorage.setItem("parfect_user", JSON.stringify(user));

    // Sync NocoDB (best effort)
    try {
      fetch(window.NOCODB_REFERENCES_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "xc-token": window.NOCODB_TOKEN
        },
        body: JSON.stringify({
          swing_quota_used: user.swing_quota_used
        })
      });
    } catch {}
  }

  // =================================================
  // 4️⃣ UI — rafraîchissement quota
  // =================================================
  if (typeof window.refreshSwingQuotaUI === "function") {
    window.refreshSwingQuotaUI();
  }



// ===============================
  // 3️⃣ SAUVEGARDE NOCODB - FORMAT COMPLET
  // ===============================
  const swingRecord = {
    cy88wsoi5b8bq9s: window.userLicence.email,
    club: swing?.club || currentClub || window.currentClubType || "?",
    view: swing?.view || window.jswViewType || "faceOn",
    frames_count: swing?.frames?.length || 0,
    keyframes: swing?.keyFrames || {},
    metrics: swing?.scores?.metrics || scores?.metrics || {},
    scores: swing?.scores || scores || {},
    is_valid: isValidSwing(swing),
    quality: swing?.quality || {}
  };
  
  console.log("📤 Envoi swing complet:", swingRecord);
  
  window.saveSwingToNocoDB(swingRecord).catch(err => {
    console.error("❌ Erreur sauvegarde swing:", err);
  });
}
  
// ---------------------------------------------------------
//   historique session
// ---------------------------------------------------------
  
function renderSessionHistoryInline() {
  const el = document.getElementById("swing-history");
  if (!el) return;

  const swings = window.TrainingSession?.swings || [];

  if (!swings.length) {
    el.innerHTML = `
      <div style="color:#777;font-size:0.85rem;">
        Aucun swing dans la session
      </div>`;
    return;
  }

  el.innerHTML = swings.map((s, i) => {
    const b = s.breakdown || {};

    const score = (k, max) =>
      typeof b[k]?.score === "number" ? `${b[k].score}/${max}` : "—";

    return `
  <div class="history-item session-item" data-swing-index="${i}">
  <div class="history-main">
    <span class="history-id">#${swings.length - i}</span>
    <span class="history-time">
      ${new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  </div>

  <div class="history-scores">
    <span title="Rotation">🎯 ${score("rotation", 20)}</span>
    <span title="Tempo">⏱️ ${score("tempo", 20)}</span>
    <span title="Triangle">🔺 ${score("triangle", 20)}</span>
    <span title="Balance">⚖️ ${score("balance", 10)}</span>
  </div>
</div>

    `;
  }).join("");
}


  

 function buildGlobalCoachComment(viewType, scores) {
  const breakdown = scores?.breakdown || {};

  // Ordre de priorité Parfect (simple & lisible)
  const ORDER =
    viewType === "dtl"
      ? ["tempo", "plan", "rotation", "triangle", "extension", "balance"]
      : ["tempo", "rotation", "triangle", "weightShift", "extension", "balance"];

  const LABEL = {
    tempo: "le tempo",
    rotation: "la rotation",
    triangle: "le triangle bras/épaules",
    weightShift: "le transfert d’appui",
    extension: "l’extension",
    balance: "l’équilibre",
    plan: "le plan de swing"
  };

  // Cherche le premier pilier sous le seuil
  const weak = ORDER.find((k) => {
    const s = breakdown[k]?.score;
    return typeof s === "number" && s < 15;
  });

  // 🟢 Tout est OK
  if (!weak) {
    return "Très belle séance. Les fondamentaux sont en place. Continue comme ça 👍";
  }

  return `Priorité : travaille ${LABEL[weak]}.`;
}


  
// ---------------------------------------------------------
//   PREMIUM BREAKDOWN BUILDER (utilise scores.breakdown)
//   ✅ plus de "metrics.xxx" en direct dans l UI
//   ✅ affiche un message si un module est non mesuré
// ---------------------------------------------------------

function buildParfectReviewCard(swing, scores) {
  const container = document.getElementById("swing-score-breakdown");
  if (!container) return;

  const objectiveMap = {
  rotation: "Épaules ~ cible Parfect, hanches stables",
  tempo: "Ratio cible ≈ 3:1",
  triangle: "Triangle bras/épaules stable du top à l’impact",
  plan: "Club dans le plan",
  weightShift: "Transfert progressif vers l’avant",
  extension: "Extension complète après impact",
  balance: "Tête stable, finish équilibré"
};
  const breakdown = scores?.breakdown || {};

  function buildReferenceInfo() {

  const sys = window.parfectReference;
  const usr = window.userReference;

  return `
  <div class="jsw-ref-info">

    ${
      sys
        ? `
      <div class="jsw-ref">
        🧠 Parfect
        <div class="jsw-ref-meta">
          id ${sys.id}<br>
          ${new Date(sys.created_at).toLocaleDateString()}
        </div>
      </div>`
        : ""
    }

    ${
      usr
        ? `
      <div class="jsw-ref">
        ⭐ Ta référence
        <div class="jsw-ref-meta">
          id ${usr.id}<br>
          ${new Date(usr.created_at).toLocaleDateString()}
        </div>
      </div>`
        : ""
    }

  </div>
  `;
}


  
  function getScore(key) {
  const s = breakdown?.[key]?.score;

  if (typeof s === "number") return s;

  // fallback moteur
  const alt = scores?.scores?.[key];
  if (typeof alt === "number") return alt;

  return 0;
}
  
  const viewTypeRaw = window.jswViewType || "faceOn";
  const viewLabel = viewTypeRaw === "dtl" ? "DTL" : "FACE";

  const club =
    window.currentClubType ||
    swing?.club ||
    document.getElementById("jsw-club-select")?.value ||
    "fer7";

  const clubLabel = club.toUpperCase();

  const METRIC_MAX = {
    rotation: 20,
    tempo: 20,
    triangle: 20,
    plan: 20,
    weightShift: 10,
    extension: 10,
    balance: 10
  };

  function buildComparisonBlock(key, data) {
  const m = data?.metrics || data || {};

  if (key === "rotation") {
    const actual = m?.stages?.baseToTop?.actual;
    const target = m?.stages?.baseToTop?.target;

    if (!actual) return "";

    return `
      <div class="jsw-detail-inline">
        Épaules : ${fmt(actual.shoulder)}<br>
        Hanches : ${fmt(actual.hip)}
        ${
          target
            ? `<br><span class="jsw-target">Cible épaules : ${fmt(target.shoulder)} · hanches : ${fmt(target.hip)}</span>`
            : ""
        }
      </div>
    `;
  }

  if (key === "tempo") {
    if (typeof m?.backswingT !== "number") return "";

    return `
      <div class="jsw-detail-inline">
        Back : ${fmt(m.backswingT)}s<br>
        Down : ${fmt(m.downswingT)}s<br>
        Ratio : ${fmt(m.ratio)}:1
        ${
          typeof m?.targetRatio === "number"
            ? `<br><span class="jsw-target">Cible : ${fmt(m.targetRatio)}:1</span>`
            : ""
        }
      </div>
    `;
  }

  if (key === "triangle") {
    return `
      <div class="jsw-detail-inline">
        Top : ${fmt(m.varTopPct)}%<br>
        Impact : ${fmt(m.varImpactPct)}%
      </div>
    `;
  }

  if (key === "weightShift") {
    return `
      <div class="jsw-detail-inline">
        Back : ${fmt(m.shiftBack)}<br>
        Forward : ${fmt(m.shiftFwd)}
      </div>
    `;
  }

  if (key === "extension") {
    return `
      <div class="jsw-detail-inline">
        Impact : ${fmt(m.extImpact)}<br>
        Finish : ${fmt(m.extFinish)}
      </div>
    `;
  }

  if (key === "balance") {
    return `
      <div class="jsw-detail-inline">
        Finish move : ${fmt(m.finishMove)}
      </div>
    `;
  }

  return "";
}

  // ===============================
  // SCORE FLOOR (UX uniquement)
  // ===============================

  function applyScoreFloor(score, max) {
    if (typeof score !== "number") return null;
    if (max === 20) return Math.max(score, 4);
    if (max === 10) return Math.max(score, 2);
    return score;
  }

  // ===============================
  // VISIBLE SCORE (inchangé moteur)
  // ===============================

  function getVisibleMetricKeys(viewType) {
    return viewType === "dtl"
      ? ["rotation","tempo","plan","triangle","weightShift","extension","balance"]
      : ["rotation","tempo","triangle","weightShift","extension","balance"];
  }

  function computeVisibleScore() {
  return getVisibleMetricKeys(viewTypeRaw).reduce(
    (sum, k) => sum + getScore(k),
    0
  );
}

  function computeVisibleMax() {
    return getVisibleMetricKeys(viewTypeRaw).reduce(
      (sum, k) => sum + (METRIC_MAX[k] || 0),
      0
    );
  }

  const visibleScore = computeVisibleScore();
  const visibleMax = computeVisibleMax();

  const displayScore =
    visibleMax > 0
      ? Math.round((visibleScore / visibleMax) * 100)
      : 0;

  const coachComment =
    typeof buildGlobalCoachComment === "function"
      ? buildGlobalCoachComment(viewTypeRaw, scores)
      : "Continue ton travail avec régularité.";

  // ===============================
  // BEST METRIC (focus positif)
  // ===============================

 const bestMetric = getVisibleMetricKeys(viewTypeRaw)
  .map(k => [k, getScore(k)])
  .sort((a,b) => b[1] - a[1])[0];

  // ===============================
  // SCORE LINE
  // ===============================

  const scoreLine = (key, label, max, icon) => {
    const raw = getScore(key);
    const floored = applyScoreFloor(raw, max);

    const highlight =
      bestMetric && bestMetric[0] === key
        ? "jsw-metric-highlight"
        : "";

    return `
      <div class="jsw-metric ${highlight}">
        <span class="jsw-metric-label">${icon} ${label}</span>
        <span class="jsw-metric-score">
          ${floored !== null ? `${floored}/${max}` : "—"}
        </span>
      </div>
    `;
  };

  // ===============================
  // RENDER
  // ===============================

  container.innerHTML = `
   <div class="jsw-review-card">

  <div class="jsw-review-header">
    <div class="jsw-score-ring">
      <div class="jsw-big-score" id="jsw-animated-score">0</div>
    </div>

    <div class="jsw-score-label">Score Parfect</div>
    <span class="jsw-pill">${viewLabel} · ${clubLabel}</span>
    <div class="jsw-coach-comment">${coachComment}</div>
  </div>

  <div class="jsw-metrics">
  

<div class="jsw-grid">
  ${getVisibleMetricKeys(viewTypeRaw).map((key) => {
  const data = breakdown?.[key] || {};
  const raw = getScore(key);

    if (raw === null) return "";

    const max = METRIC_MAX[key] || 20;
    const floored = applyScoreFloor(raw, max);
    const percent = Math.round((floored / max) * 100);

    const objective =
      objectiveMap?.[key] ||
      "";

    const measuredValue = buildComparisonBlock(key, data);

    return `
      <div class="jsw-card">
        <div class="jsw-card-header">
          <span>${key.toUpperCase()}</span>
          <strong>${floored}/${max}</strong>
        </div>

        <div class="jsw-bar">
          <div class="jsw-bar-fill" style="width:${percent}%"></div>
        </div>

        ${
          objective
            ? `<div class="jsw-objective">${objective}</div>`
            : ""
        }

        ${measuredValue}
      </div>
    `;

  }).join("")}
</div>

//<div class="jsw-review-actions">
  //<button id="jsw-review-back" class="jsw-btn-secondary">
    //← Retour
  //</button>

  //<button id="jsw-review-next" class="jsw-btn-primary">
   // Swing suivant 🏌️
  //</button>
//</div>

    </div>
  `;

  // ===============================
  // SIGNATURE PARFECT
  // ===============================

  const card = container.querySelector(".jsw-review-card");
  requestAnimationFrame(() => {
    card.classList.add("reveal");
  });

  const scoreEl = container.querySelector("#jsw-animated-score");

  function animateScore(target) {
    let current = 0;
    const duration = 700;
    const stepTime = 16;
    const increment = target / (duration / stepTime);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      scoreEl.textContent = Math.round(current);
    }, stepTime);
  }

  animateScore(displayScore);

  container.style.setProperty("--score", displayScore);

  // ===============================
  // INTERACTIONS
  // ===============================

  const toggleBtn = document.getElementById("jsw-toggle-details");
  const detailsPanel = document.getElementById("jsw-details-panel");

  if (toggleBtn && detailsPanel) {
    toggleBtn.onclick = () => {
      detailsPanel.classList.toggle("hidden");
      toggleBtn.textContent = detailsPanel.classList.contains("hidden")
        ? "+ Détails & objectifs"
        : "− Masquer les détails";
    };
  }

  document.getElementById("jsw-review-next")
    ?.addEventListener("click", () => {
      window.JustSwing?.nextSwing?.();
    });
}

function buildPremiumBreakdown(swing, scores) {
  const el = document.getElementById("swing-score-breakdown");
  if (!el) return;

  const breakdown = scores?.breakdown || {};
  const viewType =
  window.jswViewType === "dtl"
    ? "dtl"
    : "faceOn";

  // =====================================================
  // HELPERS
  // =====================================================

  const fmt = (v, d = 2) =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";

  const zone = (score, max) => {
    if (typeof score !== "number") return "mid";
    const r = score / max;
    if (r >= 0.7) return "good";
    if (r >= 0.4) return "mid";
    return "bad";
  };

  const badge = (score) => {
    if (typeof score !== "number") return "";
    if (score >= 18) return `<span class="jsw-badge good">✔︎ Solide</span>`;
    if (score >= 15) return `<span class="jsw-badge mid">✓ Validé</span>`;
    return "";
  };

  // =====================================================
  // CONFIGURATION
  // =====================================================

  const CONFIG = {
    pillars: {
      faceOn: [
        { key: "rotation", title: "Rotation", max: 20 },
        { key: "tempo", title: "Tempo", max: 20 },
        { key: "triangle", title: "Triangle", max: 20 },
        { key: "weightShift", title: "Transfert", max: 10 },
        { key: "extension", title: "Extension", max: 10 },
        { key: "balance", title: "Balance", max: 10 }
      ],
      dtl: [
        { key: "tempo", title: "Tempo", max: 20 },
        { key: "plan", title: "Plan de swing", max: 20 },
        { key: "rotation", title: "Rotation", max: 20 },
        { key: "triangle", title: "Triangle", max: 20 },
        { key: "extension", title: "Extension", max: 10 },
        { key: "balance", title: "Balance", max: 10 }
      ]
    },

    objectives: {
      tempo: {
        faceOn: "Ratio cible ≈ 3:1 (backswing fluide, downswing engagé)",
        dtl: "Tempo constant, sans accélération précoce"
      },
      rotation: {
        faceOn: "Épaules ~ cible Parfect, hanches stables",
        dtl: "Épaules ≥ 45° · Hanches ≥ 25° · Dissociation ≥ 10°"
      },
      triangle: {
        faceOn: "Triangle bras/épaules stable du top à l’impact",
        dtl: "Bras connectés, pas d’effondrement"
      },
      plan: {
        dtl: "Club dans le plan, sans steep excessif"
      },
      extension: {
        faceOn: "Extension complète après impact",
        dtl: "Bras étendus, release libre"
      },
      balance: {
        faceOn: "Tête stable, finish équilibré",
        dtl: "Centre de gravité contrôlé"
      }
    }
  };

  const PILLARS = CONFIG.pillars[viewType] || [];

  // =====================================================
  // GLOBAL COMMENT
  // =====================================================

  function buildGlobalComment() {
    const scored = PILLARS
      .map(p => ({
        title: p.title,
        score: breakdown[p.key]?.score ?? null
      }))
      .filter(p => typeof p.score === "number");

    const weak = scored.filter(p => p.score < 15);

    if (!weak.length) {
      return "Très belle séance. Les fondamentaux sont en place. Continue dans ce rythme 👍";
    }

    const primary = weak[0];
    const secondary = weak[1];

    let msg = `Priorité : travaille ${primary.title.toLowerCase()}.`;

    if (primary.score >= 12 && secondary) {
      msg += ` Ensuite, tu pourras t’attaquer à ${secondary.title.toLowerCase()}.`;
    }

    return msg;
  }

  // =====================================================
  // DETAILS BUILDER
  // =====================================================

  function buildDetails() {
    return {
      rotation: (() => {
        const m = breakdown.rotation?.metrics;
        return m?.measure
          ? `Épaules : ${fmt(m.measure.shoulder)}<br>Hanches : ${fmt(m.measure.hip)}`
          : `<em>Rotation non évaluée</em>`;
      })(),

      tempo: (() => {
        const m = breakdown.tempo?.metrics;
        return m
          ? `Back : ${fmt(m.backswingT)}s<br>Down : ${fmt(m.downswingT)}s<br>Ratio : ${fmt(m.ratio)}:1`
          : `<em>Tempo non évalué</em>`;
      })(),

      triangle: (() => {
        const m = breakdown.triangle?.metrics;
        return m
          ? `Top : ${fmt(m.varTopPct)}%<br>Impact : ${fmt(m.varImpactPct)}%`
          : `<em>Triangle non évalué</em>`;
      })(),

      extension: (() => {
        const m = breakdown.extension?.metrics;
        return m
          ? `Impact : ${fmt(m.impact)}<br>Finish : ${fmt(m.finish)}`
          : `<em>Extension non évaluée</em>`;
      })(),

      weightShift: (() => {
        const m = breakdown.weightShift?.metrics;
        return m
          ? `Back : ${fmt(m.shiftBack)}<br>Forward : ${fmt(m.shiftFwd)}`
          : `<em>Transfert non évalué</em>`;
      })(),

      balance: (() => {
        const m = breakdown.balance?.metrics;
        return m
          ? `Tête stable : ${m.headOverHips ? "oui" : "non"}<br>Hanches : ${fmt(m.finishMove)}`
          : `<em>Balance non évaluée</em>`;
      })(),

      plan: `<em>Plan en cours d’analyse</em>`
    };
  }

  const DETAILS = buildDetails();

  // =====================================================
  // CARD BUILDER
  // =====================================================

  const card = ({ key, title, max }) => {
    const score = breakdown[key]?.score ?? null;
    const z = zone(score, max);
    const pct =
      typeof score === "number"
        ? Math.min(100, Math.max(0, (score / max) * 100))
        : 0;

    const objective =
      CONFIG.objectives[key]?.[viewType] ||
      CONFIG.objectives[key]?.faceOn ||
      "";

    return `
      <div class="jsw-card jsw-${z}" data-card="${key}">
        <div class="jsw-card-header">
          <div class="jsw-title">${title}</div>
          <div class="jsw-score jsw-score-${z}">
            ${score ?? "—"}/${max}
          </div>
        </div>
        
        ${badge(score)}

        <div class="jsw-bar">
          <div class="jsw-bar-fill jsw-${z}" style="width:${pct}%"></div>
        </div>

        ${
          objective
            ? `<div class="jsw-objective">🎯 ${objective}</div>`
            : ""
        }

        <button class="jsw-toggle-details" data-toggle="${key}">
          + détails
        </button>

        <div class="jsw-details" id="details-${key}">
          ${DETAILS[key] || `<em>Donnée non disponible</em>`}
        </div>
      </div>
    `;
  };


  console.log("viewType:", viewType);
console.log("CONFIG.pillars:", CONFIG.pillars);
console.log("PILLARS resolved:", CONFIG.pillars[viewType]);
  // =====================================================
  // RENDER
  // =====================================================

  el.innerHTML = `
    <div style="padding:.6rem;">
      <div style="text-align:center;margin-bottom:.9rem;">
        <div class="jsw-view-badge ${viewType}">
          ${viewType === "dtl" ? "DTL — Down The Line" : "Face-On — Vue de face"}
        </div>
        <div style="font-size:1.6rem;font-weight:900;color:#4ade80;">
          ${scores.total ?? "—"}
        </div>
        <div style="font-size:.8rem;color:#aaa;">
          Score Parfect Premium
        </div>
      </div>

      <div class="jsw-coach-global">
        🧠 ${buildGlobalComment()}
      </div>

      <div class="jsw-grid">
        ${PILLARS.map(card).join("")}
      </div>

      <button id="jsw-back-btn" style="
        margin-top:1rem;
        width:100%;
        background:#333;
        color:#ccc;
        border:none;
        border-radius:14px;
        padding:.8rem;
        font-size:1rem;
      ">
        ← Home
      </button>
    </div>
  `;

  // =====================================================
  // EVENTS
  // =====================================================

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".jsw-toggle-details");
    if (!btn) return;

    const key = btn.dataset.toggle;
    const details = document.getElementById(`details-${key}`);
    if (!details) return;

    details.classList.toggle("open");
    btn.textContent = details.classList.contains("open")
      ? "− masquer"
      : "+ détails";
  });

  document.getElementById("jsw-back-btn")?.addEventListener("click", () => {
    window.JustSwing?.stopSession?.();
    window.SwingEngine?.reset?.();
    document.getElementById("home-btn")?.click();
  });

  
  


  
  el.innerHTML = `
    <div style="padding:.6rem;">
      <div style="text-align:center;margin-bottom:.9rem;">
        <div class="jsw-view-badge ${viewType}">
        ${viewType === "dtl" ? "DTL — Down The Line" : "Face-On — Vue de face"}
        </div>
        <div style="font-size:1.6rem;font-weight:900;color:#4ade80;">
          ${scores.total ?? "—"}
        </div>
        <div style="font-size:.8rem;color:#aaa;">
          Score Parfect Premium
        </div>
      </div>

      <div class="jsw-coach-global">
        🧠 ${buildGlobalComment()}
      </div>

      <div class="jsw-grid">
        ${PILLARS.map(card).join("")}
      </div>

      <button id="jsw-back-btn" style="
        margin-top:1rem;
        width:100%;
        background:#333;
        color:#ccc;
        border:none;
        border-radius:14px;
        padding:.8rem;
        font-size:1rem;
      ">
        ← Home
      </button>
    </div>
  `;


  
  // ---------------- ACTIONS ----------------

  document.getElementById("jsw-back-btn")?.addEventListener("click", () => {
    window.JustSwing?.stopSession?.();
    window.SwingEngine?.reset?.();
    document.getElementById("home-btn")?.click();
  });
}




function activateRecording() {
  console.warn("⚠️ activateRecording() temporairement désactivé (mode DEBUG).");
}


  // =====================================================
// KF NORMALIZER — force {index, pose} + fallback address
// =====================================================
function jswNormalizeKeyFrames(keyFrames, frames) {
  const kf = keyFrames || {};
  const out = {};

  const getPoseAt = (i) => {
    if (!Array.isArray(frames)) return null;
    if (typeof i !== "number") return null;
    if (i < 0 || i >= frames.length) return null;
    return frames[i] || null;
  };

  const normOne = (v) => {
    if (v == null) return null;

    // déjà bon format
    if (typeof v === "object" && typeof v.index === "number") {
      return {
        index: v.index,
        pose: v.pose || getPoseAt(v.index)
      };
    }

    // format number
    if (typeof v === "number") {
      return { index: v, pose: getPoseAt(v) };
    }

    return null;
  };

  // normalise connus
  const KEYS = ["address", "backswing", "top", "downswing", "impact", "release", "finish"];
  for (const k of KEYS) out[k] = normOne(kf[k]);

  // fallback address :
  // 1) si address manquant → prends frame 0 (UX lock) si existe
  // 2) sinon backswing-1 si dispo (optionnel)
  if (!out.address || !out.address.pose) {
    if (getPoseAt(0)) {
      out.address = { index: 0, pose: getPoseAt(0) };
    } else if (out.backswing && typeof out.backswing.index === "number" && out.backswing.index > 0) {
      const ai = out.backswing.index - 1;
      out.address = { index: ai, pose: getPoseAt(ai) };
    } else {
      out.address = null;
    }
  }

  return out;
}

  // ---------------------------------------------------------
//   SWING COMPLETE → SCORE + UI
// ---------------------------------------------------------
async function handleSwingComplete(swing) {

  console.log("🏁 handle SWING COMPLETE", swing);

  // ======================================================
  // 1️⃣ Guards
  // ======================================================
  if (!swing || !swing.frames?.length) {
    console.warn("❌ Swing invalide");
    return;
  }

  swing.keyFrames = jswNormalizeKeyFrames(
    swing.keyFrames,
    swing.frames
  );

  swing.club = window.currentClubType;
    
  // ======================================================
  // 2️⃣ Validation UX
  // ======================================================
  if (!isValidSwing(swing) || !hasRealMotion(swing)) {
    stopRecording();
    showBigMessage("😕 Aucun swing détecté.\nRecommence calmement.");
    startRoutineSequence();
    return;
  }

  if (!addressLocked) {
    stopRecording();
    showBigMessage("🧍‍♂️ Stabilise-toi à l’adresse");

    setTimeout(() => {
      hideBigMessage();
      startRoutineSequence();
    }, 1500);

    return;
  }

  // ======================================================
  // 3️⃣ Fin capture
  // ======================================================
  captureArmed = false;
  isRecordingActive = false;

  // ======================================================
  // 4️⃣ Scoring Premium
  // ======================================================
  const scores = await computeSwingScorePremium(swing);
  swing.scores = scores;

  // ======================================================
  // 5️⃣ Sauvegarde swing
  // ======================================================
  try {
    await window.saveSwingToNocoDB?.({
      player_email: window.userLicence?.email,
      created_at: new Date().toISOString(),
      club: swing.club,
      view: window.jswViewType,
      frames_count: swing.frames.length,
      keyframes: swing.keyFrames,
      metrics: scores.metrics,
      scores
    });

    console.log("✅ Swing sauvegardé");
  } catch (err) {
    console.warn("⚠️ Erreur sauvegarde", err);
  }

// ======================================================
// 6️⃣ Rendu UI Review
// ======================================================
buildParfectReviewCard(swing, scores);
bindSwingReviewActions(swing, scores);

// 🔴 cacher caméra
const swingArea = document.getElementById("just-swing-area");
if (swingArea) swingArea.style.display = "none";

// 🟢 afficher review
const reviewEl = document.getElementById("swing-review");

if (reviewEl) {
  reviewEl.style.display = "block";

  requestAnimationFrame(() => {
    reviewEl.classList.add("active");
  });
}

// Replay
initSwingReplay(swing, scores);

state = JSW_STATE.REVIEW;
updateUI();

console.log("📊 Review affichée");
}

// ======================================================
// ACTIONS REVIEW REFERENCES
// ======================================================

function bindSwingReviewActions(swing, scores) {

  const club =
  swing?.club ||
  document.getElementById("jsw-club-select")?.value ||
  "fer7";

const camera =
  window.jswViewType ||
  document.getElementById("jsw-camera-select")?.value ||
  "faceOn";

  const btnUserRef = document.getElementById("swing-save-reference");

  if (btnUserRef) {
    btnUserRef.onclick = async () => {

      console.log("⭐ save user reference click", {
      club,
      camera,
      metrics: scores?.metrics
    });
      btnUserRef.disabled = true;
      btnUserRef.textContent = "⏳ Enregistrement…";

      try {
      await window.saveUserReference(club, camera, scores.metrics);
      console.log("✅ user reference saved");
      btnUserRef.textContent = "✅ Référence enregistrée";
    } catch (e) {
      console.error("❌ saveUserReference error", e);
      btnUserRef.disabled = false;
      btnUserRef.textContent = "⭐ Sauvegarder comme ma référence";
    }
  };
}

  const btnParfect = document.getElementById("swing-save-parfect-reference");

  if (btnParfect && window.isAdmin?.()) {

    btnParfect.style.display = "block";

    btnParfect.onclick = async () => {
console.log("👑 save system reference click", {
      club,
      camera,
      metrics: scores?.metrics
    });
      btnParfect.disabled = true;
      btnParfect.innerHTML = "⏳ Enregistrement…";

   try {
      await window.saveSystemReference(club, camera, scores.metrics);
      console.log("✅ system reference saved");
      btnParfect.innerHTML = "✅ Référence PARFECT définie";
    } catch (e) {
      console.error("❌ saveSystemReference error", e);
      btnParfect.disabled = false;
      btnParfect.innerHTML = "⭐ Définir comme référence PARFECT";
    }
  };
}
}




// ======================================================
// HISTORIQUE
// ======================================================

async function loadSwingHistory(email) {
  const url =
    `${window.NOCODB_SWINGS_URL}?` +
    `where=(player_email,eq,${email})&sort=-created_at&limit=50`;

  const res = await fetch(url, {
    headers: { "xc-token": window.NOCODB_TOKEN }
  });

  if (!res.ok) throw new Error("Erreur historique");

  const data = await res.json();
  return data.list || [];
}

async function showSwingHistory() {
  const email = window.userLicence?.email;
  if (!email) return;

  const swings = await loadSwingHistory(email);
  const el = document.getElementById("swing-history");
  if (!el) return;

  el.innerHTML = swings
    .map(s => `
      <div class="history-item">
        <b>${new Date(s.created_at).toLocaleTimeString()}</b>
        — ${s.club}
        — ${s.scores?.total ?? "—"}/100
      </div>
    `)
    .join("");
}


// ======================================================
// QUOTA UI
// ======================================================

async function updateQuotaUI() {
  const email = window.userLicence?.email;
  if (!email) return;

  const count = await getTodaySwingCount(email);
  const left = Math.max(0, 10 - count);

  const el = document.getElementById("swing-quota");
  if (el) {
    el.textContent = `🎯 ${left} swings restants aujourd’hui`;
  }
}


// ======================================================
// COACH COMMENT
// ======================================================



function coachTechnicalComment(scores) {
    const msgs = [];
    if (scores.triangleScore < 70) msgs.push("Garde ton triangle stable.");
    if (scores.lagScore < 70) msgs.push("Garde les poignets armés plus longtemps.");
    if (scores.planeScore < 70) msgs.push("Descends plus dans le plan.");
    if (!msgs.length) return "Super swing 👌 Continue comme ça.";
    return msgs.slice(0, 2).join(" ");
  }

function stopRecording() {
  console.log("🛑 stopRecording() appelé");

  isRecordingActive = false;
  captureArmed = false;
  frameIndex = 0;

  if (engine) engine.reset();
}

  
  function showResultModal(scores) {
    let modal = document.getElementById("jsw-result-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "jsw-result-modal";
      modal.style.cssText = `
        position:fixed;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(0,0,0,0.85);
        z-index:99999;
      `;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="
        background:#111;
        border-radius:18px;
        padding:24px 32px;
        max-width:360px;
        text-align:center;
        box-shadow:0 12px 40px rgba(0,0,0,0.6);
      ">
        <h2 style="margin:0 0 12px;font-size:1.2rem;">🏌️ Résultat du swing</h2>
        <div style="font-size:3rem;font-weight:800;color:#4ade80;margin:8px 0 12px;">
          ${scores.total}/100
        </div>
        <p style="font-size:0.95rem;margin:0 0 14px;">
          ${coachTechnicalComment(scores)}
        </p>
        <button id="jsw-review-next" class="jsw-result-next" style="
          margin-top:10px;
          padding:10px 24px;
          border-radius:999px;
          border:none;
          background:var(--jsw-green);
          color:#111;
          font-weight:600;
          cursor:pointer;
        ">
          Swing suivant 🏌️
        </button>
      </div>
    `;

    modal.style.display = "flex";

    const btn = document.getElementById("jsw-result-next");
  if (btn) {
    btn.onclick = async () => {
      console.log("➡️ Swing suivant (UI)");
      modal.style.display = "none";
      await nextSwing(); // relance la routine + quota (si tu as patché nextSwing)
    };
  }
}







   // ---------------------------------------------------------
  //   replay : init + rendu + play/pause
  // ---------------------------------------------------------

  function initSwingReplay(swing, scores) {
  console.log("🟪 JSW-REPLAY: initSwingReplay(swing, scores) CALLED");
  console.log("🟪 Frames disponibles :", swing?.frames?.length);
  console.log("🟪 Keyframes:", swing?.keyFrames);
  console.log("🟪 Scores:", scores);
    console.trace("TRACE initSwingReplay");

  // -----------------------------
  // Guard
  // -----------------------------
  if (!swing || !Array.isArray(swing.frames) || swing.frames.length === 0) {
    console.warn("⏪ Pas de frames swing pour le replay");
    return;
  }

  // -----------------------------
  // Reset replay state
  // -----------------------------
  lastSwing = swing;
  replayFrameIndex = 0;
  replayPlaying = false;

  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }

  // -----------------------------
  // DOM elements
  // -----------------------------
  const reviewEl = document.getElementById("swing-review");
  const videoEl = document.getElementById("swing-video");
  const timeLabel = document.getElementById("swing-time-label");

  replayPlayBtn = document.getElementById("swing-play-pause");
  replaySpeedSel = document.getElementById("swing-speed");
  replayTimeline = document.getElementById("swing-timeline");

  if (!reviewEl || !videoEl || !replayPlayBtn || !replaySpeedSel || !replayTimeline) {
    console.warn("⏪ Replay UI incomplète");
    return;
  }

  // -----------------------------
  // Show review panel
  // -----------------------------
  reviewEl.style.display = "block";

  // -----------------------------
  // Timeline config
  // -----------------------------
  replayTimeline.min = 0;
  replayTimeline.max = swing.frames.length - 1;
  replayTimeline.value = 0;

  const fps = swing.fps || 30;
  const totalTimeSec = (swing.frames.length / fps).toFixed(1);
  if (timeLabel) {
    timeLabel.textContent = `0.0s / ${totalTimeSec}s`;
  }

  // -----------------------------
  // Canvas overlay (skeleton)
  // -----------------------------
  let overlay = document.getElementById("swing-overlay-canvas");

  if (!overlay) {
    overlay = document.createElement("canvas");
    overlay.id = "swing-overlay-canvas";
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "5";

    const container = videoEl.parentElement;
    container.style.position = "relative";
    container.appendChild(overlay);
  }

  // -----------------------------
  // Resize canvas to real size
  // -----------------------------
  const resizeOverlayReplay = () => {
    const rect = videoEl.getBoundingClientRect();

    // ⚠️ CRITICAL: sync real canvas size
    overlay.width = Math.floor(rect.width);
    overlay.height = Math.floor(rect.height);
  };

  resizeOverlayReplay();
  window.addEventListener("resize", resizeOverlayReplay);

  replayCanvas = overlay;
  replayCtx = overlay.getContext("2d");

  // -----------------------------
  // Bind replay controls
  // -----------------------------
  replayPlayBtn.onclick = () => {
    replayPlaying ? stopReplay() : startReplay();
  };

  replaySpeedSel.onchange = () => {
    if (replayPlaying) {
      stopReplay();
      setTimeout(startReplay, 50);
    }
  };

  replayTimeline.oninput = (e) => {
    const idx = parseInt(e.target.value, 10) || 0;
    renderFrame(idx);
  };

  // -----------------------------
  // Render first frame (MANDATORY)
  // -----------------------------
  renderFrame(0);

  console.log("✅ JSW-REPLAY ready (skeleton mode)");
}


function replaySwingFromHistory(swing) {
  console.log("🎬 Replay swing", swing);

  // 1️⃣ On va en mode Just Swing
  document.body.classList.add("jsw-fullscreen");
  document.getElementById("just-swing-area").style.display = "block";

  // 2️⃣ On masque l’UI live
  window.JustSwing?.stopSession?.();

  // 3️⃣ On reconstruit l’objet swing comme un swing “terminé”
  const parsedSwing = {
    ...swing,
    keyFrames: swing.keyFrames || JSON.parse(swing.keyframes_json || "{}"),
    frames: swing.frames || JSON.parse(swing.frames_json || "[]"),
    timestamps: swing.timestamps || JSON.parse(swing.timestamps_json || "[]"),
    club: swing.club,
    viewType: swing.view_type || "faceOn"
  };

  // 4️⃣ Replay EXACT comme après un swing
  handleSwingComplete(parsedSwing);
}

    
  function renderFrame(index) {
  if (!lastSwing || !replayCanvas || !replayCtx) return;

  const idx = Math.max(0, Math.min(lastSwing.frames.length - 1, index));
  replayFrameIndex = idx;

  const pose = lastSwing.frames[idx];
  drawPoseOnCanvas(pose, replayCanvas, replayCtx);

  if (replayTimeline) replayTimeline.value = idx;

  const fps = lastSwing.fps || 30;
  const t = (idx / fps).toFixed(2);
  const total = (lastSwing.frames.length / fps).toFixed(2);

  // ✅ FIX ICI
  const timeEl = document.getElementById("replay-time");
  if (timeEl) {
    timeEl.textContent = `${t}s / ${total}s`;
  }
}


 function startReplay() {
  if (!lastSwing) return;
  if (replayPlaying) return;

  replayPlaying = true;
  if (replayPlayBtn) replayPlayBtn.textContent = "⏸️";

  const fps = lastSwing.fps || 30;
  const baseDt = 1000 / fps;

  const getSpeed = () =>
    parseFloat(replaySpeedSel?.value || "1") || 1;

  replayTimer = setInterval(() => {
    if (!replayPlaying) return;

    const next = replayFrameIndex + 1;
    if (next >= lastSwing.frames.length) {
      stopReplay();
      return;
    }

    renderFrame(next);
  }, baseDt / getSpeed());
}

function stopReplay() {
  replayPlaying = false;

  if (replayPlayBtn) replayPlayBtn.textContent = "▶️";

  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }
}



// -------------------------------------------
// ⏭️ BOUTON "SWING SUIVANT" — VERSION STABLE
// -------------------------------------------
const nextBtn = document.getElementById("swing-review-next");

if (nextBtn) {
  nextBtn.onclick = () => {
    console.log("➡️ Swing suivant (UI)");
    window.JustSwing?.nextSwing?.();
  };
}

// -------------------------------------------
// 🎬 REVIEW SLIDE CLOSE
// -------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

  const closeBtn = document.getElementById("jsw-close-review");

  if (!closeBtn) return;

  closeBtn.addEventListener("click", () => {
    const review = document.getElementById("swing-review");

    if (!review) return;

    review.classList.remove("active");

    setTimeout(() => {
      review.style.display = "none";
    }, 400);
  });

});


  
  
  // ---------------------------------------------------------
  //   UI STATUS
  // ---------------------------------------------------------
  function updateUI() {
    if (!statusTextEl) return;

    switch (state) {
      case JSW_STATE.WAITING_START:
        statusTextEl.textContent = "Prêt à démarrer 🎬";
        break;
      case JSW_STATE.COUNTDOWN:
        statusTextEl.textContent = "Prépare-toi…";
        break;
      case JSW_STATE.ROUTINE:
        statusTextEl.textContent = "Routine en cours";
        break;
      case JSW_STATE.ADDRESS_READY:
        statusTextEl.textContent = "Adresse solide — swing quand tu veux";
        break;
      case JSW_STATE.SWING_CAPTURE:
        statusTextEl.textContent = "🔴 Swing en cours…";
        break;
      case JSW_STATE.REVIEW:
        statusTextEl.textContent = "Analyse du swing";
        break;
      case JSW_STATE.IDLE:
      default:
        statusTextEl.textContent = "En pause";
        break;
    }

    if (timerEl) {
      timerEl.textContent = ""; // on ne l’utilise plus pour l’instant
    }
  }

  function debug() {
    console.log("🔍 JSW state =", state);
    console.log("🔍 captureArmed =", captureArmed);
    console.log("🔍 lastFullBodyOk =", lastFullBodyOk);
    console.log("🔍 engine =", engine);
  }

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#jsw-close-review, #jsw-back-btn");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  window.jswGoHome();
});


    
  // ---------------------------------------------------------
  //   EXPORT
  // ---------------------------------------------------------
  return {
    initJustSwing,
    startSession,
    stopSession,
    onPoseFrame,
    nextSwing
  };
})();

window.JustSwing = JustSwing;



