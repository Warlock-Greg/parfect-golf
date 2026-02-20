// =====================================================
// CONFIG GLOBALE — PARFECT.GOLFR (NON-MODULE SAFE)
// =====================================================

// -----------------------------------------------------
// GitHub RAW (data publiques)
// -----------------------------------------------------
window.GH_OWNER  = "Warlock-Greg";
window.GH_REPO   = "parfect-golf";
window.GH_BRANCH = "main";

window.GH_RAW_BASE =
  `https://raw.githubusercontent.com/${window.GH_OWNER}/${window.GH_REPO}/${window.GH_BRANCH}/data`;

window.GOLFS_JSON_URL    = `${window.GH_RAW_BASE}/golfs.json`;
window.EXERCISE_JSON_URL = `${window.GH_RAW_BASE}/exercises.json`;


// -----------------------------------------------------
// NocoDB — LICENCES & USERS
// -----------------------------------------------------

// ⚠️ URL API NocoDB (table users/licences)
window.NOCODB_REFERENCES_URL =
  "https://app.nocodb.com/api/v2/tables/mfbnbl5kk5zmu73/records";

// ⚠️ URL API NocoDB (table swing)
window.NOCODB_SWINGS_URL =
  "https://app.nocodb.com/api/v2/tables/mh0dt1rbylry99e/records";

// ⚠️ Token API (⚠️ MVP only — à sécuriser plus tard)
window.NOCODB_TOKEN =
  "gJkWlHE4qzbs-JC5L5l2o0T1_UldcEYOIAHXpPtl";

window.NOCODB_ROUNDS_URL =
  "https://app.nocodb.com/api/v2/tables/TON_ID_ROUNDS/records";

// Nom logique du projet
window.NC_PROJECT = "parfect";

// =====================================================
// PARFECT — CONFIG MVP
// =====================================================
// config.js
window.PARFECT_FLAGS = {
  OPEN_ACCESS: true // ← LANCEMENT
};


// Superadmin MVP (temporaire)
window.PARFECT_ADMIN_EMAILS = [
  "gregoiremm@gmail.com"
];

// Optionnel : flag explicite
window.PARFECT_ADMIN_MODE = true;


// -----------------------------------------------------
// LocalStorage KEYS (centralisées)
// -----------------------------------------------------
window.LS_KEYS = {
  LICENSE:    "parfect_license",
  HISTORY:    "parfectHistory",
  TRAIN:      "parfectTraining",
  COACH_TONE: "coachTone",
  USER_EMAIL: "parfect_user_email"
};

console.log("✅ config.js loaded");

