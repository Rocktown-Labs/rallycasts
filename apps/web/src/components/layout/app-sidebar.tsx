import { Button } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { LogIn, PanelLeftClose, PanelLeftOpen, UserPlus } from "lucide-react";

import UserMenu from "@/components/user-menu";
import { authClient } from "@/lib/auth-client";
import { useProfile } from "@/lib/hooks";

import {
  accountNavItems,
  discoverNavItems,
  organizerNavItems,
} from "./nav-items";

const NavSection = ({
  collapsed,
  items,
  label,
}: {
  collapsed: boolean;
  items:
    | typeof discoverNavItems
    | typeof accountNavItems
    | typeof organizerNavItems;
  label: string;
}) => (
  <div className="space-y-2">
    {collapsed ? (
      <p className="sr-only">{label}</p>
    ) : (
      <p className="px-2 text-xs font-semibold text-primary">{label}</p>
    )}
    <div className="space-y-1">
      {items.map(({ icon: Icon, label: itemLabel, to }) => (
        <Link
          key={to}
          to={to}
          title={collapsed ? itemLabel : undefined}
          activeOptions={{ exact: to === "/" }}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/86 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0"
          )}
          activeProps={{
            className:
              "bg-sidebar-accent text-sidebar-accent-foreground [&_svg]:text-sidebar-accent-foreground",
          }}
        >
          <Icon className="size-4 text-primary" />
          {collapsed ? null : <span className="truncate">{itemLabel}</span>}
        </Link>
      ))}
    </div>
  </div>
);

export default function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { data: session } = authClient.useSession();
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const isOrganizer = profile?.isOrganizer ?? false;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 self-start border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-(--header-height) items-center gap-2 border-b border-sidebar-border px-3">
        <Button
          aria-label="Toggle sidebar"
          size="icon-sm"
          variant="ghost"
          onClick={onToggle}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
        <Link
          to="/"
          className={cn(
            "flex shrink-0 items-center transition-opacity hover:opacity-85",
            collapsed ? "h-7 w-auto" : "h-8 w-auto"
          )}
        >
          <img src="/logo.svg" alt="RallyCasts" className="h-full w-auto" />
        </Link>
      </div>

      <div className="flex-1 space-y-10 overflow-y-auto px-2 py-6">
        <NavSection
          collapsed={collapsed}
          items={discoverNavItems}
          label="Discover"
        />
        {session && (
          <NavSection
            collapsed={collapsed}
            items={accountNavItems}
            label="Your Account"
          />
        )}
        {session && isOrganizer && (
          <NavSection
            collapsed={collapsed}
            items={organizerNavItems}
            label="Organizer Tools"
          />
        )}
      </div>
      <div className="border-t border-sidebar-border p-2">
        {session ? (
          <UserMenu collapsed={collapsed} />
        ) : (
          <div
            className={cn(
              "flex gap-1.5",
              collapsed ? "flex-col items-center" : "flex-col"
            )}
          >
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className={collapsed ? "" : "w-full"}
              title={collapsed ? "Sign Up" : undefined}
            >
              <Button
                className={cn(
                  "bg-primary text-brand-yellow font-semibold hover:bg-primary/95 transition-all shadow-sm rounded-md w-full",
                  collapsed ? "size-8 p-0" : "h-8"
                )}
                variant="default"
              >
                {collapsed ? (
                  <UserPlus className="size-4" />
                ) : (
                  <span>Sign Up</span>
                )}
              </Button>
            </Link>
            <Link
              to="/login"
              search={{ mode: "signin" }}
              className={collapsed ? "" : "w-full"}
              title={collapsed ? "Sign In" : undefined}
            >
              <Button
                className={cn(
                  "border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md w-full",
                  collapsed ? "size-8 p-0" : "h-8"
                )}
                variant="outline"
              >
                {collapsed ? (
                  <LogIn className="size-4" />
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
