"use client";

import { Ban, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { StatusChip } from "@/components/shared/status-chip";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteAdminUser,
  getAdminUsers,
  getErrorMessage,
  updateAdminUserStatus,
  type AdminUser,
} from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const query = useQuery({
    queryKey: ["admin-users", page, search, status],
    queryFn: () => getAdminUsers({ page, limit: 10, search, status: status || undefined }),
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ userId, accountStatus }: { userId: string; accountStatus: "active" | "deactivated" | "suspended" }) =>
      updateAdminUserStatus(userId, accountStatus),
    onSuccess: () => {
      toast.success("User status updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      toast.success("User removed.");
      setDeleteOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const users = useMemo(() => query.data?.data || [], [query.data?.data]);

  return (
    <div className="space-y-5">
      <PageTitle title="User Management" breadcrumb="Dashboard  >  User Management" />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
              <Input
                className="pl-10"
                placeholder="Search users..."
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
              />
            </div>
            <Select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="md:w-48"
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>

          {query.isLoading ? (
            <TableSkeleton rows={8} />
          ) : users.length === 0 ? (
            <EmptyState title="No users found" description="Try a different search or filter." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Mobility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>{user.subscription}</TableCell>
                      <TableCell>{user.mobilityType || "-"}</TableCell>
                      <TableCell>
                        <StatusChip value={user.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={user.status}
                            className="h-9 min-w-36"
                            onChange={(event) =>
                              changeStatusMutation.mutate({
                                userId: user.id,
                                accountStatus: event.target.value as "active" | "deactivated" | "suspended",
                              })
                            }
                          >
                            <option value="active">Active</option>
                            <option value="deactivated">Deactivated</option>
                            <option value="suspended">Suspended</option>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              changeStatusMutation.mutate({
                                userId: user.id,
                                accountStatus: user.status === "suspended" ? "active" : "suspended",
                              })
                            }
                          >
                            <Ban className="size-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
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

              <p className="text-sm text-slate-300">
                Showing {users.length > 0 ? (page - 1) * 10 + 1 : 0} to {(page - 1) * 10 + users.length} of {query.data?.meta?.total || 0}
                results
              </p>

              <Pagination page={page} totalPages={query.data?.meta?.totalPages || 1} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (selectedUser) {
            deleteMutation.mutate(selectedUser.id);
          }
        }}
        title="Are you sure?"
        description="You want to block this user from the platform."
        confirmText="Block"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
