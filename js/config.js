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
window.NC_URL =
  "https://app.nocodb.com/api/v2/tables/mfbnbl5kk5zmu73/records";

// ⚠️ Token API (⚠️ MVP only — à sécuriser plus tard)
window.NC_TOKEN =
  "pnOjTp-F7ZbPvGp5NEhceH3zQmDrXQAzFG3AXJz9";

// Nom logique du projet
window.NC_PROJECT = "parfect";


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

