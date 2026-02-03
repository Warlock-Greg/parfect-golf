// =====================================================
// Parfect.golfr — licence.js (Supabase Auth + NocoDB)
// Web mobile only — Vanilla JS — MVP < 400 users
// =====================================================

(() => {
  // ------------------------------
  // CONFIG
  // ------------------------------
  const LS_USER_KEY = "parfect_user";

  const NOCODB_FIELDS = {
    EMAIL: "cf6385mi1wk7jim",
    LICENCE: "crkm9s61zfuyjqg",
    SOURCE: "source"
  };

  // Supabase client MUST be loaded before this file
  const supabase = window.supabase;

  // ------------------------------
  // Local helpers
  // ------------------------------
  function saveUser(user) {
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(LS_USER_KEY);
  }

  // ------------------------------
  // NocoDB
  // ------------------------------
  async function readLicenceFromNocoDB(email) {
    try {
      const res = await fetch(
        `${window.NOCODB_REFERENCES_URL}?where=(${NOCODB_FIELDS.EMAIL},eq,${email})`,
        { headers: { "xc-token": window.NOCODB_TOKEN } }
      ).then(r => r.json());

      return res.list?.[0] || null;
    } catch (e) {
      console.warn("⚠️ Licence read failed (offline)");
      return null;
    }
  }

  async function ensureUserInNocoDB(email) {
    try {
      await fetch(window.NOCODB_REFERENCES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xc-token": window.NOCODB_TOKEN
        },
        body: JSON.stringify({
          [NOCODB_FIELDS.EMAIL]: email,
          [NOCODB_FIELDS.LICENCE]: "free",
          [NOCODB_FIELDS.SOURCE]: "supabase-auth"
        })
      });
    } catch {
      // OK offline
    }
  }

  // ------------------------------
  // MODAL AUTH (Email + Password)
  // ------------------------------
  function showAuthModal() {
    if (document.getElementById("parfect-auth-modal")) return;

    const modal = document.createElement("div");
    modal.id = "parfect-auth-modal";
    modal.style.cssText = `
      position:fixed; inset:0;
      background:rgba(0,0,0,.85);
      display:flex; align-items:center; justify-content:center;
      z-index:20000;
    `;

    modal.innerHTML = `
      <div style="
        background:#111;
        padding:24px;
        border-radius:16px;
        width:320px;
        text-align:center;
        box-shadow:0 0 0 1px #222;
      ">
        <img src="logo-parfect-golfr.png" alt="Logo Parfect.golfr" class="pg-header-logo">>

        <input id="pg-email" type="email"
          placeholder="email@email.com"
          style="width:100%;padding:10px;border-radius:8px;
          border:none;margin-bottom:10px;background:#000;color:#fff;" />

        <input id="pg-password" type="password"
          placeholder="mot de passe"
          style="width:100%;padding:10px;border-radius:8px;
          border:none;margin-bottom:14px;background:#000;color:#fff;" />

        <button id="pg-login"
          style="width:100%;padding:10px;border-radius:8px;
          background:#00ff99;border:none;font-weight:bold;">
          Se connecter / Créer un compte
        </button>

        <button id="pg-forgot"
          style="margin-top:10px;background:none;border:none;
          color:#888;font-size:.8rem;">
          Mot de passe oublié ?
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // LOGIN / SIGNUP
    document.getElementById("pg-login").onclick = async () => {
      const email = document.getElementById("pg-email").value.trim();
      const password = document.getElementById("pg-password").value;

      if (!email || !password) {
        alert("Email et mot de passe requis");
        return;
      }

      // Try login first
      let { data, error } =
        await supabase.auth.signInWithPassword({ email, password });

      // If user does not exist → signup
      if (error) {
        ({ data, error } =
          await supabase.auth.signUp({ email, password }));
        if (error) {
          alert(error.message);
          return;
        }
      }

      saveUser({ email });
      await ensureUserInNocoDB(email);
      await initLicence();

      window.dispatchEvent(new Event("parfect:licence:activated"));
      modal.remove();
    };

    // RESET PASSWORD
    document.getElementById("pg-forgot").onclick = async () => {
      const email = document.getElementById("pg-email").value.trim();
      if (!email) {
        alert("Entre ton email");
        return;
      }

      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + "/reset-password.html"
      });

      alert("📩 Email de réinitialisation envoyé");
    };
  }

  // ------------------------------
  // INIT LICENCE (BOOT)
  // ------------------------------
  async function initLicence() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      window.PARFECT_LICENCE_OK = false;
      window.PARFECT_USER = null;
      return;
    }

    const remote = await readLicenceFromNocoDB(user.email);

    const licenceUser = remote
      ? {
          email: user.email,
          licence: remote[NOCODB_FIELDS.LICENCE] || "free",
          synced: true
        }
      : {
          email: user.email,
          licence: "free",
          synced: false
        };

    saveUser(licenceUser);

    window.PARFECT_USER = licenceUser;
    window.userLicence = licenceUser;
    window.PARFECT_LICENCE_OK = licenceUser.licence !== "expired";

    console.log("✅ Licence boot", licenceUser);
  }

  async function logoutParfect() {
  await window.supabase.auth.signOut();

  localStorage.removeItem("parfect_user");

  window.PARFECT_LICENCE_OK = false;
  window.PARFECT_USER = null;
  window.userLicence = null;

  console.log("👋 Déconnecté");

  // Option UX
  location.reload();
}

// Expose
window.logoutParfect = logoutParfect;


  
  // ------------------------------
  // PUBLIC API
  // ------------------------------
  window.initLicence = initLicence;
  window.showAuthModal = showAuthModal;

})();
