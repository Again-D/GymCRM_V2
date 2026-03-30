import { Skeleton } from "antd";
import type { CSSProperties } from "react";

interface SkeletonLoaderProps {
  type?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
}

export function SkeletonLoader({ type = "text", width, height, style }: SkeletonLoaderProps) {
  const mergedStyle: CSSProperties = {
    width,
    height,
    ...style
  };

  if (type === "circular") {
    return <Skeleton.Avatar active shape="circle" style={mergedStyle} />;
  }

  if (type === "rectangular") {
    return <Skeleton.Node active style={mergedStyle} />;
  }

  return <Skeleton.Input active block style={mergedStyle} />;
}
