import React from "react";
import styles from "./SkeletonLoader.module.css";

interface SkeletonLoaderProps {
  type?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export function SkeletonLoader({ type = "text", width, height, style }: SkeletonLoaderProps) {
  const inlineStyle: React.CSSProperties = {
    ...style,
    width,
    height
  };
  
  return <div className={`${styles.skeleton} ${styles[type]}`} style={inlineStyle} />;
}
