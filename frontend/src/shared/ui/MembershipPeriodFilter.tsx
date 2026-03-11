import type { MembershipDateFilterState, MembershipPeriodPreset } from "../hooks/useMembershipDateFilter";

type MembershipPeriodFilterProps = {
  value: MembershipDateFilterState;
  onPresetChange: (preset: MembershipPeriodPreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

const PRESETS: Array<{ value: Exclude<MembershipPeriodPreset, "">; label: string }> = [
  { value: "1w", label: "1주일" },
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "6m", label: "6개월" }
];

export function MembershipPeriodFilter({
  value,
  onPresetChange,
  onDateFromChange,
  onDateToChange
}: MembershipPeriodFilterProps) {
  return (
    <div className="membership-period-filter">
      <span className="membership-period-filter-label">회원권 유효기간</span>
      <div className="period-preset-row" role="group" aria-label="빠른 기간 선택">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={`period-preset-chip${value.presetRange === preset.value ? " is-active" : ""}`}
            onClick={() => onPresetChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="period-date-row">
        <label>
          시작일
          <input type="date" value={value.dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        </label>
        <label>
          종료일
          <input type="date" value={value.dateTo} onChange={(event) => onDateToChange(event.target.value)} />
        </label>
      </div>
    </div>
  );
}
