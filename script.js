/* ======================================================
   CONFIG
====================================================== */
const API_BASE = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";

/* ======================================================
   UTIL
====================================================== */
const $ = (id) => document.getElementById(id);
const $$ = (q) => document.querySelectorAll(q);

function toast(msg, ok = true) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.background = ok ? "#333" : "#b00020";
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 2000);
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ======================================================
   INIT
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const inviteId = qs("invite");
  if (inviteId) loadInvite(inviteId);

  const to = qs("to");
  if (to && $("guestName")) $("guestName").textContent = decodeURIComponent(to);

  initGuestbook();
});

/* ======================================================
   AI GENERATE (INDEX)
====================================================== */
async function generateAI() {
  const prompt = $("storyPrompt").value.trim();
  if (!prompt) return toast("Isi prompt dulu", false);

  $("aiStatus").textContent = "⏳ Generate AI...";
  try {
    const res = await fetch(API_BASE + "/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt })
    });

    const data = await res.json();
    if (!data.extracted) throw new Error("AI gagal");

    const e = data.extracted;

    // AUTO FILL FORM
    $("groomName").value = e.groom || $("groomName").value;
    $("brideName").value = e.bride || $("brideName").value;
    $("groomParents").value = e.groomParents || "";
    $("brideParents").value = e.brideParents || "";
    $("resepsiDate").value = e.dateISO || "";
    $("akadTime").value = e.akadTime || "";
    $("resepsiTime").value = e.resepsiTime || "";
    $("location").value = e.location || "";
    $("story").value = e.story || "";

    $("aiStatus").textContent = "✅ Data berhasil diisi otomatis";
  } catch (err) {
    $("aiStatus").textContent = "❌ Gagal generate AI";
    toast("Gagal generate AI", false);
  }
}

/* ======================================================
   SAVE & CREATE LINK (INDEX)
====================================================== */
async function saveAndCreate() {
  const payload = collectForm();
  if (!payload) return;

  $("saveStatus").textContent = "⏳ Menyimpan...";
  try {
    const res = await fetch(API_BASE + "/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.id) throw new Error("Gagal simpan");

    $("inviteLink").value = data.url;
    $("saveStatus").textContent = "✅ Undangan berhasil dibuat";
    toast("Link undangan siap");
  } catch {
    $("saveStatus").textContent = "❌ Gagal menyimpan";
    toast("Gagal menyimpan undangan", false);
  }
}

function collectForm() {
  const groom = $("groomName").value.trim();
  const bride = $("brideName").value.trim();
  const date = $("resepsiDate").value;

  if (!groom || !bride || !date) {
    toast("Nama & tanggal wajib diisi", false);
    return null;
  }

  return {
    groom,
    bride,
    groomParents: $("groomParents").value,
    brideParents: $("brideParents").value,
    date,
    akadTime: $("akadTime").value,
    resepsiTime: $("resepsiTime").value,
    location: $("location").value,
    maps: $("location").value,
    story: $("story").value,
    music: document.querySelector("select")?.value || "wedding1.mp3",
    photos: Array.from($$(".photo-url"))
      .map((i) => i.value.trim())
      .filter(Boolean)
  };
}

/* ======================================================
   LOAD INVITE (UNDANGAN)
====================================================== */
async function loadInvite(id) {
  try {
    const res = await fetch(API_BASE + "/invite?id=" + id);
    const d = await res.json();
    if (!d.id) throw new Error();

    $("heroNames").textContent = `${d.groom} & ${d.bride}`;
    $("heroDate").textContent = d.date;

    $("groomText").textContent = d.groom;
    $("brideText").textContent = d.bride;
    $("groomParents").textContent = d.groomParents || "";
    $("brideParents").textContent = d.brideParents || "";

    $("akadInfo").textContent = `${d.date} • ${d.akadTime}`;
    $("resepsiInfo").textContent = `${d.date} • ${d.resepsiTime}`;

    $("storyText").textContent = d.story || "";

    if ($("mapEmbed")) {
      $("mapEmbed").src =
        "https://www.google.com/maps?q=" +
        encodeURIComponent(d.location) +
        "&output=embed";
    }

    startCountdown(d.date);
    renderGallery(d.photos || []);
    setupMusic(d.music || "wedding1.mp3");

    window.currentInviteId = id;
    loadGuestbook(id);
  } catch {
    toast("Undangan tidak ditemukan", false);
  }
}

/* ======================================================
   COUNTDOWN
====================================================== */
function startCountdown(dateStr) {
  const target = new Date(dateStr).getTime();
  setInterval(() => {
    const diff = target - Date.now();
    if (diff < 0) return;

    $("cd-days").textContent = Math.floor(diff / (1000 * 60 * 60 * 24));
    $("cd-hours").textContent = Math.floor((diff / (1000 * 60 * 60)) % 24);
    $("cd-mins").textContent = Math.floor((diff / (1000 * 60)) % 60);
    $("cd-secs").textContent = Math.floor((diff / 1000) % 60);
  }, 1000);
}

/* ======================================================
   GALLERY
====================================================== */
function renderGallery(list) {
  const g = $("gallery");
  if (!g) return;
  g.innerHTML = "";
  list.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    g.appendChild(img);
  });
}

/* ======================================================
   MUSIC
====================================================== */
function setupMusic(src) {
  const m = $("music");
  if (!m) return;
  m.src = src;
}

function openInvitation() {
  document.getElementById("content").scrollIntoView({ behavior: "smooth" });
  const m = $("music");
  if (m) m.play().catch(() => {});
}

/* ======================================================
   GUESTBOOK
====================================================== */
function initGuestbook() {
  const form = $("guestForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = window.currentInviteId;
    if (!id) return;

    const name = $("gbName").value.trim();
    const message = $("gbMsg").value.trim();
    const hadir = $("gbHadir").value;

    if (!name || !message) return toast("Isi nama & pesan", false);

    await fetch(API_BASE + "/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId: id, name, message, hadir })
    });

    $("gbName").value = "";
    $("gbMsg").value = "";
    loadGuestbook(id);
  });
}

async function loadGuestbook(id) {
  const res = await fetch(API_BASE + "/guestbook?inviteId=" + id);
  const data = await res.json();

  const wrap = $("guestList");
  if (!wrap) return;
  wrap.innerHTML = "";

  data.items.forEach((g) => {
    const div = document.createElement("div");
    div.className = "guest-item";
    div.innerHTML = `<b>${g.name}</b><p>${g.message}</p>`;
    wrap.appendChild(div);
  });
}