import type { createDb } from "@rallycaststv/db";
import { user as userTable } from "@rallycaststv/db/schema/auth";
import { event, eventMatch } from "@rallycaststv/db/schema/domain";
import {
  renderMatchCallEmail,
  renderTournamentWonEmail,
} from "@rallycaststv/email/render";
import { and, desc, eq, or } from "drizzle-orm";
import { Resend } from "resend";

import { EMAIL_FROM } from "./email";
import { createNotification } from "./notifications";

export interface SendTournamentNotificationOptions {
  db: ReturnType<typeof createDb>;
  env: {
    DB: D1Database;
    EXPO_ACCESS_TOKEN?: string;
    RESEND_API_KEY?: string;
    USER_NOTIFICATIONS?: DurableObjectNamespace;
  };
  eventId: string;
  matchId?: string;
  targetUserId?: string;
  type: "match_ready" | "tournament_won";
}

const getRoundName = (round: number): string => {
  if (round === 3) {
    return "Championship Final";
  }
  if (round === 2) {
    return "Semifinals";
  }
  if (round === 1) {
    return "Quarterfinals";
  }
  return `Round ${round}`;
};

const sendTournamentWonEmail = async (
  apiKey: string,
  email: string,
  username: string,
  eventName: string,
  eventId: string
) => {
  try {
    const resend = new Resend(apiKey);
    const html = await renderTournamentWonEmail({
      eventName,
      eventUrl: `https://rallycasts.com/events/${eventId}/bracket`,
      username,
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      html,
      subject: `🏆 Tournament Champion! Congratulations on winning ${eventName}`,
      text: `Congratulations ${username}! You claimed 1st place in ${eventName} after an incredible tournament run! View the championship bracket: https://rallycasts.com/events/${eventId}/bracket`,
      to: [email],
    });
  } catch (error) {
    console.error("Failed to send tournament won email:", error);
  }
};

const handleTournamentWonNotification = async (
  options: SendTournamentNotificationOptions,
  eventRecord: typeof event.$inferSelect
) => {
  const { db, env } = options;
  const winnerUserId = options.targetUserId;
  if (!winnerUserId) {
    return { error: "Winner user ID required", sent: false };
  }

  const [winnerUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, winnerUserId))
    .limit(1);

  if (!winnerUser) {
    return { error: "Winner user not found", sent: false };
  }

  await createNotification(
    db,
    {
      body: `🏆 Congratulations! You won 1st place in ${eventRecord.name}! Outstanding tournament performance!`,
      entityId: eventRecord.id,
      entityType: "event",
      href: `/events/${eventRecord.id}/bracket`,
      title: "🏆 Tournament Champion!",
      type: "event",
      userId: winnerUser.id,
    },
    env
  );

  const winnerName =
    winnerUser.name ||
    winnerUser.displayUsername ||
    winnerUser.username ||
    "Champion";

  if (
    env.RESEND_API_KEY &&
    winnerUser.email &&
    !winnerUser.email.endsWith(".demo")
  ) {
    await sendTournamentWonEmail(
      env.RESEND_API_KEY,
      winnerUser.email,
      winnerName,
      eventRecord.name,
      eventRecord.id
    );
  }

  return { sent: true, userId: winnerUser.id };
};

const findMatchRecord = async (
  db: ReturnType<typeof createDb>,
  eventId: string,
  matchId?: string,
  targetUserId?: string
) => {
  if (matchId) {
    const [found] = await db
      .select()
      .from(eventMatch)
      .where(and(eq(eventMatch.id, matchId), eq(eventMatch.eventId, eventId)))
      .limit(1);
    return found;
  }

  if (targetUserId) {
    const [found] = await db
      .select()
      .from(eventMatch)
      .where(
        and(
          eq(eventMatch.eventId, eventId),
          or(
            eq(eventMatch.playerOneUserId, targetUserId),
            eq(eventMatch.playerTwoUserId, targetUserId)
          )
        )
      )
      .orderBy(desc(eventMatch.round))
      .limit(1);
    return found;
  }
};

const sendMatchCallEmail = async (
  apiKey: string,
  email: string,
  playerName: string,
  opponentName: string,
  courtLabel: string,
  roundName: string,
  eventName: string,
  eventId: string
) => {
  try {
    const resend = new Resend(apiKey);
    const html = await renderMatchCallEmail({
      courtLabel,
      eventName,
      matchUrl: `https://rallycasts.com/events/${eventId}/matches`,
      opponentName,
      roundName,
      username: playerName,
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      html,
      subject: `🏓 Match Ready: ${courtLabel} vs ${opponentName} (${eventName})`,
      text: `Hi ${playerName}, your next match in ${eventName} is ready!\n\nCourt: ${courtLabel}\nOpponent: ${opponentName}\nStage: ${roundName}\n\nPlease head to the court now.\n\nView match & submit scores: https://rallycasts.com/events/${eventId}/matches`,
      to: [email],
    });
  } catch (error) {
    console.error("Failed to send match call email:", error);
  }
};

const notifyPlayerForMatch = async (
  db: ReturnType<typeof createDb>,
  env: {
    DB: D1Database;
    EXPO_ACCESS_TOKEN?: string;
    RESEND_API_KEY?: string;
    USER_NOTIFICATIONS?: DurableObjectNamespace;
  },
  eventRecord: typeof event.$inferSelect,
  matchRecord: typeof eventMatch.$inferSelect,
  playerId: string
) => {
  const courtLabel = matchRecord.courtLabel ?? "Court 1";
  const roundName = getRoundName(matchRecord.round);
  const opponentId =
    playerId === matchRecord.playerOneUserId
      ? matchRecord.playerTwoUserId
      : matchRecord.playerOneUserId;

  const [playerUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, playerId))
    .limit(1);

  let opponentUser: typeof userTable.$inferSelect | undefined;
  if (opponentId) {
    const [found] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, opponentId))
      .limit(1);
    opponentUser = found;
  }

  const opponentName =
    opponentUser?.name ||
    opponentUser?.displayUsername ||
    opponentUser?.username ||
    "TBD";
  const playerName =
    playerUser?.name ||
    playerUser?.displayUsername ||
    playerUser?.username ||
    "Player";

  await createNotification(
    db,
    {
      body: `Next match at ${courtLabel} vs ${opponentName} in ${eventRecord.name}. Head to your court!`,
      entityId: eventRecord.id,
      entityType: "event",
      href: `/events/${eventRecord.id}/matches`,
      title: `Match Ready - ${courtLabel}`,
      type: "event",
      userId: playerId,
    },
    env
  );

  if (
    env.RESEND_API_KEY &&
    playerUser?.email &&
    !playerUser.email.endsWith(".demo")
  ) {
    await sendMatchCallEmail(
      env.RESEND_API_KEY,
      playerUser.email,
      playerName,
      opponentName,
      courtLabel,
      roundName,
      eventRecord.name,
      eventRecord.id
    );
  }
};

const handleMatchReadyNotification = async (
  options: SendTournamentNotificationOptions,
  eventRecord: typeof event.$inferSelect
) => {
  const { db, env, eventId } = options;
  const matchRecord = await findMatchRecord(
    db,
    eventId,
    options.matchId,
    options.targetUserId
  );

  if (!matchRecord) {
    return { error: "Match not found", sent: false };
  }

  const courtLabel = matchRecord.courtLabel ?? "Court 1";
  const roundName = getRoundName(matchRecord.round);
  const playerIds = [
    matchRecord.playerOneUserId,
    matchRecord.playerTwoUserId,
  ].filter(Boolean) as string[];

  const notificationsSent: string[] = [];

  for (const playerId of playerIds) {
    if (options.targetUserId && playerId !== options.targetUserId) {
      continue;
    }

    // oxlint-disable-next-line eslint/no-await-in-loop -- notification fan-out; small batches
    await notifyPlayerForMatch(db, env, eventRecord, matchRecord, playerId);
    notificationsSent.push(playerId);
  }

  return { courtLabel, notificationsSent, roundName, sent: true };
};

export const sendTournamentNotification = async (
  options: SendTournamentNotificationOptions
) => {
  const { db, eventId, type } = options;

  const [eventRecord] = await db
    .select()
    .from(event)
    .where(eq(event.id, eventId))
    .limit(1);

  if (!eventRecord) {
    return { error: "Event not found", sent: false };
  }

  if (type === "tournament_won") {
    return await handleTournamentWonNotification(options, eventRecord);
  }

  return await handleMatchReadyNotification(options, eventRecord);
};
