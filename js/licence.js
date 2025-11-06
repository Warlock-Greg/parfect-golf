// === licence.js (MVP propre & robuste) ===
(() => {
  const LS_KEYS = {
    LICENCE: "licence",               // "free" | "freemium" | "pro"
    LICENCE_START: "licence_start",   // timestamp (ms)
    LICENCE_EXPIRY: "licence_expiry"  // ISO string (optionnel si tu veux stocker la date)
  };

  // === Utils
  const $id = (x) => document.getElementById(x);
  const now = () => Date.now();
  const daysToMs = (d) => d * 24 * 60 * 60 * 1000;

  // Durée d’essai (modifiable)
  const TRIAL_DAYS = 30;

  // === Badge IA (visuel en haut à droite)
  function showLicenceBadge(active = false, mode = "local") {
    const existing = document.getElementById("ia-badge");
    if (existing) existing.remove();

    const badge = document.createElement("div");
    badge.id = "ia-badge";
    badge.textContent = active
      ? (mode === "worker" ? "💡 IA via Worker" : "💡 IA activée")
      : "🤖 Mode local";
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
    badge.style.zIndex = 15000;
    document.body.appendChild(badge);
  }

  // === Détection automatique du mode IA
  // Configure ceci si tu utilises un Worker ou une clé locale
  window.parfectWorkerURL = window.parfectWorkerURL || ""; // ex: "https://ton-worker.cloudflareworkers.net/coach"
  window.envOpenAIKey     = window.envOpenAIKey || "";     // si tu l’injectes côté front (MVP)

  function detectIAMode() {
    if (window.parfectWorkerURL && window.parfectWorkerURL.startsWith("https")) {
      console.log("🌐 Mode IA via Worker activé :", window.parfectWorkerURL);
      window.iaMode = "worker";
      showLicenceBadge(true, "worker");
    } else if (window.envOpenAIKey && window.envOpenAIKey.length > 10) {
      console.log("🔑 Licence OpenAI locale détectée.");
      window.iaMode = "openai";
      showLicenceBadge(true, "local");
    } else {
      console.log("⚙️ Aucun accès IA : mode local standard.");
      window.iaMode = "local";
      showLicenceBadge(false);
    }
  }

  // === Vérification simple côté Google Apps Script (promo)
  async function verifyPromo(code) {
    try {
      // ⚠️ Remplace par ton vrai Apps Script ID
      const url = "https://script.google.com/macros/s/YOUR_APPS_SCRIPT_ID/exec?code=" + encodeURIComponent(code);
      const res = await fetch(url);
      const data = await res.json();
      return data.valid === true;
    } catch (e) {
      console.warn("Promo check failed:", e);
      return false;
    }
  }

  // === Vérifie si essai actif / expiré
  function isTrialActive() {
    const type = localStorage.getItem(LS_KEYS.LICENCE);
    const start = parseInt(localStorage.getItem(LS_KEYS.LICENCE_START) || "0", 10);
    if (!type || !start) return false; // pas encore activé
    if (type !== "free") return true;  // freemium/pro : actif
    // free = essai 30 jours
    return (now() - start) < daysToMs(TRIAL_DAYS);
  }

  function daysLeftTrial() {
    const start = parseInt(localStorage.getItem(LS_KEYS.LICENCE_START) || "0", 10);
    if (!start) return 0;
    const leftMs = daysToMs(TRIAL_DAYS) - (now() - start);
    return Math.max(0, Math.ceil(leftMs / (24*60*60*1000)));
  }

  // === Affiche la modale d’activation (free 30j ou code promo)
  function showLicenceModal() {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.style.zIndex = "20000"; // passe devant tout
    modal.innerHTML = `
      <div class="modal-card" style="width:320px;max-width:90%;">
        <h3 style="color:#00ff99;margin-top:0;">🎟️ Licence Parfect.golfr</h3>
        <p style="margin:8px 0;">Tu commences avec <b>${TRIAL_DAYS} jours</b> d’accès gratuit.<br>Active un code promo si tu en as un.</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">
          <input id="licence-promo" placeholder="Code promo" 
                 style="flex:1;padding:8px;border-radius:6px;border:1px solid #333;background:#000;color:#fff;">
          <button id="licence-activate" class="btn">Activer</button>
        </div>
        <hr style="border:none;border-top:1px solid #222;margin:14px 0;">
        <button id="licence-start-free" class="btn" 
                style="background:#00ff99;color:#111;width:100%;">💚 Démarrer l’essai ${TRIAL_DAYS}j</button>
      </div>`;
    document.body.appendChild(modal);

    $id("licence-activate").addEventListener("click", async () => {
      const code = ($id("licence-promo").value || "").trim();
      if (!code) {
        alert("Entre un code promo, ou démarre l’essai gratuit.");
        return;
      }
      const ok = await verifyPromo(code);
      if (!ok) {
        alert("❌ Code invalide.");
        return;
      }
      localStorage.setItem(LS_KEYS.LICENCE, "freemium");
      localStorage.setItem(LS_KEYS.LICENCE_START, String(now())); // point de départ info
      alert("✅ Licence Freemium activée !");
      modal.remove();
      detectIAMode();
    });

    $id("licence-start-free").addEventListener("click", () => {
      localStorage.setItem(LS_KEYS.LICENCE, "free");
      localStorage.setItem(LS_KEYS.LICENCE_START, String(now()));
      alert(`💚 Licence Free ${TRIAL_DAYS} jours activée !`);
      modal.remove();
      detectIAMode();
    });
  }

  // === API publique
  window.initLicence = function initLicence() {
    // 1) Si essai actif / licence déjà là → OK
    if (isTrialActive()) {
      detectIAMode();
      return;
    }

    // 2) Si essai expiré → on nettoie et on redemande
    const type = localStorage.getItem(LS_KEYS.LICENCE);
    if (type === "free" && !isTrialActive()) {
      localStorage.removeItem(LS_KEYS.LICENCE);
      localStorage.removeItem(LS_KEYS.LICENCE_START);
      localStorage.removeItem(LS_KEYS.LICENCE_EXPIRY);
    }

    // 3) Affiche la modale d’activation
    showLicenceModal();
  };

  // Expose le badge si tu veux le rafraîchir depuis ailleurs
  window.updateLicenceBadge = detectIAMode;
})();
