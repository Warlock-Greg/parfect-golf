export function buildSwingCoachContext({ swing, scores }) {
  return {
    mode: "swing_analysis",
    player_context: {
      email: window.userLicence?.email || null,
      language: window.PARFECT_LANG || "fr"
    },
    swing_context: {
      club: swing?.club || "fer7",
      view: swing?.view || window.jswViewType || "faceOn",
      fps: swing?.fps || 30,
      captured_at: new Date().toISOString()
    },
    analysis_context: {
      total: scores?.total || 0,
      totals: scores?.totals || {},
      breakdown: scores?.breakdown || {},
      metrics: scores?.metrics || {}
    },
    landmarks: window.jswBuildLandmarksJSON?.(swing) || null,
    references: {
      user: window.userReference || null,
      system: window.systemReference || null
    }
  };
}
