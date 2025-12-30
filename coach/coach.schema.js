export function buildCoachContext({ swing, scores, refMode, userNorm, systemRef }) {
  return {
    meta: {
      club: swing.club,
      view: scores.metrics?.viewType,
      refMode, // "self" | "system"
    },
    routine: swing.routine || null,
    scores: {
      total: scores.total,
      rotation: scores.rotationScore,
      triangle: scores.triangleScore,
      weightShift: scores.weightShiftScore,
      extension: scores.extensionScore,
      tempo: scores.tempoScore,
      balance: scores.balanceScore,
    },
    metrics: scores.metrics || {},
    baselines: {
      userNorm: userNorm || null,
      systemRef: systemRef || null,
    }
  };
}
