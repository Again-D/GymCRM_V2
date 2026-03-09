import { useEffect, useRef } from "react";

type ErrorHandler = (error: unknown) => void;

type ReservationsLoaderOptions = {
  enabled: boolean;
  selectedMemberId: number | null;
  loadReservationsForMember: (memberId: number) => Promise<void>;
  onError: ErrorHandler;
};

type AccessLoaderOptions = {
  enabled: boolean;
  selectedMemberId: number | null;
  ensureMembersLoaded: () => Promise<void>;
  reloadAccessData: (memberId?: number | null) => Promise<void>;
  onError: ErrorHandler;
};

type LockerLoaderOptions = {
  enabled: boolean;
  ensureMembersLoaded: () => Promise<void>;
  loadLockerSlots: () => Promise<void>;
  loadLockerAssignments: (activeOnly?: boolean) => Promise<void>;
  onError: ErrorHandler;
};

type SimpleLoaderOptions = {
  enabled: boolean;
  load: () => Promise<void>;
  onError: ErrorHandler;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useReservationsWorkspaceLoader({
  enabled,
  selectedMemberId,
  loadReservationsForMember,
  onError
}: ReservationsLoaderOptions) {
  const loadReservationsForMemberRef = useLatestRef(loadReservationsForMember);
  const onErrorRef = useLatestRef(onError);

  useEffect(() => {
    if (!enabled || selectedMemberId == null) {
      return;
    }

    let cancelled = false;

    void loadReservationsForMemberRef.current(selectedMemberId).catch((error) => {
      if (cancelled) {
        return;
      }
      onErrorRef.current(error);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, selectedMemberId]);
}

export function useAccessWorkspaceLoader({
  enabled,
  selectedMemberId,
  ensureMembersLoaded,
  reloadAccessData,
  onError
}: AccessLoaderOptions) {
  const ensureMembersLoadedRef = useLatestRef(ensureMembersLoaded);
  const reloadAccessDataRef = useLatestRef(reloadAccessData);
  const onErrorRef = useLatestRef(onError);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await ensureMembersLoadedRef.current();
      if (cancelled) {
        return;
      }
      await reloadAccessDataRef.current(selectedMemberId);
    })().catch((error) => {
      if (cancelled) {
        return;
      }
      onErrorRef.current(error);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, selectedMemberId]);
}

export function useLockerWorkspaceLoader({
  enabled,
  ensureMembersLoaded,
  loadLockerSlots,
  loadLockerAssignments,
  onError
}: LockerLoaderOptions) {
  const ensureMembersLoadedRef = useLatestRef(ensureMembersLoaded);
  const loadLockerSlotsRef = useLatestRef(loadLockerSlots);
  const loadLockerAssignmentsRef = useLatestRef(loadLockerAssignments);
  const onErrorRef = useLatestRef(onError);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await ensureMembersLoadedRef.current();
      if (cancelled) {
        return;
      }
      await Promise.all([loadLockerSlotsRef.current(), loadLockerAssignmentsRef.current(false)]);
    })().catch((error) => {
      if (cancelled) {
        return;
      }
      onErrorRef.current(error);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

export function useSettlementWorkspaceLoader({ enabled, load, onError }: SimpleLoaderOptions) {
  const loadRef = useLatestRef(load);
  const onErrorRef = useLatestRef(onError);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void loadRef.current().catch((error) => {
      if (cancelled) {
        return;
      }
      onErrorRef.current(error);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

export function useCrmWorkspaceLoader({ enabled, load, onError }: SimpleLoaderOptions) {
  const loadRef = useLatestRef(load);
  const onErrorRef = useLatestRef(onError);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void loadRef.current().catch((error) => {
      if (cancelled) {
        return;
      }
      onErrorRef.current(error);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
