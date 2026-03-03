export async function getReference(type, club, camera) {

  const email = window.userLicence?.email;

  let filter = `type,eq,${type}~and~club,eq,${club}~and~camera,eq,${camera}~and~is_active,eq,true`;

  if (type === "user") {
    filter += `~and~created_by,eq,${email}`;
  }

  const url = `${NOCODB_REFERENCES_URL}?where=${filter}`;

  const res = await fetch(url, {
    headers: {
      "xc-token": NOCODB_TOKEN
    }
  });

  const data = await res.json();
  if (!data.list?.length) return null;

  return JSON.parse(data.list[0].reference_json);
}
