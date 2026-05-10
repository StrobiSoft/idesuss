/*
  Idesüss Resolver v0.1
  First safe step: clean shared video links and detect platform.
  No backend, no Cobalt, no auth.
*/

function cleanVideoUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") {
    return {
      ok: false,
      error: "EMPTY_URL",
      originalUrl: inputUrl || "",
      cleanUrl: "",
      platform: "unknown"
    };
  }

  const originalUrl = inputUrl.trim();

  try {
    const url = new URL(originalUrl);
    const platform = detectVideoPlatform(url);

    // TikTok
    if (platform === "tiktok") {
      return buildCleanResult(
        originalUrl,
        url.origin + url.pathname,
        platform
      );
    }

    // YouTube
    if (platform === "youtube") {
      const videoId = url.searchParams.get("v");
      const listId = url.searchParams.get("list");

      if (url.hostname.includes("youtu.be")) {
        return buildCleanResult(
          originalUrl,
          "https://youtu.be" + url.pathname,
          platform
        );
      }

      if (videoId && listId) {
        return buildCleanResult(
          originalUrl,
          "https://www.youtube.com/watch?v=" +
            encodeURIComponent(videoId) +
            "&list=" +
            encodeURIComponent(listId),
          platform
        );
      }

      if (videoId) {
        return buildCleanResult(
          originalUrl,
          "https://www.youtube.com/watch?v=" +
            encodeURIComponent(videoId),
          platform
        );
      }

      return buildCleanResult(
        originalUrl,
        url.origin + url.pathname,
        platform
      );
    }

    // Facebook / Instagram
    if (
      platform === "facebook" ||
      platform === "instagram"
    ) {
      return buildCleanResult(
        originalUrl,
        url.origin + url.pathname,
        platform
      );
    }

    stripKnownTrackingParams(url);

    return buildCleanResult(
      originalUrl,
      url.toString(),
      platform
    );

  } catch (error) {
    return {
      ok: false,
      error: "INVALID_URL",
      originalUrl,
      cleanUrl: originalUrl,
      platform: "unknown"
    };
  }
}

function detectVideoPlatform(url) {
  const host = url.hostname
    .replace(/^www\./, "")
    .toLowerCase();

  if (host.includes("tiktok.com")) return "tiktok";
  if (
    host.includes("youtube.com") ||
    host.includes("youtu.be")
  ) return "youtube";

  if (
    host.includes("facebook.com") ||
    host.includes("fb.watch")
  ) return "facebook";

  if (host.includes("instagram.com")) return "instagram";

  if (
    host.includes("x.com") ||
    host.includes("twitter.com")
  ) return "x";

  return "unknown";
}

function stripKnownTrackingParams(url) {
  const trackingParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "igshid",
    "si",
    "feature",
    "share",
    "share_app_id",
    "share_item_id",
    "share_link_id",
    "timestamp",
    "tt_from",
    "u_code",
    "_r",
    "_d",
    "preview_pb",
    "sharer_language",
    "enable_checksum",
    "source",
    "social_share_type",
    "ug_btm",
    "link_reflow_popup_iteration_sharer",
    "sp_root_share_link_id",
    "sp_root_d",
    "sp_level",
    "sp_root_u",
    "user_id",
    "sec_user_id"
  ];

  trackingParams.forEach((param) => {
    url.searchParams.delete(param);
  });
}

function buildCleanResult(
  originalUrl,
  cleanUrl,
  platform
) {
  return {
    ok: true,
    originalUrl,
    cleanUrl,
    platform,
    changed: originalUrl !== cleanUrl
  };
}

// Global access
window.IdesussResolver = {
  cleanVideoUrl,
  detectVideoPlatform
};