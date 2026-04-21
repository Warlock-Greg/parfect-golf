// =====================================================
// Parfect.golfr — Coach IA Orchestrateur (ZEN compatible)
// - UI gérée par coach-zen.js
// - Sortie coach = coachReact() UNIQUEMENT
// - Ce fichier ne bind PAS l'input
// =====================================================

console.log("🧠 Coach IA Orchestrateur chargé");

// -----------------------------------------------------
// Utils
// -----------------------------------------------------
function $(id) {
  return document.getElementById(id);
}

function cleanText(value) {
  return String(value || "").trim();
}

function isVisible(el) {
  if (!el) return false;
  return el.style.display !== "none";
}

// -----------------------------------------------------
// Intro message (une seule fois)
// -----------------------------------------------------
function initCoachIA() {
  if (!localStorage.getItem("coachIntroDone")) {
    window.coachReact?.("👋 Salut golfeur ! Je suis ton coach Parfect.golfr.");
    localStorage.setItem("coachIntroDone", "true");
  }
}

// -----------------------------------------------------
// Détection du mode coach selon contexte + message
// -----------------------------------------------------
function detectCoachModeFromRouteAndMessage(message) {
  const lower = cleanText(message).toLowerCase();

  const swingReview = $("swing-review");
  const trainingArea = $("training-area");
  const gameArea = $("game-area");

  if (
    lower.includes("swing") ||
    lower.includes("rotation") ||
    lower.includes("tempo") ||
    lower.includes("backswing") ||
    lower.includes("downswing") ||
    lower.includes("impact") ||
    lower.includes("extension") ||
    isVisible(swingReview)
  ) {
    return "swing_analysis";
  }

  if (
    lower.includes("entrainement") ||
    lower.includes("entraînement") ||
    lower.includes("routine") ||
    lower.includes("focus") ||
    lower.includes("régularité") ||
    lower.includes("regularite") ||
    lower.includes("séance") ||
    lower.includes("seance") ||
    isVisible(trainingArea)
  ) {
    return "training_session";
  }

  if (
    lower.includes("parcours") ||
    lower.includes("partie") ||
    lower.includes("mental") ||
    lower.includes("craqué") ||
    lower.includes("craque") ||
    lower.includes("explosé") ||
    lower.includes("explose") ||
    lower.includes("frustré") ||
    lower.includes("frustre") ||
    lower.includes("recentre") ||
    lower.includes("recentrer") ||
    lower.includes("trou") ||
    lower.includes("drive") ||
    lower.includes("putt") ||
    isVisible(gameArea)
  ) {
    return "round_support";
  }

  return "generic";
}

// -----------------------------------------------------
// Formatage UI selon mode
// -----------------------------------------------------
function formatCoachResponseForUI(response, mode) {
  if (!response) return "Je t’écoute.";

  if (typeof response === "string") return response;

  if (mode === "swing_analysis") {
    return [
      response.summary,
      ...(Array.isArray(response.immediate_actions)
        ? response.immediate_actions.slice(0, 2)
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
        ? response.immediate_actions.slice(0, 1)
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
        : [])
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
// FAQ fallback générique
// -----------------------------------------------------
async function respondCoachGeneric(message) {
  if (!window.faqData) {
    try {
      const res = await fetch("./data/coach-faq.json");
      window.faqData = await res.json();
      console.log("📘 FAQ coach chargée");
    } catch (err) {
      console.warn("FAQ coach indisponible", err);
      return {
        summary: "Désolé, je ne trouve pas mes notes. Dis-moi si tu veux parler swing, entraînement ou parcours."
      };
    }
  }

  const lower = cleanText(message).toLowerCase();
  let responses = null;

  for (const obj of Object.values(window.faqData || {})) {
    if (obj?.keywords?.some((k) => lower.includes(String(k).toLowerCase()))) {
      responses = obj.responses;
      break;
    }
  }

  const reply = responses?.length
    ? responses[Math.floor(Math.random() * responses.length)]
    : "Peux-tu préciser si tu parles du swing, de l’entraînement ou du parcours ?";

  return {
    summary: reply
  };
}

// -----------------------------------------------------
// Point d’entrée unique pour les réponses coach
// -----------------------------------------------------
window.requestCoach = async function ({
  mode = "generic",
  context = {},
  userMessage = "",
  uiTarget = "whisper"
} = {}) {
  try {
    let response;

    switch (mode) {
      case "swing_analysis":
        if (window.CoachModes?.swing) {
          response = await window.CoachModes.swing({ context, userMessage });
        } else {
          response = await respondCoachGeneric(userMessage);
        }
        break;

      case "training_session":
        if (window.CoachModes?.training) {
          response = await window.CoachModes.training({ context, userMessage });
        } else {
          response = await respondCoachGeneric(userMessage);
        }
        break;

      case "round_support":
        if (window.CoachModes?.round) {
          response = await window.CoachModes.round({ context, userMessage });
        } else {
          response = await respondCoachGeneric(userMessage);
        }
        break;

      default:
        response = await respondCoachGeneric(userMessage);
        break;
    }

    window.CoachMemory?.setLastResponse?.(response);

    const text = formatCoachResponseForUI(response, mode);

    if (uiTarget === "whisper") {
      window.coachReact?.(text);
    }

    return response;
  } catch (err) {
    console.warn("requestCoach failed", err);

    const fallback =
      "Je suis là. On repart simple : une respiration, une intention, une action.";

    window.coachReact?.(fallback);

    return {
      summary: fallback,
      error: true
    };
  }
};

// -----------------------------------------------------
// Point d’entrée texte libre appelé par coach-zen.js
// -----------------------------------------------------
window.respondAsCoach = async function (message) {
  const clean = cleanText(message);
  if (!clean) return null;

  const mode = detectCoachModeFromRouteAndMessage(clean);
  const context =
    window.CoachContextFactory?.fromCurrentAppState?.(mode) || {};

  return window.requestCoach({
    mode,
    context,
    userMessage: clean,
    uiTarget: "whisper"
  });
};

// -----------------------------------------------------
// UI visibility
// -----------------------------------------------------
function showCoachIA(message = "") {
  const coach = $("coach-ia");
  if (coach) coach.style.display = "flex";
  if (message) window.coachReact?.(message);
}

function hideCoachIA() {
  const coach = $("coach-ia");
  if (coach) coach.style.display = "none";
}

// -----------------------------------------------------
// Toast
// -----------------------------------------------------
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

// auto init légère
document.addEventListener("DOMContentLoaded", () => {
  initCoachIA();
});
