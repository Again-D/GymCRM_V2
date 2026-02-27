import type { ReactNode } from "react";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";

type AccessSectionProps = {
  accessPanelMessage: string | null;
  accessPanelError: string | null;
  children: ReactNode;
};

export function AccessSection({ accessPanelMessage, accessPanelError, children }: AccessSectionProps) {
  return (
    <section className="membership-ops-shell" aria-label="출입 관리 화면">
      <article className="panel">
        <PanelHeader title="출입 운영" />
        <p className="muted-text">입장/퇴장 처리와 최근 출입 이벤트를 운영 관점에서 관리합니다.</p>
        {accessPanelMessage ? (
          <NoticeText tone="success" compact>
            {accessPanelMessage}
          </NoticeText>
        ) : null}
        {accessPanelError ? (
          <NoticeText tone="error" compact>
            {accessPanelError}
          </NoticeText>
        ) : null}
      </article>

      {children}
    </section>
  );
}
