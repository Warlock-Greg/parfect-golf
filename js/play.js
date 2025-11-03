// === Parfect.golfr - play.js (MVP 2025 stable) ===
console.log("🏌️ Parfect Play.js chargé");

// === Helper DOM ===
const $$ = (id) => document.getElementById(id);

// === Variables globales ===
let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = 0;

// === Initialisation du sélecteur de golf ===
async function initGolfSelect() {
  const container = document.getElementById("golf-select");
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

// === Démarre une nouvelle partie ===
async function startNewRound(golfId) {
  console.log("🎯 Nouvelle partie démarrée :", golfId);

  const holeCard = $$("hole-card");
  if (holeCard) holeCard.innerHTML = "";

  const golfSelect = $$("golf-select");
  if (golfSelect) golfSelect.style.display = "none";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();

    // ✅ pas de JSON.parse ici !
    const golf = golfs.find(g => g.id === golfId);
    if (!golf) {
      holeCard.innerHTML = `<p style="color:#f55;">⚠️ Golf introuvable</p>`;
      return;
    }

    currentGolf = golf;
    currentHole = 1;
    holes = golf.pars.map((par, i) => ({ number: i + 1, par }));
    currentDiff = 0;
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);

    // Lance la modale mood & stratégie
    // ✅ Lance la modale mood & stratégie et démarre la partie à la fin
showMoodAndStrategyModal(() => {
  console.log("✅ Mood & stratégie confirmés → affichage de la carte de score");
  renderHole(currentHole);
});
  } catch (err) {
    console.error("❌ Erreur lors du chargement du golf :", err);
    if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">Erreur de chargement du golf</p>`;
  }
}

// === Mood du jour & stratégie ===
function showMoodAndStrategyModal(onConfirm) {
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

  modal.querySelectorAll(".mood").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mood = btn.dataset.mood;
    });
  });

  modal.querySelectorAll(".strategy").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".strategy").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      strat = btn.dataset.strat;
    });
  });

  modal.querySelector("#start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    modal.remove();

    // Affiche le coach IA
    if (typeof showCoachIA === "function") {
      showCoachIA(`🧠 Mood: ${mood} · 🎯 Stratégie: ${strat}`);
    }

    // ✅ Appelle le callback quand on confirme
    if (typeof onConfirm === "function") {
      onConfirm();
    }
  });
}


// === Affiche la carte de score ===
function renderHole(number = currentHole) {
  const holeCard = $$("hole-card");
  if (!holeCard) return console.warn("⚠️ #hole-card introuvable");

  // ✅ Rendre visible la carte si elle était masquée
  holeCard.style.display = "block";

  if (!currentGolf) {
    holeCard.innerHTML = `<p style="color:#f55;">⚠️ Aucun golf sélectionné.</p>`;
    return;
  }

  const hole = holes[number - 1];
  if (!hole) return endRound();

  const par = hole.par;
  const saved = holes[number - 1] || {};
  const totalVsPar = holes
    .filter(h => h.score !== undefined)
    .reduce((acc, h) => acc + (h.score - h.par), 0);

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

  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".score-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = parseInt(btn.dataset.diff);
      saveCurrentHole();

      // 🧠 Fait réagir le coach
    const par = holes[number - 1].par;
    const diff = currentDiff;
    triggerCoachFeedback(diff, par);
    });
  });

  const prevBtn = $$("prev-hole");
  const nextBtn = $$("next-hole");

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
    const holeCard = $$("hole-card");
    if (!holeCard) return;

    // 🎬 Animation de sortie vers le haut
    holeCard.classList.add("hole-animate-out");

    setTimeout(() => {
      saveCurrentHole();

      if (currentHole < holes.length) {
        currentHole++;
        renderHole(currentHole);

        // 🎬 Animation d'entrée depuis le bas
        holeCard.classList.remove("hole-animate-out");
        holeCard.classList.add("hole-animate-in");

        setTimeout(() => {
          holeCard.classList.remove("hole-animate-in");
        }, 350);
      } else {
        summarizeRound();
      }
    }, 350);
  });
}


}

// --- Fait réagir le coach après chaque trou ---
async function triggerCoachFeedback(diff, par) {
  let message = "";

  // 🧠 Mode simplifié local
  if (!window.OPENAI_KEY) {
    if (diff <= -1) message = "💚 Magnifique ! Un birdie, c’est du Parfect Golf.";
    else if (diff === 0) message = "💪 Solide Par ! Continue sur ce rythme.";
    else if (diff === 1) message = "💙 Bogey propre. Mental stable, routine solide.";
    else message = "😅 Double ? Respire et recentre-toi sur le prochain coup.";
    showCoachIA(message);
    return;
  }

  // 🤖 Mode OpenAI (licence active)
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${window.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es un coach de golf motivant et bienveillant. Reste bref et concret." },
          { role: "user", content: `Le joueur vient de faire un ${diff > 0 ? "+" + diff : diff} sur un par ${par}. Donne-lui un conseil.` }
        ],
        max_tokens: 40
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "💬 Continue, un coup après l'autre.";
    showCoachIA(reply);
  } catch (err) {
    console.error("Erreur API OpenAI :", err);
    showCoachIA("🤖 Coach hors ligne, mais garde la tête haute !");
  }
}


// === Sauvegarde du trou ===
function saveCurrentHole() {
  if (!currentGolf) return;

  const par = holes[currentHole - 1]?.par ?? 4;
  const fairway = $$("fairway")?.checked || false;
  const gir = $$("gir")?.checked || false;
  const routine = $$("routine")?.checked || false;
  const dist2 = $$("dist2")?.value || "";

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

let lastCoachMessage = "";

function analyzeHole(hole) {
  if (!hole) return;
  const diff = hole.score - hole.par;
  const { fairway, gir, dist2 } = hole;
  let message = "";
  let parfectCount = parseInt(localStorage.getItem("parfectCount") || "0");

  const isParfect =
    diff === 0 && fairway && gir && ["1", "2", "3", "4", "5"].includes(dist2);

  if (isParfect) {
    parfectCount++;
    localStorage.setItem("parfectCount", parfectCount);
    updateParfectCounter?.();
    flashParfectCounter?.();
    message = `💚 Parfect collecté (${parfectCount}) ! Flow en hausse.`;
  } else if (diff < 0) {
    message = "🕊️ Birdie, du grand golf !";
  } else if (diff === 1) {
    message = "💙 Bogey’fect, tu restes solide.";
  } else if (diff >= 2) {
    message = "😅 Pas grave, on rebondit au prochain.";
  } else {
    message = "👌 Trou régulier, flow maîtrisé.";
  }

  // ✅ Forcer l’affichage du coach même si message répété
  if (typeof showCoachIA === "function") {
    showCoachIA(message);
  } else {
    console.log("Coach:", message);
  }

  lastCoachMessage = message;
}


// === Synthèse de fin de partie (avec récap + variation de ton) ===
function summarizeRound() {
  const validHoles = holes.filter(h => h && typeof h.score === "number");
  if (!validHoles.length) {
    showCoachIA?.("😅 Aucune donnée enregistrée, recommence une partie !");
    return;
  }

  const totalVsPar = validHoles.reduce((sum, h) => sum + (h.score - h.par), 0);
  const parfects = validHoles.filter(
    h => h.score - h.par === 0 && h.fairway && h.gir && (h.dist2 === "1" || h.dist2 === "2")
  ).length;
  const bogeyfects = validHoles.filter(
    h => h.score - h.par === 1 && h.fairway && (h.dist2 === "1" || h.dist2 === "2")
  ).length;

  // 🧩 Mini carte récap
  const recap = validHoles.map(h => {
    const diff = h.score - h.par;
    if (diff < 0) return "🕊️";
    if (diff === 0 && h.fairway && h.gir) return "💚";
    if (diff === 1 && h.fairway) return "💙";
    if (diff >= 2) return "😅";
    return "⚪";
  }).join(" ");

  // 💬 Message global variable
  const encouragements = [
    "💪 Belle régularité aujourd’hui ! Continue à jouer simple.",
    "🔥 Ton mental a tenu jusqu’au bout, c’est ça l’esprit Parfect.",
    "🌿 Sérénité et focus : tu construis un vrai flow de jeu.",
    "💚 De plus en plus de Parfects, la constance arrive !",
    "🧘‍♂️ Reste calme entre les coups, le progrès est déjà là."
  ];
  const messageVar = encouragements[Math.floor(Math.random() * encouragements.length)];

  let message = `🏁 Fin de partie sur ${currentGolf?.name ?? "ton parcours"} !\n`;
  message += `Score total : ${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}\n`;
  message += `💚 ${parfects} Parfects · 💙 ${bogeyfects} Bogey’fects\n`;
  message += `Carte : ${recap}\n\n${messageVar}`;

  showCoachIA?.(message);
}

// === Fin de partie ===
function endRound() {
  const valid = holes.filter(h => h && typeof h.score === "number");
  const totalVsPar = valid.reduce((sum, h) => sum + (h.score - h.par), 0);
  const parfects = valid.filter(h => h.fairway && h.gir && (h.score - h.par) === 0).length;
  const bogeyfects = valid.filter(h => h.fairway && !h.gir && (h.score - h.par) === 1).length;

  const holeCard = $$("hole-card");
  holeCard.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <h2>🏁 Partie terminée</h2>
      <p>Total vs Par :
        <strong style="color:${totalVsPar>0?'#ff6666':totalVsPar<0?'#00ff99':'#fff'}">
          ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}
        </strong></p>
      <p>💚 Parfects : ${parfects} — 💙 Bogey’fects : ${bogeyfects}</p>
      <button id="new-round" class="btn" style="margin-top:14px;">🔁 Nouvelle partie</button>
    </div>
  `;

  $$("new-round").addEventListener("click", () => resetRound());
  localStorage.setItem("roundInProgress", "false");
}

// === Réinitialisation de partie ===
function resetRound() {
  const golfSelect = $$("golf-select");
  const holeCard = $$("hole-card");
  if (holeCard) holeCard.innerHTML = "";
  if (golfSelect) golfSelect.style.display = "block";

  currentGolf = null;
  currentHole = 1;
  holes = [];
  currentDiff = 0;
  localStorage.setItem("roundInProgress", "false");

  initGolfSelect();
}

// === Exports globaux ===
window.initGolfSelect = initGolfSelect;

window.startNewRound = startNewRound;
window.showResumeOrNewModal = showResumeOrNewModal; // ✅ obligatoire
window.renderHole = renderHole;
window.resetRound = resetRound;

