(async function init() {
  showView("choice");
  await refreshSession();
  await loadPosts();
})();