(() => {
  const root = globalThis.PineSnapBilibiliCapture;
  const runtime = root.runtime;

  const PROVIDER = "bilibili_ai_assistant_panel";
  const TIME_LABEL_RE = /^\d{1,2}:\d{2}(?::\d{2})?$/;

  const AI_ASSISTANT = {
    tabsRoot: "[data-video-assistant-subject-tabs]",
    contentRoots: [
      "[data-video-assistant-subject-content]",
      "[data-video-assistant-subject-main]",
    ],
    launcher: ".video-ai-assistant",
    closeButton: ".close-btn",
    tabLabels: {
      summary: "视频总结",
      subtitleList: "字幕列表",
    },
    summaryClassHint: "Summary",
    textExactSelector: "[class*='_Text_']",
    textFuzzySelectors: ["[class*='Text']", "[class*='text']"],
    legacySubtitleExact: {
      part: "._Part_1iu0q_16",
      timeText: "._TimeText_1iu0q_35",
      text: "._Text_1iu0q_64",
    },
  };

  function findTabsRoot() {
    const element = document.querySelector(AI_ASSISTANT.tabsRoot);
    return element instanceof Element ? element : null;
  }

  function findContentRoot() {
    for (const selector of AI_ASSISTANT.contentRoots) {
      const element = document.querySelector(selector);
      if (element instanceof Element) return element;
    }

    const fallback = document.querySelector(AI_ASSISTANT.launcher);
    return fallback instanceof Element ? fallback : null;
  }

  async function openPanel() {
    if (findTabsRoot()) return true;
    const launcher = document.querySelector(AI_ASSISTANT.launcher);
    if (!(launcher instanceof HTMLElement)) return false;
    launcher.click();
    return Boolean(
      await runtime.waitFor(() => findTabsRoot(), {
        timeoutMs: 8000,
        intervalMs: 200,
      })
    );
  }

  async function clickTab(label) {
    const tabsRoot = findTabsRoot();
    if (!tabsRoot) return false;

    const candidates = tabsRoot.querySelectorAll("span");
    for (const element of candidates) {
      if (runtime.normalizeText(element.textContent) !== label) continue;
      const clickable = element.closest("button,div") || element;
      clickable.click();
      return true;
    }

    return false;
  }

  function extractSummaryParagraph(panelRoot) {
    let best = "";
    const nodes = panelRoot.querySelectorAll("div,span,p");
    for (const node of nodes) {
      if (!(node instanceof Element)) continue;
      const className = String(node.getAttribute("class") || "");
      if (!className.includes(AI_ASSISTANT.summaryClassHint)) continue;
      const text = runtime.normalizeText(node.textContent);
      if (text.length > best.length) best = text;
    }
    return best;
  }

  function extractSummaryChapters(panelRoot) {
    const chapters = [];
    const seen = new Set();
    const items = panelRoot.querySelectorAll("[class*='_Item_'],[class*='Item']");

    for (const item of items) {
      if (!(item instanceof Element)) continue;

      const title = runtime.normalizeText(
        item.querySelector("[class*='_Title_'],[class*='Title']")?.textContent
      );
      const parts = item.querySelectorAll("[class*='_Part_'],[class*='Part']");
      const local = [];

      for (const part of parts) {
        if (!(part instanceof Element)) continue;

        const startLabel = runtime.normalizeText(
          part.querySelector("[class*='_TimeText_'],[class*='TimeText']")?.textContent
        );
        if (!TIME_LABEL_RE.test(startLabel)) continue;

        const text = runtime.normalizeText(
          part.querySelector(AI_ASSISTANT.textExactSelector)?.textContent
        );
        if (!text) continue;

        local.push({ startLabel, title: text });
      }

      const summaryStartLabel = local[0]?.startLabel;
      if (title) {
        const key = `${summaryStartLabel || "na"}|${title}`;
        if (!seen.has(key)) {
          seen.add(key);
          chapters.push({ startLabel: summaryStartLabel, title });
        }
      }

      for (const chapter of local) {
        const key = `${chapter.startLabel}|${chapter.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        chapters.push(chapter);
      }
    }

    return chapters;
  }

  function extractTranscriptLines(panelRoot) {
    const lines = [];
    const seen = new Set();
    const parts = panelRoot.querySelectorAll("[class*='_Part_'],[class*='Part']");

    for (const part of parts) {
      if (!(part instanceof Element)) continue;

      const startLabel = runtime.normalizeText(
        part.querySelector(
          "[class*='_TimeText_'],[class*='TimeText'],[class*='_Time_']"
        )?.textContent
      );
      if (!TIME_LABEL_RE.test(startLabel)) continue;

      let text = runtime.normalizeText(
        part.querySelector(AI_ASSISTANT.textExactSelector)?.textContent
      );
      if (!text) {
        for (const candidate of part.querySelectorAll(
          AI_ASSISTANT.textFuzzySelectors.join(",")
        )) {
          const className = String(candidate.getAttribute("class") || "");
          if (/Time/i.test(className)) continue;
          const value = runtime.normalizeText(candidate.textContent);
          if (!value || value === startLabel) continue;
          text = value;
          break;
        }
      }

      if (!text) continue;

      const key = `${startLabel}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({ startLabel, text });
    }

    if (lines.length > 0) return lines;

    for (const part of document.querySelectorAll(AI_ASSISTANT.legacySubtitleExact.part)) {
      if (!(part instanceof Element)) continue;

      const startLabel = runtime.normalizeText(
        part.querySelector(AI_ASSISTANT.legacySubtitleExact.timeText)?.textContent
      );
      const text = runtime.normalizeText(
        part.querySelector(AI_ASSISTANT.legacySubtitleExact.text)?.textContent
      );
      if (!TIME_LABEL_RE.test(startLabel) || !text) continue;

      const key = `${startLabel}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({ startLabel, text });
    }

    return lines;
  }

  async function run() {
    try {
      const opened = await openPanel();
      if (!opened) {
        return {
          ok: false,
          provider: PROVIDER,
          code: "AI_PANEL_UNAVAILABLE",
        };
      }

      const contentRoot = findContentRoot();
      if (!contentRoot) {
        return {
          ok: false,
          provider: PROVIDER,
          code: "AI_PANEL_UNAVAILABLE",
        };
      }

      let summaryText = "";
      let chapters = [];
      let lines = [];

      if (await clickTab(AI_ASSISTANT.tabLabels.summary)) {
        await runtime.waitFor(() => extractSummaryParagraph(contentRoot), {
          timeoutMs: 5000,
          intervalMs: 200,
        });
        summaryText = extractSummaryParagraph(contentRoot);
        chapters = extractSummaryChapters(contentRoot);
      }

      if (await clickTab(AI_ASSISTANT.tabLabels.subtitleList)) {
        await runtime.sleep(1500);
        await runtime.waitFor(
          () => contentRoot.querySelector("[class*='_Part_'],[class*='Part']"),
          {
            timeoutMs: 5000,
            intervalMs: 200,
          }
        );
        lines = extractTranscriptLines(contentRoot);
      }

      const closeButton = document.querySelector(AI_ASSISTANT.closeButton);
      if (closeButton instanceof HTMLElement) {
        try {
          closeButton.click();
        } catch {}
      }

      const hasSummary = Boolean(summaryText) || chapters.length > 0;
      const hasTranscript = lines.length > 0;

      if (!hasSummary && !hasTranscript) {
        return {
          ok: false,
          provider: PROVIDER,
          code: "NO_SUBTITLE_TRACK",
        };
      }

      return {
        ok: true,
        provider: PROVIDER,
        content: {
          summary: hasSummary
            ? {
                provider: PROVIDER,
                text: summaryText || undefined,
                chapters: chapters.length > 0 ? chapters : undefined,
              }
            : undefined,
          transcript: hasTranscript
            ? {
                provider: PROVIDER,
                lines,
              }
            : undefined,
        },
        diagnostics: {
          provider: PROVIDER,
          chapterCount: chapters.length,
          hasSummaryText: Boolean(summaryText),
          lineCount: lines.length,
        },
      };
    } catch (error) {
      return {
        ok: false,
        provider: PROVIDER,
        code: "AI_PANEL_UNAVAILABLE",
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
    priority: 20,
    run,
  };
})();
