import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rallycasts:recent-searches";
const MAX_SEARCHES = 25;
const MIN_SEARCH_LENGTH = 2;

function parseSearches(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is string => typeof item === "string" && item.length > 0
    );
  } catch {
    return [];
  }
}

export function useRecentSearches(limit = MAX_SEARCHES) {
  const [searches, setSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      let stored: string[] = [];
      try {
        stored = parseSearches(await AsyncStorage.getItem(STORAGE_KEY));
      } catch {
        stored = [];
      } finally {
        if (mounted) {
          setSearches(stored.slice(0, limit));
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [limit]);

  const addRecentSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < MIN_SEARCH_LENGTH) {
        return;
      }

      try {
        const stored = parseSearches(await AsyncStorage.getItem(STORAGE_KEY));
        const next = [
          trimmed,
          ...stored.filter(
            (item) => item.toLowerCase() !== trimmed.toLowerCase()
          ),
        ].slice(0, MAX_SEARCHES);

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSearches(next.slice(0, limit));
      } catch {
        // Search history is best-effort; ignore storage failures.
      }
    },
    [limit]
  );

  const removeRecentSearch = useCallback(
    async (query: string) => {
      const lowered = query.trim().toLowerCase();
      if (!lowered) {
        return;
      }

      try {
        const stored = parseSearches(await AsyncStorage.getItem(STORAGE_KEY));
        const next = stored.filter(
          (item) => item.toLowerCase() !== lowered
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSearches(next.slice(0, limit));
      } catch {
        // Ignore storage failures.
      }
    },
    [limit]
  );

  const clearRecentSearches = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
    setSearches([]);
  }, []);

  return {
    addRecentSearch,
    clearRecentSearches,
    isLoading,
    removeRecentSearch,
    searches,
  };
}
