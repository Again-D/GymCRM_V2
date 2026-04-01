import { App as AntdApp } from "antd";
import { createContext, type PropsWithChildren, useContext, useMemo } from "react";

import { uiFeedbackStore } from "./uiFeedbackStore";

type FeedbackContextValue = ReturnType<typeof AntdApp.useApp>;

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function toFeedbackContent(config: unknown) {
  if (typeof config === "string") {
    return config;
  }
  if (config && typeof config === "object" && "content" in config) {
    return `${config.content ?? ""}`;
  }
  return `${config ?? ""}`;
}

function FeedbackBridge({ children }: PropsWithChildren) {
  const feedback = AntdApp.useApp();

  const adaptedFeedback = useMemo<FeedbackContextValue>(() => ({
    ...feedback,
    message: {
      ...feedback.message,
      success: (config) => {
        uiFeedbackStore.getState().recordEvent({
          surface: "message",
          kind: "success",
          content: toFeedbackContent(config),
          timestamp: Date.now()
        });
        return feedback.message.success(config);
      },
      info: (config) => {
        uiFeedbackStore.getState().recordEvent({
          surface: "message",
          kind: "info",
          content: toFeedbackContent(config),
          timestamp: Date.now()
        });
        return feedback.message.info(config);
      },
      warning: (config) => {
        uiFeedbackStore.getState().recordEvent({
          surface: "message",
          kind: "warning",
          content: toFeedbackContent(config),
          timestamp: Date.now()
        });
        return feedback.message.warning(config);
      },
      error: (config) => {
        uiFeedbackStore.getState().recordEvent({
          surface: "message",
          kind: "error",
          content: toFeedbackContent(config),
          timestamp: Date.now()
        });
        return feedback.message.error(config);
      }
    },
    notification: {
      ...feedback.notification,
      success: (config) => {
        uiFeedbackStore.getState().recordEvent({
          surface: "notification",
          kind: "success",
          content: `${config.message ?? config.description ?? ""}`,
          timestamp: Date.now()
        });
        return feedback.notification.success(config);
      },
      info: (config) => {
        uiFeedbackStore.getState().recordEvent({
          surface: "notification",
          kind: "info",
          content: `${config.message ?? config.description ?? ""}`,
          timestamp: Date.now()
        });
        return feedback.notification.info(config);
      },
      warning: (config) => {
        uiFeedbackStore.getState().recordEvent({
          surface: "notification",
          kind: "warning",
          content: `${config.message ?? config.description ?? ""}`,
          timestamp: Date.now()
        });
        return feedback.notification.warning(config);
      },
      error: (config) => {
        uiFeedbackStore.getState().recordEvent({
          surface: "notification",
          kind: "error",
          content: `${config.message ?? config.description ?? ""}`,
          timestamp: Date.now()
        });
        return feedback.notification.error(config);
      }
    }
  }), [feedback]);

  return <FeedbackContext.Provider value={adaptedFeedback}>{children}</FeedbackContext.Provider>;
}

export function FeedbackProvider({ children }: PropsWithChildren) {
  return <FeedbackBridge>{children}</FeedbackBridge>;
}

export function useFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) {
    throw new Error("useFeedback must be used inside the antd App feedback bridge");
  }
  return feedback;
}
