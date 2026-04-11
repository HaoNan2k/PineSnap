import "server-only";

import { logError } from "@/lib/logger";

type AssemblyAiStatus = "queued" | "processing" | "completed" | "error";

type AssemblyAiWord = {
  text: string;
  start: number;
  end: number;
  confidence?: number;
};

type AssemblyAiUtterance = {
  text: string;
  start: number;
  end: number;
  confidence?: number;
  speaker?: string | null;
};

export type AssemblyAiTranscript = {
  id: string;
  status: AssemblyAiStatus;
  error?: string;
  text?: string | null;
  language_code?: string;
  language_confidence?: number | null;
  speech_model_used?: string | null;
  speech_models?: string[] | null;
  audio_duration?: number | null;
  audio_end_at?: number | null;
  words?: AssemblyAiWord[] | null;
  utterances?: AssemblyAiUtterance[] | null;
};

type SubmitTranscriptResponse = { id: string };
type UploadResponse = { upload_url: string };

function getAssemblyAiBaseUrl(): string {
  const explicit = process.env.ASSEMBLYAI_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const region = process.env.ASSEMBLYAI_REGION?.trim().toLowerCase();
  if (region === "eu") return "https://api.eu.assemblyai.com";
  return "https://api.assemblyai.com";
}

function getAssemblyAiApiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing ASSEMBLYAI_API_KEY");
  }
  return key;
}

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

function buildHeaders(): Record<string, string> {
  return {
    authorization: getAssemblyAiApiKey(),
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => ({}));
  return payload as T;
}

export async function uploadAudioToAssemblyAi(audioBytes: Uint8Array): Promise<string> {
  const response = await fetch(`${getAssemblyAiBaseUrl()}/v2/upload`, {
    method: "POST",
    headers: {
      ...buildHeaders(),
      "content-type": "application/octet-stream",
    },
    body: audioBytes,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`AssemblyAI upload failed (${response.status}): ${body || "unknown error"}`);
  }

  const data = await parseJson<UploadResponse>(response);
  if (!data.upload_url || typeof data.upload_url !== "string") {
    throw new Error("AssemblyAI upload response missing upload_url");
  }

  return data.upload_url;
}

export async function submitAssemblyAiTranscript(args: {
  uploadUrl: string;
  speechModels?: string[];
  audioStartFromMs?: number;
  audioEndAtMs?: number;
}): Promise<string> {
  const response = await fetch(`${getAssemblyAiBaseUrl()}/v2/transcript`, {
    method: "POST",
    headers: {
      ...buildHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: args.uploadUrl,
      speech_models: args.speechModels ?? ["universal-2"],
      language_detection: true,
      language_detection_options: {
        expected_languages: ["zh", "en"],
        fallback_language: "auto",
        code_switching: true,
      },
      audio_start_from: args.audioStartFromMs ?? 0,
      audio_end_at: args.audioEndAtMs ?? 5_400_000,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`AssemblyAI submit failed (${response.status}): ${body || "unknown error"}`);
  }

  const data = await parseJson<SubmitTranscriptResponse>(response);
  if (!data.id || typeof data.id !== "string") {
    throw new Error("AssemblyAI submit response missing id");
  }

  return data.id;
}

export async function pollAssemblyAiTranscript(transcriptId: string): Promise<AssemblyAiTranscript> {
  const intervalMs = parsePositiveInt(process.env.ASSEMBLYAI_POLL_INTERVAL_MS, 3_000, 500);
  const timeoutMs = parsePositiveInt(process.env.ASSEMBLYAI_POLL_TIMEOUT_MS, 600_000, 10_000);
  const deadline = Date.now() + timeoutMs;
  const endpoint = `${getAssemblyAiBaseUrl()}/v2/transcript/${transcriptId}`;

  while (Date.now() < deadline) {
    const response = await fetch(endpoint, {
      headers: buildHeaders(),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`AssemblyAI poll failed (${response.status}): ${body || "unknown error"}`);
    }

    const transcript = await parseJson<AssemblyAiTranscript>(response);
    if (transcript.status === "completed") return transcript;
    if (transcript.status === "error") {
      throw new Error(transcript.error || "AssemblyAI transcript failed");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  logError("AssemblyAI poll timeout", { transcriptId, timeoutMs });
  throw new Error("AssemblyAI transcript polling timeout");
}
