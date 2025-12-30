export function computePlayerNorm(swings) {
  const best = swings
    .filter(s => s.is_valid)
    .sort((a,b)=>b.scores.totalDynamic - a.scores.totalDynamic)
    .slice(0,8);

  const avg = (path) =>
    best.reduce((sum,s)=>sum+(path(s)||0),0)/best.length;

  return {
    rotation: {
      shoulder: avg(s=>s.metrics.rotation?.measure?.shoulder),
      hip: avg(s=>s.metrics.rotation?.measure?.hip),
      xFactor: avg(s=>s.metrics.rotation?.measure?.xFactor)
    },
    tempo: {
      ratio: avg(s=>s.metrics.tempo?.ratio)
    },
    triangle: {
      varTop: avg(s=>s.metrics.triangle?.varTopPct)
    }
  };
}
