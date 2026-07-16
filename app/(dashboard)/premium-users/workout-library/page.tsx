"use client";

import { Copy, Search, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignProgramToPremiumUser,
  deleteProgram,
  duplicateAdminProgram,
  getAdminPremiumUsers,
  getAdminPrograms,
  getErrorMessage,
  type Program,
} from "@/lib/api";

const PAGE_SIZE = 10;

export default function WorkoutProgramLibraryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Program | null>(null);
  const [assignUserId, setAssignUserId] = useState("");

  const programsQuery = useQuery({
    queryKey: ["premium-workout-library", page, search],
    queryFn: () =>
      getAdminPrograms({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        templatesOnly: true,
      }),
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["admin-premium-users-picker"],
    queryFn: () => getAdminPremiumUsers({ page: 1, limit: 100 }),
    enabled: assignOpen,
  });

  const programs = useMemo(() => programsQuery.data?.data || [], [programsQuery.data]);
  const meta = programsQuery.data?.meta;
  const premiumUsers = premiumUsersQuery.data?.data || [];

  const assignMutation = useMutation({
    mutationFn: () =>
      assignProgramToPremiumUser(selected!.id, { userId: assignUserId }),
    onSuccess: () => {
      toast.success("Program assigned to premium user");
      setAssignOpen(false);
      setAssignUserId("");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["admin-premium-users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (programId: string) => duplicateAdminProgram(programId, { asTemplate: true }),
    onSuccess: () => {
      toast.success("Program duplicated");
      queryClient.invalidateQueries({ queryKey: ["premium-workout-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (programId: string) => deleteProgram(programId),
    onSuccess: () => {
      toast.success("Program deleted");
      setDeleteOpen(false);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["premium-workout-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Workout Program Library"
        breadcrumb="Dashboard  >  Premium Users  >  Workout Program Library"
      />
      <p className="text-sm text-slate-300">
        Reusable premium workout templates. Assign to a premium user with one click — programs here never appear in
        Program Management.
      </p>

      <form
        className="flex flex-col gap-3 md:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
      >
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search workout programs"
          className="md:max-w-md"
        />
        <Button type="submit" className="gap-2">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      {programsQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : programsQuery.isError ? (
        <EmptyState title="Failed to load library" description={getErrorMessage(programsQuery.error)} />
      ) : programs.length === 0 ? (
        <EmptyState
          title="No workout templates"
          description="Create a premium program with isTemplate=true, or duplicate an existing premium program into the library."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#7cb6df33]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <p className="font-medium text-white">{program.programName}</p>
                    <p className="text-xs text-slate-400">{program.durationMinutes} min · {program.totalExercises} exercises</p>
                  </TableCell>
                  <TableCell className="capitalize">{program.programLevel}</TableCell>
                  <TableCell>{program.workoutDays?.length || 0}</TableCell>
                  <TableCell className="capitalize">{program.status}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(program);
                          setAssignOpen(true);
                        }}
                      >
                        <UserPlus className="size-4" />
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateMutation.mutate(program.id)}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelected(program);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      ) : null}

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign workout program">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Assign <strong>{selected?.programName}</strong> to a premium user.
          </p>
          <Select value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)}>
            <option value="">Select premium user</option>
            {premiumUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!assignUserId || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete workout template?"
        description={`This will archive "${selected?.programName}". Assigned user copies are not deleted.`}
        confirmText="Delete"
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
