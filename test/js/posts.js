async function loadPosts() {
  setStatus("Posztok betöltése...");

  const { data: posts, error: postsError } = await supabaseClient
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (postsError) {
    setStatus("POST HIBA: " + postsError.message);
    return;
  }

  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select("*");

  if (profilesError) {
    setStatus("PROFILE HIBA: " + profilesError.message);
    return;
  }

  const profileMap = {};
  (profiles || []).forEach(profile => {
    profileMap[profile.id] = profile;
  });

  postsBox.innerHTML = "";

  (posts || []).forEach(post => {
    const profile = profileMap[post.user_id] || {};

    const nickname = profile.nickname || ("user_" + String(post.user_id || "unknown").slice(0, 6));
    const avatarEmoji = profile.avatar_emoji || "🙂";

    const date = post.created_at
      ? new Date(post.created_at).toLocaleString("hu-HU")
      : "";

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="post-head">
        <div class="avatar-circle">${escapeHtml(avatarEmoji)}</div>
        <div>
          <div class="post-name">${escapeHtml(nickname)}</div>
          <div class="post-date">${date}</div>
        </div>
      </div>
      <div class="post-text">${escapeHtml(post.text || "")}</div>
    `;

    postsBox.appendChild(card);
  });

  setStatus("Posztok: " + (posts?.length || 0));
}

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