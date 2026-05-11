import { useState, type ReactNode } from "react";
import { Alert, Button, Card, Descriptions, Empty, Flex, Spin, Space, Typography } from "antd";

import { apiPost } from "../../../api/client";
import { useSelectedMemberStore } from "../modules/SelectedMemberContext";

import styles from "./SelectedMemberSummaryCard.module.css";

interface SelectedMemberSummaryCardProps {
  surface?: "panel" | "plain";
  action?: ReactNode;
}

export function SelectedMemberSummaryCard({ surface = "panel", action }: SelectedMemberSummaryCardProps) {
  const { selectedMember, selectedMemberError, selectedMemberLoading } = useSelectedMemberStore();
  const [qrLinkLoading, setQrLinkLoading] = useState(false);
  const [qrLinkError, setQrLinkError] = useState<string | null>(null);

  const memberStatusLabel = selectedMember?.memberStatus === "ACTIVE" ? "활성" : "비활성";
  const selectedMemberErrorDescription = selectedMemberError
    ? "회원 정보를 다시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
    : null;
  async function openMemberQrLink(memberId: number) {
    setQrLinkLoading(true);
    setQrLinkError(null);
    try {
      const response = await apiPost<{ memberQrPath: string }>("/api/v1/access/qr/member-link", {
        memberId,
      });
      window.open(response.data.memberQrPath, "_blank", "noopener,noreferrer");
    } catch (error) {
      setQrLinkError(resolveErrorMessage(error));
    } finally {
      setQrLinkLoading(false);
    }
  }

  const summaryContent = (
    <Flex vertical gap={16}>
      {selectedMemberLoading ? (
        <Flex align="center" gap={8}>
          <Spin size="small" />
          <Typography.Text type="secondary">회원 정보를 불러오는 중...</Typography.Text>
        </Flex>
      ) : null}
      {selectedMemberError ? (
        <Alert
          type="error"
          showIcon
          message="선택 회원 정보를 불러오지 못했습니다."
          description={selectedMemberErrorDescription}
        />
      ) : null}
      {selectedMember ? (
        <>
          <div className={styles.statsGrid}>
            <Card size="small">
              <Typography.Text type="secondary">회원 번호</Typography.Text>
              <Typography.Title level={4} className={styles.statValue}>
                #{selectedMember.memberId}
              </Typography.Title>
              <Typography.Text>{selectedMember.memberName}</Typography.Text>
            </Card>
            <Card size="small">
              <Typography.Text type="secondary">상세 상태</Typography.Text>
              <Typography.Title level={4} className={styles.statValue}>
                {memberStatusLabel}
              </Typography.Title>
              <Typography.Text>{selectedMember.phone}</Typography.Text>
            </Card>
          </div>
          <Descriptions
            className={styles.detailDescriptions}
            column={2}
            items={[
              {
                key: "name",
                label: "회원명",
                children: `#${selectedMember.memberId} ${selectedMember.memberName}`
              },
              {
                key: "phone",
                label: "연락처",
                children: selectedMember.phone
              },
              {
                key: "status",
                label: "회원 상태",
                children: memberStatusLabel
              },
              {
                key: "joinDate",
                label: "가입일",
                children: selectedMember.joinDate ?? "-"
              },
              {
                key: "emergencyContactName",
                label: "비상연락처",
                children: selectedMember.emergencyContactName
                  ? `${selectedMember.emergencyContactName} / ${selectedMember.emergencyContactPhone ?? "-"}`
                  : "-"
              },
              {
                key: "emergencyContactRelationship",
                label: "관계",
                children: selectedMember.emergencyContactRelationship ?? "-"
              },
              {
                key: "memberQrPath",
                label: "QR 링크",
                children: selectedMember.memberQrPath ? (
                  <a href={selectedMember.memberQrPath}>회원 QR 열기</a>
                ) : (
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">
                      상세 조회에서는 링크를 노출하지 않습니다. 필요할 때만 QR 링크를 발급합니다.
                    </Typography.Text>
                    <Button
                      size="small"
                      onClick={() => void openMemberQrLink(selectedMember.memberId)}
                      loading={qrLinkLoading}
                    >
                      회원 QR 열기
                    </Button>
                    {qrLinkError ? <Typography.Text type="danger">{qrLinkError}</Typography.Text> : null}
                  </Space>
                )
              }
            ]}
          />
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="선택된 회원이 없습니다. 명단에서 회원을 선택하여 업무를 시작하세요."
        />
      )}
    </Flex>
  );

  if (surface === "plain") {
    return summaryContent;
  }

  return (
    <Card
      title="선택된 회원 정보"
      extra={action}
      className={styles.panelSurface}
    >
      <Typography.Paragraph type="secondary" className={styles.panelDescription}>
        선택된 회원 정보는 회원권 및 예약 관리 화면에서도 계속 유지됩니다.
      </Typography.Paragraph>
      {summaryContent}
    </Card>
  );
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "회원 QR 링크를 불러오지 못했습니다.";
}
