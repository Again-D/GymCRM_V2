import { ArrowRightOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Empty, List, Skeleton, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { useMemo } from "react";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { MemberSummary } from "../../members/modules/types";
import type { WidgetBaseProps } from "./types";

const { Text } = Typography;

const STATUS_COLOR_MAP: Record<string, string> = {
  만료임박: "warning",
  만료: "error",
  없음: "default",
  홀딩중: "processing",
};

export default function CrmActionWidget({ title = "CRM 대상자" }: WidgetBaseProps) {
  const { data, isFetching, isPending, error } = useQuery({
    queryKey: queryKeys.members.list({}),
    queryFn: async () => {
      const response = await apiGet<MemberSummary[]>("/api/v1/members");
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const isLoading = isFetching || isPending;

  const crmTargets = useMemo(() => {
    if (!data) return [];

    return data
      .filter((member) => 
        ["만료임박", "만료", "없음", "홀딩중"].includes(member.membershipOperationalStatus)
      )
      .sort((a, b) => {
        // Simple priority sort: Expiring first
        if (a.membershipOperationalStatus === "만료임박" && b.membershipOperationalStatus !== "만료임박") return -1;
        if (a.membershipOperationalStatus !== "만료임박" && b.membershipOperationalStatus === "만료임박") return 1;
        return 0;
      });
  }, [data]);

  const displayedTargets = useMemo(() => crmTargets.slice(0, 5), [crmTargets]);
  const remainingCount = Math.max(0, crmTargets.length - 5);

  if (error) {
    return (
      <Card title={title} variant="borderless">
        <Alert
          type="warning"
          message={toUserFacingErrorMessage(error, "CRM 데이터를 불러오지 못했습니다.")}
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
        <Link key="link" to="/members">
          <Button type="link" icon={<ArrowRightOutlined />} iconPosition="end">
            CRM 회원 목록
          </Button>
        </Link>,
      ]}
    >
      {isLoading ? (
        <Skeleton active />
      ) : crmTargets.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="현재 특별한 CRM 액션이 필요한 회원이 없습니다."
          style={{ padding: "12px 0" }}
        />
      ) : (
        <>
          <List
            size="small"
            dataSource={displayedTargets}
            renderItem={(item) => (
              <List.Item
                extra={
                  <Tag color={STATUS_COLOR_MAP[item.membershipOperationalStatus]}>
                    {item.membershipOperationalStatus}
                  </Tag>
                }
              >
                <List.Item.Meta
                  avatar={<UserOutlined style={{ color: "#8c8c8c", marginTop: 4 }} />}
                  title={<Text strong>{item.memberName}</Text>}
                  description={<Text type="secondary" style={{ fontSize: "0.85rem" }}>{item.phone}</Text>}
                />
              </List.Item>
            )}
          />
          {remainingCount > 0 && (
            <div style={{ textAlign: "center", padding: "8px 0", borderTop: "1px solid #f0f0f0" }}>
              <Text type="secondary" style={{ fontSize: "0.8rem" }}>
                {remainingCount}명의 회원이 더 있습니다.
              </Text>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
