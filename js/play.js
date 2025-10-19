// === Parfect.golfr - play.js (MVP complet avec Coach IA, animation, sauvegarde mi-parcours) ===
(function () {
  const STORAGE_KEY = "golfHistory";
  const $ = window.$ || ((id) => document.getElementById(id));

  // --- État global ---
  let currentGolf = null;
  let currentHole = 1;
  let totalHoles = 18;
  let holes = [];
  let currentDiff = 0;

  // --- Choix de score ---
  const SCORE_CHOICES = [
    { key: "birdie", label: "Birdie", diff: -1 },
    { key: "par", label: "Par", diff: 0 },
    { key: "bogey", label: "Bogey", diff: 1 },
    { key: "double", label: "Double", diff: 2 },
    { key: "triple", label: "Triple", diff: 3 },
    { key: "eagle", label: "Eagle", diff: -2 },
  ];

  // --- Chargement des golfs ---
  function fetchGolfs() {
    const url = "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/data/golfs.json";
    return fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => []);
  }

  // === Initialisation de la sélection de golf ===
  window.initGolfSelect = async function initGolfSelect() {
    const zone = $("golf-select");
    if (!zone) return;
    const golfs = await fetchGolfs();

    zone.innerHTML =
      "<h3>Choisis ton golf :</h3>" +
      golfs
        .map((g) => `<button class="btn golf-btn" data-id="${g.id}">⛳ ${g.name}</button>`)
        .join("");

    zone.querySelectorAll(".golf-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        const g = golfs.find((x) => String(x.id) === btn.dataset.id);
        startRound(g);
      })
    );
  };

  // === Démarrage d'une partie ===
  function startRound(golf) {
    if (!golf) return;
    currentGolf = golf;
    totalHoles = Array.isArray(golf.pars) ? golf.pars.length : 18;
    currentHole = 1;
    holes = new Array(totalHoles).fill(null);
    $("golf-select").style.display = "none";
    $("hole-card").innerHTML = "";
    showScorecardIntro();
    showMoodAndStrategyModal();
  }

  // === Onboarding carte de score ===
  function showScorecardIntro() {
    if (document.querySelector(".modal-backdrop")) return;

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card" style="max-width:420px;text-align:left;">
        <h2>📋 Carte de Score</h2>
        <p><strong>Parfect</strong> = Par + Fairway + GIR + ≤ 2 putts<br>
        <strong>Bogey’fect</strong> = Bogey + Fairway + ≤ 2 putts</p>
        <ul style="margin-left:18px;line-height:1.4;">
          <li>Choisis ton score</li>
          <li>Coche Fairway / GIR / Routine</li>
          <li>Indique la distance du 2ᵉ putt</li>
        </ul>
        <div style="text-align:right;margin-top:12px;">
          <button id="close-intro" class="btn" style="background:#00ff99;color:#111;">OK</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    $("close-intro").addEventListener("click", () => modal.remove());
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
          <button class="btn strategy" data-strat="fairway">Fairway First</button>
          <button class="btn strategy" data-strat="mindset">Parfect Mindset</button>
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
        modal.querySelectorAll(".strategy").forEach((x) => x.classList.remove("active"));
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
    const zone = $("hole-card");
    if (!zone || !currentGolf) return;

    const par = currentGolf.pars[currentHole - 1];
    const saved = holes[currentHole - 1] || {};
    const total = holes.filter(Boolean).reduce((a, h) => a + (h.score - h.par), 0);

    zone.classList.add("fade-out");
    setTimeout(() => {
      zone.classList.remove("fade-out");
      zone.classList.add("fade-in");
      zone.innerHTML = `
        <div class="mini-recap" style="background:#111;padding:8px;border-radius:12px;text-align:center;">
          <strong>Trou ${currentHole}/${totalHoles}</strong> — Par ${par} · Total :
          <span style="color:${total>0?'#ff6666':total<0?'#00ff99':'#fff'}">${total>0? "+"+total : total}</span>
        </div>
        <div style="text-align:center;margin-top:10px;">
          ${SCORE_CHOICES.map(
            (sc) => `<button class="btn score-btn" data-diff="${sc.diff}">${sc.label}</button>`
          ).join("")}
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;justify-content:center;">
          <label><input type="checkbox" id="fairway" ${saved.fairway?'checked':''}> Fairway</label>
          <label><input type="checkbox" id="gir" ${saved.gir?'checked':''}> GIR</label>
          <label><input type="checkbox" id="routine" ${saved.routine?'checked':''}> Routine</label>
        </div>
        <div style="margin-top:8px;">
          <label>Distance 2e putt :</label>
          <select id="dist2" style="margin-left:6px;padding:4px 6px;border-radius:6px;">
            <option value="">Choisir</option>
            <option>Donné</option>
            <option>One putt baby</option>
            <option>&lt; 2m</option>
            <option>&lt; 4m</option>
            <option>&lt; 6m</option>
            <option>Au-delà</option>
          </select>
        </div>
        <div id="trouble-zone" style="display:none;margin-top:8px;">
          <label>Pourquoi double ou plus ?</label><br>
          <select id="trouble" style="padding:4px 6px;border-radius:6px;">
            <option value="none">R.A.S.</option>
            <option value="drive">Drive égaré</option>
            <option value="penalite">Pénalité</option>
            <option value="approche">Approche manquée</option>
          </select>
        </div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;">
          <button id="prev-hole" class="btn" ${currentHole===1?'disabled':''}>⬅️ Trou ${currentHole-1}</button>
          <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">Trou ${currentHole+1} ➡️</button>
        </div>`;
      zone.classList.remove("fade-in");
      bindHoleEvents();
    }, 250);
  }

  // === Liens et actions ===
  function bindHoleEvents() {
    document.querySelectorAll(".score-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        currentDiff = parseInt(btn.dataset.diff);
        $("trouble-zone").style.display = currentDiff >= 2 ? "block" : "none";
      })
    );

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
        if (typeof window.showCoachIA === "function") {
          window.showCoachIA();
          setTimeout(() => window.hideCoachIA?.(), 180000);
        }
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
      trouble: $("trouble")?.value || "",
    };
    holes[currentHole - 1] = entry;
    analyzeHole(entry);
  }

  // === Sauvegarde intermédiaire ===
  function saveMidRound() {
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", JSON.stringify(currentGolf));
    localStorage.setItem("holes", JSON.stringify(holes));
    console.log("💾 Sauvegarde mi-parcours");
  }

  // === Analyse du coach IA ===
  function analyzeHole(entry) {
    let msg = "";
    const d = entry.score - entry.par;
    if (d <= -1) msg = "💚 Birdie ou mieux ! Continue !";
    else if (d === 0 && entry.gir) msg = "💪 Par solide (GIR).";
    else if (d === 1 && entry.fairway) msg = "💙 Bogey’fect : fairway + ≤2 putts.";
    else if (d >= 2) msg = "😅 Double ou plus ? Routine, respire et reste patient.";
    else msg = "Un coup après l’autre, flow > force.";
    if (typeof window.showCoachToast === "function") window.showCoachToast(msg, "#00ff99");
    document.dispatchEvent(new CustomEvent("coach-message", { detail: msg }));
  }

  // === Fin de partie ===
  function endRound() {
    const valid = holes.filter(Boolean);
    const totalVsPar = valid.reduce((a, h) => a + (h.score - h.par), 0);
    const parfects = valid.filter((h) => h.fairway && h.gir && (h.score - h.par) === 0).length;
    const bogeyfects = valid.filter((h) => h.fairway && !h.gir && (h.score - h.par) === 1).length;

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
    console.log("♻️ Partie réinitialisée");
    window.initGolfSelect?.();
  }

  // === Modale Reprendre / Nouvelle partie ===
  window.showResumeOrNewModal = function () {
    const hasRound = localStorage.getItem("roundInProgress") === "true";
    if (document.querySelector(".modal-backdrop")) return;
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card" style="max-width:380px;text-align:center;">
        <h3>🎯 Que veux-tu faire ?</h3>
        <p>${hasRound ? "Reprendre la partie en cours ou recommencer ?" : "Prêt à démarrer une nouvelle partie ?"}</p>
        <div style="display:flex;justify-content:center;gap:10px;margin-top:18px;">
          ${hasRound ? `<button id="resume-round" class="btn">Reprendre</button>` : ""}
          <button id="new-round-start" class="btn" style="background:#00ff99;color:#111;">Nouvelle partie</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    if (hasRound) {
      $("resume-round").addEventListener("click", () => {
        modal.remove();
        try {
          const g = JSON.parse(localStorage.getItem("currentGolf") || "null");
          const h = JSON.parse(localStorage.getItem("holes") || "[]");
          if (g && h.length) {
            currentGolf = g;
            holes = h;
            totalHoles = g.pars.length;
            currentHole = h.findIndex((x) => !x) + 1 || 1;
            $("golf-select").style.display = "none";
            renderHole();
            return;
          }
        } catch (e) {
          console.error(e);
        }
        $("golf-select").style.display = "block";
      });
    }

    $("new-round-start").addEventListener("click", () => {
      modal.remove();
      resetRound();
      window.initGolfSelect?.();
    });
  };

  // Expose globalement
  window.startRound = startRound;
  window.renderHole = renderHole;
})();
