// === licence.js (MVP) ===
window.initLicence = function initLicence() {
  const licence = localStorage.getItem("licence");
  if (licence) return;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style = `
    position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.8);
    display:flex;align-items:center;justify-content:center;z-index:9999;`;
  modal.innerHTML = `
    <div style="background:#111;padding:20px;border-radius:12px;width:320px;text-align:center;">
      <h3 style="color:#00ff99;">🎟️ Licence Parfect.golfr</h3>
      <p>Tu commences avec 30 jours d’accès gratuit.</p>
      <input id="promo-code" placeholder="Code promo" style="padding:8px;border-radius:6px;border:1px solid #333;background:#222;color:#fff;">
      <button id="activate-licence" class="btn" style="margin-top:10px;">Activer</button>
    </div>`;
  document.body.appendChild(modal);

  $("activate-licence").addEventListener("click", async () => {
    const code = $("promo-code").value.trim();
    if (code) {
      const valid = await verifyPromo(code);
      if (!valid) return alert("❌ Code invalide.");
      localStorage.setItem("licence", "freemium");
      alert("✅ Licence Freemium activée !");
    } else {
      localStorage.setItem("licence", "free");
      localStorage.setItem("licence_start", Date.now());
      alert("💚 Licence Free 30 jours activée !");
    }
    modal.remove();
  });
};

async function verifyPromo(code) {
  try {
    const res = await fetch("https://script.google.com/macros/s/YOUR_APPS_SCRIPT_ID/exec?code=" + code);
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

// === licence.js — Détection de la clé IA ===

// 1️⃣ Cherche la clé dans localStorage (ou variable globale)
window.envOpenAIKey = localStorage.getItem("openai_key") || window.envOpenAIKey || "";

// 2️⃣ Crée un petit badge d’état
function showLicenceBadge(active = false) {
  const existing = document.getElementById("ia-badge");
  if (existing) existing.remove();

  const badge = document.createElement("div");
  badge.id = "ia-badge";
  badge.textContent = active ? "💡 IA activée" : "🤖 Mode local";
  badge.style.position = "fixed";
  badge.style.top = "8px";
  badge.style.right = "10px";
  badge.style.background = active ? "#00ff99" : "#555";
  badge.style.color = "#111";
  badge.style.fontSize = "0.8rem";
  badge.style.padding = "4px 10px";
  badge.style.borderRadius = "8px";
  badge.style.fontWeight = "bold";
  badge.style.boxShadow = "0 0 8px rgba(0,0,0,.4)";
  badge.style.zIndex = 9999;
  document.body.appendChild(badge);
}

// 3️⃣ Si clé trouvée → badge vert + mode IA
if (window.envOpenAIKey && window.envOpenAIKey.length > 10) {
  console.log("🔑 Licence OpenAI détectée.");
  showLicenceBadge(true);
  window.iaMode = "openai";
} else {
  console.log("⚙️ Aucun token OpenAI : coach local activé.");
  showLicenceBadge(false);
  window.iaMode = "local";
}

