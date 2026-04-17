import { useQueryClient } from "@tanstack/react-query";

import { apiPost, isMockApiMode } from "../../../api/client";
import { queryKeys } from "../../../app/queryHelpers";
import type {
  UserAccountRecord,
  UserRoleCode,
  UserStatus,
} from "./types";

export function useAccountOpsMutations() {
  const queryClient = useQueryClient();

  async function refreshAccounts() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.authUsers.all });
  }

  async function revokeAccess(user: UserAccountRecord) {
    if (isMockApiMode()) {
      const { revokeMockUserAccess } = await import("../../../api/mockData");
      revokeMockUserAccess(user.userId);
      await refreshAccounts();
      return;
    }

    await apiPost(`/api/v1/auth/users/${user.userId}/revoke-access`);
    await refreshAccounts();
  }

  async function changeRole(user: UserAccountRecord, roleCode: UserRoleCode) {
    if (isMockApiMode()) {
      const { updateMockUserRole } = await import("../../../api/mockData");
      updateMockUserRole(user.userId, roleCode);
      await refreshAccounts();
      return;
    }

    await apiPost(`/api/v1/auth/users/${user.userId}/role`, { roleCode });
    await refreshAccounts();
  }

  async function changeStatus(user: UserAccountRecord, userStatus: UserStatus) {
    if (isMockApiMode()) {
      const { updateMockUserStatus } = await import("../../../api/mockData");
      updateMockUserStatus(user.userId, userStatus);
      await refreshAccounts();
      return;
    }

    await apiPost(`/api/v1/auth/users/${user.userId}/status`, { userStatus });
    await refreshAccounts();
  }

  return {
    revokeAccess,
    changeRole,
    changeStatus,
  } as const;
}
