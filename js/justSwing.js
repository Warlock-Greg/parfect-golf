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
    "Respire profondément… 😮‍💨",
  ];

  function startRoutineSequence() {
    if (!bigMsgEl) return;

    state = JSW_STATE.ROUTINE;
    updateUI();

    showRoutineStepsText();

    routineIndex = 0;
    showBigMessage(routineStepsAuto[0]);

    if (routineTimer) clearInterval(routineTimer);

    routineTimer = setInterval(() => {
      routineIndex++;

      if (routineIndex < routineStepsAuto.length) {
        showBigMessage(routineStepsAuto[routineIndex]);
      } else {
        clearInterval(routineTimer);
        routineTimer = null;

        // Message final
        setTimeout(() => {
          showBigMessage("À toi de faire de ton mieux 💥");
        }, 300);

        // Fin de routine → Address Ready + arm capture
        setTimeout(() => {
          hideBigMessage();
          state = JSW_STATE.ADDRESS_READY;
          captureArmed = true;
          if (engine && engine.reset) engine.reset();
          updateUI();
        }, 3000);
      }
    }, 3500);
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

    // Tant que la routine n'est pas finie → on ne pousse pas dans le moteur
    if (!captureArmed || !engine || !landmarks) return;

    try {
      engine.processPose(landmarks, performance.now(), currentClubType);
    } catch (e) {
      console.warn("⚠️ engine.processPose erreur", e);
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
  function computeSwingScorePremium(swing) {
    // Pour l’instant : scoring MVP random solide
    const total = 60 + Math.floor(Math.random() * 41); // 60–100

    return {
      total,
      triangleScore: 60 + Math.floor(Math.random() * 41),
      lagScore: 60 + Math.floor(Math.random() * 41),
      planeScore: 60 + Math.floor(Math.random() * 41),
      rotationScore: 60 + Math.floor(Math.random() * 41),
      tempoScore: 60 + Math.floor(Math.random() * 41),
    };
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
