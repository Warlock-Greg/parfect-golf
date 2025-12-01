// =========================================================
//   nouvelle version du lundi soir JUST SWING – Parfect.golfr – Orchestrateur 2025 PRO
//   Dépend de: SwingEngine, SwingCapture, SwingPlayer, SwingHistory
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
  // DOM
  let screenEl, videoEl, overlayEl, ctx;
  let statusTextEl, routineStepsEl, timerEl;
  let resultPanelEl, scoreGlobalEl, coachCommentEl, swingLabelEl, drillsEl;
  let btnKeepRefEl, btnNextSwingEl, btnExitEl, restartBtnEl, bigMsgEl;

  // État
  let state = JSW_STATE.IDLE;
  let mode = JSW_MODE.SWING;
  let currentClubType = "fer7";
  let sessionStartTime = null;
  let loopId = null;

  let lastPose = null;
  let lastFullBodyOk = false;
  let swings = [];
  let currentSwingIndex = 0;
  let referenceSwing = null;

  // Routine auto
  const routineStepsAuto = [
    "J’attends que tu te mettes en plain-pied 👣",
    "Vérifie ton grip ✋",
    "Vérifie ta posture 🧍‍♂️",
    "Vérifie ton alignement 🎯",
    "Fais un swing d’essai 🌀",
    "Respire profondément 😮‍💨",
  ];
  let routineStepIndex = 0;
  let routineInterval = null;
  const ROUTINE_STEP_DURATION = 4000;

  // Engine
  let swingEngine = null;

  // -----------------------------------------------------
  //   INIT DOM
  // -----------------------------------------------------
  function initJustSwing() {
    screenEl = $$("just-swing-screen");
    videoEl = $$("jsw-video");
    overlayEl = $$("jsw-overlay");
    bigMsgEl = $$("jsw-big-msg");

    if (!screenEl || !videoEl || !overlayEl) {
      console.warn("JustSwing: DOM incomplet.");
      return;
    }

    ctx = overlayEl.getContext("2d", { willReadFrequently: true });

    statusTextEl = $$("jsw-status-text");
    routineStepsEl = $$("jsw-routine-steps");
    timerEl = $$("jsw-timer");

    resultPanelEl = $$("jsw-result-panel");
    scoreGlobalEl = $$("jsw-score-global");
    coachCommentEl = $$("jsw-coach-comment");
    swingLabelEl = $$("jsw-swing-label");
    drillsEl = $$("jsw-drills");

    btnKeepRefEl = $$("jsw-btn-keep-reference");
    btnNextSwingEl = $$("jsw-btn-next-swing");
    btnExitEl = $$("jsw-btn-exit");
    restartBtnEl = $$("jsw-restart");

    const clubSelect = $$("jsw-club-select");
    clubSelect?.addEventListener("change", () => {
      currentClubType = clubSelect.value;
    });

    btnKeepRefEl?.addEventListener("click", () => {
      if (swings.length) referenceSwing = swings.at(-1);
      hideResultPanel();
    });
    btnNextSwingEl?.addEventListener("click", () => {
      hideResultPanel();
      restartLoop();
    });
    btnExitEl?.addEventListener("click", () => stopSession());
    restartBtnEl?.addEventListener("click", () => startSession(mode));

    window.addEventListener("resize", resizeOverlay);
    resizeOverlay();

    // Init modules externes
    if (window.SwingPlayer) {
      window.SwingPlayer.init();
    }

    swingEngine = window.SwingEngine?.create();
    if (!swingEngine) console.warn("SwingEngine non disponible");

    console.log("✅ JustSwing initialisé (orchestrateur)");
  }

  function resizeOverlay() {
    overlayEl.width = videoEl.clientWidth || window.innerWidth;
    overlayEl.height = videoEl.clientHeight || window.innerHeight;
  }

  // -----------------------------------------------------
  //   ROUTINE GUIDÉE
  // -----------------------------------------------------
  function startRoutineSequence() {
    if (!bigMsgEl) return;
    routineStepIndex = 0;
    showBigMessage(routineStepsAuto[0]);

    if (routineInterval) {
      clearInterval(routineInterval);
      routineInterval = null;
    }

    routineInterval = setInterval(() => {
      routineStepIndex++;
      if (routineStepIndex < routineStepsAuto.length) {
        showBigMessage(routineStepsAuto[routineStepIndex]);
      } else {
        clearInterval(routineInterval);
        routineInterval = null;
        setTimeout(() => showBigMessage("À toi de faire de ton mieux 💥"), 200);
        setTimeout(() => {
          hideBigMessage();
          state = JSW_STATE.ADDRESS_READY;
          updateUI();
        }, 3200);
      }
    }, ROUTINE_STEP_DURATION);
  }

  function showBigMessage(msg) {
    if (!bigMsgEl) return;
    bigMsgEl.textContent = msg;
    bigMsgEl.style.opacity = 1;
  }

  function hideBigMessage() {
    if (!bigMsgEl) return;
    bigMsgEl.style.opacity = 0;
  }

  // -----------------------------------------------------
  //   SESSION
  // -----------------------------------------------------
  function startSession(selectedMode = JSW_MODE.SWING) {
  if (!screenEl) initJustSwing();

  mode = selectedMode;
  state = JSW_STATE.POSITIONING;
  sessionStartTime = performance.now();
  currentSwingIndex = 0;
  swings = [];
  lastPose = null;
  lastFullBodyOk = false;

  screenEl.classList.remove("hidden");
  document.body.classList.add("jsw-fullscreen");

  // init vidéo
  if (window.SwingCapture && videoEl.srcObject) {
    window.SwingCapture.init(videoEl.srcObject);
  }

  // =========================================================
  // 🔧 CRÉATION / RESET SWINGENGINE PRO
  // =========================================================
  console.log("🔧 Reset moteur SwingEngine PRO");

  window.__engine = SwingEngine.create({
    fps: 30,
    onKeyFrame: (evt) => {
      console.log("🎯 KeyFrame détectée", evt);
    },
    onSwingComplete: (evt) => {
      console.log("🏁 Swing COMPLET détecté", evt);
      JustSwing.handleSwingComplete(evt.data); // ⭐ IMPORTANT
    }
  });

  // =========================================================
  // 🔥 UI de départ
  // =========================================================
  updateUI();
  showBigMessage("J’attends que tu te mettes en plain-pied 👣");

  // =========================================================
  // 🔁 MAIN LOOP
  // =========================================================
  if (loopId) cancelAnimationFrame(loopId);
  loopId = requestAnimationFrame(mainLoop);
}



  function stopSession() {
    state = JSW_STATE.IDLE;
    if (loopId) {
      cancelAnimationFrame(loopId);
      loopId = null;
    }
    screenEl.classList.add("hidden");
    document.body.classList.remove("jsw-fullscreen");
    hideBigMessage();
    hideResultPanel();
  }

  // -----------------------------------------------------
  //   MAIN LOOP
  // -----------------------------------------------------
  function mainLoop(now) {
    if (state === JSW_STATE.IDLE) return;

    const elapsed = performance.now() - sessionStartTime;
    const rem = Math.max(0, 120 - Math.floor(elapsed / 1000));
    if (timerEl) timerEl.textContent = `Temps restant : ${rem}s`;

    drawOverlay();
    updateState(now);

    loopId = requestAnimationFrame(mainLoop);
  }

  function drawOverlay() {
    if (!ctx || !overlayEl) return;
    ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);

    if (!lastPose) {
      // fantôme simple
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
      return;
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    const w = overlayEl.width;
    const h = overlayEl.height;
    const p = (i) =>
      lastPose[i] ? { x: lastPose[i].x * w, y: lastPose[i].y * h } : null;

    const segments = [
      [11, 12], [11, 23], [12, 24], [23, 24],
      [11, 13], [13, 15], [12, 14], [14, 16],
      [23, 25], [25, 27], [24, 26], [26, 28],
    ];

    segments.forEach(([a, b]) => {
      const pa = p(a), pb = p(b);
      if (!pa || !pb) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });

    const nose = p(0);
    if (nose) {
      ctx.beginPath();
      ctx.arc(nose.x, nose.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,255,153,0.9)";
      ctx.fill();
    }
    ctx.restore();
  }

  // -----------------------------------------------------
  //   MEDIAPIPE CALLBACK
  // -----------------------------------------------------
  function onPoseFrame(landmarks) {
    lastPose = landmarks || null;
    lastFullBodyOk = detectFullBody(landmarks);

    if (!swingEngine || !landmarks) return;

    if (state === JSW_STATE.ADDRESS_READY || state === JSW_STATE.SWING_CAPTURE) {
      const evt = swingEngine.processPose(landmarks, performance.now(), currentClubType);

      if (evt.type === "swingStart") {
        state = JSW_STATE.SWING_CAPTURE;
        currentSwingIndex++;
        if (window.SwingCapture) SwingCapture.start();
        updateUI();
      }

      if (evt.type === "swingRejected") {
        showCoachIA("Swing incomplet, refais-en un 😉");
        state = JSW_STATE.ADDRESS_READY;
        updateUI();
      }

      if (evt.type === "swingComplete") {
        handleSwingComplete(evt.data);
      }

    if (window.__engine && landmarks) {
  __engine.pushPose(landmarks, performance.now());
}

    }
  }

  // -----------------------------------------------------
  //   STATE MACHINE
  // -----------------------------------------------------
  function updateState() {
    if (!lastPose) return;

    switch (state) {
      case JSW_STATE.POSITIONING: {
        if (!lastFullBodyOk) return;
        hideBigMessage();
        state = JSW_STATE.ROUTINE;
        updateUI();
        startRoutineSequence();
        break;
      }
      case JSW_STATE.ROUTINE: {
        if (!lastFullBodyOk) {
          showBigMessage("Reviens bien en plain-pied 👣");
        }
        break;
      }
      case JSW_STATE.ADDRESS_READY: {
        // on laisse SwingEngine déclencher le swing
        break;
      }
      case JSW_STATE.SWING_CAPTURE: {
        // SwingEngine gère la fin
        break;
      }
      case JSW_STATE.REVIEW: {
        break;
      }
    }
  }

  function restartLoop() {
    hideBigMessage();
    if (swingEngine) swingEngine.resetSwing();
    state = lastFullBodyOk ? JSW_STATE.ROUTINE : JSW_STATE.POSITIONING;
    updateUI();
    if (!loopId) loopId = requestAnimationFrame(mainLoop);
  }

  // -----------------------------------------------------
  //   SWING COMPLETE → scoring + vidéo + historique
  // -----------------------------------------------------
  function handleSwingComplete(data) {
  state = JSW_STATE.REVIEW;

  // pour debug
  window.__lastSwing = data;

  updateUI();

  // 1) Affichage du panneau PRO
  document.getElementById("swing-review").classList.remove("hidden");

  // 2) Score
  const score = data.scores.total;
  document.getElementById("swing-review-score").textContent = `Score : ${score}/100`;

  // 3) Commentaire technique
  document.getElementById("swing-review-comment").textContent =
    coachTechnicalComment(data.scores);

  // 4) Vidéo → chargée après SwingCapture
  if (window.SwingCapture) {
    SwingCapture.stop().then((blob) => {
      if (!blob) return;
      data.videoBlob = blob;
      if (window.SwingPlayer) {
        SwingPlayer.loadBlob(blob);
      }
      // 5) Historique
      if (window.SwingHistory) {
        SwingHistory.save({
          club: data.club,
          score,
          metrics: data.scores,
          videoBlob: blob,
        }).then(refreshSwingHistoryUI);
      }
    });
  }

  // 6) Boutons actions
  document.getElementById("swing-save-reference").onclick = () => {
    referenceSwing = data;
    alert("Swing défini comme référence ⭐");
  };

  document.getElementById("swing-review-next").onclick = () => {
    document.getElementById("swing-review").classList.add("hidden");
    restartLoop();
  };
}


  // -----------------------------------------------------
  //   FULL BODY DETECTION
  // -----------------------------------------------------
  function detectFullBody(lm) {
    if (!lm || !lm.length) return false;
    const head = lm[0];
    const la = lm[27];
    const ra = lm[28];
    if (!head || !la || !ra) return false;
    const inBounds = (p) => p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98;
    if (!inBounds(head) || !inBounds(la) || !inBounds(ra)) return false;
    const height = Math.abs(head.y - Math.min(la.y, ra.y));
    return height > 0.4 && height < 0.95;
  }

  // -----------------------------------------------------
  //   RESULT UI (MVP, mais propre)
  // -----------------------------------------------------
  function coachTechnicalComment(scores) {
    const msg = [];
    if (scores.lag < 60) msg.push("Garde les poignets armés plus longtemps pour un meilleur lag.");
    if (scores.shift < 60) msg.push("Transfère un peu plus ton poids vers la cible au downswing.");
    if (scores.posture < 60) msg.push("Garde ta posture jusqu’à l’impact, évite de te redresser.");
    if (scores.triangle < 60) msg.push("Garde ton triangle mains/épaules stable pendant le swing.");
    if (!msg.length) return "Très bon swing, base solide 👌";
    return msg.slice(0, 2).join(" ");
  }

  function showSwingResult(data) {
    if (!resultPanelEl) return;

    const scores = data.scores || {};
    swingLabelEl.textContent = `Swing #${data.index} — ${data.mode} (${data.club})`;
    scoreGlobalEl.textContent = `Score Parfect : ${scores.total ?? data.total}/100`;
    coachCommentEl.textContent = coachTechnicalComment(scores);

    // drills très simples
    const drills = [];
    if (scores.lag < 60) {
      drills.push({ title: "Retard de club (Lag)", durationMin: 8, description: "Garde les poignets armés plus longtemps avant l’impact." });
    }
    if (scores.posture < 60) {
      drills.push({ title: "Posture stable", durationMin: 6, description: "Garde l’inclinaison de ton buste jusqu’à l’impact." });
    }
    if (scores.triangle < 60) {
      drills.push({ title: "Triangle bras-épaules", durationMin: 5, description: "Garde les bras connectés au buste pendant le swing." });
    }
    if (!drills.length) {
      drills.push({ title: "Routine solide", durationMin: 5, description: "Continue sur cette base régulière 👌" });
    }
    if (drillsEl) {
      drillsEl.innerHTML = drills.slice(0, 2).map(
        d => `<div>• <b>${d.title}</b> (${d.durationMin} min) — ${d.description}</div>`
      ).join("");
    }

    resultPanelEl.classList.remove("hidden");
  }

  function hideResultPanel() {
    if (!resultPanelEl) return;
    resultPanelEl.classList.add("hidden");
  }

  // -----------------------------------------------------
  //   UI helpers
  // -----------------------------------------------------
  function updateUI() {
    if (!statusTextEl) return;
    switch (state) {
      case JSW_STATE.POSITIONING:
        statusTextEl.textContent = "Place-toi plein pied 👣";
        break;
      case JSW_STATE.ROUTINE:
        statusTextEl.textContent = "Lance ta routine";
        showRoutineSteps();
        break;
      case JSW_STATE.ADDRESS_READY:
        statusTextEl.textContent = "Adresse solide – prêt à swinguer";
        break;
      case JSW_STATE.SWING_CAPTURE:
        statusTextEl.textContent = `Swing #${currentSwingIndex} en cours…`;
        break;
      case JSW_STATE.REVIEW:
        statusTextEl.textContent = "Analyse du swing";
        break;
    }
  }

  function showRoutineSteps() {
    if (!routineStepsEl) return;
    const cfg =
      mode === JSW_MODE.SWING ? routineConfig.swing :
      mode === JSW_MODE.PUTT ? routineConfig.putt :
      routineConfig.approche;
    const steps = cfg.user?.length ? cfg.user : cfg.default;
    routineStepsEl.textContent = `Routine : ${steps.join(" · ")}`;
  }

  function showCoachIA(message) {
    const el = document.getElementById("coach-log");
    if (!el) return;
    el.style.display = "block";
    el.textContent = message;
    el.style.opacity = 0;
    setTimeout(() => {
      el.style.transition = "opacity 0.4s ease";
      el.style.opacity = 1;
    }, 10);
  }

  function refreshSwingHistoryUI() {
  if (!window.SwingHistory) return;

  SwingHistory.getAll().then(list => {
    const container = document.getElementById("swing-history");
    if (!container) return;

    container.innerHTML = list.map(item => `
      <div class="swing-history-item" data-id="${item.id}">
        Swing du ${new Date(item.createdAt).toLocaleTimeString()} — ${item.score}/100 — ${item.club}
      </div>
    `).join("");

    // clic pour revoir un swing
    container.querySelectorAll(".swing-history-item").forEach(el => {
      el.onclick = () => {
        const id = Number(el.dataset.id);
        const swing = list.find(s => s.id === id);
        if (swing?.videoBlob) SwingPlayer.loadBlob(swing.videoBlob);
        document.getElementById("swing-review-score").textContent = `Score : ${swing.score}/100`;
        document.getElementById("swing-review-comment").textContent =
          coachTechnicalComment(swing.metrics);
      };
    });
  });
}


  function debug() {
    console.log("JSW state =", state, "mode=", mode, "club=", currentClubType);
   console.log("engine =", window.__engine);
  }

  // -----------------------------------------------------
  //   EXPORT
  // -----------------------------------------------------
  return {
    initJustSwing,
    startSession,
    stopSession,
    onPoseFrame,
    setRoutineConfig: (cfg) => (routineConfig = cfg),
    getReferenceSwing: () => referenceSwing,
    setClubType: (c) => (currentClubType = c),
    showRoutineSteps,
    handleSwingComplete,
    updateUI,
    refreshSwingHistoryUI,
    _debug: debug
  };
})();

window.JustSwing = JustSwing;
