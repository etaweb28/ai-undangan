const API = "https://dry-mud-3b8ai-undangan-api.etaweb90.workers.dev";

let lastInvite = null;

// kompres foto biar kecil (biar aman disimpan di KV)
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
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

function applyOverrides(invite) {
  const loc = document.getElementById("overrideLocation").value.trim();
  const maps = document.getElementById("overrideMaps").value.trim();
  const date = document.getElementById("overrideDate").value.trim();
  const times = document.getElementById("overrideTimes").value.trim();

  if (loc) { invite.venue = loc; invite.address = loc; invite.maps_query = loc; }
  if (maps) { invite.maps_query = maps; }
  if (date) { invite.date = date; }
  if (times) {
    // sederhana: jika user nulis “Akad 09.00, Resepsi 11.00”
    invite.akad_time = times.includes("Akad") ? times : `Akad: ${times}`;
    invite.resepsi_time = times.includes("Resepsi") ? times : `Resepsi: ${times}`;
  }
  // update full_text biar konsisten
  invite.full_text =
`${invite.title}
Mempelai:
- ${invite.groom}
- ${invite.bride}

Tanggal: ${invite.date}
${invite.akad_time}
${invite.resepsi_time}

Lokasi: ${invite.venue}
Alamat: ${invite.address}

Cerita:
${invite.story}

${invite.closing}`;
  return invite;
}

async function generateAI() {
  const text = document.getElementById("inputText").value.trim();
  const output = document.getElementById("result");

  if (!text) return alert("Tulis dulu rencana pernikahanmu.");

  output.textContent = "⏳ Membuat undangan…";

  try {
    const res = await fetch(API + "/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();

    if (!data.success) {
      output.textContent = "❌ Generate gagal: " + (data.error || "");
      return;
    }

    lastInvite = applyOverrides(data.invite);
    output.textContent = lastInvite.full_text;

  } catch (e) {
    output.textContent = "❌ Tidak bisa terhubung ke AI";
  }
}

async function saveAndOpen() {
  if (!lastInvite) return alert("Generate dulu.");

  const music = document.getElementById("musicSelect").value;

  // foto mempelai
  const groomFile = document.getElementById("groomPhoto").files[0];
  const brideFile = document.getElementById("bridePhoto").files[0];
  const galleryFiles = [...document.getElementById("galleryPhotos").files].slice(0, 10);

  const photos = {};
  try {
    if (groomFile) photos.groom = await fileToSmallDataURL(groomFile);
    if (brideFile) photos.bride = await fileToSmallDataURL(brideFile);
    if (galleryFiles.length) {
      photos.gallery = [];
      for (const f of galleryFiles) photos.gallery.push(await fileToSmallDataURL(f, 1100, 0.75));
    }
  } catch {
    // kalau gagal kompres, lanjut tanpa foto
  }

  const payload = {
    invite: lastInvite,
    aiText: lastInvite.full_text,
    music,
    photos
  };

  const res = await fetch(API + "/invite/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (!data.success) return alert("Gagal menyimpan undangan");

  window.location.href = `undangan.html?id=${data.id}`;
}
