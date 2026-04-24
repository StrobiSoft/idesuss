

async function addPost() {
  const text = newPostInput.value.trim();

  if (!text) {
    showToast("Írj valamit", "error");
    return;
  }

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    showToast("Belépés szükséges", "error");
    return;
  }

  const { error } = await supabaseClient
    .from("posts")
    .insert([{ text, user_id: user.id }]);

  if (error) {
    showToast("Poszt hiba", "error");
    setStatus("HIBA: " + error.message);
    return;
  }

  newPostInput.value = "";
  showToast("Poszt mentve", "success");
  await loadPosts();
}