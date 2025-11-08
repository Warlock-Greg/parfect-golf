// === Parfect.golfr - Swing Analyzer (MVP robuste) ===

(function () {
  let initialized = false;

  function $(id) { return document.getElementById(id); }

  function safeCoach(msg) {
    if (typeof window.showCoachIA === "function") {
      window.showCoachIA(msg);
    } else if (typeof window.coachReact === "function") {
      window.coachReact(msg);
    }
  }

  function setPreviewFromFileInput(inputEl, previewEl, resultEl) {
    const file = inputEl?.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    previewEl.src = url;
    previewEl.style.display = "block";
    try { previewEl.load?.(); } catch (_) {}
    resultEl.innerHTML = "";
  }

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
    // petite latence pour UX
    await new Promise(r => setTimeout(r, 250));
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function initSwingAnalyzer() {
    if (initialized) return; // anti double-init
    initialized = true;

    const upload = $("video-upload") || $("video-upload-library") || $("video-upload-camera");
    const preview = $("video-preview");
    const analyzeBtn = $("analyze-btn");
    const result = $("analysis-result");
    const swingType = $("swing-type"); // optionnel

    // Si éléments critiques manquent, on sort proprement
    if (!preview || !analyzeBtn || !result) {
      console.warn("Swing Analyzer: éléments DOM manquants (préview/analyze/result).");
      initialized = false; // permettra une ré-init plus tard si la vue se (re)crée
      return;
    }

    // Gestion d’un input unique (#video-upload) s’il existe
    if (upload && upload.id === "video-upload") {
      upload.addEventListener("change", (e) => {
        setPreviewFromFileInput(e.target, preview, result);
      });
    }

    // Gestion inputs séparés (caméra + bibliothèque) si présents
    const uploadCam = $("video-upload-camera");
    const uploadLib = $("video-upload-library");
    if (uploadCam) {
      uploadCam.addEventListener("change", (e) => {
        setPreviewFromFileInput(e.target, preview, result);
      });
    }
    if (uploadLib) {
      uploadLib.addEventListener("change", (e) => {
        setPreviewFromFileInput(e.target, preview, result);
      });
    }

    // Lancer l’analyse
    analyzeBtn.addEventListener("click", async () => {
      if (!preview.src) {
        result.innerHTML = "<p style='color:#f55;'>⚠️ Merci d’importer une vidéo avant d’analyser.</p>";
        return;
      }

      const type = swingType?.value || "drive";
      result.innerHTML = "<p>⏳ Analyse en cours...</p>";

      const feedback = await generateSwingFeedback(type);
      result.innerHTML = `<p style='margin-top:10px;'>${feedback}</p>`;
      safeCoach(`🎥 ${feedback}`);
    });

    console.log("🎥 Module Analyse de swing initialisé");
  }

  // Expose global pour l’appel depuis la nav
  window.initSwingAnalyzer = initSwingAnalyzer;
})();
