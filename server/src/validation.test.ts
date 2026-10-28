import { describe, expect, it } from "vitest";
import { createRedirectCache } from "./cache.js";
import { createShortCode } from "./security.js";
import { safeDestinationSchema } from "./validation.js";

describe("safe destination validation", () => {
  it.each(["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "ftp://example.com", "https://user:pass@example.com"])(
    "rejects unsafe destination %s",
    (value) => expect(safeDestinationSchema.safeParse(value).success).toBe(false)
  );

  it.each(["https://example.com/path", "http://localhost:3000/page"])("accepts HTTP(S) destination %s", (value) => {
    expect(safeDestinationSchema.safeParse(value).success).toBe(true);
  });
});

describe("short code generation", () => {
  it("generates random URL-safe codes of the requested length", () => {
    const first = createShortCode(12);
    const second = createShortCode(12);
    expect(first).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(second).toHaveLength(12);
    expect(second).not.toBe(first);
  });

  describe("optional redirect cache", () => {
    it("uses PostgreSQL directly when Redis is not configured", () => {
      expect(createRedirectCache()).toBeNull();
    });
  });
});
