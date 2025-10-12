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
