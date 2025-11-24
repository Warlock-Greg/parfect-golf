// === MEDIAPIPE INIT — VERSION FINALE JUSTSWING (STABLE iPhone + Android + Desktop) ===

// ⚠️ Doit être chargé AVANT justSwing.js
// ⚠️ Ne rien modifier dans jsw-video (pas de transform inline)

document.addEventListener("DOMContentLoaded", () => {

  window.startJustSwingCamera = async function () {
    console.log("🎥 JustSwing → Initialisation caméra…");

    const videoEl = document.getElementById("jsw-video");
    if (!videoEl) {
      console.error("❌ jsw-video introuvable");
      return null;
    }

    let stream = null;

    // =============================
    // 1️⃣ Tentative Selfie directe
    // =============================
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch (err) {
      console.warn("⚠️ Selfie KO → fallback caméra par défaut", err);

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (err2) {
        console.error("❌ Aucune caméra accessible", err2);
        return null;
      }
    }

    // =============================
    // 2️⃣ Associer flux → vidéo
    // =============================
    videoEl.srcObject = stream;

    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    const isSelfie =
      settings.facingMode === "user" ||
      settings.facingMode === "front" ||
      settings.facingMode === "selfie";

    // 🎭 Miroir SELFIE (sans translate, sans X/Y)
    videoEl.style.transform = isSelfie ? "scaleX(-1)" : "none";

    // =============================
    // 3️⃣ Safari autoplay fix
    // =============================
    const ensurePlay = () =>
      videoEl.play().catch(() => setTimeout(ensurePlay, 50));
    ensurePlay();

    // Quand la vidéo a ses dimensions ↴ on peut calibrer le canvas
    videoEl.addEventListener("loadedmetadata", () => {
      console.log(
        `📸 Caméra OK : ${videoEl.videoWidth}x${videoEl.videoHeight} (Selfie=${isSelfie})`
      );

      if (window.JustSwing?.resizeOverlay)
        window.JustSwing.resizeOverlay(); // ← ajustement overlay
    });

    // =============================
    // 4️⃣ Setup MediaPipe Pose
    // =============================
    const mpPose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    mpPose.setOptions({
      modelComplexity: 2,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    mpPose.onResults((results) => {
      // Envoie des landmarks vers le moteur JustSwing
      if (window.JustSwing?.onPoseFrame) {
        window.JustSwing.onPoseFrame(results.poseLandmarks || null);
      }
    });

    // =============================
    // 5️⃣ Boucle frame → MediaPipe
    // =============================
    async function processFrame() {
      if (videoEl.readyState >= 2) {
        try {
          await mpPose.send({ image: videoEl });
        } catch (err) {
          console.warn("⚠️ MediaPipe error", err);
          // On continue sans bloquer
        }
      }
      requestAnimationFrame(processFrame);
    }

    console.log("🧠 MediaPipe Pose initialisé ✔");
    processFrame();

    return stream;
  };
});
