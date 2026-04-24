function showToast(message, type = "info") {
  toastBox.textContent = message;
  toastBox.className = "toast " + type;
  clearTimeout(toastTimer);

  requestAnimationFrame(() => {
    toastBox.classList.add("show");
  });

  toastTimer = setTimeout(() => {
    toastBox.classList.remove("show");
  }, 2500);
}

function clearMessages() {
  loginError.textContent = "";
  loginSuccess.textContent = "";
  registerError.textContent = "";
  registerSuccess.textContent = "";
  resetError.textContent = "";
  resetSuccess.textContent = "";
}

function showView(viewName) {
  authChoiceView.classList.add("hidden");
  loginView.classList.add("hidden");
  registerView.classList.add("hidden");
  resetView.classList.add("hidden");

  if (viewName === "choice") authChoiceView.classList.remove("hidden");
  if (viewName === "login") loginView.classList.remove("hidden");
  if (viewName === "register") registerView.classList.remove("hidden");
  if (viewName === "reset") resetView.classList.remove("hidden");
}

function setStatus(lines) {
  statusBox.textContent = Array.isArray(lines) ? lines.join("\n") : lines;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderAvatarHtml(url, emoji, className = "avatar-circle") {
  if (url) {
    return `<div class="${className}"><img src="${escapeHtml(url)}"></div>`;
  }

  return `<div class="${className}">${escapeHtml(emoji || "🙂")}</div>`;
}