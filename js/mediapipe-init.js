// === MEDIAPIPE INIT — VERSION ULTRA STABLE POUR JUSTSWING ===
// • Selfie detection auto
// • Mirror propre
// • AUCUN transform parasite
// • Boucle Pose stable (sans Camera class)
// • Callback vers JustSwing.onPoseFrame
// • Recalibrage overlay dès que la vidéo connaît sa taille

document.addEventListener("DOMContentLoaded", () => {
  window.startJustSwingCamera = async function () {
    console.log("🎥 Démarrage caméra pour JustSwing…");

    const videoElement = document.getElementById("jsw-video");
    if (!videoElement) {
      console.error("❌ jsw-video introuvable");
      return null;
    }

    // --- 1) Tentative Selfie
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
      console.warn("⚠️ Selfie KO → fallback caméra", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (err2) {
        console.error("❌ Aucune caméra accessible", err2);
        return null;
      }
    }

    // --- 2) Affectation flux
    videoElement.srcObject = stream;

    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    const isSelfie =
      settings.facingMode === "user" ||
      settings.facingMode === "front";

    // --- 3) Miroir propre : scaleX(-1) UNIQUEMENT
    videoElement.style.transform = isSelfie ? "scaleX(-1)" : "none";

    // --- 4) Forcer lecture Safari
    const ensurePlay = () =>
      videoElement.play().catch(() => setTimeout(ensurePlay, 50));
    ensurePlay();

    // --- 5) Recalibrage overlay
    videoElement.addEventListener("loadedmetadata", () => {
      console.log(
        `📸 Vidéo OK : ${videoElement.videoWidth}x${videoElement.videoHeight} | Selfie=${isSelfie}`
      );
      if (window.JustSwing?.resizeOverlay) {
        window.JustSwing.resizeOverlay();
      }
    });

    // --- 6) MediaPipe Pose
    const mpPose = new Pose({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
    });

    mpPose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    mpPose.onResults((results) => {
      console.log("POSE:", results.poseLandmarks);   // 👈 AJOUTE CETTE LIGNE

      if (window.JustSwing?.onPoseFrame) {
        JustSwing.onPoseFrame(results.poseLandmarks || null);
      }
    });

    // --- 7) Boucle animation → envoi Pose
    async function processFrame() {
      if (videoElement.readyState >= 2) {
        try {
          await mpPose.send({ image: videoElement });
        } catch (e) {
          console.warn("⚠️ mpPose.send error", e);
        }
      }
      requestAnimationFrame(processFrame);
    }

    processFrame();

    console.log("📸 Caméra JustSwing prête ✔");
    return stream;
  };
});
