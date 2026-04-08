(() => {
  const root = globalThis.PineSnapBilibiliCapture;
  const DEFAULT_ACTIVE_PROVIDERS = new Set(["bilibili_full_subtitle_v1"]);

  function getExtractors() {
    const extractors = Object.values(root.extractors || {})
      .filter((extractor) => DEFAULT_ACTIVE_PROVIDERS.has(extractor.provider))
      .sort((left, right) => left.priority - right.priority);

    const providers = new Set();
    for (const extractor of extractors) {
      if (providers.has(extractor.provider)) {
        throw new Error(`Duplicate extractor provider: ${extractor.provider}`);
      }
      providers.add(extractor.provider);
    }

    return extractors;
  }

  function buildPayload(ctx, result, attempts) {
    const transcript = result.content?.transcript;
    const summary = result.content?.summary;

    return {
      version: 1,
      metadata: {
        platform: "bilibili",
        id: ctx.video.id,
        url: ctx.video.url,
        title: ctx.video.title || undefined,
        captureDiagnostics: {
          provider: result.provider,
          attempts,
          usedFallback: attempts.length > 1,
          transcriptLineCount: transcript?.lines?.length ?? 0,
          summaryChapterCount: summary?.chapters?.length ?? 0,
          ...result.diagnostics,
        },
      },
      content: {
        summary,
        transcript,
      },
    };
  }

  async function run(ctx) {
    const attempts = [];

    for (const extractor of getExtractors()) {
      const result = await extractor.run(ctx);
      attempts.push({
        provider: result.provider,
        ok: result.ok,
        code: result.ok ? null : result.code,
      });

      if (result.ok) {
        return {
          ok: true,
          provider: result.provider,
          payload: buildPayload(ctx, result, attempts),
          attempts,
        };
      }
    }

    const last = attempts[attempts.length - 1];
    return {
      ok: false,
      provider: last?.provider || "unknown",
      code: last?.code || "NO_SUBTITLE_TRACK",
      attempts,
    };
  }

  root.registry = {
    getExtractors,
    run,
  };
})();
