// === Parfect.golfr - objectives.js (MVP) ===

(function(){
  const $ = window.$ || (id => document.getElementById(id));

  const objectives = {
    0:{fairways:79,gir:67,putts:29,pars:15,fw:11,gr:12},
    5:{fairways:71,gir:56,putts:30,pars:12,fw:10,gr:10},
    7:{fairways:64,gir:50,putts:31,pars:11,fw:9,gr:9},
    9:{fairways:57,gir:44,putts:32,pars:10,fw:8,gr:8},
    12:{fairways:50,gir:33,putts:33,pars:8,fw:7,gr:6},
    15:{fairways:43,gir:22,putts:34,pars:6,fw:6,gr:4},
    18:{fairways:36,gir:17,putts:35,pars:5,fw:5,gr:3},
    21:{fairways:29,gir:11,putts:36,pars:4,fw:4,gr:2}
  };

  const coachBios = {
    greg: { avatar:"😎", name:"Greg", role:"Mindset & Stratégie", quote:"Smart golf, easy mindset." },
    goathier: { avatar:"🧠", name:"Goathier", role:"Technique & Données", quote:"Le golf, c’est de la physique appliquée." },
    dorothee: { avatar:"💫", name:"Dorothée", role:"Mental & Respiration", quote:"Respire, aligne-toi, laisse venir le mouvement." }
  };

  let currentCoach = localStorage.getItem("coach") || "greg";

  function renderStats(level, statsZone, footerIndex){
    const o = objectives[level]; if (!o) return;
    statsZone.innerHTML = `
      <div class="objective-card">
        <p><strong>Fairways :</strong> ${o.fairways}% (${o.fw})</p>
        <p><strong>GIR :</strong> ${o.gir}% (${o.gr})</p>
        <p><strong>Putts :</strong> ${o.putts}</p>
        <p><strong>Pars :</strong> ${o.pars}</p>
      </div>`;
    footerIndex.textContent = `index ${level}`;
    localStorage.setItem("parfect_objective", level);
  }

  function renderCoachBio(key){
    const c = coachBios[key]; if (!c) return;
    const zone = $("coach-bio"); if (!zone) return;
    zone.innerHTML = `
      <div class="coach-bio-card">
        <div class="coach-avatar">${c.avatar}</div>
        <div>
          <p><strong>${c.name}</strong> — ${c.role}</p>
          <p class="coach-quote">"${c.quote}"</p>
        </div>
      </div>`;
  }

  async function sendMessage(){
    const input = $("chat-text"); const chat = $("chat-messages");
    if (!input || !chat) return;
    const msg = (input.value||"").trim(); if (!msg) return;
    appendMsg("user", msg); input.value="";

    // Fallback local
    let reply = "😎 Greg : Smart golf. Reste cool.";
    if (currentCoach==="goathier") reply = "🧠 Goathier : tempo + alignement = précision.";
    if (currentCoach==="dorothee") reply = "💫 Dorothée : respire, un coup à la fois.";
    appendMsg("coach", reply);
  }

  function appendMsg(role, text){
    const chat = $("chat-messages"); if (!chat) return;
    const div = document.createElement("div");
    div.className = `msg ${role}`; div.textContent = text;
    chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
  }

  // Public
  window.initObjectives = function initObjectives(){
    const select = $("level-select");
    const statsZone = $("objective-stats");
    const footerIndex = $("footer-index");
    // NOTE : id réalistes trouvés dans ta page : "coach-select" et "open-coach-chat"
    // si tu as d’autres ids, adapte ici :
    const coachSelect = document.getElementById("coach-select") || document.getElementById("coach-select-objectives");
    const bioZone = $("coach-bio");
    const chatBox = $("coach-chat");
    const openChat = document.getElementById("open-coach-chat") || document.getElementById("open-coach-chat-objectives");

    if (!select || !statsZone || !footerIndex) {
      // la page n'est pas visible, on ignore
      return;
    }

    const saved = localStorage.getItem("parfect_objective") || "9";
    select.value = saved;
    renderStats(saved, statsZone, footerIndex);
    select.addEventListener("change", ()=> renderStats(select.value, statsZone, footerIndex));

    if (coachSelect) {
      coachSelect.value = currentCoach;
      renderCoachBio(currentCoach);
      coachSelect.addEventListener("change",()=>{
        currentCoach = coachSelect.value;
        localStorage.setItem("coach", currentCoach);
        renderCoachBio(currentCoach);
      });
    }

    openChat?.addEventListener("click", ()=>{
      if (chatBox) chatBox.style.display = "block";
      openChat.style.display = "none";
    });

    $("send-chat")?.addEventListener("click", sendMessage);
    $("chat-text")?.addEventListener("keypress", e => { if (e.key==="Enter") sendMessage(); });
  };
})();
