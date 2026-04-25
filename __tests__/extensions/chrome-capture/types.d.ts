/**
 * 共享的 globalThis.PineSnapCapture 形状，仅供测试文件引用，避免每个 test 各写一份导致 TS 冲突。
 */
export interface PineSnapCaptureGlobal {
  runtime?: {
    normalizeText: (value: string) => string;
    sleep: (ms: number) => Promise<void>;
    waitFor: <T>(read: () => T, options?: { timeoutMs?: number; intervalMs?: number }) => Promise<T | null>;
    formatStartLabel: (startMs: number) => string | undefined;
  };
  domCleanup?: {
    expandLazyImages: (doc: Document) => number;
    removeSelectors: (doc: Document, selectors: string[]) => number;
    stripTrackingParams: (url: string) => string;
    normalizeSections: (doc: Document) => number;
  };
  extractors?: Record<
    string,
    {
      provider: string;
      matches: (url: string) => boolean;
      extract?: (ctx: unknown) => Promise<unknown>;
      // 各 extractor 的 _internals 形状不同，按 extractor 自己 cast
      _internals?: Record<string, unknown>;
    }
  >;
  registry?: {
    pickExtractor: (url: string) => { provider: string } | null;
    run: (ctx: { url: string; document: Document; fetchJson: (url: string) => Promise<unknown> }) => Promise<unknown>;
    SITE_ADAPTERS: string[];
    GENERIC_FALLBACK: string;
    ERROR_CODES: Record<string, string>;
    isFallbackable: (code: string) => boolean;
  };
}

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var PineSnapCapture: PineSnapCaptureGlobal;
}
