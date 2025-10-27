// === Parfect.golfr — play.js (Fusion MVP + Coach stable) ===

// --- Helpers & état global ---
const $$ = (id) => document.getElementById(id);

let currentGolf = null;
let currentHole = 1;
let holes = [];                 // [{hole, par, score, fairway, gir, routine, dist2, trouble}]
let currentDiff = 0;            // score vs par pour le trou courant
const STORAGE_KEY = "golfHistory";

// Choix de score (propre)
const SCORE_CHOICES = [
  { key: "parfect",   label: "💚 Parfect",     diff: 0, preset: { fairway: true, gir: true,  routine: true } },
  { key: "bogeyfect", label: "💙 Bogey’fect",  diff: 1, preset: { fairway: true, gir: false, routine: true } },
  { key: "birdie",    label: "Birdie",         diff: -1 },
  { key: "par",       label: "Par",            diff: 0 },
  { key: "bogey",     label: "Bogey",          diff: 1 },
  { key: "double",    label: "Double+",        diff: 2 },
];

// === 1) Sélection du golf (depuis golfs.json) ===
async function initGolfSelect() {
  const container = $$("golf-select");
  if (!container) { console.warn("⚠️ #golf-select introuvable"); return; }

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();

    container.innerHTML = `
      <h3 style="color:#00ff99;margin:0 0 8px;">Choisis ton golf</h3>
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

// === 2) Nouvelle partie (charge le golf + modales intro & mood) ===
async function startNewRound(golfId) {
  const holeCard = $$("hole-card");
  const golfSelect = $$("golf-select");
  if (holeCard) holeCard.innerHTML = "";
  if (golfSelect) golfSelect.style.display = "none";

  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    const golf = golfs.find(g => g.id === golfId);
    if (!golf) {
      holeCard.innerHTML = `<p style="color:#f55;">Golf introuvable</p>`;
      return;
    }

    currentGolf = golf;
    currentHole = 1;
    holes = new Array(golf.pars.length).fill(null);
    currentDiff = 0;
    localStorage.setItem("roundInProgress", "true");
    localStorage.setItem("currentGolf", golfId);

    showScorecardIntro(() => showMoodAndStrategyModal(() => {
      window.showCoachIA?.("🎯 Nouvelle partie lancée — bon jeu !");
      renderHole(currentHole);
    }));

  } catch (err) {
    console.error("❌ Erreur lors du chargement du golf :", err);
    if (holeCard) holeCard.innerHTML = `<p style="color:#f55;">Erreur de chargement du golf</p>`;
  }
}

// === 3) Intro “Carte de Score” (une seule fois si coché) ===
function showScorecardIntro(onClose) {
  if (localStorage.getItem("skipScoreIntro") === "true") { onClose?.(); return; }

  // Empêche doublon
  if (document.querySelector(".modal-backdrop")) document.querySelectorAll(".modal-backdrop").forEach(m=>m.remove());

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style.cssText = "position:fixed;inset:0;background:#0009;display:flex;align-items:center;justify-content:center;z-index:9999;";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:420px;background:#111;border:1px solid #222;border-radius:12px;padding:16px;">
      <h2 style="margin:0 0 6px;">📋 Carte de Score</h2>
      <p style="color:#ccc;margin:0 0 8px;">
        💚 <b>Parfect</b> = Par + Fairway + GIR + ≤ 2 putts<br>
        💙 <b>Bogey’fect</b> = Bogey + Fairway + ≤ 2 putts
      </p>
      <ul style="margin:0 0 10px 18px;line-height:1.4;color:#ccc;">
        <li>Choisis ton score (Par, Bogey, Birdie…)</li>
        <li>Coche Fairway / GIR / Routine</li>
        <li>Renseigne la distance du 2ᵉ putt</li>
      </ul>
      <label style="display:flex;align-items:center;gap:8px;margin-top:6px;color:#aaa;">
        <input type="checkbox" id="hide-intro"> Ne plus me la montrer
      </label>
      <div style="text-align:right;margin-top:12px;">
        <button id="close-intro" class="btn" style="background:#00ff99;color:#111;">OK, compris</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#close-intro").addEventListener("click", () => {
    if (modal.querySelector("#hide-intro").checked) localStorage.setItem("skipScoreIntro", "true");
    modal.remove();
    onClose?.();
  });
}

// === 4) Mood & Stratégie (avant trou 1) ===
function showMoodAndStrategyModal(onStart) {
  if (document.querySelector(".modal-backdrop")) document.querySelectorAll(".modal-backdrop").forEach(m=>m.remove());

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style.cssText = "position:fixed;inset:0;background:#0009;display:flex;align-items:center;justify-content:center;z-index:9999;";
  modal.innerHTML = `
    <div class="modal-card" style="max-width:380px;background:#111;border:1px solid #222;border-radius:12px;padding:16px;">
      <h3 style="margin:0 0 8px;">😎 Ton mood du jour ?</h3>
      <div class="moods" style="display:flex;gap:6px;flex-wrap:wrap;">
        ${["focus","relax","fun","grind"].map(m=>`<button class="btn mood" data-mood="${m}">${m[0].toUpperCase()+m.slice(1)}</button>`).join("")}
      </div>
      <h4 style="margin:12px 0 8px;">🎯 Stratégie ?</h4>
      <div class="coach-styles" style="display:flex;gap:6px;flex-wrap:wrap;">
        ${["safe","aggressive","5050","fairway","mindset"].map(s=>`<button class="btn strategy" data-strat="${s}">${s}</button>`).join("")}
      </div>
      <div style="text-align:right;margin-top:14px;">
        <button id="start-round" class="btn" style="background:#00ff99;color:#111;">Démarrer</button>
      </div>
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

  modal.querySelector("#start-round").addEventListener("click", () => {
    localStorage.setItem("mood", mood);
    localStorage.setItem("strategy", strat);
    modal.remove();
    onStart?.();
  });
}

// === 5) Affichage d’un trou ===
function renderHole(number = currentHole) {
  const holeCard = $$("hole-card");
  if (!holeCard || !currentGolf) return;

  const totalHoles = currentGolf.pars.length;
  const par = currentGolf.pars[number - 1];
  const saved = holes[number - 1] || {};
  const totalVsPar = holes.filter(Boolean).reduce((a, h) => a + (h.score - h.par), 0);

  holeCard.style.display = "block";
  holeCard.innerHTML = `
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:12px;">
      <div class="mini-recap" style="text-align:center;margin-bottom:10px;">
        <strong>${currentGolf.name}</strong><br>
        Trou ${number}/${totalHoles} — Par ${par} · Total : 
        <span style="color:${totalVsPar>0 ? '#ff6666' : totalVsPar<0 ? '#00ff99' : '#fff'}">
          ${totalVsPar>0? '+'+totalVsPar : totalVsPar}
        </span>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:10px;">
        ${SCORE_CHOICES.map(s => `
          <button class="btn score-btn ${currentDiff===s.diff?'active':''}" data-diff="${s.diff}"
            style="${currentDiff===s.diff?'background:#00ff99;color:#111;font-weight:600;':''}">
            ${s.label}
          </button>
        `).join("")}
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:10px 0;">
        <label><input type="checkbox" id="fairway" ${saved.fairway?'checked':''}> Fairway</label>
        <label><input type="checkbox" id="gir" ${saved.gir?'checked':''}> GIR</label>
        <label><input type="checkbox" id="routine" ${saved.routine?'checked':''}> Routine</label>
      </div>

      <div style="text-align:center;margin:8px 0;">
        <label>Distance 2ᵉ putt :
          <select id="dist2" style="margin-left:6px;padding:4px 6px;border-radius:6px;">
            <option value="" ${saved.dist2===""?'selected':''}>Choisir</option>
            <option value="1" ${saved.dist2==='1'?'selected':''}>Donné</option>
            <option value="2" ${saved.dist2==='2'?'selected':''}>One putt</option>
            <option value="3" ${saved.dist2==='3'?'selected':''}>&lt; 2 m</option>
            <option value="4" ${saved.dist2==='4'?'selected':''}>&lt; 4 m</option>
            <option value="5" ${saved.dist2==='5'?'selected':''}>&lt; 6 m</option>
            <option value="6" ${saved.dist2==='6'?'selected':''}>&gt; 6 m</option>
          </select>
        </label>
      </div>

      <div id="trouble-zone" style="display:${(currentDiff>=2)?'block':'none'};text-align:center;margin:8px 0;">
        <label>Pourquoi double ou plus ?</label><br>
        <select id="trouble" style="margin-top:4px;padding:4px 6px;border-radius:6px;">
          <option value="none" ${saved.trouble==='none'?'selected':''}>R.A.S.</option>
          <option value="drive" ${saved.trouble==='drive'?'selected':''}>Drive égaré</option>
          <option value="penalite" ${saved.trouble==='penalite'?'selected':''}>Pénalité</option>
          <option value="approche" ${saved.trouble==='approche'?'selected':''}>Approche manquée</option>
        </select>
      </div>

      <div
