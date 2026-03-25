"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ProgramFormActionsProps {
  isPending: boolean;
  isEditMode: boolean;
  onCancel: () => void;
}

export function ProgramFormActions({ isPending, isEditMode, onCancel }: ProgramFormActionsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-2">
      <button
        type="button"
        className="h-10 rounded border border-[#7cb6df66] bg-transparent text-xs font-semibold text-slate-100 transition-colors hover:bg-white/5"
        onClick={onCancel}
      >
        Cancel
      </button>
      <Button
        type="submit"
        disabled={isPending}
        className="h-10 rounded border border-[#9cd7ff6e] bg-[linear-gradient(180deg,#98d5f8_0%,#5d97c4_100%)] text-xs"
      >
        <Plus className="mr-1 size-3.5" />
        {isPending ? "Saving..." : isEditMode ? "Save" : "Add New Program"}
      </Button>
    </div>
  );
}
