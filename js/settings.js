// === SETTINGS (sécurisés avec PIN 2914) ===
document.addEventListener("DOMContentLoaded", () => {
  const pinCode = 2914;
  const section = document.getElementById("settings");
  const input = document.getElementById("openai-key-input");
  const saveBtn = document.getElementById("save-openai-key");
  const currentKey = document.getElementById("current-key");

  // 🔒 PIN de sécurité à l’ouverture
  if (section) {
    const entered = prompt("🔐 Entre ton code PIN pour accéder aux paramètres :");
    if (parseInt(entered, 10) !== pinCode) {
      alert("❌ Code incorrect. Accès refusé.");
      section.innerHTML = "<h3>🔒 Accès refusé</h3>";
      return;
    }
  }

  // 🧠 Vérifie si une clé est déjà enregistrée
  const savedKey = localStorage.getItem("openai_key");
  if (savedKey) {
    currentKey.textContent = "🔑 Clé OpenAI enregistrée ✔️";
    testOpenAIKey(savedKey, currentKey);
  } else {
    currentKey.textContent = "⚠️ Aucune clé enregistrée";
  }

  // 💾 Sauvegarde de la clé
  saveBtn.addEventListener("click", () => {
    const key = input.value.trim();
    if (!key.startsWith("sk-")) {
      alert("Clé OpenAI invalide — elle doit commencer par sk-");
      return;
    }
    localStorage.setItem("openai_key", key);
    input.value = "";
    currentKey.textContent = "🔑 Clé OpenAI enregistrée ✔️";
    testOpenAIKey(key, currentKey);
    alert("✅ Clé OpenAI enregistrée avec succès !");
  });
});

// === Vérifie la validité de la clé via OpenAI ===
async function testOpenAIKey(apiKey, displayElement) {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (res.ok) {
      displayElement.textContent = "✅ Clé OpenAI active et valide";
      displayElement.style.color = "#00c676";
    } else {
      displayElement.textContent = "⚠️ Clé OpenAI invalide ou expirée";
      displayElement.style.color = "#ff6666";
    }
  } catch (err) {
    displayElement.textContent = "⚠️ Erreur réseau ou clé invalide";
    displayElement.style.color = "#ff6666";
  }
}
