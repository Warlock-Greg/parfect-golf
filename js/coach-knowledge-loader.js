window.PARFECT_COACH_KNOWLEDGE_V2 = window.PARFECT_COACH_KNOWLEDGE_V2 || {
  sources: []
};

window.loadCoachKnowledgeV2 = async function () {
  const files = [
    "./data/coach-knowledge/v2/swing.json",
    "./data/coach-knowledge/v2/mental.json",
    "./data/coach-knowledge/v2/caddy.json",
    "./data/coach-knowledge/v2/training.json"
  ];

  const sources = [];

  for (const file of files) {
    try {
      const res = await fetch(file);
      const json = await res.json();

      if (json.validated === true) {
        sources.push(json);
      }
    } catch (err) {
      console.warn("⚠️ Knowledge V2 load failed", file, err);
    }
  }

  window.PARFECT_COACH_KNOWLEDGE_V2.sources = sources;

  console.log("✅ Coach Knowledge V2 loaded", sources);
  return sources;
};

document.addEventListener("DOMContentLoaded", () => {
  window.loadCoachKnowledgeV2?.();
});
