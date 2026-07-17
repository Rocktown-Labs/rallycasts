import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export type AdminDashboard = Awaited<
  ReturnType<ReturnType<typeof apiClient.api.v1.admin.dashboard.$get>["json"]>
>;

export const useAdminDashboard = (enabled: boolean) =>
  useQuery({
    enabled,
    queryFn: () => readApiJson(apiClient.api.v1.admin.dashboard.$get()),
    queryKey: ["admin", "dashboard"],
  });

export const useRunSearchBackfill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(apiClient.api.v1.admin.search.backfill.$post()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
};
