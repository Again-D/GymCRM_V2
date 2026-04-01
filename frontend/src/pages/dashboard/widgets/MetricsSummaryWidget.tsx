import { ArrowRightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Divider, Row, Skeleton, Statistic, Typography } from "antd";
import { Link } from "react-router-dom";
import { useMemo } from "react";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { MemberSummary } from "../../members/modules/types";
import type { WidgetBaseProps } from "./types";

const { Text } = Typography;

export default function MetricsSummaryWidget({ title = "회원 지표 요약" }: WidgetBaseProps) {
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

  const metrics = useMemo(() => {
    if (!data) {
      return { activeCount: 0, newThisMonth: 0 };
    }

    const today = new Date();
    const currentMonthPrefix = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;

    let activeCount = 0;
    let newThisMonth = 0;

    for (const member of data) {
      if (member.memberStatus === "ACTIVE") {
        activeCount++;
      }
      if (member.joinDate?.startsWith(currentMonthPrefix)) {
        newThisMonth++;
      }
    }

    return { activeCount, newThisMonth };
  }, [data]);

  if (error) {
    return (
      <Card title={title} bordered={false}>
        <Alert
          type="warning"
          message={toUserFacingErrorMessage(error, "회원 지표를 불러오지 못했습니다.")}
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={title}
      bordered={false}
      actions={[
        <Link key="link" to="/members">
          <Button type="link" icon={<ArrowRightOutlined />} iconPosition="end">
            전체 회원 보기
          </Button>
        </Link>,
      ]}
    >
      <Row align="middle" justify="space-around">
        <Col span={11}>
          {isLoading ? (
            <Skeleton.Input active size="small" style={{ width: "100%" }} />
          ) : (
            <Statistic
              title={<Text type="secondary">활성 회원</Text>}
              value={metrics.activeCount}
              suffix="명"
              valueStyle={{ fontWeight: 700 }}
            />
          )}
        </Col>
        <Col span={2}>
          <Divider type="vertical" style={{ height: "3em" }} />
        </Col>
        <Col span={11}>
          {isLoading ? (
            <Skeleton.Input active size="small" style={{ width: "100%" }} />
          ) : (
            <Statistic
              title={<Text type="secondary">금월 신당 신규</Text>}
              value={metrics.newThisMonth}
              suffix="명"
              valueStyle={{ color: "#3f8600", fontWeight: 700 }}
            />
          )}
        </Col>
      </Row>
    </Card>
  );
}
