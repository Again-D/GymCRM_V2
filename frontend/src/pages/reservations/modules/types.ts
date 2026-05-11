export type ReservationPolicySummary = {
  centerId: number;
  source: string;
  ptDeductionTiming: "COMPLETION" | "RESERVATION";
  gxWaitlistMode: "AUTO_PROMOTION" | "MANUAL";
  cancellationCutoffMinutes: number;
  reminderLeadMinutes: number;
};
