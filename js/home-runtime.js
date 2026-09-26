import { initHomeLanguage } from "./lang/home-language.js?v=20260926-commonhome1";

function homeText(key, fallback = "") {
  const value = window.idesussHomeTranslations?.[key];
  return typeof value === "string" && value ? value : fallback;
}

function updateHeaderClock() {
  const clock = document.getElementById("headerClock");
  if (!clock) return;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  clock.textContent = `${hh}:${mm}`;
}

function buildEmbedUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return "https://www.youtube.com/embed/" + id;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      if (id) return "https://www.youtube.com/embed/" + id;
    }

    return url;
  } catch {
    return url;
  }
}

function applyRuntimeLabels() {
  const closeLabel = homeText("viewerClose", "Close");
  for (const element of [
    document.getElementById("closeViewerBtn"),
    document.getElementById("infoPanelClose")
  ]) {
    if (!element) continue;
    element.setAttribute("aria-label", closeLabel);
    element.setAttribute("title", closeLabel);
  }
}

function initInfoPanels() {
  const infoPanel = document.getElementById("infoPanel");
  const infoPanelTitle = document.getElementById("infoPanelTitle");
  const infoPanelText = document.getElementById("infoPanelText");
  const infoPanelClose = document.getElementById("infoPanelClose");

  function closeInfoPanel() {
    if (!infoPanel) return;
    infoPanel.classList.remove("show");
    infoPanel.setAttribute("aria-hidden", "true");
  }

  function openInfoPanel(type) {
    const data = window.idesussHomeTranslations?.[type];
    if (!data || !infoPanel || !infoPanelTitle || !infoPanelText) return;

    infoPanelTitle.textContent = data.title;
    infoPanelText.textContent = data.text;
    infoPanel.classList.add("show");
    infoPanel.setAttribute("aria-hidden", "false");
  }

  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.id === "loginBtn" || button.id === "registerBtn") return;
      openInfoPanel(button.dataset.panel);
    });
  });

  infoPanelClose?.addEventListener("click", closeInfoPanel);
  infoPanel?.addEventListener("click", (event) => {
    if (event.target === infoPanel) closeInfoPanel();
  });
}

function initMiniViewer() {
  const videoUrl = document.getElementById("videoUrl");
  const openBtn = document.getElementById("openBtn");
  const pasteBtn = document.getElementById("pasteBtn");
  const clearBtn = document.getElementById("clearBtn");
  const viewerShell = document.getElementById("viewerShell");
  const viewerFrame = document.getElementById("viewerFrame");
  const closeViewerBtn = document.getElementById("closeViewerBtn");

  openBtn?.addEventListener("click", () => {
    const rawUrl = videoUrl?.value.trim() || "";
    if (!rawUrl) {
      alert(homeText("emptyVideoLink", "Paste a video link first."));
      return;
    }

    const result = window.IdesussResolver?.cleanVideoUrl?.(rawUrl);
    const finalUrl =
      result?.ok && result.cleanUrl
        ? result.cleanUrl
        : rawUrl;

    if (videoUrl && finalUrl !== rawUrl) videoUrl.value = finalUrl;
    if (!viewerShell || !viewerFrame) return;

    const embedUrl = buildEmbedUrl(finalUrl);
    const separator = embedUrl.includes("?") ? "&" : "?";
    viewerFrame.src = embedUrl + separator + "autoplay=1";
    viewerShell.classList.add("show");
    document.body.classList.add("viewer-open");
  });

  closeViewerBtn?.addEventListener("click", () => {
    viewerShell?.classList.remove("show");
    document.body.classList.remove("viewer-open");
    if (viewerFrame) viewerFrame.src = "";
  });

  pasteBtn?.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (videoUrl) videoUrl.value = text.trim();
    } catch {
      alert(
        homeText(
          "clipboardReadDenied",
          "The browser could not read the clipboard automatically."
        )
      );
    }
  });

  clearBtn?.addEventListener("click", () => {
    if (videoUrl) videoUrl.value = "";
  });
}

function initHomepageShare() {
  const shareBtn = document.getElementById("shareBtn");
  shareBtn?.addEventListener("click", async () => {
    const shareData = {
      title: "Idesüss",
      text: homeText(
        "settingsShareText",
        "Idesüss — simple access to supported public video links."
      ),
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      alert(homeText("settingsLinkCopied", "Link copied."));
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Homepage share failed", error);
      }
    }
  });
}

function handleIncomingLink() {
  const cleanUrl = window.IdesussShareIntake?.resolveIncomingUrl(
    window.location.search
  );
  if (!cleanUrl) return false;

  window.location.href = "/app/?url=" + encodeURIComponent(cleanUrl);
  return true;
}

async function initHomeRuntime() {
  document.getElementById("year").textContent = String(new Date().getFullYear());

  updateHeaderClock();
  window.setInterval(updateHeaderClock, 1000);

  await initHomeLanguage();
  applyRuntimeLabels();

  if (handleIncomingLink()) return;

  initInfoPanels();
  initMiniViewer();
  initHomepageShare();

  window.addEventListener("idesuss:home-language-applied", applyRuntimeLabels);
}

function start() {
  initHomeRuntime().catch((error) => {
    console.error("Home runtime init failed", error);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
