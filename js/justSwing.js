// === JUST SWING – Parfect.golfr – VERSION CLEAN + UX ===
//
// API publique :
//   JustSwing.initJustSwing()
//   JustSwing.startSession("swing" | "putt")
//   JustSwing.stopSession()
//   JustSwing.onPoseFrame(poseLandmarks)
//   JustSwing.setRoutineConfig({ swing: [...], putt: [...] })
//   JustSwing.setCameraStarter(fnAsync)
//   JustSwing.setClubType("fer7" / "driver" / etc.)
//   JustSwing.getReferenceSwing()

const $$ = (id) => document.getElementById(id);

// États principaux
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
};

// Routines par défaut
const DEFAULT_ROUTINES = {
  swing: ["Respiration", "Visualisation", "Alignement", "Swing d’essai", "Adresse", "Swing"],
  putt:  ["Lecture du green", "Visualisation", "Alignement", "Adresse", "Putt"],
};

const CLUB_BASE_LOFT = {
  driver: 10,
  bois3: 15,
  hybride: 20,
  fer4: 22,
  fer5: 25,
  fer6: 28,
  fer7: 32,
  fer8: 36,
  fer9: 40,
  pw: 46,
  sw: 56,
};

// === MODULE PRINCIPAL ===
const JustSwing = (() => {
  let screenEl, videoEl, overlayEl, ctx;
  let statusTextEl, routineStepsEl, timerEl;
  let resultPanelEl, scoreGlobalEl, scoreDetailsEl, coachCommentEl, swingLabelEl;
  let btnKeepRefEl, btnNextSwingEl, btnExitEl, restartBtnEl;
  let bigMsgEl;

  let state = JSW_STATE.IDLE;
  let mode = JSW_MODE.SWING;
  let routineConfig = { swing: DEFAULT_ROUTINES.swing, putt: DEFAULT_ROUTINES.putt };

  let sessionStartTime = null;
  let maxSessionDurationMs = 30000;

  let lastPose = null;
  let lastFullBodyOk = false;
  let addressStableSince = null;
  let playerInFrame = false;
  let playerOutOfFrameSince = null;
  let swingInProgress = false;
  let currentSwingIndex = 0;
  let swings = [];

  let referenceSwing = null;
  let customStartCamera = null;
  let currentClubType = "fer7";

  let captureCanvas = null;
  let captureCtx = null;
  let frameBuffer = [];
  const maxFrameBuffer = 12;

  let currentImpactContext = null;
  let loopId = null; // requestAnimationFrame handle

  // === INIT DOM ===
  function initJustSwing() {
    screenEl = $$("just-swing-screen");
    videoEl = $$("jsw-video");
    overlayEl = $$("jsw-overlay");
    bigMsgEl = $$("jsw-big-msg");

    if (!overlayEl || !videoEl) {
      console.warn("JustSwing: éléments vidéo/canvas manquants");
      return;
    }

    ctx = overlayEl.getContext("2d", { willReadFrequently: true });

    statusTextEl = $$("jsw-status-text");
    routineStepsEl = $$("jsw-routine-steps");
    timerEl = $$("jsw-timer");

    resultPanelEl = $$("jsw-result-panel");
    scoreGlobalEl = $$("jsw-score-global");
    scoreDetailsEl = $$("jsw-score-details");
    coachCommentEl = $$("jsw-coach-comment");
    swingLabelEl = $$("jsw-swing-label");

    btnKeepRefEl = $$("jsw-btn-keep-reference");
    btnNextSwingEl = $$("jsw-btn-next-swing");
    btnExitEl = $$("jsw-btn-exit");
    restartBtnEl = $$("jsw-restart");

    // Boutons panel résultat
    btnKeepRefEl?.addEventListener("click", () => {
      if (swings.length > 0) {
        referenceSwing = swings[swings.length - 1];
      }
      hideResultPanel();
    });

    btnNextSwingEl?.addEventListener("click", () => {
      hideResultPanel();
      restartLoopForNextSwing();
    });

    btnExitEl?.addEventListener("click", () => {
      stopSession();
    });

    // Bouton Recommencer
    restartBtnEl?.addEventListener("click", () => {
      startSession(mode);
    });

    // Canvas de capture pour la balle
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
    if (!overlayEl || !videoEl) return;
    overlayEl.width = videoEl.clientWidth || window.innerWidth;
    overlayEl.height = videoEl.clientHeight || window.innerHeight;
  }

  // Camera starter fourni par mediapipe-init.js
  function setCameraStarter(fn) {
    customStartCamera = fn;
  }

  function setClubType(clubType) {
    currentClubType = clubType;
  }

  // === SESSION ===
  async function startSession(selectedMode = JSW_MODE.SWING) {
    console.log("▶ JustSwing.startSession(", selectedMode, ")");
    mode = selectedMode;
    state = JSW_STATE.POSITIONING;

    swings = [];
    currentSwingIndex = 0;
    sessionStartTime = performance.now();
    swingInProgress = false;
    addressStableSince = null;
    playerOutOfFrameSince = performance.now();
    lastPose = null;
    lastFullBodyOk = false;
    frameBuffer = [];
    currentImpactContext = null;

    // UI
    resultPanelEl?.classList.add("hidden");
    if (screenEl) {
      screenEl.classList.remove("hidden");
      setHalo("red");
    }

    showBigMsg("Place-toi plein pied 👣", 1800);
    updateUIForState();

    // Cancel ancienne boucle si besoin
    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = null;
    }

    // Démarrage caméra
    if (customStartCamera) {
      try {
        await customStartCamera();
      } catch (e) {
        console.error("Erreur customStartCamera:", e);
      }
    } else {
      await defaultStartCamera();
    }

    // Nouvelle boucle
    loopId = requestAnimationFrame(mainLoop);
  }

  async function defaultStartCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();
    } catch (err) {
      console.error("Erreur caméra (fallback JustSwing)", err);
      if (statusTextEl) statusTextEl.textContent = "Impossible d'accéder à la caméra 😕";
    }
  }

  function stopSession() {
    console.log("⏹ JustSwing.stopSession()");
    state = JSW_STATE.IDLE;

    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = null;
    }

    // Stop flux vidéo si présent
    if (videoEl && videoEl.srcObject) {
      const tracks = videoEl.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoEl.srcObject = null;
    }

    if (screenEl) screenEl.classList.add("hidden");
    hideBigMsg();
  }

  // === MAIN LOOP ===
  function mainLoop(now) {
    if (state === JSW_STATE.IDLE) return;

    const elapsed = now - sessionStartTime;
    if (elapsed > maxSessionDurationMs) {
      if (statusTextEl) statusTextEl.textContent = "Fin de la session (30s).";
      state = JSW_STATE.REVIEW;
      showFinalSummaryIfNeeded();
      return;
    }

    updateTimer(elapsed);
    captureFrameForBall();
    drawOverlay();
    updateStateMachine(now);

    loopId = requestAnimationFrame(mainLoop);
  }

  function updateTimer(elapsedMs) {
    if (!timerEl) return;
    const sec = Math.floor(elapsedMs / 1000);
    const remaining = Math.max(0, 30 - sec);
    timerEl.textContent = `Temps restant : ${remaining}s`;
  }

  // === POSE FRAMES ===
  function onPoseFrame(poseLandmarks) {
    lastPose = poseLandmarks || null;

    const fullBodyOk = detectFullBody(poseLandmarks);
    lastFullBodyOk = fullBodyOk;

    const inFrame = !!poseLandmarks && poseLandmarks.length > 0;
    if (inFrame && !playerInFrame) {
      playerInFrame = true;
      playerOutOfFrameSince = null;
    } else if (!inFrame && playerInFrame) {
      playerInFrame = false;
      playerOutOfFrameSince = performance.now();
    }
  }

  // === STATE MACHINE ===
  function updateStateMachine(now) {
    switch (state) {
      case JSW_STATE.POSITIONING:
        handlePositioningState();
        break;
      case JSW_STATE.ROUTINE:
        handleRoutineState(now);
        break;
      case JSW_STATE.ADDRESS_READY:
        handleAddressReadyState(now);
        break;
      case JSW_STATE.SWING_CAPTURE:
        handleSwingCaptureState(now);
        break;
      case JSW_STATE.REVIEW:
        break;
    }
  }

  // 1) Positionnement plein pied
  function handlePositioningState() {
    if (!lastFullBodyOk) {
      setHalo("red");
      if (statusTextEl)
        statusTextEl.textContent = "Recule un peu, je dois te voir plein pied 👣";
      if (routineStepsEl) routineStepsEl.textContent = "";
      return;
    }
    // Full body OK -> routine
    setHalo("green");
    state = JSW_STATE.ROUTINE;
    showBigMsg("Parfait, je te vois 👌", 1200);
    if (statusTextEl)
      statusTextEl.textContent = "Lance ta routine à ton rythme.";
    showRoutineSteps();
  }

  // 2) Routine
  function handleRoutineState(now) {
    if (!lastFullBodyOk) {
      setHalo("orange");
      if (statusTextEl)
        statusTextEl.textContent =
          "Je te perds un peu… reviens plein cadre pour lancer ta routine.";
      return;
    }

    if (isAddressStable(lastPose)) {
      if (!addressStableSince) addressStableSince = now;
      const stableDuration = now - addressStableSince;
      if (stableDuration > 800) {
        state = JSW_STATE.ADDRESS_READY;
        showBigMsg("Adresse OK 🤝", 1000);
        if (statusTextEl)
          statusTextEl.textContent =
            "Adresse solide 🤝 Tu peux swinguer quand tu veux.";
      }
    } else {
      addressStableSince = null;
      if (statusTextEl)
        statusTextEl.textContent = "Mets-toi bien à l’adresse, prends ton temps.";
    }

    setHalo("green");
  }

  // 3) Adresse validée – on attend le swing
  function handleAddressReadyState(now) {
    setHalo("green");
    if (!lastFullBodyOk) {
      if (statusTextEl)
        statusTextEl.textContent =
          "Je te perds un peu… reviens plein cadre pour swinguer.";
      return;
    }

    if (detectSwingStart(lastPose)) {
      state = JSW_STATE.SWING_CAPTURE;
      swingInProgress = true;
      currentSwingIndex += 1;
      showBigMsg("Swing détecté 🔥", 800);
      if (statusTextEl)
        statusTextEl.textContent = `Swing #${currentSwingIndex} en cours…`;
      setHalo("blue");

      currentImpactContext = {
        framesAvantImpact: frameBuffer.slice(),
        framesApresImpact: [],
        clubType: currentClubType,
      };
    }
  }

  // 4) Swing capture
  function handleSwingCaptureState(now) {
    setHalo("blue");
    if (!lastPose) return;

    if (detectSwingEnd(lastPose)) {
      swingInProgress = false;
      state = JSW_STATE.REVIEW;
      setHalo("green");

      if (currentImpactContext) {
        currentImpactContext.framesApresImpact = frameBuffer.slice();
      }

      const swingData = computeSwingScore(mode, lastPose, currentImpactContext);
      swings.push(swingData);
      showSwingResult(swingData);
      showBigMsg("Regardons ce swing 👀", 1000);
    }
  }

  function restartLoopForNextSwing() {
    addressStableSince = null;
    currentImpactContext = null;
    if (!lastFullBodyOk) {
      state = JSW_STATE.POSITIONING;
      showBigMsg("Reprends ta place plein pied 👣", 1200);
    } else {
      state = JSW_STATE.ROUTINE;
      showBigMsg("On repart sur ta routine ⏱", 1200);
    }
    updateUIForState();
  }

  // === FULL BODY DETECTION ===
  function detectFullBody(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;

    const idx = { nose: 0, leftAnkle: 27, rightAnkle: 28 };
    const head = landmarks[idx.nose];
    const leftAnkle = landmarks[idx.leftAnkle];
    const rightAnkle = landmarks[idx.rightAnkle];

    if (!head || !leftAnkle || !rightAnkle) return false;

    const inBounds = (p) => p.x >= 0.02 && p.x <= 0.98 && p.y >= 0.02 && p.y <= 0.98;
    if (!inBounds(head) || !inBounds(leftAnkle) || !inBounds(rightAnkle)) return false;

    const height = Math.abs(head.y - Math.min(leftAnkle.y, rightAnkle.y));
    if (height < 0.4 || height > 0.95) return false;

    return true;
  }

  function isAddressStable(landmarks) {
    if (!landmarks) return false;
    return lastFullBodyOk;
  }

  // === Détection début/fin de swing (stub MVP) ===
  function detectSwingStart(landmarks) {
    if (!landmarks) return false;
    // TODO: remplacer par algo basé sur vitesse ou rotation
    return Math.random() < 0.01;
  }

  function detectSwingEnd(landmarks) {
    if (!landmarks) return false;
    // TODO: remplacer par détection finish stable
    return Math.random() < 0.02;
  }

  // === Scoring & angle ===
  function computeSwingScore(mode, impactPoseFrame, impactContext) {
    const routineScore = 17;
    const swingScore = 62;
    const regularityScore = 4;
    const total = routineScore + swingScore + regularityScore;

    const launch = estimateLaunchAngleHybrid(impactPoseFrame, impactContext);
    const comment = generateCoachComment(
      mode,
      routineScore,
      swingScore,
      regularityScore,
      total,
      launch
    );

    return {
      index: currentSwingIndex,
      mode,
      routineScore,
      swingScore,
      regularityScore,
      total,
      launchAngle: launch,
      comment,
      timestamp: Date.now(),
    };
  }

  function estimateLaunchAngleHybrid(impactPoseFrame, impactContext) {
    const ctxImpact = impactContext || {};
    const framesApresImpact = ctxImpact.framesApresImpact || [];
    const clubType = ctxImpact.clubType || currentClubType;

    let ballResult = null;
    if (framesApresImpact && framesApresImpact.length > 0) {
      ballResult = computeBallLaunchFromFrames(framesApresImpact);
    }

    if (ballResult && ballResult.confidence > 0.5) {
      return {
        angleDeg: ballResult.angleDeg,
        source: "ball",
        confidence: ballResult.confidence,
      };
    }

    const clubResult = estimateLaunchFromClubAndPose(clubType, impactPoseFrame);
    return {
      angleDeg: clubResult.angleDeg,
      source: "club",
      confidence: clubResult.confidence,
    };
  }

  function computeBallLaunchFromFrames(frames) {
    const points = [];
    for (let i = 0; i < Math.min(frames.length, 6); i++) {
      const frame = frames[i];
      const ball = detectBallCandidate(frame);
      if (ball) points.push({ x: ball.x, y: ball.y });
    }

    if (points.length < 3) return null;

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;
    const n = points.length;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;
    const denom = sumXX - n * meanX * meanX;
    if (Math.abs(denom) < 1e-6) return null;

    const a = (sumXY - n * meanX * meanY) / denom;
    const angleRad = Math.atan2(-a, 1);
    const angleDeg = (angleRad * 180) / Math.PI;

    return { angleDeg, confidence: 0.7 };
  }

  function detectBallCandidate(frame) {
    const { imageData, width, height } = frame;
    if (!imageData) return null;
    const data = imageData.data;

    let best = null;
    let bestBrightness = 0;

    for (let y = Math.floor(height * 0.4); y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const idx = (y * width + x) * 4;
        const r = data[idx],
          g = data[idx + 1],
          b = data[idx + 2];
        const brightness = (r + g + b) / 3;

        if (brightness > 230 && brightness > bestBrightness) {
          bestBrightness = brightness;
          best = { x, y };
        }
      }
    }
    return best;
  }

  function estimateLaunchFromClubAndPose(clubType, poseLandmarks) {
    const baseLoft = CLUB_BASE_LOFT[clubType] ?? 20;
    const shaftLeanDeg = estimateShaftLean(poseLandmarks);
    const angleAttackDeg = estimateAngleOfAttack(poseLandmarks);
    const dynamicLoft = baseLoft - 0.6 * shaftLeanDeg;
    const launchAngle = dynamicLoft + 0.5 * angleAttackDeg;
    return { angleDeg: launchAngle, confidence: 0.6 };
  }

  function estimateShaftLean(landmarks) {
    if (!landmarks) return 0;
    return 0;
  }

  function estimateAngleOfAttack(landmarks) {
    if (!landmarks) return 0;
    return 0;
  }

  function generateCoachComment(
    mode,
    routineScore,
    swingScore,
    regularityScore,
    total,
    launch
  ) {
    let base = "";
    if (total > 85)
      base =
        "Incroyable 🔥 Tu déroules une routine de pro et un swing hyper solide. Continue exactement comme ça.";
    else if (total > 70)
      base =
        "Très beau swing 👌 Ta routine t'aide vraiment. On peut encore gratter un peu de précision, mais c’est top.";
    else if (total > 55)
      base =
        "C’est propre, tu construis une base solide 💪 Concentre-toi sur la constance de ta routine et l’équilibre au finish.";
    else
      base =
        "Tu as le bon réflexe de t’entraîner 📈 On va stabiliser ta routine et clarifier un point technique à la fois.";

    let launchTxt = "";
    if (launch && typeof launch.angleDeg === "number") {
      const src =
        launch.source === "ball" ? "mesuré sur la balle" : "estimé via ton club";
      launchTxt = `\nAngle de décollage : ${launch.angleDeg.toFixed(
        1
      )}° (${src}).`;
    }

    return base + launchTxt;
  }

  // === FRAMES POUR BALLE ===
  function captureFrameForBall() {
    if (!captureCtx || !videoEl || videoEl.readyState < 2) return;

    const w = captureCanvas.width;
    const h = captureCanvas.height;
    captureCtx.drawImage(videoEl, 0, 0, w, h);
    const imageData = captureCtx.getImageData(0, 0, w, h);

    frameBuffer.push({ imageData, width: w, height: h });
    if (frameBuffer.length > maxFrameBuffer) frameBuffer.shift();
  }

  // === RESULT UI ===
  function showSwingResult(swingData) {
    if (swingLabelEl)
      swingLabelEl.textContent = `Swing #${swingData.index} — Mode ${
        swingData.mode === "swing" ? "Full swing" : "Putt"
      }`;
    if (scoreGlobalEl)
      scoreGlobalEl.textContent = `Score Parfect : ${swingData.total}/100`;
    if (scoreDetailsEl)
      scoreDetailsEl.textContent = `Routine : ${swingData.routineScore}/20 · Swing : ${swingData.swingScore}/70 · Régularité : ${swingData.regularityScore}/10`;
    if (coachCommentEl) coachCommentEl.textContent = swingData.comment;
    if (resultPanelEl) resultPanelEl.classList.remove("hidden");
  }

  function hideResultPanel() {
    resultPanelEl?.classList.add("hidden");
  }

  function showFinalSummaryIfNeeded() {
    if (swings.length === 0) {
      if (statusTextEl)
        statusTextEl.textContent =
          "Session terminée. Aucun swing détecté, on recommence la prochaine fois 😉";
      return;
    }
    const last = swings[swings.length - 1];
    showSwingResult(last);
  }

  // === UI / HALO / BIG MSG / ROUTINE / OVERLAY ===
  function updateUIForState() {
    switch (state) {
      case JSW_STATE.POSITIONING:
        if (statusTextEl) statusTextEl.textContent = "Positionne-toi plein pied 👣";
        if (routineStepsEl) routineStepsEl.textContent = "";
        break;
      case JSW_STATE.ROUTINE:
        if (statusTextEl) statusTextEl.textContent = "Lance ta routine à ton rythme.";
        showRoutineSteps();
        break;
      case JSW_STATE.ADDRESS_READY:
        if (statusTextEl)
          statusTextEl.textContent =
            "Adresse solide 🤝 Tu peux envoyer le swing quand tu veux.";
        break;
      case JSW_STATE.SWING_CAPTURE:
        if (statusTextEl)
          statusTextEl.textContent = `Swing #${currentSwingIndex} en cours…`;
        break;
      case JSW_STATE.REVIEW:
        if (statusTextEl) statusTextEl.textContent = "Regardons ce swing ensemble 👀";
        break;
    }
  }

  function showRoutineSteps() {
    if (!routineStepsEl) return;
    const steps = mode === JSW_MODE.SWING ? routineConfig.swing : routineConfig.putt;
    routineStepsEl.textContent = `Routine ${
      mode === "swing" ? "swing" : "putt"
    } : ${steps.join(" · ")}`;
  }

  function setHalo(color) {
    if (!screenEl) return;
    screenEl.classList.remove(
      "jsw-halo-red",
      "jsw-halo-orange",
      "jsw-halo-green",
      "jsw-halo-blue"
    );
    if (color === "red") screenEl.classList.add("jsw-halo-red");
    if (color === "orange") screenEl.classList.add("jsw-halo-orange");
    if (color === "green") screenEl.classList.add("jsw-halo-green");
    if (color === "blue") screenEl.classList.add("jsw-halo-blue");
  }

  function showBigMsg(txt, duration = 1200) {
    if (!bigMsgEl) return;
    bigMsgEl.textContent = txt;
    bigMsgEl.style.display = "block";
    if (duration > 0) {
      setTimeout(() => {
        if (bigMsgEl.textContent === txt) {
          bigMsgEl.style.display = "none";
        }
      }, duration);
    }
  }

  function hideBigMsg() {
    if (!bigMsgEl) return;
    bigMsgEl.style.display = "none";
  }

  function drawOverlay() {
    if (!ctx || !overlayEl) return;
    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);

    if (!lastPose) {
      drawGhostSilhouetteCenter();
      return;
    }
    drawPoseSkeleton(lastPose);
  }

  function drawGhostSilhouetteCenter() {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    const cx = overlayEl.width / 2;
    const top = overlayEl.height * 0.15;
    const bottom = overlayEl.height * 0.9;
    const mid = (top + bottom) / 2;
    ctx.beginPath();
    ctx.arc(cx, top + 30, 20, 0, Math.PI * 2);
    ctx.moveTo(cx, top + 50);
    ctx.lineTo(cx, mid);
    ctx.moveTo(cx, mid);
    ctx.lineTo(cx - 30, mid + 40);
    ctx.moveTo(cx, mid);
    ctx.lineTo(cx + 30, mid + 40);
    ctx.moveTo(cx, top + 70);
    ctx.lineTo(cx - 30, top + 100);
    ctx.moveTo(cx, top + 70);
    ctx.lineTo(cx + 30, top + 100);
    ctx.stroke();
    ctx.restore();
  }

  function drawPoseSkeleton(landmarks) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;

    const w = overlayEl.width;
    const h = overlayEl.height;

    const p = (i) => {
      const lm = landmarks[i];
      if (!lm) return null;
      return { x: lm.x * w, y: lm.y * h };
    };

    const segments = [
      [11, 12],
      [11, 23],
      [12, 24],
      [23, 24],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [23, 25],
      [25, 27],
      [24, 26],
      [26, 28],
    ];

    segments.forEach(([a, b]) => {
      const pa = p(a);
      const pb = p(b);
      if (!pa || !pb) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });

    ctx.restore();
  }

  // === Routine config public ===
  function setRoutineConfig(newConfig) {
    routineConfig = {
      swing: newConfig.swing || DEFAULT_ROUTINES.swing,
      putt: newConfig.putt || DEFAULT_ROUTINES.putt,
    };
  }

  function getReferenceSwing() {
    return referenceSwing;
  }

  // API publique
  return {
    initJustSwing,
    startSession,
    stopSession,
    onPoseFrame,
    setRoutineConfig,
    getReferenceSwing,
    setCameraStarter,
    setClubType,
  };
})();

// Initialisation DOM
document.addEventListener("DOMContentLoaded", () => {
  if (typeof JustSwing !== "undefined" && JustSwing.initJustSwing) {
    JustSwing.initJustSwing();
  }
});
