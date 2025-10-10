import { fetchExercises } from "./data.js";
import { showToast, showCoach } from "./ui.js";
import { tipAfterPractice } from "./coach.js";
import { LS_KEYS } from "./config.js";

let exercises = [];

async function loadExercises() {
  try {
    exercises = await fetchExercises();
  } catch {
    exercises = [];
  }
  renderExercises();
}

function renderExercises() {
  const zone = document.getElementById("app");
  zone.innerHTML = `
  <div class="bg-gray-800 p-4 rounded-xl shadow">
    <h2 class="text-lg font-bold text-green-400 mb-3">Training</h2>
    <select id="ex-type" class="w-full text-black rounded mb-3"></select>
    <select id="ex-item" class="w-full text-black rounded mb-3"></select>
    <button id="save-tr" class="bg-green-600 hover:bg-green-700 px-3 py-2 rounded">Valider</button>
  </div>`;

  const types = [...new Set(exercises.map(e => e.type))];
  const typeSel = document.getElementById("ex-type");
  typeSel.innerHTML = types.map(t => `<option>${t}</option>`).join("");

  function updateExList() {
    const t = typeSel.value;
    const exSel = document.getElementById("ex-item");
    exSel.innerHTML = exercises.filter(e => e.type === t)
      .map(e => `<option value="${e.id}">${e.title}</option>`).join("");
  }

  typeSel.addEventListener("change", updateExList);
  updateExList();

  document.getElementById("save-tr").addEventListener("click", saveTraining);
}

function saveTraining() {
  const tSel = document.getElementById("ex-type");
  const iSel = document.getElementById("ex-item");
  const type = tSel.value;
  const id = iSel.value;
  const tr = { id, type, date: new Date().toISOString() };
  const history = JSON.parse(localStorage.getItem(LS_KEYS.TRAIN) || "[]");
  history.push(tr);
  localStorage.setItem(LS_KEYS.TRAIN, JSON.stringify(history));
  showToast("Training saved 💪");
  showCoach(tipAfterPractice(type, localStorage.getItem("coachTone") || "fun"));
}

document.addEventListener("DOMContentLoaded", loadExercises);
