import { Button } from "@rallycaststv/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  MessageSquare,
  Send,
  SquarePen,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useSidebar } from "@/components/layout/sidebar-context";
import { authClient } from "@/lib/auth-client";
import {
  conversationsCollection,
  getConversationMessagesCollection,
  useLiveQuery,
} from "@/lib/collections";
import type { ConversationItem, MessageRecord } from "@/lib/collections";
import {
  useConversationRealtime,
  useFriends,
  useStartConversation,
} from "@/lib/hooks";

const messagesSearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_auth/u/messages")({
  component: MessagesPage,
  validateSearch: messagesSearchSchema,
});

const relativeTime = (value: Date | string | null | undefined) => {
  if (!value) {
    return "just now";
  }

  const date = new Date(value);
  const minutes = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / 60_000)
  );

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
};

function Avatar({
  image,
  label,
  sizeClass = "size-14",
}: {
  image?: null | string;
  label: string;
  sizeClass?: string;
}) {
  return (
    <span
      className={`bg-muted text-muted-foreground grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold ${sizeClass}`}
    >
      {image ? (
        <img alt="" className="size-full object-cover" src={image} />
      ) : (
        label.at(0)?.toUpperCase()
      )}
    </span>
  );
}

function NewMessageDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const [friendQuery, setFriendQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: friendsData } = useFriends();
  const startConversation = useStartConversation();

  const friends = friendsData?.friends ?? [];
  const filteredFriends = friends.filter((friend) =>
    `${friend.name} ${friend.username ?? ""} ${friend.displayUsername ?? ""}`
      .toLowerCase()
      .includes(friendQuery.toLowerCase())
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const toggleFriend = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const startChat = async () => {
    if (selectedIds.length === 0 || startConversation.isPending) {
      return;
    }
    try {
      const result = await startConversation.mutateAsync({
        participantUserIds: selectedIds,
      });
      onCreated(result.conversationId);
      onClose();
    } catch {
      toast.error("Could not start that chat.");
    }
  };

  return (
    <dialog
      aria-label="New message"
      className="fixed inset-0 z-[60] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
      open
    >
      <button
        aria-label="Close new message dialog"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        type="button"
      />
      <div className="border-border bg-card text-foreground relative flex max-h-[500px] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border shadow-xl">
        <div className="border-border flex h-11 items-center justify-between border-b px-4">
          <span className="text-base font-semibold">New message</span>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-border flex items-center gap-3 border-b px-4 py-2">
          <label className="text-sm font-semibold" htmlFor="new-message-to">
            To:
          </label>
          <input
            aria-label="To"
            autoFocus
            className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent text-sm focus:outline-none"
            id="new-message-to"
            onChange={(event) => setFriendQuery(event.target.value)}
            placeholder="Search…"
            value={friendQuery}
          />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          {filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => {
              const selected = selectedIds.includes(friend.id);
              return (
                <button
                  className="hover:bg-muted flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left"
                  key={friend.id}
                  onClick={() => toggleFriend(friend.id)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar
                      image={friend.image}
                      label={friend.name}
                      sizeClass="size-11"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {friend.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        @{friend.username ?? friend.displayUsername ?? "player"}
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-primary bg-primary text-brand-yellow"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {selected ? <Check className="size-3.5" /> : null}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-muted-foreground p-6 text-center text-sm">
              No friends found. Add friends from player profiles first.
            </p>
          )}
        </div>

        <div className="border-border bg-card border-t p-4">
          <Button
            className="bg-primary text-brand-yellow hover:bg-primary/90 w-full cursor-pointer rounded-xl py-2.5 font-semibold"
            disabled={selectedIds.length === 0 || startConversation.isPending}
            onClick={startChat}
          >
            Chat
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function EmptyInbox({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <span className="border-primary/30 bg-muted/40 mb-3 flex size-24 items-center justify-center rounded-full border-2">
        <img alt="RallyCasts" className="size-12" src="/logo.svg?v=3" />
      </span>
      <h2 className="text-foreground mb-1 text-xl font-bold">Your messages</h2>
      <p className="text-muted-foreground mb-5 text-sm">
        Send a message to start a chat.
      </p>
      <Button
        className="bg-primary text-brand-yellow hover:bg-primary/90 cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold"
        onClick={onCompose}
      >
        Send message
      </Button>
    </div>
  );
}

function ThreadPane({
  activeConversation,
  activeId,
  currentUser,
  onBack,
  queryClient,
}: {
  activeConversation?: ConversationItem;
  activeId: string;
  currentUser?: { id: string; image?: string | null; name?: string | null };
  onBack: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeMessagesCollection = useMemo(
    () => getConversationMessagesCollection(queryClient, activeId),
    [queryClient, activeId]
  );
  const { data: rawMessages = [] } = useLiveQuery(activeMessagesCollection);
  const { activeUsers } = useConversationRealtime(activeId);

  const messages = useMemo(
    () =>
      rawMessages.toSorted(
        (a, b) =>
          new Date(a.message.createdAt).getTime() -
          new Date(b.message.createdAt).getTime()
      ),
    [rawMessages]
  );

  const participantNames =
    activeConversation?.participants?.map((participant) => participant.name) ??
    [];
  const title =
    participantNames.length > 1
      ? participantNames.join(", ")
      : (activeConversation?.participant.name ?? "Messages");
  const avatarLabel =
    participantNames.length > 1
      ? participantNames
          .slice(0, 2)
          .map((name) => name.at(0))
          .join("")
      : title;

  const othersOnline = activeUsers.some(
    (user) => user.userId !== currentUser?.id
  );

  // Reset the draft when switching threads and keep the newest message in view.
  useEffect(() => {
    setDraft("");
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Mark-as-read happens server-side when messages load; refresh the inbox
  // shortly after so unread badges settle.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeId, queryClient]);

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();

    if (!(activeId && body && currentUser)) {
      return;
    }

    const tempId = crypto.randomUUID();
    const optimisticMessage: MessageRecord = {
      $synced: false,
      message: {
        body,
        conversationId: activeId,
        createdAt: new Date().toISOString(),
        id: tempId,
        senderUserId: currentUser.id,
      },
      sender: {
        displayUsername:
          (currentUser as { displayUsername?: string | null })
            .displayUsername ?? null,
        id: currentUser.id,
        image: currentUser.image ?? null,
        name: currentUser.name ?? "You",
        username:
          (currentUser as { username?: string | null }).username ?? null,
      },
    };

    setDraft("");
    try {
      activeMessagesCollection.insert(optimisticMessage);
    } catch {
      toast.error("Failed to send message.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <button
          aria-label="Back to conversations"
          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors md:hidden"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft className="size-6" />
        </button>
        <Avatar
          image={activeConversation?.participant.image}
          label={avatarLabel}
          sizeClass="size-9"
        />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          {othersOnline ? (
            <p className="text-muted-foreground text-xs">Active now</p>
          ) : null}
        </div>
      </header>

      <div
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        ref={scrollRef}
      >
        {messages.length > 0 ? (
          messages.map(({ $synced, message, sender }) => {
            const mine = message.senderUserId === currentUser?.id;
            return (
              <div
                className={mine ? "flex justify-end" : "flex justify-start"}
                key={message.id}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {!mine && participantNames.length > 1 ? (
                    <p className="text-muted-foreground mb-0.5 text-xs font-semibold">
                      {sender.name}
                    </p>
                  ) : null}
                  <p className="text-sm leading-relaxed break-words">
                    {message.body}
                  </p>
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      mine
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span>{relativeTime(message.createdAt)}</span>
                    {$synced === false ? <span>• Sending…</span> : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
            No messages yet. Say hello 👋
          </div>
        )}
      </div>

      <form
        className="border-border flex shrink-0 items-center gap-3 border-t p-3 pb-[calc(4rem+max(0.75rem,env(safe-area-inset-bottom)))] md:p-4"
        onSubmit={submitMessage}
      >
        <input
          aria-label="Message"
          className="bg-muted text-foreground placeholder:text-muted-foreground min-w-0 flex-1 rounded-full border-0 px-4 py-2.5 text-sm focus:ring-0 focus:outline-none"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message…"
          value={draft}
        />
        <Button
          aria-label="Send message"
          className="bg-primary text-brand-yellow hover:bg-primary/90 cursor-pointer rounded-full"
          disabled={!draft.trim()}
          size="icon"
          type="submit"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

const conversationMatchesQuery = (
  conversation: ConversationItem,
  query: string
): boolean =>
  `${conversation.participant.name} ${
    conversation.participant.username ?? ""
  } ${conversation.participant.displayUsername ?? ""}`
    .toLowerCase()
    .includes(query.toLowerCase());

function ConversationRow({
  active,
  conversation,
  currentUserId,
  lastMessage,
  onSelect,
  participant,
  participants,
  unreadCount,
}: {
  active: boolean;
  conversation: { id: string; updatedAt: string };
  currentUserId?: string;
  lastMessage: ConversationItem["lastMessage"];
  onSelect: (id: string) => void;
  participant: ConversationItem["participant"];
  participants: ConversationItem["participants"];
  unreadCount: number;
}) {
  const group = participants.length > 1;
  const title = group
    ? participants.map((item) => item.name).join(", ")
    : participant.name;
  const mine = lastMessage ? lastMessage.senderUserId === currentUserId : false;
  const preview = lastMessage
    ? `${mine ? "You: " : ""}${lastMessage.body}`
    : "Say hello 👋";

  return (
    <button
      className={`hover:bg-muted flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors ${
        active ? "bg-muted" : ""
      }`}
      onClick={() => onSelect(conversation.id)}
      type="button"
    >
      <Avatar
        image={participant.image}
        label={
          group
            ? participants
                .slice(0, 2)
                .map((item) => item.name.at(0))
                .join("")
            : participant.name
        }
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm ${
            unreadCount > 0
              ? "text-foreground font-bold"
              : "text-foreground font-semibold"
          }`}
        >
          {title}
        </span>
        <span
          className={`block truncate text-sm ${
            unreadCount > 0
              ? "text-foreground/80 font-medium"
              : "text-muted-foreground"
          }`}
        >
          {preview}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-muted-foreground text-xs">
          {relativeTime(lastMessage?.createdAt ?? conversation.updatedAt)}
        </span>
        {unreadCount > 0 ? (
          <span className="bg-brand-yellow grid size-5 place-items-center rounded-full text-[10px] font-bold text-black">
            {unreadCount}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function InboxPane({
  activeId,
  conversations,
  currentUserId,
  handle,
  isLoading,
  onCompose,
  onSelect,
  query,
  setQuery,
  setTab,
  tab,
}: {
  activeId?: string;
  conversations: ConversationItem[];
  currentUserId?: string;
  handle: string;
  isLoading: boolean;
  onCompose: () => void;
  onSelect: (id: string) => void;
  query: string;
  setQuery: (value: string) => void;
  setTab: (tab: "messages" | "requests") => void;
  tab: "messages" | "requests";
}) {
  const filteredConversations = conversations.filter((conversation) =>
    conversationMatchesQuery(conversation, query)
  );

  const showInbox = tab === "messages";
  const showEmpty =
    showInbox && !isLoading && filteredConversations.length === 0;

  return (
    <div
      className={`${
        activeId ? "hidden" : "flex"
      } border-border w-full flex-col border-r md:flex md:w-[390px] md:min-w-[390px]`}
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            aria-label="Back to dashboard"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            to="/u/me"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <span className="truncate text-base font-semibold">{handle}</span>
        </div>
        <button
          aria-label="New message"
          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          onClick={onCompose}
          type="button"
        >
          <SquarePen className="size-6" />
        </button>
      </div>

      <div className="shrink-0 px-6 pb-3">
        <input
          aria-label="Search conversations"
          className="bg-muted text-foreground placeholder:text-muted-foreground w-full rounded-lg border-0 px-4 py-2 text-sm focus:ring-0 focus:outline-none"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          value={query}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between px-6 py-2 text-sm font-semibold">
        <button
          className={`cursor-pointer ${
            tab === "messages" ? "text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setTab("messages")}
          type="button"
        >
          Messages
        </button>
        <button
          className={`cursor-pointer ${
            tab === "requests" ? "text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setTab("requests")}
          type="button"
        >
          Requests
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {tab === "requests" ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <div>
              <p className="font-semibold">No message requests</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Requests from people you don&apos;t follow will land here.
              </p>
            </div>
          </div>
        ) : null}
        {showInbox && isLoading ? (
          <div className="space-y-1 px-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                className="flex animate-pulse items-center gap-3 px-4 py-3"
                key={index}
              >
                <span className="bg-muted size-14 rounded-full" />
                <span className="flex-1 space-y-2">
                  <span className="bg-muted block h-3 w-1/3 rounded" />
                  <span className="bg-muted block h-3 w-2/3 rounded" />
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {showInbox && !isLoading && filteredConversations.length > 0
          ? filteredConversations.map(
              ({
                conversation,
                participant,
                participants,
                unreadCount,
                lastMessage,
              }) => (
                <ConversationRow
                  active={conversation.id === activeId}
                  conversation={conversation}
                  currentUserId={currentUserId}
                  key={conversation.id}
                  lastMessage={lastMessage}
                  onSelect={onSelect}
                  participant={participant}
                  participants={participants}
                  unreadCount={unreadCount}
                />
              )
            )
          : null}
        {showEmpty ? (
          <div className="grid place-items-center gap-3 px-6 py-16 text-center">
            <span className="border-border grid size-12 place-items-center rounded-full border-2">
              <MessageSquare className="size-5" />
            </span>
            <div>
              <p className="font-semibold">No conversations yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Start a chat with a friend to talk through events, open play, or
                shared videos.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MessagesPage() {
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [tab, setTab] = useState<"messages" | "requests">("messages");
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;
  const handle = currentUser
    ? (currentUser.username ??
      (currentUser as { displayUsername?: string }).displayUsername ??
      currentUser.name ??
      "Messages")
    : "Messages";

  // Collapse the app sidebar while the messenger is open so the inbox pane
  // gets the full width, and restore the user's preference on leave.
  const { collapsed: sidebarCollapsed, setCollapsed } = useSidebar();
  // Capture the pre-messages sidebar state at mount (the initial value of a
  // ref is only read on first render) so exiting the page restores it.
  const initialCollapsedRef = useRef(sidebarCollapsed);
  useEffect(() => {
    const initialCollapsed = initialCollapsedRef.current;
    setCollapsed(true);
    return () => setCollapsed(initialCollapsed);
  }, [setCollapsed]);

  const { data: conversations = [], isLoading } = useLiveQuery(
    conversationsCollection
  );
  const firstConversation = conversations.find((conversation) =>
    conversationMatchesQuery(conversation, query)
  );
  const activeId = search.id ?? firstConversation?.conversation.id;
  const activeConversation = conversations.find(
    (item) => item.conversation.id === activeId
  );

  const selectConversation = (id: string) => {
    void navigate({ search: (previous) => ({ ...previous, id }) });
  };

  const clearSelection = () => {
    void navigate({ search: (previous) => ({ ...previous, id: undefined }) });
  };

  return (
    <div className="-mx-4 -mt-6 -mb-24 flex h-[calc(100dvh-var(--header-height))] w-full overflow-hidden md:-mx-8 md:-mb-10">
      <h1 className="sr-only">Messages</h1>
      <InboxPane
        activeId={activeId}
        conversations={conversations}
        currentUserId={currentUser?.id}
        handle={handle}
        isLoading={isLoading}
        onCompose={() => setShowComposer(true)}
        onSelect={selectConversation}
        query={query}
        setQuery={setQuery}
        setTab={setTab}
        tab={tab}
      />

      <div
        className={`${
          activeId ? "flex" : "hidden"
        } min-w-0 flex-1 flex-col md:flex`}
      >
        {activeId ? (
          <ThreadPane
            activeConversation={activeConversation}
            activeId={activeId}
            currentUser={currentUser ?? undefined}
            onBack={clearSelection}
            queryClient={queryClient}
          />
        ) : (
          <EmptyInbox onCompose={() => setShowComposer(true)} />
        )}
      </div>

      {showComposer ? (
        <NewMessageDialog
          onClose={() => setShowComposer(false)}
          onCreated={selectConversation}
        />
      ) : null}
    </div>
  );
}
