// ============================================================
// dashboard.js — Dashboard Admin Sarpras
// ============================================================

var ADMIN_TOKEN = sessionStorage.getItem("sarpras_admin_token");
if (!ADMIN_TOKEN) window.location.href = "admin.html";

var semuaData = [];

function showModal(opts) {
  var overlay = document.getElementById("modalOverlay");
  var iconEl  = document.getElementById("modalIcon");
  var titleEl = document.getElementById("modalTitle");
  var descEl  = document.getElementById("modalDesc");
  var confirmBtn = document.getElementById("modalConfirm");
  var cancelBtn  = document.getElementById("modalCancel");

  iconEl.textContent = opts.icon || "❓";
  titleEl.textContent = opts.title || "Konfirmasi";
  descEl.textContent = opts.desc || "";
  confirmBtn.textContent = opts.confirmText || "Ya, Lanjutkan";
  confirmBtn.className = "modal-btn " + (opts.confirmClass || "modal-btn--confirm");

  overlay.style.display = "flex";

  var newConfirm = confirmBtn.cloneNode(true);
  var newCancel  = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

  newConfirm.addEventListener("click", function () {
    overlay.style.display = "none";
    opts.onConfirm();
  });
  newCancel.addEventListener("click", function () { overlay.style.display = "none"; });
}

function lihatFoto(url) {
  document.getElementById("fotoModalImg").src = url;
  document.getElementById("fotoModalOverlay").style.display = "flex";
}

function logout() {
  showModal({
    icon: "🚪",
    title: "Keluar dari Dashboard?",
    desc: "Kamu akan dikembalikan ke halaman login.",
    confirmText: "Ya, Keluar",
    onConfirm: function () {
      sessionStorage.removeItem("sarpras_admin_token");
      window.location.href = "admin.html";
    }
  });
}

function showTab(nama, el) {
  document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
  document.querySelectorAll(".sidebar__item a").forEach(function (a) { a.classList.remove("active"); });
  document.getElementById("tab-" + nama).classList.add("active");
  if (el) el.classList.add("active");
}

function isiFilter() {
  var fTingkat = document.getElementById("dashFilterTingkat");
  var fStatus  = document.getElementById("dashFilterStatus");
  DAFTAR_TINGKAT.forEach(function (t) {
    var o = document.createElement("option"); o.value = t; o.textContent = t; fTingkat.appendChild(o);
  });
  DAFTAR_STATUS.forEach(function (s) {
    var o = document.createElement("option"); o.value = s; o.textContent = s; fStatus.appendChild(o);
  });
}

function badgeStatus(status) {
  var map = { "Menunggu": "menunggu", "Diproses": "diproses", "Selesai": "selesai", "Ditolak": "ditolak" };
  return '<span class="badge badge--' + (map[status] || "menunggu") + '">' + status + '</span>';
}

function badgeTingkat(tingkat) {
  var map = { "Ringan": "ringan", "Sedang": "sedang", "Berat": "berat" };
  return '<span class="badge badge--' + (map[tingkat] || "ringan") + '">' + tingkat + '</span>';
}

function escapeHtml(str) {
  if (str === null || str === undefined || str === "") return "—";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatTanggal(str) {
  if (!str) return "-";
  str = String(str);
  if (str.includes("/")) return str.split(" ")[0];
  if (str.includes("T")) {
    var d = new Date(str);
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  }
  return str;
}

function renderTable(data) {
  var tbody = document.getElementById("tableBody");
  var empty = document.getElementById("tableEmpty");
  var counter = document.getElementById("dashCounter");
  var wrapper = document.querySelector(".table-wrapper");
  var mobileCards = document.getElementById("mobileCards");

  tbody.innerHTML = "";
  mobileCards.innerHTML = "";

  if (!data.length) {
    wrapper.style.display = "none";
    mobileCards.style.display = "";
    empty.style.display = "block";
    counter.textContent = "";
    return;
  }

  wrapper.style.display = "block";
  mobileCards.style.display = "";
  empty.style.display = "none";
  counter.textContent = "Menampilkan " + data.length + " laporan";

  data.forEach(function (item) {
    var statusOpts = DAFTAR_STATUS.map(function (s) {
      return "<option value='" + s + "'" + (s === item.status ? " selected" : "") + ">" + s + "</option>";
    }).join("");

    var fotoImg = item.foto_url
      ? "<img class='thumb' src='" + item.foto_url + "' onclick=\"lihatFoto('" + item.foto_url + "')\" alt='Foto laporan'>"
      : "—";

    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + fotoImg + "</td>" +
      "<td><strong>" + escapeHtml(item.nama_lengkap) + "</strong><br><span style='font-size:0.78rem;color:var(--gray-400);'>" + escapeHtml(item.kelas) + "</span></td>" +
      "<td>" + escapeHtml(item.lokasi) + "</td>" +
      "<td>" + badgeTingkat(item.tingkat) + "</td>" +
      "<td class='hide-md'><div class='cell-text'>" + escapeHtml(item.kritik) + "</div></td>" +
      "<td class='hide-md'><div class='cell-text'>" + escapeHtml(item.saran) + "</div></td>" +
      "<td><select class='action-select' onchange='ubahStatus(\"" + item.id + "\", this.value, this)'>" + statusOpts + "</select></td>" +
      "<td class='hide-md' style='white-space:nowrap;font-size:0.82rem;'>" + formatTanggal(item.tanggal) + "</td>" +
      "<td><button class='btn-delete' onclick='hapusLaporan(\"" + item.id + "\", this)'>Hapus</button></td>";
    tbody.appendChild(tr);

    var card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML =
      "<div class='m-card__header'>" +
        "<span class='m-card__kelas'>" + escapeHtml(item.lokasi) + "</span>" +
        badgeStatus(item.status) +
      "</div>" +
      (item.foto_url ? "<img class='thumb' style='width:100%;height:140px;margin-bottom:10px;' src='" + item.foto_url + "' onclick=\"lihatFoto('" + item.foto_url + "')\">" : "") +
      "<div class='m-card__nama'>👤 " + escapeHtml(item.nama_lengkap) + " (" + escapeHtml(item.kelas) + ")</div>" +
      "<div style='margin-bottom:6px;'>" + badgeTingkat(item.tingkat) + "</div>" +
      "<div class='m-card__label'>Kritik</div><div class='m-card__text'>" + escapeHtml(item.kritik) + "</div>" +
      "<div class='m-card__label'>Saran</div><div class='m-card__text'>" + escapeHtml(item.saran) + "</div>" +
      "<div class='m-card__footer'>" +
        "<span class='m-card__tanggal'>📅 " + formatTanggal(item.tanggal) + "</span>" +
        "<div class='m-card__actions'>" +
          "<select class='action-select' onchange='ubahStatus(\"" + item.id + "\", this.value, this)'>" + statusOpts + "</select>" +
          "<button class='btn-delete' onclick='hapusLaporan(\"" + item.id + "\", this)'>Hapus</button>" +
        "</div>" +
      "</div>";
    mobileCards.appendChild(card);
  });
}

function filterTable() {
  var tingkat = document.getElementById("dashFilterTingkat").value;
  var status  = document.getElementById("dashFilterStatus").value;
  var hasil = semuaData.filter(function (item) {
    if (tingkat && item.tingkat !== tingkat) return false;
    if (status && item.status !== status) return false;
    return true;
  });
  renderTable(hasil);
}

async function ubahStatus(id, newStatus, selectEl) {
  var lamaStatus = semuaData.find(function (d) { return String(d.id) === String(id); }).status;
  selectEl.disabled = true;

  var doUpdate = async function () {
    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "updateStatus", id: id, status: newStatus, token: ADMIN_TOKEN })
      });
      var data = await res.json();
      if (data.success) {
        if (newStatus === "Ditolak") {
          
          semuaData = semuaData.filter(function (d) { return String(d.id) !== String(id); });
          filterTable();
        } else {
          var item = semuaData.find(function (d) { return String(d.id) === String(id); });
          if (item) item.status = newStatus;
        }
        renderStats(semuaData);
      } else {
        alert("Gagal mengubah status: " + data.message);
        selectEl.value = lamaStatus;
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
      selectEl.value = lamaStatus;
    } finally {
      selectEl.disabled = false;
    }
  };

  if (newStatus === "Ditolak") {
    showModal({
      icon: "🗑️",
      title: "Tolak Laporan Ini?",
      desc: "Laporan dan foto akan dihapus permanen secara otomatis dan tidak bisa dikembalikan.",
      confirmText: "Ya, Tolak & Hapus",
      confirmClass: "modal-btn--danger",
      onConfirm: doUpdate
    });
  } else {
    doUpdate();
  }
}

function hapusLaporan(id, btn) {
  showModal({
    icon: "🗑️",
    title: "Hapus Laporan?",
    desc: "Laporan dan foto ini akan dihapus permanen dan tidak bisa dikembalikan.",
    confirmText: "Ya, Hapus",
    confirmClass: "modal-btn--danger",
    onConfirm: function () { doHapus(id, btn); }
  });
}

async function doHapus(id, btn) {
  btn.disabled = true;
  btn.textContent = "...";
  try {
    var res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "delete", id: id, token: ADMIN_TOKEN })
    });
    var data = await res.json();
    if (data.success) {
      semuaData = semuaData.filter(function (d) { return String(d.id) !== String(id); });
      filterTable();
      renderStats(semuaData);
    } else {
      alert("Gagal menghapus: " + data.message);
      btn.disabled = false; btn.textContent = "Hapus";
    }
  } catch (err) {
    alert("Terjadi kesalahan jaringan.");
    btn.disabled = false; btn.textContent = "Hapus";
  }
}

function renderStats(data) {
  var total     = data.length;
  var menunggu  = data.filter(function (d) { return d.status === "Menunggu"; }).length;
  var diproses  = data.filter(function (d) { return d.status === "Diproses"; }).length;
  var selesai   = data.filter(function (d) { return d.status === "Selesai"; }).length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statMenunggu").textContent = menunggu;
  document.getElementById("statDiproses").textContent = diproses;
  document.getElementById("statSelesai").textContent = selesai;

  
  var tingkatCounts = DAFTAR_TINGKAT.map(function (t) {
    return { label: t, count: data.filter(function (d) { return d.tingkat === t; }).length };
  });
  var tingkatColors = { "Ringan": "#0d9488", "Sedang": "#d97706", "Berat": "#dc2626" };
  renderHbar("hbarTingkat", tingkatCounts, function (item) { return tingkatColors[item.label] || "#0d9488"; });

  
  var statusCounts = DAFTAR_STATUS.map(function (s) {
    return { label: s, count: data.filter(function (d) { return d.status === s; }).length };
  });
  var statusColors = { "Menunggu": "#9ca3af", "Diproses": "#2563eb", "Selesai": "#0d9488", "Ditolak": "#dc2626" };
  renderHbar("hbarStatus", statusCounts, function (item) { return statusColors[item.label] || "#9ca3af"; });
}

function renderHbar(containerId, items, colorFn) {
  var max = Math.max.apply(null, items.map(function (i) { return i.count; }).concat([1]));
  var el = document.getElementById(containerId);
  el.innerHTML = "";
  items.forEach(function (item) {
    var pct = Math.round((item.count / max) * 100);
    var div = document.createElement("div");
    div.className = "hbar-item";
    div.innerHTML =
      "<span class='hbar-item__label'>" + item.label + "</span>" +
      "<div class='hbar-item__track'><div class='hbar-item__fill' style='width:" + pct + "%; background:" + colorFn(item) + ";'></div></div>" +
      "<span class='hbar-item__count'>" + item.count + "</span>";
    el.appendChild(div);
  });
}

async function loadData() {
  var loading = document.getElementById("globalLoading");
  loading.style.display = "flex";

  try {
    var res = await fetch(API_URL + "?action=getAll&token=" + encodeURIComponent(ADMIN_TOKEN));
    var data = await res.json();

    if (!data.success) {
      if (data.message === "Akses ditolak.") {
        sessionStorage.removeItem("sarpras_admin_token");
        window.location.href = "admin.html";
        return;
      }
      throw new Error(data.message);
    }

    semuaData = data.data || [];
    document.getElementById("lastUpdated").textContent = "Terakhir diperbarui: " + new Date().toLocaleTimeString("id-ID");

    renderStats(semuaData);
    filterTable();
  } catch (err) {
    alert("Gagal memuat data: " + err.message);
  } finally {
    loading.style.display = "none";
  }
}

isiFilter();
loadData();