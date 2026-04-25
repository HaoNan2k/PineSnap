import { notFound, forbidden, unauthorized } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { appRouter } from "@/server";
import { createContext } from "@/server/context";
import { SummaryDetailView } from "@/components/summary/summary-detail-view";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const { resourceId } = await params;

  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  let resource;
  try {
    resource = await caller.resource.get({ id: resourceId });
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === "UNAUTHORIZED") unauthorized();
      if (error.code === "NOT_FOUND") notFound();
      if (error.code === "FORBIDDEN") forbidden();
    }
    throw error;
  }

  const summary = await caller.summary.getByResourceId({ resourceId });

  return (
    <SummaryDetailView
      resourceId={resource.id}
      title={resource.title}
      sourceType={resource.sourceType}
      canonicalUrl={resource.canonicalUrl}
      thumbnailUrl={resource.thumbnailUrl}
      createdAt={resource.createdAt.toISOString()}
      initialSummary={
        summary
          ? {
              markdown: summary.markdown,
              oneLineSummary: summary.oneLineSummary,
              keyMoments: summary.keyMoments as unknown,
            }
          : null
      }
    />
  );
}
