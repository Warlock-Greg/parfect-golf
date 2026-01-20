// === SOCIAL.JS — Account / Social Hub (ZEN 2026) ===
console.log("👥 Parfect.golfr Social.js chargé");

// ------------------------------------------------
// Utils
// ------------------------------------------------
if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

function getCurrentUser() {
  return window.userLicence || {};
}

// ------------------------------------------------
// MAIN UI
// ------------------------------------------------
function injectSocialUI() {
  const parent = $$("friends-area");
  if (!parent) return;

  let container = $$("social-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "social-container";
    container.className = "pg-social-container";
    parent.appendChild(container);
  }

  const user = getCurrentUser();

  // --------------------------------------------
  // NO ACCOUNT
  // --------------------------------------------
  if (!user || !user.email) {
    container.innerHTML = `
      <div class="pg-card">
        <h2 class="pg-title">Mon compte</h2>
        <p class="pg-muted">Tu n’as pas encore de compte Parfect.</p>
        <button id="create-account-btn" class="pg-btn-primary">
          Créer mon compte
        </button>
      </div>
    `;

    $$("create-account-btn")?.addEventListener("click", () => {
      window.showEmailModal?.();
    });

    return;
  }

  const isPro = user.licence === "pro";

  // --------------------------------------------
  // ACCOUNT UI
  // --------------------------------------------
  container.innerHTML = `
    <div class="pg-card">
      <h2 class="pg-title">Mon compte</h2>

      <p class="pg-muted">
        Email : <strong>${user.email}</strong><br>
        Licence : <strong>${isPro ? "PRO" : "FREE"}</strong>
      </p>

      ${
        !isPro
          ? `
        <div class="pg-card pg-card-soft">
          <p class="pg-muted">
            Swings aujourd’hui :
            <strong id="swing-quota">—</strong>
          </p>
          <button id="upgrade-btn" class="pg-btn-secondary">
            Passer Pro
          </button>
        </div>
        `
          : `
        <p class="pg-highlight">
          Accès illimité activé
        </p>
        `
      }
    </div>

    <div class="pg-card">
      <h3 class="pg-subtitle">Communauté</h3>

      <div class="pg-actions-row">
        <button id="invite-friend-btn" class="pg-btn-secondary">
          Inviter un ami
        </button>
        <button id="show-history-btn" class="pg-btn-secondary">
          Historique
        </button>
      </div>

      <div id="social-content" class="pg-social-content"></div>
    </div>
  `;

  $$("invite-friend-btn")?.addEventListener("click", handleInviteFriend);
  $$("show-history-btn")?.addEventListener("click", showHistoryTabs);
  $$("upgrade-btn")?.addEventListener("click", () => {
    window.showCoachToast?.("Paiement bientôt disponible", "#D4AF37");
  });

  refreshSwingQuotaUI();
}

// ------------------------------------------------
// QUOTA UI
// ------------------------------------------------
window.refreshSwingQuotaUI = async function () {
  const el = document.getElementById("swing-quota");
  if (!el) return;

  const email = window.userLicence?.email;
  if (!email) {
    el.textContent = "—";
    return;
  }

  try {
    const count = await window.getTodaySwingCount(email);
    el.textContent = `${count}/10`;
  } catch (e) {
    console.error("❌ Quota refresh error", e);
    el.textContent = "—";
  }
};

// ------------------------------------------------
// INVITE FRIEND
// ------------------------------------------------
function handleInviteFriend() {
  const content = $$("social-content");
  if (!content) return;

  content.innerHTML = `
    <div class="pg-section">
      <h4 class="pg-subtitle">Inviter un ami</h4>
      <p class="pg-muted">Partage ton voyage Parfect.golfr.</p>

      <div class="pg-inline-form">
        <input
          id="friend-name"
          type="text"
          class="pg-input"
          placeholder="Nom de ton ami"
        />
        <button id="send-invite-btn" class="pg-btn-primary">
          Envoyer
        </button>
      </div>

      <div id="invite-feedback" class="pg-feedback"></div>
    </div>
  `;

  $$("send-invite-btn")?.addEventListener("click", () => {
    const name = $$("friend-name")?.value?.trim();
    const fb = $$("invite-feedback");
    if (!fb) return;

    if (name) {
      fb.className = "pg-feedback success";
      fb.innerHTML = `Invitation envoyée à <strong>${name}</strong>`;
    } else {
      fb.className = "pg-feedback error";
      fb.textContent = "Entre un nom valide.";
    }
  });
}

// ------------------------------------------------
// HISTORY TABS
// ------------------------------------------------
function showHistoryTabs() {
  const content = $$("social-content");
  if (!content) return;

  content.innerHTML = `
    <div class="pg-tabs">
      <button class="pg-tab-btn" data-tab="swing">Swings</button>
      <button class="pg-tab-btn" data-tab="training">Training</button>
      <button class="pg-tab-btn" data-tab="round">Parties</button>
    </div>

    <div id="history-panel" class="pg-history-panel"></div>
  `;

  content.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      content.querySelectorAll(".pg-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadHistoryTab(btn.dataset.tab);
    });
  });

  content.querySelector("[data-tab='swing']")?.classList.add("active");
  loadHistoryTab("swing");
}

// ------------------------------------------------
// LOAD HISTORY (UNCHANGED LOGIC)
// ------------------------------------------------
async function loadHistoryTab(type) {
  const panel = $$("history-panel");
  if (!panel) return;

  if (type === "swing") {
    const swings = await loadSwingHistoryFromNocoDB();
    panel.innerHTML = swings.length
      ? swings.map(s => `
        <div class="pg-card">
          <strong>${s.club || "?"}</strong><br>
          Score ${s.scor

