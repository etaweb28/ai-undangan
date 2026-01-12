/* =====================================================
   CONFIG
===================================================== */

// GANTI DENGAN WORKER URL KAMU (SUDAH FIX)
const API_BASE = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";

const API = {
  ai: `${API_BASE}/ai`,
  save: `${API_BASE}/invite/save`,
  get: `${API_BASE}/invite/get`,
  guestAdd: `${API_BASE}/guestbook/add`,
  guestList: `${API_BASE}/guestbook/list`
};

/* =====================================================
   UTIL
===================================================== */

const $ = (id) => document.getElementById(id);
const qs = (q) => document.querySelector(q);

function toast(msg) {
  alert(msg);
}

function mapsEmbed(input) {
  if (!input) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(input)}&output=embed`;
}

/* =====================================================
   INIT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initIndexPage();
  initUndanganPage();
});

/* =====================================================
   INDEX PAGE LOGIC
===================================================== */

function initIndexPage() {
  if (!$("saveInviteBtn")) return;

  // GENERATE AI
  $("generateStoryBtn")?.addEventListener("click", generateAIStory);

  // SAVE UNDANGAN
  $("saveInviteBtn").addEventListener("click", saveInvitation);
}

/* ---------------- AI GENERATE ---------------- */

async function generateAIStory() {
  const prompt = $("storyPrompt")?.value.trim();
  if (!prompt) return toast("Isi cerita dulu");

  $("statusText").innerText = "⏳ Generate cerita dengan AI...";

  try {
    const res = await fetch(API.ai, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    $("storyPrompt").value = data.result;
    $("statusText").innerText = "✅ Cerita berhasil dibuat";
  } catch (e) {
    $("statusText").innerText = "❌ Gagal generate AI";
  }
}

/* ---------------- SAVE INVITATION ---------------- */

async function saveInvitation() {
  $("statusText").innerText = "⏳ Menyimpan undangan...";

  try {
    const payload = {
      groom: {
        name: $("groomName").value,
        parents: $("groomParents").value,
        photo: $("groomPhoto").value
      },
      bride: {
        name: $("brideName").value,
        parents: $("brideParents").value,
        photo: $("bridePhoto").value
      },
      akad: {
        date: $("akadDate").value,
        time: $("akadTime").value,
        place: $("akadPlace").value
      },
      resepsi: {
        date: $("resepsiDate").value,
        time: $("resepsiTime").value,
        place: $("resepsiPlace").value
      },
      story: $("storyPrompt").value,
      music: $("musicSelect").value,
      maps: {
        raw: $("mapsInput").value,
        embed: mapsEmbed($("mapsInput").value)
      },
      gallery: $("galleryInput").value
        .split("\n")
        .map(v => v.trim())
        .filter(Boolean)
    };

    const res = await fetch(API.save, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    $("statusText").innerHTML = `
      ✅ Undangan tersimpan<br>
      <a href="${data.url}" target="_blank">Buka Undangan</a>
    `;
  } catch (e) {
    $("statusText").innerText = "❌ Gagal menyimpan undangan";
  }
}

/* =====================================================
   UNDANGAN PAGE LOGIC
===================================================== */

function initUndanganPage() {
  if (!qs(".hero")) return;

  loadInvitation();
}

/* ---------------- LOAD INVITATION ---------------- */

async function loadInvitation() {
  const params = new URLSearchParams(window.location.search);
  const inviteId = params.get("invite");
  const guestName = params.get("to");

  if (!inviteId) return alert("Invite ID tidak ditemukan");

  try {
    const res = await fetch(`${API.get}?id=${inviteId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // HERO
    $("heroNames").innerText = `${data.groom.name} & ${data.bride.name}`;
    $("heroDate").innerText = data.resepsi.date;

    // MUSIC
    const audio = $("music");
    audio.src = data.music || "wedding1.mp3";

    $("openInvitationBtn").onclick = () => {
      audio.play().catch(() => {});
      qs("#content").scrollIntoView({ behavior: "smooth" });
    };

    // COUPLE
    $("groomNameText").innerText = data.groom.name;
    $("groomParentsText").innerText = data.groom.parents;
    $("groomPhoto").src = data.groom.photo;

    $("brideNameText").innerText = data.bride.name;
    $("brideParentsText").innerText = data.bride.parents;
    $("bridePhoto").src = data.bride.photo;

    // DETAIL
    $("akadText").innerText =
      `${data.akad.date} • ${data.akad.time} • ${data.akad.place}`;

    $("resepsiText").innerText =
      `${data.resepsi.date} • ${data.resepsi.time} • ${data.resepsi.place}`;

    // MAP
    $("mapsFrame").src = data.maps.embed;

    // GALLERY
    data.gallery.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      $("gallery").appendChild(img);
    });

    // COUNTDOWN
    startCountdown(data.resepsi.date);

    // GUESTBOOK
    if (guestName) $("guestName").value = guestName;
    initGuestbook(inviteId);

  } catch (e) {
    alert("Gagal memuat undangan");
  }
}

/* ---------------- COUNTDOWN ---------------- */

function startCountdown(dateStr) {
  const target = new Date(dateStr).getTime();

  setInterval(() => {
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return;

    $("cdDays").innerText = Math.floor(diff / 86400000);
    $("cdHours").innerText = Math.floor(diff % 86400000 / 3600000);
    $("cdMinutes").innerText = Math.floor(diff % 3600000 / 60000);
    $("cdSeconds").innerText = Math.floor(diff % 60000 / 1000);
  }, 1000);
}

/* =====================================================
   GUESTBOOK
===================================================== */

function initGuestbook(inviteId) {
  loadGuestbook(inviteId);
  setInterval(() => loadGuestbook(inviteId), 4000);

  $("guestbookForm").onsubmit = async (e) => {
    e.preventDefault();

    await fetch(API.guestAdd, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteId,
        name: $("guestName").value,
        message: $("guestMessage").value,
        hadir: $("guestHadir").value
      })
    });

    $("guestMessage").value = "";
    loadGuestbook(inviteId);
  };
}

async function loadGuestbook(inviteId) {
  const res = await fetch(`${API.guestList}?inviteId=${inviteId}`);
  const list = await res.json();

  $("guestbookList").innerHTML = "";
  list.forEach(item => {
    const div = document.createElement("div");
    div.className = "guestbook-item";
    div.innerHTML = `<b>${item.name}</b> (${item.hadir})<br>${item.message}`;
    $("guestbookList").appendChild(div);
  });
}