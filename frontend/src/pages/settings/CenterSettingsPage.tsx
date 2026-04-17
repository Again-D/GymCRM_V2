import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Space,
  Typography,
  message,
} from "antd";

import {
  createCenterProfileFormState,
  type CenterProfileFormState,
} from "./modules/types";
import { useCenterProfileQuery } from "./modules/useCenterProfileQuery";
import { useUpdateCenterProfileMutation } from "./modules/useUpdateCenterProfileMutation";

const { Title, Paragraph, Text } = Typography;

export default function CenterSettingsPage() {
  const {
    centerProfile,
    centerProfileLoading,
    centerProfileError,
    refetchCenterProfile,
  } = useCenterProfileQuery();
  const { updateCenterProfile, updatingCenterProfile, updateCenterProfileError } =
    useUpdateCenterProfileMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CenterProfileFormState>(() => ({
    centerName: "",
    phone: "",
    address: "",
  }));

  useEffect(() => {
    if (!centerProfile) {
      return;
    }
    setDraft(createCenterProfileFormState(centerProfile));
  }, [centerProfile]);

  const canEdit = useMemo(() => centerProfile != null, [centerProfile]);

  function startEditing() {
    if (!centerProfile) {
      return;
    }
    setDraft(createCenterProfileFormState(centerProfile));
    setIsEditing(true);
  }

  function cancelEditing() {
    if (centerProfile) {
      setDraft(createCenterProfileFormState(centerProfile));
    }
    setIsEditing(false);
  }

  async function handleSave() {
    try {
      const nextProfile = await updateCenterProfile(draft);
      setIsEditing(false);
      setDraft(createCenterProfileFormState(nextProfile));
      message.success("센터 프로필을 저장했습니다.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "센터 프로필을 저장하지 못했습니다.");
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space direction="vertical" size={4}>
        <Title level={2} style={{ margin: 0 }}>
          시스템 설정
        </Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          현재 센터의 이름과 연락처를 관리합니다.
        </Paragraph>
      </Space>

      {centerProfileError ? (
        <Alert
          type="error"
          showIcon
          message={centerProfileError}
          action={
            <Button size="small" onClick={() => void refetchCenterProfile()}>
              다시 불러오기
            </Button>
          }
        />
      ) : null}

      {updateCenterProfileError ? (
        <Alert type="error" showIcon message={updateCenterProfileError} />
      ) : null}

      <Card
        loading={centerProfileLoading}
        title="센터 프로필"
        extra={
          isEditing ? (
            <Space>
              <Button onClick={cancelEditing} disabled={updatingCenterProfile}>
                취소
              </Button>
              <Button
                type="primary"
                onClick={() => void handleSave()}
                loading={updatingCenterProfile}
              >
                저장
              </Button>
            </Space>
          ) : (
            <Button type="primary" onClick={startEditing} disabled={!canEdit}>
              수정
            </Button>
          )
        }
      >
        {isEditing ? (
          <Form layout="vertical">
            <Form.Item label="센터명" required>
              <Input
                value={draft.centerName}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    centerName: event.target.value,
                  }))
                }
              />
            </Form.Item>
            <Form.Item label="전화번호">
              <Input
                value={draft.phone}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="010-1234-5678"
              />
            </Form.Item>
            <Form.Item label="주소">
              <Input.TextArea
                value={draft.address}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                autoSize={{ minRows: 3, maxRows: 5 }}
                placeholder="센터 주소"
              />
            </Form.Item>
          </Form>
        ) : centerProfile ? (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="센터 ID">{centerProfile.centerId}</Descriptions.Item>
            <Descriptions.Item label="센터명">{centerProfile.centerName}</Descriptions.Item>
            <Descriptions.Item label="전화번호">
              {centerProfile.phone ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="주소">
              {centerProfile.address ?? "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Space direction="vertical">
            <Text type="secondary">센터 정보를 불러오는 중입니다.</Text>
          </Space>
        )}
      </Card>
    </Space>
  );
}
