"use client";

import { useMemo, useState } from "react";
import type { ClarifyAnswer, ClarifyQuestion } from "@/lib/learn/clarify";

type ClarifyFormProps = {
  questions: ClarifyQuestion[];
  onSubmit: (answers: ClarifyAnswer[]) => void;
  isSubmitting?: boolean;
};

type AnswerState =
  | { type: "single_choice"; optionId: string | null }
  | { type: "multi_choice"; optionIds: string[] };

function buildInitialState(questions: ClarifyQuestion[]) {
  const entries = questions.map((question) => {
    if (question.type === "single_choice") {
      return [question.id, { type: "single_choice", optionId: null }] as const;
    }
    return [question.id, { type: "multi_choice", optionIds: [] }] as const;
  });
  return Object.fromEntries(entries);
}

export function ClarifyForm({
  questions,
  onSubmit,
  isSubmitting,
}: ClarifyFormProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    buildInitialState(questions)
  );
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    for (const question of questions) {
      const answer = answers[question.id];
      if (!answer || answer.type !== question.type) return false;
      if (answer.type === "single_choice" && !answer.optionId) return false;
      if (answer.type === "multi_choice" && answer.optionIds.length === 0) {
        return false;
      }
    }
    return true;
  }, [answers, questions]);

  const handleSubmit = () => {
    if (!canSubmit) {
      setError("请先完成所有问题的选择");
      return;
    }

    const payload: ClarifyAnswer[] = [];
    for (const question of questions) {
      const answer = answers[question.id];
      if (!answer || answer.type !== question.type) {
        setError("答案状态异常，请刷新后重试");
        return;
      }
      if (answer.type === "single_choice") {
        payload.push({
          questionId: question.id,
          type: "single_choice",
          optionId: answer.optionId ?? "",
        });
      } else {
        payload.push({
          questionId: question.id,
          type: "multi_choice",
          optionIds: answer.optionIds,
        });
      }
    }

    setError(null);
    onSubmit(payload);
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl overflow-y-auto pr-2">
      <div>
        <h2 className="text-lg font-semibold text-text-main">
          请回答以下问题
        </h2>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-6">
        {questions.map((question, index) => (
          <fieldset
            key={question.id}
            className="flex flex-col gap-3 text-sm text-text-main"
          >
            <legend className="font-medium">
              {index + 1}. {question.prompt}
            </legend>
            <div className="flex flex-col gap-2">
              {question.options.map((option) => {
                const answer = answers[question.id];
                const checked =
                  answer?.type === "single_choice"
                    ? answer.optionId === option.id
                    : answer?.type === "multi_choice"
                    ? answer.optionIds.includes(option.id)
                    : false;
                return (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 rounded-xl border border-sand/30 bg-white px-3 py-2"
                  >
                    <input
                      type={question.type === "single_choice" ? "radio" : "checkbox"}
                      name={question.id}
                      checked={checked}
                      onChange={() => {
                        setAnswers((prev) => {
                          const current = prev[question.id];
                          if (!current || current.type !== question.type) return prev;
                          if (question.type === "single_choice") {
                            return {
                              ...prev,
                              [question.id]: {
                                type: "single_choice",
                                optionId: option.id,
                              },
                            };
                          }
                          if (current.type !== "multi_choice") {
                            return prev;
                          }
                          const exists = current.optionIds.includes(option.id);
                          const optionIds = exists
                            ? current.optionIds.filter((id: string) => id !== option.id)
                            : [...current.optionIds, option.id];
                          return {
                            ...prev,
                            [question.id]: {
                              type: "multi_choice",
                              optionIds,
                            },
                          };
                        });
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>{option.text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center h-10 px-6 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 shrink-0"
      >
        生成学习计划
      </button>
    </div>
  );
}
