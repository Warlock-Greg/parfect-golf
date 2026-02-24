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
    startStripeCheckout();
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
    const left = Math.max(0, max - used);

    el.innerHTML = `
      <strong>${used}</strong> / ${max}
      <span class="pg-muted"> (${left} restants)</span>
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
  bindHistoryPanelActions();

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

function bindHistoryPanelActions() {
  const panel = document.getElementById("history-panel");
  if (!panel || panel.dataset.bound === "1") return;
  panel.dataset.bound = "1";

  panel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-swing-id]");
    if (!btn) return;

    const swingId = btn.dataset.swingId;
    console.log("🎬 Revoir swing", swingId);

    // appelle ta fonction existante
    if (typeof replaySwingFromNocoDB === "function") {
      replaySwingFromNocoDB(swingId);
    } else {
      console.warn("⚠️ replaySwingFromNocoDB introuvable");
    }
  });
}

function buildTrainingCard(t) {
  const date = new Date(t.created_at).toLocaleDateString();

  return `
    <div class="pg-card">
      <strong>${t.exercise_name}</strong><br>
      🎯 ${t.type}<br>
      📈 ${t.quality}<br>
      🧠 Mental ${t.mental_score}/5<br>
      <small>${date}</small>
    </div>
  `;
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
    ? swings.map((s, i) =>
        buildSocialSwingItem(s, swings.length - i)
      ).join("")
    : `<p class="pg-muted">Aucun swing enregistré.</p>`;

  // 🔥 BIND REPLAY BUTTONS
  panel.querySelectorAll(".pg-btn-replay").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.swingId;
      console.log("🎬 Replay swing id:", id);
      await replaySwingFromNocoDB({ id });
    });
  });

  return;
}

 if (type === "training") {

  let trainings = [];

  // 🔹 1️⃣ Essai NocoDB
  if (window.NOCODB_TRAININGS_URL && window.NOCODB_TOKEN) {
    try {
      const res = await fetch(window.NOCODB_TRAININGS_URL, {
        headers: { "xc-token": window.NOCODB_TOKEN }
      });

      if (res.ok) {
        const data = await res.json();
        const list = data.list || [];

        const email = window.userLicence?.email;
        trainings = list
          .filter(t => t.player_email === email)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

    } catch (e) {
      console.warn("Training NocoDB load error", e);
    }
  }

  // 🔹 2️⃣ Fallback local si vide
  if (!trainings.length) {
    const local = JSON.parse(localStorage.getItem("trainingHistory") || "[]");
    trainings = local.reverse().map(h => ({
      exercise_name: h.name,
      quality: h.quality,
      mental_score: h.mentalScore,
      created_at: h.date
    }));
  }

  // 🔹 3️⃣ Render
  panel.innerHTML = trainings.length
    ? trainings.map(t => {
        const date = new Date(t.created_at).toLocaleDateString();
        return `
          <div class="pg-card">
            <strong>${t.exercise_name}</strong><br>
            ${t.quality} · Mental ${t.mental_score}/5<br>
            <small>${date}</small>
          </div>
        `;
      }).join("")
    : `<p class="pg-muted">Aucune séance enregistrée.</p>`;

  return;
}

  if (type === "round") {
  const rounds = await loadRoundsFromNocoDB();

  panel.innerHTML = rounds.length
    ? rounds.map(buildRoundCard).join("")
    : `<p class="pg-muted">Aucune partie enregistrée.</p>`;
}
}

// ------------------------------------------------
// NOCODB — LOAD ROUNDS
// ------------------------------------------------

async function loadRoundsFromNocoDB() {
  const email = window.userLicence?.email;
  if (!email) return [];

  try {
    const res = await fetch(window.NOCODB_ROUNDS_URL, {
      headers: { "xc-token": window.NOCODB_TOKEN }
    });

    if (!res.ok) {
      console.error("NocoDB fetch failed", res.status);
      return [];
    }

    const data = await res.json();
    const list = data.list || data.records || [];

    return list
      .filter(r => r.player_email === email)
      .sort((a, b) => {
        const da = new Date(a.date_played || 0);
        const db = new Date(b.date_played || 0);
        return db - da;
      });

  } catch (err) {
    console.error("loadRoundsFromNocoDB error", err);
    return [];
  }
}

function buildRoundCard(round) {
  const golfName = round.golf_name ?? "Parcours";
  const score = round.total_vs_par ?? 0;
  const parfects = round.parfects ?? 0;

  const mental =
    typeof round.mental_score === "number"
      ? `${round.mental_score}/5`
      : "—/5";

  const dateObj = round.date_played
    ? new Date(round.date_played)
    : null;

  const dateLabel =
    dateObj && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString()
      : "—";

  return `
    <div class="pg-card">
      <strong>${golfName}</strong><br>
      Score ${score > 0 ? "+" : ""}${score}
      · ${parfects} Parfects<br>
      Mental ${mental}<br>
      <small>${dateLabel}</small>
    </div>
  `;
}

// ------------------------------------------------
// NOCODB — LOAD SWINGS
// ------------------------------------------------
async function loadSwingHistoryFromNocoDB() {
  const email = window.userLicence?.email;
  if (!email) {
    console.warn("🚫 User email not found, cannot load swing history.");
    return [];
  }

 
  // The 'where' clause filters records by email, 'sort' orders by creation date descending, and 'limit' restricts to 20 records.
  const url =
    `${window.NOCODB_SWINGS_URL}?` +
    `where=(cy88wsoi5b8bq9s,eq,${encodeURIComponent(email)})` +
    `&sort=-CreatedAt&limit=20`;

  console.log("📊 Loading swing history from:", url);

  try {
    const res = await fetch(url, {
      headers: { "xc-token": window.NOCODB_TOKEN }
    });

    if (!res.ok) {
      // Log more details in case of a non-OK response
      console.error(
        `❌ NocoDB DATA fetch failed: Status ${res.status} - ${res.statusText}`,
        await res.text() // Attempt to read response body for more context
      );
      return [];
    }

    const data = await res.json();

    // NocoDB API typically returns data in a 'list' property
    return data.list || [];
  } catch (error) {
    console.error(" gravely❌ Error fetching swing history from NocoDB:", error);
    return [];
  }
}

function buildSocialSwingItem(swing, index) {
  const id = swing?.Id || swing?.id;
  const club = swing?.club ?? "Club ?";
  const view = swing?.view ?? "?";
  const score = swing?.scores?.total ?? swing?.total_score ?? "—";
  const dateRaw = swing?.created_at ?? swing?.date ?? null;

  const dateObj = dateRaw ? new Date(dateRaw) : null;
  const dateLabel =
    dateObj && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString()
      : "—";

  return `
    <div class="pg-card">
      <div style="display:flex;justify-content:space-between;">
        <strong>#${index}</strong>
        <span style="opacity:.6;">${dateLabel}</span>
      </div>

      <div style="margin-top:6px;">
        ${club} · ${view}
      </div>

      <div style="margin-top:6px;font-weight:600;">
        Score ${score}
      </div>

      <button 
        class="pg-btn-replay" 
        data-swing-id="${id}"
        style="
          margin-top:10px;
          padding:6px 14px;
          border-radius:999px;
          border:none;
          background:#4ade80;
          color:#111;
          cursor:pointer;
        ">
        ▶️ Replay
      </button>
    </div>
  `;
}

// ------------------------------------------------
// 🎬 REPLAY SWING FROM NOCODB (SOCIAL) — VERSION SAFE
// ------------------------------------------------
async function replaySwingFromNocoDB(swingOrId) {
  try {
    const id =
      typeof swingOrId === "object"
        ? (swingOrId?.Id ?? swingOrId?.id)
        : swingOrId;

    if (!id) {
      console.error("❌ Missing swing id", swingOrId);
      return;
    }

    const URL = window.NOCODB_SWINGS_URL;   // ex: https://app.nocodb.com/api/v2/tables/XXXX/records
    const TOKEN = window.NOCODB_TOKEN;

    if (!URL || !TOKEN) {
      console.error("❌ Missing NocoDB config (URL/TOKEN)");
      return;
    }

    // ✅ endpoint record v2 tables
    const res = await fetch(`${URL}/${id}`, {
      headers: { "xc-token": TOKEN }
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Fetch swing failed ${res.status} ${txt}`);
    }

    const record = await res.json();

    // ✅ swing_json peut être string OU object
    const raw = record.swing_json;

    if (!raw) {
      console.warn("⚠️ Aucun swing_json dans ce record", record);
      return;
    }

    const parsed =
      typeof raw === "string"
        ? JSON.parse(raw)
        : raw; // déjà un objet

    // 🔁 Reconstruit frames -> pose[33]
    const frames =
      parsed.frames?.map(f =>
        (f.landmarks || []).map(l => ({
          x: l.x, y: l.y, z: l.z ?? null, visibility: l.visibility ?? null
        }))
      ) || [];

    const timestamps =
      parsed.frames?.map(f => f.timestamp ?? null) || [];

    // ⚠️ ton dump met meta.keyframes = { address: idx, top: idx, ... } (des index)
    // ton replay attend souvent keyFrames.{address:{index}, ...}
    const kfRaw = parsed.meta?.keyframes || {};
    const keyFrames = Object.fromEntries(
      Object.entries(kfRaw).map(([k, idx]) => [k, { index: idx }])
    );

    const reconstructedSwing = {
      frames,
      timestamps,
      keyFrames,
      club: record.club,
      viewType: record.view || record.view_type || "faceOn",
      fps: record.fps || 30
    };

    console.log("🎬 Replay reconstructed swing:", reconstructedSwing);

    // 🔥 Passe en mode JustSwing
    document.body.classList.add("jsw-fullscreen");
    document.getElementById("just-swing-area")?.style.setProperty("display", "block");

    window.JustSwing?.stopSession?.();

    // ✅ Appelle ton système existant
    if (typeof window.replaySwingFromHistory === "function") {
      window.replaySwingFromHistory(reconstructedSwing);
    } else if (typeof window.handleSwingComplete === "function") {
      window.handleSwingComplete(reconstructedSwing);
    } else {
      console.warn("⚠️ Aucun handler replay trouvé (replaySwingFromHistory / handleSwingComplete)");
    }

  } catch (err) {
    console.error("❌ Replay error:", err);
  }
}

// ======================================
// STRIPE CHECKOUT — PASSER PRO
// ======================================

async function startStripeCheckout() {
  const email = window.userLicence?.email;

  if (!email) {
    window.showCoachToast?.(
      "Connecte-toi pour passer PRO",
      "#ff4444"
    );
    return;
  }

  try {
    const res = await fetch(
      "https://jsisebmdjihfmelyymon.supabase.co/functions/v1/create-checkout",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error(data);
      window.showCoachToast?.(
        "Erreur lors du paiement",
        "#ff4444"
      );
    }
  } catch (err) {
    console.error(err);
    window.showCoachToast?.(
      "Erreur réseau",
      "#ff4444"
    );
  }
}

// Expose si besoin
window.startStripeCheckout = startStripeCheckout;


// ------------------------------------------------
// EXPORT
// ------------------------------------------------
window.injectSocialUI = injectSocialUI;
window.refreshSwingQuotaUI = refreshSwingQuotaUI;
