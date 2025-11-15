// === SOCIAL.JS — version Friends + Training History ===
console.log("👥 Parfect.golfr Social.js chargé");

// Helper DOM (utilise le global s'il existe)
if (typeof window.$$ !== "function") {
  window.$$ = (id) => document.getElementById(id);
}

// --- Conteneur principal ---
function injectSocialUI() {
  console.log("👥 Chargement de l'interface sociale...");

  const parent = $$("friends-area");
  if (!parent) {
    console.warn("⚠️ Zone friends-area introuvable dans index.html");
    return;
  }

  let container = $$("social-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "social-container";
    container.style.padding = "16px";
    container.style.textAlign = "center";
    container.style.background = "#111";
    container.style.border = "1px solid #222";
    container.style.borderRadius = "12px";
    container.style.margin = "16px auto";
    container.style.maxWidth = "520px";
    parent.appendChild(container);
  }

  container.innerHTML = `
    <h2 style="color:#00ff99;margin-top:0;">👥 Communauté Parfect</h2>
    <p style="color:#ccc;">Partage tes scores, tes trainings et ton mindset.</p>

    <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
      <button id="invite-friend-btn" class="btn">Inviter un ami</button>
      <button id="show-leaderboard-btn" class="btn">Leaderboard</button>
      <button id="show-training-history-btn" class="btn">Historique training</button>
    </div>

    <div id="social-content" style="margin-top:20px;text-align:left;"></div>
  `;

  const inviteBtn = $$("invite-friend-btn");
  const leaderboardBtn = $$("show-leaderboard-btn");
  const trainingHistoryBtn = $$("show-training-history-btn");

  inviteBtn?.addEventListener("click", handleInviteFriend);
  leaderboardBtn?.addEventListener("click", showLeaderboard);
  trainingHistoryBtn?.addEventListener("click", showTrainingHistory);
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
    { name: "Greg", index: 10 },
    { name: "Camille", index: 12 },
    { name: "Alex", index: 14 }
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
