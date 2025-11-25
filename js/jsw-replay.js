window.JustSwingReplay = {
  show(swingData) {
    const modal = document.getElementById("jsw-replay-modal");
    const canvas = document.getElementById("jsw-replay-canvas");
    const ctx = canvas.getContext("2d");

    modal.classList.remove("hidden");

    const frames = [
      ...(swingData.impactContext?.framesAvantImpact || []),
      ...(swingData.impactContext?.framesApresImpact || []),
    ];

    let i = 0;
    function play() {
      if (i >= frames.length) return;
      const f = frames[i];
      ctx.putImageData(f.imageData, 0, 0);
      i++;
      requestAnimationFrame(play);
    }
    play();
  }
};
