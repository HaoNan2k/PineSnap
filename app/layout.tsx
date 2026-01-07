import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "AI Chat",
  description: "AI 聊天应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="antialiased"
      >
        <TRPCProvider>
          <AuthProvider supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey}>
            {children}
            <Toaster position="bottom-right" richColors />
          </AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
