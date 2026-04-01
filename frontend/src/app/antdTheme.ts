import { theme, type ThemeConfig } from "antd";

import type { ResolvedTheme } from "./theme";

const brandTokens = {
  fontFamily: '"Pretendard", "Noto Sans KR", sans-serif',
  borderRadius: 12,
  borderRadiusLG: 20,
  colorPrimary: "#162126",
  colorInfo: "#2b3f9c",
  colorSuccess: "#1a6c48",
  colorWarning: "#925b12",
  colorError: "#8f2330",
} as const;

export function buildAntdTheme(resolvedTheme: ResolvedTheme): ThemeConfig {
  const isDark = resolvedTheme === "dark";

  return {
    hashed: false,
    cssVar: true,
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      ...brandTokens,
      colorBgBase: isDark ? "#111416" : "#f3efe7",
      colorBgContainer: isDark ? "#1a1e21" : "#ffffff",
      colorBgElevated: isDark ? "#1a1e21" : "#ffffff",
      colorBorder: isDark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(22, 33, 38, 0.1)",
      colorText: isDark ? "#e2e8f0" : "#162126",
      colorTextSecondary: isDark ? "#94a3b8" : "#4a6169",
    },
    components: {
      Layout: {
        bodyBg: isDark ? "#111416" : "#f3efe7",
        headerBg: isDark ? "#1a1e21" : "#ffffff",
        siderBg: isDark ? "#162126" : "#162126",
      },
      Menu: {
        itemBg: "transparent",
        itemColor: "rgba(248, 244, 234, 0.72)",
        itemSelectedBg: "rgba(248, 244, 234, 0.12)",
        itemSelectedColor: "#f8f4ea",
        itemHoverColor: "#ffffff",
      },
      Card: {
        borderRadiusLG: 20,
      },
      Tag: {
        // 라이트/다크 공통 Soft 스타일 구현을 위한 개별 토큰 매핑
        colorSuccess: isDark ? "#52c41a" : "#389e0d",
        colorSuccessBg: isDark ? "rgba(82, 196, 26, 0.2)" : "rgba(82, 196, 26, 0.1)",
        colorSuccessBorder: isDark ? "rgba(82, 196, 26, 0.3)" : "rgba(82, 196, 26, 0.2)",

        colorWarning: isDark ? "#faad14" : "#d48806",
        colorWarningBg: isDark ? "rgba(250, 173, 20, 0.2)" : "rgba(250, 173, 20, 0.1)",
        colorWarningBorder: isDark ? "rgba(250, 173, 20, 0.3)" : "rgba(250, 173, 20, 0.2)",

        colorError: isDark ? "#ff4d4f" : "#cf1322",
        colorErrorBg: isDark ? "rgba(255, 77, 79, 0.2)" : "rgba(255, 77, 79, 0.1)",
        colorErrorBorder: isDark ? "rgba(255, 77, 79, 0.3)" : "rgba(255, 77, 79, 0.2)",

        colorInfo: isDark ? "#1677ff" : "#0958d9",
        colorInfoBg: isDark ? "rgba(22, 119, 255, 0.15)" : "rgba(22, 119, 255, 0.08)",
        colorInfoBorder: isDark ? "rgba(22, 119, 255, 0.25)" : "rgba(22, 119, 255, 0.15)",
      },
    },
  };
}
