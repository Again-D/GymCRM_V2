import type { ReactNode } from "react";

type InlineHelpTextProps = {
  children: ReactNode;
};

export function InlineHelpText({ children }: InlineHelpTextProps) {
  return <p className="muted-text compact-inline-help">{children}</p>;
}
