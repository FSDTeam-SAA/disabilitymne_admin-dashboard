"use client";

import { MessageCircleMore, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createOrGetChatThread,
  deleteAdminPremiumUser,
  getAdminPremiumUsers,
  getErrorMessage,
  type AdminUser,
} from "@/lib/api";

const PAGE_SIZE = 10;

export default function PremiumUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const premiumUsersQuery = useQuery({
    queryKey: ["admin-premium-users", page, search],
    queryFn: () => getAdminPremiumUsers({ page, limit: PAGE_SIZE, search: search || undefined }),
  });

  const users = useMemo(() => premiumUsersQuery.data?.data || [], [premiumUsersQuery.data]);
  const meta = premiumUsersQuery.data?.meta;

  const [openingChatForUserId, setOpeningChatForUserId] = useState<string | null>(null);

  const openChatMutation = useMutation({
    mutationFn: async (user: AdminUser) => {
      const thread = await createOrGetChatThread({ premiumUserId: user.id });
      return { thread, user };
    },
    onSuccess: ({ thread, user }) => {
      const name = user.name || thread.counterpart?.firstName || "";
      const email = user.email || thread.counterpart?.email || "";
      const query = new URLSearchParams();
      if (name) {
        query.set("name", name);
      }
      if (email) {
        query.set("email", email);
      }
      router.push(`/support/chat/${thread.id}${query.size > 0 ? `?${query.toString()}` : ""}`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setOpeningChatForUserId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      deleteAdminPremiumUser(userId, {
        note: "Premium access removed from admin Premium Users page",
      }),
    onSuccess: () => {
      toast.success("Premium access removed. User account retained.");
      setDeleteOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-premium-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

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
              <div
                key={user.id}
                className="flex w-full items-start justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/premium-users/${user.id}`)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
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
                </button>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="inline-flex rounded-full border border-[#8ecaf2]/50 bg-[#72B4E6]/20 px-2 py-0.5 text-xs text-[#d7efff]">
                    {user.subscriptionStatus || "Premium"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOpeningChatForUserId(user.id);
                        openChatMutation.mutate(user);
                      }}
                      disabled={openChatMutation.isPending && openingChatForUserId === user.id}
                    >
                      <MessageCircleMore className="size-4" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/premium-users/${user.id}`)}
                    >
                      Manage
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedUser(user);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remove premium access?"
        description={`This removes premium access for "${selectedUser?.name || selectedUser?.email}" and archives their assigned premium workout/meal plans. The normal user account is kept.`}
        confirmText="Remove Premium"
        onConfirm={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
