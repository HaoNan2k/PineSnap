import { ChatPart } from "./types";
import type { UIMessage } from "ai";

function isChatPart(p: unknown): p is ChatPart {
  return (
    typeof p === 'object' &&
    p !== null &&
    'type' in p &&
    (p as { type: unknown }).type === 'text' &&
    'text' in p &&
    typeof (p as { text: unknown }).text === 'string'
  );
}

// Helper to parse DB jsonb to ChatPart[]
export function parseMessageParts(parts: unknown): ChatPart[] {
  if (Array.isArray(parts)) {
    // Basic validation
    return parts.filter(isChatPart);
  }
  return [];
}

// Helper to convert plain text content to parts (legacy support)
export function textToParts(text: string): ChatPart[] {
  return [{ type: "text", text }];
}

export function convertToUIMessages(dbMessages: Array<{
  id: string;
  role: string;
  parts: unknown;
  createdAt: Date;
}>): UIMessage[] {
  return dbMessages.map((m) => {
    const parts = parseMessageParts(m.parts);
    const textContent = parts.map(p => p.text).join('\n');
    
    const role = (['system', 'user', 'assistant', 'data'].includes(m.role) 
      ? m.role 
      : 'user') as UIMessage['role'];

    // We construct a UIMessage compatible object
    // Casting as any/UIMessage to satisfy the compiler if definition is strict
    return {
      id: m.id,
      role: role,
      content: textContent,
      parts: parts.map(p => ({ type: 'text', text: p.text })),
      createdAt: m.createdAt,
    } as unknown as UIMessage;
  });
}
