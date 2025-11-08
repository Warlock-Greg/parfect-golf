// === swing-analyzer.movenet.js — Parfect.golfr (MVP stable) ===
(() => {
  const $ = (id) => document.getElementById(id);

  let detector = null;
  let initialized = false;

  // --- UI helpers ---
  function showUploadStatus(msg) {
    const el = $("upload-status");
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = "1";
    setTimeout(() => (el.style.opacity = "0"), 2200);
  }

  // --- Overlay (squelette) ---
  function ensureOverlayCanvas(videoEl, id) {
    let canvas = document.getElementById(id);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = id;
      canvas.style.position = "absolute";
      canvas.style.left = "50%";
      canvas.style.transform = "translateX(-50%)";
      canvas.style.top = videoEl.offsetTop + "px";
      canvas.style.pointerEvents = "none";
      canvas.style.opacity = "0.9";
      videoEl.parentElement.style.position = "relative";
      videoEl.parentElement.appendChild(canvas);
    }
    // adapte la taille au tag <video>
    canvas.width = videoEl.clientWidth || videoEl.videoWidth || 360;
    canvas.height = videoEl.clientHeight || videoEl.videoHeight || 240;
    return canvas.getContext("2d");
  }

  function drawSkeleton(ctx, keypoints) {
    if (!keypoints || !keypoints.length) return;
    const kp = keypoints;

    // paires classiques (MediaPipe/MoveNet indices)
    const PAIRS = [
      [5, 6],  // épaules
      [5, 7], [7, 9],   // bras gauche
      [6, 8], [8, 10],  // bras droit
      [11, 12],         // hanches
      [5, 11], [6, 12], // tronc
      [11, 13], [13, 15], // jambe gauche
      [12, 14], [14, 16], // jambe droite
    ];

    // points
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,255,153,0.9)";
    ctx.fillStyle = "rgba(0,255,153,0.9)";

    // segments
    PAIRS.forEach(([a, b]) => {
      const A = kp[a], B = kp[b];
      if (A && B && A.x != null && B.x != null) {
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
    });

    // joints
    kp.forEach((p) => {
      if (p && p.x != null) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // --- Détection MoveNet ---
  async function buildDetector() {
    await tf.ready();
    try {
      await tf.setBackend("webgl");
    } catch (_) { /* ignore */ }

    const config = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER, // ✅ bon enum
    };
    return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, config);
  }

  async function estimateFromElement(video, frames = 48, overlayCtx = null) {
    const poses = [];
    const dur = video.duration || 0;

    // if duration unknown, try a tiny delay
    if (!dur) await new Promise((r) => setTimeout(r, 200));
    const total = Math.min(frames, Math.max(10, Math.floor((video.duration || 6) * 6)));

    for (let i = 0; i < total; i++) {
      const t = (video.duration || 1) * (i / (total - 1));
      try {
        video.currentTime = t;
      } catch (_) {}
      await new Promise((r) => (video.onseeked = () => r()));
      const est = await detector.estimatePoses(video, { flipHorizontal: false });
      if (est && est[0]) {
        const kp = (est[0].keypoints3D || est[0].keypoints || []).map((p) => ({
          x: p.x,
          y: p.y,
        }));
        poses.push(kp);
        if (overlayCtx) {
          overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
          drawSkeleton(overlayCtx, kp);
        }
      }
    }
    return poses;
  }

  async function estimateFromURL(url, overlayTargetId) {
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.src = url;
      v.muted = true;
      v.playsInline = true;
      v.onloadeddata = async () => {
        try {
          const overlayCtx = ensureOverlayCanvas(v, overlayTargetId);
          const poses = await estimateFromElement(v, 48, overlayCtx);
          resolve(poses);
        } catch (err) {
          reject(err);
        }
      };
      v.onerror = () => reject(new Error("Ref video load error"));
      // on doit l’injecter pour qu’il ait des dimensions correctes
      document.body.appendChild(v);
      v.style.position = "absolute";
      v.style.left = "-9999px";
      v.style.top = "0";
    });
  }

  // --- Scoring ---
  function frameSimilarity(kpA, kpB) {
    if (!kpA || !kpB) return 0;
    const idxs = [5, 6, 7, 8, 11, 12, 13, 14]; // épaules, coudes, hanches, genoux

    function norm(kp) {
      const pts = idxs.map((i) => (kp[i] ? [kp[i].x, kp[i].y] : [0, 0]));
      // échelle = distance hanches
      const hL = kp[11], hR = kp[12];
      const scale = hL && hR ? Math.hypot(hL.x - hR.x, hL.y - hR.y) || 1 : 1;
      return pts.flat().map((v) => v / scale);
    }

    const a = norm(kpA), b = norm(kpB);
    const len = Math.min(a.length, b.length);
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (!na || !nb) return 0;
    const cos = dot / (Math.sqrt(na) * Math.sqrt(nb));
    return Math.max(0, Math.min(1, cos));
  }

  function compareSequences(user, ref) {
    const n = Math.min(user.length, ref.length);
    if (!n) return 50;
    let acc = 0;
    for (let i = 0; i < n; i++) acc += frameSimilarity(user[i], ref[i]);
    const sim = acc / n;            // 0..1
    return 50 + sim * 50;           // 50..100
  }

  function stabilityScore(seq) {
    if (!seq.length) return 40;
    const diffs = [];
    for (let i = 1; i < seq.length; i++) {
      const prev = seq[i - 1], cur = seq[i];
      let s = 0, c = 0;
      [5, 6, 11, 12].forEach((j) => {
        if (prev[j] && cur[j]) {
          s += Math.hypot(cur[j].x - prev[j].x, cur[j].y - prev[j].y);
          c++;
        }
      });
      if (c) diffs.push(s / c);
    }
    const mean = diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1);
    const normalized = Math.max(0, 1 - Math.min(1, mean * 4)); // heuristique simple
    return 50 + normalized * 30; // 50..80
  }

  async function analyzeSwing(userVideoEl, refKey) {
    const REF_BASE = "https://warlock-greg.github.io/parfect-golf/assets/ref/";
    const REF_MAP = {
      rory_faceon: "rory_faceon.mp4",
      adam_dtl: "adam_dtl.mp4",
      nelly_faceon: "nelly_faceon.mp4",
      jin_dtl: "jin_dtl.mp4",
    };

    const userCtx = ensureOverlayCanvas(userVideoEl, "user-overlay");

    // 1) Poses utilisateur
    const userSeq = await estimateFromElement(userVideoEl, 48, userCtx);

    // 2) Poses de référence (si dispo)
    let score = 60;
    if (REF_MAP[refKey]) {
      try {
        const refSeq = await estimateFromURL(REF_BASE + REF_MAP[refKey], "ref-overlay");
        score = compareSequences(userSeq, refSeq);
      } catch (e) {
        console.warn("Référence indisponible → fallback:", e);
        score = stabilityScore(userSeq);
      }
    } else {
      score = stabilityScore(userSeq);
    }

    // borne 0..100
    score = Math.max(0, Math.min(100, Math.round(score)));
    return score;
  }

  // --- INIT (appelée par le router quand on ouvre l’onglet Swing) ---
  async function initSwingAnalyzer() {
    if (initialized) return; // évite les doubles init
    initialized = true;

    try {
      const container = $("swing-analyzer");
      const preview = $("video-preview");
      const uploadCam = $("video-upload-camera");
      const uploadLib = $("video-upload-library");
      const analyzeBtn = $("analyze-btn");
      const refSelect = $("ref-swing");
      const resultBox = $("analysis-result");

      if (!container || !preview || !uploadCam || !uploadLib || !analyzeBtn || !refSelect) {
        console.warn("Swing Analyzer: éléments DOM manquants");
        initialized = false; // on permettra une réinit plus tard
        return;
      }

      // Fichiers (caméra + bibliothèque)
      function handleFileInputChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.style.display = "block";
        preview.load();
        showUploadStatus("✅ Vidéo chargée !");
        resultBox.innerHTML = "";
      }
      uploadCam.addEventListener("change", handleFileInputChange);
      uploadLib.addEventListener("change", handleFileInputChange);

      // MoveNet
      if (!detector) detector = await buildDetector();

      // Lancer l’analyse
      analyzeBtn.addEventListener("click", async () => {
        if (!preview.src) {
          showUploadStatus("⚠️ Charge d’abord une vidéo !");
          return;
        }
        showUploadStatus("⏳ Analyse en cours...");
        try {
          const score = await analyzeSwing(preview, refSelect.value);
          resultBox.innerHTML = `<div style="margin-top:8px;">🧮 Note : <b>${score}/100</b></div>`;
          showUploadStatus("✅ Analyse terminée");
          if (typeof window.coachReact === "function") {
            coachReact(`🏌️‍♂️ Analyse swing : ${score}/100`);
          }
        } catch (err) {
          console.error("Analyse error:", err);
          showUploadStatus("❌ Erreur pendant l’analyse.");
        }
      });
    } catch (err) {
      console.error("Swing Analyzer init error:", err);
      initialized = false;
    }
  }

  // Export global (utilisé par le router)
  window.initSwingAnalyzer = initSwingAnalyzer;
})();
