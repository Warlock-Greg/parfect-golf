// === Parfect.golfr - social.js (MVP) ===
const SOCIAL_REFRESH_MS = 120000;
const $$ = (id) => document.getElementById(id);

async function checkSocialUpdates() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email) return;
  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getParfects", data: { to_user: user.email } })
  }).then(r => r.json()).catch(() => ({ parfects: [] }));

  const lastCheck = localStorage.getItem("lastSocialCheck") || "1970-01-01";
  const newOnes = res.parfects?.filter(p => new Date(p.created_at) > new Date(lastCheck)) || [];
  if (newOnes.length > 0) {
    $$("friend-badge").style.display = "inline-block";
    $$("friend-badge").textContent = newOnes.length;
    localStorage.setItem("lastSocialCheck", new Date().toISOString());
    localStorage.setItem("pendingParfects", JSON.stringify(newOnes));
  }
}

setInterval(checkSocialUpdates, SOCIAL_REFRESH_MS);

$$("friends-btn")?.addEventListener("click", () => {
  const feed = $$("friends-feed");
  const newOnes = JSON.parse(localStorage.getItem("pendingParfects") || "[]");
  feed.innerHTML = newOnes.length
    ? newOnes.map(p => `
        <div class="parfect-card" style="margin:8px 0;padding:10px;border:1px solid #222;border-radius:8px;">
          <strong>$${p.from_user}</strong> t’a envoyé un Parfect 💚<br>
          <small>$${new Date(p.created_at).toLocaleString()}</small>
        </div>`).join("")
    : "<p>Aucune nouveauté 💚</p>";
  $$("friend-badge").style.display = "none";
  showPage("friends");
});

