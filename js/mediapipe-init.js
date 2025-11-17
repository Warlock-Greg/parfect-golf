document.addEventListener("DOMContentLoaded", () => {
  const videoElement = document.getElementById("jsw-video");

  const mpPose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  mpPose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  mpPose.onResults((results) => {
    JustSwing.onPoseFrame(results.poseLandmarks || null);
  });

  // === 🔥 CAMÉRA FULLSCREEN PORTRAIT + SELFIE ===
  JustSwing.setCameraStarter(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",   // 🔥 SELFIE
        width: { ideal: 720 },
        height: { ideal: 1280 },
      },
      audio: false
    });

    videoElement.srcObject = stream;

    // ⚠️ Très important sur mobile
    await videoElement.play().catch(e => console.warn("play() blocked:", e));

    // Ajuste la vidéo pour remplir le viewport
    videoElement.style.width = "100vw";
    videoElement.style.height = "100vh";
    videoElement.style.objectFit = "cover";

    // Démarre MediaPipe Camera helper
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await mpPose.send({ image: videoElement });
      },
      width: videoElement.videoWidth || 720,
      height: videoElement.videoHeight || 1280
    });

    camera.start();
  });
});
