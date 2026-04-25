(() => {
  const root = globalThis.PineSnapCapture;
  const PROVIDER = "generic_article_v1";
  const SOURCE_HTML_MAX_BYTES = 500 * 1024;
  const MIN_MARKDOWN_LENGTH = 50;

  /** 通用兜底 extractor：所有 URL 都匹配，由 registry 决定优先级。*/
  function matches() {
    return true;
  }

  /**
   * 从 globalThis.PineSnapDefuddle 拿 Defuddle 类。bundle 通过 build.mjs 输出，
   * 由 manifest content_scripts 提前加载。
   */
  function getDefuddle() {
    const d = globalThis.PineSnapDefuddle;
    if (!d || typeof d.Defuddle !== "function") {
      throw new Error("Defuddle bundle not loaded (expected globalThis.PineSnapDefuddle.Defuddle)");
    }
    return d.Defuddle;
  }

  /** 把原始 HTML 截断到上限并标注，用于 sourceHtml 字段。 */
  function snapshotSourceHtml(doc) {
    const raw = doc?.documentElement?.outerHTML || "";
    const bytes = new Blob([raw]).size;
    if (bytes <= SOURCE_HTML_MAX_BYTES) {
      return { sourceHtml: raw, truncated: false, bytes };
    }
    // 简单按字符截断（中文偏保守）。Markdown 主体有真实内容，sourceHtml 主要是审计快照。
    const ratio = SOURCE_HTML_MAX_BYTES / bytes;
    const cut = Math.floor(raw.length * ratio);
    return {
      sourceHtml: raw.slice(0, cut) + "\n<!-- TRUNCATED -->",
      truncated: true,
      bytes,
    };
  }

  function buildArticlePayload(ctx, defuddleResult, snapshot, extras) {
    const markdown = String(defuddleResult.contentMarkdown || defuddleResult.content || "").trim();
    const title = String(defuddleResult.title || ctx.document?.title || "").trim();
    return {
      version: 1,
      sourceType: "web_page",
      artifact: {
        kind: "extracted_text",
        format: "markdown",
        content: {
          markdown,
          title,
          author: defuddleResult.author || undefined,
          publishedAt: defuddleResult.published || undefined,
          cover: defuddleResult.image || undefined,
          sourceHtml: snapshot.sourceHtml,
          wordCount: defuddleResult.wordCount || undefined,
        },
        isPrimary: true,
      },
      metadata: {
        platform: extras?.platform || "web_page",
        url: ctx.url,
        title,
        captureDiagnostics: {
          provider: PROVIDER,
          sourceHtmlBytes: snapshot.bytes,
          sourceHtmlTruncated: snapshot.truncated,
          extractorType: defuddleResult.extractorType || "defuddle",
          parseTime: defuddleResult.parseTime,
          domain: defuddleResult.domain,
          ...extras?.diagnostics,
        },
      },
    };
  }

  /**
   * @param {{url: string, document: Document, fetchJson: Function}} ctx
   */
  async function extract(ctx) {
    try {
      const Defuddle = getDefuddle();
      const defuddle = new Defuddle(ctx.document, { markdown: true, url: ctx.url });
      const result = defuddle.parse();
      const markdown = String(result.contentMarkdown || result.content || "").trim();

      if (markdown.length < MIN_MARKDOWN_LENGTH) {
        return {
          ok: false,
          provider: PROVIDER,
          code: root.registry.ERROR_CODES.EXTRACT_EMPTY,
          diagnostics: {
            provider: PROVIDER,
            markdownLength: markdown.length,
            domain: result.domain,
          },
        };
      }

      const snapshot = snapshotSourceHtml(ctx.document);
      return {
        ok: true,
        provider: PROVIDER,
        payload: buildArticlePayload(ctx, result, snapshot),
      };
    } catch (error) {
      return {
        ok: false,
        provider: PROVIDER,
        code: root.registry.ERROR_CODES.EXTRACT_EMPTY,
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
      buildArticlePayload,
      snapshotSourceHtml,
      MIN_MARKDOWN_LENGTH,
      SOURCE_HTML_MAX_BYTES,
    },
  };
})();
