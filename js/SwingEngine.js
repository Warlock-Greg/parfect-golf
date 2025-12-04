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

  // --- paramètres
  const MIN_SWING_MS = 350;           // durée mini
  const START_SPEED = 0.015;          // vitesse poignet = démarrage
  const IMPACT_SPIKE = 0.06;          // brusque changement pour impact
  const FINISH_HOLD_MS = 250;         // stabilité finale
  const MAX_IDLE_MS = 1800;           // reset auto
  const FINISH_TIMEOUT_MS = 600; // 0.6 seconde après le release


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
  function create({ fps = 30, onKeyFrame, onSwingComplete }) {

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

    function markKeyFrame(type, index) {
      keyFrames[type] = index;
      if (typeof onKeyFrame === "function") {
        onKeyFrame({ type, index });
      }
    }

    // --- moteur principal
    function processPose(pose, timeMs, clubType) {

      if (!pose) return;

      const dt = lastTime ? (timeMs - lastTime) / 1000 : 1/fps;
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
        if (speedWrist < 0.005) {
          state = "ADDRESS";
          markKeyFrame("address", 0);
        }
        return;
      }

      // ADDRESS → backswing start
      if (state === "ADDRESS") {
        if (speedWrist > START_SPEED) {
          state = "BACKSWING";
          swingStartTime = timeMs;
          frames.push(pose);
          timestamps.push(timeMs);
          markKeyFrame("backswing", frames.length - 1);
          return;
        }
        return;
      }

      // BACKSWING
      if (state === "BACKSWING") {
        frames.push(pose);
        timestamps.push(timeMs);

        // détecter TOP = vitesse bras faible + inversion mouvement
        if (speedWrist < 0.01) {
          state = "TOP";
          markKeyFrame("top", frames.length - 1);
          return;
        }
        return;
      }

      // TOP
      if (state === "TOP") {
        frames.push(pose);
        timestamps.push(timeMs);

        // descente = augmentation vitesse
        if (speedWrist > 0.02) {
          state = "DOWNSWING";
          markKeyFrame("downswing", frames.length - 1);
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
          markKeyFrame("impact", frames.length - 1);
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
          markKeyFrame("release", frames.length - 1);
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
    markKeyFrame("finish", frames.length - 1);

    const duration = timeMs - swingStartTime;

    const data = {
      frames: [...frames],
      timestamps: [...timestamps],
      keyFrames: { ...keyFrames },
      club: clubType,
    };

    if (typeof onSwingComplete === "function") {
      onSwingComplete({ type: "swingComplete", data });
    }

    reset();
    releaseStartTime = null;
  }

  return;
     }
}
