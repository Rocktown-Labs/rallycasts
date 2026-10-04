import { cn } from "@rallycaststv/ui/lib/utils";
import { Link } from "@tanstack/react-router";

const tabs = [
  { label: "Overview", to: "/u/profile/me" },
  { label: "My RallyCasts", to: "/u/profile/my-rallycasts" },
  { label: "Analytics", to: "/u/profile/analytics" },
  { label: "Earn", to: "/u/profile/earn" },
] as const;

export default function ProfileTabs() {
  return (
    <div className="bg-muted flex w-fit max-w-full overflow-x-auto rounded-md p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: tab.to === "/u/profile/me" }}
          className={cn(
            "text-muted-foreground rounded-md px-4 py-2 text-sm whitespace-nowrap"
          )}
          activeProps={{ className: "bg-background text-foreground shadow-sm" }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
