import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import {
  useConversationMessages,
  useConversations,
  useSendMessage,
} from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/messages")({
  component: MessagesPage,
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
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

function MessagesPage() {
  const [draft, setDraft] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const { data } = useConversations();
  const conversations = data?.conversations ?? [];
  const activeId = selectedId ?? conversations[0]?.conversation.id;
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
      <h1 className="text-3xl font-bold">Messages</h1>
      <div className="grid min-h-[36rem] overflow-hidden rounded-lg border border-border lg:grid-cols-[minmax(18rem,30rem)_1fr]">
        <aside className="border-border lg:border-r">
          <div className="border-b border-border p-4">
            <Input placeholder="Search conversations..." className="text-xs" />
          </div>
          <div>
            {conversations.length > 0 ? (
              conversations.map(({ conversation, participant }) => (
                <button
                  key={conversation.id}
                  className={`grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border px-4 py-4 text-left ${
                    conversation.id === activeId ? "bg-muted" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <span className="grid size-10 place-items-center rounded-full bg-muted-foreground/20">
                    {participant.name.at(0)}
                  </span>
                  <span>
                    <span className="block font-medium text-sm">
                      {participant.name}
                    </span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">
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
                    Message players from profiles, events, or friend requests.
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
                    key={message.id}
                    className={mine ? "flex justify-end" : "flex justify-start"}
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
                  : "Choose a conversation to start messaging."}
              </div>
            )}
          </div>
          <form
            className="flex gap-2 border-t border-border p-4"
            onSubmit={submitMessage}
          >
            <Input
              placeholder="Type your message..."
              className="text-xs"
              disabled={!activeId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
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
