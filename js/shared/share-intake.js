(function (global) {
  const FIELDS = Object.freeze(["url", "u", "text", "title"]);
  const URL_RE = /https?:\/\/[^\s]+/i;

  function extractIncomingUrl(search = global.location?.search || "") {
    const params = new URLSearchParams(search);

    for (const field of FIELDS) {
      const raw = String(params.get(field) || "").trim();
      if (!raw) continue;

      const match = raw.match(URL_RE);
      if (match?.[0]) return match[0];
    }

    return "";
  }

  function resolveIncomingUrl(search = global.location?.search || "") {
    const rawUrl = extractIncomingUrl(search);
    if (!rawUrl) return "";

    const resolver = global.IdesussResolver?.cleanVideoUrl;
    if (typeof resolver !== "function") return rawUrl;

    const result = resolver(rawUrl);
    return result?.ok && result.cleanUrl ? result.cleanUrl : rawUrl;
  }

  global.IdesussShareIntake = Object.freeze({
    fields: FIELDS,
    extractIncomingUrl,
    resolveIncomingUrl
  });
})(window);
