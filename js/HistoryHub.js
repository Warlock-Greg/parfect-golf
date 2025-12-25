// === HistoryHub.js ===
// Source unique pour tous les historiques (local only MVP)

const HistoryHub = (() => {

  // --- Swings (IndexedDB) ---
  async function getSwings() {
    if (!window.SwingHistory) return [];
    const swings = await window.SwingHistory.getAll();
    return swings.map(s => ({
      type: "swing",
      date: s.createdAt,
      club: s.club,
      score: s.score,
      videoBlob: s.videoBlob
    }));
  }

  // --- Training (localStorage) ---
  function getTrainings() {
    const arr = JSON.parse(localStorage.getItem("trainingHistory") || "[]");
    return arr.map(t => ({
      type: "training",
      date: t.date,
      name: t.name,
      quality: t.quality,
      mentalScore: t.mentalScore,
      coach: t.coach
    }));
  }

  // --- Parties (localStorage) ---
  function getRounds() {
    const arr = JSON.parse(localStorage.getItem("history") || "[]");
    return arr.map(r => ({
      type: "round",
      date: r.date,
      golf: r.golf,
      totalVsPar: r.totalVsPar,
      parfects: r.parfects
    }));
  }

  // --- Public API ---
  async function getByType(type) {
    if (type === "swing") return await getSwings();
    if (type === "training") return getTrainings();
    if (type === "round") return getRounds();
    return [];
  }

  async function getAll() {
    const [swings, trainings, rounds] = await Promise.all([
      getSwings(),
      getTrainings(),
      getRounds()
    ]);

    return [...swings, ...trainings, ...rounds]
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return { getByType, getAll };
})();

window.HistoryHub = HistoryHub;
