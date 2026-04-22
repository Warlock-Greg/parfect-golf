// =====================================================
// Coach Schema — Round context builder
// Compatible Play.js / round_support
// =====================================================

window.buildRoundCoachContext = function ({
  hole = {},
  scoreState = {},
  nextShot = {},
  mentalState = {},
  recentEvents = []
} = {}) {
  return {
    mode: "round_support",

    player_context: {
      email: window.userLicence?.email || null,
      language: window.PARFECT_LANG || "fr",
      licence: window.userLicence?.licence || null
    },

    round_context: {
      hole_number: hole?.number || null,
      par: hole?.par || null,
      score_to_par: scoreState?.scoreToPar || null,
      total_score: scoreState?.totalScore ?? null,
      total_vs_par: scoreState?.totalVsPar ?? null,
      last_hole_score: scoreState?.lastHoleScore || null,
      current_streak: scoreState?.streak || null,
      next_shot_type: nextShot?.type || null
    },

    emotional_context: {
      mental_state: mentalState?.state || "unknown",
      confidence: toSafeNumber(mentalState?.confidence),
      calm: toSafeNumber(mentalState?.calm),
      frustration: toSafeNumber(mentalState?.frustration),
      trigger: mentalState?.trigger || "manual"
    },

    performance_context: {
      fairways_hit: toSafeNumber(scoreState?.fairwaysHit),
      gir: toSafeNumber(scoreState?.gir),
      putts: toSafeNumber(scoreState?.putts)
    },

    round_profile: {
      mood: (localStorage.getItem("mood") || "focus").toLowerCase(),
      strategy: (localStorage.getItem("strategy") || "mindset").toLowerCase(),
      coach: (localStorage.getItem("coach") || "dorothee").toLowerCase()
    },

    recent_events: Array.isArray(recentEvents) ? recentEvents.slice(-8) : []
  };
};

function toSafeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

console.log("✅ coach.schema.round chargé");
