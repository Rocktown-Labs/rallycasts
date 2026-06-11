import type {
  EventCardData,
  PlayerCardData,
  VenueCardData,
  VideoCardData,
} from "@/components/rally/cards";

const demoEnabled = import.meta.env.VITE_DEMO_DATA !== "false";

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

export const demoVideos: VideoCardData[] = [
  {
    durationSeconds: 378,
    id: "demo-video-1",
    status: "ready",
    thumbnailUrl: null,
    title: "Open play kitchen battles at Crestwood Courts",
  },
  {
    durationSeconds: 522,
    id: "demo-video-2",
    status: "ready",
    thumbnailUrl: null,
    title: "Mixed doubles gold medal point from Saturday ladder",
  },
  {
    durationSeconds: 241,
    id: "demo-video-3",
    status: "ready",
    thumbnailUrl: null,
    title: "Three resets that changed the match at Midtown Pickleplex",
  },
  {
    durationSeconds: 691,
    id: "demo-video-4",
    status: "ready",
    thumbnailUrl: null,
    title: "Advanced 4.0 singles rally compilation",
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
