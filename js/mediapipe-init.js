window.startJustSwingCamera = async function() {
  console.log("🎥 Démarrage caméra pour JustSwing…");

  const videoElement = document.getElementById("jsw-video");
  if (!videoElement) {
    console.error("❌ jsw-video introuvable");
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user", // 🟢 toujours selfie pour JustSwing
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
  } catch (err) {
    console.warn("⚠️ Selfie échec, fallback caméra par défaut");
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }

  if (!stream) {
    console.error("❌ Impossible d'accéder à UNE caméra");
    return null;
  }

  videoElement.srcObject = stream;
// Détection auto selfie VS back-camera
const track = stream.getVideoTracks()[0];
const settings = track.getSettings();
const isSelfie = settings.facingMode === "user" || settings.facingMode === "front";

// Miroir seulement en selfie
videoElement.style.transform = isSelfie
  ? "translate(-50%, -50%) scaleX(-1)"
  : "translate(-50%, -50%)";

  
  // Safari fix
  const ensurePlay = () => videoElement.play().catch(() => setTimeout(ensurePlay, 50));
  ensurePlay();

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

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      try {
        await mpPose.send({ image: videoElement });
      } catch (err) {
        console.warn("⚠️ Erreur mpPose.send", err);
      }
    },
  });

  camera.start();

  console.log("📸 JustSwing Camera OK");
  return stream;
};
