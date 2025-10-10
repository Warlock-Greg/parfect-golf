// === CONFIG Parfect.golfr ===
// Configuration principale des accès et URLs de données
// Compatible modules ES6 + accès global via window

// 🔹 Définition des constantes du repo GitHub
export const OWNER  = "Warlock-Greg";
export const REPO   = "parfect-golf";
export const BRANCH = "main";

// 🔹 Construction de l'URL RAW GitHub (héberge les JSON)
export const GH_RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/data`;

// 🔹 Fichiers de données JSON
export const GOLFS_JSON_URL    = `${GH_RAW_BASE}/golfs.json`;
export const EXERCISE_JSON_URL = `${GH_RAW_BASE}/exercises.json`;

// 🔹 Autres liens (licences ou API futures)
export const API_LICENSE_URL   = "https://developers.google.com/maps/documentation/javascript/get-api-key";

// === Compatibilité console / global ===
// On attache aussi ces constantes à `window` pour les tester directement dans la console
if (typeof window !== "undefined") {
  window.OWNER = OWNER;
  window.REPO = REPO;
  window.BRANCH = BRANCH;
  window.GH_RAW_BASE = GH_RAW_BASE;
  window.GOLFS_JSON_URL = GOLFS_JSON_URL;
  window.EXERCISE_JSON_URL = EXERCISE_JSON_URL;
  window.API_LICENSE_URL = API_LICENSE_URL;
}

// === Diagnostic simple ===
// (Tu peux commenter cette ligne une fois que tout marche)
console.log("✅ config.js chargé :", { GOLFS_JSON_URL, EXERCISE_JSON_URL });

export const LS_KEYS = {
  LICENSE: 'parfect_license',
  HISTORY: 'parfectHistory',
  TRAIN:   'parfectTraining',
  COACH_TONE: 'coachTone'
};
