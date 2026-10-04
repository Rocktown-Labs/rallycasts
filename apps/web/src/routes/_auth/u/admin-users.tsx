import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Skeleton } from "@rallycaststv/ui/components/skeleton";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/rally/cards";
import {
  useAdminUsers,
  useBanUser,
  useProfile,
  useSetUserRole,
  useUnbanUser,
} from "@/lib/hooks";
import type { AdminUserRecord } from "@/lib/hooks/use-admin-users";

export const Route = createFileRoute("/_auth/u/admin-users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { data: profileData, isLoading: isProfileLoading } = useProfile();
  const isPlatformAdmin = profileData?.isPlatformAdmin ?? false;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { data: users = [], isLoading } = useAdminUsers(query);

  if (isProfileLoading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </main>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          message="Your account is signed in, but it is not configured as a RallyCasts platform admin."
          title="Admin access required"
        />
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <PageHeader
          onSearch={(value) => {
            setQuery(value);
          }}
          search={search}
          setSearch={setSearch}
        />
        <Skeleton className="h-96 rounded-lg" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <PageHeader
        onSearch={(value) => {
          setQuery(value);
        }}
        search={search}
        setSearch={setSearch}
      />
      {users.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          message="No users match this search."
          title="No users found"
        />
      ) : (
        <UserTable users={users} />
      )}
    </main>
  );
}

function PageHeader({
  onSearch,
  search,
  setSearch,
}: {
  onSearch: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <Link
          className="text-muted-foreground hover:text-primary text-sm"
          to="/u/admin"
        >
          <span className="inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Back to operating room
          </span>
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-black">
          <ShieldCheck className="text-primary size-6" /> Manage users
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search by email, assign the admin role, or ban abusive accounts.
          Admins are also granted automatically from the ADMIN_EMAILS list.
        </p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(search.trim());
        }}
      >
        <Input
          aria-label="Search users by email"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by email…"
          value={search}
        />
        <Button type="submit">Search</Button>
      </form>
    </div>
  );
}

function UserTable({ users }: { users: AdminUserRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((record) => (
            <UserRow key={record.id} record={record} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ record }: { record: AdminUserRecord }) {
  const setRole = useSetUserRole();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const pending = setRole.isPending || banUser.isPending || unbanUser.isPending;

  const handleRoleChange = (role: "admin" | "user") => {
    setRole.mutate(
      { role, userId: record.id },
      {
        onError: (error) =>
          toast.error(error.message || "Could not update role."),
        onSuccess: () => toast.success(`Role set to ${role}.`),
      }
    );
  };

  const handleBanToggle = () => {
    if (record.banned) {
      unbanUser.mutate(record.id, {
        onError: (error) =>
          toast.error(error.message || "Could not unban user."),
        onSuccess: () => toast.success("User unbanned."),
      });
      return;
    }
    banUser.mutate(
      { userId: record.id },
      {
        onError: (error) => toast.error(error.message || "Could not ban user."),
        onSuccess: () => toast.success("User banned."),
      }
    );
  };

  return (
    <tr className="border-t">
      <td className="px-4 py-3">
        <p className="font-semibold">{record.name}</p>
        <p className="text-muted-foreground text-xs">{record.email}</p>
      </td>
      <td className="px-4 py-3">
        <select
          aria-label={`Role for ${record.email}`}
          className="bg-background rounded-md border px-2 py-1 text-sm"
          disabled={pending}
          onChange={(event) =>
            handleRoleChange(event.target.value === "admin" ? "admin" : "user")
          }
          value={record.role ?? "user"}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td className="px-4 py-3">
        {record.banned ? (
          <span className="bg-destructive/15 text-destructive rounded-full px-2 py-0.5 text-xs font-semibold">
            Banned{record.banReason ? `: ${record.banReason}` : ""}
          </span>
        ) : (
          <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
            Active
          </span>
        )}
      </td>
      <td className="text-muted-foreground px-4 py-3">
        {new Intl.DateTimeFormat("en", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(record.createdAt))}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          disabled={pending}
          onClick={handleBanToggle}
          size="sm"
          variant={record.banned ? "outline" : "destructive"}
        >
          {record.banned ? "Unban" : "Ban"}
        </Button>
      </td>
    </tr>
  );
}
