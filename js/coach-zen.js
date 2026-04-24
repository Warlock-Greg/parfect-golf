/* =========================================================
   COACH ZEN 2026 — Whisper + Input + Logs (robuste)
   - coachReact(msg) : point d’entrée unique
   - Whisper = output coach
   - coach-user-log = messages joueur
   ========================================================= */


// ✅ POINT D’ENTRÉE UNIQUE
window.coachReact = function (msg, opts = {}) {
  try {
    const clean = String(msg || "").trim();
    if (!clean) return;
    showWhisper(clean, opts);
  } catch (e) {
    console.warn("coachReact error", e);
  }
};

// ✅ Optionnel mais utile
window.showCoachIA = function () {
  if (coachSection) coachSection.style.display = "flex";
};

window.hideCoachIA = function () {
  if (coachSection) coachSection.style.display = "none";
};


collapseCoachIA();

(function () {
  // ---------- DOM ----------
  const whisper = document.getElementById("coach-whisper");
  const whisperText = document.getElementById("whisper-text");

  const historyWrap = document.getElementById("coach-whisper-history");
  const historyList = document.getElementById("whisper-history-list");
  const historyClose = document.getElementById("whisper-history-close");

  const coachSection = document.getElementById("coach-ia");
  const userLog = document.getElementById("coach-user-log");
  const input = document.getElementById("coach-input");
  const send = document.getElementById("coach-send");
  const closeInput = document.getElementById("coach-close");

  // ---------- guards ----------
  if (!whisper || !whisperText) console.warn("⚠️ Whisper DOM manquant");
  if (!historyWrap || !historyList || !historyClose) console.warn("⚠️ Whisper history DOM manquant");
  if (!coachSection || !userLog || !input || !send || !closeInput) console.warn("⚠️ Coach IA DOM manquant");

  // ---------- state ----------
  let hideTimer = null;
  const history = [];

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = history
      .map(h => `<div class="pg-whisper-item">${esc(h.m)}</div>`)
      .join("");
  }

  function showWhisper(message, { duration = 4000 } = {}) {
    if (!whisper || !whisperText) return;

    const clean = String(message || "").trim();
    if (!clean) return;

    whisperText.textContent = clean;
    whisper.classList.remove("whisper-hidden");
    whisper.classList.add("whisper-show");

    history.unshift({ t: Date.now(), m: clean });
    if (history.length > 30) history.pop();
    renderHistory();

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      whisper.classList.add("whisper-hidden");
      whisper.classList.remove("whisper-show");
    }, duration);
  }

  // expose whisper API
  window.__pgWhisper = window.__pgWhisper || {};
  window.__pgWhisper.showWhisper = showWhisper;

  // ---------- whisper interactions ----------
  whisper?.addEventListener("click", () => {
    historyWrap?.classList.add("is-open");
  });

  historyClose?.addEventListener("click", (e) => {
    e.preventDefault();
    historyWrap?.classList.remove("is-open");
  });

  historyWrap?.addEventListener("click", (e) => {
    if (e.target === historyWrap) historyWrap.classList.remove("is-open");
  });

function collapseCoachIA() {
  if (!coachSection) return;
  coachSection.classList.remove("coach-expanded", "coach-medium");
  coachSection.classList.add("coach-collapsed");
}

function expandCoachIA() {
  if (!coachSection) return;
  coachSection.style.display = "flex";
  coachSection.classList.remove("coach-collapsed");
  coachSection.classList.add("coach-expanded");
}

window.collapseCoachIA = collapseCoachIA;
window.expandCoachIA = expandCoachIA;

   
function appendCoachMessageToChat(text) {
  if (!userLog) return;

  const clean = String(text || "").trim();
  if (!clean) return;

  const div = document.createElement("div");
  div.className = "msg coach";
  div.textContent = clean;
  userLog.appendChild(div);

  userLog.scrollTo({ top: userLog.scrollHeight, behavior: "smooth" });
}

window.appendCoachMessageToChat = appendCoachMessageToChat;

window.sendCoachToChat = function (text, options = {}) {
  const clean = String(text || "").trim();
  if (!clean) return;

  if (coachSection) coachSection.style.display = "flex";
  if (userLog) userLog.style.display = "flex";

  appendCoachMessageToChat(clean);

  if (options.open === true) {
    expandCoachIA();
  } else {
    collapseCoachIA();
    window.coachReact?.("💬 Réponse du coach prête");
  }
};
   
  // ---------- user log (input) ----------
  function appendUserMessage(text) {
    if (!userLog) return;
    const clean = String(text || "").trim();
    if (!clean) return;

    const div = document.createElement("div");
    div.className = "msg user";
    div.textContent = clean;
    userLog.appendChild(div);
    userLog.scrollTo({ top: userLog.scrollHeight, behavior: "smooth" });
  }

  // ✅ appendCoachMessage refactor : ENVOIE AU WHISPER (plus de doublon)
  window.appendCoachMessage = function (text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    showWhisper(clean);
  };

  // ---------- coachReact : POINT D’ENTRÉE UNIQUE ----------
  window.coachReact = function (msg, opts = {}) {
    try {
      const clean = String(msg || "").trim();
      if (!clean) return;
      showWhisper(clean, opts);
    } catch (e) {
      console.warn("coachReact error", e);
    }
  };

  // ---------- show/hide coach UI ----------
  window.showCoachIA = function () {
    if (coachSection) coachSection.style.display = "flex";
  };
  window.hideCoachIA = function () {
    if (coachSection) coachSection.style.display = "none";
  };

  // ---------- close input button (FIX) ----------
  closeInput?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.hideCoachIA?.();
  });

  // ---------- send ----------
  function onSend() {
    const msg = input?.value?.trim();
    if (!msg) return;

    appendUserMessage(msg);
    input.value = "";

    // 👉 IMPORTANT :
    // Ici on laisse TON coachia.js répondre (local/OpenAI) via respondAsCoach(...)
    // Si tu veux un fallback simple :
    if (typeof window.respondAsCoach === "function") {
      window.respondAsCoach(msg);
    } else if (typeof window.coachReact === "function") {
      window.coachReact("Je t’écoute. Donne-moi un peu plus de contexte 🧠");
    }
  }

   coachSection?.addEventListener("click", (e) => {
  if (!coachSection.classList.contains("coach-collapsed")) return;
  e.preventDefault();
  expandCoachIA();
});

   coachClose?.addEventListener("click", (e) => {
  e.stopPropagation();
  collapseCoachIA();
});

  send?.addEventListener("click", onSend);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSend();
  });

  console.log("✅ Coach ZEN 2026 chargé (whisper + input + coachReact)");
})();
