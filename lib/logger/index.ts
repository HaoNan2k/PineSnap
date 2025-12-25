import "server-only";

import { safeStringify } from "@/lib/utils";

type LogLevel = "INFO" | "WARN" | "ERROR";

const isDev = process.env.NODE_ENV !== "production";

// ANSI color codes for better readability in development
const colors = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
} as const;

function colorize(text: string, color: keyof typeof colors): string {
  if (!isDev) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

function serializeError(err: unknown): string {
  if (err instanceof Error) {
    const stack = typeof err.stack === "string" ? `\n${err.stack}` : "";
    return `${err.name}: ${err.message}${stack}`;
  }
  return safeStringify(err);
}

function serializeContext(context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) return "";
  return ` | ${safeStringify(context)}`;
}

function writeLog(
  level: LogLevel,
  message: string,
  contextOrError?: unknown
): void {
  const ts = new Date().toISOString();
  const coloredTs = colorize(ts, "gray");
  
  let coloredLevel: string;
  
  switch (level) {
    case "INFO":
      coloredLevel = colorize("INFO ", "blue");
      break;
    case "WARN":
      coloredLevel = colorize("WARN ", "yellow");
      break;
    case "ERROR":
      coloredLevel = colorize("ERROR", "red");
      break;
  }
  
  // Handle both error objects and context objects
  let suffix = "";
  if (contextOrError !== undefined) {
    if (contextOrError instanceof Error || (typeof contextOrError === "object" && contextOrError !== null && "stack" in contextOrError)) {
      suffix = ` | ${serializeError(contextOrError)}`;
    } else if (typeof contextOrError === "object") {
      suffix = serializeContext(contextOrError as Record<string, unknown>);
    } else {
      suffix = ` | ${String(contextOrError)}`;
    }
  }
  
  const output = `${coloredTs} ${coloredLevel} ${message}${suffix}\n`;
  
  // INFO goes to stdout, WARN and ERROR go to stderr
  if (level === "INFO") {
    process.stdout.write(output);
  } else {
    process.stderr.write(output);
  }
}

/**
 * Log informational message (development insights, request logs, etc.)
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  writeLog("INFO", message, context);
}

/**
 * Log warning message (recoverable issues, deprecated usage, etc.)
 */
export function logWarn(message: string, contextOrError?: unknown): void {
  writeLog("WARN", message, contextOrError);
}

/**
 * Log error message (unrecoverable failures, exceptions, etc.)
 */
export function logError(message: string, error?: unknown): void {
  writeLog("ERROR", message, error);
}

