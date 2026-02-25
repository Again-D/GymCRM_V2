import type { ReactNode } from "react";

type PlaceholderCardProps = {
  children: ReactNode;
  as?: "div" | "section";
};

export function PlaceholderCard({ children, as = "div" }: PlaceholderCardProps) {
  if (as === "section") {
    return <section className="placeholder-card">{children}</section>;
  }
  return <div className="placeholder-card">{children}</div>;
}
