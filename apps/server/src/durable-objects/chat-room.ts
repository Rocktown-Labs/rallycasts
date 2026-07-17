import { DurableObject } from "cloudflare:workers";

interface SocketAttachment {
  name: string;
  userId: string;
}

export interface ChatRealtimeEvent {
  activeUsers?: SocketAttachment[];
  conversationId: string;
  message?: {
    body: string;
    createdAt?: string;
    id: string;
    senderUserId: string;
  };
  sender?: {
    id: string;
    image?: null | string;
    name: string;
    username?: null | string;
  };
  type: "message" | "presence";
}

const safeSend = (socket: WebSocket, payload: unknown) => {
  try {
    socket.send(JSON.stringify(payload));
  } catch {
    // Dead sockets are cleaned up by the runtime close/error handlers.
  }
};

export class ChatRoom extends DurableObject {
  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const userId = request.headers.get("x-rallycasts-user-id");
    const name = request.headers.get("x-rallycasts-user-name") ?? "Player";
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.serializeAttachment({ name, userId } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server);
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcastMessage(event: ChatRealtimeEvent): void {
    this.broadcast(event);
  }

  webSocketClose(): void {
    this.broadcastPresence();
  }

  webSocketError(): void {
    this.broadcastPresence();
  }

  private broadcast(event: ChatRealtimeEvent) {
    for (const socket of this.ctx.getWebSockets()) {
      safeSend(socket, event);
    }
  }

  private broadcastPresence() {
    const activeUsers = this.ctx
      .getWebSockets()
      .map(
        (socket) =>
          socket.deserializeAttachment() as SocketAttachment | undefined
      )
      .filter((attachment): attachment is SocketAttachment =>
        Boolean(attachment?.userId)
      );
    this.broadcast({
      activeUsers,
      conversationId: this.ctx.id.name ?? "",
      type: "presence",
    });
  }
}
