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

function safeJSON(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getRecordId(r) {
  // NocoDB retourne souvent "Id" (majuscule) dans /records
  return r?.Id ?? r?.id ?? r?.ID ?? null;
}

function formatDate(dateRaw) {
  const d = dateRaw ? new Date(dateRaw) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : "—";
}

function isProUser(user) {
  return user?.licence === "pro";
}

function extractSwingData(swing) {
  const parsed =
    typeof swing?.swing_json === "string"
      ? safeJSON(swing.swing_json)
      : swing?.swing_json || {};

  const total =
    parsed?.total ??
    parsed?.scores?.total ??
    swing?.total_score ??
    "—";

  const breakdown = parsed?.breakdown || {};
  const scores = parsed?.scores || {};

  const metrics = parsed?.metrics || {};

  const club = (swing?.club || "??").toUpperCase();

  const viewRaw =
    metrics?.viewType ||
    swing?.view ||
    swing?.view_type ||
    "faceOn";

  const view =
    viewRaw === "dtl" ? "DTL" :
    viewRaw === "faceOn" ? "FACE" :
    viewRaw?.toUpperCase() || "FACE";

  return {
    total,
    breakdown,
    scores,
    club,
    view,
    email: swing?.player_email || swing?.email || "unknown",
    createdAt: swing?.CreatedAt || swing?.created_at || swing?.date
  };
}


// ------------------------------------------------
// Data Layer (mini “data service” inline)
// ------------------------------------------------
const SocialAPI = {
  get token() {
    return window.NOCODB_TOKEN;
  },

  get swingsUrl() {
    return window.NOCODB_SWINGS_URL;
  },

  get roundsUrl() {
    return window.NOCODB_ROUNDS_URL;
  },

  get trainingsUrl() {
    return window.NOCODB_TRAININGS_URL;
  },


  async fetchJSON(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
    }
    return res.json();
  },


  async loadSwingsByEmail(email, limit = 20) {
    if (!email || !this.swingsUrl || !this.token) return [];

    // IMPORTANT: tes colonnes NocoDB.
    // Tu utilises "cy88wsoi5b8bq9s" comme colonne email.
    // Tu utilises "CreatedAt" (ou created_at). On garde ton choix.
    const url =
      `${this.swingsUrl}?` +
      `where=(cy88wsoi5b8bq9s,eq,${encodeURIComponent(email)})` +
      `&sort=-CreatedAt&limit=${limit}`;

    try {
      const data = await this.fetchJSON(url, {
        headers: { "xc-token": this.token }
      });
      return data.list || [];
    } catch (err) {
      console.error("❌ loadSwingsByEmail error", err);
      return [];
    }
  },

  async loadSwingById(id) {
    if (!id || !this.swingsUrl || !this.token) return null;

    // endpoint record v2 tables
    const url = `${this.swingsUrl}/${id}`;

    try {
      return await this.fetchJSON(url, {
        headers: { "xc-token": this.token }
      });
    } catch (err) {
      console.error("❌ loadSwingById error", err);
      return null;
    }
  },

  async loadRoundsByEmail(email) {
  if (!email) return [];

  // 1) NocoDB si dispo
  if (this.roundsUrl && this.token) {
    try {
      // ✅ IMPORTANT : filtre directement côté NocoDB (mieux que tout récupérer)
    const url =
      `${this.roundsUrl}?` +
      `where=(player_email,eq,${encodeURIComponent(email)})` +
      `&sort=-CreatedAt&limit=50&fields=*`;

      const data = await this.fetchJSON(url, {
        headers: { "xc-token": this.token }
      });

      return data.list || [];
    } catch (err) {
      console.warn("⚠️ loadRoundsByEmail NocoDB failed, fallback local", err);
    }
  }
    return [];
  },



 async loadTrainingsByEmail(email) {
    if (!email || !this.trainingsUrl || !this.token) return [];

    try {
      const url =
        `${this.trainingsUrl}?` +
        `where=(player_email,eq,${encodeURIComponent(email)})` +
        `&sort=-CreatedAt&limit=20`;

      const data = await this.fetchJSON(url, {
        headers: { "xc-token": this.token }
      });

      return data.list || [];
    } catch (err) {
      console.warn("⚠️ loadTrainingsByEmail failed", err);
      return [];
    }
  }

};


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

  // NO ACCOUNT
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
    $$("create-account-btn")?.addEventListener("click", () => window.showAuthModal?.());
    return;
  }

  const pro = isProUser(user);

  container.innerHTML = `
    <div class="pg-card">
      <h2 class="pg-title">Mon compte</h2>

      <p class="pg-muted">
        Email : <strong>${user.email}</strong><br>
        Licence : <strong>${pro ? "PRO" : "FREE"}</strong>
      </p>

      ${
        !pro
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
          : `<p class="pg-highlight">Accès illimité activé</p>`
      }

      <button class="pg-btn-secondary" onclick="logoutParfect()">
        🚪 Se déconnecter
      </button>
    </div>

  <div class="pg-card pg-community-card">

      <div class="pg-card-header">
        <h3 class="pg-subtitle">Communauté</h3>
      </div>

      <div id="community-summary" class="pg-community-summary">
        <div id="latest-swing"></div>
        <div id="latest-round"></div>
        <div id="latest-training"></div>
      </div>

      <div class="pg-community-links">
        <button data-view="swings" class="pg-btn-secondary">Voir tous les swings</button>
        <button data-view="round" class="pg-btn-secondary">Voir toutes les parties</button>
        <button data-view="training" class="pg-btn-secondary">Voir tous les entraînements</button>
      </div>

    </div>
  `;

  attachCommunityEvents(container);

  loadCommunitySummary(); // 🔥 chargement auto

  $$("invite-friend-btn")?.addEventListener("click", handleInviteFriend);
  $$("show-history-btn")?.addEventListener("click", showHistoryTabs);
  $$("upgrade-btn")?.addEventListener("click", () => window.startStripeCheckout?.());

  // load quota + current tab
  setTimeout(() => window.refreshSocialData?.(), 100);
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

async function loadCommunitySummary() {
  const email = window.userLicence?.email;
  if (!email) return;

  const api = window.api; // adapte si besoin

  try {
    const [swings, rounds, trainings] = await Promise.all([
      SocialAPI.loadSwingsByEmail(email, 1),
      SocialAPI.loadRoundsByEmail(email),
      SocialAPI.loadTrainingsByEmail(email)
    ]);

    if (swings?.length) {
      document.getElementById("latest-swing").innerHTML = `
        <h4 class="pg-section-title">Dernier Swing</h4>
        ${buildSocialSwingItem(swings[0], 1)}
      `;
    }

    if (rounds?.length) {
      document.getElementById("latest-round").innerHTML = `
        <h4 class="pg-section-title">Dernière Partie</h4>
        ${buildRoundCard(rounds[0])}
      `;
    }
    console.log("ROUNDS:", rounds);
console.log("SWINGS FULL", swings);
    if (trainings?.length) {
      document.getElementById("latest-training").innerHTML = `
        <h4 class="pg-section-title">Dernier Entraînement</h4>
        ${buildTrainingCard(trainings[0])}
      `;
    }

  } catch (err) {
    console.error("❌ loadCommunitySummary error", err);
  }
}

function attachCommunityEvents(container) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view]");
    if (!btn) return;

    const view = btn.dataset.view;

    if (view === "swings") loadHistoryTab("swings");
    if (view === "rounds") loadHistoryTab("rounds");
    if (view === "trainings") loadHistoryTab("trainings");
  });
}

// ------------------------------------------------
// COACH COMMENT — FEED V1
// ------------------------------------------------
function buildCoachFeedComment(scores) {
  const breakdown = scores?.breakdown || {};

  const PRIORITY = ["tempo", "rotation", "triangle", "weightShift", "extension", "balance"];
  const LABELS = {
    tempo: "Tempo à réguler",
    rotation: "Rotation à engager",
    triangle: "Triangle bras/épaules à stabiliser",
    weightShift: "Transfert d’appui à améliorer",
    extension: "Extension après impact",
    balance: "Équilibre en finish"
  };

  const weak = PRIORITY.find((k) => {
    const s = breakdown[k]?.score;
    return typeof s === "number" && s < 15;
  });

  return weak ? `🎯 Priorité : ${LABELS[weak]}` : "🔥 Swing solide, fondamentaux en place";
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
    fb.innerHTML = name ? `Invitation envoyée à <strong>${name}</strong>` : "Entre un nom valide.";
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

  bindHistoryTabs(content);
  bindHistoryPanelActions(); // 1 seule fois (delegation)

  content.querySelector("[data-tab='feed']")?.classList.add("active");
  loadHistoryTab("feed");
}

function bindHistoryTabs(rootEl) {
  rootEl.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      rootEl.querySelectorAll(".pg-tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadHistoryTab(btn.dataset.tab);
    });
  });
}

function bindHistoryPanelActions() {
  const panel = document.getElementById("history-panel");
  if (!panel || panel.dataset.bound === "1") return;
  panel.dataset.bound = "1";

  panel.addEventListener("click", async (e) => {
    const replayBtn = e.target.closest(".pg-btn-replay,[data-action='replay']");
    if (replayBtn) {
      const swingId = replayBtn.dataset.swingId;
      console.log("🎬 Replay swing id:", swingId);
      await replaySwingFromNocoDB(swingId);
      return;
    }

    const feedBtn = e.target.closest(".pg-feed-action");
    if (feedBtn) {
      const swingId = feedBtn.dataset.swingId;
      console.log("🎬 Feed replay swing id:", swingId);
      await replaySwingFromNocoDB(swingId);
      return;
    }
  });
}

// ------------------------------------------------
// UI cards
// ------------------------------------------------
function buildCommunityFeedCard(swing) {
  const id = getRecordId(swing);
  const data = extractSwingData(swing);

  const mini = (k, max) =>
    typeof data.breakdown[k]?.score === "number"
      ? `${data.breakdown[k].score}/${max}`
      : "—";

  const time = data.createdAt
    ? new Date(data.createdAt).toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  return `
    <div class="pg-feed-card">

      <div class="pg-feed-header">
        <span class="pg-feed-user">${data.email}</span>
        <span class="pg-feed-time">${time}</span>
      </div>

      <div class="pg-feed-meta">
        ${data.club} · ${data.view}
      </div>

      <div class="pg-feed-score">
        <span class="pg-feed-score-value">${data.total}</span>
        <span class="pg-feed-score-label">Score Parfect</span>
      </div>

      <div class="pg-feed-metrics">
        <span>🎯 ${mini("rotation", 20)}</span>
        <span>⏱️ ${mini("tempo", 20)}</span>
        <span>🔺 ${mini("triangle", 20)}</span>
        <span>⚖️ ${mini("balance", 10)}</span>
      </div>

      <button class="pg-feed-action" data-swing-id="${id}">
        Revoir le swing →
      </button>

    </div>
  `;
}

function buildSocialSwingItem(swing, index) {
  const id = getRecordId(swing);

  const parsed = swing?.scores || {};
  const breakdown = parsed?.breakdown || {};
  const total = parsed?.total ?? "—";

  const club = (swing?.club || "?").toUpperCase();

  const view =
    swing?.view === "dtl"
      ? "DTL"
      : swing?.view === "faceOn"
      ? "FACE"
      : "FACE";

  const dateLabel = formatDate(swing?.CreatedAt);

  const mini = (k) =>
    typeof breakdown?.[k]?.score === "number"
      ? `${breakdown[k].score}/20`
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

      <div style="margin-top:6px;font-weight:700;font-size:20px;">
        ${total} Score
      </div>

      <div style="
        margin-top:10px;
        font-size:13px;
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap:6px;
        opacity:.85;
      ">
        <div>🔄 Rotation : ${mini("rotation")}</div>
        <div>⏱ Tempo : ${mini("tempo")}</div>
        <div>🔺 Triangle : ${mini("triangle")}</div>
        <div>⚖️ WeightShift : ${mini("weightShift")}</div>
        <div>📏 Extension : ${mini("extension")}</div>
        <div>🧘 Balance : ${mini("balance")}</div>
        <div>📐 Plan : ${mini("plan")}</div>
      </div>

      <button class="pg-btn-replay" data-swing-id="${id}"
        style="margin-top:12px;padding:6px 14px;border-radius:999px;border:none;background:var(--pg-green-main,#4ade80);color:#111;cursor:pointer;">
        ▶️ Replay
      </button>
    </div>
  `;
}

function buildRoundCard(round) {
  const golfName = round.golf_name ?? "Parcours";

  const score = round.total_vs_par ?? 0;
  const totalScore = round.total_score ?? "—";
  const parfects = round.parfects ?? 0;

  const fairways = round.fairways_hit ?? "—";
  const gir = round.greens_in_reg ?? "—";
  const putts = round.putts ?? "—";

  const mental =
    typeof round.mental_score === "number"
      ? `${round.mental_score}/5`
      : "—/5";

  const dateLabel = round.CreatedAt
    ? new Date(round.CreatedAt).toLocaleDateString()
    : "";

  return `
    <div class="pg-card">

      <div style="font-weight:700;font-size:16px;">
        ${golfName}
      </div>
       <div style="margin-top:10px;font-size:12px;opacity:.5;">
        ${dateLabel}
      </div>

      <div style="margin-top:6px;font-size:15px;">
        Score ${score > 0 ? "+" : ""}${score}
        · ${parfects} Parfects
      </div>

      <div style="
        margin-top:12px;
        font-size:13px;
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap:8px;
        opacity:.9;
      ">

        <div>🏌️ Score vs par : <strong>${totalScore}</strong></div>
        <div>🎯 Fairways : <strong>${fairways}</strong></div>
        <div>🟢 GIR : <strong>${gir}</strong></div>
        <div>⛳ Putts : <strong>${putts}</strong></div>
        <div>⭐ Parfects : <strong>${parfects}</strong></div>
        <div>🧠 Mental : <strong>${mental}</strong></div>

      </div>

     

    </div>
  `;
}

function buildTrainingCard(training) {
  const name = training.exercise_name ?? "Entraînement";
  const quality = training.quality ?? "—";
  const mental = training.mental_score ?? "—";

  const dateLabel =
    training.CreatedAt && !isNaN(new Date(training.CreatedAt))
      ? formatDate(training.CreatedAt)
      : "—";

  return `
    <div class="pg-card">
      <strong>${name}</strong><br>
      ${quality} · Mental ${mental}/5<br>
      <small>${dateLabel}</small>
    </div>
  `;
}

// ------------------------------------------------
// LOAD HISTORY
// ------------------------------------------------
async function loadHistoryTab(type) {
  const panel = $$("history-panel");
  if (!panel) return;

  const email = window.userLicence?.email;

  if (type === "feed") {
    const swings = await SocialAPI.loadSwingsByEmail(email, 20);
    panel.innerHTML = swings.length
      ? swings.map(buildCommunityFeedCard).join("")
      : `<p class="pg-muted">Aucune activité récente.</p>`;
    return;
  }

  if (type === "swings") {
    const swings = await SocialAPI.loadSwingsByEmail(email, 20);
    panel.innerHTML = swings.length
      ? swings.map((s, i) => buildSocialSwingItem(s, swings.length - i)).join("")
      : `<p class="pg-muted">Aucun swing enregistré.</p>`;
    return;
  }

 if (type === "training") {
  const trainings = await SocialAPI.loadTrainingsByEmail(email);

  panel.innerHTML = trainings.length
    ? trainings.map((t) => {

        const name = t.exercise_name || "Séance";
        const quality = t.quality || "—";
        const mental = t.mental_score ?? "—";

        const dateLabel =
          t.CreatedAt && !isNaN(new Date(t.CreatedAt))
            ? formatDate(t.CreatedAt)
            : "—";

        return `
          <div class="pg-card">
            <strong>${name}</strong><br>
            ${quality} · Mental ${mental}/5<br>
            <small>${dateLabel}</small>
          </div>
        `;
      }).join("")
    : `<p class="pg-muted">Aucune séance enregistrée.</p>`;

  return;
}

  if (type === "round") {
    const rounds = await SocialAPI.loadRoundsByEmail(email);
    panel.innerHTML = rounds.length
      ? rounds.map(buildRoundCard).join("")
      : `<p class="pg-muted">Aucune partie enregistrée.</p>`;
    return;
  }
}

// ------------------------------------------------
// 🎬 REPLAY SWING FROM NOCODB (SOCIAL) — STABLE
// ------------------------------------------------
async function replaySwingFromNocoDB(swingOrId) {
  try {
    const id =
      typeof swingOrId === "object" ? getRecordId(swingOrId) : swingOrId;

    if (!id) {
      console.error("❌ Missing swing id", swingOrId);
      return;
    }

    const record = await SocialAPI.loadSwingById(id);
    if (!record) return;

    // IMPORTANT:
    // - ton champ peut s'appeler swing_json OU swing (json)
    // - et peut être string OU object
    const raw =
      record.swing_json ??
      record.swing ??
      record.swingDump ??
      record.swing_dump ??
      null;

    const parsed = safeJSON(raw);

    if (!parsed) {
      console.warn("⚠️ Champ swing introuvable / non JSON", { id, raw });
      return;
    }

    // parsed attendu: { meta:{...}, frames:[{timestamp, landmarks:[{x,y,z,...}]}] }
    const frames =
      parsed.frames?.map((f) =>
        (f.landmarks || []).map((l) => ({
          x: l.x,
          y: l.y,
          z: l.z ?? null,
          visibility: l.visibility ?? null
        }))
      ) || [];

    const timestamps = parsed.frames?.map((f) => f.timestamp ?? null) || [];

    // Ton dump met meta.keyframes = { address: idx, top: idx, ... }
    // ton replay attend keyFrames.{address:{index}, ...}
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

    // stop live session si existant
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

// ------------------------------------------------
// Stripe Checkout — Passer Pro
// ------------------------------------------------
async function startStripeCheckout() {
  const email = window.userLicence?.email;

  if (!email) {
    window.showCoachToast?.("Connecte-toi pour passer PRO", "#ff4444");
    return;
  }

  try {
    const res = await fetch(
      "https://jsisebmdjihfmelyymon.supabase.co/functions/v1/create-checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }
    );

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error(data);
      window.showCoachToast?.("Erreur lors du paiement", "#ff4444");
    }
  } catch (err) {
    console.error(err);
    window.showCoachToast?.("Erreur réseau", "#ff4444");
  }
}

window.startStripeCheckout = startStripeCheckout;

// ------------------------------------------------
// EXPORT
// ------------------------------------------------
window.injectSocialUI = injectSocialUI;
window.refreshSwingQuotaUI = window.refreshSwingQuotaUI;
window.replaySwingFromNocoDB = replaySwingFromNocoDB;
