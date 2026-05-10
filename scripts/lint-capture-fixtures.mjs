#!/usr/bin/env node
/**
 * Capture fixture privacy lint.
 *
 * 单一真相：CLI（`pnpm lint:fixtures`）与 vitest fixtures-driver 共用此模块。
 * 用法：
 *   - CLI：`node scripts/lint-capture-fixtures.mjs [fixturesDir]`
 *   - 测试 import：`import { runLint } from "../../../scripts/lint-capture-fixtures.mjs"`
 *
 * 决策依据：docs/decisions/0007-capture-extractor-test-architecture.md
 * Spec：openspec/changes/establish-capture-extractor-fixture-tests/specs/capture-extractor-quality/spec.md
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RULES = [
  { name: "cookie-header", regex: /\bcookie\s*:/i },
  { name: "set-cookie-header", regex: /\bset-cookie\s*:/i },
  { name: "authorization-header", regex: /\bauthorization\s*:/i },
  { name: "bearer-token", regex: /\bBearer\s+[A-Za-z0-9._-]{8,}/i },
  { name: "token-query-param", regex: /[?&]token=[^&"\s]{8,}/i },
  {
    name: "access-token",
    regex: /\baccess[_-]?token\b\s*[:=]\s*['"]?[A-Za-z0-9._-]{8,}/i,
  },
  {
    name: "real-email",
    regex: /\b[A-Za-z0-9._%+-]+@(gmail|hotmail|outlook|qq|163|126|foxmail)\.com\b/i,
  },
  {
    name: "cn-id-card",
    regex:
      /\b[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[012])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/,
  },
  { name: "phone-cn-mobile", regex: /\b1[3-9]\d{9}\b/ },
];

function shortSnippet(line, maxLen = 80) {
  const trimmed = line.trim();
  return trimmed.length <= maxLen ? trimmed : trimmed.slice(0, maxLen) + "…";
}

function listHtmlFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listHtmlFiles(full));
    } else if (entry.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} fixturesDir
 * @returns {{ ok: boolean, hits: Array<{file:string,line:number,rule:string,snippet:string}>, filesScanned: number }}
 */
export function runLint(fixturesDir) {
  const files = listHtmlFiles(fixturesDir);
  const hits = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const rule of RULES) {
        if (rule.regex.test(line)) {
          hits.push({
            file,
            line: i + 1,
            rule: rule.name,
            snippet: shortSnippet(line),
          });
        }
      }
    }
  }
  return { ok: hits.length === 0, hits, filesScanned: files.length };
}

const isCli = (() => {
  try {
    return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isCli) {
  const here = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(here, "..");
  const dir =
    process.argv[2] ||
    join(projectRoot, "__tests__/extensions/chrome-capture/fixtures");
  const result = runLint(dir);
  if (!result.ok) {
    console.error(`[lint:fixtures] ${result.hits.length} hit(s) in ${result.filesScanned} file(s):`);
    for (const h of result.hits) {
      console.error(`  ${h.file}:${h.line}  [${h.rule}]  ${h.snippet}`);
    }
    process.exit(1);
  }
  console.log(`[lint:fixtures] OK — ${result.filesScanned} file(s) scanned, no privacy hits.`);
}
