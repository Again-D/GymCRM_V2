import {
	Alert,
	Modal as AntdModal,
	Button,
	Card,
	Col,
	Divider,
	Flex,
	Input,
	Pagination,
	Row,
	Space,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

import { useAuthState } from "../../app/auth";
import { hasAnyRole } from "../../app/roles";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { MemberSummary } from "../members/modules/types";
import { useMembersQuery } from "../members/modules/useMembersQuery";
import { useAccessPrototypeState } from "./modules/useAccessPrototypeState";
import { useAccessQueries } from "./modules/useAccessQueries";

const { Title, Text, Paragraph } = Typography;

function formatDateTime(value: string | null) {
	if (!value) {
		return "-";
	}
	return new Date(value).toLocaleString("ko-KR", {
		dateStyle: "short",
		timeStyle: "short",
	});
}

const eventLabel: Record<string, { label: string; color: string }> = {
	ENTRY_GRANTED: { label: "입장 승인", color: "success" },
	EXIT: { label: "퇴장", color: "default" },
	ENTRY_DENIED: { label: "입장 거부", color: "error" },
};

export default function AccessPage() {
	const { authUser, isMockMode } = useAuthState();
	const { selectedMember, selectedMemberId, selectMember } =
		useSelectedMemberStore();
	const [accessMemberQuery, setAccessMemberQuery] = useState("");
	const debouncedAccessMemberQuery = useDebouncedValue(accessMemberQuery, 250);
	const { members } = useMembersQuery({
		name: debouncedAccessMemberQuery,
		phone: debouncedAccessMemberQuery,
		memberStatus: "",
		membershipOperationalStatus: "",
		dateFrom: "",
		dateTo: "",
	});

	const {
		accessEvents,
		accessPresence,
		accessPresenceLoading,
		refetchAccessPresence,
		refetchAccessEvents,
	} = useAccessQueries(selectedMemberId);

	const {
		accessActionSubmitting,
		accessPanelMessage,
		accessPanelError,
		handleAccessEntry,
		handleAccessExit,
	} = useAccessPrototypeState();

	const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);

	const isLiveAccessRoleSupported =
		isMockMode ||
		hasAnyRole(authUser, ["ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_MANAGER", "ROLE_DESK"]);

	const visibleMembers = isLiveAccessRoleSupported ? members : [];

	const memberResultsPagination = usePagination(visibleMembers, {
		initialPageSize: 10,
		resetDeps: [
			accessMemberQuery,
			visibleMembers.length,
			isLiveAccessRoleSupported,
		],
	});
	const openSessionsPagination = usePagination(
		accessPresence?.openSessions ?? [],
		{
			initialPageSize: 10,
			resetDeps: [accessPresence?.openSessions.length ?? 0],
		},
	);
	const accessEventsPagination = usePagination(accessEvents, {
		initialPageSize: 10,
		resetDeps: [selectedMemberId, accessEvents.length],
	});

	useEffect(() => {
		if (!isLiveAccessRoleSupported) {
			return;
		}
	}, [isLiveAccessRoleSupported]);

	async function runAccessAction(action: () => Promise<boolean>) {
		await action();
	}

	const memberColumns: ColumnsType<MemberSummary> = [
		{
			title: "회원 정보",
			key: "info",
			render: (_, record) => (
				<Space direction="vertical" size={2}>
					<Text strong>{record.memberName}</Text>
					<Text type="secondary" style={{ fontSize: "0.75rem" }}>
						ID: {record.memberId} · {record.phone}
					</Text>
				</Space>
			),
		},
		{
			title: "회원권 상태",
			dataIndex: "membershipOperationalStatus",
			key: "status",
			render: (status) => (
				<Tag
					color={
						status === "정상"
							? "success"
							: status === "홀딩중"
								? "processing"
								: "default"
					}
				>
					{status}
				</Tag>
			),
		},
		{
			title: "액션",
			key: "action",
			align: "right",
			render: (_, record) => (
				<Button
					size="small"
					type={selectedMemberId === record.memberId ? "primary" : "default"}
					onClick={async () => {
						const success = await selectMember(record.memberId);
						if (success) setIsWorkbenchOpen(true);
					}}
				>
					{selectedMemberId === record.memberId ? "조회 중" : "작업 선택"}
				</Button>
			),
		},
	];

	return (
		<Flex vertical gap={24}>
			<Card>
				<Flex justify="space-between" align="start" wrap="wrap" gap={16}>
					<Space direction="vertical" size={4}>
						<Text
							type="secondary"
							style={{
								fontSize: "0.72rem",
								fontWeight: 800,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								color: "#1677ff",
							}}
						>
							출입 제어
						</Text>
						<Title level={2} style={{ margin: 0 }}>
							출입 모니터링
						</Title>
						<Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
							회원 상태를 확인하고 현재 입장 현황을 추적하며 리셉션 출입 처리를
							한 화면에서 수행합니다.
						</Paragraph>
						<Space className="mt-xs">
							<Tag>실시간 출입 현황</Tag>
							<Tag>선택 회원 액션</Tag>
							<Tag>회원 연동 이력</Tag>
						</Space>
					</Space>
					<Button
						onClick={() => {
							void refetchAccessPresence();
							void refetchAccessEvents();
						}}
						loading={accessPresenceLoading}
					>
						{accessPresenceLoading ? "동기화 중..." : "수동 동기화"}
					</Button>
				</Flex>

				<Divider />

				<Row gutter={[16, 16]}>
					{[
						{
							label: "현재 입장",
							value: accessPresence?.openSessionCount ?? 0,
							hint: "현재 센터 내부에 있는 총 회원 수",
						},
						{
							label: "오늘 입장",
							value: accessPresence?.todayEntryGrantedCount ?? 0,
							hint: "금일 승인된 입장 총계",
						},
						{
							label: "오늘 퇴장",
							value: accessPresence?.todayExitCount ?? 0,
							hint: "금일 기록된 퇴장 총계",
						},
						{
							label: "입장 거부",
							value: accessPresence?.todayEntryDeniedCount ?? 0,
							hint: "승인되지 않은 무효한 시도",
						},
					].map((kpi) => (
						<Col xs={12} sm={6} key={kpi.label}>
							<Statistic
								title={
									<Text
										type="secondary"
										style={{
											fontSize: "0.73rem",
											fontWeight: 700,
											textTransform: "uppercase",
										}}
									>
										{kpi.label}
									</Text>
								}
								value={kpi.value}
								valueStyle={{ fontWeight: 800 }}
								suffix={
									<Text
										type="secondary"
										style={{ fontSize: "0.75rem", display: "block" }}
									>
										{kpi.hint}
									</Text>
								}
							/>
						</Col>
					))}
				</Row>
			</Card>

			<Row gutter={[24, 24]}>
				<Col xs={24} lg={16}>
					<Card
						title={
							<Space direction="vertical" size={2}>
								<Title level={5} style={{ margin: 0 }}>
									회원 디렉터리
								</Title>
								<Text type="secondary" style={{ fontSize: "0.84rem" }}>
									출입 처리를 위한 회원을 검색하고 선택합니다.
								</Text>
							</Space>
						}
					>
						<Flex vertical gap={16}>
							{!isLiveAccessRoleSupported && (
								<Alert
									type="warning"
									showIcon
									message="운영 권한 제한"
									description="현재 관리자 권한이 없어 실시간 출입 제어가 불가능합니다. 데모 또는 실제 관리자 세션으로 전환이 필요합니다."
								/>
							)}

							<Input
								size="large"
								value={accessMemberQuery}
								onChange={(event) => setAccessMemberQuery(event.target.value)}
								placeholder="회원 이름 또는 전화번호 뒷자리 검색"
								disabled={!isLiveAccessRoleSupported}
							/>

							<Table<MemberSummary>
								rowKey="memberId"
								columns={memberColumns}
								dataSource={memberResultsPagination.pagedItems}
								pagination={false}
								locale={{
									emptyText: !isLiveAccessRoleSupported
										? "제한된 권한 상태입니다."
										: "조회할 회원을 검색해 주세요.",
								}}
							/>

							<Flex justify="center">
								<Pagination
									current={memberResultsPagination.page}
									total={memberResultsPagination.totalItems}
									pageSize={memberResultsPagination.pageSize}
									onChange={(page, pageSize) => {
										memberResultsPagination.setPage(page);
										memberResultsPagination.setPageSize(pageSize);
									}}
									showSizeChanger
								/>
							</Flex>
						</Flex>
					</Card>
				</Col>

				<Col xs={24} lg={8}>
					<Flex vertical gap={24}>
						<Card
							title={
								<Space direction="vertical" size={2}>
									<Title level={5} style={{ margin: 0 }}>
										현재 입장 회원
									</Title>
									<Text type="secondary" style={{ fontSize: "0.84rem" }}>
										지금 센터 내부에 있는 회원 목록입니다.
									</Text>
								</Space>
							}
						>
							<Table
								size="small"
								rowKey="accessSessionId"
								pagination={false}
								dataSource={openSessionsPagination.pagedItems}
								columns={[
									{
										title: "회원",
										dataIndex: "memberName",
										key: "name",
										render: (name) => <Text strong>{name}</Text>,
									},
									{
										title: "입장 시각",
										dataIndex: "entryAt",
										key: "time",
										align: "right",
										render: (time) => (
											<Text type="secondary" style={{ fontSize: "0.75rem" }}>
												{formatDateTime(time)}
											</Text>
										),
									},
								]}
								locale={{ emptyText: "현재 입장 중인 회원이 없습니다." }}
							/>
						</Card>

						<Card
							title={
								<Space direction="vertical" size={2}>
									<Title level={5} style={{ margin: 0 }}>
										출입 이력
									</Title>
									<Text type="secondary" style={{ fontSize: "0.84rem" }}>
										선택한 회원 또는 최근 출입 이벤트를 확인합니다.
									</Text>
								</Space>
							}
						>
							<Table
								size="small"
								rowKey="accessEventId"
								pagination={false}
								dataSource={accessEventsPagination.pagedItems}
								columns={[
									{
										title: "이벤트",
										key: "event",
										render: (_, record) => (
											<Space direction="vertical" size={0}>
												<Text strong style={{ fontSize: "0.875rem" }}>
													ID: #{record.memberId}
												</Text>
												<Text type="secondary" style={{ fontSize: "0.75rem" }}>
													{formatDateTime(record.processedAt)}
												</Text>
											</Space>
										),
									},
									{
										title: "상태",
										dataIndex: "eventType",
										key: "type",
										align: "right",
										render: (type) => {
											const label = eventLabel[type] || {
												label: type,
												color: "default",
											};
											return <Tag color={label.color}>{label.label}</Tag>;
										},
									},
								]}
								locale={{ emptyText: "최근 출입 이력이 없습니다." }}
							/>
						</Card>
					</Flex>
				</Col>
			</Row>

			<AntdModal
				open={isWorkbenchOpen}
				onCancel={() => setIsWorkbenchOpen(false)}
				title={`출입 워크벤치: ${selectedMember?.memberName ?? "회원"}`}
				footer={<Button onClick={() => setIsWorkbenchOpen(false)}>닫기</Button>}
				width={600}
			>
				<Flex vertical gap={24}>
					<Card size="small" style={{ background: "#f5f5f5" }}>
						<Flex justify="space-between" align="center">
							<Space direction="vertical" size={2}>
								<Text
									type="secondary"
									style={{
										fontSize: "0.72rem",
										textTransform: "uppercase",
										fontWeight: 700,
									}}
								>
									현재 컨텍스트 처리
								</Text>
								<Title level={5} style={{ margin: 0 }}>
									{selectedMember
										? `${selectedMember.memberName} (#${selectedMember.memberId})`
										: "선택된 회원 없음"}
								</Title>
							</Space>
							<Space>
								<Button
									type="primary"
									disabled={
										!selectedMemberId ||
										accessActionSubmitting ||
										!isLiveAccessRoleSupported
									}
									onClick={() =>
										selectedMemberId &&
										void runAccessAction(() =>
											handleAccessEntry(selectedMemberId),
										)
									}
								>
									입장 승인
								</Button>
								<Button
									disabled={
										!selectedMemberId ||
										accessActionSubmitting ||
										!isLiveAccessRoleSupported
									}
									onClick={() =>
										selectedMemberId &&
										void runAccessAction(() =>
											handleAccessExit(selectedMemberId),
										)
									}
								>
									퇴장 기록
								</Button>
							</Space>
						</Flex>
					</Card>

					{(accessPanelMessage || accessPanelError) && (
						<Space direction="vertical" style={{ width: "100%" }}>
							{accessPanelMessage && (
								<Alert type="success" message={accessPanelMessage} showIcon />
							)}
							{accessPanelError && (
								<Alert type="error" message={accessPanelError} showIcon />
							)}
						</Space>
					)}

					<section>
						<Divider orientation="left" style={{ margin: "0 0 16px" }}>
							회원 개별 출입 기록
						</Divider>
						<Table
							size="small"
							rowKey="accessEventId"
							dataSource={accessEventsPagination.pagedItems}
							pagination={false}
							columns={[
								{
									title: "이벤트 시각",
									dataIndex: "processedAt",
									key: "time",
									render: (time) => formatDateTime(time),
								},
								{
									title: "유형",
									dataIndex: "eventType",
									key: "type",
									align: "right",
									render: (type) => {
										const label = eventLabel[type] || {
											label: type,
											color: "default",
										};
										return <Tag color={label.color}>{label.label}</Tag>;
									},
								},
							]}
							locale={{ emptyText: "개별 기록이 존재하지 않습니다." }}
						/>
						<Flex justify="center" style={{ marginTop: 16 }}>
							<Pagination
								current={accessEventsPagination.page}
								total={accessEventsPagination.totalItems}
								pageSize={accessEventsPagination.pageSize}
								onChange={(page) => accessEventsPagination.setPage(page)}
								simple
							/>
						</Flex>
					</section>
				</Flex>
			</AntdModal>
		</Flex>
	);
}
