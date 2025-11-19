// === MEDIAPIPE INIT — UNE SEULE CAMERA, PLUS D'ERREUR "FAILED TO ACQUIRE" ===

document.addEventListener("DOMContentLoaded", async () => {
  const videoElement = document.getElementById("jsw-video");
  if (!videoElement) {
    console.error("❌ jsw-video introuvable dans le DOM");
    return;
  }

  // 1️⃣ Choix très simple : on demande une caméra "user" (selfie),
  // et si ça échoue, on prend n'importe quelle caméra dispo.
  async function getCameraStream() {
    try {
      console.log("🎥 Tentative caméra (facingMode:user)");
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",       // selfie par défaut
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch (e) {
      console.warn("⚠️ Selfie KO, fallback caméra générique", e);
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (e2) {
        console.error("❌ Impossible d'acquérir un flux caméra DU TOUT", e2);
        return null;
      }
    }
  }

  const stream = await getCameraStream();
  if (!stream) {
    // Ici, c'est vraiment que le navigateur / permissions ne laissent rien passer.
    return;
  }

  videoElement.srcObject = stream;

  // 2️⃣ Assurer le play() (Android + iOS peuvent être capricieux)
  const ensurePlay = () => {
    videoElement
      .play()
      .catch((err) => {
        console.warn("⏳ play() bloqué, on réessaie…", err);
        setTimeout(ensurePlay, 80);
      });
  };
  ensurePlay();

  // 3️⃣ MediaPipe Pose
  const mpPose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  mpPose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  mpPose.onResults((results) => {
    if (window.JustSwing && typeof JustSwing.onPoseFrame === "function") {
      JustSwing.onPoseFrame(results.poseLandmarks || null);
    }
  });

  // 4️⃣ Boucle d'analyse : on envoie chaque frame vidéo à MediaPipe
  async function poseLoop() {
    try {
      await mpPose.send({ image: videoElement });
    } catch (e) {
      console.warn("⚠️ Erreur mpPose.send, on continue quand même", e);
    }
    requestAnimationFrame(poseLoop);
  }

  // On démarre la boucle dès que la vidéo est prête
  videoElement.addEventListener("loadeddata", () => {
    console.log("✅ Vidéo prête, lancement boucle Pose");
    poseLoop();
  });

  console.log("📸 Camera + MediaPipe initialisés");
});
