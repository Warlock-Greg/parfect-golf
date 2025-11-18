document.addEventListener("DOMContentLoaded", async () => {
  const videoElement = document.getElementById("jsw-video");
  if (!videoElement) return;

  // === 1. Récupération des caméras ===
  async function getSelfieCamera() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");

      // 1) Chercher explicitement "front" ou "user"
      let front = videoDevices.find(d =>
        d.label.toLowerCase().includes("front") ||
        d.label.toLowerCase().includes("user")
      );
      if (front) return { deviceId: front.deviceId };

      // 2) Sinon facingMode:user (souvent ignoré en iOS mais on tente)
      return { facingMode: "user" };
    } catch (err) {
      return { facingMode: "user" };
    }
  }

  // === 2. Starter Caméra utilisé par JustSwing ===
  JustSwing.setCameraStarter(async () => {
    const cam = await getSelfieCamera();

    const constraints = {
      audio: false,
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        ...cam, // deviceId OU facingMode:user
      }
    };

    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // Fallback en dernier recours : facingMode:user obligatoire
      console.warn("Fallback selfie", err);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" }
      });
    }

    videoElement.srcObject = stream;

    const playSafe = () =>
      videoElement.play().catch(() => {});

    if (videoElement.readyState >= 2) {
      await playSafe();
    } else {
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = async () => {
          await playSafe();
          resolve();
        };
      });
    }

    // MediaPipe camera
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await mpPose.send({ image: videoElement });
      },
      width: 1920,
      height: 1080
    });

    camera.start();

    window.__jswStream = stream;
    window.__jswCamera = camera;
  });

  // === 3. MediaPipe Pose ===
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
});
