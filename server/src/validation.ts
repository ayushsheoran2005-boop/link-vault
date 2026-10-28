import { z } from "zod";

export const safeDestinationSchema = z.string().trim().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Destination must be an HTTP or HTTPS URL without embedded credentials");

export const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128)
});

export const createLinkSchema = z.object({
  destination: safeDestinationSchema,
  title: z.string().trim().max(120).optional().transform((value) => value || null),
  alias: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/).optional()
});

export const updateLinkSchema = z.object({
  destination: safeDestinationSchema.optional(),
  title: z.string().trim().max(120).optional().nullable().transform((value) => value || null),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  isActive: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");
