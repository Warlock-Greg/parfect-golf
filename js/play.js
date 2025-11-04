// === Parfect.golfr – play.js (MVP 2025) ===
console.log("🏌️ Parfect.golfr Play.js chargé");

const $$ = (id) => document.getElementById(id);

let currentGolf = null;
let currentHole = 1;
let holes = [];
let currentDiff = 0;
let totalParfects = parseInt(localStorage.getItem("totalParfects") || "0");

// === Modale Reprendre ou Nouvelle Partie ===
function showResumeOrNewModal() {
  const roundInProgress = localStorage.getItem("roundInProgress") === "true";
  const lastGolf = localStorage.getItem("currentGolf");

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="text-align:center;padding:20px;">
      <h3>🎮 Partie en cours ?</h3>
      ${
        roundInProgress
          ? `<p>Souhaites-tu reprendre ta partie en cours ou en démarrer une nouvelle ?</p>
             <div style="display:flex;gap:10px;justify-content:center;">
               <button class="btn" id="resume-round">Reprendre</button>
               <button class="btn" id="new-round">Nouvelle</button>
             </div>`
          : `<p>Prêt à démarrer une nouvelle partie ?</p>
             <button class="btn" id="new-round">🚀 Démarrer</button>`
      }
    </div>
  `;
  document.body.appendChild(modal);

  // Boutons
  modal.querySelector("#resume-round")?.addEventListener("click", () => {
    modal.remove();
    if (lastGolf) {
      const resumingGolf = JSON.parse(localStorage.getItem("holesData") || "[]");
      if (resumingGolf.length > 0) holes = resumingGolf;
      currentGolf = { id: lastGolf };
      renderHole(currentHole);
    }
  });

  modal.querySelector("#new-round")?.addEventListener("click", () => {
    modal.remove();
    initGolfSelect();
  });
}

window.showResumeOrNewModal = showResumeOrNewModal;


// === Démarre une nouvelle partie ===
async function startNewRound(golfId) {
  const holeCard = $$("hole-card");
  const golfSelect = $$("golf-select");
  if (holeCard) holeCard.innerHTML = "";
  if (golfSelect) golfSelect.style.display = "none";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    const golf = golfs.find((g) => g.id === golfId);

    if (!golf) {
      holeCard.innerHTML = `<p style="color:#f55;">⚠️ Golf introuvable</p>`;
      return;
    }

    currentGolf = golf;
    currentHole = 1;
    holes = golf.pars.map((par, i) => ({ number: i + 1, par }));
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);

    // ✅ Lance la modale puis affiche le 1er trou
    showMoodAndStrategyModal(() => {
      console.log("✅ Mood & stratégie confirmés → affichage de la carte de score");
      renderHole(currentHole);
    });

  } catch (err) {
    console.error("❌ Erreur chargement golfs.json :", err);
    holeCard.innerHTML = `<p style="color:#f55;">Erreur de chargement du golf</p>`;
  }
}

// === Affiche un trou ===
function renderHole(number = currentHole) {
  const holeCard = $$("hole-card");
  if (!holeCard) return;
  if (!currentGolf) return;

  const hole = holes[number - 1];
  if (!hole) return summarizeRound();

  const par = hole.par;
  const saved = holes[number - 1] || {};
  const selectedDiff = typeof saved.score === "number" ? saved.score - par : null;
  const totalVsPar = holes.filter(h => typeof h.score === "number").reduce((acc, h) => acc + (h.score - h.par), 0);

  currentDiff = selectedDiff;

  holeCard.classList.remove("hole-animate-out");
  holeCard.classList.add("hole-animate-in");

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

      <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;">
        <button id="prev-hole" class="btn" ${number===1?'disabled':''}>⬅️</button>
        <span style="color:#00ff99;font-weight:bold;">Trou ${number}/${holes.length}</span>
        <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">➡️</button>
      </div>
    </div>
  `;

  // Gestion du choix de score
  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".score-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = parseInt(btn.dataset.diff);
      saveCurrentHole();
    });
  });

  // Boutons navigation
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
      // 🧩 Vérifie qu’un score est choisi
      if (currentDiff === null || isNaN(currentDiff)) {
        alert("⚠️ Choisis ton score avant de passer au trou suivant !");
        return;
      }

      saveCurrentHole();
      analyzeHole(holes[currentHole - 1]);

      holeCard.classList.remove("hole-animate-in");
      holeCard.classList.add("hole-animate-out");

      setTimeout(() => {
        if (currentHole < holes.length) {
          currentHole++;
          renderHole(currentHole);
        } else {
          summarizeRound();
        }
      }, 300);
    });
  }
}

// === Analyse du trou ===
let lastCoachMessage = "";
function analyzeHole(holeData) {
  if (!holeData) return;
  const { score, par, fairway, gir, dist2 } = holeData;
  const diff = score - par;
  let message = "";

  if (diff === 0 && fairway && gir && (["1", "2"].includes(dist2))) {
    totalParfects++;
    localStorage.setItem("totalParfects", totalParfects);
    updateParfectCounter();
    animateParfect();
    message = "💚 Parfect collecté ! Par + Fairway + GIR + ≤2 putts. Excellent !";
  } else if (diff === 1 && fairway && (["1", "2"].includes(dist2))) {
    message = "💙 Bogey’fect ! Bogey solide, mental propre.";
  } else if (diff < 0) {
    message = "🕊️ Birdie ! Fluide et en contrôle, c’est du beau golf.";
  } else if (diff >= 2) {
    message = "😅 Pas grave, routine + calme = prochain trou solide.";
  } else {
    message = "👌 Trou régulier, continue ton flow.";
  }

  if (message === lastCoachMessage) return;
  lastCoachMessage = message;
  showCoachIA?.(message);
}

// === Mise à jour compteur ===
function updateParfectCounter() {
  const el = document.getElementById("parfect-counter");
  if (el) el.textContent = `💚 ${totalParfects} Parfect${totalParfects>1?'s':''} collecté${totalParfects>1?'s':''}`;
}

function animateParfect() {
  const el = document.getElementById("parfect-counter");
  if (!el) return;
  el.style.transform = "scale(1.3)";
  el.style.transition = "transform 0.3s ease";
  setTimeout(() => el.style.transform = "scale(1)", 300);
}

// === Fin de partie ===
function summarizeRound() {
  const validHoles = holes.filter(h => h && typeof h.score === "number");
  const totalVsPar = validHoles.reduce((sum, h) => sum + (h.score - h.par), 0);
  const parfects = validHoles.filter(h => h.score - h.par === 0 && h.fairway && h.gir && ["1","2"].includes(h.dist2)).length;

  // Sauvegarde historique
  const history = JSON.parse(localStorage.getItem("history") || "[]");
  history.push({
    date: new Date().toLocaleDateString(),
    golf: currentGolf?.name ?? "Inconnu",
    totalVsPar,
    parfects
  });
  localStorage.setItem("history", JSON.stringify(history));

  // Badge
  const badge = document.createElement("div");
  badge.style.position = "fixed";
  badge.style.top = "50%";
  badge.style.left = "50%";
  badge.style.transform = "translate(-50%, -50%)";
  badge.style.background = "#00ff99";
  badge.style.color = "#111";
  badge.style.padding = "20px 30px";
  badge.style.borderRadius = "20px";
  badge.style.fontWeight = "bold";
  badge.style.fontSize = "1.2rem";
  badge.style.boxShadow = "0 0 20px #00ff99aa";
  badge.style.zIndex = "99999";
  badge.textContent = `🏅 ${parfects} Parfect${parfects>1?'s':''} collecté${parfects>1?'s':''}!`;
  document.body.appendChild(badge);
  setTimeout(() => badge.remove(), 3000);

  showCoachIA?.(`🏁 Fin de partie sur ${currentGolf?.name ?? "ton parcours"} !
Score total : ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}
💚 ${parfects} Parfect${parfects>1?'s':''} collecté${parfects>1?'s':''}.`);
}

// === Helpers ===
function saveCurrentHole() {
  const fairway = $$("fairway")?.checked || false;
  const gir = $$("gir")?.checked || false;
  const routine = $$("routine")?.checked || false;
  const dist2 = $$("dist2")?.value || "";
  const par = holes[currentHole - 1]?.par ?? 4;

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
  localStorage.setItem("roundInProgress", "true");
}

// === Exports ===
window.startNewRound = startNewRound;
window.renderHole = renderHole;
window.analyzeHole = analyzeHole;
