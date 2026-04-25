// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  KeyMomentSchema,
  SummaryOutputSchema,
} from "@/lib/summary/schema";

describe("KeyMomentSchema", () => {
  it("accepts a valid moment with non-negative integer seconds", () => {
    const result = KeyMomentSchema.safeParse({
      label: "介绍",
      seconds: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative seconds", () => {
    const result = KeyMomentSchema.safeParse({
      label: "介绍",
      seconds: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer seconds", () => {
    const result = KeyMomentSchema.safeParse({
      label: "介绍",
      seconds: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty label", () => {
    const result = KeyMomentSchema.safeParse({
      label: "",
      seconds: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects label longer than 120 characters", () => {
    const result = KeyMomentSchema.safeParse({
      label: "x".repeat(121),
      seconds: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe("SummaryOutputSchema", () => {
  it("accepts a complete output with empty keyMoments", () => {
    const result = SummaryOutputSchema.safeParse({
      oneLineSummary: "一句话概括内容。",
      markdown: "## 概要\n\n这里是正文。",
      keyMoments: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts video-style output with multiple keyMoments", () => {
    const result = SummaryOutputSchema.safeParse({
      oneLineSummary: "一句话概括。",
      markdown: "## 概要\n正文",
      keyMoments: [
        { label: "开场", seconds: 0 },
        { label: "演示", seconds: 120 },
        { label: "总结", seconds: 480 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty oneLineSummary", () => {
    const result = SummaryOutputSchema.safeParse({
      oneLineSummary: "",
      markdown: "正文",
      keyMoments: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects oneLineSummary longer than 160 characters", () => {
    const result = SummaryOutputSchema.safeParse({
      oneLineSummary: "x".repeat(161),
      markdown: "正文",
      keyMoments: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty markdown", () => {
    const result = SummaryOutputSchema.safeParse({
      oneLineSummary: "概括",
      markdown: "",
      keyMoments: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects when keyMoments contains an invalid entry", () => {
    const result = SummaryOutputSchema.safeParse({
      oneLineSummary: "概括",
      markdown: "正文",
      keyMoments: [{ label: "开场", seconds: -1 }],
    });
    expect(result.success).toBe(false);
  });
});
