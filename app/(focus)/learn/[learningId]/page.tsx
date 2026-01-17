import { LearnFocus } from "@/components/learn/learn-focus";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ learningId: string }>;
}) {
  const { learningId } = await params;

  return <LearnFocus learningId={learningId} />;
}
