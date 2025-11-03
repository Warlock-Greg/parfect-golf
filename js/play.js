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

  showCoachSelectModal((); => renderHole(currentHole));
}

// === Modale de sélection du coach Parfect.golfr ===
function showCoachSelectModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:center;padding:20px;">
      <h2 style="color:#00ff99;">🎯 Choisis ton coach</h2>
      <p style="color:#ccc;margin-bottom:16px;">Chaque coach a sa vibe. Choisis celui qui t’inspire aujourd’hui.</p>

      <div class="coach-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button class="coach-choice btn" data-coach="Dorothee" style="background:#00c676;color:#111;">
          💚 Dorothée<br><small>Bienveillance & Flow</small>
        </button>
        <button class="coach-choice btn" data-coach="Goathier" style="background:#00c676;color:#111;">
          🔵 Goathier<br><small>Technique mentale</small>
        </button>
        <button class="coach-choice btn" data-coach="Greg" style="background:#00c676;color:#111;">
          💥 Greg<br><small>Énergie & Data</small>
        </button>
        <button class="coach-choice btn" data-coach="Chill" style="background:#00c676;color:#111;">
          🌿 Chill<br><small>Zen & Flow</small>
        </button>
      </div>

      <p id="coach-desc" style="margin-top:14px;font-style:italic;color:#aaa;">Clique sur un coach pour voir sa vibe.</p>
      <button id="validate-coach" class="btn" style="margin-top:18px;background:#00ff99;color:#111;">Valider</button>
    </div>
  `;
  document.body.appendChild(modal);

  let selectedCoach = null;
  const desc = modal.querySelector("#coach-desc");

  const coachProfiles = {
    "Dorothee": "💚 Ta meilleure amie de parcours. Douce, bienveillante, elle t’aide à respirer entre les coups.",
    "Goathier": "🔵 Calme et réfléchi. Il t’aide à comprendre ton plan et à garder la structure mentale.",
    "Greg": "💥 Créatif et analytique. Il parle stats, rythme et mindset intelligent.",
    "Chill": "🌿 Relax, positif et un peu poète. Il t’aide à surfer sur le flow du jeu."
  };

  modal.querySelectorAll(".coach-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".coach-choice").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCoach = btn.dataset.coach;
      desc.textContent = coachProfiles[selectedCoach];
    });
  });

  modal.querySelector("#validate-coach").addEventListener("click", () => {
    if (!selectedCoach) {
      desc.textContent = "👉 Choisis ton coach avant de valider.";
      desc.style.color = "#f66";
      return;
    }

    localStorage.setItem("coach", selectedCoach);
    modal.remove();

    showCoachIA(`🎙️ ${selectedCoach} activé ! Prêt à te guider sur ce parcours.`);
    showMoodAndStrategyModal(); // Enchaîne sur la modale suivante
  });
}


function showMoodAndStrategyModal(onConfirm) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:400px;text-align:center;padding:20px;">
      <h3>😎 Ton mood du jour ?</h3>
      <div class="moods" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn mood" data-mood="focus">Focus</button>
        <button class="btn mood" data-mood="relax">Relax</button>
        <button class="btn mood" data-mood="fun">Fun</button>
        <button class="btn mood" data-mood="grind">Grind</button>
      </div>

      <h4 style="margin-top:18px;">🎯 Stratégie :</h4>
      <div class="coach-styles" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn strategy" data-strat="safe">Safe</button>
        <button class="btn strategy" data-strat="aggressive">Aggressive</button>
        <button class="btn strategy" data-strat="5050">50/50</button>
        <button class="btn strategy" data-strat="mindset">Mindset</button>
      </div>

      <button id="start-round" class="btn" style="margin-top:20px;background:#00ff99;color:#111;">🚀 Démarrer</button>
    </div>`;
  document.body.appendChild(modal);

  let selectedMood = null;
  let selectedStrat = null;

  // Sélection visuelle indépendante (les deux restent “actifs” dans LEUR groupe)
  modal.querySelectorAll(".mood").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMood = btn.dataset.mood;
    });
  });

  modal.querySelectorAll(".strategy").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".strategy").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedStrat = btn.dataset.strat;
    });
  });

  modal.querySelector("#start-round").addEventListener("click", () => {
    if (!selectedMood || !selectedStrat) {
      showCoachIA?.("⚠️ Choisis ton mood ET ta stratégie avant de commencer !");
      return;
    }
    localStorage.setItem("mood", selectedMood);
    localStorage.setItem("strategy", selectedStrat);
    modal.remove();
    showCoachIA?.(`🧠 Mood: ${selectedMood} · 🎯 Stratégie: ${selectedStrat}`);
    onConfirm?.();
  });
}




function renderHole(number = currentHole) {
  const holeCard = $$("hole-card");
  if (!holeCard) return console.warn("⚠️ #hole-card introuvable");
  if (!currentGolf) return;

  const hole = holes[number - 1];
  if (!hole) return summarizeRound();

  const par = hole.par;
  const saved = holes[number - 1] || {};
  const selectedDiff = (typeof saved.score === "number") ? (saved.score - par) : null;
  const totalVsPar = holes
    .filter(h => typeof h.score === "number")
    .reduce((acc, h) => acc + (h.score - h.par), 0);

  // Pré-sélection pour ce trou (on force à re-choisir si rien)
  currentDiff = selectedDiff;

  // Animation d’entrée
  holeCard.classList.remove("hole-animate-out");
  holeCard.classList.add("hole-animate-in");

  holeCard.style.display = "block";
  holeCard.innerHTML = `
    <div class="scorecard" style="text-align:center;padding:12px;">
      <h3 style="color:#00ff99;">⛳ Trou ${number}/${holes.length}</h3>
      <p>Par ${par} — Score total :
        <strong style="color:${totalVsPar>0?'#ff6666':totalVsPar<0?'#00ff99':'#fff'}">
          ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}
        </strong>
      </p>

      <div style="margin-top:12px;">
        <h4>Choisis ton score :</h4>
        <div id="score-options" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:6px;">
          <button class="btn score-btn ${selectedDiff===-1?'active':''}" data-diff="-1">Birdie</button>
          <button class="btn score-btn ${selectedDiff===0?'active':''}" data-diff="0">Par</button>
          <button class="btn score-btn ${selectedDiff===1?'active':''}" data-diff="1">Bogey</button>
          <button class="btn score-btn ${selectedDiff===2?'active':''}" data-diff="2">Double</button>
        </div>
      </div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
        <label><input type="checkbox" id="fairway" ${saved.fairway?'checked':''}> Fairway</label>
        <label><input type="checkbox" id="gir" ${saved.gir?'checked':''}> GIR</label>
        <label><input type="checkbox" id="routine" ${saved.routine?'checked':''}> Routine</label>
      </div>

      <div style="margin-top:10px;">
        <label>Distance du 2ᵉ putt :</label>
        <select id="dist2" style="margin-left:6px;padding:4px 6px;border-radius:6px;">
          <option value="">Choisir</option>
          <option value="1" ${saved.dist2==="1"?"selected":""}>Donné</option>
          <option value="2" ${saved.dist2==="2"?"selected":""}>1 putt</option>
          <option value="3" ${saved.dist2==="3"?"selected":""}>&lt; 2m</option>
          <option value="4" ${saved.dist2==="4"?"selected":""}>&lt; 4m</option>
          <option value="5" ${saved.dist2==="5"?"selected":""}>&lt; 6m</option>
          <option value="6" ${saved.dist2==="6"?"selected":""}>3 putts</option>
          <option value="7" ${saved.dist2==="7"?"selected":""}>4 putts</option>
        </select>
      </div>

      <!-- ✅ Bloc central “Trou X/18 + score total” -->
      <div class="hole-nav" style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
        <button id="prev-hole" class="btn" ${number===1?'disabled':''} style="flex:1;">⬅️</button>

        <div class="hole-info" style="
          flex:2;
          background:#111;
          border:1px solid #00ff99;
          border-radius:8px;
          padding:6px 8px;
          text-align:center;
          font-size:0.9rem;
          color:#00ff99;">
          Trou ${number}/${holes.length}<br>
          <span style="color:${totalVsPar>0?'#ff6666':totalVsPar<0?'#00ff99':'#fff'}">
            ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}
          </span>
        </div>

        <button id="next-hole" class="btn" style="flex:1;background:#00ff99;color:#111;">➡️</button>
      </div>
    </div>
  `;

  // Sélection du score (visuel blanc quand cliqué)
  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".score-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = parseInt(btn.dataset.diff);
    });
  });

  // Précédent
  $$("prev-hole")?.addEventListener("click", () => {
    // Animation sortie vers le bas (pour cohérence)
    holeCard.classList.remove("hole-animate-in");
    holeCard.classList.add("hole-animate-out");
    setTimeout(() => {
      if (currentHole > 1) {
        currentHole--;
        holeCard.classList.remove("hole-animate-out");
        renderHole(currentHole);
      }
    }, 350);
  });

  // Suivant (avec garde et animation)
  $$("next-hole")?.addEventListener("click", () => {
    if (currentDiff === null) {
      showCoachIA?.("⚠️ Choisis ton score avant de passer au trou suivant !");
      return;
    }

    // Sortie
    holeCard.classList.remove("hole-animate-in");
    holeCard.classList.add("hole-animate-out");

    setTimeout(() => {
      // Sauvegarde + feedback coach (après validation du trou)
      saveCurrentHole();
      const data = holes[currentHole - 1];
      analyzeHole(data);

      if (currentHole < holes.length) {
        currentHole++;
        // Ré-initialise la sélection du score pour le trou suivant
        currentDiff = null;
        holeCard.classList.remove("hole-animate-out");
        renderHole(currentHole);
      } else {
        summarizeRound();
      }
    }, 350);
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

function analyzeHole(hole) {
  if (!hole) return;
  const diff = hole.score - hole.par;
  const { fairway, gir, dist2 } = hole;

  // Parfect = Par + FW + GIR + ≤2 putts (ici on prend dist2 ∈ 1..5)
  const isParfect = (diff === 0) && fairway && gir && ["1","2","3","4","5"].includes(dist2);

  if (isParfect) {
    showCoachIA?.("💚 Parfect collecté ! Mental clean & routine au top.");
  } else if (diff < 0) {
    showCoachIA?.("🕊️ Birdie, du grand golf !");
  } else if (diff === 1) {
    showCoachIA?.("💙 Bogey’fect — propre et intelligent.");
  } else if (diff >= 2) {
    showCoachIA?.("😅 Pas grave. Respire, recentre-toi, on repart.");
  } else {
    showCoachIA?.("👌 Trou régulier, reste dans ton flow.");
  }
}


// === Exports globaux ===
window.initGolfSelect = initGolfSelect;
window.startNewRound = startNewRound;
window.showResumeOrNewModal = showResumeOrNewModal;
window.renderHole = renderHole;
