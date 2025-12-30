// ==========================================================
// FaceOnAnalyzer — V1
// Produit : FaceOnResult (tolérances + zones)
// Dépendances : swing, reference
// ==========================================================

function computeFaceOnResult(swing, reference) {

  // -------------------------------------------------------
  // 0) Guards
  // -------------------------------------------------------
  if (!swing || !reference) {
    return { isViewValid: false };
  }

  const view = (window.jswViewType || "faceOn").toLowerCase();
  if (!view.includes("face")) {
    return { isViewValid: false };
  }

  const frames = swing.frames || [];
  const T = swing.timestamps || [];
  const kf = swing.keyFrames || {};

  if (!kf.address || !kf.top || !kf.impact) {
    return { isViewValid: false };
  }

  // -------------------------------------------------------
  // 1) Keyframe indices
  // -------------------------------------------------------
  const iAddr = kf.address.index;
  const iTop = kf.top.index;
  const iImpact = kf.impact.index;

  if (
    iAddr == null || iTop == null || iImpact == null ||
    !T[iAddr] || !T[iTop] || !T[iImpact]
  ) {
    return { isViewValid: false };
  }

  // -------------------------------------------------------
  // 2) Tempo & Ratio
  // -------------------------------------------------------
  const tempoMs = T[iImpact] - T[iAddr];
  const backswingMs = T[iTop] - T[iAddr];
  const downswingMs = T[iImpact] - T[iTop];
  const ratio = downswingMs > 0 ? backswingMs / downswingMs : null;

  const refTempo = reference.tempo?.tempoMs ?? tempoMs;
  const tempoTol = Math.max(60, Math.min(120, refTempo * 0.08));

  const tempoStatus = zoneStatus(
    Math.abs(tempoMs - refTempo),
    tempoTol
  );

  const refRatio = reference.tempo?.ratio ?? 3.0;
  const ratioTol = refRatio < 2 ? 0.2 : 0.25;

  const ratioStatus = zoneStatus(
    Math.abs(ratio - refRatio),
    ratioTol
  );

  // -------------------------------------------------------
  // 3) Sequence bas → haut
  // -------------------------------------------------------
  const seqRef = reference.sequence || {};

  const seqCurr = {
    d1: (kf.shouldersStart?.time ?? kf.top.index) -
        (kf.hipsStart?.time ?? kf.address.index),
    d2: (kf.handsStart?.time ?? kf.impact.index) -
        (kf.shouldersStart?.time ?? kf.top.index),
  };

  let sequenceStatus = "IN";

  if (seqRef.d1 != null && seqRef.d2 != null) {
    const d1Out = Math.abs(seqCurr.d1 - seqRef.d1) > 40;
    const d2Out = Math.abs(seqCurr.d2 - seqRef.d2) > 50;

    if (d1Out || d2Out) sequenceStatus = "OUT";
    else if (
      Math.abs(seqCurr.d1 - seqRef.d1) > 24 ||
      Math.abs(seqCurr.d2 - seqRef.d2) > 30
    ) sequenceStatus = "EDGE";
  }

  // -------------------------------------------------------
  // 4) Impact timing (normalisé)
  // -------------------------------------------------------
  const impactPct = tempoMs > 0 ? tempoMs / tempoMs : 0;
  const refImpactPct = reference.impact?.pct ?? impactPct;

  const impactStatus = zoneStatus(
    Math.abs(impactPct - refImpactPct),
    0.03
  );

  // -------------------------------------------------------
  // 5) Stability (centre hanches)
  // -------------------------------------------------------
  const centerXs = frames.map(f => {
    const lh = f?.[23], rh = f?.[24];
    return lh && rh ? (lh.x + rh.x) / 2 : null;
  }).filter(v => v != null);

  const centerYs = frames.map(f => {
    const lh = f?.[23], rh = f?.[24];
    return lh && rh ? (lh.y + rh.y) / 2 : null;
  }).filter(v => v != null);

  const driftX = Math.max(...centerXs) - Math.min(...centerXs);
  const driftY = Math.max(...centerYs) - Math.min(...centerYs);

  const stabilityStatus =
    driftX <= 0.03 && driftY <= 0.02
      ? "IN"
      : driftX <= 0.05 && driftY <= 0.03
        ? "EDGE"
        : "OUT";

  // -------------------------------------------------------
  // 6) Score
  // -------------------------------------------------------
  const points = {
    IN: 1,
    EDGE: 0.6,
    OUT: 0
  };

  const metrics = {
    tempo: tempoStatus,
    ratio: ratioStatus,
    sequence: sequenceStatus,
    impact: impactStatus,
    stability: stabilityStatus
  };

  const score =
    (points[metrics.tempo] +
     points[metrics.ratio] +
     points[metrics.sequence] +
     points[metrics.impact] +
     points[metrics.stability]) / 5;

  return {
    isViewValid: true,
    metrics,
    score20: Math.round(score * 20),
    raw: {
      tempoMs,
      ratio,
      driftX,
      driftY
    }
  };
}

// ---------------------------------------------------------
// Helper
// ---------------------------------------------------------
function zoneStatus(delta, tol) {
  if (delta <= tol * 0.6) return "IN";
  if (delta <= tol) return "EDGE";
  return "OUT";
}


window.computeFaceOnResult = computeFaceOnResult;

