"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { Response } from "@/components/chat/components/response";
import { ClarifyForm } from "@/components/learn/clarify-form";
import { PlanCard } from "@/components/learn/plan-card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/react";
import type { ChatPart } from "@/lib/chat/types";
import type { ClarifyAnswer, ClarifyQuestion } from "@/lib/learn/clarify";
import { A2UIRenderer } from "@/components/chat/a2ui/renderer";
import {
  getLastStepFingerprint,
  getToolInvocationsFromLastStep,
  hasTurnOutput,
} from "@/lib/chat/utils";
import { toToolResultOutput } from "@/lib/chat/tool-result-output";

interface LearnFocusProps {
  learningId: string;
}

function hasContent(m: unknown): m is { content: string } {
  return (
    typeof m === "object" &&
    m !== null &&
    "content" in m &&
    typeof (m as { content: unknown }).content === "string"
  );
}

function LearnFocusSkeleton() {
  return (
    <div className="flex flex-1 h-full w-full overflow-hidden bg-background">
      <section className="w-[40%] min-w-[320px] border-r border-sand/30 bg-background px-8 py-8 overflow-y-auto">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-12" />
          <div className="rounded-2xl border border-dashed border-sand/40 p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </section>

      <section className="flex-1 flex flex-col px-10 py-8 gap-6 overflow-hidden">
        <div className="flex flex-col gap-6 max-w-2xl">
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="rounded-2xl border border-dashed border-sand/40 p-6">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function LearnFocus({ learningId }: LearnFocusProps) {
  // Fetch initial state via tRPC
  const stateQuery = trpc.learning.getState.useQuery(
    { learningId },
    { retry: false }
  );

  // Local state for UI updates after mutations (plan and clarify can change during session)
  const [mutatedPlan, setMutatedPlan] = useState<string | null>(null);
  const [mutatedClarify, setMutatedClarify] = useState<ClarifyQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derive current values: mutation result takes precedence over query data
  const planText = mutatedPlan ?? stateQuery.data?.learning.plan ?? "";
  const clarifyQuestions = mutatedClarify ?? stateQuery.data?.learning.clarify?.questions ?? null;

  // Mutations
  const generateClarifyMutation = trpc.learning.generateClarify.useMutation({
    onSuccess: (data) => {
      setMutatedClarify(data.questions);
    },
    onError: (err) => {
      setError(err.message || "生成澄清问题失败");
    },
  });

  const generatePlanMutation = trpc.learning.generatePlan.useMutation({
    onSuccess: (data) => {
      setMutatedPlan(data.plan);
    },
    onError: (err) => {
      setError(err.message || "生成学习计划失败");
    },
  });

  // Auto-trigger clarify generation when needed
  const clarifyIsPending = generateClarifyMutation.isPending;
  const clarifyIsSuccess = generateClarifyMutation.isSuccess;
  const triggerClarify = generateClarifyMutation.mutate;

  useEffect(() => {
    if (!stateQuery.data) return;
    if (planText) return; // Already have plan
    if (clarifyQuestions) return; // Already have questions
    if (clarifyIsPending || clarifyIsSuccess) return;

    triggerClarify({ learningId });
  }, [stateQuery.data, planText, clarifyQuestions, learningId, clarifyIsPending, clarifyIsSuccess, triggerClarify]);

  const handleSubmitClarify = (answers: ClarifyAnswer[]) => {
    setError(null);
    generatePlanMutation.mutate({ learningId, answers });
  };

  // Loading state
  if (stateQuery.isLoading) {
    return <LearnFocusSkeleton />;
  }

  // Error state (UNAUTHORIZED is handled globally by TRPCProvider)
  if (stateQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background p-4 text-center">
        <p className="text-forest-muted">{stateQuery.error.message || "加载失败"}</p>
        <button
          onClick={() => stateQuery.refetch()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (!stateQuery.data) {
    return <LearnFocusSkeleton />;
  }

  const { resources, conversationId, initialMessages } = stateQuery.data;
  // Type assertion: convertDbToUIMessages returns UIMessage[], but tRPC type inference
  // can be overly complex. This is safe because the runtime type is correct.
  const typedInitialMessages = initialMessages as unknown as UIMessage[];

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
          <div className="flex flex-col gap-6 max-w-2xl flex-1 min-h-0">
            <div>
              <h1 className="font-serif text-2xl text-text-main font-semibold">
                {resources.map((resource: { title: string }) => resource.title).join(" / ")}
              </h1>
              <p className="text-sm text-forest-muted mt-2">
                为你生成学习计划前，请先完成澄清问题。
              </p>
            </div>
            {generateClarifyMutation.isPending && (
              <div className="rounded-2xl border border-dashed border-sand/40 p-6 text-sm text-forest-muted">
                正在生成澄清问题...
              </div>
            )}
            {!generateClarifyMutation.isPending && clarifyQuestions && (
              <ClarifyForm
                key={clarifyQuestions.map((q: ClarifyQuestion) => q.id).join("|")}
                questions={clarifyQuestions}
                onSubmit={handleSubmitClarify}
                isSubmitting={generatePlanMutation.isPending}
              />
            )}
          </div>
        )}

        {planText.length > 0 && (
          <ChatPanel
            learningId={learningId}
            conversationId={conversationId}
            initialMessages={typedInitialMessages}
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
  type LearnUIMessage = UIMessage;
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const inflightMessageIdRef = useRef<string | null>(null);
  const [timeoutFiredForId, setTimeoutFiredForId] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/learn/chat",
        prepareSendMessagesRequest: ({ messages: currentMessages }) => {
          const last = currentMessages[currentMessages.length - 1];
          let clientMessageId = last.id;
          const inputParts: ChatPart[] = [];

          // v6 client-side tools:
          // When the last message is an assistant tool prompt, we submit tool results (not text)
          // back to the server to continue the reasoning loop.
          const toolInvocations = getToolInvocationsFromLastStep(last.parts);
          const completedToolOutputs = toolInvocations.filter(
            (t) => t.isReadOnly && t.result !== undefined
          );

          if (last.role === "assistant" && completedToolOutputs.length > 0) {
            clientMessageId = `tool:${completedToolOutputs
              .map((t) => t.toolCallId)
              .join(",")}:${last.id}`;
            for (const t of completedToolOutputs) {
              inputParts.push({
                type: "tool-result",
                toolCallId: t.toolCallId,
                toolName: t.toolName,
                output: toToolResultOutput(t.result),
              });
            }
          } else if (last.parts && last.parts.length > 0) {
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

  const { messages, sendMessage, status, addToolResult } =
    useChat<LearnUIMessage>({
    id: conversationId,
      messages: initialMessages as LearnUIMessage[],
      transport,
      // AI SDK v6 standard: auto-resubmit when tool calls are complete.
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    });

  const isBusy = status !== "ready";
  const lastMessage = messages[messages.length - 1];
  const prevAssistant = useMemo(() => {
    for (let i = messages.length - 2; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "assistant") return message;
    }
    return null;
  }, [messages]);
  const baselineFingerprint = useMemo(() => {
    return prevAssistant ? getLastStepFingerprint(prevAssistant.parts) : "";
  }, [prevAssistant]);
  const currentFingerprint = useMemo(() => {
    return lastMessage ? getLastStepFingerprint(lastMessage.parts) : "";
  }, [lastMessage]);
  const lastAssistantHasOutput = useMemo(() => {
    if (!lastMessage || lastMessage.role !== "assistant") return false;
    if (prevAssistant) {
      return (
        currentFingerprint.length > 0 &&
        currentFingerprint !== baselineFingerprint
      );
    }
    return hasTurnOutput(lastMessage.parts);
  }, [lastMessage, prevAssistant, currentFingerprint, baselineFingerprint]);

  useEffect(() => {
    const shouldTrack =
      !!lastMessage &&
      lastMessage.role === "assistant" &&
      status !== "ready" &&
      !lastAssistantHasOutput;

    if (!shouldTrack) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      inflightMessageIdRef.current = null;
      return;
    }

    if (inflightMessageIdRef.current === lastMessage.id) return;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    inflightMessageIdRef.current = lastMessage.id;
    timeoutRef.current = window.setTimeout(() => {
      setTimeoutFiredForId(lastMessage.id);
    }, 20000);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [status, lastAssistantHasOutput, lastMessage]);

  const shouldGateLatestAssistant =
    !!lastMessage &&
    lastMessage.role === "assistant" &&
    status !== "ready" &&
    !lastAssistantHasOutput;
  const inflightTimedOut = timeoutFiredForId === lastMessage?.id;
  const shouldShowError =
    !!lastMessage &&
    lastMessage.role === "assistant" &&
    !lastAssistantHasOutput &&
    (status === "error" || inflightTimedOut);

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

        const a2uiInvocations = getToolInvocationsFromLastStep(message.parts);
        const isLatestAssistant =
          message.id === lastMessage?.id && message.role === "assistant";
        const isGated = isLatestAssistant && shouldGateLatestAssistant && !shouldShowError;
        const isError = isLatestAssistant && shouldShowError;

        return {
          id: message.id,
          role: message.role as "user" | "assistant",
          content,
          parts: message.parts,
          a2uiInvocations,
          isGated,
          isError,
        };
      })
      .filter(
        (message) =>
          message.content.trim().length > 0 ||
          (message.a2uiInvocations && message.a2uiInvocations.length > 0) ||
          message.isGated ||
          message.isError
      );
  }, [messages, lastMessage?.id, shouldGateLatestAssistant, shouldShowError]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const last = messages[messages.length - 1];
    if (!last) return;
    console.debug("[LearnChat] last message", {
      id: last.id,
      role: last.role,
      content: hasContent(last) ? last.content : "",
        derivedToolInvocations: getToolInvocationsFromLastStep(last.parts),
      parts: last.parts ?? [],
    });
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
            {message.isGated ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : message.isError ? (
              <Response>生成失败，请稍后重试。</Response>
            ) : (
              <>
                <Response>{message.content}</Response>
                {message.role === "assistant" && (
                  <div className="mt-4">
                    <A2UIRenderer parts={message.parts} addToolResult={addToolResult} />
                  </div>
                )}
              </>
            )}
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
