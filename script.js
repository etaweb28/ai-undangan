/* =========================================================
   CONFIG
========================================================= */
const API_BASE = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";
let currentInviteId = null;
let currentMusic = "wedding1.mp3";

/* =========================================================
   UTIL
========================================================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(msg, ok = true) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.className = ok ? "toast ok" : "toast err";
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 1800);
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function safe(v, d = "") {
  return v ?? d;
}

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // Loader
  const loader = $("#loader");
  if (loader) setTimeout(() => (loader.style.display = "none"), 800);

  // Auto-load invite if ?invite=
  const inviteId = qs("invite");
  if (inviteId) loadInvite(inviteId);

  // Guest name auto ?to=
  const toName = qs("to");
  if (toName && $("#guestName")) $("#guestName").textContent = decodeURIComponent(toName);

  // Scroll reveal
  initReveal();

  // Gallery lightbox
  initLightbox();

  // Guestbook live
  initGuestbook();

  // Music
  const music = $("#music");
  if (music) music.src = currentMusic;
});

/* =========================================================
   MUSIC
========================================================= */
function playMusic() {
  const m = $("#music");
  if (!m) return;
  m.play().catch(() => {});
}
function toggleMusic() {
  const m = $("#music");
  if (!m) return;
  m.paused ? m.play().catch(() => {}) : m.pause();
}
function chooseMusic(file) {
  currentMusic = file;
  const m = $("#music");
  if (m) {
    m.src = file;
    m.play().catch(() => {});
  }
}

/* =========================================================
   OPEN COVER
========================================================= */
function openInvitation() {
  $("#content")?.scrollIntoView({ behavior: "smooth" });
  playMusic();
  document.body.classList.add("opened");
}

/* =========================================================
   MAPS
========================================================= */
function mapsEmbedFromText(text) {
  if (!text) return "";
  // if user pasted maps short link or text, fallback to query embed
  return `https://www.google.com/maps?q=${encodeURIComponent(text)}&output=embed`;
}
function openMaps(text) {
  const url = `https://www.google.com/maps?q=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/* =========================================================
   COUNTDOWN
========================================================= */
let countdownTimer = null;
function startCountdown(dateStr) {
  if (!dateStr) return;
  if (countdownTimer) clearInterval(countdownTimer);
  const target = new Date(dateStr).getTime();

  countdownTimer = setInterval(() => {
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) {
      clearInterval(countdownTimer);
      updateCountdown(0, 0, 0, 0);
      return;
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    updateCountdown(d, h, m, s);
  }, 1000);
}

function updateCountdown(d, h, m, s) {
  $("#cd-days") && ($("#cd-days").textContent = d);
  $("#cd-hours") && ($("#cd-hours").textContent = h);
  $("#cd-mins") && ($("#cd-mins").textContent = m);
  $("#cd-secs") && ($("#cd-secs").textContent = s);
}

/* =========================================================
   AI GENERATE
========================================================= */
async function generateAI() {
  const input = $("#aiInput")?.value?.trim();
  if (!input) return toast("Isi prompt dulu", false);

  $("#aiStatus").textContent = "⏳ Generate AI...";
  try {
    const res = await fetch(`${API_BASE}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "AI error");

    $("#story").value = json.result || "";
    $("#aiStatus").textContent = "✅ Cerita berhasil dibuat";
  } catch (e) {
    $("#aiStatus").textContent = "❌ Gagal generate";
    toast(e.message || "Server error", false);
  }
}

/* =========================================================
   SAVE & CREATE LINK
========================================================= */
async function saveAndCreate() {
  const payload = collectForm();
  if (!payload) return;

  $("#saveStatus").textContent = "⏳ Menyimpan...";
  try {
    const res = await fetch(`${API_BASE}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Save error");

    currentInviteId = json.id;
    const link = `${location.origin}${location.pathname.replace(/index\.html$/,"")}undangan.html?invite=${json.id}`;
    $("#inviteLink").value = link;
    $("#saveStatus").textContent = "✅ Berhasil disimpan";
    toast("Link undangan siap");
  } catch (e) {
    $("#saveStatus").textContent = "❌ Gagal menyimpan";
    toast(e.message || "Server error", false);
  }
}

function collectForm() {
  const groom = $("#groomName")?.value?.trim();
  const bride = $("#brideName")?.value?.trim();
  const date = $("#weddingDate")?.value;
  if (!groom || !bride || !date) {
    toast("Nama & tanggal wajib diisi", false);
    return null;
  }

  return {
    groom,
    bride,
    parentsGroom: safe($("#parentsGroom")?.value),
    parentsBride: safe($("#parentsBride")?.value),
    date,
    akadTime: safe($("#akadTime")?.value),
    resepsiTime: safe($("#resepsiTime")?.value),
    location: safe($("#location")?.value),
    maps: mapsEmbedFromText($("#location")?.value),
    story: safe($("#story")?.value),
    music: currentMusic,
    photos: collectPhotoUrls(),
    createdAt: Date.now()
  };
}

/* =========================================================
   LOAD INVITE
========================================================= */
async function loadInvite(id) {
  try {
    const res = await fetch(`${API_BASE}/invite?id=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Load error");

    renderInvite(json);
  } catch (e) {
    toast("Undangan tidak ditemukan", false);
  }
}

function renderInvite(d) {
  currentInviteId = d.id;

  $("#heroNames") && ($("#heroNames").textContent = `${d.groom} & ${d.bride}`);
  $("#heroDate") && ($("#heroDate").textContent = d.date);

  $("#groomText") && ($("#groomText").textContent = d.groom);
  $("#brideText") && ($("#brideText").textContent = d.bride);

  $("#storyText") && ($("#storyText").textContent = d.story || "");

  if ($("#mapEmbed") && d.maps) $("#mapEmbed").src = d.maps;

  if (d.music) chooseMusic(d.music);

  startCountdown(d.date);

  renderGallery(d.photos || []);
}

/* =========================================================
   PHOTOS (URL ONLY – TANPA R2)
========================================================= */
function collectPhotoUrls() {
  return Array.from($$(".photo-url"))
    .map((i) => i.value.trim())
    .filter(Boolean);
}

function renderGallery(list) {
  const wrap = $("#gallery");
  if (!wrap) return;
  wrap.innerHTML = "";
  list.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "gallery";
    img.addEventListener("click", () => openLightbox(src));
    wrap.appendChild(img);
  });
}

/* =========================================================
   LIGHTBOX
========================================================= */
function initLightbox() {
  const lb = $("#lightbox");
  if (!lb) return;
  lb.addEventListener("click", () => (lb.style.display = "none"));
}
function openLightbox(src) {
  const lb = $("#lightbox");
  const img = $("#lightboxImg");
  if (!lb || !img) return;
  img.src = src;
  lb.style.display = "flex";
}

/* =========================================================
   SCROLL REVEAL
========================================================= */
function initReveal() {
  const obs = new IntersectionObserver(
    (ents) => ents.forEach((e) => e.isIntersecting && e.target.classList.add("show")),
    { threshold: 0.15 }
  );
  $$(".fade").forEach((el) => obs.observe(el));
}

/* =========================================================
   GUESTBOOK (REALTIME via Worker)
========================================================= */
function initGuestbook() {
  const form = $("#guestForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentInviteId) return toast("Undangan belum dimuat", false);

    const name = $("#gbName")?.value?.trim();
    const msg = $("#gbMsg")?.value?.trim();
    if (!name || !msg) return toast("Lengkapi nama & pesan", false);

    try {
      const res = await fetch(`${API_BASE}/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: currentInviteId, name, msg })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Guestbook error");

      $("#gbName").value = "";
      $("#gbMsg").value = "";
      toast("Pesan terkirim");
      loadGuestbook(currentInviteId);
    } catch (e) {
      toast("Gagal kirim pesan", false);
    }
  });

  // initial load
  if (currentInviteId) loadGuestbook(currentInviteId);
}

async function loadGuestbook(inviteId) {
  try {
    const res = await fetch(`${API_BASE}/guestbook?inviteId=${encodeURIComponent(inviteId)}`);
    const json = await res.json();
    if (!res.ok) throw new Error();

    const wrap = $("#guestList");
    if (!wrap) return;
    wrap.innerHTML = "";
    (json.items || []).forEach((it) => {
      const d = document.createElement("div");
      d.className = "guest-item";
      d.innerHTML = `<b>${it.name}</b><p>${it.msg}</p>`;
      wrap.appendChild(d);
    });
  } catch {}
}