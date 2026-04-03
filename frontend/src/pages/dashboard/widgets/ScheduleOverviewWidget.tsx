import { ArrowRightOutlined, CalendarOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, Empty, List, Skeleton, Typography } from "antd";
import { Link } from "react-router-dom";
import { useMemo } from "react";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { GxScheduleSnapshot } from "../../gx-schedules/modules/types";
import { getCurrentMonthValue, formatDateTime } from "../../gx-schedules/modules/types";
import type { WidgetBaseProps } from "./types";

const { Text } = Typography;

export default function ScheduleOverviewWidget({ title = "오늘의 수업 일정" }: WidgetBaseProps) {
  const currentMonth = useMemo(() => getCurrentMonthValue(), []);

  const { data, isFetching, isPending, error } = useQuery({
    queryKey: queryKeys.gxSchedules.list({ month: currentMonth }),
    queryFn: async () => {
      const response = await apiGet<GxScheduleSnapshot>(
        `/api/v1/reservations/gx/snapshot?month=${currentMonth}`,
      );
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const isLoading = isFetching || isPending;

  const todaySchedules = useMemo(() => {
    if (!data?.generatedSchedules) return [];

    const todayDate = new Date().toISOString().split("T")[0];
    return data.generatedSchedules
      .filter((s) => s.startAt.startsWith(todayDate))
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [data]);

  if (error) {
    return (
      <Card title={title} variant="borderless">
        <Alert
          type="warning"
          message={toUserFacingErrorMessage(error, "오늘의 수업 스케줄을 불러오지 못했습니다.")}
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={title}
      variant="borderless"
      styles={{ body: { padding: "12px" } }}
      actions={[
        <Link key="link" to="/gx-schedules">
          <Button type="link" icon={<ArrowRightOutlined />} iconPosition="end">
            전체 스케줄 관리
          </Button>
        </Link>,
      ]}
    >
      {isLoading ? (
        <Skeleton active />
      ) : todaySchedules.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="오늘 예정된 수업이 없습니다."
          style={{ padding: "12px 0" }}
        />
      ) : (
        <List
          size="small"
          dataSource={todaySchedules}
          renderItem={(item) => (
            <List.Item
              extra={
                <Badge
                  count={`${item.currentCount}/${item.capacity}`}
                  color={(item.currentCount ?? 0) >= (item.capacity ?? 0) ? "#f5222d" : "#52c41a"}
                />
              }
            >
              <List.Item.Meta
                avatar={<CalendarOutlined style={{ color: "#1890ff", marginTop: 4 }} />}
                title={<Text strong>{item.className}</Text>}
                description={
                  <Text type="secondary" style={{ fontSize: "0.85rem" }}>
                    {formatDateTime(item.startAt).split(" ").slice(1).join(" ")}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
