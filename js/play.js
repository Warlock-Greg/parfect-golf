// === Parfect.golfr - play.js (MVP amélioré) ===
(function () {
  const STORAGE_KEY = "golfHistory";
  const $ = window.$ || ((id) => document.getElementById(id));

  let currentGolf = null;
  let currentHole = 1;
  let totalHoles = 18;
  let holes = [];
  let currentDiff = 0;

  const SCORE_CHOICES = [
    { key: "birdie", label: "Birdie", diff: -1 },
    { key: "par", label: "Par", diff: 0 },
    { key: "bogey", label: "Bogey", diff: 1 },
    { key: "double", label: "Double", diff: 2 },
    { key: "triple", label: "Triple", diff: 3 },
    { key: "eagle", label: "Eagle", diff: -2 },
  ];

  function fetchGolfs() {
    const url =
      "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/data/golfs.json";
    return fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => []);
  }

  window.initGolfSelect = async function initGolfSelect() {
    const zone = $("golf-select");
    if (!zone) return;

    const golfs = await fetchGolfs();
    zone.innerHTML =
      "<h3>Choisis ton golf :</h3>" +
      golfs
        .map(
          (g) => `<button class="btn golf-btn" data-id="${g.id}">⛳ ${g.name}</button>`
        )
        .join("");

    zone.querySelectorAll(".golf-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = golfs.find((x) => String(x.id) === btn.dataset.id);
        startRound(g);
      });
    });
  };

  function startRound(golf) {
    if (!golf) return;
    currentGolf = golf;
    totalHoles = Array.isArray(golf.pars) ? golf.pars.length : 18;
    currentHole = 1;
    holes = new Array(totalHoles).fill(null);
    currentDiff = 0;

    $("golf-select").style.display = "none";
    $("hole-card").innerHTML = "";
    showMoodAndStrategyModal();
  }

  // === Mood & stratégie ===
  function showMoodAndStrategyModal() {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card" style="max-width:420px;">
        <h3>😎 Ton mood du jour ?</h3>
        <div class="moods" style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn mood" data-mood="focus">Focus</button>
          <button class="btn mood" data-mood="relax">Relax</button>
          <button class="btn mood" data-mood="fun">Fun</button>
          <button class="btn mood" data-mood="grind">Grind</button>
        </div>
        <h4 style="margin-top:12px;">🎯 Stratégie</h4>
        <div class="coach-styles" style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn strategy" data-strat="safe">Safe</button>
          <button class="btn strategy" data-strat="aggressive">Aggressive</button>
          <button class="btn strategy" data-strat="5050">50/50</button>
          <button class="btn strategy" data-strat="mindset">Mindset</button>
        </div>
        <button id="start-round" class="btn" style="margin-top:12px;background:#00ff99;color:#111;">Démarrer</button>
      </div>`;
    document.body.appendChild(modal);

    let mood = "focus";
    let strat = "mindset";

    modal.querySelectorAll(".mood").forEach((b) =>
      b.addEventListener("click", () => {
        modal.querySelectorAll(".mood").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        mood = b.dataset.mood;
      })
    );
    modal.querySelectorAll(".strategy").forEach((b) =>
      b.addEventListener("click", () => {
        modal.querySelectorAll(".strategy").forEach((x) =>
          x.classList.remove("active")
        );
        b.classList.add("active");
        strat = b.dataset.strat;
      })
    );

    $("start-round").addEventListener("click", () => {
      localStorage.setItem("mood", mood);
      localStorage.setItem("strategy", strat);
      modal.remove();
      if (typeof window.showCoachIA === "function") window.showCoachIA();
      renderHole();
    });
  }

  // === Rendu du trou ===
  function renderHole() {
    if (!currentGolf) return;
    const zone = $("hole-card");
    if (!zone) return;

    const par = currentGolf.pars[currentHole - 1];
    const saved = holes[currentHole - 1] || {};
    const total = holes.filter(Boolean).reduce((a, h) => a + (h.score - h.par), 0);

    zone.innerHTML = `
      <div class="mini-recap" style="background:#111;padding:8px 12px;border-radius:12px;margin-bottom:10px;text-align:center;">
        <strong>Trou ${currentHole}/${totalHoles}</strong> — Par ${par} · Total :
        <span style="color:${total > 0 ? "#ff6666" : total < 0 ? "#00ff99" : "#fff"}">
          ${total > 0 ? "+" + total : total}
        </span>
      </div>

      <div class="hole-inputs" style="display:flex;flex-direction:column;gap:10px;align-items:center;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
          ${SCORE_CHOICES.map(
            (sc) => `
            <button class="btn score-btn" data-diff="${sc.diff}" 
              ${currentDiff === sc.diff ? 'style="background:#00ff99;color:#111;font-weight:bold;"' : ""}>
              ${sc.label}
            </button>`
          ).join("")}
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:10px;">
          <label><input type="checkbox" id="fairway" ${saved.fairway ? "checked" : ""}> Fairway</label>
          <label><input type="checkbox" id="gir" ${saved.gir ? "checked" : ""}> GIR</label>
          <label><input type="checkbox" id="routine" ${saved.routine ? "checked" : ""}> Routine</label>
        </div>

        <div style="margin-top:8px;">
          <label>Distance 2e putt :</label>
          <select id="dist2" style="margin-left:6px;padding:4px 6px;border-radius:6px;">
            <option value="">Choisir</option>
            <option value="1">Donné</option>
            <option value="2">One putt baby</option>
            <option value="3">Moins de 2 m</option>
            <option value="4">Moins de 4 m</option>
            <option value="5">Moins de 6 m</option>
            <option value="6">Au-delà</option>
          </select>
        </div>

        <div style="margin-top:8px;">
          <label>Nombre de putts :</label>
          <input id="putts" type="number" min="0" max="6" value="${saved.putts || 2}" 
                 style="width:80px;margin-left:6px;text-align:center;border-radius:6px;padding:4px 6px;">
        </div>

        <div style="margin-top:14px;display:flex;justify-content:space-between;width:100%;max-width:360px;">
          <button id="prev-hole" class="btn" ${currentHole === 1 ? "disabled" : ""}>⬅️ Précédent</button>
          <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">Trou suivant ➡️</button>
        </div>
      </div>
    `;

    // === Gestion du choix de score ===
    document.querySelectorAll(".score-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentDiff = parseInt(btn.dataset.diff);
        renderHole(); // re-render pour marquer le score sélectionné
      });
    });

    $("prev-hole").addEventListener("click", () => {
      saveCurrentHole();
      if (currentHole > 1) currentHole--;
      renderHole();
    });

    $("next-hole").addEventListener("click", () => {
      saveCurrentHole();
      if ([9, 12].includes(currentHole)) saveMidRound();
      if (currentHole < totalHoles) {
        currentHole++;
        renderHole();
      } else {
        endRound();
      }
    });
  }

  function saveCurrentHole() {
    const par = currentGolf.pars[currentHole - 1];
    const entry = {
      hole: currentHole,
      par,
      score: par + (currentDiff || 0),
      fairway: $("fairway")?.checked || false,
      gir: $("gir")?.checked || false,
      routine: $("routine")?.checked || false,
      dist2: $("dist2")?.value || "",
      putts: parseInt($("putts")?.value || 0),
    };
    holes[currentHole - 1] = entry;
    analyzeHole(entry);
  }

  function saveMidRound() {
    try {
      localStorage.setItem("roundInProgress", "true");
      localStorage.setItem("currentGolf", JSON.stringify(currentGolf));
      localStorage.setItem("holes", JSON.stringify(holes));
      console.log("💾 Sauvegarde mid-round OK");
    } catch (e) {
      console.error(e);
    }
  }

  function analyzeHole(entry) {
    const diff = entry.score - entry.par;
    let msg = "";
    if (diff <= -1) msg = "💚 Birdie ou mieux ! Continue !";
    else if (diff === 0 && entry.gir) msg = "💪 Par solide (GIR).";
    else if (diff === 1 && entry.fairway) msg = "💙 Bogey’fect : fairway + ≤2 putts, smart.";
    else if (diff >= 2) msg = "😅 Double ou + ? Reste calme, routine.";
    else msg = "Un coup après l’autre, flow > force.";

    if (typeof window.showCoachToast === "function") window.showCoachToast(msg, "#00ff99");
    document.dispatchEvent(new CustomEvent("coach-message", { detail: msg }));
  }

  function endRound() {
    const valid = holes.filter(Boolean);
    const totalVsPar = valid.reduce((a, h) => a + (h.score - h.par), 0);
    const parfects = valid.filter(
      (h) => h.fairway && h.gir && (h.score - h.par) === 0
    ).length;
    const bogeyfects = valid.filter(
      (h) => h.fairway && !h.gir && (h.score - h.par) === 1
    ).length;

    try {
      const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      hist.push({
        date: new Date().toISOString(),
        golf: currentGolf?.name || "Parcours inconnu",
        totalVsPar,
        parfects,
        bogeyfects,
        holes,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
    } catch (e) {
      console.error(e);
    }

    $("hole-card").innerHTML = `
      <div class="score-summary-card">
        <h3>Partie terminée 💚</h3>
        <p>Total vs Par : <strong>${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}</strong></p>
        <p>💚 Parfects : ${parfects} · 💙 Bogey’fects : ${bogeyfects}</p>
        <button id="new-round" class="btn" style="margin-top:10px;">🔁 Nouvelle partie</button>
      </div>`;
    $("new-round").addEventListener("click", resetRound);
    localStorage.setItem("roundInProgress", "false");
  }

  function resetRound() {
    $("hole-card").innerHTML = "";
    $("golf-select").style.display = "block";
    currentGolf = null;
    currentHole = 1;
    holes = [];
    currentDiff = 0;
    localStorage.setItem("roundInProgress", "false");
    window.initGolfSelect?.();
  }

  window.showResumeOrNewModal = function showResumeOrNewModal() {
    const hasRound = localStorage.getItem("roundInProgress") === "true";
    if (document.querySelector(".modal-backdrop")) return;

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card" style="max-width:380px;text-align:center;">
        <h3>🎯 Que veux-tu faire ?</h3>
        <p>${hasRound ? "Reprendre ou recommencer ?" : "Nouvelle partie ?"}</p>
        <div style="display:flex;justify-content:center;gap:10px;margin-top:18px;">
          ${
            hasRound
              ? `<button id="resume-round" class="btn">Reprendre</button>`
              : ""
          }
          <button id="new-round-start" class="btn" style="background:#00ff99;color:#111;">Nouvelle partie</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    if (hasRound) {
      $("resume-round").addEventListener("click", () => {
        modal.remove();
        const g = JSON.parse(localStorage.getItem("currentGolf") || "null");
        const h = JSON.parse(localStorage.getItem("holes") || "[]");
        if (g && h.length) {
          currentGolf = g;
          holes = h;
          totalHoles = g.pars.length;
          currentHole = h.findIndex((x) => !x) + 1 || 1;
          $("golf-select").style.display = "none";
          renderHole();
        }
      });
    }

    $("new-round-start").addEventListener("click", () => {
      modal.remove();
      resetRound();
      window.initGolfSelect?.();
    });
  };

  window.startRound = startRound;
  window.renderHole = renderHole;
})();
