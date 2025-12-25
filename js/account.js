// === Parfect.golfr — account.js (NocoDB MVP) ===

// ------------------------------
// Config & helpers
// ------------------------------
const LS_USER_KEY = "parfect_user";
const $ = (id) => document.getElementById(id);

// Champs NocoDB (API names EXACTS)
const NC_FIELDS = {
  EMAIL: "cfc0gyzcv7y9h2j",
  LICENCE: "crkm9s61zfuyjqg",
  SOURCE: "source"
};

// ------------------------------
// Boot : lecture licence
// ------------------------------
async function loadLicenceFromNocoDB(email) {
  try {
    const res = await fetch(
      window.NC_URL + `?where=(${NC_FIELDS.EMAIL},eq,${email})`,
      { headers: { "xc-token": window.NC_TOKEN } }
    ).then(r => r.json());

    const record = res.list?.[0];
    if (!record) return null;

    return {
      email,
      licence: record[NC_FIELDS.LICENCE] || "free",
      licence_expiry: record.licence_expiry || null
    };

  } catch (e) {
    console.warn("⚠️ Licence read failed (offline)");
    return null;
  }
}

window.initAccountAndLicence = async function () {
  const local = JSON.parse(localStorage.getItem(LS_USER_KEY) || "{}");

  if (!local.email) {
    window.PARFECT_USER = null;
    window.PARFECT_LICENCE_OK = false;
    console.log("👤 Mode invité");
    return;
  }

  const remote = await loadLicenceFromNocoDB(local.email);

  const user = remote
    ? { ...local, ...remote, synced: true }
    : { ...local, synced: false };

  localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  window.PARFECT_USER = user;
  window.PARFECT_LICENCE_OK = user.licence !== "expired";

  console.log("✅ User boot", user);
};

// ------------------------------
// Login SIMPLE (email only)
// ------------------------------
$("login-btn")?.addEventListener("click", async () => {
  const email = $("email")?.value.trim();
  if (!email || !email.includes("@")) {
    alert("Email invalide");
    return;
  }

  // cache local immédiat
  localStorage.setItem(
    LS_USER_KEY,
    JSON.stringify({ email, licence: "free" })
  );

  // sync NocoDB (anti-doublon géré côté table)
  fetch(window.NC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xc-token": window.NC_TOKEN
    },
    body: JSON.stringify({
      [NC_FIELDS.EMAIL]: email,
      [NC_FIELDS.LICENCE]: "free",
      [NC_FIELDS.SOURCE]: "account-login"
    })
  });

  await initAccountAndLicence();
  showCoachToast(`Bienvenue 💚`, "#00ff99");
});

// ------------------------------
// Code promo (TEMP — backend existant)
// ------------------------------
$("apply-promo")?.addEventListener("click", async () => {
  const user = JSON.parse(localStorage.getItem(LS_USER_KEY) || "{}");
  const code = $("promo-code")?.value.trim();
  if (!user.email || !code) return;

  // ⚠️ backend promo conservé temporairement
  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "promo",
      data: { email: user.email, code }
    })
  }).then(r => r.json());

  if (res.success) {
    user.licence = res.licence;
    user.licence_expiry = res.licence_expiry;
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
    window.PARFECT_LICENCE_OK = true;

    showCoachToast(
      `Licence ${res.licence} jusqu’au ${res.licence_expiry}`,
      "#00ff99"
    );
  } else {
    showCoachToast(res.error, "#ff5555");
  }
});

// ------------------------------
// Friends (TEMP — backend existant)
// ------------------------------
$("add-friend")?.addEventListener("click", async () => {
  const user = JSON.parse(localStorage.getItem(LS_USER_KEY) || "{}");
  const friend = $("friend-email")?.value.trim();
  if (!user.email || !friend) return;

  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addFriend",
      data: { user: user.email, friend }
    })
  }).then(r => r.json());

  showCoachToast(res.message || "Ami ajouté 💚", "#00ff99");
  loadFriends();
});

async function loadFriends() {
  const user = JSON.parse(localStorage.getItem(LS_USER_KEY) || "{}");
  if (!user.email) return;

  const res = await fetch(GOOGLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "getFriends",
      data: { user: user.email }
    })
  }).then(r => r.json());

  const ul = $("friends-list");
  if (!ul) return;
  ul.innerHTML =
    res.friends?.map(f => `<li>${f.email}</li>`).join("") || "";
}
