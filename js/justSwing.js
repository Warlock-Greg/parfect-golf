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

  // Capture balle
  let captureCanvas = null;
  let captureCtx = null;
  let frameBuffer = [];
  const maxFrameBuffer = 12;

  let currentImpactContext = null;
  let loopId = null;

  // -------------------------------------------------------
  //   MESSAGES UI
  // -------------------------------------------------------
  function showBigMessage(text) {
    if (!bigMsgEl) return;
    bigMsgEl.textContent = text;
    bigMsgEl.style.opacity = 1;
  }

  function hideBigMessage() {
    if (!bigMsgEl) return;
    bigMsgEl.style.opacity = 0;
    bigMsgEl.textContent = "";
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

    / -------------------------------------------------------
  // Correctif 1 : sécurité si initJustSwing n’a pas encore initialisé le DOM
  // -------------------------------------------------------
  if (!screenEl) {
    console.warn("⚠️ JustSwing non initialisé — initJustSwing() forcé AVANT startSession");
    initJustSwing();
  }

  // -------------------------------------------------------
  // Correctif 2 : afficher la routine APRÈS init (sinon routineStepsEl était undefined)
  // -------------------------------------------------------
  showRoutineSteps();

  // -------------------------------------------------------
  // Session init
  // -------------------------------------------------------
    
    mode = selectedMode;

    state = JSW_STATE.POSITIONING;
    swings = [];
    currentSwingIndex = 0;
    sessionStartTime = performance.now();
    lastPose = null;
    lastFullBodyOk = false;
    frameBuffer = [];
    currentImpactContext = null;
    addressStableSince = null;

    screenEl.classList.remove("hidden");
    document.body.classList.add("jsw-fullscreen");

    updateUI();
    showBigMessage("Place-toi plein pied 👣 au centre.");

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

    const elapsed = now - sessionStartTime;
    if (elapsed > maxSessionDurationMs) {
      state = JSW_STATE.REVIEW;
      showFinalSummary();
      return;
    }

    updateTimer(elapsed);
    captureFrame();
    drawOverlay();
    updateState(now);

    loopId = requestAnimationFrame(mainLoop);
  }

  function updateTimer(elapsedMs) {
    const rem = Math.max(0, 30 - Math.floor(elapsedMs / 1000));
    timerEl.textContent = `Temps restant : ${rem}s`;
  }

  // -------------------------------------------------------
  //   MEDIAPIPE CALLBACK
  // -------------------------------------------------------
  function onPoseFrame(landmarks) {
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
  //   STATE MACHINE
  // -------------------------------------------------------

  function updateState(now) {
    switch (state) {
      case JSW_STATE.POSITIONING: return statePositioning();
      case JSW_STATE.ROUTINE: return stateRoutine(now);
      case JSW_STATE.ADDRESS_READY: return stateAddressReady(now);
      case JSW_STATE.SWING_CAPTURE: return stateSwingCapture(now);
    }
  }

  function statePositioning() {
    if (!lastFullBodyOk) {
      setHalo("red");
      showBigMessage("Recule un peu, je dois te voir en entier 👣");
      return;
    }

    hideBigMessage();
    setHalo("green");
    state = JSW_STATE.ROUTINE;
    updateUI();
    showRoutineSteps();
  }

  function stateRoutine(now) {
    if (!lastFullBodyOk) {
      setHalo("orange");
      showBigMessage("Reviens plein cadre 👣");
      return;
    }

    setHalo("green");

    if (isAddressStable(lastPose)) {
      addressStableSince ??= now;
      if (now - addressStableSince > 800) {
        state = JSW_STATE.ADDRESS_READY;
        showBigMessage("Adresse OK ✅ Envoie quand tu veux");
      }
    } else {
      addressStableSince = null;
      showBigMessage("Prends ton temps pour t’installer.");
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

  function detectSwingStart() {
    return Math.random() < 0.015;
  }

  function detectSwingEnd() {
    return Math.random() < 0.02;
  }

  // -------------------------------------------------------
  //   SCORING
  // -------------------------------------------------------
  function computeSwingScore(mode, pose, ctxImpact) {
    const routineScore = lastFullBodyOk ? 15 + Math.floor(Math.random() * 5) : 10;
    const swingScore = 50 + Math.floor(Math.random() * 20);
    const regularityScore = 3 + Math.floor(Math.random() * 7);

    const total = routineScore + swingScore + regularityScore;

    const phaseScores = {
      address: clamp(routineScore * 0.5 / 2, 0, 10),
      backswing: clamp((swingScore * 0.2) / 2, 0, 10),
      top: clamp((swingScore * 0.15) / 2, 0, 10),
      downswing: clamp((swingScore * 0.3) / 2, 0, 10),
      impact: clamp((swingScore * 0.35) / 2, 0, 10),
      release: clamp((regularityScore * 0.4), 0, 10),
      finish: clamp((regularityScore * 0.6), 0, 10)
    };

    const detectedIssues = [];
    if (routineScore < 14) detectedIssues.push("routine");
    if (phaseScores.finish < 6) detectedIssues.push("balance_finish");
    if (mode === JSW_MODE.APPROCHE && swingScore < 60)
      detectedIssues.push("launch_control");

    const launch = estimateLaunchAngle(pose, ctxImpact);

    const parfectEarned = routineScore >= 14 && total >= 75 ? 1 : 0;
    if (parfectEarned) awardParfects(parfectEarned);

    return {
      index: currentSwingIndex,
      mode,
      club: currentClubType,
      routineScore,
      swingScore,
      regularityScore,
      total,
      phaseScores,
      detectedIssues,
      parfectEarned,
      launchAngle: launch,
      timestamp: Date.now(),
    };
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // -------------------------------------------------------
  //   ANGLE LANCEMENT
  // -------------------------------------------------------
  function estimateLaunchAngle(pose, ctxImpact) {
    // Stub MVP (fixed loft)
    const loft = CLUB_BASE_LOFT[currentClubType] ?? 25;
    return { angleDeg: loft, source: "club", confidence: 0.5 };
  }

  // -------------------------------------------------------
  //   EXOS
  // -------------------------------------------------------
  function coachSuggestDrills(swingData) {
    const issues = swingData.detectedIssues;
    const out = [];

    if (issues.includes("routine")) out.push(JSW_DRILLS[0]);
    if (issues.includes("balance_finish")) out.push(JSW_DRILLS[1]);
    if (issues.includes("launch_control")) out.push(JSW_DRILLS[2]);

    if (!out.length) out.push(JSW_DRILLS[0]);
    return out.slice(0, 2);
  }

  // -------------------------------------------------------
  //   CAPTURE BALLE
  // -------------------------------------------------------
  function captureFrame() {
    if (!videoEl.readyState >= 2) return;

    captureCtx.drawImage(videoEl, 0, 0, 160, 160);
    const imageData = captureCtx.getImageData(0, 0, 160, 160);

    frameBuffer.push({ imageData, width: 160, height: 160 });
    if (frameBuffer.length > maxFrameBuffer) frameBuffer.shift();
  }

  // -------------------------------------------------------
  //   AFFICHAGE RESULTAT
  // -------------------------------------------------------

  function showSwingResult(data) {
    swingLabelEl.textContent = `Swing #${data.index} — ${data.mode} (${data.club})`;
    scoreGlobalEl.textContent = `Score Parfect : ${data.total}/100`;
    scoreDetailsEl.textContent =
      `Routine ${data.routineScore}/20 · Swing ${data.swingScore}/70 · Régularité ${data.regularityScore}/10`;

    coachCommentEl.textContent = data.comment ?? "Bon travail 👌";

    const drills = coachSuggestDrills(data);
    drillsEl.innerHTML = drills.map(
      d => `<div>• <b>${d.title}</b> (${d.durationMin} min) — ${d.description}</div>`
    ).join("");

    // Actions avancées
    const actionsEl = $$("jsw-result-actions");
    actionsEl.innerHTML = "";

    if (window.JustSwingLog?.show) {
      const logBtn = document.createElement("button");
      logBtn.textContent = "📊 Log swing";
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
    screenEl.classList.remove(
      "jsw-halo-red", "jsw-halo-orange", "jsw-halo-green", "jsw-halo-blue"
    );
    if (color) screenEl.classList.add(`jsw-halo-${color}`);
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
