document.addEventListener("DOMContentLoaded", () => {

  const btnOpen = document.getElementById("jsw-open-routine-modal");
  const modal = document.getElementById("jsw-routine-modal");
  const saveBtn = document.getElementById("jsw-routine-save");
  const closeBtn = document.getElementById("jsw-routine-close");

  if (!modal) return;

  const routines = {
    swing: ["Respiration", "Visualisation", "Alignement", "Swing d’essai", "Adresse", "Swing"],
    putt: ["Lecture du green", "Alignement", "Adresse", "Putt"],
    approche: ["Visualisation", "Alignement", "Adresse", "Swing d'approche"]
  };

  // Ouvrir modale
  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      modal.classList.remove("hidden");
    });
  }

  // Fermer
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  // Sauver config
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const config = {
        swing: document.getElementById("routine-swing").value.split(","),
        putt: document.getElementById("routine-putt").value.split(","),
        approche: document.getElementById("routine-approche").value.split(","),
      };

      if (window.saveRoutineConfig) {
        window.saveRoutineConfig(config);
      }

      if (window.JustSwing?.setRoutineConfig) {
        JustSwing.setRoutineConfig(config);
      }

      modal.classList.add("hidden");
      console.log("🧠 Routine personnalisée :", config);
    });
  }

});
