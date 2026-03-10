// SwingEngine.js
//  SWINGENGINE PRO — SCORE READY (Parfect 2025)
//  Détection : Top / Impact / Finish
//  Phases : IDLE → ADDRESS → BACKSWING → TOP → DOWNSWING → IMPACT → RELEASE → FINISH
//  Événements : onKeyFrame, onSwingComplete
//

const SwingEngine = (() => {
  console.log("🟢 SwingEngine.js EXECUTED");

  const LM = {
    NOSE: 0,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
  };

  const SWING_THRESHOLDS = {
    WRIST_START: 0.04,
    WRIST_STOP: 0.015,
    HIP_START: 0.03,
    HIP_STOP: 0.012,
  };

  // --- paramètres
  const MIN_SWING_MS = 350;          // durée mini (pas encore utilisé, gardé pour évolution)
  const START_SPEED = 0.015;         // vitesse poignet = démarrage backswing
  const IMPACT_SPIKE = 0.25;         // spike vitesse = impact
  const FINISH_HOLD_MS = 250;        // (pas utilisé pour l'instant)
  const MAX_IDLE_MS = 1800;          // reset auto si inactif
  const FINISH_TIMEOUT_MS = 700;     // timeout release → finish

  // fallback start (si thresholds stricts)
  const FALLBACK_MIN_FRAMES = 20;    // ≈ 0.7s à 30fps
  const FALLBACK_MIN_ENERGY = 0.03;

  function dist(a, b) {
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function mid(a, b) {
    if (!a || !b) return null;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  // --- Création moteur
  function create({ fps = 30, onKeyFrame, onSwingComplete, onSwingStart, debug = false } = {}) {
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
      finish: null,
    };

    let swingStartTime = null;
    let lastMotionTime = performance.now();

    let impactDetected = false;
    let releaseStartTime = null;

    let maxBackswingSpeed = 0;
    let armed = false;

    // extension (info scoring)
    let extensionDetected = false;
    let extensionStartTime = null;

    // fallback start
    let fallbackActiveFrames = 0;

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
        finish: null,
      };

      state = "IDLE";
      impactDetected = false;
      releaseStartTime = null;

      maxBackswingSpeed = 0;

      extensionDetected = false;
      extensionStartTime = null;

      fallbackActiveFrames = 0;

      lastPose = null;
      lastTime = null;
    }

    function armForSwing(timeMs = performance.now()) {
  reset();
  armed = true;
  swingStartTime = timeMs;
  lastMotionTime = timeMs;

  if (debug) console.log("🎯 SwingEngine ARMÉ");
}


    function clonePose(pose) {
      // MediaPipe landmarks = array of 33 objects (x,y,z,visibility)
      // structuredClone ok si dispo, sinon JSON stringify
      try {
        // eslint-disable-next-line no-undef
        if (typeof structuredClone === "function") return structuredClone(pose);
      } catch (_) {}
      return pose ? JSON.parse(JSON.stringify(pose)) : null;
    }

    function markKeyFrame(type, index, pose) {
      keyFrames[type] = {
        index,
        pose: clonePose(pose),
      };

      if (typeof onKeyFrame === "function") {
        onKeyFrame({
          type,
          index,
          pose: clonePose(pose),
        });
      }
    }

    function processPose(pose, timeMs, clubType) {
      if (!pose) return null;

      const dt = lastTime != null ? (timeMs - lastTime) / 1000 : 1 / fps;
      lastTime = timeMs;

      const Rw = pose[LM.RIGHT_WRIST];
      const Lw = pose[LM.LEFT_WRIST];
      const Rh = pose[LM.RIGHT_HIP];
      const Lh = pose[LM.LEFT_HIP];

      const midHip = mid(Rh, Lh);
      const midWrist = mid(Rw, Lw);

     // 🔑 Amorçage mémoire (1ère frame)
      if (!lastPose) {
          lastPose = pose;
          lastTime = timeMs;
          return null;
      }

      const prevPose = lastPose;
      lastPose = pose;


        if (!prevPose) {
            lastPose = pose;
            lastTime = timeMs;
            return null;
                      }


      const prevMidWrist = mid(prevPose[LM.RIGHT_WRIST], prevPose[LM.LEFT_WRIST]);
      const prevMidHip = mid(prevPose[LM.RIGHT_HIP], prevPose[LM.LEFT_HIP]);

      if (!midWrist || !midHip || !prevMidWrist || !prevMidHip) return null;

      const speedWrist = dist(midWrist, prevMidWrist) / (dt || 0.033);
      const speedHip = dist(midHip, prevMidHip) / (dt || 0.033);

      if (debug) {
        console.log(
          "⚡ speedWrist =", speedWrist.toFixed(4),
          "| speedHip =", speedHip.toFixed(4),
          "| state =", state
        );
      }

      const now = timeMs;

      // RESET auto si plus de mouvement
      if (now - lastMotionTime > MAX_IDLE_MS) {
        reset();
        return null;
      }
      if (speedWrist > 0.005 || speedHip > 0.005) {
        lastMotionTime = now;
      }

      // =====================================================
      // IDLE → ADDRESS
      // =====================================================
      if (state === "IDLE") {

        // ⛔ Tant que JustSwing n’a pas armé le swing
        if (!armed) return null;
      
        const motionEnergy = speedWrist + speedHip;

        // 🔹 Déclencheur principal du swing
        if (speedWrist > SWING_THRESHOLDS.WRIST_START && speedHip > SWING_THRESHOLDS.HIP_START) {
          state = "ADDRESS";
           armed = false; // 🔓 consommé
          swingStartTime = timeMs;
          fallbackActiveFrames = 0;

          if (typeof onSwingStart === "function") onSwingStart({ t: timeMs, club: clubType });
          return null;
        }

        // 🔸 Fallback fluide
        if (motionEnergy > FALLBACK_MIN_ENERGY) {
          fallbackActiveFrames++;
        } else {
          fallbackActiveFrames = 0;
        }

        if (fallbackActiveFrames >= FALLBACK_MIN_FRAMES) {
          if (debug) console.log("🟡 FALLBACK SWING START");
          state = "ADDRESS";
          swingStartTime = timeMs;
          fallbackActiveFrames = 0;

          if (typeof onSwingStart === "function") onSwingStart({ t: timeMs, club: clubType });
          return null;
        }

        return null;
      }

      // =====================================================
      // ADDRESS → BACKSWING
      // =====================================================
      if (state === "ADDRESS") {
        frames.push(pose);
        timestamps.push(timeMs);

        if (frames.length < 3) return null;

        if (speedWrist > START_SPEED) {
          state = "BACKSWING";
          // swingStartTime déjà set, mais on garde ton intention
          swingStartTime = swingStartTime ?? timeMs;
          markKeyFrame("backswing", frames.length - 1, pose);
        }
        return null;
      }

      // =====================================================
      // BACKSWING → TOP
      // =====================================================
      if (state === "BACKSWING") {
        frames.push(pose);
        timestamps.push(timeMs);

        maxBackswingSpeed = Math.max(maxBackswingSpeed, speedWrist);

        // speed drop (backswing réel puis décélération)
        const speedDrop = maxBackswingSpeed > 0.10 && speedWrist < maxBackswingSpeed * 0.7;

        // direction change (inversion)
        const dx = midWrist.x - prevMidWrist.x;
        const dy = midWrist.y - prevMidWrist.y;

        // approx simple : signe produit scalaire avec mouvement précédent
        const prevDx = prevMidWrist.x - mid(prevPose[LM.RIGHT_WRIST], prevPose[LM.LEFT_WRIST]).x;
        const prevDy = prevMidWrist.y - mid(prevPose[LM.RIGHT_WRIST], prevPose[LM.LEFT_WRIST]).y;

        const directionChange = dx * prevDx + dy * prevDy < 0;

        if (speedDrop || directionChange) {
          state = "TOP";
          markKeyFrame("top", frames.length - 1, pose);
        }
        return null;
      }

      // =====================================================
      // TOP → DOWNSWING
      // =====================================================
      if (state === "TOP") {
        frames.push(pose);
        timestamps.push(timeMs);

        if (speedWrist > 0.10) {
          state = "DOWNSWING";
          markKeyFrame("downswing", frames.length - 1, pose);
        }
        return null;
      }

      // =====================================================
      // DOWNSWING → IMPACT
      // =====================================================
      if (state === "DOWNSWING") {
        frames.push(pose);
        timestamps.push(timeMs);

        if (!impactDetected && speedWrist > IMPACT_SPIKE) {
          impactDetected = true;
          state = "IMPACT";
          markKeyFrame("impact", frames.length - 1, pose);
        }
        return null;
      }

      // =====================================================
      // IMPACT → RELEASE (avec extensionDetected)
      // =====================================================
      if (state === "IMPACT") {
        frames.push(pose);
        timestamps.push(timeMs);

        const wristLead = pose[LM.LEFT_WRIST]; // à adapter si gaucher
        const hipsMid = mid(pose[LM.LEFT_HIP], pose[LM.RIGHT_HIP]);

        // 🔑 Détection EXTENSION (mains devant hanches) — stockée pour scoring
        if (!extensionDetected && wristLead && hipsMid && wristLead.x > hipsMid.x + 0.02) {
          extensionDetected = true;
          extensionStartTime = timeMs;
        }

        // Passage en RELEASE quand la vitesse chute
        if (speedWrist < 0.02) {
          state = "RELEASE";
          releaseStartTime = timeMs;
          markKeyFrame("release", frames.length - 1, pose);
        }
        return null;
      }

      // =====================================================
      // RELEASE → FINISH → swingComplete
      // =====================================================
 // =====================================================
// RELEASE → FINISH → swingComplete
// =====================================================
if (state === "RELEASE") {

  frames.push(pose);
  timestamps.push(timeMs);

  const timeInRelease = timeMs - (releaseStartTime ?? timeMs);

  // stabilité plus tolérante
  const stable =
    speedWrist < 0.035 &&
    speedHip < 0.025;

  // sécurité : assez de frames après impact
  const enoughFramesAfterImpact =
    keyFrames.impact &&
    frames.length - keyFrames.impact.index > 5;

  if ((stable && enoughFramesAfterImpact) || timeInRelease > FINISH_TIMEOUT_MS) {

    state = "FINISH";

    markKeyFrame("finish", frames.length - 1, pose);

    const data = {
      frames: [...frames],
      timestamps: [...timestamps],
      keyFrames: { ...keyFrames },
      club: clubType,
      fps,

      // scoring
      extensionDetected,
      extensionStartTime,
    };

    if (typeof onSwingComplete === "function") {
      onSwingComplete({ type: "swingComplete", data });
    }

    reset();
  }

  return null;
}

      return null;
    }

    return { processPose, reset, armForSwing };
  }

  return { create };
})();


if (typeof window !== "undefined") {
  window.SwingEngine = SwingEngine;
}
