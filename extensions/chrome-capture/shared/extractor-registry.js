(() => {
  const root = globalThis.PineSnapCapture;

  /**
   * @typedef {Object} ArtifactPayload
   * @property {"extracted_text"|"official_subtitle"|"asr_transcript"} kind
   * @property {"markdown"|"cue_lines"|"json"} format
   * @property {object} content
   * @property {boolean} [isPrimary]
   */

  /**
   * @typedef {Object} ExtractorPayload
   * @property {number} version
   * @property {string} sourceType
   * @property {ArtifactPayload} [artifact]
   * @property {Array<{kind: string, url: string, mimeType?: string, bitrateKbps?: number}>} [mediaCandidates]
   * @property {{referer?: string, userAgent?: string}} [accessContext]
   * @property {{platform?: string, id?: string, url?: string, title?: string, captureDiagnostics?: object}} metadata
   */

  /**
   * @typedef {Object} ExtractorContext
   * @property {string} url
   * @property {Document} document
   * @property {(url: string, options?: object) => Promise<any>} fetchJson
   */

  /**
   * @typedef {Object} ExtractorResult
   * @property {boolean} ok
   * @property {string} provider
   * @property {ExtractorPayload} [payload]
   * @property {string} [code]
   * @property {object} [diagnostics]
   * @property {object} [meta]
   */

  /**
   * @typedef {Object} Extractor
   * @property {string} provider
   * @property {(url: string) => boolean} matches
   * @property {(ctx: ExtractorContext) => Promise<ExtractorResult>} extract
   */

  // 错误码集中。content.js 只通过 isFallbackable 判断终态分支。
  const ERROR_CODES = Object.freeze({
    // 终态（不可恢复）
    MISSING_VIDEO_CONTEXT: "MISSING_VIDEO_CONTEXT",
    MISSING_CID: "MISSING_CID",
    NOT_AN_ARTICLE: "NOT_AN_ARTICLE",
    // 可降级（视频字幕失败 → ASR；文章抽取失败 → 提示用户）
    NO_SUBTITLE_TRACK: "NO_SUBTITLE_TRACK",
    SUBTITLE_TRACK_UNSTABLE: "SUBTITLE_TRACK_UNSTABLE",
    SUBTITLE_FETCH_FAILED: "SUBTITLE_FETCH_FAILED",
    SUBTITLE_REQUIRES_LOGIN: "SUBTITLE_REQUIRES_LOGIN",
    EXTRACT_EMPTY: "EXTRACT_EMPTY",
    EXTRACT_BLOCKED: "EXTRACT_BLOCKED",
  });

  // 视频字幕失败码 → 可触发 ASR fallback
  const ASR_FALLBACKABLE = new Set([
    ERROR_CODES.NO_SUBTITLE_TRACK,
    ERROR_CODES.SUBTITLE_TRACK_UNSTABLE,
    ERROR_CODES.SUBTITLE_FETCH_FAILED,
    ERROR_CODES.SUBTITLE_REQUIRES_LOGIN,
    ERROR_CODES.MISSING_CID,
  ]);

  /** 给定错误码是否可被 fallback（视频走 ASR；文章型暂无 fallback 但留接口）*/
  function isFallbackable(code) {
    return ASR_FALLBACKABLE.has(code);
  }

  /**
   * 已注册的 extractor 按 URL 命中顺序排列。命中顺序就是优先级。
   * 站点专用先于通用。
   */
  const SITE_ADAPTERS = [
    "bilibili_full_subtitle_v1",
    "youtube_subtitle_v1",
    "wechat_article_v1",
    "zhihu_answer_v1",
  ];
  const GENERIC_FALLBACK = "generic_article_v1";

  /** @returns {Extractor | null} */
  function pickExtractor(url) {
    const all = root.extractors || {};
    for (const provider of SITE_ADAPTERS) {
      const ext = all[provider];
      if (ext && typeof ext.matches === "function" && ext.matches(url)) {
        return ext;
      }
    }
    return all[GENERIC_FALLBACK] || null;
  }

  /**
   * @param {ExtractorContext} ctx
   * @returns {Promise<ExtractorResult>}
   */
  async function run(ctx) {
    const extractor = pickExtractor(ctx.url);
    if (!extractor) {
      return {
        ok: false,
        provider: "none",
        code: ERROR_CODES.NOT_AN_ARTICLE,
        diagnostics: { reason: "no_extractor_registered_for_url", url: ctx.url },
      };
    }
    return extractor.extract(ctx);
  }

  root.registry = {
    pickExtractor,
    run,
    SITE_ADAPTERS,
    GENERIC_FALLBACK,
    ERROR_CODES,
    isFallbackable,
  };
})();
