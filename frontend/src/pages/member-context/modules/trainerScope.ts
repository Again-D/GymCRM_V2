import type { PrototypeAuthUser } from "../../../app/auth";
import { hasRole } from "../../../app/roles";

const useMockData = import.meta.env.VITE_REBUILD_MOCK_DATA === "1" || import.meta.env.MODE === "test";

export async function filterMemberIdsForAuth<T extends { memberId: number }>(
  items: T[],
  authUser: PrototypeAuthUser | null
) {
  if (!useMockData || !authUser || !hasRole(authUser, "ROLE_TRAINER")) {
    return items;
  }

  const { getTrainerScopedMemberIds } = await import("../../../api/mockData");
  const allowedMemberIds = getTrainerScopedMemberIds(authUser.userId);
  return items.filter((item) => allowedMemberIds.has(item.memberId));
}

export async function canAuthUserAccessMember(memberId: number, authUser: PrototypeAuthUser | null) {
  if (!useMockData || !authUser || !hasRole(authUser, "ROLE_TRAINER")) {
    return true;
  }

  const { getTrainerScopedMemberIds } = await import("../../../api/mockData");
  return getTrainerScopedMemberIds(authUser.userId).has(memberId);
}
