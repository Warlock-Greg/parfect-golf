// === Coach Greg - Parfect.golfr ===
// Le coach parle franglais : mindset > swing.
// Il commente la routine, les Parfects et le plaisir de jouer.

const tones = {
  fun: (msg) => msg,
  zen: (msg) => `🧘 ${msg}`,
  tough: (msg) => `🔥 ${msg}`,
};

// Liste de messages aléatoires selon le contexte
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
];

const missTips = [
  "Next hole, new mindset.",
  "Tu peux rater ton swing, pas ton mental.",
  "Reset. Respire. Easy up & down next time.",
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

// Fonction utilitaire pour choisir un message aléatoire
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
  // Routine oubliée
  if (h && !h.routine) {
    return tones[tone](pick(routineTips));
  }

  // Parfect : par + fairway + GIR + 2 putts ou moins
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

  // Coup manqué
  return tones[tone](pick([...missTips, ...baseTips]));
}

// === Coach Post-Round (résumé) ===
export function coachSummary(summary) {
  const { parfectCount, routineCount, totalHoles } = summary;
  const routinePct = Math.round((routineCount / totalHoles) * 100);
  let msg = "";

  if (parfectCount >= 4) {
    msg = `🔥 ${parfectCount} Parfects today. Tu joues smart, mental first.`;
  } else if (routinePct >= 90) {
    msg = `🧘 Routine master — ${routinePct}% de constance. Tu peux rater un coup, pas ta routine.`;
  } else {
    msg = `😉 ${parfectCount} Parfects / ${routinePct}% routine — build ton mindset petit à petit.`;
  }

  return msg;
}
