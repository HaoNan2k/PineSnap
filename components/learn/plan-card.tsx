import { Response } from "@/components/chat/components/response";

export function PlanCard({ plan }: { plan: string }) {
  return (
    <div className="text-sm text-text-main bg-white/70 border border-sand/20 rounded-2xl p-6 overflow-x-auto">
      <Response>{plan}</Response>
    </div>
  );
}
