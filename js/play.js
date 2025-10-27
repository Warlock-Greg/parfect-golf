// === Parfect.golfr - PLAY.JS (v2025 MVP + Coach IA intégré) ===

// --- Helper DOM (sécurisé) ---
const $$ = (id) => document.getElementById(id);

// --- Variables globales ---
let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = 0;

// === Initialisation du choix de golf ===
async function initGolfSelect() {
  const container = $$("golf-select");
  if (!container) {
    console.warn("⚠️ Élément #golf-select introuvable");
    return;
  }

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();

    container.innerHTML = `
      <h3 style="color:#00ff99;">Choisis ton golf</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${golfs.map(g => `
          <button class="btn" onclick="startNewRound('${g.id}')">
            ${g.name}<br><small style="color:#aaa;">${g.location}</small>
          </button>
        `).join("")}
      </div>
    `;
    container.style.display = "block";
  } catch (err) {
    console.error("❌ Erreur chargement golfs.json :", err);
    container.innerHTML = `<p style="color:#f55;">Erreur de chargement des golfs</p>`;
  }
}

// === Nouvelle partie ===
async function startNewRound(golfId) {
  console.log("🎯 Nouvelle partie démarrée :", golfId);

  const holeCard = $$("hole-card");
  if (holeCard) holeCard.innerHTML = "";

  const golfSelect = $$("golf-select");
  if (golfSelect) golfSelect.style.display = "none";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    const golf = golfs.find(g => g.id === golfId);

    if (!golf) {
      console.warn("⚠️ Golf introuvable :", golfId);
      if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">Golf introuvable</p>`;
      return;
    }

    currentGolf = golf;
    currentHole = 1;
    holes = golf.pars.map((par, i) => ({ number: i + 1, par }));
    currentDiff = 0;
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);

    showScorecardIntro();
    showMoodAndStrategyModal();
  } catch (err) {
    console.error("❌ Erreur chargement golf :", err);
    if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">Erreur de chargement du golf</p>`;
  }
}

// === Carte de score - Intro ===
function showScorecardIntro() {
  // Évite doublons
  if (document.querySelector(".modal-backdrop")) return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:left;">
      <h2>📋 Carte de Score</h2>
      <p>
        💚 <b>Parfect</b> = Par + Fairway + GIR + ≤ 2 putts<br>
        💙 <b>Bogey’fect</b> = Bogey + Fairway + ≤ 2 putts
      </p>
      <ul style="margin-left:18px;line-height:1.4;">
        <li>Choisis ton score (Par, Bogey, Birdie…)</li>
        <li>Coche Fairway / GIR / Routine</li>
        <li>Indique la distance du 2ᵉ putt</li>
      </ul>
      <div style="text-align:right;margin-top:16px;">
        <button id="close-intro" class="btn" style="background:#00c676;color:#000;">OK 💪</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  $$("close-intro").addEventListener("click", () => modal.remove());
}

// === Mood & Stratégie ===
// === Mood du jour & stratégie ===
function showMoodAndStrategyModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:400px;text-align:center;padding:20px;">
      <h3>😎 Ton mood du jour ?</h3>
      <div class="moods" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px;">
        <button class="btn mood" data-mood="focus">Focus</button>
        <button class="btn mood" data-mood="relax">Relax</button>
        <button class="btn mood" data-mood="fun">Fun</button>
        <button class="btn mood" data-mood="grind">Grind</button>
      </div>

      <h4 style="margin-top:18px;">🎯 Quelle stratégie veux-tu suivre ?</h4>
      <div class="coach-styles" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px;">
        <button class="btn strategy" data-strat="safe">Safe</button>
        <button class="btn strategy" data-strat="aggressive">Aggressive</button>
        <button class="btn strategy" data-strat="5050">50/50</button>
        <button class="btn strategy" data-strat="fairway">Fairway First</button>
        <button class="btn strategy" data-strat="mindset">Parfect Mindset</button>
      </div>

      <button id="start-round" class="btn" style="margin-top:20px;background:#00ff99;color:#111;">🚀 Démarrer</button>
    </div>
  `;
  document.body.appendChild(modal);

  let mood = "focus";
  let strat = "mindset";

  // Sélection du mood
  modal.querySelectorAll(".mood").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mood = btn.dataset.mood;
    });
  });

  // Sélection de la stratégie
  modal.querySelectorAll(".strategy").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".strategy").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      strat = btn.dataset.strat;
    });
  });

  // 🟢 Validation et lancement du jeu
  modal.querySelector("#start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    modal.remove();

    // ✅ Affiche le coach IA avec message d’ouverture
    if (typeof showCoachIA === "function") {
      showCoachIA(`🧠 Mood: ${mood} · 🎯 Stratégie: ${strat}`);
    }

    // ✅ Lancer le premier trou
    if (typeof renderHole === "function") {
      console.log("📋 Affichage de la carte de score…");
      renderHole(currentHole);
    } else {
      console.warn("⚠️ renderHole non défini au moment du démarrage");
    }
  });
}

// === Afficher un trou ===
// === Affiche la carte de score pour le trou courant ===
function renderHole(number = currentHole) {
  const holeCard = document.getElementById("hole-card");
  if (!holeCard) {
    console.warn("⚠️ Élément #hole-card introuvable");
    return;
  }

  if (!currentGolf) {
    holeCard.innerHTML = `<p style="color:#f55;">⚠️ Aucun golf sélectionné.</p>`;
    return;
  }

  const hole = holes[number - 1];
  if (!hole) {
    endRound();
    return;
  }

  const par = hole.par;
  const saved = holes[number - 1] || {};
  const totalVsPar = holes
    .filter(h => h.score !== undefined)
    .reduce((acc, h) => acc + (h.score - h.par), 0);

  // --- Interface principale ---
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
          <button class="btn score-btn" data-diff="-1">Birdie</button>
          <button class="btn score-btn" data-diff="0">Par</button>
          <button class="btn score-btn" data-diff="1">Bogey</button>
          <button class="btn score-btn" data-diff="2">Double</button>
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
          <option value="2" ${saved.dist2==="2"?"selected":""}>One putt</option>
          <option value="3" ${saved.dist2==="3"?"selected":""}>< 2m</option>
          <option value="4" ${saved.dist2==="4"?"selected":""}>< 4m</option>
          <option value="5" ${saved.dist2==="5"?"selected":""}>< 6m</option>
        </select>
      </div>

      <div style="margin-top:20px;display:flex;justify-content:space-between;">
        <button id="prev-hole" class="btn" ${number===1?'disabled':''}>⬅️ Trou précédent</button>
        <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">Trou suivant ➡️</button>
      </div>
    </div>
  `;

  // --- Gestion des scores ---
  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".score-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = parseInt(btn.dataset.diff);
      saveCurrentHole();
    });
  });

  // --- Navigation ---
  const prevBtn = document.getElementById("prev-hole");
  const nextBtn = document.getElementById("next-hole");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      saveCurrentHole();
      if (currentHole > 1) {
        currentHole--;
        renderHole(currentHole);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      saveCurrentHole();
      if (currentHole < holes.length) {
        currentHole++;
        renderHole(currentHole);
      } else {
        endRound();
      }
    });
  }
}

// === Sauvegarde de la saisie du trou ===
function saveCurrentHole() {
  if (!currentGolf) return;

  const par = holes[currentHole - 1]?.par ?? 4;
  const fairway = document.getElementById("fairway")?.checked || false;
  const gir = document.getElementById("gir")?.checked || false;
  const routine = document.getElementById("routine")?.checked || false;
  const dist2 = document.getElementById("dist2")?.value || "";

  holes[currentHole - 1] = {
    number: currentHole,
    par,
    score: par + currentDiff,
    fairway,
    gir,
    routine,
    dist2
  };

  localStorage.setItem("holesData", JSON.stringify(holes));
}

// === Fin de partie ===
function endRound() {
  const valid = holes.filter(h => h && typeof h.score === "number");
  const totalVsPar = valid.reduce((sum, h) => sum + (h.score - h.par), 0);
  const parfects = valid.filter(h => h.fairway && h.gir && (h.score - h.par) === 0).length;
  const bogeyfects = valid.filter(h => h.fairway && !h.gir && (h.score - h.par) === 1).length;

  const holeCard = document.getElementById("hole-card");
  holeCard.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <h2>🏁 Partie terminée</h2>
      <p>Total vs Par : <strong style="color:${totalVsPar>0?'#ff6666':totalVsPar<0?'#00ff99':'#fff'}">
        ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}</strong></p>
      <p>💚 Parfects : ${parfects} — 💙 Bogey’fects : ${bogeyfects}</p>
      <button id="new-round" class="btn" style="margin-top:14px;">🔁 Nouvelle partie</button>
    </div>
  `;

  document.getElementById("new-round").addEventListener("click", () => {
    resetRound();
  });

  localStorage.setItem("roundInProgress", "false");
}



console.log("✅ play.js chargé sans erreur");
