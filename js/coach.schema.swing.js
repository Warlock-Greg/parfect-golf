function pickKeyframePose(swing, name) {
  return (
    swing?.keyFrames?.[name]?.pose ||
    swing?.keyframes?.[name]?.pose ||
    null
  );
}

window.buildSwingCoachContext = function ({ swing, scores } = {}) {
  const safeSwing = swing || {};
  const safeScores = scores || {};

  const club =
    safeSwing?.club ||
    window.currentClubType ||
    document.getElementById("jsw-club-select")?.value ||
    "fer7";

  const view =
    safeSwing?.view ||
    window.jswViewType ||
    document.getElementById("jsw-camera-select")?.value ||
    "faceOn";

  const landmarks =
    typeof window.jswBuildLandmarksJSON === "function"
      ? window.jswBuildLandmarksJSON(safeSwing)
      : null;

  return {
    mode: "swing_analysis",
    player_context: {
      email: window.userLicence?.email || null,
      language: window.PARFECT_LANG || "fr",
      licence: window.userLicence?.licence || null
    },
    swing_context: {
      club,
      view,
      fps: safeSwing?.fps || 30,
      captured_at: new Date().toISOString(),
      frames_count: Array.isArray(safeSwing?.frames) ? safeSwing.frames.length : 0
    },
    analysis_context: {
      total: safeScores?.total ?? 0,
      totalDynamic: safeScores?.totalDynamic ?? null,
      totals: safeScores?.totals || {},
      score_map: safeScores?.scores || {},
      breakdown: safeScores?.breakdown || {},
      metrics: safeScores?.metrics || {}
    },
    landmarks_context: {
      address: pickKeyframePose(swing, "address"),
      top: pickKeyframePose(swing, "top"),
      impact: pickKeyframePose(swing, "impact"),
      finish: pickKeyframePose(swing, "finish")
    },

    raw_context: {
      keyFrames: swing?.keyFrames || swing?.keyframes || {}
    }
  };
};

console.log("✅ coach.schema.swing chargé");
