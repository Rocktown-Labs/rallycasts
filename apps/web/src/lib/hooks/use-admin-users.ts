import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

export interface AdminUserRecord {
  banReason?: string | null;
  banned?: boolean | null;
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  role?: string | null;
}

const toAdminUsers = (value: unknown): AdminUserRecord[] => {
  if (!value || typeof value !== "object") {
    return [];
  }
  const { users } = value as { users?: unknown };
  return Array.isArray(users) ? (users as AdminUserRecord[]) : [];
};

export const useAdminUsers = (search: string) =>
  useQuery({
    queryFn: async (): Promise<AdminUserRecord[]> => {
      const { data, error } = await authClient.admin.listUsers({
        query: {
          limit: 50,
          searchField: "email",
          searchValue: search || undefined,
        },
      });
      if (error) {
        throw new Error(error.message ?? "Could not load users");
      }
      return toAdminUsers(data);
    },
    queryKey: ["admin", "users", search],
  });

export const useSetUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      role,
      userId,
    }: {
      role: "admin" | "user";
      userId: string;
    }) => {
      const { error } = await authClient.admin.setRole({ role, userId });
      if (error) {
        throw new Error(error.message ?? "Could not update role");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reason,
      userId,
    }: {
      reason?: string;
      userId: string;
    }) => {
      const { error } = await authClient.admin.banUser({
        banReason: reason,
        userId,
      });
      if (error) {
        throw new Error(error.message ?? "Could not ban user");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

export const useUnbanUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.unbanUser({ userId });
      if (error) {
        throw new Error(error.message ?? "Could not unban user");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};
