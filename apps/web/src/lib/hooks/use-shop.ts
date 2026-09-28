import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";

import {
  fetchCollectionProducts,
  fetchCollections,
  fetchProductBySlug,
} from "@/lib/fourthwall";
import type { FwOffer, FwPage } from "@/lib/fourthwall";

export const SHOP_COLLECTIONS_QUERY_KEY = ["shop", "collections"] as const;
export const shopOffersQueryKey = (collectionSlug: string) =>
  ["shop", "offers", collectionSlug] as const;
export const shopProductQueryKey = (slug: string) =>
  ["shop", "product", slug] as const;

export const useShopCollections = () =>
  useQuery({
    queryFn: fetchCollections,
    queryKey: SHOP_COLLECTIONS_QUERY_KEY,
    staleTime: 5 * 60 * 1000,
  });

export const useShopOffers = (collectionSlug = "all") =>
  useInfiniteQuery<
    FwPage<FwOffer>,
    Error,
    InfiniteData<FwPage<FwOffer>>,
    ReturnType<typeof shopOffersQueryKey>,
    number
  >({
    getNextPageParam: (lastPage, allPages) =>
      lastPage.paging.hasNextPage ? allPages.length : undefined,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchCollectionProducts(collectionSlug, pageParam),
    queryKey: shopOffersQueryKey(collectionSlug),
    staleTime: 60_000,
  });

export const useShopProduct = (slug: string, enabled = true) =>
  useQuery({
    enabled,
    queryFn: () => fetchProductBySlug(slug),
    queryKey: shopProductQueryKey(slug),
    staleTime: 60_000,
  });
