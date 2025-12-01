// === SwingPlayer.js ===

let swingVideoEl;
let playPauseBtn;
let speedSelect;
let prevFrameBtn;
let nextFrameBtn;
let timelineInput;
let timeLabel;

const ASSUMED_FPS = 30;

export function initSwingPlayer() {
  swingVideoEl = document.getElementById("swing-video");
  playPauseBtn = document.getElementById("swing-play-pause");
  speedSelect = document.getElementById("swing-speed");
  prevFrameBtn = document.getElementById("swing-prev-frame");
  nextFrameBtn = document.getElementById("swing-next-frame");
  timelineInput = document.getElementById("swing-timeline");
  timeLabel = document.getElementById("swing-time-label");

  if (!swingVideoEl) {
    console.warn("swing-video non trouvé");
    return;
  }

  playPauseBtn.addEventListener("click", togglePlayPause);
  speedSelect.addEventListener("change", onSpeedChange);
  prevFrameBtn.addEventListener("click", () => stepFrame(-1));
  nextFrameBtn.addEventListener("click", () => stepFrame(1));
  timelineInput.addEventListener("input", onTimelineChange);

  swingVideoEl.addEventListener("timeupdate", syncTimeline);
  swingVideoEl.addEventListener("loadedmetadata", () => {
    timelineInput.value = 0;
    timeLabel.textContent = "0.0s";
  });
}

function togglePlayPause() {
  if (swingVideoEl.paused) {
    swingVideoEl.play();
    playPauseBtn.textContent = "⏸️";
  } else {
    swingVideoEl.pause();
    playPauseBtn.textContent = "▶️";
  }
}

function onSpeedChange() {
  const v = parseFloat(speedSelect.value || "1");
  swingVideoEl.playbackRate = v;
}

function stepFrame(direction) {
  const dt = 1 / ASSUMED_FPS;
  swingVideoEl.pause();
  playPauseBtn.textContent = "▶️";
  swingVideoEl.currentTime = Math.max(
    0,
    Math.min(swingVideoEl.duration || 0, swingVideoEl.currentTime + direction * dt)
  );
}

function onTimelineChange() {
  const val = parseFloat(timelineInput.value);
  const dur = swingVideoEl.duration || 0;
  swingVideoEl.currentTime = (val / 100) * dur;
}

function syncTimeline() {
  const dur = swingVideoEl.duration || 0;
  if (!dur) return;

  const ratio = (swingVideoEl.currentTime / dur) * 100;
  timelineInput.value = ratio.toFixed(1);
  timeLabel.textContent = `${swingVideoEl.currentTime.toFixed(1)}s`;
}

export function loadSwingVideoFromBlob(blob) {
  if (!swingVideoEl) return;
  const url = URL.createObjectURL(blob);
  swingVideoEl.src = url;
  swingVideoEl.playbackRate = parseFloat(speedSelect?.value || "1");
  swingVideoEl.play().catch(() => {
    // auto-play bloqué, c'est pas grave
  });
  playPauseBtn.textContent = "⏸️";
}
