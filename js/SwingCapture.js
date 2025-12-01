// =========================================================
//  SwingCapture.js – Enregistrement vidéo (MediaRecorder)
//  Global: window.SwingCapture
// =========================================================

(function () {
  let mediaRecorder = null;
  let chunks = [];
  let isRecording = false;
  let supported = false;

  function init(stream) {
    if (!stream || !window.MediaRecorder) {
      console.warn("MediaRecorder non supporté ou pas de stream.");
      supported = false;
      return;
    }

    let mimeType = "";
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const t of mimeTypes) {
      if (MediaRecorder.isTypeSupported(t)) {
        mimeType = t;
        break;
      }
    }

    try {
      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      supported = true;
    } catch (e) {
      console.warn("MediaRecorder init error:", e);
      supported = false;
      return;
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
  }

  function start() {
    if (!supported || !mediaRecorder || isRecording) return;
    chunks = [];
    try {
      mediaRecorder.start();
      isRecording = true;
    } catch (e) {
      console.warn("MediaRecorder start error:", e);
    }
  }

  function stop() {
    if (!supported || !mediaRecorder || !isRecording) {
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        chunks = [];
        isRecording = false;
        resolve(blob);
      };
      mediaRecorder.onerror = (err) => {
        console.error("MediaRecorder error:", err);
        isRecording = false;
        chunks = [];
        reject(err);
      };
      try {
        mediaRecorder.stop();
      } catch (e) {
        console.warn("MediaRecorder stop error:", e);
        reject(e);
      }
    });
  }

  window.SwingCapture = {
    init,
    start,
    stop,
    isSupported: () => supported,
  };
})();
