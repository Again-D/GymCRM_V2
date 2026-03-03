import type { ReactNode } from "react";

type CrmSectionProps = {
  children: ReactNode;
};

export function CrmSection({ children }: CrmSectionProps) {
  return (
    <section className="workspace-grid workspace-grid-single" aria-label="CRM 메시지 화면">
      {children}
    </section>
  );
}
