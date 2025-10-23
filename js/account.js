// === Parfect.golfr - account.js (MVP) ===
const GOOGLE_API_URL = "https://script.google.com/macros/s/TON_ID/exec"; // ← remplace ici

const $ = (id) => document.getElementById(id);

function hashPass(p) {
  return btoa(p).split("").reverse().join(""); // hash ultra-light MVP
}

// --- Connexion / inscription ---
$("login-btn")?.addEventListener("click", async () => {
  const email = $("email").value.trim();
  const pass = $("password").value.trim();
  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", data: { email, pass_hash: hashPass(pass) } })
  }).then(r => r.json());

  if (res.success) {
    localStorage.setItem("user", JSON.stringify({ email, ...res }));
    showCoachToast(`Welcome back ${res.pseudo} 💚`, "#00ff99");
  } else showCoachToast(res.error, "#ff5555");
});

$("register-btn")?.addEventListener("click", async () => {
  const email = $("email").value.trim();
  const pseudo = $("pseudo").value.trim();
  const pass = $("password").value.trim();
  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "register", data: { email, pseudo, pass_hash: hashPass(pass) } })
  }).then(r => r.json());
  if (res.success) {
    localStorage.setItem("user", JSON.stringify({ email, pseudo, ...res }));
    showCoachToast("Compte créé 💚 Freemium activé 30 j", "#00ff99");
  } else showCoachToast(res.error, "#ff5555");
});

// --- Code promo ---
$("apply-promo")?.addEventListener("click", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const code = $("promo-code").value.trim();
  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "promo", data: { email: user.email, code } })
  }).then(r => r.json());
  if (res.success) {
    user.licence = res.licence;
    user.licence_expiry = res.licence_expiry;
    localStorage.setItem("user", JSON.stringify(user));
    showCoachToast(`Licence ${res.licence} jusqu’au ${res.licence_expiry}`, "#00ff99");
  } else showCoachToast(res.error, "#ff5555");
});

// --- Amis ---
$("add-friend")?.addEventListener("click", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const friend = $("friend-email").value.trim();
  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addFriend", data: { user: user.email, friend } })
  }).then(r => r.json());
  showCoachToast(res.message || "Ami ajouté 💚", "#00ff99");
  loadFriends();
});

async function loadFriends() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getFriends", data: { user: user.email } })
  }).then(r => r.json());
  const ul = $("friends-list");
  if (!ul) return;
  ul.innerHTML = res.friends?.map(f => `<li>${f.email}</li>`).join("") || "";
}

