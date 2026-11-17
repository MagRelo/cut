import { describe, expect, it, vi } from "vitest";
import { clientSafeErrorMessage, redactSecrets } from "./clientSafeError.js";

const KEY = "pim_test_secret_key";
const URL = `https://api.pimlico.io/v2/84532/rpc?apikey=${KEY}`;

describe("clientSafeErrorMessage", () => {
  it("replaces a bundler error that includes the RPC URL", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error(
      `HTTP request failed.\n\nURL: ${URL}\nDetails: sponsorshipPolicy perOpMaximumUsd reached`,
    );

    const message = clientSafeErrorMessage(error, "User operation failed");

    expect(message).toBe("User operation failed");
    expect(message).not.toContain(KEY);
    expect(message).not.toContain("pimlico.io");
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).toContain("perOpMaximumUsd");
    expect(logged).not.toContain(KEY);
    expect(logged).not.toContain("pimlico.io");
    spy.mockRestore();
  });

  it("replaces an error whose URL is only on a nested cause", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = Object.assign(new Error("HTTP request failed."), { url: URL });

    const message = clientSafeErrorMessage(new Error("User operation failed", { cause }), "User operation failed");

    expect(message).toBe("User operation failed");
    expect(spy.mock.calls.flat().join(" ")).not.toContain(KEY);
    spy.mockRestore();
  });

  it("keeps an application error that has no URL or key", () => {
    expect(clientSafeErrorMessage(new Error("Session key does not sign transactions"), "User operation failed")).toBe(
      "Session key does not sign transactions",
    );
  });
});

describe("redactSecrets", () => {
  it("removes the URL and the api key query value", () => {
    const redacted = redactSecrets(`URL: ${URL}`);
    expect(redacted).not.toContain(KEY);
    expect(redacted).not.toContain("pimlico.io");
    expect(redacted).toContain("[redacted-url]");
  });
});
