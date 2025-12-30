export function coachFromRules(ctx) {
  const tips = [];

  if (ctx.scores.weightShift <= 5) tips.push("Travaille un transfert simple : backswing stable puis pression vers l’avant à l’impact.");
  if (ctx.scores.tempo <= 5) tips.push("Ton tempo est extrême : ralentis la montée, puis accélère seulement après le top.");
  if (ctx.scores.balance <= 7) tips.push("Finish : garde la tête au-dessus des hanches, tiens 1 seconde.");

  if (!tips.length) tips.push("Bon swing. Pour progresser : vise la répétabilité (mêmes sensations, mêmes repères).");

  return {
    title: "Coach",
    bullets: tips.slice(0, 3)
  };
}
