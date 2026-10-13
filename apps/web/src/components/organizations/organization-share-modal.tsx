import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import {
  Check,
  Copy,
  MessageSquare,
  Repeat,
  Send,
  Share2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  useCreatePost,
  useFriends,
  useShareEntity,
} from "@/lib/hooks/use-social";

interface OrganizationShareModalProps {
  entityId: string;
  entityTitle: string;
  entityType?: "event" | "post" | "profile" | "venue" | "video";
  onClose: () => void;
  shareUrl: string;
}

interface MessengerFriendsListProps {
  friends: {
    id: string;
    image?: string | null;
    name: string;
    username?: string | null;
  }[];
  isLoading: boolean;
  onCopyLink: () => void;
  onSendToFriend: (id: string, name: string) => void;
  pendingFriendIds: boolean;
  sentFriendIds: Set<string>;
}

function MessengerFriendsList({
  friends,
  isLoading,
  onCopyLink,
  onSendToFriend,
  pendingFriendIds,
  sentFriendIds,
}: MessengerFriendsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        <div className="bg-muted h-10 animate-pulse rounded-lg" />
        <div className="bg-muted h-10 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="bg-muted/40 rounded-xl p-6 text-center text-xs">
        <Users className="text-muted-foreground mx-auto mb-2 size-8" />
        <p className="font-semibold">No friends found yet</p>
        <p className="text-muted-foreground mt-1">
          Connect with players or copy the link to share via other apps.
        </p>
        <Button
          className="mt-3 text-xs"
          onClick={onCopyLink}
          size="sm"
          variant="outline"
        >
          <Copy className="mr-1.5 size-3" /> Copy Link Instead
        </Button>
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {friends.map((friend) => {
        const isSent = sentFriendIds.has(friend.id);
        return (
          <div
            className="hover:bg-muted/50 flex items-center justify-between rounded-xl p-2 transition"
            key={friend.id}
          >
            <div className="flex items-center gap-3">
              <div className="size-9 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                {friend.image ? (
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={friend.image}
                  />
                ) : (
                  <div className="bg-primary/20 text-primary grid size-full place-items-center text-xs font-bold">
                    {friend.name[0]}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold">{friend.name}</p>
                <p className="text-muted-foreground text-[11px]">
                  @{friend.username ?? "player"}
                </p>
              </div>
            </div>

            <Button
              className="h-8 rounded-full px-3 text-xs"
              disabled={isSent || pendingFriendIds}
              onClick={() => onSendToFriend(friend.id, friend.name)}
              size="sm"
              variant={isSent ? "secondary" : "default"}
            >
              {isSent ? (
                <>
                  <Check className="mr-1 size-3 text-[#bcdf21]" /> Sent
                </>
              ) : (
                <>
                  <Send className="mr-1 size-3" /> Send
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function OrganizationShareModal({
  entityId,
  entityTitle,
  entityType = "post",
  onClose,
  shareUrl,
}: OrganizationShareModalProps) {
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<"feed" | "link" | "messenger">(
    "messenger"
  );
  const [copied, setCopied] = useState(false);
  const [sentFriendIds, setSentFriendIds] = useState<Set<string>>(new Set());
  const [feedNote, setFeedNote] = useState("");
  const [isPostingFeed, setIsPostingFeed] = useState(false);

  const { data: friendsData, isLoading: isLoadingFriends } = useFriends();
  const shareMutation = useShareEntity();
  const createPostMutation = useCreatePost();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      shareMutation.mutate({
        channel: "copy_link",
        entityId,
        entityType,
        href: shareUrl,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleSendToFriend = (friendId: string, friendName: string) => {
    shareMutation.mutate(
      {
        channel: "direct_message",
        entityId,
        entityType,
        href: shareUrl,
        recipientUserId: friendId,
      },
      {
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Could not send share message"
          );
        },
        onSuccess: () => {
          setSentFriendIds((prev) => new Set(prev).add(friendId));
          toast.success(`Shared with ${friendName}!`);
        },
      }
    );
  };

  const handleShareToFeed = (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user) {
      toast.error("Please sign in to share to your feed.");
      return;
    }
    setIsPostingFeed(true);
    const content = `${feedNote ? `${feedNote.trim()}\n\n` : ""}Check out: ${entityTitle}\n${shareUrl}`;
    createPostMutation.mutate(
      { content },
      {
        onError: () => {
          setIsPostingFeed(false);
          toast.error("Failed to share to feed");
        },
        onSuccess: () => {
          setIsPostingFeed(false);
          toast.success("Shared to your feed!");
          onClose();
        },
      }
    );
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          text: `Check out ${entityTitle} on RallyCasts:`,
          title: entityTitle,
          url: shareUrl,
        });
        shareMutation.mutate({
          channel: "external",
          entityId,
          entityType,
          href: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch {
        // User cancelled share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const friends = friendsData?.friends ?? [];

  return (
    <dialog
      aria-label="Share dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      open
    >
      <div className="bg-card text-card-foreground border-border w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Share2 className="text-primary size-5" />
            <h2 className="text-lg font-bold">Share to...</h2>
          </div>
          <button
            aria-label="Close share modal"
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full transition"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Share Tabs */}
        <div className="bg-muted/30 grid grid-cols-3 border-b p-1 text-xs font-semibold">
          <button
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              activeTab === "messenger"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("messenger")}
            type="button"
          >
            <MessageSquare className="size-3.5" />
            <span>In Messenger</span>
          </button>
          <button
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              activeTab === "feed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("feed")}
            type="button"
          >
            <Repeat className="size-3.5" />
            <span>To Feed</span>
          </button>
          <button
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              activeTab === "link"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("link")}
            type="button"
          >
            <Copy className="size-3.5" />
            <span>Copy Link</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4">
          {/* TAB 1: SEND IN MESSENGER */}
          {activeTab === "messenger" ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium">
                Send directly to your pickleball friends via direct message:
              </p>

              <MessengerFriendsList
                friends={friends}
                isLoading={isLoadingFriends}
                onCopyLink={handleCopyLink}
                onSendToFriend={handleSendToFriend}
                pendingFriendIds={shareMutation.isPending}
                sentFriendIds={sentFriendIds}
              />
            </div>
          ) : null}

          {/* TAB 2: SHARE TO FEED */}
          {activeTab === "feed" ? (
            <form className="space-y-3" onSubmit={handleShareToFeed}>
              <p className="text-muted-foreground text-xs font-medium">
                Add your thoughts and share with your followers:
              </p>
              <textarea
                className="border-input bg-background focus:ring-primary min-h-[90px] w-full rounded-xl border p-3 text-sm focus:ring-2 focus:outline-none"
                onChange={(e) => setFeedNote(e.target.value)}
                placeholder="Say something about this..."
                value={feedNote}
              />
              <div className="bg-muted/40 rounded-xl border p-3 text-xs">
                <p className="font-bold">{entityTitle}</p>
                <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                  {shareUrl}
                </p>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  className="rounded-lg text-xs"
                  disabled={isPostingFeed}
                  type="submit"
                >
                  <Repeat className="mr-1.5 size-3.5" /> Share to Feed
                </Button>
              </div>
            </form>
          ) : null}

          {/* TAB 3: COPY LINK & NATIVE */}
          {activeTab === "link" ? (
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  Share this link anywhere:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    className="h-10 rounded-lg font-mono text-xs"
                    value={shareUrl}
                  />
                  <Button
                    className="h-10 shrink-0 rounded-lg"
                    onClick={handleCopyLink}
                    variant={copied ? "secondary" : "default"}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1.5 size-4 text-[#bcdf21]" />{" "}
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 size-4" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {typeof navigator !== "undefined" && "share" in navigator ? (
                <div className="border-t pt-3">
                  <Button
                    className="w-full rounded-lg"
                    onClick={handleNativeShare}
                    variant="outline"
                  >
                    <Share2 className="mr-2 size-4" /> Open System Share Sheet
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
