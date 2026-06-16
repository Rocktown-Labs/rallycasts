export type EventActivityMessage =
  | {
      eventId: string;
      type: "event.registration.updated";
      userId: string;
    }
  | {
      eventId: string;
      matchId: string;
      type: "event.match.assigned";
    }
  | {
      deliverAt?: string;
      eventId: string;
      type: "event.reminder" | "event.started";
    }
  | {
      eventId: string;
      matchId: string;
      type: "event.score.confirmed" | "event.score.disputed";
    };

const MAX_DELAY_SECONDS = 43_200;

export const getDelaySeconds = (deliverAt?: string) => {
  if (!deliverAt) {
    return;
  }

  const delaySeconds = Math.floor(
    (new Date(deliverAt).getTime() - Date.now()) / 1000
  );

  if (delaySeconds <= 0) {
    return;
  }

  return Math.min(delaySeconds, MAX_DELAY_SECONDS);
};

export const enqueueEventActivity = (
  queue: Queue<EventActivityMessage> | undefined,
  message: EventActivityMessage
) => {
  if (!queue) {
    return Promise.resolve();
  }

  let deliverAt: string | undefined;
  if ("deliverAt" in message) {
    ({ deliverAt } = message);
  }
  const delaySeconds = getDelaySeconds(deliverAt);

  return queue.send(message, delaySeconds ? { delaySeconds } : undefined);
};
