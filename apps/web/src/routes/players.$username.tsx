import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, createFileRoute } from "@tanstack/react-router";
import {
  MapPin,
  Star,
  MessageSquare,
  Video,
  Users,
  UserPlus,
  UserCheck,
  Heart,
  Swords,
  XCircle,
  Clock,
  Calendar,
  ThumbsUp,
  Send,
  PlusCircle,
  Camera,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, VideoCard } from "@/components/rally/cards";
import type { VideoCardData } from "@/components/rally/cards";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { usePlayers } from "@/lib/hooks";

const duprRatings: Record<string, string> = {
  advanced: "4.5",
  beginner: "2.5",
  intermediate: "3.5",
  pro: "5.0+",
};

interface Challenge {
  id: string;
  challenger: string;
  challenged: string;
  venue: string;
  date: string;
  time: string;
  mode: string;
  message?: string;
  casted: boolean;
  splitMode?: string;
  status: string;
  partner?: string;
}

interface PlayerHeaderProps {
  player: {
    id: string;
    name: string;
    image?: string | null;
    skillLevel?: string | null;
    username?: string | null;
    displayUsername?: string | null;
    bio?: string | null;
  };
  location: string;
  isFollowing: boolean;
  setIsFollowing: (val: boolean) => void;
  friendStatus: "none" | "pending" | "friends";
  setFriendStatus: (status: "none" | "pending" | "friends") => void;
  likesCount: number;
  setLikesCount: (count: number) => void;
  isLiked: boolean;
  setIsLiked: (liked: boolean) => void;
  onOpenChallenge: () => void;
  onOpenDM: () => void;
}

function PlayerHeader({
  player,
  location,
  isFollowing,
  setIsFollowing,
  friendStatus,
  setFriendStatus,
  likesCount,
  setLikesCount,
  isLiked,
  setIsLiked,
  onOpenChallenge,
  onOpenDM,
}: PlayerHeaderProps) {
  const handleLike = () => {
    if (isLiked) {
      setLikesCount(likesCount - 1);
      setIsLiked(false);
      toast.info(`Unliked ${player.name}'s profile.`);
    } else {
      setLikesCount(likesCount + 1);
      setIsLiked(true);
      toast.success(`Liked ${player.name}'s profile!`);
    }
  };

  const handleFriendAction = () => {
    if (friendStatus === "none") {
      setFriendStatus("pending");
      toast.success(`Friend request sent to ${player.name}.`);
    } else if (friendStatus === "pending") {
      setFriendStatus("none");
      toast.info("Friend request cancelled.");
    } else {
      setFriendStatus("none");
      toast.info(`Removed ${player.name} from friends.`);
    }
  };

  const renderFriendButtonContent = () => {
    if (friendStatus === "friends") {
      return (
        <>
          <UserCheck className="size-3.5" /> Friends
        </>
      );
    }
    if (friendStatus === "pending") {
      return "Request Sent";
    }
    return (
      <>
        <UserPlus className="size-3.5" /> Add Friend
      </>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-border/50">
      <div className="size-24 sm:size-28 rounded-full border-4 border-primary/20 bg-muted flex items-center justify-center text-3xl font-extrabold overflow-hidden shadow-inner">
        {player.image ? (
          <img
            src={player.image}
            alt={player.name}
            className="size-full object-cover"
          />
        ) : (
          player.name.at(0)
        )}
      </div>
      <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {player.name}
          </h1>
          <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
            {player.skillLevel || "open play"}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          @{player.username || player.displayUsername}
        </p>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground">
          {location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" /> {location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-3.5 text-brand-yellow fill-current" /> DUPR{" "}
            {player.skillLevel
              ? duprRatings[player.skillLevel] || "open play"
              : "open play"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Heart
              className={`size-3.5 ${isLiked ? "text-red-500 fill-current" : "text-muted-foreground"}`}
            />{" "}
            {likesCount} likes
          </span>
        </div>

        {player.bio && (
          <p className="text-sm leading-relaxed max-w-xl text-foreground/90">
            {player.bio}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
          {/* Friend CTA */}
          <Button
            onClick={handleFriendAction}
            variant={friendStatus === "friends" ? "default" : "outline"}
            className="rounded-lg text-xs font-semibold px-4 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {renderFriendButtonContent()}
          </Button>

          {/* Follow CTA */}
          <Button
            onClick={() => {
              setIsFollowing(!isFollowing);
              toast.success(
                isFollowing
                  ? `Unfollowed ${player.name}.`
                  : `Followed ${player.name}!`
              );
            }}
            variant={isFollowing ? "outline" : "default"}
            className="rounded-lg text-xs font-semibold px-4 transition-all cursor-pointer"
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>

          {/* Like CTA */}
          <Button
            onClick={handleLike}
            variant="outline"
            className="rounded-lg text-xs font-semibold px-3 flex items-center justify-center cursor-pointer"
            aria-label="Like profile"
          >
            <Heart
              className={`size-4 ${isLiked ? "text-red-500 fill-current" : ""}`}
            />
          </Button>

          {/* Message DM CTA */}
          <Button
            onClick={onOpenDM}
            variant="outline"
            className="rounded-lg text-xs font-semibold px-4 flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="size-3.5" /> DM
          </Button>

          {/* Issue Challenge CTA */}
          <Button
            onClick={onOpenChallenge}
            className="rounded-lg text-xs font-semibold px-4 flex items-center gap-1.5 bg-brand-yellow text-black hover:bg-brand-yellow/80 cursor-pointer"
          >
            <Swords className="size-3.5" /> Challenge
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SocialPost {
  id: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
  likes: number;
  liked: boolean;
  comments: { author: string; text: string; time: string }[];
}

const getChallengeBadgeClass = (status: string) => {
  if (status === "accepted") {
    return "bg-green-500/15 text-green-400";
  }
  if (status === "declined") {
    return "bg-red-500/15 text-red-400";
  }
  return "bg-yellow-500/15 text-yellow-400 animate-pulse";
};

const getSplitModeText = (splitMode?: string) => {
  if (splitMode === "split_1") {
    return "Challenger pays 100%";
  }
  if (splitMode === "split_2") {
    return "Split 50/50 ($25 each)";
  }
  return "Split 4-ways ($12.50 each)";
};

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (challengeData: {
    mode: "singles" | "doubles";
    partner?: string;
    venue: string;
    date: string;
    time: string;
    message: string;
    casted: boolean;
    splitMode: string;
  }) => void;
  playerName: string;
  currentUser: { id: string; name: string } | null;
}

function ChallengeModal({
  isOpen,
  onClose,
  onSubmit,
  playerName,
  currentUser,
}: ChallengeModalProps) {
  const [challengeMode, setChallengeMode] = useState<"singles" | "doubles">(
    "singles"
  );
  const [challengeVenue, setChallengeVenue] = useState("demo-venue-1");
  const [challengeDate, setChallengeDate] = useState("2026-06-11");
  const [challengeTime, setChallengeTime] = useState("18:00");
  const [challengeMsg, setChallengeMsg] = useState("");
  const [requestCasting, setRequestCasting] = useState(false);
  const [castingSplit, setCastingSplit] = useState("split_2");

  // Partner search for challenges
  const [partnerSearch, setPartnerSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<{
    id: string;
    name: string;
    username: string;
  } | null>(null);

  const { data: playersData } = usePlayers(partnerSearch);
  const searchResults = partnerSearch
    ? (playersData?.players ?? []).filter((p) => p.id !== currentUser?.id)
    : [];

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (challengeMode === "doubles" && !selectedPartner) {
      toast.error("Please invite a partner to play doubles.");
      return;
    }

    const venues: Record<string, string> = {
      "demo-venue-1": "Crestwood Pickleball Park",
      "demo-venue-2": "Mueller Sports Courts",
      "demo-venue-3": "South Lamar Recreation Center",
    };

    onSubmit({
      casted: requestCasting,
      date: challengeDate,
      message: challengeMsg,
      mode: challengeMode,
      partner: selectedPartner?.name,
      splitMode: castingSplit,
      time: challengeTime,
      venue: venues[challengeVenue] || "Crestwood Pickleball Park",
    });

    // Reset local state
    setChallengeMsg("");
    setRequestCasting(false);
    setSelectedPartner(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="text-base font-bold flex items-center gap-1.5">
            <Swords className="size-4 text-primary" /> Issue Challenge to{" "}
            {playerName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-2">
                Match Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChallengeMode("singles");
                    setSelectedPartner(null);
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    challengeMode === "singles"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/30 text-muted-foreground"
                  }`}
                >
                  Singles
                </button>
                <button
                  type="button"
                  onClick={() => setChallengeMode("doubles")}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    challengeMode === "doubles"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/30 text-muted-foreground"
                  }`}
                >
                  Doubles
                </button>
              </div>
            </div>

            {challengeMode === "doubles" && (
              <div className="space-y-2">
                <Label htmlFor="partnerInput">Choose Your Partner</Label>
                <Input
                  id="partnerInput"
                  placeholder="Find players..."
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  className="mt-1.5 text-xs"
                />
                {selectedPartner && (
                  <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs mt-2">
                    <div>
                      <p className="font-semibold">{selectedPartner.name}</p>
                      <p className="text-[9px] text-muted-foreground">
                        @{selectedPartner.username}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPartner(null)}
                      className="text-red-400 hover:text-red-500 font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {!selectedPartner &&
                  partnerSearch &&
                  searchResults.length > 0 && (
                    <div className="border border-border rounded-lg bg-card max-h-36 overflow-y-auto divide-y divide-border/50 mt-1">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPartner({
                              id: p.id,
                              name: p.name,
                              username: p.username || p.displayUsername || "",
                            });
                            setPartnerSearch("");
                          }}
                          className="w-full text-left p-2 hover:bg-muted/40 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span>{p.name}</span>
                          <PlusCircle className="size-3.5 text-primary" />
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="challengeVenueSelect">Venue</Label>
              <select
                id="challengeVenueSelect"
                value={challengeVenue}
                onChange={(e) => setChallengeVenue(e.target.value)}
                className="w-full mt-1.5 p-2.5 bg-card border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="demo-venue-1">Crestwood Pickleball Park</option>
                <option value="demo-venue-2">Mueller Sports Courts</option>
                <option value="demo-venue-3">South Lamar Rec Center</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="challengeDateInput">Date</Label>
                <Input
                  id="challengeDateInput"
                  type="date"
                  value={challengeDate}
                  onChange={(e) => setChallengeDate(e.target.value)}
                  required
                  className="mt-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="challengeTimeInput">Time</Label>
                <Input
                  id="challengeTimeInput"
                  type="time"
                  value={challengeTime}
                  onChange={(e) => setChallengeTime(e.target.value)}
                  required
                  className="mt-1.5 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="challengeMessageInput">Message</Label>
              <textarea
                id="challengeMessageInput"
                rows={2}
                aria-label="Challenge Message"
                placeholder="E.g. Let's play singles, best of 3 games!"
                value={challengeMsg}
                onChange={(e) => setChallengeMsg(e.target.value)}
                className="w-full mt-1.5 p-2.5 bg-card border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none leading-normal text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="border-t border-border/50 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="casterCheckbox"
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <Video className="size-4 text-red-500" /> Request Caster
                  Recording
                </Label>
                <input
                  id="casterCheckbox"
                  type="checkbox"
                  aria-label="Request Caster Recording"
                  checked={requestCasting}
                  onChange={(e) => setRequestCasting(e.target.checked)}
                  className="rounded border-border bg-card text-primary focus:ring-primary focus:outline-none cursor-pointer"
                />
              </div>

              {requestCasting && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Casting Cost Split Setup (Rate: $50)
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        id="split1"
                        type="radio"
                        aria-label="Challenger pays 100%"
                        name="castingSplit"
                        value="split_1"
                        checked={castingSplit === "split_1"}
                        onChange={() => setCastingSplit("split_1")}
                        className="text-primary focus:ring-primary cursor-pointer"
                      />
                      <Label
                        htmlFor="split1"
                        className="text-[11px] text-foreground cursor-pointer"
                      >
                        Challenger pays 100% ($50)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="split2"
                        type="radio"
                        aria-label="Split 50/50 with opponent"
                        name="castingSplit"
                        value="split_2"
                        checked={castingSplit === "split_2"}
                        onChange={() => setCastingSplit("split_2")}
                        className="text-primary focus:ring-primary cursor-pointer"
                      />
                      <Label
                        htmlFor="split2"
                        className="text-[11px] text-foreground cursor-pointer"
                      >
                        Split 50/50 with opponent ($25 each)
                      </Label>
                    </div>
                    {challengeMode === "doubles" && (
                      <div className="flex items-center gap-2">
                        <input
                          id="split4"
                          type="radio"
                          aria-label="Split 4 ways"
                          name="castingSplit"
                          value="split_4"
                          checked={castingSplit === "split_4"}
                          onChange={() => setCastingSplit("split_4")}
                          className="text-primary focus:ring-primary cursor-pointer"
                        />
                        <Label
                          htmlFor="split4"
                          className="text-[11px] text-foreground cursor-pointer"
                        >
                          Split 4 ways ($12.50 each)
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-t border-border flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-lg text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Send Challenge Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DMChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  chatLog: { sender: string; text: string; time: string }[];
  dmMessage: string;
  onChangeMessage: (msg: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
}

function DMChatModal({
  isOpen,
  onClose,
  playerName,
  chatLog,
  dmMessage,
  onChangeMessage,
  onSendMessage,
}: DMChatModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col h-[500px] animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {playerName[0]}
            </div>
            <div>
              <h2 className="text-xs font-bold">{playerName}</h2>
              <p className="text-[10px] text-green-400">Online</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-muted/10">
          {chatLog.map((chat, idx) => (
            <div
              key={idx}
              className={`flex flex-col max-w-[80%] ${chat.sender === "me" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div
                className={`p-3 rounded-2xl text-xs ${
                  chat.sender === "me"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none"
                }`}
              >
                {chat.text}
              </div>
              <span className="text-[9px] text-muted-foreground mt-1 px-1">
                {chat.time}
              </span>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <form
          onSubmit={onSendMessage}
          className="p-3 border-t border-border flex gap-2 shrink-0"
        >
          <Input
            aria-label="Message text"
            placeholder="Type a message..."
            value={dmMessage}
            onChange={(e) => onChangeMessage(e.target.value)}
            className="text-xs"
          />
          <Button
            type="submit"
            className="px-4 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/players/$username")({
  component: PlayerProfilePage,
});

interface PhotoPost {
  id: string;
  url: string;
  likes: number;
  caption: string;
  comments: { author: string; text: string; time: string }[];
  hasLiked?: boolean;
}

function PlayerProfilePage() {
  const { username } = useParams({ from: "/players/$username" });
  const [activeTab, setActiveTab] = useState<
    "videos" | "photos" | "feed" | "about"
  >("videos");

  // Photos State
  const [photosList, setPhotosList] = useState<PhotoPost[]>([
    {
      caption:
        "Weekend morning grind at Crestwood! Love the weather today. 🏓🔥",
      comments: [
        { author: "Mike Rodriguez", text: "Nice shots!", time: "2h ago" },
        {
          author: "Sarah Johnson",
          text: "Let's play next Saturday!",
          time: "1h ago",
        },
      ],
      id: "p1",
      likes: 45,
      url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80",
    },
    {
      caption: "Sunset sessions hitting some deep dinks. Paddles up! 🙌",
      comments: [
        { author: "Alice Smith", text: "Beautiful courts!", time: "5h ago" },
      ],
      id: "p2",
      likes: 82,
      url: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80",
    },
    {
      caption: "New paddle feels like butter. DUPR rating going up next week!",
      comments: [],
      id: "p3",
      likes: 31,
      url: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=600&q=80",
    },
    {
      caption: "Team dinner after a successful ladder league tournament! 🏆",
      comments: [{ author: "Bob", text: "Congrats!", time: "1d ago" }],
      id: "p4",
      likes: 64,
      url: "https://images.unsplash.com/photo-1617083934383-e009403ec417?auto=format&fit=crop&w=600&q=80",
    },
  ]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoPost | null>(null);

  // Profile state actions
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<
    "none" | "pending" | "friends"
  >("none");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(18);

  // Modals state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);

  // DM State
  const [dmMessage, setDmMessage] = useState("");
  const [chatLog, setChatLog] = useState<
    { sender: string; text: string; time: string }[]
  >([
    {
      sender: "player",
      text: "Hey! Down to play some pickleball this weekend?",
      time: "Yesterday",
    },
  ]);

  // Social feed state
  const [posts, setPosts] = useState<SocialPost[]>([
    {
      author: "Sarah Johnson",
      avatar: "S",
      comments: [
        {
          author: "Mike Rodriguez",
          text: "Nice resets! Those drops were crazy.",
          time: "1 hour ago",
        },
      ],
      content:
        "Great match today on Court 1! Finished the ladder match in second place. reset game was on point.",
      id: "post-1",
      liked: false,
      likes: 12,
      time: "2 hours ago",
    },
    {
      author: "Sarah Johnson",
      avatar: "S",
      comments: [],
      content:
        "Does anyone want to play doubles tomorrow morning around 8 AM at Crestwood Park?",
      id: "post-2",
      liked: false,
      likes: 5,
      time: "3 days ago",
    },
  ]);
  const [newCommentTexts, setNewCommentTexts] = useState<
    Record<string, string>
  >({});

  // Challenge states
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      casted: true,
      challenged: "Sarah Johnson",
      challenger: "CG Stewart",
      date: "2026-06-12",
      id: "ch-1",
      message: "Ready for a rematch after last week's game!",
      mode: "singles",
      splitMode: "split_2",
      status: "issued",
      time: "18:00",
      venue: "Crestwood Pickleball Park",
    },
  ]);

  const { data: sessionData } = authClient.useSession();
  const currentUser = sessionData?.user;

  const { data, isLoading, error } = useQuery({
    queryFn: async () => {
      const res = await apiClient.api.players[":username"].$get({
        param: { username },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch player");
      }
      return res.json();
    },
    queryKey: ["player", username],
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-pulse">
        <div className="flex items-center gap-6 pb-6 border-b border-border/50">
          <div className="size-20 sm:size-24 rounded-full bg-muted" />
          <div className="space-y-3 flex-1">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data?.player) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">
          Profile not found
        </h2>
        <p className="text-muted-foreground text-sm">
          The player username "@{username}" does not exist or has not completed
          onboarding.
        </p>
        <Link to="/players">
          <Button variant="outline" className="rounded-md text-xs mt-4">
            Back to Players
          </Button>
        </Link>
      </div>
    );
  }

  const { player, videos = [] } = data;
  const location = [player.homeCity, player.homeState]
    .filter(Boolean)
    .join(", ");

  const handlePostLike = (postId: string) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      })
    );
  };

  const handleAddComment = (postId: string) => {
    const commentText = newCommentTexts[postId]?.trim();
    if (!commentText) {
      return;
    }

    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [
              ...post.comments,
              {
                author: currentUser?.name || "CG Stewart",
                text: commentText,
                time: "Just now",
              },
            ],
          };
        }
        return post;
      })
    );

    setNewCommentTexts({ ...newCommentTexts, [postId]: "" });
    toast.success("Comment posted!");
  };

  const handleSendChallenge = (challengeData: {
    mode: "singles" | "doubles";
    partner?: string;
    venue: string;
    date: string;
    time: string;
    message: string;
    casted: boolean;
    splitMode: string;
  }) => {
    const newChallenge: Challenge = {
      ...challengeData,
      challenged: player.name,
      challenger: currentUser?.name || "CG Stewart",
      id: `ch-${Date.now()}`,
      status: "issued",
    };

    setChallenges((prev) => [newChallenge, ...prev]);
    setShowChallengeModal(false);
    toast.success(`Challenge successfully issued to ${player.name}!`);
  };

  const handleChallengeAction = (
    chId: string,
    action: "accept" | "decline"
  ) => {
    setChallenges(
      challenges.map((ch) => {
        if (ch.id === chId) {
          return {
            ...ch,
            status: action === "accept" ? "accepted" : "declined",
          };
        }
        return ch;
      })
    );

    if (action === "accept") {
      toast.success("Match challenge accepted!");
    } else {
      toast.info("Match challenge declined.");
    }
  };

  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmMessage.trim()) {
      return;
    }

    setChatLog((prev) => [
      ...prev,
      { sender: "me", text: dmMessage, time: "Just now" },
    ]);
    setDmMessage("");

    // Mock auto replies
    setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        {
          sender: "player",
          text: "Sounds awesome, let's look at the matches or send a challenge request!",
          time: "Just now",
        },
      ]);
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-8 animate-in fade-in duration-300">
      <PlayerHeader
        player={player}
        location={location}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
        friendStatus={friendStatus}
        setFriendStatus={setFriendStatus}
        likesCount={likesCount}
        setLikesCount={setLikesCount}
        isLiked={isLiked}
        setIsLiked={setIsLiked}
        onOpenChallenge={() => {
          if (!currentUser) {
            toast.error("Please log in to challenge this player.");
            return;
          }
          setShowChallengeModal(true);
        }}
        onOpenDM={() => {
          if (!currentUser) {
            toast.error("Please log in to message this player.");
            return;
          }
          setShowDMModal(true);
        }}
      />

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-muted/20 border border-border/50 rounded-xl">
          <span className="block text-xl font-bold">{videos.length}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Videos
          </span>
        </div>
        <div className="p-3 bg-muted/20 border border-border/50 rounded-xl">
          <span className="block text-xl font-bold">124</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Followers
          </span>
        </div>
        <div className="p-3 bg-muted/20 border border-border/50 rounded-xl">
          <span className="block text-xl font-bold">34</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Matches
          </span>
        </div>
      </div>

      <div className="border-b border-border flex justify-center gap-6">
        <button
          onClick={() => setActiveTab("videos")}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === "videos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Video className="size-4" /> Videos
        </button>
        <button
          onClick={() => setActiveTab("photos")}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === "photos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Camera className="size-4" /> Photos
        </button>
        <button
          onClick={() => setActiveTab("feed")}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === "feed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Swords className="size-4" /> Challenges & Feed
        </button>
        <button
          onClick={() => setActiveTab("about")}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === "about"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-4" /> About
        </button>
      </div>

      <div className="pt-2">
        {activeTab === "videos" && (
          <VideosTab videos={videos} player={player} />
        )}

        {activeTab === "photos" && (
          <PhotosTab
            photosList={photosList}
            setSelectedPhoto={setSelectedPhoto}
          />
        )}

        {activeTab === "feed" && (
          <FeedTab
            challenges={challenges}
            posts={posts}
            player={player}
            currentUser={currentUser || null}
            newCommentTexts={newCommentTexts}
            setNewCommentTexts={setNewCommentTexts}
            handleChallengeAction={handleChallengeAction}
            handlePostLike={handlePostLike}
            handleAddComment={handleAddComment}
          />
        )}

        {activeTab === "about" && (
          <AboutTab player={player} location={location} />
        )}
      </div>

      <ChallengeModal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        onSubmit={handleSendChallenge}
        playerName={player.name}
        currentUser={currentUser || null}
      />

      <DMChatModal
        isOpen={showDMModal}
        onClose={() => setShowDMModal(false)}
        playerName={player.name}
        chatLog={chatLog}
        dmMessage={dmMessage}
        onChangeMessage={setDmMessage}
        onSendMessage={handleSendDM}
      />

      {/* Photo Lightbox Modal (Instagram-style) */}
      {selectedPhoto && (
        <PhotoLightboxModal
          selectedPhoto={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          player={player}
          currentUser={currentUser || null}
          isFollowing={isFollowing}
          setIsFollowing={setIsFollowing}
          photosList={photosList}
          setPhotosList={setPhotosList}
          setSelectedPhoto={setSelectedPhoto}
        />
      )}
    </div>
  );
}

interface PhotoLightboxModalProps {
  selectedPhoto: PhotoPost;
  onClose: () => void;
  player: {
    name: string;
    image?: string | null;
    username?: string | null;
  };
  currentUser: {
    name: string;
  } | null;
  isFollowing: boolean;
  setIsFollowing: (val: boolean) => void;
  photosList: PhotoPost[];
  setPhotosList: (list: PhotoPost[]) => void;
  setSelectedPhoto: (photo: PhotoPost | null) => void;
}

function PhotoLightboxModal({
  selectedPhoto,
  onClose,
  player,
  currentUser,
  isFollowing,
  setIsFollowing,
  photosList,
  setPhotosList,
  setSelectedPhoto,
}: PhotoLightboxModalProps) {
  const [photoCommentText, setPhotoCommentText] = useState("");

  const handleLike = () => {
    const updated = photosList.map((p) => {
      if (p.id === selectedPhoto.id) {
        const liked = !p.hasLiked;
        return {
          ...p,
          hasLiked: liked,
          likes: liked ? p.likes + 1 : p.likes - 1,
        };
      }
      return p;
    });
    setPhotosList(updated);
    const current = updated.find((p) => p.id === selectedPhoto.id);
    if (current) {
      setSelectedPhoto(current);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Please log in to write a comment.");
      return;
    }
    if (!photoCommentText.trim()) {
      return;
    }

    const updated = photosList.map((p) => {
      if (p.id === selectedPhoto.id) {
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              author: currentUser.name,
              text: photoCommentText,
              time: "Just now",
            },
          ],
        };
      }
      return p;
    });
    setPhotosList(updated);
    const current = updated.find((p) => p.id === selectedPhoto.id);
    if (current) {
      setSelectedPhoto(current);
    }
    setPhotoCommentText("");
    toast.success("Comment posted!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col md:grid md:grid-cols-2 h-[80vh] max-h-[700px] animate-in scale-in duration-300">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-3 right-3 z-10 text-white bg-black/60 hover:bg-black/80 p-1.5 rounded-full cursor-pointer transition-colors border-none"
        >
          <XCircle className="size-5" />
        </button>

        {/* Left Column: Image */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-border/40">
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.caption}
            className="size-full object-contain"
          />
        </div>

        {/* Right Column: Post details, comments, feed */}
        <div className="flex-1 flex flex-col h-full bg-card min-h-0">
          {/* Header (Author) */}
          <div className="p-4 border-b border-border/40 flex items-center gap-3 shrink-0 bg-card">
            <div className="size-9 rounded-full border border-primary/20 bg-muted overflow-hidden flex items-center justify-center font-bold text-sm shrink-0">
              {player.image ? (
                <img
                  src={player.image}
                  alt={player.name}
                  className="size-full object-cover"
                />
              ) : (
                player.name.at(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold text-sm text-foreground truncate">
                {player.name}
              </h4>
              <p className="text-[10px] text-muted-foreground truncate">
                @{player.username || "player"}
              </p>
            </div>
            <Button
              onClick={() => {
                setIsFollowing(!isFollowing);
                toast.success(
                  isFollowing
                    ? `Unfollowed ${player.name}`
                    : `Followed ${player.name}`
                );
              }}
              variant="ghost"
              className="ml-auto text-xs text-primary font-bold hover:bg-transparent px-2"
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          </div>

          {/* Scrollable Area: Caption & Comments */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 text-xs bg-card">
            {/* Caption */}
            <div className="flex gap-3">
              <div className="size-8 rounded-full border border-primary/20 bg-muted overflow-hidden flex items-center justify-center font-bold text-xs shrink-0">
                {player.image ? (
                  <img
                    src={player.image}
                    alt={player.name}
                    className="size-full object-cover"
                  />
                ) : (
                  player.name.at(0)
                )}
              </div>
              <div className="space-y-1 flex-1">
                <span className="font-extrabold text-[11px] mr-1.5">
                  {player.name}
                </span>
                <span className="text-muted-foreground leading-normal">
                  {selectedPhoto.caption}
                </span>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3 pt-3 border-t border-border/20">
              {selectedPhoto.comments.map((comment, index) => (
                <div key={index} className="flex gap-3">
                  <div className="size-7 rounded-full bg-primary/25 border border-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                    {comment.author.at(0)}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div>
                      <span className="font-extrabold text-[10px] mr-1.5">
                        {comment.author}
                      </span>
                      <span className="text-muted-foreground leading-normal">
                        {comment.text}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      {comment.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer actions (Likes, Comment input) */}
          <div className="p-4 border-t border-border/40 space-y-3 shrink-0 bg-card">
            <div className="flex items-center gap-4 text-xs font-bold text-foreground">
              <button
                onClick={handleLike}
                type="button"
                className={`flex items-center gap-1.5 cursor-pointer transition-colors border-none bg-transparent ${
                  selectedPhoto.hasLiked
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart
                  className={`size-4 ${selectedPhoto.hasLiked ? "fill-current" : ""}`}
                />
                <span>{selectedPhoto.likes} Likes</span>
              </button>
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <MessageSquare className="size-4" />
                <span>{selectedPhoto.comments.length} Comments</span>
              </span>
            </div>

            {/* Add comment form */}
            <form
              onSubmit={handleCommentSubmit}
              className="flex gap-2 items-center"
            >
              <Input
                placeholder="Write a comment..."
                value={photoCommentText}
                onChange={(e) => setPhotoCommentText(e.target.value)}
                className="flex-1 text-xs h-9 bg-muted/30 border-border/50 rounded-lg focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 px-3.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground"
              >
                Post
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AboutTabProps {
  player: {
    skillLevel?: string | null;
    homeCourtName?: string | null;
  };
  location: string;
}

function AboutTab({ player, location }: AboutTabProps) {
  return (
    <Card className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm max-w-xl mx-auto">
      <CardContent className="p-6 space-y-4">
        <h3 className="font-bold text-base border-b border-border/50 pb-2">
          Player Details
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[10px]">
              Skill Class
            </span>
            <span className="font-semibold text-foreground capitalize mt-0.5 block">
              {player.skillLevel || "open play"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">
              Home Venue
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {player.homeCourtName || "None declared"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">
              Location
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {location || "Not specified"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">
              Member Since
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              June 2026
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FeedTabProps {
  challenges: Challenge[];
  posts: SocialPost[];
  player: { name: string };
  _currentUser: { name: string } | null;
  newCommentTexts: Record<string, string>;
  setNewCommentTexts: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  handleChallengeAction: (chId: string, action: "accept" | "decline") => void;
  handlePostLike: (postId: string) => void;
  handleAddComment: (postId: string) => void;
}

function FeedTab({
  challenges,
  posts,
  player,
  _currentUser,
  newCommentTexts,
  setNewCommentTexts,
  handleChallengeAction,
  handlePostLike,
  handleAddComment,
}: FeedTabProps) {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Challenges Section */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <Swords className="size-4 text-primary" /> Active Challenges
        </h3>

        {challenges.length > 0 ? (
          <div className="space-y-3">
            {challenges.map((ch) => (
              <Card
                key={ch.id}
                className="border border-border/60 bg-card/50 rounded-xl overflow-hidden shadow-sm"
              >
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-start border-b border-border/40 pb-2.5">
                    <div>
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {ch.mode}
                      </span>
                      <h4 className="font-extrabold text-sm text-foreground mt-1">
                        {ch.challenger} challenged {ch.challenged}
                      </h4>
                      {ch.partner && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Partner: {ch.partner}
                        </p>
                      )}
                    </div>

                    <span
                      className={`font-bold px-2 py-0.5 rounded capitalize ${getChallengeBadgeClass(ch.status)}`}
                    >
                      {ch.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary" /> {ch.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary" /> {ch.time}
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <MapPin className="size-3.5 text-primary" /> {ch.venue}
                    </div>
                  </div>

                  {ch.message && (
                    <div className="bg-muted/40 p-2.5 rounded-lg text-[11px] text-foreground leading-normal border border-border/30">
                      "{ch.message}"
                    </div>
                  )}

                  {ch.casted && (
                    <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[11px] flex justify-between items-center font-medium">
                      <span className="flex items-center gap-1">
                        <Video className="size-3.5" /> Recording Requested
                      </span>
                      <span>{getSplitModeText(ch.splitMode)}</span>
                    </div>
                  )}

                  {ch.status === "issued" && ch.challenged === player.name && (
                    <div className="pt-2 flex gap-2">
                      <Button
                        onClick={() => handleChallengeAction(ch.id, "decline")}
                        variant="outline"
                        className="flex-1 text-red-400 border-red-500/20 hover:bg-red-500/10 rounded-lg text-xs py-3.5 cursor-pointer font-bold"
                      >
                        Decline
                      </Button>
                      <Button
                        onClick={() => handleChallengeAction(ch.id, "accept")}
                        className="flex-1 rounded-lg text-xs py-3.5 cursor-pointer font-bold"
                      >
                        Accept
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl bg-muted/10">
            No active challenges.
          </p>
        )}
      </div>

      {/* Social Posts Section */}
      <div className="space-y-4 pt-4 border-t border-border/30">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <MessageSquare className="size-4 text-primary" /> Player Feed
        </h3>

        <div className="space-y-4">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {post.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">
                        {post.author}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {post.time}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-foreground leading-relaxed">
                  {post.content}
                </p>

                <div className="flex items-center gap-4 text-xs pt-1">
                  <button
                    onClick={() => handlePostLike(post.id)}
                    type="button"
                    className={`flex items-center gap-1.5 font-semibold cursor-pointer transition-colors border-none bg-transparent ${
                      post.liked
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ThumbsUp className="size-3.5" />
                    <span>{post.likes}</span>
                  </button>
                </div>

                {/* Comments list */}
                {post.comments.length > 0 && (
                  <div className="mt-3 bg-muted/30 p-3 rounded-lg border border-border/30 space-y-2.5">
                    {post.comments.map((comment, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span>{comment.author}</span>
                          <span className="text-[9px] text-muted-foreground font-normal">
                            {comment.time}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 leading-normal">
                          {comment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment input */}
                <div className="flex gap-2 pt-2 border-t border-border/20">
                  <Input
                    placeholder="Write a comment..."
                    value={newCommentTexts[post.id] || ""}
                    onChange={(e) =>
                      setNewCommentTexts({
                        ...newCommentTexts,
                        [post.id]: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-muted/30 border-border/50 rounded-lg focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <Button
                    onClick={() => handleAddComment(post.id)}
                    className="size-9 p-0 flex items-center justify-center rounded-lg shrink-0 cursor-pointer"
                    aria-label="Post comment"
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

interface VideosTabProps {
  videos: VideoCardData[];
  player: { username?: string | null };
}

function VideosTab({ videos, player }: VideosTabProps) {
  if (videos.length > 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((vid) => (
          <VideoCard key={vid.id} video={vid} />
        ))}
      </div>
    );
  }

  return (
    <EmptyState
      message={`@${player.username || "player"} hasn't published any match recordings yet.`}
      title="No videos posted"
    />
  );
}

interface PhotosTabProps {
  photosList: PhotoPost[];
  setSelectedPhoto: (photo: PhotoPost) => void;
}

function PhotosTab({ photosList, setSelectedPhoto }: PhotosTabProps) {
  return (
    <div className="grid grid-cols-3 gap-1 md:gap-3 animate-in fade-in duration-300">
      {photosList.map((photo) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => setSelectedPhoto(photo)}
          className="relative aspect-square rounded-lg overflow-hidden border border-border/40 group/photo cursor-pointer shadow-sm bg-muted w-full h-full p-0 text-left border-none"
        >
          <img
            src={photo.url}
            alt={photo.caption}
            className="size-full object-cover transition-transform duration-300 group-hover/photo:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/50 flex items-center justify-center gap-2 sm:gap-6 opacity-0 group-hover/photo:opacity-100 transition-all text-white font-bold text-xs sm:text-sm">
            <span className="flex items-center gap-1.5">
              <Heart className="size-4 fill-current text-red-500" />{" "}
              {photo.likes}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="size-4 fill-current text-sky-400" />{" "}
              {photo.comments.length}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
