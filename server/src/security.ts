import { createHmac, randomBytes } from "node:crypto";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function hashSessionToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createShortCode(length = 10): string {
  if (!Number.isInteger(length) || length < 1 || length > 32) {
    throw new RangeError("Short-code length must be between 1 and 32 characters");
  }
  let code = "";
  while (code.length < length) {
    const bytes = randomBytes(Math.ceil((length - code.length) * 1.1));
    for (const byte of bytes) {
      if (byte >= 248) continue;
      code += alphabet[byte % alphabet.length];
      if (code.length === length) break;
    }
  }
  return code;
}
