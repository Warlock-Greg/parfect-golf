window.buildTrainingCoachContext = function ({
  objective = "SKIP",
  trainingType = "swing",
  recentSwings = [],
  selfReport = {}
} = {}) {
  return {
    mode: "training_session",
    player_context: {
      email: window.userLicence?.email || null,
      language: window.PARFECT_LANG || "fr",
      licence: window.userLicence?.licence || null
    },
    training_context: {
      objective,
      training_type: trainingType,
      session_phase: "active",
      repetitions_done: Array.isArray(recentSwings) ? recentSwings.length : 0,
      environment: "home"
    },
    recent_performance: {
      swings: Array.isArray(recentSwings) ? recentSwings.slice(-5) : [],
      average_total: computeTrainingAverage(recentSwings),
      weak_metric: detectTrainingWeakMetric(recentSwings)
    },
    self_report: {
      energy: selfReport?.energy ?? null,
      calm: selfReport?.calm ?? null,
      confidence: selfReport?.confidence ?? null
    }
  };
};

function computeTrainingAverage(swings) {
  const values = (Array.isArray(swings) ? swings : [])
    .map((s) => s?.total ?? s?.scores?.total ?? null)
    .filter((v) => typeof v === "number" && Number.isFinite(v));

  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function detectTrainingWeakMetric(swings) {
  const keys = ["rotation", "tempo", "triangle", "weightShift", "extension", "balance"];
  const safeSwings = Array.isArray(swings) ? swings : [];

  const sums = Object.fromEntries(keys.map((k) => [k, 0]));
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));

  safeSwings.forEach((s) => {
    const breakdown = s?.breakdown || s?.scores?.breakdown || {};
    keys.forEach((k) => {
      const value = breakdown?.[k]?.score;
      if (typeof value === "number" && Number.isFinite(value)) {
        sums[k] += value;
        counts[k] += 1;
      }
    });
  });

  let weakest = "tempo";
  let minAvg = Infinity;

  keys.forEach((k) => {
    if (!counts[k]) return;
    const avg = sums[k] / counts[k];
    if (avg < minAvg) {
      minAvg = avg;
      weakest = k;
    }
  });

  return weakest;
}

console.log("✅ coach.schema.training chargé");
