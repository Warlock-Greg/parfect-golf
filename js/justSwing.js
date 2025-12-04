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
  swing: ["Respiration", "Visualisation", "Alignement", "Swing d'essai", "Adresse", "Swing"],
  putt: ["Lecture du green", "Visualisation", "Alignement", "Adresse", "Putt"],
  approche: ["Choix de trajectoire", "Visualisation", "Alignement", "Adresse", "Swing d'approche"],
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

  let captureStarted = false;

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
    "J'attends que tu te mettes en plain-pied 👣",
    "Vérifie ton grip ✋",
    "Vérifie ta posture 🧍‍♂️",
    "Vérifie ton alignement 🎯",
    "Fais un swing d'essai 🌀",
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
    captureStarted = false;
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
    showBigMessage("J'attends que tu te mettes en plain-pied 👣");

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

    // LIENS COMPLETS : épaules, bras, torse, hanches ET JAMBES
    const links = [
      [11,12], [11,23], [12,24], [23,24],  // torse
      [11,13], [13,15],                     // bras gauche
      [12,14], [14,16],                     // bras droit
      [23,25], [25,27],                     // jambe gauche
      [24,26], [26,28],                     // jambe droite
    ];

    links.forEach(([a,b]) => {
      const pa = p(a), pb = p(b);
      if (!pa || !pb) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });

    // Dessiner les points des articulations
    ctx.fillStyle = "rgba(0,255,0,0.8)";
    [11,12,13,14,15,16,23,24,25,26,27,28].forEach(i => {
      const pt = p(i);
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }


  // ---------------------------------------------------------
  //   MEDIAPIPE FRAME
  // ---------------------------------------------------------
  function onPoseFrame(landmarks) {
    lastPose = landmarks || null;
    lastFullBodyOk = detectFullBody(landmarks);

    if (!landmarks || !engine) return;

    // Analyse SwingEngine
    const evt = engine.processPose(landmarks, performance.now(), currentClubType);

    // TRACKING détecté → pas de capture vidéo
    if (evt && evt.type === "tracking") {
      console.log("⚠️ TRACKING détecté (capture vidéo désactivée)");
    }

    // SWING COMPLET → scoring immédiat
    if (evt && evt.type === "swingComplete") {
      console.log("🏁 swingComplete — MODE SCORING UNIQUEMENT");
      handleSwingComplete(evt.data);
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
  //   COMPUTE SCORE (fonction manquante ajoutée)
  // ---------------------------------------------------------
  function computeSwingScorePremium(swing) {
    // Scoring basique temporaire - à améliorer avec vraie analyse
    return {
      total: Math.floor(Math.random() * 40) + 60,  // score entre 60-100
      triangleScore: Math.floor(Math.random() * 30) + 70,
      lagScore: Math.floor(Math.random() * 30) + 70,
      planeScore: Math.floor(Math.random() * 30) + 70,
      rotationScore: Math.floor(Math.random() * 30) + 70,
      tempoScore: Math.floor(Math.random() * 30) + 70,
    };
  }


  // ---------------------------------------------------------
  //   SWING COMPLETE → REVIEW
  // ---------------------------------------------------------
  // ---------------------------------------------------------
//   SWING COMPLETE → REVIEW
// ---------------------------------------------------------
function handleSwingComplete(data) {
  console.log("🏁 SWING COMPLETE (SCORING ONLY MODE)");
  console.log("📊 Scores :", data.scores);

  // 🛡️ VALIDATION : Éviter les faux positifs
  const swingDuration = data.keyframes?.finish?.index - data.keyframes?.address?.index || 0;
  const MIN_FRAMES = 60; // Au moins 2 secondes à 30fps
  
  if (swingDuration < MIN_FRAMES) {
    console.warn(`⚠️ SWING TROP COURT (${swingDuration} frames) - IGNORÉ`);
    console.warn("Un vrai swing doit durer au moins 2 secondes");
    return; // ❌ Ne pas afficher le résultat
  }

  // ✅ Swing valide, afficher le résultat
  const reviewEl = document.getElementById("swing-review");
  const scoreEl  = document.getElementById("swing-review-score");
  const commentEl = document.getElementById("swing-review-comment");

  console.log("reviewEl trouvé ?", reviewEl);
  console.log("scoreEl trouvé ?", scoreEl);
  console.log("commentEl trouvé ?", commentEl);

  if (reviewEl && scoreEl && commentEl) {
    reviewEl.style.display = 'block';
    scoreEl.textContent = `Score : ${data.scores.total}/100`;
    commentEl.textContent = coachTechnicalComment(data.scores);
    
    const nextBtn = document.getElementById("swing-review-next");
    if (nextBtn) {
      nextBtn.onclick = () => {
        console.log("🔄 Swing suivant cliqué");
        reviewEl.style.display = 'none';
        state = JSW_STATE.POSITIONING;
        updateUI();
        
        // Réinitialiser le moteur
        if (engine) {
          engine.reset();
          console.log("🔄 Engine réinitialisé");
        }
        
        // Relancer la boucle si nécessaire
        if (!loopId) {
          loopId = requestAnimationFrame(mainLoop);
        }
      };
    }
    
    // Bouton "Définir comme référence"
    const refBtn = document.getElementById("swing-save-reference");
    if (refBtn) {
      refBtn.onclick = () => {
        console.log("⭐ Swing défini comme référence");
        referenceSwing = data;
        alert("✅ Ce swing est maintenant votre référence !");
      };
    }
  } else {
    // FALLBACK : Créer modal dynamiquement
    console.warn("⚠️ Éléments review manquants, création dynamique");
    showResultModal(data.scores);
  }
}

// Bouton "Définir comme référence"
const refBtn = document.getElementById("swing-save-reference");
if (refBtn) {
  refBtn.onclick = () => {
    console.log("⭐ Swing défini comme référence");
    referenceSwing = data;
    alert("✅ Ce swing est maintenant votre référence !");
  };
}
    } else {
      // FALLBACK : Créer modal dynamiquement
      console.warn("⚠️ Éléments review manquants, création dynamique");
      showResultModal(data.scores);
    }
  }


  // ---------------------------------------------------------
  //   MODAL DYNAMIQUE (si HTML manquant)
  // ---------------------------------------------------------
  function showResultModal(scores) {
    let modal = document.getElementById("swing-review-modal");
    
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "swing-review-modal";
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.95);
        color: white;
        padding: 40px;
        border-radius: 20px;
        z-index: 10000;
        text-align: center;
        min-width: 350px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      `;
      document.body.appendChild(modal);
    }

    const score = scores.total;
    const comment = coachTechnicalComment(scores);

    modal.innerHTML = `
      <h2 style="margin-bottom: 20px; font-size: 24px;">🏌️ Résultat du Swing</h2>
      <div style="font-size: 64px; font-weight: bold; margin: 30px 0; color: #4CAF50;">${score}/100</div>
      <p style="font-size: 18px; margin-bottom: 30px; line-height: 1.5;">${comment}</p>
      <button id="modal-close-btn" style="
        background: #4CAF50;
        color: white;
        border: none;
        padding: 15px 40px;
        font-size: 18px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
      " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">
        Swing suivant 🏌️
      </button>
    `;

    modal.style.display = "block";

    document.getElementById("modal-close-btn").onclick = () => {
      modal.style.display = "none";
      state = JSW_STATE.POSITIONING;
      updateUI();
    };
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
  //   HISTORIQUE (fallback)
  // ---------------------------------------------------------
  function refreshSwingHistoryUI() {
    console.warn("refreshSwingHistoryUI: fonction par défaut (aucun historique affiché)");
    
    const el = document.getElementById("swing-history");
    if (!el) return;

    el.innerHTML = "<p style='opacity:0.5;'>Historique désactivé pour le moment</p>";
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
    if (!statusTextEl) return;
    
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
