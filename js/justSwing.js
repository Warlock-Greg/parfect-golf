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

  let captureArmed = false;    // prêt à analyser le swing (après routine)
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
  ];

  function startRoutineSequence() {
    if (!bigMsgEl) return;

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

      // 👇 NOUVEAU : On affiche un bouton GO pour démarrer la capture
      setTimeout(showGoButtonAfterRoutine, 1500);
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
    bigMsgEl.style.opacity = 0;
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

  // Si on n'enregistre pas → STOP
  if (!isRecordingActive) return;

  // Le moteur ne doit tourner QUE pendant la capture
  if (!landmarks || !engine) return;

  // 🔥 FRAME INDEX ++ (clé de voûte du patch)
  const evt = engine.processPose(landmarks, frameIndex++, currentClubType);

  // Debug
  if (evt) console.log("🎯 ENGINE EVENT:", evt);

  // Le moteur a terminé un swing complet  
  if (evt && evt.type === "swingComplete") {
    console.log("🏁 swingComplete détecté !");
    isRecordingActive = false;
    handleSwingComplete(evt.data);
  }
}


  // ---------------------------------------------------------
  //   FULL BODY DETECTION
  // ---------------------------------------------------------
  function detectFullBody(lm) {
    if (!lm || !lm.length) return false;
    const head = lm[0];
    const la = lm[27];
    const ra = lm[28];
    if (!head || !la || !ra) return false;

    const inside = (p) =>
      p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98;
    if (!inside(head) || !inside(la) || !inside(ra)) return false;

    const h = Math.abs(head.y - Math.min(la.y, ra.y));
    return h > 0.4 && h < 0.95;
  }

  // ---------------------------------------------------------
  //   SCORING MVP (à raffiner plus tard)
  // ---------------------------------------------------------
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
function buildPremiumBreakdown(data, scores) {
  const m = scores.metrics || {};

  const p  = m.posture   || {};
  const r  = m.rotation  || {};
  const t  = m.triangle  || {};
  const w  = m.weightShift || {};
  const e  = m.extension || {};
  const tm = m.tempo     || {};
  const b  = m.balance   || {};

  const s = (v, digits = 2) =>
    (typeof v === "number" ? v.toFixed(digits) : (v ?? "N/A"));

  return `
🎯 ===== SWING SCORING PRO ===== 🎯

📐 POSTURE ANALYSIS
  → Angle de flexion: ${s(p.flexionDeg, 1)}°
  → Ratio pieds/épaules: ${s(p.feetShoulderRatio, 2)}
  → Différence alignement épaules/hanches: ${s(p.alignDiff, 1)}°
  ✅ Score Posture: ${p.score ?? "N/A"}/20

🔄 ROTATION ANALYSIS
  → Rotation épaules: ${s(r.shoulderRot, 1)}°
  → Rotation hanches: ${s(r.hipRot, 1)}°
  → X-Factor: ${s(r.xFactor, 1)}°
  ✅ Score Rotation: ${r.score ?? "N/A"}/20

🔺 TRIANGLE ANALYSIS
  → Distance bras gauche: Address=${s(t.dAddress, 3)}, Top=${s(t.dTop, 3)}, Impact=${s(t.dImpact, 3)}
  → Variation: Top=${s(t.varTopPct, 1)}%, Impact=${s(t.varImpactPct, 1)}%
  ✅ Score Triangle: ${t.score ?? "N/A"}/15

⚖️ WEIGHT SHIFT ANALYSIS
  → Shift vers pied arrière au top: ${s(w.shiftBack, 3)}
  → Shift vers pied avant à l'impact: ${s(w.shiftFwd, 3)}
  ✅ Score Weight Shift: ${w.score ?? "N/A"}/15

💪 EXTENSION ANALYSIS
  → Extension à l'impact: ${s(e.extImpact, 3)}
  → Extension au finish: ${s(e.extFinish, 3)}
  → Mouvement de la tête: ${s(e.headMove, 3)}
  ✅ Score Extension: ${e.score ?? "N/A"}/10

⏱️ TEMPO ANALYSIS
  → Backswing: ${s(tm.backswingT, 2)}s
  → Downswing: ${s(tm.downswingT, 2)}s
  → Ratio: ${s(tm.ratio, 2)}:1
  ✅ Score Tempo: ${tm.score ?? "N/A"}/10

⚖️ BALANCE ANALYSIS
  → Tête au-dessus des hanches au finish: ${b.headOverHips ? "oui ✅" : "non ❌"}
  → Mouvement des hanches (address → finish): ${s(b.finishMove, 3)}
  ✅ Score Balance: ${b.score ?? "N/A"}/10

🏆 ===== SCORE FINAL: ${scores.total}/100 ===== 🏆
`;
}


function activateRecording() {
  console.log("🎬 ENREGISTREMENT ACTIVÉ (post-routine)");

  // --- Flags d'état ---
  isRecordingActive = true;
  state = JSW_STATE.SWING_CAPTURE;

  // --- Reset index frame pour analyses tempo / progression ---
  frameIndex = 0;

  // --- UI ---
  if (statusTextEl) {
    statusTextEl.textContent = "🔴 Enregistrement en cours...";
    statusTextEl.style.color = "#ff4444";
  }

  // --- Reset du moteur d’analyse ---
  if (engine) {
    console.log("🔄 RESET ENGINE");
    engine.reset();
  }

  // --- Indication visuelle : halo rouge (optionnel si tu veux) ---
  const halo = document.getElementById("jsw-halo");
  if (halo) {
    halo.style.background = "rgba(255,0,0,0.35)";
    halo.style.boxShadow = "0 0 30px rgba(255,0,0,0.8)";
  }

  // --- Sécurité : arrêt auto après 10 secondes si aucun swing ---
  setTimeout(() => {
    if (isRecordingActive) {
      console.warn("⏱️ Timeout 10s - arrêt automatique (aucun swing détecté)");
      stopRecording();
    }
  }, 10000);
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
