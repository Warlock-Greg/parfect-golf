// js/coachIA.js
const COACH_HISTORY_KEY = "coachIAHistory";

export function initCoachIA() {
  const coachSection = document.getElementById("coach-ia");
  const input = document.getElementById("coach-input");
  const sendBtn = document.getElementById("coach-send");
  const historyDiv = document.getElementById("coach-chat-history");

  // Charger historique
  const history = JSON.parse(localStorage.getItem(COACH_HISTORY_KEY) || "[]");
  renderHistory();

  // Envoi d’un message
  sendBtn.addEventListener("click", () => sendMessage());
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage("user", text);
    input.value = "";
    setTimeout(() => {
      simulateCoachReply(text);
    }, 600);
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

  function simulateCoachReply(userText) {
    // Simule une IA
    const lower = userText.toLowerCase();
    let reply = "Parle-moi de ton dernier coup 👀";
    if (lower.includes("par")) reply = "💚 Parfect ! Continue dans ce flow !";
    else if (lower.includes("bogey")) reply = "💙 Bogey’fect ? Focus sur ta routine !";
    else if (lower.includes("stress")) reply = "Respire. Tu peux rater le shot, pas ta routine 🧘‍♂️";
    else if (lower.includes("mental")) reply = "Le mental, c’est ton 15e club. Utilise-le.";
    addMessage("coach", reply);
  }
}

export function showCoachIA() {
  document.getElementById("coach-ia").classList.add("visible");
}

export function hideCoachIA() {
  document.getElementById("coach-ia").classList.remove("visible");
}
