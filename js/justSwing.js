// =========================================================
//   JUST SWING – Parfect.golfr – Version CLEAN 2025
//   Capture, scoring, routine, UI, replay hooks
// =========================================================

const $$ = (id) => document.getElementById(id);

// États
const JSW_STATE = {
  IDLE: "IDLE",
  POSITIONING: "POSITIONING",
  ROUTINE: "ROUTINE",
  ADDRESS_READY: "ADDRESS_READY",
  SWING_CAPTURE: "SWING_CAPTURE",
  REVIEW: "REVIEW",
};

const JSW_MODE = {
  SWING: "swing",
  PUTT: "putt",
  APPROCHE: "approche",
};

// ---------------------------------------------------------
//   ROUTINES (structure FIXÉE, support utilisateur)
// ---------------------------------------------------------

const DEFAULT_ROUTINES = {
  swing: ["Respiration", "Visualisation", "Alignement", "Swing d’essai", "Adresse", "Swing"],
  putt: ["Lecture du green", "Visualisation", "Alignement", "Adresse", "Putt"],
  approche: ["Choix de trajectoire", "Visualisation", "Alignement", "Adresse", "Swing d’approche"],
};

let routineConfig = {
  swing: { default: DEFAULT_ROUTINES.swing, user: null },
  putt: { default: DEFAULT_ROUTINES.putt, user: null },
  approche: { default: DEFAULT_ROUTINES.approche, user: null },
};

// ---------------------------------------------------------
// Loft clubs
// ---------------------------------------------------------
const CLUB_BASE_LOFT = {
  driver: 10, bois3: 15, hybride: 20,
  fer4: 22, fer5: 25, fer6: 28, fer7: 32, fer8: 36, fer9: 40,
  pw: 46, sw: 56, wedge: 50,
};

// ---------------------------------------------------------
// Drills
// ---------------------------------------------------------
const JSW_DRILLS = [
  { id: "routine_3_steps", title: "Routine en 3 étapes", focusTags: ["routine"],
    description: "Respiration + visualisation + alignement. À répéter avant chaque balle.",
    durationMin: 5
  },
  { id: "finish_balance", title: "Finish en équilibre", focusTags: ["balance_finish"],
    description: "Tiens ton finish 3 secondes sans bouger.",
    durationMin: 10
  },
  { id: "launch_control", title: "Trajectoire basse", focusTags: ["launch_control"],
    description: "Garde la balle sous une ligne imaginaire (sous un arbre).",
    durationMin: 10
  }
];

// =========================================================
//   MODULE PRINCIPAL
// =========================================================

const JustSwing = (() => {
// ==== DEBUG TEMPORAIRE ====
// Permet de lire l'état interne facilement dans la console
window.JSW_DEBUG = {
  state: () => state,
  fullBody: () => lastFullBodyOk,
  pose: () => lastPose,
  routineEl: () => routineStepsEl,
};

  // DOM
  let screenEl, videoEl, overlayEl, ctx;
  let statusTextEl, routineStepsEl, timerEl;
  let resultPanelEl, scoreGlobalEl, scoreDetailsEl, coachCommentEl, swingLabelEl;
  let drillsEl;
  let btnKeepRefEl, btnNextSwingEl, btnExitEl, restartBtnEl;
  let bigMsgEl;

  // État interne
  let state = JSW_STATE.IDLE;
  let mode = JSW_MODE.SWING;
  let sessionStartTime = null;
  let maxSessionDurationMs = 120000;

  let lastPose = null;
  let lastFullBodyOk = false;
  let addressStableSince = null;
  let playerInFrame = false;
  let playerOutOfFrameSince = null;
  let swingInProgress = false;
  let currentSwingIndex = 0;
  let swings = [];

  let referenceSwing = null;
  let currentClubType = "fer7";

  // Capture balle
  let captureCanvas = null;
  let captureCtx = null;
  let frameBuffer = [];
  const maxFrameBuffer = 12;

  let currentImpactContext = null;
  let loopId = null;

// =============================================================
//  ROUTINE GUIDÉE — ~30 secondes en big message
// =============================================================

const routineStepsAuto = [
  "J’attends que tu te mettes en plain-pied 👣",
  "Vérifie ton grip ✋",
  "Vérifie ta posture 🧍‍♂️",
  "Vérifie ton alignement 🎯",
  "Fais un swing d’essai 🌀",
  "Respire profondément 😮‍💨"
];

let routineStepIndex = 0;
let routineInterval = null;
const ROUTINE_STEP_DURATION = 4000; // 4s par étape ≈ 24s + final

function startRoutineSequence() {
  if (!bigMsgEl) return;

  routineStepIndex = 0;
  showBigMessage(routineStepsAuto[0]);

  // On montre aussi la routine globale en bas
  if (typeof showRoutineSteps === "function") {
    showRoutineSteps();
  }

  if (routineInterval) {
    clearInterval(routineInterval);
    routineInterval = null;
  }

  routineInterval = setInterval(() => {
    routineStepIndex++;

    if (routineStepIndex < routineStepsAuto.length) {
      showBigMessage(routineStepsAuto[routineStepIndex]);
    } else {
      // Fin des étapes → on arrête le timer
      clearInterval(routineInterval);
      routineInterval = null;

      // Petit délai pour le message final
      setTimeout(() => {
        showBigMessage("À toi de faire de ton mieux 💥");
      }, 200);

      // 3s après → on cache le message et on passe en phase "prêt à swinguer"
      setTimeout(() => {
        hideBigMessage();
        state = JSW_STATE.ADDRESS_READY;
        updateUI();
      }, 3200);
    }
  }, ROUTINE_STEP_DURATION);
}




  
  // -------------------------------------------------------
  //   MESSAGES UI
  // -------------------------------------------------------
  function showBigMessage(msg) {
  if (!bigMsgEl) return;

  bigMsgEl.textContent = msg;
  bigMsgEl.style.opacity = 0;
  bigMsgEl.style.transform = "translate(-50%, -50%) scale(0.9)";

  setTimeout(() => {
    bigMsgEl.style.opacity = 1;
    bigMsgEl.style.transform = "translate(-50%, -50%) scale(1)";
  }, 20);

  // effacement automatique après 2,5s
  setTimeout(() => hideBigMessage(), 2500);
}

function hideBigMessage() {
  if (!bigMsgEl) return;
  bigMsgEl.style.opacity = 0;
}


  // -------------------------------------------------------
  //   DESSIN MÉDIAPIPE
  // -------------------------------------------------------

  function drawPoseSkeleton(landmarks) {
    if (!landmarks || !landmarks.length) return;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;

    const w = overlayEl.width;
    const h = overlayEl.height;

    const p = (i) => landmarks[i] ? { x: landmarks[i].x * w, y: landmarks[i].y * h } : null;

    const segments = [
      [11, 12], [11, 23], [12, 24], [23, 24],
      [11, 13], [13, 15], [12, 14], [14, 16],
      [23, 25], [25, 27], [24, 26], [26, 28],
    ];

    for (const [a, b] of segments) {
      const pa = p(a), pb = p(b);
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    const nose = p(0);
    if (nose) {
      ctx.beginPath();
      ctx.arc(nose.x, nose.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,255,153,0.9)";
      ctx.fill();
    }

    ctx.restore();
  }

  function drawGhost() {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;

    const cx = overlayEl.width / 2;
    const top = overlayEl.height * 0.15;
    const mid = overlayEl.height * 0.5;

    ctx.beginPath();
    ctx.arc(cx, top + 30, 20, 0, Math.PI * 2);
    ctx.moveTo(cx, top + 50);
    ctx.lineTo(cx, mid);
    ctx.stroke();

    ctx.restore();
  }

  function drawOverlay() {
    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);
    if (!lastPose) return drawGhost();
    drawPoseSkeleton(lastPose);
  }

  // -------------------------------------------------------
  //   INIT DOM
  // -------------------------------------------------------
  function initJustSwing() {
    screenEl = $$("just-swing-screen");
    videoEl = $$("jsw-video");
    overlayEl = $$("jsw-overlay");
    bigMsgEl = $$("jsw-big-msg");

    ctx = overlayEl.getContext("2d", { willReadFrequently: true });

    statusTextEl = $$("jsw-status-text");
    routineStepsEl = $$("jsw-routine-steps");
    console.log("🔍 routineStepsEl =", routineStepsEl);
    timerEl = $$("jsw-timer");

    resultPanelEl = $$("jsw-result-panel");
    scoreGlobalEl = $$("jsw-score-global");
    scoreDetailsEl = $$("jsw-score-details");
    coachCommentEl = $$("jsw-coach-comment");
    swingLabelEl = $$("jsw-swing-label");
    drillsEl = $$("jsw-drills");

    btnKeepRefEl = $$("jsw-btn-keep-reference");
    btnNextSwingEl = $$("jsw-btn-next-swing");
    btnExitEl = $$("jsw-btn-exit");
    restartBtnEl = $$("jsw-restart");

    // Sélecteur de clubs
    const clubSelect = $$("jsw-club-select");
    clubSelect?.addEventListener("change", () => {
      currentClubType = clubSelect.value;
    });

    // Actions panel résultat
    btnKeepRefEl.addEventListener("click", () => {
      if (swings.length) referenceSwing = swings.at(-1);
      hideResultPanel();
    });

    btnNextSwingEl.addEventListener("click", () => {
      hideResultPanel();
      restartLoop();
    });

    btnExitEl.addEventListener("click", () => stopSession());
    restartBtnEl?.addEventListener("click", () => startSession(mode));

    // Capture canvas (balle)
    captureCanvas = document.createElement("canvas");
    captureCanvas.width = 160;
    captureCanvas.height = 160;
    captureCanvas.style.display = "none";
    captureCtx = captureCanvas.getContext("2d", { willReadFrequently: true });
    document.body.appendChild(captureCanvas);

    window.addEventListener("resize", resizeOverlay);
    resizeOverlay();

    console.log("✅ JustSwing initialisé");
  }

  function resizeOverlay() {
    overlayEl.width = videoEl.clientWidth || window.innerWidth;
    overlayEl.height = videoEl.clientHeight || window.innerHeight;
  }

  // -------------------------------------------------------
  //   START SESSION
  // -------------------------------------------------------
  async function startSession(selectedMode = JSW_MODE.SWING) {
   // 🔥 Correctif 1 — sécurité si initJustSwing n’a pas été exécuté

  
  // Correctif 1 : sécurité si initJustSwing n’a pas encore initialisé le DOM
  // -------------------------------------------------------
  if (!screenEl) {
    console.warn("⚠️ JustSwing non initialisé — initJustSwing() forcé AVANT startSession");
    initJustSwing();
  }



  // -------------------------------------------------------
  // Session init
  // -------------------------------------------------------
    
    mode = selectedMode;

    state = JSW_STATE.POSITIONING;
    statusTextEl.textContent = "Place-oit plein pied 👣";
    timerEl.textContent = "Temps restant = 30s";

    swings = [];
    currentSwingIndex = 0;
    sessionStartTime = performance.now();
    lastPose = null;
    lastFullBodyOk = false;
    frameBuffer = [];
    currentImpactContext = null;
    addressStableSince = null;

      // -------------------------------------------------------
  // Correctif 2 : afficher la routine APRÈS init (sinon routineStepsEl était undefined)
  // -------------------------------------------------------
  showRoutineSteps();

    screenEl.classList.remove("hidden");
    document.body.classList.add("jsw-fullscreen");

    updateUI();
    showBigMessage("J’attends que tu te mettes en plain-pied 👣");

// ------------------------
  // LANCEMENT OFFICIEL DE LA ROUTINE
  // ------------------------
  // 👉 IMPORTANT : on ne lance PAS la routine tant que le corps n'est pas bien détecté
  // Le passage réel en ROUTINE est déclenché dans statePositioning()
  // Mais ON DOIT armer la séquence ici.
  //startRoutineSequence();

    if (loopId) cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(mainLoop);
  }

  function stopSession() {
    state = JSW_STATE.IDLE;

    screenEl.classList.add("hidden");
    document.body.classList.remove("jsw-fullscreen");

    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = null;
    }

    hideBigMessage();
    hideResultPanel();
  }

  // -------------------------------------------------------
  //   MAIN LOOP
  // -------------------------------------------------------
  function mainLoop(now) {
    if (state === JSW_STATE.IDLE) return;

   // const elapsed = now - sessionStartTime;
    //if (elapsed > maxSessionDurationMs) {
      //state = JSW_STATE.REVIEW;
      //showFinalSummary();
      //return;
    //}

    updateTimer(performance.now() - sessionStartTime);
    captureFrame();
    drawOverlay();
    updateState(now);

    loopId = requestAnimationFrame(mainLoop);
  }

  function updateTimer(elapsedMs) {
    const rem = Math.max(0, 120 - Math.floor(elapsedMs / 1000));
    timerEl.textContent = `Temps restant : ${rem}s`;
  }

  // -------------------------------------------------------
  //   MEDIAPIPE CALLBACK
  // -------------------------------------------------------
  function onPoseFrame(landmarks) {
    console.log("POSE FRAME →", !!landmarks);

    lastPose = landmarks || null;
    lastFullBodyOk = detectFullBody(landmarks);

    const inFrame = !!landmarks;
    if (inFrame && !playerInFrame) playerInFrame = true;
    if (!inFrame && playerInFrame) {
      playerInFrame = false;
      playerOutOfFrameSince = performance.now();
    }
  }
// -------------------------------------------------------
//   CAPTURE FRAME (vidéo + landmarks)
// -------------------------------------------------------
function captureFrame() {
  if (!videoEl || videoEl.readyState < 2) return;

  // On capture un carré 160x160
  captureCtx.drawImage(videoEl, 0, 0, 160, 160);
  const imageData = captureCtx.getImageData(0, 0, 160, 160);

  // On stocke image + pose
  frameBuffer.push({
    imageData,
    pose: lastPose,
    width: 160,
    height: 160
  });

  // On limite la taille
  if (frameBuffer.length > maxFrameBuffer) frameBuffer.shift();
}

  
  // -------------------------------------------------------
  //   STATE MACHINE
  // -------------------------------------------------------

  function updateState(now) {
  // 0) Si on n'a pas de landmarks → on ne fait rien
  console.log("UPDATE STATE →", state);

    if (!lastPose) return;

  switch (state) {

    case JSW_STATE.POSITIONING: {
      // On attend de te voir plein-pied
      if (!lastFullBodyOk) {
        // message déjà géré dans startSession + statePositioning,
        // donc on ne spam pas ici
        return;
      }
      // On t'a en plein-pied → on lance la routine guidée UNE FOIS
      state = JSW_STATE.ROUTINE;
      updateUI();
      startRoutineSequence();
      return;
    }

    case JSW_STATE.ROUTINE: {
      // La routine est gérée par startRoutineSequence()
      // Ici on peut juste surveiller si tu sors du cadre
      if (!lastFullBodyOk) {
        showBigMessage("Reviens bien en plain-pied 👣");
      }
      return;
    }

    case JSW_STATE.ADDRESS_READY: {
      // Ici on attend le début du swing
      // (pour l'instant détection MVP)
      if (detectSwingStart(lastPose)) {
        state = JSW_STATE.SWING_CAPTURE;
        currentSwingIndex++;

        currentImpactContext = {
          framesAvantImpact: frameBuffer.slice(),
          framesApresImpact: [],
          clubType: currentClubType
        };
      }
      return;
    }

    case JSW_STATE.SWING_CAPTURE: {
      // On attend la fin du swing
      if (detectSwingEnd(lastPose)) {
        state = JSW_STATE.REVIEW;

        if (currentImpactContext) {
          currentImpactContext.framesApresImpact = frameBuffer.slice();
        }

        const swingData = computeSwingScore(mode, lastPose, currentImpactContext);
        swings.push(swingData);

        window.JustSwingHistory?.pushSwing?.(swingData);

        showSwingResult(swingData);
      }
      return;
    }

    case JSW_STATE.REVIEW: {
      // Rien → on affiche la fiche.
      return;
    }
  }
}




  function statePositioning(now) {
  if (!lastFullBodyOk) {
    showBigMessage("J’attends que tu te mettes en plain-pied 👣");
    return;
  }

  // Une fois qu'on te voit bien → on lance la routine guidée UNE SEULE FOIS
  hideBigMessage();
  state = JSW_STATE.ROUTINE;
  updateUI();
  startRoutineSequence();
}


  function stateRoutine(now) {
    // Ici on ne fait plus rien de spécial :
  // la séquence de routine est gérée par startRoutineSequence()
  // On peut juste s'assurer que le joueur reste dans le cadre.
  if (!lastFullBodyOk) {
    showBigMessage("Reviens bien en plain-pied 👣");
  }
}

  function stateAddressReady(now) {
    setHalo("green");
    hideBigMessage();

    if (detectSwingStart(lastPose)) {
      state = JSW_STATE.SWING_CAPTURE;
      currentSwingIndex++;
      setHalo("blue");

      currentImpactContext = {
        framesAvantImpact: frameBuffer.slice(),
        framesApresImpact: [],
        clubType: currentClubType
      };
    }
  }

  function stateSwingCapture(now) {
    console.log("➡️  stateSwingCapture()");

    setHalo("blue");

    if (detectSwingEnd(lastPose)) {
      state = JSW_STATE.REVIEW;

      if (currentImpactContext)
        currentImpactContext.framesApresImpact = frameBuffer.slice();

      const swingData = computeSwingScore(mode, lastPose, currentImpactContext);
      swings.push(swingData);

      // Historique global si existant
      window.JustSwingHistory?.pushSwing?.(swingData);

      showSwingResult(swingData);
    }
  }

  function restartLoop() {
    addressStableSince = null;
    currentImpactContext = null;
    hideBigMessage();

    state = lastFullBodyOk
      ? JSW_STATE.ROUTINE
      : JSW_STATE.POSITIONING;

    showBigMessage(lastFullBodyOk
      ? "Reprends ta routine."
      : "Reviens plein pied au centre.");

    updateUI();
  }

  // -------------------------------------------------------
  //   FULL BODY DETECTION
  // -------------------------------------------------------
  function detectFullBody(lm) {
    if (!lm?.length) return false;

    const head = lm[0];
    const la = lm[27];
    const ra = lm[28];
    if (!head || !la || !ra) return false;

    const inBounds = (p) => p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98;
    if (!inBounds(head) || !inBounds(la) || !inBounds(ra)) return false;

    const height = Math.abs(head.y - Math.min(la.y, ra.y));
    return height > 0.4 && height < 0.95;
  }

  function isAddressStable() {
    return lastFullBodyOk;
  }
let swingStartTime = null;

function detectSwingStart() {
  if (!swingStartTime) swingStartTime = performance.now();
  return Math.random() < 0.015;
}

function detectSwingEnd() {
  if (!swingStartTime) return false;

  // 🔥 fin de swing automatique après 800 ms
  return performance.now() - swingStartTime > 800;
}



  function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

// Angle entre segments AB et CD
function angleBetweenSegments(A, B, C, D) {
  const v1 = { x: B.x - A.x, y: B.y - A.y };
  const v2 = { x: D.x - C.x, y: D.y - C.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
  const mag2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cos = dot / (mag1 * mag2);
  return Math.acos(Math.min(1, Math.max(-1, cos))) * 180 / Math.PI;
}

// Analyse du triangle bras + épaules
function computeTriangleMetrics(pose) {
  if (!pose) return null;

  const L = pose;
  const LS = L[11], RS = L[12];
  const LH = L[15], RH = L[16];
  if (!LS || !RS || !LH || !RH) return null;

  const shoulderWidth = dist(LS, RS);

  const midShoulders = {
    x: (LS.x + RS.x) / 2,
    y: (LS.y + RS.y) / 2
  };

  const handDistL = dist(LH, midShoulders);
  const handDistR = dist(RH, midShoulders);
  const avgHandDist = (handDistL + handDistR) / 2;

  const angle = angleBetweenSegments(LS, RS, LH, RH);

  return { shoulderWidth, avgHandDist, angle };
}

 // =======================================================
//   SCORING COMPLET – Parfect.golfr (Triangle + Lag +
//   Descente dans le plan + Rotation + Tête + Impact +
//   Finish)
// =======================================================


// -------------------------------------------------------
//   UTILITAIRES GÉNÉRIQUES
// -------------------------------------------------------
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  if (!a || !b) return 999;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleBetweenSegments(A, B, C, D) {
  if (!A || !B || !C || !D) return 0;

  const v1 = { x: B.x - A.x, y: B.y - A.y };
  const v2 = { x: D.x - C.x, y: D.y - C.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
  const mag2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);

  if (!mag1 || !mag2) return 0;

  const cos = clamp(dot / (mag1 * mag2), -1, 1);
  return Math.acos(cos) * 180 / Math.PI;
}


// -------------------------------------------------------
//   TRIANGLE (épaules ↔ mains)
// -------------------------------------------------------
function computeTriangleMetrics(pose) {
  if (!pose) return null;

  const LS = pose[11], RS = pose[12];
  const LH = pose[15], RH = pose[16];
  if (!LS || !RS || !LH || !RH) return null;

  const shoulderWidth = dist(LS, RS);

  const midShoulders = {
    x: (LS.x + RS.x) / 2,
    y: (LS.y + RS.y) / 2,
  };

  const handDistL = dist(LH, midShoulders);
  const handDistR = dist(RH, midShoulders);

  const angle = angleBetweenSegments(LS, RS, LH, RH);

  return {
    shoulderWidth,
    avgHandDist: (handDistL + handDistR) / 2,
    angle,
  };
}

function scoreTriangle(tri) {
  if (!tri) return 8;

  const idealShoulder = 0.25;
  const idealHands = 0.18;
  const idealAngle = 25;

  const s = 1 - Math.abs(tri.shoulderWidth - idealShoulder) / idealShoulder;
  const h = 1 - Math.abs(tri.avgHandDist - idealHands) / idealHands;
  const a = 1 - Math.abs(tri.angle - idealAngle) / idealAngle;

  return Math.round(clamp((s + h + a) / 3, 0, 1) * 20);
}


// -------------------------------------------------------
//   LAG DU CLUB – Retard du poignet dans la descente
// -------------------------------------------------------
function scoreLag(pose) {
  if (!pose) return 10;

  const wrist = pose[15];  // main gauche
  const elbow = pose[13];
  if (!wrist || !elbow) return 10;

  const dy = elbow.y - wrist.y;

  const raw = clamp((dy - 0.01) / 0.10, 0, 1);
  return Math.round(raw * 15);
}


// -------------------------------------------------------
//   DESCENTE DANS LE PLAN – Angle shaft épaule→main
// -------------------------------------------------------
function scorePlane(pose) {
  if (!pose) return 10;

  const wrist = pose[15];
  const shoulder = pose[11];
  if (!wrist || !shoulder) return 10;

  const angleDeg =
    Math.atan2(wrist.y - shoulder.y, wrist.x - shoulder.x) * 180 / Math.PI;

  const diff = Math.abs(angleDeg - 35);
  const raw = clamp(1 - diff / 25, 0, 1);

  return Math.round(raw * 15);
}


// -------------------------------------------------------
//   ROTATION — Hanches ↔ Épaules
// -------------------------------------------------------
function scoreRotation(pose) {
  if (!pose) return 8;

  const LS = pose[11], RS = pose[12];
  const LH = pose[23], RH = pose[24];
  if (!LS || !RS || !LH || !RH) return 8;

  const shoulderTilt = angleBetweenSegments(LS, RS, { x: LS.x, y: LS.y - 0.1 }, LS);
  const hipTilt      = angleBetweenSegments(LH, RH, { x: LH.x, y: LH.y - 0.1 }, LH);

  const diff = Math.abs(shoulderTilt - hipTilt);
  const raw = clamp(1 - diff / 25, 0, 1);

  return Math.round(raw * 15);
}


// -------------------------------------------------------
//   STABILITÉ DE LA TÊTE – bouge pas trop !
//-------------------------------------------------------
function scoreHeadStability(frames) {
  if (!frames || frames.length < 5) return 8;

  const headPositions = frames.map(f => f.pose?.[0]).filter(Boolean);
  if (headPositions.length < 5) return 8;

  const xs = headPositions.map(h => h.x);
  const ys = headPositions.map(h => h.y);

  const dx = Math.max(...xs) - Math.min(...xs);
  const dy = Math.max(...ys) - Math.min(...ys);

  const move = Math.sqrt(dx*dx + dy*dy);
  const raw = clamp(1 - move / 0.1, 0, 1);

  return Math.round(raw * 15);
}


// -------------------------------------------------------
//   IMPACT ZONE — 40 cm avant/après l’impact
// -------------------------------------------------------
function scoreImpactZone(ctxImpact) {
  if (!ctxImpact) return 12;

  const before = ctxImpact.framesAvantImpact;
  const after  = ctxImpact.framesApresImpact;
  if (!before || !after) return 12;

  const lastFrame = after[0];
  if (!lastFrame?.pose) return 12;

  const wrist = lastFrame.pose[15];
  if (!wrist) return 12;

  const dy = Math.abs(wrist.y - 0.5); // valeur webcam, à calibrer

  const raw = clamp(1 - dy / 0.25, 0, 1);
  return Math.round(raw * 15);
}


// -------------------------------------------------------
//   FINISH — équilibre et stabilité finale
// -------------------------------------------------------
function scoreFinish(pose) {
  if (!pose) return 8;

  const LS = pose[11], RS = pose[12];
  if (!LS || !RS) return 8;

  const tilt = Math.abs(LS.x - RS.x);
  const raw = clamp(1 - tilt / 0.25, 0, 1);

  return Math.round(raw * 15);
}


// -------------------------------------------------------
//   SCORE FINAL COMPLET — LA VERSION À UTILISER
// -------------------------------------------------------
function computeSwingScore(mode, pose, ctxImpact) {
  const tri = computeTriangleMetrics(pose);

  const triangleScore = scoreTriangle(tri);
  const lagScore      = scoreLag(pose);
  const planeScore    = scorePlane(pose);
  const rotationScore = scoreRotation(pose);
  const headScore     = scoreHeadStability(frameBuffer);
  const impactScore   = scoreImpactZone(ctxImpact);
  const finishScore   = scoreFinish(pose);

  const total =
    triangleScore +
    lagScore +
    planeScore +
    rotationScore +
    headScore +
    impactScore +
    finishScore;

  const detectedIssues = [];
  if (triangleScore < 10) detectedIssues.push("triangle");
  if (lagScore < 8)       detectedIssues.push("lag");
  if (planeScore < 8)     detectedIssues.push("plane");
  if (rotationScore < 8)  detectedIssues.push("rotation");
  if (headScore < 8)      detectedIssues.push("head_move");
  if (impactScore < 10)   detectedIssues.push("impact_zone");
  if (finishScore < 8)    detectedIssues.push("finish");

  return {
    index: currentSwingIndex,
    mode,
    club: currentClubType,

    total,

    triangleScore,
    lagScore,
    planeScore,
    rotationScore,
    headScore,
    impactScore,
    finishScore,

    detectedIssues,
    timestamp: Date.now(),

    raw: { triangle: tri, pose, ctxImpact }
  };
}


  // -------------------------------------------------------
  //   AFFICHAGE RESULTAT
  // -------------------------------------------------------

 function showSwingResult(data) {
  // --- Titre ---
  swingLabelEl.textContent = `Swing #${data.index} — ${data.mode} (${data.club})`;

  // --- Score global ---
  scoreGlobalEl.textContent = `Score Parfect : ${data.total}/100`;
  scoreDetailsEl.textContent =
    `Routine ${data.routineScore}/20 · ` +
    `Swing ${data.swingScore}/70 · ` +
    `Régularité ${data.regularityScore}/10`;

  // --- Commentaire coach (même si pas encore ultra smart) ---
  coachCommentEl.textContent = data.comment ?? "Bon travail 👌";

  // --- Exos suggérés ---
  const drills = coachSuggestDrills(data);
  drillsEl.innerHTML = drills.map(
    d => `<div>• <b>${d.title}</b> (${d.durationMin} min) — ${d.description}</div>`
  ).join("");

  // === 🧩 DÉTAIL DU SCORE PAR PHASE ===
  const breakdownEl = document.getElementById("jsw-score-breakdown");
  if (breakdownEl && data.phaseScores) {
    const p = data.phaseScores;
    breakdownEl.innerHTML = `
      <h3>Détail du score</h3>
      <table class="jsw-score-table">
        <tbody>
          <tr><td>Adresse</td><td>${p.address?.toFixed?.(1) ?? p.address}/10</td></tr>
          <tr><td>Backswing</td><td>${p.backswing?.toFixed?.(1) ?? p.backswing}/10</td></tr>
          <tr><td>Top</td><td>${p.top?.toFixed?.(1) ?? p.top}/10</td></tr>
          <tr><td>Downswing</td><td>${p.downswing?.toFixed?.(1) ?? p.downswing}/10</td></tr>
          <tr><td>Impact</td><td>${p.impact?.toFixed?.(1) ?? p.impact}/10</td></tr>
          <tr><td>Release</td><td>${p.release?.toFixed?.(1) ?? p.release}/10</td></tr>
          <tr><td>Finish</td><td>${p.finish?.toFixed?.(1) ?? p.finish}/10</td></tr>
        </tbody>
      </table>
    `;
  }

  // === 📜 HISTORIQUE DE LA SESSION (pour revoir les swings) ===
  const historyEl = document.getElementById("jsw-session-history");
  if (historyEl && Array.isArray(swings) && swings.length) {
    historyEl.innerHTML = `
      <h3>Historique de la session</h3>
      <ul class="jsw-history-list">
        ${swings.map(s => `
          <li>
            <button class="jsw-history-item" data-swing-index="${s.index}">
              Swing #${s.index} — ${s.total}/100 — ${s.club}
            </button>
          </li>
        `).join("")}
      </ul>
    `;

    // On attache les handlers de clic pour revoir un swing donné
    historyEl.querySelectorAll(".jsw-history-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-swing-index"));
        const target = swings.find(s => s.index === idx);
        if (target) {
          showSwingResult(target);
        }
      });
    });
  }

  // === Actions avancées (log / replay / référence) ===
  const actionsEl = $$("jsw-result-actions");
  actionsEl.innerHTML = "";

  if (window.JustSwingLog?.show) {
    const logBtn = document.createElement("button");
    logBtn.textContent = "📊 Log swing brut";
    logBtn.className = "jsw-btn-secondary";
    logBtn.onclick = () => window.JustSwingLog.show(data);
    actionsEl.appendChild(logBtn);
  }

  if (window.JustSwingReplay?.show) {
    const replayBtn = document.createElement("button");
    replayBtn.textContent = "🎥 Replay";
    replayBtn.className = "jsw-btn-secondary";
    replayBtn.onclick = () => window.JustSwingReplay.show(data);
    actionsEl.appendChild(replayBtn);
  }

  const refBtn = document.createElement("button");
  refBtn.textContent = "⭐ Référence";
  refBtn.className = "jsw-btn-secondary";
  refBtn.onclick = () => {
    referenceSwing = data;
    refBtn.textContent = "✔ Défini";
  };
  actionsEl.appendChild(refBtn);

  resultPanelEl.classList.remove("hidden");
}


  function hideResultPanel() {
    resultPanelEl.classList.add("hidden");
  }

  function showFinalSummary() {
    if (!swings.length) {
      statusTextEl.textContent = "Aucun swing capturé.";
      return;
    }
    showSwingResult(swings.at(-1));
  }

  // -------------------------------------------------------
  //   UI
  // -------------------------------------------------------
  function updateUI() {
    switch (state) {
      case JSW_STATE.POSITIONING:
        statusTextEl.textContent = "Place-toi plein pied 👣";
        break;
      case JSW_STATE.ROUTINE:
        statusTextEl.textContent = "Lance ta routine";
        showRoutineSteps();
        break;
      case JSW_STATE.ADDRESS_READY:
        statusTextEl.textContent = "Adresse solide";
        break;
      case JSW_STATE.SWING_CAPTURE:
        statusTextEl.textContent = `Swing #${currentSwingIndex} en cours…`;
        break;
      case JSW_STATE.REVIEW:
        statusTextEl.textContent = "Analyse du swing";
        break;
    }
  }

  function setHalo(color) {
    return;
  }

  function showRoutineSteps() {
    const cfg =
      mode === JSW_MODE.SWING ? routineConfig.swing :
      mode === JSW_MODE.PUTT ? routineConfig.putt :
      routineConfig.approche;

    const steps = cfg.user?.length ? cfg.user : cfg.default;
    routineStepsEl.textContent = `Routine : ${steps.join(" · ")}`;
  }

  // -------------------------------------------------------
  //   PARFECT COUNTER
  // -------------------------------------------------------
  function awardParfects(n) {
    const key = "parfect_total";
    const prev = parseInt(localStorage.getItem(key) || "0", 10);
    const updated = prev + n;
    localStorage.setItem(key, updated);

    const el = $$("parfect-counter");
    if (el) {
      el.textContent = `💚 ${updated} Parfect${updated > 1 ? "s" : ""} collecté`;
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 400);
    }
  }

  // -------------------------------------------------------
  //   ROUTINE MODALE
  // -------------------------------------------------------
  window.requestRoutineSetup = () => showRoutineModal();

  window.saveRoutineConfig = (steps) => {
    if (mode === JSW_MODE.SWING) routineConfig.swing.user = steps;
    if (mode === JSW_MODE.PUTT) routineConfig.putt.user = steps;
    if (mode === JSW_MODE.APPROCHE) routineConfig.approche.user = steps;
    showRoutineSteps();
  };

  function showRoutineModal() {
    const modal = $$("jsw-routine-modal");
    modal.classList.remove("hidden");

    const saveBtn = $$("jsw-routine-save");
    saveBtn.onclick = () => {
      const swing = $$("routine-swing").value.split(",");
      const putt = $$("routine-putt").value.split(",");
      const approche = $$("routine-approche").value.split(",");
      setRoutineConfig({
        swing, putt, approche
      });
      modal.classList.add("hidden");
      showRoutineSteps();
    };

    $$("jsw-routine-close").onclick = () => modal.classList.add("hidden");
  }

  function setRoutineConfig(cfg) {
    routineConfig = {
      swing: { default: DEFAULT_ROUTINES.swing, user: cfg.swing },
      putt: { default: DEFAULT_ROUTINES.putt, user: cfg.putt },
      approche: { default: DEFAULT_ROUTINES.approche, user: cfg.approche },
    };
  }

function debug() {
  console.log("🔍 screenEl       =", screenEl);
  console.log("🔍 statusTextEl  =", statusTextEl);
  console.log("🔍 routineStepsEl=", routineStepsEl);
  console.log("🔍 timerEl       =", timerEl);
}

  function computeTriangleStability(pose) {
  if (!pose || pose.length < 17) return null;

  const L = pose;

  const leftShoulder  = L[11];
  const rightShoulder = L[12];
  const leftHand      = L[15];
  const rightHand     = L[16];

  if (!leftShoulder || !rightShoulder || !leftHand || !rightHand) return null;

  // Distance entre épaules
  const shoulderWidth = dist(leftShoulder, rightShoulder);

  // Centre des épaules
  const midShoulders = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2
  };

  // Distance mains ↔ centre épaules
  const leftHandDist  = dist(leftHand, midShoulders);
  const rightHandDist = dist(rightHand, midShoulders);

  const avgHandDist = (leftHandDist + rightHandDist) / 2;

  // Angle épaules ↔ mains
  const angle = angleBetweenSegments(
    leftShoulder, rightShoulder,
    leftHand, rightHand
  );

  return {
    shoulderWidth,
    avgHandDist,
    angle
  };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function angleBetweenSegments(A, B, C, D) {
  const v1 = { x: B.x - A.x, y: B.y - A.y };
  const v2 = { x: D.x - C.x, y: D.y - C.y };

  const dot = v1.x*v2.x + v1.y*v2.y;
  const mag1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
  const mag2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);

  if (mag1 * mag2 === 0) return 0;

  return Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
}


  
  // -------------------------------------------------------
  //   EXPORT
  // -------------------------------------------------------
  return {
    initJustSwing,
    startSession,
    stopSession,
    onPoseFrame,
    setRoutineConfig,
    getReferenceSwing: () => referenceSwing,
    setClubType: (c) => (currentClubType = c),
    showRoutineSteps,   //  ← ajouter ceci
    updateUI,
    _debug: debug   // ← AJOUT
  };

})();

window.JustSwing = JustSwing;
