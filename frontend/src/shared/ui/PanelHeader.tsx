import type { ReactNode } from "react";

type PanelHeaderProps = {
  title: ReactNode;
  actions?: ReactNode;
  suffix?: ReactNode;
};

export function PanelHeader({ title, actions, suffix }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <h3>{title}</h3>
      {actions ?? suffix}
    </div>
  );
}
