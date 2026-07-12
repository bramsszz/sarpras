// ============================================================
// compress.js — Kompres gambar di browser sebelum dikirim
// Tujuan: hemat storage Drive & mempercepat upload
// ============================================================

/**
 * @param {File} file
 * @param {number} targetKB - target ukuran akhir (default dari config.js)
 * @param {number} maxDimension - dimensi terpanjang maksimum (px)
  @returns {Promise<{base64: string, mimeType: string, sizeKB: number}>}
 */
function kompresGambar(file, targetKB, maxDimension) {
  targetKB = targetKB || (typeof TARGET_COMPRESSED_KB !== "undefined" ? TARGET_COMPRESSED_KB : 600);
  maxDimension = maxDimension || 1600;

  return new Promise(function (resolve, reject) {
    var reader = new FileReader();

    reader.onload = function (e) {
      var img = new Image();

      img.onload = function () {
        var canvas = document.createElement("canvas");
        var w = img.width;
        var h = img.height;

        // Resize kalau lebih besar dari maxDimension
        if (w > h && w > maxDimension) {
          h = Math.round(h * (maxDimension / w));
          w = maxDimension;
        } else if (h >= w && h > maxDimension) {
          w = Math.round(w * (maxDimension / h));
          h = maxDimension;
        }

        canvas.width = w;
        canvas.height = h;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        // Coba beberapa level quality sampai ukuran cukup kecil
        var qualities = [0.8, 0.65, 0.5, 0.35, 0.25, 0.15];
        var result = null;

        for (var i = 0; i < qualities.length; i++) {
          var dataUrl = canvas.toDataURL("image/jpeg", qualities[i]);
          var sizeKB = Math.round((dataUrl.length * 0.75) / 1024);

          if (!result) result = { dataUrl: dataUrl, sizeKB: sizeKB };

          if (sizeKB <= targetKB) {
            result = { dataUrl: dataUrl, sizeKB: sizeKB };
            break;
          }
          result = { dataUrl: dataUrl, sizeKB: sizeKB };
        }

        // Kalau masih kebesaran di quality terendah, kecilkan lagi dimensinya
        if (result.sizeKB > targetKB * 1.8 && maxDimension > 700) {
          kompresGambar(file, targetKB, Math.round(maxDimension * 0.7))
            .then(resolve)
            .catch(reject);
          return;
        }

        var base64Only = result.dataUrl.split(",")[1];
        resolve({
          base64: base64Only,
          mimeType: "image/jpeg",
          sizeKB: result.sizeKB
        });
      };

      img.onerror = function () {
        reject(new Error("Gagal membaca gambar. Pastikan file valid."));
      };

      img.src = e.target.result;
    };

    reader.onerror = function () {
      reject(new Error("Gagal membaca file."));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validasi awal file sebelum dikompres
 */
function validasiFileGambar(file) {
  var maxMB = typeof MAX_FILE_SIZE_MB !== "undefined" ? MAX_FILE_SIZE_MB : 10;
  var validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!validTypes.includes(file.type)) {
    return { valid: false, message: "Format file harus JPG, PNG, atau WEBP." };
  }
  if (file.size > maxMB * 1024 * 1024) {
    return { valid: false, message: "Ukuran file terlalu besar. Maksimal " + maxMB + "MB." };
  }
  return { valid: true };
}