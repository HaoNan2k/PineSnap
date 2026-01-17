"use client";

import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { trpc } from "./client";
import { LoginCard } from "@/components/auth/login-card";
import { useAuth } from "@/components/auth/auth-provider";

export { trpc };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrpcErrorCode(error: unknown): string | undefined {
  if (!isObject(error)) return undefined;
  const data = error["data"];
  if (!isObject(data)) return undefined;
  const code = data["code"];
  return typeof code === "string" ? code : undefined;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  // Derive whether to show login: unauthorized AND user not logged in
  // When user logs in, showLoginCard becomes false automatically
  const showLoginCard = isUnauthorized && !user;

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (getTrpcErrorCode(error) === "UNAUTHORIZED") {
              setIsUnauthorized(true);
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (getTrpcErrorCode(error) === "UNAUTHORIZED") {
              setIsUnauthorized(true);
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
        {showLoginCard ? (
          <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background">
            <LoginCard
              supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
              supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
              redirectTo={pathname}
            />
          </div>
        ) : (
          children
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
