/* =========================
   CONFIG (WAJIB)
========================= */

// Pakai worker URL kamu. Kalau kamu males ganti, taro worker url di sini:
const API_BASE = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev"; 
// Kalau nanti kamu pakai custom domain / route, tinggal ganti ini.

const ENDPOINTS = {
  ai: `${API_BASE}/ai`,
  save: `${API_BASE}/invite/save`,
  get: `${API_BASE}/invite/get`,
  gbAdd: `${API_BASE}/guestbook/add`,
  gbList: `${API_BASE}/guestbook/list`,
};

let currentInviteId = null;
let currentInviteData = null;
let guestbookTimer = null;

/* =========================
   UTIL
========================= */

function $(id) {
  return document.getElementById(id);
}

function q(sel) {
  return document.querySelector(sel);
}

function qq(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function toast(msg, type = "info") {
  const el = $("toast");
  if (!el) return alert(msg);
  el.textContent = msg;
  el.dataset.type = type;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.display = "none"), 1800);
}

function setHint(msg, ok = true) {
  const el = $("sheetHint");
  if (!el) return;
  el.innerHTML = ok ? `✅ ${msg}` : `❌ ${msg}`;
}

function safeText(s) {
  return (s || "").toString().trim();
}

/* Convert Google Maps link / address -> embed url */
function toMapsEmbed(input) {
  const v = safeText(input);
  if (!v) return "";
  // Kalau sudah embed link:
  if (v.includes("google.com/maps/embed")) return v;

  // Kalau user paste link maps biasa, cukup jadikan query:
  // (Aman & simpel) -> embed berdasarkan q=
  const qStr = encodeURIComponent(v);
  return `https://www.google.com/maps?q=${qStr}&output=embed`;
}

/* URL -> base64 (untuk simpan foto sebagai data URL) */
async function urlToDataUrl(url) {
  const u = safeText(url);
  if (!u) return "";
  try {
    const res = await fetch(u, { mode: "cors" });
    if (!res.ok) throw new Error("fetch image failed");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch {
    // fallback: simpan url saja (kalau CORS blok)
    return u;
  }
}

/* File input -> dataURL */
async function fileToDataUrl(file, maxW = 1100, quality = 0.82) {
  if (!file) return "";

  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = URL.createObjectURL(file);
  });

  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {
  initLoader();
  initMusicControls();
  initGenerateAI();
  initSaveInvitation();
  initPreviewAutoLoad();
  initGuestbookDummyIfAny();
});

/* Loader */
function initLoader() {
  const loader = $("loader");
  if (loader) setTimeout(() => (loader.style.display = "none"), 650);
}

/* =========================
   MUSIC
========================= */

function initMusicControls() {
  const audio = $("music");
  const musicSelect = $("musicSelect");
  const musicBtn = $("musicToggle");

  if (musicSelect) {
    musicSelect.addEventListener("change", () => {
      if (!audio) return;
      audio.src = musicSelect.value;
      audio.play().catch(() => {});
      if (musicBtn) musicBtn.classList.add("on");
    });
  }

  if (musicBtn && audio) {
    musicBtn.addEventListener("click", () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      musicBtn.classList.toggle("on", !audio.paused);
    });
  }

  // Tombol "Buka Undangan" play music (kalau ada)
  const openBtn = $("openInvitationBtn");
  if (openBtn && audio) {
    openBtn.addEventListener("click", () => {
      audio.play().catch(() => {});
      if ($("content")) $("content").scrollIntoView({ behavior: "smooth" });
    });
  }
}

/* =========================
   AI GENERATE
========================= */

function initGenerateAI() {
  const btn = $("btnGenerateAI");
  const promptInput = $("promptInput");
  if (!btn || !promptInput) return;

  btn.addEventListener("click", async () => {
    const text = safeText(promptInput.value);
    if (!text) return setHint("Isi prompt dulu.", false);

    setHint("Generate AI...", true);

    try {
      const res = await fetch(ENDPOINTS.ai, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "AI error");

      // Tampilkan hasil mentah kalau ada textarea preview
      if ($("aiResult")) $("aiResult").value = data.result;

      // Optional: coba parse hasil AI jadi form otomatis
      autoFillFromAI(data.result);

      setHint("Berhasil generate.", true);
      toast("AI selesai generate ✅", "success");
    } catch (e) {
      console.error(e);
      setHint("Gagal generate AI.", false);
      toast("AI error / server error", "error");
    }
  });
}

/* Auto-fill sederhana dari teks AI (robust, nggak maksa) */
function autoFillFromAI(text) {
  const t = safeText(text);
  if (!t) return;

  // Regex helper
  const pick = (re) => {
    const m = t.match(re);
    return m && m[1] ? safeText(m[1]) : "";
  };

  // Nama mempelai
  const groom = pick(/Namamu\)?\s*[:\-]\s*(.+)/i) || pick(/Mempelai Pria\s*[:\-]\s*(.+)/i);
  const bride = pick(/Nama Pasanganmu\)?\s*[:\-]\s*(.+)/i) || pick(/Mempelai Wanita\s*[:\-]\s*(.+)/i);

  if (groom && $("groomName")) $("groomName").value = groom.replace(/\*/g, "");
  if (bride && $("brideName")) $("brideName").value = bride.replace(/\*/g, "");

  // Lokasi
  const loc = pick(/Lokasi(?: Acara)?\s*[:\-]\s*(.+)/i);
  if (loc && $("mapsInput")) $("mapsInput").value = loc;

  // Story / kisah
  const story = pick(/Kisah(?: Singkat)?(?: Cinta)?\s*[:\-]\s*([\s\S]+)/i);
  if (story && $("loveStory")) $("loveStory").value = story.slice(0, 700);
}

/* =========================
   SAVE + GENERATE LINK
========================= */

function initSaveInvitation() {
  const btn = $("btnSaveInvite");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      setHint("Menyimpan...", true);

      // 1) Ambil form data
      const payload = await buildInvitePayload();

      // 2) POST save
      const res = await fetch(ENDPOINTS.save, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "Gagal simpan");

      currentInviteId = data.id;
      currentInviteData = payload;

      // 3) Tampilkan link
      const link = data.url;
      if ($("inviteLink")) {
        $("inviteLink").value = link;
      }
      if ($("btnOpenInvite")) {
        $("btnOpenInvite").style.display = "inline-flex";
        $("btnOpenInvite").onclick = () => (location.href = link);
      }

      setHint("Simpan sukses. Link dibuat ✅", true);
      toast("Undangan tersimpan ✅", "success");
    } catch (e) {
      console.error(e);
      setHint("Gagal menyimpan.", false);
      toast("Gagal menyimpan ❌", "error");
    }
  });
}

/* Build payload sinkron worker KV (NO R2) */
async function buildInvitePayload() {
  const groomName = safeText($("groomName")?.value) || "Namamu";
  const brideName = safeText($("brideName")?.value) || "Nama Pasanganmu";

  const groomParents = safeText($("groomParents")?.value);
  const brideParents = safeText($("brideParents")?.value);

  const akadDate = safeText($("akadDate")?.value);
  const akadTime = safeText($("akadTime")?.value);
  const akadPlace = safeText($("akadPlace")?.value);

  const resepsiDate = safeText($("resepsiDate")?.value);
  const resepsiTime = safeText($("resepsiTime")?.value);
  const resepsiPlace = safeText($("resepsiPlace")?.value);

  const mapsInput = safeText($("mapsInput")?.value);
  const mapsEmbed = toMapsEmbed(mapsInput);

  const loveStory = safeText($("loveStory")?.value);

  const music = $("musicSelect")?.value || "wedding1.mp3";

  // FOTO: input bisa URL atau file
  const groomPhotoUrl = safeText($("groomPhotoUrl")?.value);
  const bridePhotoUrl = safeText($("bridePhotoUrl")?.value);

  const groomPhotoFile = $("groomPhotoFile")?.files?.[0];
  const bridePhotoFile = $("bridePhotoFile")?.files?.[0];

  // priority: file -> dataURL, kalau kosong pakai url (atau url->dataurl)
  let groomPhoto = "";
  if (groomPhotoFile) groomPhoto = await fileToDataUrl(groomPhotoFile);
  else if (groomPhotoUrl) groomPhoto = await urlToDataUrl(groomPhotoUrl);

  let bridePhoto = "";
  if (bridePhotoFile) bridePhoto = await fileToDataUrl(bridePhotoFile);
  else if (bridePhotoUrl) bridePhoto = await urlToDataUrl(bridePhotoUrl);

  // GALERI: bisa url list atau file multiple
  const galleryUrlsText = safeText($("galleryUrls")?.value); // pisah baris
  const galleryFiles = $("galleryFiles")?.files ? Array.from($("galleryFiles").files) : [];

  const gallery = [];

  // dari file
  for (const f of galleryFiles.slice(0, 10)) {
    gallery.push(await fileToDataUrl(f, 1200, 0.8));
  }

  // dari URL (baris)
  if (galleryUrlsText) {
    const urls = galleryUrlsText
      .split("\n")
      .map((x) => safeText(x))
      .filter(Boolean)
      .slice(0, 10);

    for (const u of urls) {
      gallery.push(await urlToDataUrl(u));
    }
  }

  return {
    // data utama
    groom: { name: groomName, parents: groomParents, photo: groomPhoto },
    bride: { name: brideName, parents: brideParents, photo: bridePhoto },

    akad: { date: akadDate, time: akadTime, place: akadPlace },
    resepsi: { date: resepsiDate, time: resepsiTime, place: resepsiPlace },

    maps: { raw: mapsInput, embed: mapsEmbed },

    story: loveStory,
    music,

    gallery
  };
}

/* =========================
   PREVIEW AUTO-LOAD (index)
========================= */

function initPreviewAutoLoad() {
  // Kalau user buka: /index.html?invite=xxx -> auto load data dan isi form
  const url = new URL(location.href);
  const invite = url.searchParams.get("invite");
  if (!invite) return;

  loadInviteToForm(invite);
}

async function loadInviteToForm(id) {
  try {
    setHint("Memuat data undangan...", true);

    const res = await fetch(`${ENDPOINTS.get}?id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Gagal load");

    currentInviteId = id;
    currentInviteData = data;

    // isi form
    if ($("groomName")) $("groomName").value = data?.groom?.name || "";
    if ($("brideName")) $("brideName").value = data?.bride?.name || "";

    if ($("groomParents")) $("groomParents").value = data?.groom?.parents || "";
    if ($("brideParents")) $("brideParents").value = data?.bride?.parents || "";

    if ($("akadDate")) $("akadDate").value = data?.akad?.date || "";
    if ($("akadTime")) $("akadTime").value = data?.akad?.time || "";
    if ($("akadPlace")) $("akadPlace").value = data?.akad?.place || "";

    if ($("resepsiDate")) $("resepsiDate").value = data?.resepsi?.date || "";
    if ($("resepsiTime")) $("resepsiTime").value = data?.resepsi?.time || "";
    if ($("resepsiPlace")) $("resepsiPlace").value = data?.resepsi?.place || "";

    if ($("mapsInput")) $("mapsInput").value = data?.maps?.raw || "";
    if ($("loveStory")) $("loveStory").value = data?.story || "";

    if ($("musicSelect") && data?.music) $("musicSelect").value = data.music;

    // show link
    const link = `${location.origin}${location.pathname.replace(/index\.html$/,"undangan.html")}?invite=${id}`;
    if ($("inviteLink")) $("inviteLink").value = link;
    if ($("btnOpenInvite")) {
      $("btnOpenInvite").style.display = "inline-flex";
      $("btnOpenInvite").onclick = () => (location.href = link);
    }

    setHint("Data loaded ✅", true);
    toast("Data undangan dimuat ✅", "success");
  } catch (e) {
    console.error(e);
    setHint("Gagal load undangan.", false);
  }
}

/* =========================
   GUESTBOOK (REALTIME)
========================= */

function initGuestbookDummyIfAny() {
  // Kalau index ada komponen guestbook preview, tampilkan.
  // Untuk undangan realtime, nanti di undangan.html ada script sendiri (di bawah)
}

/* Dipakai di undangan.html juga (boleh reuse) */
async function guestbookAdd(inviteId, name, message, hadir) {
  const res = await fetch(ENDPOINTS.gbAdd, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteId, name, message, hadir })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Gagal kirim buku tamu");
  return data;
}

async function guestbookList(inviteId) {
  const res = await fetch(`${ENDPOINTS.gbList}?inviteId=${encodeURIComponent(inviteId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Gagal load buku tamu");
  return data;
}

/* =========================
   EXPORT untuk undangan.html
========================= */
window.__INVITE_API__ = {
  ENDPOINTS,
  toMapsEmbed,
  guestbookAdd,
  guestbookList,
};