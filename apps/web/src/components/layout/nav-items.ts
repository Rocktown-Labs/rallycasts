import {
  Calendar,
  Camera,
  Clock,
  Flame,
  Home,
  MessageSquare,
  Radio,
  Trophy,
  User,
  Users,
  Video,
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
  { icon: Clock, label: "History", to: "/u/history" },
] as const;

export const mobileNavItems = [
  discoverNavItems[0],
  discoverNavItems[1],
  discoverNavItems[2],
  { icon: Radio, label: "Studio", to: "/u/profile" },
  accountNavItems[2],
] as const;
