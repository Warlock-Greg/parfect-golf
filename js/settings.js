// ✅ D'abord : le fallback ou la déclaration globale
if (!window.coachBios) {
  window.coachBios = {
    greg: {
      avatar: "😎",
      name: "Greg",
      role: "Mindset & Stratégie",
      quote: "Smart golf, easy mindset. Reste cool, reste malin."
    },
    goathier: {
      avatar: "🧠",
      name: "Goathier",
      role: "Technique & Données",
      quote: "Le golf, c’est de la physique appliquée à ton swing."
    },
    dorothee: {
      avatar: "💫",
      name: "Dorothée",
      role: "Mental & Respiration",
      quote: "Respire, aligne-toi, laisse le mouvement venir à toi."
    }
  };
}

// ✅ Ensuite : ton code principal
document.addEventListener("DOMContentLoaded", () => {
  const coachSelect = $("coach-select-settings");
  const keyInput = $("openai-key-input");
  const saveKeyBtn = $("save-openai-key");
  const currentKeyDisplay = $("current-key");

  // Charger les valeurs existantes
  const savedCoach = localStorage.getItem("coach") || "greg";
  const savedKey = localStorage.getItem("openai_key") || "";

  coachSelect.value = savedCoach;
  renderCoachBioSettings(savedCoach);

  if (savedKey) {
    const masked = savedKey.slice(0, 6) + "..." + savedKey.slice(-4);
    currentKeyDisplay.innerHTML = `<p>🔑 Clé actuelle : <strong>${masked}</strong></p>`;
  }

  // Gestion du coach
  coachSelect.addEventListener("change", () => {
    const coach = coachSelect.value;
    localStorage.setItem("coach", coach);
    renderCoachBioSettings(coach);
    showCoachToast(`👨‍🏫 Coach ${coachBios[coach].name} sélectionné`, "#00ff99");
  });

  // Gestion de la clé OpenAI
  saveKeyBtn.addEventListener("click", () => {
    const key = keyInput.value.trim();
    if (!key) {
      alert("Entre ta clé OpenAI pour activer le chat coach.");
      return;
    }
    localStorage.setItem("openai_key", key);
    const masked = key.slice(0, 6) + "..." + key.slice(-4);
    currentKeyDisplay.innerHTML = `<p>🔑 Clé actuelle : <strong>${masked}</strong></p>`;
    keyInput.value = "";
    showCoachToast("💾 Clé OpenAI enregistrée avec succès", "#00ff99");
  });
});

// ✅ Fonction pour afficher la bio du coach
function renderCoachBioSettings(coachKey) {
  const c = coachBios[coachKey];
  $("settings-coach-bio").innerHTML = `
    <div class="coach-bio-card">
      <div class="coach-avatar">${c.avatar}</div>
      <div>
        <p><strong>${c.name}</strong> — ${c.role}</p>
        <p class="coach-quote">"${c.quote}"</p>
      </div>
    </div>
  `;
}



document.addEventListener("DOMContentLoaded", () => {
  const coachSelect = $("coach-select-settings");
  const keyInput = $("openai-key-input");
  const saveKeyBtn = $("save-openai-key");
  const currentKeyDisplay = $("current-key");

  // === Charger coach et clé existants ===
  const savedCoach = localStorage.getItem("coach") || "greg";
  const savedKey = localStorage.getItem("openai_key") || "";

  coachSelect.value = savedCoach;
  renderCoachBioSettings(savedCoach);

  if (savedKey) {
    const masked = savedKey.slice(0, 6) + "..." + savedKey.slice(-4);
    currentKeyDisplay.innerHTML = `<p>🔑 Clé actuelle : <strong>${masked}</strong></p>`;
  }

  // === Changement de coach ===
  coachSelect.addEventListener("change", () => {
    const coach = coachSelect.value;
    localStorage.setItem("coach", coach);
    renderCoachBioSettings(coach);
    showCoachToast(`👨‍🏫 Coach ${coachBios[coach].name} sélectionné`, "#00ff99");
  });

  // === Enregistrer clé API ===
  saveKeyBtn.addEventListener("click", () => {
    const key = keyInput.value.trim();
    if (!key) {
      alert("Entre ta clé OpenAI pour activer le chat coach.");
      return;
    }
    localStorage.setItem("openai_key", key);
    const masked = key.slice(0, 6) + "..." + key.slice(-4);
    currentKeyDisplay.innerHTML = `<p>🔑 Clé actuelle : <strong>${masked}</strong></p>`;
    keyInput.value = "";
    showCoachToast("💾 Clé OpenAI enregistrée avec succès", "#00ff99");
  });
});

function renderCoachBioSettings(coachKey) {
  const c = coachBios[coachKey];
  $("settings-coach-bio").innerHTML = `
    <div class="coach-bio-card">
      <div class="coach-avatar">${c.avatar}</div>
      <div>
        <p><strong>${c.name}</strong> — ${c.role}</p>
        <p class="coach-quote">"${c.quote}"</p>
      </div>
    </div>
  `;
}
