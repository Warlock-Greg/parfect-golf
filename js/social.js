// === SOCIAL.JS — Account / Social Hub (CLEAN) ===
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
    container.style.cssText = `
      padding:16px;
      background:#111;
      border:1px solid #222;
      border-radius:12px;
      max-width:520px;
      margin:16px auto;
      color:#fff;
    `;
    parent.appendChild(container);
  }

  const user = getCurrentUser();

  // --------------------------------------------
  // NO ACCOUNT
  // --------------------------------------------
  if (!user || !user.email) {
    container.innerHTML = `
      <h2 style="color:#00ff99;">👤 Mon compte</h2>
      <p style="color:#ccc;">Tu n’as pas encore de compte Parfect.</p>
      <button id="create-account-btn" class="btn">
        Créer mon compte
      </button>
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
    <h2 style="color:#00ff99;margin-top:0;">👤 Mon compte</h2>

    <p style="color:#ccc;font-size:0.9rem;">
      Email : <strong>${user.email}</strong><br>
      Licence : <strong>${isPro ? "PRO" : "FREE"}</strong>
    </p>

    ${
      !isPro
        ? `
      <div style="background:#000;border:1px solid #333;border-radius:8px;padding:10px;margin:10px 0;">
        <p style="font-size:0.85rem;color:#ccc;margin:0;">
          Swings aujourd’hui : <strong id="swing-quota">—</strong>
        </p>
        <button id="upgrade-btn" class="btn" style="margin-top:8px;">
          🚀 Passer Pro
        </button>
      </div>
      `
        : `
      <p style="color:#00ff99;font-size:0.9rem;">
        🎉 Accès illimité activé
      </p>
      `
    }

    <hr style="border-color:#222;margin:16px 0;">

    <h3 style="color:#00ff99;">👥 Communauté</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="invite-friend-btn" class="btn">Inviter un ami</button>
      <button id="show-history-btn" class="btn">📚 Historique</button>
    </div>

    <div id="social-content" style="margin-top:16px;"></div>
  `;

  $$("invite-friend-btn")?.addEventListener("click", handleInviteFriend);
  $$("show-history-btn")?.addEventListener("click", showHistoryTabs);
  $$("upgrade-btn")?.addEventListener("click", () => {
    window.showCoachToast?.("Paiement bientôt disponible 💚", "#00ff99");
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
    <h3 style="color:#00ff99;">Invite un ami</h3>
    <p style="color:#ccc;">Partage ton voyage Parfect.golfr.</p>
    <div style="margin-top:8px;">
      <input id="friend-name" type="text" placeholder="Nom de ton ami"
        style="padding:6px;border-radius:6px;border:1px solid #333;background:#000;color:#fff;width:70%;">
      <button id="send-invite-btn" class="btn" style="margin-left:8px;">Envoyer</button>
    </div>
    <div id="invite-feedback" style="margin-top:8px;font-size:0.9rem;"></div>
  `;

  $$("send-invite-btn")?.addEventListener("click", () => {
    const name = $$("friend-name")?.value?.trim();
    const fb = $$("invite-feedback");
    if (!fb) return;

    if (name) {
      fb.style.color = "#00ff99";
      fb.innerHTML = `✅ Invitation envoyée à <b>${name}</b>`;
    } else {
      fb.style.color = "#f55";
      fb.textContent = "⚠️ Entre un nom valide.";
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
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="btn" data-tab="swing">🎥 Swings</button>
      <button class="btn" data-tab="training">🧠 Training</button>
      <button class="btn" data-tab="round">🏌️ Parties</button>
    </div>
    <div id="history-panel"></div>
  `;

  content.querySelectorAll("button[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      loadHistoryTab(btn.dataset.tab);
    });
  });

  loadHistoryTab("swing");
}

// ------------------------------------------------
// LOAD HISTORY
// ------------------------------------------------
async function loadHistoryTab(type) {
  const panel = $$("history-panel");
  if (!panel) return;

  // -----------------------
  // 🎥 SWINGS (NocoDB)
  // -----------------------
  if (type === "swing") {
    const swings = await loadSwingHistoryFromNocoDB();

    if (!swings.length) {
      panel.innerHTML = `<p style="color:#777;">Aucun swing enregistré.</p>`;
      return;
    }

    panel.innerHTML = swings.map(s => `
      <div class="card">
        🎥 <strong>${s.club || "?"}</strong>
        — Score ${s.score_total ?? "—"}<br>
        <small>
          ${
            s.cmbvp0anzpjfsig
              ? new Date(s[cmbvp0anzpjfsig]).toLocaleString()
              : "Date inconnue"
          }
        </small>
      </div>
    `).join("");

    return;
  }

  // -----------------------
  // 🧠 TRAINING (local)
  // -----------------------
  if (type === "training") {
    const history = JSON.parse(
      localStorage.getItem("trainingHistory") || "[]"
    );

    if (!history.length) {
      panel.innerHTML = `<p style="color:#777;">Aucune séance d’entraînement.</p>`;
      return;
    }

    panel.innerHTML = history
      .slice()
      .reverse()
      .map(h => `
        <div class="card">
          🧠 <strong>${h.name || "Training"}</strong><br>
          ${h.quality || "—"} · Mental ${h.mentalScore ?? "—"}/5<br>
          <small>${new Date(h.date).toLocaleDateString()}</small>
        </div>
      `)
      .join("");

    return;
  }

  // -----------------------
  // 🏌️ PARTIES (local)
  // -----------------------
  if (type === "round") {
    const rounds = JSON.parse(
      localStorage.getItem("roundHistory") || "[]"
    );

    if (!rounds.length) {
      panel.innerHTML = `<p style="color:#777;">Aucune partie enregistrée.</p>`;
      return;
    }

    panel.innerHTML = rounds
      .slice()
      .reverse()
      .map(r => `
        <div class="card">
          🏌️ <strong>${r.golf || "Parcours"}</strong><br>
          Score ${r.totalVsPar > 0 ? "+" : ""}${r.totalVsPar}
          · 💚 ${r.parfects ?? 0} Parfects<br>
          <small>${new Date(r.date).toLocaleDateString()}</small>
        </div>
      `)
      .join("");

    return;
  }

  panel.innerHTML = `<p style="color:#777;">Historique indisponible.</p>`;
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
    `&sort=-cmbvp0anzpjfsig` +   // ✅ ID du champ DateTime
    `&limit=20`;

  console.log("📊 NocoDB FETCH URL =", url);

  const res = await fetch(url, {
    headers: { "xc-token": window.NOCODB_TOKEN }
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("❌ NocoDB history error", txt);
    return [];
  }

  const data = await res.json();
  return data.list || [];
}


// ------------------------------------------------
// EXPORT
// ------------------------------------------------
window.injectSocialUI = injectSocialUI;
window.refreshSwingQuotaUI = refreshSwingQuotaUI;
