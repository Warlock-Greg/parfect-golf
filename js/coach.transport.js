const BASE = window.CONFIG?.API_BASE_URL || "";

async function postJSON(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {})
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Coach API error ${res.status}: ${text}`);
  }

  return res.json();
}

window.CoachTransport = {async analyzeSwing(context, userMessage = "") {
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
