// === SOCIAL.JS — version corrigée ===

// Helper DOM local (ne redéfinit pas $)
//const $$ = (id) => document.getElementById(id);

// --- Conteneur principal ---
function injectSocialUI() {
  console.log("👥 Chargement de l'interface sociale...");

  // Cible la vraie zone Social
  const parent = $$("friends-area");
  if (!parent) {
    console.warn("⚠️ Zone friends-area introuvable dans index.html");
    return;
  }

  // Cherche ou crée un conteneur interne
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
    container.style.maxWidth = "500px";
    parent.appendChild(container); // ✅ injecté dans friends-area
  }

  // Contenu principal
  container.innerHTML = `
    <h2 style="color:#00ff99;">👥 Communauté Parfect</h2>
    <p>Connecte-toi avec d'autres golfeurs, partage tes scores et tes routines.</p>
    <div style="margin-top:16px;">
      <button id="invite-friend-btn" class="btn">Inviter un ami</button>
      <button id="show-leaderboard-btn" class="btn" style="margin-left:8px;">Leaderboard</button>
    </div>
    <div id="social-content" style="margin-top:20px;"></div>
  `;

  // Boutons d’action
  const inviteBtn = $$("invite-friend-btn");
  const leaderboardBtn = $$("show-leaderboard-btn");

  inviteBtn?.addEventListener("click", handleInviteFriend);
  leaderboardBtn?.addEventListener("click", showLeaderboard);
}

// --- Gestion de l'invitation ---
function handleInviteFriend() {
  console.log("📨 Invitation d’un ami...");

  const content = $$("social-content");
  if (!content) return;

  content.innerHTML = `
    <h3>Invite un ami</h3>
    <input id="friend-name" type="text" placeholder="Nom de ton ami" style="padding:6px;border-radius:6px;border:1px solid #333;background:#000;color:#fff;">
    <button id="send-invite-btn" class="btn" style="margin-left:8px;">Envoyer</button>
  `;

  const sendBtn = $$("send-invite-btn");
  sendBtn?.addEventListener("click", () => {
    const friend = $$("friend-name")?.value?.trim();
    if (friend) {
      content.innerHTML = `<p>✅ Invitation envoyée à <b>${friend}</b> !</p>`;
    } else {
      content.innerHTML += `<p style="color:#f55;">⚠️ Entre un nom avant d’envoyer.</p>`;
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
    { name: "Alex", index: 14 },
  ];

  const rows = mockLeaderboard
    .map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.index}</td></tr>`)
    .join("");

  content.innerHTML = `
    <h3>🏆 Leaderboard</h3>
    <table style="width:100%;color:#fff;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr style="color:#00ff99;text-align:left;">
          <th>#</th><th>Nom</th><th>Index</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// --- Expose globalement ---
window.injectSocialUI = injectSocialUI;

