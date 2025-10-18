// === Parfect.golfr - data.js ===
// Toutes les données publiques (golfs, exercices)

console.log("📦 data.js chargé");

// 🔹 Récupération de la liste des golfs
window.fetchGolfs = async function() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/data/golfs.json",
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Erreur de chargement des golfs");
    const data = await res.json();
    console.log(`✅ ${data.length} golfs chargés`);
    return data;
  } catch (err) {
    console.error("❌ fetchGolfs :", err);
    return [];
  }
};

// 🔹 Récupération de la liste des exercices d’entraînement
window.fetchExercises = async function() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/Warlock-Greg/parfect-golf/main/data/exercises.json",
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Erreur de chargement des exercices");
    const data = await res.json();
    console.log(`✅ ${data.length} exercices chargés`);
    return data;
  } catch (err) {
    console.error("❌ fetchExercises :", err);
    return [];
  }
};
