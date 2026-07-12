// ============================================================
// form.js — Logic Form Laporan Sarpras
// ============================================================


var selectKelas = document.getElementById("kelas");
if (selectKelas) {
  DAFTAR_KELAS.forEach(function (k) {
    var opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    selectKelas.appendChild(opt);
  });
}

var selectTingkat = document.getElementById("tingkat");
if (selectTingkat) {
  DAFTAR_TINGKAT.forEach(function (t) {
    var opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    selectTingkat.appendChild(opt);
  });
}


var fotoTerkompresi = null; // { base64, mimeType, sizeKB, fileName }


var uploadBox     = document.getElementById("uploadBox");
var uploadInput   = document.getElementById("uploadInput");
var uploadPreview = document.getElementById("uploadPreview");
var uploadProgress= document.getElementById("uploadProgress");

function showAlert(pesan, tipe) {
  tipe = tipe || "success";
  var box = document.getElementById("alertBox");
  if (!box) return;
  box.textContent = pesan;
  box.className = "alert alert--" + tipe + " alert--show";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (tipe !== "info") {
    setTimeout(function () { box.className = "alert"; }, 5000);
  }
}

function resetUploadBox() {
  fotoTerkompresi = null;
  if (uploadInput) uploadInput.value = "";
  if (uploadPreview) uploadPreview.innerHTML = "";
  if (uploadProgress) uploadProgress.textContent = "";
  if (uploadBox) uploadBox.querySelector(".upload-box__label").style.display = "block";
}

async function prosesFileGambar(file) {
  var v = validasiFileGambar(file);
  if (!v.valid) {
    showAlert(v.message, "error");
    return;
  }

  if (uploadProgress) uploadProgress.textContent = "Mengompres gambar...";
  if (uploadBox) uploadBox.querySelector(".upload-box__label").style.display = "none";

  try {
    var hasil = await kompresGambar(file);
    fotoTerkompresi = {
      base64: hasil.base64,
      mimeType: hasil.mimeType,
      sizeKB: hasil.sizeKB,
      fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpg"
    };

    if (uploadPreview) {
      uploadPreview.innerHTML =
        '<div class="upload-preview">' +
          '<img src="data:' + hasil.mimeType + ';base64,' + hasil.base64 + '" alt="Preview foto">' +
          '<button type="button" class="upload-preview__remove" onclick="resetUploadBox()">&times;</button>' +
        '</div>';
    }
    if (uploadProgress) {
      uploadProgress.textContent = "✓ Siap dikirim (" + hasil.sizeKB + " KB)";
    }
  } catch (err) {
    showAlert("Gagal memproses gambar: " + err.message, "error");
    resetUploadBox();
  }
}

if (uploadBox && uploadInput) {
  uploadBox.addEventListener("click", function (e) {
    if (e.target.closest(".upload-preview__remove")) return;
    uploadInput.click();
  });

  uploadInput.addEventListener("change", function () {
    if (uploadInput.files && uploadInput.files[0]) {
      prosesFileGambar(uploadInput.files[0]);
    }
  });

  
  ["dragover", "dragenter"].forEach(function (evt) {
    uploadBox.addEventListener(evt, function (e) {
      e.preventDefault();
      uploadBox.classList.add("upload-box--dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    uploadBox.addEventListener(evt, function (e) {
      e.preventDefault();
      uploadBox.classList.remove("upload-box--dragover");
    });
  });
  uploadBox.addEventListener("drop", function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) prosesFileGambar(file);
  });
}


var formSarpras = document.getElementById("formSarpras");
if (formSarpras) {
  formSarpras.addEventListener("submit", async function (e) {
    e.preventDefault();

    var nama     = document.getElementById("namaLengkap").value.trim();
    var kelas    = document.getElementById("kelas").value;
    var lokasi   = document.getElementById("lokasi").value.trim();
    var tingkat  = document.getElementById("tingkat").value;
    var kritik   = document.getElementById("kritik").value.trim();
    var saran    = document.getElementById("saran").value.trim();
    var btn      = document.getElementById("btnKirim");

    if (!nama)    return showAlert("Nama lengkap wajib diisi.", "error");
    if (!kelas)   return showAlert("Kelas / unit wajib dipilih.", "error");
    if (!lokasi)  return showAlert("Lokasi/ruangan wajib diisi.", "error");
    if (!tingkat) return showAlert("Tingkat kerusakan wajib dipilih.", "error");
    if (!kritik)  return showAlert("Kritik wajib diisi.", "error");
    if (!saran)   return showAlert("Saran wajib diisi.", "error");
    if (!fotoTerkompresi) return showAlert("Foto kondisi wajib diunggah.", "error");

    btn.disabled = true;
    btn.textContent = "Mengirim...";

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "submit",
          nama_lengkap: nama,
          kelas: kelas,
          lokasi: lokasi,
          tingkat: tingkat,
          kritik: kritik,
          saran: saran,
          foto_base64: fotoTerkompresi.base64,
          foto_mime: fotoTerkompresi.mimeType,
          foto_nama: fotoTerkompresi.fileName
        })
      });

      var data = await res.json();

      if (data.success) {
        showAlert("✅ Laporan berhasil dikirim! Terima kasih atas partisipasimu.", "success");
        formSarpras.reset();
        resetUploadBox();
      } else {
        showAlert(data.message || "Gagal mengirim laporan.", "error");
      }
    } catch (err) {
      showAlert("Terjadi kesalahan jaringan. Coba lagi.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Kirim Laporan";
    }
  });
}