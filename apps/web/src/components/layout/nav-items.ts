import {
  Calendar,
  Camera,
  Clock,
  Flame,
  Building2,
  Home,
  MessageSquare,
  Settings,
  UploadCloud,
  Swords,
  Trophy,
  User,
  Users,
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

export const discoverNavItems = [
  { icon: Home, label: "Home", to: "/" },
  { icon: Flame, label: "Trending", to: "/trending" },
  { icon: Users, label: "Players", to: "/players" },
  { icon: Calendar, label: "Events", to: "/events" },
  { icon: Camera, label: "Casters", to: "/casters" },
  { icon: ShoppingBag, label: "Shop", to: "/shop" },
] as const;

export const organizerNavItems = [
  { icon: Trophy, label: "Dashboard", to: "/u/organizer" },
  { icon: Building2, label: "Organizations", to: "/u/organizer/organizations" },
  { icon: Calendar, label: "Manage Events", to: "/u/organizer/events" },
] as const;

export const adminNavItems = [
  { icon: ShieldCheck, label: "Admin", to: "/u/admin" },
] as const;

export const accountNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/u/me" },
  { icon: UploadCloud, label: "Studio", to: "/u/studio" },
  {
    icon: Calendar,
    label: "Casting Requests",
    to: "/u/casts/all",
  },
  { icon: MessageSquare, label: "Messages", to: "/u/messages" },
  { icon: Swords, label: "Challenges", to: "/u/challenges" },
  { icon: Clock, label: "History", to: "/u/history/videos" },
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
  { icon: UploadCloud, label: "Studio", to: "/u/studio" },
  { icon: Camera, label: "Requests", to: "/u/casts/all" },
  { icon: MessageSquare, label: "Messages", to: "/u/messages" },
  { icon: ArrowLeft, label: "Back", to: "/" },
] as const;

// Retain legacy export for safety/compatibility
export const mobileNavItems = mobileDiscoverItems;
