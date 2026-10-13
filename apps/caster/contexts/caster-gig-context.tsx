import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

export type GigStage =
  | "en_route"
  | "arrived"
  | "setup"
  | "recording"
  | "completed";

export interface MatchOffer {
  id: string;
  matchTitle: string;
  division: string;
  eventTitle: string;
  venueName: string;
  courtNumber: string;
  address: string;
  distanceMiles: number;
  estimatedDriveMins: number;
  scheduledStartTime: string;
  estimatedDuration: string;
  payout: {
    total: number;
    baseFee: number;
    gearStipend: number;
    estimatedTip: number;
  };
  organizerName: string;
  organizerPhone: string;
  players: {
    teamA: string;
    teamB: string;
  };
  expiresInSeconds: number;
}

export interface ActiveGig extends MatchOffer {
  stage: GigStage;
  startedAt: string;
  arrivedAt?: string;
  recordingStartedAt?: string;
  completedAt?: string;
  score: {
    set1: [number, number];
    set2: [number, number];
    currentSet: 1 | 2 | 3;
    servingTeam: "A" | "B";
  };
  taggedHighlights: { id: string; timestamp: string; title: string }[];
}

export interface GigHistoryItem {
  id: string;
  matchTitle: string;
  division: string;
  venueName: string;
  courtNumber: string;
  date: string;
  time: string;
  duration: string;
  payout: number;
  tip: number;
  status: "Completed" | "Paid" | "Processing";
  highlightsCount: number;
}

export interface CasterMetrics {
  tier: "Bronze" | "Silver" | "Gold" | "Gold Caster" | "Pro Caster";
  points: number;
  maxPoints: number;
  onTimeArrivalRate: number; // percentage e.g. 98
  broadcastCompletionRate: number; // percentage e.g. 100
  streamQualityRating: number; // e.g. 4.9
  totalReviews: number;
  activeIncentives: {
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    reward: string;
    expiresIn: string;
  }[];
}

interface CoverageZone {
  id: string;
  name: string;
  city: string;
  venueCount: number;
  activeMatches: number;
  isSurging: boolean;
  surgeMultiplier: string;
}

interface CasterGigContextType {
  isOnDuty: boolean;
  onDutyUntil: string;
  toggleDuty: (enabled?: boolean) => void;
  activeZone: CoverageZone;
  availableZones: CoverageZone[];
  setActiveZone: (zone: CoverageZone) => void;
  activeOffer: MatchOffer | null;
  activeGig: ActiveGig | null;
  completedGigs: GigHistoryItem[];
  metrics: CasterMetrics;
  weeklyEarnings: {
    total: number;
    broadcastsCount: number;
    hoursBroadcast: number;
    tipsTotal: number;
    daily: { day: string; amount: number; isToday?: boolean }[];
  };
  simulateOffer: () => MatchOffer;
  acceptOffer: (offer: MatchOffer) => void;
  declineOffer: () => void;
  updateGigStage: (stage: GigStage) => void;
  updateScore: (
    team: "A" | "B",
    delta: number
  ) => void;
  tagHighlight: (title?: string) => void;
  finishGig: () => void;
  clearActiveGig: () => void;
}

const DEFAULT_ZONES: CoverageZone[] = [
  {
    id: "zone-lr-central",
    name: "Little Rock Central & Riverfront",
    city: "Little Rock, AR",
    venueCount: 8,
    activeMatches: 14,
    isSurging: true,
    surgeMultiplier: "+$12 / match",
  },
  {
    id: "zone-nlr-burns",
    name: "Burns Park & North Courts",
    city: "North Little Rock, AR",
    venueCount: 12,
    activeMatches: 22,
    isSurging: true,
    surgeMultiplier: "+$15 / match",
  },
  {
    id: "zone-lr-west",
    name: "West Little Rock & Kanis",
    city: "Little Rock, AR",
    venueCount: 6,
    activeMatches: 9,
    isSurging: false,
    surgeMultiplier: "+$0",
  },
  {
    id: "zone-maumelle",
    name: "Maumelle Community Complex",
    city: "Maumelle, AR",
    venueCount: 4,
    activeMatches: 5,
    isSurging: false,
    surgeMultiplier: "+$0",
  },
];

const INITIAL_OFFER: MatchOffer = {
  id: "offer-8821",
  matchTitle: "Men's 4.5 Doubles • Semi-Finals",
  division: "4.5 Open Division",
  eventTitle: "Natural State Fall Classic 2026",
  venueName: "Burns Park Pickleball Complex",
  courtNumber: "Court 4 (Championship Row)",
  address: "4501 Joe W. Foster Pkwy, North Little Rock, AR",
  distanceMiles: 2.4,
  estimatedDriveMins: 8,
  scheduledStartTime: "9:30 AM",
  estimatedDuration: "1h 15m",
  payout: {
    total: 42.5,
    baseFee: 25.0,
    gearStipend: 10.0,
    estimatedTip: 7.5,
  },
  organizerName: "Alex Miller (Tournament Director)",
  organizerPhone: "(501) 555-0194",
  players: {
    teamA: "Dave Kowalski & Brian Torres",
    teamB: "Marcus Vance & Sam Wilson",
  },
  expiresInSeconds: 55,
};

const INITIAL_GIGS: GigHistoryItem[] = [
  {
    id: "gig-101",
    matchTitle: "Mixed 4.0 Doubles • Quarter-Finals",
    division: "Mixed 4.0",
    venueName: "Kanis Park Pickleball Facility",
    courtNumber: "Court 2",
    date: "Today, Oct 13",
    time: "8:00 AM",
    duration: "1h 05m",
    payout: 38.0,
    tip: 6.0,
    status: "Completed",
    highlightsCount: 8,
  },
  {
    id: "gig-102",
    matchTitle: "Women's 4.5 Singles • Gold Match",
    division: "Women's 4.5",
    venueName: "Little Rock Athletic Club",
    courtNumber: "Stadium Court 1",
    date: "Yesterday, Oct 12",
    time: "4:30 PM",
    duration: "1h 22m",
    payout: 52.0,
    tip: 12.0,
    status: "Paid",
    highlightsCount: 14,
  },
  {
    id: "gig-103",
    matchTitle: "Men's 5.0 Pro Exhibition Doubles",
    division: "5.0 Pro Division",
    venueName: "Burns Park Pickleball Complex",
    courtNumber: "Championship Court",
    date: "Friday, Oct 11",
    time: "6:00 PM",
    duration: "1h 45m",
    payout: 68.5,
    tip: 15.0,
    status: "Paid",
    highlightsCount: 19,
  },
  {
    id: "gig-104",
    matchTitle: "Senior Mixed 3.5 Finals",
    division: "Mixed 3.5 (50+)",
    venueName: "Riverfront Park Courts",
    courtNumber: "Court 6",
    date: "Thursday, Oct 10",
    time: "10:15 AM",
    duration: "58m",
    payout: 34.0,
    tip: 5.0,
    status: "Paid",
    highlightsCount: 6,
  },
];

const INITIAL_METRICS: CasterMetrics = {
  tier: "Gold Caster",
  points: 1420,
  maxPoints: 2000,
  onTimeArrivalRate: 98,
  broadcastCompletionRate: 100,
  streamQualityRating: 4.9,
  totalReviews: 84,
  activeIncentives: [
    {
      id: "inc-1",
      title: "Weekend Rally Surge",
      description: "Complete 4 match broadcasts before Sunday 9 PM",
      progress: 3,
      target: 4,
      reward: "+$30.00 Bonus",
      expiresIn: "Today at 9:00 PM",
    },
    {
      id: "inc-2",
      title: "Prime Court Morning Streak",
      description: "Broadcast 2 morning matches between 7 AM and 11 AM",
      progress: 2,
      target: 2,
      reward: "+$15.00 Bonus",
      expiresIn: "Completed!",
    },
    {
      id: "inc-3",
      title: "4K 60fps Broadcast Mastery",
      description: "Maintain 100% 4K uptime with 0 frame drops for 5 matches",
      progress: 4,
      target: 5,
      reward: "+$20.00 Gear Stipend",
      expiresIn: "3 days left",
    },
  ],
};

const CasterGigContext = createContext<CasterGigContextType | undefined>(
  undefined
);

export function CasterGigProvider({ children }: { children: React.ReactNode }) {
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [onDutyUntil, setOnDutyUntil] = useState("1:00 PM");
  const [activeZone, setActiveZone] = useState<CoverageZone>(DEFAULT_ZONES[0]);
  const [availableZones] = useState<CoverageZone[]>(DEFAULT_ZONES);
  const [activeOffer, setActiveOffer] = useState<MatchOffer | null>(INITIAL_OFFER);
  const [activeGig, setActiveGig] = useState<ActiveGig | null>(null);
  const [completedGigs, setCompletedGigs] =
    useState<GigHistoryItem[]>(INITIAL_GIGS);
  const [metrics, setMetrics] = useState<CasterMetrics>(INITIAL_METRICS);

  const [weeklyEarnings, setWeeklyEarnings] = useState({
    total: 382.5,
    broadcastsCount: 9,
    hoursBroadcast: 11.2,
    tipsTotal: 68.0,
    daily: [
      { day: "Mon", amount: 45.0 },
      { day: "Tue", amount: 38.0 },
      { day: "Wed", amount: 62.5 },
      { day: "Thu", amount: 54.0 },
      { day: "Fri", amount: 83.5 },
      { day: "Sat", amount: 61.5 },
      { day: "Sun", amount: 38.0, isToday: true },
    ],
  });

  const toggleDuty = useCallback((enabled?: boolean) => {
    setIsOnDuty((prev) => (enabled !== undefined ? enabled : !prev));
    if (!isOnDuty) {
      setOnDutyUntil("2:00 PM");
    }
  }, [isOnDuty]);

  const simulateOffer = useCallback((): MatchOffer => {
    const newOffer: MatchOffer = {
      ...INITIAL_OFFER,
      id: `offer-${Date.now()}`,
      expiresInSeconds: 55,
    };
    setActiveOffer(newOffer);
    return newOffer;
  }, []);

  const acceptOffer = useCallback((offer: MatchOffer) => {
    setActiveOffer(null);
    const newGig: ActiveGig = {
      ...offer,
      stage: "en_route",
      startedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      score: {
        set1: [11, 9],
        set2: [6, 4],
        currentSet: 2,
        servingTeam: "A",
      },
      taggedHighlights: [
        {
          id: "hl-1",
          timestamp: "04:12",
          title: "Incredible ATP (Around-the-post) shot by Team A",
        },
        {
          id: "hl-2",
          timestamp: "12:45",
          title: "48-shot dink rally battle at kitchen line",
        },
      ],
    };
    setActiveGig(newGig);
  }, []);

  const declineOffer = useCallback(() => {
    setActiveOffer(null);
  }, []);

  const updateGigStage = useCallback((stage: GigStage) => {
    setActiveGig((prev) => {
      if (!prev) return null;
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        ...prev,
        stage,
        arrivedAt: stage === "arrived" ? now : prev.arrivedAt,
        recordingStartedAt:
          stage === "recording" ? now : prev.recordingStartedAt,
        completedAt: stage === "completed" ? now : prev.completedAt,
      };
    });
  }, []);

  const updateScore = useCallback((team: "A" | "B", delta: number) => {
    setActiveGig((prev) => {
      if (!prev) return null;
      const set2 = [...prev.score.set2] as [number, number];
      if (team === "A") {
        set2[0] = Math.max(0, set2[0] + delta);
      } else {
        set2[1] = Math.max(0, set2[1] + delta);
      }
      return {
        ...prev,
        score: {
          ...prev.score,
          set2,
          servingTeam: team,
        },
      };
    });
  }, []);

  const tagHighlight = useCallback((title?: string) => {
    setActiveGig((prev) => {
      if (!prev) return null;
      const timestamp = new Date().toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });
      const newHighlight = {
        id: `hl-${Date.now()}`,
        timestamp,
        title:
          title ??
          `Clutch Winner Highlight #${prev.taggedHighlights.length + 1}`,
      };
      return {
        ...prev,
        taggedHighlights: [newHighlight, ...prev.taggedHighlights],
      };
    });
  }, []);

  const finishGig = useCallback(() => {
    setActiveGig((prev) => {
      if (!prev) return null;
      const finishedItem: GigHistoryItem = {
        id: prev.id,
        matchTitle: prev.matchTitle,
        division: prev.division,
        venueName: prev.venueName,
        courtNumber: prev.courtNumber,
        date: "Today",
        time: prev.scheduledStartTime,
        duration: prev.estimatedDuration,
        payout: prev.payout.total,
        tip: prev.payout.estimatedTip,
        status: "Completed",
        highlightsCount: prev.taggedHighlights.length,
      };

      setCompletedGigs((gigs) => [finishedItem, ...gigs]);

      setWeeklyEarnings((curr) => ({
        ...curr,
        total: curr.total + prev.payout.total,
        broadcastsCount: curr.broadcastsCount + 1,
        tipsTotal: curr.tipsTotal + prev.payout.estimatedTip,
        daily: curr.daily.map((d) =>
          d.isToday ? { ...d, amount: d.amount + prev.payout.total } : d
        ),
      }));

      setMetrics((curr) => ({
        ...curr,
        points: Math.min(curr.maxPoints, curr.points + 50),
      }));

      return {
        ...prev,
        stage: "completed",
        completedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });
  }, []);

  const clearActiveGig = useCallback(() => {
    setActiveGig(null);
  }, []);

  return (
    <CasterGigContext.Provider
      value={{
        isOnDuty,
        onDutyUntil,
        toggleDuty,
        activeZone,
        availableZones,
        setActiveZone,
        activeOffer,
        activeGig,
        completedGigs,
        metrics,
        weeklyEarnings,
        simulateOffer,
        acceptOffer,
        declineOffer,
        updateGigStage,
        updateScore,
        tagHighlight,
        finishGig,
        clearActiveGig,
      }}
    >
      {children}
    </CasterGigContext.Provider>
  );
}

export function useCasterGig() {
  const context = useContext(CasterGigContext);
  if (!context) {
    throw new Error("useCasterGig must be used within CasterGigProvider");
  }
  return context;
}
