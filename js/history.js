// === Parfect.golfr - history.js (V3 CHARTS + FILTER + COACH SUMMARY) ===

(function () {
  const HISTORY_KEY = "golfHistory"; // clé stockage round
  const $ = window.$ || ((id) => document.getElementById(id));

  let scoreChart = null;
  let parfectChart = null;

  // === Injection interface Historique ===
  window.injectHistoryUI = function () {
    const parent = $("interaction-zone");
    if (!parent) {
      console.warn("⚠️ interaction-zone manquant");
      return;
    }
    parent.innerHTML = `
      <div id="history-container" style="padding:16px;text-align:center;">
        <h2 style="color:#00ff99;">📜 Historique des parties</h2>

        <!-- FILTRES -->
        <div style="margin:16px 0;">
          <label style="margin-right:6px;">⛳ Golf :</label>
          <select id="filter-golf" style="padding:6px;border-radius:8px;background:#000;color:#fff;border:1px solid #333;">
            <option value="all">Tous</option>
          </select>
        </div>

        <!-- RÉSUMÉ GLOBAL -->
        <div id="history-summary"></div>

        <!-- GRAPH 1 : score progression -->
        <h3 style="margin-top:20px;color:#00ff99;">📈 Progression Score vs Par</h3>
        <canvas id="score-chart" style="max-width:500px;margin:auto;"></canvas>

        <!-- GRAPH 2 : Parfects progression -->
        <h3 style="margin-top:30px;color:#00ff99;">💚 Parfects par partie</h3>
        <canvas id="parfect-chart" style="max-width:500px;margin:auto;"></canvas>

        <!-- TIMELINE -->
        <h3 style="margin-top:30px;color:#00ff99;">🕓 Timeline des parties</h3>
        <div id="history-list"></div>

        <button id="reset-rounds" class="btn" style="margin-top:20px;background:#ff4444;color:#fff;">
          🧹 Tout réinitialiser
        </button>
      </div>
    `;

    populateGolfFilter();
    renderHistory();
  };

  // === Remplir le filtre des golfs joués ===
  function populateGolfFilter() {
    const rounds = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const filter = $("filter-golf");
    if (!filter) return;
    const golfs = [...new Set(rounds.map((r) => r.golf))];
    golfs.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      filter.appendChild(opt);
    });
    filter.addEventListener("change", renderHistory);
  }

  // === Rendu Complet Historique + Graphiques ===
  window.renderHistory = function () {
    const rounds = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const filterValue = $("filter-golf")?.value ?? "all";
    const filtered = filterValue === "all" ? rounds : rounds.filter((r) => r.golf === filterValue);

    renderSummary(filtered);
    renderTimeline(filtered);
    renderCharts(filtered);

    $("reset-rounds")?.addEventListener("click", () => {
      if (confirm("🧹 Supprimer tout l’historique ?")) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
      }
    });
  };

  // === Résumé haut de page ===
  function renderSummary(rounds) {
    const zone = $("history-summary");
    if (!zone) return;
    if (!rounds.length) {
      zone.innerHTML = "<p style='opacity:.5;'>Aucune partie enregistrée.</p>";
      return;
    }

    const totalRounds = rounds.length;
    const totalParfects = rounds.reduce((a, r) => a + (r.parfects || 0), 0);
    const avgScore =
      Math.round(
        (rounds.reduce((a, r) => a + (r.totalVsPar || 0), 0) / totalRounds) * 10
      ) / 10;

    zone.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
        <div>📊 <strong>${totalRounds}</strong> parties</div>
        <div>Moyenne score : <strong style="color:${avgScore < 0 ? "#44ffaa" : avgScore > 0 ? "#ff5555" : "#fff"
      }">${avgScore > 0 ? "+" + avgScore : avgScore}</strong></div>
        <div>💚 <strong>${totalParfects}</strong> Parfects</div>
      </div>
    `;
  }

  // === TIMELINE - Liste des parties ===
  function renderTimeline(rounds) {
    const zone = $("history-list");
    if (!zone) return;

    if (!rounds.length) {
      zone.innerHTML = "";
      return;
    }

    rounds.sort((a, b) => new Date(b.date) - new Date(a.date));

    zone.innerHTML = rounds
      .map((r) => {
        const d = new Date(r.date).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        });
        const color = r.totalVsPar < 0 ? "#44ffaa" : r.totalVsPar > 0 ? "#ff5555" : "#fff";

        // Résumé coach basé sur mood + stratégie (si présents)
        const coachSummary = buildCoachHistorySummary(r);

        return `
          <div style="background:#111;border:1px solid #333;border-radius:10px;padding:10px;margin-top:10px;text-align:left;">
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#00ff99;">${d}</span>
              <span>⛳ ${r.golf}</span>
            </div>
            <div style="margin-top:4px;">
              Total : <strong style="color:${color}">${r.totalVsPar > 0 ? "+" + r.totalVsPar : r.totalVsPar}</strong>
            </div>
            <div>💚 Parfects : ${r.parfects}</div>
            <div style="margin-top:6px;font-style:italic;opacity:.8;">
              ${coachSummary}
            </div>
          </div>
        `;
      })
      .join("");
  }

  // === Résumé coach basé sur mood + stratégie ===
  function buildCoachHistorySummary(round) {
    const mood = round.mood || "focus";
    const strat = round.strategy || "mindset";

    const moodMsgs = {
      focus: "Calme, aligné et concentré.",
      relax: "Une partie jouée dans la fluidité.",
      fun: "Tu t’es amusé, et ça se voit.",
      grind: "Solide mental, combatif jusqu'au bout.",
    };

    const stratMsgs = {
      safe: "Stratégie prudente, gestion propre.",
      aggressive: "Plan agressif avec des prises de risques.",
      "5050": "Stratégie équilibrée.",
      mindset: "Tu as joué avec intention et respiration.",
    };

    return `🎤 ${moodMsgs[mood] || ""} ${stratMsgs[strat] || ""}`;
  }

  // === Graphiques ===
  function renderCharts(rounds) {
    const ctxScore = $("score-chart");
    const ctxParfect = $("parfect-chart");
    if (!ctxScore || !ctxParfect) return;

    // Reset anciens charts
    if (scoreChart) scoreChart.destroy();
    if (parfectChart) parfectChart.destroy();

    const labels = rounds.map((r, i) => `P${i + 1}`);
    const scores = rounds.map((r) => r.totalVsPar);
    const parfects = rounds.map((r) => r.parfects);

    // === Graph 1 : Score progression ===
    scoreChart = new Chart(ctxScore, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Score vs Par",
            data: scores,
            borderColor: "#00ff99",
            borderWidth: 2,
            fill: false,
            tension: 0.2,
          },
        ],
      },
      options: {
        scales: {
          y: {
            grid: { color: "#333" },
            ticks: { color: "#fff" },
          },
          x: {
            ticks: { color: "#fff" },
          },
        },
        plugins: { legend: { labels: { color: "#fff" } } },
      },
    });

    // === Graph 2 : Parfect progression ===
    parfectChart = new Chart(ctxParfect, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Parfects",
            data: parfects,
            backgroundColor: "#00ff99",
          },
        ],
      },
      options: {
        scales: {
          y: { ticks: { color: "#fff" }, grid: { color: "#333" } },
          x: { ticks: { color: "#fff" } },
        },
        plugins: { legend: { labels: { color: "#fff" } } },
      },
    });
  }
})();
