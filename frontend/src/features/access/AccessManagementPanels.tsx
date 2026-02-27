import type { Dispatch, SetStateAction } from "react";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { formatDateTime } from "../../shared/utils/format";

type MemberRow = {
  memberId: number;
  memberName: string;
  phone: string;
  memberStatus: "ACTIVE" | "INACTIVE";
};

type PresenceRow = {
  accessSessionId: number;
  memberId: number;
  memberName: string;
  phone: string;
  membershipId: number | null;
  reservationId: number | null;
  entryAt: string;
};

type AccessEventRow = {
  accessEventId: number;
  memberId: number;
  membershipId: number | null;
  reservationId: number | null;
  eventType: "ENTRY_GRANTED" | "EXIT" | "ENTRY_DENIED";
  denyReason: string | null;
  processedAt: string;
};

type PresenceSummary = {
  openSessionCount: number;
  todayEntryGrantedCount: number;
  todayExitCount: number;
  todayEntryDeniedCount: number;
  openSessions: PresenceRow[];
};

type AccessManagementPanelsProps = {
  members: MemberRow[];
  accessMemberQuery: string;
  setAccessMemberQuery: Dispatch<SetStateAction<string>>;
  accessSelectedMemberId: number | null;
  setAccessSelectedMemberId: Dispatch<SetStateAction<number | null>>;
  accessPresence: PresenceSummary | null;
  accessEvents: AccessEventRow[];
  accessPresenceLoading: boolean;
  accessEventsLoading: boolean;
  accessActionSubmitting: boolean;
  handleAccessEntry: (memberId: number) => Promise<void>;
  handleAccessExit: (memberId: number) => Promise<void>;
  reloadAccessData: (memberId: number | null) => Promise<void>;
};

const EVENT_LABEL: Record<AccessEventRow["eventType"], string> = {
  ENTRY_GRANTED: "입장 승인",
  EXIT: "퇴장",
  ENTRY_DENIED: "입장 거절"
};

export function AccessManagementPanels({
  members,
  accessMemberQuery,
  setAccessMemberQuery,
  accessSelectedMemberId,
  setAccessSelectedMemberId,
  accessPresence,
  accessEvents,
  accessPresenceLoading,
  accessEventsLoading,
  accessActionSubmitting,
  handleAccessEntry,
  handleAccessExit,
  reloadAccessData
}: AccessManagementPanelsProps) {
  const filteredMembers = members.filter((member) => {
    const query = accessMemberQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return (
      member.memberName.toLowerCase().includes(query) ||
      member.phone.toLowerCase().includes(query) ||
      String(member.memberId).includes(query)
    );
  });

  const selectedMember = members.find((member) => member.memberId === accessSelectedMemberId) ?? null;

  return (
    <>
      <article className="panel">
        <PanelHeader
          title="오늘 출입 요약"
          actions={
            <button
              type="button"
              className="secondary-button"
              onClick={() => void reloadAccessData(accessSelectedMemberId)}
              disabled={accessPresenceLoading || accessEventsLoading}
            >
              {accessPresenceLoading || accessEventsLoading ? "새로고침 중..." : "새로고침"}
            </button>
          }
        />
        <dl className="detail-grid compact-detail-grid">
          <div>
            <dt>현재 입장중</dt>
            <dd>{accessPresence?.openSessionCount ?? 0}</dd>
          </div>
          <div>
            <dt>오늘 입장</dt>
            <dd>{accessPresence?.todayEntryGrantedCount ?? 0}</dd>
          </div>
          <div>
            <dt>오늘 퇴장</dt>
            <dd>{accessPresence?.todayExitCount ?? 0}</dd>
          </div>
          <div>
            <dt>오늘 거절</dt>
            <dd>{accessPresence?.todayEntryDeniedCount ?? 0}</dd>
          </div>
        </dl>
      </article>

      <article className="panel">
        <PanelHeader title="회원 검색 및 출입 처리" />
        <label>
          회원 검색 (ID/이름/전화)
          <input
            value={accessMemberQuery}
            onChange={(event) => setAccessMemberQuery(event.target.value)}
            placeholder="예: 102, 김민수, 010-1234"
          />
        </label>

        <div className="list-shell" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>연락처</th>
                <th>상태</th>
                <th>선택</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <EmptyTableRow colSpan={5} message="검색 결과 회원이 없습니다." />
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.memberId}>
                    <td>{member.memberId}</td>
                    <td>{member.memberName}</td>
                    <td>{member.phone}</td>
                    <td>{member.memberStatus}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setAccessSelectedMemberId(member.memberId)}
                      >
                        {accessSelectedMemberId === member.memberId ? "선택됨" : "선택"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="form-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="primary-button"
            disabled={!selectedMember || accessActionSubmitting}
            onClick={() => selectedMember && void handleAccessEntry(selectedMember.memberId)}
          >
            {accessActionSubmitting ? "처리 중..." : "입장 처리"}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!selectedMember || accessActionSubmitting}
            onClick={() => selectedMember && void handleAccessExit(selectedMember.memberId)}
          >
            퇴장 처리
          </button>
          <span className="muted-text">
            선택 회원: {selectedMember ? `#${selectedMember.memberId} ${selectedMember.memberName}` : "-"}
          </span>
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="현재 입장중 회원" />
        <div className="list-shell">
          <table>
            <thead>
              <tr>
                <th>회원 ID</th>
                <th>회원명</th>
                <th>연락처</th>
                <th>회원권ID</th>
                <th>예약ID</th>
                <th>입장시각</th>
              </tr>
            </thead>
            <tbody>
              {accessPresence?.openSessions.length ? (
                accessPresence.openSessions.map((session) => (
                  <tr key={session.accessSessionId}>
                    <td>{session.memberId}</td>
                    <td>{session.memberName}</td>
                    <td>{session.phone}</td>
                    <td>{session.membershipId ?? "-"}</td>
                    <td>{session.reservationId ?? "-"}</td>
                    <td>{formatDateTime(session.entryAt)}</td>
                  </tr>
                ))
              ) : (
                <EmptyTableRow colSpan={6} message="현재 입장중 회원이 없습니다." />
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="최근 출입 이벤트" />
        <div className="list-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>회원ID</th>
                <th>회원권ID</th>
                <th>예약ID</th>
                <th>이벤트</th>
                <th>거절사유</th>
                <th>처리시각</th>
              </tr>
            </thead>
            <tbody>
              {accessEvents.length === 0 ? (
                <EmptyTableRow colSpan={7} message={accessEventsLoading ? "로딩 중..." : "출입 이벤트가 없습니다."} />
              ) : (
                accessEvents.map((event) => (
                  <tr key={event.accessEventId}>
                    <td>{event.accessEventId}</td>
                    <td>{event.memberId}</td>
                    <td>{event.membershipId ?? "-"}</td>
                    <td>{event.reservationId ?? "-"}</td>
                    <td>{EVENT_LABEL[event.eventType]}</td>
                    <td>{event.denyReason ?? "-"}</td>
                    <td>{formatDateTime(event.processedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
