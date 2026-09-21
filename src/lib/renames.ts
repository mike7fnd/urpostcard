/**
 * How long a name has to settle before it can be changed again.
 *
 * A username is an address — people write it on postcards, and anything in
 * flight was addressed to whoever held it at the time. The real enforcement is
 * the profiles_before_write trigger; these exist so the form can say when,
 * rather than letting someone type a new name and only then be refused.
 */

export const USERNAME_COOLDOWN_DAYS = 30;
export const DISPLAY_NAME_COOLDOWN_DAYS = 7;

const DAY = 86_400_000;

export interface RenameWindow {
  /** False while the cooldown is still running. */
  allowed: boolean;
  /** When it opens again, if it is closed. */
  availableAt: Date | null;
  daysLeft: number;
}

export function renameWindow(
  changedAt: string | null,
  cooldownDays: number,
  now: number = Date.now(),
): RenameWindow {
  if (!changedAt) return { allowed: true, availableAt: null, daysLeft: 0 };

  const last = Date.parse(changedAt);
  if (!Number.isFinite(last)) return { allowed: true, availableAt: null, daysLeft: 0 };

  const opens = last + cooldownDays * DAY;
  if (now >= opens) return { allowed: true, availableAt: null, daysLeft: 0 };

  return {
    allowed: false,
    availableAt: new Date(opens),
    daysLeft: Math.max(1, Math.ceil((opens - now) / DAY)),
  };
}

const ON = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function describeWindow(window: RenameWindow, noun: string): string | null {
  if (window.allowed || !window.availableAt) return null;
  return `Changed recently. Your ${noun} can change again on ${ON.format(window.availableAt)}.`;
}
