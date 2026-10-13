import { Button } from "@rallycaststv/ui/components/button";
import { Image, Loader2, MapPin, Trophy, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useCreateOrganizationPost } from "@/lib/hooks/use-organizations";
import { useImageUpload } from "@/lib/hooks/use-upload";

interface OrganizationComposerProps {
  isMember?: boolean;
  onPostCreated?: () => void;
  organizationName: string;
  slug: string;
  userRole?: string | null;
}

interface ComposerRoleBadgeProps {
  isMember?: boolean;
  userRole?: string | null;
}

function ComposerRoleBadge({ isMember, userRole }: ComposerRoleBadgeProps) {
  if (userRole) {
    return (
      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] capitalize">
        {userRole}
      </span>
    );
  }
  if (isMember) {
    return (
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
        Member
      </span>
    );
  }
  return (
    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px]">
      Posting as Community
    </span>
  );
}

export function OrganizationComposer({
  isMember,
  onPostCreated,
  organizationName,
  slug,
  userRole,
}: OrganizationComposerProps) {
  const { data: session } = authClient.useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUploadMutation = useImageUpload();
  const createPostMutation = useCreateOrganizationPost(slug);

  const handleImageFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { files } = event.target;
    if (!files || files.length === 0) {
      return;
    }
    const [file] = files;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    try {
      const result = await imageUploadMutation.mutateAsync(file);
      if (typeof result?.url === "string") {
        const imageUrl = result.url;
        setAttachedImages((prev) => [...prev, imageUrl]);
        toast.success("Image attached!");
        setIsExpanded(true);
      }
    } catch {
      toast.error("Could not upload image.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed && attachedImages.length === 0) {
      toast.error("Please add some text or photos to your post.");
      return;
    }
    if (!session?.user) {
      toast.error("Please sign in to post.");
      return;
    }

    createPostMutation.mutate(
      {
        content: trimmed || "Shared photos to the group",
        mediaUrls: attachedImages,
      },
      {
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to create post."
          );
        },
        onSuccess: () => {
          setContent("");
          setAttachedImages([]);
          setIsExpanded(false);
          toast.success("Posted to the group!");
          onPostCreated?.();
        },
      }
    );
  };

  return (
    <div className="bg-card text-card-foreground border-border rounded-2xl border shadow-sm">
      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelect}
        type="file"
      />

      <div className="p-4">
        {/* Top Composer Trigger */}
        <div className="flex items-start gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-full bg-neutral-800">
            {session?.user?.image ? (
              <img
                alt=""
                className="size-full object-cover"
                src={session.user.image}
              />
            ) : (
              <div className="bg-primary/20 text-primary grid size-full place-items-center text-sm font-bold">
                {session?.user?.name?.[0] ?? "U"}
              </div>
            )}
          </div>

          <div className="flex-1">
            {isExpanded ? (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{session?.user?.name}</span>
                    <ComposerRoleBadge
                      isMember={isMember}
                      userRole={userRole}
                    />
                  </div>
                  <button
                    aria-label="Collapse composer"
                    className="text-muted-foreground hover:text-foreground p-1"
                    onClick={() => {
                      setContent("");
                      setAttachedImages([]);
                      setIsExpanded(false);
                    }}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <textarea
                  autoFocus
                  className="border-input bg-background focus:ring-primary min-h-[110px] w-full rounded-xl border p-3 text-sm focus:ring-2 focus:outline-none"
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`What's happening at ${organizationName}? Share scores, open court updates, tourney prep...`}
                  value={content}
                />

                {/* Attached Images Preview Grid */}
                {attachedImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {attachedImages.map((imageUrl, idx) => (
                      <div
                        className="group relative h-28 overflow-hidden rounded-xl border bg-black"
                        key={imageUrl}
                      >
                        <img
                          alt=""
                          className="size-full object-cover"
                          src={imageUrl}
                        />
                        <button
                          aria-label="Remove photo"
                          className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white shadow transition hover:bg-black/90"
                          onClick={() => handleRemoveImage(idx)}
                          type="button"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {imageUploadMutation.isPending ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Uploading photo...</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t pt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
                      disabled={imageUploadMutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Image className="size-4 text-emerald-500" />
                      <span>Photo</span>
                    </Button>
                    <Button
                      className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-amber-500"
                      onClick={() => {
                        setContent((prev) => `${prev} 🎾 Score: `);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trophy className="size-4" />
                      <span>Score</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      className="h-8 text-xs"
                      onClick={() => setIsExpanded(false)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="h-8 rounded-lg px-4 text-xs font-semibold"
                      disabled={
                        createPostMutation.isPending ||
                        imageUploadMutation.isPending ||
                        (!content.trim() && attachedImages.length === 0)
                      }
                      size="sm"
                      type="submit"
                    >
                      {createPostMutation.isPending ? (
                        <>
                          <Loader2 className="mr-1.5 size-3 animate-spin" />{" "}
                          Posting...
                        </>
                      ) : (
                        "Post to Group"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <button
                className="bg-muted/60 hover:bg-muted text-muted-foreground w-full rounded-full px-4 py-2.5 text-left text-sm transition"
                onClick={() => setIsExpanded(true)}
                type="button"
              >
                Write something to {organizationName}...
              </button>
            )}
          </div>
        </div>

        {/* Quick Action Buttons Row (When collapsed) */}
        {isExpanded ? null : (
          <div className="border-border/60 mt-3 grid grid-cols-3 border-t pt-2">
            <button
              className="hover:bg-muted text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs font-semibold transition active:scale-95"
              onClick={() => {
                setIsExpanded(true);
                fileInputRef.current?.click();
              }}
              type="button"
            >
              <Image className="size-4 text-emerald-500" />
              <span>Photo/Video</span>
            </button>
            <button
              className="hover:bg-muted text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs font-semibold transition active:scale-95"
              onClick={() => {
                setIsExpanded(true);
                setContent((prev) => `${prev} 📍 Playing at courts `);
              }}
              type="button"
            >
              <MapPin className="size-4 text-rose-500" />
              <span>Check-in</span>
            </button>
            <button
              className="hover:bg-muted text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs font-semibold transition active:scale-95"
              onClick={() => {
                setIsExpanded(true);
                setContent((prev) => `${prev} 🏆 Match Score: `);
              }}
              type="button"
            >
              <Trophy className="size-4 text-amber-500" />
              <span>Match</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
