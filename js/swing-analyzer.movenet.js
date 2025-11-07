// === swing-analyzer.movenet.js — MVP Parfect.golfr ===
// Détection MoveNet + upload mobile-friendly + scoring fallback

(() => {
  // --- État global (limité à ce module) ---
  let detector = null;
  let modelReady = false;
  let refVideoEl = null; // vidéo de référence (si chargée)
  let overlayEl = null;  // overlay "Analyse en cours..."

  // Base des vidéos de référence (GitHub Pages p.ex.)
  // Tu peux changer ça si besoin :
  const REF_BASE =
    window.REF_BASE ||
    "https://warlock-greg.github.io/parfect-golf/assets/ref/";

  // Map des fichiers référence (ajoute tes propres fichiers si dispo)
  const REF_FILES = {
    rory_faceon: "rory_faceon.mp4",
    adam_dtl: "adam_dtl.mp4",
    nelly_faceon: "nelly_faceon.mp4",
    jin_dtl: "jin_dtl.mp4",
  };

  // --- Utils DOM safe ---
  const $ = (id) => document.getElementById(id);

  function ensureUploadStatus() {
    let el = $("upload-status");
    if (!el) {
      const wrap = $("video-upload")?.parentElement || $("swing-analyzer");
      el = document.createElement("div");
      el.id = "upload-status";
      el.style.cssText =
        "margin-top:10px;font-size:0.9rem;color:#00ff99;opacity:0;transition:opacity .4s ease;";
      wrap?.appendChild(el);
    }
    return el;
  }

  function showUploadStatus(text, ok = true, autohideMs = 2500) {
    const el = ensureUploadStatus();
    el.textContent = text;
    el.style.color = ok ? "#00ff99" : "#ff6666";
    el.style.opacity = "1";
    if (autohideMs) setTimeout(() => (el.style.opacity = "0"), autohideMs);
  }

  function showAnalyzingOverlay(msg = "Analyse en cours…") {
    if (overlayEl) return; // déjà affiché
    overlayEl = document.createElement("div");
    overlayEl.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);
      display:flex;align-items:center;justify-content:center;
      z-index:18000;backdrop-filter:blur(2px);
    `;
    const card = document.createElement("div");
    card.style.cssText =
      "background:#121619;color:#fff;border-radius:12px;padding:16px 22px;box-shadow:0 0 24px rgba(0,255,153,0.25);";
    card.innerHTML = `
      <div style="font-size:1.1rem;margin-bottom:6px;">${msg}</div>
      <div class="spinner" style="width:28px;height:28px;border:3px solid #2e2e2e;border-top:3px solid #00ff99;border-radius:50%;margin:0 auto;animation:spin 0.8s linear infinite;"></div>
      <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
    `;
    overlayEl.appendChild(card);
    document.body.appendChild(overlayEl);
  }

  function hideAnalyzingOverlay() {
    overlayEl?.remove();
    overlayEl = null;
  }

  // --- Initialisation MoveNet (une seule fois) ---
  async function loadModelOnce() {
    if (modelReady) return;
    if (!window.poseDetection) {
      throw new Error("pose-detection non chargé (CDN manquant).");
    }
    const model = poseDetection.SupportedModels.MoveNet;
    detector = await poseDetection.createDetector(model, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
    });
    modelReady = true;
    console.log("✅ MoveNet prêt.");
  }

  // --- Référence : chargement optionnel ---
  async function loadReference(refKey) {
    const file = REF_FILES[refKey];
    if (!file) return false;

    return new Promise((resolve) => {
      if (!refVideoEl) {
        refVideoEl = document.createElement("video");
        refVideoEl.muted = true;
        refVideoEl.playsInline = true;
        refVideoEl.style.cssText = "display:none;max-width:1px;max-height:1px;";
        document.body.appendChild(refVideoEl);
      }

      refVideoEl.src = REF_BASE + file;
      refVideoEl.onloadedmetadata = () => resolve(true);
      refVideoEl.onerror = () => {
        console.warn("⚠️ Impossible de charger la vidéo de référence :", refKey);
        resolve(false);
      };
      refVideoEl.load();
    });
  }

  // --- Estimation de poses depuis N frames d'une vidéo ---
  async function estimatePosesFromVideo(videoEl, frames = 32) {
    if (!detector) throw new Error("Pose detector indisponible.");
    if (!videoEl) throw new Error("Video element manquant.");

    // s'assure que les meta sont chargées
    if (videoEl.readyState < 1) {
      await new Promise((r) => {
        videoEl.onloadedmetadata = r;
      });
    }

    const poses = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 360;

    const duration = Math.max(0.2, videoEl.duration || 2);
    for (let i = 0; i < frames; i++) {
      const t = (i / (frames - 1)) * (duration - 0.05);
      videoEl.currentTime = t;
      await new Promise((r) => (videoEl.onseeked = r));
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const poseList = await detector.estimatePoses(canvas);
      poses.push(poseList?.[0] || null);
    }
    return poses;
  }

  // --- Heuristiques de scoring fallback (0..1) ---
  function estimateSmoothness(poses) {
    const idx = ["left_shoulder", "right_shoulder", "left_hip", "right_hip"];
    let last = null,
      sum = 0,
      cnt = 0;
    for (const p of poses) {
      if (!p || !p.keypoints) continue;
      const kp = Object.fromEntries(
        p.keypoints.map((k) => [k.name || k.part || k.key, k])
      );
      if (last) {
        for (const k of idx) {
          const a = kp[k],
            b = last[k];
          if (a && b && a.score > 0.3 && b.score > 0.3) {
            const dx = a.x - b.x,
              dy = a.y - b.y;
            sum += Math.hypot(dx, dy);
            cnt++;
          }
        }
      }
      last = kp;
    }
    if (!cnt) return 0.5;
    const avgMove = sum / cnt;
    return Math.max(0, Math.min(1, 1 - avgMove / 80)); // normalisation grossière
  }

  function estimateBalance(poses) {
    const track = ["nose", "left_hip", "right_hip"];
    const xs = [];
    for (const p of poses) {
      if (!p || !p.keypoints) continue;
      const m = Object.fromEntries(
        p.keypoints.map((k) => [k.name || k.part || k.key, k])
      );
      const list = track
        .map((k) => m[k])
        .filter(Boolean)
        .filter((k) => k.score > 0.3);
      if (!list.length) continue;
      xs.push(list.reduce((a, k) => a + k.x, 0) / list.length);
    }
    if (xs.length < 4) return 0.5;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const varx = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
    const sd = Math.sqrt(varx);
    return Math.max(0, Math.min(1, 1 - sd / 60));
  }

  function estimateCoverage(poses) {
    let total = 0,
      ok = 0;
    for (const p of poses) {
      const kps = p?.keypoints || [];
      total += kps.length;
      ok += kps.filter((k) => k.score >= 0.3).length;
    }
    if (!total) return 0;
    return ok / total;
  }

  async function scoreWithoutReference(videoEl) {
    const poses = await estimatePosesFromVideo(videoEl, 28);
    const coverage = estimateCoverage(poses);
    const smooth = estimateSmoothness(poses);
    const balance = estimateBalance(poses);

    let score = Math.round(100 * (0.55 * coverage + 0.3 * smooth + 0.15 * balance));
    score = Math.min(95, Math.max(40, score)); // bornes MVP

    const notes = [
      `Couverture: ${(coverage * 100) | 0}%`,
      `Fluidité: ${(smooth * 100) | 0}%`,
      `Équilibre: ${(balance * 100) | 0}%`,
    ];
    return { score, notes };
  }

  // === Init UI + listeners (une seule fois) ===
  async function _init() {
    const zone = $("swing-analyzer");
    if (!zone) return;

    // Eviter la double/tri-init
    if (zone.dataset.init === "1") return;
    zone.dataset.init = "1";

   // --- Récupère les éléments
const preview     = $("video-preview");
const uploadCam   = $("video-upload-camera");
const uploadLib   = $("video-upload-library");
const analyzeBtn  = $("analyze-btn");
const refSelect   = $("ref-swing");
const resultBox   = $("analysis-result");

// Handlers de changement (caméra + bibliothèque)
function handleFileInputChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (preview) {
    preview.src = url;
    preview.style.display = "block";
    preview.load();
  }
  showUploadStatus("✅ Vidéo chargée !");
  resultBox.innerHTML = ""; // reset d’un ancien résultat
}

uploadCam?.addEventListener("change", handleFileInputChange);
uploadLib?.addEventListener("change", handleFileInputChange);

    // 🎥 Dual mode : caméra vs album (iPhone OK)
    if (recordBtn && uploadBtn && uploadInput) {
      recordBtn.addEventListener("click", () => {
        uploadInput.setAttribute("capture", "environment");
        uploadInput.click();
      });

      uploadBtn.addEventListener("click", () => {
        uploadInput.removeAttribute("capture");
        uploadInput.click();
      });

      uploadInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        if (preview) {
          preview.src = url;
          preview.style.display = "block";
          preview.load();
        }
        showUploadStatus("✅ Vidéo chargée !");
        resultBox.innerHTML = ""; // reset résultats précédents
      });
    }

    // 🔍 Analyse
    analyzeBtn?.addEventListener("click", async () => {
      try {
        const userVideo = preview;
        if (!userVideo || !userVideo.src) {
          showUploadStatus("⚠️ Choisis d’abord une vidéo à analyser.", false, 3000);
          return;
        }

        showAnalyzingOverlay("Analyse en cours…");
        await loadModelOnce();

        // Essaye de charger une référence si choisie
        const refKey = refSelect?.value;
        const refOK = refKey ? await loadReference(refKey) : false;

        // Fallback MVP : score sans comparaison (bonus si ref dispo)
        const base = await scoreWithoutReference(userVideo);
        const finalScore = refOK ? Math.min(100, base.score + 5) : base.score;

        resultBox.innerHTML = refOK
          ? `
            <p style="margin:6px 0;">Comparaison avec la référence chargée.</p>
            <h3 style="margin:8px 0;">🟢 Note: <span style="color:#00ff99">${finalScore}/100</span></h3>
            <p style="opacity:.85">${base.notes.join(" · ")}</p>
          `
          : `
            <p style="margin:6px 0;">⚠️ Vidéo de référence indisponible — score sans comparaison :</p>
            <h3 style="margin:8px 0;">🟢 Note: <span style="color:#00ff99">${finalScore}/100</span></h3>
            <p style="opacity:.85">${base.notes.join(" · ")}</p>
          `;

        showUploadStatus("✅ Analyse terminée", true, 1800);
        window.coachReact?.(
          `🎥 Score swing: ${finalScore}/100 — ${base.notes.join(" · ")}`
        );
      } catch (err) {
        console.error(err);
        showUploadStatus("❌ Erreur pendant l’analyse", false, 3500);
      } finally {
        hideAnalyzingOverlay();
      }
    });
  }

  // Expose une seule API publique propre
  window.initSwingAnalyzer = async function initSwingAnalyzer() {
    try {
      await _init();
      console.log("🎥 Swing Analyzer prêt.");
    } catch (e) {
      console.error("Swing Analyzer init error:", e);
    }
  };
})();
