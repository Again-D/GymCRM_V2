export type UserRoleCode =
  | "ROLE_ADMIN"
  | "ROLE_MANAGER"
  | "ROLE_DESK"
  | "ROLE_TRAINER";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type UserAccountRecord = {
  userId: number;
  loginId: string;
  userName: string;
  roleCode: UserRoleCode;
  userStatus: UserStatus;
  passwordChangeRequired: boolean;
  lastLoginAt: string | null;
  accessRevokedAfter: string | null;
};

export type UserAccountCreateRequest = {
  loginId: string;
  userName: string;
  roleCode: UserRoleCode;
  temporaryPassword: string;
};

export type UserAccountLifecycleResponse = {
  userId: number;
  centerId: number;
  loginId: string;
  userName: string;
  roleCode: UserRoleCode;
  userStatus: UserStatus;
  passwordChangeRequired: boolean;
  accessRevokedAfter: string | null;
  revokedRefreshTokenCount: number;
};

export type UserAccountsPageInfo = {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type UserAccountsResponse = {
  items: UserAccountRecord[];
  page: UserAccountsPageInfo;
};

export type UserAccountFilters = {
  q: string;
  roleCode: "" | UserRoleCode;
  userStatus: "" | UserStatus;
  page: number;
  size: number;
};

export const MANAGEABLE_ROLE_OPTIONS: Array<{ label: string; value: UserRoleCode }> = [
  { label: "운영 관리자", value: "ROLE_MANAGER" },
  { label: "데스크", value: "ROLE_DESK" },
  { label: "트레이너", value: "ROLE_TRAINER" },
];

export const SUPER_ADMIN_CREATE_ROLE_OPTIONS: Array<{ label: string; value: UserRoleCode }> = [
  { label: "관리자", value: "ROLE_ADMIN" },
];

export function getCreateRoleOptions(isSuperAdmin: boolean) {
  return isSuperAdmin ? SUPER_ADMIN_CREATE_ROLE_OPTIONS : MANAGEABLE_ROLE_OPTIONS;
}

export const USER_ROLE_FILTER_OPTIONS: Array<{ label: string; value: "" | UserRoleCode }> = [
  { label: "전체", value: "" },
  { label: "관리자", value: "ROLE_ADMIN" },
  { label: "운영 관리자", value: "ROLE_MANAGER" },
  { label: "데스크", value: "ROLE_DESK" },
  { label: "트레이너", value: "ROLE_TRAINER" },
];

export const USER_STATUS_FILTER_OPTIONS: Array<{ label: string; value: "" | UserStatus }> = [
  { label: "전체", value: "" },
  { label: "활성", value: "ACTIVE" },
  { label: "비활성", value: "INACTIVE" },
];

export function createDefaultUserAccountFilters(): UserAccountFilters {
  return {
    q: "",
    roleCode: "",
    userStatus: "",
    page: 1,
    size: 20,
  };
}
