"use client";

import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "./client";

export { trpc };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getTrpcErrorCode(error: unknown): string | undefined {
  if (!isObject(error)) return undefined;
  const data = error["data"];
  if (!isObject(data)) return undefined;
  const code = data["code"];
  return typeof code === "string" ? code : undefined;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleUnauthorized = () => {
    // 使用 window.location.href 确保完全重定向，或者 router.push
    // 这里为了保留当前路径作为 returnUrl
    const currentPath = window.location.pathname + window.location.search;
    router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
  };

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (getTrpcErrorCode(error) === "UNAUTHORIZED") {
              handleUnauthorized();
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (getTrpcErrorCode(error) === "UNAUTHORIZED") {
              handleUnauthorized();
            }
          },
        }),
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              const code = getTrpcErrorCode(error);
              if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
                return false;
              }
              return failureCount < 3;
            },
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
