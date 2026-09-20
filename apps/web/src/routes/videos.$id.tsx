import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import {
  ChevronLeft,
  MapPin,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  Send,
  Share2,
  ThumbsUp,
  Users,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SponsoredPlayer } from "@/components/ads/sponsored-player";
import { authClient } from "@/lib/auth-client";
import type { VideoCommentRecord } from "@/lib/collections";
import { getVideoCommentsCollection, useLiveQuery } from "@/lib/collections";
import {
  getVideoSlug,
  useFriends,
  useShareEntity,
  useToggleVideoLike,
  useVideo,
} from "@/lib/hooks";

interface CommentUser {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

interface VideoCommentWithUser {
  id: string;
  isPinned?: boolean;
  pinnedAt?: string | Date | null;
  content: string;
  createdAt: string | Date;
  user: CommentUser | null;
}

interface VideoListItem {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  muxPlaybackId?: string | null;
  durationSeconds?: number | null;
  status?: string;
  viewsCount?: number | null;
}

interface Friend {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

function Avatar({ image, label }: { image?: null | string; label: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-bold">
      {image ? (
        <img alt="" className="size-full object-cover" src={image} />
      ) : (
        (label.at(0)?.toUpperCase() ?? "U")
      )}
    </span>
  );
}

export const Route = createFileRoute("/videos/$id")({
  component: VideoDetailPage,
});

const formatDuration = (seconds?: number | null) => {
  if (!seconds) {
    return "0:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatViews = (count: number) => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/u, "")}M views`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/u, "")}K views`;
  }
  return `${count} ${count === 1 ? "view" : "views"}`;
};

const formatRelativeTime = (value: Date | string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return formatDate(value);
};

function VideoLoadingSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden animate-pulse">
      <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
        <div className="h-5 w-28 bg-muted rounded" />
        <div className="aspect-video w-full bg-muted rounded-2xl shadow-xl" />
        <div className="space-y-3">
          <div className="h-8 w-2/3 bg-muted rounded" />
          <div className="h-5 w-1/3 bg-muted rounded" />
          <div className="h-14 w-full bg-muted rounded-xl" />
        </div>
      </div>
      <div className="hidden lg:flex w-88 xl:w-96 flex-col border-l border-border bg-card/40 p-4 space-y-4 shrink-0">
        <div className="h-6 w-36 bg-muted rounded" />
        <div className="space-y-3 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <div className="size-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-10 w-full bg-muted rounded" />
      </div>
    </div>
  );
}

function VideoNotFound() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-4">
      <h2 className="text-2xl font-bold text-destructive">Video not found</h2>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        The video you are trying to view does not exist, has been removed, or is
        still processing.
      </p>
      <Link to="/">
        <Button variant="outline" className="rounded-md text-xs mt-4">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}

interface ChatSidebarProps {
  commentsList: VideoCommentWithUser[];
  commentsLoading: boolean;
  currentUser: {
    id?: string;
    name?: string | null;
    image?: string | null;
  } | null;
  commentText: string;
  setCommentText: (val: string) => void;
  handleAddComment: (e: React.FormEvent) => void;
  handlePinComment: (commentId: string, pinned: boolean) => void;
  canPinComments: boolean;
  isReadOnly: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
}

function ChatSidebar({
  commentsList,
  commentsLoading,
  currentUser,
  commentText,
  setCommentText,
  handleAddComment,
  handlePinComment,
  canPinComments,
  isReadOnly,
  isOpen,
  onToggleOpen,
}: ChatSidebarProps) {
  if (!isOpen) {
    return null;
  }

  const renderCommentsFeed = () => {
    if (commentsLoading) {
      return (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="size-8 bg-muted rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3.5 w-full bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (commentsList.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center py-16 text-center text-muted-foreground px-4 space-y-2.5">
          <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <MessageSquare className="size-5" />
          </div>
          <p className="font-bold text-xs text-foreground">
            Welcome to the chat!
          </p>
          <p className="text-[11px] max-w-xs text-muted-foreground leading-relaxed">
            No comments yet. Be the first to start the conversation, cheer on
            players, or ask about the rally.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3.5">
        {commentsList.map((comment) => (
          <div
            key={comment.id}
            className={`flex gap-2.5 group/comment transition-colors rounded-lg p-2 ${
              comment.isPinned
                ? "bg-primary/5 border border-primary/20"
                : "hover:bg-muted/40"
            }`}
          >
            <Link
              to="/players/$username"
              params={{ username: comment.user?.username ?? "player" }}
              className="shrink-0"
            >
              <Avatar
                image={comment.user?.image}
                label={comment.user?.name ?? "U"}
              />
            </Link>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {comment.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                    <Pin className="size-2.5" /> Pinned
                  </span>
                )}
                <Link
                  to="/players/$username"
                  params={{
                    username: comment.user?.username ?? "player",
                  }}
                  className="font-extrabold text-[11px] text-foreground hover:text-primary transition-colors truncate"
                >
                  {comment.user?.name || "Player"}
                </Link>
                <span className="text-[10px] text-muted-foreground truncate">
                  @{comment.user?.username || "player"}
                </span>
                <span className="text-[9px] text-muted-foreground/60">•</span>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-foreground text-xs leading-relaxed break-words">
                {comment.content}
              </p>
              {canPinComments && (
                <div className="opacity-0 group-hover/comment:opacity-100 transition-opacity pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      handlePinComment(comment.id, !comment.isPinned)
                    }
                    className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    {comment.isPinned ? "Unpin comment" : "Pin comment"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderComposer = () => {
    if (isReadOnly) {
      return (
        <p className="text-center text-[11px] text-muted-foreground py-1">
          Demo comments are read-only.
        </p>
      );
    }

    if (!currentUser) {
      return (
        <div className="text-center space-y-2 py-1">
          <p className="text-[11px] text-muted-foreground">
            Log in to join the conversation.
          </p>
          <Link to="/login">
            <Button
              size="sm"
              className="w-full text-xs font-bold rounded-lg h-8"
            >
              Log In to Chat
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <form onSubmit={handleAddComment} className="flex items-center gap-2">
        <Input
          placeholder="Send a message..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="text-xs h-9 bg-muted/40 border-border/60 focus-visible:ring-1 focus-visible:ring-primary rounded-lg"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!commentText.trim()}
          className="size-9 shrink-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="Send comment"
        >
          <Send className="size-4" />
        </Button>
      </form>
    );
  };

  return (
    <aside
      aria-label="Video chat"
      className="flex flex-col w-full lg:w-88 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/70 bg-card/60 shrink-0 h-[480px] lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16 z-10"
    >
      {/* Twitch-style Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background/40">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label="Collapse chat"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Collapse chat"
        >
          <PanelRightClose className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-black tracking-wider uppercase text-foreground">
            Chat on Videos
          </h2>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
            {commentsList.length}
          </span>
        </div>
        <div className="w-5" />
      </div>

      {/* Twitch-style Stream Comments Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {renderCommentsFeed()}
      </div>

      {/* Twitch-style Chat Composer Pinned to Bottom */}
      <div className="p-3 border-t border-border/70 bg-background/50">
        {renderComposer()}
      </div>
    </aside>
  );
}

function VideoSharePanel({
  href,
  onClose,
  videoId,
}: {
  href: string;
  onClose: () => void;
  videoId: string;
}) {
  const { data } = useFriends();
  const shareEntity = useShareEntity();
  const friends = data?.friends ?? [];
  const copyLink = async () => {
    await navigator.clipboard.writeText(href);
    toast.success("Video link copied.");
  };

  const shareWithFriend = (friend: Friend) => {
    shareEntity.mutate(
      {
        channel: "direct_message",
        entityId: videoId,
        entityType: "video",
        href,
        recipientUserId: friend.id,
      },
      {
        onError: () => toast.error("Could not share that video."),
        onSuccess: () => {
          toast.success(`Shared with ${friend.name}.`);
          onClose();
        },
      }
    );
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-md animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm">Share this video</h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Send it to a friend in chat or copy the public link.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="rounded-md text-xs font-semibold h-8"
            onClick={copyLink}
            variant="outline"
          >
            Copy Link
          </Button>
          <Button
            aria-label="Close share panel"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 pt-1">
        {friends.length > 0 ? (
          friends.map((friend) => (
            <button
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-50 transition-colors"
              disabled={shareEntity.isPending}
              key={friend.id}
              onClick={() => shareWithFriend(friend)}
              type="button"
            >
              <Avatar image={friend.image} label={friend.name} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold truncate">
                  {friend.name}
                </span>
                <span className="text-muted-foreground truncate block">
                  @{friend.username ?? friend.displayUsername ?? "player"}
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground text-xs sm:col-span-2">
            Add friends from player profiles to share directly in chat.
          </p>
        )}
      </div>
    </section>
  );
}

function RecommendedShelf({ videos }: { videos: VideoListItem[] }) {
  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        Recommended Videos
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.slice(0, 8).map((vid) => {
          const vidThumbnail =
            vid.thumbnailUrl ??
            (vid.muxPlaybackId
              ? `https://image.mux.com/${vid.muxPlaybackId}/thumbnail.webp?time=1`
              : null);
          return (
            <Link
              key={vid.id}
              to="/videos/$id"
              params={{ id: getVideoSlug(vid) }}
              className="group/rec block cursor-pointer space-y-2"
            >
              <div className="relative aspect-video w-full bg-muted rounded-xl overflow-hidden border border-border/50">
                {vidThumbnail ? (
                  <img
                    src={vidThumbnail}
                    alt={vid.title}
                    className="size-full object-cover group-hover/rec:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-green-950/30">
                    <VideoIcon className="size-6 text-primary" />
                  </div>
                )}
                <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {formatDuration(vid.durationSeconds || 120)}
                </span>
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-foreground line-clamp-2 leading-snug group-hover/rec:text-primary transition-colors">
                  {vid.title}
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {vid.viewsCount !== undefined && vid.viewsCount !== null
                    ? `${formatViews(vid.viewsCount)} · `
                    : ""}
                  {vid.status === "ready" ? "Ready" : "Processing"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// oxlint-disable-next-line complexity
function VideoDetailPage() {
  const { id } = useParams({ from: "/videos/$id" });
  const isDemoVideo = id.startsWith("demo-video-");
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;
  const queryClient = useQueryClient();

  const {
    data: videoData,
    isLoading: videoLoading,
    error: videoError,
  } = useVideo(id);

  // Synchronize browser address bar with readable slug when title loads
  useEffect(() => {
    if (videoData?.video?.title) {
      const canonicalSlug = getVideoSlug(videoData.video);
      const currentPath = window.location.pathname;
      if (!currentPath.includes(canonicalSlug)) {
        window.history.replaceState(null, "", `/videos/${canonicalSlug}`);
      }
    }
  }, [videoData?.video]);

  const rawVideoId = videoData?.video?.id ?? id;
  const commentsCollection = useMemo(
    () => getVideoCommentsCollection(queryClient, rawVideoId),
    [queryClient, rawVideoId]
  );
  const { data: comments = [], isLoading: commentsLoading } =
    useLiveQuery(commentsCollection);

  const [commentText, setCommentText] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Sync real like count and liked status from server response
  useEffect(() => {
    if (videoData && "likesCount" in videoData) {
      setLikesCount(videoData.likesCount ?? 0);
      setHasLiked(Boolean(videoData.hasLiked));
    }
  }, [videoData]);

  const toggleLike = useToggleVideoLike(rawVideoId);

  const sortedComments = useMemo(
    () =>
      comments.toSorted((a, b) => {
        if (a.isPinned && !b.isPinned) {
          return -1;
        }
        if (!a.isPinned && b.isPinned) {
          return 1;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }),
    [comments]
  );

  const safeTaggedUsers = useMemo(() => {
    const raw = videoData?.taggedUsers;
    if (!raw) {
      return [];
    }
    const list: {
      id: string;
      name?: string | null;
      username?: string | null;
      image?: string | null;
    }[] = [];
    for (const item of raw) {
      if (item && "id" in item && typeof item.id === "string") {
        list.push(item);
      }
    }
    return list;
  }, [videoData?.taggedUsers]);

  if (videoLoading) {
    return <VideoLoadingSkeleton />;
  }

  if (videoError || !videoData?.video) {
    return <VideoNotFound />;
  }

  const { video, owner, venue, relatedVideos } = videoData;
  const canPinComments = Boolean(
    currentUser?.id && owner?.id && currentUser.id === owner.id
  );

  const ownerUsername = owner?.username ?? "player";
  const ownerName = owner?.name ?? "Player";
  const displayUsername = owner?.username ?? owner?.displayUsername ?? "player";
  const ownerImage = owner?.image ?? null;

  const handleSubscribeToggle = () => {
    setIsSubscribed(!isSubscribed);
    if (isSubscribed) {
      toast.info(`Unsubscribed from ${owner?.name || "creator"}`);
    } else {
      toast.success(`Subscribed to ${owner?.name || "creator"}`);
    }
  };

  const handleLikeToggle = () => {
    if (isDemoVideo) {
      toast.info("Demo videos are read-only.");
      return;
    }
    if (!currentUser) {
      toast.error("You must be logged in to like videos.");
      return;
    }

    const nextLiked = !hasLiked;
    const previousLikes = likesCount;
    setHasLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    toggleLike.mutate(nextLiked, {
      onError: () => {
        setHasLiked(!nextLiked);
        setLikesCount(previousLikes);
        toast.error("Could not update like status.");
      },
      onSuccess: () => {
        toast.success(
          nextLiked ? "Added to liked videos!" : "Removed from liked videos."
        );
      },
    });
  };

  const handleShare = () => {
    if (!currentUser) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Video link copied.");
      return;
    }
    setShowSharePanel((value) => !value);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoVideo) {
      toast.info("Demo comments are read-only.");
      return;
    }
    if (!currentUser) {
      toast.error("You must be logged in to comment.");
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) {
      return;
    }

    const newComment: VideoCommentRecord = {
      content: trimmed,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      isPinned: false,
      pinnedAt: null,
      user: {
        id: currentUser.id,
        image: currentUser.image ?? null,
        name: currentUser.name ?? null,
        username:
          (currentUser as { username?: string | null }).username ?? null,
      },
    };

    setCommentText("");
    try {
      commentsCollection.insert(newComment);
      toast.success("Comment sent!");
    } catch {
      toast.error("Failed to post comment. Please try again.");
    }
  };

  const handlePinComment = (commentId: string, pinned: boolean) => {
    try {
      commentsCollection.update(commentId, (draft) => {
        draft.isPinned = pinned;
        draft.pinnedAt = pinned ? new Date().toISOString() : null;
      });
      toast.success(pinned ? "Comment pinned." : "Comment unpinned.");
    } catch {
      toast.error("Could not update pinned comment.");
    }
  };

  const posterUrl =
    video.thumbnailUrl ??
    (video.muxPlaybackId
      ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.webp?time=1`
      : undefined);

  const shareHref =
    typeof window === "undefined"
      ? `/videos/${getVideoSlug(video)}`
      : `${window.location.origin}/videos/${getVideoSlug(video)}`;

  let subscriptionLabel = "Subscribe";
  if (isDemoVideo) {
    subscriptionLabel = "Demo creator";
  } else if (isSubscribed) {
    subscriptionLabel = "Subscribed";
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-4rem)]">
      {/* Primary Video & Content Stage */}
      <main className="flex-1 min-w-0 p-4 lg:p-6 space-y-6 overflow-y-auto">
        {/* Top bar with Back and Expand Chat */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Home
          </Link>

          {!isChatOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChatOpen(true)}
              className="gap-2 rounded-full text-xs font-bold h-8 px-3"
            >
              <MessageSquare className="size-3.5" />
              <span>Chat ({comments.length})</span>
              <PanelRightOpen className="size-3.5 ml-1" />
            </Button>
          )}
        </div>

        {/* Video Canvas Container */}
        <div className="space-y-3">
          <div className="relative aspect-video w-full max-h-[70vh] bg-black rounded-2xl overflow-hidden shadow-2xl border border-border/40">
            {video.muxPlaybackId ? (
              <SponsoredPlayer
                adContext={{
                  city: venue?.city ?? null,
                  state: venue?.state ?? null,
                  venueId: video.venueId ?? null,
                }}
                poster={posterUrl}
                playbackId={video.muxPlaybackId}
                title={video.title}
                videoId={video.id}
                viewerId={currentUser?.id}
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,hsl(142_100%_18%/.45),transparent_65%)] px-6 text-center text-white">
                <VideoIcon className="size-14 text-[#bcdf21]" />
                <div className="space-y-1">
                  <p className="font-extrabold text-base">
                    Demo video playback
                  </p>
                  <p className="max-w-md text-xs text-white/70 leading-relaxed">
                    This exercises the real Twitch-style layout. Live Mux
                    playback stream activates once encoded.
                  </p>
                </div>
              </div>
            )}

            {video.status !== "ready" && (
              <div className="absolute top-3 left-3">
                <p className="rounded-full bg-yellow-500/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black shadow-lg">
                  Mux processing
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Video Metadata Header (Twitch Style) */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-black leading-tight tracking-tight text-foreground">
              {video.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap font-medium">
              <span className="font-bold text-foreground">Pickleball</span>
              <span>•</span>
              <span>{formatDate(video.createdAt)}</span>
              {venue && (
                <>
                  <span>•</span>
                  <Link
                    to="/venues/$id"
                    params={{ id: venue.id }}
                    className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 font-semibold"
                  >
                    <MapPin className="size-3 shrink-0" />
                    <span>
                      {venue.name}
                      {venue.city || venue.state
                        ? ` (${[venue.city, venue.state].filter(Boolean).join(", ")})`
                        : ""}
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Creator Profile and Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-y border-border/50">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/players/$username"
                params={{ username: ownerUsername }}
                className="size-11 rounded-full border border-primary/20 bg-muted overflow-hidden flex items-center justify-center font-bold text-base cursor-pointer shrink-0"
              >
                <Avatar image={ownerImage} label={ownerName} />
              </Link>
              <div className="min-w-0">
                <Link
                  to="/players/$username"
                  params={{ username: ownerUsername }}
                  className="font-extrabold text-sm text-foreground hover:text-primary transition-colors truncate block"
                >
                  {ownerName}
                </Link>
                <span className="text-xs text-muted-foreground truncate block">
                  @{displayUsername}
                </span>
              </div>
              <Button
                disabled={isDemoVideo}
                onClick={handleSubscribeToggle}
                variant={isSubscribed ? "secondary" : "default"}
                className="rounded-full text-xs font-bold px-4 h-8 ml-2"
              >
                {subscriptionLabel}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                disabled={isDemoVideo}
                onClick={handleLikeToggle}
                variant={hasLiked ? "secondary" : "outline"}
                className={`rounded-full gap-1.5 text-xs font-bold h-9 px-4 transition-all ${
                  hasLiked ? "text-primary border-primary/40 bg-primary/10" : ""
                }`}
                title={hasLiked ? "Unlike video" : "Like video"}
              >
                <ThumbsUp
                  className={`size-4 ${hasLiked ? "fill-current" : ""}`}
                />
                <span>{likesCount}</span>
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="rounded-full gap-1.5 text-xs font-bold h-9 px-4"
              >
                <Share2 className="size-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>

          {showSharePanel && (
            <VideoSharePanel
              href={shareHref}
              onClose={() => setShowSharePanel(false)}
              videoId={rawVideoId}
            />
          )}

          {/* Video Description Card */}
          <Card className="border border-border/40 bg-muted/30 rounded-xl overflow-hidden shadow-sm">
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line font-medium">
                {video.description || "No description provided for this video."}
              </p>

              {safeTaggedUsers.length > 0 && (
                <div className="pt-3 border-t border-border/30 space-y-2">
                  <p className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                    <Users className="size-3.5 text-muted-foreground" />
                    In this video
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {safeTaggedUsers.map((u) => (
                      <Link
                        key={u.id}
                        to="/players/$username"
                        params={{ username: u.username || "player" }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-background hover:bg-accent border border-border hover:border-primary/30 rounded-full text-[11px] font-semibold text-foreground hover:text-primary transition-all shadow-sm"
                      >
                        <Avatar image={u.image} label={u.name ?? "U"} />
                        <span>@{u.username || u.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended Videos Grid */}
          <RecommendedShelf videos={relatedVideos ?? []} />
        </div>
      </main>

      {/* Twitch-style Chat Sidebar */}
      <ChatSidebar
        commentsList={sortedComments as VideoCommentWithUser[]}
        commentsLoading={commentsLoading}
        currentUser={currentUser ?? null}
        commentText={commentText}
        setCommentText={setCommentText}
        handleAddComment={handleAddComment}
        handlePinComment={handlePinComment}
        canPinComments={canPinComments}
        isReadOnly={isDemoVideo}
        isOpen={isChatOpen}
        onToggleOpen={() => setIsChatOpen(false)}
      />
    </div>
  );
}
