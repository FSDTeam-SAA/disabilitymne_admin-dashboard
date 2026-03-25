"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, page - 2),
    Math.min(totalPages, page + 1)
  );

  return (
    <div className="mt-3 flex items-center justify-end gap-1">
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded border border-white/35 text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-xs font-semibold transition-colors ${
            item === page
              ? "border-white bg-white text-[#0f2747]"
              : "border-white/35 bg-transparent text-slate-100 hover:bg-white/10"
          }`}
          onClick={() => onPageChange(item)}
          aria-label={`Go to page ${item}`}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded border border-[#7fc7f6] bg-[#6aaee0] text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
