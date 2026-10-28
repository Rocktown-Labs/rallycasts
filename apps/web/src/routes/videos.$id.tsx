import { env } from "@rallycaststv/env/web";
import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import {
  useParams,
  Link,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  ChevronLeft,
  Video as VideoIcon,
  MapPin,
  ThumbsUp,
  Share2,
  Pin,
  Users,
  X,
  CornerDownRight,
  MessageCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SponsoredPlayer } from "@/components/ads/sponsored-player";
import { authClient } from "@/lib/auth-client";
import {
  useAddVideoComment,
  useFriends,
  useLikeVideo,
  usePinVideoComment,
  useFollowStatus,
  useRecordVideoView,
  useShareEntity,
  useToggleFollow,
  useUnlikeVideo,
  getVideoSlug,
  useVideo,
  useVideoComments,
  useVideoSocial,
} from "@/lib/hooks";

interface CommentUser {
  id: string;
  name: string | null;
  username: string | null;
  displayUsername?: string | null;
  image: string | null;
}

interface VideoCommentWithUser {
  id: string;
  isPinned?: boolean;
  pinnedAt?: string | Date | null;
  content: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  user: CommentUser | null;
}

interface VideoListItem {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  muxPlaybackId?: string | null;

  durationSeconds?: number | null;
  status?: string;
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
    <span className="bg-muted grid size-9 shrink-0 place-items-center overflow-hidden rounded-full">
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

const formatRelativeTime = (value: Date | string) => {
  const date = new Date(value);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (Number.isNaN(diffMs)) {
    return "recently";
  }
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return "just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  return formatDate(value);
};

function VideoLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-8 px-4 py-8">
      <div className="bg-muted h-6 w-32 rounded" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="bg-muted aspect-video w-full rounded-xl" />
          <div className="bg-muted h-8 w-2/3 rounded" />
          <div className="bg-muted h-12 w-full rounded" />
        </div>
        <div className="space-y-4">
          <div className="bg-muted h-6 w-40 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="bg-muted h-20 w-32 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="bg-muted h-4 w-full rounded" />
                <div className="bg-muted h-3 w-2/3 rounded" />
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
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-16 text-center">
      <h2 className="text-destructive animate-bounce text-2xl font-bold">
        Video not found
      </h2>
      <p className="text-muted-foreground mx-auto max-w-md text-sm">
        The video you are trying to view does not exist, has been removed, or is
        still processing.
      </p>
      <Link to="/">
        <Button variant="outline" className="mt-4 rounded-lg text-xs">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}

interface VideoMetaHeaderProps {
  video: {
    id: string;
    title: string;
    description: string | null;
    createdAt: string | Date;
    publishedAt?: string | Date | null;
    venueId: string | null;
  };
  owner: {
    id?: string | null;
    name?: string | null;
    username?: string | null;
    displayUsername?: string | null;
    image?: string | null;
  } | null;
  isSubscribed: boolean;
  isOwnChannel?: boolean;
  likesCount: number;
  hasLiked: boolean;
  viewsCount: number;
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
    | ({
        id: string;
        name?: string | null;
        username?: string | null;
        image?: string | null;
      } | null)[]
    | null;
}

// oxlint-disable-next-line complexity
function VideoMetaHeader({
  video,
  owner,
  isSubscribed,
  isOwnChannel = false,
  likesCount,
  hasLiked,
  viewsCount,
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
  let subscriptionLabel = "Follow";
  if (isDemo) {
    subscriptionLabel = "Demo creator";
  } else if (isSubscribed) {
    subscriptionLabel = "Following";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl leading-tight font-black tracking-tight md:text-2xl">
        {video.title}
      </h1>

      <div className="border-border/50 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            to="/players/$username"
            params={{ username: ownerUsername }}
            className="border-primary/20 bg-muted flex size-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border text-lg font-bold transition-transform active:scale-95"
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
              className="text-foreground hover:text-primary block truncate text-sm font-extrabold transition-colors"
            >
              {ownerName}
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs">
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
                    className="text-primary hover:text-primary/80 animate-pulse-subtle flex items-center gap-0.5 text-xs font-semibold transition-colors"
                  >
                    <MapPin className="size-3 shrink-0" />
                    <span>{venue.name}</span>
                  </Link>
                </>
              )}
            </div>
          </div>
          {isOwnChannel ? (
            <Link to="/u/studio/videos/$id" params={{ id: video.id }}>
              <Button
                variant="outline"
                className="ml-4 h-9 touch-manipulation rounded-lg px-4 text-xs font-bold transition-all select-none active:scale-[0.97]"
              >
                Manage video
              </Button>
            </Link>
          ) : (
            <Button
              disabled={isDemo}
              onClick={handleSubscribeToggle}
              variant={isSubscribed ? "secondary" : "default"}
              className="ml-4 h-9 touch-manipulation rounded-lg px-5 text-xs font-bold transition-all select-none active:scale-[0.97]"
            >
              {subscriptionLabel}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={isDemo}
            onClick={handleLikeToggle}
            variant={hasLiked ? "secondary" : "outline"}
            className={`h-9 touch-manipulation gap-2 rounded-lg px-4 text-xs font-bold transition-all select-none active:scale-[0.97] ${
              hasLiked ? "text-primary border-primary/30" : ""
            }`}
          >
            <ThumbsUp className={`size-4 ${hasLiked ? "fill-current" : ""}`} />
            <span>{likesCount.toLocaleString()}</span>
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            className="h-9 touch-manipulation gap-2 rounded-lg px-4 text-xs font-bold transition-all select-none active:scale-[0.97]"
          >
            <Share2 className="size-4" />
            Share
          </Button>
        </div>
      </div>

      <Card className="border-border/40 bg-muted/40 overflow-hidden rounded-xl border shadow-sm">
        <CardContent className="space-y-3 p-4 text-xs">
          <div className="text-foreground flex flex-wrap gap-x-4 gap-y-1 font-bold">
            <span>
              {viewsCount.toLocaleString()}{" "}
              {viewsCount === 1 ? "view" : "views"}
            </span>
            <span>{formatDate(video.publishedAt ?? video.createdAt)}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {videoDescription}
          </p>
          {venue && (
            <div className="text-primary flex items-center gap-1.5 pt-1 font-semibold">
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
            <div className="text-primary flex items-center gap-1 pt-1 font-medium">
              <MapPin className="size-3.5" />
              <span>Venue Location ID: {video.venueId}</span>
            </div>
          )}

          {taggedUsers && taggedUsers.length > 0 && (
            <div className="border-border/20 mt-3 space-y-2 border-t pt-3">
              <p className="text-foreground flex items-center gap-1.5 font-bold">
                <Users className="text-muted-foreground size-3.5" />
                In this video
              </p>
              <div className="flex flex-wrap gap-2">
                {taggedUsers
                  .filter(
                    (user): user is NonNullable<typeof user> => user !== null
                  )
                  .map((u) => (
                    <Link
                      key={u.id}
                      to="/players/$username"
                      params={{ username: u.username || "player" }}
                      className="bg-background hover:bg-accent border-border hover:border-primary/30 text-foreground hover:text-primary flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-all"
                    >
                      <div className="bg-muted flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
                        {u.image ? (
                          <img
                            src={u.image}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <Users className="text-muted-foreground size-2" />
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
  currentUser: {
    name: string;
    image?: string | null;
    username?: string | null;
  } | null;
  commentText: string;
  setCommentText: (val: string) => void;
  handleAddComment: (content: string, replyToCommentId?: string) => void;
  handlePinComment: (commentId: string, pinned: boolean) => void;
  isPending: boolean;
  isPinPending: boolean;
  canPinComments: boolean;
  isReadOnly: boolean;
}

function renderCommentContent(content: string) {
  const tokens = content.split(/(?<mention>@[a-zA-Z0-9_.-]+)/gu);
  return (
    <span>
      {tokens.map((token, index) => {
        if (token.startsWith("@")) {
          const username = token.slice(1);
          return (
            <Link
              key={index}
              to="/players/$username"
              params={{ username }}
              className="text-primary bg-primary/10 mr-0.5 inline-block rounded px-1 py-0.5 text-xs font-semibold transition-colors hover:underline"
            >
              {token}
            </Link>
          );
        }
        return <span key={index}>{token}</span>;
      })}
    </span>
  );
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
  const navigate = useNavigate();
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(
    null
  );
  const [replyText, setReplyText] = useState("");

  const handleInlineReplySubmit = (
    e: React.FormEvent,
    parentCommentId: string
  ) => {
    e.preventDefault();
    if (!replyText.trim()) {
      return;
    }
    handleAddComment(replyText, parentCommentId);
    setReplyingCommentId(null);
    setReplyText("");
  };

  const renderCommentsContent = () => {
    if (commentsLoading) {
      return (
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="bg-muted size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="bg-muted h-3 w-32 rounded" />
                <div className="bg-muted h-4 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (commentsList.length > 0) {
      return (
        <div className="space-y-5">
          {commentsList.map((comment: VideoCommentWithUser) => {
            const commentUserHandle =
              comment.user?.username ??
              comment.user?.displayUsername ??
              "player";
            const commentUserName = comment.user?.name ?? "Player";
            const isReplying = replyingCommentId === comment.id;

            return (
              <div key={comment.id} className="space-y-2">
                <div className="flex gap-3 text-xs">
                  <Link
                    to="/players/$username"
                    params={{ username: commentUserHandle }}
                    className="border-border/30 bg-muted flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border text-xs font-semibold transition-transform active:scale-95"
                  >
                    {comment.user?.image ? (
                      <img
                        src={comment.user.image}
                        alt={commentUserName}
                        className="size-full object-cover"
                      />
                    ) : (
                      commentUserName.at(0) || "P"
                    )}
                  </Link>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {comment.isPinned && (
                        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                          <Pin className="size-2.5" /> Pinned
                        </span>
                      )}
                      <Link
                        to="/players/$username"
                        params={{ username: commentUserHandle }}
                        className="hover:text-primary text-[11px] font-extrabold transition-colors"
                      >
                        {commentUserName}
                      </Link>
                      <span className="text-muted-foreground text-[10px]">
                        @{commentUserHandle}
                      </span>
                      <span className="text-muted-foreground text-[9px]">
                        •
                      </span>
                      <span className="text-muted-foreground text-[9px]">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>

                    <p className="text-foreground pr-4 text-xs leading-normal break-words">
                      {renderCommentContent(comment.content)}
                    </p>

                    <div className="flex items-center gap-3 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            toast.error("Log in to reply to comments.", {
                              action: {
                                label: "Log In",
                                onClick: () => {
                                  void navigate({ to: "/login" });
                                },
                              },
                            });
                            return;
                          }
                          if (isReplying) {
                            setReplyingCommentId(null);
                            setReplyText("");
                          } else {
                            setReplyingCommentId(comment.id);
                            setReplyText(`@${commentUserHandle} `);
                          }
                        }}
                        className="text-muted-foreground hover:text-primary inline-flex touch-manipulation items-center gap-1 text-[11px] font-semibold transition-all select-none active:scale-[0.97]"
                      >
                        <CornerDownRight className="size-3" />
                        <span>Reply</span>
                      </button>

                      {canPinComments && (
                        <button
                          type="button"
                          disabled={isPinPending}
                          onClick={() =>
                            handlePinComment(comment.id, !comment.isPinned)
                          }
                          className="text-muted-foreground hover:text-primary inline-flex touch-manipulation items-center gap-1 text-[11px] font-semibold transition-all select-none active:scale-[0.97] disabled:opacity-50"
                        >
                          <Pin className="size-3" />
                          <span>{comment.isPinned ? "Unpin" : "Pin"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isReplying && (
                  <div className="border-primary/40 animate-in fade-in-50 ml-12 space-y-2 border-l-2 pl-3.5 duration-150">
                    <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <CornerDownRight className="text-primary size-3" />
                        <span>
                          Replying to{" "}
                          <strong className="text-foreground font-semibold">
                            @{commentUserHandle}
                          </strong>
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingCommentId(null);
                          setReplyText("");
                        }}
                        className="text-muted-foreground hover:text-foreground text-[11px] font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                    <form
                      onSubmit={(e) => handleInlineReplySubmit(e, comment.id)}
                      className="flex items-center gap-2"
                    >
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to @${commentUserHandle}...`}
                        className="bg-muted/40 border-border/60 focus-visible:ring-primary text-foreground h-9 rounded-full px-3.5 text-base focus-visible:ring-1 md:text-sm"
                        enterKeyHint="send"
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isPending || !replyText.trim()}
                        className="bg-primary text-primary-foreground h-9 shrink-0 touch-manipulation rounded-full px-4 text-xs font-bold transition-all select-none active:scale-[0.97]"
                      >
                        Reply
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="text-muted-foreground border-border/40 space-y-1.5 rounded-xl border border-dashed py-10 text-center text-xs">
        <MessageCircle className="text-muted-foreground/40 mx-auto size-6" />
        <p className="text-foreground text-sm font-semibold">No comments yet</p>
        <p className="text-muted-foreground text-xs">
          Be the first to share your thoughts!
        </p>
      </div>
    );
  };

  const renderCommentComposer = () => {
    if (isReadOnly) {
      return (
        <div className="border-border/40 bg-muted/20 rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-xs">
            Demo comments are read-only. Publish a real video to try likes,
            comments, and creator tools.
          </p>
        </div>
      );
    }

    if (!currentUser) {
      return (
        <div className="border-border/40 bg-muted/20 space-y-3 rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-xs">
            Log in to join the conversation and comment on this video.
          </p>
          <Link to="/login">
            <Button
              size="sm"
              className="touch-manipulation rounded-lg text-xs font-bold transition-all select-none active:scale-[0.97]"
            >
              Log In to Comment
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!commentText.trim()) {
            return;
          }
          handleAddComment(commentText);
        }}
        className="flex items-start gap-3"
      >
        <div className="border-primary/20 bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-bold">
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
            className="focus-visible:border-primary rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 pb-2 text-base focus-visible:ring-0 md:text-sm"
            enterKeyHint="send"
          />
          {commentText.trim() ? (
            <div className="animate-in fade-in flex justify-end gap-2 duration-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCommentText("")}
                className="h-8 touch-manipulation rounded-full px-4 text-xs font-semibold transition-all select-none active:scale-[0.97]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground h-8 touch-manipulation rounded-full px-4 text-xs font-semibold transition-all select-none active:scale-[0.97]"
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
          {commentsList.length}{" "}
          {commentsList.length === 1 ? "Comment" : "Comments"}
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
      <h3 className="text-muted-foreground text-sm font-extrabold tracking-wider uppercase">
        Recommended
      </h3>

      {otherVideos.length > 0 ? (
        <div className="space-y-4">
          {otherVideos.slice(0, 8).map((vid: VideoListItem) => {
            const vidThumbnail =
              vid.thumbnailUrl ??
              (vid.muxPlaybackId
                ? `https://image.mux.com/${encodeURIComponent(vid.muxPlaybackId)}/thumbnail.webp?time=1`
                : null);
            return (
              <Link
                key={vid.id}
                to="/videos/$id"
                params={{ id: getVideoSlug(vid) }}
                className="group/rec block flex cursor-pointer gap-3"
              >
                <div className="bg-muted border-border/50 relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border">
                  {vidThumbnail ? (
                    <img
                      src={vidThumbnail}
                      alt={vid.title}
                      className="size-full object-cover transition-transform duration-300 group-hover/rec:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-green-950/30">
                      <VideoIcon className="text-primary size-5" />
                    </div>
                  )}
                  <span className="py-0.2 absolute right-1 bottom-1 rounded bg-black/80 px-1 text-[9px] text-white">
                    {formatDuration(vid.durationSeconds || 120)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="text-foreground group-hover/rec:text-primary line-clamp-2 text-xs leading-snug font-bold transition-colors">
                    {vid.title}
                  </h4>
                  <p className="text-muted-foreground text-[10px]">
                    {vid.status === "ready" ? "Ready" : "Processing"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="border-border rounded-xl border border-dashed p-4 text-center">
          <p className="text-muted-foreground text-xs">
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
    <section className="border-border bg-card rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Share this video</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Send it to a friend in chat or copy the public link.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="rounded-lg text-xs"
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
              className="border-border hover:bg-muted flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs disabled:opacity-50"
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
          <p className="border-border text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs sm:col-span-2">
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
  const navigate = useNavigate();
  const isDemoVideo = id.startsWith("demo-video-");
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;

  const {
    data: videoData,
    isLoading: videoLoading,
    error: videoError,
  } = useVideo(id);

  const { data: socialData } = useVideoSocial(id);
  const recordViewMutation = useRecordVideoView(id);
  const likeMutation = useLikeVideo(id);
  const unlikeMutation = useUnlikeVideo(id);

  const { data: commentsData, isLoading: commentsLoading } =
    useVideoComments(id);
  const addCommentMutation = useAddVideoComment(id);
  const pinCommentMutation = usePinVideoComment(id);

  const viewRecordedRef = useRef(false);
  const viewIdRef = useRef<string | null>(null);
  const watchedSecondsRef = useRef(0);
  const durationRef = useRef(0);

  useEffect(() => {
    if (!viewRecordedRef.current && id && !isDemoVideo) {
      viewRecordedRef.current = true;
      recordViewMutation.mutate(undefined, {
        onSuccess: (result) => {
          viewIdRef.current = result.viewId;
        },
      });
    }
  }, [id, isDemoVideo, recordViewMutation]);

  useEffect(
    () => () => {
      const viewId = viewIdRef.current;
      const watchedSeconds = Math.round(watchedSecondsRef.current);
      if (!(viewId && watchedSeconds > 0)) {
        return;
      }
      const completed =
        durationRef.current > 0 && watchedSeconds / durationRef.current >= 0.9;
      void (async () => {
        try {
          await fetch(
            `${env.VITE_SERVER_URL}/api/v1/videos/${encodeURIComponent(id)}/views/${encodeURIComponent(viewId)}`,
            {
              body: JSON.stringify({ completed, watchedSeconds }),
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              keepalive: true,
              method: "PATCH",
            }
          );
        } catch {
          // Watch progress is best-effort; the view itself is already counted.
        }
      })();
    },
    [id]
  );

  const [commentText, setCommentText] = useState("");
  const followStatusQuery = useFollowStatus(videoData?.owner?.id);
  const toggleFollowMutation = useToggleFollow(videoData?.owner?.id);

  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticLikesDelta, setOptimisticLikesDelta] = useState(0);
  const [showSharePanel, setShowSharePanel] = useState(false);

  const hasLiked =
    optimisticLiked === null
      ? (socialData?.hasLiked ?? false)
      : optimisticLiked;
  const likesCount = Math.max(
    0,
    (socialData?.likes ?? 0) + optimisticLikesDelta
  );
  const viewsCount = socialData?.views ?? 0;

  const rawComments = commentsData?.comments;

  const sortedComments = useMemo(
    () =>
      (rawComments ?? []).toSorted((a, b) => {
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
    [rawComments]
  );

  if (videoLoading) {
    return <VideoLoadingSkeleton />;
  }

  if (videoError || !videoData?.video) {
    return <VideoNotFound />;
  }

  const { video, owner, venue, taggedUsers, relatedVideos } = videoData;
  const isOwnChannel = Boolean(
    currentUser?.id && owner?.id && currentUser.id === owner.id
  );
  const canPinComments = isOwnChannel;

  const isSubscribed = followStatusQuery.data?.following ?? false;

  const handleSubscribeToggle = () => {
    if (isDemoVideo) {
      toast.info("Subscriptions are disabled for demo videos.");
      return;
    }
    if (!currentUser) {
      toast.error("Log in to follow this creator.", {
        action: {
          label: "Log In",
          onClick: () => {
            void navigate({ to: "/login" });
          },
        },
      });
      return;
    }
    if (!owner?.id) {
      return;
    }
    if (currentUser.id === owner.id) {
      toast.info("You cannot follow your own channel.");
      return;
    }

    toggleFollowMutation.mutate(!isSubscribed, {
      onError: () => {
        toast.error("Could not update this follow. Try again.");
      },
      onSuccess: () => {
        toast.success(
          isSubscribed
            ? `Unfollowed ${owner?.name || "creator"}`
            : `Following ${owner?.name || "creator"}`
        );
      },
    });
  };

  const handleLikeToggle = () => {
    if (isDemoVideo) {
      toast.info("Likes are disabled for demo videos.");
      return;
    }
    if (!currentUser) {
      toast.error("Log in to like this video.", {
        action: {
          label: "Log In",
          onClick: () => {
            void navigate({ to: "/login" });
          },
        },
      });
      return;
    }
    if (hasLiked) {
      setOptimisticLiked(false);
      setOptimisticLikesDelta((d) => d - 1);
      unlikeMutation.mutate(undefined, {
        onError: () => {
          setOptimisticLiked(null);
          setOptimisticLikesDelta(0);
          toast.error("Failed to update like");
        },
        onSuccess: () => {
          setOptimisticLiked(null);
          setOptimisticLikesDelta(0);
        },
      });
    } else {
      setOptimisticLiked(true);
      setOptimisticLikesDelta((d) => d + 1);
      likeMutation.mutate(undefined, {
        onError: () => {
          setOptimisticLiked(null);
          setOptimisticLikesDelta(0);
          toast.error("Failed to update like");
        },
        onSuccess: () => {
          setOptimisticLiked(null);
          setOptimisticLikesDelta(0);
          toast.success("Added to liked videos!");
        },
      });
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

  const handleAddComment = (content: string, replyToCommentId?: string) => {
    if (isDemoVideo) {
      toast.info("Demo comments are read-only.");
      return;
    }
    if (!currentUser) {
      toast.error("You must be logged in to comment.");
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    addCommentMutation.mutate(
      { content: trimmed, replyToCommentId },
      {
        onError: () => {
          toast.error("Failed to post comment. Please try again.");
        },
        onSuccess: () => {
          if (replyToCommentId) {
            toast.success("Reply posted!");
          } else {
            setCommentText("");
            toast.success("Comment posted!");
          }
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

  const posterUrl =
    video.thumbnailUrl ??
    (video.muxPlaybackId
      ? `https://image.mux.com/${encodeURIComponent(video.muxPlaybackId)}/thumbnail.webp?time=1`
      : undefined);
  const shareHref =
    typeof window === "undefined" ? `/videos/${id}` : window.location.href;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4">
      <div>
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground inline-flex touch-manipulation items-center gap-1.5 text-xs transition-colors select-none active:scale-[0.97]"
        >
          <ChevronLeft className="size-3.5" /> Back to Home
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div>
            {video.muxPlaybackId ? (
              <SponsoredPlayer
                adContext={{
                  city: venue?.city ?? null,
                  state: venue?.state ?? null,
                  venueId: video.venueId ?? null,
                }}
                onTimeUpdate={(currentTime, duration) => {
                  watchedSecondsRef.current = Math.max(
                    watchedSecondsRef.current,
                    currentTime
                  );
                  durationRef.current = duration;
                }}
                poster={posterUrl}
                playbackId={video.muxPlaybackId}
                title={video.title}
                vertical={video.mediaType === "short"}
                videoId={video.id}
                viewerId={currentUser?.id}
              />
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

            {video.status !== "ready" && (
              <p className="mt-2 inline-block rounded-full bg-yellow-500/90 px-3 py-1 text-[10px] font-extrabold tracking-wider text-black uppercase shadow">
                Mux processing
              </p>
            )}
          </div>

          <VideoMetaHeader
            video={video}
            owner={owner}
            isSubscribed={isSubscribed}
            isOwnChannel={isOwnChannel}
            likesCount={likesCount}
            hasLiked={hasLiked}
            viewsCount={viewsCount}
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
            commentsList={sortedComments as VideoCommentWithUser[]}
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
