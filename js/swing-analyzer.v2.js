// === Parfect.golfr — Swing Analyzer V2.1 (MoveNet + Live Cam + Multi-ref + Multi-club) ===
//
// - Selfie cam auto-start (face avant)
// - Vidéo de référence chargée dès le début et quand on change de ref
// - 30s de décompte avant la capture pour analyse
// - 7 scores (6h, reprise, retard, 9h, 12h, impact, finish) + global /100
// - Overlay squelette seulement pendant l’analyse
// - Coach mini local + message dans coach IA global si dispo

(() => {
  const $ = (id) => document.getElementById(id);

  // === Références vidéo (met les bons fichiers dans /assets/ref/) ===
  const REF_BASE = "./assets/ref/";
  const REF_MAP = {
    rory_faceon: REF_BASE + "YTDown.com_Shorts_Rory-McIlroy-Driver-Swing-Slow-Motion-FO_Media_Y32QVpIA4As_001_720p.mp4",
    rory_dtl:    REF_BASE + "rory_dtl.mp4", // à créer si tu veux une 2e réf
    // nelly_faceon: REF_BASE + "nelly_faceon.mp4",
    // tiger_faceon: REF_BASE + "tiger_faceon.mp4",
  };

  // === Etat global ===
  let detector = null;
  let initialized = false;
  let stream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;

  // === Overlay toggle ===
  function showOverlays(show) {
    const ou = $("overlay-user");
    const or = $("overlay-ref");
    if (ou) ou.style.display = show ? "block" : "none";
    if (or) or.style.display = show ? "block" : "none";
  }

  // === Coach helper ===
  function coachSay(msg) {
    const coachName = localStorage.getItem("coach") || "Parfect";
    const prefix = `🧑‍🏫 ${coachName}: `;
    const full = prefix + msg;

    const mini = $("coach-ia-mini");
    if (mini) mini.textContent = full;

    if (typeof window.showCoachIA === "function") {
      window.showCoachIA(full);
    } else if (typeof window.coachReact === "function") {
      window.coachReact(full);
    } else {
      console.log(full);
    }
  }

  // === UI helpers ===
  function say(msgHTML) {
    const panel = $("score-panel");
    if (!panel) return;
    panel.innerHTML = msgHTML;
    panel.style.display = "block";
  }
  function clearPanel() {
    const panel = $("score-panel");
    if (panel) panel.innerHTML = "";
  }

  // === MoveNet ===
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

  // === Overlay draw ===
  function drawSkeleton(ctx, keypoints, color = "rgba(0,255,153,0.95)") {
    if (!ctx || !keypoints) return;
    const PAIRS = [
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
      [11, 12], [5, 11], [6, 12], [11, 13], [13, 15], [12, 14], [14, 16]
    ];
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    for (const [a, b] of PAIRS) {
      const A = keypoints[a], B = keypoints[b];
      if (A && B && A.score > 0.3 && B.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
    }
    keypoints.forEach(p => {
      if (p && p.score > 0.3) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function syncCanvasToVideo(canvas, video) {
    if (!canvas || !video) return;
    const w = video.videoWidth || video.clientWidth || 360;
    const h = video.videoHeight || video.clientHeight || 240;
    canvas.width = w;
    canvas.height = h;
  }

  // === Normalisation (largeur épaules) ===
  function normalizeKeypoints(kp) {
    if (!kp) return kp;
    const L = kp[5], R = kp[6];
    if (L && R && L.score > 0.2 && R.score > 0.2) {
      const scale = Math.max(20, Math.hypot(L.x - R.x, L.y - R.y));
      return kp.map(p => p ? { ...p, x: p.x / scale, y: p.y / scale } : p);
    }
    return kp;
  }

  // === Mesures d’angles / features ===
  function angle(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function extractFeatures(kp) {
    const nose = kp[0], LS = kp[5], RS = kp[6], LE = kp[7], RE = kp[8], LW = kp[9], RW = kp[10], LH = kp[11], RH = kp[12];
    const valid = (p) => p && p.score > 0.2;

    const midShoulder = (valid(LS) && valid(RS)) ? { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2, score: 1 } : null;
    const midHip      = (valid(LH) && valid(RH)) ? { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2, score: 1 } : null;

    let shAngle = null, hipAngle = null, headStab = null, lagAngle = null, armHoriz = null;
    if (valid(LS) && valid(RS)) shAngle = angle(LS, RS);
    if (valid(LH) && valid(RH)) hipAngle = angle(LH, RH);
    if (valid(LE) && valid(LW)) armHoriz = Math.abs(angle(LE, LW));
    if (valid(LE) && valid(LW) && valid(LH)) {
      const a1 = angle(LE, LW);
      const a2 = angle(LE, LH);
      lagAngle = Math.abs(a1 - a2);
    }
    if (valid(nose) && midShoulder) headStab = dist(nose, midShoulder);

    return { shAngle, hipAngle, headStab, lagAngle, armHoriz, midHip, midShoulder };
  }

  // === Phases clés heuristiques ===
  function detectPhases(seq) {
    const phases = {
      setup: 0,
      weight: null,
      nine: null,
      top: null,
      impact: null,
      finish: seq.length - 1,
      lagIdx: null
    };

    let maxLag = -1, maxLagIdx = null;
    let maxBackswingLift = -1, topIdx = null;
    let bestNineIdx = null, bestNineScore = Infinity;
    let minHeadMove = Infinity, setupIdx = 0;
    let hipShiftIdx = null;

    const hipsX = [];
    for (let i = 0; i < seq.length; i++) {
      const f = extractFeatures(seq[i]);
      if (f.midHip) hipsX.push({ x: f.midHip.x, i });
      if (f.headStab != null && f.headStab < minHeadMove) {
        minHeadMove = f.headStab;
        setupIdx = i;
      }

      if (f.armHoriz != null) {
        const score = Math.min(Math.abs(f.armHoriz - 0), Math.abs(Math.PI - f.armHoriz));
        if (score < bestNineScore) { bestNineScore = score; bestNineIdx = i; }
      }

      const LW = seq[i][9], midHip = f.midHip;
      if (LW && LW.score > 0.2 && midHip) {
        const lift = Math.hypot(LW.x - midHip.x, LW.y - midHip.y);
        if (lift > maxBackswingLift) { maxBackswingLift = lift; topIdx = i; }
      }

      if (f.lagAngle != null && f.lagAngle > maxLag) { maxLag = f.lagAngle; maxLagIdx = i; }
    }

    if (hipsX.length > 6) {
      for (let i = 3; i < hipsX.length - 3; i++) {
        const prev = hipsX[i - 3].x;
        const cur  = hipsX[i].x;
        const next = hipsX[i + 3].x;
        if ((cur - prev) > 0.02 && (cur - next) > 0.02) { hipShiftIdx = hipsX[i].i; break; }
      }
    }

    let bestImpact = null, bestImpactIdx = null;
    for (let i = 0; i < seq.length; i++) {
      const f = extractFeatures(seq[i]);
      if (f.shAngle != null && f.hipAngle != null) {
        const open = Math.abs(f.shAngle - f.hipAngle);
        const head = f.headStab || 0.1;
        const score = open - 0.3 * head;
        if (bestImpact == null || score > bestImpact) { bestImpact = score; bestImpactIdx = i; }
      }
    }

    if (setupIdx != null) phases.setup = setupIdx;
    if (hipShiftIdx != null) phases.weight = hipShiftIdx;
    if (bestNineIdx != null) phases.nine = bestNineIdx;
    if (topIdx != null) phases.top = topIdx;
    if (bestImpactIdx != null) phases.impact = bestImpactIdx;
    if (maxLagIdx != null) phases.lagIdx = maxLagIdx;

    return phases;
  }

  // === Similarité & stabilité ===
  function frameSimilarity(a, b) {
    if (!a || !b) return 0;
    const idx = [5, 6, 11, 12, 7, 8, 13, 14];
    let sum = 0, n = 0;
    for (const i of idx) {
      const A = a[i], B = b[i];
      if (A && B && A.score > 0.2 && B.score > 0.2) {
        sum += Math.hypot(A.x - B.x, A.y - B.y);
        n++;
      }
    }
    if (!n) return 0;
    const avg = sum / n;
    return Math.max(0, 1 - avg);
  }

  function stability(seq) {
    if (seq.length < 2) return 0.5;
    let s = 0, n = 0;
    for (let i = 1; i < seq.length; i++) {
      s += frameSimilarity(seq[i], seq[i - 1]);
      n++;
    }
    return n ? s / n : 0.5;
  }

  function phaseScore(userFrame, refFrame) {
    if (!userFrame || !refFrame) return 50;
    return Math.round(frameSimilarity(userFrame, refFrame) * 100);
  }

  function weightedGlobal(scores, club) {
    const baseW = { setup: 10, weight: 10, lag: 15, nine: 15, top: 20, impact: 20, finish: 10 };
    const w = { ...baseW };

    if (club === "putt") {
      w.impact += 10; w.setup += 10; w.top = 0; w.lag = 0;
    } else if (club === "wedge" || club === "chip") {
      w.setup += 5; w.nine += 5; w.impact += 5; w.top -= 5;
    } else if (club === "driver") {
      w.lag += 5; w.top += 5;
    }

    const totalW = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    const s = (scores.setup || 0) * w.setup
            + (scores.weight || 0) * w.weight
            + (scores.lag || 0) * w.lag
            + (scores.nine || 0) * w.nine
            + (scores.top || 0) * w.top
            + (scores.impact || 0) * w.impact
            + (scores.finish || 0) * w.finish;
    return Math.round(s / totalW);
  }

  // === Sampling vidéo ref ===
  async function sampleFromVideo(video, ctx, color, frames = 40) {
    const det = await ensureDetector();
    if (!video.duration || isNaN(video.duration)) {
      await video.play().catch(() => {});
      video.pause();
    }
    const seq = [];
    const N = Math.max(8, Math.min(frames, 60));
    for (let i = 0; i < N; i++) {
      video.currentTime = (video.duration || 1) * (i / (N - 1));
      await new Promise(r => video.addEventListener("seeked", r, { once: true }));
      if (ctx && ctx.canvas) syncCanvasToVideo(ctx.canvas, video);
      const res = await det.estimatePoses(video, { flipHorizontal: false });
      if (res && res[0] && res[0].keypoints) {
        const kp = normalizeKeypoints(res[0].keypoints);
        seq.push(kp);
        if (ctx) drawSkeleton(ctx, kp, color);
        await new Promise(r => setTimeout(r, 0));
      }
    }
    return seq;
  }

  // === Sampling live cam ===
  async function sampleFromLive(video, ctx, color, ms = 3000, step = 80) {
    const det = await ensureDetector();
    const seq = [];
    const start = performance.now();
    while (performance.now() - start < ms) {
      if (video.readyState >= 2) {
        if (ctx && ctx.canvas) syncCanvasToVideo(ctx.canvas, video);
        const res = await det.estimatePoses(video, { flipHorizontal: true });
        if (res && res[0] && res[0].keypoints) {
          const kp = normalizeKeypoints(res[0].keypoints);
          seq.push(kp);
          if (ctx) drawSkeleton(ctx, kp, color);
        }
      }
      await new Promise(r => setTimeout(r, step));
    }
    return seq;
  }

  // === Chargement de la vidéo de référence ===
  async function loadRefVideo(refKey) {
    const refVideo = $("ref-video");
    if (!refVideo) return;
    const src = REF_MAP[refKey];
    if (!src) return;

    return new Promise((resolve, reject) => {
      refVideo.src = src;
      refVideo.muted = true;
      refVideo.playsInline = true;
      refVideo.autoplay = false;
      refVideo.onloadeddata = () => {
        // Essaye une petite lecture pour iOS (puis pause)
        refVideo.play().then(() => {
          refVideo.pause();
          resolve();
        }).catch(() => {
          // Autoplay bloqué -> on considère quand même chargé, l’utilisateur pourra tap
          resolve();
        });
      };
      refVideo.onerror = () => {
        console.warn("Référence indisponible:", src);
        reject(new Error("Ref load error"));
      };
    });
  }

  // === Analyse principale ===
  async function analyze(relaunch = false) {
    const userVideo = $("user-video");
    const refVideo  = $("ref-video");
    const ou = $("overlay-user");
    const or = $("overlay-ref");
    const club = ($("club-type")?.value) || "driver";
    const refKey = ($("ref-swing")?.value) || "rory_faceon";

    if (!userVideo) return;
    clearPanel();

    // Décompte 30s
    const countdown = $("countdown-overlay");
    let t = 30;
    if (countdown) {
      countdown.style.display = "flex";
      countdown.textContent = t;
      await new Promise(resolve => {
        const tick = setInterval(() => {
          t--;
          countdown.textContent = t;
          if (t <= 0) {
            clearInterval(tick);
            countdown.style.display = "none";
            resolve();
          }
        }, 1000);
      });
    }

    // Au moment où le décompte finit, on lance Rory (ref) si possible
    if (REF_MAP[refKey]) {
      try {
        await loadRefVideo(refKey);
        // Lecture ref pendant que tu swings
        refVideo.play().catch(() => {});
      } catch (e) {
        console.warn("Référence indisponible pour lecture en parallèle", e);
      }
    }

    // Analyse
    showOverlays(true);
    clearPanel();

    const ctxU = ou?.getContext("2d") || null;
    const ctxR = or?.getContext("2d") || null;

    // 1) User (3.2s live)
    const userSeq = await sampleFromLive(userVideo, ctxU, "rgba(0,255,153,0.95)", 3200, 90);
    const userPhases = detectPhases(userSeq);
    const userStab = stability(userSeq);

    // 2) Ref
    let refSeq = null, refPhases = null;
    if (REF_MAP[refKey]) {
      try {
        // on (re)charge pour garantir metadata + duration
        await loadRefVideo(refKey);
        refSeq = await sampleFromVideo(refVideo, ctxR, "rgba(0,180,255,0.9)", 40);
        refPhases = detectPhases(refSeq);
      } catch (e) {
        console.warn("Référence indisponible → analyse sans comparaison", e);
      }
    }

    const get = (seq, idx) => (seq && idx != null) ? seq[idx] : null;

    const scores = {
      setup:   refSeq ? phaseScore(get(userSeq, userPhases.setup),  get(refSeq, refPhases.setup))   : Math.round(userStab * 100),
      weight:  refSeq ? phaseScore(get(userSeq, userPhases.weight), get(refSeq, refPhases.weight))  : Math.round(userStab * 100),
      lag:     refSeq ? phaseScore(get(userSeq, userPhases.lagIdx), get(refSeq, refPhases.lagIdx))  : Math.round(userStab * 100),
      nine:    refSeq ? phaseScore(get(userSeq, userPhases.nine),   get(refSeq, refPhases.nine))    : Math.round(userStab * 100),
      top:     refSeq ? phaseScore(get(userSeq, userPhases.top),    get(refSeq, refPhases.top))     : Math.round(userStab * 100),
      impact:  refSeq ? phaseScore(get(userSeq, userPhases.impact), get(refSeq, refPhases.impact))  : Math.round(userStab * 100),
      finish:  refSeq ? phaseScore(get(userSeq, userPhases.finish), get(refSeq, refPhases.finish))  : Math.round(userStab * 100),
    };
    const global = weightedGlobal(scores, club);

    say(`
      <div>
        <div style="font-weight:700;font-size:1.1rem;color:#00ff99;margin-bottom:6px;">
          🧮 Score global : ${global}/100
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
          <div>6h: <b>${scores.setup}</b></div>
          <div>Reprise: <b>${scores.weight}</b></div>
          <div>Retard: <b>${scores.lag}</b></div>
          <div>9h: <b>${scores.nine}</b></div>
          <div>12h: <b>${scores.top}</b></div>
          <div>Impact: <b>${scores.impact}</b></div>
          <div>Finish: <b>${scores.finish}</b></div>
        </div>
        <div style="margin-top:8px;opacity:.85">Club: <b>${club}</b> ${refSeq ? "· Réf: Rory ✅" : "· Réf: —"}</div>
      </div>
    `);

    const weak = Object.entries(scores).filter(([k, v]) => v < 70).map(([k]) => k);
    if (weak.includes("weight")) coachSay("Travaille la reprise d’appui : sens le passage de la hanche droite vers la gauche au downswing.");
    if (weak.includes("lag"))    coachSay("Garde le retard du club plus longtemps au backswing pour un relâché plus puissant.");
    if (weak.includes("nine"))   coachSay("À 9h, bras gauche parallèle au sol, stabilise la tête et tourne les épaules.");
    if (weak.includes("top"))    coachSay("Au sommet (12h), complète la rotation sans basculer la tête.");
    if (weak.includes("impact")) coachSay("À l’impact, ouvre légèrement le bassin et garde la tête stable.");
    if (weak.length === 0)       coachSay("Swing très propre ! Continue sur cette base et garde ce flow.");

    const panel = $("score-panel");
    if (panel) {
      const relaunchBtn = document.createElement("button");
      relaunchBtn.textContent = "⟳ Relancer (30s)";
      relaunchBtn.style.cssText = "margin-top:10px;background:#00ff99;color:#111;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;";
      relaunchBtn.onclick = () => analyze(true);
      panel.appendChild(relaunchBtn);
    }

    setTimeout(() => showOverlays(false), 800);
  }

  // === Caméra live + record/save ===
  async function startCam() {
    const video = $("user-video");
    if (!video) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } }, // selfie cam
        audio: false
      });
      video.srcObject = stream;
      await video.play();
    } catch (e) {
      console.error("getUserMedia error", e);
      coachSay("Impossible d’accéder à la caméra. Vérifie les permissions dans Safari.");
    }
  }

  function stopCam() {
    const video = $("user-video");
    if (video) video.pause();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function toggleRecord() {
    const recBtn = $("record");
    const saveBtn = $("save-recording");
    if (!stream) { coachSay("Lance la caméra avant d’enregistrer."); return; }

    if (!isRecording) {
      recordedChunks = [];
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      mediaRecorder = new MediaRecorder(stream, { mimeType: mime, bitsPerSecond: 2_000_000 });
      mediaRecorder.ondataavailable = (e) => { if (e.data.size) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => { saveBtn.disabled = recordedChunks.length === 0; };
      mediaRecorder.start();
      isRecording = true;
      if (recBtn) recBtn.textContent = "⏹️ Stop";
      coachSay("Enregistrement en cours…");
    } else {
      mediaRecorder?.stop();
      isRecording = false;
      if (recBtn) recBtn.textContent = "⏺️ Enregistrer";
      coachSay("Vidéo enregistrée — tu peux sauvegarder.");
    }
  }

  function saveRecording() {
    if (!recordedChunks.length) { coachSay("Aucune vidéo enregistrée à sauvegarder."); return; }
    const blob = new Blob(recordedChunks, { type: recordedChunks[0].type || "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const d = new Date();
    a.download = `parfect-swing-${d.toISOString().slice(0,19).replace(/[:T]/g,'-')}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // === INIT PUBLIC ===
  async function initSwingAnalyzerV2() {
    if (initialized) return;
    initialized = true;

    const need = ["ref-video", "overlay-ref", "user-video", "overlay-user", "score-panel", "analyze-btn", "record", "save-recording", "club-type", "ref-swing"];
    const missing = need.filter(id => !$(id));
    if (missing.length) {
      console.warn("Swing Analyzer V2 – éléments manquants:", missing);
      initialized = false;
      return;
    }

    try { await ensureDetector(); }
    catch (e) { console.error("MoveNet init error", e); coachSay("Échec de l’initialisation IA."); initialized = false; return; }

    $("record").onclick = toggleRecord;
    $("save-recording").onclick = saveRecording;
    $("analyze-btn").onclick = analyze;

    const uv = $("user-video"), rv = $("ref-video");
    const ou = $("overlay-user"), or = $("overlay-ref");
    const syncAll = () => {
      if (ou && uv) syncCanvasToVideo(ou, uv);
      if (or && rv) syncCanvasToVideo(or, rv);
    };
    uv?.addEventListener("loadedmetadata", syncAll);
    rv?.addEventListener("loadedmetadata", syncAll);
    window.addEventListener("resize", syncAll);

    // ⚙️ Changement de ref => charge la vidéo
    const refSelect = $("ref-swing");
    if (refSelect) {
      refSelect.addEventListener("change", async () => {
        const key = refSelect.value;
        if (REF_MAP[key]) {
          try {
            await loadRefVideo(key);
          } catch (e) {
            console.warn("Impossible de charger la ref:", e);
          }
        }
      });
    }

    // 📹 Démarrer la caméra automatiquement
    //startCam();

    // Charger Rory par défaut
    const defaultRef = (refSelect && refSelect.value) || "rory_faceon";
    if (REF_MAP[defaultRef]) {
      try { await loadRefVideo(defaultRef); } catch (e) { console.warn("Ref défaut non chargée", e); }
    }

    showOverlays(false);
    clearPanel();
    coachSay("🎥 Analyse prête : regarde Rory, swing en miroir, puis clique Analyser.");
  }

  window.initSwingAnalyzerV2 = initSwingAnalyzerV2;
})();
