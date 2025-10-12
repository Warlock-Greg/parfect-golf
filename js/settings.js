// js/settings.js  — robust against load order & modules

// 1) Ensure a global coachBios exists (fallback if objectives.js hasn't run yet)
if (!window.coachBios) {
  window.coachBios = {
    greg:     { avatar: "😎", name: "Greg",     role: "Mindset & Stratégie",   quote: "Smart golf, easy mindset. Reste cool, reste malin." },
    goathier: { avatar: "🧠", name: "Goathier", role: "Technique & Données",   quote: "Le golf, c’est de la physique appliquée à ton swing." },
    dorothee: { avatar: "💫", name: "Dorothée", role: "Mental & Respiration",  quote: "Respire, aligne-toi, laisse le mouvement venir à toi." }
  };
}

// 2) Create a local alias so references use a defined identifier
const coachBios = window.coachBios;

// 3) Safe helper (if you rely on window.$ from main.js it’s fine too)
const $$ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  const coachSelect = $$("#coach-select-settings");
  const keyInput    = $$("#openai-key-input");
  const saveKeyBtn  = $$("#save-openai-key");
  const currentKeyDisplay = $$("#current-key");

  // Load saved values
  const savedCoach = localStorage.getItem("coach") || "greg";
  const savedKey   = localStorage.getItem("openai_key") || "";

  if (coachSelect) {
    coachSelect.value = savedCoach;
    renderCoachBioSettings(savedCoach);

    coachSelect.addEventListener("change", () => {
      const coach = coachSelect.value;
      localStorage.setItem("coach", coach);
      renderCoachBioSettings(coach);
      // If your toast exists:
      if (window.showCoachToast) {
        window.showCoachToast(`👨‍🏫 Coach ${coachBios[coach].name} sélectionné`, "#00ff99");
      }
    });
  }

  if (savedKey && currentKeyDisplay) {
    const masked = savedKey.slice(0, 6) + "..." + savedKey.slice(-4);
    currentKeyDisplay.innerHTML = `<p>🔑 Clé actuelle : <strong>${masked}</strong></p>`;
  }

  if (saveKeyBtn) {
    saveKeyBtn.addEventListener("click", () => {
      const key = keyInput?.value.trim();
      if (!key) {
        alert("Entre ta clé OpenAI pour activer le chat coach.");
        return;
      }
      localStorage.setItem("openai_key", key);
      if (currentKeyDisplay) {
        const masked = key.slice(0, 6) + "..." + key.slice(-4);
        currentKeyDisplay.innerHTML = `<p>🔑 Clé actuelle : <strong>${masked}</strong></p>`;
      }
      if (keyInput) keyInput.value = "";
      if (window.showCoachToast) {
        window.showCoachToast("💾 Clé OpenAI enregistrée avec succès", "#00ff99");
      }
    });
  }
});

function renderCoachBioSettings(coachKey) {
  const c = coachBios[coachKey]; // <-- uses the local alias defined above
  const target = document.getElementById("settings-coach-bio");
  if (!target || !c) return;
  target.innerHTML = `
    <div class="coach-bio-card">
      <div class="coach-avatar">${c.avatar}</div>
      <div>
        <p><strong>${c.name}</strong> — ${c.role}</p>
        <p class="coach-quote">"${c.quote}"</p>
      </div>
    </div>
  `;
}
