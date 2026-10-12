import { Button } from "@rallycaststv/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@rallycaststv/ui/components/sheet";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { LogIn, UserPlus } from "lucide-react";

import UserMenu from "@/components/user-menu";
import { authClient } from "@/lib/auth-client";
import { useProfile } from "@/lib/hooks";

import {
  accountNavItems,
  adminNavItems,
  discoverNavItems,
  organizerNavItems,
} from "./nav-items";

const exactActivePaths = new Set(["/", "/u/organizer"]);

interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

const NavSection = ({
  items,
  label,
  onNavigate,
}: {
  items: readonly NavItem[];
  label: string;
  onNavigate: () => void;
}) => (
  <div className="space-y-1">
    <p className="text-primary px-3 pt-2 text-xs font-semibold">{label}</p>
    <div className="space-y-0.5">
      {items.map(({ icon: Icon, label: itemLabel, to }) => (
        <Link
          key={to}
          onClick={onNavigate}
          to={to}
          activeOptions={{ exact: exactActivePaths.has(to) }}
          className={cn(
            "text-foreground/80 hover:bg-muted active:bg-muted flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors active:scale-[0.99]"
          )}
          activeProps={{
            className:
              "bg-primary/10 text-primary font-semibold [&_svg]:text-primary",
          }}
        >
          <Icon className="size-4" />
          <span className="truncate">{itemLabel}</span>
        </Link>
      ))}
    </div>
  </div>
);

interface MobileNavSheetProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export default function MobileNavSheet({
  onOpenChange,
  open,
}: MobileNavSheetProps) {
  const { data: session } = authClient.useSession();
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const isOrganizer = profile?.isOrganizer ?? false;
  const isPlatformAdmin = profileData?.isPlatformAdmin ?? false;

  const closeSheet = () => onOpenChange(false);

  return (
    <Sheet onOpenChange={onOpenChange} open={open} swipeDirection="left">
      <SheetContent
        aria-describedby={undefined}
        className="pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="border-border border-b pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <SheetTitle className="flex items-center gap-2">
            <img alt="RallyCasts" className="h-7 w-auto" src="/logo.svg?v=3" />
          </SheetTitle>
        </SheetHeader>

        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-2 py-4"
        >
          <NavSection
            items={discoverNavItems}
            label="Discover"
            onNavigate={closeSheet}
          />
          {session ? (
            <NavSection
              items={accountNavItems}
              label="Your Account"
              onNavigate={closeSheet}
            />
          ) : null}
          {session && isOrganizer ? (
            <NavSection
              items={organizerNavItems}
              label="Organizer Tools"
              onNavigate={closeSheet}
            />
          ) : null}
          {session && isPlatformAdmin ? (
            <NavSection
              items={adminNavItems}
              label="Platform"
              onNavigate={closeSheet}
            />
          ) : null}
        </nav>

        <div className="border-border border-t p-2">
          {session ? (
            <UserMenu />
          ) : (
            <div className="flex flex-col gap-1.5">
              <Link
                onClick={closeSheet}
                search={{ mode: "signup" }}
                to="/login"
              >
                <Button className="w-full rounded-md font-semibold">
                  <UserPlus className="size-4" /> Sign Up
                </Button>
              </Link>
              <Link
                onClick={closeSheet}
                search={{ mode: "signin" }}
                to="/login"
              >
                <Button className="w-full rounded-md" variant="outline">
                  <LogIn className="size-4" /> Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
