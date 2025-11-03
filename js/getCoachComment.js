// === getCoachComment.js - Parfect.golfr MVP+ ===
// Lecture dynamique de coach-comments.json + gestion de contexte & anti-répétition

let coachDataCache = null;

// --- Charge le fichier JSON une seule fois ---
async function loadCoachData() {
  if (coachDataCache) return coachDataCache;
  try {
    const res = await fetch("./data/coach-comments.json");
    coachDataCache = await res.json();
    return coachDataCache;
  } catch (err) {
    console.error("❌ Erreur chargement coach-comments.json :", err);
    return {};
  }
}

// --- Récupère un commentaire selon le coach et le contexte ---
async function getCoachComment(coachName = "Greg", context = "motivation") {
  const data = await loadCoachData();
  const coach = data[coachName];
  if (!coach) {
    console.warn(`⚠️ Coach "${coachName}" introuvable`);
    return "⛳ Continue ton flow, un coup après l'autre.";
  }

  const phrases = coach[context];
  if (!phrases || phrases.length === 0) {
    console.warn(`⚠️ Aucun commentaire pour ${coachName} / ${context}`);
    return "💬 Respire, souris, et passe au coup suivant.";
  }

  // Anti-répétition (mémorise la dernière phrase par coach/contexte)
  const key = `${coachName}_${context}_last`;
  const last = localStorage.getItem(key);
  let available = phrases.filter(p => p !== last);
  if (available.length === 0) available = phrases; // tout si tout identique

  const phrase = available[Math.floor(Math.random() * available.length)];
  localStorage.setItem(key, phrase);

  return phrase;
}

// --- Utilitaire global pour le MVP ---
async function coachRespondToAction(context) {
  const coach = localStorage.getItem("coach") || "Greg";
  const comment = await getCoachComment(coach, context);
  showCoachIA?.(`💬 ${coach} : ${comment}`);
  return comment;
}

// --- Exports globaux ---
window.getCoachComment = getCoachComment;
window.coachRespondToAction = coachRespondToAction;

console.log("✅ getCoachComment prêt — Parfect.golfr MVP+");
