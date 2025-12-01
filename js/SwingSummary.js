// === SwingSummary.js ===
export function buildSwingSummary(scoreDetails, club) {
  const { total, lag, shift, posture, triangle } = scoreDetails;

  function level(score) {
    if (score >= 80) return "excellent";
    if (score >= 60) return "bon";
    if (score >= 40) return "moyen";
    return "faible";
  }

  const messages = [];

  // Lag
  messages.push(`⏱️ Retard (lag) : ${Math.round(lag)}/100 – ${level(lag)}.`);

  // Shift
  messages.push(`⚖️ Reprise d’appui : ${Math.round(shift)}/100 – ${level(shift)}.`);

  // Posture
  messages.push(`📐 Verticalité au retour : ${Math.round(posture)}/100 – ${level(posture)}.`);

  // Triangle
  messages.push(`🔺 Triangle bras-épaules : ${Math.round(triangle)}/100 – ${level(triangle)}.`);

  // Commentaire global simple
  let globalComment = "";
  if (total >= 80) {
    globalComment = "Swing très solide pour ce club, continue sur cette base 💪";
  } else if (total >= 60) {
    globalComment = "Bonne base, quelques points à affiner pour plus de régularité 👍";
  } else {
    globalComment = "Gros potentiel, mais la mécanique est encore instable – cible 1 ou 2 axes en priorité 🎯";
  }

  return {
    club,
    total,
    metrics: { lag, shift, posture, triangle },
    messages,
    globalComment,
  };
}
