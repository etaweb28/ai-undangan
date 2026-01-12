/* =============================
   KONFIGURASI (SUDAH FIX)
============================= */
const API = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";

let lastAIResult = "";

/* =============================
   GENERATE AI UNDANGAN
============================= */
async function generateAI() {
  const text = document.getElementById("inputText").value;
  const output = document.getElementById("result");

  if (!text) {
    alert("Silakan tulis rencana pernikahan dulu");
    return;
  }

  output.textContent = "⏳ Sedang membuat undangan…";

  try {
    const res = await fetch(API + "/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    if (!data.success) {
      output.textContent = "❌ Gagal generate undangan";
      return;
    }

    lastAIResult = data.result;
    output.textContent = data.result;

  } catch (err) {
    output.textContent = "❌ Tidak bisa terhubung ke server AI";
  }
}

/* =============================
   SIMPAN UNDANGAN + BUKA WEB
============================= */
async function saveAndOpen() {
  if (!lastAIResult) {
    alert("Generate undangan dulu");
    return;
  }

  const music = document.getElementById("musicSelect").value;

  try {
    const res = await fetch(API + "/invite/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiText: lastAIResult,
        music: music
      })
    });

    const data = await res.json();

    if (!data.success) {
      alert("Gagal menyimpan undangan");
      return;
    }

    // redirect ke halaman undangan
    window.location.href = `undangan.html?id=${data.id}`;

  } catch (err) {
    alert("Server tidak bisa diakses");
  }
}
