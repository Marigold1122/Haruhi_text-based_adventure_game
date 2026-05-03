import type { CanonEvent } from "@/data/canonTimeline";
import type { RagEntry } from "@/types/rag";
import { resolveEntityIdsFromNames } from "./entityResolver";

export function canonToRagEntries(events: CanonEvent[]): RagEntry[] {
  return events.map((event) => ({
    id: `canon_${event.id}`,
    title: event.title,
    content: [
      `${event.date.iso} · ${event.title}`,
      `概要：${event.summary}`,
      `主线作用：${event.narrativeFunction}`,
      `地点：${event.location ?? "未指定"}`,
      `参与者：${event.participants.join("、")}`,
    ].join("\n"),
    kind: "canon_event",
    source: { type: "canon_timeline", id: event.id },
    entityIds: resolveEntityIdsFromNames(event.participants),
    aliases: [event.title, event.id, ...event.participants],
    locationTags: event.location ? [event.location] : [],
    arcIds: event.chainId ? [event.chainId] : [],
    dateWindow: { from: event.date.iso, to: event.date.iso, beforeDays: 14, afterDays: 14 },
    chainId: event.chainId,
    priority: event.importance === "main_line" ? 90 : 55,
    tokenBudgetHint: event.scope === "large" ? 420 : 260,
    position: "after_char",
  }));
}
