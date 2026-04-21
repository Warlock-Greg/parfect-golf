window.CoachTransport = {
  async analyzeSwing(context, userMessage = "") {
    return postJSON("/api/coach/analyze-swing", { context, userMessage });
  },

  async trainingAdvice(context, userMessage = "") {
    return postJSON("/api/coach/training", { context, userMessage });
  },

  async roundSupport(context, userMessage = "") {
    return postJSON("/api/coach/round-support", { context, userMessage });
  }
};

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Coach API error ${res.status}`);
  }

  return res.json();
}
