import {
	NotificationOutlined,
	PlayCircleOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	DatePicker,
	Empty,
	Flex,
	Form,
	Input,
	InputNumber,
	message,
	Row,
	Select,
	Space,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect } from "react";

import { useAuthState } from "../../app/auth";
import { hasAnyRole } from "../../app/roles";
import { usePagination } from "../../shared/hooks/usePagination";
import type { CrmHistoryRow, CrmTemplateRow } from "./modules/types";
import { createDefaultCrmFilters } from "./modules/types";
import { useCrmHistoryQuery } from "./modules/useCrmHistoryQuery";
import { useCrmPrototypeState } from "./modules/useCrmPrototypeState";
import { useCrmTemplatesQuery } from "./modules/useCrmTemplatesQuery";

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

const statusMap: Record<string, { label: string; color: string }> = {
	SENT: { label: "발송 완료", color: "success" },
	PENDING: { label: "대기 중", color: "processing" },
	RETRY_WAIT: { label: "재시도 예정", color: "warning" },
	DEAD: { label: "실패", color: "error" },
};

const deliveryModeMap: Record<string, { label: string; color: string }> = {
	PRIMARY: { label: "기본 경로", color: "default" },
	SMS_FALLBACK: { label: "SMS 폴백", color: "warning" },
};

const templateReviewStatusMap: Record<
	string,
	{ label: string; color: string }
> = {
	APPROVED: { label: "심사 승인", color: "success" },
	REJECTED: { label: "심사 반려", color: "error" },
};

const templateOperationalStatusMap: Record<
	string,
	{ label: string; color: string }
> = {
	SENDABLE: { label: "발송 가능", color: "processing" },
	GOVERNANCE_ONLY: { label: "거버넌스 전용", color: "default" },
};

export default function CrmPage() {
	const { authUser, isMockMode } = useAuthState();
	const {
		crmFilters,
		setCrmFilters,
		crmTriggerDaysAhead,
		setCrmTriggerDaysAhead,
		crmTriggerScheduledAt,
		setCrmTriggerScheduledAt,
		crmTriggerSubmitting,
		crmProcessSubmitting,
		crmPanelMessage,
		crmPanelError,
		crmTemplateFilters,
		setCrmTemplateFilters,
		crmSelectedTemplateId,
		setCrmSelectedTemplateId,
		crmInactiveDays,
		setCrmInactiveDays,
		crmInactiveScheduledAt,
		setCrmInactiveScheduledAt,
		crmInactiveSubmitting,
		clearCrmFeedback,
		triggerCrmExpiryReminder,
		processCrmQueue,
		triggerCrmLongTermInactiveCampaign,
	} = useCrmPrototypeState();

	const { crmHistoryRows, crmHistoryLoading, refetchCrmHistory } =
		useCrmHistoryQuery(crmFilters);
	const {
		crmTemplateRows,
		crmTemplateLoading,
		crmTemplateError,
		refetchCrmTemplates,
	} = useCrmTemplatesQuery(crmTemplateFilters);

	const isLiveCrmRoleSupported =
		isMockMode ||
		hasAnyRole(authUser, [
			"ROLE_SUPER_ADMIN",
			"ROLE_ADMIN",
			"ROLE_MANAGER",
			"ROLE_DESK",
		]);

	const historyPagination = usePagination(crmHistoryRows, {
		initialPageSize: 10,
		resetDeps: [crmHistoryRows.length, crmFilters.sendStatus, crmFilters.limit],
	});

	const pendingCount = crmHistoryRows.filter(
		(row) => row.sendStatus === "PENDING" || row.sendStatus === "RETRY_WAIT",
	).length;
	const failedCount = crmHistoryRows.filter(
		(row) => row.sendStatus === "DEAD",
	).length;
	const sentCount = crmHistoryRows.filter(
		(row) => row.sendStatus === "SENT",
	).length;
	const selectedTemplate =
		crmTemplateRows.find((row) => row.templateId === crmSelectedTemplateId) ??
		crmTemplateRows[0] ??
		null;

	useEffect(() => {
		if (!isLiveCrmRoleSupported) {
			clearCrmFeedback();
			return;
		}
	}, [clearCrmFeedback, isLiveCrmRoleSupported]);

	useEffect(() => {
		if (
			crmSelectedTemplateId &&
			crmTemplateRows.some((row) => row.templateId === crmSelectedTemplateId)
		) {
			return;
		}
		if (crmTemplateRows.length > 0) {
			setCrmSelectedTemplateId(crmTemplateRows[0].templateId);
		}
	}, [crmSelectedTemplateId, crmTemplateRows, setCrmSelectedTemplateId]);

	async function runTrigger() {
		const success = await triggerCrmExpiryReminder();
		if (success) {
			message.success("안내 대상 적재를 완료했습니다.");
		} else {
			message.error("안내 대상 적재에 실패했습니다.");
		}
	}

	async function runProcess() {
		const success = await processCrmQueue();
		if (success) {
			message.success("메시지 큐 실행을 완료했습니다.");
		} else {
			message.error("메시지 큐 실행에 실패했습니다.");
		}
	}

	async function runLongTermInactive() {
		const success = await triggerCrmLongTermInactiveCampaign({
			templateId: selectedTemplate?.templateId ?? null,
			inactiveDays: crmInactiveDays,
			scheduledAt: crmInactiveScheduledAt,
		});
		if (success) {
			message.success("장기 미방문 캠페인 대상을 적재했습니다.");
		} else {
			message.error("장기 미방문 캠페인 대상 적재에 실패했습니다.");
		}
	}

	const columns: ColumnsType<CrmHistoryRow> = [
		{
			title: "대상 / 로그",
			key: "target",
			render: (_, record) => (
				<Space direction="vertical" size={2}>
					<Text strong style={{ fontSize: "0.84rem" }}>
						회원 #{record.memberId}
					</Text>
					<Text type="secondary" style={{ fontSize: "0.75rem" }}>
						로그 #{record.crmMessageEventId}
					</Text>
				</Space>
			),
		},
		{
			title: "이벤트",
			dataIndex: "eventType",
			key: "eventType",
			render: (type) => (
				<Text strong style={{ fontSize: "0.84rem" }}>
					{type}
				</Text>
			),
		},
		{
			title: "경로",
			key: "deliveryMode",
			render: (_, record) => {
				const config = deliveryModeMap[record.deliveryMode] || {
					label: record.deliveryMode,
					color: "default",
				};
				return <Tag color={config.color}>{config.label}</Tag>;
			},
		},
		{
			title: "상태",
			dataIndex: "sendStatus",
			key: "sendStatus",
			render: (status) => {
				const config = statusMap[status as string] || {
					label: status as string,
					color: "default",
				};
				return <Tag color={config.color}>{config.label}</Tag>;
			},
		},
		{
			title: "시도 횟수",
			key: "attempt",
			render: (_, record) => (
				<Space direction="vertical" size={2}>
					<Space>
						<Badge
							count={record.attemptCount}
							color={record.attemptCount > 1 ? "warning" : "blue"}
						/>
						<Text style={{ fontSize: "0.84rem" }}>/ 3 시도</Text>
					</Space>
					{record.lastErrorMessage && (
						<Tooltip title={record.lastErrorMessage}>
							<Text
								type="danger"
								style={{ fontSize: "0.75rem", cursor: "pointer" }}
							>
								실패 사유 확인
							</Text>
						</Tooltip>
					)}
				</Space>
			),
		},
		{
			title: "기록 시각",
			dataIndex: "createdAt",
			key: "createdAt",
			align: "right",
			render: (time, record) => (
				<Space direction="vertical" size={2} align="end">
					<Text type="secondary" style={{ fontSize: "0.84rem" }}>
						생성: {formatDateTime(time)}
					</Text>
					{record.failedAt && (
						<Text type="danger" style={{ fontSize: "0.75rem" }}>
							실패: {formatDateTime(record.failedAt)}
						</Text>
					)}
				</Space>
			),
		},
	];

	return (
		<Flex vertical gap={24}>
			<Card>
				<Flex justify="space-between" align="center" wrap="wrap" gap={16}>
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
							메시지 큐
						</Text>
						<Title level={2} style={{ margin: 0 }}>
							CRM 운영
						</Title>
						<Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
							만료 안내 대상자를 적재하고 메시지 발송 상태를 한 화면에서 점검할
							수 있습니다.
						</Paragraph>
						<Space wrap>
							<Tag color="blue">큐 자동화</Tag>
							<Tag color="cyan">발송 감사</Tag>
							<Tag color="purple">권한 기반 제한</Tag>
						</Space>
					</Space>
					<Button
						icon={<ReloadOutlined />}
						disabled={!isLiveCrmRoleSupported}
						onClick={() => {
							clearCrmFeedback();
							const nextFilters = createDefaultCrmFilters();
							setCrmFilters(nextFilters);
							void refetchCrmHistory();
							void refetchCrmTemplates();
						}}
					>
						로그 새로고침
					</Button>
				</Flex>
			</Card>

			<Row gutter={[16, 16]}>
				{[
					{
						label: "전체 로그",
						value: crmHistoryRows.length,
						hint: "조회 조건 내 전체 이력",
					},
					{
						label: "대기 중인 큐",
						value: pendingCount,
						hint: "발송 대기 및 재시도",
						color: "#1677ff",
					},
					{
						label: "발송 성공",
						value: sentCount,
						hint: "최종 발송 완료",
						color: "#52c41a",
					},
					{
						label: "최종 실패",
						value: failedCount,
						hint: "DEAD 상태(수동 확인 필요)",
						color: "#ff4d4f",
					},
				].map((stat) => (
					<Col xs={12} sm={6} key={stat.label}>
						<Card>
							<Statistic
								title={
									<Text
										type="secondary"
										style={{
											fontSize: "0.75rem",
											fontWeight: 700,
											textTransform: "uppercase",
										}}
									>
										{stat.label}
									</Text>
								}
								value={stat.value}
								valueStyle={{ fontWeight: 800, color: stat.color }}
								suffix={
									<Text
										type="secondary"
										style={{ fontSize: "0.75rem", display: "block" }}
									>
										{stat.hint}
									</Text>
								}
							/>
						</Card>
					</Col>
				))}
			</Row>

			<Card
				title={
					<Space direction="vertical" size={2}>
						<Title level={5} style={{ margin: 0 }}>
							템플릿 거버넌스
						</Title>
						<Text type="secondary" style={{ fontSize: "0.84rem" }}>
							심사 상태와 발송 가능 여부를 한 화면에서 확인합니다.
						</Text>
					</Space>
				}
				extra={
					<Space wrap>
						<Select
							aria-label="템플릿 채널 필터"
							style={{ width: 140 }}
							value={crmTemplateFilters.channelType}
							disabled={!isLiveCrmRoleSupported}
							onChange={(value) =>
								setCrmTemplateFilters((prev) => ({
									...prev,
									channelType: value as typeof prev.channelType,
								}))
							}
							options={[
								{ label: "전체 채널", value: "" },
								{ label: "SMS", value: "SMS" },
								{ label: "알림톡", value: "KAKAO" },
								{ label: "이메일", value: "EMAIL" },
							]}
						/>
						<Button
							disabled={!isLiveCrmRoleSupported}
							type={crmTemplateFilters.activeOnly ? "primary" : "default"}
							onClick={() =>
								setCrmTemplateFilters((prev) => ({
									...prev,
									activeOnly: !prev.activeOnly,
								}))
							}
						>
							{crmTemplateFilters.activeOnly ? "활성만 보기" : "전체 보기"}
						</Button>
					</Space>
				}
			>
				<Space direction="vertical" size={16} style={{ width: "100%" }}>
					{crmTemplateError && (
						<Alert message={crmTemplateError} type="error" showIcon />
					)}
					<Row gutter={[16, 16]}>
						<Col xs={24} lg={15}>
							<Table<CrmTemplateRow>
								rowKey="templateId"
								loading={crmTemplateLoading}
								dataSource={crmTemplateRows}
								pagination={false}
								rowClassName={(record) =>
									record.templateId === selectedTemplate?.templateId
										? "is-selected-row"
										: ""
								}
								onRow={(record) => ({
									onClick: () => setCrmSelectedTemplateId(record.templateId),
								})}
								columns={[
									{
										title: "템플릿",
										key: "template",
										render: (_, record) => (
											<Space direction="vertical" size={2}>
												<Space align="center">
													<Text
														strong
														style={{
															color: record.sendable ? undefined : "#ccc",
														}}
													>
														{record.templateName}
													</Text>
													{!record.sendable && (
														<Tag color="warning">발송 제한</Tag>
													)}
												</Space>
												<Text type="secondary" style={{ fontSize: "0.75rem" }}>
													{record.templateCode}
												</Text>
											</Space>
										),
									},
									{
										title: "채널 / 유형",
										key: "channelType",
										render: (_, record) => (
											<Space direction="vertical" size={4}>
												<Tag>{record.channelType}</Tag>
												<Text type="secondary" style={{ fontSize: "0.75rem" }}>
													{record.templateType}
												</Text>
											</Space>
										),
									},
									{
										title: "심사 상태",
										key: "reviewStatus",
										render: (_, record) => {
											const reviewConfig = templateReviewStatusMap[
												record.reviewStatus
											] ?? {
												label: record.reviewStatus,
												color: "default",
											};
											const operationalConfig = templateOperationalStatusMap[
												record.operationalStatus
											] ?? {
												label: record.operationalStatus,
												color: "default",
											};

											return (
												<Space direction="vertical" size={4}>
													<Tag color={reviewConfig.color}>
														{reviewConfig.label}
													</Tag>
													<Tag color={operationalConfig.color}>
														{operationalConfig.label}
													</Tag>
												</Space>
											);
										},
									},
									{
										title: "활성",
										key: "isActive",
										render: (_, record) => (
											<Tag color={record.isActive ? "success" : "default"}>
												{record.isActive ? "활성" : "비활성"}
											</Tag>
										),
									},
									{
										title: "수정 시각",
										dataIndex: "updatedAt",
										key: "updatedAt",
										render: (updatedAt) => (
											<Text type="secondary" style={{ fontSize: "0.8rem" }}>
												{formatDateTime(updatedAt)}
											</Text>
										),
									},
								]}
							/>
						</Col>
						<Col xs={24} lg={9}>
							<Card size="small" title="선택 템플릿 상세">
								{selectedTemplate ? (
									<Space
										direction="vertical"
										size={12}
										style={{ width: "100%" }}
									>
										<Space wrap>
											<Tag color="blue">{selectedTemplate.templateCode}</Tag>
											<Tag
												color={selectedTemplate.sendable ? "green" : "default"}
											>
												{selectedTemplate.sendable ? "발송 가능" : "발송 제한"}
											</Tag>
										</Space>
										<div>
											<Text type="secondary" style={{ fontSize: "0.75rem" }}>
												템플릿명
											</Text>
											<div>
												<Text strong>{selectedTemplate.templateName}</Text>
											</div>
										</div>
										<div>
											<Text type="secondary" style={{ fontSize: "0.75rem" }}>
												상태
											</Text>
											<div>
												<Text>
													{templateReviewStatusMap[
														selectedTemplate.reviewStatus
													]?.label ?? selectedTemplate.reviewStatus}
													{" / "}
													{templateOperationalStatusMap[
														selectedTemplate.operationalStatus
													]?.label ?? selectedTemplate.operationalStatus}
												</Text>
											</div>
										</div>
										<div>
											<Text type="secondary" style={{ fontSize: "0.75rem" }}>
												본문
											</Text>
											<Paragraph
												style={{
													marginTop: 4,
													marginBottom: 0,
													whiteSpace: "pre-wrap",
												}}
											>
												{selectedTemplate.templateBody}
											</Paragraph>
										</div>
										<Space direction="vertical" size={4}>
											<Text type="secondary" style={{ fontSize: "0.75rem" }}>
												채널: {selectedTemplate.channelType}
											</Text>
											<Text type="secondary" style={{ fontSize: "0.75rem" }}>
												활성: {selectedTemplate.isActive ? "예" : "아니오"}
											</Text>
											<Text type="secondary" style={{ fontSize: "0.75rem" }}>
												수정: {formatDateTime(selectedTemplate.updatedAt)}
											</Text>
										</Space>
									</Space>
								) : (
									<Empty
										description="템플릿을 선택하면 상세 상태를 볼 수 있습니다."
										image={Empty.PRESENTED_IMAGE_SIMPLE}
									/>
								)}
							</Card>
						</Col>
					</Row>
				</Space>
			</Card>

			<Row gutter={[24, 24]}>
				<Col xs={24} lg={8}>
					<Flex vertical gap={24}>
						<Card
							title={
								<Space direction="vertical" size={2}>
									<Title level={5} style={{ margin: 0 }}>
										큐 자동화 제어
									</Title>
									<Text type="secondary" style={{ fontSize: "0.84rem" }}>
										만료 안내 기준 및 메시지 큐 실행
									</Text>
								</Space>
							}
						>
							<Flex vertical gap={16}>
								<Form layout="vertical">
									<Form.Item
										label={
											<Text strong style={{ fontSize: "0.84rem" }}>
												만료 안내 기준 (D-Day)
											</Text>
										}
									>
										<Flex vertical gap={8}>
											<InputNumber
												min={0}
												max={30}
												style={{ width: "100%" }}
												value={Number(crmTriggerDaysAhead)}
												disabled={!isLiveCrmRoleSupported}
												onChange={(val) =>
													setCrmTriggerDaysAhead(String(val || 0))
												}
												placeholder="일수 입력"
											/>
											<Text type="secondary" style={{ fontSize: "0.75rem" }}>
												입력한 일수만큼 만료가 남은 회원을 추출합니다.
											</Text>
										</Flex>
									</Form.Item>
									<Form.Item
										label={
											<Text strong style={{ fontSize: "0.84rem" }}>
												예약 발송 시각
											</Text>
										}
									>
										<DatePicker
											showTime
											style={{ width: "100%" }}
											disabled={!isLiveCrmRoleSupported}
											value={
												crmTriggerScheduledAt
													? dayjs(crmTriggerScheduledAt)
													: null
											}
											onChange={(date) =>
												setCrmTriggerScheduledAt(date ? date.toISOString() : "")
											}
											placeholder="예약 발송 시각 (선택)"
										/>
									</Form.Item>
									<Flex vertical gap={8}>
										<Button
											type="primary"
											block
											icon={<NotificationOutlined />}
											onClick={() => void runTrigger()}
											loading={crmTriggerSubmitting}
											disabled={crmTriggerSubmitting || !isLiveCrmRoleSupported}
										>
											안내 대상 적재
										</Button>
										<Button
											block
											icon={<PlayCircleOutlined />}
											onClick={() => void runProcess()}
											loading={crmProcessSubmitting}
											disabled={crmProcessSubmitting || !isLiveCrmRoleSupported}
										>
											메시지 큐 실행
										</Button>
									</Flex>
								</Form>

								<div style={{ marginTop: 8 }}>
									<Text
										type="secondary"
										style={{
											fontSize: "0.84rem",
											display: "block",
											marginBottom: 12,
										}}
									>
										운영 피드백 및 상태
									</Text>
									{!isLiveCrmRoleSupported && (
										<Alert
											message="운영 권한 제한"
											description="현재 관리자 권한이 없어 CRM 발송 작업을 실행할 수 없습니다."
											type="error"
											showIcon
										/>
									)}
									{crmPanelMessage && (
										<Alert
											message={crmPanelMessage}
											type="success"
											showIcon
											style={{ marginBottom: 8 }}
										/>
									)}
									{crmPanelError && (
										<Alert
											message={crmPanelError}
											type="error"
											showIcon
											style={{ marginBottom: 8 }}
										/>
									)}
									{!crmPanelMessage &&
										!crmPanelError &&
										isLiveCrmRoleSupported && (
											<Empty
												description={
													<Text type="secondary">
														실행 대기 중입니다.
														<br />
														작업을 선택해 주세요.
													</Text>
												}
												image={Empty.PRESENTED_IMAGE_SIMPLE}
											/>
										)}
								</div>
							</Flex>
						</Card>

						<Card
							title={
								<Space direction="vertical" size={2}>
									<Title level={5} style={{ margin: 0 }}>
										장기 미방문 캠페인
									</Title>
									<Text type="secondary" style={{ fontSize: "0.84rem" }}>
										선택한 템플릿으로 장기 미방문 회원을 재방문 유도 대상으로
										적재합니다.
									</Text>
								</Space>
							}
						>
							<Flex vertical gap={12}>
								<Form layout="vertical">
									<Form.Item
										label={
											<Text strong style={{ fontSize: "0.84rem" }}>
												캠페인 템플릿
											</Text>
										}
									>
										<Select
											aria-label="템플릿 선택"
											style={{ width: "100%" }}
											value={crmSelectedTemplateId}
											disabled={!isLiveCrmRoleSupported}
											loading={crmTemplateLoading}
											onChange={(val) => setCrmSelectedTemplateId(val)}
											placeholder="템플릿 선택"
											options={crmTemplateRows
												.filter((t) => t.isActive)
												.map((t) => ({
													label: `[${t.templateCode}] ${t.templateName}`,
													value: t.templateId,
												}))}
										/>
									</Form.Item>
									<Form.Item
										label={
											<Text strong style={{ fontSize: "0.84rem" }}>
												미방문 기준 (일)
											</Text>
										}
									>
										<InputNumber
											aria-label="장기 미방문 일수"
											min={1}
											max={3650}
											style={{ width: "100%" }}
											value={Number(crmInactiveDays)}
											disabled={!isLiveCrmRoleSupported}
											onChange={(val) => setCrmInactiveDays(String(val || 0))}
											placeholder="일수 입력"
										/>
									</Form.Item>
									<Form.Item
										label={
											<Text strong style={{ fontSize: "0.84rem" }}>
												예약 발송 시각
											</Text>
										}
									>
										<DatePicker
											showTime
											aria-label="예약 발송 시각"
											style={{ width: "100%" }}
											disabled={!isLiveCrmRoleSupported}
											value={
												crmInactiveScheduledAt
													? dayjs(crmInactiveScheduledAt)
													: null
											}
											onChange={(date) =>
												setCrmInactiveScheduledAt(
													date ? date.toISOString() : "",
												)
											}
											placeholder="예약 발송 시각 (선택)"
										/>
									</Form.Item>
									<Button
										block
										type="primary"
										onClick={() => void runLongTermInactive()}
										loading={crmInactiveSubmitting}
										disabled={
											crmInactiveSubmitting ||
											!isLiveCrmRoleSupported ||
											!selectedTemplate
										}
									>
										장기 미방문 적재
									</Button>
								</Form>
							</Flex>
						</Card>
					</Flex>
				</Col>

				<Col xs={24} lg={16}>
					<Card
						title={
							<Space direction="vertical" size={2}>
								<Title level={5} style={{ margin: 0 }}>
									발송 로그 및 이력
								</Title>
								<Text type="secondary" style={{ fontSize: "0.84rem" }}>
									상태, 재시도, 실패 이력을 확인합니다.
								</Text>
							</Space>
						}
						extra={
							<Select
								aria-label="발송 상태 필터"
								style={{ width: 140 }}
								value={crmFilters.sendStatus}
								disabled={!isLiveCrmRoleSupported}
								onChange={(value) =>
									setCrmFilters((prev) => ({
										...prev,
										sendStatus: value as typeof prev.sendStatus,
									}))
								}
								options={[
									{ label: "전체 상태", value: "" },
									{ label: "대기 중", value: "PENDING" },
									{ label: "재시도 예정", value: "RETRY_WAIT" },
									{ label: "발송 완료", value: "SENT" },
									{ label: "실패", value: "DEAD" },
								]}
							/>
						}
					>
						<Table<CrmHistoryRow>
							rowKey="crmMessageEventId"
							loading={crmHistoryLoading}
							columns={columns}
							dataSource={historyPagination.pagedItems}
							pagination={{
								current: historyPagination.page,
								pageSize: historyPagination.pageSize,
								total: historyPagination.totalItems,
								showSizeChanger: true,
								pageSizeOptions: ["10", "20"],
								onChange: (page, pageSize) => {
									historyPagination.setPage(page);
									historyPagination.setPageSize(pageSize);
								},
							}}
							locale={{
								emptyText: crmHistoryLoading
									? "로그를 불러오는 중..."
									: "발송 이력이 없습니다.",
							}}
							scroll={{ x: 720 }}
						/>
					</Card>
				</Col>
			</Row>
		</Flex>
	);
}
