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
  useRecordVideoView,
  useShareEntity,
  useUnlikeVideo,
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
        <Button variant="outline" className="rounded-lg text-xs mt-4">
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
            className="size-12 rounded-full border border-primary/20 bg-muted overflow-hidden flex items-center justify-center font-bold text-lg cursor-pointer shrink-0 active:scale-95 transition-transform"
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
          {isOwnChannel ? (
            <Link to="/u/studio/videos/$id" params={{ id: video.id }}>
              <Button
                variant="outline"
                className="rounded-lg text-xs font-bold px-4 h-9 ml-4 active:scale-[0.97] transition-all touch-manipulation select-none"
              >
                Manage video
              </Button>
            </Link>
          ) : (
            <Button
              disabled={isDemo}
              onClick={handleSubscribeToggle}
              variant={isSubscribed ? "secondary" : "default"}
              className="rounded-lg text-xs font-bold px-5 h-9 ml-4 active:scale-[0.97] transition-all touch-manipulation select-none"
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
            className={`rounded-lg gap-2 text-xs font-bold h-9 px-4 active:scale-[0.97] transition-all touch-manipulation select-none ${
              hasLiked ? "text-primary border-primary/30" : ""
            }`}
          >
            <ThumbsUp className={`size-4 ${hasLiked ? "fill-current" : ""}`} />
            <span>{likesCount.toLocaleString()}</span>
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            className="rounded-lg gap-2 text-xs font-bold h-9 px-4 active:scale-[0.97] transition-all touch-manipulation select-none"
          >
            <Share2 className="size-4" />
            Share
          </Button>
        </div>
      </div>

      <Card className="border border-border/40 bg-muted/40 rounded-xl overflow-hidden shadow-sm">
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-bold text-foreground">
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
                {taggedUsers
                  .filter(
                    (user): user is NonNullable<typeof user> => user !== null
                  )
                  .map((u) => (
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
  const tokens = content.split(/(@[a-zA-Z0-9_.-]+)/gu);
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
              className="inline-block font-semibold text-primary hover:underline bg-primary/10 rounded px-1 py-0.5 mr-0.5 text-xs transition-colors"
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
                    className="size-9 rounded-full border border-border/30 bg-muted overflow-hidden flex items-center justify-center font-semibold text-xs cursor-pointer shrink-0 active:scale-95 transition-transform"
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
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {comment.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                          <Pin className="size-2.5" /> Pinned
                        </span>
                      )}
                      <Link
                        to="/players/$username"
                        params={{ username: commentUserHandle }}
                        className="font-extrabold hover:text-primary transition-colors text-[11px]"
                      >
                        {commentUserName}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">
                        @{commentUserHandle}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        •
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>

                    <p className="text-foreground leading-normal text-xs pr-4 break-words">
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
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary active:scale-[0.97] transition-all touch-manipulation select-none"
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
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary active:scale-[0.97] transition-all touch-manipulation select-none disabled:opacity-50"
                        >
                          <Pin className="size-3" />
                          <span>{comment.isPinned ? "Unpin" : "Pin"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isReplying && (
                  <div className="ml-12 pl-3.5 border-l-2 border-primary/40 space-y-2 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CornerDownRight className="size-3 text-primary" />
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
                      className="flex gap-2 items-center"
                    >
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to @${commentUserHandle}...`}
                        className="text-base md:text-sm h-9 rounded-full bg-muted/40 border-border/60 focus-visible:ring-1 focus-visible:ring-primary px-3.5 text-foreground"
                        enterKeyHint="send"
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isPending || !replyText.trim()}
                        className="h-9 rounded-full px-4 text-xs font-bold active:scale-[0.97] transition-all touch-manipulation select-none shrink-0 bg-primary text-primary-foreground"
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
      <div className="py-10 text-center text-muted-foreground text-xs space-y-1.5 rounded-xl border border-dashed border-border/40">
        <MessageCircle className="size-6 mx-auto text-muted-foreground/40" />
        <p className="font-semibold text-foreground text-sm">No comments yet</p>
        <p className="text-muted-foreground text-xs">
          Be the first to share your thoughts!
        </p>
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
            <Button
              size="sm"
              className="rounded-lg text-xs font-bold active:scale-[0.97] transition-all touch-manipulation select-none"
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
        className="flex gap-3 items-start"
      >
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
            className="border-b border-t-0 border-x-0 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 text-base md:text-sm pb-2 bg-transparent"
            enterKeyHint="send"
          />
          {commentText.trim() ? (
            <div className="flex justify-end gap-2 animate-in fade-in duration-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCommentText("")}
                className="rounded-full text-xs font-semibold px-4 h-8 active:scale-[0.97] transition-all touch-manipulation select-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full text-xs font-semibold px-4 h-8 bg-primary text-primary-foreground active:scale-[0.97] transition-all touch-manipulation select-none"
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
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
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
  useEffect(() => {
    if (!viewRecordedRef.current && id && !isDemoVideo) {
      viewRecordedRef.current = true;
      recordViewMutation.mutate();
    }
  }, [id, isDemoVideo, recordViewMutation]);

  const [commentText, setCommentText] = useState("");
  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<string[]>(
    () => {
      if (typeof window === "undefined" || !currentUser?.id) {
        return [];
      }
      try {
        const stored = localStorage.getItem(
          `rallycasts_subscriptions_${currentUser.id}`
        );
        return stored ? (JSON.parse(stored) as string[]) : [];
      } catch {
        return [];
      }
    }
  );

  useEffect(() => {
    if (!currentUser?.id) {
      setSubscribedCreatorIds([]);
      return;
    }
    try {
      const stored = localStorage.getItem(
        `rallycasts_subscriptions_${currentUser.id}`
      );
      setSubscribedCreatorIds(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      setSubscribedCreatorIds([]);
    }
  }, [currentUser?.id]);

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

  const isSubscribed = Boolean(
    currentUser?.id && owner?.id && subscribedCreatorIds.includes(owner.id)
  );

  const handleSubscribeToggle = () => {
    if (isDemoVideo) {
      toast.info("Subscriptions are disabled for demo videos.");
      return;
    }
    if (!currentUser) {
      toast.error("Log in to subscribe to this channel.", {
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
      toast.info("You cannot subscribe to your own channel.");
      return;
    }

    const nextSubscribed = !isSubscribed;
    const nextList = nextSubscribed
      ? [...subscribedCreatorIds, owner.id]
      : subscribedCreatorIds.filter((cid) => cid !== owner.id);

    setSubscribedCreatorIds(nextList);
    try {
      localStorage.setItem(
        `rallycasts_subscriptions_${currentUser.id}`,
        JSON.stringify(nextList)
      );
    } catch {
      // ignore localStorage errors
    }

    if (nextSubscribed) {
      toast.success(`Subscribed to ${owner?.name || "creator"}`);
    } else {
      toast.info(`Unsubscribed from ${owner?.name || "creator"}`);
    }
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
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-[0.97] touch-manipulation select-none"
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
                poster={posterUrl}
                playbackId={video.muxPlaybackId}
                title={video.title}
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
              <p className="mt-2 inline-block rounded-full bg-yellow-500/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-black shadow">
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
