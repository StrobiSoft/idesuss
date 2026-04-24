async function init() {
  showView("choice");
  await refreshSession();
  await loadPosts();
  applyLang();
}

window.addEventListener("DOMContentLoaded", init);