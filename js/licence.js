// =====================================================
// Parfect.golfr — Licence MVP (NocoDB)
// =====================================================

(() => {

  const NC_URL   = window.NC_URL;
  const NC_TOKEN = window.NC_TOKEN;

  // ✅ Clé locale explicite (source unique de vérité)
  const LS_KEY = "PARFECT_LICENCE_USER";

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY));
    } catch {
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem(LS_KEY, JSON.stringify(user));
  }

  function showEmailModal() {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.8);
      display:flex; align-items:center; justify-content:center;
      z-index:20000;
    `;

    modal.innerHTML = `
      <div style="background:#111;padding:24px;border-radius:16px;width:320px;">
        <h3 style="color:#00ff99;margin-top:0">Accès JustSwing</h3>
        <p style="color:#ccc;font-size:.9rem">
          Accès gratuit — entre ton email pour commencer.
        </p>
        <input id="pg-email" type="email" placeholder="email@email.com"
          style="width:100%;padding:10px;border-radius:8px;border:none;margin-bottom:12px;">
        <button id="pg-submit"
          style="width:100%;padding:10px;border-radius:8px;
                 background:#00ff99;border:none;font-weight:bold;">
          Accéder à JustSwing
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("pg-submit").onclick = async () => {
      const email = document.getElementById("pg-email").value.trim();
      if (!email || !email.includes("@")) {
        alert("Email invalide");
        return;
      }

      await registerEmail(email);
      modal.remove();
      allowAccess();
    };
  }

  async function registerEmail(email) {
    try {
      const res = await fetch(NC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xc-token": NC_TOKEN
        },
        body: JSON.stringify({
          fields: {
            cf6385mi1wk7jim: email,
            crkm9s61zfuyjqg: "free",
            source: "parfectgolfr.com"
          }
        })
      });

      if (!res.ok) {
        console.warn("⚠️ NocoDB rejected payload", await res.text());
      }

    } catch (e) {
      console.warn("⚠️ NocoDB unreachable, fallback local only");
    }

    // ✅ Toujours sauvegarde locale (MVP offline-first)
    saveUser({
      email,
      licence: "free",
      created_at: Date.now(),
       synced: true
    });
  }

  function allowAccess() {
    console.log("✅ Licence OK → JustSwing autorisé");
    window.PARFECT_LICENCE_OK = true;
  }

  // API publique
  window.initLicence = function () {
    const user = getUser();

     if (user && user.email && !user.synced) {
    registerEmail(user.email);
  }
    
    if (!user || !user.email) {
      showEmailModal();
      return;
    }

    allowAccess();
  };

})();
