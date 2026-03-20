import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import type { TrainerFilters, TrainerSummary } from "./types";

type UseTrainersQueryOptions = {
  getDefaultFilters: () => TrainerFilters;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useTrainersQuery({ getDefaultFilters }: UseTrainersQueryOptions) {
  const [trainers, setTrainers] = useState<TrainerSummary[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [trainersQueryError, setTrainersQueryError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<string, TrainerSummary[]>());
  const inflightRef = useRef(new Map<string, Promise<TrainerSummary[]>>());
  const getDefaultFiltersRef = useLatestRef(getDefaultFilters);
  const trainersVersion = useQueryInvalidationVersion("trainers");

  const loadTrainers = useCallback(
    async (filters?: TrainerFilters) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setTrainersLoading(true);
      setTrainersQueryError(null);

      try {
        const effectiveFilters = filters ?? getDefaultFiltersRef.current();
        const params = new URLSearchParams();
        if (effectiveFilters.centerId > 0) {
          params.set("centerId", String(effectiveFilters.centerId));
        }
        if (effectiveFilters.keyword.trim()) {
          params.set("keyword", effectiveFilters.keyword.trim());
        }
        if (effectiveFilters.status) {
          params.set("status", effectiveFilters.status);
        }
        const query = params.toString();
        const cacheKey = `${trainersVersion}:${query}`;
        if (cacheRef.current.has(cacheKey)) {
          if (requestIdRef.current !== requestId) return;
          setTrainers(cacheRef.current.get(cacheKey) ?? []);
          return;
        }

        let responsePromise = inflightRef.current.get(cacheKey);
        if (!responsePromise) {
          responsePromise = apiGet<TrainerSummary[]>(
            `/api/v1/trainers${query ? `?${query}` : ""}`,
          )
            .then((response) => response.data)
            .finally(() => inflightRef.current.delete(cacheKey));
          inflightRef.current.set(cacheKey, responsePromise);
        }

        const nextTrainers = await responsePromise;
        if (requestIdRef.current !== requestId) return;
        cacheRef.current.set(cacheKey, nextTrainers);
        setTrainers(nextTrainers);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        setTrainers([]);
        setTrainersQueryError(
          error instanceof Error
            ? error.message
            : "트레이너 목록을 불러오지 못했습니다.",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setTrainersLoading(false);
        }
      }
    },
    [trainersVersion],
  );

  const resetTrainersQuery = useCallback(() => {
    requestIdRef.current += 1;
    setTrainers([]);
    setTrainersLoading(false);
    setTrainersQueryError(null);
  }, []);

  return {
    trainers,
    trainersLoading,
    trainersQueryError,
    loadTrainers,
    resetTrainersQuery,
  } as const;
}
