// === MEDIAPIPE INIT – JustSwing version simple & stable  24nov===
// - Démarre la caméra
// - Pas de miroir, pas de transform chelou
// - Envoie les landmarks vers JustSwing.onPoseFrame

document.addEventListener("DOMContentLoaded", () => {
  window.startJustSwingCamera = async function () {
    console.log("🎥 Démarrage caméra pour JustSwing…");

    const videoElement = document.getElementById("jsw-video");
    if (!videoElement) {
      console.error("❌ jsw-video introuvable");
      return null;
    }

    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",      // on demande la selfie cam si possible
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

    videoElement.srcObject = stream;

    // ❗ PAS DE transform ici → on laisse brut
    videoElement.style.transform = "scaleX(-1)";

    // Safari fix
    const ensurePlay = () =>
      videoElement.play().catch(() => setTimeout(ensurePlay, 50));
    ensurePlay();

    videoElement.addEventListener("loadedmetadata", () => {
      console.log(
        `📸 Vidéo OK : ${videoElement.videoWidth}x${videoElement.videoHeight}`
      );
    });

    // --- MediaPipe Pose ---
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
      console.log("POSE:", results.poseLandmarks); // debug
      if (window.JustSwing?.onPoseFrame) {
        JustSwing.onPoseFrame(results.poseLandmarks || null);
      }
    });

    // Boucle frame → Pose via Camera util (stable)
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        try {
          await mpPose.send({ image: videoElement });
        } catch (err) {
          console.warn("⚠️ Erreur mpPose.send", err);
        }
      },
      width: 1280,
      height: 720
    });

    let mpReady = false;

mpPose.onResults((res) => {
  mpReady = true;
  window.JustSwing?.onPoseFrame?.(res.poseLandmarks);
});

    camera.start();

    console.log("📸 Caméra JustSwing prête ✔");
    return stream;
  };
});
