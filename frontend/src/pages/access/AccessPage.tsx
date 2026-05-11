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
	Skeleton,
	Space,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

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

interface KpiItem {
	label: string;
	value: number;
	hint: string;
}

const KPI_CONFIG: KpiItem[] = [
	{ label: "현재 입장", value: 0, hint: "현재 센터 내부에 있는 총 회원 수" },
	{ label: "오늘 입장", value: 0, hint: "금일 승인된 입장 총계" },
	{ label: "오늘 퇴장", value: 0, hint: "금일 기록된 퇴장 총계" },
	{ label: "입장 거부", value: 0, hint: "승인되지 않은 무효한 시도" },
];

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
		accessAlerts,
		accessPresence,
		accessEventsLoading,
		accessPresenceLoading,
		accessAlertsLoading,
		accessAlertsError,
		accessQueryError,
		refetchAccessPresence,
		refetchAccessEvents,
		refetchAccessAlerts,
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

	const accessAlertsRefreshLoading =
		accessPresenceLoading || accessEventsLoading || accessAlertsLoading;

	const kpiData = useMemo(() => KPI_CONFIG.map((kpi) => {
		switch (kpi.label) {
			case "현재 입장":
				return { ...kpi, value: accessPresence?.openSessionCount ?? 0 };
			case "오늘 입장":
				return { ...kpi, value: accessPresence?.todayEntryGrantedCount ?? 0 };
			case "오늘 퇴장":
				return { ...kpi, value: accessPresence?.todayExitCount ?? 0 };
			case "입장 거부":
				return { ...kpi, value: accessPresence?.todayEntryDeniedCount ?? 0 };
			default:
				return kpi;
		}
	}), [accessPresence]);

	useEffect(() => {
		if (!isLiveAccessRoleSupported) {
			return;
		}
	}, [isLiveAccessRoleSupported]);

	async function runAccessAction(action: () => Promise<boolean>) {
		await action();
	}

	const memberColumns = useMemo<ColumnsType<MemberSummary>>(() => [
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
	], [selectedMemberId, selectMember]);

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
							void refetchAccessAlerts();
						}}
						loading={accessAlertsRefreshLoading}
					>
						{accessAlertsRefreshLoading ? "동기화 중..." : "수동 동기화"}
					</Button>
				</Flex>

				<Divider />

				<Row gutter={[16, 16]}>
					{kpiData.map((kpi) => (
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

			{accessQueryError ? (
				<Alert
					type="warning"
					showIcon
					message="출입 현황 일부를 불러오지 못했습니다"
					description={accessQueryError}
				/>
			) : null}

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
								color: "#b42318",
							}}
						>
							비정상 출입 요약
						</Text>
						<Title level={4} style={{ margin: 0 }}>
							반복 거부와 최근 이상 징후
						</Title>
						<Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
							거부 사유, 반복 거부 회원, 최근 거부 이벤트를 한곳에서 확인합니다.
						</Paragraph>
					</Space>
					{accessAlerts ? (
						<Tag color={accessAlerts.requiresImmediateAttention ? "error" : accessAlerts.totalDeniedCount > 0 ? "warning" : "success"}>
							{accessAlerts.requiresImmediateAttention
								? "주의 필요"
								: accessAlerts.totalDeniedCount > 0
									? "관찰 필요"
									: "안정"}
						</Tag>
					) : null}
				</Flex>

				<Divider />

				{accessAlertsError ? (
					<Alert
						type="warning"
						showIcon
						message="비정상 출입 요약을 불러오지 못했습니다"
						description={accessAlertsError}
					/>
				) : null}

				{accessAlertsLoading && !accessAlerts ? (
					<Skeleton active paragraph={{ rows: 3 }} />
				) : accessAlerts ? (
					<Space direction="vertical" size={20} style={{ width: "100%" }}>
						<Row gutter={[16, 16]}>
							<Col xs={24} sm={8}>
								<Statistic
									title={
										<Text type="secondary" style={{ fontSize: "0.73rem", fontWeight: 700 }}>
											총 거부
										</Text>
									}
									value={accessAlerts.totalDeniedCount}
									suffix="건"
									valueStyle={{
										fontWeight: 800,
										color: accessAlerts.totalDeniedCount > 0 ? "#cf1322" : undefined,
									}}
								/>
							</Col>
							<Col xs={24} sm={8}>
								<Statistic
									title={
										<Text type="secondary" style={{ fontSize: "0.73rem", fontWeight: 700 }}>
											반복 거부 회원
										</Text>
									}
									value={accessAlerts.repeatedDeniedMembers.length}
									suffix="명"
									valueStyle={{
										fontWeight: 800,
										color: accessAlerts.repeatedDeniedMembers.length > 0 ? "#fa8c16" : undefined,
									}}
								/>
							</Col>
							<Col xs={24} sm={8}>
								<Statistic
									title={
										<Text type="secondary" style={{ fontSize: "0.73rem", fontWeight: 700 }}>
											조회 구간
										</Text>
									}
									value={formatDateTime(accessAlerts.windowFrom)}
									suffix={
										<Text type="secondary" style={{ fontSize: "0.75rem", display: "block" }}>
											~ {formatDateTime(accessAlerts.windowTo)}
										</Text>
									}
								/>
							</Col>
						</Row>

						<Row gutter={[16, 16]}>
							<Col xs={24} lg={10}>
								<Space direction="vertical" size={8} style={{ width: "100%" }}>
									<Text strong>거부 사유</Text>
									<Space wrap>
										{accessAlerts.deniedReasonCounts.length > 0 ? (
											accessAlerts.deniedReasonCounts.map((item) => (
												<Tag key={item.denyReason}>
													{item.denyReason} · {item.deniedCount}
												</Tag>
											))
										) : (
											<Text type="secondary">거부 사유가 없습니다.</Text>
										)}
									</Space>
								</Space>
							</Col>
							<Col xs={24} lg={7}>
								<Space direction="vertical" size={8} style={{ width: "100%" }}>
									<Text strong>반복 거부 회원</Text>
									{accessAlerts.repeatedDeniedMembers.length > 0 ? (
										<Space direction="vertical" size={8} style={{ width: "100%" }}>
											{accessAlerts.repeatedDeniedMembers.map((member) => (
												<Flex key={member.memberId} justify="space-between" align="start" gap={12}>
													<Space direction="vertical" size={0}>
														<Text strong>{member.memberName}</Text>
														<Text type="secondary" style={{ fontSize: "0.75rem" }}>
															{member.deniedCount}회 · 마지막 {formatDateTime(member.lastDeniedAt)}
														</Text>
													</Space>
													<Tag color="orange">반복</Tag>
												</Flex>
											))}
										</Space>
									) : (
										<Text type="secondary">반복 거부 회원이 없습니다.</Text>
									)}
								</Space>
							</Col>
							<Col xs={24} lg={7}>
								<Space direction="vertical" size={8} style={{ width: "100%" }}>
									<Text strong>최근 거부 이벤트</Text>
									{accessAlerts.recentDeniedEvents.length > 0 ? (
										<Space direction="vertical" size={8} style={{ width: "100%" }}>
											{accessAlerts.recentDeniedEvents.slice(0, 4).map((event) => (
												<Flex key={event.accessEventId} justify="space-between" align="start" gap={12}>
													<Space direction="vertical" size={0}>
														<Text strong>{event.memberName}</Text>
														<Text type="secondary" style={{ fontSize: "0.75rem" }}>
															{event.denyReason}
														</Text>
														<Text type="secondary" style={{ fontSize: "0.72rem" }}>
															{formatDateTime(event.processedAt)}
														</Text>
													</Space>
													<Tag color="red">거부</Tag>
												</Flex>
											))}
										</Space>
									) : (
										<Text type="secondary">최근 거부 이벤트가 없습니다.</Text>
									)}
								</Space>
							</Col>
						</Row>
					</Space>
				) : null}
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
