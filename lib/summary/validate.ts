const MAX_HTML_BYTES = 500 * 1024;

export type ValidateResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateArtifactHtml(html: string): ValidateResult {
  if (!html || html.trim().length === 0) {
    return { valid: false, reason: "AI returned empty HTML" };
  }
  if (!html.includes("<!DOCTYPE")) {
    return { valid: false, reason: "Missing <!DOCTYPE declaration" };
  }
  if (!html.includes("</html>")) {
    return {
      valid: false,
      reason: "Missing closing </html> tag (likely truncated by output token limit)",
    };
  }
  const byteLength = new TextEncoder().encode(html).length;
  if (byteLength > MAX_HTML_BYTES) {
    return {
      valid: false,
      reason: `HTML size ${byteLength} bytes exceeds ${MAX_HTML_BYTES} limit`,
    };
  }
  return { valid: true };
}
