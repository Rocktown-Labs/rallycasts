import { cn } from "@rallycaststv/ui/lib/utils";
import { Link } from "@tanstack/react-router";

import { mobileNavItems } from "./nav-items";

export default function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileNavItems.map(({ icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[0.68rem] text-muted-foreground"
            )}
            activeProps={{
              className:
                "bg-primary text-brand-yellow [&_svg]:text-brand-yellow",
            }}
          >
            <Icon className="size-4 text-primary" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
