window.JustSwingLog = {
  show(swingData) {
    const out = document.getElementById("jsw-swing-log");
    out.innerHTML = `
      <h3>📊 Détails du swing #${swingData.index}</h3>
      <p><b>Score global :</b> ${swingData.total}/100</p>

      <h4>✨ Routine</h4>
      <p>${swingData.routineScore}/20</p>

      <h4>🏌️ Swing</h4>
      <p>${swingData.swingScore}/70</p>

      <h4>🔁 Régularité</h4>
      <p>${swingData.regularityScore}/10</p>

      <h4>🎯 Phases (0–10)</h4>
      <ul>
        ${Object.entries(swingData.phaseScores)
          .map(([k,v]) => `<li>${k}: ${v}/10</li>`)
          .join("")}
      </ul>

      <h4>📐 Launch Angle</h4>
      <p>${swingData.launchAngle.angleDeg.toFixed(1)}° (${swingData.launchAngle.source})</p>

      <h4>⚠️ Issues détectées</h4>
      <p>${swingData.detectedIssues.join(", ") || "Aucune"}</p>
    `;
  }
};
