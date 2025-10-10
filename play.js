import { LS_KEYS } from "./config.js";
import { showToast, showCoach } from "./ui.js";
import { tipAfterHole } from "./coach.js";

let currentHole = 1;
let totalHoles = 18;
let scoreData = [];

function saveHistory(round) {
  const history = JSON.parse(localStorage.getItem(LS_KEYS.HISTORY) || "[]");
  history.push(round);
  localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
}

export function startRound() {
  scoreData = [];
  currentHole = 1;
  totalHoles = 18;
  showToast("Nouvelle partie — let's go!");
  renderHole();
}

function renderHole() {
  const zone = document.getElementById("app");
  if (!zone) return;
  zone.innerHTML = `
  <div class="bg-gray-800 p-4 rounded-xl shadow">
    <h2 class="text-lg font-bold text-green-400 mb-3">Trou ${currentHole}/${totalHoles}</h2>
    <div class="space-y-2">
      <input id="hole-score" type="number" placeholder="Score" class="w-full text-black rounded px-2 py-1" />
      <input id="hole-putts" type="number" placeholder="Putts" class="w-full text-black rounded px-2 py-1" />
      <div class="flex gap-2 justify-end mt-3">
        <button id="prev-hole" class="bg-gray-600 px-3 py-2 rounded">← Précédent</button>
        <button id="next-hole" class="bg-green-600 hover:bg-green-700 px-3 py-2 rounded">Suivant →</button>
      </div>
    </div>
  </div>`;
  document.getElementById("next-hole").addEventListener("click", saveHole);
  document.getElementById("prev-hole").addEventListener("click", prevHole);
}

function saveHole() {
  const score = parseInt(document.getElementById("hole-score").value);
  const putts = parseInt(document.getElementById("hole-putts").value);
  if (isNaN(score) || isNaN(putts)) {
    showToast("Remplis score + putts !");
    return;
  }
  scoreData.push({ hole: currentHole, score, putts });
  const tip = tipAfterHole({ putts, score }, localStorage.getItem("coachTone") || "fun");
  if (tip) showCoach(tip);
  if (currentHole < totalHoles) {
    currentHole++;
    renderHole();
  } else {
    endRound();
  }
}

function prevHole() {
  if (currentHole > 1) {
    currentHole--;
    renderHole();
  } else {
    showToast("Premier trou déjà 😉");
  }
}

function endRound() {
  const total = scoreData.reduce((a, h) => a + h.score, 0);
  saveHistory({ date: new Date().toISOString(), total, holes: scoreData });
  showToast(`Partie terminée (${total}) — Nice job bro!`);
  setTimeout(() => location.reload(), 2000);
}

document.getElementById("start-game")?.addEventListener("click", startRound);
