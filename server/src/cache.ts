import { Redis } from "ioredis";

export interface RedirectCache {
  get(code: string): Promise<{ linkId: string; destination: string; isActive: boolean; expiresAt: string | null } | null>;
  set(code: string, value: { linkId: string; destination: string; isActive: boolean; expiresAt: string | null }): Promise<void>;
  invalidate(code: string): Promise<void>;
}

export function createRedirectCache(redisUrl?: string): RedirectCache | null {
  if (!redisUrl) return null;

  const client = new Redis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt: number) => (attempt <= 5 ? Math.min(attempt * 250, 1500) : null)
  });
  client.on("error", (error: Error) => console.warn("Redis unavailable; redirect requests will use PostgreSQL:", error.message));
  void client.connect().catch((error: Error) => {
    console.warn("Redis connection failed; continuing with PostgreSQL:", error.message);
  });

  return {
    async get(code) {
      try {
        const value = await client.get(`redirect:${code}`);
        return value ? JSON.parse(value) as { linkId: string; destination: string; isActive: boolean; expiresAt: string | null } : null;
      } catch (error) {
        console.warn("Redis cache read failed; using PostgreSQL:", error);
        return null;
      }
    },
    async set(code, value) {
      try {
        await client.set(`redirect:${code}`, JSON.stringify(value), "EX", 60);
      } catch (error) {
        console.warn("Redis cache write failed; using PostgreSQL:", error);
      }
    },
    async invalidate(code) {
      try {
        await client.del(`redirect:${code}`);
      } catch (error) {
        console.warn("Redis cache invalidation failed; TTL limits stale data:", error);
      }
    }
  };
}
