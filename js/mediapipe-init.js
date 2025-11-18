document.addEventListener("DOMContentLoaded", async () => {
  const videoElement = document.getElementById("jsw-video");
  const cameraSelect = document.getElementById("jsw-camera-select");

  // ============================
  // 1️⃣ Permission initiale iOS
  // ============================
  await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

  // ============================
  // 2️⃣ Liste des caméras
  // ============================
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoInputs = devices.filter(d => d.kind === "videoinput");

  // Place la selfie cam en premier choix
  const sortedInputs = [
    ...videoInputs.filter(d => d.label.toLowerCase().includes("front")),
    ...videoInputs.filter(d => !d.label.toLowerCase().includes("front")),
  ];

  if (sortedInputs.length > 0) {
    cameraSelect.classList.remove("hidden");
    cameraSelect.innerHTML = sortedInputs
      .map(d => `<option value="${d.deviceId}">${d.label || "Caméra"}</option>`)
      .join("");
  }

  // ============================
  // 3️⃣ MediaPipe Pose config
  // ============================
  const mpPose = new Pose({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  mpPose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    selfieMode: true,  // IMPORTANT pour mode selfie
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  mpPose.onResults(results => {
    JustSwing.onPoseFrame(results.poseLandmarks || null);
  });

  // ============================
  // 4️⃣ Fonction pour démarrer une caméra
  // ============================
  async function startCamera(deviceId) {
    // Stop stream si déjà lancé
    if (videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach(t => t.stop());
      videoElement.srcObject = null;
    }

    const constraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        facingMode: "user",  // 🔥 Selfie en priorité
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    console.log("🎥 Start camera:", constraints);

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;

    await videoElement.play().catch(e => console.warn("play() err:", e));

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await mpPose.send({ image: videoElement });
      },
      width: 720,
      height: 1280
    });

    camera.start();
  }

  // ============================
  // 5️⃣ Brancher sur JustSwing
  // ============================
  JustSwing.setCameraStarter(async () => {
    const selectedDevice = cameraSelect.value;
    await startCamera(selectedDevice);
  });

  // ============================
  // 6️⃣ Quand on change la caméra
  // ============================
  cameraSelect.addEventListener("change", async () => {
    console.log("🔄 Changement caméra !");
    await JustSwing.startSession("swing");
  });

});
