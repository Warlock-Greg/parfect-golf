// =========================================================
//  SwingPlayer.js – Replay vidéo du swing
//  Global: window.SwingPlayer
//  Requiert dans le DOM :
//   <video id="swing-video" playsinline></video>
//   <button id="swing-play-pause">▶️</button>
//   <select id="swing-speed">…</select>
//   <input id="swing-timeline" type="range" …>
//   <span id="swing-time-label"></span>
// =========================================================

(function () {
  let videoEl, playPauseBtn, speedSel, timelineInput, timeLabel;
  const FPS = 30;

  function init() {
    videoEl = document.getElementById("swing-video");
    playPauseBtn = document.getElementById("swing-play-pause");
    speedSel = document.getElementById("swing-speed");
    timelineInput = document.getElementById("swing-timeline");
    timeLabel = document.getElementById("swing-time-label");

    if (!videoEl) {
      console.warn("SwingPlayer: #swing-video non trouvé");
      return;
    }

    playPauseBtn?.addEventListener("click", togglePlay);
    speedSel?.addEventListener("change", updateSpeed);
    timelineInput?.addEventListener("input", onTimelineInput);
    videoEl.addEventListener("timeupdate", syncTimeline);
  }

  function togglePlay() {
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play();
      if (playPauseBtn) playPauseBtn.textContent = "⏸️";
    } else {
      videoEl.pause();
      if (playPauseBtn) playPauseBtn.textContent = "▶️";
    }
  }

  function updateSpeed() {
    if (!videoEl || !speedSel) return;
    const v = parseFloat(speedSel.value || "1");
    videoEl.playbackRate = v;
  }

  function onTimelineInput() {
    if (!videoEl || !timelineInput) return;
    const ratio = parseFloat(timelineInput.value || "0") / 100;
    videoEl.currentTime = ratio * (videoEl.duration || 0);
  }

  function syncTimeline() {
    if (!videoEl || !timelineInput || !timeLabel) return;
    const dur = videoEl.duration || 0;
    if (!dur) return;
    const ratio = (videoEl.currentTime / dur) * 100;
    timelineInput.value = ratio.toFixed(1);
    timeLabel.textContent = `${videoEl.currentTime.toFixed(1)}s`;
  }

  function loadBlob(blob) {
    if (!videoEl || !blob) return;
    const url = URL.createObjectURL(blob);
    videoEl.src = url;
    videoEl.playbackRate = speedSel ? parseFloat(speedSel.value || "1") : 1;
    videoEl.play().catch(() => {});
    if (playPauseBtn) playPauseBtn.textContent = "⏸️";
  }

  window.SwingPlayer = {
    init,
    loadBlob,
  };
})();
