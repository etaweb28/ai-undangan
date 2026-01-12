/* =============================
   CONFIG
============================= */
const API = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";

/* =============================
   STATE
============================= */
let currentInvite = null;
let currentMusic = "wedding1.mp3";
let countdownTimer = null;

/* =============================
   INIT
============================= */
window.addEventListener("load", () => {
  setTimeout(() => loader.style.display = "none", 800);
  initReveal();
  initGalleryLightbox();
  initGuestbookDummy();
  bootFromQueryId();
});

/* =============================
   HERO + MUSIC
============================= */
const music = document.getElementById("music");

function openInvitation() {
  document.getElementById("content")
    .scrollIntoView({ behavior: "smooth" });
  playMusicSafe();
}

function playMusicSafe() {
  music.play().catch(() => {});
}

function toggleMusic() {
  music.paused ? music.play().catch(() => {}) : music.pause();
}

/* =============================
   BOTTOM SHEET
============================= */
function openSheet() {
  sheet.classList.add("open");
}
function closeSheet() {
  sheet.classList.remove("open");
}

/* =============================
   SCROLL REVEAL
============================= */
function initReveal() {
  const els = document.querySelectorAll(".fade");
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add("show");
      });
    },
    { threshold: 0.12 }
  );
  els.forEach(el => io.observe(el));
}

/* =============================
   LIGHTBOX
============================= */
function initGalleryLightbox() {
  document.querySelectorAll("#gallery img").forEach(img => {
    img.onclick = () => openLightbox(img.src);
  });
}
function openLightbox(src) {
  lightbox.style.display = "flex";
  lightboxImg.src = src;
}
function closeLightbox() {
  lightbox.style.display = "none";
  lightboxImg.src = "";
}

/* =============================
   GUESTBOOK (DUMMY FRONTEND)
============================= */
function initGuestbookDummy() {
  guestForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = guestName.value.trim();
    const msg = guestMsg.value.trim();
    const att = guestAttend.value;
    if (!name || !msg) return;

    const div = document.createElement("div");
    div.className = "gItem";
    div.innerHTML =
      `<strong>${escapeHtml(name)}</strong> ` +
      `<span style="color:#999">• ${escapeHtml(att)}</span><br>` +
      `${escapeHtml(msg)}`;
    guestPreview.prepend(div);

    guestForm.querySelector("button").innerHTML = "Terkirim ✅";
    setTimeout(() => {
      guestForm.querySelector("button").innerHTML =
        `<i class="fa-solid fa-paper-plane"></i> Kirim`;
    }, 900);

    guestName.value = "";
    guestMsg.value = "";
    guestAttend.value = "Hadir";
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

/* =============================
   IMAGE COMPRESS
============================= */
async function fileToSmallDataURL(file, maxW = 900, quality = 0.78) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });

  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

/* =============================
   MAP HELPERS
============================= */
function mapToEmbed(q) {
  return "https://www.google.com/maps?q=" +
    encodeURIComponent(q || "Indonesia") + "&output=embed";
}
function mapToOpen(q) {
  return "https://www.google.com/maps?q=" +
    encodeURIComponent(q || "Indonesia");
}

/* =============================
   AI GENERATE
============================= */
async function generateAndPreview() {
  const text = prompt.value.trim();
  if (!text) {
    sheetHint.textContent = "Isi prompt dulu.";
    return;
  }

  sheetHint.textContent = "⏳ Generate AI…";

  // set music
  currentMusic = musicSelect.value;
  musicSource.src = currentMusic;
  music.load();

  const res = await fetch(API + "/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  if (!data.success) {
    sheetHint.textContent = "❌ AI gagal.";
    return;
  }

  let inv = data.invite || {};

  // overrides
  if (groomOverride.value) inv.groom = groomOverride.value;
  if (brideOverride.value) inv.bride = brideOverride.value;
  if (dateOverride.value) inv.date = dateOverride.value;
  if (akadOverride.value)
    inv.akad_time = `Akad: ${akadOverride.value}`;
  if (resepsiOverride.value)
    inv.resepsi_time = `Resepsi: ${resepsiOverride.value}`;
  if (venueOverride.value) inv.venue = venueOverride.value;
  if (mapsOverride.value) inv.maps_query = mapsOverride.value;

  inv.maps_query =
    inv.maps_query || inv.address || inv.venue || "Indonesia";

  inv.full_text = inv.full_text || "";

  currentInvite = inv;
  applyInviteToUI(inv);

  sheetHint.textContent = "✅ Berhasil dibuat!";
}

/* =============================
   APPLY DATA TO UI
============================= */
function applyInviteToUI(inv) {
  const groom = inv.groom || "(Namamu)";
  const bride = inv.bride || "(Nama Pasanganmu)";
  const date = inv.date || "Tanggal Acara";

  heroNames.textContent = `${groom} & ${bride}`;
  heroDate.textContent = date;
  groomName.textContent = groom;
  brideName.textContent = bride;
  footerNames.textContent = `${groom} & ${bride}`;

  akadInfo.textContent =
    `${date}\n${inv.akad_time || ""}\n${inv.venue || ""}`;
  resepsiInfo.textContent =
    `${date}\n${inv.resepsi_time || ""}\n${inv.venue || ""}`;

  locText.textContent = "📍 " + inv.maps_query;
  map.src = mapToEmbed(inv.maps_query);
  openMapsBtn.href = mapToOpen(inv.maps_query);

  startCountdown(inv.date);

  document.getElementById("content")
    .scrollIntoView({ behavior: "smooth" });
}

/* =============================
   COUNTDOWN
============================= */
function startCountdown(dateStr) {
  const dObj = new Date(dateStr);
  if (isNaN(dObj)) return;

  const target = dObj.getTime();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    const diff = target - Date.now();
    if (diff <= 0) return;

    d.textContent = Math.floor(diff / 86400000);
    h.textContent = Math.floor(diff / 3600000) % 24;
    m.textContent = Math.floor(diff / 60000) % 60;
    s.textContent = Math.floor(diff / 1000) % 60;
  }, 1000);
}

/* =============================
   SAVE TO KV
============================= */
async function saveToKVAndMakeLink() {
  if (!currentInvite) {
    sheetHint.textContent = "Generate dulu.";
    return;
  }

  sheetHint.textContent = "⏳ Menyimpan…";

  const photos = {};
  if (groomPhoto.files[0])
    photos.groom = await fileToSmallDataURL(groomPhoto.files[0]);
  if (bridePhoto.files[0])
    photos.bride = await fileToSmallDataURL(bridePhoto.files[0]);

  if (galleryPhotos.files.length) {
    photos.gallery = [];
    for (const f of [...galleryPhotos.files].slice(0, 10)) {
      photos.gallery.push(await fileToSmallDataURL(f, 1100, 0.75));
    }
  }

  const payload = {
    invite: currentInvite,
    aiText: currentInvite.full_text,
    music: currentMusic,
    photos
  };

  const res = await fetch(API + "/invite/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!data.success) {
    sheetHint.textContent = "❌ Gagal simpan.";
    return;
  }

  const link =
    location.origin + location.pathname + "?id=" + data.id;
  await navigator.clipboard.writeText(link);
  toastShow("Link undangan disalin ✅");

  closeSheet();
}

/* =============================
   LOAD FROM ?id=
============================= */
async function bootFromQueryId() {
  const q = new URLSearchParams(location.search);
  const id = q.get("id");
  if (!id) return;

  const res = await fetch(API + "/invite/get?id=" + id);
  if (!res.ok) return;

  const data = await res.json();
  currentInvite = data.invite;
  currentMusic = data.music || "wedding1.mp3";

  musicSource.src = currentMusic;
  music.load();

  if (currentInvite) applyInviteToUI(currentInvite);

  const photos = data.photos || {};
  if (photos.groom) groomImg.src = photos.groom;
  if (photos.bride) brideImg.src = photos.bride;
  if (photos.gallery?.length) {
    gallery.innerHTML = "";
    photos.gallery.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.onclick = () => openLightbox(src);
      gallery.appendChild(img);
    });
  }

  toastShow("Undangan dimuat dari link ✅");
}

/* =============================
   UTIL
============================= */
function toastShow(text) {
  toast.textContent = text;
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 1600);
}
