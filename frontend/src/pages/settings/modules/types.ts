export type CenterProfile = {
  centerId: number;
  centerName: string;
  phone: string | null;
  address: string | null;
};

export type CenterProfileFormState = {
  centerName: string;
  phone: string;
  address: string;
};

export function createCenterProfileFormState(profile: CenterProfile): CenterProfileFormState {
  return {
    centerName: profile.centerName,
    phone: profile.phone ?? "",
    address: profile.address ?? "",
  };
}
