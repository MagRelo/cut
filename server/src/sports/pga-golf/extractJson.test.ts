import { describe, expect, it } from "vitest";
import { extractJsonArray } from "./extractJson.js";

describe("extractJsonArray", () => {
  it("parses a fenced JSON array", () => {
    const parsed = extractJsonArray('Here you go:\n```json\n[{"title":"Event Blurb","items":[{"body":"Hi"}]}]\n```');
    expect(parsed).toEqual([{ title: "Event Blurb", items: [{ body: "Hi" }] }]);
  });

  it("throws when no array is present", () => {
    expect(() => extractJsonArray("sorry")).toThrow(/JSON array/);
  });
});
