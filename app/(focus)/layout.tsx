import { LearnHeader } from "@/components/learn/learn-header";

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <LearnHeader />
      <main className="flex-1 min-h-0 relative">
        {children}
      </main>
    </div>
  );
}
