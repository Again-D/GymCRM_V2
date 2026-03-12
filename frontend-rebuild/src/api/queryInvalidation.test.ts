import { describe, expect, it } from "vitest";

import {
  getQueryInvalidationVersion,
  invalidateQueryDomains,
  resetQueryInvalidationStateForTests
} from "./queryInvalidation";

describe("queryInvalidation", () => {
  it("increments versions only for invalidated domains", () => {
    resetQueryInvalidationStateForTests();

    expect(getQueryInvalidationVersion("members")).toBe(0);
    expect(getQueryInvalidationVersion("accessPresence")).toBe(0);

    invalidateQueryDomains(["members", "accessPresence"]);

    expect(getQueryInvalidationVersion("members")).toBe(1);
    expect(getQueryInvalidationVersion("accessPresence")).toBe(1);
    expect(getQueryInvalidationVersion("reservationTargets")).toBe(0);
  });

  it("tracks crm invalidation domains independently", () => {
    resetQueryInvalidationStateForTests();

    expect(getQueryInvalidationVersion("crmHistory")).toBe(0);
    expect(getQueryInvalidationVersion("crmQueue")).toBe(0);

    invalidateQueryDomains(["crmHistory"]);

    expect(getQueryInvalidationVersion("crmHistory")).toBe(1);
    expect(getQueryInvalidationVersion("crmQueue")).toBe(0);
  });
});
