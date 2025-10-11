import { fetchGolfs } from "./data.js";

let currentGolf = null;
let currentHole = 1;
let totalHoles = 18;
let holes = [];
let totalVsPar = 0;

// === INIT ===
(async function initGolfSelect(){
  const golfs = await fetchGolfs();
  const zone = document.getElementById("golf-select");
  zone.innerHTML = "<h3>Choisis ton golf :</h3>" +
    golfs.map(g => `<button class="btn golf-btn" data-id="${g.id}">${g.name}</button>`).join("");
  document.querySelectorAll(".golf-btn").forEach(btn => {
    btn.addEventListener("click", () => startRound(golfs.find(g => g.id === btn.dataset.id)));
  });
})();

function startRound(golf){
  currentGolf = golf;
  currentHole = 1;
  holes = [];
  renderHole();
}

// === RENDER HOLE ===
function renderHole(){
  const zone = document.getElementById("hole-card");
  const par = currentGolf.pars[currentHole - 1];
  const cumu = holes.reduce((acc, h)=>acc+(h.score-h.par),0);
  zone.innerHTML = `
    <h3>Trou ${currentHole} — Par ${par}</h3>
    <p>Score cumulé vs Par : <strong>${cumu>0?`+${cumu}`:cumu}</strong></p>

    <label>Score brut :</label>
    <input type="number" id="hole-score" min="1" max="12"/>
    <span id="score-feedback" class="ml-2 text-sm font-semibold"></span>

    <div class="stats">
      <label><input type="checkbox" id="fairway"> Fairway</label>
      <label><input type="checkbox" id="gir"> GIR</label>
      <label><input type="number" id="putts" min="0" max="5" placeholder="Putts"/></label>
    </div>

    <button id="btn-parfect" class="btn">💚 Parfect</button>
    <button id="next-hole" class="btn">Trou suivant ➡️</button>
  `;

  const scoreInput = document.getElementById("hole-score");
  const feedback = document.getElementById("score-feedback");
  const fairway = document.getElementById("fairway");
  const gir = document.getElementById("gir");
  const putts = document.getElementById("putts");
  const parfect = document.getElementById("btn-parfect");

  scoreInput.addEventListener("input", ()=>{
    const score = parseInt(scoreInput.value,10);
    if(!score) return feedback.textContent="";
    const diff = score - par;
    let label="", color="";
    switch(diff){
      case -3: label="🦅 Double Eagle"; color="text-blue-400"; break;
      case -2: label="🦅 Eagle"; color="text-blue-300"; break;
      case -1: label="💚 Birdie"; color="text-green-400"; break;
      case 0: label="⚪ Par"; color="text-gray-300"; break;
      case 1: label="🟠 Bogey"; color="text-orange-400"; break;
      case 2: label="🔴 Double Bogey"; color="text-red-500"; break;
      default: label = diff< -3 ? "🤯 Ultra rare" : `+${diff} Over Par`; color= diff< -3 ? "text-blue-500":"text-red-500";
    }
    feedback.textContent = label;
    feedback.className = `ml-2 text-sm font-semibold ${color}`;
  });

  parfect.addEventListener("click", ()=>{
    fairway.checked = true;
    gir.checked = true;
    putts.value = 2;
    parfect.textContent = "💚 Parfect enregistré !";
    setTimeout(()=> parfect.textContent = "💚 Parfect",2000);
  });

  document.getElementById("next-hole").addEventListener("click", ()=>{
    const entry = {
      hole: currentHole,
      par,
      score: parseInt(scoreInput.value,10),
      fairway: fairway.checked,
      gir: gir.checked,
      putts: parseInt(putts.value,10)
    };
    holes.push(entry);
    if(currentHole < totalHoles){ currentHole++; renderHole(); }
    else endRound();
  });
}

// === END ROUND ===
function endRound(){
  const totalVsPar = holes.reduce((acc,h)=>acc+(h.score-h.par),0);
  const summary = `
    <h3>Carte terminée 💚</h3>
    <p>Total vs Par : <strong>${totalVsPar>0?`+${totalVsPar}`:totalVsPar}</strong></p>
    <table style="margin:auto;border-collapse:collapse;">
      <tr><th>Trou</th><th>Par</th><th>Score</th><th>Vs Par</th></tr>
      ${holes.map(h=>{
        const diff = h.score-h.par;
        const label = diff===0?"Par": diff<0?`${Math.abs(diff)}↓`:`+${diff}`;
        return `<tr><td>${h.hole}</td><td>${h.par}</td><td>${h.score}</td><td>${label}</td></tr>`;
      }).join("")}
    </table>
  `;
  document.getElementById("score-summary").innerHTML = summary;
}
