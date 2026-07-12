(function () {
  var saved = localStorage.getItem("sarpras_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);

  document.addEventListener("DOMContentLoaded", function () {
    updateToggleIcon();
  });
})();

function toggleDarkMode() {
  var current = document.documentElement.getAttribute("data-theme");
  var next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("sarpras_theme", next);
  updateToggleIcon();
}

function updateToggleIcon() {
  var btn = document.getElementById("darkToggleBtn");
  if (!btn) return;
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.textContent = isDark ? "☀️" : "🌙";
  btn.title = isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap";
}