// === Parfect.golfr - Swing Analyzer (MVP) ===

function initSwingAnalyzer() {
  console.log("🎥 Module Analyse de swing prêt");

  const upload = document.getElementById("video-upload");
  const preview = document.getElementById("video-preview");
  const analyzeBtn = document.getElementById("analyze-btn");
  const result = document.getElementById("analysis-result");
  const swingType = document.getElementById("swing-type");

  // Prévisualisation vidéo
  upload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.style.display = "block";
      result.innerHTML = "";
    }
  });

  // Lancer l’analyse
  analyzeBtn.addEventListener("click", async () => {
    if (!preview.src) {
      result.innerHTML = "<p style='color:#f55;'>⚠️ Merci d’importer une vidéo avant d’analyser.</p>";
      return;
    }

    const type = swingType.value;
    result.innerHTML = "<p>⏳ Analyse en cours...</p>";

    const feedback = await generateSwingFeedback(type);

    result.innerHTML = `<p style='margin-top:10px;'>${feedback}</p>`;

    // 👇 envoie le message dans le coach IA
    if (typeof showCoachIA === "function") {
      showCoachIA(`🎥 ${feedback}`);
    }
  });
}

// Génère un commentaire de coach basé sur le type de coup
async function generateSwingFeedback(type) {
  const comments = {
    drive: [
      "Puissant ! Garde ton équilibre jusqu’à la fin du swing.",
      "Ton drive a du flow. Priorité au relâchement des épaules.",
      "Beau tempo. Termine bien ton finish.",
      "Trop fort ! Respire avant de frapper pour garder le contrôle.",
      "Le contact est bon. Laisse ton bas du corps guider le mouvement."
    ],
    iron: [
      "Solide. Essaie d’ancrer un peu plus ton bas du corps.",
      "Bon rythme. Continue de sentir le sol sous tes pieds.",
      "Ton fer est fluide, garde la tête stable.",
      "Très bon tempo. Visualise ta cible avant l’impact.",
      "Pense à finir vers la cible pour plus de régularité."
    ],
    approach: [
      "Belle approche. Reste simple et fluide.",
      "Tu contrôles bien la distance. Inspire, expire, engage.",
      "Moins de mains, plus de corps : c’est parfait.",
      "Approche maîtrisée ! Garde cette fluidité.",
      "La clé, c’est la douceur : bon feeling."
    ],
    putting: [
      "Ton putting respire la régularité. Bravo !",
      "Fixe ton regard un peu plus longtemps après le contact.",
      "Ton tempo est stable. Continue ainsi.",
      "Reste détendu sur les petits putts. Le calme fait tout.",
      "Beau mouvement. Respire avant chaque putt."
    ]
  };

  const arr = comments[type] || ["Beau swing ! Continue à t’écouter et à jouer libre."];
  return arr[Math.floor(Math.random() * arr.length)];
}

// Expose la fonction globalement
window.initSwingAnalyzer = initSwingAnalyzer;
