import {
	Button,
	Card,
	Modal,
	message,
	Select,
	Space,
	Table,
	Tag,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import type { AuditLog } from "./modules/types";
import { useAuditLogsQuery } from "./modules/useAuditLogsQuery";

const { Title, Text } = Typography;

const EVENT_TYPES = [
	{ label: "전체", value: "" },
	{ label: "PII 조회", value: "PII_READ" },
	{ label: "회원권 홀딩", value: "MEMBERSHIP_HOLD" },
	{ label: "회원권 복구", value: "MEMBERSHIP_RESUME" },
	{ label: "회원권 환불", value: "MEMBERSHIP_REFUND" },
	{ label: "계정 권한 변경", value: "ACCOUNT_ROLE_CHANGE" },
	{ label: "계정 상태 변경", value: "ACCOUNT_STATUS_CHANGE" },
	{ label: "계정 접속 취소", value: "ACCOUNT_ACCESS_REVOKE" },
];

export default function AuditLogsPage() {
	const [eventType, setEventType] = useState<string>("");
	const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const { data, isLoading, error } = useAuditLogsQuery({ eventType });

	const showDetail = (log: AuditLog) => {
		setSelectedLog(log);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setSelectedLog(null);
	};

	if (error) {
		message.error("감사 로그를 불러오는 중 오류가 발생했습니다.");
	}

	const columns = [
		{
			title: "일시",
			dataIndex: "eventAt",
			key: "eventAt",
			render: (text: string) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
			width: 180,
		},
		{
			title: "이벤트 유형",
			dataIndex: "eventType",
			key: "eventType",
			render: (type: string) => {
				let color = "default";
				if (type.includes("MEMBERSHIP")) color = "blue";
				if (type.includes("ACCOUNT")) color = "orange";
				if (type.includes("PII")) color = "red";
				return <Tag color={color}>{type}</Tag>;
			},
			width: 150,
		},
		{
			title: "수행자 ID",
			dataIndex: "actorUserId",
			key: "actorUserId",
			width: 100,
		},
		{
			title: "대상 리소스",
			key: "resource",
			render: (_: unknown, record: AuditLog) => (
				<Space direction="vertical" size={0}>
					<Text type="secondary">
						{record.resourceType}
					</Text>
					<Text strong>{record.resourceId}</Text>
				</Space>
			),
		},
		{
			title: "액션",
			key: "action",
			render: (_: unknown, record: AuditLog) => (
				<Button size="small" onClick={() => showDetail(record)}>
					상세 보기
				</Button>
			),
			width: 100,
		},
	];

	return (
		<div style={{ padding: "24px" }}>
			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<Title level={2} style={{ margin: 0 }}>
						감사 로그 관리
					</Title>
					<Space>
						<Text>이벤트 필터:</Text>
						<Select
							style={{ width: 200 }}
							placeholder="이벤트 유형 선택"
							value={eventType}
							onChange={setEventType}
							options={EVENT_TYPES}
						/>
					</Space>
				</div>

				<Card variant="outlined">
					<Table
						dataSource={data?.rows}
						columns={columns}
						rowKey="auditLogId"
						loading={isLoading}
						pagination={{
							pageSize: 20,
							showSizeChanger: false,
							hideOnSinglePage: true,
						}}
					/>
				</Card>
			</Space>

			<Modal
				title="감사 로그 상세 내역"
				open={isModalOpen}
				onCancel={closeModal}
				footer={[
					<Button key="close" onClick={closeModal}>
						닫기
					</Button>,
				]}
				width={700}
			>
				{selectedLog && (
					<div style={{ maxHeight: "500px", overflow: "auto" }}>
						<Descriptions log={selectedLog} />
						<Title level={5} style={{ marginTop: "16px" }}>
							원본 데이터 (JSON)
						</Title>
						<pre
							style={{
								padding: "12px",
								backgroundColor: "#f5f5f5",
								borderRadius: "4px",
								fontSize: "12px",
								whiteSpace: "pre-wrap",
								wordBreak: "break-all",
							}}
						>
							{(() => {
								try {
									return JSON.stringify(
										JSON.parse(selectedLog.attributesJson || "{}"),
										null,
										2,
									);
								} catch (e) {
									return selectedLog.attributesJson;
								}
							})()}
						</pre>
					</div>
				)}
			</Modal>
		</div>
	);
}

function Descriptions({ log }: { log: AuditLog }) {
	return (
		<div
			style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
		>
			<div>
				<Text type="secondary">ID:</Text> {log.auditLogId}
			</div>
			<div>
				<Text type="secondary">실행 일시:</Text>{" "}
				{dayjs(log.eventAt).format("YYYY-MM-DD HH:mm:ss")}
			</div>
			<div>
				<Text type="secondary">수행자:</Text> {log.actorUserId}
			</div>
			<div>
				<Text type="secondary">Trace ID:</Text>{" "}
				<Text copyable>{log.traceId}</Text>
			</div>
		</div>
	);
}
