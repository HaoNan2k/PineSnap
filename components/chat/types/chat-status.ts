export const ChatStatus = {
  Submitted: "submitted",
  Streaming: "streaming",
  Ready: "ready",
  Error: "error",
} as const;

export type ChatStatus = (typeof ChatStatus)[keyof typeof ChatStatus];

export const isChatBusy = (status: ChatStatus) =>
  status === ChatStatus.Submitted || status === ChatStatus.Streaming;


