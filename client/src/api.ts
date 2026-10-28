export type User = { id: string; email: string; createdAt: string };
export type LinkRecord = {
  id: string;
  code: string;
  shortUrl: string;
  destination: string;
  title: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  clicks: number;
};
export type Analytics = {
  linksCount: number;
  activeCount: number;
  clickCount: number;
  dailyClicks: { date: string; clicks: number }[];
};
type ApiOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
