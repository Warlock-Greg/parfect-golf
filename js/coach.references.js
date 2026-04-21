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

async function fetchCoachRefJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
  }
  return res.json();
}

window.getCoachReference = async function getCoachReference(playerEmail, club, view) {
  if (!window.NOCODB_PLAYER_REFERENCES_URL || !window.NOCODB_TOKEN) return null;
  if (!playerEmail || !club || !view) return null;

  const url =
    `${window.NOCODB_PLAYER_REFERENCES_URL}?` +
    `where=` +
    `(player_email,eq,${encodeURIComponent(playerEmail)})` +
    `~and(source,eq,coach)` +
    `~and(club,eq,${encodeURIComponent(club)})` +
    `~and(view,eq,${encodeURIComponent(view)})` +
    `~and(is_active,eq,true)` +
    `&sort=-UpdatedAt` +
    `&limit=1` +
    `&fields=*`;

  try {
    const data = await fetchCoachRefJSON(url, {
      headers: { "xc-token": window.NOCODB_TOKEN }
    });

    const row = data?.list?.[0] || null;
    if (!row) return null;

    return {
      ...row,
      id: getRecordId(row),
      data: safeJSON(row.data) || row.data || null
    };
  } catch (err) {
    console.error("❌ getCoachReference error", err);
    return null;
  }
};

window.saveCoachReference = async function saveCoachReference(payload) {
  if (!window.NOCODB_PLAYER_REFERENCES_URL || !window.NOCODB_TOKEN) {
    throw new Error("NocoDB player references config missing");
  }

  if (!payload?.player_email) throw new Error("player_email missing");
  if (!payload?.club) throw new Error("club missing");
  if (!payload?.view) throw new Error("view missing");
  if (!payload?.data || typeof payload.data !== "object") {
    throw new Error("data missing or invalid");
  }

  const body = {
    player_email: payload.player_email,
    coach_email: payload.coach_email ?? window.userLicence?.email ?? null,
    club: payload.club,
    view: payload.view,
    source: "coach",
    is_active: payload.is_active ?? true,
    notes: payload.notes ?? null,
    data: payload.data
  };

  const res = await fetch(window.NOCODB_PLAYER_REFERENCES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xc-token": window.NOCODB_TOKEN
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${txt}`);
  }

  const saved = await res.json();
  return {
    ...saved,
    id: getRecordId(saved),
    data: safeJSON(saved.data) || saved.data || null
  };
};

window.upsertCoachReference = async function upsertCoachReference(payload) {
  const existing = await window.getCoachReference(
    payload.player_email,
    payload.club,
    payload.view
  );

  if (existing?.id) {
    return window.updateCoachReference(existing.id, {
      coach_email: payload.coach_email ?? window.userLicence?.email ?? null,
      is_active: true,
      notes: payload.notes ?? null,
      data: payload.data
    });
  }

  return window.saveCoachReference(payload);
};
