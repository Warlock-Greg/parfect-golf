// === Parfect.golfr - play.js (MVP++ 2025) ===
console.log("🏌️ Parfect Play.js chargé");

const $$ = (id) => document.getElementById(id);

let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = null; // score sélectionné
let lastCoachMessage = "";

// === Sélection des golfs ===
async function initGolfSelect() {
  const container = $$("golf-select");
  if (!container) return;

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    container.innerHTML = `
      <h3 style="color:#00ff99;">Choisis ton golf</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${golfs
          .map(
            (g) => `
          <button class="btn" onclick="startNewRound('${g.id}')">
            ${g.name}<br><small style="color:#aaa;">${g.location}</small>
          </button>`
          )
          .join("")}
      </div>`;
    container.style.display = "block";
  } catch (err) {
    console.error("❌ Erreur chargement golfs.json :", err);
    container.innerHTML = `<p style="color:#f55;">Erreur de chargement des golfs</p>`;
  }
}

// === Démarrage de partie ===
async function startNewRound(golfId) {
  console.log("🎯 Nouvelle partie démarrée :", golfId);
  const holeCard = $$("hole-card");
  if (holeCard) holeCard.innerHTML = "";
  const golfSelect = $$("golf-select");
  if (golfSelect) golfSelect.style.display = "none";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    const golf = golfs.find((g) => g.id === golfId);
    if (!golf) return (holeCard.innerHTML = `<p style="color:#f55;">Golf introuvable</p>`);

    currentGolf = golf;
    currentHole = 1;
    holes = golf.pars.map((par, i) => ({ number: i + 1, par }));
    currentDiff = null;
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);
    localStorage.setItem("golfData", JSON.stringify(golf));
    localStorage.setItem("holesData", JSON.stringify(holes));

    showMoodAndStrategyModal(() => renderHole(currentHole));
  } catch (err) {
    console.error("❌ Erreur chargement golf :", err);
  }
}

// === Reprise ou nouvelle partie ===
function showResumeOrNewModal() {
  const inProgress = localStorage.getItem("roundInProgress") === "true";
  const savedGolf = localStorage.getItem("currentGolf");
  const savedHoles = localStorage.getItem("holesData");

  if (inProgress && savedGolf && savedHoles) {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card">
        <h3>🎯 Partie en cours</h3>
        <p>Souhaites-tu reprendre ta carte ou démarrer une nouvelle partie ?</p>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;">
          <button id="resume-round" class="btn">🔁 Reprendre</button>
          <button id="new-round" class="btn" style="background:#f55;">🚀 Nouvelle partie</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById("resume-round").addEventListener("click", () => {
      modal.remove();
      currentGolf = JSON.parse(localStorage.getItem("golfData"));
      holes = JSON.parse(savedHoles);
      currentHole = holes.findIndex((h) => !h.score) + 1 || 1;
      renderHole(currentHole);
      showCoachIA?.("🔁 Partie reprise, bon retour sur le parcours !");
    });

    document.getElementById("new-round").addEventListener("click", () => {
      modal.remove();
      localStorage.setItem("roundInProgress", "false");
      initGolfSelect();
    });
  } else {
    initGolfSelect();
  }
}

// === Mood & stratégie ===
function showMoodAndStrategyModal(onConfirm) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card">
      <h3>😎 Ton mood du jour ?</h3>
      <div class="moods" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn mood" data-mood="focus">Focus</button>
        <button class="btn mood" data-mood="relax">Relax</button>
        <button class="btn mood" data-mood="fun">Fun</button>
        <button class="btn mood" data-mood="grind">Grind</button>
      </div>
      <h4 style="margin-top:14px;">🎯 Quelle stratégie ?</h4>
      <div class="coach-styles" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn strategy" data-strat="safe">Safe</button>
        <button class="btn strategy" data-strat="aggressive">Aggressive</button>
        <button class="btn strategy" data-strat="5050">50/50</button>
        <button class="btn strategy" data-strat="mindset">Parfect Mindset</button>
      </div>
      <button id="start-round" class="btn" style="margin-top:20px;">🚀 Démarrer</button>
    </div>`;
  document.body.appendChild(modal);

  let mood = "focus",
    strat = "mindset";
  modal.querySelectorAll(".mood").forEach((btn) =>
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mood = btn.dataset.mood;
    })
  );
  modal.querySelectorAll(".strategy").forEach((btn) =>
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".strategy").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      strat = btn.dataset.strat;
    })
  );
  modal.querySelector("#start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    modal.remove();
    showCoachIA?.(`🧠 Mood: ${mood} · 🎯 Stratégie: ${strat}`);
    onConfirm?.();
  });
}

// === Rendu de la carte ===
function renderHole(number = currentHole) {
  const holeCard = $$("hole-card");
  if (!holeCard) return;
  holeCard.style.display = "block";
  const hole = holes[number - 1];
  if (!hole) return endRound();

  const par = hole.par;
  const saved = holes[number - 1] || {};
  const totalVsPar = holes
    .filter((h) => h.score !== undefined)
    .reduce((a, h) => a + (h.score - h.par), 0);

  holeCard.classList.add("hole-animate-in");
  setTimeout(() => holeCard.classList.remove("hole-animate-in"), 400);

  holeCard.innerHTML = `
    <div class="scorecard" style="text-align:center;padding:12px;">
      <h3 style="color:#00ff99;">⛳ Trou ${number}/${holes.length}</h3>
      <p>Par ${par} — Total :
        <strong style="color:${totalVsPar>0?'#ff6666':totalVsPar<0?'#00ff99':'#fff'}">
          ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}
        </strong>
      </p>

      <h4>Score :</h4>
      <div id="score-options" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
        <button class="btn score-btn" data-diff="-2">Eagle</button>
        <button class="btn score-btn" data-diff="-1">Birdie</button>
        <button class="btn score-btn" data-diff="0">Par</button>
        <button class="btn score-btn" data-diff="1">Bogey</button>
        <button class="btn score-btn" data-diff="2">Double</button>
      </div>

      <div style="margin-top:10px;">
        <label>Distance du 2ᵉ putt :</label>
        <select id="dist2" style="margin-left:6px;padding:4px 6px;border-radius:6px;">
          <option value="">Choisir</option>
          <option value="1">1 putt</option>
          <option value="2">Donné</option>
          <option value="3">< 2m</option>
          <option value="4">< 4m</option>
          <option value="5">< 6m</option>
          <option value="6">3 putts</option>
          <option value="7">4 putts</option>
        </select>
      </div>

      <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <label><input type="checkbox" id="fairway" ${saved.fairway?'checked':''}> Fairway</label>
        <label><input type="checkbox" id="gir" ${saved.gir?'checked':''}> GIR</label>
        <label><input type="checkbox" id="routine" ${saved.routine?'checked':''}> Routine</label>
      </div>

      <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
        <button id="prev-hole" class="btn" ${number===1?'disabled':''}>⬅️ Préc.</button>
        <div id="hole-info" style="font-size:0.9rem;color:#aaa;">Trou ${number}/${holes.length}</div>
        <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">Suivant ➡️</button>
      </div>
    </div>`;

  // Sélection du score
  document.querySelectorAll(".score-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".score-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      btn.style.background = "#fff";
      btn.style.color = "#111";
      currentDiff = parseInt(btn.dataset.diff);
    })
  );

  $$("next-hole").addEventListener("click", () => {
    if (currentDiff === null) {
      showCoachIA?.("⚠️ Choisis ton score avant de passer au trou suivant !");
      return;
    }
    saveCurrentHole();
    analyzeHole(holes[currentHole - 1]);
    if (currentHole < holes.length) {
      currentHole++;
      renderHole(currentHole);
    } else summarizeRound();
  });

  $$("prev-hole")?.addEventListener("click", () => {
    if (currentHole > 1) {
      currentHole--;
      renderHole(currentHole);
    }
  });
}

// === Sauvegarde ===
function saveCurrentHole() {
  const fairway = $$("fairway")?.checked || false;
  const gir = $$("gir")?.checked || false;
  const routine = $$("routine")?.checked || false;
  const dist2 = $$("dist2")?.value || "";
  const par = holes[currentHole - 1].par;
  holes[currentHole - 1] = { number: currentHole, par, score: par + currentDiff, fairway, gir, routine, dist2 };
  localStorage.setItem("holesData", JSON.stringify(holes));
  localStorage.setItem("roundInProgress", "true");
}

// === Analyse du trou ===
function analyzeHole(hole) {
  if (!hole) return;
  const diff = hole.score - hole.par;
  const { fairway, gir, dist2 } = hole;
  let message = "";
  let parfectCount = parseInt(localStorage.getItem("parfectCount") || "0");

  if (diff === 0 && fairway && gir && ["1", "2", "3", "4", "5"].includes(dist2)) {
    parfectCount++;
    localStorage.setItem("parfectCount", parfectCount);
    message = `💚 Parfect collecté (${parfectCount}) ! Flow en hausse.`;
  } else if (diff < 0) message = "🕊️ Birdie, du grand golf !";
  else if (diff === 1) message = "💙 Bogey’fect, tu restes solide.";
  else if (diff >= 2) message = "😅 Pas grave, on rebondit au prochain.";
  else message = "👌 Trou régulier, flow maîtrisé.";

  if (message !== lastCoachMessage) {
    lastCoachMessage = message;
    showCoachIA?.(message);
  }
}

// === Résumé fin de partie ===
function summarizeRound() {
  const valid = holes.filter((h) => h.score);
  if (!valid.length) return showCoachIA?.("Aucun score enregistré !");
  const total = valid.reduce((a, h) => a + (h.score - h.par), 0);
  const parfects = valid.filter((h) => h.score - h.par === 0 && h.fairway && h.gir).length;

  let msg = `🏁 Partie terminée ! Score ${total > 0 ? "+" + total : total} · 💚 ${parfects} Parfect${parfects>1?"s":""}`;
  showCoachIA?.(msg);
  localStorage.setItem("roundInProgress", "false");
}

// === Exports globaux ===
window.initGolfSelect = initGolfSelect;
window.startNewRound = startNewRound;
window.showResumeOrNewModal = showResumeOrNewModal;
window.renderHole = renderHole;
