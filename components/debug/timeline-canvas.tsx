"use client";

import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { MessageCard, type DebugMessage } from "./message-card";

type Conversation = {
  id: string;
  kind: "canvas" | "chat";
  messages: DebugMessage[];
};

type LaidOutCard = {
  message: DebugMessage;
  conversationKind: "canvas" | "chat";
  prevCreatedAt?: string;
  topPx: number;
  side: "left" | "right";
};

const ZOOM_OPTIONS = [4, 8, 16, 32, 64] as const;
const MIN_GAP_PX = 8;

export function TimelineCanvas({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const [pxPerSecond, setPxPerSecond] = useState<number>(8);
  const [showDeleted, setShowDeleted] = useState(false);

  const canvas = conversations.find((c) => c.kind === "canvas");
  const chat = conversations.find((c) => c.kind === "chat");

  const filtered = useMemo(() => {
    return {
      canvasMsgs:
        canvas?.messages.filter((m) => showDeleted || !m.deletedAt) ?? [],
      chatMsgs: chat?.messages.filter((m) => showDeleted || !m.deletedAt) ?? [],
    };
  }, [canvas, chat, showDeleted]);

  const { earliestMs, layout, totalHeight } = useMemo(() => {
    return computeLayout(
      filtered.canvasMsgs,
      filtered.chatMsgs,
      pxPerSecond
    );
  }, [filtered, pxPerSecond]);

  // After layout, measure each card's actual height so connection lines can
  // resolve true vertical centers (since absolute-positioned divs have height
  // determined by content).
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardCenters, setCardCenters] = useState<Record<string, number>>({});
  // Measure DOM positions after render so the SVG connection lines can target
  // each card's true vertical center. setState-in-effect is intentional here:
  // React.dev recommends layout effects exactly for measure-then-paint cycles.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const recompute = () => {
      const next: Record<string, number> = {};
      container
        .querySelectorAll<HTMLDivElement>("[data-message-id]")
        .forEach((node) => {
          const id = node.getAttribute("data-message-id");
          if (!id) return;
          next[id] = node.offsetTop + node.offsetHeight / 2;
        });
      setCardCenters(next);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    // Re-measure once more after fonts/JSON children settle.
    const t = setTimeout(recompute, 200);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [layout]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded bg-gray-50 dark:bg-gray-900 text-[12px] font-mono">
        <label className="flex items-center gap-2">
          <span className="text-gray-500 uppercase text-[11px]">zoom</span>
          <select
            value={pxPerSecond}
            onChange={(e) => setPxPerSecond(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800"
          >
            {ZOOM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} px/s
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          <span>显示已删除</span>
        </label>
        <span className="text-gray-400 ml-auto">
          earliest: {earliestMs ? new Date(earliestMs).toISOString() : "—"}
        </span>
      </div>

      {/* Timeline */}
      <div
        ref={containerRef}
        className="relative grid grid-cols-2 gap-3"
        style={{ minHeight: totalHeight }}
      >
        {/* Column headers */}
        <div className="absolute -top-6 left-0 text-[11px] uppercase text-gray-500 font-mono">
          canvas
        </div>
        <div className="absolute -top-6 right-0 text-[11px] uppercase text-gray-500 font-mono">
          chat
        </div>

        {/* SVG connection layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width="100%"
          height={totalHeight}
        >
          {layout
            .filter((c) => c.side === "right" && c.message.anchoredCanvasMessageId)
            .map((chatCard) => {
              const targetTop = cardCenters[chatCard.message.anchoredCanvasMessageId!];
              const sourceTop = cardCenters[chatCard.message.id];
              if (!targetTop || !sourceTop) return null;
              // Bezier curve from chat (right) to canvas (left) at viewport
              // midline. SVG percent x values are resolved against viewport box.
              return (
                <path
                  key={chatCard.message.id}
                  d={`M 50% ${sourceTop} C 40% ${sourceTop}, 60% ${targetTop}, 50% ${targetTop}`}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  fill="none"
                />
              );
            })}
        </svg>

        {/* Cards */}
        {layout.map((card) => (
          <div
            key={card.message.id}
            className={card.side === "left" ? "col-start-1" : "col-start-2"}
            style={{
              position: "absolute",
              top: card.topPx,
              [card.side]: 0,
              width: "calc(50% - 0.375rem)",
            } as React.CSSProperties}
          >
            <MessageCard
              message={card.message}
              conversationKind={card.conversationKind}
              prevCreatedAt={card.prevCreatedAt}
            />
          </div>
        ))}

        {/* Empty state */}
        {layout.length === 0 && (
          <div className="col-span-2 py-12 text-center text-gray-400 font-mono text-[13px]">
            无消息
          </div>
        )}
      </div>
    </div>
  );
}

function computeLayout(
  canvasMsgs: DebugMessage[],
  chatMsgs: DebugMessage[],
  pxPerSecond: number
): {
  earliestMs: number | null;
  layout: LaidOutCard[];
  totalHeight: number;
} {
  const all = [
    ...canvasMsgs.map((m) => ({ m, side: "left" as const, kind: "canvas" as const })),
    ...chatMsgs.map((m) => ({ m, side: "right" as const, kind: "chat" as const })),
  ];
  if (all.length === 0) {
    return { earliestMs: null, layout: [], totalHeight: 200 };
  }

  const earliestMs = Math.min(
    ...all.map((x) => new Date(x.m.createdAt).getTime())
  );

  // Sort each side by time to compute prev-message Δ within column.
  const sortedCanvas = [...canvasMsgs].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const sortedChat = [...chatMsgs].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Estimated card height for overlap detection (we don't know real heights
  // pre-render; ~120 px is a reasonable default for collapsed JSON).
  const ESTIMATED_CARD_HEIGHT = 120;

  function placeColumn(
    msgs: DebugMessage[],
    side: "left" | "right",
    kind: "canvas" | "chat"
  ): LaidOutCard[] {
    const placed: LaidOutCard[] = [];
    let lastBottom = 0;
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      const idealTop =
        ((new Date(msg.createdAt).getTime() - earliestMs) / 1000) *
        pxPerSecond;
      const top = Math.max(idealTop, lastBottom + MIN_GAP_PX);
      placed.push({
        message: msg,
        conversationKind: kind,
        prevCreatedAt: i > 0 ? msgs[i - 1].createdAt : undefined,
        topPx: top,
        side,
      });
      lastBottom = top + ESTIMATED_CARD_HEIGHT;
    }
    return placed;
  }

  const layout = [
    ...placeColumn(sortedCanvas, "left", "canvas"),
    ...placeColumn(sortedChat, "right", "chat"),
  ];

  const maxTop = layout.reduce((max, c) => Math.max(max, c.topPx), 0);
  return {
    earliestMs,
    layout,
    totalHeight: maxTop + ESTIMATED_CARD_HEIGHT + 100,
  };
}
