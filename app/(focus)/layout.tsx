import { LearnHeader } from "@/components/learn/learn-header";

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LearnHeader />
      <main className="flex-1 flex flex-col min-h-0 relative">
        {children}
      </main>
    </div>
  );
}
