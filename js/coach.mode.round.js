// =====================================================
// Coach Mode — Round Support
// - Essaie d'abord l'API premium
// - Fallback local robuste si backend indisponible
// =====================================================

window.CoachModes = window.CoachModes || {};

window.CoachModes.round = async function ({ context, userMessage = "" } = {}) {
  try {
    const isPro = window.userLicence?.licence === "pro";

    // -------------------------------------------------
    // 1) Mode premium : appel backend génératif
    // -------------------------------------------------
    if (isPro && window.CoachTransport?.roundSupport) {
      try {
        const remote = await window.CoachTransport.roundSupport(context, userMessage);
        const analysis = remote?.analysis || remote;

        if (analysis && typeof analysis === "object") {
          return normalizeRoundCoachResponse(analysis, context);
        }
      } catch (err) {
        console.warn("⚠️ Round coach remote failed -> fallback local", err);
      }
    }

    // -------------------------------------------------
    // 2) Fallback local
    // -------------------------------------------------
    return buildLocalRoundFallback(context, userMessage);

  } catch (err) {
    console.warn("❌ CoachModes.round fatal error", err);

    return {
      mode: "round_support",
      summary: "Reviens au présent. Un trou ne définit pas ta partie.",
      reset_protocol: [
        "Respire 4 secondes, expire 6 secondes.",
        "Relâche les épaules.",
        "Joue le coup le plus simple."
      ],
      immediate_actions: [
        "Regarde uniquement la cible du prochain coup."
      ],
      next_shot_intention: "Simple, calme, engagé.",
      decision_rule: "Pas de coup héroïque.",
      encouragement: "Un coup à la fois."
    };
  }
};

// =====================================================
// Normalisation réponse backend
// =====================================================
function normalizeRoundCoachResponse(raw, context) {
  return {
    mode: "round_support",
    summary: raw?.summary || "On repart sur le prochain coup.",
    reset_protocol: Array.isArray(raw?.reset_protocol)
      ? raw.reset_protocol.slice(0, 3)
      : [],
    immediate_actions: Array.isArray(raw?.immediate_actions)
      ? raw.immediate_actions.slice(0, 2)
      : [],
    next_shot_intention: raw?.next_shot_intention || inferNextShotIntention(context),
    decision_rule: raw?.decision_rule || inferDecisionRule(context),
    encouragement: raw?.encouragement || "Un coup à la fois."
  };
}

// =====================================================
// Fallback local
// =====================================================
function buildLocalRoundFallback(context, userMessage = "") {
  const emotional = context?.emotional_context || {};
  const round = context?.round_context || {};
  const profile = context?.round_profile || {};
  const events = Array.isArray(context?.recent_events) ? context.recent_events : [];

  const frustration = safeNum(emotional?.frustration, 0);
  const calm = safeNum(emotional?.calm, 3);
  const confidence = safeNum(emotional?.confidence, 3);
  const trigger = emotional?.trigger || "manual";
  const strategy = profile?.strategy || "mindset";
  const mood = profile?.mood || "focus";

  const latestBadEvent = findLatestBadEvent(events);
  const hardReset =
    frustration >= 4 ||
    confidence <= 1 ||
    trigger === "bad_hole" ||
    /craqu|explos|frustr|tilt|recentr|mental/i.test(String(userMessage || ""));

  if (trigger === "round_end") {
    return buildRoundEndFeedback(context);
  }

  if (hardReset) {
    return {
      mode: "round_support",
      summary: buildHardResetSummary(round, latestBadEvent),
      reset_protocol: buildHardResetProtocol(mood),
      immediate_actions: buildHardResetActions(strategy),
      next_shot_intention: inferNextShotIntention(context, true),
      decision_rule: inferDecisionRule(context, true),
      encouragement: buildEncouragement(mood, true)
    };
  }

  return {
    mode: "round_support",
    summary: buildSoftResetSummary(round),
    reset_protocol: buildSoftResetProtocol(mood, calm),
    immediate_actions: buildSoftResetActions(strategy),
    next_shot_intention: inferNextShotIntention(context, false),
    decision_rule: inferDecisionRule(context, false),
    encouragement: buildEncouragement(mood, false)
  };
}

// =====================================================
// Builders
// =====================================================
function buildRoundEndFeedback(context) {
  const round = context?.round_context || {};
  const scoreToPar = round?.score_to_par ?? null;

  return {
    mode: "round_support",
    summary:
      scoreToPar == null
        ? "La partie est terminée. Garde ce que tu as appris aujourd’hui."
        : `Partie terminée. Score ${scoreToPar}. Garde une lecture calme de cette ronde.`,
    reset_protocol: [
      "Note un point fort concret.",
      "Note une seule priorité pour la prochaine partie.",
      "Laisse le score retomber émotionnellement."
    ],
    immediate_actions: [
      "Ne juge pas toute la partie sur un seul trou."
    ],
    next_shot_intention: "La prochaine partie repart de zéro.",
    decision_rule: "Une seule leçon utile, pas dix.",
    encouragement: "Tu progresses aussi en observant mieux."
  };
}

function buildHardResetSummary(round, latestBadEvent) {
  const hole = round?.hole_number ? `Le trou ${round.hole_number}` : "Le trou précédent";

  if (latestBadEvent?.reason === "hors_limites") {
    return `${hole} est terminé. Hors limites ou grosse erreur, on ne rejoue pas l’émotion : on rejoue le prochain coup.`;
  }

  if (latestBadEvent?.reason === "strategie") {
    return `${hole} est terminé. Le mauvais choix est derrière toi. On repart sur une décision simple.`;
  }

  return `${hole} est terminé. On coupe la spirale maintenant et on revient au présent.`;
}

function buildSoftResetSummary(round) {
  const hole = round?.hole_number ? `Trou ${round.hole_number}` : "Ce moment";
  return `${hole}. Reste simple et reviens à ta routine avant le prochain coup.`;
}

function buildHardResetProtocol(mood) {
  if (mood === "relax") {
    return [
      "Respire 4 secondes, expire 6 secondes, deux fois.",
      "Pose le club 10 secondes et relâche les épaules.",
      "Regarde uniquement la cible du prochain coup."
    ];
  }

  if (mood === "grind") {
    return [
      "Respire une fois complètement.",
      "Reviens dans tes appuis.",
      "Valide une seule cible et une seule décision."
    ];
  }

  if (mood === "fun") {
    return [
      "Souris une seconde pour casser la tension.",
      "Respire calmement une fois.",
      "Reviens à une cible simple."
    ];
  }

  return [
    "Respire 4 secondes, expire 6 secondes, deux fois.",
    "Relâche les mains et les épaules.",
    "Regarde uniquement la cible du prochain coup."
  ];
}

function buildSoftResetProtocol(mood, calm) {
  if (calm <= 2) {
    return [
      "Une respiration lente.",
      "Une cible claire.",
      "Une intention simple."
    ];
  }

  if (mood === "focus") {
    return [
      "Regarde la cible.",
      "Valide ton alignement.",
      "Lance le swing sans attendre."
    ];
  }

  return [
    "Respire une fois.",
    "Clarifie ton choix.",
    "Joue simple."
  ];
}

function buildHardResetActions(strategy) {
  switch (strategy) {
    case "safe":
      return [
        "Choisis l’option la plus simple.",
        "Joue pour remettre la balle en jeu."
      ];
    case "aggressive":
      return [
        "N’essaie pas de te racheter tout de suite.",
        "Garde l’audace pour un vrai bon moment, pas sous tension."
      ];
    case "5050":
      return [
        "Choisis le côté qui enlève le plus de risque.",
        "Accepte un coup moyen mais propre."
      ];
    default:
      return [
        "Choisis l’option la plus simple.",
        "Joue le prochain coup, pas le trou précédent."
      ];
  }
}

function buildSoftResetActions(strategy) {
  switch (strategy) {
    case "safe":
      return ["Reste dans ton plan le plus simple."];
    case "aggressive":
      return ["Reste engagé, mais seulement sur un choix clair."];
    case "5050":
      return ["Ne force pas la décision : prends l’option la plus nette."];
    default:
      return ["Reviens à ton coup le plus maîtrisé."];
  }
}

function inferNextShotIntention(context, hard = false) {
  const nextType = context?.round_context?.next_shot_type || "next_shot";

  if (hard) {
    if (nextType === "tee_shot") return "Simple, calme, centré au départ.";
    return "Simple, calme, engagé vers la cible.";
  }

  if (nextType === "tee_shot") return "Claire au départ, relâchée dans l’exécution.";
  return "Présent, fluide, engagé.";
}

function inferDecisionRule(context, hard = false) {
  const strategy = context?.round_profile?.strategy || "mindset";

  if (hard) {
    return "Pas de coup héroïque maintenant.";
  }

  switch (strategy) {
    case "safe":
      return "Choisis la zone la plus large.";
    case "aggressive":
      return "Agressif seulement si la cible est claire.";
    case "5050":
      return "Prends le choix qui réduit la dispersion.";
    default:
      return "Une seule cible, une seule décision.";
  }
}

function buildEncouragement(mood, hard = false) {
  if (hard) {
    switch (mood) {
      case "fun":
        return "Tourne la page et repars léger.";
      case "grind":
        return "Reste solide. Un coup à la fois.";
      case "relax":
        return "Laisse retomber la tension et repars proprement.";
      default:
        return "Un coup à la fois.";
    }
  }

  switch (mood) {
    case "fun":
      return "Garde du jeu dans ton énergie.";
    case "grind":
      return "Continue à être propre et clair.";
    case "relax":
      return "Reste souple et engagé.";
    default:
      return "Reste présent.";
  }
}

function findLatestBadEvent(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    const evt = events[i];
    if (evt?.type === "bad_hole") return evt;
  }
  return null;
}

function safeNum(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

console.log("✅ CoachModes.round chargé");
