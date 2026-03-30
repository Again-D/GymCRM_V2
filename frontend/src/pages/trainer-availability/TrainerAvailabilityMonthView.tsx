import { Card, Flex, Tag, Typography, Badge, Space } from "antd";
import type { TrainerAvailabilitySnapshot } from "./modules/types";
import {
  formatAvailabilityTimeRange,
  getAvailabilityStatusLabel,
} from "./modules/types";

const { Text } = Typography;

type TrainerAvailabilityMonthViewProps = {
  snapshot: TrainerAvailabilitySnapshot;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  interactive?: boolean;
};

function getDayNumber(date: string) {
  return Number(date.slice(-2));
}

export function TrainerAvailabilityMonthView({
  snapshot,
  selectedDate,
  onSelectDate,
  interactive = false,
}: TrainerAvailabilityMonthViewProps) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      gap: 12
    }}>
      {snapshot.effectiveDays.map((day) => {
        const isSelected = selectedDate === day.date;
        const isOff = day.availabilityStatus === "OFF";
        const isAvailable = day.availabilityStatus === "AVAILABLE";
        
        const statusColor = isAvailable ? "success" : isOff ? "error" : "default";

        return (
          <Card
            key={day.date}
            size="small"
            hoverable={interactive}
            onClick={() => interactive && onSelectDate?.(day.date)}
            style={{
              borderColor: isSelected ? "#1677ff" : undefined,
              boxShadow: isSelected ? "0 0 0 2px rgba(22, 119, 255, 0.1)" : undefined,
              height: "100%",
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              background: isAvailable ? "#f6ffed" : isOff ? "#fff2f0" : "#fafafa"
            }}
            bodyStyle={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}
          >
            <Flex justify="space-between" align="center">
              <Text strong style={{ fontSize: "1.1rem" }}>{getDayNumber(day.date)}</Text>
              <Badge status={isAvailable ? "success" : isOff ? "error" : "default"} />
            </Flex>
            <Tag color={statusColor} style={{ margin: 0, width: "fit-content", fontSize: "0.75rem", fontWeight: 700 }}>
              {getAvailabilityStatusLabel(day.availabilityStatus)}
            </Tag>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: "0.82rem", display: "block" }}>
                {formatAvailabilityTimeRange(day.startTime, day.endTime)}
              </Text>
              {day.memo && (
                <Text type="secondary" style={{ fontSize: "0.75rem", display: "block", marginTop: 4, lineHeight: 1.4, fontStyle: "italic" }}>
                  {day.memo}
                </Text>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
