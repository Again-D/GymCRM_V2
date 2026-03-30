import { Empty } from "antd";
import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return <Empty image={icon ?? Empty.PRESENTED_IMAGE_SIMPLE} description={message} />;
}
