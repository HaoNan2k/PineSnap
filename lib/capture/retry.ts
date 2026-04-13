const RETRYABLE_ERROR_CODES = new Set([
  "NETWORK_ERROR",
  "TIMEOUT",
  "UPSTREAM_5XX",
  "SUBTITLE_FETCH_FAILED",
  "SUBTITLE_TRACK_UNSTABLE",
  "RATE_LIMITED",
]);

export function isRetryableCaptureError(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  return RETRYABLE_ERROR_CODES.has(errorCode);
}
