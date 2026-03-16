"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <div className="mt-4 flex items-center justify-end gap-2">
      <Button variant="outline" size="icon" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
        <ChevronLeft className="size-4" />
      </Button>
      {pages.map((item) => (
        <Button
          key={item}
          variant={item === page ? "secondary" : "outline"}
          size="sm"
          onClick={() => onPageChange(item)}
          className="min-w-10"
        >
          {item}
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
