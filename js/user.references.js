// ==========================================================
// user.references.js
// Références user sur table references existante
// ==========================================================

(function () {
  function safeJSON(value) {
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

  function getRecordId(r) {
    return r?.Id ?? r?.id ?? r?.ID ?? null;
  }

  async function fetchRefJSON(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
    }
    return res.json();
  }

  function getReferenceUrl() {
    return window.NOCODB_REFERENCES_URL || null;
  }

  function getEmailFieldWhere(email) {
    // On tente d’abord email, puis player_email si besoin via fallback
    return `(email,eq,${encodeURIComponent(email)})`;
  }

  function normalizeReferenceRow(row) {
    if (!row) return null;
    return {
      ...row,
      id: getRecordId(row),
      data: safeJSON(row.data) || row.data || null
    };
  }

  // ------------------------------------------------------
  // GET USER REFERENCE
  // ------------------------------------------------------
  window.getUserReference = async function getUserReference(club, view) {
    const urlBase = getReferenceUrl();
    const token = window.NOCODB_TOKEN;
    const email = window.userLicence?.email || null;

    if (!urlBase || !token || !email || !club || !view) return null;

    const tryUrls = [
      `${urlBase}?where=${getEmailFieldWhere(email)}~and(source,eq,user)~and(club,eq,${encodeURIComponent(club)})~and(view,eq,${encodeURIComponent(view)})&sort=-UpdatedAt&limit=1&fields=*`,
      `${urlBase}?where=(player_email,eq,${encodeURIComponent(email)})~and(source,eq,user)~and(club,eq,${encodeURIComponent(club)})~and(view,eq,${encodeURIComponent(view)})&sort=-UpdatedAt&limit=1&fields=*`
    ];

    for (const url of tryUrls) {
      try {
        const data = await fetchRefJSON(url, {
          headers: { "xc-token": token }
        });

        const row = data?.list?.[0] || null;
        if (row) return normalizeReferenceRow(row);
      } catch (err) {
        console.warn("⚠️ getUserReference tentative échouée", url, err);
      }
    }

    return null;
  };

  // ------------------------------------------------------
  // GET SYSTEM REFERENCE
  // ------------------------------------------------------
  window.getSystemReference = async function getSystemReference(club, view) {
    const urlBase = getReferenceUrl();
    const token = window.NOCODB_TOKEN;

    if (!urlBase || !token || !club || !view) return null;

    const url =
      `${urlBase}?where=(source,eq,system)` +
      `~and(club,eq,${encodeURIComponent(club)})` +
      `~and(view,eq,${encodeURIComponent(view)})` +
      `&sort=-UpdatedAt&limit=1&fields=*`;

    try {
      const data = await fetchRefJSON(url, {
        headers: { "xc-token": token }
      });

      return normalizeReferenceRow(data?.list?.[0] || null);
    } catch (err) {
      console.error("❌ getSystemReference error", err);
      return null;
    }
  };

  // ------------------------------------------------------
  // SAVE USER REFERENCE (POST)
  // ------------------------------------------------------
  window.saveUserReference = async function saveUserReference(payload) {
    const urlBase = getReferenceUrl();
    const token = window.NOCODB_TOKEN;
    const email = window.userLicence?.email || null;

    if (!urlBase || !token) {
      throw new Error("NOCODB_REFERENCES_URL ou NOCODB_TOKEN manquant");
    }
    if (!email) throw new Error("Email utilisateur manquant");
    if (!payload?.club) throw new Error("club manquant");
    if (!payload?.view) throw new Error("view manquant");
    if (!payload?.data || typeof payload.data !== "object") {
      throw new Error("data manquant ou invalide");
    }

    const body = {
      email,
      player_email: email,
      club: payload.club,
      view: payload.view,
      source: "user",
      data: payload.data,
      notes: payload.notes ?? null
    };

    const res = await fetch(urlBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xc-token": token
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${txt}`);
    }

    const saved = await res.json();
    return normalizeReferenceRow(saved);
  };

  // ------------------------------------------------------
  // UPDATE USER REFERENCE (PATCH)
  // ------------------------------------------------------
  window.updateUserReference = async function updateUserReference(id, payload) {
    const urlBase = getReferenceUrl();
    const token = window.NOCODB_TOKEN;

    if (!urlBase || !token) {
      throw new Error("NOCODB_REFERENCES_URL ou NOCODB_TOKEN manquant");
    }
    if (!id) throw new Error("id référence manquant");

    const body = {
      ...(payload.club != null ? { club: payload.club } : {}),
      ...(payload.view != null ? { view: payload.view } : {}),
      ...(payload.data != null ? { data: payload.data } : {}),
      ...(payload.notes != null ? { notes: payload.notes } : {})
    };

    const res = await fetch(`${urlBase}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "xc-token": token
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${txt}`);
    }

    const updated = await res.json();
    return normalizeReferenceRow(updated);
  };

  // ------------------------------------------------------
  // UPSERT USER REFERENCE
  // ------------------------------------------------------
  window.upsertUserReference = async function upsertUserReference(payload) {
    const existing = await window.getUserReference(payload.club, payload.view);

    if (existing?.id) {
      return window.updateUserReference(existing.id, {
        club: payload.club,
        view: payload.view,
        data: payload.data,
        notes: payload.notes ?? null
      });
    }

    return window.saveUserReference(payload);
  };
})();
