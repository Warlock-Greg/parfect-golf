// === SwingHistoryUI.js ===

import { getAllSwingRecords } from "./SwingHistory.js";
import { loadSwingVideoFromBlob } from "./SwingPlayer.js";

let historyContainer;

export async function initSwingHistoryUI() {
  historyContainer = document.getElementById("swing-history-list");
  if (!historyContainer) {
    console.warn("swing-history-list non trouvé");
    return;
  }

  await refreshSwingHistoryUI();
}

export async function refreshSwingHistoryUI() {
  if (!historyContainer) return;
  const records = await getAllSwingRecords();
  historyContainer.innerHTML = "";

  if (!records.length) {
    const empty = document.createElement("div");
    empty.textContent = "Aucun swing enregistré pour le moment.";
    empty.style.fontSize = "12px";
    empty.style.opacity = "0.7";
    historyContainer.appendChild(empty);
    return;
  }

  records.forEach((rec) => {
    const item = document.createElement("div");
    item.className = "swing-history-item";

    const thumb = document.createElement("div");
    thumb.className = "swing-history-thumb";

    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.style.width = "100%";
    v.style.height = "100%";
    v.style.objectFit = "cover";
    const url = URL.createObjectURL(rec.videoBlob);
    v.src = url;
    thumb.appendChild(v);

    const meta = document.createElement("div");
    meta.className = "swing-history-meta";

    const d = new Date(rec.createdAt);
    const dateStr = d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    meta.innerHTML = `
      <strong>${rec.club ?? "club ?"}</strong> – Score <strong>${rec.score}</strong><br/>
      <span>${dateStr}</span>
    `;

    item.appendChild(thumb);
    item.appendChild(meta);

    item.addEventListener("click", () => {
      loadSwingVideoFromBlob(rec.videoBlob);
    });

    historyContainer.appendChild(item);
  });
}
