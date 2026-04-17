import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPatch, isMockApiMode } from "../../../api/client";
import { queryKeys } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { CenterProfile, CenterProfileFormState } from "./types";

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildCenterProfilePayload(formState: CenterProfileFormState) {
  const centerName = formState.centerName.trim();
  if (!centerName) {
    return { error: "센터명을 입력해야 합니다." } as const;
  }

  return {
    value: {
      centerName,
      phone: normalizeOptionalText(formState.phone),
      address: normalizeOptionalText(formState.address),
    },
  } as const;
}

export function useUpdateCenterProfileMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation<CenterProfile, Error, CenterProfileFormState>({
    mutationFn: async (formState: CenterProfileFormState) => {
      const parsed = buildCenterProfilePayload(formState);
      if ("error" in parsed) {
        throw new Error(parsed.error);
      }

      if (isMockApiMode()) {
        const { updateMockCenterProfile } = await import("../../../api/mockData");
        return updateMockCenterProfile(parsed.value);
      }

      const response = await apiPatch<CenterProfile>("/api/v1/centers/me", parsed.value);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.centers.all });
    },
  });

  return {
    updateCenterProfile: mutation.mutateAsync,
    updatingCenterProfile: mutation.isPending,
    updateCenterProfileError: mutation.error
      ? toUserFacingErrorMessage(
          mutation.error,
          "센터 프로필을 저장하지 못했습니다.",
        )
      : null,
  } as const;
}
