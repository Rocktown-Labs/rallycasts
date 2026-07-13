import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export const useOrganizations = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.organizations.$get()),
    queryKey: ["organizations"],
  });

export const useMyOrganizations = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.organizations.me.$get()),
    queryKey: ["organizations", "me"],
  });

export const useOrganization = (slug: string) =>
  useQuery({
    enabled: slug.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.organizations[":slug"].$get({ param: { slug } })
      ),
    queryKey: ["organization", slug],
  });

export const useUpdateOrganization = (slug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      bio?: string;
      city?: string;
      logoUrl?: string;
      name?: string;
      state?: string;
    }) =>
      readApiJson(
        apiClient.api.organizations[":slug"].$patch({
          json,
          param: { slug },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({
        queryKey: ["organizations", "me"],
      });
    },
  });
};

export const useAddOrganizationMember = (slug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { role: "admin" | "editor"; username: string }) =>
      readApiJson(
        apiClient.api.organizations[":slug"].members.$post({
          json,
          param: { slug },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      await queryClient.invalidateQueries({
        queryKey: ["organizations", "me"],
      });
    },
  });
};
