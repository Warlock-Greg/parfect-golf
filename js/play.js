// === Parfect.golfr – play.js (MVP 2025 avec Parfect + Double popup + Putting v2) ===
console.log("🏌️ Parfect.golfr Play.js chargé");

if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = null;
let totalParfects = parseInt(localStorage.getItem("totalParfects") || "0");

// === Helpers génériques ===
function pickRandom(arr) {
  if (!arr || !arr.length) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCoachContext() {
  const coachKey = (localStorage.getItem("coach") || "dorothee").toLowerCase();
  const mood = (localStorage.getItem("mood") || "focus").toLowerCase();
  const strategy = (localStorage.getItem("strategy") || "mindset").toLowerCase();
  return { coachKey, mood, strategy };
}

// Fallback si le JSON global COACH_COMMENTS n’est pas dispo
const FALLBACK_DOUBLE_MESSAGES = {
  dorothee: [
    "🤗 C’est pas grave, souffle et repars. Ton attitude compte plus que le score.",
    "🌈 Mauvais coup ? Oui, mais bon mental. L’important, c’est la réaction.",
    "💭 Même les pros en font. Tu restes dans ton jeu.",
  ],
  gauthier: [
    "🧱 Mauvais coup, certes, mais ton mental reste intact.",
    "🧘 Reviens à la base : respiration, ancrage, tempo.",
    "⚖️ Observe sans juger, analyse sans tension.",
  ],
  greg: [
    "📉 Ok, petit coup dur. 1 trou, pas une tendance.",
    "🧠 Mauvaise stratégie ? Note-le, ajuste et avance.",
    "📈 Ce double, c’est une info, pas une sanction.",
  ],
};

// Hints par RAISON + MOOD
const DOUBLE_REASON_HINTS = {
  drive_egare: {
    focus: "🎯 Drive égaré : choisis une cible claire et un point d’alignement précis au prochain départ.",
    relax: "🌿 Drive lâché, rien de grave : respire et simplifie ta cible au prochain coup.",
    fun: "😄 Drive dans les choux, mais l’histoire est bonne. Prochaine fois, vise plus petit.",
    grind: "🧱 Drive égaré : prends l’info, ajuste ton alignement et valide ta routine au départ.",
  },
  hors_limites: {
    focus: "🚧 Hors limites : note la zone à éviter et reste engagé sur ta cible la prochaine fois.",
    relax: "🌬️ Balle dehors, mais toi tu restes dedans. Laisse passer la frustration.",
    fun: "🤷‍♂️ HL, ça arrive. Raconte la blague qui va avec et avance.",
    grind: "📓 HL = info. Enregistre le pattern et corrige sur le prochain départ.",
  },
  penalite: {
    focus: "💧 Zone à pénalité : visualise mieux la zone safe, pas la zone rouge.",
    relax: "🌊 Petite baignade de balle : garde ton sourire, le jeu continue.",
    fun: "🏊 Ta balle a pris son ticket piscine. Prochaine fois, vise un peu plus large.",
    grind: "🧠 Pénalité notée. Ajuste ta cible pour garder ta stratégie sous contrôle.",
  },
  strategie: {
    focus: "🧭 Mauvaise stratégie : redéfinis ton plan avant d’attaquer le trou suivant.",
    relax: "🌀 Le choix était ambitieux. Prochaine fois, choisis la version simple.",
    fun: "🎲 T’as tenté, ça n’est pas passé. C’est le jeu, garde le fun mais ajuste un cran.",
    grind: "📊 Stratégie à optimiser : recadre ton plan sur tes zones fortes.",
  },
  miss_technique: {
    focus: "🎯 Gros miss technique : reviens à un seul point clé simple au prochain coup.",
    relax: "😌 Mauvais contact, mais pas grave. Lâche la technique, retrouve le feeling.",
    fun: "🪓 Gros miss, mais t’es toujours là. On en rit et on tourne la page.",
    grind: "🔧 Note ce miss, corrige-le au practice, mais pas dans ta tête sur le parcours.",
  },
  negociation: {
    focus: "🤝 Coup mal négocié : clarifie ton choix AVANT de t’installer sur la balle.",
    relax: "🍃 Ne reste pas bloqué dessus. La prochaine décision sera plus simple.",
    fun: "🃏 Mauvais deal sur ce coup, mais la partie est longue.",
    grind: "📌 Ce coup t’apprend où être plus clair dans ton plan.",
  },
  autre: {
    focus: "🧠 Ce trou t’apprend quelque chose sur toi. Garde-le comme info, pas comme jugement.",
    relax: "🌈 Ok, trou bizarre. Laisse-le derrière toi.",
    fun: "🎭 Trou chelou, histoire marrante. On passe au suivant.",
    grind: "📚 Note ce trou comme une expérience, pas comme une sanction.",
  },
};

// Hints par STRATÉGIE
const STRATEGY_HINTS = {
  safe: "🎯 En mode Safe, autorise-toi des choix très simples sur les prochains départs.",
  aggressive: "🔥 En mode Aggressive, garde l’audace mais choisis soigneusement quand prendre le risque.",
  "5050": "⚖️ En mode 50/50, accepte que parfois ça tombe du mauvais côté sans remettre tout en cause.",
  mindset: "🧘 En mode Mindset, recentre-toi sur respiration, routine et intention, pas sur le score.",
};

// Récupère un message base double depuis le JSON global ou fallback
function getBaseDoubleMessages(coachKey) {
  const global = window.COACH_COMMENTS;
  const mapKey =
    coachKey === "dorothee"
      ? "Dorothee"
      : coachKey === "gauthier"
      ? "Gauthier"
      : coachKey === "greg"
      ? "Greg"
      : null;

  if (global && mapKey && global[mapKey] && Array.isArray(global[mapKey].double)) {
    return global[mapKey].double;
  }
  return FALLBACK_DOUBLE_MESSAGES[coachKey] || ["Double bogey, on analyse et on repart."];
}

// Construit le message coach pour un double / triple
function buildDoubleCoachMessage(holeData, reasonKey) {
  const { coachKey, mood, strategy } = getCoachContext();

  const baseList = getBaseDoubleMessages(coachKey);
  const baseMsg = pickRandom(baseList);

  const moodHintsForReason = DOUBLE_REASON_HINTS[reasonKey] || {};
  const moodHint =
    moodHintsForReason[mood] ||
    moodHintsForReason.focus ||
    "";

  const stratHint = STRATEGY_HINTS[strategy] || "";

  const parts = [baseMsg, moodHint, stratHint].filter(Boolean);
  return parts.join(" ");
}

// Modale pour demander la raison du double/triple
function showDoubleReasonModal(onReasonChosen) {
  const existing = document.querySelector(".modal-backdrop.double-reason-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.className = "modal-backdrop double-reason-modal";
  modal.style.zIndex = "12000";

  modal.innerHTML = `
    <div class="modal-card" id="double-reason-card" style="max-width:420px;text-align:center;padding:20px;">
      <h3>🤔 Que s’est-il passé sur ce trou ?</h3>
      <p style="font-size:0.9rem;opacity:0.85;">Choisis ce qui décrit le mieux ton double/triple.</p>
      <div id="double-reason-buttons" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px;">
        <button class="btn reason-btn" data-reason="drive_egare">Drive égaré</button>
        <button class="btn reason-btn" data-reason="hors_limites">Hors limites</button>
        <button class="btn reason-btn" data-reason="penalite">Zone à pénalité</button>
        <button class="btn reason-btn" data-reason="strategie">Mauvaise stratégie</button>
        <button class="btn reason-btn" data-reason="miss_technique">Gros miss technique</button>
        <button class="btn reason-btn" data-reason="negociation">Coup mal négocié</button>
        <button class="btn reason-btn" data-reason="autre">Autre</button>
      </div>
      <button id="confirm-double-reason" class="btn" style="margin-top:16px;background:var(--pg-green-main);color:#111;">Valider</button>
    </div>
  `;

  document.body.appendChild(modal);

  let selectedReason = null;

  modal.querySelector("#double-reason-card").addEventListener("click", (e) => e.stopPropagation());

  modal.querySelectorAll(".reason-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".reason-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedReason = btn.dataset.reason;
    });
  });

  modal.querySelector("#confirm-double-reason").addEventListener("click", () => {
    if (!selectedReason) {
      const card = modal.querySelector("#double-reason-card");
      card.style.animation = "shake 0.2s";
      setTimeout(() => (card.style.animation = ""), 200);
      return;
    }
    modal.remove();
    if (typeof onReasonChosen === "function") onReasonChosen(selectedReason);
  });
}

// === Modale Reprendre ou Nouvelle Partie ===
function showResumeOrNewModal() {
  if (document.querySelector(".modal-backdrop.resume-modal")) {
    return;
  }

  const roundInProgress = localStorage.getItem("roundInProgress") === "true";

  const modal = document.createElement("div");
  modal.className = "modal-backdrop resume-modal";
  modal.style.zIndex = "12000";

  modal.innerHTML = `
    <div class="modal-card" id="resume-modal-card" style="text-align:center;padding:20px;">
      <!-- Header: Retour -->
      <div style="display:flex;justify-content:flex-start;align-items:center;margin-bottom:8px;">
        <button id="resume-back" class="btn" type="button"
          style="
            background: transparent;
            border: 1px solid rgba(255,255,255,0.20);
            color: var(--pg-green-main, #00ff99);
            border-radius: 999px;
            padding: 6px 12px;
            font-size: 0.85rem;
          "
        >← Retour</button>
      </div>
      
      <h3>🎮 Partie en cours ?</h3>
      ${
        roundInProgress
          ? `<p>Souhaites-tu reprendre ta partie ou recommencer ?</p>
             <div style="display:flex;gap:10px;justify-content:center;">
               <button class="btn" id="resume-round">Reprendre</button>
               <button class="btn" id="new-round">Nouvelle</button>
             </div>`
          : `<p>Prêt à démarrer ?</p>
             <button class="btn" id="new-round">🚀 Démarrer</button>`
      }
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#resume-modal-card").addEventListener("click", (e) => e.stopPropagation());

   // ✅ Bouton RETOUR (ferme juste la modale)
  modal.querySelector("#resume-back")?.addEventListener("click", () => {
    modal.remove();
  });
  
  modal.querySelector("#resume-round")?.addEventListener("click", () => {
    modal.remove();

    const saved = JSON.parse(localStorage.getItem("holesData") || "[]");
    const lastGolfId = localStorage.getItem("currentGolf");
    if (saved.length && lastGolfId) {
      fetch("./data/golfs.json")
        .then((res) => res.json())
        .then((golfs) => {
          window.currentGolf = golfs.find((g) => g.id === lastGolfId);
          window.holes = saved;
          window.currentHole = saved.findIndex((h) => !h.score) + 1 || 1;
          renderHole(currentHole);
        });
    }
  });

  modal.querySelector("#new-round")?.addEventListener("click", () => {
    modal.remove();
    initGolfSelect();
  });
}

window.showResumeOrNewModal = showResumeOrNewModal;

// === Sélecteur de golf (MVP) ===
async function initGolfSelect() {
  const gameArea = document.getElementById("game-area");
  const golfSelect = document.getElementById("golf-select");
  const holeCard = document.getElementById("hole-card");

  if (!golfSelect) {
    console.warn("⚠️ #golf-select introuvable dans le DOM");
    return;
  }

  if (gameArea) gameArea.style.display = "block";
  if (holeCard) holeCard.style.display = "none";
  golfSelect.style.display = "block";
  golfSelect.innerHTML = `<p style="color:#aaa;">Chargement des golfs…</p>`;

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();

    golfSelect.innerHTML = `
      <h3 style="color:#00ff99;margin:8px 0;">Choisis ton golf</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${golfs
          .map(
            (g) => `
          <button class="btn" data-id="${g.id}">
            ⛳ ${g.name}<br>
            <small style="color:#aaa;">${g.location}</small>
          </button>
        `
          )
          .join("")}
      </div>
    `;

    golfSelect.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        startNewRound(id);
      });
    });
  } catch (err) {
    console.error("❌ Erreur chargement golfs.json :", err);
    golfSelect.innerHTML = `<p style="color:#f55;">Erreur de chargement des golfs</p>`;
  }
}

window.initGolfSelect = initGolfSelect;

// === Démarrage de partie (robuste) ===
async function startNewRound(golfId) {
  console.log("🎯 Nouvelle partie démarrée :", golfId);

  const gameArea = document.getElementById("game-area");
  const holeCard = document.getElementById("hole-card");
  const golfSelect = document.getElementById("golf-select");

  if (golfSelect) golfSelect.style.display = "none";
  if (holeCard) {
    holeCard.style.display = "block";
    holeCard.innerHTML = "";
  }
  if (gameArea) gameArea.style.display = "block";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    const golf = golfs.find((g) => g.id === golfId);
    if (!golf) {
      if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">⚠️ Golf introuvable</p>`;
      return;
    }

    const parsSource =
      Array.isArray(golf.pars)
        ? golf.pars
        : Array.isArray(golf.holes)
        ? golf.holes
        : Array.isArray(golf.coursePars)
        ? golf.coursePars
        : [];

    if (!parsSource.length) {
      console.warn("⚠️ Pas de tableau de pars dans ce golf:", golf);
      if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">⚠️ Données du parcours manquantes.</p>`;
      return;
    }

    currentGolf = golf;
    currentHole = 1;
    holes = parsSource.map((par, i) => ({ number: i + 1, par }));
    currentDiff = null;

    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);
    localStorage.setItem("golfData", JSON.stringify(golf));
    localStorage.setItem("holesData", JSON.stringify(holes));

    console.log("✅ Partie initialisée", { currentGolf, holesLen: holes.length });

    showMoodAndStrategyModal(() => {
      const ga = document.getElementById("game-area");
      const hc = document.getElementById("hole-card");
      if (ga) ga.style.display = "block";
      if (hc) {
        hc.style.display = "block";
        hc.innerHTML = "";
      }
      renderHole(1);
    });
  } catch (err) {
    console.error("❌ Erreur chargement golf :", err);
    if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">Erreur de chargement du golf</p>`;
  }
}

// === Mood & Stratégie avant la partie ===
function showMoodAndStrategyModal(onConfirm) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style.zIndex = "12000";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:400px;text-align:center;padding:20px;">
      <h3>😎 Mood du jour</h3>
      <div id="mood-buttons" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px;">
        <button class="btn mood" data-mood="focus">Focus</button>
        <button class="btn mood" data-mood="relax">Relax</button>
        <button class="btn mood" data-mood="fun">Fun</button>
        <button class="btn mood" data-mood="grind">Grind</button>
      </div>

      <h4 style="margin-top:18px;">🎯 Stratégie</h4>
      <div id="strategy-buttons" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px;">
        <button class="btn strat" data-strat="safe">Safe</button>
        <button class="btn strat" data-strat="aggressive">Aggressive</button>
        <button class="btn strat" data-strat="5050">50/50</button>
        <button class="btn strat" data-strat="mindset">Mindset</button>
      </div>

      <h4 style="margin-top:18px;">🧑‍🏫 Choisis ton coach</h4>
      <div id="coach-buttons" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px;">
        <button class="btn coach" data-coach="dorothee">Dorothée</button>
        <button class="btn coach" data-coach="greg">Greg</button>
        <button class="btn coach" data-coach="gauthier">Gauthier</button>
      </div>

      <button id="start-round" class="btn" style="margin-top:20px;background:var(--pg-green-main);color:#111;">🚀 Démarrer</button>
    </div>
  `;
  document.body.appendChild(modal);

  let mood = "focus";
  let strat = "mindset";
  let coach = "dorothee";

  modal.querySelectorAll(".mood").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mood = btn.dataset.mood;
    });
  });

  modal.querySelectorAll(".strat").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".strat").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      strat = btn.dataset.strat;
    });
  });

  modal.querySelectorAll(".coach").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".coach").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      coach = btn.dataset.coach;
    });
  });

  modal.querySelector("#start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    localStorage.setItem("coach", coach);
    modal.remove();

    showCoachIA?.(`🧠 Mood: ${mood} · 🎯 Stratégie: ${strat} · 🗣️ Coach: ${coach}`);
    if (typeof onConfirm === "function") onConfirm();
  });
}

window.showMoodAndStrategyModal = showMoodAndStrategyModal;

// === Rendu de la carte (sécurisé) ===
function renderHole(number = currentHole) {
  const holeCard = document.getElementById("hole-card");
  if (!holeCard) return;

  if (!currentGolf) {
    holeCard.innerHTML = `<p style="color:#f55;">⚠️ Aucune partie active (golf manquant).</p>`;
    return;
  }
  if (!Array.isArray(holes) || holes.length === 0) {
    holeCard.innerHTML = `<p style="color:#f55;">⚠️ Aucunes données de trous.</p>`;
    return;
  }

  const hole = holes[number - 1];
  if (!hole) {
    summarizeRound();
    return;
  }

  holeCard.style.display = "block";

  const par = hole.par;
  const saved = holes[number - 1] || {};
  const totalVsPar = holes
    .filter((h) => h.score !== undefined)
    .reduce((a, h) => a + (h.score - h.par), 0);

  holeCard.classList.add("hole-animate-in");
  setTimeout(() => holeCard.classList.remove("hole-animate-in"), 400);

  const fairwayCheckbox =
    par === 3
      ? ""
      : `<label class="tag-toggle">
          <input type="checkbox" id="fairway" ${saved.fairway ? "checked" : ""}>
          <span>Fairway</span>
         </label>`;

  holeCard.innerHTML = `
    <div class="scorecard" style="
      text-align:center;
      padding:14px 12px;
      border-radius:18px;
      background:linear-gradient(145deg,#101820,#05080c);
      box-shadow:0 0 18px rgba(0,0,0,0.65);
      border:1px solid rgba(0,255,153,0.15);
    ">
      <!-- Header trou + total -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="text-align:left;">
          <div style="font-size:0.8rem;opacity:.75;">Trou</div>
          <div style="font-size:1.1rem;color:var(--pg-green-main);font-weight:600;">${number}/${holes.length}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:0.8rem;opacity:.75;">Par</div>
          <div style="font-size:1.1rem;font-weight:600;">${par}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.8rem;opacity:.75;">Total</div>
          <div style="
            font-size:1.1rem;
            font-weight:600;
            color:${totalVsPar > 0 ? "#ff6666" : totalVsPar < 0 ? "#00ff99" : "#fff"};
          ">
            ${totalVsPar > 0 ? `+${totalVsPar}` : totalVsPar}
          </div>
        </div>
      </div>

      <!-- Boutons score -->
      <h4 style="margin:6px 0 4px;font-size:0.9rem;opacity:.85;">Score du trou</h4>
      <div id="score-options" style="
        display:flex;
        gap:6px;
        justify-content:center;
        flex-wrap:wrap;
        margin-bottom:6px;
      ">
        <button class="btn score-btn" data-diff="-2">🦅 Eagle</button>
        <button class="btn score-btn" data-diff="-1">🕊️ Birdie</button>
        <button class="btn score-btn" data-diff="0">🟢 Par</button>
        <button class="btn score-btn" data-diff="1">⚪ Bogey</button>
        <button class="btn score-btn" data-diff="2">🟠 Double</button>
        <button class="btn score-btn" data-diff="3">🔴 Triple</button>
      </div>

      <!-- Putting -->
      <div style="margin-top:8px;">
        <label style="font-size:0.85rem;opacity:.85;">Putting :</label>
        <select id="dist2" style="
          margin-left:6px;
          padding:4px 8px;
          border-radius:999px;
          background:#05080c;
          color:#fff;
          border:1px solid rgba(255,255,255,0.15);
          font-size:0.8rem;
        ">
          <option value="">Choisir</option>
          <option value="1">1 putt</option>
          <option value="2">2 putts donné</option>
          <option value="3">2 putts 2m</option>
          <option value="4">2 putts 4m</option>
          <option value="5">2 putts 6m</option>
          <option value="6">3 putts</option>
          <option value="7">4 putts</option>
        </select>
      </div>

      <!-- Tags Fairway / GIR / Routine -->
      <div style="
        margin-top:10px;
        display:flex;
        gap:8px;
        justify-content:center;
        flex-wrap:wrap;
        font-size:0.8rem;
      ">
        ${fairwayCheckbox}
        <label class="tag-toggle">
          <input type="checkbox" id="gir" ${saved.gir ? "checked" : ""}>
          <span>GIR</span>
        </label>
        <label class="tag-toggle">
          <input type="checkbox" id="routine" ${saved.routine ? "checked" : ""}>
          <span>Routine</span>
        </label>
      </div>

      <!-- Navigation + fin de partie -->
      <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
        <button id="prev-hole" class="btn" ${number === 1 ? "disabled" : ""}>⬅️ Préc.</button>
        <div id="hole-info" style="font-size:0.8rem;color:#aaa;">Trou ${number}/${holes.length}</div>
        <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">Suivant ➡️</button>
      </div>

      <div style="margin-top:6px;">
        <button id="end-round" class="btn" style="
          font-size:0.8rem;
          background:transparent;
          border:1px solid rgba(255,255,255,0.25);
          color:#fff;
          padding:4px 10px;
          border-radius:999px;
        ">
          🏁 Terminer la partie
        </button>
      </div>
    </div>`;

  // Score selection
  document.querySelectorAll(".score-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".score-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = parseInt(btn.dataset.diff);
    })
  );

  // Next / Prev
  document.getElementById("next-hole").addEventListener("click", () => {
    if (currentDiff === null || isNaN(currentDiff)) {
      showCoachIA?.("⚠️ Choisis ton score avant de passer au trou suivant !");
      return;
    }
    saveCurrentHole();
    analyzeHole(holes[currentHole - 1]);
    if (currentHole < holes.length) {
      currentHole++;
      renderHole(currentHole);
    } else {
      summarizeRound();
    }
  });

  document.getElementById("prev-hole")?.addEventListener("click", () => {
    if (currentHole > 1) {
      currentHole--;
      renderHole(currentHole);
    }
  });

  // 🏁 Bouton Terminer la partie
  document.getElementById("end-round")?.addEventListener("click", () => {
    if (confirm("Terminer la partie maintenant et enregistrer les scores joués ?")) {
      saveCurrentHole(); // on enregistre le trou actuel avant de finir
      summarizeRound();
    }
  });
}


// === Analyse trou ===
let lastCoachMessage = "";
function analyzeHole(holeData) {
  if (!holeData) return;
  const { score, par, fairway, gir, dist2 } = holeData;
  const diff = score - par;
  let message = "";

  const hasFairway = par === 3 ? true : !!fairway; // Par 3 : fairway auto OK
  const goodPutting = ["1", "2", "3", "4", "5"].includes(dist2); // putting OK 1→5

  const isParfect =
    diff <= 0 &&      // Par, Birdie, Eagle
    hasFairway &&
    gir &&
    goodPutting;

  if (isParfect) {
    totalParfects++;
    localStorage.setItem("totalParfects", totalParfects);
    updateParfectCounter();
    showConfetti();
    message = "💚 Parfect collecté ! Par/Birdie/Eagle + GIR + putting 1 à 5 (et fairway sauf Par 3).";
  } else if (diff === 1 && hasFairway) {
    message = "💙 Bogey’fect ! Bogey solide, garde ton mental propre.";
  } else if (diff < 0) {
    message = "🕊️ Birdie ! Fluide et en contrôle.";
  } else if (diff >= 2) {
    // Double ou plus : ouvre la modale “Que s’est-il passé ?”
    showDoubleReasonModal((reasonKey) => {
      const msg = buildDoubleCoachMessage(holeData, reasonKey);
      if (msg && msg !== lastCoachMessage) {
        lastCoachMessage = msg;
        showCoachIA?.(msg);
      }
    });
  } else {
    message = "👌 respecte la règle du n'importe où : sur le farway, sur le green proche du trou. Pense à ta routine, ta rotation et ton tempo.";
  }

  if (message && diff < 2) {
    if (message !== lastCoachMessage) {
      lastCoachMessage = message;
      showCoachIA?.(message);
    }
  }
}

// === Compteur Parfect ===
function updateParfectCounter() {
  const el = document.getElementById("parfect-counter");
  if (el) {
    el.textContent = `💚 ${totalParfects} Parfect${totalParfects > 1 ? "s" : ""} collecté${totalParfects > 1 ? "s" : ""}`;
    el.style.transform = "scale(1.3)";
    setTimeout(() => (el.style.transform = "scale(1)"), 300);
  }
}

// === Confetti léger ===
function showConfetti() {
  for (let i = 0; i < 12; i++) {
    const dot = document.createElement("div");
    dot.style.position = "fixed";
    dot.style.width = dot.style.height = "6px";
    dot.style.background = "#00ff99";
    dot.style.left = Math.random() * 100 + "%";
    dot.style.top = "50%";
    dot.style.borderRadius = "50%";
    dot.style.zIndex = "99999";
    dot.style.opacity = 1;
    dot.style.transition = "all 0.8s ease-out";
    document.body.appendChild(dot);
    setTimeout(() => {
      dot.style.top = 100 * Math.random() + "%";
      dot.style.opacity = 0;
      dot.style.transform = "translateY(-40px)";
    }, 20);
    setTimeout(() => dot.remove(), 900);
  }
}

async function saveRoundToNocoDB(roundSummary) {
  if (!window.NOCODB_ROUNDS_URL || !window.NOCODB_TOKEN) {
    console.warn("NocoDB config manquante");
    return;
  }

  const user = window.userLicence;

  const now = new Date().toISOString();

  const payload = {
    mail: user?.email ?? null,               // ⚠️ colonne = mail
    golf_name: roundSummary.golfName ?? "",
    source: "parfect_app",                   // utile pour analytics
    last_seen: now,

    total_score: roundSummary.totalScore ?? 0,
    total_vs_par: roundSummary.totalVsPar ?? 0,
    parfects: roundSummary.parfects ?? 0,
    fairways_hit: roundSummary.fairwaysHit ?? 0,
    greens_in_reg: roundSummary.greensInReg ?? 0,
    putts: roundSummary.putts ?? 0,
    mental_score: roundSummary.mentalScore ?? 0,

    summary_json: JSON.stringify(roundSummary)
  };

  try {
    const res = await fetch(window.NOCODB_ROUNDS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xc-token": window.NOCODB_TOKEN
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }

    console.log("✅ Partie sauvegardée (optimisée)");
  } catch (err) {
    console.error("❌ Save round error", err);
  }
}

// === Fin de partie ===
async function summarizeRound() {
  const valid = (holes || []).filter((h) => h && typeof h.score === "number");

  const totalVsPar = valid.reduce((sum, h) => sum + ((h.score ?? 0) - (h.par ?? 0)), 0);
  const totalScore = valid.reduce((sum, h) => sum + (h.score ?? 0), 0);

  const parfects = valid.filter((h) => {
    const par = h.par ?? 0;
    const score = h.score ?? 999;
    const diff = score - par;

    const hasFairway = par === 3 ? true : !!h.fairway;
    const goodPutting = ["1", "2", "3", "4", "5"].includes(String(h.dist2 ?? ""));
    return diff <= 0 && hasFairway && !!h.gir && goodPutting;
  }).length;

  const roundSummary = {
    golfName: currentGolf?.name ?? "Inconnu",
    totalScore,
    totalVsPar,
    parfects,
    mentalScore: window.TrainingSession?.mental_score ?? null,
    holesCount: valid.length
  };

  // ✅ UI badge (revient)
  const badge = document.createElement("div");
  badge.style = `
    position:fixed;
    top:50%;
    left:50%;
    transform:translate(-50%,-50%);
    background:#00ff99;
    color:#111;
    padding:20px 30px;
    border-radius:20px;
    font-weight:bold;
    font-size:1.2rem;
    box-shadow:0 0 20px #00ff99aa;
    z-index:12000;
  `;
  badge.textContent = `🏅 ${parfects} Parfect${parfects > 1 ? "s" : ""} collecté${parfects > 1 ? "s" : ""} !`;
  document.body.appendChild(badge);
  setTimeout(() => badge.remove(), 3000);

  showCoachIA?.(
    `🏁 Fin de partie ! Score total ${totalVsPar > 0 ? `+${totalVsPar}` : totalVsPar}, ${parfects} Parfect${
      parfects > 1 ? "s" : ""
    } collecté${parfects > 1 ? "s" : ""} !`
  );

  showShareBadge?.(totalVsPar, parfects);

  // ✅ Sauvegarde NocoDB (après UI pour éviter impression “rien ne se passe”)
  try {
    await saveRoundToNocoDB(roundSummary);
  } catch (e) {
    console.error("[Round] NocoDB save failed", e);
  }

  return roundSummary;
}



// === 🏆 BADGE INSTAGRAM DELUXE ===
function showShareBadge(totalVsPar, parfects) {
  const mood = localStorage.getItem("mood") || "Focus";
  const strat = localStorage.getItem("strategy") || "Mindset";
  const coach = localStorage.getItem("coach") || "Parfect";

  const badge = document.createElement("div");
  badge.id = "share-badge";
  badge.style = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 92%;
    max-width: 380px;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 0 40px #00ff99aa;
    z-index: 15000;
    font-family: 'Poppins', sans-serif;
    background: radial-gradient(circle at top, #00ff99 0%, #008f66 100%);
    color: #111;
    text-align: center;
    animation: fadeInBadge 0.6s ease forwards;
  `;

  badge.innerHTML = `
    <div style="padding:20px 20px 10px;">
      <img src="https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/logo%20parfect%20v2.png" 
           style="width:64px;height:64px;border-radius:12px;margin-bottom:6px;" alt="Parfect.golfr" />
      <h2 style="margin:0;font-size:1.4rem;">Parfect.golfr</h2>
      <p style="margin:4px 0 10px;font-size:0.9rem;opacity:0.9;">${new Date().toLocaleDateString()}</p>

      <div style="background:rgba(255,255,255,0.15);padding:10px 14px;border-radius:16px;">
        <p style="margin:6px 0;font-size:1.3rem;">Score total : 
          <strong style="color:${totalVsPar > 0 ? "#ff3333" : "#111"};">
            ${totalVsPar > 0 ? `+${totalVsPar}` : totalVsPar}
          </strong>
        </p>
        <p style="margin:6px 0;font-size:1.2rem;">💚 ${parfects} Parfect${parfects > 1 ? "s" : ""} collecté${
    parfects > 1 ? "s" : ""
  }</p>
      </div>

      <div style="margin-top:10px;font-size:0.95rem;">
        <p>😎 Mood : <strong>${mood}</strong></p>
        <p>🎯 Stratégie : <strong>${strat}</strong></p>
        <p>🧑‍🏫 Coach : <strong>${coach}</strong></p>
      </div>

      <div style="margin-top:16px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
  <button id="download-badge" class="btn"
    style="background:#111;color:#00ff99;border-radius:10px;padding:8px 16px;">
    📸 Télécharger
  </button>

  <button id="share-badge-btn" class="btn"
    style="background:rgba(17,17,17,0.85);color:#fff;border-radius:10px;padding:8px 16px;border:1px solid rgba(255,255,255,0.18);">
    📤 Partager
  </button>

  <button id="go-social-btn" class="btn"
    style="background:var(--pg-green-main,#00ff99);color:#111;border-radius:10px;padding:8px 16px;">
    👥 Voir dans Social
  </button>

  <button id="close-badge" class="btn"
    style="background:transparent;color:#fff;border-radius:10px;padding:8px 16px;border:1px solid rgba(255,255,255,0.22);">
    Fermer
  </button>
</div>

      <p style="font-size:0.85rem;margin-top:10px;opacity:0.8;">#parfectgolfr #mindset #golfjourney</p>
    </div>
  `;

  document.body.appendChild(badge);

  badge.querySelector("#download-badge").addEventListener("click", async () => {
    try {
      const canvas = await html2canvas(badge, { backgroundColor: "#00ff99" });
      const link = document.createElement("a");
      link.download = `parfect-badge-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Erreur génération image :", err);
      alert("⚠️ Téléchargement non supporté sur ce navigateur.");
    }
  });

  // PATCH: fermer
  badge.querySelector("#close-badge").addEventListener("click", () => badge.remove());

  // PATCH: share (Web Share si dispo, sinon copie)
  badge.querySelector("#share-badge-btn")?.addEventListener("click", async () => {
    const golfName = currentGolf?.name || "Mon parcours";
    const text = `🏌️ ${golfName} — Score ${totalVsPar > 0 ? `+${totalVsPar}` : totalVsPar} — 💚 ${parfects} Parfect(s)\n#parfectgolfr #mindset #golfjourney`;

    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (e) {
      // user canceled -> ignore
    }

    try {
      await navigator.clipboard.writeText(text);
      showCoachIA?.("✅ Texte copié. Colle-le dans Instagram / WhatsApp.");
    } catch (e) {
      alert(text);
    }
  });

  // PATCH: go social
  badge.querySelector("#go-social-btn")?.addEventListener("click", () => {
    badge.remove();

    // 1) Si tu as un routeur / showView
    if (typeof window.showView === "function") {
      window.showView("friends-area");
      window.injectSocialUI?.();
      window.refreshSocialData?.();
      return;
    }

    // 2) Fallback: anchor hash
    location.hash = "#social";
  });
}

// === Sauvegarde trou ===
function saveCurrentHole() {
  const fairway = $$("fairway")?.checked || false;
  const gir = $$("gir")?.checked || false;
  const routine = $$("routine")?.checked || false;
  const dist2 = $$("dist2")?.value || "";
  const par = holes[currentHole - 1]?.par ?? 4;

  holes[currentHole - 1] = {
    number: currentHole,
    par,
    score: par + (currentDiff ?? 0),
    fairway,
    gir,
    routine,
    dist2,
  };

  localStorage.setItem("holesData", JSON.stringify(holes));
  localStorage.setItem("roundInProgress", "true");
}

// === Exports ===
window.startNewRound = startNewRound;
window.renderHole = renderHole;
window.analyzeHole = analyzeHole;
