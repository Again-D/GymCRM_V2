import type { ReactNode } from "react";

type MembersSectionProps = {
  children: ReactNode;
};

export function MembersSection({ children }: MembersSectionProps) {
  return (
    <section className="workspace-grid" aria-label="회원 관리 화면">
      {children}
    </section>
  );
}
