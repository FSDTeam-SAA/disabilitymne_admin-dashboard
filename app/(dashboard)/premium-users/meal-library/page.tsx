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
  assignNutritionPlanToPremiumUser,
  deleteNutritionPlan,
  duplicateAdminNutritionPlan,
  getAdminNutritionPlans,
  getAdminPremiumUsers,
  getErrorMessage,
  type NutritionPlan,
} from "@/lib/api";

const PAGE_SIZE = 10;
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function MealProgramLibraryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<NutritionPlan | null>(null);
  const [assignUserId, setAssignUserId] = useState("");

  const plansQuery = useQuery({
    queryKey: ["premium-meal-library", page, search],
    queryFn: () =>
      getAdminNutritionPlans({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        templatesOnly: true,
      }),
  });

  const premiumUsersQuery = useQuery({
    queryKey: ["admin-premium-users-picker-meals"],
    queryFn: () => getAdminPremiumUsers({ page: 1, limit: 100 }),
    enabled: assignOpen,
  });

  const plans = useMemo(() => plansQuery.data?.data || [], [plansQuery.data]);
  const meta = plansQuery.data?.meta;
  const premiumUsers = premiumUsersQuery.data?.data || [];

  const assignMutation = useMutation({
    mutationFn: () =>
      assignNutritionPlanToPremiumUser(selected!.id, { userId: assignUserId }),
    onSuccess: () => {
      toast.success("Meal program assigned to premium user");
      setAssignOpen(false);
      setAssignUserId("");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["admin-premium-users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (planId: string) => duplicateAdminNutritionPlan(planId, { asTemplate: true }),
    onSuccess: () => {
      toast.success("Meal program duplicated");
      queryClient.invalidateQueries({ queryKey: ["premium-meal-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => deleteNutritionPlan(planId),
    onSuccess: () => {
      toast.success("Meal program deleted");
      setDeleteOpen(false);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["premium-meal-library"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Meal Program Library"
        breadcrumb="Dashboard  >  Premium Users  >  Meal Program Library"
      />
      <p className="text-sm text-slate-300">
        Reusable meal programs structured as Monday–Sunday with Meal 1 / Snack 1 / Meal 2 / Snack 2 / Meal 3 / Snack 3
        slots. Assign to premium users without recreating plans.
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
          placeholder="Search meal programs"
          className="md:max-w-md"
        />
        <Button type="submit" className="gap-2">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      {plansQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : plansQuery.isError ? (
        <EmptyState title="Failed to load meal library" description={getErrorMessage(plansQuery.error)} />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No meal program templates"
          description={`Create a nutrition plan with isTemplate=true. Day labels: ${DAY_LABELS.join(", ")}.`}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#7cb6df33]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meal Program</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Meals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <p className="font-medium text-white">{plan.title}</p>
                    <p className="line-clamp-1 text-xs text-slate-400">{plan.description || "—"}</p>
                  </TableCell>
                  <TableCell>{plan.dayCount}</TableCell>
                  <TableCell>{plan.mealCount ?? 0}</TableCell>
                  <TableCell className="capitalize">{plan.status}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(plan);
                          setAssignOpen(true);
                        }}
                      >
                        <UserPlus className="size-4" />
                        Assign
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => duplicateMutation.mutate(plan.id)}>
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelected(plan);
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

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign meal program">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Assign <strong>{selected?.title}</strong> to a premium user.
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
        title="Delete meal template?"
        description={`This will archive "${selected?.title}". Assigned user copies are not deleted.`}
        confirmText="Delete"
        onConfirm={() => selected && deleteMutation.mutate(selected.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
