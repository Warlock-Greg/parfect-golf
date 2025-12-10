// ============================================================================
//                      SWING SCORER — VERSION PREMIUM PRO 
//                        Calibrée sur données réelles 2025
// ============================================================================

window.JSW_VIEW_MODE = "auto"; 
// valeurs possibles : "auto", "faceon", "dtl"

const SwingScorer = (() => {

  const DEBUG = false;
  const log = (...m) => DEBUG && console.log("[Scorer]", ...m);

  // ---------------------------------------------------------
  //  UTILS
  // ---------------------------------------------------------
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const dist = (a, b) => (!a || !b) ? 0 : Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (a, b, t) => a + (b - a) * t;

  const lineAngle = (A, B) =>
    (!A || !B) ? 0 : Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI;

  // ---------------------------------------------------------
  //  🔍 VIEW TYPE DETECTION
  // ---------------------------------------------------------
  function detectView(pAddress) {
    if (window.JSW_VIEW_MODE === "faceon") return "faceon";
    if (window.JSW_VIEW_MODE === "dtl") return "dtl";

    const LS = pAddress[11], RS = pAddress[12];
    if (!LS || !RS) return "faceon";

    // Si la ligne épaules est horizontale → Face-On
    const angle = Math.abs(lineAngle(LS, RS));
    return angle < 25 ? "faceon" : "dtl";
  }

  // ---------------------------------------------------------
  //  ROTATION — compatible FO + DTL
  // ---------------------------------------------------------
  function computeRotation(addressPose, topPose, view) {
    const Ls0 = addressPose[11], Rs0 = addressPose[12];
    const Ls1 = topPose[11], Rs1 = topPose[12];

    const Lh0 = addressPose[23], Rh0 = addressPose[24];
    const Lh1 = topPose[23], Rh1 = topPose[24];

    if (!Ls0 || !Rs0 || !Ls1 || !Rs1) return { shoulder: 0, hip: 0, xFactor: 0, score: 0 };

    if (view === "faceon") {
      // Face-On rotation: compression horizontale
      const W0 = dist(Ls0, Rs0);
      const W1 = dist(Ls1, Rs1);
      const ratioS = clamp(W1 / W0, 0.1, 1);

      const shoulder = Math.acos(ratioS) * 180 / Math.PI;

      const WH0 = dist(Lh0, Rh0);
      const WH1 = dist(Lh1, Rh1);
      const ratioH = clamp(WH1 / WH0, 0.1, 1);
      const hip = Math.acos(ratioH) * 180 / Math.PI;

      const xFactor = shoulder - hip;

      const score =
        (clamp(1 - Math.abs(shoulder - 90) / 40, 0, 1) +
         clamp(1 - Math.abs(hip - 45) / 25, 0, 1) +
         clamp(1 - Math.abs(xFactor - 40) / 30, 0, 1)) / 3;

      return { shoulder, hip, xFactor, score: Math.round(score * 20) };
    }

    // DTL : rotation via mouvement vertical relatif du torse
    const torso0 = { x: (Ls0.x + Rs0.x) / 2, y: (Ls0.y + Rs0.y) / 2 };
    const torso1 = { x: (Ls1.x + Rs1.x) / 2, y: (Ls1.y + Rs1.y) / 2 };

    // Plus le torse "remonte" en DTL, plus tu tournes
    const deltaY = torso0.y - torso1.y; // négatif = monte
    const shoulder = clamp(Math.abs(deltaY) * 600, 0, 100); // calibré d'après JSON
    const hip = shoulder * 0.45;
    const xFactor = shoulder - hip;

    const score =
      (clamp(shoulder / 100, 0, 1) +
       clamp(hip / 60, 0, 1) +
       clamp(xFactor / 40, 0, 1)) / 3;

    return { shoulder, hip, xFactor, score: Math.round(score * 20) };
  }

  // ---------------------------------------------------------
  //  TRIANGLE — variation bras/torse robuste
  // ---------------------------------------------------------
  function computeTriangle(addr, top, impact) {
    if (!addr || !top || !impact) return { score: 10 };

    const LS0 = addr[11], LH0 = addr[15];
    const LS1 = top[11],  LH1 = top[15];
    const LS2 = impact[11], LH2 = impact[15];

    const d0 = dist(LS0, LH0);
    const d1 = dist(LS1, LH1);
    const d2 = dist(LS2, LH2);

    const varTop = Math.abs(d1 - d0) / (d0 + 1e-6);
    const varImp = Math.abs(d2 - d0) / (d0 + 1e-6);

    const score =
      (clamp(1 - varTop * 4, 0, 1) +
       clamp(1 - varImp * 5, 0, 1)) / 2;

    return {
      varTop: varTop * 100,
      varImpact: varImp * 100,
      score: Math.round(score * 20)
    };
  }

  // ---------------------------------------------------------
  //  WEIGHT SHIFT — calibré sur amplitudes Mediapipe réelles
  // ---------------------------------------------------------
  function computeWeightShift(addr, top, impact) {
    const hips = p => p ? ( { x:(p[23].x+p[24].x)/2, y:(p[23].y+p[24].y)/2 } ) : null;
    const h0 = hips(addr), h1 = hips(top), h2 = hips(impact);

    if (!h0 || !h1 || !h2) return { score: 10 };

    // Les valeurs Mediapipe tournent entre ±0.03 max en x → recalibrage
    const shiftBack = h1.x - h0.x;
    const shiftFwd  = h0.x - h2.x;

    const score =
      (clamp(Math.abs(shiftBack) / 0.03, 0, 1) +
       clamp(Math.abs(shiftFwd)  / 0.03, 0, 1)) / 2;

    return {
      shiftBack,
      shiftFwd,
      score: Math.round(score * 15)
    };
  }

  // ---------------------------------------------------------
  //  TEMPO — robuste même si downswing très court
  // ---------------------------------------------------------
  function computeTempo(kf, timestamps, fps = 30) {
    if (!kf.address || !kf.top || !kf.impact) return { score: 10 };

    const a = kf.address.index;
    const t = kf.top.index;
    const i = kf.impact.index;

    const backswing = (t - a) / fps;
    const downswing = (i - t) / fps;

    if (downswing < 0.03) return { backswing, downswing, ratio: 0, score: 5 };

    const ratio = backswing / downswing;

    const score =
      clamp(1 - Math.abs(ratio - 3) / 2.5, 0, 1);

    return {
      backswing,
      downswing,
      ratio,
      score: Math.round(score * 10)
    };
  }

  // ---------------------------------------------------------
  //  MAIN — compute scoring
  // ---------------------------------------------------------
  function compute(swing) {
    const F   = swing.frames;
    const kf  = swing.keyFrames;
    const T   = swing.timestamps;
    const fps = 30;

    const addr   = F[kf.address?.index ?? 0];
    const top    = F[kf.top?.index];
    const imp    = F[kf.impact?.index];
    const fin    = F[kf.finish?.index];

    const view = detectView(addr);

    const rotation  = computeRotation(addr, top, view);
    const triangle  = computeTriangle(addr, top, imp);
    const weight    = computeWeightShift(addr, top, imp);
    const tempo     = computeTempo(kf, T, fps);

    const total =
      rotation.score +
      triangle.score +
      weight.score +
      tempo.score +
      14 + 7; // posture + extension placeholders

    return {
      total: Math.round(total),
      viewType: view,
      rotation,
      triangle,
      weight,
      tempo
    };
  }

  return { compute };
})();

window.SwingScorer = SwingScorer;
