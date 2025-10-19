// === Parfect.golfr - coachIA.js (MVP global) ===
window.$ = window.$ || ((id) => document.getElementById(id));

(function initCoachIADOM() {
  if (document.querySelector("#coach-ia-panel")) return;

  const panel = document.createElement("div");
  panel.id = "coach-ia-panel";
  panel.style.cssText = `
    position: fixed; right: 10px; bottom: 10px; width: 320px; max-width: 92%;
    background: #111; color:#fff; border:1px solid #00ff99; border-radius:12px;
    overflow: hidden; z-index: 9998; display:none;
  `;
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#0a0a0a;">
      <strong>Coach IA</strong>
      <div>
        <button id="coach-ia-hide" style="background:none;border:none;color:#00ff99;cursor:pointer">–</button>
      </div>
    </div>
    <div id="coach-ia-log" style="max-height:220px;overflow:auto;padding:10px 12px;font-size:.95rem;line-height:1.4"></div>
    <div style="padding:8px;display:flex;gap:6px;border-top:1px solid #00ff99">
      <input id="coach-ia-input" type="text" placeholder="Pose une question..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #333;background:#000;color:#fff">
      <button id="coach-ia-send" class="btn" style="background:#00ff99;color:#111;padding:8px 10px;border-radius:8px;border:0;cursor:pointer">Envoyer</button>
    </div>
  `;
  document.body.appendChild(panel);

  $("coach-ia-hide").addEventListener("click", hideCoachIA);
  $("coach-ia-send").addEventListener("click", sendCoachIA);
  $("coach-ia-input").addEventListener("keypress", (e)=>{ if(e.key==="Enter") sendCoachIA(); });
})();

function initCoachIA() { /* réservé si besoin futur */ }
function showCoachIA() { $("coach-ia-panel").style.display = "block"; }
function hideCoachIA() { $("coach-ia-panel").style.display = "none"; }

async function sendCoachIA() {
  const input = $("coach-ia-input");
  const log = $("coach-ia-log");
  const txt = (input.value||"").trim();
  if (!txt) return;
  input.value = "";

  const user = document.createElement("div");
  user.style.margin = "6px 0";
  user.innerHTML = `<strong>Toi :</strong> ${txt}`;
  log.appendChild(user);
  log.scrollTop = log.scrollHeight;

  // Appel API proxy (Cloudflare) si configuré
  const apiUrl = localStorage.getItem("coach_api_url") || "";
  if (!apiUrl) {
    const coach = document.createElement("div");
    coach.style.margin = "6px 0";
    coach.style.opacity = ".9";
    coach.innerHTML = `<strong>Coach :</strong> (mode local) Respire, reste simple, vise le centre du green.`;
    log.appendChild(coach);
    log.scrollTop = log.scrollHeight;
    return;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ messages: [{role:"user", content: txt}] })
    });
    if (!res.ok) throw new Error("HTTP "+res.status);
    const data = await res.json();

    const coach = document.createElement("div");
    coach.style.margin = "6px 0";
    coach.style.opacity = ".95";
    coach.innerHTML = `<strong>Coach :</strong> ${ (data.reply||"") }`;
    log.appendChild(coach);
    log.scrollTop = log.scrollHeight;
  } catch (err) {
    const coach = document.createElement("div");
    coach.style.margin = "6px 0";
    coach.style.color = "#ff6666";
    coach.innerHTML = `<strong>Coach :</strong> Erreur de connexion à l’API 😅`;
    log.appendChild(coach);
    log.scrollTop = log.scrollHeight;
  }
}

window.initCoachIA = initCoachIA;
window.showCoachIA = showCoachIA;
window.hideCoachIA = hideCoachIA;
