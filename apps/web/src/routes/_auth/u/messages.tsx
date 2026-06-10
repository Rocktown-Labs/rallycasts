import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";

const conversations = [
  {
    id: "john",
    name: "John Doe",
    preview: "Hey, are you available for a match this weekend?",
    unread: true,
  },
  {
    id: "jane",
    name: "Jane Smith",
    preview: "Great game yesterday!",
    unread: false,
  },
  {
    id: "mike",
    name: "Mike Johnson",
    preview: "Can you share some tips on improving my serve?",
    unread: false,
  },
];

const messages = [
  {
    body: "Hey, are you available for a match this weekend?",
    mine: false,
    time: "36 minutes ago",
  },
  {
    body: "Hi John! What time were you thinking?",
    mine: true,
    time: "31 minutes ago",
  },
  {
    body: "I was thinking Saturday around 2pm at Central Courts. Does that work for you?",
    mine: false,
    time: "26 minutes ago",
  },
  {
    body: "That works perfectly! I'll see you there.",
    mine: true,
    time: "21 minutes ago",
  },
  {
    body: "Great! Looking forward to it. Should I bring any extra equipment?",
    mine: false,
    time: "16 minutes ago",
  },
];

export const Route = createFileRoute("/_auth/u/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-3xl font-bold">Messages</h1>
      <div className="grid min-h-[36rem] overflow-hidden rounded-lg border border-border lg:grid-cols-[minmax(18rem,30rem)_1fr]">
        <aside className="border-border lg:border-r">
          <div className="border-b border-border p-4">
            <Input placeholder="Search conversations..." className="text-xs" />
          </div>
          <div>
            {conversations.map((conversation, index) => (
              <button
                key={conversation.id}
                className={`grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border px-4 py-4 text-left ${index === 0 ? "bg-muted" : ""}`}
                type="button"
              >
                <span className="grid size-10 place-items-center rounded-full bg-muted-foreground/20">
                  {conversation.name.at(0)}
                </span>
                <span>
                  <span className="block font-medium text-sm">
                    {conversation.name}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {conversation.preview}
                  </span>
                </span>
                {conversation.unread ? (
                  <span className="size-2 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>
        </aside>
        <section className="flex min-h-0 flex-col">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <span className="grid size-10 place-items-center rounded-full bg-muted">
              J
            </span>
            <h2 className="font-semibold text-sm">John Doe</h2>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={`${message.time}-${message.body}`}
                className={
                  message.mine ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${message.mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <p className="text-xs">{message.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">{message.time}</p>
                </div>
              </div>
            ))}
          </div>
          <form className="flex gap-2 border-t border-border p-4">
            <Input placeholder="Type your message..." className="text-xs" />
            <Button className="rounded-md text-xs">Send</Button>
          </form>
        </section>
      </div>
    </div>
  );
}
