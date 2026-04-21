// =====================================================
// Parfect.golfr — Coach IA (ZEN compatible)
// - Input utilisateur = log local
// - Sortie coach = coachReact() UNIQUEMENT
// =====================================================

console.log("🧠 Coach IA (ZEN) chargé");

// -----------------------------------------------------
// Utils DOM
// -----------------------------------------------------
function $(id) {
  return document.getElementById(id);
}

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
function initCoachIA() {
  const input = $("coach-input");
  const send = $("coach-send");

  if (!input || !send) {
    console.warn("⚠️ Coach IA : input ou bouton manquant");
    return;
  }

  // Message d’accueil (UNE FOIS)
  if (!localStorage.getItem("coachIntroDone")) {
    coachReact("👋 Salut golfeur ! Je suis ton coach Parfect.golfr.");
    localStorage.setItem("coachIntroDone", "true");
  }

  send.addEventListener("click", () => onUserSend(input));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onUserSend(input);
  });
}

// -----------------------------------------------------
// USER → LOG LOCAL
// -----------------------------------------------------
function appendUserMessage(text) {
  const log = $("coach-user-log");
  if (!log) return;

  const clean = String(text || "").trim();
  if (!clean) return;

  const div = document.createElement("div");
  div.className = "msg user";
  div.textContent = clean;
  log.appendChild(div);

  log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
}

// -----------------------------------------------------
// USER INPUT HANDLER
// -----------------------------------------------------
function onUserSend(input) {
  const message = input.value.trim();
  if (!message) return;

  appendUserMessage(message);
  input.value = "";

  // Réponse coach (local ou IA)
  respondAsCoach(message);
}


window.requestCoach = async function ({
  mode = "generic",
  context = {},
  userMessage = "",
  uiTarget = "whisper"
}) {
  try {
    let response;

    switch (mode) {
      case "swing_analysis":
        response = await window.CoachModes.swing({ context, userMessage });
        break;

      case "training_session":
        response = await window.CoachModes.training({ context, userMessage });
        break;

      case "round_support":
        response = await window.CoachModes.round({ context, userMessage });
        break;

      default:
        response = {
          summary: "Je t’écoute. Dis-moi si tu veux parler swing, entraînement ou parcours."
        };
    }

    window.CoachMemory?.setLastResponse?.(response);

    const text = formatCoachResponseForUI(response, mode);
    window.coachReact?.(text);

    return response;
  } catch (err) {
    console.warn("requestCoach failed", err);
    const fallback = "Je suis là. On repart simple : une respiration, une intention, une action.";
    window.coachReact?.(fallback);
    return { summary: fallback, error: true };
  }
};

// -----------------------------------------------------
// COACH LOCAL (FAQ)
// -----------------------------------------------------
async function respondAsCoach(message) {
  if (!window.faqData) {
    try {
      const res = await fetch("./data/coach-faq.json");
      window.faqData = await res.json();
      console.log("📘 FAQ coach chargée");
    } catch {
      coachReact("Désolé, je ne trouve pas mes notes 😅");
      return;
    }
  }

  const lower = message.toLowerCase();
  let responses = null;

  for (const obj of Object.values(window.faqData)) {
    if (obj.keywords?.some(k => lower.includes(k))) {
      responses = obj.responses;
      break;
    }
  }

  const reply = responses
    ? responses[Math.floor(Math.random() * responses.length)]
    : "Peux-tu préciser si tu parles du swing, du mental ou de la stratégie ?";

  coachReact(reply);
}

// -----------------------------------------------------
// UI VISIBILITY
// -----------------------------------------------------
function showCoachIA(message = "") {
  const coach = $("coach-ia");
  if (coach) coach.style.display = "flex";
  if (message) coachReact(message);
}

function hideCoachIA() {
  const coach = $("coach-ia");
  if (coach) coach.style.display = "none";
}
function formatCoachResponseForUI(response, mode) {
  if (!response) return "Je t’écoute.";

  if (mode === "swing_analysis") {
    return [
      response.summary,
      ...(response.immediate_actions || []).slice(0, 2)
    ].join(" ");
  }

  if (mode === "training_session") {
    return [
      response.summary,
      response.session_focus ? `Focus : ${response.session_focus}.` : "",
      ...(response.immediate_actions || []).slice(0, 1)
    ].filter(Boolean).join(" ");
  }

  if (mode === "round_support") {
    return [
      response.summary,
      ...(response.reset_protocol || []).slice(0, 2)
    ].join(" ");
  }

  return response.summary || "Je t’écoute.";
}
// -----------------------------------------------------
// TOAST (inchangé)
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
// EXPORTS
// -----------------------------------------------------
window.initCoachIA = initCoachIA;
window.showCoachIA = showCoachIA;
window.hideCoachIA = hideCoachIA;
window.showCoachToast = showCoachToast;
