// === MEDIAPIPE INIT — Version stable et compatible CDN ===
// Fonctionne avec :
// https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js
// https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js

document.addEventListener("DOMContentLoaded", () => {
  window.startJustSwingCamera = async function () {
    console.log("🎥 Initialisation caméra + MediaPipe Pose…");

    const videoEl = document.getElementById("jsw-video");
    if (!videoEl) {
      console.error("❌ jsw-video manquant");
      return null;
    }

    // ----------------------------
    // 1) Ouvre la caméra
    // ----------------------------
    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false
      });
    } catch (err) {
      console.warn("⚠️ Selfie KO, fallback caméra arrière", err);
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    }

    videoEl.srcObject = stream;
    videoEl.style.transform = "scaleX(-1)"; // miroir

    const ensurePlay = () => 
      videoEl.play().catch(() => setTimeout(ensurePlay, 50));
    ensurePlay();

    // ----------------------------
    // 2) Initialise POSE
    // ----------------------------
    const mpPose = new Pose.Pose({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    mpPose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      selfieMode: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    let mpReady = false;

    mpPose.onResults(res => {
      mpReady = true;
      window.__lastPose = res.poseLandmarks; // debug global
      if (window.JustSwing?.onPoseFrame) {
        window.JustSwing.onPoseFrame(res.poseLandmarks);
      }
    });

    // ----------------------------
    // 3) Boucle caméra → pose.send()
    // ----------------------------
    const camera = new CameraUtils.Camera(videoEl, {
      onFrame: async () => {
        if (!mpReady) {
          try {
            await mpPose.initialize();
            mpReady = true;
          } catch (err) {
            console.warn("⚠️ Pose init error:", err);
            return;
          }
        }

        try {
          await mpPose.send({ image: videoEl });
        } catch (err) {
          console.warn("⚠️ Pose.send FAILED", err);
        }
      },
      width: 1280,
      height: 720
    });

    camera.start();

    console.log("📸 Caméra + Pose opérationnels ✔");
    return stream;
  };
});
