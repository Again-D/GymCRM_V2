import { Button, DatePicker, Flex, Space, Typography } from "antd";
import type { MembershipDateFilterState, MembershipPeriodPreset } from "../modules/useMembershipDateFilter";
import dayjs from "dayjs";

const { Text } = Typography;

type MembershipPeriodFilterProps = {
  value: MembershipDateFilterState;
  onPresetChange: (preset: MembershipPeriodPreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

const PRESETS: Array<{ value: Exclude<MembershipPeriodPreset, "">; label: string }> = [
  { value: "1w", label: "1주" },
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
    <Flex vertical gap={8}>
      <Text strong style={{ fontSize: "0.84rem" }}>만료 기간</Text>
      <Space wrap>
        <Button.Group size="small">
          {PRESETS.map((preset) => (
            <Button
              key={preset.value}
              type={value.presetRange === preset.value ? "primary" : "default"}
              onClick={() => onPresetChange(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </Button.Group>
        <Space>
          <DatePicker
            size="small"
            placeholder="시작일"
            value={value.dateFrom ? dayjs(value.dateFrom) : null}
            onChange={(date) => onDateFromChange(date ? date.format("YYYY-MM-DD") : "")}
          />
          <Text type="secondary">~</Text>
          <DatePicker
            size="small"
            placeholder="종료일"
            value={value.dateTo ? dayjs(value.dateTo) : null}
            onChange={(date) => onDateToChange(date ? date.format("YYYY-MM-DD") : "")}
          />
        </Space>
      </Space>
    </Flex>
  );
}
