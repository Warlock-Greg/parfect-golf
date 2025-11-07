// === swing-analyzer.movenet.js — MVP Parfect.golfr ===
// Objectif : analyser un swing vidéo avec MoveNet + feedback IA

console.log("🏌️‍♂️ Swing Analyzer MoveNet chargé");

let detector = null;
let videoEl = null;
let score = 0;

// === Initialisation du modèle MoveNet ===
async function initSwingAnalyzer() {
  try {
    console.log("⏳ Chargement du modèle MoveNet...");
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: "SinglePose.Lightning" } // ✅ corrigé
    );
    console.log("✅ MoveNet prêt !");
  } catch (err) {
    console.error("❌ Erreur chargement MoveNet :", err);
    coachReact?.("⚠️ Erreur lors du chargement du modèle MoveNet.");
  }
}

// === Gestion de l’upload vidéo ===
const upload = document.getElementById("video-upload");
const preview = document.getElementById("video-preview");
const analyzeBtn = document.getElementById("analyze-btn");
const resultBox = document.getElementById("analysis-result");

if (upload) {
  upload.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = "block";
    preview.load();

    coachReact?.("🎥 Vidéo chargée ! Clique sur Analyser pour lancer l’analyse.");
  };
}

// === Analyse principale ===
if (analyzeBtn) {
  analyzeBtn.onclick = async () => {
    if (!preview.src) {
      coachReact?.("⚠️ Charge une vidéo avant d’analyser !");
      return;
    }

    if (!detector) {
      await initSwingAnalyzer();
      if (!detector) return coachReact?.("❌ Impossible de charger le modèle.");
    }

    coachReact?.("🧠 Analyse du swing en cours…");

    try {
      await preview.play();
      await new Promise((r) => setTimeout(r, 800)); // laisse le temps au flux vidéo

      const poses = await detector.estimatePoses(preview);
      console.log("📸 Poses détectées :", poses);

      if (!poses || !poses.length) {
        coachReact?.("😅 Aucune posture détectée. Essaie une vidéo plus claire.");
        return;
      }

      const keypoints = poses[0].keypoints;
      score = computeSwingScore(keypoints);

      resultBox.innerHTML = `
        <h3>Résultat</h3>
        <p>🧩 Précision du swing : <strong style="color:#00ff99;font-size:1.3rem;">${score}/100</strong></p>
      `;

      coachReact?.(
        score > 85
          ? "🔥 Excellent swing ! Fluidité et alignement top niveau."
          : score > 70
          ? "💪 Bon rythme ! Quelques points d’ajustement à peaufiner."
          : "⚙️ Position instable — focus sur les appuis et la rotation."
      );
    } catch (err) {
      console.error("❌ Erreur d’analyse :", err);
      coachReact?.("😬 Erreur pendant l’analyse du swing.");
    }
  };
}

// === Calcul du score basé sur les keypoints ===
function computeSwingScore(keypoints) {
  if (!keypoints?.length) return 0;

  const get = (name) => keypoints.find((k) => k.name === name)?.score || 0;
  const avgUpper =
    (get("left_shoulder") +
      get("right_shoulder") +
      get("left_elbow") +
      get("right_elbow")) /
    4;
  const avgLower =
    (get("left_hip") +
      get("right_hip") +
      get("left_knee") +
      get("right_knee") +
      get("left_ankle") +
      get("right_ankle")) /
    6;

  // pondération simple entre stabilité du haut et bas du corps
  const raw = ((avgUpper * 0.6 + avgLower * 0.4) * 100).toFixed(0);
  return Math.min(100, Math.max(0, raw));
}

// === Auto-init quand on arrive sur l’onglet Swing ===
window.initSwingAnalyzer = async function () {
  if (!detector) {
    await initSwingAnalyzer();
  }
  coachReact?.("🏌️‍♀️ Prêt à analyser ton swing ! Charge ta vidéo ci-dessous.");
};
