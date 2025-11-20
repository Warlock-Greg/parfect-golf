// === swingMetrics.js ===
// Utilitaires pour analyser une pose MediaPipe (landmarks)

(function (global) {
  const L = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
  };

  function getP(lm, idx) {
    if (!lm || !lm[idx]) return null;
    return { x: lm[idx].x, y: lm[idx].y, z: lm[idx].z ?? 0 };
  }

  function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0);
  }

  function norm(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0));
  }

  function angleBetween(a, b) {
    const na = norm(a);
    const nb = norm(b);
    if (!na || !nb) return null;
    const c = dot(a, b) / (na * nb);
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  }

  function computeShoulderLineAngle(lm) {
    const ls = getP(lm, L.LEFT_SHOULDER);
    const rs = getP(lm, L.RIGHT_SHOULDER);
    if (!ls || !rs) return null;
    const dy = rs.y - ls.y;
    const dx = rs.x - ls.x;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  function computeHipLineAngle(lm) {
    const lh = getP(lm, L.LEFT_HIP);
    const rh = getP(lm, L.RIGHT_HIP);
    if (!lh || !rh) return null;
    const dy = rh.y - lh.y;
    const dx = rh.x - lh.x;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  function midPoint(lm, i1, i2) {
    const p1 = getP(lm, i1);
    const p2 = getP(lm, i2);
    if (!p1 || !p2) return null;
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, z: (p1.z + p2.z) / 2 };
  }

  function computeSpineTilt(lm) {
    const s = midPoint(lm, L.LEFT_SHOULDER, L.RIGHT_SHOULDER);
    const h = midPoint(lm, L.LEFT_HIP, L.RIGHT_HIP);
    if (!s || !h) return null;
    const v = sub(s, h);
    return angleBetween(v, { x: 0, y: 1, z: 0 });
  }

  function computeHandForward(lm) {
    const midHip = midPoint(lm, L.LEFT_HIP, L.RIGHT_HIP);
    const lw = getP(lm, L.LEFT_WRIST);
    const rw = getP(lm, L.RIGHT_WRIST);
    if (!midHip || !lw || !rw) return null;

    const midWrist = { x: (lw.x + rw.x) / 2, y: (lw.y + rw.y) / 2, z: (lw.z + rw.z) / 2 };

    return (midHip.x - midWrist.x) * 100;
  }

  function computeCenterOfMass(lm) {
    const idx = [
      L.LEFT_HIP,
      L.RIGHT_HIP,
      L.LEFT_KNEE,
      L.RIGHT_KNEE,
      L.LEFT_ANKLE,
      L.RIGHT_ANKLE,
    ];
    const pts = idx.map((i) => getP(lm, i)).filter(Boolean);
    if (!pts.length) return null;
    let sx = 0,
      sy = 0;
    pts.forEach((p) => {
      sx += p.x;
      sy += p.y;
    });
    return { x: sx / pts.length, y: sy / pts.length };
  }

  function computeWeightLeftRight(lm) {
    const com = computeCenterOfMass(lm);
    const la = getP(lm, L.LEFT_ANKLE);
    const ra = getP(lm, L.RIGHT_ANKLE);
    if (!com || !la || !ra) return null;

    const v = sub(ra, la);
    const w = sub(com, la);
    const t = Math.max(0, Math.min(1, dot(v, w) / (norm(v) ** 2 || 1)));

    const proj = { x: la.x + v.x * t, y: la.y + v.y * t };

    const distTotal = norm(sub(ra, la)) || 1;
    const distToLeft = norm(sub(proj, la));
    const ratioLeft = 1 - distToLeft / distTotal;

    return { left: ratioLeft * 100, right: (1 - ratioLeft) * 100 };
  }

  global.SwingMetrics = {
    L,
    computeShoulderLineAngle,
    computeHipLineAngle,
    computeSpineTilt,
    computeHandForward,
    computeCenterOfMass,
    computeWeightLeftRight,
  };
})(window);
