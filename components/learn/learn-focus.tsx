"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Response } from "@/components/chat/components/response";

type LearnPhase = "idle" | "clarifying" | "planning" | "interacting";

type LearnMessage = { role: "user" | "assistant"; content: string };

interface LearnFocusProps {
  resource: {
    id: string;
    title: string;
    type: string;
    content: unknown;
  };
}

export function LearnFocus({ resource }: LearnFocusProps) {
  const [phase, setPhase] = useState<LearnPhase>("idle");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [planText, setPlanText] = useState("");
  const [messages, setMessages] = useState<LearnMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (phase === "interacting") {
      scrollToBottom();
    }
  }, [messages, phase]);

  useEffect(() => {
    handleStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planEmptyState = useMemo(
    () =>
      phase === "idle" || (phase === "clarifying" && planText.length === 0),
    [phase, planText.length]
  );

  const handleStart = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/learn/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: resource.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate questions");
      }
      const data: { ok: boolean; questions?: string[] } = await res.json();
      if (!data.ok || !data.questions) {
        throw new Error("Invalid response from server");
      }
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ""));
      setPhase("clarifying");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setPhase("idle");
    } finally {
      setIsBusy(false);
    }
  };

  const handlePlan = async () => {
    if (answers.some((a) => a.trim().length === 0)) {
      setError("请先回答所有问题");
      return;
    }
    setIsBusy(true);
    setError(null);
    setPhase("planning");
    try {
      const res = await fetch("/api/learn/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: resource.id,
          items: questions.map((q, index) => ({
            question: q,
            answer: answers[index],
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate plan");
      }
      const data: { ok: boolean; planText?: string } = await res.json();
      if (!data.ok || !data.planText) {
        throw new Error("Invalid response from server");
      }
      setPlanText(data.planText);
      await generateFirstAssistantMessage(data.planText);
      setPhase("interacting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setPhase("clarifying");
    } finally {
      setIsBusy(false);
    }
  };

  const generateFirstAssistantMessage = async (plan: string) => {
    const res = await fetch("/api/learn/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceId: resource.id,
        planText: plan,
        init: true,
        messages: [],
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to start learning");
    }
    const data: { ok: boolean; message?: LearnMessage } = await res.json();
    if (!data.ok || !data.message) {
      throw new Error("Invalid response from server");
    }
    setMessages([data.message]);
  };

  const handleSend = async () => {
    if (!input.trim() || isBusy) return;
    const nextMessages = [
      ...messages,
      { role: "user" as const, content: input.trim() },
    ];
    setMessages(nextMessages);
    setInput("");
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/learn/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: resource.id,
          planText,
          messages: nextMessages,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to continue learning");
      }
      const data: { ok: boolean; message?: LearnMessage } = await res.json();
      if (!data.ok || !data.message) {
        throw new Error("Invalid response from server");
      }
      const nextMessage = data.message;
      setMessages((prev) => [...prev, nextMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-1 h-full w-full overflow-hidden bg-background">
      <section className="w-[40%] min-w-[320px] border-r border-sand/30 bg-background px-8 py-8 overflow-y-auto">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold tracking-widest text-forest-muted uppercase">
            Plan
          </span>
          {planEmptyState ? (
            <div className="rounded-2xl border border-dashed border-sand/40 p-6 text-sm text-forest-muted">
              计划尚未生成
            </div>
          ) : (
            <div className="text-sm text-text-main bg-white/70 border border-sand/20 rounded-2xl p-6 overflow-x-auto">
              <Response>{planText}</Response>
            </div>
          )}
        </div>
      </section>

      <section className="flex-1 flex flex-col px-10 py-8 gap-6 overflow-hidden">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shrink-0">
            {error}
          </div>
        )}

        {phase === "idle" && (
          <div className="flex flex-col gap-6 max-w-xl">
            <div>
              <h1 className="font-serif text-2xl text-text-main font-semibold">
                {resource.title}
              </h1>
            </div>
            {isBusy ? (
              <div className="text-forest-muted animate-pulse flex items-center gap-2">
                正在生成探索性问题...
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center justify-center h-10 px-6 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                {error ? "重试" : "开始学习"}
              </button>
            )}
          </div>
        )}

        {phase === "clarifying" && (
          <div className="flex flex-col gap-6 max-w-2xl overflow-y-auto pr-2">
            <div>
              <h2 className="text-lg font-semibold text-text-main">
                请回答以下问题
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {questions.map((question, index) => (
                <label
                  key={question}
                  className="flex flex-col gap-2 text-sm text-text-main"
                >
                  <span>{question}</span>
                  <textarea
                    value={answers[index] ?? ""}
                    onChange={(event) => {
                      const next = [...answers];
                      next[index] = event.target.value;
                      setAnswers(next);
                    }}
                    rows={3}
                    className="rounded-xl border border-sand/30 bg-white px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handlePlan}
              disabled={isBusy}
              className="inline-flex items-center justify-center h-10 px-6 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 shrink-0"
            >
              生成学习计划
            </button>
          </div>
        )}

        {phase === "planning" && (
          <div className="text-sm text-forest-muted">正在生成计划...</div>
        )}

        {phase === "interacting" && (
          <div className="flex flex-col flex-1 gap-6 overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
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
        )}
      </section>
    </div>
  );
}
