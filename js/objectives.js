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
  greg: {
    avatar: "😎",
    name: "Greg",
    role: "Mindset & Stratégie",
    quote: "Smart golf, easy mindset. Reste cool, reste malin."
  },
  goathier: {
    avatar: "🧠",
    name: "Goathier",
    role: "Technique & Données",
    quote: "Le golf, c’est de la physique appliquée à ton swing."
  },
  dorothee: {
    avatar: "💫",
    name: "Dorothée",
    role: "Mental & Respiration",
    quote: "Respire, aligne-toi, laisse le mouvement venir à toi."
  }
};

let currentCoach = localStorage.getItem("coach") || "greg";

document.addEventListener("DOMContentLoaded", () => {
  const select = $("level-select");
  const statsZone = $("objective-stats");
  const footerIndex = $("footer-index");
  const coachSelect = $("coach-select-objectives"); // ✅ corrigé ici
  const bioZone = $("coach-bio");
  const chatBox = $("coach-chat");
  const openChat = $("open-coach-chat-objectives"); // ✅ corrigé aussi

  // === Objectifs ===
  function renderStats(level) {
    const o = objectives[level];
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

  const saved = localStorage.getItem("parfect_objective") || "9";
  select.value = saved;
  renderStats(saved);
  select.addEventListener("change", () => renderStats(select.value));

  // === Coach ===
  if (coachSelect) { // ✅ sécurité
    coachSelect.value = currentCoach;
    renderCoachBio(currentCoach);
    coachSelect.addEventListener("change", () => {
      currentCoach = coachSelect.value;
      localStorage.setItem("coach", currentCoach);
      renderCoachBio(currentCoach);
    });
  }

  // === Chat ===
  if (openChat) {
    openChat.addEventListener("click", () => {
      chatBox.style.display = "block";
      openChat.style.display = "none";
    });
  }

  $("send-chat")?.addEventListener("click", sendMessage);
  $("chat-text")?.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });
});


function renderCoachBio(coachKey) {
  const c = coachBios[coachKey];
  $("coach-bio").innerHTML = `
    <div class="coach-bio-card">
      <div class="coach-avatar">${c.avatar}</div>
      <div>
        <p><strong>${c.name}</strong> — ${c.role}</p>
        <p class="coach-quote">"${c.quote}"</p>
      </div>
    </div>
  `;
}

// === Envoi message ===
async function sendMessage() {
  const input = $("chat-text");
  const msg = input.value.trim();
  if (!msg) return;
  addMessage("user", msg);
  input.value = "";

  // Essai d'appel API OpenAI
  const apiResponse = await askCoachAPI(msg, currentCoach);
  if (apiResponse) {
    addMessage("coach", apiResponse);
    return;
  }

  // Sinon fallback local
  const reply = coachResponse(msg);
  addMessage("coach", reply);
}

function addMessage(role, text) {
  const chat = $("chat-messages");
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// === Fallback local simple ===
function coachResponse(msg) {
  if (currentCoach === "goathier") {
    return "🧠 Goathier : vérifie ton alignement et ta vitesse de club.";
  }
  if (currentCoach === "dorothee") {
    return "💫 Dorothée : calme ton souffle, un coup à la fois.";
  }
  return "😎 Greg : smart golf bro, reste fluide et cool.";
}

// === Appel OpenAI API (si clé définie) ===
async function askCoachAPI(message, coach) {
  const apiKey = localStorage.getItem("openai_key"); // ou ta clé backend
  if (!apiKey) return null; // pas de clé → pas d'appel

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Tu es ${coachBios[coach].name}, coach de golf spécialisé en ${coachBios[coach].role}. Sois concis, bienveillant, et motivant.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("Erreur API coach:", err);
    return null;
  }
}
