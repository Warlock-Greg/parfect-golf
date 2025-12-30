// ==========================================================
// coach/objectiveModal.js
// Popup objective selector with Skip (user preference)
// ==========================================================

export function createObjectiveModal({ onSelect }) {
  const modal = document.createElement("div");
  modal.id = "objective-modal";
  modal.style.cssText = `
    position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
    background: rgba(0,0,0,.55); z-index: 9999;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    width: min(520px, 92vw); background: #111; color: #fff; border-radius: 16px;
    padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.35);
    font-family: system-ui, -apple-system, Segoe UI, Roboto;
  `;

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div style="font-size:18px; font-weight:700;">Choisis ton objectif</div>
        <div style="opacity:.8; margin-top:4px; font-size:13px;">
          Un seul focus → meilleure régularité.
        </div>
      </div>
      <button id="obj-skip" style="background:#222; color:#fff; border:1px solid #333; padding:10px 12px; border-radius:12px; cursor:pointer;">
        Skip
      </button>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px;">
      ${btn("REGULARITE", "Régularité")}
      ${btn("ZONE", "Rester dans la zone")}
      ${btn("ROUTINE", "Routine solide")}
      ${btn("CALME", "Calme & intention")}
      ${btn("SCORE", "Scorer (simple)")}
    </div>

    <div style="margin-top:12px; font-size:12px; opacity:.7;">
      Tu peux changer d’objectif à tout moment.
    </div>
  `;

  modal.appendChild(card);
  document.body.appendChild(modal);

  function close() { modal.style.display = "none"; }
  function open() { modal.style.display = "flex"; }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  card.querySelector("#obj-skip").addEventListener("click", () => {
    onSelect?.("SKIP");
    close();
  });

  card.querySelectorAll("[data-obj]").forEach((b) => {
    b.addEventListener("click", () => {
      onSelect?.(b.getAttribute("data-obj"));
      close();
    });
  });

  return { open, close, el: modal };
}

function btn(code, label) {
  return `
    <button data-obj="${code}" style="
      background:#1b1b1b; border:1px solid #333; color:#fff;
      padding:12px; border-radius:14px; cursor:pointer; text-align:left;
    ">
      <div style="font-weight:700;">${label}</div>
      <div style="opacity:.75; font-size:12px; margin-top:4px;">${hint(code)}</div>
    </button>
  `;
}

function hint(code) {
  switch (code) {
    case "REGULARITE": return "Répéter le même swing.";
    case "ZONE": return "Rester dans tes tolérances.";
    case "ROUTINE": return "Script mental constant.";
    case "CALME": return "Respiration + intention.";
    case "SCORE": return "Maîtrisé, sans ego.";
    default: return "";
  }
}
