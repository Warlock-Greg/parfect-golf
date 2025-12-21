// === MEDIAPIPE INIT — Version stable compatible pose.js (ancienne API) ===

document.addEventListener("DOMContentLoaded", () => {

  window.startJustSwingCamera = async function () {
    console.log("🎥 Initialisation caméra + MediaPipe Pose…");

    const videoEl = document.getElementById("jsw-video");
    if (!videoEl) {
      console.error("❌ jsw-video manquant");
      return null;
    }

    // 1) Caméra
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false
      });
    } catch (err) {
      console.warn("Fallback caméra", err);
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    }

    videoEl.srcObject = stream;
    videoEl.style.transform = "scaleX(-1)"; // miroir pour l’utilisateur

    const ensurePlay = () =>
      videoEl.play().catch(() => setTimeout(ensurePlay, 50));
    ensurePlay();

    // 2) Pose (ANCIENNE API)
    const mpPose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    mpPose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      selfieMode: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    mpPose.onResults((res) => {
      window.__lastPose = res.poseLandmarks;
      if (window.JustSwing?.onPoseFrame) {
        JustSwing.onPoseFrame(res.poseLandmarks);
      }
    });

    // 3) CameraUtils (ancienne API)
    const camera = new Camera(videoEl, {
      onFrame: async () => {
        try {
          await mpPose.send({ image: videoEl });
        } catch (err) {
          console.warn("⚠️ mpPose.send erreur", err);
        }
      },
      width: 720,
      height: 1080
    });

    camera.start();

    console.log("📸 Caméra + Pose opérationnels ✔");
    return stream;
  };

});

