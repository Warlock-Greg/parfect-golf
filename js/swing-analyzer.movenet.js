// === swing-analyzer.movenet.js — Live Sync Comparison (user + pro) ===
// MoveNet Thunder + comparaison frame-by-frame en direct
// Ghost overlay bleu qui suit le swing du joueur

console.log("🏌️ MoveNet — Live synchronized ghost mode");

let detector = null;
let isLoadingModel = false;
let listenersBound = false;
let liveLoop = false;

// UI elements
const $ = (id) => document.getElementById(id);
const upload = $("video-upload");
const preview = $("video-preview");
const analyzeBtn = $("analyze-btn");
const refSelect = $("ref-swing");
const resultBox = $("analysis-result");

// overlay
let overlayCanvas = null;
let overlayCtx = null;

// ref video + cache
let refVideo = null;
let refReady = false;

// --- References (replace URLs as needed)
const REF_SWINGS = {
 // Helper: préfixe pour GitHub Pages
const REF_BASE = location.hostname.endsWith("github.io") ? "/parfect-golf" : "";

const REF_SWINGS = {
  rory_faceon:  { url: `${REF_BASE}/assets/ref/rory_faceon.mp4`,  label: "Rory McIlroy" },
  adam_dtl:     { url: `${REF_BASE}/assets/ref/adam_dtl.mp4`,     label: "Adam Scott"   },
  nelly_faceon: { url: `${REF_BASE}/assets/ref/nelly_faceon.mp4`, label: "Nelly Korda"  },
  jin_dtl:      { url: `${REF_BASE}/assets/ref/jin_dtl.mp4`,      label: "Jin Young Ko" }
};

async function loadReference(selected) {
  if (!selected || !REF_SWINGS[selected]) return false;
  const item = REF_SWINGS[selected];

  if (!refVideo) {
    refVideo = document.createElement("video");
    refVideo.muted = true;
    refVideo.playsInline = true;
    refVideo.crossOrigin = "anonymous"; // ok même en same-origin
    refVideo.style.display = "none";
    document.body.appendChild(refVideo);
  }

  return new Promise((resolve) => {
    refVideo.onerror = () => {
      console.error("❌ Référence introuvable :", item.url);
      coachReact?.("⚠️ Vidéo de référence introuvable. Vérifie le chemin et le nom du fichier.");
      resolve(false);
    };
    refVideo.onloadedmetadata = () => {
      console.log("🎬 Référence prête :", item.label);
      resolve(true);
    };
    refVideo.src = item.url;
    refVideo.load();
  });
}


// === Setup overlay ===
function ensureOverlay() {
  if (!preview) return;
  if (overlayCanvas && overlayCanvas.isConnected) return;

  if (!preview.parentElement || preview.parentElement.id !== "swing-stage") {
    const stage = document.createElement("div");
    stage.id = "swing-stage";
    stage.style.position = "relative";
    stage.style.display = "inline-block";
    stage.style.maxWidth = "100%";
    preview.parentElement.insertBefore(stage, preview);
    stage.appendChild(preview);
  }
  overlayCanvas = document.createElement("canvas");
  overlayCanvas.id = "swing-overlay";
  overlayCanvas.style.position = "absolute";
  overlayCanvas.style.inset = "0";
  overlayCanvas.style.pointerEvents = "none";
  overlayCanvas.style.width = "100%";
  overlayCanvas.style.height = "100%";
  overlayCanvas.style.zIndex = "10";
  preview.parentElement.appendChild(overlayCanvas);
  overlayCtx = overlayCanvas.getContext("2d");
  resizeOverlay();
}

function resizeOverlay() {
  const dpr = window.devicePixelRatio || 1;
  const vw = preview.videoWidth || preview.clientWidth || 640;
  const vh = preview.videoHeight || preview.clientHeight || 360;
  overlayCanvas.width = vw * dpr;
  overlayCanvas.height = vh * dpr;
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// === Load MoveNet ===
async function loadModelOnce() {
  if (detector || isLoadingModel) return;
  isLoadingModel = true;
  try {
    if (typeof tf?.ready === "function") await tf.ready();
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: "SinglePose.Thunder" }
    );
    console.log("✅ MoveNet prêt (Thunder)");
  } catch (e) {
    console.error("❌ Erreur MoveNet :", e);
  } finally {
    isLoadingModel = false;
  }
}

// === Draw helpers ===
function drawPose(kps, color = "rgba(0,255,153,0.9)") {
  if (!overlayCtx || !kps?.length) return;
  const ctx = overlayCtx;
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

  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.fillStyle = color.replace("0.9", "1");

  LINKS.forEach(([a, b]) => {
    const A = kps.find((k) => k.name === a && (k.score ?? 0) > 0.3);
    const B = kps.find((k) => k.name === b && (k.score ?? 0) > 0.3);
    if (!A || !B) return;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
  });

  kps.forEach((k) => {
    if ((k.score ?? 0) < 0.3) return;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function clearOverlay() {
  overlayCtx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

// === Load pro reference ===
async function loadReference(selected) {
  if (!selected || !REF_SWINGS[selected]) return false;
  const item = REF_SWINGS[selected];
  if (!refVideo) {
    refVideo = document.createElement("video");
    refVideo.muted = true;
    refVideo.playsInline = true;
    refVideo.crossOrigin = "anonymous";
    refVideo.style.display = "none";
    document.body.appendChild(refVideo);
  }
  refVideo.src = item.url;
  refReady = false;
  await new Promise((res) => {
    refVideo.onloadedmetadata = () => res();
    refVideo.onerror = () => res();
  });
  refReady = true;
  console.log("🎬 Référence prête :", item.label);
  return true;
}

// === Loop ===
async function runLiveComparison() {
  if (!detector || !preview) return;
  if (preview.paused || preview.ended) return;

  try {
    const [userPoses, refPoses] = await Promise.all([
      detector.estimatePoses(preview),
      refVideo && !refVideo.paused ? detector.estimatePoses(refVideo) : [null],
    ]);

    clearOverlay();

    if (refPoses?.[0]?.keypoints) {
      drawPose(refPoses[0].keypoints, "rgba(0,180,255,0.7)"); // bleu pro
    }

    if (userPoses?.[0]?.keypoints) {
      drawPose(userPoses[0].keypoints, "rgba(0,255,153,0.9)"); // vert joueur
    }
  } catch (e) {
    // drop frame
  }

  if (liveLoop) requestAnimationFrame(runLiveComparison);
}

// === Event Bindings ===
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
    preview.onloadedmetadata = resizeOverlay;
    coachReact?.("🎥 Vidéo chargée. Clique sur Analyser pour lancer le mode comparatif !");
  });

  analyzeBtn?.addEventListener("click", async () => {
    await loadModelOnce();
    if (!detector) return;

    // Load reference video
    const refKey = refSelect?.value;
    await loadReference(refKey);

    ensureOverlay();
    resizeOverlay();
    clearOverlay();

    liveLoop = true;

    // Play both videos in sync
    preview.currentTime = 0;
    refVideo.currentTime = 0;
    await preview.play().catch(()=>{});
    await refVideo.play().catch(()=>{});

    coachReact?.("🏁 Analyse live : ton swing est comparé à " + REF_SWINGS[refKey].label);

    runLiveComparison();

    preview.onended = () => {
      liveLoop = false;
      refVideo.pause();
      coachReact?.("✅ Fin de la comparaison.");
    };
  });

  window.addEventListener("resize", resizeOverlay);
}

// === Init entry point ===
window.initSwingAnalyzer = async function initSwingAnalyzer() {
  bindSwingUIListenersOnce();
  ensureOverlay();
  if (!detector && !isLoadingModel) loadModelOnce();
  coachReact?.("🏌️‍♀️ Mode comparaison live prêt — charge ta vidéo et choisis ton pro 🧢");
};
