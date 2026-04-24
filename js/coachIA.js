// =====================================================
// Parfect.golfr — Coach IA V2
// - Compatible coach-zen.js
// - Entrée utilisateur : #coach-input / #coach-send
// - Sortie coach : coachReact() uniquement
// - Modes : SWING / MENTAL / CADDY
// =====================================================

console.log("🧠 Coach IA V2 chargé");

// -----------------------------------------------------
// DOM
// -----------------------------------------------------
function $(id) {
  return document.getElementById(id);
}

// -----------------------------------------------------
// KNOWLEDGE FALLBACK
// Si coach-knowledge-v2.js est chargé, il sera prioritaire.
// -----------------------------------------------------
window.PARFECT_COACH_KNOWLEDGE_V2 = window.PARFECT_COACH_KNOWLEDGE_V2 || {
  swing: {
    tempo: {
      goal: "Créer un rythme répétable.",
      principles: ["Le tempo stable est plus important qu’un swing parfait."],
      drills: ["Fais 3 swings à 70% en comptant 1-2-3 à la montée, 1 à la descente."]
    },
    rotation: {
      goal: "Tourner sans perdre la stabilité.",
      principles: ["La rotation utile est celle qui reste contrôlée."],
      drills: ["Fais 3 swings lents en gardant un finish stable."]
    },
    triangle: {
      goal: "Garder la connexion bras/épaules.",
      principles: ["Un triangle stable aide à répéter le contact."],
      drills: ["Fais 5 demi-swings compacts, sans chercher la puissance."]
    },
    weightShift: {
      goal: "Transférer progressivement vers l’avant.",
      principles: ["Le transfert doit être progressif, pas violent."],
      drills: ["Tiens le finish 2 secondes après chaque swing."]
    },
    extension: {
      goal: "Laisser les bras s’allonger après impact.",
      principles: ["L’extension vient après un contact organisé."],
      drills: ["Fais 3 demi-swings avec finish bras longs."]
    },
    balance: {
      goal: "Finir stable et contrôlé.",
      principles: ["Le finish révèle la qualité du swing."],
      drills: ["Swing à 70%, puis tiens le finish 2 secondes."]
    }
  },

  mental: {
    routine: {
      goal: "Créer un script simple avant chaque coup.",
      principles: [
        "Une seule intention par coup.",
        "On juge la qualité de la routine, pas seulement le résultat."
      ],
      script: [
        "cible",
        "coup raisonnable",
        "intention en 3 mots",
        "respiration",
        "action"
      ]
    },
    pressure: {
      goal: "Revenir au coup jouable.",
      principles: [
        "Sous pression, on réduit l’ambition.",
        "Le bon coup est celui qui garde la balle en jeu."
      ],
      drills: ["Respire 4 secondes, expire 6 secondes, puis joue simple."]
    },
    postBadShot: {
      goal: "Ne pas laisser un mauvais coup décider du suivant.",
      principles: [
        "Un mauvais coup est une information, pas une identité."
      ],
      reset: [
        "regarde la situation réelle",
        "choisis l’option qui remet la balle en jeu",
        "accepte bogey si nécessaire"
      ]
    }
  },

  caddy: {
    decisionFramework: {
      questions: [
        "Quelle est la cible la plus sûre ?",
        "Où est le danger à éviter absolument ?",
        "Quel club donne le plus de marge ?",
        "Quel coup peux-tu rater correctement ?"
      ],
      rules: [
        "Entre deux clubs, choisis celui qui couvre le danger principal.",
        "Si le danger est court, prends plus de club.",
        "Si le danger est long, prends moins de club.",
        "Si le lie est mauvais, réduis l’ambition.",
        "Si tu hésites, choisis l’option la plus simple à exécuter."
      ]
    },
    clubChoice: {
      defaultAnswer:
        "Je choisis le club qui donne la meilleure marge, pas celui qui demande le coup parfait.",
      betweenTwoClubs: [
        "Si tu dois forcer le petit club, prends le grand club en swing contrôlé.",
        "Si le grand club amène un danger long, prends le petit club et accepte court.",
        "Si le vent est contre, monte d’un club.",
        "Si le lie est moyen, monte d’un club et swingue plus simple.",
        "Sous pression, prends le club avec lequel tu peux faire ton swing normal."
      ]
    },
    onCourseModes: {
      attack: "Attaque seulement si le mauvais coup reste jouable.",
      safe: "Joue la zone large. Accepte un putt plus long ou une approche simple.",
      recovery: "Remets la balle en jeu. Pas de héros.",
      protectScore: "Protège le double. Le bogey peut être un bon score."
    }
  }
};

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------
function knowledge() {
  return window.PARFECT_COACH_KNOWLEDGE_V2 || {};
}

function cleanText(str) {
  return String(str || "").replace(/\s+/g, " ").trim();
}

function clampText(str, max = 520) {
  const clean = cleanText(str);
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function safeCoachReact(message, opts = {}) {
  const clean = cleanText(message);
  if (!clean) return;

  if (typeof window.coachReact === "function") {
    window.coachReact(clean, opts);
  } else {
    console.log("Coach:", clean);
  }
}

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
function initCoachIA() {
  const input = $("coach-input");
  const send = $("coach-send");

  if (!input || !send) {
    console.warn("⚠️ Coach IA V2 : input ou bouton manquant");
    return;
  }

  if (send.dataset.coachV2Bound === "1") return;
  send.dataset.coachV2Bound = "1";

  if (!localStorage.getItem("coachIntroDone")) {
    safeCoachReact("Salut 👋 Je suis ton coach Parfect. Swing, mental ou caddy : pose-moi ta question.");
    localStorage.setItem("coachIntroDone", "true");
  }

  send.addEventListener("click", () => onUserSend(input));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onUserSend(input);
  });

  console.log("✅ Coach IA V2 initialisé");
}

// -----------------------------------------------------
// USER LOG
// -----------------------------------------------------
function appendUserMessage(text) {
  const log = $("coach-user-log");
  if (!log) return;

  const clean = cleanText(text);
  if (!clean) return;

  const div = document.createElement("div");
  div.className = "msg user";
  div.textContent = clean;

  log.appendChild(div);
  log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
}

function onUserSend(input) {
  const message = cleanText(input?.value);
  if (!message) return;

  appendUserMessage(message);
  input.value = "";

  respondAsCoach(message);
}

// -----------------------------------------------------
// INTENT DETECTION
// -----------------------------------------------------
function detectIntent(message) {
  const m = cleanText(message).toLowerCase();

  if (
    m.includes("caddy") ||
    m.includes("club") ||
    m.includes("fer ") ||
    m.includes("fer7") ||
    m.includes("fer 7") ||
    m.includes("fer8") ||
    m.includes("fer 8") ||
    m.includes("driver") ||
    m.includes("bois") ||
    m.includes("hybride") ||
    m.includes("wedge") ||
    m.includes("j’hésite") ||
    m.includes("j'hesite") ||
    m.includes("j hésite") ||
    m.includes("option") ||
    m.includes("prochain coup") ||
    m.includes("vent") ||
    m.includes("lie") ||
    m.includes("danger")
  ) {
    return "CADDY";
  }

  if (
    m.includes("mental") ||
    m.includes("stress") ||
    m.includes("pression") ||
    m.includes("confiance") ||
    m.includes("routine") ||
    m.includes("peur") ||
    m.includes("mauvais coup") ||
    m.includes("raté") ||
    m.includes("rate")
  ) {
    return "MENTAL";
  }

  return "SWING";
}

// -----------------------------------------------------
// SWING CONTEXT
// -----------------------------------------------------
function getLatestSwingContext() {
  return (
    window.lastSwingScores ||
    window.currentSwingScores ||
    window.lastJustSwingScores ||
    window.lastSwingResult ||
    null
  );
}

function pickWeakMetric(scores) {
  const order = [
    "tempo",
    "rotation",
    "triangle",
    "weightShift",
    "extension",
    "balance"
  ];

  const candidates = [];

  for (const key of order) {
    const value =
      scores?.breakdown?.[key]?.score ??
      scores?.scores?.[key] ??
      scores?.metrics?.[key]?.score ??
      scores?.[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      candidates.push({ key, value });
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.value - b.value);
  return candidates[0];
}

function metricLabel(key) {
  const labels = {
    tempo: "tempo",
    rotation: "rotation",
    triangle: "connexion bras/épaules",
    weightShift: "transfert d’appui",
    extension: "extension",
    balance: "équilibre"
  };

  return labels[key] || key;
}

// -----------------------------------------------------
// ANSWERS — SWING
// -----------------------------------------------------
function answerSwing(message) {
  const k = knowledge();
  const scores = getLatestSwingContext();
  const weak = pickWeakMetric(scores);

  if (!weak) {
    return clampText(
      "Swing : je garde une priorité simple. Fais 3 swings à 70%, même routine, même rythme, puis tiens le finish 2 secondes. On cherche la répétabilité, pas le swing parfait."
    );
  }

  const block = k.swing?.[weak.key];
  const label = metricLabel(weak.key);

  if (!block) {
    return clampText(
      `Priorité : ${label}. Fais 3 swings calmes avec une seule intention. Le but est de rendre ce point plus répétable.`
    );
  }

  const principle = block.principles?.[0] || "";
  const drill = block.drills?.[0] || "Fais 3 répétitions simples à 70%.";

  return clampText(
    `Priorité ${label} : ${block.goal} ${principle} Action : ${drill}`
  );
}

// -----------------------------------------------------
// ANSWERS — MENTAL
// -----------------------------------------------------
function answerMental(message) {
  const k = knowledge();
  const m = cleanText(message).toLowerCase();

  if (
    m.includes("mauvais coup") ||
    m.includes("raté") ||
    m.includes("rate") ||
    m.includes("énerv") ||
    m.includes("enerve")
  ) {
    const b = k.mental?.postBadShot;
    return clampText(
      `Reset mental : ${b.goal} ${b.principles?.[0] || ""} Action : ${b.reset?.join(" → ")}.`
    );
  }

  if (
    m.includes("pression") ||
    m.includes("stress") ||
    m.includes("peur") ||
    m.includes("confiance")
  ) {
    const b = k.mental?.pressure;
    return clampText(
      `Sous pression : ${b.goal} ${b.principles?.[0] || ""} Action : ${b.drills?.[0]}`
    );
  }

  const b = k.mental?.routine;

  return clampText(
    `Routine : ${b.goal} ${b.principles?.[0] || ""} Script : ${b.script?.join(" → ")}.`
  );
}

// -----------------------------------------------------
// ANSWERS — CADDY
// -----------------------------------------------------
function extractClubOptions(message) {
  const m = cleanText(message).toLowerCase();
  const clubs = [];

  const patterns = [
    "driver",
    "bois 3",
    "bois3",
    "bois 5",
    "bois5",
    "hybride",
    "fer 4",
    "fer4",
    "fer 5",
    "fer5",
    "fer 6",
    "fer6",
    "fer 7",
    "fer7",
    "fer 8",
    "fer8",
    "fer 9",
    "fer9",
    "pw",
    "sw",
    "wedge"
  ];

  patterns.forEach((club) => {
    if (m.includes(club)) {
      clubs.push(
        club
          .replace("bois3", "bois 3")
          .replace("bois5", "bois 5")
          .replace(/fer(\d)/, "fer $1")
      );
    }
  });

  return [...new Set(clubs)];
}

function detectCaddyMode(message) {
  const m = cleanText(message).toLowerCase();

  if (
    m.includes("recentr") ||
    m.includes("rough") ||
    m.includes("forêt") ||
    m.includes("foret") ||
    m.includes("bunker") ||
    m.includes("mauvais lie")
  ) {
    return "recovery";
  }

  if (
    m.includes("attaquer") ||
    m.includes("attaque") ||
    m.includes("birdie") ||
    m.includes("drapeau") ||
    m.includes("green")
  ) {
    return "attack";
  }

  if (
    m.includes("score") ||
    m.includes("protéger") ||
    m.includes("proteger") ||
    m.includes("bogey") ||
    m.includes("double")
  ) {
    return "protectScore";
  }

  return "safe";
}

function answerCaddy(message) {
  const k = knowledge();
  const clubs = extractClubOptions(message);
  const mode = detectCaddyMode(message);

  const modeLine =
    k.caddy?.onCourseModes?.[mode] ||
    k.caddy?.onCourseModes?.safe ||
    "";

  const rules = k.caddy?.clubChoice?.betweenTwoClubs || [];
  const defaultAnswer =
    k.caddy?.clubChoice?.defaultAnswer ||
    "Choisis le club qui donne le plus de marge.";

  if (clubs.length >= 2) {
    return clampText(
      `Caddy : entre ${clubs[0]} et ${clubs[1]}, je choisis l’option qui protège le score. ${rules[0] || ""} ${modeLine} Question clé : où est le danger à éviter absolument ?`
    );
  }

  return clampText(
    `Caddy : ${defaultAnswer} ${modeLine} Donne-moi distance, lie, vent, danger court/long, et je te tranche le club.`
  );
}

// -----------------------------------------------------
// MAIN COACH
// -----------------------------------------------------
async function respondAsCoach(message) {
  const intent = detectIntent(message);

  let reply = "";

  if (intent === "CADDY") {
    reply = answerCaddy(message);
  } else if (intent === "MENTAL") {
    reply = answerMental(message);
  } else {
    reply = answerSwing(message);
  }

  safeCoachReact(reply);
}

// -----------------------------------------------------
// UI VISIBILITY
// -----------------------------------------------------
function showCoachIA(message = "") {
  const coach = $("coach-ia");
  if (coach) coach.style.display = "flex";
  if (message) safeCoachReact(message);
}

function hideCoachIA() {
  const coach = $("coach-ia");
  if (coach) coach.style.display = "none";
}

function showCoachToast(msg, color = "#00ff99") {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;
    bottom:80px;
    left:50%;
    transform:translateX(-50%);
    background:${color};
    color:#111;
    padding:8px 14px;
    border-radius:8px;
    font-weight:bold;
    z-index:9999;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// -----------------------------------------------------
// EXPORTS
// -----------------------------------------------------
window.initCoachIA = initCoachIA;
window.respondAsCoach = respondAsCoach;
window.showCoachIA = showCoachIA;
window.hideCoachIA = hideCoachIA;
window.showCoachToast = showCoachToast;

// Auto init safe
document.addEventListener("DOMContentLoaded", () => {
  initCoachIA();
});
