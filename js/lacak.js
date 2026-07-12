// ============================================================
// lacak.js — Lacak Status Laporan Sarpras (publik)
// ============================================================

var STATUS_INFO = {
  "Menunggu": { icon: "⏳", desc: "Laporanmu sudah diterima dan menunggu untuk ditinjau petugas." },
  "Diproses": { icon: "🔧", desc: "Petugas sedang menindaklanjuti laporanmu. Mohon ditunggu." },
  "Selesai":  { icon: "✅", desc: "Kerusakan sudah ditangani. Terima kasih atas laporanmu!" }
};

function showAlert(pesan, tipe) {
  tipe = tipe || "error";
  var box = document.getElementById("alertBox");
  if (!box) return;
  box.textContent = pesan;
  box.className = "alert alert--" + tipe + " alert--show";
}

function hideAlert() {
  var box = document.getElementById("alertBox");
  if (box) box.className = "alert";
}

function escHtml(str) {
  if (str === null || str === undefined || str === "") return "—";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function badgeStatus(status) {
  var map = { "Menunggu": "menunggu", "Diproses": "diproses", "Selesai": "selesai", "Ditolak": "ditolak" };
  return '<span class="badge badge--' + (map[status] || "menunggu") + '">' + escHtml(status) + '</span>';
}

function badgeTingkat(tingkat) {
  var map = { "Ringan": "ringan", "Sedang": "sedang", "Berat": "berat" };
  return '<span class="badge badge--' + (map[tingkat] || "ringan") + '">' + escHtml(tingkat) + '</span>';
}

function renderHasil(d) {
  var info = STATUS_INFO[d.status] || { icon: "📄", desc: "" };
  var el = document.getElementById("lacakResult");
  el.innerHTML =
    '<div class="track-card">' +
      '<div class="track-card__top">' +
        '<div class="track-card__status-icon">' + info.icon + '</div>' +
        '<div class="track-card__status">' + escHtml(d.status) + '</div>' +
        '<div class="track-card__desc">' + escHtml(info.desc) + '</div>' +
      '</div>' +
      '<div class="track-list">' +
        '<div class="track-row"><span class="track-row__key">Kode Laporan</span><span class="track-row__val track-code">' + escHtml(d.kode) + '</span></div>' +
        '<div class="track-row"><span class="track-row__key">Jenis Fasilitas</span><span class="track-row__val">' + escHtml(d.kategori) + '</span></div>' +
        '<div class="track-row"><span class="track-row__key">Lokasi</span><span class="track-row__val">' + escHtml(d.lokasi) + '</span></div>' +
        '<div class="track-row"><span class="track-row__key">Tingkat Kerusakan</span><span class="track-row__val">' + badgeTingkat(d.tingkat) + '</span></div>' +
        '<div class="track-row"><span class="track-row__key">Tanggal Lapor</span><span class="track-row__val">' + escHtml(d.tanggal) + '</span></div>' +
      '</div>' +
    '</div>';
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

var formLacak = document.getElementById("formLacak");
if (formLacak) {
  formLacak.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert();

    var kode = document.getElementById("kodeInput").value.trim().toUpperCase();
    var btn  = document.getElementById("btnLacak");
    var result = document.getElementById("lacakResult");
    result.innerHTML = "";

    if (!kode) return showAlert("Kode laporan wajib diisi.", "error");

    btn.disabled = true;
    btn.textContent = "Mencari...";

    try {
      var res = await fetch(API_URL + "?action=track&kode=" + encodeURIComponent(kode));
      var data = await res.json();

      if (data.success) {
        renderHasil(data.data);
      } else {
        showAlert(data.message || "Kode laporan tidak ditemukan.", "error");
      }
    } catch (err) {
      showAlert("Gagal terhubung ke server. Coba lagi.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Lacak Status";
    }
  });
}
