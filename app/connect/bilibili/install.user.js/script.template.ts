// Auto-generated template string module.
// Do not edit by hand.

export const SCRIPT_TEMPLATE: string = `// ==UserScript==
// @name         PineSnap - 连接 Bilibili
// @namespace    pinesnap
// @version      0.4.9
// @description  在 B 站视频页一键采集字幕并发送到 PineSnap
// @match        https://www.bilibili.com/video/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM.registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  // Injected by PineSnap on install.
  const PINESNAP_BASE_URL = __PINESNAP_BASE_URL__;
  const PINESNAP_TOKEN = __PINESNAP_TOKEN__;

  const EXTRACTOR_AI_ASSISTANT_PANEL = "bilibili_ai_assistant_panel";

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
    outlineClassHints: ["Outline", "SeekSections"],
    itemClassHint: "Item",
    titleSelectors: ["[class*='_Title_']", "[class*='Title']"],
    partSelectors: ["[class*='_Part_']", "[class*='Part']"],
    timeSelectors: ["[class*='_TimeText_']", "[class*='TimeText']", "[class*='_Time_']"],
    textExactSelector: "[class*='_Text_']",
    textFuzzySelectors: ["[class*='Text']", "[class*='text']"],
    contentSelectors: ["[class*='_Content_']", "[class*='Content']"],
    legacySubtitleExact: {
      part: "._Part_1iu0q_16",
      timeText: "._TimeText_1iu0q_35",
      text: "._Text_1iu0q_64",
    },
  };

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function sleepWithJitter(ms) {
    const jitter = Math.floor(Math.random() * 80);
    return sleep(ms + jitter);
  }

  async function waitFor(fn, opts) {
    const timeoutMs = (opts && opts.timeoutMs) || 8000;
    const intervalMs = (opts && opts.intervalMs) || 150;
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const v = fn();
      if (v) return v;
      await sleepWithJitter(intervalMs);
    }
    return null;
  }

  function parseBvid(url) {
    const m = /\\/video\\/(BV[0-9A-Za-z]+)/.exec(url);
    return m ? m[1] : undefined;
  }

  function parseP(url) {
    try {
      const u = new URL(url);
      const p = u.searchParams.get("p");
      if (!p) return undefined;
      const n = Number(p);
      if (!Number.isFinite(n) || n <= 0) return undefined;
      return n;
    } catch {
      return undefined;
    }
  }

  const TIME_LABEL_RE = /^\\d{1,2}:\\d{2}(?::\\d{2})?$/;

  function normalizePlainText(s) {
    return String(s || "")
      .replace(/[\\u200B-\\u200D\\uFEFF]/g, "")
      .trim();
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = \`
      position: fixed;
      left: 20px;
      bottom: 80px;
      z-index: 2147483647;
      max-width: 300px;
      padding: 10px 16px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-size: 13px;
      line-height: 1.4;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(8px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: pinesnap-toast-in 0.3s ease-out;
    \`;
    
    const style = document.createElement("style");
    style.textContent = \`
      @keyframes pinesnap-toast-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    \`;
    document.head.appendChild(style);
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-10px)";
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  function findAiAssistantTabsRoot() {
    const el = document.querySelector(AI_ASSISTANT.tabsRoot);
    return el instanceof Element ? el : null;
  }

  function findAiAssistantContentRoot() {
    let el = null;
    for (const sel of AI_ASSISTANT.contentRoots) {
      const found = document.querySelector(sel);
      if (found instanceof Element) {
        el = found;
        break;
      }
    }
    if (!el) {
      const fallback = document.querySelector(AI_ASSISTANT.launcher);
      el = fallback instanceof Element ? fallback : null;
    }
    return el instanceof Element ? el : null;
  }

  async function clickAiAssistantTab(label) {
    const tabsRoot = findAiAssistantTabsRoot();
    if (!tabsRoot) return false;
    
    const spans = tabsRoot.querySelectorAll("span");
    let targetSpan = null;
    for (const s of spans) {
      if (normalizePlainText(s.textContent) === label) {
        targetSpan = s;
        break;
      }
    }
    
    if (targetSpan) {
      (targetSpan.closest("button,div") || targetSpan).click();
      return true;
    }
    return false;
  }

  async function openAiAssistantPanel() {
    const aiAssistant = document.querySelector(AI_ASSISTANT.launcher);
    if (!aiAssistant) return false;
    aiAssistant.click();
    const ready = await waitFor(() => findAiAssistantTabsRoot(), {
      timeoutMs: 8000,
      intervalMs: 200,
    });
    return Boolean(ready);
  }

  function extractCuesFromAiAssistantSummaryPanel(panelRoot) {
    const cues = [];
    const seen = new Set();

    // 精确选择器（来自 Bilibili DOM 截图）
    const EXACT = {
      seekSections: "._SeekSections_1iu0q_1,[class*='_SeekSections_'],[class*='SeekSections']",
      item: "._Item_1iu0q_1,[class*='_Item_']",
      title: "._Title_1iu0q_8,[class*='_Title_']",
      parts: "._Parts_1iu0q_16,[class*='_Parts_']",
      part: "._Part_1iu0q_16,[class*='_Part_']",
      timeText: "._TimeText_1iu0q_35,[class*='_TimeText_']",
      text: "._Text_1iu0q_64,[class*='_Text_']",
    };

    const sectionsRoot = panelRoot.querySelector(EXACT.seekSections) || panelRoot;
    const items = sectionsRoot.querySelectorAll(EXACT.item);

    for (const item of items) {
      if (!(item instanceof Element)) continue;

      // 1. 大标题
      const titleEl = item.querySelector(EXACT.title);
      const title = normalizePlainText(titleEl && titleEl.textContent ? titleEl.textContent : "");

      // 2. 所有子条目
      const parts = item.querySelectorAll(EXACT.part);
      const local = [];

      for (const part of parts) {
        if (!(part instanceof Element)) continue;

        const timeEl = part.querySelector(EXACT.timeText);
        const time = normalizePlainText(timeEl && timeEl.textContent ? timeEl.textContent : "");
        if (!TIME_LABEL_RE.test(time)) continue;

        const textEl = part.querySelector(EXACT.text);
        const text = normalizePlainText(textEl && textEl.textContent ? textEl.textContent : "");
        if (!text) continue;

        local.push({ startLabel: time, title: text });
      }

      // 3. 大标题的 startLabel：取第一个子条目的时间
      const sectionStartTime = local.length > 0 ? local[0].startLabel : undefined;

      // 4. 先 push 大标题
      if (title) {
        const key = (sectionStartTime || "") + "|" + title;
        if (!seen.has(key)) {
          seen.add(key);
          cues.push({ startLabel: sectionStartTime, title: title });
        }
      }

      // 5. 再 push 所有子条目
      for (const c of local) {
        const key = c.startLabel + "|" + c.title;
        if (seen.has(key)) continue;
        seen.add(key);
        cues.push(c);
      }
    }

    // 兜底：如果没有抓到任何带时间点的条目
    const hasTimedCues = cues.some((c) => c && typeof c.startLabel === "string" && TIME_LABEL_RE.test(c.startLabel));
    if (!hasTimedCues) {
      const timeNodes = panelRoot.querySelectorAll("span,div,p");
      for (const timeEl of timeNodes) {
        const timeText = normalizePlainText(timeEl.textContent || "");
        if (!TIME_LABEL_RE.test(timeText)) continue;

        const row = timeEl.closest("li,div") || timeEl.parentElement;
        if (!row) continue;

        const textCandidates = row.querySelectorAll("span,div,p");
        let best = "";
        for (const c of textCandidates) {
          const cls = c instanceof Element ? String(c.getAttribute("class") || "") : "";
          if (cls.includes("Time") || cls.includes("time")) continue;

          const t = normalizePlainText(c.textContent || "");
          if (!t) continue;
          if (t === "视频总结" || t === "字幕列表") continue;
          if (TIME_LABEL_RE.test(t)) continue;
          if (t.length > best.length) best = t;
        }

        const text = normalizePlainText(best);
        if (!text) continue;
        const key = timeText + "|" + text;
        if (seen.has(key)) continue;
        seen.add(key);
        cues.push({ startLabel: timeText, title: text });
      }
    }

    return cues;
  }



  function extractAiAssistantSummaryParagraph(panelRoot) {
    if (!(panelRoot instanceof Element)) return "";
    const candidates = panelRoot.querySelectorAll("div,span,p");
    let best = "";
    for (const el of candidates) {
      if (!(el instanceof Element)) continue;
      const cls = String(el.getAttribute("class") || "");
      if (!cls || !cls.includes(AI_ASSISTANT.summaryClassHint)) continue;
      const t = normalizePlainText(el.textContent || "");
      if (!t) continue;
      if (t.length > best.length) best = t;
    }
    return best;
  }

  // --- 修复的核心部分：字幕提取逻辑 ---
  function extractSubtitleCuesFromAiAssistantPanel(panelRoot) {
    const cues = [];
    const parts = panelRoot.querySelectorAll("[class*='_Part_'],[class*='Part']");
    
    for (const part of parts) {
      // 1. 查找时间 (Time)
      const timeEl = part.querySelector("[class*='_TimeText_'],[class*='TimeText'],[class*='_Time_']");
      const startLabel = timeEl ? normalizePlainText(timeEl.textContent) : "";
      
      if (!TIME_LABEL_RE.test(startLabel)) continue;

      // 2. 查找文本 (Text) - 必须严格排除时间元素
      let text = "";
      
      // 策略 A: 精确查找 _Text_
      const exactTextEl = part.querySelector(AI_ASSISTANT.textExactSelector);
      if (exactTextEl) {
        text = normalizePlainText(exactTextEl.textContent);
      } else {
        // 策略 B: 模糊查找，但必须过滤掉 TimeText
        const candidates = part.querySelectorAll(AI_ASSISTANT.textFuzzySelectors.join(","));
        for (const c of candidates) {
            const cls = String(c.getAttribute("class") || "");
            // 关键修复：绝对排除包含 Time / TimeText 的元素
            if (cls.includes("Time") || cls.includes("time")) continue;
            
            // 额外检查：内容不能完全等于时间戳（双重保险）
            const t = normalizePlainText(c.textContent);
            if (t === startLabel) continue;
            
            text = t;
            break;
        }
      }

      if (text) {
        cues.push({ startLabel, text });
      }
    }
    
    // 如果结构化没找到，尝试旧版兜底
    if (cues.length === 0) {
        const oldParts = document.querySelectorAll(AI_ASSISTANT.legacySubtitleExact.part);
        for (const part of oldParts) {
            const timeEl = part.querySelector(AI_ASSISTANT.legacySubtitleExact.timeText);
            const textEl = part.querySelector(AI_ASSISTANT.legacySubtitleExact.text);
            if (timeEl && textEl) {
                cues.push({ 
                    startLabel: normalizePlainText(timeEl.textContent), 
                    text: normalizePlainText(textEl.textContent) 
                });
            }
        }
    }
    
    return cues;
  }

  async function extractFromAiAssistantSummaryAndSubtitleList() {
    const opened = await openAiAssistantPanel();
    if (!opened) return { summaryCues: [], subtitleCues: [], summaryParagraph: "" };

    const contentRoot = findAiAssistantContentRoot();
    if (!contentRoot) return { summaryCues: [], subtitleCues: [], summaryParagraph: "" };

    const result = { summaryCues: [], subtitleCues: [], summaryParagraph: "" };

    // 1. Summary
    if (await clickAiAssistantTab(AI_ASSISTANT.tabLabels.summary)) {
      await waitFor(() => extractAiAssistantSummaryParagraph(contentRoot).length > 0, { timeoutMs: 5000 });
      result.summaryParagraph = extractAiAssistantSummaryParagraph(contentRoot);
      result.summaryCues = extractCuesFromAiAssistantSummaryPanel(contentRoot);
    }

    // 2. Subtitles
    if (await clickAiAssistantTab(AI_ASSISTANT.tabLabels.subtitleList)) {
      await sleep(1500);
      await waitFor(() => contentRoot.querySelector("[class*='_Part_'],[class*='Part']"), { timeoutMs: 5000 });
      result.subtitleCues = extractSubtitleCuesFromAiAssistantPanel(contentRoot);
    }

    // Close
    const closeButton = document.querySelector(AI_ASSISTANT.closeButton);
    if (closeButton) { try { closeButton.click(); } catch {} }

    return result;
  }

  async function sendCapture() {
    toast("正在提取内容...");

    const ai = await extractFromAiAssistantSummaryAndSubtitleList();

    const url = location.href;
    const bvid = parseBvid(url);
    const p = parseP(url);
    const id = bvid ? (p ? bvid + "#p=" + p : bvid) : undefined;

    const hasSummary = (ai.summaryParagraph && ai.summaryParagraph.length > 0) || (ai.summaryCues && ai.summaryCues.length > 0);
    const hasTranscript = ai.subtitleCues && ai.subtitleCues.length > 0;

    if (!hasSummary && !hasTranscript) {
      toast("未检测到可用内容。请确认 AI 小助手面板已打开。");
      return;
    }

    const payload = {
      version: 1,
      metadata: {
        platform: "bilibili",
        id: id,
        url: url,
        title: (document.title || "").replace(/_哔哩哔哩_bilibili.*$/i, "").trim() || undefined,
      },
      content: {
        summary: hasSummary ? {
          provider: EXTRACTOR_AI_ASSISTANT_PANEL,
          text: ai.summaryParagraph || undefined,
          chapters: ai.summaryCues.length > 0 ? ai.summaryCues : undefined,
        } : undefined,
        transcript: hasTranscript ? {
          provider: EXTRACTOR_AI_ASSISTANT_PANEL,
          lines: ai.subtitleCues,
        } : undefined,
      },
    };

    const endpoint = PINESNAP_BASE_URL + "/api/capture/bilibili";
    try {
      toast("正在发送到素材库...");
      const res = await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + PINESNAP_TOKEN,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast("发送失败 (HTTP " + res.status + ")");
        return;
      }
      toast("已存入素材库");
    } catch {
      toast("发送失败 (网络错误)");
    }
  }

  function mountButton() {
    if (document.getElementById("pinesnap-root")) return;

    const root = document.createElement("div");
    root.id = "pinesnap-root";
    
    const tab = document.createElement("div");
    tab.className = "pinesnap-tab-layer";
    
    const logo = document.createElement("div");
    logo.className = "pinesnap-logo-layer";
    logo.textContent = "P";
    
    tab.appendChild(logo);
    root.appendChild(tab);
    document.body.appendChild(root);

    const style = document.createElement("style");
    style.textContent = \`
      #pinesnap-root {
        position: fixed;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 100000;
        cursor: pointer;
        user-select: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      #pinesnap-root:hover {
        transform: translateY(-50%) translateX(4px);
      }

      .pinesnap-tab-layer {
        width: 42px;
        height: 48px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 0 24px 24px 0;
        box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        padding-left: 4px;
        border: 1px solid rgba(0, 0, 0, 0.05);
        border-left: none;
        backdrop-filter: blur(4px);
      }

      .pinesnap-logo-layer {
        width: 32px;
        height: 32px;
        background: #000000;
        border-radius: 50%;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 800;
        font-size: 16px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }
    \`;
    document.head.appendChild(style);

    root.addEventListener("click", () => void sendCapture());
  }

  function registerMenu() {
    if (typeof GM_registerMenuCommand === "function") {
      GM_registerMenuCommand("发送到 PineSnap", sendCapture);
      GM_registerMenuCommand("打开连接页面", () => {
        window.open(PINESNAP_BASE_URL + "/connect/bilibili", "_blank", "noopener,noreferrer");
      });
    }
  }

  function main() {
    registerMenu();
    mountButton();
    const mo = new MutationObserver(() => mountButton());
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "complete") main();
  else window.addEventListener("load", main);
})();
`;
