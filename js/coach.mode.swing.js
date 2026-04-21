// =====================================================
// Coach Mode — Swing Analysis
// - Essaie d'abord l'API premium
// - Fallback local robuste si backend indisponible
// =====================================================

window.CoachModes = window.CoachModes || {};

window.CoachModes.swing = async function ({ context, userMessage = "" } = {}) {
  try {
    const isPro = window.userLicence?.licence === "pro";

    // -------------------------------------------------
    // 1) Mode premium : appel backend génératif
    // -------------------------------------------------
    if (isPro && window.CoachTransport?.analyzeSwing) {
      try {
        const remote = await window.CoachTransport.analyzeSwing(context, userMessage);

        // La route peut renvoyer soit directement l'analyse,
        // soit { ok:true, analysis:{...} }
        const analysis = remote?.analysis || remote;

        if (analysis && typeof analysis === "object") {
          return normalizeSwingCoachResponse(analysis, context);
        }
      } catch (err) {
        console.warn("⚠️ Swing coach remote failed -> fallback local", err);
      }
    }

    // -------------------------------------------------
    // 2) Fallback local
    // -------------------------------------------------
    return buildLocalSwingFallback(context, userMessage);

  } catch (err) {
    console.warn("❌ CoachModes.swing fatal error", err);
    return {
      mode: "swing_analysis",
      summary: "Le swing a bien été mesuré. On repart sur une consigne simple.",
      priorities: [],
      immediate_actions: ["Rejoue un swing calme avec une seule intention."],
      technical_advice: [],
      drill: [],
      mental_cue: "Simple et propre.",
      next_goal: "Réaliser un swing plus relâché au prochain essai.",
      confidence: 0.4
    };
  }
};

// =====================================================
// Normalisation réponse backend
// =====================================================
function normalizeSwingCoachResponse(raw, context) {
  return {
    mode: "swing_analysis",
    summary: raw?.summary || "Analyse disponible.",
    strengths: Array.isArray(raw?.strengths) ? raw.strengths : [],
    priorities: Array.isArray(raw?.priorities) ? raw.priorities.slice(0, 3) : [],
    immediate_actions: Array.isArray(raw?.immediate_actions)
      ? raw.immediate_actions.slice(0, 2)
      : [],
    technical_advice: Array.isArray(raw?.technical_advice)
      ? raw.technical_advice.slice(0, 4)
      : [],
    drill: Array.isArray(raw?.home_drills)
      ? raw.home_drills.slice(0, 2)
      : Array.isArray(raw?.drill)
      ? raw.drill.slice(0, 2)
      : [],
    mental_cue: raw?.mental_cue || "Simple et propre.",
    next_goal: raw?.next_goal || inferNextGoalFromContext(context),
    confidence:
      typeof raw?.confidence === "number" && Number.isFinite(raw.confidence)
        ? raw.confidence
        : 0.8
  };
}

// =====================================================
// Fallback local
// =====================================================
function buildLocalSwingFallback(context, userMessage = "") {
  const analysis = context?.analysis_context || {};
  const breakdown = analysis?.breakdown || {};
  const total = typeof analysis?.total === "number" ? analysis.total : null;

  const weakest = detectWeakestSwingMetric(breakdown);
  const action = buildImmediateActionForMetric(weakest, breakdown);
  const why = buildWhyForMetric(weakest, breakdown);
  const summary = buildSwingSummary(total, weakest, breakdown);
  const cue = buildMentalCueForMetric(weakest);
  const drill = buildDrillForMetric(weakest);

  return {
    mode: "swing_analysis",
    summary,
    strengths: detectSwingStrengths(breakdown),
    priorities: [
      {
        title: metricLabel(weakest),
        why
      }
    ],
    immediate_actions: [action].filter(Boolean),
    technical_advice: buildTechnicalAdvice(weakest, breakdown),
    drill: [drill].filter(Boolean),
    mental_cue: cue,
    next_goal: inferNextGoalFromMetric(weakest),
    confidence: 0.65
  };
}

// =====================================================
// Détection métrique prioritaire
// =====================================================
function detectWeakestSwingMetric(breakdown) {
  const keys = ["rotation", "tempo", "triangle", "weightShift", "extension", "balance"];

  let weakest = "rotation";
  let min = Infinity;

  keys.forEach((key) => {
    const value = breakdown?.[key]?.score;
    if (typeof value === "number" && value < min) {
      min = value;
      weakest = key;
    }
  });

  return weakest;
}

function detectSwingStrengths(breakdown) {
  const keys = ["rotation", "tempo", "triangle", "weightShift", "extension", "balance"];

  return keys
    .map((key) => ({
      key,
      score: breakdown?.[key]?.score
    }))
    .filter((x) => typeof x.score === "number" && x.score >= strengthThresholdForMetric(x.key))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => {
      switch (x.key) {
        case "tempo":
          return "Tempo globalement bien maîtrisé.";
        case "balance":
          return "Finish assez stable.";
        case "weightShift":
          return "Transfert plutôt bien engagé.";
        case "rotation":
          return "La rotation est déjà sur une base correcte.";
        case "triangle":
          return "La structure bras/épaules reste plutôt cohérente.";
        case "extension":
          return "La traversée est globalement présente.";
        default:
          return `${metricLabel(x.key)} solide.`;
      }
    });
}

function strengthThresholdForMetric(key) {
  if (key === "extension" || key === "balance") return 8; // /10
  return 16; // /20
}

// =====================================================
// Messages locaux
// =====================================================
function buildSwingSummary(total, weakest, breakdown) {
  if (typeof total === "number") {
    if (total >= 80) {
      return "Le swing est globalement solide. On affine maintenant un seul point pour gagner en répétabilité.";
    }
    if (total >= 60) {
      return `Le swing est globalement correct. La priorité du moment se situe surtout sur ${metricLabel(weakest).toLowerCase()}.`;
    }
    return "Le swing a bien été mesuré. On va simplifier la progression avec une seule priorité claire.";
  }

  return "Le swing a bien été mesuré. On garde une seule priorité pour le prochain essai.";
}

function buildWhyForMetric(metric, breakdown) {
  const data = breakdown?.[metric]?.metrics || {};

  switch (metric) {
    case "rotation": {
      const sh = data?.measure?.shoulder;
      const hip = data?.measure?.hip;
      if (typeof sh === "number" && typeof hip === "number") {
        return `La rotation actuelle reste encore insuffisamment organisée (épaules ${fmtCoachValue(sh)}, hanches ${fmtCoachValue(hip)}).`;
      }
      return "La rotation ne structure pas encore assez bien le backswing.";
    }

    case "tempo": {
      const ratio = data?.ratio;
      if (typeof ratio === "number") {
        return `Le rythme du swing reste perfectible avec un ratio actuellement autour de ${fmtCoachValue(ratio)}:1.`;
      }
      return "Le rythme n’est pas encore assez stable entre montée et descente.";
    }

    case "triangle": {
      const top = data?.varTopPct;
      const imp = data?.varImpactPct;
      if (typeof top === "number" || typeof imp === "number") {
        return `Le triangle bras/épaules varie encore trop pendant le swing.`;
      }
      return "Le triangle bras/épaules perd encore en stabilité pendant le mouvement.";
    }

    case "weightShift": {
      const fwd = data?.absFwd;
      if (typeof fwd === "number") {
        return `Le transfert vers l’avant reste encore trop limité à l’impact (${fmtCoachValue(fwd)}).`;
      }
      return "Le transfert d’appui vers l’avant n’est pas encore assez net.";
    }

    case "extension": {
      const finish = data?.extFinish ?? data?.value;
      if (typeof finish === "number") {
        return `L’extension après impact reste encore courte (${fmtCoachValue(finish)}).`;
      }
      return "La traversée après impact est encore trop courte.";
    }

    case "balance": {
      const move = data?.finishMove;
      if (typeof move === "number") {
        return `Le finish manque encore de stabilité (${fmtCoachValue(move)} de déplacement).`;
      }
      return "Le finish n’est pas encore assez posé.";
    }

    default:
      return "C’est actuellement la priorité principale du swing.";
  }
}

function buildImmediateActionForMetric(metric, breakdown) {
  switch (metric) {
    case "rotation":
      return "Tourne davantage les épaules pendant la montée.";
    case "tempo":
      return "Laisse la montée se terminer avant de lancer la descente.";
    case "triangle":
      return "Garde les bras plus connectés au buste pendant le swing.";
    case "weightShift":
      return "Bloque mieux tes appuis pour limiter le sway.";
    case "extension":
      return "Laisse les bras s’allonger vers la cible après impact.";
    case "balance":
      return "Tiens ton finish deux secondes.";
    default:
      return "Repars avec une seule intention simple sur le prochain swing.";
  }
}

function buildTechnicalAdvice(metric, breakdown) {
  switch (metric) {
    case "rotation":
      return [
        "Cherche plus d’amplitude au backswing sans surengager les hanches.",
        "Finis ta rotation avant de lancer la descente."
      ];

    case "tempo":
      return [
        "Ralentis légèrement la montée pour retrouver un meilleur enchaînement.",
        "Garde une descente engagée sans précipiter le départ."
      ];

    case "triangle":
      return [
        "Reste plus connecté entre les bras et le buste.",
        "Évite que les bras se déstructurent entre le top et l’impact."
      ];

    case "weightShift":
      return [
        "Reste centré pendant la montée avant de transférer vers l’avant.",
        "Cherche une pression plus nette sur l’avant à l’impact."
      ];

    case "extension":
      return [
        "Traverse plus longtemps après impact.",
        "Laisse les bras partir vers la cible avant de se replier."
      ];

    case "balance":
      return [
        "Termine plus posé, avec le poids sur l’avant.",
        "Valide le finish en restant stable deux secondes."
      ];

    default:
      return ["Garde un seul focus pour le prochain swing."];
  }
}

function buildDrillForMetric(metric) {
  switch (metric) {
    case "rotation":
      return "Fais 8 rotations lentes bras croisés sur les épaules pour sentir l’amplitude.";
    case "tempo":
      return "Fais 5 swings à 70% en comptant mentalement montée puis descente.";
    case "triangle":
      return "Fais 8 swings lents en gardant la sensation de bras connectés au buste.";
    case "weightShift":
      return "Travaille 8 répétitions en sentant la pression passer vers l’avant à l’impact.";
    case "extension":
      return "Fais 10 swings lents sans club en tenant la traversée vers la cible.";
    case "balance":
      return "Fais 5 swings en tenant le finish deux secondes à chaque fois.";
    default:
      return "Fais 5 swings lents avec une seule intention.";
  }
}

function buildMentalCueForMetric(metric) {
  switch (metric) {
    case "rotation":
      return "Tourne puis traverse.";
    case "tempo":
      return "Calme à la montée, engagé à la descente.";
    case "triangle":
      return "Compact et connecté.";
    case "weightShift":
      return "Reste centré puis avance.";
    case "extension":
      return "Traverse vers la cible.";
    case "balance":
      return "Finis posé.";
    default:
      return "Simple et propre.";
  }
}

function inferNextGoalFromMetric(metric) {
  switch (metric) {
    case "rotation":
      return "Au prochain swing, cherche plus de rotation sans perdre ton équilibre.";
    case "tempo":
      return "Au prochain swing, retrouve un rythme plus fluide entre montée et descente.";
    case "triangle":
      return "Au prochain swing, garde une structure bras/buste plus stable.";
    case "weightShift":
      return "Au prochain swing, termine avec un transfert plus net vers l’avant.";
    case "extension":
      return "Au prochain swing, allonge davantage la traversée après impact.";
    case "balance":
      return "Au prochain swing, valide un finish tenu deux secondes.";
    default:
      return "Au prochain swing, garde une seule intention simple.";
  }
}

function inferNextGoalFromContext(context) {
  const weakest = detectWeakestSwingMetric(context?.analysis_context?.breakdown || {});
  return inferNextGoalFromMetric(weakest);
}

function metricLabel(metric) {
  switch (metric) {
    case "rotation": return "Rotation";
    case "tempo": return "Tempo";
    case "triangle": return "Triangle";
    case "weightShift": return "Transfert";
    case "extension": return "Extension";
    case "balance": return "Balance";
    default: return metric || "Priorité";
  }
}

function fmtCoachValue(v, digits = 2) {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : "—";
}

console.log("✅ CoachModes.swing chargé");
