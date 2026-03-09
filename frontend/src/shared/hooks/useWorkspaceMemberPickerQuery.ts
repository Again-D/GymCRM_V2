import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { WorkspaceMemberPickerRow } from "../ui/WorkspaceMemberPicker";

type WorkspaceMemberPickerQueryOptions = {
  loadMembers: (keyword?: string) => Promise<WorkspaceMemberPickerRow[]>;
  maxVisibleResults?: number;
  debounceMs?: number;
};

const DEFAULT_MAX_VISIBLE_RESULTS = 8;
const DEFAULT_DEBOUNCE_MS = 250;

export function useWorkspaceMemberPickerQuery({
  loadMembers,
  maxVisibleResults = DEFAULT_MAX_VISIBLE_RESULTS,
  debounceMs = DEFAULT_DEBOUNCE_MS
}: WorkspaceMemberPickerQueryOptions) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<WorkspaceMemberPickerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);
  const loadMembersRef = useRef(loadMembers);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    loadMembersRef.current = loadMembers;
  }, [loadMembers]);

  useEffect(() => {
    if (!deferredQuery) {
      setDebouncedQuery("");
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedQuery(deferredQuery);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, deferredQuery]);

  useEffect(() => {
    let mounted = true;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    void loadMembersRef.current(debouncedQuery || undefined)
      .then((nextRows) => {
        if (!mounted || requestIdRef.current !== requestId) {
          return;
        }
        setRows(nextRows);
      })
      .catch((loadError: unknown) => {
        if (!mounted || requestIdRef.current !== requestId) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "회원 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!mounted || requestIdRef.current !== requestId) {
          return;
        }
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedQuery, reloadToken]);

  return {
    query,
    setQuery,
    rows,
    visibleRows: rows.slice(0, maxVisibleResults),
    loading,
    error,
    setError,
    reload: () => setReloadToken((current) => current + 1)
  } as const;
}
