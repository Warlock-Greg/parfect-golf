// === swing-analyzer.movenet.js — Live + Pro Comparison (MVP) ===
// - Live MoveNet overlay on user's video
// - Optional "ghost" overlay from a reference pro swing
// - End-of-video similarity score (/100) + joint breakdown

console.log("🏌️ Swing Analyzer MoveNet — Live + Compare");

let detector = null;
let isLoadingModel = false;
let listenersBound = false;
let liveLoop = false;

let overlayCanvas = null;
let overlayCtx = null;

// Reference swing cache
let refVideo = null;
let refPoseNorm = null; // normalized pose ready to overlay
let refMeta = null;

// UI elems
const $ = (id) => document.getElementById(id);
const upload = $("video-upload");
const preview = $("video-preview");
const analyzeBtn = $("analyze-btn");
const resultBox = $("analysis-result");
const refSelect = $("ref-swing");

// --- Reference library (put your real mp4 URLs here)
const REF_SWINGS = {
  rory_faceon:  { url: "assets/ref/rory_faceon.mp4",  label: "Rory (FO)" },
  adam_dtl:     { url: "assets/ref/adam_dtl.mp4",     label: "Adam (DTL)" },
  nelly_faceon: { url: "assets/ref/nelly_faceon.mp4", label: "Nelly (FO)" },
  jin_dtl:      { url: "assets/ref/jin_dtl.mp4",      label: "Jin Young (DTL)" }
};

// === Overlay ===
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
  resizeOverlayToVideo();
}

function resizeOverlayToVideo() {
  if (!preview || !overlayCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const vw = preview.videoWidth || preview.clientWidth || 640;
  const vh = preview.videoHeight || preview.clientHeight || 360;
  overlayCanvas.width = vw * dpr;
  overlayCanvas.height = vh * dpr;
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// === Pose helpers ===
function kpByName(kps, name) {
  return kps.find((k) => k.name === name);
}

function drawPose(keypoints, style = { stroke: "rgba(0,255,153,0.9)", dot: "rgba(255,255,255,1)", width: 3 }) {
  if (!overlayCtx || !keypoints?.length) return;
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

  ctx.lineWidth = style.width;
  ctx.strokeStyle = style.stroke;
  ctx.fillStyle = style.dot;

  LINKS.forEach(([a, b]) => {
    const A = kpByName(keypoints, a), B = kpByName(keypoints, b);
    if (!A || !B || (A.score ?? 0) < 0.3 || (B.score ?? 0) < 0.3) return;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
  });

  keypoints.forEach((k) => {
    if ((k.score ?? 0) < 0.3) return;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function clearOverlay() {
  if (!overlayCtx || !overlayCanvas) return;
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

// === Normalization (box shoulders-hips) -> [0..1] then to overlay
function getBBox(kps) {
  const valid = kps.filter((k) => (k.score ?? 0) > 0.3);
  if (!valid.length) return { x: 0, y: 0, w: 1, h: 1 };
  const xs = valid.map((k) => k.x);
  const ys = valid.map((k) => k.y);
  const minx = Math.min(...xs), maxx = Math.max(...xs);
  const miny = Math.min(...ys), maxy = Math.max(...ys);
  return { x: minx, y: miny, w: Math.max(10, maxx - minx), h: Math.max(10, maxy - miny) };
}

function normalizePose(kps) {
  const box = getBBox(kps);
  return kps.map((k) => ({
    name: k.name,
    score: k.score,
    x: (k.x - box.x) / box.w,
    y: (k.y - box.y) / box.h,
  }));
}

function denormPoseToOverlay(normKps, targetBox) {
  // targetBox: fit in preview’s bbox (here we choose the user’s current bbox)
  return normKps.map((k) => ({
    name: k.name,
    score: k.score,
    x: targetBox.x + k.x * targetBox.w,
    y: targetBox.y + k.y * targetBox.h,
  }));
}

// === Similarity by joint angles ===
function angle(p1, p2, p3) {
  // angle at p2
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const n1 = Math.hypot(v1.x, v1.y), n2 = Math.hypot(v2.x, v2.y);
  if (!n1 || !n2) return null;
  let c = dot / (n1 * n2);
  c = Math.max(-1, Math.min(1, c));
  return Math.acos(c) * (180 / Math.PI);
}

function jointAngle(kps, a, b, c) {
  const A = kpByName(kps, a), B = kpByName(kps, b), C = kpByName(kps, c);
  if (!A || !B || !C || (A.score ?? 0) < 0.3 || (B.score ?? 0) < 0.3 || (C.score ?? 0) < 0.3) return null;
  return angle(A, B, C);
}

function compareAngles(user, ref) {
  const JOINTS = {
    shoulders: ["left_shoulder", "right_shoulder", "left_hip"], // proxy angle at left_shoulder
    elbowsL:   ["left_shoulder", "left_elbow", "left_wrist"],
    elbowsR:   ["right_shoulder","right_elbow","right_wrist"],
    hipsL:     ["left_shoulder","left_hip","left_knee"],
    hipsR:     ["right_shoulder","right_hip","right_knee"],
    kneesL:    ["left_hip","left_knee","left_ankle"],
    kneesR:    ["right_hip","right_knee","right_ankle"],
  };

  const diffs = {};
  Object.entries(JOINTS).forEach(([key, [a,b,c]]) => {
    const ua = jointAngle(user, a,b,c);
    const ra = jointAngle(ref,  a,b,c);
    if (ua == null || ra == null) { diffs[key] = null; return; }
    diffs[key] = Math.min(60, Math.abs(ua - ra)); // clamp
  });

  // score: 100 - scaled mean diff (0..60 -> 0..100 loss)
  const vals = Object.values(diffs).filter(v => v != null);
  const mean = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 60;
  const score = Math.round(100 - (mean / 60) * 100);
  return { score: Math.max(0, Math.min(100, score)), diffs };
}

// === MoveNet loading ===
async function loadModelOnce() {
  if (detector || isLoadingModel) return;
  isLoadingModel = true;
  try {
    if (typeof tf?.ready === "function") await tf.ready();
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: "SinglePose.Thunder" }
    );
    console.log("✅ MoveNet loaded (Thunder)");
  } catch (e) {
    console.error("❌ MoveNet error:", e);
    coachReact?.("⚠️ Erreur de chargement MoveNet.");
  } finally {
    isLoadingModel = false;
  }
}

// === Reference pose loading ===
async function loadReferencePose(selectedKey) {
  refPoseNorm = null;
  refMeta = null;

  const item = REF_SWINGS[selectedKey];
  if (!item) return;

  if (!refVideo) {
    refVideo = document.createElement("video");
    refVideo.muted = true;
    refVideo.playsInline = true;
    refVideo.crossOrigin = "anonymous";
    refVideo.style.display = "none";
    document.body.appendChild(refVideo);
  }
  refVideo.src = item.url;

  await new Promise((res) => {
    refVideo.onloadedmetadata = () => res();
    refVideo.onerror = () => res();
  });

  try {
    await refVideo.play().catch(()=>{});
    // take mid-frame
    const mid = Math.min(Math.max(refVideo.duration * 0.5, 0.2), (refVideo.duration || 1) - 0.2);
    refVideo.currentTime = mid;
    await new Promise((r) => (refVideo.onseeked = r));

    const poses = await detector.estimatePoses(refVideo);
    if (!poses?.[0]?.keypoints) return;
    refMeta = { w: refVideo.videoWidth, h: refVideo.videoHeight, label: item.label };
    refPoseNorm = normalizePose(poses[0].keypoints);
    coachReact?.(`📌 Référence chargée : ${item.label}`);
  } catch (e) {
    console.warn("Ref load/pose error:", e);
  } finally {
    refVideo.pause();
  }
}

// === Live loop ===
async function runLiveAnalysis() {
  if (!detector || !preview) return;
  if (preview.paused || preview.ended) return;

  try {
    const poses = await detector.estimatePoses(preview);
    clearOverlay();
    if (poses?.[0]?.keypoints) {
      const userKps = poses[0].keypoints;

      // Draw ghost (reference) if available — scale to user's bbox
      if (refPoseNorm) {
        const userBox = getBBox(userKps);
        const ghostKps = denormPoseToOverlay(refPoseNorm, userBox);
        drawPose(ghostKps, { stroke: "rgba(0,200,255,0.6)", dot: "rgba(200,240,255,0.9)", width: 2 });
      }

      // Draw user live
      drawPose(userKps, { stroke: "rgba(0,255,153,0.9)", dot: "rgba(255,255,255,1)", width: 3 });
    }
  } catch (e) {
    // drop frame
  }
  if (liveLoop) requestAnimationFrame(runLiveAnalysis);
}

// === One-shot analysis at end ===
async function analyzeEndResult() {
  if (!detector) return;
  const poses = await detector.estimatePoses(preview);
  if (!poses?.[0]?.keypoints) return;

  // If have reference, compare on *same bbox normalization*
  let score = 0, breakdown = null;

  if (refPoseNorm) {
    const userKps = poses[0].keypoints;
    const userBox = getBBox(userKps);
    const userNorm = normalizePose(userKps);
    const refToUser = denormPoseToOverlay(refPoseNorm, userBox); // for drawing
    drawPose(refToUser, { stroke:"rgba(0,200,255,0.7)", dot:"rgba(220,240,255,0.95)", width:2 });

    // compare in normalized space (scale-invariant)
    const cmp = compareAngles(userNorm, refPoseNorm);
    score = cmp.score;
    breakdown = cmp.diffs;
  } else {
    // fallback simple detection score
    const conf =
      poses[0].keypoints
        .filter(k => (k.score ?? 0) > 0)
        .reduce((a, k) => a + k.score, 0) / (poses[0].keypoints.length || 1);
    score = Math.round(conf * 100);
  }

  const pretty = (v) => v == null ? "–" : `${Math.round(100 - (v/60)*100)}%`;
  resultBox.innerHTML = `
    <h3>Résultat</h3>
    <p>🎯 Similarité globale : <strong style="color:#00ff99;font-size:1.3rem;">${score}/100</strong></p>
    ${
      breakdown ? `
      <div style="font-size:0.9rem;opacity:.9;margin-top:8px;">
        Épaules: ${pretty(breakdown.shoulders)} ·
        Coudes: ${pretty(avg(breakdown.elbowsL, breakdown.elbowsR))} ·
        Hanches: ${pretty(avg(breakdown.hipsL, breakdown.hipsR))} ·
        Genoux: ${pretty(avg(breakdown.kneesL, breakdown.kneesR))}
      </div>` : ""
    }
  `;
}

function avg(a, b){ if(a==null||b==null) return null; return (a+b)/2; }

// === Bind UI once ===
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

    // Load reference choice in background (if any)
    const refKey = refSelect?.value;
    if (refKey && REF_SWINGS[refKey]) {
      await loadReferencePose(refKey);
    } else {
      refPoseNorm = null;
      refMeta = null;
    }

    ensureOverlay();
    resizeOverlayToVideo();
    clearOverlay();

    liveLoop = true;
    await preview.play().catch(()=>{});
    runLiveAnalysis();

    preview.onended = async () => {
      liveLoop = false;
      await analyzeEndResult();
      coachReact?.("✅ Analyse terminée. Fais défiler pour revoir, ou recharge une autre vidéo.");
    };
  });

  // Keep overlay size in sync when user rotates phone etc.
  window.addEventListener("resize", resizeOverlayToVideo);
}

// === Entry point called by main.js ===
window.initSwingAnalyzer = async function initSwingAnalyzer() {
  bindSwingUIListenersOnce();
  ensureOverlay();
  if (!detector && !isLoadingModel) loadModelOnce();
  coachReact?.("🏌️‍♀️ Prêt : charge ta vidéo et clique sur Analyser. Choisis une référence pour le ‘ghost’ 💫");
};

