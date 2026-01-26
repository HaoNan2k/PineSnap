import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PineSnap - Nordic Learning",
  description: "Transform content into active knowledge",
  icons: {
    icon: "/brand-icon.svg",
  },
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "optional",
  variable: "--font-inter",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  display: "optional",
  variable: "--font-merriweather",
});

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
        className={`${inter.variable} ${merriweather.variable} antialiased`}
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
