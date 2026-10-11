import { createDb } from "@rallycaststv/db";
import {
  adCampaign,
  adDailyStat,
  advertiser,
  event,
  eventRegistration,
  organizationMember,
} from "@rallycaststv/db/schema/domain";
import { desc, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

/**
 * Organizer analytics: one aggregate call for the dashboard views. Everything
 * is scoped to events the signed-in user can manage (their own or through
 * organization memberships), same as GET /events/mine.
 */
export const organizerAnalyticsRouter = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;

    const memberships = await db
      .select({ organizationId: organizationMember.organizationId })
      .from(organizationMember)
      .where(eq(organizationMember.userId, user.id));
    const organizationIds = memberships.map(
      (membership) => membership.organizationId
    );
    const manageableEventsWhere =
      organizationIds.length > 0
        ? or(
            eq(event.organizerUserId, user.id),
            inArray(event.organizationId, organizationIds)
          )
        : eq(event.organizerUserId, user.id);

    const events = await db
      .select({
        capacity: event.capacity,
        entryFeeCents: event.entryFeeCents,
        eventType: event.eventType,
        id: event.id,
        name: event.name,
        organizationId: event.organizationId,
        startsAt: event.startsAt,
        status: event.status,
      })
      .from(event)
      .where(manageableEventsWhere)
      .orderBy(desc(event.startsAt))
      .limit(100);

    const eventIds = events.map((record) => record.id);
    const registrations = eventIds.length
      ? await db
          .select({
            createdAt: eventRegistration.createdAt,
            eventId: eventRegistration.eventId,
            status: eventRegistration.status,
          })
          .from(eventRegistration)
          .where(inArray(eventRegistration.eventId, eventIds))
      : [];

    // Ad campaigns for the organizer's organizations, with delivery stats
    // aggregated from daily buckets.
    const advertiserAccounts = organizationIds.length
      ? await db
          .select({ id: advertiser.id })
          .from(advertiser)
          .where(inArray(advertiser.organizationId, organizationIds))
      : [];
    const campaignRows = advertiserAccounts.length
      ? await db
          .select({
            createdAt: adCampaign.createdAt,
            id: adCampaign.id,
            name: adCampaign.name,
            status: adCampaign.status,
            totalBudgetCents: adCampaign.totalBudgetCents,
          })
          .from(adCampaign)
          .where(
            inArray(
              adCampaign.advertiserId,
              advertiserAccounts.map((account) => account.id)
            )
          )
          .orderBy(desc(adCampaign.createdAt))
          .limit(50)
      : [];

    const statRows = campaignRows.length
      ? await db
          .select({
            campaignId: adDailyStat.campaignId,
            clicks: adDailyStat.clicks,
            day: adDailyStat.day,
            impressions: adDailyStat.impressions,
            spentCents: adDailyStat.spentCents,
          })
          .from(adDailyStat)
          .where(
            inArray(
              adDailyStat.campaignId,
              campaignRows.map((campaign) => campaign.id)
            )
          )
      : [];

    const campaigns = campaignRows.map((campaign) => {
      const stats = statRows.filter((row) => row.campaignId === campaign.id);
      return {
        ...campaign,
        clicks: stats.reduce((sum, row) => sum + row.clicks, 0),
        impressions: stats.reduce((sum, row) => sum + row.impressions, 0),
        spentCents: stats.reduce((sum, row) => sum + row.spentCents, 0),
      };
    });

    // Registrations per event, the shape the tournaments table wants.
    const registrationsByEvent = new Map<
      string,
      { checkedIn: number; cancelled: number; registered: number }
    >();
    const perDay = new Map<string, { date: string; registrations: number }>();
    for (const registration of registrations) {
      const bucket = registrationsByEvent.get(registration.eventId) ?? {
        cancelled: 0,
        checkedIn: 0,
        registered: 0,
      };
      bucket.registered += 1;
      if (registration.status === "checked_in") {
        bucket.checkedIn += 1;
      }
      if (registration.status === "cancelled") {
        bucket.cancelled += 1;
      }
      registrationsByEvent.set(registration.eventId, bucket);

      const created = registration.createdAt
        ? new Date(registration.createdAt)
        : null;
      if (created) {
        const date = created.toISOString().slice(0, 10);
        const day = perDay.get(date) ?? { date, registrations: 0 };
        day.registrations += 1;
        perDay.set(date, day);
      }
    }

    const now = Date.now();
    const totals = {
      activeEvents: 0,
      adClicks: campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0),
      adImpressions: campaigns.reduce(
        (sum, campaign) => sum + campaign.impressions,
        0
      ),
      cancelledRegistrations: 0,
      checkedInRegistrations: 0,
      pastEvents: 0,
      registrations: registrations.length,
      revenueCents: 0,
    };
    for (const record of events) {
      const startsAtMs = record.startsAt.getTime();
      if (startsAtMs >= now && record.status !== "cancelled") {
        totals.activeEvents += 1;
      } else {
        totals.pastEvents += 1;
      }
      const bucket = registrationsByEvent.get(record.id);
      if (bucket) {
        totals.checkedInRegistrations += bucket.checkedIn;
        totals.cancelledRegistrations += bucket.cancelled;
        totals.revenueCents +=
          (bucket.registered - bucket.cancelled) * record.entryFeeCents;
      }
    }

    return c.json(
      {
        campaigns,
        events: events.map((record) => ({
          ...record,
          registrations: registrationsByEvent.get(record.id) ?? {
            cancelled: 0,
            checkedIn: 0,
            registered: 0,
          },
        })),
        registrationsByDay: [...perDay.values()].toSorted((a, b) =>
          a.date.localeCompare(b.date)
        ),
        totals,
      },
      HttpStatusCodes.OK
    );
  }
);
