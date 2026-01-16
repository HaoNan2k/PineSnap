"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Response } from "@/components/chat/components/response";
import { ClarifyForm } from "@/components/learn/clarify-form";
import { PlanCard } from "@/components/learn/plan-card";
import type { ChatPart } from "@/lib/chat/types";
import { z } from "zod";
import {
  clarifyQuestionSchema,
  type ClarifyAnswer,
  type ClarifyPayload,
  type ClarifyQuestion,
} from "@/lib/learn/clarify";

interface LearnFocusProps {
  learning: { id: string; plan: string | null; clarify: ClarifyPayload | null };
  resources: Array<{
    id: string;
    title: string;
    type: string;
    content: unknown;
  }>;
  conversationId: string;
  initialMessages: UIMessage[];
}

function hasContent(m: unknown): m is { content: string } {
  return (
    typeof m === "object" &&
    m !== null &&
    "content" in m &&
    typeof (m as { content: unknown }).content === "string"
  );
}

const clarifyResponseSchema = z.object({
  ok: z.boolean(),
  questions: z.array(clarifyQuestionSchema),
});

const clarifyErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

const planResponseSchema = z.object({
  ok: z.boolean(),
  plan: z.string(),
});

const planErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export function LearnFocus({
  learning,
  resources,
  conversationId,
  initialMessages,
}: LearnFocusProps) {
  const [error, setError] = useState<string | null>(null);
  const [clarifyQuestions, setClarifyQuestions] = useState<
    ClarifyQuestion[] | null
  >(learning.clarify?.questions ?? null);
  const [planText, setPlanText] = useState(learning.plan ?? "");
  const [isClarifyLoading, setIsClarifyLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const clarifyRequestedRef = useRef(false);

  useEffect(() => {
    if (planText || clarifyQuestions || clarifyRequestedRef.current) return;
    let active = true;

    const fetchClarify = async () => {
      clarifyRequestedRef.current = true;
      setIsClarifyLoading(true);
      try {
        const response = await fetch("/api/learn/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learningId: learning.id }),
        });
        const data: unknown = await response.json();
        const parsed = clarifyResponseSchema.safeParse(data);
        if (!parsed.success || !parsed.data.ok) {
          const errorParsed = clarifyErrorSchema.safeParse(data);
          const message = errorParsed.success
            ? errorParsed.data.error
            : "生成澄清问题失败，请稍后重试";
          throw new Error(message);
        }
        if (active) {
          setClarifyQuestions(parsed.data.questions);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "生成澄清问题失败，请稍后重试");
        }
      } finally {
        if (active) {
          setIsClarifyLoading(false);
        }
      }
    };

    void fetchClarify();

    return () => {
      active = false;
    };
  }, [clarifyQuestions, learning.id, planText]);

  const handleSubmitClarify = async (answers: ClarifyAnswer[]) => {
    setError(null);
    setIsPlanLoading(true);
    try {
      const response = await fetch("/api/learn/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningId: learning.id, answers }),
      });
      const data: unknown = await response.json();
      const parsed = planResponseSchema.safeParse(data);
      if (!parsed.success || !parsed.data.ok) {
        const errorParsed = planErrorSchema.safeParse(data);
        const message = errorParsed.success
          ? errorParsed.data.error
          : "生成学习计划失败，请稍后重试";
        throw new Error(message);
      }
      setPlanText(parsed.data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成学习计划失败，请稍后重试");
    } finally {
      setIsPlanLoading(false);
    }
  };

  return (
    <div className="flex flex-1 h-full w-full overflow-hidden bg-background">
      <section className="w-[40%] min-w-[320px] border-r border-sand/30 bg-background px-8 py-8 overflow-y-auto">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold tracking-widest text-forest-muted uppercase">
            Plan
          </span>
          {planText.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand/40 p-6 text-sm text-forest-muted">
              计划尚未生成
            </div>
          ) : (
            <PlanCard plan={planText} />
          )}
        </div>
      </section>

      <section className="flex-1 flex flex-col px-10 py-8 gap-6 overflow-hidden">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shrink-0">
            {error}
          </div>
        )}

        {planText.length === 0 && (
          <div className="flex flex-col gap-6 max-w-2xl">
            <div>
              <h1 className="font-serif text-2xl text-text-main font-semibold">
                {resources.map((resource) => resource.title).join(" / ")}
              </h1>
              <p className="text-sm text-forest-muted mt-2">
                为你生成学习计划前，请先完成澄清问题。
              </p>
            </div>
            {isClarifyLoading && (
              <div className="rounded-2xl border border-dashed border-sand/40 p-6 text-sm text-forest-muted">
                正在生成澄清问题...
              </div>
            )}
            {!isClarifyLoading && clarifyQuestions && (
              <ClarifyForm
                key={clarifyQuestions.map((question) => question.id).join("|")}
                questions={clarifyQuestions}
                onSubmit={handleSubmitClarify}
                isSubmitting={isPlanLoading}
              />
            )}
          </div>
        )}

        {planText.length > 0 && (
          <ChatPanel
            learningId={learning.id}
            conversationId={conversationId}
            initialMessages={initialMessages}
          />
        )}
      </section>
    </div>
  );
}

function ChatPanel({
  learningId,
  conversationId,
  initialMessages,
}: {
  learningId: string;
  conversationId: string;
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/learn/chat",
        prepareSendMessagesRequest: ({ messages: currentMessages }) => {
          const last = currentMessages[currentMessages.length - 1];
          const clientMessageId = last.id;
          const inputParts: ChatPart[] = [];

          if (last.parts && last.parts.length > 0) {
            for (const p of last.parts) {
              if (p.type === "text") {
                inputParts.push({ type: "text", text: p.text });
              }
            }
          } else if (hasContent(last)) {
            inputParts.push({ type: "text", text: last.content });
          }

          return {
            body: {
              learningId,
              conversationId,
              clientMessageId,
              input: inputParts,
            },
          };
        },
      }),
    [conversationId, learningId]
  );

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status !== "ready";

  const displayMessages = useMemo(() => {
    return messages
      .map((message) => {
        let content = "";
        if (message.parts && message.parts.length > 0) {
          const textParts = message.parts.filter(
            (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
          );
          content = textParts.map((p) => p.text).join("\n");
        } else if (hasContent(message)) {
          content = message.content;
        }
        return {
          id: message.id,
          role: message.role as "user" | "assistant",
          content,
        };
      })
      .filter((message) => message.content.trim().length > 0);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length]);

  const handleSend = async () => {
    if (!input.trim() || isBusy) return;
    const content = input.trim();
    setInput("");
    await sendMessage({ role: "user", parts: [{ type: "text", text: content }] });
  };

  return (
    <div className="flex flex-col flex-1 gap-6 overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {displayMessages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "assistant"
                ? "bg-white/80 border border-sand/20 rounded-2xl px-4 py-3 text-sm text-text-main"
                : "bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 text-sm text-text-main"
            }
          >
            <Response>{message.content}</Response>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex items-end gap-3 border-t border-sand/20 pt-4 shrink-0">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isBusy}
          rows={2}
          placeholder="输入你的想法..."
          className="flex-1 rounded-xl border border-sand/30 bg-white px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:bg-sand/10"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isBusy}
          className="inline-flex items-center justify-center h-10 px-5 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60"
        >
          发送
        </button>
      </div>
    </div>
  );
}
