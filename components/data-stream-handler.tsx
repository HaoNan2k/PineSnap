"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    let shouldRefreshConversations = false;

    for (const delta of newDeltas) {
      // Handle chat title updates - trigger sidebar refresh
      if (delta.type === "data-titleUpdated" || delta.type === "data-conversationId") {
        shouldRefreshConversations = true;
        continue;
      }
    }

    if (shouldRefreshConversations) {
      mutate("/api/conversations");
    }
  }, [dataStream, setDataStream, mutate]);

  return null;
}
