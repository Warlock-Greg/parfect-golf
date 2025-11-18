document.addEventListener("DOMContentLoaded", () => {
  const videoElement = document.getElementById("jsw-video");
  if (!videoElement || !window.JustSwing) return;

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

  // ⭐ Starter que JustSwing utilisera quand tu lances startSession()
  JustSwing.setCameraStarter(async () => {
    try {
      // 📷 Selfie + "paysage" (moins de zoom que 720x1280 portrait)
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: "user" },   // selfie
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = stream;

      const safePlay = () =>
        videoElement.play().catch((err) => {
          console.warn("play() bloqué, on réessaiera après metadata", err);
        });

      if (videoElement.readyState >= 2) {
        await safePlay();
      } else {
        await new Promise((resolve) => {
          videoElement.onloadedmetadata = async () => {
            await safePlay();
            resolve();
          };
        });
      }

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          await mpPose.send({ image: videoElement });
        },
        width: 1920,
        height: 1080,
      });

      camera.start();

      // refs globales pour pouvoir couper proprement
      window.__jswStream = stream;
      window.__jswCamera = camera;
    } catch (err) {
      console.error("Erreur caméra JustSwing", err);
      const status = document.getElementById("jsw-status-text");
      if (status) {
        status.textContent =
          "Impossible d'accéder à la caméra 😕 (vérifie les autorisations).";
      }
    }

    // Tentative d'orientation paysage (ne marche pas partout, mais sans danger)
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
  });
});
