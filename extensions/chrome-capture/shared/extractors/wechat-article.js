(() => {
  const root = globalThis.PineSnapCapture;
  const PROVIDER = "wechat_article_v1";
  const URL_PATTERN = /^https?:\/\/mp\.weixin\.qq\.com\/s/;

  const NOISY_SELECTORS = [
    "#js_pc_qr_code",
    "#js_pc_qr_code_img",
    ".rich_media_extra",
    ".rich_media_tool",
    "#js_profile_qrcode",
    "#wx_stream_article_slide_tip",
    "#js_top_ad_area",
    ".reward_area",
    "#js_bottom_ad_area",
    ".rich_media_area_extra",
  ];

  function matches(url) {
    return URL_PATTERN.test(url || "");
  }

  function getDefuddle() {
    const d = globalThis.PineSnapDefuddle;
    if (!d || typeof d.Defuddle !== "function") {
      throw new Error("Defuddle bundle not loaded");
    }
    return d.Defuddle;
  }

  /** 复制一份 document 用于清洗，避免污染当前页 DOM。 */
  function cloneDocument(doc) {
    const html = doc.documentElement.outerHTML;
    return new DOMParser().parseFromString(html, "text/html");
  }

  /** 从公众号 DOM 拉作者 / 发布时间 / 封面（在 cleanup 之前调用，meta 标签可能被 Defuddle 移走）。*/
  function extractWeChatMetadata(doc) {
    const author =
      doc.querySelector("#js_name")?.textContent?.trim() ||
      doc.querySelector(".rich_media_meta_nickname")?.textContent?.trim() ||
      doc.querySelector('meta[name="author"]')?.getAttribute("content") ||
      undefined;

    const publishedAt =
      doc.querySelector("#publish_time")?.textContent?.trim() ||
      doc.querySelector("em#publish_time")?.textContent?.trim() ||
      doc.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ||
      undefined;

    const cover =
      doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
      undefined;

    return { author, publishedAt, cover };
  }

  async function extract(ctx) {
    try {
      const generic = root.extractors.generic_article_v1;
      if (!generic?._internals) {
        throw new Error("generic_article_v1 extractor not registered");
      }

      const cleaned = cloneDocument(ctx.document);
      const meta = extractWeChatMetadata(cleaned);

      // 公众号专用 cleanup：补图、去尾部推荐 / 二维码块、拍平 section 嵌套
      const cleanup = root.domCleanup;
      const lazyTouched = cleanup.expandLazyImages(cleaned);
      const removed = cleanup.removeSelectors(cleaned, NOISY_SELECTORS);
      const flattened = cleanup.normalizeSections(cleaned);

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

      // 公众号 author / publishedAt / cover 通常比 Defuddle 抽到的更准
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
          platform: "wechat",
          diagnostics: {
            provider: PROVIDER,
            wechatHooks: {
              lazyImagesTouched: lazyTouched,
              noisyNodesRemoved: removed,
              sectionsFlattened: flattened,
            },
          },
        }
      );
      // 覆盖 captureDiagnostics.provider 为 wechat（buildArticlePayload 默认是 generic）
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
      extractWeChatMetadata,
      cloneDocument,
      NOISY_SELECTORS,
    },
  };
})();
