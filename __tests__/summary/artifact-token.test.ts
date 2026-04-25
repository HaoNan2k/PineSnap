// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ORIGINAL_SECRET = process.env.ARTIFACT_TOKEN_SECRET;

async function loadFreshModule() {
  vi.resetModules();
  return import("@/lib/summary/artifact-token");
}

describe("artifact-token", () => {
  beforeEach(() => {
    process.env.ARTIFACT_TOKEN_SECRET = "test-secret-do-not-use-in-prod";
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.ARTIFACT_TOKEN_SECRET;
    else process.env.ARTIFACT_TOKEN_SECRET = ORIGINAL_SECRET;
  });

  it("signs and verifies a valid token", async () => {
    const { signArtifactToken, verifyArtifactToken } = await loadFreshModule();
    const token = signArtifactToken({ summaryId: "sum-1", userId: "user-1" });
    const payload = verifyArtifactToken(token, "sum-1");
    expect(payload).not.toBeNull();
    expect(payload?.summaryId).toBe("sum-1");
    expect(payload?.userId).toBe("user-1");
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects token whose summaryId does not match", async () => {
    const { signArtifactToken, verifyArtifactToken } = await loadFreshModule();
    const token = signArtifactToken({ summaryId: "sum-1", userId: "user-1" });
    expect(verifyArtifactToken(token, "sum-2")).toBeNull();
  });

  it("rejects expired token", async () => {
    const { signArtifactToken, verifyArtifactToken } = await loadFreshModule();
    const token = signArtifactToken({
      summaryId: "sum-1",
      userId: "user-1",
      ttlSeconds: -1,
    });
    expect(verifyArtifactToken(token, "sum-1")).toBeNull();
  });

  it("rejects tampered signature", async () => {
    const { signArtifactToken, verifyArtifactToken } = await loadFreshModule();
    const token = signArtifactToken({ summaryId: "sum-1", userId: "user-1" });
    const [payload, sig] = token.split(".");
    const tampered = `${payload}.${sig.replace(/.$/, (c) => (c === "0" ? "1" : "0"))}`;
    expect(verifyArtifactToken(tampered, "sum-1")).toBeNull();
  });

  it("rejects tampered payload (signature no longer matches)", async () => {
    const { signArtifactToken, verifyArtifactToken } = await loadFreshModule();
    const token = signArtifactToken({ summaryId: "sum-1", userId: "user-1" });
    const [, sig] = token.split(".");
    const fakePayload = Buffer.from(
      JSON.stringify({ summaryId: "sum-2", userId: "user-1", exp: 9999999999 })
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(verifyArtifactToken(`${fakePayload}.${sig}`, "sum-2")).toBeNull();
  });

  it("rejects malformed token", async () => {
    const { verifyArtifactToken } = await loadFreshModule();
    expect(verifyArtifactToken("not-a-token", "sum-1")).toBeNull();
    expect(verifyArtifactToken("", "sum-1")).toBeNull();
    expect(verifyArtifactToken(".", "sum-1")).toBeNull();
    expect(verifyArtifactToken("abc.", "sum-1")).toBeNull();
    expect(verifyArtifactToken(".abc", "sum-1")).toBeNull();
  });

  it("rejects token signed with a different secret", async () => {
    const { signArtifactToken } = await loadFreshModule();
    const token = signArtifactToken({ summaryId: "sum-1", userId: "user-1" });

    process.env.ARTIFACT_TOKEN_SECRET = "different-secret";
    const { verifyArtifactToken } = await loadFreshModule();
    expect(verifyArtifactToken(token, "sum-1")).toBeNull();
  });
});
