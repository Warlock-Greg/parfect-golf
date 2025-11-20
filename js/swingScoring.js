// === swingScoring.js ===
// Logique de score pour Just Swing (adresse + impact + finish)
// Utilise SwingMetrics (swingMetrics.js)

(function (global) {
  const SM = global.SwingMetrics;
  if (!SM) {
    console.warn("⚠️ SwingMetrics non trouvé. SwingScoring sera très limité.");
  }

  // --- Helpers math simples ---
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function score1D(value, ideal, tol, maxTol) {
    if (value == null || isNaN(value)) {
      return { score: 0, missing: true };
    }
    const d = Math.abs(value - ideal);
    if (d <= tol) return { score: 1, missing: false };
    if (d >= maxTol) return { score: 0, missing: false };
    const s = 1 - (d - tol) / (maxTol - tol);
    return { score: clamp(s, 0, 1), missing: false };
  }

  function weightedPhaseScore(metricsActual, template) {
    let sumW = 0;
    let sum = 0;
    const details = {};

    Object.keys(template).forEach((key) => {
      const cfg = template[key];
      const val = metricsActual[key];
      const { score, missing } = score1D(
        val,
        cfg.ideal,
        cfg.tol,
        cfg.maxTol
      );
      const w = cfg.weight || 1;
      if (!missing) {
        sumW += w;
        sum += score * w;
      }
      details[key] = {
        value: val,
        ideal: cfg.ideal,
        score: Math.round(score * 100),
      };
    });

    const pct = sumW > 0 ? (sum / sumW) * 100 : 0;
    return { percent: pct, details };
  }

  // --- Types de swing (logique simple) ---
  function guessSwingType(clubType, mode) {
    const c = (clubType || "").toLowerCase();

    if (mode === "putt" || c.includes("putt")) return "putt";
    if (c.includes("driver") || c.includes("bois")) return "driver";
    if (c.includes("chip")) return "chip";
    if (c.includes("wedge") || c === "pw" || c === "sw") return "wedge";
    if (c.includes("approach") || c.includes("appr") || c.includes("hybride"))
      return "approach";
    if (c.includes("fer")) return "iron";

    return "iron";
  }

  // --- Templates par type de swing ---
  // On reste volontairement simple : 3 métriques par phase
  const TEMPLATES = {
    driver: {
      address: {
        spineTilt: { ideal: 32, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: -2, tol: 5, maxTol: 15, weight: 0.3 },
        weightLeft: { ideal: 55, tol: 8, maxTol: 20, weight: 0.3 },
      },
      impact: {
        spineTilt: { ideal: 30, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 2, tol: 6, maxTol: 18, weight: 0.3 },
        weightLeft: { ideal: 65, tol: 8, maxTol: 20, weight: 0.3 },
      },
      finish: {
        spineTilt: { ideal: 15, tol: 8, maxTol: 25, weight: 0.3 },
        weightLeft: { ideal: 80, tol: 10, maxTol: 25, weight: 0.4 },
        comCenter: { ideal: 0, tol: 10, maxTol: 30, weight: 0.3 }, // "centré" sur l'axe des pieds
      },
    },
    iron: {
      address: {
        spineTilt: { ideal: 30, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 6, tol: 5, maxTol: 15, weight: 0.3 },
        weightLeft: { ideal: 55, tol: 8, maxTol: 20, weight: 0.3 },
      },
      impact: {
        spineTilt: { ideal: 32, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 10, tol: 6, maxTol: 18, weight: 0.3 },
        weightLeft: { ideal: 70, tol: 8, maxTol: 20, weight: 0.3 },
      },
      finish: {
        spineTilt: { ideal: 18, tol: 8, maxTol: 25, weight: 0.3 },
        weightLeft: { ideal: 85, tol: 10, maxTol: 25, weight: 0.4 },
        comCenter: { ideal: 0, tol: 10, maxTol: 30, weight: 0.3 },
      },
    },
    approach: {
      address: {
        spineTilt: { ideal: 32, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 8, tol: 5, maxTol: 15, weight: 0.3 },
        weightLeft: { ideal: 60, tol: 8, maxTol: 20, weight: 0.3 },
      },
      impact: {
        spineTilt: { ideal: 34, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 12, tol: 6, maxTol: 18, weight: 0.3 },
        weightLeft: { ideal: 75, tol: 8, maxTol: 20, weight: 0.3 },
      },
      finish: {
        spineTilt: { ideal: 20, tol: 8, maxTol: 25, weight: 0.3 },
        weightLeft: { ideal: 85, tol: 10, maxTol: 25, weight: 0.4 },
        comCenter: { ideal: 0, tol: 10, maxTol: 30, weight: 0.3 },
      },
    },
    wedge: {
      address: {
        spineTilt: { ideal: 34, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 10, tol: 5, maxTol: 15, weight: 0.3 },
        weightLeft: { ideal: 60, tol: 8, maxTol: 20, weight: 0.3 },
      },
      impact: {
        spineTilt: { ideal: 36, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 14, tol: 6, maxTol: 18, weight: 0.3 },
        weightLeft: { ideal: 78, tol: 8, maxTol: 20, weight: 0.3 },
      },
      finish: {
        spineTilt: { ideal: 22, tol: 8, maxTol: 25, weight: 0.3 },
        weightLeft: { ideal: 88, tol: 10, maxTol: 25, weight: 0.4 },
        comCenter: { ideal: 0, tol: 10, maxTol: 30, weight: 0.3 },
      },
    },
    chip: {
      address: {
        spineTilt: { ideal: 36, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 12, tol: 5, maxTol: 15, weight: 0.3 },
        weightLeft: { ideal: 65, tol: 8, maxTol: 20, weight: 0.3 },
      },
      impact: {
        spineTilt: { ideal: 38, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 16, tol: 6, maxTol: 18, weight: 0.3 },
        weightLeft: { ideal: 80, tol: 8, maxTol: 20, weight: 0.3 },
      },
      finish: {
        spineTilt: { ideal: 24, tol: 8, maxTol: 25, weight: 0.3 },
        weightLeft: { ideal: 90, tol: 10, maxTol: 25, weight: 0.4 },
        comCenter: { ideal: 0, tol: 10, maxTol: 30, weight: 0.3 },
      },
    },
    putt: {
      address: {
        spineTilt: { ideal: 40, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 3, tol: 4, maxTol: 12, weight: 0.3 },
        weightLeft: { ideal: 55, tol: 8, maxTol: 20, weight: 0.3 },
      },
      impact: {
        spineTilt: { ideal: 40, tol: 6, maxTol: 16, weight: 0.4 },
        handForward: { ideal: 4, tol: 4, maxTol: 12, weight: 0.3 },
        weightLeft: { ideal: 58, tol: 8, maxTol: 20, weight: 0.3 },
      },
      finish: {
        spineTilt: { ideal: 38, tol: 8, maxTol: 20, weight: 0.4 },
        weightLeft: { ideal: 60, tol: 10, maxTol: 25, weight: 0.3 },
        comCenter: { ideal: 0, tol: 10, maxTol: 30, weight: 0.3 },
      },
    },
  };

  // --- Extraction des métriques d'une pose ---
  function extractMetrics(lm) {
    if (!lm || !SM) return null;

    const spineTilt = SM.computeSpineTilt(lm);
    const handForward = SM.computeHandForward(lm);
    const wlr = SM.computeWeightLeftRight(lm);
    const com = SM.computeCenterOfMass(lm);

    // comCenter = combien le centre est proche de l’axe entre les deux pieds (0 = parfait)
    let comCenter = null;
    if (wlr && com) {
      // très simplifié : on considère que 50/50 = centre “0”
      comCenter = (wlr.left - 50); // en % ; on score la proximité de 0
    }

    return {
      spineTilt,
      handForward,
      weightLeft: wlr ? wlr.left : null,
      comCenter,
    };
  }

  // --- Score global ---
  function scoreSwingFromPhases({ phases, clubType, mode }) {
    const swingType = guessSwingType(clubType, mode);
    const tpl = TEMPLATES[swingType] || TEMPLATES.iron;

    const addressLm = phases.address || null;
    const impactLm = phases.impact || null;
    const finishLm = phases.finish || null;

    const addrMetrics = extractMetrics(addressLm) || {};
    const impactMetrics = extractMetrics(impactLm) || {};
    const finishMetrics = extractMetrics(finishLm) || {};

    const addressScore = weightedPhaseScore(addrMetrics, tpl.address);
    const impactScore = weightedPhaseScore(impactMetrics, tpl.impact);
    const finishScore = weightedPhaseScore(finishMetrics, tpl.finish);

    // Technique 0–60 : 40% adresse, 40% impact, 20% finish
    const techRaw =
      addressScore.percent * 0.4 +
      impactScore.percent * 0.4 +
      finishScore.percent * 0.2;
    const techniqueScore = Math.round((techRaw / 100) * 60);

    // Impact 0–20 (on reprend surtout la phase impact)
    const impactComponent = Math.round((impactScore.percent / 100) * 20);

    // Routine 0–20 : très simple pour l’instant (présence des phases)
    let routineScore = 8;
    if (addressLm && finishLm) routineScore = 14;
    if (addressLm && impactLm && finishLm) routineScore = 18;

    const total = clamp(
      routineScore + techniqueScore + impactComponent,
      0,
      100
    );

    const breakdown = {
      routineScore,
      techniqueScore,
      impactScore: impactComponent,
      phases: {
        address: Math.round(addressScore.percent),
        impact: Math.round(impactScore.percent),
        finish: Math.round(finishScore.percent),
      },
      swingType,
    };

    const comment = buildCoachComment(total, breakdown, swingType, clubType);

    return {
      total,
      routineScore,
      techniqueScore,
      impactScore: impactComponent,
      breakdown,
      swingType,
      clubType,
      comment,
    };
  }

  // --- Commentaire coach générique (coach mental) ---
  function buildCoachComment(total, breakdown, swingType, clubType) {
    let intro = "";
    if (total >= 85) {
      intro =
        "Incroyable 🔥 Tu déroules une routine et un mouvement vraiment au point. C’est du niveau très solide.";
    } else if (total >= 70) {
      intro =
        "Très beau swing 👌 La base est saine, tu peux viser la constance sans tout changer.";
    } else if (total >= 55) {
      intro =
        "C’est une bonne base, tu construis quelque chose de fiable 💪 On va stabiliser un ou deux points clés.";
    } else {
      intro =
        "Tu as le bon réflexe de t’entraîner 📈 On va clarifier un repère à la fois, sans te noyer dans la technique.";
    }

    // Focus principal
    const addr = breakdown.phases.address;
    const imp = breakdown.phases.impact;
    const fin = breakdown.phases.finish;

    let focus = "";
    if (imp < 60) {
      focus =
        "Priorité : la zone d’impact. Pense surtout à ta pression vers l’avant et à des mains légèrement en avant au moment de frapper.";
    } else if (addr < 60) {
      focus =
        "Priorité : la position à l’adresse. Si tu es bien posé au départ, une grande partie du swing se simplifie.";
    } else if (fin < 60) {
      focus =
        "Regarde ton finish : finir en équilibre, face à la cible, c’est souvent le signe que tout le reste est fluide.";
    } else {
      focus =
        "Tu peux maintenant te concentrer sur le rythme et la répétition. Le corps sait quoi faire, il faut juste lui laisser la place.";
    }

    const typeTxt =
      swingType === "putt"
        ? "sur le putting"
        : swingType === "chip" || swingType === "wedge"
        ? "sur le petit jeu"
        : "sur tes pleins coups";

    return (
      intro +
      "\n\n" +
      `🎯 Ici je te regarde surtout ${typeTxt}. ` +
      focus
    );
  }

  global.SwingScoring = {
    scoreSwingFromPhases,
  };
})(window);

