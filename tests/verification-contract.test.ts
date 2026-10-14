import { describe, expect, it } from "vitest";
import {
  VerificationTimeoutError,
  verificationPassed,
  withWatchdog
} from "../scripts/verification-contract";

describe("verification failure contracts", () => {
  it("does not turn an injected page exception into success", () => {
    expect(verificationPassed(["injected page failure"], false)).toBe(false);
    expect(verificationPassed([], false)).toBe(true);
  });

  it("does not turn a watchdog timeout into success", async () => {
    const stalled = new Promise<never>(() => undefined);
    await expect(withWatchdog(stalled, 10)).rejects.toBeInstanceOf(VerificationTimeoutError);
    expect(verificationPassed([], true)).toBe(false);
  });

  it("allows a bounded successful operation", async () => {
    await expect(withWatchdog(Promise.resolve("ok"), 100)).resolves.toBe("ok");
  });
});
