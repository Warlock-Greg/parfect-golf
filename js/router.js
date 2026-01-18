// ==========================================================
// ROUTER.JS — NAVIGATION CENTRALE PARFECT.GOLFR (Refactor 2026)
// Objectifs:
// - Une seule vue visible a la fois (pas de superposition)
// - Tolere DOM incomplet (pas de crash)
// - Flow Onboarding -> Home hub
// - JustSwing stable + reprise apres activation licence
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Router charge");

  const $ = (id) => document.getElementById(id);

  // --------------------------
  // Zones (views)
  // --------------------------
  const views = {
    home: $("home-area"),
    play: $("game-area"),
    training: $("training-area"),
    friends: $("friends-area"),
    history: $("history-area"),      // optionnel
    justswing: $("just-swing-area"),
    swing: $("swing-analyzer")       // legacy (si encore present)
  };

  // --------------------------
  // Nav buttons
  // --------------------------
  const navButtons = {
    home: $("home-btn"),
    play: $("play-btn"),
    training: $("training-btn"),
    friends: $("friends-btn"),
    justswing: $("just-swing-btn"),
    // legacy:
    swing: $("swing-btn"),
    history: $("history-btn")
  };

  // --------------------------
  // Safe coach message
  // --------------------------
  function say(msg) {
    try {
      window.coachReact?.(msg);
    } catch (e) {
      console.warn("coachReact error:", e);
    }
  }

  // --------------------------
  // One rule: hide everything before showing one view
  // --------------------------
  function hideAllViews() {
    Object.values(views).forEach((el) => {
      if (el) el.style.display = "none";
    });
  }

  function setActive(routeKey) {
    // retire active sur tous les boutons de nav connus
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    navButtons[routeKey]?.classList.add("active");
  }

  // --------------------------
  // Leave swing modes (stop camera etc.)
  // --------------------------
  function leaveSwingMode() {
    // quitte le fullscreen JSW si tu utilises cette classe
    document.body.classList.remove("jsw-fullscreen");
    document.body.classList.remove("mode-swing");

    // arret camera naive: on stoppe uniquement les videos actives
    document.querySelectorAll("video").forEach((video) => {
      try {
        if (video?.srcObject) {
          video.srcObject.getTracks().forEach((t) => t.stop());
          video.srcObject = null;
        }
      } catch (_) {}
    });

    // legacy: swing analyzer v2 desactive
    window.initSwingAnalyzerV2 = () => console.log("Swing Analyzer desactive");
  }

  // --------------------------
  // Navigate (single source of truth)
  // --------------------------
  async function navigate(routeKey, opts = {}) {
    const { silent = false } = opts;

    // toujours: pas de vues empilees
    hideAllViews();

    // toujours: sortir des modes swing quand on va ailleurs
    if (routeKey !== "justswing") leaveSwingMode();

    // activer nav
    setActive(routeKey);

    // afficher la vue cible si elle existe
    const target = views[routeKey];
    if (target) target.style.display = "block";

    if (!silent) {
      // messages courts, sans emojis
      const messages = {
        home: "Accueil",
        play: "Mode parcours",
        training: "Mode entrainement",
        friends: "Mode social",
        justswing: "Just Swing"
      };
      if (messages[routeKey]) say(messages[routeKey]);
    }

    // hooks ecran
    if (routeKey === "play") {
      window.showResumeOrNewModal?.();
    }

    if (routeKey === "training") {
      window.initTraining?.();
    }

    if (routeKey === "friends") {
      window.injectSocialUI?.();
    }

    if (routeKey === "history") {
      window.injectHistoryUI?.();
    }

    if (routeKey === "justswing") {
      // JustSwing: on ne force pas leaveSwingMode ici
      document.body.classList.add("mode-swing");
      document.body.classList.add("jsw-fullscreen"); // si ton CSS masque header/nav

      // laisse le DOM respirer
      await new Promise((r) => requestAnimationFrame(r));

      // init une fois
      if (!window._justSwingInitDone) {
        if (window.JustSwing?.initJustSwing) {
          window.JustSwing.initJustSwing();
          window._justSwingInitDone = true;
        }
      }

      // camera + session
      if (typeof window.startJustSwingCamera === "function") {
        await window.startJustSwingCamera();
      }

      window.JustSwing?.startSession?.("swing");
    }
  }

  // --------------------------
  // Licence boot (une fois)
  // --------------------------
  if (typeof window.initLicence === "function") {
    window.initLicence();
  }

  // --------------------------
  // Onboarding
  // --------------------------
  const startBtn = $("start-onboarding");
  const onboarding = $("onboarding");

  if (startBtn && onboarding) {
    startBtn.addEventListener("click", async () => {
      onboarding.style.opacity = "0";
      onboarding.style.transition = "opacity .5s ease";
      setTimeout(() => onboarding.remove(), 500);

      // Flow: onboarding -> Home (hub)
      await navigate("home", { silent: true });
      say("Choisis une action.");
    });
  }

  // --------------------------
  // Nav bindings (safe)
  // --------------------------
  navButtons.play?.addEventListener("click", () => navigate("play"));
  navButtons.training?.addEventListener("click", () => navigate("training"));
  navButtons.friends?.addEventListener("click", () => navigate("friends"));
  navButtons.home?.addEventListener("click", () => navigate("home"));
  navButtons.justswing?.addEventListener("click", () => navigate("justswing"));

  // --------------------------
  // Home tiles bindings (si tu les as dans le DOM)
  // --------------------------
  $("home-play")?.addEventListener("click", () => navigate("play"));
  $("home-training")?.addEventListener("click", () => navigate("training"));
  $("home-friends")?.addEventListener("click", () => navigate("friends"));
  $("home-just-swing")?.addEventListener("click", () => navigate("justswing"));

  // --------------------------
  // Licence activée a chaud -> reprise JustSwing
  // --------------------------
  window.addEventListener("parfect:licence:activated", async () => {
    console.log("Licence activee -> reprise JustSwing");

    // on se place sur JSW
    await navigate("justswing", { silent: true });

    say("Licence activee. Just Swing pret.");
  });

  // --------------------------
  // Etat initial
  // - si onboarding present: ne force rien (onboarding couvre)
  // - sinon: home
  // --------------------------
  if (!$("onboarding")) {
    navigate("home", { silent: true });
  } else {
    // evite un ecran vide derriere onboarding
    hideAllViews();
    views.home && (views.home.style.display = "block");
  }
});
