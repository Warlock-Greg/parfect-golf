// === Parfect.golfr - history.js (MVP+ corrigé) ===

(function(){
  const HISTORY_KEY = "golfHistory"; // clé unique
  const $ = window.$ || (id => document.getElementById(id));

  // === Injection de l'UI Historique ===
  window.injectHistoryUI = function injectHistoryUI(){
    console.log("📜 Chargement de l'historique...");
    
    const parent = $("interaction-zone");
    if (!parent) {
      console.warn("⚠️ Zone interaction-zone introuvable dans index.html");
      return;
    }

    // Crée ou vide le conteneur principal
    let container = $("history-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "history-container";
      container.style.padding = "16px";
      container.style.textAlign = "center";
      container.style.background = "rgba(0,0,0,0.8)";
      container.style.borderRadius = "12px";
      container.style.margin = "16px auto";
      container.style.maxWidth = "600px";
      parent.appendChild(container);
    }
    container.innerHTML = `
      <h2 style="color:#00ff99;">📜 Historique des parties</h2>
      <div id="history-summary" style="margin-top:10px;"></div>
      <div id="history-list" style="margin-top:20px;"></div>
      <button id="reset-rounds" class="btn" style="margin-top:20px;background:#ff4444;color:#fff;">🧹 Réinitialiser</button>
    `;

    // Appelle le rendu
    renderHistory();
  };

  // === Rendu de l'historique ===
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
      <div class="summary-box" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;justify-items:center;">
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
        <div class="history-card" style="background:#111;border:1px solid #333;border-radius:10px;padding:10px;margin-top:12px;text-align:left;">
          <div class="history-header" style="display:flex;justify-content:space-between;font-size:0.9rem;color:#00ff99;">
            <span class="history-date">${d}</span>
            <span class="history-golf">⛳ ${r.golf}</span>
          </div>
          <div class="history-stats" style="margin-top:6px;">
            <div>Total : <strong style="color:${color}">${r.totalVsPar>0? "+"+r.totalVsPar : r.totalVsPar}</strong></div>
            <div>💚 Parfects : <strong>${r.parfects}</strong> | 💙 Bogey’fects : <strong>${r.bogeyfects}</strong></div>
          </div>
          <div class="history-coach" style="margin-top:6px;font-style:italic;opacity:.8;">"${coachMsg}"</div>
        </div>`;
    }).join("");

    $("reset-rounds")?.addEventListener("click", ()=>{
      if (!confirm("🧹 Supprimer tout l’historique des parties ?")) return;
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
    });
  };
})();

