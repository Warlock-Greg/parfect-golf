// ============================================================
//  JSW REPLAY PRO (Parfect 2025)
//  - Replay complet du swing
//  - Overlay squelette
//  - Superposition swing de référence
//  - Slider + play/pause + vitesse
// ============================================================

(() => {
console.log("🟦 JSW-REPLAY: module loaded");

  
  let swing = null;
  let scores = null;
  let refSwing = null;

  let frameIndex = 0;
  let playing = false;
  let rafId = null;
  let lastTs = null;
  let speed = 1;

  // DOM
  let videoEl, timelineEl, playBtn, speedSelect, timeLabelEl;
  let saveRefBtn, nextBtn, historyEl;
  let canvas, ctx;

  // joints / segments
  const JOINTS = [11,12,13,14,15,16,23,24,25,26,27,28];
  const LINKS = [
    [11,12],[11,23],[12,24],[23,24],
    [11,13],[13,15],
    [12,14],[14,16],
    [23,25],[25,27],
    [24,26],[26,28]
  ];

  // --------------------------------------------
  // 0️⃣  Référence locale
  // --------------------------------------------

  const REF_KEY = "parfect.swing.reference";
  
  function saveReference(swingData) {
    localStorage.setItem(REF_KEY, JSON.stringify(swingData));
    refSwing = swingData.swing;
    console.log("⭐ Référence enregistrée.");
  }

  function loadReference() {
    try {
      const raw = localStorage.getItem(REF_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      refSwing = obj.swing;
      console.log("📂 Référence chargée.");
    } catch(e) {
      console.warn("⚠️ Impossible de charger la référence :", e);
    }
  }

  // --------------------------------------------
  // 1️⃣ Helpers
  // --------------------------------------------

  function getFrame(s, idx) {
    if (!s || !s.frames || !s.frames.length) return null;
    idx = Math.max(0, Math.min(idx, s.frames.length - 1));
    return s.frames[idx];
  }

  function mapRefIndex(curIdx) {
    if (!refSwing) return null;
    const maxCur = swing.frames.length - 1;
    const maxRef = refSwing.frames.length - 1;
    if (maxCur <= 0) return 0;
    const ratio = curIdx / maxCur;
    return Math.round(ratio * maxRef);
  }

  function ensureCanvas() {
    if (!canvas) {
      canvas = document.getElementById("swing-review-canvas");
      if (!canvas) {
        console.error("❌ swing-review-canvas introuvable !");
        return;
      }
      ctx = canvas.getContext("2d");
    }
    const rect = videoEl.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  window.addEventListener("resize", () => {
    if (videoEl) {
      ensureCanvas();
      drawFrame();
    }
  });

  // --------------------------------------------
  // 2️⃣ Dessin squelette
  // --------------------------------------------

  function drawSkeleton(pose, colorJoint = "rgba(0,255,153,0.85)", colorLine = "rgba(0,255,153,0.5)") {
    if (!pose || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const p = (i) => pose[i] ? { x: pose[i].x * w, y: pose[i].y * h } : null;

    ctx.strokeStyle = colorLine;
    ctx.lineWidth = 2;

    LINKS.forEach(([a,b]) => {
      const pa = p(a);
      const pb = p(b);
      if (!pa || !pb) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    });

    ctx.fillStyle = colorJoint;
    JOINTS.forEach(i => {
      const pt = p(i);
      if (!pt) return;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2);
      ctx.fill();
    });
  }

  function drawFrame() {
    if (!canvas || !ctx || !swing) return;

    ensureCanvas();
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // pose actuelle
    const pose = getFrame(swing, frameIndex);

    // pose ref si disponible
    if (refSwing) {
      const refIdx = mapRefIndex(frameIndex);
      const refPose = getFrame(refSwing, refIdx);
      drawSkeleton(refPose, "rgba(59,130,246,0.9)", "rgba(59,130,246,0.5)");
    }

    // squelette actuel
    drawSkeleton(pose);
    updateTimeLabel();
  }

  // --------------------------------------------
  // 3️⃣ Timeline & Play
  // --------------------------------------------

  function updateTimeLabel() {
    if (!timeLabelEl || !swing.timestamps) return;
    const t0 = swing.timestamps[0];
    const t  = swing.timestamps[frameIndex] - t0;
    timeLabelEl.textContent = (t/1000).toFixed(2) + "s";
  }

  function timelineInput(val) {
    frameIndex = parseInt(val);
    drawFrame();
  }

  function tick(ts) {
    if (!playing) return;
    if (!lastTs) lastTs = ts;

    const dt = ts - lastTs;
    const frameDur = (1000/30) / speed; // ~30 FPS

    if (dt >= frameDur) {
      lastTs = ts;
      frameIndex++;
      if (frameIndex >= swing.frames.length) {
        frameIndex = swing.frames.length - 1;
        playing = false;
        playBtn.textContent = "▶️";
        return;
      }
      timelineEl.value = frameIndex;
      drawFrame();
    }

    rafId = requestAnimationFrame(tick);
  }

  function togglePlay() {
    if (!swing) return;
    playing = !playing;
    playBtn.textContent = playing ? "⏸️" : "▶️";
    if (playing) {
      lastTs = null;
      rafId = requestAnimationFrame(tick);
    }
  }

  // --------------------------------------------
  // 4️⃣ INIT API PUBLIQUE
  // --------------------------------------------

  function initSwingReplay(swingData, swingScores) {
    swing  = swingData;
    scores = swingScores;

    if (!swing || !swing.frames) {
      console.error("❌ initSwingReplay appelé sans swing valide");
      return;
    }

    // DOM
    videoEl     = document.getElementById("swing-video");
    timelineEl  = document.getElementById("swing-timeline");
    playBtn     = document.getElementById("swing-play-pause");
    speedSelect = document.getElementById("swing-speed");
    timeLabelEl = document.getElementById("swing-time-label");
    saveRefBtn  = document.getElementById("swing-save-reference");
    nextBtn     = document.getElementById("swing-review-next");
    historyEl   = document.getElementById("swing-history");

    ensureCanvas();

    // chargement référence
    if (!refSwing) loadReference();

    // Setup timeline
    timelineEl.min = 0;
    timelineEl.max = swing.frames.length - 1;
    timelineEl.step = 1;
    timelineEl.value = 0;
    timelineEl.oninput = (e) => timelineInput(e.target.value);

    // play/pause
    playBtn.onclick = () => togglePlay();

    // speed
    speedSelect.onchange = (e) => {
      speed = parseFloat(e.target.value);
    };

    // save reference
    saveRefBtn.onclick = () => {
      saveReference({ swing, scores });
      saveRefBtn.textContent = "⭐ Référence enregistrée !";
      setTimeout(() => saveRefBtn.textContent = "⭐ Définir comme référence", 1500);
    };

    // next
    nextBtn.onclick = () => {
      document.getElementById("swing-review").style.display = "none";
    };

    // Draw initial frame
    frameIndex = 0;
    playing = false;
    drawFrame();

    console.log("📊 Replay PRO initialisé.");
  }

  window.initSwingReplay = initSwingReplay;
})();

