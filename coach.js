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

export function tipAfterPractice(type, tone = "fun") {
  let msg = "Nice training bro! À swing égal, prends du plaisir.";
  if (/putt/i.test(type)) msg = "Putting vibes — roll it smooth, feel the pace.";
  if (/driver/i.test(type)) msg = "Driver mode — cible large, full balance.";
  if (/chip|approch/i.test(type)) msg = "Chip zone — land spot clear, easy tempo.";
  return tones[tone](msg);
}
