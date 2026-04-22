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
