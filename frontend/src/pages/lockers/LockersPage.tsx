import {
	HistoryOutlined,
	LockOutlined,
	MinusOutlined,
	PlusOutlined,
	SolutionOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	DatePicker,
	Empty,
	Flex,
	Form,
	Input,
	InputNumber,
	Modal,
	Row,
	Select,
	Space,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { useAuthState } from "../../app/auth";
import { usePagination } from "../../shared/hooks/usePagination";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { MemberSummary } from "../members/modules/types";
import { useMembersQuery } from "../members/modules/useMembersQuery";
import { useLockerPrototypeState } from "./modules/useLockerPrototypeState";
import { useLockerQueries } from "./modules/useLockerQueries";
import {
	buildLockerCode,
	type LockerCreateRow,
} from "./modules/types";
import {
	canAccessLockerWorkspace,
	canRegisterLockerSlots,
} from "./modules/lockerPermissions";

const { Paragraph, Text, Title } = Typography;

function buildStatusTag(status: string) {
	if (status === "AVAILABLE") return <Tag color="success">사용 가능</Tag>;
	if (status === "ASSIGNED") return <Tag color="processing">배정됨</Tag>;
	if (status === "MAINTENANCE") return <Tag color="error">점검 중</Tag>;
	if (status === "ACTIVE") return <Tag color="success">사용 중</Tag>;
	if (status === "RETURNED") return <Tag>반납됨</Tag>;
	return <Tag>{status}</Tag>;
}

export default function LockersPage() {
	const { authUser, isMockMode } = useAuthState();
	const { selectedMemberId } = useSelectedMemberStore();
	const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const { members } = useMembersQuery({
		name: "",
		phone: "",
		memberStatus: "",
		membershipOperationalStatus: "",
		dateFrom: "",
		dateTo: "",
	});

	const {
		lockerFilters,
		setLockerFilters,
		lockerAssignForm,
		setLockerAssignForm,
		lockerCreateRows,
		lockerCreateSubmitting,
		lockerCreatePanelMessage,
		lockerCreatePanelError,
		lockerAssignSubmitting,
		lockerReturnSubmittingId,
		lockerPanelMessage,
		lockerPanelError,
		appendLockerCreateRow,
		updateLockerCreateRow,
		removeLockerCreateRow,
		resetLockerCreateRows,
		clearLockerCreateFeedback,
		handleLockerAssign,
		handleLockerReturn,
		handleLockerCreateBatch,
	} = useLockerPrototypeState(selectedMemberId);

	const {
		lockerSlots,
		lockerSlotsLoading,
		lockerAssignments,
		lockerAssignmentsLoading,
		lockerQueryError,
	} = useLockerQueries(lockerFilters);

	const isLiveLockerWorkspaceSupported = canAccessLockerWorkspace(
		authUser,
		isMockMode,
	);
	const canCreateLockerSlots = canRegisterLockerSlots(authUser, isMockMode);

	const slotsPagination = usePagination(lockerSlots, {
		initialPageSize: 10,
		resetDeps: [
			lockerSlots.length,
			lockerFilters.lockerStatus,
			lockerFilters.lockerZone,
		],
	});
	const assignmentsPagination = usePagination(lockerAssignments, {
		initialPageSize: 10,
		resetDeps: [lockerAssignments.length],
	});

	const availableSlots = useMemo(
		() => lockerSlots.filter((slot) => slot.lockerStatus === "AVAILABLE"),
		[lockerSlots],
	);

	async function runLockerAssign() {
		const ok = await handleLockerAssign();
		if (ok) {
			setIsAssignModalOpen(false);
		}
	}

  async function runLockerCreateBatch() {
		await handleLockerCreateBatch();
  }

	async function runLockerReturn(lockerAssignmentId: number) {
		await handleLockerReturn(lockerAssignmentId);
	}

	const slotColumns: ColumnsType<(typeof lockerSlots)[number]> = [
		{
			title: "라커",
			key: "locker",
			render: (_, slot) => (
				<Space direction="vertical" size={2}>
					<Text strong>{slot.lockerCode}</Text>
					<Text type="secondary" style={{ fontSize: "0.75rem" }}>
						구역: {slot.lockerZone ?? "-"}
					</Text>
				</Space>
			),
		},
		{
			title: "등급",
			dataIndex: "lockerGrade",
			key: "lockerGrade",
			render: (lockerGrade) => lockerGrade ?? "-",
		},
		{
			title: "상태",
			dataIndex: "lockerStatus",
			key: "lockerStatus",
			render: (lockerStatus) => buildStatusTag(lockerStatus),
		},
		{
			title: "메모",
			dataIndex: "memo",
			key: "memo",
			align: "right",
			render: (memo) => (
				<Text type="secondary" style={{ fontSize: "0.75rem" }}>
					{memo ?? "-"}
				</Text>
			),
		},
	];

	const assignmentColumns: ColumnsType<(typeof lockerAssignments)[number]> = [
		{
			title: "라커 / 회원",
			key: "lockerMember",
			render: (_, assignment) => (
				<Space direction="vertical" size={2}>
					<Text strong>{assignment.lockerCode}</Text>
					<Text type="secondary" style={{ fontSize: "0.75rem" }}>
						{assignment.memberName} (#{assignment.memberId})
					</Text>
				</Space>
			),
		},
		{
			title: "사용 기간",
			key: "period",
			render: (_, assignment) => (
				<Space direction="vertical" size={2}>
					<Text style={{ fontSize: "0.84rem" }}>{assignment.startDate}</Text>
					<Text type="secondary" style={{ fontSize: "0.75rem" }}>
						to {assignment.endDate}
					</Text>
				</Space>
			),
		},
		{
			title: "액션",
			key: "actions",
			align: "right",
			render: (_, assignment) =>
				assignment.assignmentStatus === "ACTIVE" ? (
					<Button
						danger
						size="small"
						disabled={
							lockerReturnSubmittingId === assignment.lockerAssignmentId ||
							!isLiveLockerWorkspaceSupported
						}
						onClick={() => void runLockerReturn(assignment.lockerAssignmentId)}
					>
						{lockerReturnSubmittingId === assignment.lockerAssignmentId
							? "처리 중..."
							: "반납"}
					</Button>
				) : (
					buildStatusTag(assignment.assignmentStatus)
			),
		},
	];

	const createColumns: ColumnsType<LockerCreateRow> = [
		{
			title: "구역",
			key: "lockerZone",
			width: 120,
			render: (_, row, index) => (
				<Input
					value={row.lockerZone}
					placeholder="예: A"
					onChange={(event) =>
						updateLockerCreateRow(index, (prev) => ({
							...prev,
							lockerZone: event.target.value,
						}))
					}
				/>
			),
		},
		{
			title: "번호",
			key: "lockerNumber",
			width: 110,
			render: (_, row, index) => (
				<InputNumber
					min={1}
					precision={0}
					style={{ width: "100%" }}
					value={row.lockerNumber ?? undefined}
					placeholder="1"
					onChange={(value) =>
						updateLockerCreateRow(index, (prev) => ({
							...prev,
							lockerNumber:
								typeof value === "number" && Number.isFinite(value)
									? value
									: null,
						}))
					}
				/>
			),
		},
		{
			title: "자동 코드",
			key: "lockerCode",
			render: (_, row) => {
				const lockerCode = buildLockerCode(row.lockerZone, row.lockerNumber);
				return <Text strong>{lockerCode || "-"}</Text>;
			},
		},
		{
			title: "등급",
			key: "lockerGrade",
			width: 140,
			render: (_, row, index) => (
				<Select
					value={row.lockerGrade}
					onChange={(value) =>
						updateLockerCreateRow(index, (prev) => ({
							...prev,
							lockerGrade: value,
						}))
					}
					options={[
						{ label: "STANDARD", value: "STANDARD" },
						{ label: "PREMIUM", value: "PREMIUM" },
					]}
				/>
			),
		},
		{
			title: "상태",
			key: "lockerStatus",
			width: 140,
			render: (_, row, index) => (
				<Select
					value={row.lockerStatus}
					onChange={(value) =>
						updateLockerCreateRow(index, (prev) => ({
							...prev,
							lockerStatus: value as LockerCreateRow["lockerStatus"],
						}))
					}
					options={[
						{ label: "사용 가능", value: "AVAILABLE" },
						{ label: "배정됨", value: "ASSIGNED" },
						{ label: "점검 중", value: "MAINTENANCE" },
					]}
				/>
			),
		},
		{
			title: "메모",
			key: "memo",
			render: (_, row, index) => (
				<Input
					value={row.memo}
					placeholder="선택 입력"
					onChange={(event) =>
						updateLockerCreateRow(index, (prev) => ({
							...prev,
							memo: event.target.value,
						}))
					}
				/>
			),
		},
		{
			title: "행 관리",
			key: "actions",
			width: 96,
			align: "right",
			render: (_, __, index) => (
				<Button
					danger
					size="small"
					icon={<MinusOutlined />}
					onClick={() => removeLockerCreateRow(index)}
				>
					삭제
				</Button>
			),
		},
	];

	const memberOptions = members.map((member: MemberSummary) => ({
		label: `${member.memberName} (#${member.memberId})`,
		value: String(member.memberId),
	}));

	const slotOptions = availableSlots.map((slot) => ({
		label: `${slot.lockerCode} (${slot.lockerZone ?? "-"})`,
		value: String(slot.lockerSlotId),
	}));

	const activeAssignmentCount = lockerAssignments.filter(
		(assignment) => assignment.assignmentStatus === "ACTIVE",
	).length;

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
							보관함 관리
						</Text>
						<Title level={2} style={{ margin: 0 }}>
							라커 관리
						</Title>
						<Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
							라커 재고를 확인하고 현재 배정 현황을 점검하며 신규 배정을 처리할
							수 있습니다.
						</Paragraph>
						<Space wrap>
							<Tag color="blue">라커 재고</Tag>
							<Tag color="cyan">배정 현황</Tag>
							<Tag color="purple">회원 연동 모달</Tag>
						</Space>
					</Space>
					<Space wrap>
						<Button
							size="large"
							icon={<PlusOutlined />}
							onClick={() => {
								resetLockerCreateRows();
								clearLockerCreateFeedback();
								setIsCreateModalOpen(true);
							}}
							disabled={!canCreateLockerSlots}
						>
							라커 등록
						</Button>
						<Button
							type="primary"
							size="large"
							icon={<LockOutlined />}
							onClick={() => setIsAssignModalOpen(true)}
							disabled={!isLiveLockerWorkspaceSupported}
						>
							신규 배정
						</Button>
					</Space>
				</Flex>
			</Card>

			<Row gutter={[16, 16]}>
				{[
					{
						label: "전체 라커",
						value: lockerSlots.length,
						hint: "시스템 등록 라커",
					},
					{
						label: "사용 가능",
						value: availableSlots.length,
						hint: "즉시 배정 가능",
						color: "#52c41a",
					},
					{
						label: "현재 배정",
						value: activeAssignmentCount,
						hint: "활성 사용 건수",
						color: "#1677ff",
					},
					{
						label: "시스템 권한",
						value: isLiveLockerWorkspaceSupported ? "풀 액세스" : "조회 전용",
						hint: isLiveLockerWorkspaceSupported ? "운영 가능" : "작업 제한",
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

			<Row gutter={[24, 24]}>
				<Col xs={24} lg={14}>
					<Card
						title={
							<Space direction="vertical" size={2}>
								<Title level={5} style={{ margin: 0 }}>
									<SolutionOutlined /> 라커 목록
								</Title>
								<Text type="secondary" style={{ fontSize: "0.84rem" }}>
									가용 라커와 구역 정보를 확인하고 배정 작업을 준비합니다.
								</Text>
							</Space>
						}
					>
						<Flex vertical gap={16}>
							<Row gutter={16}>
								<Col span={12}>
									<Form.Item label="상태 필터" style={{ marginBottom: 0 }}>
										<Select
											value={lockerFilters.lockerStatus}
											disabled={!isLiveLockerWorkspaceSupported}
											onChange={(value) =>
												setLockerFilters((prev) => ({
													...prev,
													lockerStatus: value as typeof prev.lockerStatus,
												}))
											}
											options={[
												{ label: "전체 상태", value: "" },
												{ label: "사용 가능", value: "AVAILABLE" },
												{ label: "배정됨", value: "ASSIGNED" },
												{ label: "점검 중", value: "MAINTENANCE" },
											]}
										/>
									</Form.Item>
								</Col>
								<Col span={12}>
									<Form.Item label="구역 검색" style={{ marginBottom: 0 }}>
										<Input
											value={lockerFilters.lockerZone}
											disabled={!isLiveLockerWorkspaceSupported}
											onChange={(event) =>
												setLockerFilters((prev) => ({
													...prev,
													lockerZone: event.target.value,
												}))
											}
											placeholder="예: A구역"
										/>
									</Form.Item>
								</Col>
							</Row>

							{!isLiveLockerWorkspaceSupported && (
								<Alert
									type="warning"
									showIcon
									message="운영 권한 제한"
									description="현재 관리자 권한이 없어 라커 배정 및 수정 작업을 실행할 수 없습니다."
								/>
							)}

							{lockerPanelMessage && (
								<Alert
									type="success"
									showIcon
									message={lockerPanelMessage}
									closable
								/>
							)}
							{(lockerPanelError || lockerQueryError) && (
								<Alert
									type="error"
									showIcon
									message={lockerPanelError ?? lockerQueryError}
									closable
								/>
							)}

							<Table
								rowKey="lockerSlotId"
								loading={lockerSlotsLoading}
								columns={slotColumns}
								dataSource={slotsPagination.pagedItems}
								pagination={{
									current: slotsPagination.page,
									pageSize: slotsPagination.pageSize,
									total: slotsPagination.totalItems,
									showSizeChanger: true,
									pageSizeOptions: ["10", "20"],
									onChange: (page, pageSize) => {
										slotsPagination.setPage(page);
										slotsPagination.setPageSize(pageSize);
									},
								}}
								locale={{
									emptyText: lockerSlotsLoading ? (
										"라커 목록 불러오는 중..."
									) : (
										<Empty
											image={Empty.PRESENTED_IMAGE_SIMPLE}
											description="조건에 맞는 라커가 없습니다."
										/>
									),
								}}
								scroll={{ x: 400 }}
							/>
						</Flex>
					</Card>
				</Col>

				<Col xs={24} lg={10}>
					<Flex vertical gap={24}>
						<Card
							title={
								<Space direction="vertical" size={2}>
									<Title level={5} style={{ margin: 0 }}>
										<HistoryOutlined /> 현재 배정 현황
									</Title>
									<Text type="secondary" style={{ fontSize: "0.84rem" }}>
										사용 중인 라커와 기간을 확인합니다.
									</Text>
								</Space>
							}
						>
							<Table
								rowKey="lockerAssignmentId"
								loading={lockerAssignmentsLoading}
								columns={assignmentColumns}
								dataSource={assignmentsPagination.pagedItems}
								pagination={{
									current: assignmentsPagination.page,
									pageSize: assignmentsPagination.pageSize,
									total: assignmentsPagination.totalItems,
									showSizeChanger: true,
									pageSizeOptions: ["10", "20"],
									onChange: (page, pageSize) => {
										assignmentsPagination.setPage(page);
										assignmentsPagination.setPageSize(pageSize);
									},
								}}
								locale={{
									emptyText: lockerAssignmentsLoading ? (
										"배정 내역 불러오는 중..."
									) : (
										<Empty
											image={Empty.PRESENTED_IMAGE_SIMPLE}
											description="현재 배정 내역이 없습니다."
										/>
									),
								}}
								scroll={{ x: 300 }}
							/>
						</Card>

						{!isLiveLockerWorkspaceSupported && (
							<Alert
								type="warning"
								showIcon
								message="정보 접근 제한"
								description="배정 및 반납 변경 기능이 잠겨 있습니다. 운영 로그 조회는 가능합니다."
							/>
						)}
					</Flex>
				</Col>
			</Row>

			<Modal
				open={isAssignModalOpen}
				onCancel={() => setIsAssignModalOpen(false)}
				title={
					<Space>
						<LockOutlined />
						<Text strong style={{ fontSize: "1.1rem" }}>
							라커 배정 등록
						</Text>
					</Space>
				}
				footer={[
					<Button key="cancel" onClick={() => setIsAssignModalOpen(false)}>
						취소
					</Button>,
					<Button
						key="submit"
						type="primary"
						onClick={() => void runLockerAssign()}
						loading={lockerAssignSubmitting}
						disabled={
							!lockerAssignForm.lockerSlotId || !lockerAssignForm.memberId
						}
					>
						배정 확정
					</Button>,
				]}
				width={600}
			>
				<Flex vertical gap={16} style={{ marginTop: 16 }}>
					<SelectedMemberContextBadge />

					<Form layout="vertical">
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="대상 라커" required>
									<Select
										value={lockerAssignForm.lockerSlotId || undefined}
										onChange={(value) =>
											setLockerAssignForm((prev) => ({
												...prev,
												lockerSlotId: value,
											}))
										}
										placeholder="라커 선택"
										options={slotOptions}
									/>
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="회원 선택" required>
									<Select
										showSearch
										optionFilterProp="label"
										value={lockerAssignForm.memberId || undefined}
										onChange={(value) =>
											setLockerAssignForm((prev) => ({
												...prev,
												memberId: value,
											}))
										}
										placeholder="회원 선택"
										options={memberOptions}
									/>
								</Form.Item>
							</Col>
						</Row>

						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="시작일" required>
									<DatePicker
										style={{ width: "100%" }}
										value={
											lockerAssignForm.startDate
												? dayjs(lockerAssignForm.startDate)
												: null
										}
										onChange={(date) =>
											setLockerAssignForm((prev) => ({
												...prev,
												startDate: date ? date.format("YYYY-MM-DD") : "",
											}))
										}
									/>
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="종료일" required>
									<DatePicker
										style={{ width: "100%" }}
										value={
											lockerAssignForm.endDate
												? dayjs(lockerAssignForm.endDate)
												: null
										}
										onChange={(date) =>
											setLockerAssignForm((prev) => ({
												...prev,
												endDate: date ? date.format("YYYY-MM-DD") : "",
											}))
										}
									/>
								</Form.Item>
							</Col>
						</Row>

						<Form.Item label="운영 메모" style={{ marginBottom: 0 }}>
							<Input.TextArea
								rows={4}
								value={lockerAssignForm.memo}
								onChange={(e) =>
									setLockerAssignForm((prev) => ({
										...prev,
										memo: e.target.value,
									}))
								}
								placeholder="배정 관련 메모를 입력하세요"
							/>
						</Form.Item>
					</Form>
				</Flex>
			</Modal>

			<Modal
				open={isCreateModalOpen}
				onCancel={() => {
					resetLockerCreateRows();
					clearLockerCreateFeedback();
					setIsCreateModalOpen(false);
				}}
				title={
					<Space>
						<PlusOutlined />
						<Text strong style={{ fontSize: "1.1rem" }}>
							라커 일괄 등록
						</Text>
					</Space>
				}
				footer={[
					<Button
						key="cancel"
						onClick={() => {
							resetLockerCreateRows();
							clearLockerCreateFeedback();
							setIsCreateModalOpen(false);
						}}
					>
						취소
					</Button>,
					<Button
						key="add"
						onClick={appendLockerCreateRow}
						icon={<PlusOutlined />}
					>
						행 추가
					</Button>,
					<Button
						key="submit"
						type="primary"
						onClick={() => void runLockerCreateBatch()}
						loading={lockerCreateSubmitting}
						disabled={
							lockerCreateRows.length === 0 ||
							lockerCreateRows.some(
								(row) =>
									!row.lockerZone.trim() ||
									row.lockerNumber == null ||
									row.lockerNumber < 1,
							)
						}
					>
						일괄 등록
					</Button>,
				]}
				width={1120}
			>
				<Flex vertical gap={16} style={{ marginTop: 16 }}>
					<Alert
						type="info"
						showIcon
						message="구역 + 번호로 라커 코드가 자동 생성됩니다."
						description="모든 행이 유효해야 저장됩니다. 예: 구역 A, 번호 1 → A-01"
					/>
					{lockerCreatePanelMessage && (
						<Alert
							type="success"
							showIcon
							message={lockerCreatePanelMessage}
							closable
						/>
					)}
					{lockerCreatePanelError && (
						<Alert
							type="error"
							showIcon
							message={lockerCreatePanelError}
							closable
						/>
					)}
					<Flex justify="space-between" align="center" wrap="wrap" gap={12}>
						<Text type="secondary">
							행을 추가해 한 번에 여러 라커를 등록할 수 있습니다.
						</Text>
						<Button icon={<PlusOutlined />} onClick={appendLockerCreateRow}>
							행 추가
						</Button>
					</Flex>
					<Table
						rowKey={(_, index) => String(index)}
						columns={createColumns}
						dataSource={lockerCreateRows}
						pagination={false}
						size="small"
						scroll={{ x: 960 }}
					/>
				</Flex>
			</Modal>
		</Flex>
	);
}
