import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { useParams, Link, createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  Video as VideoIcon,
  MapPin,
  ThumbsUp,
  Share2,
  Play,
  Pin,
  Users,
  X,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  useVideo,
  useVideoComments,
  useAddVideoComment,
  useFriends,
  usePinVideoComment,
  useShareEntity,
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
  description?: string | null;
  thumbnailUrl?: string | null;
  muxPlaybackId?: string | null;
  durationSeconds?: number | null;
  status?: string;
  createdAt: string | Date;
  venueId?: string | null;
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
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
      {image ? (
        <img alt="" className="size-full object-cover" src={image} />
      ) : (
        label.at(0)?.toUpperCase()
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
    month: "long",
    year: "numeric",
  }).format(new Date(value));

function VideoLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8 animate-pulse">
      <div className="h-6 w-32 bg-muted rounded" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="aspect-video w-full bg-muted rounded-xl" />
          <div className="h-8 w-2/3 bg-muted rounded" />
          <div className="h-12 w-full bg-muted rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-6 w-40 bg-muted rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-20 w-32 bg-muted rounded-lg shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center space-y-4">
      <h2 className="text-2xl font-bold text-destructive animate-bounce">
        Video not found
      </h2>
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

interface VideoMetaHeaderProps {
  video: {
    title: string;
    description: string | null;
    createdAt: string | Date;
    venueId: string | null;
  };
  owner: {
    name: string;
    username: string | null;
    displayUsername: string | null;
    image: string | null;
  } | null;
  isSubscribed: boolean;
  likesCount: number;
  hasLiked: boolean;
  handleSubscribeToggle: () => void;
  handleLikeToggle: () => void;
  handleShare: () => void;
  isDemo: boolean;
  venue?: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  } | null;
  taggedUsers?:
    | {
        id: string;
        name: string | null;
        username: string | null;
        image: string | null;
      }[]
    | null;
}

// oxlint-disable-next-line complexity
function VideoMetaHeader({
  video,
  owner,
  isSubscribed,
  likesCount,
  hasLiked,
  handleSubscribeToggle,
  handleLikeToggle,
  handleShare,
  isDemo,
  venue,
  taggedUsers,
}: VideoMetaHeaderProps) {
  const ownerUsername = owner?.username ?? "player";
  const ownerName = owner?.name ?? "Player";
  const displayUsername = owner?.username ?? owner?.displayUsername ?? "player";
  const ownerImage = owner?.image ?? null;
  const initialLetter = ownerName.at(0) || "P";
  const videoDescription =
    video.description || "No description provided for this video.";
  let subscriptionLabel = "Subscribe";
  if (isDemo) {
    subscriptionLabel = "Demo creator";
  } else if (isSubscribed) {
    subscriptionLabel = "Subscribed";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-black leading-tight tracking-tight">
        {video.title}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Link
            to="/players/$username"
            params={{ username: ownerUsername }}
            className="size-12 rounded-full border border-primary/20 bg-muted overflow-hidden flex items-center justify-center font-bold text-lg cursor-pointer shrink-0"
          >
            {ownerImage ? (
              <img
                src={ownerImage}
                alt={ownerName}
                className="size-full object-cover"
              />
            ) : (
              initialLetter
            )}
          </Link>
          <div className="min-w-0">
            <Link
              to="/players/$username"
              params={{ username: ownerUsername }}
              className="font-extrabold text-sm text-foreground hover:text-primary transition-colors truncate block"
            >
              {ownerName}
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                @{displayUsername}
              </span>
              {venue && (
                <>
                  <span className="text-muted-foreground/40 text-[10px]">
                    •
                  </span>
                  <Link
                    to="/venues/$id"
                    params={{ id: venue.id }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 font-semibold animate-pulse-subtle"
                  >
                    <MapPin className="size-3 shrink-0" />
                    <span>{venue.name}</span>
                  </Link>
                </>
              )}
            </div>
          </div>
          <Button
            disabled={isDemo}
            onClick={handleSubscribeToggle}
            variant={isSubscribed ? "secondary" : "default"}
            className="rounded-full text-xs font-bold px-5 h-9 ml-4"
          >
            {subscriptionLabel}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={isDemo}
            onClick={handleLikeToggle}
            variant={hasLiked ? "secondary" : "outline"}
            className={`rounded-full gap-2 text-xs font-bold h-9 px-4 ${
              hasLiked ? "text-primary border-primary/30" : ""
            }`}
          >
            <ThumbsUp className={`size-4 ${hasLiked ? "fill-current" : ""}`} />
            <span>{likesCount}</span>
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            className="rounded-full gap-2 text-xs font-bold h-9 px-4"
          >
            <Share2 className="size-4" />
            Share
          </Button>
        </div>
      </div>

      <Card className="border border-border/40 bg-muted/40 rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-bold text-foreground">
            <span>1,208 views</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {videoDescription}
          </p>
          {venue && (
            <div className="flex items-center gap-1.5 text-primary pt-1 font-semibold">
              <MapPin className="size-3.5" />
              <Link
                to="/venues/$id"
                params={{ id: venue.id }}
                className="hover:underline"
              >
                {venue.name}
                {venue.city || venue.state
                  ? ` (${[venue.city, venue.state].filter(Boolean).join(", ")})`
                  : ""}
              </Link>
            </div>
          )}
          {!venue && video.venueId && (
            <div className="flex items-center gap-1 text-primary pt-1 font-medium">
              <MapPin className="size-3.5" />
              <span>Venue Location ID: {video.venueId}</span>
            </div>
          )}

          {taggedUsers && taggedUsers.length > 0 && (
            <div className="pt-3 border-t border-border/20 mt-3 space-y-2">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                In this video
              </p>
              <div className="flex flex-wrap gap-2">
                {taggedUsers.map((u) => (
                  <Link
                    key={u.id}
                    to="/players/$username"
                    params={{ username: u.username || "player" }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-background hover:bg-accent border border-border hover:border-primary/30 rounded-full text-[11px] font-semibold text-foreground hover:text-primary transition-all cursor-pointer shadow-sm"
                  >
                    <div className="size-4 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {u.image ? (
                        <img
                          src={u.image}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <Users className="size-2 text-muted-foreground" />
                      )}
                    </div>
                    <span>@{u.username || u.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface CommentsSectionProps {
  commentsList: VideoCommentWithUser[];
  commentsLoading: boolean;
  currentUser: { name: string; image?: string | null } | null;
  commentText: string;
  setCommentText: (val: string) => void;
  handleAddComment: (e: React.FormEvent) => void;
  handlePinComment: (commentId: string, pinned: boolean) => void;
  isPending: boolean;
  isPinPending: boolean;
  canPinComments: boolean;
  isReadOnly: boolean;
}

function CommentsSection({
  commentsList,
  commentsLoading,
  currentUser,
  commentText,
  setCommentText,
  handleAddComment,
  handlePinComment,
  isPending,
  isPinPending,
  canPinComments,
  isReadOnly,
}: CommentsSectionProps) {
  const renderCommentsContent = () => {
    if (commentsLoading) {
      return (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="size-9 bg-muted rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (commentsList.length > 0) {
      return (
        <div className="space-y-5">
          {commentsList.map((comment: VideoCommentWithUser) => (
            <div key={comment.id} className="flex gap-3 text-xs">
              <Link
                to="/players/$username"
                params={{ username: comment.user?.username ?? "player" }}
                className="size-9 rounded-full border border-border/30 bg-muted overflow-hidden flex items-center justify-center font-semibold text-xs cursor-pointer shrink-0"
              >
                {comment.user?.image ? (
                  <img
                    src={comment.user.image}
                    alt={comment.user.name ?? "User avatar"}
                    className="size-full object-cover"
                  />
                ) : (
                  comment.user?.name?.at(0) || "U"
                )}
              </Link>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  {comment.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      <Pin className="size-2.5" /> Pinned
                    </span>
                  )}
                  <Link
                    to="/players/$username"
                    params={{
                      username: comment.user?.username ?? "player",
                    }}
                    className="font-extrabold hover:text-primary transition-colors text-[11px]"
                  >
                    {comment.user?.name}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">
                    @{comment.user?.username || "player"}
                  </span>
                  <span className="text-[9px] text-muted-foreground">•</span>
                  <span className="text-[9px] text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-foreground leading-normal text-xs pr-4">
                  {comment.content}
                </p>
                {canPinComments && (
                  <button
                    type="button"
                    disabled={isPinPending}
                    onClick={() =>
                      handlePinComment(comment.id, !comment.isPinned)
                    }
                    className="text-[10px] font-semibold text-muted-foreground hover:text-primary disabled:opacity-50"
                  >
                    {comment.isPinned ? "Unpin comment" : "Pin comment"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="flex gap-3 text-xs">
          <div className="size-9 rounded-full bg-green-950/80 border border-green-800 text-green-400 flex items-center justify-center font-bold shrink-0">
            JD
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[11px]">John Doe</span>
              <span className="text-[10px] text-muted-foreground">
                @johndoe
              </span>
              <span className="text-[9px] text-muted-foreground">•</span>
              <span className="text-[9px] text-muted-foreground">Just now</span>
            </div>
            <p className="text-foreground leading-normal pr-4">
              Clean angle! That backhand spin was absolutely crazy. Let's play
              sometime.
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="size-9 rounded-full bg-sky-950/80 border border-sky-800 text-sky-400 flex items-center justify-center font-bold shrink-0">
            AS
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[11px]">Alice Smith</span>
              <span className="text-[10px] text-muted-foreground">@alice</span>
              <span className="text-[9px] text-muted-foreground">•</span>
              <span className="text-[9px] text-muted-foreground">
                2 hours ago
              </span>
            </div>
            <p className="text-foreground leading-normal pr-4">
              Incredible play. Which park is this? The courts look pristine!
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCommentComposer = () => {
    if (isReadOnly) {
      return (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Demo comments are read-only. Publish a real video to try likes,
            comments, and creator tools.
          </p>
        </div>
      );
    }

    if (!currentUser) {
      return (
        <div className="p-4 rounded-xl border border-border/40 bg-muted/20 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            Log in to join the conversation and comment on this video.
          </p>
          <Link to="/login">
            <Button size="sm" className="rounded-lg text-xs font-bold">
              Log In to Comment
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <form onSubmit={handleAddComment} className="flex gap-3 items-start">
        <div className="size-10 rounded-full border border-primary/20 bg-muted overflow-hidden flex items-center justify-center font-bold text-sm shrink-0">
          {currentUser.image ? (
            <img
              src={currentUser.image}
              alt={currentUser.name}
              className="size-full object-cover"
            />
          ) : (
            currentUser.name?.at(0) || "U"
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            placeholder="Add a public comment..."
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            className="border-b border-t-0 border-x-0 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 text-xs pb-2 bg-transparent"
          />
          {commentText.trim() ? (
            <div className="flex justify-end gap-2 animate-in fade-in duration-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCommentText("")}
                className="rounded-full text-xs font-semibold px-4 h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full text-xs font-semibold px-4 h-8 bg-primary text-primary-foreground"
              >
                Comment
              </Button>
            </div>
          ) : null}
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-extrabold tracking-tight">
          {commentsList.length} Comments
        </h2>
      </div>

      {renderCommentComposer()}

      {renderCommentsContent()}
    </div>
  );
}

interface VideoSidebarProps {
  otherVideos: VideoListItem[];
}

function VideoSidebar({ otherVideos }: VideoSidebarProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
        Recommended
      </h3>

      {otherVideos.length > 0 ? (
        <div className="space-y-4">
          {otherVideos.slice(0, 8).map((vid: VideoListItem) => {
            const vidThumbnail =
              vid.thumbnailUrl ??
              (vid.muxPlaybackId
                ? `https://image.mux.com/${vid.muxPlaybackId}/thumbnail.webp?time=1`
                : null);
            return (
              <Link
                key={vid.id}
                to="/videos/$id"
                params={{ id: vid.id }}
                className="flex gap-3 group/rec block cursor-pointer"
              >
                <div className="relative h-20 w-32 bg-muted rounded-lg overflow-hidden shrink-0 border border-border/50">
                  {vidThumbnail ? (
                    <img
                      src={vidThumbnail}
                      alt={vid.title}
                      className="size-full object-cover group-hover/rec:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-green-950/30">
                      <VideoIcon className="size-5 text-primary" />
                    </div>
                  )}
                  <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.2 text-[9px] text-white">
                    {formatDuration(vid.durationSeconds || 120)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="font-bold text-xs text-foreground line-clamp-2 leading-snug group-hover/rec:text-primary transition-colors">
                    {vid.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {vid.status === "ready" ? "Ready" : "Processing"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-border text-center">
          <p className="text-xs text-muted-foreground">
            No other videos available.
          </p>
        </div>
      )}
    </div>
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
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-sm">Share this video</h2>
          <p className="mt-1 text-muted-foreground text-xs">
            Send it to a friend in chat or copy the public link.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="rounded-md text-xs"
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
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {friends.length > 0 ? (
          friends.map((friend) => (
            <button
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-50"
              disabled={shareEntity.isPending}
              key={friend.id}
              onClick={() => shareWithFriend(friend)}
              type="button"
            >
              <Avatar image={friend.image} label={friend.name} />
              <span>
                <span className="block font-semibold">{friend.name}</span>
                <span className="text-muted-foreground">
                  @{friend.username ?? friend.displayUsername ?? "player"}
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-muted-foreground text-xs sm:col-span-2">
            Add friends from player profiles to share directly in chat.
          </p>
        )}
      </div>
    </section>
  );
}

// oxlint-disable-next-line complexity
function VideoDetailPage() {
  const { id } = useParams({ from: "/videos/$id" });
  const isDemoVideo = id.startsWith("demo-video-");
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;

  const {
    data: videoData,
    isLoading: videoLoading,
    error: videoError,
  } = useVideo(id);
  const { data: commentsData, isLoading: commentsLoading } = useVideoComments(
    id,
    !isDemoVideo
  );
  const addCommentMutation = useAddVideoComment(id);
  const pinCommentMutation = usePinVideoComment(id);
  const [commentText, setCommentText] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [likesCount, setLikesCount] = useState(42);
  const [hasLiked, setHasLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  if (videoLoading) {
    return <VideoLoadingSkeleton />;
  }

  if (videoError || !videoData?.video) {
    return <VideoNotFound />;
  }

  const { video, owner, venue, taggedUsers, relatedVideos } = videoData;
  const commentsList = commentsData?.comments ?? [];
  const canPinComments = Boolean(
    currentUser?.id && owner?.id && currentUser.id === owner.id
  );

  const handleSubscribeToggle = () => {
    setIsSubscribed(!isSubscribed);
    if (isSubscribed) {
      toast.info(`Unsubscribed from ${owner?.name || "creator"}`);
    } else {
      toast.success(`Subscribed to ${owner?.name || "creator"}`);
    }
  };

  const handleLikeToggle = () => {
    if (hasLiked) {
      setLikesCount(likesCount - 1);
      setHasLiked(false);
    } else {
      setLikesCount(likesCount + 1);
      setHasLiked(true);
      toast.success("Added to liked videos!");
    }
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
    if (!commentText.trim()) {
      return;
    }

    addCommentMutation.mutate(
      { content: commentText },
      {
        onError: () => {
          toast.error("Failed to post comment. Please try again.");
        },
        onSuccess: () => {
          setCommentText("");
          toast.success("Comment posted successfully!");
        },
      }
    );
  };

  const handlePinComment = (commentId: string, pinned: boolean) => {
    pinCommentMutation.mutate(
      { commentId, pinned },
      {
        onError: () => {
          toast.error("Could not update pinned comment.");
        },
        onSuccess: () => {
          toast.success(pinned ? "Comment pinned." : "Comment unpinned.");
        },
      }
    );
  };

  const handlePlayVideo = async () => {
    if (!video.muxPlaybackId) {
      return;
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await videoRef.current.play();
        } catch {
          // ignore play errors
        }
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const posterUrl =
    video.thumbnailUrl ??
    (video.muxPlaybackId
      ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.webp?time=1`
      : undefined);
  const shareHref =
    typeof window === "undefined" ? `/videos/${id}` : window.location.href;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-3.5" /> Back to Home
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black group/player shadow-lg">
            {video.muxPlaybackId ? (
              <video
                ref={videoRef}
                className="size-full object-contain cursor-pointer"
                src={`https://stream.mux.com/${video.muxPlaybackId}/medium.mp4`}
                poster={posterUrl}
                controls={isPlaying}
                onClick={handlePlayVideo}
                aria-label={video.title}
              >
                <track kind="captions" />
              </video>
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,hsl(142_100%_18%/.45),transparent_65%)] px-6 text-center text-white">
                <VideoIcon className="size-12 text-[#bcdf21]" />
                <div>
                  <p className="font-bold">Demo video preview</p>
                  <p className="mt-1 max-w-md text-xs text-white/65">
                    This card exercises the real detail layout. Playback appears
                    here after a Mux-backed video is published.
                  </p>
                </div>
              </div>
            )}

            {video.muxPlaybackId && !isPlaying && (
              <button
                type="button"
                onClick={handlePlayVideo}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-all cursor-pointer z-10 size-full border-none p-0"
                aria-label="Play video"
              >
                <div className="size-16 rounded-full bg-primary/95 text-primary-foreground flex items-center justify-center shadow-xl transform scale-100 hover:scale-110 transition-transform duration-200">
                  <Play className="size-8 fill-current ml-1" />
                </div>
              </button>
            )}

            {video.status !== "ready" && (
              <div className="absolute top-4 left-4 z-20 bg-yellow-500/90 text-black text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                Mux processing
              </div>
            )}
          </div>

          <VideoMetaHeader
            video={video}
            owner={owner ?? null}
            isSubscribed={isSubscribed}
            likesCount={likesCount}
            hasLiked={hasLiked}
            handleSubscribeToggle={handleSubscribeToggle}
            handleLikeToggle={handleLikeToggle}
            handleShare={handleShare}
            isDemo={isDemoVideo}
            venue={venue}
            taggedUsers={taggedUsers}
          />

          {showSharePanel ? (
            <VideoSharePanel
              href={shareHref}
              onClose={() => setShowSharePanel(false)}
              videoId={video.id}
            />
          ) : null}

          <CommentsSection
            commentsList={commentsList}
            commentsLoading={commentsLoading}
            currentUser={currentUser ?? null}
            commentText={commentText}
            setCommentText={setCommentText}
            handleAddComment={handleAddComment}
            handlePinComment={handlePinComment}
            isPending={addCommentMutation.isPending}
            isPinPending={pinCommentMutation.isPending}
            canPinComments={canPinComments}
            isReadOnly={isDemoVideo}
          />
        </div>

        <VideoSidebar otherVideos={relatedVideos ?? []} />
      </div>
    </div>
  );
}
