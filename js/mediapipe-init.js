// === MEDIAPIPE INIT – AUTO CAMERA (iPhone = Selfie / PC = Default) ===
// Version stable Safari + Chrome – Sans zoom forcé – Sans erreur play()

document.addEventListener("DOMContentLoaded", async () => {
  const videoElement = document.getElementById("jsw-video");

  if (!videoElement) {
    console.error("❌ jsw-video introuvable");
    return;
  }

  // 1️⃣ Détection iPhone / iPadOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // 2️⃣ Préférence de caméra
  // iPhone → Selfie
  // PC → user aussi, mais on fallback
  let preferredConstraints = {
    video: {
      facingMode: isIOS ? "user" : "user",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  async function tryGetStream(constraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      return null;
    }
  }

  // 3️⃣ Tentative caméra selfie
  let stream = await tryGetStream(preferredConstraints);

  // 4️⃣ Si échec → fallback automatique
  if (!stream) {
    console.warn("⚠️ Selfie impossible → fallback caméra par défaut");
    stream = await tryGetStream({ video: true, audio: false });
  }

  if (!stream) {
    console.error("❌ Impossible d'accéder à AUCUNE caméra");
    return;
  }

  // 5️⃣ Branche la caméra dans la vidéo
  videoElement.srcObject = stream;

  // ⚠️ Safari nécessite une boucle pour être sûr que play() passe
  const ensurePlay = () =>
    videoElement.play().catch(() => {
      setTimeout(ensurePlay, 50);
    });

  ensurePlay();

  // 6️⃣ MediaPipe pose
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

  // 7️⃣ Camera utils (lecture en continu)
  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await mpPose.send({ image: videoElement });
    },
  });

  camer
