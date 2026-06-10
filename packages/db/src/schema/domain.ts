import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

const nullableTimestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" });

export const userProfile = sqliteTable(
  "user_profile",
  {
    accountTier: text("account_tier", { enum: ["free", "premium"] })
      .default("free")
      .notNull(),
    age: integer("age"),
    bio: text("bio"),
    createdAt: timestamp("created_at"),
    homeCity: text("home_city"),
    homeCountry: text("home_country").default("US"),
    homeCourtName: text("home_court_name"),
    homeLatitude: real("home_latitude"),
    homeLongitude: real("home_longitude"),
    homeState: text("home_state"),
    isCaster: integer("is_caster", { mode: "boolean" })
      .default(false)
      .notNull(),
    isOrganizer: integer("is_organizer", { mode: "boolean" })
      .default(false)
      .notNull(),
    isPlayer: integer("is_player", { mode: "boolean" }).default(true).notNull(),
    onboardingStatus: text("onboarding_status", {
      enum: ["pending", "complete"],
    })
      .default("pending")
      .notNull(),
    radarAddressId: text("radar_address_id"),
    radarPlaceId: text("radar_place_id"),
    skillLevel: text("skill_level", {
      enum: ["beginner", "intermediate", "advanced", "pro"],
    }),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("user_profile_account_tier_idx").on(table.accountTier),
    index("user_profile_home_location_idx").on(
      table.homeLatitude,
      table.homeLongitude
    ),
  ]
);

export const venue = sqliteTable(
  "venue",
  {
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    country: text("country").default("US"),
    courtCount: integer("court_count"),
    createdAt: timestamp("created_at"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    googlePlaceId: text("google_place_id"),
    id: text("id").primaryKey(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    name: text("name").notNull(),
    postalCode: text("postal_code"),
    radarPlaceId: text("radar_place_id"),
    state: text("state"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    venueType: text("venue_type", {
      enum: ["park", "club", "facility", "other"],
    })
      .default("park")
      .notNull(),
  },
  (table) => [
    index("venue_location_idx").on(table.latitude, table.longitude),
    index("venue_city_state_idx").on(table.city, table.state),
    uniqueIndex("venue_radar_place_id_idx").on(table.radarPlaceId),
  ]
);

export const video = sqliteTable(
  "video",
  {
    createdAt: timestamp("created_at"),
    description: text("description"),
    durationSeconds: integer("duration_seconds"),
    id: text("id").primaryKey(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    mediaType: text("media_type", { enum: ["video", "short", "photo"] })
      .default("video")
      .notNull(),
    muxAssetId: text("mux_asset_id"),
    muxPlaybackId: text("mux_playback_id"),
    muxStatus: text("mux_status"),
    muxUploadId: text("mux_upload_id"),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    publishedAt: nullableTimestamp("published_at"),
    r2Key: text("r2_key"),
    status: text("status", {
      enum: ["draft", "uploading", "processing", "ready", "failed", "deleted"],
    })
      .default("draft")
      .notNull(),
    thumbnailUrl: text("thumbnail_url"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    venueId: text("venue_id").references(() => venue.id, {
      onDelete: "set null",
    }),
    visibility: text("visibility", { enum: ["public", "friends", "private"] })
      .default("public")
      .notNull(),
  },
  (table) => [
    index("video_owner_status_idx").on(table.ownerUserId, table.status),
    index("video_venue_idx").on(table.venueId),
    uniqueIndex("video_mux_asset_id_idx").on(table.muxAssetId),
  ]
);

export const event = sqliteTable(
  "event",
  {
    capacity: integer("capacity"),
    createdAt: timestamp("created_at"),
    description: text("description"),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    eventType: text("event_type", {
      enum: ["open_play", "tournament", "clinic", "league"],
    })
      .default("open_play")
      .notNull(),
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizerUserId: text("organizer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", {
      enum: ["draft", "published", "cancelled", "completed"],
    })
      .default("draft")
      .notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    venueId: text("venue_id").references(() => venue.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("event_starts_at_idx").on(table.startsAt),
    index("event_venue_idx").on(table.venueId),
    index("event_organizer_idx").on(table.organizerUserId),
  ]
);

export const challenge = sqliteTable(
  "challenge",
  {
    challengedUserId: text("challenged_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    challengerUserId: text("challenger_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
    id: text("id").primaryKey(),
    message: text("message"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    status: text("status", {
      enum: [
        "draft",
        "issued",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
    })
      .default("issued")
      .notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    venueId: text("venue_id").references(() => venue.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("challenge_challenger_idx").on(table.challengerUserId),
    index("challenge_challenged_idx").on(table.challengedUserId),
    index("challenge_status_idx").on(table.status),
  ]
);

export const casterProfile = sqliteTable(
  "caster_profile",
  {
    baseLatitude: real("base_latitude"),
    baseLongitude: real("base_longitude"),
    bio: text("bio"),
    createdAt: timestamp("created_at"),
    displayName: text("display_name"),
    hourlyRateCents: integer("hourly_rate_cents").default(0).notNull(),
    serviceRadiusMiles: integer("service_radius_miles").default(25).notNull(),
    status: text("status", {
      enum: ["pending", "active", "paused", "suspended"],
    })
      .default("pending")
      .notNull(),
    stripeConnectAccountId: text("stripe_connect_account_id"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("caster_profile_status_idx").on(table.status),
    index("caster_profile_location_idx").on(
      table.baseLatitude,
      table.baseLongitude
    ),
  ]
);

export const casterAvailability = sqliteTable(
  "caster_availability",
  {
    casterUserId: text("caster_user_id")
      .notNull()
      .references(() => casterProfile.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    id: text("id").primaryKey(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: ["available", "unavailable", "booked"] })
      .default("available")
      .notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    index("caster_availability_caster_idx").on(table.casterUserId),
    index("caster_availability_window_idx").on(table.startsAt, table.endsAt),
  ]
);

export const castingJob = sqliteTable(
  "casting_job",
  {
    casterUserId: text("caster_user_id").references(
      () => casterProfile.userId,
      {
        onDelete: "set null",
      }
    ),
    challengeId: text("challenge_id").references(() => challenge.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at"),
    currency: text("currency").default("usd").notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    id: text("id").primaryKey(),
    notes: text("notes"),
    priceCents: integer("price_cents").default(0).notNull(),
    requestedHours: real("requested_hours").notNull(),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", {
      enum: [
        "draft",
        "requested",
        "offered",
        "accepted",
        "declined",
        "cancelled",
        "arrived",
        "recording",
        "uploading",
        "completed",
        "failed",
      ],
    })
      .default("requested")
      .notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    venueId: text("venue_id").references(() => venue.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("casting_job_requester_idx").on(table.requesterUserId),
    index("casting_job_caster_idx").on(table.casterUserId),
    index("casting_job_status_idx").on(table.status),
    index("casting_job_window_idx").on(table.startsAt, table.endsAt),
  ]
);

export const castingJobOffer = sqliteTable(
  "casting_job_offer",
  {
    casterUserId: text("caster_user_id")
      .notNull()
      .references(() => casterProfile.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
    distanceMiles: real("distance_miles"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => castingJob.id, { onDelete: "cascade" }),
    respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
    status: text("status", {
      enum: ["pending", "accepted", "declined", "expired"],
    })
      .default("pending")
      .notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("casting_job_offer_job_caster_idx").on(
      table.jobId,
      table.casterUserId
    ),
    index("casting_job_offer_status_idx").on(table.status),
  ]
);

export const conversation = sqliteTable("conversation", {
  castingJobId: text("casting_job_id").references(() => castingJob.id, {
    onDelete: "set null",
  }),
  challengeId: text("challenge_id").references(() => challenge.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at"),
  id: text("id").primaryKey(),
  type: text("type", { enum: ["direct", "casting_job", "challenge"] })
    .default("direct")
    .notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const conversationParticipant = sqliteTable(
  "conversation_participant",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
    lastReadAt: integer("last_read_at", { mode: "timestamp_ms" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("conversation_participant_pk").on(
      table.conversationId,
      table.userId
    ),
    index("conversation_participant_user_idx").on(table.userId),
  ]
);

export const message = sqliteTable(
  "message",
  {
    body: text("body").notNull(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    editedAt: integer("edited_at", { mode: "timestamp_ms" }),
    id: text("id").primaryKey(),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("message_conversation_created_idx").on(
      table.conversationId,
      table.createdAt
    ),
    index("message_sender_idx").on(table.senderUserId),
  ]
);

export const webhookEvent = sqliteTable(
  "webhook_event",
  {
    createdAt: timestamp("created_at"),
    eventType: text("event_type").notNull(),
    id: text("id").primaryKey(),
    payloadJson: text("payload_json").notNull(),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
    provider: text("provider", { enum: ["mux", "stripe"] }).notNull(),
    providerEventId: text("provider_event_id").notNull(),
    status: text("status", { enum: ["received", "processed", "failed"] })
      .default("received")
      .notNull(),
  },
  (table) => [
    uniqueIndex("webhook_event_provider_event_idx").on(
      table.provider,
      table.providerEventId
    ),
    index("webhook_event_provider_status_idx").on(table.provider, table.status),
  ]
);

export const videoComment = sqliteTable(
  "video_comment",
  {
    content: text("content").notNull(),
    createdAt: timestamp("created_at"),
    id: text("id").primaryKey(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("video_comment_video_idx").on(table.videoId),
    index("video_comment_user_idx").on(table.userId),
  ]
);

export const videoCommentRelations = relations(videoComment, ({ one }) => ({
  user: one(user, {
    fields: [videoComment.userId],
    references: [user.id],
  }),
  video: one(video, {
    fields: [videoComment.videoId],
    references: [video.id],
  }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

export const venueRelations = relations(venue, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [venue.createdByUserId],
    references: [user.id],
  }),
  events: many(event),
  videos: many(video),
}));

export const videoRelations = relations(video, ({ one, many }) => ({
  comments: many(videoComment),
  owner: one(user, {
    fields: [video.ownerUserId],
    references: [user.id],
  }),
  venue: one(venue, {
    fields: [video.venueId],
    references: [venue.id],
  }),
}));

export const casterProfileRelations = relations(
  casterProfile,
  ({ one, many }) => ({
    availability: many(casterAvailability),
    jobs: many(castingJob),
    user: one(user, {
      fields: [casterProfile.userId],
      references: [user.id],
    }),
  })
);
