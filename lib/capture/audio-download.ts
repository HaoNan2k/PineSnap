import "server-only";

import { spawn } from "node:child_process";

type AudioCandidate = {
  url: string;
  durationSec?: number;
};

export type DownloadedAudio = {
  bytes: Uint8Array;
  source: "media_candidate" | "yt_dlp";
  sourceUrl: string;
  contentType: string | null;
  originalDurationSec: number | null;
};

type YtDlpInfo = {
  url?: string;
  duration?: number;
  requested_formats?: Array<{ url?: string; vcodec?: string | null }>;
  formats?: Array<{
    url?: string;
    vcodec?: string | null;
    acodec?: string | null;
    protocol?: string;
    abr?: number;
  }>;
};

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  min = 1
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function getDownloadTimeoutMs(): number {
  return parsePositiveInt(process.env.CAPTURE_AUDIO_DOWNLOAD_TIMEOUT_MS, 120_000, 10_000);
}

function getDownloadMaxBytes(): number {
  return parsePositiveInt(process.env.CAPTURE_AUDIO_MAX_BYTES, 150 * 1024 * 1024, 1 * 1024 * 1024);
}

function getYtDlpTimeoutMs(): number {
  return parsePositiveInt(process.env.CAPTURE_YTDLP_TIMEOUT_MS, 60_000, 5_000);
}

function getYtDlpCommand(): string {
  return process.env.CAPTURE_YTDLP_BIN?.trim() || "yt-dlp";
}

function isLikelyAudioFormat(vcodec: string | null | undefined): boolean {
  return typeof vcodec === "string" && vcodec.toLowerCase() === "none";
}

function pickAudioUrlFromInfo(info: YtDlpInfo): string | null {
  if (typeof info.url === "string" && info.url.length > 0) return info.url;

  if (Array.isArray(info.requested_formats)) {
    const fromRequested = info.requested_formats.find((item) =>
      isLikelyAudioFormat(item?.vcodec ?? null)
    );
    if (fromRequested?.url) return fromRequested.url;
  }

  if (Array.isArray(info.formats)) {
    const sorted = [...info.formats].sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0));
    for (const format of sorted) {
      if (!format?.url) continue;
      const audioOnly = isLikelyAudioFormat(format.vcodec ?? null);
      const hasAudioCodec =
        typeof format.acodec === "string" && format.acodec.toLowerCase() !== "none";
      if (audioOnly && hasAudioCodec) return format.url;
    }
  }

  return null;
}

async function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(getYtDlpCommand(), args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("yt-dlp timed out"));
    }, getYtDlpTimeoutMs());

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim() || "unknown error"}`));
    });
  });
}

async function fetchAudioBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getDownloadTimeoutMs());
  const maxBytes = getDownloadMaxBytes();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`audio download failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error(`audio exceeds max bytes: ${maxBytes}`);
      }
      chunks.push(value);
    }

    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return {
      bytes: merged,
      contentType: response.headers.get("content-type"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveYtDlpAudioSource(args: {
  sourceUrl: string;
  userAgent?: string;
}): Promise<{ audioUrl: string; durationSec: number | null }> {
  const baseArgs = ["--no-warnings", "--no-playlist", "--skip-download", "--dump-single-json"];
  const cookiesPath = process.env.CAPTURE_YTDLP_COOKIES_PATH?.trim();
  if (cookiesPath) {
    baseArgs.push("--cookies", cookiesPath);
  }
  if (args.userAgent) {
    baseArgs.push("--user-agent", args.userAgent);
  }

  const stdout = await runYtDlp([...baseArgs, args.sourceUrl]);
  const raw: unknown = JSON.parse(stdout);
  if (!raw || typeof raw !== "object") {
    throw new Error("yt-dlp returned invalid json");
  }

  const info = raw as YtDlpInfo;
  const audioUrl = pickAudioUrlFromInfo(info);
  if (!audioUrl) {
    throw new Error("yt-dlp did not return an audio url");
  }

  return {
    audioUrl,
    durationSec:
      typeof info.duration === "number" && Number.isFinite(info.duration) && info.duration > 0
        ? info.duration
        : null,
  };
}

export async function resolveAudioForAsr(args: {
  sourceUrl: string;
  userAgent?: string;
  candidates?: AudioCandidate[];
}): Promise<DownloadedAudio> {
  const candidates = (args.candidates ?? []).filter((item) => typeof item.url === "string");
  for (const candidate of candidates) {
    try {
      const downloaded = await fetchAudioBytes(candidate.url);
      return {
        bytes: downloaded.bytes,
        source: "media_candidate",
        sourceUrl: candidate.url,
        contentType: downloaded.contentType,
        originalDurationSec:
          typeof candidate.durationSec === "number" && Number.isFinite(candidate.durationSec)
            ? candidate.durationSec
            : null,
      };
    } catch {
      // Try next candidate or yt-dlp fallback.
    }
  }

  const fallback = await resolveYtDlpAudioSource({
    sourceUrl: args.sourceUrl,
    userAgent: args.userAgent,
  });
  const downloaded = await fetchAudioBytes(fallback.audioUrl);
  return {
    bytes: downloaded.bytes,
    source: "yt_dlp",
    sourceUrl: fallback.audioUrl,
    contentType: downloaded.contentType,
    originalDurationSec: fallback.durationSec,
  };
}
