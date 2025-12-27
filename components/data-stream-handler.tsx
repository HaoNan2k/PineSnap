"use client";

import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    let shouldRefreshConversations = false;

    for (const delta of newDeltas) {
      if (delta.type === "data-titleUpdated" || delta.type === "data-conversationId") {
        shouldRefreshConversations = true;
        continue;
      }
    }

    if (shouldRefreshConversations) {
      utils.conversation.list.invalidate();
    }
  }, [dataStream, setDataStream, utils]);

  return null;
}
