import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import type { SocialUser } from "@/lib/hooks/use-conversations";

export interface PostCommentRow {
  content: string;
  createdAt?: string | number | null;
  id: string;
  postId: string;
  userId: string;
}

export interface PostComment {
  author: SocialUser;
  comment: PostCommentRow;
}

export interface CommentsResponse {
  comments: PostComment[];
}

export function useComments(postId?: string) {
  return useQuery({
    enabled: Boolean(postId),
    queryFn: async (): Promise<CommentsResponse> =>
      readApiJson(
        apiClient.api.v1.social.posts[":id"].comments.$get({
          param: { id: postId ?? "" },
        })
      ),
    queryKey: ["comments", postId],
    retry: false,
  });
}

export function useAddComment(postId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: { content: string }) =>
      readApiJson(
        apiClient.api.v1.social.posts[":id"].comments.$post({
          json,
          param: { id: postId ?? "" },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });
}
