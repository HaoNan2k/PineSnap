import type { ToolResultOutput } from "./tool-result-output";

export type ChatTextPart = {
  type: "text";
  text: string;
};

export type ChatFilePart = {
  type: "file";
  /** Display name for the file (UI-friendly). */
  name: string;
  /** IANA media type, e.g. "image/png". */
  mediaType: string;
  /**
   * Internal reference key for the file (e.g. "uploads/2023/xyz.png").
   * Must be resolved by the server to a URL or data content.
   */
  ref: string;
  /** Optional size in bytes. */
  size?: number;
};

export type ChatToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  /** Input arguments of the tool call. */
  input: unknown;
};

export type ChatToolResultPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  /** Output of the tool call. */
  output: ToolResultOutput;
  /**
   * Optional: whether this tool result represents an error.
   * (AI SDK 6 beta represents tool errors as separate parts; we keep this for compatibility.)
   */
  isError?: boolean;
};

export type ChatSourcePart = {
  type: "source";
  /** Provider-defined source type. Common values: "url", "document". */
  sourceType: string;
  id: string;
  url?: string;
  title?: string;
  mediaType?: string;
  filename?: string;
};

export type ChatPart =
  | ChatTextPart
  | ChatFilePart
  | ChatToolCallPart
  | ChatToolResultPart
  | ChatSourcePart;

// Internal representation of a message content, agnostic of DB or UI SDK
export interface ChatMessageContent {
  parts: ChatPart[];
}
