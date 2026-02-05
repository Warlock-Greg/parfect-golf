// === SOCIAL.JS — Account / Social Hub (Parfect ZEN 2026) ===
console.log("👥 Parfect.golfr Social.js chargé");

// ------------------------------------------------
// Utils
// ------------------------------------------------
if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

function getCurrentUser() {
  return window.userLicence || null;
}

// ------------------------------------------------
// 🔄 REFRESH GLOBAL SOCIAL DATA (SOURCE UNIQUE)
// ------------------------------------------------
window.refreshSocialData = async function () {
  console.log("🔄 Refresh Social Data");

  if (typeof window.refreshSwingQuotaUI === "function") {
    await window.refreshSwingQuotaUI();
  }

  const activeTab = document.querySelector(".pg-tab-btn.active");
  if (activeTab) {
    loadHistoryTab(activeTab.dataset.tab);
  }
};

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
      window.showAuthModal?.();
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
        <p class="pg-highlight">Accès illimité activé</p>
        `
      }

      <button class="pg-btn-secondary" onclick="logoutParfect()">
        🚪 Se déconnecter
      </button>
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

  setTimeout(() => {
    window.refreshSocialData?.();
  }, 100);
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
    const used = await window.getTodaySwingCount(email);
    const max = 10;

    el.innerHTML = `
      <span class="pg-quota-count">${used}</span>
      <span class="pg-quota-sep">/</span>
      <span class="pg-quota-max">${max}</span>
    `;
  } catch (err) {
    console.error("❌ Swing quota error", err);
    el.textContent = "—";
  }
};

// ------------------------------------------------
// COACH COMMENT — FEED V1
// ------------------------------------------------
function buildCoachFeedComment(scores) {
  const breakdown = scores?.breakdown || {};

  const PRIORITY = [
    "tempo",
    "rotation",
    "triangle",
    "weightShift",
    "extension",
    "balance"
  ];

  const LABELS = {
    tempo: "Tempo à réguler",
    rotation: "Rotation à engager",
    triangle: "Triangle bras/épaules à stabiliser",
    weightShift: "Transfert d’appui à améliorer",
    extension: "Extension après impact",
    balance: "Équilibre en finish"
  };

  const weak = PRIORITY.find(k => {
    const s = breakdown[k]?.score;
    return typeof s === "number" && s < 15;
  });

  return weak
    ? `🎯 Priorité : ${LABELS[weak]}`
    : "🔥 Swing solide, fondamentaux en place";
}

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
        <input id="friend-name" class="pg-input" placeholder="Nom de ton ami" />
        <button id="send-invite-btn" class="pg-btn-primary">Envoyer</button>
      </div>

      <div id="invite-feedback" class="pg-feedback"></div>
    </div>
  `;

  $$("send-invite-btn")?.addEventListener("click", () => {
    const name = $$("friend-name")?.value?.trim();
    const fb = $$("invite-feedback");
    if (!fb) return;

    fb.className = name ? "pg-feedback success" : "pg-feedback error";
    fb.innerHTML = name
      ? `Invitation envoyée à <strong>${name}</strong>`
      : "Entre un nom valide.";
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
      <button class="pg-tab-btn" data-tab="feed">Communauté</button>
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

  content.querySelector("[data-tab='feed']")?.classList.add("active");
  loadHistoryTab("feed");
}

// ------------------------------------------------
// COMMUNITY FEED CARD — V1
// ------------------------------------------------
function buildCommunityFeedCard(swing) {
  const scores = swing.scores || {};
  const breakdown = scores.breakdown || {};
  const total = scores.total ?? "—";

  const club = (swing.club || "?").toUpperCase();
  const view = (swing.view || swing.view_type || "faceOn").toLowerCase() === "dtl"
    ? "DTL"
    : "FACE";

  const time = swing.created_at
    ? new Date(swing.created_at).toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  const mini = (k, max) =>
    typeof breakdown[k]?.score === "number"
      ? `${breakdown[k].score}/${max}`
      : "—";

  return `
    <div class="pg-feed-card">
      <div class="pg-feed-header">
        <span class="pg-feed-pill">${club} · ${view}</span>
        <span class="pg-feed-time">${time}</span>
      </div>

      <div class="pg-feed-score">
        <span class="pg-feed-score-value">${total}</span>
        <span class="pg-feed-score-label">Score Parfect</span>
      </div>

      <div class="pg-feed-coach">
        ${buildCoachFeedComment(scores)}
      </div>

      <div class="pg-feed-metrics">
        <span>🎯 ${mini("rotation", 20)}</span>
        <span>⏱️ ${mini("tempo", 20)}</span>
        <span>🔺 ${mini("triangle", 20)}</span>
      </div>

      <button class="pg-feed-action" data-swing-id="${swing.id}">
        Revoir le swing →
      </button>
    </div>
  `;
}

// ------------------------------------------------
// LOAD HISTORY
// ------------------------------------------------
async function loadHistoryTab(type) {
  const panel = $$("history-panel");
  if (!panel) return;

  if (type === "feed") {
    const swings = await loadSwingHistoryFromNocoDB();
    panel.innerHTML = swings.length
      ? swings.map(buildCommunityFeedCard).join("")
      : `<p class="pg-muted">Aucune activité récente.</p>`;
    return;
  }

  if (type === "swing") {
    const swings = await loadSwingHistoryFromNocoDB();
    panel.innerHTML = swings.length
      ? swings.map((s, i) => buildSocialSwingItem(s, swings.length - i)).join("")
      : `<p class="pg-muted">Aucun swing enregistré.</p>`;
    return;
  }

  if (type === "training") {
    const history = JSON.parse(localStorage.getItem("trainingHistory") || "[]");
    panel.innerHTML = history.length
      ? history.reverse().map(h => `
        <div class="pg-card">
          <strong>${h.name}</strong><br>
          ${h.quality} · Mental ${h.mentalScore}/5<br>
          <small>${new Date(h.date).toLocaleDateString()}</small>
        </div>
      `).join("")
      : `<p class="pg-muted">Aucune séance enregistrée.</p>`;
    return;
  }

  if (type === "round") {
    const rounds = JSON.parse(localStorage.getItem("roundHistory") || "[]");
    panel.innerHTML = rounds.length
      ? rounds.reverse().map(r => `
        <div class="pg-card">
          <strong>${r.golf}</strong><br>
          Score ${r.totalVsPar > 0 ? "+" : ""}${r.totalVsPar}
          · ${r.parfects} Parfects<br>
          <small>${new Date(r.date).toLocaleDateString()}</small>
        </div>
      `).join("")
      : `<p class="pg-muted">Aucune partie enregistrée.</p>`;
  }
}

// ------------------------------------------------
// NOCODB — LOAD SWINGS
// ------------------------------------------------
async function loadSwingHistoryFromNocoDB() {
  const email = window.userLicence?.email;
  if (!email) return [];

  const url =
    `${window.NOCODB_SWINGS_URL}?` +
    `where=(cy88wsoi5b8bq9s,eq,${encodeURIComponent(email)})` +
    `&sort=-created_at&limit=20`;

  const res = await fetch(url, {
    headers: { "xc-token": window.NOCODB_TOKEN }
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.list || [];
}

// ------------------------------------------------
// EXPORT
// ------------------------------------------------
window.injectSocialUI = injectSocialUI;
window.refreshSwingQuotaUI = refreshSwingQuotaUI;
