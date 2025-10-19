// === Parfect.golfr - history.js (MVP) ===

(function(){
  const HISTORY_KEY = "golfHistory"; // unique (pas de conflit)
  const $ = window.$ || (id => document.getElementById(id));

  window.renderHistory = function renderHistory(){
    const zone = $("history-list");
    if (!zone) return;
    const rounds = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

    if (!rounds.length) {
      zone.innerHTML = "<p style='opacity:.6'>Aucune partie enregistrée pour le moment.</p>";
      $("history-summary").innerHTML = "";
      return;
    }

    const totalRounds = rounds.length;
    const totalParfects = rounds.reduce((acc,r)=> acc+(r.parfects||0),0);
    const totalBogeyfects = rounds.reduce((acc,r)=> acc+(r.bogeyfects||0),0);
    const avgScore = Math.round((rounds.reduce((a,r)=>a+(r.totalVsPar||0),0)/totalRounds)*10)/10;

    $("history-summary").innerHTML = `
      <div class="summary-box">
        <div class="summary-item">📊 <strong>${totalRounds}</strong> parties</div>
        <div class="summary-item">Moyenne : <strong style="color:${avgScore<0?'#44ffaa':avgScore>0?'#ff5555':'#fff'}">${avgScore>0? "+"+avgScore : avgScore}</strong></div>
        <div class="summary-item">💚 <strong>${totalParfects}</strong> Parfects</div>
        <div class="summary-item">💙 <strong>${totalBogeyfects}</strong> Bogey’fects</div>
      </div>`;

    rounds.sort((a,b)=> new Date(b.date)-new Date(a.date));
    zone.innerHTML = rounds.map(r=>{
      const d = new Date(r.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"2-digit"});
      const color = r.totalVsPar<0? "#44ffaa" : r.totalVsPar>0? "#ff5555" : "#fff";
      const coachMsg = (function(){
        const h = Array.isArray(r.holes) ? r.holes[r.holes.length-1] : null;
        if (!h) return "Smart golf. Cool mindset.";
        const diff = h.score - h.par;
        if (diff<=-1) return "💚 Belle finition !";
        if (diff===0)  return "Par solide pour clore.";
        if (diff===1)  return "💙 Bogey’fect propre.";
        return "On apprend à chaque trou.";
      })();

      return `
        <div class="history-card">
          <div class="history-header">
            <span class="history-date">${d}</span>
            <span class="history-golf">⛳ ${r.golf}</span>
          </div>
          <div class="history-stats">
            <div>Total : <strong style="color:${color}">${r.totalVsPar>0? "+"+r.totalVsPar : r.totalVsPar}</strong></div>
            <div>💚 Parfects : <strong>${r.parfects}</strong> | 💙 Bogey’fects : <strong>${r.bogeyfects}</strong></div>
          </div>
          <div class="history-coach">"${coachMsg}"</div>
        </div>`;
    }).join("");

    $("reset-rounds")?.addEventListener("click", ()=>{
      if (!confirm("🧹 Supprimer tout l’historique des parties ?")) return;
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
    });
  };
})();
