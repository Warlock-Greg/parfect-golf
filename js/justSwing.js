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

// --- ADDRESS DETECTION ---
let addressBuffer = [];
let addressLocked = false;

const ADDRESS_FRAMES_REQUIRED = 5;
const ADDRESS_EPSILON = 0.004; // tolérance stabilité


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

  let resultPanelEl, scoreGlobalEl, scoreDetailsEl, coachCommentEl, swingLabelEl;

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
    // --- Swing capture guards ---
  let swingTimeout = null;
  let hasTopDetected = false;
  let hasImpactDetected = false;
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
    swingLabelEl = $$("jsw-swing-label");

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
    console.log("📌 Parfect Reference loaded", json);
  })
  .catch(err => {
    console.warn("⚠️ Parfect reference not loaded", err);
  });


  function resizeOverlay() {
    if (!overlayEl || !videoEl) return;
    overlayEl.width = videoEl.clientWidth || window.innerWidth;
    overlayEl.height = videoEl.clientHeight || window.innerHeight;
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

// ---------------------------------------------------------
//   BOUTON START + CHOIX VUE (Face-On / Mobile FO / DTL)
// ---------------------------------------------------------
function showStartButton() {
  if (!bigMsgEl) return;
  state = JSW_STATE.WAITING_START;
  updateUI();

  bigMsgEl.innerHTML = `
    <button id="jsw-start-btn" style="
      background:#00ff99;
      color:#111;
      border:none;
      border-radius:16px;
      padding:16px 32px;
      font-size:1.4rem;
      font-weight:700;
      cursor:pointer;
      box-shadow:0 8px 20px rgba(0,255,153,0.4);
    ">
      🎬 Démarrer le swing
    </button>
    <button id="jsw-back-btn" style="
    background:#333;
    color:#ccc;
    border:none;
    border-radius:12px;
    padding:10px 24px;
    font-size:1rem;
    cursor:pointer;
  ">
    ← Retour
  </button>
  `;
  bigMsgEl.style.opacity = 1;

  const btn = document.getElementById("jsw-start-btn");
  if (!btn) return;

  const backBtn = document.getElementById("jsw-back-btn");
if (backBtn) {
  backBtn.onclick = () => {
    // Retour accueil propre
    window.JustSwing?.stopSession?.();
    document.body.classList.remove("jsw-fullscreen");

    // Simule clic Home
    document.getElementById("home-btn")?.click();
  };
}


  btn.onclick = () => {
    // 👉 Étape 1 — Choix de la vue caméra
    bigMsgEl.innerHTML = `
      <div style="font-size:1.3rem;margin-bottom:12px;color:#fff;">
        📐 Où est placée la caméra ?
      </div>

      <button id="jsw-view-face" style="
        background:#4ade80; padding:12px 18px;
        font-size:1.1rem; border-radius:10px;
        margin:6px; cursor:pointer; border:none;
      ">📸 Face-On (caméra à hauteur de poitrine)</button>

      <button id="jsw-view-mobile" style="
        background:#22c55e; padding:12px 18px;
        font-size:1.1rem; border-radius:10px;
        margin:6px; cursor:pointer; border:none;
      ">📱 Mobile Face-On (téléphone au sol devant toi)</button>

      <button id="jsw-view-dtl" style="
        background:#60a5fa; padding:12px 18px;
        font-size:1.1rem; border-radius:10px;
        margin:6px; cursor:pointer; border:none;
      ">🎥 Down-The-Line (derrière la ligne de jeu)</button>
    `;

    const setViewAndStart = (view) => {
      window.jswViewType = view;   // 🔑 utilisé dans le scorer
      console.log("📐 Vue sélectionnée :", view);
      startCountdown();
    };

    const btnFace   = document.getElementById("jsw-view-face");
    const btnMobile = document.getElementById("jsw-view-mobile");
    const btnDtl    = document.getElementById("jsw-view-dtl");

    if (btnFace)   btnFace.onclick   = () => setViewAndStart("faceOn");
    if (btnMobile) btnMobile.onclick = () => setViewAndStart("mobileFaceOn");
    if (btnDtl)    btnDtl.onclick    = () => setViewAndStart("dtl");
  };
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

  // clés indispensables
  if (!kf.top || !kf.impact) return false;

  // durée minimale
  if (!swing.frames || swing.frames.length < 25) return false;

  return true;
}

  
  // ---------------------------------------------------------
  //   ROUTINE GUIDÉE
  // ---------------------------------------------------------
  const routineStepsAuto = [
    "Vérifie grip ✋ posture 🧍‍♂️ alignement 🎯",
    "Fais un swing d’essai 🌀",
    "Mode Adresse… 😮‍💨",
  ];


  function showSwingMessage() {
  if (!bigMsgEl) return;

  bigMsgEl.innerHTML = "*SWING ! \n🏌️";
  bigMsgEl.style.opacity = 1;
  bigMsgEl.classList.add("swing-active");
}

  function startRoutineSequence() {
  if (!bigMsgEl) return;

  // Reset des compteurs / flags
  frameIndex = 0;
  captureArmed = false;
  isRecordingActive = false;

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

      // 👉 Fin de routine : on prépare DIRECT le swing
      setTimeout(() => {
        console.log("⏳ Routine terminée → passage en capture directe");

        // 1️⃣ Reset complet du moteur
       // if (engine && engine.reset) {
        //  console.log("🔄 RESET ENGINE (clean start)");
        //  engine.reset();
        //}
        addressBuffer = [];
        addressLocked = false;

        engine.armForSwing();
      
        // 2️⃣ Passage DIRECT en capture
        
        captureArmed = true;
        isRecordingActive = true;
        state = JSW_STATE.SWING_CAPTURE;
        frameIndex = 0;
        console.log("🎯 Swing ARMÉ → prêt pour ADDRESS");
       

        showSwingMessage();
        updateUI();
        console.log("🏌️ Capture ACTIVE (state=SWING_CAPTURE, rec=true)");

        // reset guards
hasTopDetected = false;
hasImpactDetected = false;
swingCompleted = false;
        
        function onKeyFrame(evt) {
        const { type } = evt;

        if (type === "top") hasTopDetected = true;
        if (type === "impact") hasImpactDetected = true;

        console.log("🎯 KEYFRAME", evt);
        }

        
        // ⏱️ TIMEOUT SWING (sécurité UX)
      const SWING_TIMEOUT_MS = 6000;

swingTimeout = setTimeout(() => {
if (!hasTopDetected || !hasImpactDetected) {
    console.warn("⏱️ Swing incomplet — timeout");

    stopRecording(); // ✅ tu l’as déjà

    showBigMessage(
      "😕 Oups… on n’a pas bien capté ton swing<br>Reviens à l’adresse et recommence"
    );
  }
}, SWING_TIMEOUT_MS);

        const CAPTURE_MAX_MS = 7000;

captureTimeout = setTimeout(() => {
  if (!swingCompleted) {
    stopRecording();

    showBigMessage("😕 Oups… swing non détecté.\nRecommence.");

    console.warn("⏱️ Swing incomplet — timeout");
  }
}, CAPTURE_MAX_MS);


        
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
    },

    onSwingComplete: (evt) => {
    
      console.log("🏁 SWING COMPLETE", evt);

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


  
  // ---------------------------------------------------------
  //   SESSION START / STOP
  // ---------------------------------------------------------
  function startSession(selectedMode = JSW_MODE.SWING) {
// 🔒 Garde licence — POINT D’ENTRÉE UNIQUE
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


  // ---------------------------------------------------------
  //   MEDIAPIPE CALLBACK
  // ---------------------------------------------------------
function onPoseFrame(landmarks) {

 
  lastPose = landmarks || null;
  lastFullBodyOk = detectFullBody(landmarks);

  if (!engine || !landmarks) return;
  if (state !== JSW_STATE.SWING_CAPTURE) return;

  // ----------------------------
  // ADDRESS DETECTION (NON BLOQUANTE)
  // ----------------------------
  if (!addressLocked) {
    if (addressBuffer.length === 0) {
      addressBuffer.push(landmarks);
    } else {
      const dist = jswPoseDistance(
        addressBuffer[addressBuffer.length - 1],
        landmarks
      );

      if (dist < ADDRESS_EPSILON) {
        addressBuffer.push(landmarks);
      } else {
        addressBuffer = [landmarks];
      }
    }

    if (addressBuffer.length >= ADDRESS_FRAMES_REQUIRED) {
      addressLocked = true;

      if (engine.keyFrames) {
        engine.keyFrames.address = {
          index: engine.frames.length,
          pose: landmarks
        };
        console.log("🔒 ADDRESS LOCKED");
      }
    }
  }

  // ----------------------------
  // TOUJOURS envoyer les frames au moteur
  // ----------------------------
  const now = performance.now();
  const evt = engine.processPose(landmarks, now, currentClubType);

  if (evt) console.log("🎯 ENGINE EVENT:", evt);

  // ⛔ On ignore le swing tant que l’adresse n’est pas lockée
  if (!addressLocked) return;

  if (evt && evt.type === "swingComplete") {
    isRecordingActive = false;
    captureArmed = false;
    handleSwingComplete(evt.data);
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

  
// ---------------------------------------------------------
//   DÉTECTION VUE CAMERA : FACE-ON vs DOWN-THE-LINE
// ---------------------------------------------------------
function jswDetectViewType(pose) {
  if (!pose) return "unknown";
  const LS = pose[11];
  const RS = pose[12];
  const LH = pose[23];
  const RH = pose[24];
  if (!LS || !RS || !LH || !RH) return "unknown";

  const shoulderWidth = jswDist(LS, RS); // distance normalisée 0..1
  const hipWidth      = jswDist(LH, RH);

  const avgWidth = (shoulderWidth + hipWidth) / 2;

  // Heuristique simple :
  //  - Face-on : on voit toute la largeur → > 0.18
  //  - DTL : largeur projetée faible      → < 0.12
  if (avgWidth > 0.18) return "faceOn";
  if (avgWidth < 0.12) return "downTheLine";

  return "unknown";
}


  function safePoseFromKF(frames, kfEntry) {
  if (!kfEntry) return null;
  const idx = (typeof kfEntry === "number") ? kfEntry :
              (typeof kfEntry.index === "number") ? kfEntry.index : null;
  if (idx == null) return null;
  const pose = frames[idx];
  return Array.isArray(pose) ? pose : null;
}

function scoreOne(value, target, tol) {
  if (value == null || target == null || tol == null || tol <= 0) return 0;

  const diff = Math.abs(value - target);

  // 0 uniquement si le mouvement est quasi inexistant
  if (diff < 1.0) return 0;

  const x = diff / tol;

  const k = 0.55; // 🎯 calibré pour que 6° → 6/20 dans ton cas

  const s = Math.exp(-k * x);

  return Math.max(0, Math.min(1, s));
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

function computeRotationSignature(basePose, topPose, viewType = "faceOn") {
  if (!basePose || !topPose) return null;

  const LS0 = basePose[11], RS0 = basePose[12];
  const LH0 = basePose[23], RH0 = basePose[24];

  const LS1 = topPose[11],  RS1 = topPose[12];
  const LH1 = topPose[23],  RH1 = topPose[24];

  if (
    !LS0 || !RS0 || !LH0 || !RH0 ||
    !LS1 || !RS1 || !LH1 || !RH1
  ) {
    return null;
  }

  // --------------------------------------------------
  // 🎥 DTL → rotation angulaire réelle
  // --------------------------------------------------
  if (viewType === "dtl") {
    const sh0 = jswLineAngleDeg(LS0, RS0);
    const sh1 = jswLineAngleDeg(LS1, RS1);
    const hip0 = jswLineAngleDeg(LH0, RH0);
    const hip1 = jswLineAngleDeg(LH1, RH1);

    if (
      sh0 == null || sh1 == null ||
      hip0 == null || hip1 == null
    ) return null;

    const shoulder = jswDegDiff(sh1, sh0);
    const hip      = jswDegDiff(hip1, hip0);
    const xFactor  = shoulder - hip;

    return { shoulder, hip, xFactor };
  }

  // =====================================================
  // 📱 Face-On / Mobile — rotation par PROJECTION
  // -----------------------------------------------------
  // Quand le joueur tourne :
  //  → la largeur apparente épaules / hanches diminue
  //  → on transforme cette perte en degrés équivalents
  // =====================================================

  const shoulderW0 = Math.abs(LS0.x - RS0.x);
  const shoulderW1 = Math.abs(LS1.x - RS1.x);
  const hipW0 = Math.abs(LH0.x - RH0.x);
  const hipW1 = Math.abs(LH1.x - RH1.x);

  // Sécurité anti-bruit / hors cadre
  if (
    shoulderW0 < 0.05 ||
    hipW0 < 0.05
  ) return null;

  // 🔑 Coefficients calibrés Parfect
  // (cohérents avec tes références actuelles)
  const SHOULDER_SCALE = 30; // ≈ rotation max épaules visible Face-On
  const HIP_SCALE      = 20; // ≈ rotation max hanches visible Face-On

  const shoulder =
    (1 - shoulderW1 / shoulderW0) * SHOULDER_SCALE;

  const hip =
    (1 - hipW1 / hipW0) * HIP_SCALE;

  const xFactor = shoulder - hip;

  return {
    shoulder: Math.max(0, shoulder),
    hip: Math.max(0, hip),
    xFactor
  };
}


function scoreRotationFromReference(measure, ref) {
  if (!measure || !ref) return { score: 0 };

  const s = scoreOne(measure.shoulder, ref.shoulder.target, ref.shoulder.tol);
  const h = scoreOne(measure.hip,      ref.hip.target,      ref.hip.tol);
  const x = scoreOne(measure.xFactor,  ref.xFactor.target,  ref.xFactor.tol);

  const norm = s * 0.4 + h * 0.4 + x * 0.2;

  return {
    score: Math.round(norm * 20),
    details: { s, h, x }
  };
}



  function LM(pose, idx) {
  if (!pose || !Array.isArray(pose)) return null;
  return pose[idx] ?? null;
}


// ---------------------------------------------------------
//   PREMIUM SCORING – utilise les keyFrames du SwingEngine
//   Gère les vues : faceOn / mobileFaceOn / dtl
// ---------------------------------------------------------

  
  function computeSwingScorePremium(swing) {
  //const PARFECT_REF = window.parfectReference?.rotation;
  let postureScore = 0;   // valeur neutre, informative
    
  const fps    = swing.fps || 30;
  const frames = swing.frames || [];
  const kf     = swing.keyFrames || {};
  const T = swing.timestamps || [];

  

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

  function safePose(pose) {
  return Array.isArray(pose) ? pose : null;
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

    metrics.posture.score = Math.round((flexScore + ratioScore + alignScore)/3 * 20);
  } else {
    metrics.posture.score = 10;
  }
postureScore = metrics.posture.score;


const rotBasePose = backswingPose || topPose; // ✅ fallback

    
// =====================================================
// ROTATION — carte premium (Base → Top) COMPARÉE À RÉFÉRENCE
// =====================================================

let rotationScore = 10;
let rotationMeasure = null;
let refRotation = window.REF?.rotation || null;

metrics.rotation = {
  refKey: window.REF_META?.key || null,
  view: window.jswViewType || "unknown",
  stages: {}
};

const basePose =
  jswSafePoseFromKF(kf.backswing) ||
  jswSafePoseFromKF(kf.address) ||
  null;

const topPoseSafe = jswSafePoseFromKF(kf.top);

if (basePose && topPoseSafe) {

  rotationMeasure = computeRotationSignature(basePose, topPoseSafe, viewType);

  if (rotationMeasure && refRotation) {

    const scored = scoreRotationFromReference(rotationMeasure, refRotation);
    rotationScore = scored.score;

    metrics.rotation.stages.baseToTop = {
      actual: {
        shoulder: rotationMeasure.shoulder,
        hip: rotationMeasure.hip,
        xFactor: rotationMeasure.xFactor
      },
      target: {
        shoulder: refRotation.shoulder.target,
        hip: refRotation.hip.target,
        xFactor: refRotation.xFactor.target
      },
      tol: {
        shoulder: refRotation.shoulder.tol,
        hip: refRotation.hip.tol,
        xFactor: refRotation.xFactor.tol
      },
      score: rotationScore
    };

  // =================================================
  // ✅ AJOUT OBLIGATOIRE POUR L’UI (SIMPLE / PLAT)
  // =================================================
  metrics.rotation.measure = {
    shoulder: rotationMeasure.shoulder,
    hip: rotationMeasure.hip,
    xFactor: rotationMeasure.xFactor
  };

  metrics.rotation.ref = {
    shoulder: refRotation.shoulder,
    hip: refRotation.hip,
    xFactor: refRotation.xFactor
  };

  metrics.rotation.score = rotationScore;
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
let weightScore = 10;

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

      weightScore = Math.round((backScore * 0.4 + fwdScore * 0.6) * 20);
    }
  }
}

metrics.weightShift.score = weightScore;


// =====================================================
// 5) FINISH — équilibre + extension (robuste)
// =====================================================
let extensionScore = 10;

if (impactPose && finishPose) {
  const headImp = LM(impactPose, 0);
  const headFin = LM(finishPose, 0);

  const LHf = LM(finishPose, 23), RHf = LM(finishPose, 24);
  const LSf = LM(finishPose, 11), RSf = LM(finishPose, 12);
  const LWf = LM(finishPose, 15);

  if (headImp && headFin && LHf && RHf && LSf && RSf && LWf) {
    const hipsFin = { x:(LHf.x + RHf.x)/2, y:(LHf.y + RHf.y)/2 };

    const shoulderWidth = jswDist(LSf, RSf) || 0.25;

    const rawHeadMove = jswDist(headImp, headFin);
  const headMove =
  rawHeadMove != null
    ? rawHeadMove / shoulderWidth
    : 0;

    const headOverHips = Math.abs(headFin.x - hipsFin.x) / shoulderWidth;
    const armExtension = jswDist(LSf, LWf);
    

    metrics.extension.headMove = headMove;
    metrics.extension.headOverHips = headOverHips;
    metrics.extension.armExtension = armExtension;
    metrics.extension.extImpact = armExtension;
    metrics.extension.extFinish = armExtension;


    const REF = window.REF?.extension || window.ParfectReference?.extension || null;

    let moveScore = 0.6;
    let alignScore = 0.6;
    let extScore = 0.6;

    if (REF?.balance && REF?.finish) {
      moveScore = jswClamp(
        1 - Math.abs(headMove - REF.balance.target) / REF.balance.tol,
        0, 1
      );
      alignScore = jswClamp(1 - headOverHips / 0.25, 0, 1);
      extScore = jswClamp(
        1 - Math.abs(armExtension - REF.finish.target) / REF.finish.tol,
        0, 1
      );
    } else {
      // fallback raisonnable
      moveScore  = jswClamp(1 - headMove / 0.25, 0, 1);
      alignScore = jswClamp(1 - headOverHips / 0.30, 0, 1);
      extScore   = jswClamp(armExtension / 0.35, 0, 1);
    }

    const finishNorm = moveScore * 0.4 + alignScore * 0.4 + extScore * 0.2;
    extensionScore = Math.round(finishNorm * 20);
  }
}

metrics.extension.score = extensionScore;


// =====================================================
// 6) TEMPO — robuste + fallback si address manque
// =====================================================
let tempoScore = 10;

const iTop    = kf.top?.index;
const iImpact = kf.impact?.index;

// fallback address : address → backswing → 0
const iAddr =
  (kf.address?.index != null ? kf.address.index :
   kf.backswing?.index != null ? kf.backswing.index :
   0);

if (
  typeof iAddr === "number" &&
  typeof iTop === "number" &&
  typeof iImpact === "number" &&
  T.length > Math.max(iAddr, iTop, iImpact)
) {
  const tAddr   = T[iAddr];
  const tTop    = T[iTop];
  const tImpact = T[iImpact];

  if (
    typeof tAddr === "number" &&
    typeof tTop === "number" &&
    typeof tImpact === "number" &&
    tTop > tAddr &&
    tImpact > tTop
  ) {
    const backswingT = (tTop - tAddr) / 1000;
    const downswingT = (tImpact - tTop) / 1000;
    const ratio = downswingT > 0 ? backswingT / downswingT : null;

    metrics.tempo.backswingT = backswingT;
    metrics.tempo.downswingT = downswingT;
    metrics.tempo.ratio = ratio;

    const REF = window.REF?.tempo || window.ParfectReference?.tempo || null;

    if (REF?.ratio && ratio != null) {
      tempoScore = Math.round(
        jswClamp(1 - Math.abs(ratio - REF.ratio.target) / REF.ratio.tol, 0, 1) * 20
      );
    } else {
      tempoScore = Math.round(jswClamp(1 - Math.abs((ratio ?? 3) - 3) / 2, 0, 1) * 20);
    }
  }
}

metrics.tempo.score = tempoScore;


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
// 8) TOTAL
// =====================================================
const total =
  rotationScore +
  triangleScore +
  weightScore +
  extensionScore +
  tempoScore +
  balanceScore;

return {
  total: Math.round(total),
  totalDynamic: Math.round(total),
  rotationScore,
  triangleScore,
  weightShiftScore: weightScore,
  extensionScore,
  tempoScore,
  balanceScore,
  metrics
};

};





  function jswDumpLandmarksJSON(swing) {
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


// ---------------------------------------------------------
//   PREMIUM BREAKDOWN BUILDER (utilise scores.metrics)
// ---------------------------------------------------------
function buildPremiumBreakdown(swing, scores) {
  const fmt = (v) =>
    typeof v === "number" && !isNaN(v) ? v.toFixed(1) : "—";
  const el = document.getElementById("swing-score-breakdown");
  if (!el) return console.warn("No breakdown element found.");

  const {
    postureScore,
    rotationScore,
    triangleScore,
    weightShiftScore,
    extensionScore,
    tempoScore,
    balanceScore,
    total,
    metrics
  } = scores;

  el.style.display = "block";

  // --- 1) Helper rendering ---
  const block = (title, score, subtitle, detailsHtml = "") => `
    <div style="
      padding: 1rem;
      border-radius: 12px;
      background: rgba(255,255,255,0.05);
      margin-bottom: 1rem;
      border-left: 4px solid ${scoreColor(score)};
    ">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; font-size:1.2rem; color:#fff;">${title}</h3>
        <div style="font-size:1.4rem; color:${scoreColor(score)}; font-weight:700;">
          ${score}/20
        </div>
      </div>

      <p style="margin:0.3rem 0; color:#aaa">${subtitle}</p>

      <div style="
        margin-top:0.5rem;
        padding:0.6rem 0.8rem;
        background:rgba(255,255,255,0.04);
        border-radius:10px;
        color:#ccc;
        font-size:0.9rem;
        line-height:1.35;
      ">
        ${detailsHtml}
      </div>
    </div>
  `;

  // --- 2) Color coding ---
  function scoreColor(s) {
    if (s >= 15) return "#4ade80"; // vert
    if (s >= 8) return "#facc15";  // jaune
    return "#f87171";              // rouge
  }

  // ---------------- ROTATION DETAILS (SAFE) ----------------
const r = metrics.rotation || {};
const m = r.measure || {};
const ref = r.ref || {};

const rotationDetails = `
  <div style="opacity:.85; margin-bottom:12px;">
    <b>Référence :</b> ${window.REF_META?.club || "—"}
    · ${window.REF_META?.view || "—"}
  </div>

  <div style="
    display:grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap:12px;
    text-align:center;
  ">
    <div>
      <b>Épaules</b><br>
      🎯 ${fmt(ref.shoulder?.target)}° ±${fmt(ref.shoulder?.tol)}°<br>
      ✅ ${fmt(m.shoulder)}°
    </div>

    <div>
      <b>Hanches</b><br>
      🎯 ${fmt(ref.hip?.target)}° ±${fmt(ref.hip?.tol)}°<br>
      ✅ ${fmt(m.hip)}°
    </div>

    <div>
      <b>X-Factor</b><br>
      🎯 ${fmt(ref.xFactor?.target)}° ±${fmt(ref.xFactor?.tol)}°<br>
      ✅ ${fmt(m.xFactor)}°
    </div>
  </div>

  <div style="margin-top:12px; opacity:.7; font-size:0.85rem;">
    Étape analysée : <b>Base → Top</b><br>
    Le score mesure ta capacité à reproduire
    la rotation du swing de référence.
  </div>
`;



  // --- 3) Build the full premium card ---
  el.innerHTML = `
    <div style="padding:1.5rem;">

      <!-- SCORE GLOBAL -->
      <div style="text-align:center; margin-bottom:2rem;">
        <h2 style="font-size:2.5rem; margin:0; color:#4ade80; font-weight:800;">
          ${total}/100
        </h2>
        <p style="margin:0; color:#aaa; font-size:1rem;">
          Score Parfect Premium
        </p>
      </div>

      ${block(
        "Posture à l’adresse",
        postureScore,
        "Alignement · Écart de pieds · Flexion",
        `
          Flexion: ${metrics.posture.flexionDeg?.toFixed(1)}°  
  <span style="opacity:.7;">(cible 30–45°)</span><br>
  Ratio pieds/épaules: ${metrics.posture.feetShoulderRatio?.toFixed(2)}  
  <span style="opacity:.7;">(cible 1.1–1.3)</span><br>
  Alignement épaules/hanches: ${metrics.posture.alignDiff?.toFixed(1)}°  
  <span style="opacity:.7;">(cible ≤ 5°)</span>
      `
      )}

     ${block(
  "Rotation",
  rotationScore,
  "Épaules · Hanches · X-Factor (Base → Top)",
  rotationDetails
)}



      ${block(
        "Triangle bras/épaules",
        triangleScore,
        "Stabilité au top et à l’impact",
        `
         Variation Top: ${metrics.triangle.varTopPct?.toFixed(1)}%  
  <span style="opacity:.7;">(cible ≤ 5%)</span><br>
  Variation Impact: ${metrics.triangle.varImpactPct?.toFixed(1)}%  
  <span style="opacity:.7;">(cible ≤ 5%)</span>
        `
      )}

      ${block(
        "Transfert de poids",
        weightShiftScore,
        "Backswing → Impact",
        `
          Shift Back: ${metrics.weightShift.shiftBack?.toFixed(3)}  
  <span style="opacity:.7;">(cible ≥ 0.10)</span><br>
  Shift Forward: ${metrics.weightShift.shiftFwd?.toFixed(3)}  
  <span style="opacity:.7;">(cible ≥ 0.10)</span>
        `
      )}

      ${block(
        "Extension & Finish",
        extensionScore,
        "Extension bras + stabilité du finish",
        `
          Extension Impact: ${metrics.extension.extImpact?.toFixed(3)}  
  <span style="opacity:.7;">(cible ≥ 0.28)</span><br>
  Extension Finish: ${metrics.extension.extFinish?.toFixed(3)}  
  <span style="opacity:.7;">(cible ≥ 0.30)</span><br>
  Déplacement tête: ${metrics.extension.headMove?.toFixed(3)}  
  <span style="opacity:.7;">(cible ≤ 0.04)</span>
        `
      )}

      ${block(
        "Tempo",
        tempoScore,
        "Backswing / Downswing",
        `
          Backswing: ${metrics.tempo.backswingT?.toFixed(2)}s  
  <span style="opacity:.7;">(typique 0.7–1.1s)</span><br>
  Downswing: ${metrics.tempo.downswingT?.toFixed(2)}s  
  <span style="opacity:.7;">(typique 0.18–0.30s)</span><br>
  Ratio: ${metrics.tempo.ratio?.toFixed(2)}:1  
  <span style="opacity:.7;">(cible 3:1)</span>
        `
      )}

      ${block(
        "Balance & Équilibre",
        balanceScore,
        "Stabilité tête + hanches au finish",
        `
         Tête sur hanches: ${metrics.balance.headOverHips ? "oui" : "non"}  
  <span style="opacity:.7;">(cible = OUI)</span><br>
  Déplacement hanches: ${metrics.balance.finishMove?.toFixed(3)}  
  <span style="opacity:.7;">(cible ≤ 0.12)</span>
        `
      )}

    </div>
  `;
}



function activateRecording() {
  console.warn("⚠️ activateRecording() temporairement désactivé (mode DEBUG).");
}

  
  // ---------------------------------------------------------
  //   SWING COMPLETE → SCORE + UI
  // ---------------------------------------------------------
function handleSwingComplete(swing) {
  console.log("🏁 handle SWING COMPLETE", swing);

  if (!isValidSwing(swing) || !hasRealMotion(swing)) {
    console.warn("❌ Faux swing détecté — aucun mouvement réel");

    stopRecording();

    showBigMessage("😕 Oups… aucun swing détecté.\nRecommence calmement.");

    return; // ⛔ PAS DE SCORE
  }

  // ✅ swing valide → scoring normal
 
  captureArmed = false;
  isRecordingActive = false;
  state = JSW_STATE.REVIEW;
  updateUI();

   // 🔑 Sélection de la référence active pour CE swing
  window.REF = getActiveReference({
  club: swing.club || currentClubType,
  view: window.jswViewType || "faceOn"
  });

  window.REF_META = {
  club: swing.club || currentClubType,
  view: window.jswViewType || "faceOn",
  key: `${swing.club || currentClubType}_${window.jswViewType || "faceOn"}`
};


console.log("🎯 Active Parfect Reference :", window.REF);


  const scores = computeSwingScorePremium(swing);
  buildPremiumBreakdown(swing, scores);

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

      timeline.value = idx;

      const fps = lastSwing.fps || 30;
      const t = (idx / fps).toFixed(2);
      const total = (lastSwing.frames.length / fps).toFixed(2);
      timeLabel.textContent = `${t}s / ${total}s`;
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

window.JustSwing = JustSwing;
