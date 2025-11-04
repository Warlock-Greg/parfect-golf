// === Parfect.golfr – play.js (MVP 2025 corrigé) ===
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
  modal.style.zIndex = "12000"; // ✅ au-dessus du coach
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
    if (lastGolf) {
      const saved = JSON.parse(localStorage.getItem("holesData") || "[]");
      if (saved.length) holes = saved;
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
  holeCard.innerHTML = "";
  golfSelect.style.display = "none";

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

    showMoodAndStrategyModal(() => {
      console.log("✅ Mood & stratégie confirmés → affichage du 1er trou");
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
  if (!holeCard || !currentGolf) return;

  const hole = holes[number - 1];
  if (!hole) return summarizeRound();

  const par = hole.par;
  const saved = holes[number - 1] || {};
  const selectedDiff = typeof saved.score === "number" ? saved.score - par : null;
  const totalVsPar = holes.filter(h => typeof h.score === "number")
    .reduce((a, h) => a + (h.score - h.par), 0);
  currentDiff = selectedDiff;

  holeCard.classList.remove("hole-animate-out");
  holeCard.classList.add("hole-animate-in");

  holeCard.innerHTML = `
    <div class="scorecard" style="text-align:center;padding:12px;">
      <h3 style="color:#00ff99;">⛳ Trou ${number}/${holes.length}</h3>
      <p>Par ${par} — Score :
        <strong style="color:${totalVsPar>0?'#ff6666':totalVsPar<0?'#00ff99':'#fff'}">
          ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}
        </strong>
      </p>

      <div style="margin-top:12px;">
        <h4>Choisis ton score :</h4>
        <div id="score-options" style="display:flex;gap:6px;justify-content:center;margin-top:6px;">
          <button class="btn score-btn ${selectedDiff===-1?'active':''}" data-diff="-1">Birdie</button>
          <button class="btn score-btn ${selectedDiff===0?'active':''}" data-diff="0">Par</button>
          <button class="btn score-btn ${selectedDiff===1?'active':''}" data-diff="1">Bogey</button>
          <button class="btn score-btn ${selectedDiff===2?'active':''}" data-diff="2">Double</button>
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

  // === Sélection score ===
  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".score-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = parseInt(btn.dataset.diff);
      saveCurrentHole();
    });
  });

  // === Gestion des checkboxes ===
  ["fairway", "gir"].forEach(id => {
    $$(id)?.addEventListener("change", () => {
      saveCurrentHole();
      const data = holes[currentHole - 1];
      if (data.fairway && data.gir && data.score - data.par === 0) {
        analyzeHole(data); // ✅ encouragement Parfect instantané
      }
    });
  });

  // === Boutons navigation ===
  $$("prev-hole")?.addEventListener("click", () => {
    saveCurrentHole();
    if (currentHole > 1) {
      currentHole--;
      renderHole(currentHole);
    }
  });

  $$("next-hole")?.addEventListener("click", () => {
    if (currentDiff === null || isNaN(currentDiff)) {
      alert("⚠️ Choisis ton score avant de passer au trou suivant !");
      return;
    }
    saveCurrentHole();
    analyzeHole(holes[currentHole - 1]);
    holeCard.classList.remove("hole-animate-in");
    holeCard.classList.add("hole-animate-out");
    setTimeout(() => {
      currentHole < holes.length ? renderHole(++currentHole) : summarizeRound();
    }, 300);
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
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:#00ff99;color:#111;padding:20px 30px;border-radius:20px;
    font-weight:bold;font-size:1.2rem;box-shadow:0 0 20px #00ff99aa;z-index:12000;`;
  badge.textContent = `🏅 ${parfects} Parfect${parfects>1?"s":""} collecté${parfects>1?"s":""} !`;
  document.body.appendChild(badge);
  setTimeout(() => badge.remove(), 3000);

  showCoachIA?.(`🏁 Fin de partie ! Score total ${totalVsPar>0?`+${totalVsPar}`:totalVsPar}, ${parfects} Parfect${parfects>1?"s":""} collecté${parfects>1?"s":""} !`);
}

// === Sauvegarde trou ===
function saveCurrentHole() {
  const fairway = $$("fairway")?.checked || false;
  const gir = $$("gir")?.checked || false;
  const routine = $$("routine")?.checked || false;
  const dist2 = $$("dist2")?.value || "";
  const par = holes[currentHole - 1]?.par ?? 4;

  holes[currentHole - 1] = { number: currentHole, par, score: par + (currentDiff ?? 0), fairway, gir, routine, dist2 };
  localStorage.setItem("holesData", JSON.stringify(holes));
  localStorage.setItem("roundInProgress", "true");
}

// === Exports ===
window.startNewRound = startNewRound;
window.renderHole = renderHole;
window.analyzeHole = analyzeHole;

