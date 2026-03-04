// ===============================
// 🧠 Reference Service - Parfect
// ===============================

(function () {

  const CACHE = {};

  function buildKey(type, club, camera, email = "") {
    return `${type}_${club}_${camera}_${email}`;
  }

  function headers() {
    return {
      "Content-Type": "application/json",
      "xc-token": window.NOCODB_TOKEN
    };
  }

  
async function fetchReference(whereObj) {

  const whereParam = encodeURIComponent(JSON.stringify(whereObj));

  const url =
    `${window.NOCODB_REFERENCES_URL}?where=${whereParam}&limit=1`;

  const res = await fetch(url, {
    headers: headers()
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("❌ NocoDB ERROR:", txt);
    return null;
  }

  const data = await res.json();

  return data?.list?.[0] || null;
}

  

  async function deactivateOld(type, club, camera, email = null) {
    let filter = `type,eq,${type}~and~club,eq,${club}~and~camera,eq,${camera}~and~is_active,eq,true`;

    if (type === "user") {
      filter += `~and~created_by,eq,${email}`;
    }

    const url = `${window.NOCODB_REFERENCES_URL}?where=${filter}`;
    const res = await fetch(url, { headers: headers() });
    const data = await res.json();

    if (!data?.list?.length) return;

    for (const ref of data.list) {
      await fetch(`${window.NOCODB_REFERENCES_URL}/${ref.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ is_active: false })
      });
    }
  }

 // ===============================
// 🔵 GET SYSTEM REFERENCE
// ===============================
window.getSystemReference = async function (club, camera) {

  const cacheKey = buildKey("system", club, camera);
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  const whereObj = {
    type: { eq: "system" },
    club: { eq: club },
    camera: { eq: camera },
    is_active: { eq: true }
  };

  const ref = await fetchReference(whereObj);

  if (!ref) return null;

  const parsed = JSON.parse(ref.reference_json);
  CACHE[cacheKey] = parsed;

  return parsed;
};


// ===============================
// 🟢 GET USER REFERENCE
// ===============================
window.getUserReference = async function (club, camera) {

  const email = window.userLicence?.email;
  if (!email) return null;

  const cacheKey = buildKey("user", club, camera, email);
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  const whereObj = {
    type: { eq: "user" },
    club: { eq: club },
    camera: { eq: camera },
    created_by: { eq: email },
    is_active: { eq: true }
  };

  const ref = await fetchReference(whereObj);

  if (!ref) return null;

  const parsed = JSON.parse(ref.reference_json);
  CACHE[cacheKey] = parsed;

  return parsed;
};

  // ===============================
  // 💾 SAVE USER REFERENCE
  // ===============================

  window.saveUserReference = async function (club, camera, targets) {

    const email = window.userLicence?.email;
    if (!email) throw new Error("Utilisateur non connecté");

    await deactivateOld("user", club, camera, email);

    const payload = {
      type: "user",
      club,
      camera,
      reference_json: JSON.stringify(targets),
      created_by: email,
      is_active: true,
      version: Date.now()
    };

    const res = await fetch(window.NOCODB_REFERENCES_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    // invalidate cache
    const cacheKey = buildKey("user", club, camera, email);
    delete CACHE[cacheKey];

    return data;
  };

  // ===============================
  // 👑 SAVE SYSTEM REFERENCE
  // ===============================

  window.saveSystemReference = async function (club, camera, targets) {

    if (!window.isAdmin?.()) {
      throw new Error("Accès admin requis");
    }

    await deactivateOld("system", club, camera);

    const payload = {
      type: "system",
      club,
      camera,
      reference_json: JSON.stringify(targets),
      created_by: window.userLicence?.email,
      is_active: true,
      version: Date.now()
    };

    const res = await fetch(window.NOCODB_REFERENCES_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    const cacheKey = buildKey("system", club, camera);
    delete CACHE[cacheKey];

    return data;
  };

  // ===============================
  // 🔄 GET REFERENCE SMART
  // ===============================

  window.getReferenceSmart = async function (mode, club, camera) {

    if (mode === "user") {
      const userRef = await window.getUserReference(club, camera);
      if (userRef) return userRef;
    }

    return await window.getSystemReference(club, camera);
  };

})();
