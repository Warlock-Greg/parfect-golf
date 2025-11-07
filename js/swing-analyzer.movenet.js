// === swing-analyzer.movenet.js — Version Live Feedback ===
// Analyse du swing avec MoveNet (TensorFlow.js) + squelette en direct
// Compatible mobile (iPhone / Android) et desktop

console.log("🏌️ Swing Analyzer MoveNet — Live Feedback");

let detector = null;
let isLoadingModel = false;
let listenersBound = false;
let liveLoop = false;

// Overlay canvas
let overlayCanvas = null;
let overlayCtx = null;

// === Helpers ===
const $ = (id) => document.getElementById(id);
const upload = $("video-upload");
const preview = $("video-preview");
const analyzeBtn = $("analyze-btn");
const resultBox = $("analysis-result");

// === Overlay setup ===
function ensureOverlay() {
  const video = $("video-preview");
  if (!video) return;

  if (overlayCanvas && overlayCanvas.isConnected) return;

  // Crée un conteneur relatif autour de la vidéo
  if (!video.parentElement || video.parentElement.id !== "swing-stage") {
    const stage = document.createElement("div");
    stage.id = "swing-stage";
    stage.style.position = "relative";
    stage.style.display = "inline-block";
    stage.style.maxWidth = "100%";
    video.parentElement.insertBefore(stage, video);
    stage.appendChild(video);
  }

  // Canvas overlay
  overlayCanvas = document.createElement("canvas");
  overlayCanvas.id = "swing-overlay";
  overlayCanvas.style.position = "absolute";
  overlayCanvas.style.inset = "0";
  overlayCanvas.style.pointerEvents = "none";
  overlayCanvas.style.width = "100%";
  overlayCanvas.style.height = "100%";
  overlayCanvas.style.zIndex = "10";

  video.parentElement.appendChild(overlayCanvas);
  overlayCtx = overlayCanvas.getContext("2d");
  resizeOverlayToVideo();
}

function resizeOverlayToVideo() {
  const video = $("video-preview");
  if (!video || !overlayCanvas) return;

  const dpr = window.devicePixelRatio || 1;
  const vw = video.videoWidth || video.clientWidth || 640;
  const vh = video.videoHeight || video.clientHeight || 360;

  overlayCanvas.width = vw * dpr;
  overlayCanvas.height = vh * dpr;
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// === Dessin du squelette MoveNet ===
function drawPose(keypoints) {
  if (!overlayCtx || !keypoints?.length) return;
  const ctx = overlayCtx;
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  const LINKS = [
    ["left_shoulder", "right_shoulder"],
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
    ["left_hip", "right_hip"],
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
  ];

  const by = (name) =>
    keypoints.find((k) => k.name === name && (k.score ?? 0) > 0.3);

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,255,153,0.8)";
  LINKS.forEach(([a, b]) => {
    const A = by(a),
      B = by(b);
    if (!A || !B) return;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  keypoints.forEach((k) => {
    if ((k.score ?? 0) < 0.3) return;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// === Chargement du modèle MoveNet ===
async function loadModelOnce() {
  if (detector || isLoadingModel) return;
  isLoadingModel = true;
  try {
    if (typeof tf?.ready === "function") await tf.ready();
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: "SinglePose.Thunder" } // Thunder = plus précis que Lightning
    );
    console.log("✅ MoveNet chargé (Thunder)");
  } catch (err) {
    console.error("❌ Erreur MoveNet :", err);
    coachReact?.("⚠️ Erreur de chargement du modèle MoveNet.");
  } finally {
    isLoadingModel = false;
  }
}

// === Analyse continue (live feedback) ===
async function runLiveAnalysis() {
  if (!detector || !preview) return;
  if (preview.paused || preview.ended) return; // stop si la vidéo est terminée

  try {
    const poses = await detector.estimatePoses(preview);
    if (poses?.[0]?.keypoints) drawPose(poses[0].keypoints);
  } catch (e) {
    console.warn("⚠️ Frame skip:", e.message);
  }

  if (liveLoop) requestAnimationFrame(runLiveAnalysis);
}

// === Lancer une analyse unique (score final) ===
async function analyzeFrameOnce() {
  if (!detector || !preview) return;
  const poses = await detector.estimatePoses(preview);
  if (!poses?.length) return 0;
  const score = computeSwingScore(poses[0].keypoints);
  drawPose(poses[0].keypoints);
  return score;
}

// === Score simplifié ===
function computeSwingScore(keypoints) {
  const by = (name) => keypoints.find((k) => k.name === name)?.score ?? 0;
  const upper =
    (by("left_shoulder") +
      by("right_shoulder") +
      by("left_elbow") +
      by("right_elbow")) /
    4;
  const lower =
    (by("left_hip") +
      by("right_hip") +
      by("left_knee") +
      by("right_knee") +
      by("left_ankle") +
      by("right_ankle")) /
    6;
  const raw = Math.round((upper * 0.6 + lower * 0.4) * 100);
  return Math.max(0, Math.min(100, raw));
}

// === UI Bindings ===
function bindSwingUIListenersOnce() {
  if (listenersBound) return;
  listenersBound = true;

  upload?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = "block";
    preview.load();
    preview.onloadedmetadata = () => {
      ensureOverlay();
      resizeOverlayToVideo();
    };
    coachReact?.("🎥 Vidéo chargée. Clique sur Analyser pour lancer le suivi en direct !");
  });

  analyzeBtn?.addEventListener("click", async () => {
    await loadModelOnce();
    if (!detector) return;

    coachReact?.("🧠 Analyse en direct… Bouge ton swing !");
    ensureOverlay();
    resizeOverlayToVideo();

    liveLoop = true;
    await preview.play().catch(() => {});
    runLiveAnalysis();

    // Stop loop quand la vidéo se termine
    preview.onended = async () => {
      liveLoop = false;
      const score = await analyzeFrameOnce();
      resultBox.innerHTML = `
        <h3>Résultat final</h3>
        <p>🧩 Précision du swing :
        <strong style="color:#00ff99;font-size:1.3rem;">${score}/100</strong></p>`;
      coachReact?.(
        score > 85
          ? "🔥 Excellent swing ! Alignement parfait."
          : score > 70
          ? "💪 Bon rythme ! Quelques ajustements à peaufiner."
          : "⚙️ Position perfectible — focus sur les appuis et la rotation."
      );
    };
  });
}

// === Entrée principale appelée par main.js ===
window.initSwingAnalyzer = async function initSwingAnalyzer() {
  bindSwingUIListenersOnce();
  ensureOverlay();

  const vid = $("video-preview");
  vid?.addEventListener("loadedmetadata", resizeOverlayToVideo, { once: true });

  if (!detector && !isLoadingModel) loadModelOnce();
  coachReact?.("🏌️‍♀️ Prêt pour ton analyse en direct ! Charge ta vidéo ci-dessous.");
};
