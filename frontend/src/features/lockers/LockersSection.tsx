import type { ReactNode } from "react";

type LockersSectionProps = {
  children: ReactNode;
};

export function LockersSection({ children }: LockersSectionProps) {
  return (
    <section className="workspace-grid workspace-grid-single" aria-label="라커 관리 화면">
      {children}
    </section>
  );
}
