import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export const useOrganizations = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.hosts.$get()),
    queryKey: ["organizations"],
  });

export const useMyOrganizations = (enabled = true) =>
  useQuery({
    enabled,
    queryFn: () => readApiJson(apiClient.api.v1.hosts.me.$get()),
    queryKey: ["organizations", "me"],
  });

export const useOrganization = (slug: string) =>
  useQuery({
    enabled: slug.length > 0,
    queryFn: () =>
      readApiJson(apiClient.api.v1.hosts[":slug"].$get({ param: { slug } })),
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
        apiClient.api.v1.hosts[":slug"].$patch({
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
      await queryClient.invalidateQueries({ queryKey: ["hosts"] });
    },
  });
};

export const useAddOrganizationMember = (slug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { role: "admin" | "editor"; username: string }) =>
      readApiJson(
        apiClient.api.v1.hosts[":slug"].members.$post({
          json,
          param: { slug },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      await queryClient.invalidateQueries({
        queryKey: ["organizations", "me"],
      });
      await queryClient.invalidateQueries({ queryKey: ["hosts"] });
    },
  });
};

export const useJoinOrganization = (slug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.hosts[":slug"].join.$post({
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

export const useLeaveOrganization = (slug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.hosts[":slug"].leave.$post({
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

export const useCreateOrganizationPost = (slug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      content: string;
      imageUrl?: string;
      mediaUrls?: string[];
    }) =>
      readApiJson(
        apiClient.api.v1.hosts[":slug"].posts.$post({
          json,
          param: { slug },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
    },
  });
};

export const useHosts = useOrganizations;
export const useMyHosts = useMyOrganizations;
export const useHost = useOrganization;
export const useUpdateHost = useUpdateOrganization;
export const useAddHostMember = useAddOrganizationMember;
export const useJoinHost = useJoinOrganization;
export const useLeaveHost = useLeaveOrganization;
export const useCreateHostPost = useCreateOrganizationPost;
