import { useCallback, useRef, useState } from "react";

import { toUserFacingErrorMessage } from "../../../app/uiError";
import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";

export type TrainerOption = {
  userId: number;
  centerId: number;
  displayName: string;
};

export function useTrainerOptionsQuery() {
  const [trainerOptions, setTrainerOptions] = useState<TrainerOption[]>([]);
  const [trainerOptionsLoading, setTrainerOptionsLoading] = useState(false);
  const [trainerOptionsError, setTrainerOptionsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<string, TrainerOption[]>());
  const inflightRef = useRef(new Map<string, Promise<TrainerOption[]>>());
  const trainersVersion = useQueryInvalidationVersion("trainers");

  const loadTrainerOptions = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setTrainerOptionsLoading(true);
    setTrainerOptionsError(null);

    try {
      const cacheKey = `${trainersVersion}:auth-trainers`;
      if (cacheRef.current.has(cacheKey)) {
        if (requestIdRef.current !== requestId) return;
        setTrainerOptions(cacheRef.current.get(cacheKey) ?? []);
        return;
      }

      let responsePromise = inflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<TrainerOption[]>("/api/v1/auth/trainers")
          .then((response) => response.data)
          .finally(() => inflightRef.current.delete(cacheKey));
        inflightRef.current.set(cacheKey, responsePromise);
      }

      const nextOptions = await responsePromise;
      if (requestIdRef.current !== requestId) return;
      cacheRef.current.set(cacheKey, nextOptions);
      setTrainerOptions(nextOptions);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setTrainerOptions([]);
      setTrainerOptionsError(toUserFacingErrorMessage(error, "트레이너 목록을 불러오지 못했습니다."));
    } finally {
      if (requestIdRef.current === requestId) {
        setTrainerOptionsLoading(false);
      }
    }
  }, [trainersVersion]);

  const resetTrainerOptions = useCallback(() => {
    requestIdRef.current += 1;
    setTrainerOptions([]);
    setTrainerOptionsLoading(false);
    setTrainerOptionsError(null);
  }, []);

  return {
    trainerOptions,
    trainerOptionsLoading,
    trainerOptionsError,
    loadTrainerOptions,
    resetTrainerOptions,
  } as const;
}
