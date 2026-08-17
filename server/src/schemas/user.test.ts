import { describe, expect, it } from "vitest";
import { mergeUserSettings, updateUserSettingsSchema } from "./user.js";

describe("updateUserSettingsSchema", () => {
  it("accepts color and oddsFormat", () => {
    const parsed = updateUserSettingsSchema.safeParse({
      color: "#0a73eb",
      oddsFormat: "decimal",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects extra keys", () => {
    const parsed = updateUserSettingsSchema.safeParse({
      color: "#0a73eb",
      marketingUnsubscribed: false,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("mergeUserSettings", () => {
  it("preserves marketingUnsubscribed when patching color", () => {
    const merged = mergeUserSettings(
      { color: "#A3A3A3", marketingUnsubscribed: true, oddsFormat: "american" },
      { color: "#0a73eb" },
    );
    expect(merged).toEqual({
      color: "#0a73eb",
      marketingUnsubscribed: true,
      oddsFormat: "american",
    });
  });
});
