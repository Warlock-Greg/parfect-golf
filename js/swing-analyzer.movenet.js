// === Parfect.golfr - Swing Analyzer (MoveNet + Overlay + Comparaison) ===
// Version stable 2025-11 — suit le corps, compare à une référence si dispo, donne une note /100.

(() => {
  const $ = (id) => document.getElementById(id);

  let detector = null;
  let initialized = false;

  // 🔗 Références vidéo (mets tes fichiers MP4 dans /assets/ref/ et ajuste les noms au besoin)
  const REF_BASE = "./assets/ref/";
  const REF_MAP = {
    rory_faceon: REF_BASE + "YTDown.com_Shorts_Rory-McIlroy-Driver-Swing-Slow-Motion-FO_Media_Y32QVpIA4As_001_720p.mp4",
    adam_dtl:    REF_BASE + "adam_dtl.mp4",
    nelly_faceon:REF_BASE + "nelly_faceon.mp4",
    jin_dtl:     REF_BASE + "jin_dtl.mp4",
  };

  // ————— UI helpers —————
  function say(msg, color = "#00ff99") {
    const el = $("analysis-result");
    if (!el) return;
    el.innerHTML = `<p style="color:${color};margin:6px 0;">${msg}</p>`;
  }
  function append(msg, color = "#ddd") {
    const el = $("analysis-result");
    if (!el) return;
    const p = document.createElement("p");
    p.style.color = color;
    p.style.margin = "4px 0";
    p.innerHTML = msg;
    el.appendChild(p);
  }

  // ————— Overlay canvas —————
  function ensureOverlayFor(video, idSuffix = "") {
    if (!video) return null;
    // conteneur parent positionné
    const parent = video.parentElement || video;
    parent.style.position = "relative";

    let canvas = parent.querySelector(`canvas.swing-overlay${idSuffix ? "-" + idSuffix : ""}`);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = `swing-overlay${idSuffix ? "-" + idSuffix : ""}`;
      canvas.style.position = "absolute";
      canvas.style.left = "50%";
      canvas.style.top = "0";
      canvas.style.transform = "translateX(-50%)";
      canvas.style.pointerEvents = "none";
      canvas.style.opacity = "0.9";
      parent.appendChild(canvas);
    }
    const w = video.videoWidth || video.clientWidth || 360;
    const h = video.videoHeight || video.clientHeight || 240;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    return ctx;
  }

  function drawSkeleton(ctx, keypoints, color = "rgba(0,255,153,0.9)") {
    if (!ctx || !keypoints) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Paires MoveNet (indices COCO)
    const PAIRS = [
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
      [11, 12], [5, 11], [6, 12], [11, 13], [13, 15], [12, 14], [14, 16]
    ];

    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    PAIRS.forEach(([a, b]) => {
      const A = keypoints[a], B = keypoints[b];
      if (A && B && A.score > 0.3 && B.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
    });

    keypoints.forEach((p) => {
      if (p.score > 0.3) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // ————— MoveNet —————
  async function ensureDetector() {
    if (detector) return detector;
    await tf.ready();
    try { await tf.setBackend("webgl"); } catch (_) {}
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
    );
    return detector;
  }

  // Échantillonne ~N frames sur la durée de la vidéo, dessine le squelette à chaque pas
  async function samplePosesFromVideo(video, ctx, color = "rgba(0,255,153,0.9)", frames = 40) {
    const det = await ensureDetector();
    const seq = [];
    if (!video.duration || isNaN(video.duration)) {
      // si la durée n'est pas prête, force un play-pause court pour init les metadata
      await video.play().catch(()=>{});
      video.pause();
    }

    const totalFrames = Math.max(8, Math.min(frames, 60));
    for (let i = 0; i < totalFrames; i++) {
      const t = (video.duration || 1) * (i / (totalFrames - 1));
      // seek
      video.currentTime = t;
      // attendre le seek
      await new Promise((resolve) => {
        const onSeek = () => { video.removeEventListener("seeked", onSeek); resolve(); };
        video.addEventListener("seeked", onSeek, { once: true });
      });
      // estimer
      const est = await det.estimatePoses(video, { flipHorizontal: false });
      if (est && est[0] && est[0].keypoints) {
        const kp = normalizeKeypoints(est[0].keypoints);
        seq.push(kp);
        if (ctx) drawSkeleton(ctx, kp, color);
        // petite pause pour laisser peindre le canvas
        await new Promise(r => setTimeout(r, 0));
      }
    }
    return seq;
  }

  // Normalise par largeur d'épaules pour rendre comparable les distances entre vidéos
  function normalizeKeypoints(kp) {
    if (!kp) return kp;
    const L = kp[5], R = kp[6];
    if (L && R && L.score > 0.2 && R.score > 0.2) {
      const scale = Math.max(20, Math.hypot(L.x - R.x, L.y - R.y)); // largeur épaules
      return kp.map(p => p ? { ...p, x: p.x / scale, y: p.y / scale } : p);
    }
    return kp;
  }

  // ————— Scores —————
  // similarité frame à frame sur points clés (épaules + hanches + coudes + genoux)
  function frameSimilarity(a, b) {
    if (!a || !b) return 0;
    const idx = [5, 6, 11, 12, 7, 8, 13, 14]; // épaules, hanches, coudes, genoux
    let sum = 0, n = 0;
    for (let i of idx) {
      const A = a[i], B = b[i];
      if (A && B && A.score > 0.2 && B.score > 0.2) {
        const dx = A.x - B.x;
        const dy = A.y - B.y;
        sum += Math.sqrt(dx * dx + dy * dy);
        n++;
      }
    }
    if (!n) return 0;
    // Plus la distance est petite, plus la similarité est grande.
    // Clamp simple pour obtenir ~[0..1]
    const avg = sum / n;
    return Math.max(0, 1 - avg); // avg proche de 0 → 1.0 ; >1 → 0
  }

  function sequenceSimilarity(seqA, seqB) {
    if (!seqA.length || !seqB.length) return 0;
    const N = Math.min(seqA.length, seqB.length);
    let s = 0;
    for (let i = 0; i < N; i++) {
      s += frameSimilarity(seqA[i], seqB[i]);
    }
    return s / N; // 0..1
  }

  // stabilité interne du swing : variation fluide d'une frame à l'autre
  function stability(seq) {
    if (seq.length < 2) return 0.5;
    let s = 0, n = 0;
    for (let i = 1; i < seq.length; i++) {
      s += frameSimilarity(seq[i], seq[i - 1]);
      n++;
    }
    return n ? (s / n) : 0.5; // 0..1
  }

  // Note finale :
  // - si ref dispo: 50% similarité à la ref + 50% stabilité
  // - sinon: 100% stabilité
  function finalScore(stab, simOrNull) {
    if (typeof simOrNull === "number") {
      return Math.round((0.5 * stab + 0.5 * simOrNull) * 100);
    }
    return Math.round(stab * 100);
  }

  // ————— Flux principal —————
  async function analyze(preview, refKeyOrNull) {
    const ctxUser = ensureOverlayFor(preview, "user");
    say("⏳ Analyse en cours…");

    // 1) séquence user
    const userSeq = await samplePosesFromVideo(preview, ctxUser, "rgba(0,255,153,0.9)", 40);
    const stab = stability(userSeq); // 0..1

    // 2) tentative ref si demandée
    let sim = null;
    if (refKeyOrNull && REF_MAP[refKeyOrNull]) {
      try {
        const refVideo = await ensureRefVideo(REF_MAP[refKeyOrNull]); // crée/charge <video id="ref-video">
        const ctxRef = ensureOverlayFor(refVideo, "ref");
        const refSeq = await samplePosesFromVideo(refVideo, ctxRef, "rgba(0,180,255,0.85)", 40);
        sim = sequenceSimilarity(userSeq, refSeq); // 0..1
      } catch (err) {
        console.warn("⚠️ Référence indisponible, fallback sans comparaison:", err);
        sim = null;
      }
    }

    // 3) score
    const score = finalScore(stab, sim);
    const parts = [
      `🧮 Note globale : <b>${score}/100</b>`,
      `🧘 Stabilité : ${(stab * 100).toFixed(0)}/100`
    ];
    if (typeof sim === "number") parts.push(`🎯 Similarité à la référence : ${(sim * 100).toFixed(0)}/100`);
    say(parts.join(" · "));

    // Feed coach si dispo
    if (typeof window.coachReact === "function") {
      window.coachReact(`🏌️ Swing analysé → ${score}/100 (${(stab * 100).toFixed(0)} stab${typeof sim === "number" ? `, ${(sim * 100).toFixed(0)} sim` : ""})`);
    }
  }

  // ————— Gestion de la vidéo de référence —————
  function ensureRefVideo(src) {
    return new Promise((resolve, reject) => {
      let v = $("ref-video");
      if (!v) {
        v = document.createElement("video");
        v.id = "ref-video";
        v.playsInline = true;
        v.muted = true;
        v.controls = false;
        v.style.maxWidth = "100%";
        v.style.marginTop = "8px";
        // on l’affiche en dessous de la vidéo user si présent
        const preview = $("video-preview");
        if (preview && preview.parentElement) {
          preview.parentElement.appendChild(v);
        } else {
          document.body.appendChild(v);
        }
      }
      v.src = src;
      v.onloadeddata = () => resolve(v);
      v.onerror = () => reject(new Error("Ref video load error: " + src));
      // iOS hack: play/pause pour init metadata si besoin
      v.play().then(()=>v.pause()).catch(()=>{});
    });
  }

  // ————— INIT —————
// ————— INIT —————
async function initSwingAnalyzer(retry = 0) {
  if (initialized) return;
  initialized = true;

  const preview = $("video-preview");
  const camInput = $("video-upload-camera");
  const libInput = $("video-upload-library");
  const analyzeBtn = $("analyze-btn");
  const refSelect = $("ref-swing");
  const uploadStatus = $("upload-status");

  // ✅ Tolérance : si pas encore trouvé, retente un peu plus tard
  if (!preview || !camInput || !libInput || !analyzeBtn || !refSelect || !uploadStatus) {
    console.warn(`⛔ Élément(s) manquant(s) pour le Swing Analyzer (tentative ${retry})`);
    initialized = false;
    if (retry < 10) setTimeout(() => initSwingAnalyzer(retry + 1), 300);
    return;
  }

  // Chargement du modèle MoveNet
  try {
    await ensureDetector();
  } catch (e) {
    console.error("MoveNet load failed:", e);
    say("❌ Échec chargement IA.", "#f55");
    initialized = false;
    return;
  }

  // 🎥 Fonction de preview commune
  function handleUpload(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = "block";
    preview.load();
    uploadStatus.textContent = "✅ Vidéo chargée, prête à être analysée.";
    uploadStatus.style.opacity = "1";
    setTimeout(() => (uploadStatus.style.opacity = "0"), 3000);
  }

  // 📱 Caméra
  camInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleUpload(file);
  });

  // 📂 Bibliothèque
  libInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleUpload(file);
  });

  // 🚀 Analyse
  analyzeBtn.addEventListener("click", async () => {
    if (!preview.src) {
      say("⚠️ Choisis ou filme une vidéo avant d’analyser.", "#f55");
      return;
    }

    const refKey = refSelect?.value || null;
    try {
      await analyze(preview, refKey);
    } catch (err) {
      console.error(err);
      say("❌ Erreur pendant l’analyse.", "#f55");
    }
  });

  console.log("✅ Swing Analyzer initialisé (MoveNet prêt).");
}


  // Expose global pour ton router
  window.initSwingAnalyzer = initSwingAnalyzer;
})();
