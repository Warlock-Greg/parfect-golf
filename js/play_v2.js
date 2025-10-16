// js/play_v2.js
import { fetchGolfs } from "./data.js";
import { tipAfterHole } from "./coach.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "golfHistoryV2";

let currentGolf = null;
let currentHole = 1;
let totalHoles = 18;
let holes = [];
let currentDiff = null;
let playerMood = null;
let strategyOfDay = null;

// === INIT ===
(async function initGolfSelect() {
  const zone = $("golf-select");
  const golfs = await fetchGolfs();
  zone.innerHTML =
    "<h3>Choisis ton golf :</h3>" +
    golfs.map((g) => `<button class="btn golf-btn" data-id="${g.id}">⛳ ${g.name}</button>`).join("");
  zone.querySelectorAll(".golf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = golfs.find((x) => String(x.id) === btn.dataset.id);
      startRoundV2(g);
    });
  });
})();


// === DÉMARRAGE DE PARTIE ===
async function startRoundV2(golf) {
  await showCoachMoodAndStrategyModal();

  currentGolf = golf;
  totalHoles = Array.isArray(golf.pars) ? golf.pars.length : 18;
  currentHole = 1;
  holes = new Array(totalHoles).fill(null);
  currentDiff = null;

  $("golf-select").style.display = "none";
  renderHoleV2();
}


// === MODALE COACH : MOOD + STRATÉGIE DU JOUR ===
function showCoachMoodAndStrategyModal() {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal-card" style="max-width:420px;text-align:center;">
        <h2>👋 Hey golfeur !</h2>
        <p>Avant de commencer, dis-moi :</p>

        <h4>Ton mood du jour ?</h4>
        <div class="mood-select" style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
          <button class="btn mood" data-mood="focus">🎯 Focus</button>
          <button class="btn mood" data-mood="chill">😌 Chill</button>
          <button class="btn mood" data-mood="determined">🔥 Déterminé</button>
          <button class="btn mood" data-mood="fatigue">💤 Fatigué</button>
        </div>

        <h4 style="margin-top:14px;">Ta stratégie du jour ?</h4>
        <div class="strat-select" style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
          <button class="btn strat" data-strat="parfect">💚 Parfect</button>
          <button class="btn strat" data-strat="secure">🪶 Sécurisé</button>
          <button class="btn strat" data-strat="aggressive">🔥 Agressif</button>
          <button class="btn strat" data-strat="gir">🎯 GIR First</button>
          <button class="btn strat" data-strat="5050">⚖️ 50/50</button>
        </div>

        <div style="margin-top:16px;">
          <button id="start-round" class="btn" disabled>Démarrer 💪</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    let moodSelected = false;
    let stratSelected = false;

    backdrop.querySelectorAll(".mood").forEach((btn) =>
      btn.addEventListener("click", () => {
        playerMood = btn.dataset.mood;
        backdrop.querySelectorAll(".mood").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        moodSelected = true;
        checkReady();
      })
    );

    backdrop.querySelectorAll(".strat").forEach((btn) =>
      btn.addEventListener("click", () => {
        strategyOfDay = btn.dataset.strat;
        backdrop.querySelectorAll(".strat").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        stratSelected = true;
        checkReady();
      })
    );

    function checkReady() {
      if (moodSelected && stratSelected) $("start-round").disabled = false;
    }

    $("start-round").addEventListener("click", () => {
      backdrop.remove();
      showCoachToast(`Ok ${playerMood} mood et stratégie ${strategyOfDay} 💚`, "#00ff99");
      resolve();
    });
  });
}


// === RENDER HOLE (Saisie simplifiée + stratégie) ===
function renderHoleV2() {
  const zone = $("hole-card");
  const par = currentGolf.pars[currentHole - 1];
  const saved = holes[currentHole - 1] || {};

  zone.innerHTML = `
    <div class="mini-recap">Trou ${currentHole}/${totalHoles} — Par ${par}</div>

    <h3 style="margin-top:6px;">Comment s’est passé ton trou ?</h3>

    <div class="score-options" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
      <button class="btn score" data-diff="-2">Eagle</button>
      <button class="btn score" data-diff="-1">Birdie</button>
      <button class="btn score" data-diff="0">Par 💚</button>
      <button class="btn score" data-diff="1">Bogey 💙</button>
      <button class="btn score" data-diff="2">Double</button>
      <button class="btn score" data-diff="3">Triple+</button>
    </div>

    <div class="options" style="margin-top:10px;">
      <label><input type="checkbox" id="fairway"> Fairway touché</label>
      <label><input type="checkbox" id="gir"> GIR</label>
      <label><input type="checkbox" id="routine"> Routine faite</label>

      <label style="display:block;margin-top:8px;">Distance 2e putt :</label>
      <select id="dist2" style="width:100%;padding:6px;border-radius:6px;">
        <option value="">— Sélectionne —</option>
        <option value="donne">🎁 Donné</option>
        <option value="oneputt">🔥 One Putt Baby</option>
        <option value="2m">Moins de 2m</option>
        <option value="4m">Moins de 4m</option>
        <option value="6m">Moins de 6m</option>
        <option value="plus">Au-delà</option>
      </select>
    </div>

    <div style="margin-top:12px;">
      <label>Stratégie sur ce trou :</label>
      <select id="strat-hole" style="width:100%;padding:6px;border-radius:6px;">
        <option value="auto">— Suivre stratégie du jour (${strategyOfDay}) —</option>
        <option value="gir">🎯 GIR First</option>
        <option value="secure">🪶 Sécurisé</option>
        <option value="aggressive">🔥 Agressif</option>
        <option value="parfect">💚 Parfect</option>
        <option value="5050">⚖️ 50/50</option>
      </select>
    </div>

    <div style="text-align:center;margin-top:16px;">
      <button id="next-hole" class="btn" style="background:#00c676;color:white;">Enregistrer & Trou suivant ➡️</button>
    </div>
  `;

  zone.querySelectorAll(".score").forEach((btn) =>
    btn.addEventListener("click", () => {
      zone.querySelectorAll(".score").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = parseInt(btn.dataset.diff, 10);
    })
  );

  $("next-hole").addEventListener("click", () => {
    saveHoleV2();
  });
}


// === SAUVEGARDE DU TROU ===
function saveHoleV2() {
  const par = currentGolf.pars[currentHole - 1];
  const score = par + (currentDiff ?? 0);

  const entry = {
    hole: currentHole,
    par,
    score,
    diff: currentDiff ?? 0,
    fairway: $("fairway").checked,
    gir: $("gir").checked,
    routine: $("routine").checked,
    dist2: $("dist2").value,
    stratHole: $("strat-hole").value,
    mood: playerMood,
    stratDay: strategyOfDay,
  };

  holes[currentHole - 1] = entry;

  handleCoachFeedback(entry);

  setTimeout(() => {
    if (currentHole < totalHoles) {
      currentHole++;
      renderHoleV2();
    } else {
      endRoundV2();
    }
  }, 2800);
}


// === FEEDBACK COACH APRÈS TROU ===
function handleCoachFeedback(entry) {
  const diff = entry.diff;
  let msg = "";
  let color = "#00ff99";

  if (diff <= -1) msg = "🔥 Excellent ! Continue sur ce rythme.";
  else if (diff === 0 && entry.routine) msg = "💚 Parfect : tu maîtrises ton flow.";
  else if (diff === 1) msg = "💙 Bogeyfect, belle gestion malgré la pression.";
  else if (diff >= 2) {
    msg = "😅 Petit passage à vide — Drive égaré, pénalité ou mental ? Pense stratégie.";
    color = "#ff9966";
  }

  // Ajoute une note stratégique
  if (entry.stratHole === "aggressive" && diff > 0) msg += " 👉 Peut-être jouer plus safe au prochain trou ?";
  if (entry.stratHole === "secure" && diff <= 0) msg += " 👍 Sécurité payante.";
  if (entry.stratHole === "gir") msg += " 🎯 Continue à viser le centre du green.";

  showCoachToast(msg, color);
}


// === FIN DE PARTIE ===
function endRoundV2() {
  const totalVsPar = holes.reduce((acc, h) => acc + (h.score - h.par), 0);
  const parfects = holes.filter((h) => h.diff === 0 && h.fairway && h.gir && h.routine).length;
  const bogeyfects = holes.filter((h) => h.diff === 1 && h.fairway && h.routine).length;

  const roundData = {
    date: new Date().toISOString(),
    golf: currentGolf.name,
    totalVsPar,
    parfects,
    bogeyfects,
    mood: playerMood,
    stratDay: strategyOfDay,
    holes,
  };

  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history.push(roundData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

  $("hole-card").innerHTML = `
    <div class="summary-card">
      <h3>Partie terminée 🎉</h3>
      <p>Score total : ${totalVsPar > 0 ? "+" + totalVsPar : totalVsPar}</p>
      <p>💚 Parfects : ${parfects} · 💙 Bogeyfects : ${bogeyfects}</p>
      <p>Mood : ${playerMood} · Stratégie : ${strategyOfDay}</p>
      <button id="new-round" class="btn" style="background:#00c676;color:white;">Nouvelle partie</button>
    </div>
  `;

  $("new-round").addEventListener("click", () => location.reload());
}

