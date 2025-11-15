// === Parfect.golfr - HISTORY PRO (Charts + Filters + Timeline) ===

(function () {
  const HISTORY_KEY = "golfHistory";
  const $ = (id) => document.getElementById(id);

  // --- Public API ---
  window.injectHistoryUI = injectHistoryUI;
  window.renderHistory = renderHistory;

  // ============================================================
  //  🚀 1) Injecte l’interface
  // ============================================================
  function injectHistoryUI() {
    console.log("📜 Chargement de l’historique...");

    const parent = $("history-area");
    if (!parent) return console.warn("⚠️ history-area introuvable");

    parent.innerHTML = `
      <div id="history-container" style="padding:16px;text-align:center;max-width:680px;margin:auto;">
        
        <h2 style="color:#00ff99;">📜 Historique des parties</h2>

        <!-- === Filtre par golf === -->
        <div style="margin-top:16px;">
          <label style="margin-right:8px;">Filtrer par golf :</label>
          <select id="filter-golf" style="padding:6px;border-radius:6px;background:#111;color:#fff;border:1px solid #333;">
            <option value="all">Tous</option>
          </select>
        </div>

        <!-- === Résumés globaux === -->
        <div id="history-summary" style="margin-top:20px;"></div>

        <!-- === Graphiques === -->
        <div style="margin-top:30px;">
          <h3 style="color:#00ff99;">📈 Progression Score vs Par</h3>
          <canvas id="chart-score" height="120"></canvas>
        </div>

        <div style="margin-top:30px;">
          <h3 style="color:#00ff99;">💚 Parfects / Partie</h3>
          <canvas id="chart-parfects" height="120"></canvas>
        </div>

        <!-- === Timeline === -->
        <div style="margin-top:40px;">
          <h3 style="color:#00ff99;">⏱️ Timeline des parties</h3>
          <div id="history-timeline" style="margin-top:20px;"></div>
        </div>

        <button id="reset-history" class="btn" style="margin-top:30px;background:#ff4444;color:#fff;">
          🧹 Réinitialiser l’historique
        </button>

      </div>
    `;

    loadGolfFilter();
    renderHistory();
  }

  // ============================================================
  //  🚀 2) Charge les golfs dans le filtre
  // ============================================================
  function loadGolfFilter() {
    const rounds = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const select = $("filter-golf");

    const uniqueGolfs = [...new Set(rounds.map((r) => r.golf))];

    uniqueGolfs.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      select.appendChild(opt);
    });

    select.addEventListener("change", renderHistory);
  }

  // ============================================================
  //  🚀 3) Rendu complet
  // ============================================================
  function renderHistory() {
    const filter = $("filter-golf")?.value || "all";
    const allRounds = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

    const rounds =
      filter === "all" ? allRounds : allRounds.filter((r) => r.golf === filter);

    renderSummary(rounds);
    renderCharts(rounds);
    renderTimeline(rounds);

    // Reset btn
    $("reset-history")?.addEventListener("click", () => {
      if (!confirm("Supprimer tout l’historique ?")) return;
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      loadGolfFilter();
    });
  }

  // ============================================================
  //  🚀 4) Résumés globaux
  // ============================================================
  function renderSummary(rounds) {
    const div = $("history-summary");
    if (!rounds.length) {
      div.innerHTML = "<p style='opacity:0.6'>Aucune partie enregistrée.</p>";
      return;
    }

    const totalRounds = rounds.length;
    const totalParfects = rounds.reduce((a, r) => a + (r.parfects || 0), 0);
    const totalBogeyfects = rounds.reduce((a, r) => a + (r.bogeyfects || 0), 0);
    const avgScore =
      Math.round(
        (rounds.reduce((a, r) => a + (r.totalVsPar || 0), 0) / totalRounds) * 10
      ) / 10;

    div.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center;margin-top:10px;">
        <div>📊 <strong>${totalRounds}</strong> parties</div>
        <div>Moyenne : 
          <strong style="color:${avgScore < 0 ? "#44ffaa" : avgScore > 0 ? "#ff5555" : "#fff"}">
            ${avgScore > 0 ? "+" + avgScore : avgScore}
          </strong>
        </div>
        <div>💚 <strong>${totalParfects}</strong> Parfects</div>
        <div>💙 <strong>${totalBogeyfects}</strong> Bogey’fects</div>
      </div>
    `;
  }

  // ============================================================
  //  🚀 5) Graphiques Chart.js
  // ============================================================
  let chartScore = null;
  let chartParfects = null;

  function renderCharts(rounds) {
    // SCORE vs PAR
    if (chartScore) chartScore.destroy();

    chartScore = new Chart($("chart-score"), {
      type: "line",
      data: {
        labels: rounds.map((r) => r.date),
        datasets: [
          {
            label: "Score vs Par",
            data: rounds.map((r) => r.totalVsPar),
            borderColor: "#00ff99",
            backgroundColor: "rgba(0,255,153,0.2)",
            borderWidth: 2,
            tension: 0.3,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#ccc" } },
          y: { ticks: { color: "#ccc" } },
        },
      },
    });

    // PARFECTS
    if (chartParfects) chartParfects.destroy();

    chartParfects = new Chart($("chart-parfects"), {
      type: "bar",
      data: {
        labels: rounds.map((r) => r.date),
        datasets: [
          {
            label: "Parfects",
            data: rounds.map((r) => r.parfects),
            backgroundColor: "#00ff99",
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#ccc" } },
          y: { ticks: { color: "#ccc" } },
        },
      },
    });
  }

  // ============================================================
  //  🚀 6) Timeline stylée
  // ============================================================
  function renderTimeline(rounds) {
    const div = $("history-timeline");

    if (!rounds.length) {
      div.innerHTML = "<p style='opacity:0.6'>Aucune partie encore.</p>";
      return;
    }

    rounds.sort((a, b) => new Date(b.date) - new Date(a.date));

    div.innerHTML = rounds
      .map((r) => {
        const color =
          r.totalVsPar < 0 ? "#44ffaa" : r.totalVsPar > 0 ? "#ff5555" : "#fff";

        return `
        <div style="
          border-left:3px solid #00ff99;
          padding-left:12px;
          margin-bottom:18px;
        ">
          <div style="color:#00ff99;font-size:0.9rem;">${r.date}</div>
          <div style="margin-top:4px;">⛳ <b>${r.golf}</b></div>
          <div style="margin-top:4px;">
            Score : <span style="color:${color}">${r.totalVsPar > 0 ? "+" : ""}${r.totalVsPar}</span>
          </div>
          <div style="margin-top:4px;">
            💚 ${r.parfects} · 💙 ${r.bogeyfects || 0}
          </div>
        </div>
      `;
      })
      .join("");
  }
})();
