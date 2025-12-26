"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useMemo, useState } from "react";

export function LoginCard({
  supabaseUrl,
  supabaseAnonKey,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const supabase = useMemo(
    () => createBrowserClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSend = async () => {
    setStatus("sending");
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  };

  return (
    <div className="mx-auto w-full max-w-md p-6">
      <div className="rounded-lg border p-6">
        <div className="text-base font-medium">登录</div>
        <div className="mt-1 text-sm text-muted-foreground">
          输入邮箱，我们会发送一个登录链接（Email OTP / Magic Link）。
        </div>

        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />

          <button
            className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            onClick={onSend}
            disabled={status === "sending" || email.trim().length === 0}
          >
            {status === "sending" ? "发送中..." : "发送登录链接"}
          </button>

          {status === "sent" ? (
            <div className="text-sm text-muted-foreground">
              已发送，请检查邮箱并点击链接完成登录。
            </div>
          ) : null}

          {status === "error" ? (
            <div className="text-sm text-red-600">
              发送失败：{errorMessage ?? "Unknown error"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


