"use client";

import { ArrowLeft, FileImage, LoaderCircle, Paperclip, SendHorizontal, Video, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { useChatSocket } from "@/hooks/use-chat-socket";
import {
  getChatMessages,
  getChatThreads,
  getErrorMessage,
  markChatThreadRead,
  uploadChatAttachment,
  type ChatMessage,
} from "@/lib/api";
import { cn, formatRelativeTime } from "@/lib/utils";

const toShortTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getAttachmentKind = (attachment: { url: string; mimetype?: string }) => {
  const mimetype = attachment.mimetype?.toLowerCase() || "";
  const url = attachment.url.toLowerCase();
  if (mimetype.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/i.test(url)) return "image";
  if (mimetype.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(url)) return "video";
  return "file";
};

const addUniqueMessage = (messages: ChatMessage[], next: ChatMessage) => {
  if (!next?.id || messages.some((message) => message.id === next.id)) return messages;
  return [...messages, next].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
};

export default function SupportChatPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [draftMessage, setDraftMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const threadId = useMemo(() => {
    const raw = params?.threadId;
    if (Array.isArray(raw)) return raw[0] || "";
    return raw || "";
  }, [params]);

  const { events, clearEvents, isConnected, sendSocketMessage } = useChatSocket(threadId);
  const currentUserId = session?.user?._id || "";
  const fallbackName = searchParams.get("name") || "Support User";
  const fallbackEmail = searchParams.get("email") || "";

  const threadsQuery = useQuery({
    queryKey: ["chat-threads", "support-page", threadId],
    queryFn: () => getChatThreads({ page: 1, limit: 100 }),
    enabled: Boolean(threadId),
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: () => getChatMessages(threadId, { page: 1, limit: 200 }),
    enabled: Boolean(threadId),
  });

  const activeThread = useMemo(
    () => threadsQuery.data?.data?.find((thread) => thread.id === threadId) || null,
    [threadId, threadsQuery.data?.data]
  );

  const markReadMutation = useMutation({
    mutationFn: (nextThreadId: string) => markChatThreadRead(nextThreadId),
  });

  useEffect(() => {
    setLocalMessages(messagesQuery.data?.data || []);
  }, [messagesQuery.data?.data]);

  useEffect(() => {
    if (!threadId || !messagesQuery.data) return;
    markReadMutation.mutate(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, messagesQuery.data]);

  useEffect(() => {
    if (events.length === 0) return;

    for (const event of events) {
      if (event.type !== "chat:message:new") continue;
      const payload = event.payload as { threadId?: string; message?: ChatMessage };
      if (payload?.threadId !== threadId || !payload.message) continue;
      setLocalMessages((current) => addUniqueMessage(current, payload.message as ChatMessage));
      markReadMutation.mutate(threadId);
    }

    clearEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages.length]);

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (files.length === 0) return;
    setSelectedFiles((current) => [...current, ...files].slice(0, 5));
    event.target.value = "";
  };

  const onSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draftMessage.trim();
    if ((!message && selectedFiles.length === 0) || !threadId) return;

    setIsSending(true);
    try {
      const attachments = await Promise.all(
        selectedFiles.map(async (file) => {
          const uploaded = await uploadChatAttachment(file);
          return {
            url: uploaded.url,
            publicId: "",
            mimetype: file.type,
            size: file.size,
          };
        })
      );

      const sent = await sendSocketMessage<ChatMessage>({
        threadId,
        message,
        attachments,
      });

      setLocalMessages((current) => addUniqueMessage(current, sent));
      setDraftMessage("");
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send message."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#7cb6df33] bg-[linear-gradient(120deg,rgba(18,40,72,.72)_0%,rgba(29,56,96,.56)_55%,rgba(24,46,79,.68)_100%)] p-2">
      <div className="flex h-[calc(100vh-12rem)] flex-col">
        <div className="flex items-start gap-3 border-b border-white/15 px-2 py-2">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full text-slate-100 transition-colors hover:bg-white/10"
            onClick={() => router.push("/support")}
            aria-label="Back to support"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">
              {activeThread?.counterpart?.firstName || fallbackName}
            </p>
            <p className="truncate text-xs text-slate-300">
              {activeThread?.counterpart?.email || fallbackEmail || "Premium user"}
              <span className={cn("ml-2", isConnected ? "text-emerald-300" : "text-amber-300")}>
                {isConnected ? "Live" : "Connecting"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {!threadId ? (
            <EmptyState title="Invalid chat thread" description="Thread id is missing." />
          ) : messagesQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-14 w-2/3 animate-pulse rounded-lg bg-white/20" />
              <div className="ml-auto h-14 w-2/3 animate-pulse rounded-lg bg-white/20" />
              <div className="h-14 w-2/3 animate-pulse rounded-lg bg-white/20" />
            </div>
          ) : messagesQuery.isError ? (
            <EmptyState title="Failed to load chat" description={getErrorMessage(messagesQuery.error)} />
          ) : localMessages.length === 0 ? (
            <EmptyState title="No messages yet" description="Start the conversation." />
          ) : (
            <div className="space-y-4">
              {localMessages.map((message) => {
                const isMine = message.sender?.id === currentUserId;
                return (
                  <div key={message.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[86%] rounded-lg px-3 py-2 shadow-sm sm:max-w-[74%]",
                        isMine ? "bg-[#72B4E6] text-white" : "bg-white text-[#1f2937]"
                      )}
                    >
                      {message.message ? (
                        <p className="break-words text-sm leading-5">{message.message}</p>
                      ) : null}

                      {message.attachments?.length ? (
                        <div className={cn("mt-2 grid gap-2", message.attachments.length > 1 && "sm:grid-cols-2")}>
                          {message.attachments.map((attachment, index) => {
                            const kind = getAttachmentKind(attachment);
                            if (kind === "image") {
                              return (
                                <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={attachment.url}
                                    alt="Chat attachment"
                                    className="max-h-64 w-full rounded-md object-cover"
                                  />
                                </a>
                              );
                            }

                            if (kind === "video") {
                              return (
                                <video
                                  key={`${attachment.url}-${index}`}
                                  src={attachment.url}
                                  controls
                                  className="max-h-64 w-full rounded-md bg-black"
                                />
                              );
                            }

                            return (
                              <a
                                key={`${attachment.url}-${index}`}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className={cn("block break-all text-xs underline", isMine ? "text-white" : "text-[#2269a8]")}
                              >
                                Attachment {index + 1}
                              </a>
                            );
                          })}
                        </div>
                      ) : null}

                      <p className={cn("mt-1 text-[10px]", isMine ? "text-white/75" : "text-[#5f6571]")}>
                        {toShortTime(message.createdAt) || formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form className="border-t border-white/15 px-2 py-2" onSubmit={onSendMessage}>
          {selectedFiles.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="inline-flex max-w-[220px] items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-xs text-white"
                >
                  {file.type.startsWith("video/") ? <Video className="size-3.5" /> : <FileImage className="size-3.5" />}
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-white/15"
                    onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                    aria-label="Remove attachment"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-md border border-[#cad7e566] bg-[#dfe3e8] px-2 py-1.5">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={onPickFiles} />
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-full bg-[#55657a] text-white transition-colors hover:bg-[#65758a]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || selectedFiles.length >= 5}
              aria-label="Attach image or video"
            >
              <Paperclip className="size-4" />
            </button>

            <input
              className="h-9 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#7b8796]"
              placeholder="Type a message"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
            />

            <button
              type="submit"
              className="inline-flex size-8 items-center justify-center rounded-full bg-[#72B4E6] text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSending || (!draftMessage.trim() && selectedFiles.length === 0)}
              aria-label="Send message"
            >
              {isSending ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
