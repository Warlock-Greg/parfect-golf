// =========================================================
//   Parfect — Scoring PRO (Triangle, Lag, Plan, Rotation, Finish)
// =========================================================

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  if (!a || !b) return 999;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function angleBetweenSegments(A, B, C, D) {
  if (!A || !B || !C || !D) return 0;
  const v1 = { x: B.x - A.x, y: B.y - A.y };
  const v2 = { x: D.x - C.x, y: D.y - C.y };
  const dot = (v1.x*v2.x + v1.y*v2.y);
  const m1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
  const m2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
  const div = m1*m2;
  if (!div) return 0;
  return Math.acos(clamp(dot / div, -1, 1)) * 180 / Math.PI;
}

// ---------------- TRIANGLE ----------------

function computeTriangleMetrics(pose) {
  const LS = pose[11], RS = pose[12];
  const LH = pose[15], RH = pose[16];
  if (!LS || !RS || !LH || !RH) return null;

  const shoulderWidth = dist(LS, RS);

  const mid = { x:(LS.x+RS.x)/2, y:(LS.y+RS.y)/2 };
  const handDist = (dist(LH, mid) + dist(RH, mid)) / 2;

  const angle = angleBetweenSegments(LS, RS, LH, RH);

  return { shoulderWidth, handDist, angle };
}

function scoreTriangle(tri) {
  if (!tri) return 20;
  const s = 1 - Math.abs(tri.shoulderWidth - 0.25) / 0.25;
  const h = 1 - Math.abs(tri.handDist - 0.18) / 0.18;
  const a = 1 - Math.abs(tri.angle - 25) / 25;
  return Math.round(clamp((s+h+a)/3, 0, 1) * 20);
}

// ---------------- LAG ----------------

function scoreLag(pose) {
  const wrist = pose[15], elbow = pose[13];
  if (!wrist || !elbow) return 15;
  const dy = elbow.y - wrist.y;
  return Math.round(clamp((dy - 0.01)/0.1, 0, 1) * 15);
}

// ---------------- PLANE ----------------

function scorePlane(pose) {
  const wrist = pose[15], shoulder = pose[11];
  if (!wrist || !shoulder) return 15;
  const angle = Math.atan2(wrist.y - shoulder.y, wrist.x - shoulder.x)*180/Math.PI;
  return Math.round(clamp(1 - Math.abs(angle - 35)/25, 0, 1) * 15);
}

// ---------------- ROTATION ----------------

function scoreRotation(pose) {
  const LS = pose[11], RS = pose[12];
  const LH = pose[23], RH = pose[24];
  if (!LS || !RS || !LH || !RH) return 15;

  const shoulderTilt = angleBetweenSegments(LS, RS, {x:LS.x,y:LS.y-0.1}, LS);
  const hipTilt      = angleBetweenSegments(LH, RH, {x:LH.x,y:LH.y-0.1}, LH);

  const diff = Math.abs(shoulderTilt - hipTilt);
  return Math.round(clamp(1 - diff/25, 0, 1) * 15);
}

// ---------------- FINISH ----------------

function scoreFinish(pose) {
  const LS = pose[11], RS = pose[12];
  if (!LS || !RS) return 15;
  const tilt = Math.abs(LS.x - RS.x);
  return Math.round(clamp(1 - tilt/0.25, 0, 1) * 15);
}

// ---------------- SCORE FINAL ----------------

function computeSwingScore(mode, pose, ctx) {

  const lastFrame = ctx.framesApresImpact?.[0]?.pose || pose;

  const tri = computeTriangleMetrics(lastFrame);

  const triangleScore = scoreTriangle(tri);
  const lagScore      = scoreLag(lastFrame);
  const planeScore    = scorePlane(lastFrame);
  const rotationScore = scoreRotation(lastFrame);
  const finishScore   = scoreFinish(lastFrame);

  return {
    total: triangleScore + lagScore + planeScore + rotationScore + finishScore,
    triangleScore,
    lagScore,
    planeScore,
    rotationScore,
    finishScore
  };
}

