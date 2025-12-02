// =========================================================
//   Parfect – SwingScorer PREMIUM (adapté à SwingEngine PRO)
//   Input attendu : un objet "swing" = { frames, keyFrames, timestamps, club }
// =========================================================

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  if (!a || !b) return 999;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleBetweenSegments(A, B, C, D) {
  if (!A || !B || !C || !D) return 0;
  const v1 = { x: B.x - A.x, y: B.y - A.y };
  const v2 = { x: D.x - C.x, y: D.y - C.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (!m1 || !m2) return 0;
  return Math.acos(clamp(dot / (m1 * m2), -1, 1)) * 180 / Math.PI;
}

// ---------------------------------------------------------
//   TRIANGLE (bras / épaules)
// ---------------------------------------------------------
function computeTriangleMetrics(pose) {
  const LS = pose[11], RS = pose[12];
  const LH = pose[15], RH = pose[16];
  if (!LS || !RS || !LH || !RH) return null;

  const shoulderWidth = dist(LS, RS);
  const mid = { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 };
  const handDist = (dist(LH, mid) + dist(RH, mid)) / 2;
  const angle = angleBetweenSegments(LS, RS, LH, RH);

  return { shoulderWidth, handDist, angle };
}

function scoreTriangle(poseAtImpact) {
  const tri = computeTriangleMetrics(poseAtImpact);
  if (!tri) return 10;
  const s = 1 - Math.abs(tri.shoulderWidth - 0.25) / 0.25;
  const h = 1 - Math.abs(tri.handDist - 0.18) / 0.18;
  const a = 1 - Math.abs(tri.angle - 25) / 25;
  return Math.round(clamp((s + h + a) / 3, 0, 1) * 20);
}

// ---------------------------------------------------------
//   LAG (poignets au top)
// ---------------------------------------------------------
function scoreLag(poseAtTop) {
  const wrist = poseAtTop[15];
  const elbow = poseAtTop[13];
  if (!wrist || !elbow) return 10;
  const dy = elbow.y - wrist.y;
  const raw = clamp((dy - 0.01) / 0.10, 0, 1);
  return Math.round(raw * 15);
}

// ---------------------------------------------------------
//   PLAN (angle épaule → main à l’impact)
// ---------------------------------------------------------
function scorePlane(poseAtImpact) {
  const wrist = poseAtImpact[15];
  const shoulder = poseAtImpact[11];
  if (!wrist || !shoulder) return 10;
  const angle =
    Math.atan2(wrist.y - shoulder.y, wrist.x - shoulder.x) * 180 / Math.PI;
  const diff = Math.abs(angle - 35);
  const raw = clamp(1 - diff / 25, 0, 1);
  return Math.round(raw * 15);
}

// ---------------------------------------------------------
//   ROTATION (épaule vs hanches au downswing)
// ---------------------------------------------------------
function scoreRotation(poseAtDownswing) {
  const LS = poseAtDownswing[11], RS = poseAtDownswing[12];
  const LH = poseAtDownswing[23], RH = poseAtDownswing[24];
  if (!LS || !RS || !LH || !RH) return 10;

  const shoulderTilt = angleBetweenSegments(LS, RS, { x: LS.x, y: LS.y - 0.1 }, LS);
  const hipTilt      = angleBetweenSegments(LH, RH, { x: LH.x, y: LH.y - 0.1 }, LH);

  const diff = Math.abs(shoulderTilt - hipTilt);
  const raw = clamp(1 - diff / 25, 0, 1);
  return Math.round(raw * 15);
}

// ---------------------------------------------------------
//   FINISH (équilibre + rotation)
// ---------------------------------------------------------
function scoreFinish(poseAtFinish) {
  const LS = poseAtFinish[11], RS = poseAtFinish[12];
  if (!LS || !RS) return 10;
  const tilt = Math.abs(LS.x - RS.x);
  const raw = clamp(1 - tilt / 0.25, 0, 1);
  return Math.round(raw * 15);
}

// ---------------------------------------------------------
//   HEAD STABILITY (tête address → impact)
// ---------------------------------------------------------
function scoreHeadStability(frames, keyFrames) {
  const start = keyFrames.address ?? 0;
  const end   = keyFrames.impact ?? (frames.length - 1);
  const headPositions = [];

  for (let i = start; i <= end; i++) {
    const pose = frames[i];
    if (pose && pose[0]) headPositions.push(pose[0]);
  }
  if (headPositions.length < 5) return 10;

  const xs = headPositions.map(h => h.x);
  const ys = headPositions.map(h => h.y);
  const dx = Math.max(...xs) - Math.min(...xs);
  const dy = Math.max(...ys) - Math.min(...ys);
  const move = Math.sqrt(dx*dx + dy*dy);

  const raw = clamp(1 - move / 0.10, 0, 1);
  return Math.round(raw * 10);
}

// ---------------------------------------------------------
//   TEMPO (ratio backswing / downswing)
// ---------------------------------------------------------
function scoreTempo(timestamps, keyFrames) {
  const a = keyFrames.address;
  const t = keyFrames.top;
  const i = keyFrames.impact;

  if (a == null || t == null || i == null) return 10;

  const tBack  = timestamps[t] - timestamps[a];
  const tDown  = timestamps[i] - timestamps[t];
  if (tBack <= 0 || tDown <= 0) return 10;

  const ratio = tBack / tDown;      // idéal ≈ 3
  const diff  = Math.abs(ratio - 3);
  const raw   = clamp(1 - diff / 1.5, 0, 1);
  return Math.round(raw * 10);
}

// ---------------------------------------------------------
//   PREMIUM SCORE GLOBAL
// ---------------------------------------------------------
function computeSwingScorePremium(swing) {
  const frames     = swing.frames || [];
  const keyFrames  = swing.keyFrames || {};
  const timestamps = swing.timestamps || [];

  if (!frames.length) {
    return {
      total: 0,
      triangleScore: 0,
      lagScore: 0,
      planeScore: 0,
      rotationScore: 0,
      finishScore: 0,
      headScore: 0,
      tempoScore: 0
    };
  }

  const f_address   = frames[keyFrames.address]   || frames[0];
  const f_top       = frames[keyFrames.top]       || f_address;
  const f_downswing = frames[keyFrames.downswing] || f_top;
  const f_impact    = frames[keyFrames.impact]    || frames[frames.length - 1];
  const f_finish    = frames[keyFrames.finish]    || frames[frames.length - 1];

  const triangleScore = scoreTriangle(f_impact);
  const lagScore      = scoreLag(f_top);
  const planeScore    = scorePlane(f_impact);
  const rotationScore = scoreRotation(f_downswing);
  const finishScore   = scoreFinish(f_finish);
  const headScore     = scoreHeadStability(frames, keyFrames);
  const tempoScore    = scoreTempo(timestamps, keyFrames);

  // pondération vers /100
  const total =
    triangleScore +
    lagScore +
    planeScore +
    rotationScore +
    finishScore +
    headScore +
    tempoScore;

  return {
    total,
    triangleScore,
    lagScore,
    planeScore,
    rotationScore,
    finishScore,
    headScore,
    tempoScore
  };
}

// Compat pour ancien code éventuel
function computeSwingScore(modeOrSwing, pose, ctx) {
  if (modeOrSwing && modeOrSwing.frames && modeOrSwing.keyFrames) {
    return computeSwingScorePremium(modeOrSwing);
  }
  if (ctx && ctx.frames && ctx.keyFrames) {
    return computeSwingScorePremium({
      frames: ctx.frames,
      keyFrames: ctx.keyFrames,
      timestamps: ctx.timestamps || []
    });
  }
  return {
    total: 0,
    triangleScore: 0,
    lagScore: 0,
    planeScore: 0,
    rotationScore: 0,
    finishScore: 0,
    headScore: 0,
    tempoScore: 0
  };
}
