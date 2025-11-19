// === MEDIAPIPE INIT SANS CAMERA UTILS — Version stable mobile & desktop ===
// Fonctionne iPhone, Android, Desktop — évite tous les crash de type ROI>0

document.addEventListener("DOMContentLoaded", async () => {
  const videoElement = document.getElementById("jsw-video");
  if (!videoElement) {
    console.error("❌ jsw-video introuvable");
    return;
  }

  console.log("🎥 Initialisation caméra…");

  // 1️⃣ Sélection caméra : Selfie par défaut
  let constraints = {
    video: {
      facingMode: "user", // selfie
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  // 2️⃣ Ouverture de la caméra
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn("⚠️ Selfie KO → fallback caméra par défaut");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err2) {
      console.error("❌ Aucune caméra accessible", err2);
      return;
    }
  }

  videoElement.srcObject = stream;

  // 3️⃣ Attendre que la vidéo soit prête
  await new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      if (videoElement.videoWidth > 0) resolve();
    };
  });

  await videoElement.play().catch(() => {});

  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;

  console.log(`📸 Vidéo prête : ${vw}x${vh}`);

  // Fixer dimensions (très important)
  videoElement.width = vw;
  videoElement.height = vh;

  // 4️⃣ Initialisation MediaPipe Pose
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
    // Envoi vers JustSwing
    if (window.JustSwing && JustSwing.onPoseFrame) {
      JustSwing.onPoseFrame(results.poseLandmarks || null);
    }
  });

  console.log("🧠 MediaPipe Pose prêt. Boucle de traitement lancée.");

  // 5️⃣ Boucle de traitement maison (évite les crashs)
  async function processFrame() {
    if (videoElement.readyState >= 2) {
      try {
        await mpPose.send({ image: videoElement });
      } catch (err) {
        console.warn("⚠️ mpPose.send a échoué mais on continue :", err);
      }
    }
    requestAnimationFrame(processFrame);
  }

  requestAnimationFrame(processFrame);
});
