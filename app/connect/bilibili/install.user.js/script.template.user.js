// ==UserScript==
// @name         PineSnap - 连接 Bilibili
// @namespace    pinesnap
// @version      0.3.4
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
  const EXTRACTOR_UNKNOWN = "unknown";

  /**
   * Bilibili AI 小助手 DOM 选择器/类名提示（可维护性入口）
   *
   * 说明：
   * - B 站大量使用 CSS Modules，类名会随构建变更（例如 `_Text_1iu0q_64`）。
   * - 我们尽量使用更稳定的 data- 属性；但内容区域内部仍需要依赖 class 的“语义片段”：
   *   `_Part_`/`_TimeText_`/`_Time_`/`_Text_`/`_Title_`/`Summary`/`Item`/`Outline` 等。
   * - 若 B 站改版导致采集失败，优先只改这里的配置，而不是到处改 querySelector。
   */
  const AI_ASSISTANT = {
    // 面板根节点（优先使用 data-*，相对稳定）
    tabsRoot: "[data-video-assistant-subject-tabs]",
    contentRoots: [
      "[data-video-assistant-subject-content]",
      "[data-video-assistant-subject-main]",
    ],

    // 打开/关闭面板
    launcher: ".video-ai-assistant",
    closeButton: ".close-btn",

    // Tab 文案（用文本定位 Tab）
    tabLabels: {
      summary: "视频总结",
      subtitleList: "字幕列表",
    },

    // “视频总结”页顶部那段长文本（class 含 Summary）
    summaryClassHint: "Summary",

    // “要点卡片”结构（Outline -> Item -> Part）
    outlineClassHints: ["Outline", "SeekSections"],
    itemClassHint: "Item",
    titleSelectors: ["[class*='_Title_']", "[class*='Title']"],

    // 条目结构（“视频总结”的时间点条目 + “字幕列表”共用）
    partSelectors: ["[class*='_Part_']", "[class*='Part']"],
    timeSelectors: ["[class*='_TimeText_']", "[class*='TimeText']", "[class*='_Time_']"],
    textExactSelector: "[class*='_Text_']",
    textFuzzySelectors: ["[class*='Text']", "[class*='text']"], // 注意：会命中 TimeText，因此必须排除
    contentSelectors: ["[class*='_Content_']", "[class*='Content']"],

    // 旧版“精确 selector”（CSS Modules hash 变动就会失效，保留在此方便统一替换）
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
    const m = /\/video\/(BV[0-9A-Za-z]+)/.exec(url);
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

  const TIME_LABEL_RE = /^\d{1,2}:\d{2}(?::\d{2})?$/;

  function normalizePlainText(s) {
    return String(s || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.right = "16px";
    el.style.bottom = "16px";
    el.style.zIndex = "999999";
    el.style.maxWidth = "360px";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "10px";
    el.style.background = "rgba(0,0,0,0.8)";
    el.style.color = "#fff";
    el.style.fontSize = "12px";
    el.style.lineHeight = "1.4";
    el.style.boxShadow = "0 8px 30px rgba(0,0,0,0.25)";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function registerMenuCommand(name, fn) {
    try {
      if (typeof GM === "object" && GM && typeof GM.registerMenuCommand === "function") {
        GM.registerMenuCommand(name, fn);
        return;
      }
      if (typeof GM_registerMenuCommand === "function") {
        GM_registerMenuCommand(name, fn);
      }
    } catch {
      // ignore
    }
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

  function findTabLabelSpan(label) {
    const tabsRoot = findAiAssistantTabsRoot();
    if (!tabsRoot) return null;
    const target = normalizePlainText(label);
    if (!target) return null;

    const spans = tabsRoot.querySelectorAll("span");
    for (const s of spans) {
      if (!(s instanceof Element)) continue;
      const t = normalizePlainText(s.textContent || "");
      if (t === target) return s;
    }
    return null;
  }

  async function clickAiAssistantTab(label) {
    const span = await waitFor(() => findTabLabelSpan(label), {
      timeoutMs: 8000,
      intervalMs: 200,
    });
    if (!span) return false;
    try {
      const clickable = span.closest("button,div") || span;
      clickable.click();
      return true;
    } catch {
      return false;
    }
  }

  function extractCuesByAiSubtitleClasses(root) {
    const cues = [];
    const seen = new Set();

    const parts = root.querySelectorAll(AI_ASSISTANT.partSelectors.join(","));
    for (const part of parts) {
      const timeEl =
        part.querySelector(AI_ASSISTANT.timeSelectors.join(",")) || null;
      const time = normalizePlainText(timeEl && timeEl.textContent ? timeEl.textContent : "");
      if (!TIME_LABEL_RE.test(time)) continue;

      const textNodes = part.querySelectorAll(
        [AI_ASSISTANT.textExactSelector, ...AI_ASSISTANT.textFuzzySelectors].join(",")
      );
      let text = "";
      for (const n of textNodes) {
        const t = normalizePlainText(n.textContent || "");
        if (!t) continue;
        if (t === time) continue;
        if (TIME_LABEL_RE.test(t)) continue;
        // 避免把 TimeText（时间）当成正文文本
        const cls = n instanceof Element ? String(n.getAttribute("class") || "") : "";
        if (cls.includes("TimeText")) continue;
        if (t.length > text.length) text = t;
      }
      if (!text) continue;

      const key = time + "|" + text;
      if (seen.has(key)) continue;
      seen.add(key);
      cues.push({ startLabel: time, text });
    }

    return cues;
  }

  function extractCuesFromAiAssistantSummaryPanel(panelRoot) {
    // 优先走结构化提取：
    // - _Title_*：要点标题
    // - _Part_* 行内的 _TimeText_*（时间）+ _Text_*（文本）
    // 若结构变化则回退到“扫描时间点 + 同行取最长文本”的启发式兜底。
    const cues = [];
    const seen = new Set();

    const outlineRoot =
      panelRoot.querySelector(AI_ASSISTANT.outlineClassHints.map((h) => `[class*='${h}']`).join(",")) ||
      panelRoot;

    const items = outlineRoot.querySelectorAll(`[class*='${AI_ASSISTANT.itemClassHint}']`);
    if (items.length > 0) {
      for (const item of items) {
        if (!(item instanceof Element)) continue;

        const titleEl = item.querySelector(AI_ASSISTANT.titleSelectors.join(","));
        const title = normalizePlainText(titleEl && titleEl.textContent ? titleEl.textContent : "");
        if (title) cues.push({ text: `【要点】${title}` });

        const parts = item.querySelectorAll(AI_ASSISTANT.partSelectors.join(","));
        for (const part of parts) {
          if (!(part instanceof Element)) continue;

          const timeEl =
            part.querySelector(AI_ASSISTANT.timeSelectors.join(",")) ||
            null;
          const time = normalizePlainText(timeEl && timeEl.textContent ? timeEl.textContent : "");
          if (!TIME_LABEL_RE.test(time)) continue;

          // 注意：TimeText 也会命中 "*Text*"，必须显式排除，否则会出现“[00:25] 00:25”。
          let textEl = part.querySelector(AI_ASSISTANT.textExactSelector) || null;
          if (!textEl) {
            const candidates = part.querySelectorAll(AI_ASSISTANT.textFuzzySelectors.join(","));
            for (const c of candidates) {
              if (!(c instanceof Element)) continue;
              const cls = String(c.getAttribute("class") || "");
              if (!cls) continue;
              if (cls.includes("TimeText")) continue;
              textEl = c;
              break;
            }
          }
          if (!textEl) {
            textEl = part.querySelector(AI_ASSISTANT.contentSelectors.join(","));
          }
          const text = normalizePlainText(textEl && textEl.textContent ? textEl.textContent : "");
          if (!text) continue;

          const key = time + "|" + text;
          if (seen.has(key)) continue;
          seen.add(key);
          cues.push({ startLabel: time, text });
        }
      }
    }

    if (cues.length > 0) return cues;

    // 兜底：扫描时间点 + 同行取最长文本
    const timeNodes = panelRoot.querySelectorAll("span,div,p");
    for (const timeEl of timeNodes) {
      const timeText = normalizePlainText(timeEl.textContent || "");
      if (!TIME_LABEL_RE.test(timeText)) continue;

      const row = timeEl.closest("li,div") || timeEl.parentElement;
      if (!row) continue;

      const textCandidates = row.querySelectorAll("span,div,p");
      let best = "";
      for (const c of textCandidates) {
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
      cues.push({ startLabel: timeText, text });
    }

    return cues;
  }

  function extractAiAssistantSummaryParagraph(panelRoot) {
    if (!(panelRoot instanceof Element)) return "";
    // 优先抓 Summary 段落（例如 class 含 _Summary_xxx）
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

  function extractSubtitleCuesFromAiAssistantPanel(panelRoot) {
    // “字幕列表”只用结构化选择器提取，不做时间扫描兜底：
    // 因为“视频总结”也有时间点列表，兜底会把总结误当字幕。
    let cues = extractCuesByBilibiliSubtitleExactSelectors();
    if (cues.length > 0) return cues;
    cues = extractCuesByAiSubtitleClasses(panelRoot);
    return cues;
  }

  // 旧版：从 bilibili-subtitle 借鉴的精确 selector（尽力而为，B 站更新后可能失效）
  function extractCuesByBilibiliSubtitleExactSelectors() {
    const cues = [];
    const seen = new Set();

    // 这些类名是 CSS Modules 的 hash，随构建可能变化
    const parts = document.querySelectorAll(AI_ASSISTANT.legacySubtitleExact.part);
    for (const part of parts) {
      const timeElem = part.querySelector(AI_ASSISTANT.legacySubtitleExact.timeText);
      const textElem = part.querySelector(AI_ASSISTANT.legacySubtitleExact.text);
      const time = normalizePlainText(timeElem && timeElem.textContent ? timeElem.textContent : "");
      const text = normalizePlainText(textElem && textElem.textContent ? textElem.textContent : "");
      if (!TIME_LABEL_RE.test(time) || !text) continue;
      if (text === time) continue;
      if (TIME_LABEL_RE.test(text)) continue;

      const key = time + "|" + text;
      if (seen.has(key)) continue;
      seen.add(key);
      cues.push({ startLabel: time, text });
    }

    return cues;
  }

  async function extractFromAiAssistantSummaryAndSubtitleList() {
    const opened = await openAiAssistantPanel();
    if (!opened) return { summaryCues: [], subtitleCues: [], summaryParagraph: "" };

    const contentRoot = findAiAssistantContentRoot();
    if (!contentRoot) return { summaryCues: [], subtitleCues: [], summaryParagraph: "" };

    // 1) 先提取“视频总结”
    let summaryCues = [];
    // 默认打开就是“视频总结”，这里 best-effort 再点一次确保在正确 Tab
    await clickAiAssistantTab(AI_ASSISTANT.tabLabels.summary);
    await waitFor(() => {
      const summaryText = extractAiAssistantSummaryParagraph(contentRoot);
      if (summaryText) return true;
      const nodes = contentRoot.querySelectorAll("span,div,p");
      for (const n of nodes) {
        const t = normalizePlainText(n.textContent || "");
        if (TIME_LABEL_RE.test(t)) return true;
      }
      return null;
    }, { timeoutMs: 8000, intervalMs: 200 });
    summaryCues = extractCuesFromAiAssistantSummaryPanel(contentRoot);

    const summaryParagraph = extractAiAssistantSummaryParagraph(contentRoot);

    // 2) 再提取“字幕列表”
    let subtitleCues = [];
    const clicked = await clickAiAssistantTab(AI_ASSISTANT.tabLabels.subtitleList);
    if (clicked) {
      // 给面板一点时间渲染列表（参考 bilibili-subtitle 的固定延迟做法）
      await sleepWithJitter(2000);

      // 等待“字幕列表”结构出现后再提取
      const ok = await waitFor(() => {
        const hasPart =
          contentRoot.querySelector("._Part_1iu0q_16") ||
          contentRoot.querySelector("[class*='_Part_'],[class*='Part']");
        const hasTime =
          contentRoot.querySelector("[class*='_TimeText_'],[class*='TimeText'],[class*='_Time_']");
        const hasText = contentRoot.querySelector("[class*='_Text_'],[class*='Text']");
        return hasPart && hasTime && hasText ? true : null;
      }, { timeoutMs: 8000, intervalMs: 200 });

      if (ok) subtitleCues = extractSubtitleCuesFromAiAssistantPanel(contentRoot);
    }

    // best-effort 关闭面板
    const closeButton =
      document.querySelector(AI_ASSISTANT.closeButton) ||
      Array.from(document.querySelectorAll("button,span,div")).find(
        (el) => (el.textContent || "").trim() === "关闭"
      );
    if (closeButton && closeButton instanceof Element) {
      try {
        closeButton.click();
      } catch {
        // ignore
      }
    }

    return { summaryCues, subtitleCues, summaryParagraph };
  }

  async function sendCapture() {
    toast("正在提取 AI 小助手内容（视频总结 + 字幕列表）...");

    const ai = await extractFromAiAssistantSummaryAndSubtitleList();

    let extractor = EXTRACTOR_UNKNOWN;
    const cues = [];

    if ((ai.summaryParagraph && String(ai.summaryParagraph).trim()) || (ai.summaryCues && ai.summaryCues.length > 0)) {
      cues.push({ text: "【视频总结】" });
      const p = normalizePlainText(ai.summaryParagraph || "");
      if (p) cues.push({ text: p });
      if (ai.summaryCues && ai.summaryCues.length > 0) cues.push(...ai.summaryCues);
    }

    if (ai.subtitleCues && ai.subtitleCues.length > 0) {
      extractor = EXTRACTOR_AI_ASSISTANT_PANEL;
      cues.push({ text: "【字幕列表】" });
      cues.push(...ai.subtitleCues);
    }

    if (!cues || cues.length === 0) {
      toast("未检测到可用内容。请确认 AI 小助手面板已打开且内容已生成后重试。");
      return;
    }

    const url = location.href;
    const payload = {
      v: 1,
      source: { url },
      video: {
        title:
          (document.title || "").replace(/_哔哩哔哩_bilibili.*$/i, "").trim() || undefined,
        bvid: parseBvid(url),
        p: parseP(url),
      },
      subtitles: { extractor, cues },
    };

    const endpoint = PINESNAP_BASE_URL + "/api/capture/bilibili";
    try {
      toast("正在发送到 PineSnap...");
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json && json.error ? String(json.error) : "HTTP " + res.status;
        toast("发送失败：" + msg);
        return;
      }
      toast("发送成功，已写入 PineSnap。");
      const conversationId = json && json.conversationId ? String(json.conversationId) : "";
      if (conversationId) {
        window.open(
          PINESNAP_BASE_URL + "/chat/c/" + conversationId,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch {
      toast("发送失败：网络错误或 CORS 阻止。请稍后重试。");
    }
  }

  function mountButton() {
    if (document.getElementById("pinesnap-bili-capture-btn")) return;
    const btn = document.createElement("button");
    btn.id = "pinesnap-bili-capture-btn";
    btn.type = "button";
    btn.textContent = "发送到 PineSnap";
    btn.style.all = "unset";
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.position = "fixed";
    btn.style.right = "16px";
    btn.style.bottom = "120px";
    btn.style.zIndex = "2147483647";
    btn.style.padding = "10px 12px";
    btn.style.borderRadius = "999px";
    btn.style.border = "1px solid rgba(0,0,0,0.12)";
    btn.style.background = "#111827";
    btn.style.color = "#fff";
    btn.style.fontSize = "12px";
    btn.style.fontWeight = "600";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 10px 30px rgba(0,0,0,0.2)";
    btn.addEventListener("click", () => void sendCapture());
    document.body.appendChild(btn);
  }

  function registerMenu() {
    registerMenuCommand("发送到 PineSnap", () => void sendCapture());
    registerMenuCommand("打开 PineSnap 连接页面", () => {
      window.open(PINESNAP_BASE_URL + "/connect/bilibili", "_blank", "noopener,noreferrer");
    });
  }

  async function main() {
    registerMenu();
    for (let i = 0; i < 10; i++) {
      await sleep(300);
      if (document.body) break;
    }
    mountButton();
    const mo = new MutationObserver(() => mountButton());
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  void main();
})();

