// === SwingValidator.js ===
// Détection des keyframes + validation swing complet

import { LM } from "./SwingLandmarks.js";

// Config générique
const MIN_BACKSWING_LIFT = 0.12;   // 12% de la hauteur d’écran
const MIN_ROTATION_TOP   = 0.45;   // ~25° en 2D (épaule)
const MIN_DOWNSWING_MS   = 120;    // durée mini downswing
const FINISH_STABLE_MS   = 400;    // temps de stabilité finish
const SPEED_FINISH_WRIST = 0.008;
const SPEED_FINISH_HIP   = 0.006;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid  = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function torsoAngle(frame) {
  const s = mid(frame[LM.LEFT_SHOULDER], frame[LM.RIGHT_SHOULDER]);
  const h = mid(frame[LM.LEFT_HIP], frame[LM.RIGHT_HIP]);
  return Math.atan2(s.y - h.y, s.x - h.x);
}

function shoulderRotation(frame0, frameTop) {
  // rotation relative des épaules entre setup et top
  const s0 = mid(frame0[LM.LEFT_SHOULDER], frame0[LM.RIGHT_SHOULDER]);
  const sT = mid(frameTop[LM.LEFT_SHOULDER], frameTop[LM.RIGHT_SHOULDER]);
  const dx = sT.x - s0.x;
  const dy = sT.y - s0.y;
  return Math.abs(Math.atan2(dy, dx)); // rad simplifié pour 2D
}

// === 1) detectKeyFrames(frames) ===
// Retourne { setupIndex, topIndex, impactIndex, finishIndex }
export function detectKeyFrames(frames, opts = {}) {
  if (!frames || frames.length < 10) return null;

  const wristIndex = opts.wristIndex ?? LM.RIGHT_WRIST;
  const timestamps = opts.timestamps || null; 
  // si tu n’as pas les timestamps, on approxime 30 fps
  const dtMs = (i1, i0) =>
    timestamps
      ? timestamps[i1] - timestamps[i0]
      : (i1 - i0) * (1000 / 30);

  const setupIndex = 0;
  const setupFrame = frames[setupIndex];
  const setupWristY = setupFrame[wristIndex].y;

  const ys = frames.map(f => f[wristIndex].y);

  // --- TOP OF BACKSWING : local min de Y après montée suffisante + rotation ---
  let topIndex = null;
  let minY = Infinity;

  for (let i = 2; i < frames.length - 3; i++) {
    const dyPrev = ys[i] - ys[i - 1];
    const dyNext = ys[i + 1] - ys[i];
    const liftFromSetup = setupWristY - ys[i];

    if (dyPrev < 0 && dyNext > 0 && liftFromSetup > MIN_BACKSWING_LIFT) {
      // candidat à un vrai top
      if (ys[i] < minY) {
        minY = ys[i];
        topIndex = i;
      }
    }
  }

  if (topIndex == null) return null; // pas de vrai backswing

  // Valider la rotation au top
  const rot = shoulderRotation(setupFrame, frames[topIndex]);
  if (rot < MIN_ROTATION_TOP) {
    return null; // backswing trop petit = chip / gesticulation
  }

  // --- IMPACT : point le plus bas après le top + inversion direction ---
  let impactIndex = null;
  let maxY = -Infinity;

  for (let i = topIndex + 2; i < frames.length - 2; i++) {
    const dyPrev = ys[i] - ys[i - 1];
    const dyNext = ys[i + 1] - ys[i];
    if (ys[i] > maxY && dyPrev > 0 && dyNext < 0) {
      maxY = ys[i];
      impactIndex = i;
    }
  }

  if (impactIndex == null) return null;

  // Vérifier durée downswing
  const downswingDuration = dtMs(impactIndex, topIndex);
  if (downswingDuration < MIN_DOWNSWING_MS) {
    return null; // pas un vrai downswing, mouvement trop court
  }

  // --- FINISH : stabilisation après l’impact ---
  let finishIndex = frames.length - 1;
  let stableStart = null;

  for (let i = impactIndex + 1; i < frames.length; i++) {
    const frame     = frames[i];
    const prevFrame = frames[i - 1];
    const wristSpeed = dist(frame[wristIndex], prevFrame[wristIndex]);
    const hipSpeed   = dist(
      mid(frame[LM.LEFT_HIP], frame[LM.RIGHT_HIP]),
      mid(prevFrame[LM.LEFT_HIP], prevFrame[LM.RIGHT_HIP])
    );

    const lowSpeed = wristSpeed < SPEED_FINISH_WRIST && hipSpeed < SPEED_FINISH_HIP;

    if (lowSpeed) {
      if (stableStart == null) stableStart = i - 1;
      const stableMs = dtMs(i, stableStart);
      if (stableMs >= FINISH_STABLE_MS) {
        finishIndex = i;
        break;
      }
    } else {
      stableStart = null;
    }
  }

  return { setupIndex, topIndex, impactIndex, finishIndex };
}

// === 2) validateSwing(frames) ===
// Retourne { valid, reason, keyFrames }
export function validateSwing(frames, opts = {}) {
  const keyFrames = detectKeyFrames(frames, opts);
  if (!keyFrames) {
    return {
      valid: false,
      reason: "swing_incomplet",
      keyFrames: null,
    };
  }

  const { setupIndex, topIndex, impactIndex, finishIndex } = keyFrames;

  // Check 1 : amplitude backswing
  const wristIndex = opts.wristIndex ?? LM.RIGHT_WRIST;
  const setupWristY = frames[setupIndex][wristIndex].y;
  const topWristY   = frames[topIndex][wristIndex].y;
  const lift = setupWristY - topWristY;

  if (lift < MIN_BACKSWING_LIFT) {
    return {
      valid: false,
      reason: "backswing_trop_court",
      keyFrames,
    };
  }

  // Check 2 : rotation épaules
  const rot = shoulderRotation(frames[setupIndex], frames[topIndex]);
  if (rot < MIN_ROTATION_TOP) {
    return {
      valid: false,
      reason: "rotation_insuffisante",
      keyFrames,
    };
  }

  // Check 3 : downswing
  const timestamps = opts.timestamps || null;
  const dtMs = (i1, i0) =>
    timestamps
      ? timestamps[i1] - timestamps[i0]
      : (i1 - i0) * (1000 / 30);
  const downswingDuration = dtMs(impactIndex, topIndex);

  if (downswingDuration < MIN_DOWNSWING_MS) {
    return {
      valid: false,
      reason: "downswing_trop_rapide_ou_incomplet",
      keyFrames,
    };
  }

  // Check 4 : finish (doit être après impact et stable)
  if (finishIndex <= impactIndex) {
    return {
      valid: false,
      reason: "finish_non_stable",
      keyFrames,
    };
  }

  // OK
  return {
    valid: true,
    reason: "ok",
    keyFrames,
  };
}
