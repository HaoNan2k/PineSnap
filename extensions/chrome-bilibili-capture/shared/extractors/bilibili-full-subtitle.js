(() => {
  const root = globalThis.PineSnapBilibiliCapture;
  const runtime = root.runtime;

  const PROVIDER = "bilibili_full_subtitle_v1";
  const CID_SOURCE_EMBEDDED = "embedded";
  const CID_SOURCE_PAGELIST_API = "pagelist_api";

  function pickSubtitleTracks(video, apiResult) {
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
          if (!url) return null;
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
    if (url.startsWith("//")) return `https:${url}`;
    return url;
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
      return {
        ok: false,
        code: "MISSING_VIDEO_CONTEXT",
      };
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

    const fallbackCid = await resolveCidViaPagelistApi(ctx, {
      bvid,
      aid,
      page,
    });
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

    return {
      ok: false,
      code: "MISSING_CID",
      bvid,
      aid,
      page,
    };
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

      lines.push({
        startMs,
        startLabel,
        text,
      });
    }

    return lines;
  }

  async function run(ctx) {
    try {
      const identity = await resolveVideoIdentity(ctx);
      if (!identity.ok) {
        return {
          ok: false,
          provider: PROVIDER,
          code: identity.code,
          diagnostics: {
            provider: PROVIDER,
            bvid: identity.bvid ?? null,
            aid: identity.aid ?? null,
            page: identity.page ?? null,
          },
        };
      }

      let tracks = pickSubtitleTracks(ctx.video, null);
      let subtitleSource = "embedded";
      let loginRequired = false;
      let loginMid = null;

      if (tracks.length === 0) {
        const apiResult = await loadTracksFromApi(ctx, identity);
        tracks = pickSubtitleTracks(ctx.video, apiResult);
        subtitleSource = "player_api";
        loginRequired = Boolean(apiResult?.data?.need_login_subtitle);
        loginMid = apiResult?.data?.login_mid ?? null;
      }

      if (tracks.length === 0) {
        return {
          ok: false,
          provider: PROVIDER,
          code: loginRequired ? "SUBTITLE_REQUIRES_LOGIN" : "NO_SUBTITLE_TRACK",
          diagnostics: {
            provider: PROVIDER,
            cidSource: identity.cidSource,
            loginRequired,
            loginMid,
          },
        };
      }

      const track = chooseTrack(tracks);
      const subtitlePayload = await ctx.fetchJson(track.url);
      const lines = normalizeTranscriptLines(subtitlePayload);

      if (lines.length === 0) {
        return {
          ok: false,
          provider: PROVIDER,
          code: "SUBTITLE_FETCH_FAILED",
        };
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
        },
      };
    } catch (error) {
      return {
        ok: false,
        provider: PROVIDER,
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
    priority: 10,
    run,
  };
})();
