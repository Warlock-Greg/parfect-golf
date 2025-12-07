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
    "J’attends que tu te mettes en plain-pied 👣",
    "Vérifie ton grip ✋",
    "Vérifie ta posture 🧍‍♂️",
    "Vérifie ton alignement 🎯",
    "Fais un swing d’essai 🌀",
    "Respire parfectement… 😮‍💨",
    "3-2-1... Parfect swing",
  ];

  function startRoutineSequence() {
  if (!bigMsgEl) return;

  frameIndex = 0;
  captureArmed = false;
  isRecordingActive = false;

  state = JSW_STATE.ROUTINE;
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

      setTimeout(() => {
        console.log("⏳ Routine terminée → préparation swing…");

        // 1️⃣ Reset complet du moteur
        if (engine && engine.reset) {
          console.log("🔄 RESET ENGINE (clean start)");
          engine.reset();
        }

        // 2️⃣ Passage en ADDRESS_READY & capture armée
        state = JSW_STATE.ADDRESS_READY;
        captureArmed = true;
        isRecordingActive = true;   // 🟢 ENREGISTREMENT PERMANENT

        frameIndex = 0;

        // 3️⃣ Message joueur
        bigMsgEl.innerHTML = "Place-toi en adresse puis swing ! 🏌️";
        bigMsgEl.style.opacity = 1;

        updateUI();

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
          // Dès qu’on a un vrai mouvement → on passe en SWING_CAPTURE
          if (captureArmed && state === JSW_STATE.ADDRESS_READY) {
            state = JSW_STATE.SWING_CAPTURE;
            updateUI();
          }
          // console.log("🎯 KEYFRAME", evt);
        },
        onSwingComplete: (evt) => {
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
  //   MEDIAPIPE CALLBACK
  // ---------------------------------------------------------
  function onPoseFrame(landmarks) {
  lastPose = landmarks || null;
  lastFullBodyOk = detectFullBody(landmarks);

  if (!engine) return;
  //if (!isRecordingActive) return;
  if (!landmarks) return;

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
//   PREMIUM SCORING – utilise les keyFrames du SwingEngine
// ---------------------------------------------------------
function computeSwingScorePremium(swing) {
  const fps = swing.fps || 30;

  const kf = swing.keyFrames || {};
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
  if (addressPose && topPose) {
    const LS0 = addressPose[11];
    const RS0 = addressPose[12];
    const LH0 = addressPose[23];
    const RH0 = addressPose[24];

    const LS1 = topPose[11];
    const RS1 = topPose[12];
    const LH1 = topPose[23];
    const RH1 = topPose[24];

    const shAng0 = jswLineAngleDeg(LS0, RS0);
    const shAng1 = jswLineAngleDeg(LS1, RS1);
    const hipAng0 = jswLineAngleDeg(LH0, RH0);
    const hipAng1 = jswLineAngleDeg(LH1, RH1);

    const shoulderRot = jswDegDiff(shAng0, shAng1) ?? 0;
    const hipRot      = jswDegDiff(hipAng0, hipAng1) ?? 0;
    const xFactor     = shoulderRot - hipRot;

    metrics.rotation.shoulderRot = shoulderRot;
    metrics.rotation.hipRot = hipRot;
    metrics.rotation.xFactor = xFactor;

    // Cibles : épaules ~80-100°, hanches ~35-55°, xFactor ~30-50
    const sScore = jswClamp(1 - Math.abs(shoulderRot - 90)/40, 0, 1);
    const hScore = jswClamp(1 - Math.abs(hipRot - 45)/25, 0, 1);
    const xScore = jswClamp(1 - Math.abs(xFactor - 40)/25, 0, 1);

    metrics.rotation.score = Math.round((sScore + hScore + xScore)/3 * 20);
  } else {
    metrics.rotation.score = 14;
  }

  // ========= 3) TRIANGLE (address / top / impact) =========
  if (addressPose && topPose && impactPose) {
    const LS0 = addressPose[11];
    const LH0 = addressPose[15]; // main gauche (pour droitier)
    const LS1 = topPose[11];
    const LH1 = topPose[15];
    const LS2 = impactPose[11];
    const LH2 = impactPose[15];

    const d0 = jswDist(LS0, LH0);
    const d1 = jswDist(LS1, LH1);
    const d2 = jswDist(LS2, LH2);

    const varTop = (d0 && d1) ? Math.abs(d1 - d0)/d0*100 : 0;
    const varImp = (d0 && d2) ? Math.abs(d2 - d0)/d0*100 : 0;

    metrics.triangle.dAddress = d0;
    metrics.triangle.dTop = d1;
    metrics.triangle.dImpact = d2;
    metrics.triangle.varTopPct = varTop;
    metrics.triangle.varImpactPct = varImp;

    // Cible : < 5% de variation
    const scoreTop = jswClamp(1 - varTop/15, 0, 1);
    const scoreImp = jswClamp(1 - varImp/10, 0, 1);
    metrics.triangle.score = Math.round((scoreTop + scoreImp)/2 * 15);
  } else {
    metrics.triangle.score = 10;
  }

  // ========= 4) WEIGHT SHIFT (hips & pieds) =========
  if (addressPose && topPose && impactPose) {
    const LH0 = addressPose[23], RH0 = addressPose[24];
    const LH1 = topPose[23],     RH1 = topPose[24];
    const LH2 = impactPose[23],  RH2 = impactPose[24];
    const LA0 = addressPose[27], RA0 = addressPose[28];

    const hips0 = (LH0 && RH0) ? { x:(LH0.x+RH0.x)/2, y:(LH0.y+RH0.y)/2 } : null;
    const hips1 = (LH1 && RH1) ? { x:(LH1.x+RH1.x)/2, y:(LH1.y+RH1.y)/2 } : null;
    const hips2 = (LH2 && RH2) ? { x:(LH2.x+RH2.x)/2, y:(LH2.y+RH2.y)/2 } : null;
    const feet0 = (LA0 && RA0) ? { x:(LA0.x+RA0.x)/2, y:(LA0.y+RA0.y)/2 } : null;

    let shiftBack = 0, shiftFwd = 0;
    if (hips0 && hips1 && feet0) {
      shiftBack = hips1.x - hips0.x; // + vers la droite (pied arrière pour droitier si caméra face-on)
    }
    if (hips0 && hips2 && feet0) {
      shiftFwd = hips0.x - hips2.x; // décalage vers la cible (gauche sur face-on droitier)
    }

    metrics.weightShift.shiftBack = shiftBack;
    metrics.weightShift.shiftFwd = shiftFwd;

    // On veut "beaucoup" vers pied arrière au top, puis vers pied avant à l'impact
    const backScore = jswClamp((Math.abs(shiftBack) - 0.02)/0.15, 0, 1);
    const fwdScore  = jswClamp((Math.abs(shiftFwd) - 0.02)/0.15, 0, 1);

    metrics.weightShift.score = Math.round((backScore + fwdScore)/2 * 15);
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

  // ========= 6) TEMPO =========
  const addrIndex   = kf.address?.index ?? 0;
  const topIndex    = kf.top?.index     ?? null;
  const impactIndex = kf.impact?.index  ?? null;

  if (topIndex != null && impactIndex != null) {
    const backswingFrames = topIndex - addrIndex;
    const downswingFrames = impactIndex - topIndex;

    const backswingT = backswingFrames / fps;
    const downswingT = downswingFrames / fps;
    const ratio = backswingT > 0 && downswingT > 0 ? backswingT / downswingT : 3.0;

    metrics.tempo.backswingT = backswingT;
    metrics.tempo.downswingT = downswingT;
    metrics.tempo.ratio = ratio;

    // cible ratio ~3:1
    const tempoScore = jswClamp(1 - Math.abs(ratio - 3)/1.2, 0, 1);
    metrics.tempo.score = Math.round(tempoScore * 10);
  } else {
    metrics.tempo.score = 7;
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


// ---------------------------------------------------------
//   PREMIUM BREAKDOWN BUILDER (utilise scores.metrics)
// ---------------------------------------------------------
function buildPremiumBreakdown(swing, scores) {
  const el = document.getElementById("swing-score-breakdown");
  if (!el || !swing) return;

  const frames     = swing.frames || [];
  const KF         = swing.keyFrames || {};
  const timestamps = swing.timestamps || [];

  if (!frames.length) return;

  const addr = frames[KF.address]   || frames[0];
  const top  = frames[KF.top]       || addr;
  const imp  = frames[KF.impact]    || frames[frames.length - 1];
  const fin  = frames[KF.finish]    || frames[frames.length - 1];

  // --- helpers safe ---
  const safeDeg = (v) => (v == null || isNaN(v) ? "--" : v.toFixed(1));
  const safeNum = (v, d = 2) => (v == null || isNaN(v) ? "--" : v.toFixed(d));

  function angleLine(pA, pB) {
    if (!pA || !pB) return null;
    return Math.atan2(pB.y - pA.y, pB.x - pA.x) * 180 / Math.PI;
  }

  function get(pose, idx) {
    return pose && pose[idx] ? pose[idx] : null;
  }

  // =========== POSTURE (ADDRESS) ===========
  const a_Ls = get(addr, 11), a_Rs = get(addr, 12);
  const a_Lh = get(addr, 23), a_Rh = get(addr, 24);
  const a_Lf = get(addr, 27), a_Rf = get(addr, 28);

  let flexDeg   = null;
  let feetShoulderRatio = null;
  let diffAlign = null;

  if (a_Ls && a_Rs && a_Lh && a_Rh && a_Lf && a_Rf) {
    const shouldersMid = { x: (a_Ls.x + a_Rs.x)/2, y: (a_Ls.y + a_Rs.y)/2 };
    const hipsMid      = { x: (a_Lh.x + a_Rh.x)/2, y: (a_Lh.y + a_Rh.y)/2 };

    const vec = { x: shouldersMid.x - hipsMid.x, y: shouldersMid.y - hipsMid.y };
    // angle vs vertical (caméra 2D, approximation)
    flexDeg = Math.abs(Math.atan2(vec.y, vec.x) * 180 / Math.PI - 90);

    const feetDist     = dist(a_Lf, a_Rf);
    const shouldersDist= dist(a_Ls, a_Rs);
    if (feetDist && shouldersDist && shouldersDist < 900) {
      feetShoulderRatio = feetDist / shouldersDist;
    }

    const shAngle = angleLine(a_Ls, a_Rs);
    const hipAngle= angleLine(a_Lh, a_Rh);
    if (shAngle != null && hipAngle != null) {
      diffAlign = Math.abs(shAngle - hipAngle);
    }
  }

  // Score posture = on mappe addressAlign sur /20
  const postureScore = scores && scores.addressA != null
    ? Math.round(scores.addressA * 20)
    : 0;

  // =========== ROTATION ===========
  const t_Ls = get(top, 11), t_Rs = get(top, 12);
  const t_Lh = get(top, 23), t_Rh = get(top, 24);

  let rotShoulders = null;
  let rotHips      = null;
  let xFactor      = null;

  if (a_Ls && a_Rs && t_Ls && t_Rs && a_Lh && a_Rh && t_Lh && t_Rh) {
    const addrShAngle = angleLine(a_Ls, a_Rs);
    const topShAngle  = angleLine(t_Ls, t_Rs);
    const addrHipAngle= angleLine(a_Lh, a_Rh);
    const topHipAngle = angleLine(t_Lh, t_Rh);

    if (addrShAngle != null && topShAngle != null) {
      rotShoulders = topShAngle - addrShAngle;
    }
    if (addrHipAngle != null && topHipAngle != null) {
      rotHips = topHipAngle - addrHipAngle;
    }
    if (rotShoulders != null && rotHips != null) {
      xFactor = rotShoulders - rotHips;
    }
  }

  const rotationScore = scores && scores.rotation != null
    ? Math.round(scores.rotation * 20)
    : 0;

  // =========== TRIANGLE ===========
  function computeTriangleMetrics(pose) {
    const Ls2 = get(pose, 11), Rs2 = get(pose, 12);
    const Lh2 = get(pose, 15), Rh2 = get(pose, 16);
    if (!Ls2 || !Rs2 || !Lh2 || !Rh2) return null;

    const shoulderWidth = dist(Ls2, Rs2);
    const mid = { x: (Ls2.x + Rs2.x)/2, y: (Ls2.y + Rs2.y)/2 };
    const dL = dist(Lh2, mid);
    const dR = dist(Rh2, mid);

    const shoulderAngle = angleLine(Ls2, Rs2);
    const handAngle     = angleLine(Lh2, Rh2);
    const angleDelta    = (shoulderAngle != null && handAngle != null)
      ? Math.abs(shoulderAngle - handAngle)
      : null;

    return {
      shoulderWidth,
      distL: dL,
      distR: dR,
      angleDelta
    };
  }

  const triAddr = computeTriangleMetrics(addr);
  const triTop  = computeTriangleMetrics(top);
  const triImp  = computeTriangleMetrics(imp);

  function varPercent(ref, val) {
    if (ref == null || val == null || ref === 0) return null;
    return ( (val - ref) / ref ) * 100;
  }

  const varTop  = triAddr && triTop
    ? varPercent(triAddr.distL + triAddr.distR, triTop.distL + triTop.distR)
    : null;
  const varImp  = triAddr && triImp
    ? varPercent(triAddr.distL + triAddr.distR, triImp.distL + triImp.distR)
    : null;

  const triangleScore = scores && scores.triangle != null
    ? Math.round(scores.triangle * 15)
    : 0;

  // =========== WEIGHT SHIFT ===========
  function sideCOM(pose, left) {
    const sh = get(pose, left ? 11 : 12);
    const hip= get(pose, left ? 23 : 24);
    const foot = get(pose, left ? 27 : 28);
    if (!sh || !hip || !foot) return null;
    return { body: (sh.x + hip.x)/2, foot: foot.x };
  }

  const addrRight = sideCOM(addr, false);
  const addrLeft  = sideCOM(addr, true);
  const impRight  = sideCOM(imp, false);
  const impLeft   = sideCOM(imp, true);

  const weightTopBack = addrRight && addrLeft
    ? (addrRight.body > addrLeft.body) // très simplifié
    : null;

  const weightImpactFront = impRight && impLeft
    ? (impLeft.body < impRight.body) // corps plus vers pied gauche
    : null;

  const weightShiftScore = Math.round(
    ((scores && scores.addressA || 0) + (scores && scores.finishA || 0)) / 2 * 15
  );

  // =========== EXTENSION / FINISH ===========
  const finishScore = scores && scores.finishA != null
    ? Math.round(scores.finishA * 10)
    : 0;

  const finishStable = scores && scores.finishA != null
    ? scores.finishA > 0.7
    : false;

  // =========== TEMPO ===========
  let tBack = null, tDown = null, tempoRatio = null;
  if (KF.address != null && KF.top != null && KF.impact != null &&
      timestamps.length > KF.impact) {
    tBack = timestamps[KF.top] - timestamps[KF.address];
    tDown = timestamps[KF.impact] - timestamps[KF.top];
    if (tBack > 0 && tDown > 0) {
      tempoRatio = tBack / tDown;
    }
  }

  const tempoScore = scores && scores.tempo != null
    ? Math.round(scores.tempo * 10)
    : 0;

  // =========== BALANCE ===========

  const balanceScore = scores && scores.head != null
    ? Math.round(scores.head * 10)
    : 0;

  const headStable = scores && scores.head != null
    ? scores.head > 0.7
    : false;

  // =========== TEXTE FINAL ===========

  const finalScore = scores && scores.total != null ? scores.total : 0;

  const txt =
`🎯 ===== SWING SCORING PRO ===== 🎯

📐 POSTURE ANALYSIS
  → Angle de flexion: ${safeDeg(flexDeg)}°
  → Ratio pieds/épaules: ${safeNum(feetShoulderRatio)}
  → Différence alignement épaules/hanches: ${safeDeg(diffAlign)}°
  ✅ Score Posture: ${postureScore}/20

🔄 ROTATION ANALYSIS
  → Rotation épaules: ${safeDeg(rotShoulders)}°
  → Rotation hanches: ${safeDeg(rotHips)}°
  → X-Factor: ${safeDeg(xFactor)}°
  ✅ Score Rotation: ${rotationScore}/20

🔺 TRIANGLE ANALYSIS
  → Distance bras (addr): ${triAddr ? safeNum(triAddr.distL + triAddr.distR) : "--"}
  → Variation au top: ${varTop != null ? safeDeg(varTop) + "%" : "--"}
  → Variation à l’impact: ${varImp != null ? safeDeg(varImp) + "%" : "--"}
  ✅ Score Triangle: ${triangleScore}/15

⚖️ WEIGHT SHIFT ANALYSIS
  → Au top: poids sur pied arrière: ${weightTopBack == null ? "--" : (weightTopBack ? "oui ✅" : "non ❌")}
  → À l’impact: poids sur pied avant: ${weightImpactFront == null ? "--" : (weightImpactFront ? "oui ✅" : "non ❌")}
  ✅ Score Weight Shift: ${weightShiftScore}/15

💪 EXTENSION / FINISH ANALYSIS
  → Équilibre au finish: ${finishStable ? "stable ✅" : "à stabiliser ❌"}
  ✅ Score Extension / Finish: ${finishScore}/10

⏱️ TEMPO ANALYSIS
  → Backswing: ${tBack != null ? safeNum(tBack, 2) + "s" : "--"}
  → Downswing: ${tDown != null ? safeNum(tDown, 2) + "s" : "--"}
  → Ratio: ${tempoRatio != null ? safeNum(tempoRatio, 2) + ":1" : "--"}
  ✅ Score Tempo: ${tempoScore}/10

⚖️ BALANCE ANALYSIS
  → Tête stable: ${headStable ? "oui ✅" : "à travailler ❌"}
  ✅ Score Balance: ${balanceScore}/10

🏆 ===== SCORE FINAL: ${finalScore}/100 ===== 🏆`;

  el.style.display = "block";
  el.innerHTML = `<pre style="white-space:pre-wrap; margin:0; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; font-size:0.85rem;">${txt}</pre>`;
}


function activateRecording() {
  console.warn("⚠️ activateRecording() temporairement désactivé (mode DEBUG).");
}

  
  // ---------------------------------------------------------
  //   SWING COMPLETE → SCORE + UI
  // ---------------------------------------------------------
  function handleSwingComplete(swing) {
    console.log("🏁 SWING COMPLETE", swing);
    captureArmed = false;
    state = JSW_STATE.REVIEW;
    updateUI();

    const scores = computeSwingScorePremium(swing);

    // Si on a un panneau résultat natif JustSwing
    if (resultPanelEl && scoreGlobalEl && scoreDetailsEl && swingLabelEl) {
      swingIndex += 1;

      swingLabelEl.textContent = `Swing #${swingIndex}`;
      scoreGlobalEl.textContent = `Score Parfect : ${scores.total}/100`;
      scoreGlobalEl.style.fontSize = "1.8rem";
      scoreGlobalEl.style.fontWeight = "800";

      scoreDetailsEl.textContent =
        `Triangle ${scores.triangleScore}/100 · ` +
        `Lag ${scores.lagScore}/100 · ` +
        `Plan ${scores.planeScore}/100 · ` +
        `Rotation ${scores.rotationScore}/100 · ` +
        `Tempo ${scores.tempoScore}/100`;

      if (coachCommentEl) {
        coachCommentEl.textContent = coachTechnicalComment(scores);
      }

      // 📝 BREAKDOWN PREMIUM
const breakdownEl = document.getElementById("swing-score-breakdown");
if (breakdownEl) {
    breakdownEl.innerHTML = buildPremiumBreakdown(data, data.scores);
    breakdownEl.style.display = "block";
}


      resultPanelEl.classList.remove("hidden");

      // Auto-enchaînement après 5s
      setTimeout(() => {
        if (state !== JSW_STATE.REVIEW) return;
        resultPanelEl.classList.add("hidden");
        state = JSW_STATE.WAITING_START;
        updateUI();
        showStartButton();
      }, 5000);
    } else {
      // Fallback : petite modale simple
      showResultModal(scores);
    }
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
