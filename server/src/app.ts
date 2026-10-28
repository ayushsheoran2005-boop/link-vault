import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import type { RedirectCache } from "./cache.js";
import { getConfig } from "./config.js";
import { asyncRoute, getSessionToken, requireAuth } from "./middleware.js";
import { createSessionToken, createShortCode, hashSessionToken } from "./security.js";
import { createLinkSchema, loginSchema, registerSchema, updateLinkSchema } from "./validation.js";

type AppOptions = { prisma?: PrismaClient; cache?: RedirectCache | null };

export function createApp(options: AppOptions = {}) {
  const config = getConfig();
  const prisma = options.prisma ?? new PrismaClient();
  const cache = options.cache ?? null;
  const app = express();
  const sessionCookie = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30
  };

  app.disable("x-powered-by");
  app.set("trust proxy", config.NODE_ENV === "production" ? 1 : false);
  app.use(helmet());
  app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "16kb" }));
  app.use((request, response, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const origin = request.get("origin");
      if (origin && origin !== config.CLIENT_ORIGIN) {
        response.status(403).json({ error: "Request origin is not allowed" });
        return;
      }
    }
    next();
  });

  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
  const apiLimit = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
  app.use("/api", apiLimit);

  app.get("/health", (_request, response) => response.json({ status: "ok" }));

  const auth = express.Router();
  auth.post("/register", authLimit, asyncRoute(async (request, response) => {
    const input = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) {
      response.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    let user: { id: string; email: string; createdAt: Date };
    try {
      user = await prisma.user.create({
        data: { email: input.email, passwordHash: await bcrypt.hash(input.password, 12) },
        select: { id: true, email: true, createdAt: true }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        response.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      throw error;
    }
    const token = createSessionToken();
    await prisma.session.create({
      data: { tokenHash: hashSessionToken(token, config.SESSION_SECRET), userId: user.id, expiresAt: new Date(Date.now() + sessionCookie.maxAge) }
    });
    response.cookie("lv_session", token, sessionCookie);
    response.status(201).json({ user });
  }));
  auth.post("/login", authLimit, asyncRoute(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = createSessionToken();
    await prisma.session.create({
      data: { tokenHash: hashSessionToken(token, config.SESSION_SECRET), userId: user.id, expiresAt: new Date(Date.now() + sessionCookie.maxAge) }
    });
    response.cookie("lv_session", token, sessionCookie);
    response.json({ user: { id: user.id, email: user.email, createdAt: user.createdAt } });
  }));
  auth.post("/logout", asyncRoute(async (request, response) => {
    const token = getSessionToken(request);
    if (token) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token, config.SESSION_SECRET) } });
    response.clearCookie("lv_session", { httpOnly: true, secure: sessionCookie.secure, sameSite: "lax", path: "/" });
    response.status(204).end();
  }));
  const requireUser = requireAuth(prisma, config.SESSION_SECRET);
  auth.get("/me", requireUser, asyncRoute(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, email: true, createdAt: true }
    });
    if (!user) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    response.json({ user });
  }));
  app.use("/api/auth", auth);

  const links = express.Router();
  links.use(requireUser);
  links.get("/", asyncRoute(async (request, response) => {
    const querySchema = z.object({
      search: z.string().trim().max(120).default(""),
      status: z.enum(["all", "active", "inactive", "expired"]).default("all"),
      sort: z.enum(["createdAt", "clicks"]).default("createdAt"),
      order: z.enum(["asc", "desc"]).default("desc"),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20)
    });
    const query = querySchema.parse(request.query);
    const now = new Date();
    const filters: Prisma.LinkWhereInput[] = [];
    if (query.search) {
      filters.push({ OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { destination: { contains: query.search, mode: "insensitive" } },
          { code: { contains: query.search, mode: "insensitive" } }
      ] });
    }
    if (query.status === "active") filters.push({ isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
    if (query.status === "inactive") filters.push({ isActive: false });
    if (query.status === "expired") filters.push({ isActive: true, expiresAt: { lte: now } });
    const where: Prisma.LinkWhereInput = { userId: request.userId, AND: filters };
    const [items, total] = await prisma.$transaction([
      prisma.link.findMany({
        where,
        orderBy: query.sort === "clicks" ? { clickEvents: { _count: query.order } } : { createdAt: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { clickEvents: true } } }
      }),
      prisma.link.count({ where })
    ]);
    response.json({
      links: items.map((item) => ({
        id: item.id,
        code: item.code,
        shortUrl: `${config.PUBLIC_BASE_URL.replace(/\/$/, "")}/r/${item.code}`,
        destination: item.destination,
        title: item.title,
        isActive: item.isActive,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
        clicks: item._count.clickEvents
      })),
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) }
    });
  }));
  links.post("/", asyncRoute(async (request, response) => {
    const input = createLinkSchema.parse(request.body);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = input.alias ?? createShortCode();
      try {
        const link = await prisma.link.create({
          data: { code, destination: input.destination, title: input.title, userId: request.userId! },
          include: { _count: { select: { clickEvents: true } } }
        });
        response.status(201).json({
          link: { ...link, shortUrl: `${config.PUBLIC_BASE_URL.replace(/\/$/, "")}/r/${code}`, clicks: link._count.clickEvents }
        });
        return;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          if (input.alias) {
            response.status(409).json({ error: "That custom alias is already in use" });
            return;
          }
          continue;
        }
        throw error;
      }
    }
    response.status(503).json({ error: "Could not allocate a unique short code. Please try again." });
  }));
  links.get("/analytics", asyncRoute(async (request, response) => {
    const userId = request.userId!;
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);
    const [linksCount, activeCount, clickCount, dailyRows] = await Promise.all([
      prisma.link.count({ where: { userId } }),
      prisma.link.count({ where: { userId, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
      prisma.clickEvent.count({ where: { link: { userId } } }),
      prisma.clickEvent.findMany({
        where: { link: { userId }, clickedAt: { gte: start } },
        select: { clickedAt: true }
      })
    ]);
    const counts = new Map<string, number>();
    for (const row of dailyRows) {
      const key = row.clickedAt.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const dailyClicks = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, clicks: counts.get(key) ?? 0 };
    });
    response.json({ linksCount, activeCount, clickCount, dailyClicks });
  }));
  links.patch("/:id", asyncRoute(async (request, response) => {
    const input = updateLinkSchema.parse(request.body);
    const existing = await prisma.link.findFirst({ where: { id: request.params.id, userId: request.userId } });
    if (!existing) {
      response.status(404).json({ error: "Link not found" });
      return;
    }
    const updated = await prisma.link.update({
      where: { id: existing.id },
      data: {
        ...(input.destination !== undefined ? { destination: input.destination } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      }
    });
    await cache?.invalidate(existing.code);
    response.json({ link: updated });
  }));
  links.delete("/:id", asyncRoute(async (request, response) => {
    const existing = await prisma.link.findFirst({ where: { id: request.params.id, userId: request.userId } });
    if (!existing) {
      response.status(404).json({ error: "Link not found" });
      return;
    }
    await prisma.link.update({ where: { id: existing.id }, data: { isActive: false } });
    await cache?.invalidate(existing.code);
    response.status(204).end();
  }));
  app.use("/api/links", links);

  app.get("/r/:code", asyncRoute(async (request, response) => {
    const code = request.params.code;
    let cached = await cache?.get(code) ?? null;
    if (!cached) {
      const found = await prisma.link.findUnique({
        where: { code },
        select: { id: true, destination: true, isActive: true, expiresAt: true }
      });
      if (!found) {
        response.status(404).send("This short link does not exist.");
        return;
      }
      cached = { linkId: found.id, destination: found.destination, isActive: found.isActive, expiresAt: found.expiresAt?.toISOString() ?? null };
      await cache?.set(code, cached);
      if (!found.isActive) {
        response.status(410).send("This short link has been deactivated.");
        return;
      }
      if (found.expiresAt && found.expiresAt <= new Date()) {
        response.status(410).send("This short link has expired.");
        return;
      }
      try {
        await prisma.clickEvent.create({
          data: {
            linkId: found.id,
            referrer: request.get("referer")?.slice(0, 2048) ?? null
          }
        });
      } catch (error) {
        console.error("Could not record redirect click:", error);
        response.status(503).send("This link is temporarily unavailable. Please try again.");
        return;
      }
      response.redirect(302, found.destination);
      return;
    }
    if (!cached.isActive) {
      response.status(410).send("This short link has been deactivated.");
      return;
    }
    if (cached.expiresAt && new Date(cached.expiresAt) <= new Date()) {
      response.status(410).send("This short link has expired.");
      return;
    }
    try {
      await prisma.clickEvent.create({
        data: { linkId: cached.linkId, referrer: request.get("referer")?.slice(0, 2048) ?? null }
      });
    } catch (error) {
      console.error("Could not record redirect click:", error);
      response.status(503).send("This link is temporarily unavailable. Please try again.");
      return;
    }
    response.redirect(302, cached.destination);
  }));

  app.use((_request, response) => response.status(404).json({ error: "Not found" }));
  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    void _next;
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "Malformed JSON body" });
      return;
    }
    console.error("Unhandled API error:", error);
    response.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);
  return { app, prisma };
}
