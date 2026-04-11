const RETRYABLE_ERROR_CODES = new Set([
  "NETWORK_ERROR",
  "TIMEOUT",
  "UPSTREAM_5XX",
  "SUBTITLE_FETCH_FAILED",
  "SUBTITLE_TRACK_UNSTABLE",
  "RATE_LIMITED",
  "ASR_AUDIO_FETCH_FAILED",
  "ASR_AUDIO_EXTRACT_FAILED",
  "ASR_UPLOAD_FAILED",
  "ASR_SUBMIT_FAILED",
  "ASR_TIMEOUT",
  "ASR_TRANSCRIPT_ERROR",
]);

export function isRetryableCaptureError(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  return RETRYABLE_ERROR_CODES.has(errorCode);
}
