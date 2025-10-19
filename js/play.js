// === Parfect.golfr - play.js (MVP global) ===
window.$ = window.$ || ((id) => document.getElementById(id));

const STORAGE_KEY = "golfHistory";

let currentGolf = null;
let currentHole = 1;
let totalHoles = 18;
let holes = [];
let currentDiff = null;

const SCORE_CHOICES = [
  { key:"parfect",  label:"💚 Parfect",   diff:0,  special:true },
  { key:"bogeyfect",label:"💙 Bogey’fect",diff:1,  special:true },
  { key:"birdie",   label:"Birdie",       diff:-1 },
  { key:"par",      label:"Par",          diff:0  },
  { key:"bogey",    label:"Bogey",        diff:1  },
  { key:"double",   label:"Double",       diff:2  },
  { key:"triple",   label:"Triple",       diff:3  },
  { key:"eagle",    label:"Eagle",        diff:-2 },
];

// Fallback data providers (si pas de data.js)
window.fetchGolfs = window.fetchGolfs || async function(){
  try {
    const r = await fetch("https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/data/golfs.json");
    if (!r.ok) throw 0;
    return await r.json();
  } catch {
    // Fallback minimal
    return [{ id:1, name:"Demo Course", pars:[4,4,3,4,5,4,3,4,5,4,4,3,4,5,4,3,4,5] }];
  }
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("🏌️ Parfect Play ready");
  initGolfSelect();
});

async function initGolfSelect() {
  const zone = $("golf-select");
  if (!zone) return;
  const golfs = await window.fetchGolfs();
  zone.innerHTML =
    "<h3>Choisis ton golf :</h3>" +
    golfs.map(g => `<button class="btn golf-btn" data-id="${g.id}">⛳ ${g.name}</button>`).join("");

  zone.querySelectorAll(".golf-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const g = golfs.find(x => String(x.id) === btn.dataset.id);
      startRound(g);
    });
  });
}

function startRound(golf) {
  currentGolf   = golf;
  totalHoles    = Array.isArray(golf?.pars) ? golf.pars.length : 18;
  currentHole   = 1;
  holes         = new Array(totalHoles).fill(null);
  currentDiff   = null;

  showScorecardIntro();
  showMoodAndStrategyModal();
}

// Onboarding carte de score
function showScorecardIntro() {
  // if (localStorage.getItem("skipScoreIntro")==="true") return;
  if (document.querySelector(".modal-backdrop")) return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;text-align:left;">
      <h2>📋 Carte de Score</h2>
      <p>
        <strong>Parfect</strong> = Par + Fairway + GIR + ≤ 2 putts<br>
        <strong>Bogey’fect</strong> = Bogey + Fairway + ≤ 2 putts
      </p>
      <ul style="margin-left:18px;line-height:1.4;">
        <li>Choisis ton score (Par, Bogey, Birdie…)</li>
        <li>Coche Fairway / GIR / Routine</li>
        <li>Distance du 2ᵉ putt (Donné, One putt…)</li>
      </ul>
      <label style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <input type="checkbox" id="hide-intro"> Ne plus me la montrer
      </label>
      <div style="text-align:right;margin-top:16px;">
        <button id="close-intro" class="btn" style="background:#00ff99;color:#111;">OK, compris</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  $("close-intro").addEventListener("click", () => {
    if ($("hide-intro").checked) localStorage.setItem("skipScoreIntro","true");
    modal.remove();
  });
}

// Mood & stratégie au départ
function showMoodAndStrategyModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:400px;">
      <h3>😎 Mood du jour</h3>
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
    </div>
  `;
  document.body.appendChild(modal);

  let mood = "focus";
  let strat = "mindset";

  modal.querySelectorAll(".mood").forEach(b =>
    b.addEventListener("click", () => {
      modal.querySelectorAll(".mood").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      mood = b.dataset.mood;
    })
  );

  modal.querySelectorAll(".strategy").forEach(b =>
    b.addEventListener("click", () => {
      modal.querySelectorAll(".strategy").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      strat = b.dataset.strat;
    })
  );

  $("start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    modal.remove();
    showCoachIA?.();
    renderHole();
  });
}

// === Affichage du trou ===
function renderHole() {
  if (!currentGolf) return;
  const zone = $("hole-card");
  if (!zone) return;

  const par = currentGolf.pars[currentHole - 1];
  const saved = holes[currentHole - 1] || {};
  const totalVsPar = holes.filter(Boolean).reduce((a, h) => a + (h.score - h.par), 0);

  zone.innerHTML = `
    <div class="mini-recap" style="background:#111;padding:8px 12px;border-radius:12px;margin-bottom:10px;text-align:center;">
      <strong>Trou ${currentHole}/${totalHoles}</strong> — Par ${par} · Total :
      <span style="color:${totalVsPar>0 ? '#ff6666' : totalVsPar<0 ? '#00ff99' : '#fff'}">
        ${totalVsPar>0 ? "+"+totalVsPar : totalVsPar}
      </span>
    </div>

    <div class="hole-inputs" style="display:flex;flex-direction:column;gap:10px;align-items:center;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
        ${SCORE_CHOICES.map(sc => `
          <button class="btn score-btn" data-diff="${sc.diff}" style="padding:6px 10px;">
            ${sc.label}
          </button>`).join("")}
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:10px;">
        <label><input type="checkbox" id="fairway" ${saved.fairway?'checked':''}> Fairway</label>
        <label><input type="checkbox" id="gir" ${saved.gir?'checked':''}> GIR</label>
        <label><input type="checkbox" id="routine" ${saved.routine?'checked':''}> Routine</label>
      </div>

      <div style="margin-top:8px;">
        <label>Distance 2e putt :</label>
        <select id="dist2" style="margin-left:6px;padding:4px 6px;border-radius:6px;">
          <option value="">Choisir</option>
          <option value="1">Donné</option>
          <option value="2">One putt baby</option>
          <option value="3">Moins de 2 m</option>
          <option value="4">Moins de 4 m</option>
          <option value="5">Moins de 6 m</option>
          <option value="6">Au-delà</option>
        </select>
      </div>

      <div id="trouble-zone" style="display:none;margin-top:8px;">
        <label>Pourquoi double ou plus ?</label><br>
        <select id="trouble" style="margin-top:4px;padding:4px 6px;border-radius:6px;">
          <option value="none">R.A.S.</option>
          <option value="drive">Drive égaré</option>
          <option value="penalite">Pénalité</option>
          <option value="approche">Approche manquée</option>
        </select>
      </div>

      <div style="margin-top:14px;display:flex;justify-content:space-between;width:100%;max-width:360px;">
        <button id="prev-hole" class="btn" ${currentHole===1?'disabled':''}>⬅️ Précédent</button>
        <button id="next-hole" class="btn" style="background:#00ff99;color:#111;">Suivant ➡️</button>
      </div>
    </div>
  `;

  // Gestion des boutons de score
  document.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentDiff = parseInt(btn.dataset.diff);
      document.querySelectorAll(".score-btn").forEach(b => b.style.background = "");
      btn.style.background = "#00ff99";
    });
  });

  $("prev-hole").addEventListener("click", () => {
    if (currentHole > 1) {
      currentHole--;
      renderHole();
    }
  });

  $("next-hole").addEventListener("click", () => {
    saveCurrentHole();
    if ([9, 12, 18].includes(currentHole)) {
      saveMidRound();
    }
    if (currentHole < totalHoles) {
      currentHole++;
      renderHole();
    } else {
      endRound();
    }
  });
}

// === Sauvegarde du trou courant ===
function saveCurrentHole() {
  const par = currentGolf.pars[currentHole - 1];
  const entry = {
    hole: currentHole,
    par,
    score: par + (currentDiff ?? 0),
    fairway: $("fairway")?.checked || false,
    gir: $("gir")?.checked || false,
    routine: $("routine")?.checked || false,
    dist2: $("dist2")?.value || "",
    trouble: $("trouble")?.value || "",
  };
  holes[currentHole - 1] = entry;
  analyzeHole(entry);
}

// === Sauvegarde intermédiaire au trou 9/12 ===
function saveMidRound() {
  try {
    localStorage.setItem("roundInProgress","true");
    localStorage.setItem("currentGolf", JSON.stringify(currentGolf));
    localStorage.setItem("holes", JSON.stringify(holes));
    console.log("💾 Sauvegarde mid-round effectuée");
  } catch (e) {
    console.error("Erreur sauvegarde mid-round", e);
  }
}

// === Analyse coach IA courte ===
function analyzeHole(entry) {
  let msg = "";
  if (entry.score - entry.par <= -1) msg = "💚 Birdie ou mieux ! Continue sur ta lancée !";
  else if (entry.score - entry.par === 0 && entry.gir) msg = "💪 Par solide avec GIR.";
  else if (entry.score - entry.par === 1 && entry.fairway) msg = "💙 Bogey’fect, smart golf !";
  else if (entry.score - entry.par >= 2) msg = "😅 Double ou plus ? Reste calme et focus routine.";
  else msg = "Un coup après l’autre, garde ton flow.";
  showCoachToast(msg, "#00ff99");
}

// === Fin de partie ===
function endRound() {
  const valid = holes.filter(Boolean);
  const totalVsPar = valid.reduce((a,h)=>a+(h.score-h.par),0);
  const parfects = valid.filter(h=>h.fairway&&h.gir&&(h.score-h.par)===0).length;
  const bogeyfects = valid.filter(h=>h.fairway&&!h.gir&&(h.score-h.par)===1).length;

  const summary = `
    <div class="score-summary-card">
      <h3>Partie terminée 💚</h3>
      <p>Total vs Par : <strong>${totalVsPar>0? "+"+totalVsPar:totalVsPar}</strong></p>
      <p>💚 Parfects : ${parfects} · 💙 Bogey’fects : ${bogeyfects}</p>
      <button id="new-round" class="btn" style="margin-top:10px;">🔁 Nouvelle partie</button>
    </div>`;
  $("hole-card").innerHTML = summary;
  $("new-round").addEventListener("click", resetRound);
  localStorage.setItem("roundInProgress","false");
}

// === Réinitialisation ===
function resetRound() {
  $("hole-card").innerHTML = "";
  $("golf-select").style.display = "block";
  currentGolf = null;
  holes = [];
  localStorage.setItem("roundInProgress","false");
  console.log("♻️ Partie réinitialisée");
}

// === Choix Reprendre/Nouvelle partie ===
function showResumeOrNewModal() {
  const hasRound = localStorage.getItem("roundInProgress")==="true";
  if (document.querySelector(".modal-backdrop")) return;
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:380px;text-align:center;">
      <h3>🎯 Que veux-tu faire ?</h3>
      <p>${hasRound? "Reprendre ta partie ou recommencer ?" : "Prêt à démarrer une nouvelle partie ?"}</p>
      <div style="display:flex;justify-content:center;gap:10px;margin-top:18px;">
        ${hasRound? `<button id="resume-round" class="btn">Reprendre</button>` : ""}
        <button id="new-round-start" class="btn" style="background:#00ff99;color:#111;">Nouvelle partie</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  if (hasRound) {
    $("resume-round").addEventListener("click", () => {
      modal.remove();
      const g = JSON.parse(localStorage.getItem("currentGolf")||"null");
      const h = JSON.parse(localStorage.getItem("holes")||"[]");
      if (g && h.length) {
        currentGolf=g; holes=h; currentHole=h.findIndex(x=>!x)+1||1;
        renderHole();
      } else startRound(g);
    });
  }

  $("new-round-start").addEventListener("click", () => {
    modal.remove();
    resetRound();
    initGolfSelect();
  });
}

window.showResumeOrNewModal = showResumeOrNewModal;

