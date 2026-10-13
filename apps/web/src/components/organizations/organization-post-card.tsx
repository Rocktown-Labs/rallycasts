import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Link } from "@tanstack/react-router";
import {
  Globe,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  useCreatePostComment,
  usePostComments,
  useTogglePostLike,
} from "@/lib/hooks/use-social";

import type { LightboxPostItem } from "./organization-media-lightbox";
import { formatTimeAgo, parsePostContent } from "./post-helpers";

interface OrganizationPostCardProps {
  onOpenLightbox: (post: LightboxPostItem, initialImageIndex: number) => void;
  onOpenShare: (post: LightboxPostItem) => void;
  post: LightboxPostItem;
}

interface PostMediaCollageProps {
  images: string[];
  onOpenLightbox: (initialIndex: number) => void;
}

function PostMediaCollage({ images, onOpenLightbox }: PostMediaCollageProps) {
  if (images.length === 1) {
    return (
      <button
        aria-label="View photo"
        className="flex max-h-[520px] w-full cursor-pointer items-center justify-center overflow-hidden border-0 bg-transparent p-0"
        onClick={() => onOpenLightbox(0)}
        type="button"
      >
        <img
          alt=""
          className="size-full max-h-[520px] object-cover transition hover:opacity-95"
          src={images[0]}
        />
      </button>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid max-h-[420px] grid-cols-2 gap-1">
        {images.map((imgUrl, idx) => (
          <button
            aria-label={`View photo ${idx + 1}`}
            className="h-[360px] cursor-pointer overflow-hidden border-0 bg-transparent p-0"
            key={imgUrl}
            onClick={() => onOpenLightbox(idx)}
            type="button"
          >
            <img
              alt=""
              className="size-full object-cover transition hover:scale-105"
              src={imgUrl}
            />
          </button>
        ))}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="grid max-h-[460px] grid-cols-2 gap-1">
        <button
          aria-label="View photo 1"
          className="col-span-2 h-[240px] cursor-pointer overflow-hidden border-0 bg-transparent p-0"
          onClick={() => onOpenLightbox(0)}
          type="button"
        >
          <img
            alt=""
            className="size-full object-cover transition hover:opacity-95"
            src={images[0]}
          />
        </button>
        <button
          aria-label="View photo 2"
          className="h-[180px] cursor-pointer overflow-hidden border-0 bg-transparent p-0"
          onClick={() => onOpenLightbox(1)}
          type="button"
        >
          <img
            alt=""
            className="size-full object-cover transition hover:opacity-95"
            src={images[1]}
          />
        </button>
        <button
          aria-label="View photo 3"
          className="h-[180px] cursor-pointer overflow-hidden border-0 bg-transparent p-0"
          onClick={() => onOpenLightbox(2)}
          type="button"
        >
          <img
            alt=""
            className="size-full object-cover transition hover:opacity-95"
            src={images[2]}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="grid max-h-[460px] grid-cols-2 gap-1">
      <button
        aria-label="View photo 1"
        className="h-[200px] cursor-pointer overflow-hidden border-0 bg-transparent p-0"
        onClick={() => onOpenLightbox(0)}
        type="button"
      >
        <img
          alt=""
          className="size-full object-cover transition hover:opacity-95"
          src={images[0]}
        />
      </button>
      <button
        aria-label="View photo 2"
        className="h-[200px] cursor-pointer overflow-hidden border-0 bg-transparent p-0"
        onClick={() => onOpenLightbox(1)}
        type="button"
      >
        <img
          alt=""
          className="size-full object-cover transition hover:opacity-95"
          src={images[1]}
        />
      </button>
      <button
        aria-label="View photo 3"
        className="h-[200px] cursor-pointer overflow-hidden border-0 bg-transparent p-0"
        onClick={() => onOpenLightbox(2)}
        type="button"
      >
        <img
          alt=""
          className="size-full object-cover transition hover:opacity-95"
          src={images[2]}
        />
      </button>
      <button
        aria-label="View photo 4"
        className="relative h-[200px] cursor-pointer overflow-hidden border-0 bg-transparent p-0"
        onClick={() => onOpenLightbox(3)}
        type="button"
      >
        <img alt="" className="size-full object-cover" src={images[3]} />
        {images.length > 4 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-black tracking-wider text-white backdrop-blur-xs transition hover:bg-black/50">
            +{images.length - 3}
          </div>
        ) : null}
      </button>
    </div>
  );
}

interface PostCommentsSectionProps {
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
  commentText: string;
  isPending: boolean;
  onAddComment: (event: React.FormEvent) => void;
  onCommentTextChange: (text: string) => void;
  postId: string;
  sessionUser:
    | { image?: string | null; name?: string | null }
    | null
    | undefined;
}

function PostCommentsSection({
  comments,
  commentText,
  isPending,
  onAddComment,
  onCommentTextChange,
  postId,
  sessionUser,
}: PostCommentsSectionProps) {
  return (
    <div className="bg-muted/15 space-y-3 p-4">
      {comments.map((commentRow) => (
        <article className="flex gap-2.5 text-sm" key={commentRow.comment.id}>
          <Link
            className="mt-0.5 size-7 shrink-0 overflow-hidden rounded-full"
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
              <div className="bg-primary/20 text-primary grid size-full place-items-center text-[10px] font-bold">
                {commentRow.author.name[0]}
              </div>
            )}
          </Link>
          <div className="flex-1">
            <div className="bg-muted/70 rounded-2xl px-3.5 py-2">
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
      ))}

      <form className="flex items-center gap-2 pt-1" onSubmit={onAddComment}>
        <div className="size-7 shrink-0 overflow-hidden rounded-full bg-neutral-800">
          {sessionUser?.image ? (
            <img
              alt=""
              className="size-full object-cover"
              src={sessionUser.image}
            />
          ) : (
            <div className="bg-primary/20 text-primary grid size-full place-items-center text-[10px] font-bold">
              {sessionUser?.name?.[0] ?? "U"}
            </div>
          )}
        </div>
        <Input
          className="h-8 flex-1 rounded-full text-xs"
          id={`feed-comment-input-${postId}`}
          onChange={(e) => onCommentTextChange(e.target.value)}
          placeholder={`Comment as ${sessionUser?.name ?? "player"}...`}
          value={commentText}
        />
        <Button
          className="h-8 rounded-full px-3 text-xs"
          disabled={!commentText.trim() || isPending}
          size="sm"
          type="submit"
        >
          Post
        </Button>
      </form>
    </div>
  );
}

interface PostCardHeaderProps {
  authorImage?: string | null;
  authorName: string;
  authorUsername: string;
  createdAt?: string | number | Date | null;
  onOpenShare: () => void;
}

function PostCardHeader({
  authorImage,
  authorName,
  authorUsername,
  createdAt,
  onOpenShare,
}: PostCardHeaderProps) {
  return (
    <header className="flex items-start justify-between p-4 pb-3">
      <div className="flex items-center gap-3">
        <Link
          className="ring-border block size-10 shrink-0 overflow-hidden rounded-full ring-1"
          params={{ username: authorUsername }}
          to="/players/$username"
        >
          {authorImage ? (
            <img alt="" className="size-full object-cover" src={authorImage} />
          ) : (
            <div className="bg-primary/20 text-primary grid size-full place-items-center text-xs font-bold">
              {authorName[0]}
            </div>
          )}
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              className="text-sm font-bold hover:underline"
              params={{ username: authorUsername }}
              to="/players/$username"
            >
              {authorName}
            </Link>
          </div>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            <span>{formatTimeAgo(createdAt)}</span>
            <span>•</span>
            <Globe className="size-3" />
          </p>
        </div>
      </div>

      <button
        aria-label="Post options"
        className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full transition"
        onClick={onOpenShare}
        type="button"
      >
        <MoreHorizontal className="size-4" />
      </button>
    </header>
  );
}

interface PostCardActionsRowProps {
  isLiked: boolean;
  onCommentClick: () => void;
  onOpenShare: () => void;
  onToggleLike: () => void;
}

function PostCardActionsRow({
  isLiked,
  onCommentClick,
  onOpenShare,
  onToggleLike,
}: PostCardActionsRowProps) {
  return (
    <div className="border-border/40 grid grid-cols-3 border-b p-1">
      <button
        className={`hover:bg-muted flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition active:scale-95 ${
          isLiked ? "text-primary" : "text-muted-foreground"
        }`}
        onClick={onToggleLike}
        type="button"
      >
        <ThumbsUp className={`size-4 ${isLiked ? "fill-current" : ""}`} />
        <span>Like</span>
      </button>
      <button
        className="hover:bg-muted text-muted-foreground flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition active:scale-95"
        onClick={onCommentClick}
        type="button"
      >
        <MessageCircle className="size-4" />
        <span>Comment</span>
      </button>
      <button
        className="hover:bg-muted text-muted-foreground flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition active:scale-95"
        onClick={onOpenShare}
        type="button"
      >
        <Share2 className="size-4" />
        <span>Share</span>
      </button>
    </div>
  );
}

export function OrganizationPostCard({
  onOpenLightbox,
  onOpenShare,
  post,
}: OrganizationPostCardProps) {
  const { data: session } = authClient.useSession();
  const { cleanText, images } = parsePostContent(post.content);
  const [isLiked, setIsLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isExpandedText, setIsExpandedText] = useState(false);

  const { data: commentsData } = usePostComments(post.id);
  const createCommentMutation = useCreatePostComment(post.id);
  const toggleLikeMutation = useTogglePostLike(post.id);

  const comments = commentsData?.comments ?? [];
  const authorName = post.author?.name ?? "Pickleball Player";
  const authorUsername = post.author?.username ?? "player";

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
          setShowComments(true);
          toast.success("Comment posted");
        },
      }
    );
  };

  const isLongText = cleanText.length > 280;
  const displayText =
    isLongText && !isExpandedText ? `${cleanText.slice(0, 280)}...` : cleanText;

  return (
    <article className="bg-card text-card-foreground border-border overflow-hidden rounded-2xl border shadow-sm">
      <PostCardHeader
        authorImage={post.author?.image}
        authorName={authorName}
        authorUsername={authorUsername}
        createdAt={post.createdAt}
        onOpenShare={() => onOpenShare(post)}
      />

      {/* Post Text Body */}
      {cleanText ? (
        <div className="px-4 pb-3 text-sm leading-relaxed whitespace-pre-wrap">
          {displayText}
          {isLongText ? (
            <button
              className="text-primary ml-1 font-bold hover:underline"
              onClick={() => setIsExpandedText(!isExpandedText)}
              type="button"
            >
              {isExpandedText ? "See less" : "See more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Media Collage / Photos Grid */}
      {images.length > 0 ? (
        <div className="border-border/40 border-y bg-black select-none">
          <PostMediaCollage
            images={images}
            onOpenLightbox={(idx) => onOpenLightbox(post, idx)}
          />
        </div>
      ) : null}

      {/* Engagement Stats Counter */}
      <div className="text-muted-foreground border-border/40 flex items-center justify-between border-b px-4 py-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="bg-primary/90 text-primary-foreground grid size-4 place-items-center rounded-full text-[10px]">
            🎾
          </div>
          <span>{likeCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="hover:underline"
            onClick={() => setShowComments(!showComments)}
            type="button"
          >
            {comments.length || (post.commentCount ?? 0)} comments
          </button>
        </div>
      </div>

      <PostCardActionsRow
        isLiked={isLiked}
        onCommentClick={() => {
          setShowComments(true);
          const inputEl = document.querySelector<HTMLInputElement>(
            `#feed-comment-input-${post.id}`
          );
          inputEl?.focus();
        }}
        onOpenShare={() => onOpenShare(post)}
        onToggleLike={handleToggleLike}
      />

      {/* Inline Comments Section */}
      {showComments || comments.length > 0 ? (
        <PostCommentsSection
          commentText={commentText}
          comments={comments}
          isPending={createCommentMutation.isPending}
          onAddComment={handleAddComment}
          onCommentTextChange={setCommentText}
          postId={post.id}
          sessionUser={session?.user}
        />
      ) : null}
    </article>
  );
}
