import { useEffect, useRef } from "react";

type UseWorkspaceMemberSearchLoaderOptions = {
  invalidationVersion?: number;
};

export function useWorkspaceMemberSearchLoader<T>(
  fetchRows: (keyword?: string) => Promise<T[]>,
  options?: UseWorkspaceMemberSearchLoaderOptions
) {
  const cacheRef = useRef(new Map<string, T[]>());
  const inFlightRef = useRef(new Map<string, Promise<T[]>>());

  function invalidate() {
    cacheRef.current.clear();
    inFlightRef.current.clear();
  }

  async function load(keyword?: string) {
    const normalizedKeyword = keyword?.trim().toLowerCase() ?? "";
    const cachedRows = cacheRef.current.get(normalizedKeyword);
    if (cachedRows) {
      return cachedRows;
    }

    const inFlight = inFlightRef.current.get(normalizedKeyword);
    if (inFlight) {
      return inFlight;
    }

    const request = fetchRows(normalizedKeyword || undefined).then((rows) => {
      cacheRef.current.set(normalizedKeyword, rows);
      return rows;
    });

    inFlightRef.current.set(normalizedKeyword, request);

    try {
      return await request;
    } finally {
      inFlightRef.current.delete(normalizedKeyword);
    }
  }

  useEffect(() => {
    invalidate();
  }, [options?.invalidationVersion]);

  return {
    load,
    invalidate
  } as const;
}
