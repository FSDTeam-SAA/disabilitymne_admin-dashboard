"use client";

import { Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWorkoutExperiences, type WorkoutExperience } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function levelLabel(value: string) {
  if (value === "very_hard") return "Very Hard";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function levelEmoji(value: string) {
  if (value === "easy") return "??";
  if (value === "intermediate") return "??";
  if (value === "very_hard") return "??";
  return "-";
}

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<WorkoutExperience | null>(null);

  const query = useQuery({
    queryKey: ["workout-feedback", page, search, level],
    queryFn: () =>
      getWorkoutExperiences({
        page,
        limit: 10,
        search,
        experienceLevel: level || undefined,
      }),
  });

  const rows = useMemo(() => query.data?.data || [], [query.data?.data]);

  return (
    <div className="space-y-5">
      <PageTitle title="Feedback" breadcrumb="Dashboard  >  Feedback" />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search notes"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
            />
            <Select
              value={level}
              className="md:w-52"
              onChange={(event) => {
                setPage(1);
                setLevel(event.target.value);
              }}
            >
              <option value="">All levels</option>
              <option value="easy">Easy</option>
              <option value="intermediate">Intermediate</option>
              <option value="very_hard">Very hard</option>
            </Select>
          </div>

          {query.isLoading ? (
            <TableSkeleton rows={10} />
          ) : rows.length === 0 ? (
            <EmptyState title="No feedback found" description="Workout completion feedback will appear here." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>
                        {[feedback.user?.firstName, feedback.user?.lastName].filter(Boolean).join(" ") || "-"}
                      </TableCell>
                      <TableCell>{feedback.user?.email || "-"}</TableCell>
                      <TableCell>{feedback.program?.programName || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{levelEmoji(feedback.experienceLevel)}</span>
                          <span>{levelLabel(feedback.experienceLevel)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(feedback.completedAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFeedback(feedback);
                          }}
                        >
                          <Eye className="mr-2 size-4" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="text-sm text-slate-300">
                Showing {rows.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + rows.length} of {query.data?.meta?.total || 0}
                results
              </p>

              <Pagination page={page} totalPages={query.data?.meta?.totalPages || 1} onPageChange={setPage} />
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
