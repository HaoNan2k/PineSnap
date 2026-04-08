(() => {
  const root =
    globalThis.PineSnapBilibiliCapture ||
    (globalThis.PineSnapBilibiliCapture = {});

  function normalizeText(value) {
    return String(value || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
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

  function parseJsonAssignment(source, variableName) {
    const patterns = [
      new RegExp(`window\\.${variableName}\\s*=`, "g"),
      new RegExp(`${variableName}\\s*=`, "g"),
    ];

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const jsonStart = (match.index || 0) + match[0].length;
        const parsed = extractJsonLiteral(source, jsonStart);
        if (!parsed) continue;
        try {
          return JSON.parse(parsed);
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  function extractJsonLiteral(source, offset) {
    let index = offset;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== "{" && source[index] !== "[") return null;

    const stack = [source[index]];
    let inString = false;
    let escaped = false;

    for (let i = index + 1; i < source.length; i += 1) {
      const char = source[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === '"') inString = false;
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "{" || char === "[") {
        stack.push(char);
        continue;
      }

      if (char === "}" || char === "]") {
        const last = stack[stack.length - 1];
        const matches =
          (last === "{" && char === "}") || (last === "[" && char === "]");
        if (!matches) return null;
        stack.pop();
        if (stack.length === 0) return source.slice(index, i + 1);
      }
    }

    return null;
  }

  function readEmbeddedJson(variableName) {
    const scripts = document.scripts;
    for (const script of scripts) {
      const text = script.textContent || "";
      if (!text.includes(variableName)) continue;
      const parsed = parseJsonAssignment(text, variableName);
      if (parsed) return parsed;
    }
    return null;
  }

  function parseBvid(url) {
    const match = /\/video\/(BV[0-9A-Za-z]+)/.exec(url);
    return match ? match[1] : undefined;
  }

  function parsePageNumber(url) {
    try {
      const value = new URL(url).searchParams.get("p");
      if (!value) return 1;
      const page = Number(value);
      return Number.isInteger(page) && page > 0 ? page : 1;
    } catch {
      return 1;
    }
  }

  function stripBilibiliTitle(title) {
    return normalizeText(String(title || "").replace(/_哔哩哔哩_bilibili.*$/i, ""));
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

  function resolveCid(initialState, page) {
    const pages = initialState?.videoData?.pages;
    if (Array.isArray(pages)) {
      const current = pages.find((item) => item?.page === page) || pages[page - 1];
      if (current?.cid) return current.cid;
    }

    const bvid = initialState?.bvid;
    const cidMap = bvid ? initialState?.cidMap?.[bvid]?.cids : null;
    const mapEntry = cidMap?.[String(page)];
    if (mapEntry?.cid) return mapEntry.cid;

    return initialState?.cid || initialState?.videoData?.cid;
  }

  function buildVideoId(video) {
    if (!video.bvid) return undefined;
    return video.page > 1 ? `${video.bvid}#p=${video.page}` : video.bvid;
  }

  function getVideoContext() {
    const url = location.href;
    const page = parsePageNumber(url);
    const initialState = readEmbeddedJson("__INITIAL_STATE__");
    const playinfo = readEmbeddedJson("__playinfo__");

    const video = {
      url,
      page,
      bvid: initialState?.bvid || parseBvid(url),
      aid: initialState?.aid || initialState?.videoData?.aid,
      cid: resolveCid(initialState, page),
      title:
        stripBilibiliTitle(initialState?.videoData?.title) ||
        stripBilibiliTitle(document.title),
      initialState,
      playinfo,
    };

    return {
      ...video,
      id: buildVideoId(video),
    };
  }

  root.runtime = {
    normalizeText,
    sleep,
    waitFor,
    readEmbeddedJson,
    parseBvid,
    parsePageNumber,
    stripBilibiliTitle,
    formatStartLabel,
    getVideoContext,
  };
})();
