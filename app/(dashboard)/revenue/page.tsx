"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAdminSubscriptions,
  getAdminUsers,
  getErrorMessage,
  getSubscriptionPlans,
  syncAdminSubscriptions,
} from "@/lib/api";
import { planPriceFallback } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const getSubscriptionMeta = (planKey?: string | null) => {
  const key = String(planKey || "").toLowerCase();

  if (key === "premium") {
    return {
      label: "Premium user",
      className: "border-transparent bg-[#2ccf62] text-white",
    };
  }

  if (key === "annual") {
    return {
      label: "Annual user",
      className: "border-transparent bg-[#1f97ff] text-white",
    };
  }

  if (key === "quarterly") {
    return {
      label: "Quarterly user",
      className: "border-transparent bg-[#8f7dff] text-white",
    };
  }

  if (key === "monthly") {
    return {
      label: "Monthly user",
      className: "border-transparent bg-[#ff9f31] text-white",
    };
  }

  return {
    label: "No plan",
    className: "border-white/30 bg-transparent text-slate-200",
  };
};

export default function RevenuePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [subscription, setSubscription] = useState("");
  const [subPage, setSubPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [subSearch, setSubSearch] = useState("");
  const [subSearchInput, setSubSearchInput] = useState("");

  const usersQuery = useQuery({
    queryKey: ["revenue-users", page, subscription],
    queryFn: () =>
      getAdminUsers({
        page,
        limit: 10,
        subscription: subscription || undefined,
      }),
  });

  const subscriptionsQuery = useQuery({
    queryKey: ["admin-subscriptions", subPage, statusFilter, subSearch],
    queryFn: () =>
      getAdminSubscriptions({
        page: subPage,
        limit: 10,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: subSearch || undefined,
      }),
  });

  const syncMutation = useMutation({
    mutationFn: syncAdminSubscriptions,
    onSuccess: (data) => {
      toast.success(`Synced ${data.updated} expired subscription(s).`);
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const plansQuery = useQuery({
    queryKey: ["revenue-plans"],
    queryFn: () => getSubscriptionPlans(true),
  });

  const planMap = useMemo(() => {
    const map = new Map<string, number>();
    (plansQuery.data || []).forEach((plan) => map.set(plan.key, plan.price));
    return map;
  }, [plansQuery.data]);

  const rows = useMemo(() => {
    return (usersQuery.data?.data || []).map((user) => {
      const selectedPlan = user.selectedPlan ?? "";
      const price = selectedPlan
        ? planMap.get(selectedPlan) ?? planPriceFallback[selectedPlan] ?? 0
        : 0;
      return {
        ...user,
        amount: price,
      };
    });
  }, [planMap, usersQuery.data?.data]);
  const totalCount = usersQuery.data?.meta?.total || 0;
  const totalPages = usersQuery.data?.meta?.totalPages || 1;
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 3) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const start = Math.max(1, Math.min(page - 1, totalPages - 2));
    return [start, start + 1, start + 2];
  }, [page, totalPages]);

  return (
    <div className="space-y-5">
      <PageTitle title="Revenue" breadcrumb="Dashboard  >  Revenue" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">User Subscriptions</h2>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`size-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sync statuses
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "active", "pending_payment", "expired", "cancelled", "trial"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setStatusFilter(status);
              setSubPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs capitalize ${
              statusFilter === status
                ? "bg-[#72B4E6] text-[#112f52]"
                : "border border-white/20 text-slate-300"
            }`}
          >
            {status.replace("_", " ")}
            {status !== "all" && subscriptionsQuery.data?.meta?.counts
              ? ` (${(subscriptionsQuery.data.meta.counts as Record<string, number>)[status] ?? 0})`
              : ""}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-3 md:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSubPage(1);
          setSubSearch(subSearchInput.trim());
        }}
      >
        <Input
          value={subSearchInput}
          onChange={(event) => setSubSearchInput(event.target.value)}
          placeholder="Search subscribers by name or email"
          className="md:max-w-md"
        />
        <Button type="submit">Search</Button>
      </form>

      {subscriptionsQuery.isLoading ? (
        <TableSkeleton rows={6} />
      ) : subscriptionsQuery.isError ? (
        <EmptyState title="Failed to load subscriptions" description={getErrorMessage(subscriptionsQuery.error)} />
      ) : (subscriptionsQuery.data?.data || []).length === 0 ? (
        <EmptyState title="No subscriptions" description="No users match this subscription filter." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#7cb6df33]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Ends</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subscriptionsQuery.data?.data || []).map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </TableCell>
                  <TableCell className="capitalize">{user.selectedPlan || user.planKey || "—"}</TableCell>
                  <TableCell>
                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs capitalize">
                      {(user.subscriptionStatus || "none").replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {user.subscriptionStartedAt
                      ? new Date(user.subscriptionStartedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {user.subscriptionEndsAt
                      ? new Date(user.subscriptionEndsAt).toLocaleDateString()
                      : "Open"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {subscriptionsQuery.data?.meta && subscriptionsQuery.data.meta.totalPages > 1 ? (
        <Pagination
          page={subscriptionsQuery.data.meta.page}
          totalPages={subscriptionsQuery.data.meta.totalPages}
          onPageChange={setSubPage}
        />
      ) : null}

      <h2 className="pt-4 text-lg font-semibold text-white">Revenue by User</h2>

      <Card className="overflow-hidden border-[#80b8df42]">
        <CardContent className="space-y-4 p-0">
          <div className="flex items-center justify-end gap-2 px-4 pt-4 text-xs text-slate-300">
            <span>Sort by:</span>
            <Select
              value={subscription}
              className="h-8 w-24 rounded-full border-[#8ec5eb7a] bg-[#0e2444]/80 px-2 text-xs"
              onChange={(event) => {
                setPage(1);
                setSubscription(event.target.value);
              }}
            >
              <option value="">All</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="premium">Premium</option>
            </Select>
          </div>

          {usersQuery.isLoading ? (
            <div className="px-4 pb-4">
              <TableSkeleton rows={12} />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 pb-6">
              <EmptyState title="No revenue rows" description="No payment linked users found." />
            </div>
          ) : (
            <>
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 text-xs">User Name</TableHead>
                    <TableHead className="h-11 text-xs">Email</TableHead>
                    <TableHead className="h-11 text-xs">Revenue</TableHead>
                    <TableHead className="h-11 text-xs">Date</TableHead>
                    <TableHead className="h-11 text-xs">Subscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const subscriptionMeta = getSubscriptionMeta(row.selectedPlan);
                    const amountLabel = `${Number(row.amount || 0).toFixed(2)}$`;

                    return (
                    <TableRow key={row.id} className="border-white/30 hover:bg-white/[0.03]">
                      <TableCell className="py-3 text-sm">{row.name}</TableCell>
                      <TableCell className="py-3 text-sm">{row.email}</TableCell>
                      <TableCell className="py-3 text-sm">{amountLabel}</TableCell>
                      <TableCell className="py-3 text-sm">{formatDate(row.createdAt)}</TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex min-w-36 items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold ${subscriptionMeta.className}`}>
                          {subscriptionMeta.label}
                        </span>
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
    </div>
  );
}
