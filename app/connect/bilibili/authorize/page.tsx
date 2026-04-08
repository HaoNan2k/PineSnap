import { z } from "zod";
import { redirect } from "next/navigation";
import { LearnHeader } from "@/components/learn/learn-header";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

const querySchema = z.object({
  state: z.string().min(12).max(200),
  code_challenge: z.string().min(32).max(200),
  redirect_uri: z
    .string()
    .url()
    .refine(
      (value) => /^https:\/\/[a-z0-9]{32}\.chromiumapp\.org\//i.test(value),
      "redirectUri must be a chromiumapp callback URL"
    ),
});

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readFirst(
  value: string | string[] | undefined,
  fallback = ""
): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default async function BilibiliAuthorizePage({ searchParams }: PageProps) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    const query = await searchParams;
    const current = new URLSearchParams({
      state: readFirst(query?.state),
      code_challenge: readFirst(query?.code_challenge),
      redirect_uri: readFirst(query?.redirect_uri),
    });
    const returnUrl = `/connect/bilibili/authorize?${current.toString()}`;
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  const query = await searchParams;
  const parsed = querySchema.safeParse({
    state: readFirst(query?.state),
    code_challenge: readFirst(query?.code_challenge),
    redirect_uri: readFirst(query?.redirect_uri),
  });

  if (!parsed.success) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <LearnHeader />
        <main className="container mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-2xl font-bold">扩展授权参数无效</h1>
          <p className="mt-4 text-muted-foreground">
            请返回扩展设置页重新发起连接。
          </p>
        </main>
      </div>
    );
  }

  const { state, code_challenge: codeChallenge, redirect_uri: redirectUri } = parsed.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LearnHeader />
      <main className="container mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">授权 Chrome 扩展</h1>
          <p className="mt-3 text-muted-foreground">
            授权后，扩展可代表你的 PineSnap 账号将 B 站采集内容写入素材库。你可以随时在连接页撤销授权。
          </p>

          <form
            className="mt-8 space-y-4"
            method="POST"
            action="/api/capture/extension/authorize"
          >
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="codeChallenge" value={codeChallenge} />
            <input type="hidden" name="redirectUri" value={redirectUri} />
            <Button type="submit" className="h-11 rounded-xl px-6 text-sm font-bold">
              授权此扩展
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

