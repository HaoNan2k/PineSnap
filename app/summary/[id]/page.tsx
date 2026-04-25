import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { signArtifactToken } from "@/lib/summary/artifact-token";
import { ArtifactFab } from "@/components/summary/artifact-fab";

// dev: artifact.pinesnap.test:3000（需在 /etc/hosts 把 pinesnap.test 指向 127.0.0.1）
// prod: 设 NEXT_PUBLIC_ARTIFACT_HOST=artifact.pinesnap.dev
function getArtifactHost(currentHost: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_ARTIFACT_HOST;
  if (fromEnv) return fromEnv;
  return `artifact.${currentHost ?? "pinesnap.dev"}`;
}

function getProtocol(currentHost: string | null): "http" | "https" {
  if (!currentHost) return "https";
  const hostname = currentHost.split(":")[0];
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.startsWith("127.") ||
    hostname.endsWith(".test")
  ) {
    return "http";
  }
  return "https";
}

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const userId = await getAuthenticatedUserId();
  if (!userId) notFound();

  const summary = await prisma.resourceSummary.findUnique({
    where: { id },
    select: { id: true, resourceId: true, userId: true },
  });

  if (!summary || summary.userId !== userId) {
    notFound();
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const artifactHost = getArtifactHost(host);
  const protocol = getProtocol(host);
  const token = signArtifactToken({ summaryId: summary.id, userId });
  const artifactSrc = `${protocol}://${artifactHost}/summary/${summary.id}/raw?t=${encodeURIComponent(token)}`;

  return (
    <>
      <iframe
        src={artifactSrc}
        sandbox="allow-scripts allow-same-origin"
        allow="fullscreen"
        className="fixed inset-0 w-screen h-screen border-0"
      />
      <ArtifactFab resourceId={summary.resourceId} />
    </>
  );
}
