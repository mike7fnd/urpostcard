/**
 * Username rules, mirrored by the profiles_username_format constraint and
 * public.is_reserved_username(). The server rejects anything these miss;
 * this exists so the form can say why before a round trip.
 */

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const RESERVED = new Set([
  "admin", "administrator", "root", "system", "support", "help", "about", "api",
  "auth", "login", "logout", "signin", "signup", "register", "settings", "profile",
  "postcard", "postcards", "urpostcard", "send", "sent", "received", "inbox",
  "me", "you", "user", "users", "null", "undefined", "anonymous", "moderator",
  "staff", "team", "official", "security", "billing", "privacy", "terms", "contact",
  "home", "onboarding", "notifications", "mail", "postmaster", "www",
]);

/** Strips a leading @ and lowercases. */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(input: string): string | null {
  const value = normalizeUsername(input);

  if (value.length === 0) return "Choose a username.";
  if (value.length < 3) return "At least 3 characters.";
  if (value.length > 20) return "At most 20 characters.";
  if (!USERNAME_PATTERN.test(value)) {
    return "Letters, numbers and underscores only.";
  }
  if (RESERVED.has(value)) return "That one is spoken for.";

  return null;
}

export function formatHandle(username: string | null | undefined): string {
  return username ? `@${username}` : "";
}
