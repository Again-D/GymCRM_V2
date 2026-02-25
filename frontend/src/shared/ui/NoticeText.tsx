type NoticeTone = "default" | "success" | "error";

type NoticeTextProps = {
  children: string;
  tone?: NoticeTone;
  compact?: boolean;
  fullRow?: boolean;
  as?: "p" | "span";
};

export function NoticeText({
  children,
  tone = "default",
  compact = false,
  fullRow = false,
  as = "p"
}: NoticeTextProps) {
  const className = ["notice", tone === "default" ? null : tone, compact ? "compact" : null, fullRow ? "full-row" : null]
    .filter(Boolean)
    .join(" ");

  if (as === "span") {
    return <span className={className}>{children}</span>;
  }

  return <p className={className}>{children}</p>;
}
