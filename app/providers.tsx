"use client";

import { TRPCProvider } from "@/lib/trpc/react";
import { AuthProvider } from "@/components/auth/auth-provider";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <AuthProvider supabaseUrl={SUPABASE_URL} supabaseAnonKey={SUPABASE_ANON_KEY}>
        {children}
      </AuthProvider>
    </TRPCProvider>
  );
}
