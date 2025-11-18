document.addEventListener("DOMContentLoaded", async () => {
  const videoElement = document.getElementById("jsw-video");

  // Trouve les caméras dispo
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter(d => d.kind === "videoinput");

  let wideCamId = null;

  // Cherche la caméra "ultra-wide"
  for (const cam of cameras) {
    const label = cam.label.toLowerCase();
    if (label.includes("ultra") || label.includes("wide") || label.includes("0.5")) {
      wideCamId = cam.deviceId;
      break;
    }
  }

  // Setup MediaPipe Pose
  const mpPose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
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

  // Brancher le moteur dans JustSwing
  JustSwing.setCameraStarter(async () => {
    const constraints = {
      video: wideCamId
        ? { deviceId: { exact: wideCamId } }
        : { facingMode: "user" }, // fallback selfie
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;

    await videoElement.play();

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await mpPose.send({ image: videoElement });
      },
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
    });

    camera.start();
  });
});
