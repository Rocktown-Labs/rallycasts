import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Maximize2,
  MessageCircle,
  Share2,
  ThumbsUp,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  useCreatePostComment,
  usePostComments,
  useTogglePostLike,
} from "@/lib/hooks/use-social";

import { formatTimeAgo, parsePostContent } from "./post-helpers";

export interface LightboxPostItem {
  author?: {
    displayUsername?: string | null;
    id: string;
    image?: string | null;
    name: string;
    username?: string | null;
  } | null;
  commentCount?: number;
  content: string;
  createdAt?: string | number | Date | null;
  id: string;
  likeCount?: number;
  liked?: boolean;
}

interface OrganizationMediaLightboxProps {
  initialImageIndex?: number;
  onClose: () => void;
  onOpenShare?: (post: LightboxPostItem) => void;
  post: LightboxPostItem;
}

interface LightboxTheaterProps {
  commentCount: number;
  currentIndex: number;
  currentImageUrl: string;
  imagesCount: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShowMobileComments: () => void;
}

const toggleFullscreen = async () => {
  try {
    await (document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen());
  } catch {
    // Fullscreen not supported or blocked by user agent
  }
};

function LightboxTheater({
  commentCount,
  currentIndex,
  currentImageUrl,
  imagesCount,
  onClose,
  onNext,
  onPrev,
  onShowMobileComments,
}: LightboxTheaterProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
      {/* Top Control Bar */}
      <header className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center gap-2">
          <button
            aria-label="Close photo view"
            className="flex size-10 items-center justify-center rounded-full transition hover:bg-white/10 active:scale-95"
            onClick={onClose}
            type="button"
          >
            <X className="size-6 text-white" />
          </button>
          {imagesCount > 1 ? (
            <span className="text-sm font-medium text-white/70">
              {currentIndex + 1} / {imagesCount}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Zoom in"
            className="flex size-9 items-center justify-center rounded-full transition hover:bg-white/10 active:scale-95"
            onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5))}
            type="button"
          >
            <ZoomIn className="size-5 text-white/80" />
          </button>
          <button
            aria-label="Zoom out"
            className="flex size-9 items-center justify-center rounded-full transition hover:bg-white/10 active:scale-95"
            onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 1))}
            type="button"
          >
            <ZoomOut className="size-5 text-white/80" />
          </button>
          <button
            aria-label="Toggle full screen"
            className="flex size-9 items-center justify-center rounded-full transition hover:bg-white/10 active:scale-95"
            onClick={toggleFullscreen}
            type="button"
          >
            <Maximize2 className="size-5 text-white/80" />
          </button>
        </div>
      </header>

      {/* The Media Display Canvas */}
      <div className="relative flex size-full items-center justify-center p-4 sm:p-8">
        {currentImageUrl ? (
          <img
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-200 select-none"
            src={currentImageUrl}
            style={{ transform: `scale(${zoomLevel})` }}
          />
        ) : (
          <div className="flex h-64 w-80 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400">
            No media available
          </div>
        )}
      </div>

      {/* Left / Right Carousel Controls */}
      {imagesCount > 1 ? (
        <>
          <button
            aria-label="Previous image"
            className="absolute left-4 z-20 flex size-12 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80 active:scale-90"
            onClick={onPrev}
            type="button"
          >
            <ChevronLeft className="size-7" />
          </button>
          <button
            aria-label="Next image"
            className="absolute right-4 z-20 flex size-12 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80 active:scale-90"
            onClick={onNext}
            type="button"
          >
            <ChevronRight className="size-7" />
          </button>
        </>
      ) : null}

      {/* Mobile Comment Toggle Button */}
      <div className="absolute bottom-4 z-20 flex md:hidden">
        <Button
          className="rounded-full shadow-lg"
          onClick={onShowMobileComments}
          size="sm"
          variant="secondary"
        >
          <MessageCircle className="mr-1.5 size-4" /> Comments ({commentCount})
        </Button>
      </div>
    </div>
  );
}

interface LightboxSidebarProps {
  authorName: string;
  authorUsername: string;
  cleanText: string;
  commentText: string;
  comments: {
    author: {
      id: string;
      image?: string | null;
      name: string;
      username?: string | null;
    };
    comment: {
      content: string;
      createdAt: string | number | Date;
      id: string;
    };
  }[];
  isLiked: boolean;
  isPending: boolean;
  likeCount: number;
  onAddComment: (event: React.FormEvent) => void;
  onCloseMobileComments: () => void;
  onCommentTextChange: (text: string) => void;
  onOpenShare?: (post: LightboxPostItem) => void;
  onToggleLike: () => void;
  post: LightboxPostItem;
  sessionUser:
    | { image?: string | null; name?: string | null }
    | null
    | undefined;
  showMobileComments: boolean;
}

function LightboxSidebar({
  authorName,
  authorUsername,
  cleanText,
  commentText,
  comments,
  isLiked,
  isPending,
  likeCount,
  onAddComment,
  onCloseMobileComments,
  onCommentTextChange,
  onOpenShare,
  onToggleLike,
  post,
  sessionUser,
  showMobileComments,
}: LightboxSidebarProps) {
  return (
    <aside
      className={`bg-card text-card-foreground fixed inset-y-0 right-0 z-30 flex w-full flex-col border-l shadow-2xl transition-transform md:relative md:w-[400px] md:translate-x-0 lg:w-[440px] ${
        showMobileComments
          ? "translate-x-0"
          : "translate-x-full md:translate-x-0"
      }`}
    >
      {/* Mobile Sidebar Close */}
      <header className="flex items-center justify-between border-b p-3 md:hidden">
        <span className="font-bold">Post and Comments</span>
        <button
          aria-label="Close comments"
          className="p-1"
          onClick={onCloseMobileComments}
          type="button"
        >
          <X className="size-5" />
        </button>
      </header>

      {/* Author Header */}
      <section className="flex items-start justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Link
            className="ring-border block size-11 overflow-hidden rounded-full ring-2"
            params={{ username: authorUsername }}
            to="/players/$username"
          >
            {post.author?.image ? (
              <img
                alt=""
                className="size-full object-cover"
                src={post.author.image}
              />
            ) : (
              <div className="bg-primary/20 text-primary grid size-full place-items-center font-bold">
                {authorName[0]}
              </div>
            )}
          </Link>
          <div>
            <Link
              className="font-bold hover:underline"
              params={{ username: authorUsername }}
              to="/players/$username"
            >
              {authorName}
            </Link>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span>{formatTimeAgo(post.createdAt)}</span>
              <span>•</span>
              <Globe className="size-3" />
            </p>
          </div>
        </div>
      </section>

      {/* Post Caption */}
      {cleanText ? (
        <section className="border-b p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {cleanText}
        </section>
      ) : null}

      {/* Engagement Stats Bar */}
      <section className="text-muted-foreground flex items-center justify-between border-b px-4 py-2.5 text-xs">
        <div className="flex items-center gap-1">
          <div className="bg-primary grid size-4 place-items-center rounded-full text-[10px] text-white">
            🎾
          </div>
          <span>{likeCount} likes</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{comments.length || (post.commentCount ?? 0)} comments</span>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="grid grid-cols-3 border-b p-1">
        <button
          className={`hover:bg-muted flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition active:scale-95 ${
            isLiked ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={onToggleLike}
          type="button"
        >
          <ThumbsUp className={`size-4 ${isLiked ? "fill-current" : ""}`} />
          <span>Like</span>
        </button>
        <button
          className="hover:bg-muted text-muted-foreground flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition active:scale-95"
          onClick={() => {
            const inputEl = document.querySelector<HTMLInputElement>(
              `#lightbox-comment-input-${post.id}`
            );
            inputEl?.focus();
          }}
          type="button"
        >
          <MessageCircle className="size-4" />
          <span>Comment</span>
        </button>
        <button
          className="hover:bg-muted text-muted-foreground flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition active:scale-95"
          onClick={() => onOpenShare?.(post)}
          type="button"
        >
          <Share2 className="size-4" />
          <span>Share</span>
        </button>
      </section>

      {/* Comments Scrollable List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted text-muted-foreground mb-3 grid size-12 place-items-center rounded-full">
              <MessageCircle className="size-6" />
            </div>
            <p className="font-semibold">No comments yet</p>
            <p className="text-muted-foreground text-xs">
              Be the first to share your thoughts on this match!
            </p>
          </div>
        ) : (
          comments.map((commentRow) => (
            <article
              className="flex gap-2.5 text-sm"
              key={commentRow.comment.id}
            >
              <Link
                className="size-8 shrink-0 overflow-hidden rounded-full"
                params={{
                  username: commentRow.author.username ?? "player",
                }}
                to="/players/$username"
              >
                {commentRow.author.image ? (
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={commentRow.author.image}
                  />
                ) : (
                  <div className="bg-primary/20 text-primary grid size-full place-items-center text-xs font-bold">
                    {commentRow.author.name[0]}
                  </div>
                )}
              </Link>
              <div className="flex-1">
                <div className="bg-muted/60 rounded-2xl px-3.5 py-2">
                  <Link
                    className="text-xs font-bold hover:underline"
                    params={{
                      username: commentRow.author.username ?? "player",
                    }}
                    to="/players/$username"
                  >
                    {commentRow.author.name}
                  </Link>
                  <p className="mt-0.5 text-xs whitespace-pre-wrap">
                    {commentRow.comment.content}
                  </p>
                </div>
                <span className="text-muted-foreground ml-3 text-[10px]">
                  {formatTimeAgo(commentRow.comment.createdAt)}
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Comment Composer Input Box */}
      <form className="bg-card border-t p-3" onSubmit={onAddComment}>
        <div className="flex items-center gap-2">
          <div className="size-8 shrink-0 overflow-hidden rounded-full bg-neutral-800">
            {sessionUser?.image ? (
              <img
                alt=""
                className="size-full object-cover"
                src={sessionUser.image}
              />
            ) : (
              <div className="bg-primary/20 text-primary grid size-full place-items-center text-xs font-bold">
                {sessionUser?.name?.[0] ?? "U"}
              </div>
            )}
          </div>
          <Input
            className="h-9 flex-1 rounded-full text-xs"
            id={`lightbox-comment-input-${post.id}`}
            onChange={(e) => onCommentTextChange(e.target.value)}
            placeholder={`Comment as ${sessionUser?.name ?? "player"}...`}
            value={commentText}
          />
          <Button
            className="h-9 rounded-full px-4 text-xs font-semibold"
            disabled={!commentText.trim() || isPending}
            type="submit"
          >
            Post
          </Button>
        </div>
      </form>
    </aside>
  );
}

export function OrganizationMediaLightbox({
  initialImageIndex = 0,
  onClose,
  onOpenShare,
  post,
}: OrganizationMediaLightboxProps) {
  const { data: session } = authClient.useSession();
  const { images, cleanText } = parsePostContent(post.content);
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialImageIndex, Math.max(0, images.length - 1))
  );
  const [isLiked, setIsLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [commentText, setCommentText] = useState("");
  const [showMobileComments, setShowMobileComments] = useState(false);

  const { data: commentsData } = usePostComments(post.id);
  const createCommentMutation = useCreatePostComment(post.id);
  const toggleLikeMutation = useTogglePostLike(post.id);

  // Close on Escape, navigate with Left/Right arrows
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (event.key === "ArrowRight" && images.length > 1) {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  const handleToggleLike = () => {
    if (!session?.user) {
      toast.error("Please sign in to like this post.");
      return;
    }
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    toggleLikeMutation.mutate({ isLiked });
  };

  const handleAddComment = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) {
      return;
    }
    if (!session?.user) {
      toast.error("Please sign in to comment.");
      return;
    }
    createCommentMutation.mutate(
      { content: trimmed },
      {
        onSuccess: () => {
          setCommentText("");
          toast.success("Comment posted");
        },
      }
    );
  };

  const currentImageUrl = images[currentIndex] ?? "";
  const authorName = post.author?.name ?? "Pickleball Player";
  const authorUsername = post.author?.username ?? "player";
  const comments = commentsData?.comments ?? [];

  return (
    <dialog
      aria-label="Media lightbox"
      className="fixed inset-0 z-50 flex size-full bg-black/95 p-0 text-white backdrop-blur-md"
      open
    >
      <LightboxTheater
        commentCount={comments.length || (post.commentCount ?? 0)}
        currentIndex={currentIndex}
        currentImageUrl={currentImageUrl}
        imagesCount={images.length}
        onClose={onClose}
        onNext={() =>
          setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
        }
        onPrev={() =>
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
        }
        onShowMobileComments={() => setShowMobileComments(true)}
      />

      <LightboxSidebar
        authorName={authorName}
        authorUsername={authorUsername}
        cleanText={cleanText}
        commentText={commentText}
        comments={comments}
        isLiked={isLiked}
        isPending={createCommentMutation.isPending}
        likeCount={likeCount}
        onAddComment={handleAddComment}
        onCloseMobileComments={() => setShowMobileComments(false)}
        onCommentTextChange={setCommentText}
        onOpenShare={onOpenShare}
        onToggleLike={handleToggleLike}
        post={post}
        sessionUser={session?.user}
        showMobileComments={showMobileComments}
      />
    </dialog>
  );
}
