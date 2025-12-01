// =========================================================
//  SwingEngine.js – Détection, keyframes & scoring PRO
//  Global: window.SwingEngine.create()
// =========================================================

(function () {
  const LM = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_INDEX: 19,
    RIGHT_INDEX: 20,
  };

  const START_SPEED = 0.015;
  const FINISH_SPEED_WRIST = 0.008;
  const FINISH_SPEED_HIP = 0.006;
  const MIN_SWING_MS = 450;
  const MIN_BACKSWING_LIFT = 0.12;

  const dist = (a, b) => {
    if (!a || !b) return 999;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  };

  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const angle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magA = Math.hypot(ab.x, ab.y);
    const magC = Math.hypot(cb.x, cb.y);
    if (!magA || !magC) return 0;
    const cos = Math.min(1, Math.max(-1, dot / (magA * magC)));
    return Math.acos(cos); // radians
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // ------------------------------------------------------
  //  Keyframes: setup / top / impact / finish
  // ------------------------------------------------------
  function detectKeyFrames(frames, timestamps) {
    if (!frames || frames.length < 12) return null;

    const wristIdx = LM.RIGHT_WRIST;
    const ys = frames.map(f => f[wristIdx]?.y ?? 0.5);
    const setupIndex = 0;
    const setupY = ys[setupIndex];

    // TOP = minimum Y après montée significative
    let topIndex = null;
    let minY = Infinity;
    for (let i = 2; i < ys.length - 3; i++) {
      const lift = setupY - ys[i];
      if (lift > MIN_BACKSWING_LIFT && ys[i] < minY) {
        minY = ys[i];
        topIndex = i;
      }
    }
    if (topIndex == null) return null;

    // IMPACT = maximum Y après le top (point le plus bas)
    let impactIndex = null;
    let maxY = -Infinity;
    for (let i = topIndex + 2; i < ys.length; i++) {
      if (ys[i] > maxY) {
        maxY = ys[i];
        impactIndex = i;
      }
    }
    if (impactIndex == null) return null;

    // FINISH = dernière frame (on pourra raffiner plus tard)
    const finishIndex = frames.length - 1;

    // durée downswing
    const dt = (i1, i0) =>
      timestamps && timestamps.length === frames.length
        ? timestamps[i1] - timestamps[i0]
        : (i1 - i0) * (1000 / 30);

    const downswingMs = dt(impactIndex, topIndex);
    if (downswingMs < 120) return null;

    return { setupIndex, topIndex, impactIndex, finishIndex };
  }

  // ------------------------------------------------------
  //  Scoring métriques PRO
  // ------------------------------------------------------
  function scoreLag(frames, key) {
    const { topIndex } = key;
    const slice = frames.slice(topIndex, topIndex + 8);
    const wrist = LM.RIGHT_WRIST;
    const elbow = LM.RIGHT_ELBOW;
    const index = LM.RIGHT_INDEX;

    const angles = slice
      .map(f => angle(f[elbow], f[wrist], f[index]))
      .filter(a => a > 0);
    if (!angles.length) return 50;

    const minAngle = Math.min(...angles); // rad
    // 0.5 rad (~30°) = top, 1.0 rad (~57°) = moyen, 1.3 rad (~75°) = mauvais
    const raw = clamp((1.3 - minAngle) / (1.3 - 0.5), 0, 1);
    return Math.round(40 + raw * 60); // 40–100
  }

  function scoreWeightShift(frames, key) {
    const { setupIndex, topIndex, impactIndex } = key;
    const hipMid = (i) =>
      mid(frames[i][LM.LEFT_HIP], frames[i][LM.RIGHT_HIP]).x;

    const startX = hipMid(setupIndex);
    const midIdx = Math.floor((topIndex + impactIndex) / 2);
    const midX = hipMid(midIdx);

    const shift = startX - midX; // positif = vers la cible
    const raw = clamp((shift - 0.01) / 0.06, 0, 1); // 1–6 cm
    return Math.round(30 + raw * 70);
  }

  function torsoAngle(frame) {
    const s = mid(frame[LM.LEFT_SHOULDER], frame[LM.RIGHT_SHOULDER]);
    const h = mid(frame[LM.LEFT_HIP], frame[LM.RIGHT_HIP]);
    return Math.atan2(s.y - h.y, s.x - h.x);
  }

  function scorePosture(frames, key) {
    const { setupIndex, impactIndex } = key;
    const a0 = torsoAngle(frames[setupIndex]);
    const aI = torsoAngle(frames[impactIndex]);
    const diff = Math.abs(aI - a0); // rad
    const raw = clamp((0.35 - diff) / 0.35, 0, 1); // <=20° très bien
    return Math.round(30 + raw * 70);
  }

  function triangleWidth(frame) {
    const LS = frame[LM.LEFT_SHOULDER];
    const RS = frame[LM.RIGHT_SHOULDER];
    const LW = frame[LM.LEFT_WRIST];
    const RW = frame[LM.RIGHT_WRIST];
    if (!LS || !RS || !LW || !RW) return 0.3;

    const shoulderW = dist(LS, RS);
    const wristsW = dist(LW, RW);
    return wristsW / (shoulderW || 1e-3);
  }

  function scoreTriangle(frames) {
    const ref = triangleWidth(frames[0]);
    let maxVar = 0;
    frames.forEach(f => {
      const tw = triangleWidth(f);
      maxVar = Math.max(maxVar, Math.abs(tw - ref));
    });
    const raw = clamp((0.25 - maxVar) / 0.25, 0, 1); // 0–0.25 variation
    return Math.round(40 + raw * 60);
  }

  function computeScores(frames, keyFrames, club) {
    const lag = scoreLag(frames, keyFrames);
    const shift = scoreWeightShift(frames, keyFrames);
    const posture = scorePosture(frames, keyFrames);
    const triangle = scoreTriangle(frames);

    const weightsByClub = {
      driver: { lag: 0.35, shift: 0.30, posture: 0.20, triangle: 0.15 },
      wedge: { lag: 0.15, shift: 0.15, posture: 0.40, triangle: 0.30 },
      putter: { lag: 0.0, shift: 0.0, posture: 0.60, triangle: 0.40 },
      default: { lag: 0.30, shift: 0.25, posture: 0.25, triangle: 0.20 },
    };

    const W = weightsByClub[club] || weightsByClub.default;

    const total =
      lag * W.lag +
      shift * W.shift +
      posture * W.posture +
      triangle * W.triangle;

    return {
      total: Math.round(total),
      lag,
      shift,
      posture,
      triangle,
    };
  }

  // ------------------------------------------------------
  //  Création d’un engine
  // ------------------------------------------------------
  function create() {
    let state = "IDLE";
    let lastPose = null;
    let lastTime = null;

    let frames = [];
    let timestamps = [];
    let swingStartTime = null;

    function resetSwing() {
      frames = [];
      timestamps = [];
      swingStartTime = null;
      state = "IDLE";
    }

    function processPose(pose, timeMs, club) {
      if (!pose) {
        lastPose = null;
        lastTime = timeMs;
        return { type: "none" };
      }

      const wrist = pose[LM.RIGHT_WRIST];
      const prevWrist = lastPose?.[LM.RIGHT_WRIST] || wrist;
      const dt = lastTime ? (timeMs - lastTime) / 1000 : 0.033;
      const speedWrist = dist(wrist, prevWrist) / (dt || 0.033);

      const hip = mid(pose[LM.LEFT_HIP], pose[LM.RIGHT_HIP]);
      const prevHip = lastPose
        ? mid(lastPose[LM.LEFT_HIP], lastPose[LM.RIGHT_HIP])
        : hip;
      const speedHip = dist(hip, prevHip) / (dt || 0.033);

      lastPose = pose;
      lastTime = timeMs;

      // IDLE → START
      if (state === "IDLE") {
        if (speedWrist > START_SPEED) {
          state = "TRACKING";
          frames = [pose];
          timestamps = [timeMs];
          swingStartTime = timeMs;
          return { type: "swingStart" };
        }
        return { type: "none" };
      }

      // TRACKING
      if (state === "TRACKING") {
        frames.push(pose);
        timestamps.push(timeMs);

        const swingDuration = timeMs - swingStartTime;
        const lowSpeed =
          speedWrist < FINISH_SPEED_WRIST && speedHip < FINISH_SPEED_HIP;

        if (swingDuration > MIN_SWING_MS && lowSpeed && frames.length > 10) {
          // tentative de fin de swing
          const keyFrames = detectKeyFrames(frames, timestamps);
          if (!keyFrames) {
            const reason = "swing_incomplet";
            const data = { frames, timestamps, reason };
            resetSwing();
            return { type: "swingRejected", data };
          }

          const scores = computeScores(frames, keyFrames, club || "fer");
          const data = {
            frames,
            timestamps,
            keyFrames,
            scores,
            club,
          };
          resetSwing();
          return { type: "swingComplete", data };
        }

        return { type: "tracking" };
      }

      return { type: "none" };
    }

    return {
      processPose,
      resetSwing,
    };
  }

  window.SwingEngine = { create };
})();
