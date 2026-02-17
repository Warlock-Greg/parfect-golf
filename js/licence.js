// =====================================================
// Parfect.golfr — licence.js
// Auth: Supabase (email + password)
// Licence: NocoDB
// Web mobile only — MVP < 400 users
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

  const supabase = window.supabase;

  // ------------------------------
  // Local helpers
  // ------------------------------
  function getLocalUser() {
    try {
      return JSON.parse(localStorage.getItem(LS_USER_KEY));
    } catch {
      return null;
    }
  }

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
        `${window.NOCODB_REFERENCES_URL}?where=(${NOCODB_FIELDS.EMAIL},eq,${encodeURIComponent(email)})`,
        { headers: { "xc-token": window.NOCODB_TOKEN } }
      ).then(r => r.json());

      return res.list?.[0] || null;
    } catch {
      console.warn("⚠️ Licence read failed (offline)");
      return null;
    }
  }

 async function ensureUserInNocoDB(email) {
  try {
    // 1️⃣ Vérifie si l'utilisateur existe déjà
    const res = await fetch(
      `${window.NOCODB_REFERENCES_URL}?where=(${NOCODB_FIELDS.EMAIL},eq,${email})`,
      {
        headers: {
          "xc-token": window.NOCODB_TOKEN
        }
      }
    ).then(r => r.json());

    const existing = res.list?.[0];

    // 2️⃣ S'il existe → NE RIEN FAIRE
    if (existing) return;

    // 3️⃣ Sinon créer en FREE
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

  } catch (err) {
    console.warn("NocoDB ensure error", err);
  }
}


  // ------------------------------
  // AUTH SUCCESS PIPELINE
  // ------------------------------
  async function afterAuthSuccess(email) {
    const baseUser = {
      email,
      licence: "free",
      synced: false
    };

    saveUser(baseUser);
    window.userLicence = baseUser;

    await ensureUserInNocoDB(email);
    await initLicence();

    window.dispatchEvent(new Event("parfect:licence:activated"));
    document.getElementById("parfect-auth-modal")?.remove();
  }

  // ------------------------------
  // MODAL AUTH
  // ------------------------------
  function showAuthModal() {
    if (document.getElementById("parfect-auth-modal")) return;

    let resetCooldown = false;

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
        <img src="logo-parfect-golfr.png"
             alt="Logo Parfect.golfr"
             class="pg-header-logo" />

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
          background:var(--pg-green-main);border:none;font-weight:bold;">
          Se connecter
        </button>

        <button id="pg-signup"
          style="margin-top:8px;width:100%;
          padding:10px;border-radius:8px;
          background:#222;color:#fff;border:none;">
          Créer un compte
        </button>

        <button id="pg-forgot"
          style="margin-top:10px;background:none;border:none;
          color:#888;font-size:.8rem;">
          Mot de passe oublié ?
        </button>

        <p id="pg-auth-msg"
           style="margin-top:8px;font-size:.75rem;color:#777;"></p>
         <a id="pg-legal" href"/legal">j'accepte les conditions générales
           </a>
      </div>
    `;

    document.body.appendChild(modal);

    const msg = document.getElementById("pg-auth-msg");

    // ---------------- LOGIN ----------------
    document.getElementById("pg-login").onclick = async () => {
      const email = document.getElementById("pg-email").value.trim();
      const password = document.getElementById("pg-password").value;

      if (!email || !password) {
        msg.textContent = "Email et mot de passe requis";
        return;
      }

      const { error } =
        await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        msg.textContent = "Email ou mot de passe incorrect";
        return;
      }

      await afterAuthSuccess(email);
    };

    // ---------------- SIGNUP ----------------
    document.getElementById("pg-signup").onclick = async () => {
      const email = document.getElementById("pg-email").value.trim();
      const password = document.getElementById("pg-password").value;

      if (!email || !password) {
        msg.textContent = "Email et mot de passe requis";
        return;
      }

      const { error } =
        await supabase.auth.signUp({ email, password });

      if (error) {
        msg.textContent = error.message;
        return;
      }

      await afterAuthSuccess(email);
    };

    // ---------------- RESET PASSWORD (ANTI-SPAM) ----------------
    document.getElementById("pg-forgot").onclick = async () => {
      if (resetCooldown) {
        msg.textContent = "Merci d’attendre avant de réessayer";
        return;
      }

      const email = document.getElementById("pg-email").value.trim();
      if (!email) {
        msg.textContent = "Entre ton email";
        return;
      }

      resetCooldown = true;
      msg.textContent = "📩 Si cet email existe, un message va être envoyé";

      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + "/reset-password.html"
        });
      } catch {
        // silence volontaire (anti-enum)
      }

      setTimeout(() => {
        resetCooldown = false;
        msg.textContent = "";
      }, 60_000); // 1 minute
    };
  }

  // ------------------------------
  // INIT LICENCE (BOOT)
  // ------------------------------
  async function initLicence() {
    const local = getLocalUser();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    const email = user?.email || local?.email;

    if (!email) {
      window.PARFECT_LICENCE_OK = false;
      window.PARFECT_USER = null;
      window.userLicence = null;
      return;
    }

    const remote = await readLicenceFromNocoDB(email);

    const licenceUser = remote
      ? {
          email,
          licence: remote[NOCODB_FIELDS.LICENCE] || "free",
          synced: true
        }
      : {
          email,
          licence: "free",
          synced: false
        };

    saveUser(licenceUser);

    window.PARFECT_USER = licenceUser;
    window.userLicence = licenceUser;
    window.PARFECT_LICENCE_OK = licenceUser.licence !== "expired";
console.log("REMOTE FROM NOCODB", remote);

    console.log("✅ Licence boot", licenceUser);
  }

// ================================
// SWING QUOTA — CORE
// ================================

function canAnalyzeSwing() {
  // Accès libre → toujours OK
  if (window.PARFECT_FLAGS?.OPEN_ACCESS) return true;

  const u = window.userLicence;
  if (!u) return false;

  // PRO → toujours OK (pour l’instant)
  if (u.licence === "pro") return true;

  // FREE → quota max = 15
  const used = Number(u.swing_quota_used || 0);
  return used < 15;
}

function incrementSwingQuota(count = 1) {
  if (window.PARFECT_FLAGS?.OPEN_ACCESS) return;

  const u = window.userLicence;
  if (!u || u.licence === "pro") return;

  u.swing_quota_used = Number(u.swing_quota_used || 0) + count;

  // Persist local
  localStorage.setItem("parfect_user", JSON.stringify(u));

  // 🔁 Sync NocoDB (best effort, non bloquant)
  try {
    fetch(window.NOCODB_REFERENCES_URL, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "xc-token": window.NOCODB_TOKEN
      },
      body: JSON.stringify({
        swing_quota_used: u.swing_quota_used
      })
    });
  } catch {}
}

  
  // ------------------------------
  // LOGOUT
  // ------------------------------
  async function logoutParfect() {
    await supabase.auth.signOut();
    clearUser();

    window.PARFECT_LICENCE_OK = false;
    window.PARFECT_USER = null;
    window.userLicence = null;

    location.reload();
  }

  // ------------------------------
  // PUBLIC API
  // ------------------------------
  window.initLicence = initLicence;
  window.showAuthModal = showAuthModal;
  window.logoutParfect = logoutParfect;

})();
