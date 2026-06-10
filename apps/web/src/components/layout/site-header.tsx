import Breadcrumbs from "@/components/layout/breadcrumbs";
import NotificationButton from "@/components/layout/notification-button";
import SearchForm from "@/components/layout/search-form";
import ThemeToggle from "@/components/layout/theme-toggle";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="grid min-h-(--header-height) grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
        <Breadcrumbs />
        <SearchForm />
        <div className="flex justify-end gap-1">
          <NotificationButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
