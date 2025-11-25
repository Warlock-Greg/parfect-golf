// === JUST SWING – Parfect.golfr – v1 scoring + Parfect + Drills ===
// API exposée :
//   JustSwing.initJustSwing()
//   JustSwing.startSession("swing" | "putt" | "approche")
//   JustSwing.stopSession()
//   JustSwing.onPoseFrame(poseLandmarks)
//   JustSwing.setClubType(clubType)
//   JustSwing.getReferenceSwing()

// Helper DOM local
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
  APPROCHE: "approche",
};

// Routines par défaut (simple pour l’instant)
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
  wedge: 50,
};

// Petit catalogue d’exos de base
const JSW_DRILLS = [
  {
    id: "routine_3_steps",
    title: "Routine en 3 étapes",
    focusTags: ["routine"],
    description:
      "Respiration profonde, visualisation de la trajectoire, alignement. Refais ce trio avant chaque balle.",
    durationMin: 5,
  },
  {
    id: "finish_balance",
    title: "Finish en équilibre",
    focusTags: ["balance_finish"],
    description:
      "Tiens ton finish 3 secondes sans bouger après chaque swing. 10 répétitions d’affilée.",
    durationMin: 10,
  },
  {
    id: "launch_control",
    title: "Contrôle de trajectoire",
    focusTags: ["launch_control", "approche"],
    description:
      "Avec un wedge ou fer court, envoie 10 balles sous une hauteur imaginaire (sous les arbres).",
    durationMin: 10,
  },
];

// === MODULE PRINCIPAL ===
const JustSwing = (() => {
  let screenEl, videoEl, overlayEl, ctx;
  let statusTextEl, routineStepsEl, timerEl;
  let resultPanelEl, scoreGlobalEl, scoreDetailsEl, coachCommentEl, swingLabelEl;
  let drillsEl;
  let btnKeepRefEl, btnNextSwingEl, btnExitEl, restartBtnEl;
  let bigMsgEl;

  let state = JSW_STATE.IDLE;
  let mode = JSW_MODE.SWING;
  let routineConfig = {
    swing: DEFAULT_ROUTINES.swing,
    putt: DEFAULT_ROUTINES.putt,
    approche: DEFAULT_ROUTINES.approche,
  };

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
  let currentClubType = "fer7";

  let captureCanvas = null;
  let captureCtx = null;
  let frameBuffer = [];
  const maxFrameBuffer = 12;

  let currentImpactContext = null;
  let loopId = null; // requestAnimationFrame


  function showBigMessage(text) {
    if (!bigMsgEl) return;
    bigMsgEl.textContent = text;
    bigMsgEl.style.opacity = "1";
  }

  function hideBigMessage() {
    if (!bigMsgEl) return;
    bigMsgEl.style.opacity = "0";
    bigMsgEl.textContent = "";
  }

 // ⚠️ IMPORTANT :→ on inverse x
  function drawPoseSkeleton(landmarks) {
  if (!landmarks || !landmarks.length) return;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;

  const w = overlayEl.width;
  const h = overlayEl.height;

  // ❗ IMPORTANT : on NE retourne PLUS x
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

  // petit point sur le nez pour debug visuel
  const nose = p(0);
  if (nose) {
    ctx.beginPath();
    ctx.arc(nose.x, nose.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,255,153,0.9)";
    ctx.fill();
  }

  ctx.restore();
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
    drillsEl = $$("jsw-drills");

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

    

    // Bouton Recommencer (reboot session)
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

  // === PUBLIC : démarrer une session Just Swing ===
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
    currentImpactContext = null;

    if (screenEl) screenEl.classList.remove("hidden");
    document.body.classList.add("jsw-fullscreen");

    updateUIForState();
    showBigMessage("Place-toi plein pied 👣 au centre de l’écran.");

    if (loopId) cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(mainLoop);
  }

  function stopSession() {
    state = JSW_STATE.IDLE;
    if (screenEl) screenEl.classList.add("hidden");
    document.body.classList.remove("jsw-fullscreen");
    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = null;
    }
    hideBigMessage();
    hideResultPanel();
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

  // === Pose frames (appelé par mediapipe-init.js) ===
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

  // === State machine ===
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
        statusTextEl.textContent = "Recule un peu, je dois te voir des pieds à la tête 👣";
      if (routineStepsEl) routineStepsEl.textContent = "";
      showBigMessage("Recule légèrement jusqu’à ce que je te voie en entier.");
      return;
    }

    setHalo("green");
    hideBigMessage();
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
      showBigMessage("Reviens au centre, plein pied.");
      return;
    }

    if (isAddressStable(lastPose)) {
      if (!addressStableSince) addressStableSince = now;
      const stableDuration = now - addressStableSince;
      if (stableDuration > 800) {
        state = JSW_STATE.ADDRESS_READY;
        if (statusTextEl)
          statusTextEl.textContent =
            "Adresse solide 🤝 Tu peux swinguer quand tu veux.";
        showBigMessage("Adresse OK ✅ Envoie le swing quand tu veux.");
      }
    } else {
      addressStableSince = null;
      if (statusTextEl)
        statusTextEl.textContent = "Mets-toi bien à l’adresse, prends ton temps.";
      showBigMessage("Prends ton temps pour t’installer à l’adresse.");
    }

    setHalo("green");
  }

  // 3) Adresse validée – en attente du GO swing
  function handleAddressReadyState(now) {
    setHalo("green");
    if (!lastFullBodyOk) {
      if (statusTextEl)
        statusTextEl.textContent =
          "Je te perds un peu… reviens plein cadre pour swinguer.";
      showBigMessage("Reviens bien au centre pour envoyer le swing.");
      return;
    }

    hideBigMessage();

    if (detectSwingStart(lastPose)) {
      state = JSW_STATE.SWING_CAPTURE;
      swingInProgress = true;
      currentSwingIndex += 1;
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

  // 4) Swing capture – attente du finish
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

      // Historique JustSwing
      if (window.JustSwingHistory?.pushSwing) {
        window.JustSwingHistory.pushSwing(swingData);
      }

      showSwingResult(swingData);
    }
  }

  function restartLoopForNextSwing() {
    addressStableSince = null;
    currentImpactContext = null;
    hideBigMessage();
    if (!lastFullBodyOk) {
      state = JSW_STATE.POSITIONING;
      showBigMessage("On recommence 👌 Reviens plein pied au centre.");
    } else {
      state = JSW_STATE.ROUTINE;
      showBigMessage("Reprends ta routine à ton rythme.");
    }
    updateUIForState();
  }

  // === Détection Full Body ===
  function detectFullBody(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;

    const idx = { nose: 0, leftAnkle: 27, rightAnkle: 28 };
    const head = landmarks[idx.nose];
    const leftAnkle = landmarks[idx.leftAnkle];
    const rightAnkle = landmarks[idx.rightAnkle];

    if (!head || !leftAnkle || !rightAnkle) return false;

    const inBounds = (p) =>
      p.x >= 0.02 && p.x <= 0.98 && p.y >= 0.02 && p.y <= 0.98;

    if (!inBounds(head) || !inBounds(leftAnkle) || !inBounds(rightAnkle))
      return false;

    const height = Math.abs(head.y - Math.min(leftAnkle.y, rightAnkle.y));
    if (height < 0.4 || height > 0.95) {
      return false;
    }

    return true;
  }

  // === Détection address stable (MVP) ===
  function isAddressStable(landmarks) {
    if (!landmarks) return false;
    // Pour l’instant : plein pied = adresse OK
    return lastFullBodyOk;
  }

  // === Détection début de swing (MVP amélioré léger) ===
  function detectSwingStart(landmarks) {
    if (!landmarks) return false;
    // MVP : on regarde la vitesse des poignets (approx) sur quelques frames
    // Pour l’instant on garde simple + un peu de random pour tester l’UX
    return Math.random() < 0.015;
  }

  // === Détection fin de swing (MVP) ===
  function detectSwingEnd(landmarks) {
    if (!landmarks) return false;
    // Idem : MVP simple, à raffiner plus tard
    return Math.random() < 0.02;
  }

  // === Scoring du swing + angle de décollage ===
  function computeSwingScore(mode, impactPoseFrame, impactContext) {
    // Stub MVP : on part d’un total global et on “répartit” en phases
    const routineScore = lastFullBodyOk ? 15 + Math.round(Math.random() * 5) : 10;
    const swingScore = 50 + Math.round(Math.random() * 20);
    const regularityScore = 3 + Math.round(Math.random() * 7);

    const total = routineScore + swingScore + regularityScore;

    // Phases (pour futur détail) — ici juste réparties
    const phaseScores = {
      address: clamp(Math.round(routineScore * 0.5), 0, 10),
      backswing: clamp(Math.round(swingScore * 0.2 / 2), 0, 10),
      top: clamp(Math.round(swingScore * 0.15 / 2), 0, 10),
      downswing: clamp(Math.round(swingScore * 0.3 / 2), 0, 10),
      impact: clamp(Math.round(swingScore * 0.35 / 2), 0, 10),
      release: clamp(Math.round(regularityScore * 0.4), 0, 10),
      finish: clamp(Math.round(regularityScore * 0.6), 0, 10),
    };

    // Tags d’issues basiques en fonction de la note
    const detectedIssues = [];
    if (routineScore < 14) detectedIssues.push("routine");
    if (phaseScores.finish < 6) detectedIssues.push("balance_finish");
    if (mode === JSW_MODE.APPROCHE && swingScore < 60)
      detectedIssues.push("launch_control");

    const launch = estimateLaunchAngleHybrid(impactPoseFrame, impactContext);

    const routineRespected = routineScore >= 14;
    const parfectEarned = routineRespected && total >= 75 ? 1 : 0;

    const comment = generateCoachComment(
      mode,
      routineScore,
      swingScore,
      regularityScore,
      total,
      launch,
      detectedIssues
    );

    const swingData = {
      index: currentSwingIndex,
      mode,
      club: currentClubType,
      routineScore,
      swingScore,
      regularityScore,
      total,
      launchAngle: launch,
      phaseScores,
      detectedIssues,
      routineRespected,
      parfectEarned,
      isReference: false,
      timestamp: Date.now(),
    };

    // Cagnotte Parfect
    if (parfectEarned > 0) {
      awardParfects(parfectEarned);
    }

    return swingData;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // Hybride : balle d'abord, fallback club/pose
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

  // Angle via trajectoire de balle (MVP)
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

    const a = (sumXY - n * meanX * meanY) / denom;
    const angleRad = Math.atan2(-a, 1);
    const angleDeg = (angleRad * 180) / Math.PI;

    return { angleDeg, confidence: 0.7 };
  }

  // Pixel très clair (balle) dans l’image
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

  // Estimation via club + pose (MVP)
  function estimateLaunchFromClubAndPose(clubType, poseLandmarks) {
    const baseLoft = CLUB_BASE_LOFT[clubType] ?? 20;
    const shaftLeanDeg = 0;
    const angleAttackDeg = 0;
    const dynamicLoft = baseLoft - 0.6 * shaftLeanDeg;
    const launchAngle = dynamicLoft + 0.5 * angleAttackDeg;
    return { angleDeg: launchAngle, confidence: 0.6 };
  }

  // === Commentaire coach + DRILLS ===
  function generateCoachComment(
    mode,
    routineScore,
    swingScore,
    regularityScore,
    total,
    launch,
    detectedIssues
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

    // Ajout des issues pour feed coach IA plus tard
    if (detectedIssues?.length) {
      launchTxt += `\nPoints à travailler : ${detectedIssues
        .map((t) => t.replace("_", " "))
        .join(", ")}.`;
    }

    return base + launchTxt;
  }

  // Mini moteur d’exos local pour la v1
  function coachSuggestDrills(swingData) {
    const issues = swingData.detectedIssues || [];
    const picked = [];

    // 1) Routine
    if (issues.includes("routine")) {
      const d = JSW_DRILLS.find((d) => d.id === "routine_3_steps");
      if (d) picked.push(d);
    }
    // 2) Balance finish
    if (issues.includes("balance_finish")) {
      const d = JSW_DRILLS.find((d) => d.id === "finish_balance");
      if (d) picked.push(d);
    }
    // 3) Approche / launch
    if (issues.includes("launch_control")) {
      const d = JSW_DRILLS.find((d) => d.id === "launch_control");
      if (d) picked.push(d);
    }

    // Fallback : un exo de base si rien match
    if (!picked.length) {
      picked.push(JSW_DRILLS[0]);
    }

    return picked.slice(0, 2);
  }

  // === Capture de frames ===
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

 // === AFFICHAGE RESULTAT SWING (version améliorée) ===
function showSwingResult(swingData) {

  // --- EN-TÊTE ---
  if (swingLabelEl) {
    swingLabelEl.textContent =
      `Swing #${swingData.index} — ${
        swingData.mode === "swing"
          ? "Full swing"
          : swingData.mode === "putt"
          ? "Putt"
          : "Approche"
      } (${swingData.club})`;
  }

  // --- SCORE GLOBAL ---
  if (scoreGlobalEl) {
    scoreGlobalEl.textContent = `Score Parfect : ${swingData.total}/100`;
  }

  // --- SCORE DÉTAILLÉ ---
  if (scoreDetailsEl) {
    scoreDetailsEl.textContent =
      `Routine : ${swingData.routineScore}/20 · ` +
      `Swing : ${swingData.swingScore}/70 · ` +
      `Régularité : ${swingData.regularityScore}/10`;
  }

  // --- COMMENTAIRE COACH ---
  if (coachCommentEl) {
    coachCommentEl.textContent = swingData.comment;
  }

  // --- EXOS ---
  const drills = coachSuggestDrills(swingData);
  if (drillsEl) {
    drillsEl.innerHTML = "";
    const title = document.createElement("div");
    title.style.fontWeight = "600";
    title.style.marginTop = "8px";
    title.textContent = "🧪 Exos conseillés :";
    drillsEl.appendChild(title);

    drills.forEach((d) => {
      const line = document.createElement("div");
      line.style.fontSize = "0.8rem";
      line.style.marginTop = "4px";
      line.textContent = `• ${d.title} (${d.durationMin} min) — ${d.description}`;
      drillsEl.appendChild(line);
    });
  }

  // --- ACTIONS ADDONS (Log + Replay + Référence) ---
  const actionsEl = document.getElementById("jsw-result-actions");
  if (actionsEl) {
    actionsEl.innerHTML = "";

    // 📊 Log détaillé
    const logBtn = document.createElement("button");
    logBtn.textContent = "📊 Log swing";
    logBtn.className = "jsw-btn-secondary";
    logBtn.onclick = () => window.JustSwingLog?.show(swingData);
    actionsEl.appendChild(logBtn);

    // 🎥 Replay
    const replayBtn = document.createElement("button");
    replayBtn.textContent = "🎥 Replay";
    replayBtn.className = "jsw-btn-secondary";
    replayBtn.onclick = () => window.JustSwingReplay?.show(swingData);
    actionsEl.appendChild(replayBtn);

    // ⭐ Définir comme swing de référence
    const refBtn = document.createElement("button");
    refBtn.textContent = "⭐ Référence";
    refBtn.className = "jsw-btn-secondary";
    refBtn.onclick = () => {
      referenceSwing = swingData;
      refBtn.textContent = "✔ Référence définie";
    };
    actionsEl.appendChild(refBtn);
  }

  // --- COACH IA SI PRÉSENT ---
  if (typeof window.appendCoachMessage === "function") {
    window.appendCoachMessage(
      `📊 Swing #${swingData.index} — ${swingData.total}/100.\n` +
        `Routine ${swingData.routineScore}/20, swing ${swingData.swingScore}/70, régularité ${swingData.regularityScore}/10.`
    );

    const drillsText = drills
      .map((d) => `• ${d.title} (${d.durationMin} min)`)
      .join("\n");
    window.appendCoachMessage(`🧪 Exos conseillés :\n${drillsText}`);

    if (swingData.parfectEarned > 0) {
      window.appendCoachMessage(
        `💚 Parfect gagné (routine OK + score ${swingData.total}/100)`
      );
    }
  }

  // --- BADGE PARFECT ---
  if (swingData.parfectEarned > 0) {
    // ton awardParfects est déjà appelé dans computeSwingScore()
  }

  // --- AFFICHAGE PANEL ---
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
    const steps =
      mode === JSW_MODE.SWING
        ? routineConfig.swing
        : mode === JSW_MODE.PUTT
        ? routineConfig.putt
        : routineConfig.approche;
    routineStepsEl.textContent = `Routine ${
      mode === "swing" ? "swing" : mode === "putt" ? "putt" : "approche"
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

  

 

  // Parfect counter (badge global)
  function awardParfects(count) {
    const key = "parfect_total";
    let current = 0;
    try {
      current = parseInt(localStorage.getItem(key) || "0", 10);
    } catch (e) {
      current = 0;
    }
    const updated = current + count;
    try {
      localStorage.setItem(key, String(updated));
    } catch (e) {}

    const counter = document.getElementById("parfect-counter");
    if (counter) {
      const plural = updated > 1 ? "s" : "";
      counter.textContent = `💚 ${updated} Parfect${plural} collecté${plural}`;
      counter.classList.add("flash");
      setTimeout(() => counter.classList.remove("flash"), 600);
    }
  }

  // === Routine config public (placeholder pour plus tard) ===
  function setRoutineConfig(newConfig) {
    routineConfig = {
      swing: newConfig.swing || DEFAULT_ROUTINES.swing,
      putt: newConfig.putt || DEFAULT_ROUTINES.putt,
      approche: newConfig.approche || DEFAULT_ROUTINES.approche,
    };
  }

  function getReferenceSwing() {
    return referenceSwing;
  }

  function setClubType(clubType) {
    currentClubType = clubType;
  }

    // --- ROUTINE MODALE (connexion UI) ---
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "jsw-open-routine-modal") {
      showRoutineModal();
    }
  });

  // Permet d’ouvrir la modale avant une session
  window.requestRoutineSetup = function () {
    showRoutineModal();
  };

  // Callback quand l’utilisateur sauvegarde sa routine
  window.saveRoutineConfig = function (userConfig) {
    console.log("🧠 Routine enregistrée :", userConfig);
    routineConfig.swing.user = userConfig; // stockage interne
  };


  // API publique
  return {
    initJustSwing,
    startSession,
    stopSession,
    onPoseFrame,
    setRoutineConfig,
    getReferenceSwing,
    setClubType,
    mainLoop,
  };
})();

window.JustSwing = JustSwing;

