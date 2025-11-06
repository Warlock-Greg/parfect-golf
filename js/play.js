// === Parfect.golfr – play.js (MVP 2025 corrigé propre) ===
console.log("🏌️ Parfect.golfr Play.js chargé");

if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = null;
let totalParfects = parseInt(localStorage.getItem("totalParfects") || "0");

// === Modale Reprendre ou Nouvelle Partie ===
function showResumeOrNewModal() {
  const roundInProgress = localStorage.getItem("roundInProgress") === "true";
  const lastGolf = localStorage.getItem("currentGolf");

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style.zIndex = "12000";
  modal.innerHTML = `
    <div class="modal-card" style="text-align:center;padding:20px;">
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
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#resume-round")?.addEventListener("click", () => {
    modal.remove();
  const saved = JSON.parse(localStorage.getItem("holesData") || "[]");
    const lastGolfId = localStorage.getItem("currentGolf");
    if (saved.length && lastGolfId) {
      fetch("./data/golfs.json")
        .then(res => res.json())
        .then(golfs => {
          window.currentGolf = golfs.find(g => g.id === lastGolfId);
          window.holes = saved;
          window.currentHole = saved.findIndex(h => !h.score) + 1 || 1;
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
        ${golfs.map(g => `
          <button class="btn" data-id="${g.id}">
            ⛳ ${g.name}<br>
            <small style="color:#aaa;">${g.location}</small>
          </button>
        `).join("")}
      </div>
    `;

    golfSelect.querySelectorAll("button[data-id]").forEach(btn => {
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
  if (holeCard) { holeCard.style.display = "block"; holeCard.innerHTML = ""; }
  if (gameArea) gameArea.style.display = "block";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    const golf = golfs.find((g) => g.id === golfId);
    if (!golf) {
      if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">⚠️ Golf introuvable</p>`;
      return;
    }

    // 🛡️ Supporte plusieurs clés possibles
    const parsSource =
      Array.isArray(golf.pars) ? golf.pars :
      Array.isArray(golf.holes) ? golf.holes :
      Array.isArray(golf.coursePars) ? golf.coursePars :
      [];

    if (!parsSource.length) {
      console.warn("⚠️ Pas de tableau de pars dans ce golf:", golf);
      if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">⚠️ Données du parcours manquantes.</p>`;
      return;
    }

    // ✅ Initialise le contexte partie
    currentGolf = golf;
    currentHole = 1;
    holes = parsSource.map((par, i) => ({ number: i + 1, par }));
    currentDiff = null;

    // Sauvegardes
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);
    localStorage.setItem("golfData", JSON.stringify(golf));
    localStorage.setItem("holesData", JSON.stringify(holes));

    console.log("✅ Partie initialisée", { currentGolf, holesLen: holes.length });

    // 🧠 Mood/Strat → puis rendu
    showMoodAndStrategyModal(() => {
      const ga = document.getElementById("game-area");
      const hc = document.getElementById("hole-card");
      if (ga) ga.style.display = "block";
      if (hc) { hc.style.display = "block"; hc.innerHTML = ""; }
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

      <button id="start-round" class="btn" style="margin-top:20px;background:#00ff99;color:#111;">🚀 Démarrer</button>
    </div>
  `;
  document.body.appendChild(modal);

  let mood = "focus";
  let strat = "mindset";
  let coach = "dorothee";

  modal.querySelectorAll(".mood").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mood = btn.dataset.mood;
    });
  });

  modal.querySelectorAll(".strat").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".strat").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      strat = btn.dataset.strat;
    });
  });

  modal.querySelectorAll(".coach").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".coach").forEach(b => b.classList.remove("active"));
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

  // 🛡️ Garde-fous
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
    // Fin normale si on dépasse le nombre de trous
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
          <option value="3">&lt; 2m</option>
          <option value="4">&lt; 4m</option>
          <option value="5">&lt; 6m</option>
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
      currentDiff = parseInt(btn.dataset.diff);
    })
  );

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
}


// === Analyse trou ===
let lastCoachMessage = "";
function analyzeHole(holeData) {
  if (!holeData) return;
  const { score, par, fairway, gir, dist2 } = holeData;
  const diff = score - par;
  let message = "";

  if (diff === 0 && fairway && gir && ["1","2"].includes(dist2)) {
    totalParfects++;
    localStorage.setItem("totalParfects", totalParfects);
    updateParfectCounter();
    showConfetti();
    message = "💚 Parfect collecté ! Par + Fairway + GIR + ≤2 putts !";
  } else if (diff === 1 && fairway) {
    message = "💙 Bogey’fect ! Bogey solide, mental propre.";
  } else if (diff < 0) {
    message = "🕊️ Birdie ! Fluide et en contrôle.";
  } else {
    message = "👌 Continue ton flow.";
  }

  if (message !== lastCoachMessage) {
    lastCoachMessage = message;
    showCoachIA?.(message);
  }
}

// === Compteur Parfect ===
function updateParfectCounter() {
  const el = document.getElementById("parfect-counter");
  if (el) {
    el.textContent = `💚 ${totalParfects} Parfect${totalParfects>1?"s":""} collecté${totalParfects>1?"s":""}`;
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

// === Fin de partie ===
function summarizeRound() {
  const valid = holes.filter(h => h && typeof h.score === "number");
  const totalVsPar = valid.reduce((sum, h) => sum + (h.score - h.par), 0);
  const parfects = valid.filter(h => h.score - h.par === 0 && h.fairway && h.gir && ["1","2"].includes(h.dist2)).length;

  const history = JSON.parse(localStorage.getItem("history") || "[]");
  history.push({ date: new Date().toLocaleDateString(), golf: currentGolf?.name ?? "Inconnu", totalVsPar, parfects });
  localStorage.setItem("history", JSON.stringify(history));

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
    badge.textContent = `🏅 ${parfects} Parfect${parfects>1?"s":""} collecté${parfects>1?"s":""} !`;
  document.body.appendChild(badge);
  setTimeout(() => badge.remove(), 3000);

  showCoachIA?.(`🏁 Fin de partie ! Score total ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}, ${parfects} Parfect${parfects>1?"s":""} collecté${parfects>1?"s":""} !`);


showShareBadge(totalVsPar, parfects);
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
          <strong style="color:${totalVsPar>0?'#ff3333':'#111'};">
            ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}
          </strong>
        </p>
        <p style="margin:6px 0;font-size:1.2rem;">💚 ${parfects} Parfect${parfects>1?'s':''} collecté${parfects>1?'s':''}</p>
      </div>

      <div style="margin-top:10px;font-size:0.95rem;">
        <p>😎 Mood : <strong>${mood}</strong></p>
        <p>🎯 Stratégie : <strong>${strat}</strong></p>
        <p>🧑‍🏫 Coach : <strong>${coach}</strong></p>
      </div>

      <div style="margin-top:16px;display:flex;justify-content:center;gap:10px;">
        <button id="download-badge" class="btn" 
          style="background:#111;color:#00ff99;border-radius:10px;padding:8px 16px;">📸 Télécharger</button>
        <button id="close-badge" class="btn" 
          style="background:#ff3366;color:#fff;border-radius:10px;padding:8px 16px;">❌ Fermer</button>
      </div>

      <p style="font-size:0.85rem;margin-top:10px;opacity:0.8;">#parfectgolfr #mindset #golfjourney</p>
    </div>
  `;

  document.body.appendChild(badge);

  // 📸 Télécharger le badge
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

  // ❌ Fermer
  badge.querySelector("#close-badge").addEventListener("click", () => badge.remove());
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
    dist2 
  };

  localStorage.setItem("holesData", JSON.stringify(holes));
  localStorage.setItem("roundInProgress", "true");
}


// === Exports ===
window.startNewRound = startNewRound;
window.renderHole = renderHole;
window.analyzeHole = analyzeHole;
