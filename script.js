/* =====================================================
   CONFIG
===================================================== */
const API_URL =
  "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";

let currentInvite = null;
let currentMusic = "wedding1.mp3";

/* =====================================================
   INIT
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  if (loader) {
    setTimeout(() => (loader.style.display = "none"), 800);
  }

  initGalleryLightbox();
  initGuestbookDummy();
});

/* =====================================================
   MUSIC CONTROLLER
===================================================== */
const music = document.getElementById("music");

function openInvitation() {
  document.getElementById("content").scrollIntoView({ behavior: "smooth" });
  playMusic();
}

function playMusic() {
  if (!music) return;
  music.src = currentMusic;
  music.play().catch(() => {});
}

function toggleMusic() {
  if (!music) return;
  if (music.paused) music.play();
  else music.pause();
}

function chooseMusic(file) {
  currentMusic = file;
  playMusic();
}

/* =====================================================
   BOTTOM SHEET (AMPL0P ANIMATION)
===================================================== */
function openSheet() {
  document.body.classList.add("open");
}

function closeSheet() {
  document.body.classList.remove("open");
}

/* =====================================================
   SCROLL REVEAL
===================================================== */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("show");
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll(".fade").forEach((el) => observer.observe(el));

/* =====================================================
   GALLERY + LIGHTBOX
===================================================== */
function initGalleryLightbox() {
  document.querySelectorAll(".gallery img").forEach((img) => {
    img.addEventListener("click", () => openLightbox(img.src));
  });
}

function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  if (!lb || !lbImg) return;

  lbImg.src = src;
  lb.style.display = "flex";
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
}

/* =====================================================
   GUESTBOOK (DUMMY FRONTEND)
===================================================== */
function initGuestbookDummy() {
  const form = document.getElementById("guestForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("guestName").value;
    const msg = document.getElementById("guestMsg").value;

    if (!name || !msg) return;

    const list = document.getElementById("guestList");
    const div = document.createElement("div");
    div.className = "guest-item";
    div.innerHTML = `<b>${escapeHtml(name)}</b><br>${escapeHtml(msg)}`;

    list.prepend(div);
    form.reset();
  });
}

/* =====================================================
   IMAGE UPLOAD + COMPRESS
===================================================== */
async function compressImage(file, maxW = 900, quality = 0.78) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = URL.createObjectURL(file);
  });
}

/* =====================================================
   GOOGLE MAPS HELPER
===================================================== */
function mapEmbed(q) {
  return (
    "https://www.google.com/maps?q=" +
    encodeURIComponent(q || "Indonesia") +
    "&output=embed"
  );
}

function mapOpen(q) {
  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(q || "Indonesia")
  );
}

/* =====================================================
   AI GENERATE INVITATION
===================================================== */
async function generateAndPreview() {
  const text = document.getElementById("inputText").value.trim();
  if (!text) return showToast("Isi prompt dulu");

  showHint("⏳ Generate AI...");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();
  if (!data.result) return showToast("Gagal generate");

  currentInvite = data.invite || {};
  showHint("✅ Berhasil dibuat");
}

/* =====================================================
   APPLY DATA TO UNDANGAN
===================================================== */
function applyInviteToUI(inv) {
  document.getElementById("heroName").textContent =
    `${inv.groom || "Namamu"} & ${inv.bride || "Pasanganmu"}`;

  document.getElementById("heroDate").textContent =
    inv.date || "Tanggal Pernikahan";

  document.getElementById("story").textContent =
    inv.story || "Kisah cinta penuh makna.";

  document.getElementById("mapFrame").src =
    mapEmbed(inv.location);

  document.getElementById("openMap").onclick = () =>
    window.open(mapOpen(inv.location), "_blank");

  startCountdown(inv.dateTime);
}

/* =====================================================
   COUNTDOWN
===================================================== */
function startCountdown(dateStr) {
  const target = new Date(dateStr).getTime();
  setInterval(() => {
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return;

    document.getElementById("cd-days").textContent =
      Math.floor(diff / 86400000);
    document.getElementById("cd-hours").textContent =
      Math.floor(diff / 3600000) % 24;
    document.getElementById("cd-mins").textContent =
      Math.floor(diff / 60000) % 60;
    document.getElementById("cd-secs").textContent =
      Math.floor(diff / 1000) % 60;
  }, 1000);
}

/* =====================================================
   SAVE + LOAD INVITE (WORKER KV)
===================================================== */
async function saveInviteToWorker(payload) {
  await fetch(API_URL + "/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function loadInviteFromQuery() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return;

  const res = await fetch(API_URL + "?id=" + id);
  const data = await res.json();

  if (data.invite) {
    currentInvite = data.invite;
    applyInviteToUI(currentInvite);
  }
}

/* =====================================================
   SHARE WHATSAPP
===================================================== */
function shareWA() {
  const url = location.href;
  window.open(
    "https://wa.me/?text=" + encodeURIComponent("Undangan Pernikahan:\n" + url)
  );
}

/* =====================================================
   UTIL
===================================================== */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[m]);
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 1600);
}

function showHint(msg) {
  document.getElementById("hint").textContent = msg;
}
