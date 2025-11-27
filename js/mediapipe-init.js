// === MEDIAPIPE INIT – JustSwing version stable ===
// 24 nov 2025

document.addEventListener("DOMContentLoaded", () => {

  window.startJustSwingCamera = async function () {
    console.log("🎥 Démarrage caméra pour JustSwing…");

    const videoElement = document.getElementById("jsw-video");
    if (!videoElement) {
      console.error("❌ jsw-video introuvable");
      return null;
    }

    // -----------------------------
    // 1) 🔥 RÉCUP CAMÉRA
    // -----------------------------
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
      console.warn("⚠️ Selfie KO → fallback", err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (err2) {
        console.error("❌ Aucune caméra disponible", err2);
        return null;
      }
    }

    videoElement.srcObject = stream;
    videoElement.style.transform = "scaleX(-1)";

    const ensurePlay = () =>
      videoElement.play().catch(() => setTimeout(ensurePlay, 50));
    ensurePlay();

    videoElement.addEventListener("loadedmetadata", () => {
      console.log(
        `📸 Vidéo OK : ${videoElement.videoWidth}x${videoElement.videoHeight}`
      );
    });

    // -----------------------------
    // 2) 🔥 MEDIAPIPE POSE
    // -----------------------------
    let mpReady = false;

    const mpPose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    mpPose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      selfieMode: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    // 🟢 Callback UNIFIÉ — un seul onResults !
    mpPose.onResults((res) => {
      if (!mpReady) {
        mpReady = true;
        console.log("🟢 MediaPipe prêt !");
      }

      window.JustSwing?.onPoseFrame?.(res.poseLandmarks || null);
    });

    // -----------------------------
    // 3) 🔥 CAMERA → MP Pose
    // -----------------------------
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        if (!mpReady) return; // empêche crash WASM
        try {
          await mpPose.send({ image: videoElement });
        } catch (err) {
          console.warn("⚠️ Erreur mpPose.send", err);
        }
      },
      width: 1280,
      height: 720
    });

    camera.start();

    console.log("📸 Caméra JustSwing prête ✔");
    return stream;
  };
});
