"use client";

import { ChevronLeft, ChevronRight, Eye, Frown, Meh, Smile, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWorkoutExperiences, type WorkoutExperience } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function levelLabel(value: string) {
  if (value === "very_hard") return "Very Hard";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function levelMeta(value: string) {
  if (value === "easy") return { label: "Easy", icon: Smile, className: "text-[#2cd46d]" };
  if (value === "intermediate") return { label: "Intermediate", icon: Meh, className: "text-[#ffd633]" };
  if (value === "very_hard") return { label: "Very Hard", icon: Frown, className: "text-[#ffd633]" };
  return { label: "-", icon: Meh, className: "text-slate-300" };
}

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<WorkoutExperience | null>(null);

  const query = useQuery({
    queryKey: ["workout-feedback", page, level],
    queryFn: () =>
      getWorkoutExperiences({
        page,
        limit: 10,
        experienceLevel: level || undefined,
      }),
  });

  const rows = useMemo(() => query.data?.data || [], [query.data?.data]);
  const totalCount = query.data?.meta?.total || 0;
  const totalPages = query.data?.meta?.totalPages || 1;
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];

    return Array.from({ length: totalPages }, (_, index) => index + 1).slice(
      Math.max(0, page - 2),
      Math.min(totalPages, page + 1)
    );
  }, [page, totalPages]);

  return (
    <div className="space-y-5">
      <PageTitle title="Feedback" breadcrumb="Dashboard  >  Feedback" />

      <Card className="overflow-hidden border-[#80b8df42]">
        <CardContent className="space-y-4 p-0">
          <div className="flex items-center justify-end gap-2 px-4 pt-4 text-xs text-slate-300">
            <span>Sort by:</span>
            <Select
              value={level}
              className="h-8 w-24 rounded-full border-[#8ec5eb7a] bg-[#0e2444]/80 px-2 text-xs"
              onChange={(event) => {
                setPage(1);
                setLevel(event.target.value);
              }}
            >
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="intermediate">Intermediate</option>
              <option value="very_hard">Very hard</option>
            </Select>
          </div>

          {query.isLoading ? (
            <div className="px-4 pb-4">
              <TableSkeleton rows={10} />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 pb-6">
              <EmptyState title="No feedback found" description="Workout completion feedback will appear here." />
            </div>
          ) : (
            <>
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 text-xs">User Name</TableHead>
                    <TableHead className="h-11 text-xs">User Email</TableHead>
                    <TableHead className="h-11 text-xs">Exercise Name</TableHead>
                    <TableHead className="h-11 text-xs">Experience</TableHead>
                    <TableHead className="h-11 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((feedback) => {
                    const experience = levelMeta(feedback.experienceLevel);
                    const ExperienceIcon = experience.icon;

                    return (
                    <TableRow key={feedback.id} className="border-white/30 hover:bg-white/[0.03]">
                      <TableCell className="py-3 text-sm">
                        {[feedback.user?.firstName, feedback.user?.lastName].filter(Boolean).join(" ") || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-sm">{feedback.user?.email || "-"}</TableCell>
                      <TableCell className="py-3 text-sm">{feedback.program?.programName || "-"}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <ExperienceIcon className={`size-8 ${experience.className}`} strokeWidth={2.3} />
                          <span className="text-xs font-medium text-slate-100">{experience.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-2 rounded-md border border-[#2f80cc] bg-[#102849] px-3 text-xs font-semibold text-[#63bfff] transition-colors hover:bg-[#16345c]"
                            onClick={() => {
                              setSelectedFeedback(feedback);
                            }}
                            aria-label="View feedback details"
                          >
                            <Eye className="size-3.5" />
                            View Details
                          </button>
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-full bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff416f]"
                            aria-label="Delete feedback"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-2 border-t border-white/25 px-4 pb-4 pt-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-slate-300/80">
                  Showing {rows.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + rows.length} of {totalCount}
                  results
                </p>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded border border-white/35 text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {pageNumbers.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-xs font-semibold transition-colors ${
                          item === page
                            ? "border-white bg-white text-[#0f2747]"
                            : "border-white/35 bg-transparent text-slate-100 hover:bg-white/10"
                        }`}
                        onClick={() => setPage(item)}
                        aria-label={`Go to page ${item}`}
                      >
                        {item}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded border border-[#7fc7f6] bg-[#6aaee0] text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={Boolean(selectedFeedback)} onClose={() => setSelectedFeedback(null)} title="Note Details" className="max-w-3xl">
        {selectedFeedback ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
                <p className="text-xs text-slate-300">User Name</p>
                <p className="text-base text-white">
                  {[selectedFeedback.user?.firstName, selectedFeedback.user?.lastName].filter(Boolean).join(" ") || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
                <p className="text-xs text-slate-300">Email</p>
                <p className="text-base text-white">{selectedFeedback.user?.email || "-"}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
                <p className="text-xs text-slate-300">Program</p>
                <p className="text-base text-white">{selectedFeedback.program?.programName || "-"}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
                <p className="text-xs text-slate-300">Experience</p>
                <p className="text-base text-white">{levelLabel(selectedFeedback.experienceLevel)}</p>
              </div>
            </div>
            <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
              <p className="text-xs text-slate-300">Exercise Note</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{selectedFeedback.notes || "No note"}</p>
            </div>
            <p className="text-right text-sm text-slate-300">{formatDate(selectedFeedback.completedAt)}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
