import { DurableObject } from "cloudflare:workers";

interface NotificationRealtimeEvent {
  notification?: {
    body?: null | string;
    href: string;
    id: string;
    title: string;
    type: string;
  };
  type: "notification";
  unreadCount?: number;
}

const safeSend = (socket: WebSocket, payload: unknown) => {
  try {
    socket.send(JSON.stringify(payload));
  } catch {
    // The runtime handles socket lifecycle; this just prevents one stale socket
    // from blocking other notification subscribers.
  }
};

export class UserNotifications extends DurableObject {
  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const userId = request.headers.get("x-rallycasts-user-id");
    if (!(userId && userId === this.ctx.id.name)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.serializeAttachment({ userId });
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(event: NotificationRealtimeEvent): void {
    for (const socket of this.ctx.getWebSockets()) {
      safeSend(socket, event);
    }
  }
}
