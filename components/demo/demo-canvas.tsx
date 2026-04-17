"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SingleChoiceQuiz } from "@/components/chat/a2ui/single-choice-quiz";
import { motion, AnimatePresence } from "framer-motion";
import { HashAnimation } from "./hash-animation";
import { LoginMockup } from "./login-mockup";
import { DiscoveryMoment } from "./discovery-moment";

const TOTAL_STEPS = 5;

export function DemoCanvas() {
  const [stepIndex, setStepIndex] = useState(0);

  // Step 1: Why can't they tell you? (SingleChoice)
  const [whyAnswer, setWhyAnswer] = useState<string | undefined>();
  const [whySubmitted, setWhySubmitted] = useState(false);

  // Step 3: concept select (replaces FillInBlank)
  const [conceptAnswer, setConceptAnswer] = useState<string | undefined>();
  const [conceptSubmitted, setConceptSubmitted] = useState(false);

  // Step 4: SingleChoice
  const [choiceAnswer, setChoiceAnswer] = useState<string | undefined>();
  const [choiceSubmitted, setChoiceSubmitted] = useState(false);

  const canContinue = (() => {
    switch (stepIndex) {
      case 0: return whySubmitted;
      case 1: return true;
      case 2: return conceptSubmitted; // any answer, right or wrong
      case 3: return choiceSubmitted;  // any answer, right or wrong
      case 4: return false; // Last step, no continue
      default: return false;
    }
  })();

  const handleContinue = useCallback(() => {
    if (stepIndex < TOTAL_STEPS - 1 && canContinue) {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex, canContinue]);

  const handleWhySelect = useCallback((option: string) => {
    if (!whySubmitted) {
      setWhyAnswer(option);
      setWhySubmitted(true);
    }
  }, [whySubmitted]);

  const handleConceptSelect = useCallback((option: string) => {
    if (!conceptSubmitted) {
      setConceptAnswer(option);
      setConceptSubmitted(true);
    }
  }, [conceptSubmitted]);

  const handleChoiceSelect = useCallback((option: string) => {
    if (!choiceSubmitted) {
      setChoiceAnswer(option);
      setChoiceSubmitted(true);
    }
  }, [choiceSubmitted]);

  const progress = ((stepIndex + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Progress bar */}
      <div className="w-full h-1 bg-border-light shrink-0">
        <div
          className="h-full bg-forest transition-all duration-500 ease-out rounded-full"
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>

      {/* Canvas content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {stepIndex === 0 && (
            <StepOne
              answer={whyAnswer}
              onSelect={handleWhySelect}
              submitted={whySubmitted}
            />
          )}
          {stepIndex === 1 && <StepTwo />}
          {stepIndex === 2 && (
            <StepThree
              answer={conceptAnswer}
              onSelect={handleConceptSelect}
              submitted={conceptSubmitted}
            />
          )}
          {stepIndex === 3 && (
            <StepFour
              answer={choiceAnswer}
              onSelect={handleChoiceSelect}
              submitted={choiceSubmitted}
            />
          )}
          {stepIndex === 4 && <StepFive />}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-border-light bg-surface/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-end">
          {stepIndex < TOTAL_STEPS - 1 && (
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium text-sm transition-all",
                "bg-forest text-white hover:bg-forest-dark active:scale-[0.97]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Natural intro + SocraticBranch ────────────── */

function StepOne({
  answer,
  onSelect,
  submitted,
}: {
  answer?: string;
  onSelect: (o: string) => void;
  submitted: boolean;
}) {
  const [resetShown, setResetShown] = useState(false);

  return (
    <div className="space-y-6">
      <LoginMockup animated onResetShown={() => setResetShown(true)} />

      <AnimatePresence>
        {resetShown && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          >
            <SingleChoiceQuiz
              question="每次都是这样。只能重新设一个，从来不告诉你旧密码。为什么？"
              options={[
                "防止密码被别人看到",
                "重置比找回更方便",
                "服务器根本不知道你的密码",
                "这是行业安全规定",
              ]}
              correctAnswer="服务器根本不知道你的密码"
              selectedOption={answer}
              onSelectOption={onSelect}
              isReadOnly={submitted}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Step 2: Hash Animation ────────────────────────── */

function StepTwo() {
  return (
    <div className="space-y-6">
      <p className="text-lg text-text-main leading-relaxed">
        答案是：<strong className="text-forest">没有</strong>。
      </p>
      <p className="text-base text-text-secondary leading-relaxed">
        当你点击"注册"的那一刻，服务器做了一件事——把你的密码通过一个叫<strong className="text-text-main">哈希函数</strong>的东西，
        转换成了一串不可逆的字符。
      </p>
      <HashAnimation />
    </div>
  );
}

/* ── Step 3: Concept select (card-based, replaces FillInBlank) ──── */

function StepThree({
  answer,
  onSelect,
  submitted,
}: {
  answer?: string;
  onSelect: (o: string) => void;
  submitted: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Database visualization */}
      <div className="rounded-xl border border-border-light overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-warm border-b border-border-light">
              <th className="text-left px-4 py-3 font-semibold text-text-main">用户名</th>
              <th className="text-left px-4 py-3 font-semibold text-text-main">存储内容</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            <tr className="border-b border-border-light">
              <td className="px-4 py-3 text-text-secondary font-sans">alice</td>
              <td className="px-4 py-3 text-text-faint">f6c08cdd85fb084e...</td>
            </tr>
            <tr className="border-b border-border-light bg-cream-warm/50">
              <td className="px-4 py-3 text-text-secondary font-sans">bob</td>
              <td className="px-4 py-3 text-text-faint">a15bf86e3cd87e9c...</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-text-secondary font-sans">你</td>
              <td className="px-4 py-3 text-text-faint">2cf24dba5fb0a30e...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-text-secondary">
        注意：表里没有"密码"列。服务器只存了一串看不懂的字符。
      </p>

      <SingleChoiceQuiz
        question="所以，服务器存储的不是你的密码，而是密码的——"
        options={[
          "加密文本",
          "哈希值",
          "二进制编码",
          "压缩包",
        ]}
        correctAnswer="哈希值"
        selectedOption={answer}
        onSelectOption={onSelect}
        isReadOnly={submitted}
      />

      {submitted && answer === "哈希值" && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-text-secondary leading-relaxed">
          没错！哈希值是一串<strong className="text-text-main">不可逆</strong>的字符。
          和"加密"不同，加密可以解密回来，但哈希是单向的——从哈希值无法还原出原始密码。
        </div>
      )}
    </div>
  );
}

/* ── Step 4: SingleChoice ────────────────────────── */

function StepFour({
  answer,
  onSelect,
  submitted,
}: {
  answer?: string;
  onSelect: (o: string) => void;
  submitted: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="text-base text-text-secondary leading-relaxed">
        既然服务器没有你的密码原文，那你下次登录时，它怎么知道你输对了？
      </p>

      <SingleChoiceQuiz
        question="登录时，服务器怎么验证你的密码？"
        options={[
          "把存着的密码和你输入的对比",
          "把你输入的做哈希，和存着的哈希值对比",
          "发验证码给你确认",
        ]}
        correctAnswer="把你输入的做哈希，和存着的哈希值对比"
        selectedOption={answer}
        onSelectOption={onSelect}
        isReadOnly={submitted}
      />

      {submitted && answer === "把你输入的做哈希，和存着的哈希值对比" && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-text-secondary leading-relaxed">
          没错。服务器把你输入的密码做一次哈希，然后和数据库里存的哈希值比对。如果一样，就说明密码对了。
          <strong className="text-text-main"> 它从头到尾都没见过你的密码原文。</strong>
        </div>
      )}
    </div>
  );
}

/* ── Step 5: Discovery Moment ────────────── */

function StepFive() {
  return <DiscoveryMoment />;
}
