const STORAGE_KEY = "pinesnap-bilibili-capture-config";
const DEFAULT_BASE_URL = "http://localhost:3000";

function normalizeConfig(config) {
  return {
    baseUrl: typeof config?.baseUrl === "string" ? config.baseUrl.trim() : "",
    token: typeof config?.token === "string" ? config.token.trim() : "",
    tokenId: typeof config?.tokenId === "string" ? config.tokenId.trim() : "",
    connectedAt:
      typeof config?.connectedAt === "string" ? config.connectedAt.trim() : "",
  };
}

async function getConfig() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeConfig(stored[STORAGE_KEY]);
}

async function setConfig(config) {
  const previous = await getConfig();
  const normalized = normalizeConfig({ ...previous, ...config });
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  return normalized;
}

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBase64Url(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return toBase64Url(array.buffer);
}

async function sha256Base64Url(input) {
  const buffer = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return toBase64Url(digest);
}

function normalizeBaseUrl(baseUrl) {
  const trimmed = (baseUrl || "").trim();
  const fallback = trimmed.length > 0 ? trimmed : DEFAULT_BASE_URL;
  return fallback.replace(/\/+$/, "");
}

function describeExchangeFailure(status, body) {
  if (body?.error === "invalid_grant") {
    return "授权码已过期或已使用，请重新点击“连接 PineSnap”。";
  }
  if (body?.error === "invalid_request") {
    return "授权参数不匹配，请重新发起连接。";
  }
  if (status === 401 || status === 403) {
    return "当前登录状态不可用，请先登录 PineSnap 后重试。";
  }
  if (typeof body?.errorDescription === "string" && body.errorDescription.trim()) {
    return body.errorDescription.trim();
  }
  return body?.error || `HTTP ${status}`;
}

async function startAuth(rawBaseUrl) {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const redirectUri = chrome.identity.getRedirectURL("pinesnap-capture");
  const state = randomBase64Url(24);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  const authorizeUrl = new URL(`${baseUrl}/connect/bilibili/authorize`);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);

  const callbackUrl = await chrome.identity.launchWebAuthFlow({
    url: authorizeUrl.toString(),
    interactive: true,
  });
  if (!callbackUrl) {
    throw new Error("Authorization flow cancelled");
  }

  const callback = new URL(callbackUrl);
  const code = callback.searchParams.get("code");
  const returnedState = callback.searchParams.get("state");
  if (!code || !returnedState) {
    throw new Error("Authorization callback missing code/state");
  }
  if (returnedState !== state) {
    throw new Error("State mismatch");
  }

  const exchange = await fetch(`${baseUrl}/api/capture/extension/exchange`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      code,
      codeVerifier,
      state,
      redirectUri,
    }),
  });

  const body = await exchange.json().catch(() => ({}));
  if (!exchange.ok || !body?.token) {
    return {
      ok: false,
      status: exchange.status,
      error: describeExchangeFailure(exchange.status, body),
    };
  }

  const config = await setConfig({
    baseUrl,
    token: body.token,
    tokenId: typeof body.tokenId === "string" ? body.tokenId : "",
    connectedAt: new Date().toISOString(),
  });
  return { ok: true, config };
}

async function fetchJson(url, options = {}) {
  const requestedCredentials =
    typeof options.credentials === "string" ? options.credentials : null;
  let credentials = requestedCredentials || "omit";

  if (!requestedCredentials) {
    try {
      const target = new URL(url);
      if (target.hostname === "api.bilibili.com") {
        credentials = "include";
      }
    } catch {
      credentials = "omit";
    }
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.headers || {},
    credentials,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: await response.text(),
    };
  }

  return {
    ok: true,
    status: response.status,
    data: await response.json(),
  };
}

async function uploadCapture(baseUrl, token, payload) {
  const sourceUrl =
    typeof payload?.metadata?.url === "string" && payload.metadata.url.trim()
      ? payload.metadata.url.trim()
      : "";
  const sourceId =
    typeof payload?.metadata?.id === "string" ? payload.metadata.id : "";
  const provider =
    typeof payload?.content?.transcript?.provider === "string"
      ? payload.content.transcript.provider
      : typeof payload?.content?.summary?.provider === "string"
        ? payload.content.summary.provider
        : "unknown";
  const digestInput = `${sourceUrl}|${sourceId}|${provider}`;
  const digestBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(digestInput)
  );
  const digestHex = Array.from(new Uint8Array(digestBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const captureRequestId = digestHex.slice(0, 32);

  let artifact = null;
  if (payload?.content?.transcript) {
    artifact = {
      kind: "official_subtitle",
      language:
        typeof payload.content.transcript.language === "string"
          ? payload.content.transcript.language
          : undefined,
      format: "cue_lines",
      content: payload.content.transcript,
      isPrimary: true,
    };
  } else if (payload?.content?.summary) {
    artifact = {
      kind: "summary",
      format: "json",
      content: payload.content.summary,
      isPrimary: true,
    };
  }

  const requestBody = {
    captureContext: {
      schemaVersion: 1,
      sourceType: "bilibili",
      sourceUrl,
      captureRequestId,
      capturedAt: new Date().toISOString(),
      providerContext: {
        bilibili: {
          bvid: sourceId || undefined,
        },
      },
    },
    title:
      typeof payload?.metadata?.title === "string" && payload.metadata.title.trim()
        ? `B站：${payload.metadata.title.trim()}`.slice(0, 80)
        : "B站采集",
    thumbnailUrl:
      typeof payload?.metadata?.cover === "string" && payload.metadata.cover.trim()
        ? payload.metadata.cover.trim()
        : undefined,
    artifact: artifact || undefined,
  };

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/capture/jobs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body,
    };
  }

  return {
    ok: true,
    status: response.status,
    body,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "get-config":
        sendResponse({ ok: true, config: await getConfig() });
        return;
      case "set-config":
        sendResponse({ ok: true, config: await setConfig(message.config) });
        return;
      case "start-auth":
        sendResponse(await startAuth(message.baseUrl));
        return;
      case "fetch-json":
        sendResponse(await fetchJson(message.url, message.options));
        return;
      case "upload-capture":
        sendResponse(
          await uploadCapture(message.baseUrl, message.token, message.payload)
        );
        return;
      default:
        sendResponse({ ok: false, error: "Unsupported message type" });
    }
  })().catch((error) => {
    sendResponse({
      ok: false,
      error: String(error instanceof Error ? error.message : error),
    });
  });

  return true;
});
