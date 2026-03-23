import type { PrototypeAuthUser } from "./auth";

export function getAuthRoles(authUser: PrototypeAuthUser | null | undefined) {
  return authUser?.roles ?? [];
}

export function getPrimaryRole(authUser: PrototypeAuthUser | null | undefined) {
  return authUser?.primaryRole ?? null;
}

export function hasRole(authUser: PrototypeAuthUser | null | undefined, expectedRole: string) {
  return getAuthRoles(authUser).includes(expectedRole);
}

export function hasAnyRole(
  authUser: PrototypeAuthUser | null | undefined,
  expectedRoles: string[] | null | undefined
) {
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }
  const roles = getAuthRoles(authUser);
  return expectedRoles.some((role) => roles.includes(role));
}

export function createAuthIdentityKey(authUser: PrototypeAuthUser | null | undefined) {
  if (!authUser) {
    return "anonymous";
  }
  const normalizedRoles = [...getAuthRoles(authUser)].sort().join(",");
  return `${authUser.userId}:${normalizedRoles}`;
}
