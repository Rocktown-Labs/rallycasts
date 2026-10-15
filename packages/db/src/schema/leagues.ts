import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { video } from "./domain";

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

const nullableTimestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" });

export const leagueProgram = sqliteTable(
  "league_program",
  {
    cohortTargetUnits: integer("cohort_target_units").default(8).notNull(),
    createdAt: timestamp("created_at"),
    entryFeeCents: integer("entry_fee_cents").default(0).notNull(),
    flightWeeks: integer("flight_weeks").default(6).notNull(),
    format: text("format", {
      enum: ["singles", "doubles_fixed", "squad_ab", "mlp_draft"],
    }).notNull(),
    id: text("id").primaryKey(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    regionName: text("region_name").notNull(),
    season: text("season", {
      enum: ["spring", "summer", "fall", "winter"],
    }).notNull(),
    updatedAt: timestamp("updated_at"),
    year: integer("year").notNull(),
  },
  (table) => [
    index("league_program_active_idx").on(table.isActive),
    index("league_program_region_idx").on(table.regionName, table.year),
  ]
);

export const leagueProgramQueue = sqliteTable(
  "league_program_queue",
  {
    id: text("id").primaryKey(),
    joinedQueueAt: timestamp("joined_queue_at"),
    partnerUserId: text("partner_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    programId: text("program_id")
      .notNull()
      .references(() => leagueProgram.id, { onDelete: "cascade" }),
    skillRating: integer("skill_rating"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("league_program_queue_program_idx").on(
      table.programId,
      table.joinedQueueAt
    ),
    index("league_program_queue_user_idx").on(table.userId),
  ]
);

export const league = sqliteTable(
  "league",
  {
    casterMode: text("caster_mode", {
      enum: ["none", "optional", "required"],
    })
      .default("optional")
      .notNull(),
    createdAt: timestamp("created_at"),
    currentUnits: integer("current_units").default(0).notNull(),
    currentWeek: integer("current_week").default(0).notNull(),
    entryFeeCents: integer("entry_fee_cents").default(0).notNull(),
    flightNumber: integer("flight_number"),
    format: text("format", {
      enum: ["singles", "doubles_fixed", "squad_ab", "mlp_draft", "ladder"],
    }).notNull(),
    hostUserId: text("host_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    id: text("id").primaryKey(),
    isVideoLeague: integer("is_video_league", { mode: "boolean" })
      .default(true)
      .notNull(),
    locationLabel: text("location_label").notNull(),
    matchWindowDays: integer("match_window_days").default(7).notNull(),
    maxUnits: integer("max_units").notNull(),
    name: text("name").notNull(),
    programId: text("program_id").references(() => leagueProgram.id, {
      onDelete: "set null",
    }),
    registrationMode: text("registration_mode", {
      enum: ["direct", "draft_live", "draft_async", "rolling_pool"],
    })
      .default("direct")
      .notNull(),
    seasonWeeks: integer("season_weeks").notNull(),
    startTrigger: text("start_trigger", {
      enum: ["on_full", "scheduled", "manual"],
    })
      .default("on_full")
      .notNull(),
    startedAt: nullableTimestamp("started_at"),
    status: text("status", {
      enum: [
        "recruiting",
        "drafting",
        "active",
        "playoffs",
        "completed",
        "cancelled",
      ],
    })
      .default("recruiting")
      .notNull(),
    updatedAt: timestamp("updated_at"),
    workflowInstanceId: text("workflow_instance_id"),
  },
  (table) => [
    index("league_host_status_idx").on(table.hostUserId, table.status),
    index("league_program_status_idx").on(table.programId, table.status),
  ]
);

export const leagueTeam = sqliteTable(
  "league_team",
  {
    captainUserId: text("captain_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
    id: text("id").primaryKey(),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    matchesLost: integer("matches_lost").default(0).notNull(),
    matchesWon: integer("matches_won").default(0).notNull(),
    name: text("name").notNull(),
    pointsDiff: integer("points_diff").default(0).notNull(),
    teamPoints: integer("team_points").default(0).notNull(),
  },
  (table) => [index("league_team_league_idx").on(table.leagueId)]
);

export const leagueRosterMember = sqliteTable(
  "league_roster_member",
  {
    displayName: text("display_name").notNull(),
    draftPickNumber: integer("draft_pick_number"),
    id: text("id").primaryKey(),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    paymentStatus: text("payment_status", {
      enum: ["pending", "paid", "free"],
    }).notNull(),
    squadLine: text("squad_line", {
      enum: ["STARTER", "A_TEAM", "B_TEAM", "SUB"],
    })
      .default("STARTER")
      .notNull(),
    teamId: text("team_id").references(() => leagueTeam.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("league_roster_member_league_idx").on(table.leagueId),
    index("league_roster_member_team_idx").on(table.teamId),
    index("league_roster_member_user_idx").on(table.userId),
  ]
);

export const leagueMatchup = sqliteTable(
  "league_matchup",
  {
    awayTeamId: text("away_team_id")
      .notNull()
      .references(() => leagueTeam.id, { onDelete: "cascade" }),
    casterUserId: text("caster_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    dueAt: timestamp("due_at"),
    homeTeamId: text("home_team_id")
      .notNull()
      .references(() => leagueTeam.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    scoreSummary: text("score_summary"),
    status: text("status", {
      enum: [
        "scheduled",
        "awaiting_video",
        "awaiting_caster",
        "completed",
        "forfeit",
      ],
    })
      .default("scheduled")
      .notNull(),
    videoAssetId: text("video_asset_id").references(() => video.id, {
      onDelete: "set null",
    }),
    videoPlaybackUrl: text("video_playback_url"),
    weekNumber: integer("week_number").notNull(),
    winnerTeamId: text("winner_team_id").references(() => leagueTeam.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("league_matchup_league_week_idx").on(
      table.leagueId,
      table.weekNumber
    ),
    index("league_matchup_due_at_idx").on(table.dueAt),
  ]
);

export const leagueMatchupSubgame = sqliteTable(
  "league_matchup_subgame",
  {
    id: text("id").primaryKey(),
    matchupId: text("matchup_id")
      .notNull()
      .references(() => leagueMatchup.id, { onDelete: "cascade" }),
    pointWeight: integer("point_weight").default(1).notNull(),
    scoreText: text("score_text"),
    slotType: text("slot_type", {
      enum: [
        "STANDARD",
        "A_TEAM_DOUBLES",
        "B_TEAM_DOUBLES",
        "MIXED_DOUBLES",
        "DREAMBREAKER",
      ],
    }).notNull(),
    videoAssetId: text("video_asset_id").references(() => video.id, {
      onDelete: "set null",
    }),
    winnerTeamId: text("winner_team_id").references(() => leagueTeam.id, {
      onDelete: "set null",
    }),
  },
  (table) => [index("league_matchup_subgame_matchup_idx").on(table.matchupId)]
);

export const leaguePost = sqliteTable(
  "league_post",
  {
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    bodyCopy: text("body_copy").notNull(),
    createdAt: timestamp("created_at"),
    id: text("id").primaryKey(),
    leagueId: text("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    matchupId: text("matchup_id").references(() => leagueMatchup.id, {
      onDelete: "set null",
    }),
    postType: text("post_type", {
      enum: ["discussion", "announcement", "video_auto_post", "draft_recap"],
    }).notNull(),
    videoPlaybackUrl: text("video_playback_url"),
  },
  (table) => [
    index("league_post_league_created_idx").on(table.leagueId, table.createdAt),
  ]
);
