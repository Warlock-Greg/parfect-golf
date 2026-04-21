export function buildTrainingCoachContext({
  objective = "SKIP",
  trainingType = "swing",
  recentSwings = [],
  selfReport = {}
}) {
  return {
    mode: "training_session",
    player_context: {
      email: window.userLicence?.email || null,
      language: window.PARFECT_LANG || "fr"
    },
    training_context: {
      objective,
      training_type: trainingType,
      session_phase: "active",
      repetitions_done: recentSwings.length,
      environment: "home"
    },
    recent_performance: {
      swings: recentSwings.slice(-5),
      average_total: computeAvgTotal(recentSwings),
      weak_metric: detectWeakMetric(recentSwings)
    },
    self_report: selfReport
  };
}
