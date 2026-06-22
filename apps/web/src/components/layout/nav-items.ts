import {
  Calendar,
  Camera,
  Clock,
  Flame,
  Home,
  MessageSquare,
  Settings,
  Trophy,
  Swords,
  User,
  Users,
  Video,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

export const discoverNavItems = [
  { icon: Home, label: "Home", to: "/" },
  { icon: Flame, label: "Trending", to: "/trending" },
  { icon: Users, label: "Players", to: "/players" },
  { icon: Calendar, label: "Events", to: "/events" },
  { icon: Camera, label: "Casters", to: "/casters" },
  { icon: Trophy, label: "Organizers", to: "/organizers" },
] as const;

export const organizerNavItems = [
  { icon: Calendar, label: "Manage Events", to: "/events" },
] as const;

export const accountNavItems = [
  { icon: Video, label: "Your Videos", to: "/u/videos/me" },
  { icon: User, label: "Profile", to: "/u/profile" },
  {
    icon: Calendar,
    label: "Recording Requests",
    to: "/u/recording-requests/me",
  },
  { icon: MessageSquare, label: "Messages", to: "/u/messages" },
  { icon: Swords, label: "Challenges", to: "/u/challenges" },
  { icon: Clock, label: "History", to: "/u/history" },
  { icon: Settings, label: "Settings", to: "/u/settings" },
] as const;

export const mobileDiscoverItems = [
  { icon: Home, label: "Home", to: "/" },
  { icon: Flame, label: "Trending", to: "/trending" },
  { icon: Users, label: "Players", to: "/players" },
  { icon: Calendar, label: "Events", to: "/events" },
  { icon: User, label: "My Account", to: "/u" },
] as const;

export const mobileAccountItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/u/me" },
  { icon: Video, label: "Videos", to: "/u/videos/me" },
  { icon: Camera, label: "Requests", to: "/u/recording-requests/me" },
  { icon: MessageSquare, label: "Messages", to: "/u/messages" },
  { icon: ArrowLeft, label: "Back", to: "/" },
] as const;

// Retain legacy export for safety/compatibility
export const mobileNavItems = mobileDiscoverItems;
