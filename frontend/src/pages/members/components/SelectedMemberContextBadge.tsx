import { Badge, Space, Tag, Typography } from "antd";
import { useSelectedMemberStore } from "../modules/SelectedMemberContext";

const { Text } = Typography;

export function SelectedMemberContextBadge() {
  const { selectedMember } = useSelectedMemberStore();

  return (
    <Space>
      <Badge dot={!!selectedMember} status={selectedMember ? "processing" : "default"}>
        <Text strong style={{ fontSize: "0.84rem" }}>선택된 회원</Text>
      </Badge>
      {selectedMember ? (
        <Tag color="blue" bordered={false} style={{ fontWeight: 600 }}>
          #{selectedMember.memberId} {selectedMember.memberName}
        </Tag>
      ) : (
        <Text type="secondary" style={{ fontSize: "0.84rem" }}>선택된 회원 없음</Text>
      )}
    </Space>
  );
}
