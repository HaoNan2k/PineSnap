import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "sonner";
import { requireEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "PineSnap - Nordic Learning",
  description: "Transform content into active knowledge",
  icons: {
    icon: "/brand-icon.svg",
  },
};

const plusJakarta = localFont({
  src: "../public/fonts/plus-jakarta-sans-latin.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  variable: "--font-plus-jakarta",
});

const fraunces = localFont({
  src: [
    {
      path: "../public/fonts/fraunces-latin.woff2",
      style: "normal",
    },
    {
      path: "../public/fonts/fraunces-latin-italic.woff2",
      style: "italic",
    },
  ],
  weight: "300 700",
  display: "swap",
  variable: "--font-fraunces",
});

const jetbrainsMono = localFont({
  src: "../public/fonts/jetbrains-mono-latin.woff2",
  weight: "400 500",
  style: "normal",
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${fraunces.variable} ${jetbrainsMono.variable} antialiased`}
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
