import { describe, expect, it } from "vitest";
import { buildSideBetTicketsFixture } from "../../../../test/fixtures/sideBetMock";
import { resolveSideBetTicketsState } from "./resolveSideBetTicketsState";

describe("resolveSideBetTicketsState", () => {
  it("returns hidden when no lineup id", () => {
    expect(
      resolveSideBetTicketsState(null, { data: undefined, isLoading: false, isError: false }),
    ).toEqual({ kind: "hidden" });
  });

  it("returns loading on initial fetch", () => {
    expect(
      resolveSideBetTicketsState("lineup-1", {
        data: undefined,
        isLoading: true,
        isError: false,
      }),
    ).toEqual({ kind: "loading" });
  });

  it("returns error when query failed", () => {
    const result = resolveSideBetTicketsState("lineup-1", {
      data: undefined,
      isLoading: false,
      isError: true,
    });
    expect(result.kind).toBe("error");
  });

  it("returns empty when no tickets", () => {
    expect(
      resolveSideBetTicketsState("lineup-1", {
        data: { tickets: [] },
        isLoading: false,
        isError: false,
      }),
    ).toEqual({ kind: "empty" });
  });

  it("returns ready with sorted tickets", () => {
    const result = resolveSideBetTicketsState("lineup-1", {
      data: buildSideBetTicketsFixture(),
      isLoading: false,
      isError: false,
    });
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.tickets.length).toBeGreaterThan(0);
      expect(result.tickets[0].id).toBe("ticket-open");
    }
  });
});
