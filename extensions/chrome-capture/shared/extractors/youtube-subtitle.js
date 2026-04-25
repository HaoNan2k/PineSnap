(() => {
  const root = globalThis.PineSnapCapture;
  const runtime = root.runtime;

  const PROVIDER = "youtube_subtitle_v1";
  const URL_PATTERN = /^https?:\/\/(www\.)?youtube\.com\/watch/;

  function matches(url) {
    return URL_PATTERN.test(url || "");
  }

  /** 从 YouTube 页面读取 ytInitialPlayerResponse 嵌入 JSON，结构类似 B 站 __INITIAL_STATE__。 */
  function readInitialPlayerResponse(doc) {
    const scripts = doc.scripts;
    for (const script of scripts) {
      const text = script.textContent || "";
      if (!text.includes("ytInitialPlayerResponse")) continue;
      // 匹配 var ytInitialPlayerResponse = {...};
      const match = /ytInitialPlayerResponse\s*=\s*(\{)/.exec(text);
      if (!match) continue;
      const start = match.index + match[0].length - 1;
      const json = extractJsonLiteral(text, start);
      if (!json) continue;
      try {
        return JSON.parse(json);
      } catch {
        continue;
      }
    }
    return null;
  }

  function extractJsonLiteral(source, offset) {
    let index = offset;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== "{") return null;

    const stack = ["{"];
    let inString = false;
    let escaped = false;
    for (let i = index + 1; i < source.length; i += 1) {
      const ch = source[i];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") {
        const last = stack[stack.length - 1];
        const ok = (last === "{" && ch === "}") || (last === "[" && ch === "]");
        if (!ok) return null;
        stack.pop();
        if (stack.length === 0) return source.slice(index, i + 1);
      }
    }
    return null;
  }

  function getCaptionTracks(playerResponse) {
    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks)) return [];
    return tracks
      .filter((t) => typeof t?.baseUrl === "string")
      .map((t) => ({
        baseUrl: t.baseUrl,
        languageCode: t.languageCode,
        kind: t.kind, // "asr" 表示自动生成
        name: t.name?.simpleText || t.name?.runs?.[0]?.text || undefined,
      }));
  }

  /** 优先级：手动 zh-Hans > zh > zh-CN > 手动 en > 自动 zh > 自动 en > 第一条。 */
  function chooseTrack(tracks) {
    const langOrder = [
      (t) => t.kind !== "asr" && /^zh(-Hans)?$/i.test(t.languageCode || ""),
      (t) => t.kind !== "asr" && /^zh-CN$/i.test(t.languageCode || ""),
      (t) => t.kind !== "asr" && /^zh/i.test(t.languageCode || ""),
      (t) => t.kind !== "asr" && /^en/i.test(t.languageCode || ""),
      (t) => /^zh/i.test(t.languageCode || ""),
      (t) => /^en/i.test(t.languageCode || ""),
    ];
    for (const predicate of langOrder) {
      const found = tracks.find(predicate);
      if (found) return found;
    }
    return tracks[0] || null;
  }

  /** YouTube timedtext 默认返回 XML：<text start="1.2" dur="2.0">...</text>。 */
  function parseTimedTextXml(xml) {
    const lines = [];
    if (typeof xml !== "string" || !xml.includes("<text")) return lines;
    const seen = new Set();
    const regex = /<text\s+start="([^"]+)"(?:\s+dur="[^"]*")?[^>]*>([\s\S]*?)<\/text>/g;
    let match;
    while ((match = regex.exec(xml))) {
      const startSec = Number(match[1]);
      if (!Number.isFinite(startSec)) continue;
      const startMs = Math.max(0, Math.round(startSec * 1000));
      const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, "")).trim();
      if (!text) continue;
      const key = `${startMs}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({
        startMs,
        startLabel: runtime.formatStartLabel(startMs),
        text,
      });
    }
    return lines;
  }

  function decodeHtmlEntities(s) {
    return s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#10;/g, "\n");
  }

  function videoIdFromUrl(url) {
    try {
      return new URL(url).searchParams.get("v") || undefined;
    } catch {
      return undefined;
    }
  }

  function buildSubtitlePayload(ctx, track, lines, playerResponse) {
    const videoId = videoIdFromUrl(ctx.url);
    const videoDetails = playerResponse?.videoDetails || {};
    return {
      version: 1,
      sourceType: "youtube",
      artifact: {
        kind: "official_subtitle",
        format: "cue_lines",
        content: {
          transcript: {
            provider: PROVIDER,
            language: track.languageCode,
            lines,
          },
        },
        isPrimary: true,
      },
      metadata: {
        platform: "youtube",
        id: videoId,
        url: ctx.url,
        title: videoDetails.title || ctx.document?.title || undefined,
        captureDiagnostics: {
          provider: PROVIDER,
          videoId,
          channelId: videoDetails.channelId,
          author: videoDetails.author,
          lengthSeconds: videoDetails.lengthSeconds
            ? Number(videoDetails.lengthSeconds)
            : undefined,
          selectedLanguage: track.languageCode,
          selectedKind: track.kind || "manual",
          lineCount: lines.length,
        },
      },
    };
  }

  /** YouTube timedtext URL 是用户粒度签名的，用 background fetch 透传需要 text/xml 解析。*/
  async function fetchTimedText(ctx, baseUrl) {
    // 默认 baseUrl 不带 fmt 参数返回 XML（最稳）。如果想要 JSON 可以 append fmt=json3。
    const sep = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${sep}fmt=srv1`;
    return ctx.fetchJson(url, { responseType: "text" });
  }

  async function extract(ctx) {
    try {
      const playerResponse = readInitialPlayerResponse(
        ctx.document || (typeof document !== "undefined" ? document : null)
      );
      if (!playerResponse) {
        return {
          ok: false,
          provider: PROVIDER,
          code: root.registry.ERROR_CODES.MISSING_VIDEO_CONTEXT,
          diagnostics: { provider: PROVIDER, reason: "no_player_response" },
        };
      }

      const tracks = getCaptionTracks(playerResponse);
      if (tracks.length === 0) {
        return {
          ok: false,
          provider: PROVIDER,
          code: root.registry.ERROR_CODES.NO_SUBTITLE_TRACK,
          diagnostics: {
            provider: PROVIDER,
            videoId: videoIdFromUrl(ctx.url),
            videoLengthSec: playerResponse.videoDetails?.lengthSeconds,
          },
        };
      }

      const track = chooseTrack(tracks);
      if (!track?.baseUrl) {
        return {
          ok: false,
          provider: PROVIDER,
          code: root.registry.ERROR_CODES.SUBTITLE_TRACK_UNSTABLE,
          diagnostics: { provider: PROVIDER, trackCount: tracks.length },
        };
      }

      const xml = await fetchTimedText(ctx, track.baseUrl);
      const lines = parseTimedTextXml(typeof xml === "string" ? xml : "");
      if (lines.length === 0) {
        return {
          ok: false,
          provider: PROVIDER,
          code: root.registry.ERROR_CODES.SUBTITLE_FETCH_FAILED,
          diagnostics: {
            provider: PROVIDER,
            selectedLanguage: track.languageCode,
            selectedKind: track.kind || "manual",
          },
        };
      }

      return {
        ok: true,
        provider: PROVIDER,
        payload: buildSubtitlePayload(ctx, track, lines, playerResponse),
      };
    } catch (error) {
      return {
        ok: false,
        provider: PROVIDER,
        code: root.registry.ERROR_CODES.SUBTITLE_FETCH_FAILED,
        diagnostics: {
          provider: PROVIDER,
          error: String(error instanceof Error ? error.message : error),
        },
      };
    }
  }

  root.extractors = root.extractors || {};
  root.extractors[PROVIDER] = {
    provider: PROVIDER,
    matches,
    extract,
    _internals: {
      readInitialPlayerResponse,
      getCaptionTracks,
      chooseTrack,
      parseTimedTextXml,
      videoIdFromUrl,
      buildSubtitlePayload,
    },
  };
})();
