import type { ProposedAlert } from "@/workers/alerts/rules";

export type ExistingAlert = {
  dedupKey: string;
  level: "critical" | "warning" | "info";
  status: "active" | "acknowledged" | "resolved" | "silenced";
  lastSeenAt: Date;
};

export function applyDedup(proposed: ProposedAlert[], existing: ExistingAlert[], now: Date): ProposedAlert[] {
  return proposed.filter((alert) => {
    if (alert.level === "critical") return true;

    const active = existing.find(
      (item) => item.dedupKey === alert.dedupKey && (item.status === "active" || item.status === "acknowledged")
    );
    if (!active) return true;

    const hoursSinceSeen = (now.getTime() - active.lastSeenAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSeen >= 6;
  });
}
