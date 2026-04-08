(() => {
  const root = globalThis.PineSnapBilibiliCapture;
  const runtime = root.runtime;
  const registry = root.registry;

  const ROOT_ID = "pinesnap-bilibili-capture-root";
  const STYLE_ID = "pinesnap-bilibili-capture-style";
  let isRunning = false;

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function toast(message) {
    const element = document.createElement("div");
    element.textContent = message;
    element.style.cssText = [
      "position: fixed",
      "left: 20px",
      "bottom: 80px",
      "z-index: 2147483647",
      "max-width: 320px",
      "padding: 10px 16px",
      "border-radius: 12px",
      "background: rgba(0, 0, 0, 0.85)",
      "color: #fff",
      "font-size: 13px",
      "line-height: 1.4",
      "box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3)",
    ].join(";");
    document.body.appendChild(element);
    setTimeout(() => {
      element.remove();
    }, 2500);
  }

  function describeExtractFailure(code) {
    switch (code) {
      case "MISSING_VIDEO_CONTEXT":
        return "未能识别当前视频信息，请刷新页面后重试。";
      case "MISSING_CID":
        return "未能定位当前分 P 标识（cid），请稍后重试。";
      case "SUBTITLE_REQUIRES_LOGIN":
        return "当前视频字幕需要登录态，请确认 B 站登录后重试。";
      case "NO_SUBTITLE_TRACK":
        return "未检测到可用字幕轨。";
      case "SUBTITLE_FETCH_FAILED":
        return "字幕拉取失败，请稍后重试。";
      default:
        return "采集失败，请打开控制台查看详情。";
    }
  }

  async function fetchJson(url, options) {
    const response = await sendMessage({
      type: "fetch-json",
      url,
      options,
    });
    if (!response?.ok) {
      throw new Error(
        response?.error ||
          response?.body ||
          `Request failed with status ${response?.status || "unknown"}`
      );
    }
    return response.data;
  }

  async function uploadCapture(baseUrl, token, payload) {
    return sendMessage({
      type: "upload-capture",
      baseUrl,
      token,
      payload,
    });
  }

  async function readConfig() {
    const response = await sendMessage({ type: "get-config" });
    return response?.config || { baseUrl: "", token: "" };
  }

  async function runCapture() {
    if (isRunning) return;
    isRunning = true;

    try {
      const config = await readConfig();
      if (!config.baseUrl || !config.token) {
        toast("请先在扩展选项页连接 PineSnap 账号。");
        chrome.runtime.openOptionsPage();
        return;
      }

      toast("正在提取字幕...");
      const video = runtime.getVideoContext();
      const result = await registry.run({
        video,
        fetchJson,
      });

      if (!result.ok) {
        console.warn("[PineSnap capture] extractor attempts", result.attempts);
        toast(describeExtractFailure(result.code));
        return;
      }

      toast("正在发送到 PineSnap...");
      const upload = await uploadCapture(config.baseUrl, config.token, result.payload);
      if (!upload?.ok) {
        console.warn("[PineSnap capture] upload failed", upload);
        if (upload?.status === 401 || upload?.status === 403) {
          toast("连接已失效，请在扩展选项页重新连接。");
          chrome.runtime.openOptionsPage();
        } else {
          toast(`发送失败 (HTTP ${upload?.status || "unknown"})`);
        }
        return;
      }

      toast("已存入 PineSnap 素材库。");
      console.info("[PineSnap capture] success", {
        resourceId: upload.body?.resourceId,
        provider: result.provider,
        attempts: result.attempts,
      });
    } catch (error) {
      console.error("[PineSnap capture] unexpected failure", error);
      toast("发送失败 (网络错误)");
    } finally {
      isRunning = false;
    }
  }

  function mountButton() {
    if (document.getElementById(ROOT_ID)) return;

    const rootElement = document.createElement("div");
    rootElement.id = ROOT_ID;
    rootElement.setAttribute("role", "button");
    rootElement.setAttribute("aria-label", "存入 PineSnap");
    rootElement.tabIndex = 0;

    const tab = document.createElement("div");
    tab.className = "pinesnap-tab-layer";

    const logo = document.createElement("div");
    logo.className = "pinesnap-logo-layer";
    logo.textContent = "P";

    tab.appendChild(logo);
    rootElement.appendChild(tab);

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        #${ROOT_ID} {
          position: fixed;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2147483646;
          cursor: pointer;
          user-select: none;
          transition: transform 0.25s ease;
        }

        #${ROOT_ID}:hover {
          transform: translateY(-50%) translateX(4px);
        }

        #${ROOT_ID}:focus-visible {
          outline: 2px solid rgba(0, 0, 0, 0.35);
          outline-offset: 2px;
        }

        #${ROOT_ID} .pinesnap-tab-layer {
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

        #${ROOT_ID} .pinesnap-logo-layer {
          width: 32px;
          height: 32px;
          background: #000;
          border-radius: 999px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 800;
          font-size: 16px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
      `;
      document.head.appendChild(style);
    }

    rootElement.addEventListener("click", () => {
      void runCapture();
    });
    rootElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void runCapture();
      }
    });

    document.body.appendChild(rootElement);
  }

  function main() {
    mountButton();
    const observer = new MutationObserver(() => mountButton());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "complete") {
    main();
  } else {
    window.addEventListener("load", main, { once: true });
  }
})();
