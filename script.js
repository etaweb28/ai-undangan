/* ======================================================
   CONFIG
====================================================== */
const WORKER_API =
  "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";

/* ======================================================
   STATE
====================================================== */
let photoGroomBase64 = "";
let photoBrideBase64 = "";

/* ======================================================
   INIT
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  bindFileUpload();
  bindActions();
});

/* ======================================================
   BIND EVENTS
====================================================== */
function bindActions() {
  const btnAI = document.getElementById("btnGenerateAI");
  const btnSave = document.getElementById("btnSaveInvite");

  if (btnAI) btnAI.addEventListener("click", generateAI);
  if (btnSave) btnSave.addEventListener("click", saveInvite);
}

/* ======================================================
   FILE UPLOAD (COMPRESS → BASE64)
====================================================== */
function bindFileUpload() {
  const groomInput = document.getElementById("photoGroom");
  const brideInput = document.getElementById("photoBride");

  if (groomInput) {
    groomInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      photoGroomBase64 = await compressToBase64(file);
      previewImage("prevGroom", photoGroomBase64);
    });
  }

  if (brideInput) {
    brideInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      photoBrideBase64 = await compressToBase64(file);
      previewImage("prevBride", photoBrideBase64);
    });
  }
}

function previewImage(id, src) {
  const img = document.getElementById(id);
  if (img) img.src = src;
}

function compressToBase64(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve("");
    img.src = URL.createObjectURL(file);
  });
}

/* ======================================================
   AI GENERATE (POST ROOT ✔)
====================================================== */
async function generateAI() {
  const input = getVal("aiText");
  const hint = document.getElementById("aiHint");

  if (!input) {
    if (hint) hint.textContent = "❌ Isi prompt terlebih dahulu.";
    return;
  }

  if (hint) hint.textContent = "⏳ Menghasilkan undangan dengan AI...";

  try {
    const res = await fetch(WORKER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });

    const json = await res.json();

    if (!json?.success || !json?.data) {
      if (hint) hint.textContent = "❌ Gagal generate undangan.";
      return;
    }

    const d = json.data;

    setVal("groomName", d.groom);
    setVal("brideName", d.bride);

    setParents("groom", d.groom_parents);
    setParents("bride", d.bride_parents);

    setVal("akadDate", normalizeDate(d.date));
    setVal("resepsiDate", normalizeDate(d.date));

    setVal("akadTime", cleanPrefix(d.akad_time));
    setVal("resepsiTime", cleanPrefix(d.resepsi_time));

    setVal("akadPlace", d.venue);
    setVal("resepsiPlace", d.venue);

    setVal("akadAddress", d.address);
    setVal("resepsiAddress", d.address);

    setVal("mapsQuery", d.maps_query);
    setVal("story", d.story);

    if (hint) hint.textContent = "✅ Berhasil! Cek lalu simpan.";
  } catch (err) {
    if (hint) hint.textContent = "❌ Error saat generate AI.";
  }
}

/* ======================================================
   SAVE INVITE (POST ROOT ✔)
====================================================== */
async function saveInvite() {
  const status = document.getElementById("saveHint");
  if (status) status.textContent = "⏳ Menyimpan undangan...";

  const payload = {
    invite: {
      groom: {
        name: getVal("groomName"),
        father: getVal("groomFather"),
        mother: getVal("groomMother"),
      },
      bride: {
        name: getVal("brideName"),
        father: getVal("brideFather"),
        mother: getVal("brideMother"),
      },
      date: getVal("akadDate"),
      events: {
        akad: {
          date: getVal("akadDate"),
          time: getVal("akadTime"),
          place: getVal("akadPlace"),
          address: getVal("akadAddress"),
        },
        resepsi: {
          date: getVal("resepsiDate"),
          time: getVal("resepsiTime"),
          place: getVal("resepsiPlace"),
          address: getVal("resepsiAddress"),
        },
      },
      mapsQuery: getVal("mapsQuery"),
      story: getVal("story"),
      music: getVal("musicSelect") || "wedding1.mp3",
    },
    photos: {
      groom: photoGroomBase64,
      bride: photoBrideBase64,
    },
  };

  try {
    const res = await fetch(WORKER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!json?.id) {
      if (status) status.textContent = "❌ Gagal menyimpan.";
      return;
    }

    if (status) status.textContent = "✅ Undangan berhasil dibuat!";
    window.location.href = `undangan.html?id=${encodeURIComponent(json.id)}`;
  } catch (err) {
    if (status) status.textContent = "❌ Terjadi kesalahan server.";
  }
}

/* ======================================================
   HELPERS
====================================================== */
function getVal(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function setVal(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setParents(type, text) {
  if (!text) return;
  const match = text.match(/Bapak\s+(.*?)\s+&\s+Ibu\s+(.*)/i);
  if (!match) return;

  if (type === "groom") {
    setVal("groomFather", match[1]);
    setVal("groomMother", match[2]);
  } else {
    setVal("brideFather", match[1]);
    setVal("brideMother", match[2]);
  }
}

function normalizeDate(dateStr) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return dateStr;
}

function cleanPrefix(text) {
  if (!text) return "";
  return text.replace(/Akad Nikah:|Resepsi:/i, "").trim();
}