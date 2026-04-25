// ===============================
// 🧠 Reference Service - Parfect
// Source de vérité : NocoDB
// Règle : USER active → SYSTEM active → DEFAULT local
// ===============================

(function () {
  const CACHE = {};

  // --------------------------------------------------
  // Utils
  // --------------------------------------------------
  function getBaseUrl() {
    return window.NOCODB_REFERENCES_URL;
  }

  function getToken() {
    return window.NOCODB_TOKEN;
  }

  function headers(json = true) {
    return json
      ? {
          "Content-Type": "application/json",
          "xc-token": getToken()
        }
      : {
          "xc-token": getToken()
        };
  }

  function normBool(v) {
    return v === true || v === 1 || v === "1" || v === "true";
  }

  function getEmail() {
    return window.userLicence?.email || null;
  }

  function normalizeCamera(camera) {
    return (
      camera ||
      window.jswViewType ||
      document.getElementById("jsw-camera-select")?.value ||
      "faceOn"
    );
  }

  function buildKey(type, club, camera, email = "") {
    return `${type}_${club}_${camera}_${email}`;
  }

  function clearRefCache() {
    Object.keys(CACHE).forEach((k) => delete CACHE[k]);
  }

  function buildWhere(filters) {
    return encodeURIComponent(filters.filter(Boolean).join("~and"));
  }

  function getRecordId(row) {
    return row?.Id ?? row?.id ?? row?.ID ?? null;
  }

  function parseReferenceJSON(value) {
    if (!value) return null;
    if (typeof value === "object") return value;

    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    return null;
  }

  function toParsedReference(row) {
    if (!row) return null;

    return {
      id: getRecordId(row),
      created_at: row.CreatedAt || row.created_at || row.createdAt || null,
      updated_at: row.UpdatedAt || row.updated_at || row.updatedAt || null,
      type: row.type || row.ref_type || null,
      club: row.club || null,
      camera: row.camera || row.view_type || null,
      created_by: row.created_by || row.user_email || row.email || null,
      is_active: normBool(row.is_active),
      version: row.version || null,
      data: parseReferenceJSON(row.reference_json)
    };
  }

  function buildDefaultReference(club, camera) {
    const isDTL = camera === "dtl";

    return {
      id: null,
      created_at: null,
      type: "default",
      club,
      camera,
      created_by: null,
      is_active: true,
      version: "default",
      data: {
        schema_version: 2,

        rotation: {
          shoulder: {
            target: isDTL ? 45 : 0.55,
            tol: isDTL ? 15 : 0.30
          },
          hip: {
            target: isDTL ? 25 : 0.30,
            tol: isDTL ? 12 : 0.25
          },
          xFactor: {
            target: isDTL ? 15 : 0.20,
            tol: isDTL ? 8 : 0.12
          }
        },

        tempo: {
          ratio: {
            target: 3.05,
            tol: 1.2
          }
        },

        weightShift: {
          back: {
            target: 0.05,
            tol: 0.16
          },
          fwd: {
            target: 0.10,
            tol: 0.18
          }
        },

        extension: {
          target: 2.5,
          tol: 1.2
        },

        triangle: null,
        balance: null
      }
    };
  }

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, opts);

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }

    return res.json();
  }

  // --------------------------------------------------
  // Find by business key, not cache ID
  // --------------------------------------------------
  async function findReference({ type, club, camera, email = null, activeOnly = true }) {
    if (!getBaseUrl() || !getToken()) {
      console.warn("⚠️ NocoDB reference config missing");
      return null;
    }

    const filters = [
      `(type,eq,${type})`,
      `(club,eq,${club})`,
      `(camera,eq,${camera})`
    ];

    if (activeOnly) {
      filters.push(`(is_active,eq,true)`);
    }

    if (email) {
      filters.push(`(created_by,eq,${email})`);
    }

    const where = buildWhere(filters);
    const url = `${getBaseUrl()}?where=${where}&sort=-version&limit=1`;

    try {
      const data = await fetchJSON(url, {
        method: "GET",
        headers: headers(false)
      });

      return data?.list?.[0] || null;
    } catch (err) {
      console.warn("⚠️ findReference failed", err);
      return null;
    }
  }

  async function listActiveReferences({ type, club, camera, email = null }) {
    const filters = [
      `(type,eq,${type})`,
      `(club,eq,${club})`,
      `(camera,eq,${camera})`,
      `(is_active,eq,true)`
    ];

    if (email) {
      filters.push(`(created_by,eq,${email})`);
    }

    const where = buildWhere(filters);
    const url = `${getBaseUrl()}?where=${where}&limit=50`;

    try {
      const data = await fetchJSON(url, {
        method: "GET",
        headers: headers(false)
      });

      return data?.list || [];
    } catch (err) {
      console.warn("⚠️ listActiveReferences failed", err);
      return [];
    }
  }

  async function patchRecord(id, payload) {
    if (!id) throw new Error("patchRecord: missing id");

    return fetchJSON(`${getBaseUrl()}/${id}`, {
      method: "PATCH",
      headers: headers(true),
      body: JSON.stringify(payload)
    });
  }

  async function createRecord(payload) {
    return fetchJSON(getBaseUrl(), {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload)
    });
  }

  async function deactivateOld(type, club, camera, email = null) {
    const rows = await listActiveReferences({
      type,
      club,
      camera,
      email
    });

    if (!rows.length) {
      console.log("ℹ️ aucune ancienne référence active");
      return;
    }

    for (const rec of rows) {
      const id = getRecordId(rec);
      if (!id) continue;

      try {
        await patchRecord(id, { is_active: false });
      } catch (err) {
        console.warn("⚠️ deactivate reference failed", id, err);
      }
    }

    console.log("♻️ anciennes références désactivées", {
      type,
      club,
      camera,
      count: rows.length
    });
  }

  // --------------------------------------------------
  // Public: GET SYSTEM
  // --------------------------------------------------
  window.getSystemReference = async function getSystemReference(club, camera) {
    camera = normalizeCamera(camera);

    const cacheKey = buildKey("system", club, camera);
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    const row = await findReference({
      type: "system",
      club,
      camera,
      activeOnly: true
    });

    if (!row) {
      console.warn("⚠️ No system reference found", { club, camera });
      return null;
    }

    const parsed = toParsedReference(row);
    CACHE[cacheKey] = parsed;

    return parsed;
  };

  // --------------------------------------------------
  // Public: GET USER
  // --------------------------------------------------
  window.getUserReference = async function getUserReference(club, camera) {
    const email = getEmail();
    if (!email) return null;

    camera = normalizeCamera(camera);

    const cacheKey = buildKey("user", club, camera, email);
    if (CACHE[cacheKey]) return CACHE[cacheKey];

    const row = await findReference({
      type: "user",
      club,
      camera,
      email,
      activeOnly: true
    });

    if (!row) return null;

    const parsed = toParsedReference(row);
    CACHE[cacheKey] = parsed;

    return parsed;
  };

  // --------------------------------------------------
  // Public: GET SMART
  // user → system → default
  // --------------------------------------------------
  window.getReferenceSmart = async function getReferenceSmart(mode, club, camera) {
    camera = normalizeCamera(camera);

    if (mode === "user") {
      const userRef = await window.getUserReference(club, camera);
      if (userRef?.data) return userRef;
    }

    const systemRef = await window.getSystemReference(club, camera);
    if (systemRef?.data) return systemRef;

    return buildDefaultReference(club, camera);
  };

  window.getActiveReferenceSmart = async function getActiveReferenceSmart(club, camera) {
    camera = normalizeCamera(camera);

    const userRef = await window.getUserReference(club, camera);
    if (userRef?.data) {
      console.log("👤 User reference active", userRef);
      return userRef;
    }

    const systemRef = await window.getSystemReference(club, camera);
    if (systemRef?.data) {
      console.log("🧠 System reference fallback", systemRef);
      return systemRef;
    }

    console.warn("⚠️ No reference found → default hardcoded", { club, camera });
    return buildDefaultReference(club, camera);
  };

  // --------------------------------------------------
  // Public: SAVE USER
  // always create a new active version, deactivate old first
  // --------------------------------------------------
  window.saveUserReference = async function saveUserReference(club, camera, targets) {
    const email = getEmail();
    if (!email) throw new Error("Utilisateur non connecté");

    camera = normalizeCamera(camera);

    console.log("⭐ Saving user reference", {
      club,
      camera,
      email,
      targets
    });

    await deactivateOld("user", club, camera, email);

    const payload = {
      type: "user",
      club,
      camera,
      reference_json: targets,
      created_by: email,
      is_active: true,
      version: Date.now()
    };

    const created = await createRecord(payload);

    clearRefCache();

    console.log("✅ User reference saved", created);
    return created;
  };

  // --------------------------------------------------
  // Public: SAVE SYSTEM
  // admin only, deactivate old SYSTEM references
  // --------------------------------------------------
  window.saveSystemReference = async function saveSystemReference(club, camera, targets) {
    if (!window.isAdmin?.()) {
      throw new Error("Accès admin requis");
    }

    camera = normalizeCamera(camera);

    const email = getEmail();

    console.log("👑 Saving system reference", {
      club,
      camera,
      email,
      targets
    });

    await deactivateOld("system", club, camera, null);

    const payload = {
      type: "system",
      club,
      camera,
      reference_json: targets,
      created_by: email,
      is_active: true,
      version: Date.now()
    };

    const created = await createRecord(payload);

    clearRefCache();

    console.log("✅ System reference saved", created);
    return created;
  };

  // --------------------------------------------------
  // Expose service object
  // --------------------------------------------------
  window.ReferenceService = {
    findReference,
    getSystemReference: window.getSystemReference,
    getUserReference: window.getUserReference,
    getReferenceSmart: window.getReferenceSmart,
    getActiveReferenceSmart: window.getActiveReferenceSmart,
    saveUserReference: window.saveUserReference,
    saveSystemReference: window.saveSystemReference,
    buildDefaultReference,
    clearRefCache
  };

  console.log("✅ ReferenceService loaded");
})();
