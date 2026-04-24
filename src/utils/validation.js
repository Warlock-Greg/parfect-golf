export function ensureObject(value, label = "payload") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

export function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function extractTextFromResponse(response) {
  if (!response) return "";
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const output = response.output || [];
  for (const item of output) {
    const content = item?.content || [];
    for (const block of content) {
      if (typeof block?.text === "string" && block.text.trim()) {
        return block.text.trim();
      }
    }
  }

  return "";
}


export function ensureObject(value, label = "payload") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

export function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function extractTextFromResponse(response) {
  if (!response) return "";

  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const output = response.output || [];
  for (const item of output) {
    const content = item?.content || [];
    for (const block of content) {
      if (typeof block?.text === "string" && block.text.trim()) {
        return block.text.trim();
      }
    }
  }

  return "";
}

export function sanitizeCoachText(text = "") {
  let out = String(text || "");

  const forbiddenPatterns = [
    /envoie l['’]analyse biomécanique complète/gi,
    /envoyez l['’]analyse biomécanique complète/gi,
    /envoie les landmarks mediapipe/gi,
    /envoyez les landmarks mediapipe/gi,
    /envoie les landmarks/gi,
    /envoyez les landmarks/gi,
    /envoie le json/gi,
    /envoyez le json/gi,
    /fournis les landmarks/gi,
    /fournissez les landmarks/gi,
    /fournis l['’]analyse biomécanique/gi,
    /fournissez l['’]analyse biomécanique/gi,
    /filme un swing de face et un swing de profil/gi,
    /filmez un swing de face et un swing de profil/gi,
    /envoie un swing de face et un swing de profil/gi,
    /envoyez un swing de face et un swing de profil/gi
  ];

  forbiddenPatterns.forEach((pattern) => {
    out = out.replace(
      pattern,
      "Utilise JustSwing et je t’aiderai à partir de l’analyse."
    );
  });

  return out.trim();
}

function sanitizeArray(arr, max = 3) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => sanitizeCoachText(String(x || ""))).slice(0, max);
}

export function validateSwingOutput(obj) {
  ensureObject(obj, "swing output");

  return {
    summary: sanitizeCoachText(typeof obj.summary === "string" ? obj.summary : ""),
    strengths: sanitizeArray(obj.strengths, 3),
    priorities: Array.isArray(obj.priorities)
      ? obj.priorities.slice(0, 3).map((p) => ({
          title: sanitizeCoachText(p?.title || ""),
          why: sanitizeCoachText(p?.why || "")
        }))
      : [],
    immediate_actions: sanitizeArray(obj.immediate_actions, 2),
    technical_advice: sanitizeArray(obj.technical_advice, 4),
    home_drills: sanitizeArray(obj.home_drills, 2),
    mental_cue: sanitizeCoachText(typeof obj.mental_cue === "string" ? obj.mental_cue : ""),
    next_goal: sanitizeCoachText(typeof obj.next_goal === "string" ? obj.next_goal : ""),
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0.75
  };
}

export function validateTrainingOutput(obj) {
  ensureObject(obj, "training output");

  return {
    summary: sanitizeCoachText(typeof obj.summary === "string" ? obj.summary : ""),
    session_focus: sanitizeCoachText(typeof obj.session_focus === "string" ? obj.session_focus : ""),
    block_plan: sanitizeArray(obj.block_plan, 4),
    immediate_actions: sanitizeArray(obj.immediate_actions, 2),
    routine_reset: sanitizeArray(obj.routine_reset, 3),
    success_signal: sanitizeCoachText(typeof obj.success_signal === "string" ? obj.success_signal : ""),
    next_block_goal: sanitizeCoachText(typeof obj.next_block_goal === "string" ? obj.next_block_goal : "")
  };
}

export function validateRoundOutput(obj) {
  ensureObject(obj, "round output");

  return {
    summary: sanitizeCoachText(typeof obj.summary === "string" ? obj.summary : ""),
    reset_protocol: sanitizeArray(obj.reset_protocol, 3),
    immediate_actions: sanitizeArray(obj.immediate_actions, 2),
    next_shot_intention: sanitizeCoachText(
      typeof obj.next_shot_intention === "string" ? obj.next_shot_intention : ""
    ),
    decision_rule: sanitizeCoachText(typeof obj.decision_rule === "string" ? obj.decision_rule : ""),
    encouragement: sanitizeCoachText(typeof obj.encouragement === "string" ? obj.encouragement : "")
  };
}

export function validateSwingOutput(obj) {
  ensureObject(obj, "swing output");

  return {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    strengths: Array.isArray(obj.strengths) ? obj.strengths.slice(0, 3) : [],
    priorities: Array.isArray(obj.priorities) ? obj.priorities.slice(0, 3) : [],
    immediate_actions: Array.isArray(obj.immediate_actions) ? obj.immediate_actions.slice(0, 2) : [],
    technical_advice: Array.isArray(obj.technical_advice) ? obj.technical_advice.slice(0, 4) : [],
    home_drills: Array.isArray(obj.home_drills) ? obj.home_drills.slice(0, 2) : [],
    mental_cue: typeof obj.mental_cue === "string" ? obj.mental_cue : "",
    next_goal: typeof obj.next_goal === "string" ? obj.next_goal : "",
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0.75
  };
}

export function validateTrainingOutput(obj) {
  ensureObject(obj, "training output");

  return {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    session_focus: typeof obj.session_focus === "string" ? obj.session_focus : "",
    block_plan: Array.isArray(obj.block_plan) ? obj.block_plan.slice(0, 4) : [],
    immediate_actions: Array.isArray(obj.immediate_actions) ? obj.immediate_actions.slice(0, 2) : [],
    routine_reset: Array.isArray(obj.routine_reset) ? obj.routine_reset.slice(0, 3) : [],
    success_signal: typeof obj.success_signal === "string" ? obj.success_signal : "",
    next_block_goal: typeof obj.next_block_goal === "string" ? obj.next_block_goal : ""
  };
}

export function validateRoundOutput(obj) {
  ensureObject(obj, "round output");

  return {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    reset_protocol: Array.isArray(obj.reset_protocol) ? obj.reset_protocol.slice(0, 3) : [],
    immediate_actions: Array.isArray(obj.immediate_actions) ? obj.immediate_actions.slice(0, 2) : [],
    next_shot_intention: typeof obj.next_shot_intention === "string" ? obj.next_shot_intention : "",
    decision_rule: typeof obj.decision_rule === "string" ? obj.decision_rule : "",
    encouragement: typeof obj.encouragement === "string" ? obj.encouragement : ""
  };
}
