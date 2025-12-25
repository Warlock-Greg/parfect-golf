// =====================================================
//  licence.js — Parfect.golfr (MVP email-first)
//  - Email obligatoire
//  - Licence via Google Sheets
//  - Trial 30 jours fallback
// =====================================================

(() => {

  // ---------------- CONFIG ----------------
  const LS = {
    EMAIL: "parfect_email",
    NAME: "parfect_name",
    LICENCE: "parfect_licence",       // code licence
    MODE: "parfect_mode",             // "licence" | "trial"
    START: "parfect_start"             // timestamp
  };

  const TRIAL_DAYS = 30;
  const API_URL = "https://script.google.com/macros/s/AKfycbz_gv9PQysFMs6plUWeweVtWvhSeCAHZ5lV6GQqSdx9kdR3hcDYYvoBjAlT393_14yQ/exec";

  const now = () => Date.now();
  const daysToMs = d => d * 86400000;
  const $id = id => document.getElementById(id);

  // ---------------- STATE ----------------
  window.ParfectLicence = {
    active: false,
    mode: "locked" // locked | trial | licence
  };

  // ---------------- HELPERS ----------------
  function isTrialActive() {
    const start = parseInt(localStorage.getItem(LS.START) || "0", 10);
    if (!start) return false;
    return (now() - start) < daysToMs(TRIAL_DAYS);
  }

  function daysLeft() {
    const start = parseInt(localStorage.getItem(LS.START) || "0", 10);
    if (!start) return 0;
    const left = daysToMs(TRIAL_DAYS) - (now() - start);
    return Math.max(0, Math.ceil(left / daysToMs(1)));
  }

  function setTrial(email, name = "") {
    localStorage.setItem(LS.EMAIL, email);
    if (name) localStorage.setItem(LS.NAME, name);
    localStorage.setItem(LS.MODE, "trial");
    localStorage.setItem(LS.START, String(now()));

    window.ParfectLicence.active = true;
    window.ParfectLicence.mode = "trial";
  }

  function setLicence(email, name, code) {
    localStorage.setItem(LS.EMAIL, email);
    localStorage.setItem(LS.NAME, name || "");
    localStorage.setItem(LS.LICENCE, code);
    localStorage.setItem(LS.MODE, "licence");
    localStorage.setItem(LS.START, String(now()));

    window.ParfectLicence.active = true;
    window.ParfectLicence.mode = "licence";
  }

  // ---------------- BACKEND CHECK ----------------
  async function verifyLicence({ email, code }) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          email,
          licence: code
        })
      });
      return await res.json();
    } catch (e) {
      console.warn("Licence check failed:", e);
      return { valid: false };
    }
  }

  async function saveEmailOnly({ email, name }) {
    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "register",
          email,
          name
        })
      });
    } catch (e) {
      console.warn("Email save failed:", e);
    }
  }

  // ---------------- MODAL ----------------
  function showLicenceModal() {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position:fixed;inset:0;
      background:rgba(0,0,0,.85);
      display:flex;align-items:center;justify-content:center;
      z-index:99999;
    `;

    modal.innerHTML = `
      <div style="
        background:#111;
        padding:24px;
        border-radius:16px;
        width:320px;
        color:#fff;
        text-align:center;
      ">
        <h3 style="color:#00ff99;margin-top:0;">🎟️ Accès Parfect.golfr</h3>

        <input id="pf-name" placeholder="Prénom"
          style="width:100%;padding:10px;margin-bottom:8px;
          border-radius:8px;border:1px solid #333;background:#000;color:#fff;">

        <input id="pf-email" placeholder="Email"
          style="width:100%;padding:10px;margin-bottom:8px;
          border-radius:8px;border:1px solid #333;background:#000;color:#fff;">

        <input id="pf-code" placeholder="Code licence (optionnel)"
          style="width:100%;padding:10px;margin-bottom:14px;
          border-radius:8px;border:1px solid #333;background:#000;color:#fff;">

        <button id="pf-start"
          style="width:100%;padding:12px;border:none;
          border-radius:999px;background:#00ff99;color:#111;
          font-weight:700;cursor:pointer;">
          Démarrer
        </button>

        <p style="opacity:.6;font-size:.8rem;margin-top:10px;">
          Essai gratuit ${TRIAL_DAYS} jours sans CB
        </p>
      </div>
    `;

    document.body.appendChild(modal);

    $id("pf-start").onclick = async () => {
      const email = ($id("pf-email").value || "").trim();
      const name  = ($id("pf-name").value || "").trim();
      const code  = ($id("pf-code").value || "").trim();

      if (!email || !email.includes("@")) {
        alert("Merci d’entrer un email valide");
        return;
      }

      // 👉 Toujours enregistrer l’email
      saveEmailOnly({ email, name });

      // 👉 Si code licence → on vérifie
      if (code) {
        const res = await verifyLicence({ email, code });
        if (res.valid) {
          setLicence(email, res.name || name, code);
          modal.remove();
          return;
        }
        alert("Code invalide → essai gratuit activé");
      }

      // 👉 Fallback trial
      setTrial(email, name);
      modal.remove();
    };
  }

  // ---------------- INIT ----------------
  window.initLicence = function () {
    const mode = localStorage.getItem(LS.MODE);

    if (mode === "licence") {
      window.ParfectLicence.active = true;
      window.ParfectLicence.mode = "licence";
      return;
    }

    if (mode === "trial" && isTrialActive()) {
      window.ParfectLicence.active = true;
      window.ParfectLicence.mode = "trial";
      console.log(`⏳ Trial actif — ${daysLeft()} jours restants`);
      return;
    }

    // expired / first launch
    localStorage.removeItem(LS.MODE);
    localStorage.removeItem(LS.START);

    showLicenceModal();
  };

})();
