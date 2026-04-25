// =====================================================
// Parfect.golfr — Coach IA Orchestrateur V3
// - Compatible coach-zen.js
// - Ne bind PAS l'input
// - Route vers swing / training / round
// - Injecte base contrôlée PARFECT_COACH_KNOWLEDGE_V2
// - Gère premium/free
// - Supporte uiTarget: whisper | chat | silent
// =====================================================

console.log("🧠 Coach IA Orchestrateur V3 chargé");

// -----------------------------------------------------
// Utils
// -----------------------------------------------------
function $(id) {
  return document.getElementById(id);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isVisible(el) {
  if (!el) return false;
  return el.style.display !== "none";
}

function isPremiumUser() {
  const licence = String(window.userLicence?.licence || "").toLowerCase();
  return ["pro", "premium", "paid", "founder"].includes(licence);
}

// -----------------------------------------------------
// Init
// -----------------------------------------------------
function initCoachIA() {
  if (!localStorage.getItem("coachIntroDone")) {
    window.coachReact?.(
      "👋 Coach IA prêt. Pose-moi une question swing, entraînement ou parcours."
    );
    localStorage.setItem("coachIntroDone", "true");
  }
}

// -----------------------------------------------------
// Mode detection
// -----------------------------------------------------
function detectCoachModeFromRouteAndMessage(message) {
  const lower = cleanText(message).toLowerCase();

  const swingReview = $("swing-review");
  const trainingArea = $("training-area");
  const gameArea = $("game-area");

  if (
    lower.includes("swing") ||
    lower.includes("tempo") ||
    lower.includes("rotation") ||
    lower.includes("triangle") ||
    lower.includes("impact") ||
    lower.includes("extension") ||
    lower.includes("backswing") ||
    lower.includes("downswing") ||
    lower.includes("justswing") ||
    lower.includes("just swing") ||
    isVisible(swingReview)
  ) {
    return "swing_analysis";
  }

  if (
    lower.includes("entrainement") ||
    lower.includes("entraînement") ||
    lower.includes("séance") ||
    lower.includes("seance") ||
    lower.includes("drill") ||
    lower.includes("routine") ||
    lower.includes("focus") ||
    lower.includes("maison") ||
    lower.includes("cuisine") ||
    isVisible(trainingArea)
  ) {
    return "training_session";
  }

  if (
    lower.includes("parcours") ||
    lower.includes("partie") ||
    lower.includes("mental") ||
    lower.includes("caddy") ||
    lower.includes("club") ||
    lower.includes("prochain coup") ||
    lower.includes("danger") ||
    lower.includes("vent") ||
    lower.includes("lie") ||
    lower.includes("double") ||
    lower.includes("trou") ||
    lower.includes("putt") ||
    lower.includes("drive") ||
    lower.includes("recentr") ||
    lower.includes("craqu") ||
    lower.includes("frustr") ||
    isVisible(gameArea)
  ) {
    return "round_support";
  }

  return "generic";
}

// -----------------------------------------------------
// Knowledge controlled grounding
// -----------------------------------------------------
function getControlledKnowledgeSources() {
  return window.PARFECT_COACH_KNOWLEDGE_V2?.sources || [];
}

function getAnswerRules() {
  const sources = getControlledKnowledgeSources();
  const rules = sources.find(s => s.answer_rules)?.answer_rules;

  return rules || {
    never_say: [],
    always_do: []
  };
}

function detectKnowledgeTopics(message, mode) {
  const m = cleanText(message).toLowerCase();
  const topics = [];

  const add = (domain, key) => {
    const id = `${domain}.${key}`;
    if (!topics.some((x) => `${x[0]}.${x[1]}` === id)) {
      topics.push([domain, key]);
    }
  };

  // Swing
  if (mode === "swing_analysis" || m.includes("tempo") || m.includes("rythme")) {
    add("swing", "tempo");
  }

  if (
    mode === "swing_analysis" ||
    m.includes("rotation") ||
    m.includes("épaule") ||
    m.includes("epaule")
  ) {
    add("swing", "rotation");
  }

  if (
    mode === "swing_analysis" ||
    m.includes("triangle") ||
    m.includes("connexion") ||
    m.includes("bras")
  ) {
    add("swing", "triangle");
  }

  if (
    mode === "swing_analysis" ||
    m.includes("transfert") ||
    m.includes("appui") ||
    m.includes("poids")
  ) {
    add("swing", "weightShift");
  }

  if (mode === "swing_analysis" || m.includes("extension") || m.includes("release")) {
    add("swing", "extension");
  }

  if (
    mode === "swing_analysis" ||
    m.includes("équilibre") ||
    m.includes("equilibre") ||
    m.includes("balance") ||
    m.includes("finish")
  ) {
    add("swing", "balance");
  }

  // Training / mental
  if (
    mode === "training_session" ||
    mode === "round_support" ||
    m.includes("routine")
  ) {
    add("mental", "routine");
  }

  if (
    mode === "training_session" ||
    mode === "round_support" ||
    m.includes("stress") ||
    m.includes("pression") ||
    m.includes("confiance")
  ) {
    add("mental", "pressure");
  }

  if (
    mode === "round_support" ||
    m.includes("mauvais coup") ||
    m.includes("raté") ||
    m.includes("rate") ||
    m.includes("double") ||
    m.includes("triple")
  ) {
    add("mental", "postBadShot");
  }

  // Caddy
  if (
    mode === "round_support" ||
    m.includes("caddy") ||
    m.includes("club") ||
    m.includes("danger") ||
    m.includes("vent") ||
    m.includes("lie") ||
    m.includes("prochain coup")
  ) {
    add("caddy", "decisionFramework");
    add("caddy", "clubChoice");
    add("caddy", "onCourseModes");
  }

  return topics;
}

function flattenKnowledgeBlock(path, block) {
  if (!block) return null;

  const parts = [];

  if (block.goal) parts.push(`Objectif : ${block.goal}`);
  if (Array.isArray(block.detects)) parts.push(`Détecte : ${block.detects.join(" ; ")}`);
  if (Array.isArray(block.principles)) parts.push(`Principes : ${block.principles.join(" ; ")}`);
  if (Array.isArray(block.drills)) parts.push(`Drills : ${block.drills.join(" ; ")}`);
  if (Array.isArray(block.script)) parts.push(`Script : ${block.script.join(" ; ")}`);
  if (Array.isArray(block.reset)) parts.push(`Reset : ${block.reset.join(" ; ")}`);
  if (Array.isArray(block.questions)) parts.push(`Questions : ${block.questions.join(" ; ")}`);
  if (Array.isArray(block.rules)) parts.push(`Règles : ${block.rules.join(" ; ")}`);
  if (block.defaultAnswer) parts.push(`Réponse par défaut : ${block.defaultAnswer}`);
  if (Array.isArray(block.betweenTwoClubs)) {
    parts.push(`Entre deux clubs : ${block.betweenTwoClubs.join(" ; ")}`);
  }

  if (typeof block === "string") {
    parts.push(block);
  }

  const content = parts.join("\n").trim();
  if (!content) return null;

  return {
    source: `PARFECT_COACH_KNOWLEDGE_V2.${path.join(".")}`,
    content
  };
}

function resolveCoachTypeFromMode(mode) {
  if (mode === "swing_analysis") return "swing";
  if (mode === "training_session") return "training";
  if (mode === "round_support") return "caddy";
  return "mental";
}

function detectWeakMetricFromContext(context = {}) {
  const breakdown =
    context?.analysis_context?.breakdown ||
    context?.breakdown ||
    {};

  const order = ["tempo", "rotation", "triangle", "weightShift", "extension", "balance"];

  const candidates = order
    .map(key => ({
      key,
      score: breakdown?.[key]?.score
    }))
    .filter(x => typeof x.score === "number");

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0].key;
}

function buildKnowledgeContext(message, mode, context = {}) {
  const coachType = resolveCoachTypeFromMode(mode);
  const weakMetric = detectWeakMetricFromContext(context);

  const query = [
    cleanText(message).toLowerCase(),
    weakMetric
  ].filter(Boolean).join(" ");

  const files = getControlledKnowledgeSources()
    .filter(s => s.validated === true)
    .filter(s => s.coach_type === coachType);

  const selected = [];

  files.forEach(file => {
    // 1. Sources externes
    (file.sources || []).forEach(src => {
      const tags = (src.tags || []).map(t => String(t).toLowerCase());

      const match =
        tags.some(tag => query.includes(tag)) ||
        (weakMetric && tags.includes(String(weakMetric).toLowerCase()));

      if (match) {
        selected.push({
          source_id: src.id,
          source_name: src.source_name,
          source_url: src.source_url,
          tags: src.tags || [],
          chunks: (src.chunks || []).slice(0, 2),
          drills: (src.drills || []).slice(0, 1)
        });
      }
    });

    // 2. Mapping métrique swing
    if (weakMetric && file.metric_mapping?.[weakMetric]) {
      selected.unshift({
        source_id: `metric_mapping.${weakMetric}`,
        source_name: `Parfect metric mapping ${weakMetric}`,
        tags: [weakMetric],
        chunks: [
          {
            text: file.metric_mapping[weakMetric].default_priority,
            coach_use: file.metric_mapping[weakMetric].goal
          }
        ],
        drills: [file.metric_mapping[weakMetric].default_drill]
      });
    }

    // 3. Training exercise library
    if (coachType === "training" && Array.isArray(file.exercise_library)) {
      const exercise = file.exercise_library.find(ex =>
        (ex.tags || []).some(tag => query.includes(String(tag).toLowerCase()))
      );

      if (exercise) {
        selected.unshift({
          source_id: exercise.id,
          source_name: exercise.name,
          tags: exercise.tags || [],
          exercise
        });
      }
    }
  });

  return {
    coach_type: coachType,
    weak_metric: weakMetric,
    chunks: selected.slice(0, 3)
  };
}

// -----------------------------------------------------
// Context enrichment
// -----------------------------------------------------
function getBaseContextForMode(mode) {
  return window.CoachContextFactory?.fromCurrentAppState?.(mode) || {};
}

function enrichCoachContext({ mode, context, userMessage }) {
  const premium = isPremiumUser();
  const knowledgeContext = buildKnowledgeContext(userMessage, mode, context);

  console.log("🧠 Coach Knowledge V2 used", knowledgeContext);
  return {
    ...(context || {}),

    premium_context: {
      is_premium: premium,
      licence: window.userLicence?.licence || "free",
      email: window.userLicence?.email || null
    },

    knowledge_context: knowledge_context: buildKnowledgeContext(userMessage, mode, context),

    answer_rules: getAnswerRules(),

    product_context: {
      app: "Parfect.golfr",
      module: "JustSwing",
      instruction:
        "Tu es intégré à JustSwing. Ne demande jamais de landmarks, JSON ou vidéo. Si des données manquent, dis d’utiliser JustSwing et que tu aideras à partir de l’analyse.",
      home_training:
        "Tu peux recommander de poser le téléphone sur un plan de travail ou un support stable et de faire des swings sans club à la maison."
    }
  };
}

// -----------------------------------------------------
// Output formatting
// -----------------------------------------------------
function formatCoachResponseForUI(response, mode) {
  if (!response) return "Je t’écoute.";
  if (typeof response === "string") return response;

  if (mode === "swing_analysis") {
    return [
      response.summary,
      ...(Array.isArray(response.immediate_actions)
        ? response.immediate_actions.slice(0, 2)
        : []),
      ...(Array.isArray(response.home_drills)
        ? response.home_drills.slice(0, 1)
        : Array.isArray(response.drill)
        ? response.drill.slice(0, 1)
        : [])
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (mode === "training_session") {
    return [
      response.summary,
      response.session_focus ? `Focus : ${response.session_focus}.` : "",
      ...(Array.isArray(response.immediate_actions)
        ? response.immediate_actions.slice(0, 2)
        : []),
      ...(Array.isArray(response.block_plan)
        ? response.block_plan.slice(0, 1)
        : [])
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (mode === "round_support") {
    return [
      response.summary,
      ...(Array.isArray(response.reset_protocol)
        ? response.reset_protocol.slice(0, 2)
        : []),
      response.next_shot_intention
        ? `Intention : ${response.next_shot_intention}`
        : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  return (
    response.summary ||
    response.message ||
    "Je t’écoute. Dis-moi si tu veux parler swing, entraînement ou parcours."
  );
}

// -----------------------------------------------------
// Local fallback
// -----------------------------------------------------
async function respondCoachGeneric(message) {
  return {
    summary:
      "Je t’écoute. Pour une réponse plus précise, dis-moi si tu veux parler swing, entraînement ou parcours."
  };
}

// -----------------------------------------------------
// Coach state
// -----------------------------------------------------
window.__CoachState = window.__CoachState || {
  lastMode: null,
  lastContext: null,
  lastResponse: null,
  lastUiTarget: "whisper"
};

function setCoachState({ mode, context, response, uiTarget }) {
  window.__CoachState.lastMode = mode || window.__CoachState.lastMode;
  window.__CoachState.lastContext = context || window.__CoachState.lastContext;
  window.__CoachState.lastResponse = response || window.__CoachState.lastResponse;
  window.__CoachState.lastUiTarget = uiTarget || window.__CoachState.lastUiTarget;
}

function getLastCoachMode() {
  return window.__CoachState?.lastMode || "generic";
}

function getLastCoachContext() {
  return window.__CoachState?.lastContext || {};
}

// -----------------------------------------------------
// Quick actions adaptatives
// -----------------------------------------------------
function getQuickActionsForMode(mode) {
  if (mode === "round_support") {
    return [
      {
        key: "reset",
        label: "🧘 Recentre-moi",
        message: "Aide-moi à me recentrer mentalement maintenant"
      },
      {
        key: "plan",
        label: "🎯 Plan simple",
        message: "Donne-moi un plan simple pour le prochain coup"
      },
      {
        key: "explain",
        label: "🔁 Explique autrement",
        message: "Explique-moi autrement et plus simplement"
      }
    ];
  }

  if (mode === "training_session") {
    return [
      {
        key: "home",
        label: "📱 Maison + JustSwing",
        message:
          "Explique-moi comment m'entraîner à la maison avec JustSwing, téléphone posé sur un plan de travail, en faisant des swings sans club"
      },
      {
        key: "drill",
        label: "🏋️ Drill simple",
        message: "Donne-moi un drill simple pour continuer la séance"
      },
      {
        key: "explain",
        label: "🔁 Explique autrement",
        message: "Explique-moi autrement et plus simplement"
      }
    ];
  }

  if (mode === "swing_analysis") {
    return [
      {
        key: "priority",
        label: "🎯 Priorité",
        message: "Quelle est ma priorité absolue sur ce swing ?"
      },
      {
        key: "home",
        label: "📱 Avec JustSwing",
        message:
          "Explique-moi comment travailler ce point avec JustSwing à la maison, téléphone posé sur un plan de travail et swings sans club"
      },
      {
        key: "drill",
        label: "🏋️ Drill",
        message: "Donne-moi un drill simple pour corriger ce swing"
      }
    ];
  }

  return [
    {
      key: "explain",
      label: "🔁 Explique autrement",
      message: "Explique-moi autrement et plus simplement"
    }
  ];
}

function clearExistingQuickActions() {
  document.querySelectorAll(".coach-quick-actions").forEach((el) => el.remove());
}

function renderCoachQuickActions(mode = getLastCoachMode()) {
  const log = $("coach-user-log");
  if (!log) return;

  const actions = getQuickActionsForMode(mode);
  if (!actions.length) return;

  clearExistingQuickActions();

  const container = document.createElement("div");
  container.className = "coach-quick-actions";

  actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.action = action.key;
    btn.textContent = action.label;

    btn.addEventListener("click", async () => {
      await window.requestCoach({
        mode: getLastCoachMode(),
        context: getLastCoachContext(),
        userMessage: action.message,
        uiTarget: "chat",
        openChat: true
      });
    });

    container.appendChild(btn);
  });

  log.appendChild(container);
  log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
}

// -----------------------------------------------------
// Display output
// -----------------------------------------------------
function displayCoachOutput({ text, mode, uiTarget, openChat }) {
  if (!text) return;

  if (uiTarget === "silent") return;

  if (uiTarget === "chat") {
    window.sendCoachToChat?.(text, { open: !!openChat });
    renderCoachQuickActions(mode);
    return;
  }

  window.coachReact?.(text);
}

// -----------------------------------------------------
// Main API
// -----------------------------------------------------
window.requestCoach = async function ({
  mode = "generic",
  context = {},
  userMessage = "",
  uiTarget = "whisper",
  openChat = false
} = {}) {
  try {
    const enrichedContext = enrichCoachContext({
      mode,
      context,
      userMessage
    });

    let response;

    if (mode === "swing_analysis") {
      response = window.CoachModes?.swing
        ? await window.CoachModes.swing({
            context: enrichedContext,
            userMessage
          })
        : await respondCoachGeneric(userMessage);
    } else if (mode === "training_session") {
      response = window.CoachModes?.training
        ? await window.CoachModes.training({
            context: enrichedContext,
            userMessage
          })
        : await respondCoachGeneric(userMessage);
    } else if (mode === "round_support") {
      response = window.CoachModes?.round
        ? await window.CoachModes.round({
            context: enrichedContext,
            userMessage
          })
        : await respondCoachGeneric(userMessage);
    } else {
      response = await respondCoachGeneric(userMessage);
    }

    window.CoachMemory?.setLastResponse?.(response);

    setCoachState({
      mode,
      context: enrichedContext,
      response,
      uiTarget
    });

    const text = formatCoachResponseForUI(response, mode);

    displayCoachOutput({
      text,
      mode,
      uiTarget,
      openChat
    });

    return response;
  } catch (err) {
    console.warn("requestCoach failed", err);

    const fallback =
      "Je suis là. On repart simple : une respiration, une intention, une action.";

    displayCoachOutput({
      text: fallback,
      mode,
      uiTarget,
      openChat
    });

    return {
      error: true,
      summary: fallback
    };
  }
};

// -----------------------------------------------------
// Entry point called by coach-zen.js
// -----------------------------------------------------
window.respondAsCoach = async function (message) {
  const clean = cleanText(message);
  if (!clean) return null;

  const mode = detectCoachModeFromRouteAndMessage(clean);
  const baseContext = getBaseContextForMode(mode);

  return window.requestCoach({
    mode,
    context: baseContext,
    userMessage: clean,
    uiTarget: "chat",
    openChat: true
  });
};

// -----------------------------------------------------
// UI helpers
// -----------------------------------------------------
function showCoachIA(message = "") {
  if (typeof window.expandCoachIA === "function") {
    window.expandCoachIA();
  } else {
    const coach = $("coach-ia");
    if (coach) coach.style.display = "flex";
  }

  if (message) window.coachReact?.(message);
}

function hideCoachIA() {
  if (typeof window.collapseCoachIA === "function") {
    window.collapseCoachIA();
  } else {
    const coach = $("coach-ia");
    if (coach) coach.style.display = "none";
  }
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
// Exports
// -----------------------------------------------------
window.initCoachIA = initCoachIA;
window.showCoachIA = showCoachIA;
window.hideCoachIA = hideCoachIA;
window.showCoachToast = showCoachToast;
window.renderCoachQuickActions = renderCoachQuickActions;

// -----------------------------------------------------
// Auto init
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initCoachIA();
});
