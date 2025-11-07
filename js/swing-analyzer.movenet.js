// === swing-analyzer.movenet.js (MVP) ===
(() => {
  let detector = null;
  let loading = false;

  const $ = (id) => document.getElementById(id);

  async function loadDetector() {
    if (detector || loading) return detector;
    loading = true;
    await tf.ready();
    await tf.setBackend('webgl'); // iPhone-friendly
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: 'Lightning' } // 'Thunder' sur desktop si tu veux plus précis
    );
    loading = false;
    return detector;
  }

  // --- géométrie d'angles ---
  function angleBetween(pA, pB, pC) {
    // angle en B (A-B-C)
    const v1 = { x: pA.x - pB.x, y: pA.y - pB.y };
    const v2 = { x: pC.x - pB.x, y: pC.y - pB.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const n1 = Math.hypot(v1.x, v1.y);
    const n2 = Math.hypot(v2.x, v2.y);
    if (n1 === 0 || n2 === 0) return 0;
    const cos = Math.min(1, Math.max(-1, dot / (n1 * n2)));
    return Math.round((Math.acos(cos) * 180) / Math.PI);
  }

  function deg(a) { return Math.round(a); }

  function getNamedKeypoints(kps) {
    const byName = {};
    kps.forEach(k => byName[k.name || k.part || k.key] = k); // robustesse
    // Normalisation pour MoveNet
    // MoveNet renvoie keypoints[].name parfois absent via pose-detection.
    // On mappe indices → noms COCO:
    const map = [
      "nose","left_eye","right_eye","left_ear","right_ear",
      "left_shoulder","right_shoulder","left_elbow","right_elbow",
      "left_wrist","right_wrist","left_hip","right_hip",
      "left_knee","right_knee","left_ankle","right_ankle"
    ];
    if (!byName["left_shoulder"] && Array.isArray(kps)) {
      kps.forEach((kp,i)=> { byName[map[i]] = {x:kp.x, y:kp.y, score:kp.score}; });
    }
    return byName;
  }

  function computeAnglesFromKeypoints(kps) {
    const p = getNamedKeypoints(kps);

    // Sécurité si points manquants
    const need = ["left_shoulder","right_shoulder","left_hip","right_hip","left_elbow","right_elbow","left_knee","right_knee","left_ankle","right_ankle"];
    for (const n of need) if (!p[n]) return null;

    // Epaules/hanche (rotation relative 2D simple)
    const shouldersLine = Math.atan2(p.right_shoulder.y - p.left_shoulder.y, p.right_shoulder.x - p.left_shoulder.x);
    const hipsLine = Math.atan2(p.right_hip.y - p.left_hip.y, p.right_hip.x - p.left_hip.x);
    const shoulders = deg(Math.abs((shouldersLine - 0) * 180 / Math.PI)); // simplifié
    const hips = deg(Math.abs((hipsLine - 0) * 180 / Math.PI));

    // Coudes
    const left_elbow  = angleBetween(p.left_shoulder, p.left_elbow, p.left_wrist);
    const right_elbow = angleBetween(p.right_shoulder, p.right_elbow, p.right_wrist);

    // Genoux
    const left_knee  = angleBetween(p.left_hip, p.left_knee, p.left_ankle);
    const right_knee = angleBetween(p.right_hip, p.right_knee, p.right_ankle);

    // “Inclinaison” colonne (épaule → hanche gauche)
    const spine_tilt = deg(Math.abs(Math.atan2(p.left_hip.y - p.left_shoulder.y, p.left_hip.x - p.left_shoulder.x) * 180 / Math.PI));

    // Ouverture pied gauche (cheville ↔ orteils : MoveNet n’a pas les orteils → proxy: cheville ↔ genou)
    const foot_open = angleBetween(p.left_knee, p.left_ankle, {x: p.left_ankle.x + 10, y: p.left_ankle.y}); // proxy trivial

    return { shoulders, hips, left_elbow, right_elbow, left_knee, right_knee, spine_tilt, foot_open };
  }

  function phaseTimes(duration) {
    // 4 phases réparties grossièrement (MVP). Ensuite on pourra détecter automatiquement.
    return {
      address: Math.max(0.05, duration * 0.05),
      top:     duration * 0.33,
      impact:  duration * 0.55,
      finish:  duration * 0.85
    };
  }

  async function poseAtTime(video, t) {
    return new Promise(async (resolve) => {
      const onSeek = async () => {
        video.removeEventListener('seeked', onSeek);
        // Attendre 1 rAF pour que l’image soit bien mise à jour
        requestAnimationFrame(async () => {
          const poses = await detector.estimatePoses(video, { flipHorizontal: false });
          resolve(poses?.[0]?.keypoints || null);
        });
      };
      video.currentTime = t;
      video.addEventListener('seeked', onSeek);
    });
  }

  async function analyzeVideoAgainstRef(videoEl, refData) {
    await loadDetector();
    const phases = ["address","top","impact","finish"];
    const times = phaseTimes(videoEl.duration);
    const anglesUser = {};

    for (const ph of phases) {
      const kps = await poseAtTime(videoEl, times[ph]);
      if (!kps) return { error: "Pose introuvable à la phase " + ph };
      const ang = computeAnglesFromKeypoints(kps);
      if (!ang) return { error: "Angles incomplets à la phase " + ph };
      anglesUser[ph] = ang;
    }

    // scoring simple: moyenne des différences absolues sur tous les angles/ phases
    const angleNames = Object.keys(refData.angles.address);
    let diffs = [];
    for (const ph of phases) {
      for (const a of angleNames) {
        const ref = refData.angles[ph][a];
        const usr = anglesUser[ph][a];
        if (typeof ref === "number" && typeof usr === "number") {
          diffs.push(Math.abs(ref - usr));
        }
      }
    }
    const meanDiff = diffs.reduce((s,v)=>s+v,0) / Math.max(1,diffs.length);
    let score = Math.max(0, 100 - meanDiff); // 1° d’écart = -1 point (MVP)
    score = Math.round(score);

    // mini feedback
    const worst = diffs.indexOf(Math.max(...diffs));
    // approx: localise angle et phase
    const idxAngle = worst % angleNames.length;
    const idxPhase = Math.floor(worst / angleNames.length);
    const phasesList = ["address","top","impact","finish"];
    const hint = `Plus grand écart sur ${angleNames[idxAngle]} à ${phasesList[idxPhase]}.`;

    return { score, anglesUser, hint };
  }

  async function loadRef(name) {
    const url = `./data/swing_refs/${name}.json`;
    const res = await fetch(url);
    return await res.json();
  }

  // === Hook UI existant ===
  window.initSwingAnalyzer = function initSwingAnalyzer() {
    const upload = $("video-upload");
    const preview = $("video-preview");
    const analyzeBtn = $("analyze-btn");
    const result = $("analysis-result");
    const refSelect = $("ref-swing");

    if (!upload || !preview || !analyzeBtn) return;

    // iPhone friendly
    preview.playsInline = true;
    preview.muted = true;
    preview.controls = true;

    upload.onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      preview.src = url;
      preview.style.display = "block";
      result.innerHTML = "";
      coachSay?.("🎥 Vidéo chargée — prête pour l’analyse.");
    };

    analyzeBtn.onclick = async () => {
      if (!preview.src) {
        result.innerHTML = "<p style='color:#f55;'>⚠️ Importer une vidéo d’abord.</p>";
        return;
      }
      result.innerHTML = "⏳ Analyse en cours…";

      try {
        await preview.play(); // aide Safari à décoder le flux
        await preview.pause();

        const refName = refSelect?.value || "nelly_faceon";
        const ref = await loadRef(refName);
        const out = await analyzeVideoAgainstRef(preview, ref);
        if (out.error) {
          result.innerHTML = `<p style="color:#f55;">${out.error}</p>`;
          return;
        }
        result.innerHTML = `
          <div style="margin-top:8px;">
            <div style="font-size:1.2rem;">🔢 Note: <b>${out.score}/100</b></div>
            <div style="opacity:.9;margin-top:6px;">💡 ${out.hint}</div>
          </div>
        `;
        coachSay?.(`🧠 Note swing: ${out.score}/100. ${out.hint}`);
      } catch (e) {
        console.error(e);
        result.innerHTML = `<p style='color:#f55;'>Erreur analyse. Essaie une vidéo plus stable (face-on / DTL).</p>`;
      }
    };
  };
})();
