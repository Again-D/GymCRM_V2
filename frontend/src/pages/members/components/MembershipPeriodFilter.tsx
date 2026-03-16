import type { MembershipDateFilterState, MembershipPeriodPreset } from "../modules/useMembershipDateFilter";

type MembershipPeriodFilterProps = {
  value: MembershipDateFilterState;
  onPresetChange: (preset: MembershipPeriodPreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

const PRESETS: Array<{ value: Exclude<MembershipPeriodPreset, "">; label: string }> = [
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" }
];

export function MembershipPeriodFilter({
  value,
  onPresetChange,
  onDateFromChange,
  onDateToChange
}: MembershipPeriodFilterProps) {
  return (
    <div className="period-filter">
      <span className="text-sm" style={{ fontWeight: 600 }}>만료 기간</span>
      <div className="period-preset-row">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={value.presetRange === preset.value ? "period-chip is-active" : "period-chip"}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => onPresetChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="period-date-row">
        <label>
          <span className="text-xs text-muted">시작일</span>
          <input type="date" value={value.dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        </label>
        <label>
          <span className="text-xs text-muted">종료일</span>
          <input type="date" value={value.dateTo} onChange={(event) => onDateToChange(event.target.value)} />
        </label>
      </div>
    </div>
  );
}
