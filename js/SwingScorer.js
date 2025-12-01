import { LM } from "./SwingLandmarks.js";

// === UTILS ===
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const angle = (a, b, c) => {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magA = Math.hypot(ab.x, ab.y);
  const magC = Math.hypot(cb.x, cb.y);
  return Math.acos(dot / (magA * magC)); // radians
};

// === MÉTRIQUES FONDAMENTALES ===

// 1) LAG — angle avant-bras / poignet / shaft
function scoreLag(frames, topIndex, wrist, elbow, index) {
  const slice = frames.slice(topIndex, topIndex + 10);
  const angles = slice.map(f => angle(f[elbow], f[wrist], f[index]));
  const minAngle = Math.min(...angles); // plus petit = meilleur lag

  return Math.max(0, 100 - (minAngle - 0.55) * 180); 
}

// 2) REPRISE D’APPUI — déplacement hanche → cible
function scoreWeightShift(frames, topIndex, impactIndex) {
  const hipX_start = mid(frames[0][LM.LEFT_HIP], frames[0][LM.RIGHT_HIP]).x;
  const hipX_mid = mid(frames[Math.floor((topIndex + impactIndex) / 2)][LM.LEFT_HIP],
                       frames[Math.floor((topIndex + impactIndex) / 2)][LM.RIGHT_HIP]).x;

  const shift = hipX_start - hipX_mid; // positif = vers la cible

  return Math.max(0, Math.min(100, shift * 2500));
}

// 3) VERTICALITÉ — angle du buste
function torsoAngle(frame) {
  const s = mid(frame[LM.LEFT_SHOULDER], frame[LM.RIGHT_SHOULDER]);
  const h = mid(frame[LM.LEFT_HIP], frame[LM.RIGHT_HIP]);
  return Math.atan2(s.y - h.y, s.x - h.x);
}
function scorePosture(frames, impactIndex) {
  const base = torsoAngle(frames[0]);
  const final = torsoAngle(frames[impactIndex]);
  const diff = Math.abs(final - base);
  return Math.max(0, 100 - diff * 600);
}

// 4) TRIANGLE — cohérence bras / épaules
function triangleWidth(f) {
  const shoulders = dist(f[LM.LEFT_SHOULDER], f[LM.RIGHT_SHOULDER]);
  const wrists = dist(f[LM.LEFT_WRIST], f[LM.RIGHT_WRIST]);
  return wrists / shoulders; // ratio
}
function scoreTriangle(frames) {
  const ref = triangleWidth(frames[0]);
  let maxVar = 0;
  for (let f of frames) {
    maxVar = Math.max(maxVar, Math.abs(triangleWidth(f) - ref));
  }
  return Math.max(0, 100 - maxVar * 3000);
}

// =====================================================
// === SCORE FINAL ADAPTÉ AU CLUB ===
// =====================================================

export function computeSwingScore(frames, keyFrames, club) {
  const { setupIndex, topIndex, impactIndex } = keyFrames;

  // === COMMON METRICS ===
  const lag = scoreLag(
    frames, topIndex,
    LM.RIGHT_WRIST, LM.RIGHT_ELBOW, LM.RIGHT_INDEX
  );
  const shift = scoreWeightShift(frames, topIndex, impactIndex);
  const posture = scorePosture(frames, impactIndex);
  const triangle = scoreTriangle(frames);

  // === WEIGHTS & TOLERANCES PAR CLUB ===
  const CLUB_WEIGHTS = {
    driver:  { lag:0.35, shift:0.30, posture:0.20, triangle:0.15 },
    fer:     { lag:0.30, shift:0.25, posture:0.25, triangle:0.20 },
    wedge:   { lag:0.15, shift:0.15, posture:0.40, triangle:0.30 },
    putter:  { lag:0.00, shift:0.00, posture:0.60, triangle:0.40 },
  };

  const W = CLUB_WEIGHTS[club] ?? CLUB_WEIGHTS["fer"];

  const score =
    lag     * W.lag +
    shift   * W.shift +
    posture * W.posture +
    triangle* W.triangle;

  return Math.round(score);
}

export function computeSwingScoreWithDetails(frames, keyFrames, club) {
  const { topIndex, impactIndex } = keyFrames;

  const lag = scoreLag(
    frames, topIndex,
    LM.RIGHT_WRIST, LM.RIGHT_ELBOW, LM.RIGHT_INDEX
  );
  const shift   = scoreWeightShift(frames, topIndex, impactIndex);
  const posture = scorePosture(frames, impactIndex);
  const triangle= scoreTriangle(frames);

  const CLUB_WEIGHTS = {
    driver: { lag:0.35, shift:0.30, posture:0.20, triangle:0.15 },
    fer:    { lag:0.30, shift:0.25, posture:0.25, triangle:0.20 },
    wedge:  { lag:0.15, shift:0.15, posture:0.40, triangle:0.30 },
    putter: { lag:0.00, shift:0.00, posture:0.60, triangle:0.40 },
  };

  const W = CLUB_WEIGHTS[club] ?? CLUB_WEIGHTS["fer"];

  const total =
    lag     * W.lag +
    shift   * W.shift +
    posture * W.posture +
    triangle* W.triangle;

  return {
    total: Math.round(total),
    lag,
    shift,
    posture,
    triangle,
  };
}

// Wrapper simple si tu veux garder computeSwingScore
export function computeSwingScore(frames, keyFrames, club) {
  return computeSwingScoreWithDetails(frames, keyFrames, club).total;
}
