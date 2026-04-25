(() => {
  const root = globalThis.PineSnapCapture;
  const runtime = root.runtime;

  const PROVIDER = "bilibili_full_subtitle_v1";
  const CID_SOURCE_EMBEDDED = "embedded";
  const CID_SOURCE_PAGELIST_API = "pagelist_api";
  const MAX_TRACK_API_ATTEMPTS = 3;
  const TRACK_API_BACKOFF_MS = [250, 700];

  const URL_PATTERN = /^https:\/\/www\.bilibili\.com\/video\//;

  // -------- bilibili-specific runtime helpers (内聚自原 runtime.js) --------

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

  function readEmbeddedJson(doc, variableName) {
    const scripts = doc.scripts;
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
    return runtime.normalizeText(
      String(title || "").replace(/_哔哩哔哩_bilibili.*$/i, "")
    );
  }

  function resolveCidFromInitialState(initialState, page) {
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

  function getVideoContext(doc, urlOverride) {
    const url = urlOverride || (typeof location !== "undefined" ? location.href : "");
    const page = parsePageNumber(url);
    const initialState = readEmbeddedJson(doc, "__INITIAL_STATE__");
    const playinfo = readEmbeddedJson(doc, "__playinfo__");

    const video = {
      url,
      page,
      bvid: initialState?.bvid || parseBvid(url),
      aid: initialState?.aid || initialState?.videoData?.aid,
      cid: resolveCidFromInitialState(initialState, page),
      title:
        stripBilibiliTitle(initialState?.videoData?.title) ||
        stripBilibiliTitle(doc.title),
      initialState,
      playinfo,
    };

    return { ...video, id: buildVideoId(video) };
  }

  // -------- subtitle extraction --------

  function pickSubtitleCandidates(video, apiResult) {
    const candidates = [
      video.playinfo?.data?.subtitle?.subtitles,
      video.playinfo?.subtitle?.subtitles,
      video.playinfo?.result?.subtitle?.subtitles,
      video.initialState?.videoData?.subtitle?.list,
      apiResult?.data?.subtitle?.subtitles,
      apiResult?.subtitle?.subtitles,
    ];

    for (const value of candidates) {
      if (!Array.isArray(value)) continue;
      const tracks = value
        .map((item) => {
          const url = item?.subtitle_url || item?.subtitleUrl || item?.url;
          return {
            id: item.id ?? item.subtitle_id ?? null,
            language: item.lan_doc || item.lang || item.lan || undefined,
            languageCode: item.lan || item.lang || undefined,
            url: normalizeTrackUrl(url),
          };
        })
        .filter(Boolean);
      if (tracks.length > 0) return tracks;
    }

    return [];
  }

  function normalizeTrackUrl(url) {
    if (typeof url !== "string" || url.length === 0) return "";
    if (url.startsWith("//")) return `https:${url}`;
    return url;
  }

  function buildTrackKey(track) {
    if (!track) return null;
    const id = track.id == null ? "na" : String(track.id);
    const language = String(track.languageCode || track.language || "na");
    return `${id}|${language}`;
  }

  function normalizeTrackSample(track, attempt, trackCount) {
    const trackKey = buildTrackKey(track);
    return {
      attempt,
      selectedTrackId: track?.id ?? null,
      selectedLanguage: track?.languageCode || track?.language || null,
      hasUrl: Boolean(track?.url),
      trackCount,
      trackKey,
    };
  }

  function chooseTrack(tracks) {
    const preferred = tracks.find((track) =>
      /^(zh|zh-CN|zh-Hans)$/i.test(track.languageCode || "")
    );
    if (preferred) return preferred;
    const chinese = tracks.find((track) =>
      /中文|汉语|普通话|字幕/i.test(track.language || "")
    );
    return chinese || tracks[0];
  }

  async function loadTracksFromApi(ctx, args) {
    const { bvid, aid, cid } = args;
    if (!cid || (!bvid && !aid)) return null;
    const params = new URLSearchParams({ cid: String(cid) });
    if (bvid) params.set("bvid", bvid);
    if (aid) params.set("aid", String(aid));
    return ctx.fetchJson(`https://api.bilibili.com/x/player/v2?${params.toString()}`);
  }

  async function resolveStableTrackViaApi(ctx, identity) {
    let loginRequired = false;
    let loginMid = null;
    const samples = [];
    const keyVotes = new Map();
    const keyTrackWithUrl = new Map();

    for (let attempt = 1; attempt <= MAX_TRACK_API_ATTEMPTS; attempt += 1) {
      const apiResult = await loadTracksFromApi(ctx, identity);
      loginRequired = Boolean(apiResult?.data?.need_login_subtitle);
      loginMid = apiResult?.data?.login_mid ?? null;

      const candidates = pickSubtitleCandidates(ctx.video, apiResult);
      const selected = chooseTrack(candidates);
      const sample = normalizeTrackSample(selected, attempt, candidates.length);
      samples.push(sample);

      if (sample.trackKey) {
        const nextVotes = (keyVotes.get(sample.trackKey) || 0) + 1;
        keyVotes.set(sample.trackKey, nextVotes);
        if (sample.hasUrl) {
          keyTrackWithUrl.set(sample.trackKey, selected);
        }
        if (nextVotes >= 2 && keyTrackWithUrl.has(sample.trackKey)) {
          return {
            ok: true,
            track: keyTrackWithUrl.get(sample.trackKey),
            trackCount: candidates.length,
            loginRequired,
            loginMid,
            trackResolution: {
              strategy: "majority_vote_v1",
              attemptCount: attempt,
              resolvedBy: "early_consensus",
              resolvedTrackKey: sample.trackKey,
              resolvedVotes: nextVotes,
              samples,
            },
          };
        }
      }

      if (attempt < MAX_TRACK_API_ATTEMPTS) {
        const backoff = TRACK_API_BACKOFF_MS[attempt - 1] ?? TRACK_API_BACKOFF_MS.at(-1) ?? 500;
        await runtime.sleep(backoff);
      }
    }

    let winningKey = null;
    let winningVotes = 0;
    for (const [key, votes] of keyVotes.entries()) {
      if (votes > winningVotes) {
        winningVotes = votes;
        winningKey = key;
      }
    }

    if (winningKey && winningVotes >= 2 && keyTrackWithUrl.has(winningKey)) {
      return {
        ok: true,
        track: keyTrackWithUrl.get(winningKey),
        trackCount: samples.at(-1)?.trackCount ?? 0,
        loginRequired,
        loginMid,
        trackResolution: {
          strategy: "majority_vote_v1",
          attemptCount: samples.length,
          resolvedBy: "majority",
          resolvedTrackKey: winningKey,
          resolvedVotes: winningVotes,
          samples,
        },
      };
    }

    return {
      ok: false,
      code: loginRequired ? "SUBTITLE_REQUIRES_LOGIN" : "SUBTITLE_TRACK_UNSTABLE",
      loginRequired,
      loginMid,
      trackResolution: {
        strategy: "majority_vote_v1",
        attemptCount: samples.length,
        resolvedBy: "none",
        samples,
      },
    };
  }

  async function resolveCidViaPagelistApi(ctx, args) {
    const { bvid, aid, page } = args;
    if (!bvid && !aid) return null;
    const params = new URLSearchParams();
    if (bvid) params.set("bvid", bvid);
    if (aid) params.set("aid", String(aid));
    const apiResult = await ctx.fetchJson(
      `https://api.bilibili.com/x/player/pagelist?${params.toString()}`
    );
    const pages = Array.isArray(apiResult?.data) ? apiResult.data : [];
    if (pages.length === 0) return null;
    const pageNo = Number.isInteger(page) && page > 0 ? page : 1;
    const matched =
      pages.find((item) => Number(item?.page) === pageNo) ||
      pages[pageNo - 1] ||
      pages[0];
    const cid = Number(matched?.cid);
    return Number.isFinite(cid) && cid > 0 ? cid : null;
  }

  async function resolveVideoIdentity(ctx) {
    const bvid = ctx.video?.bvid || null;
    const aid = ctx.video?.aid || null;
    const page = ctx.video?.page || 1;

    if (!bvid && !aid) {
      return { ok: false, code: "MISSING_VIDEO_CONTEXT" };
    }

    const embeddedCid = Number(ctx.video?.cid);
    if (Number.isFinite(embeddedCid) && embeddedCid > 0) {
      return {
        ok: true,
        bvid,
        aid,
        page,
        cid: embeddedCid,
        cidSource: CID_SOURCE_EMBEDDED,
      };
    }

    const fallbackCid = await resolveCidViaPagelistApi(ctx, { bvid, aid, page });
    if (fallbackCid) {
      return {
        ok: true,
        bvid,
        aid,
        page,
        cid: fallbackCid,
        cidSource: CID_SOURCE_PAGELIST_API,
      };
    }

    return { ok: false, code: "MISSING_CID", bvid, aid, page };
  }

  function normalizeTranscriptLines(payload) {
    const body = Array.isArray(payload?.body) ? payload.body : [];
    const lines = [];
    const seen = new Set();

    for (const item of body) {
      const text = runtime.normalizeText(item?.content);
      if (!text) continue;
      const from = Number(item?.from);
      const startMs = Number.isFinite(from)
        ? Math.max(0, Math.round(from * 1000))
        : undefined;
      const startLabel = startMs !== undefined ? runtime.formatStartLabel(startMs) : undefined;
      const key = `${startMs ?? "na"}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({ startMs, startLabel, text });
    }
    return lines;
  }

  function extractMediaCandidates(playinfo) {
    const audio =
      playinfo?.data?.dash?.audio || playinfo?.result?.dash?.audio || [];
    if (!Array.isArray(audio) || audio.length === 0) return [];
    return audio
      .filter((a) => typeof (a?.baseUrl || a?.base_url) === "string")
      .map((a) => ({
        kind: "audio",
        url: a.baseUrl || a.base_url,
        mimeType: a.mimeType || a.mime_type || "audio/mp4",
        bitrateKbps:
          typeof a.bandwidth === "number" ? Math.round(a.bandwidth / 1000) : undefined,
      }));
  }

  // -------- 视频型 payload 组装（从原 registry buildPayload 搬入）--------

  function buildSubtitlePayload(video, result) {
    const transcript = result.content?.transcript;
    const summary = result.content?.summary;

    return {
      version: 1,
      sourceType: "bilibili",
      artifact: {
        kind: "official_subtitle",
        format: "cue_lines",
        content: {
          transcript,
          summary,
        },
        isPrimary: true,
      },
      metadata: {
        platform: "bilibili",
        id: video.id,
        url: video.url,
        title: video.title || undefined,
        captureDiagnostics: {
          provider: result.provider,
          transcriptLineCount: transcript?.lines?.length ?? 0,
          summaryChapterCount: summary?.chapters?.length ?? 0,
          ...result.diagnostics,
        },
      },
    };
  }

  function buildAsrFallbackPayload(video, code, attempts) {
    const candidates = extractMediaCandidates(video.playinfo);
    return {
      version: 1,
      sourceType: "bilibili",
      // 不带 artifact，jobType 推断为 audio_transcribe，进 worker 队列
      mediaCandidates: candidates,
      accessContext: {
        referer: "https://www.bilibili.com/",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      },
      metadata: {
        platform: "bilibili",
        id: video.id,
        url: video.url,
        title: video.title || undefined,
        captureDiagnostics: {
          subtitleFailCode: code,
          attempts,
          asrFallback: true,
          mediaCandidateCount: candidates.length,
        },
      },
    };
  }

  // -------- entry --------

  function matches(url) {
    return URL_PATTERN.test(url || "");
  }

  async function extract(ctx) {
    const video = getVideoContext(
      ctx?.document || (typeof document !== "undefined" ? document : null),
      ctx?.url
    );
    const result = await runSubtitle({
      video,
      fetchJson: ctx.fetchJson,
    });

    if (result.ok) {
      return {
        ok: true,
        provider: PROVIDER,
        payload: buildSubtitlePayload(video, result),
      };
    }

    return {
      ok: false,
      provider: PROVIDER,
      code: result.code,
      diagnostics: result.diagnostics,
      // 失败时也带 video，供 content.js 决策 ASR fallback payload
      meta: {
        videoId: video.id,
        videoUrl: video.url,
        videoTitle: video.title,
        playinfo: video.playinfo,
      },
    };
  }

  async function runSubtitle(ctx) {
    try {
      const identity = await resolveVideoIdentity(ctx);
      if (!identity.ok) {
        return {
          ok: false,
          code: identity.code,
          diagnostics: {
            provider: PROVIDER,
            bvid: identity.bvid ?? null,
            aid: identity.aid ?? null,
            page: identity.page ?? null,
          },
        };
      }

      let tracks = pickSubtitleCandidates(ctx.video, null).filter((item) => Boolean(item.url));
      let subtitleSource = "embedded";
      let loginRequired = false;
      let loginMid = null;
      let trackResolution = null;
      let track = null;

      if (tracks.length === 0) {
        const resolved = await resolveStableTrackViaApi(ctx, identity);
        subtitleSource = "player_api";
        loginRequired = resolved.loginRequired;
        loginMid = resolved.loginMid;
        trackResolution = resolved.trackResolution;

        if (!resolved.ok) {
          return {
            ok: false,
            code: resolved.code,
            diagnostics: {
              provider: PROVIDER,
              cidSource: identity.cidSource,
              loginRequired,
              loginMid,
              trackResolution,
            },
          };
        }
        track = resolved.track;
        tracks = track ? [track] : [];
      }

      if (tracks.length === 0) {
        return {
          ok: false,
          code: loginRequired ? "SUBTITLE_REQUIRES_LOGIN" : "NO_SUBTITLE_TRACK",
          diagnostics: {
            provider: PROVIDER,
            cidSource: identity.cidSource,
            loginRequired,
            loginMid,
            trackResolution,
          },
        };
      }

      if (!track) track = chooseTrack(tracks);
      if (!track?.url) {
        return {
          ok: false,
          code: "SUBTITLE_TRACK_UNSTABLE",
          diagnostics: {
            provider: PROVIDER,
            cidSource: identity.cidSource,
            loginRequired,
            loginMid,
            trackResolution,
          },
        };
      }

      const subtitlePayload = await ctx.fetchJson(track.url);
      const lines = normalizeTranscriptLines(subtitlePayload);

      if (lines.length === 0) {
        return { ok: false, code: "SUBTITLE_FETCH_FAILED" };
      }

      return {
        ok: true,
        provider: PROVIDER,
        content: {
          transcript: {
            provider: PROVIDER,
            language: track.languageCode || track.language,
            lines,
          },
        },
        diagnostics: {
          provider: PROVIDER,
          subtitleSource,
          cidSource: identity.cidSource,
          cid: identity.cid,
          loginRequired,
          loginMid,
          selectedLanguage: track.languageCode || track.language || null,
          selectedTrackId: track.id,
          lineCount: lines.length,
          trackCount: tracks.length,
          trackResolution,
        },
      };
    } catch (error) {
      return {
        ok: false,
        code: "SUBTITLE_FETCH_FAILED",
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
    // 暴露给测试 / content.js 用
    _internals: {
      getVideoContext,
      buildSubtitlePayload,
      buildAsrFallbackPayload,
      extractMediaCandidates,
    },
  };
})();
