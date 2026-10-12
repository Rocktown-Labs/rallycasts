import { Button } from "@rallycaststv/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import Breadcrumbs from "@/components/layout/breadcrumbs";
import CartButton from "@/components/layout/cart-button";
import MobileNavSheet from "@/components/layout/mobile-nav-sheet";
import NotificationButton from "@/components/layout/notification-button";
import SearchForm from "@/components/layout/search-form";
import ThemeToggle from "@/components/layout/theme-toggle";

export default function SiteHeader() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="border-border bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="grid min-h-(--header-height) grid-cols-[auto_1fr_auto] items-center gap-3 px-3 md:grid-cols-[1fr_2fr_1fr] md:gap-4 md:px-4">
        <div className="flex min-w-0 items-center gap-1">
          {/* Full navigation lives behind this menu on small screens — the
              bottom bar only shows a subset, and organizer/admin tools were
              previously unreachable. */}
          <Button
            aria-label="Open navigation menu"
            className="md:hidden"
            onClick={() => setNavOpen(true)}
            size="icon"
            variant="ghost"
          >
            <Menu className="size-5" />
          </Button>
          <Link to="/" className="flex shrink-0 items-center md:hidden">
            <img src="/logo.svg?v=3" alt="RallyCasts" className="h-7 w-auto" />
          </Link>
          <Breadcrumbs />
        </div>
        <SearchForm />
        <div className="flex justify-end gap-1">
          <CartButton />
          <NotificationButton />
          <ThemeToggle />
        </div>
      </div>
      <MobileNavSheet onOpenChange={setNavOpen} open={navOpen} />
    </header>
  );
}
