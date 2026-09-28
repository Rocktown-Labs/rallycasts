import type {
  EventCardData,
  PlayerCardData,
  VenueCardData,
  VideoCardData,
} from "@/components/rally/cards";

export const demoEnabled = import.meta.env.VITE_DEMO_DATA === "true";

export interface TrendingData {
  events: EventCardData[];
  players: PlayerCardData[];
  venues: VenueCardData[];
  videos: VideoCardData[];
}

export const demoPosts = [
  {
    author: {
      displayUsername: "cgstewart",
      id: "demo-player-1",
      image: null,
      name: "CG Stewart",
      username: "cgstewart",
    },
    post: {
      content:
        "Crestwood is packed tonight. Courts 3 and 4 have strong 4.0 doubles going.",
      createdAt: new Date().toISOString(),
      id: "demo-post-1",
      updatedAt: new Date().toISOString(),
      userId: "demo-player-1",
    },
  },
  {
    author: {
      displayUsername: "sarahpickle",
      id: "demo-player-2",
      image: null,
      name: "Sarah Johnson",
      username: "sarahpickle",
    },
    post: {
      content:
        "Looking for one more player for mixed doubles after the clinic tomorrow.",
      createdAt: new Date().toISOString(),
      id: "demo-post-2",
      updatedAt: new Date().toISOString(),
      userId: "demo-player-2",
    },
  },
];

export const demoPlayers: PlayerCardData[] = [
  {
    bio: "All-court doubles player looking for competitive morning games.",
    displayUsername: "cgstewart",
    homeCity: "Little Rock",
    homeState: "AR",
    id: "demo-player-1",
    name: "CG Stewart",
    skillLevel: "4.0 doubles",
    username: "cgstewart",
  },
  {
    bio: "Plays fast hands, patient resets, and weekend round robins.",
    displayUsername: "sarahpickle",
    homeCity: "Denver",
    homeState: "CO",
    id: "demo-player-2",
    name: "Sarah Johnson",
    skillLevel: "4.5 tournament",
    username: "sarahpickle",
  },
  {
    bio: "New to town and usually looking for evening open play.",
    displayUsername: "mikeball",
    homeCity: "Phoenix",
    homeState: "AZ",
    id: "demo-player-3",
    name: "Mike Rodriguez",
    skillLevel: "3.5 open play",
    username: "mikeball",
  },
];

const initialDemoVideos: VideoCardData[] = [
  {
    createdAt: "2026-09-20T01:42:52.534Z",
    description: null,
    durationSeconds: 588,
    id: "64383cc5-683a-4412-9abe-682af2a78908",
    mediaType: "video",
    muxPlaybackId: "01zW01kknVxRrJ5Pb7OaX3b2tuUlHSCVlmfxBBIG02NF5U",
    owner: {
      displayUsername: "cgstewart",
      id: "qZ5UJA7KK3QWQKGSOIW4jLqddWaldMak",
      image:
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgICA8ZGVmcz4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJncmFkLfCfj4YiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM4YjVjZjYiIC8+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZDk0NmVmIiAvPgogICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0idXJsKCNncmFkLfCfj4YpIiAvPgogICAgPHRleHQgeD0iNTAiIHk9IjU4IiBmb250LXNpemU9IjQ4IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBzYW5zLXNlcmlmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+8J+PhjwvdGV4dD4KICA8L3N2Zz4=",
      name: "Cameron Stewart",
      username: "cgstewart",
    },
    publishedAt: "2026-09-20T01:44:18.889Z",
    status: "ready",
    taggedUsers: [
      {
        displayUsername: "cgstewart",
        id: "qZ5UJA7KK3QWQKGSOIW4jLqddWaldMak",
        image:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgICA8ZGVmcz4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJncmFkLfCfj4YiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM4YjVjZjYiIC8+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZDk0NmVmIiAvPgogICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0idXJsKCNncmFkLfCfj4YpIiAvPgogICAgPHRleHQgeD0iNTAiIHk9IjU4IiBmb250LXNpemU9IjQ4IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBzYW5zLXNlcmlmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+8J+PhjwvdGV4dD4KICA8L3N2Zz4=",
        name: "Cameron Stewart",
        username: "cgstewart",
      },
    ],
    thumbnailUrl: null,
    title: "LRAC Tournament",
    viewsCount: 1420,
  },
  {
    durationSeconds: 378,
    id: "demo-video-1",
    owner: demoPlayers[0],
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[1], demoPlayers[2]],
    thumbnailUrl: null,
    title: "Open play kitchen battles at Crestwood Courts",
    viewsCount: 1205,
  },
  {
    durationSeconds: 522,
    id: "demo-video-2",
    owner: demoPlayers[1],
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[0]],
    thumbnailUrl: null,
    title: "Mixed doubles gold medal point from Saturday ladder",
    viewsCount: 842,
  },
  {
    durationSeconds: 241,
    id: "demo-video-3",
    owner: demoPlayers[2],
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[0], demoPlayers[1]],
    thumbnailUrl: null,
    title: "Three resets that changed the match at Midtown Pickleplex",
    viewsCount: 341,
  },
  {
    durationSeconds: 691,
    id: "demo-video-4",
    owner: demoPlayers[0],
    publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [],
    thumbnailUrl: null,
    title: "Advanced 4.0 singles rally compilation",
    viewsCount: 2450,
  },
  {
    durationSeconds: 320,
    id: "demo-video-5",
    owner: demoPlayers[0],
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[1]],
    thumbnailUrl: null,
    title: "Mixed doubles finals at Little Rock Pickleball Club",
    viewsCount: 512,
  },
  {
    durationSeconds: 120,
    id: "demo-video-6",
    owner: demoPlayers[2],
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[0], demoPlayers[1]],
    thumbnailUrl: null,
    title: "Kitchen dink rally of the tournament",
    viewsCount: 720,
  },
  {
    durationSeconds: 430,
    id: "demo-video-7",
    owner: demoPlayers[1],
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [],
    thumbnailUrl: null,
    title: "How to handle speedups from the baseline",
    viewsCount: 915,
  },
  {
    durationSeconds: 580,
    id: "demo-video-8",
    owner: demoPlayers[2],
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[0]],
    thumbnailUrl: null,
    title: "3.5 rating level ladder match highlights",
    viewsCount: 284,
  },
  {
    durationSeconds: 180,
    id: "demo-video-9",
    owner: demoPlayers[0],
    publishedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[2]],
    thumbnailUrl: null,
    title: "Crazy ATP shot around the post!",
    viewsCount: 1530,
  },
  {
    durationSeconds: 840,
    id: "demo-video-10",
    owner: demoPlayers[1],
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[2]],
    thumbnailUrl: null,
    title: "Patience and positioning clinic with coach Sarah",
    viewsCount: 642,
  },
  {
    durationSeconds: 612,
    id: "demo-video-11",
    owner: demoPlayers[0],
    publishedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[1], demoPlayers[2]],
    thumbnailUrl: null,
    title: "Windy day doubles strategies",
    viewsCount: 423,
  },
  {
    durationSeconds: 310,
    id: "demo-video-12",
    owner: demoPlayers[2],
    publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [],
    thumbnailUrl: null,
    title: "Best lob shots of the week",
    viewsCount: 198,
  },
  {
    durationSeconds: 475,
    id: "demo-video-13",
    owner: demoPlayers[1],
    publishedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[0]],
    thumbnailUrl: null,
    title: "Fayetteville open play Saturday night lights",
    viewsCount: 812,
  },
  {
    durationSeconds: 290,
    id: "demo-video-14",
    owner: demoPlayers[0],
    publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [],
    thumbnailUrl: null,
    title: "Singles drill: mastering the deep return",
    viewsCount: 1105,
  },
  {
    durationSeconds: 504,
    id: "demo-video-15",
    owner: demoPlayers[2],
    publishedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[1]],
    thumbnailUrl: null,
    title: "Rec center morning matches highlights",
    viewsCount: 304,
  },
  {
    durationSeconds: 715,
    id: "demo-video-16",
    owner: demoPlayers[1],
    publishedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    status: "ready",
    taggedUsers: [demoPlayers[0], demoPlayers[2]],
    thumbnailUrl: null,
    title: "Championship point of the summer league",
    viewsCount: 1840,
  },
];

const generatedDemoTitles = [
  "Fast hands firefight under the lights",
  "Third-shot drops from a 4.0 round robin",
  "Saturday open play rally reel",
  "Two-handed backhand practice session",
  "Championship court warmup highlights",
  "Deep returns and clean fifth-shot resets",
  "Morning ladder match at the park",
  "Poaching patterns for mixed doubles",
] as const;

const generatedDemoVideos: VideoCardData[] = Array.from(
  { length: 32 },
  (_, index) => {
    const number = index + initialDemoVideos.length + 1;
    const owner = demoPlayers[index % demoPlayers.length];
    const taggedPlayer = demoPlayers[(index + 1) % demoPlayers.length];

    return {
      description:
        "A RallyCasts demo clip used to exercise progressive loading and video detail layouts.",
      durationSeconds: 150 + ((index * 47) % 690),
      id: `demo-video-${number}`,
      owner,
      publishedAt: new Date(
        Date.UTC(2026, 5, 20) - (number + 2) * 24 * 60 * 60 * 1000
      ).toISOString(),
      status: "ready",
      taggedUsers: index % 3 === 0 && taggedPlayer ? [taggedPlayer] : [],
      thumbnailUrl: null,
      title: `${generatedDemoTitles[index % generatedDemoTitles.length]} #${number}`,
      viewsCount: 180 + ((index * 137) % 4200),
    } satisfies VideoCardData;
  }
);

// Vertical highlight clips (Mux-style shorts) that populate the Highlights
// shelf. Only ever rendered when demo mode is enabled.
const demoShortVideos: VideoCardData[] = Array.from(
  { length: 12 },
  (_, index) => {
    const owner = demoPlayers[index % demoPlayers.length];

    return {
      description:
        "A RallyCasts vertical highlight clip cut from a full match recording.",
      durationSeconds: 9 + ((index * 7) % 39),
      id: `demo-short-${index + 1}`,
      mediaType: "short",
      owner,
      publishedAt: new Date(
        Date.UTC(2026, 8, 24) - index * 12 * 60 * 60 * 1000
      ).toISOString(),
      status: "ready",
      taggedUsers: [],
      thumbnailUrl: null,
      title: `${
        [
          "Kitchen battle rally",
          "Speed-up putaway at the net",
          "Third-shot drop clinic clip",
          "Match point dink duel",
          "Erne attempt highlight",
          "ATP overhead putaway",
          "Lob chase-down save",
          "Stacking poach winner",
          "Drop-serve rally reel",
          "Skinny singles fire fight",
          "Golden paddle point",
          "Trophy-winning tweener",
        ][index]
      } #${index + 1}`,
      viewsCount: 320 + ((index * 211) % 5400),
    } satisfies VideoCardData;
  }
);

export const demoVideos: VideoCardData[] = [
  ...initialDemoVideos,
  ...demoShortVideos,
  ...generatedDemoVideos,
];

export const getDemoVideoPage = (cursor?: string, limit = 12) => {
  const offset = cursor?.startsWith("demo:")
    ? Number.parseInt(cursor.slice("demo:".length), 10)
    : 0;
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
  const videos = demoVideos.slice(safeOffset, safeOffset + limit);
  const nextOffset = safeOffset + videos.length;

  return {
    nextCursor: nextOffset < demoVideos.length ? `demo:${nextOffset}` : null,
    videos,
  };
};

export const getDemoVideoDetail = (id: string) => {
  const video = demoVideos.find((item) => item.id === id);
  if (!video) {
    return null;
  }

  return {
    isDemo: true as const,
    owner: video.owner ?? null,
    relatedVideos: demoVideos.filter((item) => item.id !== id).slice(0, 8),
    taggedUsers: video.taggedUsers ?? [],
    venue:
      demoVenues[
        Number.parseInt(id.split("-").at(-1) ?? "1", 10) % demoVenues.length
      ] ??
      demoVenues[0] ??
      null,
    video: {
      ...video,
      createdAt:
        video.createdAt ?? video.publishedAt ?? new Date().toISOString(),
      description:
        video.description ??
        "A RallyCasts demo highlight showing how match footage, players, and parks come together.",
      mediaType: "video" as const,
      ownerUserId: video.owner?.id ?? "demo-player-1",
      venueId: null,
      visibility: "public" as const,
    },
  };
};

export const demoVenues: VenueCardData[] = [
  {
    activePlayers: 24,
    city: "Austin",
    courtCount: 12,
    distanceMiles: 1.4,
    heatScore: 92,
    id: "demo-venue-1",
    name: "Crestwood Pickleball Park",
    state: "TX",
    venueType: "public park",
  },
  {
    activePlayers: 18,
    city: "Austin",
    courtCount: 8,
    distanceMiles: 2.1,
    heatScore: 78,
    id: "demo-venue-2",
    name: "Mueller Sports Courts",
    state: "TX",
    venueType: "community courts",
  },
  {
    activePlayers: 11,
    city: "Austin",
    courtCount: 6,
    distanceMiles: 3.6,
    heatScore: 64,
    id: "demo-venue-3",
    name: "South Lamar Recreation Center",
    state: "TX",
    venueType: "rec center",
  },
  {
    activePlayers: 7,
    city: "Austin",
    courtCount: 4,
    distanceMiles: 5.2,
    heatScore: 45,
    id: "demo-venue-4",
    name: "Walnut Creek Courts",
    state: "TX",
    venueType: "public park",
  },
];

export const demoEvents: EventCardData[] = [
  {
    capacity: 96,
    endsAt: "2026-06-24T18:00:00.000Z",
    eventType: "tournament",
    id: "demo-event-1",
    name: "Summer Pickleball Open",
    startsAt: "2026-06-23T08:00:00.000Z",
    status: "published",
  },
  {
    capacity: 128,
    endsAt: "2026-07-02T18:00:00.000Z",
    eventType: "tournament",
    id: "demo-event-2",
    name: "Regional Championship Qualifier",
    startsAt: "2026-06-30T08:00:00.000Z",
    status: "published",
  },
  {
    capacity: 32,
    endsAt: "2026-06-19T16:00:00.000Z",
    eventType: "clinic",
    id: "demo-event-3",
    name: "Beginner's Workshop & Mini Tournament",
    startsAt: "2026-06-19T09:00:00.000Z",
    status: "published",
  },
];

export const demoTrending: TrendingData = {
  events: demoEvents,
  players: demoPlayers,
  venues: demoVenues,
  videos: demoVideos,
};

const hasItems = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.length > 0;

export const withDemoTrending = <
  Data extends Partial<TrendingData> | undefined,
>(
  data: Data
) => {
  if (!demoEnabled) {
    return data;
  }

  return {
    ...data,
    events: hasItems(data?.events) ? data?.events : demoEvents,
    players: hasItems(data?.players) ? data?.players : demoPlayers,
    venues: hasItems(data?.venues) ? data?.venues : demoVenues,
    videos: hasItems(data?.videos) ? data?.videos : demoVideos,
  };
};

export const withDemoList = <Data extends Record<string, unknown>>(
  data: Data | undefined,
  key: keyof Data,
  fallback: unknown[]
) => {
  if (!demoEnabled || hasItems(data?.[key])) {
    return data;
  }

  return {
    ...data,
    [key]: fallback,
  } as Data;
};

export const filterDemoSearch = (query: string) => {
  const normalized = query.trim().toLowerCase();

  if (!demoEnabled || normalized.length < 2) {
    return null;
  }

  const matches = (value: string) => value.toLowerCase().includes(normalized);

  return {
    casters: [],
    documents: [],
    events: demoEvents.filter((item) => matches(item.name)),
    players: demoPlayers.filter((item) => matches(item.name)),
    posts: demoPosts.filter((item) => matches(item.post.content)),
    venues: demoVenues.filter((item) => matches(item.name)),
    videos: demoVideos.filter((item) => matches(item.title)),
  };
};
