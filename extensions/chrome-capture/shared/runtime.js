(() => {
  const root =
    globalThis.PineSnapCapture || (globalThis.PineSnapCapture = {});

  function normalizeText(value) {
    return String(value || "")
      .replace(/[​-‍﻿]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitFor(read, options) {
    const timeoutMs = options?.timeoutMs ?? 8000;
    const intervalMs = options?.intervalMs ?? 150;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const value = read();
      if (value) return value;
      await sleep(intervalMs);
    }
    return null;
  }

  function formatStartLabel(startMs) {
    if (!Number.isFinite(startMs) || startMs < 0) return undefined;
    const totalSeconds = Math.floor(startMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return [hours, minutes, seconds]
        .map((part) => String(part).padStart(2, "0"))
        .join(":");
    }
    return [minutes, seconds]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  root.runtime = {
    normalizeText,
    sleep,
    waitFor,
    formatStartLabel,
  };
})();
