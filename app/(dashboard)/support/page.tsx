"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getErrorMessage,
  getSupportTickets,
  updateSupportTicket,
  type SupportTicket,
} from "@/lib/api";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const getUnreadCount = (status: SupportTicket["status"]) => {
  if (status === "open") return 32;
  if (status === "in_progress") return 12;
  return 0;
};

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketUpdate, setTicketUpdate] = useState<{
    status: SupportTicket["status"];
    adminResponse: string;
  }>({ status: "open", adminResponse: "" });

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets", "messages-feed"],
    queryFn: () =>
      getSupportTickets({
        page: 1,
        limit: 20,
      }),
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: string;
      payload: { status: SupportTicket["status"]; adminResponse: string };
    }) => updateSupportTicket(ticketId, payload),
    onSuccess: () => {
      toast.success("Support ticket updated.");
      setSelectedTicket(null);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const tickets = useMemo(() => ticketsQuery.data?.data || [], [ticketsQuery.data?.data]);

  return (
    <div className="space-y-5">
      <PageTitle title="Support Messages" breadcrumb="Dashboard  >  Support" />

      {ticketsQuery.isLoading ? (
        <TableSkeleton rows={10} />
      ) : tickets.length === 0 ? (
        <EmptyState title="No support messages" description="Messages from users will appear here." />
      ) : (
        <div className="space-y-1 rounded-xl border border-[#7cb6df33] bg-[linear-gradient(120deg,rgba(18,40,72,.72)_0%,rgba(29,56,96,.56)_55%,rgba(24,46,79,.68)_100%)] p-2">
          {tickets.map((ticket) => {
            const userName = [ticket.user?.firstName, ticket.user?.lastName].filter(Boolean).join(" ") || "Unknown User";
            const initials = userName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join("");
            const unreadCount = getUnreadCount(ticket.status);

            return (
              <button
                key={ticket.id}
                type="button"
                className="flex w-full items-start justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
                onClick={() => {
                  setSelectedTicket(ticket);
                  setTicketUpdate({
                    status: ticket.status,
                    adminResponse: ticket.adminResponse || "",
                  });
                }}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xs font-semibold text-white">
                    {initials || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{userName}</p>
                    <p className="max-w-[620px] truncate text-sm text-slate-200">{ticket.description || ticket.subject || "-"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-slate-300">{formatRelativeTime(ticket.createdAt)}</span>
                  {unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#ff1d58] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(selectedTicket)} onClose={() => setSelectedTicket(null)} title="Ticket Details" className="max-w-3xl">
        {selectedTicket ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateTicketMutation.mutate({
                ticketId: selectedTicket.id,
                payload: {
                  status: ticketUpdate.status,
                  adminResponse: ticketUpdate.adminResponse,
                },
              });
            }}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
                <p className="text-xs text-slate-300">User</p>
                <p>{[selectedTicket.user?.firstName, selectedTicket.user?.lastName].filter(Boolean).join(" ") || "-"}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3">
                <p className="text-xs text-slate-300">Email</p>
                <p>{selectedTicket.email}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3 md:col-span-2">
                <p className="text-xs text-slate-300">Subject</p>
                <p>{selectedTicket.subject}</p>
              </div>
              <div className="rounded-lg border border-blue-300/30 bg-white/5 p-3 md:col-span-2">
                <p className="text-xs text-slate-300">Description</p>
                <p>{selectedTicket.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={ticketUpdate.status}
                  onChange={(event) =>
                    setTicketUpdate((prev) => ({
                      ...prev,
                      status: event.target.value as SupportTicket["status"],
                    }))
                  }
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Created At</Label>
                <Input value={formatDate(selectedTicket.createdAt)} readOnly />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Admin Response</Label>
                <Textarea
                  value={ticketUpdate.adminResponse}
                  onChange={(event) => setTicketUpdate((prev) => ({ ...prev, adminResponse: event.target.value }))}
                  placeholder="Write response"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => setSelectedTicket(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTicketMutation.isPending}>
                {updateTicketMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
