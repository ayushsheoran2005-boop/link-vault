import type { NextFunction, Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { hashSessionToken } from "./security.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export function requireAuth(prisma: PrismaClient, sessionSecret: string) {
  return asyncRoute(async (request, response, next) => {
    const token = getSessionToken(request);
    if (!token) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token, sessionSecret) },
      select: { id: true, userId: true, expiresAt: true }
    });
    if (!session) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }
    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      response.clearCookie("lv_session");
      response.status(401).json({ error: "Session expired" });
      return;
    }
    request.userId = session.userId;
    next();
  });
}

export function getSessionToken(request: Request): string | undefined {
  const pair = request.headers.cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith("lv_session="));
  if (!pair) return undefined;
  try {
    return decodeURIComponent(pair.slice("lv_session=".length));
  } catch {
    return undefined;
  }
}

export function asyncRoute(handler: (request: Request, response: Response, next: NextFunction) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}
