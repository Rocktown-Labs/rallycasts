import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Plus, Search, Send, X } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import {
  useConversationMessages,
  useConversations,
  useFriends,
  useSendMessage,
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
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
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
    if (!selectedFriend) {
      toast.error("Select a friend to message.");
      return;
    }
    if (!body) {
      toast.error("Write a message first.");
      return;
    }

    try {
      const result = await startConversation.mutateAsync({
        participantUserId: selectedFriend.id,
      });
      await readApiJson(
        apiClient.api.social.conversations[":id"].messages.$post({
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
        {selectedFriend ? (
          <div className="flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {selectedFriend.name}
            <button
              aria-label={`Remove ${selectedFriend.name}`}
              onClick={() => setSelectedFriend(null)}
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
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
                filteredFriends.map((friend) => (
                  <button
                    className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted"
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    type="button"
                  >
                    <Avatar image={friend.image} label={friend.name} />
                    <span>
                      <span className="block font-semibold">{friend.name}</span>
                      <span className="text-muted-foreground">
                        @{friend.username ?? friend.displayUsername ?? "player"}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-4 text-center text-muted-foreground text-xs">
                  No friends found. Add friends from player profiles first.
                </p>
              )}
            </div>
          </div>
        )}
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

function MessagesPage() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [showComposer, setShowComposer] = useState(false);
  const { data } = useConversations();
  const conversations = data?.conversations ?? [];
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
  const { data: messagesData } = useConversationMessages(activeId);
  const sendMessage = useSendMessage(activeId);
  const messages = messagesData?.messages ?? [];
  const title = activeConversation?.participant.name ?? "Messages";
  const initials = useMemo(() => title.at(0)?.toUpperCase() ?? "M", [title]);

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();

    if (!(activeId && body)) {
      return;
    }

    sendMessage.mutate(
      { body },
      {
        onSuccess: () => setDraft(""),
      }
    );
  };

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
              filteredConversations.map(({ conversation, participant }) => (
                <button
                  className={`grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border px-4 py-4 text-left ${
                    conversation.id === activeId ? "bg-muted" : ""
                  }`}
                  key={conversation.id}
                  onClick={() => setSelectedId(conversation.id)}
                  type="button"
                >
                  <Avatar image={participant.image} label={participant.name} />
                  <span>
                    <span className="block font-medium text-sm">
                      {participant.name}
                    </span>
                    <span className="line-clamp-1 text-muted-foreground text-xs">
                      @{participant.username ?? participant.displayUsername}
                    </span>
                  </span>
                </button>
              ))
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
        <section className="flex min-h-0 flex-col">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <span className="grid size-10 place-items-center rounded-full bg-muted">
              {initials}
            </span>
            <h2 className="font-semibold text-sm">{title}</h2>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length > 0 ? (
              messages.map(({ message, sender }) => {
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
                      <p className="mt-1 text-[10px] opacity-70">
                        {relativeTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid h-full place-items-center text-center text-muted-foreground text-sm">
                {activeId
                  ? "No messages yet. Start the rally."
                  : "Choose or create a conversation to start messaging."}
              </div>
            )}
          </div>
          <form
            className="flex gap-2 border-t border-border p-4"
            onSubmit={submitMessage}
          >
            <Input
              className="text-xs"
              disabled={!activeId}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your message..."
              value={draft}
            />
            <Button
              className="rounded-md text-xs"
              disabled={!activeId || sendMessage.isPending}
              type="submit"
            >
              Send
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
