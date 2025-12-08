// ============================================================================
//   PARFECT — SWINGSCORER PREMIUM PRO (FORMAT C + SCORE C PONDÉRÉ)
//   Intégration complète avec SwingEngine PRO
//   Export global : window.SwingScorer
// ============================================================================

const SwingScorer = (() => {

  // ---------------------------------------------------------
  // TOGGLE DEBUG (logs lisibles)
  // ---------------------------------------------------------
  let DEBUG = false;
  function log(...msg) {
    if (DEBUG) console.log("[SwingScorer]", ...msg);
  }

  // ---------------------------------------------------------
  // 🔧 UTILS
  // ---------------------------------------------------------
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function dist(a, b) {
    if (!a || !b) return 999;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function angleBetween(A, B) {
    if (!A || !B) return 0;
    return Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI;
  }

  // ---------------------------------------------------------
  // 📐 TRIANGLE — stabilité bras/épaules
  // ---------------------------------------------------------
  function computeTriangle(pose) {
    const Ls = pose[11], Rs = pose[12];
    const Lh = pose[15], Rh = pose[16];

    if (!Ls || !Rs || !Lh || !Rh) return null;

    const shoulderWidth = dist(Ls, Rs);

    const mid = { x: (Ls.x + Rs.x) / 2, y: (Ls.y + Rs.y) / 2 };
    const handDist = (dist(Lh, mid) + dist(Rh, mid)) / 2;

    const angle =
      Math.abs(angleBetween(Ls, Rs) - angleBetween(Lh, Rh));

    return { shoulderWidth, handDist, angle };
  }

  function scoreTriangle(pose) {
    const t = computeTriangle(pose);
    if (!t) return 0;

    const sw = 1 - Math.abs(t.shoulderWidth - 0.25) / 0.25;
    const hd = 1 - Math.abs(t.handDist - 0.18) / 0.18;
    const ang = 1 - Math.abs(t.angle - 25) / 25;

    return clamp((sw + hd + ang) / 3, 0, 1); // → normalisé
  }

  // ---------------------------------------------------------
  // 🎯 LAG — différence poignet/coude au top
  // ---------------------------------------------------------
  function scoreLag(pose) {
    const wrist = pose[15];
    const elbow = pose[13];
    if (!wrist || !elbow) return 0;
    const dy = elbow.y - wrist.y;
    return clamp((dy - 0.02) / 0.12, 0, 1);
  }

  // ---------------------------------------------------------
  // 🔺 PLAN — angle bras/épaule à l’impact
  // ---------------------------------------------------------
  function scorePlane(pose) {
    const wrist = pose[15];
    const sh = pose[11];
    if (!wrist || !sh) return 0;

    const ang =
      Math.abs(angleBetween(sh, wrist));

    const diff = Math.abs(ang - 35);
    return clamp(1 - diff / 25, 0, 1);
  }

  // ---------------------------------------------------------
  // 🔄 ROTATION — dissociation épaule / hanches
  // ---------------------------------------------------------
  function scoreRotation(pose) {
  const Ls = pose[11], Rs = pose[12];
  const Lh = pose[23], Rh = pose[24];

  if (!Ls || !Rs || !Lh || !Rh) return 0;

  // 1) Rotation épaules via profondeur (face-on compute)
  const shoulderDZ = (Rs.z - Ls.z);       // >0 = épaule droite reculée = bon backswing
  const hipDZ      = (Rh.z - Lh.z);

  // Normalisation (valeurs typiques Mediapipe : 0.02 → 0.12)
  const shoulderRotDeg = shoulderDZ * 900; // mapping empirique ≈ 0.10 → 90°
  const hipRotDeg      = hipDZ * 600;      // hanches tournent moins que épaules

  // X-Factor réel
  const xFactor = shoulderRotDeg - hipRotDeg;

  // Scoring
  const sScore = clamp(1 - Math.abs(shoulderRotDeg - 90) / 70, 0, 1);
  const hScore = clamp(1 - Math.abs(hipRotDeg - 45) / 40, 0, 1);
  const xScore = clamp(1 - Math.abs(xFactor - 40) / 30, 0, 1);

  return clamp((sScore + hScore + xScore) / 3, 0, 1);
}


  // ---------------------------------------------------------
  // 🎯 ALIGNEMENT ADDRESS — épaules/hanches alignées sur les pieds
  // ---------------------------------------------------------
  function scoreAddressAlign(pose) {
    const Rsh = pose[12], Lsh = pose[11];
    const Rhip = pose[24], Lhip = pose[23];
    const Rfoot = pose[28], Lfoot = pose[27];

    if (!Rsh || !Lsh || !Rhip || !Lhip || !Rfoot || !Lfoot) return 0;

    const errR = Math.abs(Rsh.x - Rfoot.x) + Math.abs(Rhip.x - Rfoot.x);
    const errL = Math.abs(Lsh.x - Lfoot.x) + Math.abs(Lhip.x - Lfoot.x);

    const err = (errR + errL) / 2;

    return clamp(1 - err / 0.25, 0, 1);
  }

  // ---------------------------------------------------------
  // 🎯 ALIGNEMENT FINISH — corps au-dessus du pied gauche
  // ---------------------------------------------------------
  function scoreFinishAlign(pose) {
    const Rsh = pose[12], Lsh = pose[11];
    const Rhip = pose[24], Lhip = pose[23];
    const Lfoot = pose[27];

    if (!Rsh || !Lsh || !Rhip || !Lhip || !Lfoot) return 0;

    const e1 = Math.abs(Rhip.x - Lfoot.x);
    const e2 = Math.abs(Rsh.x - Lfoot.x);
    const e3 = Math.abs(Lhip.x - Lfoot.x);
    const e4 = Math.abs(Lsh.x - Lfoot.x);

    const avg = (e1 + e2 + e3 + e4) / 4;

    return clamp(1 - avg / 0.25, 0, 1);
  }

  // ---------------------------------------------------------
  // 🧠 HEAD STABILITY
  // ---------------------------------------------------------
  function scoreHead(frames, KF) {
    const start = KF.address ?? 0;
    const end = KF.impact ?? frames.length - 1;

    const head = [];

    for (let i = start; i <= end; i++) {
      if (frames[i] && frames[i][0]) head.push(frames[i][0]);
    }

    if (head.length < 5) return 0;

    const xs = head.map(h => h.x);
    const ys = head.map(h => h.y);

    const dx = Math.max(...xs) - Math.min(...xs);
    const dy = Math.max(...ys) - Math.min(...ys);

    const move = Math.sqrt(dx*dx + dy*dy);
    return clamp(1 - move / 0.12, 0, 1);
  }

  // ---------------------------------------------------------
  // 🕒 TEMPO backswing/downsing
  // ---------------------------------------------------------
  function scoreTempo(timestamps, KF) {
    const a = KF.address, t = KF.top, i = KF.impact;
    if (a == null || t == null || i == null) return 0;

    const tb = timestamps[t] - timestamps[a];
    const td = timestamps[i] - timestamps[t];

    if (tb <= 0 || td <= 0) return 0;
    const ratio = tb / td;

    return clamp(1 - Math.abs(ratio - 3) / 1.5, 0, 1);
  }

  // ---------------------------------------------------------
  // 🏆 SCORE GLOBAL PONDÉRÉ (/100)
  // ---------------------------------------------------------
  function computeSwingScorePremium(swing) {

    const F  = swing.frames;
    const KF = swing.keyFrames;
    const T  = swing.timestamps;

    if (!F || !KF) return { total: 0 };

    // Key phases
    const addr = F[KF.address]   || F[0];
    const top  = F[KF.top]       || addr;
    const down = F[KF.downswing] || top;
    const imp  = F[KF.impact]    || F[F.length - 1];
    const fin  = F[KF.finish]    || F[F.length - 1];

    // Compute all scores (normalized 0–1)
    const triangle = scoreTriangle(imp);
    const lag      = scoreLag(top);
    const plane    = scorePlane(imp);
    const rotation = scoreRotation(down);
    const head     = scoreHead(F, KF);
    const tempo    = scoreTempo(T, KF);
    const addressA = scoreAddressAlign(addr);
    const finishA  = scoreFinishAlign(fin);

    // ---------------------------------------------------------
    // 🧮 PONDÉRATION PRO (total = 100)
    // ---------------------------------------------------------
    const WEIGHTS = {
      triangle: 22,
      rotation: 20,
      plane: 15,
      lag: 10,
      head: 10,
      tempo: 8,
      addressA: 8,
      finishA: 7
    };

    const total =
      triangle * WEIGHTS.triangle +
      rotation * WEIGHTS.rotation +
      plane    * WEIGHTS.plane +
      lag      * WEIGHTS.lag +
      head     * WEIGHTS.head +
      tempo    * WEIGHTS.tempo +
      addressA * WEIGHTS.addressA +
      finishA  * WEIGHTS.finishA;

    const scoreFinal = Math.round(total);

    log("📊 SCORE PREMIUM =", scoreFinal);

    return {
      total: scoreFinal,
      triangle, lag, plane, rotation, head, tempo, addressA, finishA,
      keyFrames: KF
    };
  }

  // ---------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------
  return {
    compute: computeSwingScorePremium,
    setDebug: v => (DEBUG = v),
  };

})();

window.SwingScorer = SwingScorer;
