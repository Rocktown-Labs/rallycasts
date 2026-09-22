import { Link } from "@tanstack/react-router";

import Breadcrumbs from "@/components/layout/breadcrumbs";
import CartButton from "@/components/layout/cart-button";
import NotificationButton from "@/components/layout/notification-button";
import SearchForm from "@/components/layout/search-form";
import ThemeToggle from "@/components/layout/theme-toggle";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="grid min-h-(--header-height) grid-cols-[auto_1fr_auto] items-center gap-3 px-3 md:grid-cols-[1fr_2fr_1fr] md:gap-4 md:px-4">
        <div className="flex items-center min-w-0">
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
    </header>
  );
}
