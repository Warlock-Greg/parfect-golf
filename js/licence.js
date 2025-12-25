// =====================================================
// Parfect.golfr — Licence MVP (NocoDB)
// =====================================================

(() => {
  const NC_URL = "https://app.nocodb.com/api/v2/tables/mfbnbl5kk5zmu73/records?offset=0&limit=25&where=&viewId=vwubv9x3klk4k3q6";
  const NC_TOKEN = "pnOjTp-F7ZbPvGp5NEhceH3zQmDrXQAzFG3AXJz9";

  const LS_KEY = "parfect_user";

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
      await fetch(NC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xc-token": NC_TOKEN
        },
        body: JSON.stringify({
          email,
          licence: "free",
          source: "parfectgolfr.com"
        })
      });
    } catch (e) {
      console.warn("NocoDB unreachable, fallback local only");
    }

    saveUser({
      email,
      licence: "free",
      created_at: Date.now()
    });
  }

  function allowAccess() {
    console.log("✅ Licence OK → JustSwing autorisé");
    window.PARFECT_LICENCE_OK = true;
  }

  // API publique
  window.initLicence = function () {
    const user = getUser();

    if (!user || !user.email) {
      showEmailModal();
      return;
    }

    allowAccess();
  };
})();
