export const SHEET_JSON_URL = "https://opensheet.elk.sh/1bv_ABhNRuJAfsAgzlobHLkvTsEyYWOTLeRynhhouGGI/Feuille1";
export const EMAILJS_SERVICE_ID = "service_03in3vd";
export const EMAILJS_TEMPLATE_ID = "template_fxjeymy";
export const EMAILJS_PUBLIC_KEY = "fKAFOoAJpLiNTwDHe";

export const OWNER = "Warlock-Greg";
export const REPO = "parfect-golf";
export const BRANCH = "main";
export const GH_RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/data`;


// === config.js ===

// ⚠️ URL NocoDB (API REST)
window.NC_URL = "https://app.nocodb.com/api/v2/tables/mfbnbl5kk5zmu73/records";

// ⚠️ Token API NocoDB (lecture/écriture)
window.NC_TOKEN = "pnOjTp-F7ZbPvGp5NEhceH3zQmDrXQAzFG3AXJz9";

// Nom du projet / table si besoin plus tard
window.NC_PROJECT = "parfect";

export const GOLFS_JSON_URL = `${GH_RAW_BASE}/golfs.json`;
export const EXERCISE_JSON_URL = `${GH_RAW_BASE}/exercises.json`;

if (typeof window !== "undefined") {
  window.GOLFS_JSON_URL = GOLFS_JSON_URL;
  window.EXERCISE_JSON_URL = EXERCISE_JSON_URL;
}

export const LS_KEYS = {
  LICENSE: 'parfect_license',
  HISTORY: 'parfectHistory',
  TRAIN:   'parfectTraining',
  COACH_TONE: 'coachTone'
};
