// === SwingCapture.js ===
// Gestion de l'enregistrement vidéo d'un swing avec MediaRecorder

let mediaRecorder = null;
let chunks = [];
let isRecording = false;
let resolveStop = null;
let rejectStop = null;
let captureSupported = false;

export function initSwingCapture(stream) {
  if (!window.MediaRecorder) {
    console.warn("MediaRecorder non supporté sur ce navigateur.");
    captureSupported = false;
    return;
  }

  // On essaie quelques MIME types
  const mimeTypes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  let mimeType = "";
  for (const type of mimeTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      mimeType = type;
      break;
    }
  }

  try {
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    captureSupported = true;
  } catch (e) {
    console.warn("Impossible d'initialiser MediaRecorder:", e);
    captureSupported = false;
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    chunks = [];
    isRecording = false;
    if (resolveStop) {
      resolveStop(blob);
    }
    resolveStop = null;
    rejectStop = null;
  };

  mediaRecorder.onerror = (err) => {
    console.error("MediaRecorder error:", err);
    if (rejectStop) {
      rejectStop(err);
    }
    chunks = [];
    isRecording = false;
    resolveStop = null;
    rejectStop = null;
  };
}

export function startSwingRecording() {
  if (!captureSupported || !mediaRecorder) return;
  if (isRecording) return;

  chunks = [];
  try {
    mediaRecorder.start();
    isRecording = true;
    console.log("🎥 Swing recording démarré");
  } catch (e) {
    console.warn("Erreur start MediaRecorder:", e);
  }
}

export function stopSwingRecording() {
  if (!captureSupported || !mediaRecorder || !isRecording) {
    return Promise.resolve(null); // on renvoie null si pas de vidéo
  }

  return new Promise((resolve, reject) => {
    resolveStop = resolve;
    rejectStop = reject;
    try {
      mediaRecorder.stop();
      console.log("🛑 Swing recording stoppé");
    } catch (e) {
      console.warn("Erreur stop MediaRecorder:", e);
      reject(e);
    }
  });
}

export function isSwingRecordingSupported() {
  return captureSupported;
}
