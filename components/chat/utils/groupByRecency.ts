import type { Conversation } from "@/components/chat/types";
import type { ConversationGroup } from "@/components/chat/types";

function startOfDay(date: Date | number) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function groupByRecency(conversations: Conversation[]): ConversationGroup[] {
  const now = Date.now();
  const todayStart = startOfDay(now);
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  const today: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const earlier: Conversation[] = [];

  for (const c of conversations) {
    // c.updatedAt is Date
    const time = c.updatedAt.getTime();
    
    if (time >= todayStart) {
      today.push(c);
    } else if (time >= weekStart) {
      thisWeek.push(c);
    } else {
      earlier.push(c);
    }
  }

  const groups: ConversationGroup[] = [];
  if (today.length) groups.push({ id: "today", label: "Today", items: today });
  if (thisWeek.length)
    groups.push({ id: "this_week", label: "This Week", items: thisWeek });
  if (earlier.length)
    groups.push({ id: "earlier", label: "Earlier", items: earlier });

  return groups;
}
