import { describe, expect, it } from "vitest";
import {
  agentPreferencesSchema,
  mergeAgentPreferences,
  mergeUserSettings,
  readAgentPreferences,
  updateUserSettingsSchema,
} from "./user.js";

describe("updateUserSettingsSchema", () => {
  it("accepts color, oddsFormat, and onboardingDismissed", () => {
    const parsed = updateUserSettingsSchema.safeParse({
      color: "#0a73eb",
      oddsFormat: "decimal",
      onboardingDismissed: true,
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

  it("patches onboardingDismissed without dropping other keys", () => {
    const merged = mergeUserSettings(
      { color: "#0a73eb", onboardingDismissed: false },
      { onboardingDismissed: true },
    );
    expect(merged).toEqual({
      color: "#0a73eb",
      onboardingDismissed: true,
    });
  });
});

describe("agent preferences", () => {
  it("reads sports and maxEntryFee from settings.agent", () => {
    expect(
      readAgentPreferences({
        color: "#0a73eb",
        agent: { sports: ["pga-golf"], maxEntryFee: 10 },
      }),
    ).toEqual({ sports: ["pga-golf"], maxEntryFee: 10 });
  });

  it("merges agent preferences without dropping other settings", () => {
    const merged = mergeAgentPreferences(
      { color: "#0a73eb", agent: { sports: ["f1"], maxEntryFee: 5 } },
      { maxEntryFee: null },
    );
    expect(merged).toEqual({
      color: "#0a73eb",
      agent: { sports: ["f1"] },
    });
    expect(readAgentPreferences(merged).maxEntryFee).toBeNull();
  });

  it("requires a preference field", () => {
    expect(agentPreferencesSchema.safeParse({}).success).toBe(false);
    expect(agentPreferencesSchema.safeParse({ sports: ["pga-golf"] }).success).toBe(true);
  });
});
