"use client";
import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">SocraticU · Next.js 版本</h1>
        <p className="text-sm text-slate-400">
          这是首页（/）。下面这个按钮运行在客户端：
        </p>

        <button
          className="px-4 py-2 rounded bg-teal-500 text-sm hover:bg-teal-400"
          onClick={() => setCount((c) => c + 1)}
        >
          点击次数：{count}
        </button>
      </div>
    </main>
  );
}