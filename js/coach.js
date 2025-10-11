// === Coach Greg - Parfect.golfr ===
// Le coach parle franglais : mindset > swing.
// Il commente la routine, les Parfects et le plaisir de jouer.

const tones = {
  fun: (msg) => msg,
  zen: (msg) => `🧘 ${msg}`,
  tough: (msg) => `🔥 ${msg}`,
};

// === Messages par thèmes ===
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
  "💎 Pure Parfect. La routine, le calme, le flow.",
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

// === Utilitaire aléatoire ===
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Analyse du coup joué et renvoie un message coach.
 * @param {object} h - { putts, fairway, gir, routine }
 * @param {string} tone - fun | zen | tough
 * @returns {string|null}
 */
export function tipAfterHole(h, tone = "fun") {
  if (!h) return tones[tone](pick(baseTips));

  // Routine oubliée
  if (h && !h.routine) {
    return tones[tone](pick(routineTips));
  }

  // Parfect
  if (h && h.fairway && h.gir && h.putts <= 2) {
    return tones[tone](pick(parfectTips));
  }

  // Bon GIR
  if (h && h.gir) {
    return tones[tone](pick(girTips));
  }

  // Bon putting
  if (h && h.putts <= 2) {
    return tones[tone](pick(puttingTips));
  }

  // Sinon message neutre / motivant
  return tones[tone](pick([...missTips, ...baseTips]));
}

/**
 * Message de résumé après la partie
 */
export function coachSummary(summary) {
  const { parfectCount, routineCount, totalHoles } = summary;
  const routinePct = Math.round((routineCount / totalHoles) * 100);
  if (parfectCount >= 4) return `🔥 ${parfectCount} Parfects — smart golf mindset.`;
  if (routinePct >= 90) return `🧘 Routine master — ${routinePct}% constance.`;
  return `😉 ${parfectCount} Parfects / ${routinePct}% routine. Build petit à petit.`;
}

/**
 * Message d'encouragement pour un exercice d'entraînement
 */
export function tipAfterPractice(type, tone = "fun") {
  let msg = "Nice training bro! À swing égal, prends du plaisir.";
  if (/putt/i.test(type)) msg = pick([
    "Putting vibes — roll it smooth, feel the pace.",
    "Trust ton stroke, feel the tempo.",
    "Calm hands, steady mind. Easy putt bro."
  ]);
  if (/driver/i.test(type)) msg = pick([
    "Driver mode — cible large, full balance.",
    "Big stick, petit stress. Smooth swing only.",
    "Smash tempo, not force."
  ]);
  if (/chip|approch/i.test(type)) msg = pick([
    "Chip zone — land spot clear, easy tempo.",
    "Petit coup, grande intention.",
    "Vision, spin, calme — short game magic."
  ]);
  return tones[tone](msg);
}
