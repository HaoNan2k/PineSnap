import "server-only";

import { captureContextSchema } from "@/lib/capture/context";
import { resolveAudioForAsr } from "@/lib/capture/audio-download";
import {
  pollAssemblyAiTranscript,
  submitAssemblyAiTranscript,
  uploadAudioToAssemblyAi,
} from "@/lib/capture/assemblyai";

type CapturedLine = {
  startMs: number;
  startLabel: string;
  text: string;
};

function isAsciiWord(text: string): boolean {
  return /^[\w'"-]+$/.test(text);
}

function joinWord(previous: string, next: string): string {
  if (!previous) return next;
  const previousLast = previous.at(-1) ?? "";
  const nextFirst = next.at(0) ?? "";
  if (isAsciiWord(previousLast) && isAsciiWord(nextFirst)) {
    return `${previous} ${next}`;
  }
  return `${previous}${next}`;
}

function formatStartLabel(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function linesFromUtterances(
  utterances: Array<{ start: number; text: string; speaker?: string | null }>
): CapturedLine[] {
  return utterances
    .map((utterance) => {
      const text = utterance.text.trim();
      if (!text) return null;
      const startMs = Math.max(0, Math.floor(utterance.start));
      return {
        startMs,
        startLabel: formatStartLabel(startMs),
        text,
      };
    })
    .filter((line): line is CapturedLine => Boolean(line));
}

function linesFromWords(words: Array<{ start: number; text: string }>): CapturedLine[] {
  const lines: CapturedLine[] = [];
  let currentStartMs = -1;
  let currentText = "";

  const flush = () => {
    const text = currentText.trim();
    if (currentStartMs >= 0 && text) {
      lines.push({
        startMs: currentStartMs,
        startLabel: formatStartLabel(currentStartMs),
        text,
      });
    }
    currentStartMs = -1;
    currentText = "";
  };

  for (const word of words) {
    const text = word.text.trim();
    if (!text) continue;
    const startMs = Math.max(0, Math.floor(word.start));

    if (currentStartMs < 0) {
      currentStartMs = startMs;
      currentText = text;
      continue;
    }

    const exceedsWindow = startMs - currentStartMs >= 4_000;
    const endsSentence = /[。！？.!?]$/.test(currentText);
    if (exceedsWindow || endsSentence) {
      flush();
      currentStartMs = startMs;
      currentText = text;
      continue;
    }

    currentText = joinWord(currentText, text);
  }

  flush();
  return lines;
}

function mapTranscriptToLines(args: {
  utterances?: Array<{ start: number; text: string; speaker?: string | null }> | null;
  words?: Array<{ start: number; text: string }> | null;
}): CapturedLine[] {
  if (args.utterances && args.utterances.length > 0) {
    const lines = linesFromUtterances(args.utterances);
    if (lines.length > 0) return lines;
  }

  if (args.words && args.words.length > 0) {
    const lines = linesFromWords(args.words);
    if (lines.length > 0) return lines;
  }

  return [];
}

export type ProcessedAsrJob = {
  schemaVersion: number;
  language: string | null;
  qualityScore: number | null;
  content: {
    provider: string;
    language?: string;
    lines: CapturedLine[];
    text: string;
    metadata: {
      providerRequestId: string;
      modelRequested: string[];
      modelUsed: string | null;
      endpoint: string;
      region: "us" | "eu";
      trimmed: boolean;
      originalDurationSec: number | null;
      processedDurationSec: number;
      trimRangeMs: [number, number];
      source: "media_candidate" | "bilibili_api" | "yt_dlp";
      sourceUrl: string;
      contentType: string | null;
      languageConfidence: number | null;
    };
  };
};

export async function processAudioTranscribeJob(args: {
  inputContext: unknown;
}): Promise<ProcessedAsrJob> {
  const parsedContext = captureContextSchema.safeParse(args.inputContext);
  if (!parsedContext.success) {
    throw new Error("Invalid capture inputContext for audio transcribe job");
  }

  const captureContext = parsedContext.data;
  const audioCandidates = (captureContext.mediaCandidates ?? [])
    .filter((item) => item.kind === "audio")
    .map((item) => ({ url: item.url, durationSec: item.durationSec }));

  const downloaded = await resolveAudioForAsr({
    sourceUrl: captureContext.sourceUrl,
    userAgent: captureContext.accessContext?.userAgent,
    referer: captureContext.accessContext?.referer,
    bvid: captureContext.providerContext?.bilibili?.bvid,
    candidates: audioCandidates,
  });

  const uploadUrl = await uploadAudioToAssemblyAi(downloaded.bytes);
  const transcriptId = await submitAssemblyAiTranscript({
    uploadUrl,
    speechModels: ["universal-2"],
    audioStartFromMs: 0,
    audioEndAtMs: 5_400_000,
  });
  const transcript = await pollAssemblyAiTranscript(transcriptId);
  const lines = mapTranscriptToLines({
    utterances: transcript.utterances ?? null,
    words: transcript.words ?? null,
  });

  if (lines.length === 0 && !transcript.text?.trim()) {
    throw new Error("ASR transcript returned empty content");
  }

  const processedDurationSec = Math.min(5_400, transcript.audio_duration ?? 5_400);
  const originalDurationSec =
    typeof downloaded.originalDurationSec === "number" &&
    Number.isFinite(downloaded.originalDurationSec)
      ? downloaded.originalDurationSec
      : transcript.audio_duration ?? null;
  const trimmed = typeof originalDurationSec === "number" && originalDurationSec > 5_400;
  const region = process.env.ASSEMBLYAI_REGION?.trim().toLowerCase() === "eu" ? "eu" : "us";

  return {
    schemaVersion: captureContext.schemaVersion,
    language: transcript.language_code ?? null,
    qualityScore:
      typeof transcript.language_confidence === "number"
        ? Math.max(0, Math.min(1, transcript.language_confidence))
        : null,
    content: {
      provider: "assemblyai",
      language: transcript.language_code ?? undefined,
      lines,
      text: transcript.text?.trim() || lines.map((line) => line.text).join("\n"),
      metadata: {
        providerRequestId: transcriptId,
        modelRequested: transcript.speech_models ?? ["universal-2"],
        modelUsed: transcript.speech_model_used ?? null,
        endpoint: "/v2/upload+/v2/transcript",
        region,
        trimmed,
        originalDurationSec,
        processedDurationSec,
        trimRangeMs: [0, 5_400_000],
        source: downloaded.source,
        sourceUrl: downloaded.sourceUrl,
        contentType: downloaded.contentType,
        languageConfidence: transcript.language_confidence ?? null,
      },
    },
  };
}
