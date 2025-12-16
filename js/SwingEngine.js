//
//  SWINGENGINE PRO — SCORE READY (Parfect 2025)
//  Détection : Top / Impact / Finish
//  Phases : Address → Backswing → Top → Downswing → Impact → Release → Finish
//  Événements : onKeyFrame, onSwingComplete
//

const SwingEngine = (() => {

  const LM = {
    NOSE: 0,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12
  };

  const SWING_THRESHOLDS = {
    WRIST_START: 0.04,
    WRIST_STOP: 0.015,
    HIP_START: 0.03,
    HIP_STOP: 0.012
  };

  
  // --- paramètres
  const MIN_SWING_MS = 350;           // durée mini
  const START_SPEED = 0.015;          // vitesse poignet = démarrage
  const IMPACT_SPIKE = 0.25;          // brusque changement pour impact
  const FINISH_HOLD_MS = 250;         // stabilité finale
  const MAX_IDLE_MS = 1800;           // reset auto
  const FINISH_TIMEOUT_MS = 400; // 0.6 seconde après le release

  

let fallbackActiveFrames = 0;
const FALLBACK_MIN_FRAMES = 20; // ≈ 0.7s à 30fps
const FALLBACK_MIN_ENERGY = 0.03;

  

  function dist(a, b) {
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function mid(a, b) {
    return { x: (a.x + b.x)/2, y: (a.y + b.y)/2 };
  }

  // --- Création moteur
  function create({ fps = 30, onKeyFrame, onSwingComplete, onSwingStart}) {

    let state = "IDLE";
    let lastPose = null;
    let lastTime = null;

    let frames = [];
    let timestamps = [];
    let keyFrames = {
      address: null,
      backswing: null,
      top: null,
      downswing: null,
      impact: null,
      release: null,
      finish: null
    };

    let swingStartTime = null;
    let lastMotionTime = performance.now();
    let impactDetected = false;
    let releaseStartTime = null;
    let prevSpeedWrist = 0;
    let maxBackswingSpeed = 0;



    function reset() {
      frames = [];
      timestamps = [];
      keyFrames = {
        address: null,
        backswing: null,
        top: null,
        downswing: null,
        impact: null,
        release: null,
        finish: null
      };
      state = "IDLE";
      impactDetected = false;
      lastPose = null;
      lastTime = null;
      releaseStartTime = null;
    }

    function markKeyFrame(type, index, pose) {
  keyFrames[type] = {
    index,
    pose: pose ? JSON.parse(JSON.stringify(pose)) : null
  };

  if (typeof onKeyFrame === "function") {
    onKeyFrame({
      type,
      index,
      pose: pose ? JSON.parse(JSON.stringify(pose)) : null
    });
  }
}

    // --- moteur principal
    function processPose(pose, timeMs, clubType) {
  
      if (!pose) return;

      const dt = lastTime != null ? (timeMs - lastTime) / 1000 : 1 / fps;
      lastTime = timeMs;

      const Rw = pose[LM.RIGHT_WRIST];
      const Lw = pose[LM.LEFT_WRIST];
      const Rh = pose[LM.RIGHT_HIP];
      const Lh = pose[LM.LEFT_HIP];

      const midHip = mid(Rh, Lh);
      const midWrist = mid(Rw, Lw);

      const prevPose = lastPose;
      lastPose = pose;

      if (!prevPose) return;

      const prevMidWrist = mid(prevPose[LM.RIGHT_WRIST], prevPose[LM.LEFT_WRIST]);
      const prevMidHip   = mid(prevPose[LM.RIGHT_HIP], prevPose[LM.LEFT_HIP]);

      const speedWrist = dist(midWrist, prevMidWrist) / (dt || 0.033);
      const speedHip   = dist(midHip, prevMidHip)     / (dt || 0.033);

console.log(
  "⚡ speedWrist =", speedWrist.toFixed(4),
  "| speedHip =", speedHip.toFixed(4),
  "| state =", state
);

      
      const now = timeMs;

      // RESET auto si plus de mouvement
      if (now - lastMotionTime > MAX_IDLE_MS) {
        reset();
      }
      if (speedWrist > 0.005 || speedHip > 0.005) {
        lastMotionTime = now;
      }

      // IDLE → Address
   if (state === "IDLE") {

  const motionEnergy = speedWrist + speedHip;

  // 🔹 Déclencheur principal du swing
  if (
    speedWrist > SWING_THRESHOLDS.WRIST_START &&
    speedHip > SWING_THRESHOLDS.HIP_START
  ) {
    state = "ADDRESS";
    swingStartTime = timeMs;
    fallbackActiveFrames = 0;
    return;
  }

  // 🔸 Fallback fluide
  if (motionEnergy > FALLBACK_MIN_ENERGY) {
    fallbackActiveFrames++;
  } else {
    fallbackActiveFrames = 0;
  }

  if (fallbackActiveFrames >= FALLBACK_MIN_FRAMES) {
    console.log("🟡 FALLBACK SWING START");
    state = "ADDRESS";
    swingStartTime = timeMs;
    fallbackActiveFrames = 0;
    return;
  }
}



    // ADDRESS → backswing start
if (state === "ADDRESS") {

  // Toujours enregistrer la frame
  frames.push(pose);
  timestamps.push(timeMs);

  // On attend d’avoir un minimum de frames pour détecter le start
  if (frames.length < 3) return;

  // Détection démarrage du swing
  if (speedWrist > START_SPEED) {
    state = "BACKSWING";
    swingStartTime = timeMs;

    // On met le keyframe un peu plus tard (index frames.length - 1)
    markKeyFrame("backswing", frames.length - 1, pose);
    return;
  }

  return;
}

     // BACKSWING
// Variables globales à ajouter en haut du moteur :
// let prevSpeedWrist = 0;
// let maxBackswingSpeed = 0;

if (state === "BACKSWING") {
  frames.push(pose);
  timestamps.push(timeMs);

  // --- enregistrer le pic de vitesse du backswing ---
  maxBackswingSpeed = Math.max(maxBackswingSpeed, speedWrist);

  // --- Condition TOP robuste ---
  // 1) la vitesse a déjà été suffisamment élevée (backswing réel)
  // 2) puis baisse d'au moins 30 %
  const speedDrop = (maxBackswingSpeed > 0.10) && (speedWrist < maxBackswingSpeed * 0.7);

  // --- changement de direction ---
  const dx = midWrist.x - prevMidWrist.x;
  const dy = midWrist.y - prevMidWrist.y;

  const prevDx = prevMidWrist.x - mid(prevPose[LM.RIGHT_WRIST], prevPose[LM.LEFT_WRIST]).x;
  const prevDy = prevMidWrist.y - mid(prevPose[LM.RIGHT_WRIST], prevPose[LM.LEFT_WRIST]).y;

  const directionChange = (dx * prevDx + dy * prevDy) < 0;  
  // produit scalaire négatif → inversion du mouvement → vrai TOP

  // --- Détection finale du TOP ---
  if (speedDrop || directionChange) {
    state = "TOP";
    markKeyFrame("top", frames.length - 1, pose);
    return;
  }

  prevSpeedWrist = speedWrist;
  return;
}


      // TOP
      if (state === "TOP") {
        frames.push(pose);
        timestamps.push(timeMs);

        // descente = augmentation vitesse
        if (speedWrist > 0.10) {
          state = "DOWNSWING";
          markKeyFrame("downswing", frames.length - 1, pose);
          return;
        }
        return;
      }

      // DOWNSWING
      if (state === "DOWNSWING") {
        frames.push(pose);
        timestamps.push(timeMs);

        // impact = spike vitesse
        if (!impactDetected && speedWrist > IMPACT_SPIKE) {
          impactDetected = true;
          state = "IMPACT";
          markKeyFrame("impact", frames.length - 1, pose);
          return;
        }
        return;
      }

      // IMPACT → release
      if (state === "IMPACT") {
        frames.push(pose);
        timestamps.push(timeMs);

        if (speedWrist < 0.02) {
          state = "RELEASE";
          markKeyFrame("release", frames.length - 1, pose);
          return;
        }
        return;
      }

      // RELEASE → finish
     if (state === "RELEASE") {
  frames.push(pose);
  timestamps.push(timeMs);

  if (releaseStartTime === null) {
    releaseStartTime = timeMs;
  }

  const timeInRelease = timeMs - releaseStartTime;
  const stable = (speedWrist < 0.02 && speedHip < 0.015);

  if (stable || timeInRelease > FINISH_TIMEOUT_MS) {
    state = "FINISH";
    markKeyFrame("finish", frames.length - 1, pose);

    const duration = timeMs - swingStartTime;

    const data = {
      frames: [...frames],
      timestamps: [...timestamps],
      keyFrames: { ...keyFrames },
      club: clubType,
      fps,
    };

    if (typeof onSwingComplete === "function") {
      onSwingComplete({ type: "swingComplete", data });
    }

    reset();
    releaseStartTime = null;
  }
        return;  // ← MANQUAIT ICI !
      }
    }

    return { processPose, reset };  // ← MANQUAIT ICI !
  }

  return { create };  // ← C'était au mauvais endroit !

})();
// -------------------------------------------------------------
//  EXPORT GLOBAL POUR JUSTSWING (Ajout obligatoire)
// -------------------------------------------------------------
if (typeof window !== "undefined") {
  window.SwingEngine = SwingEngine;
}
