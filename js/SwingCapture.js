// =========================================================
//  SwingCapture.js – capture vidéo du swing
//  Retourne : Blob (webm/mp4 selon navigateur)
//  Utilisé par : JustSwing.handleSwingComplete()
// =========================================================

(function () {

  let mediaRecorder = null;
  let chunks = [];
  let stream = null;

  function init(videoStream) {
    if (!videoStream) {
      console.warn("SwingCapture.init: pas de stream vidéo");
      return;
    }
    stream = videoStream;
    console.log("📹 SwingCapture initialisé");
  }

  function start() {
    if (!stream) {
      console.warn("SwingCapture.start: stream non initialisé");
      return;
    }

    chunks = [];

    try {
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9"
      });
    } catch (err) {
      console.warn("MediaRecorder fallback vp8", err);
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8"
      });
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.start();
    console.log("⏺️ SwingCapture START");
  }

  function stop() {
    return new Promise((resolve) => {
      if (!mediaRecorder) {
        console.warn("SwingCapture.stop: rien à stopper");
        return resolve(null);
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        console.log("📦 SwingCapture STOP → blob OK", blob);
        resolve(blob);
      };

      console.log("⏹️ SwingCapture STOP (demande)");
      mediaRecorder.stop();
    });
  }

  window.SwingCapture = {
    init,
    start,
    stop
  };
})();
