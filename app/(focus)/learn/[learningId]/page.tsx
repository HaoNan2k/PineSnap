import { LoginCard } from "@/components/auth/login-card";
import { LearnFocus } from "@/components/learn/learn-focus";
import { requireEnv } from "@/lib/env";
import { createContext } from "@/server/context";
import { notFound, redirect } from "next/navigation";
import {
  ensureLearningConversation,
  getLearningWithAccessCheck,
} from "@/lib/db/learning";
import { getConversation } from "@/lib/db/conversation";
import { convertDbToUIMessages } from "@/lib/chat/converter";
import {
  clarifyPayloadSchema,
  type ClarifyPayload,
} from "@/lib/learn/clarify";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ learningId: string }>;
}) {
  const ctx = await createContext();
  const { user } = ctx;
  const { learningId } = await params;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoginCard
          supabaseUrl={requireEnv("NEXT_PUBLIC_SUPABASE_URL")}
          supabaseAnonKey={requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")}
          redirectTo={`/learn/${learningId}`}
        />
      </div>
    );
  }

  const result = await getLearningWithAccessCheck(learningId, user.id);
  if (!result.ok) {
    if (result.status === 404) notFound();
    redirect("/sources");
  }

  const learning = result.learning;
  const resources = learning.resources.map((item) => item.resource);
  const clarify = parseClarifyPayload(learning.clarify);

  const conversation = await ensureLearningConversation(learning.id, user.id);
  const conversationWithMessages = await getConversation(conversation.id, user.id);
  const initialMessages = conversationWithMessages
    ? await convertDbToUIMessages(conversationWithMessages.messages)
    : [];

  return (
    <LearnFocus
      learning={{ id: learning.id, plan: learning.plan, clarify }}
      resources={resources}
      conversationId={conversation.id}
      initialMessages={initialMessages}
    />
  );
}

function parseClarifyPayload(payload: unknown): ClarifyPayload | null {
  const parsed = clarifyPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}
