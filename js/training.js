// === Parfect.golfr – training.js (MVP, no ES modules) ===
// Expérience conversationnelle : le coach guide ton entraînement et enregistre l'historique.

(function () {
  // --- Helpers & keys ---
  const $ = (id) => document.getElementById(id);
  const TRAINING_KEY = "trainingHistory";

  // --- État ---
  let exercises = [];           // catalogue d'exercices (fusion fallback + window.EXERCISES si présent)
  let selectedType = null;      // putting / chipping / driving / irons / mental
  let currentExercise = null;   // exercice courant
  let targetCount = 10;         // objectif de répétitions
  let successCount = 0;         // compteur de réussites

  // --- Fallback d'exercices (au cas où aucun catalogue n'est dispo) ---
  const FALLBACK_EXERCISES = [
    { id: "putt-ladders",   type: "putting", name: "Échelle de putts",     goal: "10 putts progressifs", objectif: 10 },
    { id: "putt-circle",    type: "putting", name: "Cercle 1,5m",          goal: "12 putts autour du trou", objectif: 12 },
    { id: "chip-landing",   type: "chipping",name: "Zone d’atterrissage",  goal: "10 chips sur zone", objectif: 10 },
    { id: "drive-fairway",  type: "driving", name: "Fairway first",        goal: "8/10 dans l’axe", objectif: 10 },
    { id: "irons-target",   type: "irons",   name: "Cible 140m",           goal: "10 sur green cible", objectif: 10 },
    { id: "mental-breath",  type: "mental",  name: "Respiration box",      goal: "4-4-4-4 (x5)", objectif: 5 },
  ];

  // --- Bootstrap ---
  document.addEventListener("DOMContentLoaded", initTraining);

  function initTraining() {
    console.log("🎯 Training ready (MVP)");
    hydrateExercises();
    buildTypeButtons();
    bindHistoryReset();
    renderHistory(); // affiche l'historique en bas de page à l'ouverture
    // Message d’accueil du coach
    coachSay("Choisis un thème d’entraînement pour qu’on démarre (Putting, Chipping, Driving, Irons, Mental).");
  }

  function hydrateExercises() {
    // Permet d’enrichir via window.EXERCISES si défini ailleurs (data.js, etc.)
    const ext = Array.isArray(window.EXERCISES) ? window.EXERCISES : [];
    const merged = [...FALLBACK_EXERCISES];
    // ajoute sans doublon (par id)
    ext.forEach((e) => {
      if (!merged.find((m) => m.id === e.id)) merged.push(e);
    });
    exercises = merged;
  }

  // ========== UI PRINCIPALE ==========

  function buildTypeButtons() {
    const zone = $("training-type");
    if (!zone) return;

    const types = ["putting", "chipping", "driving", "irons", "mental"];
    zone.innerHTML = types
      .map(
        (t) =>
          `<button class="btn training-type" data-type="${t}">${t.toUpperCase()}</button>`
      )
      .join("");

    zone.querySelectorAll(".training-type").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedType = btn.dataset.type;
        highlightType(selectedType);
        coachSay(typeIntroLine(selectedType));
        listExercises(selectedType);
      });
    });
  }

  function highlightType(type) {
    document.querySelectorAll(".training-type").forEach((b) =>
      b.classList.remove("active-type")
    );
    const active = document.querySelector(`.training-type[data-type="${type}"]`);
    if (active) active.classList.add("active-type");
  }

  function typeIntroLine(type) {
    switch (type) {
      case "putting":
        return "On bosse le putting : régularité et dosage. Choisis un exercice 👇";
      case "chipping":
        return "Chipping time : contact clean & landing zone. Choisis un exercice 👇";
      case "driving":
        return "On met la balle en jeu : priorité Fairway First. Choisis un exercice 👇";
      case "irons":
        return "Fers : trajectoire & distance cible. Choisis un exercice 👇";
      case "mental":
        return "Mental : respiration & focus. Choisis un exercice 👇";
      default:
        return "Choisis un exercice 👇";
    }
  }

  function listExercises(type) {
    const zone = $("training-exercises");
    const session = $("training-session");
    if (!zone || !session) return;
    session.innerHTML = ""; // efface une éventuelle session en cours

    const list = exercises.filter((e) => (e.type || "").toLowerCase() === type);
    if (!list.length) {
      zone.innerHTML = `<p style="opacity:.7">Aucun exercice disponible pour ${type}.</p>`;
      return;
    }

    zone.innerHTML = `
      <h3 style="margin-top:10px">${type.toUpperCase()}</h3>
      <ul class="exo-list" style="list-style:none;padding-left:0;">
        ${list
          .map(
            (ex) => `
          <li style="margin:6px 0;">
            <button class="btn exo-btn" data-id="${ex.id}">
              ${ex.name} — <small>${ex.goal || ""}</small>
            </button>
          </li>
        `
          )
          .join("")}
      </ul>
      <div style="margin-top:8px;">
        <button id="view-training-history" class="btn secondary">📜 Voir l’historique</button>
      </div>
    `;

    zone.querySelectorAll(".exo-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        const exo = list.find((e) => e.id === btn.dataset.id);
        startExerciseConversation(exo);
      })
    );

    // Lien d’accès rapide à l’historique
    $("view-training-history").addEventListener("click", () => {
      coachSay("Voici ton historique d’entraînements. Continue sur ta lancée 💪");
      document.getElementById("training-history")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // ========== FLOW CONVERSATIONNEL ==========

  function startExerciseConversation(exo) {
    currentExercise = exo;
    successCount = 0;
    targetCount = exo.objectif || 10;

    // UI de session
    const zone = $("training-session");
    const list = $("training-exercises");
    if (!zone || !list) return;

    list.innerHTML = ""; // masque la liste
    zone.innerHTML = buildSessionCard(exo, targetCount);

    // Coach guide
    coachSay(`On part sur **${exo.name}** : objectif ${targetCount}. Clique “+1 Réussi” à chaque réussite, ou saisis ta perf.`);

    // Bind events
    $("btn-add-success").addEventListener("click", () => {
      if (successCount < 999) successCount++;
      updateProgress();
    });

    $("btn-less-success").addEventListener("click", () => {
      if (successCount > 0) successCount--;
      updateProgress();
    });

    $("target-input").addEventListener("change", (e) => {
      const v = parseInt(e.target.value || "0", 10);
      targetCount = isNaN(v) || v <= 0 ? 10 : v;
      updateProgress(true);
    });

    $("save-perf").addEventListener("click", () => {
      const perfField = $("perf-input");
      const noteField = $("note-input");
      const perfText =
        (perfField.value || "").trim() ||
        `${successCount}/${targetCount} réussis (${targetCount ? Math.round((successCount / targetCount) * 100) : 0}%)`;
      const noteText = (noteField.value || "").trim();

      const entry = {
        id: exo.id,
        name: exo.name,
        type: exo.type,
        goal: exo.goal,
        perf: perfText,
        note: noteText,
      };

      savePerformance(entry);
      coachSay(sessionFeedbackText(entry));
      showEndModal(() => {
        // Recommencer
        startExerciseConversation(exo);
      }, () => {
        // Changer d'exo
        listExercises(exo.type);
      });
      renderHistory();
    });

    $("change-exo").addEventListener("click", () => {
      listExercises(exo.type);
    });

    function updateProgress(resetLabelOnly = false) {
      const percent = targetCount ? (successCount / targetCount) * 100 : 0;
      $("progress-fill").style.width = Math.max(0, Math.min(100, percent)) + "%";
      $("progress-label").textContent = `Progression : ${successCount} / ${targetCount}`;
      if (!resetLabelOnly) {
        $("perf-input").placeholder = `${successCount}/${targetCount} réussis (${Math.round(percent)}%)`;
      }
    }
  }

  function buildSessionCard(exo, objectif) {
    // Visuel simple (pas de dépendance externe)
    const mediaUrl = (exo.media || "").trim();
    let mediaBlock = "";
    if (mediaUrl) {
      mediaBlock = mediaUrl.endsWith(".mp4")
        ? `<video src="${mediaUrl}" controls class="exo-media" style="width:100%;border-radius:10px;"></video>`
        : `<img src="${mediaUrl}" alt="${exo.name}" class="exo-media" style="width:100%;border-radius:10px;"/>`;
    }

    return `
      <div class="training-session-card" style="background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;padding:12px;">
        ${mediaBlock ? `<div class="media-container" style="margin-bottom:8px;">${mediaBlock}</div>` : ""}
        <h4 style="margin:4px 0 2px 0">${exo.name}</h4>
        <p class="goal" style="opacity:.9;margin:0 0 8px 0;">${exo.goal || ""}</p>

        <div class="coach-panel" style="margin-bottom:8px;">
          <div class="coach-avatar">😎</div>
          <div class="coach-text">On y va — propre, simple, efficace.</div>
        </div>

        <div class="progress-block" style="margin:8px 0;">
          <div id="progress-label" style="margin-bottom:4px;">Progression : 0 / ${objectif}</div>
          <div class="progress-bar" style="width:100%;height:10px;background:#1f1f1f;border-radius:999px;overflow:hidden;">
            <div id="progress-fill" style="height:100%;width:0%;background:#00ff99;"></div>
          </div>

          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
            <button class="btn" id="btn-less-success" style="background:#333">−1</button>
            <button class="btn" id="btn-add-success">+1 Réussi</button>
            <label style="margin-left:auto;display:flex;align-items:center;gap:6px;">Objectif :
              <input id="target-input" type="number" value="${objectif}" min="1" style="width:70px;padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
            </label>
          </div>
        </div>

        <div class="inputs" style="display:grid;gap:8px;margin-top:10px;">
          <label>Performance :</label>
          <input type="text" id="perf-input" placeholder="ex: 8/10 réussis ou 70%" style="padding:8px;border-radius:8px;border:1px solid #333;background:#111;color:#fff;" />

          <label>Commentaire :</label>
          <textarea id="note-input" placeholder="Tes sensations..." style="padding:8px;border-radius:8px;border:1px solid #333;background:#111;color:#fff;"></textarea>
        </div>

        <div class="actions" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn" id="save-perf">Sauvegarder</button>
          <button class="btn secondary" id="change-exo">↩️ Changer d'exercice</button>
          <button class="btn secondary" id="view-training-history">📜 Historique</button>
        </div>
      </div>
    `;
  }

  function sessionFeedbackText(entry) {
    // Feedback simple et positif
    const ratio = (function () {
      const m = entry.perf.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return null;
      const done = parseInt(m[1], 10);
      const tot = parseInt(m[2], 10);
      if (isNaN(done) || isNaN(tot) || tot === 0) return null;
      return Math.round((done / tot) * 100);
    })();

    if (ratio === null) {
      return `Bien joué sur "${entry.name}" ! Consistance et tempo : c’est la clé 💚`;
    } else if (ratio >= 80) {
      return `🔥 Top session (${ratio}%) sur "${entry.name}" ! On ancre la confiance.`;
    } else if (ratio >= 60) {
      return `💪 Solide (${ratio}%) — on construit le niveau jour après jour.`;
    }
    return `👌 ${ratio}% : c’est une base. On garde la routine et on remet ça bientôt.`;
  }

  // ========== SAUVEGARDE & HISTORIQUE ==========

  function savePerformance(entry) {
    const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
    data.push({
      date: new Date().toISOString(),
      ...entry,
    });
    localStorage.setItem(TRAINING_KEY, JSON.stringify(data));
  }

  function renderHistory() {
    const zone = $("training-history");
    if (!zone) return;

    const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
    if (!data.length) {
      zone.innerHTML = "<p style='opacity:.6'>Aucun entraînement enregistré pour le moment.</p>";
      return;
    }

    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    zone.innerHTML = `
      <h3>📜 Historique d'entraînement</h3>
      <div class="history-list">
        ${data
          .map((h) => {
            const d = new Date(h.date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "2-digit",
            });
            return `
              <div class="history-item" style="border:1px solid #222;border-radius:10px;padding:10px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;">
                  <div style="color:#00ff99;font-weight:600">${h.name}</div>
                  <div style="font-size:.85rem;opacity:.8">${d} · ${h.type}</div>
                </div>
                <div style="margin:4px 0;">Perf : <strong>${h.perf}</strong></div>
                ${h.note ? `<div style="font-size:.9rem;opacity:.9;">Note : ${h.note}</div>` : ""}
              </div>`;
          })
          .join("")}
      </div>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" id="new-session">➕ Nouvelle séance</button>
        <button class="btn" id="reset-training-history" style="background:#ff4d4d;">🧹 Reset historique</button>
      </div>
    `;

    $("new-session")?.addEventListener("click", () => {
      coachSay("On repart sur une nouvelle séance. Choisis un thème 👇");
      $("training-session").innerHTML = "";
      buildTypeButtons();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("reset-training-history")?.addEventListener("click", () => {
      if (!confirm("🧹 Supprimer tout l’historique d’entraînement ?")) return;
      localStorage.removeItem(TRAINING_KEY);
      renderHistory();
    });
  }

  function bindHistoryReset() {
    // Optionnel : bouton existant dans ton HTML (si tu en as un)
    const btn = $("reset-history");
    if (btn) {
      btn.addEventListener("click", () => {
        if (!confirm("🧹 Supprimer tout l’historique d’entraînement ?")) return;
        localStorage.removeItem(TRAINING_KEY);
        renderHistory();
      });
    }
  }

  // ========== COACH IA (intégration MVP) ==========

  function coachSay(message) {
    // Si un panneau Coach IA existe (coachIA.js), on l’utilise :
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("coach-message", { detail: message }));
    }
    // Fallback si pas de coach IA : petit toast si dispo
    if (typeof window.showCoachToast === "function") {
      window.showCoachToast(message, "#00ff99");
    } else {
      // Dernier fallback discret
      console.log("🗣️ Coach:", message);
    }
  }

  // Expose minimalement quelques fonctions si besoin ailleurs
  window.renderTrainingHistory = renderHistory;
  window.startExerciseConversation = startExerciseConversation;
})();
