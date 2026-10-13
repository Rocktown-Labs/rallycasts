import { Button } from "@rallycaststv/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Eye,
  Globe,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Share2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  useJoinOrganization,
  useLeaveOrganization,
} from "@/lib/hooks/use-organizations";

import { OrganizationComposer } from "./organization-composer";
import type { LightboxPostItem } from "./organization-media-lightbox";
import { OrganizationMediaLightbox } from "./organization-media-lightbox";
import { OrganizationPostCard } from "./organization-post-card";
import { OrganizationShareModal } from "./organization-share-modal";
import { parsePostContent } from "./post-helpers";

export interface OrganizationGroupViewProps {
  data: {
    events: {
      entryFeeCents: number;
      id: string;
      name: string;
      startsAt: string | number | Date;
      status: string;
    }[];
    isMember?: boolean;
    members: {
      role: string;
      user: {
        id: string;
        image?: string | null;
        name: string;
        username?: string | null;
      };
    }[];
    organization: {
      bio?: string | null;
      city?: string | null;
      createdAt: string | number | Date;
      id: string;
      isOfficial?: boolean;
      logoUrl?: string | null;
      name: string;
      slug: string;
      state?: string | null;
    };
    posts: LightboxPostItem[];
    userRole?: string | null;
    videos: {
      createdAt: string | number | Date;
      id: string;
      playbackId?: string | null;
      status: string;
      thumbnailUrl?: string | null;
      title: string;
      visibility: string;
    }[];
  };
  slug: string;
}

interface MediaItem {
  authorName?: string;
  id: string;
  post?: LightboxPostItem;
  type: "photo" | "video";
  url: string;
  videoId?: string;
}

interface OrganizationSidebarProps {
  bio?: string | null;
  events: OrganizationGroupViewProps["data"]["events"];
  locationString: string;
  members: OrganizationGroupViewProps["data"]["members"];
  name: string;
  onOpenLightboxPost: (post: LightboxPostItem) => void;
  onTabChange: (
    tab: "about" | "discussion" | "events" | "media" | "people"
  ) => void;
  recentMediaItems: MediaItem[];
}

function OrganizationSidebar({
  bio,
  events,
  locationString,
  members,
  name,
  onOpenLightboxPost,
  onTabChange,
  recentMediaItems,
}: OrganizationSidebarProps) {
  return (
    <aside className="space-y-4">
      {/* About Group Card */}
      <section className="bg-card text-card-foreground border-border rounded-2xl border p-4 shadow-sm">
        <h2 className="text-sm font-bold">About</h2>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {bio ??
            `Welcome to ${name}! Connect with local pickleball players, coordinate open play matches, join tournaments, and share rallies.`}
        </p>

        <div className="mt-4 space-y-3 border-t pt-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Globe className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-bold">Public</p>
              <p className="text-muted-foreground text-[11px]">
                Anyone can see who&apos;s in the group and what they post.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Eye className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-bold">Visible</p>
              <p className="text-muted-foreground text-[11px]">
                Anyone can find this group on RallyCasts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-bold">{locationString}</p>
              <p className="text-muted-foreground text-[11px]">
                Home region for matches and tournaments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Media Card (2x2 Grid) */}
      {recentMediaItems.length > 0 ? (
        <section className="bg-card text-card-foreground border-border rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold">Recent media</h2>
            <button
              className="text-primary text-xs font-semibold hover:underline"
              onClick={() => onTabChange("media")}
              type="button"
            >
              See all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {recentMediaItems.map((item) => (
              <button
                aria-label="View media item"
                className="group relative h-28 cursor-pointer overflow-hidden rounded-xl border-0 bg-black p-0 text-left"
                key={item.id}
                onClick={() => {
                  if (item.post) {
                    onOpenLightboxPost(item.post);
                  } else if (item.videoId) {
                    window.location.assign(`/videos/${item.videoId}`);
                  }
                }}
                type="button"
              >
                <img
                  alt=""
                  className="size-full object-cover transition group-hover:scale-105"
                  src={item.url}
                />
                {item.type === "video" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="grid size-7 place-items-center rounded-full bg-[#bcdf21] text-black">
                      ▶
                    </div>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Upcoming Tournaments & Events */}
      {events.length > 0 ? (
        <section className="bg-card text-card-foreground border-border rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Trophy className="size-4 text-[#bcdf21]" /> Upcoming Events
            </h2>
            <button
              className="text-primary text-xs font-semibold hover:underline"
              onClick={() => onTabChange("events")}
              type="button"
            >
              See all
            </button>
          </div>

          <div className="space-y-2">
            {events.slice(0, 3).map((eventItem) => (
              <Link
                className="hover:bg-muted/50 flex items-center justify-between rounded-xl border p-2.5 text-xs transition"
                key={eventItem.id}
                params={{ id: eventItem.id }}
                to="/events/$id"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate font-bold">{eventItem.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {new Date(eventItem.startsAt).toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <span className="bg-primary/10 text-primary shrink-0 rounded-md px-2 py-1 text-[10px] font-bold">
                  {eventItem.entryFeeCents > 0
                    ? `$${(eventItem.entryFeeCents / 100).toFixed(0)}`
                    : "Free"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Team & Organizers Card */}
      <section className="bg-card text-card-foreground border-border rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-sm font-bold">Admins &amp; Organizers</h2>
          <button
            className="text-primary text-xs font-semibold hover:underline"
            onClick={() => onTabChange("people")}
            type="button"
          >
            All members
          </button>
        </div>

        <div className="space-y-2">
          {members.slice(0, 4).map((member) => (
            <Link
              className="hover:bg-muted/50 flex items-center gap-2.5 rounded-xl p-1.5 text-xs transition"
              key={member.user.id}
              params={{ username: member.user.username ?? "player" }}
              to="/players/$username"
            >
              <div className="size-8 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                {member.user.image ? (
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={member.user.image}
                  />
                ) : (
                  <div className="bg-primary/20 text-primary grid size-full place-items-center text-[10px] font-bold">
                    {member.user.name[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{member.user.name}</p>
                <p className="text-muted-foreground text-[10px] capitalize">
                  {member.role}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}

interface OrganizationAboutTabProps {
  bio?: string | null;
  createdAt: string | number | Date;
  locationString: string;
  membersCount: number;
  name: string;
}

function OrganizationAboutTab({
  bio,
  createdAt,
  locationString,
  membersCount,
  name,
}: OrganizationAboutTabProps) {
  return (
    <div className="max-w-4xl space-y-6">
      <section className="bg-card rounded-2xl border p-6">
        <h2 className="text-xl font-bold">About {name}</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed whitespace-pre-wrap">
          {bio ?? "This organization has not added a full description yet."}
        </p>
      </section>

      <section className="bg-card space-y-4 rounded-2xl border p-6">
        <h3 className="font-bold">Group Details</h3>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Globe className="text-primary size-5" />
            <div>
              <p className="font-bold">Privacy</p>
              <p className="text-muted-foreground text-xs">
                Public group. Open to all players.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="text-primary size-5" />
            <div>
              <p className="font-bold">Location</p>
              <p className="text-muted-foreground text-xs">{locationString}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="text-primary size-5" />
            <div>
              <p className="font-bold">Members</p>
              <p className="text-muted-foreground text-xs">
                {membersCount} registered players
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="text-primary size-5" />
            <div>
              <p className="font-bold">Founded</p>
              <p className="text-muted-foreground text-xs">
                {new Date(createdAt).toLocaleDateString([], {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface OrganizationEventsTabProps {
  canManage: boolean;
  events: OrganizationGroupViewProps["data"]["events"];
}

function OrganizationEventsTab({
  canManage,
  events,
}: OrganizationEventsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tournaments &amp; Events</h2>
        {canManage ? (
          <Link to="/u/organizer/tournaments/new">
            <Button size="sm">Create Tournament</Button>
          </Link>
        ) : null}
      </div>

      {events.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-2xl border p-12 text-center text-sm">
          No tournaments scheduled currently. Check back soon!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((eventItem) => (
            <Link
              className="bg-card hover:border-primary/60 flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition"
              key={eventItem.id}
              params={{ id: eventItem.id }}
              to="/events/$id"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-bold tracking-wider uppercase">
                    Tournament
                  </span>
                  <span className="text-muted-foreground capitalize">
                    {eventItem.status}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold">{eventItem.name}</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {new Date(eventItem.startsAt).toLocaleDateString([], {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(eventItem.startsAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-primary text-sm font-black">
                  {eventItem.entryFeeCents > 0
                    ? `$${(eventItem.entryFeeCents / 100).toFixed(2)} entry`
                    : "Free Entry"}
                </span>
                <span className="text-muted-foreground flex items-center text-xs font-semibold">
                  Register <ChevronRight className="ml-1 size-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface OrganizationMediaTabProps {
  allMediaItems: MediaItem[];
  onOpenLightboxPost: (post: LightboxPostItem) => void;
}

function OrganizationMediaTab({
  allMediaItems,
  onOpenLightboxPost,
}: OrganizationMediaTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Photos and Videos</h2>
      {allMediaItems.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-2xl border p-12 text-center text-sm">
          <ImageIcon className="text-muted-foreground mx-auto mb-2 size-8" />
          No photos or videos shared yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {allMediaItems.map((item) => (
            <button
              aria-label="View media gallery item"
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border-0 bg-black p-0 text-left"
              key={item.id}
              onClick={() => {
                if (item.post) {
                  onOpenLightboxPost(item.post);
                } else if (item.videoId) {
                  window.location.assign(`/videos/${item.videoId}`);
                }
              }}
              type="button"
            >
              <img
                alt=""
                className="size-full object-cover transition group-hover:scale-105"
                src={item.url}
              />
              {item.type === "video" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="grid size-8 place-items-center rounded-full bg-[#bcdf21] text-black">
                    ▶
                  </div>
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface OrganizationPeopleTabProps {
  members: OrganizationGroupViewProps["data"]["members"];
}

function OrganizationPeopleTab({ members }: OrganizationPeopleTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Members &amp; Team</h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {members.map((member) => (
          <Link
            className="bg-card hover:border-primary/50 flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm transition"
            key={member.user.id}
            params={{ username: member.user.username ?? "player" }}
            to="/players/$username"
          >
            <div className="size-11 shrink-0 overflow-hidden rounded-full bg-neutral-800">
              {member.user.image ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  src={member.user.image}
                />
              ) : (
                <div className="bg-primary/20 text-primary grid size-full place-items-center text-sm font-bold">
                  {member.user.name[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{member.user.name}</p>
              <p className="text-muted-foreground text-xs capitalize">
                {member.role}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function OrganizationGroupView({
  data,
  slug,
}: OrganizationGroupViewProps) {
  const { data: session } = authClient.useSession();
  const { organization, members, events, posts, videos } = data;

  const [activeTab, setActiveTab] = useState<
    "about" | "discussion" | "events" | "media" | "people"
  >("discussion");

  // Lightbox State
  const [activeLightboxPost, setActiveLightboxPost] =
    useState<LightboxPostItem | null>(null);
  const [activeLightboxImageIndex, setActiveLightboxImageIndex] = useState(0);

  // Share Modal State
  const [shareTarget, setShareTarget] = useState<{
    entityId: string;
    entityTitle: string;
    entityType?: "event" | "post" | "profile" | "venue" | "video";
    shareUrl: string;
  } | null>(null);

  // Member Status
  const canManage = members.some(
    (member) =>
      member.user.id === session?.user?.id &&
      (member.role === "owner" || member.role === "admin")
  );
  const isJoined =
    data.isMember ??
    members.some((member) => member.user.id === session?.user?.id);

  const joinMutation = useJoinOrganization(slug);
  const leaveMutation = useLeaveOrganization(slug);

  const handleJoinToggle = () => {
    if (!session?.user) {
      toast.error("Please sign in to join this organization group.");
      return;
    }
    if (isJoined) {
      leaveMutation.mutate(undefined, {
        onSuccess: () => toast.success(`Left ${organization.name}`),
      });
    } else {
      joinMutation.mutate(undefined, {
        onSuccess: () => toast.success(`Joined ${organization.name}!`),
      });
    }
  };

  const shareGroupUrl =
    typeof window === "undefined"
      ? `https://rallycasts.com/events/hosts/${slug}`
      : `${window.location.origin}/events/hosts/${slug}`;

  // Extract all media items from posts + videos for the Recent Media & Media Tab
  const allMediaItems = useMemo(() => {
    const list: MediaItem[] = [];

    // From organization posts
    for (const p of posts) {
      const { images: postImages } = parsePostContent(p.content);
      for (const imgUrl of postImages) {
        list.push({
          authorName: p.author?.name,
          id: `${p.id}-${imgUrl}`,
          post: p,
          type: "photo",
          url: imgUrl,
        });
      }
    }

    // From organization match videos
    for (const v of videos) {
      if (v.thumbnailUrl) {
        list.push({
          id: v.id,
          type: "video",
          url: v.thumbnailUrl,
          videoId: v.id,
        });
      }
    }

    return list;
  }, [posts, videos]);

  const recentMediaItems = allMediaItems.slice(0, 4);

  const locationString =
    [organization.city, organization.state].filter(Boolean).join(", ") ||
    "Global";

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* 1. COVER BANNER (Athletic Stadium Graphic) */}
      <section className="relative h-48 w-full overflow-hidden bg-neutral-900 sm:h-64 lg:h-80">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-teal-900 to-neutral-950 opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#bcdf21]/20 via-transparent to-black/60" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(#bcdf21 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button
            className="h-9 gap-1.5 rounded-full bg-black/60 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/80"
            onClick={() =>
              setShareTarget({
                entityId: organization.id,
                entityTitle: `${organization.name} on RallyCasts`,
                entityType: "profile",
                shareUrl: shareGroupUrl,
              })
            }
            size="sm"
            variant="ghost"
          >
            <Share2 className="size-3.5" />
            <span>Share Group</span>
          </Button>
        </div>
      </section>

      {/* 2. GROUP PROFILE HEADER */}
      <header className="border-border/60 bg-card/60 relative border-b backdrop-blur-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 flex flex-col gap-4 pb-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="ring-background size-28 shrink-0 overflow-hidden rounded-full bg-neutral-900 shadow-xl ring-4 sm:size-36">
                {organization.logoUrl ? (
                  <img
                    alt={organization.name}
                    className="size-full object-cover"
                    src={organization.logoUrl}
                  />
                ) : (
                  <div className="from-primary/30 to-primary/10 grid size-full place-items-center bg-gradient-to-br font-black text-white">
                    <Building2 className="text-primary size-12 sm:size-16" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                  <span>{organization.name}</span>
                  {organization.isOfficial ? (
                    <BadgeCheck className="size-6 text-[#bcdf21]" />
                  ) : null}
                </h1>

                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="text-foreground/90 flex items-center gap-1 font-semibold">
                    <Globe className="size-3.5" /> Public group
                  </span>
                  <span>•</span>
                  <span>{members.length} members</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {locationString}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2 sm:pt-0">
              <Button
                className={`rounded-xl text-xs font-bold transition sm:text-sm ${
                  isJoined
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                disabled={joinMutation.isPending || leaveMutation.isPending}
                onClick={handleJoinToggle}
                size="default"
              >
                {isJoined ? (
                  <>
                    <Check className="mr-1.5 size-4 text-[#bcdf21]" /> Joined
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1.5 size-4" /> Join group
                  </>
                )}
              </Button>

              <Button
                className="rounded-xl text-xs sm:text-sm"
                onClick={() =>
                  setShareTarget({
                    entityId: organization.id,
                    entityTitle: `${organization.name} on RallyCasts`,
                    entityType: "profile",
                    shareUrl: shareGroupUrl,
                  })
                }
                size="default"
                variant="outline"
              >
                <Share2 className="mr-1.5 size-4" /> Share
              </Button>

              {canManage ? (
                <Link params={{ slug }} to="/u/organizer/organizations/$slug">
                  <Button
                    className="rounded-xl text-xs sm:text-sm"
                    size="default"
                    variant="outline"
                  >
                    Manage
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* 3. STICKY NAVIGATION TABS */}
      <nav
        aria-label="Organization sections"
        className="border-border/60 bg-background/95 sticky top-0 z-30 border-b backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-7xl scrollbar-none items-center overflow-x-auto px-4 sm:px-6 lg:px-8">
          {(
            [
              { id: "discussion", label: "Discussion" },
              { id: "about", label: "About" },
              { id: "events", label: `Events (${events.length})` },
              { id: "media", label: `Media (${allMediaItems.length})` },
              { id: "people", label: `People (${members.length})` },
            ] as const
          ).map((tab) => (
            <button
              className={`relative px-4 py-3.5 text-xs font-bold whitespace-nowrap transition sm:text-sm ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
              {activeTab === tab.id ? (
                <span className="bg-primary absolute inset-x-2 bottom-0 h-1 rounded-t-full shadow-xs" />
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      {/* 4. MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {/* TAB 1: DISCUSSION (Facebook-Style Two Column Layout) */}
        {activeTab === "discussion" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left 2 Columns: Feed */}
            <div className="space-y-4 lg:col-span-2">
              <OrganizationComposer
                isMember={isJoined}
                organizationName={organization.name}
                slug={slug}
                userRole={data.userRole}
              />

              {posts.length === 0 ? (
                <div className="bg-card text-card-foreground rounded-2xl border p-12 text-center shadow-sm">
                  <div className="bg-muted text-muted-foreground mx-auto mb-3 grid size-12 place-items-center rounded-full">
                    <MessageSquare className="size-6" />
                  </div>
                  <h3 className="font-bold">No posts in this group yet</h3>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">
                    Be the first player to share match highlights, rally videos,
                    or tournament announcements!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <OrganizationPostCard
                      key={post.id}
                      onOpenLightbox={(p, imgIdx) => {
                        setActiveLightboxPost(p);
                        setActiveLightboxImageIndex(imgIdx);
                      }}
                      onOpenShare={(p) =>
                        setShareTarget({
                          entityId: p.id,
                          entityTitle: `${p.author?.name ?? "Pickleball"}'s post in ${organization.name}`,
                          entityType: "post",
                          shareUrl: `${shareGroupUrl}#post-${p.id}`,
                        })
                      }
                      post={post}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Sticky Sidebar */}
            <OrganizationSidebar
              bio={organization.bio}
              events={events}
              locationString={locationString}
              members={members}
              name={organization.name}
              onOpenLightboxPost={(p) => {
                setActiveLightboxPost(p);
                setActiveLightboxImageIndex(0);
              }}
              onTabChange={setActiveTab}
              recentMediaItems={recentMediaItems}
            />
          </div>
        ) : null}

        {/* TAB 2: ABOUT */}
        {activeTab === "about" ? (
          <OrganizationAboutTab
            bio={organization.bio}
            createdAt={organization.createdAt}
            locationString={locationString}
            membersCount={members.length}
            name={organization.name}
          />
        ) : null}

        {/* TAB 3: EVENTS & TOURNEYS */}
        {activeTab === "events" ? (
          <OrganizationEventsTab canManage={canManage} events={events} />
        ) : null}

        {/* TAB 4: MEDIA GALLERY */}
        {activeTab === "media" ? (
          <OrganizationMediaTab
            allMediaItems={allMediaItems}
            onOpenLightboxPost={(p) => {
              setActiveLightboxPost(p);
              setActiveLightboxImageIndex(0);
            }}
          />
        ) : null}

        {/* TAB 5: PEOPLE & TEAM */}
        {activeTab === "people" ? (
          <OrganizationPeopleTab members={members} />
        ) : null}
      </main>

      {/* 5. MEDIA LIGHTBOX MODAL */}
      {activeLightboxPost ? (
        <OrganizationMediaLightbox
          initialImageIndex={activeLightboxImageIndex}
          onClose={() => setActiveLightboxPost(null)}
          onOpenShare={(post) =>
            setShareTarget({
              entityId: post.id,
              entityTitle: `${post.author?.name ?? "Pickleball"}'s post in ${organization.name}`,
              entityType: "post",
              shareUrl: `${shareGroupUrl}#post-${post.id}`,
            })
          }
          post={activeLightboxPost}
        />
      ) : null}

      {/* 6. MULTI-CHANNEL SHARE MODAL */}
      {shareTarget ? (
        <OrganizationShareModal
          entityId={shareTarget.entityId}
          entityTitle={shareTarget.entityTitle}
          entityType={shareTarget.entityType}
          onClose={() => setShareTarget(null)}
          shareUrl={shareTarget.shareUrl}
        />
      ) : null}
    </div>
  );
}
