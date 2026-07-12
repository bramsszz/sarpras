// ============================================================
// auth.js — Login Admin Sarpras
// ============================================================

if (sessionStorage.getItem("sarpras_admin_token")) {
  window.location.href = "dashboard.html";
}

var toggleBtn = document.getElementById("togglePassword");
var passInput = document.getElementById("password");
if (toggleBtn && passInput) {
  toggleBtn.addEventListener("click", function () {
    var isHidden = passInput.type === "password";
    passInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "🙈" : "👁";
  });
}

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

var formLogin = document.getElementById("formLogin");
if (formLogin) {
  formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert();

    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;
    var btn      = document.getElementById("btnLogin");

    if (!username || !password) return showAlert("Username dan password wajib diisi.");

    btn.disabled = true;
    btn.textContent = "Memeriksa...";

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "login", username: username, password: password })
      });

      var data = await res.json();

      if (data.success && data.token) {
        sessionStorage.setItem("sarpras_admin_token", data.token);
        window.location.href = "dashboard.html";
      } else {
        showAlert(data.message || "Username atau password salah.");
        btn.disabled = false;
        btn.textContent = "Masuk ke Dashboard";
      }
    } catch (err) {
      showAlert("Gagal terhubung ke server. Coba lagi.");
      btn.disabled = false;
      btn.textContent = "Masuk ke Dashboard";
    }
  });
}