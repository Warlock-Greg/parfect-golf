// =========================================================
//   JUST SWING — Orchestrateur PRO (Parfect 2025)
//   Flow : START → COUNTDOWN → ROUTINE → SWING → SCORE
//   Dépend : window.SwingEngine, window.JustSwing.onPoseFrame()
// =========================================================

const $$ = (id) => document.getElementById(id);

// =====================================================
// I18N V1 — FR / EN
// =====================================================
window.PARFECT_LANG =
  localStorage.getItem("parfect_lang") ||
  window.PARFECT_LANG ||
  "fr";

window.PARFECT_I18N = {
  fr: {
    ui: {
      startSwing: "Démarrer le swing 🏌️",
      retrySwing: "🔁 Recommencer le swing",
      nextSwing: "Swing suivant",
      close: "Fermer",
      history: "Historique",
      score: "Score",
      replayFullscreen: "🔁 Replay plein écran",
      noSessionSwings: "Aucun swing dans la session"
    },
    status: {
      noFullBody: "Je ne te vois pas entièrement 👀 Reviens bien dans le cadre.",
      swingComplete: "Swing Complete"
    },
    quota: {
      blockedTitle: "🚫 Analyse bloquée",
      blockedBody: "Tu as analysé {limit} swings.<br>Passe PRO pour continuer avec l’analyse IA."
    },
    routine: {
      checkSetup: "Vérifie (3sec) \ngrip ✋ \nposture 🧍‍♂️ \nalignement 🎯",
      holdAddress: "Maintien l'Adresse… (3sec) \nRespire \n😮‍💨",
      swingNow: "*SWING ! \n🏌️"
    },
    review: {
      referenceParfect: "🧠 Réf Parfect",
      referenceMine: "⭐ Ma réf",
      objective_rotation: "Tourne les épaules et stabilise les hanches.",
      objective_tempo: "Montée fluide, descente engagée.",
      objective_triangle: "Garde le triangle bras/épaules stable.",
      objective_weightShift: "Transfère progressivement le poids vers l’avant.",
      objective_extension: "Tends les bras après impact.",
      objective_balance: "Termine en équilibre."
    },
    metrics: {
      rotation: "Rotation",
      tempo: "Tempo",
      triangle: "Triangle",
      weightShift: "Transfert",
      extension: "Extension",
      balance: "Balance",
      plan: "Plan"
    },
    coach: {
      globalGood: "Bon swing 👍 Les fondamentaux sont en place. Continue comme ça.",
      sessionGreat: "Très belle séance. Les fondamentaux sont en place. Continue comme ça 👍",
      globalPriority: "Priorité : travaille {metric}.",
      metric_tempo: "le tempo",
      metric_rotation: "la rotation",
      metric_triangle: "le triangle bras/épaules",
      metric_weightShift: "le transfert d’appui",
      metric_extension: "l’extension",
      metric_balance: "l’équilibre",
      metric_plan: "le plan de swing",
      tempoAddTime: "Tempo à {ratio}:1. La cible est proche de {target}:1. Ajoute environ {delta}s à la montée pour retrouver un rythme plus fluide.",
      tempoStartDownSooner: "Tempo à {ratio}:1. La cible est proche de {target}:1. Ta montée est déjà longue : engage un peu plus tôt la descente.",
      weightShiftForwardShort: "Transfert avant encore court : {actual} mesuré à l’impact, pour une zone cible autour de {target}. Cherche environ {delta} de transfert supplémentaire vers l’avant.",
      weightShiftBackShort: "Charge encore un peu plus au backswing : {actual} mesuré, cible autour de {target}.",
      extensionShort: "Extension encore courte : {actual} mesuré pour une cible autour de {target}. Il manque environ {delta} d’amplitude.",
      extensionEarlyFold: "Extension incomplète : {actual} mesuré pour une cible autour de {target}. Tes bras se replient trop tôt après impact : laisse-les s’allonger plus longtemps vers la cible.",
      balanceShort: "Finish à stabiliser : déplacement mesuré {actual}. Termine plus posé, avec la tête au-dessus des hanches et le poids sur l’avant.",
      balanceShortNoValue: "Finish à stabiliser : termine plus posé, avec la tête au-dessus des hanches et le poids sur l’avant.",
      rotationImprove: "Rotation perfectible : épaules {shoulder}, hanches {hip}. Cherche plus de rotation d’épaules tout en gardant les hanches plus stables."
    }
  },
  en: {
    ui: {
      startSwing: "Start swing 🏌️",
      retrySwing: "🔁 Try again",
      nextSwing: "Next swing",
      close: "Close",
      history: "History",
      score: "Score",
      replayFullscreen: "🔁 Fullscreen replay",
      noSessionSwings: "No swings in this session"
    },
    status: {
      noFullBody: "I can't see your full body 👀 Step back into the frame.",
      swingComplete: "Swing Complete"
    },
    quota: {
      blockedTitle: "🚫 Analysis locked",
      blockedBody: "You have already analyzed {limit} swings.<br>Upgrade to PRO to keep using AI analysis."
    },
    routine: {
      checkSetup: "Check (3 sec) \ngrip ✋ \nposture 🧍‍♂️ \nalignment 🎯",
      holdAddress: "Hold address… (3 sec) \nBreathe \n😮‍💨",
      swingNow: "*SWING ! \n🏌️"
    },
    review: {
      referenceParfect: "🧠 Parfect ref",
      referenceMine: "⭐ My ref",
      objective_rotation: "Turn the shoulders and keep the hips stable.",
      objective_tempo: "Smooth backswing, committed downswing.",
      objective_triangle: "Keep the arm/shoulder triangle stable.",
      objective_weightShift: "Shift pressure progressively toward the lead side.",
      objective_extension: "Extend the arms after impact.",
      objective_balance: "Finish in balance."
    },
    metrics: {
      rotation: "Rotation",
      tempo: "Tempo",
      triangle: "Triangle",
      weightShift: "Weight shift",
      extension: "Extension",
      balance: "Balance",
      plan: "Plane"
    },
    coach: {
      globalGood: "Good swing 👍 The fundamentals are in place. Keep going.",
      sessionGreat: "Very good session. The fundamentals are in place. Keep going 👍",
      globalPriority: "Priority: work on {metric}.",
      metric_tempo: "tempo",
      metric_rotation: "rotation",
      metric_triangle: "the arm/shoulder triangle",
      metric_weightShift: "weight shift",
      metric_extension: "extension",
      metric_balance: "balance",
      metric_plan: "swing plane",
      tempoAddTime: "Tempo at {ratio}:1. The target is close to {target}:1. Add about {delta}s to the backswing to restore a smoother rhythm.",
      tempoStartDownSooner: "Tempo at {ratio}:1. The target is close to {target}:1. Your backswing is already long enough: start the downswing a little earlier.",
      weightShiftForwardShort: "Forward shift is still short: {actual} measured at impact for a target zone around {target}. Try to add about {delta} more shift toward the lead side.",
      weightShiftBackShort: "Load a little more in the backswing: {actual} measured, target around {target}.",
      extensionShort: "Extension is still short: {actual} measured for a target around {target}. About {delta} of extension is missing.",
      extensionEarlyFold: "Extension is incomplete: {actual} measured for a target around {target}. Your arms fold too early after impact: let them extend longer toward the target.",
      balanceShort: "Finish needs more stability: measured movement {actual}. Finish more quietly, with the head above the hips and pressure on the lead side.",
      balanceShortNoValue: "Finish needs more stability: finish more quietly, with the head above the hips and pressure on the lead side.",
      rotationImprove: "Rotation can improve: shoulders {shoulder}, hips {hip}. Turn the shoulders more while keeping the hips quieter."
    }
  }
};

function setParfectLang(lang) {
  const next = ["fr", "en"].includes(lang) ? lang : "fr";
  window.PARFECT_LANG = next;
  localStorage.setItem("parfect_lang", next);
}

function getParfectLang() {
  return window.PARFECT_LANG || "fr";
}

function t(path, fallback = "") {
  const lang = getParfectLang();
  const dict = window.PARFECT_I18N?.[lang] || window.PARFECT_I18N?.fr || {};
  const value = path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), dict);
  return value ?? fallback ?? path;
}

function tt(path, vars = {}, fallback = "") {
  let str = t(path, fallback);
  Object.keys(vars).forEach((key) => {
    str = str.replaceAll(`{${key}}`, String(vars[key]));
  });
  return str;
}

// =====================================================
// HELPERS COMMUNS
// =====================================================
function fmt(v, d = 2) {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";
}

function fmtCoach(v, d = 2) {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";
}

function jswClamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function jswDist(a, b) {
  if (!a || !b) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function jswLineAngleDeg(a, b) {
  if (!a || !b) return null;
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

function jswDegDiff(a, b) {
  if (a == null || b == null) return null;
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

function safePose(pose) {
  return Array.isArray(pose) ? pose : null;
}

function jswSafePoseFromKF(kf) {
  if (!kf) return null;
  if (kf.pose) return kf.pose;
  if (Array.isArray(kf)) return kf;
  return null;
}

function LM(pose, idx) {
  if (!pose || !Array.isArray(pose)) return null;
  return pose[idx] ?? null;
}

function scoreCoachCurve(value, target, tol, maxScore = 20, minScore = 2) {
  if (
    typeof value !== "number" || !Number.isFinite(value) ||
    typeof target !== "number" || !Number.isFinite(target) ||
    typeof tol !== "number" || !Number.isFinite(tol) || tol <= 0
  ) return minScore;

  const error = (value - target) / tol;
  const raw = maxScore * Math.exp(-(error * error));
  return Math.round(jswClamp(raw, minScore, maxScore));
}

function scoreCoachCurve10(value, target, tol, minScore = 2) {
  return Math.round(jswClamp(scoreCoachCurve(value, target, tol, 10, minScore), minScore, 10));
}

function scoreCoachCurve20(value, target, tol, minScore = 4) {
  return Math.round(jswClamp(scoreCoachCurve(value, target, tol, 20, minScore), minScore, 20));
}
const JSW_STATE = {
  IDLE: "IDLE",
  WAITING_START: "WAITING_START", // bouton start affiché
  COUNTDOWN: "COUNTDOWN",         // 3-2-1-Go
  ROUTINE: "ROUTINE",             // messages guidés
  POSITIONING: "POSITIONING",
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

// ================================
// 🧠 SESSION D’ENTRAÎNEMENT ACTIVE
// ================================
window.TrainingSession = {
  startedAt: Date.now(),
  swings: [] // max 5
};

window.jswReferenceMode = "system"; 
// "system" | "user"


// --- ADDRESS DETECTION ---
let addressBuffer = [];
let pendingAddress = false;
let addressLocked = false;

const ADDRESS_FRAMES_REQUIRED = 5;
const ADDRESS_EPSILON = 0.015; // tolérance stabilité


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

// === FLAGS SESSION ===
let isRecordingActive = false;
let captureArmed = false;
  
  let frameIndex = 0;

  let resultPanelEl, scoreGlobalEl, scoreDetailsEl, coachCommentEl, swingEl;

  let state = JSW_STATE.IDLE;
  let mode = JSW_MODE.SWING;
  let currentClubType = "fer7";

  let lastPose = null;
  let lastFullBodyOk = false;
 

  let loopId = null;
  let countdownInterval = null;
  let routineTimer = null;
  let routineIndex = 0;
  let routineInterval = null;  // ← nécessaire pour la routine guidée

  let swingIndex = 0;
  let activeSwing = null;

    // --- Swing capture guards ---
  let swingTimeout = null;
  let swingCompleted = false;

  let engine = null;

    // ----- REPLAY SWING -----
  let lastSwing = null;
  let replayFrameIndex = 0;
  let replayPlaying = false;
  let replayTimer = null;
  let replayCanvas = null;
  let replayCtx = null;
  let replayPlayBtn = null;
  let replaySpeedSel = null;
  let replayTimeline = null;

  
  function fmt(v, d = 2) {
  return typeof v === "number" && Number.isFinite(v)
    ? v.toFixed(d)
    : "—";
}



async function loadActiveReference() {
  const club =
    window.currentClubType ||
    document.getElementById("jsw-club-select")?.value ||
    "fer7";

  const view =
    window.jswViewType ||
    document.getElementById("jsw-camera-select")?.value ||
    "faceOn";

  const refSystem = await window.getSystemReference?.(club, view);
  const refUser = await window.getUserReference?.(club, view);

  const fallback =
    window.ParfectReference?.[club] ||
    window.ParfectReference?.default ||
    null;

  // objets complets pour l'UI
  window.parfectReference = refSystem || null;
  window.userReference = refUser || null;

  // ---------------------------------------------------
  // Helpers de compatibilité V2
  // ---------------------------------------------------
  const userData = refUser?.data || null;
  const systemData = refSystem?.data || null;

  const isV2 = (ref) => ref?.schema_version === 2;

  // priorité :
  // 1) user V2
  // 2) system V2
  // 3) fallback local
  const rawRef =
    (isV2(userData) ? userData : null) ||
    (isV2(systemData) ? systemData : null) ||
    fallback ||
    null;

  if (!rawRef) {
    console.warn("⚠️ Aucune référence disponible");
    window.REF = null;
    return;
  }

  const isDTL = view === "dtl";

  // ---------------------------------------------------
  // Fallbacks intelligents par vue
  // ---------------------------------------------------
  const rotationShoulderTarget = isDTL ? 45 : 0.40;
  const rotationShoulderTol = isDTL ? 15 : 0.20;

  const rotationHipTarget = isDTL ? 25 : 0.10;
  const rotationHipTol = isDTL ? 12 : 0.10;

  const rotationXFactorTarget = isDTL ? 15 : 0.22;
  const rotationXFactorTol = isDTL ? 8 : 0.10;

  const tempoTarget = 3.05;
  const tempoTol = 1.2;

  const weightBackTarget = 0.05;
  const weightBackTol = 0.16;

  const weightFwdTarget = 0.10;
  const weightFwdTol = 0.18;

  const extensionTarget = 2.5;
  const extensionTol = 1.2;

  window.REF = {
    schema_version: rawRef?.schema_version ?? 2,

    rotation: {
      shoulder: {
        target:
          rawRef?.rotation?.ref?.shoulder?.target ??
          rawRef?.rotation?.stages?.baseToTop?.target?.shoulder ??
          rotationShoulderTarget,
        tol:
          rawRef?.rotation?.ref?.shoulder?.tol ??
          rawRef?.rotation?.stages?.baseToTop?.tol?.shoulder ??
          rotationShoulderTol
      },
      hip: {
        target:
          rawRef?.rotation?.ref?.hip?.target ??
          rawRef?.rotation?.stages?.baseToTop?.target?.hip ??
          rotationHipTarget,
        tol:
          rawRef?.rotation?.ref?.hip?.tol ??
          rawRef?.rotation?.stages?.baseToTop?.tol?.hip ??
          rotationHipTol
      },
      xFactor: {
        target:
          rawRef?.rotation?.ref?.xFactor?.target ??
          rotationXFactorTarget,
        tol:
          rawRef?.rotation?.ref?.xFactor?.tol ??
          rotationXFactorTol
      }
    },

    tempo: {
      ratio: {
        target:
          rawRef?.tempo?.ratio?.target ??
          rawRef?.tempo?.targetRatio ??
          tempoTarget,
        tol:
          rawRef?.tempo?.ratio?.tol ??
          rawRef?.tempo?.tolRatio ??
          tempoTol
      }
    },

    weightShift: {
      back: {
        target:
          rawRef?.weightShift?.back?.target ??
          Math.abs(rawRef?.weightShift?.shiftBack ?? weightBackTarget),
        tol:
          rawRef?.weightShift?.back?.tol ??
          weightBackTol
      },
      fwd: {
        target:
          rawRef?.weightShift?.fwd?.target ??
          Math.abs(rawRef?.weightShift?.shiftFwd ?? weightFwdTarget),
        tol:
          rawRef?.weightShift?.fwd?.tol ??
          weightFwdTol
      }
    },

    extension: {
      target:
        rawRef?.extension?.target ??
        rawRef?.extension?.value ??
        rawRef?.extension?.extFinish ??
        extensionTarget,
      tol:
        rawRef?.extension?.tol ??
        extensionTol
    },

    triangle: rawRef?.triangle || null,
    balance: rawRef?.balance || null
  };

  console.log("🎯 Active reference", {
    club,
    view,
    userId: refUser?.id ?? null,
    systemId: refSystem?.id ?? null,
    userSchema: userData?.schema_version ?? null,
    systemSchema: systemData?.schema_version ?? null,
    fallbackSchema: fallback?.schema_version ?? null,
    source:
      (isV2(userData) ? "user_v2" : null) ||
      (isV2(systemData) ? "system_v2" : null) ||
      "fallback_json_v2"
  });

  console.log("📊 REF normalisée", window.REF);
  console.log("REF rotation", window.REF?.rotation);
  console.log("REF tempo", window.REF?.tempo);
}

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
    swingEl = $$("jsw-swing-label");

    if (!screenEl || !videoEl || !overlayEl || !bigMsgEl) {
      console.warn("❌ JustSwing: DOM incomplet");
      return;
    }

    ctx = overlayEl.getContext("2d", { willReadFrequently: true });
    
    resizeOverlay();
  
   
    window.addEventListener("resize", () => {
    resizeOverlay();
      });
    

    console.log("✅ JustSwing initialisé");
  }

   const clubSelect = document.getElementById("jsw-club-select");

  if (clubSelect) {
    clubSelect.addEventListener("change", e => {
      currentClubType = e.target.value;
      console.log("🏌️ Club changé :", currentClubType);
      loadActiveReference(); // 🔥 IMPORTANT
    });

    // 🔥 important : sync au chargement
    currentClubType = clubSelect.value;
  }
  window.REF ??= null;

fetch("/data/parfect_reference.json")
  .then(r => r.json())
  .then(json => {
    window.ParfectReference = json;

    // ✅ SOURCE UNIQUE UTILISÉE PAR LE MOTEUR
    window.REF = json.default;
    console.log("📌 Parfect Reference loaded", json);
  })
  .catch(err => {
    console.warn("⚠️ Parfect reference not loaded", json);
    loadActiveReference();
  });
  

  // =========================================================
// ⏭️ JUST SWING — NEXT SWING (SOURCE UNIQUE)
// =========================================================
function nextSwing() {
  console.log("➡️ JustSwing.nextSwing()");

  // -----------------------------------------------------
  // 1️⃣ UI — fermer la review
  // -----------------------------------------------------
  const review = document.getElementById("swing-review");
  if (review) {
    review.classList.remove("active");
    review.style.display = "none";
  }

  // 🔥 réafficher la zone swing
  const swingArea = document.getElementById("just-swing-area");
  if (swingArea) {
    swingArea.style.display = "block";
  }

  const breakdown = document.getElementById("swing-score-breakdown");
  if (breakdown) breakdown.innerHTML = "";

  // -----------------------------------------------------
  // 2️⃣ RESET FLAGS SWING
  // -----------------------------------------------------
  captureArmed = false;
  isRecordingActive = false;
  addressLocked = false;
  pendingAddress = false;
  swingCompleted = false;
  addressCaptured = false;

  addressStabilityBuffer = [];

  // -----------------------------------------------------
  // 3️⃣ RESET TIMEOUT
  // -----------------------------------------------------
  if (swingTimeout) {
    clearTimeout(swingTimeout);
    swingTimeout = null;
  } 
  if (engine) engine.reset();

  // -----------------------------------------------------
  // 4️⃣ RESET MACHINE ÉTAT
  // -----------------------------------------------------
  state = JSW_STATE.ROUTINE;
  updateUI();

  // -----------------------------------------------------
  // 5️⃣ RELANCE ROUTINE DIRECTEMENT
  // -----------------------------------------------------
  setTimeout(() => {
    console.log("🏌️ Nouvelle routine");
    startRoutineSequence();
  }, 200);
}


  
function getUserLicence() {
  return window.userLicence || null;
}
  
function exportSwingForTraining(swing, scores) {
  const data = {
    metadata: {
      club: swing.club,
      view: swing.viewType,
      timestamp: Date.now(),
      userId: window.userId
    },
    keyframes: swing.keyFrames,
    scores: scores.metrics,
    rawFrames: swing.frames // compressé
  };
  
  // POST vers ton backend pour entraîner un modèle custom
  fetch("/api/swings/training", {
    method: "POST",
    body: JSON.stringify(data)
  });
}
  function resizeOverlay() {
    if (!overlayEl || !videoEl) return;
    overlayEl.width = videoEl.clientWidth || window.innerWidth;
    overlayEl.height = videoEl.clientHeight || window.innerHeight;
  }

function registerKeyframe(type, index, pose) {
  if (!window.currentSwing) return;

  if (!window.currentSwing.keyframeLandmarks) {
    window.currentSwing.keyframeLandmarks = {};
  }

  // snapshot profond (anti-mutation)
  window.currentSwing.keyframeLandmarks[type] = {
    index,
    pose: pose.map(p => ({
      x: p.x,
      y: p.y,
      z: p.z ?? null,
      v: p.visibility ?? null
    }))
  };
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

// =====================================================
// ❌ FERMER LE SWING REVIEW → RETOUR HOME
// =====================================================
window.jswGoHome = function () {
  console.log("⬅️ JSW → HOME");

  // 1️⃣ Stop logique JustSwing
  window.JustSwing?.stopSession?.();

  // 2️⃣ Reset moteur si présent
  window.SwingEngine?.reset?.();

  // 3️⃣ Nettoyage UI review
  document.getElementById("swing-review")?.remove();
  document.getElementById("swing-review-panel")?.remove();
  document.getElementById("swing-score-breakdown")?.remove();

  // 4️⃣ Sortie fullscreen
  document.body.classList.remove("jsw-fullscreen");

  // 5️⃣ Navigation Home (router = source de vérité)
  const homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.click();
  } else {
    console.warn("⚠️ home-btn introuvable → reload sécurité");
    location.reload();
  }
};



  
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

async function canStartSwing() {
  // ---------------------------------
  // MODE ACCÈS LIBRE
  // ---------------------------------
  if (window.PARFECT_FLAGS?.OPEN_ACCESS) {
    return true;
  }

  const user = window.userLicence;

  // Sécurité : pas de user → on autorise (évite blocage dur)
  if (!user) return true;

  // ---------------------------------
  // PRO → toujours OK
  // ---------------------------------
  if (user.licence === "pro") {
    return true;
  }

  // ---------------------------------
  // FREE → quota total 15 swings
  // ---------------------------------
  const used = Number(user.swing_quota_used || 0);
  const limit = 15;

  if (used >= limit) {
    showBigMessage(`
      🚫 Analyse bloquée<br>
      <span style="opacity:.85;">
        Tu as analysé ${limit} swings.<br>
        Passe PRO pour continuer avec l’analyse IA.
      </span>
    `);
    return false;
  }

  return true;
}

function initSwingHeaderControls() {

  // 🔒 évite double initialisation
  if (window._jswHeaderInit) return;
  window._jswHeaderInit = true;

  const cameraSelect = document.getElementById("jsw-camera-select");

  if (cameraSelect) {

    // valeur par défaut
    window.jswViewType = cameraSelect.value;

    cameraSelect.addEventListener("change", (e) => {
      window.jswViewType = e.target.value;
      console.log("📐 Vue changée :", window.jswViewType);
    });
  }

  document.getElementById("jsw-quit-btn")?.addEventListener("click", () => {
    exitJustSwing(); // 👈 on utilise ta fonction propre
  });
}
  
// ---------------------------------------------------------
//   BOUTON START + CHOIX VUE (Face-On / Mobile FO / DTL)
// ---------------------------------------------------------
function showStartButton() {
  if (!bigMsgEl) return;

  state = JSW_STATE.WAITING_START;
  updateUI();

  bigMsgEl.innerHTML = `
    <div class="jsw-start-card">
      <button id="jsw-start-btn" class="jsw-btn-primary">
        ${t("ui.startSwing")}
      </button>
    </div>
  `;

  bigMsgEl.style.opacity = 1;

  document.getElementById("jsw-start-btn")?.addEventListener("click", () => {

    // ✅ Vérification quota
    if (!canStartSwing()) return;

    console.log("🚀 Lancement routine");
    startRoutineSequence(); // on lance direct la routine
  });
}




  function startCountdown() {
    if (!bigMsgEl) return;

    state = JSW_STATE.COUNTDOWN;
    updateUI();

    let n = 5;
    bigMsgEl.innerHTML = `<div style="font-size:4rem;font-weight:800;color:var(--jsw-text);">${n}</div>`;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      n--;
      if (n > 0) {
        bigMsgEl.innerHTML = `<div class="jsw-big-msg-inner">${n}</div>`;
      } else {
        bigMsgEl.innerHTML = `<div class="jsw-go">GO ! 🏌️</div>`;
        clearInterval(countdownInterval);
        countdownInterval = null;

        setTimeout(() => {
          //Si on ne voit pas le corps entier → on prévient
          if (!lastFullBodyOk) {
            showBigMessage("Je ne te vois pas entièrement 👀 Reviens bien dans le cadre.");
            state = JSW_STATE.POSITIONING;
            updateUI();
           // On laisse le joueur se replacer, puis il pourra relancer Start
            setTimeout(() => startRoutineSequence(), 2500);
            return;
          }

          // Sinon on lance la routine guidée
          startRoutineSequence();
        }, 500);
      }
    }, 1000);
  }

function jswGetViewMessage() {
  const view = window.jswViewType || "faceOn";

  if (view === "faceOn") {
    return `
      <div style="text-align:center;">
        <div style="font-size:2.5rem;">📸</div>
        <b>Face-On</b><br>
        Caméra face à toi, corps entier visible 👣
      </div>
    `;
  }

  if (view === "dtl") {
    return `
      <div style="text-align:center;">
        <div style="font-size:2.5rem;">📸➡️🏌️</div>
        <b>Down-The-Line</b><br>
        Caméra derrière toi, dans l’axe du swing 🎯
      </div>
    `;
  }

  // fallback ultra safe
  return `
    <div style="text-align:center;">
      <div style="font-size:2.5rem;">📸</div>
      Place-toi entièrement dans le cadre 👣
    </div>
  `;
}


function computeGlobalMovement(poseA, poseB) {
  if (!poseA || !poseB) return 0;

  const IDS = [11, 12, 23, 24]; // épaules + hanches
  let sum = 0;
  let count = 0;

  for (const id of IDS) {
    const a = poseA[id];
    const b = poseB[id];
    if (!a || !b) continue;

    sum += Math.hypot(b.x - a.x, b.y - a.y);
    count++;
  }

  return count ? sum / count : 0;
}

  
function hasRealMotion(swing) {
   const frames = swing.frames || [];
   let total = 0;

   for (let i = 1; i < frames.length; i++) {
     const p0 = frames[i - 1]?.[15]; // poignet lead
     const p1 = frames[i]?.[15];
     if (!p0 || !p1) continue;
     total += Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y);
   }

   return total > 0.08; // seuil mobile validé
 }

function isValidSwing(swing) {
  const kf = swing.keyFrames || {};

  // impact indispensable
  if (!kf.impact) return false;

  // top OU backswing acceptable
  if (!kf.top && !kf.backswing) return false;

  // durée minimale
  if (!swing.frames || swing.frames.length < 25) return false;

  // mouvement réel
  if (!hasRealMotion(swing)) return false;

  return true;
}



  function showSwingRetryButton(messageHtml) {
  if (!bigMsgEl) return;

  bigMsgEl.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:1.1rem; margin-bottom:14px;">
        ${messageHtml}
      </div>

      <button id="jsw-retry-btn" style="
        background:var(--jsw-green);
        color:#111;
        border:none;
        border-radius:14px;
        padding:14px 28px;
        font-size:1.2rem;
        font-weight:700;
        cursor:pointer;
      ">
        ${t("ui.retrySwing")}
      </button>
    </div>
  `;

  bigMsgEl.style.opacity = 1;

  const btn = document.getElementById("jsw-retry-btn");
  if (btn) {
    btn.onclick = () => {
      bigMsgEl.style.opacity = 0;
      bigMsgEl.innerHTML = "";
      startRoutineSequence(); // 🔥 relance directe
    };
  }
}

  
  // ---------------------------------------------------------
  //   ROUTINE GUIDÉE
  // ---------------------------------------------------------
function getRoutineStepsAuto() {
  return [
    t("routine.checkSetup"),
    t("routine.holdAddress")
  ];
}


  function showSwingMessage() {
  if (!bigMsgEl) return;

  bigMsgEl.innerHTML = t("routine.swingNow");
  bigMsgEl.style.opacity = 1;
  bigMsgEl.classList.add("swing-active");
}

function startRoutineSequence() {
const routineStepsAuto = getRoutineStepsAuto();
showBigMessage(routineStepsAuto[0]);

  if (!bigMsgEl) return;

  // Reset UX
  frameIndex = 0;
  captureArmed = false;
  isRecordingActive = false;
  addressStabilityBuffer = [];


  state = JSW_STATE.ROUTINE;
  console.log("▶️ Routine démarrée");
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

     // 👉 Fin de routine → armement swing
setTimeout(() => {
  console.log("⏳ Routine terminée → passage en capture directe");

  // 1️⃣ Armement moteur (NE DOIT PAS reset activeSwing après)
  engine.armForSwing();

  // 2️⃣ État capture
  captureArmed = true;
  isRecordingActive = true;
  state = JSW_STATE.SWING_CAPTURE;
  frameIndex = 0;

  // 3️⃣ CRÉATION UNIQUE DU SWING ACTIF (SOURCE DE VÉRITÉ)
  activeSwing = {
    frames: [],
    timestamps: [],
    keyFrames: {},
    keyframeLandmarks: {},
    club: currentClubType || "?",
    view: window.jswViewType || null,
    fps: engine?.fps || null
  };

  // 4️⃣ Prépare le lock adresse (UNE SEULE FOIS)
  pendingAddress = true;
  addressLocked = false;
  addressStabilityBuffer = [];

  console.log("🎯 Swing ARMÉ → prêt pour ADDRESS");
  console.log("🏌️ Capture ACTIVE (state=SWING_CAPTURE, rec=true)");

  showSwingMessage();
  updateUI();

  // 5️⃣ Timeout de sécurité swing (ZEN)
// 👉 Ne bloque JAMAIS la review
const SWING_TIMEOUT_MS = 6000;

swingTimeout = setTimeout(() => {
  if (!activeSwing) return;
//chgt 10 mars
//const impactSeen =!!activeSwing?.keyFrames?.impact || !!engine?.keyFrames?.impact;
//const finishSeen = !!activeSwing?.keyFrames?.finish || !!engine?.keyFrames?.finish;
const impactSeen =
  !!activeSwing?.keyFrames?.impact ||
  !!engine?.keyFrames?.impact;

const finishSeen =
  !!activeSwing?.keyFrames?.finish ||
  !!engine?.keyFrames?.finish;

  if (!impactSeen || !finishSeen) {
    console.warn("⏱️ Swing encore en cours au timeout", {
      impactSeen,
      finishSeen
    });

    // ⚠️ Marque le swing comme partiel
    activeSwing.flags = {
      ...(activeSwing.flags || {}),
      partial: true,
      impactSeen,
      finishSeen,
      reason: "timeout"
    };

    // 🔕 PAS de stopRecording ici
    // 🔕 PAS de retry forcé
    // 👉 Le moteur continuera jusqu’au finish ou fallback
  }
}, SWING_TIMEOUT_MS);


}, 500);

    }
  }, 1500);
}




function showGoButtonAfterRoutine() {
  bigMsgEl.innerHTML = `
      <button id="jsw-go-btn" style="
        background:var(--jsw-green); padding:20px 40px;
        font-size:2rem; border-radius:14px;
        font-weight:bold; cursor:pointer; border:none;
      ">GO ! 🏌️</button>
  `;
  bigMsgEl.style.opacity = 1;

  document.getElementById("jsw-go-btn").onclick = () => {
    console.log("🟢 GO pressed — starting capture");
    bigMsgEl.style.opacity = 0;
    bigMsgEl.innerHTML = "";

  // ⭐ ESSENTIEL : l'état doit passer en ADDRESS_READY
  state = JSW_STATE.ADDRESS_READY;

  // ⭐ Armer la capture : SwingEngine peut déclencher KEYFRAME
  captureArmed = true;

  // ⭐ Reset index frames
  frameIndex = 0;

  updateUI();

  // ⭐ Démarre réellement l’enregistrement
    activateRecording();   // 👉 ACTIVATION SEULEMENT ICI
  };
}

  let engineRetryCount = 0;
const MAX_ENGINE_RETRY = 50;

  
function initEngine() {
  if (!window.SwingEngine || !window.SwingEngine.create) {
    console.error("❌ SwingEngine introuvable");
    return;
  }

  engine = window.SwingEngine.create({
    fps: 30,

    onKeyFrame: (evt) => {
      console.log("🎯 KEYFRAME", evt);
        const { type, index, pose } = evt;

  if (type && typeof index === "number" && Array.isArray(pose)) {
    registerKeyframe(type, index, pose);
  }

    },

    onSwingComplete: (evt) => {
    
      console.log("🏁 SWING COMPLETE", evt);
      activeSwing = null;


      if (swingTimeout) {
          clearTimeout(swingTimeout);
          swingTimeout = null;
        }
      handleSwingComplete(evt.data || evt);
      if (bigMsgEl) {
        bigMsgEl.style.opacity = 0;
        bigMsgEl.innerHTML = "Swing Complete";
        bigMsgEl.classList.remove("swing-active");
        }

        

    }
  });

  console.log("🔧 SwingEngine READY", engine);
}


async function getTodaySwingCount(email) {
  if (!email) return 0;

  const url =
    `${window.NOCODB_SWINGS_URL}?` +
    `where=(` +
      `cy88wsoi5b8bq9s,eq,${encodeURIComponent(email)}` +
    `)`;

  console.log("📊 NocoDB FETCH URL =", url);

  const res = await fetch(url, {
    headers: { "xc-token": window.NOCODB_TOKEN }
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("❌ NocoDB error:", txt);
    throw new Error("Impossible de récupérer les swings");
  }

  const data = await res.json();

  // ⏱️ Filtrage côté JS (aujourd’hui uniquement)
  const today = new Date().toISOString().slice(0, 10);

  return (data.list || []).filter(r =>
    r.createdAt?.startsWith(today)
  ).length;
}


  window.getTodaySwingCount = getTodaySwingCount;
 // ---------------------------------------------------------
  //   swing finish hanche
  // ---------------------------------------------------------

function detectFinishByStability(frames, lastIndex) {

  if (lastIndex < 6) return false;

  const poseA = frames[lastIndex - 3];
  const poseB = frames[lastIndex];

  if (!poseA || !poseB) return false;

  const LH1 = poseA[23];
  const RH1 = poseA[24];

  const LH2 = poseB[23];
  const RH2 = poseB[24];

  if (!LH1 || !RH1 || !LH2 || !RH2) return false;

  const hips1 = {
    x: (LH1.x + RH1.x) / 2,
    y: (LH1.y + RH1.y) / 2
  };

  const hips2 = {
    x: (LH2.x + RH2.x) / 2,
    y: (LH2.y + RH2.y) / 2
  };

  const move = Math.hypot(
    hips2.x - hips1.x,
    hips2.y - hips1.y
  );

  return move < 0.015;
}
  
  
  // ---------------------------------------------------------
  //   SESSION START / STOP
  // ---------------------------------------------------------
  function startSession(selectedMode = JSW_MODE.SWING) {
// 🔒 Garde licence — POINT D’ENTRÉE UNIQUE
    console.log("🔐 USER LICENCE RAW =", window.userLicence);

  if (!window.PARFECT_LICENCE_OK) {
    console.warn("⛔ JustSwing bloqué : licence requise");
   // 👉 OUVRIR LA MODAL DE CRÉATION DE COMPTE
  // 🛑 cacher l'écran JustSwing
    const swingArea = document.getElementById("just-swing-area");
    if (swingArea) swingArea.style.display = "none";

    // 👉 ouvrir la modale compte
    if (typeof window.showEmailModal === "function") {
      window.showEmailModal();
    } else {
      alert("🎯 Analyse ton swing gratuitement. Crée ton compte pour commencer");
    }


  return;
}
    
    if (!screenEl) initJustSwing();

    mode = selectedMode;
    state = JSW_STATE.WAITING_START;
    captureArmed = false;
    swingIndex = 0;
    lastPose = null;
    lastFullBodyOk = false;

    // Init moteur SwingEngine
    initEngine();


    // Affichage écran plein JustSwing
    screenEl.classList.remove("hidden");
    document.body.classList.add("jsw-fullscreen");

    updateUI();
    showStartButton();
    window.isSwingSessionActive = true;


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
    window.isSwingSessionActive = false;
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
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;

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
  //   DRAW OVERLAY (reference)
  // ---------------------------------------------------------
    function drawPoseOnCanvas(pose, canvas, ctx, color="gba(255,255,255,0.7)") {
    if (!canvas || !ctx || !pose) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    const w = canvas.width;
    const h = canvas.height;

    const p = (i) =>
      pose[i] ? { x: pose[i].x * w, y: pose[i].y * h } : null;

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

    ctx.fillStyle = color;
    [11,12,13,14,15,16,23,24,25,26,27,28].forEach((i) => {
      const pt = p(i);
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

// =====================================================
// ADRESSE STABLE — détection simple et robuste
// =====================================================

const ADDRESS_STABILITY_FRAMES = 6;

let addressCaptured = false;
let addressStabilityBuffer = [];

function isStableAddress(pose, frameIndex) {
  if (!pose || !Array.isArray(pose)) return false;

  addressStabilityBuffer.push(pose);

  if (addressStabilityBuffer.length > ADDRESS_STABILITY_FRAMES) {
    addressStabilityBuffer.shift();
  }

  if (addressStabilityBuffer.length < ADDRESS_STABILITY_FRAMES) {
    return false;
  }

  const first = addressStabilityBuffer[0];
  const last  = addressStabilityBuffer[addressStabilityBuffer.length - 1];

  let total = 0;
  let count = 0;

  for (let i = 0; i < first.length; i++) {
    if (!first[i] || !last[i]) continue;

    const dx = first[i].x - last[i].x;
    const dy = first[i].y - last[i].y;

    total += Math.hypot(dx, dy);
    count++;
  }

  if (!count) return false;

  const avgDist = total / count;
  const isStable = avgDist < ADDRESS_EPSILON;

  if (isStable && !addressCaptured && typeof frameIndex === "number") {
    addressCaptured = true;

    registerKeyframe("address", frameIndex, pose);

    addressStabilityBuffer = [];

    console.log("📍 ADDRESS CAPTURED @ frame", frameIndex);
  }

  return isStable;
}

  

  // ---------------------------------------------------------
  //   MEDIAPIPE CALLBACK
  // ---------------------------------------------------------
function onPoseFrame(landmarks) {

  lastPose = landmarks || null;
  lastFullBodyOk = detectFullBody(landmarks);

  if (!engine || !landmarks) return;
  if (state !== JSW_STATE.SWING_CAPTURE) return;

// =====================================================
// 🔒 LOCK ADRESSE — posture statique AVANT swing
// (source de vérité: activeSwing.keyFrames)
// =====================================================
if (pendingAddress && !addressLocked && isStableAddress(landmarks)) {

  // Sécurité
  if (!activeSwing) {
    console.warn("🔒 ADDRESS LOCK skipped: no activeSwing");
    return;
  }
  if (!activeSwing.keyFrames) activeSwing.keyFrames = {};
  if (!activeSwing.keyframeLandmarks) activeSwing.keyframeLandmarks = {};

  // index = frame courant (si tu pushes frames ailleurs, sinon 0)
  const addrIndex = Array.isArray(activeSwing.frames) ? activeSwing.frames.length : 0;

  // snapshot profond (évite mutation mediapipe)
  const poseSnap = Array.isArray(landmarks)
    ? landmarks.map(p => ({
        x: p.x, y: p.y,
        z: p.z ?? null,
        visibility: p.visibility ?? null
      }))
    : null;

  if (!poseSnap) {
    console.warn("🔒 ADDRESS LOCK failed: no landmarks");
    return;
  }

  // ✅ SOURCE DE VÉRITÉ POUR LE SCORING
  activeSwing.keyFrames.address = { index: addrIndex, pose: poseSnap };

  // ✅ Optionnel (debug / export)
  activeSwing.keyframeLandmarks.address = { index: addrIndex, pose: poseSnap };

  pendingAddress = false;
  addressLocked = true;

  console.log("🔒 ADDRESS LOCKED (SWING)", addrIndex, {
    hasActiveSwing: true,
    frames: addrIndex,
    hasKeyFrames: !!activeSwing.keyFrames
  });
}




  
  // ----------------------------
  // 1 Toujours pousser la frame au moteur
  // ----------------------------
  const now = performance.now();
  const evt = engine.processPose(landmarks, now, currentClubType);

  if (!engine.keyFrames) return;

 

  // ----------------------------
  // 2 FIN DE SWING
  // ----------------------------
  if (evt && evt.type === "swingComplete") {
    isRecordingActive = false;
    captureArmed = false;

    handleSwingComplete(evt.data || evt);
  }
}

function closeSwingReview() {
  console.log("❌ FERMER → retour Home");

  // 1) Stop session JustSwing proprement
  if (window.JustSwing?.stopSession) {
    window.JustSwing.stopSession();
  }

  // 2) Nettoyage UI fullscreen
  document.body.classList.remove("jsw-fullscreen");

  const reviewPanel = document.getElementById("swing-review-panel");
  if (reviewPanel) {
    reviewPanel.style.display = "none";
  }

  // 3) Retour HOME via router (source de vérité)
  const homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.click();
  } else {
    console.warn("⚠️ home-btn introuvable → reload sécurité");
    window.location.reload();
  }
}


  // ---------------------------------------------------------
  //   FULL BODY DETECTION
  // ---------------------------------------------------------
 function detectFullBody(lm) {
  if (!lm || lm.length < 31) return false;

 const head = lm[0];         // Nose
  const lhip = lm[23];        // left_hip
  const rhip = lm[24];        // right_hip

  // Tous doivent exister
  if (!head || !lhip || !rhip) return false;

  // Actuellement certaines valeurs peuvent être null ou 0 = hors cadre
  const inside = (p) =>
    p.visibility > 0.15 &&       // 👈 très important
    p.x > 0.02 && p.x < 0.98 &&
    p.y > 0.02 && p.y < 0.98;

if (!inside(head)) return false;
  if (!inside(lhip)) return false;
  if (!inside(rhip)) return false;

  // Vérifier que la tête est au-dessus des hanches (évite les faux positifs)
  const h = Math.abs(head.y - Math.min(lhip.y, rhip.y));

  return h > 0.15 && h < 0.95;
}

  // 👇 Ajoute ceci !
window.detectFullBody = detectFullBody;


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

function jswPoseDistance(a, b) {
  if (!a || !b) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (!a[i] || !b[i]) continue;
    d += Math.abs(a[i].x - b[i].x) + Math.abs(a[i].y - b[i].y);
  }
  return d;
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

function safePose(pose) {
  return Array.isArray(pose) ? pose : null;
}

function poseFromKeyframe(type, kf, swing) {
  if (swing?.keyframeLandmarks?.[type]?.pose) {
    return swing.keyframeLandmarks[type].pose;
  }
  return jswSafePoseFromKF(kf[type]) || null;
}

  
function jswSafePoseFromKF(kf) {
  // keyFrame type { index, pose } ou { pose } selon le moteur
  if (!kf) return null;
  if (kf.pose) return kf.pose;
  if (Array.isArray(kf)) return kf;
  return null;
}

function getRef(ref, path, fallback = null) {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), ref) ?? fallback;
}


  function getActiveReference({ club, view }) {
  const systemRef = window.ParfectReference;
  const playerRef = window.PlayerReference || null;

  const key = `${club}_${view}`;

  // 1️⃣ Référence joueur spécifique
  if (playerRef?.[key]) return playerRef[key];

  // 2️⃣ Référence joueur générique
  if (playerRef?.default) return playerRef.default;

  // 3️⃣ Référence Parfect spécifique
  if (systemRef?.[key]) return systemRef[key];

  // 4️⃣ Référence Parfect générique
  if (systemRef?.default) return systemRef.default;

  // 5️⃣ Sécurité absolue
  console.warn("⚠️ No reference found, using empty reference");
  return {};
}


function selectBestReference(swing, playerHistory) {
  const { club, view } = swing;
  
  // 1️⃣ Référence personnelle (5+ swings similaires)
  if (playerHistory[club]?.count >= 5) {
    return computePersonalAverage(playerHistory[club].swings);
  }
  
  // 2️⃣ Référence Parfect adaptée au niveau
  const level = detectPlayerLevel(playerHistory); // "beginner" | "intermediate" | "advanced"
  return window.ParfectReference[`${club}_${view}_${level}`];
}
  


  function safePoseFromKF(frames, kfEntry) {
  if (!kfEntry) return null;
  const idx = (typeof kfEntry === "number") ? kfEntry :
              (typeof kfEntry.index === "number") ? kfEntry.index : null;
  if (idx == null) return null;
  const pose = frames[idx];
  return Array.isArray(pose) ? pose : null;
}


function computeTriangleStable(pose) {
  if (!pose) return null;
  const Ls = pose[11], Rs = pose[12];
  const Lh = pose[15], Rh = pose[16];
  if (!Ls || !Rs || !Lh || !Rh) return null;

  const mid = { x: (Ls.x + Rs.x)/2, y:(Ls.y + Rs.y)/2 };
  const left  = jswDist(Lh, mid);
  const right = jswDist(Rh, mid);

  return (left + right) / 2;
}

function scoreTriangleStable(addr, top, imp) {
  const base = computeTriangleStable(addr);
  const vTop = computeTriangleStable(top);
  const vImp = computeTriangleStable(imp);

  if (!base || !vTop || !vImp) return 0.4; // socle

  const dTop = Math.abs(vTop - base) / base;
  const dImp = Math.abs(vImp - base) / base;

  const sTop = Math.max(0.3, 1 - dTop / 0.30);
  const sImp = Math.max(0.3, 1 - dImp / 0.25);

  return (sTop + sImp) / 2; // 0.3 → 1
}


function computeWeightShift(addr, top, imp) {
  if (!addr || !top || !imp) return { back: 0, forward: 0 };

  const hipMid = p => ({ x:(p[23].x+p[24].x)/2, y:(p[23].y+p[24].y)/2 });
  const footMid = p => ({ x:(p[27].x+p[28].x)/2, y:(p[27].y+p[28].y)/2 });

  const h0 = hipMid(addr);
  const h1 = hipMid(top);
  const h2 = hipMid(imp);

  const scale = Math.abs(addr[27].x - addr[28].x);  
  if (scale < 0.02) return { back: 0, forward: 0 };

  const backShift = (h1.x - h0.x) / scale;
  const fwdShift  = (h0.x - h2.x) / scale;

  return {
    back: jswClamp(backShift, -1, 1),
    forward: jswClamp(fwdShift, -1, 1)
  };
}

function scoreWeightShift(addr, top, imp) {
  const w = computeWeightShift(addr, top, imp);

  const back = Math.abs(w.back);
  const fwd  = Math.abs(w.forward);

  const sBack = Math.max(0.3, back / 0.25);
  const sFwd  = Math.max(0.3, fwd  / 0.30);

  return (sBack * 0.4 + sFwd * 0.6);
}


function scoreTempoRobust(timestamps, kf) {
  if (!timestamps || !kf.address || !kf.top || !kf.impact) return 0.4;

  const a = kf.address.index;
  const t = kf.top.index;
  const i = kf.impact.index;

  const tA = timestamps[a];
  const tT = timestamps[t];
  const tI = timestamps[i];

  if (!tA || !tT || !tI) return 0.4;

  const backswing = (tT - tA) / 1000;
  const downswing = (tI - tT) / 1000;

  if (backswing <= 0 || downswing <= 0) return 0.4;

  const ratio = backswing / downswing;
  const diff = Math.abs(ratio - 3);

  return Math.max(0.3, 1 - diff / 3);
}


  function jswComputeTempoFromSpeed(frames, timestamps, kf) {
  if (!frames || frames.length < 10) return { bs: null, ds: null, ratio: null };

  // 33 = right wrist index (MediaPipe) → prends ton landmark réel
  const WR = 16; 

  const speeds = [];
  for (let i = 1; i < frames.length; i++) {
    const p0 = frames[i-1][WR];
    const p1 = frames[i][WR];
    if (!p0 || !p1) continue;

    const dt = (timestamps[i] - timestamps[i-1]) / 1000;
    if (dt <= 0) continue;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const v = Math.hypot(dx, dy) / dt;

    speeds.push({ i, v });
  }

  if (speeds.length < 10) return { bs: null, ds: null, ratio: null };

  // 1️⃣ Trouver le TOP = vitesse minimale du backswing
  const minSpeed = speeds.reduce((a, b) => (b.v < a.v ? b : a));
  const topIndex = minSpeed.i;

  // 2️⃣ Impact = vitesse maximale dans la zone descendante
  const impactSpeed = speeds.reduce((a,b)=> (b.v > a.v ? b : a));
  const impactIndex = impactSpeed.i;

  const addrIndex = kf.address?.index ?? 0;

  // Durée backswing
  const bs = (timestamps[topIndex] - timestamps[addrIndex]) / 1000;

  // Durée downswing
  const ds = (timestamps[impactIndex] - timestamps[topIndex]) / 1000;

  const ratio = (bs > 0 && ds > 0) ? bs / ds : null;

  return { bs, ds, ratio };
}


function segmentAngle(A, B) {
  return Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI;
}

// =====================================================
// ROTATION SIGNATURE — Face-On & DTL
// Face-On = ratios projetés (comparés à la référence)
// =====================================================
function computeRotationSignature(basePose, topPose, viewType = "faceOn") {
  if (!basePose || !topPose) return null;

  // -----------------------------
  // DTL → angles réels (inchangé)
  // -----------------------------
  if (viewType === "dtl") {
    const LS0 = basePose[11], RS0 = basePose[12];
    const LH0 = basePose[23], RH0 = basePose[24];
    const LS1 = topPose[11],  RS1 = topPose[12];
    const LH1 = topPose[23],  RH1 = topPose[24];
    if (!LS0||!RS0||!LH0||!RH0||!LS1||!RS1||!LH1||!RH1) return null;

    const sh0 = jswLineAngleDeg(LS0, RS0);
    const sh1 = jswLineAngleDeg(LS1, RS1);
    const hip0 = jswLineAngleDeg(LH0, RH0);
    const hip1 = jswLineAngleDeg(LH1, RH1);

    return {
      shoulder: jswDegDiff(sh1, sh0),
      hip: jswDegDiff(hip1, hip0),
     // xFactor: jswDegDiff(sh1, sh0) - jswDegDiff(hip1, hip0)
    };
  }

  // -----------------------------
  // FACE-ON → ratios projetés
  // -----------------------------
  return computeRotationFaceOnRatio(basePose, topPose);
}


// =====================================================
// Rotation Face-On — ratios largeur projetée
// =====================================================
function computeRotationFaceOnRatio(basePose, topPose) {
  const LS0 = basePose[11], RS0 = basePose[12];
  const LH0 = basePose[23], RH0 = basePose[24];
  const LS1 = topPose[11],  RS1 = topPose[12];
  const LH1 = topPose[23],  RH1 = topPose[24];

  if (!LS0 || !RS0 || !LH0 || !RH0 || !LS1 || !RS1 || !LH1 || !RH1) {
    return null;
  }

  // Largeurs projetées
  const shBase = Math.abs(LS0.x - RS0.x);
  const shTop  = Math.abs(LS1.x - RS1.x);
  const hipBase = Math.abs(LH0.x - RH0.x);
  const hipTop  = Math.abs(LH1.x - RH1.x);

  // 🛡️ Sécurité numérique (évite divisions foireuses)
  if (shBase < 0.02 || hipBase < 0.02) {
    return null;
  }

  // 🔑 Rotation = variation RELATIVE (pas absolue)
  const shoulderRotation = 1 - shTop / shBase;
  const hipRotation      = 1 - hipTop / hipBase;

  return {
    shoulder: shoulderRotation,
    hip: hipRotation
  };
}




function scoreRotationFromReference(measure, ref) {
  if (!measure || !ref) return { score: 0 };

  const s = jswClamp(1 - Math.abs(measure.shoulder - ref.shoulder.target) / ref.shoulder.tol, 0, 1);
  const h = jswClamp(1 - Math.abs(measure.hip      - ref.hip.target)      / ref.hip.tol,      0, 1);

  return {
    score: Math.round((s * 0.4 + h * 0.4 + x * 0.2) * 20),
    details: { s, h}
  };
}




  function LM(pose, idx) {
  if (!pose || !Array.isArray(pose)) return null;
  return pose[idx] ?? null;
}

  function computeExtensionParfects(ext) {
  if (!ext) return 0;

  let stars = 0;

  // ⭐ 1 — extension réelle après impact
  if (
    typeof ext.extImpact === "number" &&
    typeof ext.extFinish === "number" &&
    ext.extFinish > ext.extImpact
  ) {
    stars++;
  }

  // ⭐ 2 — finish stable
  if (
    typeof ext.headMove === "number" &&
    typeof ext.headOverHips === "number" &&
    ext.headMove <= 0.15 &&
    ext.headOverHips <= 0.20
  ) {
    stars++;
  }

  return stars; // 0, 1 ou 2
}



function computeDTLPlanScore(swing) {
  const kf = swing.keyFrames;
  const refPose = kf?.top?.pose || kf?.backswing?.pose;

  if (!refPose) {
    return {
      score: null,
      deviation: null,
      status: "incomplete",
      details: "Plan non mesuré"
    };
  }

  const shoulderL = refPose[11];
  const shoulderR = refPose[12];
  const wrist = refPose[15]; // poignet lead

  if (!shoulderL || !shoulderR || !wrist) {
    return {
      score: null,
      deviation: null,
      status: "incomplete",
      details: "Plan non mesuré"
    };
  }

  // Ligne médiane des épaules
  const shoulderMidX = (shoulderL.x + shoulderR.x) / 2;

  // Écart poignet / ligne épaules
  const deviation = Math.abs(wrist.x - shoulderMidX);

  let score;
  if (deviation < 0.03) score = 18;
  else if (deviation < 0.05) score = 14;
  else if (deviation < 0.08) score = 9;
  else score = 4;

  return {
    score,
    deviation: Number(deviation.toFixed(3)),
    status: "ok"
  };
}



  
// =====================================================
// 🔧 KEYFRAME POSE RESOLVER (SOURCE DE VÉRITÉ)
// =====================================================
function getKeyframePose(type, metrics, activeSwing) {
  return (
    metrics?.keyframes?.[type]?.pose ||
    activeSwing?.keyFrames?.[type]?.pose ||
    activeSwing?.keyframeLandmarks?.[type]?.pose ||
    null
  );
}


function confidenceFloor(conf, low = 0.45, high = 0.80) {
  if (typeof conf !== "number" || !Number.isFinite(conf)) return 0.75;

  if (conf <= low) return 0.70;
  if (conf >= high) return 1.00;

  const t = (conf - low) / (high - low);
  return 0.70 + t * 0.30;
}

function applyConfidenceSoftening(score, conf, maxScore) {
  if (typeof score !== "number" || !Number.isFinite(score)) return score;

  const floorRatio = confidenceFloor(conf);

  const floor =
    maxScore === 20
      ? Math.round(20 * floorRatio * 0.5)
      : Math.round(10 * floorRatio * 0.5);

  return Math.max(score, floor);
}
  

// ---------------------------------------------------------
//   PREMIUM SCORING – utilise les keyFrames du SwingEngine
//   Gère les vues : faceOn / mobileFaceOn / dtl
// ---------------------------------------------------------

async function computeSwingScorePremium(swing) {
  const REF = window.REF || null;

  const frames = Array.isArray(swing?.frames) ? swing.frames : [];
  const kf = swing?.keyFrames || swing?.keyframes || {};
  const T = Array.isArray(swing?.timestamps) ? swing.timestamps : [];

  const swingQuality = swing?.quality || {};
  const keyframeConfidence = swingQuality?.confidence || {};

  const rawView = (window.jswViewType || window.jswViewOverride || "faceOn").toLowerCase();
  const viewType =
    rawView.includes("mobile") ? "mobileFaceOn" :
    (rawView.includes("dtl") || rawView.includes("line")) ? "dtl" :
    "faceOn";

  const addressPose = safePose(jswSafePoseFromKF(kf.address));
  const backswingPose = safePose(jswSafePoseFromKF(kf.backswing));
  const topPose = safePose(jswSafePoseFromKF(kf.top));
  const impactPose = safePose(jswSafePoseFromKF(kf.impact));
  const finishPose = safePose(jswSafePoseFromKF(kf.finish));

  const metrics = {
    posture: {},
    rotation: {},
    triangle: {},
    weightShift: {},
    extension: {},
    tempo: {},
    balance: {},
    viewType
  };

  // =====================================================
  // POSTURE
  // =====================================================
  if (addressPose) {
    const LS = addressPose[11], RS = addressPose[12];
    const LH = addressPose[23], RH = addressPose[24];
    const LA = addressPose[27], RA = addressPose[28];

    const hipsMid = (LH && RH) ? { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 } : null;
    const shMid = (LS && RS) ? { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 } : null;

    let flexionDeg = 30;
    if (hipsMid && shMid) {
      const vx = hipsMid.x - shMid.x;
      const vy = hipsMid.y - shMid.y;
      const norm = Math.hypot(vx, vy) || 1;
      const vyNorm = vy / norm;
      flexionDeg = Math.acos(jswClamp(vyNorm, -1, 1)) * 180 / Math.PI;
    }

    const feetWidth = (LA && RA) ? jswDist(LA, RA) : null;
    const shoulderWidth = (LS && RS) ? jswDist(LS, RS) : null;
    const feetShoulderRatio = (feetWidth && shoulderWidth) ? feetWidth / shoulderWidth : 1.0;

    const shoulderAngle = jswLineAngleDeg(LS, RS);
    const hipAngle = jswLineAngleDeg(LH, RH);
    const alignDiff = jswDegDiff(shoulderAngle, hipAngle) ?? 0;

    const flexScore = jswClamp(1 - Math.abs(flexionDeg - 35) / 25, 0, 1);
    const ratioScore = jswClamp(1 - Math.abs(feetShoulderRatio - 1.2) / 0.7, 0, 1);
    const alignScore = jswClamp(1 - alignDiff / 20, 0, 1);

    metrics.posture = {
      flexionDeg,
      feetShoulderRatio,
      alignDiff,
      score: Math.round((flexScore + ratioScore + alignScore) / 3 * 10)
    };
  } else {
    metrics.posture.score = 10;
  }

    // =====================================================
  // ROTATION
  // - DTL  : angles réels
  // - FACE : rotation épaules + hanches contenues + séparation (xFactor)
  // =====================================================
  metrics.rotation = { stages: {}, score: 0, status: "incomplete" };

  const basePoseRot = addressPose || backswingPose || null;
  const topPoseRot = topPose || backswingPose || null;

  if (basePoseRot && topPoseRot) {
    const m = computeRotationSignature(basePoseRot, topPoseRot, viewType);

    if (m && typeof m.shoulder === "number" && typeof m.hip === "number") {
      const shoulder = m.shoulder;
      const hip = m.hip;
      const xFactor = shoulder - hip;

      metrics.rotation.measure = { shoulder, hip, xFactor };

      let score = 0;

      // -------------------------------------------------
      // DTL → logique angle réel
      // -------------------------------------------------
      if (viewType === "dtl") {
        const SHOULDER_OK = 45;
        const HIP_OK = 25;
        const SEP_OK = 10;
        const sep = shoulder - hip;

        if (shoulder >= SHOULDER_OK) score += 10;
        else if (shoulder >= 30) score += 6;
        else if (shoulder >= 20) score += 3;

        if (hip >= HIP_OK) score += 6;
        else if (hip >= 15) score += 4;
        else if (hip >= 10) score += 2;

        if (sep >= SEP_OK) score += 4;

        metrics.rotation.ref = {
          shoulder: { target: SHOULDER_OK, tol: 15 },
          hip: { target: HIP_OK, tol: 12 },
          xFactor: { target: SEP_OK, tol: 8 }
        };

        metrics.rotation.stages.baseToTop = {
          actual: { shoulder, hip, xFactor: sep },
          target: {
            shoulder: SHOULDER_OK,
            hip: HIP_OK,
            xFactor: SEP_OK
          },
          tol: {
            shoulder: 15,
            hip: 12,
            xFactor: 8
          },
          score
        };
      }

      // -------------------------------------------------
      // FACE-ON → ratios projetés recalibrés
      // Objectif :
      // - épaules = vrai moteur du score
      // - hanches = ne doivent plus tuer la note
      // - xFactor = valorise la dissociation
      // -------------------------------------------------
      else {
     const refRot = window.REF?.rotation || null;

const shoulderTarget = refRot?.shoulder?.target ?? 0.40;
const shoulderTol = Math.max(refRot?.shoulder?.tol ?? 0.22, 0.22);

const hipSoftCap = refRot?.hip?.target ?? 0.18;
const hipTol = Math.max(refRot?.hip?.tol ?? 0.12, 0.12);

const xFactor = shoulder - hip;
const xFactorTarget = refRot?.xFactor?.target ?? 0.18;
const xFactorTol = Math.max(refRot?.xFactor?.tol ?? 0.10, 0.10);

// 1) Score principal = épaules
const shoulder20 = scoreCoachCurve20(shoulder, shoulderTarget, shoulderTol, 4);

// 2) Bonus séparation
let xFactorAdj = 0;

if (xFactor >= 0) {
  const xFactor20 = scoreCoachCurve20(xFactor, xFactorTarget, xFactorTol, 4);
  // convertit en ajustement léger de -2 à +4
  xFactorAdj = Math.round((xFactor20 - 10) * 0.4);
} else {
  // séparation négative = pénalité forte
  xFactorAdj = -6;
}

// 3) Pénalité bassin trop envahissant
let hipPenalty = 0;
if (hip > hipSoftCap + hipTol) {
  hipPenalty = -3;
} else if (hip > hipSoftCap) {
  hipPenalty = -1;
}

// 4) Score final
score = jswClamp(
  Math.round(shoulder20 + xFactorAdj + hipPenalty),
  0,
  20
);

metrics.rotation.ref = {
  shoulder: { target: shoulderTarget, tol: shoulderTol },
  hip: { target: hipSoftCap, tol: hipTol },
  xFactor: { target: xFactorTarget, tol: xFactorTol }
};

metrics.rotation.stages.baseToTop = {
  actual: { shoulder, hip, xFactor },
  target: {
    shoulder: shoulderTarget,
    hip: hipSoftCap,
    xFactor: xFactorTarget
  },
  tol: {
    shoulder: shoulderTol,
    hip: hipTol,
    xFactor: xFactorTol
  },
  subScores: {
    shoulder: shoulder20,
    xFactorAdj,
    hipPenalty
  },
  score
};
      }

      metrics.rotation.score = Math.max(0, Math.min(20, Math.round(score)));
      metrics.rotation.status = "ok";

      console.log("ROTATION DEBUG", {
        viewType,
        shoulder,
        hip,
        xFactor,
        ref: metrics.rotation.ref,
        stage: metrics.rotation.stages?.baseToTop,
        finalScore: metrics.rotation.score
      });
    } else {
      metrics.rotation.status = "invalid-measure";
      metrics.rotation.score = 0;
    }
  }
  

  // =====================================================
  // TRIANGLE
  // =====================================================
  let triangleScore = 10;

  if (topPose && impactPose) {
    const basePose = addressPose || backswingPose || topPose;

    const LS0 = LM(basePose, 11), RS0 = LM(basePose, 12), LW0 = LM(basePose, 15);
    const LS1 = LM(topPose, 11),  RS1 = LM(topPose, 12),  LW1 = LM(topPose, 15);
    const LS2 = LM(impactPose, 11), RS2 = LM(impactPose, 12), LW2 = LM(impactPose, 15);

    if (LS0 && RS0 && LW0 && LS1 && RS1 && LW1 && LS2 && RS2 && LW2) {
      const shoulderW0 = jswDist(LS0, RS0);

      if (shoulderW0 && shoulderW0 > 0) {
        const refTri = jswDist(LS0, LW0) / shoulderW0;
        const topV = jswDist(LS1, LW1) / shoulderW0;
        const impV = jswDist(LS2, LW2) / shoulderW0;

        const varTop = Math.abs(topV - refTri) / refTri * 100;
        const varImp = Math.abs(impV - refTri) / refTri * 100;

        const scoreTop = jswClamp(1 - varTop / 22, 0, 1);
        const scoreImp = jswClamp(1 - varImp / 16, 0, 1);

        triangleScore = Math.round((scoreTop * 0.5 + scoreImp * 0.5) * 20);

        metrics.triangle = {
          refRatio: refTri,
          topRatio: topV,
          impactRatio: impV,
          varTopPct: varTop,
          varImpactPct: varImp,
          score: Math.max(4, triangleScore)
        };
      }
    }
  }

  const triTopConf = keyframeConfidence?.top ?? kf.top?.confidence ?? null;
  const triImpactConf = keyframeConfidence?.impact ?? kf.impact?.confidence ?? null;
  const triConfidence =
    typeof triTopConf === "number" && typeof triImpactConf === "number"
      ? Math.min(triTopConf, triImpactConf)
      : null;

  metrics.triangle.confidenceTop = triTopConf;
  metrics.triangle.confidenceImpact = triImpactConf;
  metrics.triangle.confidence = triConfidence;
  metrics.triangle.score = applyConfidenceSoftening(Math.max(4, triangleScore), triConfidence, 20);

  // =====================================================
  // WEIGHT SHIFT
  // =====================================================
  let weightShiftScore = 6;

  metrics.weightShift = {
    shiftBack: null,
    shiftFwd: null,
    absBack: null,
    absFwd: null,
    backScore: null,
    fwdScore: null,
    targetBack: null,
    targetFwd: null,
    tolBack: null,
    tolFwd: null,
    deltaBack: null,
    deltaFwd: null,
    confidenceTop: null,
    confidenceImpact: null,
    confidence: null,
    score: 6,
    status: "incomplete"
  };

  if (topPose && impactPose) {
    const basePose = addressPose || backswingPose || topPose;

    const LH0 = LM(basePose, 23), RH0 = LM(basePose, 24);
    const LH1 = LM(topPose, 23), RH1 = LM(topPose, 24);
    const LH2 = LM(impactPose, 23), RH2 = LM(impactPose, 24);
    const LS0 = LM(basePose, 11), RS0 = LM(basePose, 12);

    if (LH0 && RH0 && LH1 && RH1 && LH2 && RH2 && LS0 && RS0) {
      const hips0 = { x: (LH0.x + RH0.x) / 2, y: (LH0.y + RH0.y) / 2 };
      const hips1 = { x: (LH1.x + RH1.x) / 2, y: (LH1.y + RH1.y) / 2 };
      const hips2 = { x: (LH2.x + RH2.x) / 2, y: (LH2.y + RH2.y) / 2 };

      const shoulderWidth = jswDist(LS0, RS0);

      if (shoulderWidth && shoulderWidth > 0.001) {
        const shiftBack = (hips1.x - hips0.x) / shoulderWidth;
        const shiftFwd = (hips2.x - hips0.x) / shoulderWidth;

        const refWS = window.REF?.weightShift || null;
        const absBack = Math.abs(shiftBack);
        const absFwd = Math.abs(shiftFwd);

        const targetBack = refWS?.back?.target ?? 0.08;
        const targetFwd = refWS?.fwd?.target ?? 0.12;
        const tolBack = Math.max(refWS?.back?.tol ?? 0.12, 0.16);
        const tolFwd = Math.max(refWS?.fwd?.tol ?? 0.12, 0.18);

        const backScore10 = scoreCoachCurve10(absBack, targetBack, tolBack, 2);
        const fwdScore10 = scoreCoachCurve10(absFwd, targetFwd, tolFwd, 2);

        const weightShiftScore10 = Math.round(backScore10 * 0.4 + fwdScore10 * 0.6);
        weightShiftScore = Math.round(weightShiftScore10 * 2);

        metrics.weightShift = {
          shiftBack,
          shiftFwd,
          absBack,
          absFwd,
          backScore: Math.round(backScore10 * 2),
          fwdScore: Math.round(fwdScore10 * 2),
          targetBack,
          targetFwd,
          tolBack,
          tolFwd,
          deltaBack: absBack - targetBack,
          deltaFwd: absFwd - targetFwd,
          confidenceTop: null,
          confidenceImpact: null,
          confidence: null,
          score: weightShiftScore,
          status: "ok"
        };
      }
    }
  }

  const wsTopConf = keyframeConfidence?.top ?? kf.top?.confidence ?? null;
  const wsImpactConf = keyframeConfidence?.impact ?? kf.impact?.confidence ?? null;
  const wsConfidence =
    typeof wsTopConf === "number" && typeof wsImpactConf === "number"
      ? Math.min(wsTopConf, wsImpactConf)
      : (typeof wsTopConf === "number" ? wsTopConf :
         typeof wsImpactConf === "number" ? wsImpactConf : null);

  metrics.weightShift.confidenceTop = wsTopConf;
  metrics.weightShift.confidenceImpact = wsImpactConf;
  metrics.weightShift.confidence = wsConfidence;
  metrics.weightShift.score = applyConfidenceSoftening(metrics.weightShift.score, wsConfidence, 20);

  // =====================================================
  // EXTENSION
  // =====================================================
let extensionScore = 4;

metrics.extension = {
  extImpact: null,
  extFinish: null,
  progress: null,
  value: null,
  target: null,
  tol: null,
  deltaToTarget: null,
  confidenceImpact: null,
  confidence: null,
  status: "incomplete",
  score: 4
};

const ELS = impactPose?.[11];
const ERS = impactPose?.[12];
const ELW = impactPose?.[15];
const ERW = impactPose?.[16];

if (ELS && ERS && (ELW || ERW)) {
  const rawShoulderWidth = jswDist(ELS, ERS);

  // 🛡️ largeur d’épaules trop faible = mesure non fiable
  if (!rawShoulderWidth || rawShoulderWidth < 0.03) {
    metrics.extension.status = "invalid-width";
    metrics.extension.score = 4;
  } else {
    const shoulderWidth = rawShoulderWidth;

    const extImpactRaw = Math.max(
      ELW ? jswDist(ELS, ELW) : 0,
      ERW ? jswDist(ERS, ERW) : 0
    ) / shoulderWidth;

    let extFinishRaw = null;

    if (
      finishPose &&
      finishPose[11] &&
      finishPose[12] &&
      (finishPose[15] || finishPose[16])
    ) {
      const rawFinishShoulderWidth = jswDist(finishPose[11], finishPose[12]);

      if (rawFinishShoulderWidth && rawFinishShoulderWidth >= 0.03) {
        const swf = rawFinishShoulderWidth;

        extFinishRaw = Math.max(
          finishPose[15] ? jswDist(finishPose[11], finishPose[15]) : 0,
          finishPose[16] ? jswDist(finishPose[12], finishPose[16]) : 0
        ) / swf;
      }
    }

    // 🛡️ borne anti-explosion
    const extImpact = jswClamp(extImpactRaw, 0, 5);
    const extFinish = extFinishRaw != null ? jswClamp(extFinishRaw, 0, 5) : null;

    // valeur retenue
    const extensionValue = Math.max(extImpact, extFinish ?? 0);
    const progress = extFinish != null ? (extFinish - extImpact) : null;

    const refExt = window.REF?.extension || null;
    const target = refExt?.target ?? 2.5;
    const tol = Math.max(refExt?.tol ?? 1.0, 1.2);

    extensionScore = scoreCoachCurve10(extensionValue, target, tol, 2);

    // bonus léger si la sortie progresse vraiment
    if (typeof progress === "number" && progress > 0.10) {
      extensionScore = Math.min(10, extensionScore + 1);
    }

    metrics.extension = {
      extImpact,
      extFinish,
      progress,
      value: extensionValue,
      target,
      tol,
      deltaToTarget: extensionValue - target,
      confidenceImpact: null,
      confidence: null,
      status: "ok",
      score: extensionScore
    };
  }
}

const extImpactConf = keyframeConfidence?.impact ?? kf.impact?.confidence ?? null;
metrics.extension.confidenceImpact = extImpactConf;
metrics.extension.confidence = extImpactConf;
metrics.extension.score = applyConfidenceSoftening(metrics.extension.score, extImpactConf, 10);
  // =====================================================
  // TEMPO
  // =====================================================
  let tempoScore = null;
  const refTempo = window.REF?.tempo;

  let backswingT = null;
  let rawDownswingT = null;
  let downswingT = null;
  let ratio = null;
  let isClampedDownswing = false;

  const kfIdx = {
    address: kf.address?.index,
    top: kf.top?.index,
    impact: kf.impact?.index
  };

  if (
    typeof kfIdx.top === "number" &&
    typeof kfIdx.impact === "number" &&
    typeof kfIdx.address === "number" &&
    T.length > Math.max(kfIdx.address, kfIdx.top, kfIdx.impact)
  ) {
    const tAddr = T[kfIdx.address];
    const tTop = T[kfIdx.top];
    const tImpact = T[kfIdx.impact];

    if (tTop > tAddr && tImpact > tTop) {
      backswingT = (tTop - tAddr) / 1000;
      rawDownswingT = (tImpact - tTop) / 1000;

      const MIN_DOWNSWING = 0.12;
      isClampedDownswing = rawDownswingT < MIN_DOWNSWING;
      downswingT = Math.max(rawDownswingT, MIN_DOWNSWING);

      ratio = backswingT / downswingT;

      metrics.tempo = {
        backswingT,
        downswingT,
        rawDownswingT,
        isClampedDownswing,
        ratio,
        targetRatio: refTempo?.ratio?.target ?? null,
        tolRatio: refTempo?.ratio?.tol ?? null
      };

      if (refTempo?.ratio?.target != null && ratio != null) {
        const target = refTempo.ratio.target ?? 3.05;
        const softTol = Math.max(refTempo?.ratio?.tol ?? 0.8, 1.2);

        const error = (ratio - target) / softTol;
        const rawScore = 20 * Math.exp(-(error * error));

        const plausible = ratio >= 1.4 && ratio <= 4.8;
        const minScore = plausible ? 4 : 2;

        tempoScore = Math.round(jswClamp(rawScore, minScore, 20));
      }
    }
  }

  metrics.tempo.score = tempoScore;

  const topConf = keyframeConfidence?.top ?? kf.top?.confidence ?? null;
  const impactConf = keyframeConfidence?.impact ?? kf.impact?.confidence ?? null;
  const tempoConfidence =
    typeof topConf === "number" && typeof impactConf === "number"
      ? Math.min(topConf, impactConf)
      : (typeof topConf === "number" ? topConf :
         typeof impactConf === "number" ? impactConf : null);

  metrics.tempo.confidenceTop = topConf;
  metrics.tempo.confidenceImpact = impactConf;
  metrics.tempo.confidence = tempoConfidence;

  if (typeof tempoScore === "number") {
    tempoScore = applyConfidenceSoftening(tempoScore, tempoConfidence, 20);
    metrics.tempo.score = tempoScore;
  }

  // =====================================================
  // TEMPO ↔ EXTENSION
  // =====================================================
  if (metrics.extension?.score != null && metrics.tempo?.ratio != null) {
    if (metrics.tempo.ratio < 2.2) {
      metrics.extension.score = Math.min(10, metrics.extension.score + 1);
      metrics.extension.syncedWithTempo = true;
    }
  }

  // =====================================================
  // BALANCE
  // =====================================================
  let balanceScore = 7;

  if (finishPose) {
    const basePose = addressPose || backswingPose || topPose;

    const LHb = LM(basePose, 23), RHb = LM(basePose, 24);
    const LHf = LM(finishPose, 23), RHf = LM(finishPose, 24);
    const headFin = LM(finishPose, 0);

    if (LHb && RHb && LHf && RHf && headFin) {
      const hipsBase = { x: (LHb.x + RHb.x) / 2, y: (LHb.y + RHb.y) / 2 };
      const hipsFin = { x: (LHf.x + RHf.x) / 2, y: (LHf.y + RHf.y) / 2 };

      const headOverHips = Math.abs(headFin.x - hipsFin.x) < 0.08;
      const finishMove = jswDist(hipsBase, hipsFin) || 0;

      const headScore = headOverHips ? 1 : 0.5;
      const moveScore = jswClamp(1 - finishMove / 0.30, 0, 1);

      balanceScore = Math.round((headScore * 0.5 + moveScore * 0.5) * 10);

      metrics.balance = {
        headOverHips,
        finishMove,
        score: Math.max(2, balanceScore)
      };
    }
  }

  metrics.balance.score = Math.max(2, balanceScore);

  // =====================================================
  // PLAN DTL
  // =====================================================
  if (window.jswViewType === "dtl") {
    const plan = computeDTLPlanScore(swing);
    metrics.swingPlane = {
      score: plan.score,
      deviation: plan.deviation,
      status: plan.status
    };
  }

   // =====================================================
  // TOTAL = SOMME DES 6 MÉTRIQUES VISIBLES
  // =====================================================

  const metricScores = {
    rotation: metrics.rotation?.score ?? 0,     // /20
    tempo: metrics.tempo?.score ?? 0,           // /20
    triangle: metrics.triangle?.score ?? 0,     // /20
    weightShift: metrics.weightShift?.score ?? 0, // /20
    extension: metrics.extension?.score ?? 0,   // /10
    balance: metrics.balance?.score ?? 0        // /10
  };

  const total =
    metricScores.rotation +
    metricScores.tempo +
    metricScores.triangle +
    metricScores.weightShift +
    metricScores.extension +
    metricScores.balance;

  // =====================================================
  // COMPARAISON INFO AVEC RÉFÉRENCE
  // - ne pilote plus le total
  // - sert seulement à afficher / tracer
  // =====================================================

  function compareMetricToReference(metricName, metricObj, reference) {
    if (!metricObj || !reference) return null;

    if (metricName === "rotation") {
      const actual = metricObj?.stages?.baseToTop?.actual;
      const target = reference?.rotation || metricObj?.ref || null;

      if (!actual || !target) return null;

      return {
        actual: {
          shoulder: actual.shoulder ?? null,
          hip: actual.hip ?? null
        },
        target: {
          shoulder: target?.shoulder?.target ?? null,
          hip: target?.hip?.target ?? null
        },
        tol: {
          shoulder: target?.shoulder?.tol ?? null,
          hip: target?.hip?.tol ?? null
        },
        score: metricObj?.score ?? null
      };
    }

    if (metricName === "tempo") {
      return {
        actual: {
          backswingT: metricObj?.backswingT ?? null,
          downswingT: metricObj?.downswingT ?? null,
          ratio: metricObj?.ratio ?? null
        },
        target: {
          ratio: reference?.tempo?.ratio?.target ?? metricObj?.targetRatio ?? null
        },
        tol: {
          ratio: reference?.tempo?.ratio?.tol ?? metricObj?.tolRatio ?? null
        },
        score: metricObj?.score ?? null
      };
    }

    if (metricName === "triangle") {
      return {
        actual: {
          refRatio: metricObj?.refRatio ?? null,
          topRatio: metricObj?.topRatio ?? null,
          impactRatio: metricObj?.impactRatio ?? null,
          varTopPct: metricObj?.varTopPct ?? null,
          varImpactPct: metricObj?.varImpactPct ?? null
        },
        target: null,
        tol: null,
        score: metricObj?.score ?? null
      };
    }

    if (metricName === "weightShift") {
      return {
        actual: {
          back: metricObj?.absBack ?? metricObj?.shiftBack ?? null,
          forward: metricObj?.absFwd ?? metricObj?.shiftFwd ?? null
        },
        target: {
          back: reference?.weightShift?.back?.target ?? metricObj?.targetBack ?? null,
          forward: reference?.weightShift?.fwd?.target ?? metricObj?.targetFwd ?? null
        },
        tol: {
          back: reference?.weightShift?.back?.tol ?? metricObj?.tolBack ?? null,
          forward: reference?.weightShift?.fwd?.tol ?? metricObj?.tolFwd ?? null
        },
        score: metricObj?.score ?? null
      };
    }

    if (metricName === "extension") {
      return {
        actual: {
          impact: metricObj?.extImpact ?? null,
          finish: metricObj?.extFinish ?? null,
          value: metricObj?.value ?? null
        },
        target: {
          value: reference?.extension?.target ?? metricObj?.target ?? null
        },
        tol: {
          value: reference?.extension?.tol ?? metricObj?.tol ?? null
        },
        score: metricObj?.score ?? null
      };
    }

    if (metricName === "balance") {
      return {
        actual: {
          headOverHips: metricObj?.headOverHips ?? null,
          finishMove: metricObj?.finishMove ?? null
        },
        target: null,
        tol: null,
        score: metricObj?.score ?? null
      };
    }

    return null;
  }

  const referenceComparison = {
    system: {
      rotation: compareMetricToReference("rotation", metrics.rotation, window.systemReference || window.REF || null),
      tempo: compareMetricToReference("tempo", metrics.tempo, window.systemReference || window.REF || null),
      triangle: compareMetricToReference("triangle", metrics.triangle, window.systemReference || window.REF || null),
      weightShift: compareMetricToReference("weightShift", metrics.weightShift, window.systemReference || window.REF || null),
      extension: compareMetricToReference("extension", metrics.extension, window.systemReference || window.REF || null),
      balance: compareMetricToReference("balance", metrics.balance, window.systemReference || window.REF || null)
    },
    user: {
      rotation: compareMetricToReference("rotation", metrics.rotation, window.userReference || null),
      tempo: compareMetricToReference("tempo", metrics.tempo, window.userReference || null),
      triangle: compareMetricToReference("triangle", metrics.triangle, window.userReference || null),
      weightShift: compareMetricToReference("weightShift", metrics.weightShift, window.userReference || null),
      extension: compareMetricToReference("extension", metrics.extension, window.userReference || null),
      balance: compareMetricToReference("balance", metrics.balance, window.userReference || null)
    }
  };

  return {
    total,
    totalDynamic: total,

    totals: {
      system: null,
      user: null
    },

    scores: {
      rotation: metricScores.rotation,
      triangle: metricScores.triangle,
      weightShift: metricScores.weightShift,
      extension: metricScores.extension,
      tempo: metricScores.tempo,
      balance: metricScores.balance
    },

    breakdown: {
      rotation: {
        score: metricScores.rotation,
        metrics: metrics.rotation || null,
        compare: referenceComparison.system.rotation
      },
      triangle: {
        score: metricScores.triangle,
        metrics: metrics.triangle || null,
        compare: referenceComparison.system.triangle
      },
      weightShift: {
        score: metricScores.weightShift,
        metrics: metrics.weightShift || null,
        compare: referenceComparison.system.weightShift
      },
      extension: {
        score: metricScores.extension,
        metrics: metrics.extension || null,
        compare: referenceComparison.system.extension
      },
      tempo: {
        score: metricScores.tempo,
        metrics: metrics.tempo || null,
        compare: referenceComparison.system.tempo
      },
      balance: {
        score: metricScores.balance,
        metrics: metrics.balance || null,
        compare: referenceComparison.system.balance
      }
    },

    referenceComparison,
    metrics
  };
}


 function jswBuildLandmarksJSON(swing) {
  const frames = swing.frames || [];
  const ts = swing.timestamps || [];
  const KF = swing.keyFrames || {};

  const dump = {
    meta: {
      totalFrames: frames.length,
      keyframes: {
        address: KF.address?.index ?? null,
        backswing: KF.backswing?.index ?? null,
        top: KF.top?.index ?? null,
        downswing: KF.downswing?.index ?? null,
        impact: KF.impact?.index ?? null,
        release: KF.release?.index ?? null,
        finish: KF.finish?.index ?? null,
      }
    },
    frames: []
  };

  for (let i = 0; i < frames.length; i++) {
    const frameObj = {
      index: i,
      timestamp: ts[i] ?? null,
      landmarks: []
    };

    const lm = frames[i];
    if (!lm) {
      dump.frames.push(frameObj);
      continue;
    }

    for (let j = 0; j < lm.length; j++) {
      const p = lm[j];
      frameObj.landmarks.push({
        id: j,
        x: p.x,
        y: p.y,
        z: p.z ?? null,
        visibility: p.visibility ?? null
      });
    }

    dump.frames.push(frameObj);
  }

  return dump;
}


// =====================================================
// 💾 SAUVEGARDE SWING — NOCODB (VERSION STABLE)
// =====================================================
window.saveSwingToNocoDB = async function saveSwingToNocoDB(record) {
  try {
    if (!window.NOCODB_SWINGS_URL || !window.NOCODB_TOKEN) {
      throw new Error("Variables NocoDB manquantes");
    }

    const email = record?.email ?? window.userLicence?.email;
    if (!email) {
      throw new Error("Email utilisateur manquant");
    }

    // 🔥 Sécurise les objets
    const scores =
      typeof record.scores === "object" && record.scores !== null
        ? record.scores
        : {};

    const metrics =
      typeof record.metrics === "object" && record.metrics !== null
        ? record.metrics
        : {};

    const swingDump = jswBuildLandmarksJSON(record);

    const payload = {
      email,
      club: document.getElementById("jsw-club-select")?.value ?? "unknown",
      view: record.view ?? window.ViewType ?? "unknown",
      fps: record.fps ?? null,
      frames_count: record.frames?.length ?? 0,

      swing_json: swingDump,
      scores,
      metrics
    };

    console.log("📤 SAVING SWING:");
    console.log("scores →", scores);
    console.log("metrics →", metrics);

    const res = await fetch(window.NOCODB_SWINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xc-token": window.NOCODB_TOKEN
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`NocoDB ${res.status} — ${txt}`);
    }

    const data = await res.json();
    console.log("✅ Swing sauvegardé", data);

    return data;

  } catch (err) {
    console.error("❌ saveSwingToNocoDB error:", err);
    throw err;
  }
};

  
// ========================================
// ✅ APPELÉ QUAND UN SWING EST VALIDÉ
// ========================================
function onSwingValidated({ scores, currentClub, swing }) {
  if (!scores || !scores.breakdown) {
    console.warn("⚠️ onSwingValidated appelé sans breakdown", scores);
    return;
  }

  const breakdown = scores.breakdown;

  // =================================================
  // 1️⃣ SESSION LOCALE (5 derniers swings)
  // =================================================
  if (window.TrainingSession) {
    TrainingSession.swings.unshift({
      created_at: Date.now(),
      club: currentClub || "?",
      breakdown
    });

    TrainingSession.swings = TrainingSession.swings.slice(0, 5);

    if (typeof renderSessionHistoryInline === "function") {
      renderSessionHistoryInline();
    }
  }

  // =================================================
  // 2️⃣ LICENCE & USER (SOURCE DE VÉRITÉ)
  // =================================================
  const user = window.userLicence;
  const email = user?.email;

  if (!email) {
    console.warn("⚠️ Email utilisateur introuvable, swing non persisté");
    return;
  }

  // =================================================
  // 3️⃣ QUOTA SWING (1 swing analysé = 1 quota)
  // =================================================
  if (!window.PARFECT_FLAGS?.OPEN_ACCESS && user.licence === "free") {
    user.swing_quota_used = Number(user.swing_quota_used || 0) + 1;

    // Persist local
    localStorage.setItem("parfect_user", JSON.stringify(user));

    // Sync NocoDB (best effort)
    try {
      fetch(window.NOCODB_REFERENCES_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "xc-token": window.NOCODB_TOKEN
        },
        body: JSON.stringify({
          swing_quota_used: user.swing_quota_used
        })
      });
    } catch {}
  }

  // =================================================
  // 4️⃣ UI — rafraîchissement quota
  // =================================================
  if (typeof window.refreshSwingQuotaUI === "function") {
    window.refreshSwingQuotaUI();
  }



// ===============================
  // 3️⃣ SAUVEGARDE NOCODB - FORMAT COMPLET
  // ===============================
  const swingRecord = {
    cy88wsoi5b8bq9s: window.userLicence.email,
    club: swing?.club || currentClub || window.currentClubType || "?",
    view: swing?.view || window.jswViewType || "faceOn",
    frames_count: swing?.frames?.length || 0,
    keyframes: swing?.keyFrames || {},
    metrics: swing?.scores?.metrics || scores?.metrics || {},
    scores: swing?.scores || scores || {},
    is_valid: isValidSwing(swing),
    quality: swing?.quality || {}
  };
  
  console.log("📤 Envoi swing complet:", swingRecord);
  
  window.saveSwingToNocoDB(swingRecord).catch(err => {
    console.error("❌ Erreur sauvegarde swing:", err);
  });
}
  
// ---------------------------------------------------------
//   historique session
// ---------------------------------------------------------
  
function renderSessionHistoryInline() {
  const el = document.getElementById("swing-history");
  if (!el) return;

  const swings = window.TrainingSession?.swings || [];

  if (!swings.length) {
    el.innerHTML = `
      <div style="color:#777;font-size:0.85rem;">
        ${t("ui.noSessionSwings")}
      </div>`;
    return;
  }

  el.innerHTML = swings.map((s, i) => {
    const b = s.breakdown || {};

    const score = (k, max) =>
      typeof b[k]?.score === "number" ? `${b[k].score}/${max}` : "—";

    return `
  <div class="history-item session-item" data-swing-index="${i}">
  <div class="history-main">
    <span class="history-id">#${swings.length - i}</span>
    <span class="history-time">
      ${new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  </div>

  <div class="history-scores">
    <span title="Rotation">🎯 ${score("rotation", 20)}</span>
    <span title="Tempo">⏱️ ${score("tempo", 20)}</span>
    <span title="Triangle">🔺 ${score("triangle", 20)}</span>
    <span title="Balance">⚖️ ${score("balance", 10)}</span>
  </div>
</div>

    `;
  }).join("");
}


  

 function buildGlobalCoachComment(viewType, scores) {
  const breakdown = scores?.breakdown || {};

  const ORDER =
    viewType === "dtl"
      ? ["tempo", "plan", "rotation", "triangle", "extension", "balance"]
      : ["tempo", "rotation", "triangle", "weightShift", "extension", "balance"];

  const weak = ORDER.find((k) => {
    const s = breakdown[k]?.score;
    return typeof s === "number" && s < 15;
  });

  if (!weak) {
    return t("coach.sessionGreat");
  }

  return tt("coach.globalPriority", {
    metric: t(`coach.metric_${weak}`, weak)
  });
}


  
// ---------------------------------------------------------
//   PREMIUM BREAKDOWN BUILDER (utilise scores.breakdown)
//   ✅ plus de "metrics.xxx" en direct dans l UI
//   ✅ affiche un message si un module est non mesuré
// modif avec les réferences du 12 mars
// ---------------------------------------------------------

function buildParfectReviewCard(swing, scores) {
  const container = document.getElementById("swing-score-breakdown");
  if (!container) return;

  const breakdown = scores?.breakdown || {};
  const metrics = scores?.metrics || {};
  const viewTypeRaw = window.jswViewType || metrics?.viewType || "faceOn";
  const viewLabel = viewTypeRaw === "dtl" ? "DTL" : "FACE";

  const club =
    swing?.club ||
    window.currentClubType ||
    document.getElementById("jsw-club-select")?.value ||
    "fer7";

  const clubLabel = club.toUpperCase();

  const parfectRef = window.parfectReference || null; // { id, created_at, data }
  const userRef = window.userReference || null;       // { id, created_at, data }

  const parfectData = parfectRef?.data || null;
  const userData = userRef?.data || null;

  const METRIC_MAX = {
    rotation: 20,
    tempo: 20,
    triangle: 20,
    plan: 20,
    weightShift: 20,
    extension: 10,
    balance: 10
  };

  const LABELS = {
  rotation: t("metrics.rotation"),
  tempo: t("metrics.tempo"),
  triangle: t("metrics.triangle"),
  weightShift: t("metrics.weightShift"),
  extension: t("metrics.extension"),
  balance: t("metrics.balance"),
  plan: t("metrics.plan")
};

const OBJECTIVES = {
  rotation: t("review.objective_rotation"),
  tempo: t("review.objective_tempo"),
  triangle: t("review.objective_triangle"),
  weightShift: t("review.objective_weightShift"),
  extension: t("review.objective_extension"),
  balance: t("review.objective_balance")
};

  function fmt(v, d = 2) {
    return typeof v === "number" && Number.isFinite(v)
      ? v.toFixed(d)
      : "—";
  }

  function getScore(key) {
    const s = breakdown?.[key]?.score;
    if (typeof s === "number") return s;

    const alt = scores?.scores?.[key];
    if (typeof alt === "number") return alt;

    return 0;
  }

  function applyScoreFloor(score, max) {
    if (typeof score !== "number") return null;
    if (max === 20) return Math.max(score, 4);
    if (max === 10) return Math.max(score, 2);
    return score;
  }

  function getVisibleMetricKeys(viewType) {
    return viewType === "dtl"
      ? ["tempo", "plan", "rotation", "triangle", "extension", "balance"]
      : ["rotation", "tempo", "triangle", "weightShift", "extension", "balance"];
  }

  const visibleKeys = getVisibleMetricKeys(viewTypeRaw);

  function computeVisibleScore() {
    return visibleKeys.reduce((sum, k) => sum + getScore(k), 0);
  }

  function computeVisibleMax() {
    return visibleKeys.reduce((sum, k) => sum + (METRIC_MAX[k] || 0), 0);
  }

  const visibleScore = computeVisibleScore();
  const visibleMax = computeVisibleMax();

  const displayScore =
  typeof scores?.total === "number"
    ? scores.total
    : (typeof scores?.totalDynamic === "number" ? scores.totalDynamic : 0);

  console.log("DISPLAY SCORE FIX", {
  fromEngine: scores.total,
  displayed: displayScore
});

  function buildReferenceInfo() {
    return `
      <div class="jsw-ref-info">
        ${
          parfectRef
            ? `
          <div class="jsw-ref-block">
            <div class="jsw-ref-title">🧠 Réf Parfect</div>
            <div class="jsw-ref-meta">
              id ${parfectRef.id}<br>
              ${parfectRef.created_at ? new Date(parfectRef.created_at).toLocaleDateString() : "—"}
            </div>
          </div>`
            : ""
        }

        ${
          userRef
            ? `
          <div class="jsw-ref-block">
            <div class="jsw-ref-title">⭐ Ma réf</div>
            <div class="jsw-ref-meta">
              id ${userRef.id}<br>
              ${userRef.created_at ? new Date(userRef.created_at).toLocaleDateString() : "—"}
            </div>
          </div>`
            : ""
        }
      </div>
    `;
  }

  function compareLine(label, actual, parfectValue, userValue, unit = "") {
    if (actual == null) return "";

    const deltaParfect =
      typeof actual === "number" && typeof parfectValue === "number"
        ? actual - parfectValue
        : null;

    return `
      <div class="jsw-compare-row">
        <div class="jsw-compare-main">${label} : ${fmt(actual)}${unit}</div>

        ${
          parfectValue != null
            ? `<div class="jsw-compare-ref jsw-ref-parfect">
                 Parfect : ${fmt(parfectValue)}${unit}
                 ${deltaParfect != null ? ` · Δ ${fmt(deltaParfect)}${unit}` : ""}
               </div>`
            : ""
        }

        ${
          userValue != null
            ? `<div class="jsw-compare-ref jsw-ref-user">
                 Moi : ${fmt(userValue)}${unit}
               </div>`
            : ""
        }
      </div>
    `;
  }

 function buildComparisonBlock(key, data) {
  const m = data?.metrics || data || {};
  const isDTL = viewTypeRaw === "dtl";

  function compareLineSimple(label, actual, target = null, unit = "") {
    if (actual == null) return "";

    return `
      <div class="jsw-compare-row">
        <div class="jsw-compare-main">${label} : ${fmt(actual)}${unit}</div>
        ${
          target != null
            ? `<div class="jsw-compare-ref jsw-ref-parfect">
                 Cible : ${fmt(target)}${unit}
               </div>`
            : ""
        }
      </div>
    `;
  }

 if (key === "rotation") {
  const actual = m?.stages?.baseToTop?.actual;
  const target = m?.stages?.baseToTop?.target;
  const tol = m?.stages?.baseToTop?.tol;
  const explanation = buildRotationExplanation(m);

  if (!actual) {
    return `
      <div class="jsw-detail-inline">
        <div class="jsw-compare-row">
          <div class="jsw-compare-main">Rotation non évaluée</div>
        </div>
      </div>
    `;
  }

  const unit = isDTL ? "°" : "";

  return `
    <div class="jsw-detail-inline">
      ${compareLineSimple("Épaules", actual.shoulder, target?.shoulder, unit)}
      ${
        tol?.shoulder != null
          ? `<div class="jsw-compare-ref jsw-ref-parfect">Tolérance épaules : ${fmt(tol.shoulder)}${unit}</div>`
          : ""
      }

      ${compareLineSimple("Hanches", actual.hip, target?.hip, unit)}
      ${
        tol?.hip != null
          ? `<div class="jsw-compare-ref jsw-ref-parfect">Tolérance hanches : ${fmt(tol.hip)}${unit}</div>`
          : ""
      }

      ${
        actual?.xFactor != null
          ? compareLineSimple("Séparation", actual.xFactor, target?.xFactor, unit)
          : ""
      }
      ${
        tol?.xFactor != null
          ? `<div class="jsw-compare-ref jsw-ref-parfect">Tolérance séparation : ${fmt(tol.xFactor)}${unit}</div>`
          : ""
      }

      ${
        explanation
          ? `<div class="jsw-detail-objective">🧠 ${explanation}</div>`
          : ""
      }
    </div>
  `;
}

  if (key === "tempo") {
    if (typeof m?.backswingT !== "number") return "";

    return `
      <div class="jsw-detail-inline">
        ${compareLineSimple("Back", m.backswingT, null, "s")}
        ${compareLineSimple("Down", m.downswingT, null, "s")}
        ${compareLineSimple("Ratio", m.ratio, m.targetRatio)}
      </div>
    `;
  }

  if (key === "triangle") {
    return `
      <div class="jsw-detail-inline">
        ${compareLineSimple("Écart top", m.varTopPct, null, "%")}
        ${compareLineSimple("Écart impact", m.varImpactPct, null, "%")}
      </div>
    `;
  }

  if (key === "weightShift") {
    return `
      <div class="jsw-detail-inline">
        ${compareLineSimple("Back", m.absBack, m.targetBack)}
        ${compareLineSimple("Forward", m.absFwd, m.targetFwd)}
      </div>
    `;
  }

  if (key === "extension") {
    return `
      <div class="jsw-detail-inline">
        ${compareLineSimple("Impact", m.extImpact, null)}
        ${compareLineSimple("Finish", m.extFinish, m.target)}
      </div>
    `;
  }

  if (key === "balance") {
    return `
      <div class="jsw-detail-inline">
        ${compareLineSimple("Finish move", m.finishMove)}
      </div>
    `;
  }

  if (key === "plan") {
    return `
      <div class="jsw-detail-inline">
        ${compareLineSimple("Déviation", m.deviation)}
      </div>
    `;
  }

  return "";
}

  function buildRotationExplanation(m) {
  const actual = m?.stages?.baseToTop?.actual;
  const target = m?.stages?.baseToTop?.target;
  const tol = m?.stages?.baseToTop?.tol;

  if (!actual || !target || !tol) return "";

  const shoulder = actual.shoulder;
  const hip = actual.hip;
  const xFactor = actual.xFactor;

  const shoulderTooLow = shoulder < (target.shoulder - tol.shoulder);
  const shoulderTooHigh = shoulder > (target.shoulder + tol.shoulder);

  const hipTooLow = hip < (target.hip - tol.hip);
  const hipTooHigh = hip > (target.hip + tol.hip);

  const xFactorGood =
    typeof xFactor === "number" &&
    Math.abs(xFactor - target.xFactor) <= tol.xFactor;

  if (shoulderTooLow && hipTooLow && !xFactorGood) {
    return "Rotation insuffisante : les épaules ne chargent pas assez au top.";
  }

  if (!shoulderTooLow && hipTooLow && xFactorGood) {
    return "Bonne dissociation : les épaules tournent pendant que les hanches restent calmes.";
  }

  if (!shoulderTooLow && hipTooHigh) {
    return "Les épaules tournent, mais les hanches accompagnent trop. Stabilise davantage le bassin.";
  }

  if (shoulderTooLow && !hipTooLow) {
    return "Les hanches bougent plus que les épaules. Cherche d’abord plus de rotation d’épaules.";
  }

  if (shoulderTooHigh && hipTooHigh) {
    return "Rotation très ample, mais l’ensemble tourne trop. Garde plus de contrôle du bassin.";
  }

  return "Rotation comparée à la cible épaules / hanches / séparation.";
}
  
 function buildCoachComment(scores) {
  const metrics = scores?.metrics || {};
  const tips = [];

  const tempo = metrics.tempo || {};
  if (typeof tempo.ratio === "number" && typeof tempo.targetRatio === "number") {
    const ratio = tempo.ratio;
    const target = tempo.targetRatio;
    const diff = target - ratio;

    if (Math.abs(diff) > 0.30) {
      if (diff > 0 && typeof tempo.backswingT === "number" && typeof tempo.downswingT === "number") {
        const idealBackswing = tempo.downswingT * target;
        const deltaBack = Math.max(0, idealBackswing - tempo.backswingT);
        tips.push(tt("coach.tempoAddTime", {
          ratio: fmtCoach(ratio, 2),
          target: fmtCoach(target, 2),
          delta: fmtCoach(deltaBack, 2)
        }));
      } else if (diff < 0) {
        tips.push(tt("coach.tempoStartDownSooner", {
          ratio: fmtCoach(ratio, 2),
          target: fmtCoach(target, 2)
        }));
      }
    }
  }

  const ws = metrics.weightShift || {};
  if (typeof ws.absFwd === "number" && typeof ws.targetFwd === "number") {
    const missingFwd = ws.targetFwd - ws.absFwd;
    if (missingFwd > 0.03) {
      tips.push(tt("coach.weightShiftForwardShort", {
        actual: fmtCoach(ws.absFwd, 2),
        target: fmtCoach(ws.targetFwd, 2),
        delta: fmtCoach(missingFwd, 2)
      }));
    }
  }

  if (typeof ws.absBack === "number" && typeof ws.targetBack === "number") {
    const missingBack = ws.targetBack - ws.absBack;
    if (missingBack > 0.03 && tips.length < 2) {
      tips.push(tt("coach.weightShiftBackShort", {
        actual: fmtCoach(ws.absBack, 2),
        target: fmtCoach(ws.targetBack, 2)
      }));
    }
  }

  const ext = metrics.extension || {};
  if (typeof ext.value === "number" && typeof ext.target === "number") {
    const missingExt = ext.target - ext.value;
    if (missingExt > 0.15) {
      if (typeof ext.progress === "number" && ext.progress <= 0.05) {
        tips.push(tt("coach.extensionEarlyFold", {
          actual: fmtCoach(ext.value, 2),
          target: fmtCoach(ext.target, 2)
        }));
      } else {
        tips.push(tt("coach.extensionShort", {
          actual: fmtCoach(ext.value, 2),
          target: fmtCoach(ext.target, 2),
          delta: fmtCoach(missingExt, 2)
        }));
      }
    }
  }

  const balance = metrics.balance || {};
  if (typeof balance.score === "number" && balance.score < 5) {
    if (typeof balance.finishMove === "number") {
      tips.push(tt("coach.balanceShort", {
        actual: fmtCoach(balance.finishMove, 2)
      }));
    } else {
      tips.push(t("coach.balanceShortNoValue"));
    }
  }

  const rot = metrics.rotation || {};
  if (typeof rot.score === "number" && rot.score < 12 && rot.measure) {
    const shoulder = rot.measure.shoulder;
    const hip = rot.measure.hip;
    if (typeof shoulder === "number" && typeof hip === "number" && tips.length < 2) {
      tips.push(tt("coach.rotationImprove", {
        shoulder: fmtCoach(shoulder, 2),
        hip: fmtCoach(hip, 2)
      }));
    }
  }

  if (!tips.length) {
    return t("coach.globalGood");
  }

  return tips.slice(0, 2).join("<br><br>");
}

  const coachComment = buildCoachComment();

  const bestMetric = visibleKeys
    .map(k => [k, getScore(k)])
    .sort((a, b) => b[1] - a[1])[0];

  container.innerHTML = `
    <div class="jsw-review-card">

      <div class="jsw-review-header">
        <div class="jsw-score-ring">
          <div class="jsw-big-score" id="jsw-animated-score">0</div>
        </div>

        <div class="jsw-score-label">Score Parfect</div>
        <span class="jsw-pill">${viewLabel} · ${clubLabel}</span>

        ${buildReferenceInfo()}
        </div>
        
        <div class="jsw-coach-box">
          <div class="jsw-coach-title">🎯 Coach Parfect</div>
          <div class="jsw-coach-comment">${coachComment}</div>
      </div>

      <div class="jsw-radar-wrap">
        <canvas id="jsw-radar" height="220"></canvas>
      </div>

      <div class="jsw-replay-compare-controls">
        <label for="jsw-compare-mode">Replay comparatif</label>
        <select id="jsw-compare-mode">
          <option value="none">Aucun</option>
          <option value="parfect" ${parfectRef ? "" : "disabled"}>vs Parfect</option>
          <option value="user" ${userRef ? "" : "disabled"}>vs Ma référence</option>
        </select>
      </div>

      <div class="jsw-grid">
        ${visibleKeys.map((key) => {
          const data = breakdown?.[key] || {};
          const raw = getScore(key);
          if (raw === null) return "";

          const max = METRIC_MAX[key] || 20;
          const floored = applyScoreFloor(raw, max);
          const percent = Math.round((floored / max) * 100);
          const measuredValue = buildComparisonBlock(key, data);

          const highlight =
            bestMetric && bestMetric[0] === key
              ? "jsw-card-highlight"
              : "";

          return `
            <div class="jsw-card ${highlight}">
              <div class="jsw-card-header">
                <span>${LABELS[key] || key.toUpperCase()}</span>
                <strong>${floored}/${max}</strong>
              </div>

              <div class="jsw-bar">
                <div class="jsw-bar-fill" style="width:${percent}%"></div>
              </div>

              <div class="jsw-objective">${OBJECTIVES[key] || ""}</div>

              ${measuredValue}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  const card = container.querySelector(".jsw-review-card");
  requestAnimationFrame(() => {
    card?.classList.add("reveal");
  });

  const scoreEl = container.querySelector("#jsw-animated-score");
  function animateScore(target) {
    if (!scoreEl) return;

    let current = 0;
    const duration = 700;
    const stepTime = 16;
    const increment = target / (duration / stepTime);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      scoreEl.textContent = Math.round(current);
    }, stepTime);
  }
  animateScore(displayScore);

  function buildRadar() {
  const radarEl = document.getElementById("jsw-radar");
  if (!radarEl || typeof Chart === "undefined") return;

  if (window.__jswRadarChart) {
    window.__jswRadarChart.destroy();
    window.__jswRadarChart = null;
  }

  const keys = ["rotation", "tempo", "triangle", "weightShift", "extension", "balance"];
  const labels = ["Rotation", "Tempo", "Triangle", "Transfert", "Extension", "Balance"];

  const normalize = (score, key) => {
    const max = METRIC_MAX[key] || 20;
    if (typeof score !== "number" || !Number.isFinite(score)) return 0;
    return Math.round((score / max) * 100);
  };

  const swingData = keys.map((key) => normalize(getScore(key), key));

  // Parfect = référence cible → on la trace comme zone idéale pleine
  const sysData = keys.map(() => 100);

  // Ma réf = si on a une vraie référence user avec score, on la normalise, sinon null
  const usrData = keys.map((key) => {
    const raw = userData?.[key]?.score;
    return typeof raw === "number" ? normalize(raw, key) : null;
  });

  window.__jswRadarChart = new Chart(radarEl, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Swing",
          data: swingData
        },
        {
          label: "Parfect",
          data: sysData
        },
        {
          label: "Moi",
          data: usrData
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { display: false }
        }
      }
    }
  });
}

  buildRadar();

  const compareModeSelect = document.getElementById("jsw-compare-mode");
  if (compareModeSelect) {
    compareModeSelect.onchange = () => {
      window.jswReplayCompareMode = compareModeSelect.value;
      renderFrame(replayFrameIndex || 0);
    };
  }

  document.getElementById("jsw-review-next")
    ?.addEventListener("click", () => {
      window.JustSwing?.nextSwing?.();
    });
}

function buildPremiumBreakdown(swing, scores) {
  const el = document.getElementById("swing-score-breakdown");
  if (!el) return;

  const breakdown = scores?.breakdown || {};
  const viewType =
  window.jswViewType === "dtl"
    ? "dtl"
    : "faceOn";

  // =====================================================
  // HELPERS
  // =====================================================

  const fmt = (v, d = 2) =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";

  const zone = (score, max) => {
    if (typeof score !== "number") return "mid";
    const r = score / max;
    if (r >= 0.7) return "good";
    if (r >= 0.4) return "mid";
    return "bad";
  };

  const badge = (score) => {
    if (typeof score !== "number") return "";
    if (score >= 18) return `<span class="jsw-badge good">✔︎ Solide</span>`;
    if (score >= 15) return `<span class="jsw-badge mid">✓ Validé</span>`;
    return "";
  };

  // =====================================================
  // CONFIGURATION
  // =====================================================

  const CONFIG = {
    pillars: {
      faceOn: [
        { key: "rotation", title: "Rotation", max: 20 },
        { key: "tempo", title: "Tempo", max: 20 },
        { key: "triangle", title: "Triangle", max: 20 },
        { key: "weightShift", title: "Transfert", max: 10 },
        { key: "extension", title: "Extension", max: 10 },
        { key: "balance", title: "Balance", max: 10 }
      ],
      dtl: [
        { key: "tempo", title: "Tempo", max: 20 },
        { key: "plan", title: "Plan de swing", max: 20 },
        { key: "rotation", title: "Rotation", max: 20 },
        { key: "triangle", title: "Triangle", max: 20 },
        { key: "extension", title: "Extension", max: 10 },
        { key: "balance", title: "Balance", max: 10 }
      ]
    },

    objectives: {
      tempo: {
        faceOn: "Ratio cible ≈ 3:1 (backswing fluide, downswing engagé)",
        dtl: "Tempo constant, sans accélération précoce"
      },
      rotation: {
        faceOn: "Épaules ~ cible Parfect, hanches stables",
        dtl: "Épaules ≥ 45° · Hanches ≥ 25° · Dissociation ≥ 10°"
      },
      triangle: {
        faceOn: "Triangle bras/épaules stable du top à l’impact",
        dtl: "Bras connectés, pas d’effondrement"
      },
      plan: {
        dtl: "Club dans le plan, sans steep excessif"
      },
      extension: {
        faceOn: "Extension complète après impact",
        dtl: "Bras étendus, release libre"
      },
      balance: {
        faceOn: "Tête stable, finish équilibré",
        dtl: "Centre de gravité contrôlé"
      }
    }
  };

  const PILLARS = CONFIG.pillars[viewType] || [];

  // =====================================================
  // GLOBAL COMMENT
  // =====================================================

  function buildGlobalComment() {
    const scored = PILLARS
      .map(p => ({
        title: p.title,
        score: breakdown[p.key]?.score ?? null
      }))
      .filter(p => typeof p.score === "number");

    const weak = scored.filter(p => p.score < 15);

    if (!weak.length) {
      return "Très belle séance. Les fondamentaux sont en place. Continue dans ce rythme 👍";
    }

    const primary = weak[0];
    const secondary = weak[1];

    let msg = `Priorité : travaille ${primary.title.toLowerCase()}.`;

    if (primary.score >= 12 && secondary) {
      msg += ` Ensuite, tu pourras t’attaquer à ${secondary.title.toLowerCase()}.`;
    }

    return msg;
  }

  // =====================================================
  // DETAILS BUILDER
  // =====================================================

  function buildDetails() {
    return {
      rotation: (() => {
        const m = breakdown.rotation?.metrics;
        return m?.measure
          ? `Épaules : ${fmt(m.measure.shoulder)}<br>Hanches : ${fmt(m.measure.hip)}`
          : `<em>Rotation non évaluée</em>`;
      })(),

      tempo: (() => {
        const m = breakdown.tempo?.metrics;
        return m
          ? `Back : ${fmt(m.backswingT)}s<br>Down : ${fmt(m.downswingT)}s<br>Ratio : ${fmt(m.ratio)}:1`
          : `<em>Tempo non évalué</em>`;
      })(),

      triangle: (() => {
        const m = breakdown.triangle?.metrics;
        return m
          ? `Top : ${fmt(m.varTopPct)}%<br>Impact : ${fmt(m.varImpactPct)}%`
          : `<em>Triangle non évalué</em>`;
      })(),

      extension: (() => {
        const m = breakdown.extension?.metrics;
        return m
          ? `Impact : ${fmt(m.impact)}<br>Finish : ${fmt(m.finish)}`
          : `<em>Extension non évaluée</em>`;
      })(),

      weightShift: (() => {
        const m = breakdown.weightShift?.metrics;
        return m
          ? `Back : ${fmt(m.shiftBack)}<br>Forward : ${fmt(m.shiftFwd)}`
          : `<em>Transfert non évalué</em>`;
      })(),

      balance: (() => {
        const m = breakdown.balance?.metrics;
        return m
          ? `Tête stable : ${m.headOverHips ? "oui" : "non"}<br>Hanches : ${fmt(m.finishMove)}`
          : `<em>Balance non évaluée</em>`;
      })(),

      plan: `<em>Plan en cours d’analyse</em>`
    };
  }

  const DETAILS = buildDetails();

  // =====================================================
  // CARD BUILDER
  // =====================================================

  const card = ({ key, title, max }) => {
    const score = breakdown[key]?.score ?? null;
    const z = zone(score, max);
    const pct =
      typeof score === "number"
        ? Math.min(100, Math.max(0, (score / max) * 100))
        : 0;

    const objective =
      CONFIG.objectives[key]?.[viewType] ||
      CONFIG.objectives[key]?.faceOn ||
      "";

    return `
      <div class="jsw-card jsw-${z}" data-card="${key}">
        <div class="jsw-card-header">
          <div class="jsw-title">${title}</div>
          <div class="jsw-score jsw-score-${z}">
            ${score ?? "—"}/${max}
          </div>
        </div>
        
        ${badge(score)}

        <div class="jsw-bar">
          <div class="jsw-bar-fill jsw-${z}" style="width:${pct}%"></div>
        </div>

        ${
          objective
            ? `<div class="jsw-objective">🎯 ${objective}</div>`
            : ""
        }

        <button class="jsw-toggle-details" data-toggle="${key}">
          + détails
        </button>

        <div class="jsw-details" id="details-${key}">
          ${DETAILS[key] || `<em>Donnée non disponible</em>`}
        </div>
      </div>
    `;
  };


  console.log("viewType:", viewType);
console.log("CONFIG.pillars:", CONFIG.pillars);
console.log("PILLARS resolved:", CONFIG.pillars[viewType]);
  // =====================================================
  // RENDER
  // =====================================================

  el.innerHTML = `
    <div style="padding:.6rem;">
      <div style="text-align:center;margin-bottom:.9rem;">
        <div class="jsw-view-badge ${viewType}">
          ${viewType === "dtl" ? "DTL — Down The Line" : "Face-On — Vue de face"}
        </div>
        <div style="font-size:1.6rem;font-weight:900;color:#4ade80;">
          ${scores.total ?? "—"}
        </div>
        <div style="font-size:.8rem;color:#aaa;">
          Score Parfect Premium
        </div>
      </div>

      <div class="jsw-coach-global">
        🧠 ${buildGlobalComment()}
      </div>

      <div class="jsw-grid">
        ${PILLARS.map(card).join("")}
      </div>

      <button id="jsw-back-btn" style="
        margin-top:1rem;
        width:100%;
        background:#333;
        color:#ccc;
        border:none;
        border-radius:14px;
        padding:.8rem;
        font-size:1rem;
      ">
        ← Home
      </button>
    </div>
  `;

  // =====================================================
  // EVENTS
  // =====================================================

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".jsw-toggle-details");
    if (!btn) return;

    const key = btn.dataset.toggle;
    const details = document.getElementById(`details-${key}`);
    if (!details) return;

    details.classList.toggle("open");
    btn.textContent = details.classList.contains("open")
      ? "− masquer"
      : "+ détails";
  });

  document.getElementById("jsw-back-btn")?.addEventListener("click", () => {
    window.JustSwing?.stopSession?.();
    window.SwingEngine?.reset?.();
    document.getElementById("home-btn")?.click();
  });

  
  


  
  el.innerHTML = `
    <div style="padding:.6rem;">
      <div style="text-align:center;margin-bottom:.9rem;">
        <div class="jsw-view-badge ${viewType}">
        ${viewType === "dtl" ? "DTL — Down The Line" : "Face-On — Vue de face"}
        </div>
        <div style="font-size:1.6rem;font-weight:900;color:#4ade80;">
          ${scores.total ?? "—"}
        </div>
        <div style="font-size:.8rem;color:#aaa;">
          Score Parfect Premium
        </div>
      </div>

      <div class="jsw-coach-global">
        🧠 ${buildGlobalComment()}
      </div>

      <div class="jsw-grid">
        ${PILLARS.map(card).join("")}
      </div>

      <button id="jsw-back-btn" style="
        margin-top:1rem;
        width:100%;
        background:#333;
        color:#ccc;
        border:none;
        border-radius:14px;
        padding:.8rem;
        font-size:1rem;
      ">
        ← Home
      </button>
    </div>
  `;


  
  // ---------------- ACTIONS ----------------

  document.getElementById("jsw-back-btn")?.addEventListener("click", () => {
    window.JustSwing?.stopSession?.();
    window.SwingEngine?.reset?.();
    document.getElementById("home-btn")?.click();
  });
}




function activateRecording() {
  console.warn("⚠️ activateRecording() temporairement désactivé (mode DEBUG).");
}


  // =====================================================
// KF NORMALIZER — force {index, pose} + fallback address
// =====================================================
function jswNormalizeKeyFrames(keyFrames, frames) {
  const kf = keyFrames || {};
  const out = {};

  const getPoseAt = (i) => {
    if (!Array.isArray(frames)) return null;
    if (typeof i !== "number") return null;
    if (i < 0 || i >= frames.length) return null;
    return frames[i] || null;
  };

  const normOne = (v) => {
    if (v == null) return null;

    // déjà bon format
    if (typeof v === "object" && typeof v.index === "number") {
      return {
        index: v.index,
        pose: v.pose || getPoseAt(v.index)
      };
    }

    // format number
    if (typeof v === "number") {
      return { index: v, pose: getPoseAt(v) };
    }

    return null;
  };

  // normalise connus
  const KEYS = ["address", "backswing", "top", "downswing", "impact", "release", "finish"];
  for (const k of KEYS) out[k] = normOne(kf[k]);

  // fallback address :
  // 1) si address manquant → prends frame 0 (UX lock) si existe
  // 2) sinon backswing-1 si dispo (optionnel)
  if (!out.address || !out.address.pose) {
    if (getPoseAt(0)) {
      out.address = { index: 0, pose: getPoseAt(0) };
    } else if (out.backswing && typeof out.backswing.index === "number" && out.backswing.index > 0) {
      const ai = out.backswing.index - 1;
      out.address = { index: ai, pose: getPoseAt(ai) };
    } else {
      out.address = null;
    }
  }

  return out;
}

  // ---------------------------------------------------------
//   SWING COMPLETE → SCORE + UI
// ---------------------------------------------------------
async function handleSwingComplete(swing) {

  console.log("🏁 handle SWING COMPLETE", swing);

  // ======================================================
  // 1️⃣ Guards
  // ======================================================
  if (!swing || !swing.frames?.length) {
    console.warn("❌ Swing invalide");
    return;
  }

  swing.keyFrames = jswNormalizeKeyFrames(
    swing.keyFrames,
    swing.frames
  );

  swing.club = swing.club || window.currentClubType || "fer7";
    
  // ======================================================
  // 2️⃣ Validation UX
  // ======================================================
  if (!isValidSwing(swing) || !hasRealMotion(swing)) {
    stopRecording();
    showBigMessage("😕 Aucun swing détecté.\nRecommence calmement.");
    startRoutineSequence();
    return;
  }

  if (!addressLocked) {
    stopRecording();
    showBigMessage("🧍‍♂️ Stabilise-toi à l’adresse");

    setTimeout(() => {
      hideBigMessage();
      startRoutineSequence();
    }, 1500);

    return;
  }

  // ======================================================
  // 3️⃣ Fin capture
  // ======================================================
  captureArmed = false;
  isRecordingActive = false;

  // ======================================================
  // 4️⃣ Charger référence active
  // ======================================================

  if (typeof loadActiveReference === "function") {
  await loadActiveReference();
  console.log("🎯 REF ACTIVE", window.REF);
  }
  
  // ======================================================
  // 4️⃣ Scoring Premium
  // ======================================================
  const scores = await computeSwingScorePremium(swing);
  swing.scores = scores;

  // ======================================================
  // 5️⃣ Sauvegarde swing
  // ======================================================
  try {
    await window.saveSwingToNocoDB?.({
      player_email: window.userLicence?.email,
      created_at: new Date().toISOString(),
      club: swing.club,
      view: window.jswViewType,
      frames_count: swing.frames.length,
      keyframes: swing.keyFrames,
      metrics: scores.metrics,
      scores
    });

    console.log("✅ Swing sauvegardé");
  } catch (err) {
    console.warn("⚠️ Erreur sauvegarde", err);
  }

// ======================================================
// 6️⃣ Rendu UI Review
// ======================================================
buildParfectReviewCard(swing, scores);
bindSwingReviewActions(swing, scores);

// 🔴 cacher caméra
const swingArea = document.getElementById("just-swing-area");
if (swingArea) swingArea.style.display = "none";

// 🟢 afficher review
const reviewEl = document.getElementById("swing-review");

if (reviewEl) {
  reviewEl.style.display = "block";

  requestAnimationFrame(() => {
    reviewEl.classList.add("active");
  });
}

// Replay
initSwingReplay(swing, scores);

state = JSW_STATE.REVIEW;
updateUI();

console.log("📊 Review affichée");
}

// ======================================================
// ACTIONS REVIEW REFERENCES
// ======================================================

function bindSwingReviewActions(swing, scores) {

  const club =
  swing?.club ||
  document.getElementById("jsw-club-select")?.value ||
  "fer7";

const camera =
  window.jswViewType ||
  document.getElementById("jsw-camera-select")?.value ||
  "faceOn";

  const btnUserRef = document.getElementById("swing-save-reference");

  if (btnUserRef) {
    btnUserRef.onclick = async () => {

      console.log("⭐ save user reference click", {
      club,
      camera,
      metrics: scores?.metrics
    });
      btnUserRef.disabled = true;
      btnUserRef.textContent = "⏳ Enregistrement…";

      try {
      await window.saveUserReference(club, camera, scores.metrics);
      console.log("✅ user reference saved");
      btnUserRef.textContent = "✅ Référence enregistrée";
    } catch (e) {
      console.error("❌ saveUserReference error", e);
      btnUserRef.disabled = false;
      btnUserRef.textContent = "⭐ Sauvegarder comme ma référence";
    }
  };
}

  const btnParfect = document.getElementById("swing-save-parfect-reference");

  if (btnParfect && window.isAdmin?.()) {

    btnParfect.style.display = "block";

    btnParfect.onclick = async () => {
console.log("👑 save system reference click", {
      club,
      camera,
      metrics: scores?.metrics
    });
      btnParfect.disabled = true;
      btnParfect.innerHTML = "⏳ Enregistrement…";

   try {
      await window.saveSystemReference(club, camera, scores.metrics);
      console.log("✅ system reference saved");
      btnParfect.innerHTML = "✅ Référence PARFECT définie";
    } catch (e) {
      console.error("❌ saveSystemReference error", e);
      btnParfect.disabled = false;
      btnParfect.innerHTML = "⭐ Définir comme référence PARFECT";
    }
  };
}
}




// ======================================================
// HISTORIQUE
// ======================================================

async function loadSwingHistory(email) {
  const url =
    `${window.NOCODB_SWINGS_URL}?` +
    `where=(player_email,eq,${email})&sort=-created_at&limit=50`;

  const res = await fetch(url, {
    headers: { "xc-token": window.NOCODB_TOKEN }
  });

  if (!res.ok) throw new Error("Erreur historique");

  const data = await res.json();
  return data.list || [];
}

async function showSwingHistory() {
  const email = window.userLicence?.email;
  if (!email) return;

  const swings = await loadSwingHistory(email);
  const el = document.getElementById("swing-history");
  if (!el) return;

  el.innerHTML = swings
    .map(s => `
      <div class="history-item">
        <b>${new Date(s.created_at).toLocaleTimeString()}</b>
        — ${s.club}
        — ${s.scores?.total ?? "—"}/100
      </div>
    `)
    .join("");
}


// ======================================================
// QUOTA UI
// ======================================================

async function updateQuotaUI() {
  const email = window.userLicence?.email;
  if (!email) return;

  const count = await getTodaySwingCount(email);
  const left = Math.max(0, 10 - count);

  const el = document.getElementById("swing-quota");
  if (el) {
    el.textContent = `🎯 ${left} swings restants aujourd’hui`;
  }
}


// ======================================================
// COACH COMMENT
// ======================================================



function coachTechnicalComment(scores) {
    const msgs = [];
    if (scores.triangleScore < 70) msgs.push("Garde ton triangle stable.");
    if (scores.lagScore < 70) msgs.push("Garde les poignets armés plus longtemps.");
    if (scores.planeScore < 70) msgs.push("Descends plus dans le plan.");
    if (!msgs.length) return "Super swing 👌 Continue comme ça.";
    return msgs.slice(0, 2).join(" ");
  }

function stopRecording() {
  console.log("🛑 stopRecording() appelé");

  isRecordingActive = false;
  captureArmed = false;
  frameIndex = 0;

  if (engine) engine.reset();
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
        <button id="jsw-review-next" class="jsw-result-next" style="
          margin-top:10px;
          padding:10px 24px;
          border-radius:999px;
          border:none;
          background:var(--jsw-green);
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
    btn.onclick = async () => {
      console.log("➡️ Swing suivant (UI)");
      modal.style.display = "none";
      await nextSwing(); // relance la routine + quota (si tu as patché nextSwing)
    };
  }
}







   // ---------------------------------------------------------
  //   replay : init + rendu + play/pause
  // ---------------------------------------------------------

  function initSwingReplay(swing, scores) {
  console.log("🟪 JSW-REPLAY: initSwingReplay(swing, scores) CALLED");
  console.log("🟪 Frames disponibles :", swing?.frames?.length);
  console.log("🟪 Keyframes:", swing?.keyFrames);
  console.log("🟪 Scores:", scores);
  

  // -----------------------------
  // Guard
  // -----------------------------
  if (!swing || !Array.isArray(swing.frames) || swing.frames.length === 0) {
    console.warn("⏪ Pas de frames swing pour le replay");
    return;
  }

  // -----------------------------
  // Reset replay state
  // -----------------------------
  lastSwing = swing;
  replayFrameIndex = 0;
  replayPlaying = false;

  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }

  // -----------------------------
  // DOM elements
  // -----------------------------
  const reviewEl = document.getElementById("swing-review");
  const videoEl = document.getElementById("swing-video");
  const timeLabel = document.getElementById("swing-time-label");

  replayPlayBtn = document.getElementById("swing-play-pause");
  replaySpeedSel = document.getElementById("swing-speed");
  replayTimeline = document.getElementById("swing-timeline");

  if (!reviewEl || !videoEl || !replayPlayBtn || !replaySpeedSel || !replayTimeline) {
    console.warn("⏪ Replay UI incomplète");
    return;
  }

  // -----------------------------
  // Show review panel
  // -----------------------------
  reviewEl.style.display = "block";

  // -----------------------------
  // Timeline config
  // -----------------------------
  replayTimeline.min = 0;
  replayTimeline.max = swing.frames.length - 1;
  replayTimeline.value = 0;

  const fps = swing.fps || 30;
  const totalTimeSec = (swing.frames.length / fps).toFixed(1);
  if (timeLabel) {
    timeLabel.textContent = `0.0s / ${totalTimeSec}s`;
  }

     if (replayTimeline) {
  replayTimeline.style.display = "block";
  replayTimeline.disabled = false;
  }

  // -----------------------------
  // Canvas overlay (skeleton)
  // -----------------------------
  let overlay = document.getElementById("swing-overlay-canvas");

  if (!overlay) {
    overlay = document.createElement("canvas");
    overlay.id = "swing-overlay-canvas";
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "5";

    const container = videoEl.parentElement;
    container.style.position = "relative";
    container.appendChild(overlay);
  }

  // -----------------------------
  // Resize canvas to real size
  // -----------------------------
  const resizeOverlayReplay = () => {
    const rect = videoEl.getBoundingClientRect();

    // ⚠️ CRITICAL: sync real canvas size
    overlay.width = Math.floor(rect.width);
    overlay.height = Math.floor(rect.height);
  };

  resizeOverlayReplay();
  window.addEventListener("resize", resizeOverlayReplay);

  replayCanvas = overlay;
  replayCtx = overlay.getContext("2d");

  // -----------------------------
  // Bind replay controls
  // -----------------------------
  replayPlayBtn.onclick = () => {
    replayPlaying ? stopReplay() : startReplay();
  };

  replaySpeedSel.onchange = () => {
    if (replayPlaying) {
      stopReplay();
      setTimeout(startReplay, 50);
    }
  };

  replayTimeline.oninput = (e) => {
    const idx = parseInt(e.target.value, 10) || 0;
    renderFrame(idx);
  };

  // -----------------------------
  // Render first frame (MANDATORY)
  // -----------------------------
  renderFrame(0);

  console.log("✅ JSW-REPLAY ready (skeleton mode)");
}


function replaySwingFromHistory(swing) {
  console.log("🎬 Replay swing", swing);

  // 1️⃣ On va en mode Just Swing
  document.body.classList.add("jsw-fullscreen");
  document.getElementById("just-swing-area").style.display = "block";

  // 2️⃣ On masque l’UI live
  window.JustSwing?.stopSession?.();

  // 3️⃣ On reconstruit l’objet swing comme un swing “terminé”
  const parsedSwing = {
    ...swing,
    keyFrames: swing.keyFrames || JSON.parse(swing.keyframes_json || "{}"),
    frames: swing.frames || JSON.parse(swing.frames_json || "[]"),
    timestamps: swing.timestamps || JSON.parse(swing.timestamps_json || "[]"),
    club: swing.club,
    viewType: swing.view_type || "faceOn"
  };

  // 4️⃣ Replay EXACT comme après un swing
  handleSwingComplete(parsedSwing);
}
function renderFrame(index) {
  if (!lastSwing || !replayCanvas || !replayCtx) return;

  const idx = Math.max(0, Math.min(lastSwing.frames.length - 1, index));
  replayFrameIndex = idx;

  const pose = lastSwing.frames[idx];

  replayCtx.clearRect(0, 0, replayCanvas.width, replayCanvas.height);

  // swing courant
  drawPoseOnCanvas(pose, replayCanvas, replayCtx, "rgba(255,255,255,0.9)");

  // comparaison
  const mode = window.jswReplayCompareMode || "none";
  let refPose = null;

  if (mode === "parfect") {
    refPose =
      window.parfectReference?.data?.keyFrames?.top?.pose ||
      null;
  }

  if (mode === "user") {
    refPose =
      window.userReference?.data?.keyFrames?.top?.pose ||
      null;
  }

  if (refPose) {
    drawPoseOnCanvas(refPose, replayCanvas, replayCtx, "rgba(0,255,153,0.85)");
  }

  if (replayTimeline) replayTimeline.value = idx;

  const fps = lastSwing.fps || 30;
  const t = (idx / fps).toFixed(2);
  const total = (lastSwing.frames.length / fps).toFixed(2);

 const timeEl = document.getElementById("swing-time-label");
  if (timeEl) {
  timeEl.textContent = `${t}s / ${total}s`;
  }
 
}
    
 
function startReplay() {
  if (!lastSwing) return;
  if (replayPlaying) return;

  // si on est à la fin, on repart du début
  if (replayFrameIndex >= lastSwing.frames.length - 1) {
    replayFrameIndex = 0;
    renderFrame(0);
  }

  replayPlaying = true;
  if (replayPlayBtn) replayPlayBtn.textContent = "⏸️";

  const fps = lastSwing.fps || 30;
  const baseDt = 1000 / fps;

  const getSpeed = () =>
    parseFloat(replaySpeedSel?.value || "1") || 1;

  replayTimer = setInterval(() => {
    if (!replayPlaying) return;

    const next = replayFrameIndex + 1;
    if (next >= lastSwing.frames.length) {
      stopReplay();
      return;
    }

    renderFrame(next);
  }, baseDt / getSpeed());
}

 

function stopReplay() {
  replayPlaying = false;

  if (replayPlayBtn) replayPlayBtn.textContent = "▶️";

  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }
}



// -------------------------------------------
// ⏭️ BOUTON "SWING SUIVANT" — VERSION STABLE
// -------------------------------------------
const nextBtn = document.getElementById("swing-review-next");

if (nextBtn) {
  nextBtn.onclick = () => {
    console.log("➡️ Swing suivant (UI)");
    window.JustSwing?.nextSwing?.();
  };
}

// -------------------------------------------
// 🎬 REVIEW SLIDE CLOSE
// -------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

  const closeBtn = document.getElementById("jsw-close-review");

  if (!closeBtn) return;

  closeBtn.addEventListener("click", () => {
    const review = document.getElementById("swing-review");

    if (!review) return;

    review.classList.remove("active");

    setTimeout(() => {
      review.style.display = "none";
    }, 400);
  });

});


  
  
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

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#jsw-close-review, #jsw-back-btn");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  window.jswGoHome();
});

    document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("lang-fr")?.addEventListener("click", () => {
    setParfectLang("fr");
    location.reload();
  });

  document.getElementById("lang-en")?.addEventListener("click", () => {
    setParfectLang("en");
    location.reload();
  });
});
  // ---------------------------------------------------------
  //   EXPORT
  // ---------------------------------------------------------
  return {
    initJustSwing,
    startSession,
    stopSession,
    onPoseFrame,
    nextSwing
  };
})();

window.JustSwing = JustSwing;
