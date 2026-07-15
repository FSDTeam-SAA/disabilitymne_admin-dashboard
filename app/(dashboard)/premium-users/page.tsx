"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Input } from "@/components/ui/input";
import { getAdminPremiumUsers, getErrorMessage } from "@/lib/api";

const PAGE_SIZE = 10;

export default function PremiumUsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const premiumUsersQuery = useQuery({
    queryKey: ["admin-premium-users", page, search],
    queryFn: () => getAdminPremiumUsers({ page, limit: PAGE_SIZE, search: search || undefined }),
  });

  const users = useMemo(() => premiumUsersQuery.data?.data || [], [premiumUsersQuery.data]);
  const meta = premiumUsersQuery.data?.meta;

  return (
    <div className="space-y-5">
      <PageTitle title="Premium Users" breadcrumb="Dashboard  >  Premium Users" />

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
          placeholder="Search by name, email, or phone"
          className="md:max-w-md"
        />
        <button
          type="submit"
          className="h-10 rounded-md bg-[#72B4E6] px-4 text-sm font-medium text-[#112f52] hover:bg-[#84c4ef]"
        >
          Search
        </button>
      </form>

      {premiumUsersQuery.isLoading ? (
        <TableSkeleton rows={8} />
      ) : premiumUsersQuery.isError ? (
        <EmptyState title="Failed to load premium users" description={getErrorMessage(premiumUsersQuery.error)} />
      ) : users.length === 0 ? (
        <EmptyState title="No premium users" description="Active Premium subscribers will appear here." />
      ) : (
        <div className="space-y-1 rounded-xl border border-[#7cb6df33] bg-[linear-gradient(120deg,rgba(18,40,72,.72)_0%,rgba(29,56,96,.56)_55%,rgba(24,46,79,.68)_100%)] p-2">
          {users.map((user) => {
            const initials = (user.name || "P")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join("");

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => router.push(`/premium-users/${user.id}`)}
                className="flex w-full items-start justify-between gap-4 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xs font-semibold text-white">
                    {initials || "P"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{user.name || "Premium User"}</p>
                    <p className="truncate text-sm text-slate-200">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Workout plan: {user.hasWorkoutPlan ? "Assigned" : "Not assigned"} · Nutrition plan:{" "}
                      {user.hasNutritionPlan ? "Assigned" : "Not assigned"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex rounded-full border border-[#8ecaf2]/50 bg-[#72B4E6]/20 px-2 py-0.5 text-xs text-[#d7efff]">
                    Premium
                  </span>
                  <p className="mt-2 text-xs text-slate-300">Manage plans →</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      ) : null}
    </div>
  );
}
