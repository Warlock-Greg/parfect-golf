// =====================================================
// Parfect.golfr — licence.js (Email-based MVP)
// =====================================================

(() => {
  // ------------------------------
  // Config
  // ------------------------------
  const LS_USER_KEY = "parfect_user";

  // Champs NocoDB (API names EXACTS)
  const NOCODB_FIELDS = {
    EMAIL: "cf6385mi1wk7jim",
    LICENCE: "crkm9s61zfuyjqg",
    SOURCE: "source"
  };

  // ------------------------------
  // Helpers
  // ------------------------------
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(LS_USER_KEY));
    } catch {
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  }

  // ------------------------------
  // Modal : Create account (email)
  // ------------------------------
  function showEmailModal() {
    if (document.getElementById("parfect-email-modal")) return;

    const modal = document.createElement("div");
    modal.id = "parfect-email-modal";
    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.85);
      display:flex;
      align-items:center;
      justify-content:center;
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
        <h3 style="color:#00ff99;margin-top:0;">
          🎯 Crée ton compte Parfect
        </h3>

        <p style="color:#ccc;font-size:.9rem;margin-bottom:12px;">
          Accès gratuit à JustSwing<br>
          <span style="color:#777;font-size:.8rem;">
            (aucun mot de passe requis)
          </span>
        </p>

        <input
          id="pg-email"
          type="email"
          placeholder="email@email.com"
          autocomplete="email"
          style="
            width:100%;
            padding:10px;
            border-radius:8px;
            border:none;
            margin-bottom:12px;
            background:#000;
            color:#fff;
          "
        >

        <button
          id="pg-submit"
          style="
            width:100%;
            padding:10px;
            border-radius:8px;
            background:#00ff99;
            border:none;
            font-weight:bold;
            cursor:pointer;
          "
        >
          Créer mon compte & commencer
        </button>

        <p style="margin-top:10px;font-size:.75rem;color:#666;">
          Tu pourras passer Pro à tout moment.
        </p>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("pg-submit").onclick = async () => {
      const email = document
        .getElementById("pg-email")
        .value.trim();

      if (!email || !email.includes("@")) {
        alert("Merci d’entrer un email valide");
        return;
      }

      // 1️⃣ Sauvegarde locale immédiate
      saveUser({
        email,
        licence: "free",
        created_at: Date.now()
      });

      // 2️⃣ Sync NocoDB (payload plat, sans fields)
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
            [NOCODB_FIELDS.SOURCE]: "modal-create-account"
          })
        });
      } catch (e) {
        console.warn("⚠️ NocoDB unreachable (offline OK)");
      }

      // 3️⃣ Reload licence + autorisation
      await initLicence();

      // 🔑 ÉTAPE A — notifier l’app que la licence est OK
      window.dispatchEvent(new Event("parfect:licence:activated"));

      if (window.injectSocialUI) {
          window.injectSocialUI();
      }


      modal.remove();
      showCoachToast(
        "Compte créé 💚 Licence Free activée",
        "#00ff99"
      );
    };
  }

  // ------------------------------
  // Read licence from NocoDB
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


// =====================================================
// Add to Home Screen — Parfect.golfr (MVP)
// =====================================================

(function () {
  const LS_KEY = "parfect_add_to_home_shown";

  function isMobile() {
    return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
  }

  function isInStandaloneMode() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function showAddToHomeModal() {
    if (document.getElementById("parfect-a2hs-modal")) return;

    const modal = document.createElement("div");
    modal.id = "parfect-a2hs-modal";
    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.85);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:18000;
    `;

    modal.innerHTML = `
      <div style="
        background:#111;
        padding:22px;
        border-radius:16px;
        width:320px;
        text-align:center;
        box-shadow:0 0 0 1px #222;
      ">
        <h3 style="color:#00ff99;margin-top:0;">
          📲 Ajouter à l’écran d’accueil
        </h3>

        ${
          isIOS()
            ? `
          <p style="color:#ccc;font-size:.9rem;">
            Pour installer <strong>Parfect.golfr</strong> :
          </p>
          <ol style="color:#aaa;font-size:.85rem;text-align:left;padding-left:18px;">
            <li>Appuie sur <strong>Partager</strong> ⬆️</li>
            <li>Sélectionne <strong>Sur l’écran d’accueil</strong></li>
          </ol>
          `
            : `
          <p style="color:#ccc;font-size:.9rem;">
            Ajoute <strong>Parfect.golfr</strong> à ton écran d’accueil
            pour un accès rapide.
          </p>
          `
        }

        <button id="a2hs-close" class="btn"
          style="margin-top:14px;width:100%;">
          Plus tard
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("a2hs-close").onclick = () => {
      localStorage.setItem(LS_KEY, "1");
      modal.remove();
    };
  }

  function maybeShowAddToHome() {
    if (!isMobile()) return;
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(LS_KEY)) return;

    // Petit délai pour ne pas agresser l’utilisateur
    setTimeout(showAddToHomeModal, 2000);
  }

  // Auto au chargement
  document.addEventListener("DOMContentLoaded", maybeShowAddToHome);

})();

  
  // ------------------------------
  // Public init (BOOT)
  // ------------------------------
  async function initLicence() {
    const local = getUser();

    if (!local || !local.email) {
      window.PARFECT_LICENCE_OK = false;
      window.PARFECT_USER = null;
      return;
    }

    const remote = await readLicenceFromNocoDB(local.email);

    const user = remote
      ? {
          email: local.email,
          licence: remote[NOCODB_FIELDS.LICENCE] || "free",
          licence_expiry: remote.licence_expiry || null,
          synced: true
        }
      : {
          ...local,
          synced: false
        };

    saveUser(user);
    window.PARFECT_USER = user;
    window.PARFECT_LICENCE_OK = user.licence !== "expired";

    // ✅ LIGNE MANQUANTE — SOURCE DE VÉRITÉ
    window.userLicence = user;

    console.log("✅ Licence boot", user);
  }

  // ------------------------------
  // Expose API
  // ------------------------------
  window.initLicence = initLicence;
  window.showEmailModal = showEmailModal;
})();
