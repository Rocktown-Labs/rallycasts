export const RADIUS_OPTIONS = [
  { label: "All Areas", value: 0 },
  { label: "5 mi", value: 5 },
  { label: "15 mi", value: 15 },
  { label: "25 mi", value: 25 },
  { label: "50 mi", value: 50 },
] as const;

export const PARK_SORTS = [
  { id: "heat", label: "Hottest" },
  { id: "players", label: "Most active" },
  { id: "distance", label: "Closest" },
] as const;

export type ParkSort = (typeof PARK_SORTS)[number]["id"];

export const VIDEO_SORTS = [
  { id: "views", label: "Most watched" },
  { id: "newest", label: "Newest" },
] as const;

export type VideoSort = (typeof VIDEO_SORTS)[number]["id"];
