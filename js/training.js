// js/training.js
import { fetchExercises } from "./data.js";

const state = { exercisesLoaded: false };
const $ = (id) => document.getElementById(id);

async function loadExercises() {
  const container = $("exercise-list");
  if (!container) return;

  container.innerHTML = '<p style="opacity:.7">Chargement des exercices…</p>';
  try {
    const data = await fetchExercises();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<p style="color:#f88">Aucun exercice trouvé.</p>';
      return;
    }
    container.innerHTML = data
      .map(
        (ex) => `
      <div class="exercise-card" style="background:#111;border:1px solid #222;padding:12px;border-radius:10px;margin:8px auto;max-width:520px;text-align:left">
        <div style="font-weight:600;color:#00ff99">${escapeHtml(ex.name)}</div>
        <div style="font-size:.9rem;opacity:.9">Type: ${escapeHtml(
          ex.type || "—"
        )} · Niveau: ${escapeHtml(ex.level || "—")}</div>
        <div style="font-size:.95rem;margin-top:6px">${escapeHtml(
          ex.goal || ""
        )}</div>
      </div>
    `
      )
      .join("");
    state.exercisesLoaded = true;
  } catch (e) {
    console.error(e);
    container.innerHTML =
      '<p style="color:#f88">Erreur de chargement des exercices.</p>';
  }
}

function onShowTraining() {
  if (!state.exercisesLoaded) loadExercises();
}

document.addEventListener("DOMContentLoaded", () => {
  if ($("training")?.classList.contains("active")) onShowTraining();

  $("training-btn")?.addEventListener("click", () =>
    setTimeout(onShowTraining, 50)
  );

  document
    .querySelectorAll('#menu [data-target="training"]')
    .forEach((btn) => btn.addEventListener("click", () => setTimeout(onShowTraining, 50)));
});

// Utils
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[s]));
}
export {};
