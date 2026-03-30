import { beforeEach, describe, expect, it } from "vitest";

import { initialUiFeedbackStoreState, uiFeedbackStore } from "./uiFeedbackStore";

describe("uiFeedbackStore", () => {
  beforeEach(() => {
    uiFeedbackStore.setState(initialUiFeedbackStoreState);
  });

  it("records the latest feedback event and increments the count", () => {
    uiFeedbackStore.getState().recordEvent({
      surface: "message",
      kind: "success",
      content: "Saved",
      timestamp: 123
    });

    expect(uiFeedbackStore.getState().eventCount).toBe(1);
    expect(uiFeedbackStore.getState().lastEvent).toEqual({
      surface: "message",
      kind: "success",
      content: "Saved",
      timestamp: 123
    });
  });
});
