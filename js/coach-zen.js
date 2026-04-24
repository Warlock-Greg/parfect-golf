/* =========================================================
   COACH ZEN 2026 — Whisper + Chat + Input
   - coachReact(msg) = whisper court
   - sendCoachToChat(msg) = vraie zone conversation
   - respondAsCoach(msg) = géré par coachIA.js
   ========================================================= */

(function () {
  console.log("🧘 Coach ZEN boot");

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

  if (!whisper || !whisperText) console.warn("⚠️ Whisper DOM manquant");
  if (!coachSection || !userLog || !input || !send) {
    console.warn("⚠️ Coach IA DOM incomplet");
  }

  // ---------- State ----------
  let hideTimer = null;
  const history = [];

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  function clearEmptyState() {
    const empty = userLog?.querySelector(".pg-coach-empty");
    if (empty) empty.remove();
  }

  function renderEmptyState() {
    if (!userLog || userLog.children.length) return;
    userLog.innerHTML = `
      <div class="pg-coach-empty">
        Pose une question au coach ou utilise les suggestions rapides.
      </div>
    `;
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = history
      .map((h) => `<div class="pg-whisper-item">${esc(h.m)}</div>`)
      .join("");
  }

  // ---------- Whisper ----------
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

  window.__pgWhisper = window.__pgWhisper || {};
  window.__pgWhisper.showWhisper = showWhisper;

  window.coachReact = function (msg, opts = {}) {
    try {
      const clean = String(msg || "").trim();
      if (!clean) return;
      showWhisper(clean, opts);
    } catch (e) {
      console.warn("coachReact error", e);
    }
  };

  window.appendCoachMessage = function (text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    showWhisper(clean);
  };

  // ---------- Whisper history ----------
  whisper?.addEventListener("click", () => {
    historyWrap?.classList.add("is-open");
  });

  historyClose?.addEventListener("click", (e) => {
    e.preventDefault();
    historyWrap?.classList.remove("is-open");
  });

  historyWrap?.addEventListener("click", (e) => {
    if (e.target === historyWrap) {
      historyWrap.classList.remove("is-open");
    }
  });

  // ---------- Coach open / close ----------
  function collapseCoachIA() {
    if (!coachSection) return;
    coachSection.style.display = "flex";
    coachSection.classList.remove("coach-expanded", "coach-medium");
    coachSection.classList.add("coach-collapsed");
  }

  function expandCoachIA() {
    if (!coachSection) return;
    coachSection.style.display = "flex";
    coachSection.classList.remove("coach-collapsed");
    coachSection.classList.add("coach-expanded");
    if (userLog) userLog.style.display = "flex";
    renderEmptyState();
    setTimeout(() => input?.focus(), 50);
  }

  window.collapseCoachIA = collapseCoachIA;
  window.expandCoachIA = expandCoachIA;

  window.showCoachIA = function ({ open = false } = {}) {
    if (open) expandCoachIA();
    else collapseCoachIA();
  };

  window.hideCoachIA = function () {
    if (!coachSection) return;
    coachSection.style.display = "none";
  };

  coachSection?.addEventListener("click", (e) => {
    if (!coachSection.classList.contains("coach-collapsed")) return;
    e.preventDefault();
    expandCoachIA();
  });

  closeInput?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    collapseCoachIA();
  });

  // ---------- Chat messages ----------
  function appendCoachMessageToChat(text) {
    if (!userLog) return;

    const clean = String(text || "").trim();
    if (!clean) return;

    clearEmptyState();

    const div = document.createElement("div");
    div.className = "msg coach";
    div.textContent = clean;

    userLog.appendChild(div);
    userLog.scrollTo({ top: userLog.scrollHeight, behavior: "smooth" });
  }

  function appendUserMessage(text) {
    if (!userLog) return;

    const clean = String(text || "").trim();
    if (!clean) return;

    clearEmptyState();

    const div = document.createElement("div");
    div.className = "msg user";
    div.textContent = clean;

    userLog.appendChild(div);
    userLog.scrollTo({ top: userLog.scrollHeight, behavior: "smooth" });
  }

  window.appendCoachMessageToChat = appendCoachMessageToChat;
  window.appendUserMessageToChat = appendUserMessage;

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

  // ---------- Send ----------
  function onSend() {
    const msg = input?.value?.trim();
    if (!msg) return;

    appendUserMessage(msg);
    input.value = "";

    if (typeof window.respondAsCoach === "function") {
      window.respondAsCoach(msg);
    } else {
      window.coachReact?.("Je t’écoute. Donne-moi un peu plus de contexte 🧠");
    }
  }

  send?.addEventListener("click", onSend);

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSend();
  });

  // ---------- Init ----------
  collapseCoachIA();

  console.log("✅ Coach ZEN 2026 chargé : whisper + chat + input");
})();
