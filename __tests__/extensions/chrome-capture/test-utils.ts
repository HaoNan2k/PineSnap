import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EXT_ROOT = resolve(process.cwd(), "extensions/chrome-capture");

/**
 * 在 jsdom 环境里加载扩展的 IIFE 脚本（通过文件路径相对 extensions/chrome-capture）。
 * 每个脚本会向 globalThis.PineSnapCapture 注册自己。
 */
export function loadExtensionScript(relativePath: string): void {
  const fullPath = resolve(EXT_ROOT, relativePath);
  const source = readFileSync(fullPath, "utf-8");
  // 用 new Function 隔离作用域执行，等价于 <script> 注入
  const exec = new Function(source);
  exec.call(globalThis);
}

/**
 * 重置 globalThis.PineSnapCapture，确保每个 test 独立。
 */
export function resetCaptureGlobal(): void {
  // @ts-expect-error - 测试环境的 jsdom global
  delete globalThis.PineSnapCapture;
}

/**
 * 加载 fixture HTML，返回 jsdom 解析后的 Document。
 * fixture 不存在时返回 null（让测试 skip 或断言提示）。
 */
export function loadFixtureDocument(name: string): Document | null {
  const path = resolve(
    EXT_ROOT,
    "..",
    "..",
    "__tests__/extensions/chrome-capture/fixtures",
    name
  );
  if (!existsSync(path)) return null;
  const html = readFileSync(path, "utf-8");
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}
