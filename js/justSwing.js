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
  //   BOUTON START + COUNTDOWN
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
    `;
    bigMsgEl.style.opacity = 1;

    const btn = document.getElementById("jsw-start-btn");
    if (btn) {
      btn.onclick = startCountdown;
    }
  }

  function startCountdown() {
    if (!bigMsgEl) return;

    state = JSW_STATE.COUNTDOWN;
    updateUI();

    let n = 3;
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

  // ---------------------------------------------------------
  //   ROUTINE GUIDÉE
  // ---------------------------------------------------------
  const routineStepsAuto = [
    "Vérifie grip ✋ posture 🧍‍♂️ alignement 🎯",
    "Fais un swing d’essai 🌀",
    "Respire parfectement… 😮‍💨",
  ];

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
        if (engine && engine.reset) {
          console.log("🔄 RESET ENGINE (clean start)");
          engine.reset();
        }

        // 2️⃣ Passage DIRECT en capture
        state = JSW_STATE.SWING_CAPTURE;
        captureArmed = true;
        isRecordingActive = true;
        frameIndex = 0;

        // 3️⃣ Message joueur
        if (bigMsgEl) {
          bigMsgEl.innerHTML = "Swing ! 🏌️";
          bigMsgEl.style.opacity = 1;

          // le message disparaît après 1s
          setTimeout(() => {
            bigMsgEl.style.opacity = 0;
            bigMsgEl.innerHTML = "";
          }, 1000);
        }

        updateUI();
        console.log("🏌️ Capture ACTIVE (state=SWING_CAPTURE, rec=true)");

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

  // ---------------------------------------------------------
  //   SESSION START / STOP
  // ---------------------------------------------------------
  function startSession(selectedMode = JSW_MODE.SWING) {
    if (!screenEl) initJustSwing();

    mode = selectedMode;
    state = JSW_STATE.WAITING_START;
    captureArmed = false;
    swingIndex = 0;
    lastPose = null;
    lastFullBodyOk = false;

    // Init moteur SwingEngine
if (window.SwingEngine && SwingEngine.create) {
  engine = SwingEngine.create({
    fps: 30,

    onKeyFrame: (evt) => {
      // Debug uniquement
      console.log("🎯 KEYFRAME", evt);
    },

    onSwingComplete: (evt) => {
      console.log("🏁 SWING COMPLETE (via KEYFRAME callback)", evt);
      const swing = evt.data || evt;
      handleSwingComplete(swing);
    },
  });

  console.log("🔧 SwingEngine READY", engine);

} else {
  console.warn("⚠️ SwingEngine non disponible");
}


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

  // ⚠️ Tant qu’on n’est PAS en phase swing → on NE donne rien au moteur
  if (state !== JSW_STATE.SWING_CAPTURE) return;

  // ⚠️ Si capture pas armée → on ignore
  if (!captureArmed) return;

  // ⚠️ Si pas en enregistrement → on ignore
  if (!isRecordingActive) return;

  if (!engine || !landmarks) return;

  const now = performance.now();
  const evt = engine.processPose(landmarks, now, currentClubType);
  frameIndex++;

  if (evt) console.log("🎯 ENGINE EVENT:", evt);

  if (evt && evt.type === "swingComplete") {
    console.log("🏁 swingComplete détecté !");
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

  if (!base || !vTop || !vImp) return 0;

  const dTop = Math.abs(vTop - base) / base;
  const dImp = Math.abs(vImp - base) / base;

  const sTop = jswClamp(1 - dTop / 0.15, 0, 1);
  const sImp = jswClamp(1 - dImp / 0.10, 0, 1);

  return (sTop + sImp) / 2;
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
  const sBack = jswClamp((w.back - 0.05) / 0.30, 0, 1);
  const sFwd  = jswClamp((w.forward - 0.05) / 0.30, 0, 1);
  return (sBack + sFwd) / 2;
}

function scoreTempoRobust(timestamps, kf) {
  if (!timestamps || !kf.address || !kf.top || !kf.impact) return 0;

  const a = kf.address.index;
  const t = kf.top.index;
  const i = kf.impact.index;

  const tA = timestamps[a];
  const tT = timestamps[t];
  const tI = timestamps[i];

  if (!tA || !tT || !tI) return 0;

  const backswing = (tT - tA) / 1000;  // en secondes
  const downswing = (tI - tT) / 1000;

  if (backswing <= 0 || downswing <= 0) return 0;

  const ratio = backswing / downswing;

  // On normalise autour de 3:1 → score de 0 à 1
  return Math.max(0, 1 - Math.abs(ratio - 3) / 2);
}

  

// ---------------------------------------------------------
//   PREMIUM SCORING – utilise les keyFrames du SwingEngine
// ---------------------------------------------------------
function computeSwingScorePremium(swing) {
  const fps = swing.fps || 30;

  const kf = swing.keyFrames || {};

function extractIndex(kf) {
  if (kf == null) return null;
  if (typeof kf === "number") return kf;
  if (typeof kf.index === "number") return kf.index;
  return null;
}

  
  const addressPose = jswSafePoseFromKF(kf.address);
  const topPose     = jswSafePoseFromKF(kf.top);
  const impactPose  = jswSafePoseFromKF(kf.impact);
  const finishPose  = jswSafePoseFromKF(kf.finish);

 

  // On va stocker toutes les métriques brutes ici
  const metrics = {
    posture: {},
    rotation: {},
    triangle: {},
    weightShift: {},
    extension: {},
    tempo: {},
    balance: {}
  };

   const viewType = jswDetectViewType(addressPose);
  metrics.viewType = viewType;
  console.log("👁️ ViewType détecté :", viewType);

  
  // ========= 1) POSTURE (address) =========
  if (addressPose) {
    const LS = addressPose[11];
    const RS = addressPose[12];
    const LH = addressPose[23];
    const RH = addressPose[24];
    const LA = addressPose[27];
    const RA = addressPose[28];

    // "colonne vertébrale" = milieu hanches → milieu épaules
    const hipsMid = (LH && RH) ? { x: (LH.x + RH.x)/2, y:(LH.y + RH.y)/2 } : null;
    const shMid   = (LS && RS) ? { x: (LS.x + RS.x)/2, y:(LS.y + RS.y)/2 } : null;

    let flexionDeg = 35; // fallback
    if (hipsMid && shMid) {
      // vecteur hanches -> épaules
      const vx = shMid.x - hipsMid.x;
      const vy = shMid.y - hipsMid.y;
      const ang = Math.atan2(vy, vx); // rad
      // angle par rapport à la verticale (axe Y)
      const angFromVertical = Math.abs( (ang * 180/Math.PI) - 90 );
      flexionDeg = angFromVertical; // typiquement ~30-45°
    }

    // ratio pieds / épaules
    const feetWidth = jswDist(LA, RA);
    const shoulderWidth = jswDist(LS, RS);
    let feetShoulderRatio = 1.0;
    if (feetWidth && shoulderWidth) {
      feetShoulderRatio = feetWidth / shoulderWidth;
    }

    // différentiel alignement épaules / hanches
    const shoulderAngle = jswLineAngleDeg(LS, RS);
    const hipAngle      = jswLineAngleDeg(LH, RH);
    const alignDiff = jswDegDiff(shoulderAngle, hipAngle) ?? 0;

    metrics.posture.flexionDeg = flexionDeg;
    metrics.posture.feetShoulderRatio = feetShoulderRatio;
    metrics.posture.alignDiff = alignDiff;

    // Scoring posture (target ~35°, ratio ~1.2, diff ~0°)
    const flexScore = jswClamp(1 - Math.abs(flexionDeg - 35)/25, 0, 1);
    const ratioScore = jswClamp(1 - Math.abs(feetShoulderRatio - 1.2)/0.6, 0, 1);
    const alignScore = jswClamp(1 - alignDiff/20, 0, 1);

    metrics.posture.score = Math.round((flexScore + ratioScore + alignScore)/3 * 20);
  } else {
    metrics.posture.score = 14;
  }


  
    // ========= 2) ROTATION (address → top) =========
  
  // ========= 2) ROTATION (address → top) =========
if (addressPose && topPose) {

  const LS0 = addressPose[11], RS0 = addressPose[12];
  const LH0 = addressPose[23], RH0 = addressPose[24];
  const LS1 = topPose[11],     RS1 = topPose[12];
  const LH1 = topPose[23],     RH1 = topPose[24];

  let shoulderRot = 0, hipRot = 0, xFactor = 0;

  if (metrics.viewType === "faceOn") {
    // FACE ON → use width compression
    const shW0 = jswDist(LS0, RS0);
    const shW1 = jswDist(LS1, RS1);
    const hipW0 = jswDist(LH0, RH0);
    const hipW1 = jswDist(LH1, RH1);

    if (shW0 && shW1) {
      const ratioS = jswClamp(shW1 / shW0, 0.1, 1);
      shoulderRot = Math.acos(ratioS) * 180 / Math.PI;
    }

    if (hipW0 && hipW1) {
      const ratioH = jswClamp(hipW1 / hipW0, 0.1, 1);
      hipRot = Math.acos(ratioH) * 180 / Math.PI;
    }

  } else {
    // DTL mode fallback
    const shAng0 = jswLineAngleDeg(LS0, RS0);
    const shAng1 = jswLineAngleDeg(LS1, RS1);
    const hipAng0 = jswLineAngleDeg(LH0, RH0);
    const hipAng1 = jswLineAngleDeg(LH1, RH1);
    shoulderRot = jswDegDiff(shAng0, shAng1) ?? 0;
    hipRot      = jswDegDiff(hipAng0, hipAng1) ?? 0;
  }

  xFactor = shoulderRot - hipRot;

  metrics.rotation.shoulderRot = shoulderRot;
  metrics.rotation.hipRot = hipRot;
  metrics.rotation.xFactor = xFactor;

  // Scoring
  const sScore = jswClamp(1 - Math.abs(shoulderRot - 90)/45, 0, 1);
  const hScore = jswClamp(1 - Math.abs(hipRot - 45)/25, 0, 1);
  const xScore = jswClamp(1 - Math.abs(xFactor - 40)/20, 0, 1);

  metrics.rotation.score = Math.round((sScore + hScore + xScore)/3 * 20);
}



  // ========= 3) TRIANGLE ROBUSTE =========
if (addressPose && topPose && impactPose) {
  const tri = scoreTriangleStable(addressPose, topPose, impactPose);
  metrics.triangle.score = Math.round(tri * 20);

  metrics.triangle.varTopPct =
    computeTriangleStable(topPose) / computeTriangleStable(addressPose) - 1;

  metrics.triangle.varImpactPct =
    computeTriangleStable(impactPose) / computeTriangleStable(addressPose) - 1;
} else {
  metrics.triangle.score = 10;
}


  // ========= 4) WEIGHT SHIFT (hips & pieds) =========
 if (addressPose && topPose && impactPose) {
  const w = computeWeightShift(addressPose, topPose, impactPose);

  metrics.weightShift.shiftBack = w.back;
  metrics.weightShift.shiftFwd  = w.forward;

  const scoreWS = scoreWeightShift(addressPose, topPose, impactPose);
  metrics.weightShift.score = Math.round(scoreWS * 20);
} else {
  metrics.weightShift.score = 10;
}

  // ========= 5) EXTENSION & FINISH =========
  if (impactPose && finishPose) {
    const LS_imp = impactPose[11];
    const LH_imp = impactPose[15];
    const LS_fin = finishPose[11];
    const LH_fin = finishPose[15];
    const headImp = impactPose[0];
    const headFin = finishPose[0];

    const extImpact = jswDist(LS_imp, LH_imp); // bras "tendu"
    const extFinish = jswDist(LS_fin, LH_fin);

    metrics.extension.extImpact = extImpact;
    metrics.extension.extFinish = extFinish;

    // cible : extension "longue" (>= 0.28)
    const extScore = extImpact ? jswClamp((extImpact - 0.18)/0.15, 0, 1) : 0.6;

    // équilibre finish via mouvement tête
    const headMove = (headImp && headFin) ? jswDist(headImp, headFin) : 0.02;
    metrics.extension.headMove = headMove;

    const finishScore = jswClamp(1 - headMove/0.12, 0, 1);

    metrics.extension.score = Math.round((extScore*0.6 + finishScore*0.4) * 10);
  } else {
    metrics.extension.score = 7;
  }

// ========= 6) TEMPO ROBUSTE =========
const addrIndex   = extractIndex(kf.address);
const topIndex    = extractIndex(kf.top);
const impactIndex = extractIndex(kf.impact);

if (addrIndex != null && topIndex != null && impactIndex != null) {

  const backswingFrames = topIndex - addrIndex;
  const downswingFrames = impactIndex - topIndex;

  const backswingT = backswingFrames / fps;
  const downswingT = downswingFrames / fps;

  metrics.tempo.backswingT = backswingT;
  metrics.tempo.downswingT = downswingT;

  const ratio =
    backswingT > 0 && downswingT > 0
      ? backswingT / downswingT
      : 3.0;

  metrics.tempo.ratio = ratio;

  // Score tempo (target 3:1)
  const tempoScore = jswClamp(1 - Math.abs(ratio - 3) / 1.2, 0, 1);
  metrics.tempo.score = Math.round(tempoScore * 10);

} else {
  console.warn("⚠️ TEMPO impossible : keyFrames manquants", kf);
  metrics.tempo.score = 0;
  metrics.tempo.ratio = 0;
  metrics.tempo.backswingT = 0;
  metrics.tempo.downswingT = 0;
}


  // ========= 7) BALANCE =========
  if (finishPose && addressPose) {
    const hipsAddr = (() => {
      const LH = addressPose[23], RH = addressPose[24];
      return (LH && RH) ? { x:(LH.x+RH.x)/2, y:(LH.y+RH.y)/2 } : null;
    })();

    const hipsFin = (() => {
      const LH = finishPose[23], RH = finishPose[24];
      return (LH && RH) ? { x:(LH.x+RH.x)/2, y:(LH.y+RH.y)/2 } : null;
    })();

    const headFin = finishPose[0];

    let headOverHips = true;
    let finishMove = 0;

    if (hipsFin && headFin) {
      const dx = Math.abs(headFin.x - hipsFin.x);
      headOverHips = dx < 0.08;
    }

    if (hipsAddr && hipsFin) {
      finishMove = jswDist(hipsAddr, hipsFin) || 0;
    }

    metrics.balance.headOverHips = headOverHips;
    metrics.balance.finishMove = finishMove;

    const headScore   = headOverHips ? 1 : 0.4;
    const moveScore   = jswClamp(1 - finishMove/0.25, 0, 1);
    metrics.balance.score = Math.round((headScore*0.5 + moveScore*0.5) * 10);

  } else {
    metrics.balance.score = 7;
  }

  // ========= TOTAL =========
  const postureScore   = metrics.posture.score   ?? 0;
  const rotationScore  = metrics.rotation.score  ?? 0;
  const triangleScore  = metrics.triangle.score  ?? 0;
  const weightScore    = metrics.weightShift.score ?? 0;
  const extensionScore = metrics.extension.score ?? 0;
  const tempoScore     = metrics.tempo.score     ?? 0;
  const balanceScore   = metrics.balance.score   ?? 0;

  const total =
    postureScore +
    rotationScore +
    triangleScore +
    weightScore +
    extensionScore +
    tempoScore +
    balanceScore;

  return {
    total: Math.round(total),
    postureScore,
    rotationScore,
    triangleScore,
    weightShiftScore: weightScore,
    extensionScore,
    tempoScore,
    balanceScore,
    metrics
  };
}

// Patch : rendre dist() disponible dans le breakdown premium
function dist(a, b) {
  if (!a || !b) return null;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

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
          Flexion: ${metrics.posture.flexionDeg?.toFixed(1)}°<br>
          Ratio pieds/épaules: ${metrics.posture.feetShoulderRatio?.toFixed(2)}<br>
          Alignement épaules/hanches: ${metrics.posture.alignDiff?.toFixed(1)}°
        `
      )}

      ${block(
        "Rotation",
        rotationScore,
        "Épaules · Hanches · X-Factor",
        `
          Rotation épaules: ${metrics.rotation.shoulderRot?.toFixed(1)}°<br>
          Rotation hanches: ${metrics.rotation.hipRot?.toFixed(1)}°<br>
          X-Factor: ${metrics.rotation.xFactor?.toFixed(1)}°
        `
      )}

      ${block(
        "Triangle bras/épaules",
        triangleScore,
        "Stabilité au top et à l’impact",
        `
          Variation Top: ${metrics.triangle.varTopPct?.toFixed(1)}%<br>
          Variation Impact: ${metrics.triangle.varImpactPct?.toFixed(1)}%
        `
      )}

      ${block(
        "Transfert de poids",
        weightShiftScore,
        "Backswing → Impact",
        `
          Shift Back: ${metrics.weightShift.shiftBack?.toFixed(3)}<br>
          Shift Forward: ${metrics.weightShift.shiftFwd?.toFixed(3)}
        `
      )}

      ${block(
        "Extension & Finish",
        extensionScore,
        "Extension bras + stabilité du finish",
        `
          Extension Impact: ${metrics.extension.extImpact?.toFixed(3)}<br>
          Extension Finish: ${metrics.extension.extFinish?.toFixed(3)}<br>
          Déplacement tête: ${metrics.extension.headMove?.toFixed(3)}
        `
      )}

      ${block(
        "Tempo",
        tempoScore,
        "Backswing / Downswing",
        `
          Backswing: ${metrics.tempo.backswingT?.toFixed(2)}s<br>
          Downswing: ${metrics.tempo.downswingT?.toFixed(2)}s<br>
          Ratio: ${metrics.tempo.ratio?.toFixed(2)}:1
        `
      )}

      ${block(
        "Balance & Équilibre",
        balanceScore,
        "Stabilité tête + hanches au finish",
        `
          Tête sur hanches: ${metrics.balance.headOverHips ? "oui" : "non"}<br>
          Déplacement hanches: ${metrics.balance.finishMove?.toFixed(3)}
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

  captureArmed = false;
  isRecordingActive = false;
  state = JSW_STATE.REVIEW;
  updateUI();

  const scores = computeSwingScorePremium(swing);

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
    _debug: debug,
  };
})();

window.JustSwing = JustSwing;
