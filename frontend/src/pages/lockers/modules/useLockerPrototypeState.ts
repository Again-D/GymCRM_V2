import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiPost, isMockApiMode } from "../../../api/client";
import { queryKeys } from "../../../app/queryHelpers";
import {
  buildLockerCode,
  createEmptyLockerAssignForm,
  createEmptyLockerCreateRow,
  type LockerAssignForm,
  type LockerCreateRow,
  type LockerFilters,
} from "./types";

export function useLockerPrototypeState(selectedMemberId?: number | null) {
  const queryClient = useQueryClient();
  const [lockerFilters, setLockerFilters] = useState<LockerFilters>({
    lockerStatus: "",
    lockerZone: "",
  });
  const [lockerAssignForm, setLockerAssignForm] = useState<LockerAssignForm>(
    () => createEmptyLockerAssignForm(selectedMemberId),
  );
  const [lockerCreateRows, setLockerCreateRows] = useState<LockerCreateRow[]>([
    createEmptyLockerCreateRow(),
  ]);
  const [lockerAssignSubmitting, setLockerAssignSubmitting] = useState(false);
  const [lockerCreateSubmitting, setLockerCreateSubmitting] = useState(false);
  const [lockerReturnSubmittingId, setLockerReturnSubmittingId] = useState<
    number | null
  >(null);
  const [lockerPanelMessage, setLockerPanelMessage] = useState<string | null>(
    null,
  );
  const [lockerPanelError, setLockerPanelError] = useState<string | null>(null);
  const [lockerCreatePanelMessage, setLockerCreatePanelMessage] = useState<
    string | null
  >(null);
  const [lockerCreatePanelError, setLockerCreatePanelError] = useState<
    string | null
  >(null);
  const useMockMutations = isMockApiMode();

  function isFailedMutationResult(result: unknown) {
    if (!result || typeof result !== "object") {
      return false;
    }
    const candidate = result as { ok?: boolean; success?: boolean };
    return candidate.ok === false || candidate.success === false;
  }

  useEffect(() => {
    setLockerAssignForm(createEmptyLockerAssignForm(selectedMemberId));
    setLockerPanelMessage(null);
    setLockerPanelError(null);
    setLockerAssignSubmitting(false);
    setLockerReturnSubmittingId(null);
  }, [selectedMemberId]);

  function clearLockerFeedback() {
    setLockerPanelMessage(null);
    setLockerPanelError(null);
  }

  function clearLockerCreateFeedback() {
    setLockerCreatePanelMessage(null);
    setLockerCreatePanelError(null);
  }

  const invalidateLockers = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.lockers.all });
  };

  function createBlankLockerRow() {
    return createEmptyLockerCreateRow();
  }

  function appendLockerCreateRow() {
    clearLockerCreateFeedback();
    setLockerCreateRows((prev) => [...prev, createBlankLockerRow()]);
  }

  function updateLockerCreateRow(
    index: number,
    updater: (row: LockerCreateRow) => LockerCreateRow,
  ) {
    clearLockerCreateFeedback();
    setLockerCreateRows((prev) =>
      prev.map((row, currentIndex) =>
        currentIndex === index ? updater(row) : row,
      ),
    );
  }

  function removeLockerCreateRow(index: number) {
    clearLockerCreateFeedback();
    setLockerCreateRows((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length > 0 ? next : [createBlankLockerRow()];
    });
  }

  function resetLockerCreateRows() {
    setLockerCreateRows([createBlankLockerRow()]);
  }

  async function handleLockerCreateBatch() {
    clearLockerCreateFeedback();
    setLockerCreateSubmitting(true);
    try {
      const normalizedItems = lockerCreateRows.map((row, index) => {
        const lockerZone = row.lockerZone.trim();
        if (!lockerZone) {
          throw new Error(`${index + 1}행: 구역을 입력해야 합니다.`);
        }
        if (row.lockerNumber == null || !Number.isInteger(row.lockerNumber) || row.lockerNumber < 1) {
          throw new Error(`${index + 1}행: 번호를 입력해야 합니다.`);
        }

        const lockerCode = buildLockerCode(lockerZone, row.lockerNumber);
        if (!lockerCode) {
          throw new Error(`${index + 1}행: 라커 코드를 생성할 수 없습니다.`);
        }

        return {
          lockerZone,
          lockerNumber: row.lockerNumber,
          lockerGrade: row.lockerGrade.trim() || null,
          lockerStatus: row.lockerStatus,
          memo: row.memo.trim() || null,
        };
      });

      const duplicateCode = normalizedItems
        .map((item) => buildLockerCode(item.lockerZone, item.lockerNumber))
        .find((code, index, codes) => codes.indexOf(code) !== index);
      if (duplicateCode) {
        setLockerCreatePanelError(`중복 라커 코드가 있습니다: ${duplicateCode}`);
        return false;
      }

      const result = useMockMutations
        ? await import("../../../api/mockData").then(
            ({ createMockLockerSlots }) =>
              createMockLockerSlots(normalizedItems),
          )
        : await apiPost("/api/v1/lockers/batch", {
            items: normalizedItems,
          });

      if (isFailedMutationResult(result)) {
        setLockerCreatePanelError((result as any).message);
        return false;
      }

      await invalidateLockers();

      setLockerCreatePanelMessage(
        (result as any).message || "라커가 일괄 등록되었습니다.",
      );
      resetLockerCreateRows();
      return true;
    } catch (error) {
      setLockerCreatePanelError(
        error instanceof Error ? error.message : "라커 등록 중 오류가 발생했습니다.",
      );
      return false;
    } finally {
      setLockerCreateSubmitting(false);
    }
  }

  async function handleLockerAssign() {
    clearLockerFeedback();
    setLockerAssignSubmitting(true);
    try {
      if (!lockerAssignForm.lockerSlotId || !lockerAssignForm.memberId) {
        setLockerPanelError("라커 슬롯과 회원을 모두 선택해야 합니다.");
        return false;
      }

      const result = useMockMutations
        ? await import("../../../api/mockData").then(
            ({ createMockLockerAssignment }) =>
              createMockLockerAssignment({
                lockerSlotId: Number(lockerAssignForm.lockerSlotId),
                memberId: Number(lockerAssignForm.memberId),
                startDate: lockerAssignForm.startDate,
                endDate: lockerAssignForm.endDate,
                memo: lockerAssignForm.memo.trim() || null,
              }),
          )
        : await apiPost("/api/v1/lockers/assignments", {
            lockerSlotId: Number(lockerAssignForm.lockerSlotId),
            memberId: Number(lockerAssignForm.memberId),
            startDate: lockerAssignForm.startDate,
            endDate: lockerAssignForm.endDate,
            memo: lockerAssignForm.memo.trim() || null,
          });

      if (isFailedMutationResult(result)) {
        setLockerPanelError((result as any).message);
        return false;
      }

      await invalidateLockers();
      setLockerPanelMessage((result as any).message || "라커가 성공적으로 배정되었습니다.");
      setLockerAssignForm(createEmptyLockerAssignForm(selectedMemberId));
      return true;
    } finally {
      setLockerAssignSubmitting(false);
    }
  }

  async function handleLockerReturn(lockerAssignmentId: number) {
    clearLockerFeedback();
    setLockerReturnSubmittingId(lockerAssignmentId);
    try {
      const result = useMockMutations
        ? await import("../../../api/mockData").then(
            ({ returnMockLockerAssignment }) =>
              returnMockLockerAssignment(lockerAssignmentId),
          )
        : await apiPost(
            `/api/v1/lockers/assignments/${lockerAssignmentId}/return`,
            {},
          );

      if (isFailedMutationResult(result)) {
        setLockerPanelError((result as any).message);
        return false;
      }

      await invalidateLockers();
      setLockerPanelMessage((result as any).message || "라커가 반납 처리되었습니다.");
      return true;
    } finally {
      setLockerReturnSubmittingId(null);
    }
  }

  return {
    lockerFilters,
    setLockerFilters,
    lockerAssignForm,
    setLockerAssignForm,
    lockerCreateRows,
    setLockerCreateRows,
    lockerAssignSubmitting,
    lockerCreateSubmitting,
    lockerReturnSubmittingId,
    lockerPanelMessage,
    lockerPanelError,
    lockerCreatePanelMessage,
    lockerCreatePanelError,
    clearLockerFeedback,
    clearLockerCreateFeedback,
    appendLockerCreateRow,
    updateLockerCreateRow,
    removeLockerCreateRow,
    resetLockerCreateRows,
    handleLockerAssign,
    handleLockerReturn,
    handleLockerCreateBatch,
  } as const;
}
