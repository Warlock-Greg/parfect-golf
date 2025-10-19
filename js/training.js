// === Parfect.golfr - training.js (MVP) ===

(function(){
  const TRAINING_KEY = "trainingHistory";
  const $ = window.$ || (id => document.getElementById(id));

  // Data
  function fetchExercises() {
    const url = "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/data/exercises.json";
    return fetch(url, { cache:"no-store" }).then(r=>r.json()).catch(()=>([]));
  }

  // Public init (appelée depuis main.js quand on vient sur la page)
  window.initTraining = async function initTraining(){
    const typeZone = $("training-type");
    if (!typeZone) return;

    // Types
    const types = ["putting", "chipping", "driving", "irons", "mental"];
    typeZone.innerHTML = types.map(t => `<button class="btn training-type" data-type="${t}">${t.toUpperCase()}</button>`).join("");

    const all = await fetchExercises();
    // Clicks sur type => liste exos
    document.querySelectorAll(".training-type").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const t = btn.dataset.type;
        setActiveTypeButton(t);
        loadExercises(t, all);
      });
    });

    renderHistory();
    if (typeof window.initCoachIA === "function") window.initCoachIA();
  };

  function setActiveTypeButton(type){
    document.querySelectorAll(".training-type").forEach(b=>b.classList.remove("active-type"));
    const active = document.querySelector(`.training-type[data-type="${type}"]`);
    if (active) active.classList.add("active-type");
  }

  function loadExercises(type, all){
    const zone = $("training-exercises");
    const exos = all.filter(e => (e.type||"").toLowerCase().includes(type));
    if (!exos.length) {
      zone.innerHTML = `<p style="opacity:.7">Aucun exercice pour ${type}.</p>`;
      return;
    }
    zone.innerHTML = `
      <h3>${type.toUpperCase()}</h3>
      <ul class="exo-list">
        ${exos.map(ex=>`
          <li><button class="btn exo-btn" data-id="${ex.id}">${ex.name} — <small>${ex.goal||""}</small></button></li>
        `).join("")}
      </ul>`;
    zone.querySelectorAll(".exo-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const exo = exos.find(e=>String(e.id)===btn.dataset.id);
        startExercise(exo);
      });
    });
  }

  function startExercise(exo){
    const zone = $("training-session");
    if (!zone) return;
    $("training-exercises").style.display = "none";

    const objectif = exo.objectif || 10;
    let currentCount = 0;

    // Media fallback
    const defaults = {
      putting:"https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/putting_default.jpg",
      chipping:"https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/chipping_default.jpg",
      driving:"https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/driving_default.jpg",
      irons:"https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/irons_default.jpg",
      mental:"https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/media/defaults/mental_default.jpg"
    };
    const mediaUrl = exo.media || defaults[(exo.type||"").toLowerCase()] || defaults.putting;
    const mediaBlock = /\.mp4(\?|$)/.test(mediaUrl)
      ? `<video src="${mediaUrl}" controls class="exo-media"></video>`
      : `<img src="${mediaUrl}" alt="${exo.name}" class="exo-media">`;

    zone.innerHTML = `
      <div class="training-session-card">
        <div class="media-container">${mediaBlock}</div>
        <h4>${exo.name}</h4>
        <p class="goal">${exo.goal||""}</p>

        <div class="coach-panel">
          <div class="coach-avatar">😎</div>
          <div class="coach-text">Focus qualité > quantité. Respire, cadence régulière.</div>
        </div>

        <div class="progress-block">
          <div id="progress-label">Progression : 0 / ${objectif}</div>
          <div class="progress-bar"><div id="progress-fill"></div></div>
          <button class="btn" id="btn-add-success">+1 Réussi</button>
        </div>

        <div class="inputs">
          <label>Performance :</label>
          <input type="text" id="perf-input" placeholder="Ex: 8/10 ou 70%" />
          <label>Commentaire :</label>
          <textarea id="note-input" placeholder="Tes sensations..."></textarea>
        </div>

        <div class="actions">
          <button class="btn" id="save-perf">Sauvegarder</button>
          <button class="btn secondary" id="change-exo">🔁 Changer d'exercice</button>
        </div>
      </div>`;

    $("btn-add-success").addEventListener("click",()=>{
      if (currentCount < objectif) {
        currentCount++;
        const p = Math.round((currentCount/objectif)*100);
        $("progress-fill").style.width = p+"%";
        $("progress-label").textContent = `Progression : ${currentCount} / ${objectif}`;
      }
    });

    $("change-exo").addEventListener("click",()=>{
      $("training-session").innerHTML = "";
      $("training-exercises").style.display = "block";
    });

    $("save-perf").addEventListener("click",()=>{
      const perf = $("perf-input").value.trim() || `${currentCount}/${objectif} (${Math.round((currentCount/objectif)*100)}%)`;
      const note = $("note-input").value.trim();
      savePerformance({...exo, perf, note});
      showEndModal(exo);
      renderHistory();
      if (typeof window.showCoachToast === "function") window.showCoachToast("💾 Entraînement enregistré. Nice job !", "#00ff99");
    });
  }

  function savePerformance(entry){
    const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
    data.push({ date: new Date().toISOString(), ...entry });
    localStorage.setItem(TRAINING_KEY, JSON.stringify(data));
  }

  function showEndModal(exo){
    const modal = document.createElement("div");
    modal.className = "end-modal";
    modal.innerHTML = `
      <div class="end-content">
        <h3>✅ Bien joué !</h3>
        <p>Tu veux recommencer l'exercice ou en changer ?</p>
        <div class="end-actions">
          <button class="btn" id="restart-exo">🔄 Recommencer</button>
          <button class="btn" id="new-exo">↩️ Changer d'exercice</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    $("restart-exo").addEventListener("click",()=>{ modal.remove(); startExercise(exo); });
    $("new-exo").addEventListener("click",()=>{ modal.remove(); $("training-session").innerHTML=""; $("training-exercises").style.display="block"; });
  }

  window.renderHistory = function renderHistory(){
    const zone = $("training-history");
    if (!zone) return;
    const data = JSON.parse(localStorage.getItem(TRAINING_KEY) || "[]");
    if (!data.length) {
      zone.innerHTML = "<p style='opacity:.6'>Aucun entraînement enregistré.</p>";
      return;
    }
    data.sort((a,b)=> new Date(b.date)-new Date(a.date));
    zone.innerHTML = `
      <h3>📜 Historique d'entraînement</h3>
      <div class="history-list">
        ${data.map(h=>{
          const d = new Date(h.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"2-digit"});
          return `
            <div class="history-item">
              <div style="color:#00ff99;font-weight:600">${h.name||"(exercice)"}</div>
              <div style="font-size:.85rem;opacity:.8">${d} · ${h.type||""}</div>
              <div style="margin:4px 0;">Perf : <strong>${h.perf||"-"}</strong></div>
              ${h.note? `<div style="font-size:.9rem;opacity:.9;">Note : ${h.note}</div>` : ""}
            </div>`;
        }).join("")}
      </div>`;
  };
})();
