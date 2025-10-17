// js/coachIA.js
const COACH_HISTORY_KEY = "coachIAHistory";

export function initCoachIA() {
  const coachSection = document.getElementById("coach-ia");
  const input = document.getElementById("coach-input");
  const sendBtn = document.getElementById("coach-send");
  const historyDiv = document.getElementById("coach-chat-history");

  if (!coachSection) return;

  let history = JSON.parse(localStorage.getItem(COACH_HISTORY_KEY) || "[]");
  renderHistory();

  // === Gestion des envois manuels ===
  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage("user", text);
    input.value = "";
    setTimeout(() => simulateCoachReply(text), 600);
  }

  function addMessage(from, text) {
    history.push({ from, text });
    localStorage.setItem(COACH_HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    historyDiv.innerHTML = history
      .map((m) => `<div class="msg ${m.from}">${m.text}</div>`)
      .join("");
    historyDiv.scrollTop = historyDiv.scrollHeight;
  }

  // === Simulation de réponse du coach ===
  function simulateCoachReply(userText) {
    const lower = userText.toLowerCase();
    let reply = "Raconte-moi ce coup 👀";

    if (lower.includes("parfect")) reply = "💚 Parfect ! Tu joues avec le bon mindset !";
    else if (lower.includes("bogey")) reply = "💙 Bogey’fect ! Tu restes dans le plan, continue ton rythme.";
    else if (lower.includes("double")) reply = "Pas grave ! Respire, recentre-toi, la routine avant tout 💭";
    else if (lower.includes("birdie")) reply = "🔥 Birdie baby ! Focus sur le prochain trou.";
    else if (lower.includes("mental")) reply = "Le mental, c’est ton 15e club. Utilise-le bien 🧘‍♂️";
    else if (lower.includes("routine")) reply = "Tu peux rater le shot, pas ta routine 😉";

    addMessage("coach", reply);
  }

  // === Écoute automatique des messages de la partie ===
  document.addEventListener("coach-message", (e) => {
    const msg = e.detail;
    if (!msg) return;
    addMessage("coach", msg);
    showCoachIA();
  });
}

// === Contrôles d’affichage ===
export function showCoachIA() {
  const section = document.getElementById("coach-ia");
  if (section) section.classList.add("visible");
}

export function hideCoachIA() {
  const section = document.getElementById("coach-ia");
  if (section) section.classList.remove("visible");
}
