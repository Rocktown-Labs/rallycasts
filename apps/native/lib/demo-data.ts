export interface VideoData {
  createdAt?: string | null;
  description?: string | null;
  durationSeconds?: number | null;
  id: string;
  mediaType?: "video" | "short" | "photo" | string | null;
  muxPlaybackId?: string | null;
  owner?: {
    displayUsername?: string | null;
    id: string;
    image?: string | null;
    name: string;
    username?: string | null;
  } | null;
  publishedAt?: string | null;
  status?: string;
  thumbnailUrl?: string | null;
  title: string;
  venue?: {
    city?: string | null;
    id: string;
    name: string;
    state?: string | null;
  } | null;
  viewsCount?: number | null;
}

export interface PlayerData {
  bio?: string | null;
  displayUsername?: string | null;
  homeCity?: string | null;
  homeCourtName?: string | null;
  homeState?: string | null;
  id: string;
  image?: string | null;
  matchesPlayed?: number;
  name: string;
  skillLevel?: string | null;
  username?: string | null;
  winRate?: number;
}

export interface VenueData {
  activePlayers?: number | null;
  addressLine1?: string | null;
  city?: string | null;
  courtCount?: number | null;
  distanceMiles?: number | null;
  heatScore?: number | null;
  id: string;
  isFavorited?: boolean;
  isHomeCourt?: boolean;
  name: string;
  openNow?: boolean;
  photoUrl?: string | null;
  rating?: number | null;
  state?: string | null;
  venueType?: string;
}

export interface EventData {
  capacity?: number | null;
  category?: string;
  dateLabel?: string;
  endsAt?: string | null;
  eventType?: string;
  hostLabel?: string | null;
  id: string;
  imageUrl?: string | null;
  location?: string;
  name: string;
  priceCents?: number;
  registeredCount?: number;
  startsAt: string;
  status?: string;
  venueName?: string;
}

export interface CasterData {
  bio?: string | null;
  displayName?: string | null;
  equipment?: string[];
  hourlyRateCents?: number;
  id: string;
  imageUrl?: string | null;
  matchesStreamed?: number;
  rating?: number;
  serviceRadiusMiles?: number;
  status?: string;
  userId: string;
}

export interface PostData {
  author: {
    displayUsername?: string | null;
    id: string;
    image?: string | null;
    name: string;
    username?: string | null;
  };
  content: string;
  createdAt: string;
  id: string;
}

export const demoVideos: VideoData[] = [
  {
    createdAt: "2026-09-20T01:42:52.534Z",
    description: "Championship bracket semifinals from Little Rock Athletic Club.",
    durationSeconds: 588,
    id: "demo-video-1",
    mediaType: "video",
    muxPlaybackId: "01zW01kknVxRrJ5Pb7OaX3b2tuUlHSCVlmfxBBIG02NF5U",
    owner: {
      displayUsername: "cgstewart",
      id: "demo-user-1",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      name: "Cameron Stewart",
      username: "cgstewart",
    },
    publishedAt: "2026-09-20T01:44:18.889Z",
    status: "ready",
    thumbnailUrl: "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=640",
    title: "LRAC Tournament Gold Medal Match",
    venue: { city: "Little Rock", id: "lrac-1", name: "Little Rock Athletic Club", state: "AR" },
    viewsCount: 1420,
  },
  {
    createdAt: "2026-09-22T14:30:00.000Z",
    description: "Intense kitchen line dinking duel in 4.5 mixed doubles.",
    durationSeconds: 378,
    id: "demo-video-2",
    mediaType: "video",
    muxPlaybackId: "01zW01kknVxRrJ5Pb7OaX3b2tuUlHSCVlmfxBBIG02NF5U",
    owner: {
      displayUsername: "sarahpickle",
      id: "demo-user-2",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      name: "Sarah Johnson",
      username: "sarahpickle",
    },
    publishedAt: "2026-09-22T15:00:00.000Z",
    status: "ready",
    thumbnailUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=640",
    title: "Crestwood Open Play: 4.5 Kitchen Duel",
    venue: { city: "Denver", id: "crestwood-1", name: "Crestwood Park Courts", state: "CO" },
    viewsCount: 890,
  },
  {
    createdAt: "2026-09-24T18:15:00.000Z",
    description: "Third shot drop consistency masterclass recorded with RallyCasts 4K setup.",
    durationSeconds: 462,
    id: "demo-video-3",
    mediaType: "video",
    muxPlaybackId: "01zW01kknVxRrJ5Pb7OaX3b2tuUlHSCVlmfxBBIG02NF5U",
    owner: {
      displayUsername: "mikeball",
      id: "demo-user-3",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      name: "Mike Rodriguez",
      username: "mikeball",
    },
    publishedAt: "2026-09-24T18:45:00.000Z",
    status: "ready",
    thumbnailUrl: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=640",
    title: "Burnet Park Sunset Session: Third Shot Clinics",
    venue: { city: "Austin", id: "burnet-1", name: "Burnet Park Courts", state: "TX" },
    viewsCount: 2340,
  },
];

export const demoClips: VideoData[] = [
  {
    createdAt: "2026-09-25T11:00:00.000Z",
    durationSeconds: 24,
    id: "demo-clip-1",
    mediaType: "short",
    owner: {
      displayUsername: "cgstewart",
      id: "demo-user-1",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      name: "Cameron Stewart",
      username: "cgstewart",
    },
    thumbnailUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400",
    title: "Erne clean winner around the post!",
    viewsCount: 4210,
  },
  {
    createdAt: "2026-09-26T09:30:00.000Z",
    durationSeconds: 18,
    id: "demo-clip-2",
    mediaType: "short",
    owner: {
      displayUsername: "sarahpickle",
      id: "demo-user-2",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      name: "Sarah Johnson",
      username: "sarahpickle",
    },
    thumbnailUrl: "https://images.unsplash.com/photo-1599586120429-48281b6f0ece?w=400",
    title: "48-shot marathon kitchen rally",
    viewsCount: 6890,
  },
  {
    createdAt: "2026-09-27T16:45:00.000Z",
    durationSeconds: 15,
    id: "demo-clip-3",
    mediaType: "short",
    owner: {
      displayUsername: "mikeball",
      id: "demo-user-3",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      name: "Mike Rodriguez",
      username: "mikeball",
    },
    thumbnailUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
    title: "Bert putaway from back-court defense",
    viewsCount: 3120,
  },
  {
    createdAt: "2026-09-28T12:00:00.000Z",
    durationSeconds: 29,
    id: "demo-clip-4",
    mediaType: "short",
    owner: {
      displayUsername: "jessicap",
      id: "demo-user-4",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      name: "Jessica Patel",
      username: "jessicap",
    },
    thumbnailUrl: "https://images.unsplash.com/photo-1563299796-17596ed6b017?w=400",
    title: "ATP shot off a deep angle slam",
    viewsCount: 5410,
  },
];

export const demoVenues: VenueData[] = [
  {
    activePlayers: 18,
    addressLine1: "123 Crestwood Way",
    city: "Denver",
    courtCount: 8,
    distanceMiles: 1.4,
    heatScore: 92,
    id: "venue-1",
    isFavorited: true,
    isHomeCourt: true,
    name: "Crestwood Park Courts",
    openNow: true,
    photoUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=640",
    rating: 4.8,
    state: "CO",
    venueType: "Public Park",
  },
  {
    activePlayers: 12,
    addressLine1: "4500 Burnet Rd",
    city: "Austin",
    courtCount: 6,
    distanceMiles: 3.8,
    heatScore: 78,
    id: "venue-2",
    name: "Burnet Park Pickleball Center",
    openNow: true,
    photoUrl: "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=640",
    rating: 4.6,
    state: "TX",
    venueType: "Dedicated Facility",
  },
  {
    activePlayers: 6,
    addressLine1: "800 Sam Peck Rd",
    city: "Little Rock",
    courtCount: 12,
    distanceMiles: 7.2,
    heatScore: 64,
    id: "venue-3",
    name: "Little Rock Athletic Club",
    openNow: true,
    photoUrl: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=640",
    rating: 4.9,
    state: "AR",
    venueType: "Athletic Club",
  },
  {
    activePlayers: 22,
    addressLine1: "100 South St",
    city: "Naples",
    courtCount: 16,
    distanceMiles: 12.5,
    heatScore: 96,
    id: "venue-4",
    name: "East Naples Community Park",
    openNow: true,
    photoUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=640",
    rating: 5.0,
    state: "FL",
    venueType: "Championship Venue",
  },
];

export const demoPlayers: PlayerData[] = [
  {
    bio: "Tournament doubles player. Fast hands, resets, and morning open play enthusiast.",
    displayUsername: "cgstewart",
    homeCity: "Little Rock",
    homeCourtName: "Little Rock Athletic Club",
    homeState: "AR",
    id: "demo-player-1",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    matchesPlayed: 48,
    name: "Cameron Stewart",
    skillLevel: "4.5 Tournament",
    username: "cgstewart",
    winRate: 72,
  },
  {
    bio: "Patient dinker, mixed doubles competitor. Plays weekend round robins.",
    displayUsername: "sarahpickle",
    homeCity: "Denver",
    homeCourtName: "Crestwood Park Courts",
    homeState: "CO",
    id: "demo-player-2",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    matchesPlayed: 62,
    name: "Sarah Johnson",
    skillLevel: "4.0 Doubles",
    username: "sarahpickle",
    winRate: 68,
  },
  {
    bio: "Aggressive third-shot dropper. Coaching clinics and evening challenge court ladder.",
    displayUsername: "mikeball",
    homeCity: "Phoenix",
    homeCourtName: "Pecos Park",
    homeState: "AZ",
    id: "demo-player-3",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    matchesPlayed: 91,
    name: "Mike Rodriguez",
    skillLevel: "5.0 Pro",
    username: "mikeball",
    winRate: 81,
  },
  {
    bio: "Passionate rec player leveling up into 3.5 sanctioned tournaments.",
    displayUsername: "jessicap",
    homeCity: "Austin",
    homeCourtName: "Burnet Park Pickleball Center",
    homeState: "TX",
    id: "demo-player-4",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    matchesPlayed: 34,
    name: "Jessica Patel",
    skillLevel: "3.5 Open Play",
    username: "jessicap",
    winRate: 59,
  },
];

export const demoEvents: EventData[] = [
  {
    capacity: 32,
    category: "Tournament",
    dateLabel: "Saturday, 9:00 AM",
    endsAt: "2026-10-18T18:00:00.000Z",
    eventType: "Double Elimination",
    hostLabel: "Rocky Mountain Pickleball",
    id: "event-1",
    imageUrl: "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=640",
    location: "Crestwood Park Courts, Denver CO",
    name: "Denver Fall Classic 4.0/4.5 Doubles",
    priceCents: 4500,
    registeredCount: 28,
    startsAt: "2026-10-18T15:00:00.000Z",
    status: "registration_open",
    venueName: "Crestwood Park Courts",
  },
  {
    capacity: 24,
    category: "Open Play",
    dateLabel: "Sunday, 10:00 AM",
    endsAt: "2026-10-19T17:00:00.000Z",
    eventType: "Round Robin Ladder",
    hostLabel: "Austin Pickleball Association",
    id: "event-2",
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=640",
    location: "Burnet Park, Austin TX",
    name: "Austin Open Ladder & Dinking Clinic",
    priceCents: 2000,
    registeredCount: 21,
    startsAt: "2026-10-19T16:00:00.000Z",
    status: "filling_fast",
    venueName: "Burnet Park",
  },
  {
    capacity: 64,
    category: "Major",
    dateLabel: "Nov 7-9, 2026",
    endsAt: "2026-11-09T22:00:00.000Z",
    eventType: "Sanctioned Major",
    hostLabel: "RallyCasts Championships",
    id: "event-3",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=640",
    location: "East Naples Community Park, FL",
    name: "Florida Sunshine Championship 2026",
    priceCents: 8500,
    registeredCount: 56,
    startsAt: "2026-11-07T14:00:00.000Z",
    status: "featured",
    venueName: "East Naples Community Park",
  },
];

export const demoCasters: CasterData[] = [
  {
    bio: "Certified court caster. 4K gimbal, wireless court mics, multi-cam live switching for tournaments and matches.",
    displayName: "Brett Miller",
    equipment: ["Sony FX3 4K", "DJI RS3 Pro", "Rode Wireless Pro", "Live Stream Backpack"],
    hourlyRateCents: 6500,
    id: "caster-1",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    matchesStreamed: 142,
    rating: 4.95,
    serviceRadiusMiles: 35,
    status: "active",
    userId: "caster-user-1",
  },
  {
    bio: "Sports videographer specializing in high-speed pickleball highlight reels and player profile edits.",
    displayName: "Elena Vance",
    equipment: ["Canon R6 II", "200fps Slow Motion", "Court Audio Rig"],
    hourlyRateCents: 5500,
    id: "caster-2",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    matchesStreamed: 89,
    rating: 4.9,
    serviceRadiusMiles: 25,
    status: "active",
    userId: "caster-user-2",
  },
];

export const demoPosts: PostData[] = [
  {
    author: {
      displayUsername: "cgstewart",
      id: "demo-player-1",
      name: "Cameron Stewart",
      username: "cgstewart",
    },
    content: "Crestwood is packed tonight! Courts 3 and 4 have intense 4.5 doubles runs going.",
    createdAt: "2 hours ago",
    id: "post-1",
  },
  {
    author: {
      displayUsername: "sarahpickle",
      id: "demo-player-2",
      name: "Sarah Johnson",
      username: "sarahpickle",
    },
    content: "Looking for 1 partner for the Denver Fall Classic 4.0 mixed bracket next weekend! Drop a message.",
    createdAt: "5 hours ago",
    id: "post-2",
  },
];
