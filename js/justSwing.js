// === JUST SWING – Parfect.golfr – VERSION COMPLÈTE MVP+ ===
//
// Ce module gère :
// - l'UX Just Swing (halo, messages, routine, etc.)
// - la détection plein pied (full body)
// - la machine à états (POSITIONING -> ROUTINE -> ADDRESS_READY -> SWING_CAPTURE -> REVIEW)
// - la structure de scoring (routine / swing / régularité)
// - la structure pour angle de décollage hybride (balle + club)
//
// Il est pensé pour être branché avec MediaPipe Pose via : JustSwing.onPoseFrame(landmarks)
// Et la caméra via : JustSwing.setCameraStarter(fnAsync)
//
// API principale :
//   JustSwing.initJustSwing()
//   JustSwing.startSession("swing" | "putt")
//   JustSwing.stopSession()
//   JustSwing.onPoseFrame(poseLandmarks)
//   JustSwing.setRoutineConfig({ swing: [...], putt: [...] })
//   JustSwing.setCameraStarter(fnAsync)
//   JustSwing.setClubType("fer7" / "driver" / etc.)
//   JustSwing.getReferenceSwing()

// Helper
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

// Types de session
const JSW_MODE = {
  SWING: "swing",
  PUTT: "putt",
};

// Routines par défaut (l'utilisateur pourra les customiser plus tard)
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
};

// Loft statique approximatif pour quelques clubs (°)
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
  let btnKeepRefEl, btnNextSwingEl, btnExitEl;

  let state = JSW_STATE.IDLE;
  let mode = JSW_MODE.SWING; // "swing" ou "putt"
  let routineConfig = { swing: DEFAULT_ROUTINES.swing, putt: DEFAULT_ROUTINES.putt };

  let sessionStartTime = null;
  let maxSessionDurationMs = 30000; // 30s

  let lastPose = null;
  let lastFullBodyOk = false;
  let addressStableSince = null;
  let playerInFrame = false;
  let playerOutOfFrameSince = null;
  let swingInProgress = false;
  let currentSwingIndex = 0;
  let swings = []; // { index, total, etc. }

  let referenceSwing = null;
  let customStartCamera = null; // fonction fournie par mediapipe-init.js
  let currentClubType = "fer7"; // valeur par défaut

  // Pour la détection d'angle de balle (MVP)
  let captureCanvas = null;
  let captureCtx = null;
  let frameBuffer = [];
  const maxFrameBuffer = 12;
  let currentImpactContext = null;

  // === INIT ===
  function initJustSwing() {
    screenEl = $$("just-swing-screen");
    videoEl = $$("jsw-video");
    overlayEl = $$("jsw-overlay");
    if (!overlayEl) return;
    ctx = overlayEl.getContext("2d");

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

    // Panel résultat
    if (btnKeepRefEl)
      btnKeepRefEl.addEventListener("click", () => {
        if (swings.length > 0) {
          referenceSwing = swings[swings.length - 1];
        }
        hideResultPanel();
      });

    if (btnNextSwingEl)
      btnNextSwingEl.addEventListener("click", () => {
        hideResultPanel();
        restartLoopForNextSwing();
      });

    if (btnExitEl)
      btnExitEl.addEventListener("click", () => {
        stopSession();
      });

    window.addEventListener("resize", resizeOverlay);
    resizeOverlay();

    // Canvas de capture (pour frames balle)
    captureCanvas = document.createElement("canvas");
    captureCanvas.width = 160;
    captureCanvas.height = 160;
    captureCanvas.style.display = "none";
    captureCtx = captureCanvas.getContext("2d");
    document.body.appendChild(captureCanvas);
  }

  function resizeOverlay() {
    if (!overlayEl || !videoEl) return;
    overlayEl.width = videoEl.clientWidth || window.innerWidth;
    overlayEl.height = videoEl.clientHeight || window.innerHeight;
  }

  // Permet à mediapipe-init.js de fournir une fonction de démarrage caméra custom
  function setCameraStarter(fn) {
    customStartCamera = fn;
  }

  // Permet de définir le club courant (impacte l'estimation de l'angle de décollage)
  function setClubType(clubType) {
    currentClubType = clubType;
  }

  // === PUBLIC: démarrer une session Just Swing ===
  async function startSession(selectedMode = JSW_MODE.SWING) {
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

    // Montrer l'écran
    if (screenEl) screenEl.classList.remove("hidden");

    // Démarrer la caméra (via fonction custom si présente)
    if (customStartCamera) {
      await customStartCamera();
    } else {
      await defaultStartCamera();
    }

    updateUIForState();
    requestAnimationFrame(mainLoop);
  }

  async function defaultStartCamera() {
    // Fallback simplifié : getUserMedia + pas de MediaPipe (juste vidéo)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();
    } catch (err) {
      console.error("Erreur caméra (fallback)", err);
      if (statusTextEl) statusTextEl.textContent = "Impossible d'accéder à la caméra 😕";
    }
  }

  function stopSession() {
    state = JSW_STATE.IDLE;
    // Stop stream
    if (videoEl && videoEl.srcObject) {
      const tracks = videoEl.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoEl.srcObject = null;
    }
    if (screenEl) screenEl.classList.add("hidden");
  }

  // === MAIN LOOP ===
  function mainLoop(now) {
    if (state === JSW_STATE.IDLE) return;

    const elapsed = now - sessionStartTime;
    if (elapsed > maxSessionDurationMs) {
      // Fin de session automatique
      if (statusTextEl) statusTextEl.textContent = "Fin de la session (30s).";
      state = JSW_STATE.REVIEW;
      showFinalSummaryIfNeeded();
      return;
    }

    updateTimer(elapsed);
    captureFrameForBall();  // enregistre un petit buffer d'images
    drawOverlay();
    updateStateMachine(now);

    requestAnimationFrame(mainLoop);
  }

  function updateTimer(elapsedMs) {
    if (!timerEl) return;
    const sec = Math.floor(elapsedMs / 1000);
    const remaining = Math.max(0, 30 - sec);
    timerEl.textContent = `Temps restant : ${remaining}s`;
  }

  // === Pose frames (à appeler depuis MediaPipe) ===
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

  // === State machine principal ===
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
        // Rien en continu
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
    // Full body OK -> on passe à la routine
    setHalo("green");
    state = JSW_STATE.ROUTINE;
    if (statusTextEl)
      statusTextEl.textContent = "Parfait, je te vois 👌 Lance ta routine.";
    showRoutineSteps();
  }

  // 2) Routine (détection adresse stable)
  function handleRoutineState(now) {
    if (!lastFullBodyOk) {
      setHalo("orange");
      if (statusTextEl)
        statusTextEl.textContent =
          "Je te perds un peu… reviens plein cadre pour lancer ta routine.";
      return;
    }

    // Adresse stable ?
    if (isAddressStable(lastPose)) {
      if (!addressStableSince) addressStableSince = now;
      const stableDuration = now - addressStableSince;
      if (stableDuration > 800) {
        // Adresse validée
        state = JSW_STATE.ADDRESS_READY;
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

  // 3) Adresse validée – on attend le début du swing
  function handleAddressReadyState(now) {
    setHalo("green");
    if (!lastFullBodyOk) {
      if (statusTextEl)
        statusTextEl.textContent =
          "Je te perds un peu… reviens plein cadre pour swinguer.";
      return;
    }

    // Détection début swing (stub à affiner)
    if (detectSwingStart(lastPose)) {
      state = JSW_STATE.SWING_CAPTURE;
      swingInProgress = true;
      currentSwingIndex += 1;
      if (statusTextEl)
        statusTextEl.textContent = `Swing #${currentSwingIndex} en cours…`;
      setHalo("blue");

      // Snapshot avant impact pour angle balle
      currentImpactContext = {
        framesAvantImpact: frameBuffer.slice(),
        framesApresImpact: [],
        clubType: currentClubType,
      };
    }
  }

  // 4) Swing capture – on attend le finish
  function handleSwingCaptureState(now) {
    setHalo("blue");
    if (!lastPose) return;

    // Détection fin de swing (stub à affiner)
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
    }
  }

  function restartLoopForNextSwing() {
    addressStableSince = null;
    currentImpactContext = null;
    if (!lastFullBodyOk) {
      state = JSW_STATE.POSITIONING;
    } else {
      state = JSW_STATE.ROUTINE;
    }
    updateUIForState();
  }

  // === Détection Full Body ===
  function detectFullBody(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;

    // indices MediaPipe Pose classiques
    const idx = {
      nose: 0,
      leftAnkle: 27,
      rightAnkle: 28,
    };
    const head = landmarks[idx.nose];
    const leftAnkle = landmarks[idx.leftAnkle];
    const rightAnkle = landmarks[idx.rightAnkle];

    if (!head || !leftAnkle || !rightAnkle) return false;

    // In bounds
    const inBounds = (p) =>
      p.x >= 0.02 && p.x <= 0.98 && p.y >= 0.02 && p.y <= 0.98;

    if (!inBounds(head) || !inBounds(leftAnkle) || !inBounds(rightAnkle))
      return false;

    // Taille relative
    const height = Math.abs(head.y - Math.min(leftAnkle.y, rightAnkle.y));
    if (height < 0.4 || height > 0.95) {
      return false;
    }

    return true;
  }

  // === Détection address stable (MVP) ===
  function isAddressStable(landmarks) {
    if (!landmarks) return false;
    // Pour l'instant : plein pied = adresse "OK"
    // Tu pourras affiner en suivant la variabilité de certains points.
    return lastFullBodyOk;
  }

  // === Détection début de swing (stub MVP) ===
  function detectSwingStart(landmarks) {
    if (!landmarks) return false;
    // À remplacer par un vrai calcul de vitesse/angle (hands/club).
    // Stub : random faible prob pour test UX
    return Math.random() < 0.01;
  }

  // === Détection fin de swing (stub MVP) ===
  function detectSwingEnd(landmarks) {
    if (!landmarks) return false;
    // À remplacer par détection d'une pose de finish stable.
    return Math.random() < 0.02;
  }

  // === Scoring du swing + angle de décollage ===
  function computeSwingScore(mode, impactPoseFrame, impactContext) {
    const routineScore = 17; // /20 placeholder
    const swingScore = 62; // /70 placeholder
    const regularityScore = 4; // /10 placeholder
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
      launchAngle: launch, // { angleDeg, source, confidence }
      comment,
      timestamp: Date.now(),
    };
  }

  // Hybride : balle d'abord, fallback club/pose
  function estimateLaunchAngleHybrid(impactPoseFrame, impactContext) {
    const ctx = impactContext || {};
    const framesApresImpact = ctx.framesApresImpact || [];
    const clubType = ctx.clubType || currentClubType;

    // 1) Tentative via trajectoire de balle
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

    // 2) Fallback via club + pose
    const clubResult = estimateLaunchFromClubAndPose(clubType, impactPoseFrame);
    return {
      angleDeg: clubResult.angleDeg,
      source: "club",
      confidence: clubResult.confidence,
    };
  }

  // === Méthode 1 : angle via trajectoire de balle (MVP) ===
  function computeBallLaunchFromFrames(frames) {
    const points = [];

    for (let i = 0; i < Math.min(frames.length, 6); i++) {
      const frame = frames[i];
      const ball = detectBallCandidate(frame);
      if (ball) {
        points.push({ x: ball.x, y: ball.y });
      }
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

    const a = (sumXY - n * meanX * meanY) / denom; // pente
    // Dans l'image, y augmente vers le bas -> on inverse pour angle
    const angleRad = Math.atan2(-a, 1);
    const angleDeg = (angleRad * 180) / Math.PI;

    return {
      angleDeg,
      confidence: 0.7,
    };
  }

  // Détection très naïve d'un point très clair (balle) dans l'image
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

        if (brightness > 230) {
          if (brightness > bestBrightness) {
            bestBrightness = brightness;
            best = { x, y };
          }
        }
      }
    }

    return best;
  }

  // === Méthode 2 : estimation via club + pose (MVP) ===
  function estimateLaunchFromClubAndPose(clubType, poseLandmarks) {
    const baseLoft = CLUB_BASE_LOFT[clubType] ?? 20;

    const shaftLeanDeg = estimateShaftLean(poseLandmarks); // positif = mains en avant
    const angleAttackDeg = estimateAngleOfAttack(poseLandmarks); // positif = montant

    const dynamicLoft = baseLoft - 0.6 * shaftLeanDeg;
    const launchAngle = dynamicLoft + 0.5 * angleAttackDeg;

    return {
      angleDeg: launchAngle,
      confidence: 0.6,
    };
  }

  // Stubs à affiner (pour l'instant neutres)
  function estimateShaftLean(landmarks) {
    if (!landmarks) return 0;
    return 0;
  }

  function estimateAngleOfAttack(landmarks) {
    if (!landmarks) return 0;
    return 0;
  }

  // === Commentaire coach ===
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
        launch.source === "ball"
          ? "mesuré sur la balle"
          : "estimé via ton club";
      launchTxt = `\nAngle de décollage : ${launch.angleDeg.toFixed(
        1
      )}° (${src}).`;
    }

    return base + launchTxt;
  }

  // === Capture de frames pour la balle ===
  function captureFrameForBall() {
    if (!captureCtx || !videoEl || videoEl.readyState < 2) return;

    const w = captureCanvas.width;
    const h = captureCanvas.height;
    captureCtx.drawImage(videoEl, 0, 0, w, h);
    const imageData = captureCtx.getImageData(0, 0, w, h);

    frameBuffer.push({ imageData, width: w, height: h });
    if (frameBuffer.length > maxFrameBuffer) {
      frameBuffer.shift();
    }
  }

  // === AFFICHAGE RESULTAT SWING ===
  function showSwingResult(swingData) {
    if (swingLabelEl)
      swingLabelEl.textContent = `Swing #${swingData.index} — Mode ${
        swingData.mode === "swing" ? "Full swing" : "Putt"
      }`;
    if (scoreGlobalEl)
      scoreGlobalEl.textContent = `Score Parfect : ${swingData.total}/100`;
    if (scoreDetailsEl)
      scoreDetailsEl.textContent = `Routine : ${swingData.routineScore}/20 · Swing : ${swingData.swingScore}/70 · Régularité : ${swingData.regularityScore}/10`;

    if (coachCommentEl) {
      coachCommentEl.textContent = swingData.comment;
    }

    if (resultPanelEl) resultPanelEl.classList.remove("hidden");
  }

  function hideResultPanel() {
    if (resultPanelEl) resultPanelEl.classList.add("hidden");
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

  // === UI / HALO / ROUTINE STEPS / OVERLAY ===
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
    ctx.arc(cx, top + 30, 20, 0, Math.PI * 2); // tête
    ctx.moveTo(cx, top + 50);
    ctx.lineTo(cx, mid); // tronc
    ctx.moveTo(cx, mid);
    ctx.lineTo(cx - 30, mid + 40); // jambe gauche
    ctx.moveTo(cx, mid);
    ctx.lineTo(cx + 30, mid + 40); // jambe droite
    ctx.moveTo(cx, top + 70);
    ctx.lineTo(cx - 30, top + 100); // bras gauche
    ctx.moveTo(cx, top + 70);
    ctx.lineTo(cx + 30, top + 100); // bras droit
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
      [11, 12], // épaules
      [11, 23],
      [12, 24],
      [23, 24], // bassin
      [11, 13],
      [13, 15], // bras gauche
      [12, 14],
      [14, 16], // bras droit
      [23, 25],
      [25, 27], // jambe gauche
      [24, 26],
      [26, 28], // jambe droite
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
