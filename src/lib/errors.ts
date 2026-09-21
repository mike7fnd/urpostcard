/**
 * Every failure the user can actually reach, said plainly.
 * The keys are the exception names raised by the SQL functions.
 */

const COPY: Record<string, string> = {
  NOT_AUTHENTICATED: "Your session has expired. Sign in again.",
  SENDER_PROFILE_INCOMPLETE: "Finish setting up your profile first.",
  SENDER_LOCATION_MISSING: "Pin your location before sending anything.",
  RECIPIENT_NOT_FOUND: "No one goes by that name.",
  RECIPIENT_LOCATION_MISSING:
    "They have not pinned a location yet, so there is nowhere to send it.",
  MESSAGE_INVALID: "Write something first — up to 500 characters.",
  TEMPLATE_NOT_FOUND: "That postcard is no longer available.",
  POSTCARD_NOT_FOUND: "That postcard is not yours to read.",
  POSTCARD_IN_TRANSIT: "It has not arrived yet.",
  USERNAME_RESERVED: "That one is spoken for.",
  USERNAME_TOO_SOON:
    "You changed your username recently. It can be changed again 30 days after the last time.",
  DISPLAY_NAME_TOO_SOON:
    "You changed your name recently. It can be changed again 7 days after the last time.",
  RATE_LIMITED: "That is a lot of postcards. Try again in a little while.",

  // Auth, from Supabase
  "Invalid login credentials": "That email and password do not match.",
  "User already registered": "There is already an account with that email.",
  "Email not confirmed": "Confirm your email address first — check your inbox.",
};

const UNIQUE_VIOLATION = "23505";

export function humanError(error: unknown, fallback = "Something went wrong."): string {
  if (!error) return fallback;

  const err = error as { message?: string; code?: string; details?: string };

  if (err.code === UNIQUE_VIOLATION) {
    if (err.message?.includes("profiles_username")) return "That username is taken.";
    return "That already exists.";
  }

  const message = err.message ?? String(error);

  for (const [key, copy] of Object.entries(COPY)) {
    if (message.includes(key)) return copy;
  }

  if (message.toLowerCase().includes("fetch") || message.includes("NetworkError")) {
    return "No connection. The world is still there — try again.";
  }

  return message || fallback;
}
