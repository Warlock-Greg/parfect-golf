// === Coach Greg - Parfect.golfr ===
// Mindset > Swing — la tête, pas la force 💚

const tones = {
  fun: (msg) => msg,
  zen: (msg) => `🧘 ${msg}`,
  tough: (msg) => `🔥 ${msg}`,
};

// === MESSAGES ===
const baseTips = [
  "Anywhere on the green + two putts... that’s Parfect golf.",
  "À swing égal, prends du plaisir.",
  "Sois malin, vise le centre du green.",
  "Smart golf, easy target, tempo doux.",
  "Enjoy ton moment, pas ton score.",
];

const parfectTips = [
  "💚 Parfect baby! Fairway + GIR + ≤2 putts. Smart golf.",
  "🔥 That’s a Parfect shot — simple, clean, efficace.",
  "Bro, that’s mental gold. FW + GIR + calm putting.",
  "💎 Pure Parfect. Routine, calme, flow.",
];

const bogeyfectTips = [
  "💙 Bogey’fect — stratégie parfaite, patience et contrôle.",
  "💙 Smart bogey bro — tu joues le parcours, pas le hasard.",
  "💙 That’s mental golf — tu as accepté, joué, réussi.",
  "💙 Be strategy, not power. Bogey’fect validé.",
  "💙 Calm, fairway, deux putts — that's a pro move.",
];

const missTips = [
  "Next hole, new mindset.",
  "Tu peux rater ton swing, pas ton mental.",
  "Reset. Respire. Easy up & down next time.",
  "Forget le coup, garde la routine.",
];

const routineTips = [
  "⏱️ Routine first — tu peux rater un coup, pas ta routine.",
  "T’as zappé la routine bro ? Même les pros la font chaque fois.",
  "Stay dans ta bulle. Routine, focus, swing.",
];

const girTips = [
  "GIR! Keep targeting large. C’est le chemin du Parfect.",
  "Tu touches plus de greens, nice trend.",
  "Smart shot, ça paye mentalement.",
];

const puttingTips = [
  "Good pace, bro. 2 putts = Parfect.",
  "Tempo, rythme, distance — putting zen.",
  "Trust ton stroke, laisse rouler.",
];

// === OUTIL RANDOM ===
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Analyse du trou et renvoie un message coach.
 * @param {object} h - { score, par, putts, fairway, gir, routine }
 * @param {string} tone - fun | zen | tough
 */
export function tipAfterHole(h, tone = "fun") {
  if (!h) return tones[tone](pick(baseTips));

  // ROUTINE
  if (h && !h.routine) return tones[tone](pick(routineTips));

  // PARFECT
  if (h && h.fairway && h.gir && h.putts <= 2 && h.score - h.par === 0)
    return tones[tone](pick(parfectTips));

  // BOGEY’FECT
  if (
    h &&
    h.fairway &&
    !h.gir &&
    h.putts <= 2 &&
    h.score - h.par === 1
  )
    return tones[tone](pick(bogeyfectTips));

  // GIR OU PUTTING
  if (h && h.gir) return tones[tone](pick(girTips));
  if (h && h.putts <= 2) return tones[tone](pick(puttingTips));

  // DEFAULT
  return tones[tone](pick([...missTips, ...baseTips]));
}

/**
 * Résumé de partie
 */
export function coachSummary(summary) {
  const { parfectCount, routineCount, totalHoles } = summary;
  const routinePct = Math.round((routineCount / totalHoles) * 100);
  if (parfectCount >= 4)
    return `🔥 ${parfectCount} Parfects — smart golf mindset.`;
  if (routinePct >= 90)
    return `🧘 Routine master — ${routinePct}% constance.`;
  return `😉 ${parfectCount} Parfects / ${routinePct}% routine. Build petit à petit.`;
}

/**
 * Entraînement
 */
export function tipAfterPractice(type, tone = "fun") {
  let msg = "Nice training bro! À swing égal, prends du plaisir.";
  if (/putt/i.test(type))
    msg = pick([
      "Putting vibes — roll it smooth, feel the pace.",
      "Trust ton stroke, feel the tempo.",
      "Calm hands, steady mind. Easy putt bro.",
    ]);
  if (/driver/i.test(type))
    msg = pick([
      "Driver mode — cible large, full balance.",
      "Big stick, petit stress. Smooth swing only.",
      "Smash tempo, not force.",
    ]);
  if (/chip|approch/i.test(type))
    msg = pick([
      "Chip zone — land spot clear, easy tempo.",
      "Petit coup, grande intention.",
      "Vision, spin, calme — short game magic.",
    ]);
  return tones[tone](msg);
}
