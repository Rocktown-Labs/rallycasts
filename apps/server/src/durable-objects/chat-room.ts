import { DurableObject } from "cloudflare:workers";

import { verifyRealtimeAccessToken } from "../lib/realtime-auth";

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
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const resourceId = this.ctx.id.name;
    const claims = await verifyRealtimeAccessToken(
      request.headers.get("x-rallycasts-realtime-token") ?? undefined,
      this.env.BETTER_AUTH_SECRET,
      resourceId ?? ""
    );
    if (!claims) {
      return new Response("Unauthorized", { status: 401 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.serializeAttachment({
      name: claims.name,
      userId: claims.userId,
    } satisfies SocketAttachment);
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
