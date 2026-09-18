export class IdesussRadioEngine extends EventTarget {
  constructor({ initialVolume = 0.7, crossOrigin = null } = {}) {
    super();
    this.audio = new Audio();
    this.audio.preload = "none";
    if (crossOrigin) this.audio.crossOrigin = crossOrigin;
    this.audio.volume = this.#clamp(initialVolume);
    this.audio.playsInline = true;

    this.station = null;
    this.hls = null;
    this.resumeVolume = this.audio.volume;
    this.callBaselineVolume = null;
    this.fadeTimer = null;

    this.#forwardMediaEvents();
    this.#setupMediaSessionActions();
  }

  #clamp(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0.7;
    return Math.min(1, Math.max(0, numeric));
  }

  #emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  #forwardMediaEvents() {
    this.audio.addEventListener("loadstart", () => this.#emit("state", { state: "loading" }));
    this.audio.addEventListener("canplay", () => this.#emit("state", { state: "ready" }));
    this.audio.addEventListener("stalled", () => this.#emit("state", { state: "stalled" }));
    this.audio.addEventListener("play", () => {
      this.#setMediaSessionPlaybackState("playing");
      this.#emit("state", { state: "playing" });
    });
    this.audio.addEventListener("pause", () => {
      this.#setMediaSessionPlaybackState("paused");
      this.#emit("state", { state: "paused" });
    });
    this.audio.addEventListener("waiting", () => this.#emit("state", { state: "buffering" }));
    this.audio.addEventListener("playing", () => this.#emit("state", { state: "playing" }));
    this.audio.addEventListener("ended", () => this.#emit("state", { state: "ended" }));
    this.audio.addEventListener("volumechange", () => this.#emit("volume", { volume: this.audio.volume, muted: this.audio.muted }));
    this.audio.addEventListener("error", () => {
      const code = this.audio.error?.code || null;
      this.#emit("error", { code, message: "A rádió stream lejátszása nem sikerült." });
    });
  }

  #setupMediaSessionActions() {
    if (!("mediaSession" in navigator)) return;

    const handlers = {
      play: () => this.play().catch((error) => this.#emit("error", { code: error.message, message: "A lejátszás nem indítható." })),
      pause: () => this.pause(),
      stop: () => this.stop()
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    });
  }

  #syncMediaSessionMetadata() {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const artwork = this.station?.artwork ? [{ src: this.station.artwork }] : [];
    try {
      navigator.mediaSession.metadata = this.station
        ? new MediaMetadata({
            title: this.station.name,
            artist: "Idesüss Radio",
            album: this.station.info || "Élő rádió",
            artwork
          })
        : null;
    } catch {}
  }

  #setMediaSessionPlaybackState(state) {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch {}
  }

  async #loadHlsLibrary() {
    if (window.Hls) return window.Hls;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-idesuss-hls]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js";
      script.async = true;
      script.dataset.idesussHls = "true";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
    return window.Hls;
  }

  async #attachSource(url, streamType = "auto") {
    this.#destroyHls();
    const declaredType = String(streamType || "auto").toLowerCase();
    const isHls = declaredType === "hls" || /\.m3u8(?:$|\?)/i.test(url);

    if (!isHls || this.audio.canPlayType("application/vnd.apple.mpegurl")) {
      this.audio.src = url;
      this.audio.load();
      return;
    }

    const Hls = await this.#loadHlsLibrary();
    if (!Hls?.isSupported?.()) throw new Error("HLS_NOT_SUPPORTED");

    this.hls = new Hls({ enableWorker: true, lowLatencyMode: true });
    this.hls.attachMedia(this.audio);
    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => this.hls.loadSource(url));
    this.hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data?.fatal) this.#emit("error", { code: data.type || "HLS_FATAL", message: "A HLS stream megszakadt." });
    });
  }

  #destroyHls() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  async selectStation(station) {
    if (!station?.id || !station?.name) throw new Error("INVALID_STATION");
    this.station = { ...station };
    this.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.#syncMediaSessionMetadata();
    this.#emit("station", { station: this.station });

    if (station.streamUrl) {
      this.#emit("state", { state: "loading" });
      await this.#attachSource(station.streamUrl, station.streamType);
    } else {
      this.#emit("state", { state: "unconfigured" });
    }
  }

  async play() {
    if (!this.station) throw new Error("NO_STATION");
    if (!this.station.streamUrl) throw new Error("STREAM_NOT_CONFIGURED");
    await this.audio.play();
  }

  pause() { this.audio.pause(); }

  stop() {
    this.audio.pause();
    try { this.audio.currentTime = 0; } catch {}
    this.#setMediaSessionPlaybackState("none");
    this.#emit("state", { state: "stopped" });
  }

  toggle() {
    return this.audio.paused ? this.play() : (this.pause(), Promise.resolve());
  }

  setVolume(value) {
    const next = this.#clamp(value);
    this.audio.volume = next;
    if (next > 0 && this.callBaselineVolume === null) this.resumeVolume = next;
    return next;
  }

  getVolume() { return this.audio.volume; }

  async fadeTo(target, durationMs = 700) {
    const destination = this.#clamp(target);
    const start = this.audio.volume;
    const duration = Math.max(0, Number(durationMs) || 0);
    if (this.fadeTimer) cancelAnimationFrame(this.fadeTimer);
    if (!duration) { this.audio.volume = destination; return; }

    const started = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        this.audio.volume = this.#clamp(start + (destination - start) * progress);
        if (progress < 1) this.fadeTimer = requestAnimationFrame(step);
        else { this.fadeTimer = null; resolve(); }
      };
      this.fadeTimer = requestAnimationFrame(step);
    });
  }

  rememberPreInterruptionVolume() {
    if (this.callBaselineVolume === null) {
      this.callBaselineVolume = this.audio.volume;
      this.resumeVolume = this.callBaselineVolume;
    }
    return this.callBaselineVolume;
  }

  async duckForRinging() {
    const base = this.rememberPreInterruptionVolume();
    await this.fadeTo(base * 0.25, 180);
  }

  async muteForCall() {
    this.rememberPreInterruptionVolume();
    await this.fadeTo(0, 180);
  }

  async restoreAfterCall() {
    const base = this.#clamp(this.callBaselineVolume ?? this.resumeVolume);
    await this.fadeTo(base * 0.75, 350);
    await this.fadeTo(base, 900);
    this.resumeVolume = base;
    this.callBaselineVolume = null;
  }

  cancelCallInterruption() {
    const base = this.callBaselineVolume;
    this.callBaselineVolume = null;
    if (base !== null) {
      this.resumeVolume = this.#clamp(base);
      return this.resumeVolume;
    }
    return this.resumeVolume;
  }

  destroy() {
    this.pause();
    this.#destroyHls();
    if (this.fadeTimer) cancelAnimationFrame(this.fadeTimer);
    this.audio.removeAttribute("src");
    this.audio.load();
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      } catch {}
    }
  }
}
