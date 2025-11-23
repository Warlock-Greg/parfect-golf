// === MEDIAPIPE INIT – VERSION STABLE JUSTSWING ===
// • Selfie automatique si dispo
// • Fallback caméra par défaut
// • Pas de transform parasites dans le CSS
// • Mirror uniquement si facingMode = "user"
// • Envoi stable vers Pose + JustSwing
// • Aucune ambiguïté avec le CSS existant

document.addEventListener("DOMContentLoaded", () => {
  window.startJustSwingCamera = async function () {
    console.log("🎥 Démarrage caméra pour JustSwing…");

    const videoElement = document.getElementById("jsw-video");
    if (!videoElement) {
      console.error("❌ jsw-video introuvable");
      return null;
    }

    // --- 1) Tentative Selfie (toujours préférable pour JustSwing)
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch (err) {
      console.warn("⚠️ Selfie KO → fallback caméra par défaut", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (err2) {
        console.error("❌ Impossible d'accéder à une caméra", err2);
        return null;
      }
    }

    // --- 2) Affectation du flux
    videoElement.srcObject = stream;

    // Détection selfie/back
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    const isSelfie =
      settings.facingMode === "user" || settings.facingMode === "front";

    // Miroir NATIF (pas de translate X/ Y ici !)
    videoElement.style.transform = isSelfie ? "scaleX(-1)" : "none";

    // --- 3) Safari fix — assure sujet en lecture
    const ensurePlay = () =>
      videoElement.play().catch(() => setTimeout(ensurePlay, 50));
    ensurePlay();

    videoElement.addEventListener("loadedmetadata", () => {
      console.log(
        `📸 Vidéo prête : ${videoElement.videoWidth}x${videoElement.videoHeight} | Selfie = ${isSelfie}`
      );
    });

    // --- 4) MediaPipe Pose
    const mpPose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    mpPose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    mpPose.onResults((results) => {
      if (window.JustSwing?.onPoseFrame)
        JustSwing.onPoseFrame(results.poseLandmarks || null);
    });

    // --- 5) Boucle frame → Pose
    async function processFrame() {
      if (videoElement.readyState >= 2) {
        try {
          await mpPose.send({ image: videoElement });
        } catch (err) {
          console.warn("⚠️ Erreur mpPose.send", err);
        }
      }
      requestAnimationFrame(processFrame);
    }

    console.log("🧠 MediaPipe Pose prêt ✔");
    processFrame();

    console.log("📸 Caméra JustSwing active.");
    return stream;
  };
});

