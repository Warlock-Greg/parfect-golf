import { fetchGolfs } from "./data.js";
import { showToast, showCoach } from "./ui.js";
import { tipAfterHole } from "./coach.js";

let objective = "Enjoy only";
let golfs = [];
let currentGolf = null;        // { id, name, pars[] }
let totalHoles = 18;
let currentHole = 1;
let holes = [];                // [{score, putts, fairway:'yes|no|na', gir:bool, firstPutt:number, routine:bool, par:int}]

const $ = (id) => document.getElementById(id);

// === FLOW ENTRY (depuis index: bouton “Nouvelle partie”) ===
document.getElementById("start-game")?.addEventListener("click", startGameFlow);

async function startGameFlow(){
  holes = [];
  currentHole = 1;
  await openObjectiveModal();
}

function open(el){ el.classList.remove("hidden"); el.classList.add("flex"); }
function close(el){ el.classList.add("hidden"); el.classList.remove("flex"); }

// 1) OBJECTIF DU JOUR
async function openObjectiveModal(){
  const modal = $("objective-modal");
  const select = $("objective-select");
  const confirm = $("objective-confirm");
  open(modal);
  confirm.onclick = async () => {
    objective = select.value || "Enjoy only";
    close(modal);
    await openGolfModal();
  };
}

// 2) CHOIX DU GOLF
async function openGolfModal(){
  const modal = $("golf-modal");
  const selGolf = $("golf-select");
  const selHoles = $("holes-select");
  const btnConfirm = $("golf-confirm");
  const btnCancel = $("golf-cancel");

  open(modal);
  try{
    golfs = await fetchGolfs();
  }catch{ golfs = []; }
  if (!Array.isArray(golfs)) golfs = [];

  selGolf.innerHTML = golfs.length
    ? golfs.map(g => `<option value="${g.id}">${g.name}</option>`).join("")
    : `<option value="">— Aucun golf défini —</option>`;

  btnConfirm.onclick = () => {
    const id = selGolf.value;
    currentGolf = golfs.find(g => String(g.id) === String(id)) || null;
    totalHoles = parseInt(selHoles.value, 10) || 18;
    close(modal);
    showToast(currentGolf ? `Golf sélectionné : ${currentGolf.name}` : "Parcours sans modèle — PAR 4 par défaut");
    openHoleModal();
  };
  btnCancel.onclick = () => close(modal);
}

// 3) SAISIE TROU PAR TROU (MODALE)
function openHoleModal(){
  const modal = $("hole-modal");
  const title = $("hole-title");
  const sub = $("hole-sub");

  const par = (Array.isArray(currentGolf?.pars) && currentGolf.pars[currentHole-1]) ? parseInt(currentGolf.pars[currentHole-1],10) : 4;

  title.textContent = `${currentGolf ? currentGolf.name + " — " : ""}Trou ${currentHole}/${totalHoles}`;
  sub.textContent = `Par ${par} · Objectif: ${objective}`;

  // reset champs
  $("f-score").value = "";
  $("f-putts").value = "2";
  $("f-fairway").value = par === 3 ? "na" : "no"; // Par3 -> N/A par défaut
  $("f-gir").value = "no";
  $("f-firstputt").value = "";
  $("f-routine").checked = false; // routine par défaut décochée

  open(modal);

  $("hole-prev").onclick = () => {
    if (currentHole > 1){ currentHole--; openHoleModal(); }
    else showToast("Premier trou déjà 😉");
  };

  $("hole-next").onclick = () => {
    const score = parseInt($("f-score").value,10);
    const putts = parseInt($("f-putts").value,10);
    const fairway = $("f-fairway").value;  // yes/no/na
    const gir = $("f-gir").value === "yes";
    const firstPutt = parseFloat($("f-firstputt").value || "0");
    const routine = $("f-routine").checked === true;

    if (isNaN(score) || isNaN(putts)){
      showToast("Indique score brut et putts 🙏");
      return;
    }

    const holeObj = { hole: currentHole, par, score, putts, fairway, gir, firstPutt, routine };
    holes[currentHole-1] = holeObj;

    // Coach (live)
    const vsPar = score - par; // 0 = Par
    const isFairway = (fairway === "yes");
    const parfect = (vsPar === 0) && isFairway && gir && (putts <= 2);

    // Message coach personnalisé
    let tip = tipAfterHole({
      putts,
      fairway: isFairway,
      gir,
      routine
    }, localStorage.getItem("coachTone") || "fun");

    if (parfect){
      tip = "💚 Parfect baby! Fairway + GIR + ≤2 putts — that’s smart golf.";
    } else if (!routine){
      tip = "⏱️ Routine zappée… Tu peux rater un coup, mais jamais ta routine.";
    }
    if (tip) showCoach(tip);

    // Trou suivant ou fin
    if (currentHole < totalHoles){
      currentHole++;
      openHoleModal();
    } else {
      close(modal);
      endRound();
    }
  };
}

// 4) FIN DE PARTIE — STATS + BADGE
function endRound(){
  const totalVsPar = holes.reduce((acc,h)=> acc + (h.score - h.par), 0);
  const fairwayHoles = holes.filter(h => h.par !== 3); // FW mesurables
  const fwCount = fairwayHoles.filter(h => h.fairway === "yes").length;
  const fwTotal = fairwayHoles.length;
  const girCount = holes.filter(h => h.gir).length;
  const puttsTotal = holes.reduce((a,h)=> a + (h.putts||0), 0);
  const routineCount = holes.filter(h => h.routine).length;

  const parfectCount = holes.filter(h => (h.score - h.par) === 0 && (h.fairway==="yes") && h.gir && (h.putts<=2)).length;

  const summary = {
    golf: currentGolf?.name || "Parcours inconnu",
    date: new Date().toLocaleString(),
    totalHoles,
    totalVsPar,
    fwCount, fwTotal,
    girCount,
    puttsTotal,
    routineCount,
    parfectCount,
  };

  renderSummary(summary);
  generateBadge(summary);
  open($("summary-modal"));
}

// === Sauvegarde locale de la partie ===
  const round = {
    date: new Date().toISOString(),
    golf: currentGolf?.name || "Parcours inconnu",
    objective,
    totalHoles,
    holes,
    summary: {
      totalVsPar,
      fwCount, fwTotal,
      girCount,
      puttsTotal,
      routineCount,
      parfectCount
    }
  };

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem("parfectHistory") || "[]");
  } catch {
    history = [];
  }

  history.push(round);
  // garde seulement les 10 dernières
  if (history.length > 10) history = history.slice(history.length - 10);
  localStorage.setItem("parfectHistory", JSON.stringify(history));

function renderSummary(s){
  const el = $("summary-stats");
  el.innerHTML = `
    <div class="grid sm:grid-cols-2 gap-3">
      <div class="bg-gray-800 p-3 rounded">
        <div><strong>Golf :</strong> ${s.golf}</div>
        <div><strong>Date :</strong> ${s.date}</div>
        <div><strong>Trous :</strong> ${s.totalHoles}</div>
      </div>
      <div class="bg-gray-800 p-3 rounded">
        <div><strong>Score vs Par :</strong> ${s.totalVsPar>=0? '+'+s.totalVsPar : s.totalVsPar}</div>
        <div><strong>Parfects :</strong> ${s.parfectCount}</div>
        <div><strong>Routine :</strong> ${Math.round((s.routineCount/s.totalHoles)*100)}%</div>
      </div>
      <div class="bg-gray-800 p-3 rounded">
        <div><strong>Fairways :</strong> ${s.fwCount}/${s.fwTotal}</div>
        <div><strong>GIR :</strong> ${s.girCount}/${s.totalHoles}</div>
        <div><strong>Putts :</strong> ${s.puttsTotal}</div>
      </div>
      <div class="bg-gray-800 p-3 rounded">
        <div><strong>Objectif du jour :</strong> ${objective}</div>
        <div class="text-green-300 mt-1">Sois malin, sois stratégie. Vise l’objectif facile à chaque coup.</div>
      </div>
    </div>
  `;

  $("summary-close").onclick = () => close($("summary-modal"));
}

// 5) BADGE — Canvas 720x720 vert Parfect + logo
async function generateBadge(s){
  const canvas = $("badge-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // Fond vert Parfect
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(0,0,W,H);

  // Logo
  const logo = new Image();
  logo.crossOrigin = "anonymous";
  logo.src = "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/logo%20parfect%20v2.png";

  await new Promise(res => { logo.onload = res; logo.onerror = res; });

  const logoW = 180, logoH = 180;
  ctx.drawImage(logo, (W-logoW)/2, 40, logoW, logoH);

  // Titre
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Poppins, Inter, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Parfect.golfr", W/2, 260);

  // Lignes stats
  ctx.font = "28px Poppins, Inter, Arial";
  const lines = [
    `${s.golf}`,
    `Score vs Par : ${s.totalVsPar>=0? '+'+s.totalVsPar : s.totalVsPar}`,
    `Parfects : ${s.parfectCount}`,
    `Routine : ${Math.round((s.routineCount/s.totalHoles)*100)}%`,
    `GIR : ${s.girCount}/${s.totalHoles}   ·   FW : ${s.fwCount}/${s.fwTotal}`,
    `Putts total : ${s.puttsTotal}`
  ];
  let y = 310;
  lines.forEach(t => { ctx.fillText(t, W/2, y); y += 40; });

  // Punchline coach
  ctx.font = "italic 24px Poppins, Inter, Arial";
  ctx.fillText("“Anywhere on the green + two putts.”", W/2, 560);
  ctx.fillText("“À swing égal, prends du plaisir.”", W/2, 595);

  // Hashtag
  ctx.font = "bold 24px Poppins, Inter, Arial";
  ctx.fillText("#parfectgolfr", W/2, 640);

  // Lien de téléchargement
  const url = canvas.toDataURL("image/png");
  const a = $("badge-download");
  a.href = url;
}


// === HISTORIQUE LOCAL ===
document.getElementById("view-history")?.addEventListener("click", showHistory);
document.getElementById("close-history")?.addEventListener("click", () => {
  $("history-section").classList.add("hidden");
});

function showHistory(){
  const section = $("history-section");
  const list = $("history-list");
  const coachZone = $("history-coach");
  section.classList.remove("hidden");

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem("parfectHistory") || "[]");
  } catch { history = []; }

  if (!history.length){
    list.innerHTML = `<p class="text-gray-300 italic">Aucune partie enregistrée encore 🙃</p>`;
    coachZone.textContent = "";
    return;
  }

  // Tri par date desc
  history.sort((a,b) => new Date(b.date) - new Date(a.date));

  list.innerHTML = history.map(h => {
    const vs = h.summary?.totalVsPar || 0;
    const parfects = h.summary?.parfectCount || 0;
    const routinePct = h.summary ? Math.round((h.summary.routineCount / h.totalHoles) * 100) : 0;
    const date = new Date(h.date).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"2-digit" });
    return `
      <div class="bg-gray-900 p-3 rounded-lg flex justify-between items-center">
        <div>
          <div class="font-semibold text-green-300">${date} — ${h.golf}</div>
          <div class="text-gray-400 text-sm">${h.objective}</div>
        </div>
        <div class="text-right text-sm">
          <div><strong>${vs >= 0 ? "+"+vs : vs}</strong> vs Par</div>
          <div>💚 ${parfects} Parfects</div>
          <div>⏱️ ${routinePct}% routine</div>
        </div>
      </div>
    `;
  }).join("");

  // Coach summary
  const avgParfect = Math.round(history.reduce((a,h)=>a+(h.summary?.parfectCount||0),0) / history.length);
  const avgRoutine = Math.round(history.reduce((a,h)=>a+(h.summary?.routineCount||0)/(h.totalHoles||1),0) / history.length * 100);

  let message = "";
  if (avgParfect > 3){
    message = `🔥 Bro, ${avgParfect} Parfects de moyenne. Tu joues smart, mental first.`;
  } else if (avgRoutine >= 90){
    message = `🧘 Routine master — ${avgRoutine}% de constance. Tu peux rater un coup, pas ta routine.`;
  } else {
    message = `😉 Keep building. ${avgParfect} Parfects / ${avgRoutine}% routine, c’est déjà une belle base.`;
  }

  coachZone.textContent = message;
}
