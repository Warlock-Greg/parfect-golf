// === MEDIAPIPE INIT — VERSION FIXÉE ===

document.addEventListener("DOMContentLoaded", () => {
  console.log("📸 MediaPipe init…");

  const videoElement = document.getElementById("jsw-video");
  if (!videoElement) {
    console.error("❌ jsw-video introuvable !");
    return;
  }

  // --- Setup Pose ---
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
    JustSwing.onPoseFrame(results.poseLandmarks || null);
  });

  // --- Démarrage caméra (facingMode = user pour selfie) ---
  JustSwing.setCameraStarter(async () => {
    console.log("🎥 Lancement caméra Selfie…");

    // ⚠ Stop ancien stream si présent
    if (videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach((t) => t.stop());
      videoElement.srcObject = null;
    }

    const constraints = {
      video: {
        facingMode: "user", // ← Selfie
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;

    try {
      await videoElement.play();
    } catch (err) {
      console.warn("play() blocked:", err);
    }

    // Camera loop MediaPipe
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await mpPose.send({ image: videoElement });
      },
      width: 720,
      height: 1280,
    });

    camera.start();
  });
});
