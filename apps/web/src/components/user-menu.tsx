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
                ? "size-9 p-0 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 justify-center flex"
                : "w-full h-11 justify-start gap-3 px-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 text-left flex items-center"
            }
          />
        }
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold overflow-hidden">
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
            <div className="flex flex-1 flex-col text-left text-xs leading-tight min-w-0">
              <span className="truncate font-semibold text-sidebar-foreground">
                {session.user.name}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                @
                {session.user.username ??
                  session.user.displayUsername ??
                  "player"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
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
          <DropdownMenuLabel className="font-semibold text-xs py-1.5 px-2">
            My Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
            {session.user.email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer py-1.5 px-2"
            onClick={() => {
              navigate({ to: "/u/casts/new" });
            }}
          >
            <Video className="size-3.5 text-primary" />
            <span className="font-medium text-xs">Order a Caster ($20/hr)</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer py-1.5 px-2"
            onClick={() => {
              navigate({ to: "/u/casts/all" });
            }}
          >
            <Calendar className="size-3.5 text-muted-foreground" />
            <span className="text-xs">Casting Requests</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="flex items-center gap-2 cursor-pointer py-1.5 px-2"
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
