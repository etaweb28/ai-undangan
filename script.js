/* ===============================
   CONFIG
================================ */
const API_URL = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev/generate";

/* ===============================
   AMPOP / OPEN INVITATION
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const envelope = document.getElementById("openEnvelope");
  if (envelope) {
    envelope.addEventListener("click", () => {
      envelope.classList.add("opened");
      setTimeout(() => {
        window.location.href = "undangan.html";
      }, 800);
    });
  }
});

/* ===============================
   AI GENERATE UNDANGAN
================================ */
async function generateInvitation() {
  const input = document.getElementById("prompt").value;
  const output = document.getElementById("hasilAI");

  if (!input) {
    alert("Isi data undangan dulu");
    return;
  }

  output.innerText = "⏳ Membuat undangan...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input })
    });

    const data = await res.json();
    output.innerText = data.result || "Gagal generate undangan";
  } catch (err) {
    output.innerText = "❌ Koneksi AI gagal";
  }
}

/* ===============================
   MUSIK PLAYER
================================ */
let audio = new Audio();
let currentMusic = "";

function playMusic(file, title) {
  if (currentMusic !== file) {
    audio.src = file;
    audio.loop = true;
    currentMusic = file;
  }
  audio.play();
  document.getElementById("musicTitle").innerText = title;
}

function toggleMusic() {
  if (audio.paused) audio.play();
  else audio.pause();
}

/* ===============================
   GOOGLE MAPS AUTO EMBED
================================ */
function loadMap() {
  const input = document.getElementById("mapInput").value;
  if (!input) return;

  let embed = input;

  if (!input.includes("embed")) {
    embed =
      "https://www.google.com/maps?q=" +
      encodeURIComponent(input) +
      "&output=embed";
  }

  document.getElementById("mapFrame").src = embed;
}

/* ===============================
   COUNTDOWN ACARA
================================ */
function startCountdown(dateString) {
  const target = new Date(dateString).getTime();

  setInterval(() => {
    const now = new Date().getTime();
    const diff = target - now;

    if (diff < 0) return;

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    document.getElementById("countdown").innerText =
      `${d} Hari ${h} Jam ${m} Menit ${s} Detik`;
  }, 1000);
}

/* ===============================
   GALERI FOTO (UPLOAD)
================================ */
function previewGallery(input) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  [...input.files].forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.className = "gallery-img";
    gallery.appendChild(img);
  });
}

/* ===============================
   BUKU TAMU
================================ */
function submitGuest() {
  const name = document.getElementById("guestName").value;
  const msg = document.getElementById("guestMsg").value;

  if (!name || !msg) return;

  const list = document.getElementById("guestList");
  const item = document.createElement("div");

  item.className = "guest-item";
  item.innerHTML = `<strong>${name}</strong><p>${msg}</p>`;
  list.prepend(item);

  document.getElementById("guestName").value = "";
  document.getElementById("guestMsg").value = "";
}

/* ===============================
   SHARE WHATSAPP
================================ */
function shareWA() {
  const url = window.location.href;
  const text = `Assalamualaikum 🙏\nKami mengundang Anda ke acara pernikahan kami:\n${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
