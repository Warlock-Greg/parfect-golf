// === Parfect.golfr - play.js (MVP 2025 stable) ===
console.log("🏌️ Parfect Play.js chargé");

// === Helper DOM ===
const $$ = (id) => document.getElementById(id);

// === Variables globales ===
let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = null; // null = pas encore choisi

// === Modale "Reprendre ou Nouvelle partie" ===
function showResumeOrNewModal() {
  const inProgress = localStorage.getItem("roundInProgress") === "true";

  document.querySelector(".modal-backdrop")?.remove();

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:360px;text-align:center;">
      <h3>⛳ Reprendre une partie ?</h3>
      <p style="color:#ccc;font-size:0.9rem;margin-bottom:16px;">
        ${inProgress
          ? "Tu as une partie en cours, veux-tu la reprendre ou démarrer une nouvelle ?"
          : "Aucune partie en cours. Lance une nouvelle partie !"}
      </p>
      <div style="display:flex;gap:10px;justify-content:center;">
        ${inProgress ? `<button id="resume-round" class="btn">▶️ Reprendre</button>` : ""}
        <button id="new-round" class="btn" style="background:#00ff99;color:#111;">🚀 Nouvelle partie</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  if (inProgress) {
    document.getElementById("resume-round")?.addEventListener("click", () => {
      modal.remove();
      resumeRound();
    });
  }

  document.getElementById("new-round")?.addEventListener("click", () => {
    modal.remove();
    initGolfSelect();
  });
}

// === Reprise d’une partie ===
function resumeRound() {
  const savedGolfId = localStorage.getItem("currentGolf");
  const savedHoles = localStorage.getItem("holesData");
  if (savedGolfId && savedHoles) {
    holes = JSON.parse(savedHoles);
    currentGolf = { id: savedGolfId, name: "Reprise", pars: holes.map(h => h.par) };
    currentHole = holes.findIndex(h => !h.score) + 1 || holes.length;
    showCoachIA?.("🔄 Partie reprise là où tu t’étais arrêté !");
    renderHole(currentHole);
  } else {
    showCoachIA?.("😅 Aucune partie trouvée à reprendre.");
    initGolfSelect();
  }
}

// === Initialisation du sélecteur de golf ===
async function initGolfSelect() {
  const container = $$("golf-select");
  if (!container) return console.warn("⚠️ Élément #golf-select introuvable");

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
      </div>
    `;

    container.style.display = "block";
  } catch (err) {
    console.error("❌ Erreur chargement golfs.json :", err);
    container.innerHTML = `<p style="color:#f55;">Erreur de chargement des golfs</p>`;
  }
}

// === Démarre une nouvelle partie ===
async function startNewRound(golfId) {
  const holeCard = $$("hole-card");
  const golfSelect = $$("golf-select");
  if (holeCard) holeCard.innerHTML = "";
  if (golfSelect) golfSelect.style.display = "none";

  const res = await fetch("./data/golfs.json");
  const golfs = await res.json();
  const golf = golfs.find((g) => g.id === golfId);
  if (!golf) return (holeCard.innerHTML = `<p>Golf introuvable</p>`);

  currentGolf = golf;
  currentHole = 1;
  holes = golf.pars.map((par, i) => ({ number: i + 1, par }));
  localStorage.setItem("roundInProgress", "true");
  localStorage.setItem("currentGolf", golfId);

  showMoodAndStrategyModal(() => renderHole(currentHole));
}

// === Mood & Stratégie ===
function showMoodAndStrategyModal(onConfirm) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:400px;text-align:center;padding:20px;">
      <h3>😎 Ton mood du jour ?</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn mood" data-mood="focus">Focus</button>
        <button class="btn mood" data-mood="relax">Relax</button>
        <button class="btn mood" data-mood="fun">Fun</button>
        <button class="btn mood" data-mood="grind">Grind</button>
      </div>
      <h4 style="margin-top:18px;">🎯 Stratégie :</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn strategy" data-strat="safe">Safe</button>
        <button class="btn strategy" data-strat="aggressive">Aggressive</button>
        <button class="btn strategy" data-strat="5050">50/50</button>
        <button class="btn strategy" data-strat="mindset">Mindset</button>
      </div>
      <button id="start-round" class="btn" style="margin-top:20px;background:#00ff99;color:#111;">🚀 Démarrer</button>
    </div>`;
  document.body.appendChild(modal);

  let mood = "focus";
  let strat = "mindset";

  modal.querySelectorAll(".mood, .strategy").forEach((btn) =>
    btn.addEventListener("click", () => {
      btn.parentElement.querySelectorAll(".active").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (btn.classList.contains("mood")) mood = btn.dataset.mood;
      if (btn.classList.contains("strategy")) strat = btn.dataset.strat;
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

// === Affiche la carte de score ===
function renderHole(number = currentHole) {
  const holeCard = $$("hole-card");
  const hole = holes[number - 1];
  if (!hole || !currentGolf) return endRound();

  const par = hole.par;
  const saved = holes[number - 1] || {};
  const totalVsPar = holes.filter(h => h.score !== undefined).reduce((a, h) => a + (h.score - h.par), 0);

  holeCard.innerHTML = `
    <div class="scorecard" style="text-align:center;padding:12px;">
      <h3 style="color:#00ff99;">⛳ Trou ${number}/${holes.length}</h3>
      <p>Par ${par} — Score total :
        <strong style="color:${totalVsPar>0?'#ff6666':totalVsPar<0?'#00ff99':'#fff'}">
          ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}
        </strong></p>

      <div style="margin-top:12px;">
        <h4>Choisis ton score :</h4>
        <div id="score-options" style="display:flex;gap:6px;justify-content:center;margin-top:6px;">
          <button class="btn score-btn" data-diff="-1">Birdie</button>
          <button class="btn score-btn" data-diff="0">Par</button>
          <button class="btn score-btn" data-diff="1">Bogey</button>
          <button class="btn score-btn" data-diff="2">Double</button>
        </div>
      </div>

      <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;">
        <label><input type="checkbox" id="fairway" ${saved.fairway?'checked':''}> Fairway</label>
        <label><input type="checkbox" id="gir" ${saved.gir?'checked':''}> GIR</label>
        <label><input type="checkbox" id="routine" ${saved.routine?'checked':''}> Routine</label>
      </div>

      <div style="margin-top:10px;">
        <label>Distance du 2ᵉ putt :</label>
        <select id="dist2" style="margin-left:6px;padding:4px 6px;border-radius:6px;">
          <option value="">Choisir</option>
          <option value="1">Donné</option>
          <option value="2">1 putt</option>
          <option value="3">< 2m</option>
          <option value="4">< 4m</option>
          <option value="5">< 6m</option>
          <option value="6">3 putts</option>
          <option value="7">4 putts</option>
        </select>
      </div>

      <div style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;">
        <button id="prev-hole" class="btn" ${number===1?'disabled':''}>⬅️</button>
        <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">➡️</button>
      </div>
    </div>
  `;

  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".score-btn").forEach(b => b.style.background = "#00ff99");
      btn.style.background = "#fff";
      currentDiff = parseInt(btn.dataset.diff);
    });
  });

  $$("next-hole").addEventListener("click", () => {
    if (currentDiff === null) {
      showCoachIA?.("⚠️ Choisis ton score avant de passer au trou suivant !");
      return;
    }

    saveCurrentHole();

    const lastHoleData = holes[currentHole - 1];
    analyzeHole(lastHoleData);

    if (currentHole < holes.length) {
      currentHole++;
      renderHole(currentHole);
      currentDiff = null;
    } else {
      summarizeRound();
    }
  });

  $$("prev-hole").addEventListener("click", () => {
    if (currentHole > 1) {
      currentHole--;
      renderHole(currentHole);
    }
  });
}

// === Sauvegarde du trou ===
function saveCurrentHole() {
  if (!currentGolf) return;

  const par = holes[currentHole - 1]?.par ?? 4;
  const fairway = $$("fairway")?.checked || false;
  const gir = $$("gir")?.checked || false;
  const routine = $$("routine")?.checked || false;
  const dist2 = $$("dist2")?.value || "";

  holes[currentHole - 1] = { number: currentHole, par, score: par + currentDiff, fairway, gir, routine, dist2 };
  localStorage.setItem("holesData", JSON.stringify(holes));
}

// === Analyse du trou ===
function analyzeHole(hole) {
  if (!hole) return;
  const diff = hole.score - hole.par;
  const { fairway, gir, dist2 } = hole;
  let message = "";

  if (diff === 0 && fairway && gir) {
    message = "💚 Parfect collecté ! Flow en hausse.";
  } else if (diff < 0) {
    message = "🕊️ Birdie, du grand golf !";
  } else if (diff === 1) {
    message = "💙 Bogey’fect, tu restes solide.";
  } else if (diff >= 2) {
    message = "😅 Pas grave, rebondis au prochain.";
  } else {
    message = "👌 Trou régulier, flow maîtrisé.";
  }

  showCoachIA?.(message);
}

// === Exports globaux ===
window.initGolfSelect = initGolfSelect;
window.startNewRound = startNewRound;
window.showResumeOrNewModal = showResumeOrNewModal;
window.renderHole = renderHole;
