import type { TrainerOption } from "../../memberships/modules/useTrainerOptionsQuery";

export function buildTrainerSettlementScopeOptions(trainerOptions: TrainerOption[]) {
  return [
    { label: "전체 트레이너", value: "ALL" },
    ...trainerOptions.map((trainer) => ({
      label: trainer.userName,
      value: String(trainer.userId)
    }))
  ];
}
