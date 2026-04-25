(() => {
  const root = globalThis.PineSnapCapture;
  const PROVIDER = "zhihu_answer_v1";

  // 答案页：https://www.zhihu.com/question/12345/answer/67890
  // 专栏：    https://zhuanlan.zhihu.com/p/123456
  // 想法：    https://www.zhihu.com/pin/123  (本期不支持)
  const URL_PATTERNS = [
    /^https?:\/\/(www\.)?zhihu\.com\/question\/\d+\/answer\/\d+/,
    /^https?:\/\/zhuanlan\.zhihu\.com\/p\/\d+/,
  ];

  const NOISY_SELECTORS = [
    ".RichContent-actions",
    ".ContentItem-actions",
    ".AnchorContainer",
    ".RichContent-EntityWord",
    ".RecommendItem",
    ".Recommendations-Main",
    ".Card-Side",
    ".AnswerForm",
    ".CornerButtons",
    ".Question-sideColumn",
    ".css-1m041wn", // 推广卡片，css class hash 可能变，按需更新
    "[role='ad']",
    "ins.adsbygoogle",
  ];

  function matches(url) {
    return URL_PATTERNS.some((pattern) => pattern.test(url || ""));
  }

  function getDefuddle() {
    const d = globalThis.PineSnapDefuddle;
    if (!d || typeof d.Defuddle !== "function") {
      throw new Error("Defuddle bundle not loaded");
    }
    return d.Defuddle;
  }

  function cloneDocument(doc) {
    const html = doc.documentElement.outerHTML;
    return new DOMParser().parseFromString(html, "text/html");
  }

  /** 答案页 / 专栏页的作者 / 发布时间 / 赞同数。 */
  function extractZhihuMetadata(doc, url) {
    const isZhuanlan = /zhuanlan\.zhihu\.com/.test(url || "");

    const author = isZhuanlan
      ? doc.querySelector(".AuthorInfo-name a")?.textContent?.trim() ||
        doc.querySelector('meta[name="author"]')?.getAttribute("content")
      : doc.querySelector(".AuthorInfo .UserLink-link")?.textContent?.trim() ||
        doc.querySelector(".AuthorInfo-name")?.textContent?.trim();

    const publishedAt =
      doc.querySelector('meta[itemprop="datePublished"]')?.getAttribute("content") ||
      doc.querySelector("time")?.getAttribute("datetime") ||
      doc.querySelector(".ContentItem-time span")?.textContent?.trim() ||
      undefined;

    const cover =
      doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
      doc.querySelector(".TitleImage")?.getAttribute("src") ||
      undefined;

    const voteText =
      doc.querySelector(".VoteButton--up")?.getAttribute("aria-label") ||
      doc.querySelector(".VoteButton--up")?.textContent ||
      "";
    const voteMatch = voteText.match(/(\d+(?:[,，.]\d+)?)/);
    const voteCount = voteMatch ? Number(voteMatch[1].replace(/[,，]/g, "")) : undefined;

    return { author, publishedAt, cover, voteCount };
  }

  /** 知乎折叠按钮："查看全部内容" / "展开阅读全文" 等。本测不交互，仅尽力保留可见正文。 */
  function expandFoldedAnswer(doc) {
    let expanded = 0;
    // 通常折叠态会用 max-height + overflow 配合 button。直接移除"展开"按钮父容器的 collapsed 类。
    const collapsedAnswers = doc.querySelectorAll(".RichContent--unescapable.is-collapsed");
    for (const node of collapsedAnswers) {
      node.classList.remove("is-collapsed");
      expanded += 1;
    }
    const collapsedRichContent = doc.querySelectorAll(".RichContent.is-collapsed");
    for (const node of collapsedRichContent) {
      node.classList.remove("is-collapsed");
      expanded += 1;
    }
    return expanded;
  }

  async function extract(ctx) {
    try {
      const generic = root.extractors.generic_article_v1;
      if (!generic?._internals) {
        throw new Error("generic_article_v1 extractor not registered");
      }

      const cleaned = cloneDocument(ctx.document);
      const meta = extractZhihuMetadata(cleaned, ctx.url);

      const cleanup = root.domCleanup;
      const lazyTouched = cleanup.expandLazyImages(cleaned);
      const expanded = expandFoldedAnswer(cleaned);
      const removed = cleanup.removeSelectors(cleaned, NOISY_SELECTORS);

      const Defuddle = getDefuddle();
      const defuddle = new Defuddle(cleaned, { markdown: true, url: ctx.url });
      const result = defuddle.parse();
      const markdown = String(result.contentMarkdown || result.content || "").trim();

      if (markdown.length < generic._internals.MIN_MARKDOWN_LENGTH) {
        return {
          ok: false,
          provider: PROVIDER,
          code: root.registry.ERROR_CODES.EXTRACT_EMPTY,
          diagnostics: { provider: PROVIDER, markdownLength: markdown.length },
        };
      }

      const enrichedResult = {
        ...result,
        author: meta.author || result.author,
        published: meta.publishedAt || result.published,
        image: meta.cover || result.image,
      };

      const snapshot = generic._internals.snapshotSourceHtml(ctx.document);
      const payload = generic._internals.buildArticlePayload(
        { ...ctx, document: cleaned },
        enrichedResult,
        snapshot,
        {
          platform: "zhihu",
          diagnostics: {
            provider: PROVIDER,
            voteCount: meta.voteCount,
            zhihuHooks: {
              lazyImagesTouched: lazyTouched,
              foldedExpanded: expanded,
              noisyNodesRemoved: removed,
            },
          },
        }
      );
      payload.metadata.captureDiagnostics.provider = PROVIDER;

      return { ok: true, provider: PROVIDER, payload };
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
      extractZhihuMetadata,
      expandFoldedAnswer,
      cloneDocument,
      NOISY_SELECTORS,
    },
  };
})();
