// === Parfect.golfr - Coach IA Stable ===

let coachVisible = true;

// --- Initialisation du coach ---
function initCoachIA() {
  const coachLog = document.getElementById("coach-log");
  const coachInput = document.getElementById("coach-input");
  const coachSend = document.getElementById("coach-send");

  if (!coachLog || !coachInput || !coachSend) {
    console.warn("⚠️ Coach IA : éléments manquants dans le DOM");
    return;
  }

  // Message d’accueil unique
  if (!localStorage.getItem("coachIntroDone")) {
    appendCoachMessage("👋 Salut golfeur ! Je suis ton coach IA Parfect.golfr. Pose-moi une question ou lance ta session !");
    localStorage.setItem("coachIntroDone", "true");
  }

  // Envoi manuel par clic
  coachSend.addEventListener("click", () => handleCoachInput(coachInput, coachLog));

  // Envoi par touche Entrée
  coachInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleCoachInput(coachInput, coachLog);
    }
  });
}

// --- Traitement de la saisie utilisateur ---
function handleCoachInput(input, log) {
  const message = input.value.trim();
  if (!message) return;

  appendUserMessage(message);
  input.value = "";

  // Simule une réponse coach
  setTimeout(() => {
    respondAsCoach(message);
  }, 500);
}

// --- Réponses du coach ---
function respondAsCoach(message) {
  let reply = "⛳ Un coup après l’autre ! Reste concentré sur ton flow.";

  if (/routine/i.test(message)) reply = "💆 Respire, visualise et engage ta routine complète avant chaque coup.";
  if (/putt/i.test(message)) reply = "🎯 Vise un rythme fluide sur tes putts, pas la force.";
  if (/drive/i.test(message)) reply = "🏌️ Allonge sans forcer : priorité au contrôle du contact.";
  if (/bogey/i.test(message)) reply = "💙 Un Bogey’fect reste un bon coup. L’important c’est le mental !";
  if (/par/i.test(message)) reply = "💚 Par solide, ça se construit avec des choix intelligents.";
  if (/relax/i.test(message)) reply = "😌 Respire entre les coups. Le relâchement crée la performance.";

  appendCoachMessage(reply);
}

// --- Affichage d’un message du joueur ---
function appendUserMessage(text) {
  const log = document.getElementById("coach-log");
  const div = document.createElement("div");
  div.className = "msg user";
  div.textContent = text;
  log.appendChild(div);
  scrollCoachLog();
}

// --- Affichage d’un message du coach ---
function appendCoachMessage(text) {
  const log = document.getElementById("coach-log");
  const div = document.createElement("div");
  div.className = "msg coach";
  div.textContent = text;
  log.appendChild(div);
  scrollCoachLog();
}

// --- Scroll fluide sans forcer le focus ---
function scrollCoachLog() {
  const log = document.getElementById("coach-log");
  log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
}

// --- Interface pour les autres modules (play.js, training.js...) ---
function showCoachIA(message = "") {
  const coachLog = document.getElementById("coach-log");
  const coach = document.getElementById("coach-ia");
  if (!coach || !coachLog) return;

  coach.style.display = "flex";

  if (message) appendCoachMessage(message);
}

function hideCoachIA() {
  const coach = document.getElementById("coach-ia");
  if (coach) coach.style.display = "none";
}

function showCoachToast(msg, color = "#00ff99") {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.position = "fixed";
  toast.style.bottom = "80px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = color;
  toast.style.color = "#111";
  toast.style.padding = "8px 14px";
  toast.style.borderRadius = "8px";
  toast.style.fontWeight = "bold";
  toast.style.zIndex = 9999;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// --- Export global ---
window.initCoachIA = initCoachIA;
window.showCoachIA = showCoachIA;
window.hideCoachIA = hideCoachIA;
window.showCoachToast = showCoachToast;


// === Flux de jeu intégré au chat IA ===
console.log("🧠 Mode interactif Coach IA initialisé");

function typeCoachMessage(text, callback) {
  const log = document.getElementById("coach-log");
  const div = document.createElement("div");
  div.className = "msg coach";
  div.innerHTML = "";
  log.appendChild(div);
  let i = 0;
  const speed = 18;
  (function type() {
    if (i < text.length) {
      div.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
      log.scrollTop = log.scrollHeight;
    } else if (callback) {
      callback();
    }
  })();
}

// Helpers pour boutons de choix
function addChoiceButtons(choices) {
  const log = document.getElementById("coach-log");
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexWrap = "wrap";
  wrapper.style.gap = "8px";
  wrapper.style.marginTop = "10px";
  wrapper.style.justifyContent = "center";

  choices.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = c.label;
    btn.onclick = () => {
      wrapper.remove();
      appendCoachMessage(`👉 ${c.label}`);
      c.action();
    };
    wrapper.appendChild(btn);
  });

  log.appendChild(wrapper);
  scrollCoachLog();
}

// === Étape 1 : Démarrage ===
window.coachAskNewRound = function() {
  const log = document.getElementById("coach-log");
  if (log) log.innerHTML = ""; // reset du chat
  typeCoachMessage("Salut champion 🏌️‍♂️ Prêt à lancer une nouvelle partie ?", () => {
    addChoiceButtons([
      { label: "🎯 Nouvelle partie", action: coachAskGolf },
      { label: "♻️ Reprendre une partie", action: () => renderHole?.(1) }
    ]);
  });
};

// === Étape 2 : Choix du golf ===
async function coachAskGolf() {
  appendCoachMessage("Choisis ton golf préféré ⛳");
  try {
    const res = await fetch("./data/golfs.json");
    const golfs = await res.json();
    addChoiceButtons(golfs.map(g => ({
      label: g.name,
      action: () => {
        localStorage.setItem("selectedGolf", g.id);
        appendCoachMessage(`Super choix 💚 ${g.name} !`);
        setTimeout(coachAskCoach, 600);
      }
    })));
  } catch {
    appendCoachMessage("❌ Erreur lors du chargement des golfs.");
  }
}

// === Étape 3 : Choix du coach ===
function coachAskCoach() {
  appendCoachMessage("Maintenant, choisis ton coach 🎓");

  const coachs = [
    { id: "dorothee", label: "🧘 Dorothée", quote: "Respire. Visualise. Tu as déjà réussi ce coup." },
    { id: "goathier", label: "🧠 Goathier", quote: "Le fairway, c’est ta zone de confort. Joue smart." },
    { id: "greg", label: "💪 Greg", quote: "Fonce, vise le drapeau. 1 coup à la fois !" },
    { id: "chill", label: "😎 Chill", quote: "Relax. C’est juste du golf. Kiffe ton swing." }
  ];

  addChoiceButtons(coachs.map(c => ({
    label: c.label,
    action: () => {
      localStorage.setItem("selectedCoach", c.id);
      appendCoachMessage(`Excellent choix 😎 Tu joueras avec <b>${c.label}</b> aujourd’hui !`);
      appendCoachMessage(`<i>"${c.quote}"</i>`);
      setTimeout(coachAskMood, 600);
    }
  })));
}

// === Étape 4 : Mood ===
function coachAskMood() {
  appendCoachMessage("Quel est ton mood du jour ? 😎");
  const moods = ["Focus", "Relax", "Fun", "Grind"];
  addChoiceButtons(moods.map(m => ({
    label: m,
    action: () => {
      localStorage.setItem("mood", m);
      appendCoachMessage(`Mood sélectionné : <b>${m}</b>`);
      setTimeout(coachAskStrategy, 500);
    }
  })));
}

// === Étape 5 : Stratégie ===
function coachAskStrategy() {
  appendCoachMessage("Et ta stratégie de jeu ? 🎯");
  const strats = ["Safe", "Aggressive", "50/50", "Mindset", "Fairway First"];
  addChoiceButtons(strats.map(s => ({
    label: s,
    action: () => {
      localStorage.setItem("strategy", s);
      appendCoachMessage(`Stratégie : <b>${s}</b>`);
      setTimeout(coachStartGame, 600);
    }
  })));
}

// === Étape 6 : Démarrage de la partie ===
function coachStartGame() {
  const golf = localStorage.getItem("selectedGolf");
  const coach = localStorage.getItem("selectedCoach");
  const mood = localStorage.getItem("mood");
  const strat = localStorage.getItem("strategy");

  appendCoachMessage(`
    Parfait 💚<br>
    Golf : <b>${golf}</b><br>
    Coach : <b>${coach}</b><br>
    Mood : <b>${mood}</b><br>
    Stratégie : <b>${strat}</b><br><br>
    Prêt ? Let's go ⛳
  `);

  addChoiceButtons([
    { label: "🚀 Démarrer la partie", action: () => startNewRound?.(golf) }
  ]);
}

console.log("✅ Coach IA chargé sans auto-focus ni redimensionnement");

// === Activation dynamique de l'IA OpenAI (si clé licence dispo) ===
if (typeof window.envOpenAIKey !== "undefined" && window.envOpenAIKey) {
  console.log("🔑 Licence OpenAI détectée, mode IA activé");

  // Remplace la fonction showCoachIA par une version IA
  window.showCoachIA = async function (userMessage) {
    const coachLog = document.getElementById("coach-log");
    if (!coachLog) return;

    // Affiche le message du joueur si fourni
    if (userMessage) appendUserMessage(userMessage);

    // Message d’attente
    appendCoachMessage("⏳ Réflexion du coach...");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${window.envOpenAIKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Tu es le coach Parfect.golfr, expert en mental golf, parle de manière calme, positive et brève." },
            { role: "user", content: userMessage || "Analyse la situation actuelle de jeu." }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content?.trim() || "🤔 Je réfléchis encore...";
      appendCoachMessage(reply);

    } catch (err) {
      console.error("❌ Erreur OpenAI :", err);
      appendCoachMessage("⚠️ Le coach IA n’est pas dispo. Je repasse en mode classique !");
    }
  };
} else {
  console.log("💬 Mode coach local (pas de licence OpenAI)");
}

