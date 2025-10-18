// === Parfect.golfr - coach.js ===
// Gestion des tips et messages du coach

console.log("🎙️ coach.js chargé");

// ---- Tips après un trou ----
window.tipAfterHole = function(entry, style = "fun") {
  if (!entry) return "Continue tranquille 💚";

  const diff = entry.score - entry.par;
  const { fairway, gir, putts } = entry;

  // 💚 Parfect
  if (fairway && gir && putts <= 2 && diff === 0) {
    return "💚 Parfect ! Routine et stratégie top niveau.";
  }

  // 💙 Bogey'fect
  if (fairway && !gir && putts <= 2 && diff === 1) {
    return "💙 Bogey’fect ! Solide routine, juste un coup de fer à affiner.";
  }

  // 😅 Double / Triple
  if (diff >= 2) {
    return "😅 Ce n’est pas grave, garde ton calme et focus routine. Le golf, c’est une aventure.";
  }

  // 🔥 Birdie / Eagle
  if (diff < 0) {
    return "🔥 Birdie ! Smart golf, cool mindset — tu montes en puissance !";
  }

  // 🧘‍♂️ Par normal
  return "Par tranquille. Respire, aligne-toi, et continue sur ce rythme 💚";
};

// ---- Tips après un entraînement ----
window.tipAfterPractice = function(type, style = "fun") {
  const baseTips = {
    putting: [
      "🎯 Vise petit pour taper juste. Le putting, c’est 80% de confiance.",
      "🧘 Respire et relâche les mains, le putt parfait est simple.",
    ],
    chipping: [
      "⛳ Focus contact, pas puissance.",
      "💡 Visualise la roule avant le swing.",
    ],
    driving: [
      "💪 Drive sans forcer, laisse la rotation faire le boulot.",
      "🎯 Un drive sûr vaut mieux qu’un drive long.",
    ],
    irons: [
      "🧩 Frappe au centre, swing compact.",
      "📐 Plaisir du contact pur, pas de la puissance brute.",
    ],
    mental: [
      "🧠 Respire, visualise, exécute.",
      "💫 Routine + intention = mindset gagnant.",
    ],
  };

  const tips = baseTips[type] || ["Sois constant, un coup à la fois 💚"];
  const random = tips[Math.floor(Math.random() * tips.length)];
  return random;
};
