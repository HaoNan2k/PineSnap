async function sendMessage(message) {
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

function describeConnectFailure(result) {
  const status = result?.status;
  const errorText =
    typeof result?.error === "string" ? result.error.trim() : "未知错误";

  if (status === 401 || status === 403) {
    return "请先登录 PineSnap，再重新点击连接。";
  }
  if (/授权码已过期|已使用|参数不匹配/.test(errorText)) {
    return errorText;
  }
  return errorText || `HTTP ${status || "unknown"}`;
}

async function loadConfig() {
  const response = await sendMessage({ type: "get-config" });
  const config = response?.config || {};
  document.getElementById("base-url").value = config.baseUrl || "";
  const connected = document.getElementById("connected");
  if (config.token && config.connectedAt) {
    connected.textContent = `已连接（${new Date(config.connectedAt).toLocaleString()}）`;
  } else if (config.token) {
    connected.textContent = "已连接";
  } else {
    connected.textContent = "";
  }
}

async function saveConfig(event) {
  event.preventDefault();
  const baseUrl = document.getElementById("base-url").value.trim();
  const status = document.getElementById("status");

  await sendMessage({
    type: "set-config",
    config: { baseUrl },
  });

  status.textContent = "地址已保存。";
  setTimeout(() => {
    status.textContent = "";
  }, 2000);
}

async function connectPineSnap() {
  const baseUrl = document.getElementById("base-url").value.trim();
  const status = document.getElementById("status");
  status.textContent = "正在发起连接...";

  try {
    const result = await sendMessage({
      type: "start-auth",
      baseUrl,
    });

    if (!result?.ok) {
      status.textContent = `连接失败：${describeConnectFailure(result)}`;
      return;
    }

    status.textContent = "连接成功。";
    await loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = `连接失败：${message}`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("config-form")
    .addEventListener("submit", (event) => void saveConfig(event));
  document
    .getElementById("connect-btn")
    .addEventListener("click", () => void connectPineSnap());
  void loadConfig();
});
