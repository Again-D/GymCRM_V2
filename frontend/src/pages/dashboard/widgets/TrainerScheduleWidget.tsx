import { ArrowRightOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, Empty, List, Skeleton, Typography } from "antd";
import { Link } from "react-router-dom";
import { useMemo } from "react";

import { apiGet } from "../../../api/client";
import { useAuthState } from "../../../app/auth";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { ReservationScheduleSummary } from "../../members/modules/types";
import type { WidgetBaseProps } from "./types";

const { Text } = Typography;

export default function TrainerScheduleWidget({ title = "나의 오늘 수업" }: WidgetBaseProps) {
  const { authUser } = useAuthState();
  
  const { data, isFetching, isPending, error } = useQuery({
    queryKey: queryKeys.reservations.list({ scope: "schedules" }),
    queryFn: async () => {
      const response = await apiGet<ReservationScheduleSummary[]>("/api/v1/reservations/schedules");
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const isLoading = isFetching || isPending;

  const todayMySchedules = useMemo(() => {
    if (!data || !authUser) return [];

    const todayDate = new Date().toISOString().split("T")[0];
    
    return data
      .filter((s) => {
        const isMySchedule = s.trainerUserId === authUser.userId;
        const isToday = s.startAt.startsWith(todayDate);
        return isMySchedule && isToday;
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [data, authUser]);

  if (error) {
    return (
      <Card title={title} bordered={false}>
        <Alert
          type="warning"
          message={toUserFacingErrorMessage(error, "수업 내역을 불러오지 못했습니다.")}
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={title}
      bordered={false}
      styles={{ body: { padding: "12px" } }}
      actions={[
        <Link key="link" to="/reservations">
          <Button type="link" icon={<ArrowRightOutlined />} iconPosition="end">
            예약 관리 열기
          </Button>
        </Link>,
      ]}
    >
      {isLoading ? (
        <Skeleton active />
      ) : todayMySchedules.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="오늘 예정된 수업이 없습니다."
          style={{ padding: "12px 0" }}
        />
      ) : (
        <List
          size="small"
          dataSource={todayMySchedules}
          renderItem={(item) => (
            <List.Item
              extra={
                <Badge
                  count={`${item.currentCount}/${item.capacity}`}
                  color={(item.currentCount ?? 0) >= (item.capacity ?? 0) ? "#f5222d" : "#1890ff"}
                />
              }
            >
              <List.Item.Meta
                avatar={<ClockCircleOutlined style={{ color: "#faad14", marginTop: 4 }} />}
                title={<Text strong>{item.slotTitle}</Text>}
                description={
                  <Text type="secondary" style={{ fontSize: "0.85rem" }}>
                    {new Date(item.startAt).toLocaleTimeString("ko-KR", { 
                      hour: "2-digit", 
                      minute: "2-digit",
                      hour12: false 
                    })} ~ {new Date(item.endAt).toLocaleTimeString("ko-KR", { 
                      hour: "2-digit", 
                      minute: "2-digit",
                      hour12: false 
                    })}
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
