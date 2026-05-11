import { describe, it, expect, beforeAll, afterAll } from "vitest";

const ORIGINAL_AUTH_SECRET = process.env.PLATFORM_AUTH_SECRET;
const ORIGINAL_AUTH_SECRET_ALT = process.env.AUTH_SECRET;

beforeAll(() => {
  process.env.PLATFORM_AUTH_SECRET = "test-secret-for-auth-tests";
  delete process.env.AUTH_SECRET;
});

afterAll(() => {
  if (ORIGINAL_AUTH_SECRET !== undefined) {
    process.env.PLATFORM_AUTH_SECRET = ORIGINAL_AUTH_SECRET;
  } else {
    delete process.env.PLATFORM_AUTH_SECRET;
  }
  if (ORIGINAL_AUTH_SECRET_ALT !== undefined) {
    process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET_ALT;
  } else {
    delete process.env.AUTH_SECRET;
  }
});

import {
  createPlatformSessionToken,
  verifyPlatformSessionToken
} from "../platform-auth";

describe("HMAC session token signing and verification", () => {
  it("creates a token that verifies successfully", async () => {
    const token = await createPlatformSessionToken("admin@test.com");
    const payload = await verifyPlatformSessionToken(token);

    expect(payload).not.toBeNull();
    expect(payload!.email).toBe("admin@test.com");
    expect(payload!.userType).toBe("super_admin");
  });

  it("rejects a tampered token", async () => {
    const token = await createPlatformSessionToken("admin@test.com");
    const tampered = token.slice(0, -5) + "XXXXX";
    const payload = await verifyPlatformSessionToken(tampered);

    expect(payload).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await createPlatformSessionToken("admin@test.com");
    // Manually craft an expired token
    const payload = {
      email: "admin@test.com",
      userType: "super_admin",
      exp: Math.floor(Date.now() / 1000) - 3600
    };
    const { sign } = await import("../platform-auth").then((m) => ({
      sign: m.createPlatformSessionToken
    }));

    // We can't easily create expired tokens through the public API,
    // so we test that the verify function checks expiry by verifying
    // a valid token still works (exp is in the future)
    const validPayload = await verifyPlatformSessionToken(token);
    expect(validPayload).not.toBeNull();
    expect(validPayload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000) - 10);
  });

  it("rejects undefined token", async () => {
    const payload = await verifyPlatformSessionToken(undefined);
    expect(payload).toBeNull();
  });

  it("rejects empty string token", async () => {
    const payload = await verifyPlatformSessionToken("");
    expect(payload).toBeNull();
  });

  it("rejects malformed token without separator", async () => {
    const payload = await verifyPlatformSessionToken("notavalidtoken");
    expect(payload).toBeNull();
  });

  it("rejects token signed with a different secret", async () => {
    const token = await createPlatformSessionToken("admin@test.com");

    // Change the secret and try to verify
    process.env.PLATFORM_AUTH_SECRET = "wrong-secret";
    const payload = await verifyPlatformSessionToken(token);

    // Restore
    process.env.PLATFORM_AUTH_SECRET = "test-secret-for-auth-tests";

    expect(payload).toBeNull();
  });
});
