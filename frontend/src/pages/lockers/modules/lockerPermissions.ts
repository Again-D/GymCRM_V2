import type { PrototypeAuthUser } from "../../../app/auth";
import { hasAnyRole } from "../../../app/roles";

const WORKSPACE_ROLES = [
  "ROLE_SUPER_ADMIN",
  "ROLE_ADMIN",
  "ROLE_MANAGER",
  "ROLE_DESK",
];

const REGISTRATION_ROLES = [
  "ROLE_SUPER_ADMIN",
  "ROLE_ADMIN",
];

export function canAccessLockerWorkspace(
  authUser: PrototypeAuthUser | null | undefined,
  isMockMode: boolean,
) {
  return isMockMode || hasAnyRole(authUser, WORKSPACE_ROLES);
}

export function canRegisterLockerSlots(
  authUser: PrototypeAuthUser | null | undefined,
  isMockMode: boolean,
) {
  return isMockMode || hasAnyRole(authUser, REGISTRATION_ROLES);
}
