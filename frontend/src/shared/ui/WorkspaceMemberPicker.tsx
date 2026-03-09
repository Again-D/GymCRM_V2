import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { InlineHelpText } from "./InlineHelpText";
import { NoticeText } from "./NoticeText";
import { PanelHeader } from "./PanelHeader";
import { PlaceholderCard } from "./PlaceholderCard";

export type WorkspaceMemberPickerRow = {
  memberId: number;
  memberName: string;
  phone: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  membershipOperationalStatus?: "정상" | "만료임박" | "만료" | "없음";
};

type WorkspaceMemberPickerProps = {
  title: string;
  description: string;
  queryPlaceholder: string;
  emptyMessage: string;
  warningText?: string;
  actions?: ReactNode;
  loadMembers: (keyword?: string) => Promise<WorkspaceMemberPickerRow[]>;
  onSelectMember: (memberId: number) => Promise<boolean>;
  onSelected?: () => void;
  submitLabel?: string;
};

const DEFAULT_SUBMIT_LABEL = "이 회원으로 시작";
const MAX_VISIBLE_RESULTS = 8;
const SEARCH_DEBOUNCE_MS = 250;

export function WorkspaceMemberPicker({
  title,
  description,
  queryPlaceholder,
  emptyMessage,
  warningText,
  actions,
  loadMembers,
  onSelectMember,
  onSelected,
  submitLabel = DEFAULT_SUBMIT_LABEL
}: WorkspaceMemberPickerProps) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<WorkspaceMemberPickerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingMemberId, setSelectingMemberId] = useState<number | null>(null);
  const requestIdRef = useRef(0);
  const loadMembersRef = useRef(loadMembers);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    loadMembersRef.current = loadMembers;
  }, [loadMembers]);

  useEffect(() => {
    if (!deferredQuery) {
      setDebouncedQuery("");
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedQuery(deferredQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [deferredQuery]);

  useEffect(() => {
    let mounted = true;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    void loadMembersRef.current(debouncedQuery || undefined)
      .then((nextRows) => {
        if (!mounted || requestIdRef.current !== requestId) {
          return;
        }
        setRows(nextRows);
      })
      .catch((loadError: unknown) => {
        if (!mounted || requestIdRef.current !== requestId) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "회원 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!mounted || requestIdRef.current !== requestId) {
          return;
        }
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedQuery]);

  const visibleRows = rows.slice(0, MAX_VISIBLE_RESULTS);

  async function handleSelect(memberId: number) {
    setSelectingMemberId(memberId);
    setError(null);
    try {
      const loaded = await onSelectMember(memberId);
      if (loaded) {
        onSelected?.();
      }
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "회원 선택 중 오류가 발생했습니다.");
    } finally {
      setSelectingMemberId(null);
    }
  }

  return (
    <article className="panel">
      <PanelHeader title={title} actions={actions} />
      <PlaceholderCard as="section">
        <div className="workspace-member-picker-shell">
          <p>{description}</p>
          {warningText ? <NoticeText compact>{warningText}</NoticeText> : null}
          <label className="workspace-member-picker-search">
            회원 검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={queryPlaceholder}
            />
          </label>
          <InlineHelpText>이름, 연락처, 회원 ID, 상태로 검색할 수 있습니다.</InlineHelpText>
          {loading ? <p className="muted-text">회원 목록을 불러오는 중...</p> : null}
          {error ? (
            <NoticeText tone="error" compact>
              {error}
            </NoticeText>
          ) : null}
          {!loading ? (
            visibleRows.length === 0 ? (
              <p className="muted-text">{emptyMessage}</p>
            ) : (
              <div className="workspace-member-picker-list" role="list" aria-label="회원 검색 결과">
                {visibleRows.map((member) => (
                  <button
                    key={member.memberId}
                    type="button"
                    className="workspace-member-picker-item"
                    onClick={() => void handleSelect(member.memberId)}
                    disabled={selectingMemberId != null}
                  >
                    <span className="workspace-member-picker-main">
                      <strong>
                        #{member.memberId} {member.memberName}
                      </strong>
                      <span>{member.phone}</span>
                    </span>
                    <span className="workspace-member-picker-meta">
                      <span className={member.memberStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                        {member.memberStatus}
                      </span>
                      {member.membershipOperationalStatus ? (
                        <span className="pill muted">{member.membershipOperationalStatus}</span>
                      ) : null}
                    </span>
                    <span className="workspace-member-picker-cta">
                      {selectingMemberId === member.memberId ? "선택 중..." : submitLabel}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : null}
        </div>
      </PlaceholderCard>
    </article>
  );
}
