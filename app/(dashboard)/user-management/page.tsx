"use client";

import { Ban, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminUser,
  getAdminUsers,
  getErrorMessage,
  getSubscriptionPlans,
  updateAdminUserStatus,
  type AdminUser,
  type SubscriptionPlan,
} from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const toLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getSubscriptionMeta = (value: string) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("premium")) {
    return {
      label: "Premium user",
      className: "bg-[#37d66f] text-white",
    };
  }

  if (normalized.includes("annual")) {
    return {
      label: "Annual user",
      className: "bg-[#0d97ff] text-white",
    };
  }

  if (normalized.includes("quarterly")) {
    return {
      label: "Quarterly user",
      className: "bg-[#8f7dff] text-white",
    };
  }

  if (normalized.includes("monthly")) {
    return {
      label: "Monthly user",
      className: "bg-[#ff9f31] text-white",
    };
  }

  if (normalized.includes("active")) {
    return {
      label: "active",
      className: "border border-[#31c56f] bg-[#0f4f36]/85 text-[#39dd78]",
    };
  }

  return {
    label: value ? toLabel(value) : "N/A",
    className: "bg-[#2d4f78] text-white",
  };
};

const getStatusMeta = (value: string) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "active") {
    return {
      label: "active",
      className: "border-[#31c56f]/85 bg-[#0d4d34]/85 text-[#38d978]",
    };
  }

  if (normalized === "deactivated") {
    return {
      label: "Deactivated",
      className: "border-[#ff9f31]/85 bg-[#5f3b15]/70 text-[#ff9f31]",
    };
  }

  if (normalized === "suspended") {
    return {
      label: "Suspended",
      className: "border-[#ff2f5f]/85 bg-[#5b1730]/70 text-[#ff4672]",
    };
  }

  return {
    label: value ? toLabel(value) : "Unknown",
    className: "border-white/30 bg-white/10 text-slate-100",
  };
};

const getSponsoredMeta = (isSponsored: boolean) => {
  if (isSponsored) {
    return {
      label: "Sponsored",
      className: "border border-[#45cc7c]/80 bg-[#0a5034]/80 text-[#5fe28f]",
    };
  }

  return {
    label: "Standard",
    className: "border border-white/25 bg-white/10 text-slate-200",
  };
};

const defaultSponsoredForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  temporaryPassword: "",
  sponsorshipNote: "",
  planKey: "monthly",
};

export default function UserManagementPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusUser, setStatusUser] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sponsoredForm, setSponsoredForm] = useState(defaultSponsoredForm);

  const query = useQuery({
    queryKey: ["admin-users", page, status],
    queryFn: () => getAdminUsers({ page, limit: 10, status: status || undefined }),
  });

  const plansQuery = useQuery({
    queryKey: ["subscription-plans", "active"],
    queryFn: () => getSubscriptionPlans(false),
  });

  const activePlans = useMemo<SubscriptionPlan[]>(
    () => (plansQuery.data || []).filter((plan) => plan.isActive),
    [plansQuery.data]
  );

  const changeStatusMutation = useMutation({
    mutationFn: ({ userId, accountStatus }: { userId: string; accountStatus: "active" | "deactivated" | "suspended" }) =>
      updateAdminUserStatus(userId, accountStatus),
    onSuccess: () => {
      toast.success("User status updated.");
      setStatusOpen(false);
      setStatusUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const createSponsoredMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      toast.success("Sponsored user created.");
      setCreateOpen(false);
      setSponsoredForm(defaultSponsoredForm);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const users = useMemo(() => query.data?.data || [], [query.data?.data]);

  const totalPages = query.data?.meta?.totalPages || 1;
  const visiblePages = useMemo(() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(page - 1, totalPages - 2));
    return [start, start + 1, start + 2];
  }, [page, totalPages]);

  const nextStatus = statusUser?.status === "active" ? "suspended" : "active";
  const statusActionText = nextStatus === "suspended" ? "Block" : "Activate";
  const statusDescription =
    nextStatus === "suspended"
      ? "You want to block this user from the platform."
      : "You want to activate this user again.";

  const resolvedSponsoredPlanKey = useMemo(() => {
    if (activePlans.some((plan) => plan.key === sponsoredForm.planKey)) {
      return sponsoredForm.planKey;
    }
    return activePlans[0]?.key || "";
  }, [activePlans, sponsoredForm.planKey]);

  const handleCreateSponsoredUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createSponsoredMutation.mutate({
      firstName: sponsoredForm.firstName.trim(),
      lastName: sponsoredForm.lastName.trim() || undefined,
      email: sponsoredForm.email.trim().toLowerCase(),
      phone: sponsoredForm.phone.trim() || undefined,
      temporaryPassword: sponsoredForm.temporaryPassword,
      sponsorshipNote: sponsoredForm.sponsorshipNote.trim() || undefined,
      planKey: resolvedSponsoredPlanKey,
    });
  };

  return (
    <div className="space-y-5">
      <PageTitle title="User Management" breadcrumb="Dashboard  >  User Management" />

      <Card className="overflow-hidden border-[#80b8df42]">
        <CardContent className="space-y-4 p-0">
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <Button
              type="button"
              className="h-9 bg-[#2e9bff] text-xs font-semibold text-white hover:bg-[#3aa4ff]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1.5 size-4" />
              Add Sponsored User
            </Button>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>Sort by</span>
              <Select
                value={status}
                className="h-8 w-24 rounded-full border-[#8ec5eb7a] bg-[#0e2444]/80 px-2 text-xs"
                onChange={(event) => {
                  setPage(1);
                  setStatus(event.target.value);
                }}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
          </div>

          {query.isLoading ? (
            <div className="px-4 pb-4">
              <TableSkeleton rows={8} />
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 pb-6">
              <EmptyState title="No users found" description="Try a different status filter." />
            </div>
          ) : (
            <>
              <Table className="min-w-[1060px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 text-xs">User Name</TableHead>
                    <TableHead className="h-11 text-xs">Email</TableHead>
                    <TableHead className="h-11 text-xs">Phone</TableHead>
                    <TableHead className="h-11 text-xs">Date</TableHead>
                    <TableHead className="h-11 text-xs">Subscription</TableHead>
                    <TableHead className="h-11 text-xs">Access</TableHead>
                    <TableHead className="h-11 text-xs">Mobility</TableHead>
                    <TableHead className="h-11 text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const subscriptionMeta = getSubscriptionMeta(user.subscription || "");
                    const statusMeta = getStatusMeta(user.status || "");
                    const sponsoredMeta = getSponsoredMeta(user.isSponsored);

                    return (
                      <TableRow key={user.id} className="border-white/30 hover:bg-white/[0.03]">
                        <TableCell className="py-3 text-sm">{user.name}</TableCell>
                        <TableCell className="py-3 text-sm">{user.email}</TableCell>
                        <TableCell className="py-3 text-sm text-slate-200">{user.phone || "-"}</TableCell>
                        <TableCell className="py-3 text-sm text-slate-200">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              "inline-flex min-w-28 items-center justify-center rounded-full px-3 py-[3px] text-[11px] font-semibold",
                              subscriptionMeta.className
                            )}
                          >
                            {subscriptionMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              "inline-flex min-w-[92px] items-center justify-center rounded-full px-3 py-[3px] text-[11px] font-semibold",
                              sponsoredMeta.className
                            )}
                            title={user.sponsorshipNote || undefined}
                          >
                            {sponsoredMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-200">{user.mobilityType || "-"}</TableCell>
                        <TableCell className="py-3 flex items-center justify-center space-x-2">
                          <span
                            className={cn(
                              "inline-flex min-w-[90px] items-center justify-center rounded-full border px-3 py-[3px] text-[11px] font-semibold",
                              statusMeta.className
                            )}
                          >
                            {statusMeta.label}
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-full bg-[#ff3d6f]/30 text-[#ff2f5f] transition-colors hover:bg-[#ff2f5f]/15"
                            onClick={() => {
                              setStatusUser(user);
                              setStatusOpen(true);
                            }}
                            aria-label="Block user"
                          >
                            <Ban className="size-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="space-y-1 px-4 pb-4">
                <p className="text-xs text-slate-300/80">
                  Showing {users.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + users.length} of {query.data?.meta?.total || 0} results
                </p>

                {totalPages > 1 ? (
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#8ec5eb5e] bg-[#0e2444]/75 text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" />
                    </button>

                    {visiblePages.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={cn(
                          "inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-xs font-semibold",
                          item === page
                            ? "border-white bg-white text-[#0e2444]"
                            : "border-[#8ec5eb5e] bg-[#0e2444]/75 text-slate-100 hover:bg-[#16345c]"
                        )}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#8ec5eb5e] bg-[#5d97c4] text-white disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setSponsoredForm(defaultSponsoredForm);
        }}
        title="Create Sponsored User"
      >
        <form className="space-y-4" onSubmit={handleCreateSponsoredUser}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={sponsoredForm.firstName}
                onChange={(event) =>
                  setSponsoredForm((prev) => ({ ...prev, firstName: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={sponsoredForm.lastName}
                onChange={(event) =>
                  setSponsoredForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={sponsoredForm.email}
                onChange={(event) =>
                  setSponsoredForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={sponsoredForm.phone}
                onChange={(event) =>
                  setSponsoredForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input
                type="password"
                value={sponsoredForm.temporaryPassword}
                onChange={(event) =>
                  setSponsoredForm((prev) => ({ ...prev, temporaryPassword: event.target.value }))
                }
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Active Plan</Label>
              <Select
                value={resolvedSponsoredPlanKey}
                onChange={(event) =>
                  setSponsoredForm((prev) => ({ ...prev, planKey: event.target.value }))
                }
                disabled={plansQuery.isLoading || activePlans.length === 0}
                required
              >
                {activePlans.length > 0 ? (
                  activePlans.map((plan) => (
                    <option key={plan.key} value={plan.key}>
                      {plan.name}
                    </option>
                  ))
                ) : (
                  <option value="">No active plans</option>
                )}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Sponsorship Note</Label>
              <Textarea
                value={sponsoredForm.sponsorshipNote}
                onChange={(event) =>
                  setSponsoredForm((prev) => ({ ...prev, sponsorshipNote: event.target.value }))
                }
                placeholder="Optional internal note for this sponsorship"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setSponsoredForm(defaultSponsoredForm);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createSponsoredMutation.isPending ||
                plansQuery.isLoading ||
                activePlans.length === 0
              }
            >
              {createSponsoredMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={statusOpen}
        onClose={() => {
          setStatusOpen(false);
          setStatusUser(null);
        }}
        onConfirm={() => {
          if (statusUser) {
            changeStatusMutation.mutate({
              userId: statusUser.id,
              accountStatus: nextStatus,
            });
          }
        }}
        title="Are you sure?"
        description={statusDescription}
        confirmText={statusActionText}
        loading={statusOpen && changeStatusMutation.isPending}
      />
    </div>
  );
}
