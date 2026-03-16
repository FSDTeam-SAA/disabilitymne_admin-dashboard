"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminUsers, getSubscriptionPlans } from "@/lib/api";
import { planPriceFallback } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function RevenuePage() {
  const [page, setPage] = useState(1);
  const [subscription, setSubscription] = useState("");

  const usersQuery = useQuery({
    queryKey: ["revenue-users", page, subscription],
    queryFn: () =>
      getAdminUsers({
        page,
        limit: 10,
        subscription: subscription || undefined,
      }),
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
      const price = planMap.get(user.selectedPlan) ?? planPriceFallback[user.selectedPlan] ?? 0;
      return {
        ...user,
        amount: price,
      };
    });
  }, [planMap, usersQuery.data?.data]);

  return (
    <div className="space-y-5">
      <PageTitle title="Revenue" breadcrumb="Dashboard  >  Revenue" />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex justify-end">
            <Select
              value={subscription}
              className="w-56"
              onChange={(event) => {
                setPage(1);
                setSubscription(event.target.value);
              }}
            >
              <option value="">All</option>
              <option value="free_trial">Free Trial</option>
              <option value="monthly_plan">Monthly</option>
              <option value="six_month_plan">Six Month</option>
              <option value="premium_plan">Premium</option>
            </Select>
          </div>

          {usersQuery.isLoading ? (
            <TableSkeleton rows={12} />
          ) : rows.length === 0 ? (
            <EmptyState title="No revenue rows" description="No payment linked users found." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Subscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{formatCurrency(row.amount)}</TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.selectedPlan === "premium_plan"
                              ? "green"
                              : row.selectedPlan === "six_month_plan"
                                ? "blue"
                                : row.selectedPlan === "monthly_plan"
                                  ? "orange"
                                  : "neutral"
                          }
                        >
                          {row.subscription}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="text-sm text-slate-300">
                Showing {rows.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + rows.length} of {usersQuery.data?.meta?.total || 0}
                results
              </p>

              <Pagination page={page} totalPages={usersQuery.data?.meta?.totalPages || 1} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
