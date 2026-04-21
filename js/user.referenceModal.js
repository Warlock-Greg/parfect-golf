// ==========================================================
// user.referenceModal.js
// Edition directe de la référence user depuis le social
// ==========================================================

(function () {
  function clampUserReferenceData(data) {
    data.rotation.shoulder.target = Math.max(0.15, Math.min(0.90, data.rotation.shoulder.target));
    data.rotation.shoulder.tol = Math.max(0.05, Math.min(0.40, data.rotation.shoulder.tol));

    data.rotation.hip.target = Math.max(0.00, Math.min(0.50, data.rotation.hip.target));
    data.rotation.hip.tol = Math.max(0.05, Math.min(0.30, data.rotation.hip.tol));

    data.rotation.xFactor.target = Math.max(0.00, Math.min(0.50, data.rotation.xFactor.target));
    data.rotation.xFactor.tol = Math.max(0.05, Math.min(0.25, data.rotation.xFactor.tol));

    data.tempo.ratio.target = Math.max(1.2, Math.min(5.0, data.tempo.ratio.target));
    data.tempo.ratio.tol = Math.max(0.3, Math.min(2.0, data.tempo.ratio.tol));

    data.weightShift.back.target = Math.max(0.00, Math.min(0.30, data.weightShift.back.target));
    data.weightShift.back.tol = Math.max(0.05, Math.min(0.30, data.weightShift.back.tol));

    data.weightShift.fwd.target = Math.max(0.00, Math.min(0.30, data.weightShift.fwd.target));
    data.weightShift.fwd.tol = Math.max(0.05, Math.min(0.30, data.weightShift.fwd.tol));

    data.extension.target = Math.max(0.8, Math.min(5.0, data.extension.target));
    data.extension.tol = Math.max(0.4, Math.min(2.0, data.extension.tol));

    return data;
  }

  function buildDefaultReference(ref) {
    return ref || {
      schema_version: 2,
      rotation: {
        shoulder: { target: 0.40, tol: 0.20 },
        hip: { target: 0.10, tol: 0.10 },
        xFactor: { target: 0.22, tol: 0.10 }
      },
      tempo: {
        ratio: { target: 3.05, tol: 1.2 }
      },
      weightShift: {
        back: { target: 0.05, tol: 0.16 },
        fwd: { target: 0.10, tol: 0.18 }
      },
      extension: {
        target: 2.5,
        tol: 1.2
      },
      triangle: null,
      balance: null
    };
  }

  window.openUserReferenceModal = async function openUserReferenceModal() {
    const club =
      window.currentClubType ||
      document.getElementById("jsw-club-select")?.value ||
      "fer7";

    const view =
      window.jswViewType ||
      document.getElementById("jsw-camera-select")?.value ||
      "faceOn";

    const existing = await window.getUserReference?.(club, view);
    const ref = buildDefaultReference(existing?.data || window.REF || null);

    const modal = document.createElement("div");
    modal.className = "pg-ref-modal-backdrop";

    modal.innerHTML = `
      <div class="pg-ref-modal">
        <div class="pg-ref-header">
          <div>
            <h3>Mes références</h3>
            <p class="pg-muted">${club} · ${view}</p>
          </div>
        </div>

        <div class="pg-ref-grid">
          <label>Rotation épaules cible
            <input id="ref-rot-shoulder-target" type="number" step="0.01" value="${ref.rotation?.shoulder?.target ?? 0.40}">
          </label>
          <label>Rotation épaules tol
            <input id="ref-rot-shoulder-tol" type="number" step="0.01" value="${ref.rotation?.shoulder?.tol ?? 0.20}">
          </label>

          <label>Rotation hanches cible
            <input id="ref-rot-hip-target" type="number" step="0.01" value="${ref.rotation?.hip?.target ?? 0.10}">
          </label>
          <label>Rotation hanches tol
            <input id="ref-rot-hip-tol" type="number" step="0.01" value="${ref.rotation?.hip?.tol ?? 0.10}">
          </label>

          <label>Séparation cible
            <input id="ref-rot-xf-target" type="number" step="0.01" value="${ref.rotation?.xFactor?.target ?? 0.22}">
          </label>
          <label>Séparation tol
            <input id="ref-rot-xf-tol" type="number" step="0.01" value="${ref.rotation?.xFactor?.tol ?? 0.10}">
          </label>

          <label>Tempo ratio cible
            <input id="ref-tempo-target" type="number" step="0.01" value="${ref.tempo?.ratio?.target ?? 3.05}">
          </label>
          <label>Tempo ratio tol
            <input id="ref-tempo-tol" type="number" step="0.01" value="${ref.tempo?.ratio?.tol ?? 1.2}">
          </label>

          <label>Transfert back cible
            <input id="ref-ws-back-target" type="number" step="0.01" value="${ref.weightShift?.back?.target ?? 0.05}">
          </label>
          <label>Transfert back tol
            <input id="ref-ws-back-tol" type="number" step="0.01" value="${ref.weightShift?.back?.tol ?? 0.16}">
          </label>

          <label>Transfert avant cible
            <input id="ref-ws-fwd-target" type="number" step="0.01" value="${ref.weightShift?.fwd?.target ?? 0.10}">
          </label>
          <label>Transfert avant tol
            <input id="ref-ws-fwd-tol" type="number" step="0.01" value="${ref.weightShift?.fwd?.tol ?? 0.18}">
          </label>

          <label>Extension cible
            <input id="ref-extension-target" type="number" step="0.01" value="${ref.extension?.target ?? 2.5}">
          </label>
          <label>Extension tol
            <input id="ref-extension-tol" type="number" step="0.01" value="${ref.extension?.tol ?? 1.2}">
          </label>
        </div>

        <div class="pg-ref-actions">
          <button id="ref-reset-system" class="pg-btn-secondary">Référence Parfect</button>
          <button id="ref-cancel" class="pg-btn-secondary">Annuler</button>
          <button id="ref-save" class="pg-btn-primary">Enregistrer</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    function close() {
      modal.remove();
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    modal.querySelector("#ref-cancel")?.addEventListener("click", close);

    modal.querySelector("#ref-reset-system")?.addEventListener("click", async () => {
      const systemRef = await window.getSystemReference?.(club, view);
      const data = buildDefaultReference(systemRef?.data || null);

      document.getElementById("ref-rot-shoulder-target").value = data.rotation?.shoulder?.target ?? 0.40;
      document.getElementById("ref-rot-shoulder-tol").value = data.rotation?.shoulder?.tol ?? 0.20;
      document.getElementById("ref-rot-hip-target").value = data.rotation?.hip?.target ?? 0.10;
      document.getElementById("ref-rot-hip-tol").value = data.rotation?.hip?.tol ?? 0.10;
      document.getElementById("ref-rot-xf-target").value = data.rotation?.xFactor?.target ?? 0.22;
      document.getElementById("ref-rot-xf-tol").value = data.rotation?.xFactor?.tol ?? 0.10;
      document.getElementById("ref-tempo-target").value = data.tempo?.ratio?.target ?? 3.05;
      document.getElementById("ref-tempo-tol").value = data.tempo?.ratio?.tol ?? 1.2;
      document.getElementById("ref-ws-back-target").value = data.weightShift?.back?.target ?? 0.05;
      document.getElementById("ref-ws-back-tol").value = data.weightShift?.back?.tol ?? 0.16;
      document.getElementById("ref-ws-fwd-target").value = data.weightShift?.fwd?.target ?? 0.10;
      document.getElementById("ref-ws-fwd-tol").value = data.weightShift?.fwd?.tol ?? 0.18;
      document.getElementById("ref-extension-target").value = data.extension?.target ?? 2.5;
      document.getElementById("ref-extension-tol").value = data.extension?.tol ?? 1.2;
    });

    modal.querySelector("#ref-save")?.addEventListener("click", async () => {
      try {
        const data = clampUserReferenceData({
          schema_version: 2,
          rotation: {
            shoulder: {
              target: Number(document.getElementById("ref-rot-shoulder-target")?.value),
              tol: Number(document.getElementById("ref-rot-shoulder-tol")?.value)
            },
            hip: {
              target: Number(document.getElementById("ref-rot-hip-target")?.value),
              tol: Number(document.getElementById("ref-rot-hip-tol")?.value)
            },
            xFactor: {
              target: Number(document.getElementById("ref-rot-xf-target")?.value),
              tol: Number(document.getElementById("ref-rot-xf-tol")?.value)
            }
          },
          tempo: {
            ratio: {
              target: Number(document.getElementById("ref-tempo-target")?.value),
              tol: Number(document.getElementById("ref-tempo-tol")?.value)
            }
          },
          weightShift: {
            back: {
              target: Number(document.getElementById("ref-ws-back-target")?.value),
              tol: Number(document.getElementById("ref-ws-back-tol")?.value)
            },
            fwd: {
              target: Number(document.getElementById("ref-ws-fwd-target")?.value),
              tol: Number(document.getElementById("ref-ws-fwd-tol")?.value)
            }
          },
          extension: {
            target: Number(document.getElementById("ref-extension-target")?.value),
            tol: Number(document.getElementById("ref-extension-tol")?.value)
          },
          triangle: null,
          balance: null
        });

        await window.upsertUserReference({
          club,
          view,
          data
        });

        if (typeof window.loadActiveReference === "function") {
          await window.loadActiveReference();
        }

        window.coachReact?.("Référence joueur mise à jour.");
        close();
      } catch (err) {
        console.error("❌ save user reference error", err);
        alert("Impossible d’enregistrer la référence.");
      }
    });
  };
})();
