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
    photoUrl: text("photo_url"),
    postalCode: text("postal_code"),
    radarPlaceId: text("radar_place_id"),
    rating: real("rating"),
    state: text("state"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    userRatingsTotal: integer("user_ratings_total"),
    venueType: text("venue_type", {
      enum: ["park", "club", "facility", "other"],
    })
      .default("park")
      .notNull(),
  },
  (table) => [
    index("venue_location_idx").on(table.latitude, table.longitude),
    index("venue_city_state_idx").on(table.city, table.state),
    uniqueIndex("venue_google_place_id_idx").on(table.googlePlaceId),
    uniqueIndex("venue_radar_place_id_idx").on(table.radarPlaceId),
  ]
);

export const organization = sqliteTable(
  "organization",
  {
    bio: text("bio"),
    city: text("city"),
    createdAt: timestamp("created_at"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    isOfficial: integer("is_official", { mode: "boolean" })
      .default(false)
      .notNull(),
    logoUrl: text("logo_url"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    state: text("state"),
    stripeAccountId: text("stripe_account_id"),
    stripeOnboardingStatus: text("stripe_onboarding_status", {
      enum: ["not_started", "pending", "complete", "restricted"],
    })
      .default("not_started")
      .notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("organization_slug_idx").on(table.slug),
    uniqueIndex("organization_stripe_account_idx").on(table.stripeAccountId),
    index("organization_location_idx").on(table.city, table.state),
  ]
);

export const organizationMember = sqliteTable(
  "organization_member",
  {
    createdAt: timestamp("created_at"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "editor"] })
      .default("editor")
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("organization_member_org_user_idx").on(
      table.organizationId,
      table.userId
    ),
    index("organization_member_user_idx").on(table.userId),
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
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
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
    taggedUserIds: text("tagged_user_ids"),
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
    index("video_organization_idx").on(table.organizationId),
    uniqueIndex("video_mux_asset_id_idx").on(table.muxAssetId),
  ]
);

export const videoLike = sqliteTable(
  "video_like",
  {
    createdAt: timestamp("created_at"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("video_like_user_video_idx").on(table.videoId, table.userId),
    index("video_like_video_idx").on(table.videoId),
    index("video_like_user_idx").on(table.userId),
  ]
);

export const event = sqliteTable(
  "event",
  {
    bracketType: text("bracket_type", {
      enum: ["single_elimination", "round_robin"],
    })
      .default("single_elimination")
      .notNull(),
    capacity: integer("capacity"),
    checkInMinutes: integer("check_in_minutes").default(30).notNull(),
    courtLabelsJson: text("court_labels_json"),
    createdAt: timestamp("created_at"),
    currency: text("currency").default("usd").notNull(),
    description: text("description"),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    entryFeeCents: integer("entry_fee_cents").default(0).notNull(),
    eventType: text("event_type", {
      enum: ["open_play", "tournament", "clinic", "league"],
    })
      .default("open_play")
      .notNull(),
    hostLabel: text("host_label"),
    hostType: text("host_type", {
      enum: ["organizer", "rallycasts"],
    })
      .default("organizer")
      .notNull(),
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    organizerUserId: text("organizer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    refundPolicy: text("refund_policy")
      .default(
        "Full refund before registration closes; automatic refund if cancelled."
      )
      .notNull(),
    registrationDeadline: integer("registration_deadline", {
      mode: "timestamp_ms",
    }),
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
    index("event_organization_idx").on(table.organizationId),
  ]
);

export const eventRegistration = sqliteTable(
  "event_registration",
  {
    checkedInAt: nullableTimestamp("checked_in_at"),
    createdAt: timestamp("created_at"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    paidAmountCents: integer("paid_amount_cents").default(0).notNull(),
    paymentStatus: text("payment_status", {
      enum: ["not_required", "pending", "paid", "failed", "refunded"],
    })
      .default("not_required")
      .notNull(),
    seed: integer("seed"),
    status: text("status", {
      enum: [
        "pending_payment",
        "registered",
        "waitlisted",
        "cancelled",
        "checked_in",
      ],
    })
      .default("registered")
      .notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("event_registration_event_user_idx").on(
      table.eventId,
      table.userId
    ),
    index("event_registration_event_status_idx").on(
      table.eventId,
      table.status
    ),
    index("event_registration_user_idx").on(table.userId),
    uniqueIndex("event_registration_checkout_idx").on(
      table.stripeCheckoutSessionId
    ),
  ]
);

export const eventPayment = sqliteTable(
  "event_payment",
  {
    amountCents: integer("amount_cents").notNull(),
    applicationFeeCents: integer("application_fee_cents").default(0).notNull(),
    createdAt: timestamp("created_at"),
    currency: text("currency").default("usd").notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    registrationId: text("registration_id")
      .notNull()
      .references(() => eventRegistration.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending", "succeeded", "failed", "refunded"],
    })
      .default("pending")
      .notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeRefundId: text("stripe_refund_id"),
    stripeTransferId: text("stripe_transfer_id"),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("event_payment_checkout_idx").on(table.stripeCheckoutSessionId),
    index("event_payment_event_idx").on(table.eventId),
    index("event_payment_registration_idx").on(table.registrationId),
  ]
);

export const eventMatch = sqliteTable(
  "event_match",
  {
    courtLabel: text("court_label"),
    createdAt: timestamp("created_at"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    playerOneScore: integer("player_one_score"),
    playerOneUserId: text("player_one_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    playerTwoScore: integer("player_two_score"),
    playerTwoUserId: text("player_two_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    round: integer("round").notNull(),
    scheduledAt: nullableTimestamp("scheduled_at"),
    status: text("status", {
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
    })
      .default("scheduled")
      .notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    winnerUserId: text("winner_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("event_match_event_round_idx").on(table.eventId, table.round),
    index("event_match_player_one_idx").on(table.playerOneUserId),
    index("event_match_player_two_idx").on(table.playerTwoUserId),
    index("event_match_winner_idx").on(table.winnerUserId),
  ]
);

export const eventScoreSubmission = sqliteTable(
  "event_score_submission",
  {
    createdAt: timestamp("created_at"),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => eventMatch.id, { onDelete: "cascade" }),
    note: text("note"),
    playerOneScore: integer("player_one_score").notNull(),
    playerTwoScore: integer("player_two_score").notNull(),
    status: text("status", {
      enum: ["pending", "confirmed", "disputed", "superseded"],
    })
      .default("pending")
      .notNull(),
    submittedByUserId: text("submitted_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    winnerUserId: text("winner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("event_score_submission_match_status_idx").on(
      table.matchId,
      table.status
    ),
    index("event_score_submission_event_idx").on(table.eventId),
    index("event_score_submission_submitted_by_idx").on(
      table.submittedByUserId
    ),
  ]
);

export const challenge = sqliteTable(
  "challenge",
  {
    casterFeeCents: integer("caster_fee_cents").default(0).notNull(),
    casterTipCents: integer("caster_tip_cents").default(0).notNull(),
    casterUserId: text("caster_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    castingSplitMode: text("casting_split_mode"),
    challengedUserId: text("challenged_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    challengerUserId: text("challenger_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courtLabel: text("court_label"),
    createdAt: timestamp("created_at"),
    id: text("id").primaryKey(),
    isCasted: integer("is_casted", { mode: "boolean" }).default(false),
    matchMode: text("match_mode", { enum: ["singles", "doubles"] }),
    message: text("message"),
    partnerUserId: text("partner_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    paymentStatus: text("payment_status", {
      enum: ["not_required", "pending", "paid", "refunded"],
    })
      .default("not_required")
      .notNull(),
    result: text("result", { enum: ["won", "lost", "draw"] }),
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
    venueLabel: text("venue_label"),
    videoUrl: text("video_url"),
  },
  (table) => [
    index("challenge_challenger_idx").on(table.challengerUserId),
    index("challenge_challenged_idx").on(table.challengedUserId),
    index("challenge_status_idx").on(table.status),
    index("challenge_partner_idx").on(table.partnerUserId),
    index("challenge_caster_idx").on(table.casterUserId),
  ]
);

export const post = sqliteTable(
  "post",
  {
    content: text("content").notNull(),
    createdAt: timestamp("created_at"),
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("post_user_idx").on(table.userId),
    index("post_created_idx").on(table.createdAt),
    index("post_organization_idx").on(table.organizationId),
  ]
);

export const postLike = sqliteTable(
  "post_like",
  {
    createdAt: timestamp("created_at"),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("post_like_user_post_idx").on(table.postId, table.userId),
    index("post_like_post_idx").on(table.postId),
  ]
);

export const postComment = sqliteTable(
  "post_comment",
  {
    content: text("content").notNull(),
    createdAt: timestamp("created_at"),
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("post_comment_post_idx").on(table.postId),
    index("post_comment_user_idx").on(table.userId),
  ]
);

export const friendship = sqliteTable(
  "friendship",
  {
    createdAt: timestamp("created_at"),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("friendship_pair_idx").on(table.userId, table.requesterUserId),
    index("friendship_user_idx").on(table.userId),
    index("friendship_requester_idx").on(table.requesterUserId),
  ]
);

export const friendRequest = sqliteTable(
  "friend_request",
  {
    createdAt: timestamp("created_at"),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    message: text("message"),
    respondedAt: nullableTimestamp("responded_at"),
    status: text("status", {
      enum: ["pending", "accepted", "declined", "cancelled"],
    })
      .default("pending")
      .notNull(),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("friend_request_pair_pending_idx").on(
      table.fromUserId,
      table.toUserId,
      table.status
    ),
    index("friend_request_to_status_idx").on(table.toUserId, table.status),
    index("friend_request_from_status_idx").on(table.fromUserId, table.status),
  ]
);

export const notification = sqliteTable(
  "notification",
  {
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    body: text("body"),
    createdAt: timestamp("created_at"),
    entityId: text("entity_id"),
    entityType: text("entity_type", {
      enum: [
        "friend_request",
        "friendship",
        "message",
        "post",
        "video",
        "comment",
        "share",
        "event",
        "casting_job",
        "challenge",
      ],
    }).notNull(),
    href: text("href").notNull(),
    id: text("id").primaryKey(),
    readAt: nullableTimestamp("read_at"),
    title: text("title").notNull(),
    type: text("type", {
      enum: [
        "friend_request",
        "friend_accept",
        "message",
        "comment",
        "like",
        "share",
        "event",
        "casting_job",
        "challenge",
        "system",
      ],
    }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("notification_user_read_created_idx").on(
      table.userId,
      table.readAt,
      table.createdAt
    ),
    index("notification_entity_idx").on(table.entityType, table.entityId),
  ]
);

export const share = sqliteTable(
  "share",
  {
    channel: text("channel", {
      enum: ["copy_link", "direct_message", "external"],
    })
      .default("copy_link")
      .notNull(),
    createdAt: timestamp("created_at"),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type", {
      enum: ["post", "video", "event", "venue", "profile"],
    }).notNull(),
    id: text("id").primaryKey(),
    recipientUserId: text("recipient_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("share_entity_idx").on(table.entityType, table.entityId),
    index("share_user_idx").on(table.userId),
  ]
);

export const searchDocument = sqliteTable(
  "search_document",
  {
    content: text("content").notNull(),
    createdAt: timestamp("created_at"),
    embeddingModel: text("embedding_model"),
    embeddingStatus: text("embedding_status", {
      enum: ["pending", "ready", "failed"],
    })
      .default("pending")
      .notNull(),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type", {
      enum: ["profile", "post", "video", "event", "venue"],
    }).notNull(),
    id: text("id").primaryKey(),
    metadataJson: text("metadata_json"),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("search_document_entity_idx").on(
      table.entityType,
      table.entityId
    ),
    index("search_document_status_idx").on(table.embeddingStatus),
    index("search_document_title_idx").on(table.title),
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

export const venueVisit = sqliteTable(
  "venue_visit",
  {
    createdAt: timestamp("created_at"),
    durationMinutes: integer("duration_minutes"),
    enteredAt: timestamp("entered_at"),
    exitedAt: nullableTimestamp("exited_at"),
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venue.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("venue_visit_venue_idx").on(table.venueId),
    index("venue_visit_user_idx").on(table.userId),
    index("venue_visit_entered_idx").on(table.enteredAt),
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
    isPinned: integer("is_pinned", { mode: "boolean" })
      .default(false)
      .notNull(),
    pinnedAt: integer("pinned_at", { mode: "timestamp_ms" }),
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

export const videoLikeRelations = relations(videoLike, ({ one }) => ({
  author: one(user, {
    fields: [videoLike.userId],
    references: [user.id],
  }),
  video: one(video, {
    fields: [videoLike.videoId],
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
  visits: many(venueVisit),
}));

export const venueVisitRelations = relations(venueVisit, ({ one }) => ({
  user: one(user, {
    fields: [venueVisit.userId],
    references: [user.id],
  }),
  venue: one(venue, {
    fields: [venueVisit.venueId],
    references: [venue.id],
  }),
}));

export const videoRelations = relations(video, ({ one, many }) => ({
  comments: many(videoComment),
  likes: many(videoLike),
  owner: one(user, {
    fields: [video.ownerUserId],
    references: [user.id],
  }),
  venue: one(venue, {
    fields: [video.venueId],
    references: [venue.id],
  }),
}));

export const challengeRelations = relations(challenge, ({ one }) => ({
  challenged: one(user, {
    fields: [challenge.challengedUserId],
    references: [user.id],
  }),
  challenger: one(user, {
    fields: [challenge.challengerUserId],
    references: [user.id],
  }),
  partner: one(user, {
    fields: [challenge.partnerUserId],
    references: [user.id],
  }),
  venue: one(venue, {
    fields: [challenge.venueId],
    references: [venue.id],
  }),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  author: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
  comments: many(postComment),
  likes: many(postLike),
}));

export const postCommentRelations = relations(postComment, ({ one }) => ({
  author: one(user, {
    fields: [postComment.userId],
    references: [user.id],
  }),
  post: one(post, {
    fields: [postComment.postId],
    references: [post.id],
  }),
}));

export const postLikeRelations = relations(postLike, ({ one }) => ({
  author: one(user, {
    fields: [postLike.userId],
    references: [user.id],
  }),
  post: one(post, {
    fields: [postLike.postId],
    references: [post.id],
  }),
}));

export const friendshipRelations = relations(friendship, ({ one }) => ({
  friend: one(user, {
    fields: [friendship.requesterUserId],
    references: [user.id],
  }),
  user: one(user, {
    fields: [friendship.userId],
    references: [user.id],
  }),
}));

export const friendRequestRelations = relations(friendRequest, ({ one }) => ({
  fromUser: one(user, {
    fields: [friendRequest.fromUserId],
    references: [user.id],
  }),
  toUser: one(user, {
    fields: [friendRequest.toUserId],
    references: [user.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  actor: one(user, {
    fields: [notification.actorUserId],
    references: [user.id],
  }),
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}));

export const shareRelations = relations(share, ({ one }) => ({
  recipient: one(user, {
    fields: [share.recipientUserId],
    references: [user.id],
  }),
  user: one(user, {
    fields: [share.userId],
    references: [user.id],
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
