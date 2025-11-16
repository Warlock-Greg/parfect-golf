document.addEventListener("DOMContentLoaded", () => {
  // On suppose que JustSwing.initJustSwing() est déjà appelé dans justSwing.js

  const videoElement = document.getElementById('jsw-video');

  const mpPose = new Pose.Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  mpPose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  mpPose.onResults((results) => {
    JustSwing.onPoseFrame(results.poseLandmarks || null);
  });

  // On override la méthode startCamera si tu veux relier camera_utils proprement
  JustSwing.startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    videoElement.srcObject = stream;
    await videoElement.play();

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await mpPose.send({ image: videoElement });
      },
      width: 720,
      height: 1280
    });

    camera.start();
  };
});
