/* =========================================================
   CONFIG
========================================================= */
const API_URL = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";

let currentInviteId = null;
let currentMusic = "wedding1.mp3";

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initMusicSelector();
});

/* =========================================================
   MUSIC
========================================================= */
function initMusicSelector() {
  const musicSelect = document.getElementById("music");
  if (!musicSelect) return;

  musicSelect.addEventListener("change", (e) => {
    currentMusic = e.target.value;
  });
}

/* =========================================================
   AI GENERATE STORY
========================================================= */
async function generateAIStory() {
  const input = document.getElementById("aiPrompt");
  const output = document.getElementById("story");

  if (!input || !output) return;

  const text = input.value.trim();
  if (!text) {
    alert("Isi deskripsi atau cerita singkat terlebih dahulu.");
    return;
  }

  output.value = "⏳ Sedang membuat cerita undangan...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        text
      })
    });

    const data = await res.json();

    if (data.error) {
      output.value = "";
      alert(data.error);
      return;
    }

    output.value = data.result;

  } catch (err) {
    output.value = "";
    alert("Gagal menghubungi server AI");
  }
}

/* =========================================================
   SAVE INVITATION & CREATE LINK
========================================================= */
async function saveInvitation() {
  const groom = getValue("groom");
  const bride = getValue("bride");
  const date = getValue("date");
  const akad = getValue("akad");
  const resepsi = getValue("resepsi");
  const location = getValue("location");
  const story = getValue("story");

  if (!groom || !bride || !date || !location) {
    alert("Nama mempelai, tanggal, dan lokasi wajib diisi.");
    return;
  }

  const payload = {
    groom,
    bride,
    date,
    akad,
    resepsi,
    location,
    story,
    music: currentMusic,
    createdAt: new Date().toISOString()
  };

  setStatus("⏳ Menyimpan undangan...");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        payload
      })
    });

    const data = await res.json();

    if (!data.success || !data.id) {
      setStatus("❌ Gagal menyimpan undangan");
      return;
    }

    currentInviteId = data.id;

    setStatus("✅ Undangan berhasil dibuat");
    setTimeout(() => {
      window.location.href = `undangan.html?invite=${data.id}`;
    }, 800);

  } catch (err) {
    setStatus("❌ Terjadi kesalahan server");
  }
}

/* =========================================================
   LOAD INVITATION (undangan.html)
========================================================= */
async function loadInvitation() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("invite");
  if (!id) return;

  try {
    const res = await fetch(`${API_URL}?invite=${id}`);
    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    setText("nama", `${data.groom} & ${data.bride}`);
    setText("tanggal", data.date);
    setText("akad", data.akad || "-");
    setText("resepsi", data.resepsi || "-");
    setText("lokasi", data.location);
    setText("cerita", data.story || "");

    /* Music */
    const audio = document.getElementById("musicPlayer");
    if (audio && data.music) {
      audio.src = data.music;
      audio.play().catch(() => {});
    }

    /* Google Maps */
    const mapFrame = document.getElementById("mapEmbed");
    if (mapFrame && data.location) {
      mapFrame.src = mapToEmbed(data.location);
    }

  } catch (err) {
    alert("Gagal memuat undangan");
  }
}

/* =========================================================
   HELPERS
========================================================= */
function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.innerText = text;
}

function mapToEmbed(address) {
  return (
    "https://www.google.com/maps?q=" +
    encodeURIComponent(address) +
    "&output=embed"
  );
}

/* =========================================================
   AUTO LOAD FOR undangan.html
========================================================= */
if (window.location.pathname.includes("undangan.html")) {
  document.addEventListener("DOMContentLoaded", loadInvitation);
}