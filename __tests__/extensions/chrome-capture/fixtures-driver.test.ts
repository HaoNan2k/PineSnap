// @vitest-environment node
import { describe, test, expect } from "vitest";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { join, basename } from "node:path";
import { Defuddle } from "defuddle/node";
import type { DefuddleResponse } from "defuddle";
import { runLint } from "../../../scripts/lint-capture-fixtures.mjs";

/**
 * Snapshot-diff fixture driver for the generic-article extractor.
 *
 * 模式照抄 Defuddle 自家 tests/fixtures.test.ts：
 *   1. 自动发现 fixtures/generic--*.html
 *   2. 跑真实 Defuddle 抽取
 *   3. 首次跑写 expected/{name}.md 作为 baseline
 *   4. 后续严格 diff
 *   5. 删除 expected 文件触发重建
 *
 * 详见 docs/decisions/0007-capture-extractor-test-architecture.md
 */

const FIXTURES_DIR = join(__dirname, "fixtures");
const EXPECTED_DIR = join(__dirname, "expected");
const FIXTURE_GLOB_PREFIX = "generic--";

interface Fixture {
  name: string;
  path: string;
  url: string;
  capturedAt?: string;
}

function discoverFixtures(): Fixture[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  return readdirSync(FIXTURES_DIR)
    .filter((f) => f.startsWith(FIXTURE_GLOB_PREFIX) && f.endsWith(".html"))
    .sort()
    .map((file) => {
      const path = join(FIXTURES_DIR, file);
      const html = readFileSync(path, "utf-8");
      const fm = parseFrontmatter(html);
      const name = basename(file, ".html");
      return {
        name,
        path,
        url: fm.url || `https://fixture.local/${name}`,
        capturedAt: fm.capturedAt,
      };
    });
}

function parseFrontmatter(html: string): { url?: string; capturedAt?: string } {
  const match = html.match(/<!--\s*(\{[\s\S]*?\})\s*-->/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

function expectedPath(name: string): string {
  return join(EXPECTED_DIR, `${name}.md`);
}

function buildComparable(response: DefuddleResponse): string {
  const metadataOnly = {
    title: response.title,
    author: response.author || null,
    site: response.site || null,
    published: response.published || null,
    domain: response.domain,
    wordCount: response.wordCount,
  };
  const preamble = "```json\n" + JSON.stringify(metadataOnly, null, 2) + "\n```\n\n";
  return preamble + (response.contentMarkdown ?? "");
}

function ensureExpectedDir(): void {
  if (!existsSync(EXPECTED_DIR)) {
    mkdirSync(EXPECTED_DIR, { recursive: true });
  }
}

describe("Capture extractor fixture driver (generic-article)", () => {
  test("fixtures pass privacy lint", () => {
    const result = runLint(FIXTURES_DIR) as {
      ok: boolean;
      hits: Array<{ file: string; line: number; rule: string; snippet: string }>;
    };
    if (!result.ok) {
      const summary = result.hits
        .map((h) => `  ${h.file}:${h.line}  [${h.rule}] ${h.snippet}`)
        .join("\n");
      throw new Error(`Fixture privacy lint failed:\n${summary}`);
    }
    expect(result.ok).toBe(true);
  });

  const fixtures = discoverFixtures();

  test("at least one fixture exists (generic--*.html)", () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  if (fixtures.length === 0) return;

  test.each(fixtures)("fixture: $name", async ({ name, path, url }) => {
    const html = readFileSync(path, "utf-8");
    const response = await Defuddle(html, url, { separateMarkdown: true });

    expect(response.content.length).toBeGreaterThan(0);
    expect((response.contentMarkdown ?? "").length).toBeGreaterThan(0);

    const result = buildComparable(response);
    const expectedFile = expectedPath(name);

    if (!existsSync(expectedFile)) {
      ensureExpectedDir();
      writeFileSync(expectedFile, result, "utf-8");
      console.log(`[fixture-driver] wrote baseline: ${name}`);
      return;
    }

    const expected = readFileSync(expectedFile, "utf-8");
    expect(result.trim()).toEqual(expected.trim());
  });
});
