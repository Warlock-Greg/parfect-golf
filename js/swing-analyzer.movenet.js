// === Parfect.golfr - Swing Analyzer (MoveNet + Overlay + Comparaison) ===
// Version stable 2025-11 — overlay squelette, comparaison à une référence, note /100.

(() => {
  const $ = (id) => document.getElementById(id);

  let detector = null;
  let initialized = false;

  // 🔗 Références vidéo (mets tes fichiers MP4 dans /assets/ref/ et adapte les noms)
  const REF_BASE = "./assets/ref/";
  const REF_MAP = {
    rory_faceon:  REF_BASE + "rory_faceon.mp4",
    adam_dtl:     REF_BASE + "adam_dtl.mp4",
    nelly_faceon: REF_BASE + "nelly_faceon.mp4",
    jin_dtl:      REF_BASE + "jin_dtl.mp4",
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
    const parent = video.parentElement || video;
    parent.style.position = "relative";

    let canvas = parent.querySelector(`canvas.swing-overlay${idSuffix ? "-" + idSuffix : ""}`);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = `swing-overlay${idSuffix ? "-" + idSuffix : ""}`;
      canvas.style.position = "absolute";
      canvas.style.left = "0";
      canvas.style.top = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.opacity = "0.95";
      parent.appendChild(canvas);
    }
    // taille native du canvas = taille vidéo pour des coordonnées exactes
    const w = video.videoWidth || video.clientWidth || 360;
    const h = video.videoHeight || video.clientHeight || 240;
    canvas.width = w;
    canvas.height = h;
    return canvas.getContext("2d");
  }

  function drawSkeleton(ctx, keypoints, color = "rgba(0,255,153,0.95)") {
    if (!ctx || !keypoints) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Paires MoveNet/COCO
    const PAIRS = [
      [5, 6],  // épaules
      [5, 7], [7, 9],   // bras gauche
      [6, 8], [8,10],   // bras droit
      [11,12],          // hanches
      [5,11], [6,12],   // tronc
      [11,13],[13,15],  // jambe gauche
      [12,14],[14,16]   // jambe droite
    ];

    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // os
    PAIRS.forEach(([a, b]) => {
      const A = keypoints[a], B = keypoints[b];
      if (A && B && A.score > 0.3 && B.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
    });

    // articulations
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
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER } // robuste
    );
    return detector;
  }

  // Normalise par largeur d'épaules pour rendre comparables les distances
  function normalizeKeypoints(kp) {
    if (!kp) return kp;
    const L = kp[5], R = kp[6];
    if (L && R && L.score > 0.2 && R.score > 0.2) {
      const scale = Math.max(20, Math.hypot(L.x - R.x, L.y - R.y)); // largeur d'épaules
      return kp.map(p => p ? { ...p, x: p.x / scale, y: p.y / scale } : p);
    }
    return kp;
  }

  // Échantillonne ~N frames sur la vidéo, dessine le squelette à chaque pas (seek)
  async function samplePosesFromVideo(video, ctx, color = "rgba(0,255,153,0.95)", frames = 40) {
    const det = await ensureDetector();
    const seq = [];

    // s’assurer que la durée est connue
    if (!video.duration || isNaN(video.duration)) {
      try { await video.play(); video.pause(); } catch (_) {}
    }

    const totalFrames = Math.max(8, Math.min(frames, 60));
    for (let i = 0; i < totalFrames; i++) {
      const t = (video.duration || 1) * (i / (totalFrames - 1));
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
        await new Promise(r => setTimeout(r, 0)); // laisser respirer le thread
      }
    }
    return seq;
  }

  // ————— Scores —————
  // similarité frame à frame (épaules, hanches, coudes, genoux)
  function frameSimilarity(a, b) {
    if (!a || !b) return 0;
    const idx = [5, 6, 11, 12, 7, 8, 13, 14];
    let sum = 0, n = 0;
    for (let i of idx) {
      const A = a[i], B = b[i];
      if (A && B && A.score > 0.2 && B.score > 0.2) {
        const dx = A.x - B.x;
        const dy = A.y - B.y;
        sum += Math.hypot(dx, dy);
        n++;
      }
    }
    if (!n) return 0;
    const avg = sum / n;          // distance moyenne normalisée
    return Math.max(0, 1 - avg);  // 0..1 (plus proche → plus haut)
  }

  function sequenceSimilarity(seqA, seqB) {
    if (!seqA.length || !seqB.length) return 0;
    const N = Math.min(seqA.length, seqB.length);
    let s = 0;
    for (let i = 0; i < N; i++) s += frameSimilarity(seqA[i], seqB[i]);
    return s / N; // 0..1
  }

  // stabilité interne (fluidité d’une frame à l’autre)
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
  // - avec ref: 50% similarité + 50% stabilité
  // - sans ref: 100% stabilité
  function finalScore(stab, simOrNull) {
    if (typeof simOrNull === "number") {
      return Math.round((0.5 * stab + 0.5 * simOrNull) * 100);
    }
    return Math.round(stab * 100);
  }

  // ————— Référence vidéo —————
  function ensureRefVideo(src) {
    return new Promise((resolve, reject) => {
      let v = $("ref-video");
      if (!v) {
        v = document.createElement("video");
        v.id = "ref-video";
        v.playsInline = true;
        v.muted = true;
        v.controls = true;
        v.style.maxWidth = "100%";
        v.style.marginTop = "8px";
        // placer sous la vidéo utilisateur si possible
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

  // ————— Pipeline principal —————
  async function analyze(preview, refKeyOrNull) {
    const ctxUser = ensureOverlayFor(preview, "user");
    say("⏳ Analyse en cours…");

    // 1) séquence user
    const userSeq = await samplePosesFromVideo(preview, ctxUser, "rgba(0,255,153,0.95)", 40);
    const stab = stability(userSeq); // 0..1

    // 2) tentative ref si demandée
    let sim = null;
    if (refKeyOrNull && REF_MAP[refKeyOrNull]) {
      try {
        const refVideo = await ensureRefVideo(REF_MAP[refKeyOrNull]);
        const ctxRef = ensureOverlayFor(refVideo, "ref");
        const refSeq = await samplePosesFromVideo(refVideo, ctxRef, "rgba(0,180,255,0.9)", 40);
        sim = sequenceSimilarity(userSeq, refSeq); // 0..1
      } catch (err) {
        console.warn("⚠️ Référence indisponible — score basé sur la stabilité seulement:", err);
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

    // message coach optionnel
    if (typeof window.coachReact === "function") {
      window.coachReact(`🏌️ Swing analysé → ${score}/100 (stab ${(stab*100).toFixed(0)}${typeof sim==="number"?`, sim ${(sim*100).toFixed(0)}`:""})`);
    }
  }

  // ————— INIT —————
  async function initSwingAnalyzer(retry = 0) {
    if (initialized) return;
    initialized = true;

    const preview      = $("video-preview");
    const camInput     = $("video-upload-camera");   // input file (caméra)
    const libInput     = $("video-upload-library");  // input file (bibliothèque)
    const analyzeBtn   = $("analyze-btn");
    const refSelect    = $("ref-swing");
    const uploadStatus = $("upload-status");

    // si le DOM n’est pas prêt (view pas encore montée), on retente gentiment
    if (!preview || !camInput || !libInput || !analyzeBtn || !refSelect || !uploadStatus) {
      console.warn(`⛔ Élément(s) manquant(s) pour le Swing Analyzer (tentative ${retry})`);
      initialized = false;
      if (retry < 10) setTimeout(() => initSwingAnalyzer(retry + 1), 300);
      return;
    }

    // modèle MoveNet
    try {
      await ensureDetector();
    } catch (e) {
      console.error("MoveNet load failed:", e);
      say("❌ Échec de chargement de l’IA.", "#f55");
      initialized = false;
      return;
    }

    // 🎥 Preview commune
    function handleUpload(file) {
      if (!file) return;
      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.style.display = "block";
      preview.load();
      uploadStatus.textContent = "✅ Vidéo chargée, prête à être analysée.";
      uploadStatus.style.opacity = "1";
      setTimeout(() => (uploadStatus.style.opacity = "0"), 2500);
    }

    // 📱 Caméra (iPhone → ouvre l’appareil photo)
    camInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      handleUpload(file);
    });

    // 📂 Bibliothèque (album)
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
        await analyze(preview, refKey || null);
      } catch (err) {
        console.error(err);
        say("❌ Erreur pendant l’analyse.", "#f55");
      }
    });

    console.log("✅ Swing Analyzer initialisé (MoveNet prêt).");
  }

  // Expose global pour le router
  window.initSwingAnalyzer = initSwingAnalyzer;
})();

