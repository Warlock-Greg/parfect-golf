const objectives = {
  0: { fairways:79, gir:67, putts:29, pars:15, fw:11, gr:12 },
  5: { fairways:71, gir:56, putts:30, pars:12, fw:10, gr:10 },
  7: { fairways:64, gir:50, putts:31, pars:11, fw:9, gr:9 },
  9: { fairways:57, gir:44, putts:32, pars:10, fw:8, gr:8 },
  12:{ fairways:50, gir:33, putts:33, pars:8, fw:7, gr:6 },
  15:{ fairways:43, gir:22, putts:34, pars:6, fw:6, gr:4 },
  18:{ fairways:36, gir:17, putts:35, pars:5, fw:5, gr:3 },
  21:{ fairways:29, gir:11, putts:36, pars:4, fw:4, gr:2 }
};

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("level-select");
  const statsZone = document.getElementById("objective-stats");
  const footerIndex = document.getElementById("footer-index");

  function renderStats(level) {
    const o = objectives[level];
    statsZone.innerHTML = `
      <div class="objective-card">
        <p><strong>Fairways :</strong> ${o.fairways}% (${o.fw} en moyenne)</p>
        <p><strong>GIR :</strong> ${o.gir}% (${o.gr} greens)</p>
        <p><strong>Putts :</strong> ${o.putts}</p>
        <p><strong>Pars :</strong> ${o.pars}</p>
      </div>
    `;
    footerIndex.textContent = `index ${level}`;
    localStorage.setItem("parfect_objective", level);
  }

  const saved = localStorage.getItem("parfect_objective") || "9";
  select.value = saved;
  renderStats(saved);

  select.addEventListener("change", () => renderStats(select.value));
});
