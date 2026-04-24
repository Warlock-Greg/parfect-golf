// =====================================================
// Coach Mode — Training Session
// - Essaie d'abord l'API premium
// - Fallback local robuste si backend indisponible
// =====================================================

window.CoachModes = window.CoachModes || {};

window.CoachModes.training = async function ({ context, userMessage = "" } = {}) {
  try {
    const isPro = window.userLicence?.licence === "pro";

    // -------------------------------------------------
    // 1) Mode premium : appel backend génératif
    // -------------------------------------------------
    if (isPro && window.CoachTransport?.trainingAdvice) {
      try {
        const remote = await window.CoachTransport.trainingAdvice(context, userMessage);

        const analysis = remote?.analysis || remote;

        if (analysis && typeof analysis === "object") {
          return normalizeTrainingCoachResponse(analysis, context);
        }
      } catch (err) {
        console.warn("⚠️ Training coach remote failed -> fallback local", err);
      }
    }

    // -------------------------------------------------
    // 2) Fallback local
    // -------------------------------------------------
    return buildLocalTrainingFallback(context, userMessage);

  } catch (err) {
    console.warn("❌ CoachModes.training fatal error", err);
    return {
      mode: "training_session",
      summary: "On garde la séance simple : calme, répétable, utile.",
      session_focus: "Régularité",
      block_plan: [
        "5 swings lents à 70%",
        "5 swings normaux avec la même intention"
      ],
      immediate_actions: ["Repars avec une seule intention claire."],
      routine_reset: [
        "Inspire 4 secondes",
        "Expire 6 secondes"
      ],
      success_signal: "Même sensation sur 3 swings de suite.",
      next_block_goal: "Rester simple et répétable."
    };
  }
};

// =====================================================
// Normalisation réponse backend
// =====================================================
function normalizeTrainingCoachResponse(raw, context) {
  return {
    mode: "training_session",
    summary: raw?.summary || "Séance cadrée.",
    session_focus: raw?.session_focus || inferTrainingFocus(context),
    block_plan: Array.isArray(raw?.block_plan) ? raw.block_plan.slice(0, 4) : [],
    immediate_actions: Array.isArray(raw?.immediate_actions)
      ? raw.immediate_actions.slice(0, 2)
      : [],
    routine_reset: Array.isArray(raw?.routine_reset)
      ? raw.routine_reset.slice(0, 3)
      : [],
    success_signal: raw?.success_signal || "Même sensation sur 3 swings de suite.",
    next_block_goal: raw?.next_block_goal || "Rester calme et répétable."
  };
}

// =====================================================
// Fallback local
// =====================================================
function buildLocalTrainingFallback(context, userMessage = "") {
  const objective = context?.training_context?.objective || "SKIP";
  const weakMetric = context?.recent_performance?.weak_metric || "tempo";
  const reps = context?.training_context?.repetitions_done || 0;

  const sessionFocus = objectiveLabel(objective);
  const summary = buildTrainingSummary(objective, reps);
  const immediate = buildTrainingImmediateAction(objective, weakMetric);
  const routineReset = buildTrainingRoutineReset(objective);
  const blockPlan = buildTrainingBlockPlan(objective, weakMetric, reps);

  return {
    mode: "training_session",
    summary,
    session_focus: sessionFocus,
    block_plan: blockPlan,
    immediate_actions: [immediate].filter(Boolean),
    routine_reset: routineReset,
    success_signal: buildTrainingSuccessSignal(objective),
    next_block_goal: buildTrainingNextGoal(objective, weakMetric),
    home_hint:
    "Tu peux aussi faire ce travail à la maison avec JustSwing, téléphone posé sur un plan de travail, en faisant des swings sans club lents et contrôlés."

  };
}

// =====================================================
// Helpers training
// =====================================================
function objectiveLabel(objective) {
  switch (objective) {
    case "REGULARITE":
      return "Régularité";
    case "ZONE":
      return "Rester dans la zone";
    case "ROUTINE":
      return "Routine solide";
    case "CALME":
      return "Calme & intention";
    case "SCORE":
      return "Simple et efficace";
    default:
      return "Régularité";
  }
}

function inferTrainingFocus(context) {
  return objectiveLabel(context?.training_context?.objective || "SKIP");
}

function buildTrainingSummary(objective, reps) {
  if (reps >= 10) {
    return "La priorité n’est pas d’en faire plus, mais de garder la même qualité sur le bloc suivant.";
  }

  switch (objective) {
    case "REGULARITE":
      return "Aujourd’hui, on cherche à répéter le même swing avec la même sensation.";
    case "ZONE":
      return "Aujourd’hui, on reste dans une zone maîtrisée, sans surjouer.";
    case "ROUTINE":
      return "Aujourd’hui, la priorité est de stabiliser ton script mental avant chaque swing.";
    case "CALME":
      return "Aujourd’hui, on cherche du calme, de la respiration et une intention claire.";
    case "SCORE":
      return "Aujourd’hui, on travaille un swing simple, utile et reproductible.";
    default:
      return "On garde la séance simple, calme et répétable.";
  }
}

function buildTrainingImmediateAction(objective, weakMetric) {
  if (objective === "CALME") {
    return "Respire avant chaque swing et garde une seule intention.";
  }

  if (objective === "ROUTINE") {
    return "Refais exactement le même script avant chaque balle.";
  }

  if (objective === "ZONE") {
    return "Ne force rien : reste dans un swing maîtrisé.";
  }

  switch (weakMetric) {
    case "rotation":
      return "Cherche plus d’amplitude sans forcer.";
    case "tempo":
      return "Garde le même rythme sur chaque répétition.";
    case "triangle":
      return "Reste compact et connecté.";
    case "weightShift":
      return "Reste centré avant de transférer.";
    case "extension":
      return "Traverse plus longtemps après impact.";
    case "balance":
      return "Tiens le finish deux secondes.";
    default:
      return "Repars avec une seule intention claire.";
  }
}

function buildTrainingRoutineReset(objective) {
  const base = [
    "Inspire 4 secondes",
    "Expire 6 secondes",
    "Repars avec une seule intention"
  ];

  if (objective === "ROUTINE") {
    return [
      "Regarde la cible",
      "Respire une fois",
      "Lance ton swing sans attendre"
    ];
  }

  return base;
}

function buildTrainingBlockPlan(objective, weakMetric, reps) {
  if (reps >= 10) {
    return [
      "3 swings lents à 70%",
      "3 swings normaux avec la même intention",
      "Pause courte avant le prochain bloc"
    ];
  }

  if (objective === "CALME") {
    return [
      "2 respirations avant de démarrer",
      "5 swings lents à 70%",
      "5 swings normaux sans changer d’intention"
    ];
  }

  if (objective === "ROUTINE") {
    return [
      "5 répétitions avec exactement la même routine",
      "5 swings normaux sans accélérer mentalement",
      "Valide ton script avant chaque départ"
    ];
  }

  if (objective === "ZONE") {
    return [
      "5 swings simples sans chercher plus de puissance",
      "5 swings en gardant le même tempo",
      "Stoppe dès que tu sors de ta zone"
    ];
  }

  return [
    `5 swings avec focus ${metricTrainingLabel(weakMetric).toLowerCase()}`,
    "5 swings normaux avec la même sensation",
    "Pause courte et reset routine"
  ];
}

function buildTrainingSuccessSignal(objective) {
  switch (objective) {
    case "ROUTINE":
      return "Même routine sur 3 répétitions de suite.";
    case "CALME":
      return "Même respiration et même rythme sur 3 swings.";
    case "ZONE":
      return "Tu restes dans un swing maîtrisé 3 fois de suite.";
    default:
      return "Même sensation sur 3 swings de suite.";
  }
}

function buildTrainingNextGoal(objective, weakMetric) {
  if (objective === "ROUTINE") {
    return "Rendre ton script plus automatique sur le prochain bloc.";
  }

  if (objective === "CALME") {
    return "Rester plus relâché sans perdre la qualité du swing.";
  }

  return `Stabiliser ${metricTrainingLabel(weakMetric).toLowerCase()} sur le prochain bloc.`;
}

function metricTrainingLabel(metric) {
  switch (metric) {
    case "rotation": return "Rotation";
    case "tempo": return "Tempo";
    case "triangle": return "Triangle";
    case "weightShift": return "Transfert";
    case "extension": return "Extension";
    case "balance": return "Balance";
    default: return metric || "Focus";
  }
}

console.log("✅ CoachModes.training chargé");
