import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getToken } from "next-auth/jwt";
import {
  authJwtSecret,
  getSessionJwt,
  sessionCookieUsesSecurePrefix,
  shouldUseSecureAuthCookie,
} from "@/lib/auth-session-token";

const getTokenMock = vi.mocked(getToken);

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

function fakeReq(opts: {
  proto?: string | null;
  protocol?: string;
  cookie?: string | null;
}) {
  return {
    headers: {
      get(name: string) {
        if (name === "x-forwarded-proto") return opts.proto ?? null;
        if (name === "cookie") return opts.cookie ?? null;
        return null;
      },
    },
    nextUrl: { protocol: opts.protocol ?? "http:" },
  };
}

const ENV_KEYS = [
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "AUTH_URL",
  "NEXTAUTH_URL",
] as const;

const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> =
  {};

function snapshotEnv() {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

describe("authJwtSecret", () => {
  snapshotEnv();
  afterEach(restoreEnv);

  it("prefers AUTH_SECRET over NEXTAUTH_SECRET", () => {
    process.env.AUTH_SECRET = "auth-secret";
    process.env.NEXTAUTH_SECRET = "legacy-secret";
    expect(authJwtSecret()).toBe("auth-secret");
  });

  it("falls back to NEXTAUTH_SECRET", () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "legacy-secret";
    expect(authJwtSecret()).toBe("legacy-secret");
  });

  it("treats blank AUTH_SECRET as missing", () => {
    process.env.AUTH_SECRET = "   ";
    delete process.env.NEXTAUTH_SECRET;
    expect(authJwtSecret()).toBeUndefined();
  });
});

describe("sessionCookieUsesSecurePrefix", () => {
  it("detects the HTTPS Auth.js cookie", () => {
    expect(
      sessionCookieUsesSecurePrefix(
        "__Secure-authjs.session-token=abc; Path=/",
      ),
    ).toBe(true);
  });

  it("detects the http Auth.js cookie", () => {
    expect(
      sessionCookieUsesSecurePrefix("authjs.session-token=abc; Path=/"),
    ).toBe(false);
  });

  it("returns null when the session cookie is absent", () => {
    expect(sessionCookieUsesSecurePrefix("NEXT_LOCALE=en")).toBeNull();
    expect(sessionCookieUsesSecurePrefix(null)).toBeNull();
  });
});

describe("shouldUseSecureAuthCookie", () => {
  snapshotEnv();
  afterEach(restoreEnv);

  it("follows the cookie that is actually present (preview HTTPS)", () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    expect(
      shouldUseSecureAuthCookie(
        fakeReq({
          proto: "https",
          cookie: "__Secure-authjs.session-token=jwt.here",
        }),
      ),
    ).toBe(true);
  });

  it("uses x-forwarded-proto when no session cookie is present", () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    expect(shouldUseSecureAuthCookie(fakeReq({ proto: "https" }))).toBe(true);
    expect(shouldUseSecureAuthCookie(fakeReq({ proto: "http" }))).toBe(false);
  });

  it("treats AUTH_URL https as secure (Vercel preview / prod)", () => {
    process.env.AUTH_URL = "https://suplymate-preview.vercel.app";
    delete process.env.NEXTAUTH_URL;
    expect(shouldUseSecureAuthCookie(fakeReq({ protocol: "http:" }))).toBe(
      true,
    );
  });

  it("keeps localhost http cookies unprefixed", () => {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    expect(
      shouldUseSecureAuthCookie(
        fakeReq({ protocol: "http:", cookie: "authjs.session-token=jwt" }),
      ),
    ).toBe(false);
  });
});

describe("getSessionJwt", () => {
  snapshotEnv();
  afterEach(() => {
    restoreEnv();
    getTokenMock.mockReset();
  });

  it("asks getToken for the __Secure- cookie on HTTPS preview", async () => {
    process.env.AUTH_SECRET = "preview-secret";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    getTokenMock.mockResolvedValueOnce({ email: "demo@suplymate.com" });

    const req = new NextRequest("https://preview.example.com/en/dashboard", {
      headers: {
        cookie: "__Secure-authjs.session-token=dummy",
        "x-forwarded-proto": "https",
      },
    });

    await expect(getSessionJwt(req)).resolves.toEqual({
      email: "demo@suplymate.com",
    });
    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: "preview-secret",
        secureCookie: true,
      }),
    );
    expect(getTokenMock).toHaveBeenCalledTimes(1);
  });

  it("retries the unprefixed cookie name if the first lookup misses", async () => {
    process.env.AUTH_SECRET = "preview-secret";
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    getTokenMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: "demo@suplymate.com" });

    const req = new NextRequest("https://preview.example.com/en/dashboard", {
      headers: { "x-forwarded-proto": "https" },
    });

    await expect(getSessionJwt(req)).resolves.toEqual({
      email: "demo@suplymate.com",
    });
    expect(getTokenMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ secureCookie: true }),
    );
    expect(getTokenMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ secureCookie: false }),
    );
  });
});
