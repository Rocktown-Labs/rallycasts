import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import {
  useParams,
  Link,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
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
  PlusCircle,
  Camera,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Trophy,
  ArrowLeft,
  Info,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/rally/cards";
import type { VideoCardData } from "@/components/rally/cards";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { demoPlayers } from "@/lib/demo-data";
import { usePlayers } from "@/lib/hooks";
import { readApiJson } from "@/lib/hooks/api";

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
  result?: "won" | "lost" | "upcoming";
  videoUrl?: string;
}

interface FeedItem {
  id: string;
  type: "video" | "photo" | "challenge" | "post";
  data: VideoCardData | PhotoPost | Challenge | SocialPost;
}

interface PhotoPost {
  id: string;
  url: string;
  likes: number;
  caption: string;
  comments: { author: string; text: string; time: string }[];
  hasLiked?: boolean;
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

interface PlayerHeaderProps {
  player: {
    id: string;
    name: string;
    image?: string | null;
    skillLevel?: string | null;
    username?: string | null;
    displayUsername?: string | null;
    bio?: string | null;
    onboardingStatus?: string | null;
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
  isOwnProfile: boolean;
}

interface PlayerHeaderActionsProps {
  isOwnProfile: boolean;
  friendStatus: "none" | "pending" | "friends";
  isFollowing: boolean;
  isLiked: boolean;
  playerName: string;
  handleFriendAction: () => void;
  renderFriendButtonContent: () => React.ReactNode;
  setIsFollowing: (val: boolean) => void;
  handleLike: () => void;
  onOpenDM: () => void;
  onOpenChallenge: () => void;
}

function PlayerHeaderActions({
  isOwnProfile,
  friendStatus,
  isFollowing,
  isLiked,
  playerName,
  handleFriendAction,
  renderFriendButtonContent,
  setIsFollowing,
  handleLike,
  onOpenDM,
  onOpenChallenge,
}: PlayerHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
      {!isOwnProfile && (
        <>
          <Button
            onClick={handleFriendAction}
            variant={friendStatus === "friends" ? "default" : "outline"}
            className="rounded-lg text-xs font-semibold px-4 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {renderFriendButtonContent()}
          </Button>

          <Button
            onClick={() => {
              setIsFollowing(!isFollowing);
              toast.success(
                isFollowing
                  ? `Unfollowed ${playerName}.`
                  : `Followed ${playerName}!`
              );
            }}
            variant={isFollowing ? "outline" : "default"}
            className="rounded-lg text-xs font-semibold px-4 transition-all cursor-pointer"
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>

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

          <Button
            onClick={onOpenDM}
            variant="outline"
            className="rounded-lg text-xs font-semibold px-4 flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="size-3.5" /> DM
          </Button>

          <Button
            onClick={onOpenChallenge}
            className="rounded-lg text-xs font-semibold px-4 flex items-center gap-1.5 bg-brand-yellow text-black hover:bg-brand-yellow/80 cursor-pointer"
          >
            <Swords className="size-3.5" /> Challenge
          </Button>
        </>
      )}
      {isOwnProfile && (
        <Link to="/u/settings">
          <Button
            variant="outline"
            className="rounded-lg text-xs font-semibold px-4 cursor-pointer"
          >
            Edit Profile
          </Button>
        </Link>
      )}
    </div>
  );
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
  isOwnProfile,
}: PlayerHeaderProps) {
  const handleLike = () => {
    if (isLiked) {
      setLikesCount(likesCount - 1);
      setIsLiked(false);
      toast.info(`Unliked ${player.name || "Player"}'s profile.`);
    } else {
      setLikesCount(likesCount + 1);
      setIsLiked(true);
      toast.success(`Liked ${player.name || "Player"}'s profile!`);
    }
  };

  const handleFriendAction = () => {
    if (friendStatus === "none") {
      setFriendStatus("pending");
      toast.success(`Friend request sent to ${player.name || "Player"}.`);
    } else if (friendStatus === "pending") {
      setFriendStatus("none");
      toast.info("Friend request cancelled.");
    } else {
      setFriendStatus("none");
      toast.info(`Removed ${player.name || "Player"} from friends.`);
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
            alt={player.name || "Player"}
            className="size-full object-cover"
          />
        ) : (
          (player.name || player.username || "P").at(0)
        )}
      </div>
      <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {player.name || `@${player.username || player.displayUsername}`}
          </h1>
          <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
            {player.skillLevel || "open play"}
          </span>
        </div>
        {player.name && (
          <p className="text-muted-foreground text-sm">
            @{player.username || player.displayUsername}
          </p>
        )}

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

        <PlayerHeaderActions
          isOwnProfile={isOwnProfile}
          friendStatus={friendStatus}
          isFollowing={isFollowing}
          isLiked={isLiked}
          playerName={player.name || player.username || "Player"}
          handleFriendAction={handleFriendAction}
          renderFriendButtonContent={renderFriendButtonContent}
          setIsFollowing={setIsFollowing}
          handleLike={handleLike}
          onOpenDM={onOpenDM}
          onOpenChallenge={onOpenChallenge}
        />
      </div>
    </div>
  );
}

const getChallengeBadgeClass = (status: string, result?: string) => {
  if (result === "won") {
    return "bg-green-500/15 text-green-400";
  }
  if (result === "lost") {
    return "bg-red-500/15 text-red-400";
  }
  if (status === "accepted") {
    return "bg-green-500/15 text-green-400";
  }
  if (status === "declined") {
    return "bg-red-500/15 text-red-400";
  }
  return "bg-yellow-500/15 text-yellow-400 animate-pulse";
};

const getChallengeBadgeText = (status: string, result?: string) => {
  if (result === "won") {
    return "Won";
  }
  if (result === "lost") {
    return "Lost";
  }
  if (status === "accepted") {
    return "Accepted";
  }
  if (status === "declined") {
    return "Declined";
  }
  return "Upcoming";
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
    partnerId?: string;
    venue: string;
    venueId?: string;
    courtLabel?: string;
    date: string;
    time: string;
    message: string;
    casted: boolean;
    splitMode: string;
    tipCents: number;
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
  const [challengeDate, setChallengeDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [challengeTime, setChallengeTime] = useState("18:00");
  const [courtLabel, setCourtLabel] = useState("Court 1");
  const [tipDollars, setTipDollars] = useState("5");
  const [challengeMsg, setChallengeMsg] = useState("");
  const [requestCasting, setRequestCasting] = useState(false);
  const [castingSplit, setCastingSplit] = useState("split_2");

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
      courtLabel,
      date: challengeDate,
      message: challengeMsg,
      mode: challengeMode,
      partner: selectedPartner?.name,
      partnerId: selectedPartner?.id,
      splitMode: castingSplit,
      time: challengeTime,
      tipCents: requestCasting ? Math.round(Number(tipDollars) * 100) : 0,
      venue: venues[challengeVenue] || "Crestwood Pickleball Park",
      venueId: challengeVenue.startsWith("demo-") ? undefined : challengeVenue,
    });

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
              <Label htmlFor="challengeCourtInput">Court number or label</Label>
              <Input
                id="challengeCourtInput"
                onChange={(event) => setCourtLabel(event.target.value)}
                placeholder="Court 4"
                value={courtLabel}
              />
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
                  <div className="space-y-1 pt-2">
                    <Label htmlFor="casterTipInput">Optional caster tip</Label>
                    <Input
                      id="casterTipInput"
                      min="0"
                      onChange={(event) => setTipDollars(event.target.value)}
                      step="1"
                      type="number"
                      value={tipDollars}
                    />
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

function useDMChat() {
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

  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    const message = dmMessage.trim();
    if (!message) {
      return;
    }

    setChatLog((prev) => [
      ...prev,
      { sender: "me", text: message, time: "Just now" },
    ]);
    setDmMessage("");

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

  return { chatLog, dmMessage, handleSendDM, setDmMessage };
}

function useProfileActions() {
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<
    "none" | "pending" | "friends"
  >("none");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(18);

  return {
    friendStatus,
    isFollowing,
    isLiked,
    likesCount,
    setFriendStatus,
    setIsFollowing,
    setIsLiked,
    setLikesCount,
  };
}

function buildFeedItems(
  videos: VideoCardData[],
  photosList: PhotoPost[],
  challenges: Challenge[],
  posts: SocialPost[]
): FeedItem[] {
  const items: FeedItem[] = [];

  for (const vid of videos) {
    items.push({ data: vid, id: `video-${vid.id}`, type: "video" });
  }

  for (const photo of photosList) {
    items.push({ data: photo, id: `photo-${photo.id}`, type: "photo" });
  }

  for (const ch of challenges) {
    items.push({ data: ch, id: `challenge-${ch.id}`, type: "challenge" });
  }

  for (const post of posts) {
    items.push({ data: post, id: `post-${post.id}`, type: "post" });
  }

  return items;
}

function ProfileTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: "all" | "videos" | "photos" | "challenges" | "about";
  onTabChange: (
    tab: "all" | "videos" | "photos" | "challenges" | "about"
  ) => void;
}) {
  const tabs: {
    icon: React.ReactNode;
    label: string;
    value: "all" | "videos" | "photos" | "challenges" | "about";
  }[] = [
    { icon: <Grid3X3 className="size-4" />, label: "All", value: "all" },
    { icon: <Video className="size-4" />, label: "Videos", value: "videos" },
    { icon: <Camera className="size-4" />, label: "Photos", value: "photos" },
    {
      icon: <Swords className="size-4" />,
      label: "Challenges",
      value: "challenges",
    },
    { icon: <Users className="size-4" />, label: "About", value: "about" },
  ];

  return (
    <div className="border-b border-border flex justify-center gap-6">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === tab.value
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}

function getFeedItemsForTab(
  activeTab: "all" | "videos" | "photos" | "challenges" | "about",
  allFeedItems: FeedItem[]
): FeedItem[] {
  switch (activeTab) {
    case "all": {
      return allFeedItems;
    }
    case "videos": {
      return allFeedItems.filter((item) => item.type === "video");
    }
    case "photos": {
      return allFeedItems.filter((item) => item.type === "photo");
    }
    case "challenges": {
      return allFeedItems.filter(
        (item) => item.type === "challenge" || item.type === "post"
      );
    }
    default: {
      return [];
    }
  }
}

function useModals() {
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showDMModal, setShowDMModal] = useState(false);

  return {
    setShowChallengeModal,
    setShowDMModal,
    showChallengeModal,
    showDMModal,
  };
}

function useFeedDetailModal() {
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(
    null
  );
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  return {
    feedItems,
    selectedFeedItem,
    setFeedItems,
    setSelectedFeedItem,
  };
}

interface RawPlayer {
  id: string;
  name: string | null;
  username: string | null;
  displayUsername?: string | null;
  image?: string | null;
  skillLevel?: string | null;
  bio?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  onboardingStatus?: string | null;
}

interface RawPhoto {
  id: string;
  description?: string | null;
  title?: string | null;
  thumbnailUrl?: string | null;
  r2Key?: string | null;
}

interface RawChallenge {
  casted?: boolean | null;
  challengedName?: string | null;
  challengerName?: string | null;
  scheduledAt?: string | null;
  id: string;
  message?: string | null;
  matchMode?: string | null;
  partnerName?: string | null;
  result?: string | null;
  castingSplitMode?: string | null;
  status?: string | null;
  venueName?: string | null;
  videoUrl?: string | null;
}

interface RawPost {
  id: string;
  content?: string | null;
  createdAt?: string | null;
}

function transformProfileData(
  player: RawPlayer,
  videos: VideoCardData[],
  photos: RawPhoto[],
  apiChallenges: RawChallenge[],
  apiPosts: RawPost[]
) {
  const location = [player.homeCity, player.homeState]
    .filter(Boolean)
    .join(", ");

  const photosList = photos.map((photo) => ({
    caption: photo.description || photo.title || "",
    comments: [] as { author: string; text: string; time: string }[],
    id: photo.id,
    likes: 0,
    url: photo.thumbnailUrl || photo.r2Key || "",
  }));

  const challenges = apiChallenges.map((ch) => ({
    casted: ch.casted || false,
    challenged: ch.challengedName || "Unknown",
    challenger: ch.challengerName || "Unknown",
    date: ch.scheduledAt
      ? new Date(ch.scheduledAt).toISOString().split("T")[0]
      : "",
    id: ch.id,
    message: ch.message || "",
    mode: ch.matchMode || "singles",
    partner: ch.partnerName || "",
    result: ch.result || "upcoming",
    splitMode: ch.castingSplitMode || "",
    status: ch.status || "issued",
    time: ch.scheduledAt
      ? new Date(ch.scheduledAt).toISOString().split("T")[1].slice(0, 5)
      : "",
    venue: ch.venueName || "Unknown Venue",
    videoUrl: ch.videoUrl || "",
  }));

  const posts = apiPosts.map((post) => ({
    author: player.name || "",
    avatar: player.name?.[0] || "",
    comments: [] as { author: string; text: string; time: string }[],
    content: post.content || "",
    id: post.id,
    liked: false,
    likes: 0,
    time: post.createdAt ? new Date(post.createdAt).toISOString() : "",
  }));

  const allFeedItems = buildFeedItems(videos, photosList, challenges, posts);

  return {
    allFeedItems,
    challenges,
    location,
    photosList,
    posts,
  };
}

interface ProfileTabContentProps {
  activeTab: string;
  player: RawPlayer;
  location: string;
  tabItems: FeedItem[];
  setFeedItems: (items: FeedItem[]) => void;
  setSelectedFeedItem: (item: (FeedItem & { index: number }) | null) => void;
}

function ProfileTabContent({
  activeTab,
  player,
  location,
  tabItems,
  setFeedItems,
  setSelectedFeedItem,
}: ProfileTabContentProps) {
  if (activeTab === "about") {
    return <AboutTab player={player} location={location} />;
  }
  if (tabItems.length > 0) {
    return (
      <ProfileGrid
        items={tabItems}
        onItemClick={(item, index) => {
          setFeedItems(tabItems);
          setSelectedFeedItem({ ...item, index } as FeedItem & {
            index: number;
          });
        }}
      />
    );
  }
  return (
    <EmptyState
      message={`@${player.username || "player"} hasn't posted anything here yet.`}
      title="No content yet"
    />
  );
}

export const Route = createFileRoute("/players/$username")({
  beforeLoad: async () => {
    const session = await authClient.getSession().catch(() => null);
    if (!session?.data) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: PlayerProfilePage,
});

// eslint-disable-next-line complexity
function PlayerProfilePage() {
  const { username: rawUsername } = useParams({ from: "/players/$username" });
  const username = rawUsername.startsWith("@")
    ? rawUsername.slice(1)
    : rawUsername;
  const [activeTab, setActiveTab] = useState<
    "all" | "videos" | "photos" | "challenges" | "about"
  >("all");

  const {
    friendStatus,
    isFollowing,
    isLiked,
    likesCount,
    setFriendStatus,
    setIsFollowing,
    setIsLiked,
    setLikesCount,
  } = useProfileActions();

  const {
    setShowChallengeModal,
    setShowDMModal,
    showChallengeModal,
    showDMModal,
  } = useModals();

  const { chatLog, dmMessage, handleSendDM, setDmMessage } = useDMChat();

  const { feedItems, selectedFeedItem, setFeedItems, setSelectedFeedItem } =
    useFeedDetailModal();

  const { data: sessionData } = authClient.useSession();
  const currentUser = sessionData?.user;

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryFn: async () => {
      try {
        const res = await apiClient.api.players[":username"].$get({
          param: { username },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch player");
        }
        return await res.json();
      } catch (error) {
        const demoPlayer = demoPlayers.find(
          (p) => p.username === username || p.displayUsername === username
        );
        if (demoPlayer) {
          return {
            challenges: [],
            photos: [],
            player: {
              ...demoPlayer,
              displayUsername:
                demoPlayer.displayUsername ?? demoPlayer.username,
            },
            posts: [],
            videos: [],
          };
        }
        throw error;
      }
    },
    queryKey: ["player", username],
  });

  const isOwnProfile =
    currentUser?.id === username ||
    (currentUser?.username &&
      currentUser.username.toLowerCase() === username.toLowerCase()) ||
    (data?.player?.id && currentUser?.id === data.player.id);

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

  if (queryError || !data?.player) {
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

  const {
    player,
    videos = [],
    photos = [],
    challenges: apiChallenges = [],
    posts: apiPosts = [],
  } = data;
  const { location, challenges, allFeedItems } = transformProfileData(
    player,
    videos,
    photos,
    apiChallenges,
    apiPosts
  );

  const handleSendChallenge = async (challengeData: {
    mode: "singles" | "doubles";
    partner?: string;
    partnerId?: string;
    venue: string;
    venueId?: string;
    courtLabel?: string;
    date: string;
    time: string;
    message: string;
    casted: boolean;
    splitMode: string;
    tipCents: number;
  }) => {
    if (currentUser?.id === player.id) {
      toast.error("You cannot challenge yourself.");
      setShowChallengeModal(false);
      return;
    }
    const splitModeMap: Record<
      string,
      "challenger" | "challenged" | "split_evenly"
    > = {
      split_1: "challenger",
      split_2: "split_evenly",
      split_4: "split_evenly",
    };
    try {
      await readApiJson(
        apiClient.api.challenges.$post({
          json: {
            castingSplitMode:
              splitModeMap[challengeData.splitMode] ?? "challenger",
            challengedUserId: player.id,
            courtLabel: challengeData.courtLabel,
            isCasted: challengeData.casted,
            matchMode: challengeData.mode,
            message: challengeData.message || undefined,
            partnerUserId: challengeData.partnerId,
            scheduledAt: new Date(
              `${challengeData.date}T${challengeData.time}`
            ).toISOString(),
            tipCents: challengeData.tipCents,
            venueId: challengeData.venueId,
            venueLabel: challengeData.venue,
          },
        })
      );
      setShowChallengeModal(false);
      toast.success(`Challenge successfully issued to ${player.name}!`);
    } catch {
      toast.error("Could not issue that challenge.");
    }
  };

  const tabItems = getFeedItemsForTab(activeTab, allFeedItems);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-8 animate-in fade-in duration-300">
      {player.onboardingStatus === "pending" && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl p-4 text-sm flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-amber-500/20 rounded-full p-1.5 text-amber-600 dark:text-amber-400">
            <Info className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-xs sm:text-sm">
              Onboarding Setup Pending
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              This player hasn't completed their onboarding yet. Some stats or
              records might not be fully configured.
            </p>
          </div>
        </div>
      )}
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
          if (isOwnProfile) {
            toast.error("You cannot challenge yourself.");
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
        isOwnProfile={isOwnProfile}
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
          <span className="block text-xl font-bold">{challenges.length}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Matches
          </span>
        </div>
      </div>

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="pt-2">
        <ProfileTabContent
          activeTab={activeTab}
          player={player}
          location={location}
          tabItems={tabItems}
          setFeedItems={setFeedItems}
          setSelectedFeedItem={setSelectedFeedItem}
        />
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

      {/* Feed Detail Modal (Instagram-style) */}
      {selectedFeedItem && (
        <FeedDetailModal
          item={selectedFeedItem}
          items={feedItems}
          onClose={() => setSelectedFeedItem(null)}
          onNavigate={(index) => {
            setSelectedFeedItem({ ...feedItems[index], index } as FeedItem & {
              index: number;
            });
          }}
          player={player}
        />
      )}
    </div>
  );
}

interface ProfileGridProps {
  items: FeedItem[];
  onItemClick: (item: FeedItem, index: number) => void;
}

function ProfileGrid({ items, onItemClick }: ProfileGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1 md:gap-3 animate-in fade-in duration-300">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemClick(item, index)}
          className="relative aspect-square rounded-lg overflow-hidden border border-border/40 group/photo cursor-pointer shadow-sm bg-muted w-full h-full p-0 text-left border-none"
        >
          <GridItemContent item={item} />
          <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/50 flex items-center justify-center gap-2 sm:gap-6 opacity-0 group-hover/photo:opacity-100 transition-all text-white font-bold text-xs sm:text-sm">
            <GridItemOverlay item={item} />
          </div>
        </button>
      ))}
    </div>
  );
}

function GridItemContent({ item }: { item: FeedItem }) {
  switch (item.type) {
    case "video": {
      return (
        <div className="size-full bg-muted flex items-center justify-center">
          <Video className="size-8 text-muted-foreground" />
        </div>
      );
    }
    case "photo": {
      const photo = item.data as PhotoPost;
      return (
        <img
          src={photo.url}
          alt={photo.caption}
          className="size-full object-cover transition-transform duration-300 group-hover/photo:scale-105"
        />
      );
    }
    case "challenge": {
      const challenge = item.data as Challenge;
      if (challenge.videoUrl) {
        return (
          <div className="size-full bg-muted flex items-center justify-center">
            <Video className="size-8 text-muted-foreground" />
          </div>
        );
      }
      return (
        <div className="size-full bg-muted flex flex-col items-center justify-center p-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
              {challenge.challenger[0]}
            </div>
            <span className="text-[10px] text-muted-foreground">vs</span>
            <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
              {challenge.challenged[0]}
            </div>
          </div>
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">
            {challenge.venue}
          </span>
        </div>
      );
    }
    case "post": {
      const post = item.data as SocialPost;
      return (
        <div className="size-full bg-muted flex flex-col items-center justify-center p-3">
          <MessageSquare className="size-6 text-muted-foreground mb-1" />
          <p className="text-[9px] text-muted-foreground line-clamp-2 text-center">
            {post.content}
          </p>
        </div>
      );
    }
    default: {
      return null;
    }
  }
}

function GridItemOverlay({ item }: { item: FeedItem }) {
  switch (item.type) {
    case "video": {
      const video = item.data as VideoCardData;
      return (
        <span className="flex items-center gap-1.5">
          <Video className="size-4 fill-current" /> {video.title}
        </span>
      );
    }
    case "photo": {
      const photo = item.data as PhotoPost;
      return (
        <>
          <span className="flex items-center gap-1.5">
            <Heart className="size-4 fill-current text-red-500" /> {photo.likes}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="size-4 fill-current text-sky-400" />{" "}
            {photo.comments.length}
          </span>
        </>
      );
    }
    case "challenge": {
      const challenge = item.data as Challenge;
      return (
        <span className="flex items-center gap-1.5">
          <Swords className="size-4 fill-current" /> {challenge.mode}
        </span>
      );
    }
    case "post": {
      const post = item.data as SocialPost;
      return (
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="size-4 fill-current" /> {post.likes}
        </span>
      );
    }
    default: {
      return null;
    }
  }
}

interface FeedDetailModalProps {
  item: FeedItem & { index: number };
  items: FeedItem[];
  onClose: () => void;
  onNavigate: (index: number) => void;
  player: {
    name: string;
    image?: string | null;
    username?: string | null;
  };
}

function FeedDetailModal({
  item,
  items,
  onClose,
  onNavigate,
  player,
}: FeedDetailModalProps) {
  const currentIndex = item.index;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Navigation Arrows */}
      {hasPrevious && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white bg-black/60 hover:bg-black/80 p-2 rounded-full cursor-pointer transition-colors"
          aria-label="Previous item"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white bg-black/60 hover:bg-black/80 p-2 rounded-full cursor-pointer transition-colors"
          aria-label="Next item"
        >
          <ChevronRight className="size-6" />
        </button>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 text-white bg-black/60 hover:bg-black/80 p-2 rounded-full cursor-pointer transition-colors"
        aria-label="Close"
      >
        <XCircle className="size-6" />
      </button>

      {/* Back Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-20 text-white bg-black/60 hover:bg-black/80 p-2 rounded-full cursor-pointer transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="size-5" />
        <span className="text-xs font-semibold">Back to Grid</span>
      </button>

      {/* Content */}
      <div className="w-full max-w-4xl h-[90vh] bg-card border border-border rounded-xl overflow-hidden flex flex-col md:grid md:grid-cols-2 animate-in scale-in duration-300">
        {/* Left: Content */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-border/40">
          <FeedDetailContent item={item} />
        </div>

        {/* Right: Details */}
        <div className="flex-1 flex flex-col h-full bg-card min-h-0 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/40 flex items-center gap-3 shrink-0 bg-card">
            <div className="size-9 rounded-full border border-primary/20 bg-muted overflow-hidden flex items-center justify-center font-bold text-sm shrink-0">
              {player.image ? (
                <img
                  src={player.image}
                  alt={player.name || "Player"}
                  className="size-full object-cover"
                />
              ) : (
                (player.name || player.username || "P").at(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold text-sm text-foreground truncate">
                {player.name || `@${player.username || player.displayUsername}`}
              </h4>
              <p className="text-[10px] text-muted-foreground truncate">
                @{player.username || "player"}
              </p>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <FeedDetailInfo item={item} />
          </div>

          {/* Footer: Navigation dots */}
          <div className="p-3 border-t border-border/40 shrink-0 bg-card">
            <div className="flex items-center justify-center gap-1.5">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onNavigate(index)}
                  className={`size-2 rounded-full transition-all cursor-pointer ${
                    index === currentIndex
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to item ${index + 1}`}
                />
              ))}
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              {currentIndex + 1} of {items.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedDetailContent({ item }: { item: FeedItem }) {
  switch (item.type) {
    case "video": {
      return (
        <div className="size-full flex items-center justify-center">
          <Video className="size-16 text-muted-foreground" />
        </div>
      );
    }
    case "photo": {
      const photo = item.data as PhotoPost;
      return (
        <img
          src={photo.url}
          alt={photo.caption}
          className="size-full object-contain"
        />
      );
    }
    case "challenge": {
      const challenge = item.data as Challenge;
      if (challenge.videoUrl) {
        return (
          <div className="size-full flex items-center justify-center">
            <Video className="size-16 text-muted-foreground" />
          </div>
        );
      }
      return (
        <div className="size-full flex flex-col items-center justify-center p-6 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-16 rounded-full bg-primary/30 flex items-center justify-center text-2xl font-bold border-2 border-primary">
              {challenge.challenger[0]}
            </div>
            <span className="text-xl font-bold text-muted-foreground">vs</span>
            <div className="size-16 rounded-full bg-primary/30 flex items-center justify-center text-2xl font-bold border-2 border-primary">
              {challenge.challenged[0]}
            </div>
          </div>
          <h3 className="text-lg font-bold text-center">
            {challenge.challenger} vs {challenge.challenged}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {challenge.mode} at {challenge.venue}
          </p>
          <span
            className={`mt-3 px-3 py-1 rounded-full text-xs font-bold capitalize ${getChallengeBadgeClass(challenge.status, challenge.result)}`}
          >
            {getChallengeBadgeText(challenge.status, challenge.result)}
          </span>
        </div>
      );
    }
    case "post": {
      const post = item.data as SocialPost;
      return (
        <div className="size-full flex flex-col items-center justify-center p-6 text-white">
          <MessageSquare className="size-12 text-muted-foreground mb-3" />
          <p className="text-sm text-center max-w-md">{post.content}</p>
        </div>
      );
    }
    default: {
      return null;
    }
  }
}

function FeedDetailInfo({ item }: { item: FeedItem }) {
  switch (item.type) {
    case "video": {
      const video = item.data as VideoCardData;
      return (
        <div className="space-y-3">
          <h3 className="font-bold text-sm">{video.title}</h3>
          <p className="text-muted-foreground">Video content details...</p>
        </div>
      );
    }
    case "photo": {
      const photo = item.data as PhotoPost;
      return (
        <div className="space-y-3">
          <p className="text-foreground">{photo.caption}</p>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-red-500">
              <Heart className="size-4 fill-current" /> {photo.likes} Likes
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MessageSquare className="size-4" /> {photo.comments.length}{" "}
              Comments
            </span>
          </div>
          {photo.comments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/20">
              {photo.comments.map((comment, index) => (
                <div key={index} className="flex gap-2">
                  <div className="size-6 rounded-full bg-primary/25 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {comment.author[0]}
                  </div>
                  <div>
                    <span className="font-bold text-[11px]">
                      {comment.author}
                    </span>
                    <p className="text-muted-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "challenge": {
      const challenge = item.data as Challenge;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {challenge.mode}
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded capitalize text-xs ${getChallengeBadgeClass(challenge.status, challenge.result)}`}
            >
              {getChallengeBadgeText(challenge.status, challenge.result)}
            </span>
          </div>

          <h4 className="font-extrabold text-sm">
            {challenge.challenger} challenged {challenge.challenged}
          </h4>

          <div className="grid grid-cols-2 gap-3 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" /> {challenge.date}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" /> {challenge.time}
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <MapPin className="size-3.5 text-primary" /> {challenge.venue}
            </div>
          </div>

          {challenge.message && (
            <div className="bg-muted/40 p-2.5 rounded-lg text-[11px] text-foreground leading-normal border border-border/30">
              "{challenge.message}"
            </div>
          )}

          {challenge.casted && (
            <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[11px] flex justify-between items-center font-medium">
              <span className="flex items-center gap-1">
                <Video className="size-3.5" /> Recording Requested
              </span>
              <span>{getSplitModeText(challenge.splitMode)}</span>
            </div>
          )}

          {challenge.result === "won" && (
            <div className="flex items-center gap-2 text-green-400">
              <Trophy className="size-4" />
              <span className="font-bold text-xs">Victory</span>
            </div>
          )}
          {challenge.result === "lost" && (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="size-4" />
              <span className="font-bold text-xs">Defeat</span>
            </div>
          )}
        </div>
      );
    }
    case "post": {
      const post = item.data as SocialPost;
      return (
        <div className="space-y-3">
          <p className="text-foreground leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-primary">
              <ThumbsUp className="size-4 fill-current" /> {post.likes} Likes
            </span>
          </div>
          {post.comments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/20">
              {post.comments.map((comment, index) => (
                <div key={index} className="flex gap-2">
                  <div className="size-6 rounded-full bg-primary/25 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {comment.author[0]}
                  </div>
                  <div>
                    <span className="font-bold text-[11px]">
                      {comment.author}
                    </span>
                    <p className="text-muted-foreground">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    default: {
      return null;
    }
  }
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
