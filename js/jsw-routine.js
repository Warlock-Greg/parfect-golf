document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("jsw-routine-modal");
  if (!modal) return;

  const btnOpen = document.getElementById("jsw-open-routine-modal");
  const saveBtn = document.getElementById("jsw-routine-save");
  const fields = {
    swing: document.getElementById("routine-swing"),
    putt: document.getElementById("routine-putt"),
    approche: document.getElementById("routine-approche"),
  };

  const key = "jsw_routines";

  // Charger routine sauvegardée
  const saved = JSON.parse(localStorage.getItem(key) || "{}");
  if (saved.swing) fields.swing.value = saved.swing.join(",");
  if (saved.putt) fields.putt.value = saved.putt.join(",");
  if (saved.approche) fields.approche.value = saved.approche.join(",");

  btnOpen?.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  document.getElementById("jsw-routine-close")?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  saveBtn?.addEventListener("click", () => {
    const config = {
      swing: fields.swing.value.split(",").map(t => t.trim()),
      putt: fields.putt.value.split(",").map(t => t.trim()),
      approche: fields.approche.value.split(",").map(t => t.trim()),
    };

    // Mémorisation locale
    localStorage.setItem(key, JSON.stringify(config));

    // Injection dans JustSwing clean
    if (window.JustSwing?.setRoutineConfig) {
      JustSwing.setRoutineConfig(config);
    }

    modal.classList.add("hidden");
    console.log("🧠 Routine personnalisée :", config);
  });
});
