export function buildRoundCoachContext({
  hole = {},
  scoreState = {},
  nextShot = {},
  mentalState = {},
  recentEvents = []
}) {
  return {
    mode: "round_support",
    player_context: {
      email: window.userLicence?.email || null,
      language: window.PARFECT_LANG || "fr"
    },
    round_context: {
      hole_number: hole.number || null,
      par: hole.par || null,
      score_to_par: scoreState.scoreToPar || null,
      last_hole_score: scoreState.lastHoleScore || null,
      current_streak: scoreState.streak || null,
      next_shot_type: nextShot.type || null
    },
    emotional_context: {
      mental_state: mentalState.state || "unknown",
      confidence: mentalState.confidence ?? null,
      calm: mentalState.calm ?? null,
      frustration: mentalState.frustration ?? null,
      trigger: mentalState.trigger || null
    },
    performance_context: {
      fairways_hit: scoreState.fairwaysHit ?? null,
      gir: scoreState.gir ?? null,
      putts: scoreState.putts ?? null
    },
    recent_events: recentEvents.slice(-5)
  };
}
