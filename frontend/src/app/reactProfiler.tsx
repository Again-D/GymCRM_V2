import { Profiler, type PropsWithChildren, type ProfilerOnRenderCallback } from "react";

type ProfilePhase = "mount" | "update" | "nested-update";

type ProfileSample = Readonly<{
  phase: ProfilePhase;
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}>;

type ProfileSummary = Readonly<{
  commitCount: number;
  maxActualDuration: number;
  totalActualDuration: number;
  lastPhase: ProfilePhase;
  samples: ReadonlyArray<ProfileSample>;
}>;

type ProfileStore = Record<string, ProfileSummary>;

declare global {
  interface Window {
    __GYMCRM_REACT_PROFILER__?: ProfileStore;
  }
}

const MAX_SAMPLES = 20;

function getProfileStore() {
  if (typeof window === "undefined") {
    return null;
  }

  window.__GYMCRM_REACT_PROFILER__ ??= {};
  return window.__GYMCRM_REACT_PROFILER__;
}

function isReactProfilerEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("reactProfile") === "1";
}

const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  const store = getProfileStore();
  if (!store) {
    return;
  }

  const previous = store[id];
  const nextSample: ProfileSample = {
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  };

  const previousSamples = previous?.samples ?? [];
  const nextSamples = [...previousSamples, nextSample].slice(-MAX_SAMPLES);

  store[id] = {
    commitCount: (previous?.commitCount ?? 0) + 1,
    maxActualDuration: Math.max(previous?.maxActualDuration ?? 0, actualDuration),
    totalActualDuration: (previous?.totalActualDuration ?? 0) + actualDuration,
    lastPhase: phase,
    samples: nextSamples
  };
};

export function RouteProfiler({ id, children }: PropsWithChildren<{ id: string }>) {
  if (!isReactProfilerEnabled()) {
    return <>{children}</>;
  }

  getProfileStore();

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
