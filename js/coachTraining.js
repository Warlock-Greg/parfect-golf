// js/coachTraining.js
export function showTrainingCoachFeedback({ drillName, series, hits, avgScore, focus }) {
  const coachKey = window.currentCoach || localStorage.getItem("coach") || "greg";

  const coaches = {
    greg: { name: "Greg", avatar: "😎", color: "#00ff99" },
    goathier: { name: "Goathier", avatar: "🧠", color: "#4db8ff" },
    dorothee: { name: "Dorothée", avatar: "💫", color: "#ff99cc" },
  };
  const coach = coaches[coachKey] || coaches.greg;

  // Nettoie les anciens toasts
  document.querySelectorAll(".coach-training-toast").forEach((t) => t.remove());

  // === Message dynamique ===
  const message = generateFeedbackMessage(drillName, hits, avgScore, focus, coachKey);

  // === Création du conteneur ===
  const toast = document.createElement("div");
  toast.className = "coach-training-toast";
  toast.innerHTML = `
    <div class="coach-training-avatar" style="background:${coach.color}33">${coach.avatar}</div>
    <div class="coach-training-text">
      <strong>${coach.name}</strong> dit :<br>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(toast);

  // Animation d’apparition
  setTimeout(() => toast.classList.add("visible"), 10);

  // Synthèse vocale (facultative)
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(message);
      utter.lang = "fr-FR";
      utter.rate = 1.0;
      utter.pitch = coachKey === "dorothee" ? 1.2 : coachKey === "goathier" ? 0.9 : 1.0;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("Voix désactivée :", e);
    }
  }

  // Auto-disparition
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 500);
  }, 8000);
}

function generateFeedbackMessage(drillName, hits, avgScore, focus, coachKey) {
  const ratio = hits ? Math.round((hits / 10) * 100) : 0;

  if (focus === "putting") {
    if (ratio > 80) return "💚 Putting chirurgical ! Continue comme ça.";
    if (ratio > 60) return "🎯 Bon dosage, encore un peu de constance.";
    return "⛳ Trop de dispersion, respire et visualise ton putt.";
  }
  if (focus === "chipping") {
    if (ratio > 80) return "✨ Tes approches sont précises, super rythme.";
    if (ratio > 60) return "⚖️ Bon contrôle de distance, reste fluide.";
    return "💥 Trop fort ou trop court ? Allège ton grip et laisse rouler.";
  }
  if (focus === "driving") {
    if (ratio > 80) return "🚀 Tes drives sont solides, tempo parfait !";
    if (ratio > 60) return "💪 Bons contacts, vise plus de régularité.";
    return "🎯 Reste calme à l’impact, la puissance viendra du rythme.";
  }
  if (focus === "irons") {
    if (ratio > 80) return "🧲 Contact propre, très belle régularité.";
    if (ratio > 60) return "🎯 Solide ! Encore un peu d’équilibre à la finition.";
    return "⚒️ Ne force pas le coup, cherche la précision.";
  }
  if (focus === "mental") {
    if (ratio > 80) return "🧘‍♂️ Esprit calme et focus — mindset champion.";
    if (ratio > 60) return "💫 Bon rythme, continue à respirer entre les coups.";
    return "🧠 Recentre-toi, oublie le résultat et pense routine.";
  }

  return "💚 Garde le flow, la progression est en route.";
}
