import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Flex, Input, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { useMembersQuery } from "../members/modules/useMembersQuery";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { MemberSummary } from "../members/modules/types";

type MemberContextFallbackProps = {
  title: string;
  description: string;
  submitLabel: string;
};

export function MemberContextFallback({ title, description, submitLabel }: MemberContextFallbackProps) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword, 250);
  const { selectMember, selectedMemberLoading } = useSelectedMemberStore();
  const { members, membersLoading, membersQueryError, loadMembers } = useMembersQuery({
    getDefaultFilters: () => ({
      name: keyword,
      phone: keyword,
      memberStatus: "",
      membershipOperationalStatus: "",
      dateFrom: "",
      dateTo: ""
    })
  });

  const pagination = usePagination(members, {
    initialPageSize: 10,
    resetDeps: [keyword, members.length]
  });

  useEffect(() => {
    void loadMembers({ name: debouncedKeyword, phone: debouncedKeyword });
  }, [debouncedKeyword]);

  const columns: ColumnsType<MemberSummary> = [
    {
      title: "ID",
      dataIndex: "memberId",
      key: "memberId",
      width: 96
    },
    {
      title: "이름",
      dataIndex: "memberName",
      key: "memberName"
    },
    {
      title: "연락처",
      dataIndex: "phone",
      key: "phone"
    },
    {
      title: "회원권 상태",
      dataIndex: "membershipOperationalStatus",
      key: "membershipOperationalStatus"
    },
    {
      title: "액션",
      key: "action",
      align: "right",
      render: (_, member) => (
        <Button type="default" disabled={selectedMemberLoading} onClick={() => void selectMember(member.memberId)}>
          {submitLabel}
        </Button>
      )
    }
  ];

  return (
    <Card>
      <Flex vertical gap={24}>
        <div>
          <Typography.Title level={3}>{title}</Typography.Title>
          <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
        </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void loadMembers({ name: keyword, phone: keyword });
        }}
      >
        <Flex gap={12} align="end" wrap>
          <Flex vertical gap={8} flex="1 1 280px">
            <Typography.Text strong>회원 검색</Typography.Text>
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="예: 김민수, 010-1234"
            />
          </Flex>
          <Button type="primary" htmlType="submit" loading={membersLoading}>
            {membersLoading ? "조회 중..." : "조회"}
          </Button>
        </Flex>
      </form>

      {membersQueryError ? (
        <Alert
          type="error"
          showIcon
          message="회원 목록을 불러오지 못했습니다."
          description={membersQueryError}
        />
      ) : null}

      <Table<MemberSummary>
        rowKey={(member) => member.memberId}
        columns={columns}
        dataSource={pagination.pagedItems}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.totalItems,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          onChange: (page, pageSize) => {
            pagination.setPage(page);
            pagination.setPageSize(pageSize);
          }
        }}
        scroll={{ x: 720 }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="선택 가능한 회원이 없습니다." />
        }}
      />
      </Flex>
    </Card>
  );
}
