// ==========================================================
// coach/coachService.js
// Coach V1: mindset + intention + routine (no swing mechanics)
// Hybrid: rule-based by default, optional LLM endpoint
// ==========================================================

export class CoachService {
  constructor(options = {}) {
    this.useRemote = !!options.useRemote;              // false by default
    this.remoteUrl = options.remoteUrl || "/api/coach";
    this.maxHistory = options.maxHistory || 12;
  }

  // Public: build advice from latest result + objective + history
  async getAdvice({ faceOnResult, objective = "SKIP", history = [] }) {
    // Guard
    if (!faceOnResult || !faceOnResult.isViewValid) {
      return this._adviceInvalidView(objective);
    }

    const compactHistory = (history || []).slice(-this.maxHistory);

    // Optional: remote LLM
    if (this.useRemote) {
      try {
        const payload = this._buildRemotePayload(faceOnResult, objective, compactHistory);
        const res = await fetch(this.remoteUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          // Expect { title, message, focusMetric, drill, cta }
          if (data?.message) return this._sanitizeRemote(data, objective);
        }
      } catch (e) {
        console.warn("CoachService remote failed, fallback to local.", e);
      }
    }

    // Local rule-based fallback (stable)
    return this._localAdvice(faceOnResult, objective, compactHistory);
  }

  // ----------------------------
  // Local advice engine (V1)
  // ----------------------------
  _localAdvice(faceOnResult, objective, history) {
    const { metrics, score20 } = faceOnResult;

    // Choose ONE focus metric: prioritize OUT then EDGE
    const focusMetric = this._pickFocusMetric(metrics);

    // Confidence: based on stability in history (how often focusMetric was IN)
    const confidence = this._estimateConfidence(focusMetric, history);

    // Build message: mindset + intention + one small action
    const title = this._titleForObjective(objective);
    const message = this._buildMindsetMessage({ score20, focusMetric, metrics, objective, confidence });

    // Drill: short routine-based cue, never mechanical
    const drill = this._buildDrill({ focusMetric, objective });

    const cta = "Fais 3 swings calmes. Un seul objectif: rester dans ta zone.";

    return { title, message, focusMetric, drill, cta, score20, metrics };
  }

  _pickFocusMetric(metrics) {
    const priority = ["sequence", "stability", "ratio", "tempo", "impact"]; // “signature” first
    for (const k of priority) if (metrics?.[k] === "OUT") return k;
    for (const k of priority) if (metrics?.[k] === "EDGE") return k;
    return priority[0];
  }

  _estimateConfidence(focusMetric, history) {
    // returns 0..1
    if (!history?.length) return 0.5;
    const last = history.slice(-8);
    const inCount = last.filter(h => h?.metrics?.[focusMetric] === "IN").length;
    return inCount / last.length;
  }

  _titleForObjective(objective) {
    switch (objective) {
      case "REGULARITE": return "Objectif: régularité";
      case "CALME": return "Objectif: calme & intention";
      case "ZONE": return "Objectif: rester dans ta zone";
      case "SCORE": return "Objectif: scorer (coup raisonnable)";
      case "ROUTINE": return "Objectif: routine solide";
      default: return "Coach";
    }
  }

  _buildMindsetMessage({ score20, focusMetric, metrics, objective, confidence }) {
    const focusLabel = this._metricLabel(focusMetric);

    const status = metrics?.[focusMetric] || "EDGE";
    const statusLine =
      status === "IN"   ? `Ton ${focusLabel} est dans ta zone. On ne touche à rien.`
    : status === "EDGE" ? `Ton ${focusLabel} est à la limite. Juste un petit recentrage.`
                        : `Ton ${focusLabel} sort de ta zone. On revient à l’essentiel.`;

    const confidenceLine =
      confidence >= 0.6
        ? "Tu sais déjà le faire: retrouve juste la sensation."
        : "Aujourd’hui, on vise le simple et répétable, pas le parfait.";

    const objectiveLine = this._objectiveLine(objective);

    // Mindset-first, no mechanics
    return [
      objectiveLine,
      statusLine,
      confidenceLine,
      `Score actuel: ${score20}/20. Cherche 1 swing “propre” plutôt qu’un swing “beau”.`,
    ].filter(Boolean).join(" ");
  }

  _objectiveLine(objective) {
    switch (objective) {
      case "REGULARITE":
        return "On joue la répétition: même rythme, même intention.";
      case "CALME":
        return "On joue le calme: respiration, intention, puis action.";
      case "ZONE":
        return "On joue la zone: rester dans tes tolérances, point.";
      case "SCORE":
        return "On joue le score: simple, maîtrisé, sans ego.";
      case "ROUTINE":
        return "On joue la routine: même script, même tempo mental.";
      default:
        return "On garde ça simple: un seul focus, et on répète.";
    }
  }

  _buildDrill({ focusMetric, objective }) {
    // 30-60 seconds, routine based, no mechanics cues
    const base = [
      "1) Inspire 4s, expire 6s (x2).",
      "2) Choisis une intention claire en 3 mots (ex: “calme, fluide, stable”).",
      "3) Fais 3 swings à 70% en respectant la routine.",
    ];

    const add = (() => {
      switch (focusMetric) {
        case "sequence":
          return "Focus: laisse le swing se déclencher naturellement, sans forcer. Cherche la sensation de fluidité.";
        case "stability":
          return "Focus: reste “posé”. Ton job: ne pas te précipiter.";
        case "ratio":
          return "Focus: backswing patient, retour décidé. Rythme, pas puissance.";
        case "tempo":
          return "Focus: joue ton tempo de référence, même si ça paraît lent.";
        case "impact":
          return "Focus: intention sur le moment de contact: simple, propre, sans chercher plus.";
        default:
          return "Focus: un swing propre, répété.";
      }
    })();

    const obj = objective === "SKIP" ? "" : "Objectif: ne juge pas le résultat, juge seulement si tu es dans ta zone.";

    return {
      durationSec: 60,
      steps: [...base, add, obj].filter(Boolean),
    };
  }

  _metricLabel(metricKey) {
    switch (metricKey) {
      case "tempo": return "tempo";
      case "ratio": return "ratio";
      case "sequence": return "enchaînement (bas → haut)";
      case "impact": return "timing d’impact";
      case "stability": return "stabilité";
      default: return metricKey;
    }
  }

  _adviceInvalidView(objective) {
    return {
      title: "Coach",
      message: "Je ne score pas cette vue: la caméra n’est pas assez cohérente. Reviens à la vue Face-On à hauteur, puis on reprend.",
      focusMetric: "view",
      drill: {
        durationSec: 30,
        steps: [
          "1) Replace-toi à hauteur, stable, même distance.",
          "2) Lance 1 swing test juste pour valider la vue.",
        ],
      },
      cta: "Quand la vue est OK, je reviens sur tes tolérances.",
    };
  }

  // ----------------------------
  // Remote payload (optional LLM)
  // ----------------------------
  _buildRemotePayload(faceOnResult, objective, history) {
    return {
      objective,
      result: faceOnResult,
      history,
      constraints: {
        tone: "mindset_encouraging_no_mechanics",
        language: "fr",
        maxWords: 90,
        oneFocusMetric: true,
      },
    };
  }

  _sanitizeRemote(data, objective) {
    // Ensure it respects “no mechanics”
    const forbidden = ["poignet", "shaft", "club", "plan de swing", "chemin", "extérieur", "intérieur"];
    const msg = String(data.message || "");
    const safe = forbidden.some(w => msg.toLowerCase().includes(w)) ? null : msg;

    if (!safe) {
      // fallback minimal safe wrapper
      data.message = this._objectiveLine(objective) + " Un seul focus, et on répète dans la zone.";
    }
    return data;
  }
}
