import { Button } from "@rallycaststv/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rallycaststv/ui/components/dropdown-menu";
import { Skeleton } from "@rallycaststv/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, ChevronsUpDown, LogOut, Video } from "lucide-react";

import { authClient } from "@/lib/auth-client";

const UserMenu = ({ collapsed = false }: { collapsed?: boolean }) => {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-full rounded-md" />;
  }

  if (!session) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={
              collapsed
                ? "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-9 justify-center rounded-md border-0 p-0"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-11 w-full items-center justify-start gap-3 rounded-md border-0 px-2 text-left"
            }
          />
        }
      >
        <div className="bg-primary/15 text-primary flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name}
              className="size-full object-cover"
            />
          ) : (
            session.user.name.charAt(0).toUpperCase()
          )}
        </div>
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col text-left text-xs leading-tight">
              <span className="text-sidebar-foreground truncate font-semibold">
                {session.user.name}
              </span>
              <span className="text-muted-foreground truncate text-[10px]">
                @
                {session.user.username ??
                  session.user.displayUsername ??
                  "player"}
              </span>
            </div>
            <ChevronsUpDown className="text-muted-foreground ml-auto size-3.5" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-card w-52 min-w-52"
        align="end"
        side="right"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold">
            My Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="text-muted-foreground truncate px-2 py-1.5 text-xs">
            {session.user.email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
            onClick={() => {
              navigate({ to: "/u/casts/new" });
            }}
          >
            <Video className="text-primary size-3.5" />
            <span className="text-xs font-medium">Order a Caster ($20/hr)</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
            onClick={() => {
              navigate({ to: "/u/casts/all" });
            }}
          >
            <Calendar className="text-muted-foreground size-3.5" />
            <span className="text-xs">Casting Requests</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
          >
            <LogOut className="size-3.5" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
