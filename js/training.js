// === Parfect.golfr - training.js (MVP) ===

window.initTraining = function initTraining() {
  const zone = document.getElementById("coach-log");
  if (!zone) return;

  push("coach", "Bienvenue dans ton mode Entraînement 🏋️‍♂️");
  push("coach", "Choisis ton objectif : putting, routine, ou driving ?");

  const opts = ["Putting", "Routine", "Driving"];
  opts.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = opt;
    btn.style.margin = "6px";
    btn.onclick = () => selectTraining(opt);
    zone.appendChild(btn);
  });
  zone.scrollTop = zone.scrollHeight;
};

function selectTraining(type) {
  push("user", "Je choisis : " + type);
  const advice = {
    Putting: "💚 Objectif putting : concentre-toi sur ton tempo et ressens le contact.",
    Routine: "😎 Routine : visualise chaque coup avant de taper.",
    Driving: "🔥 Driving : équilibre puissance et précision, pense au rythme, pas à la force.",
  };
  push("coach", advice[type]);
}

function push(role, text) {
  const log = document.getElementById("coach-log");
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;align-items:flex-start;";
  row.innerHTML = `
    <div style="font-size:1.1rem">${role === "user" ? "👤" : "😎"}</div>
    <div style="background:#111;border:1px solid #222;padding:8px 10px;border-radius:8px;max-width:85%;">
      ${text}
    </div>`;
  log.appendChild(row);
  requestAnimationFrame(() => (log.scrollTop = log.scrollHeight + 30));
}
