// === MEDIAPIPE INIT — Parfect.golfr Just Swing ===
// Version propre + sélection caméra + anti-AbortError + halo + super messages

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📹 MediaPipe init chargé");

  const videoEl = document.getElementById("jsw-video");
  const cameraSelect = document.getElementById("jsw-camera-select");

  let currentStream = null;
  let currentCameraId = null;

  // --- 1) Lister les caméras disponibles ---
  async function populateCameraList() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === "videoinput");

    cameraSelect.innerHTML = "";

    cams.forEach((cam, i) => {
      const opt = document.createElement("option");
      opt.value = cam.deviceId;
      opt.textContent = cam.label || `Caméra ${i + 1}`;
      cameraSelect.appendChild(opt);
    });

    if (cams[0]) currentCameraId = cams[0].deviceId;
  }

  await populateCameraList();



  // --- 2) Fonction qui démarre proprement la caméra ---
  async function startCamera(deviceId) {
    try {
      // 🔥 Stop ancien flux si existe
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
      }

      // 🔥 Setup contraintes caméra
      const constraints = deviceId
        ? { video: { deviceId: { exact: deviceId } }, audio: false }
        : { video: { facingMode: "environment" }, audio: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStream = stream;
      videoEl.srcObject = stream;

      // Prevent AbortError → attendre metadata
      await videoEl.play();

      console.log("🎥 Caméra démarrée :", deviceId);

      return stream;
    } catch (err) {
      console.error("Erreur caméra :", err);
    }
  }



  // --- 3) MediaPipe Pose ---
  const mpPose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  mpPose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minTrackingConfidence: 0.5,
    minDetectionConfidence: 0.5
  });

  mpPose.onResults((results) => {
    JustSwing.onPoseFrame(results.poseLandmarks || null);
  });



  // --- 4) Fonction de démarrage caméra pour JustSwing ---
  JustSwing.setCameraStarter(async () => {
    console.log("▶ JustSwing demande la caméra");

    await startCamera(currentCameraId);

    const cam = new Camera(videoEl, {
      onFrame: async () => {
        await mpPose.send({ image: videoEl });
      },
      width: videoEl.videoWidth || 720,
      height: videoEl.videoHeight || 1280
    });

    cam.start();
  });



  // --- 5) Quand l'utilisateur change de caméra ---
  cameraSelect.addEventListener("change", () => {
    currentCameraId = cameraSelect.value;
    console.log("🔄 Caméra choisie :", currentCameraId);

    // On relance JustSwing proprement
    JustSwing.startSession("swing");
  });

});
