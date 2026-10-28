import { Prisma, type PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import request, { type SuperAgentTest } from "supertest";
import { createApp } from "./app.js";
import type { RedirectCache } from "./cache.js";
import { hashSessionToken } from "./security.js";

type TestUser = { id: string; email: string; passwordHash: string; createdAt: Date };
type TestLink = {
  id: string;
  code: string;
  userId: string;
  destination: string;
  title: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const secret = "test-only-session-secret-that-is-long-enough";

function makeTestApp(cache?: RedirectCache) {
  process.env.NODE_ENV = "test";
  process.env.CLIENT_ORIGIN = "http://localhost:5173";
  process.env.PUBLIC_BASE_URL = "http://localhost:4000";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.SESSION_SECRET = secret;

  const users: TestUser[] = [];
  const sessions: { tokenHash: string; userId: string; expiresAt: Date }[] = [];
  const links: TestLink[] = [];
  const clicks: { linkId: string; clickedAt: Date; referrer: string | null }[] = [];
  let serial = 0;
  let failNextLinkCreate = false;
  const prismaMock = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) =>
        users.find((user) => user.id === where.id || user.email === where.email) ?? null),
      create: vi.fn(async ({ data }: { data: { email: string; passwordHash: string } }) => {
        const user = { id: `user-${++serial}`, email: data.email, passwordHash: data.passwordHash, createdAt: new Date() };
        users.push(user);
        return user;
      })
    },
    session: {
      create: vi.fn(async ({ data }: { data: { tokenHash: string; userId: string; expiresAt: Date } }) => {
        sessions.push(data);
        return data;
      }),
      findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) =>
        sessions.find((session) => session.tokenHash === where.tokenHash) ?? null),
      delete: vi.fn(async ({ where }: { where: { tokenHash?: string; id?: string } }) => {
        const index = sessions.findIndex((session) => session.tokenHash === where.tokenHash);
        if (index >= 0) sessions.splice(index, 1);
        return { id: where.id ?? "session" };
      }),
      deleteMany: vi.fn(async ({ where }: { where: { tokenHash: string } }) => {
        const index = sessions.findIndex((session) => session.tokenHash === where.tokenHash);
        if (index >= 0) sessions.splice(index, 1);
        return { count: index < 0 ? 0 : 1 };
      })
    },
    link: {
      create: vi.fn(async ({ data }: { data: Omit<TestLink, "id" | "createdAt" | "updatedAt" | "expiresAt" | "isActive"> }) => {
        if (failNextLinkCreate) {
          failNextLinkCreate = false;
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "test" });
        }
        if (links.some((link) => link.code === data.code)) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "test" });
        }
        const link: TestLink = {
          id: `link-${++serial}`, ...data, expiresAt: null, isActive: true, createdAt: new Date(), updatedAt: new Date()
        };
        links.push(link);
        return { ...link, _count: { clickEvents: 0 } };
      }),
      findUnique: vi.fn(async ({ where }: { where: { code?: string } }) => {
        const found = links.find((link) => link.code === where.code);
        return found ? { ...found } : null;
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) =>
        links.find((link) => link.id === where.id && link.userId === where.userId) ?? null),
      findMany: vi.fn(async ({ where }: { where: { userId: string } }) =>
        links.filter((link) => link.userId === where.userId).map((link) => ({
          ...link,
          _count: { clickEvents: clicks.filter((click) => click.linkId === link.id).length }
        }))),
      count: vi.fn(async ({ where }: { where: { userId: string; isActive?: boolean; OR?: unknown[] } }) =>
        links.filter((link) => link.userId === where.userId && (where.isActive === undefined || link.isActive === where.isActive)).length),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<TestLink> }) => {
        const link = links.find((item) => item.id === where.id);
        if (!link) throw new Error("Missing test link");
        Object.assign(link, data);
        return link;
      })
    },
    clickEvent: {
      count: vi.fn(async ({ where }: { where: { link?: { userId: string } } }) =>
        clicks.filter((click) => links.some((link) => link.id === click.linkId && link.userId === where.link?.userId)).length),
      findMany: vi.fn(async ({ where }: { where: { link: { userId: string } } }) =>
        clicks.filter((click) => links.some((link) => link.id === click.linkId && link.userId === where.link.userId))
          .map(({ clickedAt }) => ({ clickedAt }))),
      create: vi.fn(async ({ data }: { data: { linkId: string; referrer: string | null } }) => {
        const click = { ...data, clickedAt: new Date() };
        clicks.push(click);
        return click;
      })
    },
    $transaction: vi.fn(async <T>(queries: Promise<T>[]) => Promise.all(queries))
  };
  const client = prismaMock as unknown as PrismaClient;
  const { app } = createApp({ prisma: client, cache });
  return {
    app,
    client,
    users,
    sessions,
    links,
    clicks,
    failNextCreate: () => { failNextLinkCreate = true; }
  };
}

async function createAccount(agent: SuperAgentTest, email: string) {
  return agent.post("/api/auth/register").send({ email, password: "a-secure-test-password" });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LinkVault API", () => {
  it("isolates links by owner and derives click analytics from recorded redirect events", async () => {
    const system = makeTestApp();
    const alice = request.agent(system.app);
    const bob = request.agent(system.app);
    expect((await createAccount(alice, "alice@example.test")).status).toBe(201);
    expect((await createAccount(alice, "alice@example.test")).status).toBe(409);
    expect((await createAccount(bob, "bob@example.test")).status).toBe(201);

    const created = await alice.post("/api/links").send({ destination: "https://example.com/landing", alias: "alice-link" });
    expect(created.status).toBe(201);
    const linkId = created.body.link.id as string;
    expect((await bob.get("/api/links")).body.links).toHaveLength(0);
    expect((await bob.patch(`/api/links/${linkId}`).send({ title: "stolen" })).status).toBe(404);
    expect((await bob.delete(`/api/links/${linkId}`)).status).toBe(404);

    const redirect = await request(system.app).get("/r/alice-link");
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe("https://example.com/landing");
    expect(system.clicks).toHaveLength(1);
    expect((await alice.get("/api/links/analytics")).body.clickCount).toBe(1);
    expect((await bob.get("/api/links/analytics")).body.clickCount).toBe(0);
    expect(system.sessions[0].tokenHash).not.toContain("a-secure-test-password");
  });

  it("retries generated short-code collisions and rejects unavailable custom aliases", async () => {
    const system = makeTestApp();
    const alice = request.agent(system.app);
    await createAccount(alice, "alice@example.test");
    system.failNextCreate();
    const created = await alice.post("/api/links").send({ destination: "https://example.com" });
    expect(created.status).toBe(201);
    expect(system.client.link.create).toHaveBeenCalledTimes(2);
    expect((await alice.post("/api/links").send({ destination: "https://example.org", alias: created.body.link.code })).status).toBe(409);
  });

  it("returns explicit status codes for unknown, expired, and deactivated redirects", async () => {
    const system = makeTestApp();
    const alice = request.agent(system.app);
    await createAccount(alice, "alice@example.test");
    expect((await request(system.app).get("/r/missing")).status).toBe(404);

    const expired = await alice.post("/api/links").send({ destination: "https://example.com", alias: "expired-link" });
    await alice.patch(`/api/links/${expired.body.link.id}`).send({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
    expect((await request(system.app).get("/r/expired-link")).status).toBe(410);

    const inactive = await alice.post("/api/links").send({ destination: "https://example.com", alias: "inactive-link" });
    await alice.delete(`/api/links/${inactive.body.link.id}`);
    expect((await request(system.app).get("/r/inactive-link")).status).toBe(410);
  });

  it("stores only a keyed hash of session tokens", async () => {
    const system = makeTestApp();
    const response = await request.agent(system.app).post("/api/auth/register")
      .send({ email: "private@example.test", password: "a-secure-test-password" });
    expect(response.status).toBe(201);
    const cookie = response.headers["set-cookie"][0] as string;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).not.toContain(hashSessionToken("a-secure-test-password", secret));
    expect(system.sessions[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("invalidates the redirect cache after a link is edited", async () => {
    const invalidated: string[] = [];
    let cached: { linkId: string; destination: string; isActive: boolean; expiresAt: string | null } | null = null;
    const cache: RedirectCache = {
      get: async () => cached,
      set: async (_code, value) => { cached = value; },
      invalidate: async (code) => { invalidated.push(code); cached = null; }
    };
    const system = makeTestApp(cache);
    const alice = request.agent(system.app);
    await createAccount(alice, "alice@example.test");
    const created = await alice.post("/api/links").send({ destination: "https://example.com", alias: "cache-link" });
    expect((await request(system.app).get("/r/cache-link")).status).toBe(302);
    expect((await request(system.app).get("/r/cache-link")).status).toBe(302);
    expect(system.client.link.findUnique).toHaveBeenCalledTimes(1);
    expect(system.clicks).toHaveLength(2);
    const updated = await alice.patch(`/api/links/${created.body.link.id}`).send({ title: "updated" });
    expect(updated.status).toBe(200);
    expect(invalidated).toEqual(["cache-link"]);
    expect(cached).toBeNull();
  });
});
