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

  window.REF = null;

fetch("/data/parfect_reference.json")
  .then(r => r.json())
  .then(json => {
    window.ParfectReference = json;

    // ✅ SOURCE UNIQUE UTILISÉE PAR LE MOTEUR
    window.REF = json.default;
    console.log("📌 Parfect Reference loaded", json);
  })
  .catch(err => {
    console.warn("⚠️ Parfect reference not loaded", err);
  });

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
  const email = window.userLicence?.email;
  if (!email) return true; // sécurité

  const isPro =
    window.userLicence?.role === "superadmin" ||
    window.userLicence?.plan === "pro";

  if (isPro) return true;

  const count = await getTodaySwingCount(email);

  if (count >= 10) {
    showBigMessage(`
      🚫 Quota atteint<br>
      <span style="opacity:.8;">10 swings par jour (version gratuite)</span>
    `);
    return false;
  }

  return true;
}

  
// ---------------------------------------------------------
//   BOUTON START + CHOIX VUE (Face-On / Mobile FO / DTL)
// ---------------------------------------------------------
function showStartButton() {
  if (!bigMsgEl) return;

  state = JSW_STATE.WAITING_START;
  updateUI();

  bigMsgEl.innerHTML = `
    <div style="font-size:1.3rem;margin-bottom:14px;color:#fff;">
      📐 Où est placée la caméra ?
    </div>

    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
      <button id="jsw-view-face" style="
        background:#4ade80;
        padding:14px 18px;
        font-size:1.1rem;
        border-radius:12px;
        cursor:pointer;
        border:none;
      ">
        📸 Face-On<br>
        <span style="font-size:.85rem; opacity:.8;">
          Caméra à hauteur de poitrine
        </span>
      </button>

      <button id="jsw-view-dtl" style="
        background:#60a5fa;
        padding:14px 18px;
        font-size:1.1rem;
        border-radius:12px;
        cursor:pointer;
        border:none;
      ">
        🎥 Down-The-Line<br>
        <span style="font-size:.85rem; opacity:.8;">
          Derrière la ligne de jeu
        </span>
      </button>
    </div>

    <button id="jsw-back-btn" style="
      background:#333;
      color:#ccc;
      border:none;
      border-radius:12px;
      padding:10px 24px;
      font-size:1rem;
      cursor:pointer;
      width:100%;
    ">
      ← Retour
    </button>
  `;

  bigMsgEl.style.opacity = 1;

  // -------------------------
  // Choix de la vue caméra
  // -------------------------
  const setViewAndStart = async (view) => {
    window.jswViewType = view; // 🔑 utilisé partout (scoring, ref, etc.)
    console.log("📐 Vue sélectionnée :", view);
   if (await canStartSwing()) {
  startCountdown();
}
  };

  const btnFace = document.getElementById("jsw-view-face");
  if (btnFace) {
  btnFace.onclick = () => setViewAndStart("faceOn");
  }

  const btnDtl = document.getElementById("jsw-view-dtl");
  if (btnDtl) {
  btnDtl.onclick = () => setViewAndStart("dtl");
  }
  // -------------------------
  // Bouton retour
  // -------------------------
  const backBtn = document.getElementById("jsw-back-btn");
  if (backBtn) {
    backBtn.onclick = () => {
      window.JustSwing?.stopSession?.();
      document.body.classList.remove("jsw-fullscreen");
        document.getElementById("home-btn")?.click();
    };
  }
}




  function startCountdown() {
    if (!bigMsgEl) return;

    state = JSW_STATE.COUNTDOWN;
    updateUI();

    let n = 5;
    bigMsgEl.innerHTML = `<div style="font-size:4rem;font-weight:800;color:#00ff99;">${n}</div>`;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      n--;
      if (n > 0) {
        bigMsgEl.innerHTML = `<div style="font-size:4rem;font-weight:800;color:#00ff99;">${n}</div>`;
      } else {
        bigMsgEl.innerHTML = `<div style="font-size:4rem;font-weight:800;color:#4ade80;">GO ! 🏌️</div>`;
        clearInterval(countdownInterval);
        countdownInterval = null;

        setTimeout(() => {
          // Si on ne voit pas le corps entier → on prévient
          if (!lastFullBodyOk) {
            showBigMessage("Je ne te vois pas entièrement 👀 Reviens bien dans le cadre.");
            state = JSW_STATE.POSITIONING;
            updateUI();
            // On laisse le joueur se replacer, puis il pourra relancer Start
            setTimeout(() => showStartButton(), 2500);
            return;
          }

          // Sinon on lance la routine guidée
          startRoutineSequence();
        }, 500);
      }
    }, 1000);
  }

function jswGetViewMessage() {
  const mode = window.JSW_VIEW_MODE || "auto";

  if (mode === "faceon") {
    return `
      <div style="text-align:center;">
        <div style="font-size:2.5rem;">📸</div>
        <b>Face-On : Place la caméra devant toi</b><br>
        Mets-toi de plein pied dans le cadre 👣
      </div>
    `;
  }

  if (mode === "dtl") {
    return `
      <div style="text-align:center;">
        <div style="font-size:2.5rem;">📸➡️🏌️</div>
        <b>Down-The-Line : place la caméra derrière toi</b><br>
        Centre ton corps et ton club dans le cadre 🎯
      </div>
    `;
  }

  // AUTO
  return `
    <div style="text-align:center;">
      <div style="font-size:2.5rem;">📸</div>
      Mets-toi de plein pied dans le cadre 👣<br>
      (Vue détectée automatiquement)
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
        background:#00ff99;
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
    //"Vérifie grip ✋ posture 🧍‍♂️ alignement 🎯",
    //"Fais un swing d’essai 🌀",
    "Pose Adresse… 😮‍💨",
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

  // 5️⃣ Timeout de sécurité swing
  const SWING_TIMEOUT_MS = 6000;
  swingTimeout = setTimeout(() => {
    if (!activeSwing?.keyFrames?.impact) {
      console.warn("⏱️ Swing incomplet — aucun impact détecté");

      stopRecording();
      showSwingRetryButton(
        "😕 Je n’ai pas vu l’impact.<br>Reviens à l’adresse et recommence."
      );
    }
  }, SWING_TIMEOUT_MS);

}, 1500);

    }
  }, 3500);
}




function showGoButtonAfterRoutine() {
  bigMsgEl.innerHTML = `
      <button id="jsw-go-btn" style="
        background:#00ff99; padding:20px 40px;
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
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;

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
 // const x = jswClamp(1 - Math.abs(measure.xFactor  - ref.xFactor.target)  / ref.xFactor.tol,  0, 1);

  return {
    score: Math.round((s * 0.4 + h * 0.4 + x * 0.2) * 20),
    details: { s, h, x }
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

  
  function computeSwingScorePremium(swing) {
 // =====================================================
  // 🔑 RÉFÉRENCE ACTIVE — club + view (SOURCE UNIQUE)
  // =====================================================
  const club = swing.club || "default";
  const view = window.jswViewType || "faceOn";

  const refKey = `${club}_${view}`;

  if (window.ParfectReference) {
    window.REF =
      window.ParfectReference[refKey] ||
      window.ParfectReference.default ||
      null;
  } else {
    window.REF = null;
  }

  console.log("🎯 Active Reference", {
    refKey,
    ref: window.REF
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
  // Vue caméra (driver par l’UI)
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
    posture:   {},
    rotation:  {},
    triangle:  {},
    weightShift: {},
    extension: {},
    tempo:     {},
    balance:   {},
    viewType
  };

  console.log("👁️ ViewType utilisé pour le scoring :", viewType);

  // =====================================================
  // 1) POSTURE (Address)
  // =====================================================
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

    metrics.posture.flexionDeg        = flexionDeg;
    metrics.posture.feetShoulderRatio = feetShoulderRatio;
    metrics.posture.alignDiff         = alignDiff;

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
      const REF = window.REF?.weightShift || window.ParfectReference?.weightShift || null;

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

    metrics.tempo = {
      backswingT,
      downswingT,
      ratio
    };

    const ref = window.REF?.tempo;
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

  posture:     10,
  weightShift: 10,
  extension:   10,
  balance:     10
};

// -----------------------------------------------------
// 🔢 Scores sources (UNE SEULE SOURCE DE VÉRITÉ)
// -----------------------------------------------------
const metricScores = {
  posture:     metrics.posture?.score      ?? null,
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

// -----------------------------------------------------
// 🎯 Score final normalisé sur 100
// -----------------------------------------------------
const total =
  maxPossible > 0
    ? Math.round((weightedSum / maxPossible) * 100)
    : 0;

// =====================================================
// RETURN FINAL — API STABLE
// =====================================================
return {
  total,
  totalDynamic: total,

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


 function jswDumpLandmarksJSON(swing, payload = {}) {
  const { scores, currentClub } = payload;
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

  // DOWNLOAD
  const blob = new Blob([JSON.stringify(dump, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "swing_dump.json";
  a.click();
  URL.revokeObjectURL(url);

  console.log("📦 Swing JSON dump saved:", dump);

}


// =====================================================
// 💾 SAUVEGARDE SWING — NOCODB (VERSION STABLE)
// =====================================================
window.saveSwingToNocoDB = async function saveSwingToNocoDB(record) {
  try {
    // 🔐 Guards essentiels
    if (!window.NOCODB_SWINGS_URL || !window.NOCODB_TOKEN) {
      throw new Error("Variables NocoDB manquantes (URL ou TOKEN)");
    }

    if (!record || typeof record !== "object") {
      throw new Error("Record swing invalide");
    }

    // 🧠 Normalisation minimale (sécurité)
    const payload = {
      email: record.email ?? window.userLicence?.email ?? null,
      club: record.club ?? "?",
      view: record.view ?? "unknown",
      fps: record.fps ?? null,
      CreatedAt: record.CreatedAt ?? new Date().toISOString(),
      scores: record.scores ?? null,
      metrics: record.metrics ?? null
    };

    if (!payload.email) {
      throw new Error("Email utilisateur manquant — swing non sauvegardé");
    }

    console.log("📤 Sauvegarde swing NocoDB →", payload);

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
    console.log("✅ Swing sauvegardé dans NocoDB", data);

    return data;

  } catch (err) {
    console.error("❌ Erreur saveSwingToNocoDB:", err);
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

  // 1️⃣ Session locale (5 derniers swings)
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

  // après saveSwingToNocoDB(...)
if (typeof window.refreshSwingQuotaUI === "function") {
  window.refreshSwingQuotaUI();
}


  // ✅ DÉCLARATION DE 'user' (cette ligne manquait !)
  const user = window.userLicence;
  
 
 // ===============================
  // 2️⃣ LICENCE — SOURCE DE VÉRITÉ
  // ===============================
  const licence = getUserLicence(); // 🔑 OBLIGATOIRE
  const PLAYER_EMAIL = licence?.email;

  console.log("🔍 Debug email", {
    licence,
    email: PLAYER_EMAIL
  });
  
  if (!PLAYER_EMAIL) {
    console.warn("⚠️ Email utilisateur introuvable, sauvegarde ignorée");
    console.log("userLicence complet:", window.userLicence);
    return;
  }
  

// ===============================
  // 3️⃣ SAUVEGARDE NOCODB - FORMAT COMPLET
  // ===============================
  const swingRecord = {
    cy88wsoi5b8bq9s: window.userLicence.email,
    created_at: new Date().toISOString(),
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
      <div class="history-item session-item">
        <b>#${swings.length - i}</b>
        — ${new Date(s.created_at).toLocaleTimeString()}
        — 🎯 ${score("rotation", 20)}
        · ⏱️ ${score("tempo", 20)}
        · 🔺 ${score("triangle", 20)}
        · ⚖️ ${score("balance", 10)}
      </div>
    `;
  }).join("");
}

  
// ---------------------------------------------------------
//   PREMIUM BREAKDOWN BUILDER (utilise scores.breakdown)
//   ✅ plus de "metrics.xxx" en direct dans l'UI
//   ✅ affiche un message si un module est non mesuré
// ---------------------------------------------------------
function buildPremiumBreakdown(swing, scores) {
  const el = document.getElementById("swing-score-breakdown");
  if (!el) return;

  const breakdown = scores?.breakdown || {};

  const fmt = (v, d = 2) =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";

  const zone = (s, max) => {
    if (typeof s !== "number") return "mid";
    const r = s / max;
    if (r >= .7) return "good";
    if (r >= .4) return "mid";
    return "bad";
  };

  const coachMsg = (key, s) => {
    if (typeof s !== "number") return "Mesure incomplète.";
    if (s >= 14) return "Très solide 👍";
    if (s >= 8)  return "Peut mieux faire.";
    switch (key) {
      case "rotation": return "Travaille la rotation au backswing.";
      case "tempo": return "Ralentis le backswing.";
      case "triangle": return "Stabilise le triangle bras/épaules.";
      case "extension": return "Finis plus étendu.";
      case "weightShift": return "Accentue le transfert.";
      default: return "Axe à travailler.";
    }
  };

  const card = ({ key, title, max = 20, details }) => {
    const score = breakdown[key]?.score ?? null;
    const z = zone(score, max);
    const pct = score != null ? Math.min(100, Math.max(0, (score / max) * 100)) : 0;

    return `
      <div class="jsw-card">
        <div style="display:flex;justify-content:space-between;">
          <div class="jsw-title">${title}</div>
          <div class="jsw-score jsw-score-${z}">
            ${score ?? "—"}/${max}
          </div>
        </div>

        <div class="jsw-bar">
          <div class="jsw-bar-fill jsw-${z}" style="width:${pct}%"></div>
        </div>

        <div class="jsw-details">${details}</div>

        <div class="jsw-coach jsw-${z}">
          🧠 ${coachMsg(key, score)}
        </div>
      </div>
    `;
  };

  // ---------------- DETAILS ----------------

  const rotM = breakdown.rotation?.metrics;
  const rotationDetails = rotM?.measure
    ? `
      Épaules : ${fmt(rotM.measure.shoulder)}
      <br>Hanches : ${fmt(rotM.measure.hip)}
    `
    : `<em>Rotation non évaluée</em>`;

  const tempoM = breakdown.tempo?.metrics;
  const tempoDetails = tempoM
    ? `
      Back : ${fmt(tempoM.backswingT)}s
      <br>Down : ${fmt(tempoM.downswingT)}s
      <br>Ratio : ${fmt(tempoM.ratio)}:1
    `
    : `<em>Tempo non évalué</em>`;

  const triM = breakdown.triangle?.metrics;
  const triangleDetails = triM
    ? `
      Top : ${fmt(triM.varTopPct)}%
      <br>Impact : ${fmt(triM.varImpactPct)}%
    `
    : `<em>Triangle non évalué</em>`;

  const extM = breakdown.extension?.metrics;
  const extensionDetails = extM
    ? `
      Impact : ${fmt(extM.impact)}
      <br>Finish : ${fmt(extM.finish)}
    `
    : `<em>Extension non évaluée</em>`;

  const wsM = breakdown.weightShift?.metrics;
  const wsDetails = wsM
    ? `
      Back : ${fmt(wsM.shiftBack)}
      <br>Forward : ${fmt(wsM.shiftFwd)}
    `
    : `<em>Transfert non évalué</em>`;

  const balM = breakdown.balance?.metrics;
  const balanceDetails = balM
    ? `
      Tête stable : ${balM.headOverHips ? "oui" : "non"}
      <br>Hanches : ${fmt(balM.finishMove)}
    `
    : `<em>Balance non évaluée</em>`;

  // ---------------- RENDER ----------------

  el.innerHTML = `
    <div style="padding:.6rem;">
      <div style="text-align:center;margin-bottom:.9rem;">
        <div style="font-size:1.4rem;font-weight:900;color:#4ade80;">
          ${scores.total ?? "—"}
        </div>
        <div style="font-size:.8rem;color:#aaa;">
          Score Parfect Premium
        </div>
      </div>

      <div class="jsw-grid">
        ${card({ key:"rotation", title:"Rotation", max:20, details:rotationDetails })}
        ${card({ key:"tempo", title:"Tempo", max:20, details:tempoDetails })}
        ${card({ key:"triangle", title:"Triangle", max:20, details:triangleDetails })}
        ${card({ key:"weightShift", title:"Transfert", max:10, details:wsDetails })}
        ${card({ key:"extension", title:"Extension", max:10, details:extensionDetails })}
        ${card({ key:"balance", title:"Balance", max:10, details:balanceDetails })}
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

const backBtn = document.getElementById("jsw-back-btn");

if (backBtn) {
  backBtn.onclick = () => {
    window.JustSwing?.stopSession?.();
    window.SwingEngine?.reset?.();
    document.getElementById("home-btn")?.click();
  };
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
  // 0️⃣ Guards bas niveau
  // ======================================================
  if (!swing) {
    console.warn("❌ Swing vide");
    return;
  }
  
  // ✅ Normalisation KEYFRAMES (sinon posture/tempo/rotation pètent)
  swing.keyFrames = jswNormalizeKeyFrames(swing.keyFrames, swing.frames);

  // =====================================================
// 🔁 SYNC KEYFRAMES → METRICS (SOURCE UNIQUE)
// =====================================================
const metrics = {};
  
  metrics.keyframes = {};

for (const k in swing.keyFrames) {
  if (swing.keyFrames[k]?.pose) {
    metrics.keyframes[k] = {
      index: swing.keyFrames[k].index,
      pose: swing.keyFrames[k].pose
    };
  }
}

  
  // ======================================================
  // 1️⃣ Sauvegarde brute (même si swing invalide)
  // ======================================================
  const PLAYER_EMAIL = "gregoiremm@gmail.com";

  const swingRecord = {
    player_email: PLAYER_EMAIL,
    created_at: new Date().toISOString(),
    club: swing.club || currentClubType,
    view: swing.view || window.jswViewType || "faceOn",
    frames_count: swing.frames?.length || 0,
    keyframes: swing.keyFrames || {},
    metrics: swing.scores?.metrics || {},
    scores: swing.scores || {},
    is_valid: isValidSwing(swing),
    quality: swing.quality || {}
  };

  (swingRecord);

// ===============================
// RÉFÉRENCES (USER / PARFECT)
// ===============================
function saveUserReference(swing, scores) {
  if (!swing || !scores?.metrics) {
    console.warn("⚠️ Référence user non sauvegardée (données manquantes)");
    return;
  }

  const refRecord = {
    owner: swing.player_email || "unknown",
    scope: "user",
    club: swing.club || currentClubType,
    view: window.jswViewType || "faceOn",
    metrics: scores.metrics,
    created_at: new Date().toISOString()
  };

  saveReferenceToDB(refRecord);

  console.log("⭐ Référence USER sauvegardée", refRecord);
}

  function saveParfectReference(swing, scores) {
  const ref = {
    owner: "PARFECT",
    scope: "global",
    club: swing.club,
    view: window.jswViewType,
    metrics: scores.metrics,
    created_at: new Date().toISOString(),
    version: "v1"
  };

  saveReferenceToDB(ref);
}

  function bindSwingReviewActions(swing, scores) {
  // --- USER REFERENCE ---
  const btnUserRef = document.getElementById("swing-save-reference");

  if (!btnUserRef) {
    console.warn("❌ USER REF BUTTON NOT FOUND");
  } else {
    console.log("✅ USER REF BUTTON READY");

    btnUserRef.onclick = () => {
      console.log("⭐ USER REF CLICKED");

      if (!swing || !scores) {
        console.warn("❌ Missing swing or scores");
        return;
      }

      saveUserReference(swing, scores);

      btnUserRef.textContent = "✅ Référence enregistrée";
      btnUserRef.disabled = true;
      btnUserRef.style.opacity = 0.6;
    };
  }

  // --- SUPERADMIN PARFECT (optionnel, prêt pour après) ---
 function isSuperAdmin() {
  return (
    window.userLicence?.is_superadmin === true ||
    window.userLicence?.role === "superadmin"
  );
}

  const btnParfect = document.getElementById("swing-save-parfect-reference");
if (btnParfect && isSuperAdmin) {
  btnParfect.style.display = "block";

  btnParfect.onclick = async () => {
    try {
      // 🔒 éviter double clic
      btnParfect.disabled = true;

      // 🔄 feedback immédiat
      btnParfect.innerHTML = "⏳ Enregistrement…";
      btnParfect.style.opacity = "0.6";
      btnParfect.style.cursor = "default";

      console.log("👑 PARFECT REF CLICKED");

      // ⏱️ attendre la sauvegarde réelle
      await saveParfectReference(swing, scores);

      // ✅ succès UI
      btnParfect.innerHTML = "✅ Référence PARFECT définie";
      btnParfect.style.background = "#00ff99";
      btnParfect.style.color = "#111";
      btnParfect.style.border = "none";
      btnParfect.style.opacity = "1";

      showBigMessage("⭐⭐ Référence PARFECT enregistrée");

    } catch (err) {
      console.error("❌ Échec sauvegarde référence PARFECT", err);

      // 🔁 rollback UI
      btnParfect.disabled = false;
      btnParfect.innerHTML = "⭐ Définir comme référence PARFECT";
      btnParfect.style.opacity = "1";
      btnParfect.style.cursor = "pointer";

      showBigMessage("❌ Erreur lors de l’enregistrement");
    }
  };
}
}

  
  // ======================================================
  // 2️⃣ Validation swing (UX first)
  // ======================================================
  if (!isValidSwing(swing) || !hasRealMotion(swing)) {
    console.warn("❌ Faux swing détecté");

    stopRecording();
    showBigMessage("😕 Oups… aucun swing détecté.\nRecommence calmement.");
    // 🔁 Routine directe, sans bouton
    startRoutineSequence();
    return; // ⛔ STOP ICI
  }

  // ======================================================
// ❌ Adresse NON lockée → on relance la routine
// ======================================================
if (!addressLocked) {
  console.warn("❌ Adresse non verrouillée — restart routine");

  stopRecording();

  showBigMessage(`
    🧍‍♂️ Reviens à l’adresse<br>
    Stabilise-toi une seconde
  `);

  // 🔁 Relance automatique de la routine
  setTimeout(() => {
    hideBigMessage();

    // reset minimal
    addressLocked = false;
    pendingAddress = false;

    // 🔁 Routine directe, sans bouton
    startRoutineSequence();
  }, 1800);

  return; // ⛔ STOP scoring
}

  // ======================================================
  // 3️⃣ Fin capture / passage en REVIEW
  // ======================================================
  captureArmed = false;
  isRecordingActive = false;
  state = JSW_STATE.REVIEW;
  updateUI();

  // ======================================================
  // 4️⃣ Sélection de la référence ACTIVE (clé)
  // ======================================================
  const club = swing.club || currentClubType;
  const view = window.jswViewType || "faceOn";

  window.REF = getActiveReference({ club, view });
  window.REF_META = {
    club,
    view,
    key: `${club}_${view}`
  };

  console.log("🎯 Active Reference:", window.REF_META, window.REF);

  // ======================================================
  // 5️⃣ FACE-ON RESULT (tolérances + zones) — NOUVEAU
  // ======================================================
  let faceOnResult = null;

  if (view.includes("face")) {
    try {
      faceOnResult = computeFaceOnResult(swing, window.REF);
      console.log("🟢 FaceOnResult:", faceOnResult);
    } catch (e) {
      console.warn("⚠️ FaceOnResult failed", e);
    }
  }

  // ======================================================
  // 6️⃣ SCORING PREMIUM (inchangé)
  // ======================================================
  const scores = computeSwingScorePremium(swing);
  buildPremiumBreakdown(swing, scores);

  onSwingValidated({
  scores,
  currentClub: swing.club || currentClubType,
    swing // 👈 LA LIGNE QUI MANQUAIT
  });

  // 🔒 Brancher les actions APRÈS le render
  bindSwingReviewActions(swing, scores);


  // -------------------------------------------
  // 1️⃣ — Sélection des éléments du Replay (index.html)
  // -------------------------------------------
  const reviewEl = document.getElementById("swing-review");
  const scoreEl = document.getElementById("swing-review-score");
  const commentEl = document.getElementById("swing-review-comment");
  const breakdownEl = document.getElementById("swing-score-breakdown");

  if (!reviewEl) {
    console.error("❌ swing-review panel not found in DOM !");
    return;
  }

// =====================================================
// SAUVEGARDE RÉFÉRENCE DANS NOCODB
// =====================================================

async function saveReferenceToDB(ref) {
  try {
    // 🔑 Vérifier que les variables d'environnement existent
    if (!window.NOCODB_REFERENCES_URL || !window.NOCODB_TOKEN) {
      throw new Error("Variables NocoDB manquantes (URL ou TOKEN)");
    }

    console.log("📤 Sauvegarde référence...", ref);

    const res = await fetch(window.NOCODB_REFERENCES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xc-token": window.NOCODB_TOKEN
      },
      body: JSON.stringify(ref)
    });

    // ✅ Vérification statut HTTP
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`NocoDB ${res.status} — ${txt}`); // ✅ Parenthèses corrigées
    }

    const data = await res.json();
    console.log("✅ Référence sauvegardée", data);
    return data;

  } catch (err) {
    console.error("❌ Erreur saveReferenceToDB:", err.message);
    throw err; // ✅ Propager l'erreur pour gestion en amont
  }
}




  
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
    .map(
      (s) => `
      <div class="history-item">
        <b>${new Date(s.created_at).toLocaleTimeString()}</b>
        — ${s.club}
        — ${s.scores?.total ?? "—"}/100
      </div>
    `
    )
    .join("");
}

async function updateQuotaUI() {
  const email = window.userLicence?.email;
  if (!email) return;

  const count = await getTodaySwingCount(email);
  const left = Math.max(0, 10 - count);

  const el = document.getElementById("swing-quota");
  if (el) el.textContent = `🎯 ${left} swings restants aujourd’hui`;
}

  
  // -------------------------------------------
  // 2️⃣ — Afficher le panneau Replay
  // -------------------------------------------
  reviewEl.style.display = "block";

  // -------------------------------------------
  // 3️⃣ — Score Global
  // -------------------------------------------
  if (scoreEl) {
    scoreEl.textContent = `Score : ${scores.total}/100`;
  }

  // -------------------------------------------
  // 4️⃣ — Commentaire Coach
  // -------------------------------------------
  if (commentEl) {
    commentEl.textContent = coachTechnicalComment(scores);
  }

  // -------------------------------------------
  // 5️⃣ — Score Card Premium
  // -------------------------------------------
  if (breakdownEl) {
    breakdownEl.innerHTML = "";   // Reset
    breakdownEl.style.display = "block";
    buildPremiumBreakdown(swing, scores); // ⬅️ On remplit l’élément depuis
  }

  // -------------------------------------------
  // 6️⃣ — On masque totalement l’ancien panneau JustSwing
  // -------------------------------------------
  if (resultPanelEl) {
    resultPanelEl.classList.add("hidden");
  }
  console.log("📊 Replay panel updated with Premium Scoring.");


  // -------------------------------------------
    // 7️⃣ — 💥 INIT REPLAY PRO (overlay squelette)
    // -------------------------------------------
    initSwingReplay(swing, scores);
  jswDumpLandmarksJSON(swing);

}

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
        <button id="jsw-result-next" style="
          margin-top:10px;
          padding:10px 24px;
          border-radius:999px;
          border:none;
          background:#00ff99;
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
      btn.onclick = () => {
        modal.style.display = "none";
        state = JSW_STATE.WAITING_START;
        updateUI();
        showStartButton();
      };
    }
  }

  const btnUserRef = document.getElementById("swing-save-reference");

if (btnUserRef) {
  btnUserRef.onclick = () => {
    saveUserReference(swing, scores);
    showBigMessage("⭐ Swing enregistré comme référence personnelle");
  };
}

 // ======================================================
// ⭐⭐ BOUTON RÉFÉRENCE PARFECT (SUPERADMIN)
// ======================================================

const isSuperAdmin =
  window.userLicence?.role === "superadmin" ||
  window.userLicence?.is_superadmin === true;

const btnParfect = document.getElementById("swing-save-parfect");
const feedbackEl = document.getElementById("parfect-ref-feedback");

if (btnParfect && isSuperAdmin) {
  btnParfect.style.display = "block";

btnParfect.onclick = async () => {
  console.log("👑 PARFECT REF CLICKED");

  // Feedback immédiat (avant async)
  btnParfect.disabled = true;
  const prevText = btnParfect.innerHTML;
  btnParfect.innerHTML = "⏳ Enregistrement…";

  try {
    await saveParfectReference(swing, scores);

    // Feedback visible et durable
    btnParfect.innerHTML = "✅ Référence enregistrée";
    btnParfect.style.opacity = "0.9";

    // Sécurité anti double clic
    btnParfect.onclick = null;

  } catch (err) {
    console.error("❌ PARFECT REF ERROR", err);

    // rollback UI
    btnParfect.disabled = false;
    btnParfect.innerHTML = prevText;
  }
};
}



   // ---------------------------------------------------------
  //   replay : init + rendu + play/pause
  // ---------------------------------------------------------

  function initSwingReplay(swing, scores) {
    console.log("🟪 JSW-REPLAY: initSwingReplay(swing, scores) CALLED");
    console.log("🟪 Frames disponibles :", swing.frames?.length);
    console.log("🟪 Keyframes:", swing.keyFrames);
    console.log("🟪 Scores:", scores);

    if (!swing || !swing.frames || !swing.frames.length) {
      console.warn("⏪ Pas de frames swing pour le replay");
      return;
    }

    lastSwing = swing;
    replayFrameIndex = 0;
    replayPlaying = false;
    if (replayTimer) {
      clearInterval(replayTimer);
      replayTimer = null;
    }

    const reviewEl = document.getElementById("swing-review");
    const videoEl = document.getElementById("swing-video");
    const playBtn = document.getElementById("swing-play-pause");
    const speedSel = document.getElementById("swing-speed");
    const timeline = document.getElementById("swing-timeline");
    const timeLabel = document.getElementById("swing-time-label");

    if (!reviewEl || !playBtn || !speedSel || !timeline || !timeLabel) {
      console.warn("⏪ Elements replay swing manquants dans le DOM");
      return;
    }

    // Affiche le panneau review (au cas où)
    reviewEl.style.display = "block";

    // Timeline configurée sur le nombre de frames
    timeline.min = 0;
    timeline.max = swing.frames.length - 1;
    timeline.value = 0;

    // Durée totale estimée
    const fps = swing.fps || 30;
    const totalTimeSec = (swing.frames.length / fps).toFixed(1);
    timeLabel.textContent = `0.0s / ${totalTimeSec}s`;

    // Création / récupération du canvas overlay dans le bloc vidéo
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

      const container = videoEl.parentElement;
      container.style.position = "relative";
      container.appendChild(overlay);
    }

    // Adapter la taille du canvas aux dimensions de la vidéo
    const resizeOverlayReplay = () => {
      const rect = videoEl.getBoundingClientRect();
      overlay.width = rect.width;
      overlay.height = rect.height;
    };
    resizeOverlayReplay();
    window.addEventListener("resize", resizeOverlayReplay);

    replayCanvas = overlay;
    replayCtx = overlay.getContext("2d");

   function renderFrame(index) {
  if (!lastSwing || !replayCanvas || !replayCtx) return;

  const idx = Math.max(0, Math.min(lastSwing.frames.length - 1, index));
  replayFrameIndex = idx;

  const pose = lastSwing.frames[idx];
  drawPoseOnCanvas(pose, replayCanvas, replayCtx);

  if (timeline) timeline.value = idx;

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
      playBtn.textContent = "⏸️";

      const fps = lastSwing.fps || 30;
      const baseDt = 1000 / fps;

      const getSpeed = () => parseFloat(speedSel.value || "1") || 1;

      replayTimer = setInterval(() => {
        if (!replayPlaying) return;
        let next = replayFrameIndex + 1;
        if (next >= lastSwing.frames.length) {
          // Fin du swing → on arrête
          replayPlaying = false;
          clearInterval(replayTimer);
          replayTimer = null;
          playBtn.textContent = "▶️";
          return;
        }
        renderFrame(next);
      }, baseDt / getSpeed());
    }

    function stopReplay() {
      replayPlaying = false;
      playBtn.textContent = "▶️";
      if (replayTimer) {
        clearInterval(replayTimer);
        replayTimer = null;
      }
    }

    // Listeners
    playBtn.onclick = () => {
      if (replayPlaying) {
        stopReplay();
      } else {
        startReplay();
      }
    };

    speedSel.onchange = () => {
      // On relance le timer avec le nouveau speed
      if (replayPlaying) {
        stopReplay();
        // petit timeout pour éviter un conflit de timer
        setTimeout(startReplay, 50);
      }
    };

    timeline.oninput = (e) => {
      const idx = parseInt(e.target.value, 10) || 0;
      renderFrame(idx);
    };

    // Première frame affichée
    renderFrame(0);
  }

// -------------------------------------------
//  ⏭️ BOUTON "SWING SUIVANT"
// -------------------------------------------
const nextBtn = document.getElementById("swing-review-next");

if (nextBtn) {
  nextBtn.onclick = () => {
    console.log("⏭️ Swing suivant → fermeture review & relance Just Swing");

    // 1) Fermer la review
    const reviewEl = document.getElementById("swing-review");
    if (reviewEl) reviewEl.style.display = "none";

    // 2) Nettoyer l’écran JustSwing
    if (window.JustSwing?.stopSession) {
      JustSwing.stopSession();
    }

    // 3) Relancer une session propre
    setTimeout(() => {
      if (window.JustSwing?.startSession) {
        JustSwing.startSession();
      }
    }, 300);
  };
}


  
  
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

  // ---------------------------------------------------------
  //   EXPORT
  // ---------------------------------------------------------
  return {
    initJustSwing,
    startSession,
    stopSession,
    onPoseFrame,
    _debug: debug
  };
})();

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#jsw-close-review, #jsw-back-btn");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  window.jswGoHome();
});


window.JustSwing = JustSwing;
