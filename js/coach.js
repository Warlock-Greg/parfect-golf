const tones = {
  fun: (m) => `🔥 ${m}`,
  taquin: (m) => `😉 ${m}`,
  focus: (m) => m
};

const mindset = [
  "À swing égal, prends du plaisir. Tempo smooth, enjoy the ride.",
  "Anywhere on the green + two putts = life is good.",
  "Plan simple > coup parfait. Trust ton swing.",
  "Balle posée, rythme fluide, finish haut, smile inside.",
  "Focus sur la cible, pas sur la technique. Easy golf, easy joy."
];

// À ajouter dans tes messages (existant)
const routineTips = [
  "Routine first. Tu peux rater un coup, pas ta routine.",
  "Respire, cible large, un swing, une intention.",
];





function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

export function tipAfterHole(h, tone = "fun") {
  if (!h) return null;
  let msg;
  if (h.putts >= 3) msg = "3-putt ? Breathe. Pace > Power. Next one tap-in.";
  else if (!h.fairway && !h.gir) msg = "No FW, no GIR ? Chill, simple target next time.";
  else if (!h.fairway) msg = "FW manqué ? Vise large, tempo 7/10.";
  else if (!h.gir) msg = "Pas de GIR ? Middle green, deux putts, c’est du golf smart.";
  else msg = pick(mindset);
  return tones[tone](msg);
}
{
  // ... ton code existant
  if (h && h.fairway && h.gir && (h.putts<=2)){
    return tones[tone]("💚 Parfect baby — FW + GIR + ≤2 putts. Smart golf.");
  }
  if (h && !h.routine){
    return tones[tone]("⏱️ Routine zappée. Même les pros ne la sautent jamais.");
  }
  // ...
}

