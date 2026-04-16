"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { ClarifyForm } from "@/components/learn/clarify-form";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/react";
import type { ChatPart } from "@/lib/chat/types";
import type { ClarifyAnswer, ClarifyQuestion } from "@/lib/learn/clarify";
import { LearningCanvas } from "@/components/learn/learning-canvas";
import { ChatDrawer, toDisplayMessages } from "@/components/learn/chat-drawer";
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
    <div className="flex flex-col h-full w-full bg-background items-center justify-center">
      <div className="max-w-2xl w-full px-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function LearnFocus({ learningId }: LearnFocusProps) {
  const stateQuery = trpc.learning.getState.useQuery(
    { learningId },
    { retry: false }
  );

  const [mutatedPlan, setMutatedPlan] = useState<string | null>(null);
  const [mutatedClarify, setMutatedClarify] = useState<ClarifyQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planText = mutatedPlan ?? stateQuery.data?.learning.plan ?? "";
  const clarifyQuestions = mutatedClarify ?? stateQuery.data?.learning.clarify?.questions ?? null;

  const generateClarifyMutation = trpc.learning.generateClarify.useMutation({
    onSuccess: (data) => setMutatedClarify(data.questions),
    onError: (err) => setError(err.message || "生成澄清问题失败"),
  });

  const generatePlanMutation = trpc.learning.generatePlan.useMutation({
    onSuccess: (data) => setMutatedPlan(data.plan),
    onError: (err) => setError(err.message || "生成学习计划失败"),
  });

  const clarifyIsPending = generateClarifyMutation.isPending;
  const clarifyIsSuccess = generateClarifyMutation.isSuccess;
  const triggerClarify = generateClarifyMutation.mutate;

  useEffect(() => {
    if (!stateQuery.data) return;
    if (planText) return;
    if (clarifyQuestions) return;
    if (clarifyIsPending || clarifyIsSuccess) return;
    triggerClarify({ learningId });
  }, [stateQuery.data, planText, clarifyQuestions, learningId, clarifyIsPending, clarifyIsSuccess, triggerClarify]);

  const handleSubmitClarify = (answers: ClarifyAnswer[]) => {
    setError(null);
    generatePlanMutation.mutate({ learningId, answers });
  };

  if (stateQuery.isLoading) return <LearnFocusSkeleton />;

  if (stateQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background p-4 text-center">
        <p className="text-forest-muted">{stateQuery.error.message || "加载失败"}</p>
        <button
          onClick={() => stateQuery.refetch()}
          className="mt-4 px-4 py-2 bg-forest text-white rounded-xl text-sm hover:bg-forest-dark transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (!stateQuery.data) return <LearnFocusSkeleton />;

  const { resources, conversationId, initialMessages } = stateQuery.data;
  const typedInitialMessages = initialMessages as unknown as UIMessage[];

  // Clarify phase: full-screen centered form
  if (planText.length === 0) {
    return (
      <div className="flex flex-col h-full w-full bg-background">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            {error && (
              <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error mb-6">
                {error}
              </div>
            )}
            <h1 className="font-serif text-2xl text-text-main font-semibold">
              {resources.map((resource: { title: string }) => resource.title).join(" / ")}
            </h1>
            <p className="text-sm text-forest-muted mt-2 mb-6">
              为你生成学习计划前，请先完成澄清问题。
            </p>
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
        </div>
      </div>
    );
  }

  // Learning phase: canvas + drawer
  return (
    <CanvasSession
      learningId={learningId}
      conversationId={conversationId}
      initialMessages={typedInitialMessages}
    />
  );
}

// ---------------------------------------------------------------------------
// CanvasSession — orchestrates LearningCanvas + ChatDrawer
// ---------------------------------------------------------------------------

function CanvasSession({
  learningId,
  conversationId,
  initialMessages,
}: {
  learningId: string;
  conversationId: string;
  initialMessages: UIMessage[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
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

  const { messages, sendMessage, status, addToolResult } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isBusy = status !== "ready";
  const lastMessage = messages[messages.length - 1];

  // Fingerprint logic for gating incomplete assistant messages
  const prevAssistant = useMemo(() => {
    for (let i = messages.length - 2; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const baselineFingerprint = useMemo(
    () => (prevAssistant ? getLastStepFingerprint(prevAssistant.parts) : ""),
    [prevAssistant]
  );
  const currentFingerprint = useMemo(
    () => (lastMessage ? getLastStepFingerprint(lastMessage.parts) : ""),
    [lastMessage]
  );

  const lastAssistantHasOutput = useMemo(() => {
    if (!lastMessage || lastMessage.role !== "assistant") return false;
    if (prevAssistant) {
      return currentFingerprint.length > 0 && currentFingerprint !== baselineFingerprint;
    }
    return hasTurnOutput(lastMessage.parts);
  }, [lastMessage, prevAssistant, currentFingerprint, baselineFingerprint]);

  // Timeout for stalled responses
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

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

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

  // Build current canvas step from last assistant message
  const currentStep = useMemo(() => {
    if (!lastMessage || lastMessage.role !== "assistant") return null;

    let content = "";
    if (lastMessage.parts && lastMessage.parts.length > 0) {
      const textParts = lastMessage.parts.filter(
        (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
      );
      content = textParts.map((p) => p.text).join("\n");
    } else if (hasContent(lastMessage)) {
      content = lastMessage.content;
    }

    const a2uiInvocations = getToolInvocationsFromLastStep(lastMessage.parts);
    const isGated = shouldGateLatestAssistant && !shouldShowError;

    return {
      id: lastMessage.id,
      content,
      parts: lastMessage.parts,
      hasA2UI: a2uiInvocations.length > 0,
      isGated,
      isError: shouldShowError,
    };
  }, [lastMessage, shouldGateLatestAssistant, shouldShowError]);

  // Count assistant messages as "steps"
  const assistantMessages = useMemo(
    () => messages.filter((m) => m.role === "assistant"),
    [messages]
  );
  const currentStepIndex = assistantMessages.length - 1;

  // Chat drawer messages
  const displayMessages = useMemo(() => toDisplayMessages(messages), [messages]);

  const handleContinue = async () => {
    if (isBusy) return;
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: "Continue" }],
    });
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isBusy) return;
    const content = chatInput.trim();
    setChatInput("");
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: content }],
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <LearningCanvas
        currentStep={currentStep}
        totalSteps={Math.max(assistantMessages.length, 1)}
        currentStepIndex={Math.max(currentStepIndex, 0)}
        isBusy={isBusy}
        onContinue={handleContinue}
        onOpenDrawer={() => setDrawerOpen(true)}
        addToolResult={addToolResult}
      />
      <ChatDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        messages={displayMessages}
        input={chatInput}
        onInputChange={setChatInput}
        onSend={handleChatSend}
        isBusy={isBusy}
        addToolResult={addToolResult}
      />
    </div>
  );
}
