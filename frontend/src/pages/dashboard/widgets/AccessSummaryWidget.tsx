import { ArrowRightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Row, Skeleton, Statistic, Typography } from "antd";
import { Link } from "react-router-dom";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { AccessPresenceSummary } from "../../access/modules/types";
import type { WidgetBaseProps } from "./types";

const { Text } = Typography;

export default function AccessSummaryWidget({ title = "실시간 출입 현황" }: WidgetBaseProps) {
  const { data, isFetching, isPending, error } = useQuery({
    queryKey: queryKeys.access.list({ scope: "presence" }),
    queryFn: async () => {
      const response = await apiGet<AccessPresenceSummary>("/api/v1/access/presence");
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const isLoading = isFetching || isPending;

  if (error) {
    return (
      <Card title={title} bordered={false}>
        <Alert
          type="warning"
          message={toUserFacingErrorMessage(error, "출입 현황을 불러오지 못했습니다.")}
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
        <Link key="link" to="/access">
          <Button type="link" icon={<ArrowRightOutlined />} iconPosition="end">
            출입 관리 열기
          </Button>
        </Link>,
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col span={8}>
          {isLoading ? (
            <Skeleton.Input active size="small" style={{ width: "100%" }} />
          ) : (
            <Statistic
              title={<Text type="secondary">현재 이용중</Text>}
              value={data?.openSessionCount ?? 0}
              suffix="명"
            />
          )}
        </Col>
        <Col span={8}>
          {isLoading ? (
            <Skeleton.Input active size="small" style={{ width: "100%" }} />
          ) : (
            <Statistic
              title={<Text type="secondary">오늘 입장</Text>}
              value={data?.todayEntryGrantedCount ?? 0}
              suffix="건"
            />
          )}
        </Col>
        <Col span={8}>
          {isLoading ? (
            <Skeleton.Input active size="small" style={{ width: "100%" }} />
          ) : (
            <Statistic
              title={<Text type="secondary" delete={data?.todayEntryDeniedCount ? false : true}>거절</Text>}
              value={data?.todayEntryDeniedCount ?? 0}
              valueStyle={{ color: (data?.todayEntryDeniedCount ?? 0) > 0 ? "#cf1322" : undefined }}
              suffix="건"
            />
          )}
        </Col>
      </Row>
    </Card>
  );
}
