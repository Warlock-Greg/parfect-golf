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

  
async function fetchReference(whereClause) {
  try {
    const res = await fetch(
      `${window.NOCODB_REFERENCES_URL}?where=${whereClause}&limit=1`,
      {
        headers: { "xc-token": window.NOCODB_TOKEN }
      }
    ).then(r => r.json());

    return res.list?.[0] || null;

  } catch (err) {
    console.warn("⚠️ Reference fetch failed", err);
    return null;
  }
}

  

  async function deactivateOld(type, club, camera, email = null) {
   
    if (type === "user") {
      filter += `~and~created_by,eq,${email}`;
    }

    const url =
`${BASE_URL}?where=(type,eq,${type})~and~(club,eq,${club})~and~(camera,eq,${camera})~and~(is_active,eq,true)`;
    const res = await fetch(url, { headers: headers() });
    const data = await res.json();

    const records = data.list || [];

  for (const r of records) {

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

  try {
    const res = await fetch(
      `${window.NOCODB_REFERENCES_URL}?where=(type,eq,system)&limit=50`,
      { headers: { "xc-token": window.NOCODB_TOKEN } }
    ).then(r => r.json());

    const rows = res.list || [];

    const match = rows.find(r =>
      r.club === club &&
      r.camera === camera &&
      Number(r.is_active) === 1
    );

    if (!match) return null;

    const parsed = match.reference_json;
    CACHE[cacheKey] = parsed;

    return parsed;

  } catch (err) {
    console.warn("Reference fetch failed", err);
    return null;
  }
};


// ===============================
// 🟢 GET USER REFERENCE
// ===============================
window.getUserReference = async function (club, camera) {

  const email = window.userLicence?.email;
  if (!email) return null;

  const cacheKey = buildKey("user", club, camera, email);
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  try {
    const res = await fetch(
      `${window.NOCODB_REFERENCES_URL}?where=(type,eq,user)&limit=50`,
      { headers: { "xc-token": window.NOCODB_TOKEN } }
    ).then(r => r.json());

    const rows = res.list || [];

    const match = rows.find(r =>
      r.club === club &&
      r.camera === camera &&
      r.created_by === email &&
      Number(r.is_active) === 1
    );

    if (!match) return null;

    const parsed = match.reference_json;
    CACHE[cacheKey] = parsed;

    return parsed;

  } catch (err) {
    console.warn("User reference fetch failed", err);
    return null;
  }
};

  // ===============================
  // 💾 SAVE USER REFERENCE
  // ===============================

 window.saveUserReference = async function (club, camera, targets) {

  const email = window.userLicence?.email;
  if (!email) throw new Error("Utilisateur non connecté");

  camera =
    camera ||
    window.jswViewType ||
    document.getElementById("jsw-camera-select")?.value ||
    "faceOn";

  await deactivateOld("user", club, camera, email);

  const payload = {
    records: [
      {
        type: "user",
        club,
        camera,
        reference_json: targets, // ⚠️ pas stringify
        created_by: email,
        is_active: true,
        version: Date.now()
      }
    ]
  };

  const res = await fetch(window.NOCODB_REFERENCES_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }

};

  // ===============================
  // 👑 SAVE SYSTEM REFERENCE
  // ===============================

  window.saveSystemReference = async function (club, camera, targets) {

  if (!window.isAdmin?.()) {
    throw new Error("Accès admin requis");
  }

  camera =
    camera ||
    window.jswViewType ||
    document.getElementById("jsw-camera-select")?.value ||
    "faceOn";

  await deactivateOld("system", club, camera);

  const payload = {
    records: [
      {
        type: "system",
        club,
        camera,
        reference_json: targets,
        created_by: window.userLicence?.email,
        is_active: true,
        version: Date.now()
      }
    ]
  };

  const res = await fetch(window.NOCODB_REFERENCES_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }

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
