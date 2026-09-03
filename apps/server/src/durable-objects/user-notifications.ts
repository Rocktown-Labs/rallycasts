import { DurableObject } from "cloudflare:workers";

import { verifyRealtimeAccessToken } from "../lib/realtime-auth";

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
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const resourceId = this.ctx.id.name;
    const claims = await verifyRealtimeAccessToken(
      request.headers.get("x-rallycasts-realtime-token") ?? undefined,
      this.env.BETTER_AUTH_SECRET,
      resourceId ?? "",
      resourceId ?? undefined
    );
    if (!claims) {
      return new Response("Unauthorized", { status: 401 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.serializeAttachment({ userId: claims.userId });
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(event: NotificationRealtimeEvent): void {
    for (const socket of this.ctx.getWebSockets()) {
      safeSend(socket, event);
    }
  }
}
