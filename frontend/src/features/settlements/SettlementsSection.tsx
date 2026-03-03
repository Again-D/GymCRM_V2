import type { ReactNode } from "react";

type SettlementsSectionProps = {
  children: ReactNode;
};

export function SettlementsSection({ children }: SettlementsSectionProps) {
  return (
    <section className="workspace-grid workspace-grid-single" aria-label="정산 리포트 화면">
      {children}
    </section>
  );
}
