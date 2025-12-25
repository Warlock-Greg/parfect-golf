// === SOCIAL.JS — Account / Social Hub (MVP) ===
console.log("👥 Parfect.golfr Social.js chargé");

if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

function getUser() {
  return JSON.parse(localStorage.getItem("parfect_user") || "{}");
}

function getSwingUsage() {
  return JSON.parse(localStorage.getItem("swing_usage") || "{}");
}

// --- UI principale ---
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

  const user = getUser();
if (!user || !user.email) {
  container.innerHTML = `
    <h2 style="color:#00ff99;">👤 Mon compte</h2>
    <p style="color:#ccc;">
      Tu n’as pas encore de compte Parfect.
    </p>
    <button id="create-account-btn" class="btn">
      Créer mon compte
    </button>
  `;

  document
    .getElementById("create-account-btn")
    ?.addEventListener("click", () => {
      if (window.showEmailModal) {
        window.showEmailModal();
      }
    });

  return;
}


  
  const usage = getSwingUsage();
  const isPro = user.licence === "pro";

  container.innerHTML = `
    <h2 style="color:#00ff99;margin-top:0;">👤 Mon compte</h2>

    <p style="color:#ccc;font-size:0.9rem;">
      Email : <strong>${user.email || "Invité"}</strong><br>
      Licence : <strong>${isPro ? "PRO" : "FREE"}</strong>
    </p>

    ${
      !isPro
        ? `
      <div style="background:#000;border:1px solid #333;border-radius:8px;padding:10px;margin:10px 0;">
        <p style="font-size:0.85rem;color:#ccc;margin:0;">
          Swings aujourd’hui : <strong>${usage.count || 0}/10</strong>
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
    showCoachToast("Paiement bientôt disponible 💚", "#00ff99");
  });
}


// --- Gestion de l'invitation ---
function handleInviteFriend() {
  console.log("📨 Invitation d’un ami...");

  const content = $$("social-content");
  if (!content) return;

  content.innerHTML = `
    <h3 style="color:#00ff99;">Invite un ami</h3>
    <p style="color:#ccc;">Partage ton voyage Parfect.golfr avec quelqu’un.</p>
    <div style="margin-top:8px;">
      <input id="friend-name" type="text" placeholder="Nom de ton ami" 
        style="padding:6px;border-radius:6px;border:1px solid #333;background:#000;color:#fff;width:70%;">
      <button id="send-invite-btn" class="btn" style="margin-left:8px;">Envoyer</button>
    </div>
    <div id="invite-feedback" style="margin-top:8px;font-size:0.9rem;"></div>
  `;

  const sendBtn = $$("send-invite-btn");
  sendBtn?.addEventListener("click", () => {
    const friend = $$("friend-name")?.value?.trim();
    const feedback = $$("invite-feedback");
    if (friend) {
      feedback.style.color = "#00ff99";
      feedback.innerHTML = `✅ Invitation virtuelle envoyée à <b>${friend}</b> !`;
    } else {
      feedback.style.color = "#f55";
      feedback.textContent = "⚠️ Entre un nom avant d’envoyer.";
    }
  });
}

// --- Affiche le leaderboard ---
function showLeaderboard() {
  console.log("🏆 Affichage du leaderboard");

  const content = $$("social-content");
  if (!content) return;

  const mockLeaderboard = [
    { name: "Gauthier", index: 10 },
    { name: "Laurent", index: 12 },
    { name: "Dorothée", index: 12 },
    { name: "Greg", index: 14 }
  ];

  const rows = mockLeaderboard
    .map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.index}</td></tr>`)
    .join("");

  content.innerHTML = `
    <h3 style="color:#00ff99;">🏆 Leaderboard</h3>
    <p style="color:#ccc;font-size:0.9rem;">Un aperçu fictif de la communauté Parfect (MVP).</p>
    <table style="width:100%;color:#fff;border-collapse:collapse;margin-top:8px;font-size:0.9rem;">
      <thead>
        <tr style="color:#00ff99;text-align:left;border-bottom:1px solid #333;">
          <th style="padding:4px;">#</th>
          <th style="padding:4px;">Nom</th>
          <th style="padding:4px;">Index</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}


function showHistoryTabs() {
  const content = document.getElementById("social-content");
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

async function loadHistoryTab(type) {
  const panel = document.getElementById("history-panel");
  if (!panel) return;

  const records = await window.HistoryHub.getByType(type);
  if (!records.length) {
    panel.innerHTML = `<p style="color:#777;">Aucun historique disponible.</p>`;
    return;
  }

  panel.innerHTML = records.map(r => {
    if (r.type === "swing") {
      return `
        <div class="card">
          🎥 <strong>${r.club || "?"}</strong> — Score ${r.score}<br>
          <small>${new Date(r.date).toLocaleString()}</small>
        </div>
      `;
    }

    if (r.type === "training") {
      return `
        <div class="card">
          🧠 <strong>${r.name}</strong> — ${r.quality}<br>
          Mental ${r.mentalScore}/5 · Coach ${r.coach}
        </div>
      `;
    }

    if (r.type === "round") {
      return `
        <div class="card">
          🏌️ <strong>${r.golf}</strong><br>
          Score ${r.totalVsPar > 0 ? "+" : ""}${r.totalVsPar} · 💚 ${r.parfects} Parfects
        </div>
      `;
    }
  }).join("");
}



// --- Historique d'entraînement ---
function showTrainingHistory() {
  console.log("📚 Affichage de l'historique training");

  const content = $$("social-content");
  if (!content) return;

  const history = JSON.parse(localStorage.getItem("trainingHistory") || "[]");

  if (!history.length) {
    content.innerHTML = `
      <h3 style="color:#00ff99;">📚 Historique training</h3>
      <p style="color:#ccc;">Tu n’as pas encore enregistré de séance d’entraînement.</p>
      <p style="color:#777;font-size:0.9rem;">Va dans l’onglet <strong>Training</strong> pour lancer un exercice et le valider.</p>
    `;
    return;
  }

  // Agrégation par type
  const byType = {};
  history.forEach((h) => {
    const type = h.type || "autre";
    if (!byType[type]) {
      byType[type] = {
        count: 0,
        success: 0,
        medium: 0,
        hard: 0
      };
    }
    byType[type].count += 1;
    if (h.quality === "success") byType[type].success += 1;
    else if (h.quality === "medium") byType[type].medium += 1;
    else if (h.quality === "hard") byType[type].hard += 1;
  });

  const totalSessions = history.length;
  const lastCoach = history[history.length - 1]?.coach || localStorage.getItem("coach") || "—";

  const typeCards = Object.entries(byType)
    .map(([type, stats]) => {
      const label =
        type.charAt(0).toUpperCase() + type.slice(1);

      return `
        <div style="background:#111;border:1px solid #333;border-radius:10px;padding:10px 12px;margin-top:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:#00ff99;">${label}</strong>
            <span style="font-size:0.85rem;color:#ccc;">${stats.count} séance${stats.count>1?"s":""}</span>
          </div>
          <div style="margin-top:4px;font-size:0.85rem;color:#ddd;">
            ✅ Réussi : ${stats.success} · 😌 Moyen : ${stats.medium} · 😵 Difficile : ${stats.hard}
          </div>
        </div>
      `;
    })
    .join("");

  // Dernières séances détaillées (limité à 5)
  const lastSessions = [...history]
    .slice(-5)
    .reverse()
    .map((h) => {
      const date = new Date(h.date).toLocaleDateString();
      const qualityLabel =
        h.quality === "success"
          ? "✅ Réussi"
          : h.quality === "medium"
          ? "😌 Moyen"
          : "😵 Difficile";

      return `
        <div style="border-bottom:1px solid #222;padding:6px 0;">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
            <span style="color:#fff;">${h.name}</span>
            <span style="color:#777;">${date}</span>
          </div>
          <div style="font-size:0.8rem;color:#ccc;">
            ${qualityLabel} · 🧠 ${h.mentalScore}/5 · Coach : ${h.coach}
          </div>
        </div>
      `;
    })
    .join("");

  content.innerHTML = `
    <h3 style="color:#00ff99;">📚 Historique training</h3>
    <p style="color:#ccc;font-size:0.9rem;">
      Total : <strong>${totalSessions}</strong> séance${totalSessions>1?"s":""} · Coach principal : <strong>${lastCoach}</strong>
    </p>

    <div style="margin-top:10px;">
      <h4 style="color:#00ff99;font-size:1rem;margin-bottom:4px;">📊 Répartition par type</h4>
      ${typeCards}
    </div>

    <div style="margin-top:14px;">
      <h4 style="color:#00ff99;font-size:1rem;margin-bottom:4px;">🕒 Dernières séances</h4>
      <div style="background:#111;border:1px solid #333;border-radius:10px;padding:8px 10px;max-height:220px;overflow-y:auto;">
        ${lastSessions}
      </div>
    </div>
  `;
}

// --- Expose globalement ---
window.injectSocialUI = injectSocialUI;
