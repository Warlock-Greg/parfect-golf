// =========================================================
//   JUST SWING — Orchestrateur PRO (Parfect 2025)
//   Dépend de : SwingEngine, SwingCapture, SwingPlayer, SwingHistory
// =========================================================

const $$ = (id) => document.getElementById(id);

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

const JustSwing = (() => {

  // ---------------------------------------------------------
  //   DOM + ÉTAT
  // ---------------------------------------------------------
  let screenEl, videoEl, overlayEl, ctx;
  let statusTextEl, routineStepsEl, timerEl;
  let bigMsgEl;

  let state = JSW_STATE.IDLE;
  let mode = JSW_MODE.SWING;
  let currentClubType = "fer7";

  let lastPose = null;
  let lastFullBodyOk = false;
  let sessionStartTime = null;
  let loopId = null;

  let currentSwingIndex = 0;
  let referenceSwing = null;

  // ENGINE PRO
  let engine = null;


  // ---------------------------------------------------------
  //   INIT DOM
  // ---------------------------------------------------------
  function initJustSwing() {
    screenEl = $$("just-swing-screen");
    videoEl = $$("jsw-video");
    overlayEl = $$("jsw-overlay");
    bigMsgEl = $$("jsw-big-msg");

    if (!screenEl || !videoEl || !overlayEl) {
      console.warn("JustSwing: DOM incomplet");
      return;
    }

    ctx = overlayEl.getContext("2d", { willReadFrequently: true });

    statusTextEl = $$("jsw-status-text");
    routineStepsEl = $$("jsw-routine-steps");
    timerEl = $$("jsw-timer");

    window.addEventListener("resize", resizeOverlay);
    resizeOverlay();

    console.log("✅ JustSwing initialisé");
  }


  function resizeOverlay() {
    overlayEl.width = videoEl.clientWidth || window.innerWidth;
    overlayEl.height = videoEl.clientHeight || window.innerHeight;
  }


  // ---------------------------------------------------------
  //   ROUTINE GUIDEE
  // ---------------------------------------------------------
  const routineStepsAuto = [
    "J’attends que tu te mettes en plain-pied 👣",
    "Vérifie ton grip ✋",
    "Vérifie ta posture 🧍‍♂️",
    "Vérifie ton alignement 🎯",
    "Fais un swing d’essai 🌀",
    "Respire profondément 😮‍💨",
  ];

  let routineInterval = null;
  let routineIndex = 0;

  function startRoutineSequence() {
    if (!bigMsgEl) return;
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

        setTimeout(() => showBigMessage("À toi de faire de ton mieux 💥"), 200);
        setTimeout(() => {
          hideBigMessage();
          state = JSW_STATE.ADDRESS_READY;
          updateUI();
        }, 3000);
      }
    }, 3500);
  }

  function showBigMessage(msg) {
    bigMsgEl.textContent = msg;
    bigMsgEl.style.opacity = 1;
  }
  
  function hideBigMessage() {
    bigMsgEl.style.opacity = 0;
  }


  // ---------------------------------------------------------
  //   SESSION START
  // ---------------------------------------------------------
  function startSession(selectedMode = JSW_MODE.SWING) {

  if (!screenEl) initJustSwing();

  mode = selectedMode;
  state = JSW_STATE.POSITIONING;
  sessionStartTime = performance.now();
  currentSwingIndex = 0;
  lastPose = null;
  lastFullBodyOk = false;

  screenEl.classList.remove("hidden");
  document.body.classList.add("jsw-fullscreen");

  // init capture vidéo
  if (window.SwingCapture && videoEl.srcObject) {
    window.SwingCapture.init(videoEl.srcObject);
  }

  // === SwingEngine PRO ===
  engine = SwingEngine.create({
    fps: 30,
    onKeyFrame: (evt) => {
      console.log("🎯 KEYFRAME", evt);
    },
    onSwingComplete: (evt) => {
      console.log("🏁 SWING COMPLETE", evt);
      const swing = evt.data;

      // 💯 SCORING PREMIUM
      swing.scores = computeSwingScorePremium(swing);
      console.log("📊 SCORE PREMIUM =", swing.scores);

      handleSwingComplete(swing);
    }
  });

  console.log("🔧 Engine READY:", engine);

  updateUI();
  showBigMessage("J’attends que tu te mettes en plain-pied 👣");

  if (loopId) cancelAnimationFrame(loopId);
  loopId = requestAnimationFrame(mainLoop);
}



  function stopSession() {
    state = JSW_STATE.IDLE;
    hideBigMessage();

    if (loopId) cancelAnimationFrame(loopId);
    loopId = null;

    screenEl.classList.add("hidden");
    document.body.classList.remove("jsw-fullscreen");
  }


  // ---------------------------------------------------------
  //   MAIN LOOP
  // ---------------------------------------------------------
  function mainLoop() {

    drawOverlay();
    updateState();

    loopId = requestAnimationFrame(mainLoop);
  }


  // ---------------------------------------------------------
  //   DRAW OVERLAY
  // ---------------------------------------------------------
  function drawOverlay() {
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);
    if (!lastPose) return;
    
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;

    const w = overlayEl.width;
    const h = overlayEl.height;

    const p = (i) => lastPose[i] ? { x: lastPose[i].x*w, y: lastPose[i].y*h } : null;

    const links = [
      [11,12],[11,23],[12,24],
      [23,24],[11,13],[13,15],
      [12,14],[14,16]
    ];

    links.forEach(([a,b]) => {
      const pa = p(a), pb = p(b);
      if (!pa || !pb) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });

    ctx.restore();
  }


  // ---------------------------------------------------------
  //   MEDIAPIPE FRAME
  // ---------------------------------------------------------
  function onPoseFrame(landmarks) {

    lastPose = landmarks || null;
    lastFullBodyOk = detectFullBody(landmarks);

    if (!landmarks) return;

    // 🚀 utiliser SwingEngine PRO
    if (engine) {
    const evt = engine.processPose(landmarks, performance.now(), currentClubType);

    if (evt?.type === "swingComplete") {
      handleSwingComplete(evt.data);
    }
  }
}

  // ---------------------------------------------------------
  //   STATE MACHINE
  // ---------------------------------------------------------
  function updateState() {

    switch(state) {

      case JSW_STATE.POSITIONING:
        if (!lastFullBodyOk) return;
        state = JSW_STATE.ROUTINE;
        updateUI();
        startRoutineSequence();
        break;

      case JSW_STATE.ROUTINE:
        if (!lastFullBodyOk) showBigMessage("Reviens en plein pied 👣");
        break;

      case JSW_STATE.ADDRESS_READY:
      case JSW_STATE.SWING_CAPTURE:
      case JSW_STATE.REVIEW:
        break;
    }
  }


  // ---------------------------------------------------------
  //   SWING COMPLETE → REVIEW
  // ---------------------------------------------------------
  function handleSwingComplete(swing) {
  state = JSW_STATE.REVIEW;
  updateUI();

  window.__lastSwing = swing;

  const panel = document.getElementById("swing-review");
  const scoreEl = document.getElementById("swing-review-score");
  const commentEl = document.getElementById("swing-review-comment");

  if (panel) panel.classList.remove("hidden");

  if (scoreEl && swing.scores) {
    scoreEl.textContent = `Score : ${Math.round(swing.scores.total)}/100`;
  }

  if (commentEl && swing.scores) {
    commentEl.textContent = coachTechnicalComment(swing.scores);
  }

  // 🎥 Capture et replay vidéo
  if (window.SwingCapture) {
    SwingCapture.stop().then((blob) => {
      if (!blob) return;

      swing.videoBlob = blob;

      // Replay
      if (window.SwingPlayer) {
        try {
          SwingPlayer.loadBlob(blob);
        } catch (e) {
          console.warn("SwingPlayer.loadBlob error", e);
        }
      }

      // Historique
      if (window.SwingHistory) {
        SwingHistory.save({
          club: swing.club,
          score: swing.scores.total,
          metrics: swing.scores,
          videoBlob: blob
        }).catch((e) => console.warn("SwingHistory.save error", e));
      }
    });
  }
}



  // ---------------------------------------------------------
  //   FULL BODY DETECTION
  // ---------------------------------------------------------
  function detectFullBody(lm) {
    if (!lm) return false;
    const head = lm[0];
    const la = lm[27];
    const ra = lm[28];
    if (!head || !la || !ra) return false;

    const inside = (p) => p.x>0.02 && p.x<0.98 && p.y>0.02 && p.y<0.98;
    if (!inside(head) || !inside(la) || !inside(ra)) return false;

    const h = Math.abs(head.y - Math.min(la.y, ra.y));
    return h > 0.4 && h < 0.95;
  }


  // ---------------------------------------------------------
  //   COACH COMMENTAIRE
  // ---------------------------------------------------------
  function coachTechnicalComment(scores) {
    const msgs = [];
    if (scores.triangleScore < 60) msgs.push("Garde ton triangle stable.");
    if (scores.lagScore < 60) msgs.push("Garde les poignets armés plus longtemps.");
    if (scores.planeScore < 60) msgs.push("Descends plus dans le plan.");
    if (!msgs.length) return "Super swing 👌";
    return msgs.slice(0,2).join(" ");
  }


  // ---------------------------------------------------------
  //   UI
  // ---------------------------------------------------------
  function updateUI() {
    switch(state) {
      case JSW_STATE.POSITIONING:  statusTextEl.textContent = "Place-toi plein pied 👣"; break;
      case JSW_STATE.ROUTINE:      statusTextEl.textContent = "Routine en cours"; break;
      case JSW_STATE.ADDRESS_READY:statusTextEl.textContent = "Adresse solide"; break;
      case JSW_STATE.SWING_CAPTURE:statusTextEl.textContent = "Swing en cours…"; break;
      case JSW_STATE.REVIEW:       statusTextEl.textContent = "Analyse du swing"; break;
    }
  }

  function debug() {
    console.log("🔍 JSW State:", state);
    console.log("🔍 Engine:", engine);
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
