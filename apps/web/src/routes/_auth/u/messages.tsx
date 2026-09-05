import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Plus, Search, Send, X } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
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
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/_auth/u/messages")({
  component: MessagesPage,
});

interface Friend {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

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
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

function Avatar({ image, label }: { image?: null | string; label: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
      {image ? (
        <img alt="" className="size-full object-cover" src={image} />
      ) : (
        label.at(0)?.toUpperCase()
      )}
    </span>
  );
}

function NewMessageComposer({
  onCreated,
  onClose,
}: {
  onCreated: (conversationId: string) => void;
  onClose: () => void;
}) {
  const [friendQuery, setFriendQuery] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const { data: friendsData } = useFriends();
  const startConversation = useStartConversation();
  const friends = friendsData?.friends ?? [];
  const filteredFriends = friends.filter((friend) =>
    `${friend.name} ${friend.username ?? ""} ${friend.displayUsername ?? ""}`
      .toLowerCase()
      .includes(friendQuery.toLowerCase())
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (selectedFriends.length === 0) {
      toast.error("Select at least one friend to message.");
      return;
    }
    if (!body) {
      toast.error("Write a message first.");
      return;
    }

    try {
      const result = await startConversation.mutateAsync({
        participantUserIds: selectedFriends.map((friend) => friend.id),
      });
      await readApiJson(
        apiClient.api.v1.social.conversations[":id"].messages.$post({
          json: { body },
          param: { id: result.conversationId },
        })
      );
      onCreated(result.conversationId);
      toast.success("Message sent.");
      onClose();
    } catch {
      toast.error("Could not start that chat.");
    }
  };

  return (
    <section className="rounded-lg border border-primary/30 bg-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Start a chat</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a friend, add a note, and send a direct message. Shared videos
            can ride in this same conversation.
          </p>
        </div>
        <Button
          aria-label="Close composer"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>
      <form className="space-y-3" onSubmit={submit}>
        <div className="space-y-2">
          {selectedFriends.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedFriends.map((friend) => (
                <div
                  className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  key={friend.id}
                >
                  {friend.name}
                  <button
                    aria-label={`Remove ${friend.name}`}
                    onClick={() =>
                      setSelectedFriends((current) =>
                        current.filter((item) => item.id !== friend.id)
                      )
                    }
                    type="button"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9 text-xs"
              onChange={(event) => setFriendQuery(event.target.value)}
              placeholder="Search friends..."
              value={friendQuery}
            />
          </div>
          <div className="max-h-44 overflow-y-auto rounded-md border border-border">
            {filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => {
                const selected = selectedFriends.some(
                  (item) => item.id === friend.id
                );

                return (
                  <button
                    className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted disabled:opacity-50"
                    disabled={selected}
                    key={friend.id}
                    onClick={() =>
                      setSelectedFriends((current) => [...current, friend])
                    }
                    type="button"
                  >
                    <Avatar image={friend.image} label={friend.name} />
                    <span>
                      <span className="block font-semibold">{friend.name}</span>
                      <span className="text-muted-foreground">
                        {selected
                          ? "Selected"
                          : `@${friend.username ?? friend.displayUsername ?? "player"}`}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="p-4 text-center text-muted-foreground text-xs">
                No friends found. Add friends from player profiles first.
              </p>
            )}
          </div>
        </div>
        <textarea
          aria-label="Opening message"
          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a message..."
          value={message}
        />
        <Button disabled={startConversation.isPending} type="submit">
          <Send className="size-4" /> Send Message
        </Button>
      </form>
    </section>
  );
}

function ActiveChatPane({
  activeConversation,
  activeId,
  currentUser,
  queryClient,
}: {
  activeConversation?: ConversationItem;
  activeId: string;
  currentUser?: { id: string; image?: string | null; name?: string | null };
  queryClient: QueryClient;
}) {
  const [draft, setDraft] = useState("");
  const activeMessagesCollection = useMemo(
    () => getConversationMessagesCollection(queryClient, activeId),
    [queryClient, activeId]
  );
  const { data: rawMessages = [] } = useLiveQuery(activeMessagesCollection);
  useConversationRealtime(activeId);

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
  const initials = useMemo(() => title.at(0)?.toUpperCase() ?? "M", [title]);

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();

    if (!(activeId && body && activeMessagesCollection && currentUser)) {
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
    <section className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <span className="grid size-10 place-items-center rounded-full bg-muted">
          {initials}
        </span>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length > 0 ? (
          messages.map(({ $synced, message, sender }) => {
            const mine =
              activeConversation?.participant.id !== message.senderUserId;

            return (
              <div
                className={mine ? "flex justify-end" : "flex justify-start"}
                key={message.id}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {mine ? null : (
                    <p className="mb-1 font-medium text-[10px]">
                      {sender.name}
                    </p>
                  )}
                  <p className="text-xs">{message.body}</p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                    <span>{relativeTime(message.createdAt)}</span>
                    {$synced === false ? <span>• Sending...</span> : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid h-full place-items-center text-center text-muted-foreground text-sm">
            No messages yet. Start the rally.
          </div>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-border p-4"
        onSubmit={submitMessage}
      >
        <Input
          className="text-xs"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your message..."
          value={draft}
        />
        <Button className="rounded-md text-xs" type="submit">
          Send
        </Button>
      </form>
    </section>
  );
}

function MessagesPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [showComposer, setShowComposer] = useState(false);
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;

  const { data: conversations = [] } = useLiveQuery(conversationsCollection);
  const filteredConversations = conversations.filter(({ participant }) =>
    `${participant.name} ${participant.username ?? ""} ${
      participant.displayUsername ?? ""
    }`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  const activeId = selectedId ?? filteredConversations[0]?.conversation.id;
  const activeConversation = conversations.find(
    (item) => item.conversation.id === activeId
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Messages</h1>
        <Button className="rounded-md" onClick={() => setShowComposer(true)}>
          <Plus className="size-4" /> New Message
        </Button>
      </div>
      {showComposer ? (
        <NewMessageComposer
          onClose={() => setShowComposer(false)}
          onCreated={setSelectedId}
        />
      ) : null}
      <div className="grid min-h-[36rem] overflow-hidden rounded-lg border border-border lg:grid-cols-[minmax(18rem,30rem)_1fr]">
        <aside className="border-border lg:border-r">
          <div className="border-b border-border p-4">
            <Input
              className="text-xs"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations..."
              value={query}
            />
          </div>
          <div>
            {filteredConversations.length > 0 ? (
              filteredConversations.map(
                ({ conversation, participant, participants, unreadCount }) => (
                  <button
                    className={`grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border px-4 py-4 text-left ${
                      conversation.id === activeId ? "bg-muted" : ""
                    }`}
                    key={conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    type="button"
                  >
                    <Avatar
                      image={participant.image}
                      label={participant.name}
                    />
                    <span>
                      <span className="block font-medium text-sm">
                        {participants.length > 1
                          ? participants.map((item) => item.name).join(", ")
                          : participant.name}
                      </span>
                      <span className="line-clamp-1 text-muted-foreground text-xs">
                        {participants.length > 1
                          ? `${participants.length} people`
                          : `@${participant.username ?? participant.displayUsername}`}
                      </span>
                    </span>
                    {unreadCount > 0 ? (
                      <span className="grid size-5 place-items-center rounded-full bg-brand-yellow text-[10px] font-bold text-black">
                        {unreadCount}
                      </span>
                    ) : null}
                  </button>
                )
              )
            ) : (
              <div className="grid place-items-center gap-3 px-6 py-16 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <MessageSquare className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-sm">No conversations yet</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Start a chat with a friend to talk through events, open
                    play, or shared videos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
        {activeId ? (
          <ActiveChatPane
            activeConversation={activeConversation}
            activeId={activeId}
            currentUser={currentUser ?? undefined}
            queryClient={queryClient}
          />
        ) : (
          <section className="flex min-h-0 flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
            Choose or create a conversation to start messaging.
          </section>
        )}
      </div>
    </div>
  );
}
