import { Badge } from "@/components/ui/badge";

interface StatusChipProps {
  value?: string | null;
}

const variants: Record<string, "green" | "orange" | "red" | "blue" | "neutral"> = {
  active: "green",
  resolved: "green",
  open: "blue",
  in_progress: "blue",
  closed: "neutral",
  pending: "orange",
  deactivated: "orange",
  draft: "orange",
  archived: "neutral",
  suspended: "red",
  failed: "red",
};

export function StatusChip({ value }: StatusChipProps) {
  const normalized = String(value || "").toLowerCase();
  const variant = variants[normalized] || "neutral";

  return <Badge variant={variant}>{normalized || "unknown"}</Badge>;
}
